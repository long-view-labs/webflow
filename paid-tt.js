// Load Statsig SDK dynamically
(function () {
  var script = document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/@statsig/js-client@3/build/statsig-js-client+session-replay+web-analytics.min.js";
  script.onload = function () {
    if (window.rudderanalytics && window.rudderanalytics.ready) {
      window.rudderanalytics.ready(runExperiment);
    } else {
      // Fallback if RudderStack not available
      document.addEventListener("DOMContentLoaded", runExperiment);
    }
  };
  script.onerror = function () {
    window.location.replace("/paid-tt-a" + window.location.search);
  };
  document.head.appendChild(script);
})();

function navigateWithTracking(shouldNavigateToPaid) {
  var variation = shouldNavigateToPaid ? "paid" : "home";
  window.rudderanalytics?.track("Experiment Viewed", {
    experiment_name: "lp-tiktok-landing-experience",
    variation: variation,
  });

  var params = window.location.search;
  var destination = shouldNavigateToPaid ? "/paid-tt-a" + params : "/paid-tt-b" + params;
  window.location.replace(destination);
}

async function runExperiment() {
  try {
    var anonymousId = window.rudderanalytics?.getAnonymousId?.();
    var u = window.statsigUser || (anonymousId ? { userID: anonymousId } : {});

    var StatsigClient = window.Statsig.StatsigClient;
    var client = new StatsigClient(
      "client-WQtYDbXSKdHeLKM7WlavcbKXn19ve6OlMdFhQUfxtcH",
      u
    );

    await client.initializeAsync();

    var exp = client.getExperiment("lp-tiktok-landing-experience");
    var shouldNavigateToPaid = exp.get("shouldNavigateToPaid", false);

    navigateWithTracking(shouldNavigateToPaid);
  } catch (err) {
    navigateWithTracking(true);
  }
}
