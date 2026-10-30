// Pure helpers for the Nourish daily report: no browser, no network.
import notifications from '../notification-template.cjs';
import {summaryOf} from './performance.mjs';
const {safeText} = notifications;

// Partner pages are noindex on purpose; any other page going noindex is a finding.
export function applyExpectedNoindex(results, site) {
  const expected = new Set(site.pages.filter((p) => p.expectNoindex).map((p) => p.id));
  for (const r of results) {
    const h = r.health;
    if (!expected.has(r.pageId) || !h?.metadataIssues?.includes('noindex')) continue;
    h.metadataIssues = h.metadataIssues.filter((m) => m !== 'noindex');
    h.expectedNoindex = true;
  }
  return results;
}

// A known third-party error is excused only where this run's own form check saw it
// thrown from the named script on the same page state (form-check.mjs keeps the
// stack's script URL); anywhere else it stays a page error.
export function applyKnownErrors(result, formCheck, known = []) {
  const h = result.health;
  if (!h?.errors?.length || !known.length) return result;
  const seen = formCheck?.pageErrors ?? [];
  const keep = [], excused = [];
  for (const e of h.errors) {
    const k = known.find((k) => k.message === e && seen.some((p) => p.message === e && p.source?.includes(k.script)));
    (k ? excused : keep).push(k ? {message: e, script: k.script, reason: k.reason} : e);
  }
  h.errors = keep;
  if (excused.length) h.knownErrors = excused;
  return result;
}

// The console check's findings join the checker's own health result: network failures as failed
// files (skipping any URL health already lists), console errors and a retired Trustpilot id as
// page errors. healthSignature then tells new findings from still-open ones as for any other.
export function applyConsole(result, check) {
  const h = result.health;
  if (!h || !check?.issues?.length) return result;
  h.failedAssets ??= []; h.errors ??= [];
  const listed = new Set(h.failedAssets.map((a) => String(a.url ?? a).replace(/[?#].*$/, '')));
  for (const i of check.issues) {
    if (i.kind === 'http' || i.kind === 'net') {
      if (listed.has(i.url)) continue;
      listed.add(i.url);
      h.failedAssets.push({url: i.url, ...(i.status ? {status: i.status} : {error: i.detail}), type: 'console-check'});
    } else h.errors.push(i.detail);
  }
  if (h.status === 'pass') h.status = 'findings';
  return result;
}

// Whether yesterday's screenshots compare with today's. Chrome updates itself about weekly and a
// patch build of the same major version renders these pages the same, so only the major version
// counts; any other change (major version, browser binary, capture policy, Playwright, OS) skips
// the comparison for one run, as the checker's fingerprint does.
export function sameCaptureEnvironment(before = {}, after = {}) {
  if (before.environmentFingerprint === after.environmentFingerprint) return true;
  const a = before.environment, b = after.environment;
  if (!a || !b) return false;
  const major = (v) => String(v ?? '').split('.')[0];
  const shape = (e) => JSON.stringify(Object.keys(e).sort().map((k) => [k, k === 'browserVersion' ? major(e[k]) : e[k]]));
  return major(a.browserVersion) !== '' && shape(a) === shape(b);
}

// Marks each indexing issue new or still open against the previous run (same kind and path).
export function seoNewness(seo, previous) {
  if (!seo?.issues) return seo;
  const before = previous?.issues ? new Set(previous.issues.map((i) => `${i.kind}:${i.path}`)) : null;
  for (const i of seo.issues) i.isNew = before ? !before.has(`${i.kind}:${i.path}`) : true;
  return seo;
}
const seoSplit = (seo) => {
  const issues = (seo?.issues ?? []).filter((i) => i.level !== 'review');
  return {fresh: issues.filter((i) => i.isNew !== false), standing: issues.filter((i) => i.isNew === false), review: (seo?.issues ?? []).filter((i) => i.level === 'review')};
};

export function combineInteraction(nav, forms) {
  const failed = [nav, forms].filter((x) => x && x.status !== 'pass');
  return {status: failed.length ? 'fail' : 'pass', assertion: (failed.length ? failed : [nav, forms]).filter(Boolean).map((x) => x.assertion).join(' | ')};
}

export function trackingFindings(tracking = {}, google = {}, areas = []) {
  const issues = [...(tracking.monitor?.issues ?? []), ...(tracking.events?.issues ?? []), ...(google?.issues ?? [])];
  // SEO/AEO comes from the weekly audit: new findings there are things to review, never breakage.
  // Performance has its own daily rule (performance.mjs) and is not a tracking change.
  const changes = [...(tracking.events?.changes ?? []), ...(google?.changes ?? []),
    ...areas.filter((a) => a.id === 'seo' && a.status === 'changed').map((a) => `${a.label}: ${a.text}`)];
  return {issues, changes};
}

// Verdict across pages and tracking for the report. `pages` is the page checker's
// deriveIssues() output. A page issue already present in the previous run is "still
// open": it stays in the report and the message but doesn't make the day red again.
export function overall(report, pages) {
  const t = trackingFindings(report.tracking, report.google, report.areas);
  const newKeys = report.newHealthFindings;
  const isNew = (i) => !i.key || newKeys == null || newKeys.some((k) => k.startsWith(i.key + ':'));
  const pageIssues = pages.now.filter((i) => i.level === 'issue');
  const newIssues = pageIssues.filter(isNew), standing = pageIssues.filter((i) => !isNew(i));
  const pageChanges = pages.now.filter((i) => i.level === 'changed');
  const failed = report.outcome === 'execution-error' || (report.errors ?? []).length > 0;
  const seo = seoSplit(report.seo);
  const issues = newIssues.length + t.issues.length + seo.fresh.length;
  const open = standing.length + seo.standing.length;
  const still = open ? ` (${open} still open)` : '';
  const tone = failed || issues ? 'bad' : pageChanges.length || t.changes.length || open || seo.review.length ? 'warn' : 'good';
  const headline = failed ? 'Run did not finish cleanly'
    : issues ? `${issues} new issue${issues > 1 ? 's' : ''}${still}`
    : pageChanges.length || t.changes.length || seo.review.length ? `Changes to review, no new issues${still}`
    : open ? `No new issues${still}`
    : 'All clear';
  return {tone, headline, newIssues, standing, pageChanges, trackingIssues: t.issues, trackingChanges: t.changes, failed,
    seoNew: seo.fresh, seoStanding: seo.standing, seoReview: seo.review};
}

const fmt = (n) => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));
const pct = (n) => (n == null ? '–' : `${n > 0 ? '+' : ''}${Math.round(n)}%`);
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-US', {timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) + ' PT' : 'never');

export const MARK = {ok: '✅', changed: '👀', issue: '🚨', skipped: '⚪'};

// Nourish's own two areas for the report table; Performance (today's Lighthouse), SEO/AEO,
// GA4 and GSC come from report.areas.
export function localAreas(report, o) {
  const c = report.counts ?? {};
  const m = report.tracking?.monitor, ev = report.tracking?.events;
  const evIssue = ev?.status === 'issue', evChange = ev?.status === 'changed';
  const tracking = {id: 'tracking', label: 'Tracking',
    status: m?.status === 'issue' || evIssue ? 'issue' : evChange ? 'changed' : m ? 'ok' : 'skipped',
    text: [m ? `hourly monitor ${m.status === 'ok' ? 'healthy' : 'needs a look'} (${m.runsLast24h} runs/24h, ${m.failingRunsLast24h} failing, last ${when(m.lastCheckedAt)})` : 'no hourly monitor results',
      ev?.status === 'not-configured' ? 'Amplitude volumes skipped: needs an API key in Keychain item "nourish-amplitude-api"'
        : ev?.events?.length ? `Amplitude ${ev.events.filter((e) => e.status !== 'ok').length ? ev.events.filter((e) => e.status !== 'ok').map((e) => e.label + ' ' + (e.reason ?? '')).join('; ') : 'volumes normal'}` : null].filter(Boolean).join(' · ')};
  const visual = {id: 'visual', label: 'Visual',
    status: o.failed || o.newIssues.length ? 'issue' : o.pageChanges.length || o.standing.length ? 'changed' : 'ok',
    text: `${c.captured ?? '?'}/${c.expected ?? '?'} captured · ${c.formChecks != null ? `quiz/insurance search ${c.formFailures == null ? '?' : c.formChecks - c.formFailures}/${c.formChecks} working · ` : ''}${o.newIssues.length} new issue${o.newIssues.length === 1 ? '' : 's'} · ${o.standing.length} still open · ${c.candidateChanges ?? '?'} changed vs last run${report.previousCandidates?.status === 'first-run-no-previous-candidates' ? ' (first run)' : ''}`};
  return [tracking, visual];
}

// Notification model (contract v1 fields, see ../notification-schema.md) for the daily Slack
// message. The headline is the page check: visual, health, nav, quiz and insurance search, and
// whether the run finished. Supporting areas (today's Lighthouse scores, the hourly tracking
// monitor, Amplitude volumes, anything site-audit adds) each contribute a line only when they
// need attention; a red one makes the day post without changing the headline. Problems the
// hourly monitor already alerts on (its own failures) are left to it; only a missing or stale
// monitor is raised here. Amplitude not being configured is shown in the report, not here.
export function dailyNotification(report, pages, {link = null, published = false, publishError = null, lastSuccessfulRun = null} = {}) {
  const o = overall(report, pages), c = report.counts ?? {};
  const ev = report.tracking?.events, m = report.tracking?.monitor;
  const expected = Number.isInteger(c.expected) && c.expected > 0 ? c.expected : null;
  const captured = Number.isInteger(c.captured) && c.captured >= 0 ? c.captured : null;
  const partial = expected !== null && captured !== null && captured < expected;
  const checkerError = o.failed || partial;
  let code = checkerError ? 'checker_error' : o.newIssues.length || o.seoNew.length ? 'site_failure'
    : o.pageChanges.length || ['changed-needs-review', 'review-required', 'first-run-review-required'].includes(report.outcome) ? 'review_needed' : 'no_change';

  const affectedChecks = [];
  const add = (check, status, summary, caseIds = []) => affectedChecks.push({check, status, summary, caseIds});
  const keys = (items) => items.map((i) => i.key).filter(Boolean);
  if (partial) add('Capture', 'checker_error', `${expected - captured} missing`, (report.runs ?? []).flatMap((r) => r.results).filter((r) => r.visual?.measurementStatus !== 'captured').map((r) => r.key));
  if (o.pageChanges.length) add('Changed', 'review_needed', String(o.pageChanges.length), keys(o.pageChanges));
  if (o.newIssues.length) add('New issues', 'site_failure', String(o.newIssues.length), keys(o.newIssues));
  if (o.standing.length) add('Still open', 'review_needed', String(o.standing.length), keys(o.standing));
  for (const e of report.errors ?? []) add('Run problem', 'checker_error', String(e).split('\n')[0].slice(0, 200));
  const perf = summaryOf(report.performance);
  if (perf?.regressed) add('Performance', 'site_failure', perf.text);
  for (const i of (m?.issues ?? []).filter((i) => /has no results|last ran/i.test(i))) add('Hourly tracking monitor', 'checker_error', i);
  for (const e of (ev?.events ?? []).filter((e) => e.status !== 'ok')) {
    add('Amplitude', e.status === 'issue' ? 'site_failure' : e.status === 'error' ? 'checker_error' : 'review_needed',
      e.status === 'error' ? `${e.label}: could not fetch (${e.reason})` : `${e.label} ${fmt(e.yesterday)} yesterday (${pct(e.vsLastWeek)} vs last week, ${pct(e.vsAvg7)} vs the 7-day average): ${e.reason}`);
  }
  const seoLine = (items) => `${items.length}: ${items.slice(0, 3).map((i) => `${i.path} ${i.detail}`).join('; ')}${items.length > 3 ? ` +${items.length - 3} more` : ''}`;
  if (o.seoNew.length) add('Indexing', 'site_failure', seoLine(o.seoNew));
  if (o.seoStanding.length) add('Indexing, still open', 'review_needed', seoLine(o.seoStanding));
  if (report.seo?.status === 'error') add('Indexing', 'checker_error', `check failed: ${report.seo.reason}`);
  for (const a of (report.areas ?? []).filter((a) => ['seo', 'ga4', 'gsc'].includes(a.id) && ['issue', 'changed'].includes(a.status))) add(a.label, a.status === 'issue' ? 'site_failure' : 'review_needed', a.text);

  const unknowns = [];
  if (!report.finishedAt || !Number.isFinite(Date.parse(report.finishedAt))) unknowns.push('run completion time was not recorded');
  if (expected === null || captured === null || captured > expected) unknowns.push('page capture completeness is unknown');
  if (!Number.isInteger(c.formChecks) || !Number.isInteger(c.formFailures)) unknowns.push('quiz and insurance-search completeness is unknown');
  const pc = report.previousCandidates ?? {};
  if (pc.status === 'previous-evidence-unavailable') unknowns.push('comparison with the previous run was unavailable');
  const uncompared = (pc.rows ?? []).filter((r) => !['candidate-stable-sample', 'candidate-change-needs-review'].includes(r.status)).length;
  if (uncompared && pc.status === 'comparison-attempted') unknowns.push(`${uncompared} pages not compared (no comparable earlier screenshot; the next run compares normally)`);
  if (publishError) unknowns.push('report not published: ' + publishError);
  if (code === 'no_change' && unknowns.length) code = 'unknown';

  const actions = {checker_error: 'Inspect the saved run and worker log; complete missing checks before drawing a site-health conclusion.',
    site_failure: 'Inspect the affected check evidence before changing the site; no automatic repair.',
    review_needed: 'Review the changes and still-open findings; no automatic repair or baseline approval.',
    no_change: 'No new action indicated within measured scope; review any standing findings.',
    unknown: 'Inspect missing or incompatible evidence before drawing a conclusion.'};
  return {
    schemaVersion: 1, client: 'Nourish', check: 'Daily site check',
    status: {code, sourceStatus: report.status ?? null, sourceOutcome: report.outcome ?? null},
    summary: code === 'unknown' ? 'Measurement completeness is unknown; no overall pass is claimed.'
      : checkerError ? 'Run did not finish cleanly or supporting measurements failed; see affected checks.'
      : o.headline === 'All clear' ? 'No new failure found within measured scope; existing findings can remain.' : o.headline,
    affectedChecks,
    counts: {expected, captured, formChecks: Number.isInteger(c.formChecks) ? c.formChecks : null, formFailures: Number.isInteger(c.formFailures) ? c.formFailures : null, candidateChanges: c.candidateChanges ?? null},
    coverage: {summary: `${captured ?? '?'}/${expected ?? '?'} page states captured; ${c.formChecks ?? '?'} form checks, ${c.formFailures ?? '?'} failed; ${c.candidateChanges ?? '?'} candidate changes`,
      limits: 'Visual comparison uses previous candidates; capture is not proof of healthy forms, tracking or approved baselines', unknowns},
    currentRun: {id: report.startedAt ?? null, startedAt: report.startedAt ?? null, finishedAt: report.finishedAt ?? null}, lastSuccessfulRun,
    evidence: {url: published === true && /^https?:\/\//.test(link || '') ? link : null, published: published === true,
      description: 'Hosted report not updated; local evidence: monitoring-local/daily-report/latest/index.html'},
    nextAction: actions[code],
  };
}

// Compact Slack rendering, the same shape as Unify's (Oct 29 2026): headline with the run time,
// one line of numbers, then only the lines that need attention, the link, a one-line next step
// when something needs doing. Text goes through the shared safeText (escaping, no local paths,
// no query strings, no Slack mentions); case lists show four ids then "+N more".
const ICON = {site_failure: '🚨', checker_error: '🚨', review_needed: '👀', no_change: '✅', recovered: '✅', unknown: '⚪'};
const LABEL = {site_failure: 'site problem', checker_error: 'check failed', review_needed: 'review needed', no_change: 'no change', recovered: 'recovered', unknown: 'incomplete'};
const AREA_MARK = {site_failure: '🔴', checker_error: '🔴', review_needed: '🟡'};
const SHORT_ACTION = {
  site_failure: 'Open the report and check the new issues on the live site before changing anything.',
  checker_error: 'The check did not finish; read the run log before drawing conclusions.',
  review_needed: 'Open the report and review the changed pages.',
  unknown: 'Some evidence is missing; check the report before concluding anything.',
};
const HEADLINE_CHECKS = ['Capture', 'Changed', 'New issues', 'Still open', 'Run problem'];
const stamp = (iso) => (iso && Number.isFinite(Date.parse(iso))
  ? new Date(iso).toLocaleString('en-US', {timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}) + ' PT' : 'time unknown');
const list = (ids, max = 4) => ids.slice(0, max).map((id) => safeText(id, 70)).join(', ') + (ids.length > max ? ` +${ids.length - max} more` : '');

export function renderDailyMessage(n) {
  const code = Object.hasOwn(ICON, n.status?.code) ? n.status.code : 'unknown', c = n.counts ?? {};
  const one = (check) => n.affectedChecks.find((a) => a.check === check);
  const changes = Number(one('Changed')?.summary ?? 0), issues = Number(one('New issues')?.summary ?? 0);
  const lines = [`${ICON[code]} *Nourish daily site check — ${LABEL[code]}*  ·  ${stamp(n.currentRun?.finishedAt)}`];
  const numbers = [`${c.captured ?? '?'}/${c.expected ?? '?'} pages captured (desktop + mobile)`, `${changes} visual change${changes === 1 ? '' : 's'}`, `${issues} new issue${issues === 1 ? '' : 's'}`];
  if (Number.isInteger(c.formChecks) && Number.isInteger(c.formFailures)) numbers.push(`quiz and insurance search ${c.formChecks - c.formFailures}/${c.formChecks} working`);
  lines.push(numbers.join(' · '));
  const cap = one('Capture');
  if (cap) lines.push(`❌ *Not captured:* ${cap.caseIds?.length ? list(cap.caseIds) : safeText(cap.summary)}`);
  const ch = one('Changed');
  if (ch) lines.push(`🔍 *Changed:* ${ch.caseIds?.length ? list(ch.caseIds) : `${changes} visual change${changes === 1 ? '' : 's'} (see report)`}`);
  const ni = one('New issues');
  if (ni) lines.push(`🩺 *New issues:* ${ni.caseIds?.length ? list(ni.caseIds) : `${issues} (see report)`}`);
  const so = one('Still open');
  if (so) lines.push(`⏳ *Still open:* ${safeText(so.summary)} page issue${so.summary === '1' ? '' : 's'} from before (see report)`);
  const problems = [...n.affectedChecks.filter((a) => a.check === 'Run problem').map((a) => a.summary), ...(n.coverage?.unknowns ?? [])];
  if (problems.length) lines.push(`⚠️ ${problems.map((p) => safeText(p)).join(' · ')}`);
  for (const a of n.affectedChecks.filter((a) => !HEADLINE_CHECKS.includes(a.check))) lines.push(`${AREA_MARK[a.status] ?? '⚪'} *${safeText(a.check, 60)}:* ${safeText(a.summary, 300)}`);
  lines.push(n.evidence?.url ? `🔗 ${safeText(n.evidence.url)}` : `📁 ${safeText(n.evidence?.description ?? 'Link/path unavailable.')}`);
  if (SHORT_ACTION[code]) lines.push(`→ ${SHORT_ACTION[code]}`);
  return lines.join('\n');
}

// Quiet rule: the channel hears about a day only when it needs attention (headline not
// "no change", or a red supporting line), or once after such a day so the clear is seen.
// With no record of the previous day the sender stays quiet.
export const neededAttention = (n) => n.status.code !== 'no_change' || n.affectedChecks.some((a) => ['site_failure', 'checker_error'].includes(a.status));
export function shouldPost(n, previousNeededAttention = null) {
  return neededAttention(n) || previousNeededAttention === true;
}

export function slackText(report, pages, options = {}) {
  return renderDailyMessage(dailyNotification(report, pages, options));
}
