'use strict';
// Hourly local tracking monitor (launchd). Runs the read-only UTM handoff check
// and the intercepted site monitor against production, then notifies Gemin's
// macOS Notification Center only when the set of tracking failures changes.
// Page script errors and third-party asset failures are reported, not alerted:
// they are not tracking regressions and known ones (/paid, blog) would page hourly.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { incidentDecision } = require('./contracts');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = process.env.TRACKING_MONITOR_DIR || path.join(ROOT, 'monitoring-local');
const TIMEOUT_MS = 10 * 60 * 1000;

function isAlertable(failure) {
  return !/: (page error|asset failure): /.test(failure);
}

function run(script, output, extraEnv = {}) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script)], {
    cwd: ROOT, timeout: TIMEOUT_MS, encoding: 'utf8',
    env: { ...process.env, ...extraEnv },
  });
  try { return JSON.parse(fs.readFileSync(output, 'utf8')); }
  catch { return { failures: [script + ' did not produce results (exit ' + r.status + (r.signal ? ', ' + r.signal : '') + ')'] }; }
}

function notify(title, message) {
  const bin = ['/opt/homebrew/bin/terminal-notifier', '/usr/local/bin/terminal-notifier'].find(p => fs.existsSync(p));
  if (!bin) return 'terminal-notifier unavailable';
  try { execFileSync(bin, ['-title', title, '-message', message, '-group', 'com.gemin.nourish-tracking']); return 'submitted'; }
  catch (e) { return 'failed: ' + e.message; }
}

function main() {
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
  if (decision.kind === 'failure') delivery = notify('Nourish tracking monitor: ' + alertable.length + ' failure(s)', alertable.slice(0, 2).join(' | ').slice(0, 220));
  if (decision.kind === 'recovery') delivery = notify('Nourish tracking monitor recovered', 'UTM handoff and CTA tracking checks pass again.');

  const record = { checkedAt: stamp, decision: decision.kind, signature: decision.signature, alertable, reportOnly, delivery };
  fs.writeFileSync(stateFile, JSON.stringify(record, null, 2));
  fs.appendFileSync(path.join(STATE_DIR, 'history.jsonl'), JSON.stringify({ checkedAt: stamp, decision: decision.kind, alertable: alertable.length, reportOnly: reportOnly.length }) + '\n');
  console.log(stamp + ' ' + decision.kind + ': ' + alertable.length + ' alertable, ' + reportOnly.length + ' report-only');
}

if (require.main === module) main();
module.exports = { isAlertable };
