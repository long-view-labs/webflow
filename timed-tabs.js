//----- Auto Tabs -----
$(function () {
  // Set duration of tab cycle in milliseconds
  let tabDuration = 8000;
  // Function to update content pane based on the active tab
  function updateContentPane(trigger) {
    // Remove active class from all content panes
    $(".auto-tabs_pane-desktop").removeClass("w--tab-active");
    // Get the index of the active tab
    let tabIndex = $(".auto-tabs_tab").index(trigger);

    // Add the active class to the content pane with the same index
    let activePane = $(".auto-tabs_pane-desktop").eq(tabIndex);
    activePane.addClass("w--tab-active");
  }

  // Starts the tab cycle
  let tabTimeout;
  clearTimeout(tabTimeout);
  tabLoop($(".auto-tabs_tab.w--current"));

  // Define cycle through all tabs
  function tabLoop(trigger) {
    // If pause btn is set to playing, loop to next tab
    if ($(".auto-tabs_pause-btn").attr("auto-tabs") == "playing") {
      // Reset all timer bars and animate the current one for tabDuration
      $(".auto-tabs_timer-bar").stop(true, true).css("width", "0%");
      trigger
        .find(".auto-tabs_timer-bar")
        .animate({ width: "100%" }, tabDuration);

      // Reset rotation for all tab arrows
      $(".tab-arrow").css("transform", "rotate(0deg)");
      // Reset top padding for all tab titles
      $(".tab-button-title").css("padding-top", "0px");

      // Hide the description for all tabs
      $(".auto-tabs_description, .auto-tabs_timer-wrap").css({
        display: "none",
        opacity: 0,
        bottom: "-10px",
      });

      $(".auto-tabs_tab").css({
        "border-top": "1px solid #e5dfd9",
      });
      // Show the description for the current tab
      trigger
        .find(".auto-tabs_description, .auto-tabs_timer-wrap")
        .css("display", "block")
        .animate(
          {
            opacity: 1,
            bottom: "0px",
          },
          500
        );

      trigger
        .find(".tab-button-title")
        .css("padding-top", "0px") // Starting from 0px
        .animate(
          {
            "padding-top": "8px", // Ending at 8px
          },
          {
            duration: 200, // Animation time in milliseconds
          }
        );
      // Rotate the arrow of the current tab
      trigger.find(".tab-arrow").css("transform", "rotate(180deg)");
      trigger.css("border-top", "none");

      // Update the content pane based on the active tab
      updateContentPane(trigger);

      // Loop to next/first tab after tabDuration
      tabTimeout = setTimeout(function () {
        let $next = trigger.next();

        if ($next.length) {
          tabLoop($next);
        } else {
          tabLoop($(".auto-tabs_tab:first"));
        }
      }, tabDuration);
    }
  }

  // Reset timeout if a tab is clicked
  $(".auto-tabs_tab").click(function (event) {
    if (event.originalEvent) {
      clearTimeout(tabTimeout);
      tabLoop($(this));
    }
  });

  // Pause/play timeout every other click
  $(".auto-tabs_pause-btn").click(function () {
    let clicks = $(this).data("clicks");
    if (clicks) {
      $(".auto-tabs_pause-btn").attr("auto-tabs", "playing");
      tabLoop($(".auto-tabs_tab.w--current"));
    } else {
      clearTimeout(tabTimeout);
      $(".auto-tabs_pause-btn").attr("auto-tabs", "paused");
      $(".auto-tabs_timer-bar").stop(true, true).css("width", "0%");
    }
    $(this).data("clicks", !clicks);
  });
});

// Handling timed link clicks
$(".timed-link").click(function () {
  var linkValue = $(this).attr("link");
  window.location.href = linkValue;
});
