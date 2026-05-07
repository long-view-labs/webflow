//----- Auto Tabs -----
$(function () {
  // Set duration of tab cycle in milliseconds
  let tabDuration = 8000;

  function getBackgroundImageUrls($element) {
    let backgroundImage = $element.css("background-image");

    if (!backgroundImage || backgroundImage === "none") {
      return [];
    }

    let urls = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/g);

    if (!urls) {
      return [];
    }

    return urls.map(function (urlValue) {
      return urlValue.replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
    });
  }

  function loadImageUrl(url) {
    if (!url) {
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      let image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = url;
    });
  }

  function imageReady(image) {
    let $image = $(image);
    let src = image.currentSrc || $image.attr("src") || $image.attr("data-src");
    let srcset = $image.attr("srcset") || $image.attr("data-srcset");

    if (src && !$image.attr("src")) {
      $image.attr("src", src);
    }

    if (srcset && !$image.attr("srcset")) {
      $image.attr("srcset", srcset);
    }

    $image.attr("loading", "eager");
    src = image.currentSrc || $image.attr("src");

    if (image.complete && image.naturalWidth) {
      if (image.decode) {
        return image.decode().catch(function () {});
      }

      return Promise.resolve();
    }

    if (!src && !srcset) {
      return Promise.resolve();
    }

    return new Promise(function (resolve) {
      let resolved = false;
      function done() {
        if (resolved) {
          return;
        }

        resolved = true;
        if (image.decode) {
          image.decode().catch(function () {}).then(resolve);
        } else {
          resolve();
        }
      }

      $image.one("load error", function () {
        done();
      });
      setTimeout(done, 2000);
    });
  }

  function paneReady($pane) {
    let imagePromises = $pane.find("img").map(function () {
      return imageReady(this);
    }).get();

    let backgroundPromises = [];
    $pane.find("*").addBack().each(function () {
      getBackgroundImageUrls($(this)).forEach(function (url) {
        backgroundPromises.push(loadImageUrl(url));
      });
    });

    return Promise.all(imagePromises.concat(backgroundPromises));
  }

  function getTimedTabsRoot(tab) {
    let $tab = $(tab);
    let $webflowTabs = $tab.closest(".w-tabs");
    let baseElement = $webflowTabs[0] || tab;

    if ($webflowTabs.find(".auto-tabs_pause-btn").length) {
      return baseElement;
    }

    let element = baseElement;
    while (element && element !== document.body) {
      let $candidate = $(element);

      if (
        $candidate.find(".auto-tabs_pause-btn").length === 1 &&
        $candidate.find(".auto-tabs_tab").length &&
        $candidate.find(".auto-tabs_pane-desktop").length
      ) {
        return element;
      }

      element = element.parentElement;
    }

    return baseElement;
  }

  function initializeTimedTabs($component) {
    let $tabs = $component.find(".auto-tabs_tab");
    let $panes = $component.find(".auto-tabs_pane-desktop");
    let $pauseBtn = $component.find(".auto-tabs_pause-btn").first();
    let paneUpdateId = 0;
    let tabTimeout;

    if (!$tabs.length || !$panes.length) {
      return;
    }

    $component.find(".auto-tabs.w-tabs").addBack(".auto-tabs.w-tabs").attr({
      "data-duration-in": "0",
      "data-duration-out": "0",
    });
    $panes.css({
      opacity: 1,
      transition: "none",
    });

    $panes.each(function () {
      paneReady($(this));
    });

    function setActiveTab(trigger) {
      let tabIndex = $tabs.index(trigger);

      $tabs
        .removeClass("w--current")
        .attr("aria-selected", "false")
        .attr("tabindex", "-1");
      trigger
        .addClass("w--current")
        .attr("aria-selected", "true")
        .removeAttr("tabindex");

      $panes.attr("aria-hidden", "true");
      $panes.eq(tabIndex).removeAttr("aria-hidden");
    }

    // Function to update content pane based on the active tab
    function updateContentPane(trigger) {
      // Get the index of the active tab
      let tabIndex = $tabs.index(trigger);
      // Add the active class to the content pane with the same index
      let activePane = $panes.eq(tabIndex);
      let updateId = ++paneUpdateId;

      if (!activePane.length) {
        return;
      }

      paneReady(activePane).then(function () {
        if (updateId !== paneUpdateId) {
          return;
        }

        // Remove active class after the next pane is ready to prevent first-view flashes.
        $panes.removeClass("w--tab-active");
        activePane
          .css({
            opacity: 1,
            transition: "none",
          })
          .addClass("w--tab-active");
      });
    }

    function isPlaying() {
      return !$pauseBtn.length || $pauseBtn.attr("auto-tabs") == "playing";
    }

    // Define cycle through all tabs
    function tabLoop(trigger) {
      if (!trigger.length) {
        trigger = $tabs.first();
      }

      setActiveTab(trigger);

      // Reset all timer bars and animate the current one for tabDuration
      $component.find(".auto-tabs_timer-bar").stop(true, true).css("width", "0%");

      if (isPlaying()) {
        trigger
          .find(".auto-tabs_timer-bar")
          .animate({ width: "100%" }, tabDuration);
      }

      // Reset rotation for all tab arrows
      $component.find(".tab-arrow").css("transform", "rotate(0deg)");
      // Reset top padding for all tab titles
      $component.find(".tab-button-title").css("padding-top", "0px");

      // Hide the description for all tabs
      $component.find(".auto-tabs_description, .auto-tabs_timer-wrap").css({
        display: "none",
        opacity: 0,
        bottom: "-10px",
      });

      $tabs.css({
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
      if (isPlaying()) {
        tabTimeout = setTimeout(function () {
          let currentIndex = $tabs.index(trigger);
          let $next = $tabs.eq(currentIndex + 1);

          if ($next.length) {
            tabLoop($next);
          } else {
            tabLoop($tabs.first());
          }
        }, tabDuration);
      }
    }

    // Starts the tab cycle
    clearTimeout(tabTimeout);
    tabLoop($tabs.filter(".w--current").first());

    // Prevent Webflow's native tab fade from flashing the pane before assets are ready.
    $tabs.each(function () {
      if (this.timedTabsClickHandler) {
        this.removeEventListener("click", this.timedTabsClickHandler, true);
      }

      this.timedTabsClickHandler = function (event) {
        if ($(event.target).closest(".timed-link").length) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        clearTimeout(tabTimeout);
        tabLoop($(this));
      };
      this.addEventListener("click", this.timedTabsClickHandler, true);
    });

    // Pause/play timeout every other click
    $pauseBtn.off("click.timedTabs").on("click.timedTabs", function () {
      let clicks = $(this).data("clicks");
      if (clicks) {
        $pauseBtn.attr("auto-tabs", "playing");
        tabLoop($tabs.filter(".w--current").first());
      } else {
        clearTimeout(tabTimeout);
        $pauseBtn.attr("auto-tabs", "paused");
        $component.find(".auto-tabs_timer-bar").stop(true, true).css("width", "0%");
      }
      $(this).data("clicks", !clicks);
    });
  }

  let initializedComponents = [];
  $(".auto-tabs_tab").each(function () {
    let component = getTimedTabsRoot(this);

    if (initializedComponents.indexOf(component) === -1) {
      initializedComponents.push(component);
      initializeTimedTabs($(component));
    }
  });
});

// Handling timed link clicks
$(".timed-link").click(function () {
  var linkValue = $(this).attr("link");
  window.location.href = linkValue;
});
