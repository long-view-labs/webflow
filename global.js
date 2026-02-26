// ============================================================================
// DOMAIN DETECTION (nourish.com / usenourish.com dual-domain support)
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
// SCRIPT LOADING UTILITIES
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
        callback
      );
      window.removeEventListener("scroll", onScroll);
    }
  });
}

// Register the scroll event listener for lazy script loading
window.addEventListener("scroll", function onScroll() {
  // Select all elements that have a 'data-script-src' attribute
  var elements = document.querySelectorAll(
    "[data-script-src]:not([data-script-loaded])"
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
        }
      );
    }
  });
});

// Load Convert Script on first scroll
window.addEventListener("scroll", function onFirstScroll() {
  window.removeEventListener("scroll", onFirstScroll);
});

// ============================================================================
// MENU AND NAVIGATION UTILITIES
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
// UTM PARAMETER TRACKING AND PERSISTENCE
// ============================================================================

/**
 * Comprehensive UTM parameter tracking system
 * - Tracks UTM parameters across page navigation within 30-minute sessions
 * - Sets cookies for backward compatibility
 * - Automatically injects UTM parameters into all outbound links and signup iframes
 * - Clears old UTMs when coming from external referrers
 * - Supports all tracking parameters (utm_*, gclid, gbraid, gad_source, gad_campaignid, fbclid, msclkid, ttclid, im_ref, nsh_cam)
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
    "fbclid",
    "msclkid",
    "ttclid",
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
      Array.from(SUPPORTED_PARAMS).map((key) => normalizeParamKey(key))
    );
    const counts = new Map();

    entries.forEach(([key]) => {
      const normalizedKey = normalizeParamKey(key);
      if (normalizedKey.startsWith("utm_") || trackingKeys.has(normalizedKey)) {
        counts.set(normalizedKey, (counts.get(normalizedKey) || 0) + 1);
      }
    });

    const hasDuplicates = Array.from(counts.values()).some(
      (count) => count > 1
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
// SEO AND DOM UTILITIES
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
// ANALYTICS AND TRACKING
// ============================================================================

function nourishGetUtms() {
  try {
    if (typeof window.NOURISH_GET_UTMS === "function") {
      var utms = window.NOURISH_GET_UTMS();
      if (utms && typeof utms === "object") {
        return utms;
      }
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
      pageOverrides || {}
    );
  } else {
    arr.splice(
      propsIndex,
      0,
      Object.assign({}, utms || {}, pageOverrides || {})
    );
  }

  return arr;
}

function nourishMergeUtmsIntoArgs(method, args) {
  if (!method) {
    return Array.prototype.slice.call(args || []);
  }

  var utms = nourishGetUtms();
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
  if (!ra || typeof ra !== "object") {
    return false;
  }
  if (ra.__nourishUtmsPatched) {
    return true;
  }

  ["track", "page"].forEach(function (method) {
    var original = ra && ra[method];
    if (typeof original !== "function") return;
    ra[method] = function () {
      var args = nourishMergeUtmsIntoArgs(method, arguments);
      return original.apply(this, args);
    };
  });

  ra.__nourishUtmsPatched = true;
  return true;
}

function nourishEnsureRudderUtms() {
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

/**
 * Global "Get Started" tracking + param injection
 * - Fires on ANY click that goes to signup.usenourish.com
 * - Tracks with 5 props: location, element (pref data-cta), cta copy, url, deviceType
 * - Appends ?landingPageVariation=... from path mapping
 */
(function () {
  var SIGNUP_HOST = "signup." + window.__nourish_apex;
  var EVENT = "Get Started Clicked";
  var VAR_KEY = "landingPageVariation";
  var VAR_NAME_KEY = "variationName";

  if (!window.jQuery) return;
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
    if (path.indexOf("/paid-labs-b") === 0)
      return {
        landingPageVariation: "Labs_LP",
        variationName: "labsPromotionVariation",
      };
    if (path.indexOf("/paid-labs-a") === 0)
      return {
        landingPageVariation: "Paid_Homepage_A",
        variationName: "earlierContactInfoVariation",
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
        ua.toLowerCase()
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
  function isSignupURL(u) {
    return !!u && (u.hostname || "").toLowerCase().indexOf(SIGNUP_HOST) !== -1;
  }

  /**
   * Track "Get Started" click event
   * @param {Element} el - Clicked element
   * @param {string} href - URL that was clicked
   */
  function track(el, href) {
    if (
      !window.rudderanalytics ||
      typeof window.rudderanalytics.track !== "function"
    )
      return;

    var $el = jQuery(el);
    var text =
      ($el.text() || "").trim().replace(/\s+/g, " ").slice(0, 120) || null;

    var elementId =
      el.getAttribute("data-cta") ||
      (el.id ? "#" + el.id : null) ||
      (el.className
        ? "." + String(el.className).trim().split(/\s+/).join(".")
        : el.tagName.toLowerCase());

    try {
      var payload = nourishMergeUtmsIntoProps({
        location: window.location.pathname || "/",
        element: elementId,
        "cta copy": text,
        url: href || null,
        deviceType: deviceType(),
      });

      window.rudderanalytics.track(EVENT, payload);
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
      if (vp.variationName)
        u.searchParams.set(VAR_NAME_KEY, vp.variationName);
    }
    return u;
  }

  // Proactively rewrite signup links on load (so new-tab gets params)
  jQuery(function () {
    jQuery('a[href*="' + SIGNUP_HOST + '"]').each(function () {
      var u = safeURL(this.getAttribute("href"));
      if (!isSignupURL(u)) return;
      maybeAppendVariation(u);
      this.setAttribute("href", u.toString());
    });
  });

  // Delegate clicks sitewide
  $doc.on("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var u = safeURL(a.getAttribute("href"));
    if (!isSignupURL(u)) return;

    // Track with required properties
    track(a, u.toString());

    // Inject landingPageVariation if mapping exists
    var before = u.toString();
    maybeAppendVariation(u);
    if (u.toString() !== before) a.setAttribute("href", u.toString());
  });
})();
