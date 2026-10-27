// Shared helpers for the page-guard suites (paid-guards, blog-guards).
//
// Everything runs in headless Chromium with every request intercepted:
// repo sources and jQuery are served from local files, the videsigns
// multi-step.js URL is answered with a counting stub, and all other hosts are
// aborted. No real analytics, forms or vendor code are ever reached.
//
// Test-only deps, deliberately NOT recorded in package.json / the lockfile:
//   npm install --no-save jquery@3.5.1 playwright@1.62.1 && npx playwright install chromium

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://www.nourish.com";
const VENDOR_HOST = "cdn.jsdelivr.net";
const VENDOR_PATH = "/gh/videsigns/webflow-tools@latest/multi-step.js";

function resolveTestDep(id) {
  try {
    return require.resolve(id);
  } catch (e) {
    throw new Error(
      id + " not installed. Run: npm install --no-save jquery@3.5.1 playwright@1.62.1",
    );
  }
}

const JQUERY_JS = fs.readFileSync(resolveTestDep("jquery/dist/jquery.min.js"), "utf8");
const readRepoFile = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// Extracts one `<!-- ===== Title ... -->` block's <script> contents from a
// Webflow custom-code mirror (e.g. paid.html): the first <script>…</script>
// after the marker. Throws if the marker or the script is missing so a
// renamed block fails loudly instead of testing nothing.
function scriptBlock(html, marker) {
  const at = html.indexOf(marker);
  if (at === -1) throw new Error("block marker not found: " + marker);
  const open = html.indexOf("<script>", at);
  const close = html.indexOf("</script>", open);
  if (open === -1 || close === -1) throw new Error("no <script> after marker: " + marker);
  return html.slice(open + "<script>".length, close);
}

// Stand-in for the vendor script: records each load, binds nothing.
const VENDOR_STUB = `window.__vendorLoads = (window.__vendorLoads || 0) + 1;`;

// The real vendor script, pinned as a fixture for tests that must exercise
// its actual behaviour. Provenance: fetched from
// https://cdn.jsdelivr.net/gh/videsigns/webflow-tools@latest/multi-step.js on
// 2026-10-20, byte-exact, sha256 recorded in tests/vendor-multistep.test.js.
// Never served to a real page: tests answer the vendor URL with it locally.
const VENDOR_REAL = fs.readFileSync(path.join(__dirname, "fixtures", "videsigns-multi-step.js"), "utf8");

// Minimal Swiper double. Mirrors what the page code relies on: el resolution
// (selector or element), el.swiper back-reference, realIndex, autoplay
// start/stop, and the beforeInit/init callbacks. With no matching element it
// leaves `el` undefined, which is what made the live /paid page throw inside
// IntersectionObserver.observe.
const SWIPER_STUB = `
  window.__swipers = [];
  window.Swiper = function (el, params) {
    params = params || {};
    this.el = typeof el === "string" ? document.querySelector(el) || undefined : el;
    this.params = Object.assign({ speed: 300, autoplay: {} }, params);
    this.realIndex = 0;
    var self = this;
    this.autoplay = {
      running: false,
      start: function () { self.autoplay.running = true; },
      stop: function () { self.autoplay.running = false; },
    };
    this.slideToLoop = function (i) { self.realIndex = i; };
    if (this.el) this.el.swiper = this;
    window.__swipers.push(this);
    var on = params.on || {};
    if (this.el && on.beforeInit) on.beforeInit(this);
    if (this.el && on.init) on.init(this);
  };
  // Record every IntersectionObserver target so tests can assert on it.
  window.__observed = [];
  var RealIO = window.IntersectionObserver;
  window.IntersectionObserver = function (cb, opts) {
    var io = new RealIO(cb, opts);
    var observe = io.observe.bind(io);
    io.observe = function (t) { window.__observed.push(t); return observe(t); };
    return io;
  };
`;

async function openPage(
  browser,
  { pagePath, html, scripts = {}, contextOptions = {}, vendor = VENDOR_STUB },
) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.stack || String(err)));
  // Every request to a host other than the fixture origin is aborted; record
  // them so tests can prove nothing left the sandbox (the vendor phones home).
  const blockedRequests = [];
  const vendorRequests = []; // resource types that hit the vendor URL

  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.host === VENDOR_HOST && url.pathname === VENDOR_PATH) {
      vendorRequests.push(route.request().resourceType());
      return route.fulfill({
        contentType: "application/javascript",
        headers: { "access-control-allow-origin": "*" }, // jsDelivr sends this too
        body: vendor,
      });
    }
    if (url.origin !== ORIGIN) {
      blockedRequests.push(url.href);
      return route.abort();
    }
    if (url.pathname === "/__test__/jquery.js")
      return route.fulfill({ contentType: "application/javascript", body: JQUERY_JS });
    if (url.pathname.startsWith("/__test__/") && scripts[url.pathname])
      return route.fulfill({ contentType: "application/javascript", body: scripts[url.pathname] });
    if (url.pathname === pagePath)
      return route.fulfill({ contentType: "text/html", body: html });
    return route.abort();
  });

  await page.goto(ORIGIN + pagePath, { waitUntil: "load" });
  return { page, context, pageErrors, blockedRequests, vendorRequests };
}

module.exports = {
  ORIGIN,
  VENDOR_STUB,
  VENDOR_REAL,
  SWIPER_STUB,
  readRepoFile,
  scriptBlock,
  openPage,
};
