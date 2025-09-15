(function () {
  const KEY = "persistedUTMs";
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const TARGET_HOST = "signup.usenourish.com";

  // Allow all utm_* keys plus common click IDs and im_ref
  const EXTRAS = new Set(["gclid", "fbclid", "msclkid", "ttclid", "im_ref"]);

  const now = Date.now();
  const url = new URL(window.location.href);
  const currentParams = pickAllowed(url.searchParams);
  const stored = readStored();

  // Heuristic: brand-new entry without UTMs from an external referrer → clear old UTMs
  const externalEntry =
    document.referrer && !sameHost(document.referrer, location.href);

  if (Object.keys(currentParams).length) {
    // Fresh UTMs present → start/refresh session
    saveStored({ params: currentParams, startedAt: now, lastTouch: now });
  } else if (stored) {
    // No UTMs in URL; check expiration or external entry
    const expired =
      now - (stored.lastTouch || stored.startedAt) > SESSION_TTL_MS;
    if (expired || externalEntry) {
      clearStored();
    } else {
      // Refresh lastTouch inside the same session
      stored.lastTouch = now;
      saveStored(stored);
    }
  }

  // Apply to outbound links
  const active = readStored();
  if (active && active.params && Object.keys(active.params).length) {
    applyToAllLinks(active.params);
    setupLinkObserver(active.params);
  }

  // ---------- helpers ----------
  function pickAllowed(searchParams) {
    const out = {};
    for (const [rawK, v] of searchParams.entries()) {
      if (v == null || v === "") continue;
      const lowerK = String(rawK).toLowerCase();
      const normK = lowerK.startsWith("utm-")
        ? lowerK.replace("utm-", "utm_")
        : lowerK;
      if (normK.startsWith("utm_") || EXTRAS.has(normK)) {
        out[normK] = v;
      }
    }
    return out;
  }

  function sameHost(a, b) {
    try {
      return new URL(a).host === new URL(b).host;
    } catch {
      return false;
    }
  }

  function readStored() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY));
    } catch {
      return null;
    }
  }

  function saveStored(obj) {
    sessionStorage.setItem(KEY, JSON.stringify(obj));
  }

  function clearStored() {
    sessionStorage.removeItem(KEY);
  }

  function applyParamsToLink(link, params) {
    try {
      const u = new URL(link.href, location.origin);
      if (u.host !== TARGET_HOST) return;

      // Don’t overwrite if the link already has that param
      for (const [k, v] of Object.entries(params)) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, v);
      }
      link.href = u.toString();
    } catch (_) {}
  }

  function applyToAllLinks(params) {
    document
      .querySelectorAll("a[href]")
      .forEach((a) => applyParamsToLink(a, params));
  }

  function setupLinkObserver(params) {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.tagName === "A" && node.href)
            applyParamsToLink(node, params);
          node.querySelectorAll &&
            node
              .querySelectorAll("a[href]")
              .forEach((a) => applyParamsToLink(a, params));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();
