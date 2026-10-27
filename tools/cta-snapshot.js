// Read-only expression for the existing browser task on a marketing preview.
// It does not click, navigate, fetch, change the DOM, or read form-field values.
(async () => {
  const siteId = '699ce714348d0db6b6640eaf';
  const path = location.pathname;
  if (document.documentElement.getAttribute('data-wf-site') !== siteId ||
      !['www.nourish.com', 'nourish.com', 'nourish-2-23.webflow.io'].includes(location.hostname) ||
      /^\/dietitian-application(?:\/|$)/i.test(path)) {
    return { status: 'blocked_scope', reason: 'Use a verified Nourish marketing preview; do not visit the application page for this audit.' };
  }
  const selectors = ['[data-cta="nav"]', '.nav_component-2 a', '.footer-wrap a',
    '#home-filter-cta', '#provider-filter-cta', '.logos_home-wrap a',
    '.program-slider_component a', '.sticky-phone_content a', '[data-cta="hero cta"]'];
  const fields = ['id', 'name', 'location', 'section', 'action', 'version'];
  const candidates = [...document.querySelectorAll('a[href],button,[role="button"],input[type="submit"]')];
  const ids = new Map();
  for (const node of document.querySelectorAll('[id]')) ids.set(node.id, (ids.get(node.id) || 0) + 1);
  function locator(node) {
    const parts = [];
    while (node && node.nodeType === 1 && parts.length < 8) {
      const tag = node.tagName.toLowerCase();
      const siblings = node.parentElement ? [...node.parentElement.children].filter(x => x.tagName === node.tagName) : [];
      parts.unshift(tag + (siblings.length > 1 ? ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')' : ''));
      node = node.parentElement;
    }
    return parts.join(' > '); // Audit locator only, never an analytics identity.
  }
  const items = [];
  for (const node of candidates.slice(0, 10000)) {
    const raw = (node.getAttribute('href') || '').trim();
    let url = null;
    try { url = raw ? new URL(raw, location.origin) : null; } catch (_) {}
    const style = getComputedStyle(node);
    const target = node.tagName === 'A' ? node : null;
    const context = node.closest('nav,footer,[data-component]');
    const digest = crypto.subtle ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)) : null;
    items.push({
      locator: locator(node), tag: node.tagName.toLowerCase(), dom_id: node.id || null,
      duplicate_dom_id_count: node.id ? ids.get(node.id) : 0,
      label: (node.textContent || node.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 160),
      href: url && ['http:', 'https:'].includes(url.protocol) ? url.origin + url.pathname : null,
      href_scheme: url ? url.protocol : null, fragment_only: raw.startsWith('#'),
      has_credentials: !!(url && (url.username || url.password)),
      query_parameter_names: url ? [...new Set(url.searchParams.keys())] : [],
      hash_present: !!(url && url.hash),
      href_sha256: digest ? [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('') : null,
      attributes: Object.fromEntries(fields.map(key => ['data-cta-' + key, node.getAttribute('data-cta-' + key)])),
      legacy_data_cta: node.getAttribute('data-cta'),
      experiment_variant: node.getAttribute('data-experiment-variant'),
      visible: style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0,
      component_hint: context ? (context.getAttribute('data-component') || context.tagName.toLowerCase()) : null,
      migration_matches: target ? selectors.filter(selector => target.matches(selector)) : [],
    });
  }
  return {
    status: 'snapshot', site_id: siteId,
    page_id: document.documentElement.getAttribute('data-wf-page'), page_path: path,
    origin: location.origin, captured_at: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight }, state: 'default-unconfirmed',
    owned_scripts: [...document.querySelectorAll('script[src]')].map(node => {
      try { const u = new URL(node.src, location.origin); return /long-view-labs\/webflow/.test(u.pathname) ? u.origin + u.pathname : null; }
      catch (_) { return null; }
    }).filter(Boolean),
    page_version: document.documentElement.getAttribute('data-page-version') ?? document.body?.getAttribute('data-page-version') ?? null,
    candidate_count: candidates.length, truncated: candidates.length > items.length, items,
    limitations: ['DOM snapshot only; does not verify other breakpoints, conditional states, component bindings, SDK delivery or charts.'],
  };
})();
