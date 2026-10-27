# Nourish tracking review handoff

PR8 contains the tested CTA runtime and a sitewide audit handoff. The runtime is ready for controlled staging validation; sitewide authoring and live analytics acceptance are not complete. The cloud writer cannot currently retrieve the sitemap or resolve the verified Nourish site through its Webflow connection. The existing browser task owns Designer edits and staging UI work.

## Source and ownership

- Repository: `long-view-labs/webflow`, existing draft PR8, branch `codex/nourish-cta-staging-2026-10-22`. Keep one repository writer and this PR. No merge or production publish is authorized.
- Runtime source commit: `b5377b99afc12b07c0e00f4799a8418eb5555922`. This inventory follow-up does not change `global.js`. Its SHA256 is `f31cbf95a594e88da5ec1d413746ba8f068e360ceb6ea0cdb0165353149b277a`.
- Runtime release: `cta-cleanup-2026-10-26-1`; tracking schema: `2`. Earlier production receipts for release `cta-cleanup-2026-10-22-1` do not prove acceptance of this runtime.
- Webflow site identity, previously verified in the authenticated Gemin browser: `699ce714348d0db6b6640eaf`, project `nourish-2-23`, production `www.nourish.com`.
- The PR author is `pakgem`; the latest review read returned no review submissions or review threads. The current PR head and test outcome are recorded in the PR summary after the final run.

## Coverage and access

`cta-site-inventory.json` is the discovery manifest. Its `discovery_complete` flag is false. `cta-sitewide-coverage.csv` records the current missing snapshots and catalogue gaps. `cta-traceability.csv` remains a source-contract matrix, not evidence that every rendered CTA was inspected.

| Area | Evidence and remaining work |
| --- | --- |
| Sitemap and robots | The cloud proxy returned `403 Forbidden`. Native sitemap fetch also rejected the returned content type. Export the sitemap through the existing authorized browser task. |
| Static pages and non-sitemap routes | Webflow API lookup for the verified site returned `404`. Export the complete authorized Designer page catalogue, including draft/noindex/campaign routes; reconcile observed internal links. |
| Home and Become a Dietitian | Known source targets. Fresh desktop/mobile and conditional-state snapshots remain required. |
| Health Systems and Blogs Template | Previously sampled in the authenticated browser. Current page/template IDs, full routes and bindings remain to be exported. |
| Nav V2 and Footer V2 | Previous browser inventory reported 82 and 91 instances respectively. Verify current definitions, overrides, destination bindings and desktop/mobile consumers before shared edits. |
| Dynamic controls | Enumerate CMS, filter-dependent, experiment and conditional CTA branches. A default desktop snapshot cannot cover them. |
| Dietitian application | Do not make an ordinary JavaScript visit to the production application page: it can create drafts. Use approved source, controlled staging or mocks. No real form submissions. |

These failures are access/discovery blockers. They are not evidence of missing tracking on every affected page. No connection grants, permission changes, alternate proxy bypass or deployment was attempted.

## Files for review

- `global.js`: existing patient/directory/dietitian classifier, explicit metadata validation, revisions, SDK-owned consent and sanitized event context.
- `cta-authoring-contract.json`: authoring and version rules. Source `page_path` is automatic; no redundant `page_name` field is emitted. `page_version` remains optional.
- `cta-browser-handoff.json`: exact reviewed selector/attribute matrix and preservation rules, anchored to the unchanged tested runtime source.
- `tools/cta-snapshot.js`: a read-only browser expression for verified marketing documents. It does not click, navigate, fetch or modify attributes. It blocks wrong-site and application documents, omits query/form values and hashes hrefs for preservation checks.
- `tools/cta-coverage.cjs`: offline ledger compiler. It separates signup, directory, dietitian, enterprise/contact candidates and non-conversion/review links. It flags unsupported controls and incomplete contracts without inventing events. It cannot certify live receipts.
- `tests/cta-coverage.test.cjs`: snapshot safety, destination classification, missing-page/variant gates and preservation of shared IDs across pages.
- Existing runtime tests: `tests/cta-review-regressions.test.cjs`, `tests/cta-integration.test.cjs`, `tests/cta-contract-completion.test.cjs`, and `tests/dietitian-apply-clicked.test.js`.

The repository source scan found the existing CTA handler in `global.js` plus separate `Experiment Viewed` trackers in `paid-tt-tracking.js` and `weight-concerns-split.js`. No enterprise/contact click handler was found in this repository scan; Designer embeds, tag-manager code and application-owned handlers remain uninspected. Preserve existing experiment tracking and do not infer that all other handlers are absent.

## Existing browser task

1. Confirm the site/project identity and capture the complete static/CMS/component catalogue. Add all discovered pages and required viewport/conditional states to `cta-site-inventory.json`; retain unresolved gaps until actually resolved.
2. Evaluate `tools/cta-snapshot.js` only in the verified marketing document or its approved staging preview, not in the Designer application UI. Save each returned JSON snapshot separately. Record the actual state name, such as `default` or `mobile-menu-open`; `default-unconfirmed` is not a reviewed conditional state. Retain the source-owned script URLs to verify which pinned runtime was actually loaded.
3. Repeat for representative shared-component consumers and every required viewport/conditional branch. A truncated snapshot cannot certify coverage. The compiler surfaces internal paths absent from the catalogue; classify redirects and protected application routes without unsafe navigation.
4. Compile the exported snapshots offline:

```sh
node tools/cta-coverage.cjs cta-site-inventory.json SNAPSHOT_DIRECTORY OUTPUT_DIRECTORY
```

5. Use each row's page, component hint, audit locator, link text, destination, metadata and href digest to prepare the exact draft edit. Treat component hints and CSS locators as audit aids, not tracking identity. Read actual component IDs/bindings in Designer.
6. Apply the complete six-field patient contract only to reviewed conversion anchors. Preserve valid existing semantic IDs, versions, hrefs, legacy `data-cta`, DOM IDs, styling and bindings. Preserve shared role IDs across pages; `page_path` distinguishes source pages. Do not blanket-annotate editorial, privacy/settings or unknown links. Enterprise/contact candidates and non-anchor controls need evidenced handler decisions rather than a new guessed event.
7. Save drafts and return exact edited element/component IDs and before/after values. Keep pre-existing Webflow attributes. Do not add manual page-name attributes. Keep optional reviewed page revisions.

UET errors belong in a separate issue/evidence record; do not conflate them with CTA handler failures or change unrelated ad tooling during this pass.

## Staging and analytics gates

The browser task may prepare controlled staging validation under the approved scope. Review unrelated pending drafts before any staging publication, use only the Webflow subdomain and pin the runtime to the exact reviewed commit. No production publish, merge, release automation or real form submission is authorized.

| Action | Event | Required payload distinction |
| --- | --- | --- |
| Direct signup | `Get Started Clicked` | `cta_action=direct-signup` |
| Directory | `Dietitian Directory Clicked` | `cta_action=directory-navigation`; no duplicate patient event |
| Existing dietitian CTA | `Dietitian Apply Clicked` | `cta_action=apply-dietitian`; preserve IDs and placements; earnings is calculator engagement |
| Privacy/settings | No patient conversion event | Preserve navigation and consent controls |
| Enterprise/contact or other controls | Inventory separately | Do not add a conversion event without an evidenced scope/handler decision |

Expected CTA properties include `cta_id`, `cta_name`, `cta_location`, `cta_section`, explicit `cta_version`, automatic `page_path`, optional `page_version`, `destination_host`, `destination_path`, locale, mapping status, release and schema. Reviewed experiment metadata is preserved. URLs and SDK page/tab/referrer context omit queries/hashes; original href attribution/filter/experiment behavior is preserved. Existing OneTrust/RudderStack ownership and identity must remain unchanged.

On `nourish-2-23.webflow.io`, QA parameters `qa_test=true` and a `qa_run_id` beginning `nourish-cta-qa-` activate explicit QA properties. The run suffix must be lowercase letters, numbers or hyphens and at most 64 characters. The runtime does not activate these markers on production hosts. Confirm the actual source routing before receipt tests; earlier staging receipts arrived in the Nourish project rather than the separately named staging project.

The parent owns the existing private QA dashboard and chart updates. Its current release/schema checks exclude QA events; they cannot serve as QA-run receipt queries without an explicit QA-inclusive view. Empty charts before deployment are expected. Query one bounded run ID for delivery, and use release `cta-cleanup-2026-10-26-1`/schema `2` for this runtime. Do not restore raw queries to satisfy legacy `url contains utm_source` assertions. Attribution acceptance must use verified supported user-attribution or downstream categorical fields. Do not modify existing business charts here.

Before acceptance, verify exact-once behavior for text/nested/keyboard/dynamic activation, desktop/mobile variants, denied/granted consent, sanitized properties/context and safe signup handoffs without submitting forms. Local SDK spies and old-release receipts do not establish these live outcomes.

## Section Viewed and performance

Section Viewed was promised and remains an explicit acceptance gap. It is not installed by PR8. The earlier local prototype is research evidence, not production code or live acceptance.

The bounded proposal is at most four approved core sections per page view, one shared IntersectionObserver/timer, positive verified consent, once-per-section/page-view deduplication and explicit lifecycle cleanup. The provisional 50 percent visibility/one-second dwell rule, core-page/section list and event-volume budget still need agreement. Use automatic source paths; do not require manual page names. Reuse the existing SDK and verify its actual batching configuration rather than loading a duplicate SDK or assuming batching is active.

Controlled fixtures measured 1.0–1.8 ms of observer/timer work for four exposures on desktop and 5.2–6.6 ms under 4x CPU throttling. The inactive instrumented prototype was 5,507 bytes raw and 1,883 gzip. No layout shifts or long tasks were observed in those fixtures, but total-task comparisons were noisy, including a 121 ms outlier. Stubbed network counts do not measure actual SDK delivery cost. These measurements cannot establish zero slowdown on the real site.

Before implementation/activation, verify the real consent adapter, prevent broad UTM enrichment from contaminating the new event, agree bounded eligibility/volume and measure representative pages with actual SDK overhead and request counts. No Section Viewed rollout or live-performance claim is authorized by the existence of the prototype.

## Review gates

The Oct27 full local run passed 103 Node test records with zero failures, including all 16 mocked Chromium scenarios and ten new coverage/snapshot checks. Syntax, JSON parsing and whitespace checks passed. `global.js`, workflow definitions and production dependency manifests are unchanged in this follow-up. The generated inventory currently has zero fresh snapshots and eleven missing-page/catalogue rows; both authoring-inventory completeness and live acceptance remain false.

The local evidence log is `.git/pr8-artifact/2026-10-27/final-tests.log`. Reproduce with the five files matching `tests/*.test.cjs` and `tests/*.test.js`, isolated JSDOM 26.1.0/jQuery 3.5.1, and the existing Playwright setup pointed at installed system Chromium. The browser harness intercepts all fixture requests; no provider event or real form submission is part of this result.

The final local run must include all existing runtime tests plus the coverage tests, JSON parsing, syntax and whitespace checks. Test dependencies remain isolated from production manifests and lockfiles; lifecycle hooks are disabled. Browser tests use intercepted fixtures and SDK spies.

Before push, enumerate workflow triggers. The current repository contains only `synthetic-rudderstack.yml`, triggered by schedule/manual dispatch; do not dispatch it, since it uses hosted compute and production monitoring. Keep PR8 in draft, preserve holds and approvals, and record CI as unreported when no checks/statuses/runs are returned.

Open gates are the complete authorized site inventory, exact draft attribute readbacks, staged current-head validation, live consent/delivery and downstream acceptance, parent-owned chart verification, and the separately bounded Section Viewed scope. Do not mark the sitewide task complete while those gates remain open.
