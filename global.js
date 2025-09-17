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
 * Advanced UTM parameter tracking with session persistence
 * - Tracks UTM parameters across page navigation within 30-minute sessions
 * - Automatically injects UTM parameters into outbound signup links
 * - Clears old UTMs when coming from external referrers
 * - Supports additional tracking parameters (gclid, fbclid, msclkid, ttclid, im_ref)
 */
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

  // ---------- Helper Functions ----------

  /**
   * Extract allowed UTM and tracking parameters from URL
   * @param {URLSearchParams} searchParams - URL search parameters
   * @returns {Object} - Object containing allowed parameters
   */
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
      return JSON.parse(sessionStorage.getItem(KEY));
    } catch {
      return null;
    }
  }

  /**
   * Save UTM data to sessionStorage
   * @param {Object} obj - UTM data to store
   */
  function saveStored(obj) {
    sessionStorage.setItem(KEY, JSON.stringify(obj));
  }

  /**
   * Clear stored UTM data from sessionStorage
   */
  function clearStored() {
    sessionStorage.removeItem(KEY);
  }

  /**
   * Apply UTM parameters to a specific link
   * @param {HTMLAnchorElement} link - Link element to modify
   * @param {Object} params - UTM parameters to apply
   */
  function applyParamsToLink(link, params) {
    try {
      const u = new URL(link.href, location.origin);
      if (u.host !== TARGET_HOST) return;

      // Don't overwrite if the link already has that param
      for (const [k, v] of Object.entries(params)) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, v);
      }
      link.href = u.toString();
    } catch (_) {}
  }

  /**
   * Apply UTM parameters to all existing links on the page
   * @param {Object} params - UTM parameters to apply
   */
  function applyToAllLinks(params) {
    document
      .querySelectorAll("a[href]")
      .forEach((a) => applyParamsToLink(a, params));
  }

  /**
   * Set up observer to apply UTM parameters to dynamically added links
   * @param {Object} params - UTM parameters to apply
   */
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

// Legacy UTM cookie tracking (kept for backward compatibility)
const utmParameters = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "msclkid",
  "ttclid",
  "im_ref",
];

/**
 * Check if URL contains any UTM parameters (legacy function)
 * @param {Array} utmParameters - Array of UTM parameter names
 * @param {URLSearchParams} URLSearchParams_wb - URL search params object
 * @returns {boolean} - True if any UTM parameters exist
 */
function hasUtms(utmParameters, URLSearchParams_wb) {
  for (const utm_element of utmParameters) {
    if (URLSearchParams_wb.has(utm_element)) {
      return true;
    }
  }
  return false;
}

/**
 * Load UTM parameters from current URL (legacy function)
 * @returns {URLSearchParams} - URL search params object
 */
function loadUtms() {
  var queryString = window.location.search;
  return new URLSearchParams(queryString);
}

/**
 * Set UTM parameters as cookies (legacy function)
 * @param {Array} utmParameters - Array of UTM parameter names
 * @param {URLSearchParams} URLSearchParams_wb - URL search params object
 */
function setUtmCookies(utmParameters, URLSearchParams_wb) {
  for (const utm_element of utmParameters) {
    if (URLSearchParams_wb.has(utm_element)) {
      var value = URLSearchParams_wb.get(utm_element);
      document.cookie =
        utm_element + "=" + value + "; path=/; domain=.usenourish.com";
    } else {
      document.cookie = utm_element + "=" + "; path=/; domain=.usenourish.com";
    }
  }
}

// Initialize legacy UTM cookie tracking
var URLSearchParams_wb = loadUtms();
if (hasUtms(utmParameters, URLSearchParams_wb) == true) {
  setUtmCookies(utmParameters, URLSearchParams_wb);
}

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

/**
 * Global "Get Started" tracking + param injection
 * - Fires on ANY click that goes to signup.usenourish.com
 * - Tracks with 5 props: location, element (pref data-cta), cta copy, url, deviceType
 * - Appends ?landingPageVariation=... from path mapping
 */
(function () {
  var SIGNUP_HOST = "signup.usenourish.com";
  var EVENT = "Get Started Clicked";
  var VAR_KEY = "landingPageVariation";

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
   * Get landing page variation based on current path
   * @param {string} path - Current page path
   * @returns {string|null} - Variation name or null
   */
  function variationFromPath(path) {
    path = normPath(path);
    if (path === "/") return "Insurance_Check";
    if (path.indexOf("/blog") === 0) return "blog";
    if (path.indexOf("/landing-page") === 0) return "landing-page";
    if (path.indexOf("/conditions") === 0) return "conditions";
    if (path.indexOf("/local-dietitians") === 0) return "local-dietitians";
    if (path.indexOf("/paid") === 0) return "Insurance_Check";
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
      window.rudderanalytics.track(EVENT, {
        location: window.location.pathname || "/",
        element: elementId,
        "cta copy": text,
        url: href || null,
        deviceType: deviceType(),
      });
    } catch (e) {}
  }

  /**
   * Append landing page variation parameter to URL
   * @param {URL} u - URL object
   * @returns {URL} - Modified URL object
   */
  function maybeAppendVariation(u) {
    var v = variationFromPath(window.location.pathname);
    if (v) u.searchParams.set(VAR_KEY, v);
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
