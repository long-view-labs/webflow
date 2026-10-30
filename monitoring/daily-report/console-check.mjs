// Console and network check for one page state: a fresh load with the same protection as the nav
// and form checks (protectPage: reads only, analytics collectors aborted, beacons dropped; nav-check's
// extraBlock: RudderStack dataplane proxy, Amplitude, /dietitian-application), then a short idle.
// Collects console.error lines, responses of 400+ and failed requests from any host, and the
// business-unit id of every Trustpilot widget on the page.
// Uncaught page errors are left to the checker's health check, which already reports them.
// Added Oct 29 2026: ~80 pages had blank Trustpilot widgets (a retired business-unit id; the
// trustbox-data API answered 400) and nothing in the report showed it.
import {extraBlock} from './nav-check.mjs';

export const TRUSTPILOT_BUSINESS_UNIT = '69cd80f7c278f2faf5031ff2';
export const IDLE_MS = 3000;

// Known-noisy requests that are not a broken page: ad pixels and beacons that answer 4xx to a
// headless browser, and requests this check itself aborts. Each entry says why.
export const NOISE = [
  {test: (r) => /^net::ERR_(?:BLOCKED_BY_CLIENT|NAME_NOT_RESOLVED)\b/.test(r.error ?? ''), why: 'aborted or made unresolvable by the check (analytics, writes)'},
  {test: (r) => r.error === 'net::ERR_ABORTED', why: 'cancelled by the browser (navigation, media range, preload not used)'},
];
// Console errors that only happen because the check blocked a write, matched by text and the
// script that logged them (found Oct 29 2026). Errors naming a blocked URL (RudderStack's
// "Failed to deliver event(s) to …", Statsig's "networking error … to …") are dropped without a
// list entry; the hourly tracking monitor watches RudderStack itself.
export const CONSOLE_NOISE = [
  {text: /^Failed to update counter/, script: /videsigns\/webflow-tools/, why: 'multi-step.js POSTs a usage counter to videsigns; the check blocks writes'},
];
// Widget APIs whose failure blanks something visible; always an issue, never noise.
export const WIDGET_APIS = [/^https:\/\/widget\.trustpilot\.com\//];

const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ''; } };
const noQuery = (url) => String(url).replace(/[?#].*$/, '');

// Pure: raw observations in, {issues, ignored} out. Each issue: {kind, detail, url?, status?}.
// consoleErrors: [{text, source}] (source = the logging script's URL) or plain strings.
export function classifyConsole({consoleErrors = [], responses = [], failures = [], widgets = []}, {noise = NOISE, consoleNoise = CONSOLE_NOISE, businessUnit = TRUSTPILOT_BUSINESS_UNIT} = {}) {
  const issues = [], ignored = [];
  const network = [...responses.map((r) => ({...r, kind: 'http'})), ...failures.map((r) => ({...r, kind: 'net'}))];
  const blocked = new Set();
  for (const r of network) {
    const widget = WIDGET_APIS.some((re) => re.test(r.url));
    const quiet = !widget && noise.find((n) => n.test(r));
    if (quiet) { ignored.push({url: noQuery(r.url), why: quiet.why}); if (r.kind === 'net') blocked.add(noQuery(r.url)); continue; }
    issues.push({kind: r.kind, url: noQuery(r.url), status: r.status ?? null,
      detail: `${r.kind === 'http' ? `HTTP ${r.status}` : r.error} from ${hostOf(r.url)}${widget ? ' (widget API: the widget shows blank)' : ''}`});
  }
  for (const e of consoleErrors) {
    const {text, source = ''} = typeof e === 'string' ? {text: e} : e;
    // "Failed to load resource" lines repeat the network rows above, so they are not counted twice.
    if (/^Failed to load resource\b/.test(text)) continue;
    const named = String(text).match(/https?:\/\/[^\s'"`)]+/g)?.map((u) => noQuery(u.replace(/[.,;:]+$/, ''))) ?? [];
    const quiet = named.some((u) => blocked.has(u)) ? {why: 'reports a request the check blocked'}
      : consoleNoise.find((n) => n.text.test(text) && (!n.script || n.script.test(source)));
    if (quiet) { ignored.push({console: String(text).slice(0, 120), why: quiet.why}); continue; }
    issues.push({kind: 'console', detail: `console.error: ${String(text).replace(/%c/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)}`});
  }
  for (const w of widgets) {
    if (w.businessUnit !== businessUnit) issues.push({kind: 'trustpilot-id', detail: `Trustpilot widget uses business unit ${w.businessUnit || '(none)'}, not ${businessUnit}${w.template ? ` (template ${w.template})` : ''}`});
  }
  return {issues, ignored};
}

// prepare(page): test hook, runs after the protection routes (so its routes win); the fire drill
// uses it to serve a local page under a www.nourish.com address.
export async function checkConsole(browser, {url, viewport}, {protectPage, idleMs = IDLE_MS, prepare = null}) {
  const context = await browser.newContext({serviceWorkers: 'block', viewport: {width: viewport.width, height: viewport.height}});
  const page = await context.newPage();
  const raw = {consoleErrors: [], responses: [], failures: [], widgets: []};
  page.on('console', (m) => { if (m.type() === 'error') raw.consoleErrors.push({text: m.text(), source: m.location()?.url ?? ''}); });
  page.on('response', (r) => { if (r.status() >= 400) raw.responses.push({url: r.url(), status: r.status(), type: r.request().resourceType()}); });
  page.on('requestfailed', (r) => raw.failures.push({url: r.url(), error: r.failure()?.errorText ?? 'failed', type: r.resourceType(), method: r.method()}));
  try {
    await protectPage(page);
    await page.route('**/*', (route) => (extraBlock(route.request().url()) ? route.abort('blockedbyclient') : route.fallback()));
    if (prepare) await prepare(page);
    await page.goto(url, {waitUntil: 'load', timeout: 30000});
    // Let late widgets (Trustpilot, sliders) make their calls; scrolling would trigger lazy media
    // loads and interactions this check is not about.
    await page.waitForTimeout(idleMs);
    raw.widgets = await page.$$eval('.trustpilot-widget', (els) => els.map((e) => ({businessUnit: e.getAttribute('data-businessunit-id') ?? '', template: e.getAttribute('data-template-id') ?? ''})));
    const {issues, ignored} = classifyConsole(raw);
    return {status: issues.length ? 'fail' : 'pass', issues, ignoredCount: ignored.length, widgets: raw.widgets.length};
  } catch (e) {
    return {status: 'error', issues: [], error: String(e.message).split('\n')[0].slice(0, 200), widgets: raw.widgets.length};
  } finally { await context.close(); }
}
