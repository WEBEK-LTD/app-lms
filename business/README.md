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

Without these options the app works the same and Settings › Notifications
says notifications aren't set up in this build. With them, after sign-in the
app asks for permission, registers the token (`PUT /me/push-token`, again on
each token refresh), and a tapped push opens its screen on the right app
(`pushTarget` in `lib/core/services/push.dart`): an order, the appointments,
a conversation, the donations, the builds or the updates. A push that arrives
while the app is open shows at the bottom with "Open"; Kitchen mode reloads on
a new order. For iOS, add the Push Notifications capability to the Runner
target in Xcode under Yallapp's team and upload the APNs key to the Firebase
project.

## What's in it

| Folder | |
|---|---|
| `lib/core/api/` | Typed models of the contract, the HTTP client (bearer token, `Accept-Language`, one refresh for any number of 401s, `{code, message}` errors), the media gate's chunk transport, the fake API |
| `lib/core/auth/` | Tokens in the keychain / encrypted storage (`flutter_secure_storage`), refresh |
| `lib/core/session.dart` | Sign in, the biometric lock, pending/suspended states, the app switcher's choice, the language |
| `lib/core/routing/` | Routes for every screen; the redirect from the session; pushes' deep links |
| `lib/features/` | One folder per screen group: auth, account, today, orders (and Kitchen mode), appointments, events (and the scanner), donations, catalog, media, inbox, users, stats, notify, preview, builds, more |
| `lib/l10n/` | `app_{en,ar,tr}.arb`, written by `tool/build_arb.py` from `tool/strings_*.py` (one row per string in the three languages), then `flutter gen-l10n` |

Each screen and quick action is shown only when the app has it
(`AppSummary.features`): the second tab is the app's main tool (Events,
Appointments, Orders, Donations or its catalog), Inbox and Stats appear when
the app has inquiries and Analytics.

## Checks

```sh
python3 tool/build_arb.py && flutter gen-l10n   # strings complete and generated
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
```

CI runs the same in the Mobile workflow's "Yallapp Business" job when
`business/` changes. Widget tests run every screen group on the fake API, in
English and in Arabic (right to left) for the main screens; unit tests cover
the API client (token refresh, errors, pages, the media gate).

## Store listing ids

- Google Play: `tr.com.yallapp.business`, under Yallapp's developer account.
- App Store: bundle id `tr.com.yallapp.business`, under Yallapp's team; the
  App Store Connect app id is added here once the listing exists.
- Release signing for Android reads `android/key.properties` (git-ignored);
  without it release builds use the debug key and can't be uploaded.
