// Condition LPs — 50/50 split tests (control vs utm_term-personalized pages)
//
// Three independent experiments, one per condition. Same shape as
// weight-concerns-split.js, which stays untouched and keeps running.
//
//   FAMILY        CONTROL                                        EXPERIMENT
//   heart-health  /landing-page/online-heart-health-nutritionist lp-heart-health-utm-v1
//   diabetes      /landing-page/diabetes                         lp-diabetes-utm-v1
//   pcos          /landing-page/pcos                             lp-pcos-utm-v1
//
//   VARIANT pages: /landing-pages/{family}/{group}, one per keyword group.
//
// Only visitors whose utm_term is on that family's keyword list enter its
// experiment. Eligible control-URL visitors are bucketed once per family
// (sticky per browser via localStorage, cookie fallback) and split 50/50:
//   "variant" -> location.replace() straight to the group page before first
//                paint (single hop); the group page fires Experiment Viewed.
//   "control" -> stays, fires Experiment Viewed.
// Missing/unlisted terms stay on the standard control URL, or return there
// from a variant URL, without assignment or Experiment Viewed (same rule as
// weight concerns). Variant pages fire Experiment Viewed only for listed
// terms with a stored "variant" bucket. To review a variant page directly,
// add a listed utm_term to its URL.
//
// KEYWORDS below are the exact lists from the request sheet (matching is
// exact after normalize(); no fuzzy patterns). To add or move a keyword,
// edit the list here and tests/fixtures/condition-lp-keywords.json together.
//
// Where it loads (same file, path guards make it inert elsewhere):
//   1. landing-page-head.html -> landing-page/{template} HEAD, synchronous,
//      so the redirect happens before paint.
//   2. condition-lp-variant-footer.html -> deferred, pasted on each of the
//      ten variant pages; fires the variant-side event.
//      __clpSplitRan keeps a double include harmless.
//
// QA:  ?lp_split=variant | ?lp_split=control  force + store a bucket (eligible terms only)
//      ?lp_split=reset                        clear this family's stored bucket
//      ?lp_split_debug=1                      log decisions to the console
//      ?lp_split_debug=dry                    log, store the bucket, but do NOT redirect
//
// Event (RudderStack -> Amplitude), identical in shape to weight concerns:
//   Experiment Viewed { experiment_name, variation, landing_page,
//                       keyword_group, utm_term }
//   keyword_group is the group on both arms (path on variant pages, utm_term
//   match on control).
(function () {
  if (window.__clpSplitRan) return;
  window.__clpSplitRan = true;

  var COOKIE_DAYS = 30;
  var VARIANT_ROOT = "/landing-pages/";
  var LP_VARIANT_PARAM = "lp_variant";
  var FAMILIES = {
    "heart-health": {
      experiment: "lp-heart-health-utm-v1",
      control: "/landing-page/online-heart-health-nutritionist",
      bucketKey: "lp_heart_health_utm_v1"
    },
    "diabetes": {
      experiment: "lp-diabetes-utm-v1",
      control: "/landing-page/diabetes",
      bucketKey: "lp_diabetes_utm_v1"
    },
    "pcos": {
      experiment: "lp-pcos-utm-v1",
      control: "/landing-page/pcos",
      bucketKey: "lp_pcos_utm_v1"
    }
  };

  // ======================================================================
  // Keyword lists: family -> group (= variant page slug) -> exact terms.
  // ======================================================================
  var KEYWORDS = {
    "heart-health": {
      "diet": [
        "heart healthy diet",
        "heart healthy foods",
        "heart healthy diets"
      ],
      "cholesterol": [
        "diet to lower cholesterol",
        "low cholesterol diet",
        "low cholesterol meals",
        "high cholesterol diet",
        "cholesterol lowering diet",
        "foods to lower cholesterol",
        "foods to help lower cholesterol",
        "high cholesterol diet meal plan",
        "diet for high cholesterol",
        "lower cholesterol diet",
        "high cholesterol foods",
        "best diet for high cholesterol",
        "best diet to lower cholesterol",
        "low cholesterol diet plan",
        "diets to lower cholesterol",
        "diet to reduce cholesterol",
        "what is a low cholesterol diet",
        "foods low in cholesterol",
        "cholesterol reducing diet",
        "how to lower ldl cholesterol",
        "how to lower cholesterol",
        "how to lower cholesterol without medication",
        "how to bring cholesterol down",
        "how to reduce cholesterol in 7 days",
        "how can i lower my cholesterol",
        "how to lower cholesterol with diet",
        "how to reduce cholesterol in 30 days",
        "how to lower cholesterol with diet and exercise"
      ],
      "triglycerides": [
        "how to lower triglycerides",
        "triglycerides high"
      ]
    },
    "diabetes": {
      "diet": [
        "diabetic meal plan",
        "diabetic diet",
        "type 1 diabetes diet",
        "diabetes diet",
        "free diabetic diet plan",
        "diet for type 2 diabetes",
        "diabetes diet plan",
        "diabetic diet for beginners",
        "how to lower a1c",
        "diabetic diet plan",
        "7 day diet plan for diabetic patients",
        "mediterranean diet for diabetes",
        "best diabetic diet"
      ],
      "food-list": [
        "type 2 diabetes food list",
        "food for diabetics",
        "diabetic food list"
      ],
      "dietitian": [
        "diabetes dietician"
      ]
    },
    "pcos": {
      "dietitian": [
        "pcos nutritionist",
        "pcos dietitian",
        "pcos dietician",
        "pcos dietitian near me",
        "dietitian for pcos",
        "dietician for pcos",
        "pcos nutritionist near me",
        "pcos dietician near me"
      ],
      "diet": [
        "pcos diet",
        "diet for pcos",
        "pcos meal plan",
        "pcos diet plan",
        "pcos diet meal plan",
        "pcos apps",
        "pcos cookbook",
        "pcos diet app",
        "foods to avoid with pcos",
        "best diet for pcos",
        "7 day pcos diet plan pdf",
        "best pcos diet",
        "free pcos diet plan",
        "what is the pcos diet"
      ],
      "weight-loss": [
        "pcos weight loss",
        "pcos diet for weight loss",
        "how to lose weight with pcos",
        "pcos weight loss plan",
        "weight loss with pcos",
        "diet for pcos weight loss"
      ],
      "treatment": [
        "pcos treatment",
        "pcos specialist near me",
        "how to help pcos",
        "pcos",
        "pcos specialists",
        "how to fix pcos",
        "pcos treatment options",
        "pcos treatment near me"
      ]
    }
  };

  // --- which page is this? ---
  var path = window.location.pathname.replace(/\/+$/, "");
  var family = null;
  var pageGroup = null; // set on variant pages only
  for (var name in FAMILIES) {
    if (!Object.prototype.hasOwnProperty.call(FAMILIES, name)) continue;
    if (path === FAMILIES[name].control) { family = name; break; }
    var prefix = VARIANT_ROOT + name + "/";
    if (path.indexOf(prefix) === 0) {
      var slug = path.slice(prefix.length);
      if (Object.prototype.hasOwnProperty.call(KEYWORDS[name], slug)) {
        family = name;
        pageGroup = slug;
      }
      break;
    }
  }
  if (!family) return;
  var spec = FAMILIES[family];
  var onControl = pageGroup === null;

  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    params = { get: function () { return null; } };
  }
  var debugMode = params.get("lp_split_debug");
  var debug = debugMode === "1" || debugMode === "dry";
  function log(msg, data) {
    if (debug && window.console) console.log("[lp-split] " + msg, data === undefined ? "" : data);
  }

  // Google Ads sends spaces as '+'; URLSearchParams already decoded them.
  // Same normalize() as weight-concerns-split.js.
  function normalize(term) {
    return String(term)
      .toLowerCase()
      .replace(/[‘’“”]/g, "'")  // smart quotes
      .replace(/[+\[\]"]/g, " ")                    // Ads match-type chars
      .replace(/[^a-z0-9\s'\-]/g, " ")              // punctuation -> space
      .replace(/\s+/g, " ")                         // collapse whitespace
      .trim();
  }
  function resolve(term) {
    if (!term) return null;
    var groups = KEYWORDS[family];
    for (var group in groups) {
      if (!Object.prototype.hasOwnProperty.call(groups, group)) continue;
      var list = groups[group];
      for (var i = 0; i < list.length; i++) {
        if (normalize(list[i]) === term) return group;
      }
    }
    return null;
  }

  // --- sticky bucket: localStorage first, cookie as fallback ---
  var STORAGE_KEY = spec.bucketKey;
  function readCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie =
      name + "=" + encodeURIComponent(value) +
      ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }
  function isBucket(v) {
    return v === "control" || v === "variant";
  }
  function getBucket() {
    var v = null;
    try { v = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!isBucket(v)) {
      try { v = readCookie(STORAGE_KEY); } catch (e) { v = null; }
    }
    return isBucket(v) ? v : null;
  }
  function setBucket(v) {
    try { window.localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
    try { writeCookie(STORAGE_KEY, v, COOKIE_DAYS); } catch (e) {}
  }
  function clearBucket() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    try { writeCookie(STORAGE_KEY, "", -1); } catch (e) {}
  }

  // --- eligibility: resolve BEFORE assignment or exposure on either arm ---
  var rawTerm = params.get("utm_term");
  var term = rawTerm ? normalize(rawTerm) : "";
  var termGroup = resolve(term);

  // Reset works even without an eligible term. Forced buckets below cannot
  // enroll an otherwise ineligible visit.
  var force = params.get("lp_split");
  if (force === "reset") {
    clearBucket();
    log("bucket cleared", STORAGE_KEY);
  }
  if (!termGroup) {
    log("outside experiment", { family: family, utm_term: term });
    if (!onControl) {
      var standard = spec.control + window.location.search + window.location.hash;
      log("returning to standard landing page", standard);
      if (debugMode !== "dry") window.location.replace(standard);
    }
    return;
  }
  if (isBucket(force)) {
    setBucket(force);
    log("bucket forced", force);
  }

  // --- destination for the variant arm ---
  // Every inbound param is kept so gclid / utm_* / other click IDs survive;
  // a stale lp_variant is replaced with the resolved group.
  function buildDestination(group) {
    var qs = window.location.search;
    var hash = window.location.hash;
    var kept = [];
    if (qs && qs.length > 1) {
      var pairs = qs.substring(1).split("&");
      for (var i = 0; i < pairs.length; i++) {
        if (!pairs[i]) continue;
        if (pairs[i].split("=")[0] === LP_VARIANT_PARAM) continue;
        kept.push(pairs[i]);
      }
    }
    kept.push(LP_VARIANT_PARAM + "=" + encodeURIComponent(group));
    return VARIANT_ROOT + family + "/" + group + "?" + kept.join("&") + hash;
  }

  function track(variation) {
    var props = {
      experiment_name: spec.experiment,
      variation: variation,
      landing_page: path,
      keyword_group: onControl ? termGroup : pageGroup,
      utm_term: term || null
    };
    function send(attempts) {
      attempts = attempts || 0;
      var ra = window.rudderanalytics;
      if (ra && typeof ra.track === "function") {
        ra.track("Experiment Viewed", props);
        log("tracked", props);
      } else if (attempts < 40) {
        setTimeout(function () { send(attempts + 1); }, 250);
      } else {
        log("rudderanalytics never became available; event dropped", props);
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { send(0); });
    } else {
      send(0);
    }
  }

  // --- control: assign, redirect or track (runs pre-paint from the head) ---
  if (onControl) {
    var bucket = getBucket();
    if (!bucket) {
      bucket = Math.random() < 0.5 ? "variant" : "control";
      setBucket(bucket);
      log("assigned", bucket);
    } else {
      log("existing bucket", bucket);
    }
    if (bucket === "variant") {
      var dest = buildDestination(termGroup);
      log("resolved", { utm_term: term, group: termGroup });
      log("redirecting", dest);
      if (debugMode === "dry") { log("dry run, not redirecting"); return; }
      window.location.replace(dest);
      return; // the variant page fires the event on arrival
    }
    track("control");
    return;
  }

  // --- variant pages: only count eligible visitors the control sent here ---
  var stored = getBucket();
  if (stored !== "variant") {
    log("on variant page without a variant bucket; not tracking", stored);
    return;
  }
  track("variant");
})();
