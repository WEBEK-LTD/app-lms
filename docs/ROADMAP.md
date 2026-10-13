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
| [ ] | 10.3 App: bottom tabs and pages from `/pages`, one renderer for every block in every template, fallback to `/home` | Every block renders in all templates on several screen sizes |
| [x] | 10.4 Dashboard: page and look editor with drag-and-drop ordering, preview, drafts and publish | A client builds and publishes a page |
| [~] | 10.5 Plugin: fetch the published layout from the platform and serve `/pages` with the site's courses, products and posts | A page published in the dashboard shows in a WordPress client's app |
| [~] | 10.6 Hosted API: serve `/pages` and the look for apps on the hosted API, with their dashboard content or connected platform | A page published in the dashboard shows in a hosted app |
| [~] | 10.7 Real estate apps: listings managed in the dashboard, search, filters, favorites and messages to the office | A real estate test app runs on the hosted API |
| [~] | 10.8 Languages: English by default, more languages the client turns on (right-to-left for Arabic), translated page content | A test app switches between English and Arabic |

## Phase 11: The admin runs everything

The WEBEK team controls every part of Yallapp from the super admin pages.

| | Step | Done when |
|---|---|---|
| [ ] | 11.1 Overview: clients, revenue, builds and apps at a glance | The numbers match the data |
| [ ] | 11.2 One page per client: plan and extension, app, connection, builds, app users, notifications | The team handles a client from one page |
| [ ] | 11.3 Website content edited in the admin: home page texts, guides and legal pages | A text change shows on yallapp.com.tr |
| [ ] | 11.4 Email templates edited in the admin | A changed template is what clients receive |
| [ ] | 11.5 Switches: app types, platforms and features on or off, per plan | A switched-off platform disappears from the Website step |
| [ ] | 11.6 Coupons and discounts on plans | A coupon lowers a card payment |
| [ ] | 11.7 Admin team with roles, and a log of every change | A support admin can't change prices; the log shows who changed what |
| [ ] | 11.8 Announcements to clients, in the dashboard and by email | Clients see an announcement |
| [x] | 11.9 Defaults for new apps: template, look and languages | A new client starts with the defaults |
