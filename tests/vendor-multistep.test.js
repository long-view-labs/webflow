// videsigns multi-step.js — behaviour of the REAL vendor script and of the
// loaders in paid.html / blog.js that bring it in.
//
// The vendor fixture is byte-exact: fetched from
// https://cdn.jsdelivr.net/gh/videsigns/webflow-tools@latest/multi-step.js on
// 2026-10-20 (== commit d8cb40eedcd9 on videsigns/webflow-tools main).
// sha256 bcb62d996195d737a8a08848dc813efe9e7486739a03fed86557b08cf5d27b59.
// It is only ever served INSIDE these tests; every other host is aborted.
//
// What the vendor does (verified by de-obfuscating its string table):
//   - binds the quiz from `[data-form="step"]` early (line 90 onward);
//   - its tail (line 3404 to end) builds a "Formly Support" diagnostics panel
//     and, unconditionally, dereferences
//     document.querySelector('form[data-form="multistep"]') at line 3436.
//     The Nourish quiz forms carry data-form="multi-step" (hyphen), so on
//     /paid the steps are wired first and then the tail throws.
//   - switching the markup to "multistep" would also enable dormant vendor
//     paths (container .submit(), change listeners that persist every input
//     to localStorage, post-submit reset), so the attribute is NOT changed.
// Loader behaviour under test (paid.html, blog.js): load the vendor only when
// `[data-form="step"]` exists, and only once. The tail exception on a page
// that does have a quiz is NOT repaired here: see the owner report — the
// options (attribute rename, older pin, eval shim, fork) were each rejected.
//
// Usage: node --test tests/vendor-multistep.test.js

const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { chromium } = require("playwright");
const { VENDOR_REAL, SWIPER_STUB, readRepoFile, scriptBlock, openPage } = require("./_harness");

const EXPECTED_SHA256 = "bcb62d996195d737a8a08848dc813efe9e7486739a03fed86557b08cf5d27b59";
assert.equal(
  crypto.createHash("sha256").update(VENDOR_REAL).digest("hex"),
  EXPECTED_SHA256,
  "vendor fixture changed; re-verify its behaviour before updating the hash",
);

const PAID = readRepoFile("paid.html");
const HELPERS = scriptBlock(PAID, "<!-- ===== Shared init helpers");
const CLEANUP = scriptBlock(PAID, "<!-- ===== retired-build cleanup + multi-step loader");
const BLOG_JS = readRepoFile("blog.js");
const VENDOR_URL = "https://cdn.jsdelivr.net/gh/videsigns/webflow-tools@latest/multi-step.js";
const TAIL_ERROR = "Cannot read properties of null (reading 'querySelectorAll')";

// Live /paid quiz shape (attributes copied from the published form).
const quiz = (attr) => `
  <form method="get" data-form="${attr}" data-weighted-selection-range="true" name="wf-form-Insurance-Check" data-name="Insurance Check" data-enter="true" data-weighted-selection="true" id="wf-form-Insurance-Check">
    <div data-form="step" id="s1"><label><input type="radio" name="q1" value="a" required> A</label><a data-form="next-btn" href="#" id="n1">Next</a></div>
    <div data-form="step" id="s2"><input type="text" name="zip" required><a data-form="back-btn" href="#">Back</a><a data-form="next-btn" href="#" id="n2">Next</a></div>
    <div data-form="step" id="s3"><input type="email" name="email" required><input type="submit" data-form="submit-btn" value="Submit" id="sub"></div>
    <div data-form="custom-progress-indicator"></div>
  </form>`;
const LIVE_QUIZ = quiz("multi-step");

const rawScriptTag = `<script src="${VENDOR_URL}"></script>`;

const page = (body, tail = "") =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body>
<div class="page-wrapper cc-paid-old">${body}</div>
<script src="/__test__/jquery.js"></script>
<script>${SWIPER_STUB}</script>
${tail}
</body></html>`;

const wiring = () => ({
  steps: Array.from(document.querySelectorAll('[data-form="step"]')).map((s) => getComputedStyle(s).display),
  nextStyles: Array.from(document.querySelectorAll('[data-form="next-btn"]')).map((n) => n.getAttribute("style")),
  stepCount: document.querySelectorAll('[data-form="step"]').length,
  submitCount: document.querySelectorAll('[data-form="submit-btn"]').length,
});
const WIRED = {
  steps: ["block", "none", "none"],
  nextStyles: ["pointer-events: none; opacity: 0.4;", "pointer-events: none; opacity: 0.4;"],
  stepCount: 3,
  submitCount: 1,
};

async function advanceToStep2(p) {
  await p.evaluate(() => document.querySelector('input[name="q1"]').click());
  await p.waitForTimeout(600); // vendor's radio auto-advance delay window
  await p.evaluate(() => document.getElementById("n1").click());
  await p.waitForTimeout(150);
  return p.evaluate(() => Array.from(document.querySelectorAll('[data-form="step"]')).map((s) => getComputedStyle(s).display));
}

test("videsigns multi-step.js", async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  await t.test("raw vendor, no form at all: throws at its tail and wires nothing", async () => {
    const { page: p, context, pageErrors, blockedRequests } = await openPage(browser, {
      pagePath: "/x", html: page("<p>no quiz</p>", rawScriptTag), vendor: VENDOR_REAL,
    });
    try {
      await p.waitForTimeout(300);
      assert.equal(pageErrors.length, 1);
      assert.ok(pageErrors[0].includes(TAIL_ERROR), pageErrors[0]);
      assert.ok(blockedRequests.some((u) => u.includes("videsigns-staging.co.uk")), "vendor phone-home was blocked");
    } finally {
      await context.close();
    }
  });

  await t.test("raw vendor, live-shaped multi-step form: steps wired, then the tail throws", async () => {
    const { page: p, context, pageErrors } = await openPage(browser, {
      pagePath: "/x", html: page(LIVE_QUIZ, rawScriptTag), vendor: VENDOR_REAL,
    });
    try {
      await p.waitForTimeout(300);
      assert.deepEqual(await p.evaluate(wiring), WIRED);
      assert.equal(pageErrors.length, 1);
      assert.ok(pageErrors[0].includes(TAIL_ERROR));
      assert.deepEqual(await advanceToStep2(p), ["none", "block", "none"]);
    } finally {
      await context.close();
    }
  });

  await t.test("raw vendor, well-formed multistep markup: clean (documents the vendor contract)", async () => {
    const { page: p, context, pageErrors } = await openPage(browser, {
      pagePath: "/x", html: page(quiz("multistep"), rawScriptTag), vendor: VENDOR_REAL,
    });
    try {
      await p.waitForTimeout(300);
      assert.deepEqual(pageErrors, []);
      assert.deepEqual(await p.evaluate(wiring), WIRED);
    } finally {
      await context.close();
    }
  });

  await t.test("paid.html loader + real vendor, live quiz: loaded once, quiz wired, only the vendor tail error remains", async () => {
    const { page: p, context, pageErrors, vendorRequests, blockedRequests } = await openPage(browser, {
      pagePath: "/paid",
      html: page(LIVE_QUIZ, `<script>${HELPERS}</script><script>${CLEANUP}</script>`),
      vendor: VENDOR_REAL,
    });
    try {
      await p.waitForTimeout(500);
      assert.deepEqual(await p.evaluate(wiring), WIRED);
      assert.deepEqual(await advanceToStep2(p), ["none", "block", "none"]);
      assert.deepEqual(vendorRequests, ["script"], "vendor loaded once, as a script");
      assert.equal(pageErrors.length, 1, "exactly one error: the vendor tail");
      assert.ok(pageErrors[0].includes(TAIL_ERROR), pageErrors[0]);
      assert.ok(blockedRequests.some((u) => u.includes("videsigns-staging.co.uk")));
    } finally {
      await context.close();
    }
  });

  await t.test("paid.html loader run twice: one script tag, no let-redeclaration error, quiz still wired", async () => {
    const { page: p, context, pageErrors, vendorRequests } = await openPage(browser, {
      pagePath: "/paid",
      html: page(LIVE_QUIZ, `<script>${HELPERS}</script><script>${CLEANUP}</script>`),
      vendor: VENDOR_REAL,
    });
    try {
      await p.waitForTimeout(400);
      await p.addScriptTag({ content: CLEANUP });
      await p.waitForTimeout(400);
      assert.deepEqual(vendorRequests, ["script"]);
      assert.equal(await p.locator('script[src*="videsigns/webflow-tools"]').count(), 1);
      assert.equal(pageErrors.length, 1, "still only the vendor tail error, no 'already been declared'");
      assert.ok(pageErrors[0].includes(TAIL_ERROR));
      assert.deepEqual(await p.evaluate(wiring), WIRED);
    } finally {
      await context.close();
    }
  });

  await t.test("blog.js loader + real vendor: quiz article loaded once and wired (tail error remains); plain article never loads it", async () => {
    const withQuiz = await openPage(browser, {
      pagePath: "/blog/quiz-post",
      html: page(LIVE_QUIZ, `<script src="/__test__/blog.js"></script>`),
      scripts: { "/__test__/blog.js": BLOG_JS },
      vendor: VENDOR_REAL,
    });
    try {
      await withQuiz.page.waitForTimeout(1000); // blog.js defers the load by 500ms
      assert.deepEqual(await withQuiz.page.evaluate(wiring), WIRED);
      assert.deepEqual(withQuiz.vendorRequests, ["script"]);
      assert.equal(withQuiz.pageErrors.length, 1);
      assert.ok(withQuiz.pageErrors[0].includes(TAIL_ERROR));
    } finally {
      await withQuiz.context.close();
    }

    const noQuiz = await openPage(browser, {
      pagePath: "/blog/plain-post",
      html: page(`<div class="blog-post-rtb"><p>text</p></div>`, `<script src="/__test__/blog.js"></script>`),
      scripts: { "/__test__/blog.js": BLOG_JS },
      vendor: VENDOR_REAL,
    });
    try {
      await noQuiz.page.waitForTimeout(1000);
      assert.deepEqual(noQuiz.pageErrors, []);
      assert.deepEqual(noQuiz.vendorRequests, []);
    } finally {
      await noQuiz.context.close();
    }
  });
});
