// Per-page Amplitude blocks, shared by the page cards (render.mjs: one line) and the detail pages
// (detail-page.mjs: charts). Lighthouse scores and vitals live on the detail pages only (gauges). Pure: data in, HTML out, inline SVG only. Amplitude numbers are wrapped in
// the analytics markers, so publish.mjs keeps them off the public copy unless publishAnalytics is set.
import {checker} from './checker.mjs';
import {cardNumbers, FUNNEL_WINDOW_SECONDS} from './page-analytics.mjs';
import {METRICS as CRUX_METRICS, KEYCHAIN_SERVICE as CRUX_KEYCHAIN} from './crux.mjs';

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

const RATING = {good: ['ok', 'Good'], 'needs-improvement': ['warn', 'Needs improvement'], poor: ['bad', 'Poor']};
const cruxValue = (m, unit) => (unit === 'ms' ? (m.p75 >= 1000 ? `${(m.p75 / 1000).toFixed(1)} s` : `${Math.round(m.p75)} ms`) : m.p75.toFixed(2));
// Detail page, beside the lab scores: 75th-percentile real-user vitals from CrUX for mobile and
// desktop (public Chrome data, so it is not wrapped in the analytics markers).
export function cruxSection(crux, pageId) {
  if (!crux || crux.status !== 'ok') return `<p class="muted">Real-user Core Web Vitals not available today (${escape(crux?.reason ?? `CrUX not configured; store a Google API key in the Keychain item "${CRUX_KEYCHAIN}"`)}).</p>`;
  const p = crux.pages?.[pageId] ?? {};
  const rows = ['mobile', 'desktop'].map((vp) => {
    const r = p[vp];
    if (!r || r.scope === 'none') return `<tr><td>${vp}</td><td colspan="${CRUX_METRICS.length + 1}" class="muted">Not enough Chrome traffic for this page or the site</td></tr>`;
    if (r.scope === 'error') return `<tr><td>${vp}</td><td colspan="${CRUX_METRICS.length + 1}" class="muted">Not available (${escape(r.error)})</td></tr>`;
    return `<tr><td>${vp}</td>${CRUX_METRICS.map(([id, , , , , unit]) => {
      const m = r.metrics?.[id];
      return m ? `<td><span class="b ${RATING[m.rating][0]}" title="${RATING[m.rating][1]}">${escape(cruxValue(m, unit))}</span></td>` : '<td class="muted">–</td>';
    }).join('')}<td>${r.scope === 'page' ? 'This page' : '<span class="muted">Whole site (page has too little traffic)</span>'}</td></tr>`;
  }).join('');
  const period = Object.values(p).find((r) => r?.period)?.period;
  return `<table class="crux"><tr><th>Viewport</th>${CRUX_METRICS.map((m) => `<th>${m[2]}</th>`).join('')}<th>Measured on</th></tr>${rows}</table>
<p class="muted">75th percentile of real Chrome visits over 28 days${period ? ` (${escape(period.from)} to ${escape(period.to)})` : ''}, from Google's Chrome UX Report. Core Web Vitals pass when LCP, INP and CLS are all green. Nothing loads the page to get these.</p>`;
}

export const METRICS_CSS = '.pm-amp{margin:10px 0 0;font-size:14px}.crux td,.crux th{white-space:nowrap}';
export {CHART_CSS};
