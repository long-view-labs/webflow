# Changelog

All notable changes to this project will be documented in this file.

## [2.623.3] - 2026-10-27

Every signup-host link fires Get Started Clicked and gets UTM/landingPageVariation decoration again, whatever its path, as before 2.622.0. Since 2.622.0 only signup / and /providers counted, so about 560 live links to /flow/get-started, /1 and /2 (partner and partnership pages, glossary, eating-disorder and /landing pages, landing-pages, blog, Am I covered, Paid Labs) fired nothing. /providers paths report cta_action=provider-directory, everything else signup-flow; privacy/settings links stay excluded. Older templates now map to Nav, FAQ or Page content. The site audit uses the same rule. npm test runs 191 tests.

## [2.623.2] - 2026-10-27

cta_action now reports signup-flow (was direct-signup) and provider-directory (was directory-navigation). Authored data-cta-action attributes keep the old spelling and still validate. npm test runs 189 tests.

## [2.623.1] - 2026-10-27

Every cta_name ends with its placement, Nav, Hero and Footer included: "Get Started | Home | Nav", "Find a Dietitian | Home | Footer" ("Final CTA" is now "Footer", matching cta_section). Ids, sections and other properties are unchanged. npm test runs 188 tests.

## [2.623.0] - 2026-10-27

CTA naming consolidation. Every signup and directory CTA on the site is now mapped (sitewide audit: 1,752 links on 173 pages, one per CMS template, 0 unmapped): section-block mappings apply on every template (landing, condition, local and insurance dietitian, partner, employer, blog, quiz, calculator), not only /paid*.
- cta_name is "<action> | <page> | <placement>", e.g. "Get Started | Home | Insurance logos"; nav, hero and footer CTAs leave the placement out. CMS pages use the template name (Blog post, Condition page, Local dietitians...).
- cta_section carries nav, hero and footer for those CTAs (hero insurance search and quiz included; final_cta becomes footer) and the block topic for in-page CTAs.
- cta_location and cta_mapping_status are no longer sent.
- Ids come from one vocabulary; older ids fold in: footer -> final-cta, program -> benefits, hero-coverage -> hero-insurance-search, insurance -> insurance-logos, provider-filter -> provider-search.
- The fallback for a CTA nobody mapped is patient-signup-other / "Get Started | <page> | Other" (was -unmapped); the UTM monitor alerts on it.
- Blank data-cta-* placeholders from the Webflow Button component fall back to the section mapping.
- tools/cta-site-audit.cjs: sitewide offline CTA audit. npm test runs 188 tests (the 2.622.10 note's count of 174 should have read 173).

## [2.622.10] - 2026-10-27

Plain http://signup.nourish.com links count again. v2.622.0 only tracked https signup links, so CTAs Webflow authored with http (the blog template's Find a dietitian / Learn more buttons, Check coverage on /does-my-insurance-cover-nutrition) sent no Get Started Clicked event. They are now tracked and their href is upgraded to https; non-default ports and embedded credentials stay excluded. npm test runs 174 tests.

## [2.622.9] - 2026-10-27

Retire Dietitian Directory Clicked. Provider-directory signup links (signup.nourish.com/providers) fire Get Started Clicked again, as before 2.622.0, and are told apart by cta_action=directory-navigation (plus destination_path). Internal www.nourish.com/find-a-provider links fire nothing again, as before 2.622.0. For Fri Oct 23 - Tue Oct 27 directory clicks are in Dietitian Directory Clicked; combine both events for that window. tools/cta-coverage.cjs updated to match. Verified against v2.621.4 with live homepage clicks. npm test runs 173 tests.

## [2.622.8] - 2026-10-27

CTA events (Get Started Clicked, Dietitian Directory Clicked, Dietitian Apply Clicked) merge every stored attribution key again, as before 2.622.0 (e.g. custom keys such as utm_adgroup), instead of a fixed allow-list. NOURISH_CTA_ATTRIBUTION_KEYS removed. Verified against v2.621.4 with live homepage clicks. npm test runs 173 tests.

## [2.622.7] - 2026-10-27

Restore two CTA event fields to exactly their pre-2.622.0 values (neither change was requested). `url` on Get Started Clicked / Dietitian Directory Clicked / Dietitian Apply Clicked is the full clicked link again (all query params, including InsuranceSearchInput, _configname, _stsgnoredir and _gl), and the track call no longer overrides the SDK's page context, so page url/search/referrer carry the full query string again. Verified against v2.621.4 with live homepage clicks. npm test runs 173 tests.

## [2.622.6] - 2026-10-27

The CTA `url` keep-list now matches landingPageVariation and variationName. 2.622.5 compared lowercased query keys against those mixed-case names, so both were dropped from `url`.

## [2.622.5] - 2026-10-27

Get Started Clicked / Dietitian Directory Clicked `url` again carries the attribution params on the clicked link (allow-listed UTMs and click IDs, plus landingPageVariation/variationName). 2.622.0 had reduced `url` to origin + path, which broke the "P2 Alert: UTM Passthrough Rate" chart (url contains utm_source=). Other query values and the hash are still dropped, and the separate utm_* properties are unchanged. Test added in tests/utm-handoff.test.cjs.

## [2.622.4] - 2026-10-27

Footer V2 splash CTA ("Take your first step…", on 1,424 pages) now reports cta_id patient-signup-final-cta / footer / final_cta instead of invalid-contract. The component emits blank data-cta-* placeholders when its CTA properties are unset; only all-blank placeholders on .section_footer-splash links fall back to the mapping. npm test runs 172 tests.

## [2.622.3] - 2026-10-27

become-dietitian.js skips the employee quotes slider on pages without .employee-quotes_grid (/employers, /health-systems threw an IntersectionObserver TypeError on every load). Those pages now pin @v2.622.3 instead of the unversioned URL. Guard test in tests/become-dietitian-guard.test.cjs; npm test runs 169 tests.

## [2.622.2] - 2026-10-27

Paid landing page CTA mappings (global.js section 8). On /paid, /paid-*, /paidwl the quiz, insurance, how-it-works, approach, testimonials, app, final-CTA, logos, program, sticky-phone and FAQ links now report reviewed cta_id/cta_location/cta_section instead of patient-*-unmapped (113 unmapped links across 10 live pages -> 0). Authored data-cta-* contracts still win; mappings never apply off paid pages. Tests in tests/paid-cta-mappings.test.cjs; npm test runs 167 tests.

## [2.622.1] - 2026-10-27

Fix blog and /paid page script errors. blog.js skips its category/splash/rich-text code on templates without those elements and loads the videsigns multi-step.js only when the page has a quiz; the /paid footer (paid.html) does the same for multi-step.js and skips the testimonial slider when the page has none. Guard tests in tests/blog-guards.test.js and tests/paid-guards.test.js.


## [2.622.0] - 2026-10-27

CTA tracking cleanup (global.js section 8, PR #8). Direct signup links fire Get Started Clicked; provider-directory links (signup /providers, /find-a-provider) fire the new Dietitian Directory Clicked; privacy/settings links fire nothing. Every CTA event carries cta_id, cta_name, cta_location, cta_section, cta_version, release_version=cta-cleanup-2026-10-26-1 and tracking_schema_version=2; incomplete contracts are counted as cta_mapping_status=invalid-contract. Allow-listed UTMs, legacy element and visible-text cta copy are kept; destination/context URLs drop query and hash; first-touch referrer stays SDK-owned. UTM handoff contract locked in tests/utm-handoff.test.cjs; npm test runs 111 tests.


## [2.621.4] - 2026-10-20

Dietitian Apply Clicked: RudderStack click tracking for the Apply now CTAs on /become-a-dietitian (global.js section 8). Attribute-driven (data-cta-action/id/name/location), page-scoped, same property schema as Get Started Clicked plus additive cta_* / destination_* / locale. Mocked Chromium test suite in tests/.


## [2.621.3] - 2026-10-19

Weight Concerns LP 50/50 split test (lp-weight-concerns-b): single-hop redirect from the control to the utm_term group page, RudderStack Experiment Viewed on both arms. New stubs landing-page-head.html and weight-concerns-variant-footer.html.


## [2.621.2] - 2026-10-19

Fix stale CTA params: planName (and other cleared selections) no longer stick on the signup link after switching carriers. Remove Aetna from the homepage FAQ schema.


## [2.621.1] - 2026-10-19

Load the hero insurance list from displayGroups=PRIMARY, drop Aetna, Aetna Medicare, and Meritain, send nourishPayerId=-3 for "My insurance is not listed", and match the employer-page (condensed) list and the API fallback list to the PRIMARY payers.


## [2.621.0] - 2026-10-15

No release notes provided.


## [2.620.49] - 2026-10-02

Add a date of birth calendar picker on the hero filter and fix /paid script loading so the quiz initializes once.


## [2.620.48] - 2026-09-14

No release notes provided.


## [2.620.47] - 2026-09-02

No release notes provided.


## [2.620.46] - 2026-09-02

No release notes provided.


## [2.620.45] - 2026-09-02

No release notes provided.


## [2.620.44] - 2026-09-01

No release notes provided.


## [2.620.43] - 2026-08-28

No release notes provided.


## [2.620.42] - 2026-07-07

No release notes provided.


## [2.620.41] - 2026-06-05

No release notes provided.


## [2.620.40] - 2026-06-05

No release notes provided.


## [2.620.39] - 2026-06-05

No release notes provided.


## [2.620.38] - 2026-06-04

No release notes provided.


## [2.620.37] - 2026-06-04

No release notes provided.


## [2.620.36] - 2026-06-04

No release notes provided.


## [2.620.35] - 2026-06-04

No release notes provided.


## [2.620.34] - 2026-06-04

No release notes provided.


## [2.620.33] - 2026-06-04

No release notes provided.


## [2.620.32] - 2026-06-04

No release notes provided.


## [2.620.31] - 2026-05-29

No release notes provided.


## [2.620.30] - 2026-05-29

No release notes provided.


## [2.620.29] - 2026-05-29

No release notes provided.


## [2.620.28] - 2026-05-29

No release notes provided.


## [2.620.27] - 2026-05-29

No release notes provided.


## [2.620.26] - 2026-05-29

No release notes provided.


## [2.620.25] - 2026-05-29

No release notes provided.


## [2.620.24] - 2026-05-29

No release notes provided.


## [2.620.23] - 2026-05-29

No release notes provided.


## [2.620.22] - 2026-05-29

No release notes provided.


## [2.620.21] - 2026-05-28

No release notes provided.


## [2.620.20] - 2026-05-20

No release notes provided.


## [2.620.19] - 2026-05-20

No release notes provided.


## [2.620.18] - 2026-05-20

No release notes provided.


## [2.620.17] - 2026-05-13

No release notes provided.


## [2.620.16] - 2026-05-13

No release notes provided.


## [2.620.12] - 2026-05-13

No release notes provided.


## [2.620.11] - 2026-05-13

No release notes provided.


## [2.620.10] - 2026-05-13

No release notes provided.


## [2.620.9] - 2026-05-13

No release notes provided.


## [2.620.8] - 2026-05-07

No release notes provided.


## [2.620.7] - 2026-05-07

No release notes provided.


## [2.620.6] - 2026-04-15

No release notes provided.


## [2.620.5] - 2026-03-27

No release notes provided.


## [2.620.4] - 2026-03-27

No release notes provided.


## [2.620.3] - 2026-03-27

No release notes provided.


## [2.620.2] - 2026-03-19

No release notes provided.


## [2.620.1] - 2026-03-11

No release notes provided.


## [2.620.0] - 2026-03-11

No release notes provided.


## [2.619.2] - 2026-03-06

No release notes provided.


## [2.619.1] - 2026-03-06

No release notes provided.


## [2.619.0] - 2026-03-05

No release notes provided.


## [2.618.5] - 2026-02-27

No release notes provided.


## [2.618.4] - 2026-02-27

No release notes provided.


## [2.618.3] - 2026-02-27

No release notes provided.


## [2.618.2] - 2026-02-26

No release notes provided.


## [2.618.1] - 2026-02-26

No release notes provided.


## [2.618.0] - 2026-02-26

No release notes provided.


## [2.617.0] - 2026-02-26

No release notes provided.


## [2.616.4] - 2026-02-04

No release notes provided.


## [2.616.3] - 2026-01-21

No release notes provided.


## [2.616.2] - 2026-01-08

No release notes provided.


## [2.616.1] - 2026-01-08

No release notes provided.


## [2.616.0] - 2026-01-08

No release notes provided.


## [2.615.0] - 2026-01-08

No release notes provided.


## [2.614.4] - 2025-12-19

Remove statsig dependency 


## [2.614.3] - 2025-12-15

Added tiktok landing page testing


## [2.614.2] - 2025-12-12

No release notes provided.


## [2.614.1] - 2025-12-11

No release notes provided.


## [2.614.0] - 2025-12-10

No release notes provided.


## [2.613.0] - 2025-12-09

No release notes provided.


## [2.612.0] - 2025-12-04

No release notes provided.


## [2.611.4] - 2025-12-04

No release notes provided.


## [2.611.3] - 2025-12-03

No release notes provided.


## [2.611.2] - 2025-12-03

No release notes provided.


## [2.611.1] - 2025-12-02

No release notes provided.


## [2.611.0] - 2025-12-02

No release notes provided.


## [2.610.24] - 2025-12-02

No release notes provided.


## [2.610.23] - 2025-12-02

No release notes provided.


## [2.610.22] - 2025-12-02

No release notes provided.


## [2.610.21] - 2025-12-02

No release notes provided.


## [2.610.20] - 2025-12-02

No release notes provided.


## [2.610.19] - 2025-12-02

No release notes provided.


## [2.610.18] - 2025-12-02

No release notes provided.


## [2.610.17] - 2025-12-02

No release notes provided.


## [2.610.16] - 2025-12-01

No release notes provided.


## [2.610.15] - 2025-11-29

No release notes provided.


## [2.610.14] - 2025-11-29

No release notes provided.


## [2.610.13] - 2025-11-29

No release notes provided.


## [2.610.12] - 2025-11-29

No release notes provided.


## [2.610.11] - 2025-11-29

No release notes provided.


## [2.610.10] - 2025-11-29

No release notes provided.


## [2.610.9] - 2025-11-29

No release notes provided.


## [2.610.8] - 2025-11-29

No release notes provided.


## [2.610.7] - 2025-11-29

No release notes provided.


## [2.610.6] - 2025-11-29

No release notes provided.


## [2.610.5] - 2025-11-29

No release notes provided.


## [2.610.4] - 2025-11-26

No release notes provided.


## [2.610.3] - 2025-11-26

No release notes provided.


## [2.610.2] - 2025-11-26

No release notes provided.


## [2.610.1] - 2025-11-26

No release notes provided.


## [2.610.0] - 2025-11-21

No release notes provided.


## [2.609.4] - 2025-11-21

No release notes provided.


## [2.609.3] - 2025-11-17

No release notes provided.


## [2.609.2] - 2025-11-17

No release notes provided.


## [2.609.1] - 2025-11-17

No release notes provided.


## [2.609.0] - 2025-11-17

No release notes provided.


## [2.608.4] - 2025-11-15

No release notes provided.


## [2.608.3] - 2025-11-15

No release notes provided.


## [2.608.2] - 2025-11-15

No release notes provided.


## [2.608.1] - 2025-11-15

No release notes provided.


## [2.608.0] - 2025-11-15

No release notes provided.


## [2.607.3] - 2025-11-14

No release notes provided.


## [2.607.2] - 2025-11-14

No release notes provided.


## [2.607.1] - 2025-11-14

No release notes provided.


## [2.607.0] - 2025-11-14

No release notes provided.


## [2.606.2] - 2025-11-11

No release notes provided.


## [2.606.1] - 2025-11-11

No release notes provided.


## [2.606.0] - 2025-11-07

No release notes provided.


## [2.605.0] - 2025-11-05

No release notes provided.


## [2.604.8] - 2025-10-27

No release notes provided.


## [2.604.7] - 2025-10-23

No release notes provided.


## [2.604.6] - 2025-10-23

No release notes provided.


## [2.604.5] - 2025-10-23

No release notes provided.


## [2.604.4] - 2025-10-23

No release notes provided.


## [2.604.3] - 2025-10-23

No release notes provided.


## [2.604.2] - 2025-10-23

No release notes provided.


## [2.604.1] - 2025-10-23

No release notes provided.


## [2.604.0] - 2025-10-23

No release notes provided.


## [2.603.7] - 2025-10-20

No release notes provided.


## [2.603.6] - 2025-10-11

No release notes provided.


## [2.603.5] - 2025-10-10

No release notes provided.


## [2.603.4] - 2025-10-10

No release notes provided.


## [2.603.3] - 2025-10-10

No release notes provided.


## [2.603.2] - 2025-10-09

No release notes provided.


## [2.603.1] - 2025-10-09

No release notes provided.


## [2.603.0] - 2025-10-09

No release notes provided.


## [2.602.63] - 2025-10-06

No release notes provided.


## [2.602.62] - 2025-10-04

No release notes provided.


## [2.602.61] - 2025-10-04

No release notes provided.


## [2.602.60] - 2025-10-04

No release notes provided.


## [2.602.59] - 2025-10-04

No release notes provided.


## [2.602.58] - 2025-10-04

No release notes provided.


## [2.602.57] - 2025-10-04

No release notes provided.


## [2.602.56] - 2025-10-04

No release notes provided.


## [2.602.55] - 2025-10-04

No release notes provided.


## [2.602.54] - 2025-10-04

No release notes provided.


## [2.602.53] - 2025-10-04

No release notes provided.


## [2.602.52] - 2025-10-04

No release notes provided.


## [2.602.51] - 2025-10-04

No release notes provided.


## [2.602.50] - 2025-10-04

No release notes provided.


## [2.602.49] - 2025-10-04

No release notes provided.


## [2.602.48] - 2025-10-04

No release notes provided.


## [2.602.47] - 2025-10-04

No release notes provided.


## [2.602.46] - 2025-10-04

No release notes provided.


## [2.602.45] - 2025-10-04

No release notes provided.


## [2.602.44] - 2025-10-04

No release notes provided.


## [2.602.43] - 2025-10-04

No release notes provided.


## [2.602.42] - 2025-10-04

No release notes provided.


## [2.602.41] - 2025-10-04

No release notes provided.


## [2.602.40] - 2025-10-04

No release notes provided.


## [2.602.39] - 2025-10-04

No release notes provided.


## [2.602.38] - 2025-10-04

No release notes provided.


## [2.602.37] - 2025-10-04

No release notes provided.


## [2.602.36] - 2025-10-04

No release notes provided.


## [2.602.35] - 2025-10-04

No release notes provided.


## [2.602.34] - 2025-10-04

No release notes provided.


## [2.602.33] - 2025-10-04

No release notes provided.


## [2.602.32] - 2025-10-04

No release notes provided.


## [2.602.31] - 2025-10-04

No release notes provided.


## [2.602.30] - 2025-10-04

No release notes provided.


## [2.602.29] - 2025-10-04

No release notes provided.


## [2.602.28] - 2025-10-04

No release notes provided.


## [2.602.27] - 2025-10-04

No release notes provided.


## [2.602.26] - 2025-10-04

No release notes provided.


## [2.602.25] - 2025-10-04

No release notes provided.


## [2.602.24] - 2025-10-04

No release notes provided.


## [2.602.23] - 2025-10-04

No release notes provided.


## [2.602.22] - 2025-10-04

No release notes provided.


## [2.602.21] - 2025-10-04

No release notes provided.


## [2.602.20] - 2025-10-04

No release notes provided.


## [2.602.19] - 2025-10-04

No release notes provided.


## [2.602.18] - 2025-10-04

No release notes provided.


## [2.602.17] - 2025-10-04

No release notes provided.


## [2.602.16] - 2025-10-04

No release notes provided.


## [2.602.15] - 2025-10-04

No release notes provided.


## [2.602.14] - 2025-10-04

No release notes provided.


## [2.602.13] - 2025-10-04

No release notes provided.


## [2.602.12] - 2025-10-04

No release notes provided.


## [2.602.11] - 2025-10-04

No release notes provided.


## [2.602.10] - 2025-10-04

No release notes provided.


## [2.602.9] - 2025-10-04

No release notes provided.


## [2.602.8] - 2025-10-04

No release notes provided.


## [2.602.7] - 2025-10-04

No release notes provided.


## [2.602.6] - 2025-10-04

No release notes provided.


## [2.602.5] - 2025-10-03

No release notes provided.


## [2.602.4] - 2025-10-03

No release notes provided.


## [2.602.3] - 2025-10-03

No release notes provided.


## [2.602.2] - 2025-10-03

No release notes provided.


## [2.602.1] - 2025-10-03

No release notes provided.


## [2.602.0] - 2025-10-02

No release notes provided.


## [2.601.3] - 2025-10-01

No release notes provided.


## [2.601.2] - 2025-10-01

No release notes provided.


## [2.601.1] - 2025-10-01

No release notes provided.


## [2.601.0] - 2025-10-01

No release notes provided.


## [2.599.13] - 2025-09-19

No release notes provided.


## [2.599.12] - 2025-09-19

No release notes provided.


## [2.599.11] - 2025-09-19

No release notes provided.


## [2.599.10] - 2025-09-19

No release notes provided.


## [2.599.9] - 2025-09-19

No release notes provided.


## [2.599.8] - 2025-09-19

No release notes provided.


## [2.599.7] - 2025-09-19

No release notes provided.


## [2.599.6] - 2025-09-19

No release notes provided.


## [2.599.5] - 2025-09-19

No release notes provided.


## [2.599.4] - 2025-09-19

No release notes provided.


## [2.599.3] - 2025-09-19

No release notes provided.


## [2.599.2] - 2025-09-19

No release notes provided.


## [2.599.1] - 2025-09-19

No release notes provided.


## [2.599.0] - 2025-09-19

No release notes provided.


## [2.598.11] - 2025-09-18

No release notes provided.


## [2.598.10] - 2025-09-18

No release notes provided.


## [2.598.9] - 2025-09-17

No release notes provided.


## [2.598.8] - 2025-09-17

No release notes provided.


## [2.598.7] - 2025-09-17

No release notes provided.


## [2.598.6] - 2025-09-17

No release notes provided.


## [2.598.5] - 2025-09-17

No release notes provided.


## [2.598.4] - 2025-09-17

No release notes provided.


## [2.598.3] - 2025-09-17

No release notes provided.


## [2.598.2] - 2025-09-17

No release notes provided.


## [2.598.1] - 2025-09-17

No release notes provided.


## [2.598.0] - 2025-09-17

No release notes provided.


## [2.597.0] - 2025-09-17

No release notes provided.


## [2.596.0] - 2025-09-17

No release notes provided.


## [1.1.0] - 2025-09-17

No release notes provided.
