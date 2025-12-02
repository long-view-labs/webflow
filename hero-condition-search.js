$(function () {
  // Shared data caches
  var payersData = [];
  var specialtiesData = [];
  var dataReady = false;

  // Ensure global flag exists for analytics parity
  if (typeof window.InsuranceSearchInput === "undefined") {
    window.InsuranceSearchInput = false;
  }

  /**
   * Path → landing page variation mapping
   */
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
    return "Provider_Search";
  }

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search || "");
    return params.get(name);
  }

  function normalizeValue(value) {
    if (value === null || typeof value === "undefined") return "";
    return String(value)
      .replace(/\u2019/g, "'")
      .trim()
      .toLowerCase();
  }

  /**
   * Fetch payers with 24 hour cache + fallback dataset
   */
  function fetchPayersData() {
    var cacheKey = "nourishHeroPayersData";
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
      // Ignore storage access issues
    }

    return fetch("https://app.usenourish.com/api/payers?source=homepage", {
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
          // Ignore storage write errors
        }
        return payersData;
      })
      .catch(function () {
        payersData = getFallbackPayersData();
        return payersData;
      });
  }

  /**
   * Fetch specialties data (handles wrapped responses)
   */
  function fetchSpecialtiesData() {
    return fetch("https://app.usenourish.com/api/specialties/all", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Failed to fetch specialties data: " + response.status
          );
        }
        return response.json();
      })
      .then(function (data) {
        if (Array.isArray(data)) {
          specialtiesData = data;
        } else if (data && Array.isArray(data.specialties)) {
          specialtiesData = data.specialties;
        } else if (data && data.data && Array.isArray(data.data)) {
          specialtiesData = data.data;
        } else {
          specialtiesData = [];
        }
        return specialtiesData;
      })
      .catch(function (error) {
        console.error("Error fetching specialties data:", error);
        specialtiesData = [];
        return specialtiesData;
      });
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

  function findSpecialtyId(displayName) {
    var normalizedTarget = normalizeValue(displayName);
    if (!normalizedTarget) return null;

    var partialId = null;

    for (var i = 0; i < specialtiesData.length; i++) {
      var specialty = specialtiesData[i] || {};
      var candidates = [
        normalizeValue(specialty.patientDisplayName),
        normalizeValue(specialty.displayName),
        normalizeValue(specialty.name),
        normalizeValue(specialty.patientFacingName),
      ];

      if (candidates.indexOf(normalizedTarget) !== -1) {
        return typeof specialty.id !== "undefined" ? specialty.id : null;
      }

      if (partialId === null) {
        for (var j = 0; j < candidates.length; j++) {
          var candidate = candidates[j];
          if (
            candidate &&
            (candidate.indexOf(normalizedTarget) !== -1 ||
              normalizedTarget.indexOf(candidate) !== -1)
          ) {
            partialId =
              typeof specialty.id !== "undefined" ? specialty.id : partialId;
            break;
          }
        }
      }
    }

    return partialId;
  }

  function extractCityStateZip(formattedAddress) {
    if (!formattedAddress) return { city: null, state: null, zip: null };

    var parts = formattedAddress.split(", ");
    if (parts.length >= 2) {
      var city = parts[0].trim();
      var stateZip = parts[1].trim();
      var zipMatch = stateZip.match(/([A-Z]{2})\s+(\d{5})/);
      if (zipMatch) {
        return { city: city, state: zipMatch[1], zip: zipMatch[2] };
      }
      return { city: city, state: stateZip, zip: null };
    }
    return { city: null, state: null, zip: null };
  }

  function getWidgetState($widget) {
    var state = $widget.data("heroConditionState");
    if (!state) {
      state = { insurance: null, concern: null };
      $widget.data("heroConditionState", state);
    }
    return state;
  }

  function findWidgetCTA($widget) {
    var $cta = $widget.find("#home-filter-cta").first();
    if ($cta.length) return $cta;
    return $widget
      .find('.form-btn-wrap.filter a[href*="signup.usenourish.com"]')
      .first();
  }

  function truncateTextToWidth(text, $reference, maxWidth) {
    if (!text) return "";
    if (!maxWidth || maxWidth <= 0) return text;

    var $measure = $("<span>")
      .css({
        position: "absolute",
        visibility: "hidden",
        whiteSpace: "nowrap",
        fontFamily: $reference.css("font-family"),
        fontSize: $reference.css("font-size"),
        fontWeight: $reference.css("font-weight"),
        letterSpacing: $reference.css("letter-spacing"),
        textTransform: $reference.css("text-transform"),
      })
      .text(text);

    $("body").append($measure);
    var width = $measure.outerWidth();

    if (width <= maxWidth) {
      $measure.remove();
      return text;
    }

    var ellipsis = "...";
    var truncated = text;
    while (truncated.length > 0) {
      truncated = truncated.slice(0, -1);
      $measure.text(truncated + ellipsis);
      if ($measure.outerWidth() <= maxWidth) {
        truncated = truncated + ellipsis;
        break;
      }
    }

    $measure.remove();
    return truncated.length ? truncated : text;
  }

  function updateInsuranceLabel($widget, value) {
    var $labels = $widget.find('[id="insurance-text"]');
    if (!$labels.length) return;

    var defaultText = "Insurance carrier";
    var displayText = value || defaultText;
    var $toggle = $widget.find("#insurance_filter").first();
    var maxWidth = $toggle.length ? $toggle.width() : null;
    var truncated = value
      ? truncateTextToWidth(displayText, $labels.first(), maxWidth)
      : defaultText;

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
  }

  function updateConcernLabel($widget, value) {
    var $labels = $widget.find('[id="concern-text"]');
    if (!$labels.length) return;

    var defaultText = "Primary concern";
    var displayText = value || defaultText;
    var $toggle = $widget.find("#specialty_filter").first();
    var maxWidth = $toggle.length ? $toggle.width() : null;
    var truncated = value
      ? truncateTextToWidth(displayText, $labels.first(), maxWidth)
      : defaultText;

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
  }

  function ensurePlacesStyle() {
    if (document.getElementById("nourish-places-style")) return;
    var style = document.createElement("style");
    style.id = "nourish-places-style";
    style.textContent =
      ".pac-container{z-index:10000!important;}.pac-item{cursor:pointer!important;}";
    document.head.appendChild(style);
  }

  function ensurePlacesOverlay() {
    var overlay = document.getElementById("nourish-places-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "nourish-places-overlay";
      overlay.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;" +
        "background:transparent;display:none;pointer-events:auto;";

      overlay.addEventListener(
        "mousedown",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
        },
        true
      );
      overlay.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
        },
        true
      );

      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function showPlacesOverlay() {
    var overlay = ensurePlacesOverlay();
    overlay.style.display = "block";
  }

  function hidePlacesOverlay() {
    var overlay = document.getElementById("nourish-places-overlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  function attachPlacesAutocomplete($widget) {
    var widgetState = getWidgetState($widget);
    if (widgetState.placesAttached) return;

    var inputEl =
      $widget.find("#city-state-zip").get(0) ||
      $widget.find(".pac-target-input").get(0);
    if (!inputEl) return;

    var googleObj = window.google;
    var placesAvailable =
      googleObj &&
      googleObj.maps &&
      googleObj.maps.places &&
      typeof googleObj.maps.places.Autocomplete === "function";

    if (!placesAvailable) {
      widgetState.placesRetryCount = (widgetState.placesRetryCount || 0) + 1;
      if (widgetState.placesRetryCount > 20) return;
      setTimeout(function () {
        attachPlacesAutocomplete($widget);
      }, 500);
      return;
    }

    try {
      ensurePlacesStyle();
      inputEl.setAttribute("autocomplete", "off");
      ensurePlacesOverlay();

      var autocomplete = new google.maps.places.Autocomplete(inputEl, {
        fields: ["address_components", "formatted_address", "name"],
        types: ["geocode"],
      });

      autocomplete.addListener("place_changed", function () {
        var place = autocomplete.getPlace() || {};
        var components = place.address_components || [];
        var city = "";
        var state = "";
        var postalCode = "";

        for (var i = 0; i < components.length; i++) {
          var component = components[i];
          if (!component || !component.types) continue;

          if (component.types.indexOf("locality") !== -1) {
            city = component.long_name || component.short_name || city;
          } else if (
            component.types.indexOf("administrative_area_level_1") !== -1
          ) {
            state = component.short_name || component.long_name || state;
          } else if (component.types.indexOf("postal_code") !== -1) {
            postalCode =
              component.long_name || component.short_name || postalCode;
          }
        }

        var displayValue = "";
        if (city && state) {
          displayValue = city + ", " + state;
          if (postalCode) {
            displayValue += " " + postalCode;
          }
        } else if (place.formatted_address) {
          displayValue = place.formatted_address;
        } else if (place.name) {
          displayValue = place.name;
        }

        if (displayValue) {
          $(inputEl).val(displayValue).trigger("input");
        }

        updateWidgetCTA($widget);
        hidePlacesOverlay();
      });

      google.maps.event.addDomListener(inputEl, "keydown", function (e) {
        if (e.keyCode === 13) {
          e.preventDefault();
        }
      });

      inputEl.addEventListener("focus", function () {
        showPlacesOverlay();
      });

      inputEl.addEventListener("blur", function () {
        setTimeout(hidePlacesOverlay, 200);
      });

      widgetState.placesAttached = true;
      widgetState.placesAutocomplete = autocomplete;
    } catch (e) {
      console.error("Failed to initialise Google Places Autocomplete", e);
    }
  }

  function closeDropdown($dropdown) {
    if (!$dropdown || !$dropdown.length) return;

    var dropdownApi =
      window.Webflow &&
      window.Webflow.require &&
      window.Webflow.require("dropdown");

    if (dropdownApi && typeof dropdownApi.close === "function") {
      dropdownApi.close($dropdown[0]);
    } else {
      $dropdown.trigger("w-close");
      var $toggleManual = $dropdown.find(".w-dropdown-toggle").first();
      var $listManual = $dropdown.find(".w-dropdown-list").first();
      $dropdown.removeClass("w--open").attr("data-open", "false");
      if ($toggleManual.length) {
        $toggleManual.removeClass("w--open").attr("aria-expanded", "false");
      }
      if ($listManual.length) {
        $listManual
          .removeClass("w--open")
          .attr("aria-hidden", "true")
          .css("display", "none");
      }
    }

    setTimeout(function () {
      var escEvent;
      try {
        escEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          keyCode: 27,
          code: "Escape",
          which: 27,
          bubbles: true,
          cancelable: true,
        });
      } catch (err) {
        escEvent = document.createEvent("KeyboardEvent");
        escEvent.initEvent("keydown", true, true);
      }

      var activeEl = document.activeElement;
      if (activeEl && typeof activeEl.dispatchEvent === "function") {
        activeEl.dispatchEvent(escEvent);
      }
    }, 0);
  }

  function getSelectedInsurance($widget) {
    var $radio = $widget
      .find('input[type="radio"][data-name="Insurance"]:checked')
      .first();
    return $radio.length ? $radio.val() : null;
  }

  function getSelectedConcern($widget) {
    var $radio = $widget
      .find('input[type="radio"][data-name="Primacy concern"]:checked')
      .first();
    return $radio.length ? $radio.val() : null;
  }

  function selectRadioByValue($widget, dataName, targetValue) {
    var normalizedTarget = normalizeValue(targetValue);
    if (!normalizedTarget) return false;

    var $radio = $widget
      .find('input[type="radio"][data-name="' + dataName + '"]')
      .filter(function () {
        return normalizeValue($(this).val()) === normalizedTarget;
      })
      .first();

    if (!$radio.length) return false;

    if (!$radio.prop("checked")) {
      $radio.prop("checked", true);
    }

    $radio.trigger("change");
    return true;
  }

  function applyQueryParamSelection($widget) {
    var applied = false;
    var insuranceParam = getQueryParam("insurance");
    if (insuranceParam) {
      applied = selectRadioByValue($widget, "Insurance", insuranceParam) || applied;
    }
    var concernParam = getQueryParam("concern");
    if (concernParam) {
      applied = selectRadioByValue($widget, "Primacy concern", concernParam) || applied;
    }
    return applied;
  }

  function applyGlobalPrefills($widget) {
    if (typeof insFilter !== "undefined" && insFilter !== null) {
      selectRadioByValue($widget, "Insurance", insFilter);
    }
    if (typeof concernFilter !== "undefined" && concernFilter !== null) {
      selectRadioByValue($widget, "Primacy concern", concernFilter);
    }
  }

  function applyPathPreselect($widget) {
    var state = getWidgetState($widget);
    if (state.concern) return;
    if (
      typeof concernFilter !== "undefined" &&
      concernFilter !== null &&
      String(concernFilter).trim() !== ""
    ) {
      return;
    }
    if (getQueryParam("concern")) return;

    var path = (window.location && window.location.pathname) || "";
    path = String(path).toLowerCase();

    var mappings = [
      { match: "weight-concerns", value: "Weight stabilization" },
      { match: "pcos", value: "Women's health" },
      { match: "gut-health", value: "Gut health" },
      { match: "menopause", value: "Women's health" },
      {
        match: "online-sports-nutritionist",
        value: "Sports & performance nutrition",
      },
    ];

    for (var i = 0; i < mappings.length; i++) {
      var mapping = mappings[i];
      if (path.indexOf(mapping.match) !== -1) {
        if (selectRadioByValue($widget, "Primacy concern", mapping.value)) {
          break;
        }
      }
    }
  }

  function appendUtmParams(params) {
    try {
      var utmKeys =
        window.NOURISH_UTM_PARAMS ||
        [
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
      // swallow UTM errors
    }
  }

  function updateWidgetCTA($widget) {
    if (!dataReady) return;

    var $cta = findWidgetCTA($widget);
    if (!$cta.length) return;

    var state = getWidgetState($widget);
    var baseUrl = "https://signup.usenourish.com/";
    var params = new URLSearchParams();

    var variation = variationFromPath(window.location.pathname);
    if (variation) {
      params.append("landingPageVariation", variation);
    }

    var specialtyValue =
      state.concern ||
      getSelectedConcern($widget) ||
      ($widget.find('[id="concern-text"]').attr("data-full-value") || null);

    if (specialtyValue) {
      var specialtyId = findSpecialtyId(specialtyValue);
      if (specialtyId) {
        params.append("prioritySpecialtyId", specialtyId);
      } else {
        console.warn(
          "Unable to resolve specialty ID for value:",
          specialtyValue
        );
      }
    }

    var insuranceValue =
      state.insurance ||
      getSelectedInsurance($widget) ||
      ($widget.find('[id="insurance-text"]').attr("data-full-value") || null);

    if (insuranceValue) {
      var normalized = normalizeValue(insuranceValue);
      if (normalized === "i'm paying for myself") {
        params.append("nourishPayerId", -1);
      } else if (normalized === "other") {
        params.append("nourishPayerId", -2);
      } else if (normalized === "i'll choose my insurance later") {
        // no-op
      } else {
        var payerId = findPayerId(insuranceValue);
        if (payerId) {
          params.append("nourishPayerId", payerId);
        }
      }
    }

    var locationValue = $widget.find("#city-state-zip").first().val();
    if (locationValue) {
      var locationData = extractCityStateZip(locationValue);
      if (locationData.city) params.append("addressCity", locationData.city);
      if (locationData.state) params.append("addressState", locationData.state);
      if (locationData.zip) params.append("addressZipCode", locationData.zip);
    }

    appendUtmParams(params);
    params.append("InsuranceSearchInput", "false");

    var finalUrl = baseUrl + "?" + params.toString();
    $cta.attr("href", finalUrl);
  }

  function syncStateFromDOM($widget, options) {
    var opts = options || {};
    var state = getWidgetState($widget);

    var insuranceValue = getSelectedInsurance($widget);
    state.insurance = insuranceValue || state.insurance || null;
    updateInsuranceLabel($widget, state.insurance);

    var concernValue = getSelectedConcern($widget);
    state.concern = concernValue || state.concern || null;
    updateConcernLabel($widget, state.concern);

    if (!opts.skipCta) {
      updateWidgetCTA($widget);
    }
  }

  function initWidget($widget) {
    if ($widget.data("heroConditionInitialized")) return;
    $widget.data("heroConditionInitialized", true);

    var state = getWidgetState($widget);

    // Scoped event handlers
    $widget.on(
      "change",
      'input[type="radio"][data-name="Insurance"]',
      function () {
        var value = $(this).val();
        state.insurance = value || null;
        updateInsuranceLabel($widget, state.insurance);
        updateWidgetCTA($widget);

        var $dropdownList = $(this).closest(".w-dropdown-list");
        if ($dropdownList.length) {
          var $dropdown = $dropdownList.closest(".w-dropdown");
          closeDropdown($dropdown);
        }
      }
    );

    $widget.on(
      "change",
      'input[type="radio"][data-name="Primacy concern"]',
      function () {
        var value = $(this).val();
        state.concern = value || null;
        updateConcernLabel($widget, state.concern);
        updateWidgetCTA($widget);

        var $dropdownList = $(this).closest(".w-dropdown-list");
        if ($dropdownList.length) {
          var $dropdown = $dropdownList.closest(".w-dropdown");
          closeDropdown($dropdown);
        }
      }
    );

    $widget.on("input", "#city-state-zip", function () {
      updateWidgetCTA($widget);
    });

    // Initial sync
    syncStateFromDOM($widget, { skipCta: true });

    applyGlobalPrefills($widget);
    applyQueryParamSelection($widget);
    applyPathPreselect($widget);
    attachPlacesAutocomplete($widget);

    syncStateFromDOM($widget, { skipCta: true });

    if (dataReady) {
      updateWidgetCTA($widget);
    } else {
      dataReadyPromise.then(function () {
        updateWidgetCTA($widget);
      });
    }
  }

  function initializeWidgets() {
    $(".home-filter_component").each(function () {
      initWidget($(this));
    });
  }

  var dataReadyPromise = Promise.all([
    fetchPayersData(),
    fetchSpecialtiesData(),
  ])
    .then(function () {
      dataReady = true;
      initializeWidgets();
      $(".home-filter_component").each(function () {
        updateWidgetCTA($(this));
      });
    })
    .catch(function (error) {
      console.error("Error loading provider search data:", error);
      dataReady = true;
      initializeWidgets();
      $(".home-filter_component").each(function () {
        updateWidgetCTA($(this));
      });
    });

  // Initialize immediately so event handlers are bound even before data resolves
  initializeWidgets();
});
