# Working on Yallapp

Read `README.md`, `docs/ROADMAP.md` and `docs/ARCHITECTURE.md` first.

## How work is done

- Follow `docs/ROADMAP.md` one step at a time. Finish a step, run its checks,
  push, report, and wait for approval before starting the next one. Update the
  step's status in the roadmap in the same change.
- `docs/STATUS.md` holds where the work stands: the step in progress, the
  checks it passed, the open pull requests and what waits on the owner. Read it
  first and update it with every step and pull request.
- The plugin and the app must match `docs/api/openapi.yaml`. Change the
  contract first, then the code, in the same change.

## Product rules

- English is the default language. yallapp.com.tr and the client dashboard
  are in English, Arabic and Turkish: every new user-facing string there is
  added in all three. The admin stays in English. Client apps keep their own
  languages as before.
- Icons come from Google Material Symbols (Rounded) only. The one exception is
  the logos of stores and platforms Yallapp works with, used as
  `docs/BRAND.md` › "Third-party brand marks" says.
- No imagery, icons or wording that suggests AI.
- Yallapp's own pages follow `docs/BRAND.md`. Client apps use each client's
  branding; Yallapp's palette is only the default.
- iOS never shows a website checkout, or a link to one, for paid courses. It
  sells them only through the App Store's in-app purchase, when the app has it
  on (Phase 100); without it, iOS shows no purchase button.

## Checks before pushing

```sh
npx --yes @redocly/cli@2.54.2 lint docs/api/openapi.yaml docs/api/platform.yaml docs/api/pipeline.yaml docs/api/owner.yaml
cd wp-plugin/yallapp && composer install && composer lint
find wp-plugin -name '*.php' -not -path '*/vendor/*' -print0 | xargs -0 -r -n1 php -l
```

The plugin supports PHP 7.4 and WordPress 6.0 and later. Never commit secrets,
signing keys or client credentials.
