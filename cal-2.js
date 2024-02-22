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
        '<span class="provider-list_tag show-more">+ ' +
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

function disableCal() {
  $(".calendar_time-wrap").hide();
  $(".calendar_noavail-wrap").show();
  $(".fc-day").addClass("unavail");
  // Disable click event listeners for calendar next/prev
  $("#next, #prev").off("click");

  $("#get-touch-cta").css("opacity", 1);

  $(".fc-toolbar-title").html($(".fc-toolbar-title").text());

  // Update #find-provider-link with UTM parameters
  const baseLink =
    "https://join.usenourish.com/flow/get-started/variant/main_survey_direct_booking_ex1";
  const utmParams = new URLSearchParams(window.location.search);
  let utmString = "";
  for (const [key, value] of utmParams.entries()) {
    utmString += `${utmString ? "&" : "?"}${key}=${value}`;
  }
  const updatedLink = baseLink + utmString;
  $("#find-provider-link").attr("href", updatedLink);
}

function convertLocalToUTC(datetimeStr) {
  var formatTime = replaceSpaceWithT(datetimeStr);
  return moment.utc(new Date(formatTime)).format("YYYY-MM-DDTHH:mm:ss.sss");
}

function replaceSpaceWithT(datetimeStr) {
  var datetimeParts = datetimeStr.split(" ");
  var date = datetimeParts[0];
  var time = datetimeParts[1];
  return date + "T" + time;
}

function formatTimeToISO8601(timeStr) {
  var formattedTime = moment(timeStr, "YYYY-MM-DD HH:mm:ss Z").toISOString();
  return formattedTime;
}

function setAptLink(time) {
  $("#confirm-apt").removeClass("disable");
  var utmSourceFromSession = sessionStorage.getItem("utm_source");
  var UTCTime = convertLocalToUTC(time) + "Z";

  var url =
    "https://signup.usenourish.com/flow/get-started/variant/main_survey_direct_booking_ex1";

  // Get the current URL's query parameters
  var params = new URLSearchParams(window.location.search);

  // Get the referralSource and referralName parameters
  var referralSource = params.get("referralSource");
  var referralName = params.get("referralName");

  // Add checks for each variable
  if (utmSourceFromSession) {
    url += "?utm_source=" + utmSourceFromSession;
  }

  if (referralSource) {
    url +=
      (url.includes("?") ? "&" : "?") +
      "referralSource=" +
      encodeURIComponent(referralSource);
  }

  if (referralName) {
    url +=
      (url.includes("?") ? "&" : "?") +
      "referralName=" +
      encodeURIComponent(referralName);
  }

  if (fullname) {
    url +=
      (url.includes("?") ? "&" : "?") +
      "external_provided_appointment_details[provider_name]=" +
      fullname;
  }

  if (providerHealthId) {
    url +=
      (url.includes("?") ? "&" : "?") +
      "external_provided_appointment_details[provider_healthieId]=" +
      providerHealthId;
  }

  if (UTCTime) {
    url +=
      (url.includes("?") ? "&" : "?") +
      "external_provided_appointment_details[appointmentTime]=" +
      UTCTime;
    url += "&external_provided_appointment_details[displayString]=" + UTCTime;
  }

  if (timezone) {
    url +=
      (url.includes("?") ? "&" : "?") +
      "external_provided_appointment_details[appointmentTimeZone]=" +
      timezone;
  }
  $("#confirm-apt").attr("href", url);
}

function updateCTA() {
  var windowWidth = $(window).width();
  if (windowWidth >= 768) {
    $("#get-touch-cta").css({
      opacity: "0",
    });
  } else {
    var utmParameters = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "gclid",
      "fbclid",
    ];
    var URLSearchParams_wb = new URLSearchParams(window.location.search);
    var baseUrl = "https://signup.usenourish.com/flow/get-started";
    var utmString = "";

    utmParameters.forEach((param) => {
      if (URLSearchParams_wb.has(param)) {
        utmString += `${utmString ? "&" : "?"}${param}=${URLSearchParams_wb.get(
          param
        )}`;
      }
    });

    var finalUrl = baseUrl + utmString;
    $("#get-touch-cta")
      .text("Book your first appointment →")
      .attr("href", "#calendarSection");

    $("#get-touch-cta").css({
      opacity: "1",
      "pointer-events": "auto",
    });
  }
}

// Function to update the count of time tags for each day
function updateTimeTagCounts(providerAvailableTimes) {
  // Create a map to count available times for each date
  const dateCounts = providerAvailableTimes.reduce((acc, dateTime) => {
    const date = dateTime.split(" ")[0]; // Extract the date part
    acc[date] = (acc[date] || 0) + 1; // Increment the count for this date
    return acc;
  }, {});
  setTimeout(() => {
    // Update the time-tag-count for each date
    Object.keys(dateCounts).forEach((date) => {
      const count = dateCounts[date];
      // Find the header cell for the date and update the time-tag-count
      const headerCell = document.querySelector(
        `.fc-col-header-cell[data-date="${date}"]`
      );

      if (headerCell) {
        const timeTagCount = headerCell.querySelector(
          ".time-tag-count span.count"
        );
        if (timeTagCount) {
          timeTagCount.textContent = count; // Update the count
          if (count > 0) {
            headerCell.classList.add("available"); // Add class if count is greater than 0
          }
        }
      }
    });
  }, 0);
}

// Check to see if moment-timezone library is loaded
if (typeof moment.tz !== "undefined") {
  var timezone = moment.tz.guess();
  var currentDate = new Date();
  //currentDate.setDate(currentDate.getDate() + 2);
  var twoDaysOut = currentDate.toDateString();
  //currentDate.setDate(currentDate.getDate() + 19);
  var nineteenDaysOut = currentDate.toDateString();

  $("#timezone").text(timezone);
  var firstN = $(".calendar-custom").attr("FirstN");
  var lName = $(".calendar-custom").attr("LName");
  var fullname = firstN + " " + lName;
  var providerHealthId = "";
  var cmsItemID = $(".provider-grid-template").attr("itemID");
  var newBio =
    $(".provider-grid-template.new.w-condition-invisible").length === 0;
  $(document).ready(function () {
    if (cmsItemID && newBio) {
      var response = fetchData(
        true,
        timezone,
        twoDaysOut,
        nineteenDaysOut,
        true,
        cmsItemID
      );

      function fetchData(
        orgLevel,
        timezone,
        startDate,
        endDate,
        isInitialAppointment,
        providerCmsId
      ) {
        $.ajax({
          url: "https://x8ki-letl-twmt.n7.xano.io/api:dTgO8ZIh/providerschedules/1",
          method: "GET",
          data: {
            orgLevel: orgLevel,
            timezone: timezone,
            startDate: startDate,
            endDate: endDate,
            isInitialAppointment: isInitialAppointment,
            "providerCmsIds[0]": providerCmsId,
          },
          success: function (response) {
            var response = {
              availableDays: [
                "2024-03-14",
                "2024-03-15",
                "2024-03-16",
                "2024-03-19",
                "2024-03-20",
                "2024-03-21",
                "2024-03-22",
                "2024-03-23",
                "2024-03-26",
                "2024-03-27",
                "2024-03-28",
                "2024-03-29",
              ],
              availableTimes: [
                {
                  providerHealthieId: "3710628",
                  providerAvailableTimes: [
                    "2024-03-14 04:00:00 -0800",
                    "2024-03-14 05:00:00 -0800",
                    "2024-03-14 06:00:00 -0800",
                    "2024-03-14 07:00:00 -0800",
                    "2024-03-14 08:00:00 -0800",
                    "2024-03-14 09:00:00 -0800",
                    "2024-03-14 10:00:00 -0800",
                    "2024-03-14 11:00:00 -0800",
                    "2024-03-14 12:00:00 -0800",
                    "2024-03-14 13:00:00 -0800",
                    "2024-03-14 14:00:00 -0800",
                    "2024-03-15 04:00:00 -0800",
                    "2024-03-15 05:00:00 -0800",
                    "2024-03-15 06:00:00 -0800",
                    "2024-03-15 07:00:00 -0800",
                    "2024-03-15 08:00:00 -0800",
                    "2024-03-15 10:00:00 -0800",
                    "2024-03-15 11:00:00 -0800",
                    "2024-03-15 12:00:00 -0800",
                    "2024-03-15 13:00:00 -0800",
                    "2024-03-15 14:00:00 -0800",
                    "2024-03-15 15:00:00 -0800",
                    "2024-03-16 04:00:00 -0800",
                    "2024-03-16 06:00:00 -0800",
                    "2024-03-16 07:00:00 -0800",
                    "2024-03-16 08:00:00 -0800",
                    "2024-03-19 06:00:00 -0800",
                    "2024-03-19 07:00:00 -0800",
                    "2024-03-19 08:00:00 -0800",
                    "2024-03-19 09:00:00 -0800",
                    "2024-03-19 10:00:00 -0800",
                    "2024-03-19 11:00:00 -0800",
                    "2024-03-19 13:00:00 -0800",
                    "2024-03-19 14:00:00 -0800",
                    "2024-03-19 15:00:00 -0800",
                    "2024-03-20 04:00:00 -0800",
                    "2024-03-20 05:00:00 -0800",
                    "2024-03-20 07:00:00 -0800",
                    "2024-03-20 09:00:00 -0800",
                    "2024-03-20 10:00:00 -0800",
                    "2024-03-20 12:00:00 -0800",
                    "2024-03-20 13:00:00 -0800",
                    "2024-03-20 14:00:00 -0800",
                    "2024-03-20 15:00:00 -0800",
                    "2024-03-21 05:00:00 -0800",
                    "2024-03-21 06:00:00 -0800",
                    "2024-03-21 07:00:00 -0800",
                    "2024-03-21 08:00:00 -0800",
                    "2024-03-21 10:00:00 -0800",
                    "2024-03-21 11:00:00 -0800",
                    "2024-03-21 12:00:00 -0800",
                    "2024-03-21 13:00:00 -0800",
                    "2024-03-21 14:00:00 -0800",
                    "2024-03-21 15:00:00 -0800",
                    "2024-03-22 04:00:00 -0800",
                    "2024-03-22 05:00:00 -0800",
                    "2024-03-22 06:00:00 -0800",
                    "2024-03-22 07:00:00 -0800",
                    "2024-03-22 11:00:00 -0800",
                    "2024-03-22 13:00:00 -0800",
                    "2024-03-22 14:00:00 -0800",
                    "2024-03-23 05:00:00 -0800",
                    "2024-03-23 06:00:00 -0800",
                    "2024-03-26 05:00:00 -0800",
                    "2024-03-26 06:00:00 -0800",
                    "2024-03-26 07:00:00 -0800",
                    "2024-03-26 08:00:00 -0800",
                    "2024-03-26 09:00:00 -0800",
                    "2024-03-26 10:00:00 -0800",
                    "2024-03-26 11:00:00 -0800",
                    "2024-03-26 12:00:00 -0800",
                    "2024-03-26 13:00:00 -0800",
                    "2024-03-26 14:00:00 -0800",
                    "2024-03-26 15:00:00 -0800",
                    "2024-03-27 04:00:00 -0800",
                    "2024-03-27 05:00:00 -0800",
                    "2024-03-27 06:00:00 -0800",
                    "2024-03-27 07:00:00 -0800",
                    "2024-03-27 08:00:00 -0800",
                    "2024-03-27 09:00:00 -0800",
                    "2024-03-27 10:00:00 -0800",
                    "2024-03-27 11:00:00 -0800",
                    "2024-03-27 12:00:00 -0800",
                    "2024-03-27 13:00:00 -0800",
                    "2024-03-27 14:00:00 -0800",
                    "2024-03-27 15:00:00 -0800",
                    "2024-03-28 05:00:00 -0800",
                    "2024-03-28 06:00:00 -0800",
                    "2024-03-28 07:00:00 -0800",
                    "2024-03-28 08:00:00 -0800",
                    "2024-03-28 09:00:00 -0800",
                    "2024-03-29 04:00:00 -0800",
                    "2024-03-29 05:00:00 -0800",
                    "2024-03-29 06:00:00 -0800",
                    "2024-03-29 07:00:00 -0800",
                    "2024-03-29 08:00:00 -0800",
                    "2024-03-29 10:00:00 -0800",
                    "2024-03-29 11:00:00 -0800",
                    "2024-03-29 12:00:00 -0800",
                    "2024-03-29 13:00:00 -0800",
                    "2024-03-29 14:00:00 -0800",
                    "2024-03-29 15:00:00 -0800",
                  ],
                  providerName: "Amie Gross",
                },
              ],
            };
            if (response) {
              var availableTimes = [];
              if (
                response.availableTimes &&
                response.availableTimes.length > 0
              ) {
                availableTimes =
                  response.availableTimes[0]?.providerAvailableTimes || [];
              }

              // ---------- CALENDAR SETUP -----------
              var availableDays = response.availableDays;
              var calendarEl = $("#calendar")[0];
              var calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: "dayGridWeek",
                contentHeight: "auto",
                showNonCurrentDates: false,
                dayHeaderContent: function (arg) {
                  // SVG icon
                  const svgIcon = `
                    <svg width="14" height="12" viewBox="0 0 12 10" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M1.85156 5C1.85156 2.7571 3.67116 0.9375 5.91406 0.9375C8.15696 0.9375 9.97656 2.7571 9.97656 5C9.97656 7.2429 8.15696 9.0625 5.91406 9.0625C3.67116 9.0625 1.85156 7.2429 1.85156 5ZM5.91406 1.5625C4.01634 1.5625 2.47656 3.10228 2.47656 5C2.47656 6.89772 4.01634 8.4375 5.91406 8.4375C7.81179 8.4375 9.35156 6.89772 9.35156 5C9.35156 3.10228 7.81179 1.5625 5.91406 1.5625Z" fill="currentColor"/>
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M5.91406 2.1875C6.08665 2.1875 6.22656 2.32741 6.22656 2.5V5H7.78906C7.96165 5 8.10156 5.13991 8.10156 5.3125C8.10156 5.48509 7.96165 5.625 7.78906 5.625H5.91406C5.74147 5.625 5.60156 5.48509 5.60156 5.3125V2.5C5.60156 2.32741 5.74147 2.1875 5.91406 2.1875Z" fill="currentColor"/>
                    </svg>
                  `;
                  return {
                    html: `
                            <div class="day-name">${arg.date.toLocaleDateString(
                              "en-US",
                              { weekday: "short" }
                            )}</div>
                            <div class="day-number">${arg.date.getDate()}</div>
                            <div class="time-tag-count">${svgIcon} <span class="count">0</span></div>
                    `,
                  };
                },
                datesSet: function (info) {
                  updateTodayHighlight();
                  updateNavigationButtons(info);
                },
                // ... other options ...
              });

              calendar.render();

              // Add click event to calendar arrows
              $("#prev").on("click", function () {
                calendar.prev();
                handleCalendarNavigation("prev");
              });

              $("#next").on("click", function () {
                handleCalendarNavigation("next");
                calendar.next();
              });

              function updateTodayHighlight() {
                $(".fc-day").removeClass("fc-day-today");
                var $targetDay = $('.fc-day[data-date="' + currentDate + '"]');
                $targetDay.addClass("fc-day-today");
              }

              // Function to add the .available class to matching header cells
              function markAvailableDays() {
                setTimeout(function () {
                  response.availableDays.forEach(function (date) {
                    // Find the header cell with the matching data-date attribute
                    const headerCell = document.querySelector(
                      `th[data-date="${date}"]`
                    );
                    if (headerCell) {
                      // Add the .available class to the header cell
                      headerCell.classList.add("available");
                    }
                  });
                }, 0);
              }

              function handleCalendarNavigation(direction) {
                markAvailableDays();
                updateTimeTagCounts(
                  response.availableTimes
                    .map((time) => time.providerAvailableTimes)
                    .flat()
                );
                $("#confirm-apt").addClass("disable");
                $(".calendar_time-tag").removeClass("active");
              }
              // Function to update the state of navigation buttons
              function updateNavigationButtons(dateInfo) {
                // Get the first and last date from the current view
                const viewStart = dateInfo.startStr;
                const viewEnd = dateInfo.endStr;

                // Assuming availableDays is an array of date strings like ["2024-03-14", "2024-03-15", ...]
                const firstAvailableDay = availableDays[0];
                const lastAvailableDay =
                  availableDays[availableDays.length - 1];

                // Disable the prev button if the first available day is in the current view
                if (
                  viewStart <= firstAvailableDay &&
                  viewEnd > firstAvailableDay
                ) {
                  document.querySelector("#prev").classList.add("disabled");
                  $("#prev").off("click");
                } else {
                  // Attach the event handler for the #prev button
                  $("#prev")
                    .off("click")
                    .on("click", function () {
                      if (!$(this).hasClass("disabled")) {
                        calendar.prev();
                        handleCalendarNavigation("prev");
                      }
                    });
                  document.querySelector("#prev").classList.remove("disabled");
                }

                // Disable the next button if the last available day is in the current view
                if (
                  viewStart < lastAvailableDay &&
                  viewEnd >= lastAvailableDay
                ) {
                  document.querySelector("#next").classList.add("disabled");
                  $("#next").off("click");
                } else {
                  document.querySelector("#next").classList.remove("disabled");
                  $("#next")
                    .off("click")
                    .on("click", function () {
                      if (!$(this).hasClass("disabled")) {
                        calendar.next();
                        handleCalendarNavigation("next");
                      }
                    });
                }
              }

              // Set up the click event on the header cells using event delegation
              $(document).on("click", ".fc-col-header-cell", function () {
                var newDate = $(this).data("date");
                $("#confirm-apt").addClass("disable");
                currentDate = newDate;
                if (availableDays.includes(currentDate)) {
                  calendar.gotoDate(newDate);
                  $(".fc-day").removeClass("fc-day-today");
                  var $targetDay = $('.fc-day[data-date="' + newDate + '"]');
                  $targetDay.addClass("fc-day-today");

                  // Update title text of available date
                  var availableDate = calendar.getDate();
                  const options = {
                    month: "long",
                    day: "numeric",
                  };
                  const convertedTime = availableDate.toLocaleDateString(
                    "en-US",
                    options
                  );
                  $("#day-title").html(convertedTime);
                  $(".fc-toolbar-title").html($(".fc-toolbar-title").text());
                  // Add time tags based on available times
                  $(".calendar_tag-wrap").empty();

                  for (var i = 0; i < availableTimes.length; i++) {
                    var time = availableTimes[i];
                    var iso8601Time = formatTimeToISO8601(time);
                    var textTime = new Date(iso8601Time);
                    var formattedTime = textTime.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    // Check if the current item contains the firstAvailableDate
                    if (time.includes(newDate)) {
                      // Create a <div> element with the class '.calendar_time-tag' and the text of the current item
                      var timeDiv = $("<div>", {
                        class: "calendar_time-tag",
                        text: formattedTime,
                        "data-date": time,
                      });

                      // Append the timeDiv inside the '.calendar_tag-wrap' element
                      $(".calendar_tag-wrap").append(timeDiv);
                    }
                  }
                  // Add click event to time tags
                  setTimeout(function () {
                    $(".calendar_time-tag").on("click", function () {
                      // Remove .active class from all .calendar_time-tag items
                      $(".calendar_time-tag").removeClass("active");
                      // Add .active class to the clicked item
                      $(this).addClass("active");
                      var selectedTime = $(this).data("date");
                      setAptLink(selectedTime);
                    });
                  }, 0);
                }
              });
              // ---------- CALENDAR READY -----------
              // On first load, if provider has availability setup calendar
              if (availableDays.length > 0) {
                // Call this function to mark available days
                markAvailableDays();
                updateTimeTagCounts(
                  response.availableTimes
                    .map((time) => time.providerAvailableTimes)
                    .flat()
                );
                // Extract the first available start date from the array
                var firstAvailableDate = response.availableDays[0];
                var lastAvailableDate = response.availableDays.slice(-1)[0];

                providerHealthId =
                  response.availableTimes[0].providerHealthieId;

                $("#get-touch-cta").attr("href", "#calendarSection");

                function setCal(date) {
                  // Update CTA based on whether calendar is displayed
                  updateCTA();
                  $(window).on("resize", function () {
                    updateCTA();
                  });

                  var dateObj = new Date(date);
                  dateObj.setDate(dateObj.getDate() + 1);

                  // Update active day styles
                  setTimeout(function () {
                    $(".fc-day").removeClass("fc-day-today");
                    var $targetDay = $('.fc-day[data-date="' + date + '"]');
                    $targetDay.addClass("fc-day-today");
                    // Update title text of available date
                    const options = {
                      month: "long",
                      day: "numeric",
                    };
                    const convertedTime = dateObj.toLocaleDateString(
                      "en-US",
                      options
                    );
                    $("#day-title").html(convertedTime);

                    $(".fc-toolbar-title").html($(".fc-toolbar-title").text());
                    $(".fc-day").each(function () {
                      var dataDate = $(this).data("date");
                      if (availableDays.includes(dataDate)) {
                        $(this).find(".fc-daygrid-day-top").addClass("active");
                      } else {
                        $(this).unbind();
                      }
                    });
                  }, 0);
                }
                calendar.gotoDate(firstAvailableDate);
                currentDate = firstAvailableDate;
                setCal(currentDate);
                // Add time tags based on available times
                $(".calendar_tag-wrap").empty();

                for (var i = 0; i < availableTimes.length; i++) {
                  var time = availableTimes[i];
                  var iso8601Time = formatTimeToISO8601(time);
                  var textTime = new Date(iso8601Time);
                  var formattedTime = textTime.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  // Check if the current item contains the firstAvailableDate
                  if (time.includes(firstAvailableDate)) {
                    var timeDiv = $("<div>", {
                      class: "calendar_time-tag",
                      text: formattedTime,
                      "data-date": time,
                    });

                    $(".calendar_tag-wrap").append(timeDiv);
                  }
                }
                // Add click event to time tags
                setTimeout(function () {
                  $(".calendar_time-tag").on("click", function () {
                    $(".calendar_time-tag").removeClass("active");
                    $(this).addClass("active");
                    var selectedTime = $(this).data("date");
                    setAptLink(selectedTime);
                  });
                }, 0);
              } else {
                disableCal();
              }
            } else {
              disableCal();
            }
          },
          error: function (error) {
            console.error(error);
          },
        });
      }
    }
  });
} else {
  disableCal();
}
