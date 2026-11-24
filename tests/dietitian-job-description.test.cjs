const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { JSDOM } = require("jsdom");

const source = readFileSync(path.join(__dirname, "../dietitian-application-final.js"), "utf8");
const schema = {
  title: "Registered Dietitian",
  company_name: "Nourish",
  updated_at: "2026-11-24T00:00:00Z",
  content: [
    '<h3>Please apply here: <a href="https://www.nourish.com/dietitian-application">https://www.nourish.com/dietitian-application</a></h3>',
    '<p>Apply <a href="/dietitian-application/">via the website</a> rather than this job board for a faster response.</p>',
    '<h3 id="requirements">Background</h3>',
    '<h3 id="fragment">Please apply here: <a href="#requirements">requirements</a></h3>',
    '<h3 id="empty">Please apply here: <a href="">this page</a></h3>',
    '<h3 id="query">Please apply here: <a href="?step=resume">resume</a></h3>',
    '<h3 id="deep-link">Please apply here: <a href="/dietitian-application/?source=gh#requirements">requirements</a></h3>',
    '<h3 id="two-links">Please apply here: <a href="/dietitian-application">our site</a><a href="/benefits" aria-label="Benefits"></a></h3>',
    '<p>Read <a href="https://usenourish.com/dietitian-application"><strong>these qualifications</strong></a> first.</p>',
    '<p><a href="https://example.org/dietitian-application">Other application</a> and <a href="/become-a-dietitian">Nourish information</a>.</p>',
  ].join("").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
};
const iframeUrl = "https://app.nourish.com/synthetic-provider-application";

async function render(t, { cached, stale = false }) {
  const { window } = new JSDOM(
    '<section id="gh-job"><div id="gh-content"></div></section><div id="gh-app"></div>',
    { url: "https://www.nourish.com/dietitian-application?utm_source=qa", runScripts: "outside-only" },
  );
  t.after(() => window.close());
  window.localStorage.setItem("providerApplicationPublicId", "existing-draft");
  if (cached) {
    window.sessionStorage.setItem("gh_schema_4007342008", JSON.stringify({ t: Date.now(), data: schema }));
  }
  const calls = [];
  window.fetch = async (endpoint, options) => {
    const method = options.method || "GET";
    const body = options.body && JSON.parse(options.body);
    calls.push({ method, body });
    if (endpoint.startsWith("https://boards-api.greenhouse.io/")) {
      assert.equal(options.credentials, "omit");
      return { ok: true, json: async () => schema };
    }
    assert.equal(endpoint, "https://app.nourish.com/api/provider-job-application/drafts");
    assert.equal(method, "POST");
    assert.equal(body.pageQueryString, "?utm_source=qa");
    return {
      ok: true,
      json: async () => stale && body.applicationPublicId ? {} : { applicationPublicId: "synthetic", iframeUrl },
    };
  };
  await window.eval(source);
  return { document: window.document, calls };
}

for (const cached of [false, true]) {
  test(`cleans only same-page apply calls, with ${cached ? "cached" : "fresh"} Greenhouse content`, async (t) => {
    const { document, calls } = await render(t, { cached });
    const application = document.querySelector("#gh-app");
    const details = document.querySelector("#gh-content");
    assert.equal(application.querySelector("iframe").src, iframeUrl);
    assert.equal(application.nextElementSibling.id, "gh-job");
    assert.equal(Array.from(details.querySelectorAll("h3")).some((h) =>
      h.textContent === "Please apply here: https://www.nourish.com/dietitian-application"), false);
    assert.doesNotMatch(details.textContent, /rather than this job board/i);
    assert.match(details.textContent, /Background/);
    assert.match(details.textContent, /Read these qualifications first\./);
    assert.equal(details.querySelector("strong").textContent, "these qualifications");
    assert.deepEqual(Array.from(details.querySelectorAll("a"), (a) => [a.getAttribute("href"), a.target, a.rel]), [
      ["#requirements", "_blank", "noopener noreferrer"],
      ["", "_blank", "noopener noreferrer"],
      ["?step=resume", "_blank", "noopener noreferrer"],
      ["/dietitian-application/?source=gh#requirements", "_blank", "noopener noreferrer"],
      ["/dietitian-application", "_blank", "noopener noreferrer"],
      ["/benefits", "_blank", "noopener noreferrer"],
      ["https://usenourish.com/dietitian-application", "_blank", "noopener noreferrer"],
      ["https://example.org/dietitian-application", "_blank", "noopener noreferrer"],
      ["/become-a-dietitian", "_blank", "noopener noreferrer"],
    ]);
    const toggle = details.querySelector(".gh-job-accordion-toggle");
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    toggle.click();
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    assert.deepEqual(calls.map(({ method }) => method), cached ? ["POST"] : ["GET", "POST"]);
    assert.equal(calls.find(({ method }) => method === "POST").body.applicationPublicId, "existing-draft");
  });
}

if (source.includes("ignoreStoredApplicationPublicId")) {
  test("preserves main's stale draft recovery while cleaning the job description", async (t) => {
    const { document, calls } = await render(t, { cached: true, stale: true });
    assert.deepEqual(calls.map(({ body }) => body.applicationPublicId), ["existing-draft", undefined]);
    assert.equal(document.querySelector("#gh-app iframe").src, iframeUrl);
    assert.doesNotMatch(document.querySelector("#gh-content").textContent, /rather than this job board/i);
  });
}
