# Status

The current state of the project: what is released in the code, what still
needs checking against real services, and what a deployment needs.
`docs/ROADMAP.md` is the plan; this file is the current state.

Last updated: 28 October 2026.

## Current release

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
- Until an app turns on in-app purchases, its Android app keeps the website
  checkout for paid courses.
- An app on its own API returns `store_billing` and the `store` action from
  its own API (the developer guide's "Sell in the app").

## Deployment

- Migrations up to `0092` (`npm run db:migrate` in `platform/web`).
- Google real-time notifications use one Pub/Sub topic for every app
  (`GOOGLE_PUBSUB_PUSH_EMAIL`, `GOOGLE_PUBSUB_TOPIC`; see
  `docs/LAUNCH-CHECKLIST.md`). Each app's owner enters the topic in their own
  Play Console › Monetization setup; the platform finds the app by its
  package name.
- Plugin 0.4.23 goes to sites once the app update with in-app purchases is
  in the stores; 0.4.24 (the header) after the app update that shows it.

## Planned (to agree on before any work)

- **A store review account in every app, required.** Google Play (App
  access) and the App Store (App Review Information) need a working
  sign-in for their reviewers, or the app is rejected. Today only apps on
  the hosted API must set one (a fixed review phone or email with a fixed
  code, checked in Publishing's readiness); WordPress apps and apps on
  their own API only get a note. Make a fixed review sign-in (user name and
  password, or the review number or email with its fixed code) required
  for every app source before a store build, and show the owner the exact
  steps to enter it in Play Console and App Store Connect, in English,
  Arabic and Turkish.
- **Yallapp Studio** (a separate mode with its own plans and prices): a
  free-form editor with drag and drop, layers and full styling, rendered
  natively by the app from data; the same data sources as the regular
  editor (WordPress, Wix, Shopify, Salla, Zid, no website, own API);
  advanced Studio templates; new project types only in Studio, starting
  with delivery and courier companies (then multi-restaurant food delivery,
  car rental, hotels and rentals, home services, laundry). Later, after
  Studio is finished and tested: sharing templates for free or selling
  them by monthly, yearly or lifetime subscription, with Yallapp's share
  at 25% (taxes, payout and gateway fees included) and payouts to the
  seller's bank account (SWIFT).
