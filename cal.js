function disableCal() {
  $(".calendar_time-wrap").hide();
  $(".calendar_noavail-wrap").show();
  $(".fc-day").addClass("unavail");

  // Disable click event listeners for calendar next/prev
  $("#next, #prev").off("click");

  $("#get-touch-cta").css("opacity", 1);

  $(".fc-toolbar-title").html(firstBold($(".fc-toolbar-title").text()));
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
  // Retrieve utm_source from session storage
  var utmSourceFromSession = sessionStorage.getItem("utm_source");
  var UTCTime = convertLocalToUTC(time) + "Z";

  var url =
    "https://signup.usenourish.com/flow/get-started/variant/main_survey_direct_booking_ex1";

  // Add checks for each variable
  if (utmSourceFromSession) {
    url += "?utm_source=" + utmSourceFromSession;
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
            if (response.availableTimes[0]) {
              // Extract the first available start date from the array
              var firstAvailableDate = response.availableDays[0];
              var lastAvailableDate = response.availableDays.slice(-1)[0];

              providerHealthId = response.availableTimes[0].providerHealthieId;
              var availableTimes = [];

              if (
                response.availableTimes &&
                response.availableTimes.length > 0
              ) {
                availableTimes =
                  response.availableTimes[0]?.providerAvailableTimes || [];
              }

              $("#mobile-book-cta").attr("href", "#calendarSection");

              // CALENDAR OPTIONS
              // Setup Calendar after getting provider data
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

              // On first load, if provider has availability setup calendar
              if (availableDays.length > 0) {
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
                    calendar[direction](); // call method
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
            // Handle any errors that occurred during the API call
            console.error(error);
          },
        });
      }
    }
  });
} else {
  disableCal();
}
