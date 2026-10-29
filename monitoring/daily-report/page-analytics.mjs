// Per-page Amplitude numbers for the page cards and detail pages, modelled on the page checker's
// per-page PostHog analytics for Unify (src/analytics-fetch.mjs): one grouped query per metric covers
// every page, plus one small funnel per page. Counts only: no user ids, emails or free-text values.
//   views       Viewed Page (global.js track, one per page load) grouped by its `path`
//   clicks      Get Started Clicked grouped by `location` (the page path the click happened on;
//               `page_path` is missing on about a third of clicks, Oct 2026)
//   funnel      people who clicked Get Started on the page and then reached FlowLoaded (signup app)
//               within a day, last 7 days
// Read-only Dashboard REST API, project 373727, with the same Keychain item as tracking.mjs.
import {amplitudeCredentials, KEYCHAIN_SERVICE} from './tracking.mjs';

export const DAYS = 30;          // detail-page charts
export const CARD_DAYS = 7;      // page-card totals and the funnel
export const FUNNEL_WINDOW_SECONDS = 86400;
export const FUNNEL = [['Get Started Clicked', 'Clicked Get Started on this page'], ['FlowLoaded', 'Reached the signup flow (FlowLoaded)']];
const BASE = 'https://amplitude.com/api/2';

export const normalizePath = (p) => (String(p).length > 1 ? String(p).replace(/\/+$/, '') : String(p)) || '/';
export const pathOf = (url) => normalizePath(new URL(url).pathname);

const ymd = (d) => d.replace(/-/g, '');
// The n complete Pacific days ending yesterday, as YYYY-MM-DD (the project buckets in Pacific).
export function lastDays(now = new Date(), n = DAYS) {
  const today = now.toLocaleString('en-CA', {timeZone: 'America/Los_Angeles'}).slice(0, 10);
  return Array.from({length: n}, (_, i) => new Date(Date.parse(today + 'T00:00:00Z') - (n - i) * 864e5).toISOString().slice(0, 10));
}

async function get(endpoint, params, {creds, fetcher}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) for (const one of [].concat(v)) qs.append(k, one);
  let res;
  try {
    res = await fetcher(`${BASE}/${endpoint}?${qs}`, {headers: {Authorization: 'Basic ' + Buffer.from(creds.apiKey + ':' + creds.secret).toString('base64')}, signal: AbortSignal.timeout(60000)});
  } catch { throw new Error('Amplitude could not be reached'); }
  if (!res.ok) throw new Error(`Amplitude HTTP ${res.status}`); // body may echo the request; never logged
  const body = await res.json().catch(() => null);
  if (!body?.data) throw new Error('Amplitude returned no data');
  return body.data;
}

// {path: daily counts over `days`} for one event grouped by an event property.
export async function groupedDaily(eventType, property, days, opts) {
  const data = await get('events/segmentation', {e: JSON.stringify({event_type: eventType, group_by: [{type: 'event', value: property}]}),
    m: 'totals', i: '1', start: ymd(days[0]), end: ymd(days.at(-1)), limit: '1000'}, opts);
  if (!Array.isArray(data.series) || !Array.isArray(data.seriesLabels)) throw new Error('Amplitude returned no series');
  const xs = (data.xValues ?? []).map((d) => String(d).slice(0, 10));
  const out = {};
  data.series.forEach((series, i) => {
    const raw = data.seriesLabels[i];
    const label = Array.isArray(raw) ? raw.at(-1) : raw;
    if (typeof label !== 'string' || !label.startsWith('/')) return; // "(none)" and stray values
    const key = normalizePath(label.split('?')[0]);
    const row = out[key] ??= days.map(() => 0);
    series.forEach((v, j) => { const d = days.indexOf(xs[j] ?? days[j]); if (d >= 0) row[d] += Number(v) || 0; });
  });
  return out;
}

// People who clicked Get Started on `path` and reached FlowLoaded within a day, over `days`.
export async function pageFunnel(path, days, opts) {
  const location = path === '/' ? ['/'] : [path, path + '/'];
  const data = await get('funnels', {e: [
    JSON.stringify({event_type: FUNNEL[0][0], filters: [{subprop_type: 'event', subprop_key: 'location', subprop_op: 'is', subprop_value: location}]}),
    JSON.stringify({event_type: FUNNEL[1][0]})],
  start: ymd(days[0]), end: ymd(days.at(-1)), mode: 'ordered', n: 'active', cs: String(FUNNEL_WINDOW_SECONDS)}, opts);
  const raw = (Array.isArray(data) ? data[0] : data)?.cumulativeRaw;
  if (!Array.isArray(raw) || raw.length < 2) throw new Error('Amplitude returned no funnel');
  return FUNNEL.map(([event, label], i) => ({event, label, people: Number(raw[i]) || 0}));
}

// Card numbers from one page's fetched data: last CARD_DAYS totals, click rate and click→FlowLoaded.
export function cardNumbers(p) {
  if (!p) return null;
  const tail = (a) => (Array.isArray(a) ? a.slice(-CARD_DAYS).reduce((s, v) => s + v, 0) : null);
  const views = tail(p.views), clicks = tail(p.clicks);
  const f = Array.isArray(p.funnel) ? p.funnel : null;
  return {views, clicks, clickRate: views && clicks != null ? (clicks * 100) / views : null,
    clickers: f ? f[0].people : null, flowLoaded: f ? f[1].people : null,
    conversion: f && f[0].people ? (f[1].people * 100) / f[0].people : null};
}

// pageUrls: {pageId: url}. Returns {status, reason?, days, pages: {pageId: {path, views, clicks, funnel, errors}}, queries, seconds}.
export async function fetchPageAnalytics({pageUrls, now = new Date(), creds = amplitudeCredentials(), fetcher = fetch} = {}) {
  const started = Date.now();
  const days = lastDays(now);
  if (!creds) return {status: 'unavailable', reason: `no Amplitude key in the Keychain item "${KEYCHAIN_SERVICE}"`, days, pages: {}, queries: 0, seconds: 0};
  const opts = {creds, fetcher};
  const errors = {};
  let views = {}, clicks = {}, queries = 2;
  try { views = await groupedDaily('Viewed Page', 'path', days, opts); } catch (e) { errors.views = e.message; }
  try { clicks = await groupedDaily('Get Started Clicked', 'location', days, opts); } catch (e) { errors.clicks = e.message; }
  const pages = {}, funnelDays = days.slice(-CARD_DAYS), funnels = {};
  for (const id of Object.keys(pageUrls)) {
    const path = pathOf(pageUrls[id]);
    let funnel = null, funnelError;
    // Pages nobody clicked from in the window need no funnel query.
    const anyClicks = (clicks[path] ?? []).slice(-CARD_DAYS).some((v) => v > 0);
    if (errors.clicks || anyClicks) {
      if (!(path in funnels)) { queries++; funnels[path] = await pageFunnel(path, funnelDays, opts).catch((e) => ({error: e.message})); }
      if (funnels[path].error) funnelError = funnels[path].error; else funnel = funnels[path];
    } else funnel = FUNNEL.map(([event, label]) => ({event, label, people: 0}));
    pages[id] = {path,
      views: errors.views ? null : views[path] ?? days.map(() => 0),
      clicks: errors.clicks ? null : clicks[path] ?? days.map(() => 0),
      funnel, errors: {...errors, ...(funnelError ? {funnel: funnelError} : {})}};
  }
  const failed = errors.views && errors.clicks;
  return {status: failed ? 'unavailable' : 'ok', reason: failed ? errors.views : Object.values(errors)[0], days, cardDays: CARD_DAYS,
    pages, queries, seconds: Math.round((Date.now() - started) / 1000)};
}
