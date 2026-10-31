// The main report page (index.html), written as Nourish's own dashboard (dashboard.mjs, Oct 30
// 2026 restyle): verdict, one tile per area, then one card per section. The page checker supplies
// the per-state status (caseStatus) and the issue list (deriveIssues); its own report HTML is no
// longer used for the main page, only for the side-by-side comparison page.
import path from 'node:path';
import {checker, siteAudit} from './checker.mjs';
import {overall, localAreas, MARK} from './summary.mjs';
import {pageName} from './performance.mjs';
import {privately, cardAnalytics, METRICS_CSS} from './page-metrics.mjs';
import {TRUSTPILOT_BUSINESS_UNIT, IDLE_MS} from './console-check.mjs';
import {escape, doc, card, bd, tw, disc, dot, tile, count, FILTER_JS} from './dashboard.mjs';

const {renderComparisonPage, deriveIssues, caseParts, caseStatus, STATE_LABELS} = await checker('src/report-html.mjs');
const {VISUAL_CHANGE_PERCENT} = await checker('src/candidate-diff.mjs');
const {caseLabel} = await checker('src/labels.mjs');
const {chartsSection, seriesCards} = await siteAudit('src/daily/charts.mjs');

// Traffic and conversion numbers sit between the analytics markers (page-metrics.mjs); publish.mjs
// removes them from the public copy unless site-audit config/daily.json sets publishAnalytics.
export {PRIVATE_START, PRIVATE_END} from './page-metrics.mjs';

const TITLE = 'Nourish daily site check';
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-US', {timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) + ' PT' : 'never');
const num = (n) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));
const pct = (n) => (n == null ? '–' : `${n > 0 ? '+' : ''}${Math.round(n)}%`);
const badge = {ok: '<span class="b ok">OK</span>', changed: '<span class="b warn">Changed</span>', issue: '<span class="b bad">Issue</span>', error: '<span class="b bad">Error</span>'};
const STATE_BADGE = {ok: '<span class="b ok">OK</span>', changed: '<span class="b warn">Changed</span>', issue: '<span class="b bad">Issue</span>', unverified: '<span class="b">Not compared</span>', expected: '<span class="b">Expected change</span>'};
const PERF_BADGE = {ok: '<span class="b ok">OK</span>', changed: '<span class="b warn">Check</span>', issue: '<span class="b bad">Regressed</span>', skipped: '<span class="b">Not measured</span>', new: '<span class="b">First day</span>'};
const PERF_DOT = {ok: 'ok', changed: 'warn', issue: 'bad'};
const TONE_DOT = {good: 'ok', warn: 'warn', bad: 'bad'};
// Published pages must not carry local paths.
const scrub = (s) => String(s ?? '').replace(/\/(Users|private|tmp|var)\/\S+/g, '[local path]');
const table = (head, rows) => `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.join('')}</table>`;

// Tile from a list of [count, label]: the first non-zero count is the big number.
function countTile(label, counts, {href = null} = {}) {
  const pick = counts.find(([n]) => n > 0) ?? counts[0];
  const others = counts.filter((c) => c !== pick);
  const state = counts.some(([n, , s]) => n > 0 && s === 'bad') ? 'bad' : counts.some(([n, , s]) => n > 0 && s === 'warn') ? 'warn' : 'ok';
  return tile({label, value: pick[0], unit: pick[1], sub: others.map(([n, l]) => `${n} ${l}`).join(' · '), state, href});
}

function trackingCard(report) {
  const m = report.tracking?.monitor, ev = report.tracking?.events;
  if (!m && !ev) return card('tracking', 'Tracking', bd('<p class="muted">Tracking checks have not run yet.</p>'));
  const list = (items, level) => items.map((i) => `<li class="${level}"><strong>${escape(scrub(i))}</strong></li>`).join('');
  const monitor = m ? `<p>Hourly tracking monitor: <strong>${m.status === 'ok' ? 'healthy' : 'needs a look'}</strong>. Last check ${escape(when(m.lastCheckedAt))} (${escape(m.decision ?? 'no decision')}); ${m.runsLast24h} runs in the last 24h, ${m.failingRunsLast24h} with failures.
    UTM handoff: ${m.utm ? `${m.utm.failures} failures across ${m.utm.cases} cases` : 'no results'}. Signup links and events: ${m.site ? `${m.site.failures} findings across ${m.site.cases} cases` : 'no results'}.</p>
    ${m.issues.length ? `<ul>${list(m.issues, 'issue')}</ul>` : ''}` : '';
  const reportOnly = m?.reportOnly?.length ? disc(`${m.reportOnly.length} report-only finding${m.reportOnly.length > 1 ? 's' : ''} from the monitor (page script errors, not alerted)`, `<ul class="issues">${list(m.reportOnly, 'known')}</ul>`) : '';
  if (!ev || ev.status === 'not-configured') return card('tracking', 'Tracking', bd(`${monitor}<p class="muted">Amplitude event volumes: ${escape(ev?.note ?? 'not run')}</p>`) + reportOnly);
  const rows = ev.events.map((e) => `<tr><td>${escape(e.label)}</td><td class="n">${num(e.yesterday)}</td><td class="n">${num(e.lastWeek)} <span class="muted">${pct(e.vsLastWeek)}</span></td><td class="n">${num(e.avg7)} <span class="muted">${pct(e.vsAvg7)}</span></td><td>${badge[e.status] ?? ''}</td><td>${escape(e.reason ?? '')}</td></tr>`);
  return card('tracking', 'Tracking', bd(monitor) + reportOnly
    + tw(table([`Event (Amplitude ${escape(ev.window?.yesterday ?? '')})`, 'Yesterday', 'Same day last week', '7-day avg', '', 'Note'], rows))
    + bd('<p class="muted">Flags only when yesterday is 30%+ (changed) or 50%+ (issue) below both last week and the 7-day average, doubles vs both, or hits zero; tiny baselines are ignored. Any "| Other" CTA click is an issue.</p>'));
}

function googleCard(report) {
  const g = report.google;
  if (!g) return '';
  if (g.status === 'not-configured') return card('google', 'GA4 and Search Console', bd(`<p class="muted">${escape(g.note)}</p>`));
  const val = (m) => (m.unit === '%' ? `${(m.value ?? 0).toFixed(1)}%` : m.unit === '' ? (m.value ?? 0).toFixed(1) : num(m.value));
  const base = (m) => (m.baseline == null ? '–' : m.unit === '%' ? `${m.baseline.toFixed(1)}%` : m.unit === '' ? m.baseline.toFixed(1) : num(m.baseline));
  const metricTable = (metrics, baseLabel) => `<div class="tw">${table(['Metric', 'Value', baseLabel, 'Change', '', 'Note'], metrics.map((m) => `<tr><td>${escape(m.label)}</td><td class="n">${val(m)}</td><td class="n">${base(m)}</td><td class="n">${pct(m.change)}</td><td>${badge[m.status] ?? ''}</td><td>${escape(m.reason ?? '')}</td></tr>`))}</div>`;
  const rows = (items, cols) => `<div class="tw">${table(cols.map((c) => c[0]), items.map((r) => `<tr>${cols.map((c) => `<td>${escape(c[1](r))}</td>`).join('')}</tr>`))}</div>`;
  let body = '', extra = '';
  const ga = g.ga4;
  if (ga?.status === 'ok') {
    body += `<p>GA4 property ${escape(ga.property)}, ${escape(ga.date)} vs the average of the same weekday over the previous ${ga.baselineDays} weeks.</p>${metricTable(ga.metrics, 'Same-weekday avg')}`;
    extra += disc(`Top pages and channels by sessions, ${escape(ga.date)}`, rows(ga.topPages, [['Page', (r) => r.path], ['Sessions', (r) => num(r.sessions)], ['Users', (r) => num(r.users)], ['Key events', (r) => num(r.keyEvents)]]) + rows(ga.channels, [['Channel', (r) => r.channel], ['Sessions', (r) => num(r.sessions)]]));
  } else if (ga) body += `<p class="muted">GA4${ga.status === 'error' ? '' : ' skipped'}: ${escape(ga.note ?? ga.reason)}</p>`;
  for (const s of g.searchConsole ?? []) {
    if (s.status !== 'ok') { body += `<p class="muted">Search Console ${escape(s.site)}${s.status === 'error' ? '' : ' skipped'}: ${escape(s.note ?? s.reason)}</p>`; continue; }
    if (!s.latest) { body += `<p class="muted">Search Console ${escape(s.site)}: no final data in the last 17 days.</p>`; continue; }
    body += `<p>Search Console ${escape(s.site)}, ${escape(s.latest)} (latest final day; Search Console runs 2–3 days behind) vs the average of the ${s.priorDays} days before.</p>${metricTable(s.metrics, 'Prior 7-day avg')}`;
    extra += disc(`Top queries and pages, ${escape(s.latest)}`, rows(s.topQueries, [['Query', (r) => r.key], ['Clicks', (r) => num(r.clicks)], ['Impressions', (r) => num(r.impressions)], ['CTR', (r) => r.ctr.toFixed(1) + '%'], ['Position', (r) => (r.position ?? 0).toFixed(1)]]) + rows(s.topPages, [['Page', (r) => r.key], ['Clicks', (r) => num(r.clicks)], ['Impressions', (r) => num(r.impressions)], ['CTR', (r) => r.ctr.toFixed(1) + '%'], ['Position', (r) => (r.position ?? 0).toFixed(1)]]));
  }
  return card('google', 'GA4 and Search Console', bd(body) + extra);
}

// Console and network errors per page state (console-check.mjs). The same findings also show on
// the page rows through the health result; this is the cross-site view.
function consoleParts(report) {
  const rows = report.console ?? [];
  if (!rows.length) return null;
  const failing = rows.filter((r) => r.status === 'fail'), broken = rows.filter((r) => r.status === 'error');
  const widgets = rows.reduce((n, r) => n + (r.widgets ?? 0), 0);
  const status = failing.length ? `<span class="b bad">${failing.length} of ${rows.length}</span>` : '<span class="b ok">OK</span>';
  const list = failing.map((r) => `<tr><td><a href="pages/${escape(caseParts(r.key).pageId)}.html">${escape(pageName(caseParts(r.key).pageId))}</a> · ${escape(caseParts(r.key).viewport)}</td><td>${r.issues.map((i) => `${escape(i.detail)}${i.url ? `<br><span class="muted">${escape(i.url)}</span>` : ''}`).join('<br>')}</td></tr>`);
  const html = card('console', 'Console and network', bd(`<p>${failing.length ? `${failing.length} of ${rows.length} page states logged errors or had requests fail` : `No console errors or failed requests on ${rows.length} page states`}. ${widgets} Trustpilot widget${widgets === 1 ? '' : 's'} checked for business unit ${escape(TRUSTPILOT_BUSINESS_UNIT)}.${broken.length ? ` <span class="muted">${broken.length} page state${broken.length === 1 ? '' : 's'} could not be checked.</span>` : ''}</p>`)
    + (list.length ? tw(table(['Page', 'What failed'], list)) : '')
    + disc('How this is checked', `<p>A fresh load of each page state with ${IDLE_MS / 1000} s idle, analytics and writes blocked as in the other checks. Requests the check blocks, and console errors that only report them, are not counted; any 4xx from a widget API (Trustpilot) always is.</p>`), {badge: status});
  const tileHtml = failing.length
    ? tile({label: 'Console and network', value: failing.length, unit: 'of ' + rows.length + ' page states', sub: 'logged errors or failed requests', state: 'bad', href: '#console'})
    : tile({label: 'Console and network', value: 0, unit: 'errors', sub: `${rows.length} page states · ${widgets} Trustpilot widget${widgets === 1 ? '' : 's'}`, state: 'ok', href: '#console'});
  return {html, tile: tileHtml};
}

// Search indexing (seo-check.mjs): sitemap URLs serving noindex, ad/variant pages left indexable,
// sitemap URLs that redirect, and a site-wide Trustpilot id scan of the same HTML.
const SEO_KIND = {'noindex-in-sitemap': 'In the sitemap but noindex', 'ad-page-indexable': 'Ad/variant page is indexable', 'sitemap-not-200': 'Sitemap URL redirects or errors', 'trustpilot-id': 'Retired Trustpilot id', 'fetch-failed': 'Could not fetch'};
function seoCard(report, o) {
  const s = report.seo;
  if (!s) return '';
  if (s.status === 'error' && !s.rows?.length) return card('search', 'Search indexing', bd(`<p class="muted">Not checked today (${escape(s.reason)}).</p>`));
  const row = (i, tag) => `<tr><td>${tag}</td><td>${escape(SEO_KIND[i.kind] ?? i.kind)}</td><td><a href="${escape('https://www.nourish.com' + i.path)}" rel="noopener noreferrer">${escape(i.path)}</a></td><td>${escape(i.detail)}</td></tr>`;
  const rows = [...o.seoNew.map((i) => row(i, '<span class="b bad">New</span>')), ...o.seoStanding.map((i) => row(i, '<span class="b bad">Still open</span>')), ...o.seoReview.map((i) => row(i, '<span class="b warn">Review</span>'))];
  const open = o.seoNew.length + o.seoStanding.length;
  const status = `${open ? `<span class="b bad">${count(open, 'issue')}</span>` : '<span class="b ok">No issues</span>'}${o.seoReview.length ? ` · ${o.seoReview.length} to review` : ''}`;
  const known = (s.known ?? []).map((k) => `<li>${escape(k.note)}: ${count(k.paths.length, 'page')} <span class="muted">(${escape(k.paths.slice(0, 3).join(', '))}${k.paths.length > 3 ? ', …' : ''})</span></li>`).join('');
  return card('search', 'Search indexing', bd(`<p class="stats"><span><b>${s.sitemapCount}</b> URLs in the sitemap</span><span><b>${s.checked}</b> pages checked</span><span><b>${s.indexable}</b> indexable</span></p>${rows.length ? tw(table(['', 'Finding', 'Page', 'Detail'], rows)) : ''}`)
    + (known ? disc('Known and accepted for now, not counted', `<ul>${known}</ul>`) : '')
    + disc('How this is checked', '<p>Plain requests to the sitemap, every URL in it, the static pages it leaves out (pages/static-paths.txt) and this report\'s pages; no JavaScript runs. Ad and variant pages (/paid*, /landing-pages/*, /landing/*, /lp-*, -b/-c variants, /dev/*, /wip/*, /forbes, /money-saving-mom, employer pages, /nutrition-program) must be noindex; /quiz/*, /gut-health-quiz, /signup/weight-loss, /refer, /refer-a-friend and /condition/glp-1s (the organic GLP-1 page) are indexable on purpose.</p>'), {right: status});
}

// Lighthouse summary: one row per score drop; the gauges and metrics are on the detail pages.
function performanceParts(perf) {
  if (!perf?.text) return {html: card('performance', 'Performance', bd('<p class="muted">Performance was not measured in this run.</p>')), tile: tile({label: 'Performance', value: 'Not measured', href: '#performance'})};
  const drops = perf.regressions ?? [];
  const note = `<p class="muted">${perf.source === 'psi' ? "Scores come from PageSpeed Insights (Google's servers), with the site's analytics and ad tags switched off for the test. A page that PageSpeed could not score falls back to this Mac and is marked on its detail page. " : ''}Scores, metrics and real-user numbers for every page, desktop and mobile, are on each page's details.</p>`;
  const [head, tail] = perf.text.includes(':') ? [perf.text.slice(0, perf.text.indexOf(':')), perf.text] : ['', perf.text];
  const rows = drops.map((g) => `<tr><td><a href="pages/${escape(g.pageId)}.html">${escape(pageName(g.pageId))}</a></td><td>${escape(g.viewport)}</td><td class="n">${escape(g.before)}</td><td class="n">${escape(g.after)}</td><td class="n" style="color:var(--bad)">−${g.before - g.after}</td></tr>`);
  const html = card('performance', 'Performance', (drops.length && head ? '' : bd(`<p>${escape(tail)}</p>`)) + (rows.length ? tw(table(['Page', 'Viewport', 'Yesterday', 'Today', 'Change'], rows)) : '') + bd(note),
    {badge: PERF_BADGE[perf.status] ?? '', right: drops.length && head ? escape(head) : ''});
  const t = drops.length ? tile({label: 'Performance', value: drops.length, unit: 'dropped', sub: 'since yesterday', state: PERF_DOT[perf.status], href: '#performance'})
    : tile({label: 'Performance', value: (PERF_BADGE[perf.status] ?? '').replace(/<[^>]+>/g, '') || '–', sub: escape(perf.text), state: PERF_DOT[perf.status], href: '#performance'});
  return {html, tile: t};
}

function issuesCard(issues) {
  const order = {issue: 0, changed: 1, known: 2};
  const kind = {issue: '<span class="b bad">New issue</span>', changed: '<span class="b warn">Changed</span>', known: '<span class="b">Known</span>'};
  if (!issues.now.length) return card('issues', 'Issues', bd('<p class="empty"><span class="dot ok"></span>Nothing new today.</p>'));
  const rows = [...issues.now].sort((a, b) => (order[a.level] ?? 3) - (order[b.level] ?? 3))
    .map((i) => `<tr><td>${kind[i.level] ?? escape(i.level)}</td><td>${escape(i.title)}</td><td class="muted">${escape(i.detail)}</td></tr>`);
  return card('issues', 'Issues', tw(table(['Type', 'Issue', 'Detail'], rows)));
}

// One row per page: thumbnail, name and URL (plus any score-drop badge and the private Amplitude
// line), each viewport's state badges with their screenshots, and the page's links.
function pagesCard(report, root, pages, drops) {
  const rel = (p) => (p && root ? path.relative(root, p).split(path.sep).join('/') : null);
  const notes = pages.flatMap((p) => p.cases.map((c) => c.s.reasons.join('; ')));
  const shared = notes.length && notes.every((n) => n && n === notes[0]) ? notes[0] : null;
  const rank = (p) => (p.cases.some((c) => c.s.status === 'issue') || drops.some((g) => g.pageId === p.id) ? 0 : p.cases.some((c) => c.s.status === 'changed') ? 1 : 2);
  const rows = pages.map((p, i) => ({p, i, rank: rank(p)})).sort((a, b) => a.rank - b.rank || a.i - b.i).map(({p}) => {
    const name = escape(pageName(p.id));
    const thumb = p.cases.find((c) => caseParts(c.r.key).state === 'default' && caseParts(c.r.key).viewport === 'desktop') ?? p.cases[0];
    const img = rel(thumb?.r.visual?.image);
    const flags = drops.filter((g) => g.pageId === p.id).map((g) => `<span class="b bad">${escape(g.viewport)} ${escape(g.before)} → ${escape(g.after)}</span>`).join('');
    const vp = (viewport) => p.cases.filter((c) => caseParts(c.r.key).viewport === viewport).map(({r, s}) => {
      const state = caseParts(r.key).state, shot = rel(r.visual?.image);
      return `<div>${STATE_BADGE[s.status]}${state === 'default' ? '' : ` <span class="muted">${escape(STATE_LABELS[state] ?? state)}</span>`}${shot ? ` <a href="${escape(shot)}">PNG</a>` : ''}${!shared && s.reasons.length ? `<span class="purl">${escape(scrub(s.reasons.join('; ')))}</span>` : ''}</div>`;
    }).join('') || '–';
    return `<tr><td class="thumb"><a href="pages/${escape(p.id)}.html" aria-label="${name} details">${img ? `<img loading="lazy" src="${escape(img)}" alt="">` : '<span class="noimg">None</span>'}</a></td><td><a class="pname" href="pages/${escape(p.id)}.html">${name}</a><a class="purl" href="${escape(p.url)}" rel="noopener noreferrer">${escape(p.url)}</a>${flags ? `<div class="badges" style="margin-top:4px">${flags}</div>` : ''}${cardAnalytics(report.pageAnalytics, p.id)}</td><td>${vp('desktop')}</td><td>${vp('mobile')}</td><td class="links"><a href="pages/${escape(p.id)}.html">Details</a><a href="candidate-changes/index.html#page-${escape(p.id)}">Side by side</a></td></tr>`;
  });
  const states = pages.reduce((n, p) => n + p.cases.length, 0);
  if (!rows.length) return card('pages', 'Pages', bd('<p class="muted">No pages were captured.</p>'));
  return card('pages', 'Pages', `<div class="toolbar"><input id="pagefilter" type="search" placeholder="Filter pages" aria-label="Filter pages"><span id="pagecount" class="muted">${rows.length} of ${rows.length} pages</span>${shared ? `<span class="muted">All states: ${escape(scrub(shared))}</span>` : ''}</div>`
    + `<div class="tw"><table id="pagestable"><thead><tr><th></th><th>Page</th><th>Desktop</th><th>Mobile</th><th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`, {right: `${count(rows.length, 'page')} · ${count(states, 'state')}`});
}

function expectedCard(pages, changes) {
  const rows = pages.flatMap((p) => p.cases.filter((c) => c.s.status === 'expected').map((c) => {
    const row = changes.get(c.r.key);
    return `<tr><td>${escape(caseLabel(c.r.key))}</td><td>${escape(row?.expectedReason ?? 'noted in advance')}${row?.expectedBy ? ` (noted by ${escape(row.expectedBy)}${row.expectedDate ? ' on ' + escape(row.expectedDate) : ''})` : ''}. Listed as an intended change, so it is not counted as an issue; tomorrow's run compares normally.</td></tr>`;
  }));
  return rows.length ? card('expected', 'Expected changes', tw(table(['Page state', 'Reason'], rows))) : '';
}

function accessibilityCard(issues) {
  const a = issues.accessibility;
  return card('accessibility', 'Accessibility notes', a.length
    ? disc(`${a.length} automated accessibility rule${a.length > 1 ? 's' : ''} flagged (reference only, not counted as issues)`, `<ul class="issues">${a.map((i) => `<li class="known"><strong>${escape(i.title)}</strong><span>${escape(i.detail)}</span></li>`).join('')}</ul>`)
    : bd('<p class="muted">No automated accessibility rules flagged.</p>'));
}

function formsDisc(report) {
  const rows = (report.forms ?? []).flatMap((f) => [
    ...(f.quiz ? [[f.key, 'Quiz', f.quiz.status, f.quiz.detail]] : []),
    ...(f.search ?? []).map((m) => [f.key, `Insurance search · ${m.module}`, m.status, m.detail]),
    ...(f.error ? [[f.key, 'Check', 'fail', f.error]] : [])]);
  if (!rows.length) return '';
  const known = (report.runs ?? []).flatMap((r) => r.results).filter((r) => r.health?.knownErrors?.length);
  return disc(`Quiz and insurance search (${rows.filter((r) => r[2] === 'pass').length}/${rows.length} working)`, tw(table(['Case', 'Check', 'Result', 'Detail'], rows.map((r) => `<tr><td>${escape(r[0])}</td><td>${escape(r[1])}</td><td>${r[2] === 'pass' ? badge.ok : badge.issue}</td><td>${escape(scrub(r[3]))}</td></tr>`)))
    + (known.length ? `<p>Known third-party error on ${known.length} page state${known.length > 1 ? 's' : ''}, not counted as an issue: ${escape(known[0].health.knownErrors[0].message)} (${escape(known[0].health.knownErrors[0].reason)}).</p>` : ''), {open: true});
}

function navDisc(report) {
  if (!report.nav?.length) return '';
  return disc(`Navigation and menu checks (${report.nav.filter((n) => n.status === 'pass').length}/${report.nav.length} passed)`, tw(table(['Case', 'Kind', 'Result', 'Detail'], report.nav.map((n) => `<tr><td>${escape(n.key)}</td><td>${escape(n.kind)}</td><td>${n.status === 'pass' ? badge.ok : badge.issue}</td><td>${escape(n.assertion)}</td></tr>`))));
}

function technicalCard(report) {
  const repeats = (report.repeatability ?? []).flatMap((r) => r.rows).map((r) => `<tr><td>${escape(caseLabel(r.key))}</td><td>${escape(r.capture === 'captured' ? 'Captured' : 'Not captured')}</td><td class="n">${escape(r.mismatchPercent ?? 'unavailable')}</td></tr>`);
  return card('technical', 'Technical details',
    disc(`Same-run repeatability (screenshot noise check, threshold ${VISUAL_CHANGE_PERCENT}%)`, tw(table(['Case', 'Capture', 'Mismatch %'], repeats)) + (report.repeatability ?? []).map((r) => `<p><a href="${escape(r.detail)}">${escape(r.name)}: candidate / current / diff</a></p>`).join(''))
    + formsDisc(report) + navDisc(report)
    + disc('Run log', `<p>Started ${escape(when(report.startedAt))}, took ${escape(Number(report.elapsedSeconds ?? 0).toFixed(0))}s. Outcome code: ${escape(report.outcome ?? 'running')}. Errors: ${(report.errors ?? []).length} (listed under Issues).</p><p><a href="candidate-changes/index.html">Changes since yesterday, side by side</a></p>`));
}

export function renderNourishReport(report, root) {
  const issues = deriveIssues(report);
  const o = overall(report, issues);
  const results = (report.runs ?? []).flatMap((r) => r.results);
  const changes = new Map((report.previousCandidates?.rows ?? []).map((r) => [r.key, r]));
  const newKeys = report.newHealthFindings ?? [];
  const pages = [];
  for (const r of results) {
    const {pageId} = caseParts(r.key);
    let p = pages.find((x) => x.id === pageId);
    if (!p) pages.push((p = {id: pageId, url: r.url, cases: []}));
    p.cases.push({r, s: caseStatus(r, changes.get(r.key), newKeys)});
  }
  const perf = performanceParts(report.performance);
  const con = consoleParts(report);
  const tiles = [
    countTile('Pages', [[o.newIssues.length, 'new issues', 'bad'], [o.standing.length, 'still open', 'bad'], [o.pageChanges.length, 'visual changes', 'warn']], {href: '#pages'}),
    countTile('Tracking and analytics', [[o.trackingIssues.length, 'issues', 'bad'], [o.trackingChanges.length, 'changes', 'warn']]),
    report.seo ? countTile('Search indexing', [[o.seoNew.length, 'new issues', 'bad'], [o.seoStanding.length, 'still open', 'bad'], [o.seoReview.length, 'to review', 'warn']], {href: '#search'}) : '',
    perf.tile, con?.tile ?? ''].join('');
  // Areas, charts, tracking and GA4/GSC are private: the published copy drops them, and the first
  // private block (in the verdict) becomes the note saying where the numbers are.
  const charts = chartsSection({cards: seriesCards({amplitude: report.tracking?.events, google: report.google}), links: report.dashboardLinks ?? [], note: 'Last 14 days per day; the darkest column is the latest day.'}).replace(/<h2>[^<]*<\/h2>/, '');
  const areas = [...localAreas(report, o), ...(report.areas ?? [])].map((a) => `<tr><td>${MARK[a.status] ?? '⚪'}</td><td>${escape(a.label)}</td><td>${escape(a.text)}</td></tr>`);
  const privateCards = privately(card('areas', 'Areas', tw(table(['', 'Area', 'Result'], areas))) + card('charts', 'Daily charts', bd(charts)) + trackingCard(report) + googleCard(report));
  const nav = [['#search', 'Indexing'], ['#performance', 'Performance'], ['#issues', 'Issues'], ['#console', 'Console'], ['#pages', 'Pages']].map(([h, l]) => `<a href="${h}">${l}</a>`).join('');
  const meta = `${escape(when(report.finishedAt ?? report.startedAt))} · ${results.length} page states across ${pages.length} pages · ${report.previousCandidates?.previousFinishedAt ? `compared with the previous run (${escape(when(report.previousCandidates.previousFinishedAt))})` : 'no previous run to compare'} · first screen of each page (desktop 1440×1000, mobile 390×844) · runs around 8:30 AM PT while this Mac is on`;
  const verdict = `<div class="verdict">${dot(TONE_DOT[o.tone])}${escape(o.headline)}<span class="muted">${privately('')}</span></div>`;
  const body = `<div class="top"><div class="in"><span class="brand">Nourish <span>· Daily site check</span></span><nav>${nav}</nav><a class="right" href="candidate-changes/index.html">Side-by-side changes</a></div></div>
<main><div class="head"><h1>${TITLE}</h1><p class="sub">${meta}</p></div>
${verdict}<div class="tiles">${tiles}</div>
${seoCard(report, o)}${perf.html}${issuesCard(issues)}${con?.html ?? ''}${privateCards}${expectedCard(pages, changes)}${pagesCard(report, root, pages, report.performance?.regressions ?? [])}${accessibilityCard(issues)}${technicalCard(report)}</main>`;
  return doc({title: TITLE, body, css: METRICS_CSS, script: FILTER_JS});
}

export function renderNourishComparison(report, root) {
  return renderComparisonPage(report, root).replaceAll('Unify visual check', 'Nourish site check');
}
