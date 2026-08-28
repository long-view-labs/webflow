// Weight Concerns LP — utm_term keyword A/B test
// On /landing-page/weight-concerns: looks up utm_term in the keyword map;
// matched visitors are split 50/50 (sticky per browser via localStorage):
//   "personalized" -> redirected to the keyword-cluster variation
//   "control"      -> stays on the default page
// Unmatched / missing utm_term: no assignment, no redirect.
// The full query string is preserved on redirect so global.js UTM tracking
// and signup attribution keep working.
//
// On BOTH the default page and the variation pages it fires the
// "Experiment Viewed" RudderStack event for assigned visitors
// (same pattern as paid-tt.js / paid-tt-tracking.js).
//
// Load synchronously in the HEAD of the landing-page template(s) so the
// redirect happens before first paint. Safe on every other template item —
// path guards make it inert.
//
// Keyword map generated from the "utm_term keywords" tab of the
// "weight concerns utm-based LP test" Google Sheet (2026-08-25).
// NOTE: "free weight loss programs" appears under both insurance and
// diet/meal plan in the sheet — mapped to insurance pending confirmation.
(function () {
  var EXPERIMENT = "lp-weight-concerns-utm-personalization";
  var STORAGE_KEY = "wc_lp_variant";
  var SOURCE_PATH = "/landing-page/weight-concerns";
  var DEST_PREFIX = "/landing-pages/weight-concerns/";

    var KEYWORD_TO_GROUP = {
    // insurance (4 keywords)
    "free weight loss programs": "insurance",
    "insurance covered weight loss": "insurance",
    "weight loss covered by insurance": "insurance",
    "weight loss programs covered by insurance": "insurance",
    // fitness (9 keywords)
    "fitness coach near me": "fitness",
    "health coach": "fitness",
    "holistic health coach": "fitness",
    "online personal trainer": "fitness",
    "personal trainer": "fitness",
    "personal trainer and nutritionist": "fitness",
    "personal trainer covered by insurance": "fitness",
    "personal trainer near me": "fitness",
    "wellness coach": "fitness",
    // glp1 (37 keywords)
    "glp 1": "glp1",
    "glp 1 covered by cigna": "glp1",
    "glp 1 covered by insurance": "glp1",
    "glp 1 diet": "glp1",
    "glp 1 diet plan": "glp1",
    "glp 1 diet plan pdf": "glp1",
    "glp 1 dietitian near me": "glp1",
    "glp 1 drugs": "glp1",
    "glp 1 food tracker app": "glp1",
    "glp 1 insurance": "glp1",
    "glp 1 insurance coverage": "glp1",
    "glp 1 online with insurance": "glp1",
    "glp 1 patches": "glp1",
    "glp 1 through insurance": "glp1",
    "glp 1 with insurance": "glp1",
    "glp diet": "glp1",
    "glp diet plan": "glp1",
    "glp1 covered by insurance": "glp1",
    "glp1 diet": "glp1",
    "glp1 diet plan": "glp1",
    "glp1 insurance coverage": "glp1",
    "glp1 patch": "glp1",
    "glp1 with insurance": "glp1",
    "how can i get glp 1 with insurance": "glp1",
    "how to get glp 1 covered by insurance": "glp1",
    "insurance covered glp 1": "glp1",
    "meal plan for zepbound": "glp1",
    "mounjaro diet plan": "glp1",
    "mounjaro weight loss diet plan": "glp1",
    "online glp 1 with insurance": "glp1",
    "online glp1 that takes insurance": "glp1",
    "telehealth for glp 1": "glp1",
    "weight loss injections covered by insurance": "glp1",
    "weight loss medication covered by insurance": "glp1",
    "what insurance covers glp 1 for weight loss": "glp1",
    "zepbound diet": "glp1",
    "zepbound with insurance": "glp1",
    // bariatric (12 keywords)
    "6 month diet before weight loss surgery": "bariatric",
    "bariatric diet": "bariatric",
    "bariatric dietician near me": "bariatric",
    "bariatric dietitian": "bariatric",
    "bariatric dietitian near me": "bariatric",
    "bariatric meal plan": "bariatric",
    "bariatric meals": "bariatric",
    "bariatric nutritionist": "bariatric",
    "bariatric nutritionist near me": "bariatric",
    "bariatric support group": "bariatric",
    "bariatric surgery diet plan": "bariatric",
    "nutritionist for bariatric surgery": "bariatric",
    // dietitian (12 keywords)
    "best dietician for weight loss": "dietitian",
    "best online dietitian for weight loss": "dietitian",
    "dietician for weight loss": "dietitian",
    "dietician near me for weight loss": "dietitian",
    "dietician to lose weight": "dietitian",
    "nutritionist for weight loss": "dietitian",
    "nutritionist or dietitian for weight loss near me": "dietitian",
    "online nutritionist for weight loss": "dietitian",
    "weight loss coach": "dietitian",
    "weight loss dietitian": "dietitian",
    "weight loss nutritionist": "dietitian",
    "weight loss nutritionist near me": "dietitian",
    // diet (30 keywords)
    "1500 calorie meal plan": "diet",
    "best diet to lose belly fat": "diet",
    "best meal planning app": "diet",
    "calorie meal plan": "diet",
    "clean eating meal plan": "diet",
    "diet plan for weight loss": "diet",
    "free meal planning app": "diet",
    "healthy eating plan": "diet",
    "healthy meals": "diet",
    "healthy meals for weight loss": "diet",
    "high protein diet": "diet",
    "high protein low carb meals": "diet",
    "intermittent fasting": "diet",
    "intermittent fasting meal plan": "diet",
    "lose 10 pounds in a month": "diet",
    "low carb diet": "diet",
    "low fat diet": "diet",
    "meal plan": "diet",
    "meal plan based on macros": "diet",
    "meal plan for weight loss": "diet",
    "meal plan to lose weight": "diet",
    "meal planning app": "diet",
    "meal plans": "diet",
    "meal plans for weight loss": "diet",
    "meal prep ideas": "diet",
    "nutrition plan for weight loss": "diet",
    "weight loss meal plan": "diet",
    "weight loss meal plans": "diet",
    "weight loss nutrition plan": "diet",
    "weight loss programs": "diet",
    // macros (38 keywords)
    "best app for calorie counting": "macros",
    "best app to track macros": "macros",
    "best calorie counter app": "macros",
    "best calorie tracker app": "macros",
    "best calorie tracking app": "macros",
    "best diet apps": "macros",
    "best food tracking app": "macros",
    "best free calorie tracker app": "macros",
    "best free calorie tracking app": "macros",
    "best free food tracking app": "macros",
    "best free weight loss apps": "macros",
    "best meal tracking app": "macros",
    "best nutrition tracker app": "macros",
    "calorie counter": "macros",
    "calorie counting app free": "macros",
    "calorie deficit calculator": "macros",
    "calorie tracker app": "macros",
    "calorie tracking app": "macros",
    "dieting apps": "macros",
    "easiest food tracking app": "macros",
    "fasting app": "macros",
    "food tracker": "macros",
    "food tracker app": "macros",
    "food tracker app free": "macros",
    "free calorie counter": "macros",
    "free calorie counter app": "macros",
    "free calorie deficit calculator": "macros",
    "free calorie tracker": "macros",
    "free calorie tracker app": "macros",
    "free fasting app": "macros",
    "free food tracker app": "macros",
    "free intermittent fasting app": "macros",
    "free macro tracking app": "macros",
    "free weight loss apps": "macros",
    "how many calories should i eat a day": "macros",
    "macro tracking app": "macros",
    "weight loss apps": "macros",
    "weight loss apps free": "macros",
    };

    var GROUP_TO_PATH = {
    insurance: "/landing-pages/weight-concerns/insurance",
    fitness: "/landing-pages/weight-concerns/fitness",
    glp1: "/landing-pages/weight-concerns/glp1",
    bariatric: "/landing-pages/weight-concerns/bariatric",
    dietitian: "/landing-pages/weight-concerns/dietitian",
    diet: "/landing-pages/weight-concerns/diet",
    macros: "/landing-pages/weight-concerns/macros",
    };

  function getVariant() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setVariant(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }
  function currentGroup() {
    try {
      var raw = new URLSearchParams(window.location.search).get("utm_term");
      if (!raw) return null;
      var term = raw.toLowerCase().replace(/\s+/g, " ").trim();
      return KEYWORD_TO_GROUP[term] || null;
    } catch (e) { return null; }
  }

  var path = window.location.pathname.replace(/\/+$/, "");
  var onSource = path === SOURCE_PATH;
  var onDestination = path.indexOf(DEST_PREFIX) === 0;

  // --- assignment + redirect (source page only, before paint) ---
  if (onSource) {
    var group = currentGroup();
    if (group && GROUP_TO_PATH[group]) {
      var variant = getVariant();
      if (variant !== "personalized" && variant !== "control") {
        variant = Math.random() < 0.5 ? "personalized" : "control";
        setVariant(variant);
      }
      if (variant === "personalized") {
        window.location.replace(GROUP_TO_PATH[group] + window.location.search);
        return; // skip tracking; it fires on the destination page instead
      }
    }
  }

  // --- experiment tracking (default page + variation pages) ---
  if (onSource || onDestination) {
    document.addEventListener("DOMContentLoaded", function () {
      var variant = getVariant();
      if (variant !== "personalized" && variant !== "control") return;
      // Only track visitors actually in the experiment: control visitors on
      // the source page with a mapped keyword, or personalized visitors on a
      // variation page.
      var inExperiment = onDestination || (onSource && !!currentGroup());
      if (!inExperiment) return;
      if (window.rudderanalytics && window.rudderanalytics.ready) {
        window.rudderanalytics.ready(function () {
          window.rudderanalytics.track("Experiment Viewed", {
            experiment_name: EXPERIMENT,
            variation: variant,
            keyword_group: onDestination
              ? path.slice(DEST_PREFIX.length)
              : currentGroup(),
          });
        });
      }
    });
  }
})();
