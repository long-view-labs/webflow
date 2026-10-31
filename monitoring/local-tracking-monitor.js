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
const { isAlertable, confirmedFailures, decideIncidents, coverageComplete } = require('./tracking-incidents');
const { sendOwnerDM } = require('./alerts');
const { createAttempt, finishAttempt } = require('./diagnostics');
const { renderNotification, notificationTitle } = require('./notification-template.cjs');
const { trackingNotification } = require('./tracking-notification');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = process.env.TRACKING_MONITOR_DIR || path.join(ROOT, 'monitoring-local');
const TIMEOUT_MS = 10 * 60 * 1000;

// The checks drive real browsers. When this Mac is swamped (Oct 30 2026: load average 83 on 14
// cores, swap full) every page.goto times out and the channel gets a "checker error" that says
// nothing about the site. So a run first waits for the load to fall; if it doesn't within
// BUSY_WAIT_MS, the run is skipped without touching incident state, unless the last completed run
// is older than BUSY_MAX_SKIP_HOURS (then it runs anyway, so overload can never hide the site for long).
const BUSY_LOAD_PER_CORE = 2;
const BUSY_WAIT_MS = 20 * 60 * 1000;
const BUSY_POLL_MS = 60 * 1000;
const BUSY_MAX_SKIP_HOURS = 6;

function machineLoad(loadavg = os.loadavg, cpus = os.cpus().length) {
  const load1 = loadavg()[0];
  return { load1: Math.round(load1 * 10) / 10, cores: cpus, busy: load1 > cpus * BUSY_LOAD_PER_CORE };
}
const loadText = (l) => 'Mac load ' + l.load1 + ' on ' + l.cores + ' cores';

// Waits for a usable machine. Returns the last reading; .busy means it never settled.
function waitForMachine({ measure = machineLoad, waitMs = BUSY_WAIT_MS, pollMs = BUSY_POLL_MS, sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) } = {}) {
  let l = measure();
  for (let waited = 0; l.busy && waited < waitMs; waited += pollMs) { sleep(pollMs); l = measure(); }
  return l;
}

// A report counts only if this run wrote it and the child finished: the old file
// is removed first, so a crash, timeout or launch failure can never reuse an
// earlier passing result.
function run(script, output, extraEnv = {}, spawn = spawnSync, measure = machineLoad) {
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
  else if (!Array.isArray(report.cases)) executionFailure = script + ' wrote a report without a cases list (' + how + ')';
  else if (!coverageComplete(report)) executionFailure = script + ' did not complete its cases (' + how + ')';
  else if (r.status !== 0 && !report.failures.length) executionFailure = script + ' exited non-zero with no failures listed (' + how + ')';
  // Say so when the Mac was swamped: the failure is then about this machine, not the site.
  const load = executionFailure && measure();
  if (load?.busy) executionFailure += '; this Mac was overloaded (' + loadText(load) + ')';
  const outcome = executionFailure || report?.failureKind === 'monitor-execution'
    ? 'monitor-execution-failure' : report.failures.length ? 'check-failure' : 'pass';
  finishAttempt(attempt, r, report, outcome);
  if (executionFailure) return {
    ...(report && Array.isArray(report.failures) ? report : {}),
    complete: false,
    cases: Array.isArray(report?.cases) ? report.cases : [],
    failureKind: 'monitor-execution',
    failures: [...(Array.isArray(report?.failures) ? report.failures : []), 'Monitor execution failure: ' + executionFailure + '; production tracking status is unconfirmed'],
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

// Injectable delivery keeps policy/transition tests entirely offline.
async function processResults({previous, utm1, utm, site, site2, stamp, evidence, send, finishedAt}) {
  const decision = decideIncidents(previous, {utm: utm1, site}, {utm, site: site2});
  const alertable = decision.incidents.map(f => f.summary);
  const reportOnly = [...(site2.failures || [])].filter(f => !isAlertable(f));
  let delivery = null;
  if (decision.kind === 'failure' || decision.kind === 'recovery') {
    delivery = await send(trackingNotification({decision: decision.kind, alertable, findings: decision.incidents,
      pending: decision.pending, reportOnly, utm, site: site2, startedAt: stamp, finishedAt, evidence}));
  }
  return {checkedAt: stamp, decision: decision.kind, signature: decision.signature,
    incidentVersion: 2, incidents: decision.incidents, pending: decision.pending,
    recoveryPending: decision.recoveryPending, alertable, reportOnly, delivery};
}

// Skip only while the last completed run is recent; past BUSY_MAX_SKIP_HOURS it runs regardless.
function skipForLoad(load, previous, now = Date.now()) {
  if (!load.busy) return false;
  const last = Date.parse(previous?.checkedAt ?? '');
  return Number.isFinite(last) && now - last < BUSY_MAX_SKIP_HOURS * 3600e3;
}

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
  const stateFile = path.join(STATE_DIR, 'state.json');
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
  const load = waitForMachine();
  if (skipForLoad(load, previous)) {
    const at = new Date().toISOString();
    fs.appendFileSync(path.join(STATE_DIR, 'history.jsonl'), JSON.stringify({ checkedAt: at, decision: 'skipped-busy', load: load.load1, cores: load.cores }) + '\n');
    console.log(at + ' skipped: ' + loadText(load) + ' after waiting ' + BUSY_WAIT_MS / 60000 + ' min; no checks run, incident state unchanged');
    return;
  }
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
  const record = await processResults({previous, utm1, utm, site, site2, stamp, evidence: STATE_DIR,
    send: deliver, finishedAt: new Date().toISOString()});
  // An alert no channel delivered must not advance incident state, so the next run retries it.
  if (!record.delivery || delivered(record.delivery)) fs.writeFileSync(stateFile, JSON.stringify(record, null, 2));
  fs.appendFileSync(path.join(STATE_DIR, 'history.jsonl'), JSON.stringify({ checkedAt: stamp, decision: record.decision, alertable: record.alertable.length, reportOnly: record.reportOnly.length }) + '\n');
  console.log(stamp + ' ' + record.decision + ': ' + record.alertable.length + ' alertable, ' + record.reportOnly.length + ' report-only');
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { isAlertable, confirmedFailures, emailMessage, delivered, run, processResults, machineLoad, waitForMachine, skipForLoad };
