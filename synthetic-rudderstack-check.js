// Synthetic check: RudderStack must capture page views for NON-INTERACTING
// visitors. Guards against the Aug 2026 regression where the SDK download was
// deferred to first-interaction and Viewed Page events were lost for
// quick-bounce visitors.
//
// Loads the live homepage in headless Chrome, performs ZERO interaction, and
// within TIMEOUT_MS asserts that:
//   1. the RudderStack SDK (rsa.min.js) was requested,
//   2. the stub queue was replaced by the live SDK (window.rudderanalytics is
//      no longer a plain array), and
//   3. a page call was POSTed to the dataplane proxy.
//
// NOTE: assumes the OneTrust config allows pre-consent page events (current
// behavior). If consent gating changes to block them, update assertion 3.
//
// Usage: node synthetic-rudderstack-check.js [url]
// Requires: npm i playwright && npx playwright install chromium

const { chromium } = require("playwright");

const URL = process.argv[2] || "https://www.nourish.com/?synthcheck=" + Date.now();
// Budget starts AFTER the load event. Must stay well under 10s: the Aug 2026
// regression loaded the SDK on a 10s post-load fallback, so a longer window
// would let that exact bug pass. Healthy behavior completes in ~2-3s.
const TIMEOUT_MS = 6000;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let sdkRequested = false;
  let pageCallSent = false;

  page.on("request", (req) => {
    const u = req.url();
    if (u.includes("rsa.min.js")) sdkRequested = true;
    if (u.includes("dataplane-proxy.") && /\/v1\/(page|batch)/.test(u)) {
      pageCallSent = true;
    }
  });

  await page.goto(URL, { waitUntil: "load", timeout: 60000 });

  // Wait WITHOUT interacting — this is the whole point of the check.
  const deadline = Date.now() + TIMEOUT_MS;
  let sdkActive = false;
  while (Date.now() < deadline) {
    sdkActive = await page.evaluate(
      () => !!window.rudderanalytics && !Array.isArray(window.rudderanalytics),
    );
    if (sdkRequested && sdkActive && pageCallSent) break;
    await page.waitForTimeout(500);
  }

  await browser.close();

  const results = {
    url: URL,
    sdkRequested,
    sdkActive,
    pageCallSent,
  };
  console.log(JSON.stringify(results, null, 2));

  const failures = Object.entries(results)
    .filter(([k, v]) => k !== "url" && !v)
    .map(([k]) => k);

  if (failures.length) {
    console.error(
      "SYNTHETIC CHECK FAILED — RudderStack page views may be dropping for " +
        "non-interacting visitors. Failed assertions: " +
        failures.join(", "),
    );
    process.exit(1);
  }
  console.log("OK: RudderStack captures page views with zero interaction.");
})();
