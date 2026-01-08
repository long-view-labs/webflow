document.addEventListener("DOMContentLoaded", function () {
  var variant = localStorage.getItem("lp_tiktok_variant");
  if (variant === "paid" || variant === "home") {
    if (window.rudderanalytics && window.rudderanalytics.ready) {
      window.rudderanalytics.ready(function () {
        window.rudderanalytics.track("Experiment Viewed", {
          experiment_name: "lp-tiktok-landing-experience",
          variation: variant,
        });
      });
    }
  }
});
