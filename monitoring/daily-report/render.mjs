// The page section is the page checker's own daily report, unchanged apart from
// its Unify title and Unify-only hero-heading table; the overall verdict,
// tracking section and nav table are added around it.
import {checker, siteAudit} from './checker.mjs';
import {overall, localAreas, MARK} from './summary.mjs';
import {pageName} from './performance.mjs';
import {privately, cardAnalytics, METRICS_CSS} from './page-metrics.mjs';

const {renderDailyReport, renderComparisonPage, deriveIssues, caseParts} = await checker('src/report-html.mjs');
const {chartsSection, seriesCards} = await siteAudit('src/daily/charts.mjs');

// Traffic and conversion numbers sit between the analytics markers (page-metrics.mjs); publish.mjs
// removes them from the public copy unless site-audit config/daily.json sets publishAnalytics.
export {PRIVATE_START, PRIVATE_END} from './page-metrics.mjs';

const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-US', {timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) + ' PT' : 'never');
const num = (n) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));
const pct = (n) => (n == null ? '–' : `${n > 0 ? '+' : ''}${Math.round(n)}%`);
const badge = {ok: '<span class="b ok">OK</span>', changed: '<span class="b warn">Changed</span>', issue: '<span class="b bad">Issue</span>', error: '<span class="b bad">Error</span>'};
// Published pages must not carry local paths.
const scrub = (s) => String(s ?? '').replace(/\/(Users|private|tmp|var)\/\S+/g, '[local path]');

function trackingSection(report) {
  const m = report.tracking?.monitor, ev = report.tracking?.events;
  if (!m && !ev) return '<h2>Tracking</h2><p class="muted">Tracking checks have not run yet.</p>';
  const list = (items, level) => items.map((i) => `<li class="${level}"><strong>${escape(scrub(i))}</strong></li>`).join('');
  const monitor = m ? `<p>Hourly tracking monitor: <strong>${m.status === 'ok' ? 'healthy' : 'needs a look'}</strong>. Last check ${escape(when(m.lastCheckedAt))} (${escape(m.decision ?? 'no decision')}); ${m.runsLast24h} runs in the last 24h, ${m.failingRunsLast24h} with failures.
    UTM handoff: ${m.utm ? `${m.utm.failures} failures across ${m.utm.cases} cases` : 'no results'}. Signup links and events: ${m.site ? `${m.site.failures} findings across ${m.site.cases} cases` : 'no results'}.</p>
    ${m.issues.length ? `<ul class="issues">${list(m.issues, 'issue')}</ul>` : ''}
    ${m.reportOnly.length ? `<details class="tech"><summary>${m.reportOnly.length} report-only finding${m.reportOnly.length > 1 ? 's' : ''} from the monitor (page script errors, not alerted)</summary><ul class="issues">${list(m.reportOnly, 'known')}</ul></details>` : ''}` : '';
  let events;
  if (!ev || ev.status === 'not-configured') events = `<p class="muted">Amplitude event volumes: ${escape(ev?.note ?? 'not run')}</p>`;
  else events = `<table><tr><th>Event (Amplitude ${escape(ev.window?.yesterday ?? '')})</th><th>Yesterday</th><th>Same day last week</th><th>7-day avg</th><th></th><th>Note</th></tr>${ev.events.map((e) => `<tr><td>${escape(e.label)}</td><td>${num(e.yesterday)}</td><td>${num(e.lastWeek)} <span class="muted">${pct(e.vsLastWeek)}</span></td><td>${num(e.avg7)} <span class="muted">${pct(e.vsAvg7)}</span></td><td>${badge[e.status] ?? ''}</td><td>${escape(e.reason ?? '')}</td></tr>`).join('')}</table>
    <p class="muted">Flags only when yesterday is 30%+ (changed) or 50%+ (issue) below both last week and the 7-day average, doubles vs both, or hits zero; tiny baselines are ignored. Any "| Other" CTA click is an issue.</p>`;
  return `<h2>Tracking</h2>${monitor}${events}`;
}

function googleHtml(report) {
  const g = report.google;
  if (!g) return '';
  if (g.status === 'not-configured') return `<h2>GA4 and Search Console</h2><p class="muted">${escape(g.note)}</p>`;
  const val = (m) => (m.unit === '%' ? `${(m.value ?? 0).toFixed(1)}%` : m.unit === '' ? (m.value ?? 0).toFixed(1) : num(m.value));
  const base = (m) => (m.baseline == null ? '–' : m.unit === '%' ? `${m.baseline.toFixed(1)}%` : m.unit === '' ? m.baseline.toFixed(1) : num(m.baseline));
  const metricTable = (metrics, baseLabel) => `<table><tr><th>Metric</th><th>Value</th><th>${baseLabel}</th><th>Change</th><th></th><th>Note</th></tr>${metrics.map((m) => `<tr><td>${escape(m.label)}</td><td>${val(m)}</td><td>${base(m)}</td><td>${pct(m.change)}</td><td>${badge[m.status] ?? ''}</td><td>${escape(m.reason ?? '')}</td></tr>`).join('')}</table>`;
  const rows = (items, cols) => `<table><tr>${cols.map((c) => `<th>${c[0]}</th>`).join('')}</tr>${items.map((r) => `<tr>${cols.map((c) => `<td>${escape(c[1](r))}</td>`).join('')}</tr>`).join('')}</table>`;
  let html = '<h2>GA4 and Search Console</h2>';
  const ga = g.ga4;
  if (ga?.status === 'ok') html += `<p>GA4 property ${escape(ga.property)}, ${escape(ga.date)} vs the average of the same weekday over the previous ${ga.baselineDays} weeks.</p>${metricTable(ga.metrics, 'Same-weekday avg')}
    <details class="tech"><summary>Top pages and channels by sessions, ${escape(ga.date)}</summary>${rows(ga.topPages, [['Page', (r) => r.path], ['Sessions', (r) => num(r.sessions)], ['Users', (r) => num(r.users)], ['Key events', (r) => num(r.keyEvents)]])}${rows(ga.channels, [['Channel', (r) => r.channel], ['Sessions', (r) => num(r.sessions)]])}</details>`;
  else if (ga) html += `<p class="muted">GA4${ga.status === 'error' ? '' : ' skipped'}: ${escape(ga.note ?? ga.reason)}</p>`;
  for (const s of g.searchConsole ?? []) {
    if (s.status !== 'ok') { html += `<p class="muted">Search Console ${escape(s.site)}${s.status === 'error' ? '' : ' skipped'}: ${escape(s.note ?? s.reason)}</p>`; continue; }
    if (!s.latest) { html += `<p class="muted">Search Console ${escape(s.site)}: no final data in the last 17 days.</p>`; continue; }
    html += `<p>Search Console ${escape(s.site)}, ${escape(s.latest)} (latest final day; Search Console runs 2–3 days behind) vs the average of the ${s.priorDays} days before.</p>${metricTable(s.metrics, 'Prior 7-day avg')}
      <details class="tech"><summary>Top queries and pages, ${escape(s.latest)}</summary>${rows(s.topQueries, [['Query', (r) => r.key], ['Clicks', (r) => num(r.clicks)], ['Impressions', (r) => num(r.impressions)], ['CTR', (r) => r.ctr.toFixed(1) + '%'], ['Position', (r) => (r.position ?? 0).toFixed(1)]])}${rows(s.topPages, [['Page', (r) => r.key], ['Clicks', (r) => num(r.clicks)], ['Impressions', (r) => num(r.impressions)], ['CTR', (r) => r.ctr.toFixed(1) + '%'], ['Position', (r) => (r.position ?? 0).toFixed(1)]])}</details>`;
  }
  return html;
}

function formsTable(report) {
  const rows = (report.forms ?? []).flatMap((f) => [
    ...(f.quiz ? [[f.key, 'Quiz', f.quiz.status, f.quiz.detail]] : []),
    ...(f.search ?? []).map((m) => [f.key, `Insurance search · ${m.module}`, m.status, m.detail]),
    ...(f.error ? [[f.key, 'Check', 'fail', f.error]] : [])]);
  if (!rows.length) return '';
  const known = (report.runs ?? []).flatMap((r) => r.results).filter((r) => r.health?.knownErrors?.length);
  return `<details class="tech" open><summary>Quiz and insurance search (${rows.filter((r) => r[2] === 'pass').length}/${rows.length} working)</summary><table><tr><th>Case</th><th>Check</th><th>Result</th><th>Detail</th></tr>${rows.map((r) => `<tr><td>${escape(r[0])}</td><td>${escape(r[1])}</td><td>${r[2] === 'pass' ? badge.ok : badge.issue}</td><td>${escape(r[3])}</td></tr>`).join('')}</table>${known.length ? `<p class="muted">Known third-party error on ${known.length} page state${known.length > 1 ? 's' : ''}, not counted as an issue: ${escape(known[0].health.knownErrors[0].message)} (${escape(known[0].health.knownErrors[0].reason)}).</p>` : ''}</details>`;
}

function navTable(report) {
  if (!report.nav?.length) return '';
  return `<details class="tech"><summary>Navigation and menu checks (${report.nav.filter((n) => n.status === 'pass').length}/${report.nav.length} passed)</summary><table><tr><th>Case</th><th>Kind</th><th>Result</th><th>Detail</th></tr>${report.nav.map((n) => `<tr><td>${escape(n.key)}</td><td>${escape(n.kind)}</td><td>${n.status === 'pass' ? badge.ok : badge.issue}</td><td>${escape(n.assertion)}</td></tr>`).join('')}</table></details>`;
}

export function renderNourishReport(report, root) {
  const o = overall(report, deriveIssues(report));
  let html = renderDailyReport(report, root)
    .replaceAll('Unify daily visual check', 'Nourish daily site check')
    .replace('runs around 8 AM PT while this Mac is on', 'runs around 8:30 AM PT while this Mac is on')
    .replace(/<details class="tech"><summary>Home hero heading[\s\S]*?<\/details>\n?/, '');
  // Page cards: Nourish names instead of config ids (the checker only knows Unify's labels).
  const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Each card also gets its Amplitude line above its links. Lighthouse scores and lab vitals are on
  // the detail pages only (Gemin, Oct 29 2026: "detail pages only"), never on the cards.
  for (const id of new Set((report.runs ?? []).flatMap((r) => r.results).map((r) => caseParts(r.key).pageId))) {
    const name = escape(pageName(id));
    const metrics = `<div class="pm-card">${cardAnalytics(report.pageAnalytics, id)}</div>`;
    html = html.replace(new RegExp(`(<h3><a href="pages/${re(id)}\\.html">)[^<]*(</a>)`), `$1${name}$2`)
      .replace(new RegExp(`(<a href="pages/${re(id)}\\.html" aria-label=")[^"]*(")`), `$1${name} details$2`)
      .replace(`<p><a href="pages/${id}.html">Details and analytics →</a>`, (m) => metrics + m);
  }
  html = html.replace('</style>', () => METRICS_CSS + '</style>');
  const top = `<section class="verdict ${o.tone}"><strong>${escape(o.headline)}</strong>Pages: ${o.newIssues.length} new issue${o.newIssues.length === 1 ? '' : 's'}, ${o.standing.length} still open, ${o.pageChanges.length} visual change${o.pageChanges.length === 1 ? '' : 's'}. Tracking and analytics: ${o.trackingIssues.length} issue${o.trackingIssues.length === 1 ? '' : 's'}, ${o.trackingChanges.length} change${o.trackingChanges.length === 1 ? '' : 's'}.</section>
${privately(`<table class="areas">${[...localAreas(report, o), ...(report.areas ?? [])].map((a) => `<tr><td>${MARK[a.status] ?? '⚪'}</td><th>${escape(a.label)}</th><td>${escape(a.text)}</td></tr>`).join('')}</table>
${chartsSection({cards: seriesCards({amplitude: report.tracking?.events, google: report.google}), links: report.dashboardLinks ?? [], note: 'Last 14 days per day; the darkest column is the latest day.'})}
${trackingSection(report)}
${googleHtml(report)}`)}
<h2>Pages and visuals</h2>`;
  // The checker's own verdict box doesn't know which issues are still open; the top one replaces it.
  html = html.replace(/<section class="verdict[^"]*">[\s\S]*?<\/section>/, () => top);
  return html.replace('<details class="tech"><summary>Run log', () => formsTable(report) + navTable(report) + '\n<details class="tech"><summary>Run log');
}

export function renderNourishComparison(report, root) {
  return renderComparisonPage(report, root).replaceAll('Unify visual check', 'Nourish site check');
}
