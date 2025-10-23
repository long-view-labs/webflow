$(document).ready(function () {
  // Global variables to store API data
  var payersData = [];
  var specialtiesData = [];

  // Helper to derive landing page variation (shared with hero-filter-search.js)
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

  function getFallbackPayersData() {
    return [
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
      {
        id: 150,
        payerName: "Anthem Blue Cross and Blue Shield Colorado HMO",
      },
      {
        id: 151,
        payerName: "Anthem Blue Cross and Blue Shield Colorado PPO",
      },
      {
        id: 152,
        payerName: "Anthem Blue Cross and Blue Shield Connecticut HMO",
      },
      {
        id: 153,
        payerName: "Anthem Blue Cross and Blue Shield Connecticut PPO",
      },
      {
        id: 154,
        payerName: "Anthem Blue Cross and Blue Shield Indiana HMO",
      },
      {
        id: 155,
        payerName: "Anthem Blue Cross and Blue Shield Indiana PPO",
      },
      {
        id: 156,
        payerName: "Anthem Blue Cross and Blue Shield Kentucky HMO",
      },
      {
        id: 157,
        payerName: "Anthem Blue Cross and Blue Shield Kentucky PPO",
      },
      {
        id: 158,
        payerName: "Anthem Blue Cross and Blue Shield Maine HMO",
      },
      {
        id: 159,
        payerName: "Anthem Blue Cross and Blue Shield Maine PPO",
      },
      {
        id: 160,
        payerName: "Anthem Blue Cross and Blue Shield Missouri HMO",
      },
      {
        id: 161,
        payerName: "Anthem Blue Cross and Blue Shield Missouri PPO",
      },
      {
        id: 162,
        payerName: "Anthem Blue Cross and Blue Shield Nevada HMO",
      },
      {
        id: 163,
        payerName: "Anthem Blue Cross and Blue Shield Nevada PPO",
      },
      {
        id: 164,
        payerName: "Anthem Blue Cross and Blue Shield New Hampshire HMO",
      },
      {
        id: 165,
        payerName: "Anthem Blue Cross and Blue Shield New Hampshire PPO",
      },
      {
        id: 166,
        payerName: "Anthem Blue Cross and Blue Shield of Georgia HMO",
      },
      {
        id: 167,
        payerName: "Anthem Blue Cross and Blue Shield of Georgia PPO",
      },
      { id: 168, payerName: "Anthem Blue Cross and Blue Shield Ohio HMO" },
      { id: 169, payerName: "Anthem Blue Cross and Blue Shield Ohio PPO" },
      {
        id: 170,
        payerName: "Anthem Blue Cross and Blue Shield Virginia HMO",
      },
      {
        id: 171,
        payerName: "Anthem Blue Cross and Blue Shield Virginia PPO",
      },
      {
        id: 172,
        payerName: "Anthem Blue Cross and Blue Shield Wisconsin HMO",
      },
      {
        id: 173,
        payerName: "Anthem Blue Cross and Blue Shield Wisconsin PPO",
      },
      {
        id: 174,
        payerName: "Anthem Blue Cross Blue Shield of New York (Empire) HMO",
      },
      {
        id: 175,
        payerName: "Anthem Blue Cross Blue Shield of New York (Empire) PPO",
      },
      { id: 176, payerName: "Anthem Blue Cross of California HMO" },
      { id: 177, payerName: "Anthem Blue Cross of California PPO" },
      { id: 178, payerName: "Arkansas Blue Cross and Blue Shield HMO" },
      { id: 179, payerName: "Arkansas Blue Cross and Blue Shield PPO" },
      { id: 180, payerName: "Blue Cross & Blue Shield of Mississippi HMO" },
      { id: 181, payerName: "Blue Cross & Blue Shield of Mississippi PPO" },
      {
        id: 182,
        payerName: "Blue Cross & Blue Shield of Rhode Island HMO",
      },
      {
        id: 183,
        payerName: "Blue Cross & Blue Shield of Rhode Island PPO",
      },
      { id: 184, payerName: "Blue Cross and Blue Shield of Alabama HMO" },
      { id: 185, payerName: "Blue Cross and Blue Shield of Alabama PPO" },
      { id: 186, payerName: "Blue Cross and Blue Shield of Hawaii HMO" },
      { id: 187, payerName: "Blue Cross and Blue Shield of Hawaii PPO" },
      { id: 188, payerName: "Blue Cross and Blue Shield of Illinois HMO" },
      { id: 189, payerName: "Blue Cross and Blue Shield of Illinois PPO" },
      {
        id: 190,
        payerName: "Blue Cross and Blue Shield of Kansas City HMO",
      },
      {
        id: 191,
        payerName: "Blue Cross and Blue Shield of Kansas City PPO",
      },
      { id: 192, payerName: "Blue Cross and Blue Shield of Kansas HMO" },
      { id: 193, payerName: "Blue Cross and Blue Shield of Kansas PPO" },
      { id: 194, payerName: "Blue Cross and Blue Shield of Louisiana HMO" },
      { id: 195, payerName: "Blue Cross and Blue Shield of Louisiana PPO" },
      {
        id: 196,
        payerName: "Blue Cross and Blue Shield of Massachusetts HMO",
      },
      {
        id: 197,
        payerName: "Blue Cross and Blue Shield of Massachusetts PPO",
      },
      { id: 198, payerName: "Blue Cross and Blue Shield of Minnesota HMO" },
      { id: 199, payerName: "Blue Cross and Blue Shield of Minnesota PPO" },
      { id: 200, payerName: "Blue Cross and Blue Shield of Montana HMO" },
      { id: 201, payerName: "Blue Cross and Blue Shield of Montana PPO" },
      { id: 202, payerName: "Blue Cross and Blue Shield of Nebraska HMO" },
      { id: 203, payerName: "Blue Cross and Blue Shield of Nebraska PPO" },
      {
        id: 204,
        payerName: "Blue Cross and Blue Shield of New Mexico HMO",
      },
      {
        id: 205,
        payerName: "Blue Cross and Blue Shield of New Mexico PPO",
      },
      {
        id: 206,
        payerName: "Blue Cross and Blue Shield of North Carolina HMO",
      },
      {
        id: 207,
        payerName: "Blue Cross and Blue Shield of North Carolina PPO",
      },
      { id: 208, payerName: "Blue Cross and Blue Shield of Oklahoma HMO" },
      { id: 209, payerName: "Blue Cross and Blue Shield of Oklahoma PPO" },
      {
        id: 210,
        payerName: "Blue Cross and Blue Shield of South Carolina HMO",
      },
      {
        id: 211,
        payerName: "Blue Cross and Blue Shield of South Carolina POC",
      },
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
      {
        id: 244,
        payerName: "Highmark Blue Cross Blue Shield Delaware HMO",
      },
      {
        id: 245,
        payerName: "Highmark Blue Cross Blue Shield Delaware PPO",
      },
      {
        id: 246,
        payerName: "Highmark Blue Cross Blue Shield of Pennsylvania HMO",
      },
      {
        id: 247,
        payerName: "Highmark Blue Cross Blue Shield of Pennsylvania PPO",
      },
      {
        id: 248,
        payerName: "Highmark Blue Cross Blue Shield of Western New York HMO",
      },
      {
        id: 249,
        payerName: "Highmark Blue Cross Blue Shield of Western New York PPO",
      },
      {
        id: 250,
        payerName: "Highmark Blue Cross Blue Shield West Virginia HMO",
      },
      {
        id: 251,
        payerName: "Highmark Blue Cross Blue Shield West Virginia PPO",
      },
      {
        id: 252,
        payerName: "Highmark Blue Shield of Northeastern New York HMO",
      },
      {
        id: 253,
        payerName: "Highmark Blue Shield of Northeastern New York PPO",
      },
      {
        id: 254,
        payerName: "Horizon Blue Cross and Blue Shield of New Jersey HMO",
      },
      {
        id: 255,
        payerName: "Horizon Blue Cross and Blue Shield of New Jersey PPO",
      },
      { id: 256, payerName: "Independence Blue Cross HMO" },
      { id: 257, payerName: "Independence Blue Cross PPO" },
      {
        id: 258,
        payerName: "Premera Blue Cross and Blue Shield of Alaska HMO",
      },
      {
        id: 259,
        payerName: "Premera Blue Cross and Blue Shield of Alaska PPO",
      },
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
      {
        id: 270,
        payerName: "Wellmark Blue Cross and Blue Shield of Iowa HMO",
      },
      {
        id: 271,
        payerName: "Wellmark Blue Cross and Blue Shield of Iowa PPO",
      },
      {
        id: 272,
        payerName: "Wellmark Blue Cross and Blue Shield South Dakota HMO",
      },
      {
        id: 273,
        payerName: "Wellmark Blue Cross and Blue Shield South Dakota PPO",
      },
      { id: 274, payerName: "Alliant Health Plan" },
      { id: 275, payerName: "AllWays Health Partners" },
      { id: 276, payerName: "AmeriHealth Caritas" },
      { id: 277, payerName: "AultCare Insurance Company" },
      { id: 278, payerName: "Bright Health" },
      {
        id: 279,
        payerName: "Capital District Physicians' Health Plan (CPDHP)",
      },
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
      { id: 333, payerName: "Independence Keystone Health" },
    ];
  }

  // Function to fetch payers data with caching and fallback
  function fetchPayersData() {
    var cacheKey = "nourishHeroPayersData";
    var cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in ms
    var now = Date.now();

    try {
      if (typeof window !== "undefined" && window.localStorage) {
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
    } catch (e) {
      // Ignore storage access issues (private mode, etc.)
    }

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

        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(
              cacheKey,
              JSON.stringify({ timestamp: Date.now(), data: data })
            );
          }
        } catch (e) {
          // Ignore storage write errors
        }

        return data;
      })
      .catch(function () {
        payersData = getFallbackPayersData();
        return payersData;
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
        if (Array.isArray(data)) {
          specialtiesData = data;
        } else if (
          data &&
          Array.isArray(data.specialties) &&
          data.specialties.length
        ) {
          specialtiesData = data.specialties;
        } else if (
          data &&
          data.data &&
          Array.isArray(data.data) &&
          data.data.length
        ) {
          specialtiesData = data.data;
        } else {
          specialtiesData = [];
        }
        return specialtiesData;
      })
      .catch(() => {
        specialtiesData = [];
        return [];
      });
  }

  function normalizeValue(value) {
    return typeof value === "string"
      ? value.trim().toLowerCase()
      : value === null || typeof value === "undefined"
      ? ""
      : String(value).trim().toLowerCase();
  }

  // Function to find payer ID by name
  function findPayerId(payerName) {
    var payer = payersData.find((item) => item.payerName === payerName);
    return payer ? payer.id : null;
  }

  // Function to find specialty ID by display name
  function findSpecialtyId(displayName) {
    var normalizedTarget = normalizeValue(displayName);
    if (!normalizedTarget) return null;

    var partialMatchId = null;

    for (var i = 0; i < specialtiesData.length; i++) {
      var item = specialtiesData[i] || {};
      var candidateNames = [
        normalizeValue(item.patientDisplayName),
        normalizeValue(item.displayName),
        normalizeValue(item.name),
        normalizeValue(item.patientFacingName),
      ];

      if (candidateNames.indexOf(normalizedTarget) !== -1) {
        return typeof item.id !== "undefined" ? item.id : null;
      }

      if (partialMatchId === null) {
        for (var j = 0; j < candidateNames.length; j++) {
          var candidate = candidateNames[j];
          if (!candidate) continue;
          if (
            candidate.indexOf(normalizedTarget) !== -1 ||
            normalizedTarget.indexOf(candidate) !== -1
          ) {
            partialMatchId =
              typeof item.id !== "undefined" ? item.id : partialMatchId;
            break;
          }
        }
      }
    }

    return partialMatchId;
  }

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

  // Function to update the CTA URL with new format
  function updateCTAUrl() {
    var baseUrl = "https://signup.usenourish.com/";
    var params = new URLSearchParams();

    // Determine landing page variation (defaults to Provider_Search)
    var variation =
      variationFromPath(window.location.pathname) || "Provider_Search";
    params.append("landingPageVariation", variation);

    // Get selected specialty
    var selectedSpecialty =
      $('input[type="radio"][data-name="Primacy concern"]:checked').val() ||
      $("#concern-text").attr("data-full-value");

    if (selectedSpecialty) {
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

    // Get location from Google autocomplete
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

    // Build final URL
    var finalUrl = baseUrl + "?" + params.toString();
    $("#home-filter-cta").attr("href", finalUrl);
  }

  // Load API data on page load
  Promise.all([fetchPayersData(), fetchSpecialtiesData()])
    .then(function () {
      clickMatchingRadioButton("insurance", "Insurance");
      clickMatchingRadioButton("concern", "Primacy concern");
      preselectConcernFromPath();
      updateCTAUrl();
    })
    .catch((error) => {
      console.error("Error loading API data:", error);
      // Still update URL even if APIs fail
      updateCTAUrl();
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

  function selectConcernByValue(value) {
    var targetLower = String(value).toLowerCase();
    var $radio = $('input[type="radio"][data-name="Primacy concern"]').filter(
      function () {
        return String($(this).val()).toLowerCase() === targetLower;
      }
    );

    if (!$radio.length) return false;

    // Mark radio as checked and ensure downstream handlers run
    if (!$radio.prop("checked")) {
      $radio.prop("checked", true);
    }

    // Trigger both change and click so any listeners update UI/state
    $radio.trigger("change");
    $radio.trigger("click");
    $("#concern-text").attr("data-full-value", value);
    return true;
  }

  function preselectConcernFromPath() {
    // Respect explicit query param or existing selection
    if (getQueryParam("concern")) return;
    if (
      typeof concernFilter !== "undefined" &&
      concernFilter !== null &&
      String(concernFilter).trim() !== ""
    ) {
      return;
    }

    var path =
      (window.location && window.location.pathname) ||
      (window.location || {}).pathname ||
      "";
    path = String(path).toLowerCase();

    var pathMappings = [
      { match: "weight-concerns", value: "Weight stabilization" },
      { match: "pcos", value: "Women's health" },
      { match: "gut-health", value: "Gut health" },
      { match: "menopause", value: "Women's health" },
      { match: "online-sports-nutritionist", value: "Sports & performance nutrition" },
    ];

    for (var i = 0; i < pathMappings.length; i++) {
      var mapping = pathMappings[i];
      if (path.indexOf(mapping.match) !== -1) {
        if (selectConcernByValue(mapping.value)) {
          break;
        }
      }
    }
  }

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
      $("#concern-text").text(newText).attr("data-full-value", selected);

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
      $("#concern-text").text(newText).attr("data-full-value", selected);
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
      $("#concern-text")
        .text(truncateText(concernFilter, maxWidth))
        .attr("data-full-value", concernFilter);
      selectConcernByValue(concernFilter);
    } else {
      // Set default text for concern
      $("#concern-text").text("Primary concern").removeAttr("data-full-value");
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
      $("#concern-text").attr("data-full-value", fullText);
    } else {
      $("#concern-text").removeAttr("data-full-value");
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
      $("#concern-text").attr("data-full-value", fullText);
    } else {
      $("#concern-text").removeAttr("data-full-value");
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
