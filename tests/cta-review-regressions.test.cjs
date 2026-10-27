// Networkless source-level regression tests. DOM/jQuery and SDK are spies,
// not a browser, consent implementation, or analytics delivery test.
// Queue mode records an invocation without delivery; it is not an SDK queue.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.NOURISH_SOURCE_ROOT || path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'global.js'),'utf8');
const section=source.slice(source.indexOf('// 8. "GET STARTED" TRACKING'));
const contract=JSON.parse(fs.readFileSync(path.join(root,'cta-authoring-contract.json'),'utf8'));
function setup({url='https://www.nourish.com/',consent=true,mode='live'}={}) {
  const handlers=[],ready=[],anchors=[],attempts=[],delivered=[],identity=[];
  const document={referrer:'https://example.invalid/ref?token=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE',body:null,documentElement:{getAttribute:k=>k==='lang'?'en':null}};
  const jq=x=>typeof x==='function'?ready.push(x):{on:(name,fn)=>{if(name==='click')handlers.push(fn)},each:fn=>anchors.forEach(a=>fn.call(a))};
  const ra={track:(...args)=>{attempts.push(args);if(mode==='throwing')throw Error('SDK failure');if(consent&&mode!=='queue')delivered.push(args)},identify:()=>identity.push(1),reset:()=>identity.push(1),setAnonymousId:()=>identity.push(1)};
  const window={location:new URL(url),jQuery:jq,__nourish_apex:'nourish.com',rudderanalytics:ra,NOURISH_GET_UTMS:()=>({utm_source:'synthetic',utm_firstName:'SYNTHETIC_PRIVATE'})};
  const context=vm.createContext({window,document,jQuery:jq,URL,URLSearchParams,navigator:{userAgent:'Synthetic desktop'},sessionStorage:{getItem:()=>null},setTimeout:()=>0,clearTimeout:()=>{}});
  const enrichment=source.slice(source.indexOf('function nourishGetUtms()'),source.indexOf('function nourishPatchRudderArrayPush('));
  vm.runInContext(enrichment,context);
  const rawTrack=ra.track;ra.track=(...args)=>rawTrack(...context.nourishMergeUtmsIntoArgs('track',args));
  vm.runInContext(section,context);
  function anchor(href,attrs={}) {
    attrs={href,...attrs};
    const a={tagName:'A',id:'',className:'',getAttribute:k=>attrs[k]??null,setAttribute:(k,v)=>attrs[k]=v,matches:s=>s==='[data-cta="nav"]'&&attrs['data-cta']==='nav',closest:s=>s==='a[href]'?a:null};
    anchors.push(a);return a;
  }
  function click(a,nested=false){const event={target:nested?{closest:()=>a}:a,defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};handlers.forEach(fn=>fn(event));assert.equal(event.defaultPrevented,false);}
  return {anchor,click,attempts,delivered,identity,ready:()=>ready.forEach(fn=>fn()),reinit:()=>vm.runInContext(section,context)};
}
function invalid(t,name,id){assert.equal(t.attempts.length,1);const [event,p]=t.attempts[0];assert.equal(event,name);assert.equal(p.cta_mapping_status,'invalid-contract');assert.equal(p.cta_id,id);assert.equal(p.cta_location,'unmapped');}
const attrs={'data-cta-id':'patient-directory-new','data-cta-name':'Find a dietitian','data-cta-location':'content','data-cta-section':'provider_directory','data-cta-action':'directory-navigation','data-cta-version':'2'};
test('author checklist lists all six required patient fields',()=>{const checklist=contract.future_section_onboarding.join(' ');for(const field of Object.keys(attrs))assert.ok(checklist.includes(field),field);});
for(const href of ['/find-a-provider','https://www.nourish.com/find-a-provider','//www.nourish.com/find-a-provider?token=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE'])test('internal /find-a-provider link fires nothing, as before 2.622.0, href unchanged: '+href,()=>{const t=setup();const a=t.anchor(href,attrs);t.ready();assert.equal(a.getAttribute('href'),href);t.click(a,true);assert.equal(t.attempts.length,0);assert.equal(a.getAttribute('href'),href);assert.equal(t.identity.length,0);});
for(const href of ['https://evil.invalid/find-a-provider','https://www.nourish.com.evil.invalid/find-a-provider','https://www.nourish.com/find-a-provider/extra','https://www.nourish.com/find-a-provider/','http://www.nourish.com/find-a-provider','https://www.nourish.com:444/find-a-provider','https://user:password@www.nourish.com/find-a-provider','https://nourish-2-23.webflow.io/find-a-provider','https://signup.nourish.com/your-privacy-choices','https://signup.nourish.com/settings'])test('unreviewed/private destination remains excluded: '+href,()=>{const t=setup();const a=t.anchor(href);t.ready();t.click(a);assert.equal(t.attempts.length,0);assert.equal(a.getAttribute('href'),href);});
for(const field of ['data-cta-name','data-cta-location','data-cta-section','data-cta-action','data-cta-version'])test('missing authored field is counted without its identity: '+field,()=>{const t=setup();const partial={...attrs};delete partial[field];t.click(t.anchor('https://signup.nourish.com/providers',partial));invalid(t,'Get Started Clicked','patient-directory-unmapped');});
test('valid six-field authored contract emits; no copy-derived identity',()=>{const t=setup();t.click(t.anchor('https://signup.nourish.com/providers',attrs));assert.equal(t.attempts.length,1);assert.equal(t.attempts[0][1].cta_section,'provider_directory');});
test('mismatched authored action is counted by destination without its identity',()=>{const t=setup();t.click(t.anchor('https://signup.nourish.com/',attrs));invalid(t,'Get Started Clicked','patient-signup-unmapped');});
test('signup/direct directory unchanged, safe payload and navigation attribution preserved',()=>{const t=setup();for(const host of ['signup.nourish.com','signup.usenourish.com'])for(const route of ['/','/providers']){const a=t.anchor('https://'+host+route+'?token=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE',{'data-cta':'nav'});t.click(a);const [name,p]=t.attempts.at(-1);assert.equal(name,'Get Started Clicked');assert.equal(p.cta_mapping_status,'reviewed-migration');assert.ok(a.getAttribute('href').includes('landingPageVariation=Organic_Homepage'));assert.ok(a.getAttribute('href').includes('token=SYNTHETIC_PRIVATE'));}assert.equal(t.attempts.length,4);for(const [,p] of t.attempts)assert.ok(p.url.includes('token=SYNTHETIC_PRIVATE'),'url is the full clicked link');});
test('internal /find-a-provider link fires nothing across repeated initialization/clicks',()=>{const t=setup();t.reinit();const a=t.anchor('/find-a-provider');t.click(a);t.click(a);assert.equal(t.attempts.length,0);});
for(const mode of ['live','queue','throwing'])test('internal /find-a-provider link with SDK '+mode+' fires nothing',()=>{const t=setup({mode});t.click(t.anchor('/find-a-provider'));assert.equal(t.attempts.length,0);});
test('consent remains SDK-owned; denied spy suppresses delivery',()=>{const t=setup({consent:false});t.click(t.anchor('https://signup.nourish.com/providers',{'data-cta':'nav'}));assert.equal(t.attempts.length,1);assert.equal(t.delivered.length,0);assert.equal(t.identity.length,0);});
test('dietitian event, IDs, legacy element and placements unchanged',()=>{const t=setup({url:'https://www.nourish.com/become-a-dietitian'});for(const loc of ['hero','earnings','platform','footer']){t.click(t.anchor('/dietitian-application',{'data-cta-id':'dietitian-apply-'+loc,'data-cta-name':'Apply now','data-cta-location':loc,'data-cta-action':'apply-dietitian','data-cta':loc}));const [name,p]=t.attempts.at(-1);assert.equal(name,'Dietitian Apply Clicked');assert.equal(p.cta_id,'dietitian-apply-'+loc);assert.equal(p.cta_location,loc);assert.equal(p.element,loc);}assert.equal(t.attempts.length,4);});

test('empty authored ID does not bypass explicit validation',()=>{const t=setup();t.click(t.anchor('https://signup.nourish.com/',{'data-cta-id':'','data-cta':'nav'}));invalid(t,'Get Started Clicked','patient-signup-unmapped');});
test('preexisting missing authored ID uses unmapped fallback',()=>{const t=setup();t.click(t.anchor('https://signup.nourish.com/'));assert.equal(t.attempts.length,1);assert.equal(t.attempts[0][1].cta_mapping_status,'unmapped');});
test('apply-dietitian action cannot masquerade as a patient CTA',()=>{const t=setup();t.click(t.anchor('https://signup.nourish.com/',{'data-cta-id':'dietitian-apply-hero','data-cta-action':'apply-dietitian'}));invalid(t,'Get Started Clicked','patient-signup-unmapped');assert.notEqual(t.attempts[0][0],'Dietitian Apply Clicked');});
test('CTA events leave page context and referrers to the SDK, as before 2.622.0',()=>{const t=setup();t.click(t.anchor('https://signup.nourish.com/',{'data-cta':'nav'}));assert.equal(t.attempts[0][2],undefined);});
test('CTA events carry every stored utm_* key and historical labels, as before 2.622.0',()=>{const t=setup();t.click(t.anchor('https://signup.nourish.com/',{'data-cta':'nav'}));const p=t.attempts[0][1];assert.equal(p.utm_source,'synthetic');assert.equal(p.utm_firstName,'SYNTHETIC_PRIVATE');assert.equal(p.element,'nav');assert.equal(p.cta_id,'patient-signup-nav');});
