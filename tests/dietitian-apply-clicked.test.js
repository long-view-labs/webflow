// "Dietitian Apply Clicked" — attribute-driven click tracking for the Apply
// now CTAs on /become-a-dietitian (global.js section 8).
//
// Runs global.js in headless Chromium against a fixture that mirrors the live
// page's four Apply now anchors (hero, earnings, platform, footer splash),
// annotated with the data-cta-* contract Webflow will carry, plus a few
// non-Apply links. Everything is served from local files via Playwright route
// interception — nothing reaches the network, and the RudderStack SDK is
// replaced by the same stub-array shape the global footer installs (or a fake
// live SDK object), so no real analytics events are sent.
//
// Test-only deps, deliberately NOT recorded in package.json / the lockfile
// (install into node_modules only):
//   npm install --no-save jquery@3.5.1 playwright@1.62.1 && npx playwright install chromium
// Usage:
//   node --test tests/dietitian-apply-clicked.test.js

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, devices } = require("playwright");

const ORIGIN = "https://www.nourish.com";
const PAGE_PATH = "/become-a-dietitian";
const EVENT = "Dietitian Apply Clicked";

const GLOBAL_JS = fs.readFileSync(path.join(__dirname, "..", "global.js"), "utf8");
// Section 8 (the IIFE that binds the click handlers) on its own, so the
// idempotence test can run it a second time. Loading all of global.js twice is
// not an option: its top-level `const` declarations throw on redeclaration
// before any listener is bound, which would make that test vacuous.
const SECTION_8_JS = GLOBAL_JS.slice(GLOBAL_JS.indexOf('// 8. "GET STARTED" TRACKING'));
if (!SECTION_8_JS.includes("Dietitian Apply Clicked")) {
  throw new Error("could not locate global.js section 8 for the re-init test");
}
const JQUERY_JS = fs.readFileSync(resolveTestDep("jquery/dist/jquery.min.js"), "utf8");

function resolveTestDep(id) {
  try {
    return require.resolve(id);
  } catch (e) {
    throw new Error(
      id + " not installed. Run: npm install --no-save jquery@3.5.1 playwright@1.62.1",
    );
  }
}

// Attribute contract (Webflow carries these on each anchor). One allowlisted
// action; ids / locations are fixed per CTA; names are human-readable.
const CONTRACT = {
  hero: { id: "dietitian-apply-hero", name: "Dietitian apply - Hero", location: "hero" },
  earnings: {
    id: "dietitian-apply-earnings",
    name: "Dietitian apply - Earnings calculator",
    location: "earnings",
  },
  platform: { id: "dietitian-apply-platform", name: "Dietitian apply - Platform", location: "platform" },
  footer: { id: "dietitian-apply-footer", name: "Dietitian apply - Footer", location: "footer" },
};

function attrs(key, overrides = {}) {
  const c = { action: "apply-dietitian", ...CONTRACT[key], ...overrides };
  return Object.entries({
    "data-cta-action": c.action,
    "data-cta-id": c.id,
    "data-cta-name": c.name,
    "data-cta-location": c.location,
  })
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}

// Markup copied from the live page (Oct 2026) plus the contract attributes.
// Keep in sync when the Webflow markup changes.
const APPLY_CTAS = {
  hero: `<a ${attrs("hero")} data-wf--button--variant="brand" href="/dietitian-application" class="btn is-round is-icon w-inline-block"><div>Apply now</div></a>`,
  earnings: `<a ${attrs("earnings")} data-wf--button--variant="white" href="/become-a-dietitian/pay-calculator" class="btn is-round is-icon w-variant-86e5b5d2-ae85-7df2-4a3d-450cfdef57d8 w-inline-block"><div>Apply now</div></a>`,
  platform: `<a ${attrs("platform")} data-wf--button--variant="brand" href="/dietitian-application" class="btn is-round is-icon w-inline-block"><div>Apply now</div></a>`,
  footer: `<a ${attrs("footer")} id="footer-splash-cta" data-cta="footer" href="/dietitian-application" class="btn is-round is-white w-button">Apply now</a>`,
};

function fixtureHtml({ sdkMode }) {
  // sdkMode: "stub"     = the pre-load queue array from global-footer.html;
  //          "live"     = an object with track()/page(), as after rsa.min.js loads;
  //          "none"     = SDK never installed (blocked by an extension, etc.);
  //          "throwing" = a live SDK whose track() throws.
  const sdk =
    sdkMode === "live"
      ? `window.__liveTracks = [];
         window.rudderanalytics = {
           track: function (name, props, options) { window.__liveTracks.push({ event: name, props: props, options: options }); },
           page: function () {}
         };`
      : sdkMode === "none"
      ? `window.__liveTracks = [];`
      : sdkMode === "throwing"
      ? `window.__liveTracks = [];
         window.rudderanalytics = {
           track: function () { throw new Error("SDK exploded"); },
           page: function () {}
         };`
      : `!(function () {
           var e = (window.rudderanalytics = window.rudderanalytics || []);
           e.methods = ["load","page","track","identify","alias","group","ready","reset","getAnonymousId","setAnonymousId","getUserId","getUserTraits","getGroupId","getGroupTraits","startSession","endSession","getSessionId"];
           e.factory = function (t) { return function () { e.push([t].concat(Array.prototype.slice.call(arguments))); }; };
           for (var t = 0; t < e.methods.length; t++) { e[e.methods[t]] = e.factory(e.methods[t]); }
           e.page();
         })();`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Become a dietitian</title></head><body>
<nav><a id="mobile-nav-open-getstarted" data-cta="nav" href="https://signup.nourish.com" target="_blank" class="btn is-round is-nav is-dropdown w-button">Get started</a></nav>
<main>
  <section class="section_hero-2col"><div class="button-group">
    ${APPLY_CTAS.hero}
    <a data-wf--button--variant="white" href="/about" class="btn is-round is-icon w-inline-block"><div>About Nourish</div><div class="btn-arrow w-embed"><svg viewBox="0 0 16 16"></svg></div></a>
  </div></section>
  <section class="section_rd-app">
    ${APPLY_CTAS.earnings}
    <a id="rd-app-calc" data-wf--button--variant="brand" href="#" class="btn is-round is-icon w-inline-block"><div>Estimate your pay</div></a>
  </section>
  <section class="section_3col-cards">${APPLY_CTAS.platform}</section>
</main>
<footer id="footer"><div class="cta-splash_button-row">${APPLY_CTAS.footer}</div></footer>
<div id="extra"></div>
<script>
  window.__nourish_apex = "nourish.com";
  ${sdk}
  window.__trackCalls = function () {
    var ra = window.rudderanalytics;
    if (Array.isArray(ra)) {
      return ra.filter(function (e) { return e[0] === "track"; })
               .map(function (e) { return { event: e[1], props: e[2], options: e[3] }; });
    }
    return window.__liveTracks || [];
  };
  // Runs after the document-level handlers (bubble reaches window last):
  // records whether anything upstream cancelled navigation, then stops the
  // test page from actually navigating away.
  window.__clicks = [];
  window.addEventListener("click", function (e) {
    window.__clicks.push({ defaultPrevented: e.defaultPrevented });
    e.preventDefault();
  });
</script>
<script src="/__test__/jquery.js"></script>
<script defer src="/__test__/global.js"></script>
</body></html>`;
}

async function openPage(
  browser,
  { pagePath = PAGE_PATH, sdkMode = "stub", contextOptions = {} } = {},
) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.stack || String(err)));

  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    if (url.pathname === "/__test__/jquery.js")
      return route.fulfill({ contentType: "application/javascript", body: JQUERY_JS });
    if (url.pathname === "/__test__/global.js")
      return route.fulfill({ contentType: "application/javascript", body: GLOBAL_JS });
    if (url.pathname === pagePath)
      return route.fulfill({ contentType: "text/html", body: fixtureHtml({ sdkMode }) });
    return route.abort();
  });

  await page.goto(ORIGIN + pagePath, { waitUntil: "load" });
  return { page, context, pageErrors };
}

const applyEvents = (page) =>
  page.evaluate((name) => window.__trackCalls().filter((c) => c.event === name), EVENT);

const clickFirst = (page, selector) => page.locator(selector).first().click();

// Append an anchor to #extra and return a selector for it.
async function insertAnchor(page, html) {
  await page.evaluate((h) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = h;
    document.getElementById("extra").appendChild(wrap);
  }, html);
  return "#extra a >> nth=-1";
}

function expectedProps(key, { destinationPath, pagePath = PAGE_PATH, element }) {
  const c = CONTRACT[key];
  return {
    location: pagePath,
    element,
    "cta copy": c.name,
    url: ORIGIN + destinationPath,
    deviceType: "desktop",
    cta_id: c.id,
    cta_name: c.name,
    cta_location: c.location,
    cta_action: "apply-dietitian",
    page_path: pagePath,
    destination_host: "www.nourish.com",
    destination_path: destinationPath,
    locale: "en",
  };
}

const SCHEMA_KEYS = Object.keys(expectedProps("hero", { destinationPath: "/x", element: "" }));
const pickSchema = (props) => pick(props, SCHEMA_KEYS);

test("Dietitian Apply Clicked", async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  for (const sdkMode of ["stub", "live"]) {
    await t.test(`fires once per click for each annotated CTA with the full schema (sdk: ${sdkMode})`, async () => {
      const { page, context, pageErrors } = await openPage(browser, { sdkMode });
      try {
        await clickFirst(page, "[data-cta-id=dietitian-apply-hero]");
        await clickFirst(page, "[data-cta-id=dietitian-apply-earnings]");
        await clickFirst(page, "[data-cta-id=dietitian-apply-platform]");
        await clickFirst(page, "[data-cta-id=dietitian-apply-footer]");

        const events = await applyEvents(page);
        assert.equal(events.length, 4, "one event per CTA click");
        assert.deepEqual(events.map((e) => pickSchema(e.props)), [
          expectedProps("hero", {
            destinationPath: "/dietitian-application",
            element: ".btn.is-round.is-icon.w-inline-block",
          }),
          expectedProps("earnings", {
            destinationPath: "/become-a-dietitian/pay-calculator",
            element: ".btn.is-round.is-icon.w-variant-86e5b5d2-ae85-7df2-4a3d-450cfdef57d8.w-inline-block",
          }),
          expectedProps("platform", {
            destinationPath: "/dietitian-application",
            element: ".btn.is-round.is-icon.w-inline-block",
          }),
          expectedProps("footer", { destinationPath: "/dietitian-application", element: "footer" }),
        ]);
        assert.deepEqual(pageErrors, []);
      } finally {
        await context.close();
      }
    });
  }

  await t.test("does not fire for non-Apply links, and Get Started Clicked keeps count parity", async () => {
    const { page, context } = await openPage(browser);
    try {
      await page.locator("a:has-text('About Nourish')").click();
      await page.locator("#rd-app-calc").click();
      await page.locator("#mobile-nav-open-getstarted").click();
      // A dietitian contract on a patient destination is a mapping error: it is
      // counted by destination, flagged invalid-contract, never as a dietitian event.
      const sel = await insertAnchor(
        page,
        `<a ${attrs("hero")} href="https://signup.nourish.com/">Apply now</a>`,
      );
      await clickFirst(page, sel);

      assert.deepEqual(await applyEvents(page), []);
      let getStarted = await page.evaluate(() =>
        window.__trackCalls().filter((c) => c.event === "Get Started Clicked"),
      );
      assert.equal(getStarted.length, 2, "nav signup click plus the flagged mapping error");
      assert.equal(getStarted[1].props.cta_mapping_status, "invalid-contract");
      assert.equal(getStarted[1].props.cta_id, "patient-signup-unmapped");
      const patient = await insertAnchor(page,
        '<a data-cta-id="patient-signup-content" data-cta-name="Start signup" data-cta-location="content" data-cta-section="intro" data-cta-action="direct-signup" data-cta-version="2" href="https://signup.nourish.com/">Start signup</a>');
      await page.locator(patient).press("Enter");
      getStarted = await page.evaluate(() => window.__trackCalls().filter(c => c.event === "Get Started Clicked"));
      assert.equal(getStarted.length, 3, "plus one valid keyboard-activated patient CTA");
      assert.equal(getStarted[2].props.cta_mapping_status, "explicit");
      assert.deepEqual(await applyEvents(page), []);
    } finally {
      await context.close();
    }
  });

  await t.test("directory redirect emits once with safe context and unchanged href", async () => {
    const { page, context, pageErrors } = await openPage(browser, { pagePath: "/", sdkMode: "live" });
    try {
      const href = "/find-a-provider?email=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE";
      await page.evaluate(() => {
        document.body.setAttribute("data-page-version", "2");
      });
      const sel = await insertAnchor(page, `<a data-cta-id="patient-directory-content" data-cta-name="Find a dietitian" data-cta-location="content" data-cta-section="provider_directory" data-cta-action="directory-navigation" data-cta-version="2" href="${href}"><span>Find a dietitian</span></a>`);
      await page.locator(sel).locator("span").click();
      const events = await page.evaluate(() => window.__trackCalls().filter(c => c.event !== "Viewed Page"));
      assert.equal(events.length, 1);
      assert.equal(events[0].event, "Dietitian Directory Clicked");
      assert.equal(Object.hasOwn(events[0].props, "page_name"), false);
      assert.equal(events[0].props.page_path, "/");
      assert.equal(events[0].props.page_version, "2");
      assert.equal(events[0].props.cta_version, "2");
      assert.equal(events[0].props.release_version, "cta-cleanup-2026-10-26-1");
      assert.equal(events[0].props.destination_path, "/find-a-provider");
      assert.equal(await page.locator(sel).getAttribute("href"), href);
      assert.ok(!JSON.stringify(events).includes("SYNTHETIC_PRIVATE"));
      assert.deepEqual(await page.evaluate(() => window.__clicks), [{ defaultPrevented: false }]);
      assert.deepEqual(pageErrors, []);
    } finally { await context.close(); }
  });

  await t.test("partial patient attributes are counted as invalid; unreviewed signup origins emit nothing", async () => {
    const { page, context } = await openPage(browser);
    try {
      for (const html of [
        '<a data-cta-id="" data-cta="nav" href="https://signup.nourish.com/">Start</a>',
        '<a data-cta-name="Start signup" href="https://signup.nourish.com/">Start</a>',
        '<a data-cta="nav" href="https://signup.nourish.com:444/">Start</a>',
        '<a data-cta="nav" href="http://signup.nourish.com/">Start</a>',
        '<a data-cta="nav" href="https://signup.nourish.com/your-privacy-choices">Privacy</a>',
      ]) await clickFirst(page, await insertAnchor(page, html));
      const events = await page.evaluate(() => window.__trackCalls().filter(c => c.event !== "Viewed Page"));
      assert.deepEqual(events.map(e => [e.event, e.props.cta_mapping_status, e.props.cta_id]), [
        ["Get Started Clicked", "invalid-contract", "patient-signup-unmapped"],
        ["Get Started Clicked", "invalid-contract", "patient-signup-unmapped"],
      ]);
    } finally { await context.close(); }
  });

  await t.test("explicit dietitian section and revisions preserve legacy placement", async () => {
    const { page, context } = await openPage(browser);
    try {
      await page.locator('[data-cta-id="dietitian-apply-hero"]').evaluate(a => {
        a.setAttribute("data-cta-section", "employment_intro");
        a.setAttribute("data-cta-version", "3");
      });
      await clickFirst(page, '[data-cta-id="dietitian-apply-hero"]');
      const [event] = await applyEvents(page);
      assert.equal(event.props.cta_id, "dietitian-apply-hero");
      assert.equal(event.props.cta_location, "hero");
      assert.equal(event.props.cta_section, "employment_intro");
      assert.equal(event.props.cta_version, "3");
    } finally { await context.close(); }
  });

  await t.test("does not fire on other pages", async () => {
    const { page, context } = await openPage(browser, { pagePath: "/careers" });
    try {
      await clickFirst(page, "[data-cta-id=dietitian-apply-hero]");
      await clickFirst(page, "[data-cta-id=dietitian-apply-footer]");
      assert.deepEqual(await applyEvents(page), []);
    } finally {
      await context.close();
    }
  });

  await t.test("fires on the trailing-slash route", async () => {
    const { page, context } = await openPage(browser, { pagePath: PAGE_PATH + "/" });
    try {
      await clickFirst(page, "[data-cta-id=dietitian-apply-hero]");
      const events = await applyEvents(page);
      assert.equal(events.length, 1);
      assert.equal(events[0].props.page_path, PAGE_PATH + "/");
    } finally {
      await context.close();
    }
  });

  await t.test("covers a late-inserted CTA clicked on a nested child, on a mobile viewport", async () => {
    const { page, context } = await openPage(browser, {
      contextOptions: { ...devices["iPhone 13"] },
    });
    try {
      await page.evaluate((html) => {
        const wrap = document.createElement("div");
        wrap.id = "late-cta";
        wrap.innerHTML = html;
        document.body.appendChild(wrap);
      }, APPLY_CTAS.hero);
      await page.locator("#late-cta a div").click(); // the inner <div>, not the <a>

      const events = await applyEvents(page);
      assert.equal(events.length, 1);
      assert.equal(events[0].props.cta_id, "dietitian-apply-hero");
      assert.equal(events[0].props.deviceType, "mobile");
    } finally {
      await context.close();
    }
  });

  await t.test("matches on attributes only: translated copy and new classes still fire, bare 'Apply now' does not", async () => {
    const { page, context } = await openPage(browser);
    try {
      const translated = await insertAnchor(
        page,
        `<a ${attrs("platform")} href="/dietitian-application" class="boton nuevo"><span>Solicitar ahora</span></a>`,
      );
      await clickFirst(page, translated);
      const bare = await insertAnchor(
        page,
        `<a href="/dietitian-application" class="btn is-round is-icon w-inline-block"><div>Apply now</div></a>`,
      );
      await clickFirst(page, bare);

      const events = await applyEvents(page);
      assert.equal(events.length, 1);
      assert.equal(events[0].props.cta_id, "dietitian-apply-platform");
      assert.equal(events[0].props["cta copy"], CONTRACT.platform.name, "copy comes from the attribute, not DOM text");
    } finally {
      await context.close();
    }
  });

  await t.test("rejects missing, unknown or malformed contract attributes", async () => {
    const { page, context } = await openPage(browser);
    try {
      const bad = [
        attrs("hero", { action: undefined }),
        attrs("hero", { action: "apply-now" }),
        attrs("hero", { action: "Dietitian Apply Clicked" }),
        attrs("hero", { id: undefined }),
        attrs("hero", { id: "dietitian-apply-sidebar" }),
        attrs("hero", { location: undefined }),
        attrs("hero", { location: "sidebar" }),
        attrs("hero", { name: undefined }),
        attrs("hero", { name: "" }),
        attrs("hero", { name: "x".repeat(121) }),
        attrs("hero", { name: "<script>alert(1)</script>" }),
      ];
      for (const a of bad) {
        const sel = await insertAnchor(page, `<a ${a} href="/dietitian-application">Apply now</a>`);
        await clickFirst(page, sel);
      }
      assert.deepEqual(await applyEvents(page), []);
    } finally {
      await context.close();
    }
  });

  await t.test("ignores non-http(s) hrefs and strips query and hash from the payload", async () => {
    const { page, context } = await openPage(browser);
    try {
      for (const href of ["javascript:void(0)", "mailto:jobs@nourish.com", "tel:+15125551234", "#"]) {
        const sel = await insertAnchor(page, `<a ${attrs("hero")} href="${href}">Apply now</a>`);
        await clickFirst(page, sel);
      }
      assert.deepEqual(await applyEvents(page), [], "no event for non-http(s) or fragment-only hrefs");

      const sel = await insertAnchor(
        page,
        `<a ${attrs("footer")} href="/dietitian-application?email=jane%40example.com&ref=x#step-2">Apply now</a>`,
      );
      await clickFirst(page, sel);
      const events = await applyEvents(page);
      assert.equal(events.length, 1);
      assert.equal(events[0].props.url, ORIGIN + "/dietitian-application");
      assert.equal(events[0].props.destination_path, "/dietitian-application");
      const serialized = JSON.stringify(events[0].props);
      assert.ok(!serialized.includes("email="), "query string never reaches the payload");
      assert.ok(!serialized.includes("step-2"), "hash never reaches the payload");
    } finally {
      await context.close();
    }
  });

  await t.test("leaves navigation alone (no preventDefault, href untouched)", async () => {
    const { page, context } = await openPage(browser);
    try {
      await clickFirst(page, "[data-cta-id=dietitian-apply-footer]");
      assert.equal((await applyEvents(page)).length, 1);

      const clicks = await page.evaluate(() => window.__clicks);
      assert.deepEqual(clicks, [{ defaultPrevented: false }]);
      assert.equal(
        await page.getAttribute("[data-cta-id=dietitian-apply-footer]", "href"),
        "/dietitian-application",
      );
    } finally {
      await context.close();
    }
  });

  await t.test("fires once even if section 8 is initialised twice (idempotence guard)", async () => {
    const { page, context, pageErrors } = await openPage(browser);
    try {
      await page.addScriptTag({ content: SECTION_8_JS });
      await clickFirst(page, "[data-cta-id=dietitian-apply-hero]");
      assert.equal((await applyEvents(page)).length, 1);
      assert.deepEqual(pageErrors, []);
    } finally {
      await context.close();
    }
  });

  for (const sdkMode of ["none", "throwing"]) {
    await t.test(`never blocks navigation or throws when the SDK is ${sdkMode}`, async () => {
      const { page, context, pageErrors } = await openPage(browser, { sdkMode });
      try {
        // A throwing SDK already surfaces one uncaught error at load from the
        // pre-existing "Viewed Page" call (nourishQueueViewedPageEvent, global.js
        // section 6); that is outside this feature and is filtered out below.
        await clickFirst(page, "[data-cta-id=dietitian-apply-hero]");
        await clickFirst(page, "[data-cta-id=dietitian-apply-footer]");

        assert.deepEqual(await applyEvents(page), []);
        assert.deepEqual(await page.evaluate(() => window.__clicks), [
          { defaultPrevented: false },
          { defaultPrevented: false },
        ]);
        assert.deepEqual(
          pageErrors.filter((e) => !e.includes("nourishQueueViewedPageEvent")),
          [],
        );
      } finally {
        await context.close();
      }
    });
  }
});

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}
