// On initial page load
$(document).ready(function () {
  postnomReorder();
  showMoreTags();
  if (typeof reviewSlider !== "undefined") {
    reviewSlider();
  }
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

function disableCal() {
  $(".calendar_time-wrap").hide();
  $(".calendar_noavail-wrap").show();
  $(".fc-day").addClass("unavail");
  // Disable click event listeners for calendar next/prev
  $("#next, #prev").off("click");

  $("#get-touch-cta").css({
    opacity: "1",
    "pointer-events": "auto",
  });
  $(".fc-toolbar-title").html(firstBold($(".fc-toolbar-title").text()));

  // Update #find-provider-link with UTM parameters
  const baseLink =
    "https://join.usenourish.com/flow/get-started/variant/main_survey_direct_booking_ex1";
  const utmParams = new URLSearchParams(window.location.search);
  let utmString = "";
  for (const [key, value] of Object.entries(utmParams)) {
    utmString += `${utmString ? "&" : "?"}${key}=${value}`;
  }
  const updatedLink = baseLink + "?" + utmParams;
  $("#find-provider-link").attr("href", updatedLink);
}

function firstBold(select) {
  var divContent = select;
  var firstWord = divContent.split(" ")[0];
  var modifiedContent = divContent.replace(
    firstWord,
    "<strong>" + firstWord + "</strong>"
  );
  return modifiedContent;
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

function updateCTA(availableDays) {
  var windowWidth = $(window).width();
  if (windowWidth >= 768) {
    $("#get-touch-cta").css({
      opacity: "0",
      "pointer-events": "none",
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

    $("#get-touch-cta").css({
      opacity: "1",
      "pointer-events": "auto",
    });

    if (availableDays.length > 0) {
      $("#get-touch-cta")
        .attr("href", "#calendarSection")
        .text("Book your first appointment →");
    } else {
      $("#get-touch-cta").attr("href", finalUrl);
    }
  }
}

// Check to see if moment-timezone library is loaded
if (typeof moment.tz !== "undefined") {
  var timezone = moment.tz.guess();
  var currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 2);
  var twoDaysOut = currentDate.toDateString();
  currentDate.setDate(currentDate.getDate() + 19);
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
          url: "https://app.usenourish.com/api/scheduling/cms/provider-availability",
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
                showNonCurrentDates: false,
                dateClick: function (info) {
                  var newDate = info.dateStr;
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
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    };
                    const convertedTime = availableDate.toLocaleDateString(
                      "en-US",
                      options
                    );
                    $("#day-title").html(firstBold(convertedTime));
                    $(".fc-toolbar-title").html(
                      firstBold($(".fc-toolbar-title").text())
                    );
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
                },
              });
              calendar.render();

              // ---------- CALENDAR READY -----------
              // On first load, if provider has availability setup calendar
              if (availableDays.length > 0) {
                // Extract the first available start date from the array
                var firstAvailableDate = response.availableDays[0];
                var lastAvailableDate = response.availableDays.slice(-1)[0];

                providerHealthId =
                  response.availableTimes[0].providerHealthieId;

                function setCal(date) {
                  // Update CTA based on whether calendar is displayed
                  updateCTA(availableDays);
                  $(window).on("resize", function () {
                    updateCTA(availableDays);
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
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    };
                    const convertedTime = dateObj.toLocaleDateString(
                      "en-US",
                      options
                    );
                    $("#day-title").html(firstBold(convertedTime));

                    $(".fc-toolbar-title").html(
                      firstBold($(".fc-toolbar-title").text())
                    );
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
                setCal(firstAvailableDate);
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
                // Add click event to calendar arrows
                $("#prev").on("click", function () {
                  handleCalendarNavigation("prev");
                });

                $("#next").on("click", function () {
                  handleCalendarNavigation("next");
                });

                function handleCalendarNavigation(direction) {
                  $("#confirm-apt").addClass("disable");
                  $(".calendar_time-tag").removeClass("active");

                  var date1Month = parseInt(
                    firstAvailableDate.split("-")[1],
                    10
                  ); // Extract month from date1 and convert to integer
                  var date2Month = parseInt(
                    lastAvailableDate.split("-")[1],
                    10
                  ); // Extract month from date2 and convert to integer

                  var isSameMonth = date1Month === date2Month;

                  if (isSameMonth) {
                  } else {
                    $(".fc-toolbar-title").empty().html();
                    setCal(currentDate);
                    calendar[direction]();
                  }
                }
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
