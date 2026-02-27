$(function () {
  var payersData = [];
  var dataReady = false;

  if (typeof window.InsuranceSearchInput === "undefined") {
    window.InsuranceSearchInput = false;
  }

  var widgetSelectors = [
    ".home-filter_component",
    ".provider-filter_component",
    ".provider-filter_wrapper",
    ".provider-filter",
  ];

  function getSignupHost() {
    var apex = window.__nourish_apex;
    if (!apex) {
      var h = (window.location.hostname || "").toLowerCase();
      apex =
        h.indexOf("usenourish.com") !== -1
          ? "usenourish.com"
          : h.indexOf("nourish.com") !== -1
            ? "nourish.com"
            : "usenourish.com";
    }
    return "signup." + apex;
  }

  function getVariationParams(path) {
    path = (path || window.location.pathname || "/").toLowerCase();
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (path === "/") return { landingPageVariation: "Organic_Homepage" };
    if (path.indexOf("/blog") === 0) return { landingPageVariation: "blog" };
    if (path.indexOf("/landing-page") === 0)
      return { landingPageVariation: "landing-page" };
    if (path.indexOf("/conditions") === 0)
      return { landingPageVariation: "conditions" };
    if (path.indexOf("/local-dietitians") === 0)
      return { landingPageVariation: "local-dietitians" };
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
    if (path.indexOf("/does-my-insurance-cover-nutrition") === 0)
      return { landingPageVariation: "Am_I_Covered" };
    return null;
  }

  function getQueryParam(name) {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get(name);
    } catch (e) {
      return null;
    }
  }

  function normalizeValue(value) {
    if (value === null || typeof value === "undefined") return "";
    return String(value)
      .replace(/\u2019/g, "'")
      .trim()
      .toLowerCase();
  }

  function getPayersSourceParam() {
    // The homepage endpoint is deprecated; always use the sign-up feed.
    return "sign-up";
  }

  function fetchPayersData() {
    var sourceParam = getPayersSourceParam();
    var cacheKey = "nourishHeroPayersData:" + sourceParam;
    var cacheTTL = 24 * 60 * 60 * 1000;
    var now = Date.now();

    try {
      if (window.localStorage) {
        var cachedRaw = window.localStorage.getItem(cacheKey);
        if (cachedRaw) {
          var cached = JSON.parse(cachedRaw);
          if (
            cached &&
            typeof cached.timestamp === "number" &&
            Array.isArray(cached.data) &&
            now - cached.timestamp < cacheTTL
          ) {
            payersData = cached.data;
            return Promise.resolve(payersData);
          }
        }
      }
    } catch (storageError) {
      // ignore storage issues
    }

    var url =
      "https://app." + window.__nourish_apex + "/api/payers?source=" +
      encodeURIComponent(sourceParam);

    return fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch payers data: " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        payersData = Array.isArray(data) ? data : [];
        try {
          if (window.localStorage) {
            window.localStorage.setItem(
              cacheKey,
              JSON.stringify({ timestamp: Date.now(), data: payersData })
            );
          }
        } catch (writeError) {
          // ignore write errors
        }
        return payersData;
      })
      .catch(function () {
        payersData = getFallbackPayersData();
        return payersData;
      });
  }

  function getFallbackPayersData() {
    return [
      {
        id: 333,
        payerName: "Independence Keystone Health",
        groupNameDeprecated: "Blue Cross Blue Shield",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Blue Cross Blue Shield",
        healthieId: 347,
        signUpFlowSortOrder: 18,
      },
      {
        id: 149,
        payerName: "Wellmed",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 17,
      },
      {
        id: 138,
        payerName: "All Savers",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 15,
      },
      {
        id: 136,
        payerName: "Medical Mutual of Ohio",
        groupNameDeprecated: "Medical Mutual of Ohio",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Medical Mutual of Ohio",
        healthieId: 1488,
        signUpFlowSortOrder: 13,
      },
      {
        id: 332,
        payerName: "Devoted Health",
        groupNameDeprecated: "Devoted Health",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Devoted Health",
        healthieId: 3718,
        signUpFlowSortOrder: 16,
      },
      {
        id: 142,
        payerName: "Cigna Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna",
        healthieId: 1552,
        signUpFlowSortOrder: 14,
      },
      {
        id: 141,
        payerName: "Cigna Local Plus",
        groupNameDeprecated: null,
        isOON: true,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna Local Plus",
        healthieId: null,
        signUpFlowSortOrder: 12,
      },
      {
        id: 146,
        payerName: "Oxford",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 12,
      },
      {
        id: 145,
        payerName: "Meritain",
        groupNameDeprecated: "Aetna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Aetna",
        healthieId: 64,
        signUpFlowSortOrder: 11,
      },
      {
        id: 147,
        payerName: "UHC Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 1552,
        signUpFlowSortOrder: 10,
      },
      {
        id: 137,
        payerName: "Aetna Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Aetna",
        healthieId: 1552,
        signUpFlowSortOrder: 9,
      },
      {
        id: 148,
        payerName: "United Medical Resources (UMR)",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 8,
      },
      {
        id: 143,
        payerName: "Cigna Open Access Plus",
        groupNameDeprecated: "Cigna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna",
        healthieId: 528,
        signUpFlowSortOrder: 7,
      },
      {
        id: 6,
        payerName: "Medicare",
        groupNameDeprecated: "Medicare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Medicare",
        healthieId: 1552,
        signUpFlowSortOrder: 6,
      },
      {
        id: 144,
        payerName: "Medicaid",
        groupNameDeprecated: null,
        isOON: true,
        shouldHardMatchInsurance: false,
        displayGroup: "Medicaid",
        healthieId: null,
        signUpFlowSortOrder: 5,
      },
      {
        id: 3,
        payerName: "Cigna",
        groupNameDeprecated: "Cigna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Cigna",
        healthieId: 528,
        signUpFlowSortOrder: 4,
      },
      {
        id: 1,
        payerName: "Aetna",
        groupNameDeprecated: "Aetna",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Aetna",
        healthieId: 64,
        signUpFlowSortOrder: 3,
      },
      {
        id: 2,
        payerName: "Blue Cross Blue Shield Companies",
        groupNameDeprecated: "Blue Cross Blue Shield",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "Blue Cross Blue Shield",
        healthieId: 347,
        signUpFlowSortOrder: 2,
      },
      {
        id: 5,
        payerName: "United Healthcare",
        groupNameDeprecated: "United Healthcare",
        isOON: false,
        shouldHardMatchInsurance: false,
        displayGroup: "United Healthcare",
        healthieId: 2413,
        signUpFlowSortOrder: 1,
      },
    ];
  }

  function findPayerId(payerName) {
    var target = normalizeValue(payerName);
    if (!target) return null;

    // Prefer exact payerName matches, then group/display with stable ordering.
    var bestMatchId = null;
    var bestRank = Infinity;
    var bestOrder = Infinity;

    for (var i = 0; i < payersData.length; i++) {
      var payer = payersData[i] || {};
      var payerId =
        typeof payer.id === "number" || typeof payer.id === "string"
          ? payer.id
          : null;
      if (payerId === null) continue;

      var payerNameNorm = normalizeValue(payer.payerName);
      var groupNameNorm = normalizeValue(payer.groupNameDeprecated);
      var displayGroupNorm = normalizeValue(payer.displayGroup);

      var rank = null;
      if (payerNameNorm && payerNameNorm === target) {
        rank = 1;
      } else if (groupNameNorm && groupNameNorm === target) {
        rank = 2;
      } else if (displayGroupNorm && displayGroupNorm === target) {
        rank = 3;
      }

      if (rank !== null) {
        var sortOrder =
          typeof payer.signUpFlowSortOrder === "number"
            ? payer.signUpFlowSortOrder
            : Number.MAX_SAFE_INTEGER;

        if (rank < bestRank || (rank === bestRank && sortOrder < bestOrder)) {
          bestRank = rank;
          bestOrder = sortOrder;
          bestMatchId = payerId;

          if (rank === 1) break;
        }
      }
    }

    return bestMatchId;
  }

  function appendUtmParams(params) {
    try {
      var utmKeys = window.NOURISH_UTM_PARAMS || [
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

      var utmSnapshot = {};
      try {
        if (typeof window.NOURISH_GET_UTMS === "function") {
          utmSnapshot = window.NOURISH_GET_UTMS() || {};
        }
      } catch (utmError) {
        utmSnapshot = {};
      }

      var persistedUTMs = null;
      if (!utmSnapshot || !Object.keys(utmSnapshot).length) {
        try {
          var stored = sessionStorage.getItem("persistedUTMs");
          if (stored) {
            persistedUTMs = JSON.parse(stored);
          }
        } catch (storageError) {
          persistedUTMs = null;
        }
      }

      for (var i = 0; i < utmKeys.length; i++) {
        var key = utmKeys[i];
        var value = null;

        if (utmSnapshot && utmSnapshot[key]) {
          value = utmSnapshot[key];
        } else if (
          persistedUTMs &&
          persistedUTMs.params &&
          persistedUTMs.params[key]
        ) {
          value = persistedUTMs.params[key];
        }

        if (value && typeof value === "string" && value.trim()) {
          params.append(key, value.trim());
        }
      }
    } catch (e) {
      // ignore UTM resolution errors
    }
  }

  function truncateTextToWidth(text, $reference, maxWidth) {
    if (!text) return "";
    if (!maxWidth || maxWidth <= 0) return text;

    var ellipsis = "...";
    var $measure = $("<span>")
      .css({
        position: "absolute",
        visibility: "hidden",
        whiteSpace: "nowrap",
      })
      .appendTo("body");

    if ($reference && $reference.length) {
      $measure.css({
        fontFamily: $reference.css("font-family"),
        fontSize: $reference.css("font-size"),
        fontWeight: $reference.css("font-weight"),
        letterSpacing: $reference.css("letter-spacing"),
        textTransform: $reference.css("text-transform"),
      });
    }

    var truncated = text;

    var fits = function (value) {
      $measure.text(value);
      return $measure.width() <= maxWidth;
    };

    if (fits(text)) {
      $measure.remove();
      return text;
    }

    while (truncated.length > 0 && !fits(truncated + ellipsis)) {
      truncated = truncated.slice(0, -1);
    }

    var result = truncated.length ? truncated + ellipsis : ellipsis;
    $measure.remove();
    return result;
  }

  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      window.innerWidth <= 768 ||
      "ontouchstart" in window
    );
  }

  function formatDOBInput(value) {
    if (!value) return "";

    var digits = value.replace(/\D/g, "");
    if (!digits) return "";

    var monthStr = digits.substring(0, 2);
    var dayStr = digits.substring(2, 4);
    var yearStr = digits.substring(4, 8);

    function clamp(num, min, max) {
      return Math.max(min, Math.min(max, num));
    }

    if (monthStr.length === 2) {
      var mm = parseInt(monthStr, 10);
      if (Number.isNaN(mm)) mm = 1;
      mm = clamp(mm, 1, 12);
      monthStr = String(mm).padStart(2, "0");
    }

    if (dayStr.length === 2) {
      var dd = parseInt(dayStr, 10);
      if (Number.isNaN(dd)) dd = 1;
      dd = clamp(dd, 1, 31);
      dayStr = String(dd).padStart(2, "0");
    }

    if (yearStr.length === 4) {
      var yyyy = parseInt(yearStr, 10);
      var currentYear = new Date().getFullYear();
      var minYear = currentYear - 150;
      var maxYear = currentYear - 1;
      if (Number.isNaN(yyyy)) yyyy = minYear;
      yyyy = clamp(yyyy, minYear, maxYear);
      yearStr = String(yyyy);
    }

    if (monthStr.length === 2 && dayStr.length === 2 && yearStr.length === 4) {
      var mFull = parseInt(monthStr, 10);
      var yFull = parseInt(yearStr, 10);
      var maxDay = new Date(yFull, mFull, 0).getDate();
      var dFull = parseInt(dayStr, 10);
      dFull = clamp(dFull, 1, maxDay);
      dayStr = String(dFull).padStart(2, "0");
    }

    var out = monthStr;
    if (digits.length >= 2) out = monthStr + "/" + dayStr;
    if (digits.length >= 4) out = monthStr + "/" + dayStr + "/" + yearStr;
    return out;
  }

  function convertDOBForQuery(dobValue) {
    if (!dobValue || dobValue.length !== 10) return null;
    var match = dobValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      var month = match[1];
      var day = match[2];
      var year = match[3];
      return year + "-" + month + "-" + day;
    }
    return null;
  }

  function getAllWidgets() {
    var collected = [];
    var seen = new Set();

    for (var i = 0; i < widgetSelectors.length; i++) {
      var selector = widgetSelectors[i];
      $(selector).each(function () {
        var node = this;
        if (seen.has(node)) return;
        var $node = $(node);
        if (
          $node.find("#home-filter-cta").length ||
          $node.find("#insurance_filter").length ||
          $node.find("#specialty_filter").length ||
          $node.find("#state_filter").length
        ) {
          seen.add(node);
          collected.push(node);
        }
      });
    }

    return $(collected);
  }

  function getWidgetState($widget) {
    var state = $widget.data("heroFilterState");
    if (!state) {
      state = {
        insurance: null,
        state: null,
        specialties: [],
      };
      $widget.data("heroFilterState", state);
    }
    return state;
  }

  function getSelectedInsurance($widget) {
    var value = $widget
      .find('input[type="radio"][data-name="Insurance"]:checked')
      .val();
    return value || null;
  }

  function getSelectedState($widget) {
    var value = $widget
      .find('input[type="radio"][data-name="States"]:checked')
      .val();
    return value || null;
  }

  function getSelectedSpecialties($widget) {
    var results = [];
    $widget
      .find('.filter-list_component input[type="checkbox"]:checked')
      .each(function () {
        var label = $(this).closest("label").text().trim();
        if (label) results.push(label);
      });
    return results;
  }

  function updateStateLabel($widget, value) {
    var $label = $widget.find("#state-text").first();
    if (!$label.length) return;
    if (value) {
      $label.text(value);
    } else {
      $label.text("State");
    }
  }

  function updateInsuranceLabel($widget, value) {
    var defaultText = "Insurance carrier";
    var display = value || defaultText;
    var $labels = $widget.find("#insurance-text");
    if (!$labels.length) return;

    var $toggle = $widget.find("#insurance_filter").first();
    var maxWidth = $toggle.length ? $toggle.width() : null;
    var $reference = $labels.first();
    var truncated =
      value && maxWidth
        ? truncateTextToWidth(display, $reference, maxWidth)
        : display;

    $labels.each(function () {
      var $label = $(this);
      $label.text(value ? truncated : defaultText);
      if (value) {
        $label.css("color", "#191918");
        $label.attr("data-full-value", value);
      } else {
        $label.css("color", "");
        $label.removeAttr("data-full-value");
      }
    });

    var $dropdownLabel = $widget
      .find("#insurance_filter .provider-filter_dropdown-label.filter")
      .first();
    if ($dropdownLabel.length) {
      $dropdownLabel.text(value ? truncated : defaultText);
      if (value) {
        $dropdownLabel.css("color", "#191918");
      } else {
        $dropdownLabel.css("color", "");
      }
    }
  }

  function updateSpecialtyLabel($widget, values) {
    var defaultText = "Primary concern";
    var listText = Array.isArray(values) ? values.join(", ") : "";
    var $labels = $widget.find("#concern-text");
    if ($labels.length) {
      var $toggle = $widget.find("#specialty_filter").first();
      var maxWidth = $toggle.length ? $toggle.width() : null;
      var $reference = $labels.first();
      var truncated =
        listText && maxWidth
          ? truncateTextToWidth(listText, $reference, maxWidth)
          : listText;
      var displayText = truncated || defaultText;

      $labels.each(function () {
        var $label = $(this);
        $label.text(displayText);
        if (displayText !== defaultText) {
          $label.css("color", "#191918");
          $label.attr("data-full-value", listText);
        } else {
          $label.css("color", "");
          $label.removeAttr("data-full-value");
        }
      });
    }

    var countText = values && values.length ? "(" + values.length + ")" : "";
    $widget.find(".drop-label-total").each(function () {
      var $count = $(this);
      if (countText) {
        $count.text(countText).show();
      } else {
        $count.text("").hide();
      }
    });
  }

  function updateWidgetDisplay($widget) {
    var state = getWidgetState($widget);
    updateStateLabel($widget, state.state);
    updateInsuranceLabel($widget, state.insurance);
    updateSpecialtyLabel($widget, state.specialties);
  }

  function findWidgetCTA($widget) {
    var $cta = $widget.find("#home-filter-cta").first();
    if ($cta.length) return $cta;
    return $widget.find('a[href*="' + getSignupHost() + '"]').first();
  }

  function injectInsuranceOptions($widget) {
    if (!payersData || !payersData.length) return;
    if (!$widget || !$widget.length) return;

    var $container = $widget.find(
      ".filter-list_list-wrapper.filter-page.filter"
    );
    if (!$container.length) return;
    if ($container.data("heroPayersInjected")) return;

    var $dividerRow = $container.find(".filter-divider").first();
    var $insertAfter = $dividerRow.closest(".filter-list_radio-field");
    var fragment = document.createDocumentFragment();

    var sorted = payersData
      .slice()
      .filter(function (payer) {
        return payer && payer.payerName;
      })
      .sort(function (a, b) {
        return a.payerName.localeCompare(b.payerName);
      });

    sorted.forEach(function (payer) {
      var id = payer.payerName.replace(/[^a-zA-Z0-9]/g, "-");
      var label = document.createElement("label");
      label.className = "filter-list_radio-field w-radio dynamic-insurance";

      var radioDiv = document.createElement("div");
      radioDiv.className =
        "w-form-formradioinput w-form-formradioinput--inputType-custom radio-hide w-radio-input";

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "Insurance";
      input.id = id;
      input.setAttribute("data-name", "Insurance");
      input.style.opacity = "0";
      input.style.position = "absolute";
      input.style.zIndex = "-1";
      input.value = payer.payerName;

      var span = document.createElement("span");
      span.setAttribute("fs-cmsfilter-field", "insurance");
      span.className = "filter-list_label state w-form-label";
      span.setAttribute("for", id);
      span.setAttribute("tabindex", "0");
      span.textContent = payer.payerName;

      label.appendChild(radioDiv);
      label.appendChild(input);
      label.appendChild(span);
      fragment.appendChild(label);
    });

    if ($insertAfter && $insertAfter.length) {
      $insertAfter.after(fragment);
    } else {
      $container.append(fragment);
    }

    $container.data("heroPayersInjected", true);
  }

  function getWidgetFormName($widget) {
    var $form = $widget.closest("form[data-name]").first();
    if (!$form.length) {
      $form = $widget.find("form[data-name]").first();
    }
    return $form.length ? $form.attr("data-name") : "";
  }

  function selectRadioByValue($widget, dataName, targetValue) {
    if (!targetValue) return false;

    var normalizedTarget = normalizeValue(targetValue);
    if (!normalizedTarget) return false;

    var matched = false;

    $widget
      .find('input[type="radio"][data-name="' + dataName + '"]')
      .each(function () {
        var input = this;
        var value = normalizeValue(input.value);
        if (value === normalizedTarget) {
          if (!input.checked) {
            input.checked = true;
            $(input).triggerHandler("change");
          }
          matched = true;
          return false;
        }
        return true;
      });

    return matched;
  }

  function closeDropdownForElement($element) {
    if (!$element || !$element.length) return;

    var $dropdownList = $element.closest(
      ".w-dropdown-list, .provider-filter_dropdown"
    );
    if (!$dropdownList.length) return;

    var $dropdown = $dropdownList.closest(".w-dropdown");
    if (!$dropdown.length) {
      $dropdown = $dropdownList.closest(".provider-filter_dopdown");
    }

    var dropdownApi =
      window.Webflow &&
      window.Webflow.require &&
      window.Webflow.require("dropdown");

    if (dropdownApi) {
      try {
        dropdownApi.close($dropdown[0]);
      } catch (e) {
        // ignore dropdown API errors
      }
    }

    $dropdownList.removeClass("open").slideUp(0);
    $dropdown
      .find(".provider-filter_dopdown-toggle, .w-dropdown-toggle")
      .attr("aria-expanded", "false")
      .removeClass("w--open");
  }

  function updateWidgetCTA($widget) {
    if (!$widget || !$widget.length) return;

    var state = getWidgetState($widget);
    var selectedInsurance =
      state.insurance || getSelectedInsurance($widget) || null;
    var formName = getWidgetFormName($widget);
    var isInsuranceCheck = formName === "Insurance Check";

    var baseUrl = "https://" + getSignupHost() + "/";
    var params = new URLSearchParams();

    var vp = getVariationParams(window.location.pathname);
    if (vp) {
      params.append("landingPageVariation", vp.landingPageVariation);
      if (vp.variationName)
        params.append("variationName", vp.variationName);
    }

    if (selectedInsurance) {
      var normalized = normalizeValue(selectedInsurance);
      if (normalized === "i'm paying for myself") {
        params.append("nourishPayerId", -1);
      } else if (normalized === "other") {
        params.append("nourishPayerId", -2);
      } else if (normalized === "i'll choose my insurance later") {
        // do not send nourishPayerId
      } else {
        var payerId = findPayerId(selectedInsurance);
        if (payerId) {
          params.append("nourishPayerId", payerId);
        }
      }
    }

    if (isInsuranceCheck) {
      window.InsuranceSearchInput = true;
      var firstName = $widget.find("#first-name").val();
      if (firstName) {
        params.append("firstName", firstName);
      }
      var lastName = $widget.find("#last-name").val();
      if (lastName) {
        params.append("lastName", lastName);
      }
      var dob = $widget.find("#dob").val();
      if (dob && dob.length === 10) {
        var convertedDOB = convertDOBForQuery(dob);
        if (convertedDOB) {
          params.append("patientBirthday", convertedDOB);
        }
      }
    } else {
      window.InsuranceSearchInput = false;
    }

    appendUtmParams(params);
    params.append("InsuranceSearchInput", isInsuranceCheck ? "true" : "false");

    var $cta = findWidgetCTA($widget);
    if ($cta && $cta.length) {
      var currentHref = $cta.attr("href");
      if (currentHref && currentHref.indexOf(getSignupHost()) !== -1) {
        try {
          var existingUrl = new URL(currentHref, window.location.origin);
          existingUrl.searchParams.forEach(function (value, key) {
            if (!params.has(key)) params.set(key, value);
          });
        } catch (e) {}
      }
      var finalUrl = baseUrl + "?" + params.toString();
      $cta.attr("href", finalUrl);
    }

    $('a[href*="' + getSignupHost() + '"]:not(#home-filter-cta)').each(
      function () {
        var $link = $(this);
        var currentHref = $link.attr("href");
        if (!currentHref) return;
        var url;
        try {
          url = new URL(currentHref, window.location.origin);
        } catch (e) {
          return;
        }
        url.searchParams.set("InsuranceSearchInput", "false");
        $link.attr("href", url.toString());
      }
    );
  }

  function bindDobHandlers($widget) {
    var $dobInput = $widget.find("#dob");
    if (!$dobInput.length || $dobInput.data("heroFilterDobBound")) return;
    $dobInput.data("heroFilterDobBound", true);

    if (isMobileDevice()) {
      $dobInput.attr({
        inputmode: "numeric",
        pattern: "[0-9]*",
        autocomplete: "bday",
        placeholder: "MM/DD/YYYY",
      });
      $dobInput.addClass("mobile-dob-input");
    }

    $dobInput.on("input keydown keyup", function (e) {
      var $input = $(this);
      var value = $input.val();
      var cursorPosition = $input[0].selectionStart;

      if (e.type === "keydown") {
        if (e.key === "Backspace") {
          if (isMobileDevice()) {
            e.preventDefault();

            var currentValue = $input.val();
            var cursorPos = $input[0].selectionStart;

            var newValue;
            if (cursorPos >= currentValue.length) {
              newValue = currentValue.slice(0, -1);
            } else {
              newValue =
                currentValue.slice(0, cursorPos - 1) +
                currentValue.slice(cursorPos);
            }

            if (
              currentValue.length > 0 &&
              currentValue[currentValue.length - 1] === "/"
            ) {
              var digitsOnly = newValue.replace(/\D/g, "");
              if (digitsOnly.length >= 2) {
                digitsOnly = digitsOnly.slice(0, -1);
                newValue = digitsOnly;
              }
            }

            var formattedValue = formatDOBInput(newValue);
            $input.val(formattedValue);

            var newCursorPos = formattedValue.length;
            $input[0].setSelectionRange(newCursorPos, newCursorPos);

            updateWidgetCTA($widget);
            return;
          }

          if (cursorPosition > 0 && value[cursorPosition - 1] === "/") {
            setTimeout(function () {
              var newValue =
                value.substring(0, cursorPosition - 2) +
                value.substring(cursorPosition);
              var formattedValue = formatDOBInput(newValue);
              $input.val(formattedValue);

              var newCursorPos = Math.max(0, cursorPosition - 2);
              $input[0].setSelectionRange(newCursorPos, newCursorPos);

              updateWidgetCTA($widget);
            }, 0);
            e.preventDefault();
            return;
          }

          setTimeout(function () {
            var newValue = $input.val();
            var formattedValue = formatDOBInput(newValue);
            $input.val(formattedValue);

            var newCursorPos = Math.min(cursorPosition, formattedValue.length);
            $input[0].setSelectionRange(newCursorPos, newCursorPos);

            updateWidgetCTA($widget);
          }, 0);
          return;
        } else if (e.key === "Delete") {
          setTimeout(function () {
            var newValue = $input.val();
            var formattedValue = formatDOBInput(newValue);
            $input.val(formattedValue);

            var newCursorPos = Math.min(cursorPosition, formattedValue.length);
            $input[0].setSelectionRange(newCursorPos, newCursorPos);

            updateWidgetCTA($widget);
          }, 0);
          return;
        }
      }

      if (e.type === "keyup") {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          return;
        }
      }

      var formattedValue = formatDOBInput(value);

      if (formattedValue !== value) {
        $input.val(formattedValue);
      }

      if (isMobileDevice()) {
        if (formattedValue !== value) {
          var newCursor = formattedValue.length;
          $input[0].setSelectionRange(newCursor, newCursor);
        }
      } else {
        var digitsOnly = formattedValue.replace(/\D/g, "");
        var newCursorPos;
        if (digitsOnly.length <= 2) {
          newCursorPos = digitsOnly.length;
        } else if (digitsOnly.length <= 4) {
          newCursorPos = digitsOnly.length + 1;
        } else {
          newCursorPos = digitsOnly.length + 2;
        }
        newCursorPos = Math.min(newCursorPos, formattedValue.length);
        $input[0].setSelectionRange(newCursorPos, newCursorPos);
      }

      updateWidgetCTA($widget);
    });
  }

  function setupToggleA11y($toggle) {
    if (!$toggle || !$toggle.length || $toggle.data("heroFilterA11y")) return;
    $toggle.data("heroFilterA11y", true);

    var $dropdown = $toggle.closest(".provider-filter_dopdown");
    if (!$dropdown.length) {
      $dropdown = $toggle.closest(".w-dropdown");
    }
    if (!$dropdown.length) return;

    var $list = $dropdown.find(".w-dropdown-list").first();
    if (!$list.length) return;

    function getFocusableItems() {
      var $labels = $list.find(".filter-list_label.w-form-label");
      $labels.attr("tabindex", 0);
      return $labels.filter(":visible");
    }

    function openDropdown() {
      if ($toggle.attr("aria-expanded") !== "true") {
        $toggle.click();
      }
    }

    function closeDropdown(shouldFocusToggle) {
      if ($toggle.attr("aria-expanded") === "true") {
        $toggle.click();
      }
      if (shouldFocusToggle !== false) {
        $toggle.focus();
      }
    }

    function focusFirstItem() {
      var $items = getFocusableItems();
      if ($items.length) {
        $items.eq(0).focus();
      }
    }

    function moveFocus(current, delta) {
      var $items = getFocusableItems();
      if ($items.length === 0) return;
      var idx = $items.index(current);
      if (idx === -1) {
        $items.eq(0).focus();
        return;
      }
      var nextIdx = (idx + delta + $items.length) % $items.length;
      $items.eq(nextIdx).focus();
    }

    $toggle.on("keydown", function (e) {
      var key = e.key;
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        openDropdown();
        setTimeout(focusFirstItem, 0);
      } else if (key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
        setTimeout(focusFirstItem, 0);
      } else if (key === "Escape") {
        e.preventDefault();
        closeDropdown();
      }
    });

    $list.on("keydown", ".filter-list_label.w-form-label", function (e) {
      var key = e.key;
      if (key === "ArrowDown") {
        e.preventDefault();
        moveFocus($(this), 1);
      } else if (key === "ArrowUp") {
        e.preventDefault();
        moveFocus($(this), -1);
      } else if (key === "Tab") {
        var $items = getFocusableItems();
        var idx = $items.index(this);
        if (e.shiftKey) {
          if (idx <= 0) {
            closeDropdown(false);
            return;
          }
          e.preventDefault();
          moveFocus($(this), -1);
        } else {
          if (idx >= $items.length - 1) {
            closeDropdown(false);
            return;
          }
          e.preventDefault();
          moveFocus($(this), 1);
        }
      } else if (key === "Home") {
        e.preventDefault();
        var $itemsHome = getFocusableItems();
        if ($itemsHome.length) $itemsHome.eq(0).focus();
      } else if (key === "End") {
        e.preventDefault();
        var $itemsEnd = getFocusableItems();
        if ($itemsEnd.length) $itemsEnd.eq($itemsEnd.length - 1).focus();
      } else if (key === "Enter" || key === " ") {
        e.preventDefault();
        $(this).click();
        var $radio = $(this).find('input[type="radio"]');
        if ($radio.length) {
          closeDropdown(true);
        }
      } else if (key === "Escape") {
        e.preventDefault();
        closeDropdown(true);
      }
    });

    $toggle.on("click", function () {
      setTimeout(function () {
        if ($toggle.attr("aria-expanded") === "true") {
          if (!$list.find(":focus").length) {
            focusFirstItem();
          }
        }
      }, 0);
    });
  }

  function setupDropdownA11y($widget) {
    var selectors = [
      "#insurance_filter",
      ".provider-filter_dopdown.specialty .provider-filter_dopdown-toggle",
      ".provider-filter_dopdown.specialty .w-dropdown-toggle",
      "#w-dropdown-toggle-0",
    ];

    for (var i = 0; i < selectors.length; i++) {
      $widget.find(selectors[i]).each(function () {
        setupToggleA11y($(this));
      });
    }
  }

  function applyPrefills($widget) {
    var state = getWidgetState($widget);

    if (
      typeof stateFilter !== "undefined" &&
      stateFilter !== null &&
      !state.state
    ) {
      if (!selectRadioByValue($widget, "States", stateFilter)) {
        state.state = stateFilter;
        updateStateLabel($widget, state.state);
      }
    }

    if (
      typeof insFilter !== "undefined" &&
      insFilter !== null &&
      !state.insurance
    ) {
      if (!selectRadioByValue($widget, "Insurance", insFilter)) {
        state.insurance = insFilter;
        updateInsuranceLabel($widget, state.insurance);
      }
    }

    var insuranceParam = getQueryParam("insurance");
    if (insuranceParam) {
      selectRadioByValue($widget, "Insurance", insuranceParam);
      state.insurance = getSelectedInsurance($widget) || state.insurance;
    }
  }

  function initWidget($widget) {
    if (!$widget || !$widget.length) return;
    if ($widget.data("heroFilterInitialized")) return;
    $widget.data("heroFilterInitialized", true);

    var state = getWidgetState($widget);
    state.insurance = state.insurance || getSelectedInsurance($widget);
    state.state = state.state || getSelectedState($widget);
    state.specialties = getSelectedSpecialties($widget);

    updateWidgetDisplay($widget);
    applyPrefills($widget);

    state.insurance = getSelectedInsurance($widget) || state.insurance;
    state.state = getSelectedState($widget) || state.state;
    state.specialties = getSelectedSpecialties($widget);

    updateWidgetDisplay($widget);

    $widget.on("click", ".filter-list_label", function () {
      var $radio = $(this).siblings(".radio-hide");
      if ($radio.length) {
        $radio.trigger("click");
      }
    });

    $widget.on(
      "change",
      'input[type="radio"][data-name="States"]',
      function () {
        var value = $(this).val();
        state.state = value || null;
        updateStateLabel($widget, state.state);
        updateWidgetCTA($widget);
        closeDropdownForElement($(this));
      }
    );

    $widget.on(
      "change",
      'input[type="radio"][data-name="Insurance"]',
      function () {
        var value = $(this).val();
        state.insurance = value || null;
        updateInsuranceLabel($widget, state.insurance);
        updateWidgetCTA($widget);
        closeDropdownForElement($(this));
      }
    );

    // If the user taps the already-selected insurance option on mobile, also close.
    $widget.on(
      "click",
      'input[type="radio"][data-name="Insurance"], .filter-list_label[for]',
      function () {
        var $radio = $(this);
        if (!$radio.is('input[type="radio"]')) {
          var targetId = $radio.attr("for");
          if (targetId) {
            var $target = $("#" + targetId);
            if ($target.is('input[type="radio"][data-name="Insurance"]')) {
              $radio = $target;
            }
          }
        }
        if (!$radio.length || !$radio.is('input[type="radio"]')) return;
        if ($radio.prop("checked")) {
          setTimeout(function () {
            closeDropdownForElement($radio);
          }, 0);
        }
      }
    );

    $widget.on("click", ".filter-list_input-group", function (e) {
      e.preventDefault();
      var $checkbox = $(this).find('input[type="checkbox"]');
      var $box = $(this).find(".w-checkbox-input");
      if (!$checkbox.length || !$box.length) return;

      var isChecked = !$checkbox.prop("checked");
      $checkbox.prop("checked", isChecked);
      $box.toggleClass("w--redirected-checked", isChecked);
      $checkbox.trigger("change");
    });

    $widget.on(
      "change",
      '.filter-list_component input[type="checkbox"]',
      function () {
        state.specialties = getSelectedSpecialties($widget);
        updateSpecialtyLabel($widget, state.specialties);
        updateWidgetCTA($widget);
      }
    );

    $widget.on("input", "#first-name, #last-name", function () {
      updateWidgetCTA($widget);
    });

    bindDobHandlers($widget);
    setupDropdownA11y($widget);

    $widget.on("click", ".provider-filter_close-box", function () {
      var $dropdown = $(this).closest(
        ".provider-filter_dropdown, .provider-filter_dopdown, .w-dropdown"
      );
      var $list = $dropdown.find("#dropdown-list-1").first();
      if (!$list.length) {
        $list = $widget.find("#dropdown-list-1").first();
      }
      if ($list.length) {
        if ($list.hasClass("open")) {
          $list.removeClass("open");
          $(this).attr("aria-expanded", "false");
        } else {
          $list.addClass("open");
          $(this).attr("aria-expanded", "true");
        }
      }
    });

    updateWidgetCTA($widget);
  }

  $(document).on(
    "click.heroFilterClose",
    ".w-button, .w-radio, .provider-filter_close-box",
    function () {
      $(".w-dropdown").trigger("w-close");
      try {
        var escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          keyCode: 27,
          code: "Escape",
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.activeElement.dispatchEvent(escapeEvent);
      } catch (e) {
        // ignore keyboard dispatch issues
      }
    }
  );

  var $widgets = getAllWidgets();
  $widgets.each(function (index) {
    $(this).data("heroFilterInstance", index);
    initWidget($(this));
  });

  if ($widgets.length) {
    $(document).on("click.heroFilterState", function (event) {
      $widgets.each(function () {
        var $widget = $(this);
        var $toggle = $widget.find("#state_filter").first();
        var $list = $widget.find("#dropdown-list-1").first();
        if (!$toggle.length || !$list.length) return;

        if (
          $toggle.is(event.target) ||
          $toggle.has(event.target).length ||
          $list.is(event.target) ||
          $list.has(event.target).length
        ) {
          return;
        }

        if ($list.hasClass("open")) {
          $list.removeClass("open");
          $toggle.attr("aria-expanded", "false");
        }
      });
    });
  }

  setTimeout(function () {
    $widgets.each(function () {
      updateWidgetCTA($(this));
    });
  }, 100);

  fetchPayersData()
    .then(function () {
      dataReady = true;
      $widgets.each(function () {
        injectInsuranceOptions($(this));
        updateWidgetCTA($(this));
      });
    })
    .catch(function (error) {
      console.error("Error loading provider search payers:", error);
      dataReady = true;
      $widgets.each(function () {
        injectInsuranceOptions($(this));
        updateWidgetCTA($(this));
      });
    });
});
