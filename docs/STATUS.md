# Status

The current state of the project: what is released in the code, what still
needs checking against real services, and what a deployment needs.
`docs/ROADMAP.md` is the plan; this file is the current state.

Last updated: 28 October 2026.

## Current release

Phase 104 (delivery and courier companies) steps 104.1 to 104.5 are
complete: a new app type, Delivery, with no website. Customers send a
parcel (pickup and drop-off by address, their position, a pasted maps link
or the map), see the price as they type, pay in cash or by card through the
company's own gateway, and follow the stages and, where the company picks
it, the courier on a map. The company's couriers get a Courier tab in the
same app (no one else sees it): on duty, their jobs, waiting jobs to take,
each step, cash to collect and the position shared while a parcel is on the
way. The dashboard has Shipments, Couriers, Delivery settings and the
services; prices by distance, area or fixed, cash or card, jobs given or
taken and where couriers work are each company's choice. Delivery is the
plan feature `delivery` (and `courier_app` for a second courier app), off
on every plan until the team turns it on and prices it in Admin › Plans.
Still to come: the courier app under the company's name (104.6), review
accounts for both roles (104.7) and the shared Yallapp Courier app (104.8,
published together with the owner). Checks: redocly lint, platform unit
tests, tsc, eslint, flutter analyze and widget tests.

Phase 103 (Yallapp Studio) is complete: Dashboard › Studio designs a
page freely on a canvas (shapes, texts, pictures, buttons, icons and lists
from the app's source; drag, resize, layers, starting templates including
one for delivery companies), saved in the Pages & look draft. The hosted
API and plugin 0.4.25 serve the page's canvas (`AppPage.canvas`), and the
app draws it natively, scaled to the screen. Studio is the plan feature
`studio`, off on every plan: the team turns it on, with Studio's plans and
prices, in Admin › Plans; until then a canvas isn't served. Checks: redocly
lint, platform unit tests, e2e of the editors, composer lint, flutter
analyze and widget tests.

Phase 102 (a store review account in every app, required) is complete:
Publishing › Store review account holds the reviewers' sign-in for every
app (App sign-in's fixed number or email and code where Yallapp signs people
in; an account of the site or API, its password encrypted, elsewhere), with
the steps for Play Console and App Store Connect. Ready to submit and the
checks before a build need it. Checks: platform unit tests, e2e of
publishing and the client flow.

Phase 101 (header types in the regular editor) is complete: Pages & look ›
Look › Header offers Title, Centered, Logo and Search, with up to four
buttons (search, cart, notifications, chat, account). The app shows it on
the pages in the bottom tabs; WordPress sites pass it on from plugin
0.4.24. Checks: redocly lint, platform unit tests, composer lint and the
plugin's integration suite, flutter analyze and widget tests.

Phase 100 (courses and memberships bought in the app through Google Play
Billing and the App Store's in-app purchase) is complete (steps 100.1 to
100.7):

| Step | What | Checks |
|---|---|---|
| 100.1 | Contract: store products, purchases, notifications, `Config.store_billing` | redocly lint |
| 100.2 | Store connections and products in Google Play and App Store Connect | unit, e2e, MariaDB migrations |
| 100.3 | Purchases checked with Google and Apple, access given and taken back | unit (with the store suite on MariaDB), e2e |
| 100.4 | WordPress plugin 0.4.23: gives and takes access on the site | composer lint, `php -l`, PHPUnit, the LMS integration suites |
| 100.5 | App: Google Play Billing and StoreKit, restore, manage subscription | dart format, flutter analyze, flutter test |
| 100.6 | Sales in Analytics and the Owner API, the guide, the terms | unit, e2e (analytics, owner API, public pages) |
| 100.7 | Apps on their own API, Teachable and Thinkific schools | unit, MariaDB store suites, e2e of the dashboard |

## To verify against real services before release

These parts were tested against recorded answers or could not run in the
test environment:

- The plugin's calls into LearnDash and WooCommerce Subscriptions (both are
  paid plugins).
- Teachable's enrolment calls (`POST /enroll`, `POST /unenroll`), its price
  unit (taken as the minor unit) and its `one_time` payment type.
- Thinkific's enrolment calls (`POST /enrollments`,
  `PUT /enrollments/{id}` with `expiry_date`) and its `one-time` payment
  type.
- Restore purchases on an iPhone, and phones without Google Play.

## Known gaps

- The Owner API returns `in_app_sales`, but Yallapp Business does not show it
  yet.
- Apps built before Phase 102 without a review sign-in can't start a new
  build until the owner adds one on Publishing.
- Until an app turns on in-app purchases, its Android app keeps the website
  checkout for paid courses.
- An app on its own API returns `store_billing` and the `store` action from
  its own API (the developer guide's "Sell in the app").
- Studio pages need the app update that draws them: older apps show a
  Studio page empty. The Studio editor shows the canvas left to right; the
  app mirrors it in right-to-left languages.

## Deployment

- Migrations up to `0093` (`npm run db:migrate` in `platform/web`).
- Delivery apps (Phase 104): turn on the plan features `delivery` and,
  for a second courier app, `courier_app`, with their prices, in Admin ›
  Plans; set the map tiles (an address with `{z}`, `{x}`, `{y}` and its
  attribution) in Admin › Settings › Maps before any company picks the
  live map. Without tiles, maps show the stages only.
- Google real-time notifications use one Pub/Sub topic for every app
  (`GOOGLE_PUBSUB_PUSH_EMAIL`, `GOOGLE_PUBSUB_TOPIC`; see
  `docs/LAUNCH-CHECKLIST.md`). Each app's owner enters the topic in their own
  Play Console › Monetization setup; the platform finds the app by its
  package name.
- Plugin 0.4.23 goes to sites once the app update with in-app purchases is
  in the stores; 0.4.24 (the header) and 0.4.25 (Studio pages) after the
  app update that shows them.

## Planned (to agree on before any work)

- More Studio project types (Phase 105) and the Studio template
  marketplace (Phase 106, postponed): see `docs/ROADMAP.md`.
