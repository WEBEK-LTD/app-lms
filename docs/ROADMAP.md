# Roadmap

The roadmap lists Yallapp's development in phases. Each step has a "done
when" check that marks it finished.

Status: `[x]` done · `[~]` in progress · `[ ]` not started

## Phase 0: Preparation

| | Step | Owner | Done when |
|---|---|---|---|
| [x] | 0.1 Designs with the Yallapp brand and Google Material Symbols | — | Approved on the design canvas |
| [x] | 0.2 Domain `yallapp.com.tr` | WEBEK | Registered |
| [x] | 0.3 cPanel on `host.webek.org`: MySQL database and user, Remote MySQL, SSL | WEBEK | Database reachable over SSL with a dedicated user |
| [x] | 0.4 Netlify site connected to this repository and the domain | WEBEK | A test deploy is live on `yallapp.com.tr` |
| [ ] | 0.5 Staging WordPress site: Tutor LMS, Digits (waabek gateway), WooCommerce, sample lessons (HTML, iframe, video) | WEBEK | URL and a test admin account shared privately |

## Phase 1: Repository foundation

| | Step | Done when |
|---|---|---|
| [x] | 1.1 Repository layout, README, brand files, editor settings | Layout on the branch |
| [x] | 1.2 Architecture, brand rules and the plugin API contract (`docs/api/openapi.yaml`) | Contract approved |
| [x] | 1.3 CI: API contract lint, PHP syntax on 7.4 and 8.3, WordPress coding standards | CI green |

## Phase 2: WordPress plugin (`wp-plugin/yallapp`)

Every step below is built and passes the end-to-end checks on the dev site
(WordPress 7.1 + Tutor LMS 4.1.1, `tests/integration/run.sh`, run in CI).
Each step closes once its "done when" check passes on the staging site (0.5).

| | Step | Done when |
|---|---|---|
| [~] | 2.1 Plugin bootstrap, settings page (Yallapp brand), detection of LMS, Digits and WooCommerce | Installs on staging without errors |
| [~] | 2.2 Auth: Digits OTP request and verify, JWT access and refresh tokens, devices, sign-up, store review access | You sign in with your number and the code arrives through waabek |
| [~] | 2.3 Tutor LMS adapter: config, categories, courses, course detail, curriculum, my courses | Data matches the website |
| [~] | 2.4 Lesson content: rendered HTML, clean-up, iframe size metadata, video with signed links | Every sample lesson comes back correctly |
| [~] | 2.5 Progress, quizzes and certificates (when Tutor Pro is active) | Progress shows on the website |
| [~] | 2.6 Checkout hand-off with one-time sign-in, free enrollment | A test purchase enrolls the student |
| [~] | 2.7 Push notification hooks, license client (inactive until Phase 4) | Unit tests pass |

## Phase 3: Flutter app (`mobile/`)

Built with 264 tests (models against the contract, token refresh, iframe sizing on
several screens, purchase rules, every screen in all templates). The first APK is
built by `.github/workflows/mobile.yml`; each step closes on a phone against staging.

| | Step | Done when |
|---|---|---|
| [~] | 3.1 Core: white-label config, templates, theme, API client, secure storage | |
| [~] | 3.2 Sign in and verification code | Sign in on a phone |
| [~] | 3.3 Home (three templates), courses, course detail, my courses | |
| [~] | 3.4 Video player with screen-capture blocking and watermark | |
| [~] | 3.5 HTML and iframe rendering, with automated checks on several screen sizes | No iframe renders at the wrong size |
| [~] | 3.6 Quizzes, account, settings, push notifications | APK works on your phone against staging |

## Phase 4: Yallapp platform (`platform/web/`, Netlify)

Built and tested with the in-memory data store (unit and browser tests in CI).
Each step closes once it runs on Netlify against the MySQL database (0.3, 0.4).

| | Step | Done when |
|---|---|---|
| [x] | 4.1 Database schema and secure connection from Netlify to MySQL on `host.webek.org` | |
| [x] | 4.2 Website: landing, guides, legal pages | Live on `yallapp.com.tr` |
| [x] | 4.3 Client accounts, dashboard, setup wizard | |
| [x] | 4.4 Super admin: activation and plans | |
| [~] | 4.5 License and plugin update API; switch on the plugin license client | A test client goes from sign-up to activation |

## Phase 5: App builds (`build/`)

The pipeline (`.github/workflows/build-apps.yml`), the platform's signing and
download endpoints and the files host are built and tested piece by piece.
The first real build needs the setup in `build/README.md`, then a test client.

| | Step | Done when |
|---|---|---|
| [x] | 5.1 Android build per client: APK, AAB, encrypted signing key | |
| [~] | 5.2 iOS build on macOS CI with App Store Connect | |
| [~] | 5.3 Automatic store upload for the Pro plan | |
| [~] | 5.4 File storage on `files.yallapp.com.tr` and downloads in the dashboard | A test client enters details and receives the apps |

## Phase 6: Launch

First real client, then Pro plugin licenses and testing, then adapters for
LearnDash, LearnPress, LifterLMS, MasterStudy, Sensei and Masteriyo.

| | Step | Done when |
|---|---|---|
| [~] | 6.1 LearnPress adapter | End-to-end checks pass on LearnPress 4.4.8 (done); a client site runs on it |
| [~] | 6.2 LifterLMS adapter | End-to-end checks pass on LifterLMS 10.3.2 (done); a client site runs on it |
| [x] | 6.3 Sensei LMS, MasterStudy LMS and Masteriyo adapters | End-to-end checks pass on each (Sensei LMS 4.26.4, MasterStudy LMS 3.4.9, Masteriyo 1.13.4) |
| [~] | 6.4 LearnDash adapter | Adapter written from LearnDash's developer reference and checked against its source (4.25.2 and 5.2.0); end-to-end checks pass on a local site with LearnDash 5.2.0 (done); checked against a real LearnDash site (it isn't on wordpress.org) |

## Phase 7: More app types

Store (WooCommerce) and Bookings modules, built on the same app, plugin and
build pipeline. A Store app keeps its cart in the app and hands it to the
site's own WooCommerce checkout; physical goods can be sold on iOS too, digital
products only on Android.

| | Step | Done when |
|---|---|---|
| [x] | 7.1 Store API: products, categories, reviews, cart pricing, checkout hand-off that fills the WooCommerce cart, delivery date and gift message, store orders | End-to-end checks pass on WooCommerce |
| [~] | 7.2 Store app module: home, catalog, product, cart, checkout, orders | Screen checks pass (done); APK works against a test shop (needs a Store build, 7.3) |
| [~] | 7.3 Store in the dashboard and build pipeline | A test client picks Store and receives the apps (dashboard and pipeline accept Store; waiting on a real Store build) |
| [x] | 7.4 Bookings API: contract, then adapters for Amelia (Lite books only its first employee, so the app offers only that one), BookingPress (the free plugin has no staff, so the app books one calendar) and LatePoint (Bookly is no longer downloadable from wordpress.org) | End-to-end checks pass on each plugin (Amelia, BookingPress 1.1.28 and LatePoint 5.7.4 in CI) |
| [x] | 7.5 Bookings app module | Screen checks pass |
| [~] | 7.6 Bookings in the dashboard and build pipeline | A test client picks Bookings and receives the apps |

## Phase 8: Websites without WordPress

The app only talks to the API in `docs/api/openapi.yaml`. The Yallapp plugin
is one way to serve it; these steps add others, so a client with any website,
or none, can have an app.

| | Step | Done when |
|---|---|---|
| [~] | 8.1 API address in the build config (`api_base_url`, default `<site_url>/wp-json/yallapp/v1`), "Custom API" on the dashboard's Website step with a live check of the client's API against the contract, and a developer guide | A build points at a non-WordPress API that passes the check (app, build config, dashboard check and guide done; waiting on a real custom API) |
| [x] | 8.2 WordPress set up for the client: a "We set it up for you" request on the Website step (WordPress on a subdomain with the plugin, WooCommerce or an LMS, and their content imported), handled by the WEBEK team | A client can request it and the team sees the request |
| [~] | 8.3 Hosted API on yallapp.com.tr for connected platforms: config, phone sign-in with our own SMS/WhatsApp sender, tokens, devices, push, notifications | The app signs in against the hosted API (API, admin switch, dashboard notifications and end-to-end checks of the app's calls done; waiting on our WhatsApp number or SMS gateway, and an app build against it) |
| [~] | 8.4 Shopify connector (Store apps): products, collections, cart pricing, checkout, orders through the Shopify APIs | Checks pass against a Shopify development store (connector, Website step, order history with an optional Admin API token, and checks against a fake shop done; waiting on a development store) |
| [~] | 8.5 More connectors as clients ask: ikas, Ticimax, IdeaSoft (stores), Teachable, Thinkific (courses), SimplyBook (bookings) | Each passes its checks against a real account (all six written from their API documentation, on the Website step, with checks against fake servers; details only a real account can confirm are marked in the code; waiting on a test account of each) |
| [~] | 8.6 No website at all: products or courses managed in the Yallapp dashboard and served by the hosted API, with online payments | A client without a website publishes an app (Store apps done: products, categories, shipping, iyzico payment page, orders, checked end to end against a fake iyzico; Bookings apps done: services, team, hours, rules and appointments in the dashboard, booking through the hosted API; Academy apps done: courses, sections, lessons, free enrolment, paid courses on Android through the payment page, progress; waiting on an iyzico sandbox account and app builds) |

## Phase 9: Everything from the admin

The WEBEK team runs Yallapp from the super admin pages, without editing code
or Netlify variables: platform settings, plans and prices, every client's
settings, and payments, both clients paying Yallapp and shops selling through
Yallapp's own iyzico account.

| | Step | Done when |
|---|---|---|
| [x] | 9.1 Platform settings in the admin: sign-in code sender (WhatsApp Cloud API or our gateway), email (SMTP) with a test email, and Yallapp's iyzico account; secrets stored encrypted, Netlify variables kept as the fallback | The team changes the code sender and email from the admin and they take effect |
| [x] | 9.2 Plans and prices edited in the admin: names, prices, periods, features, shown on the pricing page and used by licenses | A price change shows on the pricing page |
| [x] | 9.3 Every client's settings in the admin: app type and backend, hosted sign-in rules, store review number, shop settings and payment keys | The team changes a client's app without the client |
| [x] | 9.4 Clients pay their plan by card (Yallapp's iyzico), and the license is activated or extended | A test client pays and is activated |
| [x] | 9.5 Shops without a website can sell through Yallapp's iyzico account (marketplace, a commission set in the admin) instead of their own | A test order pays the shop its share |

## Phase 10: Pages, looks and languages

Clients edit their app's pages, look and languages from the dashboard, like
a site builder, without a new build. The app renders whatever the API sends.
Planned in `docs/ARCHITECTURE.md` ("Pages, looks and languages"). The hosted
apps and their sign-in this needs for clients without WordPress are Phase 8.

| | Step | Done when |
|---|---|---|
| [x] | 10.1 Plan and API contract: `Config.appearance`, `/pages`, page blocks | Contract approved |
| [~] | 10.2 App: looks from `/config` (templates, light, dark and system mode, font, corners, cards) | Changing the look in the API changes the app without a new build |
| [x] | 10.3 App: bottom tabs and pages from `/pages`, one renderer for every block in every template, fallback to `/home` | Every block renders in all templates on several screen sizes |
| [x] | 10.4 Dashboard: page and look editor with drag-and-drop ordering, preview, drafts and publish | A client builds and publishes a page |
| [~] | 10.5 Plugin: fetch the published layout from the platform and serve `/pages` with the site's courses, products and posts | A page published in the dashboard shows in a WordPress client's app |
| [~] | 10.6 Hosted API: serve `/pages` and the look for apps on the hosted API, with their dashboard content or connected platform | A page published in the dashboard shows in a hosted app |
| [~] | 10.7 Real estate apps: listings managed in the dashboard, search, filters, favorites and messages to the office | A real estate test app runs on the hosted API |
| [x] | 10.8 Languages: English by default, more languages the client turns on (right-to-left for Arabic), translated page content | A test app switches between English and Arabic |

## Phase 11: The admin runs everything

The WEBEK team controls every part of Yallapp from the super admin pages.

| | Step | Done when |
|---|---|---|
| [x] | 11.1 Overview: clients, revenue, builds and apps at a glance | The numbers match the data |
| [x] | 11.2 One page per client: plan and extension, app, connection, builds, app users, notifications | The team handles a client from one page |
| [x] | 11.3 Website content edited in the admin: home page texts, guides and legal pages | A text change shows on yallapp.com.tr |
| [x] | 11.4 Email templates edited in the admin | A changed template is what clients receive |
| [x] | 11.5 Switches: app types, platforms and features on or off, per plan | A switched-off platform disappears from the Website step |
| [x] | 11.6 Coupons and discounts on plans | A coupon lowers a card payment |
| [x] | 11.7 Admin team with roles, and a log of every change | A support admin can't change prices; the log shows who changed what |
| [x] | 11.8 Announcements to clients, in the dashboard and by email | Clients see an announcement |
| [x] | 11.9 Defaults for new apps: template, look and languages | A new client starts with the defaults |

## Phase 12: Several apps per account

One account (one sign-in) creates and runs several apps. Each app has its own
plan, price, license key, end date, website, payments and builds, exactly like
a separate client. There is no bundle plan: coupons give a second app a lower
price. Suspension stays for the whole account. Built and tested with the
in-memory store and on MariaDB 10.11 (unit and browser tests).

| | Step | Done when |
|---|---|---|
| [x] | 12.1 Data model and migration: several apps per account (oldest first), a license per app (`licenses.app_id`), plan payments per app (`plan_payments.app_id`), build numbers and version codes per app; existing licenses and payments backfilled from each client's single app (`drizzle/0016_several_apps.sql`) | The migration runs on MariaDB 10.11 with existing data, and again as a no-op |
| [x] | 12.2 Dashboard: an app switcher in the dashboard header (the client's own apps, remembered in a cookie, also for the team managing a client), "Add an app" that starts with the app type, every page working on the current app | A client adds a second app and the switcher changes which app the dashboard edits |
| [x] | 12.3 Licenses, payments and activation per app: License & plugin shows the current app's plan, key, end date and website; paying by card (with coupons) activates or extends that app only; the pending page and the activation and renewal emails name the app; an account is active while any of its apps is | A card payment for one app doesn't change the other |
| [x] | 12.4 Admin per app: the client list shows each client's apps and their states; the client page has a section per app (plan and license, app, connection, builds, app users and notifications); activation, new key and releasing the website per app; overview counts per app; audit entries name the app; announcements by plan or app type reach an account when any of its apps matches | The team activates only a client's second app, on another plan |
| [x] | 12.5 Plugin, hosted API and pipeline per app: a license key resolves to its own app (license API and `POST /apps/layout`), the hosted API checks that app's own license, builds and switches use the app's plan, and the pipeline API sends each build's `app_id` | Each app's key and hosted API answer for that app only |

## Phase 13: Plans, limits and owner notices

Four plans per app, Starter, Growth, Pro and Business, whose features and
limits the platform, the builds, the hosted API, the plugin's layout and the
app hold to. A feature an app's plan doesn't have disappears from the app
quietly; the dashboard shows it with an "Upgrade" button. Owners hear from
Yallapp before an app reaches its users limit or its plan ends, and app users
of a paused app see how to reach the app's owner. Built and tested with the
in-memory store and on MariaDB 10.11 (unit, browser, plugin and app tests).

| | Step | Done when |
|---|---|---|
| [x] | 13.1 Four plans with features and limits per app (`src/lib/plans.ts`), each editable on the admin's Plans page with audit entries; the old Starter and its licenses, payments, coupons, announcements, switches and price move to Growth (`drizzle/0018_plan_features.sql`); iOS builds, connected platforms, the full page editor, languages, card payments in the app, app users, "We publish for you", automatic rebuilds, offline mode and push enforced, the rest marked display-only; the pricing page with the four plans and a comparison table | A Starter app gets no iOS build, ready-made pages and one language, and the pricing page shows the admin's prices |
| [x] | 13.2 App users limit on the hosted API (`app_user_limit` for a new user, existing users unaffected; WordPress sites keep their users, no limit), a usage meter with "Upgrade" on the dashboard, usage per app on the admin's client page, owner notices by email and on the dashboard at 80% and 100%, once per crossing | A test app at its limit refuses a new number and its owner gets one email |
| [x] | 13.3 Changing plans from the dashboard: upgrade by card at once with the unused days credited at their value, a lower plan from the end of the paid period (scheduled, or paid ahead), "Keep my plan" | A test client upgrades and sees the credited days; a downgrade starts on its date |
| [x] | 13.4 Plan-ending reminders by email (admin-editable templates) and on the dashboard 7 days and 1 day before and on the day, each once per license period, with "Renew by card"; a Netlify scheduled function runs the daily job (`netlify/functions/daily-notices.mts` → `POST /api/internal/daily`) | The daily job sends each reminder once (`INTERNAL_JOB_SECRET` set on Netlify) |
| [x] | 13.5 Owner contact: `license_inactive`, `account_suspended` and `app_user_limit` carry `contact` (contract first); the app shows "{App} is paused" with "Contact {App}" and "Try again", and "{App} isn't taking new members right now" on sign-up; the plugin and the hosted API name the app instead of "the academy" | A paused test app shows its owner's WhatsApp button |

## Phase 14: We publish for you, and builds you can trust

Many clients don't know how to publish an app. They can now ask our team to
publish it for them, under their own store accounts, and the Builds &
downloads page says clearly what happened to every build and what to do
next. Everything is per app. Built and tested with the in-memory store and on
MariaDB 10.11 (unit and browser tests); the publishing service comes with the plans that include "We publish for
you" (`canUseManagedPublishing` in `src/lib/publishing/steps.ts`).

| | Step | Done when |
|---|---|---|
| [x] | 14.1 Data model and migration: who publishes each app (`apps.publishing_mode`), a publishing request per app with the client's checklist, the extra listing details and a status per store (`publishing_requests`), and the history of status changes (`publishing_events`) (`drizzle/0017_publishing_service.sql`) | The migration runs on MariaDB 10.11 with existing data, again as a no-op, and finishes after a halfway stop |
| [x] | 14.2 Dashboard › Publishing: "I'll publish it myself" (the files, our guides, store keys on Pro) or "Publish it for me": a step-by-step checklist with official Google, Apple and Firebase links (developer accounts in the client's name, D-U-N-S for organisations, invitations to our publishing team email, Firebase by the client or by us), a Done box per step, the listing details (categories, content rating notes, notes for reviewers; texts and screenshots from the setup); each store's status on the page and the overview; no passwords asked for or stored; with "Publish it for me", Pro needs no store keys in the setup | A client asks us to publish, ticks the checklist and fills the listing details; the team is emailed |
| [x] | 14.3 Admin › Publishing: the queue of apps we publish (oldest request first; in progress, live, all), the client's steps and listing, a status per store (Waiting for the client, Accounts ready, Submitted, In review, Live with the store link, Rejected with a note), team notes, history, the audit log; each new status emailed to the client ("Publishing status changed", editable in Emails); Settings › Publishing service sets the team email (the contact email until set); permission `publishing.manage` (admin, support) | The team moves a store to Live and the client sees it on the dashboard and by email |
| [x] | 14.4 Builds & downloads you can trust: plain status labels with queued, started and finished times; why a build didn't finish, in plain words, and Try again with the same version; a stopped build (no report for 6 hours, or a day in the queue) no longer blocks the app; one build at a time even on a double click; Download buttons only for files the build has, each signed when clicked; why a file is missing (no iOS app without an App Store Connect key); emails that name the app and open it; the team emailed when a build fails; no private CI log links for clients; license states explained (earlier files stay downloadable); admin build queue newest first, with times, logs and "Mark as not finished" | Each case is covered by a unit or browser test against the pipeline API |
| [x] | 14.5 Pipeline: messages for clients in plain words; a build whose iOS app couldn't be built keeps its Android files (ready, with the iOS stage failed); `ios` starts as skipped without an App Store Connect key; the contract (`docs/api/pipeline.yaml`) says so | `python3 -m unittest discover build/tests` passes |

## Phase 15: A clearer client dashboard

Accounts now have several apps, four plans, publishing, builds, pages,
content, notifications, notices and usage meters. The client dashboard gets a
design and usability pass so all of it stays easy to find and to use, on a
phone and on a large screen. Presentation only: routes, actions, permissions,
data, contracts and business rules don't change. Checked with the unit and
browser tests, and with screenshots at 1440 and 390 pixels
(`tests/screens/review.screens.ts`).

| | Step | Done when |
|---|---|---|
| [x] | 15.1 Navigation: a sidebar in groups (the app; its content and customers by type, such as the shop, school, bookings or properties; its app users on the hosted API; Publish; Account) with Material Symbols icons and the current page marked; on phones a top bar with a Menu button that opens the links as a sheet (Escape closes it); a skip link; only the pages the current app's type and backend use; the license page is "Plan & license" for apps without the plugin | A shop without a website sees Products and Orders, a WordPress academy doesn't, and the menu works with the keyboard at 360 pixels |
| [x] | 15.2 App switcher: the current app's icon, name, type and state on a card that opens the list of apps, and "Add an app" below it | A client with two apps switches between them from any page |
| [x] | 15.3 Overview: the app at a glance (icon, type, state, plan and days left) with the one next thing to do; setup steps with the next one; the latest build with its APK download; each store's publishing status; the plan with renewal, the plugin connection or the app users meter; owner notices and announcements; shortcuts that fit the app; what the plan includes and the upgrades | A new, a pending, an active and a paused app each show what to do next |
| [x] | 15.4 One system for every page: page headers, cards with headings, notices, empty states, progress bars, link cards, a loading state, the build history as cards on phones; plugin downloads only for apps that use the plugin; plain, consistent labels | Every dashboard page looks the same at 1440 and 390 pixels with no sideways scrolling |
| [x] | 15.5 The dashboard screenshots on yallapp.com.tr (`public/screens/dashboard-*.png`) show the new look | The home page shows the new dashboard |

## Phase 16: Demo apps people can try

Prospective clients try real Yallapp apps before they pay: one demo app per
app type on the hosted API, with sample content, installable on Android and
shown on yallapp.com.tr/demo. Built and tested with the in-memory store and
on MariaDB 10.11 (unit and browser tests). How to run them is in
`docs/ARCHITECTURE.md` ("Demo apps") and `docs/LAUNCH-CHECKLIST.md`.

| | Step | Done when |
|---|---|---|
| [x] | 16.1 Admin › Demo apps (permission `demos.manage`, audited): creates or refreshes the "Yallapp demos" account (`demos@yallapp.com.tr`, platform setting `demo`) with Nour Academy, Lale Flowers, Studio Nur and Nile Homes on the hosted API: distinct colours, templates and fonts, store listing, published pages, courses with lessons, products with categories and prices, services, team and hours, listings; pictures drawn in code (`src/lib/demo/pictures.ts`); a Business license to 2099; running again updates in place (`apps.demo`, `drizzle/0019_demo_apps.sql`); demo apps left out of the overview's numbers and owner notices | Running it twice leaves four apps with their content and no duplicates |
| [x] | 16.2 Demo sign-in: the public number +1 202 555 0123 with the code 246810 signs in to a shared demo account in demo apps only (no message sent; other numbers refused with `demo_number_only`; 10 requests an hour per IP and 300 per app; the account can't be renamed or deleted); checkout opens a "Demo" payment page that never asks for a card; the daily job deletes visitors' orders, bookings, conversations, favorites, enrolments, progress and idle devices after 24 hours | Unit and browser tests: the demo code never works in another app, the limits hold, old activity goes and new stays |
| [~] | 16.3 Installable APKs: "Start a build" per demo app through the normal pipeline; the team picks a ready build as the public download, served at `/demo/download/<academy\|store\|bookings\|real-estate>` (a link signed when clicked); "Coming soon" until then | A demo APK installs from the /demo QR code (code done and tested; waiting on the build setup in `build/README.md`) |
| [x] | 16.4 Website: `/demo` with the four demos (screenshots, what to try, "Download for Android" with a QR code made on our server, the demo number and code, iPhone demos on request through TestFlight); links in the header, the footer, the home page and each solutions page | The page shows "Coming soon" without a build and the download once one is picked |
| [x] | 16.5 Docs for the owner: creating the demos, building them and publishing the download | `docs/LAUNCH-CHECKLIST.md` has the steps |

## Phase 17: Try your app before you build it

Every client can run their real app from the dashboard before a build, to
check what they set up: app type, content source, branding, template, font,
pages, tabs and languages. The preview is the same Flutter app as the
installed one (`mobile/`), built for the web and served by the platform at
`/preview-app/`; it reads its build config from the platform instead of the
compiled one. How it works is in `docs/ARCHITECTURE.md` ("App preview").

| | Step | Done when |
|---|---|---|
| [x] | 17.1 Contract first: `GET /api/preview/{token}/config` (`docs/api/platform.yaml`: the build config from `buildConfigFor` with placeholders, which ones, the missing setup steps, the content source); in the app contract `Config.auth.preview_sign_in`, `preview: true` at `POST /auth/otp/request`, 403 `preview_review_number_only`, the hosted API's `X-Yallapp-Preview` and cross-origin access from yallapp.com.tr (`docs/api/openapi.yaml`) | `redocly lint` passes and the responses are checked against the contracts in unit tests |
| [x] | 17.2 Preview links (`src/lib/preview`): a token per app signed with a key made from `SIGNING_SECRET`, for one app only, for an hour, made each time the Preview page opens; the config endpoint reads only that app's config (rate limited per IP, 120 per 10 minutes); the hosted API takes the token as `X-Yallapp-Preview`: it answers the owner's preview before activation and after the plan ended (never for a suspended account), signs in only the store review number and serves the Pages & look draft when asked; CORS for the platform's own addresses only | Unit tests: a token never works for another app, edited or after its hour; an unfinished app's config passes the build config schema; another number gets no code |
| [x] | 17.3 The app on the web (`mobile/web`, `lib/core/preview`): the web build is only the preview and starts from the platform's config (Android and iOS keep the compiled one); each app's preview keeps its own browser storage; Light / Dark and the language from the link; web views, checkout and payment pages show "Available in the installed app" (with "Open in a new tab"), no push or screen capture protection, pictures from sites that refuse other addresses still show; sign-in with the store review number only, or a note when the server can't do that; a clear message when a site or API blocks the preview, an expired link or no content source yet | `flutter analyze`, `flutter test` and `flutter build web` pass, and applying the example config leaves `mobile/` unchanged |
| [x] | 17.4 Serving: `mobile/tool/build_preview.sh` builds the web app and copies it to `platform/web/public/preview-app` (committed: Netlify builds without Flutter; about 9 MB, CanvasKit from Google's servers; no client data); `--check` compares a fingerprint of the app's sources in CI (`mobile.yml`), which also builds the web app; `/preview-app/` may be framed by the site itself only | CI fails when the bundle is older than the app |
| [x] | 17.5 WordPress plugin: CORS headers the app needs (`Accept-Language`, `If-None-Match`, `X-Yallapp-Preview`; `ETag` and the plugin version readable), `preview: true` signs in only the store review number, `auth.preview_sign_in` in `/config` (PHP 7.4, WordPress 6.0) | `composer lint`, `php -l` and the plugin's unit tests pass; the integration test checks preview sign-in |
| [x] | 17.6 Dashboard › Preview your app (App group of the sidebar; buttons on the overview's app card, the setup steps and Pages & look): the live app in a phone frame, Light / Dark, the app's languages, "Reload after changes", "Open on your phone" with a QR code made on our server for the same link, what's missing next to it, published pages or the draft (hosted apps), how to sign in; docs article "Preview your app", an FAQ entry and "Let the app preview reach your API" in "Connect your own API" | A browser test opens the Preview page of a shop that isn't set up and sees the app read its config and the hosted API in the frame |
| [~] | 17.7 Tried on a real WordPress site and on phones (Android and iPhone, through the QR code) | Code done and tested; waiting on a WordPress test site with the new plugin (`docs/LAUNCH-CHECKLIST.md` › 6) |

## Phase 18: Sign-in for every app

Sign-in codes work on every WordPress site, with or without Digits and its
paid REST API add-on, and every app's owner chooses how people sign in:
phone, email or both. Built and tested with the in-memory store and on
MariaDB 10.11 (unit, browser, plugin integration and app tests). How it works
is in `docs/ARCHITECTURE.md` ("Sign-in for every app").

| | Step | Done when |
|---|---|---|
| [x] | 18.1 Contract first: `POST /sign-in-codes/send` and `LicenseStatus.sign_in_methods` (`docs/api/platform.yaml`); `Config.auth.methods`, `email_sign_in`, `password_reset_url`, `POST /auth/email/request`, `POST /auth/password` and a nullable `User.phone` (`docs/api/openapi.yaml`) | `redocly lint` passes and responses are checked against the contracts in unit tests |
| [x] | 18.2 "Sent by Yallapp": the plugin makes each code (6 digits, kept as an HMAC, 5 minutes, 5 attempts) and the platform delivers it on WhatsApp with the app's name, for active licenses on their own site only, limited per IP, per license (300 an hour, 2000 a day) and per number (one every 30 seconds, 10 an hour, across sites, as a keyed hash); nothing personal kept; available on every plan | Unit tests (license, limits, phone, fake sender) and the plugin's integration test with the platform stubbed |
| [x] | 18.3 Plugin 0.3.1: Settings › Sign-in chooses "Sent by Yallapp (WhatsApp)" (default) or Digits (only with its REST API add-on), development codes on local sites; another provider steps in when the saved one can't send, and the page says why; accounts are still found by Digits' phone fields; the compatibility card explains Digits without its REST API add-on | `composer lint`, `php -l`, unit tests and the integration test pass |
| [x] | 18.4 Admin: "Sign-in codes sent today" per app on the client page (an aggregate count) | The count follows the codes sent |
| [x] | 18.5 Sign-in methods per app on the dashboard's App sign-in page (now also for WordPress apps): phone, email or both; the hosted API emails 6-digit codes (template "Sign-in code") with the same limits, for apps whose content is managed in Yallapp (connected platforms find customers by phone); WordPress signs in with the account's email and password (`wp_authenticate`, limited, the same answer for an unknown address); the plugin gets the owner's choice with the license status | Unit tests, the plugin's integration test and a browser test |
| [x] | 18.6 The owner's own WhatsApp number (WABEK API key, encrypted, and instance) on App sign-in, with "Send a test code", for the app's phone codes on the hosted API and its WordPress site | Unit tests with a fake WABEK |
| [x] | 18.7 App: a Phone / Email switch when both are offered, email codes, email and password with "Forgot your password?", in English, Arabic and Turkish; the preview bundle rebuilt | `flutter analyze`, `flutter test` and `build_preview.sh --check` pass |
| [~] | 18.8 On the real client site (Digits 8.3.3.2 with Additional SMS Gateways, no REST API add-on) and on production | Waiting on WABEK and SMTP set on production and plugin 0.3.1 released (`docs/LAUNCH-CHECKLIST.md` › 7) |

## Phase 19: Every app type, checked end to end

A review of every kind of app (WordPress, own API, connected platforms,
content managed in Yallapp, and "set up WordPress for me") found gaps, now
closed. Built and tested with the in-memory store and on MariaDB 10.11.

| | Step | Done when |
|---|---|---|
| [x] | 19.1 Connected platforms: Shopify order history never matches an empty phone and also finds orders by verified email and the order's phones; Shopify setup checks the token's permissions (read_orders, read_customers) and the Storefront token's products; every connector has a test for an account without a phone | Unit tests with fake platforms |
| [x] | 19.2 Bookings by people who sign in by email: the email has its own column (`drizzle/0021_booking_customer_email.sql`), shown as an email on Appointments and in the owner's email | Unit tests and a browser test on both stores |
| [x] | 19.3 Teachable and Thinkific apps offer email sign-in; an email account is the school's student with that address, so courses bought on the website show in the app (paid courses still aren't sold in the app); App sign-in explains each platform | Unit tests |
| [x] | 19.4 Products managed in Yallapp aren't sold until card payments are set up, and the owner is told; `/config` still answers when a connected platform fails (logged); Real estate listings can be picked in the page editor | Unit tests and the catalog browser test |
| [x] | 19.5 Store review by email (owner's review email and code, hosted API and plugin 0.3.2); a failing own WhatsApp number falls back once to Yallapp's sender, is logged and emails the owner (at most daily); switching to a phone-only source warns about customers who signed up by email | Unit tests, plugin tests and a browser test |
| [x] | 19.6 Own API: the guide documents email sign-in; the API check validates `auth.methods` and `email_sign_in` and probes only the offered endpoints; the API is checked when saved and a failing check stays on the overview and Builds; App sign-in shows what the API offers | Unit tests |
| [x] | 19.7 "Set up WordPress for me": the website is optional; App sign-in, preview and pages say the right thing; the team's "WordPress is ready" (or the plugin's activation on a site) moves the app to WordPress and tells the client; hosted apps without a content source choose one before they build | Unit tests and a browser test |
| [x] | 19.8 "Publish it for me" in the setup's Publishing step; open requests counted in the admin menu; a warning when SMTP isn't set and a flag when the team's email fails; the team is told when a client publishes themselves; a new request starts the queue again | Unit tests and the publishing browser test |
| [x] | 19.9 One phone frame for the site and the dashboard: thin, proportional bezel and corners, a camera pill, a light shadow; used by the live preview, the Branding step and the page editor | Browser tests check the proportions and that no page scrolls sideways at 360 px |

## Phase 20: App kinds and verticals

Prepares Yallapp for new kinds of apps without adding any yet. An app's type
(`app_type`) is now its engine, the module its build includes; its vertical is
the kind of business, which changes wording, defaults, the demo and marketing,
never routes. The four kinds the app type picker shows behave as before.

| | Step | Done when |
|---|---|---|
| [x] | 20.1 One registry of engines and kinds (`platform/web/src/lib/app/kinds.ts`): names, icons, demo, home path, own content, page sources and default pages, websites offered, store categories, dashboard menu, marketing pages; every per-type table and check in the platform reads it; announcements offer Real estate too | Unit tests show the four kinds give the same values as before |
| [x] | 20.2 The vertical (`apps.vertical`, `drizzle/0022_app_vertical.sql`): none, restaurant, clinic, fitness or charity; saved by the app type picker; sent in the build config (`vertical`), `Config.vertical` and the license status (`app_type`, `vertical`) | Unit and contract tests; migrations applied twice on MariaDB 10.11; browser tests on both stores |
| [x] | 20.3 The app reads `vertical` from its build config and `Config` (unknown values are none) and has a wording helper with the default words in English, Arabic and Turkish; the app preview is rebuilt | flutter analyze and flutter test |
| [x] | 20.4 Plugin 0.3.3: the pages an app gets before any are published follow the app type chosen in the dashboard instead of a guess from the site's plugins; `Config.vertical` is passed on | Plugin unit tests |

## Phase 21: Clinics

The first kind with a vertical: Clinic, the bookings engine for doctors,
dentists and therapists. Patients book visits, read each doctor's profile and
answer the clinic's intake form; only the patient and the clinic see the
answers. Payment is at the clinic, so iOS is unchanged.

| | Step | Done when |
|---|---|---|
| [x] | 21.1 Kind `clinic` (engine `booking`, vertical `clinic`) in the registry: picker, Medical store categories, the dashboard's words (Doctors & services, Visits, Patients, the Website step) and the first layout's Visits tab | Unit tests; the four other kinds unchanged |
| [x] | 21.2 Contract: optional `StaffMember.specialties`, `languages`, `bio`; `BookingsConfig.intake_fields`; `answers` on `AppointmentInput` and in the customer's own `Appointment`s; `invalid_answers` (400). Answers never go in push, email or text messages | Redocly lint; contract tests |
| [x] | 21.3 Hosted bookings: intake questions in the booking setup, answers checked (required, type, length, options) and kept with the appointment (`drizzle/0023_clinic_intake.sql`), shown on the Appointments page only; the email says the answers are on the dashboard. Staff profiles on Services & team | Unit tests (checks, privacy of emails); browser test of a clinic app on the hosted API |
| [x] | 21.4 App: doctor, patient and visit words in the bookings screens (English, Arabic, Turkish), the intake form step before confirming, the patient's answers on their visit, doctor profiles; app preview rebuilt; screenshots for the website | flutter analyze and flutter test |
| [ ] | 21.5 The intake form for WordPress clinics (Amelia and LatePoint custom fields): hosted only for now. Until then WordPress clinics book through their plugin with the clinic's words and no intake form | The mapping is checked against the plugins' code in the integration environments (tests/integration) |
| [x] | 21.6 A clinic demo app (Kardelen Clinic, /demo/download/clinic), the Clinic solution page and the clinics article in the docs | Unit tests; browser tests of /demo and the public pages |

## Phase 22: Wix stores

Store apps take their products, categories, prices and checkout from a Wix
store, through Wix's Headless REST APIs, with the same platform connector
framework as ikas (`platform/web/src/lib/hosted/connectors/wix.ts`). Written
from Wix's documentation and SDK typings; details only a real Wix site can
confirm are marked "Unverified" in the code.

| | Step | Done when |
|---|---|---|
| [x] | 22.1 Wix connector: a Headless OAuth app's client ID gets anonymous visitor tokens (kept in memory, renewed once when refused); Catalog V3 products (search, sort, categories with their subcategories, sale, cursor paging), product detail with options, variants, images and the product page; categories without "All Products"; cart pricing from each product's variants; checkout through an eCommerce checkout and a redirect session to Wix's hosted checkout, opened in the app; digital products not sold on iOS | Unit tests with a fake Wix (token, products, categories, variants, cart, checkout link) checked against the contract |
| [x] | 22.2 Order history with an optional API key and site ID: orders placed with exactly the verified email of an email account, those of the Wix contacts with exactly the verified phone (E.164), and those placed or delivered with it; an empty phone or email never asks Wix for anything | Unit tests: phone, email, an account without either, a longer number, a number without its country code, a key without the contacts permission |
| [x] | 22.3 Website step: Client ID, optional API key (encrypted) and site ID (a dashboard address works), optional store address; the setup check reads one product and, with a key, one order, and says in plain English what to fix (wrong client ID, no Wix Stores, the older Catalog V1, a key without the orders permission, a wrong site ID); platforms can now word their own setup errors (`PlatformCheckError`) | Unit tests and the platforms browser test |
| [x] | 22.4 Registered everywhere platforms are: switches, the Store choices on the Website step, docs article "Connect your Wix store", Integrations and the marketing lists | Unit tests and the platforms browser test |
| [~] | 22.5 Checked against a real Wix store | Waiting on a Wix test site with Wix Stores (`docs/LAUNCH-CHECKLIST.md` › 8) |

## Phase 23: News and blogs

A new engine, `news` (kind "News & blog"), for news sites, blogs and
magazines: read-only articles, free to read (no paid content in v1, so no
reader-app rules). Articles come from WordPress posts, an own API, the site's
RSS or Atom feed, or articles written in Yallapp. Built and tested with the
in-memory store and on MariaDB 10.11. How it works is in
`docs/ARCHITECTURE.md` ("News & blog apps").

| | Step | Done when |
|---|---|---|
| [x] | 23.1 Contract first: `GET /news/home`, `/news/categories`, `/news/articles` and `/news/articles/{article_id}` (bodies like lesson content: `render_mode`, `html`, `embeds`), `Config.news`, the item source `articles`, the screens `articles` and `bookmarks`, notifications of type `article` and the `news` push preference (`docs/api/openapi.yaml`); `news` in the build config schemas and the platform contract | `redocly lint` passes and responses are checked against the contract in unit tests |
| [x] | 23.2 Plugin 0.3.6: the News endpoints from published posts (never private or password-protected), sticky posts as top stories, categories, search, featured image and author, the body through the HTML processor; "Notify app users about new posts" (off by default) with a per-post opt-out; page blocks and default pages for News & blog apps | `composer lint`, `php -l`, unit tests and the end-to-end run on a news site (CI) pass |
| [x] | 23.3 Articles written in Yallapp (`drizzle/0024_articles.sql`): the dashboard's Articles page (write, picture, sections, publish and unpublish, top stories), "Send as breaking news" through the hosted push; "My site's RSS feed" connector with the API check's protections and a small XML reader | Unit tests for both, and a browser test of the Articles page on both stores |
| [x] | 23.4 App: the news module (home with top stories and sections, latest by section and search, the article with the lesson renderer, saved articles on the device, sharing), the Breaking news switch in Settings, notifications that open the article; the preview bundle rebuilt | `flutter analyze`, `flutter test` and `build_preview.sh --check` pass |
| [x] | 23.5 The registry entry (`lib/app/kinds.ts`), page sources and defaults, the demo app "The Harbour Post", the /demo card, the solution page with screenshots from the app, the docs article "News and blog apps", CI builds of a News & blog app | Unit and browser tests |

## Phase 24: Your app's own email

An app's owner sends the emails that go to their app's users from their own
address, through their own email server, and WordPress apps can sign new
people up by email with a code. Built and tested with the in-memory store,
the plugin's unit and integration tests and browser tests. How it works is
in `docs/ARCHITECTURE.md` ("Sign-in for every app").

| | Step | Done when |
|---|---|---|
| [x] | 24.1 Contract first: `POST /sign-in-codes/send` takes `channel: email` with `email` (`invalid_email`) and `LicenseStatus.email_sign_in` (`docs/api/platform.yaml`); WordPress sites may serve `Config.auth.email_sign_in: code` (`docs/api/openapi.yaml`) | `redocly lint` passes and responses are checked against the contracts in unit tests |
| [x] | 24.2 "Your app's email" on App sign-in (hosted, WordPress and "set up WordPress for me" apps; own APIs are told their API sends its own emails): "Sent by Yallapp" (Yallapp's address with the app's name) or "My own email server" with Google, Microsoft, Zoho Mail (also EU), Yandex and Other, each with plain steps; the password encrypted per app (`app-smtp:<app id>`), never shown again, blank keeps it; a warning when the From address isn't at the username's domain; no unencrypted connection in production; "Send a test email" (5 per 10 minutes) with the server's error in plain words; only ports 25, 465, 587 and 2525, never a private or local address, 10-second timeouts | Unit tests with a fake transport; the browser test saves a Google mailbox, never sees the password again and gets a clear error from a server that doesn't exist |
| [x] | 24.3 Emails to the app's users (email sign-in codes, hosted and WordPress) go through the own server; emails to owners and the team stay on Yallapp's. When it fails: logged without secrets, sent once more from Yallapp's server, the day and reason shown on App sign-in, and the owner emailed at most once a day (template "Own email server failed") | Unit tests and the browser test (a code still arrives and the warning shows) |
| [x] | 24.4 Plugin 0.3.5: "Email sign-in works" with the password (default) or with a code; codes made like phone codes and emailed through `POST /sign-in-codes/send`; a new address gets a WordPress account when sign-up from the app is on; accounts that can edit the site never sign in by code; the dashboard's choice replaces the setting | `composer lint`, `php -l`, unit tests and the integration test pass |
| [x] | 24.5 App sign-in for WordPress chooses "With a code by email: anyone can sign up" or "With their password: existing accounts only", with clearer lines on when the website picks it up; docs "Send your app's emails from your own address" with each service's steps; the privacy policy mentions the owner's own email server | Unit tests and the browser tests |
| [ ] | 24.6 Tried with a real mailbox and on a WordPress test site with plugin 0.3.5 | `docs/LAUNCH-CHECKLIST.md` › 7a |

## Phase 25: Salla and Zid stores

Store apps take their products, categories, prices and order history from a
Salla or Zid store (the leading platforms in Saudi Arabia and the Gulf),
connected with OAuth through Yallapp's own partner apps instead of pasted
keys, on the same platform connector framework
(`platform/web/src/lib/hosted/connectors/salla.ts`, `zid.ts`). Written from
the platforms' documentation; details only a real store can confirm are
marked "Unverified" in the code. No migration: the partner apps are
encrypted platform settings and each store's tokens live in the app's
connector.

| | Step | Done when |
|---|---|---|
| [x] | 25.1 Partner apps: admin Settings › "Salla partner app" and "Zid partner app" (client ID, client secret, webhook secret; encrypted; help on where to create them and the callback addresses). The Website step's "Connect with Salla/Zid" sends the owner to the approval page with the app's ID signed as `state` (20 minutes); `/oauth/salla` and `/oauth/zid` check the state and that the signed-in owner has the app, swap the code, check the store and save it. Without the partner app the platform shows "Not available yet" (the team sees what to set). Disconnect deletes the tokens | Unit tests of the state and the callback (success, forged, expired, other platform, other owner, denied, refused code, unset app, store that can't be read); the platforms browser test |
| [x] | 25.2 Tokens: renewed a day before they expire and once when refused, saved as a pair in one write; one renewal per app and server, and across servers the refresh token is claimed in the store first (others wait for the saved pair; a refresh token is never used twice); a refused refresh token asks the owner to connect again. Salla's signed `app.store.authorize` webhooks (`/api/webhooks/salla`) renew the tokens of stores already connected | Unit tests: renewal before expiry, after a 401, two requests at once, another server's claim, a used refresh token, tokens of another store, webhooks |
| [x] | 25.3 Salla and Zid connectors: products (search, category, sale, price order per page), product detail with options and SKUs/variants as variations, images, prices and sale prices, categories with subcategories, cart pricing; checkout hands one product off to its page on the storefront, in the browser (more than one: one at a time); digital products aren't sold on iOS; order history of the customers with exactly the verified phone (E.164) or the verified email of an email account, never by an empty value | Unit tests with a fake Salla and a fake Zid checked against the contract |
| [x] | 25.4 Registered everywhere platforms are: switches, the Store choices on the Website step, the connected-platforms plan limit, docs articles "Connect your Salla store" and "Connect your Zid store", Integrations and the marketing lists | Unit tests and the platforms browser test |
| [~] | 25.5 Checked against real Salla and Zid stores | Waiting on the partner apps and test stores (`docs/LAUNCH-CHECKLIST.md` › 8) |

## Phase 26: Restaurants and cafés

The kind Restaurant & café: the store engine with the `restaurant` vertical.
Customers browse the menu by category, choose a dish's options, order for
pickup or delivery, now or for later, pay by card on our iyzico page (food is
a physical good, so iOS sells it too) and follow the order step by step.
Options, pickup, delivery and the kitchen are hosted first: WordPress
restaurants keep WooCommerce variations and get their order's step from its
status. Built and tested with the in-memory store and on MariaDB 10.11 (unit,
browser, plugin integration and app tests). How it works is in
`docs/ARCHITECTURE.md` (Flutter app, "Restaurants").

| | Step | Done when |
|---|---|---|
| [x] | 26.1 Contract first (`docs/api/openapi.yaml`, all optional): `ProductDetail.option_groups` (`id`, `name`, `min`, `max`, options with `price_delta`); cart lines send the chosen option IDs (`options`) and come back with them, priced by the server; `StoreConfig.fulfilment` (pickup, delivery, pickup address, minimum order, delivery fee, delivery areas and note, preparation time, time zone, opening hours as bookings' working hours, as soon as possible, `scheduled_slots`); `GET /store/order-times` (open now, opens or closes at, the times for later); the checkout link takes `fulfilment`, `delivery_address` and `scheduled_for` (`kitchen_closed`, `below_minimum`, `outside_delivery_area`); `Order.fulfilment`, `fulfilment_status`, the items' options and `GET /me/orders/{order_id}` | `redocly lint` passes; responses checked against the contract in unit tests |
| [x] | 26.2 Kind `restaurant` in the registry (icon `restaurant`, Food & Drink store categories, "Your restaurant" with **Menu** and **Kitchen**, the first layout's Menu tab); the dashboard's words (Menu, dishes, Add dish, Kitchen) | Unit tests; the other kinds unchanged |
| [x] | 26.3 Hosted menu (`drizzle/0025_restaurant.sql`: `catalog_products.option_groups`, `catalog_orders.fulfilment` and `fulfilment_status`): an options editor on each product (groups with at least and at most, options with an extra price); "Pickup and delivery" on the Menu page (hours, time zone, preparation time, pickup address, delivery fee, minimum, areas, as soon as possible and for later); options checked (unknown, twice, min and max) and priced on the server, never from the app; closed kitchens refuse as soon as possible and take times for later; restaurant customers sign in to order; the order keeps its options and fulfilment; the owner's email and the payment page show them | Unit tests: option checks and prices, hours, closed and next opening, times for later, the delivery minimum and areas, the settings form |
| [x] | 26.4 The Kitchen page (the Orders page of a restaurant): paid orders oldest first with their options, pickup or delivery, the time and the address; a button for the next step (Preparing, Ready, Out for delivery for deliveries, Completed) and Cancel order; steps only move forward; completing or cancelling closes the order (a marketplace order's share is released when completed); every step adds a notification and a push to the customer (`order_id` in the push opens the order); the page refreshes every 30 seconds | Unit tests of the steps and notifications; browser test: the owner sets a menu with options, a customer orders with options on iOS and pays, the kitchen moves the order and the app sees each step |
| [x] | 26.5 App: restaurant words (Menu, Search the menu…) in English, Arabic and Turkish; the Menu tab with category tabs that stay at the top; the option sheet (required and optional groups, how many to choose, the price as it changes, quantity); the cart's options, pickup or delivery with the address and district, as soon as possible or a time for later, the delivery fee, "Closed now — opens at …"; the order's tracking screen with its steps, opened from Orders and from the push; app preview rebuilt; website screenshots | `flutter analyze`, `flutter test` and `build_preview.sh --check` pass |
| [x] | 26.6 Plugin 0.3.7: Store orders carry `fulfilment_status` from the WooCommerce status (on hold is received, processing is preparing, completed, cancelled, refunded and failed are cancelled) and `GET /me/orders/{id}` returns the customer's own order. Variations stay the options of WordPress restaurants | `composer lint`, `php -l`, unit tests and the store integration test pass |
| [ ] | 26.7 WooCommerce Product Add-Ons as option groups: hosted first. The official add-on is a paid plugin that isn't in the integration environment, so it can't be checked yet | The mapping is checked against the add-on's code in the integration environments (tests/integration) |
| [x] | 26.8 A café demo app (Defne Café, /demo/download/restaurant: a menu with options, pickup and delivery, drawn pictures), the Restaurant & café solution page, the docs article "Restaurants and cafés" and the app types article | Unit tests; browser tests of /demo and the public pages |

## Phase 27: Gyms and fitness

The "Gym & fitness" kind: the bookings engine with the `fitness` vertical,
for gyms, studios and coaches. Members see the week's classes with the spots
left, book a spot (never more than the class holds) and buy a membership or
a class pack on the payment page; personal sessions stay ordinary
appointments. Classes and memberships are hosted first: WordPress gyms book
personal sessions through Amelia, BookingPress or LatePoint with the gym's
words. Built and tested with the in-memory store and on MariaDB 10.11 (unit,
browser and app tests).

| | Step | Done when |
|---|---|---|
| [x] | 27.1 Kind `fitness` in the registry (fitness_center, Health & Fitness): picker, the dashboard's words and menu (Classes & coaches, Timetable, Membership plans, Members, Personal sessions, Orders) and the first layout's Classes, Membership and My bookings tabs; the reviewers' hint on Publishing suggests the 3.1.3(e) note | Unit tests; the seven other kinds unchanged |
| [x] | 27.2 Contract, all optional: `BookingsConfig.classes`; `GET /bookings/classes`, `POST /bookings/classes/{id}/book` and `/cancel` (`ClassSession`); `GET /memberships/plans`, `POST /memberships/checkout-link` (Android and iOS), `GET /me/memberships`; `class_full`, `class_cancelled`, `membership_required`, `no_credits`; the `classes` and `memberships` screens | Redocly lint; every response checked against the contract in unit tests |
| [x] | 27.3 Hosted: weekly class templates, plans and "Classes need a membership" in the booking setup; classes made 8 weeks ahead on save and by the daily job (`drizzle/0026_fitness.sql`: `class_sessions`, `class_bookings`, `memberships`); spots taken under the class's row lock with a conditional update, credits used and given back in the same step; a coach teaching a class isn't free for a personal session | Unit tests, including concurrent bookings on the memory store and from eight connections on MariaDB (`TEST_DATABASE_URL`); migrations applied twice |
| [x] | 27.4 Memberships paid on the payment page as an order (own iyzico account or marketplace commission, as other payments); paying or the demo's "Place demo order" starts the membership | Unit tests |
| [x] | 27.5 Dashboard: Timetable (weekly classes, the coming week with who's coming, Cancel class with an inbox notification and push to members), Membership plans (with card payments) and Members (add a membership, add classes, end one) | Browser test of a gym on the hosted API, also on MariaDB: two members booking the last spot at once get one spot |
| [x] | 27.6 App: Classes (day tabs, class cards with spots left, Book and Cancel), My membership and the plans with the payment page hand-off, gym words in English, Arabic and Turkish; app preview rebuilt; screenshots for the website | flutter analyze, flutter test, `build_preview.sh --check` |
| [x] | 27.7 Demo app Pulse Studio (/demo/download/fitness: a week of classes, three coaches, two plans), the Gym & fitness solution page and the docs article "Gyms and studios" | Unit tests; browser tests of /demo and the public pages |
| [ ] | 27.8 Waiting lists, and classes from WordPress (Amelia events with group capacity): hosted only for now | Checked against the plugins in the integration environments (tests/integration) |

## Phase 28: Events and tickets

A new engine, `events` (kind "Events & tickets"), for culture centres,
venues, clubs and organisers: event listings, free sign-ups and paid tickets
with QR codes checked at the door. Hosted first: events are managed in the
dashboard. Built and tested with the in-memory store and on MariaDB 10.11.
How it works is in `docs/ARCHITECTURE.md` ("Events & tickets apps").

| | Step | Done when |
|---|---|---|
| [x] | 28.1 Contract first: `GET /events/filters`, `/events` (days, category, search, pages), `/events/{event_id}` (the description like lesson content, pictures, start and end with the organiser's clock, venue, online link for ticket holders only, organiser, ticket types with what their button does on this platform, places left, status), `POST /events/{event_id}/register`, `POST /events/checkout-link`, `GET /me/tickets` and `POST /me/tickets/{ticket_code}/cancel`; `Config.events`; the item source `events`, the screens `events` and `tickets`, notifications of type `event`; `events` in the build config schemas and the platform contract | `redocly lint` passes and responses are checked against the contract in unit tests |
| [x] | 28.2 Hosted events (`drizzle/0027_events.sql`): events, ticket types, tickets and settings. Ticket codes are 12 random characters; the QR payload is signed with a key per app. Places are taken atomically (the event's row is locked), never sold twice; paid places are held while the buyer pays on the payment page (own iyzico account or Yallapp's, with the marketplace commission) and the tickets are issued only once iyzico confirms the payment. Online-only events are digital content: on iOS their paid tickets have no button and the checkout link is refused | Unit tests, with concurrent claims on the memory store and from eight connections at once on MariaDB, and the iOS rule |
| [x] | 28.3 Dashboard: the Events page (events, pictures, venue or online link, ticket types, settings, card payments), sales and attendees with a CSV export, cancelling an event (its tickets with it) or a ticket; the Check-in page on a phone (type a code or scan with the camera where the browser can read QR codes; a ticket gets in once, a second scan says when it was used); ticket holders are told when their event's time, place or link changes or it's cancelled | Unit tests and a browser test of both pages, with twelve sign-ups at once for three places |
| [x] | 28.4 App: the events module (a list and a month calendar, categories and search, the event with Open in maps, Add to calendar and Share, free tickets, the payment page for paid ones), My tickets with QR codes kept on the phone for offline use, cancelling a free ticket; notifications that open the event; the preview bundle rebuilt; screenshots for the website | `flutter analyze`, `flutter test` and `build_preview.sh --check` pass |
| [x] | 28.5 The registry entry (`lib/app/kinds.ts`), page sources and defaults, the demo app "Kuzey Culture Centre" (free and paid events, an online one), the /demo card, the solution page, the docs article "Events and tickets", CI builds of an Events & tickets app | Unit and browser tests |
| [ ] | 28.6 WordPress: The Events Calendar (`tribe_get_events`) and Event Tickets (RSVP for free tickets, WooCommerce tickets through the checkout hand-off) in the plugin. Follow-up: the integration environment couldn't install either plugin, so nothing could be checked against their code | An integration matrix entry with both plugins passes in CI |

## Phase 29: Charities and donations

A new engine, `donations` (kind "Charity & donations", vertical `charity`),
for charities, food banks and community groups: campaigns with a goal and
progress, donations paid on Yallapp's donation page into the charity's own
iyzico account (no Yallapp commission, never the marketplace account), and a
receipt for every donor. Apple's App Store guideline 3.2.2(iv) lets an iPhone
app take donations itself only for Apple-approved nonprofits using Apple Pay,
so the iPhone app always opens the donation page in the system browser
("Donate on our website"); Android opens it in the app (Google Play's billing
rules don't cover donations to charities today; policy-dependent). Hosted
only for now. Built and tested with the in-memory store and on MariaDB 10.11.
How it works is in `docs/ARCHITECTURE.md` ("Charity & donation apps").

| | Step | Done when |
|---|---|---|
| [x] | 29.1 Contract first: `GET /donations/campaigns`, `/donations/campaigns/{campaign_id}` (goal, raised, donor count, progress, the story processed like an article, preset amounts, minimum, recent donations), `POST /donations/checkout-link` (`open_in` always `browser` on iOS), `GET /me/donations` with receipt links, `Config.donations` (`currency`, `ios_mode`, `monthly`, `updates_push`), the `donations` push preference, notifications of type `campaign_update`, the item source `campaigns`, the screens `campaigns` and `my_donations`; `donations` in the build config schemas and the platform contract | `redocly lint` passes and responses are checked against the contract in unit tests |
| [x] | 29.2 Campaigns and donations (`drizzle/0028_donations.sql`): the donations connector, the donation page `/give/<token>` and its iyzico callback (a donation counts towards its campaign only once iyzico confirms it, in one transaction; each donor counted once by email), the `donation_receipt` email (no tax claims) and the receipt page; unit tests that iOS never gets `in_app` | Unit tests, migrations applied twice on MariaDB 10.11, browser tests on both stores |
| [x] | 29.3 Dashboard: Campaigns (own iyzico keys as a setup step, create, edit, publish, close, reopen, feature, delete only without donations, goal, suggested amounts, minimum, end date, pictures, currency, iPhone mode, updates to donors pushed only to phones that turned them on), Donations with CSV export, Donors; store review notes say donations happen in the browser | Unit tests and the donations browser test |
| [x] | 29.4 App: the donations module (campaigns with progress bars, the campaign with its story, amount picker with presets, own amount and minimum, anonymous and message, the donate button in the system browser on iPhone and in the app on Android, My donations with receipts), Campaign updates in Settings, notifications that open the campaign; the preview bundle rebuilt | `flutter analyze`, `flutter test` (with the iPhone browser rule) and `build_preview.sh --check` pass |
| [x] | 29.5 The registry entry, page source `campaigns` and default pages, the demo app "Bereket Food Bank" with two campaigns (its donation page charges nothing and never changes the totals), the /demo card, the solution page with screenshots from the app, the docs article "Charity and donation apps", CI builds of a Charity & donations app | Unit and browser tests |
| [x] | 29.6 Closed by the owner (Phase 96): recurring donations are between the charity and its gateway, not Yallapp's business. Was: Monthly donations: needs iyzico subscriptions (a stored card and recurring charges), which the integration doesn't have; until then `Config.donations.monthly` is false and monthly requests are refused, never charged once | A subscription integration tested against iyzico's sandbox |
| [ ] | 29.7 GiveWP on WordPress (forms as campaigns, totals, donor history by email or phone, hand-off to the GiveWP form page) | Not verifiable in the CI integration environment yet (the dev site runs on SQLite, GiveWP needs MySQL tables); hosted first |
| [ ] | 29.8 A progress block for pages | List blocks show campaigns with what was raised and the percent; a dedicated block needs contract, editor and app renderer work |

## Phase 30: WordPress apps follow their type

A client's WordPress app (Tutor LMS and WooCommerce on the site) was made as a
Store app. Until the plugin's next license check (up to 12 hours) the plugin
built its default pages from the site's plugins, so the app got course lists
it couldn't open (tapping did nothing) and a "Courses" tab that opened an empty
shop. Now the app tells the plugin its type, the app leaves out what it can't
open, the dashboard says what the site runs and when the type doesn't fit, and
the course page shows the lists Tutor LMS and LearnPress keep beside the
description. Reproduced and checked with the app preview against a local
WordPress 7.1.3 site with Tutor LMS 4.1.1 and WooCommerce 11.2.0.

| | Step | Done when |
|---|---|---|
| [x] | 30.1 Contract first: `app_type` on `GET /pages` and `/pages/{slug}` (the default pages are built for it; unknown values ignored), `CourseDetail.student_count` and `about` (`learn`, `requirements`, `audience`, `includes`), `SiteInfo.store` and `bookings` in the platform contract | `redocly lint` passes |
| [x] | 30.2 Plugin 0.3.8: default pages for the asking app's type, then the type from the license status, then a guess; the course lists from Tutor LMS and LearnPress and the student count; the shop and booking plugins in the license check; `/home` shows the latest courses when none are featured | Unit tests, `composer lint`, the integration suites on Tutor LMS (229 checks) and LearnPress (106) |
| [x] | 30.3 App: sends its type with `/pages`; lists and categories it can't open are left out instead of doing nothing when tapped; the course page shows the student count and the four lists, and opens on the overview for visitors when the course has them; the preview bundle rebuilt | `flutter analyze`, `flutter test`, `build_preview.sh --check`, and the preview against the local site |
| [x] | 30.4 Dashboard: the Website step, the overview and the license page say what the site runs ("Your website runs: Tutor LMS, WooCommerce"); a warning, with the type that fits and a link to change it, when the app's type doesn't fit the site; the same facts on the admin client page (`drizzle/0029_site_plugins.sql`) | Unit tests and the client-flow browser test |

## Phase 31: Every option fits the app type

An app owner only sees options, screens and wording that fit their app's
type, and what they save in the dashboard reaches their WordPress site within
seconds instead of at the plugin's next license check (up to 12 hours). The
platform nudges the site (`POST /license/refresh`, signed with the license
key) and the plugin pulls its status and pages as usual, trusting nothing in
the nudge. No database migration. How it works is in `docs/ARCHITECTURE.md`
(the platform's part in the overview).

| | Step | Done when |
|---|---|---|
| [x] | 31.1 Contract first: `POST /license/refresh` on the plugin (`timestamp`, `signature`: HMAC-SHA256 keyed with the license key; 202 with the new status, 401 `invalid_signature`, 429 with `retry_after_seconds`), tag Platform; the nudge in the platform contract's overview | `redocly lint` passes; the reference on /developers regenerated |
| [x] | 31.2 Plugin: the endpoint (reachable in maintenance and while the API is paused), timestamps within 5 minutes, one check every 30 seconds (a nudge too soon schedules one check for later), then the license check and the layout fetch; the settings page for the type chosen in the dashboard, else the site's plugins: course settings and notifications only for Academy apps, Checkout and Store for Store apps, a new Bookings card (home sections, banner, cancelling), News for News apps, a note instead of the Academy cards when nothing fits; neutral wording where every app sees it | Unit tests (`RefreshSignatureTest`, `SettingsCardsTest`), `composer lint`, the Tutor LMS integration suite (247 checks: the nudge over HTTP and in the site, the settings page per type) |
| [x] | 31.3 Platform: `lib/license/refresh.ts` (signature, https only, never a private address, no redirects, 5 seconds, never throws) run after the response for the app type, sign-in methods, publishing pages, a plan paid by card, and the team's activate, suspend and reinstate; "within a minute when your site can be reached" instead of "within 12 hours" | Unit tests with a fake site (signature shared with the plugin's test, private addresses, timeouts, which apps) and a check that those saves ask the site |
| [x] | 31.4 Pages & look: each engine's screens in `lib/app/kinds.ts`, checked against the Flutter modules' `screenLocation`; the screen picker offers only those, in the engine's words ("All products"); publishing refuses a screen or a course the app can't open, saying which; a layout from before a type change still loads, with "Needs a fix" on the tab or block; orders per list source (no prices for articles, posts, events or campaigns); the List hint names this app's lists | Unit tests and the pages browser test (on the memory store and MariaDB) |
| [x] | 31.5 Wording per type: the Website step's placeholder, the plan's card payments on the overview (left out for News and Real estate), Apple's rules on Builds and the preview, the store description hint and the content rating example | Unit tests |
| [x] | 31.6 The team's edits to what a plan includes (`savePlanLimitsAction`) nudge every WordPress site on that plan: done in 47.6 | Rare; until then they reach sites at their next check |

## Phase 32: The website, the company details and SEO

The owner reviewed yallapp.com.tr: the header had ten links and wrapped into
three lines on phones, the plans section said "Two plans" over four name-only
cards, the steps and the numbers band looked dull or broken, counts were out of
date, and the pages still showed WEBEK LTD's UK registration and address.
Yallapp is now presented as based in Cairo, Egypt. Search engines had no
sitemap, robots.txt, canonical addresses, link previews or structured data.

| | Step | Done when |
|---|---|---|
| [x] | 32.1 Header: Product (Solutions, Features, Integrations, How it works) and Resources (Docs, FAQ, API reference) lists that open by click, tap, Enter or Arrow down, move with the arrow keys, close on Escape, a click outside or leaving them, one open at a time; the section and the page are marked; Pricing, Demo, Contact, Sign in and Get started (lib/site-nav.ts, components/site-nav.tsx) | Unit tests and the menu browser tests |
| [x] | 32.2 Phones and tablets: a menu button opens a full-screen menu with the groups, Sign in and Get started; the page doesn't scroll behind it, focus stays inside and goes back to the button, Escape closes it; no sideways scroll at 320 px | Browser test at 320 px and screenshots |
| [x] | 32.3 Home: "A plan for every app" with four full plan cards shared with /pricing (price or "On request", key limits, highlights, Most popular, a button each; four equal columns, two on tablets, a row to swipe on phones), "Compare all features"; the steps as a timeline with an icon each; the numbers as a strip of figures counted from the registries (templates dropped) | Unit tests, the landing browser test and screenshots |
| [x] | 32.4 Counts follow the registries: "One platform, ten kinds of apps", the hero label, the steps title, the integrations introduction, the FAQ's app kinds, the demo link; outdated lists of kinds in descriptions fixed | Unit tests |
| [x] | 32.5 Company details: "© year Yallapp · Cairo, Egypt" in the footers and the email signature, the contact page, the README; the privacy policy (Yallapp as controller; Egypt's law, the GDPR and KVKK where they apply; no UK specifics) and the terms (good-faith talks for 30 days, mandatory rights of the client's country kept, no governing law clause) | Unit tests and browser tests; a lawyer should review the legal pages |
| [x] | 32.6 SEO: /sitemap.xml with every public page and solution and article (legal pages with their dates), /robots.txt keeping the private areas out, canonical addresses and Open Graph and Twitter cards on every public page, share images in Yallapp's colors and Bricolage Grotesque (site, pricing, each solution, each article), noindex on sign-in, payment, donation, receipt and shop pages; JSON-LD: Organization (Cairo, contact details from Settings), WebSite, SoftwareApplication with offers only for priced plans, FAQPage, BreadcrumbList on solutions and articles | Unit tests and the search engines browser test |
| [ ] | 32.7 Legal pages saved in the admin before this phase keep their old text until the team edits them or uses "Back to the default text"; the design files under `docs/design` still say WEBEK LTD (no UK details). The plugin's author and the API contracts' licence now say Yallapp | The team's review |

## Phase 33: More page blocks and ready-made designs for every app type

The owner found "Add a block" thin and the three looks (Classic, Bold,
Minimal) too bare: they only changed fonts and corners. Pages & look now has
eleven more blocks whose content the owner writes, in groups, and every kind
of app has three or four ready-made designs: tabs, a home page of blocks
with the app's own lists, and a look. A design replaces the draft only;
existing apps keep their pages until they pick one. Migration
`drizzle/0033_designs.sql` (`apps.design`, the design the owner last
started from). How it works is in `docs/ARCHITECTURE.md` (Pages, looks and
languages).

| | Step | Done when |
|---|---|---|
| [x] | 33.1 Contract first: `SliderBlock`, `QuickLinksBlock`, `TestimonialsBlock`, `FaqBlock`, `CountdownBlock`, `ContactBlock`, `HoursBlock`, `SocialBlock`, `TeamBlock`, `StatsBlock` and `NoticeBlock` in the app API; their entries' `translations` and what the plugin drops in the platform contract | `redocly lint` passes; the copy on /developers updated |
| [x] | 33.2 Platform: the blocks' types, validation (errors that say which slide, link, quote or time), translations of every entry (also when the default language changes), quick links to the app's screens, page renames, the plan's sources and the "Needs a fix" check through entries' actions; the hosted API serves them in the asked language and leaves out a countdown that has ended without a text | Unit tests (`blocks.test.ts`), checked against the contract |
| [x] | 33.3 Editor: "Add a block" in Content, Lists, Engage, Contact and Layout, each block with an icon and what it's for; settings with entries to add, move and remove; the phone preview draws them | The pages browser tests |
| [x] | 33.4 Designs as data (`lib/pages/designs`): Academy (Classic academy, Online courses, Coaching, Kids academy), Store (Fashion, Grocery, Electronics), Restaurant (Menu first, Delivery, Café), Bookings (Salon, Wellness studio, Consulting), Clinic (Family clinic, Dental clinic, Therapy practice), Gym (Gym, Yoga studio, Personal coach), Real estate (Agency, Rentals, Luxury homes), News (Daily news, Magazine, Blog), Events (Venue, Festival, Workshops), Charity (Charity, Urgent appeal, Community); the app's name in texts, Contact blocks with the details the app already has (left out without any) | `designs.test.ts`: every design valid for its engine on the hosted API and WordPress, every block, list, order, screen and icon one the app has |
| [x] | 33.5 Picking a design: the Branding step shows the kind's designs with a picture drawn from each (or "Keep my pages"), and a design brings its template and font; Pages & look has "Start from a design" (after a confirm; never what's published); blocks that still have a design's sample texts are marked "Sample text" | `designs.spec.ts` on the memory store and MariaDB: a design in setup, its blocks, one of each new block, publish, the hosted `/pages` |
| [x] | 33.6 Plugin: `Rich_Blocks` checks and cleans the new blocks (actions the site can't follow, tiles it can't open, an ended countdown), the translator applies entries' texts | `RichBlocksTest`, `composer lint`, the Tutor LMS integration suite (252 checks: the new blocks from `/pages/home`, in English and Arabic) |
| [x] | 33.7 App: the eleven blocks in the three templates, right to left, "Open now" in the phone's time (breaks, after midnight, holidays), a countdown that hides or says it ended, contact and social buttons that open the phone's apps (no brand logos: each network's name); a block whose list has nothing usable is skipped; the preview bundle rebuilt | `flutter analyze`, `flutter test` (each block in each template, light and dark, on a small phone and a tablet; Arabic for the slider, hours and contact), `build_preview.sh --check` |
| [ ] | 33.8 Pictures for designs: slides, people and quotes start without photos (the app's colors and initials instead); a picture library to choose from (84.2: Yallapp's pictures in "Choose from Media") | Owner's review |
| [ ] | 33.9 A Social links block in the designs: Yallapp doesn't know the business's profiles, so designs leave it out and the owner adds it | The profiles in the app's settings |

## Phase 34: Yallapp sign-in for apps on their own API

An app whose content comes from the client's own API had to serve every
sign-in endpoint itself: codes, sign-up, refresh, sign-out, devices and
account deletion. Now the owner can choose "Yallapp signs people in" on App
sign-in: Yallapp signs people in with the same choices as apps on Yallapp
(phone, email or both, Yallapp's or the owner's own senders, the store review
number and address, device limits, account deletion), and the client's API
only checks Yallapp's access tokens, ES256 JWTs signed with a key pair of that
app, against the app's public key set. How it works is in
`docs/ARCHITECTURE.md` ("Yallapp sign-in for apps on their own API").

| | Step | Done when |
|---|---|---|
| [x] | 34.1 Contract first: `Config.auth.provider` (`own` or `yallapp`) and `base_url`; the "Yallapp sign-in" tag (which endpoints Yallapp serves, the claims, what the client's API checks, `DELETE /me` first); `GET /.well-known/jwks.json` and the `Jwks` schema; `auth_base_url` in the build config schema and the preview config (`docs/api/platform.yaml`), whose `api_token` goes to Yallapp only | `redocly lint` passes, the public copy and the API reference regenerated |
| [x] | 34.2 Keys and tokens (`src/lib/hosted/app-auth.ts`): ES256 key pairs per app in `app_auth_keys` (`drizzle/0032_app_auth_keys.sql`), the private key encrypted with ENCRYPTION_KEY; `kid` is the JWK thumbprint; claims `iss`, `aud` (the app ID), `sub`, `phone` and `email` only when proven, `name`, `iat`, `exp` (15 minutes); replacing the key keeps the old public key published for a day; the key set at `/api/app/{id}/.well-known/jwks.json`, cacheable 5 minutes | Unit tests: tokens checked by jose like a client's API, refused for another app, issuer, key, algorithm, after expiry or changed; rotation and deletion; the key set against the contract; MariaDB 10.11 |
| [x] | 34.3 The hosted API for these apps: only `/config` (the sign-in part), sign-in, `/me`, devices and sign-out, with the hosted rules and rate limits; refresh tokens single use and ended by sign-out, device removal and account deletion; content, pages, push tokens and notifications are the client's | Unit tests with responses checked against the contract |
| [x] | 34.4 Dashboard: App sign-in's "Who signs people in" for own API apps; with Yallapp, the hosted sections (methods, WhatsApp number, email, rules) and "For your developer" (key set, issuer, audience, sign-in address, **Copy a test token** for the store review account, **Replace the signing key**); the preview page's sign-in note; the build and preview configs carry `auth_base_url` | Unit tests and the yallapp-sign-in browser test on the memory store and MariaDB |
| [x] | 34.5 The API check: with Yallapp signing people in, no sign-in in `/config` or sign-in endpoints are required; the app type's signed-in endpoint must answer 401 without a token and 200 with a test token (left out without a store review account; the team's connection check makes none) | Unit tests with a fake API |
| [x] | 34.6 The app: `auth_base_url` from the build or the preview; sign-in, the account, devices and refreshes go to Yallapp, everything else to the client's API with the token; the sign-in rules come from Yallapp's `/config`; an older build follows `auth.provider` in the client's `/config`, and sign-in returns to the client's API when Yallapp's `/config` answers 404; deleting the account calls the client's `DELETE /me` first; the preview token only to Yallapp | Flutter tests with two fake servers (routing, refresh at Yallapp then retry at the client, switching both ways, deletion), the build config tool; the preview bundle rebuilt |
| [x] | 34.7 Docs: "Let Yallapp sign people in" in the developer guide (the claims, checking the token in Node with jose, PHP with firebase/php-jwt and Python with PyJWT, mapping Yallapp users to your own by `sub` or the proven phone or email, the test token, switching an app built before) | The site content tests; the PyJWT sample checked against a token by hand |
| [x] | 34.8 (Done in Phase 49.) Account deletion when the client's API is down: the app asks it first and stops on an error, so the person retries; a signed notice (webhook) to the client's API would let Yallapp delete at once and tell the client later | When a client asks for it |
| [ ] | 34.9 People who signed in through the client's own API before the switch sign in again at Yallapp (their tokens stop working); moving their accounts over isn't offered | When a client with existing accounts asks for it |

## Phase 35: Samsung Galaxy Store

Android apps on Galaxy Store too, the app store on every Samsung phone, under
the client's own seller account. As with Google Play, the client (or our
team, through a manager invitation) publishes the first version by hand in
Seller Portal; after that, on plans with "We publish for you", every build's
APK is uploaded and submitted through the Galaxy Store Developer API (Content
Publish API). Galaxy Store gets the APK, signed with the app's upload key: an
App Bundle would need Samsung to manage the signing key. Built and tested
against a local mock of the API; nothing has been sent to Samsung yet (the
docs pages couldn't be fetched from here, so the API details come from
Samsung's documentation as search results quote it). Migration
`drizzle/0031_more_android_stores.sql` (shared with Phase 36).

| | Step | Done when |
|---|---|---|
| [x] | 35.1 Contract first: `galaxy_store` in `BuildSecrets` (content ID, service account ID, private key; only for builds whose plan uploads) and the `upload_galaxy` stage in `docs/api/pipeline.yaml` | `redocly lint` passes |
| [x] | 35.2 Platform: the keys on the app (private key encrypted with its own context), `upload_galaxy` started as pending only with "We publish for you" and the keys, the stage on Builds & downloads and a plain failure reason | Unit tests (keys never sent to builds that don't upload, can't be moved to another app) |
| [x] | 35.3 Dashboard: Publishing › More Android stores with the Samsung Galaxy Store section (content ID, service account ID, private key pasted or as a file, checked as an RSA key) and a short guide; "Publish it for me" can add Galaxy Store: two more checklist steps (the seller account, and inviting the team email as a manager for applications), a Galaxy Store track with its statuses and store link (`galaxystore.samsung.com`) in Admin › Publishing, status emails; the docs article "Publish on Samsung Galaxy Store" | Unit tests and the publishing browser test |
| [x] | 35.4 Pipeline: `build/scripts/galaxy_store.py` after the Android build (JWT with RS256 and the `publishing` scope, the app must be FOR_SALE, upload session, APK upload, contentUpdate, `/seller/v2/content/binary`, contentSubmit); a failed upload leaves the build ready with a message; no secret in the output | `python3 -m unittest discover build/tests` against a mock Galaxy Store, `shellcheck` |
| [ ] | 35.5 A real update through Seller Portal: the request formats Samsung's reference and guides disagree on (body or query for `/seller/v2/content/binary`, which contentUpdate fields it needs), whether the old binary must be removed, and the manager-invitation menu names | One build uploaded and submitted to a test app on sale (LAUNCH-CHECKLIST, section 8) |

## Phase 36: Huawei AppGallery and Huawei push

Huawei phones come without Google Play, so their owners use AppGallery and
Firebase push doesn't reach them. Clients can now publish on AppGallery (by
hand the first time, then every build uploaded on plans with "We publish for
you") and add Huawei Push Kit on every plan: the app then registers with Push
Kit on phones without Google Play services and the servers send those tokens
through Huawei. The app includes Huawei's SDK only in builds with the client's
agconnect-services.json; `flutter build apk` without it is unchanged (CI
builds both). The `huawei_push` Flutter plugin isn't used: it would put
Huawei's SDK and its image library into every build and make every build
depend on Huawei's Maven repository, and Flutter can't leave a plugin out per
build. A small Android module (`android/hms_push`) and channel do the same.

| | Step | Done when |
|---|---|---|
| [x] | 36.1 Contract first: `provider` (`fcm` or `hms`, default `fcm`) on `PUT /me/push-token` in `docs/api/openapi.yaml`; `huawei_appgallery` in `BuildSecrets`, the `upload_appgallery` stage, `huawei.agconnect_config_url` in the build config schema | `redocly lint` passes |
| [x] | 36.2 App: `huaweiAppId` in the build config (from agconnect-services.json, downloaded by `tool/apply_config.dart` like the Firebase files); `android/hms_push` and `android/app/src/huawei` built in only with that file; at start-up Push Kit on phones without Google Play that have Huawei Mobile Services, Firebase everywhere else; the token registered with its provider; tapped Huawei notifications open the same screens | `flutter analyze`, `flutter test` (provider choice, the channel, the registration payload), `build_preview.sh --check` |
| [x] | 36.3 Hosted API: the provider kept per device (`hosted_devices.push_provider`); `hms` tokens sent through Push Kit (server API v1, OAuth client credentials with the app ID and app secret, batches of 1,000, refused tokens forgotten), the others through FCM | Unit tests with a mocked Push Kit |
| [x] | 36.4 Plugin: `push_provider` on the devices table (database version 4), `provider` on `PUT /me/push-token`, Huawei Push Kit's app ID and app secret (encrypted) on the settings page, `Push\Hms_Sender` for `hms` tokens | `composer lint`, phpunit, the Tutor LMS integration suite (237 checks, Push Kit answered by a request filter) |
| [x] | 36.5 Dashboard: the Huawei AppGallery section (app ID, agconnect-services.json checked against the package name, the Push Kit app secret on every plan, the Connect API client ID and key with "We publish for you"); "Publish it for me" can add AppGallery (account and team-invitation steps, its track in Admin › Publishing); the docs article "Publish on Huawei AppGallery"; `build/scripts/appgallery.py` (token, `upload-url/for-obs`, the upload, `app-file-info`, `app-submit` tried again while Huawei parses the package) | Unit tests, the publishing browser test, build script tests against a mock AppGallery |
| [ ] | 36.6 A real AppGallery update and a push to a Huawei phone: the Android module and channel couldn't be compiled here (Huawei's Maven repository and the Android SDK aren't reachable), so CI's "debug APK with Huawei push" is the first build; Push Kit's notification data on tap and the v1 answers need a real phone | CI builds the Huawei APK; one update submitted and one push received (LAUNCH-CHECKLIST, section 8) |

## Phase 37: Kashier and Fawaterk payments

Yallapp is now based in Cairo, and its clients there pay with Egyptian
gateways. Kashier and Fawaterk join iyzico everywhere a card is taken:
clients' plan payments and shop sales through Yallapp (Yallapp's own
account, with the provider the team picks), and a client's own keys for a
shop without a website, a restaurant, events' tickets, a gym's memberships,
paid courses and donations. All three sit behind one interface
(`src/lib/payments/provider.ts`). A redirect or webhook is only a trigger:
every payment is read back from the provider with our own keys (paid, our
reference, the exact amount and currency) and marked paid once, as the
iyzico flows always did. Webhook signatures are checked too. Built and
tested with fake Kashier and Fawaterk servers, on the in-memory store and on
MariaDB 10.11. Kashier's requests and webhook signature follow its own WooCommerce
plugin; Fawaterk's webhook signature follows its documentation; the read-back
fields of both, and Fawaterk's invoice requests, come from third-party
integrations (listed below), so a test payment on each provider's test
account comes before going live (docs/LAUNCH-CHECKLIST.md). How it works is
in `docs/ARCHITECTURE.md` ("Card payment providers").

| | Step | Done when |
|---|---|---|
| [x] | 37.1 Contract first: the currencies of `DonationsConfig`, `CampaignSummary` and `Donation` take EGP, SAR and AED; nothing else the app or the plugin sees changes (the payment pages are web pages; `docs/api/platform.yaml` unchanged) | `redocly lint` passes, the public copy and the API reference regenerated |
| [x] | 37.2 One provider interface: start a checkout (amount, currency, our reference, customer, return and webhook addresses), confirm by reading the payment back, test the keys with a call that changes nothing; Kashier (payment sessions, `x-kashier-signature`) and Fawaterk (`createInvoiceLink`, `getInvoiceData`, `hashKey`) next to iyzico; amounts as decimal strings in major units; each provider's currencies (iyzico TRY, USD, EUR; Kashier EGP, USD, EUR; Fawaterk EGP, USD, SAR, AED, EUR) | Unit tests with mocked HTTP: request shape, headers, amounts, signatures, read-back, wrong amount, currency or reference refused |
| [x] | 37.3 Admin: Yallapp's Kashier account (merchant ID, Payment API key, secret key, test or live) and Fawaterk account (API key, staging or live), encrypted like iyzico's, each with **Test connection**; **Yallapp's payment provider** picks which account takes plan payments and marketplace sales; plans can be priced in EGP, SAR or AED and are payable by card only in a currency the provider takes | Unit tests and the egypt-payments browser test |
| [x] | 37.4 Client-owned keys: the Card payments box (products, menu, events, memberships, courses, campaigns) picks iyzico, Kashier or Fawaterk with the keys each needs, warns when the prices' currency isn't one the provider takes; the payment, donation and plan pages name the provider; payments started with one provider finish with it (`drizzle/0030_payment_providers.sql`: `payment_provider`, `provider_ref` on plan payments, orders and donations; existing rows are iyzico) | Unit tests, migrations applied on MariaDB 10.11, browser tests on both stores |
| [x] | 37.5 Callbacks: `/api/pay/kashier/<kind>/<token>` and `/api/pay/fawaterk/<kind>/<token>` (GET: the customer returns; POST: the signed webhook), sharing `settle.ts` with iyzico's callbacks; idempotent; a payment not yet confirmed stays pending and the page says so; before a new attempt the earlier one is read back | Unit tests of the routes (unsigned webhook refused, signed one only trusted after the read-back, repeats change nothing) and the browser test, where each fake posts its webhook and redirects |
| [x] | 37.6 Selling through Yallapp with Kashier or Fawaterk: the shop gives who gets paid and an IBAN (any country; kept encrypted); the whole payment goes to Yallapp's account with the commission recorded; releasing the payout records it and the admin's Payments page shows the payee for the team's transfer | Unit tests |
| [x] | 37.7 Docs and copy: the card payments article (now "Card payments with iyzico, Kashier or Fawaterk"), the donations and events articles, the public pages and solutions say "iyzico, Kashier or Fawaterk" where true; launch checklist lines for both accounts and a test payment each | Unit tests and the public browser test |
| [ ] | 37.8 Confirm against the providers' test accounts: Kashier's read-back fields (`status`, `amount`, `currency`, `merchantOrderId`, `transactionId`) and the session `_id` are taken from third-party integrations; Fawaterk's `createInvoiceLink` and `getInvoiceData` fields (`url`, `invoiceId`, `paid`, `total`, `currency`, `pay_load`), whether its webhooks sign with the API key, and its currencies beyond EGP are too. A field named differently leaves a payment pending (never paid wrongly) | A test payment on each provider's test account confirmed by the read-back |
| [x] | 37.9 Refunds from the dashboard: iyzico's flows never had them (refunds are made in each provider's panel); Kashier has a refund call, Fawaterk's isn't documented. Done in 47.1 to 47.5, tested against fake servers; a test refund on each provider's sandbox is 47.9 | A refund action tested against each provider's sandbox |
| [x] | 37.10 (Done in Phase 49; the providers' sandboxes still confirm the expiry, 49.6.) Ticket holds and long-lived pages: places are held for the payment link's hour plus iyzico's 30-minute page; Kashier's session and Fawaterk's invoice may stay payable longer (an expiry field isn't confirmed for either) | The session and invoice expire within the hold, confirmed on each provider |
| [ ] | 37.11 Kashier's connected accounts (marketplace payouts by Kashier itself, like iyzico's sub-merchants) | Kashier's marketplace API confirmed and tested |

## Phase 38: Every app type tried like a demanding user

The owner asked for every option in every app to be opened, the way a
demanding customer would, with screenshots. All ten demo apps (academy,
store, restaurant, bookings, clinic, gym, real estate, news, events,
charity) were used in the app preview on the hosted API, and WordPress
sites with Tutor LMS, WooCommerce and posts: every tab and list, search
with nonsense and Arabic, filters, details, wishlist and saved, cart and
options, quantity limits, checkout, booking and cancelling, the intake
form, tickets, donations (presets, own amount, the minimum), enrolling,
lessons, the quiz, sign-in with the review and demo numbers and a wrong
code, sign-out, deleting the account, settings, Arabic (right to left),
Turkish, dark mode, a small phone (360 by 640) and a tablet (1024), and one
ready-made design per type started from Pages & look and opened in the
preview. About 530 screenshots; what was found is below. No migration.

| | Step | Done when |
|---|---|---|
| [x] | 38.1 Right to left: every Back, Next, Previous and Send arrow pointed the wrong way (the Material Symbols arrows mirror themselves, and the app mirrored them again) | `phase38_test.dart`: each arrow mirrored once |
| [x] | 38.2 Right to left: English content in an Arabic app (lessons, page texts, descriptions) is laid out in its own direction, so its full stops stay at the end; an Arabic text in an English app reads right to left | `phase38_test.dart` (a text block in an Arabic app) |
| [x] | 38.3 The hosted API wrote list cards in English whatever the app's language ("Free", "60 min", "₺120 of ₺250", "For rent", "Negotiable", "/ month", "Sold out", "3 left", "Online", "From", event dates): now in Arabic and Turkish too, with amounts kept left to right in Arabic, and a service's hour as "1 h" like its own screen (`lib/hosted/pages/item-words.ts`); `Item` in the contract says so | `phase38.test.ts`: every demo app's cards in Arabic and Turkish, `pages.test.ts`; `redocly lint`, the API reference regenerated |
| [x] | 38.4 Bold template: the active tab's pill gets twice the room when the tabs are narrow (five tabs, "Membership", "My donations"), its label no longer touches the pill's edges, and the cart's count no longer covers the label | `phase38_test.dart` (five and four tabs on a 360 point phone) |
| [x] | 38.5 Quick links: a tile to a screen the app doesn't have with its site's features (a Wishlist tile in an academy without a wishlist, from a design) is left out instead of doing nothing; a long label ("Membership", "Appointments") is made smaller instead of being broken inside the word | `phase38_test.dart` |
| [x] | 38.6 A list row's small picture showed its badge as an empty white label: the badge now sits under the row's text ("For rent", "67%") | `phase38_test.dart` |
| [x] | 38.7 What people type in a field was the grey of its hint (the edit profile name, the prefilled message to an office, a ticket's name) | `phase38_test.dart` |
| [x] | 38.8 An icon button alone on a picture (the course page's Back) took the whole picture for screen readers | `phase38_test.dart` (its semantics node is the button's size) |
| [x] | 38.9 No device limit (0, as in the demo apps) showed "1 of 0" and "You can use 0 devices": now "1 device" and "as many devices as you like" | `phase38_test.dart` |
| [x] | 38.10 The video watermark's number read "…532 90+" in Arabic: kept left to right | `app_logic_test.dart` |
| [x] | 38.11 "My Courses" next to the "My courses" tab: sentence case in the app and in the plugin's default tabs | `pages_test.dart`, the Tutor LMS integration suite |
| [x] | 38.12 The store review account was refused at the device limit: reviewers on several phones, and the owner opening the preview in another browser or by its QR code (the preview signs in only that number), were locked out. Its oldest device is now signed out instead, on the hosted API and in the plugin | `hosted.test.ts`; the Tutor LMS integration suite (263 checks: a third review device gets in, its oldest is signed out) |
| [x] | 38.13 The preview never started in a browser whose language tag isn't one ("en-US@posix" from some systems): the page keeps the valid tags, or English | `preview.spec.ts` on the memory store and MariaDB |
| [x] | 38.14 Dashboard: "Use this design" overflowed its button in four narrow columns | `designs.spec.ts` on the memory store and MariaDB |
| [x] | 38.15 A café's first pages: "Search the menu" (not "Search products") and a menu icon on the Menu tab; the demo's "Saturday Film Club" fell on a Sunday (renamed "Film Club") | `phase38.test.ts` |
| [x] | 38.16 The preview bundle rebuilt | `build_preview.sh --check` |
| [x] | 38.17 Tab names, page titles and design sample texts that Yallapp writes are English only: an app offering Arabic or Turkish shows "Home", "Courses" and "Account" until the owner translates them. Shipping Yallapp's own translations of its default names is a product decision | Done in Phase 43 (43.2) |
| [x] | 38.18 A course with every lesson done still says "Continue learning" and opens the first lesson; no "completed" state or certificate prompt on hosted academies | Done in Phase 45 (45.6); "Start the course again" in Phase 73 (73.2 to 73.4) |

| [ ] | 38.17 Tab names, page titles and design sample texts that Yallapp writes are English only: an app offering Arabic or Turkish shows "Home", "Courses" and "Account" until the owner translates them. Shipping Yallapp's own translations of its default names is a product decision | Owner's decision |
| [x] | 38.18 A course with every lesson done still says "Continue learning" and opens the first lesson; no "completed" state or certificate prompt on hosted academies | Done in Phase 45 (45.6, 45.7); certificates for hosted academies are 45.13 |
| [ ] | 38.19 Demo previews: the sign-in note says "your app's store review number" (the dashboard next to it gives the demo number), and a gym's classes can't be booked without a membership, which the preview can't buy, so class booking can't be tried in the demo | Owner's decision (a demo membership, a demo note) |
| [x] | 38.20 The events list's `price_label` and server error messages are English in Arabic and Turkish apps (the content API doesn't receive the language); a WordPress site's labels follow the site's language | Done in Phase 43 (43.3) |
| [x] | 38.21 Done: a design applied to a hosted academy leaves out the Wishlist tab and tile (`missingScreens`); Orders stays, since 96.3 lists its course orders. Was: Designs offer Wishlist and Orders tiles to hosted academies, which have neither (the app now leaves them out); the designs could leave them out too | With the next design update |
| [ ] | 38.22 Share does nothing in a desktop browser without the Web Share API (the preview only); the largest donation isn't in `DonationsConfig`, so a too large amount is refused only after Donate; a course's illustration is cropped large on a tablet's hero | Owner's review |
| [x] | 38.23 Done: the app preview of an app made with "Start from your website" (or with the sign-up's website) showed "We couldn't connect": it read that website before the Website step chose it, and a WordPress site before its Yallapp plugin was connected. It now waits for both and says which (`preview.waiting_for`: choose the source, install the plugin and activate the license, or our team's setup) | Unit and Flutter tests |

## Phase 39: Paid and enrolled courses open in the app; plugin 0.4.0 updates cleanly

The owner runs plugin 0.3.8 with Tutor LMS 4.1.1 and WooCommerce 11.2.0 and is
updating to 0.4.0. Proved on local WordPress 7.1.3 sites, through the plugin's
API as the app calls it and in the app preview: an update from 0.3.8 with
WordPress's own updater keeps every setting, sign-in, device and enrollment,
and every way a student gets a course opens it in the app while every other
way is refused by the API itself. Found and fixed four plugin bugs and one app
bug. No database migration.

| | Step | Done when |
|---|---|---|
| [x] | 39.1 Update from 0.3.8: settings saved on the settings page, a license, two students signed in (phone code, password) with a push token and progress; then WordPress's upgrader (`Plugin_Upgrader`, as Dashboard › Updates: files replaced, still active, no activation hook). Tables upgraded (`push_provider`), settings and license kept, old access and refresh tokens and devices still work, every route answers, the settings page opens, nothing in the PHP log | `upgrade-test.php` (30 checks; `UPGRADE_FROM=34d734f run.sh`, new CI job) |
| [x] | 39.2 Tutor LMS with WooCommerce (`WOO=1`, `seed-tutor-woo.php`): free course enrolled in the app and on the website; paid course bought on the website's checkout from the app's link, by bank transfer (on hold: no access), completed (My courses, every lesson, the PDF, the quiz, the assignment open), refunded and cancelled (no access, can buy again), cash on delivery (processing: no access); the admin's enrollment and removal; Tutor's own checkout (unpaid, paid, refunded); the preview lesson; a guest: price, Android checkout, iOS no button, every item locked and refused (401) | `access-test.php` (71 checks; new CI job) |
| [x] | 39.3 Fixed: a WooCommerce sale price read "$300.00 Original price was: $300.00.$250.00Current price is: $250.00." in the app; now "$250.00" (`Money::current`, every LMS) | `MoneyTest`, `access-test.php` |
| [x] | 39.4 Fixed: "Continue" stopped for good at an assignment (it opens on the website and never completes from the app): the plugin's `next_item` and the app's course page skip assignments and live classes (`Next_Item`, `nextItemToOpen`); the preview bundle rebuilt | `NextItemTest`, `continue_learning_test.dart`, `access-test.php`, the preview |
| [x] | 39.5 Fixed: Tutor LMS's My courses listed a course Tutor's enrollment check refuses (Tutor LMS Pro's expiry): now filtered through it | `access-test.php` (an expired enrollment) |
| [x] | 39.6 LearnPress fixed: a course bought with "Auto start" off ("purchased") offered to be bought again; it is now in My courses and opens, starting the way "Start now" does. A course past its time limit with "Block content when duration expires", or finished with "Block when finished", stayed open; it is closed as on the website. Checked: pending, completed, refunded orders, the admin's Assign/Unassign tool and a manual order | `adapter-test.php` on LearnPress (119 checks) |
| [x] | 39.7 The other adapters with the shared changes: LifterLMS 108, MasterStudy 115, Sensei 102, Masteriyo 116 checks; Tutor LMS 263 | Their integration suites |
| [ ] | 39.8 Tutor LMS Pro's prerequisites and content drip, and its enrollment expiry itself, can't be tried without Tutor LMS Pro (the plugin follows Tutor's enrollment check, so expiry should follow); LearnPress's WooCommerce add-on and LearnDash weren't available to test | With a Pro copy |
| [ ] | 39.9 PHP 7.4 itself isn't installed here: covered by `php -l`, PHPCompatibility (`testVersion 7.4-`) and the CI's unit tests on PHP 7.4 | CI |

## Phase 40: Lesson videos without the video site's branding

The owner asked that a lesson video never show where it is hosted: no
YouTube or Vimeo logo, no title bar with the channel, no "Watch on YouTube",
"More videos", related videos or end screens, no share or "Watch later"
buttons, and no tap that opens the site, its app or a browser. The student
sees only the app's player. YouTube, Vimeo and Bunny Stream videos now play
behind the app's own controls, the same controls as uploaded files, wherever
they appear (the lesson video, videos in lesson text, page video and embed
blocks). The sites can't be reached from the build machine, so the player
page was checked in Chromium against stand-in players that implement the
same JavaScript APIs and draw a title bar, "Watch on YouTube", a logo and
"More videos" along their edges. No contract change, no migration.

| | Step | Done when |
|---|---|---|
| [x] | 40.1 YouTube through the IFrame Player API with `controls=0`, `rel=0`, `iv_load_policy=3`, `disablekb=1`, `fs=0`, `playsinline=1`, `modestbranding=1`, `cc_load_policy=0` and the page's own `origin`; Vimeo through player.js with `title`, `byline`, `portrait`, `badge`, `controls`, `transparent`, `pip`, `autopause` and `keyboard` off and `dnt=1` (an unlisted video keeps its `h`); Bunny Stream through the Player.js protocol, its signed link kept (`video/hosted_video.dart`, `video/brandless_player_html.dart`) | `brandless_video_test.dart` (every link shape, the parameters) |
| [x] | 40.2 What the sites still draw stays hidden: the player frame is three times as tall as the visible box (the site keeps the picture in the middle and draws its title, logo, "More videos" and buttons along the frame's edges, outside the box) and as wide as the picture (4:3 and Shorts show whole); a transparent layer takes every touch; the poster covers the player before it starts and after it ends (end screens), with our play and replay buttons; a paused frame stays visible | `tool/check_player_pages.sh`: every point of the video hits our layer, taps and `window.open` open nothing, the cover before the start and at the end, for YouTube, Vimeo and Bunny |
| [x] | 40.3 The app's own controls for these videos and for uploaded files alike (`video/player_controls.dart`): play and pause, 10 seconds back and forward, a seek bar with the loaded part, the time, speed from 0.5x to 2x (the speeds the player allows; 0.5x added to the settings too), captions on and off when the video has tracks, quality when the player offers several (Vimeo), and full screen in the app, turned to landscape (portrait videos stay upright), carrying on at the same second | `lesson_video_test.dart`, `brandless_video_test.dart` (the controller from loading to the end, speeds, captions, quality, errors) |
| [x] | 40.4 Nothing opens the site: in every video web view (also Wistia, Dailymotion, Loom and other embed code, and the full-screen embed view) the page can't be replaced, so links, `window.open` and `target="_blank"` go nowhere, frames can't load the sites' own pages (watch pages, channels, sign-in, short links) and no app links (`intent:`, `vnd.youtube:`) load; touches never reach the web view under our controls; the host name no longer shows under a video in lesson text | `brandless_video_test.dart` (the navigation rules), `lesson_video_test.dart`, `lesson_embed_test.dart` |
| [x] | 40.5 The watermark, watch tracking (distinct seconds played, as for files), resume, saving the place on pause, every 15 seconds and on leaving, mark complete and the next lesson at the end, and the screen-capture cover (the video pauses under it and keeps its place) work with these videos; the page reports state, time, duration and loaded share over the `YallappPlayer` channel | `lesson_video_test.dart` |
| [x] | 40.6 Wistia, Dailymotion and Loom keep their own player with the branding options they offer turned off (Wistia: no copy-link menu; Dailymotion: no logo, start-screen info, sharing, queue or end screen; Loom: no owner, title, sharing or top bar); navigation blocked as in 40.4 | `brandless_video_test.dart`, `lesson_video_test.dart` |
| [x] | 40.7 The app preview shows the same player in a sandboxed frame (no popups, no top-level navigation; touches go to the app's controls); the preview bundle rebuilt | `courses-hosted.spec.ts`: a hosted academy's YouTube lesson in the preview, the parameters, our layer everywhere, a real click on our Play reaching the player, no popup; `build_preview.sh --check` |
| [ ] | 40.8 Known risk for the owner: YouTube's API terms ask apps not to hide, cover or change YouTube's branding or player, which this player does on purpose; YouTube could object or block the app's embeds. Videos on Vimeo (a paid plan, which also hides its controls and logo itself), Bunny Stream or uploaded to the site carry no such risk | Owner's decision |
| [ ] | 40.9 Partial: Wistia, Dailymotion and Loom still show their own controls, and whatever branding their plan and parameters don't remove (their logo on free plans); Vimeo on a free plan ignores `controls=0` and refuses speeds (the speed button then goes), its controls being hidden only by the tall frame; YouTube's `setPlaybackQuality` no longer does anything, so YouTube has no quality button | A JavaScript API from those sites, or videos moved to YouTube, Vimeo, Bunny Stream or the site |
| [ ] | 40.10 To check on phones with real videos: that YouTube and Vimeo draw captions inside the picture (not along the frame's bottom edge, outside the box) and that nothing of theirs shows on Android and iOS web views; full screen loads a second player at the same second (about a second of loading) instead of moving the playing one | A device test with the owner's videos |

## Phase 41: Five app stores everywhere, a Works with strip, and a design pass

Since Phases 35 and 36 Yallapp publishes to Samsung Galaxy Store and Huawei
AppGallery too, and Phase 42 adds Xiaomi GetApps on the same terms, but much
of the website still said two stores. Every public page, the plans, the
documentation, the legal pages' service description, the share texts and the
dashboard's publishing texts now name the five stores and which plans include
which: every plan builds the Android app for Google Play, Galaxy Store,
AppGallery and GetApps, the App Store comes with the iOS app (Growth and up),
and "We publish for you" (Pro and Business) uploads every build to each of
them. The numbers strip ("10 app types … 2 app stores …") is gone; in its
place a "Works with" strip of the real brands Yallapp works with. The public
site got a design pass and a dark mode. No migration.

| | Step | Done when |
|---|---|---|
| [x] | 41.1 The stores in one place: `lib/stores.ts` (ids, names, guides, `storesFor`; no marks, client code imports the plans) and `planStores` / `planStoresLine` in `lib/plans.ts`, following each plan's features as the team sets them; a row per store in the pricing table | `phase41.test.ts` |
| [x] | 41.2 Wording: home, features, how it works, pricing (with an "App stores" note: Samsung, Huawei and Xiaomi accounts are free), FAQ (a new "Which app stores can my app be on?", the group "Publishing on the app stores"), integrations ("Accounts you bring" adds Galaxy Store, AppGallery and GetApps), the getting-started, developer-accounts and plans articles, the privacy and terms pages' service description, meta descriptions, Open Graph texts and JSON-LD (`DEFAULT_DESCRIPTION`), the plan highlights and feature descriptions the admin's plan editor shows, the dashboard's Publishing, setup step and Builds & downloads texts and the footer's guides | `phase41.test.ts` (no "2 app stores", "both stores" or "Google Play & App Store" left), `website-seo.test.ts` |
| [x] | 41.3 The Works with strip on the home and features pages (`components/brand-marks.tsx`, `lib/brands.ts`): the five stores, Firebase, WhatsApp (sign-in codes go out through the WhatsApp Cloud API or waabek.com), iyzico, Kashier and Fawaterk in one row, the website platforms of the Integrations page in another (Bookly, only detected, is left out). Marks from `simple-icons` 16.34.0 (CC0, pinned, only the icons used are imported: the server chunk is 28 kB); brands it lacks are their name in the site's font. Grey until hovered, then in the brand's color (a color that would vanish is replaced), two rows scrolling in opposite directions, paused under the pointer, still and wrapped with `prefers-reduced-motion`; each logo an image named after its brand, the loop's copy hidden from assistive technology; fixed sizes, no layout shift. Heading "Works with", never "partners", with the trademark note | `phase41.test.ts`, `public.spec.ts` (names, no "partner", Xiaomi present, pausing, reduced motion, 390 px) |
| [x] | 41.4 Store marks on every plan card (home and pricing) with "4 app stores · You publish with our guides" or "5 app stores · We publish for you", in the hero, the last step of How it works, the footer, the pricing table's store rows and the integration cards; `docs/BRAND.md` allows third-party marks only there, unaltered | `phase41.test.ts`, `public.spec.ts` (each card's marks by name) |
| [x] | 41.5 Design pass: a larger hero headline with balanced lines, an arrow on the second button and the phones on a stage; more room between sections and larger section titles; one icon tile size on every card (`FeatureIcon`); hover states on cards; plan cards with the recommended plan raised and starred, round check marks and a filled button on hover; the pricing table's recommended column tinted; the FAQ's questions as cards with a round toggle; the closing band and footer polished | Screenshots at 1440 and 390 px, light and dark (home, pricing, integrations, features, how it works, FAQ, a solution, an article) |
| [x] | 41.6 Dark mode on the public website, following the visitor's setting: the brand tokens swap on every page with the site header (`html:has([data-site-theme])`), dark bands keep their colors, the logo turns Ivory, form fields follow; the dashboard, the admin and the sign-in pages stay light | `public.spec.ts` (dark pricing page, light sign-in), `phase41.test.ts` |
| [x] | 41.7 Xiaomi GetApps' guide and upload keys came with Phase 42: the guide is linked from the footer, Builds & downloads, the store facts and the Integrations page | Merged with Phase 42 |
| [ ] | 41.8 The owner's texts edited in the admin (Website content) keep their wording: edits saved before this phase that mention two stores need a look in the admin | Owner's review |
| [x] | 41.9 A light and dark switch on the website (it follows the visitor's setting only), and dark mode for the dashboard | Done in Phase 73 (73.8) |

## Phase 42: Xiaomi GetApps publishing

Android apps on Xiaomi GetApps too, the app store on Xiaomi, Redmi and POCO
phones, under the client's own developer account, the way Phases 35 and 36
added Galaxy Store and AppGallery. The client (or our team, through "Publish
it for me") submits the first version by hand; after that, on plans with "We
publish for you", every build's APK is checked against the store and uploaded
through the automatic publishing API of the Xiaomi developer platform, which
submits it for review. Xiaomi gets the APK, signed with the app's upload key:
its API has an `apk` field (and `secondApk`), none for an App Bundle.
Xiaomi's documentation (dev.mi.com, in Chinese) couldn't be fetched from
here, so the requests follow three independent open-source clients of the
same API (one of them tested against a real account) and the parts of
Xiaomi's guide that search results quote; built and tested against a local
mock. Nothing has been sent to Xiaomi yet. Migration
`drizzle/0034_xiaomi_getapps.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 42.1 Contract first: `xiaomi_getapps` in `BuildSecrets` (account email, API private key, Xiaomi's public certificate, what's new; only for builds whose plan uploads) and the `upload_xiaomi` stage in `docs/api/pipeline.yaml` | `redocly lint` passes |
| [x] | 42.2 Platform: the keys on the app (`apps.xiaomi_*`: the private key encrypted with its own context, the certificate as PEM, what's new or the default "Improvements and fixes."), `upload_xiaomi` started as pending only with "We publish for you" and the keys, the stage on Builds & downloads and a plain failure reason; the Xiaomi track of "Publish it for me" kept with the other extra stores (no migration for it) | Unit tests (keys never sent to builds that don't upload, can't be moved to another app or column), migration generated and `drizzle-kit generate` clean |
| [x] | 42.3 Dashboard: Publishing › More Android stores has the Xiaomi GetApps section (its setup steps, email, API private key, the certificate file checked as an unexpired X.509 RSA certificate in PEM or DER, what's new); "Publish it for me" can add Xiaomi GetApps (two more checklist steps, its track and statuses in Admin › Publishing, store links on `global.app.mi.com` or `app.mi.com`, status emails); each store's link placeholder in the admin; the docs article "Publish on Xiaomi GetApps" | Unit tests and the publishing browser test |
| [x] | 42.4 Pipeline: `build/scripts/xiaomi_getapps.py` after the Android build: `/dev/query` (the app on the store under this account, `updateVersion`, an older version code; asked again while Xiaomi answers -20035), then one multipart `/dev/push` with RequestData (`userName`, `synchroType` 1, `appInfo` as a JSON string: the name already on the store, the package, `updateDesc`, `privacyUrl` when https), the APK and the 512 px icon from the store assets; SIG as the MD5s of RequestData and each file with the API private key, encrypted with the certificate (openssl, PKCS#1 v1.5, blocks of the key size less 11 bytes) as hex; a push is never repeated (a lost answer says to check the console); plain messages for Xiaomi's known result codes, no secret in the output | `python3 -m unittest discover build/tests` against a mock that decrypts the SIG with a test certificate's key, `bash -n` |
| [x] | 42.5 Docs: `build/README.md`, `docs/ARCHITECTURE.md`, `docs/LAUNCH-CHECKLIST.md` (7f, section 8) | |
| [ ] | 42.6 Uploads in the publishing history: as for Galaxy Store and AppGallery, a build's upload outcome is its `upload_xiaomi` stage and message (Builds & downloads, the build email); the pipeline writes no publishing event, and the team moves the Xiaomi track in Admin › Publishing | When the team wants uploads in the history |
| [ ] | 42.7 Confirm with a real Xiaomi account (none of this is in an English document): the base address and both endpoints; multipart for `/dev/query` too (one client sends it form-encoded); SIG's JSON (`sig` list of `name`/`hash`, `password`), the block size from the certificate (Xiaomi's is 1024-bit: 117 bytes) and lower-case hex; `appInfo` as a JSON string (Xiaomi's guide as quoted; one client sends an object); `/dev/query`'s `packageInfo` (`packageName`, `appName`, `versionCode`) and `updateVersion` (only one client reads it; an absent value doesn't stop the upload); the result codes -7, -92, -20002, -20014, -20030, -20035; that the icon is required with every update and replaces the store's, that `privacyUrl` may be left out and `suitableType` isn't needed; the 500-character limit of `updateDesc`; whether an update without `testAccount` keeps the reviewer sign-in given in the console (the structured format one client describes since February 2026 isn't sent); and where the API private key and certificate are in the console | One build checked, uploaded and in review on a test app (LAUNCH-CHECKLIST, section 8) |
| [ ] | 42.8 Xiaomi's international developer site (global.developer.mi.com): whether apps there have the automatic publishing API; the guide says uploads stay by hand without that page. Also how a client adds our team email as a member on the developer platform (the step doesn't name menus) | Checked on both sites with a real account |
| [ ] | 42.9 More of the listing through the API: screenshots and the descriptions (`desc`, `brief`) are only required for a new app; whether an update takes them isn't confirmed, so they're managed in the console | After 42.7 |

## Phase 43: The owner's languages

The owner decided (38.17): Yallapp translates the tab names and other texts
it writes automatically, and the translation system grows: an app can
offer any language, not only the ones Yallapp ships, and the owner
translates it. Apps ship English, Arabic and Turkish (the ARB files);
Yallapp now also has Arabic and Turkish for every text it writes into
pages and for the hosted API's messages, applied where the owner wrote
none. Any language the app's system widgets come in (82, with their own
names; right to left for Arabic, Persian, Hebrew, Urdu, Pashto and Uyghur)
can be added, ordered and made the default; a Languages page lists every
text the app shows per language, and the app lays the owner's string packs
over its own strings without a new build. No machine translation. How it
works is in `docs/ARCHITECTURE.md` (Pages, looks and languages). No
migration: the owner's interface strings are kept in the layout (`strings`),
draft and published like the pages.

| | Step | Done when |
|---|---|---|
| [x] | 43.1 Contract first: `Languages.list` (`AppLanguage`: names, direction, string pack), `LanguageCode` for every language the app can show, `GET /strings/{language}` (`StringPack`), error messages and the events' `price_label` in the asked language; the plugin's layout passes `list` on (platform contract) | `redocly lint` passes; the copy on /developers and the API reference updated |
| [x] | 43.2 Yallapp's own texts in Arabic and Turkish (38.17): the default tabs, page titles and home blocks of every kind of app, the 31 designs' sample texts and what a new block starts with (`lib/i18n/builtin`, the app's name as `{app}`), filled into served layouts (hosted API, the plugin's layout, the preview's draft) and the Pages & look phone preview where the owner wrote none, and as the main text of an Arabic- or Turkish-first app; a text the owner changed is theirs | `translations.test.ts`: every Yallapp-written text has both (fails when a new one hasn't), owner texts win, every design; `pages.test.ts`, `blocks.test.ts` |
| [x] | 43.3 The hosted API answers its messages in the app's language (every literal message of the hosted API's code, checked by a test that scans it) and the events list's price label (38.20) | `translations.test.ts`, `events-hosted.test.ts` |
| [x] | 43.4 Any language: the 82 languages of Flutter's Material and Cupertino localizations (platform, app and plugin keep the same list), added from a list with their own names, the default, the order and removing one, in Pages & look › Languages and on the new Languages page; plans count every language as before | `translations.test.ts` (the three lists equal, the plan limit in the owner's order) |
| [x] | 43.5 The Languages page: per language, every text the app shows, the owner's pages and tabs (from the default language) and the app's own texts (every ARB key, from English), with Yallapp's translation as the starting point in Arabic and Turkish, progress ("x of y translated"), Missing / All / Written by you, search, placeholders as chips and checked (unknown placeholders and broken plurals refused, missing ones warned), Copy English, CSV, JSON and XLIFF export and import, and Preview in the language | `translations.spec.ts` on the memory store and MariaDB: French added, a tab name and an app text translated, a wrong placeholder refused, export and import, the preview in French reads the draft's pack and pages, Arabic tab names automatic; `pages.spec.ts` |
| [x] | 43.6 String packs: the owner's interface strings per language in the layout (checked against `lib/i18n/app-strings.json`, a copy of the ARB files a test keeps current), served at `/api/app/{app_id}/strings/{language}` (ETag; the draft's for the preview link) | `translations.test.ts` (validation, fallback chain, packs, import and export round trip) |
| [x] | 43.7 App: any language in `MaterialApp.supportedLocales` with the system widgets' translations, string packs downloaded when their version changes, kept for offline use and laid over the app's own strings (`OverlayLocalizations` from `tool/gen_l10n_overlay.dart`: the owner's string, else the app's in that language, else English; a broken string or unknown placeholder ignored), the direction from the config (Uyghur right to left though Flutter writes it left to right), the picker in each language's own name, the last languages kept so an added language opens at once; the preview reads the draft's packs; the preview bundle rebuilt | `flutter analyze`, `flutter test` (`string_packs_test.dart`, `phase43_test.dart`, `languages_test.dart`), `build_preview.sh --check` |
| [x] | 43.8 Plugin: the language list passed on in `Config.languages` (any language, the owner's order, https packs only); its default pages carry Yallapp's Arabic and Turkish (`Builtin_Texts`) | `TranslatorTest`, `composer lint` |
| [x] | 43.9 Owner guide "Languages and translations" | Owner's review |
| [ ] | 43.10 "We're closed now. We open …" from a restaurant's checkout stays English: its opening time is written in English words; regional variants (Brazilian Portuguese, Traditional Chinese) and languages Flutter's widgets don't have (Kurdish, Sindhi, Yiddish, Dhivehi) can't be added yet | A language's own date words; Flutter's support |
| [ ] | 43.11 Demo apps' sample content (course and product names) and texts from the client's website or platform stay as written there; a WordPress site's own texts translated with the site's language files aren't matched to Yallapp's | Owner's review |
| [ ] | 43.12 The plugin's Tutor LMS integration suite wasn't run for this phase (the default pages only gained `translations`, which the app never sees) | Next plugin release |

## Phase 44: Analytics for app owners

Owners had no numbers. Every app now counts how it is used and sends it to
Yallapp, whatever its backend (WordPress, hosted, a connected platform or
its own API), and the owner reads it on Dashboard › Analytics: installs
(first opens), daily, weekly and monthly active users, sessions, day 1, 7
and 30 retention, platforms, system and app versions, countries, languages,
top screens and items (in the app type's words), the conversions funnel,
each notification's open rate, top searches, a CSV export and the period
before to compare with. First-party only: no analytics SDK, no advertising
ID, no fingerprinting, a random install ID that isn't the account, no IP
kept, search texts never stored with an install, totals only in every
report. Store downloads aren't available to us, and the dashboard says
installs are counted when the app is first opened. Migration
`drizzle/0035_analytics.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 44.1 Contract first: `POST /api/v1/apps/{app_id}/events` in `docs/api/platform.yaml` (tag Analytics, `AnalyticsBatch`, `AnalyticsEvent`: `app_open` with `first_open`, `screen_view`, `item_view`, `add_to_cart`, `purchase_click`, `enroll`, `book`, `donate`, `ticket`, `search`, `push_open`, `share`; 202 with `accepted` and `dropped`, 400, 403 `invalid_key`, 404, 413, 429); `analytics` (`events_url`, `key`) in `docs/build-config.schema.json`. Not under `/api/app/{id}`: the hosted API's `/events` is the Events app's list. The key is a keyed hash of the app's ID, the same in every build and stored nowhere, documented as not a secret; limits of 60 requests a minute per IP, 30 per 10 minutes per install, 3000 a minute per app, 100 events and 64 KB | `redocly lint`; `analytics.test.ts` checks batches and answers against the contract |
| [x] | 44.2 Platform: `lib/analytics` (validation, the key, the country from Netlify's or our proxy's header, never the IP), `analytics_events` (raw, 40 days: long enough for monthly users and 30-day returns with events up to a week late) and `analytics_daily` (totals until the app is deleted; both cascade with the app); search texts counted per day at once, without the install, never when they look like a phone number or an email address; pushes per dashboard notification counted when `announce` sends them; days counted at read and by the daily job (late events mark their day to count again), raw events purged after 40 days; memory and MySQL stores | `analytics.test.ts` (validation, key, country, limits, daily totals, weekly and monthly users, retention, late events, purge, report, CSV), `analytics-mysql.test.ts` on MariaDB, migration generated and `drizzle-kit generate` clean |
| [x] | 44.3 Dashboard › Analytics (new item under Preview your app): 7, 30 or 90 days or a custom range (UTC days), every number against the period before; KPI tiles with the change in words and an arrow; daily active users against the previous period and installs a day as SVG charts (one axis, thin marks, crosshair or per-column tooltip, the same on keyboard focus, a table view; colors checked with the data-viz palette validator); retention tiles; bar lists for platforms, systems, versions, countries, languages and screens; top items named per app type; conversions (view, then add to cart / enroll / book / tickets / give, then checkout, with the checkout value) for apps that sell; notifications with phones pushed, opens and open rate, and website notifications by kind; searches made at least twice; Export CSV (formula-safe cells); an empty state that says when numbers appear. Admin › a client's page shows each app's last 30 days | `analytics.spec.ts` on the memory store and on MariaDB: events sent through the API, the numbers on the page, the custom range, the CSV, the admin summary and the daily job |
| [x] | 44.4 App: `AnalyticsService` (queue in memory and in preferences, at most 500, dropped after 7 days; sent every 30 seconds and on going to the background, 100 a request; retries from 30 seconds doubling to 30 minutes; 400 and 413 drop the batch, 403 and 404 stop until the next start); `app_open` at start and after 30 minutes in the background, `first_open` once per install; screens by kind from the router (never IDs); item views, enrolments, bookings, tickets, donations, checkouts and searches from the content API's answers (`AnalyticsInterceptor`, every app type and backend), add to cart, shares and push opens; Settings › Privacy › "Share usage statistics" (on, with a short note; off stops sending and deletes the queue and the install ID); the preview and builds without `analytics` never send; `tool/apply_config.dart` writes `analyticsUrl` and `analyticsKey`; the OS version from the device. Preview bundle rebuilt | `analytics_test.dart` (queue, batches, retries, 7 days, sessions, toggle, preview, kinds, API events, build config), `widget/analytics_test.dart` (first open and screens, the switch, the preview), `flutter analyze`, `flutter test`, `build_preview.sh --check` |
| [x] | 44.5 Privacy: the privacy policy (section 3 "Usage statistics (every app)", section 7 how long), the guides' new "Analytics" article (what is sent, how it is counted, how to turn it off, how long it's kept), Google Play's Data safety answers (App activity: App interactions, In-app search history, Other actions; Device or other IDs; collected, not shared, optional, Analytics) and Apple's App Privacy answers (Usage Data: Product Interaction, Search History; Identifiers: Device ID; Analytics, not linked to the user, not used for tracking) in the publishing articles; `docs/ARCHITECTURE.md` | `vitest run` (the docs and legal pages are rendered and checked like every article) |
| [ ] | 44.6 Per-plan history: the plans have no notion of how long data is kept, so every plan keeps daily totals until the app is deleted and raw events 40 days | Owner's decision |
| [x] | 44.7 The owner's time zone: days are UTC on the page and in the CSV. Done in 47.7 | When owners ask |
| [ ] | 44.8 The WordPress plugin's push notifications carry no `notification_id`, so their opens are counted by kind ("New lessons", "Announcements") without an open rate | A plugin release that adds the ID and the devices pushed |
| [ ] | 44.9 Apps built before this phase send nothing: numbers start with each app's next build | Each app's next build |
| [ ] | 44.10 Check on Netlify that `x-nf-geo` or `x-country` reaches the function, and on our reverse proxy that it sends `X-Yallapp-Client-Country`; until then the country can read "Unknown" | Checked on the live site |

## Phase 45: Lessons offline, and a finished course says so

Students of an academy app can save a lesson or a whole course on the phone
and watch and read it without the internet: the uploaded video, the lesson
text and its images, and the attachments. The files are encrypted in the
app's own storage, never in the gallery or the Files app, play behind the
app's own player with its watermark, and are deleted when the student's
access ends, when the owner turns downloads off, or after 30 days without a
check. Lessons whose video plays from YouTube, Vimeo, Bunny Stream or another
player keep the button, which says they need the internet. Downloads come
with offline mode in the plan (`offline_downloads`, Growth and up, the flag
Phase 41 lists as "Offline mode") and the owner's choice. And a finished
course now says "Completed" with its date, its button reviews the
curriculum, and the certificate is offered where the LMS has one. No
migration (the owner's choice is in `apps.hosted_settings`).

| | Step | Done when |
|---|---|---|
| [x] | 45.1 Contract first: `Config.features.downloads`; `Lesson.offline` (`available`, `reason`: `video_site`, `web_page`, `disabled`; `size_bytes`); `POST /lessons/{lesson_id}/download` (`LessonDownload`: the files, each with a short-lived link, `source_url`, size and type; `expires_at`; `keep_days`) and 409 `not_downloadable`; `POST /me/downloads/check` (`DownloadCheck`: `allowed`, `refused`, `downloads`, `keep_days`); `CourseDetail.progress` and `certificate_url`; `Progress.completed_at`; `LicenseStatus.offline_downloads` in the platform contract | `redocly lint` passes; the API reference regenerated |
| [x] | 45.2 Plugin, every LMS through the common layer (`Content\Downloads`, `Lms\Course_Completion`): downloads on when the plan has offline mode and the dashboard's choice (else "Allow offline downloads") says so; the lesson's video when it's an upload or a direct file, its attachments and the images in its text; download links signed with their own `download|` payload for 15 minutes (a streaming link can't download and the other way round, sent as an attachment); the access check through the adapter's own `can_view_lesson`; the course page's progress, completion date (Tutor LMS's and LearnDash's own, else when the app completed the last item, else the certificate's date) and certificate | `DownloadsTest` (111 unit tests in all), `composer lint`; `api-test.php` on Tutor LMS 286 checks (23 new: off by default, sizes, video sites and web pages refused, links, tampering, expiry, an enrollment cancelled on the website refused, downloads turned off), LearnPress 119 |
| [x] | 45.3 Hosted API: courses managed in Yallapp offer downloads (a lesson's video file address; YouTube and Vimeo need the internet), the access check (a hidden course or removed lesson is refused), the progress and completion date on the course page and in My courses; Teachable and Thinkific schools offer none (45.12) | `phase45.test.ts` (every answer checked against the contract) |
| [x] | 45.4 Dashboard: Courses › Offline downloads for academies (managed in Yallapp: On by default, or Off; WordPress: On, Off or as set in the plugin, sent to the site at once), with "Upgrade" and the choices disabled without offline mode in the plan; the plugin's settings page says when the dashboard's choice replaces its own | `phase45.test.ts`, `license-refresh.test.ts`, `app-mail.test.ts`, `courses-hosted.spec.ts` (Off, then On, the app's config following) |
| [x] | 45.5 App (`modules/lms/downloads/`): a download button on every lesson and "Save course for offline" on the course page; one lesson at a time through background_downloader 9.6.3 (background where the platform allows, pause, resume, cancel, Wi-Fi only, one notification when the batch is done; links asked again once when they expired); each file sealed with AES-256-GCM (cryptography 2.9.0) in 256 KiB chunks, the key in flutter_secure_storage (this device only), the index and lesson text sealed too; a saved video plays from a loopback server that decrypts by range (`network_security_config.xml` allows only 127.0.0.1, `NSAllowsLocalNetworking` on iOS), with the watermark and capture cover; Account › Downloads (space per course and in all, lessons with progress, pause, resume, retry, cancel, delete a course or everything, Wi-Fi only, how long they're kept); the check at each start online and the 30-day expiry with plain notices; signing out deletes everything; progress and "Mark complete" made offline sent when back online, places first | `offline_downloads_test.dart` (the cipher with a fake key store: every size, a changed byte, another key, swapped and missing chunks; the real file sealing and range serving; the manager's states, pause, resume, cancel, expired links, failures, a course download skipping video sites, access ended, downloads off, the 30-day expiry; the progress queue), `phase45_test.dart` |
| [x] | 45.6 A finished course says so (38.18): the course page shows "You've completed this course" with "Completed on 12 Oct 2026" when the date is known, "Review course" opens the curriculum (never "Continue learning" to lesson 1), and "View certificate" where there is one; from an older server, every lesson and quiz done counts; My courses › Completed shows the date, "Review course" and the certificate; course cards say "Completed" instead of "Enrolled"; the home's continue card in the Classic, Bold and Minimal templates says "Completed" for a finished course | `phase45_test.dart` (the three templates, Arabic right to left, no date or certificate, an older server, My courses), `flutter analyze`, `flutter test` (667) |
| [x] | 45.7 The app preview rebuilt: the completed state shows there; it has no download buttons (the web build can't keep files) | `build_preview.sh --check` |
| [ ] | 45.8 Not tried on phones here: background downloads with the app closed, the notifications (Android 13+ asks for permission at the first download), playback from the loopback server on Android and iOS, and opening a saved attachment with the phone's viewer (a temporary decrypted copy, deleted at the next start; an in-app PDF viewer would keep it inside the app) | A device test with real lessons |
| [ ] | 45.9 Export compliance: the app now encrypts files itself (AES, to protect the client's content); `ITSAppUsesNonExemptEncryption` stays false as encryption for content protection, which the owner should confirm for App Store Connect | Owner's decision |
| [ ] | 45.10 A lesson whose download stopped with the app closed starts again from the beginning of that file with new links (transfers left from an earlier run are reset at the next start) | When resuming across restarts is needed |
| [ ] | 45.11 Quizzes, assignments and live classes aren't saved; videos inside lesson text (embeds) and lessons shown as web pages need the internet; a hosted lesson's direct video file has no size until it's downloaded | With a need for them |
| [ ] | 45.12 Teachable and Thinkific schools: their APIs give no file to save (Teachable's video is a short-lived stream, Thinkific's lessons open in its web player), so `features.downloads` stays false there | If their APIs offer files |
| [x] | 45.13 Done in Phase 90 (90.1): courses managed in Yallapp give a certificate when the owner turns it on. Was: Certificates for courses managed in Yallapp: hosted courses have none (`features.certificates` false), so a finished hosted course shows "Completed" and its date without a certificate; a simple certificate page or PDF would need its design and wording | Owner's decision |
| [ ] | 45.14 The completion date on WordPress for LearnPress, LifterLMS, MasterStudy, Sensei and Masteriyo comes from the app (when it completed the last item) or the certificate, not from the LMS's own record, so a course finished on the website before shows "Completed" without a date | Adapter by adapter, when owners ask |

## Phase 46: Links that open the app, a rating prompt, and crash reports

A shared course, product, service, listing, article, event, campaign or page
is now a link that opens that screen in the app when it's installed (Android
App Links, iOS Universal Links) and the website otherwise: the item's own
page on a WordPress site, or a page in the app's branding with its store
link for apps without one. The app asks for a rating with the store's own
prompt after good moments, and sends crash reports the team sees grouped in
Admin › Crashes and the owner as a Stability card. Proved with unit tests on
each side, the plugin's Tutor LMS integration suite over HTTP, browser tests
of the dashboard and the link page, and Flutter tests with links sent the way
the engine sends them. Not on a real phone yet: verification needs the store
builds (LAUNCH-CHECKLIST 7g). Migration `drizzle/0036_app_links_crashes.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 46.1 Contract first: the Links and Crash reports tags in `docs/api/openapi.yaml` (link formats, `Config.links.share_base_url`, `Config.app.review_prompt` and `crash_reports`, `Notification.link`, `POST /crashes` with `CrashReportBatch`), `LicenseStatus.app_links`, `review_prompt` and `crash_reports` in `platform.yaml`, `StatusReport.signing` in `pipeline.yaml`, the build config's `links`; the one link table `docs/api/app-links.json` (kinds, screens, id shapes, examples) | `redocly lint` passes, the API reference regenerated; the app, the platform and the plugin each test their table against the file |
| [x] | 46.2 Platform: migration 0036 (`apps.play_signing_sha256`, `android_upload_sha256`, `apple_team_id`, `links_check`, `review_prompt`, `crash_reports`; `crash_issues`, `crash_sessions`); Yallapp's `/.well-known/assetlinks.json` and `apple-app-site-association` at the root (every app with its fingerprints; each iPhone app for `/a/<app_id>/*`), the reverse proxy passing them through; the license status, the hosted `/config` and the build config carry the links and switches | `phase46.test.ts` (files, license status against the contract, hosted config against the contract, build config valid only on https), `drizzle-kit generate` clean |
| [x] | 46.3 The link page without the app (`/a/<app_id>/<kind>/<id>`): a WordPress app's link goes on to the site once its plugin serves links (`LINKS_PLUGIN_VERSION`); otherwise the item's name and picture (only published, visible items) in the app's branding, "Get it on Google Play" and, once live, "Download on the App Store"; no price or purchase button on any phone | `phase46.test.ts`, `links-crashes.spec.ts` (Android and iPhone browsers, no price, 404 for another kind) |
| [x] | 46.4 Dashboard: Publishing › Links to your app (the Play App Signing key's SHA-256 with where to find it, refusing SHA-1 and malformed values; the Apple Team ID, filled by iOS builds), "Check links" there and on App setup (the app's facts, and a WordPress site's two files fetched as phones do: https, no redirect, JSON, never a private address, 8 s, 256 kB); every save asks the site to check its license | `phase46.test.ts`, `license-refresh.test.ts`, `links-crashes.spec.ts` |
| [x] | 46.5 Build pipeline: `scripts/fingerprint.py` reports the upload key's SHA-256 and iOS builds the Team ID (`StatusReport.signing`, saved only when changed); the Android release build gets one verified intent filter per link host and path (`android/app/src/links/AndroidManifest.xml` from `tool/apply_config.dart`), the iOS build the Associated Domains capability and `applinks:` entitlement (Fastfile); Flutter's deep linking on | `build/tests` (the fingerprint as keytool prints it), `app_links_test.dart` (the manifest and the Dart config), `bash -n`, `ruby -c` |
| [x] | 46.6 Plugin: `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` (no extension, `application/json`) from the license status, only well-formed values; `<site>/a/<kind>/<id>` redirects to the item's permalink (published, public, no password) or the home page; `/config` shares `<site>/a` and carries the owner's switches; "Unreleased" in readme.txt | `AppLinksTest`; the Tutor LMS integration suite, 273 checks (10 new over HTTP) |
| [x] | 46.7 App: links opened from outside (cold start and while running, a path on Android, the whole address on iOS) and notification links go through go_router's redirect with the table (another app's link, a kind the app type lacks or a bad id open Home); Share on courses, products, services, listings, campaigns, articles and events shares the link | `app_links_test.dart`, `phase46_test.dart` (links sent as the engine sends them, Share) |
| [x] | 46.8 Rating prompt: the store's own prompt (`in_app_review` 2.0.12) after a finished lesson, an order, a booking, a ticket, a donation or the third run; not before three runs over two days, at most every 120 days and three times a year, never in the preview, off with the owner's switch (Stability page); no question first | `review_prompt_test.dart`, `phase46_test.dart` (a finished lesson asks) |
| [x] | 46.9 Crash reports: Flutter's and Dart's handlers, the zone and the isolate's errors; scrubbed (queries, emails, numbers, tokens, codes) on the phone and again on the platform; fingerprint of the error and the app's frames without line numbers; once per run each, at most 10 waiting, sent with the runs counted when the owner and the user (Settings › Privacy › Send crash reports, on by default) allow it, never from development builds or the preview; `POST /crashes` rate limited per address and per app, grouped with counts, first and last seen, versions; a resolved group reported again opens again | `crash_reporter_test.dart`, `phase46.test.ts`, `links-crashes.spec.ts` (ingest, Admin › Crashes with the stack and Mark resolved, the owner's Stability, the switch off) |
| [x] | 46.10 The preview bundle rebuilt | `build_preview.sh --check` |
| [x] | 46.11 (Done in Phase 48.) Real permalinks (`<site>/courses/intro/`) don't open the app: only `<site>/a/…` and Yallapp's links do, since Android's intent filters are fixed at build time. A site in a folder (`example.com/learn`) can't serve the files at its domain's root, so only Yallapp's links open its app | Owner's decision (permalink prefixes in the build config) |
| [ ] | 46.12 Native crashes (Java/Kotlin, Swift) and ANRs aren't caught: only errors in the app's Dart code | A native crash handler, when needed |
| [ ] | 46.13 Not tried on real phones: App Links verification by Google, Apple's CDN fetching the association file, the in-app review prompt showing. The crash-free share counts only runs of rebuilt apps; the plugin's own push notifications don't send `link` yet | LAUNCH-CHECKLIST 7g |

## Phase 47: Refunds from the dashboard, plan edits reach the sites, and analytics in the owner's time zone

Owners of apps without a website now refund a paid order, ticket, course
purchase, membership or donation from the dashboard, all of it or part,
through the provider the payment was taken with: iyzico (a cancel on the
day it was paid, else item by item, as iyzico's own SDKs call its Cancel and
Refund APIs), Kashier (its documented refund call) and, as Fawaterk's API v2
has no refund call, a refund made in Fawaterk's panel and recorded. Each
refund is kept with its reason, who made it, when and the provider's
reference; the order or donation follows, what it paid for is taken back,
the customer gets an email, the app shows it and the team's audit log has
it. The team's edits to what a plan includes now reach every WordPress site
on that plan within seconds, and Analytics counts days in the owner's time
zone. Refunds were built against fake provider servers that check the exact
signed requests, on the memory store and MariaDB 10.11; the providers' own
answers are confirmed with test accounts before going live (47.9).
Migration `drizzle/0039_refunds_time_zone.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 47.1 Contract first: `Order.refunded_total` (a fully refunded order keeps `status` `refunded`), `Ticket.refunded` (the status stays `cancelled`: a new value would read as valid in older apps, which default unknown statuses to valid), `Donation.refunded_total`, and `GET /me/donations` keeps refunded donations | `redocly lint`; the public copy and the API reference regenerated |
| [x] | 47.2 Providers (`lib/payments/refund.ts`): iyzico `POST /payment/cancel` for a whole payment on Istanbul's day it was taken, else (or when the cancel is refused) `POST /payment/detail` and `POST /payment/refund` per item transaction, never more than an item's paid price less earlier refunds, all IYZWSv2-signed; Kashier `PUT /v3/orders/{orderId}/` on its fep host with the secret key, `apiOperation: "REFUND"`, the amount and `targetTransactionId` (both read back from the payment session); Fawaterk recorded. A refund that stops half-way records what was done; a provider that doesn't answer is never retried | `refunds.test.ts`: fake iyzico checking the IYZWSv2 signature of each call and its exact body (cancel, detail, refunds per item, partial then the rest, refused cancel, no answer), fake Kashier (method, fep address, headers, body, refusal) |
| [x] | 47.3 Records and state (`lib/refunds/service.ts`, `payment_refunds`, `refunded_cents` on orders and donations, `event_tickets.refunded_at`): amount, reason, note, provider, method, the provider's calls and references, commission given back, what was taken back, who and when; added to the total in one statement that refuses more than was paid (two refunds at once can't over-refund); all of it: "Refunded". A refunded ticket is cancelled and its place freed, a refunded course purchase removes access (progress kept), a membership ends; in part, only what the owner ticks. A donation's refund leaves its campaign's total and, all of it, its donor count unless they gave another | `refunds.test.ts`, `refunds-mysql.test.ts` on MariaDB (four refunds at once from four connections), `catalog.test.ts` (`/me/orders` against the contract) |
| [x] | 47.4 Dashboard: **Refund** under each paid order (Orders and the Kitchen's finished orders) and donation: amount (up to what's left), reason, note, the provider's reference when recorded, "how" when both are possible, what to take back for a refund in part; the refunds made listed under it; "Mark refunded" without a refund is gone. The customer's `payment_refunded` email in the app's name; `payment.refund` in the audit log; the receipt page says what was refunded; the help articles (orders, the kitchen, card payments, events, donations) say how | `refunds.spec.ts` on the memory store and MariaDB (a Kashier order refunded in part, then the rest: the fake gets the shop's secret key and the amounts, the order and its refunds list follow, two emails, the audit log) |
| [x] | 47.5 Marketplace: a refund of a sale through Yallapp comes out of Yallapp's account; Yallapp's commission is given back in proportion to what is refunded of what is left (all of it with the last refund), and `commission_cents` goes down with it. iyzico refunds the item's own transaction, so iyzico takes it from the item's split; with Kashier, the shop's share of a refund after its payout was released comes off its next transfer (the dashboard says so). A Fawaterk marketplace payment can't be refunded by the shop (no API, and Yallapp's panel isn't theirs): the dashboard says our team refunds it | `refunds.test.ts` |
| [x] | 47.6 Plan edits nudge the sites (31.6): saving what a plan includes, or putting it back to its defaults, asks every WordPress site whose license is on that plan now to check its license: five at once, a second between batches, at most 500 within 20 seconds after the save has answered; the rest at their next check. `LICENSE_REFRESH_TEST_URL` (refused on Netlify) sends every nudge to a fake site in local tests | `license-refresh.test.ts` (only that plan's active WordPress sites, signed, batches and pauses, the time budget and the cap), `refunds.spec.ts` on memory and MariaDB (the fake site gets the nudge signed with its license key) |
| [x] | 47.7 Analytics in the owner's time zone (44.7): Analytics › Time zone (default: the zone of the account's country from its WhatsApp number, else Europe/Istanbul); each event is filed under the app's date when it arrives, so totals, active users, retention, searches and pushes are counted in that zone with no change to the counting; the page, the CSV, the admin card and the daily job use it; the page says which zone. A change applies from then on: days counted before keep their zone (before this phase, UTC) | `analytics.test.ts` (zones, the country's zone, an event filed under Tokyo's date, the report's today), `analytics.spec.ts` on memory and MariaDB (the owner picks Pacific/Kiritimati and an event lands on its date) |
| [x] | 47.8 App: the order history and an order show "Refunded ₺100.00" (a refunded restaurant order says Refunded, not its step), a refunded ticket says "Refunded", My donations shows what was refunded; strings in English, Arabic and Turkish; the preview bundle rebuilt | `phase47_test.dart`, `flutter analyze`, `flutter test`, `build_preview.sh --check` |
| [ ] | 47.9 Confirm against the providers' test accounts (LAUNCH-CHECKLIST): iyzico's `/payment/cancel`, `/payment/detail` and `/payment/refund` answers (`status`, `hostReference`, `itemTransactions[].paymentTransactionId` and `paidPrice`) and that a cancel is refused after the day's end-of-day report; that refunding a marketplace item after its payout was approved works and how iyzico splits it between the sub-merchant and Yallapp; Kashier's refund address and body (`fep.kashier.io/v3/orders/{orderId}/`, the amount as a number, `targetTransactionId`), its answer's fields, and that the session's payment carries `kashierOrderId`; a Kashier refund on the same day may need `VOID` instead | A test refund on each provider's test account |
| [x] | 47.10 Closed by the owner (Phase 96): Yallapp takes no commission and never receives money for a client; the marketplace ended in Phase 72, and old orders keep the rule assumed here. Was: Owner's decision: Yallapp's commission on a refunded marketplace sale is given back in proportion (assumed here); and whether a shop's share already transferred (Kashier or Fawaterk) should be deducted from its next transfer (assumed) or charged otherwise | Owner's decision |
| [ ] | 47.11 Fawaterk refunds through an API: Fawaterk documents a refund API only in its newer v3 API with OAuth credentials (client ID and secret), which accounts here don't hold; until then Fawaterk refunds are made in its panel and recorded. Fawaterk marketplace payments are refunded by our team in Yallapp's panel, with no admin action to record them yet | Fawaterk v3 credentials, or a refund call in v2 |
| [ ] | 47.12 Refunds of plan payments (the client's own plan with Yallapp) stay with the team's refund policy, made in the provider's panel; WordPress apps' orders are refunded in WooCommerce or the LMS | When needed |

## Phase 48: The site's own links open the app

Until now only `<site>/a/<kind>/<id>` and Yallapp's links opened the app
(46.11). Now the WordPress site's own addresses do too: a course or lesson
page, a product or product category, a post, a page with the booking form,
as the site's permalinks make them. On iPhone the plugin lists them in
`apple-app-site-association` after what must stay on the website; on Android
(no exclusions there, and intent filters fixed at build time) the plugin
reports the bases that start with a fixed folder with its license check and
the next build lists them. The app asks the site what an address is and
opens that screen, or the page in its in-app browser, which never hands it
back, so a link never loops. The plugin's own push notifications and inbox
now carry the `link` they open (46.13). No migration (the paths are kept in
`apps.hosted_settings`).

| | Step | Done when |
|---|---|---|
| [x] | 48.1 Contract first: `GET /links/resolve?url=` (tag Links, `LinkResolution`: `kind` of `course`, `lesson`, `product`, `product_category`, `article`, `bookings`, `service` or null, and `id`; 400; 404 on the hosted API and older plugins), the Links tag on the site's own pages, exclusions and sites in a folder; `resolved_kinds` in `docs/api/app-links.json`; `SiteInfo.link_paths` in `docs/api/platform.yaml`; `links.site_paths` in the build config schema | `redocly lint`, the public copy and the API reference regenerated; each side tests its copy of `resolved_kinds` against the file |
| [x] | 48.2 Plugin: `Link_Paths` (per app type the post types' and taxonomies' bases after the permalink front, the posts' structure as an iOS pattern with `????`/`??` for dates, pages with Amelia's, BookingPress's or LatePoint's form; a sample item's permalink adds the folder it really sits in, as Tutor LMS's lessons under `/courses/`); the association file's components: queries (`add-to-cart`, `wc-api`, `rest_route`, `preview`, `s`, `key`, `action`), the home page, wp-admin, wp-login.php, wp-json, wp-content, feeds, embeds, the cart, checkout, account and payment pages of WooCommerce, Tutor LMS, LearnPress, LifterLMS and Masteriyo (filter `yallapp_link_excluded_page_ids`) excluded first, then `/a/*` and the site's pages; a site in a folder also serves both files under its folder; `Link_Resolver` and `GET /links/resolve` (the site's host with or without `www.`, `url_to_postid` then the slug in the entry's post types, only published, public items without a password; a booking form for one service names it); `site_info` sends `link_paths`; pushes (new lesson, announcement, enrolment, answer, new post) and the inbox carry `link`; "Unreleased" in readme.txt | `LinkPathsTest` (127 unit tests in all), `composer lint`; `api-test.php` on Tutor LMS 330 checks (the association, resolve and Android paths with `/%postname%/`, `/blog/%postname%/` and dated permalinks, the dashboard, a quiz, a private course, another site, `add-to-cart`, the inbox's and a push's link); `store-test.php` 129 (products, categories, cart, checkout and account excluded); `news-test.php` 53 (posts in three structures, pages, drafts, passwords) |
| [x] | 48.3 Platform: `SiteInfo.link_paths` read on activation and every check (malformed entries dropped, never failing the check) and kept on the app only when they change; the build config's `links.site_paths` from them | `phase48.test.ts` (parsing, saving once, an older plugin, the owner's other settings kept, the build config valid against the schema), `vitest run` |
| [x] | 48.4 App: the build config tool checks `links.site_paths` (needs `site_base_url`, at most 20) and adds an intent filter per path on the site's host, `BuildConfigData.sitePaths`; go_router's redirect sends an address on the site's host (iOS) or a path under a site path that isn't one of the app's screens (Android) to `/open?url=`; `LinkOpenScreen` asks `GET /links/resolve` and opens the screen, else (no kind, another app type's kind, an error, an older plugin) the in-app web view, and the same address arriving again within 10 seconds goes straight to the web view | `site_pages_test.dart` (the table, permalink to route, the app's own screens never sent to the site, the build config), `phase48_test.dart` (iOS and Android addresses, unknown to the in-app browser, no loop, errors), `flutter analyze`, `flutter test` |
| [ ] | 48.5 Posts whose permalinks start at the root (`/%postname%/`, dated ones) open the app on iPhone only: an Android intent filter for them would take every page of the site. Android 15's `uri-relative-filter-group` could exclude pages there | Owner's decision, or when most phones run Android 15 |
| [ ] | 48.6 A site in a folder (`example.com/learn`) can't serve the files at its domain's root: the plugin serves them under its folder for the domain's own server to copy (no redirect is allowed), and until then only Yallapp's links open its app | Per site, by its host |
| [ ] | 48.7 New permalink bases reach Android with the next build after the next license check (12 hours, or "Check now"); iPhone reads the association file again when the app is installed or updated. go_router drops a trailing slash, so the app asks for and shows the address without it (WordPress redirects to its own) | When owners ask |
| [ ] | 48.8 Not tried on phones: Apple's CDN reading the longer association file, and an Android App Link to a site path. Archive pages (`/courses/`) open the app and then the in-app browser; booking services are named only when the form's shortcode names one | LAUNCH-CHECKLIST 7g |

## Phase 49: Account deletion reaches the client's API, and ticket holds end with the payment page

Two follow-ups. 34.8: for an app on its own API that Yallapp signs people
in to, deleting an account no longer waits on the client's API: the app
still calls the client's `DELETE /me` first, then Yallapp deletes the
account whatever that answered and sends the client's API a signed
`account.deleted` notice, tried again with backoff for about two days and
listed for the owner. 37.10: places held for a ticket payment now end with
the provider's payment page (plus 5 minutes for its confirmation), and a
payment confirmed after that gets its tickets only while the places are
free; otherwise the order stays paid without tickets, the buyer is told the
organiser will refund them and the owner gets a notice to refund it (the
safe choice: a place is never sold twice and no payment is kept silently;
no automatic refund, which stays with the refunds work). Migration
`drizzle/0037_api_webhooks.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 49.1 Contract first: the `accountDeleted` webhook in `docs/api/openapi.yaml` (`POST <API address>/webhooks/yallapp`, `application/secevent+jwt`, `Yallapp-Event` and `Yallapp-Delivery`, the claims, the retries) and the "Yallapp sign-in" tag; the API reference lists webhooks (`x-path`) | `redocly lint`, the public copy and the API reference regenerated |
| [x] | 49.2 Platform: `lib/hosted/api-webhooks.ts` (a Security Event Token signed with the app's key, `typ` `secevent+jwt`, `aud` `<app id>:events` so it never passes as an access token, `jti` the same on every try, signed again with a 5-minute `exp`; 2xx delivered; 5xx, 408, 425, 429, timeouts and unreachable APIs tried again after 1, 5, 30 minutes, 2, 6, 12 and 24 hours; other 4xx, redirects (never followed) and private addresses fail at once); `api_webhooks` (memory and MySQL stores, one run takes a due notice at a time, deleted after 30 days); the first try with the hosted `DELETE /me` (a failure never keeps the account); the webhook job `POST /api/internal/webhooks` and the scheduled function every 5 minutes; App sign-in › For your developer lists the notices of 30 days with how each went | `phase49.test.ts` (jose checks the notice like the guide, an access token check refuses it, the 8 tries and their waits, stops, one run per try, the hosted deletion), `phase49-mysql.test.ts` on MariaDB, `yallapp-sign-in.spec.ts` (an account deleted, the notice listed with why it waits) on the memory store and MariaDB, `drizzle-kit generate` clean |
| [x] | 49.3 App: deleting the account goes on to Yallapp whatever the client's `DELETE /me` answers (Yallapp's notice tells the client's API) | `yallapp_sign_in_test.dart` (500 and 503 at the client still delete), `flutter test`; the preview bundle rebuilt |
| [x] | 49.4 Developer guide: "Account deletion notices" (the claims, the retries, checking it with jose, delete by `sub` whichever comes first) and the checklist; `docs/ARCHITECTURE.md`; the webhook job in `docs/LAUNCH-CHECKLIST.md` | `vitest run` (the guides are rendered and checked) |
| [x] | 49.5 Ticket holds: the checkout link holds the places for the pay link's hour (was two); starting the payment holds them until the provider's page ends plus 5 minutes (iyzico's `tokenExpireTime`, Kashier's session with `expireAt` 30 minutes ahead, Fawaterk 30 minutes as it takes no expiry to the minute); no payment starts once the hold ended ("Places released" on the payment page); a later confirmation issues the tickets only while the places are free, atomically against claims, else cancels them, keeps the order paid, shows the buyer "No places left" with the refund, and leaves the owner a `ticket_refund_due` notice | `phase49.test.ts` (the hold for Kashier's session, a place sold meanwhile, a late payment with the place free, twice settled, each provider's expiry), `phase49-mysql.test.ts` (a late payment racing a claim, five rounds, never both), `events-mysql.test.ts`, `payment-providers.test.ts`; `events-hosted.spec.ts` and `egypt-payments.spec.ts` unchanged and passing |
| [ ] | 49.6 Kashier's `expireAt` on payment sessions is taken from its documentation and not yet tried on its test account; Fawaterk's invoices take no expiry to the minute (a Fawry reference can be paid days later), so their late payments rely on the place check | A test payment on each provider's test account (with 37.8) |
| [ ] | 49.7 A late payment for a full event is refunded by the owner from the provider's panel (the notice says so); refunding it from the dashboard comes with the refunds work | With the dashboard's refunds |
| [ ] | 49.8 The webhook's address is fixed (`<API address>/webhooks/yallapp`); notices for other events (a changed phone or email) aren't offered ("Send again" for failed notices came with 80.3). The "Places released" and "No places left" pages need the hold to pass, so they're covered by unit tests, not the browser tests | When a client asks |

## Phase 50: WordPress courses look and open like courses without a website; private courses for their students

The owner tried a Tutor LMS app: tapping a course in My courses opened its next
lesson straight away, to be flipped through one by one, and a course the admin
had set to Private vanished from its own students' app. Now every way into a
course (My courses, the home screen's Continue card, a Continue page block, a
link) opens its course page first, the same screen for every LMS and for
academies without a website: the header, the overview and the whole
curriculum by topic (Tutor LMS topics, LearnPress and LearnDash sections,
Sensei modules...), each topic opening to its lessons, quizzes and
assignments, the student's topic open. A private course stays out of the
catalog and opens fully for its students. Reproduced side by side in the app
preview with a Tutor LMS 4.1.1 + WooCommerce site and the Nour Academy demo
app, before and after. No migration.

| | Step | Done when |
|---|---|---|
| [x] | 50.1 Contract first: `docs/api/openapi.yaml` says the catalog never lists a private course, `GET /courses/{id}`, its curriculum and its lessons (free previews too) are `404 not_found` for whoever can't open it, `GET /me/courses` lists the private courses the student is in, and the curriculum comes in the LMS's topic order | `redocly lint` passes, the API reference regenerated |
| [x] | 50.2 App: `continueCourse` (My courses, the home screen's Continue cards, the Continue page block) opens the course page, never a lesson; the course page's topics open and close (title, "2 of 4 lessons · 21 min", a tick when done), the topic holding the next lesson open (the first for visitors); a lesson opens from its topic and keeps previous and next; "Continue learning" on the course page still opens the next lesson | `phase50_test.dart` (My courses and the Continue card open the course page with no lesson fetched, topics toggle, a lesson opens from its topic, a visitor's first topic open) |
| [x] | 50.3 Plugin: `Course_Visibility` decides for every adapter: a published course for everyone; a private one for the students enrolled in it (however enrolled) and whoever may read it on the website (`read_post`: its author, editors, administrators). Course, curriculum, free enrollment, My courses (Tutor LMS, LearnPress, LearnDash, LifterLMS, Sensei, MasterStudy, Masteriyo; LearnDash's and Sensei's enrolled-course queries take private courses, and LifterLMS's private enrollments are read from its table since its own list has published courses only), lesson neighbours for the student; the lesson, download, progress and completion endpoints refuse a private course's lessons to others (`Lms_Adapter::course_visible`); "Unreleased" in readme.txt | `CourseVisibilityTest`; the integration suites' "A private course (50)" checks (not in the catalog, 404 signed out and not enrolled for the course, curriculum and every lesson, no enrolling, opens for a freshly enrolled student with the same topics in order, in My courses, lesson neighbours) with Tutor LMS (316 checks), LearnPress (139), LifterLMS (128), Masteriyo (136) and MasterStudy (135); Sensei (119) counts no one as enrolled in an unpublished course, so there it stays closed to students as on the website (`expect.private_courses`). LearnDash not run (not on wordpress.org) |
| [x] | 50.4 The preview bundle rebuilt; screenshots before and after for Tutor LMS and the Nour Academy demo | `build_preview.sh --check` |
| [x] | 50.5 A password-protected course still shows in the catalog (as on the website) and its password can't be typed in the app; private lessons inside a course stay hidden as the LMS hides them from students (Tutor LMS and LearnPress don't show them). Decided and built in 62.5: the course page says it has a password and opens the website for it | Phase 62 |
| [ ] | 50.6 A "new lesson" notification still opens the lesson itself (Back goes home). The wishlist takes private courses since 62.5 | When needed |

## Phase 51: Videos and pictures hosted by Yallapp, with storage per plan

The owner saw lesson videos that still showed where they were hosted. First
what the app does: every place a lesson video can show (the lesson's video,
videos in lesson text, page video blocks, and the app preview's frame) already
plays YouTube, Vimeo and Bunny Stream behind the app's own controls since
Phase 40, and lessons of courses managed in Yallapp always render natively. So
the most likely cause is an app built before Phase 40 (apps get it with their
next build), or a site that keeps its own player (Wistia, Dailymotion, Loom),
or a WordPress lesson set to "Web view", which shows the website's page. One
real gap was found and fixed: a listing's "Watch the video" opened the video
site's page. The crop is deeper now, but what a site draws over the picture
itself can't be cropped (51.13). The real fix is the second part: owners
upload their videos, pictures and PDFs to Yallapp. As the owner asked, they
are kept on our own host and in our own database: the platform's functions
on Netlify can't take big uploads or stream video, so a small PHP gate under
the Apache that serves yallapp.com.tr takes the uploads in chunks and plays
the files with range requests, from links the platform signs. Storage comes
with the plan, with packs to buy by card, priced like the plans since Phase 52
(51.18). Migration `drizzle/0040_media_storage.sql` (after Phase 52's 0038 and
Phase 47's 0039).

| | Step | Done when |
|---|---|---|
| [x] | 51.1 Part A, every path checked: the lesson video, inline embeds and page blocks use the brandless player for YouTube, Vimeo and Bunny, the web preview the same page in its sandboxed frame. Fixed: a listing's video plays in the app's own player (`VideoScreen`), never the site's page; the site's frame is five box heights tall (three before), so its title, logo, buttons and pause overlay sit two heights outside the visible box, and the last half second is covered before an end screen can flash | `brandless_video_test.dart`, `real_estate_test.dart` (a listing's YouTube video), `tool/check_player_pages.sh` (stand-in YouTube, Vimeo and Bunny players in Chromium; YouTube itself is unreachable here) |
| [x] | 51.2 Contract first: `Video` from the Media library (`upload`, a signed `url` for 4 hours, `expires_at`, renewed by fetching the lesson again) and `LessonOffline.size_bytes` in `openapi.yaml`; the Media tag and `POST /licenses/media` (`MediaLinksRequest`, `MediaLinks`) in `platform.yaml` | `redocly lint`, API reference regenerated |
| [x] | 51.3 Storage on our host: the media gate (`deploy/media-host`: `v` plays with ranges and optional X-Sendfile, `u` takes 5 MB chunks at `Upload-Offset` straight to disk under a lock and never past the signed size, `s` reports, `d` deletes; HMAC-signed links with expiry), `ProxyPass /media/ !` in the proxy config, the platform's own `/media` route with the same protocol for local runs and tests (`YALLAPP_MEDIA=fs`); `media_files` and `storage_packs` in MariaDB | `media.test.ts`: the same upload, resume, 409/413, range, 416, expiry and tampering checks run against the TypeScript gate and the PHP gate (PHP's built-in server); `media-mysql.test.ts` on MariaDB; `drizzle-kit generate` clean |
| [x] | 51.4 Dashboard › Media: upload (drop or choose; MP4, MOV, WebM up to 5 GB, pictures up to 20 MB, PDFs up to 200 MB), progress per file, pause, resume, retries, resume after a reload by choosing the same file, cancel; the list with type, size and date, filters, rename, copy link, open, "Share the link" for videos and PDFs, delete (frees the space); the storage meter | `media.spec.ts` on the memory store and MariaDB (a 6 MB video in two chunks, a picture, ranges from the signed link, a tampered link refused, rename, delete) |
| [x] | 51.5 Pick from the library: a lesson's video (courses managed in Yallapp), page blocks (banner, image, slider, video and its cover; a video on a page becomes shared), products' and listings' photos (`media:<id>` assets) | `media.spec.ts` (a lesson's video picked, then played from the hosted API's signed link); `catalog.spec.ts`, `listings-hosted.spec.ts`, `pages.spec.ts` unchanged and passing |
| [x] | 51.6 Storage per plan: `storageGb` 2, 20, 100 and 500 GB, editable in Admin › Plans (decimals allowed); uploads that don't fit are refused with "Buy more storage"; plan cards, the pricing table, the License page and an FAQ entry show it | `media.test.ts` (quota math, old plan edits keep the default), `website-seo.test.ts`, `media.spec.ts` (refused at 0.01 GB), `public.spec.ts` |
| [x] | 51.7 Storage packs: +25 GB and +100 GB with a monthly price in Admin › Plans, bought on Media by card through the gateway for Yallapp's plans (Kashier unless the team chose another; a `plan_payments` row with `purpose: storage`) for the months left in the plan's period; a plan renewal by card offers to renew them (`storage_packs` on the payment, extended to the new end); the team adds or removes packs by hand on the client's page; when a pack ends and the files are over, nothing is deleted, uploads wait, and the owner gets one notice and email ("Storage pack ended"; "Storage pack added" after a purchase) | `media.test.ts` (purchase, double confirmation, renewal with the plan, the ended pack told once), `media.spec.ts` (bought with the fake Kashier, then the upload goes through; the admin's card; the pack renewed with the plan), `plan-payment.spec.ts`, `email-templates.test.ts` |
| [x] | 51.8 Playback: hosted lessons whose video is a Media link play from a 4-hour signed link (`upload`, `expires_at`), save for offline viewing with a 15-minute link and the file's size; a deleted file leaves the lesson without a video; `/m/<id>` redirects for pictures and shared files and refuses lesson videos | `media.test.ts` (against the contract), `media.spec.ts` |
| [x] | 51.9 WordPress: the "Yallapp video" box on every LMS's lessons, the LMS's own video address (Tutor LMS's external URL and the like) or `[yallapp_video link="…"]`; after the LMS lets the student in, the plugin asks `POST /licenses/media` with its license (play links cached an hour for other students, download links never); Yallapp unreachable: the lesson opens without its video, and saving it offline answers 503 instead of saving it without; the shortcode shows a `<video>` on the website | `YallappMediaTest` (124 unit tests in all; 141 with Phases 47 to 53), `composer lint`; Tutor LMS integration suite 304 checks (8 new in `media-check.php`: the signed link, the request, the cache, a locked lesson refused before asking, a deleted file, the shortcode) |
| [x] | 51.10 App: `SignedVideoLink` asks for a new link five minutes before the old one ends (a paused video moves to it at once) and when the player stops on an old link, then carries on playing where it was; one request at a time; the preview bundle rebuilt | `signed_video_link_test.dart`, `flutter analyze`, `flutter test` (721; 760 with Phases 47 to 53), `build_preview.sh --check` |
| [x] | 51.11 Docs: the owner guide's "Media and storage", the FAQ, `docs/ARCHITECTURE.md` (Media library), LAUNCH-CHECKLIST 7j, the platform README and `.env.example` | `vitest run` (articles rendered and checked); Owner's review |
| [ ] | 51.12 Not tried on our real host: the PHP gate under Apache with real files, `ProxyPass /media/ !`, mod_xsendfile, `LimitRequestBody`, long downloads through PHP, the disk space the plans add up to, and backups of the media folder | LAUNCH-CHECKLIST 7j |
| [ ] | 51.13 Video sites, what can't be guaranteed: what a site draws over the picture itself (a creator's end-screen cards in the last 5 to 20 seconds, a paid-promotion label, ads on a monetized video), and overlays the site may change; the checks run against stand-in players only. Wistia, Dailymotion and Loom keep their own player; WordPress lessons set to "Web view" show the website's player. For no branding at all: upload to Media | Owner's decision |
| [ ] | 51.14 Videos play as uploaded (progressive MP4 with range requests; MP4 H.264 recommended in the guide): no HLS or adaptive quality, no transcoding of MOV or WebM, no poster or duration read from the file | A transcoding service, if owners need it |
| [x] | 51.15 A signed link isn't bound to the student or device: whoever holds one can play it until it ends (4 hours). Bound to the student's access token on the hosted API in 62.7 (WordPress sites and bandwidth per plan: 62.13) | Phase 62 |
| [ ] | 51.16 WordPress: the LMS's own website player can't play a media link (use the shortcode on the website); the app plays one Yallapp video per lesson (other shortcodes show nothing in the app); released in plugin 0.4.4 | Plugin 0.4.4 |
| [x] | 51.17 Files of an account the team deletes stay in the media folder (apps aren't deleted otherwise). Removed by the daily job a week after their app is gone, and at once by `deleteAppMedia`, in 62.7; an S3-compatible bucket as another backend behind the same signed links isn't built, by the owner's choice of our own host | Phase 62 |
| [x] | 51.18 Storage pack prices follow Phase 52's money model: each pack's monthly price is a `YallappPrice` set in Admin › Plans next to the plan prices (**Monthly price in EGP**, needed to sell by card; **Monthly price in USD (optional)**, else the pounds at the rate); Media shows the packs in the client's currency with the "You'll be charged EGP …" line and charges them through `yallappPlanAccount` in pounds (a pack the gateway can't charge isn't offered); a pack payment keeps the shown dollars (`shown_cents`); packs renewed with a plan add their charge (a month's price × the plan's months) to the plan's, and their shown price to its shown price (`sumOffers`; shown as charged when the currencies differ); a coupon lowers the plan only, and a coupon for the whole plan still sends the packs to the card; the renewal line, receipts ("Storage +25 GB", "Storage renewed"), License › Payments and the admin's payment lists use `formatMoney`/`formatAmount`. Pack offers saved before (a price in any currency) count as unpriced until the team sets pounds | `media.test.ts` (offers per gateway, old offers unpriced, the sums, a pack bought through a fake Kashier in pounds with the dollars kept, a renewal of EGP 1,200 + 12 × EGP 250 charged and $24 + 12 × $5 shown), `media-mysql.test.ts`, `media.spec.ts` (EGP and USD prices set, "$5 a month" and the charge line on Media, Kashier asked for pounds, the receipt, the plan renewed with the pack for EGP 1,250) on memory and MariaDB |

## Phase 52: Yallapp's prices in Egyptian pounds for Egypt and US dollars elsewhere, paid through Kashier in pounds

The owner's decision: Yallapp's own prices (its plans, and any add-on) are
shown in Egyptian pounds to people in Egypt and in US dollars everywhere else,
and everyone is charged in pounds through Kashier. The team sets each price in
pounds and either its own dollar price or an exchange rate; the site, the
dashboard, the payment form, the receipt, the emails and the admin follow the
visitor's country (the client's account country first). What app owners sell
to their customers keeps each app's own currency. Proved with unit tests and
browser tests on memory and on MariaDB, with a fake Kashier that is asked for
pounds. Migration `drizzle/0038_yallapp_prices.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 52.1 One price model for plans and add-ons (`lib/billing/prices.ts`): a `YallappPrice` in pounds with an optional dollar price; the dollar price at the team's rate rounded to whole dollars (at least $1); the shown price per country, the charge per gateway (Kashier and Fawaterk: pounds; iyzico takes no pounds, so it charges the dollar price), the "You'll be charged EGP X (about $Y); your bank may convert it." line, coupons lowering the charge and the shown price in the same proportion; "EGP 1,500" and "$29" | `yallapp-prices.test.ts` (conversion and rounding, charge per gateway, coupon math in both currencies, formats) |
| [x] | 52.2 Admin: each plan's **A price** or **On request** (the price is kept while "On request"), **Price in EGP** and **Price in USD (optional)**; Settings › Yallapp's plan payments with the gateway for plans (Kashier until set; the marketplace keeps its own provider) and **EGP for 1 US dollar**; coupons off in EGP or USD; Payments shows the pounds charged and the dollar price shown. Edits from before Phase 52 keep a pound price, turn a dollar price into the shown dollar price and drop others | `plans-limits.test.ts`, `platform-settings.test.ts`, `coupons.test.ts`, `yallapp-prices.spec.ts` |
| [x] | 52.3 The visitor's country (`lib/geo.ts`): our proxy's `X-Yallapp-Client-Country` (with its secret), Netlify's `x-nf-geo` (base64 or plain JSON) and `x-country`, Cloudflare's `cf-ipcountry`, then the browser's language region; none: dollars. A client's account country (`clients.country`, from the request at sign-up) comes first. The proxy looks the country up with `mod_maxminddb` (`deploy/apache-proxy.conf`), since Netlify only sees the proxy | `yallapp-prices.test.ts`, `analytics.test.ts`, `yallapp-prices.spec.ts` (Egypt header, another country, `Accept-Language: ar-EG`) |
| [x] | 52.4 Caching: the pages with prices are rendered per request (`private, no-store`); `/` and `/pricing` also send `Netlify-Vary` on the country headers and Egypt (`lib/geo-vary.ts`); a plain `Vary` is replaced by Next.js on app pages. Explained in ARCHITECTURE.md | `yallapp-prices.test.ts`, `yallapp-prices.spec.ts` (response headers) |
| [x] | 52.5 Public site: plan cards on the home and pricing pages, the currency line under them, the JSON-LD offers in the shown currency; FAQ "Which currency are the prices in?"; Terms §5 and the Refund policy name pounds and Kashier for Yallapp's own billing | `website-seo.test.ts`, `phase41.test.ts`, `yallapp-prices.spec.ts`, `public.spec.ts` |
| [x] | 52.6 Dashboard and payments: the plan, upgrade and renewal cards and the payment form in the client's currency with the charge line; the server works out the offer and charges Kashier in pounds; the payment keeps the dollar price shown (`plan_payments.shown_cents`, `shown_currency`); License › Payments with a receipt per payment (pounds charged, "About $30"), and `{{payment_line}}` in the activation and renewal emails | `yallapp-prices.test.ts`, `payment-providers.test.ts`, `yallapp-prices.spec.ts` (a client in the UK pays EGP 1,500, the fake Kashier receives `1500.00 EGP`, the receipt shows pounds) on memory and MariaDB |
| [x] | 52.7 iyzico kept for Yallapp's payments when the team chooses it (it charges the dollar price); the existing plan payment specs pay through iyzico in dollars, Kashier and Fawaterk in pounds | `plan-payment.spec.ts`, `several-apps.spec.ts`, `plans-limits.spec.ts`, `admin-content.spec.ts`, `egypt-payments.spec.ts` |
| [ ] | 52.8 The GeoIP module and database on the reverse proxy server; until then visitors through yallapp.com.tr get their prices from the browser's language region, else dollars | LAUNCH-CHECKLIST 7h |
| [x] | 52.9 Clients who signed up before Phase 52 have no account country, and nobody can change theirs yet (no country field in the account settings): their prices follow the request's country | Done in Phase 73 (73.9) |
| [x] | 52.10 Add-ons (Phase 51's storage packs) take a `YallappPrice` (`offerFor`, `formatMoney`) and go through `yallappPlanAccount` like plans | 51.18 |

## Phase 53: Screenshots and screen recording blocked when the owner wants, and saved lessons stay inside the app

The owner asked for a switch that keeps people from taking screenshots or
recording the screen in the app, to keep paid courses confidential, and for
saved lessons to stay inside the app. Every app type now has Screen
protection in the dashboard: off (the default), course content only
(academies: lessons, quizzes, their attachments and videos) or the whole app;
on WordPress also "as set in the plugin". Android blocks captures of
protected screens; iOS, which doesn't let apps block screenshots, does what
it allows. While protection is on, course files open only in the app's own
viewer. Saved lessons were already encrypted in the app's private storage
(Phase 45); now they're also kept out of backups and transfers, and another
app can't be handed them. The video watermark stays. No migration (the
choice is in `apps.hosted_settings`).

| | Step | Done when |
|---|---|---|
| [x] | 53.1 Contract first: `Config.app.screen_protection` (`off`, `content`, `app`; missing on older servers: `content` when `content.block_screen_capture` is true), `block_screen_capture` described as the same for apps built before it; `LicenseStatus.screen_protection` (null: the plugin's own setting) in the platform contract; the developer guide's `/config` example | `redocly lint` passes; the API reference regenerated |
| [x] | 53.2 Platform: Dashboard › Screen protection for every app type (Off, Course content only for academies, The whole app, and As set in the Yallapp plugin on WordPress; an own API sends its own), with what people see on Android and iPhone and a note that the browser preview can't protect anything; the hosted `/config` and the license status carry it, the site is asked to check its license after a save | `phase53.test.ts` (the choices per app type and backend, the hosted config and the license status against the contracts), `license-refresh.test.ts`, `courses-hosted.spec.ts` (off by default, course content, then the whole app, the app's config following) |
| [x] | 53.3 Plugin: "Block screenshots & screen recording" moved to Settings › General for every app type (off for new sites; sites that saved it keep their choice), academies choose course content or the whole app; the dashboard's choice from the license sync wins (`Content\Screen_Protection`); `/config` sends `app.screen_protection` and `block_screen_capture` for older apps; "Unreleased" in readme.txt | `ScreenProtectionTest` (122 unit tests in all), `composer lint`; `api-test.php` on Tutor LMS 301 checks (5 new: off, course content, the whole app, the dashboard's choice winning, an unknown choice ignored) |
| [x] | 53.4 App: the mode from the config; lessons and quizzes are under `ProtectedContent` and protection applies while one is anywhere in the navigation stack (course content) or always (the whole app); one call to the platform per change (`yallapp/screen_security`); over the whole app (above the navigator, so dialogs, sheets and the video's full screen too) a blank cover while protected content is recorded or mirrored, and a short notice after a screenshot of it (iOS); the lesson's player still pauses while recorded | `screen_protection_test.dart` (the config, the channel calls), `phase53_test.dart` (each mode on the right screens, a store app, an older server, the cover over a dialog, the screenshot notice) |
| [x] | 53.5 Android: `FLAG_SECURE` on the activity window while protection applies (captures come out black, the app is hidden in the recent apps; Flutter's dialogs, the video's full screen and lesson web views are in that window) | Code review; 53.11 on a phone |
| [x] | 53.6 iOS: the window drawn inside a secure text field's layer while protection applies (iOS leaves it out of screenshots and recordings where it allows it: this relies on undocumented UIKit behaviour, set up once and only when the field has the layer it needs); capture changes and screenshots reported (`yallapp/screen_capture`, `yallapp/screenshots`); the app switcher's picture blurred while protection applies | Code review; 53.11 on a phone |
| [x] | 53.7 Attachments while protection is on open only in the app's own viewer, never in another app, a share sheet, Files or a printer: PDFs drawn page by page by the phone's renderer (`yallapp/pdf`: Android's PdfRenderer from a cache file deleted as soon as it's open, iOS's PDFKit in memory), pictures and text in the app, other types say they can't be shown; saved ones decrypted in memory, others downloaded into memory (100 MB at most); without protection they open as before | `phase53_test.dart` (a PDF in the viewer with no share, save or print, a page on its own to zoom, a file it can't show, no viewer without protection), `phase45_test.dart` |
| [x] | 53.8 Saved lessons stay inside the app (Phase 45 checked: AES-256-GCM in the app's private support folder, nothing in the gallery, Downloads, Files or external storage): Android `allowBackup` off, backup and data extraction rules leave out the folder and the key, background_downloader's file provider limited to the folder of attachments opened while protection is off (it shared all of the app's storage before); iOS: the folder excluded from iCloud and computer backups, each saved lesson file given complete data protection (the index stays readable after the first unlock, so downloads that finish while the phone is locked are recorded) (`yallapp/private_files`) | `flutter test` (733), code review of the manifest and rules; 53.11 on a phone |
| [x] | 53.9 The preview bundle rebuilt (it protects nothing: the web can't) | `build_preview.sh --check` |
| [x] | 53.10 Logging screenshots for the owner (how often, on which lessons): the `screenshot` analytics event and "Screenshots taken" per lesson on the Analytics page, in 62.6 (iPhone only) | Phase 62 |
| [ ] | 53.11 Not tried on real phones: that Android screen recordings and screenshots of a lesson, its video full screen and a dialog come out black and the recent apps hide it; that iOS covers a lesson while recording or mirroring, leaves it out of screenshots (the secure layer: check every supported iOS version, and that touches, the keyboard and rotation still work), shows the notice and blurs the app switcher; the PDF viewer on both; that a backup (Google, iCloud, a computer) and a move to a new phone leave saved lessons out | A device test with a protected course |
| [ ] | 53.12 What can't be blocked: a photo or video of the screen taken with another device; on iOS a screenshot where the secure layer stops working with an iOS update (the notice still shows). Android's screenshot detection (Android 14) isn't used since `FLAG_SECURE` blocks them | Known limits, said on the dashboard page |

## Phase 54: The website knows who is signed in, Home in the menus, WhatsApp's mark, a new comparison, and the email in the footer

The owner asked for four touches on yallapp.com.tr: people who are signed in
still saw "Sign in" and "Get started"; the WhatsApp buttons showed a chat
bubble instead of WhatsApp's mark; the "A typical app builder, and Yallapp"
table needed a better look; the footer's Contact column showed the
website instead of the email; and the menus had no Home link. No migration, no contract change.

| | Step | Done when |
|---|---|---|
| [x] | 54.1 Signed in on this browser, the header shows one **Dashboard** button (phones: "Go to your dashboard") instead of Sign in and Get started; the footer's Account column shows "Your dashboard"; the closing band's "Create an account" becomes "Go to your dashboard"; the plan cards' "Start with …" become "Choose …" and open License › Change plan. The public pages are the same for everyone, so a readable `yallapp_signed_in` cookie (no identity, grants nothing) is set and cleared with the HttpOnly session cookie and read in the browser (`components/account-link.tsx`) | e2e `starter-flow.spec.ts` (signed in, signed out, the session cookie still HttpOnly) |
| [x] | 54.2 WhatsApp's mark (simple-icons, unaltered, in the button's color) on every button and link that opens a WhatsApp chat with Yallapp: the hero, the closing band, the footer, Contact, Docs and the pending page. `docs/BRAND.md` › Third-party brand marks allows it there | Screenshots |
| [x] | 54.3 The comparison redrawn: the topics with their icons, a quiet column for a typical builder and a raised dark Yallapp column running the whole height; on phones a card per topic with the two answers one under the other; the same in dark mode. The languages row says any language the owner adds (Phase 43) | `public.spec.ts` (the table), screenshots at 1280 and 390 px and in dark mode |
| [x] | 54.4 The footer's Contact column: the WhatsApp number and the email (Admin › Settings › Contact, `info@yallapp.com.tr` by default) instead of the website's address | Screenshot |
| [x] | 54.5 **Home** is the first entry of the main menu (marked on the home page) and of the footer's Product list | `website-seo.test.ts`, `public.spec.ts` |
| [x] | 54.6 A session that ended on the server (signed out on another device, a password change) leaves the readable cookie until it expires: the header says Dashboard and the dashboard asks to sign in again. Cleared by the dashboard's way to the sign-in page and by the sign-in page in 62.4 | Phase 62 |

## Phase 55: yallapp.com.tr in Arabic and Turkish, with English staying the default

The owner asked for the whole system in Arabic and Turkish, with English as
the main language: Arabic at yallapp.com.tr/ar, Turkish at yallapp.com.tr/tr,
set up for search engines, and a button to change the language. This phase is
the website and the shared language foundation (`docs/ARCHITECTURE.md` › The
website in Arabic and Turkish); Phase 56 puts the client dashboard on it. The
admin stays in English. No migration, no contract change.

| | Step | Done when |
|---|---|---|
| [x] | 55.1 English addresses unchanged; every public page also at `/ar/…` and `/tr/…` (home, solutions, features, integrations, how it works, pricing, demo, contact, FAQ, docs and every article, developers, terms, privacy, refund, sign-in, sign-up, forgot and reset password, page not found) through a `[lang]` segment and shared page modules (`src/site`), no proxy or rewrite. Each page keeps its static or dynamic rendering; dashboard, admin, API and the app-facing pages have no prefix; `/ar/xyz` is "page not found" in Arabic, `/xyz` in English | `next build` (the `/ar` and `/tr` pages made ahead of time), `site-i18n.test.ts`, `site-languages.spec.ts` |
| [x] | 55.2 The foundation (`src/i18n`): typed catalogs per language with English as the source, ICU messages and rich-text tags, `messagesFor`/`getT`/`formatMessage` on server and client, number, date and list formats per language (Arabic with Latin digits; prices written the same in every language), `<html lang dir>` from the route, the `yallapp_lang` cookie, no redirect by the browser's languages | `site-i18n.test.ts` (missing keys, wrong placeholders and tags fail) |
| [x] | 55.3 The language switcher, "English · العربية · Türkçe", in the header (a menu on wide screens, a row in the phone menu), the footer and the sign-in pages: same page, `lang` and `hreflang` on each link, the Material Symbols "language" icon, keyboard and Escape, the choice kept in `yallapp_lang`; signing in or up from an Arabic or Turkish page keeps it too and still lands on the dashboard | `site-languages.spec.ts` (/pricing ↔ /ar/pricing ↔ /tr/pricing, sign-up and sign-in from /ar) |
| [x] | 55.4 Search engines: a title, description and canonical per language, `hreflang` alternates (en, ar, tr, x-default) on every page, `og:locale` with its alternates, JSON-LD `inLanguage`, the sitemap with the three versions and their alternates, sign-in pages `noindex`, `robots.txt` unchanged; share images per language, the Arabic ones in IBM Plex Sans Arabic | `site-i18n.test.ts`, `site-languages.spec.ts` (hreflang, canonical, sitemap) |
| [x] | 55.5 Right to left: logical spacing and positions, mirrored arrows and chevrons, the Works-with strip and the step timeline running the other way, phone and browser frames not mirrored, the comparison table and the plan cards in order; code, addresses, phone numbers and the API reference left to right. IBM Plex Sans Arabic for Arabic (`docs/BRAND.md` › Type); Turkish letters checked in Bricolage Grotesque | Screenshots at 1280 and 390 px |
| [x] | 55.6 Every visible text in natural Arabic and Turkish: menus, sections, plans and the pricing table (prices still from Phase 52), the comparison, FAQ, Works-with, footer, forms and their messages, page titles, all 51 documentation articles and the developer guide (code examples as they are, headings keeping their English anchors), and the legal pages with a line that the English version prevails. The privacy policy names the language cookie | `site-i18n.test.ts` (every article and legal page has the same sections, links and contact placeholders as English) |
| [x] | 55.7 Admin › Website content in English, Arabic and Turkish tabs: the built-in translations as defaults, each field editable per language, empty fields falling back; stored as `<key>@ar` and `<key>@tr` in `site_content` | `site-i18n.test.ts`, `site-languages.spec.ts` (the Turkish home title edited and reset) |
| [x] | 55.8 `CONTRIBUTING.md`: English is the default; the website and the client dashboard are in English, Arabic and Turkish, every new string in all three; the admin stays English; client apps keep their own languages | Review |
| [x] | 55.9 The client dashboard in Arabic and Turkish | Phase 56 |
| [x] | 55.10 Plan texts edited in Admin › Plans, and English texts the team edits after this phase, aren't translated by themselves: the translated pages show the team's edit (plans) or keep the built-in translation until the team edits that language. Plans have Arabic and Turkish fields in Admin › Plans since 62.2; the other texts in Admin › Website content as before | Phase 62 |
| [x] | 55.11 The Arabic share images use a simple letter shaper (joined letters, right-to-left words, no diacritics); a phrase with marks or mixed scripts may look plain. Replaced by shaping by joining types with marks and the bidirectional algorithm in 62.3 | Phase 62 |
| [ ] | 55.12 Checked in Chrome at 1280 and 390 px; not yet on real iPhones and Android phones, or by a native Arabic and Turkish reader | Before announcing the new languages |

## Phase 56: The client dashboard in Arabic and Turkish

The owner asked for the whole system in Arabic and Turkish, with English as
the main language. After the website (Phase 55), this phase puts the client
dashboard on the same foundation: every page after sign-in, `/pending`, the
shared components, the messages of the dashboard's forms, the bell, and
Yallapp's emails to clients. The admin stays in English. Owner content (their
products, articles, events) and the phone preview stay as written. Proved
with unit tests and a browser test on memory and on MariaDB. Migration
`drizzle/0042_dashboard_languages.sql` (`users.language`). No contract change.

| | Step | Done when |
|---|---|---|
| [x] | 56.1 Every client-facing screen after sign-in in English, Arabic and Turkish: `app/dashboard/**`, `/pending` and the shared components, through typed catalogs per area (`src/i18n/dashboard`, English as the source). Messages from server actions and shared code are English sentences translated where they are shown (`known` texts, by exact match or `{placeholder}` pattern), so actions stay language-free; page titles, dates, numbers and lists follow the language with Latin digits | `dashboard-i18n.test.ts` (every key in all three, same placeholders, plurals and tags; no English text written into a dashboard page or component) |
| [x] | 56.2 The language choice, "English · العربية · Türkçe" with the Material Symbols "language" icon, in the sidebar's account area (and the phone's Menu sheet). Saved on the person (`users.language`) and in `yallapp_lang`; signing in from `/ar` or `/tr` sets it when they had none; our team member managing a client's dashboard sees and changes their own language, not the client's. The person's choice wins over the cookie, the cookie over English | `dashboard-i18n.test.ts` (preference order), `dashboard-languages.spec.ts` (after signing out and in, in another browser, team member vs client) |
| [x] | 56.3 Right to left in Arabic: the sidebar on the right, logical spacing and alignment, mirrored arrows and chevrons, tables and charts readable (numbers and charts left to right), the page editor's drag and drop usable; the phone preview and phone frames not mirrored | `dashboard-languages.spec.ts` (`dir="rtl"`, the sidebar on the right), review |
| [x] | 56.4 Emails to clients (password, activation and renewal, builds, publishing, plan and storage reminders, app users, the app's own WhatsApp number or email server failing, new orders, appointments and messages) in the client's language: Arabic and Turkish defaults with the same placeholders (`lib/email/templates-lang.ts`), the lines that go into them in that language, dates written in it, Arabic right to left. A template the team edited in Admin › Emails is one English text for every language (the admin page says so). Emails to the team and to the people using a client's app are unchanged | `email-languages.test.ts`, `dashboard-languages.spec.ts` (the password email in Arabic) |
| [x] | 56.5 The bell (Phase 57) in the person's language, with the announcements' Arabic and Turkish texts when the team wrote them | `dashboard-i18n.test.ts`, review |
| [x] | 56.6 Modern Standard Arabic and natural Turkish with one glossary; brand, store and platform names in Latin letters; no sentence built from pieces; links inside sentences as tags | `dashboard-i18n.test.ts`, review |
| [x] | 56.7 Plain internal links in the dashboard and `/pending` use `next/link`; the `@next/next/no-html-link-for-pages` lint rule is on again | `eslint` |
| [x] | 56.8 Unit, MySQL and browser tests; `dashboard-languages.spec.ts` on memory and MariaDB; the full suites | `vitest`, `tsc`, `eslint`, `next build`, `playwright` |
| [x] | 56.9 Left in English: the Languages page's descriptions of the app's interface strings, ICU syntax errors in the page editor, the analytics CSV's column names, store review notes and default release notes (store content), and some low-level messages from payment providers and email servers. Translated in 62.1 (notes for reviewers and Xiaomi's default release notes stay English, for the stores) | Phase 62 |
| [ ] | 56.10 Checked with tests and in Chrome; not yet by a native Arabic and Turkish reader or on real phones | Before announcing the new languages |

## Phase 57: A notifications bell in the dashboard for what Yallapp sends

The owner asked for a notifications button in the client dashboard for what
comes from our system: updates, announcements and the like. The dashboard
now has a bell, "Notifications from Yallapp", next to the logo (and in the
phone's top bar) with the unread count. It holds the team's announcements,
which now have a kind (Update, Announcement, Maintenance, Offer) and can be
in the bell only or also on the overview's banner, and the account's own
news ("Your account"): notices about the plan, users, storage and the site,
finished or failed builds and payments received. Each person who opens a
dashboard has their own read state. The Announcements page became the full
list, "Updates from Yallapp", at the same address. Proved with unit tests
and a browser test on memory and on MariaDB. Migration
`drizzle/0041_dashboard_bell.sql`. No contract change.

| | Step | Done when |
|---|---|---|
| [x] | 57.1 The bell next to the logo on desktop and next to Menu on phones: Material Symbols "notifications", a badge with the unread count (9+ above 9) in Ember with Midnight text, named "Notifications from Yallapp, 3 unread". It opens a panel (a popover from md up, a full-width sheet on phones) with the newest 8: the kind's chip (Update, Announcement, Maintenance, Offer, Your account), the title, a line of text, the date, the link; new ones marked; "Mark all as read"; "See all". Escape, a click outside or Close shut it and focus goes back to the bell; focus starts on its heading | `dashboard-bell.spec.ts`, screenshots |
| [x] | 57.2 Read state per person, not per client (`update_reads`: user, item, first read time): opening the panel marks what it shows read (they stay marked new until it closes), "Mark all as read" marks everything listed, the full list marks its items once shown; our team member managing a dashboard reads for themselves. Closing a banner stays separate and per client. Item keys are checked before they're stored; an announcement's reads go with it | `updates.test.ts` (per user, first time kept, bad keys ignored, owner vs team member), `updates-mysql.test.ts`, `dashboard-bell.spec.ts` |
| [x] | 57.3 "Your account" items, from data the dashboard already had: owner notices still true (plan ending, app users near the limit, storage over after a pack ended, the site ready, the app's API failing, a ticket refund due; 60 days, also the ones closed on the overview), builds that finished or failed (14 days, 3 per app; opened through `/dashboard/open?to=builds` on the right app), payments received (30 days, with the receipt); the app's name when the account has several | `updates.test.ts` |
| [x] | 57.4 Admin › Announcements: **Kind** (Update, Announcement, Maintenance, Offer; Announcement by default) and **Where it shows** ("Show as a banner too", the default and how older ones work, or "Bell only"); the old Information/Warning choice is now **Style**; optional **Arabic and Turkish** title and message (both or neither); `announcementText(announcement, lang)` falls back to English and is ready for the user's language (Phase 56); the list shows the kind and "bell only" | `announcements.test.ts` (the form, the fallback, banner vs bell), `updates-mysql.test.ts` (older rows read as Announcement on the banner), `dashboard-bell.spec.ts`, `admin-content.spec.ts` |
| [x] | 57.5 Dashboard › Announcements is the full list, "Updates from Yallapp" (same address, renamed in the menu): every announcement for the account, live or ended, also the ones closed on the overview, and the account items, newest first, with "New" on unread ones. The banner shows only announcements marked as a banner; its link reads "All updates from Yallapp". The help page's Announcements section explains the bell | `dashboard-bell.spec.ts`, `admin-content.spec.ts` |
| [x] | 57.6 Counted by the layout on each load of the dashboard (no websockets, no polling); when the window comes back after a minute or more the bell asks again | Code review |
| [x] | 57.7 Unit, MySQL and browser tests; the bell and announcement specs on memory and MariaDB; the full suites | `vitest`, `tsc`, `eslint`, `next build`, `playwright` |
| [x] | 57.8 Clients have one sign-in today (no team members of their own yet), so "per person" is the owner and our team members managing the dashboard; members, when they come, get their own read state with no change | Phase 60: each team member reads for themselves |
| [ ] | 57.9 Email clients when a Maintenance announcement is published (today the team ticks "Also email it to these clients now") | Owner's decision |
| [x] | 57.10 The dashboard shows announcements in English until Phase 56 passes the user's language to `announcementText`; the emails stay English | Phase 56: the bell and the banner use the person's language; announcement emails stay as the team wrote them |
| [ ] | 57.11 The bell counts only on a page load, a focus after a minute, or what the person does; a build that finishes while the dashboard stays open shows on the next load | Acceptable |

## Phase 58: The Owner API for Yallapp Business, Yallapp's app for app owners

The server side of "Yallapp Business", the phone app for the people who run an
app on Yallapp (the app is Phase 59, built against this contract). Owners sign
in with the dashboard's email and password and work on the same database
through the same code as the dashboard: today's numbers, what needs them, the
updates from Yallapp, orders and the kitchen, refunds, appointments, events
and the door, donations, quick edits to products, courses, articles and
listings, Media uploads, messages, app users, Analytics, notifications to the
app's users, the preview, builds and the plan. No payments of any kind: the
plan and storage are read-only with a link to the website. Pushes reach the
owner's phone from Yallapp Business's own Firebase project at the moments the
dashboard learns of things. Proved with unit tests, a MariaDB store test and
an end-to-end spec on memory and MariaDB. Migration
`drizzle/0043_yallapp_business.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 58.1 Contract first: `docs/api/owner.yaml` (OpenAPI 3.1, server `https://yallapp.com.tr/api/owner/v1`; tags Auth, Account, Updates, Today, Orders, Appointments, Events, Donations, Catalog, Media, Messages, App users, Analytics, Notifications, Publishing, License), linted with the other contracts in `CONTRIBUTING.md`, the README and CI; not on the public developer pages | `redocly lint` of the four contracts; `owner-api.test.ts` checks every answer against it |
| [x] | 58.2 Sign-in with the dashboard's account: the website's limits (the same counters) and password check; Yallapp's team and accounts without a client get `use_website`; pending and suspended accounts see their state only (403 elsewhere); a device per sign-in (at most 10) in `owner_devices`; a signed 15-minute access token read against the device on every request; a 60-day refresh token kept as its SHA-256 and replaced on each use (of two renewals at once one wins); sign-out, sign-out everywhere, a password change signs every device out; the website's password reset linked in the request's language | `owner-api.test.ts` (tokens, rotation, the 60 days, 10 devices, team refused, pending), `owner-mysql.test.ts` on MariaDB |
| [x] | 58.3 Dashboard › Your phones (Account): each phone signed in to Yallapp Business with when it signed in and was last used and whether notifications are on, Sign out per phone and Sign out every phone (audited when our team does it); English, Arabic and Turkish | `owner-api.spec.ts`, `dashboard-i18n.test.ts` |
| [x] | 58.4 Scope: every `/apps/{app_id}` path only for the client's own apps (another client's ID is 404 on every path of the contract); what an app has follows its type and content source as the dashboard's pages and actions test it (`lib/app/areas.ts`, `AppSummary.features`), else 404 `not_available` | `owner-api.test.ts` (every app path with another client's app; a restaurant without appointments) |
| [x] | 58.5 The dashboard's rules in `lib`, called by the dashboard's server actions and the Owner API alike: order steps and the kitchen's with the payout release, appointment steps, an app notification with its limit, saving a lesson, a product's price/sale price/stock, article and listing status, the office's reply, starting a Media upload | `vitest run`; the dashboard's specs (catalog, restaurant, courses, listings, news, media, refunds, bookings) unchanged and passing |
| [x] | 58.6 Me, the language (the dashboard's own choice), the bell's updates with the same read state; today per app in the app's time zone: sales and donations less refunds per currency, orders, appointments, tickets, check-ins, donations, new users, app opens, and what needs the owner (orders in progress, appointments to confirm, unanswered messages, open notices) | `owner-api.test.ts`, `owner-api.spec.ts` |
| [x] | 58.7 Orders (list by status with pages, detail with refunds, status changes as the dashboard and the Kitchen, refunds with roadmap 47's rules), appointments (today, upcoming, past; confirm, decline, cancel, done, no-show), events with ticket counts and the door's check-in (signed codes, once, "already used" with the time, another event's ticket refused), donations with the campaigns' totals | `owner-api.test.ts`, `owner-api.spec.ts` (a shop's paid order completed, a free ticket checked in once) |
| [x] | 58.8 Quick edits: products and menu items (price, sale price, stock, available or sold out), courses (publish or hide, add a lesson with a video from Media or an https address), articles (publish, unpublish, feature), listings (publish, draft, archive, feature); Media (list with the storage meter, chunked uploads straight to the media gate, resume, complete, delete); a listing's inquiries (list, read, reply: in the person's inbox and on their phone); the app's users (search, count); Analytics for a range; notifications to everyone (the dashboard's rules and limit); the preview link; builds with 15-minute download links and the publishing status; the plan and storage read-only with `manage_url` | `owner-api.test.ts`, `owner-api.spec.ts` (a lesson added and in the app, a notification in the customer's inbox) |
| [x] | 58.9 Pushes to the owner's phone from Yallapp Business's own Firebase project (`OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT`, optional Huawei Push Kit): a paid order, an appointment booked, a listing message, a donation or a payment to Yallapp, a build finished, a live announcement, an owner notice; per device and kind (`PUT /me/push-preferences`), in the person's language else the phone's; refused tokens forgotten; never failing what caused it; `YALLAPP_OWNER_PUSH_DIR` keeps them in local runs | `owner-push.test.ts` (languages, choices, signed-out devices, a refund-due notice pushed once), `owner-api.spec.ts` (the paid order's push) |
| [x] | 58.10 Docs: `docs/ARCHITECTURE.md` › The Owner API, `docs/LAUNCH-CHECKLIST.md` 7k (the Firebase project, the env vars, migration 0043), `.env.example` | Review |
| [x] | 58.11 Course questions and reviews: done in Phase 63 (63.2 to 63.4) | Phase 63 |
| [x] | 58.12 Moving an appointment, scheduling a notification for later and pushing an announcement when it starts: done in Phase 61 (61.2 to 61.5) | Phase 61 |
| [x] | 58.12b Checking gym members in at the door: done in Phase 63 (63.5 to 63.7) | Phase 63 |
| [x] | 58.13 Today's numbers counted by the database for the whole day: done in Phase 61 (61.6) | Phase 61 |
| [ ] | 58.14 Not tried with a real Firebase project and phone: the pushes went to a fake sender and the capture folder. A plan paid entirely with a coupon (no provider) sends no "Payment received" push | LAUNCH-CHECKLIST 7k, with Phase 59 |
| [ ] | 58.15 WordPress, own-API and connected-platform apps: their orders, bookings and content live on their own sites, as on the dashboard, so the app shows what Yallapp keeps for them (today's opens, notices, builds, Media, Analytics, the plan) | When owners ask |

## Phase 59: Yallapp Business, the app for the people who run an app on Yallapp

Yallapp's own Flutter app for its clients, in `business/` (package
`yallapp_business`, `tr.com.yallapp.business` on Android and iOS), built
against the Owner API of Phase 58. Owners sign in with their dashboard's email
and password and see today's numbers and what needs them, move orders on (with
a Kitchen mode for restaurants), confirm appointments, let people in at the
door with the ticket scanner, follow donations, make quick edits to their
catalog, upload pictures and videos to Media from the phone, answer messages,
look up their app's users, read their stats, send a notification to everyone
who uses their app, try the app, and follow builds and publishing. Each screen
shows only when the app has it. No payments of any kind on any platform: the
plan and storage are read-only with "Manage on yallapp.com.tr". English by
default, Arabic (right to left) and Turkish, following the account's
dashboard language. Proved with widget tests of every screen group on an
in-memory fake API (English, Arabic and Turkish), unit tests of the API
client, `flutter analyze` and `dart format`; the Mobile workflow checks it.

| | Step | Done when |
|---|---|---|
| [x] | 59.1 The project: a separate Flutter app with Android and iOS (iOS 15, Flutter's Android minimum, as `mobile/`), the Yallapp icon from `brand/stores`, Bricolage Grotesque and IBM Plex Sans Arabic bundled, permissions for the camera, microphone, photos, notifications and Face ID; dependencies pinned to releases at least two weeks old; no signing keys or Firebase files committed | `flutter analyze`, review |
| [x] | 59.2 The API client from `owner.yaml`: typed models, `{code, message}` errors with field errors and `Retry-After`, `Accept-Language`, tokens in secure storage, renewing before expiry and once for any number of 401s, the newest refresh token kept, signed out when it's refused; the media gate's chunk transport; the base URL and Firebase options at build time; an in-memory fake API for tests and the demo (`YB_DEMO`) | `test/unit/api_client_test.dart`, `models_test.dart` |
| [x] | 59.3 Sign in (show/hide, forgot password opens the website's reset page in the app's language), `use_website` for staff-only accounts with a link to the website, the fingerprint or face lock after the first sign-in (Settings turns it off; asked again after 5 minutes away), pending, suspended, no-app and offline states, the app switcher | `auth_test.dart` |
| [x] | 59.4 Today: greeting, the app switcher, KPI tiles (sales, orders, appointments, tickets, check-ins, donations, new users, app opens, as the app has them), Needs you now, quick actions (Kitchen, Notify, Scan, Upload, Preview), the bell with Updates from Yallapp (read state shared with the dashboard, "Mark all as read", announcements' Markdown as text) | `today_test.dart` (also Arabic, Turkish, offline, large text) |
| [x] | 59.5 Orders by status with Accept/Decline and the kitchen's steps, the order (customer, address, items, payment, refunds) and refunds as `OrderDetail.refund` allows (provider or recorded, what to take back); Kitchen mode: big cards by step, a chime and a haptic for a new order while open, checked every 15 seconds and on each `new_order` push, columns on a tablet | `orders_test.dart` |
| [x] | 59.6 Appointments today, upcoming and past with confirm, decline, cancel, done and no-show; events with their ticket counts; the dark door scanner (camera QR, typed codes, let in once, "already used" with when, another event's ticket, flashlight, counts) | `bookings_events_test.dart` |
| [x] | 59.7 Donations with the campaigns' totals and a filter; catalog quick edits (products and the menu: price, sale price, stock, available or sold out; courses: publish, add a lesson with a video from Media or recorded or picked now and uploaded; articles and listings: publish, unpublish, archive, feature) | `bookings_events_test.dart`, `catalog_media_test.dart` |
| [x] | 59.8 Media: the storage meter read-only, files by kind, uploads from the camera or the gallery in the gate's chunks with progress, pause, resume (also after the app was closed, from the remembered file) and delete; held back while the plan isn't active | `catalog_media_test.dart` |
| [x] | 59.9 Inbox (a listing's conversations, read and reply), app users with search, Stats for 7, 30, 90 days or chosen dates (KPIs against the period before, a daily chart read aloud, retention, platforms, countries, screens), sending a notification to everyone with a phone-style preview, a confirmation and the hourly limit | `messages_people_test.dart` |
| [x] | 59.10 Preview the app in an in-app web view (draft pages for hosted apps), builds and store statuses read-only with signed downloads, More: the app's other tools, plan & storage read-only, language (saved to the account), notifications per kind, the biometric lock, signed-in devices (sign one or all out), help (WhatsApp, email, the dashboard, guides), legal links in the app's language, the version | `publishing_more_test.dart` |
| [x] | 59.11 Pushes from Yallapp Business's own Firebase project when its options are given at build time: the token registered after sign-in and on each refresh, a tapped push opens its screen on its app (after the lock if needed), a push while open shows with "Open" | `push_test.dart` |
| [x] | 59.12 English, Arabic and Turkish for every string (`tool/strings_*.py` → `lib/l10n/app_*.arb`, checked for missing keys), the website's and dashboard's words; right to left with mirrored arrows; 48 px targets, labels on icons, charts and progress read aloud, large text stacks the tiles | `auth_test.dart`, `today_test.dart`, `orders_test.dart`, `bookings_events_test.dart`, `publishing_more_test.dart` |
| [x] | 59.13 Contract sync with Phase 58's final `owner.yaml` (updates' `summary`, `link_label`, `app_name`; order numbers without `#`), and its Media text corrected to `PUT`, the method the media gate takes | `redocly lint`, `api_client_test.dart` |
| [x] | 59.14 CI: the Mobile workflow's "Yallapp Business" job when `business/` changes (strings generated, format, analyze, test); docs: `business/README.md`, `docs/ARCHITECTURE.md` › Yallapp Business, the app, `docs/LAUNCH-CHECKLIST.md` 7l | Review |
| [x] | 59.15 The dark theme: done in Phase 61 (61.1) | Phase 61 |
| [ ] | 59.16 Not tried on a real phone, with the real Firebase project or against the live Owner API: no APK or IPA was built here (disk), the tests run on the fake API. Push on Huawei phones without Google Play (the server can send through Push Kit) isn't wired in the app | LAUNCH-CHECKLIST 7l |
| [x] | 59.17 Course questions and reviews in the Inbox, and gym members at the door: done in Phase 63 (63.8) | Phase 63 |
| [x] | 59.18 Kitchen mode keeps the screen awake: done in Phase 61 (61.7) | Phase 61 |
| [~] | 59.19 The store listings, screenshots and the App Store id: ready in Phase 65; published under Yallapp's own accounts once they exist | Phase 65, LAUNCH-CHECKLIST 7l |

## Phase 60: Team members for clients

The owner asked for the people who work with a business owner to have their
own sign-in with limited access, in the dashboard, the Owner API and
Yallapp Business. An owner invites someone by email (a link to join, once,
for 7 days, in the invitee's or the owner's language; someone who already
uses Yallapp joins with their own password) as a **Manager** (everything but
License and payments, the team, adding or deleting apps and an app's type or
content source) or **Staff** with the areas the owner ticks (Orders &
kitchen, Bookings & appointments, Events & check-in, Donations, Catalog &
content, Media, Messages, App users, Analytics, Notifications to app users),
on all the business's apps or some. One permission helper
(`lib/team/permissions.ts`) decides for every dashboard page, server action,
download, the sidebar, the Owner API's routes and the pushes to phones.
Removing someone signs them out everywhere at once. Who did what (order
steps, refunds, appointments, notifications sent, the team's changes) is on
the Team page. Proved with unit tests of the helper and of every guarded
action group, the Owner API and the store on MariaDB, a browser test on
memory and MariaDB, and the app's widget tests. Migration
`drizzle/0045_team_members.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 60.1 Data: `team_members` (client, user, role, areas, apps), `team_invitations` (the token's SHA-256, 7 days, accepted or cancelled once, language), `team_activity`; memory and MySQL stores; one migration, `drizzle-kit generate --name ci-check` clean | `team-mysql.test.ts` (two acceptances at once: one wins), `team-service.test.ts` |
| [x] | 60.2 The permission helper: roles, areas, owner-only (`billing`, `team`, `apps`), `settings` for owners and managers, apps per member; every dashboard page's address mapped (`DASHBOARD_PATHS`), every app area and push kind | `team-permissions.test.ts` (each role, each boundary, every page under `/dashboard` calls `requireClient` with its address's permission) |
| [x] | 60.3 Every client server action asks `clientFor(permission)` first: products, orders, refunds, appointments, events, donations, catalog content, media (the picker for catalog and pages too), messages, notifications (also sent later), the app's settings, payment keys and plans (owner only), the type and website (owner only); the download routes and the partner OAuth callback too | `team-actions.test.ts` (every exported action of 26 files with its group's permission) |
| [x] | 60.4 The client context: the signed-in person's access and businesses (their own first, then the teams they joined; the chosen one in `yallapp_business`, else the first active); a member limited to some apps sees only those; the bell and the overview show notices (only of the person's apps, closed only there too) and builds to owners and managers, payments to the owner | `team-service.test.ts`, `updates-mysql.test.ts`, `team-notices.test.ts` |
| [x] | 60.5 Dashboard › Team (owner only): invite (name, email, role, areas, apps; at most 20 an hour per business and 5 a day per address), invitations waiting (send again with a new link, cancel), change access (applies at once), remove (signed out at once: the session version goes up, the business's phones are signed out), the activity; the join page in the invitation's language; the join link goes only to the invited address (never shown to the owner), and joining never sets a password on an account that exists (one without a password sets it with "Forgot your password?" first) nor makes an account for Yallapp's own team (checked before any account is made, also at the invitation); the business switcher and chooser (also on the waiting page) | `team-members.spec.ts`, `team-join.test.ts` |
| [x] | 60.6 The sidebar only shows what the person may open; a page they may not open goes to the overview with "Your role here doesn't include that page"; Staff get their own overview with links to their areas; the plan's buttons, card payments, storage packs and the Website step say "Only the owner of this business can do this" | `team-members.spec.ts` (Staff with Orders: no License, Team, Analytics, Products; denied addresses) |
| [x] | 60.7 The Owner API, contract first (`owner.yaml`): `Me.business`, `Me.businesses`, `AppSummary.access`, `features` masked by the role, `PUT /me/business`, the Team paths for the owner, 403 `not_allowed` on every path the role doesn't allow, 404 outside the member's apps; a device only while its person still works on its business | `owner-team.test.ts`, `owner-api.test.ts`, `team-members.spec.ts` |
| [x] | 60.8 Pushes to the phones signed in to a business, of the owner and of members with the push's area on its app (a paid order to Orders, a donation to Donations, a payment to Yallapp to the owner, builds and notices to owners and managers, Yallapp's updates to everyone) | `owner-team.test.ts` |
| [x] | 60.9 Activity: order steps, refunds, appointment steps and notifications sent, from the dashboard and the Owner API, and the team's own changes; one English line each, shown in the person's language | `team-service.test.ts` (every line in Arabic and Turkish) |
| [x] | 60.10 Yallapp Business: screens and actions only as the role allows, "Ask the owner" for the plan and for `not_allowed`, switching business, the owner's Team screen (invite, invitations, change access, remove), English, Arabic and Turkish (`tool/strings_e.py`) | `team_test.dart`, `models_test.dart` |
| [x] | 60.11 Admin › the client's page lists the client's team and invitations, read-only, in English | `team-members.spec.ts` |
| [x] | 60.12 Every new dashboard string in English, Arabic and Turkish (`src/i18n/dashboard/team.ts`), the `team_invitation` email in the three; docs: ARCHITECTURE (team members), LAUNCH-CHECKLIST 7m (migration 0045) | `dashboard-i18n.test.ts`, `email-languages.test.ts` |
| [x] | 60.13 There is no "delete an app" in the dashboard yet; when it comes it is owner-only (`apps`) | Done in Phase 73 (73.5, 73.6) |
| [x] | 60.14 Someone on several businesses gets the pushes of all of them on every phone: done in Phase 64 (64.6) | Phase 64 |
| [ ] | 60.15 Removing someone ends all of their sessions, also those of their own business or other teams (one session version per person); they sign in again there | Acceptable |
| [x] | 60.16 The Team page's activity in pages, by person: done in Phase 64 (64.7) | Phase 64 |

## Phase 61: Yallapp Business's open items, and the dashboard features they wait on

The open rows of Phases 58 and 59 that don't need the stores or the push
projects (those come later, with the owner). Yallapp Business gets a dark
theme and keeps the kitchen's screen on; owners move an appointment to
another free time and send a notification to their app's users later, from
the dashboard, the Owner API and the app through the same `lib` code;
announcements set to start later reach the owners' phones when they start;
Today's numbers are counted by the database. A frequent job (every 5
minutes, the daily job's pattern) sends what is due, once. Contract first in
`docs/api/owner.yaml`. Proved with unit tests on memory and MariaDB, the
dashboard's e2e specs on memory and MariaDB, and the app's widget tests (also
in dark and Arabic). Migration `drizzle/0044_scheduled_notifications.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 61.1 Yallapp Business in dark: `YbColors` light and dark from the palette (Midnight pages, lifted cards, Ivory text, Ember accents), every screen on `context.yb`, the door scanner dark in both; Settings › Appearance (the phone's setting, light, dark), kept on the phone | `theme_test.dart` (contrast of every text pair at 4.5:1 in both), `phase61_test.dart` (follows the phone, Appearance, screens in dark in English and Arabic without overflow) |
| [x] | 61.2 Moving an appointment (`lib/bookings/reschedule.ts`): pending or approved and not started, to a time booking would offer for its service (staff hours, days off, other appointments and classes, notice, how far ahead), its own time free; one atomic move (`moveBookingAppointment`); the status stays; the customer told in the app's inbox and by push in the app's language (en, ar, tr) | `phase61.test.ts`, `phase61-mysql.test.ts` (two moves to one time: one wins) |
| [x] | 61.3 Dashboard › Appointments › Change time (a week of times, the staff filter, back with "The appointment is at its new time"); the Owner API `GET …/appointments/{id}/times`, `POST …/reschedule`, `can_reschedule`; the app's Change time | `bookings-hosted.spec.ts` (moved; the customer's inbox and the app's appointment), `phase61.test.ts`, `phase61_test.dart` |
| [x] | 61.4 Notifications sent later (`lib/hosted/scheduled-notifications.ts`, `scheduled_notifications`): a date and time in the app's time zone, later than now, within 90 days, at most 50 waiting; change and cancel while waiting; Dashboard › App notifications › Later and Scheduled; the Owner API `…/notifications/scheduled`; the app's Later with Edit and Cancel | `phase61.test.ts`, `hosted-api.spec.ts` (scheduled, changed, cancelled), `phase61_test.dart` |
| [x] | 61.5 The frequent job: `netlify/functions/frequent-jobs.mts` every 5 minutes → `POST /api/internal/frequent` (`INTERNAL_JOB_SECRET`): due notifications through `sendAppNotification` (same words and hourly limit; a full hour waits), each taken once by a conditional update, one left halfway failed and never resent; announcements that started pushed to the owners' phones once (`claimAnnouncementPush`; created live: marked at once; started over a day ago: marked, not pushed) | `phase61.test.ts` (two runs at once send once; the limit; a stuck one; two announcement runs push once), `phase61-mysql.test.ts`, `hosted-api.spec.ts` (401 without the token) |
| [x] | 61.6 Today's numbers counted by the database for the app's whole day: paid orders and donations less refunds per currency, new users, tickets and check-ins (`sumPaidCatalogOrders`, `sumPaidDonations`, `countHostedUsersCreated`, `countTicketsInWindow` in SQL with indexes; the same in memory) | `phase61.test.ts` (230 orders, 205 users), `phase61-mysql.test.ts` |
| [x] | 61.7 Kitchen mode keeps the screen awake while open (`wakelock_plus` 1.8.1, `KitchenWake`: again on return from the background, released on leaving; a phone that refuses still runs it) | `kitchen_wake_test.dart`, `phase61_test.dart` |
| [x] | 61.8 Every new string in English, Arabic and Turkish: the dashboard's catalogs (`bookings`, `notify`, `owner`) and the app's `tool/strings_d.py`; docs: ARCHITECTURE (the Owner API, the app), LAUNCH-CHECKLIST (the frequent job, migration 0044), `business/README.md` | `dashboard-i18n.test.ts`, `build_arb.py` |
| [x] | 61.9 Checking gym members in at the door: done in Phase 63 (63.5 to 63.7) | Phase 63 |
| [ ] | 61.10 Not tried with the real Firebase projects or on a real phone (the pushes went to the fake sender and the capture folder; the wake lock to a fake); Netlify runs the frequent job only on published deploys | LAUNCH-CHECKLIST 3, 7k |
| [ ] | 61.11 A WordPress or own-API app's appointments live on its site, so Change time and Send later are for apps on Yallapp's hosted API, as the dashboard's pages | When owners ask |

## Phase 62: What was left in English, plan texts per language, Arabic share images, an ended session, private and password courses, screenshots and Media

The open items of Phases 50 to 57 about wording, translations and small
correctness fixes. In the dashboard, what payment providers (iyzico,
Kashier, Fawaterk) and email servers answer is said in plain, translated
words with their own text kept after "Details:"; the analytics, donations
and attendees CSV files, the Languages page's descriptions of the app's
interface strings and its placeholder errors follow the dashboard's
language; English counts say "1 lesson". Admin › Plans takes the plans'
texts in Arabic and Turkish. The Arabic share images are shaped by the
letters' joining types, with their marks, and laid out by the
bidirectional algorithm. A session that ended on the server no longer
leaves the website saying "Dashboard". A student's private courses go in
their wishlist, and a course with a password on the website opens there
for its password. iPhones count screenshots of protected lessons for the
owner's Analytics. Media play links are bound to the student, and the
files of deleted apps leave the media server. No migration.

| | Step | Done when |
|---|---|---|
| [x] | 62.1 Dashboard texts: payment providers' refusals in plain words by kind (API keys, IBAN, ID or tax number, amount, not found, currency, phone, email, address), Yallapp's own keys said so, our own sentences kept, the provider's text after "Details:" (`lib/payments/explain.ts`, `i18n/dashboard/providers.ts`); a known sentence inside another is translated too (`nested.ts`: refunds, "The payment couldn't start: …", an email server's answer in the warning about it); the analytics CSV's columns and rows, and the donations' and attendees' CSV files, in the downloader's language (`lib/analytics/localize.ts`); notes for store reviewers stay English with their meaning in the dashboard's language; the Languages page says what each interface string is for in English, Arabic and Turkish without the app's code names (`lib/i18n/app-string-notes.ts`), and its placeholder errors are translated; "1 lesson", "1 student", "1 spot" | `phase62.test.ts`, `dashboard-i18n.test.ts`; `courses-hosted.spec.ts` |
| [x] | 62.2 Admin › Plans: optional Arabic and Turkish name, tagline, highlights and price text per plan (the admin stays English); the website and the dashboard show the team's text in the language, else the built-in translation of the default texts, else the English; the dashboard's pages name plans in their language; the Arabic and Turkish pricing and home pages refresh on a save | `phase62.test.ts`; `admin-settings.spec.ts` (an Arabic name and tagline on `/ar/pricing`) |
| [x] | 62.3 Arabic share images: contextual forms by the Unicode joining types (marks transparent and kept, tatweel and ZWJ join, ZWNJ stops, lam-alef, Persian letters), the bidirectional algorithm for a right-to-left line (W1–W7, N0 for bracket pairs, N1–N2, L2–L4: numbers, Arabic-Indic digits and Latin read left to right, brackets mirrored), a mark just before its letter for the renderer; wrapping units cut at right-to-left spaces (`lib/arabic-shape.ts`) | `phase62.test.ts` (sample strings), `site-i18n.test.ts`; an image rendered with marks, numbers and brackets |
| [x] | 62.4 An ended session: the dashboard, the admin and `/pending` send someone whose session cookie no longer works through `/api/session/ended`, which removes the leftover cookies and opens the sign-in page in their language; the sign-in page removes a leftover readable cookie and the header's links follow at once | `starter-flow.spec.ts` (62) |
| [x] | 62.5 Contract first (`openapi.yaml`): the wishlist lists private courses the student may open (others are `404` to add); `CourseDetail.password_protected` and `website_url`; a password course shows in the catalog but, until the student is in it, comes without its description, lists, intro video, topics, lessons or enrolling. Plugin: `Course_Password` for every LMS, Tutor LMS's and MasterStudy's wishlists through `Course_Visibility`, released in plugin 0.4.5 (readme.txt). App: the course page says the course has a password and offers "Open on the website" (not for a paid course on iPhone), never a password field | `CoursePasswordTest` (144 unit tests in all), `composer lint`, `php -l`; `api-test.php` on Tutor LMS 377 checks (14 new), MasterStudy `adapter-test.php` 135; `phase62_test.dart` |
| [x] | 62.6 Contract first (`platform.yaml`): the `screenshot` analytics event, with the lesson when one is open; the app sends it on iPhone when protected content is on screen (Android blocks screenshots with `FLAG_SECURE` and can't tell); "Screenshots taken" per lesson on the Analytics page for academies, and in its CSV | `phase62.test.ts`, `phase62_test.dart` |
| [x] | 62.7 Media: contract first (`openapi.yaml`, `X-Yallapp-Bound-Media`): with a user token the hosted API signs a lesson's play link for that token (`t`), and the media gate (PHP and TypeScript) plays it only with `Authorization: Bearer` that token; the 4 hours kept, links to save a lesson (15 minutes) unbound; the app sends the header (never in a browser) and opens bound links with the token. The gate removes an app's folder and lists the folders (`a`, `l`); `deleteAppMedia` for code that deletes an app, and the daily job removes folders of apps gone for a week (nothing when most look gone: another database) | `media.test.ts` (both gates), `bound_media_test.dart` |
| [x] | 62.8 Strings: every new text in English, Arabic and Turkish (dashboard catalogs; the app's ARB files with `flutter gen-l10n`, the overlay and `app-strings.json` regenerated) | `dashboard-i18n.test.ts`, `phase62.test.ts`, `flutter analyze` |
| [ ] | 62.9 The meanings of the store notes and the provider explanations come from patterns of the providers' English and Turkish answers; an answer of a kind not listed shows "<provider> refused the request." with its text | When clients see others |
| [ ] | 62.10 Plan names stay as the team wrote them (Starter, Growth, Pro, Business) unless the team names them in Arabic or Turkish; receipts, emails and the Owner API keep the English name | Owner's decision |
| [ ] | 62.11 The share images' marks are placed by the font's own offsets (the image renderer doesn't position marks): fine for the harakat of IBM Plex Sans Arabic, not checked for stacked marks or Quranic signs | Acceptable |
| [ ] | 62.12 Screenshots are counted on iPhones only, from apps built after this phase, while the owner's protection covers what is open; Android can't tell | Known limit |
| [ ] | 62.13 WordPress sites' media links stay unbound (the plugin keeps one link for an hour for all students, under the license's rate limit); bandwidth isn't limited per plan. A deleted app's folder waits a week, so a database restored from a backup finds its files | When abuse shows up |
| [ ] | 62.14 Not tried on real phones or a real media host: a bound link through Apache (`CGIPassAuth On` passes `Authorization` to PHP), playback after the token is renewed, the screenshot event on a real iPhone, "Open on the website" in the stores' review | LAUNCH-CHECKLIST 7j |

## Phase 63: Course questions and reviews, a gym's door, and Yallapp Business's last open items

The open items of Phases 58, 59 and 61 that don't need the push projects or
the stores. Students of courses managed in Yallapp ask questions and review
courses in the app; the business answers and replies or hides reviews from
Dashboard › Courses › Questions and Reviews, the Owner API and Yallapp
Business's Inbox, with pushes to the people whose role has them. A gym's
active memberships get a member code (a QR code on My membership, shown
offline too); the desk checks members in by code, QR code or name on
Dashboard › Members › Member check-in, the Owner API and Yallapp Business's
Scan members, once a member a day, saying why someone can't come in. One set
of rules in `lib` for the three, contract first, and Phase 60's roles
everywhere. Also fixes found by running Yallapp Business's demo in Arabic and
dark at phone width. No payments of any kind. Proved with unit tests on
memory and MariaDB, the e2e specs on memory and MariaDB, and both apps'
widget tests. Migration `drizzle/0046_members_and_course_community.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 63.1 Contract first: `openapi.yaml` (`Review.status` `hidden`, `Review.reply`, `Membership.member_code`, copied to the developer pages and the API reference); `owner.yaml` (tags Reviews and Members; `questions`, `questions/{id}`, `…/answers`, `reviews`, `reviews/{id}`, `…/reply`, `members`, `members/check-in`, `members/check-ins`; features `questions`, `reviews`, `member_check_in`; Today's `member_check_ins` and `questions_to_answer`; the push kinds' `question_id` and `review_id`) | `redocly lint` of the four contracts; `phase63.test.ts` checks every answer against them |
| [x] | 63.2 `lib/courses/community.ts` and the store (`course_questions`, `course_answers`, `course_reviews`, memory and MySQL): one review per student and course (the reply and hiding kept when it's edited), a question open until the business answers and again when a student writes under it, the answer and the question's status in one transaction, its answers counted when read; the hosted courses connector serves the Community endpoints for enrolled students with a rate limit, ratings on the course lists; the student told in the app's language | `phase63.test.ts`, `phase63-mysql.test.ts` (eight answers at once; first version deadlocked), `translations.test.ts` |
| [x] | 63.3 Dashboard › Courses › Questions (Messages: waiting, answered, all; the thread and the answer) and Reviews (Catalog & content: the average, without a reply, hidden; reply, remove the reply, hide, show again), the activity lines on the Team page in the person's language | `owner-api.spec.ts` (63), `team-actions.test.ts`, `team-permissions.test.ts`, `phase63.test.ts` |
| [x] | 63.4 Owner API questions and reviews with `appScope` (another client's app 404, Staff without the area 403 `not_allowed`), Today's questions to answer; pushes `new_message` for a question or a follow-up and `new_review` for a new review, to the people with Messages or Catalog & content | `phase63.test.ts`, `owner-api.spec.ts` (the pushes reached the phone) |
| [x] | 63.5 Member codes (`lib/bookings/member-codes.ts`): the ticket codes' alphabet, length, grouping and per-app key; an HMAC of the app and the membership, not stored (no backfill), `YM1.<membership>.<code>` in the QR code; `member_code` for active memberships of gyms in `GET /me/memberships` | `phase63.test.ts`, `fitness.test.ts`, `fitness-hosted.spec.ts` |
| [x] | 63.6 The door (`lib/bookings/door.ts`, `member_check_ins` with a unique key on app, member and the gym's day): admitted, already in today (with the time), ended (with the date), cancelled, not started, no classes left, not found, a QR code of another app, not a code; check-in by name; today's list with who let them in; Dashboard › Members › Member check-in (camera, typing, by name, today's list; the camera scanner shared with the events' Check-in) | `phase63.test.ts`, `phase63-mysql.test.ts` (eight doors at once count once), `fitness-hosted.spec.ts` |
| [x] | 63.7 Owner API `members`, `members/check-in`, `members/check-ins` (the Bookings area), Today's `member_check_ins`; the customer's app shows the QR code and the code on My membership, keeps them on the phone for offline use and forgets them on sign-out; a review's reply and a hidden review's note | `phase63.test.ts`, `fitness-hosted.spec.ts`, `mobile/test/widget/phase63_test.dart` |
| [x] | 63.8 Yallapp Business: Inbox tabs (Messages, Questions, Reviews, as the app and role have them), a question's thread and answer, reviews with the average, reply, hide and show again; Scan members (QR or typed, once a day, the reason when not), Members (find by name, check in, today's check-ins), Today's tile and quick actions, pushes opening them; the role's masking in the fake; the demo has Pulse Gym and the academy's questions and reviews | `business/test/widget/phase63_test.dart`, `api_client_test.dart` |
| [x] | 63.9 Fixes found in the demo (Arabic, dark, 390 px wide): Needs you now and the order, kitchen and appointment statuses from the app's strings with ICU plurals (not the API's or the demo's English); order items, customers, prices and services kept whole in right-to-left lines (`isolate`); Updates from Yallapp: Mark all as read as an icon with its tooltip so the title fits, the announcements' Markdown shown as bold, italic and links; storage in MB under a GB and said once; "No capacity limit" for an event without one | `business/test/widget/phase63_test.dart`, `orders_test.dart`, `today_test.dart`, `catalog_media_test.dart` |
| [x] | 63.10 Strings in English, Arabic and Turkish: the dashboard's `community` and `door` catalogs, nav labels, owner pushes and Today's line; the hosted API's new messages in `lib/i18n/builtin`; Yallapp Business's `tool/strings_f.py`; the customer app's ARB files, overlay, `app-strings.json` and the Languages page's notes; docs: ARCHITECTURE, LAUNCH-CHECKLIST 7n, `business/README.md` | `dashboard-i18n.test.ts`, `translations.test.ts`, `phase62.test.ts`, `build_arb.py` |
| [x] | 63.11 Frozen memberships and the door's frozen outcome: done in Phase 64 (64.4, 64.5) | Phase 64 |
| [ ] | 63.17 Checking in never uses a class credit (credits are for booking classes); a membership with credits and none left is refused at the door. Member codes change if `SIGNING_SECRET` changes (as ticket QR codes) | Known limit |
| [x] | 63.15 Review fixes: the day's check-ins read by the unique key (app, day, member) instead of a scan; a typed member code is one indexed lookup (`memberships.code_hash`, an HMAC of the code kept when the code is shown in the app or used at the door; memberships made before it are looked through once among those that can get in, then kept), checked in constant time; Today counts the gym's own day, as the door's list; the members list filtered, ordered (those who can get in first) and paged by the database with its real total; a question's answers counted when read, so a deleted student's answers don't stay in the count; reviews limited to 20 an hour per student (429 in `openapi.yaml`). Migration 0046 edited in place | `phase63.test.ts`, `phase63-mysql.test.ts` (eight answers, a deleted student, the members' pages and the code lookup on MariaDB; the first count query was wrong there) |
| [x] | 63.16 Yallapp Business: "The camera isn't available" stays inside the scanners' frame at phone width; the Inbox's filters stay on one line (Reviews' "No reply") | `business/test/widget/phase63_test.dart` (390 px, English, Arabic, Turkish) |
| [x] | 63.12 Hiding a question or a single answer: done in Phase 64 (64.2, 64.3) | Phase 64 |
| [ ] | 63.18 A student's review isn't held for approval (the business hides it afterwards) | When academies ask |
| [ ] | 63.13 WordPress, own-API and connected-platform academies keep their questions and reviews on their own sites, as before | When owners ask |
| [ ] | 63.14 Not tried on real phones, with the real Firebase projects or a real camera: the scanners ran on a fake camera, the pushes went to the capture folder | LAUNCH-CHECKLIST 7k, 7l, 7n |

## Phase 64: Hidden questions and answers, frozen memberships, pushes of every business, and the Team page's activity in pages

The open rows 63.11, 63.12 (its hiding part), 60.14 and 60.16. The business
hides a course question or a single student's answer, as it hides reviews:
its author still sees it in the customer's app with a note, nobody else does,
and no list or count includes it; from Dashboard › Courses › Questions, the
Owner API and Yallapp Business's Inbox. A gym freezes a membership from a day
until the day it's back or until it is unfrozen, on Dashboard › Members, the
Owner API and Yallapp Business's Members: the door says "Frozen until …",
classes can't be booked, the customer's app says Frozen, and the end date
moves later by the days frozen. Someone on several businesses gets the
pushes of all of them on every phone, with the business's name, and the app
switches to it when one is tapped. The Team page's activity is paged and
filtered by person. One set of rules in `lib`, contract first, Phase 60's
roles everywhere. No payments of any kind. Proved with unit tests on memory
and MariaDB, the e2e specs on memory and MariaDB, and both apps' widget
tests. Migration `drizzle/0047_frozen_memberships_hidden_questions.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 64.1 Contract first: `openapi.yaml` (`CourseQuestion.hidden`, `QuestionAnswer.hidden`, `Membership.frozen`, the `membership_frozen` booking error; copied to the developer pages and the API reference); `owner.yaml` (`PATCH questions/{id}` and `questions/{id}/answers/{id}`, the `hidden` status filter, `Question.hidden`, the answers' `hidden`; `PUT` and `DELETE members/{id}/freeze`, `Member.status` `frozen` and `Member.frozen`, the door's `frozen` outcome with `frozen_until`; the pushes' `business_id` and `business_name`) | `redocly lint` of the four contracts; `phase64.test.ts` checks every answer against them |
| [x] | 64.2 Hiding (`lib/courses/community.ts`, the stores): `setQuestionHidden`, `setAnswerHidden` (students' answers only), the business's filters (waiting and answered are the shown questions; hidden; all) and the waiting count; the hosted API lists a hidden question to its author only (404 to others, totals right), hidden answers to their author only, `answer_count` never counts them, a hidden question's follow-ups aren't pushed | `phase64.test.ts`, `phase64-mysql.test.ts` |
| [x] | 64.3 Dashboard › Courses › Questions (Hidden filter; hide or show a question and each student's answer), the Owner API's paths with `appScope` (Messages; another client's app 404, Staff without it 403), Today without the hidden ones, the Team page's lines | `phase64.test.ts`, `owner-api.spec.ts` (64), `team-actions.test.ts` |
| [x] | 64.4 Freezing (`lib/bookings/freeze.ts`): from a gym day (today to 90 days ahead, before the end) until the day it's back (at most a year) or until unfrozen; the end moves later by the days frozen (at once with a day it's back; when unfrozen without one, which holds the membership past its end meanwhile; an early unfreeze gives back the days not taken; a freeze to come is just removed); one conditional update each in memory and MySQL (`date_add` in the statement) | `phase64.test.ts` (rules, days, three at once), `phase64-mysql.test.ts` (eight at once freeze and unfreeze once) |
| [x] | 64.5 While frozen: the door's `frozen` ("Frozen until …" or "Frozen"), classes `membership_frozen`, `GET /me/memberships` `frozen`; Dashboard › Members (Freeze with the first day and the day it's back, Unfreeze, the freeze's days) and Member check-in; the Owner API's freeze paths (the door's Bookings area), `Member.status` `frozen`; the Team page's lines | `phase64.test.ts`, `fitness-hosted.spec.ts` (64), `fitness.test.ts` |
| [x] | 64.6 Pushes (60.14): to every phone of the owner and of the team with the push's area and app, whatever business it works on (one its person still works on, with their current session), with `business_id` and `business_name`, the name first on phones working on another business; Yallapp Business switches to that business when it is tapped and says so | `phase64.test.ts`, `owner-push.test.ts`, `owner-api.spec.ts`, `business/test/widget/phase64_test.dart` |
| [x] | 64.7 The Team page's activity (60.16): 50 a page, newest first, Newer and Older, filtered by person; the Owner API has no activity path to page | `phase64.test.ts`, `phase64-mysql.test.ts`, `team-members.spec.ts` |
| [x] | 64.8 Yallapp Business: the Inbox's Hidden filter, hiding or showing a question and a student's answer; Members with Frozen, Freeze and Unfreeze; the door's frozen outcome; a push of another business switching to it; the demo (`YB_DEMO`) has a hidden question and answer and a frozen member; long names in today's check-ins wrap instead of overflowing | `business/test/widget/phase64_test.dart`, `api_client_test.dart` |
| [x] | 64.9 The customer's app: the note under the author's hidden question or answer; My membership says Frozen ("Frozen until …", until unfrozen, or "Frozen from …" for one to come, read on the phone so it's right offline) and the code no longer promises to let them in; no purchase UI added | `mobile/test/widget/phase64_test.dart` |
| [x] | 64.10 Strings in English, Arabic and Turkish: the dashboard's `freeze` catalog and the `community`, `door` and `team` additions; the hosted API's `membership_frozen` message; Yallapp Business's `tool/strings_g.py`; the customer app's ARB files, overlay, `app-strings.json` and the Languages page's notes; docs: ARCHITECTURE, LAUNCH-CHECKLIST 7o (migration 0047), `business/README.md` | `dashboard-i18n.test.ts`, `translations.test.ts`, `build_arb.py` |
| [x] | 64.14 Review fixes: a class is booked or refused by whether the membership is frozen on the class's own day, and setting a freeze cancels the classes the membership booked inside it (spots and credits back, the member told in the inbox and by push, in the app's language); unfreezing checks the freeze's day it's back too (null-safe) and only an active membership; the new end is computed in the gym's days at the same local time (a change of clocks doesn't move the day) and written only while the end is the one read; frozen members are listed with the current ones in the store too; an index for the activity by person (in migration 0047) | `phase64.test.ts`, `phase64-mysql.test.ts` (a stale unfreeze, a cancelled one, Berlin's change of clocks, classes released on MariaDB) |
| [ ] | 64.11 Not tried on real phones, with the real Firebase projects: the pushes of another business went to the capture folder and a fake sender | LAUNCH-CHECKLIST 7k, 7l, 7o |
| [ ] | 64.12 One freeze at a time per membership, set by the desk (members can't ask for one in the app), and no history of past freezes (only the Team page's lines); Yallapp Business's date pickers use the phone's day, the server checks the gym's | When gyms ask |
| [ ] | 64.13 Yallapp Business has no activity screen (the Owner API has no activity path); the activity is the dashboard's Team page | When owners ask |

## Later: the Yallapp app for business owners (decided, built in Phases 58 and 59)

After the website and the client dashboard are in English, Arabic and Turkish
(Phases 55 to 57), Yallapp gets its own mobile app for the people who run an
app on it: today's numbers, alerts for new orders, bookings, tickets and
messages, the orders and appointments of the day, a ticket and check-in
scanner, sending a notification to the app's users, replies to questions and
messages, quick edits and uploads to Media from the phone, the app preview,
and builds and publishing. Decided with the owner:

| | Decision |
|---|---|
| [x] | No payments of any kind in the app, on any platform: plans, storage packs and everything else are paid on yallapp.com.tr only |
| [x] | Same database and the same accounts as the website and the dashboard; nothing kept separately for the app |
| [x] | Contract first: an owner API next to the existing ones (Phase 58: `docs/api/owner.yaml`, `/api/owner/v1`) |
| [x] | Then the app (Flutter, Phase 59: `business/`) |
| [~] | Then the stores under Yallapp's own accounts (Phase 65, LAUNCH-CHECKLIST 7l) |

## Phase 64b: uploads behind a server firewall

On the live server every upload from the dashboard and from Yallapp Business
ended in "The connection keeps dropping", while the media gate answered
`GET /media/v/x`. Two things stood in the way before PHP: a static-file
handler (LiteSpeed or nginx on the cPanel host) answered paths ending in
`.jpg`, `.mp4`… itself with 404, and server firewalls (ModSecurity,
Imunify360) refuse `PUT` and `application/offset+octet-stream`. Links now end
without a file extension, chunks go by `POST` as `application/octet-stream`,
a refused upload says why, and the admin's check tries a real upload.

| | Step | Done when |
|---|---|---|
| [x] | 64b.1 The gate (`deploy/media-host/index.php` and `lib/media/disk.ts`, in step): paths `/<op>/<app>/<id>/<ext>` as well as `<id>.<ext>` (links signed before); chunks by `POST` with any content type, 200 with `{"offset":N}` and `Upload-Offset` (`PUT` answered 204 as before); the offset from the header or the unsigned query `offset`; `GET` status and refused chunks carry the offset in JSON too | `media.test.ts` on both gates (PHP's built-in server): a 5 MB POST, the offset in the query only, another content type, 409/413 in JSON, PUT, old-form links |
| [x] | 64b.2 The platform signs every link in the new form (uploads, status, play, download, delete: `linkPathOf`); files on disk keep their names; the served Content-Type still comes from the extension | `media.test.ts`, `media.spec.ts` |
| [x] | 64b.3 Dashboard uploader (`lib/media/upload-client.ts`): POST, `application/octet-stream`, the offset in the header and the query, the offset read from the header or the JSON body (204 from older gates accepted); 403/410 get a fresh link at most twice in a row; the reason with the HTTP status (refused, storage, too big, other) instead of "The connection keeps dropping", which stays for real network errors; strings in English, Arabic and Turkish | `media.test.ts`, `media.spec.ts` (chunks by POST, a 406 and a 403 every time: three tries, then the message) |
| [x] | 64b.4 Admin › Settings › Server › "Check the media server" (`lib/media/check.ts`): the gate's own "Not found.", a signed stat, a test upload by POST at a key of its own, checked and removed (file, then folder); a failure names the step, the HTTP status and what to do (firewall rules, older gate, static-file handler, storage_dir, secret, clock) | `media.test.ts` (both gates, and a mocked firewall, static handler, older gate, secret, 503, unreachable server), `media.spec.ts` |
| [x] | 64b.5 Yallapp Business: the same protocol (`HttpUploadTransport`), `ApiException.fromGate` (`upload_refused`, `upload_storage`, `upload_too_big`), two fresh links at most, the reason with the HTTP status (`tool/strings_h.py`) | `api_client_test.dart`, `catalog_media_test.dart` |
| [x] | 64b.6 Docs: LAUNCH-CHECKLIST 7j (copy the new `index.php` and why, `post_max_size`, "If uploads fail": ModSecurity, Imunify360, LiteSpeed, `SetEnvIf` for `CGIPassAuth`), the Owner API contract's Media protocol, ARCHITECTURE | `redocly lint` |
| [x] | 64b.9 An upload that never finished is removed even when the server refuses its delete (a finished file still waits for the server); the daily job's stale uploads likewise. `deploymentId` from Netlify's `DEPLOY_ID`: a tab left open across a deploy loads the page again instead of calling server actions that are gone | `media.test.ts` |
| [ ] | 64b.7 Not tried on the live server yet: copy the new `index.php`, run "Check the media server", then upload from the dashboard and Yallapp Business | LAUNCH-CHECKLIST 7j |
| [ ] | 64b.8 Yallapp Business builds already on phones send `PUT` to links in the new form: they work wherever the server let `PUT` through; behind a firewall that refuses it they need the new build | The next Yallapp Business release |

## Phase 65: Yallapp Business on Google Play and the App Store

Everything Yallapp Business (`business/`) needs to be published under
Yallapp's own Google Play and Apple developer accounts, with as little by hand
as the stores allow. One workflow, **Yallapp Business release**
(`.github/workflows/business-release.yml`, Run workflow: both stores, Android
or iOS; the Google Play track, internal by default; the version), builds the
App Bundle signed with the upload key and the IPA signed through the App Store
Connect key the way the clients' pipeline does, and uploads them with the
listings, images and screenshots in English, Arabic and Turkish. It never
publishes: promoting to production and "Add for Review" stay a click in the
consoles. Everything comes from GitHub secrets and variables the owner adds
(LAUNCH-CHECKLIST 7l); a store whose secrets are missing is skipped and the
run's summary says what to add. Nothing secret is committed; the repository is
public, so keys only live in `$RUNNER_TEMP` and are deleted. No payments of
any kind in the app.

| | Step | Done when |
|---|---|---|
| [x] | 65.1 The release workflow: version from the input or `pubspec.yaml`, the build number from the run (only goes up, room for re-runs, `YB_BUILD_NUMBER_OFFSET`), one run at a time; a summary of every secret and variable as set or missing | actionlint with shellcheck |
| [x] | 65.2 Android: the upload key from `YB_ANDROID_*` (base64 with or without line breaks; its SHA-256 fingerprint in the summary), Firebase's Android options as in the Mobile workflow (one variable may hold the whole `google-services.json`), the signed App Bundle attached and on the **Yallapp Business test build** pre-release as `yallapp-business.aab` (for the first upload by hand), then with Workload Identity Federation (65.12) uploaded by fastlane supply to the chosen track with the listing, icon, feature graphic, screenshots and what's new (`business_play`) | actionlint; first verified in CI |
| [x] | 65.3 iOS: the App Store Connect key checked (`p8_key.py`), the App ID registered with push, a plain message when the app doesn't exist in App Store Connect yet or the certificate limit is reached; the distribution certificate from `YB_IOS_DISTRIBUTION_P12` or made for the run and revoked once Apple has processed the build; the App Store profile, the IPA, TestFlight (waits for processing), then deliver: listing, iPhone and iPad screenshots, age rating, App Review's details with the demo account from secrets, the build chosen for the version, never submitted (`business_ipa`, `business_testflight`, `business_appstore`, `business_revoke`) | `fastlane lanes`; first verified in CI |
| [x] | 65.4 The iOS project: push entitlement (`aps-environment` production for Release, development for Debug and Profile), `PrivacyInfo.xcprivacy` (email, name, device ID, photos or videos, other user content; app functionality; no tracking; UserDefaults CA92.1), the permission prompts in English, Arabic and Turkish (`InfoPlist.strings`), background notifications and `ITSAppUsesNonExemptEncryption` false as before; iPhone and iPad kept (Kitchen mode on a tablet), iOS 15 | the plists parse; `xcodeproj` opens the project; `flutter analyze` |
| [x] | 65.5 Store listings in fastlane's layout (`business/store/android` en-US, ar, tr-TR; `business/store/ios` en-US, ar-SA, tr): name, subtitle, short and full descriptions, keywords, promotional text, what's new, support, marketing and privacy URLs, categories, copyright, App Review's notes, age rating answers; checked for every file in every language and the stores' limits | `build/tests/test_business_store.py` |
| [x] | 65.6 Screenshots drawn in CI from the demo's sample apps with the app's fonts and icons: Today, Orders, the door scanner with a ticket let in, the notification composer, Stats; English, Arabic and Turkish; Google Play phone 1080 × 1920, iPhone 6.9" 1290 × 2796, iPad 13" 2064 × 2752; laid out by every `flutter test` (nothing overflows), written as PNG files only by the release workflow; the Play icon and feature graphic from `brand/stores` | `business/test/store/store_screenshots_test.dart` |
| [x] | 65.7 Docs: LAUNCH-CHECKLIST 7l as plain steps for the owner (accounts, app records, every secret and variable and where it comes from, Firebase's iOS app and APNs key, the first upload by hand, the run, Data safety, App Privacy, content rating, publishing), `business/README.md` › Releases, `build/README.md` | Review |
| [x] | 65.8 The upload key is made inside GitHub on the first run and saved straight into the `YB_ANDROID_*` secrets with a short-lived `YB_SECRETS_TOKEN` (approved by the owner); nobody holds it, the values go to `gh secret set` on stdin and are masked | `actionlint`, the first run |
| [x] | 65.12 Google Play signs in without a key file (the organization blocks service account keys): GitHub's OIDC token through Workload Identity Federation (`google-github-actions/auth`, a provider limited to this repository's `main` and the release workflow) as `yallapp-play-release@yallapp-business.iam.gserviceaccount.com`, which has no project roles; `YB_PLAY_SERVICE_ACCOUNT_JSON` is gone; **play_check** signs in and opens the app without building or uploading (lane `business_play_check`) | `actionlint`, the lane run against a fake credentials file; the real sign-in on the first check |
| [ ] | 65.9 Not run yet: the Google Play and Apple accounts were still being set up, and the Android SDK and Xcode aren't available where this was written, so the App Bundle, the IPA, the uploads and the certificate's revocation after processing are first verified on the first run in CI | LAUNCH-CHECKLIST 7l |
| [ ] | 65.10 The demo's sample data (names, the apps' kinds) stays in English in the Arabic and Turkish screenshots, as the API sends it; the door's welcome follows the account's language | Acceptable |
| [x] | 65.11 iOS shows plan and storage read-only with no link to the website ("Your plan and storage are shown here for your information."; Media's "Manage on yallapp.com.tr" hidden), so App Review sees no way to pay outside the App Store (3.1.1, 3.1.3); Android keeps the link | `publishing_more_test.dart` (iOS) |

## Phase 66: Deleting a Yallapp account

Google Play (Data safety's "Delete account URL") and the App Store
(5.1.1(v)) need a public page where someone with a Yallapp account (an
owner, or a team member from Phase 60) asks for the account and its data to
be deleted without Yallapp Business installed. `/delete-account` in English,
Arabic and Turkish says how (the dashboard, or an email from the account's
address), what is deleted, what is kept and for how long, and within how
many days; the owner asks from Dashboard › Your account (or the waiting
page) with their password, and our team deletes by hand and marks it done in
the admin. No payments touched; the Owner API contract is unchanged.
Migration `drizzle/0048_account_deletion_requests.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 66.1 The public page (`site/delete-account.tsx`): `/delete-account`, `/ar/delete-account`, `/tr/delete-account`, in the sitemap, the footer's Legal column and the legal pages' menu; the privacy policy's section 9 links to it in all three languages (updated 20 October 2026); what is kept matches the privacy policy (billing records as the law requires, technical logs 12 months) plus a record of the request; app users are sent to their app's own account deletion | `site-i18n.test.ts`, `website-seo.test.ts`, `account-deletion.test.ts`, `account-deletion.spec.ts` |
| [x] | 66.2 Data: `account_deletion_requests` (no foreign keys, so the record outlives the account; `open_client_id` unique while open: one open request per account, of two at once one wins); memory and MySQL stores; `drizzle-kit generate --name ci-check` clean | `account-deletion-mysql.test.ts` |
| [x] | 66.3 Asking (`lib/account/deletion.ts`): owner only (a team member is told to ask the owner to remove them; our team managing the dashboard is refused), the email typed again, the password counted with the sign-in attempts, an optional reason; asking again returns the open request; the owner's Yallapp Business phones signed out at once; the team emailed at the contact email (`account_deletion_request`), the owner in their language (`account_deletion_received`); cancelling | `account-deletion.test.ts` |
| [x] | 66.4 Dashboard › Your account (`/dashboard/account`, the sidebar's Account group, open to everyone on the team) and the bottom of the waiting page for pending and suspended accounts: what happens (apps stop, data deleted, the team's access, store listings stay under the client's own accounts, download the upload key first, running plans end and nothing renews or is charged), the form, the request waiting with "Cancel the request" | `team-permissions.test.ts`, `dashboard-i18n.test.ts`, `account-deletion.spec.ts` |
| [x] | 66.5 Admin › Account deletion (English, `clients.suspend`, a badge with the open requests): open requests oldest first with "delete by" and Overdue, and what belongs to the account (user and client IDs, the Blobs prefix, apps, build folders, payments, team); "Mark done and email them" (a tick that it was deleted) sends `account_deletion_done` in their language; "Cancel the request"; both in the audit log | `account-deletion.test.ts`, `account-deletion.spec.ts` |
| [x] | 66.6 Strings in English, Arabic and Turkish: the site's `deleteAccount`, `footer` and `meta` texts, the dashboard's `account` catalog, the two emails to the owner; docs: ARCHITECTURE ("Deleting a Yallapp account"), LAUNCH-CHECKLIST 7p (the address to give the stores, migration 0048) | `site-i18n.test.ts`, `dashboard-i18n.test.ts`, `email-languages.test.ts` |
| [x] | 66.7 Deleting the account itself is by hand (ARCHITECTURE's five steps): deleting the client's rows also deletes its payments (on delete cascade) and the files are in Netlify Blobs, on the files host and on the media server, so there is no "Delete now" button yet | Done in Phase 73 (73.7): carried out by the platform, keeping the billing records |
| [x] | 66.8 Yallapp Business links to the page from More › Legal ("Delete my account") | `publishing_more_test.dart` |
| [ ] | 66.9 The address given to Google Play (Data safety › Delete account URL) and App Store Connect for Yallapp Business | LAUNCH-CHECKLIST 7l and 7p |

## Phase 67: Google Search: the favicon, and every page indexed

The owner saw a grey globe instead of Yallapp's icon next to yallapp.com.tr on
Google Search, and fewer pages indexed than the site has. What the code
showed: the pages linked only `/favicon.ico` (marked `sizes="any"`) and the
SVG, with no PNG of 48 px or more; and the site's address for canonical
addresses, hreflang, the sitemap, robots.txt and JSON-LD fell back to
Netlify's `URL` whenever `APP_URL` was missing, which is
`https://yallapp.netlify.app` since the domain isn't added in Netlify (the
proxy on host.webek.org). Static pages take that address when they are built,
so a build without `APP_URL` pointed every canonical at netlify.app. Deploy
previews had no noindex of their own, `www.yallapp.com.tr` served the same
pages as `yallapp.com.tr`, and two Arabic and Turkish articles had the same
title as a solution page.

| | Step | Done when |
|---|---|---|
| [x] | 67.1 Favicons (`lib/seo.ts` `SITE_ICONS`, the root layout only): `/favicon.ico` (16, 32 and 48 px), PNGs of 48, 96 and 192 px, the SVG, the Apple touch icon (180 px), on every page in every language; `favicon-96x96.png` added to `brand/favicon` (from its `favicon.svg`) and the head snippet updated; all in `public/`, not under any `robots.txt` rule | `website-seo.test.ts` (pixel sizes read from the files, the files match `brand/favicon`, no other `icons` or app-folder icon files); `public.spec.ts` (`/`, `/ar` and `/tr` link them, each answers 200 with an image type, no redirect, no `robots.txt` rule) |
| [x] | 67.2 The public address (`siteUrl`): `APP_URL`, else `URL`, else `https://yallapp.com.tr`, never a `*.netlify.app` address nor one that isn't a URL; Organization's `logo` (`LOGO_PATH`, 512 px) | `website-seo.test.ts` (a Netlify build without `APP_URL`: canonical, hreflang, sitemap and robots.txt on `https://yallapp.com.tr`) |
| [x] | 67.3 Deploy previews and branch deploys send `X-Robots-Tag: noindex, nofollow` on every response (`lib/indexing.ts`, by Netlify's `CONTEXT` at build time); production and local builds never do | `website-seo.test.ts` (`next.config.ts` headers per context) |
| [x] | 67.4 The sitemap checked against the pages in `src/app`: every public page in English, Arabic and Turkish, absolute on `https://yallapp.com.tr`, with the same reciprocal `hreflang` set; every page left out is `noindex`; a title of its own for every page in each language (the Turkish "Haber siteleri ve bloglar için uygulamalar" and the Arabic "تطبيقات التبرعات للجمعيات الخيرية" articles) | `website-seo.test.ts`; all 228 sitemap addresses of a local build answer 200 with their own canonical and no noindex |
| [x] | 67.5 `deploy/apache-proxy.conf` and `apache-https-redirect.conf`: `www.yallapp.com.tr` (http or https) goes to `https://yallapp.com.tr` in one 301, AutoSSL's `/.well-known/` left alone; docs: README, ARCHITECTURE ("Search engines"), LAUNCH-CHECKLIST 7q | Review |
| [ ] | 67.6 On the live site: the Apache files copied again, `APP_URL` checked in Netlify for Builds too, then Google Search Console (LAUNCH-CHECKLIST 7q). Google refreshes favicons and the index on its own schedule, from days to a few weeks | The owner, in Search Console |

## Phase 68: An ended plan stops the app everywhere

Decided by the owner: when a client's plan ends, their app stops everywhere,
as hosted apps already did. One question decides it, asked against the
plan's end date at that moment (`appIsActive` in `lib/license/status.ts`): the
account is active and the app's own plan hasn't ended. The WordPress plugin
0.4.6 enforces the license on every live site (no more "Test mode"),
compares the plan's end with its own clock, and the platform tells the site
within minutes when a plan ends. Notifications to the app's users stop, a
build queued before the end isn't built, and a person signed in to the app
can still delete their account while it is paused (the stores require it).
Everything comes back on renewal. No payments in the apps. Contract first
(`openapi.yaml`, `owner.yaml`, `pipeline.yaml`, `platform.yaml`). Migration
`drizzle/0049_license_end_refresh.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 68.1 Contract first: `openapi.yaml` (a paused app answers 503 `license_inactive` or `account_suspended` on every call, `/config` included, except `POST /auth/refresh`, `POST /auth/logout`, `DELETE /me` and `POST /license/refresh`; the paused screen offers deleting the account; copied to the developer pages and the API reference); `owner.yaml` (notifications now and later refused with 403 `plan_not_active` once the plan ended, `push` false, a scheduled one whose time comes after the end is `failed` with its reason); `pipeline.yaml` (a build queued before the plan ended or the account was suspended is closed as `failed`, `license_inactive`, and not listed); `platform.yaml` (enforced from 0.4.6, `expires_at` compared by the plugin, the nudge when a plan ends) | `redocly lint` of the four contracts; `api-reference.test.ts`, `website.test.ts` (the public copy) |
| [x] | 68.2 Plugin 0.4.6: the license is enforced by default; only a development site (`WP_ENVIRONMENT_TYPE` `local` or `development`) can turn it off with `YALLAPP_ENFORCE_LICENSE` false or the `yallapp_enforce_license` filter. `License_Client::state_of`: an `active` status whose `expires_at` has passed is `expired` at once, offline too; the 72-hour grace only covers network failures before the end (`unreachable` after it). The Gatekeeper pauses every route with the existing 503 and the owner's contact (`/config` too), keeps `/license/refresh` open and lets a signed-in student renew the session, sign out and `DELETE /me`; push and offline mode follow the plan. Settings › License says where the app stands (active until …, ended on … with how to renew, suspended, not confirmed); "Test mode" is gone. Version in `yallapp.php` and `readme.txt` (changelog) | `LicenseStateTest`, `GatekeeperTest` (154 unit tests), `composer lint`, `php -l`; `api-test.php` on Tutor LMS 396 checks with `license-paused-check.php` (19 new: an ended plan pauses the API offline, deletion works, the License card); the dev site defines `YALLAPP_ENFORCE_LICENSE` false |
| [x] | 68.3 The platform tells WordPress sites at once: the frequent job (every 5 minutes) asks the site of every plan that ended in the last 3 days to check its license (`refreshEndedSites`), once per end date (`licenses.end_refreshed_for`, claimed by one conditional update; a renewal's next end is told again), five at once within 15 seconds; other backends are only marked | `phase68.test.ts`, `phase68-mysql.test.ts` (eight claims at once, one wins), `phase61.test.ts` |
| [x] | 68.4 Notifications stop when the plan ends, through one check in `sendAppNotification` and `scheduleAppNotification` (`appMaySend`): the dashboard (a notice above the form, the message in English, Arabic and Turkish), the Owner API (403 `plan_not_active`, `push` false) and the hosted API's own sends; a notification sent later whose time comes after the end is marked `failed` with "Not sent: the app's plan had ended when it was due…", never sent late after a renewal (the owner sends it again); while the account is suspended or pending they still wait, as before | `phase68.test.ts`, `owner-api.test.ts` (68), `dashboard-i18n.test.ts` |
| [x] | 68.5 Yallapp Business: the composer of an app whose plan ended says nothing is sent and its buttons wait (`tool/strings_j.py`, English, Arabic and Turkish); the fake API answers `plan_not_active` like the server | `business/test/widget/phase68_test.dart` |
| [x] | 68.6 Account deletion while paused: the hosted API answers `POST /auth/refresh`, `POST /auth/logout` and `DELETE /me` while the plan has ended or the account is suspended (`OPEN_WHILE_PAUSED`); the customer's app offers "Delete account" on its paused screen to someone signed in (asked and answered in place, the existing strings). Signing in stays paused, so someone not signed in asks the app's owner (the paused screen's Contact); our team can delete an app user from Admin › the client › App users. (`/delete-account`, Phase 66, is for Yallapp accounts and sends app users to their app) | `phase68.test.ts` (the hosted route with a license whose end date really passed; a session renewed and the account deleted after the end), `mobile/test/widget/owner_contact_test.dart` |
| [x] | 68.7 Builds: `GET /builds/queue` checks each queued build's plan again; one whose plan ended (or whose account was suspended) after it was queued is closed as `failed` with the reason (`builds` catalog in English, Arabic and Turkish), its client emailed, and it isn't listed | `phase68.test.ts` |
| [x] | 68.8 Docs: ARCHITECTURE ("An ended plan stops the app everywhere"), LAUNCH-CHECKLIST 7r (migration 0049, release plugin 0.4.6, clients update, what clients and their users see) | Review |
| [ ] | 68.9 WordPress sites on plugin 0.4.5 or older keep "Test mode" until they update: the platform can't stop them (it already refuses their sign-in codes and Media links once the plan ends). Plugin updates reach only sites with an active license, so a site whose plan already ended updates by hand or after renewing | Clients update to 0.4.6 (LAUNCH-CHECKLIST 7r) |
| [ ] | 68.10 Not tried on a live WordPress site or real phones yet: the nudge at the end, the paused screen's Delete account against a live site | LAUNCH-CHECKLIST 7r |

## Phase 69: Security review

A review of the whole system the way an attacker would look at it: the
platform (sign-in, sessions, the dashboard's and the admin's permissions,
every route that takes an ID, the hosted and Owner APIs, the license and
pipeline APIs, the internal jobs, payments and their webhooks, uploads and
the media gate, calls to addresses clients give, pages and emails, headers,
the proxy's client IP, secrets, SQL, dependencies), the WordPress plugin,
the media gate and files host, the Flutter apps and CI. Most of it held: every
ID is looked up within the signed-in account or app, passwords are Argon2id,
sessions are encrypted and end with a password change, tokens and codes are
stored hashed and compared in constant time, payments are confirmed from the
provider's own answer (amount, currency and reference), uploads are served
with `nosniff` and sandboxed, and the SQL is parameterized. What didn't is
below; what the owner does on servers and consoles is LAUNCH-CHECKLIST 1a.

| | Step | Done when |
|---|---|---|
| [x] | 69.1 **High.** Pull requests from forks never run on our runners: the repository is public, and `LINUX_RUNNER` (our runners on host.webek.org, which keep their home folder and tool cache between jobs) also runs **Build client apps** with `BUILD_PIPELINE_TOKEN` and the files host's FTP account, so a stranger's pull request could leave something behind for the next build. `ci.yml`, `platform.yml` and `mobile.yml` pick GitHub's runners for a pull request from another repository | actionlint; LAUNCH-CHECKLIST 1a (approval for all external contributors) |
| [x] | 69.2 **High.** Next.js 16.3.6 → 16.3.8 (and `eslint-config-next`): `npm audit --omit=dev` reported a high advisory group (cache poisoning of SSG/ISR pages, SSRF in image optimization, information disclosure in metadata image routes) | `npm audit --omit=dev`: 0 vulnerabilities; lint, typecheck, unit tests, build |
| [x] | 69.3 **Medium.** Ticimax shops are on the client's own domain and were called without the private-network check the other client addresses have: the shop's addresses are now checked before every call (`privateHostProblem`) and redirects are never followed. `isPrivateAddress` reads IPv6 group by group, so an IPv4 address written inside one (mapped in hex like `::ffff:7f00:1`, compatible, translated, NAT64 `64:ff9b::/96`, 6to4 `2002::/16`, Teredo) and the 192.0.0.0/24, 198.18.0.0/15, multicast, site-local and discard ranges are refused everywhere it is used (own API check, news feeds, webhooks to client APIs, link files, the owner's email server, license nudges) | `ticimax.test.ts`, `website.test.ts` |
| [x] | 69.4 **Medium.** Hosted API: the store review number and address skipped every rate limit, so their fixed 6-digit code could be tried without end (5 tries a request, new requests at will). They now count against a limit of their own, 30 requests an hour per app (number and address together); everyone else keeps the usual limits. Contract: `openapi.yaml` (`/auth/otp/request`) | `hosted.test.ts` |
| [x] | 69.5 **Medium.** Pages had no Content-Security-Policy: every page (not the API routes and media links, which set their own sandboxed one) now sends `base-uri 'self'; object-src 'none'; frame-ancestors 'none'` on top of `X-Frame-Options`, `nosniff`, HSTS and the referrer policy. Scripts aren't restricted yet (69.12) | `preview.spec.ts` |
| [x] | 69.6 **Low.** Plugin: the app's access token was accepted on any WordPress REST route whose address merely contained `/wp-json/yallapp/` (in its query string, or with a `rest_route` parameter naming another route), so a token copied from the app worked on WordPress's own API as that user. It is now accepted only when the route WordPress serves is the plugin's (`Request_Auth::route_of`, as `WP::parse_request` picks it: `rest_route` in the body, then the query, then the path) | `RequestAuthTest.php` |
| [x] | 69.7 **Low.** App names go into the build files: a line break in the name under the icon (only a hand-made request has one) became a new setting in the iOS `xcconfig` on the build machine. The platform turns control characters into spaces and `apply_config.dart` does again | `build-config.test.ts`, `build_config_tool_test.dart` |
| [x] | 69.8 Docs: this phase, LAUNCH-CHECKLIST 1a, ARCHITECTURE ("Security review"), `openapi.yaml` | `redocly lint` |
| [x] | 69.9 **Medium.** Addresses clients give are resolved and checked, then fetched, which looks the name up again: a name that changes its answer in between (DNS rebinding) could still reach a private address. Fetching the checked address itself needs a dispatcher with its own lookup (undici) | Done in Phase 70 (70.6) |
| [ ] | 69.10 **Medium.** Our runners live on the production server and keep their volumes between jobs; one-job runners need a GitHub App (or a token) that registers them anew each time | LAUNCH-CHECKLIST 1a (a machine of their own) |
| [x] | 69.11 **Medium.** No second sign-in step (an authenticator app) for the admin and for clients | Done in Phase 70 (70.1 to 70.4) |
| [x] | 69.12 **Low.** The pages' policy doesn't restrict scripts: Next.js inlines its own, so `script-src` needs a nonce per request (dynamic rendering of every page). 79.4: the signed-in pages (dashboard, admin) and the sign-in forms (sign in, sign up, reset password, pending, joining a team), all rendered per request already, get `script-src 'nonce-…' 'strict-dynamic'` and the theme script's hash from `src/proxy.ts`; Next.js puts the nonce on its scripts. The website's pages stay static with the base policy | Pages rendered with a nonce |
| [x] | 69.13 **Low.** Website sessions are sealed cookies with no server-side record: signing out deletes the cookie, but a copy of it keeps working for up to 14 days unless the password changes (Yallapp Business devices are signed out on the server) | Done in Phase 70 (70.5) |
| [x] | 69.14 **Low.** CI: third-party actions are pinned to tags, not commit SHAs, and **Build client apps** gives `BUILD_PIPELINE_TOKEN` to every step of its jobs (Flutter, Android SDK and Ruby setup actions included). 79.4: every action pinned by commit (the tag in a comment, moved by Dependabot); the token, and the files host's FTP login, only in the steps that call the platform or upload | Actions pinned by SHA; the token only in the steps that call the platform |
| [x] | 69.15 **Low.** A coupon's use limit is counted, then the use is written: two payments at the same moment can pass the limit by one | Done in Phase 70 (70.7) |
| [ ] | 69.16 Accepted: sign-up says when an email already has an account (rate limited per IP); a WordPress site with an active license can have Yallapp send sign-in codes to any number (300 an hour, 2000 a day per license, 10 an hour per number); `npm audit` reports advisories in development tools only (`braces`, `esbuild` in drizzle-kit, `yaml`), never in what runs on Netlify | Reviewed again in the next security review |

## Phase 71: Invoices as PDF

The owner asked that people who pay can download their receipt as a PDF,
and that it comes attached to the email that confirms the payment. Every
payment the platform takes now has one: a client's plan or storage packs
paid to Yallapp (Kashier, Fawaterk or iyzico, a coupon included), and a
customer's payment to a business in an app without a website: an order
(products, a restaurant's order, tickets, a paid course, a membership,
through the business's own account or, 37, Yallapp's for marketplace
sales) and a donation. The PDF is made on the server with PDFKit and the
site's own fonts, in English, Arabic (right to left, letters joined) or
Turkish. It is a receipt of what was paid, not a tax invoice: there are no
tax lines because the system has none, and Yallapp's legal details appear
only once the team writes them in the admin. Contract first (`openapi.yaml`:
`Order.receipt_url`, `Donation.receipt_pdf_url`). No migration.

| | Step | Done when |
|---|---|---|
| [x] | 71.1 Contract first: `Order.receipt_url` (the order's receipt as a PDF, a signed link; null on WordPress sites and older servers) and `Donation.receipt_pdf_url` (next to `receipt_url`, the page); both take `lang`; copied to the developer pages | `redocly lint` of the four contracts; `api-reference.test.ts` |
| [x] | 71.2 The PDF (`lib/receipts/pdf.ts`): PDFKit 0.20.2 (pure JavaScript, MIT, released 30 August 2026; loaded from `node_modules` on Netlify like `mysql2`), A4, Bricolage Grotesque for Latin and Turkish and IBM Plex Sans Arabic for Arabic (the static files in `src/app/fonts/og`, embedded as subsets); fontkit shapes Arabic with the font's own forms, and each line is cut into runs in visual order first (`bidiRuns` in `lib/arabic-shape.ts`, now for left-to-right lines too, with `ltrSpan` keeping phone numbers, emails, amounts and references in one piece), so an Arabic receipt is laid out right to left and an English one can hold an Arabic dish's name; ligatures copy and search in reading order | `receipts-pdf.test.ts`: text read back with pdf.js in English, Arabic and Turkish, amounts as everywhere else (`EGP 1,500`, `₺320.00`, `$33`), a long order over two pages; samples looked at as images (`pdftoppm`) |
| [x] | 71.3 What each receipt says (`lib/receipts/build.ts`, words in `lib/receipts/words.ts` in English, Arabic and Turkish): the seller (Yallapp: its name, Cairo, the website and the contact details from Admin › Settings, plus the lines of Admin › Settings › **Invoices**; a business: its app's name, support email and WhatsApp), the buyer, the number, the date and time in the app's time zone (Analytics › Time zone, else the account's country), the items with their options, subtotal, shipping or delivery fee, the coupon, the total, what was refunded and the status (Paid, Partly refunded, Refunded, Demo), the provider and its reference, the price shown in dollars, a marketplace sale's note. Yallapp's receipts are in the client's language; a business's in the language asked for when the app has it, else the app's main language | `receipts-pdf.test.ts` |
| [x] | 71.4 Downloads (`lib/receipts/service.ts`, `content-type: application/pdf`, `private, no-store`): `/dashboard/license/receipts/<id>/pdf` (the account's own paid payment, for whoever may see billing, in the dashboard's language), `/admin/payments/<id>/pdf` and `/admin/payments/orders/<app>/<order>/pdf` (our team, in the client's language), `/receipts/<code>/pdf` (a donation, by its random code) and `/receipts/orders/<app>.<order>.<signature>` (an order, signed with `SIGNING_SECRET`; only paid ones). Anything else is not found | `receipts-routes.test.ts`: another account's receipt, a pending one, a team member and a signed-out visitor, the admin's roles, a changed or foreign signature, an unpaid order |
| [x] | 71.5 Buttons: **Download PDF** on License › Payments and on the receipt page, **Receipt (PDF)** on each paid order (Orders) and donation (Donations) for the business, the same PDF its customer got (English, Arabic and Turkish), **Receipt PDF** on the admin's Payments (plans and shop sales) and a client's page, **Download PDF** on a donation's receipt page and **Download receipt (PDF)** on the page after paying for an order (those two pages stay in English, as before) | `plan-payment.spec.ts`, `catalog.spec.ts`, `donations-hosted.spec.ts` |
| [x] | 71.6 Emails carry the PDF: the mailer takes attachments (Yallapp's server and an app's own); the activation and renewal emails, "Storage pack added" and the donation receipt attach it; a new **Order receipt** email (Admin › Emails, `order_receipt`) goes to the customer in the business's name once an order is paid, with its link. When the PDF can't be made, the reason is logged and the email goes without it | `receipts-routes.test.ts` (the order's email with its PDF, the email without it when the PDF fails, the activation email in Arabic); the three browser specs read the attachment |
| [x] | 71.7 The app: **Download receipt** on My orders (and a restaurant's order being followed) and on My donations, opening the PDF in the browser with the app's language; strings in English, Arabic and Turkish; the preview bundle rebuilt | `phase71_test.dart`, `flutter analyze`, `flutter test`, `build_preview.sh --check` |
| [x] | 71.8 Docs: ARCHITECTURE ("Receipts as PDF"), LAUNCH-CHECKLIST 7s | Review |
| [x] | 71.9 Done in 96.4. Was: A customer's own language isn't kept with their order or donation, so the PDF in the email is in the app's main language; the app's button and a `lang` link give the language the app shows. Keeping the language the payment page was opened in needs a column on orders and donations | If customers ask |
| [ ] | 71.10 Tax invoices: the receipt is not a tax invoice (no tax lines, no electronic invoicing such as Egypt's e-receipt or Turkey's e-Arşiv). Yallapp's legal name, address and tax number appear only when the team writes them in Admin › Settings › Invoices | Owner's decision, with the accountant |
| [x] | 71.11 Done in 96.3. Was: Tickets, paid courses and memberships aren't listed as orders in the app (only shops' orders are), so their receipt reaches the customer by email and on the page after paying; a link on `Ticket` and the membership would be a contract change. WordPress apps' orders have WooCommerce's or the LMS's own receipts | When needed |
| [ ] | 71.12 Not tried on the live site yet: a test payment of each kind, the PDF in Gmail and Outlook, an app's own email server taking the attachment (LAUNCH-CHECKLIST 7s) | The owner, after deploying |

## Phase 70: Two-step sign-in, real sign-out, coupon limits, safe fetches

Four open items of the security review (69.9, 69.11, 69.13, 69.15). Two-step
sign-in with an authenticator app (RFC 6238: 30-second steps, 6 digits, the
step before and after accepted, each code once) for Yallapp's team and for
clients and their team members, on every way in: the sign-in page, a password
reset, a team invitation and Yallapp Business. Website sessions are kept on
the server, so signing out ends a copied cookie too. A coupon's use limit is
counted under a lock. Calls to addresses clients give connect to the address
that was checked. Contract first (`owner.yaml`). Migration
`drizzle/0050_two_step_sign_in.sql`.

| | Step | Done when |
|---|---|---|
| [x] | 70.1 Two-step sign-in (`lib/auth/totp.ts`, `lib/auth/two-step.ts`): a 20-byte secret encrypted with `ENCRYPTION_KEY` (context `two-step:<user id>`), set up with a QR code drawn on the server (`lib/qr.ts`, no outside service) and the key as text, turned on by a first right code; 10 one-time recovery codes shown once, kept as SHA-256 hashes; a code's step claimed by a conditional update (a code works once, never an older one); attempts counted per person, 8 in 15 minutes (`two-step:user`); turning it off needs the password (counted with the sign-in attempts) and a code; new recovery codes for a code | `two-step.test.ts` (RFC 6238 vectors, setup, each code once, the limit, turning it off), `two-step-mysql.test.ts` |
| [x] | 70.2 Signing in: after a right password, someone with it gets the code page (`/sign-in/code`, `/ar/…`, `/tr/…`, noindex) and a 10-minute sealed step (`yallapp_two_step`), never a session; the code (or a recovery code) starts it. A password reset and a team invitation go through the same step (`lib/auth/sign-in.ts` › `afterPassword`), so neither skips it | `two-step.test.ts`, `team-join.test.ts`, `two-step.spec.ts` |
| [x] | 70.3 Your account (Dashboard › Your account in English, Arabic and Turkish for owners and team members; Admin › Your account in English): set up, the QR code and key, recovery codes, turning it off; the overview suggests it until it's on; emails when it's turned on or off (`two_step_on`, `two_step_off`, in the person's language) | `dashboard-i18n.test.ts`, `email-languages.test.ts`, `two-step.spec.ts` |
| [x] | 70.4 The team: "Require two-step sign-in for the team" (Admin › Team, owners, theirs on first; `platform_settings.security`): everyone on the team without it is sent to Admin › Your account and can't open the admin or a client's dashboard until it's on; an owner resets a member's two-step sign-in (a lost phone), audit-logged and emailed | `two-step.spec.ts` |
| [x] | 70.5 Real sign-out (69.13): the session cookie carries a random session ID whose SHA-256 is in `user_sessions` (checked on every request with the session version); signing out deletes it, so a copied cookie stops working; "Sign out of all devices" (Your account) deletes every session of the person, bumps the session version and signs every Yallapp Business phone out; a password reset still ends every session; expired rows go with the daily job | `two-step.test.ts`, `starter-flow.spec.ts`, `two-step.spec.ts` |
| [x] | 70.6 Safe fetches (69.9, `lib/net/safe-fetch.ts`): calls to addresses clients give (their API check and lists, news feeds, webhooks to their API, link files, license nudges to their WordPress site, a Ticimax shop) go through an undici `Agent` whose `connect.lookup` resolves once, refuses any private or reserved answer (`isPrivateAddress`, moved to `lib/net/addresses.ts`) and connects to what it checked; IP addresses in the URL are checked before the call; redirects are followed by hand and checked again (or refused). undici is loaded after Node's own fetch, so the rest of the platform keeps Node's | `safe-fetch.test.ts` (a fake resolver: a name that changes its answer is refused, redirects to private addresses refused), the existing call sites' tests |
| [x] | 70.7 Coupon limits (69.15): a coupon's use is saved with its payment only while its limits allow one more, counted under a lock on the coupon's row (`claimCouponRedemption`); the payment that loses the last place records nothing and the client is told the coupon is used up | `coupons.test.ts`, `two-step-mysql.test.ts` (six payments at once on two connections, a limit of two: two win; per client: one) |
| [x] | 70.8 Yallapp Business (contract first: `owner.yaml` `SignInRequest.otp`, 401 `two_factor_required` and `invalid_two_factor_code`): the sign-in screen asks for the code after the password, says when it is wrong, and goes back for another account (`tool/strings_k.py`, English, Arabic and Turkish) | `redocly lint`, `owner-api.test.ts`, `business/test/widget/phase70_test.dart` |
| [x] | 70.9 Docs: this phase, ARCHITECTURE ("Two-step sign-in and sessions"), LAUNCH-CHECKLIST 7t (migration 0050, turning it on for the team) | Review |
| [ ] | 70.10 Yallapp Business versions before this one can't sign in to an account with two-step sign-in (they don't send `otp`); the owner signs in on the website until the app updates | The release with 70.8 in the stores (LAUNCH-CHECKLIST 7l) |

## Phase 72: Two support numbers, no marketplace, YouTube's own player, data kept by plan

Four decisions by the owner. Yallapp's WhatsApp support has two numbers:
+90 544 673 19 42 for customers outside Egypt (as before) and
+20 104 256 0010 for customers in Egypt, both set in Admin › Settings ›
Contact details. Yallapp never collects payments for its clients: the
marketplace of 9.5 is gone, and every client takes payments in its own
provider account. Videos from YouTube and the other video sites play in the
site's own player by default; hiding its branding (Phase 40) is the owner's
choice, at their own risk. Analytics are kept by plan: daily totals 3 months
on Starter, 1 year on Growth, 2 years on Pro, 3 years on Business, single
events 90 days on every plan (44.6). Contract first (`openapi.yaml`,
`platform.yaml`, `owner.yaml`). No migration: the new values live in
`platform_settings` and `apps.hosted_settings`, and the purges use the
existing indexes.

| | Step | Done when |
|---|---|---|
| [x] | 72.1 Two WhatsApp numbers (`lib/contact-lines.ts`, `lib/contact.ts`): Admin › Settings › Contact details has **WhatsApp number (outside Egypt)** and **WhatsApp number (in Egypt)** (+20 104 256 0010 until saved; a setting saved before has none and gets it). Both with their labels ("In Egypt" / "Outside Egypt", "داخل مصر" / "خارج مصر", "Mısır'da" / "Mısır dışında") where there's room: the footer's contact column, the Contact page, the Terms, Privacy and Refund pages (`{{contact_whatsapp_egypt}}`, `{{contact_whatsapp_egypt_url}}`), the emails' signature (`{{yallapp_whatsapp}}` holds both, in the email's language; `{{yallapp_whatsapp_egypt}}` and `{{yallapp_whatsapp_international}}` added), the JSON-LD (two `contactPoint`s with `areaServed`), the docs' Getting help. Where one button fits, the number for the visitor's country (Phase 52's: the account's, then the request's) on the pages rendered per request (the dashboard and its Support link, the pending and paused pages, the home and pricing pages), and on pages built ahead of time a `WhatsAppLink` that switches to Egypt's number in a browser in Cairo's time zone or with an Egyptian language region, so those pages stay static | `phase72.test.ts`, `website-seo.test.ts`, `admin-settings.spec.ts` (both numbers saved, shown with their labels in English and Arabic) |
| [x] | 72.2 Contract first: `owner.yaml` `links.support_whatsapp` follows the account's country, `support_whatsapp_egypt` and `support_whatsapp_international` added. Yallapp Business's help screen lists both, each with its label (`tool/strings_p72.py`, English, Arabic and Turkish); an older server's single link still shows | `redocly lint`; `business/test/unit/models_test.dart`, `publishing_more_test.dart` |
| [x] | 72.3 No marketplace: `checkoutAccount` returns only the client's own account, `paymentsSetUp` is false for a shop that had joined, and `startPayment` refuses an account marked as Yallapp's; the admin's commission and provider sections, the switch, the join form and action are gone; a shop that had joined is told to add its own account (English, Arabic, Turkish). Existing data untouched (the `marketplace` and `paymentProvider` settings, the shops' old payment settings); orders paid through Yallapp's account before are still confirmed, refunded and released | `phase72.test.ts`, `catalog.test.ts`, `payment-providers.test.ts`, `switches.test.ts`, `no-marketplace.spec.ts` (no admin option, no client option, no mention on the public pages), `egypt-payments.spec.ts` |
| [x] | 72.4 Wording: the Terms (§3: each business uses its own payment provider account, Yallapp isn't a party to those sales), the Privacy policy (customers' payments; how long analytics are kept), the FAQ ("I don't have a payment account", "Does Yallapp take a cut"), the feature lists and the docs (Card payments, Events, Donations) in English, Arabic and Turkish; the Terms and Privacy dates are 21 October 2026 | `website.test.ts`, `no-marketplace.spec.ts` |
| [x] | 72.5 Contract first: `Config.app.hide_video_branding` (`openapi.yaml`, missing: false) and `LicenseStatus.hide_video_branding` (`platform.yaml`). Dashboard › Screen protection: "Videos from YouTube and other video sites" with **Hide the video site's branding (at your own risk)** and why (YouTube's terms; YouTube can block the videos in the app), off by default and for every existing app; an own API sends its own. The hosted `/config` and the license status carry it; a WordPress site is asked to check its license after a save. Developer guide and the "Videos don't play" article in English, Arabic and Turkish | `phase72.test.ts` (hosted config and license status against the contracts), `license-refresh.test.ts`, `courses-hosted.spec.ts` |
| [x] | 72.6 Plugin: the license status keeps `hide_video_branding` (only a true counts) and `/config` serves it as `app.hide_video_branding`; "Unreleased" in readme.txt | `VideoBrandingTest`, `composer lint`, `php -l` |
| [x] | 72.7 App: `AppRules.hideVideoBranding`, `hideVideoBrandingProvider`. By default YouTube, Vimeo and Bunny Stream play in the site's normal player (its own controls and branding, touches reach it, nothing covers it) on the same page, so watch tracking, resume and the end still work; Wistia, Dailymotion and Loom keep their branding options on. With the branding hidden, Phase 40's player as before. Preview bundle rebuilt | `brandless_video_test.dart`, `lesson_video_test.dart`, `lesson_embed_test.dart`, `real_estate_test.dart`; `flutter analyze`, `flutter test`, `build_preview.sh --check` |
| [x] | 72.8 Analytics kept by plan: `PlanLimits.analyticsMonths` (null: until the app is deleted), edited in Admin › Plans (**Analytics history (months)**, 1 to 120); raw events 90 days for every plan (40 before). The daily job deletes, in batches of 5,000 within a budget, raw events older than 90 days and each app's daily totals older than its plan keeps (`lib/analytics/retention.ts`; an app without a plan keeps what Starter keeps); memory and MySQL stores | `phase72.test.ts`, `analytics.test.ts`, `analytics-mysql.test.ts` on MariaDB |
| [x] | 72.9 Shown in the plan details: the pricing page's comparison ("Analytics: daily totals kept", "single events kept") and the dashboard's plan cards, in English, Arabic and Turkish. The Analytics page, its CSV and the Owner API's analytics start no earlier than the first day kept: the page says how long the plan keeps them, the date fields have that minimum, and a range that started earlier says it was cut | `phase72.test.ts`, `analytics.spec.ts` |
| [x] | 72.10 Docs: ARCHITECTURE (the new section, analytics, video sites, settings), LAUNCH-CHECKLIST (Settings › Contact, no marketplace), the platform README | Review |
| [ ] | 72.11 The owner: open Admin › Settings › Contact details and save once (both numbers stored); if the Terms, Privacy or Refund pages were edited in Website content, add the Egyptian number and the Terms' payments paragraph there; tell the shops that sold through Yallapp's account to add their own keys | LAUNCH-CHECKLIST (Settings › Contact, No marketplace) |
| [ ] | 72.12 Apps built before this phase keep hiding the video sites' branding until their next build; WordPress sites need the next plugin release for `app.hide_video_branding` (without it, their apps show the sites' own players). Check on phones that YouTube's own player, its full-screen button and its links behave in the Android and iOS web views | The next builds and plugin release; a device test |

## Phase 73: Start a course again, delete an app, automatic account deletion, dark mode, account country

Five decisions by the owner. A student who finished a course can start it
again (38.18): the app asks, clears their progress and opens the first
lesson; the business turns it off per course. An owner deletes an app from
the dashboard (60.13): gone at once, restorable by our team for 7 days,
then purged with its files. Account deletion requests (66.7) are carried
out by the platform after 7 days or at once, keeping the billing records.
The website, the dashboard and the admin get a light/dark switch (41.9),
and clients set their account's country (52.9). Contract first
(`openapi.yaml`, `platform.yaml`, `pipeline.yaml`, `owner.yaml`). Migration
`drizzle/0051_app_deletion.sql`. Plugin 0.4.7.

| | Step | Done when |
|---|---|---|
| [x] | 73.1 Contract first: `CourseDetail.can_restart` (missing: false) and `POST /courses/{course_id}/restart` (Progress; 403 `not_enrolled`, `restart_disabled`); a deleted app answers 404 on the hosted API and `license_not_found` to its plugin (`openapi.yaml`, `platform.yaml`); its queued builds are closed (`pipeline.yaml`); it leaves the Owner API (`owner.yaml`); copied to the developer pages | `redocly lint` of the four contracts; `api-reference.test.ts` |
| [x] | 73.2 Hosted courses: "Students can start this course again" on each course (on by default; English, Arabic, Turkish), `can_restart` and the restart endpoint, which deletes the student's lessons completed and video positions of the course; messages in the three languages | `courses-hosted.test.ts`, `phase73.test.ts`, `translations.test.ts` |
| [x] | 73.3 Plugin 0.4.7: `Lms_Adapter::can_reset_progress` and `reset_progress` with each LMS's own API (Tutor LMS, LearnDash, LifterLMS, Sensei LMS; LearnPress while the course allows retakes, counting one); MasterStudy and Masteriyo have none, so `can_restart` is false there; the course's "In the app" box; what the plugin keeps (video positions, watched shares, the completion date) forgotten too; version, stable tag and changelog | `CourseRestartTest`, the Tutor LMS integration suite (403 checks), `composer lint`, `php -l` |
| [x] | 73.4 App: "Start the course again" beside "Review course" on a finished course with `can_restart`, asked first, then the first lesson; what waits to be sent from the phone for the course is dropped; English, Arabic and Turkish (and string packs); the preview bundle rebuilt | `phase73_test.dart` (the three templates, Arabic, Turkish, a refusal, an older server), `flutter analyze`, `flutter test`, `build_preview.sh --check` |
| [x] | 73.5 Delete an app (60.13): Setup › Delete this app, the owner only, with the app's name and the password; what is deleted and what stays (store listings, payment records), in English, Arabic and Turkish; `apps.deleted_at` leaves the app and its license out of every read at once; the WordPress site asked to check its license now | `phase73.test.ts`, `phase73-mysql.test.ts`, `phase73.spec.ts` on the memory store and MariaDB |
| [x] | 73.6 Admin › Deleted apps: Restore (as it was) and Delete now, both audit-logged; the daily job purges after 7 days: Media files, build folders on the files host (a signed `DELETE` the files host's `index.php` now answers; folders it doesn't confirm are listed and tried again daily), the images only that app used, its rows by cascade; plan payments stay without their app | `phase73.test.ts`, `phase73-mysql.test.ts`, `phase73.spec.ts` |
| [x] | 73.7 Account deletion carried out (66.7): 7 days after the request (the dashboard says the date; cancel until then) or Delete now; paid plan payments kept in `kept_billing_records` with the buyer, coupon and receipt (its PDF in the admin), then the files and the owner's user with everything that cascades (client, apps, payments, team, sessions, two-step data, phones); the owner emailed as before | `phase73.test.ts`, `phase73-mysql.test.ts` (payments gone with the client, their records kept, another account untouched), `account-deletion.spec.ts` on the memory store and MariaDB |
| [x] | 73.8 Dark mode (41.9): the website, the sign-in pages, the dashboard and the admin follow the system setting until the switch is pressed; the choice is kept in the browser and set before the page paints; the switch's label in English, Arabic and Turkish; Phase 41's dark tokens | `phase41.test.ts`, `phase73.test.ts`, `phase73.spec.ts`; screenshots looked at |
| [x] | 73.9 Account country (52.9): Dashboard › Your account › Your country (the owner), the License page's line, the admin's client details; country names in the dashboard's language | `phase73.test.ts`, `phase73.spec.ts`, `dashboard-i18n.test.ts` |
| [x] | 73.10 Docs: this phase, ARCHITECTURE (the new section, account deletion), LAUNCH-CHECKLIST 7u (migration 0051, the files host's `index.php`, plugin 0.4.7, automatic deletion) | Review |
| [ ] | 73.11 The owner: apply migration 0051 and deploy; upload `build/files-host/index.php` to files.yallapp.com.tr; release plugin 0.4.7; look at the open account deletion requests, which the first daily run after the deploy carries out when their 7 days are over | LAUNCH-CHECKLIST 7u |
| [ ] | 73.12 Not done: LearnPress, LifterLMS, Sensei LMS and LearnDash's restart are written against their published APIs but only Tutor LMS's runs in the integration suite here (wordpress.org downloads were blocked); MasterStudy and Masteriyo need an API before the app can offer it; a lesson saved for offline viewing keeps its saved copy's "completed" mark until it is opened online again; apps built before this phase show "Review course" only | A device test and each LMS's adapter suite (`LMS=… tests/integration/run.sh`) |

## Phase 74: Store screenshots as promotional images

The owner asked for the listing's screenshots to look like the stores'
usual promotional images: each screen in a device frame under a short line
that says what it does, in every size the stores take. They are drawn by the
same test as before, so the release workflow uploads the framed ones.

| | Step | Done when |
|---|---|---|
| [x] | 74.1 `business/test/store/poster.dart`: the screen in a thin phone (camera hole or iPhone island, status bar) or tablet frame under its headline and line, Midnight and Ivory in turn, Bricolage Grotesque and IBM Plex Sans Arabic (docs/BRAND.md); the captions in English, Arabic and Turkish | `flutter test test/store` (75 screenshots, every caption within its two lines); the files looked at |
| [x] | 74.2 More sizes: Google Play tablets (1600 × 2560, sent as 7" and 10") and the 6.5" iPhone (1284 × 2778) beside the phone, the 6.9" iPhone and the 13" iPad; `business_store.py` puts them in fastlane's folders | `build/tests/test_business_store.py` |
| [x] | 74.3 Docs: this phase, `business/README.md` | Review |
| [ ] | 74.4 The owner: the framed screenshots in Play Console (phone, 7" and 10" tablet) for English, Arabic and Turkish, until the release workflow uploads them itself | Play Console › Main store listing |

## Phase 75: The license key belongs to WordPress apps

An app on the hosted API, a store platform (Shopify, Salla, Zid, Wix and
the others) or its own API never uses its license key, yet the dashboard
showed it, the activation email asked to install the plugin, and the key
could be activated on any WordPress site, putting Yallapp's sign-in codes and
media server behind a site the plan isn't for. The owner decided the key is
shown and accepted only for WordPress apps and apps waiting for the WordPress
site our team sets up. Contract first (`platform.yaml`).

| | Step | Done when |
|---|---|---|
| [x] | 75.1 Contract: `POST /licenses/activate` answers 403 `license_not_for_site` for an app that doesn't run on WordPress; `/licenses/check` answers `invalid` for it, also after an earlier activation (`platform.yaml`) | `redocly lint` |
| [x] | 75.2 Platform: `licenseUsesSite` refuses the activation and stops an earlier one on check, layouts, media links, sign-in codes and plugin updates; back on WordPress, the same site works again | `phase75.test.ts` |
| [x] | 75.3 Dashboard: the page is **Plan** for these apps, without the key, its notices without the key or the plugin; the docs' page name (English, Arabic, Turkish) | `phase75.test.ts`, `dashboard-i18n.test.ts`, the e2e specs that read the key |
| [x] | 75.4 Emails: `app_activated` in English, Arabic and Turkish, sent on activation (the team, a card payment) and by the admin's resend for these apps | `phase75.test.ts` |
| [x] | 75.5 Docs: this phase, ARCHITECTURE | Review |

## Phase 76: The plugin on WordPress.org

The owner tried to submit the plugin to WordPress.org and the upload refused
it: "Your plugin and author URIs are the same". WordPress.org's Plugin Check
also found a self-updater (not allowed for listed plugins), a localhost
address and 67 warnings. The chat (next phase) needs a new plugin version,
so the plugin is made ready for WordPress.org first. The owner's WordPress.org
account is `yallapp`.

| | Step | Done when |
|---|---|---|
| [x] | 76.1 Plugin 0.4.8: Plugin URI `/docs/wordpress-plugin`, Author URI `yallapp.com.tr`; no updates from Yallapp (WordPress.org's own from now on; 0.4.7 and earlier still reach 0.4.8 through Admin › Plugin releases); Amelia's in-process request without a localhost address; the queries on other plugins' tables say their names come from `$wpdb->prefix` | `composer lint`, `php -l`, PHPUnit, the integration suites in CI |
| [x] | 76.2 Readme: contributor `yallapp`, a Yallapp account required, Installation, External services (Yallapp, Firebase Cloud Messaging, Huawei Push Kit: what is sent, when, terms and privacy links), changelog | Plugin Check's readme checks |
| [x] | 76.3 `bin/plugin-check.sh` and the CI job "Plugin Check (WordPress.org)": Plugin Check 2.1.0 on the zip, failing on any error or warning (0.4.7: 2 errors, 67 warnings; 0.4.8: none) | The script locally, CI |
| [x] | 76.4 Docs: this phase, ARCHITECTURE, LAUNCH-CHECKLIST 7v | Review |
| [-] | 76.5 Not done, the owner's decision (2026-10-26): the plugin is not listed on WordPress.org. Its review of 0.4.8 asked for every local feature to work without a paid plan (guideline 5); the owner chose to keep the plugin paused without an active plan and to give it from Yallapp only | — |
| [x] | 76.6 Plugin 0.4.18: updates from Yallapp again, for sites whose plan is active (`GET /api/v1/plugin/update`, Admin › Plugin releases), in Dashboard › Updates and "View version details"; sites on 0.4.8 to 0.4.17 install 0.4.18 by hand once. Plugin Check still runs on every change, without its check against updaters | `self-update-check.php` in the integration suite, `bin/plugin-check.sh`, `composer lint`, PHPUnit |

## Phase 77: Chat in the app

The owner's decisions (2026-10-21): the people using an app talk to the
business, and in academies each course has a group; people never talk to
each other in private. On the Pro and Business plans. Text, photos, videos,
voice messages and files, which count in the app's storage and show in the
business's Media library, where the business keeps or deletes them. Messages
are kept a year: 30 days before a conversation's oldest messages are deleted
the business is told (dashboard, email) and can keep it, or all of them,
another year; it can delete a conversation or a message at any time. The
app asks for new messages every few seconds while a conversation is open
(no paid real-time service) and a push brings the rest. Reports, blocking,
and the terms saying the business is responsible for its chat, as the App
Store and Google Play ask of apps where people write to each other.

The chat lives on Yallapp's hosted API for every app: hosted apps and own
APIs with Yallapp sign-in use their access token; WordPress apps get a chat
token from their site (plugin 0.4.9), and Yallapp sends their pushes back
through the site, which keeps the push tokens. Own APIs that sign people in
themselves get no chat in this phase.

| | Step | Done when |
|---|---|---|
| [x] | 77.1 Contracts: the Chat tag on the hosted API (conversations, messages, read, members, report, block, uploads, unread), `Config.chat`, the plugin's `POST /chat/session` and `POST /chat/notify` (`openapi.yaml`); `POST /chat/sessions`, `POST /chat/members/forget`, `LicenseStatus.chat`, the `chat` feature (`platform.yaml`); the Owner API's Chat (conversations, replies, deleting, keeping, reports, blocking, settings), the Chat area, the `new_chat_message` push, audio and file media (`owner.yaml`); the developer pages' copy | `redocly lint` of the four contracts; `api-reference.test.ts`, `website.test.ts` |
| [x] | 77.2 Platform: migration 0052 (conversations, members, messages, reads, reports, blocks), the memory and MySQL stores, the chat service, the hosted API's Chat routes, WordPress chat sessions and forgetting, pushes (hosted apps, the site's `/chat/notify`, the owner's phone), the `chat` plan feature (Pro, Business), retention with the 30-day notice and keeping, deleting an account deletes its chat | Unit tests on the memory store and MariaDB |
| [x] | 77.3 Dashboard: Chat (inbox, conversation, replies with Media files, deleting, blocking, reports, keeping), the settings (on or off, course groups), the Chat area for the team, chat files in Media; English, Arabic and Turkish | Unit and e2e tests |
| [x] | 77.4 Plugin 0.4.9: `POST /chat/session`, `POST /chat/notify`, forgetting a deleted account, `Config.chat` from the license; Plugin Check clean | PHPUnit, the integration suites, `bin/plugin-check.sh` |
| [x] | 77.5 Customer app: the Chat tab (before Account when the tabs leave room, else a row in Account, with the unread count; signed-out people see a sign-in prompt): the business's conversation first, then course groups. A conversation asks for new messages every `poll_after_seconds` while it's open and in front, marks them read, and opens from a `chat` push. Text, photos and videos (gallery or camera), voice messages (recorded in the app, AAC in m4a, played in the bubble) and documents, checked for type and size before sending and sent to the media gate in chunks (renewed link, missing parts sent again). A message that couldn't go stays with "Tap to try again" and keeps its `client_id`. A long press reports a message or deletes one's own; in a group it blocks the sender, and the Members list blocks and unblocks (never the business). Someone the business blocked reads but can't send. WordPress apps get an hour's chat token from their site (renewed before it ends and after a 401); the hosted API and Yallapp sign-in use the access token. Strings in English, Arabic and Turkish; Android `RECORD_AUDIO`, iOS camera, microphone and photo texts; the preview bundle rebuilt | `chat_test.dart` (unit: contract paths and bodies, site tokens, chunked uploads, file types, push, tabs; widget: the tab and badge, polling and read, retry with the same `client_id`, report, block, members, delete, blocked by the business, voice, files, the Account row, Arabic), `flutter analyze`, `flutter test`, `build_preview.sh --check` |
| [x] | 77.6 Owner API: the Chat routes (`lib/owner/chat.ts`: the inbox with unread, open reports and what expires soon; messages; replies as the business with a Media file; read; deleting a message or a conversation; keeping one or all; reports and their outcome; stopping a person; the settings, Settings to change them and WordPress sites told), `features.chat` (the plan, on, the Chat area). Yallapp Business: the Chat tab after the main tool (Stats in More when the bar is full), search and Unread or Course groups, reports and expiring notices, a conversation that polls and marks read, replies with a file from Media and a retry with the same `client_id`, deleting, stopping a person, keeping, deleting all, the reports screen, the settings sheet, `new_chat_message` in its notification settings and pushes that open the conversation, the Chat team area; English, Arabic and Turkish. The terms (section 11, the business is responsible for its chat) and the privacy policy in three languages; the docs page `/docs/chat`; the chat on the Pro card and the license page; ARCHITECTURE and LAUNCH-CHECKLIST | `owner-chat.test.ts` (against owner.yaml: inbox, replies and `client_id`, delete, keep, clear, reports, block, settings, plans without chat, the Chat and Settings areas), Business `chat_test.dart` and `flutter test`, the platform's unit tests |


## The platform program (Phases 78 to 94)

The owner's brief (2026-10-22): make Yallapp a complete platform for building
and running mobile apps that beats its competitors on ease of use,
customisation, features, speed of publishing and the client's experience,
in eighteen areas. A review of the code against each area (what exists, what
is missing) gave the phases below. They build on what is there: the setup
steps, Pages & look and the app preview, the 32 designs, the connectors and
the plugin's adapters, notifications and Send later, Analytics, the build
pipeline and publishing, teams, plans per app, the admin.

The order follows value and dependencies: first measure and watch (so later
priorities come from real numbers, area 18), then make the data safe, then
what a new client meets first (integrations, website to app, the editor),
then what keeps them (notifications, analytics, builds, publishing, updates),
then the verticals and agencies. The plans and their prices don't change
(the owner's decision, Phase 94): what is added joins the existing plans.
Each phase is planned in detail (contracts, steps, checks) when it starts;
the steps here say what each delivers.

## Phase 78: Measure and watch (areas 18 and 15)

Nothing records how long a client takes to set up, publish or pay, and only
a failed build alerts the team; jobs, integrations and pushes fail silently.

| | Step | Done when |
|---|---|---|
| [x] | 78.1 Milestones: `client_milestones` (migration 0053, `lib/milestones`): the sign-up with its source (UTM source, medium and campaign, the sending website's host, `from`, the demo apps; kept in the page's memory only, no cookie), each setup step and the setup done, the first build and the first that worked, the first store upload and live, the first plan paid and each renewal. Worked out from the data, so older accounts are filled by the daily job; recorded where each happens; kept when a step is saved again or an app deleted; the demo account left out. The privacy policy says so in three languages | Unit tests on the memory store and MariaDB |
| [x] | 78.2 Admin › Product (`/admin/product`, `lib/admin/product.ts`): sign-ups by month and how many reached each step (setup done, first build, a build that worked, live, paid, renewed), the median days to each, sign-ups by source with how many paid, builds by month (worked, median time, Android and iOS, the stage failed ones stopped at), and clients with a plan running by month with churn, from a daily snapshot (`product_days`, migration 0054) so they keep a history; the demo apps left out | Unit tests (memory store and MariaDB), e2e |
| [x] | 78.3 Watching (`lib/watch`, Admin › Watching): every scheduled job records its runs and the pipeline its polls (`job_runs`, migration 0055); a deep health check (database, media gate, files host, email, the owners' push key, the pipeline and its tokens, each job's last run); alerts (`team_alerts`) for a build waiting for the pipeline over 30 minutes or stopped, a job that didn't run, an app's crash spike and failed pushes, emailed to the team once and shown in the admin menu, closed when the problem goes or marked done | Unit tests (memory store and MariaDB, a fake clock), e2e |
| [x] | 78.4 Errors per app (`app_errors`, migration 0056, `lib/watch/app-errors.ts`): the connected platform failing, unexpected server errors, a WordPress site not answering, the app's own email or WhatsApp failing, codes not sent, webhooks not delivered, card payments that couldn't start or be confirmed and failed pushes, counted per app with when and how often, kept 90 days; Admin › Clients › a client: its Errors and a Timeline (builds, errors, notices, payments, milestones, store statuses, the team's changes) | Unit tests (memory store and MariaDB), e2e |

## Phase 79: Safe data (area 17)

There is no database backup or tested restore, one encryption key with no
rotation, and isolation between clients is checked by hand.

| | Step | Done when |
|---|---|---|
| [x] | 79.1 Backups: the owner's decision, cPanel's own backups of our host (the database, the media folder and the build files) sent to Google Drive; the restore runbook and what cPanel can't hold (a copy of `ENCRYPTION_KEY` kept apart, the Netlify Blobs export `scripts/export-blobs.mjs`) in LAUNCH-CHECKLIST | The runbook and a restore that worked, LAUNCH-CHECKLIST |
| [x] | 79.2 Key rotation: every encrypted value names its key's ID (`v2.<key id>.…`, values of before still open), `ENCRYPTION_KEY_OLD` keeps old keys readable, the rekey job (`lib/jobs/rekey.ts`, from the frequent job) moves every stored value to the current key, finding its context among the platform's (`CONTEXT_TEMPLATES`), and Admin › Watching says when the old key can go; a `BUILD_PIPELINE_TOKEN` shorter than 32 characters is flagged there (the pipeline already only gets keys while a build runs); the steps in LAUNCH-CHECKLIST | Unit tests (memory store and MariaDB) |
| [x] | 79.3 Isolation tests (`tests/unit/isolation.test.ts`, `tests/e2e/isolation.spec.ts`): every Owner API path naming an object, called with another client's objects (on the caller's own app and on theirs), and every hosted API path naming an object (with another client's IDs, with another customer's things in the same app, and with another app's token): never a 2xx, never their data, their rows unchanged, and a new ID a path names fails the test until it has an object; the dashboard given another client's app in an email's link or in its cookie stays on the client's own. The Owner API now refuses another client's app on every path centrally | A test that fails when a route leaks |
| [x] | 79.4 CI: dependency updates and code scanning, actions pinned, scripts limited by CSP (69.12, 69.14). Next.js 16.3.8 → 16.4.2 (a critical advisory: remote code execution in the image optimizer and `use cache`, and a denial of service with server actions), Dependabot weekly for npm, Composer, pub (both apps), Bundler and the actions, CodeQL on TypeScript and the workflows, 69.14 and 69.12 | CI |

## Phase 80: One place for integrations (area 6)

The site or platform, payments, the senders, push and the stores each live on
their own page, nothing re-checks them, and a broken one isn't noticed.

| | Step | Done when |
|---|---|---|
| [x] | 80.1 Dashboard › Integrations: every connection of the app (website or platform, payments, WhatsApp and email senders, Firebase and Huawei push, each store) with its state, last check, a Test button and its recent errors | e2e |
| [x] | 80.2 Checks on a schedule: each connection re-checked daily; a WordPress site that stops checking in, a revoked platform token or failing payment keys tell the owner (bell, email) and the team | Unit tests |
| [x] | 80.3 Retry: account webhooks sent again (49.8), payments left pending checked with the provider | Unit tests |
| [x] | 80.4 Shipping: shops without a website ship to any country with any carrier; no carrier account is needed: the shop adds the tracking link, the waybill or the tracking number to the order, the customer follows it in the app (owner's decision, 2026-10-22: every country, every plan with a shop) | Contract, tests |

## Phase 81: From a website to an app in minutes (area 1)

Today the client types the app's colours, uploads its logo and builds its
pages by hand; nothing reads their website.

| | Step | Done when |
|---|---|---|
| [x] | 81.1 Site scan: from a URL, the name, logo, icon, colours (theme colour, CSS), fonts (matched to the app's fonts), the platform (WordPress and its plugins, Shopify, Salla, Zid, Wix, ikas…) and the app type; through the server's safe fetch | Unit tests on saved pages of each platform |
| [x] | 81.2 The plugin reports the site's logo, icon, theme colours and menus | PHPUnit |
| [x] | 81.3 One step to a draft app: the URL gives a draft with the brand, the right design and the site's menu as tabs and pages, ready to edit and preview. Choose app type › "Start from your website" makes the new app: its type, name, colours, font, logo and a design for its kind, the menu's entries the design has no screen for as pages showing the site's own (tabs while there's room, else links on the home page); the editor opens on the draft, nothing published. On every plan | `site-draft.test.ts`, `site-start.spec.ts` |
| [x] | 81.4 Import for apps without a connector: products, services, menus and courses from a CSV or a feed. "Import from a file" on Products, Services and Courses: a CSV file (commas, semicolons or tabs; columns named in English, Turkish or Arabic), a product feed link (RSS or Atom, Google Merchant Center's `g:` fields) or a Google Sheet's link; checked first (the columns found, the first rows, the rows with errors, in the forms' own words), then imported: a row naming what exists updates it (a product by SKU, else by name), the rest are added, categories found or added, pictures read while there's time. 500 rows a time; on every plan | `import.test.ts`, `import.spec.ts` |

## Phase 82: An editor you see as you edit (area 2)

Pages & look edits a list with an approximate preview; the real app preview
is another page.

| | Step | Done when |
|---|---|---|
| [x] | 82.1 The real app inside the editor: the draft reaches the preview as it changes, without reloading. Pages & look shows the app preview with the draft beside the editor (hosted apps), the quick view one click away; each save tells the app in the frame, which reloads its tabs and pages in place | `phase82_test.dart`, `live-editor.spec.ts` |
| [x] | 82.2 Click a block on the phone to edit it; drag blocks from the palette onto the phone. In the quick view a block clicked (or chosen with the keyboard) opens in the editor's list, in view; a block from Add a block dropped on the phone goes before or after the block it falls on (at the end below the last) | `live-editor.spec.ts` |
| [x] | 82.3 Sizes: small phone, phone, tablet; Android and iPhone; light and dark side by side. The real app beside the editor at each size; the app preview takes `os=android|ios` and runs as on that system, its rules included (no purchase buttons on an iPhone); light and dark show two apps side by side, both following the draft | `phase82_test.dart`, `live-editor.spec.ts` |
| [x] | 82.4 Undo and redo, publish history and going back to an earlier version. Undo and Redo (and Ctrl+Z, Ctrl+Shift+Z outside the fields) step through the draft's changes, typing within a second one step, 50 kept; each publish is kept (the last 20, `app_layout_versions`, migration 0061) with when and who; any of them becomes the draft again, what's published staying until the next publish | `layout-history.test.ts` (memory and MariaDB), `live-editor.spec.ts` |
| [x] | 82.5 Style per block (background, spacing, colours within the brand), your own icons, a side menu as well as tabs. Each block's Background (none, a light wash of the main colour, the main or the second colour, the colour of cards) and Spacing; the owner's own picture for a tab, a side menu entry or a quick link (https, from the media library), the list icon staying for an app that can't show it; a side menu of up to 12 entries, translated like the tabs, opened from the menu button at the top of the pages in the tabs or from the screen's edge. Hosted API, plugin 0.4.11 and the app | `pages.test.ts`, `RichBlocksTest.php`, `phase82_test.dart`, `live-editor.spec.ts` |

## Phase 83: Blocks as components (area 4)

A new block touches six places, and older apps skip it without the owner
knowing.

| | Step | Done when |
|---|---|---|
| [x] | 83.1 One definition per block (fields, limits, the app version that shows it, what older apps show instead) drives the validator, the editor's form and the preview. `lib/pages/blocks.ts`: each block's name, hint, icon, group, its texts' longest lengths, its lists' sizes, `since` (the first app version that shows it) and `olderApps`; the validator's limits, the editor's fields (their longest length) and "Add a block" come from it, and the preview draws a block it has no picture for from it | `block-definitions.test.ts` |
| [x] | 83.2 The app's version per device: the editor says how many people won't see a block until they update. From the app's usage statistics: the phones that opened the app in the last 30 days, each by the version it last used (`countAnalyticsVersions`, `lib/pages/reach.ts`); a block (and "Add a block") whose `since` is newer than some of them says how many | `block-definitions.test.ts`, `analytics-mysql.test.ts`, `analytics.spec.ts` |
| [x] | 83.3 Switches per app for modules and new features, without a build. Admin › the client › App switches (`switches.edit`): the chat module and the new side menu, block backgrounds and spacing, and own icons, each on unless turned off (`apps.switches`, migration 0062). The platform leaves out what is off (`Config.chat`, the pages, the plugin's layout) and sends them as `Config.switches` and `LicenseStatus.switches` (plugin 0.4.11), and the app follows them too | `app-switches.test.ts`, `pages.test.ts`, `AppSwitchesTest.php`, `phase83_test.dart`, `live-editor.spec.ts` |
| [x] | 83.4 Connectors and adapters with versions and a documented way to add one. `docs/CONNECTORS.md`: each connector's version and the API it reads (`CONNECTOR_VERSIONS`), each adapter's (`ADAPTER_VERSION`), how versions go up and how to add either. The plugin (0.4.11) sends the versions of the adapters a site uses (`SiteInfo.adapters`); Admin › the client shows both | `connector-versions.test.ts`, `AdapterVersionsTest.php` |

## Phase 84: More templates (area 3)

| | Step | Done when |
|---|---|---|
| [x] | 84.1 Services and companies: a new kind with its designs. The `services` vertical on the bookings engine (cleaning, repairs, consultancies, agencies): in the app type picker, the contracts, the plugin and the app; three designs with About us, Offers and Contact pages as well as the home page; its Solutions page and the counts on the website in en/ar/tr; the site scan suggests it | `kinds.test.ts`, `designs.test.ts`, `translations.test.ts`, `site-scan.test.ts`, `vertical_test.dart` |
| [x] | 84.2 Designs with several pages (about, contact, offers) and colour palettes; pictures for the designs (33.8). Every design has About us and Contact pages (the services designs Offers too), in the side menu when no tab opens them; three colours to choose on each design's card (its own, then two of six palettes), the main colour going to the app too; Yallapp's picture library (plain shapes in the palettes' colours, `public/design-pictures`) in "Choose from Media" for slides, banners and images | `design-pages.test.ts`, `designs.test.ts`, `designs.spec.ts` |
| [x] | 84.3 Saved sections: save blocks as a section and reuse them in other pages and apps. On a page, "Save blocks as a section" keeps the chosen blocks under a name (checked like a publish; up to 10 blocks, 30 sections an account, `saved_sections`, migration 0063); "Your sections" in Add a block adds copies to any page of the account's apps, without the blocks that app doesn't have | `sections.test.ts` (memory and MariaDB), `live-editor.spec.ts` |
| [x] | 84.4 The team adds and edits designs in the admin. Admin › Designs (`settings.edit`): a design made from an app's draft (built in its Pages & look; the app's ID is on the client's page), for that app's kind, checked like a publish; renamed, described or deleted; built-in designs hidden or shown. Owners choose them with the built-in ones (the `designs` setting, `lib/pages/designs/catalog.ts`) | `team-designs.test.ts`, `live-editor.spec.ts` |

## Phase 85: Notification campaigns (area 5)

The owner's decision (2026-10-22): campaigns and automatic notifications
come with every plan, within each plan's monthly notifications as today.

Sends go to everyone, only from hosted apps; automatic pushes aren't
measured; several useful automatic pushes don't exist.

| | Step | Done when |
|---|---|---|
| [x] | 85.1 Audiences: buyers, a course's students, members, people inactive for a while, by language, platform and country. `lib/hosted/audiences.ts`: the kinds each app has, checked and resolved to people; the app sends its language with `PUT /me/push-token` and the country comes from the request (never the IP), both on `hosted_devices` (migration 0064); the data safety guide in en/ar/tr | `openapi.yaml`, `audiences.test.ts` (memory and MariaDB), `huawei_push_test.dart`, `push_registration_test.dart` |
| [x] | 85.2 Campaigns: draft, send now, later or every week, a screen or link to open, a picture; sent, failed and opened per campaign. Dashboard › App notifications › Campaigns (en/ar/tr): the audience's size as it's chosen; a page of the app or a web address; a picture from Media; each send's people, phones reached and missed, and opens from analytics; the frequent job sends the due ones once each (migration 0065). The inbox and the push carry `link` and `image_url`; the app shows the picture and opens web addresses in the browser | `campaigns.test.ts` (memory and MariaDB), `hosted-api.spec.ts`, `phase85_test.dart` |
| [x] | 85.3 Automatic: a new lesson, an appointment confirmed and a reminder before it, a class or event soon, a membership ending, a cart left, the daily study reminder; each one counted. Once per person (`auto_notices`, migration 0066), in the phone's language (en/ar/tr), counted by kind (people, phones, opens); each on or off on App notifications (en/ar/tr); the app reports its cart's item count (`PUT /me/cart`) and opens each kind's screen | `auto-notifications.test.ts` (memory and MariaDB), `phase85_test.dart` |
| [x] | 85.4 WordPress apps: campaigns from the dashboard through the plugin, which reports what it sent. Campaigns in the dashboard's menu for WordPress apps (to everyone); a signed `POST /campaigns/send` to the site (plugin 0.4.12: the inbox with the link and picture, the pushes in cron batches, the same send once) and `POST /campaigns/report` back with the phones reached and missed (migration 0067); a site that can't be reached or an older plugin keeps the draft | `campaign-site.test.ts`, `CampaignRequestTest.php`, `campaign-check.php` (integration suite) |

## Phase 86: Analytics with the business's real numbers (area 7)

| | Step | Done when |
|---|---|---|
| [x] | 86.1 Sales over any period: orders, revenue, refunds, enrolments, bookings, tickets, donations; conversion as paid orders over views | Unit and e2e tests |
| [x] | 86.2 Where people come from: store, link, QR code, campaign (UTM) | Contract, tests |
| [x] | 86.3 Notifications' results in Analytics, also the automatic ones | Unit tests |
| [x] | 86.4 A weekly summary by email; WordPress sites send their sales totals | Tests, PHPUnit |

## Phase 87: Builds that explain themselves (area 8)

| | Step | Done when |
|---|---|---|
| [x] | 87.1 Checks before a build: icon, Firebase files and package names, Apple key and certificates | Unit tests |
| [x] | 87.2 Why a build failed, in plain words with what to do, and a log the client can read | Pipeline tests |
| [x] | 87.3 Each build records the app code it was made from; rebuild build N as it was | Contract, tests |
| [x] | 87.4 Automatic builds only for changes that need one, several saves in one build | Unit tests |

## Phase 88: Publishing without surprises (area 9)

| | Step | Done when |
|---|---|---|
| [x] | 88.1 Ready to submit: one check of everything the stores ask (reviewer sign-in, privacy page, account deletion, no prices on iOS, listing, screenshots) | Unit and e2e tests |
| [x] | 88.2 Listings sent to Google Play and the App Store with every language, tablet screenshots and framed screenshots | Pipeline tests |
| [x] | 88.3 Review status read from the stores; a rejection with its reason, the fix and a link to the setting | Unit tests |

## Phase 89: Updates you can undo (area 10)

| | Step | Done when |
|---|---|---|
| [x] | 89.1 Minimum and recommended version for every app, the right store per install, the App Store link | Contract, Flutter tests |
| [x] | 89.2 Staged releases: a share of users first, stop, continue (Google Play, App Store phased release) | Pipeline tests |
| [x] | 89.3 Going back: release an earlier build again, restore settings and pages from history; versions in use | Unit tests |

## Phase 90: Academies, complete (area 11)

| | Step | Done when |
|---|---|---|
| [x] | 90.1 Academies without a website: quizzes, certificates, lessons with files, drip and access that ends | Contract, tests |
| [x] | 90.2 Progress for the teacher: each student's progress and quiz results, export | e2e |
| [x] | 90.3 Memberships and subscriptions from the site (Paid Memberships Pro, WooCommerce Subscriptions, LearnDash groups) | PHPUnit, integration suites |

## Phase 91: Shops, complete (area 12)

| | Step | Done when |
|---|---|---|
| [x] | 91.1 Coupons in shops without a website, and the real total in the app's cart everywhere | Contract, tests |
| [x] | 91.2 Shipped, with tracking; order pushes from WooCommerce and the connected platforms | Tests, PHPUnit |
| [x] | 91.3 Returns requested in the app | Contract, tests |
| [x] | 91.4 Loyalty points (owner's decision, 2026-10-22: every plan but Starter) | Contract, tests |
| [x] | 91.5 Variations and taxes in shops without a website | Tests |

## Phase 92: Agencies (area 13)

Postponed (the owner's decision, 2026-10-22): agency accounts come later,
once the rest of the program is done, arranged separately then.

| | Step | Done when |
|---|---|---|
| [ ] | 92.1 An agency account with its clients under it, and every app's state, renewal and alerts on one page | e2e |
| [ ] | 92.2 The agency pays for its clients' apps at the plans' prices, one statement | Tests |
| [ ] | 92.3 Copy an app, save an app as a template | e2e |
| [ ] | 92.4 The dashboard and emails in the agency's name (white label) | e2e |
| [ ] | 92.5 Roles the owner defines | Tests |

## Phase 93: A client finishes on their own (area 14)

Planned in detail (2026-10-26), from what the dashboard already has: the
setup steps and their card on the overview, Ready to submit (88.1) on the
Publishing page only, links to the docs from a few pages, a filter of the
docs' titles, and problems told on their own pages, the bell and emails.

- 93.1 The overview's **Your first app**: one list from the app type to a
  store showing the app (the five setup steps, the plan activated, a first
  build, Ready for the stores with how many of its checks are missing, on
  the stores), each done, next, waiting (a build running, our team
  publishing) or to do, with where to do it. It takes the setup card's
  place until the app is live; the owner can hide it and show it again
  (`apps.guide_hidden_at`).
- 93.2 A help link in every dashboard page's header to its article, in the
  dashboard's language; a search of the docs' whole text on /docs; the
  articles missing today (Integrations, Stability, Team, Yallapp Business,
  Protection, two-step sign-in, deleting an app, links that open the app,
  Ready to submit, problems with builds and connections), in English,
  Arabic and Turkish.
- 93.3 One list of the app's problems on the overview (connections, the
  checks before a build, the last build failed, a store's rejection, what
  the stores still miss, the plan), each with its fix, and their count on
  the nav's Overview link.

| | Step | Done when |
|---|---|---|
| [x] | 93.1 A guide through the first app, with how ready it is for the stores | e2e |
| [x] | 93.2 Help on every page, search inside the docs, the missing articles | e2e |
| [x] | 93.3 Problems shown where the client works (from Phases 78 and 80) | e2e |

## Phase 94: What each plan includes (area 16)

The owner's decision (2026-10-22): the plans and their prices stay as they
are, for clients old and new. What this program adds joins the existing
plans at the same prices (as the chat joined Pro and Business), and each
step says which plans get it before it is built.

The owner's choices so far (2026-10-22): Integrations, the daily checks and
the retries (80): every plan. Shipping (80.4): every plan with a shop, every
country. Notification campaigns (85): every plan, within its monthly
notifications. Loyalty points (91.4): every plan but Starter. Agencies (92):
postponed.

Planned in detail (2026-10-26): the pricing page already compares every
plan's features and limits (the comparison table, with loyalty points and
chat); the overview lists what the app's plan includes and Upgrade for the
rest. 94.1 adds **What you pay for** to the app's Plan page: its plan and
price, what the app uses of each limit (app users on the hosted API,
languages, Media storage with its packs) with a bar that warns when nearly
or fully used, how long analytics are kept, what the plan includes, what a
higher plan adds, and every app of the account with its plan, price and end.

| | Step | Done when |
|---|---|---|
| [x] | 94.1 What you pay for and why, per app and account: each plan's features, limits and what is used of them, in the dashboard and on the pricing page | e2e |

## Phase 95: The admin's settings and invoices

The owner's request (2026-10-26): the Settings page holds every setting on
one long page; each kind gets its own page (payments and gateways, email,
the sign-in code sender, and the rest), set on its own. And a page with
every invoice, where the team also makes one for a client who paid by bank
transfer.

The owner's choices (2026-10-26): a bank-transfer invoice is made once the
money has arrived (it is recorded as paid; there are no unpaid invoices),
it activates or extends the app's plan like a card payment, and the client
gets it by email as a PDF, as after a card payment, and finds it on their
Plan page.

| | Step | Done when |
|---|---|---|
| [x] | 95.1 Settings, one page each: Payments (the gateway for plans, Yallapp's iyzico, Kashier and Fawaterk accounts), Email, Sign-in codes, Contact & publishing, Invoices, Store platforms, New apps and Server, with tabs between them; the first settings page lists them with what's set now | e2e |
| [x] | 95.2 Admin › Invoices: every invoice (card, coupon and bank transfer) with its PDF; a new bank-transfer invoice for a client's app (plan, months, amount, the bank's reference) activates or extends the plan and emails the PDF | e2e |

## Phase 96: Every client's own gateway, and receipts in the app

The owner's decision (2026-10-26): Yallapp takes no commission, receives no
money for anyone and is not a payment intermediary. Each client signs up with
a gateway and enters its keys themselves; customers pay the client directly.
Clients can also use Stripe and PayPal, bank transfer, and a custom payment
method whose details they write themselves. Recurring donations are between a
charity and its gateway, not Yallapp's (29.6 closed); 47.10 is closed too.
Customers find the receipt for tickets, paid courses and memberships in the
app, not only in their email.

| | Step | Done when |
|---|---|---|
| [x] | 96.1 Stripe and PayPal as the client's own gateway, next to iyzico, Kashier and Fawaterk: the keys are checked and kept encrypted, the customer pays on Stripe Checkout or PayPal, and Yallapp reads each payment back (and captures PayPal's) before the order is paid; refunds through their APIs | e2e |
| [x] | 96.2 Bank transfer and the client's own method (cash on delivery, a wallet): the client writes the details, the customer picks it on the pay page and sees them there, by email and in the app, and the order waits under Waiting for payment until the client marks it paid (then it is delivered like a card payment, with the receipt) or cancels it; also in Yallapp Business. Donations stay card-only | e2e, unit and Flutter tests |
| [x] | 96.3 Receipts in the app for tickets, paid courses and memberships: Events apps, Academy apps and gyms without a website list them under My orders (`GET /me/orders`, `features.orders`), each with its receipt, as shops do (courses on Android only, where they're sold) | Unit and Flutter tests |
| [x] | 96.4 Receipts in the customer's own language: the app's language at checkout is kept on the order or donation (`lang`), and the receipt email's PDF and its link use it when the app has that language | Unit tests |

## Phase 97: Every free font, your own font, and a Figma mode

The owner's decisions (2026-10-26): no Figma approval of any kind (no OAuth
app, no Figma Community plugin). A client brings a design from Figma in two
ways:
- the file's link with their own Figma personal access token, used once for
  that import and never stored;
- files exported from Figma: a design tokens JSON, the logo and pictures.

Figma's limits are the client's (their seat and their file's plan; a file on
Figma's free plan allows about 6 reads a month), so the link import says so
plainly, and the upload import has no limits. Every free font (Google Fonts)
and uploading one's own font (with the client confirming its licence allows
use in apps) come to every plan.

The Figma mode is entirely separate from the standard look. It keeps its own
look (colors, fonts, logo, pictures) apart from the standard one; switching
between the modes never changes the other's settings. In the Figma mode the
look comes from the file only. Everything lands in the draft; nothing is
published until the client publishes.

| | Step | Done when |
|---|---|---|
| [x] | 97.1 Every Google font: a catalog made from github.com/google/fonts (family, category, weights, Arabic or not; 1,976 families, files up to 5 MB), the files served from Yallapp (copied once, never loaded from Google in the browser or the app), a picker with search, an Arabic filter and a preview in Branding, the page editor and the admin's defaults, and an Arabic font for the app's Arabic text. The app keeps the six bundled fonts and downloads a chosen font once from Yallapp (kept on the phone), showing the closest bundled font until then; plugin 0.4.19 passes the fonts on. The site scan takes the site's own font when it's a free one | Unit, e2e and Flutter tests |
| [x] | 97.2 Your own font: upload TTF or OTF files (up to four weights), with "I have a licence to use this font in apps"; checked as a font, counted in Media storage, used like any other (TrueType or OpenType; WOFF, collections, italic files and fonts whose own settings forbid embedding are refused; up to 10 per app, in Pages & look; files are assets, deleted with the app) | Unit and e2e tests (the app loads them like 97.1 fonts) |
| [x] | 97.3 Figma mode, separate from the standard look: its own saved look and a switch between the two in Branding; import from files exported from Figma (design tokens JSON in the common formats, the logo and pictures), with a preview to choose from before applying (the draft keeps `figma_look` and `look_mode`; in the Figma mode the app gets the file's colors, font, corners and logo, the standard look staying as it was; tokens in the W3C format Figma exports its variables in, Tokens Studio, Style Dictionary and variable lists; the pictures are offered in the editor's Choose from Media; plugin 0.4.20 passes the main color and logo on) | Unit, e2e and Flutter tests |
| [x] | 97.4 Figma mode from a link: the file's link and the client's personal access token (used once, never stored); colors and text styles, frames to pick the logo and pictures from; Figma's limits and errors explained (the token goes to Figma's API in its header only, stays in the page's memory between reading and importing and is cleared when the look is saved; variables too when Figma lets the token read them; frames drawn by Figma as PNG; 30 reads an hour per account; the owner's own try is in the launch checklist) | Unit and e2e tests against a fake Figma API; tried by the owner on a real file |
| [x] | 97.5 Figma frames as pages: frames read from a link and marked Page become pages of the app with real blocks (texts, buttons, a search field, a picture with a heading as a Banner, pictures and rows of cards drawn by Figma as Images), the status bar, top bar and tab bar left to the app; the tab bar's labels can become the app's tabs; buttons and tabs open the page or screen their words name; added to the draft as one step, with the page editor (not on Starter) | Unit and e2e tests against a fake Figma API |

## Phase 98: Speed

The owner found Yallapp Business, the demo apps and the dashboard slow to
answer. Every request that reads data goes from Netlify's functions to MySQL
on host.webek.org, one query at a time, so each query costs a round trip
between them. Measured locally through a link with 80 ms round trips.

| | Step | Done when |
|---|---|---|
| [x] | 98.1 Fewer round trips: a warm function keeps its database connection for the next request (30 seconds, with keep-alive) instead of opening one each time (TCP, TLS and sign-in); Yallapp Business's sign-in check reads the person's businesses once (owner requests 9 → 6 queries before their own); today's analytics are counted again only when new events came since (Today 27 → 15 queries, Analytics 34 → 22). Through 80 ms round trips: /me 957 → 661 ms, Orders 788 → 662 ms, Today 1,449 → 1,323 ms | Unit and e2e tests; the owner checks that Netlify's functions region is the one closest to host.webek.org (LAUNCH-CHECKLIST) |
| [x] | 98.2 Start from your website without assuming WordPress: a site that isn't on WordPress (as the scan says) makes an app whose content is added in the dashboard (the Website step's own content, done), not one waiting for the plugin; the Website step's "I don't have WordPress" is "Set up WordPress for me" (our team builds a WordPress site), with a line pointing a site that isn't on WordPress to the own content choice | e2e (site start, set-up requests, starter flow) |

## Phase 99: Better designs and editor

The owner asked for better ready-made designs, a way for an app that
already has a design to move to another, and more ways to shape pages in
the editor.

| | Step | Done when |
|---|---|---|
| [x] | 99.1 Each design looks like itself: its own main colour with its second one (`designs/colours.json`), offered first, then "Your main colour" (the owner's, with the design's second) and one of `PALETTES`; two pictures of its own in those colours (`public/design-pictures/<design>-1.jpg`, `-2.jpg`) on its slides, and a banner welcoming to the app on a home page that has neither slides nor a banner; the Contact page gets a Social links block with the profiles the app's pages already have | Unit tests (each design's colours, pictures and social block pass the validator) |
| [x] | 99.2 Switch design: "Use this design" opens a panel with "Everything" (its pages, tabs and look; "Keep my other pages" keeps the draft's pages it doesn't have, in the side menu) or "Look only" (its colours, font, corners and cards; the pages, tabs and the design the app started from stay), the draft before and after side by side; after it, "Undo" brings back the draft, the main colour and the design from before. The Branding step offers "Its pages and look" or "Its look only" for an app with pages of its own | Unit tests (look only, pages kept), e2e (look only, undo, everything with a page kept) |
| [x] | 99.3 Editor: each block's text position (start, centre, end), text size, corners (as the app, sharp, round) and picture fit (fill or the whole picture), with its background and spacing (82.5) and the image's shape; "When it shows": between two dates, on Android or iPhone only, in some of the app's languages (the hosted API and the plugin 0.4.21 leave the block out otherwise, and never send the rules); "Copy to another page" for a block, or for the blocks picked under "Save as a section"; page settings: background (as the app, tint, cards' colour), a picture across the top, in the side menu or not. The quick view shows all of it; the app shows the look, the page background and picture | Contract (`BlockLook`, `AppPage`, `LayoutBlock.show`), unit tests (platform, plugin, app), e2e |
| [x] | 99.4 New blocks: Cards (2 or 3 columns, each with a picture, title, text and tap), Photo gallery (opens full screen to swipe through), Location (name, address and Directions in the phone's maps app; no map tiles), Divider (line, dashed, dots), Form (up to 10 questions: short or long text, email, phone, number, a choice; answers by email through `POST /forms/{slug}/{block_id}` — the hosted API to the app's support email, else the owner's; the plugin 0.4.22 to its support email, else the site's admin — or into Chat for a signed-in person); in the editor, the quick view, the app and the app preview | Contract, unit tests (platform, plugin, app), e2e (each block in the editor and the app API, a form's answers checked and sent) |

## Phase 100: Courses and memberships bought in the app (Google Play Billing, App Store In-App Purchase)

Google Play and the App Store require their own billing for digital content
sold in an app (courses, and memberships or subscriptions that open
courses), outside the few places and programmes that allow other ways.
Until now iOS showed no purchase buttons and Android opened the website's
checkout. The owner chose: the store price starts at the site price
(the nearest price the store accepts) and can be changed per course or
plan; every plan but Starter sells in the app (Starter apps show no
purchase buttons for digital content on either platform); courses and
memberships together. Apps are published under the client's own store
accounts (also with "We publish for you"), so the stores pay the client;
Google and Apple keep their fee. Physical goods and services (shop
products, restaurant orders, appointments, tickets to a venue, gym
memberships, donations) keep the payment page.

Every source keeps working: Yallapp's platform checks each purchase with
Google or Apple and then gives access where the course lives: the hosted
API directly, a WordPress site through the plugin (enrolment in the LMS, a
Paid Memberships Pro level, a LearnDash group, and a WooCommerce order for
the books), Teachable and Thinkific through their APIs, and an app on its
own API through a signed `purchase.completed` webhook. Refunds and ended
subscriptions take the access back.

| | Step | Done when |
|---|---|---|
| [x] | 100.1 Contract: what the app buys (each paid course's and membership plan's store products, `Config.store_billing`), `POST /store/purchases` (a Google purchase token or an Apple signed transaction) and restore, on Yallapp's hosted API for every app (like the chat), under `/billing/` (`GET /billing/products`, `POST /billing/purchases`, `POST /billing/purchases/restore`, the plugin's `POST /billing/session`); `CourseDetail.purchase.action` `store` with its product, and the store products of the plans that open a course; the stores' notifications to the platform (one Yallapp Pub/Sub topic for Google at `/billing/notifications/google`, and `/billing/notifications/apple/{app_id}`; refunds and renewals are also read from Google every hour); the plugin's catalog (`POST /billing/catalog`), its sessions and the platform asking it to give or take access (`POST /billing/access`, signed with the license key); `LicenseStatus.store_billing`; the `purchase.completed` and `purchase.revoked` notices for apps on their own API; Android's website checkout no longer offered for paid courses | redocly lint |
| [x] | 100.2 Store connections and products: Dashboard › In-app purchases (en/ar/tr): the client's Google Play service account and App Store Connect keys, kept encrypted and checked; a store product for each paid course (one-time) and membership plan (subscription, monthly or yearly), made and kept in step through the Google Play Developer API and the App Store Connect API, at the nearest store price to the site price, changeable per product; their state in the stores | Unit tests against recorded API answers; e2e of the dashboard |
| [x] | 100.3 Purchases: each purchase checked with Google (Play Developer API) or Apple (App Store Server API, signed data checked against Apple's root certificate), recorded once, acknowledged, access given on the app's source; refunds, revocations, renewals and expiries from Google's real-time notifications and Apple's App Store Server Notifications | Unit tests with recorded store answers and notifications; isolation tests |
| [x] | 100.4 Plugin: give and take access when the platform asks (all supported LMS plugins, Paid Memberships Pro, LearnDash groups, a WooCommerce order marked paid by the store) | PHPUnit, integration suites |
| [x] | 100.5 App: buying through Google Play Billing and StoreKit (`in_app_purchase`) on both platforms, the store's own price, restore purchases, managing a subscription in the store, the subscription terms Apple asks for; the website checkout no longer offered for digital content | flutter analyze, unit and widget tests, the app preview rebuilt |
| [x] | 100.6 Sales and guides: in-app sales, refunds and renewals in Analytics and Yallapp Business; the guides to connect each store (en/ar/tr); the terms | e2e; docs |
| [x] | 100.7 Apps on their own API and schools on Teachable or Thinkific: the owner's list of what the app sells (products made in the stores as in 100.2), access through the signed `purchase.completed` and `purchase.revoked` notices (own API) and the platforms' enrolment APIs | Unit tests with recorded answers; e2e of the dashboard |

## Phase 101: Header types

The owner asked for several app headers to choose from in the regular
editor, each with the buttons they pick; the account button opens the
customer's account and settings.

| | Step | Done when |
|---|---|---|
| [x] | 101.1 Pages & look › Look › Header: Title (the template's, with the buttons above the title), Centered (one bar, the page's title in the middle), Logo (the app's logo, the title under it) or Search (the logo with a search field under it that opens the app's search); up to four buttons from search, cart, notifications, chat and account, offered as the app's type has them (the chat's shows while the chat is on; the cart and the chat show their counts); `Appearance.header` (`AppHeader`) to the app from the hosted API and the plugin 0.4.24; the quick view and the app show it on the pages in the bottom tabs, pages opened on top keep their back button | Contract, unit tests (platform), plugin integration suite, flutter analyze and widget tests |

## Phase 102: A store review account in every app, required

Google Play (App access) and the App Store (App Review Information) sign in
to an app before they accept it, and turn it down when they can't. Until
now only apps on the hosted API had to set a review sign-in; the owner
asked to make it required for every app, with the steps to give it to the
stores.

| | Step | Done when |
|---|---|---|
| [x] | 102.1 Dashboard › Publishing › Store review account (en/ar/tr), in every publishing mode: apps whose sign-in Yallapp runs show App sign-in's fixed review number or email with its code; WordPress sites and own APIs save the user name or email and password of an account made for the reviewers (or the plugin's review access email and fixed code), the password encrypted and shown only when asked, with notes for the reviewers; the steps for Google Play Console and App Store Connect; Ready to submit marks it missing until set (notes alone no longer count); a build stops on it before it is queued (the first build after the setup still runs); the publishing team sees it in Admin › Publishing; the guides point to it | Unit tests (the account, readiness, the checks before a build), e2e (publishing, client flow) |

## Phase 103: Yallapp Studio

A separate mode for owners who want to design every screen freely: a
canvas where they place, size and style layers (shapes, texts, pictures,
buttons, icons and lists from their data) by dragging, like a design tool.
The app draws it natively from data, scaled to the phone's width, from the
same sources as the regular editor (WordPress, Shopify and the other
platforms, no website, own API). Studio comes with the plan feature
`studio`, off on every plan until the team turns it on (Admin › Plans):
Studio's own plans and prices are the team's to set there.

| | Step | Done when |
|---|---|---|
| [x] | 103.1 Contract: `AppPage.canvas` (`StudioCanvas`: design width, height, background and layers; `StudioLayer`: box, text, image, button, icon and items, each with its frame, style and tap action; an items layer carries its list like the items block); the plan feature `studio` | redocly lint |
| [x] | 103.2 Platform: a page's canvas checked and kept in the layout, served by the hosted API (lists filled from the app's source) and sent to the plugin; a canvas only with `studio` on the app's plan | Unit tests |
| [x] | 103.3 Dashboard › Studio (en/ar/tr): the pages, a page made a Studio page; the canvas editor: add layers, drag to move, resize from the corner, arrows to nudge, layers in order (front, back, duplicate, delete), a panel for the selected layer's frame, colours, corners, border, opacity, text, picture, icon, list and tap action; starting canvases (Studio templates); saved in the draft and published like the rest | e2e |
| [x] | 103.4 App: a Studio page drawn natively from its canvas, scaled to the screen's width, scrolling, with taps and lists from the source | flutter analyze and widget tests |
| [x] | 103.5 Plugin 0.4.25: a page's canvas served to the app, its lists filled from the site, its texts translated | composer lint, the plugin's integration suite |

## Phase 103R: Yallapp Studio as the owner approved it

The owner's review of Phase 103 (28 October): the editor isn't the one in
the approved design, and Studio was built inside the regular editor. What
was agreed instead:

- **A separate section of the same account.** Studio has its own entry,
  its own projects, its own dashboard around them and its own editor;
  nothing of the regular editor is inside it, and the regular dashboard
  shows no Studio page. An account can have regular apps and Studio
  projects side by side.
- **Its own plans.** A family of Studio plans, separate from the regular
  ones, named and priced by the team in Admin › Plans › Studio; a Studio
  project is paid on a Studio plan and a regular app on a regular plan,
  never across.
- **Its own projects and templates.** Studio has project types the regular
  app types don't (delivery and courier companies first, Phase 104), its
  own templates and ready sections; it also takes every regular app type
  and source (WordPress, Wix and the other platforms, no website, own API).
- **The editor in the approved design, in full** (the design "Yallapp
  Studio — المحرر"): the top bar (the page, small phone, phone and tablet,
  the content's language, undo and redo, saved, Preview on the phone,
  Publish); on one side Elements (layout: row, column, layers, grid,
  slider, space; content: text, picture, button, products and every list
  from the data, video, form, map, ratings and more), Ready sections and
  Templates with search, and the page's layers as a tree; the phone in the
  middle on a dotted board with drag and drop anywhere and where it will
  land, the selected element's handles and size, zoom, light and dark, and
  the header's type; on the other side the selected element with copy and
  delete and three tabs: Design (size and place: width fill, hug or fixed,
  height, padding, margin, alignment, pinned to the screen; colours with
  the project's palette; font, weight and size; corners and shadow; what a
  tap opens; Android and iOS), Motion and Data; and "Save the page as my
  own template".
- **Asked before built.** Screens that aren't in the approved design (the
  Studio home, a new project, Studio's plans in the admin) are shown to
  the owner as a design first.

The page is a tree of elements (`StudioNode`), not Phase 103's canvas of
absolutely placed layers: rows, columns, layers, grids and sliders hold
other elements, sized to fill, hug or a fixed size, so a page fits every
phone and tablet. Phase 103's canvas is replaced; it never reached a
client (`studio` was off on every plan).

| | Step | Done when |
|---|---|---|
| [x] | 103R.1 Contract: `AppPage.studio` (`StudioPage`: header, body and background; `StudioNode`: layout and content elements, their style, light and dark colours, motion, data, tap action and platforms), Studio's ready sections and templates; `Phase 103` canvas removed | redocly lint |
| [x] | 103R.2 Platform: Studio pages checked, kept, served by the hosted API with lists filled from the source, sent to the plugin; the account's sections (`App.section`: regular, Studio; migration 0094); Studio plans (`studio_1`–`studio_3`, Admin › Plans › Yallapp Studio, offered when the team turns them on, with Motion, own templates and pages per project), licenses and payment on them, each family on its own apps only; Studio-only project types (the delivery company, 104) | unit tests |
| [x] | 103R.3 The Studio section (the four designs the owner approved): its home with the projects (`/studio`), a new project in three steps (`/studio/new`), the project's dashboard around the editor (`/studio/project`, the dashboard's pages in Studio's frame); a Studio project's dashboard addresses open there | e2e |
| [x] | 103R.4 The editor, as in the approved design, every part working (`/studio/editor`, its own screen apart from the dashboard; "my templates" kept per account) | e2e |
| [x] | 103R.5 App: Studio pages drawn natively from the tree: layout, sizes, colours light and dark, fonts, motion, data lists, taps, platforms | flutter analyze and widget tests |
| [x] | 103R.6 Plugin 0.4.26: Studio pages served to WordPress apps, lists from the site, texts translated | composer lint, the plugin's integration suite |
| [x] | 103R.7 Studio's templates and ready sections per project type: each type's own first (shop, menu for restaurants, courses, services, listings, news, events, charity, delivery), then brand, contact and blank; their main buttons say and open the type's screen; the delivery company's own sections (send a parcel and my shipments, how it works); no categories section where there are none; "my templates" kept per account (103R.4) | unit tests (every template and section, for every project type, taken by the page checker), e2e |

## Phase 104: Delivery and courier companies (Studio project type)

The first project type only Studio has: send a parcel, follow it on the
way, the courier's own screens and the business's dashboard. Agreed with
the owner: every option is built and each company picks its own.

- **Where couriers work**: in the company's app (the Courier tab and
  screens only for the company's couriers, who switch back to the
  customer's screens), in a second courier app under the company's name
  (a bundle, published Unlisted on the App Store), or in the shared
  Yallapp Courier app (built last, published together with the owner).
- **Maps**: stages only, or the courier's position on a live map while the
  parcel is on the way (map tiles set in Admin › Settings › Maps; never
  OpenStreetMap's own tile servers).
- **Prices**: by distance (base, per km, minimum, a longest distance), by
  area, or one fixed price; a service may add to it.
- **Payment**: cash to the courier, card through the company's own payment
  gateway, or both.
- **Jobs**: the company gives each job to a courier, or couriers on duty
  take the waiting ones.
- A Studio project only: made from Studio's new project (never among the
  regular apps' types), its dashboard in Studio as the owner approved it
  (Delivery: Shipments, Couriers, Paid orders, Delivery settings; today's
  shipments and the couriers on duty).
- The plan features `delivery` and `courier_app` (the second courier app)
  are Studio plan features, ticked per plan by the owner in Admin › Plans ›
  Yallapp Studio.

| Done | Step | Checked by |
| --- | --- | --- |
| [x] | 104.1 Contract: the Delivery and Courier tags (`/delivery/services`, `/delivery/quote`, `/delivery/locate`, `/delivery/shipments`, `/me/shipments` with cancel and pay, `/courier/me`, `/courier/jobs` with accept and status, `/courier/location`), `Config.delivery`, `User.roles`, the `shipment_update` and `courier_job` notifications, the `send_parcel`, `shipments` and `courier` screens, the `delivery_services` source, `app_type` `delivery`; the plan features `delivery` and `courier_app` | redocly lint |
| [x] | 104.2 Platform: delivery settings, services, couriers and shipments (migration 0095), prices by distance, area or fixed, maps links read for their place, shipments paid by card through the company's gateway (its catalog payment page) or in cash, jobs given or taken (one courier wins a race), the courier's position kept only while a parcel is on the way and shown for 10 minutes, pushes to the customer and the couriers | `delivery-hosted.test.ts`, `isolation.test.ts` |
| [x] | 104.3 Dashboard (en/ar/tr): Shipments (give to a courier, move on, cancel), Couriers (add by mobile number or email, active, on duty), Delivery settings (prices, areas, payment, map, jobs, where couriers work), Our services; Admin › Settings › Maps | unit tests, tsc, eslint |
| [x] | 104.4 App, customer: Send (service, pickup and drop-off by address, the phone's position, a pasted maps link or the map; recipient, parcel, payment, the price as it is typed), My shipments, a shipment's stages, the courier and their position on the map, pay and cancel | flutter analyze and widget tests |
| [x] | 104.5 App, courier: the Courier tab only for the company's couriers (Account › Courier mode too), on and off duty, my jobs, waiting jobs and done ones, take a job, its steps (picked up, on the way, delivered, couldn't deliver with a reason, give back), cash to collect, calls and directions, the position shared while a parcel is on the way and the screen is open | widget tests |
| [x] | 104.6 The courier app under the company's name: a second build of the same app showing the courier's screens only (build config `role` "courier": the Courier and Account tabs, sign-in first), its own package name and bundle ID (`.courier`), its own name (the company's, else "<app> Courier"), notifications when the company's Firebase files list it (google-services.json for Android, its own GoogleService-Info.plist in Delivery settings for iPhone), a listing for the company's couriers only, published Unlisted on the App Store; Builds has its own section (start, latest build, try again, files), one build at a time across both apps, versions going up in each (migration `0096`) | platform unit tests, flutter widget and tool tests |
| [x] | 104.7 Review accounts for both roles (customer and courier), the notes for the stores written for the company: the App sign-in review number (or email) is also a test courier ("App Review", made the first time it signs in); its parcels go to it only and the company's couriers never see them; in the courier app it always has a sample job; Publishing shows the notes for the customers' app and the courier app, in English, for both stores (and Admin › Publishing for the team) | platform unit tests |
| [ ] | 104.8 Yallapp Courier: one courier app for every company that picks it (last, published together with the owner); built in 104.8.1–104.8.5 below | |
| [x] | 104.8.1 Contract `docs/api/courier.yaml` (the Yallapp Courier API at `/api/courier/v1`, linted in CI like owner.yaml): sign in with a code to the mobile number or email (`/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/sign-out`; Yallapp's own sender from Admin › Settings, never a company's), the companies the person is a courier of (`GET /companies`: every delivery project that chose Yallapp Courier in Delivery settings, whose plan has `delivery`, where an active courier has this number or email; name, logo, colour, on duty, jobs waiting), a session at one company (`POST /companies/{app_id}/session`: the company's hosted API tokens, the hosted user found or made for that number or email, its device marked as Yallapp Courier's); in openapi.yaml, `courier_app` `yallapp_courier` explained (built: courier.yaml with `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/sign-out`, `PUT /me/push-token`, `GET /companies`, `POST /companies/{app_id}/session`, linted in CI; openapi.yaml's Courier tag and `DeliveryConfig.courier_app` explain `yallapp_courier` and the pushes' `app_id`) | redocly lint |
| [x] | 104.8.2 Platform: Yallapp Courier's accounts and devices (migration), sign-in through the platform's sender with its rate limits, the companies list and the session at a company (only couriers of companies on Yallapp Courier; a company that leaves it or pauses the courier ends it at the next call), the company's pushes (`courier_job`, `shipment_update` to couriers) sent to Yallapp Courier's devices from Yallapp Courier's own Firebase project (`COURIER_PUSH_FIREBASE_SERVICE_ACCOUNT`, else Yallapp Business's project's account), a review sign-in for the stores (Admin › Settings › Yallapp Courier: the review number or email and code) that is a courier of Studio's demo delivery company with a sample job (built: `lib/courier-hub` and `/api/courier/v1`, migration 0110 (`courier_accounts`, `courier_devices` with hashed rotating refresh tokens, `courier_challenges`, `hosted_devices.courier_device_id`, `couriers.hub_signed_in_at`); the company session through the hosted API's own `session`, its device Yallapp Courier's, checked on every call; the push token copied to the company sessions, sign-out ending them; `courier_job` to those phones from `COURIER_PUSH_FIREBASE_SERVICE_ACCOUNT` (else Yallapp Business's) with `app_id`) | unit tests, isolation tests |
| [x] | 104.8.3 Dashboard and admin: Delivery settings › where couriers work offers Yallapp Courier (en/ar/tr) with what couriers do (download Yallapp Courier, sign in with the number the company added), the Couriers page says which app each courier uses and when they last signed in to it; Admin › Settings › Yallapp Courier (review account, the store links once published) and Admin › Publishing's notes for Yallapp Courier's own listing (built: Delivery settings › Where your couriers work (their own app or Yallapp Courier, what couriers do, the store links), the Couriers page's app and each courier's last sign-in to Yallapp Courier; Admin › Settings › Yallapp Courier; Admin › Publishing › Yallapp Courier's notes for both stores) | unit tests, e2e |
| [x] | 104.8.4 App: a build of the app as Yallapp Courier (build config `courier_hub`: Yallapp's name, icon and colours, the courier's screens only): sign in to Yallapp Courier, the companies to pick from (one is opened at once), the company's courier screens (104.5) with its name and logo at the top, switching company from Account, each company's session kept, pushes opening the right company's job; English, Arabic and Turkish | flutter analyze and widget tests |
| [x] | 104.8.5 Builds and publishing: the Yallapp Courier build config (package `tr.com.yallapp.courier`), its debug APK in CI next to the others, the store listing texts and the review notes (docs/publishing/yallapp-courier.md); published to the stores together with the owner from Yallapp's own accounts: later, with the owner (not published yet) | CI |
| [x] | 104.8.6 The release workflow: Actions › Yallapp Courier release builds the signed App Bundle and IPA from `mobile/` with `yallapp-courier.json` and uploads them to a Google Play testing track and TestFlight with the listing (`mobile/store/courier`, en/ar/tr), the screenshots (`mobile/test/store`, phones and tablets) and App Review's details, under Yallapp's accounts (the same sign-in as Yallapp Business's release); the Firebase files from Actions variables (`YC_FIREBASE_GOOGLE_SERVICES`, `YC_FIREBASE_SERVICE_INFO`; without one that platform is built without pushes), pushes sent with Yallapp Business's project key; never publishes (docs/publishing/yallapp-courier.md › Releasing) | build/tests, flutter test |

## Phase 105: More Studio project types

Multi-restaurant food delivery, ride hailing, academies with many
teachers, schools and universities, home services, multi-store grocery and
pharmacy delivery, hotels and stays, car rental, laundry. One at a time,
after Phase 104, each a Studio project type on its own Studio plan feature
(off until the owner ticks and prices it in Admin › Plans › Yallapp
Studio), each with its own Studio templates and sections, review accounts
for every role, en/ar/tr, and Yallapp setting none of the amounts (fares,
fees, commissions, tuition): the company sets them.

### 105.1 Food delivery from many restaurants (Studio project type `food`)

A company that runs a food delivery app for many restaurants: customers
pick a restaurant, order from its menu and follow the order to the door;
each restaurant's staff take and prepare its orders in the same app; the
company's couriers deliver them (Phase 104's couriers, jobs and map).
Every option is built and each company picks its own.

- **Restaurants**: added by the company in the dashboard (name, logo, cover,
  cuisines, address on the map, phone, opening hours, how long it takes to
  prepare, the smallest order, active or paused), each with its own menu
  (sections, dishes with pictures, prices and choices like size and extras,
  dishes sold out for the day).
- **Restaurant staff**: mobile numbers (or emails) the company adds to a
  restaurant; they get the Restaurant tab in the app: new orders with a
  sound, accept with the time it needs or turn down with a reason, ready
  for pickup; open or busy for now.
- **Delivery**: the company's delivery prices (Phase 104: by distance from
  the restaurant, by area, or fixed), how far each restaurant delivers, and
  the courier's job made when the restaurant accepts (or when it is ready,
  the company's choice); the customer follows the order and the courier.
- **Payment**: cash to the courier, card through the company's own gateway,
  or both; the company's commission from each restaurant (a percent set per
  restaurant by the company) and a statement per restaurant for any period
  (orders, sales, commission, what is owed either way). Yallapp sets none
  of these amounts.
- **The app**: restaurants near the customer (open first; cuisines,
  search, sort by distance, rating or delivery time), a restaurant's page
  with its menu, one restaurant's cart at a time, checkout with the
  address, notes and payment, my orders with their stages, rating the
  restaurant and the courier after delivery.
- A Studio project only, on the Studio plan feature `food` (with
  `courier_app` for a second courier app, as in 104), off until the owner
  ticks and prices it in Admin › Plans › Yallapp Studio.

| Done | Step | Checked by |
| --- | --- | --- |
| [x] | 105.1.1 Contract: `app_type` `food`; `Config.food`; restaurants (list with filters, one with its menu), the cart's quote, orders (place, mine, cancel, pay, rate), the Restaurant tag (`/restaurant/me`, its orders, accept, turn down, ready, open or busy); `User.roles` `restaurant`; the `food_order_update` and `restaurant_order` notifications; screens and item sources; the plan feature `food` | redocly lint |
| [x] | 105.1.2 Platform: restaurants, their staff, menus and choices, food orders and their courier jobs (a migration), the quote (dishes, choices, delivery by distance from the restaurant, the smallest order), cash or card, commission and statements, pushes | unit tests, isolation tests |
| [x] | 105.1.3 Dashboard (en/ar/tr) in Studio: Restaurants (details, hours, menu, staff, commission), Food orders, statements per restaurant; Couriers and Delivery settings shared with 104 | unit tests, e2e |
| [x] | 105.1.4 App, customer: restaurants, a restaurant's menu, the cart, checkout, my orders with their stages and the courier, ratings | flutter analyze and widget tests |
| [x] | 105.1.5 App, restaurant: the Restaurant tab (new orders, accept with a time, turn down, ready, open or busy); new orders come with the push's sound | widget tests |
| [x] | 105.1.6 Studio templates and sections for food (the welcome section; three ready-made designs: Restaurants, Food offers, Food brand, their buttons opening the restaurants and the steps saying how an order reaches the door), the courier app (104.6) for food companies (`FoodConfig.courier_app`, the choice in Delivery settings, its builds and listing as a delivery company's), the store reviewers' notes for the three roles (the review account orders, takes its own orders as the first restaurant's staff and delivers them; its orders reach no real restaurant or courier) | unit tests, flutter widget tests, e2e |

### 105.2 Ride hailing, like Uber (Studio project type `rides`)

A company that runs a ride app: riders ask for a ride, the company's
drivers take it, both follow it on the map; built on Phase 104's couriers,
jobs, live position and second app.

- **Riders**: pickup and drop-off on the map (or typed), the vehicle types
  the company offers (economy, comfort, van, motorbike…) each with its
  fare estimate before asking; ride now or at a time; the driver's name,
  photo, car and plate, the driver on the way; share the trip, an SOS
  button that calls the company's emergency number; cancel with the
  company's cancellation rule; rate the driver; ride history with
  receipts.
- **Drivers** (the Driver tab, or the company's driver app as in 104.6):
  online or offline, ride requests with a sound and a time to answer
  (accept or let it go to the next driver), navigate to the pickup in the
  phone's maps app, arrived, start, end; the fare shown at the end; their
  earnings by day and week.
- **The company** (dashboard in Studio): vehicle types with their fares
  (base, per km, per minute, minimum, waiting), service areas, drivers
  (documents, car, plate, approve or suspend), rides live on the map,
  cancellation and no-show fees, the company's share of each fare per
  driver and a statement per driver, promo codes, ratings.
- **Matching**: the nearest online driver of the asked vehicle type first,
  then the next ones; or the company assigns.
- **Payment**: cash to the driver, card through the company's own gateway,
  or both.

| Done | Step | Checked by |
| --- | --- | --- |
| [x] | 105.2.1 Contract: `app_type` `rides`; `Config.rides`; vehicle types and estimates, rides (ask, mine, cancel, rate, share), the Driver tag (online, requests, accept, arrived, start, end, earnings); notifications; plan feature `rides` | redocly lint |
| [x] | 105.2.2 Platform: vehicle types, fares, areas, drivers and their documents, rides and their stages, matching by distance, live positions, cash or card, the company's share and statements, pushes (a migration) | unit tests, isolation tests |
| [x] | 105.2.3 Dashboard (en/ar/tr) in Studio: Rides (the drivers online now, list, give to a driver, cancel), Drivers (documents, approve, suspend), Vehicle types and fares, Statements; Ride settings with the areas and promo codes | unit tests, e2e |
| [x] | 105.2.4 App, rider: where to (the phone's position, a maps link or the map), now or later, vehicle types with their fares and how soon, asking, the driver on the way with the car and the code, the ride, cancelling with a reason, paying a card ride, rating, my rides, sharing the ride and the emergency button | flutter analyze and widget tests |
| [x] | 105.2.5 App, driver: online (the position sent while online with the screen open), one offer at a time with the seconds left (the push's sound), accept or decline, the ride's stages with the rider's code, the cash to collect, earnings by day, week and month; the drivers' app in the company's name (104.6: `role` driver, `.driver`, "<app> Driver", its builds, listing and Firebase files) | unit tests, widget tests |
| [x] | 105.2.6 Studio templates and sections for rides (the welcome section; three ready-made designs: Rides, Ride offers, Ride brand); the store reviewers' notes for both roles (the review account's rides reach no real driver; in the drivers' app the review driver gets a sample ride) | unit tests, e2e |
| [x] | 105.2.7 Studio's demo apps on their own page, `/demo/studio`, apart from the regular demos on `/demo`: Sahm Express (delivery), Sofra Eats (food delivery) and Masar Rides (ride hailing), created with the regular demos from Admin › Demo apps, signed in to with the same demo number; the visitor is also the courier, the first restaurant's staff and the driver (the store-review mechanics), and the daily clean-up removes their shipments, orders and rides. Fixed with it: the words on the soft brand colour (the chosen vehicle type and service, the active ride, the driver's offer) and "Cash to the driver" for rides | unit tests, e2e, widget tests |

### 105.3 Academies with many teachers (Studio project type `instructors`)

An academy (or a course marketplace, like Udemy) where many teachers each
publish their own courses and the academy takes a share.

- **Teachers**: added by the academy, or apply from the app and wait for
  approval; a profile (photo, bio, subjects, rating); their own courses,
  lessons, quizzes and live sessions (the academy approves a course before
  it is published); their students' questions; their sales and earnings.
- **Students**: browse by teacher, subject or level; a teacher's page with
  their courses and reviews; buy a course or the academy's membership;
  rate the course and the teacher; follow a teacher (new courses pushed).
- **The academy** (dashboard): teachers (approve, suspend, their share in
  percent per teacher), course reviews before publishing, the earnings
  statement per teacher for any period and what is owed, featured
  teachers and courses, categories.
- Built on the courses engine (8.6, 100): payment through the academy's
  own gateway or the stores' in-app purchases.

| Done | Step | Checked by |
| --- | --- | --- |
| [x] | 105.3.1 Contract: the vertical `instructors` on the Academy app type (the courses engine, not an app type of its own); `Config.instructors`; teachers (list, one, follow, reviews), applying to teach, a course's teacher (`Instructor.id`); the Teacher tag (profile, courses, sections and lessons, uploads, submitting, students' questions, earnings); the screens `teachers` and `teacher`; the role `teacher`; notifications `new_course`, `teacher_course`, `teacher_question`; plan feature `instructors` | redocly lint |
| [x] | 105.3.2 Platform: teachers, follows and reviews (a migration), applications, courses owned by a teacher (draft, in review, returned, published), lesson files in the academy's Media library, the teacher's answers in their name, pushes to followers, teachers and students, shares in percent set by the academy (no default) and statements from paid orders after coupons and refunds | unit tests, isolation tests |
| [x] | 105.3.3 Dashboard (en/ar/tr) in Studio: Teachers (add, share, featured, suspend; applications and whether people may apply), Courses to review (publish or return with a note), Teacher statements for any period; a course's teacher and stage on Courses | unit tests, e2e |
| [x] | 105.3.4 App, student: the teachers (search, subjects, featured first), a teacher's page (about, courses, students, followers, reviews), follow, rate the teacher once in one of their courses, the course's teacher opening their page, applying to teach and the academy's answer | flutter analyze and widget tests |
| [x] | 105.3.5 App, teacher: the Teacher tab for the academy's teachers only (their share, profile, courses with their stage, a course's details, sections and lessons with a video link, an uploaded video or PDF (sent in chunks, as chat files) or text, sending for review and the academy's note, students' questions, earnings this month, last month and this year) | widget tests |
| [x] | 105.3.6 Studio templates and sections (the welcome section; three ready-made designs: Teachers, Course offers, Academy brand, their buttons opening the teachers); the store review account is a student and a test teacher ("App Review", no share) students never see | unit tests, e2e |

### 105.4 Schools and universities (Studio project type `school`)

One app for a school (or a university, a nursery, a training centre):
students, parents and teachers each see their own part.

- **Structure**: grades or years, classes or sections (a university:
  faculties, departments, programs, course registration each term),
  subjects, teachers, rooms; the school year and its terms.
- **Students**: their timetable, homework and assignments (hand in a photo
  or a file), grades and report cards, attendance, exams' schedule and
  results, the school's announcements and calendar, the library's books
  borrowed (optional), the bus (optional, live on the map with 104's
  tracking).
- **Parents**: one account for all their children; each child's
  attendance (pushed when absent or late), grades, homework, fees and
  receipts, messages with the class teacher (77's chat), permission
  slips, pick-up notes.
- **Teachers**: their classes and timetable, take attendance in a tap, give
  homework, grade, write to a class or a parent.
- **Fees**: the school's fee items and instalments per student, paid by
  card through the school's own gateway or recorded as paid at the office,
  with receipts.
- **The school** (dashboard): import students, parents and teachers from a
  sheet, classes, timetable builder, terms, grading scales, report-card
  templates, announcements to the whole school, a grade, a class or one
  family.

| Done | Step | Checked by |
| --- | --- | --- |
| [x] | 105.4.1 Contract: `app_type` `school`; the roles student, parent, teacher; timetable, homework, grades, attendance, exams, announcements, fees; plan feature `school` | redocly lint |
| [x] | 105.4.2 Platform: the school's structure, people and their links (parent ↔ children), timetable, attendance, homework and submissions, grades and report cards, fees and receipts, pushes (migrations) | unit tests, isolation tests |
| [x] | 105.4.3 Dashboard (en/ar/tr): Structure, People (import), Timetable, Attendance, Homework, Grades and report cards, Fees, Announcements | unit tests, e2e |
| [x] | 105.4.4 App, student and parent (switching between children) | widget tests |
| [x] | 105.4.5 App, teacher: classes, attendance, homework, grading, messages | widget tests |
| [x] | 105.4.6 Universities: faculties, departments, programs, course registration, results by term (built in 113.9) | unit tests, e2e, widget tests |
| [x] | 105.4.7a Studio templates and sections (School, School news, School brand), three ready-made designs, the School project in Studio's new-project list | unit tests, e2e |
| [x] | 105.4.7b Review accounts for the three roles (a student, a parent and a teacher the store reviewers sign in as): built in 113.8, one review sign-in that is each role at once in a class of samples | unit tests, e2e |
| [ ] | 105.4.8 Report cards and grading scales; the school's calendar; the bus and the library (optional): report cards in 112.5, the school's calendar in 113.8; the bus and the library are 113.10 and 113.11 | unit tests, e2e, widget tests |

### 105.5 Home services (Studio project type `services_market`)

A company that sends professionals to people's homes (cleaning, plumbing,
electricity, AC, beauty…): the customer books a service at a time and an
address, a professional of the company takes it. Built on bookings
(7.4–7.6) and 104's jobs and tracking.

| Done | Step | Checked by |
| --- | --- | --- |
| [ ] | 105.5.1 Contract, platform and dashboard: services with their options and prices (fixed, per hour, or a quote after a visit), areas, professionals (skills, areas, hours), bookings and their stages, the company's share per professional | redocly lint, unit tests, e2e |
| [ ] | 105.5.2 App: customer (book, follow, pay, rate) and professional (jobs, on the way, started, done, extra items) | widget tests |
| [ ] | 105.5.3 Studio templates and review accounts | unit tests, e2e |

### 105.6 Grocery and pharmacy delivery from many stores (Studio project type `stores_market`)

105.1 for shops: many stores (supermarkets, pharmacies, flowers…) each with
their catalogue, one store's cart at a time, a prescription photo for
medicines that need one, substitutions agreed with the customer while the
order is picked, couriers from 104.

| Done | Step | Checked by |
| --- | --- | --- |
| [ ] | 105.6.1 Platform and dashboard on 105.1's model: stores, catalogues (import from a sheet), stock, prescriptions, substitutions | unit tests, e2e |
| [ ] | 105.6.2 App: customer and store staff | widget tests |
| [ ] | 105.6.3 Studio templates and review accounts | unit tests, e2e |

### 105.7 Hotels and stays (Studio project type `hotels`)

One app for a hotel, a resort, a chain of hotels, or holiday apartments and
chalets: guests find and book a room, and use the app during their stay.

- **Properties and rooms**: one or many properties (a chain: each hotel
  with its own page, address on the map, photos, facilities, policies);
  room types (photos, size, beds, view, how many adults and children,
  amenities) and the rooms of each type (numbers, floors), or units for
  apartments and chalets.
- **Rates and availability**: a price per night per room type, by season
  and by day of the week, rate plans (room only, breakfast, half board,
  non-refundable cheaper), minimum nights, extra adult or child, taxes and
  fees; an availability calendar per room type; closing dates.
- **Booking**: dates and guests, the room types free for them with their
  total, extras (airport pickup, early check-in, late check-out, extra
  bed), the guests' names, special requests; pay in full, a deposit, or at
  the hotel, by card through the hotel's own gateway; the company's
  cancellation policy per rate plan; a booking number, confirmation by
  push and email, add to calendar; change or cancel within the policy.
- **The stay**: online check-in (ID photo, arrival time), the room number
  when it is ready, a digital key code if the hotel uses one (shown, not
  made by Yallapp), room service (the hotel's menu, ordered to the room,
  105.1's ordering), requests (towels, housekeeping, maintenance, a taxi),
  the hotel's services and their hours (restaurant, spa, pool, gym) with
  their own bookings (7.4–7.6), chat with reception (77), the bill so far,
  check-out and the final invoice, a review after the stay.
- **Loyalty and offers**: points per night, member prices,
  promo codes, packages (room + dinner + spa).
- **The hotel** (dashboard in Studio): properties, room types and rooms,
  rates and the calendar, bookings (arrivals and departures of the day,
  in house, no-shows), the front desk's room board (clean, dirty, out of
  order), guests and their history, requests and room-service orders as
  they come (with a sound), housekeeping tasks, staff with roles
  (reception, housekeeping, restaurant), reports (occupancy, average
  rate, revenue per available room, by period), invoices.
- **Staff in the app**: a Staff tab per role: reception (arrivals, assign
  a room, check in, check out), housekeeping (rooms to clean, done),
  restaurant (room-service orders).
- Later, after it works: two-way sync of availability with Booking.com,
  Airbnb and others through a channel manager, when the owner chooses one.

| Done | Step | Checked by |
| --- | --- | --- |
| [ ] | 105.7.1 Contract: `app_type` `hotels`; `Config.hotels`; properties, room types, availability and prices for dates, bookings (quote, book, mine, change, cancel), the stay (check-in, room, requests, room service, bill, check-out, review); the Staff tag per role; notifications; plan feature `hotels` | redocly lint |
| [ ] | 105.7.2 Platform: properties, room types, rooms, rates (seasons, days, rate plans, minimum nights), availability that never sells a room twice, bookings and their stages, deposits and payments, cancellation policies, stays, requests, room service, invoices, pushes (migrations) | unit tests, isolation tests |
| [ ] | 105.7.3 Dashboard (en/ar/tr) in Studio: Properties, Room types and rooms, Rates and calendar, Bookings (today's arrivals and departures), Room board, Requests and room service, Housekeeping, Guests, Staff, Reports | unit tests, e2e |
| [ ] | 105.7.4 App, guest: search by dates and guests, a hotel's page, room types and rate plans, booking and payment, my bookings, online check-in, the stay (room, requests, room service, services, chat, bill), review | flutter analyze and widget tests |
| [ ] | 105.7.5 App, staff: reception, housekeeping and restaurant tabs | widget tests |
| [ ] | 105.7.6 Studio templates and sections for hotels; review accounts for guest and staff (the reviewers' bookings hold no real room) | unit tests, e2e |

### 105.9 Live taxi on the map (Studio project type `taxi`)

A taxi company's app where everything moves on the map as it happens: the
rider opens the app on a full-screen map with the free taxis around them
moving, sets where to, sees the route, the fare and how soon, and follows
the driver coming second by second. A new Studio kind on 105.2's rides
engine (vertical `taxi`), so its fares, drivers, matching and the drivers'
app are 105.2's; 105.2's Ride hailing kind stays as it is. Name in the
demos: Lamha Taxi (an invented name).

- **Maps, the company's choice in the dashboard**: Google Maps with the
  company's own API key (the app draws Google's tiles through the Map Tiles
  API; place search and routes go through Yallapp's server with the same
  key, never shown to riders' phones beyond the tiles), or OpenStreetMap
  with the company's tile server (OpenStreetMap's own servers aren't for
  apps), and optionally its search (Nominatim) and routing (OSRM) servers.
  A test button checks each.
- **Live, on the company's own Firebase Realtime Database** (its URL in the
  dashboard, in the Firebase project of the app's service account; a test
  button, and the database rules to paste): the app signs in to Firebase
  with a token Yallapp gives it; drivers write their position with each one
  they send Yallapp (every 8 seconds; a driver on a ride leaves the cells
  riders look in); riders read the free taxis in the cells around them and their
  own driver; Yallapp writes each ride's stage. Without it, the app asks
  Yallapp every five seconds.
- **Dispatch**: 105.2's nearest free driver first with a countdown, then
  the next; the time to the pickup from the route.
- **The company**: a live map of drivers (free, on a ride) and rides
  waiting, on the dashboard.

| Done | Step | Checked by |
| --- | --- | --- |
| [x] | 105.9.1 Contract: kind `taxi` (`app_type` `rides`, vertical `taxi`); `Config.taxi` (map provider, tiles, live database); `/taxi/live-token`, `/taxi/nearby`, `/taxi/places`, `/taxi/route`; plan feature `taxi` | redocly lint |
| [x] | 105.9.2 Platform: the kind, its settings and checks (maps key or tile server, live database), live tokens, nearby taxis, place search and routes through Yallapp, ride stages written to the live database | unit tests, isolation tests |
| [x] | 105.9.3 Dashboard (en/ar/tr) in Studio: Live map, Maps and live settings | unit tests, e2e |
| [x] | 105.9.4 App, rider (after the owner approves the look): the full-screen map with the taxis around, where to, route and fares, finding a driver, the driver coming, the ride | widget tests |
| [x] | 105.9.5 App, driver: online on the map, the offer with its countdown, the position written live, navigation | widget tests |
| [ ] | 105.9.6 Studio templates and designs, the demo app, the store reviewers' notes. Done: the demo app (Lamha Taxi, 110.5) and the reviewers' notes, which walk through both roles (the map with the free taxis, asking for a taxi, then Account › Driver mode as the test driver riders never see on the map); still to do: the designs | unit tests, e2e |

### 105.8 Car rental and laundry

Each its own small step after the ones above: car rental (cars, dates,
pickup and return places, deposits), laundry (pickup and delivery with
104's couriers, items priced by piece or by kilo).

## Phase 106: Studio template marketplace (postponed)

Sharing Studio templates for free or selling them by monthly, yearly or
lifetime subscription; Yallapp's share 25% (taxes, payout and gateway fees
included); payouts to the seller's bank account (SWIFT). After Studio is
finished and tested.

## Phase 107: More in Studio's editor

The owner asked for more options and more that the editor can do (29
October). Each step reaches the app too: an option is only offered once
the app draws it (and the plugin serves it to WordPress apps).

| | Step | Done when |
|---|---|---|
| [x] | 107.1 The editor's own tools: copy, cut and paste elements (also to another page or project), copy and paste an element's style, move up and down and select the parent from the selected element, the shortcuts listed; options the app already draws offered: letter spacing, the lowest height, the shape (square, 4:3, 16:9…), removing a picture | unit tests, e2e |
| [x] | 107.2 More style: turning an element, each corner rounded on its own, a colour over a picture, a row that scrolls sideways, capitals and struck-through text (old prices), hiding an element without deleting it; contract, page checker, the app, the plugin | redocly lint, unit tests, flutter analyze and widget tests, the plugin's tests, e2e |
| [x] | 107.3 New elements: a countdown (offers ending), questions and answers that open (accordion), tabs that switch what is under them, a list with an icon on each line; contract, page checker, the app, the plugin, the editor and its ready sections | redocly lint, unit tests, flutter analyze and widget tests, the plugin's tests, e2e |

## Phase 108: Designs from anywhere, and whole designs to choose from

The owner asked (29 October) that a designer working in any tool can bring
the design into Studio, and that a project can swap its whole design for
another from many. Asked before built: the import screen and the designs
gallery are shown to the owner first. He approved them, and resizing by
dragging in the phone, on 29 October.

| | Step | Done when |
|---|---|---|
| [x] | 108.1 The screens, shown to the owner first and approved (29 October) on the real editor, its look unchanged: two choices added to the Page menu, whole designs at the top of the Templates tab, the import windows over the editor. With them, as asked: an element resized by dragging a corner of its selection in the phone (a mostly sideways drag sets the width, up or down the height; Shift keeps the shape; a width reaching what holds it fills it; a double click gives it its own size back; one undo step), the dashboard and the phone's frame untouched | owner's approval; unit tests, e2e |
| [x] | 108.2 Yallapp's own design file (`.yallapp`): a page, the selected element or a whole project (its pages, font, second colour and tabs) with its pictures and the project's own fonts inside, exported from the Page menu and imported in any project of any account through "Import a design" (the file, then what was found: the pages to take, a new page, instead of the open page or a section in it, the fonts it needs with their licence confirmed, the pictures saved with the project); texts moved to the project's languages, links between the file's pages kept, one undo step | unit tests, e2e |
| [x] | 108.3 SVG from any design tool (Figma, Adobe XD, Sketch, Penpot, Illustrator, Affinity, Canva), one screen per file and several at once: what sits side by side becomes a row, what is stacked a column, a box with things on it holds them, a small rounded box with one text a button; texts stay texts with their fonts and colours, embedded pictures are saved with the project, drawings (paths, icons) are drawn as pictures by the browser; the status bar, home indicator and tab bar left out; right-to-left projects start from the right; fonts matched to Google Fonts or the project's own, and own fonts (`.ttf`, `.otf`) added in the import window. One shape of screen for every tool (`lib/studio/import/frame.ts`), so the next tools reuse it | unit tests against an exported file, e2e |
| [x] | 108.4 A Figma link into Studio (the import window's second tab): the file read with the owner's personal access token (sent to Figma with these calls only, never saved), its screens chosen (up to 10, a board of several gives each), auto layout kept as rows and columns with their gaps, padding and alignment; colours, gradients, corners, borders, shadows and fonts kept; image fills fetched from Figma and drawings (vectors, icons) drawn by Figma, both saved as the account's files | unit tests against Figma's node shapes, e2e against a fake Figma API |
| [x] | 108.5 Figma's own file (`.fig`), read on a best effort (Figma doesn't document it): the ZIP and its `canvas.fig` in Kiwi (deflate or zstd, by `fzstd` 0.1.1), its frames read by the same reader as the Figma link, its pictures from the file, drawings from their outlines, instances from their components with their texts overridden; when it can't be read, the window says to use the link or SVG | unit tests against a file made in the test, e2e |
| [x] | 108.6 Sketch files (`.sketch`: artboards, rectangles, ovals, texts with their fonts, bitmaps, symbols with their texts overridden, shapes drawn from their points) and Penpot files (`.penpot` from Penpot 2, and a page's shapes as JSON: boards, flex layout as rows and columns, texts, pictures, paths drawn) | unit tests against files made in the test, e2e |
| [x] | 108.7 Whole designs: the project type's own pages (its templates, a brand and a contact page) in six looks (a colour, a background, a free Arabic font, a header and how round the corners are), in the approved window opened from the top of the Templates tab: filters (all, the type's, the account's own, imported), a phone per design, the chosen one's pages; replacing the whole project's design (its Studio pages take the design's in order, keeping their addresses and names so tabs and links work; extra pages added; the font and second colour taken) or only the open page, keeping the texts and pictures that were changed, as one step that can be undone, what's published unchanged until publishing; the project saved as one of the account's own designs, and an import kept there (`studio_designs`, the file in the file store, up to 30, with own templates on the plan) | unit tests (every design for every project type taken by the page checker), e2e |

## Phase 109: The bottom tabs in Studio

The owner's choice (2026-10-29): the bottom tabs edited in Studio's editor,
past five a More tab with the rest, and the bar's own look.

| Done | Item | Tests |
|---|---|---|
| [x] | 109.1 Studio's editor: the bar in the phone selected opens its panel (in place of Studio's missing Tabs page): each tab's name (in the language being edited), icon or own picture and what it opens, added (with a name), removed, moved; up to ten, past five the fifth on marked "In More". The admin's Studio plan page: one Save, Pages per project with the limits, "What's included" written from the plan's numbers when left empty (#204) | e2e |
| [x] | 109.2 Past five tabs the app shows the first four and More (`Action.type` `more`, the name in the app's language) with the rest in `Navigation.more`, opened from the bottom of the screen and each opened on top; apps that don't know it show the first four. The tabs the app adds (Chat, a role's tab) go before More, the tab they push out into its list. Hosted API and plugin 0.4.29 | unit tests (contract checked), plugin integration test, Flutter widget tests |
| [x] | 109.3 The bar's look (`Navigation.tab_bar`): its colour (and in dark mode), the open and other tabs' colours, corners, the space around it (a floating bar), the names' font, names always, for the open tab only or never, and the middle tab of three or five as a raised round button; in the editor's phone as in the app (the app after its next update) | unit tests, Flutter widget tests, e2e |

## Phase 110: Apps quality: full templates and sample entries

The owner's audit of the apps made from the ready designs (29 October): an
app whose content is managed in Yallapp starts with empty lists, which the
hosted API leaves out, so it looks bare. The owner approved sample entries
that look like a ready app and are really removed, and asked for full
templates, look fixes and more Studio demos after them.

| | Step | Done when |
|---|---|---|
| [x] | 110.1 The audit: every design for every project type checked as an app made from it shows it, with what's empty, missing or looks off, given to the owner | owner's review |
| [x] | 110.2 Sample entries: when a design is chosen (a Studio project's template, Studio's whole designs, Pages & look, the Branding step), each list it shows that is empty gets 6 to 8 entries with pictures, prices and three or four categories (a delivery company's services and a ride company's vehicle types: three, the settings it needs anyway), in the app's main language (English, Arabic or Turkish) and currency, each marked `sample` (migration 0102); never next to the owner's entries, nor for apps on a website or platform, nor the demo apps | unit tests |
| [x] | 110.2 In the dashboard: a "Sample" badge on each, "You have N sample entries" with "Remove all samples" above the list (the entries go with their categories and the pictures only they used), an entry saved by the owner is theirs, the first own entry asks "Remove the samples now?" | unit tests, e2e |
| [x] | 110.2 Nothing goes to the stores while samples are left: every build (the app's and the courier app's), "We publish for you" getting ready and the team's Submitted, In review and Live refused with what to do; the preview and the hosted API serve them as content | unit tests, e2e |
| [x] | 110.3 Full templates: every design's pages filled as a ready app of its kind (its sections, its other pages and their links), checked with the samples | unit tests (the page checker on every design), e2e |
| [x] | 110.3 Home: 8 to 12 blocks, three slides with real words, quick links, the kind's lists and categories, numbers, three quotes (invented names, roles, ratings), four to six questions, a short story and the contact details (hours where the kind has them); the header of the pages in the tabs shows the app's logo or name (101 `AppHeader`: logo, or centred in the Minimal look) | unit tests |
| [x] | 110.3 About us (a story of about 80 words, three or four people with drawn pictures, numbers, six photos), Contact (words, the map, hours, a "Send us a message" form, the contact details, and the business's social links when it has them) and Questions (six to eight) on every design; each kind's own pages: Pricing (academies), Offers and Delivery & returns (shops), Our story and Catering (restaurants), Prices (bookings and services), Our doctors and Patient info (clinics), Timetable and Plans (gyms), Areas and Valuation (real estate), About the newsroom (news), Visit and Hire the venue (events), Our work and Volunteer (charities), How it works and Become a courier, driver or partner (delivery, food, rides, taxi), Admissions and About the school (schools) | unit tests |
| [x] | 110.3 No "Write ..." instructions left: sample texts in the business's own voice, marked by the editor until changed (cards, photos, the map's place and forms too); Arabic and Turkish for every text in the built-in dictionary (`lib/i18n/builtin/designs-{ar,tr}.ts`); the drawn pictures in `public/design-pictures/art-*.png` (`lib/demo/design-art.ts`, `tests/unit/design-art.test.ts`) | unit tests, e2e, the app's screenshots |
| [ ] | 110.4 Look fixes from the audit, each shown to the owner and approved before it's made | owner's approval; unit tests, e2e |
| [x] | 110.5 Studio demos on `/demo/studio`, made by Admin › Demo apps with the others: Rawaq Academy (seven teachers with their profiles and published courses, the sample entries' in Egyptian pounds; the demo number is one more teacher, "Demo teacher", which students never see, whose Teacher tab makes a course and sends it for review), Nakhla School (three classes, seven subjects, six teachers and a Sunday-to-Thursday timetable; the demo number is Lina, a student, her mother Rania, also Adam's, and Ms. Mona, Lina's class teacher; homework, scores, attendance, news and fees dated from today) and Lamha Taxi (three vehicle types with fares, eight drivers with their cars, who drive around wherever the rider asks; the platform's map from Admin › Settings › Maps, else the plain ride screens; no live database) | unit tests, e2e |
| [x] | 110.5 The daily job: what visitors made as the demo teacher, as the school's teacher and the teachers they followed and rated go after a day; the school's day is made again from today; the cards' texts in English, Arabic and Turkish, with screenshots drawn by the app's screenshot test (the taxi's street map too); the taxi kind's notes for the store reviewers (105.9.6) | unit tests, e2e |
| [x] | 110.5 Nakhla School with everything a school has (the owner's ask, 4 November): three staff (the secretary, the caretaker, the nurse) and the teachers' jobs; behaviour categories and points; the gate's check-ins of the students and the people who work there (113.2); the school's calendar (a parents' evening, sports day, class trips, the mid-term break, a staff meeting) and the published mid-term exams; the syllabus with each class's progress; the teachers' reports (shared with the parents, one sent back by the school); conversations between teachers and parents (Ms. Nadia with Rania about Adam, Ms. Mona with Omar's father, who have accounts with no phone and a reserved `.example` address, so nobody signs in as them); salaries for everyone, the last two months' payslips paid, this month's drafts, Ms. Mona's advance and leave; a slip signed and one to sign, today's pick-up note; Adam's overdue book and Lina waiting for the atlas; the bus's last five school days with who got on and off, and the bus going round the trip of the time of day on the map while no trip was started today (worked out from the time when read, never kept, as the taxi and delivery demos' drivers; a trip started as Ms. Mona is a real one and takes its place); all dated from today and made again with the school day (lib/demo/school-life.ts, school-bus.ts) | unit tests |

## Phase 111: Studio setup fixes

The owner's report (30 October): in `/studio/project/setup` › Branding ›
Design, after "Keep my pages" no other choice would stay. The setup page was
reviewed step by step for Studio projects of every kind (academy, store,
delivery, food, rides, taxi, school, many teachers), in English and Arabic,
on a desktop and a phone.

| | Step | Done when |
|---|---|---|
| [x] | 111.1 A save that doesn't go through keeps every choice on screen: React resets a form after each answer of its action, which put the design radios, the template list and the font back to how they were first drawn ("Keep my pages" for a new project) while the step kept the choice; the same for the Listing step's framed screenshots and language and the Publishing choice. The upload's own message ("Upload your app icon.") now shows, so a new project's first Branding save no longer fails without a word | e2e (`tests/e2e/studio-setup.spec.ts`) |
| [x] | 111.2 Inside Studio every link and save of the setup stays in Studio: the steps, Preview, Plan, Back, More Android stores, Fingerprint and Team ID, the Builds page after the last step; the App type step and the Website step's Back no longer open the regular dashboard's App type (a Studio project's kind is chosen when it's made); deleting a Studio project goes back to Studio's projects | e2e |
| [x] | 111.3 A Studio project's Publishing step offers Studio's plans, not the regular ones; "Not set" (no plan yet) in the dashboard's language; the Studio kinds' 18 designs (delivery, food, rides, taxi, many teachers, school) named and described in Arabic and Turkish in the Branding step | unit tests, e2e |

## Phase 112: Studio apps that feel finished

The owner's request (2 November): the ride app should really work like
Uber, with the destination and the map, not just a request; the delivery
apps should show the courier on the map, where they come from and where
they go; the drivers' and couriers' app should be its own app, two apps for
one company; the store needs more sections and new sliders; and the
academies' and schools' dashboards should be a real LMS. All of it in
Yallapp Studio.

| | Step | Done when |
|---|---|---|
| [x] | 112.1 Rides like Uber (`rides` and `taxi`): the map is the rider's home with "Where to?", the pickup moved on the map, the route with each vehicle type's fare on a sheet over the map, the driver coming and the trip followed on it, the receipt and rating; the driver's side on the map too, with navigation; ride companies get the map the way taxis do (their own, else the platform's Admin › Settings › Maps) | unit tests, flutter widget tests, e2e |
| [x] | 112.2 Delivery and food on the map: the courier live on the customer's screen with the pickup, the drop-off, the route and the time left; the courier's job with the route and navigation; the dashboard's live map of couriers and jobs | unit tests, flutter widget tests, e2e |
| [x] | 112.3 Two apps for one company: for delivery, food, rides and taxi projects the drivers' and couriers' app (104.6, `.courier` or `.driver`) is always its own app and the customers' app has no drivers' or couriers' screens (built before: their tab stays until the next build); Delivery and Ride settings name it, take its own icon and say how to move over; Setup and Builds show both apps side by side, Publishing both apps' notes, the preview either app; every Studio plan has the second app (`courier_app`) until the team unticks it; pushes go to the app they're for (devices keep the build's role, migration `0104`); Studio's demos offer the second app to download | unit tests, flutter widget tests, e2e |
| [x] | 112.4 The store in Studio: thirteen ready sections (an offers slider, a flash sale with its countdown and the products on sale, categories in pictures and in circles, new arrivals, best sellers, on sale, the deal of the day, shop the look with spots on the picture, brands, why buy here, a coupon whose code is copied with a tap, recently viewed), three new sliders for every kind (a full-width hero with lines that fill, peeking cards, a picture beside its words with "1 / 3"), and three store templates (Shop, Shop offers, Shop looks) used by the store's whole designs; contract: the `coupon` element, the slider's `indicator`, `place` for spots, the categories' `style` and `columns`, `Category.image_url`, `ItemsQuery.on_sale`, the products list's `recent`; plugin 0.4.31 | unit tests, flutter widget tests, plugin unit tests, e2e |
| [x] | 112.5 A real LMS in Studio: the course builder (items in any order, sections moved and renamed, a lesson on a date, in order), quizzes (written answers, shuffling, the review after an attempt, a question bank per course with random picks), assignments handed in from the app (text, photo or PDF) and graded in the dashboard and in the Teacher tab (105.3), live classes (any meeting link, from 15 minutes before, the recording, reminders, a calendar in the app), the gradebook, students at risk, the course at a glance, students added by phone number in bulk, cohorts with their first day (drip and due dates from it, migration `0105`), certificates as a PDF shared from the app, coupons for paid courses (none that make a course free), and for schools report cards and the class gradebook in the dashboard and the app; course bundles wait for the owner (a new price) | unit tests, flutter widget tests, e2e |
| [x] | 112.6 "My location" with its address, and place search with MapTiler: the map names the place at the phone's position (`GET /maps/address`: the company's Google Maps Geocoding, a Nominatim server's `/reverse`, or MapTiler's geocoding) and the address fills an empty delivery or food field, a ride's pickup and the taxi place search's "My location" (still editable; the field stays as it is when the map names nothing); with MapTiler's tiles (the platform's in Admin › Settings › Maps, or a company's) and no search server, place search and the address use MapTiler's geocoding with the tiles' key from Yallapp's servers, the apps never holding it for that; answers kept an hour per position and language | unit tests, flutter widget tests |

## Phase 113: Schools and academies, complete

The owner's decisions and request (2 November): the map and live classes
are for every plan (both already are: neither has a plan feature); course
bundles (several courses at one price the owner sets); a coupon that makes a
course free enrols at once; the store's brands keep their invented names
(NOVA, ATLAS, LUMA…). The LMS goes further; teachers and staff get their
own part; teachers and students check in and out; parents get an area in
the app that only parents see; the school's administration and its
teachers work through reports (each student's state, where each class is
in the syllabus); and teachers write to parents and students when the
school allows it. Nothing left out.

| | Step | Done when |
|---|---|---|
| [x] | 113.1 Course bundles and free coupons: a bundle of several courses at the owner's price (academies and academies with many teachers), bought in the app like a course (the owner's gateway; the stores' in-app purchase where a course would use it), every course in it enrolled at once; a coupon of 100% enrols without a payment; the dashboard's Bundles; the bundle's page in the app (bundles kept with the courses in `apps.course_setup`, no migration; `GET /bundles`, `GET /bundles/{id}`, `POST /bundles/{id}/coupon`, `bundle_id` on the checkout link, `CourseDetail.bundles`, `features.bundles`; the order's line keeps each course's price and whether the student had it, so paying enrols the others and a refund takes back only those; a teacher's share of a bundle is its part split by the courses' own prices; a bundle shown in the app is a one-time store product `bundle_<id>` whose purchase enrols its courses; a coupon that takes the whole price completes the order at 0 and enrols at once, also for a course; Bundles in the dashboard and Studio (en/ar/tr) with the courses' total beside the price; bundles in Studio pages' lists; in the app the bundle's page, a row on the courses list and "Also in a bundle" on its courses' pages) | unit tests, e2e, flutter widget tests |
| [x] | 113.2 Check in and out: students, teachers and staff check in and out from the app with the gate's code (the Gate screen in Studio shows a QR code and its six digits, new every 30 seconds, signed with a key only the platform holds, so an old code (a photo of the screen a minute later) or another school's fails; ten minutes of codes kept on the screen for a short loss of the network; new codes at once when a screen's page went where it shouldn't), inside the school's area (its place and radius, the phone's location read only when checking in; outside it is refused with how far), either one or both at once, as the school chooses; the app has no camera scanner (none was added: the six digits are typed, the QR code holds the same signed code for a later scanner); the students' times and the teachers' and staff's (or a person's own working hours), late after the school's time, leaving early before its end, the school's days; parents pushed when their child checks in and out, late or early (`school_checkin`); the teacher's class register still takes attendance and shows next to each student; Studio's Check-in board of the day (in, late, not in yet, left, absent, excused, on leave, by role and class), the month's report per person with its CSV file, corrections by the office with a reason, kept on the day with who made them; the app's Check in on the School, Classroom and Staff tabs, today's times and the month's days; a parent sees each child's days on their attendance; contract: the Check-in tag, `Config.school.checkin`, migration `0106` | unit tests, isolation tests, e2e, flutter widget tests |
| [x] | 113.3 Teachers and staff: everyone who works at the school, teachers and the other staff (the role `staff`, added on People and from the CSV file), each with a job, a department, working days and hours and duties; their attendance from 113.2; leave requests from the app (sick, annual or other, the days, a note, a photo or PDF of a document) withdrawn while waiting, approved or refused in Studio's Staff page with a note, each told in the app (`school_leave`), approved days counted as on leave; the staff's own news (News › Teachers and staff only, `school_staff`) that students and parents never see; the Staff tab in the app for staff who don't teach (check in and out, their work, leave requests, the staff's news), teachers the same in the Classroom tab; contract: the Staff tag, `User.roles` `staff`; no pay or salaries (the owner decides later) | unit tests, e2e, flutter widget tests |
| [x] | 113.4 The parent's area: a Parent tab only parents ever see (added from the school's roles, `SchoolMe.roles` `parent`; a student, a teacher or staff without children at the school never has it, a teacher who is a parent has both; the server answers `not_parent` (403) on every Parent endpoint to anyone else); one account for all the children (the switcher) and each child's day at a glance (checked in and out with 113.2's times, today's lessons, homework due, the latest grades, behaviour and its points, the bus with its live link, library books, what is coming on the calendar), fees and receipts, the teachers' reports the school shared, messages with the teachers when the school allows them (113.6's entry moved here), the calendar, exams and attendance per child; permission slips (the school sends one in the dashboard to a class, a grade or the whole school with its details, a due date and a note of a fee it doesn't take; parents sign yes or no in the app with their name until the end of the due date, `slip_closed` after it; the slip's page shows who signed, declined or hasn't; parents pushed when one comes and reminded the day before from 17:00 if a child hasn't an answer, `school_slip`); absence excuses (a day or several, the reason and a photo or PDF; withdrawn while waiting; accepted or declined in the dashboard with a note, the parents told, `school_excuse`, the administration on Yallapp Business when one comes; an accepted one makes those days excused in the class register, the child's attendance, the check-in board and the month's report); pick-up (the parents list who may pick the child up with their relation, phone and a photo; a one-day note "today X picks up"; the school sees both on the student's page, adds to them when a parent calls, and sees the day's notes on the check-in board); the student's School tab only what a student needs (no fees, slips, excuses, pick-up or the parents' messages); `GET /parent/me`, `/parent/children/{id}/day`, `/parent/slips`, excuses and pick-up (the Parent tag), migration `0109`; Dashboard and Studio (en/ar/tr): Permission slips, Absence excuses, the student's page and Pick-up today; the store review account's parent has a slip to sign; the fees are the parents' on the server too (the owner's decision, 2 November): `GET /school/students/{id}/fees` and paying answer `not_parent` (403) to the student, and `school_fee` pushes go to the parents only, except at a university (113.9), where the student sees and pays their own | unit tests, isolation tests, e2e, flutter widget tests |
| [x] | 113.5 Reports between the administration and the teachers: the syllabus of each subject per grade (units and their lessons or topics, each with its planned days; written in Studio's Syllabus or imported from a CSV sheet) and each class's progress the teacher marks in the Classroom tab (covered on a date, with a note; the dashboard too), Progress showing per class and subject the share covered against where the plan says it should be, behind the plan highlighted, and the whole school with the classes behind first; the school's report templates (text, a choice, a rating from 1 to 5, required or not; two ready-made ones), a teacher's report on a student (level, behaviour, attendance, strengths, what to do next) or on a class (a period's summary) kept as a draft and sent, the Teachers' reports inbox (new ones marked, read, commented on, sent back for changes and sent again, approved; a student's history), an approved student report shared with the parents in their child's school in the app; pushes to the administration on Yallapp Business when one is sent, to the teacher when it is commented on, sent back or approved, to the parents when one is shared (migration `0107`) | unit tests, e2e, flutter widget tests |
| [x] | 113.6 Messages when the school allows them, on Phase 77's chat: conversations of kind `school` (always a teacher and one parent or student; migration `0106` with their sides, closed and the teacher's first message, and a teacher's department), checked on every read and send (a parent only with their children's teachers, a student only with their own, never two students or two parents; a child moved to another class, a parent unlinked or the school's rule changed stops the writing); School settings › Messages in the dashboard and Studio (whom teachers write to: no one, parents, parents and students; who writes first: the teacher, or both; the hours and school days in the school's time zone, outside them a message is refused with when one can write again, never kept to arrive at night; a whole class at once; photos and files or text only; whether the administration reads the conversations); the hosted API's `GET /school/messages`, `POST /school/messages/conversations` and `POST /classroom/classes/{id}/messages` (the same text in each one-to-one conversation, answers back one by one), the `school` block of a Chat conversation and its refusals; pushes as the chat's, with the sender's name and never to the business's phones; Dashboard › Chat › Teachers (the administration writes to one teacher, all of them or a department, in each teacher's own conversation with the school, at any time; a Teacher badge in the inbox) and Teachers and families (shown only when the school reads them or a message was reported; close, open again, delete a message; reports link to the conversation); the app's Messages (from the School tab for parents and students, where 113.4's Parent tab will take it, and the Classroom tab for teachers): the school's administration, the contacts, the hours and the privacy note, writing to a whole class; a school conversation shows the privacy note, the hours, why one can't write (closed, the teacher first, outside the hours, not allowed), hides files and voice when text only, and reports a message; English, Arabic and Turkish | `school-messages.test.ts` (rules, hours, forms, the hosted API, isolation, class messages, closing, reports, writing to teachers, pushes), the chat store suite (memory and MariaDB), `school-messages.spec.ts`, `phase113_6_messages_test.dart` |
| [x] | 113.7 More of a real LMS: prerequisites (courses to finish before enrolling: `prerequisites` and `prerequisites_met` on the course, enrolling and buying answer `prerequisites_not_met`; lessons in order stay 112.5's course taken in order) and learning paths (Courses › Paths, points and badges: courses numbered in a path, taken in order or not; `GET /learning-paths`, Account › Learning paths with each course's progress and what waits), points and badges with each course's leaderboard and its cohort's (off until the academy turns them on: points for lessons, quizzes by score, assignments by grade and streak days; eight badges with their Material Symbols icons; first names and an initial only; `GET /me/achievements`, `GET /courses/{id}/leaderboard`, the academy's own board with full names), rubrics for assignments (criteria and levels written like quizzes, the highest levels make the highest score; graded with them in the dashboard and the Teacher tab, the student reads each level) and another try (times an assignment can be handed in, the try counted), a timed exam (a quiz marked as an exam: opens and closes at times, its time limit and the close kept by the server, answers after the end and a minute's grace refused with `time_up`, every attempt started counted and an attempt going on given back, results after it closes when the academy chooses; the app counts down and says so), notes and bookmarks in a lesson (the student's own, at the place in the video; My notes per course), the lesson's discussion (the course's questions asked under a lesson, pinned first; the course's teacher pins and deletes in the app, the academy in Questions; a student deletes their own), the rules to complete a course (its lessons, also its quizzes, or also its assignments, and a minimum final score; progress, the certificate and its PDF follow them); migration `0106` | unit tests, e2e, flutter widget tests |
| [x] | 113.8 The school's calendar (events, holidays, exams), the exams' timetable, behaviour (merits and notes, the parent told), and review accounts for the student, parent, teacher and staff roles so the store reviewers can sign in as each: the calendar's events, holidays and breaks and exam days (a day or several, all day or with times, a place, for the whole school, a grade, a class or the staff), in the dashboard's Calendar (a month or a list, en/ar/tr) and in the app for students, each child of a parent and teachers (a month or a list, Add to calendar as the events' `.ics`); a holiday tells nobody of an absence and the Classroom's register says so; the exams' timetable per class or grade and subject (date, time, minutes, room, what it covers), drafts until published, the families told at once and reminded the day before from 17:00 (the frequent job); behaviour: the school's categories (positive or negative with points; suggested ones in the app's language to start), merits and notes from the Classroom tab and the dashboard, the parent told of all, the negative only or none as the school chooses, the record and its points in the app, the class's view for the teacher (their own taken back on the day), the dashboard's report by class, student and category; 105.4.7b the store review account (App sign-in's review number or email and code) is, the first time it signs in, a student of a class of samples ("App Review class"), that student's parent, its teacher and, where the school has 113.3's staff, a member of staff, with a sample week on every screen; Publishing's notes for the reviewers say how each role is tried (migration `0106`) | unit tests, e2e, flutter widget tests |
| [x] | 113.9 Universities (105.4.6): a School project in university mode (University › Settings, plan feature `university`; `SchoolConfig.university`), the school's people, fees and news kept; faculties, departments and programs (degree, credits to graduate, years, the least and most credits a term, the study plan), courses (code, credits, department, prerequisites by code; imported from a sheet), terms (registration window, last day to drop) and their sections (lecturer, seats, weekly lectures; the week as a timetable), each student's program and advisor (also from a sheet); registration in the app with seats left, lectures that don't clash, prerequisites passed and the program's credits, a waiting list (the first who fits takes a freed seat), sent to the advisor who approves or sends it back with a note (or the office, which also adds and drops past the window and, ticked, past the rules), drop until the date; lecturers' sections, each lecture's attendance, grades of the university's scale (a percent gives the letter) and published results; results by term with the term and cumulative GPA (credit-weighted, the latest attempt counting), the transcript in the app and as a PDF (a signed link for an hour), the study plan done / in progress / left; parents see it read only; pushes `uni_registration`, `uni_seat`, `uni_results`, `uni_advisee`; the dashboard's University pages (en/ar/tr); migration `0106` | unit tests, isolation tests, e2e, flutter widget tests |
| [x] | 113.10 The school bus: routes with their bus (plate, seats), a driver and a supervisor from the school's teachers and staff, the stops in order on the platform's map (a pasted maps link or coordinates) with a time on the morning and the afternoon trip, students put on a stop together by class (within the seats); a trip started by the driver in the app (Bus duty: the Classroom tab for teachers, Account for staff, one tile the Staff tab can take), the phone's position sent while its screen is open (104's locator) and forgotten when the trip ends, the stops reached and how soon the bus reaches the others; the parent's School bus with the bus live on the map, their child's stop and how soon; boarded, got off and absent marked by the driver or the supervisor; parents pushed (`school_bus`) when the bus is near (minutes or a distance, as the school chooses) and when the child gets on and off; Studio's Buses & routes, each trip's history, and the live map of the buses running now (112.2's map, a plain note while the platform's map isn't set); on the plan feature `school` (migration `0106`) | unit tests, isolation tests, e2e, flutter widget tests |
| [x] | 113.11 The library: books (title, author, ISBN, a cover, shelf, category, language, an e-book PDF from the Media library) with copies each with its own code (or numbered ones), books from a CSV file; search and categories in the app for students, teachers and staff, parents following their children's books; a book reserved from the app, held for the school's days when a copy is free or waiting in turn for one; lent and returned at the desk in Studio by the student's code or name and the copy's code, due after the school's loan days, up to the school's books at once; reminders before the due date and every few days once overdue (push `school_library` to the student and the parents, the frequent job); the overdue list, books held to collect, and the history per person and per book; e-books read in the app's own viewer (migration `0106`) | unit tests, e2e, flutter widget tests |
| [x] | 113.12 Salaries, recorded by hand (the owner's decision, 2 November: written down as paid out and paid in, never through a payment gateway): each teacher's and staff member's salary (monthly amount, currency, allowances), the month's sheet per person (base, allowances, bonuses, deductions, advances taken back, the net), deductions suggested from 113.2's absences and lateness that the administration accepts or changes, advances given and paid back in instalments, each payment recorded as paid out (cash or bank transfer, the date, who recorded it, a note or a receipt photo), a payslip PDF the person sees in the app's Staff or Classroom tab, the month's total and a CSV; nothing moves money: built as Studio's Salaries (en/ar/tr) for those of the team given the new Salaries area (the owner and managers have it; also the Owner API's `TeamArea` and the Business app's team screen): each person's salary and allowances as the school sets them, the month's payslips made from them (drafts brought up to date when made again, what the office answered kept), the rules for suggested deductions off until turned on (a set part of a day's pay per absence without an excuse, approved leave and excused days not counted; every N late arrivals, leaving early when counted; a day's pay the base, or with the allowances, over the person's working days in the month), each suggestion accepted at its amount or another, or dismissed, bonuses and deductions the office writes, a note, a draft made final or removed, the month locked (every draft final) and opened again (payslips with payments stay final), advances handed over (cash or bank, the day, who, a note, a receipt photo) and taken back each month from their first month or paid back at the office, payments written down in one or several parts (a receipt photo seen only in the dashboard, never at the public asset address) and taken off when written by mistake, the month's totals per currency and its CSV, a payslip's PDF (the receipts' layout, en/ar/tr); the hosted API's `GET /staff/payslips` (only the person's own final payslips, with their advances still being taken back) and `GET /staff/payslips/{payslip_id}`, the PDF from a signed link good for 15 minutes at `/a/<app>/payslips/<id>/pdf`; the app's My payslips in the Staff tab and the teacher's Classroom tab (the months, the advances, a payslip's lines, days and payments, the PDF in the app's viewer or outside it to keep); on the plan feature `school` (migration `0109`); the store review account (113.8) has a sample payslip of last month, for nothing, final, so My payslips and its PDF have something to show (the owner's decision, 2 November) | unit tests, isolation tests, e2e, flutter widget tests |

## Phase 114: Email campaigns to the people on Yallapp

The owner's request (3 November): a complete email marketing tool in the
admin, like Mailchimp, for emailing the people registered on Yallapp, with
a drag-and-drop builder and at least ten marketing templates. The owner's
decisions: the ready-made templates are in English only, and the builder
and the emails fully support Arabic written by the admin (right to left,
mirrored); 60 emails a minute by default, changeable per campaign; account
owners by default, team members only when a campaign asks for them (they
didn't sign up themselves); an unsubscribe is the address's, across every
account it belongs to.

| | Step | Done when |
|---|---|---|
| [x] | 114.1 The data and sending: campaigns (draft, scheduled with the time zone it was picked in, sending, paused, sent, cancelled; archived; duplicated), their audience (account state, plan, regular or Studio, app type, language, country, sign-up dates, built an app or not, signed in lately or not, team members as an opt-in, a test list of addresses) with a live count and saved audiences, one email per language (en/ar/tr, each person gets their account's language, else the campaign's main one) written with blocks or as the admin's own HTML; the renderer (tables, inline styles, a fixed width that stacks on phones, Outlook's conditional table, the inbox preview line, dark-mode colors, right to left with mirrored alignment, columns and arrows; every email ends with why it came, the unsubscribe link and "Yallapp · Cairo, Egypt"), a sanitizer (no scripts, handlers, forms, frames or unsafe links) and merge tags with fallbacks (first name, name, email, business, app, plan, its end date, the sign-in link; a placeholder like `{{discount}}` stops sending until it's replaced); 13 English templates with their own pictures (welcome, new feature, offer with a code, renewal, we miss you, newsletter, Yallapp Studio, customer story, webinar, first app, season's greetings, survey, Yallapp Courier coming soon) and the admin's own saved designs; sending through the platform's SMTP in batches (`netlify/functions/mail-campaigns.mts` every minute, and the frequent job), each campaign at its rate, never twice to one address (a unique list, one run per row, a lost run's rows failed as "interrupted"), two retries 5 and 10 minutes later, an address refused by the server bounced and kept from later campaigns; consent: the signed unsubscribe link and page (en/ar/tr), the inbox's one-click button (`List-Unsubscribe`, `List-Unsubscribe-Post`, RFC 8058), the list of addresses never mailed (unsubscribed, bounced, complained, added by the team), Dashboard › Your account › Emails from Yallapp (account emails still come); opens (a pixel) and clicks (a signed redirect) counted per campaign when it tracks them (on by default), per link; permissions `marketing.edit` and `marketing.send` (owners and admins), every change in the audit log; migration `0111` | unit tests (`mailing.test.ts`), isolation tests (`mailing-isolation.test.ts`), the store suite on memory and MariaDB (`mailing-store.test.ts`, `mailing-mysql.test.ts`) |
| [x] | 114.2 Admin › Email campaigns (Content › Email campaigns): the campaigns' list with their numbers and filters (drafts, scheduled, sending, sent, archived); a new campaign from the templates' gallery (13 ready-made in English with a preview, the team's own, or blank); the steps Audience (the filters with the live count, team members as an opt-in, a test group of addresses, saved audiences), Details (subject and preview line per language, the main language, sender name, reply-to, the rate, tracking), Design and Review & send; the builder (18 blocks on the left to drag onto the email or click, the email in the middle with drag to move, up, down, duplicate and delete, columns that take blocks, the chosen block's content and look on the right: colors, fonts, size, alignment from the line's start, space, corners, full width; the whole email's colors, font, width and corners; merge tags with fallbacks; pictures uploaded to Yallapp's files; undo and redo; a version per language, Arabic right to left by itself and switchable; desktop and phone previews, light and dark; the email's size against Gmail's limit; save as template), HTML mode (the code beside its live preview; from blocks one way, back to blocks dropping the HTML changes), the review (what stops it, the inbox's view, the email's preview, a test to up to five addresses, send now or schedule in a time zone, off the schedule again, delete a draft); the report (live while sending: progress, sent, opens, clicks, unsubscribes, failures and bounces, each link, each person with their status and why, pause, resume, cancel, duplicate, archive); Templates, Audiences and Never mailed (keep an address out; allow one again, never one that unsubscribed itself) | e2e `email-campaigns.spec.ts` (build with a dragged block and a changed one, undo and redo, previews, audience count, test send, schedule and off again, send, the email's one-click unsubscribe headers, its unsubscribe page, Never mailed) |
| [x] | 114.3 The owner's decisions after the UI (4 November): the privacy policy says what campaigns do, in English, Arabic and Turkish (section 5, "Emails from Yallapp": who gets them, the open picture and the click redirect unless a campaign turns them off, what is kept (the time, the email, the address) and why, 12 months, then deleted by the daily job (`MAIL_HISTORY_MONTHS`: opens and clicks, and the per-person rows and runs of campaigns finished before then; campaigns keep their totals, and the addresses never to be mailed stay), how to stop (the link, the inbox's button, Dashboard › Your account), account and security emails still coming, refused addresses kept out); the sending pace never below 45 a minute while a campaign has emails due: a pool of 3 SMTP connections for the run, 3 emails at once, batches of 30 until the 7-second budget or the minute's quota (the scheduled function calls up to 3 times a minute); each run kept (`mail_runs`, migration `0112`) and shown on the report with the last 5 minutes' pace; below 45 a minute over 5 minutes (or the campaign's own lower rate), a team alert `mail_slow` in Admin › Watching, closed by itself when the pace is back or the campaign ends | `mailing.test.ts` (a 300 ms-an-email server: the minute's 60 in about 6 s, 3 at once, never twice; the alert opens, is counted and closes), `mailing-store-suite.ts` on memory and MariaDB (runs, 12 months' pruning), `privacy-mail.test.ts` |
| [x] | 114.4 Contacts (10 November): Admin › Email campaigns › Contacts (`marketing.edit`) for customers and leads without an account: add one, paste a list (`email, name, company`) or upload a CSV with a header row, previewed with each row's problem, deduped by lower-case address against contacts and accounts (an account is reported, not added); where they're from (existing customer, met in person / call, event, website form, other) and the tick "These people are our customers or business contacts, or agreed to receive our emails" required, kept as who added them and when; edit, tag and untag, delete (the address stays never mailed), search, filter by tag, export CSV; a campaign's audience is accounts, contacts (tags, language, country) or both, an address once, contacts in the live count; the same suppression list, unsubscribe link and one-click headers, an unsubscribe marks the contact; merge tags for contacts (name, company as the business, sign-up as the sign-in link; app, plan and its end date empty or their default) in the editor's tag help; migration `0123` | `mailing-contacts.test.ts`, `mailing-contacts-actions.test.ts`, the store suite on memory and MariaDB |

## Phase 115: The marketplace: many restaurants and shops in one app

The owner's request (4 November): an app like Talabat or Yemeksepeti, with
many restaurants and many supermarkets and shops, run by the app's owner
from Yallapp's website. It's a Yallapp Studio project type that grows
Studio's Food delivery (105.1, on 104's delivery and Yallapp Courier) into
a marketplace, on the Studio plans' features: Studio clients turn it on
from Studio, never from regular apps.

The owner's decisions:

- **Countries and currencies.** Every country and every currency: the app's
  owner picks the app's country and currency, and nothing is fixed to Egypt
  or Turkey.
- **Money.** The app's owner takes the money, and how the owner and the
  vendors settle (cash on delivery included) is between them, outside
  Yallapp. Yallapp computes it all, per vendor and per period:
  - the sales, and the prices before and after discounts;
  - the discounts and coupons, and who paid for each;
  - the vendor's commission (a percentage or a fixed amount, set by the
    owner per vendor);
  - the delivery fee and its share;
  - taxes;
  - refunds and compensations;
  - what each side owes the other.

  The statements export to CSV, Excel and PDF.
- **The vendor's own place.** Each vendor has two:
  - a web panel on Yallapp's site, with its own sign-in, separate from the
    owner's dashboard;
  - a vendor app in the app's bundle.

  Vendors have no way to reach customers: no phone, chat or email is shown
  anywhere, and every contact goes through the app's owner.
- **Delivery, the vendor's choice.** Either:
  - the app's couriers (Yallapp Courier, live on the map), where the owner
    sets the courier fee (fixed, a percentage or per km) and its commission;
  - or the vendor's own delivery, where the vendor sets its delivery fee
    (fixed or per km), the smallest order, and the fewest and most items an
    order may have. It's tracked by its stages without GPS, and on the map
    when the vendor's driver uses the courier app.
- **Joining.** The owner builds an application form in the dashboard, with
  its fields chosen by the owner, the logo among them, and sends its link to
  vendors. The form lives only on Yallapp's website. Applications arrive in
  the dashboard to accept or turn down, and accepting one makes the vendor
  and its first staff account.
- **Complaints.** A customer opens a ticket on an order from the moment
  it's placed until 48 hours after it arrives. The owner's support team
  decides: a refund (full or part, to the payment, the wallet or as a
  coupon), a compensation, or no refund with the reason the customer sees.
  Support talks to the customer in the app, like Yemeksepeti, and is run
  from Yallapp's dashboard.
- **Supermarkets and shops.**
  - Products without a limit, by department and aisle.
  - Items sold by weight, stock and out of stock.
  - The customer's choice when an item is missing: a similar one, a chosen
    one, or leave it out.
  - Imports from Excel, CSV and every other usable format.
- **Payments.** Cash on delivery, Apple Pay and Google Pay, and cards.
- **Also.** Coupons, orders for later, pick-up from the vendor, a delivery
  club (free or cheaper delivery, monthly or yearly, at the owner's prices)
  and a wallet in the app.
- **The look.** "Advanced to the most, beautiful, not ordinary and not cut
  short". It's close in feel to Yemeksepeti and Talabat but Yallapp's own:
  no logo, color, name or screen of theirs.
- **Templates.** Clients take it as it is, as ready-made Studio templates,
  and change it freely in the Studio editor.
- **Demo.** Studio's demos get one, like Nakhla School.

**What exists and is reused.**

- **Food delivery (105.1):**
  - restaurants with menus, choices, hours and the smallest order;
  - the cart's quote with delivery by distance;
  - orders and their stages;
  - the restaurant's tab in the customer app (accept with a time, turn
    down, ready, open or busy);
  - commission and statements per restaurant;
  - cash or card;
  - Studio's Restaurants, Food orders and statements pages, and its
    templates and sections (105.1.6).
- **Delivery (104):**
  - couriers, their jobs, the locator and the live map;
  - Delivery settings;
  - Yallapp Courier (104.8) for the couriers.
- **Chat (77):** the app owner's chat.
- **Imports (81.4):** products from CSV or a feed.
- **Payments (37, 96.1):** iyzico, Kashier, Fawaterk, Stripe and PayPal, and
  refunds (47).
- **Demos (110.5, 113):** the clock-made demos (the taxi, the school bus).

**Apple Pay and Google Pay: what the gateways in the repo do.** This was
checked from public pages on 4 November and is to be confirmed with each
gateway before it's switched on.

- **Stripe.** Checkout, its hosted page, shows Apple Pay and Google Pay by
  itself in the countries Stripe serves. It's the way that works in most
  countries.
- **Kashier.** Apple Pay in Egypt, where it started in December 2024. The
  merchant registers its own Apple Pay merchant ID, which Kashier
  provisions.
- **iyzico.** Its Checkout Form speaks of "digital wallets" but names
  neither Apple Pay nor Google Pay. To be asked of iyzico.
- **Fawaterk and PayPal.** Not confirmed.
- **Paymob** (not in the repo): Apple Pay in Egypt. It's a candidate for a
  new gateway.

The design is one wallet-pay interface:

- First, the gateway's hosted page, which needs nothing in the app.
- Then the native Apple Pay / Google Pay sheet in the app, sending its
  token to a gateway that takes tokens.

For food and goods, Apple's rules allow Apple Pay (it isn't an in-app
purchase).

**What the app's owner sets up (never asked for or kept by us in chat):**

- **Apple Pay:**
  - an Apple Pay merchant ID in their Apple developer account;
  - the gateway's payment processing certificate on that ID (the gateway
    gives the request file);
  - for a hosted page on their own domain, the domain's verification file.
- **Google Pay:**
  - a Google Pay & Wallet Console merchant profile, and the app's
    production access request;
  - the gateway's merchant ID for Google Pay.
- **The gateway:** their own keys in Studio › Payments, like today.

| | Step | Done when |
|---|---|---|
| [x] | 115.1 This plan | the owner's decisions written down |
| [ ] | 115.2 Contract: the `marketplace` Studio plan feature and `Config.marketplace` (country, currency, taxes, payment ways, club, coupons, pick-up, orders for later); vendors of three kinds (`restaurant`, `grocery`, `shop`) with their cuisines or departments, ratings, delivery mode and times; the catalog (departments, aisles, products with unit or weight, stock, choices, substitutes) paged and searchable; the cart's quote with every line of the price; orders (now, later, pick-up), their stages and tracking (map or stages); coupons, the wallet, the club; complaints (open, add, read); the Vendor tag for the vendor app (orders, accept with a time, turn down, ready, handed over, open or busy, items in or out of stock); `User.roles` `vendor`; notifications `market_order_update`, `vendor_order`, `complaint_update`, `club_renewal`. Merged before the mobile agent builds the screens | redocly lint, contract tests |
| [x] | 115.3 Data (migrations from `0113`): vendors (105.1's restaurants become vendors of a kind; their menus stay), vendor staff with their own sign-in and roles, departments, aisles and products, the vendor's delivery settings, taxes per app and per vendor, coupons and their uses, the wallet's entries, club plans and members, complaint tickets with their messages, photos, notes and decisions, application forms and applications, each order's price lines; in MemoryStore and MySQL alike; merged in #263, #264 and #265 (migrations 0113–0115) | the store suite on memory and MariaDB, isolation tests (one app's vendors, orders and complaints never reach another, one vendor's never reach another vendor) |
| [x] | 115.4 The money: each order's lines (each item before and after its discount, the coupon and who pays it, the club's discount, the delivery fee and its share, the vendor's commission as a percentage or fixed amount, the tax included or added, at the app's or the vendor's rate, the tip if any, the refunds and compensations later); each vendor's statement for any period (sales, discounts by who paid, commission, delivery, tax, refunds, and what each side owes, cash on delivery and online apart); every currency with its own decimals (ISO 4217), rounding per line and kept as written; exports to CSV, Excel and PDF | unit tests (each case of who pays a coupon, tax in and out, partial refunds after a statement, three-decimal and no-decimal currencies, totals that always add up) |
| [ ] | 115.5 Delivery per vendor: the app's couriers (the owner's courier fee fixed, a percentage or per km, and its commission; 104's jobs, the live map) or the vendor's own (the vendor's fee fixed or per km, the smallest order, the fewest and most items, its own area by distance; the stages for the customer; the map when its driver signs in to Yallapp Courier as the vendor's); pick-up (no fee, a pick-up code); orders for later (times from the vendor's hours and preparation); the logic merged in #266 (lib/market/delivery.ts); the routes and pages come with 115.7 and 115.16 | unit tests, e2e |
| [ ] | 115.6 Joining: the owner's application form (fields chosen and ordered: text, long text, phone, email, number, a list, yes or no, a file, the logo, the place on the map, the hours, documents), its link on Yallapp's site only, limits against abuse; the applications in the dashboard (read, ask for more, accept, turn down with a reason, emailed); accepting makes the vendor from the answers and invites its first staff member; the logic in #270 (lib/market/joining.ts); the form builder, the /join page and the applications page come with 115.7 and 115.12 | unit tests, e2e |
| [ ] | 115.7 The vendor's web panel on Yallapp's site (its own sign-in, separate from the owner's dashboard; staff with roles): orders live with a sound (accept with a time, turn down, ready, handed over), the menu or catalog, stock, hours, open, busy or closed, its delivery settings when it delivers itself, its staff, its statements and their exports, the complaints about its orders to read only; no customer's phone, email or chat anywhere, only the first name and the order; en/ar/tr, right to left. ONE screenshot to the owner before it merges | unit tests, isolation tests, e2e |
| [x] | 115.7.1 Every product with its photo (the owner's rule, 4 November): products have a main photo and up to 8 more, dishes one (JPEG, PNG or WebP, up to 5 MB, 200 to 8000 pixels a side, kept as `product_image` assets); Menu & stock uploads or changes a photo (dropped or chosen, previewed), removes one, filters "No photo only" with its count and marks "Needs a photo"; the Import page places many photos or a ZIP (read in the browser, sent a few at a time) by SKU or barcode, `-2` for the next photos, and fetches imports' picture links into photos (public addresses only, up to 5 MB; the frequent job does a few each run, a failed link keeps its reason until a new link); `MarketAppSettings.requirePhotos` (on unless the owner turns it off) hides products and dishes without a photo from customers and their carts; `MarketProduct.images` in the contract; migration `0116` | unit tests, isolation, MySQL store suite |
| [ ] | 115.8 Supermarkets and shops: departments and aisles, products without a limit (paged, searched, barcode and SKU), sold by unit or weight (the step, the estimated price, the weighed price after picking within a limit the customer agreed), stock and out of stock by itself, the customer's choice when something is missing (similar, a chosen one, leave it out) and the vendor's picking screen; imports from Excel (xlsx, xls), CSV, TSV, JSON and a Google Sheets link, with columns matched, a preview, each row's errors, updates by SKU or barcode, pictures by link, and imports again on a schedule (81.4's import grown); the import engine merged in #267 (lib/market/sheets, catalog-import.ts); the import page, a link re-imported on a schedule and the picking screen come with 115.7 | unit tests (every format, a 50,000-row file), e2e |
| [ ] | 115.9 Complaints: a ticket on an order from when it's placed to 48 hours after it arrives (the reason, the items, photos, words); the dashboard's queue (assignee, status, internal notes, times since opened and since the last answer, ready replies); the decision (a full or part refund to the payment through 47's refunds, to the wallet or as a coupon; a compensation; no refund, with the reason the customer sees), the customer told; talk with the customer in the app's support chat (77) beside the ticket; the vendor reads its orders' tickets and decisions; every step in the audit; the logic in #268 (lib/market/complaints.ts); the queue page and the app screens come with 115.12 and 115.16 | unit tests, isolation tests, e2e |
| [ ] | 115.10 Coupons, the wallet and the club: coupons (a code or automatic; paid by the owner or the vendor; a percentage, an amount or free delivery; the smallest order, first order, per vendor, per kind or department, how many uses in all and per person, dates); the wallet (refunds and credit in, paying all or part of an order with it, its history); the club (the owner's plans, monthly or yearly at the owner's prices, free or cheaper delivery above an amount, paid by card, Apple Pay or Google Pay, renewing, ending, the member's savings); Yallapp sets no prices; the logic in #269 (lib/market/offers.ts); the pages come with 115.12 and 115.16 | unit tests |
| [ ] | 115.11 Payments: cash on delivery (a highest amount if the owner wants one; collected by the vendor or the courier, in the statements); cards, Apple Pay and Google Pay through one wallet-pay interface: the gateway's hosted page first (Stripe Checkout, Kashier's Apple Pay), the app's own Apple Pay and Google Pay sheet next with gateways that take its token; Paymob as a new gateway; the gateway per app by country and currency; what the owner sets up shown in Studio › Payments; the payments layer in #271 (lib/market/payments.ts); the app's own Apple Pay and Google Pay sheet and Paymob are still to do | unit tests with fake gateways |
| [ ] | 115.12 Studio's pages (dashboard Arabic in MSA, Studio's words in Egyptian Arabic, en/ar/tr): the marketplace's overview (orders now, the live map, the day's numbers), Vendors (each one's kind, commission, tax, delivery, staff, open or closed), Applications and the form, Orders across all vendors (filters, step in), Complaints, Coupons, the Club, Wallets, Statements per vendor and period with their exports, Settings (country, currency, taxes, areas, cash on delivery, payments). ONE screenshot to the owner before it merges | e2e |
| [x] | 115.13 The Studio project type: the `marketplace` feature on the Studio plans and in Admin › Plans' choices; turned on from Studio's project settings, Food delivery's projects grown into it with their restaurants kept; the website's Studio page and docs. Done: the kind `marketplace` (the food engine with the vertical `marketplace`, its own menu, offered in Studio › New project), the plan feature named `market` (not `marketplace`: 11.5's removed switch had that key), the switch on Marketplace settings that grows a food project into one and back (lib/market/plan.ts), the hosted API's marketplace routes and `Config.market` only for marketplace projects on such plans (and demos), the choice on the website's Studio plans; the website's /solutions/multi-vendor page and the /docs/multi-vendor guide (en/ar/tr; public pages say "multi-vendor apps", never "marketplace"), and the compare pages' rows | unit tests (`market-project.test.ts`), e2e |
| [x] | 115.14 Ready-made Studio templates: at least three complete designs (the home's sections: a search at the top, the kinds and cuisines, offers, the club, vendors near you, best rated, fastest, the supermarket's departments; the vendor's page; the dish and product cards; colors and texts in en/ar/tr) picked when the project is made and changed freely in Studio's editor, like 105.1.6; the template data here, the Flutter rendering by the mobile agent. Done: the Studio element `market` (lib/pages/types.ts `StudioMarket`: section, style, kind, sort, tag, free delivery, how many; the element's own title and text; validated, in the contract, in the editor's Elements only for marketplace projects, with its inspector), twelve marketplace sections and three templates (Marketplace, Marketplace offers, Supermarket first) in lib/studio/sections.ts, words in en/ar/tr; the app draws them since #262 | unit tests (`market-templates.test.ts`), the mobile agent's widget tests |
| [x] | 115.15 Studio's demo, made from the clock like Nakhla School (110.5, 113): restaurants and a supermarket with full menus and catalogs, offers and coupons, vendors delivering themselves and by the app's couriers, a courier moving on the map, complaints in each state, the wallet, a club member, orders for later and for pick-up, the vendors' statements; the demo number is a customer, a vendor's staff and a courier; on /demo/studio and in Admin › Demo apps › Yallapp Studio. Done: Zad (lib/demo/marketplace.ts), two restaurants (one delivering itself) and Zad Market with six departments and 30 products, some by the kilo; the owner's code, an automatic offer and two of the places' own; the club, the wallet's credit and a refund; the demo number's orders in every state (its courier looping on the map from the clock), complaints in every state, Zad Market's owner and a courier; no photos (`requirePhotos` off for it); the day made again by the daily job, visitors' orders deleted after a day (`deleteMarketOrders`) | unit tests (`marketplace-demo.test.ts`) |
| [ ] | 115.16 The apps (the mobile agent): the customer app's screens in the advanced design, the vendor app as the bundle's third app, Yallapp Courier for vendors' own drivers, the store reviewers' notes for every role | flutter analyze, widget tests |
| [ ] | 115.17 Words for people: the docs, the website's Studio and marketplace pages, the stores' listings; the privacy policy and terms (vendors' data, the wallet, the club's renewals, complaints) in en/ar/tr after the owner reads them | unit tests (pages and their three languages) |
| [x] | 115.18 Places' own offers (asked by the owner): an Offers tab in the vendors' web panel (its owner and managers; not order takers or pickers) where a place makes, pauses and ends coupons and automatic offers for itself only, always paid by it: a percentage, an amount, or free delivery when it delivers itself; the smallest order, uses in all and per person, first order, dates, and its own menu sections, departments, dishes or products (lib/market/vendor-coupons.ts on offers.ts and offer-forms.ts; `market_coupons.product_ids`, `created_by_vendor_id`, `owner_paused`, migration 0117). The owner's controls in Marketplace settings (let places make their own, on by default; the largest percentage) and in Offers & club (pause any place's coupon; the place can't undo it). Statements put them on the place's side | unit tests (`market-vendor-coupons.test.ts`: isolation, roles, items, statements), the store suites on memory and MariaDB |
| [x] | 115.19 Where each place delivers (the owner's rule, 10 November: a customer 1,200 km away saw "2994–3009 min"): every place sets its delivery area, by distance (a radius from its address, 0.5 to 2000 km, `restaurants.max_km`) or by area (some of the owner's named areas, `restaurants.delivery_areas`, migration 0120); the owner's named areas in Marketplace settings (a name, its centre from Google Maps or coordinates, a radius; none: open everywhere; with some, a customer outside all of them is outside every place); places saved before it count as 10 km from their address with a "set its delivery area" warning, and a place off the map doesn't deliver by distance; the dashboard's place form, the places' panel and accepting an application require the area (lib/market/areas.ts); outside it the app shows "Outside delivery area" instead of a time and a fee on cards and the vendor page (with a banner and "Use my location"), never a time, and checkout says so in the app's words; pick-up stays open; Zad's places by radius and by area (Zamalek, Dokki, Mohandessin, Garden City); "Open 24 hours" instead of "Open 00:00–23:59" | unit tests (`market-areas.test.ts`, `marketplace-demo.test.ts`, `market-panel.test.ts`), widget tests (`phase115_market_test.dart`) |
| [x] | 115.20 Places' own controls (the owner's ask): running late without closing (+10 to +60 minutes, a reason customers see: high demand, few couriers, the weather or its own words up to 80 characters; for 30 minutes, 1 or 2 hours or until it ends it; it ends by itself), in every delivery and pick-up time, a note on its card and a banner on its page (`MarketVendorSummary.delay`); its own weekly hours, days off (closed all day on those dates, "opens" after them) and preparation time, from the vendor app and the partner panel's Hours & days off, for its owners and managers only, applied at once; the owner sees "Changed by the place" on the place's page and list with Undo (one level) or Keep, ends a delay, and still edits everything (`restaurants.delay`, `closed_dates`, `vendor_edit`, migration 0121; lib/market/vendor-controls.ts); Zad's places start with no delay, and a visitor's changes go back each day | unit tests (`market-vendor-controls.test.ts`, the store suites on memory and MariaDB), widget tests (`phase115_market_test.dart`, `phase115_vendor_test.dart`) |

## Phase 116: The staff app in the bundle for schools and academies

The owner's request (10 November): every Studio project is one paid,
connected system, a bundle of apps under one license. Delivery, food, rides
and taxi already have their couriers' or drivers' app (112.3), and the
marketplace its vendors' app (115.16). A school (a university too) and an
academy with many teachers get the same: "<app> Staff", for the teachers,
the office staff (the principal, the office) and the bus crews, next to the
students' and parents' app.

- **Where staff work.** Studio › Settings: "In the staff app (in your
  bundle)" or "In the main app". New projects start in the bundle;
  projects made before keep their staff in the main app until the owner
  switches.
- **The main app.** Once the staff app is in the bundle, the main app is for
  students and parents only. Builds made before keep the staff's tabs for
  the people who haven't updated.
- **Sign-in.** The staff sign in with the number the school added them with,
  as they always did.
- **Pushes.** The staff's pushes go to the staff app (112.3's rule).
- **Prices.** No price changes.

| | Step | Done when |
|---|---|---|
| [x] | 116.1 Platform and contract: `apps.staff_app` (migration 0119, `bundle` for new projects, none saved meaning the main app), lib/school/staff-app.ts on lib/market/vendor-app.ts (`<package>.staff`, build config `role` `staff`, Android Firebase when google-services.json lists it, an Unlisted listing), builds `variant` `staff` (`staff_app_off` without it or its kind on the plan), Studio › Settings "Where your staff work", Builds' staff app section, `school.staff_app` and `instructors.staff_app`, device roles `vendor` and `staff`, the staff's pushes (`STAFF_PUSHES`, library loans, a family's message to a teacher) to the staff app's phones | unit tests (`staff-app.test.ts`), the MySQL suites |
| [x] | 116.2 The app: `AppRole.staff`; the staff app's tabs (a school's Classroom for teachers, Staff for its staff and as a note for anyone else, Account; an academy's Teacher and Account), opening on the first; the main app without the staff's tabs and Account entries when `staff_app` is bundle, with a note on the School tab for staff without a child there; the school's news in the staff app | `phase116_staff_app_test.dart`, `build_config_tool_test.dart` |
| [x] | 116.3 Demos and words: Nakhla School and Rawaq Academy in the bundle, their staff apps in Admin › Demo apps with a Build button and on /demo/studio next to the main app (the demo number signs in to both); the reviewers' notes, the plans' highlights, the comparison's "Apps in the bundle", the school and academy solution pages and the FAQ | `demo-apps.test.ts`, `plan-highlights.test.ts`, `school-calendar.test.ts` |
| [ ] | 116.4 Later: the staff app's own iPhone Firebase file and icon, as the couriers' app has (pushes on iPhone until then: the inbox only), and its own reviewers' notes and screenshots | — |

## Phase 117: The website's live activity card and customer reviews

| | Step | Done when |
|---|---|---|
| [x] | 117.1 The live activity card in the bottom start corner of the marketing pages, only from real records: plans paid with the client's "Show my first name and plan on Yallapp's website" (`plan_payments.show_on_site`, off by default), customers the team adds by hand with their agreement, demo sign-ins (`demo_visits`, the country only, 7 days), apps gone live (the kind and store only), new accounts (the country only), and counts from the code when there is nothing else; GET /api/live-activity (a minute's cache, at most 10, en/ar/tr); Admin › Live activity (on or off, kinds, pages, delay, pause, cards per visit; the manual entries); migration 0122 (lib/live-activity) | unit tests (`live-activity.test.ts`), the store suites on memory and MariaDB |
| [x] | 117.2 Customer reviews on the home page from Admin › Reviews (real reviews only, with the customer's agreement; order, hide, delete; translations, photo, source and link), as the approved prototype; labelled sample cards (no rating, badge, link or score) only while no real review is shown and the team leaves them on (`site_reviews`, migration 0122, lib/reviews) | unit tests (`reviews.test.ts`), the store suites on memory and MariaDB |

## Phase 118: Studio sign-in: passwords, the sign-in screen and the account menu

A Yallapp Studio app signs people in the way its owner chooses, any of: a
phone number and a code (as before), an email address and a code, an email
address and a password, a phone number and a password, or a username and a
password. With a password, a new account still proves its email address or
phone number with one code at sign-up (a username account gives one of them,
as the owner chose, to get back in), and a forgotten password is set again
with a code. Studio also designs the sign-in screen and the account menu.
Regular apps keep their codes.

| | Step | Done when |
|---|---|---|
| [x] | 118.1 Platform and contract: `hosted_settings.passwordSignIn` (`by`, `codes`, `recovery`), Studio projects on the hosted API (or an own API Yallapp signs people in to) only; `hosted_users.username` (unique per app) and `hosted_user_passwords` (Argon2id, apart from the user's row; migration 0124); `POST /auth/password` with an email, phone or username, `purpose: reset` at `POST /auth/otp/verify`, `POST /auth/password/reset`, `PUT /me/password`, 409 `use_password` where a code doesn't sign in, `SignupRequired.fields` `username` and `password`, `Config.auth.password_sign_in`; 10 tries per account and 50 per IP in 15 minutes; the review number signs in with the review code as its password; App sign-in's checkboxes for Studio apps (en/ar/tr) | unit tests (`studio-passwords.test.ts`), the MySQL suite (`studio-passwords-mysql.test.ts`) |
| [x] | 118.2 The app: the sign-in screen with the owner's ways (`Config.auth.password_sign_in`: the email, the phone number or the username with the password; "Sign in with a code instead" where codes stay; "Create an account" with a code), sign-up with a username and a password (typed twice), "Forgot password" (a code with `purpose: reset`, then the new password), and "Change password" in Account › Settings; en/ar/tr | `phase118_passwords_test.dart` |
| [x] | 118.3 Studio › Screens (`/dashboard/screens`; Studio apps on Yallapp's server, or on their own API when Yallapp signs people in, which then get `Config.screens` from Yallapp's `/config`): the sign-in screen's look (classic, photo, card or minimal; a photo from the media library; an own title and subtitle per language; the logo on or off) and the account menu (five looks: the name and photo, a card in the app's colour, a cover with the points and shortcuts, quick tiles with the owner's banner, and a dark page with a membership card in the owner's colour, its points and how many are left to use them; order, hide, rename and change the icon of each item; own items that open a page or a link; Settings, privacy and terms always stay, sign out stays at the end and delete account stays inside Settings), with live phone previews; `Config.screens` in the contract; the app draws both; en/ar/tr | unit tests (`studio-screens.test.ts`), `phase118_screens_test.dart` |
| [x] | 118.4 Studio's demo apps open on their own sign-in screen and account menu (`lib/demo/screens.ts`): Sahm Express (photo and card, quick tiles), Sofra Eats (a mezze spread, full photo, cover), Zad (photo and card, night in gold), Masar Rides (photo and card, cover), Lamha Taxi (full photo at night, night in taxi yellow), Nakhla School (a school's red-brick building, no children; photo and card, card), Rawaq Academy (a library, photo and card, quick tiles); a welcome in en/ar/tr; CC0 or public-domain photos only, which need no credit on the screen (public/stories, and public/demo-screens with its CREDITS.json) | `demo-apps.test.ts` |

## Phase 119: Light and dark everywhere, and the bottom bar's designs

The owner's rule (11 November): everything we make works in light and dark mode, and the bottom bar has more than one design.

| Status | Item | Tests |
|---|---|---|
| [x] | 119.1 The account menu's looks in light and dark mode: the premium look (was "night") on a warm light page in light mode and a dark one in dark mode, its membership card dark in both, its icons in a deeper gold on the light page; the cover and tiles' icons lighter on dark cards, the cover's card with a line instead of a shadow in dark mode; Studio › Screens previews the sign-in screen and the menu in light or dark | `phase118_screens_test.dart` |
| [x] | 119.2 The bottom bar's design (`TabBar.design`): classic, pill, minimal, dot, line or bubble (missing: the template's own), with the floating bar, corners, names and middle button as before; its own colours in dark mode (`dark_active`, `dark_inactive`), else the light ones lightened when they'd be hard to see, and dark text on a light pill; Studio's tab bar panel picks the design from small samples, and the editor's phone draws it in light and dark; each Studio demo has its own (119.3 has the list) | `phase119_tab_bar_test.dart`, `pages.test.ts`, `demo-apps.test.ts` |
| [x] | 119.3 Twelve more designs for the bar, each in light and dark mode: glass (a frosted floating bar), notch (a curved cut with the middle tab of three or five a round button in it), lift (the open tab's icon rises in a circle), outline, square, text (names only), island (a dark capsule in the middle, the open tab lit), segment (a segmented track), folder (the bar in the main colour, the open tab rising like a folder's tab), drop, glow and colours (a colour for each tab); and `TabBar.avatar`, the account tab with the person's photo, with any design; picked in Studio's tab bar panel from small samples, drawn in the editor's phone; the demos show some (Zad glass, Masar lift, Lamha an island in taxi yellow at night, Nakhla classic with the photo, Rawaq a segment) | `phase119_tab_bar_test.dart`, `pages.test.ts`, `demo-apps.test.ts` |

## Phase 120: Every page of the app in Studio, and the demos whole

The owner (11 November): a demo used as a template comes complete, every demo and not only Zad, and every page can be changed in Studio, not only the home. Then every screen of the app, not only the tabs.

| Status | Item | Tests |
|---|---|---|
| [x] | 120.1 Pages drawn around the app's own screens (`StudioPage.screen`): the page's header and elements over the screen, which still works under them (its list, its form, its map); the header stays, the elements scroll away with the screen, and the screen's own title gives way to the header; one page per screen; the app shows the page wherever it shows the screen (its tab, a button opening it, the page's address), and the servers send a tab to such a page as one opening the screen (`PageSummary.screen` says which page goes around it), so older apps still show the screen; the hosted API and the WordPress plugin; a header with the page's title and its buttons (`title`); Studio's page panel picks the screen and the canvas shows where the app draws it | `phase120_screen_pages_test.dart`, `pages.test.ts`, `api-test.php` |
| [x] | 120.2 Every Studio demo whole: each tab after the home a Studio page around its screen (Sahm's Send and My shipments, Sofra's Restaurants and My orders, Zad's Search, Orders and Club, Masar's and Lamha's Ride and My rides, Nakhla's School, Rawaq's Courses and My courses, and every demo's Account), with the page's title in the header and a word about the screen, the tabs named in English, Arabic and Turkish; a project started from a demo's template and "Like our demo" get all of it, the bar's design and the demo's sign-in screen and account menu too | `studio-demo-templates.test.ts`, `demo-designs.test.ts`, `market-tabs.test.ts` |
| [x] | 120.3 The WordPress plugin keeps the bar's design, its dark colours and the account tab's photo (119), which it used to leave out | `TabBar119Test.php` |
| [x] | 120.4 Every other screen of the app in Studio: the screens opened from the tabs (`shipment`, `restaurant_menu`, `food_cart`, Zad's place, list, checkout, orders, wallet and complaints, `ride_follow`, a course, a lesson, a quiz and the rest of a course, the school's parts and a parent's, the account's own pages, a conversation) and the screens a button opens (settings, notifications and the like) can each have a page drawn around it; the app draws it wherever it opens the screen, the page's title header with a back button instead of the screen's own top; a tab or a button opening such a page opens the page alone; every Studio demo, its template and "Like our demo" have a page around each of their screens (from 11 to 36), with the screen's own title in the header in English, Arabic and Turkish, or nothing over a screen whose top is its own; those pages count apart from an app's twenty; Studio lists them apart in its page menu | `inner-screens.test.ts`, `phase120_screen_pages_test.dart`, `pages.test.ts` |

## Phase 121: Accounts active from the start, and Studio's screens on WordPress

The owner (11 November): every account is active once it is made, and the person then chooses the regular editor or Yallapp Studio; a Studio app on WordPress designs its sign-in screen and account menu too.

| Status | Item | Tests |
|---|---|---|
| [x] | 121.1 An account is active from the start: whoever signs up opens the dashboard at once; an account still waiting from before becomes active the next time someone of theirs signs in (a suspended one stays suspended); each app still needs its own plan to be built and to run, which the team or a card payment gives it as before, and the admin still offers to activate an account without a plan; the waiting page is for a suspended account only | `auth.test.ts`, `owner-api.test.ts`, `admin-overview.test.ts`, the e2e journeys |
| [x] | 121.2 Where a new account starts (`/start`): the choice of the app editor (an app for a website, shop or academy) or Yallapp Studio (every screen designed, from a demo), in English, Arabic and Turkish; an account without an app comes back to it; our team managing it goes on to the app's type | `client-flow.spec.ts` |
| [x] | 121.3 Studio's sign-in screen and account menu on WordPress: the license check brings them to the plugin (`LicenseStatus.screens`), which keeps the known fields and serves them in its `/config`; Studio › Screens is offered to a Studio project on WordPress | `studio-screens-wordpress.test.ts`, `StudioScreens121Test.php` |
| [x] | 121.4 Plugin 0.4.33: the bar's designs, Studio pages around the app's screens, the title header, and Studio's sign-in screen and account menu | `TabBar119Test.php`, `api-test.php` |

## Phase 122: A web page as a tab, and the courses designed in Studio

The owner (11 November): a bottom-bar tab can open a page of the site inside the app, its link never shown and the site's header and footer hidden; an academy's courses look the way the owner designs them in Studio.

| Status | Item | Tests |
|---|---|---|
| [x] | 122.1 A web page in the app (`Action.web`): opened in the app with no address bar and the link never shown, the site's header and footer hidden (`hide_header`, `hide_footer`), any other parts the owner names as CSS selectors (`hide`, checked), the site's own links kept in the app (`links_inside`); as a tab, the page alone in the tab; Studio's link inspector sets it; the hosted API and the WordPress plugin | `phase122_web_tab_test.dart`, `pages.test.ts`, `WebLook122Test.php` |
| [x] | 122.2 The courses' card (`Config.screens.course_card`): classic, rich (with the teacher's photo), cover or tile, its corners and the facts it leaves out (teacher, rating, price, lessons), in the catalog, My courses, a teacher's and a bundle's courses; Studio › Screens for an academy, with a sample | `phase122_course_card_test.dart`, `studio-screens.test.ts`, `StudioScreens121Test.php` |
| [x] | 122.3 A course's page (`Config.screens.course_page`): a tall cover with the course's name and facts on it, a frosted purchase bar, the tab it opens on, and the students, level, duration, certificate and reviews each left out or shown | `phase122_course_card_test.dart`, `studio-screens.test.ts`, `StudioScreens121Test.php` |

## Phase 123: The premium academy template

The owner (11 November): a premium academy for WordPress (Tutor LMS, Digits, WooCommerce), as advanced as it can be, every colour the owner's to change.

| Status | Item | Tests |
|---|---|---|
| [x] | 123.1 The premium academy, the academy's recommended start in Studio: a home in navy and gold (the greeting, a banner, what the academy promises, the subjects, the popular courses, a certificate card, the newest courses) in light and dark, in English, Arabic and Turkish; the whole project with it: a page around every other screen, a frosted floating bar with the student's photo, a Blog tab with the site's blog in the app (its header and footer hidden, when the site is known from sign-up), the sign-in screen over a photo, the account menu at night in gold, rich course cards, a course's page with a tall cover and a frosted bar, Alexandria; the main colour the owner's (the banner and the card follow it), gold the second | `studio-academy-template.test.ts`, `studio-templates.test.ts` |
| [x] | 123.2 Two screens at one address (an academy's search is its courses, its favourites a tab of My courses): the page drawn there is the one of the screen exactly at it, whichever comes first | `phase123_screen_pages_shared_test.dart` |
| [x] | 123.3 A course's rating on its tall cover with the star drawn as an icon, which every font shows | `phase122_course_card_test.dart` |
| [x] | 123.4 The premium academy's home as it was approved: a greeting header (`StudioHeader.greeting`: today's date over "Good morning, Sara", the search and notifications as small frosted squares), and the student's own cards as a Studio element (`learning`: the course they are taking with the lesson they are on, the minutes left, the teacher and the lesson, how far they are and a button to go on; their learning streak over this week's days; their next live class and when it starts), each shown signed in with something to show; courses picked for them as covers with a gold badge; signed out, a banner to the courses; the bar frosted and floating with every tab named and the open one in ink, the page going on under it; Studio offers the cards to academies, with a sample in the editor's phone; the WordPress plugin keeps both | `phase123_learning_cards_test.dart`, `studio-learning.test.ts`, `studio-academy-template.test.ts`, `StudioLearning123Test.php` |
| [x] | 123.5 This week's learning time: the app counts the time a student spends in a lesson while it is open and the app in front and sends it about once a minute and when the lesson closes (`POST /me/learning-time`); the WordPress plugin (its own table) and the hosted API (migration 0125) keep it per day in the academy's time zone and per course, at most a day's worth; `GET /me/learning-time` gives the last seven days, the week against the one before and all of it; the student's `week` card draws it as bars, the most in gold, and the streak lights the days they learned on | `phase123_learning_time_test.dart`, `LearningTime123Test.php`, `learning-time-store.test.ts`, `learning-time-mysql.test.ts`, `courses-hosted.test.ts` |
| [x] | 123.6 Explore as approved (`Config.screens.looks` `catalog: explore`): the tab's own name as a large title, the search with the filters in it, the subjects as icons from their names, chips in ink (all, free, the best rated, the newest); the course row `premium` (a square picture, the badge, the lessons and rating, the teacher with their photo, the price at the end); the catalog sorted by the best rated (`orderby=rating`) and each course's badge (`CourseSummary.badge`: new in its first 30 days, or one of the three with the most students) on the hosted API and on WordPress with Tutor LMS; Studio › Screens turns each screen's look on; the premium academy's tabs draw their own large titles | `phase123_explore_test.dart`, `courses-hosted.test.ts`, `studio-academy-template.test.ts`, `StudioScreens121Test.php` |
| [x] | 123.8 A course's page as approved (`course_page` `look: premium`): its subject and certificate over its name and its rating count on the tall cover, round dimmed buttons and the way back in the second colour, the teacher on a card with following them (`Instructor.following`, `PUT /teachers/{id}/follow` now on WordPress too, a new course of theirs reaching their followers' inboxes and phones), the tabs as chips in ink with the curriculum first, and the purchase in gold ("Join now") with the old price and the saving; main buttons in gold in a premium screen's scope | `phase123_course_page_test.dart`, `Follows123Test.php`, `studio-academy-template.test.ts` |
| [x] | 123.9 My courses as approved (`looks` `my_courses: premium`): the tab's name as a large title, this week's learning on a card in ink by day and cream by night, the lists as chips with how many each has, the courses in a grid with a ring for how far the student is, and their certificates on a gold tile | `phase123_my_courses_test.dart` |
| [x] | 123.10 The account as approved (`account_menu` header `academy`): the student's photo with a gold ring, their name and email on a card, their courses, certificates and hours as figures, the menu in groups on rounded cards with each entry's icon in the second colour, the night switch on it in gold; the premium academy shows its orders, certificates, quiz results, downloads, settings, help and the two policies, every other entry hidden; Studio › Screens names the header and draws it | `phase123_account_test.dart`, `studio-academy-template.test.ts`, `StudioScreens121Test.php` |
| [x] | 123.11 A lesson as approved (`looks` `lesson: premium`): the player's controls with speed, captions and full screen at the top, 10 seconds back and forward round a frosted play button and the seek bar in parts with the played part in gold; under it where the lesson is (its place and its topic) with a bookmark, its name large, the student's notes, the files and the discussion as chips with their counts, each note with where in the video it was written and when, the next lesson on a card with its picture and minutes, the topic's quiz ahead on gold with its questions and that it opens after the lesson, the files with their kind's icon and size, and marking it complete in gold at the end | `phase123_lesson_test.dart` |
| [x] | 123.12 Signing in as approved (`sign_in` `style: premium`): the owner's welcome large in white over the photo (or the app's colours) with the logo on frosted glass and the academy's name, the page coming up from the foot, and the form on a card: how the student signs in and that a code needs no password, the number with its country's flag and code and a tick once it is complete, "Continue" in gold, the other way in (email, phone, a code or the password) and a new account side by side, and the terms with their links in gold; Studio › Screens offers it with its own picture and preview, the WordPress plugin keeps it | `phase123_sign_in_test.dart`, `studio-academy-template.test.ts`, `StudioScreens121Test.php` |
| [x] | 123.13 The sign-in code as approved (`looks` `code: premium`): the time until a new code can be asked as a gold ring round the message icon, the title, where the code went and how many digits it has, a box per digit with the next one in gold, "Resend" in gold with the time left, and the button in ink; the way back at the top | `phase123_code_test.dart` |
| [x] | 123.7 The cart as approved (`looks` `cart: premium`), where a course may be paid for by card in the app (Android with the owner's "Enroll now" on, never on iPhone nor where the app sells through the store, the owner's choice of 12 November): "Join now" puts the course in the cart; the cart shows each course with its picture and price as the site sells it now (one the student has, or a free one, left out with why), a coupon of the site's in a dashed frame with what it takes off, the card the student saved with the site's payment gateway (WooCommerce's saved payment methods: the brand, the last four digits, their name and when it expires; another card on the checkout), the totals, and "Pay … securely" in gold: one checkout link for every course, the coupon applied and the saved card chosen on the site's checkout; card numbers never reach the app or Yallapp. `purchases.course_cart`, `POST /courses/cart`, `POST /courses/cart/checkout-link`, `GET /me/cards` on WordPress with Tutor LMS selling through WooCommerce | `phase123_cart_test.dart`, `CourseCart123Test.php`, `access-test.php` |
| [x] | 123.14 Plugin 0.4.34: the premium academy's looks, following teachers, learning time, the best rated and badges, and several courses in one checkout with the saved card | `api-test.php`, `access-test.php`, `upgrade-test.php` |
| [x] | 123.15 The premium academy's demo in Studio (Ufuq Academy, `/demo/studio`, the owner's choice of 12 November): an academy app of its own made from the premium academy, navy and gold with every screen of the template, its courses, in light and dark, in English, Arabic and Turkish, with what to try on its home, made with the other demos from Admin › Demo apps; the website's pictures of its home, Explore, a course, a lesson, My courses, the account and the cart are drawn from the app itself | `demo-apps.test.ts`, `studio-demo-templates.test.ts`, `website_screenshots_test.dart` |
| [x] | 123.16 The premium academy's story on the website (`/yallapp-studio/academy`), in English, Arabic and Turkish: a student's day with Ufuq Academy from the morning's sign-in code to the night's lesson, every scene one of the demo's screens; every part explained as it is today (what only a WordPress site with Tutor LMS and WooCommerce adds: the cart, the site's coupon and the saved card, following teachers), how it compares with course platforms by their own pages, six credited photos; in the Studio menu, the footer, the sitemap and llms.txt | `story-pages.test.ts`, `website-seo.test.ts`, `site-i18n.test.ts`, `public.spec.ts` |

## Phase 124: Occasions

The owner (12 November): a page for Black Friday with an offer, 50% off, explaining the whole system in a form other than a story, in English, Arabic and Turkish; an email announcing it; and Occasions in the admin, so each occasion can be extended or run again the next year.

| Status | Item | Tests |
|---|---|---|
| [x] | 124.1 Occasions (`lib/occasions`, the platform setting `occasions`): an offer for a season with its kind, its days (whole days in Istanbul), its percentage, its code and its plans (every plan, the regular apps' or Studio's); upcoming, on now with the days left, over, or off; the coupon it is (once per account, on the payment it is used for, monthly or yearly, a new app's or a renewal's) | `occasions.test.ts` |
| [x] | 124.2 Admin › Occasions: the list with each occasion's days, offer, code and state; a new one from its kind and year (Black Friday: 1–30 November, 50% off every plan, BLACKFRIDAY50, the owner's choice of 12 November); editing its days to extend it, its percentage, code, plans and on/off; "Run it again next year", once it has ended, with a coupon of its own under the same code (an account may use it once each year) and last year's kept, off, under its year; deleting turns its coupon off and keeps its uses; two of a kind never on the same days; every change in the audit log | `occasions-admin.test.ts`, `occasions-admin-actions.test.ts` |
| [x] | 124.3 The Black Friday page (`/black-friday`, `/ar/black-friday`, `/tr/black-friday`), told as one night (the owner, 12 November: not an ordinary page, but a story to live, with graphics and motion, in Yallapp's own colours): the night prices fall, scene by scene as you scroll, from 21:00 to the morning after; a swinging price tag, sale tape, a city at night, premium and Studio screens only, a flip-clock countdown and a coupon to tear and copy; the percentage, days and code from the saved occasion, every plan with its price and its price with the code in the visitor's currency as the payment form charges it, the kinds of app in a shop window, Studio's first, each as its own sign and opening its story where it has one, the four steps printed on a receipt, everything included rising out of a gift box in nine groups, the terms on the back of a coupon, questions and answers; light and dark, mirrored right to left, still with reduced motion; upcoming, on and over; its title, description, share picture, canonical and other languages, breadcrumb, questions and offers as structured data, the sitemap and llms.txt; in the footer while it is on | `black-friday-page.test.ts`, `website-seo.test.ts`, `black-friday.spec.ts` |
| [x] | 124.4 The Black Friday campaign email in English, Arabic (right to left) and Turkish (Admin › Email campaigns › Templates, Offers), with a credited photo; a campaign started from the Arabic or Turkish one starts in its language | `mailing.test.ts` |
| [x] | 124.5 Plugin 0.4.35: a new look for the settings screen and the course, lesson and post boxes (the owner, 12 November: premium like the website, its features as they are): the Yallapp header with the license's state, the sections beside the cards (above them on phones), each card with its Material Symbols Rounded icon (inline SVG, no font), status chips, switches, choice tiles, Ember for the main action and Midnight for the others, empty states; light and dark, mirrored right to left, no request to another site; every setting, field, nonce and saved value as before | `settings-page-check.php`, `license-paused-check.php`, Plugin Check |
| [x] | 124.6 The premium academy offered as it is (the owner, 12 November): in a Studio academy's App setup › Branding first among the designs, in its real picture, and saved as a new project from it starts (its pages, tabs, bar, look, sign-in screen, account menu and sample entries, in the colour just chosen), or its look only, then shown as chosen (`lib/studio/project-templates.ts`; never a page design for other academies); "Premium academy" among /studio/new's Studio projects, the Academy kind with its template picked; Studio's canvas as the app draws the page: the streak's and live class's icons in the icon font, the project's fonts (Alexandria) loaded, a button that hugs its words at the start of its column, a layer's elements as tall as what they hold (a course's badge, not a stripe), a card's bound texts filled from the entry and an empty one left out; the banner's and the offer section's words at their foot in the app too | `studio-project-templates.test.ts`, `studio-canvas-layout.test.ts`, `studio-setup.spec.ts` |
| [x] | 124.7 /demo/studio shows every Studio demo as its app is (the owner, 12 November: some apps still had the basic pictures): Sahm Express, Sofra Eats, Masar Rides, Lamha Taxi, Nakhla School and Rawaq Academy drawn from their real layouts (one file each in `mobile/test/support`, written and kept in sync by `studio-demo-templates.test.ts`), each with its Studio home, header, tab bar, colours and font and two of the screens it is for, in their own drawings; the app draws the icons the demos use (the food demo's dish, the ride demos' Ride tab, the call to action's arrow) and a screen opened over the tabs keeps its Studio header's words in the app's style; Masar Rides' and Lamha Taxi's car types in the designs' car drawings (in the app and on Studio's canvas; none drawn of a van or a six-seat car), Sahm Express's home with its own address and hours where the template asks an owner for theirs (`DEMO_FACTS`; a project keeps the brackets), a school's news (which never has pictures) as cards of words in the school templates, its date on a chip, its title and a line or two, in the app and on Studio's canvas, and the rides, taxi, delivery, food and multi-vendor guides naming the drivers' or couriers' own app instead of a Driver or Courier mode the app no longer has, the multi-vendor demo's courier app offered for download too once built | `studio-demo-templates.test.ts`, `demo-apps.test.ts`, `bot-create.test.ts`, `studio-canvas-layout.test.ts`, `site-content.test.ts`, `public.spec.ts`, `demo-apps.spec.ts` |
| [x] | 124.8 Studio's canvas draws the app's own screens under a page as the app draws them, not a grey placeholder (the owner, 12 November: "show the real screen"): the academy's catalog (the premium Explore with its large title, the search with the filters in it, the subjects as icons, the chips in ink and the courses in the card chosen, or the app's own), My courses (the premium one with this week's learning, the lists as chips with their counts, the courses in a grid with their rings and the certificates' gold tile, or the app's own with its tabs and progress), the account (the premium academy's card with the student's courses, certificates and hours, the entries, the switches and the language, or the plain list with or without the card in the main colour), a course's page (the premium cover with the subject and certificate, the teacher's card, the chips, the units and the purchase in gold, or the app's own) and a lesson (the premium player, notes, next lesson, quiz and files, or the app's own), each in the look chosen in Studio › Screens, in the project's main and second colours and font, light and dark, right to left in Arabic, in the app's words in English, Arabic and Turkish, with the project's courses (else the samples); only a drawing (a click selects nothing, a drop lands at the end of the page's elements), a note on the pointer says so with the way to its look; every other screen a placeholder with its name, "Drawn by the app" and, where Studio › Screens has its look, a link there (`lib/studio/screen-drawing.ts`, `components/studio/app-screens.tsx`) | `studio-screen-drawing.test.ts`, `pages.spec.ts` |
| [x] | 124.9 An academy's own pages in its app, signed in (the owner, 12 November: "the app is linked to the website, so it should sign in automatically, and the link must never show, only the content"): a web page or tab (122) on the WordPress site's own host opens with the student signed in there, by a one-time link from `POST /auth/web-link` (plugin 0.4.36, `Magic_Links`: the site's own host with or without `www.`, https or the site's scheme, its port, no user name; any other address 400 `invalid_request`; once, for 5 minutes; the site's header and footer hidden by the site too when the owner hid both), in the same web view with the address still hidden; signed out, on another host, on the hosted API or when asking fails, the address as it is; signing out of the app forgets the web views' cookies. The camera and microphone for these pages (a video call, an identity check) when the page asks: Android's and iOS's own question first (`yallapp/media_permission`, Android's `CAMERA` with the camera and microphone not required, the iOS usage texts), only the camera and microphone, only while the page is open, a short message when the student refuses; other in-app pages (checkouts) never get them | `WebLink124Test.php`, `api-test.php`, `phase124_web_signed_in_test.dart`, `phase122_web_tab_test.dart` |
| [x] | 124.10 Branding keeps what the owner entered while the step isn't finished (an icon still to upload): every field valid on its own is saved and the page says what is left, in the dashboard and in Studio; Studio's page menu deletes the open page (never the home) after asking, unless a tab, the side menu or another page still opens it, which it names | `studio-page-openers.test.ts`, `studio-setup.spec.ts` |
| [x] | 124.11 A project's file is the whole app (the owner, 12 November: so a template sold to another owner imports everything at once): Studio's "Export the whole project as a file" and "Save this project as a design" carry the pages, the tabs, the tab bar's design, the font, the main and second colours and the looks chosen in Studio › Screens (with the sign-in photo inside the file); importing it offers "The whole project" first, and it, or the design kept in "Mine" applied to the whole project, puts each page where it belongs (the page drawn around the same screen, else at the same address, else the home on the first page; the others added, the project's own pages kept), opens the tabs on the pages where they now are (a tab whose page isn't there goes), and saves the main colour and the screens' looks as the app's (`applyDesignLookAction`, each checked as on its own page); Undo brings the pages and tabs back, the main colour and the screens stay | `studio-design-file-whole.test.ts`, `studio-setup.spec.ts` |
| [x] | 124.12 Under the frosted floating bar (123) a web tab's page (122) ends above the bar, so its last lines and buttons can be reached (the owner, 13 November: the Mock exam page's bottom was under the bar); over a plain bar it ends where the bar starts. Studio's menu leads to how people sign in (App › How people sign in, `/studio/project/app-sign-in`), which it had no link to | `phase122_web_tab_test.dart`, `studio-setup.spec.ts` |
| [x] | 124.13 A lesson's content reaches the app when a plugin of the site empties it outside the website's pages (the owner, 13 November: a lesson whose content is an iframe or text showed nothing in the app; on Tutor LMS alone the plugin serves it): plugin 0.4.37's `Lesson_Renderer::the_content` takes the saved content, formatted as WordPress does, when the `the_content` filters leave it empty (lessons and News & blog articles alike) | `LessonContent124Test.php` |
| [x] | 124.14 A page in the app gets the microphone, the camera and files where the student needs them (the owner, 13 November: the audio call is in a lesson's content, and the identity check's "Upload a file" and "Take a photo" did nothing): a lesson's embedded page (not a video), its full screen and a lesson shown as the site's page ask for the microphone and camera as a web page of the app does (124.9), the embed's frame allowing them; on Android a page's file field gets the camera straight away when it asks for it (`capture`), else a sheet with the camera, the photos and the files as the field takes them (`lib/core/web/web_files.dart`; iOS's web view asks by itself), in web tabs, the owner's web pages and lessons; the iOS usage texts name the pages | `phase124_web_files_test.dart`, `phase124_lesson_media_test.dart` |
| [x] | 124.15 Five premium launch screens chosen and made the owner's own in Studio (the owner, 13 November): Studio › Screens › Launch screen picks Signature (the logo on its tile with two halo rings, a sliding bar), Cinema (a large photo slowly coming closer, the name at its foot, a line filling), Aurora (the main and second colours drifting round a glass disc, pulse rings, bouncing dots), Editorial (an arch picture, the logo over its edge, the words rising, step segments) or Monogram (the mark breathing in a turning gold ring), and its background in light and in dark on their own (a colour, a two-colour gradient top to bottom, diagonal or from the centre, or a photo made 0 to 80% darker; the dark one the look's own until set), the words light on a dark background and dark on a light one unless the owner picks their colour, the logo (the app icon, the logo or a picture of theirs; four sizes; rounded, a circle or as it is), the title and the line under it in each language, the loading sign (bar, ring, dots, steps or none), light and dark, and colours of its own, all checked on the server (`parseLaunchLook`) and shown live beside them; served in `Config.screens.launch` (the hosted API, Yallapp's `/config` and plugin 0.4.38's, which keeps only well-formed values) and carried with its pictures in a project's file; the app keeps it on the phone whenever `/config` arrives and shows it from the next start (`lib/core/launch/`), Signature with the build's name, logo and splash colour until then, light and dark, right to left, still when the phone asks for less movement, read out as loading | `studio-launch.test.ts`, `studio-setup.spec.ts`, `LaunchScreen12415Test.php`, `phase124_launch_test.dart` |
| [x] | 124.16 Yallapp Courier gets an icon of its own (App Review, 13 November, guideline 4.3a: the same icon as Yallapp Business): the "y." in Midnight on Ivory with Ember speed lines (the owner's choice of three), `brand/icon/yallapp-courier-icon-*` and `brand/stores/courier/`; the Courier release writes it as the Android and iOS app icon (`make_icons.py`) and puts it in the Google Play listing | `test_business_store.py` |

## Phase 125: Yallapp Business 1.0.2: Studio apps, Prime and VIP

The owner (13 November): the Studio apps (delivery, food and its marketplace, rides and taxis, schools) get their own tools in Yallapp Business. **Prime** is every app whose plan is a Studio plan: no new subscription and no switch; an app on a regular plan sees "Prime comes with every Yallapp Studio app" with only a link to the website, nothing sold in the app. **VIP** is an app whose plan comes with an account manager (the regular Business plan has it; the team ticks it on the Studio plan it calls "Studio App Business"); Yallapp chooses each client's account manager in Admin, from its own team. The next Business version is 1.0.2.

| Status | Item | Tests |
|---|---|---|
| [x] | 125.1 Contract first (`docs/api/owner.yaml`): the food orders, restaurants, shipments, couriers, rides, drivers, the marketplace's orders, complaints and places, the school's day, excuses, reports and leave, Prime's insights and smart alerts, the account manager's free times and calls; `AppFeatures` `food_orders`, `restaurants`, `shipments`, `rides`, `market`, `school`, `prime` and `vip`; `AppSummary.type` and `vertical` with every value the server sends; `Today.compare`, the new `NeedsYou` kinds and counts; the new push kinds; `Me.account_manager` and `Business.account_manager`; 409 `changed` for a change that lost a race; what differs from the approved spec written in the contract's own words (`queue=customer`, `vendor` taken as it; the decision's `to`, `funder` and `share_with_vendor`; `sent_by.relation` null) | `phase125.test.ts` (every answer checked against the contract), Redocly lint |
| [x] | 125.2 What an app has (`lib/app/areas.ts`): `foodOrders`, `restaurants`, `shipments`, `rides`, `market`, `school`, each with its team permission, and `prime` from the license (`ownerAreas`); the Orders tab only for catalog orders (shops, courses, bookings, events), so delivery, food and ride apps no longer show an empty one (their card payment links stay on the dashboard's Paid orders, with refunds, and in Analytics); no `new_order` push with an `order_id` that opened nothing: an engine's payment link pushes nothing there (its own push does), a school fee paid by card is `payment_received`; amounts in any currency with its own decimals (`KWD 12.500`) | `phase125.test.ts`, `phase64.test.ts`, `isolation.test.ts` |
| [x] | 125.3 Food orders: the lists of Dashboard › Food orders (new, active, done, problems, all; a reference or words) with the new and active counts, an order with its lines, customer, stages, the minutes to offer and the reasons to turn it down, cash to collect and a refund due; accept, turn down, ready and cancel with the dashboard's movers and rules, the customer told, the courier job made, the team's activity recorded; the restaurants open, busy or late, opened again and their delay ended | `phase125.test.ts` |
| [x] | 125.4 Shipments and couriers: the lists of Dashboard › Shipments with the live map's counts, a shipment with its stages, given to a courier (active, the store review's parcels to the review courier only) and moved on with the dashboard's steps; the couriers on duty first, then nearest to the pickup, then by name, free, busy, off or paused | `phase125.test.ts` |
| [x] | 125.5 Rides and drivers: now, scheduled, done and problems with the live map's counts, a ride with its driver and car, given to a driver (not one on another ride) or cancelled without a fee; the drivers ranked as the dashboard ranks them (online, of the ride's type, nearest) | `phase125.test.ts` |
| [x] | 125.6 The marketplace: its orders read only (the places move them), the support queue (waiting on you, on the customer, mine, closed) with whose turn it is and a refund suggested for missing, wrong or damaged items, the conversation, replies, and the dashboard's decisions with what each allows (no refund to the payment of a cash order); its places, open or not, with today's orders | `phase125.test.ts` |
| [x] | 125.7 A school: the day from the gate's board (students in, late, not yet, absent, excused; teachers and staff), the buses running and late, today's pick-up notes, open permission slips and fees due; parents' excuses accepted or declined, teachers' reports read, commented on, sent back or approved, leave approved or refused, all with the dashboard's functions and messages (the school's settings: owners and managers) | `phase125.test.ts` |
| [x] | 125.8 Today for the Studio apps: the engines' own orders and sales today, and what waits (new food orders, shipments without a courier, rides looking for a driver, complaints waiting, excuses, reports and leave), in English, Arabic and Turkish; a Prime app compares today so far with the same weekday last week | `phase125.test.ts` |
| [x] | 125.9 Pushes: `new_food_order`, `shipment_waiting`, `new_complaint`, `prime_alert` and `morning_brief`, each with the ID Yallapp Business opens, each switched off on its own; a leave request reaches the administration with `leave_id` | `phase125.test.ts`, `owner-push.test.ts` |
| [x] | 125.10 Prime: insights for a week or a month against the period before, from what the app sells (catalog orders, appointments, donations, food orders, rides, marketplace orders, shipments) in its time zone (sales, orders, each day, the busy hours by weekday, returning customers, the average order, the five best sellers; null or empty where there is nothing); each person's smart alerts per app (an order waiting, a shipment without a courier, low sales by a time, a message or complaint unanswered, a low rating, a ride without a driver; only those the app has, all off until turned on) and the morning brief at their time, checked by the frequent job and each pushed once (migration 0126: `prime_alerts`, `prime_sends`) | `phase125.test.ts`, `phase125-mysql.test.ts`, `phase61.test.ts` |
| [x] | 125.11 VIP: the team's contact cards in Admin › Team (photo, WhatsApp, phone, the days and hours they take calls, "Account manager"), the client's account manager chosen in Admin › Clients, shown in Yallapp Business with WhatsApp, the phone and the hours when one of the business's apps has a plan with an account manager; its free times (the next five working days in 30-minute steps) and a call asked for at one (one per time however many ask at once), emailed to the manager (`account_manager_call`), confirmed, moved or cancelled on the client's page and in Admin › Calls, every change in the audit log (migration 0126: `staff_profiles`, `clients.account_manager_id`, `account_manager_calls`) | `phase125.test.ts`, `phase125-mysql.test.ts` |
| [x] | 125.12 Yallapp Business 1.0.2 (`business/`): every approved board in light and dark, in English, Arabic and Turkish: food orders, shipments, rides, the marketplace, the school, Prime's Today, Insights, Smart alerts and Looks, VIP, the Prime screen for regular apps, the opening motion; pushes opening the new screens; the fake API's demo apps (Yalla Food, Yalla Market, Hızlı Kurye, Yalla Taxi, Green Hill School); Today's morning brief card from `Today.morning_brief`; version 1.0.2 and its release notes | `phase125_*_test.dart` (en, ar, tr at 390 px), `phase125_models_test.dart`, `phase125_opening_test.dart` |
