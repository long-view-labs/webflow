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
