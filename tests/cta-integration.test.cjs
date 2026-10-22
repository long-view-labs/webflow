// Full global.js + existing jQuery in a DOM, with SDK stub/live/consent spies.
// No network, real analytics, identity mutation, form submission or installs.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require(process.env.NOURISH_JSDOM_PATH);
const jquery = fs.readFileSync(process.env.NOURISH_JQUERY_PATH,'utf8');
const globalJs = fs.readFileSync(path.join(__dirname,'../global.js'),'utf8');
const section8 = globalJs.slice(globalJs.indexOf('// 8. "GET STARTED" TRACKING'));
function setup({url='https://www.nourish.com/',mobile=false,mode='live',consent=true}={}) {
  const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><div id="fixture"></div></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window; const events=[]; let identityCalls=0;
  Object.defineProperty(w.navigator,'userAgent',{value:mobile?'Mozilla/5.0 (iPhone)':'Mozilla/5.0 (Macintosh)'});
  const ra=mode==='queue'?[]:{};
  ra.track=function(...a){if(mode==='throwing')throw Error('SDK failure'); if(mode==='queue')ra.push(['track',...a]);else if(consent) events.push(a);};
  ra.identify=ra.reset=ra.setAnonymousId=()=>identityCalls++;
  ra.page=()=>{};w.rudderanalytics=ra;
  w.eval(jquery);w.eval(globalJs);
  w.NOURISH_GET_UTMS=()=>({utm_source:'qa',utm_firstName:'SYNTHETIC_PRIVATE',patientBirthday:'SYNTHETIC_PRIVATE'});
  return {w,dom,events,get identityCalls(){return identityCalls;},tracks:()=>mode==='queue'?ra.filter(x=>x[0]==='track'&&x[1]!=='Viewed Page').map(x=>x.slice(1)):events.filter(x=>x[0]!=='Viewed Page'),close:()=>w.close()};
}
function add(t,html){const node=t.w.document.createElement('div');node.innerHTML=html;t.w.document.querySelector('#fixture').append(node);return node.querySelector('a');}
function click(t,a,{nested=false,keyboard=false}={}){const target=nested?a.querySelector('span'):a;const e=new t.w.MouseEvent('click',{bubbles:true,cancelable:true,detail:keyboard?0:1});target.dispatchEvent(e);return e;}
function scenario(name,fn){test(name,()=>{const t=setup();try{fn(t)}finally{t.close()}})}
scenario('plain text signup remains covered and explicitly unmapped',t=>{const a=add(t,'<a href="https://signup.nourish.com/">Start here</a>');click(t,a);assert.equal(t.tracks().length,1);const [name,p]=t.tracks()[0];assert.equal(name,'Get Started Clicked');assert.equal(p.cta_mapping_status,'unmapped');assert.equal(p.cta_id,'patient-signup-unmapped');});
scenario('explicit nav contract + nested child emits one event',t=>{const a=add(t,'<nav><a data-cta="nav" href="https://signup.nourish.com/"><span>Start</span></a></nav>');click(t,a,{nested:true});assert.equal(t.tracks().length,1);assert.equal(t.tracks()[0][1].cta_id,'patient-signup-nav');});
scenario('keyboard-generated click shape is covered',t=>{const a=add(t,'<a data-cta="nav" href="https://signup.nourish.com/">Start</a>');click(t,a,{keyboard:true});assert.equal(t.tracks().length,1);});
scenario('privacy/settings, arbitrary paths, non-navigation and lookalike hosts excluded; privacy href unchanged',t=>{for(const href of ['https://signup.nourish.com/your-privacy-choices','https://signup.nourish.com/settings','https://signup.nourish.com/unknown','https://signup.nourish.com.evil.invalid/','#','mailto:qa@example.invalid']){const a=add(t,'<a>privacy</a>');a.href=href;const before=a.getAttribute('href');const e=click(t,a);assert.equal(e.defaultPrevented,false);assert.equal(a.getAttribute('href'),before);}assert.equal(t.tracks().length,0);});
scenario('dynamic insertion after initialization, both exact signup hosts and separate directory event without duplicate patient click',t=>{for(const host of ['signup.nourish.com','signup.usenourish.com']){const a=add(t,`<a data-cta="nav" href="https://${host}/providers">Find</a>`);click(t,a);}assert.equal(t.tracks().length,2);assert.ok(t.tracks().every(x=>x[1].cta_action==='directory-navigation'&&x[0]==='Dietitian Directory Clicked'));});
scenario('repeat initialization does not bind twice',t=>{t.w.eval(section8);t.w.eval(section8);click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));assert.equal(t.tracks().length,1);});
scenario('query/form values are absent from event properties and context; navigation retains query',t=>{const a=add(t,'<a data-cta="nav" href="https://signup.nourish.com/?firstName=SYNTHETIC_PRIVATE&patientBirthday=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE">Start</a>');click(t,a);const x=t.tracks()[0];assert.ok(!JSON.stringify(x).includes('SYNTHETIC_PRIVATE'));assert.equal(x[1].url,'https://signup.nourish.com/');assert.ok(a.href.includes('firstName='));assert.equal(x[2].context.page.search,'');assert.equal(t.identityCalls,0);});
scenario('explicit new section and revision independent of changed presentation/copy',t=>{const a=add(t,'<a data-cta-id="patient-signup-how-it-works" data-cta-name="Start signup | How it works" data-cta-location="content" data-cta-section="how_it_works" data-cta-action="direct-signup" data-cta-version="2" data-experiment-variant="control" href="https://signup.nourish.com/">Texto nuevo</a>');click(t,a);const p=t.tracks()[0][1];assert.equal(p.cta_version,'2');assert.equal(p.cta_id,'patient-signup-how-it-works');assert.equal(p.experiment_variant,'control');assert.equal(p.cta_section,'how_it_works');});
test('dietitian event name, IDs and placements retained; no patient double event',()=>{const t=setup({url:'https://www.nourish.com/become-a-dietitian'});try{for(const loc of ['hero','earnings','platform','footer'])click(t,add(t,`<a data-cta-id="dietitian-apply-${loc}" data-cta-name="Apply now" data-cta-location="${loc}" data-cta-action="apply-dietitian" href="/dietitian-application">Apply</a>`));assert.equal(t.tracks().length,4);assert.ok(t.tracks().every(x=>x[0]==='Dietitian Apply Clicked'));assert.deepEqual(t.tracks().map(x=>x[1].cta_location),['hero','earnings','platform','footer']);}finally{t.close()}});
for(const mode of ['live','queue','throwing'])test('SDK mode '+mode+' does not block navigation',()=>{const t=setup({mode});try{const a=add(t,'<a href="https://signup.nourish.com/">Start</a>');assert.equal(click(t,a).defaultPrevented,false);if(mode!=='throwing')assert.equal(t.tracks().length,1);}finally{t.close()}});
test('consent remains owned by SDK; denied spy delivers no event',()=>{const t=setup({consent:false});try{click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));assert.equal(t.tracks().length,0);assert.equal(t.identityCalls,0);}finally{t.close()}});
test('mobile device property and staging-only explicit QA markers',()=>{const t=setup({url:'https://nourish-2-23.webflow.io/?qa_test=true&qa_run_id=nourish-cta-qa-offline-test',mobile:true});try{click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));const p=t.tracks()[0][1];assert.equal(p.deviceType,'mobile');assert.equal(p.qa_test,true);assert.equal(p.qa_run_id,'nourish-cta-qa-offline-test');}finally{t.close()}});
test('production URL QA params do not activate test markers',()=>{const t=setup({url:'https://www.nourish.com/?qa_test=true&qa_run_id=nourish-cta-qa-offline-test'});try{click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));assert.ok(!('qa_test' in t.tracks()[0][1]));}finally{t.close()}});
