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
  var updatedText = text.replace("<Name>", name);
  $(this).text(updatedText);
});

$(".faq_content-wrapper .condition_rich-text p").each(function () {
  var text = $(this).html();
  var updatedText = text.replace("&lt;Name&gt;", name);
  $(this).html(updatedText);
});

function initializeSwiper() {
  // Create a new IntersectionObserver instance
  var observer = new IntersectionObserver(function (entries) {
    // Loop over the entries
    entries.forEach(function (entry) {
      // If the element is visible
      if (entry.isIntersecting) {
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
          }
        );

        // Stop observing the target element
        observer.unobserve(entry.target);
      }
    });
  });

  // Start observing an element
  observer.observe(document.querySelector(".section_stories"));

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
