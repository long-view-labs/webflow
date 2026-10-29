# Notification presentation contract v1

This matches Unify's `docs/NOTIFICATION-CONTRACT.md` schema and seven-line layout.
The portable `notification-template.cjs` has no dependencies, I/O, credentials,
scheduling, thresholds or delivery decisions. ESM callers can default-import it.

## Exact model

```ts
type StatusCode = 'site_failure' | 'checker_error' | 'review_needed'
  | 'no_change' | 'recovered' | 'unknown';
type Run = {id: string | null; finishedAt: string | null;
  startedAt?: string | null; meaning?: string} | null;
type Notification = {
  schemaVersion: 1;
  client: string;
  check: string;
  status: {code: StatusCode; sourceStatus: string | null; sourceOutcome: string | null};
  summary: string;
  affectedChecks: Array<{check: string; status: string; summary: string; caseIds: string[]}>;
  coverage: {summary: string; limits: string; unknowns: string[]};
  currentRun: Run;
  lastSuccessfulRun: Run;
  evidence: {url: string | null; published: boolean; description: string};
  nextAction: string;
};
```

`renderNotification(model)` produces these exact ordered lines:

1. **Client | check | status**
2. **Summary**
3. **Affected checks**
4. **Coverage / unknowns**
5. **Current run / last success**
6. **Evidence**
7. **Next action**

`notificationTitle(model)` produces a compact notification/email title.
`displayStatus(model)` exposes the selected code. ISO timestamps match Unify's
renderer. Source statuses/outcomes are preserved, not inferred from missing data.

## Classification belongs in the adapter

- `site_failure`: an observed site/check contract failure. It is not evidence of
  downstream analytics ingestion failure. `checker_error`: execution, navigation,
  actionability or data retrieval failed, leaving measurement incomplete.
- `review_needed`: candidate changes or still-open findings, not confirmed defects.
  `no_change`: no new findings within complete measured scope, not a healthy site
  or an approved baseline. `recovered` requires the existing recovery decision;
  the template never invents a recovery transition.
- Unknown counts remain `?`; missing run timestamps and last success remain null.
  Last completed is not automatically a verified successful run. Nourish has no
  consistently recorded success timestamp, so both adapters currently supply null.
- Adapters must validate completeness before selecting `no_change` or `recovered`.
  Hourly reports must explicitly complete; missing reports/finish time cannot earn
  a recovery headline. Daily incomplete capture is a checker error; missing capture,
  form, timing or supporting-source data cannot earn a no-change headline.
- Display classification never changes the underlying send, retry, deduplication
  or recovery decision. The source result remains available in the model.

## Evidence, privacy and bounds

Only provide stable case IDs, summarized findings and aggregate measurements.
Never pass raw request bodies, form answers, cookies, DOM, stack traces or secrets.
The renderer escapes Slack control syntax, removes common token/email patterns,
redacts local absolute paths, and strips URL query strings, credentials and fragments.
Only a confirmed current publication (`published: true`) is shown as a URL.
Otherwise supply an explicit local relative evidence description. Signed URLs
should not be supplied because query stripping would invalidate them.

Lists and fields are bounded: eight affected checks, four case examples per check,
six unknowns, with remaining counts. Evidence and next action remain visible.
This is additional output hygiene, not a substitute for safe adapter inputs.

## Nourish integration and verification

- `tracking-notification.js`: adapts selected UTM/browser reports and the existing
  incident decision. The coordinator only renders in its existing failure/recovery
  branches or explicit test mode. Backend ingestion is marked outside scope;
  planned case totals are not invented where reports do not expose them.
- `daily-report/summary.mjs`: exports `dailyNotification()`; `slackText()` calls the
  portable renderer. `overall()` and its existing thresholds remain unchanged.
  `daily-report/daily.mjs` passes publication confirmation into the adapter.
- Existing delivery channels, state, retry policy, scheduling and production
  checks are unchanged. No Unify files are edited by this patch.
- Offline fixtures cover all statuses, incomplete measurements, missing run/link
  data, failed publication, redaction and bounded lists. A separate read-only
  compatibility check compares common fixtures against Unify's pure renderer.

## Nourish daily rendering v2 (Oct 29 2026)

The daily site check (`daily-report/summary.mjs`) still builds this model (`dailyNotification`, with an extra `counts` field) but renders it with `renderDailyMessage`, the compact layout Unify adopted on Oct 29 2026: headline with the run time, one numbers line, attention lines only when present, the link, a one-line next step. `renderNotification` here is unchanged and still renders the hourly tracking monitor's messages. See `daily-report/README.md` → "Slack message" for the lines and the quiet rule.
