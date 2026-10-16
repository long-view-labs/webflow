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

  function handleReferralMessage(event) {
    if (!isMessageFromReferralIframe(event)) return;
    const height = readIframeHeight(event.data);
    if (height == null) return;
    referralIframe.style.height = `${height}px`;
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
