// One daily Nourish run, modelled on the Unify daily worker:
//   visual + health (page checker) for each page set in SITES, same-run repeat
//   capture (noise check), nav/menu check, quiz + insurance-search check, Lighthouse
//   lab scores (all four categories, analytics blocked and verified per load), change
//   vs the previous run (2% threshold), tracking stability, one detail page per page.
// Writes report.json, index.html and pages/<id>.html into the run directory. Never approves baselines.
// Usage: node worker.mjs <runDir> [previousRunDir]
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {checker, siteAudit} from './checker.mjs';
import {checkNav} from './nav-check.mjs';
import {checkForms} from './form-check.mjs';
import {summarizeMonitor, eventVolumes} from './tracking.mjs';
import {renderNourishReport, renderNourishComparison} from './render.mjs';
import {renderDetailPage} from './detail-page.mjs';
import {labCases, measureLab, medianRun, LAB_RUNS, labRow, buildPerformance, performanceArea} from './performance.mjs';
import {fetchPageAnalytics} from './page-analytics.mjs';
import {applyExpectedNoindex, applyKnownErrors, combineInteraction} from './summary.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
// The checker allows 25 pages per site config, so the pages come in three sets.
export const SITES = [['core', 'pages/core.json'], ['paid', 'pages/paid.json'], ['landing', 'pages/landing.json']].map(([name, f]) => [name, path.join(HERE, f)]);
export const STORE = process.env.NOURISH_DAILY_DIR || path.join(REPO, 'monitoring-local/daily-report');
const MONITOR_DIR = process.env.TRACKING_MONITOR_DIR || path.join(REPO, 'monitoring-local');
// 86 page states × LAB_RUNS (3) Lighthouse loads at roughly 10 s each; the coordinator allows 150
// minutes for the whole run.
const PERF_BUDGET_SECONDS = Number(process.env.NOURISH_PERF_BUDGET_SECONDS) || 3600;

const {runChecks} = await checker('src/runner.mjs');
const {readJson, writeJson, selectCases} = await checker('src/model.mjs');
const {browserOptions, protectPage} = await checker('src/browser.mjs');
const {buildConfig, executeVisual} = await checker('src/adapter/backstop.mjs');
const {compareCandidateImages, VISUAL_CHANGE_PERCENT} = await checker('src/candidate-diff.mjs');
const {healthSignature, newHealthFindings, classifyOutcome} = await checker('src/daily-outcome.mjs');
const {caseParts} = await checker('src/report-html.mjs');
const {loadScoreHistory} = await checker('src/score-history.mjs');
const {chromium} = await checker('node_modules/playwright/index.mjs');

async function main() {
  const root = path.resolve(process.argv[2]);
  const previousRoot = process.argv[3] ? path.resolve(process.argv[3]) : null;
  const started = Date.now();
  const sets = [];
  for (const [name, file] of SITES) { const site = await readJson(file); sets.push({name, file, site, cases: selectCases(site, 'smoke')}); }
  const expected = sets.reduce((n, s) => n + s.cases.length, 0);
  const report = {schemaVersion: 1, client: 'nourish', startedAt: new Date().toISOString(), expectedCases: expected,
    baselineStatus: 'Human approval required; no automatic promotion', runs: [], repeatability: [], headings: [], nav: [], forms: [], errors: []};
  const save = async () => {
    report.elapsedSeconds = (Date.now() - started) / 1000;
    await writeJson(path.join(root, 'report.json'), report);
    await fs.writeFile(path.join(root, 'index.html'), renderNourishReport(report, root));
  };
  await fs.mkdir(root, {recursive: true});
  await save();

  for (const set of sets) {
    const {name, file, site, cases} = set;
    let run = null;
    try {
      const r = await runChecks({siteFile: file, root, baselineRoot: STORE});
      run = r.run;
      applyExpectedNoindex(run.results, site);
      report.runs.push({name, runFile: path.relative(root, path.join(r.runDir, 'run.json')), outcome: run.outcome, results: run.results});
    } catch (e) { report.errors.push(`${name} pages: ${e.message}`); }
    await save();
    if (!run) continue;
    set.run = run;

    // Same-run repeat against this run's own captures: a page that differs from
    // itself minutes later is noisy, so its change vs yesterday may be noise too.
    try {
      const captured = cases.filter((c) => run.results.find((r) => r.key === c.key)?.visual.measurementStatus === 'captured');
      const dir = path.join(root, 'repeatability', name), refs = path.join(dir, 'unapproved-candidates');
      await fs.mkdir(refs, {recursive: true}); await fs.mkdir(path.join(dir, 'capture'), {recursive: true});
      for (const c of captured) { const res = run.results.find((r) => r.key === c.key); await fs.copyFile(res.visual.image, path.join(refs, path.basename(res.visual.image))); }
      const rows = run.results.filter((r) => r.visual.measurementStatus !== 'captured').map((r) => ({key: r.key, capture: 'initial-capture-failed', mismatchPercent: null}));
      if (captured.length) {
        const config = buildConfig({site, cases: captured, runDir: dir, baselineDir: refs, launch: browserOptions()});
        const raw = await executeVisual(config);
        for (const c of captured) {
          const t = raw.report?.tests?.find((t) => t.pair.label === c.key);
          const capture = await readJson(path.join(dir, 'capture', c.key + '.json')).catch(() => null);
          rows.push({key: c.key, capture: capture?.status ?? 'missing', mismatchPercent: t?.pair.misMatchPercentage ?? t?.pair.diff?.misMatchPercentage ?? null});
        }
      }
      report.repeatability.push({name, purpose: 'unapproved-candidate-repeatability', rows, detail: path.relative(root, path.join(dir, 'visual/index.html'))});
    } catch (e) { report.errors.push(`${name} repeatability: ${e.message}`); }
    await save();

    let browser;
    try {
      // The checker's own launch options, the same as the primary captures (runChecks) and the repeat
      // capture: its analytics hosts are unresolvable, protectPage aborts every non-GET request and
      // drops beacons, and nav-check's extraBlock aborts the RudderStack dataplane proxy. Nourish's
      // wider host list (performance.mjs) is for Lighthouse only, which has no request routing; using
      // it here would let the page under test resolve a different Statsig variant from the captured one.
      browser = await chromium.launch(browserOptions());
      for (const c of cases) {
        const page = site.pages.find((p) => p.id === c.pageId);
        const nav = await checkNav(browser, {url: c.url, viewport: c.viewport, nav: page.nav}, {protectPage});
        const forms = await checkForms(browser, {url: c.url, viewport: c.viewport}, {protectPage});
        report.nav.push({key: c.key, ...nav});
        report.forms.push({key: c.key, ...forms});
        // Feed both into the checker's own "interaction" slot so its report and
        // outcome rules treat a broken menu, quiz or search like Unify's failed menu check.
        const res = run.results.find((r) => r.key === c.key);
        if (res?.health && res.health.status !== 'not-run') {
          res.health.interaction = combineInteraction(nav, forms);
          applyKnownErrors(res, forms, site.knownErrors ?? []);
        }
      }
    } catch (e) { report.errors.push(`${name} nav/form check: ${e.message}`); }
    finally { await browser?.close(); }
    await save();
  }

  // Performance is a supporting area: Lighthouse (all four categories) on every page and viewport,
  // analytics hosts unresolvable and each load's network log checked (performance.mjs). Its
  // failures never become report.errors, so they cannot turn a visual day into an execution error.
  let previousPerformanceRows = null, previousDiscarded = false;
  if (previousRoot) {
    try {
      const prior = (await readJson(path.join(previousRoot, 'report.json'))).performance;
      // A day whose lab loads reached analytics is discarded, not used as today's baseline.
      if (prior?.analyticsLeaks?.length) previousDiscarded = true; else previousPerformanceRows = prior?.rows ?? null;
    } catch {}
  }
  try {
    const cases = labCases(sets), rows = [], begin = Date.now();
    for (const c of cases) {
      if ((Date.now() - begin) / 1000 > PERF_BUDGET_SECONDS) { rows.push(labRow({pageId: c.pageId, viewport: c.viewport.id, status: 'skipped', error: 'performance time budget used'})); continue; }
      console.log(`Lab performance ${c.pageId} ${c.viewport.id} (${LAB_RUNS} loads, median kept)`);
      const loads = [];
      for (let i = 0; i < LAB_RUNS; i++) loads.push(await measureLab(c, root));
      // One extra attempt when no load scored, as before.
      if (!loads.some((l) => l.status === 'measured' && Number.isFinite(l.score))) loads.push(await measureLab(c, root));
      const r = medianRun(loads);
      rows.push({...labRow({pageId: c.pageId, viewport: c.viewport.id, ...r}), runs: r.runs, spread: r.spread});
      report.performance = {rows, partial: true};
      await save();
    }
    report.performance = buildPerformance({rows, previousRows: previousPerformanceRows, expected: cases.length, previousDiscarded});
  } catch (e) { report.performance = {schemaVersion: 1, status: 'skipped', regressed: false, text: 'not measured today (' + String(e.message).split('\n')[0].slice(0, 80) + ')', rows: []}; }
  await save();

  report.tracking = {monitor: summarizeMonitor(MONITOR_DIR)};
  try { report.tracking.events = await eventVolumes(); }
  catch (e) { report.tracking.events = {status: 'error', events: [], issues: ['Amplitude volumes: ' + e.message]}; }
  // Today's Lighthouse result replaces site-audit's weekly Performance line; whatever else
  // site-audit config/daily.json turns on (SEO/AEO, GA4, GSC) is added after it.
  try {
    const {sharedAreas, siteConfig} = await siteAudit('src/daily/areas.mjs');
    const {areas, google} = await sharedAreas('nourish');
    report.areas = [performanceArea(report.performance), ...areas.filter((a) => a.id !== 'performance')]; report.google = google;
    const {dashboardLinks} = await siteAudit('src/daily/charts.mjs');
    report.dashboardLinks = dashboardLinks(siteConfig('nourish'));
  } catch (e) { report.areas = [performanceArea(report.performance)]; report.errors.push('site-audit areas: ' + e.message); }

  // Per-page Amplitude numbers (page cards and detail pages). Never fails the run; without the
  // Keychain key the cards say so.
  try {
    const pageUrls = Object.fromEntries(sets.flatMap((s) => s.site.pages.map((p) => [p.id, p.url])));
    report.pageAnalytics = await fetchPageAnalytics({pageUrls});
  } catch (e) { report.pageAnalytics = {status: 'unavailable', reason: String(e.message).split('\n')[0].slice(0, 120), days: [], pages: {}}; }
  await save();

  report.finishedAt = new Date().toISOString();
  report.previousCandidates = {status: previousRoot ? 'comparison-attempted' : 'first-run-no-previous-candidates', rows: []};
  if (previousRoot) {
    try {
      const previous = await readJson(path.join(previousRoot, 'report.json'));
      report.previousCandidates.previousFinishedAt = previous.finishedAt ?? null;
      for (const set of sets.filter((s) => s.run)) {
        const old = previous.runs.find((r) => r.name === set.name);
        // A page set new since the last run has nothing to compare yet.
        const before = old ? await readJson(path.join(previousRoot, old.runFile)) : {results: []};
        for (const r of set.run.results) {
          const prior = before.results.find((p) => p.key === r.key);
          const result = await compareCandidateImages({before: prior?.visual.measurementStatus === 'captured' ? prior.visual.image : null,
            after: r.visual.measurementStatus === 'captured' ? r.visual.image : null, destination: path.join(root, 'candidate-changes', r.key),
            compatible: before.environmentFingerprint === set.run.environmentFingerprint && prior?.caseFingerprint === r.caseFingerprint});
          report.previousCandidates.rows.push({key: r.key, ...result});
        }
      }
    } catch (e) { report.previousCandidates.status = 'previous-evidence-unavailable'; report.errors.push('Previous run comparison: ' + e.message); }
  }

  const results = report.runs.flatMap((r) => r.results), repeats = report.repeatability.flatMap((r) => r.rows);
  report.counts = {expected, captured: results.filter((r) => r.visual.measurementStatus === 'captured').length,
    healthFindings: results.filter((r) => r.health.status === 'findings').length,
    failedAssets: results.reduce((n, r) => n + (r.health.failedAssets?.length ?? 0), 0),
    contentFindings: results.reduce((n, r) => n + (r.health.content?.failures.length ?? 0), 0),
    navFailures: report.nav.filter((n) => n.status !== 'pass').length,
    formChecks: report.forms.reduce((n, f) => n + (f.checked ?? 0), 0),
    formFailures: report.forms.reduce((n, f) => n + (f.quiz && f.quiz.status !== 'pass' ? 1 : 0) + (f.search ?? []).filter((m) => m.status !== 'pass').length + (f.error ? 1 : 0), 0),
    knownErrors: results.reduce((n, r) => n + (r.health.knownErrors?.length ?? 0), 0),
    repeatabilityChanged: repeats.filter((r) => Number(r.mismatchPercent) > VISUAL_CHANGE_PERCENT).length};
  report.healthSignature = healthSignature(results);
  let previousHealth = null;
  if (previousRoot) { try { previousHealth = (await readJson(path.join(previousRoot, 'report.json'))).healthSignature ?? null; } catch {} }
  report.newHealthFindings = newHealthFindings(report.healthSignature, previousHealth);
  report.counts.candidateChanges = report.previousCandidates.rows.filter((r) => r.status === 'candidate-change-needs-review').length;
  report.counts.newHealthFindings = report.newHealthFindings?.length ?? null;
  report.outcome = classifyOutcome({
    executionError: !!(report.errors.length || results.length !== expected || report.runs.some((r) => r.outcome === 'capture-failure')
      || repeats.length !== expected || repeats.some((r) => r.capture !== 'captured' || r.mismatchPercent === null) || report.nav.length !== expected || report.forms.length !== expected),
    critical: false, candidateRows: report.previousCandidates.rows, expectedRows: expected, newHealth: report.newHealthFindings});
  await fs.mkdir(path.join(root, 'candidate-changes'), {recursive: true});
  await fs.writeFile(path.join(root, 'candidate-changes/index.html'), renderNourishComparison(report, root));

  // One detail page per captured page (states, health, nav/forms, Lighthouse, 7-day scores).
  // A failure leaves that page's link dead and is logged; it never fails the run.
  report.detailPages = {written: 0, failed: []};
  try {
    const history = await loadScoreHistory({runsDir: path.join(STORE, 'runs'), report}).catch(() => null);
    await fs.mkdir(path.join(root, 'pages'), {recursive: true});
    const captured = new Set(results.map((r) => caseParts(r.key).pageId));
    for (const set of sets) for (const page of set.site.pages.filter((p) => captured.has(p.id))) {
      try { await fs.writeFile(path.join(root, 'pages', page.id + '.html'), renderDetailPage({page, report, root, history})); report.detailPages.written++; }
      catch (e) { report.detailPages.failed.push(page.id); console.log('detail page failed', page.id, String(e.message).split('\n')[0]); }
    }
  } catch (e) { console.log('detail pages skipped:', String(e.message).split('\n')[0]); }
  await save();
  process.exitCode = report.outcome === 'execution-error' ? 2 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
