function loadScript(src, callback) {
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.onload = function () {
    if (typeof callback === "function") {
      callback();
    }
  };
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
}

function loadScriptOnScroll(src, element, callback) {
  if (!src) {
    return; // Exit the function if the src is not valid
  }

  var script = document.createElement("script");
  script.type = "text/javascript";
  script.onload = function () {
    if (element) {
      element.setAttribute("data-script-loaded", "true");
    }
    if (typeof callback === "function") {
      callback();
    }
  };
  script.onerror = function () {
    return;
  };
  script.src = src;
  script.async = true;
  document.head.appendChild(script);

  window.addEventListener("scroll", function onScroll() {
    var position = element.getBoundingClientRect().top;
    var pageOffset =
      window.innerHeight || document.documentElement.clientHeight;

    if (position <= pageOffset && !element.hasAttribute("data-script-loaded")) {
      loadScriptOnScroll(
        element.getAttribute("data-script-src"),
        element,
        callback
      );
      window.removeEventListener("scroll", onScroll);
    }
  });
}

// Register the scroll event listener
window.addEventListener("scroll", function onScroll() {
  // Select all elements that have a 'data-script-src' attribute
  var elements = document.querySelectorAll(
    "[data-script-src]:not([data-script-loaded])"
  );

  elements.forEach(function (element) {
    var position = element.getBoundingClientRect().top;
    var pageOffset =
      window.innerHeight || document.documentElement.clientHeight;

    // If the element is in the viewport and the script has not been loaded yet
    if (position <= pageOffset && !element.hasAttribute("data-script-loaded")) {
      loadScriptOnScroll(
        element.getAttribute("data-script-src"),
        element,
        function () {
          if (
            element.getAttribute("data-script-src") ===
            "https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js"
          ) {
            initializeSwiper();
          }
        }
      );
    }
  });
});

// Load Convert Script
window.addEventListener("scroll", function onFirstScroll() {
  window.removeEventListener("scroll", onFirstScroll);
});

// Iterate over each .menu_slug element (For the States links)
$(".menu_slug").each(function () {
  // Get the state text from the current .menu_slug element
  var state = $(this).text();
  // Find the previous sibling's 'a' element and update its 'href'
  $(this)
    .prev("a")
    .attr("href", function (i, href) {
      // Append '?state=' and the state text to the current href value
      return href + "?state=" + state;
    });
});
//Script to store UTM params in cookies
const utmParameters = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
];

var URLSearchParams_wb = loadUtms();
if (hasUtms(utmParameters, URLSearchParams_wb) == true) {
  setUtmCookies(utmParameters, URLSearchParams_wb);
}

//return true if URL contains any utm params
function hasUtms(utmParameters, URLSearchParams_wb) {
  for (const utm_element of utmParameters) {
    /* if utm exists, return true */
    if (URLSearchParams_wb.has(utm_element)) {
      return true;
    }
  } /* end for loop */
  return false;
}

function loadUtms() {
  var queryString = window.location.search;
  return new URLSearchParams(queryString);
}

function setUtmCookies(utmParameters, URLSearchParams_wb) {
  //Set utm params
  for (const utm_element of utmParameters) {
    /* if utm_source exist */
    if (URLSearchParams_wb.has(utm_element)) {
      /* get UTM value of this utm param */
      var value = URLSearchParams_wb.get(utm_element);
      /* set cookie */
      document.cookie =
        utm_element + "=" + value + "; path=/; domain=.usenourish.com";
    } else {
      document.cookie = utm_element + "=" + "; path=/; domain=.usenourish.com";
    }
  } /* end for loop */
}

const urlPath = window.location.href;
if (urlPath.includes("_page=")) {
  const canonicalLink = document.querySelector("link[rel='canonical']");
  if (canonicalLink) {
    canonicalLink.href = urlPath;
  } else {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", urlPath);
    document.head.appendChild(link);
  }
}
