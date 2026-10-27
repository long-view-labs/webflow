const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { missingMarkers, mergeInto, pinFailures, clickEventFailures, MARKERS } = require('../monitoring/utm-handoff-check');

const withMarkers = 'https://signup.nourish.com/?' + new URLSearchParams(MARKERS);

test('a link with every marker passes', () => {
  assert.deepEqual(missingMarkers(withMarkers), { missing: [], preexisting: [] });
});

test('each dropped marker is reported', () => {
  for (const key of Object.keys(MARKERS)) {
    const u = new URL(withMarkers); u.searchParams.delete(key);
    assert.deepEqual(missingMarkers(u.href).missing, [key]);
  }
});

test('an authored value on the link is kept and noted, not failed', () => {
  const u = new URL(withMarkers); u.searchParams.set('utm_source', 'employer');
  assert.deepEqual(missingMarkers(u.href), { missing: [], preexisting: ['utm_source=employer'] });
});

test('an unparseable href fails every marker', () => {
  assert.deepEqual(missingMarkers('http://[bad').missing, Object.keys(MARKERS));
});

test('UTM failures are appended to the main monitor report the alert reads', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'utm-')), 'monitoring-results.json');
  fs.writeFileSync(file, JSON.stringify({ failures: ['existing'], cases: [1] }));
  mergeInto(file, { checkedAt: 'now', failures: ['UTM handoff desktop /: link missing gclid'], cases: [1, 2] });
  const merged = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(merged.failures, ['existing', 'UTM handoff desktop /: link missing gclid']);
  assert.equal(merged.utmHandoff.failures, 1);
});

test('a released global.js tag pin passes; a draft commit or branch pin fails', () => {
  const html = ref => '<script src="https://cdn.jsdelivr.net/gh/long-view-labs/webflow@' + ref + '/global.js"></script>';
  assert.deepEqual(pinFailures(html('v2.622.6')), []);
  assert.deepEqual(pinFailures(html('cf76182')), ['production global.js pinned to unreleased ref cf76182']);
  assert.deepEqual(pinFailures(html('codex/nourish-cta-staging')), ['production global.js pinned to unreleased ref codex/nourish-cta-staging']);
  assert.deepEqual(pinFailures('<html></html>'), ['production HTML has no long-view-labs/webflow global.js pin']);
});

test('a click event passes only with the markers as properties and in url', () => {
  const url = 'https://signup.nourish.com/?' + new URLSearchParams(MARKERS);
  assert.deepEqual(clickEventFailures({ event: 'Get Started Clicked', properties: { ...MARKERS, url } }), []);
});

test('the Oct 23-27 draft build (no UTM properties, bare url) fails both checks', () => {
  const failures = clickEventFailures({ event: 'Get Started Clicked', properties: { url: 'https://signup.nourish.com/' } });
  assert.equal(failures.length, 2);
  assert.match(failures[0], /event missing utm_source,utm_medium,utm_campaign,gclid/);
  assert.match(failures[1], /event url missing utm_source/);
});

test('2.622.0-2.622.4 (properties present, url trimmed to origin + path) fails the url check', () => {
  const failures = clickEventFailures({ event: 'Get Started Clicked', properties: { ...MARKERS, url: 'https://signup.nourish.com/' } });
  assert.deepEqual(failures, ['Get Started Clicked event url missing utm_source,utm_medium,utm_campaign,gclid']);
});
