// One static page per Nourish page in the daily report (pages/<id>.html): captured states,
// health findings, the nav and quiz/insurance-search results, the four Lighthouse gauges with
// LCP/CLS/TBT and the 7-day Performance score strip. Modelled on the checker's detail page
// without its PostHog section: Nourish has no PostHog project, and its Amplitude volumes are
// site-wide (main report). Pure: data in, HTML out. No scripts; inline SVG only.
import path from 'node:path';
import {checker} from './checker.mjs';
import {pageName} from './performance.mjs';

const {caseStatus, caseParts, STATE_LABELS, escape} = await checker('src/report-html.mjs');
const {pageGauges, GAUGE_CSS, band} = await checker('src/gauges.mjs');

const BADGE = {ok: '<span class="b ok">OK</span>', changed: '<span class="b warn">Changed</span>', issue: '<span class="b bad">Issue</span>', unverified: '<span class="b">Not compared</span>'};
const CHIP = {good: 'ok', average: 'warn', poor: 'bad'};
const pass = (ok) => (ok ? BADGE.ok : BADGE.issue);
// Published pages must not carry local paths or query strings from the live site.
const scrub = (s) => String(s ?? '').replace(/\/(Users|private|tmp|var)\/\S+/g, '[local path]');
const noQuery = (s) => String(s ?? '').replace(/\?.*$/, '');

function strip(history, key, label) {
  const values = history?.scores?.[key];
  if (!values) return '';
  const cells = history.days.map((d, i) => {
    const v = values[i];
    return `<li><span class="muted">${escape(d.slice(5).replace('-', '/'))}</span> ${Number.isFinite(v) ? `<span class="b ${CHIP[band(v)]}" aria-label="${escape(label)} ${escape(d)}: ${v} of 100">${v}</span>` : '<span class="b" aria-label="not measured">–</span>'}</li>`;
  }).join('');
  return `<div class="strip"><strong>${escape(label)}</strong><ul>${cells}</ul></div>`;
}

function checksTable(report, pageId) {
  const rows = [];
  for (const n of (report.nav ?? []).filter((n) => caseParts(n.key).pageId === pageId)) rows.push([caseParts(n.key).viewport, `Navigation (${n.kind})`, n.status === 'pass', n.assertion]);
  for (const f of (report.forms ?? []).filter((f) => caseParts(f.key).pageId === pageId)) {
    const vp = caseParts(f.key).viewport;
    if (f.quiz) rows.push([vp, 'Quiz', f.quiz.status === 'pass', f.quiz.detail]);
    for (const m of f.search ?? []) rows.push([vp, `Insurance search · ${m.module}`, m.status === 'pass', m.detail]);
    if (f.error) rows.push([vp, 'Form check', false, f.error]);
  }
  if (!rows.length) return '<p class="muted">No navigation or form checks ran for this page.</p>';
  return `<table><tr><th>Viewport</th><th>Check</th><th>Result</th><th>Detail</th></tr>${rows.map((r) => `<tr><td>${escape(r[0])}</td><td>${escape(r[1])}</td><td>${pass(r[2])}</td><td>${escape(scrub(r[3]))}</td></tr>`).join('')}</table>`;
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

  const states = ['desktop', 'mobile'].map((vp) => {
    const list = cases.filter((c) => caseParts(c.r.key).viewport === vp);
    if (!list.length) return '';
    return `<h3>${vp === 'desktop' ? 'Desktop' : 'Mobile'}</h3><div class="states">${list.map(({r, s}) => {
      const img = rel(r.visual?.image), st = caseParts(r.key).state;
      return `<article class="state"><h4>${escape(STATE_LABELS[st] ?? st)} ${BADGE[s.status]}</h4>${img ? `<a href="${escape(img)}"><img loading="lazy" src="${escape(img)}" alt="${escape(name)} ${escape(vp)}, ${escape(STATE_LABELS[st] ?? st)}"></a>` : '<div class="noimg">No screenshot</div>'}<p class="muted">${escape(scrub(s.reasons.length ? s.reasons.join('; ') : 'Loaded, no errors, no broken images, content present.'))}</p></article>`;
    }).join('')}</div>`;
  }).join('');

  const findings = cases.filter((c) => c.s.status === 'issue').map(({r, s}) => {
    const failed = (r.health?.failedAssets ?? []).slice(0, 5).map((a) => `<li>${escape(noQuery(a.url ?? a))}</li>`).join('');
    return `<li class="issue"><strong>${escape(caseParts(r.key).viewport)} · ${escape(STATE_LABELS[caseParts(r.key).state] ?? caseParts(r.key).state)}</strong><span>${escape(scrub(s.reasons.join('; ')))}</span>${failed ? `<ul>${failed}</ul>` : ''}</li>`;
  }).join('');
  const known = cases.flatMap(({r}) => r.health?.knownErrors ?? []);
  const a11y = new Set(cases.flatMap(({r}) => (r.health?.accessibility?.violations ?? []).map((v) => v.id)));

  const drops = (report.performance?.regressions ?? []).filter((g) => g.pageId === page.id).map((g) => `<p class="issue-note">${escape(g.viewport)} Performance score dropped from ${escape(g.before)} to ${escape(g.after)} since yesterday.</p>`).join('');
  const lab = perfRows.length ? `${drops}${pageGauges(perfRows)}<table><tr><th>Viewport</th><th>LCP (ms)</th><th>CLS</th><th>Total blocking time (ms)</th><th>Analytics requests answered</th></tr>${['desktop', 'mobile'].map((vp) => perfRows.find((r) => r.viewport === vp)).filter(Boolean).map((r) => `<tr><td>${escape(r.viewport)}</td><td>${escape(r.lcpMs ?? '–')}</td><td>${escape(r.cls ?? '–')}</td><td>${escape(r.tbtMs ?? '–')}</td><td>${r.analyticsRequests > 0 ? `<span class="b bad">${escape(r.analyticsRequests)}</span>` : escape(r.analyticsRequests ?? 'not verified')}</td></tr>`).join('')}</table>
${strip(history, `${page.id}--desktop`, 'Desktop score, last 7 days')}${strip(history, `${page.id}--mobile`, 'Mobile score, last 7 days')}
<p class="muted">Lab data only: a throttled simulated load on this Mac, one run per page, with analytics blocked. A few points of day-to-day movement is normal.</p>` : '<p class="muted">Lighthouse was not measured for this page today.</p>';

  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(name)} · Nourish daily site check</title><style>
:root{--fg:#1d2026;--muted:#5d6470;--line:#e3e6ea;--bg:#f6f7f9;--good:#127a3d;--goodbg:#e3f5ea;--warn:#8a5a00;--warnbg:#fff3d6;--bad:#b42318;--badbg:#fde7e5}
*{box-sizing:border-box}body{font:15px/1.5 system-ui,-apple-system,sans-serif;color:var(--fg);background:var(--bg);margin:0}main{max-width:1000px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:24px;margin:8px 0 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap}h2{font-size:18px;margin:32px 0 10px}h3{font-size:15px;margin:18px 0 6px}h4{font-size:14px;margin:0 0 6px;display:flex;gap:8px;align-items:center}
.muted{color:var(--muted)}a{color:#164e9b}ul{padding-left:18px}
.states{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}.state{background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px}.state img{width:100%;max-height:420px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:8px;display:block}.noimg{height:120px;display:grid;place-items:center;background:var(--bg);border-radius:8px;color:var(--muted)}
.issues{list-style:none;padding:0;margin:0;display:grid;gap:8px}.issues li{background:#fff;border:1px solid var(--line);border-left:4px solid var(--bad);border-radius:8px;padding:10px 12px}.issues li span{display:block;color:var(--muted)}
.b{font-size:12px;font-weight:600;border-radius:999px;padding:1px 9px;white-space:nowrap;background:var(--bg);color:var(--muted)}.b.ok{background:var(--goodbg);color:var(--good)}.b.warn{background:var(--warnbg);color:var(--warn)}.b.bad{background:var(--badbg);color:var(--bad)}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:10px}th,td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere}th{color:var(--muted);font-weight:600}
.issue-note{color:var(--bad);font-weight:600;margin:6px 0}.strip{margin-top:12px}.strip ul{list-style:none;display:flex;flex-wrap:wrap;gap:6px 12px;padding:0;margin:4px 0}.strip li{font-size:13px}
.lab{background:#fff;border:1px solid var(--line);border-radius:12px;padding:6px 14px 14px;max-width:560px}
${GAUGE_CSS}
</style><main>
<p><a href="../index.html">← All pages</a></p>
<h1>${escape(name)} ${BADGE[worst]}</h1>
<p class="muted"><a href="${escape(page.url)}" rel="noopener noreferrer">${escape(page.url)}</a></p>
<h2>Captured states</h2>${states || '<p class="muted">No states were captured.</p>'}
<p><a href="../candidate-changes/index.html#page-${escape(page.id)}">Previous run vs latest, side by side →</a></p>
<h2>Health findings</h2>${findings ? `<ul class="issues">${findings}</ul>` : '<p class="muted">Nothing new on this page today.</p>'}${known.length ? `<p class="muted">Known third-party error, not counted: ${escape(known[0].message)} (${escape(known[0].reason)}).</p>` : ''}${a11y.size ? `<p class="muted">Automated accessibility rules flagged (reference only): ${escape([...a11y].join(', '))}.</p>` : ''}
<h2>Navigation, quiz and insurance search</h2>${checksTable(report, page.id)}
<h2>Lighthouse (lab)</h2><div class="lab">${lab}</div>
<h2>Analytics</h2><p class="muted">No per-page analytics charts: Nourish has no PostHog project. Amplitude event volumes for the whole site are in the main report when the key is configured.</p>
</main></html>`;
}
