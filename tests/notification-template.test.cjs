'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {renderNotification}=require('../monitoring/notification-template.cjs');
const {trackingNotification}=require('../monitoring/tracking-notification');
const start='2026-10-29T17:00:00Z', finish='2026-10-29T17:04:00Z';
function message(extra={}) { return {schemaVersion:1,client:'Fixture client',check:'Tracking',status:{code:'no_change',sourceStatus:'completed',sourceOutcome:'no-change'},
 summary:'No new findings in measured checks.',affectedChecks:[],coverage:{summary:'2/2 cases',limits:'Fixture coverage only',unknowns:[]},
 currentRun:{id:'fixture-run',finishedAt:finish},lastSuccessfulRun:null,evidence:{url:'https://example.invalid/report',published:true,description:'Fixture report'},nextAction:'Review evidence.',...extra}; }
test('portable renderer: headline, plain summary, bullets and next step for both clients',()=>{
 for(const client of ['Nourish','Unify']) {
  const text=renderNotification(message({client}));
  const lines=text.split('\n');
  assert.equal(lines[0],'✅ *'+client+' · Tracking: No change detected*');
  assert.equal(lines[1],'No new findings in measured checks.');
  for(const label of ['• *Checked:*','• *Run:*','• *Details:*','*Next step:*']) assert.ok(lines.some(l=>l.startsWith(label)),label);
  assert.match(text,/• \*Run:\* Oct 29, 10:04 AM PT$/m,'Pacific time, no ISO stamp, no last-good line when healthy and unknown');
  assert.doesNotMatch(text,/T17:04|success means completed execution/);
 }
});
test('failure, checker error, review and recovery remain distinct',()=>{
 for(const [code,label] of [['site_failure','Site failure'],['checker_error','Checker error'],['review_needed','Review needed'],['recovered','Recovered']]) {
  assert.match(renderNotification(message({status:{code}})),new RegExp(label));
 }
});
test('missing links and run data remain explicit unknowns',()=>{
 const text=renderNotification(message({status:{code:'unknown'},coverage:{summary:'?/? measured',limits:'Unknown coverage',unknowns:['Measurements absent']},evidence:{url:null,published:false,description:'Local evidence not available'},currentRun:null}));
 assert.match(text,/\?\/\? measured/);assert.match(text,/Run:\* unknown · last good run: unknown/);assert.match(text,/Not confirmed:\* Measurements absent/);assert.match(text,/Affected:\* unknown/);
 assert.match(text,/Local evidence not available/);assert.doesNotMatch(text,/0\/0|https?:/);
});
test('unconfirmed publication never displays a stale report URL',()=>{
 const text=renderNotification(message({evidence:{url:'https://example.invalid/old',published:false,description:'Hosted report not updated; see local evidence'}}));
 assert.doesNotMatch(text,/https:\/\/example.invalid\/old/);assert.match(text,/Hosted report not updated/);
});
test('links drop queries and credentials; details and Slack mentions are sanitized',()=>{
 const text=renderNotification(message({affectedChecks:[{check:'Unsafe <@U123>',status:'checker_error',summary:'token=fixture-secret person@example.invalid https://example.invalid/page?email=private@example.invalid /Users/example/private.log',caseIds:[]}],
 evidence:{url:'https://fixture:password@example.invalid/report?token=secret#private',published:true}}));
 assert.doesNotMatch(text,/fixture-secret|person@|private@|password@|token=secret|\/Users\/|<@U123>/);
 assert.match(text,/&lt;@U123&gt;/);assert.match(text,/https:\/\/example.invalid\/report/);
});
test('bounded findings and case examples retain evidence and next action',()=>{
 const text=renderNotification(message({affectedChecks:Array.from({length:50},()=>({check:'Check',status:'review_needed',summary:'x'.repeat(2000),caseIds:['a','b','c','d','e']}))}));
 assert.ok(text.length<5000);assert.match(text,/42 more; see details/);assert.match(text,/\+1 more/);assert.match(text,/Details:/);assert.match(text,/Next step:/);
});
const passed={complete:true,failures:[],cases:[{route:'/paid',device:'desktop',failures:[]}]};
test('hourly timeout is a checker error with unknown completion, not a site outage',()=>{
 const m=trackingNotification({decision:'failure',alertable:['Monitor execution failure: timed out'],utm:passed,
 site:{failureKind:'monitor-execution',failures:['Monitor execution failure: timed out']},startedAt:start,finishedAt:finish});
 assert.equal(m.status.code,'checker_error');assert.equal(m.status.sourceStatus,'failure');
 assert.match(m.coverage.summary,/Browser emission: \? returned cases; incomplete/);
 assert.match(renderNotification(m),/production tracking status is unconfirmed/);
});
test('hourly actionability error and completed click without emission remain distinct',()=>{
 for(const [kind,code] of [['browser-click','checker_error'],['event-observation','site_failure']]) {
  const report={complete:true,failures:['click finding'],cases:[{failureKinds:[kind],failures:['click finding']}]};
  assert.equal(trackingNotification({decision:'failure',alertable:report.failures,utm:report,site:passed,startedAt:start,finishedAt:finish}).status.code,code);
 }
});
test('legacy browser navigation timeout is displayed as a checker error',()=>{
 const site={complete:true,failures:['SDK did not initialize eagerly'],cases:[{errors:['page.goto: Timeout 35000ms exceeded.']}]};
 assert.equal(trackingNotification({decision:'failure',alertable:site.failures,utm:passed,site,startedAt:start,finishedAt:finish}).status.code,'checker_error');
});
test('hourly recovery needs completed measurements and retains the existing source decision',()=>{
 const args={decision:'recovery',utm:passed,site:passed,startedAt:start,finishedAt:finish,evidence:'/Users/example/repo/monitoring-local'};
 const m=trackingNotification(args);
 assert.equal(m.status.code,'recovered');assert.equal(m.lastSuccessfulRun,null);
 assert.match(renderNotification(m),/Previously alerted failures cleared/);assert.doesNotMatch(renderNotification(m),/\/Users\//);
 for(const report of [{cases:[]},{complete:false,cases:[]},{}]) {
  const partial=trackingNotification({...args,site:report});
  assert.notEqual(partial.status.code,'recovered');assert.equal(partial.status.sourceStatus,'recovery');
  assert.doesNotMatch(renderNotification(partial),/All clear|: Recovered\*/);
 }
});
test('daily adapter preserves source decisions while exposing incomplete coverage',async()=>{
 const {dailyNotification,slackText,overall,neededAttention}=await import('../monitoring/daily-report/summary.mjs');
 const base={startedAt:start,finishedAt:finish,outcome:'no-change',counts:{captured:2,expected:2,formChecks:1,formFailures:0,candidateChanges:0},
  tracking:{monitor:{status:'ok',issues:[],runsLast24h:1,failingRunsLast24h:0,lastCheckedAt:finish},events:{status:'ok',events:[],issues:[]}},areas:[]};
 const noIssues={now:[]};
 assert.equal(overall(base,noIssues).headline,'All clear'); // Existing decision helper unchanged.
 assert.equal(dailyNotification(base,noIssues).status.code,'no_change');
 assert.equal(dailyNotification(base,noIssues).status.sourceOutcome,'no-change');
 assert.equal(dailyNotification(base,noIssues).status.sourceStatus,null);
 const failed={...base,outcome:'execution-error',errors:['capture failed'],counts:{...base.counts,captured:1}};
 assert.equal(dailyNotification(failed,noIssues).status.code,'checker_error');
 assert.match(slackText(failed,noIssues),/1\/2 pages captured \(desktop \+ mobile\)/);
 assert.match(slackText(failed,noIssues),/Hosted report not updated/);
 const issue={now:[{level:'issue',title:'Home',detail:'Broken link',key:'home--desktop'}]};
 assert.equal(dailyNotification(base,issue).status.code,'site_failure');
 assert.ok(dailyNotification(base,issue).affectedChecks.some(a=>a.caseIds.includes('home--desktop')));
 const changes={now:[{level:'changed',title:'Home',detail:'Candidate screenshot changed'}]};
 assert.equal(dailyNotification(base,changes).status.code,'review_needed');
 assert.equal(dailyNotification({...base,outcome:'first-run-review-required'},noIssues).status.code,'review_needed');
 assert.doesNotMatch(slackText({...base,outcome:'first-run-review-required'},noIssues),/No change detected|All clear/);
 const missing={...base,finishedAt:null,counts:{},tracking:{}};
 assert.equal(dailyNotification(missing,noIssues).status.code,'unknown');
 assert.doesNotMatch(slackText(missing,noIssues),/All clear|0\/0|No change detected/);
 assert.equal(dailyNotification(base,noIssues).lastSuccessfulRun,null);
 // A supporting area that is not green posts as its own red line; the headline stays the page check.
 const fetchError={...base,areas:[{id:'ga4',label:'GA4',status:'issue',text:'HTTP 401'}]};
 assert.equal(dailyNotification(fetchError,noIssues).status.code,'no_change');
 assert.ok(neededAttention(dailyNotification(fetchError,noIssues)));assert.match(slackText(fetchError,noIssues),/🔴 \*GA4:\* HTTP 401/);
 const publishFailed=slackText(base,noIssues,{link:'https://example.invalid/old',published:false,publishError:'HTTP 500 /Users/example/run'});
 assert.match(publishFailed,/→ Some evidence is missing/);assert.match(publishFailed,/⚠️ report not published: HTTP 500 \[local path\]/);
 assert.doesNotMatch(publishFailed,/https:\/\/example.invalid\/old|\/Users\//);
});
