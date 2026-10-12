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
| [ ] | 0.3 cPanel on `host.webek.org`: MySQL database and user, Remote MySQL, SSL | WEBEK | Database reachable over SSL with a dedicated user |
| [ ] | 0.4 Netlify site connected to this repository and the domain | WEBEK | A test deploy is live on `yallapp.com.tr` |
| [ ] | 0.5 Staging WordPress site: Tutor LMS, Digits (waabek gateway), WooCommerce, sample lessons (HTML, iframe, video) | WEBEK | URL and a test admin account shared privately |

## Phase 1: Repository foundation

| | Step | Done when |
|---|---|---|
| [~] | 1.1 Repository layout, README, brand files, editor settings | Layout on the branch |
| [~] | 1.2 Architecture, brand rules and the plugin API contract (`docs/api/openapi.yaml`) | Contract approved |
| [~] | 1.3 CI: API contract lint, PHP syntax on 7.4 and 8.3, WordPress coding standards | CI green |

## Phase 2: WordPress plugin (`wp-plugin/yallapp`)

| | Step | Done when |
|---|---|---|
| [ ] | 2.1 Plugin bootstrap, settings page (Yallapp brand), detection of LMS, Digits and WooCommerce | Installs on staging without errors |
| [ ] | 2.2 Auth: Digits OTP request and verify, JWT access and refresh tokens, devices, sign-up, store review access | You sign in with your number and the code arrives through waabek |
| [ ] | 2.3 Tutor LMS adapter: config, categories, courses, course detail, curriculum, my courses | Data matches the website |
| [ ] | 2.4 Lesson content: rendered HTML, clean-up, iframe size metadata, video with signed links | Every sample lesson comes back correctly |
| [ ] | 2.5 Progress, quizzes and certificates (when Tutor Pro is active) | Progress shows on the website |
| [ ] | 2.6 Checkout hand-off with one-time sign-in, free enrollment | A test purchase enrolls the student |
| [ ] | 2.7 Push notification hooks, license client (inactive until Phase 4) | Unit tests pass |

## Phase 3: Flutter app (`mobile/`)

| | Step | Done when |
|---|---|---|
| [ ] | 3.1 Core: white-label config, templates, theme, API client, secure storage | |
| [ ] | 3.2 Sign in and verification code | Sign in on a phone |
| [ ] | 3.3 Home (three templates), courses, course detail, my courses | |
| [ ] | 3.4 Video player with screen-capture blocking and watermark | |
| [ ] | 3.5 HTML and iframe rendering, with automated checks on several screen sizes | No iframe renders at the wrong size |
| [ ] | 3.6 Quizzes, account, settings, push notifications | APK works on your phone against staging |

## Phase 4: Yallapp platform (`platform/web/`, Netlify)

| | Step | Done when |
|---|---|---|
| [ ] | 4.1 Database schema and secure connection from Netlify to MySQL on `host.webek.org` | |
| [ ] | 4.2 Website: landing, guides, legal pages | Live on `yallapp.com.tr` |
| [ ] | 4.3 Client accounts, dashboard, setup wizard | |
| [ ] | 4.4 Super admin: activation and plans | |
| [ ] | 4.5 License and plugin update API; switch on the plugin license client | A test client goes from sign-up to activation |

## Phase 5: App builds (`build/`)

| | Step | Done when |
|---|---|---|
| [ ] | 5.1 Android build per client: APK, AAB, encrypted signing key | |
| [ ] | 5.2 iOS build on macOS CI with App Store Connect | |
| [ ] | 5.3 Automatic store upload for the Pro plan | |
| [ ] | 5.4 File storage on `files.yallapp.com.tr` and downloads in the dashboard | A test client enters details and receives the apps |

## Phase 6: Launch

First real client, then Pro plugin licenses and testing, then adapters for
LearnDash, LearnPress, LifterLMS, MasterStudy, Sensei and Masteriyo.

## Phase 7: More app types

Store (WooCommerce) and Bookings modules.
