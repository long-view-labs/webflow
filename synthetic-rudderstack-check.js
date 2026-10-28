'use strict';
// Read-only synthetic checks. All non-GET requests and analytics beacons are
// intercepted BEFORE navigation. This verifies emission, not server acceptance
// or downstream ingestion. Never add an opt-out that sends real test traffic.
const fs=require('node:fs');const path=require('node:path');
const {chromium,devices}=require('playwright');
const {ROUTES,CTA_IDS,eventsFromRequest,pageFailures,expectedCtaEvent}=require('./monitoring/contracts');
const BASE=process.env.MONITOR_BASE_URL || 'https://www.nourish.com';
if(!['https://www.nourish.com','https://nourish-2-23.webflow.io'].includes(BASE)) throw new Error('Unapproved monitor origin');
const OUTPUT=process.env.MONITOR_OUTPUT || 'monitoring-results.json';
const routes=process.env.MONITOR_QUICK==='1'?['/','/become-a-dietitian']:ROUTES;
async function runCase(browser,route,mobile,consent){
 const row={route,device:mobile?'iPhone 13':'desktop',consent,status:null,sdkRequested:false,sdkRequestedMs:null,sdkActive:false,idle:[],errors:[],consoleErrors:[],failedAssets:[],clicks:[],notes:[]};
 const context=await browser.newContext({...mobile?devices['iPhone 13']:{viewport:{width:1440,height:1000}},serviceWorkers:'block'});
 const page=await context.newPage();const blocked=new Set();const telemetry=[];let started;
 if(consent!=='unset') await context.addCookies([{name:'OptanonConsent',value:'isGpcEnabled=0&datestamp='+encodeURIComponent(new Date().toUTCString())+'&version=202608.1.0&isIABGlobal=false&hosts=&consentId=00000000-0000-4000-8000-000000000000&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001:1,C0002:'+(consent==='accepted'?1:0)+',C0003:'+(consent==='accepted'?1:0)+',C0004:'+(consent==='accepted'?1:0),url:BASE,secure:true}]);
 // Observe defaultPrevented only after the site's handlers; cancel solely in the
 // test window so signup/application navigation and submissions cannot happen.
 await context.addInitScript(()=>{window.__monitorClicks=[];window.addEventListener('click',e=>{if(e.target.closest?.('a')){window.__monitorClicks.push(e.defaultPrevented);e.preventDefault()}})});
 await context.route('**/*',async r=>{
  const q=r.request(),u=new URL(q.url());
  // Local pre-deploy validation only: serve a candidate global.js to this headless browser. Never used in CI.
  if(process.env.UTM_GLOBAL_JS_OVERRIDE&&u.hostname==='cdn.jsdelivr.net'&&/\/long-view-labs\/webflow@[^/]+\/global\.js$/.test(u.pathname))return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(process.env.UTM_GLOBAL_JS_OVERRIDE,'utf8')});
  if(q.isNavigationRequest() && (q.frame()!==page.mainFrame() || (started&&q.url()!==BASE+route))){blocked.add(q.url());return r.abort();}
  const safeBingLibrary=u.hostname==='bat.bing.com'&&u.pathname==='/bat.js'&&q.method()==='GET';
  if(!safeBingLibrary&&(q.method()!=='GET'||/^dataplane-proxy\./.test(u.hostname)||/google-analytics|analytics.google|doubleclick|facebook\.com|bat.bing|linkedin.com\/px|api2.amplitude/.test(u.hostname+u.pathname)||/\/(collect|pixel)(\?|\/|$)/.test(u.pathname))){
   blocked.add(q.url());
   telemetry.push(...eventsFromRequest(q.method(),q.url(),q.postData()).map(x=>({type:x.type,event:x.event,properties:x.properties||{}})));
   return r.fulfill({status:200,contentType:'application/json',body:'{}'});
  }
  return r.fallback();
 });
 page.on('request',q=>{if(q.url().includes('/rsa.min.js')){row.sdkRequested=true;row.sdkRequestedMs=Date.now()-started}});
 page.on('pageerror',e=>row.errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(m.text().slice(0,500))});
 page.on('requestfailed',q=>{if(!blocked.has(q.url())&&['script','stylesheet','document','font','image'].includes(q.resourceType())){
  const u=new URL(q.url());
  if(u.hostname==='ddwl4m2hdecbv.cloudfront.net'&&u.pathname.endsWith('.js.gz'))row.notes.push('RB2B compressed script blocked in headless Chromium (known baseline; real-user impact unverified)');
  else row.failedAssets.push(u.origin+u.pathname+' '+q.failure()?.errorText);
 }});
 page.on('response',r=>{if(r.status()>=400&&['document','script','stylesheet','font','image'].includes(r.request().resourceType())){const u=new URL(r.url());row.failedAssets.push(u.origin+u.pathname+' HTTP '+r.status())}});
 try{
  started=Date.now();row.status=(await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:35000}))?.status();
  await page.waitForTimeout(6000); // Never interact before eager-load assertions.
  row.idle=[...telemetry];
  Object.assign(row,await page.evaluate(()=>({sdkActive:!!window.rudderanalytics&&!Array.isArray(window.rudderanalytics),overflow:document.documentElement.scrollWidth>innerWidth+1,consentGroups:window.OnetrustActiveGroups||window.OptanonActiveGroups||null})));
  // Recognized consent state is evidence, not a claim that a fabricated cookie
  // proves OneTrust policy correctness. The real SDK's current pre-consent page
  // contract is checked in all profiles; policy changes require contract review.
  if(consent!=='unset'&&!row.consentGroups)row.notes.push('OneTrust did not expose active groups: consent profile not verified');
  const selectors=route==='/become-a-dietitian'?CTA_IDS.map(id=>'a[data-cta-id="'+id+'"]'):['a[href*="signup.nourish.com"]'];
  for(const selector of selectors){
   const a=page.locator(selector).filter({visible:true}).first();
   if(!await a.count()){if(route==='/become-a-dietitian')row.errors.push('missing CTA '+selector);continue;}
   const id=await a.getAttribute('data-cta-id')||selector,href=await a.getAttribute('href');
   const before=telemetry.length;const original=page.url();
   await a.click({timeout:5000});await page.waitForTimeout(300);
   row.clicks.push({id,href,expected:expectedCtaEvent(route,href),events:telemetry.slice(before).filter(x=>x.type==='track'),samePage:page.url()===original,preventedBySite:await page.evaluate(()=>window.__monitorClicks.at(-1))});
  }
  // Capture route-level regression evidence; no form fills/submissions.
 }catch(e){row.errors.push(String(e));}finally{await context.close();}
 row.failures=pageFailures(row);return row;
}
async function main(){
 const browser=await chromium.launch();const rows=[];
 try{for(const mobile of [false,true])for(const route of routes){
  const row=await runCase(browser,route,mobile,'unset');rows.push(row);console.log(row.device+' '+route+': '+(row.failures.length?'FAIL '+row.failures.join('; '):'PASS'));
 }
 // Bounded consent probes on the shared homepage only, both browser devices.
 if(process.env.MONITOR_QUICK!=='1')for(const mobile of [false,true])for(const consent of ['rejected','accepted'])rows.push(await runCase(browser,'/',mobile,consent));
 }finally{await browser.close();}
 const failures=rows.flatMap(r=>r.failures.map(f=>r.device+' '+r.route+' ['+r.consent+']: '+f));
 const report={checkedAt:new Date().toISOString(),base:BASE,mode:'intercepted-emission-only',failures,cases:rows};
 fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});fs.writeFileSync(OUTPUT,JSON.stringify(report,null,2));
 if(failures.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{fs.writeFileSync(OUTPUT,JSON.stringify({checkedAt:new Date().toISOString(),failures:['monitor execution failed: '+e.message],cases:[]},null,2));console.error(e.message);process.exitCode=1});
module.exports={runCase};
