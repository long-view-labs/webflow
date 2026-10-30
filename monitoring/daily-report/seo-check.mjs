// Search indexing check, no browser: plain GETs of the sitemap and of every URL in it, plus the
// static pages Webflow leaves out of the sitemap (pages/static-paths.txt) and the report's own pages.
// No JavaScript runs, so nothing reaches RudderStack or any tag (/dietitian-application included).
// Flags:
//   noindex-in-sitemap   a sitemap URL that serves noindex (meta robots/googlebot or X-Robots-Tag)
//   ad-page-indexable    an ad-only or variant page (AD_PATTERNS) that serves without noindex
//   sitemap-not-200      a sitemap URL that redirects or errors (to review, not an issue)
// The same HTML is scanned for Trustpilot widgets with a retired business-unit id.
// Known gaps are grouped, not alerted: Webflow CMS templates have no sitemap toggle, so noindex
// CMS items under KNOWN_NOINDEX_IN_SITEMAP stay listed (~94 on Oct 29 2026).
// Added Oct 29 2026, after ad-only variants were found indexable and in Google.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TRUSTPILOT_BUSINESS_UNIT} from './console-check.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ORIGIN = 'https://www.nourish.com';
export const STATIC_PATHS_FILE = path.join(HERE, 'pages/static-paths.txt');
export const CONCURRENCY = 8;

const EMPLOYERS = ['bcg', 'cigna', 'dollartree', 'haribo', 'harley-davidson', 'omnicell', 'sidley', 'texasroadhouse', 'usaa'];
// Ad-only and variant pages: these must serve noindex (Gemin, Oct 29 2026).
export const AD_PATTERNS = [
  // -b/-c variant suffixes, outside the blog (/blog/nourish-announces-series-b is a post).
  /^\/paid/, /^\/landing-pages?\//, /^\/landing\//, /^\/lp-/, /^(?!\/blog\/).*-[bc]$/, /^\/dev\//, /^\/wip\//,
  /^\/forbes$/, /^\/money-saving-mom$/, new RegExp(`^/(?:${EMPLOYERS.join('|')})$`), /^\/nutrition-program$/, /^\/condition\/glp-1s$/,
];
// Indexable on purpose even where a pattern above would match.
export const INDEXABLE_ON_PURPOSE = [/^\/quiz\//, /^\/gut-health-quiz$/, /^\/signup\/weight-loss$/, /^\/refer$/, /^\/refer-a-friend$/];
// Known and accepted for now; shown once as a group, never as new issues.
export const KNOWN = [
  {id: 'cms-noindex-in-sitemap', kind: 'noindex-in-sitemap', test: /^\/(?:landing-page|landing|partners)\//,
    note: 'Noindex CMS items still in the sitemap: Webflow has no per-template sitemap toggle for CMS collections'},
  {id: 'partnerships-modify', kind: 'ad-page-indexable', test: /^\/partnerships\/nourish-modify-/,
    note: 'Partnership CMS pages /partnerships/nourish-modify-* are still indexable (open item, Oct 29 2026)'},
];

export const isAdPath = (p) => AD_PATTERNS.some((re) => re.test(p)) && !INDEXABLE_ON_PURPOSE.some((re) => re.test(p));
export const pathOf = (url) => { const p = new URL(url, ORIGIN).pathname; return p.length > 1 ? p.replace(/\/+$/, '') : p; };

// Robots directives from the HTML head and the X-Robots-Tag header; attribute order varies.
export function robotsOf(html, header = '') {
  const metas = String(html).match(/<meta\b[^>]*>/gi) ?? [];
  const content = metas.filter((m) => /\bname\s*=\s*["']?(?:robots|googlebot)\b/i.test(m))
    .map((m) => (m.match(/\bcontent\s*=\s*["']([^"']*)["']/i) ?? [])[1] ?? '');
  const all = [...content, header ?? ''].join(',');
  return {noindex: /(?:^|[\s,;])(?:noindex|none)(?:[\s,;]|$)/i.test(all), directives: all.replace(/^,+|,+$/g, '')};
}

export function trustpilotIds(html) {
  return (String(html).match(/<div\b[^>]*class="[^"]*trustpilot-widget[^"]*"[^>]*>/gi) ?? [])
    .map((t) => (t.match(/data-businessunit-id="([^"]*)"/) ?? [])[1] ?? '');
}

export const sitemapUrls = (xml) => [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

// Pure: fetched rows in, findings out. rows: [{path, inSitemap, status, noindex, trustpilot: [ids]}].
export function classifySeo(rows, {businessUnit = TRUSTPILOT_BUSINESS_UNIT} = {}) {
  const issues = [], known = Object.fromEntries(KNOWN.map((k) => [k.id, {...k, test: undefined, paths: []}]));
  const add = (kind, p, detail) => {
    const k = KNOWN.find((k) => k.kind === kind && k.test.test(p));
    if (k) known[k.id].paths.push(p); else issues.push({kind, path: p, detail});
  };
  for (const r of rows) {
    if (r.status === 200 && r.inSitemap && r.noindex) add('noindex-in-sitemap', r.path, 'in the sitemap but serves noindex');
    const knownAd = KNOWN.some((k) => k.kind === 'ad-page-indexable' && k.test.test(r.path));
    if (r.status === 200 && !r.noindex && (isAdPath(r.path) || knownAd)) add('ad-page-indexable', r.path, `ad/variant page is indexable${r.inSitemap ? ' and in the sitemap' : ''}`);
    if (r.inSitemap && r.status !== 200) issues.push({kind: 'sitemap-not-200', level: 'review', path: r.path, detail: `sitemap URL answers ${r.status}${r.location ? ` → ${r.location}` : ''}`});
    if (r.status !== 200 && !r.inSitemap && r.status !== 404 && !(r.status >= 300 && r.status < 400)) issues.push({kind: 'fetch-failed', level: 'review', path: r.path, detail: `answers ${r.status}`});
  }
  const trustpilot = rows.flatMap((r) => (r.trustpilot ?? []).filter((id) => id !== businessUnit).map((id) => ({path: r.path, businessUnit: id || '(none)'})));
  for (const t of trustpilot) issues.push({kind: 'trustpilot-id', path: t.path, detail: `Trustpilot widget uses business unit ${t.businessUnit}, not ${businessUnit}`});
  return {issues, known: Object.values(known).filter((k) => k.paths.length)};
}

async function getPage(url, fetcher) {
  // Manual redirects: a sitemap URL that redirects is itself a finding.
  const res = await fetcher(url, {redirect: 'manual', headers: {'User-Agent': 'NourishDailySiteCheck/1 (+monitoring; no JS)'}, signal: AbortSignal.timeout(30000)});
  const html = res.status === 200 ? await res.text() : '';
  if (res.status !== 200) await res.body?.cancel?.().catch(() => {});
  return {status: res.status, location: res.headers.get('location'), html, xRobots: res.headers.get('x-robots-tag') ?? ''};
}

export async function checkSeo({extraUrls = [], fetcher = fetch, concurrency = CONCURRENCY, staticPathsFile = STATIC_PATHS_FILE} = {}) {
  const started = Date.now();
  let xml;
  try {
    const res = await fetcher(ORIGIN + '/sitemap.xml', {signal: AbortSignal.timeout(30000)});
    if (!res.ok) throw new Error(`sitemap.xml HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) { return {status: 'error', reason: String(e.message).split('\n')[0].slice(0, 120), issues: [], known: [], rows: []}; }
  const inSitemap = new Set(sitemapUrls(xml).map(pathOf));
  const listed = fs.existsSync(staticPathsFile) ? fs.readFileSync(staticPathsFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l.startsWith('/')) : [];
  const paths = [...new Set([...inSitemap, ...listed, ...extraUrls.map(pathOf)])];
  const rows = [];
  let next = 0;
  const work = async () => {
    while (next < paths.length) {
      const p = paths[next++];
      try {
        const r = await getPage(ORIGIN + p, fetcher);
        rows.push({path: p, inSitemap: inSitemap.has(p), status: r.status, location: r.location ? pathOf(r.location) : null,
          noindex: r.status === 200 ? robotsOf(r.html, r.xRobots).noindex : null, trustpilot: r.status === 200 ? trustpilotIds(r.html) : []});
      } catch (e) { rows.push({path: p, inSitemap: inSitemap.has(p), status: 'error', error: String(e.message).slice(0, 80)}); }
    }
  };
  await Promise.all(Array.from({length: concurrency}, work));
  rows.sort((a, b) => a.path.localeCompare(b.path));
  const {issues, known} = classifySeo(rows);
  const failed = rows.filter((r) => r.status === 'error').length;
  return {status: failed > rows.length / 10 ? 'error' : 'ok', reason: failed ? `${failed} URLs could not be fetched` : undefined,
    sitemapCount: inSitemap.size, checked: rows.length, indexable: rows.filter((r) => r.status === 200 && !r.noindex).length,
    issues, known, rows, seconds: Math.round((Date.now() - started) / 1000)};
}
