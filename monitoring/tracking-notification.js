'use strict';
// Adapt existing outcomes for display; never decide whether a notification is sent.
const executionKinds = new Set(['navigation', 'execution', 'browser-click']);
function hasCheckerError(report) {
  return report?.failureKind === 'monitor-execution' || report?.cases?.some(row =>
    row.failureKinds?.some(kind => executionKinds.has(kind)) ||
    row.errors?.some(error => /(?:page\.goto|locator\.click|browser\.newContext|context\.newPage|context\.close):|TimeoutError/.test(String(error)))) || false;
}
function trackingNotification({decision, alertable = [], reportOnly = [], utm, site, startedAt, finishedAt, evidence, lastSuccessfulRun = null}) {
  const reports = [['UTM handoff', utm], ['Browser emission', site]];
  const error = reports.some(([, report]) => hasCheckerError(report) || report?.complete === false);
  let code = error ? 'checker_error' : decision === 'recovery' ? 'recovered' : alertable.length ? 'site_failure' : 'no_change';
  const unknowns = reports.filter(([, report]) => report?.complete !== true || !Array.isArray(report?.cases))
    .map(([label]) => `${label}: complete measurement is unavailable or unconfirmed.`);
  if (!finishedAt || !Number.isFinite(Date.parse(finishedAt))) unknowns.push('Run completion time was not recorded.');
  if (['recovered', 'no_change'].includes(code) && unknowns.length) code = 'unknown';
  const summary = code === 'checker_error' ? 'Some checks could not complete; production tracking status is unconfirmed.'
    : code === 'unknown' ? 'Measurement completeness is unknown; no overall pass is claimed.'
    : code === 'recovered' ? `Previously alerted failures cleared.${reportOnly.length ? ' Report-only findings remain below.' : ''}`
    : `${alertable.length} alerted finding(s); ${reportOnly.length} report-only finding(s).`;
  const actions = {checker_error: 'Inspect saved diagnostics and restore the failed check; no site-health conclusion for incomplete checks.',
    unknown: 'Review missing coverage before treating this run as complete.', recovered: 'No action needed for the recovered checks; review remaining report-only findings.',
    site_failure: 'Inspect the affected check evidence before changing the site; no automatic repair.',
    no_change: 'No new tracking action indicated within measured scope; review report-only findings.'};
  return {
    schemaVersion: 1, client: 'Nourish', check: 'Hourly tracking',
    status: {code, sourceStatus: decision ?? null, sourceOutcome: null}, summary,
    affectedChecks: [
      ...alertable.map(summary => ({check: utm?.failures?.includes(summary) ? 'UTM handoff' : 'Browser tracking', status: code, summary, caseIds: []})),
      ...reportOnly.map(summary => ({check: 'Report only', status: 'review_needed', summary, caseIds: []})),
    ],
    coverage: {
      summary: reports.map(([label, report]) => `${label}: ${Array.isArray(report?.cases) ? report.cases.length : '?'} returned cases; ${hasCheckerError(report) || report?.complete === false ? 'incomplete' : report?.complete === true ? 'completed' : 'completion unknown'}`).join('; '),
      limits: 'Browser emission and UTM handoff only; backend ingestion is outside scope; planned case totals are not exposed by current reports', unknowns,
    },
    currentRun: {id: startedAt || null, startedAt: startedAt || null, finishedAt: finishedAt || null}, lastSuccessfulRun,
    evidence: {url: null, published: false, description: evidence ? 'Local results: ' + String(evidence).split('/').filter(Boolean).slice(-2).join('/') : 'Local results location unavailable'},
    nextAction: actions[code],
  };
}
module.exports = {trackingNotification, hasCheckerError};
