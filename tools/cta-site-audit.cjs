// Sitewide CTA mapping audit.
//
// Fetches every URL in the nourish.com sitemap as plain HTML (page scripts never
// run, so nothing reaches analytics), loads jQuery + this repo's global.js into
// jsdom with a stub rudderanalytics, clicks every signup / directory link and
// records the cta_id and cta_mapping_status the click would report.
//
//   node tools/cta-site-audit.cjs [--limit N] [--only /path-prefix] [--out file.json] [--all]
//
// By default CMS collection pages share one template, so each collection is
// checked once (blog posts three times, since their article text can carry its
// own CTAs). Standalone pages and /landing-page/* are always checked. --all
// checks every sitemap URL.
//
// Pages are audited in short-lived child processes (60 per shard, 4 at a time)
// because each jsdom window keeps page timers alive and would exhaust memory.
//
// Needs the test-only deps: npm install --no-save jquery@3.5.1 (jsdom is a dep).
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://www.nourish.com";
const SOURCE = fs.readFileSync(path.join(ROOT, "global.js"), "utf8");
const JQUERY = fs.readFileSync(require.resolve("jquery/dist/jquery.min.js"), "utf8");

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i === -1 ? dflt : args[i + 1]; };
const LIMIT = Number(opt("--limit", 0));
const ONLY = opt("--only", null);
const OUT = opt("--out", path.join(ROOT, "cta-site-audit.json"));

const curl = (url) => execFileSync("curl", ["-sL", "--max-time", "30", "-A", "nourish-cta-audit", url], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

function sitemapUrls() {
  const xml = curl(ORIGIN + "/sitemap.xml");
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
    .filter((u) => u.startsWith(ORIGIN));
}

const isTarget = (href) => {
  try {
    const u = new URL(href, ORIGIN);
    if (!["signup.nourish.com", "signup.usenourish.com"].includes(u.hostname)) return false;
    const p = u.pathname.replace(/\/$/, "") || "/";
    return p === "/" || p === "/providers";
  } catch (e) { return false; }
};

// Where a link sits, for grouping unmapped results into fixable selectors.
function describe(a) {
  const sec = a.closest("section, [class^='section_'], [class*=' section_'], nav, footer, header");
  const secCls = sec ? (sec.getAttribute("class") || sec.tagName.toLowerCase()).trim().split(/\s+/)[0] : "(none)";
  return {
    section: secCls,
    linkClass: (a.getAttribute("class") || "").trim(),
    dataCta: a.getAttribute("data-cta"),
    id: a.id || null,
    text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
  };
}

function auditPage(url, html) {
  const vc = new VirtualConsole(); // swallow page noise
  const dom = new JSDOM(html, { url, runScripts: "outside-only", virtualConsole: vc, pretendToBeVisual: false });
  const w = dom.window;
  const events = [];
  w.rudderanalytics = { track: (...a) => events.push(a), page() {}, identify() {}, reset() {}, setAnonymousId() {}, ready(cb) {}, getAnonymousId() { return "audit"; } };
  w.fetch = () => new Promise(() => {}); // no network from page code
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  const out = [];
  try {
    w.eval(JQUERY);
    w.eval(SOURCE);
    w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  } catch (e) {
    dom.window.close();
    return { url, error: "global.js threw: " + String(e && e.message).slice(0, 120), links: [] };
  }
  w.addEventListener("click", (e) => e.preventDefault());
  // Links inside wrappers the page hides for everyone (the retired /paid test
  // build) can never be clicked, so they are not counted.
  const links = [...w.document.querySelectorAll("a[href]")]
    .filter((a) => isTarget(a.getAttribute("href")) && !a.closest(".page-wrapper.cc-paid-new"));
  for (const a of links) {
    const before = events.length;
    a.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
    const ev = events.slice(before).filter((e) => e[0] !== "Viewed Page");
    const p = ev[0] && ev[0][1];
    out.push({ ...describe(a), href: a.getAttribute("href").slice(0, 80), event: ev[0] && ev[0][0], cta_id: p && p.cta_id, cta_name: p && p.cta_name, mapping: p && p.cta_mapping_status, location: p && p.cta_location, cta_section: p && p.cta_section, action: p && p.cta_action });
  }
  dom.window.close();
  return { url, links: out };
}

const TEMPLATE_GROUPS = { blog: 3, "local-dietitians": 1, faq: 1, term: 1, conditions: 1, "blog-category": 1,
  partners: 1, reviewer: 1, "insurance-dietitians": 1, "faq-categories": 1, authors: 1 };

function sampleTemplates(urls) {
  const seen = {};
  return urls.filter((u) => {
    const parts = new URL(u).pathname.split("/").filter(Boolean);
    const group = parts.length > 1 ? parts[0] : null;
    if (!group || !(group in TEMPLATE_GROUPS)) return true;
    seen[group] = (seen[group] || 0) + 1;
    return seen[group] <= TEMPLATE_GROUPS[group];
  });
}

function runShard(urls) {
  const results = [];
  for (const url of urls) {
    let html;
    try { html = curl(url); } catch (e) { results.push({ url, error: "fetch failed", links: [] }); continue; }
    results.push(auditPage(url, html));
  }
  return results;
}

async function main() {
  const shardArg = opt("--shard", null);
  if (shardArg) {
    const urls = JSON.parse(fs.readFileSync(shardArg, "utf8"));
    fs.writeFileSync(shardArg + ".out.json", JSON.stringify(runShard(urls)));
    process.exit(0);
  }
  let urls = sitemapUrls();
  if (ONLY) urls = urls.filter((u) => new URL(u).pathname.startsWith(ONLY));
  if (!args.includes("--all")) urls = sampleTemplates(urls);
  if (LIMIT) urls = urls.slice(0, LIMIT);
  const os = require("node:os");
  const { spawn } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cta-audit-"));
  const shards = [];
  for (let i = 0; i < urls.length; i += 60) {
    const f = path.join(dir, "shard-" + shards.length + ".json");
    fs.writeFileSync(f, JSON.stringify(urls.slice(i, i + 60)));
    shards.push(f);
  }
  let next = 0, done = 0;
  await new Promise((resolve) => {
    const launch = () => {
      if (next >= shards.length) { if (done === shards.length) resolve(); return; }
      const f = shards[next++];
      const child = spawn(process.execPath, [__filename, "--shard", f], { stdio: ["ignore", "ignore", "inherit"] });
      child.on("exit", () => { done++; process.stderr.write(`  shard ${done}/${shards.length}\n`); launch(); if (done === shards.length) resolve(); });
    };
    for (let k = 0; k < 4; k++) launch();
  });
  const results = shards.flatMap((f) => {
    try { return JSON.parse(fs.readFileSync(f + ".out.json", "utf8")); }
    catch (e) { return JSON.parse(fs.readFileSync(f, "utf8")).map((url) => ({ url, error: "shard failed", links: [] })); }
  });
  fs.writeFileSync(OUT, JSON.stringify({ checkedAt: new Date().toISOString(), pages: results.length, results }, null, 2));
  const all = results.flatMap((r) => r.links.map((l) => ({ ...l, page: new URL(r.url).pathname })));
  const byStatus = {};
  for (const l of all) byStatus[l.mapping || "(no event)"] = (byStatus[l.mapping || "(no event)"] || 0) + 1;
  console.log(JSON.stringify({ pages: results.length, errors: results.filter((r) => r.error).length, links: all.length, byStatus }, null, 2));
}
main();
