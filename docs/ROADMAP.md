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
| [ ] | 31.6 The team's edits to what a plan includes (`savePlanLimitsAction`) nudge every WordPress site on that plan | Rare; until then they reach sites at their next check |

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
| [ ] | 33.8 Pictures for designs: slides, people and quotes start without photos (the app's colors and initials instead); a picture library to choose from | Owner's review |
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
| [ ] | 34.8 Account deletion when the client's API is down: the app asks it first and stops on an error, so the person retries; a signed notice (webhook) to the client's API would let Yallapp delete at once and tell the client later | When a client asks for it |
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
| [ ] | 37.9 Refunds from the dashboard: iyzico's flows never had them (refunds are made in each provider's panel); Kashier has a refund call, Fawaterk's isn't documented | A refund action tested against each provider's sandbox |
| [ ] | 37.10 Ticket holds and long-lived pages: places are held for the payment link's hour plus iyzico's 30-minute page; Kashier's session and Fawaterk's invoice may stay payable longer (an expiry field isn't confirmed for either) | The session and invoice expire within the hold, confirmed on each provider |
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
| [ ] | 38.18 A course with every lesson done still says "Continue learning" and opens the first lesson; no "completed" state or certificate prompt on hosted academies | Owner's decision on the wording |
| [ ] | 38.19 Demo previews: the sign-in note says "your app's store review number" (the dashboard next to it gives the demo number), and a gym's classes can't be booked without a membership, which the preview can't buy, so class booking can't be tried in the demo | Owner's decision (a demo membership, a demo note) |
| [x] | 38.20 The events list's `price_label` and server error messages are English in Arabic and Turkish apps (the content API doesn't receive the language); a WordPress site's labels follow the site's language | Done in Phase 43 (43.3) |
| [ ] | 38.21 Designs offer Wishlist and Orders tiles to hosted academies, which have neither (the app now leaves them out); the designs could leave them out too | With the next design update |
| [ ] | 38.22 Share does nothing in a desktop browser without the Web Share API (the preview only); the largest donation isn't in `DonationsConfig`, so a too large amount is refused only after Donate; a course's illustration is cropped large on a tablet's hero | Owner's review |

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
| [ ] | 41.9 A light and dark switch on the website (it follows the visitor's setting only), and dark mode for the dashboard | Owner's decision |

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
| [ ] | 44.7 The owner's time zone: days are UTC on the page and in the CSV | When owners ask |
| [ ] | 44.8 The WordPress plugin's push notifications carry no `notification_id`, so their opens are counted by kind ("New lessons", "Announcements") without an open rate | A plugin release that adds the ID and the devices pushed |
| [ ] | 44.9 Apps built before this phase send nothing: numbers start with each app's next build | Each app's next build |
| [ ] | 44.10 Check on Netlify that `x-nf-geo` or `x-country` reaches the function, and on our reverse proxy that it sends `X-Yallapp-Client-Country`; until then the country can read "Unknown" | Checked on the live site |

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
| [x] | 46.2 Platform: migration 0037 (`apps.play_signing_sha256`, `android_upload_sha256`, `apple_team_id`, `links_check`, `review_prompt`, `crash_reports`; `crash_issues`, `crash_sessions`); Yallapp's `/.well-known/assetlinks.json` and `apple-app-site-association` at the root (every app with its fingerprints; each iPhone app for `/a/<app_id>/*`), the reverse proxy passing them through; the license status, the hosted `/config` and the build config carry the links and switches | `phase46.test.ts` (files, license status against the contract, hosted config against the contract, build config valid only on https), `drizzle-kit generate` clean |
| [x] | 46.3 The link page without the app (`/a/<app_id>/<kind>/<id>`): a WordPress app's link goes on to the site once its plugin serves links (`LINKS_PLUGIN_VERSION`); otherwise the item's name and picture (only published, visible items) in the app's branding, "Get it on Google Play" and, once live, "Download on the App Store"; no price or purchase button on any phone | `phase46.test.ts`, `links-crashes.spec.ts` (Android and iPhone browsers, no price, 404 for another kind) |
| [x] | 46.4 Dashboard: Publishing › Links to your app (the Play App Signing key's SHA-256 with where to find it, refusing SHA-1 and malformed values; the Apple Team ID, filled by iOS builds), "Check links" there and on App setup (the app's facts, and a WordPress site's two files fetched as phones do: https, no redirect, JSON, never a private address, 8 s, 256 kB); every save asks the site to check its license | `phase46.test.ts`, `license-refresh.test.ts`, `links-crashes.spec.ts` |
| [x] | 46.5 Build pipeline: `scripts/fingerprint.py` reports the upload key's SHA-256 and iOS builds the Team ID (`StatusReport.signing`, saved only when changed); the Android release build gets one verified intent filter per link host and path (`android/app/src/links/AndroidManifest.xml` from `tool/apply_config.dart`), the iOS build the Associated Domains capability and `applinks:` entitlement (Fastfile); Flutter's deep linking on | `build/tests` (the fingerprint as keytool prints it), `app_links_test.dart` (the manifest and the Dart config), `bash -n`, `ruby -c` |
| [x] | 46.6 Plugin: `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` (no extension, `application/json`) from the license status, only well-formed values; `<site>/a/<kind>/<id>` redirects to the item's permalink (published, public, no password) or the home page; `/config` shares `<site>/a` and carries the owner's switches; "Unreleased" in readme.txt | `AppLinksTest`; the Tutor LMS integration suite, 273 checks (10 new over HTTP) |
| [x] | 46.7 App: links opened from outside (cold start and while running, a path on Android, the whole address on iOS) and notification links go through go_router's redirect with the table (another app's link, a kind the app type lacks or a bad id open Home); Share on courses, products, services, listings, campaigns, articles and events shares the link | `app_links_test.dart`, `phase46_test.dart` (links sent as the engine sends them, Share) |
| [x] | 46.8 Rating prompt: the store's own prompt (`in_app_review` 2.0.12) after a finished lesson, an order, a booking, a ticket, a donation or the third run; not before three runs over two days, at most every 120 days and three times a year, never in the preview, off with the owner's switch (Stability page); no question first | `review_prompt_test.dart`, `phase46_test.dart` (a finished lesson asks) |
| [x] | 46.9 Crash reports: Flutter's and Dart's handlers, the zone and the isolate's errors; scrubbed (queries, emails, numbers, tokens, codes) on the phone and again on the platform; fingerprint of the error and the app's frames without line numbers; once per run each, at most 10 waiting, sent with the runs counted when the owner and the user (Settings › Privacy › Send crash reports, on by default) allow it, never from development builds or the preview; `POST /crashes` rate limited per address and per app, grouped with counts, first and last seen, versions; a resolved group reported again opens again | `crash_reporter_test.dart`, `phase46.test.ts`, `links-crashes.spec.ts` (ingest, Admin › Crashes with the stack and Mark resolved, the owner's Stability, the switch off) |
| [x] | 46.10 The preview bundle rebuilt | `build_preview.sh --check` |
| [ ] | 46.11 Real permalinks (`<site>/courses/intro/`) don't open the app: only `<site>/a/…` and Yallapp's links do, since Android's intent filters are fixed at build time. A site in a folder (`example.com/learn`) can't serve the files at its domain's root, so only Yallapp's links open its app | Owner's decision (permalink prefixes in the build config) |
| [ ] | 46.12 Native crashes (Java/Kotlin, Swift) and ANRs aren't caught: only errors in the app's Dart code | A native crash handler, when needed |
| [ ] | 46.13 Not tried on real phones: App Links verification by Google, Apple's CDN fetching the association file, the in-app review prompt showing. The crash-free share counts only runs of rebuilt apps; the plugin's own push notifications don't send `link` yet | LAUNCH-CHECKLIST 7g |

