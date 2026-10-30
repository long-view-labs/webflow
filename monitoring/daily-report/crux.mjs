// Real-user Core Web Vitals from the Chrome UX Report API (chromeuxreport.googleapis.com), shown on
// each detail page beside the lab scores. CrUX reads Chrome's own 28-day dataset: nothing loads the
// page, so nothing reaches RudderStack, Amplitude or any tag (unlike PageSpeed Insights, which always
// runs a Lighthouse load of the live page). A page with too little Chrome traffic has no record; it
// then shows the origin's numbers, labelled as such.
// The API key (a Google Cloud key with the Chrome UX Report API enabled) is read from the login
// Keychain at run time: `nourish-crux-api` when present, otherwise the Google key already stored for
// Unify's PageSpeed Insights (`unify-psi-api`, same Cloud project). It travels in the URL, so it is
// never logged or put in an error.
import {execFileSync} from 'node:child_process';

export const KEYCHAIN_SERVICE = 'nourish-crux-api';
export const FALLBACK_SERVICE = 'unify-psi-api';
export const ENDPOINT = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
export const FORM_FACTORS = [['mobile', 'PHONE'], ['desktop', 'DESKTOP']];
// Google's Core Web Vitals thresholds for the 75th percentile (good ≤ first, poor > second).
export const METRICS = [
  ['lcp', 'largest_contentful_paint', 'LCP', 2500, 4000, 'ms'],
  ['inp', 'interaction_to_next_paint', 'INP', 200, 500, 'ms'],
  ['cls', 'cumulative_layout_shift', 'CLS', 0.1, 0.25, ''],
  ['fcp', 'first_contentful_paint', 'FCP', 1800, 3000, 'ms'],
  ['ttfb', 'experimental_time_to_first_byte', 'TTFB', 800, 1800, 'ms'],
];

export function cruxKey(read = execFileSync) {
  for (const service of [KEYCHAIN_SERVICE, FALLBACK_SERVICE]) {
    try { const key = read('/usr/bin/security', ['find-generic-password', '-s', service, '-w'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); if (key) return key; }
    catch {}
  }
  return null;
}

export const rating = (value, good, poor) => (!Number.isFinite(value) ? null : value <= good ? 'good' : value > poor ? 'poor' : 'needs-improvement');

// p75 per metric from one API record, with Google's rating.
export function readRecord(record) {
  const out = {};
  for (const [id, name, , good, poor] of METRICS) {
    const p75 = Number(record?.metrics?.[name]?.percentiles?.p75);
    if (Number.isFinite(p75)) out[id] = {p75, rating: rating(p75, good, poor)};
  }
  const p = record?.collectionPeriod;
  const day = (d) => (d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : null);
  return {metrics: out, period: p ? {from: day(p.firstDate), to: day(p.lastDate)} : null};
}

// One record, or null when CrUX has no data for it (HTTP 404).
async function query(body, {key, fetcher}) {
  let res;
  try {
    res = await fetcher(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...body, metrics: METRICS.map((m) => m[1])}), signal: AbortSignal.timeout(30000)});
  } catch { throw new Error('CrUX could not be reached'); }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CrUX HTTP ${res.status}`); // the body may echo the URL and key; never read
  const json = await res.json().catch(() => null);
  if (!json?.record) throw new Error('CrUX returned no record');
  return readRecord(json.record);
}

// pageUrls: {pageId: url}. Returns {status, reason?, origin, originRecords: {mobile, desktop},
// pages: {pageId: {mobile: {scope: 'page'|'origin'|'none', metrics, period}, desktop: …}}, queries, seconds}.
export async function fetchCrux({pageUrls, key = cruxKey(), fetcher = fetch} = {}) {
  const started = Date.now();
  if (!key) return {status: 'unavailable', reason: `no Google API key in the Keychain items "${KEYCHAIN_SERVICE}" or "${FALLBACK_SERVICE}"`, pages: {}, queries: 0, seconds: 0};
  const opts = {key, fetcher};
  const ids = Object.keys(pageUrls);
  const origin = ids.length ? new URL(pageUrls[ids[0]]).origin : null;
  let queries = 0, error = null;
  const originRecords = {};
  for (const [vp, ff] of FORM_FACTORS) {
    queries++;
    try { originRecords[vp] = await query({origin, formFactor: ff}, opts); } catch (e) { error ??= e.message; originRecords[vp] = null; }
  }
  const pages = {};
  for (const id of ids) {
    pages[id] = {};
    for (const [vp, ff] of FORM_FACTORS) {
      queries++;
      let rec = null;
      try { rec = await query({url: pageUrls[id], formFactor: ff}, opts); } catch (e) { error ??= e.message; pages[id][vp] = {scope: 'error', error: e.message}; continue; }
      pages[id][vp] = rec ? {scope: 'page', ...rec} : originRecords[vp] ? {scope: 'origin', ...originRecords[vp]} : {scope: 'none'};
    }
  }
  const anyData = Object.values(pages).some((p) => Object.values(p).some((r) => r.scope === 'page' || r.scope === 'origin'));
  return {status: anyData || !error ? 'ok' : 'unavailable', reason: error ?? undefined, origin, originRecords, pages, queries, seconds: Math.round((Date.now() - started) / 1000)};
}
