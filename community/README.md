# Yallapp Community (app)

The Yallapp Community app (ROADMAP 231): a public community for app makers,
English first, with Arabic and Turkish. It talks to the Community API
(`/api/community/v1`, platform/web) and never sells anything: paid items are
bought on the website and unlock here after signing in.

- Bundle id: `tr.com.yallapp.community` (Android and iOS).
- Run on sample data: `flutter run --dart-define=YC_DEMO=true`.
- Against a server: `--dart-define=YC_API_BASE_URL=https://…/api/community/v1`.
- Continue with Google: `--dart-define=YC_GOOGLE_CLIENT_ID=…` (the server's
  OAuth web client id, public). Continue with Apple needs the "Sign in with
  Apple" capability on the App ID. No key is kept in the app.

## Folders

- `lib/core`: theme tokens from the approved design, the API client, session,
  routing and the shared widgets (area D).
- `lib/features/{welcome,auth,shell,home,profile,social,settings}`: area D.
- `lib/features/{qa,tutorials,badges,notifications}` and
  `lib/core/routing/feature_routes.dart`: area E.
- `lib/l10n/app_{en,ar,tr}.arb`: English is the template.
