# Offline source fixtures for WEBFLOW-7E

Retrieved using non-executing raw HTTP GETs on 2026-10-23. No production
application page was opened in Chromium. Keep these files byte-for-byte intact.

| File | Raw source | SHA-256 |
| --- | --- | --- |
| `chunk-M65MOCFB.js` | https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2.3.59/dist/chunk-M65MOCFB.js | `2d760d5a9ae1e9725f83af511b6c12f6899eb132dbdfc3342ef4e5b03562cf8b` |
| `fs-components.js` | https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2/fs-components.js | `8c9f5468438c093363f2767385f3e0e514e01b37ed78cd9fa0d17b7b2b60cef5` |
| `dietitian-application-v2.620.42.js` | https://cdn.jsdelivr.net/gh/long-view-labs/webflow@v2.620.42/dietitian-application-final.js | `30c52fcedfa16474483e94ec17c3745cbf0b7b72313ff4a115bf7a11c19c6a29` |

The matching package metadata at
https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2.3.59/package.json
reports version `2.3.59`. The entry is retained to verify its **static** import
of the failing chunk; tests execute the exact standalone chunk, not the full
SDK dependency graph. The production application fixture differs from current
repository source in stale stored-draft recovery; both versions are tested.

The HTML fixture in `tests/finsweet-initialization.test.js` is intentionally a
minimal application host, **not** a capture of the published page. Its mocked
iframe proves mounting only. It does not implement or validate the real
application, submissions, FAQ, shared navigation, or other Webflow interactions.

The altered `Error` constructor is test-only fault injection. It models one
sufficient condition for the exception, not a diagnosis of production runtime
instrumentation, Sentry, or a browser extension.
