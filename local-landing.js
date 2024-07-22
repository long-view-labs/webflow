// Update Header with user's Location info using IPinfo
const apiKey = "89320a08dbdfa6";
const apiURL = `https://ipinfo.io?token=${apiKey}`;
$.ajax({
  url: apiURL,
  method: "GET",
  success: function (response) {
    const locationData = response;
    if (locationData) {
      if (locationData.city) {
      } else {
        console.log("City information not available.");
      }
      if (locationData.postal) {
      } else {
        console.log("ZIP Code information not available.");
      }
    }
  },
  error: function (jqXHR, textStatus, errorThrown) {
    console.log("Request failed: ", textStatus, errorThrown);
  },
});

$(".state_rich-text p").each(function () {
  var text = $(this).html();
  var updatedText = text
    .replace("&lt;City&gt;", city)
    .replace("&lt;State&gt;", state);
  $(this).html(updatedText);
});

// Update Success Stories with Location info
$(".success-story_details, .condition-dropdown_description").each(function () {
  var text = $(this).text();
  var updatedText = text.replace("{City}", city).replace("{State}", state);
  $(this).text(updatedText);
});

  // Function to replace <City> and <State> placeholders
  function replacePlaceholders(element) {
    var text = $(element).html();
    var updatedText = text
      .replace(/&lt;City&gt;/g, city)
      .replace(/&lt;State&gt;/g, state)
      .replace(/<City>/g, city)
      .replace(/<State>/g, state);
    $(element).html(updatedText);
  }

  // Update FAQ titles
  $(".faq_title, .optional-title").each(function () {
    var text = $(this).text();
    var updatedText = text.replace("<City>", city).replace("<State>", state);
    $(this).text(updatedText);
  });

  // Update FAQ content and other rich text areas
  $(".faq_content-wrapper .condition_rich-text, .3col-content .condition_rich-text, .condition_dropdown_description, .condition_rich-text p, .condition_rich-text li, .condition_rich-text ol, p").each(function () {
    replacePlaceholders(this);
  });


// Update Google Map for multiple placeholders
// Create a new IntersectionObserver instance
var observer = new IntersectionObserver(function (entries) {
  // Loop over the entries
  entries.forEach(function (entry) {
    // If the element is visible
    if (entry.isIntersecting) {
      // Update Google Map for each visible placeholder
      var iframe = document.createElement("iframe");

      iframe.width = "100%";
      iframe.height = "100%";
      iframe.style.border = "0";
      iframe.loading = "lazy";
      iframe.allowfullscreen = true;
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.src =
        "https://www.google.com/maps/embed/v1/place?key=" +
        googleAPI +
        "&q=" +
        city +
        "," +
        state; // Ensure city and state are properly concatenated
      entry.target.appendChild(iframe);

      // Stop observing the target element
      observer.unobserve(entry.target);
    }
  });
});

// Start observing all elements with the class 'map-placeholder'
document.querySelectorAll(".maps-embed-wrap").forEach(function (element) {
  observer.observe(element);
});

function initializeSwiper() {
  // Load the Swiper script
  loadScript(
    "https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js",
    function () {
      $(".condition_stories-component").each(function (index) {
        const swiper = new Swiper($(this).find(".swiper")[0], {
          slidesPerView: 1,
          speed: 600,
          spaceBetween: 64,
          initialSlide: 0,
          slideToClickedSlide: true,
          centeredSlides: false,
          loop: true,
          slideActiveClass: "is-active",
          slideDuplicateActiveClass: "is-active",
          keyboard: false,
          disableOnInteraction: false,
          pagination: {
            el: ".swiper_pagination-wrapper",
            bulletElement: "div",
            bulletClass: "swiper_pagination-bullet",
            bulletActiveClass: "is-active",
            clickable: true,
          },
          navigation: {
            nextEl: "#story-right",
            prevEl: "#story-left",
          },
          breakpoints: {
            0: {
              /* when window >=0px - webflow mobile landscape/portrait */
            },
            480: {
              /* when window >=0px - webflow mobile landscape/portrait */
            },
            767: {
              /* when window >= 767px - webflow tablet */ spaceBetween: 32,
            },
            992: {
              /* when window >= 988px - webflow desktop */
            },
          },
        });
      });

      $(".related-articles_component").each(function (index) {
        const swiper = new Swiper($(this).find(".swiper")[0], {
          slidesPerView: 3,
          speed: 600,
          spaceBetween: 64,
          initialSlide: 0,
          slideToClickedSlide: true,
          centeredSlides: false,
          loop: true,
          slideActiveClass: "is-active",
          slideDuplicateActiveClass: "is-active",
          keyboard: false,
          disableOnInteraction: false,
          pagination: {
            el: ".swiper_pagination-wrapper",
            bulletElement: "div",
            bulletClass: "swiper_pagination-bullet",
            bulletActiveClass: "is-active",
            clickable: true,
          },
          navigation: {
            nextEl: "#story-right",
            prevEl: "#story-left",
          },
          breakpoints: {
            0: {
              slidesPerView: 1,
            },
            480: {
              slidesPerView: 1,
            },
            767: {
              slidesPerView: 1,
            },
            992: {
              /* when window >= 988px - webflow desktop */
            },
          },
        });
      });

      $(".condition_stories-component").each(function (index) {
        const swiper = new Swiper($(this).find(".swiper")[0], {
          slidesPerView: 1,
          speed: 600,
          spaceBetween: 24,
          initialSlide: 0,
          slideClass: "swiper-slide-home",
          slideToClickedSlide: true,
          centeredSlides: false,
          loop: false,
          slideActiveClass: "is-active",
          slideDuplicateActiveClass: "is-active",
          keyboard: false,
          disableOnInteraction: false,
          pagination: {
            el: ".condition_stories-component .swiper_pagination-wrapper-home",
            bulletElement: "div",
            bulletClass: "swiper_pagination-bullet",
            bulletActiveClass: "is-active",
            bulletSize: 8,
            clickable: true,
          },
          breakpoints: {
            0: {
              /* when window >=0px - webflow mobile landscape/portrait */
            },
            480: {
              /* when window >=0px - webflow mobile landscape/portrait */
              spaceBetween: 12,
            },
            481: {
              /* when window >= 767px - webflow tablet */ spaceBetween: 24,
            },
            767: {
              /* when window >= 767px - webflow tablet */ spaceBetween: 24,
            },
            992: {
              /* when window >= 988px - webflow desktop */ spaceBetween: 24,
            },
          },
        });
      });
    }
  );
}
