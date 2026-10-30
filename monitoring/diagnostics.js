'use strict';
const fs = require('node:fs');
const path = require('node:path');

const MAX_ATTEMPTS = 168;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LOG_BYTES = 64 * 1024;
const MAX_JSON_BYTES = 256 * 1024;

// Diagnostics never serialize request bodies, event properties, cookies, browser
// storage, or environment variables. Strip URL details and common secret/PII
// patterns from the bounded error/log text that remains.
function redact(value) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s<>"']+/gi, '[url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b(?:xox[baprs]-[\w-]+|gh[pousr]_[\w]+|github_pat_[\w]+|sk-[\w-]+|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '[secret]')
    .replace(/\b(?:Bearer|Basic)\s+\S+/gi, '[authorization]')
    .replace(/\b(?:authorization|cookie|password|token|api[_-]?key|secret|email|phone|first[_-]?name|last[_-]?name|full[_-]?name)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '[redacted field]')
    .replace(/\b(?:\+?\d[ ().-]*){10,15}\b/g, '[number]');
}

const errorText = value => redact(value?.message || value).split('\n')[0].slice(0, 500);
const failures = values => (Array.isArray(values) ? values : []).slice(0, 8).map(errorText);
const measuredBoolean = value => typeof value === 'boolean' ? value : null;
const measuredNumber = value => Number.isFinite(value) ? value : null;
const measuredCount = value => Array.isArray(value) ? value.length : null;
const nullableText = value => typeof value === 'string' ? errorText(value) : null;

function readinessSummary(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    documentReadyState: ['loading', 'interactive', 'complete'].includes(value.documentReadyState) ? value.documentReadyState : null,
    sdkPresent: measuredBoolean(value.sdkPresent), sdkIsQueue: measuredBoolean(value.sdkIsQueue),
    sdkTrackAvailable: measuredBoolean(value.sdkTrackAvailable),
    consentGroups: Array.isArray(value.consentGroups) ? value.consentGroups.filter(v => /^C\d{4}$/.test(v)).slice(0, 32) : null,
  };
}

function destinationSummary(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return '[other destination]';
    const origin = ['signup.nourish.com', 'signup.usenourish.com'].includes(url.hostname) ? url.origin : '[other origin]';
    const pathname = ['/', '/1', '/2', '/providers', '/flow/get-started'].includes(url.pathname) ? url.pathname : '/[other path]';
    return origin + pathname;
  } catch { return '[invalid destination]'; }
}

function selectedCtaSummary(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    selector: 'first visible signup-host link',
    ctaId: typeof value.ctaId === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value.ctaId) ? value.ctaId : null,
    destination: destinationSummary(value.destination),
    target: ['', '_self', '_blank', '_parent', '_top'].includes(value.target) ? value.target : null,
  };
}

function clickSummary(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    outcome: ['not-attempted', 'pending', 'completed', 'rejected'].includes(value.outcome) ? value.outcome : null,
    elapsedMs: measuredNumber(value.elapsedMs), error: nullableText(value.error),
  };
}

function caseSummary(row) {
  if (!row) return null;
  return {
    route: nullableText(row.route)?.slice(0, 160) ?? null, device: nullableText(row.device)?.slice(0, 32) ?? null,
    consent: ['unset', 'accepted', 'rejected'].includes(row.consent) ? row.consent : null,
    status: measuredNumber(row.status), sdkRequested: measuredBoolean(row.sdkRequested), sdkActive: measuredBoolean(row.sdkActive),
    idleEvents: measuredCount(row.idle), clicks: measuredCount(row.clicks),
    pageErrors: measuredCount(row.errors), consoleErrors: measuredCount(row.consoleErrors),
    failedAssets: measuredCount(row.failedAssets), failureCount: measuredCount(row.failures), failures: failures(row.failures),
    ...(row.diagnosticType === 'utm' ? {
      diagnosticType: 'utm', links: measuredNumber(row.links), visibleLinks: measuredNumber(row.visibleLinks),
      iframes: measuredNumber(row.iframes), linksClicked: measuredNumber(row.linksClicked),
      selectedCta: selectedCtaSummary(row.selectedCta), browserClick: clickSummary(row.browserClick),
      readinessAfterLoad: readinessSummary(row.readinessAfterLoad), readinessBeforeClick: readinessSummary(row.readinessBeforeClick),
      clickEvent: ['Get Started Clicked', 'Dietitian Directory Clicked'].includes(row.clickEvent) ? row.clickEvent : null,
      emissionObserved: measuredBoolean(row.emissionObserved), capturedNavigations: measuredNumber(row.capturedNavigations),
      clickDestination: destinationSummary(row.click), diagnosticErrors: failures(row.diagnosticErrors),
      failureKinds: (row.failureKinds || []).filter(v => ['navigation', 'browser-click', 'execution', 'event-observation', 'tracking-contract'].includes(v)),
      phase: nullableText(row.phase), phaseHistory: (row.phaseHistory || []).slice(-24).map(p => ({ operation: errorText(p.operation).slice(0, 80), startedAt: errorText(p.startedAt).slice(0, 32), elapsedMs: measuredNumber(p.elapsedMs) })),
    } : {}),
  };
}

function reportSummary(report) {
  return {
    checkedAt: errorText(report.checkedAt), complete: typeof report.complete === 'boolean' ? report.complete : undefined,
    failureKind: report.failureKind === 'monitor-execution' ? 'monitor-execution' : undefined,
    failureCount: Array.isArray(report.failures) ? report.failures.length : 0,
    failures: failures(report.failures), cases: (Array.isArray(report.cases) ? report.cases : []).slice(0, 50).map(caseSummary),
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  let text = JSON.stringify(value, null, 2);
  if (Buffer.byteLength(text) > MAX_JSON_BYTES) text = JSON.stringify(value);
  if (Buffer.byteLength(text) > MAX_JSON_BYTES && Array.isArray(value.cases)) {
    // Keep every completed case and its total failure count even if exceptional
    // error volume requires fewer message/phase details in retained diagnostics.
    const compactCase = row => row && { ...row,
      ...(Array.isArray(row.failures) ? { failures: row.failures.slice(0, 2) } : {}),
      ...(Array.isArray(row.diagnosticErrors) ? { diagnosticErrors: row.diagnosticErrors.slice(0, 2) } : {}),
      ...(Array.isArray(row.phaseHistory) ? { phaseHistory: row.phaseHistory.slice(-8) } : {}),
    };
    text = JSON.stringify({ ...value, diagnosticsTruncated: true, cases: value.cases.map(compactCase),
      ...(value.current ? { current: { ...value.current, case: compactCase(value.current.case) } } : {}) });
  }
  if (Buffer.byteLength(text) > MAX_JSON_BYTES) throw new Error('monitor diagnostic JSON limit exceeded');
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, text, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

function createAttempt(output, script, now = Date.now()) {
  const root = path.join(path.dirname(output), 'attempts');
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const owned = /^\d{4}-\d{2}-\d{2}T[\d-]+Z-(?:synthetic-rudderstack-check|utm-handoff-check|check)-[A-Za-z0-9]+$/;
  const entries = fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory() && owned.test(e.name))
    .map(e => ({ name: e.name, time: fs.statSync(path.join(root, e.name)).mtimeMs }))
    .sort((a, b) => b.time - a.time || b.name.localeCompare(a.name));
  entries.forEach((e, i) => {
    if (i >= MAX_ATTEMPTS - 1 || now - e.time > MAX_AGE_MS) fs.rmSync(path.join(root, e.name), { recursive: true });
  });
  const stem = path.basename(script, '.js').replace(/[^a-zA-Z0-9-]/g, '');
  const directory = fs.mkdtempSync(path.join(root, new Date(now).toISOString().replace(/[:.]/g, '-') + '-' + stem + '-'));
  fs.chmodSync(directory, 0o700);
  const manifest = { script, startedAt: new Date(now).toISOString(), timeoutMs: 600000 };
  writeJson(path.join(directory, 'attempt.json'), manifest);
  return { directory, manifest, progress: path.join(directory, 'progress.json') };
}

function finishAttempt(attempt, result, report, outcome) {
  for (const stream of ['stdout', 'stderr']) {
    const text = redact(result[stream] || '');
    const bytes = Buffer.from(text);
    fs.writeFileSync(path.join(attempt.directory, stream + '.log'), bytes.subarray(0, MAX_LOG_BYTES), { mode: 0o600 });
  }
  if (report) writeJson(path.join(attempt.directory, 'report.json'), reportSummary(report));
  writeJson(path.join(attempt.directory, 'attempt.json'), {
    ...attempt.manifest, finishedAt: new Date().toISOString(),
    status: result.status, signal: result.signal || null, errorCode: result.error?.code || null,
    outcome, logsTruncated: ['stdout', 'stderr'].some(k => Buffer.byteLength(redact(result[k] || '')) > MAX_LOG_BYTES),
  });
}

function progressRecorder(file, rows, executionFailures) {
  const recentOperations = [];
  return (operation, row, complete = false) => {
    const updatedAt = new Date().toISOString();
    const summary = caseSummary(row);
    const current = operation ? { operation, case: summary } : null;
    if (operation) recentOperations.push({ startedAt: updatedAt, operation,
      ...(summary ? { route: summary.route, device: summary.device, consent: summary.consent } : {}) });
    if (recentOperations.length > 32) recentOperations.shift();
    if (file) writeJson(file, {
      updatedAt, complete, current, recentOperations,
      cases: rows.slice(0, 50).map(caseSummary), executionFailures: failures(executionFailures),
    });
    return current;
  };
}

module.exports = { MAX_ATTEMPTS, MAX_AGE_MS, MAX_LOG_BYTES, MAX_JSON_BYTES, redact, errorText, caseSummary, reportSummary, writeJson, createAttempt, finishAttempt, progressRecorder, readinessSummary, selectedCtaSummary, destinationSummary };
