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
  let linkText = currentLink.find(".menu_link-text");
  let linkTextOffset; // center of the link

  // Check if window's width is less than or equal to your breakpoint
  if (window.innerWidth <= 1400) {
    // change 1222 to your desired breakpoint
    linkTextOffset = linkText.offset().left + linkText.outerWidth() / 2; // center of the link
    linkTextOffset -= currentContent.outerWidth() / 2; // adjust the dropdown position
  } else {
    linkTextOffset = linkText.offset().left - 25; // original position
  }

  // Set the initial width of menuBG
  gsap.set(menuBG, {
    width: currentContent.outerWidth(),
    height: currentContent.outerHeight(),
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

  // Check if window's width is less than or equal to your breakpoint
  if (window.innerWidth <= 1440) {
    // change 1222 to your desired breakpoint
    linkTextOffset = linkText.offset().left + linkText.outerWidth() / 2; // center of the link
    linkTextOffset -= currentContent.outerWidth() / 2; // adjust the dropdown position
  } else {
    linkTextOffset = linkText.offset().left - 25; // original position
  }

  // invert moveDistance if needed
  let moveDistance = 10;
  if (currentContent.index() < previousContent.index()) {
    moveDistance = moveDistance * -1;
  }

  gsap.to(menuBG, {
    x: linkTextOffset,
    width: currentContent.outerWidth(),
    height: currentContent.outerHeight(),
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

  // Update the x transform of menuBG
  gsap.to(menuBG, {
    width: currentContent.outerWidth(),
    height: currentContent.outerHeight(),
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
    let linkTextOffset = linkText.offset().left + linkText.outerWidth() / 2; // center of the link
    let currentContent = content.eq(currentLink.index());

    // Check if window's width is less than or equal to your breakpoint
    if (window.innerWidth <= 1440) {
      // change 1222 to your desired breakpoint
      linkTextOffset = linkText.offset().left + linkText.outerWidth() / 2; // center of the link
      linkTextOffset -= currentContent.outerWidth() / 2; // adjust the dropdown position
    } else {
      linkTextOffset = linkText.offset().left - 25; // original position
    }

    gsap.killTweensOf(content);

    // Update the x transform of menuBG
    gsap.to(menuBG, {
      x: linkTextOffset,
      width: currentContent.outerWidth(),
      height: currentContent.outerHeight(),
      duration: 0.2,
    });
  },
  paused: true,
  onReverseComplete: () => {
    dropdownWrap.css("display", "none");
    menuLink.removeClass("active");
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
