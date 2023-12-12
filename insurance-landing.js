// Update Header with user's Location info using IPinfo
const apiURL = `https://ipinfo.io?token=${apiKey}`;
$.ajax({
  url: apiURL,
  method: "GET",
  success: function (response) {
    const locationData = response;
    if (locationData) {
      let nearMeText = " " + locationData.city + ", " + locationData.region;
      const currentText = $(".condition-hero_default-header").text();
      const newText = currentText.replace("You", nearMeText);
      $(".condition-hero_default-header").text(newText);
      var originalTitle = document.title; // "Find the Best Cigna Nutritionists Near Me"
      var newTitle = originalTitle.replace("Me", nearMeText);
      document.title = newTitle;
    }
  },
  error: function (jqXHR, textStatus, errorThrown) {
    console.log("Request failed: ", textStatus, errorThrown);
  },
});

// Load in all Finsweet Libraries for Find Provider Component & initialize Swiper
window.onload = function () {
  setTimeout(function () {
    loadScript(
      "https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsload@1/cmsload.js",
      function () {}
    );
    loadScript(
      "https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsnest@1/cmsnest.js",
      function () {}
    );
    loadScript(
      "https://cdn.jsdelivr.net/npm/@finsweet/attributes-cmsfilter@1/cmsfilter.js",
      function () {}
    );
    loadScript(
      "https://cdn.jsdelivr.net/npm/@finsweet/attributes-scrolldisable@1/scrolldisable.js",
      function () {}
    );
    loadScript(
      "https://cdn.jsdelivr.net/npm/@finsweet/attributes-mirrorclick@1/mirrorclick.js",
      function () {}
    );
  }, 2000);
  initializeSwiper();
};

$(".faq_title").each(function () {
  var text = $(this).text();
  if (text.includes("<Insurance>")) {
    var updatedText = text.replace("<Insurance>", insurance);
    $(this).text(updatedText);
  }
});

$(".faq_content-wrapper .text-rich-text p").each(function () {
  var text = $(this).html();
  var updatedText = text.replace("&lt;Insurance&gt;", insurance);
  $(this).html(updatedText);
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
              /* when window >=0px - webflow mobile landscape/portrait */
            },
            480: {
              /* when window >=0px - webflow mobile landscape/portrait */
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
    }
  );
}
