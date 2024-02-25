$(document).ready(function () {
  // Handle click on .sticky-question_answer-wrap
  $(".sticky-question_answer-wrap").on("click", function () {
    // Retrieve the URL from the .sticky-link element and navigate to it
    var url = $(".sticky-link").attr("href");
    if (url) {
      window.location.href = url;
    }
  });

  // Handle click on #splash-link button
  $("#splash-link").on("click", function () {
    // Retrieve the URL from the .splash-link element and navigate to it
    var url = $(".splash-link").attr("href");
    if (url) {
      window.location.href = url;
    }
  });
});

$(document).ready(function () {
  // Check if the child element with class .empty-state exists inside .cms-main-blog_wrappers
  if ($(".cms-main-blog_wrapper .empty-state").length > 0) {
    // Hide the element with class .blog-page_side-navigation_card-wrapper
    $(".blog-page_side-navigation_card-wrapper").hide();
    $(".blog-content_container").css("max-width", "none");
    // Update the .blog-page_component grid-template-columns to new value
    if ($(window).width() >= 992) {
      // Desktop and up
      $(".blog-page_component").css("grid-template-columns", ".5fr 1fr");
    }
  }

  // Update 'A/An' text based on given category
  var blogCategoryElement = document.getElementById("blog-category");
  var anTagElement = document.getElementById("an-tag");

  // Get the text content of the blog-category element
  var blogCategoryText = blogCategoryElement.textContent.trim().toLowerCase();

  // Check if the text starts with a vowel
  var startsWithVowel = /^[aeiou]/i.test(blogCategoryText);

  // Update the an-tag element based on the vowel check
  if (startsWithVowel) {
    anTagElement.textContent = "an";
  }

  // Hide hidden blog posts
  const eraseHidden = () => {
    document.querySelectorAll(".w-condition-invisible").forEach((el) => {
      el.remove();
    });
  };
  document.addEventListener("DOMContentLoaded", eraseHidden);
});

//social share link code
$(document).ready(function () {
  let title = document.title;
  let url = window.location.href;
  $("[data-share-facebook").attr(
    "href",
    "https://www.facebook.com/sharer/sharer.php?u=" +
      url +
      "%2F&title=" +
      title +
      "%3F"
  );
  $("[data-share-facebook").attr("target", "_blank");

  $("[data-share-twitter").attr(
    "href",
    "https://twitter.com/intent/tweet?url=" + url
  );
  $("[data-share-twitter").attr("target", "_blank");

  $("[data-share-linkedin").attr(
    "href",
    "https://www.linkedin.com/shareArticle?mini=true&url=" +
      url +
      "%2F&title=" +
      title +
      "&summary="
  );
  $("[data-share-linkedin").attr("target", "_blank");

  $("[data-share-mail").attr(
    "href",
    "mailto:?subject=" + title + "&body=" + url
  );
  $("[data-share-mail").attr("target", "_blank");
});

function checkSwiperExistence() {
  if ($(".swiper").length > 0) {
    setTimeout(function () {
      var swiper = new Swiper(".swiper", {
        threshold: 5,
        observer: true,
        navigation: {
          prevEl: ".swiper-button-prev",
          nextEl: ".swiper-button-next",
        },
        observeParents: true,
        watchSlidesProgress: true,
        grabCursor: true,
        keyboard: { enabled: true },
      });
    }, 1500);
  } else {
    setTimeout(checkSwiperExistence, 1000);
  }
}

function replaceBlogSplash() {
  // Get the text value of the element with ID 'blog-category'
  var blogCategory = $("#blog-category").text().toLowerCase();

  // Get the current HTML content of the element with class 'rich-text_splash'
  var currentHtml = $(".rich-text_splash").html();

  // Replace all occurrences of category with the blogCategory value
  var newHtml = currentHtml.replace("{category}", blogCategory);

  // Check if the blogCategory starts with a vowel
  if ("aeiou".indexOf(blogCategory[0]) !== -1) {
    // Replace 'a' with 'an'
    newHtml = newHtml.replace("a ", "an ");
  }

  // Update the HTML content of the element with class 'rich-text_splash'
  $(".rich-text_splash").html(newHtml);
}

$(document).ready(function () {
  checkSwiperExistence();
  replaceBlogSplash();
});

// Script to force external links to open in new tab
// Called once the document's content is ready
function ready(callback) {
  if (document.readyState != "loading") callback();
  else if (document.addEventListener)
    document.addEventListener("DOMContentLoaded", callback);
  else
    document.attachEvent("onreadystatechange", function () {
      if (document.readyState == "complete") callback();
    });
}
// If link is not internal to domain, set target to _blank which opens in new tab
function openAllExternalsInTabs() {
  var thisDomain = location.hostname;
  var externalDomains =
    'a:not([href*="' + thisDomain + '"]):not([href^="/"]):not(.fs-toc_link)';
  var allExternalLinks = document.querySelectorAll(externalDomains);
  for (var i in allExternalLinks) {
    allExternalLinks[i].target = "_blank";
  }
}
// Prevents backlink from appearing as referral traffic
function addNoReferrer() {
  var selector = '[target="_blank"]';
  var externalLinks = document.querySelectorAll(selector);
  for (var i in externalLinks) {
    externalLinks[i].rel = "noreferrer";
  }
}
ready(function () {
  openAllExternalsInTabs();
  addNoReferrer();
});

// Get the text content of the .blog-post-rtb element
var blogPostRtbText = document.querySelector(".blog-post-rtb").textContent;

// Check if the text includes 'local'
if (blogPostRtbText.includes("{{local}}")) {
  // Call the IPInfo API
  const apiKey = "69d052a0093ef5";
  const apiURL = `https://ipinfo.io?token=${apiKey}`;
  $.ajax({
    url: apiURL,
    method: "GET",
    success: function (response) {
      const locationData = response;
      if (locationData) {
        // Assume 'userState' is the state obtained from the ipinfo API
        const userState = locationData.region; // Replace with actual API response field if different
        const [userLat, userLon] = locationData.loc.split(",").map(Number);

        // Get all instances of the component where {splash} is added
        const splashComponents = document.querySelectorAll(
          '[fs-richtext-component="local"]'
        );
        // Get all the items in the .local-list within the current component
        const listItems = document.querySelectorAll(".local-list .w-dyn-item");

        // Sort listItems based on distance to user's location
        // Sort listItems based on distance to user's location
        const sortedItems = Array.from(listItems).sort((a, b) => {
          const aLocationDiv = a.querySelector(".long-lat");
          const bLocationDiv = b.querySelector(".long-lat");

          if (!aLocationDiv || !bLocationDiv) {
            console.error(
              "One of the list items does not contain location data."
            );
            return 0;
          }

          const aCoords = aLocationDiv.textContent.split(",").map(Number);
          const bCoords = bLocationDiv.textContent.split(",").map(Number);

          const distanceA = calculateDistance(userLat, userLon, ...aCoords);
          const distanceB = calculateDistance(userLat, userLon, ...bCoords);

          return distanceA - distanceB;
        });

        // Iterate over each splash component
        splashComponents.forEach((component) => {
          // Inside this loop, apply your logic to each component

          // Filter the items that match the user's state within the current component
          const matchingItems = Array.from(sortedItems).filter((item) => {
            const stateFull = item
              .querySelector(".state-full")
              .textContent.trim();
            return stateFull === userState;
          });

          // If there are matching items, insert them into the .local-splash-* divs
          if (matchingItems.length > 0) {
            // Replace {State} with the user's state in .splash-title.local
            component.querySelectorAll(".splash-title.local").forEach((el) => {
              el.textContent = el.textContent.replace("{State}", userState);
            });

            matchingItems.slice(0, 3).forEach((item, index) => {
              // Clone the link to be inserted
              const linkToInsert = item
                .querySelector(".city-state")
                .cloneNode(true);

              // Select the target div based on the index
              const targetDiv = component.querySelector(
                `.local-splash-${index + 1}`
              );

              // Insert the cloned link into the target div
              if (targetDiv) {
                targetDiv.innerHTML = ""; // Clear existing content
                targetDiv.appendChild(linkToInsert);
              }
            });

            // Hide the remaining .local-splash-* divs and .line-separator.vertical elements
            for (let i = matchingItems.length; i < 3; i++) {
              component.querySelector(`.local-splash-${i + 1}`).style.display =
                "none";
              // Hide the .line-separator.vertical that follows the .local-splash-* div
              let nextSeparator = component.querySelector(
                `.local-splash-${i + 1}`
              ).nextElementSibling;
              if (
                nextSeparator &&
                nextSeparator.classList.contains("line-separator")
              ) {
                nextSeparator.style.display = "none";
              }
            }

            // Additionally, if there is only one match, hide the first .line-separator.vertical
            if (matchingItems.length === 1) {
              let firstSeparator =
                component.querySelector(".local-splash-1").nextElementSibling;
              if (
                firstSeparator &&
                firstSeparator.classList.contains("line-seperator")
              ) {
                firstSeparator.style.display = "none";
              }
            }
            // If there are only two matches, hide the second .line-separator.vertical
            if (matchingItems.length === 2) {
              let secondSeparator =
                component.querySelector(".local-splash-2").nextElementSibling;
              if (
                secondSeparator &&
                secondSeparator.classList.contains("line-seperator")
              ) {
                secondSeparator.style.display = "none";
              }
            }
          } else {
            // Hide .blog-content_bottom-splash and .splash-title.local
            component.querySelector(
              ".blog-content_bottom-splash"
            ).style.display = "none";
            component
              .querySelectorAll(".splash-title.local")
              .forEach((el) => (el.style.display = "none"));

            // Show .splash-title.default
            component.querySelector(".splash-title.default").style.display =
              "block";
          }
        });
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.log("Request failed: ", textStatus, errorThrown);
    },
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula to calculate distance
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
