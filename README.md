# Yallapp

Yallapp turns a WordPress academy into branded Android and iOS apps.
Clients keep running their website (WordPress + an LMS plugin, Digits
optional: Yallapp can send the sign-in codes); Yallapp provides the WordPress plugin that exposes it to the
app, the white-label Flutter app, and the platform that builds and delivers
each client's apps.

Yallapp is based in Cairo, Egypt.
Website: [yallapp.com.tr](https://yallapp.com.tr)

## Repository layout

| Path | What lives there | Status |
|---|---|---|
| [`docs/`](docs) | Roadmap, architecture, brand rules and the API contract | Active |
| [`wp-plugin/yallapp/`](wp-plugin/yallapp) | The Yallapp WordPress plugin (PHP) | Phase 2 |
| [`mobile/`](mobile) | The white-label Flutter app: shared core plus one module per app type | Phase 3 |
| [`business/`](business) | Yallapp Business: Yallapp's own Flutter app for the people who run an app on Yallapp | Phase 59 |
| [`platform/web/`](platform/web) | yallapp.com.tr on Netlify: website, client dashboard, super admin, license API | Phase 4 |
| [`build/`](build) | CI pipelines that build, sign and publish each client's apps | Phase 5 |
| [`brand/`](brand) | Yallapp logo, icon, store and favicon files | Active |

## Where to start

1. [`docs/ROADMAP.md`](docs/ROADMAP.md): the steps, in order, and what "done" means for each.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the pieces fit together.
3. [`docs/api/openapi.yaml`](docs/api/openapi.yaml): the contract between the plugin and the app.
4. [`docs/BRAND.md`](docs/BRAND.md): colors, type and icon rules for everything we ship.
5. [`docs/CONNECTORS.md`](docs/CONNECTORS.md): the connectors and adapters, their versions and how to add one.

## Checks

Every push runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Run the
same checks locally before pushing:

```sh
# API contract
npx --yes @redocly/cli@2.54.2 lint docs/api/openapi.yaml docs/api/platform.yaml docs/api/pipeline.yaml docs/api/owner.yaml

# WordPress plugin
cd wp-plugin/yallapp
composer install
composer lint
composer test                 # unit tests
tests/integration/run.sh      # builds WordPress + Tutor LMS on SQLite and runs the API checks

# Yallapp Business (the owners' app)
cd business
flutter pub get && dart format --output=none --set-exit-if-changed lib test && flutter analyze && flutter test

# Platform (yallapp.com.tr)
cd platform/web
npm ci
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e
```
