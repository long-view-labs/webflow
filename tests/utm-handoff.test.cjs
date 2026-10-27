// UTM handoff contract: campaign and click IDs on the landing URL must reach
// every signup link, iframe and click-time destination, and persist for the
// session. Full global.js in isolated JSDOM; nothing is fetched or sent.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.NOURISH_JSDOM_PATH || 'jsdom');
const jquery = fs.readFileSync(process.env.NOURISH_JQUERY_PATH || require.resolve('jquery/dist/jquery.min.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../global.js'), 'utf8');

const LANDING = { utm_source: 'qa_src', utm_medium: 'qa_med', utm_campaign: 'qa_camp', utm_term: 'qa term', utm_content: 'qa_content', gclid: 'qa-gclid' };
const SIGNUP_LINKS = ['https://signup.nourish.com/', 'https://signup.nourish.com/providers', 'https://signup.usenourish.com/', 'https://signup.nourish.com/flow/get-started'];

function load(t, { path: page = '/', query = LANDING, referrer = '', storage = null, body = '' } = {}) {
  const url = 'https://www.nourish.com' + page + (query ? '?' + new URLSearchParams(query) : '');
  const dom = new JSDOM('<!doctype html><html lang="en"><body>' + body + '</body></html>', { url, ...(referrer ? { referrer } : {}), runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const w = dom.window, events = [];
  if (storage) for (const [k, v] of Object.entries(storage)) w.sessionStorage.setItem(k, v);
  w.rudderanalytics = { track: (...a) => events.push(a), page() {}, identify() {}, reset() {}, setAnonymousId() {} };
  w.eval(jquery);
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return { w, events };
}
const params = href => Object.fromEntries(new URL(href).searchParams);
const settle = w => new Promise(r => w.setTimeout(r, 50));
function assertHandoff(href, expected = LANDING) {
  const got = params(href);
  for (const [k, v] of Object.entries(expected)) assert.equal(got[k], v, k + ' missing or wrong on ' + href);
}

test('every signup link receives every landing UTM and click ID', async t => {
  const { w } = load(t, { body: SIGNUP_LINKS.map(h => '<a href="' + h + '">Start</a>').join('') });
  await settle(w);
  const links = [...w.document.querySelectorAll('a')];
  assert.equal(links.length, SIGNUP_LINKS.length);
  for (const a of links) assertHandoff(a.href);
});

test('signup links added after load (CMS, filters, experiments) still receive UTMs', async t => {
  const { w } = load(t);
  const a = w.document.createElement('a');
  a.setAttribute('href', 'https://signup.nourish.com/');
  w.document.body.append(a);
  await settle(w);
  assertHandoff(a.href);
});

test('signup iframes receive UTMs', async t => {
  const { w } = load(t, { body: '<iframe src="https://signup.nourish.com/embed"></iframe>' });
  await settle(w);
  assertHandoff(w.document.querySelector('iframe').src);
});

test('the URL a click navigates to carries UTMs even if another script reset the href', async t => {
  const { w, events } = load(t, { body: '<a id="cta" data-cta="nav" href="https://signup.nourish.com/">Get started</a>' });
  await settle(w);
  const a = w.document.getElementById('cta');
  a.setAttribute('href', 'https://signup.nourish.com/');
  let destination;
  w.addEventListener('click', e => { destination = a.href; e.preventDefault(); });
  a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  assertHandoff(destination);
  const started = events.find(e => e[0] === 'Get Started Clicked');
  assert.ok(started, 'Get Started Clicked fired');
  assert.equal(started[1].utm_source, 'qa_src');
  assert.equal(started[1].gclid, 'qa-gclid');
});

test('UTMs persist to the next internal page in the same session', async t => {
  const first = load(t);
  const stored = first.w.sessionStorage.getItem('persistedUTMs');
  assert.ok(stored, 'landing UTMs were persisted');
  const { w } = load(t, { path: '/conditions/acid-reflux', query: null, referrer: 'https://www.nourish.com/',
    storage: { persistedUTMs: stored }, body: '<a href="https://signup.nourish.com/">Start</a>' });
  await settle(w);
  assertHandoff(w.document.querySelector('a').href);
});

test('a parameter already on the link is never overwritten', async t => {
  const { w } = load(t, { body: '<a href="https://signup.nourish.com/?utm_source=employer&amp;utm_campaign=genemployer">Sign up</a>' });
  await settle(w);
  const got = params(w.document.querySelector('a').href);
  assert.equal(got.utm_source, 'employer');
  assert.equal(got.utm_campaign, 'genemployer');
  assert.equal(got.utm_medium, 'qa_med');
  assert.equal(got.gclid, 'qa-gclid');
});

test('Get Started Clicked url keeps the link UTMs (UTM Passthrough Rate chart) and drops other query values', async t => {
  const { w, events } = load(t, { body: '<a id="cta" data-cta="nav" href="https://signup.nourish.com/?firstName=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE">Get started</a>' });
  await settle(w);
  const a = w.document.getElementById('cta');
  w.addEventListener('click', e => e.preventDefault());
  a.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const started = events.find(e => e[0] === 'Get Started Clicked');
  assert.ok(started, 'Get Started Clicked fired');
  const url = started[1].url;
  assert.ok(url.includes('utm_source='), 'url contains utm_source=');
  assertHandoff(url);
  assert.ok(!url.includes('SYNTHETIC_PRIVATE'), 'non-attribution query and hash are dropped');
  assert.equal(started[1].utm_source, 'qa_src', 'utm_* properties are still sent');
});
