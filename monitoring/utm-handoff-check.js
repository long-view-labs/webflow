'use strict';
// Read-only UTM handoff check. Lands on real pages with marker campaign params
// and verifies they reach every signup link, signup iframe and the URL a signup
// click actually navigates to, and that they persist to the next page.
// All non-GET requests and analytics beacons are intercepted before navigation,
// signup navigations are captured and aborted, and nothing is submitted.
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const { eventsFromRequest } = require('./contracts');
const { errorText, progressRecorder, readinessSummary, selectedCtaSummary, destinationSummary } = require('./diagnostics');

const BASE = process.env.MONITOR_BASE_URL || 'https://www.nourish.com';
if (!['https://www.nourish.com', 'https://nourish-2-23.webflow.io'].includes(BASE)) throw new Error('Unapproved monitor origin');
const OUTPUT = process.env.UTM_MONITOR_OUTPUT || 'utm-handoff-results.json';
const MARKERS = { utm_source: 'nourish_monitor', utm_medium: 'synthetic', utm_campaign: 'utm_handoff_check', gclid: 'nourish-monitor-check' };
// Pages whose primary CTA goes to signup: zero signup links there is itself a failure.
const MUST_HAVE_SIGNUP = ['/', '/paid', '/paid-google'];
const ROUTES = [...MUST_HAVE_SIGNUP, '/conditions/acid-reflux', '/local-dietitians/akron-ohio', '/does-my-insurance-cover-nutrition', '/blog/10-basic-cooking-skills-everyone-should-know',
  // Signup links to /1, /2 and /flow/get-started (untracked in 2.622.0 to 2.623.2).
  '/landing-pages/meal-planning', '/blog/emotional-eating-books'];
const PERSISTENCE_JOURNEY = ['/', '/conditions/acid-reflux'];
const SIGNUP_HOSTS = ['signup.nourish.com', 'signup.usenourish.com'];
const CLICK_EVENTS = ['Get Started Clicked', 'Dietitian Directory Clicked'];
// Campaign keys the click event itself must carry (gclid included).
const EVENT_KEYS = Object.keys(MARKERS);
// Production must load a released global.js tag. A draft commit or branch pin
// reached prod Oct 23-27 2026 through the shared Webflow footer and dropped
// every UTM from CTA click events for four days.
const RELEASED_REF = /^v\d+\.\d+\.\d+$/;

function pinFailures(html) {
  const refs = [...new Set([...String(html).matchAll(/long-view-labs\/webflow@([^"'\s]+?)\/global\.js/g)].map(m => m[1]))];
  if (!refs.length) return ['production HTML has no long-view-labs/webflow global.js pin'];
  return refs.filter(ref => !RELEASED_REF.test(ref)).map(ref => 'production global.js pinned to unreleased ref ' + ref);
}

// The click event must carry the markers as properties AND inside `url`:
// Amplitude's "UTM Passthrough Rate" alert filters on url contains utm_source=,
// and 2.622.0-2.622.4 silently trimmed url to origin + path.
function clickEventFailures(event) {
  const props = event.properties || {};
  const failures = [];
  const missing = EVENT_KEYS.filter(k => props[k] !== MARKERS[k]);
  if (missing.length) failures.push(event.event + ' event missing ' + missing.join(','));
  const inUrl = missingMarkers(props.url || '').missing;
  if (inUrl.length) failures.push(event.event + ' event url missing ' + inUrl.join(','));
  return failures;
}

function missingMarkers(href) {
  let u;
  try { u = new URL(href); } catch { return { missing: Object.keys(MARKERS), preexisting: [] }; }
  const missing = [], preexisting = [];
  for (const [k, v] of Object.entries(MARKERS)) {
    const got = u.searchParams.get(k);
    if (got === null) missing.push(k);
    else if (got !== v) preexisting.push(k + '=' + got); // authored value kept on purpose, never overwritten
  }
  return { missing, preexisting };
}

function diagnosticRow(route, mobile) {
  return { route, device: mobile ? 'iPhone 13' : 'desktop', diagnosticType: 'utm', status: null,
    links: null, visibleLinks: null, iframes: null, linksClicked: null, sdkRequested: null,
    selectedCta: null, readinessAfterLoad: null, readinessBeforeClick: null,
    browserClick: { outcome: 'not-attempted', elapsedMs: null, error: null }, emissionObserved: null,
    capturedNavigations: null, click: null, clickEvent: null, diagnosticErrors: [], failureKinds: [],
    notes: [], failures: [], phaseHistory: [] };
}

function caseProgress(row, progress) {
  let previousAt;
  return operation => {
    const now = Date.now();
    if (row.phaseHistory.length) row.phaseHistory.at(-1).elapsedMs = now - previousAt;
    row.phase = operation;
    row.phaseHistory.push({ operation, startedAt: new Date(now).toISOString(), elapsedMs: null });
    if (row.phaseHistory.length > 24) row.phaseHistory.shift();
    previousAt = now;
    progress(operation, row);
  };
}

function recordFailure(row, kind, message) {
  if (!row.failureKinds.includes(kind)) row.failureKinds.push(kind);
  row.failures.push(message);
}

function executionFailure(row, error) {
  const navigation = row.phase.startsWith('page.goto');
  recordFailure(row, navigation ? 'navigation' : 'execution',
    'monitor execution failure (' + (navigation ? 'navigation' : row.phase) + '): ' + errorText(error));
}

function observeSdkRequests(page, row) {
  page.on('request', request => { if (request.url().includes('/rsa.min.js')) row.sdkRequested = true; });
  row.sdkRequested = false; // The observer is installed before navigation.
}

function browserClickError(error) {
  // Playwright's detailed call log can contain DOM text and attributes. Preserve
  // only its bounded first line and recognized actionability/navigation reasons.
  const text = String(error?.message || error);
  const reasons = [
    [/intercepts pointer events/i, 'pointer events intercepted'],
    [/element is not visible/i, 'element not visible'],
    [/element is not enabled/i, 'element disabled'],
    [/element is not stable/i, 'element unstable'],
    [/element (?:was |is )?detached|not attached to the DOM/i, 'element detached'],
    [/net::ERR_ABORTED/i, 'navigation aborted'],
    [/target.*closed|page.*closed/i, 'target closed'],
  ].filter(([pattern]) => pattern.test(text)).map(([, reason]) => reason);
  return errorText(error) + (reasons.length ? ' [' + reasons.join('; ') + ']' : '');
}

async function newContext(browser, mobile, captured, telemetry = [], step = () => {}) {
  step('browser.newContext');
  const context = await browser.newContext({ ...(mobile ? devices['iPhone 13'] : { viewport: { width: 1440, height: 1000 } }), serviceWorkers: 'block' });
  step('context.route');
  await context.route('**/*', async r => {
    const q = r.request(), u = new URL(q.url());
    if (q.isNavigationRequest() && SIGNUP_HOSTS.includes(u.hostname)) { captured.push(q.url()); return r.abort(); }
    if (q.isNavigationRequest() && q.frame().parentFrame() === null && u.origin !== BASE) return r.abort();
    const safeBingLibrary = u.hostname === 'bat.bing.com' && u.pathname === '/bat.js' && q.method() === 'GET';
    if (!safeBingLibrary && (q.method() !== 'GET' || /^dataplane-proxy\./.test(u.hostname) ||
        /google-analytics|analytics.google|doubleclick|facebook\.com|bat.bing|linkedin.com\/px|api2.amplitude/.test(u.hostname + u.pathname) ||
        /\/(collect|pixel)(\?|\/|$)/.test(u.pathname))) {
      telemetry.push(...eventsFromRequest(q.method(), q.url(), q.postData()));
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    if (u.pathname.startsWith('/dietitian-application')) return r.abort(); // creates drafts under JS
    // Local pre-deploy validation only: serve a candidate global.js to this
    // headless browser instead of the pinned CDN build. Never used in CI.
    if (process.env.UTM_GLOBAL_JS_OVERRIDE && u.hostname === 'cdn.jsdelivr.net' && /\/long-view-labs\/webflow@[^/]+\/global\.js$/.test(u.pathname))
      return r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(process.env.UTM_GLOBAL_JS_OVERRIDE, 'utf8') });
    return r.fallback();
  });
  return context;
}

async function inspect(page) {
  return page.evaluate(hosts => {
    const visible = e => { const b = e.getBoundingClientRect(), s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const host = h => { try { return new URL(h, location.href).hostname; } catch { return ''; } };
    const ra = window.rudderanalytics, groups = window.OnetrustActiveGroups || window.OptanonActiveGroups;
    return {
      readiness: { documentReadyState: document.readyState, sdkPresent: !!ra, sdkIsQueue: ra ? Array.isArray(ra) : null,
        sdkTrackAvailable: !!ra && typeof ra.track === 'function', consentGroups: typeof groups === 'string' ? groups.split(',').filter(g => /^C\d{4}$/.test(g)) : null },
      links: [...document.querySelectorAll('a[href]')].filter(a => hosts.includes(host(a.href))).map(a => ({ href: a.href, visible: visible(a), text: (a.textContent || '').trim().slice(0, 60) })),
      iframes: [...document.querySelectorAll('iframe[src]')].filter(f => hosts.includes(host(f.src))).map(f => ({ src: f.src })),
    };
  }, SIGNUP_HOSTS);
}

async function observeSignupClick(page, first, captured, telemetry, row, step, prefix = '', checkDestination = true) {
  step('cta.inspect');
  try {
    const details = await first.evaluate(a => {
      const ra = window.rudderanalytics, groups = window.OnetrustActiveGroups || window.OptanonActiveGroups;
      return { cta: { ctaId: a.getAttribute('data-cta-id'), destination: a.href, target: a.getAttribute('target') || '' },
        readiness: { documentReadyState: document.readyState, sdkPresent: !!ra, sdkIsQueue: ra ? Array.isArray(ra) : null,
          sdkTrackAvailable: !!ra && typeof ra.track === 'function', consentGroups: typeof groups === 'string' ? groups.split(',').filter(g => /^C\d{4}$/.test(g)) : null } };
    }, undefined, { timeout: 5000 });
    row.selectedCta = selectedCtaSummary(details.cta);
    row.readinessBeforeClick = readinessSummary(details.readiness);
  } catch (error) { row.diagnosticErrors.push('CTA details unavailable: ' + errorText(error)); }
  const before = telemetry.length, navigationBefore = captured.length;
  row.browserClick.outcome = 'pending';
  step('cta.click');
  const started = Date.now();
  try {
    await first.click({ timeout: 5000, modifiers: [] });
    row.browserClick.outcome = 'completed';
  } catch (error) {
    row.browserClick.outcome = 'rejected';
    row.browserClick.error = browserClickError(error);
  }
  row.browserClick.elapsedMs = Date.now() - started;
  step('cta.waitForEvents');
  await page.waitForTimeout(1500);
  const event = telemetry.slice(before).find(e => e.type === 'track' && CLICK_EVENTS.includes(e.event));
  row.emissionObserved = !!event;
  row.capturedNavigations = captured.length - navigationBefore;
  const destination = captured.slice(navigationBefore).at(-1);
  row.click = destination ? destinationSummary(destination) : null;
  if (event) {
    row.clickEvent = event.event;
    for (const failure of clickEventFailures(event)) recordFailure(row, 'tracking-contract', prefix + failure);
    // Intercepted navigation can reject Playwright's click after the event was
    // emitted. Keep the error as evidence without inventing a missing emission.
  } else if (row.browserClick.outcome === 'rejected') {
    recordFailure(row, 'browser-click', prefix + 'monitor execution failure (browser click): ' + row.browserClick.error + '; emission unconfirmed');
  } else {
    recordFailure(row, 'event-observation', prefix + 'browser click completed but no ' + CLICK_EVENTS.join(' / ') + ' emission observed within 1500ms');
  }
  if (!destination) row.notes.push(prefix + 'no signup navigation captured after this click; cause unconfirmed');
  else if (checkDestination) {
    const missing = missingMarkers(destination).missing;
    if (missing.length) recordFailure(row, 'tracking-contract', prefix + 'click destination missing ' + missing.join(','));
  }
  step('cta.observationComplete');
}

async function checkLanding(browser, route, mobile, progress = () => {}) {
  const captured = [], telemetry = [], row = diagnosticRow(route, mobile), step = caseProgress(row, progress);
  let context;
  try {
    context = await newContext(browser, mobile, captured, telemetry, step);
    step('context.newPage');
    const page = await context.newPage();
    observeSdkRequests(page, row);
    step('page.goto');
    row.status = (await page.goto(BASE + route + '?' + new URLSearchParams(MARKERS), { waitUntil: 'domcontentloaded', timeout: 35000 }))?.status() ?? null;
    step('page.waitForReadinessWindow');
    await page.waitForTimeout(6000);
    step('page.inspect');
    const { links, iframes, readiness } = await inspect(page);
    row.readinessAfterLoad = readinessSummary(readiness);
    row.links = links.length; row.visibleLinks = links.filter(l => l.visible).length; row.iframes = iframes.length;
    if (!links.length && MUST_HAVE_SIGNUP.includes(route)) row.failures.push('no signup links found');
    for (const l of links) {
      const { missing, preexisting } = missingMarkers(l.href);
      if (missing.length) row.failures.push('link "' + l.text + '" missing ' + missing.join(',') + ': ' + new URL(l.href).origin + new URL(l.href).pathname);
      if (preexisting.length) row.notes.push('link "' + l.text + '" keeps authored ' + preexisting.join(','));
    }
    for (const f of iframes) {
      const { missing } = missingMarkers(f.src);
      if (missing.length) row.failures.push('signup iframe missing ' + missing.join(','));
    }
    // Every signup link must send exactly one click event with a mapped CTA,
    // not just the first one (v2.622.0 silently dropped http:// blog CTAs).
    // Navigation is suppressed; the SDK call is recorded before any network.
    step('cta.preflight');
    const perLink = await page.evaluate(({ hosts, names }) => {
      const ra = window.rudderanalytics, calls = [];
      if (!ra || typeof ra.track !== 'function') return { error: 'rudderanalytics.track unavailable' };
      const original = ra.track;
      ra.track = function (name, props) { if (names.includes(name)) calls.push(props || {}); return original.apply(this, arguments); };
      const stop = (e) => e.preventDefault();
      window.addEventListener('click', stop, true);
      const out = [];
      for (const a of document.querySelectorAll('a[href]')) {
        let u; try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { continue; }
        const path = u.pathname.replace(/\/$/, '') || '/';
        // Every signup-host path is a CTA except privacy/settings (same rule as global.js patientAction).
        if (!hosts.includes(u.hostname) || /^\/(?:your-privacy-choices|settings)(?:\/|$)/.test(path) || u.port || u.username) continue;
        if (a.closest('.page-wrapper.cc-paid-new')) continue; // retired /paid build, hidden for everyone
        const before = calls.length;
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const got = calls.slice(before);
        out.push({ text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), events: got.length, id: got[0] && got[0].cta_id });
      }
      window.removeEventListener('click', stop, true);
      ra.track = original;
      return { links: out };
    }, { hosts: SIGNUP_HOSTS, names: CLICK_EVENTS });
    if (perLink.error) row.failures.push('per-link check: ' + perLink.error);
    else {
      row.linksClicked = perLink.links.length;
      for (const l of perLink.links) {
        if (l.events !== 1) row.failures.push('link "' + l.text + '" sent ' + l.events + ' click events');
        else if (/-(other|unmapped)$/.test(l.id || '')) row.failures.push('link "' + l.text + '" reported as ' + l.id + ' (no mapping or broken data-cta-* contract)');
      }
    }
    if (row.failures.length) row.failureKinds.push('tracking-contract');
    const first = page.locator(SIGNUP_HOSTS.map(h => 'a[href*="' + h + '"]').join(',')).filter({ visible: true }).first();
    step('cta.count');
    if (await first.count()) {
      await observeSignupClick(page, first, captured, telemetry, row, step);
    }
  } catch (e) { executionFailure(row, e); }
  finally {
    if (context) {
      step('context.close');
      try { await context.close(); } catch (e) { recordFailure(row, 'execution', 'monitor cleanup failure: ' + errorText(e)); e.monitorRow = row; throw e; }
    }
  }
  step('case.complete');
  return row;
}

async function checkPersistence(browser, progress = () => {}) {
  const captured = [], telemetry = [], row = diagnosticRow(PERSISTENCE_JOURNEY.join(' -> '), false), step = caseProgress(row, progress);
  let context;
  try {
    context = await newContext(browser, false, captured, telemetry, step);
    step('context.newPage');
    const page = await context.newPage();
    observeSdkRequests(page, row);
    step('page.gotoLanding');
    await page.goto(BASE + PERSISTENCE_JOURNEY[0] + '?' + new URLSearchParams(MARKERS), { waitUntil: 'domcontentloaded', timeout: 35000 });
    step('page.waitForPersistenceWindow');
    await page.waitForTimeout(4000);
    step('page.gotoInternal');
    row.status = (await page.goto(BASE + PERSISTENCE_JOURNEY[1], { waitUntil: 'domcontentloaded', timeout: 35000, referer: BASE + PERSISTENCE_JOURNEY[0] }))?.status() ?? null;
    step('page.waitForReadinessWindow');
    await page.waitForTimeout(6000);
    step('page.inspect');
    const { links, iframes, readiness } = await inspect(page);
    row.links = links.length; row.visibleLinks = links.filter(l => l.visible).length; row.iframes = iframes.length;
    row.readinessAfterLoad = readinessSummary(readiness);
    if (!links.length) row.notes.push('second page has no signup links to verify');
    for (const l of links) {
      const { missing } = missingMarkers(l.href);
      if (missing.length) row.failures.push('after internal navigation, link "' + l.text + '" missing ' + missing.join(','));
    }
    if (row.failures.length) row.failureKinds.push('tracking-contract');
    // Stored UTMs must also reach the click event, not just the links.
    const first = page.locator(SIGNUP_HOSTS.map(h => 'a[href*="' + h + '"]').join(',')).filter({ visible: true }).first();
    step('cta.count');
    if (await first.count()) {
      await observeSignupClick(page, first, captured, telemetry, row, step, 'after internal navigation, ', false);
    }
  } catch (e) { executionFailure(row, e); }
  finally {
    if (context) {
      step('context.close');
      try { await context.close(); } catch (e) { recordFailure(row, 'execution', 'monitor cleanup failure: ' + errorText(e)); e.monitorRow = row; throw e; }
    }
  }
  step('case.complete');
  return row;
}

// Adds UTM failures to the main monitor report so the existing alert path sees them.
function mergeInto(file, report) {
  if (!file) return;
  let base = { failures: [], cases: [] };
  try { base = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  base.failures = [...(base.failures || []), ...report.failures];
  base.utmHandoff = { checkedAt: report.checkedAt, failures: report.failures.length, cases: report.cases.length };
  fs.writeFileSync(file, JSON.stringify(base, null, 2));
}

async function main({ launch = () => chromium.launch(), fetchPage = fetch, landing = checkLanding, persistence = checkPersistence,
  output = OUTPUT, progressFile = process.env.MONITOR_PROGRESS_OUTPUT, mergeFile = process.env.UTM_MERGE_INTO, log = console.log } = {}) {
  const pin = { route: 'production global.js pin', device: 'http', notes: [], failures: [] };
  const rows = [], executionFailures = [], checkpoint = progressRecorder(progressFile, rows, executionFailures);
  let browser, current;
  const progress = (operation, row) => { current = { operation, row }; checkpoint(operation, row); };
  try {
    try {
      progress('pin.fetch', pin);
      const res = await fetchPage(BASE + '/?nourish_monitor_pin=' + Date.now(), { headers: { 'cache-control': 'no-cache' } }); // bypass Cloudflare's HTML cache
      progress('pin.readResponse', pin);
      pin.failures = res.ok ? pinFailures(await res.text()) : ['production HTML returned ' + res.status];
    } catch (e) { pin.failures = ['monitor execution failure (pin check): ' + errorText(e)]; }
    rows.push(pin); progress('pin.complete', pin);
    // Under UTM_GLOBAL_JS_OVERRIDE the served build is not the pinned one, so the pin result only describes prod.
    log('pin: ' + (pin.failures.length ? 'FAIL ' + pin.failures.join('; ') : 'PASS'));
    progress('chromium.launch'); browser = await launch();
    for (const mobile of [false, true]) for (const route of ROUTES) {
      progress('case.start', diagnosticRow(route, mobile));
      const row = await landing(browser, route, mobile, progress); rows.push(row); progress('case.complete', row);
      log(row.device + ' ' + route + ': ' + (row.failures.length ? 'FAIL ' + row.failures.map(errorText).join('; ') : 'PASS (' + row.links + ' signup links)'));
    }
    progress('case.start', diagnosticRow(PERSISTENCE_JOURNEY.join(' -> '), false));
    const p = await persistence(browser, progress); rows.push(p); progress('case.complete', p);
    log('persistence ' + p.route + ': ' + (p.failures.length ? 'FAIL ' + p.failures.map(errorText).join('; ') : 'PASS'));
  } catch (e) {
    if (e.monitorRow && !rows.includes(e.monitorRow)) rows.push(e.monitorRow);
    executionFailures.push('monitor execution failure at ' + current?.operation + ': ' + errorText(e));
    checkpoint(current?.operation, current?.row);
  } finally {
    if (browser) {
      progress('browser.close', current?.row);
      try { await browser.close(); } catch (e) { executionFailures.push('monitor cleanup failure at browser.close: ' + errorText(e)); }
    }
  }
  const failures = rows.flatMap(r => r.failures.map(f => 'UTM handoff ' + r.device + ' ' + r.route + ': ' + f)).concat(executionFailures);
  const executionOnly = failures.length && failures.every(f => /monitor (execution|cleanup) failure/.test(f));
  const report = { checkedAt: new Date().toISOString(), base: BASE, markers: MARKERS, mode: 'intercepted-read-only',
    complete: executionFailures.length === 0, ...(executionOnly ? { failureKind: 'monitor-execution' } : {}), failures, cases: rows };
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  mergeInto(mergeFile, report);
  checkpoint(null, undefined, report.complete);
  return report;
}

if (require.main === module) main().then(report => { if (report.failures.length) process.exitCode = 1; }).catch(e => { console.error(errorText(e)); process.exitCode = 1; });
module.exports = { missingMarkers, mergeInto, pinFailures, clickEventFailures, MARKERS, EVENT_KEYS, diagnosticRow, caseProgress, observeSignupClick, checkLanding, checkPersistence, main };
