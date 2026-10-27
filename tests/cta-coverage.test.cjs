const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classify, inspect, build } = require('../tools/cta-coverage.cjs');
const attrs = { 'data-cta-id': 'patient-signup-nav', 'data-cta-name': 'Start signup | nav',
  'data-cta-location': 'nav', 'data-cta-section': 'navigation', 'data-cta-action': 'direct-signup', 'data-cta-version': '1' };
const item = { tag: 'a', href: 'https://signup.nourish.com/', href_scheme: 'https:', attributes: attrs, migration_matches: [], locator: 'nav > a', visible: true };
const snapshot = { status: 'snapshot', site_id: '699ce714348d0db6b6640eaf', page_path: '/', page_id: 'home',
  viewport: { width: 1440, height: 900 }, state: 'default', captured_at: '2026-10-27T00:00:00Z', items: [item] };
const inventory = { site_id: snapshot.site_id, discovery_complete: true, pages: [{ path: '/' }], required_views: [{ path: '/', width: 1440, state: 'default' }] };

test('signup and signup-directory links both count as Get Started Clicked; internal /find-a-provider is not tracked', () => {
  assert.equal(inspect(item, snapshot).event, 'Get Started Clicked');
  const directory = { ...item, href: 'https://signup.nourish.com/providers', attributes: { ...attrs, 'data-cta-id': 'patient-directory-nav', 'data-cta-action': 'directory-navigation' } };
  assert.equal(inspect(directory, snapshot).event, 'Get Started Clicked');
  assert.equal(classify({ ...item, href: 'https://www.nourish.com/find-a-provider' }).action, null);
});
test('credentials, alternate ports and privacy destinations are not approved signup conversions', () => {
  for (const bad of [{ ...item, has_credentials: true }, { ...item, href: 'https://user:password@signup.nourish.com/' }, { ...item, href: 'https://signup.nourish.com:444/' }, { ...item, href: 'https://signup.nourish.com/your-privacy-choices' }]) assert.equal(classify(bad).action, null);
});
test('partial metadata is a coverage gap and never a valid explicit contract', () => {
  const partial = { ...item, attributes: { ...attrs, 'data-cta-id': '' } };
  assert.equal(inspect(partial, snapshot).status, 'invalid_partial_or_mismatched_contract');
  assert.equal(inspect(partial, snapshot).event, 'Get Started Clicked');
  assert.equal(build(inventory, [{ ...snapshot, items: [partial] }]).authoring_inventory_complete, false);
});
test('unannotated conversions remain visible as authoring gaps', () => {
  const unannotated = { ...item, attributes: {}, migration_matches: ['[data-cta="nav"]'] };
  const report = build(inventory, [{ ...snapshot, items: [unannotated] }]);
  assert.equal(report.rows[0].expected_event, 'Get Started Clicked');
  assert.equal(report.authoring_inventory_complete, false);
});
test('missing pages, viewport/conditional variants, truncation and incomplete discovery block completeness', () => {
  assert.equal(build({ ...inventory, pages: [...inventory.pages, { path: '/missing' }] }, [snapshot]).authoring_inventory_complete, false);
  assert.equal(build({ ...inventory, required_views: [...inventory.required_views, { path: '/', width: 375, state: 'mobile-menu-open' }] }, [snapshot]).authoring_inventory_complete, false);
  assert.equal(build(inventory, [{ ...snapshot, truncated: true }]).authoring_inventory_complete, false);
  assert.equal(build({ ...inventory, discovery_complete: false }, [snapshot]).authoring_inventory_complete, false);
  assert.equal(build({ ...inventory, pages: [], required_views: [] }, []).authoring_inventory_complete, false);
});
test('internal non-sitemap destinations become discovery gaps without navigation', () => {
  const report = build(inventory, [{ ...snapshot, items: [{ ...item, href: 'https://www.nourish.com/contact' }] }]);
  assert.ok(report.discovered_internal_paths.includes('/contact'));
  assert.ok(report.rows.some(r => r.coverage_status === 'discovered_link_not_catalogued'));
  assert.equal(report.authoring_inventory_complete, false);
});
test('complete authoring snapshots still cannot assert live analytics acceptance', () => {
  const report = build(inventory, [snapshot]);
  assert.equal(report.authoring_inventory_complete, true);
  assert.equal(report.live_acceptance_complete, false);
  assert.equal(report.rows[0].receipt, 'unverified');
  const privateHref = build(inventory, [{ ...snapshot, items: [{ ...item, href: item.href + '?email=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE' }] }]);
  assert.equal(privateHref.rows[0].destination, item.href);
  assert.ok(!JSON.stringify(privateHref).includes('SYNTHETIC_PRIVATE'));
});
test('shared semantic CTA IDs survive separate pages without synthetic page-derived IDs', () => {
  const report = build({ ...inventory, pages: [{ path: '/' }, { path: '/blog/article' }] }, [snapshot, { ...snapshot, page_path: '/blog/article' }]);
  assert.equal(report.rows.length, 2);
  assert.equal(JSON.parse(report.rows[0].metadata)['data-cta-id'], JSON.parse(report.rows[1].metadata)['data-cta-id']);
});
test('enterprise/contact candidates and non-anchor controls stay explicit review gaps without invented events', () => {
  assert.equal(classify({ ...item, href: 'https://www.nourish.com/contact' }).category, 'enterprise_contact_candidate');
  assert.equal(inspect({ ...item, href: 'https://www.nourish.com/contact' }, snapshot).event, null);
  assert.equal(inspect({ ...item, tag: 'button' }, snapshot).status, 'unsupported_element_requires_review');
});

test('browser collector is read-only, omits query/form values and blocks application/wrong-site documents', async () => {
  const { JSDOM } = require(process.env.NOURISH_JSDOM_PATH || 'jsdom');
  const collector = fs.readFileSync(path.join(__dirname, '../tools/cta-snapshot.js'), 'utf8');
  async function collect(url, site = snapshot.site_id) {
    const dom = new JSDOM('<html data-wf-site="' + site + '"><body><nav><a data-cta="nav" href="https://signup.nourish.com/?email=SYNTHETIC_PRIVATE#SYNTHETIC_PRIVATE">Start</a></nav><input value="SYNTHETIC_FORM_PRIVATE"><script src="https://cdn.jsdelivr.net/gh/long-view-labs/webflow@fixture/global.js?token=SYNTHETIC_PRIVATE"></script></body></html>', { url, runScripts: 'outside-only' });
    const w = dom.window;
    Object.defineProperty(w, 'crypto', { value: require('node:crypto').webcrypto });
    w.TextEncoder = TextEncoder;
    const before = w.document.documentElement.outerHTML;
    const result = await w.eval(collector);
    assert.equal(w.document.documentElement.outerHTML, before);
    w.close();
    return result;
  }
  const result = await collect('https://www.nourish.com/');
  assert.equal(result.status, 'snapshot');
  assert.equal(result.items[0].href, 'https://signup.nourish.com/');
  assert.equal(result.items[0].href_sha256.length, 64);
  assert.equal(result.owned_scripts[0], 'https://cdn.jsdelivr.net/gh/long-view-labs/webflow@fixture/global.js');
  assert.ok(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE'));
  assert.ok(!JSON.stringify(result).includes('SYNTHETIC_FORM_PRIVATE'));
  assert.equal((await collect('https://www.nourish.com/dietitian-application')).status, 'blocked_scope');
  assert.equal((await collect('https://www.nourish.com/', 'wrong-site')).status, 'blocked_scope');
});
