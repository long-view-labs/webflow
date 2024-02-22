// On initial page load
$(document).ready(function () {
  postnomReorder();
  showMoreTags();
  if (typeof reviewSlider !== "undefined") {
    reviewSlider();
  }
  updateCTA();
});

var currentInsuranceList = $(".insurance-list.state-current");
var texasInsuranceList = $(".insurance-list.texas");

if ($(".provider-specialites_state-wrap.w-condition-invisible").length == 0) {
  currentInsuranceList.children().appendTo(texasInsuranceList);

  setTimeout(function () {
    var uniqueItems = [];
    var sortedItems = [];

    texasInsuranceList.find(".w-dyn-item").each(function () {
      var listItem = $(this);
      var listItemHTML = listItem[0].outerHTML;

      if (uniqueItems.includes(listItemHTML)) {
        listItem.remove();
      } else {
        uniqueItems.push(listItemHTML);
        sortedItems.push(listItem);
      }
    });

    sortedItems.sort(function (a, b) {
      var textA = $(a).text().toUpperCase();
      var textB = $(b).text().toUpperCase();
      return textA < textB ? -1 : textA > textB ? 1 : 0;
    });

    texasInsuranceList.empty();
    $.each(sortedItems, function (index, element) {
      texasInsuranceList.append(element);
    });
  }, 0);
}

// If new bio is visible (all new fields are filled), hide old bio
if ($(".provider-grid-template.new.w-condition-invisible").length == 0) {
  $(".provider-grid-template.old").hide();
}

var observer = new IntersectionObserver(
  function (entries, observer) {
    entries.forEach(function (entry) {
      // Check if the element is in view
      if (entry.isIntersecting) {
        // Swiper initialization and options
        $(".provider-reviews_slider").each(function (index) {
          const swiperContainer = $(this);
          const slides = swiperContainer.find(".swiper-slide");
          const numberOfSlides = slides.length;

          const swiperOptions = {
            slidesPerView: 1,
            speed: 600,
            spaceBetween: 32,
            initialSlide: 0,
            slideToClickedSlide: true,
            centeredSlides: true,
            loop: numberOfSlides > 2, // Only enable loop if more than 2 slides
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
              0: {},
              480: { spaceBetween: 12 },
              767: { spaceBetween: 24 },
              992: { spaceBetween: 24 },
            },
            on: {
              slideChangeTransitionEnd: function () {
                this.update(); // Update Swiper to re-calculate the slides
                this.wrapperEl.style.transition = "transform .3s ease-out";
              },
            },
          };

          // Initialize Swiper
          const swiper = new Swiper(
            swiperContainer.find(".swiper")[0],
            swiperOptions
          );

          // On hover, stop autoplay
          swiperContainer.mouseenter(function () {
            swiper.autoplay.stop();
          });

          swiperContainer.mouseleave(function () {
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
  // Tell the observer which element(s) to track
).observe(document.querySelector(".provider-reviews_slider"));

function postnomReorder() {
  $(".postnominals-list").each(function () {
    // Reorder postnominal labels
    var wrapper = $(this);
    var items = wrapper.find(".w-dyn-item");

    items.sort(function (a, b) {
      var textA = $(a).find("div.postnominal-templ").text().trim();
      var textB = $(b).find("div.postnominal-templ").text().trim();

      // Priority 1: 'MS', 'MA', 'MPH', 'MEd'
      var priority1 = ["MS", "MA", "MPH", "MEd", "MDA"];
      if (priority1.includes(textA)) {
        return -1;
      } else if (priority1.includes(textB)) {
        return 1;
      }

      // Priority 2: 'RD'
      var priority2 = ["RD"];
      if (priority2.includes(textA)) {
        return -1;
      } else if (priority2.includes(textB)) {
        return 1;
      }

      // Priority 3: 'RDN'
      var priority3 = ["RDN"];
      if (priority3.includes(textA)) {
        return -1;
      } else if (priority3.includes(textB)) {
        return 1;
      }

      // Priority 4: 'LD'
      var priority4 = ["LD"];
      if (priority4.includes(textA)) {
        return -1;
      } else if (priority4.includes(textB)) {
        return 1;
      }

      // Priority 5: 'LDN'
      var priority5 = ["LDN"];
      if (priority5.includes(textA)) {
        return -1;
      } else if (priority5.includes(textB)) {
        return 1;
      }

      // Priority 6: Sort all other titles alphabetically
      return textA.localeCompare(textB);
    });

    // Reorder the elements
    wrapper.append(items);
  });
}

function showMoreTags() {
  var showMoreAdded = false;
  var specialtyDiv = $(".provider-specialty-tags_cms-list");
  var specialtyChildren = specialtyDiv.children();
  if ($(window).width() > 768) {
    if (specialtyChildren.length > 8) {
      specialtyChildren.slice(8).hide();

      var hiddenCount = specialtyChildren.length - 8;
      var showMoreText = $(
        '<span class="provider-list_specialty show-more">+ ' +
          hiddenCount +
          " more specialties</span>"
      );

      showMoreText.on("click", function () {
        specialtyChildren.slice(8).show();
        $(this).hide();
      });

      specialtyDiv.append(showMoreText);
      showMoreAdded = true; // Set flag to true once added
    }
  } else if ($(window).width() < 768) {
    if (!showMoreAdded) {
      if (specialtyChildren.length > 4) {
        specialtyChildren.slice(4).hide();

        var hiddenCount = specialtyChildren.length - 4;
        var showMoreText = $(
          '<span class="provider-list_specialty show-more">+ ' +
            hiddenCount +
            " more specialties</span>"
        );

        showMoreText.on("click", function () {
          specialtyChildren.slice(4).show();
          $(this).hide();
        });

        specialtyDiv.append(showMoreText);
        showMoreAdded = true; // Set flag to true once added
      }
    }
  }
}
