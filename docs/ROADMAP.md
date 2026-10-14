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
