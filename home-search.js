$(document).ready(function () {
  // Global variables to store API data
  var payersData = [];

  // Variable to track if click came from insurance search form (name/dob/payer)
  window.InsuranceSearchInput = false;

  // Variable to track selected insurance
  var insurance;

  // Function to get landing page variation based on current path (same as global.js)
  function variationFromPath(path) {
    path = (path || window.location.pathname || "/").toLowerCase();
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (path === "/") return "Organic_Homepage";
    if (path.indexOf("/blog") === 0) return "blog";
    if (path.indexOf("/landing-page") === 0) return "landing-page";
    if (path.indexOf("/conditions") === 0) return "conditions";
    if (path.indexOf("/local-dietitians") === 0) return "local-dietitians";
    if (path.indexOf("/paid") === 0) return "Paid_Homepage";
    if (path.indexOf("/does-my-insurance-cover-nutrition") === 0)
      return "Am_I_Covered";
    return null;
  }

  // Function to get query parameter by name
  function getQueryParam(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Function to fetch payers data
  function fetchPayersData() {
    return fetch("https://app.usenourish.com/api/payers?source=sign-up", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch payers data: " + response.status);
        }
        return response.json();
      })
      .then((data) => {
        payersData = data;
        return data;
      })
      .catch((error) => {
        // Fallback to hardcoded payer data for staging/CORS issues
        payersData = [
          {
            id: 1,
            payerName: "Aetna",
            groupNameDeprecated: "Aetna",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Aetna",
            healthieId: 64,
          },
          {
            id: 3,
            payerName: "Cigna",
            groupNameDeprecated: "Cigna",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Cigna",
            healthieId: 528,
          },
          {
            id: 5,
            payerName: "United Healthcare",
            groupNameDeprecated: "United Healthcare",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "United Healthcare",
            healthieId: 2413,
          },
          {
            id: 2,
            payerName: "Blue Cross Blue Shield Companies",
            groupNameDeprecated: "Blue Cross Blue Shield",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Blue Cross Blue Shield",
            healthieId: 347,
          },
          {
            id: 138,
            payerName: "All Savers",
            groupNameDeprecated: "United Healthcare",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "United Healthcare",
            healthieId: 2413,
          },
          {
            id: 333,
            payerName: "Independence Keystone Health",
            groupNameDeprecated: "Blue Cross Blue Shield",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Blue Cross Blue Shield",
            healthieId: 347,
          },
          {
            id: 143,
            payerName: "Cigna Open Access Plus",
            groupNameDeprecated: "Cigna",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Cigna",
            healthieId: 528,
          },
          {
            id: 145,
            payerName: "Meritain",
            groupNameDeprecated: "Aetna",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Aetna",
            healthieId: 64,
          },
          {
            id: 146,
            payerName: "Oxford",
            groupNameDeprecated: "United Healthcare",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "United Healthcare",
            healthieId: 2413,
          },
          {
            id: 148,
            payerName: "United Medical Resources (UMR)",
            groupNameDeprecated: "United Healthcare",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "United Healthcare",
            healthieId: 2413,
          },
          {
            id: 149,
            payerName: "Wellmed",
            groupNameDeprecated: "United Healthcare",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "United Healthcare",
            healthieId: 2413,
          },
          {
            id: 136,
            payerName: "Medical Mutual of Ohio",
            groupNameDeprecated: "Medical Mutual of Ohio",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Medical Mutual of Ohio",
            healthieId: 1488,
          },
          {
            id: 141,
            payerName: "Cigna Local Plus",
            groupNameDeprecated: null,
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "Cigna Local Plus",
            healthieId: null,
          },
          {
            id: 144,
            payerName: "Medicaid",
            groupNameDeprecated: null,
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "Medicaid",
            healthieId: null,
          },
          {
            id: 147,
            payerName: "UHC Medicare",
            groupNameDeprecated: "Medicare",
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "United Healthcare",
            healthieId: 1552,
          },
          {
            id: 142,
            payerName: "Cigna Medicare",
            groupNameDeprecated: "Medicare",
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "Cigna",
            healthieId: 1552,
          },
          {
            id: 137,
            payerName: "Aetna Medicare",
            groupNameDeprecated: "Medicare",
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "Aetna",
            healthieId: 1552,
          },
          {
            id: 6,
            payerName: "Medicare",
            groupNameDeprecated: "Medicare",
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "Medicare",
            healthieId: 1552,
          },
          {
            id: 332,
            payerName: "Devoted Health",
            groupNameDeprecated: "Devoted Health",
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "Devoted Health",
            healthieId: 3718,
          },
        ];
        return payersData;
      });
  }

  // Function to find payer ID by name (now uses data-payer-id attribute)
  function findPayerId(payerName) {
    // First try to get from data attribute on selected radio button
    var $selectedRadio = $('input[data-name="Insurance"]:checked');
    if ($selectedRadio.length && $selectedRadio.attr("data-payer-id")) {
      return parseInt($selectedRadio.attr("data-payer-id"));
    }

    // Fallback: search in payersData array
    var payer = payersData.find((item) => item.payerName === payerName);
    return payer ? payer.id : null;
  }

  // Function to format DOB input with forward slashes and backspace support
  function formatDOBInput(value) {
    // Remove non-digits and cap to 8 (MMDDYYYY)
    var digits = value.replace(/\D/g, "").substring(0, 8);

    var monthStr = digits.substring(0, 2);
    var dayStr = digits.substring(2, 4);
    var yearStr = digits.substring(4, 8);

    function clamp(num, min, max) {
      return Math.max(min, Math.min(max, num));
    }

    // Clamp month once we have 2 digits
    if (monthStr.length === 2) {
      var mm = parseInt(monthStr, 10);
      if (Number.isNaN(mm)) mm = 1;
      mm = clamp(mm, 1, 12);
      monthStr = String(mm).padStart(2, "0");
    }

    // Clamp day broadly to 1..31 once we have 2 digits
    if (dayStr.length === 2) {
      var dd = parseInt(dayStr, 10);
      if (Number.isNaN(dd)) dd = 1;
      dd = clamp(dd, 1, 31);
      dayStr = String(dd).padStart(2, "0");
    }

    // Clamp year to [currentYear-150, currentYear-1] once we have 4 digits
    if (yearStr.length === 4) {
      var yyyy = parseInt(yearStr, 10);
      var currentYear = new Date().getFullYear();
      var minYear = currentYear - 150;
      var maxYear = currentYear - 1; // ensure at least 1 year old
      if (Number.isNaN(yyyy)) yyyy = minYear;
      yyyy = clamp(yyyy, minYear, maxYear);
      yearStr = String(yyyy);
    }

    // If full date, refine day based on month/year (leap years)
    if (monthStr.length === 2 && dayStr.length === 2 && yearStr.length === 4) {
      var mFull = parseInt(monthStr, 10);
      var yFull = parseInt(yearStr, 10);
      var maxDay = new Date(yFull, mFull, 0).getDate();
      var dFull = parseInt(dayStr, 10);
      dFull = clamp(dFull, 1, maxDay);
      dayStr = String(dFull).padStart(2, "0");
    }

    // Rebuild with slashes based on available segments
    var out = monthStr;
    if (digits.length >= 2) out = monthStr + "/" + dayStr;
    if (digits.length >= 4) out = monthStr + "/" + dayStr + "/" + yearStr;
    return out;
  }

  // Function to convert MM/DD/YYYY to YYYY-MM-DD for query param
  function convertDOBForQuery(dobValue) {
    if (!dobValue || dobValue.length !== 10) return null;

    // Check if it's in MM/DD/YYYY format
    var match = dobValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      var month = match[1];
      var day = match[2];
      var year = match[3];
      return year + "-" + month + "-" + day;
    }

    return null;
  }

  // (Removed inline DOB error UI by request)

  // extractCityStateZip function removed - no longer needed since city-state-zip field doesn't exist

  // Function to determine if user is in control group
  function isControlGroup() {
    // Always return false to use Provider_Search variant for home page
    return false;
  }

  // Function to update the CTA URL with new format
  function updateCTAUrl() {
    var baseUrl = "https://signup.usenourish.com/";
    var params = new URLSearchParams();

    // Get the form name to determine which variant to use
    var formName = $("form[data-name]").attr("data-name");

    // Add landingPageVariation parameter for tracking (not functionality)
    var v = variationFromPath(window.location.pathname);
    if (v) params.append("landingPageVariation", v);

    // Get selected insurance (use raw value, not truncated label)
    var selectedInsuranceRaw =
      (typeof insurance !== "undefined" && insurance) ||
      $('input[type="radio"][data-name="Insurance"]:checked').val() ||
      null;

    if (selectedInsuranceRaw) {
      var normalizedInsurance = String(selectedInsuranceRaw)
        .replace(/\u2019/g, "'")
        .trim();
      var normalizedLower = normalizedInsurance.toLowerCase();

      if (normalizedLower === "i'm paying for myself") {
        params.append("nourishPayerId", -1);
      } else if (normalizedLower === "other") {
        params.append("nourishPayerId", -2);
      } else if (normalizedLower === "i'll choose my insurance later") {
        // Do not send nourishPayerId for this choice
      } else {
        var payerId = findPayerId(normalizedInsurance);
        if (payerId) {
          params.append("nourishPayerId", payerId);
        }
      }
    }

    // Location functionality removed - city-state-zip field no longer exists

    // Get Insurance Check form fields (only for Insurance Check form)
    if (formName === "Insurance Check") {
      // Set InsuranceSearchInput to true for insurance check form CTA
      window.InsuranceSearchInput = true;

      var firstName = $("#first-name").val();
      if (firstName) {
        params.append("firstName", firstName);
      }

      var lastName = $("#last-name").val();
      if (lastName) {
        params.append("lastName", lastName);
      }

      var dob = $("#dob").val();
      if (dob && dob.length === 10) {
        var convertedDOB = convertDOBForQuery(dob);
        if (convertedDOB) {
          params.append("patientBirthday", convertedDOB);
        }
      }
    } else {
      // Set InsuranceSearchInput to false for main search CTA (not insurance check form)
      window.InsuranceSearchInput = false;
    }

    // Append UTM parameters from global.js (stored in sessionStorage)
    try {
      // Get UTM keys dynamically from global.js to avoid duplication
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

      // Read from global.js persistedUTMs object
      var persistedUTMs = null;
      try {
        var stored = sessionStorage.getItem("persistedUTMs");
        if (stored) {
          persistedUTMs = JSON.parse(stored);
        }
      } catch (e) {
        // ignore sessionStorage access errors
      }

      for (var i = 0; i < utmKeys.length; i++) {
        var key = utmKeys[i];
        var value = null;

        // Try to get from persistedUTMs first
        if (
          persistedUTMs &&
          persistedUTMs.params &&
          persistedUTMs.params[key]
        ) {
          value = persistedUTMs.params[key];
        }

        if (value && value.trim()) {
          params.append(key, value.trim());
        }
      }
    } catch (e) {
      // ignore sessionStorage access errors
    }

    // Add InsuranceSearchInput parameter to URL
    params.append("InsuranceSearchInput", window.InsuranceSearchInput);

    // Build final URL
    var finalUrl = baseUrl + "?" + params.toString();
    $("#home-filter-cta").attr("href", finalUrl);

    // Update all OTHER signup.usenourish.com links on the page with InsuranceSearchInput = false
    $('a[href*="signup.usenourish.com"]:not(#home-filter-cta)').each(
      function () {
        var $link = $(this);
        var currentHref = $link.attr("href");
        var url = new URL(currentHref);

        // Add InsuranceSearchInput = false for all other CTAs
        url.searchParams.set("InsuranceSearchInput", "false");

        $link.attr("href", url.toString());
      }
    );
  }

  // UTM parameter capture is handled by global.js
  // Delay initial call to ensure global.js has processed UTMs
  setTimeout(function () {
    updateCTAUrl();
  }, 100);

  // Function to populate insurance dropdown with live API data
  function updateInsuranceOptions() {
    console.log("updateInsuranceOptions called");
    console.log("payersData:", payersData);
    if (!payersData || payersData.length === 0) return;

    // Try multiple selectors to find the insurance container
    var $container = $(
      ".filter-list_list-wrapper:has(input[value='I'm paying for myself'])"
    );
    if ($container.length === 0) {
      $container = $(
        ".filter-list_list-wrapper:has(input[value='I'll choose my insurance later'])"
      );
    }
    if ($container.length === 0) {
      console.warn("Insurance container not found with any selector");
      console.log(
        "Available filter-list_list-wrapper elements:",
        $(".filter-list_list-wrapper").length
      );
      return;
    }

    // Find where to insert after the divider
    var $insertAfter = $container.find(".filter-divider");
    if ($insertAfter.length === 0) {
      console.warn("Divider not found, using fallback");
      $insertAfter = $container
        .find('input[value="I\'ll choose my insurance later"]')
        .closest("label");
    }

    // Remove ALL hardcoded insurance options except the two special ones
    $container
      .find(
        'label:has(input[data-name="Insurance"]):not(:has(input[value="I\'m paying for myself"])):not(:has(input[value="I\'ll choose my insurance later"]))'
      )
      .remove();

    // Add live API options (sorted alphabetically)
    var sortedPayers = payersData
      .filter(function (payer) {
        return payer.payerName && payer.payerName.trim();
      })
      .sort(function (a, b) {
        return a.payerName.localeCompare(b.payerName);
      });

    sortedPayers.forEach(function (payer) {
      var payerId = payer.payerName.replace(/[^a-zA-Z0-9]/g, "-");
      var html =
        '<label class="filter-list_radio-field w-radio">' +
        '<div class="w-form-formradioinput w-form-formradioinput--inputType-custom radio-hide w-radio-input"></div>' +
        '<input type="radio" name="Insurance" id="' +
        payerId +
        '" data-name="Insurance" style="opacity:0;position:absolute;z-index:-1" value="' +
        payer.payerName +
        '" data-payer-id="' +
        payer.id +
        '">' +
        '<span fs-cmsfilter-field="insurance" class="filter-list_label state w-form-label" for="' +
        payerId +
        '" tabindex="0">' +
        payer.payerName +
        "</span>" +
        "</label>";
      $insertAfter.after(html);
    });

    // Add "Other" option at the end
    var otherHtml =
      '<label class="filter-list_radio-field w-radio">' +
      '<div class="w-form-formradioinput w-form-formradioinput--inputType-custom radio-hide w-radio-input"></div>' +
      '<input type="radio" name="Insurance" id="Other" data-name="Insurance" style="opacity:0;position:absolute;z-index:-1" value="Other">' +
      '<span fs-cmsfilter-field="insurance" class="filter-list_label state w-form-label" for="Other" tabindex="0">Other</span>' +
      "</label>";
    $container.append(otherHtml);

    console.log(
      "Insurance dropdown updated with " + payersData.length + " live payers"
    );
    console.log("Container found:", $container.length > 0);
    console.log("Insert after element found:", $insertAfter.length > 0);
    console.log("Sorted payers count:", sortedPayers.length);
  }

  // Load API data on page load
  fetchPayersData()
    .then(() => {
      // Replace static options with live API data
      updateInsuranceOptions();
      // Initial URL update
      updateCTAUrl();
    })
    .catch((error) => {
      // Still update URL even if APIs fail
      updateCTAUrl();
    });

  // Add event listeners for Insurance Check form fields
  $("#first-name, #last-name").on("input", function () {
    updateCTAUrl();
  });

  // Function to detect mobile devices
  function isMobileDevice() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      window.innerWidth <= 768 ||
      "ontouchstart" in window
    );
  }

  // Initialize mobile-friendly DOB field
  function initializeMobileDOB() {
    var $dobInput = $("#dob");
    if ($dobInput.length === 0) return;

    if (isMobileDevice()) {
      // Set mobile-friendly attributes
      $dobInput.attr({
        inputmode: "numeric",
        pattern: "[0-9]*",
        autocomplete: "bday",
        placeholder: "MM/DD/YYYY",
      });

      // Add mobile-specific styling
      $dobInput.css({
        "font-size": "16px", // Prevents zoom on iOS
        "min-height": "44px", // Minimum touch target size
        padding: "12px 16px", // Better touch area
      });

      // Add mobile-friendly class for additional styling
      $dobInput.addClass("mobile-dob-input");
    }
  }

  // Initialize mobile DOB on page load
  initializeMobileDOB();

  // Enhanced DOB field handling with mobile support
  $("#dob").on("input keydown keyup", function (e) {
    var $input = $(this);
    var value = $input.val();
    var cursorPosition = $input[0].selectionStart;

    // Handle backspace/delete operations
    if (e.type === "keydown") {
      if (e.key === "Backspace") {
        // On mobile, handle backspace more aggressively
        if (isMobileDevice()) {
          e.preventDefault(); // Prevent default to handle manually

          var currentValue = $input.val();
          var cursorPos = $input[0].selectionStart;

          // Remove the last character (digit or slash)
          var newValue;
          if (cursorPos >= currentValue.length) {
            // Remove last character
            newValue = currentValue.slice(0, -1);
          } else {
            // Remove character before cursor
            newValue =
              currentValue.slice(0, cursorPos - 1) +
              currentValue.slice(cursorPos);
          }

          // If we removed a slash, also remove the digit before it to actually "go back"
          if (
            currentValue.length > 0 &&
            currentValue[currentValue.length - 1] === "/"
          ) {
            // We're trying to delete a slash, so remove more content
            var digitsOnly = newValue.replace(/\D/g, "");
            if (digitsOnly.length >= 2) {
              // Remove the last digit to actually go back past the slash
              digitsOnly = digitsOnly.slice(0, -1);
              newValue = digitsOnly;
            }
          }

          // Format the new value
          var formattedValue = formatDOBInput(newValue);
          $input.val(formattedValue);

          // Set cursor at the end for mobile
          var newCursorPos = formattedValue.length;
          $input[0].setSelectionRange(newCursorPos, newCursorPos);

          updateCTAUrl();
          return;
        }

        // Desktop: Check if cursor is right after a slash
        if (cursorPosition > 0 && value[cursorPosition - 1] === "/") {
          // Move cursor back one more position to delete the digit before the slash
          setTimeout(function () {
            var newValue =
              value.substring(0, cursorPosition - 2) +
              value.substring(cursorPosition);
            var formattedValue = formatDOBInput(newValue);
            $input.val(formattedValue);

            // Position cursor after the slash that gets re-added
            var newCursorPos = Math.max(0, cursorPosition - 2);
            $input[0].setSelectionRange(newCursorPos, newCursorPos);

            updateCTAUrl();
          }, 0);
          e.preventDefault();
          return;
        }
        // Allow normal backspace for other cases
        setTimeout(function () {
          var newValue = $input.val();
          var formattedValue = formatDOBInput(newValue);
          $input.val(formattedValue);

          // Restore cursor position after formatting
          var newCursorPos = Math.min(cursorPosition, formattedValue.length);
          $input[0].setSelectionRange(newCursorPos, newCursorPos);

          updateCTAUrl();
        }, 0);
        return;
      } else if (e.key === "Delete") {
        // Handle delete key similarly
        setTimeout(function () {
          var newValue = $input.val();
          var formattedValue = formatDOBInput(newValue);
          $input.val(formattedValue);

          // Restore cursor position after formatting
          var newCursorPos = Math.min(cursorPosition, formattedValue.length);
          $input[0].setSelectionRange(newCursorPos, newCursorPos);

          updateCTAUrl();
        }, 0);
        return;
      }
    }

    // Handle regular input
    if (e.type === "input") {
      // On mobile, detect if this was a deletion (shorter value)
      var wasDeleted = false;
      if (isMobileDevice()) {
        var prevLength = $input.data("prevLength") || 0;
        var currentLength = value.replace(/\D/g, "").length; // Count only digits
        wasDeleted = currentLength < prevLength;
        $input.data("prevLength", currentLength);
      }

      var formattedValue = formatDOBInput(value);

      // Only update if the formatted value is different to avoid cursor jumping
      if (formattedValue !== value) {
        $input.val(formattedValue);
      }

      // Different cursor positioning for mobile vs desktop
      if (isMobileDevice()) {
        // On mobile, handle cursor positioning based on action
        if (formattedValue !== value || wasDeleted) {
          var newCursorPos = formattedValue.length;
          $input[0].setSelectionRange(newCursorPos, newCursorPos);
        }
      } else {
        // Desktop: Smart cursor positioning for new input
        var digitsOnly = value.replace(/\D/g, "");
        var newCursorPos;

        if (digitsOnly.length <= 2) {
          // For month: position after the digits
          newCursorPos = digitsOnly.length;
        } else if (digitsOnly.length <= 4) {
          // For day: position after the day digits (accounting for slash)
          newCursorPos = digitsOnly.length + 1;
        } else {
          // For year: position after the year digits (accounting for slashes)
          newCursorPos = digitsOnly.length + 2;
        }

        // Ensure cursor doesn't go beyond the formatted string
        newCursorPos = Math.min(newCursorPos, formattedValue.length);
        $input[0].setSelectionRange(newCursorPos, newCursorPos);
      }

      updateCTAUrl();
    }
  });

  // Function to trigger click event on matching radio button
  function clickMatchingRadioButton(paramName, dataName) {
    var paramValue = getQueryParam(paramName);
    if (paramValue) {
      $('input[type="radio"][data-name="' + dataName + '"]').each(function () {
        if ($(this).val() === paramValue) {
          $(this).click();
        }
      });
    }
  }

  // Call the function for the 'Insurance' query parameter
  clickMatchingRadioButton("insurance", "Insurance");

  $(".w-button, .w-radio, .provider-filter_close-box").on("click", function () {
    // Trigger a custom event "w-close"
    $(".w-dropdown").trigger("w-close");

    // Create and dispatch a keydown event for the Escape key using vanilla JavaScript
    var event = new KeyboardEvent("keydown", {
      key: "Escape",
      keyCode: 27,
      code: "Escape",
      which: 27,
      bubbles: true,
      cancelable: true,
    });

    // Dispatch the event on the active element to mimic the actual Escape key behavior
    document.activeElement.dispatchEvent(event);
  });

  var state, insurance, thisDropdown;

  $(".filter-list_label").on("click", function () {
    $(this).siblings(".radio-hide").trigger("click");
  });

  // Listen for click events on radio buttons with data-name="States"
  $('input[type="radio"][data-name="States"]').on("click", function () {
    var selected = $(this).val(); // Get the value of the clicked radio button
    state = selected;

    // Update the text of #state-text with the selected state
    $("#state-text").text(selected);

    updateCTAUrl();
  });

  function updateStatePlaceholder() {
    if (typeof stateFilter !== "undefined" && stateFilter !== null) {
      state = stateFilter;

      // Update the text of #state-text with the selected state
      $("#state-text").text(stateFilter);

      updateCTAUrl();
    }
  }
  updateStatePlaceholder();

  // Listen for click events on radio buttons with data-name="Insurance"
  $('input[type="radio"][data-name="Insurance"]').on("click", function () {
    var selected = $(this).val(); // Get the value of the clicked radio button
    insurance = selected;
    var $insuranceFilter = $("#insurance_filter");
    var maxWidth = $insuranceFilter.width();

    // Update the text of #insurance-text with the selected insurance
    var $insuranceText = $("#insurance-text");
    var newText = truncateText(insurance, maxWidth);

    // Try multiple approaches to update the text
    $insuranceText.text(newText);
    $insuranceText.html(newText);

    // Also try targeting by class but only within the insurance dropdown
    $("#insurance_filter .provider-filter_dropdown-label.filter").text(newText);
    $("#insurance_filter .provider-filter_dropdown-label.filter").html(newText);

    // Try direct DOM manipulation
    var insuranceTextElement = document.getElementById("insurance-text");
    if (insuranceTextElement) {
      insuranceTextElement.textContent = newText;
      insuranceTextElement.innerHTML = newText;
    }

    // Update text color to #191918 when text is changed from default
    if (newText !== "Insurance carrier") {
      $insuranceText.css("color", "#191918");
      $("#insurance_filter .provider-filter_dropdown-label.filter").css(
        "color",
        "#191918"
      );
      if (insuranceTextElement) {
        insuranceTextElement.style.color = "#191918";
      }
    }

    // Also try updating with a slight delay to override any Webflow scripts
    setTimeout(function () {
      $insuranceText.text(newText);
      $insuranceText.html(newText);
      $("#insurance_filter .provider-filter_dropdown-label.filter").text(
        newText
      );
      $("#insurance_filter .provider-filter_dropdown-label.filter").html(
        newText
      );
      if (insuranceTextElement) {
        insuranceTextElement.textContent = newText;
        insuranceTextElement.innerHTML = newText;
      }

      // Update text color to #191918 when text is changed from default
      if (newText !== "Insurance carrier") {
        $insuranceText.css("color", "#191918");
        $("#insurance_filter .provider-filter_dropdown-label.filter").css(
          "color",
          "#191918"
        );
        if (insuranceTextElement) {
          insuranceTextElement.style.color = "#191918";
        }
      }
    }, 100);

    updateCTAUrl();
  });

  // Also listen for clicks on insurance labels
  $('label:has(input[type="radio"][data-name="Insurance"])').on(
    "click",
    function () {
      var $radio = $(this).find('input[type="radio"]');
      var selected = $radio.val();
      insurance = selected;
      var $insuranceFilter = $("#insurance_filter");
      var maxWidth = $insuranceFilter.width();

      // Update the text of #insurance-text with the selected insurance
      var $insuranceText = $("#insurance-text");
      var newText = truncateText(insurance, maxWidth);
      $insuranceText.text(newText);
      // Match color behavior of mouse selection
      if (newText !== "Insurance carrier") {
        $insuranceText.css("color", "#191918");
        $("#insurance_filter .provider-filter_dropdown-label.filter").css(
          "color",
          "#191918"
        );
        var insuranceTextElement = document.getElementById("insurance-text");
        if (insuranceTextElement) {
          insuranceTextElement.style.color = "#191918";
        }
      }

      updateCTAUrl();
    }
  );

  // Listen for change events on insurance radio buttons
  $('input[type="radio"][data-name="Insurance"]').on("change", function () {
    var selected = $(this).val();
    insurance = selected;
    var $insuranceFilter = $("#insurance_filter");
    var maxWidth = $insuranceFilter.width();

    // Update the text of #insurance-text with the selected insurance
    var $insuranceText = $("#insurance-text");
    var newText = truncateText(insurance, maxWidth);
    $insuranceText.text(newText);
    // Match color behavior
    if (newText !== "Insurance carrier") {
      $insuranceText.css("color", "#191918");
      $("#insurance_filter .provider-filter_dropdown-label.filter").css(
        "color",
        "#191918"
      );
      var insuranceTextElement = document.getElementById("insurance-text");
      if (insuranceTextElement) {
        insuranceTextElement.style.color = "#191918";
      }
    }

    updateCTAUrl();
  });

  // Listen for clicks on insurance filter list labels
  $('.filter-list_label:has(input[type="radio"][data-name="Insurance"])').on(
    "click",
    function () {
      var $radio = $(this).find('input[type="radio"]');
      var selected = $radio.val();
      insurance = selected;
      var $insuranceFilter = $("#insurance_filter");
      var maxWidth = $insuranceFilter.width();

      // Update the text of #insurance-text with the selected insurance
      var $insuranceText = $("#insurance-text");
      var newText = truncateText(insurance, maxWidth);
      $insuranceText.text(newText);
      // Match color behavior
      if (newText !== "Insurance carrier") {
        $insuranceText.css("color", "#191918");
        $("#insurance_filter .provider-filter_dropdown-label.filter").css(
          "color",
          "#191918"
        );
        var insuranceTextElement = document.getElementById("insurance-text");
        if (insuranceTextElement) {
          insuranceTextElement.style.color = "#191918";
        }
      }

      updateCTAUrl();
    }
  );

  function updateInsurancePlaceholder() {
    if (typeof insFilter !== "undefined" && insFilter !== null) {
      var $insuranceFilter = $("#insurance_filter");
      var maxWidth = $insuranceFilter.width();

      // Update the text of #insurance-text with the selected insurance
      $("#insurance-text").text(truncateText(insFilter, maxWidth));
      insurance = insFilter;

      updateCTAUrl();
    } else {
      // Set default text for insurance
      $("#insurance-text").text("Insurance carrier");
    }
  }
  updateInsurancePlaceholder();

  // Keyboard accessibility for dropdowns (insurance and primary concern)
  function setupDropdownA11y(toggleSelector) {
    var $toggle = $(toggleSelector);
    if ($toggle.length === 0) return;

    var $dropdown = $toggle.closest(".provider-filter_dopdown");
    if ($dropdown.length === 0) return;

    var $list = $dropdown.find(".w-dropdown-list");

    function getFocusableItems() {
      // Make labels focusable to enable roving focus
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

    // Toggle key handling: Enter/Space opens and focuses first item; ArrowDown opens + focuses first
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

    // Roving focus and selection within list items (labels)
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
            // Let focus move out of the dropdown naturally
            closeDropdown(false);
            return; // do not preventDefault
          }
          e.preventDefault();
          moveFocus($(this), -1);
        } else {
          if (idx >= $items.length - 1) {
            // Let focus move out of the dropdown naturally
            closeDropdown(false);
            return;
          }
          e.preventDefault();
          moveFocus($(this), 1);
        }
      } else if (key === "Home") {
        e.preventDefault();
        var $items = getFocusableItems();
        if ($items.length) $items.eq(0).focus();
      } else if (key === "End") {
        e.preventDefault();
        var $itemsEnd = getFocusableItems();
        if ($itemsEnd.length) $itemsEnd.eq($itemsEnd.length - 1).focus();
      } else if (key === "Enter" || key === " ") {
        // Activate selection via label click
        e.preventDefault();
        $(this).click();
        // Ensure color update when selecting via keyboard
        var labelText = $(this).text().trim();
        var $insuranceText = $("#insurance-text");
        if ($insuranceText.length && labelText !== "Insurance carrier") {
          $insuranceText.css("color", "#191918");
          $("#insurance_filter .provider-filter_dropdown-label.filter").css(
            "color",
            "#191918"
          );
          var insuranceTextElement = document.getElementById("insurance-text");
          if (insuranceTextElement) {
            insuranceTextElement.style.color = "#191918";
          }
        }
        // Optionally close after selection; keep open for multi-select lists
        // Close for any single-select radio menu (insurance and primary concern)
        var isRadioMenu = $dropdown.find('input[type="radio"]').length > 0;
        if (isRadioMenu) {
          setTimeout(function () {
            closeDropdown(true);
          }, 0);
        }
      } else if (key === "Escape") {
        e.preventDefault();
        closeDropdown(true);
      }
    });

    // When dropdown opens via mouse, ensure first Tab goes into list
    $toggle.on("click", function () {
      setTimeout(function () {
        if ($toggle.attr("aria-expanded") === "true") {
          // Do not steal focus if user used mouse and already focused something
          // Only move focus if nothing inside has focus
          if (!$list.find(":focus").length) {
            focusFirstItem();
          }
        }
      }, 0);
    });
  }

  // Apply to insurance and primary concern dropdowns
  setupDropdownA11y("#insurance_filter");
  // Primary concern: target the visible toggle role button (multiple selectors to be safe)
  setupDropdownA11y(
    ".provider-filter_dopdown.specialty .provider-filter_dopdown-toggle"
  );
  setupDropdownA11y(".provider-filter_dopdown.specialty .w-dropdown-toggle");
  setupDropdownA11y("#w-dropdown-toggle-0");

  $(".filter-list_input-group").on("click", function (e) {
    // Allow the default click behavior to occur
    e.preventDefault();

    const checkbox = $(this).find('input[type="checkbox"]');
    const checkboxDiv = $(this).find(".w-checkbox-input");

    // Toggle the checkbox checked state
    const isChecked = !checkbox.prop("checked");
    checkbox.prop("checked", isChecked);

    // Toggle the custom class for styling
    if (isChecked) {
      checkboxDiv.addClass("w--redirected-checked");
    } else {
      checkboxDiv.removeClass("w--redirected-checked");
    }

    // Trigger the change event to apply the filter logic
    checkbox.trigger("change");
  });

  // Speciality dropdown logic
  $('.filter-list_component input[type="checkbox"]').change(function (e) {
    var selectedItems = [];
    // Gather all checked checkboxes
    $('.filter-list_component input[type="checkbox"]:checked').each(
      function () {
        var label = $(this).closest("label").text().trim(); // Get the text from the label wrapping the checkbox
        selectedItems.push(label);
      }
    );

    specialties = selectedItems;
    updateCTAUrl();

    // Update the text inside #concern-text based on the selection
    var fullText = selectedItems.join(", ");
    var $specialtyFilter = $("#specialty_filter");
    var maxWidth = $specialtyFilter.width();
    var truncatedText = truncateText(fullText, maxWidth);

    var finalText = truncatedText === "" ? "Primary concern" : truncatedText;
    $("#concern-text").text(finalText);

    // Update text color to #191918 when text is changed from default
    if (finalText !== "Primary concern") {
      $("#concern-text").css("color", "#191918");
    }

    var text = "(" + selectedItems.length + ")";
    var $labelTotal = $(".drop-label-total");
    thisDropdown = $(this).closest(".provider-filter_dropdown");

    $labelTotal.text(text);
    $labelTotal.toggle(selectedItems.length > 0);

    thisDropdown
      .siblings(".provider-filter_dopdown-toggle")
      .find(".drop-label-total")
      .text(text);
    thisDropdown
      .siblings(".provider-filter_dopdown-toggle")
      .find(".drop-label-total");
  });

  function updateSpecialityPlaceholder() {
    var selectedItems = [];
    // Gather all checked checkboxes
    $('.filter-list_component input[type="checkbox"]:checked').each(
      function () {
        var label = $(this).closest("label").text().trim(); // Get the text from the label wrapping the checkbox
        selectedItems.push(label);
      }
    );

    specialties = selectedItems;
    updateCTAUrl();

    // Update the text inside #concern-text based on the selection
    var fullText = selectedItems.join(", ");
    var $specialtyFilter = $("#specialty_filter");
    var maxWidth = $specialtyFilter.width();
    var truncatedText = truncateText(fullText, maxWidth);

    var finalText = truncatedText === "" ? "Primary concern" : truncatedText;
    $("#concern-text").text(finalText);

    // Update text color to #191918 when text is changed from default
    if (finalText !== "Primary concern") {
      $("#concern-text").css("color", "#191918");
    }

    var text = "(" + selectedItems.length + ")";
    var $labelTotal = $(".drop-label-total");
    thisDropdown = $(this).closest(".provider-filter_dropdown");

    $labelTotal.text(text);
    $labelTotal.toggle(selectedItems.length > 0);

    thisDropdown
      .siblings(".provider-filter_dopdown-toggle")
      .find(".drop-label-total")
      .text(text);
    thisDropdown
      .siblings(".provider-filter_dopdown-toggle")
      .find(".drop-label-total");
  }

  updateSpecialityPlaceholder();

  // Function to truncate text based on the width of the #specialty_filter div
  function truncateText(text, maxWidth) {
    var truncatedText = text;
    var ellipsis = "...";

    // Create a temporary element to measure text width
    var $tempElement = $("<span>").css({
      position: "absolute",
      visibility: "hidden",
      whiteSpace: "nowrap",
    });

    $("body").append($tempElement);
    var textWidth = $tempElement.text(text).width();

    // Check if the text width exceeds the maxWidth
    if (textWidth > maxWidth) {
      var ellipsisWidth = $tempElement.text(ellipsis).width();
      while (textWidth + ellipsisWidth > maxWidth && truncatedText.length > 0) {
        truncatedText = truncatedText.slice(0, -1);
        textWidth = $tempElement.text(truncatedText).width();
      }
      truncatedText += ellipsis; // Add ellipsis only if truncation happened
    }

    $tempElement.remove(); // Clean up the temporary element

    return truncatedText;
  }
});

$(document).ready(function () {
  $(".provider-filter_close-box").click(function () {
    var $dropdownList = $("#dropdown-list-1");
    if ($dropdownList.hasClass("open")) {
      $dropdownList.removeClass("open");
      $(this).attr("aria-expanded", "false");
    } else {
      $dropdownList.addClass("open");
      $(this).attr("aria-expanded", "true");
    }
  });

  // Close the dropdown when clicking outside
  $(document).click(function (event) {
    if (
      !$(event.target).closest("#state_filter").length &&
      !$(event.target).closest("#dropdown-list-1").length
    ) {
      if ($("#dropdown-list-1").hasClass("open")) {
        $("#dropdown-list-1").removeClass("open");
        $("#state_filter").attr("aria-expanded", "false");
      }
    }
  });
});
