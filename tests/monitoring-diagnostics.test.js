const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { run } = require('../monitoring/local-tracking-monitor');
const { main, runCase } = require('../synthetic-rudderstack-check');
const { MAX_ATTEMPTS, MAX_AGE_MS, MAX_LOG_BYTES, createAttempt, finishAttempt } = require('../monitoring/diagnostics');
const temporary = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourish-diagnostics-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

test('timeout and retry retain distinct artifacts without accepting partial/stale results', t => {
  const dir = temporary(t), output = path.join(dir, 'latest.json');
  fs.writeFileSync(output, JSON.stringify({ failures: [], cases: [{ route: '/stale' }] }));
  let attempt = 0;
  const spawn = (command, args, options) => {
    assert.equal(options.timeout, 600000);
    assert.equal(fs.existsSync(output), false);
    fs.writeFileSync(options.env.MONITOR_PROGRESS_OUTPUT, JSON.stringify({ current: { operation: 'page.evaluateSDK' } }));
    fs.writeFileSync(output, JSON.stringify({ failures: ['partial failure ' + ++attempt], cases: [{ route: '/', idle: [{ properties: { email: 'patient@example.com', token: 'private' } }] }] }));
    return { status: 1, error: { code: 'ETIMEDOUT' }, stdout: 'desktop /: PASS\n', stderr: 'timeout password=private https://example.com/?secret=private patient@example.com' };
  };
  const first = run('synthetic-rudderstack-check.js', output, {}, spawn);
  const second = run('synthetic-rudderstack-check.js', output, {}, spawn);
  assert.equal(first.failureKind, 'monitor-execution');
  assert.match(first.failures[0], /Monitor execution failure.*ETIMEDOUT.*unconfirmed/);
  assert.deepEqual(second.failures, first.failures); // existing retry intersection remains stable
  assert.notEqual(first.diagnostics, second.diagnostics);
  assert.deepEqual(read(path.join(first.diagnostics, 'report.json')).failures, ['partial failure 1']);
  assert.deepEqual(read(path.join(second.diagnostics, 'report.json')).failures, ['partial failure 2']);
  assert.equal(read(path.join(first.diagnostics, 'progress.json')).current.operation, 'page.evaluateSDK');
  assert.equal(read(path.join(first.diagnostics, 'attempt.json')).outcome, 'monitor-execution-failure');
  assert.equal(fs.readFileSync(path.join(first.diagnostics, 'stdout.log'), 'utf8'), 'desktop /: PASS\n');
  for (const name of ['report.json', 'stderr.log']) assert.doesNotMatch(fs.readFileSync(path.join(first.diagnostics, name), 'utf8'), /patient@example|private|properties/);
});

test('incomplete reports never count as passing even when the child exits zero', t => {
  const output = path.join(temporary(t), 'latest.json');
  const report = run('check.js', output, {}, () => {
    fs.writeFileSync(output, JSON.stringify({ complete: false, failures: [], cases: [] }));
    return { status: 0 };
  });
  assert.equal(report.failureKind, 'monitor-execution');
  assert.match(report.failures[0], /did not complete/);
});

test('malformed report fields cannot break failure classification or leak arbitrary objects', t => {
  const output = path.join(temporary(t), 'latest.json');
  const report = run('check.js', output, {}, () => {
    fs.writeFileSync(output, JSON.stringify({ checkedAt: { token: 'private' }, failures: {}, cases: { token: 'private' } }));
    return { status: 0 };
  });
  assert.match(report.failures[0], /without a failures list/);
  assert.equal(report.failureKind, 'monitor-execution');
  assert.doesNotMatch(fs.readFileSync(path.join(report.diagnostics, 'report.json'), 'utf8'), /private/);
});

test('browser launch failure still writes a fresh diagnostic report', async t => {
  const dir = temporary(t), output = path.join(dir, 'latest.json'), progressFile = path.join(dir, 'progress.json');
  const report = await main({ output, progressFile, log() {}, launch: async () => { throw new Error('launch unavailable'); }, caseRunner: async () => assert.fail('must not run cases') });
  assert.equal(report.complete, false);
  assert.equal(report.cases.length, 0);
  assert.match(report.failures[0], /chromium.launch: launch unavailable/);
  assert.deepEqual(read(output), report);
});

test('context cleanup failure retains the original page failure and checkpoint', async () => {
  const checkpoints = [];
  const page = { on() {}, async goto() { throw new Error('original navigation failure'); } };
  const context = { async newPage() { return page; }, async addInitScript() {}, async route() {}, async close() { throw new Error('cleanup failed'); } };
  await assert.rejects(runCase({ async newContext() { return context; } }, '/', false, 'unset', (operation, row) => {
    checkpoints.push({ operation, failures: [...(row.failures || [])] });
  }), error => {
    assert.match(error.message, /cleanup failed/);
    assert.match(error.monitorRow.errors.join(' '), /original navigation failure/);
    assert.match(error.monitorRow.failures.join(' '), /original navigation failure/);
    return true;
  });
  assert.equal(checkpoints.at(-1).operation, 'context.close');
  assert.match(checkpoints.at(-1).failures.join(' '), /original navigation failure/);
});

test('completed cases survive a later exception and browser cleanup failure', async t => {
  const dir = temporary(t), output = path.join(dir, 'latest.json'), progressFile = path.join(dir, 'progress.json');
  let calls = 0;
  const report = await main({ output, progressFile, log() {},
    launch: async () => ({ async close() { throw new Error('browser cleanup failed'); } }),
    caseRunner: async (browser, route, mobile, consent, progress) => {
      const row = { route, device: 'desktop', consent, failures: ['original SDK failure'], idle: [{ properties: { email: 'patient@example.com' } }] };
      progress('page.evaluateSDK', row);
      if (++calls === 2) {
        const partial = read(progressFile);
        assert.equal(partial.cases.length, 1);
        assert.equal(partial.current.operation, 'page.evaluateSDK');
        assert.doesNotMatch(JSON.stringify(partial), /patient@example|properties/);
        const error = new Error('original operation failed'); error.monitorRow = row; throw error;
      }
      return row;
    },
  });
  assert.equal(report.cases.length, 2);
  assert.equal(report.complete, false);
  assert.equal(report.failureKind, 'monitor-execution');
  assert.match(report.failures.join(' '), /original SDK failure/);
  assert.match(report.failures.join(' '), /page.evaluateSDK: original operation failed/);
  assert.match(report.failures.join(' '), /browser cleanup failed/);
  assert.deepEqual(read(output), report);
  assert.equal(read(progressFile).cases.length, 2);
  assert.equal(read(progressFile).executionFailures.length, 2);
  assert.equal(read(progressFile).current, null);
  const operations = read(progressFile).recentOperations;
  assert.ok(operations.some(entry => entry.operation === 'page.evaluateSDK' && entry.route === '/paid' && entry.startedAt));
  assert.equal(operations.at(-1).operation, 'browser.close');
});

test('successful mocked run preserves route/consent coverage and marks final progress complete', async t => {
  const dir = temporary(t), output = path.join(dir, 'latest.json'), progressFile = path.join(dir, 'progress.json');
  const report = await main({ output, progressFile, log() {}, launch: async () => ({ async close() {} }),
    caseRunner: async (browser, route, mobile, consent) => ({ route, device: mobile ? 'iPhone 13' : 'desktop', consent, failures: [] }),
  });
  assert.equal(report.cases.length, 22);
  assert.equal(report.cases.filter(r => r.consent === 'unset').length, 18);
  assert.equal(report.cases.filter(r => r.consent === 'accepted').length, 2);
  assert.equal(report.cases.filter(r => r.consent === 'rejected').length, 2);
  assert.equal(report.complete, true);
  assert.equal(read(progressFile).complete, true);
  assert.ok(read(progressFile).recentOperations.length <= 32);
  assert.deepEqual(report.failures, []);
});

test('retention and log sizes are bounded without deleting unrelated directories', t => {
  const dir = temporary(t), output = path.join(dir, 'latest.json'), root = path.join(dir, 'attempts');
  fs.mkdirSync(root);
  fs.mkdirSync(path.join(root, 'keep-me'));
  const old = createAttempt(output, 'check.js', Date.now() - MAX_AGE_MS - 1000);
  fs.utimesSync(old.directory, new Date(0), new Date(0));
  for (let i = 0; i < MAX_ATTEMPTS + 2; i++) createAttempt(output, 'check.js');
  assert.equal(fs.existsSync(old.directory), false);
  assert.equal(fs.existsSync(path.join(root, 'keep-me')), true);
  assert.equal(fs.readdirSync(root).length, MAX_ATTEMPTS + 1);
  const attempt = createAttempt(output, 'check.js');
  finishAttempt(attempt, { status: 0, stdout: 'x'.repeat(MAX_LOG_BYTES + 10) }, { failures: [], cases: [] }, 'pass');
  assert.equal(fs.statSync(path.join(attempt.directory, 'stdout.log')).size, MAX_LOG_BYTES);
  assert.equal(read(path.join(attempt.directory, 'attempt.json')).logsTruncated, true);
});
