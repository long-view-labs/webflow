$(document).ready(function () {
  // Global variables to store API data
  var payersData = [];
  var specialtiesData = [];

  // Function to get query parameter by name
  function getQueryParam(name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // Function to fetch payers data
  function fetchPayersData() {
    return fetch("https://app.usenourish.com/api/payers?source=homepage", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // Try without explicit CORS mode first
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
        console.error("Error fetching payers data:", error);
        // Fallback to empty array - form will still work without IDs
        payersData = [];
        return [];
      });
  }

  // Function to fetch specialties data
  function fetchSpecialtiesData() {
    return fetch("https://app.usenourish.com/api/specialties/all", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      // Try without explicit CORS mode first
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to fetch specialties data: " + response.status
          );
        }
        return response.json();
      })
      .then((data) => {
        specialtiesData = data;
        return data;
      })
      .catch((error) => {
        console.error("Error fetching specialties data:", error);
        // Fallback to empty array - form will still work without IDs
        specialtiesData = [];
        return [];
      });
  }

  // Function to find payer ID by name
  function findPayerId(payerName) {
    var payer = payersData.find((item) => item.payerName === payerName);
    return payer ? payer.id : null;
  }

  // Function to find specialty ID by display name
  function findSpecialtyId(displayName) {
    var specialty = specialtiesData.find(
      (item) => item.patientDisplayName === displayName
    );
    return specialty ? specialty.id : null;
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

  // Function to extract city, state, and zip from formatted address
  function extractCityStateZip(formattedAddress) {
    if (!formattedAddress) return { city: null, state: null, zip: null };

    var parts = formattedAddress.split(", ");
    if (parts.length >= 2) {
      var city = parts[0].trim();
      var stateZip = parts[1].trim();

      // Check if the second part contains a zip code (5 digits)
      var zipMatch = stateZip.match(/([A-Z]{2})\s+(\d{5})/);
      if (zipMatch) {
        // Format: "City, State ZIP"
        return {
          city: city,
          state: zipMatch[1],
          zip: zipMatch[2],
        };
      } else {
        // Format: "City, State" (no zip)
        return {
          city: city,
          state: stateZip,
          zip: null,
        };
      }
    }
    return { city: null, state: null, zip: null };
  }

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
    console.log("Form name detected:", formName);

    // Determine landing page variation
    if (isControlGroup()) {
      // Control group gets Am_I_Covered variant
      params.append("landingPageVariation", "Am_I_Covered");
    } else if (formName === "Insurance Check") {
      params.append("landingPageVariation", "Insurance_Check");
    } else {
      // Default to Provider Search for home page
      params.append("landingPageVariation", "Provider_Search");
    }

    // Get selected specialty
    var selectedSpecialty = $("#concern-text").text();
    if (selectedSpecialty && selectedSpecialty !== "Primary concern") {
      var specialtyId = findSpecialtyId(selectedSpecialty);
      if (specialtyId) {
        params.append("prioritySpecialtyId", specialtyId);
      }
    }

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

    // Get location from Google autocomplete (only for Provider Search)
    if (formName !== "Insurance Check") {
      var locationValue = $("#city-state-zip").val();
      if (locationValue) {
        var locationData = extractCityStateZip(locationValue);
        if (locationData.city) {
          params.append("addressCity", locationData.city);
        }
        if (locationData.state) {
          params.append("addressState", locationData.state);
        }
        if (locationData.zip) {
          params.append("addressZipCode", locationData.zip);
        }
      }
    }

    // Get Insurance Check form fields (only for Insurance Check form)
    if (formName === "Insurance Check") {
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
    }

    // Build final URL
    var finalUrl = baseUrl + "?" + params.toString();
    $("#home-filter-cta").attr("href", finalUrl);
  }

  // Load API data on page load
  Promise.all([fetchPayersData(), fetchSpecialtiesData()])
    .then(() => {
      // Initial URL update
      updateCTAUrl();
    })
    .catch((error) => {
      console.error("Error loading API data:", error);
      // Still update URL even if APIs fail
      updateCTAUrl();
    });

  // Add event listeners for Insurance Check form fields
  $("#first-name, #last-name").on("input", function () {
    updateCTAUrl();
  });

  // Enhanced DOB field handling with backspace support
  $("#dob").on("input keydown", function (e) {
    var $input = $(this);
    var value = $input.val();
    var cursorPosition = $input[0].selectionStart;

    // Handle backspace/delete operations
    if (e.type === "keydown") {
      if (e.key === "Backspace") {
        // Check if cursor is right after a slash
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
      var formattedValue = formatDOBInput(value);
      $input.val(formattedValue);

      // Maintain cursor position after formatting
      var newCursorPos = Math.min(cursorPosition, formattedValue.length);
      $input[0].setSelectionRange(newCursorPos, newCursorPos);

      updateCTAUrl();
    }
  });

  // Function to trigger click event on matching radio button
  function clickMatchingRadioButton(paramName, dataName) {
    var paramValue = getQueryParam(paramName);
    if (paramValue) {
      $('input[type="radio"][data-name="' + dataName + '"]').each(function () {
        if ($(this).val() === paramValue) {
          console.log(paramValue);
          $(this).click();
        }
      });
    }
  }

  // Call the function for the 'Insurance' query parameter
  clickMatchingRadioButton("insurance", "Insurance");

  // Call the function for the 'concern' query parameter
  clickMatchingRadioButton("concern", "Primacy concern");

  // Debug: Check if insurance radio buttons exist
  console.log(
    "Insurance radio buttons found:",
    $('input[type="radio"][data-name="Insurance"]').length
  );
  console.log("Insurance text element found:", $("#insurance-text").length);
  console.log("Insurance text element content:", $("#insurance-text").text());

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

  var state, insurance, specialties, thisDropdown;

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
    console.log("Insurance selected:", selected); // Debug log
    insurance = selected;
    var $insuranceFilter = $("#insurance_filter");
    var maxWidth = $insuranceFilter.width();

    // Update the text of #insurance-text with the selected insurance
    var $insuranceText = $("#insurance-text");
    var newText = truncateText(insurance, maxWidth);
    console.log("Insurance text element found:", $insuranceText.length);
    console.log("Current text:", $insuranceText.text());
    console.log("New text to set:", newText);

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
      console.log("Text after delayed update:", $insuranceText.text());
    }, 100);

    console.log("Text after update:", $insuranceText.text());

    updateCTAUrl();
  });

  // Also listen for clicks on insurance labels
  $('label:has(input[type="radio"][data-name="Insurance"])').on(
    "click",
    function () {
      var $radio = $(this).find('input[type="radio"]');
      var selected = $radio.val();
      console.log("Insurance label clicked, selected:", selected); // Debug log
      insurance = selected;
      var $insuranceFilter = $("#insurance_filter");
      var maxWidth = $insuranceFilter.width();

      // Update the text of #insurance-text with the selected insurance
      var $insuranceText = $("#insurance-text");
      var newText = truncateText(insurance, maxWidth);
      console.log("Insurance text element found:", $insuranceText.length);
      console.log("Current text:", $insuranceText.text());
      console.log("New text to set:", newText);
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
      console.log("Text after update:", $insuranceText.text());

      updateCTAUrl();
    }
  );

  // Listen for change events on insurance radio buttons
  $('input[type="radio"][data-name="Insurance"]').on("change", function () {
    var selected = $(this).val();
    console.log("Insurance radio changed, selected:", selected); // Debug log
    insurance = selected;
    var $insuranceFilter = $("#insurance_filter");
    var maxWidth = $insuranceFilter.width();

    // Update the text of #insurance-text with the selected insurance
    var $insuranceText = $("#insurance-text");
    var newText = truncateText(insurance, maxWidth);
    console.log("Insurance text element found:", $insuranceText.length);
    console.log("Current text:", $insuranceText.text());
    console.log("New text to set:", newText);
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
    console.log("Text after update:", $insuranceText.text());

    updateCTAUrl();
  });

  // Listen for clicks on insurance filter list labels
  $('.filter-list_label:has(input[type="radio"][data-name="Insurance"])').on(
    "click",
    function () {
      var $radio = $(this).find('input[type="radio"]');
      var selected = $radio.val();
      console.log("Insurance filter label clicked, selected:", selected); // Debug log
      insurance = selected;
      var $insuranceFilter = $("#insurance_filter");
      var maxWidth = $insuranceFilter.width();

      // Update the text of #insurance-text with the selected insurance
      var $insuranceText = $("#insurance-text");
      var newText = truncateText(insurance, maxWidth);
      console.log("Insurance text element found:", $insuranceText.length);
      console.log("Current text:", $insuranceText.text());
      console.log("New text to set:", newText);
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
      console.log("Text after update:", $insuranceText.text());

      updateCTAUrl();
    }
  );

  // Listen for click events on radio buttons with data-name="Primacy concern"
  $('input[type="radio"][data-name="Primacy concern"]').on(
    "click",
    function () {
      var selected = $(this).val(); // Get the value of the clicked radio button
      var $concernFilter = $("#specialty_filter");
      var maxWidth = $concernFilter.width();

      // Update the text of #concern-text with the selected concern
      var newText = truncateText(selected, maxWidth);
      $("#concern-text").text(newText);

      // Update text color to #191918 when text is changed from default
      if (newText !== "Primary concern") {
        $("#concern-text").css("color", "#191918");
      }

      // Update CTA URL after concern selection
      updateCTAUrl();
    }
  );

  // Also handle keyboard-triggered selection (Space/Enter on input fires change)
  $('input[type="radio"][data-name="Primacy concern"]').on(
    "change",
    function () {
      var selected = $(this).val();
      var $concernFilter = $("#specialty_filter");
      var maxWidth = $concernFilter.width();

      var newText = truncateText(selected, maxWidth);
      $("#concern-text").text(newText);
      if (newText !== "Primary concern") {
        $("#concern-text").css("color", "#191918");
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

  function updateConcernPlaceholder() {
    if (typeof concernFilter !== "undefined" && concernFilter !== null) {
      var $concernFilter = $("#specialty_filter");
      var maxWidth = $concernFilter.width();

      // Update the text of #concern-text with the selected concern
      $("#concern-text").text(truncateText(concernFilter, maxWidth));
    } else {
      // Set default text for concern
      $("#concern-text").text("Primary concern");
    }
  }
  updateConcernPlaceholder();

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

  // Google Places Autocomplete functionality for city/state/zip input
  function initializeGooglePlacesAutocomplete() {
    // Check if Google Places API is loaded
    if (typeof google === "undefined" || !google.maps || !google.maps.places) {
      console.log("Google Places API not loaded. Retrying in 1 second...");
      setTimeout(initializeGooglePlacesAutocomplete, 1000);
      return;
    }

    var input = document.getElementById("city-state-zip");
    if (!input) {
      console.log("Input element not found");
      return;
    }

    try {
      // Use the legacy Autocomplete API (still works and is more reliable)
      console.log("Using legacy Autocomplete API (deprecated but functional)");

      // Configure autocomplete options for cities
      var options = {
        types: ["(cities)"], // Only show cities
        componentRestrictions: { country: "us" }, // Restrict to US
        fields: ["address_components", "formatted_address", "geometry", "name"],
      };

      // Initialize Google Places Autocomplete for cities
      var autocomplete = new google.maps.places.Autocomplete(input, options);

      // Create a separate autocomplete for zip codes
      var zipAutocomplete = new google.maps.places.Autocomplete(input, {
        types: ["postal_code"],
        componentRestrictions: { country: "us" },
        fields: ["address_components", "formatted_address", "geometry", "name"],
      });

      // Track which autocomplete is active
      var activeAutocomplete = autocomplete;

      // Handle place selection for cities
      autocomplete.addListener("place_changed", function () {
        var place = autocomplete.getPlace();

        if (!place.geometry) {
          console.log("No details available for input: '" + place.name + "'");
          return;
        }

        // Extract city and state from the place
        var city = "";
        var state = "";

        for (var i = 0; i < place.address_components.length; i++) {
          var component = place.address_components[i];
          var types = component.types;

          if (types.indexOf("locality") !== -1) {
            city = component.long_name;
          }
          if (types.indexOf("administrative_area_level_1") !== -1) {
            state = component.short_name;
          }
        }

        // Format the result as "City, State"
        var formattedAddress = "";
        if (city && state) {
          formattedAddress = city + ", " + state;
        } else {
          formattedAddress = place.formatted_address;
        }

        // Update the input with the formatted address
        input.value = formattedAddress;

        console.log("Selected place:", formattedAddress);
        console.log("Place details:", {
          city: city,
          state: state,
          formattedAddress: place.formatted_address,
        });

        // Update CTA URL after location selection
        updateCTAUrl();
      });

      // Handle place selection for zip codes
      zipAutocomplete.addListener("place_changed", function () {
        var place = zipAutocomplete.getPlace();

        if (!place.geometry) {
          console.log(
            "No details available for zip code input: '" + place.name + "'"
          );
          return;
        }

        // Extract city, state, and postal code from the place
        var city = "";
        var state = "";
        var postalCode = "";

        for (var i = 0; i < place.address_components.length; i++) {
          var component = place.address_components[i];
          var types = component.types;

          if (types.indexOf("locality") !== -1) {
            city = component.long_name;
          }
          if (types.indexOf("administrative_area_level_1") !== -1) {
            state = component.short_name;
          }
          if (types.indexOf("postal_code") !== -1) {
            postalCode = component.long_name;
          }
        }

        // Format the result as "City, State ZIP"
        var formattedAddress = "";
        if (city && state && postalCode) {
          formattedAddress = city + ", " + state + " " + postalCode;
        } else {
          formattedAddress = place.formatted_address;
        }

        // Update the input with the formatted address
        input.value = formattedAddress;

        console.log("Selected zip code place:", formattedAddress);
        console.log("Zip code place details:", {
          city: city,
          state: state,
          postalCode: postalCode,
          formattedAddress: place.formatted_address,
        });

        // Update CTA URL after zip code selection
        updateCTAUrl();
      });

      // Prevent clicks on Google Places dropdown from propagating to elements below
      document.addEventListener(
        "click",
        function (e) {
          // Check if the click is on a Google Places autocomplete element
          if (
            e.target.closest(".pac-container") ||
            e.target.closest(".pac-item")
          ) {
            e.stopPropagation();
            e.preventDefault();
          }
        },
        true
      );

      // Monitor input to switch between city and zip autocomplete
      input.addEventListener("input", function () {
        var value = this.value;

        // If input starts with numbers, use zip autocomplete
        if (/^\d/.test(value)) {
          if (activeAutocomplete !== zipAutocomplete) {
            console.log("Switching to zip code autocomplete");
            activeAutocomplete = zipAutocomplete;
          }
        } else {
          // If input starts with letters, use city autocomplete
          if (activeAutocomplete !== autocomplete) {
            console.log("Switching to city autocomplete");
            activeAutocomplete = autocomplete;
          }
        }
      });

      // Prevent form submission on Enter key
      input.addEventListener("keydown", function (e) {
        if (e.keyCode === 13) {
          e.preventDefault();
        }
      });

      // Prevent clicks on Google Places dropdown from propagating to elements below
      document.addEventListener(
        "click",
        function (e) {
          // Check if the click is on a Google Places autocomplete element
          if (
            e.target.closest(".pac-container") ||
            e.target.closest(".pac-item")
          ) {
            e.stopPropagation();
            e.preventDefault();
            return false;
          }
        },
        true
      );

      // Also prevent clicks on the input itself from opening dropdowns below
      input.addEventListener("click", function (e) {
        e.stopPropagation();
      });

      // Ensure Google Places dropdown appears above other elements and prevent clicks below
      var style = document.createElement("style");
      style.textContent = `
          .pac-container {
            z-index: 9999 !important;
            position: fixed !important;
            pointer-events: auto !important;
          }
          .pac-item {
            cursor: pointer;
            pointer-events: auto !important;
          }
          .pac-item:hover {
            background-color: #f0f0f0 !important;
          }
          /* Prevent clicks on elements below when Google Places dropdown is visible */
          .pac-container:not(:empty) ~ * {
            pointer-events: none !important;
          }
          /* Alternative: add overlay when Google Places is active */
          .google-places-active {
            pointer-events: none !important;
          }
        `;
      document.head.appendChild(style);

      // Add overlay when Google Places dropdown is visible
      var overlay = document.createElement("div");
      overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          z-index: 9998;
          display: none;
        `;
      overlay.id = "google-places-overlay";
      document.body.appendChild(overlay);

      // Show overlay when input is focused and hide when dropdown disappears
      input.addEventListener("focus", function () {
        overlay.style.display = "block";
      });

      input.addEventListener("blur", function () {
        setTimeout(function () {
          overlay.style.display = "none";
        }, 200);
      });

      // Also hide overlay when clicking on Google Places elements
      document.addEventListener("click", function (e) {
        if (
          e.target.closest(".pac-container") ||
          e.target.closest(".pac-item")
        ) {
          overlay.style.display = "none";
        }
      });

      console.log("Google Places Autocomplete initialized (legacy)");
    } catch (error) {
      console.log("Error initializing Google Places Autocomplete:", error);
      // Fallback: allow normal text input
      console.log("Falling back to normal text input");
    }
  }

  // Initialize Google Places Autocomplete when document is ready
  initializeGooglePlacesAutocomplete();

  // Fallback autocomplete for when Google Places API is not available
  function initializeFallbackAutocomplete() {
    var input = document.getElementById("city-state-zip");
    if (!input) return;

    // Simple fallback data
    var fallbackData = [
      "New York, NY",
      "Los Angeles, CA",
      "Chicago, IL",
      "Houston, TX",
      "Phoenix, AZ",
      "Philadelphia, PA",
      "San Antonio, TX",
      "San Diego, CA",
      "Dallas, TX",
      "San Jose, CA",
      "Austin, TX",
      "Jacksonville, FL",
      "Fort Worth, TX",
      "Columbus, OH",
      "Charlotte, NC",
      "San Francisco, CA",
      "Indianapolis, IN",
      "Seattle, WA",
      "Denver, CO",
      "Washington, DC",
      "Boston, MA",
      "El Paso, TX",
      "Nashville, TN",
      "Detroit, MI",
      "Oklahoma City, OK",
      "Portland, OR",
      "Las Vegas, NV",
      "Memphis, TN",
      "Louisville, KY",
      "Baltimore, MD",
      "Milwaukee, WI",
      "Albuquerque, NM",
      "Tucson, AZ",
      "Fresno, CA",
      "Sacramento, CA",
      "Mesa, AZ",
      "Kansas City, MO",
      "Atlanta, GA",
      "Long Beach, CA",
      "Colorado Springs, CO",
      "Raleigh, NC",
      "Miami, FL",
      "Virginia Beach, VA",
      "Omaha, NE",
      "Oakland, CA",
      "Minneapolis, MN",
      "Tulsa, OK",
      "Arlington, TX",
      "Tampa, FL",
      "New Orleans, LA",
      "Wichita, KS",
      "Cleveland, OH",
      "Bakersfield, CA",
      "Aurora, CO",
      "Anaheim, CA",
      "Honolulu, HI",
      "Santa Ana, CA",
      "Corpus Christi, TX",
      "Riverside, CA",
      "Lexington, KY",
      "Stockton, CA",
      "Henderson, NV",
      "Saint Paul, MN",
      "St. Louis, MO",
      "Fort Wayne, IN",
      "Jersey City, NJ",
      "Chandler, AZ",
      "Madison, WI",
      "Lubbock, TX",
      "Scottsdale, AZ",
      "Reno, NV",
      "Buffalo, NY",
      "Gilbert, AZ",
      "Glendale, AZ",
      "North Las Vegas, NV",
      "Winston-Salem, NC",
      "Chesapeake, VA",
      "Norfolk, VA",
      "Fremont, CA",
      "Garland, TX",
      "Irving, TX",
      "Hialeah, FL",
      "Spokane, WA",
      "Baton Rouge, LA",
      "Tacoma, WA",
      "Richmond, VA",
      "Yonkers, NY",
      "Des Moines, IA",
      "Rochester, NY",
      "Modesto, CA",
      "Durham, NC",
      "Little Rock, AR",
      "Newark, NJ",
      "Greensboro, NC",
      "Fort Lauderdale, FL",
      "Fayetteville, NC",
      "Cincinnati, OH",
      "Santa Rosa, CA",
      "Orlando, FL",
      "Irvine, CA",
      "San Bernardino, CA",
      "Laredo, TX",
      "Lancaster, CA",
      "Chula Vista, CA",
      "Reno, NV",
      "Arlington, VA",
      "Akron, OH",
      "Tucson, AZ",
      "Wichita, KS",
      "Aurora, IL",
    ];

    // Create fallback dropdown
    var $fallbackDropdown = $(
      '<div class="fallback-dropdown" style="position: absolute; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; display: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-family: inherit;"></div>'
    );
    $("body").append($fallbackDropdown);

    // Handle input events for fallback
    $(input).on("input", function () {
      var query = $(this).val().toLowerCase();

      if (query.length < 2) {
        $fallbackDropdown.hide();
        return;
      }

      // Filter data based on query
      var filteredData = fallbackData
        .filter(function (item) {
          return item.toLowerCase().includes(query);
        })
        .slice(0, 10);

      if (filteredData.length > 0) {
        // Position dropdown below input
        var $input = $(this);
        var inputOffset = $input.offset();
        var inputHeight = $input.outerHeight();

        $fallbackDropdown.css({
          top: inputOffset.top + inputHeight + "px",
          left: inputOffset.left + "px",
          width: $input.outerWidth() + "px",
        });

        // Populate dropdown
        $fallbackDropdown.empty();
        filteredData.forEach(function (item) {
          var $item = $(
            '<div class="fallback-item" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background-color 0.2s;">' +
              item +
              "</div>"
          );
          $item.on("click", function () {
            $input.val(item);
            $fallbackDropdown.hide();
          });
          $fallbackDropdown.append($item);
        });

        $fallbackDropdown.show();
      } else {
        $fallbackDropdown.hide();
      }
    });

    // Hide dropdown when clicking outside
    $(document).on("click", function (e) {
      if (!$(e.target).closest("#city-state-zip, .fallback-dropdown").length) {
        $fallbackDropdown.hide();
      }
    });

    console.log("Fallback autocomplete initialized");
  }

  // Initialize fallback after a delay to see if Google Places loads
  setTimeout(function () {
    if (typeof google === "undefined" || !google.maps || !google.maps.places) {
      console.log(
        "Google Places API not available, using fallback autocomplete"
      );
      initializeFallbackAutocomplete();
    }
  }, 2000);

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

$(document).ready(function () {
  $("#field").on("input", function () {
    var searchText = $(this).val().toLowerCase().trim();

    // First, hide all items
    $(".filter-list_input-group, .filter-list_item-wrap").hide();

    if (searchText === "") {
      // If search is empty, show everything
      $(".filter-list_input-group, .filter-list_item-wrap").show();
      return;
    }

    $(".filter-list_label").each(function () {
      var $label = $(this);
      var labelText = $label.text().toLowerCase();

      if (labelText.includes(searchText)) {
        var $inputGroup = $label.closest(".filter-list_input-group");
        var $itemWrap = $inputGroup.closest(".filter-list_item-wrap");

        $inputGroup.show();

        if ($itemWrap.length) {
          $itemWrap.show();
          // Show the parent label within this item wrap
          $itemWrap.children(".filter-list_input-group.parent").show();
        }
      }
    });

    // Hide empty .filter-list_item-wrap
    $(".filter-list_item-wrap").each(function () {
      var $itemWrap = $(this);
      if ($itemWrap.find(".filter-list_input-group:visible").length === 0) {
        $itemWrap.hide();
      }
    });
  });
});
