# yallapp.com.tr

Next.js on Netlify: the public website, the client dashboard, the super admin
and the license and plugin update API. Data is stored in MySQL on
`host.webek.org`; see the "Platform" section of
[`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for how that connection is
secured.

Built in Phase 4. See [`docs/ROADMAP.md`](../../docs/ROADMAP.md).

## What's here

| Area | Routes |
|---|---|
| Website | `/`, `/solutions`, `/solutions/{academy,store,bookings,real-estate}`, `/features`, `/integrations`, `/how-it-works`, `/pricing`, `/demo` (the demo apps, with `/demo/download/<academy|store|bookings|real-estate>` for their APKs), `/faq`, `/contact`, `/docs` and `/docs/<article>` (the user manual, `src/content/docs.ts`; the old `/guides/*` addresses redirect there), `/developers` (API reference made from the contract, `src/content/api-reference.json`), `/terms`, `/privacy`, `/refund`, 404. App screenshots are in `public/screens`; the dashboard ones are taken with `npx playwright test --config playwright.screens.config.ts` |
| Accounts | `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password`, `/pending` (also pay by card) |
| Client dashboard | A sidebar in groups with only the pages the current app uses (a Menu sheet on phones, `src/components/dashboard-nav.tsx`), shared page parts in `src/components/ui.tsx` and `src/components/dashboard.tsx` (Phase 15). An app switcher at the top of the sidebar and "Add an app" (`/dashboard/app-type?new=1`): an account can have several apps, each with its own plan and license, and every page works on the current app. `/dashboard` (overview), `/dashboard/app-type`, `/dashboard/setup?step=website\|branding\|listing\|publishing`, `/dashboard/builds`, `/dashboard/publishing` ("I'll publish it myself" or "Publish it for me": the checklist, listing details and each store's status), `/dashboard/license`, `/dashboard/preview` (17), `/dashboard/open/<app>?to=builds\|publishing\|license\|setup` (links in emails: opens that app); hosted apps: `/dashboard/notifications`, `/dashboard/app-sign-in`; shops without a website: `/dashboard/catalog`, `/dashboard/orders`; bookings without a website: `/dashboard/services`, `/dashboard/appointments`; courses without a website: `/dashboard/courses`, `/dashboard/courses/<id>`, `/dashboard/orders` |
| Super admin | `/admin` (clients: filter, search, activate, renew, suspend, new key, release site, add client, edit details, "Manage their app" to open the client's dashboard; `/admin/clients/<id>` has a section per app with its own plan and license), `/admin/builds` (build queue: times, reasons, build logs, "Mark as not finished"), `/admin/publishing` (apps we publish for clients: their checklist, listing details, a status per store, notes, store links), `/admin/demos` (the demo apps: create or refresh, build, pick the public download), `/admin/releases` (plugin zips), `/admin/plans`, `/admin/payments`, `/admin/settings` |
| Plugin API | `/api/v1/licenses/{activate,check,deactivate}`, `/api/v1/plugin/update`, `/api/v1/plugin/download` (signed links), `/api/v1/sign-in-codes/send` (18: codes a WordPress site makes, delivered on WhatsApp through the app owner's own WABEK number or the platform's sender; `src/lib/license/sign-in-codes.ts`): [`docs/api/platform.yaml`](../../docs/api/platform.yaml) |
| Pipeline API | `/api/v1/builds/queue`, `/api/v1/builds/{id}/config`, `/api/v1/builds/{id}/status`, `/api/v1/builds/{id}/secrets`, `/api/v1/builds/{id}/signing`: [`docs/api/pipeline.yaml`](../../docs/api/pipeline.yaml) |
| Hosted API | `/api/app/{app_id}/…`: the app contract's config, sign-in, account, devices, push token and notifications for apps on the hosted API ([`docs/api/openapi.yaml`](../../docs/api/openapi.yaml)). Clients send notifications from `/dashboard/notifications`. Store apps can take products, cart and checkout from a Shopify store (Storefront API token entered on the Website step, plus an optional Admin API token for order history); apps can also connect ikas, Ticimax, IdeaSoft, Wix, Teachable, Thinkific or SimplyBook.me with their keys (`src/lib/hosted/connectors/platforms.ts`), or a Salla or Zid store with OAuth through Yallapp's partner apps (set in `/admin/settings`, no environment variables; callbacks `/oauth/salla` and `/oauth/zid`, Salla webhooks `/api/webhooks/salla`), or sell without a website: products on `/dashboard/catalog`, orders on `/dashboard/orders`, payment page `/pay/<token>` with the client's own iyzico, Kashier or Fawaterk keys (`src/lib/payments/`), iyzico callback `/api/pay/iyzico/<token>`, Kashier and Fawaterk return and webhook `/api/pay/<provider>/order/<token>`, product pages `/shop/<app>/<product>`. |
| Marketplace | Shops without their own payment account sell through Yallapp's (commission in admin Settings): with iyzico they register as iyzico sub-merchants on `/dashboard/catalog`; with Kashier or Fawaterk they give an IBAN and the team transfers their share. Completing an order, or "Release payout" on `/admin/payments`, releases their share. |
| Plan payments | Clients pay an app's plan by card on iyzico, Kashier or Fawaterk (Yallapp's payment provider and keys in admin Settings) and the card price set in admin Plans, in a currency the provider takes; the callbacks (`/api/pay/plan/<token>` for iyzico, `/api/pay/<provider>/plan/<token>` for Kashier and Fawaterk) activate or extends that app's license. On License & plugin (`#change-plan`) the client upgrades (starts at once, unused days credited at their value) or moves to a lower plan when the period ends. |
| Plans and limits (13) | Four plans (`src/lib/plans.ts`): Starter, Growth, Pro, Business, with features and limits edited on `/admin/plans`. `src/lib/entitlements.ts` gives an app's plan; the hosted API, the license API, `POST /apps/layout`, builds, the page editor and the dashboard hold to it. Owner notices (`owner_notices`) on the overview and by email; `/dashboard/open?app=<id>&to=renew\|change-plan` opens a notice's link on its app. |
| Sign-in for every app (18) | `/dashboard/app-sign-in` (hosted and WordPress apps): phone, email or both (`src/lib/hosted/sign-in-methods.ts`; sent to the plugin as `LicenseStatus.sign_in_methods`), the owner's own WhatsApp number on WABEK with a test code (`src/lib/hosted/app-sender.ts`), and the hosted API's sign-in rules. Email codes use the "Sign-in code" email template. |
| App preview (17) | `/dashboard/preview` ("Preview your app": the real app in a phone frame, Light / Dark, languages, "Reload after changes", a QR code for phones, what's missing; `?pages=draft` shows the Pages & look draft on the hosted API), `/preview-app/index.html?token=…` (the app's web build, `public/preview-app`, made by `mobile/tool/build_preview.sh` and committed; framed by this site only), `GET /api/preview/<token>/config` (the build config of the link's app, [`docs/api/platform.yaml`](../../docs/api/platform.yaml)). Links: `src/lib/preview/token.ts`, an hour, one app, signed with a key made from `SIGNING_SECRET`. The hosted API takes the link as `X-Yallapp-Preview` and allows CORS from the platform's own addresses (`src/lib/preview/cors.ts`). |
| Daily job | `netlify/functions/daily-notices.mts` (Netlify scheduled function, 06:10 UTC) calls `POST /api/internal/daily` with `INTERNAL_JOB_SECRET`; `runDailyNotices` in `src/lib/notices.ts` applies downgrades whose date came, sends the plan-ending reminders (7 days, 1 day, the day) and the app users notices, each once, and deletes what visitors added to the demo apps more than a day ago (`cleanDemoActivity`, `src/lib/demo/cleanup.ts`). |
| Other | `/api/v1/assets/{id}` (uploaded icons and logos), `/api/dashboard/plugin` (signed download for signed-in clients), `/api/dashboard/builds/<build>/files/<kind>` and `/api/admin/builds/<build>/files/<kind>` (build files: a link signed when clicked), `/api/health` |

### How it fits together

- **Stack:** Next.js 16 (App Router, TypeScript strict), React 19, Tailwind CSS 4,
  Zod, Drizzle ORM + mysql2, jose, @node-rs/argon2, nodemailer, Netlify Blobs.
- **Data** goes through the `DataStore` interface (`src/lib/data/store.ts`):
  `MysqlStore` in production, `MemoryStore` when `YALLAPP_DATA=memory` (tests
  and local runs; refused on Netlify).
- **MySQL connection:** one pooled connection per function instance
  (`connectionLimit: 1`), closed about a second after the last query
  (`maxIdle: 0`), TLS 1.2+ with certificate verification, a retry when a
  frozen function's connection was dropped. See `src/lib/data/mysql.ts`.
- **Accounts:** argon2id passwords; the session is an encrypted JWT (JWE,
  A256GCM) in an httpOnly, SameSite=Lax, Secure cookie. Changing the password
  signs out every other session. Sign-in, sign-up and reset are rate limited
  per IP and per email; limits are stored in the database so they hold across
  function instances.
- **Super admins** are the emails in `SUPER_ADMIN_EMAILS`. The first sign-in is
  **Forgot password?** with that email: it creates the account and sends a
  set-password link.
- **Licenses:** keys look like `YALL-7K2D-9QWE-4MNB`. They are stored
  AES-256-GCM encrypted (so the client can always see theirs) plus a SHA-256
  hash for lookups. One license per app, one site per license; site URLs are normalised (scheme,
  `www.`, ports, trailing slashes and `index.php` are ignored; subdirectory
  installs count as different sites).
- **Setup wizard:** each step is validated with the rules of
  [`docs/build-config.schema.json`](../../docs/build-config.schema.json), and the
  full config is validated against the schema itself (Ajv) before a build is
  queued. `src/lib/build-config/build-config.schema.json` is a copy; a unit
  test fails if it drifts from `docs/`.
- **Builds:** "Start new build" (and finishing the wizard the first time)
  stores a build record with a snapshot of the config and the store listing.
  Build numbers and version codes go up by one per build of each app, and an
  app has one build in progress at a time (checked in the same transaction as
  the insert). The pipeline (Phase 5) reads queued builds and reports status,
  a message for the client and file links. Builds & downloads shows each
  build's status in plain words ("Waiting to start", "Building", "Ready",
  "Didn't finish"), when it was queued, started and finished, why it didn't
  finish, and "Try again" (the same version). A build still queued after
  24 hours, or building without a report for 6 hours, has stopped: the next
  "Start new build" closes it, and the team can close it from the build queue
  (`src/lib/builds/view.ts`). The client is emailed when a build finishes; the
  team (`SUPER_ADMIN_EMAILS`) too when it failed or its iOS app couldn't be
  built, with the CI log, which clients never see. New builds need the app's
  plan to be active; files from earlier builds stay downloadable.
- **Secrets clients give us** (Google Play service account JSON, App Store
  Connect .p8) are encrypted with `ENCRYPTION_KEY` and never sent back to the
  browser. Starter clients can add the App Store Connect key too, only to sign
  the iOS app. The pipeline reads them, decrypted, from
  `GET /builds/{id}/secrets` while a build is `building`.
- **Signing keys** the pipeline creates (Android upload key, iOS distribution
  certificate) come back through `PUT /builds/{id}/signing` and are stored
  encrypted with the app. A saved key is never replaced (`409 key_exists`):
  a new Android upload key would lock the client out of updating their app on
  Google Play.
- **Download links:** build files live on `files.yallapp.com.tr`. A Download
  button only shows for a file the latest ready build has; it opens
  `/api/dashboard/builds/<build>/files/<kind>`, which checks the build is one
  of the signed-in client's apps' and redirects to a link signed at that
  moment, so a page left open never hands out an expired link. Links on
  `FILES_BASE_URL` are signed, never stored:
  `?expires=<unix seconds, now + 15 min>&sig=<hex HMAC-SHA256 of "<path>?expires=<expires>"
  with FILES_SIGNING_SECRET>`. The PHP script there checks it with `hash_hmac`
  and `hash_equals` (see `src/lib/files.ts`).
- **Files:** icons, logos and plugin zips go to Netlify Blobs (store
  `yallapp-files`), or `.data/blobs` locally.
- **Publishing (14.1):** on `/dashboard/publishing` the client chooses "I'll
  publish it myself" (the files and our guides; on Pro, store keys for
  automatic uploads) or "Publish it for me": they create their own Google
  Play and Apple developer accounts and a Firebase project (or let us create
  it), invite the publishing team email (admin Settings › Publishing service;
  the contact email until set) and tick each step, and add the listing
  details the setup doesn't ask for (categories, content rating notes, notes
  for reviewers). We never ask for or store their Google or Apple
  passwords. The team moves each store through Waiting for the client,
  Accounts ready, Submitted, In review, Live (with the store link) or
  Rejected (with a note) on `/admin/publishing` (permission
  `publishing.manage`, logged in the audit log); each new status is emailed
  to the client with the "Publishing status changed" template and shows on
  their Publishing page and overview. `canUseManagedPublishing` in
  `src/lib/publishing/steps.ts` lets every app ask until the plan flag
  "managed publishing" exists.
- **App preview (17):** `public/preview-app` is the Flutter app's web build,
  committed because Netlify builds this site without Flutter. Never edit it by
  hand: after a change in `mobile/`, run `mobile/tool/build_preview.sh` (it
  also writes `source.sha256`, which CI compares with the app's sources).
  ESLint skips it and `.gitattributes` hides its diffs.
- **Icons:** Material Symbols Rounded, self-hosted as a small subset in
  `src/app/fonts/`. After adding a name to `src/components/icon-names.ts`, run
  `node scripts/fetch-icons.mjs`.

## Run it locally

Node 22 and npm.

```sh
cd platform/web
npm ci
cp .env.example .env.local      # YALLAPP_DATA=memory needs no database
# fill SESSION_SECRET, SIGNING_SECRET, ENCRYPTION_KEY, and for an admin
# account: SUPER_ADMIN_EMAILS and YALLAPP_SEED_ADMIN_PASSWORD
npm run dev                     # http://localhost:3000
```

In memory mode, emails (reset links, activation) are printed to the terminal.

| Script | What it does |
|---|---|
| `npm run lint` | ESLint (Next.js core web vitals + TypeScript rules) |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright against `next start` in memory mode (run `npm run build` first; `npx playwright install chromium` once) |
| `npm run db:generate` | Writes a SQL migration to `drizzle/` after a schema change |
| `npm run db:migrate` | Applies migrations to `DATABASE_URL` |

CI runs all of these in [`.github/workflows/platform.yml`](../../.github/workflows/platform.yml),
plus a check that the committed migrations match the schema. When migrations or
the data layer change, CI also applies every migration to MariaDB 10.11 (what
production runs) and runs the end-to-end tests against it. To do the same
locally, apply the migrations to an empty database and set `E2E_DATABASE_URL`:

```sh
DATABASE_URL=mysql://user:pass@127.0.0.1:3306/yallapp DATABASE_SSL=disabled npm run db:migrate
E2E_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/yallapp npm run test:e2e
```

Use `autoId()` in `src/lib/db/schema.ts` for auto-increment ids, never
drizzle's `serial()`: its SQL doesn't run on MariaDB.

## Environment variables

| Name | Required | What it is |
|---|---|---|
| `APP_URL` | yes | `https://yallapp.com.tr`. Used in emails and signed links. Falls back to Netlify's `URL`. |
| `YALLAPP_DATA` | no | `mysql` (default) or `memory` (local and tests only). |
| `DATABASE_URL` | yes | `mysql://USER:PASSWORD@host.webek.org:3306/DATABASE` |
| `DATABASE_SSL` | no | `required` (default). `disabled` is refused on Netlify. |
| `DATABASE_CA` | no | The CA of the database server: `host.webek.org` for the bundled one (`src/lib/db/known-cas.json`), or a PEM (`\n` allowed for newlines). |
| `SESSION_SECRET` | yes | 32+ random characters. Encrypts session cookies. |
| `SIGNING_SECRET` | yes | 32+ random characters. Signs download links. |
| `ENCRYPTION_KEY` | yes | 32 bytes, as 64 hex characters (`openssl rand -hex 32`). Encrypts license keys and store API keys. Never change it without re-encrypting. |
| `TRUSTED_PROXY_SECRET` | with the proxy | 32+ characters, shared with `deploy/apache-proxy.conf` on host.webek.org. |
| `SUPER_ADMIN_EMAILS` | yes | Comma-separated super admin emails. |
| `BUILD_PIPELINE_TOKEN` | for Phase 5 | Bearer token of the pipeline API. Without it the pipeline API refuses every request. |
| `INTERNAL_JOB_SECRET` | for 13.4 | 32+ characters. Bearer token of `POST /api/internal/daily`, which the scheduled function `daily-notices` calls once a day. Without it the route refuses every request and no reminders go out. |
| `GITHUB_DISPATCH_TOKEN` | no | Starts the build workflow as soon as a build is queued. A fine-grained GitHub token for this repository only, with **Actions: Read and write**. Unset: builds wait for the workflow's 10-minute schedule. |
| `GITHUB_REPOSITORY` | no | Default `WEBEK-LTD/app-lms`. |
| `FILES_BASE_URL` | no | Where build files are stored. Default `https://files.yallapp.com.tr`. Links on this origin are signed. |
| `OTP_SENDER` | for the hosted API | How sign-in codes are sent: `whatsapp`, `webhook`, `waabek` or `log` (local only; the default in memory mode). Unset: code requests fail with `provider_error`. The admin's Settings page can set this instead (it then replaces all `OTP_*`, `WHATSAPP_*` and `WAABEK_*` variables). |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | with `whatsapp` | WhatsApp Cloud API credentials of our business number. |
| `WHATSAPP_OTP_TEMPLATE`, `WHATSAPP_OTP_LANGUAGE` | no | The approved authentication template (default `yallapp_code`, `en`), with the code in the body and a copy-code button. |
| `WAABEK_API_KEY`, `WAABEK_INSTANCE_ID`, `WAABEK_API_URL` | with `waabek` | WABEK: the account's API key (sent as `X-API-Key`), the instance (WhatsApp number) that sends the codes (unset: WABEK's first connected number), and its address (default `https://waabek.com`). Codes go out with `POST /api/v1/send`, marked `type: "otp"` with the `code`, so WABEK sends them through its approved Authentication template whether or not the 24-hour window is open. |
| `OTP_WEBHOOK_URL`, `OTP_WEBHOOK_SECRET` | with `webhook` | Our code gateway (for example an SMS provider behind our own endpoint). The body is JSON `{phone, code, app_name, expires_in_seconds}`, signed in `X-Yallapp-Signature: sha256=<base64url HMAC-SHA256 of the body>`. |
| `IYZICO_API_URL` | tests only | A fake iyzico for end-to-end tests. Leave unset: payments go to iyzico's live or sandbox API, as each client chooses. Refused on Netlify. |
| `KASHIER_API_URL`, `FAWATERK_API_URL` | tests only | Fake Kashier and Fawaterk servers for end-to-end tests. Leave unset: payments go to their live or test APIs, as each account chooses. Refused on Netlify. |
| `FILES_SIGNING_SECRET` | for Phase 5 | 32+ random characters, the same value as on `files.yallapp.com.tr`. Signs build file download links. Without it they show "Downloads aren't configured yet". |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | yes in production | Outgoing email (cPanel mail works: port 465, `SMTP_SECURE=true`). The admin's Settings page can set this instead, with a test email. |
| `YALLAPP_SEED_ADMIN_PASSWORD` | no | Memory mode only: password for the super admins at start-up. |
| `YALLAPP_BLOBS`, `YALLAPP_BLOBS_DIR` | no | `netlify` or `fs`; defaults to Netlify Blobs on Netlify and `.data/blobs` elsewhere. |

Generate secrets with `openssl rand -base64 48` (session, signing) and
`openssl rand -hex 32` (encryption key, pipeline token, files signing secret).

## Database on host.webek.org (cPanel)

1. **MySQL Databases:** create the database and a dedicated user with a long
   random password, and give the user **All privileges** on this database only.
2. **Remote MySQL:** add `%` as an access host (Netlify has no fixed outbound
   IP). The dedicated user, the password and TLS are what protect it.
3. Make sure the server accepts TLS (`SHOW VARIABLES LIKE 'have_ssl'` is `YES`).
   host.webek.org uses its own CA (bundled in `src/lib/db/known-cas.json`):
   set `DATABASE_CA=host.webek.org`.
4. From your computer, apply the migrations:

   ```sh
   cd platform/web
   DATABASE_URL='mysql://USER:PASSWORD@host.webek.org:3306/DATABASE' npm run db:migrate
   ```

   The script also sets the database's default character set to utf8mb4.
   Run it again after every schema change (`npm run db:generate` first).

## Deploy on Netlify

**Site configuration › Build & deploy › Build settings**

| Setting | Value |
|---|---|
| Base directory | `platform/web` |
| Package directory | (empty) |
| Build command | `npm run build` (also in `netlify.toml`; production deploys run `npm run db:migrate` first) |
| Publish directory | `.next` (also in `netlify.toml`) |
| Node.js | 22 (`NODE_VERSION` in `netlify.toml`) |
| Runtime | Next.js, through `@netlify/plugin-nextjs` (pinned in `package.json`, declared in `netlify.toml`) |

**Environment variables:** add the variables above for the Production context
(and Deploy previews if they should work). Netlify Blobs needs no setup.

**Functions region:** pick the region closest to `host.webek.org`
(Site configuration › Functions). Every request that reads data opens a
MySQL connection to it.

**Domain:** add `yallapp.com.tr` (and `www.yallapp.com.tr` redirecting to it)
under Domain management, with Netlify's certificate.

**After the first deploy:** open `/forgot-password`, enter a super admin email,
and use the emailed link to set the password. Then upload the first plugin
release under **App & plugin versions**.

### yallapp.com.tr through host.webek.org

netlify.app is blocked in some countries, Egypt among them. So the domain doesn't
point at Netlify: it points at host.webek.org, whose Apache fetches every page
from `https://yallapp.netlify.app` (`deploy/apache-proxy.conf`). Visitors only
ever see host.webek.org.

- **DNS** (cPanel › Zone Editor): `yallapp.com.tr` and `www` stay on the
  server's IP. Don't add the domain in Netlify.
- **Netlify:** set `APP_URL=https://yallapp.com.tr` and `TRUSTED_PROXY_SECRET`
  (32+ characters). Without the secret, every visitor would share the proxy's
  IP and rate limits would hit everyone at once.
- **Apache:** copy `deploy/apache-proxy.conf` to
  `/etc/apache2/conf.d/userdata/ssl/2_4/CPANEL_USER/yallapp.com.tr/` and put
  the same secret in it. Copy `deploy/apache-https-redirect.conf` to
  `/etc/apache2/conf.d/userdata/std/2_4/CPANEL_USER/yallapp.com.tr/`. Then run
  `/scripts/rebuildhttpdconf && /scripts/restartsrv_httpd`.
- **TLS:** AutoSSL issues the certificate for yallapp.com.tr on host.webek.org;
  `/.well-known/` is not proxied so renewals keep working.
- **Forms:** `next.config.ts` allows server actions from yallapp.com.tr, because
  the browser's origin differs from the host Netlify sees.

### The daily job (13.4)

Netlify runs `netlify/functions/daily-notices.mts` on its schedule (in the
file's `config`, every day at 06:10 UTC) on published deploys only. It calls
`POST /api/internal/daily` on the site (`URL`, else `APP_URL`) with
`Authorization: Bearer $INTERNAL_JOB_SECRET`. The work is
`runDailyNotices` (`src/lib/notices.ts`), unit tested without Netlify:

- downgrades whose date came are written into the license's plan;
- each app's license gets its reminder 7 days before it ends (sent from 7 to 2
  days left, so a missed day still sends it), 1 day before and on the day (up
  to 2 days after, for the same reason), each once per license period: the
  end date is part of the notice's key, so a renewal starts a new period and
  hides the old period's notices;
- hosted apps get their app users notices again (after a downgrade lowered a
  limit, or users were deleted);
- in the demo apps (Phase 16), orders, appointments, conversations,
  favorites, enrolments and progress older than 24 hours are deleted, and
  devices idle for a day are signed out. Demo apps get no notices.

Every notice is a row in `owner_notices`, unique per app and key; its email
goes out only when the row was new. Running the job twice a day is safe. To
run it by hand: `curl -X POST -H "Authorization: Bearer $INTERNAL_JOB_SECRET" https://yallapp.com.tr/api/internal/daily`.

### Limits to know

- Netlify functions accept request bodies up to 6 MB: app icons are limited
  to 5 MB, logos to 2 MB and plugin zips to 5.5 MB.
- The plugin update API returns download links valid for 24 hours (WordPress
  can download an update hours after checking); dashboard links last 10 minutes.
- Build file links (files.yallapp.com.tr) last 15 minutes from the click on
  Download, which signs a fresh one each time.
