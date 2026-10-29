// Daily Lighthouse lab run for the Nourish report: every page in pages/*.json on desktop and
// mobile, all four categories, with analytics blocked and the block verified from each load's
// own network log. Built on the page checker's Lighthouse wrapper (src/performance.mjs: the
// bf-cache audit skipped so no unblocked re-navigation happens, collector paths blocked) with
// Nourish's analytics hosts added to the unresolvable-host list. Only measureLab() touches a
// browser; everything else is pure and tested without one.
//
// Quiet rule, same as Unify: `regressed` is true only when a page's Performance score drops by
// more than SCORE_DROP_POINTS against the previous run, or a lab load reached an analytics host.
// Accessibility, Best practices and SEO are shown in the report and never alert.
import fs from 'node:fs/promises';
import path from 'node:path';
import {checker} from './checker.mjs';

const {ANALYTICS_HOSTS, isAnalyticsRequest, browserOptions} = await checker('src/browser.mjs');
const {measurePerformance} = await checker('src/performance.mjs');
const {labRow, compareLab, SCORE_DROP_POINTS} = await checker('src/performance-daily.mjs');
export {SCORE_DROP_POINTS, labRow, compareLab};

// What the live pages load (read on Oct 29 2026: home, /paid, /landing/ibd-nutritionist):
// RudderStack's SDK from jssdk-proxy.<apex> and its collector at dataplane-proxy.<apex>, where
// <apex> is usenourish.com or nourish.com (window.__nourish_apex); the Statsig experiment
// sidecar (script on cdn.jsdelivr.net, which also serves site scripts and so stays reachable),
// whose SDK fetches its config from featureassets.org / api.statsigcdn.com, logs exposures and
// events to prodregistryv2.org, reports to statsigapi.net and, when those fail, looks up
// fallback domains through cloudflare-dns.com; and the LinkedIn insight pixel. The checker's
// list already covers Amplitude, RudderStack's own hosts, Bing, LinkedIn, Meta, GA and the
// rest; these are Nourish's hosts on top. Both the apex and its subdomains are listed, since
// Chrome's `*.host` rule does not cover the apex. The SDK hosts are blocked as well, so nothing
// can queue an event even if a collector host were ever missed.
export const NOURISH_ANALYTICS_HOSTS = [
  'dataplane-proxy.nourish.com', 'dataplane-proxy.usenourish.com',
  'jssdk-proxy.nourish.com', 'jssdk-proxy.usenourish.com',
  'featureassets.org', '*.featureassets.org', 'prodregistryv2.org', '*.prodregistryv2.org', 'statsigapi.net', '*.statsigapi.net',
  'statsigcdn.com', '*.statsigcdn.com', '*.statsig.com', 'cloudflare-dns.com',
  'snap.licdn.com', 'analytics.tiktok.com', '*.googletagmanager.com',
];
export const BLOCKED_HOSTS = [...ANALYTICS_HOSTS, ...NOURISH_ANALYTICS_HOSTS];
const hostMatches = (host, pattern) => (pattern.startsWith('*.') ? host === pattern.slice(2) || host.endsWith(pattern.slice(1)) : host === pattern);
export function isNourishAnalyticsRequest(url) {
  if (isAnalyticsRequest(url)) return true;
  let u;
  try { u = new URL(url); } catch { return false; }
  return NOURISH_ANALYTICS_HOSTS.some((p) => hostMatches(u.hostname, p));
}
export const hostResolverFlag = (hosts = BLOCKED_HOSTS) => `--host-resolver-rules=${hosts.map((h) => `MAP ${h} ~NOTFOUND`).join(', ')}`;
// Chrome launch options for Nourish's own browsers (nav/form checks, Lighthouse): the checker's
// executable and headless flags with the extended unresolvable-host list in place of its own.
export function nourishLaunch(base = browserOptions()) {
  return {...base, args: [...(base.args ?? []).filter((a) => !a.startsWith('--host-resolver-rules=')), hostResolverFlag()]};
}

// Answered requests (2xx/3xx) to an analytics host in Lighthouse's network log. Blocked or
// failed requests (statusCode -1) prove the block held; they are not leaks.
export function countAnalyticsRequests(lhr) {
  const items = lhr?.audits?.['network-requests']?.details?.items ?? [];
  return items.filter((i) => isNourishAnalyticsRequest(i.url) && Number(i.statusCode) >= 200 && Number(i.statusCode) < 400).length;
}

// Every page of every page set on every viewport, in the shape measurePerformance expects.
export function labCases(sets) {
  return sets.flatMap(({site}) => site.pages.flatMap((page) => site.viewports.map((viewport) => ({pageId: page.id, url: page.url, viewport}))));
}

// One Lighthouse load. The checker writes lighthouse/<page>--<viewport>.json; the analytics
// count is taken again from that file with Nourish's hosts, so a load with no saved network
// log (Lighthouse threw) stays `null`: unverified, never assumed clean.
export async function measureLab(c, runDir, {measure = measurePerformance, launch = nourishLaunch()} = {}) {
  const log = path.join(runDir, 'lighthouse', `${c.pageId}--${c.viewport.id}.json`);
  await fs.rm(log, {force: true});
  const r = await measure(c, runDir, launch, {saveHtml: false});
  let analyticsRequests = null;
  try {
    const lhr = JSON.parse(await fs.readFile(log, 'utf8'));
    analyticsRequests = Math.max(Number(r.analyticsRequests) || 0, countAnalyticsRequests(lhr));
  } catch {}
  return {...r, analyticsRequests};
}

// Lighthouse on this site moves 10+ points between identical loads, so each page and viewport is
// loaded LAB_RUNS times and the report keeps the median (scores, LCP, CLS, TBT). The score drop rule
// and the 7-day strip then compare medians, not single loads.
export const LAB_RUNS = Math.max(1, Number(process.env.NOURISH_PERF_RUNS) || 3);
export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
// Combines one page+viewport's loads into one result. Every load with a network log counts toward
// the leak proof (a leak in any load is a leak); a load that threw before writing a log is ignored
// when another load is verified, as a failed first attempt was before. No measured load: the last
// failure is returned as is.
export function medianRun(runs) {
  const measured = runs.filter((r) => r.status === 'measured' && Number.isFinite(r.score));
  const counts = runs.map((r) => r.analyticsRequests).filter(Number.isFinite);
  const analyticsRequests = counts.length ? counts.reduce((a, b) => a + b, 0) : null;
  if (!measured.length) return {...runs.at(-1), analyticsRequests, runs: 0, spread: null};
  const pick = (f) => median(measured.map(f));
  const keys = Object.keys(measured[0].scores ?? {});
  const metricKeys = Object.keys(measured[0].metrics ?? {});
  const scores = measured.map((r) => r.score);
  return {...measured.at(-1), status: 'measured', score: pick((r) => r.score),
    scores: Object.fromEntries(keys.map((k) => [k, pick((r) => r.scores?.[k])])),
    metrics: Object.fromEntries(metricKeys.map((k) => [k, pick((r) => r.metrics?.[k])])),
    analyticsRequests, runs: measured.length, spread: [Math.round(Math.min(...scores)), Math.round(Math.max(...scores))]};
}

// Readable page names for Slack and the detail pages (config ids stay in report.json).
const NAMES = {home: 'Home', 'insurance-coverage': 'Insurance coverage', refer: 'Refer', 'become-a-dietitian': 'Become a dietitian', about: 'About',
  outcomes: 'Outcomes', employers: 'Employers', 'for-health-plans': 'For health plans', 'health-systems': 'Health systems', careers: 'Careers', blog: 'Blog',
  faq: 'FAQ', 'condition-acid-reflux': 'Condition · Acid reflux', 'local-dietitians-akron': 'Local dietitians · Akron', 'insurance-aetna': 'Insurance · Aetna',
  'blog-post': 'Blog post', 'partner-nurx': 'Partner · Nurx', paid: 'Paid', 'paid-b': 'Paid B', 'paid-c': 'Paid C', 'paid-google': 'Paid Google',
  'paid-labs': 'Paid Labs', 'paid-outcome': 'Paid Outcome', 'paid-qa': 'Paid QA', 'paid-quiz': 'Paid Quiz', 'paid-sp': 'Paid SP', paidwl: 'Paid WL', start: 'Start'};
const ACRONYMS = {glp: 'GLP', pcos: 'PCOS', ibd: 'IBD', ibs: 'IBS', faq: 'FAQ', b: 'B', c: 'C'};
const words = (s) => s.split('-').map((w, i) => (ACRONYMS[w] ?? (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))).join(' ').replace(/\b1s\b/, '1s');
export function pageName(id) {
  if (NAMES[id]) return NAMES[id];
  const m = /^(landing|ad)-(.+)$/.exec(id);
  return m ? `${m[1] === 'ad' ? 'Ad' : 'Landing'} · ${words(m[2])}` : words(id);
}
const where = (r) => `${pageName(r.pageId)}, ${r.viewport}`;
const scored = (r) => r.status === 'measured' && Number.isFinite(r.score);

// Plain-language result from structured fields only (rows, regressions, flags), so the Slack
// line is always composed from today's fields and never from a stored sentence.
// status: ok|changed|issue|skipped, plus `new` for a first day with nothing to compare.
export function describePerformance({rows = [], expected, regressions = [], labAvailable = false, previousDiscarded = false} = {}) {
  const total = expected ?? rows.length;
  const leaks = rows.filter((r) => r.analyticsRequests > 0);
  const measured = rows.filter(scored);
  const unscored = total - measured.length;
  const regressed = leaks.length > 0 || regressions.length > 0;
  let text;
  if (leaks.length) {
    text = `the speed test accidentally sent test visits to analytics on ${leaks.length}/${total} page loads; today's scores are discarded, needs a fix before tomorrow's run`;
  } else if (regressed) {
    const one = (g) => `${pageName(g.pageId)} (${g.viewport})`;
    text = regressions.length === 1
      ? `${one(regressions[0])} dropped ${regressions[0].before - regressions[0].after} points since yesterday (${regressions[0].before} → ${regressions[0].after})${measured.length > 1 ? '; other pages steady' : ''}`
      : `${regressions.length} pages dropped since yesterday: ${regressions.slice(0, 3).map((g) => `${one(g)} ${g.before} → ${g.after}`).join(', ')}${regressions.length > 3 ? `, +${regressions.length - 3} more` : ''}`;
  } else if (!measured.length) {
    text = `not measured today (${rows.length ? 'no page could be scored' : 'the speed test did not run'})`;
  } else {
    const worst = measured.reduce((a, b) => (b.score < a.score ? b : a));
    const head = `${measured.length}/${total} pages scored, lowest ${worst.score} (${where(worst)})`;
    text = labAvailable ? `${head}, no drops since yesterday`
      : previousDiscarded ? `${head}; yesterday's scores were discarded, comparison starts tomorrow`
      : `first day of speed scores, ${head}; day-over-day comparison starts tomorrow`;
  }
  const status = regressed ? 'issue' : !measured.length ? 'skipped' : unscored ? 'changed' : labAvailable ? 'ok' : 'new';
  return {status, regressed, text};
}

// The whole daily result, stored in report.json → performance.
export function buildPerformance({rows, previousRows, expected, previousDiscarded = false}) {
  const lab = compareLab(rows, previousRows);
  const d = describePerformance({rows, expected, regressions: lab.regressions, labAvailable: lab.available, previousDiscarded});
  return {schemaVersion: 1, ...d, expected: expected ?? rows.length, labAvailable: lab.available, previousDiscarded, regressions: lab.regressions,
    analyticsLeaks: rows.filter((r) => r.analyticsRequests > 0).map((r) => r.key), rows, thresholds: {scoreDropPoints: SCORE_DROP_POINTS}};
}

// Fields describePerformance needs, taken from a stored result (never its text).
export const summaryInput = (p) => (p && typeof p === 'object' && Array.isArray(p.rows) ? {
  expected: p.expected ?? p.rows.length, labAvailable: p.labAvailable === true, previousDiscarded: p.previousDiscarded === true,
  rows: p.rows.map((r) => ({key: r.key, pageId: r.pageId, viewport: r.viewport, status: r.status, score: r.score ?? null, analyticsRequests: r.analyticsRequests ?? null})),
  regressions: (p.regressions ?? []).map((g) => ({pageId: g.pageId, viewport: g.viewport, before: g.before, after: g.after})),
} : null);
export const summaryOf = (p) => { const i = summaryInput(p); return i ? describePerformance(i) : null; };

// Publication gate: every attempted load must show zero answered analytics requests in its own
// network log. A load without a log (Lighthouse threw twice) is unverified and also blocks
// publishing, because nothing proves it clean. Loads skipped for time were never made.
export function leakProof(perf) {
  const rows = perf?.rows ?? [];
  const attempted = rows.filter((r) => r.status !== 'skipped');
  const leaks = attempted.filter((r) => r.analyticsRequests > 0).map((r) => r.key);
  const unverified = attempted.filter((r) => r.analyticsRequests !== 0 && !(r.analyticsRequests > 0)).map((r) => r.key);
  const reason = leaks.length ? `the speed test reached analytics on ${leaks.length} of ${attempted.length} loads`
    : unverified.length ? `${unverified.length} of ${attempted.length} speed-test loads have no network log to prove zero analytics requests` : null;
  return {ok: !leaks.length && !unverified.length, attempted: attempted.length, leaks, unverified, reason};
}

// Area row for the report's summary table, in place of site-audit's weekly Performance line.
export function performanceArea(perf) {
  const d = summaryOf(perf) ?? {status: 'skipped', text: 'not measured today (the speed test did not run)'};
  return {id: 'performance', label: 'Performance', status: d.status === 'new' ? 'ok' : d.status, text: d.text};
}
