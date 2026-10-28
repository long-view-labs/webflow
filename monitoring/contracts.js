'use strict';
const crypto = require('node:crypto');
const ROUTES = ['/', '/paid', '/paid-google', '/become-a-dietitian', '/become-a-dietitian/pay-calculator', '/local-dietitians/akron-ohio', '/conditions/acid-reflux', '/blog/10-basic-cooking-skills-everyone-should-know', '/does-my-insurance-cover-nutrition'];
const CTA_IDS = ['hero', 'earnings', 'platform', 'footer'].map(x => 'dietitian-apply-' + x);
function eventsFromRequest(method, url, body) {
  const u = new URL(url);
  if (method !== 'POST' || !/^dataplane-proxy\.(nourish|usenourish)\.com$/.test(u.hostname) || !/^\/v1\/(page|track|batch)\/?$/.test(u.pathname)) return [];
  try { const data = JSON.parse(body); return Array.isArray(data.batch) ? data.batch : [data]; } catch { return []; }
}
function pageFailures(row) {
  const failures = [];
  if (row.status !== 200) failures.push('document HTTP ' + row.status);
  if (!row.sdkRequested || !row.sdkActive || row.sdkRequestedMs > 6000) failures.push('SDK did not initialize eagerly');
  if (row.idle.filter(x => x.type === 'page').length !== 1) failures.push('expected exactly one page emission');
  if (row.idle.filter(x => x.type === 'track' && x.event === 'Viewed Page').length !== 1) failures.push('expected exactly one Viewed Page emission');
  if (['accepted','rejected'].includes(row.consent)) {
    const groups = new Set((row.consentGroups || '').split(',').filter(Boolean));
    if (!groups.has('C0001') || (row.consent === 'rejected' && groups.size !== 1) || (row.consent === 'accepted' && !['C0002','C0003','C0004'].every(x => groups.has(x)))) failures.push('OneTrust consent profile not verified');
  }
  if (row.overflow) failures.push('horizontal overflow');
  for (const error of row.errors || []) failures.push('page error: ' + error);
  for (const asset of row.failedAssets || []) failures.push('asset failure: ' + asset);
  for (const click of row.clicks || []) {
    if (click.expected === null ? click.events.length !== 0 : (click.events.length !== 1 || click.events[0].event !== click.expected)) failures.push('CTA event count/name: ' + click.id);
    if (click.preventedBySite || !click.samePage) failures.push('CTA navigation contract: ' + click.id);
    if (click.expected === 'Dietitian Apply Clicked') {
      const p = click.events[0]?.properties || {};
      if (p.cta_id !== click.id || !p.cta_name || !p.cta_section || p.destination_path !== '/dietitian-application') failures.push('CTA properties: ' + click.id);
      if ('cta_version' in p && !/^[A-Za-z0-9._-]{1,64}$/.test(String(p.cta_version))) failures.push('malformed CTA version: ' + click.id);
    }
  }
  return failures;
}
// CTA contract (v2.623.3+): every signup link, any path except privacy/settings, fires
// Get Started Clicked (as before 2.622.0); internal /find-a-provider links
// fire nothing (null); Become a Dietitian -> Apply.
function expectedCtaEvent(route, href) {
  if (route === '/become-a-dietitian') return 'Dietitian Apply Clicked';
  let u; try { u = new URL(href, 'https://www.nourish.com'); } catch { return 'Get Started Clicked'; }
  const path = u.pathname.replace(/\/$/, '') || '/';
  if (!/^signup\.(use)?nourish\.com$/.test(u.hostname) && path === '/find-a-provider') return null;
  return 'Get Started Clicked';
}
function incidentDecision(previous, failures) {
  const signature = failures.length ? crypto.createHash('sha256').update(JSON.stringify([...failures].sort())).digest('hex') : null;
  return { signature, kind: signature ? (signature === previous?.signature ? 'unchanged' : 'failure') : (previous?.signature ? 'recovery' : 'healthy') };
}
function staleFailures(runs, now = Date.now(), maximumAgeMs = 95 * 60 * 1000) {
  const latest = runs.filter(x => x.event === 'schedule' && x.status === 'completed').sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  if (!latest) return ['no completed scheduled monitor run'];
  const age = now - Date.parse(latest.created_at);
  if (!Number.isFinite(age) || age > maximumAgeMs) return ['scheduled monitor heartbeat older than 95 minutes'];
  return latest.conclusion === 'success' ? [] : ['latest scheduled monitor run is ' + latest.conclusion];
}
module.exports = { ROUTES, CTA_IDS, eventsFromRequest, pageFailures, incidentDecision, staleFailures, expectedCtaEvent };
