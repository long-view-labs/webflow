// Full-source DOM integration using isolated JSDOM/jQuery and SDK spies.
// No resources are fetched and no real consent/provider delivery is exercised.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.NOURISH_JSDOM_PATH || 'jsdom');
const jquery = fs.readFileSync(process.env.NOURISH_JQUERY_PATH || require.resolve('jquery/dist/jquery.min.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../global.js'), 'utf8');

function setup(t, { page = '/', consent = true } = {}) {
  const dom = new JSDOM('<!doctype html><html lang="en"><head><title>SYNTHETIC_PRIVATE</title></head><body></body></html>', {
    url: 'https://www.nourish.com' + page, runScripts: 'outside-only', pretendToBeVisual: true,
  });
  t.after(() => dom.window.close());
  const w = dom.window;
  const events = [], identity = [], prevented = [];
  w.rudderanalytics = {
    track: (...args) => { if (consent) events.push(args); }, page() {},
    identify: () => identity.push('identify'), reset: () => identity.push('reset'),
    setAnonymousId: () => identity.push('setAnonymousId'),
  };
  w.eval(jquery);
  w.eval(source);
  w.NOURISH_GET_UTMS = () => ({ utm_source: 'SYNTHETIC_PRIVATE', patientBirthday: 'SYNTHETIC_PRIVATE' });
  // Check the source did not prevent navigation, then suppress fixture navigation.
  w.addEventListener('click', e => { prevented.push(e.defaultPrevented); e.preventDefault(); });
  return {
    w, identity,
    events: () => events.filter(e => e[0] !== 'Viewed Page'),
    click(href, attrs = {}) {
      const a = w.document.createElement('a');
      a.setAttribute('href', href);
      for (const [key, value] of Object.entries(attrs)) a.setAttribute(key, value);
      a.textContent = 'SYNTHETIC_PRIVATE';
      w.document.body.append(a);
      a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      assert.equal(prevented.at(-1), false);
      return a;
    },
  };
}

const patient = {
  'data-cta-id': 'patient-signup-nav', 'data-cta-name': 'Start signup | nav',
  'data-cta-location': 'nav', 'data-cta-section': 'navigation',
  'data-cta-action': 'direct-signup', 'data-cta-version': '2',
};
const apply = {
  'data-cta-id': 'dietitian-apply-hero', 'data-cta-name': 'Dietitian apply - Hero',
  'data-cta-location': 'hero', 'data-cta-action': 'apply-dietitian', 'data-cta': 'hero',
};

function assertInvalidContract(events, name, id) {
  assert.equal(events.length, 1);
  const [event, p] = events[0];
  assert.equal(event, name);
  assert.equal(p.cta_mapping_status, 'invalid-contract');
  assert.equal(p.cta_id, id);
  assert.equal(p.cta_location, 'unmapped');
  assert.equal(p.cta_section, 'unmapped');
  assert.notEqual(p.cta_name, 'Start signup | nav');
}

for (const field of Object.keys(patient)) {
  for (const invalid of ['absent', 'empty']) test('explicit patient ' + field + ' ' + invalid + ' is counted as invalid, never with its authored or migrated identity', t => {
    const h = setup(t), attrs = { ...patient, 'data-cta': 'nav' };
    if (invalid === 'absent') delete attrs[field]; else attrs[field] = '';
    h.click('https://signup.nourish.com/', attrs);
    assertInvalidContract(h.events(), 'Get Started Clicked', 'patient-signup-unmapped');
  });
}

test('a partial contract without any ID is counted as invalid; unauthored migration still works', t => {
  const h = setup(t);
  h.click('https://signup.nourish.com/', { 'data-cta-name': 'Start signup', 'data-cta': 'nav' });
  assertInvalidContract(h.events(), 'Get Started Clicked', 'patient-signup-unmapped');
  h.click('https://signup.nourish.com/', { 'data-cta': 'nav' });
  assert.equal(h.events()[1][1].cta_mapping_status, 'reviewed-migration');
});

for (const href of ['http://signup.nourish.com/', 'https://signup.nourish.com:444/',
  'https://signup.usenourish.com:444/providers', 'https://user:password@signup.nourish.com/',
  'https://signup.nourish.com/your-privacy-choices', 'https://signup.nourish.com/settings']) {
  test('unapproved/private signup destination excluded: ' + href, t => {
    const h = setup(t);
    const a = h.click(href, { 'data-cta': 'nav' });
    assert.equal(h.events().length, 0);
    assert.equal(a.getAttribute('href'), href);
  });
}

test('standard HTTPS signup port remains valid', t => {
  const h = setup(t);
  h.click('https://signup.nourish.com:443/', patient);
  assert.equal(h.events()[0][0], 'Get Started Clicked');
});

test('an unapproved signup origin cannot become a dietitian event', t => {
  const h = setup(t, { page: '/become-a-dietitian' });
  for (const href of ['http://signup.nourish.com/', 'https://signup.nourish.com:444/']) h.click(href, apply);
  assert.equal(h.events().length, 0);
});

test('body page revision and automatic source path need no manual page label', t => {
  const h = setup(t);
  h.w.document.body.setAttribute('data-page-version', '3');
  const a = h.click('https://signup.nourish.com/?token=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE', patient);
  const event = h.events()[0], p = event[1];
  assert.equal(Object.hasOwn(p, 'page_name'), false);
  assert.equal(p.page_path, '/');
  assert.equal(p.page_version, '3');
  assert.equal(p.cta_version, '2');
  assert.equal(p.release_version, 'cta-cleanup-2026-10-26-1');
  assert.equal(p.tracking_schema_version, '2');
  assert.ok(!JSON.stringify(event).includes('SYNTHETIC_PRIVATE'));
  assert.ok(a.getAttribute('href').includes('token=SYNTHETIC_PRIVATE'));
  const navigation = new URL(a.getAttribute('href'));
  assert.equal(navigation.searchParams.get('utm_source'), 'SYNTHETIC_PRIVATE');
  assert.equal(navigation.searchParams.has('patientBirthday'), false);
  assert.equal(p.url, 'https://signup.nourish.com/');
  assert.equal(event[2].context.page.search, '');
  assert.equal(h.identity.length, 0);
});

test('html page revision takes precedence while pre-existing page-name attributes stay untouched', t => {
  const h = setup(t);
  for (const [key, value] of Object.entries({ 'data-page-name': 'Reviewed home', 'data-page-version': '4' })) h.w.document.documentElement.setAttribute(key, value);
  h.w.document.body.setAttribute('data-page-name', 'Body fallback');
  h.w.document.body.setAttribute('data-page-version', '1');
  h.click('https://signup.nourish.com/', patient);
  assert.equal(Object.hasOwn(h.events()[0][1], 'page_name'), false);
  assert.equal(h.events()[0][1].page_version, '4');
  assert.equal(h.w.document.documentElement.getAttribute('data-page-name'), 'Reviewed home');
  assert.equal(h.w.document.body.getAttribute('data-page-name'), 'Body fallback');
});

test('missing/invalid page revision stays null and no page label is inferred', t => {
  const h = setup(t);
  h.click('https://signup.nourish.com/', patient);
  assert.equal(Object.hasOwn(h.events()[0][1], 'page_name'), false);
  assert.equal(h.events()[0][1].page_version, null);
  h.w.document.documentElement.setAttribute('data-page-version', 'invalid revision');
  h.w.document.body.setAttribute('data-page-version', '1');
  h.click('https://signup.nourish.com/', patient);
  assert.equal(Object.hasOwn(h.events()[1][1], 'page_name'), false);
  assert.equal(h.events()[1][1].page_version, null);
  assert.ok(!JSON.stringify(h.events()).includes('SYNTHETIC_PRIVATE'));
});

test('dietitian section/revision is explicit while ID, placement and legacy element remain stable', t => {
  const h = setup(t, { page: '/become-a-dietitian' });
  h.click('/dietitian-application', { ...apply, 'data-cta-section': 'employment_intro', 'data-cta-version': '3' });
  const [event, p] = h.events()[0];
  assert.equal(event, 'Dietitian Apply Clicked');
  assert.equal(p.cta_id, 'dietitian-apply-hero');
  assert.equal(p.cta_location, 'hero');
  assert.equal(p.element, 'hero');
  assert.equal(p.cta_section, 'employment_intro');
  assert.equal(p.cta_version, '3');
  h.click('/dietitian-application', apply);
  assert.equal(h.events()[1][1].cta_section, 'hero');
  assert.equal(h.events()[1][1].cta_version, '1');
});

for (const [field, value] of [['data-cta-section', ''], ['data-cta-section', 'invalid section'],
  ['data-cta-version', ''], ['data-cta-version', 'invalid revision']]) test('invalid authored dietitian revision contract rejected: ' + field + '=' + value, t => {
  const h = setup(t, { page: '/become-a-dietitian' });
  h.click('/dietitian-application', { ...apply, [field]: value });
  assert.equal(h.events().length, 0);
});

test('denied consent remains SDK-owned with no delivered event or identity mutation', t => {
  const h = setup(t, { consent: false });
  h.click('https://signup.nourish.com/', patient);
  h.click('/find-a-provider');
  assert.equal(h.events().length, 0);
  assert.equal(h.identity.length, 0);
});
