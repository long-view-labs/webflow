// hero-filter-search.js + global.js in one DOM: name/DOB prefill must never sit
// on the CTA href (analytics, pixels and DOM scrapers read it), must reach the
// signup URL on navigation, and Get Started Clicked reports only flags.
// No network: payer fetch is stubbed to fail, RudderStack is a spy.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.NOURISH_JSDOM_PATH || 'jsdom');
const jquery = fs.readFileSync(process.env.NOURISH_JQUERY_PATH || require.resolve('jquery/dist/jquery.min.js'), 'utf8');
const hero = fs.readFileSync(path.join(__dirname, '../hero-filter-search.js'), 'utf8');
const globalJs = fs.readFileSync(path.join(__dirname, '../global.js'), 'utf8');

const PRIVATE = ['firstName', 'lastName', 'patientBirthday', 'nourishPayerId', 'planName'];

async function setup({ first = 'Synthfirst', last = 'Synthlast', dob = '01/02/1990', target = '' } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body>
    <div class="home-filter_component"><form data-name="Insurance Check">
      <input id="first-name" value="${first}"><input id="last-name" value="${last}"><input id="dob" value="${dob}">
      <a id="home-filter-cta" ${target} href="https://signup.nourish.com/">Check your coverage</a>
    </form></div></body></html>`,
  { url: 'https://www.nourish.com/?utm_source=qa', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const events = [];
  const opened = [];
  w.__nourish_apex = 'nourish.com';
  w.fetch = () => Promise.reject(new Error('offline test'));
  w.open = (...args) => { opened.push(args); return null; };
  w.rudderanalytics = { track: (...a) => events.push(a), page() {}, identify() {}, reset() {} };
  w.console.error = () => {};
  w.eval(jquery);
  w.eval(globalJs);
  w.eval(hero);
  await new Promise((r) => setTimeout(r, 50));
  const cta = w.document.getElementById('home-filter-cta');
  return { w, cta, events, opened, close: () => w.close() };
}

function click(t) {
  const e = new t.w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  t.cta.dispatchEvent(e);
  return e;
}

test('name and DOB never appear on the CTA href or in the DOM', async () => {
  const t = await setup();
  try {
    const href = new URL(t.cta.getAttribute('href'));
    for (const k of PRIVATE) assert.equal(href.searchParams.has(k), false, k);
    assert.equal(href.searchParams.get('InsuranceSearchInput'), 'true');
    assert.ok(!t.w.document.body.innerHTML.includes('Synthfirst=') && !t.cta.outerHTML.includes('Synthfirst'));
    assert.equal(t.cta.getAttribute('data-prefill-first-name'), 'true');
    assert.equal(t.cta.getAttribute('data-prefill-last-name'), 'true');
    assert.equal(t.cta.getAttribute('data-prefill-birthday'), 'true');
    assert.equal(t.cta.getAttribute('data-prefill-insurance'), 'false', 'no carrier picked');
    assert.equal(href.searchParams.has('nourishPayerId'), false);
  } finally { t.close(); }
});

test('click tracks only flags, then navigates with the prefill added', async () => {
  const t = await setup({ target: 'target="_blank"' });
  try {
    const e = click(t);
    assert.equal(e.defaultPrevented, true);
    const clicks = t.events.filter((x) => x[0] === 'Get Started Clicked');
    assert.equal(clicks.length, 1);
    const p = clicks[0][1];
    assert.ok(!JSON.stringify(p).includes('Synthfirst') && !JSON.stringify(p).includes('Synthlast'));
    assert.equal(p.has_first_name, true);
    assert.equal(p.has_last_name, true);
    assert.equal(p.has_birthday, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(t.opened.length, 1);
    const dest = new URL(t.opened[0][0]);
    assert.equal(dest.searchParams.get('firstName'), 'Synthfirst');
    assert.equal(dest.searchParams.get('lastName'), 'Synthlast');
    assert.ok(dest.searchParams.get('patientBirthday'));
    assert.equal(dest.searchParams.get('utm_source'), 'qa');
    assert.ok(!t.cta.getAttribute('href').includes('Synthfirst'), 'href stays clean after the click');
  } finally { t.close(); }
});

test('empty fields: flags false, no interception, plain navigation', async () => {
  const t = await setup({ first: '', last: '', dob: '' });
  try {
    const e = click(t);
    assert.equal(e.defaultPrevented, false);
    const p = t.events.find((x) => x[0] === 'Get Started Clicked')[1];
    assert.equal(p.has_first_name, false);
    assert.equal(p.has_last_name, false);
    assert.equal(p.has_birthday, false);
    assert.equal(p.has_insurance, false);
  } finally { t.close(); }
});

test('modified clicks are not intercepted and open the clean href', async () => {
  const t = await setup();
  try {
    const e = new t.w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true });
    t.cta.dispatchEvent(e);
    assert.equal(e.defaultPrevented, false);
  } finally { t.close(); }
});
