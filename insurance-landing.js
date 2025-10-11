document.addEventListener("DOMContentLoaded", function () {
  var iframes = document.querySelectorAll("iframe.lazyload");
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var iframe = entry.target;
        iframe.src = iframe.dataset.src;
        if (typeof window.NOURISH_GET_UTMS === "function") {
          const utmMap = window.NOURISH_GET_UTMS();
          try {
            const url = new URL(iframe.src, location.origin);
            Object.entries(utmMap || {}).forEach(([k, v]) => {
              if (v && !url.searchParams.has(k)) {
                url.searchParams.set(k, v);
              }
            });
            iframe.src = url.toString();
            if (iframe.hasAttribute("data-src")) {
              iframe.setAttribute("data-src", url.toString());
            }
          } catch (err) {
            console.warn("UTM merge failed", err);
          }
        }

        observer.unobserve(iframe);
      }
    });
  });

  iframes.forEach(function (iframe) {
    observer.observe(iframe);
  });
});
