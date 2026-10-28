// Weight Concerns LP — 50/50 split test (control vs the utm_term-personalized pages)
//
// CONTROL  /landing-page/weight-concerns   (CMS item on landing-page/{template})
// VARIANT  the seven group pages under /landing-pages/weight-concerns/{group}
//          (glp1, bariatric, macros, insurance, fitness, dietitian, diet).
//
// Only visitors whose utm_term resolves to one of those seven groups enter
// the experiment. Eligible control-URL visitors are bucketed once (sticky
// per browser via localStorage, cookie fallback) and split 50/50:
//   "variant" -> resolve utm_term to a group RIGHT HERE and location.replace()
//                straight to that group page before first paint (single hop).
//   "control" -> stays, fires Experiment Viewed
// Missing/unmatched terms stay on the standard control URL, or return there
// from a variant URL, without assignment or Experiment Viewed. Existing
// buckets remain stored for a later eligible visit; they do not bypass this
// eligibility gate. Group pages fire Experiment Viewed only for eligible
// terms with a stored "variant" bucket. The legacy -b entry never fires it.
//
// KEYWORD MAP: GROUP_PRIORITY, KEYWORDS, PATTERNS and normalize() below are
// copied VERBATIM from Alexander Litvinov's inline router on -b (captured
// 2026-10-19). This file is the live copy for ad traffic through the
// control; his router on -b still handles matched legacy/direct links. Keep
// the two in step, or retire his and treat this file as the single source.
// The redirect reproduces his destination URL exactly (query string kept,
// lp_variant={group} appended) and writes his sessionStorage stash, so the
// GTM lp_utm_redirect arrival event on the group pages keeps firing unchanged.
//
// Where it loads (same file, path guards make it inert elsewhere):
//   1. landing-page-head.html  -> landing-page/{template} HEAD, synchronous,
//      so the redirect happens before paint. Inert on dietitian-b, diabetes
//      and every other template item.
//   2. weight-concerns-variant-footer.html -> deferred, pasted on each of the
//      eight static variant pages (-b + seven group pages); fires the
//      variant-side event or returns unmatched legacy traffic to control.
//      __wcSplitRan keeps a double include harmless.
//
// QA:  ?wc_split=variant | ?wc_split=control  force + store an eligible bucket
//      ?wc_split=reset                         clear the stored bucket
//      ?wc_debug=1                             log decisions to the console
//      ?wc_debug=dry                           log, store the bucket, but do NOT redirect
//
// Event (RudderStack -> Amplitude):
//   Experiment Viewed { experiment_name, variation, landing_page,
//                       keyword_group, utm_term }
(function () {
  if (window.__wcSplitRan) return;
  window.__wcSplitRan = true;

  var EXPERIMENT = "lp-weight-concerns-b";
  var STORAGE_KEY = "wc_b_variant";
  var COOKIE_DAYS = 30;
  var CONTROL_PATH = "/landing-page/weight-concerns";
  var VARIANT_ENTRY = "/landing-pages/weight-concerns-b";
  var VARIANT_GROUP_PREFIX = "/landing-pages/weight-concerns/";
  // Alexander's router contract (must match his script on -b):
  var LP_VARIANT_PARAM = "lp_variant";
  var LP_DEBUG_PARAM = "lp_debug";
  var LP_STASH_KEY = "lp_wc_redirect";

  var path = window.location.pathname.replace(/\/+$/, "");
  var onControl = path === CONTROL_PATH;
  var onVariantEntry = path === VARIANT_ENTRY;
  var onVariantGroup = path.indexOf(VARIANT_GROUP_PREFIX) === 0;
  if (!onControl && !onVariantEntry && !onVariantGroup) return;

  var params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    params = { get: function () { return null; } };
  }
  var debugMode = params.get("wc_debug");
  var debug = debugMode === "1" || debugMode === "dry";
  function log(msg, data) {
    if (debug && window.console) console.log("[wc-split] " + msg, data === undefined ? "" : data);
  }

  // ======================================================================
  // Keyword map — verbatim from Alexander's -b router. Edit there AND here.
  // ======================================================================
  var GROUP_PRIORITY = ['glp1', 'bariatric', 'macros', 'insurance', 'fitness', 'dietitian', 'diet'];

  var KEYWORDS = {
    'glp1': [
      'glp 1',
      'glp 1 covered by cigna',
      'glp 1 covered by insurance',
      'glp 1 diet',
      'glp 1 diet plan',
      'glp 1 diet plan pdf',
      'glp 1 dietitian near me',
      'glp 1 drugs',
      'glp 1 food tracker app',
      'glp 1 insurance',
      'glp 1 insurance coverage',
      'glp 1 online with insurance',
      'glp 1 patches',
      'glp 1 through insurance',
      'glp 1 with insurance',
      'glp diet',
      'glp diet plan',
      'glp1 covered by insurance',
      'glp1 diet',
      'glp1 diet plan',
      'glp1 insurance coverage',
      'glp1 patch',
      'glp1 with insurance',
      'how can i get glp 1 with insurance',
      'how to get glp 1 covered by insurance',
      'insurance covered glp 1',
      'meal plan for zepbound',
      'mounjaro diet plan',
      'mounjaro weight loss diet plan',
      'online glp 1 with insurance',
      'online glp1 that takes insurance',
      'telehealth for glp 1',
      'weight loss injections covered by insurance',
      'weight loss medication covered by insurance',
      'what insurance covers glp 1 for weight loss',
      'zepbound diet',
      'zepbound with insurance',
    ],

    'bariatric': [
      '6 month diet before weight loss surgery',
      'bariatric diet',
      'bariatric dietician near me',
      'bariatric dietitian',
      'bariatric dietitian near me',
      'bariatric meal plan',
      'bariatric meals',
      'bariatric nutritionist',
      'bariatric nutritionist near me',
      'bariatric support group',
      'bariatric surgery diet plan',
      'nutritionist for bariatric surgery',
    ],

    'macros': [
      'best app for calorie counting',
      'best app to track macros',
      'best calorie counter app',
      'best calorie tracker app',
      'best calorie tracking app',
      'best diet apps',
      'best food tracking app',
      'best free calorie tracker app',
      'best free calorie tracking app',
      'best free food tracking app',
      'best free weight loss apps',
      'best meal tracking app',
      'best nutrition tracker app',
      'calorie counter',
      'calorie counting app free',
      'calorie deficit calculator',
      'calorie tracker app',
      'calorie tracking app',
      'dieting apps',
      'easiest food tracking app',
      'fasting app',
      'food tracker',
      'food tracker app',
      'food tracker app free',
      'free calorie counter',
      'free calorie counter app',
      'free calorie deficit calculator',
      'free calorie tracker',
      'free calorie tracker app',
      'free fasting app',
      'free food tracker app',
      'free intermittent fasting app',
      'free macro tracking app',
      'free weight loss apps',
      'how many calories should i eat a day',
      'macro tracking app',
      'weight loss apps',
      'weight loss apps free',
    ],

    'insurance': [
      'free weight loss programs',
      'insurance covered weight loss',
      'weight loss covered by insurance',
      'weight loss programs covered by insurance',
    ],

    'fitness': [
      'fitness coach near me',
      'health coach',
      'holistic health coach',
      'online personal trainer',
      'personal trainer',
      'personal trainer and nutritionist',
      'personal trainer covered by insurance',
      'personal trainer near me',
      'wellness coach',
    ],

    'dietitian': [
      'best dietician for weight loss',
      'best online dietitian for weight loss',
      'dietician for weight loss',
      'dietician near me for weight loss',
      'dietician to lose weight',
      'nutritionist for weight loss',
      'nutritionist or dietitian for weight loss near me',
      'online nutritionist for weight loss',
      'weight loss coach',
      'weight loss dietitian',
      'weight loss nutritionist',
      'weight loss nutritionist near me',
    ],

    'diet': [
      '1500 calorie meal plan',
      'best diet to lose belly fat',
      'best meal planning app',
      'calorie meal plan',
      'clean eating meal plan',
      'diet plan for weight loss',
      'free meal planning app',
      'healthy eating plan',
      'healthy meals',
      'healthy meals for weight loss',
      'high protein diet',
      'high protein low carb meals',
      'intermittent fasting',
      'intermittent fasting meal plan',
      'lose 10 pounds in a month',
      'low carb diet',
      'low fat diet',
      'meal plan',
      'meal plan based on macros',
      'meal plan for weight loss',
      'meal plan to lose weight',
      'meal planning app',
      'meal plans',
      'meal plans for weight loss',
      'meal prep ideas',
      'nutrition plan for weight loss',
      'weight loss meal plan',
      'weight loss meal plans',
      'weight loss nutrition plan',
      'weight loss programs',
    ]

  };

  // Fallback patterns, evaluated in GROUP_PRIORITY order
  var PATTERNS = {
    glp1: /glp[\s\-]?1|\bglp\b|zepbound|mounjaro|wegovy|ozempic|semaglutide|tirzepatide|weight loss injection|weight loss shot/,
    bariatric: /bariatric|gastric (bypass|sleeve)|gastric|\bsleeve\b|weight loss surgery|before surgery/,
    macros: /\bmacro|calorie (counter|counting|tracker|tracking|deficit)|counting calories|food (tracker|tracking)|meal tracking|calorie tracker|calories should i eat|fasting app|tracker app|tracking app|counter app/,
    insurance: /insurance|covered by|copay|co-pay|out of pocket|\bfree weight loss program/,
    fitness: /personal trainer|fitness coach|health coach|wellness coach|holistic health|\bgym\b|workout/,
    dietitian: /dietitian|dietician|nutritionist|weight loss coach/,
    diet: /meal plan|diet plan|meal prep|meal planning|healthy (meals|eating)|low carb|low fat|high protein|intermittent fasting|clean eating|weight loss program|lose \d+ (pounds|lbs)|belly fat|\bdiet\b/
  };

  // Google Ads sends spaces as '+'; URLSearchParams already decoded them.
  function normalize(term) {
    return String(term)
      .toLowerCase()
      .replace(/[\u2018\u2019\u201c\u201d]/g, "'")  // smart quotes
      .replace(/[+\[\]"]/g, ' ')                    // Ads match-type chars
      .replace(/[^a-z0-9\s'\-]/g, ' ')              // punctuation -> space
      .replace(/\s+/g, ' ')                         // collapse whitespace
      .trim();
  }

  var lookupCache = null;
  function buildLookup() {
    if (lookupCache) return lookupCache;
    var lookup = {};
    for (var i = 0; i < GROUP_PRIORITY.length; i++) {
      var slug = GROUP_PRIORITY[i];
      var list = KEYWORDS[slug] || [];
      for (var j = 0; j < list.length; j++) {
        var key = normalize(list[j]);
        if (!Object.prototype.hasOwnProperty.call(lookup, key)) lookup[key] = slug;
      }
    }
    lookupCache = lookup;
    return lookup;
  }

  function resolve(term) {
    if (!term) return { slug: null, method: "no-term" };
    var lookup = buildLookup();
    if (Object.prototype.hasOwnProperty.call(lookup, term)) {
      return { slug: lookup[term], method: "exact" };
    }
    for (var i = 0; i < GROUP_PRIORITY.length; i++) {
      var slug = GROUP_PRIORITY[i];
      var re = PATTERNS[slug];
      if (re && re.test(term)) return { slug: slug, method: "fuzzy" };
    }
    return { slug: null, method: "no-match" };
  }

  // --- sticky bucket: localStorage first, cookie as fallback ---
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
    if (!isBucket(v)) v = readCookie(STORAGE_KEY);
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
  var result = resolve(term);

  // Reset remains available even without an eligible term. Forced buckets
  // below cannot enroll an otherwise ineligible visit.
  var force = params.get("wc_split");
  if (force === "reset") {
    clearBucket();
    log("bucket cleared");
  }
  if (!result.slug) {
    log("outside experiment", result);
    if (!onControl) {
      var standard = CONTROL_PATH + window.location.search + window.location.hash;
      log("returning to standard landing page", standard);
      if (debugMode !== "dry") window.location.replace(standard);
    }
    return;
  }

  // --- QA overrides (eligible visits only) ---
  if (isBucket(force)) {
    setBucket(force);
    log("bucket forced", force);
  }

  // --- destination for the variant arm ---
  // Group page: same URL Alexander's router would build (every inbound param
  // kept so gclid / utm_* attribution survives, his lp_variant / lp_debug
  // stripped, lp_variant={group} appended). Only eligible groups reach here.
  function buildDestination(slug) {
    var qs = window.location.search;
    var hash = window.location.hash;
    var kept = [];
    if (qs && qs.length > 1) {
      var pairs = qs.substring(1).split("&");
      for (var i = 0; i < pairs.length; i++) {
        if (!pairs[i]) continue;
        var key = pairs[i].split("=")[0];
        if (key === LP_VARIANT_PARAM || key === LP_DEBUG_PARAM) continue;
        kept.push(pairs[i]);
      }
    }
    kept.push(LP_VARIANT_PARAM + "=" + encodeURIComponent(slug));
    return VARIANT_GROUP_PREFIX + slug + "?" + kept.join("&") + hash;
  }
  function stashForGtm(result, term) {
    try {
      window.sessionStorage.setItem(LP_STASH_KEY, JSON.stringify({
        event: "lp_utm_redirect",
        lp_variant: result.slug,
        lp_match_method: result.method,
        lp_utm_term: term
      }));
    } catch (e) { /* private mode / storage disabled */ }
  }

  // --- event properties ---
  function keywordGroup() {
    if (onVariantGroup) return path.slice(VARIANT_GROUP_PREFIX.length).split("/")[0] || null;
    return null;
  }
  function track(variation) {
    var props = {
      experiment_name: EXPERIMENT,
      variation: variation,
      landing_page: path,
      keyword_group: keywordGroup(),
      utm_term: term || null,
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
      var dest = buildDestination(result.slug);
      log("utm_term", rawTerm);
      log("resolved", result);
      log("redirecting", dest);
      if (debugMode === "dry") { log("dry run, not redirecting"); return; }
      stashForGtm(result, term);
      window.location.replace(dest);
      return; // the variant page fires the event on arrival
    }
    track("control");
    return;
  }

  // The legacy entry's inline router sends matched terms to their group.
  // It is no longer an experiment destination, so never count a -b view.
  if (onVariantEntry) return;

  // --- variant group pages: only count eligible visitors we sent here ---
  var stored = getBucket();
  if (stored !== "variant") {
    log("on variant page without a variant bucket; not tracking", stored);
    return;
  }
  track("variant");
})();
