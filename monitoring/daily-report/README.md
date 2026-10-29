# Nourish daily report

One run a day: a visual + page-health check of 43 pages (desktop 1440×1000 and mobile 390×844: every main-nav page plus one page per template in `pages/core.json`, every paid page in `pages/paid.json`, every ad landing page in `pages/landing.json`), a nav/menu check, a quiz and insurance-search check, Lighthouse lab scores for every page (analytics blocked and verified), a tracking-stability summary, and one detail page per page. The result is posted through the shared sender in `../alerts.js` as a compact Slack message (quiet on no-change days, see below) linking to the full HTML report at https://nourish-visual-report.pages.dev/ (Cloudflare Pages, noindex header + robots.txt, HTML and images only; `publish.mjs` refuses to publish if a local path is in the HTML, and `daily.mjs` does not publish at all unless the speed test proved it reached no analytics). The local copy is `monitoring-local/daily-report/latest/index.html`; the message links to it if the report was not published. The page has no login: anyone with the link can see it.

## What runs

- **Pages** – the Unify page checker (`~/Documents/Codex/2026-10-27/task/unify-page-checker`, override with `NOURISH_PAGE_CHECKER_DIR`) is used as-is: BackstopJS/Playwright capture with motion frozen, independent health checks, a same-run repeat capture as a noise check, and a comparison with the previous run's screenshots. Pages are listed in `pages/*.json` (the checker allows 25 per file).
- **Flagging** – same rules as Unify. Issues are only real breakage: HTTP errors, uncaught page errors, broken first-party assets, missing required content (h1 by default; signup links on the paid pages; headline and insurance form on `/does-my-insurance-cover-nutrition`, which has no h1), metadata (title, canonical, unexpected noindex) and failed nav/menu checks. A visual change is more than 2% of pixels vs the previous run. Accessibility is reference only. One comparison mask: the partner hero image (`.condition-hero_image`), whose `srcset` lists the same file at 500w and 1236w so Chrome renders it at a different size from load to load (5–8% drift); the health check still fails if it doesn't load. An issue already present in the previous run shows as "still open" and doesn't turn the DM red again.
- **Quiz and insurance search** (`form-check.mjs`) – on every page state: answers each step of the Videsigns quiz and checks it ends on the signup link; in each insurance-search module (hero "Check your coverage", "Find dietitians") picks Cigna, California and a first name where present and checks the module's own signup link gains `nourishPayerId`, `state` and `firstName`. Signup navigations are captured and aborted. The quiz library's own setup self-check throws on every load (it looks for `data-form="multistep"`; the form uses `multi-step`); that one error is listed as known, not an issue, only where the form check traces it to the Videsigns script on that page state.
- **Nav** (`nav-check.mjs`) – main template: nav links visible and the Company dropdown opens; partner template: hamburger opens on mobile; paid/landing template: nav bar shows its link/button.
- **Performance** (`performance.mjs`) – after the page work, Lighthouse on every page in the three page sets on desktop and mobile (86 loads, about 10 s each), scoring Performance, Accessibility, Best practices and SEO through the page checker's wrapper (`src/performance.mjs`: the `bf-cache` audit is skipped because its unblocked re-navigation leaked pageviews on Unify on Oct 27 2026). Analytics are blocked at the Chrome level: the checker's analytics hosts plus Nourish's own are unresolvable (`--host-resolver-rules`): RudderStack's SDK at `jssdk-proxy.{usenourish.com,nourish.com}` and its collector at `dataplane-proxy.{usenourish.com,nourish.com}`, the Statsig experiment sidecar's endpoints (`featureassets.org`, `api.statsigcdn.com`, `prodregistryv2.org`, `statsigapi.net`, and `cloudflare-dns.com`, which its SDK uses to look up fallback domains when those fail), read from the live pages on Oct 29 2026, plus the LinkedIn insight hosts, TikTok and GTM. Each load's own network log is then checked for answered requests to any of those hosts; the count is stored per load (`report.json` → `performance.rows[].analyticsRequests`). Scores, LCP, CLS and total blocking time are drawn as donut gauges on each page's detail page; the main report keeps one Performance line. The only Performance alert: a page's **Performance** score drops by more than 10 points against the previous run (same page and viewport), or a load reached an analytics host; the other three categories never alert. A day whose loads reached analytics is discarded as the next day's baseline. Lab numbers are single throttled runs on this Mac, so a few points of day-to-day movement is normal. The HTML Lighthouse reports are not saved (only HTML is published); the JSON stays in the run folder. Budget: `NOURISH_PERF_BUDGET_SECONDS` (default 1800); pages past it are recorded as skipped.
- **Detail pages** (`detail-page.mjs`) – `pages/<id>.html` per page, linked from each page card: captured states, health findings, the nav and quiz/insurance-search results, the Lighthouse gauges with metrics, and a 7-day strip of the Performance score from the stored runs (`loadScoreHistory` in the checker; a day whose speed test reached analytics is skipped). No analytics charts: Nourish has no PostHog project, and the Amplitude volumes are site-wide (main report).
- **Tracking** (`tracking.mjs`) – reads the hourly monitor's latest results in `monitoring-local/` (never re-runs it) and, when an Amplitude key is present, compares yesterday's volumes for `Viewed Page`, `Viewed  Page` (two spaces), `Get Started Clicked`, `FlowLoaded`, `MarketingSignUpCompleted` and `Get Started Clicked` with `cta_name` containing `| Other` (should be 0) against the same weekday last week and the trailing 7-day average.

- **GA4 and Search Console** (`google.mjs`) – read through NewBase's adapters (`~/ShipStudio/newbase/console/src/server/sources/`: `google.ts` service-account JWT with read-only `analytics.readonly` + `webmasters.readonly` scopes, `ga4.ts`, `search-console.ts`), imported as-is (`NEWBASE_DIR` overrides the path). GA4: yesterday's sessions, users and key events vs the same weekday over the previous 4 weeks, plus top pages (by sessions) and channels. Search Console: the latest final day (2–3 days behind) vs the 7 days before for clicks, impressions, CTR and average position, plus top queries and pages, per site in `google-sources.json`. Same flag thresholds as the Amplitude volumes; CTR and position are reported, not flagged. Top queries and pages appear on the published (noindex, no-login) page.

## Safety

- Every browser uses the page checker's protection: analytics hosts (RudderStack, Amplitude, GA, Meta, Bing, LinkedIn, Clarity, …) are unresolvable, all non-GET requests are aborted and `sendBeacon` is a no-op. The nav/form browsers and the Lighthouse Chrome add Nourish's own hosts (`performance.mjs` → `NOURISH_ANALYTICS_HOSTS`: the RudderStack SDK and dataplane proxies on both apexes, the Statsig endpoints and their DNS-over-HTTPS fallback, LinkedIn, TikTok, GTM). The nav check also aborts `/dietitian-application` and the RudderStack dataplane proxy. A probe of `/paid` on Oct 27 2026 showed no analytics request completing. The Lighthouse run has no request routing, so it relies on the unresolvable hosts and proves the result from its network log: the report is published only when every attempted load shows 0 answered analytics requests (a load that threw before writing a log is unverified and also blocks publishing that day; the message says why). Nothing is clicked except menu toggles; no forms are submitted.
- `/dietitian-application` is not in the page list and is never loaded.
- Credentials stay in the login Keychain: `nourish-monitor-slack` (Slack bot token, already used by the hourly monitor) and `nourish-amplitude-api` (account = Amplitude API key, password = secret key). Nothing secret is read from or written to the repo.

## Commands

```bash
node monitoring/daily-report/daily.mjs --now --no-slack
```

`--now` runs even if today's run already completed; `--no-slack` prints the message instead of sending it, with a line saying whether it would have posted; `--no-publish` skips the Pages update. Republish the latest report alone with `node monitoring/daily-report/publish.mjs`. Results: `monitoring-local/daily-report/runs/<time>/` (last 30 kept), `latest` symlink, `state.json` (which also records the last message's status for the quiet rule). A run takes about 40 minutes (20 for the pages, 15–20 for Lighthouse); `daily.mjs` allows 120.

## Slack message (Oct 29 2026)

Same shape as Unify's compact message (`summary.mjs` → `dailyNotification` for the contract-v1 model, `renderDailyMessage` for the text):

1. headline: status emoji, "Nourish daily site check — <no change | review needed | site problem | check failed | incomplete>", run time in Pacific
2. one line of numbers: pages captured (desktop + mobile), visual changes, new issues, quiz and insurance search working
3. attention lines only when present: pages not captured, changed pages and new issues (up to 4 ids, then "+N more"), still-open issues from before, run problems and unknowns (⚠️), and the supporting areas
4. the report link (or the local path when the report was not published)
5. a one-line next step, omitted when nothing changed

The headline is the page check (visual, health, nav, quiz and insurance search) and whether the run finished. Supporting areas add a line only when they need attention, and a red one posts on its own without changing the headline: 🔴 *Performance* (score drop of more than 10 points, or the speed test reached analytics), 🔴 *Hourly tracking monitor* (no results or stale; its own failures are alerted by the monitor itself and are not repeated here), 🔴/🟡 *Amplitude* (a flagged event volume; a missing Amplitude key is shown in the report, not here), plus SEO/AEO, GA4 and GSC lines when site-audit turns them on and they are not green. The weekly site-audit Performance line is no longer shown anywhere; today's Lighthouse result replaces it in the report's summary table too.

**Quiet rule:** the channel hears about a day only when the headline is not "no change" or a red supporting line is present, or once after such a day so the clear is seen (`state.json` → `lastNotification.neededAttention`). Still-open issues from an earlier day do not post by themselves; they appear as a ⏳ line when something else does. With no record of the previous day the sender stays quiet.

Store the Amplitude key (Amplitude → Organization settings → Projects → Nourish (373727) → API key and secret key); `-w` with no value makes `security` prompt for the secret so it stays out of shell history:

```bash
security add-generic-password -s nourish-amplitude-api -a YOUR_API_KEY -w
```

Approve a baseline after reviewing the exact screenshot (same flow as Unify; nothing is approved automatically):

```bash
node ~/Documents/Codex/2026-10-27/task/unify-page-checker/src/cli.mjs approve --site monitoring/daily-report/pages/paid.json --run monitoring-local/daily-report/latest/artifacts/nourish/paid/RUN_ID/run.json --key paid--default--desktop --reviewer 'Gemin Pak' --reason 'Reviewed screenshot and clean health evidence'
```

Set up GA4 and Search Console access (read-only; skipped cleanly until done):

1. Google Cloud console: in a project you own, enable the **Google Analytics Data API** and the **Google Search Console API**, create a service account (no roles needed), and download a JSON key for it.
2. GA4: Admin → Property access management → add the service account's email as **Viewer**. Note the numeric **Property ID** (Admin → Property details) and put it in `google-sources.json` as `ga4Property`.
3. Search Console: for `sc-domain:nourish.com` and the old usenourish.com property, Settings → Users and permissions → add the email with **Restricted** permission. If the old property is a URL-prefix one, change its entry in `google-sources.json` to that URL (e.g. `https://www.usenourish.com/`).
4. Store the key in Keychain, then delete the downloaded file:

```bash
security add-generic-password -s nourish-google-sa -a nourish-daily-report -w "$(jq -c . ~/Downloads/KEY_FILE.json)" && rm ~/Downloads/KEY_FILE.json
```

## Schedule (installed Oct 27 2026)

`com.gemin.nourish-daily-report.plist` runs `daily.mjs` with node at 8:30 AM PT, with retries at 11:00 and 15:00 that exit at once if the day's run already completed. Installed in `~/Library/LaunchAgents` on Oct 27 2026; to reinstall elsewhere:

```bash
cp monitoring/daily-report/com.gemin.nourish-daily-report.plist ~/Library/LaunchAgents/ && launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.gemin.nourish-daily-report.plist
```

Tests: `node --test tests/daily-report.test.mjs`.
