# Working on Yallapp

Read `README.md`, `docs/ROADMAP.md` and `docs/ARCHITECTURE.md` first.

## How work is done

- Follow `docs/ROADMAP.md` one step at a time. Finish a step, run its checks,
  push, report, and wait for approval before starting the next one. Update the
  step's status in the roadmap in the same change.
- The plugin and the app must match `docs/api/openapi.yaml`. Change the
  contract first, then the code, in the same change.

## Product rules

- Every user-facing string in the apps and on yallapp.com.tr is English.
- Icons come from Google Material Symbols (Rounded) only.
- No imagery, icons or wording that suggests AI.
- Yallapp's own pages follow `docs/BRAND.md`. Client apps use each client's
  branding; Yallapp's palette is only the default.
- iOS never shows purchase buttons for paid courses.

## Checks before pushing

```sh
npx --yes @redocly/cli@2.54.2 lint docs/api/openapi.yaml
cd wp-plugin/yallapp && composer install && composer lint
find wp-plugin -name '*.php' -not -path '*/vendor/*' -print0 | xargs -0 -r -n1 php -l
```

The plugin supports PHP 7.4 and WordPress 6.0 and later. Never commit secrets,
signing keys or client credentials.
