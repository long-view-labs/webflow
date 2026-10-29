// Per-page Amplitude blocks, shared by the page cards (render.mjs: one line) and the detail pages
// (detail-page.mjs: charts). Lighthouse scores and vitals live on the detail pages only (gauges). Pure: data in, HTML out, inline SVG only. Amplitude numbers are wrapped in
// the analytics markers, so publish.mjs keeps them off the public copy unless publishAnalytics is set.
import {checker} from './checker.mjs';
import {cardNumbers, FUNNEL_WINDOW_SECONDS} from './page-analytics.mjs';

const {escape} = await checker('src/report-html.mjs');
const {columnsChart, funnelChart, CHART_CSS} = await checker('src/charts.mjs');

export const PRIVATE_START = '<!--analytics:start-->', PRIVATE_END = '<!--analytics:end-->';
export const privately = (html) => `${PRIVATE_START}${html}${PRIVATE_END}`;

const num = (n) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));
const pct = (n) => (n == null ? '–' : `${n < 10 ? n.toFixed(1) : Math.round(n)}%`);

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

export const METRICS_CSS = '.pm-amp{margin:10px 0 0;font-size:14px}';
export {CHART_CSS};
