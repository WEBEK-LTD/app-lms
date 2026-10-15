# Roadmap

Work moves one step at a time. A step is finished only when its "done when"
check passes and the owner (WEBEK) approves it. The next step starts after
that.

Status: `[x]` done · `[~]` in progress · `[ ]` not started

## Phase 0: Preparation

| | Step | Owner | Done when |
|---|---|---|---|
| [x] | 0.1 Designs with the Yallapp brand and Google Material Symbols | Claude | Approved on the design canvas |
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
| [ ] | 29.6 Monthly donations: needs iyzico subscriptions (a stored card and recurring charges), which the integration doesn't have; until then `Config.donations.monthly` is false and monthly requests are refused, never charged once | A subscription integration tested against iyzico's sandbox |
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
