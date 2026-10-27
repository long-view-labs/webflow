// Paid landing page CTAs resolve to reviewed placements instead of "unmapped".
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.NOURISH_JSDOM_PATH || 'jsdom');
const jquery = fs.readFileSync(process.env.NOURISH_JQUERY_PATH || require.resolve('jquery/dist/jquery.min.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../global.js'), 'utf8');

function clickIn(t, page, html, selector, href = 'https://signup.nourish.com/') {
  const dom = new JSDOM('<!doctype html><html><body>' + html + '</body></html>', { url: 'https://www.nourish.com' + page, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, events = [];
  w.rudderanalytics = { track: (...a) => events.push(a), page() {}, identify() {}, reset() {}, setAnonymousId() {} };
  w.eval(jquery); w.eval(source);
  w.addEventListener('click', (e) => e.preventDefault());
  const a = w.document.querySelector(selector);
  a.setAttribute('href', href);
  a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  return events.filter((e) => e[0] !== 'Viewed Page').map((e) => e[1]);
}

const cases = [
  ['a.quiz', '<div class="padding-section-medium"><a class="button quiz w-button">Check</a></div>', 'patient-signup-quiz', 'hero', 'quiz'],
  ['a', '<div class="padding-section-insurances"><a data-cta="in-page">x</a></div>', 'patient-signup-insurance', 'content', 'insurance'],
  ['a', '<section class="section_approach"><div class="padding-section-how-it-works"><a data-cta="in-page">x</a></div></section>', 'patient-signup-how-it-works', 'content', 'how_it_works'],
  ['a', '<section class="section_approach"><div class="container-medium"><a data-cta="in-page">x</a></div></section>', 'patient-signup-approach', 'content', 'approach'],
  ['a', '<section class="section_testimonial-slider"><a data-cta="in-page">x</a></section>', 'patient-signup-testimonials', 'content', 'testimonials'],
  ['a', '<section class="section_step-cards"><a data-cta="in-page">x</a></section>', 'patient-signup-app', 'content', 'app'],
  ['a', '<section class="footer-paid_card"><a data-cta="footer">x</a></section>', 'patient-signup-final-cta', 'footer', 'final_cta'],
  ['a', '<section class="section_logos"><a data-cta="footer">x</a></section>', 'patient-signup-insurance', 'content', 'insurance'],
  ['a', '<section class="section_program-slider"><a data-cta="footer">x</a></section>', 'patient-signup-program', 'content', 'benefits'],
  ['a', '<section class="section_sticky-phone"><a data-cta="footer">x</a></section>', 'patient-signup-app', 'content', 'app'],
];

for (const page of ['/paid', '/paid-google', '/paid-labs', '/paidwl']) {
  for (const [sel, html, id, loc, section] of cases) {
    test(`${page}: ${id} maps to ${loc}/${section}`, (t) => {
      const [p] = clickIn(t, page, html, sel);
      assert.equal(p.cta_id, id);
      assert.equal(p.cta_location, loc);
      assert.equal(p.cta_section, section);
      assert.equal(p.cta_mapping_status, 'reviewed-migration');
    });
  }
}

test('paid FAQ directory link maps to faq', (t) => {
  const [p] = clickIn(t, '/paid', '<div class="faq_dropdown-list"><a>Find</a></div>', 'a', 'https://signup.nourish.com/providers');
  assert.equal(p.cta_id, 'patient-directory-faq');
  assert.equal(p.cta_section, 'faq');
});

test('paid mappings stay off non-paid pages', (t) => {
  for (const page of ['/', '/paid-something/else', '/faq/when-and-how-do-i-get-paid', '/unpaid']) {
    const [p] = clickIn(t, page, '<section class="section_testimonial-slider"><a data-cta="in-page">x</a></section>', 'a');
    assert.equal(p.cta_id, 'patient-signup-unmapped', page);
  }
});

test('an authored contract still wins over the paid mapping', (t) => {
  const [p] = clickIn(t, '/paid', '<section class="footer-paid_card"><a data-cta="footer" data-cta-id="patient-signup-custom" data-cta-name="Custom" data-cta-location="footer" data-cta-section="final_cta" data-cta-action="direct-signup" data-cta-version="3">x</a></section>', 'a');
  assert.equal(p.cta_id, 'patient-signup-custom');
  assert.equal(p.cta_mapping_status, 'explicit');
});

test('Footer V2 splash with blank placeholder attributes maps to final_cta on any page', (t) => {
  for (const page of ['/', '/blog', '/paid-google']) {
    const [p] = clickIn(t, page, '<section class="section_footer-splash"><a data-cta="footer" data-cta-name="" data-cta-location="" data-cta-action="" data-cta-id="">Get started</a></section>', 'a');
    assert.equal(p.cta_id, 'patient-signup-final-cta', page);
    assert.equal(p.cta_section, 'final_cta');
    assert.equal(p.cta_mapping_status, 'reviewed-migration');
  }
});

test('Footer V2 splash with a partly filled contract is still invalid', (t) => {
  const [p] = clickIn(t, '/', '<section class="section_footer-splash"><a data-cta="footer" data-cta-name="Start" data-cta-location="" data-cta-action="" data-cta-id="">Get started</a></section>', 'a');
  assert.equal(p.cta_mapping_status, 'invalid-contract');
});

test('blank placeholders outside the footer splash stay invalid', (t) => {
  const [p] = clickIn(t, '/', '<div class="hero"><a data-cta="nav" data-cta-id="">Get started</a></div>', 'a');
  assert.equal(p.cta_mapping_status, 'invalid-contract');
});
