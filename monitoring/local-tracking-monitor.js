'use strict';
// Hourly local tracking monitor (launchd). Runs the read-only UTM handoff check
// and the intercepted site monitor against production, then notifies Gemin
// (macOS Notification Center, Slack channel, email) only when the set of tracking
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
const { createAttempt, finishAttempt } = require('./diagnostics');
const { renderNotification, notificationTitle } = require('./notification-template.cjs');
const { trackingNotification } = require('./tracking-notification');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = process.env.TRACKING_MONITOR_DIR || path.join(ROOT, 'monitoring-local');
const TIMEOUT_MS = 10 * 60 * 1000;

function isAlertable(failure) {
  return !/: (page error|asset failure): /.test(failure);
}

const failureCase = f => f.replace(/\((exit|navigation)[^)]*\)/g, '').replace(/(monitor execution failure)[\s\S]*$/i, '$1').trim();

// Failures from the second run that the first run also had (same case), so one
// flaky run never alerts on its own.
function confirmedFailures(first = [], second = []) {
  const seen = new Set((first || []).map(failureCase));
  return (second || []).filter(f => seen.has(failureCase(f)));
}

// A report counts only if this run wrote it and the child finished: the old file
// is removed first, so a crash, timeout or launch failure can never reuse an
// earlier passing result.
function run(script, output, extraEnv = {}, spawn = spawnSync) {
  const attempt = createAttempt(output, script);
  fs.rmSync(output, { force: true });
  const r = spawn(process.execPath, [path.join(ROOT, script)], {
    cwd: ROOT, timeout: TIMEOUT_MS, encoding: 'utf8',
    env: { ...process.env, ...extraEnv, MONITOR_PROGRESS_OUTPUT: attempt.progress },
  });
  const how = 'exit ' + r.status + (r.signal ? ', ' + r.signal : '') + (r.error ? ', ' + (r.error.code || r.error.message) : '');
  let report;
  try { report = JSON.parse(fs.readFileSync(output, 'utf8')); }
  catch { /* A partial progress checkpoint may still be available. */ }
  let executionFailure;
  if (r.error || r.signal) executionFailure = script + ' did not finish (' + how + ')';
  else if (!report) executionFailure = script + ' did not produce results (' + how + ')';
  else if (!Array.isArray(report.failures)) executionFailure = script + ' wrote a report without a failures list (' + how + ')';
  else if (report.complete === false) executionFailure = script + ' did not complete its cases (' + how + ')';
  else if (r.status !== 0 && !report.failures.length) executionFailure = script + ' exited non-zero with no failures listed (' + how + ')';
  const outcome = executionFailure || report?.failureKind === 'monitor-execution'
    ? 'monitor-execution-failure' : report.failures.length ? 'check-failure' : 'pass';
  finishAttempt(attempt, r, report, outcome);
  if (executionFailure) return {
    failureKind: 'monitor-execution',
    failures: ['Monitor execution failure: ' + executionFailure + '; production tracking status is unconfirmed'],
    diagnostics: attempt.directory,
  };
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

async function deliver(message) {
  const title = notificationTitle(message);
  const body = renderNotification(message);
  return {
    mac: notify(title, message.summary.slice(0, 220)),
    slack: await slackDM(body),
    email: email(title, body),
  };
}

const delivered = d => d && Object.values(d).some(v => v === 'sent' || v === 'submitted');

async function main() {
  if (process.argv.includes('--test-alert')) {
    const d = await deliver({schemaVersion: 1, client: 'Nourish', check: 'Hourly tracking', status: {code: 'unknown', sourceStatus: 'test', sourceOutcome: null},
      summary: 'Notification test only; no website checks were run.', affectedChecks: [],
      coverage: {summary: 'No checks run', limits: 'Notification test only', unknowns: []},
      currentRun: null, lastSuccessfulRun: null, evidence: {url: null, published: false, description: 'Local results: monitoring-local/'},
      nextAction: 'No action required; notification test only.'});
    console.log(JSON.stringify(d));
    if (!delivered(d)) process.exitCode = 1;
    return;
  }
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const stamp = new Date().toISOString();
  const utmFile = path.join(STATE_DIR, 'utm-latest.json');
  const siteFile = path.join(STATE_DIR, 'site-latest.json');
  const runUtm = () => run('monitoring/utm-handoff-check.js', utmFile, { UTM_MONITOR_OUTPUT: utmFile, UTM_MERGE_INTO: '' });
  const utm1 = runUtm();
  const utm = utm1.failures?.length ? runUtm() : utm1; // one retry: a single page.goto timeout paged the channel (Oct 30)
  const site = run('synthetic-rudderstack-check.js', siteFile, { MONITOR_OUTPUT: siteFile });
  const site2 = site.failures?.some(f => isAlertable(f) && !/UTM handoff/.test(f))
    ? run('synthetic-rudderstack-check.js', siteFile, { MONITOR_OUTPUT: siteFile }) // one retry: single-route SDK timing flakes
    : site;
  // A failure must appear in both runs of its check to alert. Execution failures
  // are matched by case, since the timeout or exit detail differs between runs.
  const confirmedUtm = confirmedFailures(utm1.failures, utm.failures);
  const confirmedSite = confirmedFailures(site.failures, site2.failures).filter(isAlertable);
  const alertable = [...confirmedUtm, ...confirmedSite].sort();
  const reportOnly = [...(site2.failures || [])].filter(f => !isAlertable(f));

  const stateFile = path.join(STATE_DIR, 'state.json');
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
  const decision = incidentDecision(previous, alertable);
  let delivery = null;
  if (decision.kind === 'failure' || decision.kind === 'recovery') {
    delivery = await deliver(trackingNotification({decision: decision.kind, alertable, reportOnly, utm, site: site2,
      startedAt: stamp, finishedAt: new Date().toISOString(), evidence: STATE_DIR}));
  }

  const record = { checkedAt: stamp, decision: decision.kind, signature: decision.signature, alertable, reportOnly, delivery };
  // An alert no channel delivered must not advance incident state, so the next run retries it.
  if (!delivery || delivered(delivery)) fs.writeFileSync(stateFile, JSON.stringify(record, null, 2));
  fs.appendFileSync(path.join(STATE_DIR, 'history.jsonl'), JSON.stringify({ checkedAt: stamp, decision: decision.kind, alertable: alertable.length, reportOnly: reportOnly.length }) + '\n');
  console.log(stamp + ' ' + decision.kind + ': ' + alertable.length + ' alertable, ' + reportOnly.length + ' report-only');
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { isAlertable, confirmedFailures, emailMessage, delivered, run };
