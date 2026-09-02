// ============================================================================
// OUTCOMES PAGE FOOTER LOGIC (served from GitHub via jsDelivr, loaded defer)
// ----------------------------------------------------------------------------
// This file holds everything that used to be inline in the Outcomes page's
// Page Settings -> Footer custom code. The Webflow paste is now a one-tag
// stub (see outcomes-footer.html). Ship changes by tagging a release and
// bumping the version in the stub's script URL (same flow as home-footer.js).
//
// NOT in this file (handled globally, do not re-add here):
//   - Swiper/GSAP <script> tags — loaded by the global head (global-head.html)
//   - data-fade-in / data-slide-up / data-slide-up-group scroll reveals —
//     footer.js (global footer stub) runs initScrollReveals on every page.
//     A second unguarded copy here would double-animate.
//
// Contents:
//   1. Shared helpers (onReady, waitFor, dep checks)
//   2. Nav scroll state (blur, color swap, pills, cc-solid forced mode)
//   3. Conditions cards carousel (3-up desktop)
//   4. Quote carousel (1-up, loop) — desktop arrows + mobile pagination arrows
// ============================================================================

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

// Polls `test` until truthy, then runs `cb`. Resolves instantly when the
// dependency is already present (the normal case with defer).
function waitFor(test, cb, tries) {
  tries = tries == null ? 100 : tries; // 100 * 50ms = 5s ceiling
  if (test()) return cb();
  if (tries <= 0) {
    console.warn("[outcomes init] dependency never appeared:", test.toString());
    return;
  }
  setTimeout(function () {
    waitFor(test, cb, tries - 1);
  }, 50);
}

var hasGsap = function () {
  return window.gsap && window.ScrollTrigger;
};
var hasSwiper = function () {
  return typeof window.Swiper !== "undefined";
};

// ===== Nav: scroll state (blur, color swap, pills) =====
onReady(function () {
  waitFor(hasGsap, function () {
    gsap.registerPlugin(ScrollTrigger);

    var navEl = document.querySelector(".nav_container-2");
    if (!navEl || navEl.dataset.initNavScrollState) return;
    navEl.dataset.initNavScrollState = "true";

    var SCROLL_THRESHOLD = 50;

    // Start blur at 0 so it animates cleanly both directions
    gsap.set(".nav_container-2", {
      backdropFilter: "blur(0px)",
      webkitBackdropFilter: "blur(0px)",
    });

    // Scrolled-state timeline (paused, we play/reverse on scroll)
    var navTL = gsap.timeline({
      paused: true,
      defaults: { duration: 0.4, ease: "power2.out" },
    });
    navTL
      .to(
        ".nav_container-2",
        {
          backgroundColor: "rgba(254, 254, 254, 0.9)",
          backdropFilter: "blur(80px)",
          webkitBackdropFilter: "blur(80px)",
        },
        0,
      )
      .to(".logo-embed", { color: "#fe5000" }, 0)
      .to([".menu_link-text", ".menu_link-padding"], { color: "#151514" }, 0)
      .to(
        ".btn.alternate.is-round.cc-start",
        { borderColor: "#151514", color: "#151514" },
        0,
      )
      .to(".m-line-2.cc-white", { backgroundColor: "#000000" }, 0)
      .to(".m-line-2-2.cc-white", { backgroundColor: "#000000" }, 0)
      .to(".m-line-3-2.cc-white", { backgroundColor: "#000000" }, 0);

    // Pill targets: menu_link-padding elements, excluding any that are
    // (or sit directly next to) a .cc-dropdown
    var pillTargets = gsap.utils.toArray(".menu_link-padding").filter(function (el) {
      var selfIsDropdown = el.classList.contains("cc-dropdown");
      var siblingIsDropdown =
        (el.nextElementSibling &&
          el.nextElementSibling.classList.contains("cc-dropdown")) ||
        (el.previousElementSibling &&
          el.previousElementSibling.classList.contains("cc-dropdown"));
      return !selfIsDropdown && !siblingIsDropdown;
    });
    function addPill() {
      pillTargets.forEach(function (el) {
        el.classList.add("cc-pill");
      });
    }
    function removePill() {
      pillTargets.forEach(function (el) {
        el.classList.remove("cc-pill");
      });
    }

    // --- Forced-solid mode ---------------------------------------------------
    // If the nav is flagged .cc-solid (interior pages with light backgrounds
    // where the transparent nav would be invisible), lock it to the
    // scrolled/white state and skip all scroll wiring.
    if (navEl.classList.contains("cc-solid")) {
      navTL.progress(1).pause();
      removePill();
      return; // no ScrollTrigger, no toggling — nothing else to do
    }
    // -------------------------------------------------------------------------

    // Single source of truth. Idempotent: only acts when state changes.
    var navScrolled = false;
    function syncNav(animate) {
      var scrolled = window.scrollY > SCROLL_THRESHOLD;
      if (scrolled === navScrolled) return;
      navScrolled = scrolled;
      if (scrolled) {
        animate ? navTL.play() : navTL.progress(1).pause();
        removePill();
      } else {
        animate ? navTL.reverse() : navTL.progress(0).pause();
        addPill();
      }
    }

    // Initialize in the top/transparent state (matches head CSS, no flash).
    navTL.progress(0).pause();
    addPill();

    ScrollTrigger.create({
      start: SCROLL_THRESHOLD,
      end: "max",
      onEnter: function () {
        syncNav(true); // scrolled down past threshold
      },
      onLeaveBack: function () {
        syncNav(true); // scrolled back to the top
      },
    });

    // Resolve the real state only after the browser has finished restoring
    // scroll position. Kills the intermittent "scrolled at top" bug.
    window.addEventListener("load", function () {
      ScrollTrigger.refresh();
      syncNav(false); // snap instantly to correct state
      requestAnimationFrame(function () {
        syncNav(false); // re-confirm next frame
      });
    });
  });
});

// ===== Conditions cards carousel (3 on desktop) =====
onReady(function () {
  waitFor(hasSwiper, function () {
    var swiperEl = document.querySelector(".swiper.condition-cards");
    if (!swiperEl || swiperEl.dataset.initConditionCards) return;
    swiperEl.dataset.initConditionCards = "true";

    var swiper = new Swiper(swiperEl, {
      slidesPerView: 1.1,
      spaceBetween: 16,
      grabCursor: true,
      watchOverflow: true,
      breakpoints: {
        480: { slidesPerView: 1.4, spaceBetween: 20 },
        768: { slidesPerView: 2, spaceBetween: 24 },
        992: { slidesPerView: 3, spaceBetween: 24 },
      },
    });

    // Arrows live in the surrounding component, not inside .swiper —
    // scope to the nearest wrap so we don't grab the quote carousel's arrows
    var wrap = swiperEl.closest(".condition-cards_wrap");
    if (!wrap) return;
    var prevBtns = wrap.querySelectorAll(".pagination-btn.is-prev");
    var nextBtns = wrap.querySelectorAll(".pagination-btn.is-next");

    prevBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        swiper.slidePrev();
      });
    });
    nextBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        swiper.slideNext();
      });
    });

    function updateArrows() {
      prevBtns.forEach(function (btn) {
        btn.classList.toggle("swiper-button-disabled", swiper.isBeginning);
      });
      nextBtns.forEach(function (btn) {
        btn.classList.toggle("swiper-button-disabled", swiper.isEnd);
      });
    }

    swiper.on("slideChange", updateArrows);
    swiper.on("reachBeginning", updateArrows);
    swiper.on("reachEnd", updateArrows);
    swiper.on("resize", updateArrows);
    updateArrows();
  });
});

// ===== Quote carousel (1 on desktop) =====
onReady(function () {
  waitFor(hasSwiper, function () {
    var wrap = document.querySelector(".quote_component");
    if (!wrap || wrap.dataset.initQuoteCarousel) return;
    wrap.dataset.initQuoteCarousel = "true";

    var swiperEl = wrap.querySelector(".swiper");
    if (!swiperEl) return;

    var swiper = new Swiper(swiperEl, {
      slidesPerView: 1,
      spaceBetween: 24,
      grabCursor: true,
      loop: true, // 1-up quotes — loop so the arrows never dead-end
    });

    // Two arrow sets share this carousel:
    //   desktop: .pagination-left / .pagination-right (hide-mobile images)
    //   mobile:  .pagination-btn.is-prev / .is-next inside
    //            .pagination-arrows_wrap.is-mobile
    // The mobile buttons reuse the condition-cards classes, so scope every
    // lookup to this quote_component.
    var prevCtrls = wrap.querySelectorAll(
      ".pagination-left, .pagination-arrows_wrap.is-mobile .pagination-btn.is-prev",
    );
    var nextCtrls = wrap.querySelectorAll(
      ".pagination-right, .pagination-arrows_wrap.is-mobile .pagination-btn.is-next",
    );

    prevCtrls.forEach(function (btn) {
      btn.addEventListener("click", function () {
        swiper.slidePrev();
      });
    });
    nextCtrls.forEach(function (btn) {
      btn.addEventListener("click", function () {
        swiper.slideNext();
      });
    });
    // loop: true means there is no beginning/end, so the mobile buttons never
    // get .swiper-button-disabled — the disabled CSS in the page embed only
    // matters if loop is ever turned off.
  });
});
