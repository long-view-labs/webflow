// footer.js loads Trustpilot's bootstrap when a widget nears the viewport. The bootstrap draws the
// widget itself; footer.js must not draw it again, or the first iframe load is cancelled (the daily
// report's console check saw net::ERR_ABORTED on 4 /landing ad pages, Oct 30 2026). A local page with
// one widget in view and this repo's footer.js, served under a www.nourish.com address (Trustpilot
// only serves its own domain), must load the widget iframe once and pass the console check.
// Needs Chrome and network access to widget.trustpilot.com. Run: node --test tests/trustpilot-single-load.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checker} from '../monitoring/daily-report/checker.mjs';
import {checkConsole, TRUSTPILOT_BUSINESS_UNIT} from '../monitoring/daily-report/console-check.mjs';

const FOOTER = fs.readFileSync(new URL('../footer.js', import.meta.url), 'utf8');
const page = `<!doctype html><html><head></head><body><h1>Drill</h1>
<div class="trustpilot-widget" data-locale="en-US" data-template-id="53aa8807dec7e10d38f59f32" data-businessunit-id="${TRUSTPILOT_BUSINESS_UNIT}" data-style-height="150px" data-style-width="100%"></div>
<script src="/__daily-report-fire-drill/footer.js"></script></body></html>`;

test('footer.js draws a Trustpilot widget once: one iframe load, none cancelled', async () => {
  const {browserOptions, protectPage} = await checker('src/browser.mjs');
  const {chromium} = await checker('node_modules/playwright/index.mjs');
  const base = 'https://www.nourish.com/__daily-report-fire-drill';
  const frames = [];
  const prepare = async (p) => {
    p.on('request', (r) => { if (r.resourceType() === 'document' && /widget\.trustpilot\.com\/trustboxes\//.test(r.url())) frames.push(r.url()); });
    await p.route(base + '/**', (route) => route.request().url().endsWith('/footer.js')
      ? route.fulfill({contentType: 'application/javascript', body: FOOTER})
      : route.fulfill({contentType: 'text/html', body: page}));
  };
  const browser = await chromium.launch(browserOptions());
  try {
    const r = await checkConsole(browser, {url: base + '/page', viewport: {width: 1440, height: 1000}}, {protectPage, idleMs: 5000, prepare});
    assert.equal(r.status, 'pass', JSON.stringify(r.issues));
    assert.equal(r.widgets, 1);
    assert.equal(frames.length, 1, frames.join('\n'));
  } finally { await browser.close(); }
});
