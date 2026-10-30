const test = require('node:test');
const assert = require('node:assert/strict');
const { emailMessage, delivered } = require('../monitoring/local-tracking-monitor');

test('alert email goes from and to the same address, with a single-line subject', () => {
  const msg = emailMessage('owner@example.com', 'Nourish monitor: 2 failure(s)\r\nBcc: someone@example.com', 'body');
  const headers = msg.split('\r\n\r\n')[0].split('\r\n');
  assert.deepEqual(headers.filter(h => /^(To|From|Bcc):/.test(h)), ['From: Nourish monitor <owner@example.com>', 'To: owner@example.com']);
  assert.equal(headers.find(h => h.startsWith('Subject:')), 'Subject: Nourish monitor: 2 failure(s)  Bcc: someone@example.com');
});

test('an alert counts as delivered when any one channel succeeded', () => {
  assert.equal(delivered({ mac: 'submitted', slack: 'skipped: no item', email: 'failed: curl exit 67' }), true);
  assert.equal(delivered({ mac: 'terminal-notifier unavailable', slack: 'sent', email: 'skipped' }), true);
  assert.equal(delivered({ mac: 'failed: x', slack: 'failed: y', email: 'skipped: z' }), false);
});

test('a check result counts only if this run wrote it and the child finished', () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const { run } = require('../monitoring/local-tracking-monitor');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'monitor-run-'));
  const out = path.join(dir, 'latest.json');
  const stalePass = () => fs.writeFileSync(out, JSON.stringify({ checkedAt: '2020-01-01T00:00:00Z', failures: [] }));
  const child = (result, writes) => () => { if (writes) fs.writeFileSync(out, JSON.stringify(writes)); return result; };
  try {
    // Timeout and launch failure: the earlier passing report is never reused.
    stalePass();
    assert.match(run('check.js', out, {}, child({ status: null, signal: 'SIGTERM', error: Object.assign(new Error('t'), { code: 'ETIMEDOUT' }) })).failures[0], /did not finish \(exit null, SIGTERM, ETIMEDOUT\)/);
    stalePass();
    assert.match(run('check.js', out, {}, child({ status: null, error: Object.assign(new Error('x'), { code: 'ENOENT' }) })).failures[0], /did not finish/);
    // Clean exit that wrote nothing: the stale file was removed, so it fails.
    stalePass();
    assert.match(run('check.js', out, {}, child({ status: 0 })).failures[0], /did not produce results/);
    // Non-zero exit with an empty failures list is contradictory.
    assert.match(run('check.js', out, {}, child({ status: 1 }, { failures: [] })).failures[0], /exited non-zero with no failures listed/);
    // A fresh report is passed through, passing or failing.
    assert.deepEqual(run('check.js', out, {}, child({ status: 0 }, { failures: [] })).failures, []);
    assert.deepEqual(run('check.js', out, {}, child({ status: 1 }, { failures: ['/ link sent 0 click events'] })).failures, ['/ link sent 0 click events']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a failure alerts only when the retry run has the same case', () => {
  const { confirmedFailures } = require('../monitoring/local-tracking-monitor');
  const timeout = d => 'UTM handoff: UTM handoff desktop /landing-pages/meal-planning: monitor execution failure (navigation): ' + d;
  const missing = 'UTM handoff: iPhone 13 /paid: click event missing utm_source (iphone-paid)';
  const hang = how => 'Monitor execution failure: monitoring/utm-handoff-check.js did not finish (exit null, ' + how + '); production tracking status is unconfirmed';
  assert.deepEqual(confirmedFailures([timeout('page.goto: Timeout 35000ms exceeded.')], []), []);
  assert.deepEqual(confirmedFailures([timeout('page.goto: Timeout 35000ms exceeded.')], [timeout('net::ERR_TIMED_OUT')]), [timeout('net::ERR_TIMED_OUT')]);
  assert.deepEqual(confirmedFailures([missing], [missing]), [missing]);
  assert.deepEqual(confirmedFailures([missing], []), []);
  assert.deepEqual(confirmedFailures([hang('SIGTERM')], [hang('ETIMEDOUT')]), [hang('ETIMEDOUT')]);
  assert.deepEqual(confirmedFailures([timeout('x')], [missing]), []);
});
