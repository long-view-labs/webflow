//----- Team Video Testimonials -----
// Autoplaying vertical video wall driven by a Webflow CMS collection of
// self-hosted MP4s. Two <video> elements are double-buffered so the next clip
// is already loading when the current one ends. The orange ring around the
// active thumbnail is a single SVG that gets moved into whichever thumbnail is
// playing.
(function () {
  "use strict";

  var RING_RADIUS = 46;
  var CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  var SVG_NS = "http://www.w3.org/2000/svg";

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function saveData() {
    var connection = navigator.connection || navigator.webkitConnection;
    return !!(connection && connection.saveData);
  }

  function createVideo() {
    var video = document.createElement("video");
    video.className = "team-video_media";
    // Attributes must be set (not just properties) for iOS inline autoplay.
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("muted", "");
    // metadata, not auto: only the clip that is actually playing gets promoted
    // to full buffering. See setPreload().
    video.setAttribute("preload", "metadata");
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    return video;
  }

  function createRing() {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "team-video_ring");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");

    ["team-video_ring-track", "team-video_ring-arc"].forEach(function (name) {
      var circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("class", name);
      circle.setAttribute("cx", "50");
      circle.setAttribute("cy", "50");
      circle.setAttribute("r", String(RING_RADIUS));
      svg.appendChild(circle);
    });

    var arc = svg.querySelector(".team-video_ring-arc");
    arc.style.strokeDasharray = String(CIRCUMFERENCE);
    arc.style.strokeDashoffset = String(CIRCUMFERENCE);

    return { svg: svg, arc: arc };
  }

  // The rail scrolls vertically on desktop and horizontally on mobile — handle
  // whichever axis overflows. Measured from rects, not offsetTop, because
  // .team-video_btn is position:relative and is not the rail's offsetParent.
  function scrollIntoRail(rail, button) {
    var canScrollY = rail.scrollHeight > rail.clientHeight + 1;
    var canScrollX = rail.scrollWidth > rail.clientWidth + 1;

    if (!canScrollY && !canScrollX) {
      return;
    }

    var railRect = rail.getBoundingClientRect();
    var btnRect = button.getBoundingClientRect();
    var options = { behavior: prefersReducedMotion() ? "auto" : "smooth" };

    if (canScrollY) {
      var deltaY =
        btnRect.top - railRect.top - (rail.clientHeight / 2 - btnRect.height / 2);
      options.top = Math.max(
        0,
        Math.min(rail.scrollTop + deltaY, rail.scrollHeight - rail.clientHeight)
      );
    }

    if (canScrollX) {
      var deltaX =
        btnRect.left - railRect.left - (rail.clientWidth / 2 - btnRect.width / 2);
      options.left = Math.max(
        0,
        Math.min(rail.scrollLeft + deltaX, rail.scrollWidth - rail.clientWidth)
      );
    }

    if (typeof rail.scrollTo === "function") {
      rail.scrollTo(options);
    } else {
      if (options.top !== undefined) rail.scrollTop = options.top;
      if (options.left !== undefined) rail.scrollLeft = options.left;
    }
  }

  // Desktop only: the thumbnail grid anchors the section height, and the stage
  // is resized to railHeight * 9/16 so it ends flush with the grid while
  // keeping a true 9:16 — CSS alone cannot do this, because the rail's height
  // depends on the rail's width, which depends on the stage's width. Writing
  // the width re-lays-out the rail and re-fires the observer; it settles as
  // soon as the computed width stops changing (the 1px tolerance breaks any
  // wrap/unwrap flip-flop).
  function initHeightSync(root, rail) {
    if (!("ResizeObserver" in window)) {
      return;
    }

    var mq = window.matchMedia("(min-width: 768px)");

    function sync() {
      if (!mq.matches) {
        root.style.removeProperty("--team-video-stage-w");
        return;
      }

      var railHeight = rail.offsetHeight;

      if (!railHeight) {
        return;
      }

      // Clamped so a sparse grid cannot collapse the player and a huge one
      // cannot push the rail below half the section.
      var width = Math.min(
        Math.max(Math.round((railHeight * 9) / 16), 240),
        Math.round(root.clientWidth * 0.48)
      );
      var current =
        parseFloat(root.style.getPropertyValue("--team-video-stage-w")) || 0;

      if (Math.abs(current - width) > 1) {
        root.style.setProperty("--team-video-stage-w", width + "px");
      }
    }

    new ResizeObserver(sync).observe(rail);

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(sync);
    }

    sync();
  }

  function initComponent(root) {
    if (root.getAttribute("data-team-video-ready") === "true") {
      return;
    }

    var stage = root.querySelector(".team-video_stage");
    var rail = root.querySelector(".team-video_rail");
    var nameEl = root.querySelector(".team-video_name");
    var roleEl = root.querySelector(".team-video_role");
    var soundBtn = root.querySelector(".team-video_sound");
    var playBtn = root.querySelector(".team-video_play");

    // Section-level fallbacks. Put data-video-src on the section and every tile
    // inherits it. Per-item attributes always win.
    var fallback = {
      src: root.getAttribute("data-video-src") || "",
      name: root.getAttribute("data-video-name") || "",
      role: root.getAttribute("data-video-role") || "",
      poster: root.getAttribute("data-video-poster") || "",
    };

    // Attributes may sit on .team-video_btn or on the Collection Item wrapping
    // it — whichever was easier to reach in the Designer. Button wins.
    function attrFrom(button, name) {
      var value = button.getAttribute(name);

      if (value) {
        return value;
      }

      var item = button.closest && button.closest(".team-video_item");
      return (item && item.getAttribute(name)) || "";
    }

    var buttons = Array.prototype.filter.call(
      root.querySelectorAll(".team-video_btn"),
      function (button) {
        return !!(attrFrom(button, "data-video-src") || fallback.src);
      }
    );

    if (!stage || !buttons.length) {
      return;
    }

    root.setAttribute("data-team-video-ready", "true");

    if (rail) {
      initHeightSync(root, rail);
    }

    var ring = createRing();
    var buffers = [createVideo(), createVideo()];
    var activeBuffer = 0;
    var currentIndex = -1;
    var wantsSound = false;
    var inView = false;
    var autoplayBlocked = prefersReducedMotion();
    // Off by default. Prefetching the next clip buys a seamless transition, but
    // it doubles what the section pulls — and a CMS field can point at anything,
    // including an unencoded master. CloudFront sends no CORS header, so the size
    // cannot be checked first. Turn it on with data-video-prefetch="true" on the
    // section once the files are known to be web-encoded.
    var canPrefetch =
      !saveData() && root.getAttribute("data-video-prefetch") === "true";
    var rafId = null;

    buffers.forEach(function (video) {
      stage.insertBefore(video, stage.firstChild);
    });

    function itemData(index) {
      var button = buttons[index];
      var image = button.querySelector("img");

      return {
        button: button,
        src: attrFrom(button, "data-video-src") || fallback.src,
        name: attrFrom(button, "data-video-name") || fallback.name,
        role: attrFrom(button, "data-video-role") || fallback.role,
        poster:
          attrFrom(button, "data-video-poster") ||
          fallback.poster ||
          (image && (image.currentSrc || image.src)) ||
          "",
      };
    }

    function nextIndex(index) {
      return (index + 1) % buttons.length;
    }

    // Only the clip on screen buffers ahead; the idle buffer holds at metadata
    // so a queued clip cannot quietly download alongside the one playing.
    function setPreload() {
      buffers.forEach(function (video, i) {
        video.setAttribute("preload", i === activeBuffer ? "auto" : "metadata");
      });
    }

    function stopRing() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function tickRing() {
      var video = buffers[activeBuffer];
      var duration = video.duration;
      var progress =
        duration && isFinite(duration) && duration > 0
          ? Math.min(video.currentTime / duration, 1)
          : 0;

      ring.arc.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
      rafId = requestAnimationFrame(tickRing);
    }

    function startRing() {
      stopRing();
      rafId = requestAnimationFrame(tickRing);
    }

    function resetRing() {
      ring.arc.style.strokeDashoffset = String(CIRCUMFERENCE);
    }

    function setPausedState(isPaused) {
      root.classList.toggle("is-paused", isPaused);
      if (playBtn) {
        playBtn.setAttribute("aria-hidden", isPaused ? "false" : "true");
      }
    }

    function syncSoundUi() {
      root.classList.toggle("is-muted", !wantsSound);
      if (soundBtn) {
        soundBtn.setAttribute("aria-pressed", wantsSound ? "true" : "false");
        soundBtn.setAttribute(
          "aria-label",
          wantsSound ? "Mute video" : "Unmute video"
        );
      }
    }

    function prefetch(index) {
      if (!canPrefetch) {
        return;
      }

      var idle = buffers[1 - activeBuffer];
      var data = itemData(index);

      // Nothing to prefetch when the next tile plays the clip that is already
      // loaded — otherwise a shared clip is fetched into both buffers.
      if (data.src === buffers[activeBuffer].getAttribute("src")) {
        return;
      }

      if (idle.getAttribute("src") !== data.src) {
        idle.setAttribute("src", data.src);
        idle.poster = data.poster;
        idle.load();
      }
    }

    function play() {
      var video = buffers[activeBuffer];
      var attempt = video.play();

      if (!attempt || typeof attempt.then !== "function") {
        setPausedState(false);
        return;
      }

      attempt
        .then(function () {
          setPausedState(false);
        })
        .catch(function () {
          // Autoplay refused (iOS Low Power Mode, reduced motion, etc.).
          autoplayBlocked = true;
          setPausedState(true);
          stopRing();
        });
    }

    function select(index, options) {
      options = options || {};

      if (index === currentIndex && !options.force) {
        var current = buffers[activeBuffer];
        if (current.paused) {
          play();
        }
        return;
      }

      var data = itemData(index);
      // Prefer the buffer already holding this source — when a run of tiles
      // shares a clip there is nothing to cross-fade to. Otherwise take the
      // idle buffer, which is where prefetch() will have put the next clip.
      var target =
        buffers[activeBuffer].getAttribute("src") === data.src
          ? activeBuffer
          : 1 - activeBuffer;

      var previous = buffers[activeBuffer];
      var video = buffers[target];

      if (video.getAttribute("src") !== data.src) {
        video.setAttribute("src", data.src);
        video.poster = data.poster;
      }

      if (video.readyState > 0) {
        try {
          video.currentTime = 0;
        } catch (error) {
          // Seeking before the browser is ready is not fatal — playback still
          // starts at 0.
        }
      }
      video.muted = !wantsSound;

      if (previous !== video) {
        previous.pause();
        previous.classList.remove("is-active");
      }

      activeBuffer = target;
      video.classList.add("is-active");
      setPreload();

      buttons.forEach(function (button, i) {
        var isActive = i === index;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-current", isActive ? "true" : "false");
      });

      // Only overwrite when there is something to write, so text typed straight
      // into the Designer survives a build with no name/role attributes.
      if (nameEl && data.name) {
        nameEl.textContent = data.name;
      }
      if (roleEl && data.role) {
        roleEl.textContent = data.role;
      }

      data.button.appendChild(ring.svg);
      resetRing();
      currentIndex = index;

      if (rail) {
        scrollIntoRail(rail, data.button);
      }

      if (options.userInitiated) {
        autoplayBlocked = false;
      }

      if (!autoplayBlocked && (inView || options.userInitiated)) {
        play();
        startRing();
      } else {
        setPausedState(true);
      }

      prefetch(nextIndex(index));
    }

    function advance() {
      select(nextIndex(currentIndex));
    }

    buffers.forEach(function (video) {
      video.addEventListener("ended", function () {
        if (video === buffers[activeBuffer]) {
          advance();
        }
      });

      video.addEventListener("play", function () {
        if (video === buffers[activeBuffer]) {
          setPausedState(false);
          startRing();
        }
      });

      video.addEventListener("pause", function () {
        if (video === buffers[activeBuffer] && !video.ended) {
          setPausedState(true);
          stopRing();
        }
      });

      video.addEventListener("error", function () {
        // A missing or unplayable file must not stall the chain.
        if (video === buffers[activeBuffer]) {
          advance();
        }
      });
    });

    buttons.forEach(function (button, index) {
      if (!button.hasAttribute("tabindex") && button.tagName !== "A") {
        button.setAttribute("tabindex", "0");
        button.setAttribute("role", "button");
      }

      button.addEventListener("click", function (event) {
        event.preventDefault();
        select(index, { userInitiated: true });
      });

      button.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select(index, { userInitiated: true });
        }
      });
    });

    stage.addEventListener("click", function (event) {
      if (soundBtn && soundBtn.contains(event.target)) {
        return;
      }

      var video = buffers[activeBuffer];
      if (video.paused) {
        autoplayBlocked = false;
        play();
      } else {
        video.pause();
      }
    });

    if (soundBtn) {
      soundBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        wantsSound = !wantsSound;
        buffers[activeBuffer].muted = !wantsSound;
        syncSoundUi();

        // Unmuting is a user gesture, so it can also start blocked playback.
        if (wantsSound && buffers[activeBuffer].paused) {
          autoplayBlocked = false;
          play();
        }
      });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        buffers[activeBuffer].pause();
      } else if (inView && !autoplayBlocked) {
        play();
      }
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            inView = entry.isIntersecting;

            if (inView && !autoplayBlocked) {
              play();
            } else if (!inView) {
              buffers[activeBuffer].pause();
            }
          });
        },
        { threshold: 0.4 }
      ).observe(root);
    } else {
      inView = true;
    }

    syncSoundUi();
    select(0, { force: true });
  }

  function init() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-team-video]"),
      initComponent
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
