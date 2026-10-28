'use strict';
// Hourly local tracking monitor (launchd). Runs the read-only UTM handoff check
// and the intercepted site monitor against production, then notifies Gemin
// (macOS Notification Center, Slack DM, email) only when the set of tracking
// failures changes. Slack and email credentials live in the login Keychain:
//   nourish-monitor-slack  (password = bot token, xoxb-...)
//   nourish-monitor-gmail  (account = Gmail address, password = app password)
// A missing credential skips that channel; it is never read from the repo.
// Page script errors and third-party asset failures are reported, not alerted:
// they are not tracking regressions and known ones (/paid, blog) would page hourly.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const { incidentDecision } = require('./contracts');
const { sendOwnerDM } = require('./alerts');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = process.env.TRACKING_MONITOR_DIR || path.join(ROOT, 'monitoring-local');
const TIMEOUT_MS = 10 * 60 * 1000;

function isAlertable(failure) {
  return !/: (page error|asset failure): /.test(failure);
}

// A report counts only if this run wrote it and the child finished: the old file
// is removed first, so a crash, timeout or launch failure can never reuse an
// earlier passing result.
function run(script, output, extraEnv = {}, spawn = spawnSync) {
  fs.rmSync(output, { force: true });
  const r = spawn(process.execPath, [path.join(ROOT, script)], {
    cwd: ROOT, timeout: TIMEOUT_MS, encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
  const how = 'exit ' + r.status + (r.signal ? ', ' + r.signal : '') + (r.error ? ', ' + (r.error.code || r.error.message) : '');
  if (r.error || r.signal) return { failures: [script + ' did not finish (' + how + ')'] };
  let report;
  try { report = JSON.parse(fs.readFileSync(output, 'utf8')); }
  catch { return { failures: [script + ' did not produce results (' + how + ')'] }; }
  if (!Array.isArray(report.failures)) return { failures: [script + ' wrote a report without a failures list (' + how + ')'] };
  if (r.status !== 0 && !report.failures.length) return { ...report, failures: [script + ' exited non-zero with no failures listed (' + how + ')'] };
  return report;
}

function notify(title, message) {
  const bin = ['/opt/homebrew/bin/terminal-notifier', '/usr/local/bin/terminal-notifier'].find(p => fs.existsSync(p));
  if (!bin) return 'terminal-notifier unavailable';
  try { execFileSync(bin, ['-title', title, '-message', message, '-group', 'com.gemin.nourish-tracking']); return 'submitted'; }
  catch (e) { return 'failed: ' + e.message; }
}

function keychain(service, field) {
  try {
    const out = execFileSync('/usr/bin/security', ['find-generic-password', '-s', service, ...(field === 'account' ? [] : ['-w'])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (field !== 'account') return out.trim() || null;
    const m = out.match(/"acct"<blob>="([^"]+)"/);
    return m ? m[1] : null;
  } catch { return null; }
}

async function slackDM(text) {
  const token = keychain('nourish-monitor-slack');
  if (!token) return 'skipped: no nourish-monitor-slack Keychain item';
  try { await sendOwnerDM(text, { SLACK_BOT_TOKEN: token }); return 'sent'; }
  catch (e) { return 'failed: ' + e.message; } // alerts.js never includes the token in errors
}

// Gmail over SMTPS with curl, sending to the same address. The credentials go
// through a curl config on stdin so they never appear in the process list.
function emailMessage(address, subject, body) {
  return ['From: Nourish monitor <' + address + '>', 'To: ' + address, 'Subject: ' + subject.replace(/[\r\n]/g, ' '),
    'Content-Type: text/plain; charset=utf-8', '', body, ''].join('\r\n');
}

function email(subject, body) {
  const address = keychain('nourish-monitor-gmail', 'account');
  const password = address && keychain('nourish-monitor-gmail');
  if (!address || !password) return 'skipped: no nourish-monitor-gmail Keychain item';
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nourish-mail-')), 'message.eml');
  try {
    fs.writeFileSync(file, emailMessage(address, subject, body), { mode: 0o600 });
    const q = v => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    const config = ['url = "smtps://smtp.gmail.com:465"', 'ssl-reqd', 'silent', 'show-error', 'max-time = 30',
      'user = ' + q(address + ':' + password), 'mail-from = ' + q(address), 'mail-rcpt = ' + q(address), 'upload-file = ' + q(file)].join('\n');
    const r = spawnSync('/usr/bin/curl', ['-K', '-'], { input: config, encoding: 'utf8', timeout: 45000 });
    return r.status === 0 ? 'sent' : 'failed: curl exit ' + r.status + ' ' + String(r.stderr || '').replace(password, '***').trim().slice(0, 160);
  } finally { fs.rmSync(path.dirname(file), { recursive: true, force: true }); }
}

async function deliver(title, lines) {
  const body = lines.join('\n') + '\n\nFull results: ' + STATE_DIR + '\nNo production changes are made automatically.';
  return {
    mac: notify(title, lines.slice(0, 2).join(' | ').slice(0, 220)),
    slack: await slackDM(title + '\n' + body),
    email: email(title, body),
  };
}

const delivered = d => d && Object.values(d).some(v => v === 'sent' || v === 'submitted');

async function main() {
  if (process.argv.includes('--test-alert')) {
    const d = await deliver('Nourish tracking monitor: test alert', ['This is a test of the hourly tracking monitor alert path. Nothing is wrong.']);
    console.log(JSON.stringify(d));
    if (!delivered(d)) process.exitCode = 1;
    return;
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const stamp = new Date().toISOString();
  const utmFile = path.join(STATE_DIR, 'utm-latest.json');
  const siteFile = path.join(STATE_DIR, 'site-latest.json');
  const utm = run('monitoring/utm-handoff-check.js', utmFile, { UTM_MONITOR_OUTPUT: utmFile, UTM_MERGE_INTO: '' });
  const site = run('synthetic-rudderstack-check.js', siteFile, { MONITOR_OUTPUT: siteFile });
  const site2 = site.failures?.some(f => isAlertable(f) && !/UTM handoff/.test(f))
    ? run('synthetic-rudderstack-check.js', siteFile, { MONITOR_OUTPUT: siteFile }) // one retry: single-route SDK timing flakes
    : site;
  // A tracking failure must appear in both site runs to alert; UTM failures alert directly.
  const confirmedSite = (site2.failures || []).filter(f => isAlertable(f) && (site.failures || []).includes(f));
  const alertable = [...(utm.failures || []), ...confirmedSite].sort();
  const reportOnly = [...(site2.failures || [])].filter(f => !isAlertable(f));

  const stateFile = path.join(STATE_DIR, 'state.json');
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
  const decision = incidentDecision(previous, alertable);
  let delivery = null;
  if (decision.kind === 'failure') delivery = await deliver('Nourish tracking monitor: ' + alertable.length + ' failure(s)', alertable.slice(0, 10));
  if (decision.kind === 'recovery') delivery = await deliver('Nourish tracking monitor recovered', ['UTM handoff and CTA tracking checks pass again.']);

  const record = { checkedAt: stamp, decision: decision.kind, signature: decision.signature, alertable, reportOnly, delivery };
  // An alert no channel delivered must not advance incident state, so the next run retries it.
  if (!delivery || delivered(delivery)) fs.writeFileSync(stateFile, JSON.stringify(record, null, 2));
  fs.appendFileSync(path.join(STATE_DIR, 'history.jsonl'), JSON.stringify({ checkedAt: stamp, decision: decision.kind, alertable: alertable.length, reportOnly: reportOnly.length }) + '\n');
  console.log(stamp + ' ' + decision.kind + ': ' + alertable.length + ' alertable, ' + reportOnly.length + ' report-only');
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { isAlertable, emailMessage, delivered, run };
