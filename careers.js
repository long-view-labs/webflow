$(document).ready(function () {
  var $window = $(window);
  var $element = $(".careers-hero_slider"); // Adjust this selector to match your element
  var documentHeight = $(document).height();
  var endScroll = documentHeight * 0.38; // The scroll position where the animation ends

  function parallaxScroll() {
    var scrolled = $window.scrollTop();
    var translateValue = 0;

    // Check if the viewport width is greater than 992px
    if (window.innerWidth > 992) {
      if (scrolled <= endScroll) {
        if (window.innerWidth >= 1440) {
          // When the viewport width is greater than or equal to 1440px
          translateValue = -750 * (scrolled / endScroll);
        } else {
          // When the viewport width is greater than 992px but less than 1440px
          translateValue = -900 * (scrolled / endScroll);
        }
        $element.css("transform", "translateX(" + translateValue + "px)");
      }
    } else {
      // If the viewport is less than or equal to 992px, reset any transform applied
      $element.css("transform", "");
    }
  }

  // Attach the function to the window's scroll event
  $window.on("scroll", parallaxScroll);

  // Call the function on load to set the initial position
  parallaxScroll();
});
// Create an intersection observer
var observer = new IntersectionObserver(
  function (entries, observer) {
    entries.forEach(function (entry) {
      // Check if the element is in view
      if (entry.isIntersecting) {
        // Initialize Swiper here
        $(".employee-quotes_slider").each(function (index) {
          const swiper = new Swiper($(this).find(".swiper")[0], {
            slidesPerView: 1,
            speed: 600,
            spaceBetween: 32,
            initialSlide: 0,
            slideToClickedSlide: true,
            centeredSlides: true,
            loop: true,
            parallax: true,
            grabCursor: true,
            slideActiveClass: "is-active",
            slideDuplicateActiveClass: "is-active",
            keyboard: false,
            disableOnInteraction: false,
            autoplay: {
              delay: 5500,
            },
            pagination: {
              el: ".swiper_pagination-wrapper",
              bulletElement: "div",
              bulletClass: "swiper_pagination-bullet-small",
              bulletActiveClass: "is-active",
              clickable: true,
            },
            navigation: {
              nextEl: "#right",
              prevEl: "#left",
            },
            breakpoints: {
              0: {
                /* when window >=0px - webflow mobile landscape/portrait */
              },
              480: {
                /* when window >=0px - webflow mobile landscape/portrait */
              },
              767: {
                /* when window >= 767px - webflow tablet */
              },
              992: {
                /* when window >= 988px - webflow desktop */
              },
            },
            on: {
              slideChangeTransitionEnd: function () {
                this.update(); // Update Swiper to re-calculate the slides
                this.wrapperEl.style.transition = "transform .3s ease-out";
              },
              transitionStart: function () {
                // Add a custom class or directly add styles to enable the transition
                // this.wrapperEl.style.transition = "transform .3s ease-out";
              },
              transitionEnd: function () {
                // Remove the custom class or directly remove styles to disable the transition
                //this.wrapperEl.style.transition = "none";
                //this.update();
              },
            },
          });
          // On hover, stop autoplay
          $(this).mouseenter(function () {
            swiper.autoplay.stop();
          });

          $(this).mouseleave(function () {
            swiper.autoplay.start();
          });
        });

        // Stop observing the element after it has come into view and the slider is initialized
        observer.unobserve(entry.target);
      }
    });
  },
  {
    // Options for the observer (which part of the item must be visible to trigger the event, etc.)
    threshold: 0.1, // Trigger when at least 10% of the target is visible
  }
);

// Tell the observer which element(s) to track
document.querySelectorAll(".employee-quotes_grid").forEach(function (grid) {
  observer.observe(grid);
});
