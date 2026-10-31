// One static page per Nourish page in the daily report (pages/<id>.html), in the dashboard look
// (dashboard.mjs): any score-drop callout, tiles (lab scores, health, indexing, checks), then cards
// for the captured states, health, the nav and quiz/insurance-search results, console and network,
// the four Lighthouse gauges per viewport with LCP/CLS/TBT and the 7-day scores, real-user vitals
// and per-page Amplitude charts. Pure: data in, HTML out. No scripts; inline SVG only.
import path from 'node:path';
import {checker} from './checker.mjs';
import {pageName} from './performance.mjs';
import {analyticsSection, cruxSection, METRICS_CSS, CHART_CSS} from './page-metrics.mjs';
import {doc, card, bd, tw, tile} from './dashboard.mjs';

const {caseStatus, caseParts, STATE_LABELS, escape} = await checker('src/report-html.mjs');
const {gauge, CATEGORIES, band} = await checker('src/gauges.mjs');

const BADGE = {ok: '<span class="b ok">OK</span>', changed: '<span class="b warn">Changed</span>', issue: '<span class="b bad">Issue</span>', unverified: '<span class="b">Not compared</span>'};
const CHIP = {good: 'ok', average: 'warn', poor: 'bad'};
const pass = (ok) => (ok ? BADGE.ok : BADGE.issue);
// Published pages must not carry local paths or query strings from the live site.
const scrub = (s) => String(s ?? '').replace(/\/(Users|private|tmp|var)\/\S+/g, '[local path]');
const noQuery = (s) => String(s ?? '').replace(/\?.*$/, '');

// The last 7 days of Performance scores, one row per viewport, one column per day.
function daysTable(history, pageId) {
  const rows = [['desktop', 'Desktop'], ['mobile', 'Mobile']].map(([vp, label]) => [label, history?.scores?.[`${pageId}--${vp}`]]).filter(([, v]) => v);
  if (!rows.length) return '';
  const cell = (label, d, v) => (Number.isFinite(v) ? `<span class="b ${CHIP[band(v)]}" aria-label="${escape(label)} score, last 7 days ${escape(d)}: ${v} of 100">${v}</span>` : '<span class="b" aria-label="not measured">–</span>');
  return `<table class="days"><tr><th>Score, last 7 days</th>${history.days.map((d) => `<th>${escape(d.slice(5).replace('-', '/'))}</th>`).join('')}</tr>${rows.map(([label, values]) => `<tr><td>${label}</td>${history.days.map((d, i) => `<td>${cell(label, d, values[i])}</td>`).join('')}</tr>`).join('')}</table>`;
}

function checkRows(report, pageId) {
  const rows = [];
  for (const n of (report.nav ?? []).filter((n) => caseParts(n.key).pageId === pageId)) rows.push([caseParts(n.key).viewport, `Navigation (${n.kind})`, n.status === 'pass', n.assertion]);
  for (const f of (report.forms ?? []).filter((f) => caseParts(f.key).pageId === pageId)) {
    const vp = caseParts(f.key).viewport;
    if (f.quiz) rows.push([vp, 'Quiz', f.quiz.status === 'pass', f.quiz.detail]);
    for (const m of f.search ?? []) rows.push([vp, `Insurance search · ${m.module}`, m.status === 'pass', m.detail]);
    if (f.error) rows.push([vp, 'Form check', false, f.error]);
  }
  return rows;
}
const checksTable = (rows) => `<table><tr><th>Viewport</th><th>Check</th><th>Result</th><th>Detail</th></tr>${rows.map((r) => `<tr><td>${escape(r[0])}</td><td>${escape(r[1])}</td><td>${pass(r[2])}</td><td>${escape(scrub(r[3]))}</td></tr>`).join('')}</table>`;

// Console/network check results for this page, desktop and mobile (console-check.mjs).
const consoleTable = (rows) => `<table><tr><th>Viewport</th><th>Result</th><th>Detail</th></tr>${rows.map((c) => `<tr><td>${escape(caseParts(c.key).viewport)}</td><td>${c.status === 'error' ? '<span class="b">Not checked</span>' : pass(c.status === 'pass')}</td><td>${c.status === 'error' ? escape(scrub(c.error)) : c.issues.length ? c.issues.map((i) => `${escape(i.detail)}${i.url ? `<br><span class="muted">${escape(noQuery(i.url))}</span>` : ''}`).join('<br>') : `No console errors or failed requests${c.widgets ? `; ${c.widgets} Trustpilot widget${c.widgets === 1 ? '' : 's'} on the live business unit` : ''}`}</td></tr>`).join('')}</table>`;

// This page's row from the indexing check (seo-check.mjs): the line, its findings and the tile.
function seoParts(report, page) {
  const s = report.seo;
  if (!s?.rows?.length) return {html: '<span class="muted">Search indexing was not checked today.</span>', tile: {value: '–', sub: 'Not checked today'}};
  const p = (() => { const x = new URL(page.url).pathname; return x.length > 1 ? x.replace(/\/+$/, '') : x; })();
  const r = s.rows.find((r) => r.path === p);
  if (!r) return {html: '<span class="muted">This page was not in today\'s indexing check.</span>', tile: {value: '–', sub: 'Not in today\'s check'}};
  const found = (s.issues ?? []).filter((i) => i.path === p);
  const state = r.status === 200 ? (r.noindex ? 'noindex' : 'indexable') : `answers ${escape(r.status)}`;
  return {html: `<p>${r.inSitemap ? 'In the sitemap' : 'Not in the sitemap'} · ${state}${page.expectNoindex ? ' · noindex expected' : ''}</p>${found.length ? `<ul class="issues">${found.map((i) => `<li class="issue"><strong>${escape(i.kind)}</strong><span>${escape(i.detail)}</span></li>`).join('')}</ul>` : ''}`,
    tile: {value: r.status === 200 ? (r.noindex ? 'Noindex' : 'Indexable') : `HTTP ${escape(r.status)}`, sub: r.inSitemap ? 'In the sitemap' : 'Not in the sitemap', state: found.length ? 'bad' : null}};
}

// root: run directory the screenshots live under; the page is written to <root>/pages/<id>.html.
export function renderDetailPage({page, report, root, history = null}) {
  const results = (report.runs ?? []).flatMap((r) => r.results).filter((r) => caseParts(r.key).pageId === page.id);
  const changes = new Map((report.previousCandidates?.rows ?? []).map((r) => [r.key, r]));
  const newKeys = report.newHealthFindings ?? [];
  const cases = results.map((r) => ({r, s: caseStatus(r, changes.get(r.key), newKeys)}));
  const worst = ['issue', 'changed', 'unverified'].find((st) => cases.some((c) => c.s.status === st)) ?? 'ok';
  const rel = (p) => (p && root ? '../' + path.relative(root, p).split(path.sep).join('/') : null);
  const name = pageName(page.id);
  const perfRows = (report.performance?.rows ?? []).filter((r) => r.pageId === page.id);
  const side = `../candidate-changes/index.html#page-${escape(page.id)}`;
  const byVp = (vp) => perfRows.find((r) => r.viewport === vp);

  const shots = ['desktop', 'mobile'].flatMap((vp) => cases.filter((c) => caseParts(c.r.key).viewport === vp).map(({r, s}) => {
    const img = rel(r.visual?.image), st = caseParts(r.key).state;
    return `<figure class="shot">${img ? `<a href="${escape(img)}"><img loading="lazy" src="${escape(img)}" alt="${escape(name)} ${escape(vp)}, ${escape(STATE_LABELS[st] ?? st)}"></a>` : '<p class="muted">No screenshot</p>'}<figcaption><strong>${vp === 'desktop' ? 'Desktop' : 'Mobile'}</strong> <span class="muted" style="width:auto">${escape(STATE_LABELS[st] ?? st)}</span> ${BADGE[s.status]}<span class="muted">${escape(scrub(s.reasons.length ? s.reasons.join('; ') : 'Loaded, no errors, no broken images, content present.'))}</span></figcaption></figure>`;
  }));
  const pair = shots.length === 2 && cases.some((c) => caseParts(c.r.key).viewport === 'desktop') && cases.some((c) => caseParts(c.r.key).viewport === 'mobile');
  const captures = card('captures', 'Captured states', shots.length ? `<div class="shots${pair ? ' pair' : ''}">${shots.join('')}</div>` : bd('<p class="muted">No states were captured.</p>'), {right: `<a href="${side}">Previous run vs latest, side by side →</a>`});

  const issueCases = cases.filter((c) => c.s.status === 'issue');
  const findings = issueCases.map(({r, s}) => {
    const failed = (r.health?.failedAssets ?? []).slice(0, 5).map((a) => `<li>${escape(noQuery(a.url ?? a))}</li>`).join('');
    return `<li class="issue"><strong>${escape(caseParts(r.key).viewport)} · ${escape(STATE_LABELS[caseParts(r.key).state] ?? caseParts(r.key).state)}</strong><span>${escape(scrub(s.reasons.join('; ')))}</span>${failed ? `<ul>${failed}</ul>` : ''}</li>`;
  }).join('');
  const known = cases.flatMap(({r}) => r.health?.knownErrors ?? []);
  const a11y = new Set(cases.flatMap(({r}) => (r.health?.accessibility?.violations ?? []).map((v) => v.id)));
  const seo = seoParts(report, page);
  const health = card('health', 'Health', bd(`<dl class="kv"><dt>Findings</dt><dd>${findings ? `<ul class="issues">${findings}</ul>` : 'Nothing new on this page today.'}${known.length ? `<p class="muted">Known third-party error, not counted: ${escape(known[0].message)} (${escape(known[0].reason)}).</p>` : ''}</dd>${a11y.size ? `<dt>Accessibility rules flagged</dt><dd><span class="muted">Reference only, not counted</span><div class="rules">${[...a11y].map((id) => `<code>${escape(id)}</code>`).join('')}</div></dd>` : ''}<dt>Search indexing</dt><dd>${seo.html}</dd></dl>`));

  const checks = checkRows(report, page.id);
  const checksOk = checks.filter((r) => r[2]).length;
  const checksCard = card('checks', 'Navigation, quiz and insurance search', checks.length ? tw(checksTable(checks)) : bd('<p class="muted">No navigation or form checks ran for this page.</p>'), {right: checks.length ? `${checksOk} of ${checks.length} OK` : ''});
  const consoleRows = (report.console ?? []).filter((c) => caseParts(c.key).pageId === page.id);
  const consoleOk = consoleRows.filter((c) => c.status === 'pass').length;
  const consoleCard = card('console', 'Console and network', consoleRows.length ? tw(consoleTable(consoleRows)) : bd('<p class="muted">The console and network check did not run for this page.</p>'), {right: consoleRows.length ? `${consoleOk} of ${consoleRows.length} OK` : ''});

  const callouts = (report.performance?.regressions ?? []).filter((g) => g.pageId === page.id).map((g) => `<div class="callout"><span class="b bad">Regressed</span>${escape(g.viewport)} Performance score dropped from ${escape(g.before)} to ${escape(g.after)} since yesterday.</div>`).join('');
  const gaugeBlocks = [['desktop', 'Desktop'], ['mobile', 'Mobile']].filter(([vp]) => byVp(vp)).map(([vp, label]) => {
    const scores = byVp(vp).status === 'measured' ? (byVp(vp).scores ?? {}) : {};
    return `<div data-viewport="${vp}"><div class="gvp">${label}</div><div class="gauges">${CATEGORIES.map(([k, n]) => gauge(n, scores[k])).join('')}</div></div>`;
  }).join('');
  const loads = Math.max(...perfRows.map((r) => r.runs ?? 1));
  const days = daysTable(history, page.id);
  const lab = card('lab', 'Lighthouse (lab)', perfRows.length
    ? `<div class="gauges-wrap" aria-label="Lighthouse lab scores">${gaugeBlocks}</div><div class="tw" style="border-top:1px solid var(--line)"><table><tr><th>Viewport</th><th>LCP (ms)</th><th>CLS</th><th>Total blocking time (ms)</th><th>Analytics requests answered</th></tr>${['desktop', 'mobile'].map(byVp).filter(Boolean).map((r) => `<tr><td>${escape(r.viewport)}</td><td>${escape(r.lcpMs ?? '–')}</td><td>${escape(r.cls ?? '–')}</td><td>${escape(r.tbtMs ?? '–')}</td><td>${r.analyticsRequests > 0 ? `<span class="b bad">${escape(r.analyticsRequests)}</span>` : escape(r.analyticsRequests ?? 'not verified')}</td></tr>`).join('')}</table></div>${days ? `<div class="tw" style="border-top:1px solid var(--line)">${days}</div>` : ''}`
      + bd(`<p class="muted">Lab data only: throttled simulated loads on this Mac, ${loads > 1 ? `the median of ${loads} loads per viewport` : 'one load per viewport'}, with analytics blocked. A few points of day-to-day movement is normal.</p>`)
    : bd('<p class="muted">Lighthouse was not measured for this page today.</p>'));
  // CrUX and Amplitude: the existing table flush, then the notes.
  const flush = (html) => { const m = /^\s*(<table[\s\S]*?<\/table>)([\s\S]*)$/.exec(html); return m ? tw(m[1]) + bd(m[2].trim()) : bd(html); };

  const perfTile = (vp, label) => {
    const r = byVp(vp);
    if (!r) return '';
    const score = r.status === 'measured' && Number.isFinite(r.score) ? r.score : null;
    return tile({label: `${label} performance`, value: score ?? '–', unit: score == null ? '' : '/ 100', sub: 'Lighthouse lab score', state: score == null ? null : CHIP[band(score)], href: '#lab'});
  };
  const tiles = [perfTile('desktop', 'Desktop'), perfTile('mobile', 'Mobile'),
    tile({label: 'Health findings', value: issueCases.length, unit: 'new', sub: 'today', state: issueCases.length ? 'bad' : 'ok', href: '#health'}),
    tile({label: 'Search indexing', value: seo.tile.value, sub: seo.tile.sub, state: seo.tile.state ?? null, href: '#health'}),
    checks.length ? tile({label: 'Checks', value: `${checksOk}/${checks.length}`, unit: 'OK', sub: 'Navigation, quiz, insurance', state: checksOk === checks.length ? 'ok' : 'bad', href: '#checks'}) : ''].join('');

  const body = `<div class="top"><div class="in"><a href="../index.html">← All pages</a><span class="brand muted" style="font-weight:400">Nourish daily site check</span><a class="right" href="${side}">Side by side</a></div></div>
<main><div class="head"><h1>${escape(name)} ${BADGE[worst]}</h1><p class="sub"><a href="${escape(page.url)}" rel="noopener noreferrer">${escape(page.url)}</a></p></div>
${callouts}<div class="tiles">${tiles}</div>
${captures}${health}${checksCard}${consoleCard}${lab}
${card('crux', 'Real users (Chrome UX Report)', flush(cruxSection(report.crux, page.id)))}
${card('analytics', 'Analytics (Amplitude)', bd(analyticsSection(report.pageAnalytics, page.id)))}</main>`;
  return doc({title: `${name} · Nourish daily site check`, body, css: CHART_CSS + METRICS_CSS});
}
