// "Page Engaged" — fires once per browser per page on the first real sign of
// interaction (global.js section 8).
//
// Runs global.js in headless Chromium against a local fixture. Every request is
// intercepted and the RudderStack SDK is replaced by the footer's stub array,
// so no real analytics events are sent.
//
// Test-only deps, deliberately NOT recorded in package.json / the lockfile:
//   npm install --no-save jquery@3.5.1 playwright@1.62.1 && npx playwright install chromium
// Usage:
//   node --test tests/page-engaged.test.js

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const STAGING = "https://nourish-2-23.webflow.io";
const PROD = "https://www.nourish.com";
const EVENT = "Page Engaged";
const VIEWPORT = { width: 1280, height: 800 };

const GLOBAL_JS = fs.readFileSync(path.join(__dirname, "..", "global.js"), "utf8");
const JQUERY_JS = fs.readFileSync(require.resolve("jquery/dist/jquery.min.js"), "utf8");

const STUB_SDK = `!(function () {
  var e = (window.rudderanalytics = window.rudderanalytics || []);
  e.methods = ["load","page","track","identify","ready","reset"];
  e.factory = function (t) { return function () { e.push([t].concat(Array.prototype.slice.call(arguments))); }; };
  for (var t = 0; t < e.methods.length; t++) { e[e.methods[t]] = e.factory(e.methods[t]); }
})();`;

function fixtureHtml({ sdk = STUB_SDK, heroHeight = 600, autofocusInput = false, preScript = "" } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fixture</title></head><body style="margin:0">
<nav class="w-nav" style="height:60px"><a id="nav-link" href="/about">About</a></nav>
<section class="section_hidden-variant" style="display:none;height:50px"></section>
<section class="section_hero" style="height:${heroHeight}px">
  <a id="signup" href="https://signup.nourish.com/">Get started</a>
  <button id="btn">Button</button>
  <input id="field" ${autofocusInput ? "autofocus" : ""}>
</section>
<section class="section_next" style="height:4000px">Body</section>
<div id="onetrust-consent-sdk"><div id="onetrust-banner-sdk" tabindex="-1"><button id="onetrust-accept-btn-handler">Accept</button></div></div>
<script>
  window.__nourish_apex = "nourish.com";
  ${preScript}
  ${sdk}
  window.__tracks = function () {
    var ra = window.rudderanalytics;
    if (Array.isArray(ra)) return ra.filter(function (e) { return e[0] === "track"; }).map(function (e) { return { event: e[1], props: e[2] }; });
    return window.__liveTracks || [];
  };
  window.addEventListener("click", function (e) { e.preventDefault(); });
</script>
<script src="/__test__/jquery.js"></script>
<script defer src="/__test__/global.js"></script>
</body></html>`;
}

async function open(browser, { origin = STAGING, pagePath = "/does-my-insurance-cover-nutrition", search = "", context, fixture } = {}) {
  const ctx = context || (await browser.newContext({ viewport: VIEWPORT }));
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/__test__/jquery.js") return route.fulfill({ contentType: "application/javascript", body: JQUERY_JS });
    if (url.pathname === "/__test__/global.js") return route.fulfill({ contentType: "application/javascript", body: GLOBAL_JS });
    return route.fulfill({ contentType: "text/html", body: fixtureHtml(fixture) });
  });
  await page.goto(origin + pagePath + search, { waitUntil: "load" });
  await page.waitForTimeout(50);
  return { page, context: ctx, pageErrors };
}

const engaged = (page) => page.evaluate((name) => window.__tracks().filter((c) => c.event === name), EVENT);
const eventNames = (page) => page.evaluate(() => window.__tracks().map((c) => c.event));
async function wheelTo(page, totalY) {
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, totalY);
  await page.waitForFunction((y) => window.scrollY >= y, totalY);
  await page.waitForTimeout(50);
}

test("Page Engaged", async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  await t.test("does not fire while the page sits idle", async () => {
    const { page, context } = await open(browser);
    await page.waitForTimeout(200);
    assert.deepEqual(await engaged(page), []);
    await context.close();
  });

  await t.test("a click fires it once with the page properties", async () => {
    const { page, context } = await open(browser, { search: "?utm_source=fb" });
    await page.click("#btn");
    await page.click("#btn");
    const events = await engaged(page);
    assert.equal(events.length, 1);
    const p = events[0].props;
    assert.equal(p.trigger, "click");
    assert.equal(p.page_path, "/does-my-insurance-cover-nutrition");
    assert.equal(p.url, STAGING + "/does-my-insurance-cover-nutrition?utm_source=fb");
    assert.equal(p.deviceType, "desktop");
    assert.equal(p.utm_source, "fb");
    await context.close();
  });

  await t.test("clicking a signup CTA sends it before Get Started Clicked", async () => {
    const { page, context } = await open(browser, { origin: STAGING });
    await page.click("#signup");
    const names = (await eventNames(page)).filter((n) => n !== "Viewed Page");
    assert.equal(names[0], EVENT);
    assert.equal(names.filter((n) => n === EVENT).length, 1);
    await context.close();
  });

  await t.test("tabbing onto an element fires it with trigger=focus", async () => {
    const { page, context } = await open(browser);
    await page.keyboard.press("Tab");
    const events = await engaged(page);
    assert.equal(events.length, 1);
    assert.equal(events[0].props.trigger, "focus");
    await context.close();
  });

  await t.test("typing into an already focused input fires it with trigger=input", async () => {
    const { page, context } = await open(browser, { fixture: { autofocusInput: true } });
    assert.deepEqual(await engaged(page), []);
    await page.keyboard.type("a");
    const events = await engaged(page);
    assert.equal(events.length, 1);
    assert.equal(events[0].props.trigger, "input");
    await context.close();
  });

  await t.test("scrolling within the header does not fire; scrolling past it does", async () => {
    const { page, context } = await open(browser);
    await wheelTo(page, 300);
    assert.deepEqual(await engaged(page), []);
    await wheelTo(page, 700);
    const events = await engaged(page);
    assert.equal(events.length, 1);
    assert.equal(events[0].props.trigger, "scroll");
    await context.close();
  });

  await t.test("a first section taller than 1.5 screens falls back to one screen of scrolling", async () => {
    const { page, context } = await open(browser, { fixture: { heroHeight: 3000 } });
    await wheelTo(page, 700);
    assert.deepEqual(await engaged(page), []);
    await wheelTo(page, 810);
    assert.equal((await engaged(page)).length, 1);
    await context.close();
  });

  await t.test("scrolling without a user gesture does not fire (anchors, restoration)", async () => {
    const { page, context } = await open(browser);
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(100);
    assert.deepEqual(await engaged(page), []);
    await context.close();
  });

  await t.test("scripted clicks do not fire", async () => {
    const { page, context } = await open(browser);
    await page.evaluate(() => document.getElementById("btn").click());
    assert.deepEqual(await engaged(page), []);
    await context.close();
  });

  await t.test("the cookie banner does not count, by click or by focus", async () => {
    const { page, context } = await open(browser);
    await page.evaluate(() => document.getElementById("onetrust-banner-sdk").focus());
    await page.click("#onetrust-accept-btn-handler");
    assert.deepEqual(await engaged(page), []);
    await context.close();
  });

  await t.test("stays fired on a later visit to the same page, with or without trailing slash", async () => {
    const first = await open(browser);
    await first.page.click("#btn");
    assert.equal((await engaged(first.page)).length, 1);
    await first.page.close();
    for (const pagePath of ["/does-my-insurance-cover-nutrition", "/does-my-insurance-cover-nutrition/"]) {
      const again = await open(browser, { context: first.context, pagePath, search: "?later=1" });
      await again.page.click("#btn");
      assert.deepEqual(await engaged(again.page), []);
      await again.page.close();
    }
    await first.context.close();
  });

  await t.test("a different page fires on its own", async () => {
    const first = await open(browser, { pagePath: "/" });
    await first.page.click("#btn");
    await first.page.close();
    const second = await open(browser, { context: first.context, pagePath: "/does-my-insurance-cover-nutrition" });
    await second.page.click("#btn");
    const events = await engaged(second.page);
    assert.equal(events.length, 1);
    assert.equal(events[0].props.page_path, "/does-my-insurance-cover-nutrition");
    await first.context.close();
  });

  await t.test("blocked localStorage still fires once per page load without errors", async () => {
    const preScript = `Object.defineProperty(window, "localStorage", { get: function () { throw new Error("blocked"); } });`;
    const { page, context, pageErrors } = await open(browser, { fixture: { preScript } });
    await page.click("#btn");
    await page.click("#btn");
    assert.equal((await engaged(page)).length, 1);
    assert.deepEqual(pageErrors.filter((e) => /engaged/i.test(e)), []);
    await context.close();
  });

  await t.test("a missing SDK does not use up the page's one event", async () => {
    const { page, context } = await open(browser, { fixture: { sdk: "window.__liveTracks = [];" } });
    await page.click("#btn");
    const stored = await page.evaluate(() => JSON.stringify(window.localStorage));
    assert.ok(!/does-my-insurance/.test(stored), "should not remember a page it could not report");
    // The SDK arrives late: the next interaction must still report.
    await page.evaluate(() => {
      window.rudderanalytics = { track: (event, props) => window.__liveTracks.push({ event, props }), page() {} };
    });
    await page.click("#btn");
    assert.equal((await engaged(page)).length, 1);
    await context.close();
  });

  await t.test("an SDK that throws never breaks the click", async () => {
    const sdk = `window.__liveTracks = []; window.rudderanalytics = { track: function (n) { if (n === "${EVENT}") throw new Error("SDK exploded"); }, page: function () {} };`;
    const { page, context, pageErrors } = await open(browser, { fixture: { sdk } });
    await page.click("#btn");
    assert.deepEqual(pageErrors.filter((e) => /exploded/.test(e)), []);
    await context.close();
  });

  await t.test("stays off on production until launch", async () => {
    const { page, context } = await open(browser, { origin: PROD });
    await page.click("#btn");
    await page.keyboard.press("Tab");
    await wheelTo(page, 900);
    assert.deepEqual(await engaged(page), []);
    assert.equal(await page.evaluate(() => window.localStorage.getItem("nourish_page_engaged")), null);
    await context.close();
  });
});
