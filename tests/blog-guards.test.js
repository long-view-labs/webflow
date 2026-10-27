// blog.js guards (loaded by the blog post template; live pin v2.594 == HEAD).
//
// Runs the real blog.js against article fixtures. The live article template
// has none of #blog-category, #an-tag or .rich-text_splash, so the category
// code must stay silent there, and it has no quiz form, so the videsigns
// multi-step.js must not be loaded (the vendor throws at top level when its
// form is missing). Pages that do carry those elements must keep working.
// Vendor URL answered by a counting stub; nothing reaches the network.
//
// Usage: node --test tests/blog-guards.test.js

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { SWIPER_STUB, readRepoFile, openPage } = require("./_harness");

const BLOG_JS = readRepoFile("blog.js");
const PAGE = "/blog/some-article";

function fixtureHtml(body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Article</title></head><body>
<div class="page-wrapper">${body}</div>
<script src="/__test__/jquery.js"></script>
<script>${SWIPER_STUB}</script>
<script src="/__test__/blog.js"></script>
</body></html>`;
}

const open = (browser, body) =>
  openPage(browser, {
    pagePath: PAGE,
    html: fixtureHtml(body),
    scripts: { "/__test__/blog.js": BLOG_JS },
  });

// blog.js schedules the vendor load 500ms after parse; wait past it.
const afterLoaderWindow = (page) => page.waitForTimeout(900);

const CATEGORY_MARKUP = `
  <span id="blog-category">Eating disorders</span>
  <p>Read <span id="an-tag">a</span> guide</p>
  <div class="rich-text_splash">Read a {category} guide</div>`;

test("blog.js page guards", async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  await t.test("bare article template (no category, splash, rtb or quiz): no errors, no vendor load", async () => {
    const { page, context, pageErrors } = await open(browser, "<h1>Article</h1><p>body</p>");
    try {
      await afterLoaderWindow(page);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.evaluate(() => window.__vendorLoads || 0), 0);
    } finally {
      await context.close();
    }
  });

  await t.test("live-shaped article (.blog-post-rtb only): no errors", async () => {
    const { page, context, pageErrors } = await open(
      browser,
      `<div class="blog-post-rtb"><p>Plain article body</p></div>`,
    );
    try {
      await afterLoaderWindow(page);
      assert.deepEqual(pageErrors, []);
    } finally {
      await context.close();
    }
  });

  await t.test("category starting with a vowel still updates #an-tag and the splash placeholder", async () => {
    const { page, context, pageErrors } = await open(browser, CATEGORY_MARKUP);
    try {
      await afterLoaderWindow(page);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.textContent("#an-tag"), "an");
      assert.equal(
        (await page.textContent(".rich-text_splash")).trim(),
        "Read an eating disorders guide",
      );
    } finally {
      await context.close();
    }
  });

  await t.test("category only, no splash element: #an-tag updated, no errors", async () => {
    const { page, context, pageErrors } = await open(
      browser,
      `<span id="blog-category">Autoimmune</span><span id="an-tag">a</span>`,
    );
    try {
      await afterLoaderWindow(page);
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.textContent("#an-tag"), "an");
    } finally {
      await context.close();
    }
  });

  await t.test("vendor multi-step.js loads once when quiz steps exist, including steps inserted before the timer fires", async () => {
    const withSteps = await open(
      browser,
      `<form data-form="multi-step"><div data-form="step"></div><div data-form="step"></div></form>`,
    );
    try {
      await afterLoaderWindow(withSteps.page);
      assert.deepEqual(withSteps.pageErrors, []);
      assert.equal(await withSteps.page.evaluate(() => window.__vendorLoads || 0), 1);
      assert.equal(
        await withSteps.page.locator('script[src*="videsigns/webflow-tools"]').count(),
        1,
      );
    } finally {
      await withSteps.context.close();
    }

    const dynamic = await open(browser, "<div id='late'></div>");
    try {
      await dynamic.page.evaluate(() => {
        document.getElementById("late").innerHTML =
          '<form data-form="multi-step"><div data-form="step"></div></form>';
      });
      await afterLoaderWindow(dynamic.page);
      assert.deepEqual(dynamic.pageErrors, []);
      assert.equal(await dynamic.page.evaluate(() => window.__vendorLoads || 0), 1);
    } finally {
      await dynamic.context.close();
    }
  });
});
