(async () => {
  // ---------- CONFIG ----------
  // v3: stepped flow only. Legacy Greenhouse-schema form removed.
  const BOARD = "usenourish";
  const JOB_ID = 4007342008; // public job post id (still used for job description content)
  const PROVIDER_APPLICATION_BASE_URL = "https://app.nourish.com";
  const DRAFTS_ENDPOINT =
    PROVIDER_APPLICATION_BASE_URL + "/api/provider-job-application/drafts";
  const JOB_SCHEMA_URL = `https://boards-api.greenhouse.io/v1/boards/${BOARD}/jobs/${JOB_ID}?questions=true`;

  // optional caching
  const CACHE_KEY = `gh_schema_${JOB_ID}`;
  const TTL = 6 * 60 * 60 * 1e3; // 6h
  const JOB_DETAILS_TITLE = "Job description";
  const APPLICATION_PUBLIC_ID_STORAGE_KEY = "providerApplicationPublicId";
  const LEGACY_STORAGE_KEY = `dietitian_application_${JOB_ID}`;
  const STEPPED_FLOW_PAGE_CLASS = "provider-application--stepped";
  const DRAFT_RETRY_DELAY_MS = 1500;

  let runtimeContext = {
    applicationPublicId: null,
    iframeUrl: null,
  };
  let steppedIframe = null;

  const decodeHtml = (s = "") => {
    const t = document.createElement("textarea");
    t.innerHTML = s;
    return t.value;
  };

  // ---------- STORAGE ----------
  /**
   * Safely returns localStorage, accounting for private-mode failures.
   */
  function getStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch (err) {
      console.warn("localStorage unavailable", err);
    }
    return null;
  }

  function readStoredApplicationPublicId() {
    const store = getStorage();
    if (!store) return null;
    try {
      return store.getItem(APPLICATION_PUBLIC_ID_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  function writeStoredApplicationPublicId(id) {
    const store = getStorage();
    if (!store || !id) return;
    try {
      store.setItem(APPLICATION_PUBLIC_ID_STORAGE_KEY, id);
    } catch (err) {
      console.warn("Unable to persist applicationPublicId", err);
    }
  }

  function removeStoredApplicationPublicId() {
    const store = getStorage();
    if (!store) return;
    try {
      store.removeItem(APPLICATION_PUBLIC_ID_STORAGE_KEY);
    } catch (err) {
      console.warn("Unable to clear applicationPublicId", err);
    }
  }

  function removeLegacyStoredApplicationData() {
    const store = getStorage();
    if (!store) return;
    try {
      store.removeItem(LEGACY_STORAGE_KEY);
    } catch (err) {
      console.warn("Unable to clear legacy application data", err);
    }
  }

  // ---------- ANALYTICS HELPERS ----------
  function getRudderAnonymousId() {
    try {
      if (
        window.rudderanalytics &&
        typeof window.rudderanalytics.getAnonymousId === "function"
      ) {
        return window.rudderanalytics.getAnonymousId() || null;
      }
    } catch (err) {
      console.warn("rudderanalytics.getAnonymousId failed", err);
    }
    return null;
  }

  // ---------- DRAFT INIT ----------
  async function initDraft() {
    const body = {
      pageQueryString: window.location.search || "",
    };

    const storedId = readStoredApplicationPublicId();
    if (storedId) body.applicationPublicId = storedId;

    const anonymousId = getRudderAnonymousId();
    if (anonymousId) body.anonymousId = anonymousId;

    const resp = await fetch(DRAFTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`Draft init failed: ${resp.status}`);
    }

    const data = await resp.json();

    // v3: iframeUrl is now required. There is no legacy fallback.
    if (!data || !data.applicationPublicId || !data.iframeUrl) {
      throw new Error("Draft init response missing required fields");
    }

    if (data.applicationPublicId !== storedId) {
      writeStoredApplicationPublicId(data.applicationPublicId);
    }

    return {
      applicationPublicId: data.applicationPublicId,
      iframeUrl: data.iframeUrl,
    };
  }

  // ---------- GREENHOUSE JOB DESCRIPTION (content only, no form) ----------
  /**
   * Fetches the Greenhouse job schema with a short-lived session cache.
   * Used only to populate the job description accordion below the app.
   */
  async function getSchema() {
    const c = sessionStorage.getItem(CACHE_KEY);
    if (c) {
      try {
        const j = JSON.parse(c);
        if (Date.now() - j.t < TTL) return j.data;
      } catch {}
    }
    const r = await fetch(JOB_SCHEMA_URL, { credentials: "omit" });
    if (!r.ok) throw new Error(`Schema GET failed ${r.status}`);
    const data = await r.json();
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
    return data;
  }

  function getJobMetaText(schema) {
    const loc = schema.location?.name || "—";
    const upd = new Date(schema.updated_at).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${schema.company_name || ""} · ${loc} · Updated ${upd}`;
  }

  /**
   * Populates the job description accordion from the Greenhouse schema.
   */
  function renderHeader(schema) {
    const m = document.getElementById("gh-meta");
    const c = document.getElementById("gh-content");

    if (m) {
      m.textContent = getJobMetaText(schema);
    }
    if (c) {
      const tmp = document.createElement("div");
      tmp.innerHTML = decodeHtml(schema.content || "");
      // safety
      tmp.querySelectorAll("script,iframe").forEach((n) => n.remove());
      tmp.querySelectorAll("a[href]").forEach((a) => {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      });
      const sanitizedHTML = tmp.innerHTML;
      c.innerHTML = "";
      if (sanitizedHTML.trim()) {
        const accordionVariant = document.createElement("div");
        accordionVariant.className =
          "gh-content-variant gh-content-variant--accordion";
        accordionVariant.id = "gh-content-accordion";
        const accordionTmp = document.createElement("div");
        accordionTmp.innerHTML = sanitizedHTML;
        const nodes = Array.from(accordionTmp.childNodes);
        if (nodes.length) {
          accordionVariant.append(buildJobDetailsAccordion(nodes, schema));
        }

        c.append(accordionVariant);
      }
    }
  }

  /**
   * Injects the accordion CSS once so we can reuse the DOM fragment.
   */
  function ensureJobAccordionStyles() {
    if (document.getElementById("gh-job-accordion-styles")) return;
    const style = document.createElement("style");
    style.id = "gh-job-accordion-styles";
    style.textContent = `
        .gh-content-variant{
          width:100%;
        }
        .gh-content-variant--accordion{
          display:block;
        }
        #gh-content-accordion{
          margin-top:32px;
        }
        .gh-job-accordion{
          border:1px solid rgba(16,24,40,0.12);
          border-radius:8px;
          background:#FFFCF8;
          transition:border-color .2s ease;
          margin:40px 0 !important;
        }
        .gh-job-accordion:hover{
          border-color:#ff5c3580;
        }
        .gh-job-accordion-toggle{
          width:100%;
          border:0;
          background:transparent;
          padding:16px 20px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          cursor:pointer;
          gap:16px;
          text-align:left;
          font:inherit;
        }
        .gh-job-accordion-toggle:focus-visible{
          outline:2px solid #ff5c35;
          outline-offset:4px;
        }
        .gh-job-accordion-text{
          flex:1;
        }
        .gh-job-accordion-title{
          font-size:16px;
          line-height:20px;
          font-weight:500;
          color:#101828;
        }
        .gh-job-accordion-caret{
          width:20px;
          height:20px;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          transition:transform .2s ease;
        }
        .gh-job-accordion.open .gh-job-accordion-caret{
          transform:rotate(180deg);
        }
        .gh-job-accordion-caret svg{
          width:12px;
          height:8px;
          stroke:#98a2b3;
        }
        .gh-job-accordion-body{
          overflow:hidden;
          max-height:0;
          transition:max-height .35s ease;
        }
        .gh-job-accordion-inner{
          padding:0 20px 24px;
        }
        .gh-job-expanded-title{
          font-size:20px;
          line-height:28px;
          font-weight:500;
          color:#101828;
          margin:0 0 4px;
        }
        .gh-job-expanded-meta{
          font-size:12px;
          line-height:18px;
          color:#667085;
          margin:0 0 16px;
        }
      `;
    document.head.appendChild(style);
  }

  /**
   * Wraps the job description HTML inside an accessible accordion UI.
   */
  function buildJobDetailsAccordion(contentNodes, schema) {
    ensureJobAccordionStyles();
    const wrapper = document.createElement("div");
    wrapper.className = "gh-job-accordion";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "gh-job-accordion-toggle";
    trigger.setAttribute("aria-expanded", "false");

    const textWrap = document.createElement("div");
    textWrap.className = "gh-job-accordion-text";

    const title = document.createElement("div");
    title.className = "gh-job-accordion-title";
    title.textContent = JOB_DETAILS_TITLE;

    textWrap.append(title);

    const caret = document.createElement("span");
    caret.className = "gh-job-accordion-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.innerHTML =
      '<svg viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="#ff5c35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    trigger.append(textWrap, caret);

    const body = document.createElement("div");
    body.className = "gh-job-accordion-body";
    body.style.maxHeight = "0px";

    const inner = document.createElement("div");
    inner.className = "gh-job-accordion-inner";

    const expandedTitle = document.createElement("h3");
    expandedTitle.className = "gh-job-expanded-title";
    expandedTitle.textContent = schema.title || "";
    inner.appendChild(expandedTitle);

    const expandedMeta = document.createElement("p");
    expandedMeta.className = "gh-job-expanded-meta";
    expandedMeta.textContent = getJobMetaText(schema);
    inner.appendChild(expandedMeta);

    contentNodes.forEach((node) => inner.appendChild(node));
    body.appendChild(inner);

    const syncMaxHeight = () => {
      if (wrapper.classList.contains("open")) {
        body.style.maxHeight = `${inner.scrollHeight}px`;
      }
    };

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const open = wrapper.classList.toggle("open");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      body.style.maxHeight = open ? `${inner.scrollHeight}px` : "0px";
    });

    window.addEventListener("resize", syncMaxHeight);

    wrapper.append(trigger, body);
    return wrapper;
  }

  // ---------- STYLES ----------
  function ensureApplicationStyles() {
    if (document.getElementById("nourish-application-v3-styles")) return;
    const style = document.createElement("style");
    style.id = "nourish-application-v3-styles";
    style.textContent = `
        .${STEPPED_FLOW_PAGE_CLASS} #gh-title,
        .${STEPPED_FLOW_PAGE_CLASS} #gh-meta,
        .${STEPPED_FLOW_PAGE_CLASS} .dietapp_title-wrap{
          display:none;
        }
        #gh-app{
          display:flex;
          justify-content:center;
        }
        #gh-app .nourish-application-iframe{
          width:712px;
          height:564px;
          border:1px solid rgba(16,24,40,0.12);
          border-radius:12px;
          display:block;
        }
        #gh-app .nourish-application-error{
          max-width:712px;
          width:100%;
          border:1px solid rgba(16,24,40,0.12);
          border-radius:12px;
          background:#FFFCF8;
          padding:32px 24px;
          text-align:center;
        }
        #gh-app .nourish-application-error p{
          font-size:16px;
          line-height:24px;
          color:#101828;
          margin:0 0 16px;
        }
        #gh-app .nourish-application-error button{
          font:inherit;
          cursor:pointer;
        }
        @media (max-width:767px){
          .${STEPPED_FLOW_PAGE_CLASS} .section_rd-application{
            padding-top:0;
          }
          .job{
            padding-left:5%;
            padding-right:5%;
          }
          #gh-app{
            padding-left:0;
            padding-right:0;
          }
          #gh-app .nourish-application-iframe{
            width:100%;
            height:720px;
            border:0;
            border-radius:0px;
          }
          #gh-app .nourish-application-error{
            border:0;
            border-radius:0px;
          }
        }
      `;
    document.head.appendChild(style);
  }

  // ---------- IFRAME ----------
  function mountSteppedIframe(iframeUrl) {
    const mount = document.getElementById("gh-app");
    if (!mount) return;
    document.documentElement.classList.add(STEPPED_FLOW_PAGE_CLASS);
    mount.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.src = iframeUrl;
    iframe.className = "nourish-application-iframe";
    iframe.setAttribute("title", "Nourish provider application");
    iframe.setAttribute("loading", "lazy");

    steppedIframe = iframe;
    mount.appendChild(iframe);
  }

  // ---------- ERROR STATE ----------
  /**
   * Renders a retryable error card when draft init fails. Replaces the
   * old behavior of falling back to the legacy Greenhouse form.
   */
  function renderDraftErrorState() {
    const mount = document.getElementById("gh-app");
    if (!mount) return;
    document.documentElement.classList.add(STEPPED_FLOW_PAGE_CLASS);
    mount.innerHTML = "";

    const card = document.createElement("div");
    card.className = "nourish-application-error";

    const msg = document.createElement("p");
    msg.textContent =
      "We couldn't load the application right now. Please try again.";
    card.appendChild(msg);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Retry";
    btn.classList.add("btn", "w-button");
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Loading...";
      const ok = await startApplication();
      if (!ok) {
        btn.disabled = false;
        btn.textContent = "Retry";
      }
    });
    card.appendChild(btn);

    mount.appendChild(card);
  }

  // ---------- SUBMITTED MESSAGE HANDLING ----------
  function isMessageFromSteppedIframe(event) {
    if (!steppedIframe || event.source !== steppedIframe.contentWindow)
      return false;
    try {
      return event.origin === new URL(steppedIframe.src).origin;
    } catch {
      return false;
    }
  }

  function isProviderApplicationSubmittedMessage(event) {
    const data = event?.data;
    if (!data || typeof data !== "object") return false;
    if (steppedIframe && event.source !== steppedIframe.contentWindow)
      return false;
    if (data.source !== "provider-application-embed") return false;
    if (data.type !== "provider-application:submitted") return false;
    if (
      !runtimeContext.applicationPublicId ||
      data.applicationPublicId !== runtimeContext.applicationPublicId
    ) {
      return false;
    }
    return true;
  }

  function handleProviderApplicationMessage(event) {
    if (!isMessageFromSteppedIframe(event)) return;

    if (isProviderApplicationSubmittedMessage(event)) {
      // Clear the stored id so the next visit starts a fresh draft.
      removeStoredApplicationPublicId();
      return;
    }
  }

  window.addEventListener("message", handleProviderApplicationMessage);

  // ---------- LAYOUT ----------
  function ensureOverviewBelowApplication() {
    const mount = document.getElementById("gh-app");
    const job = document.getElementById("gh-job");
    if (!mount || !job) return;
    if (mount.nextElementSibling !== job) {
      mount.insertAdjacentElement("afterend", job);
    }
  }

  // ---------- INIT ----------
  /**
   * Initializes the draft (with one automatic retry) and mounts the iframe.
   * Returns true on success, false when the error state was rendered.
   */
  async function startApplication() {
    try {
      runtimeContext = await initDraft();
    } catch (firstErr) {
      console.warn("Draft init failed, retrying once", firstErr);
      await new Promise((resolve) => setTimeout(resolve, DRAFT_RETRY_DELAY_MS));
      try {
        runtimeContext = await initDraft();
      } catch (secondErr) {
        console.error("Draft init failed after retry", secondErr);
        renderDraftErrorState();
        return false;
      }
    }

    mountSteppedIframe(runtimeContext.iframeUrl);
    return true;
  }

  removeLegacyStoredApplicationData();
  ensureApplicationStyles();
  ensureOverviewBelowApplication();

  // Mount the application first, then populate the job description
  // accordion. The schema fetch is content-only and non-blocking.
  const schemaPromise = getSchema().catch((err) => {
    console.warn("Greenhouse schema fetch failed", err);
    return null;
  });

  await startApplication();

  const schema = await schemaPromise;
  if (schema) {
    renderHeader(schema);
  }
})();
