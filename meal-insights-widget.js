(function () {
  var DEFAULT_CONFIG = {
    selector: "[data-meal-insights-widget], .meal-insights-widget",
    replaceContents: true,
    showDebugTabs: false,
    initialScreen: "questionnaire",
    signupUrl: null,
    coverageUrl: null,
    sampleMeal: {
      title: "Green garden salad",
      subtitle: "with grilled chicken and vinaigrette",
    },
    analyzeDelayMs: 1800,
    analyzeMeal: null,
    onEvent: null,
    useMocks: false,
    mockBasePath: ".",
    apiBaseUrl: "https://av3pkd6b23.us-east-2.awsapprunner.com/api",
  };

  var SPECIALTY_MAP = {
    "Help losing weight": "weight_loss",
    "Diabetes or prediabetes": "diabetes",
    "Heart health": "heart_health",
    "High blood pressure": "high_blood_pressure",
    "High cholesterol": "high_cholesterol",
    "GLP-1 support": "glp1",
    "General health": "weight_loss",
    "Other": "weight_loss",
  };

  var QUESTIONS = [
    {
      key: "prioritySpecialty",
      question: "What is the primary health goal or concern we can help you with?",
      multi: false,
      options: [
        "Help losing weight",
        "Diabetes or prediabetes",
        "Heart health",
        "High blood pressure",
        "High cholesterol",
        "GLP-1 support",
        "General health",
        "Other",
      ],
    },
    {
      key: "dietaryRestrictions",
      question: "Do you have any dietary restrictions or allergies?",
      multi: false,
      options: [
        "None",
        "Vegetarian",
        "Vegan",
        "Pescatarian",
        "Gluten free",
        "Nut-free",
        "Kosher",
      ],
    },
    {
      key: "mealContext",
      question: "Anything else you want help with?",
      isTextStep: true,
    },
    {
      key: "mealInput",
      question: "Tell us what you're eating",
      isPromptStep: true,
    },
  ];

  var DEBUG_SCREENS = [
    { id: "questionnaire", label: "Questionnaire" },
    { id: "loading", label: "Loading" },
    { id: "result", label: "Result" },
    { id: "signup", label: "Signup" },
    { id: "intro", label: "Intro" },
  ];

  var STYLE_ID = "nourish-meal-insights-widget-styles";
  var CACHE_KEY = "nourishMealInsightsResult";

  function extendConfig(base, overrides) {
    var next = {};
    var key;

    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        next[key] = base[key];
      }
    }

    if (!overrides) return next;

    for (key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        if (
          key === "sampleMeal" &&
          overrides.sampleMeal &&
          typeof overrides.sampleMeal === "object"
        ) {
          next.sampleMeal = extendConfig(base.sampleMeal, overrides.sampleMeal);
        } else {
          next[key] = overrides[key];
        }
      }
    }

    return next;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function joinClasses(items) {
    return items.filter(Boolean).join(" ");
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    // Load Inter from Google Fonts if not already present
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;540;600;700&display=swap";
      document.head.appendChild(link);
    }

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".nmiw-root{--nmiw-bg:#f6f0e7;--nmiw-panel:#ffffff;--nmiw-panel-soft:#EFEBF9;--nmiw-ink:#191918;--nmiw-copy:#333230;--nmiw-muted:#989591;--nmiw-line:#e5dfd9;--nmiw-accent:#5D33BF;--nmiw-accent-soft:#DFD6F2;--nmiw-accent-bg:#EFEBF9;--nmiw-neutral-50:#F1ECE5;--nmiw-success:#2f8f60;position:relative;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--nmiw-ink)}",
      ".nmiw-shell{background:transparent;border:none;border-radius:0;box-shadow:none;overflow:visible}",
      ".nmiw-stage{padding:10px;max-width:655px;margin:0 auto}",
      ".nmiw-debug{display:flex;gap:8px;flex-wrap:wrap;padding:16px 16px 0;background:transparent}",
      ".nmiw-debug button{appearance:none;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(30,27,24,.86);color:rgba(255,255,255,.72);padding:8px 14px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}",
      ".nmiw-debug button.is-active{background:var(--nmiw-accent);border-color:var(--nmiw-accent);color:#fff}",
      ".nmiw-page-header{text-align:center;margin-bottom:32px;padding:0 16px;max-width:none}",
      ".nmiw-page-header h1{font-family:Tobias,'Iowan Old Style','Times New Roman',serif;font-size:50px;font-weight:400;line-height:60px;letter-spacing:-0.625px;margin:0;color:#333230;white-space:nowrap;font-feature-settings:'lnum' 1,'pnum' 1}",
      ".nmiw-eyebrow{display:inline-flex;align-items:center;gap:8px;background:var(--nmiw-accent-soft);color:var(--nmiw-accent);border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}",
      ".nmiw-title,.nmiw-question{font-family:Inter,system-ui,sans-serif}",
      ".nmiw-title{margin:16px 0 10px;font-size:clamp(32px,4vw,48px);line-height:1.04;letter-spacing:-.03em;font-weight:600}",
      ".nmiw-copy{margin:0;color:var(--nmiw-copy);font-size:16px;line-height:24px;font-weight:400}",
      ".nmiw-grid{display:grid;grid-template-columns:1fr;gap:18px;align-items:stretch}",
      ".nmiw-stack{display:flex;flex-direction:column;gap:16px}",
      ".nmiw-chip-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}",
      ".nmiw-chip{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.72);backdrop-filter:blur(8px);border:1px solid rgba(93,51,191,.12);border-radius:999px;padding:10px 14px;font-size:13px;font-weight:600;color:var(--nmiw-ink)}",
      ".nmiw-card{background:var(--nmiw-panel);border:1px solid rgba(30,27,24,.06);border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(25,25,24,.06),0 4px 12px rgba(25,25,24,.04),0 16px 40px rgba(25,25,24,.08)}",
      ".nmiw-card--hero{display:flex;flex-direction:column;justify-content:space-between;min-height:100%}",
      ".nmiw-preview{background:linear-gradient(160deg,#fff6e8 0%,#fff 48%,#f8ede3 100%);border:1px solid var(--nmiw-line);border-radius:16px;padding:18px}",
      ".nmiw-preview-header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}",
      ".nmiw-preview-badge{display:inline-flex;align-items:center;gap:6px;background:var(--nmiw-accent-soft);color:var(--nmiw-accent);border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}",
      ".nmiw-preview-photo{display:grid;place-items:center;min-height:220px;border-radius:18px;background:linear-gradient(180deg,#f4fbf7 0%,#fff 100%);border:1px solid rgba(47,143,96,.12);overflow:hidden}",
      ".nmiw-preview-photo img{display:block;width:100%;height:100%;object-fit:cover}",
      ".nmiw-meal-emoji{font-size:54px;line-height:1}",
      ".nmiw-meal-title{margin:12px 0 0;font-size:18px;font-weight:700}",
      ".nmiw-meal-subtitle{margin:6px 0 0;font-size:14px;line-height:1.5;color:var(--nmiw-copy)}",
      ".nmiw-insight{margin-top:16px;background:var(--nmiw-panel);border-radius:18px;padding:16px;border:1px solid rgba(30,27,24,.06)}",
      ".nmiw-insight p{margin:0;font-size:15px;line-height:1.6;color:var(--nmiw-copy)}",
      ".nmiw-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:0}",
      ".nmiw-button,.nmiw-button-secondary{appearance:none;border:none;border-radius:12px;padding:12px 20px;min-height:48px;font:inherit;font-size:14px;font-weight:540;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease}",
      ".nmiw-button{background:var(--nmiw-accent);color:#fff;box-shadow:0 4px 4px -4px rgba(25,25,24,.2);backdrop-filter:blur(8px)}",
      ".nmiw-button:hover,.nmiw-button-secondary:hover{transform:translateY(-1px)}",
      '.nmiw-button[disabled],.nmiw-button[aria-disabled="true"]{cursor:not-allowed;opacity:.7;box-shadow:none;transform:none}',
      ".nmiw-button-secondary{background:#fff;color:var(--nmiw-ink);border:1px solid var(--nmiw-line);box-shadow:0 4px 4px -4px rgba(25,25,24,.2)}",
      ".nmiw-button--dark{background:#191918;color:#fff;border-radius:12px;padding:15px 24px;font-size:15px;font-weight:600}",
      ".nmiw-button--dark:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(25,25,24,.18)}",
      ".nmiw-link{appearance:none;border:none;background:none;padding:0;margin:0;font:inherit;font-size:14px;font-weight:700;color:var(--nmiw-accent);cursor:pointer;text-decoration:none}",
      ".nmiw-progress-row{display:flex;align-items:center;gap:12px}",
      ".nmiw-back-chevron{appearance:none;border:none;background:none;padding:0;margin:0;cursor:pointer;color:var(--nmiw-copy);display:flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0}",
      ".nmiw-back-chevron:hover{color:var(--nmiw-accent)}",
      ".nmiw-progress{display:flex;gap:8px;margin:0;flex:1}",
      ".nmiw-progress-bar{flex:1;height:4px;border-radius:8px;background:var(--nmiw-neutral-50);overflow:hidden}",
      ".nmiw-progress-bar span{display:block;height:100%;border-radius:inherit;background:var(--nmiw-accent)}",
      ".nmiw-question-head{display:flex;flex-direction:column;gap:0;align-items:center;margin-bottom:0}",
      ".nmiw-step-kicker{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--nmiw-muted)}",
      ".nmiw-question{margin:0;font-size:30px;line-height:40px;letter-spacing:0;font-weight:500;text-align:left}",
      ".nmiw-subcopy{margin:0;color:var(--nmiw-muted);font-size:14px;line-height:1.5}",
      ".nmiw-screen-card{background:var(--nmiw-panel);border-radius:16px;padding:24px 40px 40px;box-shadow:0 8px 14px rgba(25,25,24,.03);display:flex;flex-direction:column;gap:20px;overflow:clip}.nmiw-screen-card--result{background:transparent;box-shadow:none;padding:24px 0 0}",
      ".nmiw-screen-card--prompt{gap:40px}",
      ".nmiw-option-grid{display:flex;flex-wrap:wrap;gap:10px}",
      ".nmiw-option{appearance:none;border:1px solid var(--nmiw-line);background:#fff;border-radius:999px;padding:13px 18px;font:inherit;font-size:14px;font-weight:500;color:var(--nmiw-copy);cursor:pointer;transition:all .15s ease}",
      ".nmiw-option.is-selected{background:var(--nmiw-accent);border-color:var(--nmiw-accent);color:#fff;box-shadow:0 12px 24px rgba(93,51,191,.18)}",
      ".nmiw-list{display:flex;flex-direction:column;gap:8px;background:transparent;overflow:visible}",
      ".nmiw-list-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;background:#fff;border:1px solid var(--nmiw-line);border-radius:12px;font:inherit;font-size:16px;font-weight:400;color:var(--nmiw-ink);text-align:left;cursor:pointer;box-shadow:0 4px 4px -4px rgba(25,25,24,.1);box-sizing:border-box}",
      ".nmiw-list-item.is-selected{background:var(--nmiw-accent-bg);border-color:var(--nmiw-accent)}",
      ".nmiw-radio{width:20px;height:20px;border-radius:12px;border:1px solid #CBC6C1;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;box-sizing:border-box;box-shadow:0 4px 4px -4px rgba(25,25,24,.1)}",
      ".nmiw-list-item.is-selected .nmiw-radio{border:5.5px solid var(--nmiw-accent);border-radius:48px}",
      ".nmiw-empty{padding:18px 20px;font-size:14px;line-height:1.5;color:var(--nmiw-muted)}",
      ".nmiw-privacy{display:flex;gap:10px;align-items:flex-start;margin-top:18px;padding:14px 16px;border-radius:16px;background:var(--nmiw-panel-soft);font-size:13px;line-height:1.55;color:var(--nmiw-copy)}",
      ".nmiw-photo-drop{display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;min-height:290px;border:2px dashed var(--nmiw-line);border-radius:22px;padding:24px;background:rgba(255,255,255,.68);text-align:center}",
      ".nmiw-photo-drop strong{font-size:18px}",
      ".nmiw-photo-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}",
      ".nmiw-textarea{width:100%;min-height:72px;border:1px solid #e5dfd9;border-radius:12px;padding:12px 16px;background:#fff;color:var(--nmiw-ink);font:inherit;font-size:16px;line-height:24px;resize:vertical;box-sizing:border-box}",
      ".nmiw-textarea::placeholder{color:#989591;font-weight:400}",
      ".nmiw-photo-preview{position:relative;overflow:hidden;min-height:290px;border-radius:22px;background:linear-gradient(180deg,#f4fbf7 0%,#fff 100%);border:1px solid rgba(47,143,96,.18)}",
      ".nmiw-photo-preview img{display:block;width:100%;height:290px;object-fit:cover}",
      ".nmiw-photo-meta{padding:16px 18px;border-top:1px solid rgba(30,27,24,.06)}",
      ".nmiw-photo-ready{position:absolute;top:14px;right:14px;display:inline-flex;align-items:center;gap:6px;background:var(--nmiw-success);color:#fff;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}",
      ".nmiw-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:0}",
      ".nmiw-toolbar.nmiw-toolbar--auto-advance{display:none}",
      ".nmiw-toolbar .nmiw-button{flex:1;min-width:0}",
      ".nmiw-toolbar .nmiw-button-secondary{min-width:104px}",
      ".nmiw-toolbar--stacked{flex-direction:column;gap:20px}",
      ".nmiw-toolbar--stacked .nmiw-button,.nmiw-toolbar--stacked .nmiw-button-secondary{width:100%}",
      ".nmiw-button--upload{color:var(--nmiw-accent);border-color:#dfd6f2}",
      ".nmiw-loading{display:flex;flex-direction:column;align-items:center;gap:32px;min-height:440px;text-align:center;padding:24px 40px 40px}",
      ".nmiw-loading-image-wrap{position:relative;width:128px;height:104px}",
      ".nmiw-loading-thumb{width:96px;height:96px;border-radius:12px;object-fit:cover;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);position:absolute;top:4px;left:16px}",
      ".nmiw-loading-thumb-overlay{position:absolute;top:4px;left:16px;width:96px;height:96px;border-radius:12px;background:rgba(0,0,0,.1)}",
      ".nmiw-loading-emoji{width:96px;height:96px;border-radius:12px;background:#f1ece5;display:flex;align-items:center;justify-content:center;font-size:48px;position:absolute;top:4px;left:16px;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1)}",
      ".nmiw-loading-content{display:flex;flex-direction:column;gap:16px;align-items:center}",
      ".nmiw-loading-status{display:flex;align-items:center;gap:4px;justify-content:center}",
      ".nmiw-loading-status-text{font-size:24px;font-weight:540;line-height:28px;background:linear-gradient(90deg,#5d33bf 0%,#b13385 113.21%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-feature-settings:'lnum' 1,'pnum' 1}",
      ".nmiw-loading-bars{display:flex;gap:16px;align-items:center;justify-content:center;padding:3px 0;width:240px}",
      ".nmiw-loading-bar{width:48px;height:16px;border-radius:8px;background:#ebe5df;animation:nmiw-bar-pulse 1.5s ease infinite}",
      ".nmiw-loading-bar:nth-child(1){opacity:.4;animation-delay:0s}",
      ".nmiw-loading-bar:nth-child(2){opacity:.6;animation-delay:.15s}",
      ".nmiw-loading-bar:nth-child(3){opacity:.8;animation-delay:.3s}",
      ".nmiw-loading-bar:nth-child(4){opacity:1;animation-delay:.45s}",
      "@keyframes nmiw-bar-pulse{0%,100%{opacity:var(--nmiw-bar-base-opacity,.4)}50%{opacity:1}}",
      ".nmiw-loading-subtitle{font-size:16px;line-height:24px;color:#191918;opacity:.6;margin:0}",
      ".nmiw-chat-row{display:flex;align-items:flex-start;gap:8px}",
      ".nmiw-chat-row--user{justify-content:flex-end}",
      ".nmiw-chat-row--bot{justify-content:flex-start}",
      ".nmiw-chat-avatar{flex-shrink:0;width:24px;height:24px;margin-top:4px}",
      ".nmiw-chat-avatar svg{display:block;width:24px;height:24px}",
      ".nmiw-chat-bot-content{flex:1;min-width:0;display:flex;flex-direction:column;gap:16px}",
      ".nmiw-result-layout{display:flex;flex-direction:column;gap:16px}",
      ".nmiw-result-banner{display:flex;flex-direction:column;gap:6px;background:#fff;border-radius:12px 12px 12px 4px;padding:16px;min-height:100px;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.1);justify-content:center}",
      ".nmiw-result-emoji{font-size:36px;line-height:44px;flex-shrink:0}",
      ".nmiw-result-banner-text{display:flex;flex-direction:column;gap:6px;min-width:0}",
      ".nmiw-result-thumb{width:60px;height:60px;border-radius:4px;object-fit:cover;flex-shrink:0;background:#d9d9d9}",
      ".nmiw-result-meal-name{font-size:20px;font-weight:540;line-height:28px;margin:0;color:#191918;font-feature-settings:'lnum' 1,'pnum' 1}",
      ".nmiw-result-macros-inline{display:flex;flex-wrap:wrap;gap:8px;align-items:center}",
      ".nmiw-macro-inline{display:inline-flex;align-items:center;gap:4px;font-size:14px;font-weight:540;color:#191918;font-feature-settings:'lnum' 1,'pnum' 1}",
      ".nmiw-macro-icon-soft{width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}",
      ".nmiw-macro-icon-soft svg{width:20px;height:20px}",
      ".nmiw-overview{font-size:16px;line-height:24px;color:#191918;padding-left:4px}",
      ".nmiw-overview p{margin:0 0 10px}",
      ".nmiw-overview p:last-child{margin-bottom:0}",
      ".nmiw-overview strong{color:#191918}",
      ".nmiw-overview ul{margin:8px 0;padding-left:24px}",
      ".nmiw-overview li{margin-bottom:4px}",
      ".nmiw-opportunity{padding-top:12px}",
      ".nmiw-opportunity-header{display:flex;align-items:center;gap:8px;padding:0 0 4px}",
      ".nmiw-opportunity-icon-wrap{width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}",
      ".nmiw-opportunity-icon-wrap img{width:20px;height:20px}",
      ".nmiw-opportunity-title{font-size:16px;font-weight:540;line-height:24px;color:#191918}",
      ".nmiw-opportunity p{margin:0;font-size:16px;line-height:24px;color:#191918}",
      ".nmiw-dietitian-cta{font-size:16px;line-height:24px;color:#191918;margin:0}",
      ".nmiw-dietitian-cta a{color:#191918;text-decoration:none;font-weight:400}",
      ".nmiw-followup-chips{display:flex;flex-wrap:nowrap;gap:8px;padding-top:8px;overflow-x:auto;-webkit-overflow-scrolling:touch}",
      ".nmiw-followup-chip{appearance:none;border:none;background:#efebf9;color:#5d33bf;border-radius:16px;padding:6px 12px;height:32px;font-size:14px;line-height:20px;font-weight:540;cursor:pointer;font-family:inherit;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;transition:background .15s;text-decoration:none;white-space:nowrap;flex-shrink:0}",
      ".nmiw-followup-chip:hover{background:#dfd6f2}",
      ".nmiw-result-media{background:linear-gradient(180deg,#fbfff9 0%,#fff 100%);border:1px solid rgba(47,143,96,.12);border-radius:22px;overflow:hidden}",
      ".nmiw-result-media img{display:block;width:100%;height:100%;max-height:340px;object-fit:cover}",
      ".nmiw-result-placeholder{display:grid;place-items:center;min-height:320px;padding:20px}",
      ".nmiw-result-copy{display:flex;flex-direction:column;gap:16px}",
      ".nmiw-kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
      ".nmiw-kpi-card{background:var(--nmiw-panel-soft);border-radius:18px;padding:16px;border:1px solid rgba(30,27,24,.04)}",
      ".nmiw-kpi-label{display:block;font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--nmiw-muted)}",
      ".nmiw-kpi-value{display:block;margin-top:8px;font-size:18px;font-weight:700;line-height:1.2;color:var(--nmiw-ink)}",
      ".nmiw-result-text{background:var(--nmiw-panel);border:1px solid rgba(30,27,24,.06);border-radius:16px;padding:20px}",
      ".nmiw-result-text p{margin:0 0 14px;font-size:15px;line-height:1.7;color:var(--nmiw-copy)}",
      ".nmiw-result-text p:last-child{margin-bottom:0}",
      ".nmiw-result-text strong{color:var(--nmiw-ink)}",
      ".nmiw-disclaimer{margin:0;color:var(--nmiw-muted);font-size:13px;line-height:1.55}",
      ".nmiw-signup{display:grid;grid-template-columns:1fr;gap:18px;align-items:start}",
      ".nmiw-benefits{display:flex;flex-direction:column;gap:12px;margin-top:20px}",
      ".nmiw-benefit{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.74);border:1px solid rgba(30,27,24,.06)}",
      ".nmiw-benefit strong{display:block;margin-bottom:4px;font-size:15px}",
      ".nmiw-form-card{background:var(--nmiw-panel);border:1px solid rgba(30,27,24,.06);border-radius:16px;padding:20px;box-shadow:0 1px 2px rgba(25,25,24,.06),0 4px 12px rgba(25,25,24,.04),0 16px 40px rgba(25,25,24,.08)}",
      ".nmiw-field{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}",
      ".nmiw-field label{font-size:13px;font-weight:700;color:var(--nmiw-muted)}",
      ".nmiw-field input{width:100%;height:48px;border:1px solid var(--nmiw-line);border-radius:14px;padding:0 14px;background:#fff;color:var(--nmiw-ink);font:inherit;font-size:15px;box-sizing:border-box}",
      ".nmiw-note{margin-top:14px;font-size:13px;line-height:1.6;color:var(--nmiw-muted)}",
      "@keyframes nmiw-spin{to{transform:rotate(360deg)}}",
      "@media (max-width:991px){.nmiw-title{font-size:34px}}",
      "@media (max-width:600px){.nmiw-stage{max-width:none;padding:10px}.nmiw-page-header h1{font-size:32px;line-height:40px;letter-spacing:-0.32px;white-space:normal}.nmiw-screen-card{padding:32px 24px;box-shadow:0 36px 90px rgba(25,25,24,.05),0 24px 56px rgba(25,25,24,.04),0 12px 28px rgba(25,25,24,.03),0 8px 14px rgba(25,25,24,.03);gap:24px}.nmiw-question{font-size:20px;line-height:28px;font-weight:540;text-align:center}.nmiw-toolbar.nmiw-toolbar--auto-advance{display:flex;flex-direction:column-reverse;align-items:stretch;width:100%}.nmiw-toolbar{flex-direction:column-reverse;align-items:stretch;width:100%}.nmiw-toolbar .nmiw-button,.nmiw-toolbar .nmiw-button-secondary{width:100%}.nmiw-actions{flex-direction:column}.nmiw-actions .nmiw-button,.nmiw-actions .nmiw-button-secondary{width:100%}.nmiw-kpi{grid-template-columns:1fr}.nmiw-result-macros-inline{gap:8px}.nmiw-result-meal-name{font-size:16px}.nmiw-result-thumb{width:48px;height:48px}.nmiw-followup-chips{gap:6px}.nmiw-followup-chip{font-size:13px;padding:6px 12px}}",
    ].join("");

    document.head.appendChild(style);
  }

  function createInitialState(config) {
    return {
      screen: config.initialScreen || "questionnaire",
      stepIndex: 0,
      answers: {
        prioritySpecialty: [],
        dietaryRestrictions: [],
        anythingElseText: "",
        mealContextText: "",
        mealPhoto: null,
        mealPhotoPreviewUrl: "",
        mealPhotoName: "",
        mealPhotoSource: "",
        signupEmail: "",
      },
      result: createPreviewResult(config),
      isBusy: false,
    };
  }

  function createPreviewResult(config) {
    return {
      mealName: "Green garden salad",
      macros: {
        calories: 500,
        fiber: 20,
        protein: 30,
        fats: 10,
        carbs: 15,
      },
      insights: {
        highlight: "Strong protein-and-fiber base for steady energy.",
        swap: "Try swapping the vinaigrette for a lemon-tahini drizzle to add healthy fats without extra sugar.",
        opportunity: "Adding a handful of leafy greens would boost vitamin K and folate while keeping calories in check.",
        overview: "<strong>This meal has a strong protein-and-fiber base</strong>, which is the kind of combination a dietitian would usually lean into for steadier energy.<ul><li>Good protein from grilled chicken</li><li>Complex carbs from quinoa</li><li>Healthy fats from avocado</li></ul>If blood sugar or weight management is a goal, the easiest tweak would be keeping the grain portion moderate and letting the vegetables carry more of the volume.",
      },
      recommendedGoals: ["Why more complex carbs?", "See more about my meal", "What are macros?"],
      photoUrl: "",
    };
  }

  function detectApex() {
    if (window.__nourish_apex) return window.__nourish_apex;

    var hostname = (window.location.hostname || "").toLowerCase();
    if (hostname.indexOf("usenourish.com") !== -1) return "usenourish.com";
    if (hostname.indexOf("nourish.com") !== -1) return "nourish.com";
    return "usenourish.com";
  }

  function getApiBaseUrl(config) {
    if (config && config.apiBaseUrl) return config.apiBaseUrl;
    return "https://app." + detectApex() + "/api";
  }

  function dataUrlToBase64(dataUrl) {
    var idx = dataUrl.indexOf(",");
    return idx !== -1 ? dataUrl.substring(idx + 1) : dataUrl;
  }

  function getSignupUrl(config, state) {
    var raw =
      config.signupUrl || "https://signup." + detectApex() + "/?flow=meal-insights";
    var url;

    try {
      url = new URL(raw, window.location.origin);
    } catch (error) {
      return raw;
    }

    appendTrackingParams(url);

    if (state.answers.signupEmail) {
      url.searchParams.set("email", state.answers.signupEmail);
    }

    var specialty = state.answers.prioritySpecialty || [];
    var restrictions = state.answers.dietaryRestrictions || [];
    var combinedRestrictions = restrictions.filter(function (v) {
      return v && v !== "None" && v !== "None of the above";
    });

    if (specialty.length) {
      url.searchParams.set("mealInsightSpecialty", specialty[0]);
    }

    if (combinedRestrictions.length) {
      url.searchParams.set("mealInsightDietaryRestrictions", combinedRestrictions.join("|"));
    }

    if (state.answers.mealContextText) {
      url.searchParams.set("mealInsightPrompt", state.answers.mealContextText);
    }

    return url.toString();
  }

  function getCoverageUrl(config) {
    var raw =
      config.coverageUrl ||
      "https://signup." + detectApex() + "/?InsuranceSearchInput=true";

    try {
      var url = new URL(raw, window.location.origin);
      appendTrackingParams(url);
      return url.toString();
    } catch (error) {
      return raw;
    }
  }

  function appendTrackingParams(url) {
    var keys = window.NOURISH_UTM_PARAMS || [
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
    var params = {};
    var i;

    try {
      if (typeof window.NOURISH_GET_UTMS === "function") {
        params = window.NOURISH_GET_UTMS() || {};
      }
    } catch (error) {
      params = {};
    }

    if (!Object.keys(params).length) {
      for (i = 0; i < keys.length; i++) {
        var queryValue = getSearchParam(keys[i]);
        if (queryValue) {
          params[keys[i]] = queryValue;
        }
      }
    }

    for (i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (params[key] && !url.searchParams.has(key)) {
        url.searchParams.set(key, params[key]);
      }
    }
  }

  function getSearchParam(name) {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get(name);
    } catch (error) {
      return null;
    }
  }

  /* ---- Session caching ---- */

  function getSessionStorage() {
    try {
      return window.sessionStorage;
    } catch (error) {
      return null;
    }
  }

  function cacheResults(state) {
    try {
      var store = getSessionStorage();
      if (!store) return;
      store.setItem(CACHE_KEY, JSON.stringify({
        t: Date.now(),
        result: state.result,
        answers: state.answers,
      }));
    } catch (error) {
      // quota or private browsing — ignore
    }
  }

  function loadCachedResults() {
    try {
      var store = getSessionStorage();
      if (!store) return null;
      var raw = store.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && parsed.result) return parsed;
      return null;
    } catch (error) {
      return null;
    }
  }

  function clearCachedResults() {
    try {
      var store = getSessionStorage();
      if (store) store.removeItem(CACHE_KEY);
    } catch (error) {
      // ignore
    }
  }

  /* ---- API integration ---- */

  function mockDelay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function callMockMacrosApi(config) {
    var path = (config.mockBasePath || ".") + "/mock-macros-response.json";
    return mockDelay(3000).then(function () {
      return fetch(path).then(function (r) {
        if (!r.ok) throw new Error("Mock macros fetch failed: " + r.status);
        return r.json();
      });
    });
  }

  function callMockInsightsApi(config) {
    var path = (config.mockBasePath || ".") + "/mock-insights-response.json";
    return mockDelay(2000).then(function () {
      return fetch(path).then(function (r) {
        if (!r.ok) throw new Error("Mock insights fetch failed: " + r.status);
        return r.json();
      });
    });
  }

  function callMacrosApi(state, config) {
    var body = {};
    if (state.answers.mealPhotoPreviewUrl) {
      body.photo = {
        base64: dataUrlToBase64(state.answers.mealPhotoPreviewUrl),
        name: state.answers.mealPhotoName || "meal.jpg",
      };
    }
    if ((state.answers.mealContextText || "").trim()) {
      body.description = state.answers.mealContextText.trim();
    }

    return fetch(getApiBaseUrl(config) + "/public/meals/macros", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Macros API error: " + response.status);
      }
      return response.json();
    });
  }

  function callInsightsApi(macrosResult, state, config) {
    var restrictions = state.answers.dietaryRestrictions || [];
    var filteredRestrictions = restrictions.filter(function (v) {
      return v && v !== "None" && v !== "None of the above";
    });

    var rawSpecialty = (state.answers.prioritySpecialty || [])[0] || "";
    var mappedSpecialty = SPECIALTY_MAP[rawSpecialty] || "weight_loss";

    var body = {
      ingredients: macrosResult.ingredients,
      mealDescription: macrosResult.mealDescription,
      questionnaireContext: {
        prioritySpecialty: mappedSpecialty,
        dietaryRestrictions: filteredRestrictions,
        goals: ((state.answers.anythingElseText || "") + " " + (state.answers.mealContextText || "")).trim(),
      },
    };

    return fetch(getApiBaseUrl(config) + "/public/meals/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Insights API error: " + response.status);
      }
      return response.json();
    });
  }

  function mapApiResultToState(macros, insights, state) {
    var m = macros.totalMacros || {};
    return {
      mealName: macros.mealDescription || "Your meal",
      macros: {
        calories: m.totalCalories || m.caloriesKcals || 0,
        fiber: m.totalFiber || m.fiberG || 0,
        protein: m.totalProtein || m.proteinG || 0,
        fats: m.totalFat || m.fatG || 0,
        carbs: m.totalCarbs || m.carbsG || 0,
      },
      insights: (insights && insights.insights) || {
        highlight: "",
        swap: "",
        opportunity: "",
        overview: "",
      },
      recommendedGoals: ((insights && insights.insights && insights.insights.aiprompts) || []).slice(0, 3),
      photoUrl: state.answers.mealPhotoPreviewUrl || "",
    };
  }

  /* ---- Rendering helpers ---- */

  function getPageHeaderText(screen) {
    if (screen === "result") {
      return "Your meal report is ready";
    }
    return "AI insights for nutrition, backed by dietitians";
  }

  function renderPageHeader(screen) {
    return '<div class="nmiw-page-header"><h1>' + escapeHtml(getPageHeaderText(screen)) + "</h1></div>";
  }

  function renderProgress(stepIndex) {
    var html = [];
    var i;

    html.push('<div class="nmiw-progress-row">');
    if (stepIndex > 0) {
      html.push(
        '<button class="nmiw-back-chevron" type="button" data-nmiw-action="prev-step" aria-label="Go back">' +
          '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "</button>"
      );
    }
    html.push('<div class="nmiw-progress" aria-label="Questionnaire progress">');
    for (i = 0; i < QUESTIONS.length; i++) {
      html.push(
        '<div class="nmiw-progress-bar"><span style="width:' +
          (i <= stepIndex ? "100%" : "0%") +
          '"></span></div>'
      );
    }
    html.push("</div>");
    html.push("</div>");
    return html.join("");
  }

  function renderDebugTabs(state) {
    var html = [];
    var i;

    html.push('<div class="nmiw-debug">');
    for (i = 0; i < DEBUG_SCREENS.length; i++) {
      html.push(
        '<button type="button" data-nmiw-action="jump-screen" data-screen="' +
          DEBUG_SCREENS[i].id +
          '" class="' +
          (state.screen === DEBUG_SCREENS[i].id ? "is-active" : "") +
          '">' +
          escapeHtml(DEBUG_SCREENS[i].label) +
          "</button>"
      );
    }
    html.push("</div>");
    return html.join("");
  }

  function renderPhotoPreview(state, config) {
    var mealTitle = state.answers.mealPhotoName || config.sampleMeal.title;
    var mealSubtitle = config.sampleMeal.subtitle;
    var previewUrl = state.answers.mealPhotoPreviewUrl;
    var html = [];

    html.push('<div class="nmiw-photo-preview">');
    html.push('<div class="nmiw-photo-ready">Ready to analyze</div>');

    if (previewUrl) {
      html.push(
        '<img src="' +
          escapeHtml(previewUrl) +
          '" alt="' +
          escapeHtml(mealTitle) +
          '" />'
      );
    } else {
      html.push('<div class="nmiw-result-placeholder">');
      html.push(
        '<div><div class="nmiw-meal-emoji">' +
          escapeHtml(config.sampleMeal.emoji) +
          "</div>" +
          '<p class="nmiw-meal-title">' +
          escapeHtml(config.sampleMeal.title) +
          "</p>" +
          '<p class="nmiw-meal-subtitle">' +
          escapeHtml(config.sampleMeal.subtitle) +
          "</p></div>"
      );
      html.push("</div>");
    }

    html.push(
      '<div class="nmiw-photo-meta"><p class="nmiw-meal-title">' +
        escapeHtml(mealTitle) +
        '</p><p class="nmiw-meal-subtitle">' +
        escapeHtml(mealSubtitle) +
        "</p></div>"
    );
    html.push("</div>");

    return html.join("");
  }

  function renderQuestionnaire(state, config) {
    var step = QUESTIONS[state.stepIndex];
    var selected = state.answers[step.key] || [];
    var canContinue = step.isPromptStep
      ? !!((state.answers.mealContextText || "").trim() || state.answers.mealPhotoSource)
      : step.isTextStep
        ? true
        : Array.isArray(selected) && selected.length > 0;
    var isLastStep = state.stepIndex === QUESTIONS.length - 1;
    var html = [];
    var i;

    html.push('<div class="nmiw-screen-card' + (step.isPromptStep || step.isTextStep ? ' nmiw-screen-card--prompt' : '') + '">');
    html.push(renderProgress(state.stepIndex));
    html.push(
      '<h2 class="nmiw-question">' +
        escapeHtml(step.question) +
        "</h2>"
    );

    if (step.isPromptStep) {
      html.push(
        '<textarea class="nmiw-textarea" placeholder="Describe your meal here" data-nmiw-field="mealContextText">' +
          escapeHtml(state.answers.mealContextText || "") +
          "</textarea>"
      );

      if (state.answers.mealPhotoSource) {
        html.push(renderPhotoPreview(state, config));
      }

      html.push(
        '<input class="nmiw-file-input" type="file" accept="image/*" capture="environment" hidden />'
      );

      html.push('<div class="nmiw-toolbar nmiw-toolbar--stacked">');
      html.push(
        '<button class="nmiw-button-secondary nmiw-button--upload" type="button" data-nmiw-action="open-file">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right:4px"><rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="6" r="1.25" stroke="currentColor" stroke-width="1"/><path d="M1 11l3.5-3.5L8 11l3-4 4 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "Upload an image</button>"
      );
      html.push(
        '<button class="nmiw-button" type="button" data-nmiw-action="analyze" ' +
          (canContinue ? "" : 'aria-disabled="true" disabled') +
          ">Submit</button>"
      );
      html.push("</div>");
    } else if (step.isTextStep) {
      html.push(
        '<textarea class="nmiw-textarea" placeholder="Let us know anything else here" data-nmiw-field="anythingElseText">' +
          escapeHtml(state.answers.anythingElseText || "") +
          "</textarea>"
      );

      html.push('<div class="nmiw-toolbar">');
      html.push(
        '<button class="nmiw-button" type="button" data-nmiw-action="next-step">Next</button>'
      );
      html.push("</div>");
    } else {
      // Radio list items (single-select with auto-advance on desktop)
      html.push('<div class="nmiw-list">');
      for (i = 0; i < step.options.length; i++) {
        var option = step.options[i];
        var isOptSelected = (Array.isArray(selected) ? selected : []).indexOf(option) !== -1;

        html.push(
          '<button type="button" class="' +
            joinClasses(["nmiw-list-item", isOptSelected ? "is-selected" : ""]) +
            '" data-nmiw-action="toggle-option" data-question-key="' +
            escapeHtml(step.key) +
            '" data-value="' +
            escapeHtml(option) +
            '"><span class="nmiw-radio"></span><span>' +
            escapeHtml(option) +
            "</span></button>"
        );
      }
      html.push("</div>");

      html.push('<div class="nmiw-toolbar' + (!step.multi ? ' nmiw-toolbar--auto-advance' : '') + '">');
      if (state.stepIndex > 0) {
        html.push(
          '<button class="nmiw-button-secondary" type="button" data-nmiw-action="prev-step">Back</button>'
        );
      }
      html.push(
        '<button class="nmiw-button" type="button" data-nmiw-action="next-step" ' +
          (canContinue ? "" : 'aria-disabled="true" disabled') +
          ">Next</button>"
      );
      html.push("</div>");
    }

    html.push("</div>");

    return html.join("");
  }

  function renderLoading(state, config) {
    var html = [];
    html.push('<div class="nmiw-screen-card nmiw-loading">');

    // Image thumbnail (only if photo was uploaded)
    if (state.answers.mealPhotoPreviewUrl) {
      html.push('<div class="nmiw-loading-image-wrap">');
      html.push(
        '<img class="nmiw-loading-thumb" src="' +
          escapeHtml(state.answers.mealPhotoPreviewUrl) +
          '" alt="Your meal" />'
      );
      html.push('<div class="nmiw-loading-thumb-overlay"></div>');
      html.push("</div>");
    }

    // Status text + shimmer bars + subtitle
    html.push('<div class="nmiw-loading-content">');
    html.push('<div class="nmiw-loading-status">');
    html.push('<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 0l1.796 5.528h5.813l-4.703 3.416 1.797 5.528L8 11.056l-4.703 3.416 1.797-5.528L.39 5.528h5.813L8 0z" fill="#5d33bf"/></svg>');
    html.push('<span class="nmiw-loading-status-text">Analyzing your meal</span>');
    html.push("</div>");
    html.push('<div class="nmiw-loading-bars">');
    html.push('<div class="nmiw-loading-bar" style="--nmiw-bar-base-opacity:.4"></div>');
    html.push('<div class="nmiw-loading-bar" style="--nmiw-bar-base-opacity:.6"></div>');
    html.push('<div class="nmiw-loading-bar" style="--nmiw-bar-base-opacity:.8"></div>');
    html.push('<div class="nmiw-loading-bar" style="--nmiw-bar-base-opacity:1"></div>');
    html.push("</div>");
    html.push("</div>");

    html.push('<p class="nmiw-loading-subtitle">Calculating nutrition value...</p>');
    html.push("</div>");

    return html.join("");
  }

  function renderResult(state, config) {
    var result = state.result || createPreviewResult(config);
    var macros = result.macros || {};
    var insights = result.insights || {};
    var html = [];

    var NOURISH_LOGO_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="12" fill="#F26533"/><circle cx="7.59625" cy="12.4317" r="4.83453" fill="white"/><circle cx="16.0575" cy="7.94245" r="3.6259" fill="white"/><circle cx="15.7122" cy="15.7122" r="3.28058" fill="white"/></svg>';
    var PERSON_CIRCLE_SVG = '<svg width="24" height="24" viewBox="0 0 19.5 19.5" fill="none"><path d="M9.75 0C4.37 0 0 4.37 0 9.75 0 15.13 4.37 19.5 9.75 19.5 15.13 19.5 19.5 15.13 19.5 9.75 19.5 4.37 15.13 0 9.75 0zM7.4 5.48c.59-.63 1.43-.98 2.35-.98 1.17 0 1.75.35 2.35.98.6.64.9 1.5.83 2.43C12.79 9.75 11.36 11.25 9.75 11.25 8.14 11.25 6.71 9.75 6.57 7.91c-.07-.93.22-1.8.82-2.43zM9.75 18c-2.2 0-4.22-.82-5.91-2.49.44-.63 1-.16 1.65-.56C6.69 13.17 8.2 12.75 9.75 12.75c1.55 0 3.06.42 4.26 1.19.65.41 1.22.94 1.66 1.56C14.03 17.16 11.96 18 9.75 18z" fill="#B2AEA9"/></svg>';

    html.push('<div class="nmiw-screen-card nmiw-screen-card--result">');
    html.push('<div class="nmiw-result-layout">');

    // User message: meal info card (right-aligned)
    html.push('<div class="nmiw-chat-row nmiw-chat-row--user">');
    html.push('<div class="nmiw-result-banner">');
    if (result.photoUrl) {
      html.push(
        '<img class="nmiw-result-thumb" src="' +
          escapeHtml(result.photoUrl) +
          '" alt="' +
          escapeHtml(result.mealName || "Meal") +
          '" />'
      );
    }
    html.push('<div class="nmiw-result-banner-text">');
    html.push(
      '<h2 class="nmiw-result-meal-name">' +
        escapeHtml(result.mealName || "Your meal") +
        "</h2>"
    );
    html.push('<div class="nmiw-result-macros-inline">');
    html.push(
      '<span class="nmiw-macro-inline"><span class="nmiw-macro-icon-soft"><svg width="20" height="20" viewBox="0 0 16 19" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.25.001c.337-.016.64.114.86.34l-.416.409c.417-.409.417-.409.417-.409l.003.002.005.005.018.019.016.016.067.07.244.264c.208.229.499.56.839.973.677.825 1.552 1.985 2.33 3.32 1.053 1.807 1.97 3.993 1.97 6.13 0 2.746-1.14 4.656-2.696 5.863-1.533 1.191-3.44 1.68-4.987 1.68-1.56 0-3.519-.549-5.099-1.785C1.203 15.63 0 13.678 0 10.933c0-2.31.955-4.627 1.872-6.33A18.5 18.5 0 013.566 1.93l.12-.158.033-.042.009-.012.003-.003L4.188 2.078l-.457-.363.007-.008.006-.008c.212-.247.522-.408.868-.41a1.08 1.08 0 01.873.398l.004.005.967 1.16 1.971-2.433.002-.002C8.63.172 8.924.017 9.247.001h.002zM4.62 2.471l-.011.015-.076.143a15.82 15.82 0 00-.504 1.077c-.523.37-.927.8-1.23 1.253C1.852 6.26 1.167 8.91 1.167 10.933c0 2.36 1.016 3.983 2.356 5.03A7.45 7.45 0 006.727 17.387c-1.243-.439-2.133-1.626-2.133-3.02 0-1.204.535-2.44 1.11-3.444l.001-.002c.571-.99 1.22-1.835 1.642-2.335l.452-.535.444.541c.407.495 1.055 1.34 1.627 2.33l.001.002c.573 1-1.121 2.237 1.121 3.444 0 1.483-1.015 2.731-2.382 3.094 1.176-.125 2.49-.561 3.565-1.397 1.275-.99 2.245-2.562 2.245-4.943 0-1.83-.797-3.802-1.811-5.541-.738-1.264-1.573-2.373-2.225-3.167a22.4 22.4 0 00-.801-1.07 10.6 10.6 0 00-.228-.277c-.012-.013-.02-.02-.025-.027L6.47 4.69 4.62 2.471zm3.169 7.43c-.334.438-.72.993-1.073 1.604-.545.953-.955 1.97-.955 2.863 0 1.052.8 1.918 1.817 2.023a2.3 2.3 0 00.258.01c1.097-.023 1.99-.927 1.99-2.033 0-.89-.419-1.906-.966-2.864a14.4 14.4 0 00-1.07-1.603z" fill="#4C4A48"/></svg></span>Calories: ' +
        escapeHtml(String(macros.calories || 0)) +
        "</span>"
    );
    html.push(
      '<span class="nmiw-macro-inline"><span class="nmiw-macro-icon-soft"><svg width="20" height="20" viewBox="0 0 14 16" fill="none"><path d="M13.755 6.018c-.457-.455-1.885-.229-2.695-.054-.325.07-.89.209-1.466.426.317-.461.529-.986.529-1.533 0-1.497-2.162-4.857-3.125-4.857C6.034 0 3.873 3.315 3.873 4.857c0 .551.212 1.078.534 1.54a8.8 8.8 0 00-1.473-.417c-.813-.17-2.243-.392-2.677.038C-.189 6.717.647 10.561 1.743 11.652c.565.563 1.407.78 2.225.78.731 0 1.44-.175 1.911-.43l.919.914v.031v2.602c0 .247.203.449.45.449a.45.45 0 00.45-.449v-2.602s0-.011 0-.016l.932-.928c.473.256 1.18.43 1.912.43.815 0 1.657-.217 2.225-.78 1.065-1.06 1.923-4.957 1.24-5.635h-.002zM7.005 12.103l-.736-.733c.439-.802.635-2.297.13-3.405.218.078.423.126.597.126.173 0 .392-.047.616-.132-.509 1.11-.313 2.607.128 3.412l-.736.733zm-.016-11.182c.556.381 2.234 2.748 2.234 3.933 0 .943-1.054 1.878-1.774 2.21V4.94a.45.45 0 00-.45-.449.45.45 0 00-.45.449v2.125c-.72-.332-1.775-1.267-1.775-2.21 0-1.235 1.667-3.58 2.218-3.934h-.003zM2.132 11.018c-.876-.872-1.364-3.705-1.227-4.341.662-.126 3.53.37 4.375 1.208.67.668.587 2.07.312 2.813L4.084 9.196a.45.45 0 00-.637 0 .45.45 0 000 .634l1.508 1.502c-.745.273-2.155.354-2.825-.31l.002-.004zm9.745 0c-.671.668-2.078.585-2.826.312l1.509-1.502a.45.45 0 000-.634.45.45 0 00-.637 0L8.414 10.695c-.275-.742-.356-2.145.313-2.813.777-.775 3.105-1.244 4.066-1.244.122 0 .223.007.295.023.124.661-.371 3.514-1.213 4.355l.002.002z" fill="#2D6596"/></svg></span>Fiber: ' +
        escapeHtml(String(macros.fiber || 0)) +
        "g</span>"
    );
    html.push(
      '<span class="nmiw-macro-inline"><span class="nmiw-macro-icon-soft"><svg width="20" height="20" viewBox="0 0 15 15" fill="none"><path d="M13.906 10.296c-.501-.501-1.261-.641-1.888-.346-.074.035-.168.015-.233-.052l-1.784-1.784c.081-.054.158-.114.229-.185.585-.585.585-1.534 0-2.119a1.48 1.48 0 00-.427-.3c0-1.394-.595-2.783-1.662-3.85C6.11-.368 3.01-.566 1.223 1.22.35 2.092-.079 3.3.012 4.616c.09 1.295.677 2.545 1.653 3.52 1.067 1.067 2.454 1.662 3.846 1.662h.004c.073.162.175.306.3.43.283.284.66.44 1.06.44.4 0 .776-.156 1.06-.44.07-.07.128-.148.185-.229l1.783 1.784c.067.067.088.16.052.234-.296.628-.156 1.386.346 1.89.314.314.728.491 1.17.497h.024c.435 0 .841-.167 1.145-.47.193-.194.337-.44.414-.71.023-.085.087-.148.175-.173.266-.075.512-.218.705-.412.637-.637.626-1.688-.027-2.339zM7.525 9.3a.74.74 0 01-.181.337.528.528 0 01-.943 0 .74.74 0 01-.183-.344.47.47 0 00-.408-.337h-.029c-1.261.086-2.549-.429-3.529-1.409A5.97 5.97 0 01.84 4.556c-.075-1.074.268-2.05.97-2.75 1.46-1.46 4.035-1.263 5.74.443.98.982 1.494 2.268 1.409 3.53a.47.47 0 00.335.437.74.74 0 01.344.183c.26.26.26.683 0 .943a.74.74 0 01-.338.18.47.47 0 00-.225.663c.031.063.052.133.06.208a.56.56 0 01-.191.55.558.558 0 01-.701-.152h-.03l-.024-.01a.47.47 0 00-.664.472v.002zm5.817 2.746a.84.84 0 01-.34.251c-.366.1-.655.39-.757.752a.84.84 0 01-.2.343.77.77 0 01-.571.227.77.77 0 01-.593-.254.77.77 0 01-.182-.947c.183-.39.096-.863-.216-1.175l-1.44-1.44c.152-.073.291-.168.414-.291a1.48 1.48 0 00.291-.412l1.44 1.44c.312.312.785.4 1.176.217a.77.77 0 01.945.181.79.79 0 01.027 1.164l.006-.056zm-5.584-6.82a.47.47 0 01-.385-.26c-.68-1.682-2.09-2.13-2.148-2.146a.47.47 0 01.516-.468c.075.023 1.85.566 2.683 2.63a.47.47 0 01-.257.63.47.47 0 01-.156.032l-.253-.418z" fill="#932E6F"/></svg></span>Protein: ' +
        escapeHtml(String(macros.protein || 0)) +
        "g</span>"
    );
    html.push(
      '<span class="nmiw-macro-inline"><span class="nmiw-macro-icon-soft"><svg width="20" height="20" viewBox="0 0 12 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.543 3.173C2.104 1.29 3.836 0 5.8 0c1.964 0 3.696 1.29 4.257 3.173l1.279 4.284c.175.588.264 1.198.264 1.81V9.8c0 3.203-2.597 5.8-5.8 5.8-3.203 0-5.8-2.597-5.8-5.8v-.533c0-.613.089-1.223.264-1.81L1.543 3.173zM5.8.933c-1.552 0-2.92 1.019-3.363 2.506L1.159 7.724A5.95 5.95 0 00.933 9.268V9.8c0 2.688 2.179 4.867 4.867 4.867 2.688 0 4.867-2.179 4.867-4.867v-.533c0-.523-.076-1.043-.226-1.543L9.163 3.439C8.72 1.952 7.352.933 5.8.933zM4.771 8.316c-.318.464-.504 1.04-.504 1.484 0 .847.687 1.533 1.533 1.533.847 0 1.533-.686 1.533-1.533 0-.443-.186-1.02-.504-1.484C6.504 7.841 6.127 7.6 5.8 7.6c-.327 0-.704.241-1.029.716zm-.77-.527C4.4 7.207 5.022 6.667 5.8 6.667c.778 0 1.401.54 1.8 1.122.406.593.667 1.35.667 2.011 0 1.362-1.105 2.467-2.467 2.467-1.362 0-2.467-1.105-2.467-2.467 0-.661.261-1.418.667-2.011z" fill="#417428"/></svg></span>Fats: ' +
        escapeHtml(String(macros.fats || 0)) +
        "g</span>"
    );
    html.push("</div>"); // macros-inline
    html.push("</div>"); // banner-text
    html.push("</div>"); // result-banner
    html.push('<span class="nmiw-chat-avatar">' + PERSON_CIRCLE_SVG + '</span>');
    html.push("</div>"); // chat-row--user

    // Bot response: overview + opportunity + CTA (left-aligned)
    html.push('<div class="nmiw-chat-row nmiw-chat-row--bot">');
    html.push('<span class="nmiw-chat-avatar">' + NOURISH_LOGO_SVG + '</span>');
    html.push('<div class="nmiw-chat-bot-content">');

    // Overview
    if (insights.overview) {
      html.push('<div class="nmiw-overview">' + insights.overview + "</div>");
    }

    // Opportunity section
    if (insights.opportunity) {
      html.push('<div class="nmiw-opportunity">');
      html.push('<div class="nmiw-opportunity-header">');
      html.push('<span class="nmiw-opportunity-icon-wrap"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1.5l1.5 3.5L15 6.5l-3.5 1.5L10 11.5 8.5 8 5 6.5l3.5-1.5L10 1.5zm5 7l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zm-10 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="#5d33bf"/></svg></span>');
      html.push('<span class="nmiw-opportunity-title">Opportunity</span>');
      html.push("</div>");
      html.push("<p>" + escapeHtml(insights.opportunity) + "</p>");
      html.push("</div>");
    }

    // Dietitian CTA text
    html.push('<p class="nmiw-dietitian-cta">Speaking with a <a href="' +
      escapeHtml(getSignupUrl(config, state)) +
      '">dietitian</a> could improve our recommendations even more.</p>');

    // Follow-up chips — link to signup
    if (result.recommendedGoals && result.recommendedGoals.length) {
      html.push('<div class="nmiw-followup-chips">');
      for (var i = 0; i < Math.min(result.recommendedGoals.length, 3); i++) {
        html.push(
          '<a class="nmiw-followup-chip" href="https://signup.usenourish.com" target="_blank" rel="noopener noreferrer">' +
            escapeHtml(result.recommendedGoals[i]) +
            "</a>"
        );
      }
      html.push("</div>");
    }

    html.push("</div>"); // chat-bot-content
    html.push("</div>"); // chat-row--bot

    html.push("</div>"); // result-layout
    html.push("</div>"); // screen-card

    return html.join("");
  }

  function renderSignup(state, config) {
    var signupUrl = getSignupUrl(config, state);
    var benefits = [
      {
        title: "Personalized meal feedback",
        copy:
          "Get feedback that stays connected to your goals, restrictions, and meal patterns.",
      },
      {
        title: "More context over time",
        copy:
          "Build on one meal insight with follow-up questions and richer nutrition support.",
      },
      {
        title: "A clear Nourish next step",
        copy:
          "Move from quick meal feedback into the broader Nourish care experience.",
      },
    ];
    var html = [];
    var i;

    html.push('<div class="nmiw-screen-card">');
    html.push('<div class="nmiw-signup">');
    html.push("<div>");
    html.push('<div class="nmiw-eyebrow">Next step</div>');
    html.push(
      '<h2 class="nmiw-question" style="margin-top:16px">Keep going with Nourish.</h2>'
    );
    html.push(
      '<p class="nmiw-copy">Create an account to keep your progress, get more personalized nutrition guidance, and connect this experience to the rest of Nourish.</p>'
    );
    html.push('<div class="nmiw-benefits">');

    for (i = 0; i < benefits.length; i++) {
      html.push(
        '<div class="nmiw-benefit"><div>✓</div><div><strong>' +
          escapeHtml(benefits[i].title) +
          '</strong><span class="nmiw-copy">' +
          escapeHtml(benefits[i].copy) +
          "</span></div></div>"
      );
    }

    html.push("</div>");
    html.push("</div>");
    html.push('<div class="nmiw-form-card">');
    html.push(
      '<div class="nmiw-field"><label for="nmiw-email">Email address</label><input id="nmiw-email" type="email" value="' +
        escapeHtml(state.answers.signupEmail || "") +
        '" placeholder="name@example.com" data-nmiw-field="signupEmail" /></div>'
    );
    html.push(
      '<div class="nmiw-field"><label for="nmiw-password">Password</label><input id="nmiw-password" type="password" placeholder="Create a password" disabled /></div>'
    );
    html.push(
      '<a class="nmiw-button" data-nmiw-signup-link="true" href="' +
        escapeHtml(signupUrl) +
        '">Continue to Nourish signup</a>'
    );
    html.push(
      '<div class="nmiw-actions" style="margin-top:14px"><button class="nmiw-button-secondary" type="button" data-nmiw-action="show-result">Back to insight</button><a class="nmiw-link" href="' +
        escapeHtml(getCoverageUrl(config)) +
        '">Use insurance check instead</a></div>'
    );
    html.push(
      '<p class="nmiw-note">Account creation can be handed off to the existing Nourish signup flow.</p>'
    );
    html.push("</div>");
    html.push("</div>");
    html.push("</div>");

    return html.join("");
  }

  function renderIntro(state, config) {
    var preview = createPreviewResult(config);
    var html = [];

    html.push('<div class="nmiw-card nmiw-card--hero">');
    html.push('<div class="nmiw-eyebrow">Meal insights</div>');
    html.push(
      '<h1 class="nmiw-title">Get quick dietitian-style feedback on your meal.</h1>'
    );
    html.push(
      '<p class="nmiw-copy">Tell us what kind of help you want, add any dietary restrictions, and share a note or meal photo for more targeted feedback.</p>'
    );
    html.push('<div class="nmiw-chip-row">');
    html.push('<div class="nmiw-chip">1. Pick a health goal</div>');
    html.push('<div class="nmiw-chip">2. Add restrictions</div>');
    html.push('<div class="nmiw-chip">3. Tell us more</div>');
    html.push('<div class="nmiw-chip">4. Share your meal</div>');
    html.push("</div>");
    html.push('<div class="nmiw-preview" style="margin-top:22px">');
    html.push('<div class="nmiw-preview-header">');
    html.push('<div class="nmiw-preview-badge">Example insight</div>');
    html.push('<div class="nmiw-step-kicker">Nourish</div>');
    html.push("</div>");
    html.push('<div class="nmiw-insight" style="margin-top:0"><p>');
    html.push(escapeHtml(preview.insights.highlight));
    html.push("</p></div>");
    html.push("</div>");
    html.push('<div class="nmiw-actions">');
    html.push(
      '<button class="nmiw-button" type="button" data-nmiw-action="start">Try meal insights</button>'
    );
    html.push(
      '<a class="nmiw-button-secondary" href="' +
        escapeHtml(getCoverageUrl(config)) +
        '">Keep insurance search instead</a>'
    );
    html.push("</div>");
    html.push("</div>");

    return html.join("");
  }

  function renderWidget(root, state, config) {
    var html = [];

    html.push('<div class="nmiw-shell">');

    if (config.showDebugTabs) {
      html.push(renderDebugTabs(state));
    }

    if (state.screen === "questionnaire" || state.screen === "loading" || state.screen === "result") {
      html.push(renderPageHeader(state.screen));
    }

    html.push('<div class="nmiw-stage">');

    if (state.screen === "intro") {
      html.push(renderIntro(state, config));
    } else if (state.screen === "questionnaire") {
      html.push(renderQuestionnaire(state, config));
    } else if (state.screen === "loading") {
      html.push(renderLoading(state, config));
    } else if (state.screen === "result") {
      html.push(renderResult(state, config));
    } else if (state.screen === "signup") {
      html.push(renderSignup(state, config));
    }

    html.push("</div>");
    html.push("</div>");

    root.innerHTML = html.join("");
  }

  function track(config, name, payload) {
    if (typeof config.onEvent !== "function") return;
    try {
      config.onEvent(name, payload || {});
    } catch (error) {
      // Ignore analytics callback failures so the UI can continue.
    }
  }

  function toggleOption(state, questionKey, optionValue) {
    var step = null;
    var i;

    for (i = 0; i < QUESTIONS.length; i++) {
      if (QUESTIONS[i].key === questionKey) {
        step = QUESTIONS[i];
        break;
      }
    }

    if (!step) return;

    var current = state.answers[questionKey] || [];
    var next = current.slice();
    var existingIndex = next.indexOf(optionValue);
    var resetNone =
      optionValue === "None" || optionValue === "None of the above";

    if (step.multi) {
      if (existingIndex === -1) {
        if (resetNone) {
          next = [optionValue];
        } else {
          next = next.filter(function (value) {
            return value !== "None" && value !== "None of the above";
          });
          next.push(optionValue);
        }
      } else {
        next.splice(existingIndex, 1);
      }
    } else {
      next = existingIndex === -1 ? [optionValue] : [];
    }

    state.answers[questionKey] = next;
  }

  function buildAnalysisPayload(state, config) {
    return {
      answers: {
        prioritySpecialty: state.answers.prioritySpecialty.slice(),
        dietaryRestrictions: state.answers.dietaryRestrictions.slice(),
        anythingElseText: state.answers.anythingElseText,
        mealContextText: state.answers.mealContextText,
      },
      mealPhoto: {
        file: state.answers.mealPhoto,
        previewUrl: state.answers.mealPhotoPreviewUrl,
        source: state.answers.mealPhotoSource,
        fileName: state.answers.mealPhotoName,
        sampleMeal: config.sampleMeal,
      },
    };
  }

  function buildStubResult(state, config) {
    var specialty = state.answers.prioritySpecialty || [];
    var restrictions = state.answers.dietaryRestrictions || [];
    var prompt = (state.answers.mealContextText || "").trim();
    var mealName = state.answers.mealPhotoName || config.sampleMeal.title;

    var overview = "<strong>This " + escapeHtml(mealName.toLowerCase()) + " gives us a useful starting point</strong>, but the best feedback depends on what you want help with and any context you already know.<ul><li>A registered dietitian would usually look for the fastest practical change first</li><li>Portion balance, protein, fiber matter most</li><li>Whether the meal matches your actual goal</li></ul>";
    var highlight = "Add one specific goal or symptom so the feedback can be more targeted.";
    var opportunity = "Consider adding more vegetables to increase fiber and micronutrient density.";
    var swap = "Try a lighter dressing to reduce overall calorie density.";

    if (specialty.indexOf("Diabetes or prediabetes") !== -1) {
      overview = "<strong>Because you selected diabetes or prediabetes, the main lens here is blood sugar steadiness.</strong> Protein and fiber matter more than whether the meal looks 'healthy' at first glance.<ul><li>Keep the carbohydrate portion intentional</li><li>Ensure enough protein to slow digestion</li><li>Add volume from vegetables</li></ul>";
      highlight = "Keep carbs intentional and pair them with protein and fiber.";
      opportunity = "The most useful adjustment is usually keeping the carbohydrate portion intentional and making sure there is enough protein and volume to slow the meal down.";
    } else if (specialty.indexOf("Help losing weight") !== -1) {
      overview = "<strong>Since your focus is weight loss, the most useful feedback is whether this meal will keep you full long enough</strong> to prevent rebound hunger later.<ul><li>Check protein first for satiety</li><li>Ensure starch and fat portions support fullness</li><li>Watch for hidden calories in dressings and toppings</li></ul>";
      highlight = "Bias toward protein, fiber, and volume before extra calories.";
      opportunity = "Check protein first, then make sure the starch and fat portions are working for satiety instead of accidentally making the meal too easy to overeat.";
    } else if (specialty.indexOf("Gut health") !== -1) {
      overview = "<strong>For gut health, ingredients, texture, and symptom timing matter a lot</strong>, so even a short note about bloating, reflux, or urgency would improve the response quality.<ul><li>Ingredient composition matters more than macros</li><li>Fiber type and quantity affect gut response</li><li>Symptom timing provides critical context</li></ul>";
      highlight = "Include symptoms and timing for more useful gut-health feedback.";
      opportunity = "Consider adding fermented foods or prebiotic-rich ingredients to support gut microbiome diversity.";
    }

    var combinedRestrictions = restrictions.filter(function (v) {
      return v && v !== "None" && v !== "None of the above";
    });
    if (combinedRestrictions.length) {
      overview += "<p>You also noted " + escapeHtml(combinedRestrictions.join(", ").toLowerCase()) + ", so ingredient-level swaps would be part of the final guidance.</p>";
    }

    if (prompt) {
      highlight = 'Use your note as the lead signal: "' + prompt.slice(0, 72) + (prompt.length > 72 ? "..." : "") + '"';
    }

    return {
      mealName: mealName,
      macros: {
        calories: 520,
        fiber: 8,
        protein: 38,
        fats: 18,
        carbs: 52,
      },
      insights: {
        highlight: highlight,
        swap: swap,
        opportunity: opportunity,
        overview: overview,
      },
      recommendedGoals: ["Why more complex carbs?", "See more about my meal", "What are macros?"],
      photoUrl: state.answers.mealPhotoPreviewUrl || "",
    };
  }

  function handleAnalyze(root, state, config, rerender) {
    if (state.isBusy) return;

    state.isBusy = true;
    state.screen = "loading";
    rerender();

    var payload = buildAnalysisPayload(state, config);

    track(config, "analyze_start", payload);

    // If a callback is provided, use it (backward compat)
    if (typeof config.analyzeMeal === "function") {
      var promise;
      try {
        promise = Promise.resolve(config.analyzeMeal(payload));
      } catch (error) {
        promise = Promise.reject(error);
      }

      promise
        .then(function (result) {
          if (result && result.mealName) {
            state.result = result;
          } else {
            state.result = buildStubResult(state, config);
          }
          state.screen = "result";
          state.isBusy = false;
          cacheResults(state);
          rerender();
          track(config, "analyze_success", state.result);
        })
        .catch(function (error) {
          state.result = buildStubResult(state, config);
          state.screen = "result";
          state.isBusy = false;
          rerender();
          track(config, "analyze_error", {
            message: error && error.message ? error.message : "Unknown error",
          });
        });
      return;
    }

    // Built-in API calls (or mocks)
    var macrosCall = config.useMocks
      ? callMockMacrosApi(config)
      : callMacrosApi(state, config);

    macrosCall
      .then(function (macrosResult) {
        var insightsCall = config.useMocks
          ? callMockInsightsApi(config)
          : callInsightsApi(macrosResult, state, config);
        return insightsCall.then(function (insightsResult) {
          return mapApiResultToState(macrosResult, insightsResult, state);
        });
      })
      .then(function (mappedResult) {
        state.result = mappedResult;
        state.screen = "result";
        state.isBusy = false;
        cacheResults(state);
        rerender();
        track(config, "analyze_success", state.result);
      })
      .catch(function (error) {
        state.result = buildStubResult(state, config);
        state.screen = "result";
        state.isBusy = false;
        rerender();
        track(config, "analyze_error", {
          message: error && error.message ? error.message : "Unknown error",
        });
      });
  }

  function updateSignupLink(root, state, config) {
    var signupLink = root.querySelector("[data-nmiw-signup-link]");
    if (!signupLink) return;
    signupLink.setAttribute("href", getSignupUrl(config, state));
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        resolve(reader.result);
      };

      reader.onerror = function () {
        reject(new Error("Could not read image file"));
      };

      reader.readAsDataURL(file);
    });
  }

  function mountWidget(root, userConfig) {
    var config = extendConfig(DEFAULT_CONFIG, userConfig || {});
    var state = createInitialState(config);

    // Check for cached results
    var cached = loadCachedResults();
    if (cached && cached.result) {
      state.screen = "result";
      state.result = cached.result;
      if (cached.answers) {
        state.answers = cached.answers;
      }
    }

    ensureStyles();
    root.classList.add("nmiw-root");

    if (config.replaceContents) {
      root.innerHTML = "";
    }

    function rerender() {
      renderWidget(root, state, config);
    }

    root.addEventListener("click", function (event) {
      var actionEl = event.target.closest("[data-nmiw-action]");
      var action = actionEl && actionEl.getAttribute("data-nmiw-action");

      if (!actionEl || !root.contains(actionEl)) return;

      if (action === "start") {
        state.screen = config.initialScreen || "questionnaire";
        state.stepIndex = 0;
        rerender();
        track(config, "start", {});
        return;
      }

      if (action === "show-intro") {
        state.screen = config.initialScreen || "questionnaire";
        rerender();
        return;
      }

      if (action === "reset") {
        state.stepIndex = 0;
        state.screen = config.initialScreen || "questionnaire";
        state.answers = createInitialState(config).answers;
        state.result = createPreviewResult(config);
        clearCachedResults();
        rerender();
        track(config, "reset", {});
        return;
      }

      if (action === "toggle-option") {
        var questionKey = actionEl.getAttribute("data-question-key");
        toggleOption(
          state,
          questionKey,
          actionEl.getAttribute("data-value")
        );

        // Auto-advance for single-select steps (e.g. prioritySpecialty)
        var currentStep = QUESTIONS[state.stepIndex];
        if (currentStep && !currentStep.multi && (state.answers[questionKey] || []).length > 0) {
          state.stepIndex = Math.min(QUESTIONS.length - 1, state.stepIndex + 1);
        }

        rerender();
        return;
      }

      if (action === "prev-step") {
        state.stepIndex = Math.max(0, state.stepIndex - 1);
        rerender();
        return;
      }

      if (action === "next-step") {
        var step = QUESTIONS[state.stepIndex];
        if (!step.isTextStep && !(state.answers[step.key] || []).length) return;
        state.stepIndex = Math.min(QUESTIONS.length - 1, state.stepIndex + 1);
        rerender();
        return;
      }

      if (action === "open-file") {
        var fileInput = root.querySelector(".nmiw-file-input");
        if (fileInput) fileInput.click();
        return;
      }

      if (action === "use-sample-photo") {
        state.answers.mealPhoto = null;
        state.answers.mealPhotoSource = "sample";
        state.answers.mealPhotoPreviewUrl = "";
        state.answers.mealPhotoName = config.sampleMeal.title;
        rerender();
        return;
      }

      if (action === "analyze") {
        var canAnalyze = !!((state.answers.mealContextText || "").trim() || state.answers.mealPhotoSource);
        if (!canAnalyze) return;
        handleAnalyze(root, state, config, rerender);
        return;
      }

      if (action === "show-signup") {
        state.screen = "signup";
        rerender();
        return;
      }

      if (action === "show-result") {
        state.screen = "result";
        rerender();
        return;
      }

      if (action === "try-another-meal") {
        clearCachedResults();
        state.screen = "questionnaire";
        state.stepIndex = 0;
        state.answers = createInitialState(config).answers;
        state.result = createPreviewResult(config);
        rerender();
        return;
      }

      if (action === "jump-screen") {
        var targetScreen = actionEl.getAttribute("data-screen");
        state.screen = targetScreen;
        if (targetScreen === "questionnaire" && state.stepIndex > QUESTIONS.length - 1) {
          state.stepIndex = 0;
        }
        rerender();
      }
    });

    root.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];

      if (!event.target.classList.contains("nmiw-file-input") || !file) return;

      readFileAsDataUrl(file)
        .then(function (dataUrl) {
          state.answers.mealPhoto = file;
          state.answers.mealPhotoPreviewUrl = dataUrl;
          state.answers.mealPhotoName = file.name || "Uploaded meal photo";
          state.answers.mealPhotoSource = "upload";
          rerender();
          track(config, "photo_uploaded", {
            fileName: file.name || "",
            fileType: file.type || "",
          });
        })
        .catch(function () {
          state.answers.mealPhoto = null;
          state.answers.mealPhotoPreviewUrl = "";
          state.answers.mealPhotoName = "";
          state.answers.mealPhotoSource = "";
          rerender();
        });
    });

    root.addEventListener("input", function (event) {
      var field = event.target.getAttribute("data-nmiw-field");
      if (!field) return;
      state.answers[field] = event.target.value;

      if (field === "signupEmail") {
        updateSignupLink(root, state, config);
        return;
      }

      if (field === "mealContextText" || field === "anythingElseText") {
        var selectionStart = event.target.selectionStart;
        var selectionEnd = event.target.selectionEnd;
        rerender();

        window.requestAnimationFrame(function () {
          var nextField = root.querySelector(
            '[data-nmiw-field="' + field + '"]'
          );
          if (!nextField) return;
          nextField.focus();
          if (
            typeof selectionStart === "number" &&
            typeof nextField.setSelectionRange === "function"
          ) {
            nextField.setSelectionRange(selectionStart, selectionEnd);
          }
        });
      }
    });

    rerender();

    return {
      rerender: rerender,
      getState: function () {
        return state;
      },
      destroy: function () {
        root.innerHTML = "";
        root.classList.remove("nmiw-root");
      },
    };
  }

  function autoMount() {
    var globalConfig = window.NourishMealInsightsWidgetConfig || {};
    var config = extendConfig(DEFAULT_CONFIG, globalConfig);
    var nodes = document.querySelectorAll(config.selector);
    var instances = [];
    var i;

    ensureStyles();

    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-nmiw-mounted") === "true") continue;
      nodes[i].setAttribute("data-nmiw-mounted", "true");
      instances.push(mountWidget(nodes[i], config));
    }

    window.NourishMealInsightsWidget = {
      mount: mountWidget,
      instances: instances,
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    autoMount();
  }
})();
