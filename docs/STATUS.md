# Status

Where the work stands now: the step being done, the checks it passed, the
open pull requests and what waits on the owner. `docs/ROADMAP.md` is the plan;
this file is the current state. Update it in the same change as each step,
and whenever a pull request is opened, merged or closed.

Last updated: 27 October 2026.

## Phase 100 (courses and memberships bought in the app): 100.1–100.6 merged, 100.7 next

| Step | State | Branch | Checks |
|---|---|---|---|
| 100.1 Contract | Merged (#156) | — | redocly lint |
| 100.2 Store connections and products | Merged (#157) | — | unit, e2e, MariaDB migrations |
| 100.3 Purchases | Merged (#158) | — | unit (with the store suite on MariaDB), e2e |
| 100.4 Plugin 0.4.23: give and take access | Merged (#160) | `wip-billing-plugin` | composer lint, `php -l`, PHPUnit 250 (16 new), redocly lint. The LMS integration suites run in CI |
| 100.5 App: Google Play Billing and StoreKit | Merged (#161) | `wip-billing-app` | dart format, flutter analyze, flutter test 955, the preview rebuilt, the platform's app-string tests |
| 100.6 Sales, the guide, the terms | Merged (#159) | `wip-billing-sales` | tsc, eslint, unit 2007, the store suites on MariaDB, redocly lint, e2e: analytics, owner API, public pages, integrations, site languages, hosted courses |
| 100.7 Own API, Teachable and Thinkific | Not started | — | — |

Notes:

- 100.4 adds three answers to `POST /billing/access` in `openapi.yaml`
  (400, 409 `conflict`, 503); they go in with the plugin's pull request.
- 100.4 calls into LearnDash and WooCommerce Subscriptions that could not be
  run here (both are paid plugins); test them on a real site before release.
- 100.5 changes the iOS rule in `CLAUDE.md` to what Phase 100 decided: no
  website checkout on iOS; paid courses only through the App Store's in-app
  purchase. Not tried on a device yet: restore on iOS, and phones without
  Google Play.
- 100.6 gives the Owner API `in_app_sales`; Yallapp Business doesn't show it
  yet (a small change to the Business app after Phase 100).
- Until an app turns on in-app purchases, its Android app keeps the website
  checkout for paid courses, so no sales are lost before the app update ships.
- The Analytics e2e failed between 21:00 and 24:00 UTC (the test dated its
  events in UTC, the app counts days in Istanbul). Fixed in 100.6.
- The plugin's campaign check failed now and then (its reader joined after
  the campaign, and the inbox shows what came from the second someone
  joined). Fixed in 100.6.
- CI on a pull request checks only what its latest push changed and cancels
  the run before it: after a small push, re-run the pull request's first
  full run (or push all of it again) before merging.

## Open pull requests

| PR | What | Next |
|---|---|---|
| #154 Wip switch design | Older design branch | The owner closes it |
| #122, #121 | Dependabot: mobile and business Flutter packages (minor and patch) | Review with the next app release |
| #120 | Dependabot: `@playwright/test` 1.64 | Needs the pre-installed browser to match; leave for now |
| #113 | Dependabot: GitHub Actions | Review |
| #97, #94 | Dependabot: `firebase_messaging` and `firebase_core` | Review with the next app release |
| #92, #91, #90, #89 | Dependabot majors: eslint 10, pdfjs-dist 6, TypeScript 7, `@types/node` 26 | Each needs its own change; not merged |
| #86 | Dependabot: fastlane 2.241.1 | Review |

## Waiting on the owner

- Google real-time notifications: create the Pub/Sub topic and its push
  subscription, then set `GOOGLE_PUBSUB_PUSH_EMAIL` and `GOOGLE_PUBSUB_TOPIC`
  in Netlify (`docs/LAUNCH-CHECKLIST.md`).
- Run migrations up to 0091 on production when 100.6 is deployed.
- Install plugin 0.4.23 on the client sites once 100.5's app update is out.
- Yallapp Business iOS build 61.
- Close #154.
