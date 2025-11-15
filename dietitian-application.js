(async () => {
  // ---------- CONFIG ----------
  const BOARD = "usenourish";
  const JOB_ID = 4007342008; // public job post id
  const PROXY = "https://gh-apply.geminpak.workers.dev"; // your Worker origin
  const JOB_SCHEMA_URL = `https://boards-api.greenhouse.io/v1/boards/${BOARD}/jobs/${JOB_ID}?questions=true`;

  // optional caching
  const CACHE_KEY = `gh_schema_${JOB_ID}`;
  const TTL = 6 * 60 * 60 * 1e3; // 6h
  const STORAGE_KEY = `dietitian_application_${JOB_ID}`;
  const LEAD_ENDPOINT = `${PROXY}/leads`;
  const LEAD_STATUS = {
    IN_PROGRESS: "In progress",
    SUBMITTED: "Application Submitted",
  };
  const JOB_DETAILS_TITLE = "Learn more about being an RD at Nourish";
  const JOB_DETAILS_SUBTITLE =
    "Our Mission, Clinical Philosophy, Values, and Benefits";

  // match your Webflow input look
  const INPUT_CLASSES = ["provider-filter_input", "hero", "no-icon", "w-input"];
  const addWF = (el) => {
    if (!el.classList.contains("tagpicker-input"))
      el.classList.add(...INPUT_CLASSES);
    return el;
  };

  const decodeHtml = (s = "") => {
    const t = document.createElement("textarea");
    t.innerHTML = s;
    return t.value;
  };

  // Validation functions
  function validateUSPhone(phone) {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Accept any 10-digit number
    if (digits.length === 10) {
      return true;
    }
    return false;
  }

  function formatPhoneNumber(value) {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");

    // Only format 10-digit US numbers
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
      // Limit to 10 digits and format as XXX-XXX-XXXX
      const limitedDigits = digits.slice(0, 10);
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(
        3,
        6
      )}-${limitedDigits.slice(6)}`;
    }
  }

  function validateEmail(email) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  function hasInvalidEmailChars(email) {
    return /[\s/]/.test(email);
  }

  /**
   * Formats a phone number to +15555555555 -- E.164 format https://www.twilio.com/docs/glossary/what-e164
   */
  function formatPhoneNumberForRudderstack(phoneNumber) {
    if (!phoneNumber) return undefined;
    return `+1${phoneNumber.replace(/\D/g, "")}`;
  }

  function showValidationError(input, message) {
    // Remove existing error
    const existingError = input.parentNode.querySelector(".validation-error");
    if (existingError) {
      existingError.remove();
    }

    // Add error message
    const errorDiv = document.createElement("div");
    errorDiv.className = "validation-error";
    errorDiv.style.color = "#e74c3c";
    errorDiv.style.fontSize = "14px";
    errorDiv.style.marginTop = "5px";
    errorDiv.style.fontStyle = "italic";
    errorDiv.textContent = message;

    input.parentNode.appendChild(errorDiv);
    input.style.borderColor = "#e74c3c";
  }

  function clearValidationError(input) {
    const existingError = input.parentNode.querySelector(".validation-error");
    if (existingError) {
      existingError.remove();
    }
    input.style.borderColor = "";
  }

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

  // ---------- RENDER HEADER ----------
  function renderHeader(schema) {
    const t = document.getElementById("gh-title");
    const m = document.getElementById("gh-meta");
    const c = document.getElementById("gh-content");
    if (t) t.textContent = schema.title || "";

    if (m) {
      const loc = schema.location?.name || "—";
      const upd = new Date(schema.updated_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      m.textContent = `${schema.company_name || ""} · ${loc} · Updated ${upd}`;
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
      const nodes = Array.from(tmp.childNodes);
      c.innerHTML = "";
      if (nodes.length) {
        c.append(buildJobDetailsAccordion(nodes));
      }
    }
  }

  function ensureJobAccordionStyles() {
    if (document.getElementById("gh-job-accordion-styles")) return;
    const style = document.createElement("style");
    style.id = "gh-job-accordion-styles";
    style.textContent = `
      .gh-job-accordion{
        border:1px solid rgba(16,24,40,0.12);
        border-radius:16px;
        background:#fff;
        transition:border-color .2s ease;
      }
      .gh-job-accordion:hover,
      .gh-job-accordion.open{
        border-color:#ff5c3580;
      }
      .gh-job-accordion-toggle{
        width:100%;
        border:0;
        background:transparent;
        padding:24px 32px;
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
        font-size:1.25rem;
        font-weight:600;
        color:#2f2418;
        margin-bottom:4px;
      }
      .gh-job-accordion-subtitle{
        font-size:1rem;
        color:#5f4c39;
        opacity:0.8;
      }
      .gh-job-accordion-caret{
        width:32px;
        height:32px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        transition:transform .2s ease;
      }
      .gh-job-accordion.open .gh-job-accordion-caret{
        transform:rotate(180deg);
      }
      .gh-job-accordion-caret svg{
        width:18px;
        height:18px;
        stroke:#ff5c35;
      }
      .gh-job-accordion-body{
        overflow:hidden;
        max-height:0;
        border-top:1px solid rgba(47,36,24,0.1);
        transition:max-height .35s ease;
      }
      .gh-job-accordion-inner{
        padding:24px 32px 32px;
      }
    `;
    document.head.appendChild(style);
  }

  function buildJobDetailsAccordion(contentNodes) {
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

    const subtitle = document.createElement("div");
    subtitle.className = "gh-job-accordion-subtitle";
    subtitle.textContent = JOB_DETAILS_SUBTITLE;

    textWrap.append(title, subtitle);

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

  // ---------- TAG PICKER ----------
  function tagPicker(name, options, required) {
    const shell = document.createElement("div");
    shell.className = "tagpicker";
    shell.dataset.required = required ? "1" : "0";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "tagpicker-input";
    input.placeholder = "Type to search…";

    const hidden = document.createElement("div");
    hidden.style.display = "none";

    const pop = document.createElement("div");
    pop.style.position = "relative";
    pop.style.width = "100%";
    const list = document.createElement("div");
    list.className = "tagpicker-list";
    list.setAttribute("role", "listbox");
    pop.appendChild(list);

    const selected = new Map(); // value -> label

    const render = () => {
      const q = input.value.trim().toLowerCase();
      const avail = options.filter(
        (o) =>
          !selected.has(String(o.value)) &&
          (q === "" || o.label.toLowerCase().includes(q))
      );
      list.innerHTML = "";
      avail.forEach((o) => {
        const it = document.createElement("div");
        it.className = "tagpicker-option";
        it.textContent = o.label;
        it.onclick = () => add(String(o.value), o.label);
        list.appendChild(it);
      });
      list.classList.toggle("open", avail.length > 0);
    };

    const add = (v, l) => {
      if (selected.has(v)) return;
      selected.set(v, l);
      const pill = document.createElement("span");
      pill.className = "tag";
      pill.textContent = l;
      const x = document.createElement("button");
      x.type = "button";
      x.textContent = "×";
      x.onclick = () => remove(v);
      pill.appendChild(x);
      shell.insertBefore(pill, input);

      const hid = document.createElement("input");
      hid.type = "hidden";
      hid.name = name;
      hid.value = v;
      hid.dataset.tokenFor = v;
      hidden.appendChild(hid);

      input.value = "";
      input.setCustomValidity("");
      render();
      shell.dispatchEvent(
        new CustomEvent("tagpickerchange", { bubbles: true })
      );
    };

    const remove = (v) => {
      if (!selected.has(v)) return;
      selected.delete(v);
      hidden
        .querySelector(`input[data-token-for="${CSS.escape(v)}"]`)
        ?.remove();
      [...shell.querySelectorAll(".tag")]
        .find(
          (p) =>
            p.textContent.replace("×", "").trim() ===
            options.find((o) => String(o.value) === String(v))?.label
        )
        ?.remove();
      render();
      if (required && selected.size === 0)
        input.setCustomValidity("Please select at least one option.");
      shell.dispatchEvent(
        new CustomEvent("tagpickerchange", { bubbles: true })
      );
    };

    input.addEventListener("focus", render);
    input.addEventListener("input", render);
    document.addEventListener("click", (e) => {
      if (!shell.contains(e.target)) list.classList.remove("open");
    });
    shell.addEventListener("click", () => input.focus());

    shell.append(input, hidden, pop);
    shell.getSelectedCount = () => selected.size;
    shell.dataset.fieldName = name;
    shell.checkValidity = () => {
      if (required && selected.size === 0) {
        input.setCustomValidity("Please select at least one option.");
        input.reportValidity();
        return false;
      }
      input.setCustomValidity("");
      return true;
    };
    shell.getSelectedValues = () => Array.from(selected.keys());
    shell.setSelectedValues = (values = []) => {
      const desired = new Set(values.map((v) => String(v)));
      [...selected.keys()].forEach((v) => {
        if (!desired.has(v)) remove(v);
      });
      values.forEach((v) => {
        const match = options.find((o) => String(o.value) === String(v));
        if (match) add(String(match.value), match.label);
      });
    };
    return shell;
  }

  // ---------- FIELD FACTORY ----------
  function control(field, required, label) {
    if (field.type === "input_text") {
      // Check if this is a state field and convert to dropdown
      if (label && label.toLowerCase().includes("what state you are located")) {
        const el = document.createElement("select");
        el.name = field.name;
        if (required) el.required = true;

        // Add default "Select" option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        el.appendChild(defaultOption);

        // Add US states
        const states = [
          "Alabama",
          "Alaska",
          "Arizona",
          "Arkansas",
          "California",
          "Colorado",
          "Connecticut",
          "Delaware",
          "Florida",
          "Georgia",
          "Hawaii",
          "Idaho",
          "Illinois",
          "Indiana",
          "Iowa",
          "Kansas",
          "Kentucky",
          "Louisiana",
          "Maine",
          "Maryland",
          "Massachusetts",
          "Michigan",
          "Minnesota",
          "Mississippi",
          "Missouri",
          "Montana",
          "Nebraska",
          "Nevada",
          "New Hampshire",
          "New Jersey",
          "New Mexico",
          "New York",
          "North Carolina",
          "North Dakota",
          "Ohio",
          "Oklahoma",
          "Oregon",
          "Pennsylvania",
          "Rhode Island",
          "South Carolina",
          "South Dakota",
          "Tennessee",
          "Texas",
          "Utah",
          "Vermont",
          "Virginia",
          "Washington",
          "West Virginia",
          "Wisconsin",
          "Wyoming",
          "District of Columbia",
        ];

        states.forEach((state) => {
          const option = document.createElement("option");
          option.value = state;
          option.textContent = state;
          el.appendChild(option);
        });

        return addWF(el);
      }

      // Regular text input for non-state fields
      const el = document.createElement("input");
      el.type = "text";
      el.name = field.name;
      if (required) el.required = true;

      // Add validation for Registered Dietitian ID Number
      if (
        label &&
        label.toLowerCase().includes("registered dietitian id number")
      ) {
        el.pattern = "[0-9]{5,8}";
        el.title = "Please enter a 5 to 8 digit number";
        el.addEventListener("input", function () {
          const value = this.value.replace(/\D/g, ""); // Remove non-digits
          this.value = value;

          // Validate length
          if (value.length > 0 && (value.length < 5 || value.length > 8)) {
            this.setCustomValidity("Please enter a 5 to 8 digit number");
          } else {
            this.setCustomValidity("");
          }
        });
      }

      return addWF(el);
    }
    if (field.type === "textarea") {
      // Skip resume_text field - we only want file upload for resume
      if (field.name === "resume_text") {
        return null;
      }
      const el = document.createElement("textarea");
      el.name = field.name;
      if (required) el.required = true;
      return addWF(el);
    }
    if (field.type === "input_file") {
      const el = document.createElement("input");
      el.type = "file";
      el.name = field.name;
      // Add file type validation for resume field
      if (field.name === "resume") {
        el.accept = ".pdf,.doc,.docx,.txt,.rtf";
        el.addEventListener("change", function () {
          const file = this.files[0];
          if (file) {
            const allowedTypes = [
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "text/plain",
              "application/rtf",
            ];

            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!allowedTypes.includes(file.type)) {
              showValidationError(
                this,
                "Please upload a PDF, Word document, or text file (.pdf, .doc, .docx, .txt, .rtf)"
              );
              this.value = ""; // Clear the invalid file
            } else if (file.size > maxSize) {
              showValidationError(this, "File size must be less than 10MB");
              this.value = ""; // Clear the oversized file
            } else {
              clearValidationError(this);
            }
          }
        });
      }
      return addWF(el);
    }
    if (field.type === "multi_value_single_select") {
      const el = document.createElement("select");
      el.name = field.name;
      if (required) el.required = true;

      // Add default "Select" option
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Select";
      defaultOption.disabled = true;
      defaultOption.selected = true;
      el.appendChild(defaultOption);

      // Add actual field values
      (field.values || []).forEach((v) => {
        const o = document.createElement("option");
        o.value = v.value;
        o.textContent = v.label;
        el.appendChild(o);
      });
      return addWF(el);
    }
    if (field.type === "multi_value_multi_select") {
      const opts = (field.values || []).map((v) => ({
        value: String(v.value),
        label: v.label,
      }));
      return tagPicker(field.name, opts, required);
    }
  }

  let isRestoringFromStorage = false;

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

  function saveFormData(form) {
    if (isRestoringFromStorage) return;
    const storage = getStorage();
    if (!storage) return;
    const grouped = {};
    Array.from(form.elements).forEach((el) => {
      if (!el.name || el.disabled || el.type === "file") return;
      const name = el.name;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(el);
    });

    const payload = { fields: {} };
    Object.entries(grouped).forEach(([name, elements]) => {
      const first = elements[0];
      if (elements.every((el) => el.type === "hidden")) {
        const vals = elements.map((el) => el.value).filter((v) => v !== "");
        payload.fields[name] = vals;
      } else if (first.type === "checkbox") {
        const vals = elements
          .filter((el) => el.checked)
          .map((el) => el.value);
        payload.fields[name] = vals;
      } else if (first.type === "radio") {
        const checked = elements.find((el) => el.checked);
        if (checked) payload.fields[name] = checked.value;
      } else if (first.tagName === "SELECT" && first.multiple) {
        payload.fields[name] = Array.from(first.selectedOptions).map(
          (opt) => opt.value
        );
      } else {
        payload.fields[name] = first.value;
      }
    });

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Unable to persist form data", err);
    }
  }

  function restoreFormData(form) {
    const storage = getStorage();
    if (!storage) return;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn("Unable to parse saved form data", err);
      return;
    }
    const fields = parsed?.fields;
    if (!fields) return;

    isRestoringFromStorage = true;
    try {
      Object.entries(fields).forEach(([name, value]) => {
        const inputs = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
        if (!inputs.length) return;
        const first = inputs[0];
        if (inputs.length > 1 && first.type === "checkbox") {
          const vals = Array.isArray(value) ? value : [value];
          inputs.forEach((input) => {
            input.checked = vals.includes(input.value);
          });
          return;
        }
        if (inputs.length > 1 && first.type === "radio") {
          inputs.forEach((input) => {
            input.checked = input.value === value;
          });
          return;
        }
        if (first.tagName === "SELECT") {
          if (first.multiple && Array.isArray(value)) {
            Array.from(first.options).forEach((opt) => {
              opt.selected = value.includes(opt.value);
            });
          } else if (typeof value === "string") {
            first.value = value;
          }
          return;
        }
        if (first.type === "hidden") {
          return;
        }
        if (typeof first.value === "string" && typeof value === "string") {
          first.value = value;
        }
      });

      form.querySelectorAll(".tagpicker").forEach((picker) => {
        const hiddenInput = picker.querySelector('input[type="hidden"]');
        const name = picker.dataset.fieldName || hiddenInput?.name;
        if (!name) return;
        const saved = fields[name];
        if (!saved) return;
        const values = Array.isArray(saved) ? saved : [saved];
        if (picker.setSelectedValues) picker.setSelectedValues(values);
      });
    } finally {
      isRestoringFromStorage = false;
    }
  }

  function clearSavedFormData() {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Unable to clear saved form data", err);
    }
  }

  const leadSyncState = {
    inProgressTimer: null,
    lastSignature: {},
    inProgressInFlight: false,
    inProgressNeedsRun: false,
    pendingForm: null,
  };

  function getLeadPayload(form) {
    if (!form) return null;
    const firstName =
      form.querySelector('input[name="first_name"]')?.value?.trim() || "";
    const lastName =
      form.querySelector('input[name="last_name"]')?.value?.trim() || "";
    let name = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (!name) {
      const fallbackSelectors = [
        'input[name="name"]',
        'input[name="full_name"]',
        'input[name="applicant_name"]',
        'input[name="preferred_name"]',
      ];
      for (const selector of fallbackSelectors) {
        const val = form.querySelector(selector)?.value?.trim();
        if (val) {
          name = val;
          break;
        }
      }
    }
    if (!name) {
      const anyNameInput = Array.from(form.querySelectorAll("input[name]"))
        .filter((el) => /name/i.test(el.name || ""))
        .find((el) => el.value?.trim());
      if (anyNameInput) name = anyNameInput.value.trim();
    }

    const rawEmail =
      form.querySelector('input[name="email"]')?.value?.trim().toLowerCase() ||
      "";
    const email =
      rawEmail &&
      !hasInvalidEmailChars(rawEmail) &&
      validateEmail(rawEmail)
        ? rawEmail
        : "";

    const rawPhone = form.querySelector('input[name="phone"]')?.value?.trim() ||
      "";
    const phone =
      rawPhone && validateUSPhone(rawPhone)
        ? rawPhone
        : "";

    return {
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
    };
  }

  function queueLeadSyncInProgress(form) {
    if (!form || !LEAD_ENDPOINT) return;
    const payload = getLeadPayload(form);
    if (!payload || (!payload.email && !payload.phone)) {
      clearTimeout(leadSyncState.inProgressTimer);
      leadSyncState.inProgressTimer = null;
      leadSyncState.pendingForm = null;
      return;
    }
    leadSyncState.pendingForm = form;
    clearTimeout(leadSyncState.inProgressTimer);
    leadSyncState.inProgressTimer = setTimeout(() => {
      leadSyncState.inProgressTimer = null;
      triggerQueuedLeadSync();
    }, 400);
  }

  function triggerQueuedLeadSync() {
    if (leadSyncState.inProgressInFlight) {
      leadSyncState.inProgressNeedsRun = true;
      return;
    }
    if (!leadSyncState.pendingForm) return;
    leadSyncState.inProgressInFlight = true;
    syncLeadStatus(leadSyncState.pendingForm, LEAD_STATUS.IN_PROGRESS)
      .catch(() => {})
      .finally(() => {
        leadSyncState.inProgressInFlight = false;
        if (leadSyncState.inProgressNeedsRun) {
          leadSyncState.inProgressNeedsRun = false;
          triggerQueuedLeadSync();
        }
      });
  }

  async function syncLeadStatus(form, status) {
    if (!form || !LEAD_ENDPOINT) return false;
    const payload = getLeadPayload(form);
    if (!payload) return false;
    const body = { status };
    if (payload.name) body.name = payload.name;
    if (payload.email) body.email = payload.email;
    if (payload.phone) body.phone = payload.phone;
    if (!body.email && !body.phone) return false;

    const signature = JSON.stringify(body);
    if (leadSyncState.lastSignature[status] === signature) return false;

    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: status === LEAD_STATUS.SUBMITTED,
      });
      if (!resp.ok) {
        const errTxt = await resp.text().catch(() => "");
        console.warn("Lead sync failed", errTxt || resp.status);
        return false;
      }
      leadSyncState.lastSignature[status] = signature;
      return true;
    } catch (err) {
      console.warn("Lead sync error", err);
      return false;
    }
  }

  // ---------- BUILD FORM ----------
  function buildForm(schema) {
    const form = document.createElement("form");
    form.id = "gh-form";
    form.enctype = "multipart/form-data";

    // hidden job id (Job Board API expects it)
    const hid = document.createElement("input");
    hid.type = "hidden";
    hid.name = "id";
    hid.value = schema.id;
    form.appendChild(hid);

    // Greenhouse questions
    [...(schema.location_questions || []), ...(schema.questions || [])].forEach(
      (q) => {
        const block = document.createElement("div");
        block.className = "gh-field";
        if (q.label) {
          const lab = document.createElement("label");
          lab.textContent = q.label + (q.required ? " *" : "");
          block.appendChild(lab);
        }
        (q.fields || []).forEach((f) => {
          const el = control(f, q.required, q.label);
          if (el) {
            block.appendChild(el);
          }
        });
        if (q.description) {
          const help = document.createElement("div");
          help.className = "gh-help";
          help.innerHTML = q.description;
          block.appendChild(help);
        }

        // Add subtext for state field (more specific detection) - after all fields
        if (
          q.label &&
          q.label.toLowerCase().includes("what state you are located")
        ) {
          const subtext = document.createElement("div");
          subtext.className = "gh-help";
          subtext.textContent =
            "We can only work with Dietitians based in the US currently.";
          block.appendChild(subtext);
        }

        form.appendChild(block);
      }
    );

    // submit
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.textContent = "Apply";
    btn.classList.add("btn", "w-button", "larger");
    form.appendChild(btn);

    // resume rule: file upload only
    const f = form.querySelector('input[name="resume"]');
    if (f) f.required = true;

    // Add real-time validation and formatting for phone and email
    const phoneInput = form.querySelector('input[name="phone"]');
    if (phoneInput) {
      // Set placeholder
      phoneInput.placeholder = "555-123-4567";

      phoneInput.addEventListener("input", function () {
        const cursorPosition = this.selectionStart;
        const oldValue = this.value;
        const formattedValue = formatPhoneNumber(this.value);

        // Only update if value actually changed to avoid cursor jumping
        if (formattedValue !== oldValue) {
          this.value = formattedValue;

          // Adjust cursor position after formatting
          let newCursorPosition = cursorPosition;

          // If we added characters (dashes), move cursor forward
          if (formattedValue.length > oldValue.length) {
            newCursorPosition =
              cursorPosition + (formattedValue.length - oldValue.length);
          }
          // If we're at a dash position, move cursor past it
          if (formattedValue[newCursorPosition] === "-") {
            newCursorPosition++;
          }

          this.setSelectionRange(newCursorPosition, newCursorPosition);
        }

        // Only clear errors while typing, don't show new errors
        if (!this.value.trim() || validateUSPhone(this.value)) {
          clearValidationError(this);
        }
      });

      phoneInput.addEventListener("keydown", function (e) {
        // Handle backspace to remove dashes properly
        if (e.key === "Backspace") {
          const cursorPosition = this.selectionStart;
          const value = this.value;

          // If cursor is right after a dash, move it back to delete the digit before the dash
          if (cursorPosition > 0 && value[cursorPosition - 1] === "-") {
            setTimeout(() => {
              const newValue = formatPhoneNumber(this.value);
              this.value = newValue;
              // Position cursor appropriately
              const newCursorPos = Math.max(0, cursorPosition - 1);
              this.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
          }
        }
      });

      phoneInput.addEventListener("blur", function () {
        if (this.value.trim()) {
          if (!validateUSPhone(this.value)) {
            showValidationError(
              this,
              "Please enter a valid US phone number (e.g., 555-123-4567)"
            );
          } else {
            clearValidationError(this);
          }
        } else {
          clearValidationError(this);
        }
      });
    }

    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
      emailInput.addEventListener("blur", function () {
        if (this.value.trim()) {
          if (hasInvalidEmailChars(this.value)) {
            showValidationError(
              this,
              'Email addresses cannot include spaces or "/" characters'
            );
          } else if (!validateEmail(this.value)) {
            showValidationError(this, "Please enter a valid email address");
          } else {
            clearValidationError(this);
          }
        } else {
          clearValidationError(this);
        }
      });

      emailInput.addEventListener("input", function () {
        // Clear error on input to give immediate feedback when they start typing correctly
        const trimmed = this.value.trim();
        if (trimmed && hasInvalidEmailChars(trimmed)) {
          showValidationError(
            this,
            'Email addresses cannot include spaces or "/" characters'
          );
          return;
        }
        if (trimmed && validateEmail(trimmed)) {
          clearValidationError(this);
        } else if (!trimmed) {
          clearValidationError(this);
        }
      });
    }

    // Add real-time validation for RD ID
    const rdIdInputs = form.querySelectorAll('input[pattern="[0-9]{5,8}"]');
    rdIdInputs.forEach((rdIdInput) => {
      rdIdInput.addEventListener("blur", function () {
        if (this.value.trim()) {
          const digits = this.value.replace(/\D/g, "");
          if (digits.length < 5 || digits.length > 8) {
            showValidationError(this, "Please enter a 5 to 8 digit number");
          } else {
            clearValidationError(this);
          }
        } else {
          clearValidationError(this);
        }
      });

      rdIdInput.addEventListener("input", function () {
        // Clear error if valid or empty
        const digits = this.value.replace(/\D/g, "");
        if (!this.value.trim() || (digits.length >= 5 && digits.length <= 8)) {
          clearValidationError(this);
        }
      });
    });

    const leadSyncInputs = [
      'input[name="first_name"]',
      'input[name="last_name"]',
      'input[name="name"]',
      'input[name="full_name"]',
      'input[name="preferred_name"]',
      'input[name="email"]',
      'input[name="phone"]',
    ]
      .map((selector) => form.querySelector(selector))
      .filter(Boolean);
    if (leadSyncInputs.length) {
      const handleLeadFieldChange = () => queueLeadSyncInProgress(form);
      leadSyncInputs.forEach((input) => {
        input.addEventListener("input", handleLeadFieldChange);
        input.addEventListener("change", handleLeadFieldChange);
        input.addEventListener("blur", handleLeadFieldChange);
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Prevent double submission
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && submitBtn.disabled) return;

      // Disable submit button and show loading state
      let originalText = "";
      if (submitBtn) {
        submitBtn.disabled = true;
        originalText = submitBtn.textContent;
        submitBtn.textContent = "Submitting...";
      }

      // Check tagpicker validation first
      const bad = [...form.querySelectorAll(".tagpicker")].find(
        (tp) => tp.dataset.required === "1" && tp.getSelectedCount?.() === 0
      );
      if (bad) {
        bad.checkValidity?.();
        resetSubmitButton();
        return;
      }

      // Validate phone and email
      let hasValidationErrors = false;

      // Phone validation
      const phoneInput = form.querySelector('input[name="phone"]');
      if (phoneInput && phoneInput.value.trim()) {
        if (!validateUSPhone(phoneInput.value)) {
          showValidationError(
            phoneInput,
            "Please enter a valid US phone number (e.g., 555-123-4567)"
          );
          hasValidationErrors = true;
        } else {
          clearValidationError(phoneInput);
        }
      }

      // Email validation
      const emailInput = form.querySelector('input[name="email"]');
      if (emailInput && emailInput.value.trim()) {
        if (!validateEmail(emailInput.value)) {
          showValidationError(emailInput, "Please enter a valid email address");
          hasValidationErrors = true;
        } else {
          clearValidationError(emailInput);
        }
      }

      // RD ID validation
      const rdIdInputs = form.querySelectorAll('input[pattern="[0-9]{5,8}"]');
      rdIdInputs.forEach((rdIdInput) => {
        if (rdIdInput.value.trim()) {
          const digits = rdIdInput.value.replace(/\D/g, "");
          if (digits.length < 5 || digits.length > 8) {
            showValidationError(
              rdIdInput,
              "Please enter a 5 to 8 digit number"
            );
            hasValidationErrors = true;
          } else {
            clearValidationError(rdIdInput);
          }
        }
      });

      // Stop submission if there are validation errors
      if (hasValidationErrors) {
        resetSubmitButton();
        return;
      }

      const fd = new FormData(form);
      try {
        // First submission
        const resp = await fetch(`${PROXY}/apply${location.search || ""}`, {
          method: "POST",
          body: fd,
        });
        const text = await resp.text();
        if (resp.ok) {
          // Application submitted successfully - track event then redirect
          console.log("Application submitted successfully:", JSON.parse(text));
          clearSavedFormData();
          await syncLeadStatus(form, LEAD_STATUS.SUBMITTED);

          const submittedEmail =
            form.querySelector('input[name="email"]')?.value?.trim() || "";
          const submittedPhone =
            form.querySelector('input[name="phone"]')?.value?.trim() || "";
          const e164Phone = formatPhoneNumberForRudderstack(submittedPhone);

          if (
            window.rudderanalytics &&
            typeof window.rudderanalytics.track === "function"
          ) {
            try {
              if (typeof window.rudderanalytics.identify === "function") {
                // Send identify with traits before the tracking event (no userId)
                window.rudderanalytics.identify(undefined, {
                  email: submittedEmail || undefined,
                  phone: e164Phone,
                });
              }
              window.rudderanalytics.track(
                "Dietitian Submit Clicked",
                { email: submittedEmail || undefined, phone: e164Phone },
                {},
                () => {
                  window.location.href = "/dietitian-application/thank-you";
                }
              );
              // Fallback redirect in case callback doesn't fire promptly
              setTimeout(() => {
                if (location.pathname !== "/dietitian-application/thank-you") {
                  window.location.href = "/dietitian-application/thank-you";
                }
              }, 800);
            } catch (e) {
              console.error("RudderStack tracking error:", e);
              window.location.href = "/dietitian-application/thank-you";
            }
          } else {
            console.error(
              "RudderStack not available for tracking: Dietitian Submit Clicked"
            );
            window.location.href = "/dietitian-application/thank-you";
          }
        } else {
          console.error(text);
          alert("Submit error. Please try again.");
          resetSubmitButton();
        }
      } catch (err) {
        console.error(err);
        alert("Network error. Please try again.");
        resetSubmitButton();
      }

      function resetSubmitButton() {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText || "Apply";
        }
      }
    });

    // Add event listeners for tracking
    const allInputs = form.querySelectorAll("input, select, textarea");
    allInputs.forEach((input) => {
      // Track Application Started on first interaction with any field
      input.addEventListener("focus", () => {
        trackApplicationStarted();
      });

      // Track Application Completed on any field change
      const handleValueChange = () => {
        checkApplicationCompleted(form);
        saveFormData(form);
      };

      input.addEventListener("input", handleValueChange);

      input.addEventListener("change", handleValueChange);
    });

    // Special handling for resume upload
    const resumeInput = form.querySelector('input[name="resume"]');
    if (resumeInput) {
      resumeInput.addEventListener("change", function () {
        if (this.files && this.files.length > 0) {
          trackResumeUploaded();
        }
        checkApplicationCompleted(form);
      });
    }

    // Special handling for tag pickers
    const tagPickers = form.querySelectorAll(".tagpicker");
    tagPickers.forEach((tagPicker) => {
      const input = tagPicker.querySelector(".tagpicker-input");
      if (input) {
        input.addEventListener("focus", () => {
          trackApplicationStarted();
        });
      }

      tagPicker.addEventListener("tagpickerchange", () => {
        if (!isRestoringFromStorage) {
          checkApplicationCompleted(form);
        }
        saveFormData(form);
      });
    });

    const mount = document.getElementById("gh-app");
    mount.innerHTML = "";
    mount.appendChild(form);

    restoreFormData(form);
    queueLeadSyncInProgress(form);
  }

  // ---------- UTM CAPTURE ----------
  function captureUTMParams() {
    const utmParams = {};
    const utmKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_creative",
      "utm_term",
      "utm_page",
    ];

    utmKeys.forEach((key) => {
      const value = new URLSearchParams(location.search).get(key);
      if (value) utmParams[key] = value;
    });

    if (Object.keys(utmParams).length > 0) {
      console.log("UTM Parameters captured:", utmParams);
    }

    return utmParams;
  }

  // ---------- EVENT TRACKING ----------
  let applicationStartedTracked = false;
  let resumeUploadedTracked = false;
  let applicationCompletedTracked = false;

  function trackEvent(eventName, properties = {}) {
    if (
      window.rudderanalytics &&
      typeof window.rudderanalytics.track === "function"
    ) {
      window.rudderanalytics.track(eventName, properties);
    }
  }

  function trackApplicationStarted() {
    if (!applicationStartedTracked) {
      trackEvent("Application Started");
      applicationStartedTracked = true;
    }
  }

  function trackResumeUploaded() {
    if (!resumeUploadedTracked) {
      trackEvent("Resume Uploaded");
      resumeUploadedTracked = true;
    }
  }

  function checkApplicationCompleted(form) {
    if (applicationCompletedTracked) return;

    // Check if all required fields are filled
    const requiredInputs = form.querySelectorAll(
      "input[required], select[required], textarea[required]"
    );
    const requiredTagPickers = form.querySelectorAll(
      '.tagpicker[data-required="1"]'
    );

    let allFieldsValid = true;

    // Check regular required inputs
    requiredInputs.forEach((input) => {
      if (input.type === "file") {
        if (!input.files || input.files.length === 0) {
          allFieldsValid = false;
        }
      } else if (!input.value.trim()) {
        allFieldsValid = false;
      }
    });

    // Check required tag pickers
    requiredTagPickers.forEach((tagPicker) => {
      if (tagPicker.getSelectedCount && tagPicker.getSelectedCount() === 0) {
        allFieldsValid = false;
      }
    });

    if (allFieldsValid) {
      trackEvent("Application Completed");
      applicationCompletedTracked = true;
    }
  }

  // ---------- INIT ----------
  const schema = await getSchema(); // if this throws, check console/network for the GET
  renderHeader(schema);
  buildForm(schema);

  // Capture UTM params for debugging
  captureUTMParams();
})();
