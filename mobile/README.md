# Yallapp app (Flutter)

The white-label app every client gets: one codebase, built once per client
with their own name, bundle IDs, colors, template, font and WordPress site.
The app only talks to the client's site, through the Yallapp plugin's REST
API ([`docs/api/openapi.yaml`](../docs/api/openapi.yaml)).

## Structure

```
mobile/
  config/example.json        a build config (docs/build-config.schema.json)
  tool/apply_config.dart     applies a build config to the project
  tool/build_preview.sh      builds the app preview (web) into the platform
  web/                       the web page of the app preview
  assets/fonts/              bundled fonts (SIL OFL, licence next to each font)
  lib/
    main.dart, app.dart      start-up and the app root
    l10n/                    interface strings (ARB) and gen-l10n output
    generated/               build_config.g.dart (written by tool/apply_config.dart)
    core/                    shared by every app type
      api/                   HTTP client, typed models, ApiException
      auth/                  tokens (secure storage), refresh with rotation, sign-in state
      config/                build config + YALLAPP_SITE_URL override
      gate/                  GET /config on start; maintenance, update required,
                             license inactive and offline screens
      preview/               the app preview on the web: its config from the
                             platform, notes where the web can't do something
      purchase/              purchase rules (iOS never checks out)
      routing/               go_router setup, paths, sign-in redirects
      services/              push (FCM), screen capture protection, external links
      storage/               device-only settings (appearance, video, notifications)
      theme/                 palette, Classic / Bold / Minimal, Material Symbols Rounded
      web/                   web views (swappable in tests), in-app web page
      widgets/               buttons, cards, lists, state views, bottom navigation
    modules/
      lms/                   the Academy: sign-in, home (3 templates), courses,
                             course page, my courses, lessons, quizzes, account
      store/                 Store apps (WooCommerce)
      bookings/              Bookings apps
      real_estate/           Real estate apps (hosted API): search, filters,
                             listing page, favorites, messages to the office
      shared/pages/          dashboard pages from /pages: one renderer for
                             every block in every template
  test/                      unit and widget tests with a fake API
    screenshots/             the website's screenshots (tool/screenshots.sh)
  android/, ios/             platform projects (screen capture channels in
                             MainActivity.kt and AppDelegate.swift)
```

## Run it

Requires Flutter 3.47.5 (Dart 3.13.4).

```sh
cd mobile
flutter pub get
dart run tool/apply_config.dart config/example.json
flutter run --dart-define=YALLAPP_SITE_URL=https://staging.your-academy.com
```

`YALLAPP_SITE_URL` points a development build at any site with the Yallapp
plugin, without regenerating the config.

## Build for a client

1. Write the client's build config (the platform does this from the setup
   wizard). It must validate against `docs/build-config.schema.json`.
2. `dart run tool/apply_config.dart path/to/client.json`. This validates the
   config and writes:
   - `lib/generated/build_config.g.dart`: name, site, colors, template,
     font, Firebase options;
   - `android/app/yallapp.properties`: `applicationId` and `namespace`;
   - `android/app/src/main/res/values/yallapp_config.xml`: the label under
     the icon (`short_name`) and the splash color;
   - `ios/Flutter/YallappBuild.xcconfig`: bundle ID and display name;
   - the `version:` line of `pubspec.yaml`;
   - when the config lists Firebase files, `android/app/google-services.json`
     and `ios/Runner/GoogleService-Info.plist` (git-ignored). Without them
     the app builds normally and push is off. `--offline` skips downloads.

   Running it again with the same config changes nothing.
3. `flutter build apk` / `flutter build appbundle` / `flutter build ipa`.
   Signing is added by the build pipeline (Phase 5); never commit keystores,
   `key.properties` or Firebase files.

Launcher icons and splash images from `branding.icon_url` are not generated
yet; the build pipeline will add that step.

## Checks

The same checks run in [`.github/workflows/mobile.yml`](../.github/workflows/mobile.yml):

```sh
dart run tool/apply_config.dart config/example.json
dart format --output=none --set-exit-if-changed lib test tool
flutter analyze
flutter test
flutter build apk --debug
flutter build web --release --base-href /preview-app/
tool/build_preview.sh --check
```

## App preview (web)

The web build of this app is only the **app preview** of the client dashboard
("Preview your app", roadmap 17). It never uses the compiled build config:
`main.dart` starts `runPreview()` (`lib/core/preview/preview_start.dart`),
which reads the token in the page address (`?token=…&theme=dark&lang=ar`)
and gets the build config from `GET <platform>/api/preview/{token}/config`
on the address it was opened from. Android and iOS builds are unchanged.

In the preview:

- each app's preview keeps its own browser storage (`SharedPreferences`
  prefix per app); tokens are kept there instead of the phone's secure
  storage;
- web views (lesson pages, embeds, in-app pages, checkout) show "Available
  in the installed app" with "Open in a new tab"; checkout links are never
  requested; there is no push and no screen capture protection;
- sign-in sends `preview: true` and is offered only when `/config` has
  `auth.preview_sign_in`: then only the store review number signs in, and no
  code is ever sent;
- the hosted API gets the preview link as `X-Yallapp-Preview`;
- a site or API that blocks requests from the platform's address gets a
  message saying how to allow it.

Build it after every change to the app and commit the result; CI fails when
the committed bundle is older than the app's sources:

```sh
tool/build_preview.sh           # flutter build web, then copies to platform/web/public/preview-app
tool/build_preview.sh --check   # what CI runs
```

The bundle is small on purpose: CanvasKit comes from Google's servers, as in
any Flutter web app, and only what browsers load is copied. To try it
locally, run the platform (`platform/web`, `npm run dev`) and open Preview
your app in its dashboard.

## Website screenshots

`tool/screenshots.sh` renders real screens of the app with demo content
(an academy, a flower shop, a beauty studio and an estate agency) through
the fake API, with the bundled fonts and Material Symbols, and writes them
to `platform/web/public/screens/` (1080 x 2340 PNG). Pictures in the demo
content are drawn in the test (`test/screenshots/support/demo_images.dart`),
so nothing is downloaded. `tool/screenshots.sh --check` compares instead of
writing. The normal `flutter test` run skips these tests.

## Rules this app follows

- Every interface string lives in `lib/l10n/app_en.arb` (English, the
  template) with an Arabic and a Turkish translation; widgets read them with
  `context.l10n`, code without a context with `currentL10n`. The language
  comes from Settings, else the device, else `Config.languages.default`, and
  is sent as `Accept-Language`. Arabic is right to left: use
  `EdgeInsetsDirectional`, `AlignmentDirectional` and `PositionedDirectional`
  where a side matters. The template fonts are Latin only; Arabic letters
  come from the bundled Readex Pro (`fontFallback` in the theme), so they
  look the same on every phone. Phone numbers are shown left to right
  (`formatPhone`, `ltrIsolate`).
- Icons are Google Material Symbols, Rounded style only (`AppIcons`).
- No imagery or wording that suggests AI.
- iOS never shows a purchase button for paid courses and never requests
  `/auth/checkout-link`, whatever the server sends. Free enrollment works on
  both platforms.
- Icon buttons have screen reader labels and touch targets of at least
  48 points (`TapTarget`), also where they look smaller.
- Lists show skeletons (`SkeletonList`, `SkeletonHome`, `SkeletonDetail`)
  while they load, not a bare spinner.
