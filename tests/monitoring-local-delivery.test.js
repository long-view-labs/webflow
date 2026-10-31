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
    assert.match(run('check.js', out, {}, child({ status: 1 }, { complete: true, cases: [{failures: []}], failures: [] })).failures[0], /exited non-zero with no failures listed/);
    // A fresh report is passed through, passing or failing.
    assert.deepEqual(run('check.js', out, {}, child({ status: 0 }, { complete: true, cases: [{failures: []}], failures: [] })).failures, []);
    assert.deepEqual(run('check.js', out, {}, child({ status: 1 }, { complete: true, cases: [{failures: []}], failures: ['/ link sent 0 click events'] })).failures, ['/ link sent 0 click events']);
    assert.equal(run('check.js', out, {}, child({ status: 0 }, { failures: [], cases: {} })).complete, false);
    assert.equal(run('check.js', out, {}, child({ status: 0 }, { failures: [], cases: [] })).complete, false);
    assert.equal(run('check.js', out, {}, child({ status: 0 }, { complete: true, failures: [], cases: [] })).complete, false);
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

test('an overloaded Mac delays the run, then skips it quietly, but never for more than 6 hours', () => {
  const { machineLoad, waitForMachine, skipForLoad, run } = require('../monitoring/local-tracking-monitor');
  assert.deepEqual(machineLoad(() => [83.1, 68, 50], 14), { load1: 83.1, cores: 14, busy: true });
  assert.equal(machineLoad(() => [20, 0, 0], 14).busy, false);
  // Waits while busy and returns as soon as the load falls.
  const readings = [true, true, false].map((busy) => ({ load1: busy ? 40 : 5, cores: 14, busy }));
  let slept = 0;
  assert.equal(waitForMachine({ measure: () => readings.shift(), waitMs: 600000, pollMs: 60000, sleep: () => slept++ }).busy, false);
  assert.equal(slept, 2);
  // Gives up after the wait budget and reports it still busy.
  assert.equal(waitForMachine({ measure: () => ({ load1: 40, cores: 14, busy: true }), waitMs: 180000, pollMs: 60000, sleep: () => {} }).busy, true);
  const now = Date.parse('2026-10-31T04:00:00Z');
  const busy = { load1: 40, cores: 14, busy: true };
  assert.equal(skipForLoad(busy, { checkedAt: '2026-10-31T01:00:00Z' }, now), true);
  assert.equal(skipForLoad(busy, { checkedAt: '2026-10-30T21:00:00Z' }, now), false, 'last run over 6h ago: run anyway');
  assert.equal(skipForLoad(busy, null, now), false, 'no previous run: run anyway');
  assert.equal(skipForLoad({ ...busy, busy: false }, { checkedAt: '2026-10-31T03:30:00Z' }, now), false);
  // A run that times out on a swamped Mac says so in the failure.
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'monitor-busy-')), 'latest.json');
  const timedOut = () => ({ status: null, signal: 'SIGTERM', error: Object.assign(new Error('t'), { code: 'ETIMEDOUT' }) });
  assert.match(run('check.js', out, {}, timedOut, () => busy).failures[0], /did not finish \(exit null, SIGTERM, ETIMEDOUT\); this Mac was overloaded \(Mac load 40 on 14 cores\); production tracking status is unconfirmed/);
  assert.doesNotMatch(run('check.js', out, {}, timedOut, () => ({ ...busy, busy: false })).failures[0], /overloaded/);
});
