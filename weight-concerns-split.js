// Weight Concerns LP — approved 100% rollout, 2026-11-13.
// Eligible groups route to their personalized variant regardless of old buckets.
// Fitness and the four excluded normalized diet keywords stay on control.
// Diet ships only inside the Weight_Loss and MealPlan ad groups; the Google Ads
// final URL carries the ad group id in utm_content. Other groups ignore it.
// The same script must load before the legacy -b router and on all group pages.
// Preserve query/hash, GTM redirect stash and existing variant exposure contract.
// wc_split=control no longer overrides rollout; reset and wc_debug=dry remain.
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

  // Diet/meal plan rollout is limited to these Google Ads ad groups
  // (utm_content = ad group id): Weight_Loss and MealPlan, in that order.
  // Any other or missing id stays on
  // the standard page with no exposure. A new ad group needs its id added here.
  var DIET_AD_GROUPS = ['185376731406', '186405763145'];

  var EXCLUDED_TERMS = [
    'intermittent fasting meal plan', 'intermittent fasting',
    'low fat diet', 'lose 10 pounds in a month'
  ];
  function resolve(term) {
    if (EXCLUDED_TERMS.indexOf(term) !== -1) return { slug: null, method: "excluded" };
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
  // Retain Fitness in the resolver so exact keywords cannot fall through to
  // insurance/dietitian, then retire its routing and experiment exposure.
  if (result.slug === "fitness") result = { slug: null, method: "fitness-retired" };
  var adGroup = String(params.get("utm_content") || "").replace(/\s+/g, "");
  if (result.slug === "diet" && DIET_AD_GROUPS.indexOf(adGroup) === -1) {
    result = { slug: null, method: "diet-ad-group-excluded" };
  }

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
  // Control reports the group its utm_term resolved to, so both arms can be
  // broken down by keyword_group.
  function keywordGroup() {
    if (onVariantGroup) return path.slice(VARIANT_GROUP_PREFIX.length).split("/")[0] || null;
    return result.slug || null;
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

  // Route every eligible control/legacy/mismatched-page visit to its group.
  // Old assignments and QA force-control cannot keep a visitor in the retired arm.
  if (onControl || onVariantEntry || path !== VARIANT_GROUP_PREFIX + result.slug) {
    setBucket("variant");
    var dest = buildDestination(result.slug);
    log("redirecting rollout", dest);
    if (debugMode === "dry") return;
    stashForGtm(result, term);
    window.location.replace(dest);
    return;
  }

  // --- variant group pages: only count eligible visitors we sent here ---
  var stored = getBucket();
  if (stored !== "variant") {
    log("on variant page without a variant bucket; not tracking", stored);
    return;
  }
  track("variant");
})();
