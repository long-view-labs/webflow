const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { MARKERS, checkLanding, checkPersistence, main, diagnosticRow } = require('../monitoring/utm-handoff-check');
const { caseSummary, reportSummary, writeJson, MAX_JSON_BYTES } = require('../monitoring/diagnostics');

const temporary = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utm-diagnostics-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));

// Executes the real evaluate callbacks against a tiny DOM/SDK fixture. Every
// request is an in-memory object passed to the real interception callback.
// No Chromium launch, HTTP client, form, or notification is used.
function browserFixture({ navigationError, clickError, emit = true, afterClickError, detailsError, closeError, consent = ',C0001,C0002,' } = {}) {
  const destination = 'https://signup.nourish.com/?' + new URLSearchParams({ ...MARKERS, token: 'private-token' });
  let routeHandler, physicalClick = false;
  const observed = { clicks: 0, navigationOptions: [], waits: [], detailOptions: [], closeCalls: 0 };
  const listeners = {};
  const intercept = (url, method, body, navigation = false) => routeHandler({
    request: () => ({ url: () => url, method: () => method, postData: () => body, isNavigationRequest: () => navigation, frame: () => ({ parentFrame: () => null }) }),
    fulfill: async () => {}, abort: async () => {}, fallback: async () => {},
  });
  const track = (event, properties) => {
    if (!physicalClick || emit) void intercept('https://dataplane-proxy.nourish.com/v1/track', 'POST', JSON.stringify({ type: 'track', event, properties }));
  };
  const anchor = {
    href: destination, textContent: 'Get started', getBoundingClientRect: () => ({ width: 100, height: 40 }),
    getAttribute: name => ({ href: destination, 'data-cta-id': 'patient-signup-hero', target: '_blank' })[name] ?? null,
    closest: () => null,
    dispatchEvent: () => { windowObject.rudderanalytics.track('Get Started Clicked', { ...MARKERS, url: destination, cta_id: 'patient-signup-hero' }); return true; },
  };
  const windowObject = { rudderanalytics: { track }, OnetrustActiveGroups: consent, addEventListener() {}, removeEventListener() {} };
  const scope = vm.createContext({ window: windowObject, document: { readyState: 'complete', querySelectorAll: selector => selector === 'a[href]' ? [anchor] : [] },
    URL, location: { href: 'https://www.nourish.com/paid' }, MouseEvent: class {}, getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) });
  const evaluate = (fn, arg) => JSON.parse(JSON.stringify(vm.runInContext('(' + fn.toString() + ')', scope)(arg)));
  const locator = {
    filter() { return this; }, first() { return this; }, async count() { return 1; },
    async evaluate(fn, arg, options) { observed.detailOptions.push(options); if (detailsError) throw detailsError; return evaluate(fn, anchor); },
    async click(options) {
      observed.clicks++; observed.clickOptions = options;
      if (clickError) throw clickError;
      physicalClick = true;
      anchor.dispatchEvent();
      await intercept(destination, 'GET', null, true);
      if (afterClickError) throw afterClickError;
    },
  };
  const page = {
    on(name, callback) { listeners[name] = callback; },
    async goto(url, options) {
      observed.navigationOptions.push(options);
      if (navigationError) throw navigationError;
      listeners.request?.({ url: () => 'https://cdn.rudderlabs.com/v1.1/rsa.min.js' });
      return { status: () => 200 };
    },
    async waitForTimeout(ms) { observed.waits.push(ms); },
    async evaluate(fn, arg) { return evaluate(fn, arg); },
    locator() { return locator; },
  };
  const context = { async route(pattern, handler) { assert.equal(pattern, '**/*'); routeHandler = handler; }, async newPage() { return page; },
    async close() { observed.closeCalls++; if (closeError) throw closeError; } };
  const browser = { async newContext(options) { assert.equal(options.serviceWorkers, 'block'); return context; } };
  return { browser, observed };
}

test('navigation timeout is execution evidence with unmeasured state kept null', async () => {
  const fixture = browserFixture({ navigationError: new Error('page.goto: Timeout 35000ms exceeded.\nCall log: patient@example.com') });
  const row = await checkLanding(fixture.browser, '/local-dietitians/akron-ohio', false);
  assert.deepEqual(row.failureKinds, ['navigation']);
  assert.match(row.failures[0], /monitor execution failure \(navigation\).*35000ms/);
  assert.equal(row.links, null);
  assert.equal(row.readinessAfterLoad, null);
  assert.equal(row.emissionObserved, null);
  assert.equal(row.browserClick.outcome, 'not-attempted');
  assert.equal(fixture.observed.clicks, 0);
  assert.deepEqual(fixture.observed.navigationOptions, [{ waitUntil: 'domcontentloaded', timeout: 35000 }]);
  assert.ok(row.phaseHistory.some(p => p.operation === 'page.goto' && Number.isFinite(p.elapsedMs)));
  assert.doesNotMatch(JSON.stringify(row), /patient@example/);
  const summary = caseSummary(row);
  assert.equal(summary.sdkActive, null);
  assert.equal(summary.idleEvents, null);
  assert.equal(summary.clicks, null);
});

test('blocked browser click retains its error and does not claim a missing successful-click emission', async () => {
  const fixture = browserFixture({ clickError: new Error('locator.click: Timeout 5000ms token=private patient@example.com\n  <div data-email="patient@example.com">Personal details</div> intercepts pointer events') });
  const row = await checkLanding(fixture.browser, '/paid', false);
  assert.equal(row.linksClicked, 1); // real preflight callback called track successfully
  assert.equal(row.browserClick.outcome, 'rejected');
  assert.equal(row.emissionObserved, false);
  assert.deepEqual(row.failureKinds, ['browser-click']);
  assert.match(row.failures[0], /browser click.*Timeout 5000ms.*emission unconfirmed/);
  assert.match(row.browserClick.error, /pointer events intercepted/);
  assert.doesNotMatch(row.failures.join(' '), /browser click completed/);
  assert.equal(row.selectedCta.ctaId, 'patient-signup-hero');
  assert.equal(row.selectedCta.destination, 'https://signup.nourish.com/');
  assert.equal(row.selectedCta.target, '_blank');
  assert.equal(row.sdkRequested, true);
  assert.equal(row.readinessBeforeClick.sdkTrackAvailable, true);
  assert.deepEqual(row.readinessBeforeClick.consentGroups, ['C0001', 'C0002']);
  assert.deepEqual(fixture.observed.waits, [6000, 1500]);
  assert.deepEqual(fixture.observed.clickOptions, { timeout: 5000, modifiers: [] });
  assert.equal(fixture.observed.clicks, 1);
  assert.doesNotMatch(JSON.stringify(row), /private|patient@example|token=|Personal details|data-email/);
});

test('completed click with no captured emission has a separate bounded-window classification', async () => {
  const fixture = browserFixture({ emit: false });
  const row = await checkLanding(fixture.browser, '/paid', false);
  assert.equal(row.browserClick.outcome, 'completed');
  assert.equal(row.browserClick.error, null);
  assert.equal(row.emissionObserved, false);
  assert.deepEqual(row.failureKinds, ['event-observation']);
  assert.match(row.failures[0], /browser click completed.*within 1500ms/);
  assert.equal(row.capturedNavigations, 1);
});

test('expected emission survives a click rejection caused after intercepted navigation', async () => {
  const fixture = browserFixture({ afterClickError: new Error('navigation aborted by monitor') });
  const row = await checkLanding(fixture.browser, '/paid', false);
  assert.equal(row.browserClick.outcome, 'rejected');
  assert.match(row.browserClick.error, /navigation aborted/);
  assert.equal(row.emissionObserved, true);
  assert.equal(row.clickEvent, 'Get Started Clicked');
  assert.equal(row.capturedNavigations, 1);
  assert.deepEqual(row.failures, []);
});

test('unavailable CTA measurement does not fabricate SDK/consent state or suppress the original click', async () => {
  const fixture = browserFixture({ detailsError: new Error('detached before metadata read'), consent: undefined });
  const row = await checkLanding(fixture.browser, '/paid', false);
  assert.equal(row.selectedCta, null);
  assert.equal(row.readinessBeforeClick, null);
  assert.match(row.diagnosticErrors[0], /detached/);
  assert.equal(fixture.observed.clicks, 1);
  assert.equal(row.emissionObserved, true);
  assert.deepEqual(row.failures, []);
});

test('missing consent globals remain unknown in a measured readiness snapshot', async () => {
  const fixture = browserFixture({ consent: null });
  const row = await checkLanding(fixture.browser, '/paid', false);
  assert.equal(row.readinessAfterLoad.consentGroups, null);
  assert.equal(row.readinessBeforeClick.consentGroups, null);
  assert.equal(row.readinessAfterLoad.sdkPresent, true);
  assert.equal(row.readinessAfterLoad.sdkIsQueue, false);
});

test('persistence journey uses the same diagnostics without changing its waits or route order', async () => {
  const fixture = browserFixture({ clickError: new Error('element obstructed') });
  const row = await checkPersistence(fixture.browser);
  assert.equal(fixture.observed.navigationOptions.length, 2);
  assert.equal(fixture.observed.navigationOptions[1].referer, 'https://www.nourish.com/');
  assert.ok(fixture.observed.navigationOptions.every(o => o.timeout === 35000));
  assert.deepEqual(fixture.observed.waits, [4000, 6000, 1500]);
  assert.deepEqual(row.failureKinds, ['browser-click']);
  assert.match(row.failures[0], /after internal navigation, monitor execution failure/);
});

test('cleanup failure retains the original navigation failure and current case', async () => {
  const fixture = browserFixture({ navigationError: new Error('original navigation timeout'), closeError: new Error('cleanup failed') });
  await assert.rejects(checkLanding(fixture.browser, '/paid', false), error => {
    assert.match(error.monitorRow.failures.join(' '), /original navigation timeout/);
    assert.match(error.monitorRow.failures.join(' '), /cleanup failed/);
    assert.deepEqual(error.monitorRow.failureKinds, ['navigation', 'execution']);
    return true;
  });
});

test('summary preserves explicit false/zero and uses null for unmeasured fields', () => {
  const unknown = caseSummary({ route: '/paid', failures: [] });
  for (const key of ['sdkRequested', 'sdkActive', 'idleEvents', 'clicks', 'pageErrors', 'consoleErrors', 'failedAssets', 'consent']) assert.equal(unknown[key], null);
  const measured = caseSummary({ route: '/', sdkRequested: false, sdkActive: false, idle: [], clicks: [], errors: [], consoleErrors: [], failedAssets: [], failures: [] });
  assert.equal(measured.sdkRequested, false);
  assert.equal(measured.sdkActive, false);
  assert.equal(measured.idleEvents, 0);
  assert.equal(measured.pageErrors, 0);
});

test('large diagnostic summaries remain bounded while retaining all cases and failure counts', t => {
  const file = path.join(temporary(t), 'report.json');
  const cases = Array.from({ length: 50 }, () => ({ ...diagnosticRow('/paid', false),
    failures: Array(8).fill('x'.repeat(500)), diagnosticErrors: Array(8).fill('x'.repeat(500)),
    phaseHistory: Array.from({ length: 24 }, () => ({ operation: 'phase'.repeat(16), startedAt: '2026-10-28T23:40:00.000Z', elapsedMs: 35000 })),
  }));
  writeJson(file, reportSummary({ failures: ['failed'], cases }));
  assert.ok(fs.statSync(file).size <= MAX_JSON_BYTES);
  const saved = read(file);
  assert.equal(saved.cases.length, 50);
  assert.equal(saved.cases[0].failureCount, 8);
  assert.equal(saved.diagnosticsTruncated, true);
  assert.equal(saved.cases[0].failures.length, 2);
});

test('mocked full run preserves coverage, phase checkpoints and separate attempt data', async t => {
  const dir = temporary(t), output = path.join(dir, 'latest.json'), progressFile = path.join(dir, 'progress.json');
  let landingCalls = 0;
  const report = await main({ output, progressFile, mergeFile: '', log() {},
    fetchPage: async () => ({ ok: true, async text() { return '<script src="https://cdn.jsdelivr.net/gh/long-view-labs/webflow@v2.623.3/global.js"></script>'; } }),
    launch: async () => ({ async close() {} }),
    landing: async (browser, route, mobile, progress) => {
      landingCalls++;
      const row = diagnosticRow(route, mobile);
      progress('page.goto', row);
      assert.equal(read(progressFile).cases.length, landingCalls);
      assert.equal(read(progressFile).current.operation, 'page.goto');
      if (route === '/paid' && !mobile) { row.failureKinds = ['navigation']; row.failures = ['monitor execution failure (navigation): timeout']; }
      return row;
    },
    persistence: async () => diagnosticRow('/ -> /conditions/acid-reflux', false),
  });
  assert.equal(landingCalls, 18);
  assert.equal(report.cases.length, 20);
  assert.equal(report.complete, true);
  assert.equal(report.failureKind, 'monitor-execution');
  assert.equal(read(progressFile).cases.length, 20);
  assert.equal(read(progressFile).complete, true);
  assert.ok(read(progressFile).recentOperations.length <= 32);
  assert.deepEqual(read(output), report);
});

test('UTM fatal/cleanup errors preserve completed cases and never write a passing report', async t => {
  const dir = temporary(t), output = path.join(dir, 'latest.json'), progressFile = path.join(dir, 'progress.json');
  let calls = 0;
  const report = await main({ output, progressFile, mergeFile: '', log() {},
    fetchPage: async () => ({ ok: true, text: async () => '<script src="https://cdn.jsdelivr.net/gh/long-view-labs/webflow@v2.623.3/global.js"></script>' }),
    launch: async () => ({ async close() { throw new Error('browser cleanup failed'); } }),
    landing: async (browser, route, mobile, progress) => {
      const row = diagnosticRow(route, mobile); progress('context.close', row);
      if (++calls === 2) { const error = new Error('original context cleanup failed'); error.monitorRow = row; throw error; }
      return row;
    }, persistence: async () => assert.fail('must not continue after fatal cleanup'),
  });
  assert.equal(report.complete, false);
  assert.equal(report.cases.length, 3); // pin, completed case, interrupted case
  assert.match(report.failures.join(' '), /original context cleanup failed/);
  assert.match(report.failures.join(' '), /browser cleanup failed/);
  assert.equal(read(progressFile).complete, false);
});
