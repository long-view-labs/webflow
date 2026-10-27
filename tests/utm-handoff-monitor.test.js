const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { missingMarkers, mergeInto, MARKERS } = require('../monitoring/utm-handoff-check');

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
