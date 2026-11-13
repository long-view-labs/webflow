# WEBFLOW-7E: Finsweet initialization exception

Status: deterministic offline reproduction and regression coverage complete;
production fix **blocked on inclusion-source and dependency verification**.
This branch changes tests, fixtures, CI and this handoff only. Merging it will
not change published JavaScript, Webflow settings, or production behavior.

## Evidence and limits

- [Sentry issue 7809213683](https://nourish-inc.sentry.io/issues/7809213683/),
  event `5b594550a2b1406abf8de9d7a5c2462b`, 2026-10-23 17:32:56 UTC:
  `TypeError: Cannot define property name, object is not extensible`,
  `@finsweet/fs-components@2/dist/chunk-M65MOCFB.js`, columns 120/124/149.
  These event details were supplied by the coordinator; authenticated event
  statistics, replay, frequency and affected-user counts were unavailable.
- The [entry module](https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2/fs-components.js)
  statically imports the [failing chunk](https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2.3.59/dist/chunk-M65MOCFB.js).
  The floating entry currently matches `2.3.59`. The exact chunk contains
  `new class extends Error{name="StaleReactionError";message=...}` at module
  scope, before application code can initialize. `name` is an Error property,
  not applicant data. Fixture hashes and sources are in the fixture README.
- Chromium imports the exact chunk successfully with native `Error`, including
  when `Error.prototype` is frozen. A test-only constructor that prevents
  extensions on each Error instance deterministically produces the exact
  reported TypeError. This establishes a sufficient failure condition; it
  does not establish the cause of the production instance being non-extensible.
- Both the [published application source at v2.620.42](https://cdn.jsdelivr.net/gh/long-view-labs/webflow@v2.620.42/dietitian-application-final.js)
  and `dietitian-application-final.js` mount their mocked iframe and operate
  their own job accordion in a minimal fixture with the chunk present, failing,
  or absent. Mocked failed drafts expose a retry that makes new mocked attempts.
  These scripts do not reference Finsweet. This does not prove the complete
  published page's FAQ, navigation or other components have no dependency.
- The coordinator reported no `fs-*` content attributes in previously captured
  server HTML and no freeze/seal/preventExtensions or global Error reassignment
  in inspected site/application/footer/config sources. This environment has
  not independently verified that complete capture or the saved configuration.

## Repository boundary and outstanding blockers

The mounted repository was clean on `work` at
`46cd1dc42af51ed9828ab8d939f3a88598ee571e`, matching current `main`.
No `AGENTS.md` exists in this repository or its workspace ancestors.
Repository-wide searches and `git log --all -S fs-components` found no
Components SDK loader inclusion. The CMS attribute uses in `findprovider.js`
and `hero-filter-search.js` do not identify the owner of this separate SDK.

[Tracking PR8](https://github.com/long-view-labs/webflow/pull/8) is a separate
draft; none of its branch changes are included here. No shared classes,
components, tracking code, release versions, tags or deployment scripts changed.

Read actions and known outcomes:

| Action / target | Outcome / consequence |
| --- | --- |
| Raw GET `https://www.nourish.com/dietitian-application` | HTTP 403, including approved elevated retry. No HTML obtained; no page scripts executed. |
| Raw GET `https://nourish-2-23.webflow.io/dietitian-application` | Proxy CONNECT HTTP 403; no HTML obtained. |
| Connected Webflow `list_sites` | 142 sites returned, none named Nourish or with a Nourish custom domain; no connection or permission changes attempted. |
| Webflow `get_site` for candidate `699ce714348d0db6b6640eaf` from repo asset paths | HTTP 404; candidate is unverified. No saved site/page custom code read or changed. |
| GitHub CLI read of PR8 | GraphQL HTTP Forbidden; connected GitHub read succeeded. |

No operation was rejected by the automatic approval reviewer. Network reads
above failed with known HTTP errors. No production write was attempted.
The coordinator has been asked for the captured raw HTML and the saved custom
code containing the loader, including its configuration URL and attributes.

## Smallest safe remediation decision

Do not change application code to suppress this SDK exception, patch global
`Error`, filter it out of Sentry, or pin an older SDK without evidence it fixes
the incompatibility. A successful HTTP response does not demonstrate a working
application.

Before choosing removal or page scoping:

1. Obtain the published raw HTML and the saved Webflow site/page head/footer
   blocks, installed app scripts and loader configuration. Record page/site
   IDs, original complete loader tag, config URL and source hashes. Locate the
   true inclusion owner; do not assume a repository file controls it.
2. Inspect enabled Finsweet solutions, all `fs-*` attributes, dynamic markup,
   `fsComponents` callbacks and config references across the complete page,
   including shared navigation, FAQ and embeds. Compare the saved and published
   sources, since PR8 is staged and other unpublished edits may exist.
3. Run a sanitized full-page fixture offline with the loader present and absent,
   at desktop/mobile widths. Assert application mock draft request and iframe
   mount, job details, FAQ open/close, navigation controls and any discovered
   component behavior. Keep production drafts and telemetry blocked before
   executing any script. Test real app internals only against approved fixtures
   or test infrastructure.

If that proves the page does not need Components, the preferred minimal fix is
to omit **only this SDK loader on this page**, at its actual inclusion owner.
For a page-owned loader, the before/after is deletion of that complete single
tag with all other custom code byte-for-byte unchanged. For a site-owned
loader, prepare a narrow exclusion for this exact page while preserving the
original module URL, loader attributes, config and behavior on dependent pages.
Test dependent pages too. Neither deletion nor a site-level wrapper is
implemented here: the complete original tag and page dependency evidence are
missing, so an exact verified before/after cannot yet be supplied safely.

If the page needs the SDK, retain it and investigate the runtime that makes
Error instances non-extensible, or obtain a verified compatible upstream build.
The isolated repro is available for that investigation without production events.

## Validation and publication gate

Run locally (test-only dependency; do not commit dependency/lockfile changes):

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
node --test tests/finsweet-initialization.test.js
git diff --check
```

The harness prefers `/usr/bin/chromium` when installed; otherwise it uses
Playwright's installed Chromium. Set `CHROMIUM_PATH` to override. CI runs the
same offline suite. It serves every response from local strings through
context-wide interception installed before page creation, blocks service
workers, and aborts all unrecognized requests. No route reaches the network.
There are no test servers to leave running; browser contexts and Chromium close
after testing. The fixture iframe is only a mounting stub, never a real form.

Production publication remains prohibited until the coordinator has a verified
scoped plan with: exact source/location and before/after; full-page dependency
and offline behavior evidence; dependent-page checks where applicable; explicit
inventory excluding PR8/unrelated drafts; approved page-specific publishing
method; original snippet backup and matching scoped rollback. A full-site
publish could carry unrelated saved changes and is outside this authorization.
After an authorized publication, verify raw output and authenticated Sentry
statistics without creating applications or synthetic production telemetry.
