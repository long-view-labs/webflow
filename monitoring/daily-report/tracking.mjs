// Tracking stability for the daily report:
//  1. the hourly local tracking monitor's latest results (read-only, never re-run here);
//  2. yesterday's Amplitude event volumes vs the same weekday last week and the
//     trailing 7-day average (project 373727, Dashboard REST API).
// The Amplitude key lives in the login Keychain (service nourish-amplitude-api:
// account = API key, password = secret key). It is never read from or written to the repo.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export const AMPLITUDE_PROJECT = 373727;
export const KEYCHAIN_SERVICE = 'nourish-amplitude-api';
const OTHER_FILTER = {subprop_type: 'event', subprop_key: 'cta_name', subprop_op: 'contains', subprop_value: ['| Other']};
export const EVENTS = [
  {id: 'viewed-page', label: 'Viewed Page', event: {event_type: 'Viewed Page'}},
  {id: 'viewed-page-2sp', label: 'Viewed  Page (two spaces)', event: {event_type: 'Viewed  Page'}},
  {id: 'get-started', label: 'Get Started Clicked', event: {event_type: 'Get Started Clicked'}},
  {id: 'flow-loaded', label: 'FlowLoaded', event: {event_type: 'FlowLoaded'}},
  {id: 'signup-completed', label: 'MarketingSignUpCompleted', event: {event_type: 'MarketingSignUpCompleted'}},
  // Every signup link is mapped, so a CTA named "... | Other" means a new unmapped link.
  {id: 'other-cta', label: 'Get Started Clicked, cta_name "| Other"', event: {event_type: 'Get Started Clicked', filters: [OTHER_FILTER]}, expectZero: true},
];
// Below this baseline a day-to-day swing is noise, not a drop.
const MIN_BASELINE = 20;
const MONITOR_STALE_HOURS = 2.5;

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

// ---------------------------------------------------------- hourly monitor ---

export function summarizeMonitor(dir, now = new Date()) {
  const state = readJson(path.join(dir, 'state.json'));
  const utm = readJson(path.join(dir, 'utm-latest.json'));
  const site = readJson(path.join(dir, 'site-latest.json'));
  let history = [];
  try {
    history = fs.readFileSync(path.join(dir, 'history.jsonl'), 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {}
  const dayAgo = now.getTime() - 24 * 3600e3;
  const recent = history.filter((h) => Date.parse(h.checkedAt) >= dayAgo);
  const lastAt = state?.checkedAt ?? history.at(-1)?.checkedAt ?? null;
  const ageHours = lastAt ? (now.getTime() - Date.parse(lastAt)) / 3600e3 : null;
  const issues = [];
  if (!state) issues.push('Hourly tracking monitor has no results (monitoring-local/state.json missing)');
  else if (ageHours > MONITOR_STALE_HOURS) issues.push(`Hourly tracking monitor last ran ${ageHours.toFixed(1)}h ago (expected hourly)`);
  for (const f of state?.alertable ?? []) issues.push('Tracking monitor failure: ' + f);
  return {
    status: issues.length ? 'issue' : 'ok',
    issues,
    lastCheckedAt: lastAt,
    decision: state?.decision ?? null,
    runsLast24h: recent.length,
    failingRunsLast24h: recent.filter((h) => h.alertable > 0).length,
    utm: utm && {checkedAt: utm.checkedAt, failures: utm.failures?.length ?? null, cases: utm.cases?.length ?? null},
    site: site && {checkedAt: site.checkedAt, failures: site.failures?.length ?? null, cases: site.cases?.length ?? null},
    // Page script errors etc.: reported by the monitor, never alerted.
    reportOnly: state?.reportOnly ?? [],
  };
}

// --------------------------------------------------------------- amplitude ---

const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
// Calendar days in Pacific time; Amplitude buckets by the project's timezone.
export function pacificDate(now = new Date()) {
  return new Date(now.toLocaleString('en-CA', {timeZone: 'America/Los_Angeles'}).slice(0, 10) + 'T00:00:00Z');
}
export function windowFor(now = new Date()) {
  const today = pacificDate(now);
  const day = (n) => new Date(today.getTime() - n * 864e5);
  return {yesterday: ymd(day(1)), start: ymd(day(15)), end: ymd(day(1))};
}

// series: daily counts oldest -> newest ending with yesterday (at least 8: yesterday and the 7 days before).
export function compareVolumes(series, {expectZero = false} = {}) {
  const values = series.map(Number);
  const yesterday = values.at(-1);
  const lastWeek = values.length >= 8 ? values.at(-8) : null;
  const prior7 = values.slice(-8, -1);
  const avg7 = prior7.length === 7 ? prior7.reduce((a, b) => a + b, 0) / 7 : null;
  const pct = (base) => (base ? (yesterday - base) * 100 / base : null);
  const out = {yesterday, lastWeek, avg7, vsLastWeek: pct(lastWeek), vsAvg7: pct(avg7), status: 'ok', reason: null};
  if (expectZero) {
    if (yesterday > 0) Object.assign(out, {status: 'issue', reason: `${yesterday} click(s) with an unmapped "| Other" CTA name`});
    return out;
  }
  const base = Math.max(lastWeek ?? 0, avg7 ?? 0);
  if (base < MIN_BASELINE) return out;
  if (yesterday === 0) return Object.assign(out, {status: 'issue', reason: 'No events yesterday'});
  // Both comparisons must agree, so one unusual reference day can't flag on its own.
  const drop = Math.max(out.vsLastWeek ?? -Infinity, out.vsAvg7 ?? -Infinity);
  const rise = Math.min(out.vsLastWeek ?? Infinity, out.vsAvg7 ?? Infinity);
  if (drop <= -50) Object.assign(out, {status: 'issue', reason: `Down ${Math.round(-drop)}%+ vs both last week and the 7-day average`});
  else if (drop <= -30) Object.assign(out, {status: 'changed', reason: `Down ${Math.round(-drop)}%+ vs both last week and the 7-day average`});
  else if (rise >= 100) Object.assign(out, {status: 'changed', reason: `Up ${Math.round(rise)}%+ vs both last week and the 7-day average`});
  return out;
}

export function amplitudeCredentials(read = execFileSync) {
  try {
    const meta = read('/usr/bin/security', ['find-generic-password', '-s', KEYCHAIN_SERVICE], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
    const apiKey = meta.match(/"acct"<blob>="([^"]+)"/)?.[1];
    const secret = read('/usr/bin/security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    return apiKey && secret ? {apiKey, secret} : null;
  } catch { return null; }
}

async function segmentation(event, {start, end}, creds, fetcher) {
  const qs = new URLSearchParams({e: JSON.stringify(event), m: 'totals', i: '1', start, end});
  const res = await fetcher('https://amplitude.com/api/2/events/segmentation?' + qs, {
    headers: {Authorization: 'Basic ' + Buffer.from(creds.apiKey + ':' + creds.secret).toString('base64')},
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Amplitude HTTP ${res.status}`); // body may echo the request; never logged
  const body = await res.json();
  const series = body?.data?.series?.[0], days = body?.data?.xValues;
  if (!Array.isArray(series) || !Array.isArray(days)) throw new Error('Amplitude returned no series');
  return {days, series};
}

export async function eventVolumes({now = new Date(), creds = amplitudeCredentials(), fetcher = fetch} = {}) {
  const window = windowFor(now);
  if (!creds) return {status: 'not-configured', window, events: [], issues: [], note: `No Amplitude key in Keychain item "${KEYCHAIN_SERVICE}"; event volumes skipped.`};
  const events = [];
  for (const e of EVENTS) {
    try {
      const {days, series} = await segmentation(e.event, window, creds, fetcher);
      if (series.length !== 15) throw new Error(`expected 15 days, got ${series.length}`);
      events.push({id: e.id, label: e.label, lastDay: days.at(-1), days: days.map((d) => String(d).slice(0, 10)), series: series.map(Number), ...compareVolumes(series, e)});
    } catch (err) {
      events.push({id: e.id, label: e.label, status: 'error', reason: err.message});
    }
  }
  const issues = events.filter((e) => e.status === 'issue' || e.status === 'error').map((e) => `${e.label}: ${e.reason}`);
  const changes = events.filter((e) => e.status === 'changed').map((e) => `${e.label}: ${e.reason}`);
  return {status: issues.length ? 'issue' : changes.length ? 'changed' : 'ok', window, events, issues, changes};
}
