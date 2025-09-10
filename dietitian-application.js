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
  function control(field, required) {
    if (field.type === "input_text") {
      const el = document.createElement("input");
      el.type = "text";
      el.name = field.name;
      if (required) el.required = true;
      return addWF(el);
    }
    if (field.type === "textarea") {
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
        if (q.description) {
          const help = document.createElement("div");
          help.className = "gh-help";
          help.innerHTML = q.description;
          block.appendChild(help);
        }
        (q.fields || []).forEach((f) => {
          const el = control(f, q.required);
          if (el) block.appendChild(el);
        });
        form.appendChild(block);
      }
    );

    // submit
    const btn = document.createElement("button");
    btn.type = "submit";
    btn.textContent = "Apply";
    btn.classList.add("btn", "w-button", "larger");
    form.appendChild(btn);

    // resume rule: either file OR text
    const f = form.querySelector('input[name="resume"]');
    const t = form.querySelector('textarea[name="resume_text"]');

    function sync() {
      const hasFile = f?.files?.length > 0;
      if (t) t.required = !hasFile;
    }
    f?.addEventListener("change", sync);
    sync();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bad = [...form.querySelectorAll(".tagpicker")].find(
        (tp) => tp.dataset.required === "1" && tp.getSelectedCount?.() === 0
      );
      if (bad) {
        bad.checkValidity?.();
        return;
      }

      const fd = new FormData(form);
      try {
        const resp = await fetch(`${PROXY}/apply${location.search || ""}`, {
          method: "POST",
          body: fd,
        });
        const text = await resp.text();
        if (resp.ok) {
          form.replaceWith(
            Object.assign(document.createElement("div"), {
              textContent: "Application submitted. Thank you!",
            })
          );
          // optional: console.log(JSON.parse(text));
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

  // ---------- INIT ----------
  const schema = await getSchema(); // if this throws, check console/network for the GET
  renderHeader(schema);
  buildForm(schema);
})();
