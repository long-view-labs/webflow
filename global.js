// ============================================================================
// GLOBAL.JS — site-wide utility library for the Nourish Webflow site
// ----------------------------------------------------------------------------
// Served from GitHub via jsDelivr (version-pinned in the global footer stub)
// and loaded with `defer` on every page. jQuery is available by the time this
// runs (Webflow loads it synchronously earlier in the page).
//
// SECTION MAP (top-level blocks run in this order — do not reorder; later
// sections read globals set by earlier ones, e.g. __nourish_apex):
//   1. DOMAIN DETECTION        sets window.__nourish_apex (everything uses it)
//   2. SCRIPT LOADING UTILS    legacy [data-script-src] lazy loader  ⚠ likely dead
//   3. (dead) CONVERT LOADER   no-op scroll listener                 ⚠ safe to delete
//   4. MENU/NAV UTILITIES      state-link ?state= suffixer
//   5. UTM TRACKING            capture/persist/inject UTMs (the big one)
//   6. ANALYTICS ENRICHMENT    injects UTMs into RudderStack track/page calls
//   7. SEO/DOM UTILITIES       canonical for pagination, hidden-element cleanup
//   8. GET STARTED TRACKING    signup click tracking + link param injection,
//                              plus "Dietitian Apply Clicked" on /become-a-dietitian
// ============================================================================

// ============================================================================
// 1. DOMAIN DETECTION (nourish.com / usenourish.com dual-domain support)
// ----------------------------------------------------------------------------
// Sets window.__nourish_apex, which nearly every other block (and the footer
// stub's RudderStack snippet) reads. NOTE: the footer stub also has an inline
// copy of this logic because it must run before this deferred file loads.
// ============================================================================
(function () {
  var h = window.location.hostname;
  // Check usenourish.com first since it also contains "nourish.com"
  var apex = h.includes("usenourish.com")
    ? "usenourish.com"
    : h.includes("nourish.com")
      ? "nourish.com"
      : "usenourish.com";
  window.__nourish_apex = apex;
})();

// ============================================================================
// 2. SCRIPT LOADING UTILITIES — legacy [data-script-src] lazy loader
// ----------------------------------------------------------------------------
// Loads a script when an element carrying a `data-script-src` attribute
// scrolls into view. Includes a special case for swiper@8 that calls
// initializeSwiper() — a function that is NOT DEFINED anywhere in this file
// or the footer, so that callback would throw if it ever ran.
//
// ⚠ REMOVAL CANDIDATE: no [data-script-src] attributes were found on the
// homepage or sampled pages (Aug 2026 audit), and the site now loads swiper@12
// globally from the head. Before deleting, search the Webflow Designer for
// any embed/element using data-script-src. If none exist, delete this whole
// section including the scroll listeners below.
// ============================================================================

/**
 * Load a script dynamically
 * @param {string} src - Script source URL
 * @param {function} callback - Optional callback function
 */
function loadScript(src, callback) {
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.onload = function () {
    if (typeof callback === "function") {
      callback();
    }
  };
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

/**
 * Load a script when an element comes into viewport
 * @param {string} src - Script source URL
 * @param {Element} element - Element to watch for viewport entry
 * @param {function} callback - Optional callback function
 */
function loadScriptOnScroll(src, element, callback) {
  if (!src) {
    return; // Exit the function if the src is not valid
  }

  var script = document.createElement("script");
  script.type = "text/javascript";
  script.onload = function () {
    if (element) {
      element.setAttribute("data-script-loaded", "true");
    }
    if (typeof callback === "function") {
      callback();
    }
  };
  script.onerror = function () {
    return;
  };
  script.src = src;
  script.async = true;
  document.head.appendChild(script);

  window.addEventListener("scroll", function onScroll() {
    var position = element.getBoundingClientRect().top;
    var pageOffset =
      window.innerHeight || document.documentElement.clientHeight;

    if (position <= pageOffset && !element.hasAttribute("data-script-loaded")) {
      loadScriptOnScroll(
        element.getAttribute("data-script-src"),
        element,
        callback,
      );
      window.removeEventListener("scroll", onScroll);
    }
  });
}

// Register the scroll event listener for lazy script loading
window.addEventListener("scroll", function onScroll() {
  // Select all elements that have a 'data-script-src' attribute
  var elements = document.querySelectorAll(
    "[data-script-src]:not([data-script-loaded])",
  );

  elements.forEach(function (element) {
    var position = element.getBoundingClientRect().top;
    var pageOffset =
      window.innerHeight || document.documentElement.clientHeight;

    // If the element is in the viewport and the script has not been loaded yet
    if (position <= pageOffset && !element.hasAttribute("data-script-loaded")) {
      loadScriptOnScroll(
        element.getAttribute("data-script-src"),
        element,
        function () {
          if (
            element.getAttribute("data-script-src") ===
            "https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js"
          ) {
            initializeSwiper();
          }
        },
      );
    }
  });
});

// ============================================================================
// 3. (DEAD CODE) CONVERT SCRIPT LOADER
// ----------------------------------------------------------------------------
// ⚠ SAFE TO DELETE: this listener adds itself and removes itself without
// doing anything. The Convert.com script it used to load was removed at some
// point but the empty husk stayed behind.
// ============================================================================
window.addEventListener("scroll", function onFirstScroll() {
  window.removeEventListener("scroll", onFirstScroll);
});

// ============================================================================
// 4. MENU AND NAVIGATION UTILITIES
// ----------------------------------------------------------------------------
// Appends ?state=<name> to the state links in the nav's "Find a dietitian by
// state" menu, reading the state name from the adjacent .menu_slug element.
// Runs immediately (not on DOMContentLoaded): safe because this file is
// deferred, so the nav markup is already parsed.
// ============================================================================

// Iterate over each .menu_slug element (For the States links)
$(".menu_slug").each(function () {
  // Get the state text from the current .menu_slug element
  var state = $(this).text();
  // Find the previous sibling's 'a' element and update its 'href'
  $(this)
    .prev("a")
    .attr("href", function (i, href) {
      // Append '?state=' and the state text to the current href value
      return href + "?state=" + state;
    });
});

// ============================================================================
// 5. UTM PARAMETER TRACKING AND PERSISTENCE
// ----------------------------------------------------------------------------
// The attribution backbone. Captures utm_*/gclid/fbclid/etc. from the URL,
// persists them in sessionStorage (30-min sessions) + cookies, and injects
// them into every outbound link and signup iframe (including ones added to
// the DOM later, via MutationObserver).
//
// Exposes for other scripts:
//   window.NOURISH_UTM_PARAMS  — list of tracked param names
//   window.NOURISH_GET_UTMS()  — snapshot of active params
//   window.NOURISH_WITH_UTMS() — merge active params into an object
// Consumed by section 6 (RudderStack enrichment) and section 8 (Get Started).
//
// ⚠ ANALYTICS-CRITICAL: changes here affect attribution data. Get data-team
// review before modifying.
// ============================================================================

/**
 * Comprehensive UTM parameter tracking system
 * - Tracks UTM parameters across page navigation within 30-minute sessions
 * - Sets cookies for backward compatibility
 * - Automatically injects UTM parameters into all outbound links and signup iframes
 * - Clears old UTMs when coming from external referrers
 * - Supports all tracking parameters (utm_*, gclid, gbraid, gad_source, gad_campaignid, fbclid, msclkid, ttclid, oppref, im_ref, nsh_cam)
 */
(function () {
  const SESSION_KEY = "persistedUTMs";
  const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const TARGET_HOST = "signup." + window.__nourish_apex;

  // Dynamic cookie domain based on current hostname
  const getCookieDomain = () => {
    const hostname = window.location.hostname;
    if (hostname.includes("usenourish.com")) {
      return ".usenourish.com";
    } else if (hostname.includes("nourish.com")) {
      return ".nourish.com";
    } else if (hostname.includes("webflow.io")) {
      return ".usenourish.com";
    } else {
      return hostname;
    }
  };
  const COOKIE_DOMAIN = getCookieDomain();

  const DEFAULT_UTM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_creative",
    "utm_page",
  ];
  const EXTRA_TRACKING_KEYS = [
    "gclid",
    "gbraid",
    "gad_source",
    "gad_campaignid",
    "matchtype",
    "fbclid",
    "msclkid",
    "ttclid",
    "oppref",
    "im_ref",
    "nsh_cam",
  ];

  // All supported UTM and tracking parameters
  const SUPPORTED_PARAMS = new Set([
    ...DEFAULT_UTM_KEYS,
    ...EXTRA_TRACKING_KEYS,
  ]);

  // Expose supported parameters for other scripts to use
  window.NOURISH_UTM_PARAMS = Array.from(SUPPORTED_PARAMS);

  const now = Date.now();
  const url = new URL(window.location.href);
  normalizeTrackingParamsInUrl(url);
  const currentParams = extractUtmParams(url.searchParams);
  const stored = readStored();

  // Handle UTM parameter detection and storage
  if (Object.keys(currentParams).length > 0) {
    // Fresh UTMs present → start/refresh session and set cookies
    clearUtmCookies(stored && stored.params ? stored.params : null);
    saveStored({ params: currentParams, startedAt: now, lastTouch: now });
    setUtmCookies(currentParams);
  } else if (stored) {
    // No UTMs in URL; check expiration or external entry
    const externalEntry =
      document.referrer && !sameHost(document.referrer, location.href);
    const expired =
      now - (stored.lastTouch || stored.startedAt) > SESSION_TTL_MS;

    if (expired || externalEntry) {
      clearStored();
      clearUtmCookies(stored && stored.params ? stored.params : null);
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

  // ---------- Helper Functions ----------

  /**
   * Extract UTM and tracking parameters from URL search params
   * @param {URLSearchParams} searchParams - URL search parameters
   * @returns {Object} - Object containing allowed parameters
   */
  function extractUtmParams(searchParams) {
    const params = {};

    for (const [key, value] of searchParams.entries()) {
      if (!value || value === "") {
        continue;
      }

      const normalizedKey = normalizeParamKey(key);

      if (
        SUPPORTED_PARAMS.has(normalizedKey) ||
        normalizedKey.startsWith("utm_")
      ) {
        params[normalizedKey] = value;
        if (
          !SUPPORTED_PARAMS.has(normalizedKey) &&
          normalizedKey.startsWith("utm_")
        ) {
          SUPPORTED_PARAMS.add(normalizedKey);
          window.NOURISH_UTM_PARAMS = Array.from(SUPPORTED_PARAMS);
        }
      }
    }

    return params;
  }

  function normalizeTrackingParamsInUrl(url) {
    if (!url || !url.searchParams) return;
    const entries = Array.from(url.searchParams.entries());
    if (!entries.length) return;

    const trackingKeys = new Set(
      Array.from(SUPPORTED_PARAMS).map((key) => normalizeParamKey(key)),
    );
    const counts = new Map();

    entries.forEach(([key]) => {
      const normalizedKey = normalizeParamKey(key);
      if (normalizedKey.startsWith("utm_") || trackingKeys.has(normalizedKey)) {
        counts.set(normalizedKey, (counts.get(normalizedKey) || 0) + 1);
      }
    });

    const hasDuplicates = Array.from(counts.values()).some(
      (count) => count > 1,
    );
    if (!hasDuplicates) return;

    const lastIndex = new Map();
    entries.forEach(([key], index) => {
      const normalizedKey = normalizeParamKey(key);
      if (normalizedKey.startsWith("utm_") || trackingKeys.has(normalizedKey)) {
        lastIndex.set(normalizedKey, index);
      }
    });

    const normalized = new URLSearchParams();
    entries.forEach(([key, value], index) => {
      const normalizedKey = normalizeParamKey(key);
      const isTracking =
        normalizedKey.startsWith("utm_") || trackingKeys.has(normalizedKey);
      if (!isTracking) {
        normalized.append(key, value);
        return;
      }
      if (lastIndex.get(normalizedKey) !== index) return;
      if (!value) return;
      normalized.append(normalizedKey, value);
    });

    const normalizedQuery = normalized.toString();
    if (normalizedQuery === url.searchParams.toString()) return;
    url.search = normalizedQuery;
    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", url.toString());
    }
  }

  /**
   * Normalize parameter key (handle utm- vs utm_ variations)
   * @param {string} key - Original parameter key
   * @returns {string} - Normalized parameter key
   */
  function normalizeParamKey(key) {
    const lowerKey = key.toLowerCase();
    return lowerKey.startsWith("utm-")
      ? lowerKey.replace("utm-", "utm_")
      : lowerKey;
  }

  /**
   * Check if two URLs have the same host
   * @param {string} a - First URL
   * @param {string} b - Second URL
   * @returns {boolean} - True if same host
   */
  function sameHost(a, b) {
    try {
      return new URL(a).host === new URL(b).host;
    } catch {
      return false;
    }
  }

  /**
   * Read stored UTM data from sessionStorage
   * @returns {Object|null} - Stored UTM data or null
   */
  function readStored() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  }

  /**
   * Save UTM data to sessionStorage
   * @param {Object} obj - UTM data to store
   */
  function saveStored(obj) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj));
  }

  /**
   * Clear stored UTM data from sessionStorage
   */
  function clearStored() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  /**
   * Set UTM parameters as cookies
   * @param {Object} params - UTM parameters to set as cookies
   */
  function setUtmCookies(params) {
    for (const [key, value] of Object.entries(params)) {
      const cookieString = `${key}=${value}; path=/; domain=${COOKIE_DOMAIN}`;
      document.cookie = cookieString;
    }
  }

  /**
   * Clear UTM cookies
   */
  function clearUtmCookies(params) {
    const keys = new Set(SUPPORTED_PARAMS);
    if (params && typeof params === "object") {
      Object.keys(params).forEach((key) => {
        keys.add(normalizeParamKey(key));
      });
    }
    for (const param of keys) {
      document.cookie = `${param}=; path=/; domain=${COOKIE_DOMAIN}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }

  /**
   * Apply UTM parameters to a specific link
   * @param {HTMLAnchorElement} link - Link element to modify
   * @param {Object} params - UTM parameters to apply
   */
  function applyParamsToLink(link, params) {
    try {
      const rawHref = link.getAttribute("href");
      if (!rawHref) return;

      const href = rawHref.trim();
      if (
        href === "" ||
        href.startsWith("#") ||
        /^javascript:/i.test(href) ||
        /^mailto:/i.test(href) ||
        /^tel:/i.test(href)
      ) {
        return;
      }

      const u = new URL(link.href, location.origin);
      if (u.protocol !== "http:" && u.protocol !== "https:") return;

      // Don't overwrite if the link already has that param
      for (const [k, v] of Object.entries(params)) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, v);
      }
      link.href = u.toString();
    } catch (_) {}
  }

  /**
   * Apply UTM parameters to an iframe's src URL
   * @param {HTMLIFrameElement} iframe - Iframe element to modify
   * @param {Object} params - UTM parameters to apply
   */
  function applyParamsToIframe(iframe, params) {
    try {
      const u = new URL(iframe.src, location.origin);

      // Only apply UTMs to signup.usenourish.com iframes
      if (u.hostname !== TARGET_HOST) return;

      // Don't overwrite if the iframe already has that param
      for (const [k, v] of Object.entries(params)) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, v);
      }
      iframe.src = u.toString();

      if (iframe.hasAttribute("data-src")) {
        try {
          const dataSrcValue = iframe.getAttribute("data-src");
          const dataUrl = new URL(dataSrcValue, location.origin);
          if (dataUrl.hostname === TARGET_HOST) {
            for (const [k, v] of Object.entries(params)) {
              if (!dataUrl.searchParams.has(k)) dataUrl.searchParams.set(k, v);
            }
            iframe.setAttribute("data-src", dataUrl.toString());
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  /**
   * Apply UTM parameters to all existing links and iframes on the page
   * @param {Object} params - UTM parameters to apply
   */
  function applyToAllLinks(params) {
    document
      .querySelectorAll("a[href]")
      .forEach((a) => applyParamsToLink(a, params));

    document
      .querySelectorAll("iframe[src]")
      .forEach((iframe) => applyParamsToIframe(iframe, params));
  }

  /**
   * Set up observer to apply UTM parameters to dynamically added links and iframes
   * @param {Object} params - UTM parameters to apply
   */
  function setupLinkObserver(params) {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;

          // Handle links
          if (node.tagName === "A" && node.href)
            applyParamsToLink(node, params);

          // Handle iframes
          if (node.tagName === "IFRAME" && node.src)
            applyParamsToIframe(node, params);

          // Handle nested elements
          if (node.querySelectorAll) {
            node
              .querySelectorAll("a[href]")
              .forEach((a) => applyParamsToLink(a, params));
            node
              .querySelectorAll("iframe[src]")
              .forEach((iframe) => applyParamsToIframe(iframe, params));
          }
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Return a normalized snapshot of the active UTM parameters
   * @returns {Object}
   */
  function getActiveUtmParamsSnapshot() {
    const snapshot = {};

    const storedState = readStored();
    let source = null;

    if (storedState && storedState.params) {
      source = storedState.params;
    } else if (Object.keys(currentParams).length) {
      source = currentParams;
    }

    if (!source) {
      return snapshot;
    }

    for (const [key, value] of Object.entries(source)) {
      if (!value) continue;
      const normalizedKey = normalizeParamKey(key);
      if (
        SUPPORTED_PARAMS.has(normalizedKey) ||
        normalizedKey.startsWith("utm_")
      ) {
        snapshot[normalizedKey] = String(value);
      }
    }

    return snapshot;
  }

  if (typeof window.NOURISH_GET_UTMS !== "function") {
    window.NOURISH_GET_UTMS = function () {
      return Object.assign({}, getActiveUtmParamsSnapshot());
    };
  }

  if (typeof window.NOURISH_WITH_UTMS !== "function") {
    window.NOURISH_WITH_UTMS = function (obj) {
      var base = obj && typeof obj === "object" ? obj : {};
      return Object.assign({}, base, getActiveUtmParamsSnapshot());
    };
  }
})();

// ============================================================================
// 6. ANALYTICS ENRICHMENT — UTMs on every RudderStack track/page call
// ----------------------------------------------------------------------------
// Guarantees every RudderStack `track` and `page` call carries the persisted
// UTM params, no matter when or how it is made, by patching all three shapes
// the SDK can take:
//   - the stub queue array (rewrites already-queued entries + wraps push)
//   - a property interceptor that catches the SDK replacing the stub
//   - the live SDK object (wraps .track/.page), with a retry poll
// Also fires the "Viewed Page" track event once per page at DOMContentLoaded.
//
// The nourish* functions are top-level (not IIFE-wrapped) because section 8
// reuses nourishMergeUtmsIntoProps. Treat them as this file's internal API.
//
// ⚠ ANALYTICS-CRITICAL: changes here affect Viewed Page / attribution data.
// Get data-team review before modifying.
// ============================================================================

function nourishGetUtms() {
  try {
    if (typeof window.NOURISH_GET_UTMS === "function") {
      var utms = window.NOURISH_GET_UTMS();
      if (utms && typeof utms === "object" && Object.keys(utms).length) {
        return utms;
      }
    }
  } catch (e) {}

  // Fallback: parse UTMs directly from the current URL
  // Covers cases where sessionStorage is unavailable (iOS WebViews, private mode)
  try {
    var allowed = window.NOURISH_UTM_PARAMS;
    if (!allowed || !allowed.length) return {};
    var params = new URLSearchParams(window.location.search);
    var fallback = {};
    params.forEach(function (value, key) {
      var k = key.toLowerCase();
      if (allowed.indexOf(k) !== -1) {
        fallback[k] = value;
      }
    });
    if (Object.keys(fallback).length) {
      return fallback;
    }
  } catch (e) {}

  return {};
}

function nourishGetPageUrlOverrides() {
  if (window.__nourish_apex !== "nourish.com") {
    return null;
  }

  var href = window.location && window.location.href;
  if (!href) {
    return null;
  }

  return {
    url: href,
    tab_url: href,
  };
}

function nourishMergeUtmsIntoProps(props) {
  var base = props && typeof props === "object" ? props : {};
  return Object.assign({}, base, nourishGetUtms());
}

function nourishIsPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  if (value instanceof Date) return false;
  return true;
}

function nourishMergeTrackArgs(args, utms) {
  var arr = Array.prototype.slice.call(args || []);
  if (!utms || !Object.keys(utms).length) {
    return arr;
  }

  var propsIndex = 1;
  if (arr.length <= propsIndex || !nourishIsPlainObject(arr[propsIndex])) {
    arr.splice(propsIndex, 0, {});
  }

  arr[propsIndex] = Object.assign({}, arr[propsIndex], utms);
  return arr;
}

function nourishMergePageArgs(args, utms) {
  var arr = Array.prototype.slice.call(args || []);
  var pageOverrides = nourishGetPageUrlOverrides();

  if (!utms || !Object.keys(utms).length) {
    if (!pageOverrides || !Object.keys(pageOverrides).length) {
      return arr;
    }
  }

  var propsIndex = 0;

  if (arr.length && typeof arr[0] === "string") {
    propsIndex = 1;
    if (arr.length > 1 && typeof arr[1] === "string") {
      propsIndex = 2;
    }
  }

  if (arr.length > propsIndex && nourishIsPlainObject(arr[propsIndex])) {
    arr[propsIndex] = Object.assign(
      {},
      arr[propsIndex],
      utms || {},
      pageOverrides || {},
    );
  } else {
    arr.splice(
      propsIndex,
      0,
      Object.assign({}, utms || {}, pageOverrides || {}),
    );
  }

  return arr;
}

var NOURISH_CTA_ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content",
  "utm_term", "utm_creative", "utm_page", "gclid", "gbraid", "gad_source", "gad_campaignid",
  "matchtype", "fbclid", "msclkid", "ttclid", "oppref", "im_ref", "nsh_cam"];

function nourishMergeUtmsIntoArgs(method, args) {
  if (!method) {
    return Array.prototype.slice.call(args || []);
  }

  var utms = nourishGetUtms();
  if (method === "track" && args &&
      (args[0] === "Get Started Clicked" || args[0] === "Dietitian Directory Clicked" || args[0] === "Dietitian Apply Clicked")) {
    // CTA events keep campaign attribution, but only from a fixed list: any
    // utm_* key is persisted, so arbitrary names could carry personal data.
    var allowed = {};
    for (var key in utms) {
      if (Object.prototype.hasOwnProperty.call(utms, key) && NOURISH_CTA_ATTRIBUTION_KEYS.indexOf(key) !== -1) allowed[key] = utms[key];
    }
    return Object.keys(allowed).length ? nourishMergeTrackArgs(args, allowed) : Array.prototype.slice.call(args || []);
  }
  var hasUtms = utms && Object.keys(utms).length;
  if (!hasUtms && method !== "page") {
    return Array.prototype.slice.call(args || []);
  }

  if (method === "track") {
    return nourishMergeTrackArgs(args, utms);
  }

  if (method === "page") {
    return nourishMergePageArgs(args, utms);
  }

  var cloned = Array.prototype.slice.call(args || []);
  if (!cloned.length) {
    cloned.push(Object.assign({}, utms));
    return cloned;
  }

  for (var i = 0; i < cloned.length; i++) {
    if (nourishIsPlainObject(cloned[i])) {
      cloned[i] = Object.assign({}, cloned[i], utms);
      return cloned;
    }
  }

  cloned.push(Object.assign({}, utms));
  return cloned;
}

function nourishPatchRudderArrayPush(arr) {
  if (arr.__nourishPushPatched) return;
  var origPush = arr.push;
  arr.push = function (entry) {
    if (Array.isArray(entry) && (entry[0] === "page" || entry[0] === "track")) {
      var method = entry[0];
      var enriched = nourishMergeUtmsIntoArgs(method, entry.slice(1));
      return origPush.call(this, [method].concat(enriched));
    }
    return origPush.apply(this, arguments);
  };
  arr.__nourishPushPatched = true;
}

function nourishInstallRudderInterceptor() {
  if (window.rudderanalytics) return;
  var _ra;
  Object.defineProperty(window, "rudderanalytics", {
    get: function () {
      return _ra;
    },
    set: function (val) {
      _ra = val;
      if (Array.isArray(val)) {
        nourishPatchRudderArrayPush(val);
      } else if (val && typeof val === "object") {
        nourishPatchLiveRudder();
      }
    },
    configurable: true,
    enumerable: true,
  });
}

function nourishPatchRudderQueue() {
  var ra = window.rudderanalytics;
  if (!ra) return;

  if (Array.isArray(ra)) {
    if (ra.__nourishQueuePatched) {
      return;
    }

    for (var i = 0; i < ra.length; i++) {
      var entry = ra[i];
      if (!Array.isArray(entry) || entry.length === 0) continue;
      var method = entry[0];
      if (method !== "track" && method !== "page") continue;
      var enriched = nourishMergeUtmsIntoArgs(method, entry.slice(1));
      ra[i] = [method].concat(enriched);
    }

    ["track", "page"].forEach(function (method) {
      var original = ra[method];
      if (typeof original !== "function") return;
      ra[method] = function () {
        var args = nourishMergeUtmsIntoArgs(method, arguments);
        return original.apply(this, args);
      };
    });

    ra.__nourishQueuePatched = true;
  }
}

function nourishPatchLiveRudder() {
  var ra = window.rudderanalytics;
  if (!ra || typeof ra !== "object") return false;
  if (Array.isArray(ra)) return false;

  var allPatched = true;
  ["track", "page"].forEach(function (method) {
    var current = ra[method];
    if (typeof current !== "function") {
      allPatched = false;
      return;
    }
    if (current.__nourishUtmWrapper) return;
    allPatched = false;
    var wrapper = function () {
      var args = nourishMergeUtmsIntoArgs(method, arguments);
      return current.apply(this, args);
    };
    wrapper.__nourishUtmWrapper = true;
    ra[method] = wrapper;
  });

  return allPatched;
}

function nourishEnsureRudderUtms() {
  nourishInstallRudderInterceptor();
  nourishPatchRudderQueue();

  if (nourishPatchLiveRudder()) {
    return;
  }

  var attempts = 0;
  var maxAttempts = 40;
  var delay = 250;

  (function poll() {
    attempts += 1;
    nourishPatchRudderQueue();
    if (nourishPatchLiveRudder()) {
      return;
    }
    if (attempts >= maxAttempts) {
      return;
    }
    setTimeout(poll, delay);
  })();
}

nourishEnsureRudderUtms();

function nourishBasePageProps() {
  return {
    path: window.location.pathname || "/",
    search: window.location.search || "",
    title: document.title || "",
    url: window.location.href || "",
    referrer: document.referrer || "",
  };
}

function nourishQueueViewedPageEvent() {
  var pageProps = nourishMergeUtmsIntoProps(nourishBasePageProps());

  if (
    window.rudderanalytics &&
    typeof window.rudderanalytics.track === "function"
  ) {
    window.rudderanalytics.track("Viewed Page", pageProps);
  } else if (window.rudderanalytics && Array.isArray(window.rudderanalytics)) {
    window.rudderanalytics.push(["track", "Viewed Page", pageProps]);
  }
}

(function () {
  if (window.__nourishViewedPageQueued) return;
  window.__nourishViewedPageQueued = true;

  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(nourishQueueViewedPageEvent, 0);
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      nourishQueueViewedPageEvent();
    });
  }
})();

// ============================================================================
// 7. SEO AND DOM UTILITIES
// ----------------------------------------------------------------------------
// - Canonical link override for paginated CMS lists (?..._page=N)
// - eraseHidden: removes Webflow conditionally-hidden elements from the DOM
//   at DOMContentLoaded so hidden CMS content doesn't bloat the page
// ============================================================================

// Handle canonical URLs for paginated content
const urlPath = window.location.href;
if (urlPath.includes("_page=")) {
  const canonicalLink = document.querySelector("link[rel='canonical']");
  if (canonicalLink) {
    canonicalLink.href = urlPath;
  } else {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", urlPath);
    document.head.appendChild(link);
  }
}

/**
 * Remove conditionally hidden elements from the DOM
 * This improves performance by removing elements that are never shown
 */
const eraseHidden = () => {
  document.querySelectorAll(".w-condition-invisible").forEach((el) => {
    el.remove();
  });
};
document.addEventListener("DOMContentLoaded", eraseHidden);

// ============================================================================
// 8. "GET STARTED" TRACKING + SIGNUP LINK PARAM INJECTION
// ----------------------------------------------------------------------------
// - Tracks "Get Started Clicked" on ANY click that goes to signup.<apex>
//   (5 props: location, element (prefers data-cta), cta copy, url, deviceType)
// - Rewrites every signup link to carry ?landingPageVariation=<mapped value>
//   (see getVariationParams for the path→variation table) plus the persisted
//   UTMs, so attribution survives new-tab opens and the signup handoff.
// - Covers late-rendered links via delayed passes + a MutationObserver.
// - Tracks "Dietitian Apply Clicked" (same 5-prop schema plus additive cta_*
//   properties) on anchors carrying the data-cta-* contract, on
//   /become-a-dietitian only — see the block at the end of this IIFE.
//
// ⚠ ANALYTICS-CRITICAL: the variation mapping and event schema feed signup
// attribution. Get data-team review before modifying.
// ============================================================================
(function () {
  var SIGNUP_HOST = "signup." + window.__nourish_apex;
  var EVENT = "Get Started Clicked";
  var VAR_KEY = "landingPageVariation";
  var VAR_NAME_KEY = "variationName";

  if (!window.jQuery) return;
  if (window.__nourishCtaTrackingBound) return;
  window.__nourishCtaTrackingBound = true;
  var $doc = jQuery(document);

  /**
   * Normalize path for consistent comparison
   * @param {string} p - Path to normalize
   * @returns {string} - Normalized path
   */
  function normPath(p) {
    p = (p || window.location.pathname || "/").toLowerCase();
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  }

  /**
   * Get landing page variation params based on current path
   * @param {string} path - Current page path
   * @returns {{ landingPageVariation: string, variationName?: string }|null}
   */
  function getVariationParams(path) {
    path = normPath(path);
    if (path === "/") return { landingPageVariation: "Organic_Homepage" };
    if (
      path.indexOf("/home-b-no-wordmark") === 0 ||
      path.indexOf("/home-new") === 0
    )
      return { landingPageVariation: "landing-page" };
    if (path.indexOf("/blog") === 0) return { landingPageVariation: "blog" };
    if (path.indexOf("/landing-page") === 0)
      return { landingPageVariation: "landing-page" };
    if (path.indexOf("/conditions") === 0)
      return { landingPageVariation: "conditions" };
    if (path.indexOf("/local-dietitians") === 0)
      return { landingPageVariation: "local-dietitians" };
    if (path.indexOf("/insurance-dietitians") === 0)
      return { landingPageVariation: "insurance-dietitians" };
    if (path.indexOf("/paid-tt") === 0)
      return { landingPageVariation: "Paid_TT_Homepage" };
    if (path.indexOf("/paid-labs") === 0)
      return {
        landingPageVariation: "Labs_LP",
        variationName: "labsPromotionVariation",
      };
    if (path.indexOf("/paid") === 0)
      return { landingPageVariation: "Paid_Homepage" };
    if (path.indexOf("/quiz-a") === 0) return { landingPageVariation: "quiz" };
    if (path.indexOf("/does-my-insurance-cover-nutrition") === 0)
      return { landingPageVariation: "Am_I_Covered" };
    return null;
  }

  /**
   * Detect device type from user agent
   * @returns {string} - "mobile" or "desktop"
   */
  function deviceType() {
    var ua = navigator.userAgent || navigator.vendor || window.opera;
    if (
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        ua.toLowerCase(),
      )
    ) {
      return "mobile";
    }
    return "desktop";
  }

  /**
   * Safely create URL object
   * @param {string} href - URL string
   * @returns {URL|null} - URL object or null if invalid
   */
  function safeURL(href) {
    try {
      return new URL(href, window.location.origin);
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if URL is a signup URL
   * @param {URL} u - URL object
   * @returns {boolean} - True if signup URL
   */
  function isSignupHost(u) {
    return !!u && (u.hostname === "signup.nourish.com" || u.hostname === "signup.usenourish.com");
  }

  function isSignupURL(u) {
    return isSignupHost(u) && !u.username && !u.password && u.protocol === "https:" && !u.port;
  }

  /**
   * Track a CTA click event (defaults to "Get Started Clicked")
   * @param {Element} el - Clicked element
   * @param {string} href - URL that was clicked
   * @param {string} [eventName] - RudderStack event name (defaults to EVENT)
   * @param {Object} [extraProps] - Additional/override properties. When it
   *   supplies "cta copy", the element's DOM text is not read at all.
   */
  // Reviewed migration mappings. Selectors locate existing markup only;
  // identities, placement, section and revision below are explicit constants.
  // Authors should add data-cta-* contracts for new sections instead of adding
  // CSS/text-derived identities. Unknown placements are reported as unmapped.
  var CTA_RELEASE = "cta-cleanup-2026-10-26-1";
  var PAID_PAGES = /^\/paid(?:-[a-z0-9-]+|wl)?$/;
  var PATIENT_MAPPINGS = [
    { selector: '[data-cta="nav"]', location: "nav", section: "navigation", role: "nav" },
    { selector: '.nav_component-2 a', location: "nav", section: "navigation", role: "nav" },
    { selector: '.footer-wrap a', location: "footer", section: "final_cta", role: "footer" },
    { selector: '#home-filter-cta', location: "hero", section: "insurance", role: "hero-coverage" },
    { selector: '#provider-filter-cta', location: "content", section: "provider_directory", role: "provider-filter" },
    { selector: '.logos_home-wrap a', page: "/", location: "content", section: "insurance", role: "insurance" },
    { selector: '.program-slider_component a', page: "/", location: "content", section: "benefits", role: "program" },
    { selector: '.sticky-phone_content a', page: "/", location: "content", section: "app", role: "app" },
    { selector: '[data-cta="hero cta"]', location: "hero", section: "intro", role: "hero" },
    // Footer V2 splash ("Take your first step…") on every page.
    { selector: '.section_footer-splash a', location: "footer", section: "final_cta", role: "final-cta" },
    // Paid landing pages (/paid, /paid-*, /paidwl) share these section blocks.
    { selector: '.nav_component-3 a', pages: PAID_PAGES, location: "nav", section: "navigation", role: "nav" },
    { selector: 'a.quiz', pages: PAID_PAGES, location: "hero", section: "quiz", role: "quiz" },
    { selector: '.padding-section-insurances [data-cta="in-page"]', pages: PAID_PAGES, location: "content", section: "insurance", role: "insurance" },
    { selector: '.padding-section-how-it-works [data-cta="in-page"]', pages: PAID_PAGES, location: "content", section: "how_it_works", role: "how-it-works" },
    { selector: '.section_approach [data-cta="in-page"]', pages: PAID_PAGES, location: "content", section: "approach", role: "approach" },
    { selector: '.section_testimonial-slider [data-cta="in-page"]', pages: PAID_PAGES, location: "content", section: "testimonials", role: "testimonials" },
    { selector: '.section_step-cards [data-cta="in-page"]', pages: PAID_PAGES, location: "content", section: "app", role: "app" },
    { selector: '.footer-paid_card [data-cta="footer"]', pages: PAID_PAGES, location: "footer", section: "final_cta", role: "final-cta" },
    { selector: '.section_logos [data-cta="footer"]', pages: PAID_PAGES, location: "content", section: "insurance", role: "insurance" },
    { selector: '.section_program-slider [data-cta="footer"]', pages: PAID_PAGES, location: "content", section: "benefits", role: "program" },
    { selector: '.section_sticky-phone [data-cta="footer"]', pages: PAID_PAGES, location: "content", section: "app", role: "app" },
    { selector: '.faq_dropdown-list a', pages: PAID_PAGES, location: "content", section: "faq", role: "faq" }
  ];
  var CTA_TOKEN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
  var CTA_VERSION = /^[A-Za-z0-9._-]{1,64}$/;
  var CTA_LOCATIONS_V2 = ["nav", "hero", "content", "footer", "sticky_bar", "modal"];

  function patientAction(u) {
    // Reviewed production redirect: /find-a-provider -> signup.nourish.com/providers.
    // Keep this exact; other marketing hosts/paths need separate routing review.
    if (u && !u.username && !u.password && u.protocol === "https:" &&
        u.host === "www.nourish.com" && u.pathname === "/find-a-provider") {
      return "directory-navigation";
    }
    if (!isSignupURL(u)) return null;
    var path = normPath(u.pathname);
    if (path === "/") return "direct-signup";
    if (path === "/providers") return "directory-navigation";
    return null; // privacy/settings and unknown signup paths are not patient CTAs
  }

  function patientContract(a, u) {
    var action = patientAction(u);
    if (!action) return null;
    var id = a.getAttribute("data-cta-id");
    var c;
    // Legacy data-cta alone is a migration hook. Once any explicit contract
    // field is authored, require the complete contract instead of falling back.
    var fields = ["id", "name", "location", "section", "action", "version"];
    var authored = false, filled = false;
    for (var f = 0; f < fields.length; f++) {
      var value = a.getAttribute("data-cta-" + fields[f]);
      if (value !== null) authored = true;
      if (value) filled = true;
    }
    // Footer V2 emits blank data-cta-* placeholders on every page when its CTA
    // properties are unset; that splash button falls back to its reviewed mapping.
    if (authored && !filled && a.matches(".section_footer-splash a")) authored = false;
    if (authored) {
      c = { id: id, name: a.getAttribute("data-cta-name"),
        location: a.getAttribute("data-cta-location"), section: a.getAttribute("data-cta-section"),
        action: a.getAttribute("data-cta-action"), version: a.getAttribute("data-cta-version") };
      // An incomplete or mismatched contract never sends its authored identity,
      // but the click is still counted so authoring gaps cannot hide conversions.
      if (!CTA_TOKEN.test(c.id || "") || !c.name || !c.name.trim() || c.name.length > 120 ||
          CTA_LOCATIONS_V2.indexOf(c.location) < 0 || !CTA_TOKEN.test(c.section || "") ||
          c.action !== action || !CTA_VERSION.test(c.version || "")) return unmappedContract(action, "invalid-contract");
      c.mapping = "explicit";
      return c;
    }
    for (var i = 0; i < PATIENT_MAPPINGS.length; i++) {
      var m = PATIENT_MAPPINGS[i];
      if (m.page && normPath(window.location.pathname) !== m.page) continue;
      if (m.pages && !m.pages.test(normPath(window.location.pathname))) continue;
      if (!a.matches(m.selector)) continue;
      return { id: "patient-" + (action === "direct-signup" ? "signup-" : "directory-") + m.role,
        name: (action === "direct-signup" ? "Start signup" : "Find a dietitian") + " | " + m.role,
        location: m.location, section: m.section, action: action, version: "1", mapping: "reviewed-migration" };
    }
    return unmappedContract(action, "unmapped");
  }

  function unmappedContract(action, mapping) {
    return { id: "patient-" + (action === "direct-signup" ? "signup" : "directory") + "-unmapped",
      name: (action === "direct-signup" ? "Start signup" : "Find a dietitian") + " | Unmapped placement",
      location: "unmapped", section: "unmapped", action: action, version: "unmapped", mapping: mapping };
  }

  function ctaQaProps() {
    // Staging QA is deliberately opt-in and never propagated to signup URLs.
    if (window.location.hostname !== "nourish-2-23.webflow.io") return {};
    var p = new URLSearchParams(window.location.search);
    var run = p.get("qa_run_id") || "";
    return p.get("qa_test") === "true" && /^nourish-cta-qa-[a-z0-9-]{1,64}$/.test(run)
      ? { qa_test: true, qa_run_id: run } : {};
  }

  function cleanCtaContext() {
    var ref = safeURL(document.referrer || "");
    return { page: { url: window.location.origin + window.location.pathname,
      tab_url: window.location.origin + window.location.pathname,
      path: window.location.pathname, search: "",
      referrer: document.referrer && ref ? ref.origin + ref.pathname : "",
      referring_domain: document.referrer && ref ? ref.hostname : "" } };
    // initial_referrer/initial_referring_domain are first-touch values owned by
    // the SDK; the current page's referrer must not overwrite them.
  }

  // Historical patient "cta copy" is the visible link text (Dietitian Apply has
  // always sent its contract name); cta_name carries the contract name.
  function ctaCopy(el) {
    return (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120) || null;
  }

  function pageAttribute(name) {
    var value = document.documentElement.getAttribute(name);
    return value === null && document.body ? document.body.getAttribute(name) : value;
  }

  // Event "url" keeps the attribution params the clicked link actually carries
  // (allow-listed only), so charts that read url (e.g. the UTM Passthrough
  // Rate alert: url contains utm_source=) keep working. Any other query value
  // and the hash are still dropped. Reads the link itself, not stored UTMs,
  // so the metric still shows when a link fails to carry them.
  var CTA_URL_KEEP_KEYS = NOURISH_CTA_ATTRIBUTION_KEYS.concat([VAR_KEY, VAR_NAME_KEY]);
  function ctaUrl(u) {
    var kept = new URLSearchParams();
    u.searchParams.forEach(function (value, key) {
      if (CTA_URL_KEEP_KEYS.indexOf(key.toLowerCase()) !== -1) kept.append(key, value);
    });
    var qs = kept.toString();
    return u.origin + u.pathname + (qs ? "?" + qs : "");
  }

  function track(el, href, eventName, extraProps) {
    if (!window.rudderanalytics || typeof window.rudderanalytics.track !== "function") return;
    var u = safeURL(href);
    if (!u || (u.protocol !== "http:" && u.protocol !== "https:")) return;
    var extra = extraProps || {};
    var cta = extra.cta_id ? { id: extra.cta_id, name: extra.cta_name,
      location: extra.cta_location, section: extra.cta_section || extra.cta_location, action: extra.cta_action,
      version: extra.cta_version || "1", mapping: "existing-dietitian-contract" } : patientContract(el, u);
    if (!cta) return;
    var version = el.getAttribute("data-cta-version");
    var pageVersion = pageAttribute("data-page-version");
    var legacyElement = el.getAttribute("data-cta") || (el.id ? "#" + el.id : null) ||
      (el.className ? "." + String(el.className).trim().split(/\s+/).join(".") : el.tagName.toLowerCase());
    var payload = Object.assign({
      location: window.location.pathname || "/", element: legacyElement, "cta copy": eventName === "Dietitian Apply Clicked" ? cta.name : ctaCopy(el),
      url: ctaUrl(u), deviceType: deviceType(), cta_id: cta.id,
      cta_name: cta.name, cta_location: cta.location, cta_section: cta.section,
      cta_action: cta.action, cta_version: CTA_VERSION.test(version || "") ? version : cta.version,
      tracking_schema_version: "2", release_version: CTA_RELEASE,
      page_version: CTA_VERSION.test(pageVersion || "") ? pageVersion : null,
      page_path: window.location.pathname || "/", destination_host: u.hostname,
      destination_path: u.pathname, locale: pageLocale(), cta_mapping_status: cta.mapping
    }, ctaQaProps());
    var variant = el.getAttribute("data-experiment-variant");
    if (CTA_VERSION.test(variant || "")) payload.experiment_variant = variant;
    var presentation = el.getAttribute("data-cta-presentation");
    if (presentation === "button" || presentation === "text_link") payload.cta_presentation = presentation;
    var vp = getVariationParams(window.location.pathname);
    if (vp) payload.landingPageVariation = vp.landingPageVariation;
    if (vp && vp.variationName) payload.variationName = vp.variationName;
    try {
      window.rudderanalytics.track(eventName || (cta.action === "directory-navigation" ? "Dietitian Directory Clicked" : EVENT), payload, { context: cleanCtaContext() });
    } catch (e) {} // SDK failures must never prevent navigation
  }

  // NOTE: intentional duplicate of section 5's param list, used only as a
  // fallback when window.NOURISH_UTM_PARAMS is unavailable (e.g. if the UTM
  // IIFE failed). Keep the two lists in sync when adding params.
  var DEFAULT_UTM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_creative",
    "utm_page",
    "gclid",
    "gbraid",
    "gad_source",
    "gad_campaignid",
    "fbclid",
    "msclkid",
    "ttclid",
    "oppref",
    "im_ref",
    "nsh_cam",
  ];

  /**
   * Append UTM/tracking params to URL (from NOURISH_GET_UTMS or persistedUTMs)
   * @param {URL} u - URL object
   */
  function appendUtmsToUrl(u) {
    try {
      var utmKeys =
        window.NOURISH_UTM_PARAMS && window.NOURISH_UTM_PARAMS.length
          ? window.NOURISH_UTM_PARAMS
          : DEFAULT_UTM_KEYS;
      var utmSnapshot = nourishGetUtms();
      if (!utmSnapshot || !Object.keys(utmSnapshot).length) {
        try {
          var stored = sessionStorage.getItem("persistedUTMs");
          if (stored) {
            var parsed = JSON.parse(stored);
            if (parsed && parsed.params) utmSnapshot = parsed.params;
          }
        } catch (e) {}
      }
      if (!utmSnapshot || !Object.keys(utmSnapshot).length) return;
      for (var i = 0; i < utmKeys.length; i++) {
        var key = utmKeys[i];
        var value = utmSnapshot[key];
        if (value && typeof value === "string" && value.trim()) {
          if (!u.searchParams.has(key)) {
            u.searchParams.set(key, value.trim());
          }
        }
      }
    } catch (e) {}
  }

  /**
   * Append landing page variation params to URL
   * @param {URL} u - URL object
   * @returns {URL} - Modified URL object
   */
  function maybeAppendVariation(u) {
    var vp = getVariationParams(window.location.pathname);
    if (vp) {
      u.searchParams.set(VAR_KEY, vp.landingPageVariation);
      if (vp.variationName) u.searchParams.set(VAR_NAME_KEY, vp.variationName);
    }
    appendUtmsToUrl(u);
    return u;
  }

  function rewriteSignupLinks() {
    jQuery('a[href]').each(function () {
      var u = safeURL(this.getAttribute("href"));
      if (!isSignupURL(u) || !patientAction(u)) return;
      maybeAppendVariation(u);
      this.setAttribute("href", u.toString());
    });
  }

  // Proactively rewrite signup links on load (so new-tab gets params)
  jQuery(function () {
    rewriteSignupLinks();
    // Delayed passes for late-rendered content (e.g. CMS, Webflow, #home-filter-cta)
    setTimeout(rewriteSignupLinks, 500);
    setTimeout(rewriteSignupLinks, 1500);
    // MutationObserver: rewrite when new signup links are added to DOM
    if (typeof MutationObserver !== "undefined" && document.body) {
      var rewriteTimeout;
      var obs = new MutationObserver(function () {
        clearTimeout(rewriteTimeout);
        rewriteTimeout = setTimeout(rewriteSignupLinks, 100);
      });
      obs.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  });

  // One delegated handler for patient and dietitian actions, including dynamic
  // anchors and browser-generated keyboard clicks. Never suppress navigation.
  $doc.on("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var raw = (a.getAttribute("href") || "").trim();
    if (!raw || raw.charAt(0) === "#") return;
    var u = safeURL(raw);
    if (!u || (u.protocol !== "https:" && u.protocol !== "http:")) return;
    if (patientAction(u)) {
      track(a, u.toString());
      var before = u.toString();
      if (isSignupURL(u)) maybeAppendVariation(u);
      if (u.toString() !== before) a.setAttribute("href", u.toString());
      return;
    }
    if (normPath(window.location.pathname) !== APPLY_PAGE || isSignupHost(u)) return;
    var cta = readCtaContract(a);
    if (!cta) return;
    track(a, u.origin + u.pathname, cta.event, {
      cta_id: cta.id, cta_name: cta.name, cta_location: cta.location, cta_action: cta.action,
      cta_section: cta.section, cta_version: cta.version
    });
  });

  // --------------------------------------------------------------------------
  // "Dietitian Apply Clicked" — Apply now CTAs on /become-a-dietitian
  // --------------------------------------------------------------------------
  // Attribute-driven: a CTA is recognised ONLY by the data-cta-* contract that
  // Webflow carries on the anchor — never by copy, classes or href substrings,
  // so translations, restyles and link changes cannot silently drop or add
  // events. data-cta-action is an allowlist that maps to a fixed event name;
  // anything missing, unknown or malformed emits nothing.
  //
  //   data-cta-action    "apply-dietitian"            -> event name below
  //   data-cta-id        one of CTA_IDS[action]       stable, never reassigned
  //   data-cta-name      human-readable, <=120 chars  (also used as "cta copy")
  //   data-cta-location  one of CTA_LOCATIONS
  //
  // Reuses track() above, so the Get Started schema is preserved (location,
  // element, cta copy, url, deviceType + persisted UTMs), with additive
  // cta_id, cta_name, cta_location, cta_action, page_path, destination_host,
  // destination_path and locale. url / destination_* are origin + pathname
  // only (no query, no hash); nothing is read from form fields or DOM text.
  // The "earnings" CTA says Apply now but opens the pay calculator: that is
  // calculator engagement, not an application start — distinguish it by
  // cta_location / destination_path, never by dropping the event.
  // Scoped to the page itself (normalised path, so trailing slash counts);
  // delegated from document so repeated, mobile and late-inserted CTAs are
  // covered; one listener (idempotence flag); never calls preventDefault; and
  // track() swallows SDK errors, so navigation is untouched. Consent gating
  // stays with the RudderStack SDK (OneTrust consentManagement in the footer
  // stub). Signup-host links stay with Get Started Clicked: one event per
  // click, never both.
  // --------------------------------------------------------------------------
  var APPLY_PAGE = "/become-a-dietitian";
  var CTA_ACTION_EVENTS = { "apply-dietitian": "Dietitian Apply Clicked" };
  var CTA_IDS = {
    "apply-dietitian": [
      "dietitian-apply-hero",
      "dietitian-apply-earnings",
      "dietitian-apply-platform",
      "dietitian-apply-footer",
    ],
  };
  var CTA_LOCATIONS = ["hero", "earnings", "platform", "footer"];
  var CTA_NAME_RE = /^[A-Za-z0-9 .,&'()\/_-]{1,120}$/;

  /**
   * Read and validate the data-cta-* contract on an anchor.
   * @param {Element} a
   * @returns {{event:string, action:string, id:string, name:string, location:string}|null}
   */
  function readCtaContract(a) {
    var action = a.getAttribute("data-cta-action");
    if (
      !action ||
      !Object.prototype.hasOwnProperty.call(CTA_ACTION_EVENTS, action)
    )
      return null;
    var id = a.getAttribute("data-cta-id");
    if (!id || CTA_IDS[action].indexOf(id) === -1) return null;
    var location = a.getAttribute("data-cta-location");
    if (!location || CTA_LOCATIONS.indexOf(location) === -1) return null;
    var name = (a.getAttribute("data-cta-name") || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!CTA_NAME_RE.test(name)) return null;
    var section = a.getAttribute("data-cta-section");
    var version = a.getAttribute("data-cta-version");
    if ((section !== null && !CTA_TOKEN.test(section)) ||
        (version !== null && !CTA_VERSION.test(version))) return null;
    return {
      event: CTA_ACTION_EVENTS[action],
      action: action,
      id: id,
      name: name,
      location: location,
      section: section === null ? location : section,
      version: version === null ? "1" : version,
    };
  }

  function pageLocale() {
    var lang = document.documentElement.getAttribute("lang");
    return lang && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang) ? lang : null;
  }

})();
