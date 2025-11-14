var __defProp = Object.defineProperty;
var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });

// greenhouse-worker.js
var greenhouse_worker_default = {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Max-Age": "86400",
    };
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST")
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    const jbAuth = "Basic " + btoa((env.GH_JOB_BOARD_API_KEY || "") + ":");
    const hvAuth = "Basic " + btoa((env.GH_HARVEST_API_KEY || "") + ":");
    const obo = env.GH_ON_BEHALF_USER_ID;
    const json = /* @__PURE__ */ __name(
      (data, status = 200) =>
        new Response(JSON.stringify(data), {
          status,
          headers: { ...cors, "Content-Type": "application/json" },
        }),
      "json"
    );
    const fail = /* @__PURE__ */ __name(
      (message, status = 400, extra = void 0) =>
        json({ ok: false, message, ...(extra ? { extra } : {}) }, status),
      "fail"
    );
    try {
      const url = new URL(req.url);
      // Webhook endpoint for Greenhouse → verifies secret and patches UTM fields
      if (url.pathname === "/gh-webhook") {
        const token =
          req.headers.get("X-Greenhouse-Token") ||
          req.headers.get("x-greenhouse-token");
        const signatureHeader =
          req.headers.get("signature") || req.headers.get("Signature");
        if (!env.GH_WEBHOOK_SECRET)
          return fail("Missing GH_WEBHOOK_SECRET on server", 500);

        // Read raw body once for signature verification and JSON parsing
        const rawBody = await req.text().catch(() => "");

        // Verify either simple token match or HMAC SHA-256 signature
        async function verifySignature() {
          if (token && token === env.GH_WEBHOOK_SECRET) return true;
          if (
            signatureHeader &&
            signatureHeader.startsWith("sha256 ") &&
            rawBody
          ) {
            const expected = signatureHeader.slice(7).trim();
            const enc = new TextEncoder();
            const key = await crypto.subtle.importKey(
              "raw",
              enc.encode(env.GH_WEBHOOK_SECRET),
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"]
            );
            const sig = await crypto.subtle.sign(
              "HMAC",
              key,
              enc.encode(rawBody)
            );
            const hex = Array.from(new Uint8Array(sig))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            return hex === expected;
          }
          return false;
        }

        if (!(await verifySignature())) return fail("Unauthorized", 401);

        let body = {};
        try {
          body = rawBody ? JSON.parse(rawBody) : {};
        } catch {}
        const payload = body.payload || body;
        const applicationId = String(
          payload?.application_id || payload?.application?.id || ""
        );
        const candidateId = String(
          payload?.candidate_id ||
            payload?.application?.candidate_id ||
            payload?.candidate?.id ||
            ""
        );

        // Handle Greenhouse test ping (sent when creating a webhook)
        if (!applicationId) {
          return json({
            ok: true,
            ping: true,
            note: "No application_id in payload; likely webhook test ping.",
          });
        }

        // If we have UTM data stored in KV by email, look it up and patch now
        async function fetchPrimaryEmailByCandidateId(id) {
          const hvAuth = "Basic " + btoa((env.GH_HARVEST_API_KEY || "") + ":");
          const obo = env.GH_ON_BEHALF_USER_ID;
          if (!id || !env.GH_HARVEST_API_KEY || !obo) return null;
          const r = await fetch(
            `https://harvest.greenhouse.io/v1/candidates/${id}`,
            {
              headers: { Authorization: hvAuth, "On-Behalf-Of": obo },
            }
          );
          if (!r.ok) return null;
          const c = await r.json().catch(() => null);
          const emails = Array.isArray(c?.email_addresses)
            ? c.email_addresses
            : [];
          const primary =
            emails.find(
              (e) =>
                e?.value &&
                (e?.type === "work" ||
                  e?.type === "personal" ||
                  e?.type === "other")
            ) || emails[0];
          return primary?.value || null;
        }

        let email = (payload?.candidate?.email || payload?.email || "").trim();
        if (!email && candidateId) {
          email = (await fetchPrimaryEmailByCandidateId(candidateId)) || "";
        }

        let patched = false;
        if (email && env.UTM_STORAGE) {
          const kvKey = `utm:${email.trim().toLowerCase()}`;
          const utmStr = await env.UTM_STORAGE.get(kvKey);
          if (utmStr) {
            const data = JSON.parse(utmStr);
            const fields = Array.isArray(data?.custom_fields)
              ? data.custom_fields
              : [];
            if (fields.length > 0) {
              const hvAuth =
                "Basic " + btoa((env.GH_HARVEST_API_KEY || "") + ":");
              const obo = env.GH_ON_BEHALF_USER_ID;
              const r = await fetch(
                `https://harvest.greenhouse.io/v1/applications/${applicationId}`,
                {
                  method: "PATCH",
                  headers: {
                    Authorization: hvAuth,
                    "On-Behalf-Of": obo,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ custom_fields: fields }),
                }
              );
              if (r.ok) {
                patched = true;
                await env.UTM_STORAGE.delete(kvKey);
              }
            }
          }
        }

        return json({
          ok: true,
          applicationId,
          candidateId: candidateId || null,
          patched,
        });
      }
      if (url.pathname === "/leads") {
        if (
          !env.AIRTABLE_TOKEN ||
          !env.AIRTABLE_BASE_ID ||
          !env.AIRTABLE_TABLE_NAME
        ) {
          return fail("Airtable configuration missing", 500);
        }
        const body = await req.json().catch(() => ({}));
        const rawName = String(body.name || "").trim();
        const rawEmail = String(body.email || "").trim().toLowerCase();
        const rawPhone = String(body.phone || "").trim();
        const rawStatus = String(body.status || "").trim();
        const allowedStatuses = new Set([
          "In progress",
          "Application Submitted",
        ]);
        const status = allowedStatuses.has(rawStatus)
          ? rawStatus
          : "In progress";
        if (!rawEmail && !rawPhone)
          return fail("Email or phone required for lead tracking");

        const normalizedPhone = rawPhone.replace(/\D/g, "");
        const escapeFormulaValue = (val = "") => val.replace(/'/g, "''");
        const filters = [];
        if (rawEmail) {
          filters.push(
            `LOWER({Email})='${escapeFormulaValue(rawEmail.toLowerCase())}'`
          );
        }
        if (normalizedPhone) {
          filters.push(
            `REGEX_REPLACE({Phone}, '[^0-9]', '')='${escapeFormulaValue(
              normalizedPhone
            )}'`
          );
        }

        let recordId = null;
        let existingStatus = "";
        if (filters.length > 0) {
          const filterFormula =
            filters.length === 1
              ? filters[0]
              : `OR(${filters.join(",")})`;
          const searchUrl = new URL(
            `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(
              env.AIRTABLE_TABLE_NAME
            )}`
          );
          searchUrl.searchParams.set("filterByFormula", filterFormula);
          searchUrl.searchParams.set("maxRecords", "1");
          const lookResp = await fetch(searchUrl, {
            headers: {
              Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
            },
          });
          if (!lookResp.ok) {
            const errTxt = await lookResp.text();
            return fail("Airtable lookup failed", lookResp.status, errTxt);
          }
          const lookupJson = await lookResp.json().catch(() => ({}));
          const firstRecord = Array.isArray(lookupJson.records)
            ? lookupJson.records[0]
            : null;
          if (firstRecord) {
            recordId = firstRecord.id;
            existingStatus = String(firstRecord.fields?.Status || "");
          }
        }

        const fields = {};
        if (rawName) fields["Name"] = rawName;
        if (rawEmail) fields["Email"] = rawEmail;
        if (rawPhone) fields["Phone"] = rawPhone;
        if (
          status === "Application Submitted" ||
          existingStatus !== "Application Submitted"
        ) {
          fields["Status"] = status;
        }

        if (Object.keys(fields).length === 0) {
          return json({ ok: true, skipped: true, reason: "No fields to sync" });
        }

        const airtableUrlBase = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(
          env.AIRTABLE_TABLE_NAME
        )}`;
        const headers = {
          Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        };
        let apiResp;
        if (recordId) {
          apiResp = await fetch(`${airtableUrlBase}/${recordId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ fields }),
          });
        } else {
          apiResp = await fetch(airtableUrlBase, {
            method: "POST",
            headers,
            body: JSON.stringify({ fields }),
          });
        }
        if (!apiResp.ok) {
          const txt = await apiResp.text();
          return fail("Airtable write failed", apiResp.status, txt);
        }
        const result = await apiResp.json().catch(() => ({}));
        return json({
          ok: true,
          action: recordId ? "updated" : "created",
          recordId: result.id || recordId || null,
        });
      }
      if (url.pathname === "/patchByAppId") {
        const body = await req.json().catch(() => ({}));
        const applicationId = String(body.applicationId || "").trim();
        const fields = Array.isArray(body.fields) ? body.fields : [];
        if (!applicationId || fields.length === 0)
          return fail("Need applicationId and fields[]");
        const r = await fetch(
          `https://harvest.greenhouse.io/v1/applications/${applicationId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: hvAuth,
              "On-Behalf-Of": obo,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ custom_fields: fields }),
          }
        );
        const resTxt = await r.text();
        return json({ ok: r.ok, status: r.status, body: resTxt });
      }
      if (url.pathname === "/patchByEmail") {
        const body = await req.json().catch(() => ({}));
        const targetEmail = String(body.email || "").trim();
        const fields = Array.isArray(body.fields) ? body.fields : [];
        if (!targetEmail || fields.length === 0)
          return fail("Need email and fields[]");
        async function harvestGet2(path) {
          const r = await fetch(`https://harvest.greenhouse.io/v1${path}`, {
            headers: { Authorization: hvAuth, "On-Behalf-Of": obo },
          });
          return r.ok
            ? { ok: true, json: await r.json() }
            : { ok: false, text: await r.text(), status: r.status };
        }
        __name(harvestGet2, "harvestGet");
        const c = await harvestGet2(
          `/candidates?email=${encodeURIComponent(targetEmail)}`
        );
        if (!c.ok)
          return json(
            { ok: false, stage: "candidates", status: c.status, body: c.text },
            502
          );
        for (const cand of c.json || []) {
          for (const a of cand.applications || []) {
            const detResp = await harvestGet2(`/applications/${a.id}`);
            if (!detResp.ok) continue;
            const det = detResp.json;
            const matchInternal =
              Array.isArray(det.jobs) &&
              det.jobs.some(
                (j) => String(j.id) === String(env.INTERNAL_JOB_ID)
              );
            const matchPublic = String(det.job_post_id) === String(env.JOB_ID);
            if (!matchInternal && !matchPublic) continue;
            const r = await fetch(
              `https://harvest.greenhouse.io/v1/applications/${a.id}`,
              {
                method: "PATCH",
                headers: {
                  Authorization: hvAuth,
                  "On-Behalf-Of": obo,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ custom_fields: fields }),
              }
            );
            const resTxt = await r.text();
            return json({
              ok: r.ok,
              status: r.status,
              body: resTxt,
              applicationId: a.id,
            });
          }
        }
        return json(
          { ok: false, message: "No matching application found for email" },
          404
        );
      }
      const inForm = await req.formData();
      const outForm = new FormData();
      for (const [k, v] of inForm.entries()) outForm.append(k, v);
      const email = inForm.get("email")?.toString().trim();
      if (!email) return fail("Missing email");
      const emailKey = email.toLowerCase();
      const board = env.GH_BOARD_TOKEN;
      const jobIdPublic = String(env.JOB_ID);
      const jobIdInternal = String(env.INTERNAL_JOB_ID);
      if (!board || !env.GH_JOB_BOARD_API_KEY || !env.GH_HARVEST_API_KEY) {
        return fail("Missing env", 500, {
          need: [
            "GH_BOARD_TOKEN",
            "GH_JOB_BOARD_API_KEY",
            "GH_HARVEST_API_KEY",
          ],
        });
      }
      if (!obo) {
        return fail(
          "Missing GH_ON_BEHALF_OF (Greenhouse User ID for writes)",
          500
        );
      }
      async function harvestGet(path) {
        const r = await fetch(`https://harvest.greenhouse.io/v1${path}`, {
          headers: { Authorization: hvAuth, "On-Behalf-Of": obo },
        });
        return {
          ok: r.ok,
          status: r.status,
          json: r.ok ? await r.json() : null,
          text: r.ok ? null : await r.text(),
        };
      }
      __name(harvestGet, "harvestGet");
      async function getAppDetail(id) {
        const r = await harvestGet(`/applications/${id}`);
        return r.ok ? r.json : null;
      }
      __name(getAppDetail, "getAppDetail");
      async function findAppForThisJobByEmail() {
        const c = await harvestGet(
          `/candidates?email=${encodeURIComponent(email)}`
        );
        if (!c.ok) throw new Error(`harvest candidates ${c.status}: ${c.text}`);
        const candidates = Array.isArray(c.json) ? c.json : [];
        for (const cand of candidates) {
          for (const a of cand.applications || []) {
            const det = await getAppDetail(a.id);
            if (!det) continue;
            const matchInternal =
              Array.isArray(det.jobs) &&
              det.jobs.some((j) => String(j.id) === jobIdInternal);
            const matchPublic = String(det.job_post_id) === jobIdPublic;
            if (matchInternal || matchPublic)
              return { app: det, candidateId: cand.id };
          }
        }
        return null;
      }
      __name(findAppForThisJobByEmail, "findAppForThisJobByEmail");
      const submitResp = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobIdPublic}`,
        { method: "POST", headers: { Authorization: jbAuth }, body: outForm }
      );
      const submitTxt = await submitResp.text();
      console.log(
        "Greenhouse Job Board API response:",
        submitResp.status,
        submitTxt
      );
      if (!submitResp.ok) {
        return json(
          {
            ok: false,
            stage: "job_board_submit",
            status: submitResp.status,
            body: submitTxt,
          },
          submitResp.status
        );
      }
      const utmKeys = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_creative",
        "utm_term",
        "utm_page",
      ];
      const custom_fields = utmKeys
        .map((k) => {
          const v = url.searchParams.get(k);
          if (!v) return null;
          const sanitized = v.trim().substring(0, 255);
          if (sanitized.length === 0) return null;
          return { name_key: k, value: sanitized };
        })
        .filter(Boolean);
      const immediateResponse = json({
        ok: true,
        email,
        jobId: Number(jobIdPublic),
        applicationId: null,
        // Will be found in background
        patched: false,
        // Will be patched in background
        note: "Application submitted successfully. UTM parameters will be processed within 2 minutes.",
        utmParams: custom_fields.length > 0 ? custom_fields : null,
      });
      if (custom_fields.length > 0) {
        const utmData = {
          custom_fields,
          timestamp: Date.now(),
        };
        if (env.UTM_STORAGE) {
          await env.UTM_STORAGE.put(
            `utm:${emailKey}`,
            JSON.stringify(utmData),
            {
              expirationTtl: 1800,
              // 30 minutes
            }
          );
        }
        console.log(`Stored UTM data for scheduled worker: ${email}`);

        // Try immediate patch first
        (async () => {
          try {
            const ok = await tryPatchByEmailOnce(
              env,
              emailKey,
              utmData.custom_fields
            );
            if (ok && env.UTM_STORAGE) {
              await env.UTM_STORAGE.delete(`utm:${emailKey}`);
              console.log(`Immediate patch succeeded; KV cleared for ${email}`);
            } else {
              // If immediate patch failed, schedule a retry in 2 minutes
              console.log(
                `Immediate patch failed for ${email}, scheduling retry`
              );
              await scheduleUTMRetry(env, email, 2 * 60); // 2 minutes
            }
          } catch (e) {
            console.log(
              `Immediate patch attempt failed for ${email}:`,
              String(e)
            );
            // Schedule retry on error
            await scheduleUTMRetry(env, email, 2 * 60); // 2 minutes
          }
        })();
      }
      return immediateResponse;
    } catch (err) {
      return json(
        {
          ok: false,
          message: "Worker error",
          error: String(err?.message || err),
        },
        500
      );
    }
  },
  // Scheduled worker for UTM patching - now runs less frequently as backup
  async scheduled(event, env, ctx) {
    console.log("SCHEDULED WORKER TRIGGERED!");

    // Check if we should run (only if there's pending UTM data)
    if (env.UTM_STORAGE) {
      const utmKeys = await env.UTM_STORAGE.list({ prefix: "utm:" });
      if (utmKeys.keys.length === 0) {
        console.log("No pending UTM data found, skipping scheduled run");
        return;
      }
    }

    ctx.waitUntil(handleScheduledUTMPatching(env));
  },
};
async function handleScheduledUTMPatching(env) {
  console.log("Running scheduled UTM patching...");
  const hvAuth = "Basic " + btoa((env.GH_HARVEST_API_KEY || "") + ":");
  const obo = env.GH_ON_BEHALF_USER_ID;
  const jobIdInternal = String(env.INTERNAL_JOB_ID);
  if (!env.UTM_STORAGE) {
    console.log("No UTM_STORAGE KV binding available");
    return;
  }
  const utmKeys = await env.UTM_STORAGE.list({ prefix: "utm:" });
  console.log(`Found ${utmKeys.keys.length} UTM entries to process`);
  for (const key of utmKeys.keys) {
    const email = key.name.replace("utm:", "");
    const utmDataStr = await env.UTM_STORAGE.get(key.name);
    if (!utmDataStr) continue;
    const data = JSON.parse(utmDataStr);
    const now = Date.now();
    const maxAge = 30 * 60 * 1e3;
    if (now - data.timestamp > maxAge) {
      console.log(`Removing old UTM data for ${email}`);
      await env.UTM_STORAGE.delete(key.name);
      continue;
    }
    try {
      const success = await tryPatchByEmailOnce(env, email, data.custom_fields);
      if (success) {
        console.log(
          `Successfully patched UTM for ${email} via scheduled worker`
        );
        await env.UTM_STORAGE.delete(key.name);
      } else {
        console.log(`No application found for ${email}, will retry later`);
      }
    } catch (error) {
      console.error(`Error in scheduled UTM patching for ${email}:`, error);
    }
  }
  console.log(
    `Scheduled UTM patching complete. ${utmKeys.keys.length} items processed.`
  );
}
__name(handleScheduledUTMPatching, "handleScheduledUTMPatching");
async function tryPatchByEmailOnce(env, email, fields) {
  const hvAuth = "Basic " + btoa((env.GH_HARVEST_API_KEY || "") + ":");
  const obo = env.GH_ON_BEHALF_USER_ID;
  const jobIdInternal = String(env.INTERNAL_JOB_ID);
  const jobIdPublic = String(env.JOB_ID);
  async function harvestGet(path) {
    const r = await fetch(`https://harvest.greenhouse.io/v1${path}`, {
      headers: { Authorization: hvAuth, "On-Behalf-Of": obo },
    });
    return r.ok
      ? { ok: true, json: await r.json() }
      : { ok: false, text: await r.text(), status: r.status };
  }
  __name(harvestGet, "harvestGet");
  const c = await harvestGet(`/candidates?email=${encodeURIComponent(email)}`);
  if (!c.ok) return false;
  for (const cand of c.json || []) {
    for (const a of cand.applications || []) {
      const detResp = await harvestGet(`/applications/${a.id}`);
      if (!detResp.ok) continue;
      const det = detResp.json;
      const matchInternal =
        Array.isArray(det.jobs) &&
        det.jobs.some((j) => String(j.id) === jobIdInternal);
      const matchPublic = String(det.job_post_id) === jobIdPublic;
      if (!matchInternal && !matchPublic) continue;
      const r = await fetch(
        `https://harvest.greenhouse.io/v1/applications/${a.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: hvAuth,
            "On-Behalf-Of": obo,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ custom_fields: fields }),
        }
      );
      if (r.ok) return true;
    }
  }
  return false;
}
__name(tryPatchByEmailOnce, "tryPatchByEmailOnce");

// Function to schedule UTM retry using KV storage
async function scheduleUTMRetry(env, email, delaySeconds) {
  if (!env.UTM_STORAGE) return;

  const retryKey = `retry:${email}`;
  const retryData = {
    email,
    timestamp: Date.now(),
    delaySeconds,
  };

  // Store retry info with expiration
  await env.UTM_STORAGE.put(retryKey, JSON.stringify(retryData), {
    expirationTtl: delaySeconds + 60, // Add 1 minute buffer
  });

  console.log(`Scheduled UTM retry for ${email} in ${delaySeconds} seconds`);
}

__name(scheduleUTMRetry, "scheduleUTMRetry");

export { greenhouse_worker_default as default };
//# sourceMappingURL=greenhouse-worker.js.map
