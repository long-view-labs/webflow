// Full global.js + existing jQuery in a DOM, with SDK stub/live/consent spies.
// No network, real analytics, identity mutation, form submission or installs.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require(process.env.NOURISH_JSDOM_PATH || 'jsdom');
const jquery = fs.readFileSync(process.env.NOURISH_JQUERY_PATH || require.resolve('jquery/dist/jquery.min.js'),'utf8');
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
scenario('plain text signup remains covered and explicitly reported as other',t=>{const a=add(t,'<a href="https://signup.nourish.com/">Start here</a>');click(t,a);assert.equal(t.tracks().length,1);const [name,p]=t.tracks()[0];assert.equal(name,'Get Started Clicked');assert.equal(p.cta_mapping_status, undefined);assert.equal(p.cta_id,'patient-signup-other');});
scenario('explicit nav contract + nested child emits one event',t=>{const a=add(t,'<nav><a data-cta="nav" href="https://signup.nourish.com/"><span>Start</span></a></nav>');click(t,a,{nested:true});assert.equal(t.tracks().length,1);assert.equal(t.tracks()[0][1].cta_id,'patient-signup-nav');});
scenario('keyboard-generated click shape is covered',t=>{const a=add(t,'<a data-cta="nav" href="https://signup.nourish.com/">Start</a>');click(t,a,{keyboard:true});assert.equal(t.tracks().length,1);});
scenario('every other signup path is a signup-flow CTA with UTMs and variation appended, as before 2.622.0',t=>{for(const route of ['/flow/get-started','/1','/2','/unknown']){const a=add(t,`<a data-cta="nav" href="https://signup.nourish.com${route}">Start</a>`);click(t,a);assert.ok(a.getAttribute('href').includes('landingPageVariation='),route);}assert.equal(t.tracks().length,4);assert.ok(t.tracks().every(x=>x[0]==='Get Started Clicked'&&x[1].cta_action==='signup-flow'));const d=add(t,'<a data-cta="nav" href="https://signup.nourish.com/providers/search">Find</a>');click(t,d);assert.equal(t.tracks()[4][1].cta_action,'provider-directory');});
scenario('privacy/settings, non-navigation and lookalike hosts excluded; privacy href unchanged',t=>{for(const href of ['https://signup.nourish.com/your-privacy-choices','https://signup.nourish.com/settings','https://signup.nourish.com.evil.invalid/','#','mailto:qa@example.invalid']){const a=add(t,'<a>privacy</a>');a.href=href;const before=a.getAttribute('href');const e=click(t,a);assert.equal(e.defaultPrevented,false);assert.equal(a.getAttribute('href'),before);}assert.equal(t.tracks().length,0);});
scenario('dynamic insertion after initialization, both exact signup hosts; directory links fire Get Started Clicked once with cta_action=directory-navigation',t=>{for(const host of ['signup.nourish.com','signup.usenourish.com']){const a=add(t,`<a data-cta="nav" href="https://${host}/providers">Find</a>`);click(t,a);}assert.equal(t.tracks().length,2);assert.ok(t.tracks().every(x=>x[1].cta_action==='provider-directory'&&x[0]==='Get Started Clicked'));});
scenario('repeat initialization does not bind twice',t=>{t.w.eval(section8);t.w.eval(section8);click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));assert.equal(t.tracks().length,1);});
scenario('event url keeps UTMs but drops name/DOB prefill, reporting only filled flags; context is left to the SDK',t=>{const a=add(t,'<a data-cta="nav" href="https://signup.nourish.com/?firstName=SYNTHETIC_PRIVATE&patientBirthday=SYNTHETIC_PRIVATE&utm_source=qa&nourishPayerId=7&planName=SYNTHETIC_PLAN#frag">Start</a>');click(t,a);const x=t.tracks()[0];assert.ok(!x[1].url.includes('SYNTHETIC_PRIVATE'));assert.ok(!x[1].url.includes('SYNTHETIC_PLAN'));assert.equal(Object.hasOwn(x[1],'has_insurance_plan'),false);assert.ok(x[1].url.includes('utm_source=qa'));assert.ok(!x[1].url.includes('nourishPayerId'));assert.equal(x[1].has_insurance,true);assert.equal(x[1].has_first_name,true);assert.equal(x[1].has_last_name,undefined);assert.equal(x[1].has_birthday,true);assert.ok(a.href.includes('firstName='),'the link itself is left alone');assert.equal(x[2],undefined);assert.equal(t.identityCalls,0);});
scenario('hero data-prefill flags report filled / not filled without any values on the link',t=>{const a=add(t,'<a id="home-filter-cta" data-prefill-first-name="true" data-prefill-last-name="false" data-prefill-birthday="true" data-prefill-insurance="false" href="https://signup.nourish.com/?InsuranceSearchInput=true&utm_source=qa">Check</a>');click(t,a);const p=t.tracks()[0][1];assert.equal(p.has_insurance,false);assert.equal(p.has_first_name,true);assert.equal(p.has_last_name,false);assert.equal(p.has_birthday,true);assert.equal(p.url,'https://signup.nourish.com/?InsuranceSearchInput=true&utm_source=qa');});
scenario('ordinary CTAs carry no prefill flags and their url is unchanged',t=>{const a=add(t,'<a data-cta="nav" href="https://signup.nourish.com/?utm_source=qa">Start</a>');click(t,a);const p=t.tracks()[0][1];assert.equal(p.url,'https://signup.nourish.com/?utm_source=qa');for(const k of ['has_first_name','has_last_name','has_birthday','has_insurance'])assert.equal(Object.hasOwn(p,k),false);});
scenario('explicit new section and revision independent of changed presentation/copy',t=>{const a=add(t,'<a data-cta-id="patient-signup-how-it-works" data-cta-name="Start signup | How it works" data-cta-location="content" data-cta-section="how_it_works" data-cta-action="direct-signup" data-cta-version="2" data-experiment-variant="control" href="https://signup.nourish.com/">Texto nuevo</a>');click(t,a);const p=t.tracks()[0][1];assert.equal(p.cta_version,'2');assert.equal(p.cta_id,'patient-signup-how-it-works');assert.equal(Object.hasOwn(p,'experiment_variant'),false);assert.equal(a.getAttribute('data-experiment-variant'),'control');assert.equal(p.cta_section,'how_it_works');});
test('dietitian event name, IDs and placements retained; no patient double event',()=>{const t=setup({url:'https://www.nourish.com/become-a-dietitian'});try{for(const loc of ['hero','earnings','platform','footer'])click(t,add(t,`<a data-cta-id="dietitian-apply-${loc}" data-cta-name="Apply now" data-cta-location="${loc}" data-cta-action="apply-dietitian" href="/dietitian-application">Apply</a>`));assert.equal(t.tracks().length,4);assert.ok(t.tracks().every(x=>x[0]==='Dietitian Apply Clicked'));assert.deepEqual(t.tracks().map(x=>x[1].cta_section),['hero','earnings','platform','footer']);assert.ok(t.tracks().every(x=>!('cta_location' in x[1])));}finally{t.close()}});
for(const mode of ['live','queue','throwing'])test('SDK mode '+mode+' does not block navigation',()=>{const t=setup({mode});try{const a=add(t,'<a href="https://signup.nourish.com/">Start</a>');assert.equal(click(t,a).defaultPrevented,false);if(mode!=='throwing')assert.equal(t.tracks().length,1);}finally{t.close()}});
test('consent remains owned by SDK; denied spy delivers no event',()=>{const t=setup({consent:false});try{click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));assert.equal(t.tracks().length,0);assert.equal(t.identityCalls,0);}finally{t.close()}});
test('mobile device property is retained without staging QA event properties',()=>{const t=setup({url:'https://nourish-2-23.webflow.io/?qa_test=true&qa_run_id=nourish-cta-qa-offline-test',mobile:true});try{click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));const p=t.tracks()[0][1];assert.equal(p.deviceType,'mobile');assert.equal(Object.hasOwn(p,'qa_test'),false);assert.equal(Object.hasOwn(p,'qa_run_id'),false);}finally{t.close()}});
test('production URL QA params do not activate test markers and page context is left to the SDK',()=>{const t=setup({url:'https://www.nourish.com/?qa_test=true&qa_run_id=nourish-cta-qa-offline-test'});try{click(t,add(t,'<a href="https://signup.nourish.com/">Start</a>'));assert.ok(!('qa_test' in t.tracks()[0][1]));assert.equal(t.tracks()[0][2],undefined);}finally{t.close()}});

const removedCtaFields = ['page_version', 'experiment_variant', 'cta_presentation',
  'tracking_schema_version', 'release_version', 'qa_test', 'qa_run_id', 'locale'];
const attribution = {utm_source: 'fixture-source', utm_custom: 'fixture-custom',
  gclid: 'fixture-gclid', fbclid: 'fixture-fbclid'};
const metadataCases = [
  {kind: 'signup', page: '/paid-labs', destination: 'https://signup.nourish.com/flow/get-started',
    id: 'patient-signup-fixture', action: 'direct-signup', reportedAction: 'signup-flow',
    name: 'Start signup', location: 'content', event: 'Get Started Clicked', variation: 'Labs_LP'},
  {kind: 'directory', page: '/', destination: 'https://signup.usenourish.com/providers',
    id: 'patient-directory-fixture', action: 'directory-navigation', reportedAction: 'provider-directory',
    name: 'Find a dietitian', location: 'content', event: 'Get Started Clicked', variation: 'Organic_Homepage'},
  {kind: 'dietitian', page: '/become-a-dietitian', destination: '/dietitian-application',
    id: 'dietitian-apply-hero', action: 'apply-dietitian', reportedAction: 'apply-dietitian',
    name: 'Apply now', location: 'hero', event: 'Dietitian Apply Clicked'},
];

for (const host of ['www.nourish.com', 'nourish-2-23.webflow.io']) {
  for (const mode of ['live', 'queue']) {
    for (const c of metadataCases) test(`removed CTA metadata stays absent; retained ${c.kind} contract (${host}, ${mode})`, () => {
      const t = setup({url: `https://${host}${c.page}?qa_test=true&qa_run_id=nourish-cta-qa-fixture`, mode});
      try {
        t.w.NOURISH_GET_UTMS = () => ({...attribution});
        t.w.document.documentElement.setAttribute('lang', 'fr-FR');
        t.w.document.documentElement.setAttribute('data-page-version', 'page-3');
        t.w.document.body.setAttribute('data-page-version', 'page-2');
        // Prevent fixture navigation only after production's document handler.
        t.w.addEventListener('click', e => e.preventDefault());
        const a = add(t, `<a data-cta="fixture" data-cta-id="${c.id}" data-cta-name="${c.name}"
          data-cta-location="${c.location}" data-cta-section="fixture_section" data-cta-action="${c.action}"
          data-cta-version="3" data-experiment-variant="control" data-cta-presentation="text_link"
          href="${c.destination}?utm_source=authored&amp;gclid=authored-click&amp;filter=fixture#fragment">Visible text</a>`);
        const before = a.getAttribute('href');
        click(t, a);
        assert.equal(t.tracks().length, 1);
        const [event, p, options] = t.tracks()[0];
        assert.equal(event, c.event);
        for (const key of removedCtaFields) assert.equal(Object.hasOwn(p, key), false, key);
        const destination = new URL(c.destination, t.w.location.origin);
        const retained = {
          location: c.page, element: 'fixture', 'cta copy': c.kind === 'dietitian' ? c.name : 'Visible text',
          url: c.kind === 'dietitian' ? destination.origin + destination.pathname : new URL(before, t.w.location.origin).href,
          deviceType: 'desktop', cta_id: c.id, cta_name: c.name, cta_section: 'fixture_section',
          cta_action: c.reportedAction, cta_version: '3', page_path: c.page,
          destination_host: destination.hostname, destination_path: destination.pathname, ...attribution,
        };
        if (c.variation) retained.landingPageVariation = c.variation;
        if (c.kind === 'signup') retained.variationName = 'labsPromotionVariation';
        assert.deepEqual(JSON.parse(JSON.stringify(p)), retained);
        assert.equal(options, undefined, 'SDK context is still left to the SDK');
        assert.equal(t.identityCalls, 0);
        assert.equal(t.w.document.documentElement.getAttribute('lang'), 'fr-FR');
        assert.equal(t.w.document.documentElement.getAttribute('data-page-version'), 'page-3');
        assert.equal(t.w.document.body.getAttribute('data-page-version'), 'page-2');
        assert.equal(a.getAttribute('data-experiment-variant'), 'control');
        assert.equal(a.getAttribute('data-cta-presentation'), 'text_link');
        if (c.kind === 'dietitian') assert.equal(a.getAttribute('href'), before);
        else {
          const nav = new URL(a.href);
          assert.equal(nav.searchParams.get('utm_source'), 'authored');
          assert.equal(nav.searchParams.get('gclid'), 'authored-click');
          assert.equal(nav.searchParams.get('fbclid'), attribution.fbclid);
          assert.equal(nav.searchParams.get('filter'), 'fixture');
          assert.equal(nav.hash, '#fragment');
          assert.equal(nav.searchParams.get('landingPageVariation'), c.variation);
          assert.equal(nav.searchParams.has('qa_test'), false);
          assert.equal(nav.searchParams.has('qa_run_id'), false);
        }
        // This change must not strip unrelated event properties or SDK context.
        const sdkOptions = {context: {locale: 'fr-FR'}};
        t.w.rudderanalytics.track('Unrelated fixture event', {locale: 'fr-FR', qa_test: true}, sdkOptions);
        const unrelated = t.tracks().at(-1);
        assert.equal(unrelated[1].locale, 'fr-FR');
        assert.equal(unrelated[1].qa_test, true);
        assert.equal(unrelated[2], sdkOptions);
      } finally { t.close(); }
    });
  }
}
