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

const BASE = process.env.MONITOR_BASE_URL || 'https://www.nourish.com';
if (!['https://www.nourish.com', 'https://nourish-2-23.webflow.io'].includes(BASE)) throw new Error('Unapproved monitor origin');
const OUTPUT = process.env.UTM_MONITOR_OUTPUT || 'utm-handoff-results.json';
const MARKERS = { utm_source: 'nourish_monitor', utm_medium: 'synthetic', utm_campaign: 'utm_handoff_check', gclid: 'nourish-monitor-check' };
// Pages whose primary CTA goes to signup: zero signup links there is itself a failure.
const MUST_HAVE_SIGNUP = ['/', '/paid', '/paid-google'];
const ROUTES = [...MUST_HAVE_SIGNUP, '/conditions/acid-reflux', '/local-dietitians/akron-ohio', '/does-my-insurance-cover-nutrition', '/blog/10-basic-cooking-skills-everyone-should-know'];
const PERSISTENCE_JOURNEY = ['/', '/conditions/acid-reflux'];
const SIGNUP_HOSTS = ['signup.nourish.com', 'signup.usenourish.com'];
const CLICK_EVENTS = ['Get Started Clicked', 'Dietitian Directory Clicked'];
// Campaign keys the click event itself must carry (gclid included).
const EVENT_KEYS = Object.keys(MARKERS);

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

async function newContext(browser, mobile, captured, telemetry = []) {
  const context = await browser.newContext({ ...(mobile ? devices['iPhone 13'] : { viewport: { width: 1440, height: 1000 } }), serviceWorkers: 'block' });
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
    return {
      links: [...document.querySelectorAll('a[href]')].filter(a => hosts.includes(host(a.href))).map(a => ({ href: a.href, visible: visible(a), text: (a.textContent || '').trim().slice(0, 60) })),
      iframes: [...document.querySelectorAll('iframe[src]')].filter(f => hosts.includes(host(f.src))).map(f => ({ src: f.src })),
    };
  }, SIGNUP_HOSTS);
}

async function checkLanding(browser, route, mobile) {
  const captured = [], telemetry = [], row = { route, device: mobile ? 'iPhone 13' : 'desktop', links: 0, visibleLinks: 0, iframes: 0, click: null, clickEvent: null, notes: [], failures: [] };
  const context = await newContext(browser, mobile, captured, telemetry);
  const page = await context.newPage();
  try {
    await page.goto(BASE + route + '?' + new URLSearchParams(MARKERS), { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(6000);
    const { links, iframes } = await inspect(page);
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
    const first = page.locator(SIGNUP_HOSTS.map(h => 'a[href*="' + h + '"]').join(',')).filter({ visible: true }).first();
    if (await first.count()) {
      const before = telemetry.length;
      await first.click({ timeout: 5000, modifiers: [] }).catch(() => {});
      await page.waitForTimeout(1500);
      const event = telemetry.slice(before).find(e => e.type === 'track' && CLICK_EVENTS.includes(e.event));
      if (!event) row.failures.push('signup click sent no ' + CLICK_EVENTS.join(' / ') + ' event');
      else {
        const props = event.properties || {};
        row.clickEvent = event.event;
        const missing = EVENT_KEYS.filter(k => props[k] !== MARKERS[k]);
        if (missing.length) row.failures.push(event.event + ' event missing ' + missing.join(','));
      }
      const destination = captured.at(-1);
      row.click = destination ? new URL(destination).origin + new URL(destination).pathname : null;
      if (!destination) row.notes.push('visible signup link click did not navigate in this tab (may open a new tab)');
      else {
        const { missing } = missingMarkers(destination);
        if (missing.length) row.failures.push('click destination missing ' + missing.join(','));
      }
    }
  } catch (e) { row.failures.push('execution: ' + String(e.message || e).slice(0, 200)); }
  finally { await context.close(); }
  return row;
}

async function checkPersistence(browser) {
  const captured = [], row = { route: PERSISTENCE_JOURNEY.join(' -> '), device: 'desktop', notes: [], failures: [] };
  const context = await newContext(browser, false, captured);
  const page = await context.newPage();
  try {
    await page.goto(BASE + PERSISTENCE_JOURNEY[0] + '?' + new URLSearchParams(MARKERS), { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(4000);
    await page.goto(BASE + PERSISTENCE_JOURNEY[1], { waitUntil: 'domcontentloaded', timeout: 35000, referer: BASE + PERSISTENCE_JOURNEY[0] });
    await page.waitForTimeout(6000);
    const { links } = await inspect(page);
    if (!links.length) row.notes.push('second page has no signup links to verify');
    for (const l of links) {
      const { missing } = missingMarkers(l.href);
      if (missing.length) row.failures.push('after internal navigation, link "' + l.text + '" missing ' + missing.join(','));
    }
  } catch (e) { row.failures.push('execution: ' + String(e.message || e).slice(0, 200)); }
  finally { await context.close(); }
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

async function main() {
  const browser = await chromium.launch();
  const rows = [];
  try {
    for (const mobile of [false, true]) for (const route of ROUTES) {
      const row = await checkLanding(browser, route, mobile); rows.push(row);
      console.log(row.device + ' ' + route + ': ' + (row.failures.length ? 'FAIL ' + row.failures.join('; ') : 'PASS (' + row.links + ' signup links)'));
    }
    const p = await checkPersistence(browser); rows.push(p);
    console.log('persistence ' + p.route + ': ' + (p.failures.length ? 'FAIL ' + p.failures.join('; ') : 'PASS'));
  } finally { await browser.close(); }
  const failures = rows.flatMap(r => r.failures.map(f => 'UTM handoff ' + r.device + ' ' + r.route + ': ' + f));
  fs.mkdirSync(path.dirname(path.resolve(OUTPUT)), { recursive: true });
  const report = { checkedAt: new Date().toISOString(), base: BASE, markers: MARKERS, mode: 'intercepted-read-only', failures, cases: rows };
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));
  mergeInto(process.env.UTM_MERGE_INTO, report);
  if (failures.length) process.exitCode = 1;
}

if (require.main === module) main().catch(e => {
  const report = { checkedAt: new Date().toISOString(), failures: ['UTM handoff check execution failed: ' + e.message], cases: [] };
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));
  mergeInto(process.env.UTM_MERGE_INTO, report);
  console.error(e.message); process.exitCode = 1;
});
module.exports = { missingMarkers, mergeInto, MARKERS, EVENT_KEYS };
