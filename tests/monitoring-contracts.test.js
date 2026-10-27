'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { eventsFromRequest, pageFailures, incidentDecision, staleFailures } = require('../monitoring/contracts');
const healthy = () => ({status:200,sdkRequested:true,sdkActive:true,sdkRequestedMs:200,idle:[{type:'page'},{type:'track',event:'Viewed Page'}],errors:[],failedAssets:[],clicks:[]});
test('only exact POST event endpoints and valid batch bodies count',()=>{
 for(const suffix of ['/v1/page','/v1/track','/v1/batch']) assert.equal(eventsFromRequest('POST','https://dataplane-proxy.nourish.com'+suffix,'{"batch":[{"type":"page"}]}').length,1);
 assert.deepEqual(eventsFromRequest('GET','https://dataplane-proxy.nourish.com/v1/page','{"type":"page"}'),[]);
 assert.deepEqual(eventsFromRequest('POST','https://dataplane-proxy.evil.com/v1/page','{}'),[]);
 assert.deepEqual(eventsFromRequest('POST','https://dataplane-proxy.nourish.com/v1/page','invalid'),[]);
});
test('presence alone cannot pass: detects missing, duplicate and deferred page calls',()=>{
 assert.deepEqual(pageFailures(healthy()),[]);
 const absent=healthy();absent.idle=[];assert.equal(pageFailures(absent).length,2);
 const duplicate=healthy();duplicate.idle.push({type:'page'});assert.match(pageFailures(duplicate).join(),/exactly one page/);
 const delayed=healthy();delayed.sdkRequestedMs=10000;assert.match(pageFailures(delayed).join(),/eagerly/);
});
test('asset/page/navigation/CTA schema failures are actionable',()=>{
 const row=healthy(); row.status=500;row.errors=['null access'];row.failedAssets=['global.js'];
 row.clicks=[{id:'dietitian-apply-hero',expected:'Dietitian Apply Clicked',events:[],samePage:true}];
 assert.equal(pageFailures(row).length,5);
});
test('incident fingerprint deduplicates identical failures and sends one recovery',()=>{
 const a=incidentDecision(null,['b','a']);assert.equal(a.kind,'failure');
 const b=incidentDecision(a,['a','b']);assert.equal(b.kind,'unchanged');
 assert.equal(incidentDecision(a,['c']).kind,'failure');
 assert.equal(incidentDecision(a,[]).kind,'recovery');
 assert.equal(incidentDecision({signature:null},[]).kind,'healthy');
});
test('stale checker cannot look healthy from an old success or a manual run',()=>{
 const now=Date.parse('2026-10-21T12:00:00Z');
 const run={event:'schedule',status:'completed',conclusion:'success',created_at:'2026-10-21T11:30:00Z'};
 assert.deepEqual(staleFailures([run],now),[]);
 assert.match(staleFailures([{...run,created_at:'2026-10-20T11:30:00Z'}],now).join(),/heartbeat/);
 assert.match(staleFailures([{...run,event:'workflow_dispatch'}],now).join(),/no completed/);
 assert.match(staleFailures([{...run,conclusion:'failure'}],now).join(),/failure/);
});

test('consent probes must expose the requested OneTrust groups',()=>{
 const row=healthy();row.consent='rejected';assert.match(pageFailures(row).join(),/consent profile/);
 row.consentGroups=',C0001,';assert.deepEqual(pageFailures(row),[]);
 row.consent='accepted';assert.match(pageFailures(row).join(),/consent profile/);
 row.consentGroups=',C0001,C0002,C0003,C0004,';assert.deepEqual(pageFailures(row),[]);
});

test('CTA release contract: directory destinations expect Dietitian Directory Clicked, signup root expects Get Started Clicked', () => {
  const { expectedCtaEvent } = require('../monitoring/contracts');
  assert.equal(expectedCtaEvent('/', 'https://signup.nourish.com/?utm_source=x'), 'Get Started Clicked');
  assert.equal(expectedCtaEvent('/', 'https://signup.nourish.com/providers?_configname=x'), 'Dietitian Directory Clicked');
  assert.equal(expectedCtaEvent('/', '/find-a-provider'), 'Dietitian Directory Clicked');
  assert.equal(expectedCtaEvent('/become-a-dietitian', '/dietitian-application'), 'Dietitian Apply Clicked');
});

test('Dietitian Apply events may carry a valid cta_version but not a malformed one', () => {
  const base = { route: '/become-a-dietitian', status: 200, sdkRequested: true, sdkActive: true, idle: [{ type: 'page' }, { type: 'track', event: 'Viewed Page' }], errors: [], failedAssets: [], consent: 'unset' };
  const click = v => ({ id: 'dietitian-apply-hero', expected: 'Dietitian Apply Clicked', samePage: true, preventedBySite: false,
    events: [{ event: 'Dietitian Apply Clicked', properties: { cta_id: 'dietitian-apply-hero', cta_name: 'Apply now', cta_location: 'hero', destination_path: '/dietitian-application', ...(v === undefined ? {} : { cta_version: v }) } }] });
  for (const v of [undefined, '1', '2.0']) assert.deepEqual(pageFailures({ ...base, clicks: [click(v)] }).filter(f => f.includes('CTA')), []);
  assert.ok(pageFailures({ ...base, clicks: [click('bad version!')] }).some(f => f.includes('CTA version')));
});

test('local tracking monitor alerts on tracking failures, reports page and asset errors only', () => {
  const { isAlertable } = require('../monitoring/local-tracking-monitor');
  assert.equal(isAlertable('UTM handoff desktop /: Get Started Clicked event missing utm_source'), true);
  assert.equal(isAlertable('desktop / [unset]: CTA event count/name: patient-signup-nav'), true);
  assert.equal(isAlertable('desktop / [unset]: expected exactly one Viewed Page emission'), true);
  assert.equal(isAlertable('desktop /paid [unset]: page error: TypeError: x'), false);
  assert.equal(isAlertable('desktop / [unset]: asset failure: https://connect.facebook.net//log/error net::ERR_BLOCKED_BY_ORB'), false);
});
