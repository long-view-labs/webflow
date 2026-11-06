// Offline Chromium regression harness for WEBFLOW-7E. No production navigation,
// draft creation, analytics delivery, or application submission is permitted.
// Requires the existing test-only Playwright dependency (not a runtime dependency).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium } = require("playwright");

const fixture = path.join(__dirname, "fixtures/finsweet-2.3.59");
const chunk = fs.readFileSync(path.join(fixture, "chunk-M65MOCFB.js"), "utf8");
const entry = fs.readFileSync(path.join(fixture, "fs-components.js"), "utf8");
const origin = "https://fixture.invalid";
const drafts = "https://app.nourish.com/api/provider-job-application/drafts";
const embedded = "https://embed.fixture.invalid/application";
let browser;

before(async () => {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox", "--disable-background-networking"],
  });
});
after(async () => { await browser?.close(); });

async function open(t, { errorMode = "native", application, draftStatus = 200, includeChunk = true } = {}) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  t.after(() => context.close());
  const unexpected = [], draftRequests = [], errors = [];
  // Install the deny-by-default route BEFORE creating/navigating the page.
  // Every allowed response is local. There is deliberately no route.continue().
  await context.route("**/*", async (route) => {
    const request = route.request(), url = request.url();
    const reply = (body, contentType = "application/javascript", status = 200) =>
      route.fulfill({ body, contentType, status, headers: { "access-control-allow-origin": "*" } });
    if (url === origin + "/dietitian-application?source=offline-fixture") {
      return reply(`<!doctype html><html><head><meta charset="utf-8"></head><body>
        <main><div id="gh-app"></div><section id="gh-job"><div id="gh-meta"></div><div id="gh-content"></div></section></main>
        ${includeChunk ? '<script type="module">import {a} from "/chunk.js"; window.__chunkEvaluated = typeof a === "function";</script>' : ""}
        ${application ? '<script defer src="/application.js"></script>' : ""}
        </body></html>`, "text/html");
    }
    if (url === origin + "/chunk.js") return reply(chunk);
    if (url === origin + "/application.js" && application) return reply(application);
    if (url === drafts && request.method() === "POST") {
      draftRequests.push(request.postDataJSON());
      return reply(JSON.stringify({ applicationPublicId: "offline-draft", iframeUrl: embedded }), "application/json", draftStatus);
    }
    if (url.startsWith("https://boards-api.greenhouse.io/v1/boards/usenourish/jobs/4007342008?")) {
      return reply(JSON.stringify({ title: "Offline fixture role", company_name: "Fixture", location: {name: "Remote"}, updated_at: "2026-10-23", content: "<p>Fixture job description</p>" }), "application/json");
    }
    if (url === embedded) return reply("<!doctype html><title>Offline embed stub</title><p>Embed fixture mounted</p>", "text/html");
    unexpected.push({ url, method: request.method() });
    return route.abort("blockedbyclient");
  });
  await context.addInitScript((mode) => {
    // Models a possible incompatible runtime, NOT an established production cause.
    if (mode === "non-extensible-instance") {
      const NativeError = window.Error;
      window.Error = class extends NativeError {
        constructor(...args) { super(...args); Object.preventExtensions(this); }
      };
    } else if (mode === "frozen-prototype") {
      Object.freeze(Error.prototype);
    }
    // Any accidental telemetry call fails locally; no SDK is loaded.
    window.rudderanalytics = { getAnonymousId: () => null,
      track: () => { throw new Error("Unexpected analytics call"); },
      page: () => { throw new Error("Unexpected analytics call"); } };
  }, errorMode);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push({ name: error.name, message: error.message }));
  await page.goto(origin + "/dietitian-application?source=offline-fixture");
  return { page, errors, draftRequests, unexpected };
}

test("pinned upstream fixture integrity and entry's static failing-chunk dependency", () => {
  assert.equal(crypto.createHash("sha256").update(chunk).digest("hex"), "2d760d5a9ae1e9725f83af511b6c12f6899eb132dbdfc3342ef4e5b03562cf8b");
  assert.equal(crypto.createHash("sha256").update(entry).digest("hex"), "8c9f5468438c093363f2767385f3e0e514e01b37ed78cd9fa0d17b7b2b60cef5");
  assert.match(entry, /import\{a as L\}from"\.\/dist\/chunk-M65MOCFB\.js"/);
  assert.match(chunk, /new class extends Error\{name="StaleReactionError"/);
});

for (const mode of ["native", "frozen-prototype"]) {
  test(`the exact upstream chunk imports with ${mode} Error`, async t => {
    const result = await open(t, { errorMode: mode });
    await result.page.waitForFunction(() => window.__chunkEvaluated === true);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.draftRequests, []);
    assert.deepEqual(result.unexpected, []);
  });
}

test("the exact upstream chunk reproduces the reported TypeError with a non-extensible Error instance", async t => {
  const result = await open(t, { errorMode: "non-extensible-instance" });
  await result.page.waitForFunction(() => document.readyState === "complete");
  assert.deepEqual(result.errors, [{name: "TypeError", message: "Cannot define property name, object is not extensible"}]);
  assert.equal(await result.page.evaluate(() => window.__chunkEvaluated), undefined);
  assert.deepEqual(result.draftRequests, []);
  assert.deepEqual(result.unexpected, []);
});

const applications = {
  "production v2.620.42": fs.readFileSync(path.join(fixture, "dietitian-application-v2.620.42.js"), "utf8"),
  "repository source": fs.readFileSync(path.join(__dirname, "../dietitian-application-final.js"), "utf8"),
};
for (const [version, application] of Object.entries(applications)) {
  test(`${version}: application and its job accordion do not need the Finsweet chunk in the minimal fixture`, async t => {
    const result = await open(t, { application, includeChunk: false });
    await result.page.locator("#gh-app iframe").waitFor();
    const toggle = result.page.getByRole("button", {name: "Job description"});
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.equal(await result.page.evaluate(() => typeof window.fsComponents), "undefined");
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.unexpected, []);
  });
  for (const mode of ["native", "non-extensible-instance"]) {
    test(`${version}: mocked draft, embed and job accordion work with ${mode} Error`, async t => {
      const result = await open(t, { errorMode: mode, application });
      const { page } = result;
      await page.locator('#gh-app iframe[title="Nourish provider application"]').waitFor();
      assert.equal(await page.locator("#gh-app iframe").getAttribute("src"), embedded);
      assert.equal(await page.frameLocator("#gh-app iframe").locator("p").textContent(), "Embed fixture mounted");
      assert.deepEqual(result.draftRequests, [{pageQueryString: "?source=offline-fixture"}]);
      assert.equal(await page.evaluate(() => localStorage.getItem("providerApplicationPublicId")), "offline-draft");
      const toggle = page.getByRole("button", {name: "Job description"});
      await toggle.waitFor();
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator(".gh-job-accordion-inner p").last().textContent(), "Fixture job description");
      await toggle.click();
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.deepEqual(result.unexpected, []);
      assert.equal(result.errors.length, mode === "native" ? 0 : 1);
      if (result.errors.length) assert.equal(result.errors[0].message, "Cannot define property name, object is not extensible");
    });
  }
  test(`${version}: draft failures expose a working retry using only mock endpoints`, async t => {
    const result = await open(t, { application, draftStatus: 503 });
    const retry = result.page.getByRole("button", { name: "Retry", exact: true });
    await retry.waitFor();
    assert.equal(result.draftRequests.length, 2);
    await retry.click();
    await result.page.waitForFunction(() => document.querySelector(".nourish-application-error button")?.textContent === "Retry");
    assert.equal(result.draftRequests.length, 4);
    assert.equal(await result.page.locator("#gh-app iframe").count(), 0);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.unexpected, []);
  });
}
