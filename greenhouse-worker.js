const HARVEST_API_BASE = "https://harvest.greenhouse.io/v1";
const JOB_BOARD_BASE = "https://boards-api.greenhouse.io/v1/boards";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_creative",
  "utm_term",
  "utm_page",
];
const LEAD_STATUSES = new Set(["In progress", "Application Submitted"]);

/**
 * Cloudflare Worker entrypoint that routes HTTP requests and scheduled events.
 */
const greenhouse_worker_default = {
  /**
   * Handles inbound HTTP requests and dispatches them to route handlers.
   */
  async fetch(req, env) {
    const { cors, requestId } = createRequestMetadata(req);
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }

    const { json, fail } = createResponders(requestId, cors);
    const auth = buildAuth(env);
    const url = new URL(req.url);

    try {
      if (url.pathname === "/gh-webhook") {
        return handleGhWebhook({ req, env, json, fail, auth });
      }
      if (url.pathname === "/leads") {
        return handleLeadUpsert({ req, env, json, fail });
      }
      if (url.pathname === "/patchByAppId") {
        return handlePatchByAppId({ req, json, fail, auth });
      }
      if (url.pathname === "/patchByEmail") {
        return handlePatchByEmail({ req, env, json, fail, auth });
      }
      return handleApply({ req, env, url, json, fail, auth, requestId });
    } catch (error) {
      console.error(`[gh-apply][${requestId}] Worker error`, error);
      return json(
        {
          ok: false,
          message: "Worker error",
          error: String(error?.message || error),
        },
        500
      );
    }
  },

  /**
   * Periodic Cloudflare Worker cron used for deferred UTM patch attempts.
   */
  async scheduled(event, env, ctx) {
    console.log("SCHEDULED WORKER TRIGGERED!");
    if (env.UTM_STORAGE) {
      const pending = await env.UTM_STORAGE.list({ prefix: "utm:" });
      if (pending.keys.length === 0) {
        console.log("No pending UTM data found, skipping scheduled run");
        return;
      }
    }
    ctx.waitUntil(handleScheduledUTMPatching(env));
  },
};

/**
 * Validates inbound Greenhouse webhooks and patches any stored UTM data.
 */
async function handleGhWebhook({ req, env, json, fail, auth }) {
  const secret = env.GH_WEBHOOK_SECRET;
  if (!secret) {
    return fail("Missing GH_WEBHOOK_SECRET on server", 500);
  }
  const token =
    req.headers.get("X-Greenhouse-Token") ||
    req.headers.get("x-greenhouse-token");
  const signatureHeader =
    req.headers.get("signature") || req.headers.get("Signature");
  const rawBody = await req.text().catch(() => "");
  const verified = await verifyWebhookSignature({
    token,
    signatureHeader,
    rawBody,
    secret,
  });
  if (!verified) {
    return fail("Unauthorized", 401);
  }

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

  if (!applicationId) {
    return json({
      ok: true,
      ping: true,
      note: "No application_id in payload; likely webhook test ping.",
    });
  }

  let email = (payload?.candidate?.email || payload?.email || "").trim();
  if (!email && candidateId) {
    email =
      (await fetchPrimaryEmailByCandidateId(candidateId, env, auth)) || "";
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
        const response = await patchApplicationFields(
          applicationId,
          fields,
          auth
        );
        if (response.ok) {
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

/**
 * Upserts a lead record in Airtable, matching by recordId/email/phone.
 */
async function handleLeadUpsert({ req, env, json, fail }) {
  if (
    !env.AIRTABLE_TOKEN ||
    !env.AIRTABLE_BASE_ID ||
    !env.AIRTABLE_TABLE_NAME
  ) {
    logEvent("error", "Airtable configuration missing", {
      hasToken: Boolean(env.AIRTABLE_TOKEN),
      hasBase: Boolean(env.AIRTABLE_BASE_ID),
      hasTable: Boolean(env.AIRTABLE_TABLE_NAME),
    });
    return fail("Airtable configuration missing", 500);
  }

  const body = await req.json().catch(() => ({}));
  const rawName = String(body.name || "").trim();
  const rawEmail = String(body.email || "").trim().toLowerCase();
  const rawPhone = String(body.phone || "").trim();
  const rawStatus = String(body.status || "").trim();
  const requestedRecordId = String(body.recordId || "").trim();
  const status = LEAD_STATUSES.has(rawStatus) ? rawStatus : "In progress";
  if (!requestedRecordId && !rawEmail && !rawPhone) {
    return fail("Email or phone required for lead tracking");
  }

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

  const airtableUrlBase = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(
    env.AIRTABLE_TABLE_NAME
  )}`;
  const authHeaders = { Authorization: `Bearer ${env.AIRTABLE_TOKEN}` };

  let recordId = requestedRecordId || null;
  let existingStatus = "";
  if (recordId) {
    const recordResp = await fetch(`${airtableUrlBase}/${recordId}`, {
      headers: authHeaders,
    });
    if (recordResp.ok) {
      const recordJson = await recordResp.json().catch(() => ({}));
      existingStatus = String(recordJson.fields?.Status || "");
    } else if (recordResp.status === 404 || recordResp.status === 403) {
      logEvent("warn", "Airtable record id invalid, falling back", {
        status: recordResp.status,
        recordId,
      });
      recordId = null;
    } else {
      const errTxt = await recordResp.text();
      logEvent("error", "Airtable record lookup failed", {
        status: recordResp.status,
        recordId,
        response: errTxt?.slice(0, 500),
      });
      return fail("Airtable lookup failed", recordResp.status, errTxt);
    }
  }

  if (!recordId && filters.length > 0) {
    const filterFormula = filters.length === 1 ? filters[0] : `OR(${filters.join(",")})`;
    const searchUrl = new URL(airtableUrlBase);
    searchUrl.searchParams.set("filterByFormula", filterFormula);
    searchUrl.searchParams.set("maxRecords", "1");
    const lookResp = await fetch(searchUrl, { headers: authHeaders });
    if (!lookResp.ok) {
      const errTxt = await lookResp.text();
      logEvent("error", "Airtable lookup failed", {
        status: lookResp.status,
        filterFormula,
        response: errTxt?.slice(0, 500),
      });
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

  const headers = { ...authHeaders, "Content-Type": "application/json" };
  const payload = JSON.stringify({ fields });
  const apiResp = await fetch(
    recordId ? `${airtableUrlBase}/${recordId}` : airtableUrlBase,
    {
      method: recordId ? "PATCH" : "POST",
      headers,
      body: payload,
    }
  );
  if (!apiResp.ok) {
    const txt = await apiResp.text();
    logEvent("error", "Airtable write failed", {
      status: apiResp.status,
      recordId,
      fields,
      response: txt?.slice(0, 500),
    });
    return fail("Airtable write failed", apiResp.status, txt);
  }
  const result = await apiResp.json().catch(() => ({}));
  logEvent("log", "Airtable lead synced", {
    action: recordId ? "updated" : "created",
    recordId: result.id || recordId || null,
    status,
    email: rawEmail || undefined,
  });
  return json({
    ok: true,
    action: recordId ? "updated" : "created",
    recordId: result.id || recordId || null,
  });
}

/**
 * Directly patches custom fields for a specific application id via Harvest.
 */
async function handlePatchByAppId({ req, json, fail, auth }) {
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.applicationId || "").trim();
  const fields = Array.isArray(body.fields) ? body.fields : [];
  if (!applicationId || fields.length === 0) {
    return fail("Need applicationId and fields[]");
  }
  const response = await patchApplicationFields(applicationId, fields, auth);
  const resTxt = await response.text();
  return json({ ok: response.ok, status: response.status, body: resTxt });
}

/**
 * Finds all applications tied to an email and patches matching job entries.
 */
async function handlePatchByEmail({ req, env, json, fail, auth }) {
  const body = await req.json().catch(() => ({}));
  const targetEmail = String(body.email || "").trim();
  const fields = Array.isArray(body.fields) ? body.fields : [];
  if (!targetEmail || fields.length === 0) {
    return fail("Need email and fields[]");
  }

  const match = await findMatchingApplicationForEmail(targetEmail, env, auth);
  if (match.error) {
    return json({ ok: false, ...match.error }, 502);
  }
  if (!match.applicationId) {
    return json({ ok: false, message: "No matching application found for email" }, 404);
  }

  const response = await patchApplicationFields(match.applicationId, fields, auth);
  const resTxt = await response.text();
  return json({
    ok: response.ok,
    status: response.status,
    body: resTxt,
    applicationId: match.applicationId,
  });
}

/**
 * Proxies the public job board submission and queues UTM data for patching.
 */
async function handleApply({ req, env, url, json, fail, auth, requestId }) {
  const inForm = await req.formData();
  const outForm = cloneFormData(inForm);
  const email = inForm.get("email")?.toString().trim();
  if (!email) {
    return fail("Missing email");
  }
  const emailKey = email.toLowerCase();
  const board = env.GH_BOARD_TOKEN;
  const jobIdPublic = String(env.JOB_ID);

  if (!board || !env.GH_JOB_BOARD_API_KEY || !env.GH_HARVEST_API_KEY) {
    return fail("Missing env", 500, {
      need: ["GH_BOARD_TOKEN", "GH_JOB_BOARD_API_KEY", "GH_HARVEST_API_KEY"],
    });
  }
  if (!auth.obo) {
    return fail(
      "Missing GH_ON_BEHALF_OF (Greenhouse User ID for writes)",
      500
    );
  }

  const submitResp = await fetch(
    `${JOB_BOARD_BASE}/${board}/jobs/${jobIdPublic}`,
    {
      method: "POST",
      headers: { Authorization: auth.jbAuth },
      body: outForm,
    }
  );
  const submitTxt = await submitResp.text();
  console.log("Greenhouse Job Board API response:", submitResp.status, submitTxt);
  if (!submitResp.ok) {
    console.error(`[gh-apply][${requestId}] Job board submission failed`, {
      status: submitResp.status,
      bodySample: submitTxt?.slice(0, 500),
    });
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

  const customFields = extractUtmCustomFields(url.searchParams);
  const immediateResponse = json({
    ok: true,
    email,
    jobId: Number(jobIdPublic),
    applicationId: null,
    patched: false,
    note: "Application submitted successfully. UTM parameters will be processed within 2 minutes.",
    utmParams: customFields.length > 0 ? customFields : null,
  });

  if (customFields.length > 0) {
    const utmData = { custom_fields: customFields, timestamp: Date.now() };
    if (env.UTM_STORAGE) {
      await env.UTM_STORAGE.put(`utm:${emailKey}`, JSON.stringify(utmData), {
        expirationTtl: 1800,
      });
    }
    console.log(`Stored UTM data for scheduled worker: ${email}`);

    (async () => {
      try {
        const ok = await tryPatchByEmailOnce(env, emailKey, utmData.custom_fields, auth);
        if (ok && env.UTM_STORAGE) {
          await env.UTM_STORAGE.delete(`utm:${emailKey}`);
          console.log(`Immediate patch succeeded; KV cleared for ${email}`);
        } else {
          console.log(`Immediate patch failed for ${email}, scheduling retry`);
          await scheduleUTMRetry(env, email, 2 * 60);
        }
      } catch (error) {
        console.log(`Immediate patch attempt failed for ${email}:`, String(error));
        await scheduleUTMRetry(env, email, 2 * 60);
      }
    })();
  }

  return immediateResponse;
}

/**
 * Periodically walks KV to patch any remaining UTM data onto applications.
 */
async function handleScheduledUTMPatching(env) {
  console.log("Running scheduled UTM patching...");
  if (!env.UTM_STORAGE) {
    console.log("No UTM_STORAGE KV binding available");
    return;
  }

  const auth = buildAuth(env);
  const utmKeys = await env.UTM_STORAGE.list({ prefix: "utm:" });
  console.log(`Found ${utmKeys.keys.length} UTM entries to process`);

  for (const key of utmKeys.keys) {
    const email = key.name.replace("utm:", "");
    const utmDataStr = await env.UTM_STORAGE.get(key.name);
    if (!utmDataStr) continue;
    const data = JSON.parse(utmDataStr);
    const maxAgeMs = 30 * 60 * 1e3;
    if (Date.now() - data.timestamp > maxAgeMs) {
      console.log(`Removing old UTM data for ${email}`);
      await env.UTM_STORAGE.delete(key.name);
      continue;
    }
    try {
      const success = await tryPatchByEmailOnce(env, email, data.custom_fields, auth);
      if (success) {
        console.log(`Successfully patched UTM for ${email} via scheduled worker`);
        await env.UTM_STORAGE.delete(key.name);
      } else {
        console.log(`No application found for ${email}, will retry later`);
      }
    } catch (error) {
      console.error(`Error in scheduled UTM patching for ${email}:`, error);
    }
  }
  console.log(`Scheduled UTM patching complete. ${utmKeys.keys.length} items processed.`);
}

/**
 * Attempts a single Harvest lookup + patch for the provided email address.
 */
async function tryPatchByEmailOnce(env, email, fields, auth = buildAuth(env)) {
  const match = await findMatchingApplicationForEmail(email, env, auth);
  if (!match.applicationId) {
    return false;
  }
  const response = await patchApplicationFields(match.applicationId, fields, auth);
  return response.ok;
}

/**
 * Records a retry attempt in KV so another worker can resume patching later.
 */
async function scheduleUTMRetry(env, email, delaySeconds) {
  if (!env.UTM_STORAGE) return;

  const retryKey = `retry:${email}`;
  const retryData = { email, timestamp: Date.now(), delaySeconds };
  await env.UTM_STORAGE.put(retryKey, JSON.stringify(retryData), {
    expirationTtl: delaySeconds + 60,
  });
  console.log(`Scheduled UTM retry for ${email} in ${delaySeconds} seconds`);
}

/**
 * Builds request-scoped CORS headers and a traceable request identifier.
 */
function createRequestMetadata(req) {
  const origin = req.headers.get("Origin") || "*";
  const cors = {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
  };
  const requestId =
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)) + "";
  return { cors, requestId };
}

/**
 * Returns helper responders that attach request ids and CORS headers.
 */
function createResponders(requestId, cors) {
  const json = (data, status = 200) => {
    const payload =
      data && typeof data === "object"
        ? { requestId, ...data }
        : { requestId, data };
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };

  const fail = (message, status = 400, extra) => {
    console.error(
      `[gh-apply][${requestId}] ${message}`,
      extra ? { status, extra } : { status }
    );
    return json({ ok: false, message, ...(extra ? { extra } : {}) }, status);
  };

  return { json, fail };
}

/**
 * Normalizes Harvest + job board credentials pulled from the environment.
 */
function buildAuth(env) {
  return {
    jbAuth: "Basic " + btoa((env.GH_JOB_BOARD_API_KEY || "") + ":"),
    hvAuth: "Basic " + btoa((env.GH_HARVEST_API_KEY || "") + ":"),
    obo: env.GH_ON_BEHALF_USER_ID,
  };
}

/**
 * Lightweight structured logging wrapper used by the Airtable endpoints.
 */
function logEvent(level = "log", message, data) {
  try {
    const payload = data ? JSON.stringify(data) : "";
    const logger = console[level] || console.log;
    logger(`[leads] ${message}${payload ? ` ${payload}` : ""}`);
  } catch {}
}

/**
 * Confirms the webhook authenticity via token or HMAC SHA-256 signature.
 */
async function verifyWebhookSignature({ token, signatureHeader, rawBody, secret }) {
  if (token && token === secret) return true;
  if (
    signatureHeader &&
    signatureHeader.startsWith("sha256 ") &&
    rawBody
  ) {
    const expected = signatureHeader.slice(7).trim();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === expected;
  }
  return false;
}

/**
 * Looks up the most useful candidate email address from Harvest by id.
 */
async function fetchPrimaryEmailByCandidateId(candidateId, env, auth) {
  if (!candidateId || !env.GH_HARVEST_API_KEY || !auth.obo) {
    return null;
  }
  const response = await fetch(`${HARVEST_API_BASE}/candidates/${candidateId}`, {
    headers: { Authorization: auth.hvAuth, "On-Behalf-Of": auth.obo },
  });
  if (!response.ok) {
    return null;
  }
  const candidate = await response.json().catch(() => null);
  const emails = Array.isArray(candidate?.email_addresses)
    ? candidate.email_addresses
    : [];
  const primary =
    emails.find((entry) =>
      entry?.value &&
      (entry?.type === "work" || entry?.type === "personal" || entry?.type === "other")
    ) || emails[0];
  return primary?.value || null;
}

/**
 * Wraps Harvest API fetches so callers consistently receive json/text payloads.
 */
async function harvestGet(path, auth) {
  const response = await fetch(`${HARVEST_API_BASE}${path}`, {
    headers: { Authorization: auth.hvAuth, "On-Behalf-Of": auth.obo },
  });
  const payload = { ok: response.ok, status: response.status };
  if (response.ok) {
    payload.json = await response.json();
  } else {
    payload.text = await response.text();
  }
  return payload;
}

/**
 * Finds the first candidate application that matches configured job ids.
 */
async function findMatchingApplicationForEmail(email, env, auth) {
  const candidateResp = await harvestGet(
    `/candidates?email=${encodeURIComponent(email)}`,
    auth
  );
  if (!candidateResp.ok) {
    return {
      error: {
        stage: "candidates",
        status: candidateResp.status,
        body: candidateResp.text,
      },
    };
  }

  const jobIdInternal = String(env.INTERNAL_JOB_ID || "");
  const jobIdPublic = String(env.JOB_ID || "");
  const candidates = Array.isArray(candidateResp.json)
    ? candidateResp.json
    : [];

  for (const candidate of candidates) {
    for (const application of candidate.applications || []) {
      const detailResp = await harvestGet(`/applications/${application.id}`, auth);
      if (!detailResp.ok) continue;
      if (
        applicationMatchesConfiguredJobs(
          detailResp.json,
          jobIdInternal,
          jobIdPublic
        )
      ) {
        return { applicationId: application.id };
      }
    }
  }

  return { applicationId: null };
}

/**
 * Determines whether an application detail object belongs to the target jobs.
 */
function applicationMatchesConfiguredJobs(detail, jobIdInternal, jobIdPublic) {
  const matchInternal =
    jobIdInternal &&
    Array.isArray(detail?.jobs) &&
    detail.jobs.some((job) => String(job.id) === jobIdInternal);
  const matchPublic = jobIdPublic && String(detail?.job_post_id) === jobIdPublic;
  return Boolean(matchInternal || matchPublic);
}

/**
 * Produces a new FormData object so we can mutate safely before submission.
 */
function cloneFormData(source) {
  const target = new FormData();
  for (const [key, value] of source.entries()) {
    target.append(key, value);
  }
  return target;
}

/**
 * Maps query parameters into the Greenhouse custom_fields format.
 */
function extractUtmCustomFields(searchParams) {
  return UTM_KEYS.map((key) => {
    const value = searchParams.get(key);
    if (!value) return null;
    const sanitized = value.trim().substring(0, 255);
    if (sanitized.length === 0) return null;
    return { name_key: key, value: sanitized };
  }).filter(Boolean);
}

/**
 * Issues the Harvest PATCH call shared by the webhook + manual endpoints.
 */
function patchApplicationFields(applicationId, fields, auth) {
  return fetch(`${HARVEST_API_BASE}/applications/${applicationId}`, {
    method: "PATCH",
    headers: {
      Authorization: auth.hvAuth,
      "On-Behalf-Of": auth.obo,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ custom_fields: fields }),
  });
}

export { greenhouse_worker_default as default };
