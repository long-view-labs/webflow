// ============================================================================
// GLOBAL FOOTER LOGIC (served from GitHub via jsDelivr, loaded with defer)
// ----------------------------------------------------------------------------
// This file holds everything that used to be inline in the Webflow site-wide
// footer custom code. The Webflow paste is now a small loader stub (see
// global-footer.html) containing only what must run at parse time: apex
// detection, the Statsig owner flags, the RudderStack stub (eager — see the
// data-team note there), the LinkedIn noscript pixel, and the versioned
// <script defer> tag that loads this file.
//
// Changes here ship by tagging a release and bumping the version in the
// stub's script URL (same flow as global.js).
// ============================================================================

// ============================================================================
// DEFERRED-EXECUTION HELPER
// Runs marketing pixel loaders on the visitor's first interaction (scroll,
// touch, mouse, key) or 10s after the load event, whichever comes first.
// NOT used for RudderStack — that must load eagerly for page-view parity.
// ============================================================================
(function () {
  var callbacks = [];
  var fired = false;
  var events = ["scroll", "mousemove", "touchstart", "keydown", "click"];

  function fire() {
    if (fired) return;
    fired = true;
    events.forEach(function (evt) {
      window.removeEventListener(evt, fire);
    });
    callbacks.forEach(function (fn) {
      try {
        fn();
      } catch (error) {
        console.error("[deferred script] failed", error);
      }
    });
    callbacks = [];
  }

  events.forEach(function (evt) {
    window.addEventListener(evt, fire, { once: true, passive: true });
  });

  function armFallback() {
    setTimeout(fire, 10000);
  }
  if (document.readyState === "complete") {
    armFallback();
  } else {
    window.addEventListener("load", armFallback, { once: true });
  }

  window.__nourishRunDeferred = function (fn) {
    if (fired) {
      fn();
    } else {
      callbacks.push(fn);
    }
  };

  // Back-compat alias for any straggling callers.
  window.__nourishRunWhenIdle = window.__nourishRunDeferred;
})();

// ============================================================================
// HERO-FILTER-SEARCH CONDITIONAL LOADER
// Powers the insurance search widget. Only fetch its 125KB payload on pages
// that actually render the widget.
// ============================================================================
(function () {
  function loadFilterSearch() {
    var widget = document.querySelector(
      ".home-filter_component, .provider-filter_component, .provider-filter_wrapper, .provider-filter_input-group, .provider-filter",
    );
    if (!widget) return;

    var script = document.createElement("script");
    script.src =
      "https://cdn.prod.website-files.com/699ce714348d0db6b6640eaf/6a4792118380c0cdc2f11fc6_hero-filter-search.txt";
    script.async = true;
    document.body.appendChild(script);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadFilterSearch, {
      once: true,
    });
  } else {
    loadFilterSearch();
  }
})();

// ============================================================================
// TRUSTPILOT BOOTSTRAP
// Only fetch it when an official Trustpilot widget is on the page and
// approaching the viewport (600px lookahead).
// ============================================================================
(function () {
  var TP_SRC =
    "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";
  var loaded = false;

  function loadTrustpilot() {
    if (loaded) return;
    loaded = true;
    var script = document.createElement("script");
    script.src = TP_SRC;
    script.async = true;
    document.body.appendChild(script);
    // Late-loaded bootstrap doesn't auto-scan; init widgets explicitly.
    script.onload = function () {
      if (window.Trustpilot) {
        document.querySelectorAll(".trustpilot-widget").forEach(function (el) {
          window.Trustpilot.loadFromElement(el, true);
        });
      }
    };
  }

  function watchWidgets() {
    var widgets = document.querySelectorAll(".trustpilot-widget");
    if (!widgets.length) return;

    if (!("IntersectionObserver" in window)) {
      loadTrustpilot();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        if (
          entries.some(function (entry) {
            return entry.isIntersecting;
          })
        ) {
          observer.disconnect();
          loadTrustpilot();
        }
      },
      { rootMargin: "600px" },
    );
    widgets.forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watchWidgets, {
      once: true,
    });
  } else {
    watchWidgets();
  }
})();

// ============================================================================
// MOBILE NAV DRAWER
// ============================================================================
(function () {
  function isRendered(el) {
    if (!el || !el.isConnected) return false;
    var node = el;
    while (node && node.nodeType === 1) {
      var style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
      node = node.parentElement;
    }
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function setupMobileDrawer(nav) {
    if (!nav || nav === document || nav.dataset.mobileDrawerInit) return;

    var toggle = nav.querySelector(".toggle-menu-2");
    var drawer = nav.querySelector(".nav_mobile-menu");
    var startedBtn = nav.querySelector("#mobile-nav-getstarted");
    if (!toggle || !drawer) return;

    nav.dataset.mobileDrawerInit = "true";

    var lineTop = toggle.querySelector(".m-line-2");
    var lineMid = toggle.querySelector(".m-line-2-2");
    var lineBot = toggle.querySelector(".m-line-3-2");
    var logo = nav.querySelector(".logo-embed");
    var drawerStyleState = null;

    [lineTop, lineMid, lineBot].forEach(function (line) {
      if (line)
        line.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    });

    Object.assign(drawer.style, {
      display: "block",
      transform: "translateX(100%)",
      transition: "transform 0.4s ease",
    });

    function morphToX() {
      if (lineTop) lineTop.style.transform = "translateY(7px) rotate(45deg)";
      if (lineBot) lineBot.style.transform = "translateY(-6px) rotate(-45deg)";
      if (lineMid) lineMid.style.opacity = "0";
    }

    function morphToBurger() {
      if (lineTop) lineTop.style.transform = "translateY(0) rotate(0deg)";
      if (lineBot) lineBot.style.transform = "translateY(0) rotate(0deg)";
      if (lineMid) lineMid.style.opacity = "1";
    }

    function applyOpenColors() {
      if (!drawerStyleState) {
        drawerStyleState = {
          lineTopBackground: lineTop ? lineTop.style.backgroundColor : "",
          lineMidBackground: lineMid ? lineMid.style.backgroundColor : "",
          lineBotBackground: lineBot ? lineBot.style.backgroundColor : "",
          logoColor: logo ? logo.style.color : "",
        };
      }

      [lineTop, lineMid, lineBot].forEach(function (line) {
        if (line) line.style.backgroundColor = "#000000";
      });

      if (logo) logo.style.color = "rgb(254, 80, 0)";
    }

    function restoreClosedColors() {
      if (!drawerStyleState) return;

      if (lineTop)
        lineTop.style.backgroundColor = drawerStyleState.lineTopBackground;
      if (lineMid)
        lineMid.style.backgroundColor = drawerStyleState.lineMidBackground;
      if (lineBot)
        lineBot.style.backgroundColor = drawerStyleState.lineBotBackground;
      if (logo) logo.style.color = drawerStyleState.logoColor;

      drawerStyleState = null;
    }

    function openDrawer() {
      nav.classList.add("is-mobile-drawer-open");
      applyOpenColors();
      drawer.style.transition = "transform 0.4s ease";
      drawer.style.transform = "translateX(0%)";
      drawer.classList.add("is-open");
      toggle.classList.add("is-active");
      document.body.style.overflow = "hidden";
      morphToX();
      if (startedBtn) {
        startedBtn.style.opacity = "0";
        startedBtn.style.pointerEvents = "none";
      }
    }

    function closeDrawer() {
      drawer.style.transition = "transform 0.4s ease";
      drawer.style.transform = "translateX(100%)";
      drawer.classList.remove("is-open");
      toggle.classList.remove("is-active");
      document.body.style.overflow = "";
      morphToBurger();
      restoreClosedColors();
      nav.classList.remove("is-mobile-drawer-open");
      if (startedBtn) {
        startedBtn.style.opacity = "";
        startedBtn.style.pointerEvents = "";
      }
    }

    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
    });

    drawer.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeDrawer);
    });

    var startX = 0;
    var currentX = 0;
    var dragging = false;

    drawer.addEventListener(
      "touchstart",
      function (event) {
        if (!drawer.classList.contains("is-open")) return;
        startX = event.touches[0].clientX;
        currentX = startX;
        dragging = true;
        drawer.style.transition = "none";
      },
      { passive: true },
    );

    drawer.addEventListener(
      "touchmove",
      function (event) {
        if (!dragging) return;
        currentX = event.touches[0].clientX;
        var delta = currentX - startX;
        if (delta > 0) {
          drawer.style.transform = "translateX(" + delta + "px)";
        }
      },
      { passive: true },
    );

    drawer.addEventListener("touchend", function () {
      if (!dragging) return;
      dragging = false;
      var delta = currentX - startX;
      var threshold = drawer.offsetWidth * 0.3;
      delta > threshold ? closeDrawer() : openDrawer();
    });
  }

  function initMobileDrawers() {
    var pending = false;
    document.querySelectorAll(".nav-2").forEach(function (nav) {
      if (nav.dataset.mobileDrawerInit) return;
      if (!isRendered(nav)) {
        pending = true;
        return;
      }
      setupMobileDrawer(nav);
    });
    return pending;
  }

  // Navs can be hidden at DOMContentLoaded (experiment variants revealed
  // later, embed CSS applying late), so keep retrying until every .nav-2
  // is initialized instead of relying on a resize to try again.
  var drawerRetryTimer = null;

  function initMobileDrawersWithRetry() {
    if (drawerRetryTimer) return;
    if (!initMobileDrawers()) return;
    var attempts = 0;
    drawerRetryTimer = setInterval(function () {
      attempts += 1;
      if (!initMobileDrawers() || attempts >= 20) {
        clearInterval(drawerRetryTimer);
        drawerRetryTimer = null;
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileDrawersWithRetry, {
      once: true,
    });
  } else {
    initMobileDrawersWithRetry();
  }

  window.addEventListener("resize", function () {
    setTimeout(initMobileDrawersWithRetry, 150);
  });
})();

// ============================================================================
// RB2B (loads on first interaction / 10s fallback)
// ============================================================================
(function () {
  var reb2b = (window.reb2b = window.reb2b || []);
  if (reb2b.invoked) return;
  reb2b.invoked = true;
  reb2b.methods = ["identify", "collect"];
  reb2b.factory = function (method) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(method);
      reb2b.push(args);
      return reb2b;
    };
  };
  for (var i = 0; i < reb2b.methods.length; i++) {
    var key = reb2b.methods[i];
    reb2b[key] = reb2b.factory(key);
  }
  reb2b.load = function (key) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src =
      "https://ddwl4m2hdecbv.cloudfront.net/b/" + key + "/VN080HXGZ56J.js.gz";
    var first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(script, first);
  };
  reb2b.SNIPPET_VERSION = "1.0.1";
  window.__nourishRunDeferred(function () {
    reb2b.load("VN080HXGZ56J");
  });
})();

// ============================================================================
// COPYRIGHT YEAR + INTERACTION-LOADED SCRIPTS (timed-tabs, navbar)
// ============================================================================
(function () {
  var scriptsLoaded = false;
  var loadedScripts = {};

  function loadScript(src, callback) {
    if (!src) return;

    if (loadedScripts[src]) {
      if (typeof callback === "function") callback();
      return;
    }

    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      loadedScripts[src] = true;
      if (typeof callback === "function") {
        if (existing.hasAttribute("data-loaded")) callback();
        else existing.addEventListener("load", callback, { once: true });
      }
      return;
    }

    var script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = function () {
      loadedScripts[src] = true;
      script.setAttribute("data-loaded", "true");
      if (typeof callback === "function") callback();
    };
    document.body.appendChild(script);
  }

  function updateCopyrightYear() {
    var year = new Date().getFullYear();
    document.querySelectorAll("#copyright").forEach(function (element) {
      element.textContent = "© " + year;
    });
  }

  function loadScriptsOnInteraction() {
    if (scriptsLoaded) return;
    scriptsLoaded = true;

    updateCopyrightYear();
    loadScript(
      "https://cdn.jsdelivr.net/gh/long-view-labs/webflow@v2.620.46/timed-tabs.js",
    );
  }

  function loadNavbarScripts() {
    loadScript(
      "https://cdn.prod.website-files.com/699ce714348d0db6b6640eaf/6a2be4c48b51648e8c046961_navbar.txt",
    );
  }

  updateCopyrightYear();
  loadNavbarScripts();

  if (window.jQuery) {
    jQuery(window).one("scroll touchstart mousemove", loadScriptsOnInteraction);
  } else {
    ["scroll", "touchstart", "mousemove"].forEach(function (eventName) {
      window.addEventListener(eventName, loadScriptsOnInteraction, {
        once: true,
        passive: true,
      });
    });
  }
})();

// ============================================================================
// LINKEDIN INSIGHT TAG (loads on first interaction / 10s fallback)
// The <noscript> tracking pixel stays in the Webflow footer stub.
// ============================================================================
(function () {
  window._linkedin_partner_id = "8614857";
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(window._linkedin_partner_id);

  if (!window.lintrk) {
    window.lintrk = function (a, b) {
      window.lintrk.q.push([a, b]);
    };
    window.lintrk.q = [];
  }
  window.__nourishRunDeferred(function () {
    var s = document.getElementsByTagName("script")[0];
    var b = document.createElement("script");
    b.type = "text/javascript";
    b.async = true;
    b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
    s.parentNode.insertBefore(b, s);
  });
})();

// ============================================================================
// DUAL-DOMAIN LINK REWRITER (usenourish.com -> current apex)
// ============================================================================
(function () {
  function updateLinks() {
    var apex = window.__nourish_apex || "nourish.com";
    document
      .querySelectorAll("a[href*='usenourish.com']")
      .forEach(function (link) {
        link.href = link.href.replace(/usenourish\.com/g, apex);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateLinks, {
      once: true,
    });
  } else {
    updateLinks();
  }
})();

// ============================================================================
// GSAP SCROLL REVEALS (data-slide-up / data-fade-in / data-slide-up-group)
// The global head adds a `js-anim` class on <html> plus CSS that hides these
// elements from first paint; GSAP takes over from that state, so there is no
// visible-then-hidden flash. Init is idempotent (same dataset flags as the
// home/paid page footers), so running on pages that also carry the page-level
// copy is harmless.
// ============================================================================
(function () {
  function rendered(el) {
    if (!el || !el.isConnected) return false;

    var node = el;
    while (node && node.nodeType === 1) {
      var style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden")
        return false;
      node = node.parentElement;
    }

    var rect = el.getBoundingClientRect();
    return rect.width > 20 && rect.height > 20;
  }

  function initScrollReveals() {
    if (!window.gsap || !window.ScrollTrigger) {
      // Without GSAP the head CSS would hide this content forever — unhide.
      document.documentElement.classList.remove("js-anim");
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll("[data-fade-in]").forEach(function (group) {
      if (!rendered(group) || group.dataset.initFade) return;
      group.dataset.initFade = "true";

      var selector = group.getAttribute("data-fade-target");
      var items = selector
        ? group.querySelectorAll(selector)
        : group.children;
      if (!items.length) return;

      gsap.set(items, {
        opacity: 0,
        y: parseFloat(group.dataset.fadeY) || 24,
      });

      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: parseFloat(group.dataset.fadeDuration) || 0.8,
        ease: "power2.out",
        stagger: parseFloat(group.dataset.fadeStagger) || 0.12,
        scrollTrigger: {
          trigger: group,
          start: group.dataset.fadeStart || "top 80%",
          once: true,
        },
      });
    });

    document.querySelectorAll("[data-slide-up]").forEach(function (el) {
      if (!rendered(el) || el.dataset.initSlide) return;
      el.dataset.initSlide = "true";

      gsap.set(el, {
        opacity: 0,
        y: parseFloat(el.dataset.slideY) || 40,
      });

      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: parseFloat(el.dataset.slideDuration) || 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: el.dataset.slideStart || "top 85%",
          once: true,
        },
      });
    });

    document
      .querySelectorAll("[data-slide-up-group]")
      .forEach(function (group) {
        if (!rendered(group) || group.dataset.initSlideGroup) return;
        group.dataset.initSlideGroup = "true";

        var selector =
          group.getAttribute("data-slide-target") || "h1,h2,h3,h4,h5,h6";
        group.querySelectorAll(selector).forEach(function (el) {
          if (el.dataset.initSlide) return;
          el.dataset.initSlide = "true";

          gsap.set(el, {
            opacity: 0,
            y: parseFloat(el.dataset.slideY || group.dataset.slideY) || 40,
          });

          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration:
              parseFloat(
                el.dataset.slideDuration || group.dataset.slideDuration,
              ) || 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start:
                el.dataset.slideStart ||
                group.dataset.slideStart ||
                "top 85%",
              once: true,
            },
          });
        });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScrollReveals, {
      once: true,
    });
  } else {
    initScrollReveals();
  }

  // Second pass after full load catches elements that only become rendered
  // once late scripts/sliders finish laying out.
  window.addEventListener("load", initScrollReveals, { once: true });
})();
