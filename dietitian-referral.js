(() => {
  // ---------- CONFIG ----------
  // Dietitian referral form, embedded as an iframe (same pattern as the
  // provider application in dietitian-application-final.js, minus the draft
  // init: the referral form is a plain form with a fixed URL).
  //
  // QA URL. Switch to https://app.nourish.com/classic/dietitian-referral
  // once the staging embed has been checked.
  const REFERRAL_FORM_URL =
    "https://staging.nourish.com/classic/dietitian-referral";
  const MOUNT_ID = "referral-app";
  const PAGE_CLASS = "dietitian-referral--embed";

  // Placeholder heights until the form reports its own. These match the
  // application iframe so the two pages look the same while loading.
  const DEFAULT_HEIGHT = 564;
  const MOBILE_HEIGHT = 720;
  const MOBILE_QUERY = "(max-width:767px)";

  // A height drop to this fraction of the previous height (or less) is
  // treated as the form -> confirmation screen transition.
  const SHRINK_RATIO = 0.75;
  // Gap between the fixed nav and the iframe top after scrolling.
  const SCROLL_GAP = 16;

  let referralIframe = null;
  let referralOrigin = null;

  // ---------- STYLES ----------
  function ensureReferralStyles() {
    if (document.getElementById("nourish-referral-styles")) return;
    const style = document.createElement("style");
    style.id = "nourish-referral-styles";
    style.textContent = `
        #${MOUNT_ID}{
          display:flex;
          justify-content:center;
        }
        #${MOUNT_ID} .nourish-referral-iframe{
          /* Webflow sets border-box globally; the posted height is the
             form's content height, so keep the 1px borders outside it or
             the form gets a 2px internal scroll. */
          box-sizing:content-box;
          width:712px;
          height:${DEFAULT_HEIGHT}px;
          border:1px solid rgba(16,24,40,0.12);
          border-radius:12px;
          display:block;
          overflow:hidden;
          transition:height .2s ease;
        }
        @media ${MOBILE_QUERY}{
          #${MOUNT_ID}{
            padding-left:0;
            padding-right:0;
          }
          #${MOUNT_ID} .nourish-referral-iframe{
            width:100%;
            height:${MOBILE_HEIGHT}px;
            border:0;
            border-radius:0px;
          }
        }
        @media (prefers-reduced-motion:reduce){
          #${MOUNT_ID} .nourish-referral-iframe{
            transition:none;
          }
        }
      `;
    document.head.appendChild(style);
  }

  // ---------- IFRAME ----------
  function mountReferralIframe() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return false;
    document.documentElement.classList.add(PAGE_CLASS);
    mount.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.src = REFERRAL_FORM_URL;
    iframe.className = "nourish-referral-iframe";
    iframe.setAttribute("title", "Nourish dietitian referral form");
    iframe.setAttribute("loading", "lazy");
    // The form derives the parent origin from document.referrer and only
    // posts iframeHeight to an allowed origin, so make sure the referrer is
    // always sent (origin only).
    iframe.setAttribute("referrerpolicy", "origin");

    referralIframe = iframe;
    try {
      referralOrigin = new URL(REFERRAL_FORM_URL).origin;
    } catch {
      referralOrigin = null;
    }
    mount.appendChild(iframe);
    return true;
  }

  // ---------- HEIGHT MESSAGES ----------
  /**
   * The referral form posts `{ iframeHeight: <number> }` to the parent every
   * time its content size changes (ResizeObserver + window resize), including
   * the shorter confirmation screen after submit. Resize the iframe to match.
   */
  function isMessageFromReferralIframe(event) {
    if (!referralIframe || !referralOrigin) return false;
    if (event.source !== referralIframe.contentWindow) return false;
    return event.origin === referralOrigin;
  }

  function readIframeHeight(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    if (!("iframeHeight" in data)) return null;
    const h = data.iframeHeight;
    if (typeof h !== "number" || !Number.isFinite(h) || h <= 0) return null;
    return Math.ceil(h);
  }

  /**
   * Height of anything fixed to the top of the viewport (the site nav), so
   * a scroll-to-iframe lands below it instead of underneath it.
   */
  function getFixedTopOffset() {
    const nav = document.querySelector(".w-nav");
    if (!nav) return 0;
    const style = getComputedStyle(nav);
    if (style.position !== "fixed" && style.position !== "sticky") return 0;
    const rect = nav.getBoundingClientRect();
    return rect.top <= 0 ? rect.bottom : 0;
  }

  /**
   * After submit the form shrinks to the confirmation screen. On mobile the
   * user has usually scrolled past the top of the iframe to reach the submit
   * button, so once the iframe shrinks they land on whatever was below it.
   * Bring the top of the iframe back into view so they see the confirmation.
   * Only big shrinks count: a validation message clearing is a few px and
   * must not yank the page while someone is still filling in the form.
   */
  function scrollIframeIntoViewAfterShrink(prevHeight, nextHeight) {
    if (!referralIframe) return;
    if (!(prevHeight > 0) || nextHeight > prevHeight * SHRINK_RATIO) return;
    const offset = getFixedTopOffset() + SCROLL_GAP;
    const top = referralIframe.getBoundingClientRect().top;
    if (top >= offset) return; // iframe top already visible
    const reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    window.scrollTo({
      top: Math.max(0, window.scrollY + top - offset),
      behavior: reduce ? "auto" : "smooth",
    });
  }

  function handleReferralMessage(event) {
    if (!isMessageFromReferralIframe(event)) return;
    const height = readIframeHeight(event.data);
    if (height == null) return;
    const prevHeight = parseFloat(referralIframe.style.height) || 0;
    referralIframe.style.height = `${height}px`;
    scrollIframeIntoViewAfterShrink(prevHeight, height);
  }

  window.addEventListener("message", handleReferralMessage);

  // ---------- INIT ----------
  function init() {
    ensureReferralStyles();
    if (!mountReferralIframe()) {
      console.warn(`Dietitian referral: #${MOUNT_ID} mount not found`);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
