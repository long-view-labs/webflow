// /paid page guards (paid.html = /paid Page Settings → Custom Code → Footer).
//
// Runs the real blocks sliced out of paid.html — the shared init helpers, the
// retired-build cleanup + multi-step loader, and the Trust Pilot testimonial
// slider — against fixtures that mirror the live DOM states:
//   - the OLD build alone (live since Oct 2026), which has NO testimonial
//     slider, so the slider block must stay silent instead of throwing from
//     IntersectionObserver.observe(undefined);
//   - both builds present with the NEW one hidden, so cleanup must remove it
//     before the slider initialises and the vendor loader runs;
//   - steps present / absent, so the videsigns multi-step.js is loaded only
//     when there is a quiz to bind, and only once.
// Swiper is a stub, the vendor URL is answered by a counting stub, nothing
// reaches the network.
//
// Usage: node --test tests/paid-guards.test.js

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { SWIPER_STUB, readRepoFile, scriptBlock, openPage } = require("./_harness");

const PAID = readRepoFile("paid.html");
const HELPERS = scriptBlock(PAID, "<!-- ===== Shared init helpers");
const CLEANUP = scriptBlock(PAID, "<!-- ===== retired-build cleanup + multi-step loader");
const SLIDER = scriptBlock(PAID, "<!-- ===== Trust Pilot slider, auto progress");

const SLIDER_MARKUP = `
  <div class="tinyflow-slider" data-speed="500" data-autoplay-delay="4000">
    <div class="swiper-wrapper"><div class="swiper-slide">one</div><div class="swiper-slide">two</div></div>
  </div>
  <div class="tinyflow-slider_profile-wrap">
    <img class="tinyflow_profile-icon" alt=""><img class="tinyflow_profile-icon" alt="">
  </div>
  <a data-slider-arrow="prev" href="#">prev</a><a data-slider-arrow="next" href="#">next</a>`;

const QUIZ_MARKUP = `
  <form data-form="multi-step" id="wf-form-Insurance-Check">
    <div data-form="step"><input name="a"></div><div data-form="step"><input name="b"></div>
    <a data-form="back-btn" href="#">back</a>
  </form>`;

function fixtureHtml({ oldBuild = "", newBuild = null, blocks = [HELPERS, CLEANUP, SLIDER] }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>.cc-paid-new{display:none}.cc-paid-old{display:block}</style>
<title>paid</title></head><body>
<div class="page-wrapper cc-paid-old">${oldBuild}</div>
${newBuild === null ? "" : `<div class="page-wrapper cc-paid-new">${newBuild}</div>`}
<script src="/__test__/jquery.js"></script>
<script>${SWIPER_STUB}</script>
${blocks.map((b) => `<script>${b}</script>`).join("\n")}
</body></html>`;
}

const PAGE = "/paid";
const open = (browser, opts) =>
  openPage(browser, { pagePath: PAGE, html: fixtureHtml(opts) });
const settle = (page) => page.waitForTimeout(300); // onReady + waitFor polls at 50ms

test("/paid page guards", async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  await t.test("old build without a testimonial slider: no errors, no Swiper, build kept", async () => {
    const { page, context, pageErrors } = await open(browser, { oldBuild: QUIZ_MARKUP });
    try {
      await settle(page);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.evaluate(() => window.__swipers.length), 0);
      assert.equal(await page.evaluate(() => window.__observed.length), 0);
      assert.equal(await page.locator(".page-wrapper.cc-paid-old").count(), 1);
    } finally {
      await context.close();
    }
  });

  await t.test("slider present: one Swiper on .tinyflow-slider, observed, autoplay started once in view", async () => {
    const { page, context, pageErrors } = await open(browser, {
      oldBuild: SLIDER_MARKUP + QUIZ_MARKUP,
    });
    try {
      await settle(page);
      assert.deepEqual(pageErrors, []);
      const state = await page.evaluate(() => ({
        swipers: window.__swipers.length,
        elIsSlider: window.__swipers[0] && window.__swipers[0].el === document.querySelector(".tinyflow-slider"),
        backref: !!document.querySelector(".tinyflow-slider").swiper,
        observedSlider: window.__observed.length === 1 && window.__observed[0] === document.querySelector(".tinyflow-slider"),
        autoplayRunning: window.__swipers[0] && window.__swipers[0].autoplay.running,
        triggers: document.querySelectorAll(".tinyflow_profile-trigger").length,
        progressRings: document.querySelectorAll(".tinyflow_profile-progress").length,
      }));
      assert.deepEqual(state, {
        swipers: 1,
        elIsSlider: true,
        backref: true,
        observedSlider: true,
        autoplayRunning: true, // fixture slider is in the viewport, so the observer started it
        triggers: 2,
        progressRings: 2,
      });
    } finally {
      await context.close();
    }
  });

  await t.test("re-running the slider block does not initialise a second Swiper", async () => {
    const { page, context, pageErrors } = await open(browser, { oldBuild: SLIDER_MARKUP });
    try {
      await settle(page);
      await page.addScriptTag({ content: SLIDER });
      await settle(page);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.evaluate(() => window.__swipers.length), 1);
      assert.equal(await page.evaluate(() => window.__observed.length), 1);
    } finally {
      await context.close();
    }
  });

  await t.test("both builds: hidden build removed first, slider initialised in the surviving build", async () => {
    const { page, context, pageErrors } = await open(browser, {
      oldBuild: SLIDER_MARKUP + QUIZ_MARKUP,
      newBuild: SLIDER_MARKUP + QUIZ_MARKUP,
    });
    try {
      await settle(page);
      assert.deepEqual(pageErrors, []);
      const state = await page.evaluate(() => ({
        builds: document.querySelectorAll(".page-wrapper").length,
        survivor: document.querySelector(".page-wrapper").className,
        swipers: window.__swipers.length,
        swiperInSurvivor: !!window.__swipers[0] && !!window.__swipers[0].el.closest(".cc-paid-old"),
        steps: document.querySelectorAll('[data-form="step"]').length,
        vendorLoads: window.__vendorLoads || 0,
      }));
      assert.deepEqual(state, {
        builds: 1,
        survivor: "page-wrapper cc-paid-old",
        swipers: 1,
        swiperInSurvivor: true,
        steps: 2,
        vendorLoads: 1,
      });
    } finally {
      await context.close();
    }
  });

  await t.test("vendor multi-step.js loads exactly once when a quiz exists", async () => {
    const { page, context, pageErrors } = await open(browser, { oldBuild: QUIZ_MARKUP });
    try {
      await settle(page);
      await page.addScriptTag({ content: CLEANUP }); // a second copy of the loader block
      await settle(page);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.evaluate(() => window.__vendorLoads || 0), 1);
      assert.equal(
        await page.locator('script[src*="videsigns/webflow-tools"]').count(),
        1,
      );
    } finally {
      await context.close();
    }
  });

  await t.test("vendor multi-step.js is not loaded when the page has no quiz steps", async () => {
    const { page, context, pageErrors } = await open(browser, { oldBuild: "<p>no quiz here</p>" });
    try {
      await settle(page);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.evaluate(() => window.__vendorLoads || 0), 0);
      assert.equal(await page.locator('script[src*="videsigns/webflow-tools"]').count(), 0);
    } finally {
      await context.close();
    }
  });
});
