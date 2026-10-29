// Per-page performance and Amplitude blocks, shared by the page cards (render.mjs) and the detail
// pages (detail-page.mjs). Pure: data in, HTML out, inline SVG only. Amplitude numbers are wrapped in
// the analytics markers, so publish.mjs keeps them off the public copy unless publishAnalytics is set.
import {checker} from './checker.mjs';
import {cardNumbers, FUNNEL_WINDOW_SECONDS} from './page-analytics.mjs';

const {escape} = await checker('src/report-html.mjs');
const {band} = await checker('src/gauges.mjs');
const {columnsChart, funnelChart, CHART_CSS} = await checker('src/charts.mjs');

export const PRIVATE_START = '<!--analytics:start-->', PRIVATE_END = '<!--analytics:end-->';
export const privately = (html) => `${PRIVATE_START}${html}${PRIVATE_END}`;

const CHIP = {good: 'ok', average: 'warn', poor: 'bad'};
const num = (n) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));
const pct = (n) => (n == null ? '–' : `${n < 10 ? n.toFixed(1) : Math.round(n)}%`);
const chip = (v) => (Number.isFinite(v) ? `<span class="b ${CHIP[band(v)]}">${Math.round(v)}</span>` : '<span class="b">–</span>');
const secs = (ms) => (Number.isFinite(ms) ? `${(ms / 1000).toFixed(1)} s` : '–');
const ms = (v) => (Number.isFinite(v) ? `${Math.round(v)} ms` : '–');
const cls = (v) => (Number.isFinite(v) ? v.toFixed(3) : '–');

// Lab Core Web Vitals thresholds (LCP and CLS as in CWV; TBT stands in for INP in a lab load).
const vital = (value, good, poor, text) => (Number.isFinite(value) ? `<span class="v ${value <= good ? 'ok' : value > poor ? 'bad' : 'warn'}">${text}</span>` : '–');

// Desktop and mobile: the four Lighthouse scores and LCP / CLS / TBT, median of the day's loads.
export function perfTable(rows) {
  const byVp = ['desktop', 'mobile'].map((vp) => rows.find((r) => r.viewport === vp)).filter(Boolean);
  if (!byVp.length) return '<p class="muted pm-none">Lighthouse was not measured for this page today.</p>';
  const runs = Math.max(0, ...byVp.map((r) => r.runs ?? 1));
  return `<table class="pm"><tr><th>Lighthouse</th><th>Perf.</th><th>Access.</th><th>Best pr.</th><th>SEO</th><th>LCP</th><th>CLS</th><th>TBT</th></tr>${byVp.map((r) => {
    if (r.status !== 'measured') return `<tr><td>${escape(r.viewport)}</td><td colspan="7" class="muted">not measured (${escape(r.error ?? 'no score')})</td></tr>`;
    const s = r.scores ?? {};
    return `<tr><td>${escape(r.viewport)}</td><td>${chip(r.score)}</td><td>${chip(s.accessibility)}</td><td>${chip(s.bestPractices)}</td><td>${chip(s.seo)}</td><td>${vital(r.lcpMs, 2500, 4000, secs(r.lcpMs))}</td><td>${vital(r.cls, 0.1, 0.25, cls(r.cls))}</td><td>${vital(r.tbtMs, 200, 600, ms(r.tbtMs))}</td></tr>`;
  }).join('')}</table><p class="muted pm-note">Lab, ${runs > 1 ? `median of ${runs} loads` : 'one load'} per viewport, analytics blocked.${byVp.some((r) => r.spread && r.spread[1] - r.spread[0] > 0) ? ` Performance spread today: ${byVp.filter((r) => r.spread).map((r) => `${escape(r.viewport)} ${r.spread[0]}–${r.spread[1]}`).join(', ')}.` : ''}</p>`;
}

// One line on the card: last 7 days of views, Get Started clicks and click → FlowLoaded.
export function cardAnalytics(analytics, pageId) {
  if (!analytics || analytics.status !== 'ok') return privately(`<p class="muted pm-amp">Amplitude per-page numbers not available today (${escape(analytics?.reason ?? 'not fetched')}).</p>`);
  const p = analytics.pages?.[pageId];
  const n = cardNumbers(p);
  if (!n) return privately('<p class="muted pm-amp">Amplitude: this page was not queried.</p>');
  const parts = [
    `<strong>${num(n.views)}</strong> page views`,
    `<strong>${num(n.clicks)}</strong> Get Started clicks${n.clickRate != null ? ` <span class="muted">(${pct(n.clickRate)} of views)</span>` : ''}`,
    p.funnel === null ? `click → FlowLoaded not available (${escape(p.errors?.funnel ?? 'error')})`
      : n.clickers ? `<strong>${pct(n.conversion)}</strong> of ${num(n.clickers)} clickers reached FlowLoaded` : 'no clickers to convert',
  ];
  return privately(`<p class="pm-amp"><span class="muted">Amplitude, last ${analytics.cardDays ?? 7} days:</span> ${parts.join(' · ')}</p>`);
}

const note = (m) => `<p class="muted">Not available today (${escape(m)}).</p>`;
// Detail page: daily views and clicks (30 days) and the 7-day click → FlowLoaded funnel.
export function analyticsSection(analytics, pageId) {
  if (!analytics || analytics.status !== 'ok' || !analytics.pages?.[pageId]) {
    return privately(`<p class="muted">Amplitude per-page numbers not available today (${escape(analytics?.reason ?? 'not fetched')}).</p>`);
  }
  const p = analytics.pages[pageId], days = analytics.days;
  const n = cardNumbers(p);
  return privately(`
<h3>Page views per day (Viewed Page)</h3>${p.views ? columnsChart({days, values: p.views, noun: 'views'}) : note(p.errors.views)}
<h3>Get Started clicks per day</h3>${p.clicks ? columnsChart({days, values: p.clicks, noun: 'clicks'}) : note(p.errors.clicks)}
<h3>Click → signup flow, last ${analytics.cardDays ?? 7} days (people)</h3>${Array.isArray(p.funnel) && p.funnel[0].people ? funnelChart({steps: p.funnel}) + `<p class="muted">${pct(n.conversion)} of people who clicked Get Started here reached FlowLoaded within ${FUNNEL_WINDOW_SECONDS / 3600} hours.</p>` : Array.isArray(p.funnel) ? '<p class="muted">Nobody clicked Get Started on this page in the window.</p>' : note(p.errors.funnel ?? 'error')}
<p class="muted">Last ${days.length} Pacific days ending yesterday, Amplitude project 373727, matched on the page path (${escape(p.path)}). Counts only; no individual visitors are shown.</p>`);
}

export const METRICS_CSS = '.pm{margin-top:10px}.pm td,.pm th{padding:5px 6px}.pm-note,.pm-none{font-size:13px;margin:4px 0 0}.pm-amp{margin:10px 0 0;font-size:14px}.v{font-weight:600}.v.ok{color:var(--good)}.v.warn{color:var(--warn)}.v.bad{color:var(--bad)}';
export {CHART_CSS};
