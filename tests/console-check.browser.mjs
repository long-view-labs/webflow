// Fire drill for the daily report's console/network check in a real browser: a local page carrying
// a Trustpilot widget with the retired business unit (as on ~80 Nourish pages before Oct 29 2026),
// loading Trustpilot's real bootstrap (served locally under a www.nourish.com address), must be flagged twice: the id itself and the trustbox-data
// HTTP 400. The same page with the live id stays clean. Needs Chrome and network access to
// widget.trustpilot.com. Run: node --test tests/console-check.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {checker} from '../monitoring/daily-report/checker.mjs';
import {checkConsole, TRUSTPILOT_BUSINESS_UNIT} from '../monitoring/daily-report/console-check.mjs';

const DEAD_BU = '6480f128811d0a0b3ba2b211';
const page = (bu) => `<!doctype html><html><head><script src="https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js" async></script></head><body>
<div class="trustpilot-widget" data-locale="en-US" data-template-id="53aa8807dec7e10d38f59f32" data-businessunit-id="${bu}" data-style-width="200px"><a href="https://www.trustpilot.com/review/nourish.com">Trustpilot</a></div></body></html>`;

test('console check fire drill: a retired Trustpilot id is flagged (id and widget API 400); the live id is clean', async () => {
  const {browserOptions, protectPage} = await checker('src/browser.mjs');
  const {chromium} = await checker('node_modules/playwright/index.mjs');
  // Trustpilot only serves a widget to its business unit's own domain, so the drill page sits at an
  // unused www.nourish.com path, answered locally: nothing is fetched from the live site.
  const base = 'https://www.nourish.com/__daily-report-fire-drill';
  const prepare = (p) => p.route(base + '/**', (route) => route.fulfill({contentType: 'text/html', body: page(route.request().url().endsWith('/dead') ? DEAD_BU : TRUSTPILOT_BUSINESS_UNIT)}));
  const browser = await chromium.launch(browserOptions());
  try {
    const viewport = {width: 1440, height: 1000};
    const dead = await checkConsole(browser, {url: base + '/dead', viewport}, {protectPage, idleMs: 5000, prepare});
    assert.equal(dead.status, 'fail', JSON.stringify(dead));
    assert.ok(dead.issues.some((i) => i.kind === 'trustpilot-id' && i.detail.includes(DEAD_BU)), JSON.stringify(dead.issues));
    assert.ok(dead.issues.some((i) => i.kind === 'http' && i.status === 400 && /widget\.trustpilot\.com\/trustbox-data\//.test(i.url)), JSON.stringify(dead.issues));
    const live = await checkConsole(browser, {url: base + '/live', viewport}, {protectPage, idleMs: 5000, prepare});
    assert.equal(live.status, 'pass', JSON.stringify(live.issues));
    assert.equal(live.widgets, 1);
  } finally { await browser.close(); }
});
