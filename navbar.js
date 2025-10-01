let menuLink = $(".menu_dp-link");
let tabLink = $(".menu_dropdown-tab-item");
let content = $(".menu_dropdown_content");
let tabContent = $(".menu_tab-content-wrap");
let menuBG = $(".menu_bg");
let dropdownWrap = $(".menu_content");
gsap.defaults({
  duration: 0.2,
});

$(document).ready(function () {
  $(window).scroll(function () {
    if ($(this).scrollTop() > 0) {
      $(".nav_component-2").addClass("bottom-border");
    } else {
      $(".nav_component-2").removeClass("bottom-border");
    }
  });
  handleMobileNavDisplay();
  // Handle scroll event
  $(window).on("scroll", handleMobileNavDisplay);
  // Handle resize event
  $(window).on("resize", handleMobileNavDisplay);
});

function handleMobileNavDisplay() {
  if (window.innerWidth <= 1024) {
    if ($(window).scrollTop() > 0) {
      $(".button-12.mobile-nav").css("display", "block");
      setTimeout(() => {
        // Small timeout to ensure the block is rendered before animating
        $(".button-12.mobile-nav").css("opacity", "1");
      }, 10);
    } else {
      $(".button-12.mobile-nav").css("opacity", "0");
      setTimeout(() => {
        $(".button-12.mobile-nav").css("display", "none");
      }, 300); // This timeout should match the duration of your CSS transition
    }
  } else {
    // Optionally hide the button on larger screens
    $(".button-12.mobile-nav").css("display", "none");
  }
}

function revealDropdown(currentLink, currentContent) {
  dropdownWrap.css("display", "flex");

  // Prevent horizontal scrollbar during dropdown animation
  $("body").css("overflow-x", "hidden");

  let linkText = currentLink.find(".menu_link-text");
  let linkTextOffset; // center of the link

  // Get content dimensions
  const contentWidth = currentContent.outerWidth();
  const contentHeight = currentContent.outerHeight();
  const viewportWidth = window.innerWidth;
  const linkLeft = linkText.offset().left;
  const linkWidth = linkText.outerWidth();

  // Check if window's width is less than or equal to your breakpoint
  if (window.innerWidth <= 1400) {
    // Center the dropdown under the link
    linkTextOffset = linkLeft + linkWidth / 2 - contentWidth / 2;

    // Ensure dropdown doesn't go beyond viewport boundaries
    const minOffset = 10; // Minimum distance from left edge
    const maxOffset = viewportWidth - contentWidth - 10; // Minimum distance from right edge

    // Only constrain if the dropdown would go outside viewport
    if (linkTextOffset < minOffset) {
      linkTextOffset = minOffset;
    } else if (linkTextOffset > maxOffset) {
      linkTextOffset = maxOffset;
    }
  } else {
    linkTextOffset = linkLeft - 25; // original position

    // Ensure dropdown doesn't go beyond viewport boundaries
    const minOffset = 10;
    const maxOffset = viewportWidth - contentWidth - 10;

    // Only constrain if the dropdown would go outside viewport
    if (linkTextOffset < minOffset) {
      linkTextOffset = minOffset;
    } else if (linkTextOffset > maxOffset) {
      linkTextOffset = maxOffset;
    }
  }

  // Set the initial width of menuBG with constrained dimensions
  gsap.set(menuBG, {
    width: Math.min(contentWidth, viewportWidth - 20), // Ensure it doesn't exceed viewport
    height: contentHeight,
    x: linkTextOffset,
  });

  // Update the x transform of menuBG
  gsap.to(menuBG, {
    x: linkTextOffset,
  });

  gsap.set(currentContent, {
    opacity: 0,
    display: "none",
  });
  gsap.set(currentContent, {
    opacity: 1,
    x: "0em",
    display: "flex",
  });
}

function switchDropdown(currentLink, previousContent, currentContent) {
  let linkText = currentLink.find(".menu_link-text");
  let linkTextOffset;

  // Get content dimensions and viewport info
  const contentWidth = currentContent.outerWidth();
  const contentHeight = currentContent.outerHeight();
  const viewportWidth = window.innerWidth;
  const linkLeft = linkText.offset().left;
  const linkWidth = linkText.outerWidth();

  // Check if window's width is less than or equal to your breakpoint
  if (window.innerWidth <= 1440) {
    // Center the dropdown under the link
    linkTextOffset = linkLeft + linkWidth / 2 - contentWidth / 2;

    // Ensure dropdown doesn't go beyond viewport boundaries
    const minOffset = 10;
    const maxOffset = viewportWidth - contentWidth - 10;

    // Only constrain if the dropdown would go outside viewport
    if (linkTextOffset < minOffset) {
      linkTextOffset = minOffset;
    } else if (linkTextOffset > maxOffset) {
      linkTextOffset = maxOffset;
    }
  } else {
    linkTextOffset = linkLeft - 25; // original position

    // Ensure dropdown doesn't go beyond viewport boundaries
    const minOffset = 10;
    const maxOffset = viewportWidth - contentWidth - 10;

    // Only constrain if the dropdown would go outside viewport
    if (linkTextOffset < minOffset) {
      linkTextOffset = minOffset;
    } else if (linkTextOffset > maxOffset) {
      linkTextOffset = maxOffset;
    }
  }

  // invert moveDistance if needed
  let moveDistance = 10;
  if (currentContent.index() < previousContent.index()) {
    moveDistance = moveDistance * -1;
  }

  gsap.to(menuBG, {
    x: linkTextOffset,
    width: Math.min(contentWidth, viewportWidth - 20), // Ensure it doesn't exceed viewport
    height: contentHeight,
    duration: 0.2,
  });

  gsap.fromTo(
    previousContent,
    { opacity: 1, x: "0em", display: "flex" },
    {
      opacity: 0,
      x: moveDistance * -1 + "em",
      duration: 0.2,
      display: "none",
      onComplete: function () {
        previousContent.removeClass("active");
        gsap.set(previousContent, { display: "none" });
      },
    }
  );

  gsap.fromTo(
    currentContent,
    { opacity: 0, x: moveDistance + "em", display: "none" },
    {
      opacity: 1,
      x: "0em",
      duration: 0.2,
      display: "flex",
      onComplete: function () {
        // Update the width of menuBG after the animation has completed
        gsap.to(menuBG, {
          width: currentContent.outerWidth(),
          duration: 0.2,
        });
      },
    }
  );
}

let isFirstReveal = true; // Add this variable to keep track of the first reveal

menuLink.on("mouseenter", function () {
  let previousLink = menuLink.filter(".active").removeClass("active");
  let currentLink = $(this).addClass("active");
  let previousContent = content.filter(".active").removeClass("active");
  let currentContent = content.eq($(this).index()).addClass("active");
  let relatedCaret = $(this).find(".menu_dropdown-caret");

  gsap.killTweensOf(content);

  gsap.to(relatedCaret, { rotation: 180, duration: 0 });
  // Set the display property of all dropdown content to "none"
  gsap.set(content, { display: "none" });
  // Set the display property of the currentContent to "flex"
  gsap.set(currentContent, { display: "flex" });

  // Update the x transform of menuBG with viewport constraints
  const contentWidth = currentContent.outerWidth();
  const contentHeight = currentContent.outerHeight();
  const viewportWidth = window.innerWidth;

  gsap.to(menuBG, {
    width: Math.min(contentWidth, viewportWidth - 20), // Ensure it doesn't exceed viewport
    height: contentHeight,
    duration: 0.2,
  });

  showDropdown.play();

  if (previousLink.length === 0) {
    revealDropdown(currentLink, currentContent);
  } else if (previousLink.index() !== currentLink.index()) {
    switchDropdown(currentLink, previousContent, currentContent);
  }
});

menuLink.on("mouseleave", function () {
  let currentLink = $(this);
  let currentContent = content.eq(currentLink.index()).removeClass("active");

  // Check if the dropdown content is being hovered over
  if (!dropdownWrap.is(":hover")) {
    gsap.killTweensOf(content);
    // Set the display property of the previousContent to "none"
    gsap.set(currentContent, { display: "none" });
    showDropdown.reverse();
    gsap.to(".menu_dropdown-caret", { rotation: 0, duration: 0 });
    menuLink.removeClass("active");
  }
});

// Open dropdown animation
let showDropdown = gsap.timeline({
  onStart: function () {
    let currentLink = menuLink.filter(".active");
    let linkText = currentLink.find(".menu_link-text");
    let currentContent = content.eq(currentLink.index());

    // Get dimensions and viewport info
    const contentWidth = currentContent.outerWidth();
    const contentHeight = currentContent.outerHeight();
    const viewportWidth = window.innerWidth;
    const linkLeft = linkText.offset().left;
    const linkWidth = linkText.outerWidth();
    let linkTextOffset;

    // Check if window's width is less than or equal to your breakpoint
    if (window.innerWidth <= 1440) {
      // Center the dropdown under the link
      linkTextOffset = linkLeft + linkWidth / 2 - contentWidth / 2;

      // Ensure dropdown doesn't go beyond viewport boundaries
      const minOffset = 10;
      const maxOffset = viewportWidth - contentWidth - 10;

      // Only constrain if the dropdown would go outside viewport
      if (linkTextOffset < minOffset) {
        linkTextOffset = minOffset;
      } else if (linkTextOffset > maxOffset) {
        linkTextOffset = maxOffset;
      }
    } else {
      linkTextOffset = linkLeft - 25; // original position

      // Ensure dropdown doesn't go beyond viewport boundaries
      const minOffset = 10;
      const maxOffset = viewportWidth - contentWidth - 10;

      // Only constrain if the dropdown would go outside viewport
      if (linkTextOffset < minOffset) {
        linkTextOffset = minOffset;
      } else if (linkTextOffset > maxOffset) {
        linkTextOffset = maxOffset;
      }
    }

    gsap.killTweensOf(content);

    // Update the x transform of menuBG with viewport constraints
    gsap.to(menuBG, {
      x: linkTextOffset,
      width: Math.min(contentWidth, viewportWidth - 20), // Ensure it doesn't exceed viewport
      height: contentHeight,
      duration: 0.2,
    });
  },
  paused: true,
  onReverseComplete: () => {
    dropdownWrap.css("display", "none");
    menuLink.removeClass("active");
    // Restore normal overflow when dropdown closes
    $("body").css("overflow-x", "");
  },
});
showDropdown.from(dropdownWrap, { opacity: 0, rotateX: -10, duration: 0.2 });

// Menu Hover Out
dropdownWrap.on("mouseleave", function () {
  gsap.killTweensOf(content);
  showDropdown.reverse();
  gsap.to(".menu_dropdown-caret", { rotation: 0, duration: 0 }); // rotate the caret back
});

function revealTab(currentLink, currentContent) {
  dropdownWrap.css("display", "flex");

  gsap.set(tabContent, {
    opacity: 0,
  });
  gsap.set(currentContent, {
    opacity: 1,
    y: "0em",
  });
}

function switchTab(currentLink, previousContent, currentContent) {
  // invert moveDistance if needed
  let moveDistance = 2;
  if (currentContent.index() < previousContent.index()) {
    moveDistance = moveDistance * -1;
  }

  gsap.fromTo(
    previousContent,
    { opacity: 1, y: "0em" },
    {
      opacity: 0,
      y: moveDistance * -1 + "em",
      duration: 0.2,
    }
  );
  gsap.fromTo(
    currentContent,
    { opacity: 0, y: moveDistance + "em" },
    {
      opacity: 1,
      y: "0em",
      duration: 0.2,
    }
  );
}

// Open tab animation
let showTab = gsap.timeline({
  paused: true,
  onReverseComplete: () => {
    dropdownWrap.css("display", "none");
    tabLink.removeClass("active");
  },
});
showTab.from(dropdownWrap, { opacity: 0, rotateX: -10, duration: 0.2 });

// Tab Hover Out
$(".menu_dropdown-tab-wrap").on("mouseleave", function () {
  showTab.reverse();
});

// Tab Link Hover In
tabLink.on("mouseenter", function () {
  // get elements
  let previousLink = tabLink.filter(".active").removeClass("active");
  let currentLink = $(this).addClass("active");
  let previousContent = tabContent.filter(".active").removeClass("active");
  let currentContent = tabContent.eq($(this).index()).addClass("active");
  // play animations
  if (previousLink.length === 0) {
    revealTab(currentLink, currentContent);
  } else if (previousLink.index() !== currentLink.index()) {
    switchTab(currentLink, previousContent, currentContent);
  }
});

// Mobile Menu

// Open mobile menu
$(".w-nav-button").on("click", function () {
  setTimeout(function () {
    if ($(".w-nav-overlay").is(":visible")) {
      // Add the 'modal-open' class to the body element
      $("body").addClass("menu-open");
      // Add the 'container-scroll' class to the specific container
      $(".nav_mobile-menu").addClass("container-scroll");
    } else {
      // Reverse the actions
      $("body").removeClass("menu-open");
      $(".nav_mobile-menu").removeClass("container-scroll");
    }
  }, 500);
});

function animateMenu(clickClass, animateClass) {
  $(clickClass).on("click", function () {
    // Toggle the 'active' class
    $(animateClass).toggleClass("active");
    $(".logo").hide();
    $(".nav_back-link").css("display", "flex");

    // Use GSAP to animate the menus
    gsap.to(".nav_mobile-main", {
      x: "-100%",
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.fromTo(
      animateClass,
      { x: "100%" },
      { x: "0%", duration: 0.4, ease: "power2.out" }
    );
  });

  $(".nav_container-2").on("click", function (event) {
    // Check if the mobile menu is open
    if ($(".w-nav-overlay").css("display") === "block") {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Back link click
  $(".nav_back-link, .toggle-menu-2").on("click", function (event) {
    $("[class^='nav_mobile-']").removeClass("active");
    // Prevent the default action from closing menu
    event.preventDefault();
    event.stopPropagation();
    // Toggle the 'active' class
    //$(animateClass).toggleClass("active");
    $(".logo").show();
    $(".nav_back-link").hide();

    // Use GSAP to animate the menus
    gsap.to(".nav_mobile-main", {
      x: "0%",
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(animateClass, {
      x: "100%",
      duration: 0.4,
      ease: "power2.out",
    });
  });
}

animateMenu(".nav_link-2.resources", ".nav_mobile-resources");
