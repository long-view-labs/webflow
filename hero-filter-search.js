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
    return fetch("https://app.usenourish.com/api/payers?source=homepage", {
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
            id: 2,
            payerName: "Blue Cross Blue Shield",
            groupNameDeprecated: "Blue Cross Blue Shield",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Blue Cross Blue Shield",
            healthieId: 347,
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
            id: 4,
            payerName: "Humana",
            groupNameDeprecated: null,
            isOON: true,
            shouldHardMatchInsurance: false,
            displayGroup: "Other",
            healthieId: null,
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
            id: 6,
            payerName: "Medicare",
            groupNameDeprecated: "Medicare",
            isOON: false,
            shouldHardMatchInsurance: false,
            displayGroup: "Medicare",
            healthieId: 1552,
          },
          { id: 136, payerName: "Medical Mutual of Ohio" },
          { id: 137, payerName: "Aetna Medicare" },
          { id: 138, payerName: "All Savers" },
          { id: 139, payerName: "Anthem Blue Cross / Anthem Blue Shield" },
          { id: 140, payerName: "Blue Cross Blue Shield Medicare" },
          { id: 141, payerName: "Cigna Local Plus" },
          { id: 142, payerName: "Cigna Medicare" },
          { id: 143, payerName: "Cigna Open Access Plus" },
          { id: 144, payerName: "Medicaid" },
          { id: 145, payerName: "Meritain" },
          { id: 146, payerName: "Oxford" },
          { id: 147, payerName: "UHC Medicare" },
          { id: 148, payerName: "United Medical Resources (UMR)" },
          { id: 149, payerName: "Wellmed" },
          { id: 150, payerName: "Anthem Blue Cross and Blue Shield Colorado HMO" },
          { id: 151, payerName: "Anthem Blue Cross and Blue Shield Colorado PPO" },
          { id: 152, payerName: "Anthem Blue Cross and Blue Shield Connecticut HMO" },
          { id: 153, payerName: "Anthem Blue Cross and Blue Shield Connecticut PPO" },
          { id: 154, payerName: "Anthem Blue Cross and Blue Shield Indiana HMO" },
          { id: 155, payerName: "Anthem Blue Cross and Blue Shield Indiana PPO" },
          { id: 156, payerName: "Anthem Blue Cross and Blue Shield Kentucky HMO" },
          { id: 157, payerName: "Anthem Blue Cross and Blue Shield Kentucky PPO" },
          { id: 158, payerName: "Anthem Blue Cross and Blue Shield Maine HMO" },
          { id: 159, payerName: "Anthem Blue Cross and Blue Shield Maine PPO" },
          { id: 160, payerName: "Anthem Blue Cross and Blue Shield Missouri HMO" },
          { id: 161, payerName: "Anthem Blue Cross and Blue Shield Missouri PPO" },
          { id: 162, payerName: "Anthem Blue Cross and Blue Shield Nevada HMO" },
          { id: 163, payerName: "Anthem Blue Cross and Blue Shield Nevada PPO" },
          { id: 164, payerName: "Anthem Blue Cross and Blue Shield New Hampshire HMO" },
          { id: 165, payerName: "Anthem Blue Cross and Blue Shield New Hampshire PPO" },
          { id: 166, payerName: "Anthem Blue Cross and Blue Shield of Georgia HMO" },
          { id: 167, payerName: "Anthem Blue Cross and Blue Shield of Georgia PPO" },
          { id: 168, payerName: "Anthem Blue Cross and Blue Shield Ohio HMO" },
          { id: 169, payerName: "Anthem Blue Cross and Blue Shield Ohio PPO" },
          { id: 170, payerName: "Anthem Blue Cross and Blue Shield Virginia HMO" },
          { id: 171, payerName: "Anthem Blue Cross and Blue Shield Virginia PPO" },
          { id: 172, payerName: "Anthem Blue Cross and Blue Shield Wisconsin HMO" },
          { id: 173, payerName: "Anthem Blue Cross and Blue Shield Wisconsin PPO" },
          { id: 174, payerName: "Anthem Blue Cross Blue Shield of New York (Empire) HMO" },
          { id: 175, payerName: "Anthem Blue Cross Blue Shield of New York (Empire) PPO" },
          { id: 176, payerName: "Anthem Blue Cross of California HMO" },
          { id: 177, payerName: "Anthem Blue Cross of California PPO" },
          { id: 178, payerName: "Arkansas Blue Cross and Blue Shield HMO" },
          { id: 179, payerName: "Arkansas Blue Cross and Blue Shield PPO" },
          { id: 180, payerName: "Blue Cross & Blue Shield of Mississippi HMO" },
          { id: 181, payerName: "Blue Cross & Blue Shield of Mississippi PPO" },
          { id: 182, payerName: "Blue Cross & Blue Shield of Rhode Island HMO" },
          { id: 183, payerName: "Blue Cross & Blue Shield of Rhode Island PPO" },
          { id: 184, payerName: "Blue Cross and Blue Shield of Alabama HMO" },
          { id: 185, payerName: "Blue Cross and Blue Shield of Alabama PPO" },
          { id: 186, payerName: "Blue Cross and Blue Shield of Hawaii HMO" },
          { id: 187, payerName: "Blue Cross and Blue Shield of Hawaii PPO" },
          { id: 188, payerName: "Blue Cross and Blue Shield of Illinois HMO" },
          { id: 189, payerName: "Blue Cross and Blue Shield of Illinois PPO" },
          { id: 190, payerName: "Blue Cross and Blue Shield of Kansas City HMO" },
          { id: 191, payerName: "Blue Cross and Blue Shield of Kansas City PPO" },
          { id: 192, payerName: "Blue Cross and Blue Shield of Kansas HMO" },
          { id: 193, payerName: "Blue Cross and Blue Shield of Kansas PPO" },
          { id: 194, payerName: "Blue Cross and Blue Shield of Louisiana HMO" },
          { id: 195, payerName: "Blue Cross and Blue Shield of Louisiana PPO" },
          { id: 196, payerName: "Blue Cross and Blue Shield of Massachusetts HMO" },
          { id: 197, payerName: "Blue Cross and Blue Shield of Massachusetts PPO" },
          { id: 198, payerName: "Blue Cross and Blue Shield of Minnesota HMO" },
          { id: 199, payerName: "Blue Cross and Blue Shield of Minnesota PPO" },
          { id: 200, payerName: "Blue Cross and Blue Shield of Montana HMO" },
          { id: 201, payerName: "Blue Cross and Blue Shield of Montana PPO" },
          { id: 202, payerName: "Blue Cross and Blue Shield of Nebraska HMO" },
          { id: 203, payerName: "Blue Cross and Blue Shield of Nebraska PPO" },
          { id: 204, payerName: "Blue Cross and Blue Shield of New Mexico HMO" },
          { id: 205, payerName: "Blue Cross and Blue Shield of New Mexico PPO" },
          { id: 206, payerName: "Blue Cross and Blue Shield of North Carolina HMO" },
          { id: 207, payerName: "Blue Cross and Blue Shield of North Carolina PPO" },
          { id: 208, payerName: "Blue Cross and Blue Shield of Oklahoma HMO" },
          { id: 209, payerName: "Blue Cross and Blue Shield of Oklahoma PPO" },
          { id: 210, payerName: "Blue Cross and Blue Shield of South Carolina HMO" },
          { id: 211, payerName: "Blue Cross and Blue Shield of South Carolina POC" },
          { id: 212, payerName: "Blue Cross and Blue Shield of Texas HMO" },
          { id: 213, payerName: "Blue Cross and Blue Shield of Texas PPO" },
          { id: 214, payerName: "Blue Cross and Blue Shield of Vermont HMO" },
          { id: 215, payerName: "Blue Cross and Blue Shield of Vermont PPO" },
          { id: 216, payerName: "Blue Cross Blue Shield of Arizona HMO" },
          { id: 217, payerName: "Blue Cross Blue Shield of Arizona PPO" },
          { id: 218, payerName: "Blue Cross Blue Shield of Michigan HMO" },
          { id: 219, payerName: "Blue Cross Blue Shield of Michigan PPO" },
          { id: 220, payerName: "Blue Cross Blue Shield of North Dakota HMO" },
          { id: 221, payerName: "Blue Cross Blue Shield of North Dakota PPO" },
          { id: 222, payerName: "Blue Cross Blue Shield of Wyoming HMO" },
          { id: 223, payerName: "Blue Cross Blue Shield of Wyoming PPO" },
          { id: 224, payerName: "Blue Cross of Idaho HMO" },
          { id: 225, payerName: "Blue Cross of Idaho PPO" },
          { id: 226, payerName: "Blue Shield of California HMO" },
          { id: 227, payerName: "Blue Shield of California PPO" },
          { id: 228, payerName: "BlueCross BlueShield of Puerto Rico HMO" },
          { id: 229, payerName: "BlueCross BlueShield of Puerto Rico PPO" },
          { id: 230, payerName: "BlueCross BlueShield of Tennessee HMO" },
          { id: 231, payerName: "BlueCross BlueShield of Tennessee PPO" },
          { id: 232, payerName: "Capital Blue Cross HMO" },
          { id: 233, payerName: "Capital Blue Cross PPO" },
          { id: 234, payerName: "CareFirst BlueCross BlueShield HMO" },
          { id: 235, payerName: "CareFirst BlueCross BlueShield Maryland HMO" },
          { id: 236, payerName: "CareFirst BlueCross BlueShield Maryland PPO" },
          { id: 237, payerName: "CareFirst BlueCross BlueShield PPO" },
          { id: 238, payerName: "CareFirst BlueCross BlueShield Virginia HMO" },
          { id: 239, payerName: "CareFirst BlueCross BlueShield Virginia PPO" },
          { id: 240, payerName: "Excellus BlueCross BlueShield HMO" },
          { id: 241, payerName: "Excellus BlueCross BlueShield PPO" },
          { id: 242, payerName: "Florida Blue HMO" },
          { id: 243, payerName: "Florida Blue PPO" },
          { id: 244, payerName: "Highmark Blue Cross Blue Shield Delaware HMO" },
          { id: 245, payerName: "Highmark Blue Cross Blue Shield Delaware PPO" },
          { id: 246, payerName: "Highmark Blue Cross Blue Shield of Pennsylvania HMO" },
          { id: 247, payerName: "Highmark Blue Cross Blue Shield of Pennsylvania PPO" },
          { id: 248, payerName: "Highmark Blue Cross Blue Shield of Western New York HMO" },
          { id: 249, payerName: "Highmark Blue Cross Blue Shield of Western New York PPO" },
          { id: 250, payerName: "Highmark Blue Cross Blue Shield West Virginia HMO" },
          { id: 251, payerName: "Highmark Blue Cross Blue Shield West Virginia PPO" },
          { id: 252, payerName: "Highmark Blue Shield of Northeastern New York HMO" },
          { id: 253, payerName: "Highmark Blue Shield of Northeastern New York PPO" },
          { id: 254, payerName: "Horizon Blue Cross and Blue Shield of New Jersey HMO" },
          { id: 255, payerName: "Horizon Blue Cross and Blue Shield of New Jersey PPO" },
          { id: 256, payerName: "Independence Blue Cross HMO" },
          { id: 257, payerName: "Independence Blue Cross PPO" },
          { id: 258, payerName: "Premera Blue Cross and Blue Shield of Alaska HMO" },
          { id: 259, payerName: "Premera Blue Cross and Blue Shield of Alaska PPO" },
          { id: 260, payerName: "Premera Blue Cross Washington HMO" },
          { id: 261, payerName: "Premera Blue Cross Washington PPO" },
          { id: 262, payerName: "Regence BlueCross BlueShield of Oregon HMO" },
          { id: 263, payerName: "Regence BlueCross BlueShield of Oregon PPO" },
          { id: 264, payerName: "Regence BlueCross BlueShield of Utah HMO" },
          { id: 265, payerName: "Regence BlueCross BlueShield of Utah PPO" },
          { id: 266, payerName: "Regence BlueShield of Idaho HMO" },
          { id: 267, payerName: "Regence BlueShield of Idaho PPO" },
          { id: 268, payerName: "Regence BlueShield Washington HMO" },
          { id: 269, payerName: "Regence BlueShield Washington PPO" },
          { id: 270, payerName: "Wellmark Blue Cross and Blue Shield of Iowa HMO" },
          { id: 271, payerName: "Wellmark Blue Cross and Blue Shield of Iowa PPO" },
          { id: 272, payerName: "Wellmark Blue Cross and Blue Shield South Dakota HMO" },
          { id: 273, payerName: "Wellmark Blue Cross and Blue Shield South Dakota PPO" },
          { id: 274, payerName: "Alliant Health Plan" },
          { id: 275, payerName: "AllWays Health Partners" },
          { id: 276, payerName: "AmeriHealth Caritas" },
          { id: 277, payerName: "AultCare Insurance Company" },
          { id: 278, payerName: "Bright Health" },
          { id: 279, payerName: "Capital District Physicians' Health Plan (CPDHP)" },
          { id: 280, payerName: "CareOregon" },
          { id: 281, payerName: "CareSource" },
          { id: 282, payerName: "Centene" },
          { id: 283, payerName: "ChampVA" },
          { id: 284, payerName: "Clover Health" },
          { id: 285, payerName: "CountyCare Health Plan" },
          { id: 286, payerName: "Dean Health Plan" },
          { id: 287, payerName: "EmblemHealth" },
          { id: 288, payerName: "Geisinger Health Plan" },
          { id: 289, payerName: "Health Alliance Plan (HAP)" },
          { id: 290, payerName: "Healthfirst" },
          { id: 291, payerName: "HealthPartners" },
          { id: 292, payerName: "HMO Partners, Inc." },
          { id: 293, payerName: "Independent Health Association (Inc)" },
          { id: 294, payerName: "Kaiser Foundation Health Plan" },
          { id: 295, payerName: "L.A. Care Health Plan" },
          { id: 296, payerName: "McLaren Health Plan" },
          { id: 297, payerName: "MDWise" },
          { id: 298, payerName: "Medica" },
          { id: 299, payerName: "MetroPlus" },
          { id: 300, payerName: "Moda Health" },
          { id: 301, payerName: "Molina Healthcare" },
          { id: 302, payerName: "Mountain Health Co-Op" },
          { id: 303, payerName: "MVP Health Plan" },
          { id: 304, payerName: "Optum VACare" },
          { id: 305, payerName: "Oscar" },
          { id: 306, payerName: "PacificSource Health Plans" },
          { id: 307, payerName: "Paramount" },
          { id: 308, payerName: "Passport Health Plan" },
          { id: 309, payerName: "Point32Health" },
          { id: 310, payerName: "Presbyterian Health Plan" },
          { id: 311, payerName: "Priority Health" },
          { id: 312, payerName: "Priority Partners" },
          { id: 313, payerName: "Providence Health Plan" },
          { id: 314, payerName: "Quarts Health Solutions" },
          { id: 315, payerName: "Sanford Health Group" },
          { id: 316, payerName: "SCAN Health Plan" },
          { id: 317, payerName: "Scott & White Health Care" },
          { id: 318, payerName: "Select Health" },
          { id: 319, payerName: "Sentara Health Plans" },
          { id: 320, payerName: "Sharp Health Plan" },
          { id: 321, payerName: "Sutter Health Plus" },
          { id: 322, payerName: "The Health Plan" },
          { id: 323, payerName: "Tricare East" },
          { id: 324, payerName: "Tricare West" },
          { id: 325, payerName: "UCare" },
          { id: 326, payerName: "UPMC Health Plan" },
          { id: 327, payerName: "US Health and Life Insurance Company (USHL)" },
          { id: 328, payerName: "WEA Trust" },
          { id: 329, payerName: "WellCare Health" },
          { id: 330, payerName: "WellSense Health Plan" },
          { id: 331, payerName: "Western Health Advantage" },
          { id: 332, payerName: "Devoted Health" },
          { id: 333, payerName: "Independence Keystone Health" }
        ];
        return payersData;
      });
  }

  // Function to find payer ID by name
  function findPayerId(payerName) {
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
    $('a[href*="signup.usenourish.com"]:not(#home-filter-cta)').each(function () {
      var $link = $(this);
      var currentHref = $link.attr("href");
      var url = new URL(currentHref);

      // Add InsuranceSearchInput = false for all other CTAs
      url.searchParams.set("InsuranceSearchInput", "false");

      $link.attr("href", url.toString());
    });
  }

  // UTM parameter capture is handled by global.js
  // Delay initial call to ensure global.js has processed UTMs
  setTimeout(function () {
    updateCTAUrl();
  }, 100);

  // Load API data on page load
  fetchPayersData()
    .then(() => {
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
