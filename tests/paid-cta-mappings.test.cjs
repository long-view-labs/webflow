// Section-block CTAs (paid, landing, condition, partner and employer templates)
// resolve to reviewed placements and the shared naming vocabulary.
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
  ['a', '<div class="padding-section-insurances"><a data-cta="in-page">x</a></div>', 'patient-signup-insurance-logos', 'content', 'insurance'],
  ['a', '<section class="section_approach"><div class="padding-section-how-it-works"><a data-cta="in-page">x</a></div></section>', 'patient-signup-how-it-works', 'content', 'how_it_works'],
  ['a', '<section class="section_approach"><div class="container-medium"><a data-cta="in-page">x</a></div></section>', 'patient-signup-approach', 'content', 'approach'],
  ['a', '<section class="section_testimonial-slider"><a data-cta="in-page">x</a></section>', 'patient-signup-testimonials', 'content', 'testimonials'],
  ['a', '<section class="section_step-cards"><a data-cta="in-page">x</a></section>', 'patient-signup-app', 'content', 'app'],
  ['a', '<section class="footer-paid_card"><a data-cta="footer">x</a></section>', 'patient-signup-final-cta', 'footer', 'final_cta'],
  ['a', '<section class="section_logos"><a data-cta="footer">x</a></section>', 'patient-signup-insurance-logos', 'content', 'insurance'],
  ['a', '<section class="section_program-slider"><a data-cta="footer">x</a></section>', 'patient-signup-benefits', 'content', 'benefits'],
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

test('section mappings apply on landing, condition, partner and employer pages too', (t) => {
  for (const page of ['/', '/landing-page/anxiety', '/conditions/acid-reflux', '/partners/ableto', '/cigna']) {
    const [p] = clickIn(t, page, '<section class="section_testimonial-slider"><a data-cta="in-page">x</a></section>', 'a');
    assert.equal(p.cta_id, 'patient-signup-testimonials', page);
  }
});

const sitewide = [
  ['<section class="section_how-can-help"><a>x</a></section>', 'patient-signup-how-we-help', 'content', 'benefits', 'Get Started | How we can help'],
  ['<section class="section_insurance-header"><a class="button quiz">x</a></section>', 'patient-signup-quiz', 'hero', 'quiz', 'Get Started | Quiz'],
  ['<section class="section_feature"><a>x</a></section>', 'patient-signup-hero', 'hero', 'hero', 'Get Started | Hero'],
  ['<section class="section_content"><a class="button-sidebar">x</a></section>', 'patient-signup-sidebar', 'content', 'content', 'Get Started | Sidebar'],
  ['<section class="section_blog-article"><a>x</a></section>', 'patient-signup-article', 'content', 'content', 'Get Started | Article'],
  ['<section class="section_employee-quotes"><a>x</a></section>', 'patient-signup-testimonials', 'content', 'testimonials', 'Get Started | Testimonials'],
  ['<div class="cta-splash_card"><a>x</a></div>', 'patient-signup-final-cta', 'footer', 'final_cta', 'Get Started | Final CTA'],
  ['<section class="section_nourish-program"><a>x</a></section>', 'patient-signup-benefits', 'content', 'benefits', 'Get Started | Benefits'],
];
for (const [html, id, loc, section, name] of sitewide) {
  test(`${id} (${name}) maps on any page`, (t) => {
    const [p] = clickIn(t, '/landing-page/anxiety', html, 'a');
    assert.equal(p.cta_id, id);
    assert.equal(p.cta_location, loc);
    assert.equal(p.cta_section, section);
    assert.equal(p.cta_name, name);
  });
}

test('names read "Get Started | <placement>" and "Find a Dietitian | <placement>"', (t) => {
  const [a] = clickIn(t, '/', '<a id="home-filter-cta">x</a>', 'a');
  assert.equal(a.cta_name, 'Get Started | Hero insurance search');
  assert.equal(a.cta_id, 'patient-signup-hero-insurance-search');
  const [b] = clickIn(t, '/', '<a data-cta="nav">x</a>', 'a', 'https://signup.nourish.com/providers');
  assert.equal(b.cta_name, 'Find a Dietitian | Nav');
});

test('authored ids from older naming fold into the shared vocabulary', (t) => {
  const html = '<a data-cta="footer" data-cta-id="patient-directory-footer" data-cta-name="Find a dietitian | footer" data-cta-location="footer" data-cta-section="final_cta" data-cta-action="directory-navigation" data-cta-version="1">x</a>';
  const [p] = clickIn(t, '/', html, 'a', 'https://signup.nourish.com/providers');
  assert.equal(p.cta_id, 'patient-directory-final-cta');
  assert.equal(p.cta_name, 'Find a Dietitian | Final CTA');
  assert.equal(p.cta_mapping_status, 'explicit');
  const [h] = clickIn(t, '/', '<a data-cta-id="patient-signup-hero" data-cta-name="Start signup | hero" data-cta-location="hero" data-cta-section="intro" data-cta-action="direct-signup" data-cta-version="1">x</a>', 'a');
  assert.equal(h.cta_section, 'hero');
  assert.equal(h.cta_name, 'Get Started | Hero');
});

test('plain http signup links are counted and upgraded to https', (t) => {
  const [p] = clickIn(t, '/blog/some-post', '<section class="section_blog-article"><a>Find a dietitian</a></section>', 'a', 'http://signup.nourish.com/');
  assert.equal(p.cta_id, 'patient-signup-article');
  assert.ok(p.url.startsWith('https://signup.nourish.com/'), p.url);
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

test('Webflow Button component with blank placeholders falls back to its section mapping', (t) => {
  const btn = (cls) => '<section class="' + cls + '"><a data-wf--button--variant="grey" data-cta-location="" data-cta-action="" data-cta-id="" data-cta-name="">Find a dietitian</a></section>';
  const [p] = clickIn(t, '/blog/some-post', btn('section_blog-article'), 'a', 'http://signup.nourish.com/');
  assert.equal(p.cta_mapping_status, 'reviewed-migration');
  assert.equal(p.cta_id, 'patient-signup-article');
});

test('a blog article button reusing #home-filter-cta is reported as the article CTA', (t) => {
  const [p] = clickIn(t, '/blog/some-post', '<section class="section_blog-article"><a id="home-filter-cta">x</a></section>', 'a');
  assert.equal(p.cta_id, 'patient-signup-article');
});
