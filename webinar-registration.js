// Populates HubSpot hidden fields (marketing event name/ID) on webinar
// registration pages. The HubSpot embed renders asynchronously and can
// re-render, so values are re-applied on every DOM change until the page ends.
(function () {
  var DEFAULT_FIELDS = {
    marketing_event_name: null,
    marketing_event_id: null,
  };

  // Aliases accepted from page config / data attributes / query string.
  var ALIASES = {
    marketing_event_name: [
      "marketingEventName",
      "marketing-event-name",
      "eventName",
      "name",
    ],
    marketing_event_id: [
      "marketingEventId",
      "marketing-event-id",
      "eventId",
      "id",
    ],
  };

  var FORM_SELECTOR = ".hs-form-html, .hbspt-form, form.hs-form";
  var POLL_INTERVAL_MS = 250;
  var POLL_TIMEOUT_MS = 20000;

  var config = window.NOURISH_WEBINAR || {};
  var debug =
    config.debug === true ||
    /[?&]webinarDebug=1/.test(window.location.search || "");

  function log() {
    if (!debug) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[webinar]");
    console.log.apply(console, args);
  }

  function warn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[webinar]");
    console.warn.apply(console, args);
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (value === null || value === undefined) continue;
      value = String(value).trim();
      if (value) return value;
    }
    return "";
  }

  function fromQueryString(keys) {
    var params;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (e) {
      return "";
    }
    for (var i = 0; i < keys.length; i++) {
      var value = params.get(keys[i]);
      if (value && value.trim()) return value.trim();
    }
    return "";
  }

  function fromDataAttributes(keys) {
    for (var i = 0; i < keys.length; i++) {
      var attr = "data-" + keys[i].replace(/_/g, "-").toLowerCase();
      var el = document.querySelector("[" + attr + "]");
      if (el) {
        var value = el.getAttribute(attr);
        if (value && value.trim()) return value.trim();
      }
    }
    return "";
  }

  // Values come from (in priority order): page config object, data attributes
  // on any element (CMS-bound embeds), then the query string (useful for QA).
  function resolveValues() {
    var fields = Object.assign({}, DEFAULT_FIELDS, config.fields || {});
    var resolved = {};

    Object.keys(fields).forEach(function (fieldName) {
      var keys = [fieldName].concat(ALIASES[fieldName] || []);
      var fromConfig = "";

      for (var i = 0; i < keys.length; i++) {
        var candidate = fields[keys[i]] != null ? fields[keys[i]] : config[keys[i]];
        fromConfig = firstNonEmpty(fromConfig, candidate);
        if (fromConfig) break;
      }

      var value = firstNonEmpty(
        fromConfig,
        fromDataAttributes(keys),
        fromQueryString(keys)
      );

      if (value) resolved[fieldName] = value;
    });

    return resolved;
  }

  // HubSpot's embed may hydrate inputs with React, which ignores a plain
  // `.value =` assignment, so go through the native setter and fire events.
  function setInputValue(input, value) {
    if (input.value === value) return false;

    var descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input),
      "value"
    );

    if (descriptor && typeof descriptor.set === "function") {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function findInputs(form, fieldName) {
    return form.querySelectorAll(
      'input[name="' + fieldName + '"], select[name="' + fieldName + '"]'
    );
  }

  function listFieldNames(form) {
    var names = [];
    form.querySelectorAll("input[name], select[name]").forEach(function (el) {
      if (names.indexOf(el.name) === -1) names.push(el.name);
    });
    return names;
  }

  var reportedMissing = {};

  function applyValues(values) {
    var forms = document.querySelectorAll(FORM_SELECTOR);
    var filledAnyForm = false;

    forms.forEach(function (form) {
      // Wait until the embed has rendered its inputs.
      if (!form.querySelector("input[name]")) return;

      var filled = [];
      var missing = [];

      Object.keys(values).forEach(function (fieldName) {
        var inputs = findInputs(form, fieldName);
        if (!inputs.length) {
          missing.push(fieldName);
          return;
        }
        inputs.forEach(function (input) {
          if (setInputValue(input, values[fieldName])) {
            filled.push(fieldName);
          }
        });
      });

      if (missing.length) {
        var key = missing.join(",");
        if (!reportedMissing[key]) {
          reportedMissing[key] = true;
          warn(
            "hidden field(s) not found on the HubSpot form: " +
              missing.join(", ") +
              ". Fields present: " +
              listFieldNames(form).join(", ")
          );
        }
      }

      if (filled.length) log("populated", filled.join(", "), "on", form);
      filledAnyForm = true;
    });

    return filledAnyForm;
  }

  function init() {
    var values = resolveValues();

    if (!Object.keys(values).length) {
      log("no marketing event values configured; nothing to populate");
      return;
    }

    log("resolved values", values);
    window.__nourishWebinarValues = values;

    applyValues(values);

    // Re-apply on re-render (HubSpot can swap the form node, e.g. after a
    // validation error or a multi-step transition).
    var observer = new MutationObserver(function () {
      applyValues(values);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Belt-and-braces poll for embeds that render inside a shadow-free
    // container without triggering an observable mutation on first paint.
    var started = Date.now();
    var poll = setInterval(function () {
      applyValues(values);
      if (Date.now() - started > POLL_TIMEOUT_MS) clearInterval(poll);
    }, POLL_INTERVAL_MS);

    // Last chance before the browser hands the payload to HubSpot.
    document.addEventListener(
      "submit",
      function () {
        applyValues(values);
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
