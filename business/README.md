# Yallapp Business

Yallapp's own app for the people who run an app on Yallapp (roadmap 59). It is
the client dashboard on a phone: owners sign in with the email and password of
their dashboard and work on the same data through the Owner API
([`docs/api/owner.yaml`](../docs/api/owner.yaml), `https://yallapp.com.tr/api/owner/v1`).

This is a separate Flutter app from the white-label client app in
[`mobile/`](../mobile), with the same conventions (Riverpod, go_router,
Material Symbols Rounded, ARB strings, secure token storage).

| | |
|---|---|
| Package | `yallapp_business` |
| Android applicationId | `tr.com.yallapp.business` |
| iOS bundle id | `tr.com.yallapp.business` |
| Minimum | Android: Flutter's default `minSdk`; iOS 15 (as `mobile/`) |
| Languages | English (default), Arabic (right to left), Turkish |
| Stores | Google Play and the App Store under Yallapp's own accounts (`docs/LAUNCH-CHECKLIST.md` › 7l) |

**No payments of any kind, on any platform.** Plans, renewals and storage
packs are read-only facts with "Manage on yallapp.com.tr", which opens the
browser. There are no buy, renew or upgrade buttons anywhere in the app.

## Run it

```sh
cd business
flutter pub get
flutter run --dart-define=YB_DEMO=true     # the demo: sample apps of every kind, in memory
flutter run                                # against yallapp.com.tr
```

In the demo, sign in with `owner@example.com` and `yallapp-demo`.

Build-time options (`--dart-define`, or `--dart-define-from-file`):

| Key | Default | What |
|---|---|---|
| `YB_API_URL` | `https://yallapp.com.tr/api/owner/v1` | The Owner API (a local platform: `http://10.0.2.2:3000/api/owner/v1` from the Android emulator) |
| `YB_WEBSITE_URL` | `https://yallapp.com.tr` | The website: password reset, legal pages, guides |
| `YB_DEMO` | `false` | Runs on the in-memory API (`lib/core/api/fake_owner_api.dart`) |
| `YB_FIREBASE_*` | none | Push notifications, below |

## Push notifications

Pushes come from **Yallapp Business's own Firebase project** (not a client's;
the server side is `OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT`, Phase 58). The app
takes the project's client options at build time, so no `google-services.json`
or `GoogleService-Info.plist` is needed in the repository, and none must ever
be committed:

```sh
cp config/firebase.example.json config/firebase.json   # git-ignored
# fill in the Android and iOS apps' API keys and app IDs from
# Firebase › Project settings › Your apps
flutter run --dart-define-from-file=config/firebase.json
```

CI (the Mobile workflow's "Yallapp Business" job, and the release workflow
below) builds with the options from the repository's Actions variables
`YB_FIREBASE_PROJECT_ID`, `YB_FIREBASE_SENDER_ID`,
`YB_FIREBASE_APP_ID_ANDROID`, `YB_FIREBASE_API_KEY_ANDROID`,
`YB_FIREBASE_APP_ID_IOS` and `YB_FIREBASE_API_KEY_IOS` (one of them may hold
the whole `google-services.json` or `GoogleService-Info.plist` instead:
`build/scripts/business_store.py firebase`).

Without these options the app works the same and Settings › Notifications
says notifications aren't set up in this build. With them, after sign-in the
app asks for permission, registers the token (`PUT /me/push-token`, again on
each token refresh), and a tapped push opens its screen on the right app
(`pushTarget` in `lib/core/services/push.dart`): an order, the appointments,
a conversation, the donations, the builds or the updates. A push that arrives
while the app is open shows at the bottom with "Open"; Kitchen mode reloads on
a new order. On iOS the push entitlement is in the project
(`ios/Runner/Runner.entitlements`, production, for Release;
`RunnerDebug.entitlements`, development, for Debug and Profile); the APNs key
goes to the Firebase project (LAUNCH-CHECKLIST 7l).

## What's in it

| Folder | |
|---|---|
| `lib/core/api/` | Typed models of the contract, the HTTP client (bearer token, `Accept-Language`, one refresh for any number of 401s, `{code, message}` errors), the media gate's chunk transport, the fake API |
| `lib/core/auth/` | Tokens in the keychain / encrypted storage (`flutter_secure_storage`), refresh |
| `lib/core/session.dart` | Sign in, the biometric lock, pending/suspended states, the app switcher's choice, the language |
| `lib/core/routing/` | Routes for every screen; the redirect from the session; pushes' deep links |
| `lib/features/` | One folder per screen group: auth, account, today, orders (and Kitchen mode), appointments, events (and the scanner), donations, catalog, media, inbox, users, stats, notify, preview, builds, more |
| `lib/l10n/` | `app_{en,ar,tr}.arb`, written by `tool/build_arb.py` from `tool/strings_*.py` (one row per string in the three languages; Phase 61's in `strings_d.py`, Phase 60's in `strings_e.py`, Phase 63's in `strings_f.py`, Phase 64's in `strings_g.py`, Phase 64b's in `strings_h.py`), then `flutter gen-l10n` |

Roadmap 61 added the dark theme (Settings › Appearance: the phone's setting,
light or dark, kept on the phone; colors from `YbColors` in
`lib/core/theme/theme.dart`, read with `context.yb`), Kitchen mode keeping the
screen on while it is open (`wakelock_plus`, `KitchenWake`), moving an
appointment to another free time (Appointments › Change time) and
notifications sent later (Send notification › Later, with the scheduled ones
to change or cancel).

Roadmap 63 added course questions and reviews to the Inbox (tabs
Messages, Questions, Reviews as the app and the person's role have them:
answer a question, reply under a review, hide it or show it again), and a
gym's door: Scan members (the member code in the customer's app, typed or
as a QR code; once a member a day), Members (find by name and check in,
today's check-ins) and Today's "Members in today". Statuses and "Needs you
now" come from the app's own strings with their plurals; mixed-script lines
keep each item whole in Arabic (`isolate`); the updates' Markdown shows
bold, italic and links (`MarkdownText`). The demo has a gym (Pulse Gym)
and the academy's questions and reviews.

Roadmap 64: a question, or a student's answer, can be hidden from others
and shown again (the Inbox's Hidden filter; its author still sees it in the
app); Members freezes a membership from a day until the day it's back or
until unfrozen, and unfreezes it (the door says "Frozen until …"); a tapped
push of another business the person is on switches to it first. The demo
has a hidden question and answer, and a frozen member (Nour Hany).

Each screen and quick action is shown only when the app has it
(`AppSummary.features`): the second tab is the app's main tool (Events,
Appointments, Orders, Donations or its catalog), Inbox and Stats appear when
the app has inquiries and Analytics.

## Checks

```sh
python3 tool/build_arb.py && flutter gen-l10n   # strings complete and generated
dart format --output=none --set-exit-if-changed lib test tool
flutter analyze
flutter test
```

CI runs the same in the Mobile workflow's "Yallapp Business" job when
`business/` changes. Widget tests run every screen group on the fake API, in
English and in Arabic (right to left) for the main screens; unit tests cover
the API client (token refresh, errors, pages, the media gate).

## Releases (Google Play and the App Store)

Roadmap 65. Actions › **Yallapp Business release** › Run workflow
(`.github/workflows/business-release.yml`): which stores, the Google Play
track (internal, alpha or beta; production is promoted in Play Console) and
the version (empty: `pubspec.yaml`'s). The build number is the run's, so it
only goes up. It never publishes and never submits for review. The owner's
steps, and every secret and variable with where it comes from, are in
`docs/LAUNCH-CHECKLIST.md` › 7l; the run's summary lists them as set or
missing.

- **Android** (Linux): the App Bundle signed with the upload key
  (`YB_ANDROID_UPLOAD_KEYSTORE` in base64, `YB_ANDROID_KEYSTORE_PASSWORD`,
  `YB_ANDROID_KEY_ALIAS`, `YB_ANDROID_KEY_PASSWORD`, through
  `android/key.properties` written on the runner and removed; on the first
  run, with `YB_SECRETS_TOKEN` and no key yet, the key is made there and saved
  as those secrets), attached to
  the run and put on the **Yallapp Business test build** pre-release as
  `yallapp-business.aab`, then uploaded by fastlane supply (lane
  `business_play`). Google Play sign-in uses no key file: GitHub's OIDC token
  through Workload Identity Federation (variables
  `YB_GCP_WORKLOAD_IDENTITY_PROVIDER` and `YB_PLAY_SERVICE_ACCOUNT`), checked
  on its own with the workflow's **play_check** (lane `business_play_check`). Google Play takes a
  new app's first App Bundle only by hand in Play Console.
- **iOS** (macOS): the App Store Connect key (`YB_ASC_KEY_ID`,
  `YB_ASC_ISSUER_ID`, `YB_ASC_PRIVATE_KEY`) registers the App ID with push,
  gets the certificate (`YB_IOS_DISTRIBUTION_P12` and
  `YB_IOS_DISTRIBUTION_PASSWORD`, or one made for the run and revoked once
  Apple has processed the build) and the App Store profile, signs the IPA,
  uploads it to TestFlight and waits for processing, then sends the listing,
  screenshots, age rating and App Review's details and chooses the build for
  the version (lanes `business_ipa`, `business_testflight`,
  `business_appstore`, `business_revoke` in `build/fastlane/Fastfile`). The
  app record must exist in App Store Connect first; the run says so.
- **Listings**: `store/android/<locale>/` (en-US, ar, tr-TR) and
  `store/ios/<locale>/` (en-US, ar-SA, tr) in fastlane's file names, plus
  `store/ios/review_notes.txt` and `store/ios/age_rating.json`. What's new
  is `changelogs/default.txt` and `release_notes.txt`: change them before a
  release. `python3 build/scripts/business_store.py check` (and
  `build/tests`) checks every file in every language and the stores' limits.
  The Play icon and feature graphic are `brand/stores`'s.
- **Screenshots**: drawn from the demo's sample apps by
  `test/store/store_screenshots_test.dart` with the app's fonts and icons:
  Today, Orders, the door scanner, Send notification, Stats, Chat,
  Appointments, Menu, Kitchen mode and Media (ten, the App Store's most), in
  English, Arabic and Turkish. (74) Each screen is framed in a phone or tablet under a
  short headline (`test/store/poster.dart`, the captions in the three
  languages), alternating Midnight and Ivory. Sizes: Google Play phones
  (1080 × 1920) and tablets (1600 × 2560, used for 7" and 10"), the 6.9"
  iPhone (1290 × 2796), the 6.5" iPhone (1284 × 2778), the 6.1"–6.3" iPhone
  (1206 × 2622), App Store Connect's 2007 × 2853 size and the 13" iPad
  (2064 × 2752; the app keeps iPad for Kitchen mode on a tablet). The App
  Store's wide artwork (5244 × 2950, 3840 × 2560, 1920 × 1280 and
  3840 × 1646) shows the name and a line beside three screens in iPhones. `flutter
  test` lays them out and checks every caption fits; to write the files:

  ```sh
  YB_SCREENSHOTS_DIR=/tmp/shots flutter test test/store
  ```

## Store listing ids

- Google Play: `tr.com.yallapp.business`, under Yallapp's developer account.
- App Store: bundle id `tr.com.yallapp.business`, under Yallapp's team; App
  Store Connect app id `6827042925`.
- Release signing for Android reads `android/key.properties` (never
  committed; the release workflow writes it from the secrets); without it
  release builds use the debug key and can't be uploaded.
