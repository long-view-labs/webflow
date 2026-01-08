(function () {
  var STORAGE_KEY = "lp_tiktok_variant";

  function getVariant() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function setVariant(v) {
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch (e) {}
  }

  var variant = getVariant();

  if (!variant) {
    variant = Math.random() < 0.5 ? "paid" : "home";
    setVariant(variant);
  }

  var params = window.location.search || "";
  var destination =
    variant === "paid"
      ? "/paid-tt-a" + params
      : "/paid-tt-b" + params;

  window.location.replace(destination);
})();
