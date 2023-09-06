$(document).ready(function () {
  setTimeout(function () {
    setupTimes();
  }, 1500);
  setTimeout(function () {
    showMoreTags();
    postnomReorder();
  }, 2000);
});

function disableCal(currentElement) {
  currentElement.find(".blog-providers_time").hide();
  currentElement.find(".calendar_noavail-wrap").show();
  $("#get-touch-cta").css("opacity", 1);
}

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
  $(".blog-providers_item").each(function () {
    // Delete any existing elements with class 'show-more'
    $(this).find(".show-more").remove();
    var specialtyDiv = $(this).find(
      ".provider-specialty-tags_cms-list.w-dyn-items"
    );
    var specialtyChildren = specialtyDiv.children();
    if (specialtyChildren.length > 3) {
      specialtyChildren.slice(3).hide();

      var hiddenCount = specialtyChildren.length - 3;
      var showMoreText = $(
        '<span class="provider-list_specialty show-more blog">+ ' +
          hiddenCount +
          " more specialties</span>"
      );

      showMoreText.on("click", function () {
        specialtyChildren.slice(3).show();
        $(this).hide();
      });

      specialtyDiv.append(showMoreText);
    }
  });
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

function updateCTA() {
  var windowWidth = $(window).width();
  if (windowWidth >= 768) {
    $("#get-touch-cta").css({
      opacity: "0",
      "pointer-events": "none",
    });
  } else {
    $("#get-touch-cta")
      .attr("href", "#calendarSection")
      .text("Book your first appointment →");

    $("#get-touch-cta").css({
      opacity: "1",
      "pointer-events": "auto",
    });
  }
}

function setupTimes() {
  // Check to see if moment-timezone library is loaded
  if (typeof moment.tz !== "undefined") {
    var timezone = moment.tz.guess();
    var currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 2);
    var twoDaysOut = currentDate.toDateString();
    currentDate.setDate(currentDate.getDate() + 19);
    var nineteenDaysOut = currentDate.toDateString();
    // for each item with class .blog-content_providers-item, setup .calendar_tag-wrap and .calendar_time-tag-blog
    $(".blog-providers_item").each(function () {
      var $currentElement = $(this);
      var firstN = $(this).attr("FirstN");
      var lName = $(this).attr("LName");
      var fullname = firstN + " " + lName;
      var providerHealthId = "";
      var cmsItemID = $(this).attr("itemID");
      $currentElement.find(".timezone").text(timezone);

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
            if (response.availableTimes[0]) {
              // Extract the first available start date from the array
              var firstAvailableDate = response.availableDays[0];
              var lastAvailableDate = response.availableDays.slice(-1)[0];

              providerHealthId = response.availableTimes[0].providerHealthieId;
              var availableTimes =
                response.availableTimes[0]?.providerAvailableTimes || [];
              var availableDays = response.availableDays || [];
              // Add time tags based on available times
              if (!availableTimes.length) {
                disableCal($currentElement);
              }
              for (var i = 0; i < availableTimes.length; i++) {
                var time = availableTimes[i];
                var iso8601Time = formatTimeToISO8601(time);
                var textTime = new Date(iso8601Time);
                var formattedTime = textTime.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });
                // Check if the current item contains the firstAvailableDate
                // Create a <div> element with the class '.calendar_time-tag-blog' and the text of the current item
                var timeDiv = $("<div>", {
                  class: "calendar_time-tag-blog",
                  text: formattedTime,
                  "data-date": time,
                });
                // Append the timeDiv inside the '.calendar_tag-wrap' element
                $currentElement
                  .find(".blog-providers_tag-wrap")
                  .append(timeDiv);
              }
              // Add click event to time tags
              setTimeout(function () {
                $currentElement
                  .find(".calendar_time-tag-blog")
                  .on("click", function () {
                    // Remove .active class from all .calendar_time-tag-blog items
                    $currentElement
                      .find(".calendar_time-tag-blog")
                      .removeClass("active");
                    // Add .active class to the clicked item
                    $(this).addClass("active");
                    var selectedTime = $(this).data("date");
                    setAptLink(selectedTime);
                  });
              }, 0);

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
                  $currentElement
                    .find(".day-title")
                    .html(firstBold(convertedTime));

                  $currentElement
                    .find(".fc-toolbar-title")
                    .html(
                      firstBold(
                        $currentElement.find(".fc-toolbar-title").text()
                      )
                    );
                }, 0);
              }

              function setAptLink(time) {
                $currentElement.find(".confirm-apt").removeClass("disable");

                var UTCTime = convertLocalToUTC(time) + "Z";
                var url =
                  "https://signup.usenourish.com/flow/get-started/variant/main_survey_direct_booking_ex1";
                url +=
                  "?utm_medium=blog&utm_campaign=direct-booking&utm_source=SEO";
                url +=
                  "&external_provided_appointment_details[provider_name]=" +
                  fullname;
                url +=
                  "&external_provided_appointment_details[provider_healthieId]=" +
                  providerHealthId;
                url +=
                  "&external_provided_appointment_details[appointmentTime]=" +
                  UTCTime;
                url +=
                  "&external_provided_appointment_details[displayString]=" +
                  UTCTime;
                url +=
                  "&external_provided_appointment_details[appointmentTimeZone]=" +
                  timezone;

                $currentElement.find(".confirm-apt").attr("href", url);
              }

              // On first load, if provider has availability setup calendar
              if (availableDays.length > 0) {
                currentDate = firstAvailableDate;
                setCal(firstAvailableDate);
                // Add time tags based on available times
                $currentElement.find(".blog-providers_tag-wrap").empty();

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
                    // Create a <div> element with the class '.calendar_time-tag-blog' and the text of the current item
                    var timeDiv = $("<div>", {
                      class: "calendar_time-tag-blog",
                      text: formattedTime,
                      "data-date": time,
                    });

                    // Append the timeDiv inside the '.blog-providers_tag-wrap' element
                    $currentElement
                      .find(".blog-providers_tag-wrap")
                      .append(timeDiv);
                  }
                }
                // Add click event to time tags
                setTimeout(function () {
                  $currentElement
                    .find(".calendar_time-tag-blog")
                    .on("click", function () {
                      // Remove .active class from all .calendar_time-tag-blog items
                      $currentElement
                        .find(".calendar_time-tag-blog")
                        .removeClass("active");
                      // Add .active class to the clicked item
                      $(this).addClass("active");
                      var selectedTime = $(this).data("date");
                      setAptLink(selectedTime);
                    });
                }, 0);
              } else {
              }
            } else {
              disableCal();
            }
          },
          error: function (error) {
            // Handle any errors that occurred during the API call
            console.error(error);
          },
        });
      }
    });
  } else {
    disableCal();
  }
}
