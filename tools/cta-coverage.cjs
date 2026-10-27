// Offline coverage ledger. Inputs are explicit inventories and read-only snapshots.
// No URL fetching, browser navigation, analytics delivery, or source mutation.
const fs = require('node:fs');
const path = require('node:path');
const handoff = require('../cta-browser-handoff.json');
const token = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const revision = /^[A-Za-z0-9._-]{1,64}$/;
const locations = ['nav', 'hero', 'content', 'footer', 'sticky_bar', 'modal'];
const fields = ['id', 'name', 'location', 'section', 'action', 'version'];
const events = { 'direct-signup': 'Get Started Clicked', 'directory-navigation': 'Get Started Clicked', 'apply-dietitian': 'Dietitian Apply Clicked' };

function classify(item) {
  if (item.fragment_only) return { category: 'non_conversion', action: null };
  if (item.href_scheme === 'mailto:' || item.href_scheme === 'tel:') return { category: 'contact_link', action: null };
  let u;
  try { u = new URL(item.href); } catch (_) { return { category: 'unclassified_action', action: null }; }
  if (item.has_credentials || u.username || u.password) return { category: 'unreviewed_destination', action: null };
  const signup = ['signup.nourish.com', 'signup.usenourish.com'].includes(u.hostname);
  const normalized = u.pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (signup) {
    if (u.protocol !== 'https:' || u.port) return { category: 'unreviewed_destination', action: null };
    if (normalized === '/') return { category: 'direct_signup', action: 'direct-signup' };
    if (normalized === '/providers') return { category: 'directory', action: 'directory-navigation' };
    return { category: /^\/(?:settings|your-privacy-choices)/.test(normalized) ? 'privacy_settings' : 'unreviewed_destination', action: null };
  }
  if (['www.nourish.com', 'nourish.com', 'nourish-2-23.webflow.io'].includes(u.hostname)) {
    if (normalized === '/dietitian-application' || normalized === '/become-a-dietitian/pay-calculator') return { category: 'dietitian_application', action: 'apply-dietitian' };
    if (/^\/(?:contact|contact-us|book-a-demo|request-demo)(?:\/|$)/.test(normalized)) return { category: 'enterprise_contact_candidate', action: null };
    if (/^\/(?:blog|about|legal|privacy|terms)(?:\/|$)/.test(normalized)) return { category: 'non_conversion', action: null };
  }
  return { category: 'unclassified_link', action: null };
}

function inspect(item, snapshot) {
  const result = classify(item), attrs = item.attributes || {};
  let status = 'manual_classification_required', event = null;
  const authored = fields.some(key => attrs['data-cta-' + key] != null);
  if (item.tag !== 'a') status = 'unsupported_element_requires_review';
  else if (result.action && result.action !== 'apply-dietitian') {
    if (authored) {
      const get = key => attrs['data-cta-' + key];
      const valid = token.test(get('id') || '') && !!get('name')?.trim() && get('name').length <= 120 &&
        locations.includes(get('location')) && token.test(get('section') || '') &&
        get('action') === result.action && revision.test(get('version') || '');
      status = valid ? 'valid_explicit_contract' : 'invalid_partial_or_mismatched_contract';
      // Runtime still counts invalid contracts, under the unmapped identity.
      event = events[result.action];
    } else {
      const mapping = handoff.patient_rows.find(row => (item.migration_matches || []).includes(row.selector) && (!row.page || row.page === snapshot.page_path));
      status = mapping ? 'reviewed_migration_requires_browser_readback' : 'unmapped_conversion_requires_authoring';
      event = events[result.action];
    }
  } else if (result.action === 'apply-dietitian') {
    const id = attrs['data-cta-id'];
    const valid = snapshot.page_path.toLowerCase().replace(/\/$/, '') === '/become-a-dietitian' &&
      attrs['data-cta-action'] === 'apply-dietitian' && handoff.dietitian_rows.some(row => row.attributes_to_preserve['data-cta-id'] === id) &&
      ['hero', 'earnings', 'platform', 'footer'].includes(attrs['data-cta-location']) &&
      /^[A-Za-z0-9 .,&'()/_-]{1,120}$/.test((attrs['data-cta-name'] || '').trim().replace(/\s+/g, ' ')) &&
      (attrs['data-cta-section'] == null || token.test(attrs['data-cta-section'])) &&
      (attrs['data-cta-version'] == null || revision.test(attrs['data-cta-version']));
    status = valid ? 'valid_existing_dietitian_contract' : 'dietitian_scope_or_metadata_requires_review';
    if (valid) event = events[result.action];
  } else if (['privacy_settings', 'non_conversion'].includes(result.category)) status = 'excluded_from_patient_conversion_events';
  return { ...result, event, status };
}

function build(inventory, snapshots) {
  if (inventory.site_id !== '699ce714348d0db6b6640eaf') throw Error('Unverified site identity');
  const rows = [];
  for (const snapshot of snapshots) {
    if (snapshot.site_id !== inventory.site_id || snapshot.status !== 'snapshot') throw Error('Invalid snapshot scope');
    for (const item of snapshot.items) {
      const check = inspect(item, snapshot);
      rows.push({ page_path: snapshot.page_path, page_id: snapshot.page_id || '',
        viewport: snapshot.viewport.width + 'x' + snapshot.viewport.height, condition: snapshot.state,
        locator: item.locator, component_hint: item.component_hint || '', tag: item.tag,
        dom_id: item.dom_id || '', link_text: item.label || '', page_version: snapshot.page_version || '',
        ...Object.fromEntries(fields.map(key => ['cta_' + key, (item.attributes || {})['data-cta-' + key] ?? ''])),
        destination: safeDestination(item.href), category: check.category, expected_event: check.event || '',
        coverage_status: check.status, metadata: JSON.stringify(item.attributes || {}),
        href_sha256: item.href_sha256 || '', query_parameter_names: JSON.stringify(item.query_parameter_names || []),
        experiment_variant: item.experiment_variant || '',
        duplicate_dom_id_count: item.duplicate_dom_id_count || 0,
        visible: item.visible, receipt: 'unverified', chart_coverage: 'parent_inventory_pending',
        consent: 'Existing SDK/OneTrust owner; live denied/granted behavior unverified',
        evidence: snapshot.captured_at, truncated_snapshot: !!snapshot.truncated });
    }
  }
  const seen = new Set(snapshots.map(s => s.page_path));
  const discovered = new Set();
  for (const snapshot of snapshots) for (const item of snapshot.items) {
    try {
      const u = new URL(item.href);
      if (['www.nourish.com', 'nourish.com', 'nourish-2-23.webflow.io'].includes(u.hostname) &&
          !/\.(?:pdf|png|jpe?g|webp|svg|avif|css|js|zip|mp4)$/i.test(u.pathname)) discovered.add(u.pathname);
    } catch (_) {}
  }
  const catalogued = new Set((inventory.pages || []).map(p => p.path));
  const unknown = [...discovered].filter(p => !seen.has(p) && !catalogued.has(p));
  for (const page of unknown) rows.push({ page_path: page, category: 'discovered_internal_link',
    coverage_status: 'discovered_link_not_catalogued', receipt: 'unverified', evidence: 'Observed in a snapshot; no navigation performed.' });
  for (const page of inventory.pages || []) if (!seen.has(page.path)) rows.push({
    page_path: page.path, page_id: page.id || '', category: page.kind || 'discovered_page',
    coverage_status: 'snapshot_missing', receipt: 'unverified', evidence: page.source || inventory.source,
  });
  for (const gap of inventory.catalogue_gaps || []) rows.push({
    page_path: gap.path || '', component_hint: gap.name, category: gap.kind,
    coverage_status: 'catalogue_identity_or_access_missing', receipt: 'unverified', evidence: gap.reason,
  });
  const complete = inventory.discovery_complete === true && (inventory.pages || []).length > 0 && snapshots.length > 0 &&
    (inventory.required_views || []).length > 0 && snapshots.every(s => !s.truncated) &&
    !(inventory.required_views || []).some(v => !snapshots.some(s => s.page_path === v.path && s.viewport.width === v.width && s.state === v.state)) &&
    !rows.some(r => ['snapshot_missing', 'manual_classification_required', 'unsupported_element_requires_review',
      'invalid_partial_or_mismatched_contract', 'reviewed_migration_requires_browser_readback',
      'unmapped_conversion_requires_authoring', 'catalogue_identity_or_access_missing', 'discovered_link_not_catalogued',
      'dietitian_scope_or_metadata_requires_review'].includes(r.coverage_status));
  return { site_id: inventory.site_id, discovery_complete: inventory.discovery_complete === true,
    source_snapshots: snapshots.map(s => ({ page_path: s.page_path, page_id: s.page_id,
      viewport: s.viewport, condition: s.state, owned_scripts: s.owned_scripts || [], captured_at: s.captured_at })),
    snapshot_count: snapshots.length, discovered_internal_paths: [...discovered].sort(), rows, authoring_inventory_complete: complete,
    live_acceptance_complete: false,
    warning: 'Completeness requires the authorized static/CMS/component inventory, all required viewport/conditional snapshots, and resolution of every review row. Receipt and chart gates remain separate.' };
}

function safeDestination(href) {
  try { const u = new URL(href); return ['http:', 'https:'].includes(u.protocol) ? u.origin + u.pathname : ''; }
  catch (_) { return ''; }
}

function csv(rows) {
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
  const quote = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  return [keys.map(quote).join(','), ...rows.map(row => keys.map(k => quote(row[k])).join(','))].join('\n') + '\n';
}
if (require.main === module) {
  const [inventoryPath, snapshotDirectory, outputDirectory] = process.argv.slice(2);
  if (!outputDirectory) throw Error('Usage: node tools/cta-coverage.cjs INVENTORY_JSON SNAPSHOT_DIRECTORY OUTPUT_DIRECTORY');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const snapshots = fs.readdirSync(snapshotDirectory).filter(n => n.endsWith('.json')).sort().map(n => JSON.parse(fs.readFileSync(path.join(snapshotDirectory, n), 'utf8')));
  const report = build(inventory, snapshots);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, 'coverage.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(outputDirectory, 'coverage.csv'), csv(report.rows));
  console.log(JSON.stringify({ rows: report.rows.length, snapshots: report.snapshot_count, authoring_inventory_complete: report.authoring_inventory_complete, live_acceptance_complete: false }));
}
module.exports = { classify, inspect, build };
