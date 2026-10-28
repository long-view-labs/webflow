'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');
const {runCase}=require('../synthetic-rudderstack-check');
const {CTA_IDS}=require('../monitoring/contracts');
test('real browser harness intercepts emissions before navigation and validates four clicks',async()=>{
 const browser=await chromium.launch();
 try{
  const fallbackMethods=[];
  const fixtureBrowser={newContext:async options=>{
   const context=await browser.newContext(options);
   await context.route('**/*',r=>{
    const req=r.request();fallbackMethods.push(req.method());const u=new URL(req.url());
    if(u.pathname==='/rsa.min.js')return r.fulfill({contentType:'application/javascript',body:`window.rudderanalytics={page(){fetch('https://dataplane-proxy.nourish.com/v1/page',{method:'POST',body:JSON.stringify({type:'page'})})},track(event,properties){fetch('https://dataplane-proxy.nourish.com/v1/track',{method:'POST',body:JSON.stringify({type:'track',event,properties})})}};rudderanalytics.page();rudderanalytics.track('Viewed Page',{});`});
    if(u.pathname==='/become-a-dietitian')return r.fulfill({contentType:'text/html',body:`<!doctype html><html><body>${CTA_IDS.map(id=>`<a data-cta-id="${id}" href="/dietitian-application" style="display:block;margin:24px">${id}</a>`).join('')}<script src="/rsa.min.js"></script><script>document.addEventListener('click',e=>{const a=e.target.closest('a');if(a)rudderanalytics.track('Dietitian Apply Clicked',{cta_id:a.dataset.ctaId,cta_name:a.textContent,cta_location:a.dataset.ctaId.split('-').at(-1),destination_path:'/dietitian-application'})})</script></body></html>`});
    return r.abort();
   });return context;
  }};
  const result=await runCase(fixtureBrowser,'/become-a-dietitian',true,'unset');
  assert.deepEqual(result.failures,[]);assert.equal(result.idle.length,2);assert.equal(result.clicks.length,4);
  assert.ok(fallbackMethods.every(x=>x==='GET'),'POST escaped monitor interception');
 }finally{await browser.close()}
});
