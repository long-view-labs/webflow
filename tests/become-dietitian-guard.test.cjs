// become-dietitian.js must not throw on pages without the employee quotes grid.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require(process.env.NOURISH_JSDOM_PATH || 'jsdom');
const jquery = fs.readFileSync(process.env.NOURISH_JQUERY_PATH || require.resolve('jquery/dist/jquery.min.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '../become-dietitian.js'), 'utf8');

function load(body) {
  const dom = new JSDOM('<!doctype html><body>' + body + '</body>', { url: 'https://www.nourish.com/employers', runScripts: 'outside-only' });
  const w = dom.window, observed = [];
  w.IntersectionObserver = class { constructor() {} observe(el) { if (!(el instanceof w.Element)) throw new TypeError("parameter 1 is not of type 'Element'"); observed.push(el); } unobserve() {} };
  w.Swiper = function () { return { autoplay: { stop() {}, start() {} } }; };
  w.eval(jquery);
  w.eval(source);
  return { observed, close: () => dom.window.close() };
}

test('no quotes grid: loads without throwing and observes nothing', () => {
  const h = load('<div class="employer-hero"></div>');
  assert.equal(h.observed.length, 0);
  h.close();
});

test('quotes grid present: still observed for the lazy slider', () => {
  const h = load('<div class="employee-quotes_grid"></div>');
  assert.equal(h.observed.length, 1);
  h.close();
});
