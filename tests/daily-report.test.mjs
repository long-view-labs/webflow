import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compareVolumes, summarizeMonitor, windowFor, eventVolumes, EVENTS} from '../monitoring/daily-report/tracking.mjs';
import {applyExpectedNoindex, overall, dailyNotification, renderDailyMessage, shouldPost, neededAttention} from '../monitoring/daily-report/summary.mjs';
import {extraBlock} from '../monitoring/daily-report/nav-check.mjs';
import {labCases, measureLab, buildPerformance, summaryOf, leakProof, performanceArea, pageName, hostResolverFlag, nourishLaunch, isNourishAnalyticsRequest, countAnalyticsRequests} from '../monitoring/daily-report/performance.mjs';
import {SITES} from '../monitoring/daily-report/worker.mjs';

const week = (y, base = 1000) => [base, base, base, base, base, base, base, y];

test('volumes: steady day is ok, both comparisons computed', () => {
  const r = compareVolumes(week(1000));
  assert.equal(r.status, 'ok');
  assert.equal(r.vsLastWeek, 0);
  assert.equal(r.avg7, 1000);
});

test('volumes: a drop must show against both last week and the 7-day average', () => {
  assert.equal(compareVolumes(week(400)).status, 'issue');
  assert.equal(compareVolumes(week(650)).status, 'changed');
  // Last week's same day was itself unusually low: only one comparison drops.
  assert.equal(compareVolumes([1000, 1000, 1000, 1000, 1000, 1000, 1000, 400].map((v, i) => (i === 0 ? 400 : v))).status, 'ok');
});

test('volumes: zero is an issue, tiny baselines are ignored, doubling is a change', () => {
  assert.equal(compareVolumes(week(0)).status, 'issue');
  assert.equal(compareVolumes(week(0, 5)).status, 'ok');
  assert.equal(compareVolumes(week(2500)).status, 'changed');
});

test('volumes: any "| Other" CTA click is an issue', () => {
  assert.equal(compareVolumes(week(0, 0), {expectZero: true}).status, 'ok');
  assert.equal(compareVolumes(week(3, 0), {expectZero: true}).status, 'issue');
});

test('window: yesterday and 14 days before, in Pacific time', () => {
  // 2026-10-28 06:00 UTC is still Oct 27 in Pacific time.
  assert.deepEqual(windowFor(new Date('2026-10-28T06:00:00Z')), {yesterday: '20261026', start: '20261012', end: '20261026'});
});

test('event volumes: no Keychain key means skipped, not failed', async () => {
  const r = await eventVolumes({creds: null});
  assert.equal(r.status, 'not-configured');
});

test('event volumes: queries every event and flags the Other CTA', async () => {
  const calls = [];
  const fetcher = async (url, opts) => {
    calls.push(JSON.parse(new URL(url).searchParams.get('e')));
    assert.match(opts.headers.Authorization, /^Basic /);
    const isOther = calls.at(-1).filters?.length;
    return {ok: true, json: async () => ({data: {xValues: Array(15).fill('2026-10-20'), series: [[...Array(7).fill(isOther ? 0 : 1000), ...(isOther ? week(2, 0) : week(1000))]]}})};
  };
  const r = await eventVolumes({creds: {apiKey: 'k', secret: 's'}, fetcher, now: new Date('2026-10-28T16:00:00Z')});
  assert.equal(calls.length, EVENTS.length);
  assert.ok(calls.some((e) => e.event_type === 'Viewed  Page'));
  assert.equal(r.status, 'issue');
  assert.equal(r.issues.length, 1);
  assert.match(r.issues[0], /Other/);
});

test('event volumes: an HTTP error is reported per event', async () => {
  const r = await eventVolumes({creds: {apiKey: 'k', secret: 's'}, fetcher: async () => ({ok: false, status: 401})});
  assert.equal(r.status, 'issue');
  assert.ok(r.events.every((e) => e.status === 'error' && /401/.test(e.reason)));
});

function monitorDir({state, history = [], now}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourish-daily-'));
  if (state) fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state));
  fs.writeFileSync(path.join(dir, 'history.jsonl'), history.map((h) => JSON.stringify(h)).join('\n'));
  return dir;
}

test('monitor: healthy, stale and failing states', () => {
  const now = new Date('2026-10-28T15:00:00Z');
  const healthy = summarizeMonitor(monitorDir({state: {checkedAt: '2026-10-28T14:10:00Z', decision: 'healthy', alertable: [], reportOnly: ['x']},
    history: [{checkedAt: '2026-10-28T14:10:00Z', alertable: 0}, {checkedAt: '2026-10-27T20:00:00Z', alertable: 2}, {checkedAt: '2026-10-26T20:00:00Z', alertable: 1}]}), now);
  assert.equal(healthy.status, 'ok');
  assert.equal(healthy.runsLast24h, 2);
  assert.equal(healthy.failingRunsLast24h, 1);
  assert.deepEqual(healthy.reportOnly, ['x']);
  const stale = summarizeMonitor(monitorDir({state: {checkedAt: '2026-10-28T10:00:00Z', alertable: []}}), now);
  assert.match(stale.issues[0], /last ran 5\.0h ago/);
  const failing = summarizeMonitor(monitorDir({state: {checkedAt: '2026-10-28T14:50:00Z', decision: 'failure', alertable: ['desktop /paid: no signup links']}}), now);
  assert.equal(failing.status, 'issue');
  assert.match(failing.issues[0], /no signup links/);
  assert.equal(summarizeMonitor(monitorDir({}), now).status, 'issue');
});

test('noindex is expected only on pages marked for it', () => {
  const site = {pages: [{id: 'partner-nurx', expectNoindex: true}, {id: 'home'}]};
  const results = [{pageId: 'partner-nurx', health: {metadataIssues: ['noindex']}}, {pageId: 'home', health: {metadataIssues: ['noindex']}}];
  applyExpectedNoindex(results, site);
  assert.deepEqual(results[0].health.metadataIssues, []);
  assert.deepEqual(results[1].health.metadataIssues, ['noindex']);
});

test('verdict: issues already open yesterday stay listed but are not new', () => {
  const pages = {now: [{level: 'issue', key: 'paid--default--desktop', title: 'paid', detail: '1 page error'}]};
  const base = {counts: {expected: 24, captured: 24, candidateChanges: 0}, tracking: {monitor: {status: 'ok', issues: [], runsLast24h: 24, failingRunsLast24h: 0}}};
  const standing = overall({...base, newHealthFindings: []}, pages);
  assert.equal(standing.tone, 'warn');
  assert.equal(standing.headline, 'No new issues (1 still open)');
  const fresh = overall({...base, newHealthFindings: ['paid--default--desktop:error:x']}, pages);
  assert.equal(fresh.tone, 'bad');
  assert.equal(fresh.headline, '1 new issue');
  const tracking = overall({...base, newHealthFindings: [], tracking: {monitor: {issues: ['Tracking monitor failure: y']}}}, {now: []});
  assert.equal(tracking.headline, '1 new issue');
  assert.equal(overall({...base, newHealthFindings: []}, {now: []}).headline, 'All clear');
});

// ---------------------------------------------------------------- Slack message ---
// Compact message (Oct 29 2026, same shape as Unify's): headline + run time, one numbers line,
// attention lines only when present, the link, a one-line next step. Quiet on no-change days.
const stable = (keys) => keys.map((key) => ({key, status: 'candidate-stable-sample', mismatchPercent: 0.1}));
const KEYS = ['home--default--desktop', 'home--default--mobile', 'paid--default--desktop', 'paid--default--mobile'];
const quietReport = (over = {}) => ({outcome: 'no-change', startedAt: '2026-10-29T15:30:00Z', finishedAt: '2026-10-29T16:12:00Z', errors: [],
  counts: {expected: 4, captured: 4, candidateChanges: 0, formChecks: 6, formFailures: 0, newHealthFindings: 0},
  previousCandidates: {status: 'comparison-attempted', rows: stable(KEYS)}, newHealthFindings: [],
  tracking: {monitor: {status: 'ok', issues: [], runsLast24h: 24, failingRunsLast24h: 0, lastCheckedAt: '2026-10-29T15:00:00Z'},
    events: {status: 'not-configured', events: [], issues: [], note: 'No Amplitude key'}},
  performance: {status: 'ok', regressed: false, text: 'stale text that must never be shown', expected: 4, labAvailable: true, regressions: [],
    rows: KEYS.map((k) => ({key: k.replace('--default', ''), pageId: k.split('--')[0], viewport: k.split('--')[2], status: 'measured', score: 90, analyticsRequests: 0}))},
  areas: [], ...over});
const PAGES = {now: []};
const OPTS = {link: 'https://nourish-web-report.pages.dev/', published: true};
const message = (report, pages = PAGES, opts = OPTS) => {
  const n = dailyNotification(report, pages, opts);
  return {n, text: renderDailyMessage(n)};
};

test('slack: a complete no-change day is a three-line message and stays quiet', () => {
  const {n, text} = message(quietReport());
  assert.equal(n.status.code, 'no_change');
  const lines = text.split('\n');
  assert.match(lines[0], /^✅ \*Nourish daily site check — no change\*  ·  Thu, Oct 29, 9:12 AM PT$/);
  assert.equal(lines[1], '4/4 pages captured (desktop + mobile) · 0 visual changes · 0 new issues · quiz and insurance search 6/6 working');
  assert.equal(lines[2], '🔗 https://nourish-web-report.pages.dev/');
  assert.equal(lines.length, 3);
  assert.doesNotMatch(text, /Tracking|Amplitude|Performance|stale text|⚠️|→ /);
  assert.equal(shouldPost(n, null), false, 'history unknown: stay quiet');
  assert.equal(shouldPost(n, false), false);
  assert.equal(shouldPost(n, true), true, 'post once after a day that needed attention');
  assert.equal(neededAttention(n), false);
});

test('slack: visual changes and new issues post with up to four ids; still-open issues alone stay quiet', () => {
  const changed = quietReport({outcome: 'changed-needs-review', counts: {...quietReport().counts, candidateChanges: 1}});
  const pages = {now: [{level: 'changed', key: 'home--default--mobile', title: 'home', detail: '3.1% of pixels changed'}]};
  const c = message(changed, pages);
  assert.equal(c.n.status.code, 'review_needed'); assert.equal(shouldPost(c.n, null), true);
  assert.match(c.text, /^👀 \*Nourish daily site check — review needed\*/);
  assert.match(c.text, /· 1 visual change · 0 new issues ·/);
  assert.match(c.text, /🔍 \*Changed:\* home--default--mobile/);
  assert.match(c.text, /→ Open the report and review the changed pages\./);

  const issues = {now: Array.from({length: 6}, (_, i) => ({level: 'issue', key: `p${i}--default--desktop`, title: `p${i}`, detail: '1 page error'}))};
  const fresh = message(quietReport({outcome: 'changed-needs-review', newHealthFindings: issues.now.map((i) => i.key + ':error:x')}), issues);
  assert.equal(fresh.n.status.code, 'site_failure');
  assert.match(fresh.text, /^🚨 \*Nourish daily site check — site problem\*/);
  assert.match(fresh.text, /🩺 \*New issues:\* p0--default--desktop, p1--default--desktop, p2--default--desktop, p3--default--desktop \+2 more/);
  assert.match(fresh.text, /→ Open the report and check the new issues/);

  const standing = message(quietReport(), issues); // none of them new: newHealthFindings is []
  assert.equal(standing.n.status.code, 'no_change');
  assert.equal(shouldPost(standing.n, null), false);
  assert.match(standing.text, /⏳ \*Still open:\* 6 page issues from before \(see report\)/);
});

test('slack: a performance drop or an analytics leak adds a red line and posts without changing the headline; green adds nothing', () => {
  const drop = quietReport();
  drop.performance = {...drop.performance, regressed: true, status: 'issue', regressions: [{key: 'paid-google--mobile', pageId: 'paid-google', viewport: 'mobile', before: 76, after: 61}]};
  const d = message(drop);
  assert.equal(d.n.status.code, 'no_change'); assert.equal(shouldPost(d.n, null), true);
  assert.match(d.text, /^✅ \*Nourish daily site check — no change\*/);
  assert.match(d.text, /🔴 \*Performance:\* Paid Google \(mobile\) dropped 15 points since yesterday \(76 → 61\); other pages steady/);
  assert.doesNotMatch(d.text, /stale text/);
  const leak = quietReport();
  leak.performance.rows[1].analyticsRequests = 2;
  const l = message(leak, PAGES, {link: 'x', published: false, publishError: 'not published: the speed test reached analytics on 1 of 4 loads'});
  assert.equal(shouldPost(l.n, null), true);
  assert.match(l.text, /🔴 \*Performance:\* the speed test accidentally sent test visits to analytics on 1\/4 page loads; today's scores are discarded/);
  assert.match(l.text, /⚠️ report not published: not published: the speed test reached analytics/);
  assert.match(l.text, /📁 Hosted report not updated; local evidence: monitoring-local\/daily-report\/latest\/index\.html/);
  assert.doesNotMatch(l.text, /https?:\/\//);
});

test('slack: a missing or stale hourly monitor is raised, its own alerted failures and a missing Amplitude key are not', () => {
  const stale = quietReport({tracking: {monitor: {status: 'issue', issues: ['Hourly tracking monitor last ran 5.0h ago (expected hourly)', 'Tracking monitor failure: desktop /paid: no signup links'], runsLast24h: 2, failingRunsLast24h: 1},
    events: {status: 'not-configured', events: [], issues: []}}});
  const {n, text} = message(stale);
  assert.equal(n.status.code, 'no_change'); assert.equal(shouldPost(n, null), true);
  assert.match(text, /🔴 \*Hourly tracking monitor:\* Hourly tracking monitor last ran 5\.0h ago/);
  assert.doesNotMatch(text, /no signup links|Amplitude/);
  const amp = quietReport({tracking: {monitor: quietReport().tracking.monitor, events: {status: 'issue', issues: ['x'], events: [
    {label: 'Get Started Clicked', status: 'issue', yesterday: 123, vsLastWeek: -61, vsAvg7: -58, reason: 'Down 58%+ vs both last week and the 7-day average'},
    {label: 'Viewed Page', status: 'ok', yesterday: 5000}]}}});
  const a = message(amp);
  assert.equal(shouldPost(a.n, null), true);
  assert.match(a.text, /🔴 \*Amplitude:\* Get Started Clicked 123 yesterday \(-61% vs last week, -58% vs the 7-day average\): Down 58%\+/);
  assert.doesNotMatch(a.text, /Viewed Page/);
});

test('slack: run problems and partial captures are a check failure with no local paths or mentions', () => {
  const report = quietReport({outcome: 'execution-error', errors: ['pages: ENOENT /Users/geminpak/secret/run.json <!channel>'], counts: {expected: 4, captured: 2},
    runs: [{name: 'core', results: KEYS.map((key, i) => ({key, visual: {measurementStatus: i < 2 ? 'captured' : 'failed'}}))}]});
  const {n, text} = message(report);
  assert.equal(n.status.code, 'checker_error');
  assert.match(text, /^🚨 \*Nourish daily site check — check failed\*/);
  assert.match(text, /❌ \*Not captured:\* paid--default--desktop, paid--default--mobile/);
  assert.match(text, /⚠️ pages: ENOENT \[local path\] &lt;!channel&gt;/);
  assert.doesNotMatch(text, /\/Users\/|<!channel>/);
  assert.match(text, /→ The check did not finish/);
  assert.doesNotMatch(renderDailyMessage(dailyNotification(quietReport({previousCandidates: {status: 'first-run-no-previous-candidates', rows: []}, outcome: 'first-run-review-required'}), PAGES, OPTS)), /not compared/);
  assert.match(message(quietReport({outcome: 'review-required', previousCandidates: {status: 'comparison-attempted', rows: [...stable(KEYS.slice(0, 3)), {key: KEYS[3], status: 'incompatible-capture-policy-or-environment'}]}})).text, /⚠️ 1 pages not compared \(no comparable earlier screenshot/);
});

// --------------------------------------------------------------- performance ---

test('lab: every Nourish page on both viewports, with the analytics hosts the live pages use made unresolvable', async () => {
  const sets = [];
  for (const [name, file] of SITES) sets.push({name, site: JSON.parse(fs.readFileSync(file, 'utf8'))});
  const cases = labCases(sets);
  assert.equal(cases.length, 86); assert.equal(new Set(cases.map((c) => c.pageId)).size, 43);
  assert.ok(cases.every((c) => c.url.startsWith('https://www.nourish.com/') && ['desktop', 'mobile'].includes(c.viewport.id)));
  assert.ok(!cases.some((c) => /dietitian-application/.test(c.url)));
  const flag = hostResolverFlag();
  for (const h of ['dataplane-proxy.usenourish.com', 'dataplane-proxy.nourish.com', 'jssdk-proxy.usenourish.com', 'jssdk-proxy.nourish.com', 'prodregistryv2.org', '*.prodregistryv2.org', 'featureassets.org', 'statsigapi.net', 'cloudflare-dns.com', '*.amplitude.com', '*.rudderstack.com', 'px.ads.linkedin.com', 'bat.bing.com', '*.posthog.com'])
    assert.ok(flag.includes(`MAP ${h} ~NOTFOUND`), h);
  const launch = nourishLaunch({executablePath: '/x', headless: true, args: ['--host-resolver-rules=MAP *.posthog.com ~NOTFOUND', '--other']});
  assert.deepEqual(launch.args, ['--other', flag]);
  assert.equal(launch.executablePath, '/x');
});

test('lab: answered requests to Nourish or shared analytics hosts count as leaks; blocked ones do not', () => {
  for (const u of ['https://dataplane-proxy.usenourish.com/v1/batch', 'https://jssdk-proxy.nourish.com/v3/modern/rsa.min.js', 'https://prodregistryv2.org/v1/rgstr', 'https://featureassets.org/v1/initialize', 'https://cloudflare-dns.com/dns-query?name=featureassets.org', 'https://api2.amplitude.com/2/httpapi', 'https://px.ads.linkedin.com/collect/?pid=1', 'https://us.i.posthog.com/e/', 'https://www.google-analytics.com/g/collect'])
    assert.ok(isNourishAnalyticsRequest(u), u);
  for (const u of ['https://www.nourish.com/paid', 'https://cdn.prod.website-files.com/x.css', 'https://cdn.jsdelivr.net/npm/statsig-sidecar/dist/index.min.js', 'https://cdn.cookielaw.org/scripttemplates/otSDKStub.js', 'not a url'])
    assert.ok(!isNourishAnalyticsRequest(u), u);
  const lhr = (items) => ({audits: {'network-requests': {details: {items}}}});
  assert.equal(countAnalyticsRequests(lhr([{url: 'https://dataplane-proxy.usenourish.com/v1/page', statusCode: 200}, {url: 'https://jssdk-proxy.usenourish.com/v3/modern/rsa.min.js', statusCode: -1}, {url: 'https://www.nourish.com/', statusCode: 200}])), 1);
  assert.equal(countAnalyticsRequests({}), 0);
});

test('lab: the analytics count comes from the saved network log; a load with no log stays unverified', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nourish-lab-'));
  const c = {pageId: 'paid', url: 'https://www.nourish.com/paid', viewport: {id: 'mobile'}};
  const writes = async (items) => { fs.mkdirSync(path.join(dir, 'lighthouse'), {recursive: true}); fs.writeFileSync(path.join(dir, 'lighthouse', 'paid--mobile.json'), JSON.stringify({audits: {'network-requests': {details: {items}}}})); return {status: 'measured', score: 70, analyticsRequests: 0}; };
  const leaked = await measureLab(c, dir, {launch: {}, measure: () => writes([{url: 'https://dataplane-proxy.usenourish.com/v1/track', statusCode: 200}])});
  assert.equal(leaked.analyticsRequests, 1);
  const clean = await measureLab(c, dir, {launch: {}, measure: () => writes([{url: 'https://dataplane-proxy.usenourish.com/v1/track', statusCode: -1}])});
  assert.equal(clean.analyticsRequests, 0);
  const thrown = await measureLab(c, dir, {launch: {}, measure: async () => ({status: 'capture-failure', error: 'boom'})});
  assert.equal(thrown.analyticsRequests, null, 'the previous attempt\'s log must not be reused');
});

const prow = (pageId, viewport, score, extra = {}) => ({key: `${pageId}--${viewport}`, pageId, viewport, status: 'measured', score, scores: {performance: score, accessibility: 90, bestPractices: 96, seo: 85}, lcpMs: 1200, cls: 0.001, tbtMs: 50, analyticsRequests: 0, error: null, ...extra});
const LAB = ['home', 'paid-google', 'landing-glp-1s', 'ad-nutritionists-for-ibs'];

test('lab: a drop of more than 10 points is a regression in plain language with Nourish page names; 10 is quiet', () => {
  const prev = LAB.flatMap((p) => ['desktop', 'mobile'].map((v) => prow(p, v, 80)));
  const now = prev.map((r) => prow(r.pageId, r.viewport, r.key === 'paid-google--mobile' ? 65 : r.key === 'home--desktop' ? 70 : 80));
  const p = buildPerformance({rows: now, previousRows: prev, expected: 8});
  assert.equal(p.status, 'issue'); assert.equal(p.regressed, true);
  assert.deepEqual(p.regressions.map((g) => [g.key, g.before, g.after]), [['paid-google--mobile', 80, 65]]);
  assert.equal(p.text, 'Paid Google (mobile) dropped 15 points since yesterday (80 → 65); other pages steady');
  assert.deepEqual(summaryOf(p), {status: 'issue', regressed: true, text: p.text});
  assert.equal(pageName('landing-glp-1s'), 'Landing · GLP 1s'); assert.equal(pageName('ad-nutritionists-for-ibs'), 'Ad · Nutritionists for IBS'); assert.equal(pageName('insurance-coverage'), 'Insurance coverage');
  const quiet = buildPerformance({rows: prev.map((r) => prow(r.pageId, r.viewport, r.key === 'home--mobile' ? 70 : 80)), previousRows: prev, expected: 8});
  assert.equal(quiet.status, 'ok'); assert.equal(quiet.text, '8/8 pages scored, lowest 70 (Home, mobile), no drops since yesterday');
  const first = buildPerformance({rows: prev, previousRows: null, expected: 8});
  assert.equal(first.status, 'new'); assert.match(first.text, /^first day of speed scores, 8\/8 pages scored/);
  assert.equal(performanceArea(first).status, 'ok'); assert.equal(performanceArea(null).status, 'skipped');
  const partly = buildPerformance({rows: [...prev.slice(0, 7), prow('ad-nutritionists-for-ibs', 'mobile', null, {status: 'capture-failure', error: 'boom'})], previousRows: prev, expected: 8});
  assert.equal(partly.status, 'changed'); assert.equal(partly.regressed, false);
});

test('lab: publication needs zero answered analytics requests proven on every attempted load', () => {
  const rows = LAB.flatMap((p) => ['desktop', 'mobile'].map((v) => prow(p, v, 80)));
  assert.deepEqual(leakProof({rows}), {ok: true, attempted: 8, leaks: [], unverified: [], reason: null});
  const leak = leakProof({rows: [...rows.slice(0, 7), prow('home', 'mobile', 80, {analyticsRequests: 3})]});
  assert.equal(leak.ok, false); assert.deepEqual(leak.leaks, ['home--mobile']); assert.match(leak.reason, /reached analytics on 1 of 8 loads/);
  const unverified = leakProof({rows: [...rows.slice(0, 7), prow('home', 'mobile', null, {status: 'capture-failure', analyticsRequests: null})]});
  assert.equal(unverified.ok, false); assert.deepEqual(unverified.unverified, ['home--mobile']); assert.match(unverified.reason, /1 of 8 speed-test loads have no network log/);
  const skipped = leakProof({rows: [...rows.slice(0, 7), prow('home', 'mobile', null, {status: 'skipped', analyticsRequests: null})]});
  assert.equal(skipped.ok, true); assert.equal(skipped.attempted, 7);
  assert.equal(leakProof(null).ok, true, 'no lab at all: nothing to prove');
  const leakDay = buildPerformance({rows: [...rows.slice(0, 6), prow('home', 'mobile', 80, {analyticsRequests: 1}), prow('paid-google', 'mobile', 80, {analyticsRequests: 1})], previousRows: null, expected: 8});
  assert.deepEqual(leakDay.analyticsLeaks, ['home--mobile', 'paid-google--mobile']); assert.equal(leakDay.regressed, true);
});

// --------------------------------------------------------- report and detail page ---
const RROOT = '/run/2026-10-29';
const DAYS30 = Array.from({length: 30}, (_, i) => new Date(Date.parse('2026-09-29T00:00:00Z') + i * 864e5).toISOString().slice(0, 10));
const result = (key, extra = {}) => ({key, pageId: key.split('--')[0], url: 'https://www.nourish.com/' + (key.startsWith('home') ? '' : key.split('--')[0]), visual: {measurementStatus: 'captured', image: `${RROOT}/shots/${key}.png`},
  health: {status: 'ok', httpStatus: 200, errors: [], failedAssets: [], metadataIssues: [], content: {failures: []}, accessibility: {violations: []}, ...extra}});
const reportFixture = () => ({schemaVersion: 1, client: 'nourish', startedAt: '2026-10-29T15:30:00Z', finishedAt: '2026-10-29T16:12:00Z', outcome: 'no-change', errors: [], expectedCases: 4,
  runs: [{name: 'core', results: [result('home--default--desktop'), result('home--default--mobile'), result('paid--default--desktop'), result('paid--default--mobile', {failedAssets: [{url: 'https://www.nourish.com/a.png?token=1'}]})]}],
  repeatability: [], headings: [], previousCandidates: {status: 'comparison-attempted', rows: stable(KEYS)}, newHealthFindings: ['paid--default--mobile:asset:x'],
  nav: [{key: 'home--default--desktop', status: 'pass', kind: 'main', viewport: 'desktop', assertion: 'Nav bar shows 7 links/buttons'}],
  forms: [{key: 'home--default--desktop', viewport: 'desktop', status: 'pass', checked: 2, quiz: null, search: [{module: 'Check your coverage', status: 'pass', detail: 'chose Cigna; link updated'}, {module: 'Find dietitians', status: 'fail', detail: 'link has no state /Users/geminpak/x'}]}],
  counts: {expected: 4, captured: 4, candidateChanges: 0, formChecks: 2, formFailures: 1, newHealthFindings: 1, healthFindings: 1, failedAssets: 1, contentFindings: 0},
  tracking: {monitor: {status: 'ok', issues: [], runsLast24h: 24, failingRunsLast24h: 0, lastCheckedAt: '2026-10-29T15:00:00Z', reportOnly: []}, events: {status: 'not-configured', events: [], issues: []}},
  performance: {schemaVersion: 1, status: 'issue', regressed: true, text: 'Paid (mobile) dropped 15 points since yesterday (76 → 61); other pages steady', expected: 4, labAvailable: true,
    regressions: [{key: 'paid--mobile', pageId: 'paid', viewport: 'mobile', before: 76, after: 61}], analyticsLeaks: [],
    rows: [prow('home', 'desktop', 92), prow('home', 'mobile', 70), prow('paid', 'desktop', 90, {runs: 3, spread: [88, 95]}), prow('paid', 'mobile', 61, {runs: 3, spread: [61, 61]})]},
  pageAnalytics: {status: 'ok', cardDays: 7, days: DAYS30, pages: {
    paid: {path: '/paid', views: DAYS30.map(() => 100), clicks: DAYS30.map(() => 10), funnel: [{event: 'Get Started Clicked', label: 'Clicked', people: 50}, {event: 'FlowLoaded', label: 'Reached', people: 20}], errors: {}},
    home: {path: '/', views: DAYS30.map(() => 0), clicks: DAYS30.map(() => 0), funnel: [{event: 'Get Started Clicked', label: 'Clicked', people: 0}, {event: 'FlowLoaded', label: 'Reached', people: 0}], errors: {}}}},
  areas: [{id: 'performance', label: 'Performance', status: 'issue', text: 'Paid (mobile) dropped 15 points since yesterday (76 → 61); other pages steady'}]});
const history = {days: ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'], scores: {'paid--mobile': [null, 60, 61, 70, null, 76, 61]}};

test('detail page: states, health, nav and forms, the four gauges per viewport with metrics, the 7-day strip, Amplitude charts kept private', async () => {
  const {renderDetailPage} = await import('../monitoring/daily-report/detail-page.mjs');
  const h = renderDetailPage({page: {id: 'paid', url: 'https://www.nourish.com/paid'}, report: reportFixture(), root: RROOT, history});
  const order = ['<h1>Paid', 'Captured states', 'Previous run vs latest', 'Health findings', 'Navigation, quiz and insurance search', 'Lighthouse (lab)', '<h2>Analytics (Amplitude)</h2>'].map((t) => h.indexOf(t));
  assert.ok(order.every((i) => i > 0), String(order)); assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(h, /<h3>Desktop<\/h3>/); assert.match(h, /<h3>Mobile<\/h3>/);
  assert.match(h, /src="\.\.\/shots\/paid--default--desktop\.png"/); assert.doesNotMatch(h, /home--default/);
  assert.match(h, /1 file failed to load/); assert.doesNotMatch(h, /token=1/);
  assert.equal((h.match(/<figure class="gauge"/g) || []).length, 8);
  assert.match(h, /<td>mobile<\/td><td>1200<\/td><td>0\.001<\/td><td>50<\/td><td>0<\/td>/);
  assert.match(h, /mobile Performance score dropped from 76 to 61 since yesterday/);
  assert.match(h, /aria-label="Mobile score, last 7 days 2026-10-28: 76 of 100"/); assert.match(h, /aria-label="not measured">–/);
  assert.match(h, /the median of 3 loads per viewport/);
  assert.match(h, /<!--analytics:start-->\s*<h3>Page views per day \(Viewed Page\)<\/h3><svg class="chart"/);
  assert.match(h, /Get Started clicks per day/); assert.match(h, /40% of people who clicked Get Started here reached FlowLoaded within 24 hours/);
  assert.doesNotMatch(h, /<script|PostHog|unifygtm/);
  const none = renderDetailPage({page: {id: 'paid', url: 'https://www.nourish.com/paid'}, report: {...reportFixture(), pageAnalytics: {status: 'unavailable', reason: 'no Amplitude key in the Keychain item "nourish-amplitude-api"'}}, root: RROOT, history});
  assert.match(none, /Amplitude per-page numbers not available today \(no Amplitude key/);
  assert.match(h, /Nourish daily site check/);
  const home = renderDetailPage({page: {id: 'home', url: 'https://www.nourish.com/'}, report: reportFixture(), root: RROOT, history});
  assert.match(home, /<td>desktop<\/td><td>Navigation \(main\)<\/td><td><span class="b ok">OK<\/span><\/td><td>Nav bar shows 7 links\/buttons/);
  assert.match(home, /Insurance search · Find dietitians<\/td><td><span class="b bad">Issue<\/span><\/td><td>link has no state \[local path\]/);
  assert.doesNotMatch(home, /\/Users\//);
  assert.doesNotMatch(home, /score dropped/);
});

test('main report: page cards carry Lighthouse scores, lab vitals and the private Amplitude line; gauges only on the detail pages', async () => {
  const {renderNourishReport} = await import('../monitoring/daily-report/render.mjs');
  const html = renderNourishReport(reportFixture(), RROOT);
  assert.match(html, /<h3><a href="pages\/home\.html">Home<\/a>/); assert.match(html, /<h3><a href="pages\/paid\.html">Paid<\/a>/);
  assert.match(html, /<a href="pages\/paid\.html" aria-label="Paid details"><img/);
  assert.equal((html.match(/Details and analytics →/g) || []).length, 2);
  // Card: scores per viewport (bands as chips), LCP/CLS/TBT, then the Amplitude line, before the card's links.
  const paid = html.slice(html.indexOf('<h3><a href="pages/paid.html">'), html.indexOf('<a href="pages/paid.html">Details and analytics'));
  assert.match(paid, /<td>desktop<\/td><td><span class="b ok">90<\/span><\/td><td><span class="b ok">90<\/span><\/td><td><span class="b ok">96<\/span><\/td><td><span class="b warn">85<\/span><\/td><td><span class="v ok">1\.2 s<\/span><\/td><td><span class="v ok">0\.001<\/span><\/td><td><span class="v ok">50 ms<\/span><\/td>/);
  assert.match(paid, /<td>mobile<\/td><td><span class="b warn">61<\/span>/);
  assert.match(paid, /median of 3 loads per viewport, analytics blocked\. Performance spread today: desktop 88–95/);
  assert.match(paid, /<!--analytics:start--><p class="pm-amp"><span class="muted">Amplitude, last 7 days:<\/span> <strong>700<\/strong> page views · <strong>70<\/strong> Get Started clicks <span class="muted">\(10% of views\)<\/span> · <strong>40%<\/strong> of 50 clickers reached FlowLoaded<\/p><!--analytics:end-->/);
  assert.match(html, /\.pm-amp\{/);
  assert.equal((html.match(/<figure class="gauge"/g) || []).length, 0);
  assert.match(html, /<h2>Performance<\/h2><section class="verdict bad"[^>]*>.*Paid \(mobile\) dropped 15 points since yesterday/);
  assert.match(html, /<th>Performance<\/th><td>Paid \(mobile\) dropped 15 points/);
  assert.match(html, /Nourish daily site check/); assert.doesNotMatch(html, /Unify daily visual check/);
});

test('nav check never loads the application page or the dataplane proxy', () => {
  assert.ok(extraBlock('https://www.nourish.com/dietitian-application?x=1'));
  assert.ok(extraBlock('https://dataplane-proxy.nourish.com/v1/page'));
  assert.ok(extraBlock('https://api2.amplitude.com/2/httpapi'));
  assert.ok(!extraBlock('https://www.nourish.com/become-a-dietitian'));
});

test('publish staging: HTML and images only, noindex, refuses local paths', async () => {
  const {stage} = await import('../monitoring/daily-report/publish.mjs');
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'nourish-pub-src-')), out = path.join(os.tmpdir(), 'nourish-pub-out-' + process.pid);
  fs.mkdirSync(path.join(src, 'a'));
  fs.writeFileSync(path.join(src, 'index.html'), '<p>ok</p>');
  fs.writeFileSync(path.join(src, 'a/shot.png'), 'png');
  fs.writeFileSync(path.join(src, 'report.json'), '{"path":"/Users/x"}');
  fs.writeFileSync(path.join(src, 'worker.log'), 'log');
  stage(src, out);
  assert.deepEqual(fs.readdirSync(out).sort(), ['_headers', 'a', 'index.html', 'robots.txt']);
  assert.match(fs.readFileSync(path.join(out, '_headers'), 'utf8'), /X-Robots-Tag: noindex, nofollow/);
  assert.match(fs.readFileSync(path.join(out, 'robots.txt'), 'utf8'), /Disallow: \//);
  fs.writeFileSync(path.join(src, 'index.html'), '<img src="/Users/geminpak/x.png">');
  assert.throws(() => stage(src, out), /Refusing to publish/);
});


test('publish: analytics numbers and charts stay off the public copy', async () => {
  const {stage, stripAnalytics} = await import('../monitoring/daily-report/publish.mjs');
  const html = '<h1>Report</h1><!--analytics:start--><svg>sessions 1,234</svg><!--analytics:end--><h2>Pages</h2>';
  assert.equal(stripAnalytics(html), '<h1>Report</h1><p class="muted">Traffic and conversion numbers are in the local copy of this report and the Slack DM.</p><h2>Pages</h2>');
  assert.equal(stripAnalytics('<p>a</p><!--analytics:start-->unterminated 1,234'), '<p>a</p>');
  // One note per page, however many page cards had numbers.
  assert.equal(stripAnalytics(html + '<!--analytics:start--><p>700 views</p><!--analytics:end--><p>card</p>'), '<h1>Report</h1><p class="muted">Traffic and conversion numbers are in the local copy of this report and the Slack DM.</p><h2>Pages</h2><p>card</p>');
  const src = fs.mkdtempSync(path.join(os.tmpdir(), 'nourish-pub2-')), out = path.join(os.tmpdir(), 'nourish-pub2-out-' + process.pid);
  fs.writeFileSync(path.join(src, 'index.html'), html);
  stage(src, out);
  assert.doesNotMatch(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), /1,234|analytics:start/);
  stage(src, out, {keepAnalytics: true});
  assert.match(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), /1,234/);
});

test('known vendor error is excused only when traced to its script on that page state', async () => {
  const {applyKnownErrors, combineInteraction} = await import('../monitoring/daily-report/summary.mjs');
  const msg = "Cannot read properties of null (reading 'querySelectorAll')";
  const known = [{message: msg, script: 'videsigns/webflow-tools', reason: 'self-check'}];
  const traced = {pageErrors: [{message: msg, source: 'https://cdn.jsdelivr.net/gh/videsigns/webflow-tools@latest/multi-step.js'}]};
  const r = applyKnownErrors({health: {errors: [msg, 'Other boom']}}, traced, known);
  assert.deepEqual(r.health.errors, ['Other boom']);
  assert.equal(r.health.knownErrors[0].script, 'videsigns/webflow-tools');
  // Same message from a different script, or not seen by the form check: still an error.
  assert.deepEqual(applyKnownErrors({health: {errors: [msg]}}, {pageErrors: [{message: msg, source: 'https://www.nourish.com/x.js'}]}, known).health.errors, [msg]);
  assert.deepEqual(applyKnownErrors({health: {errors: [msg]}}, {pageErrors: []}, known).health.errors, [msg]);
  assert.equal(combineInteraction({status: 'pass', assertion: 'nav ok'}, {status: 'fail', assertion: 'quiz stuck'}).assertion, 'quiz stuck');
  assert.equal(combineInteraction({status: 'pass', assertion: 'nav ok'}, {status: 'pass', assertion: 'quiz ok'}).status, 'pass');
});

test('form check helpers: script source from a stack, link expectations', async () => {
  const {errorSource, linkFailures} = await import('../monitoring/daily-report/form-check.mjs');
  assert.equal(errorSource('TypeError\n    at <anonymous> (https://cdn.jsdelivr.net/gh/videsigns/webflow-tools@latest/multi-step.js:3435:32)'), 'https://cdn.jsdelivr.net/gh/videsigns/webflow-tools@latest/multi-step.js');
  assert.equal(errorSource('no url here'), null);
  const before = new URLSearchParams('landingPageVariation=Organic_Homepage');
  assert.deepEqual(linkFailures(before, new URLSearchParams('landingPageVariation=Organic_Homepage&nourishPayerId=3&state=CA'), {nourishPayerId: true, state: 'CA'}), []);
  assert.deepEqual(linkFailures(before, new URLSearchParams('nourishPayerId=3'), {nourishPayerId: true, state: 'CA'}), ['link has no state after choosing it', 'link lost landingPageVariation']);
  assert.deepEqual(linkFailures(before, new URLSearchParams('landingPageVariation=x&state=NY'), {state: 'CA'}), ['link state=NY, expected CA']);
});

test('lab: the median of the day\'s loads is kept; any leak counts; a load with no log is ignored when another is verified', async () => {
  const {medianRun, median, LAB_RUNS} = await import('../monitoring/daily-report/performance.mjs');
  assert.equal(LAB_RUNS, 3); assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 4]), 2.5); assert.equal(median([null]), null);
  const load = (score, extra = {}) => ({status: 'measured', score, scores: {performance: score, accessibility: score + 1, bestPractices: 90, seo: 80}, metrics: {lcpMs: score * 100, cls: 0.01, tbtMs: 1000 - score * 10}, analyticsRequests: 0, ...extra});
  const r = medianRun([load(40), load(75), load(60)]);
  assert.equal(r.score, 60); assert.equal(r.scores.accessibility, 61); assert.equal(r.metrics.lcpMs, 6000); assert.equal(r.metrics.tbtMs, 400);
  assert.equal(r.runs, 3); assert.deepEqual(r.spread, [40, 75]); assert.equal(r.analyticsRequests, 0);
  assert.equal(medianRun([load(50), load(60, {analyticsRequests: 2}), load(70)]).analyticsRequests, 2);
  const partial = medianRun([{status: 'capture-failure', error: 'x', analyticsRequests: null}, load(70), load(72)]);
  assert.equal(partial.runs, 2); assert.equal(partial.score, 71); assert.equal(partial.analyticsRequests, 0);
  const failed = medianRun([{status: 'capture-failure', error: 'x', analyticsRequests: null}, {status: 'capture-failure', error: 'y', analyticsRequests: null}]);
  assert.equal(failed.status, 'capture-failure'); assert.equal(failed.error, 'y'); assert.equal(failed.analyticsRequests, null); assert.equal(failed.runs, 0);
});

test('page analytics: no Keychain key means unavailable, never a failed run', async () => {
  const {fetchPageAnalytics} = await import('../monitoring/daily-report/page-analytics.mjs');
  const r = await fetchPageAnalytics({pageUrls: {paid: 'https://www.nourish.com/paid'}, creds: null, fetcher: () => { throw new Error('no call'); }});
  assert.equal(r.status, 'unavailable'); assert.match(r.reason, /nourish-amplitude-api/); assert.equal(r.days.length, 30);
});

test('page analytics: views by path, clicks by location, one funnel per clicked page, trailing slashes merged', async () => {
  const {fetchPageAnalytics, cardNumbers, lastDays} = await import('../monitoring/daily-report/page-analytics.mjs');
  const now = new Date('2026-10-29T16:00:00Z'), days = lastDays(now);
  assert.equal(days[0], '2026-09-29'); assert.equal(days.at(-1), '2026-10-28');
  const calls = [];
  const fetcher = async (url, opts) => {
    const u = new URL(url); calls.push(u);
    assert.match(opts.headers.Authorization, /^Basic /);
    if (u.pathname.endsWith('/segmentation')) {
      const e = JSON.parse(u.searchParams.get('e'));
      assert.equal(u.searchParams.get('start'), '20260929'); assert.equal(u.searchParams.get('end'), '20261028');
      const series = e.event_type === 'Viewed Page'
        ? {seriesLabels: [[0, '/paid'], [0, '/paid/'], [0, '(none)'], [0, '/']], series: [days.map(() => 100), days.map(() => 1), days.map(() => 5), days.map(() => 3)]}
        : {seriesLabels: ['/paid'], series: [days.map(() => 10)]};
      assert.deepEqual(e.group_by, [{type: 'event', value: e.event_type === 'Viewed Page' ? 'path' : 'location'}]);
      return {ok: true, json: async () => ({data: {...series, xValues: days}})};
    }
    const steps = u.searchParams.getAll('e').map((x) => JSON.parse(x));
    assert.deepEqual(steps[0].filters[0], {subprop_type: 'event', subprop_key: 'location', subprop_op: 'is', subprop_value: ['/paid', '/paid/']});
    assert.equal(steps[1].event_type, 'FlowLoaded'); assert.equal(u.searchParams.get('cs'), '86400'); assert.equal(u.searchParams.get('start'), '20261022');
    return {ok: true, json: async () => ({data: [{cumulativeRaw: [50, 20]}]})};
  };
  const r = await fetchPageAnalytics({pageUrls: {paid: 'https://www.nourish.com/paid', home: 'https://www.nourish.com/', faq: 'https://www.nourish.com/faq'}, now, creds: {apiKey: 'k', secret: 's'}, fetcher});
  assert.equal(r.status, 'ok'); assert.equal(r.queries, 3);
  assert.equal(calls.filter((u) => u.pathname.endsWith('/funnels')).length, 1); // only /paid had clicks
  assert.equal(r.pages.paid.views[0], 101); assert.equal(r.pages.home.views[0], 3); assert.equal(r.pages.faq.views[0], 0);
  assert.deepEqual(cardNumbers(r.pages.paid), {views: 707, clicks: 70, clickRate: 70 * 100 / 707, clickers: 50, flowLoaded: 20, conversion: 40});
  assert.equal(cardNumbers(r.pages.home).conversion, null);
});

test('page analytics: an HTTP error is kept per metric and never echoes the key', async () => {
  const {fetchPageAnalytics} = await import('../monitoring/daily-report/page-analytics.mjs');
  const r = await fetchPageAnalytics({pageUrls: {paid: 'https://www.nourish.com/paid'}, creds: {apiKey: 'SECRETKEY', secret: 'SECRET2'}, fetcher: async () => ({ok: false, status: 429})});
  assert.equal(r.status, 'unavailable'); assert.equal(r.reason, 'Amplitude HTTP 429');
  assert.doesNotMatch(JSON.stringify(r), /SECRET/);
});

test('publish: the report goes to nourish-web-report; the old address only redirects there', async () => {
  const {PROJECT, OLD_PROJECT, REPORT_URL, stageRedirect} = await import('../monitoring/daily-report/publish.mjs');
  assert.equal(PROJECT, 'nourish-web-report'); assert.equal(REPORT_URL, 'https://nourish-web-report.pages.dev/'); assert.equal(OLD_PROJECT, 'nourish-visual-report');
  const out = stageRedirect(path.join(os.tmpdir(), 'nourish-redirect-' + process.pid));
  assert.deepEqual(fs.readdirSync(out).sort(), ['_headers', '_redirects', 'index.html']);
  assert.equal(fs.readFileSync(path.join(out, '_redirects'), 'utf8'), '/* https://nourish-web-report.pages.dev/:splat 301\n');
  assert.match(fs.readFileSync(path.join(out, '_headers'), 'utf8'), /noindex/);
});
