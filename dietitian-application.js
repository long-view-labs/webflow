(async () => {
  // ---------- CONFIG ----------
  const BOARD = "usenourish";
  const JOB_ID = 4007342008; // public job post id
  const PROXY = "https://gh-apply.geminpak.workers.dev"; // your Worker origin
  const JOB_SCHEMA_URL = `https://boards-api.greenhouse.io/v1/boards/${BOARD}/jobs/${JOB_ID}?questions=true`;

  // optional caching
  const CACHE_KEY = `gh_schema_${JOB_ID}`;
  const TTL = 6 * 60 * 60 * 1e3; // 6h

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
      c.innerHTML = "";
      c.append(...tmp.childNodes);
    }
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
    };

    input.addEventListener("focus", render);
    input.addEventListener("input", render);
    document.addEventListener("click", (e) => {
      if (!shell.contains(e.target)) list.classList.remove("open");
    });
    shell.addEventListener("click", () => input.focus());

    shell.append(input, hidden, pop);
    shell.getSelectedCount = () => selected.size;
    shell.checkValidity = () => {
      if (required && selected.size === 0) {
        input.setCustomValidity("Please select at least one option.");
        input.reportValidity();
        return false;
      }
      input.setCustomValidity("");
      return true;
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
          if (!validateEmail(this.value)) {
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
        if (this.value.trim() && validateEmail(this.value)) {
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

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Check tagpicker validation first
      const bad = [...form.querySelectorAll(".tagpicker")].find(
        (tp) => tp.dataset.required === "1" && tp.getSelectedCount?.() === 0
      );
      if (bad) {
        bad.checkValidity?.();
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
        }
      } catch (err) {
        console.error(err);
        alert("Network error. Please try again.");
      }
    });

    const mount = document.getElementById("gh-app");
    mount.innerHTML = "";
    mount.appendChild(form);
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

  // ---------- INIT ----------
  const schema = await getSchema(); // if this throws, check console/network for the GET
  renderHeader(schema);
  buildForm(schema);

  // Capture UTM params for debugging
  captureUTMParams();
})();
