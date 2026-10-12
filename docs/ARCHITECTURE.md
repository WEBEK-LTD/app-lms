# Architecture

## The pieces

```
Client's WordPress site                    Yallapp (WEBEK)
┌──────────────────────────────┐           ┌───────────────────────────────────┐
│ LMS plugin (Tutor LMS, …)    │           │ yallapp.com.tr on Netlify         │
│ Digits (OTP via the client's │           │  website · client dashboard       │
│   SMS / WhatsApp gateway)    │           │  super admin · license API        │
│ WooCommerce (if used)        │           │            │ MySQL over TLS        │
│ Yallapp plugin ── REST API ──┼──┐        │            ▼                       │
│   /wp-json/yallapp/v1        │  │        │ MySQL on host.webek.org (cPanel)  │
└──────────────────────────────┘  │        │                                   │
                                  │        │ files.yallapp.com.tr (cPanel,     │
          ┌───────────────────────┘        │   Node.js app): build files       │
          ▼                                │                                   │
   Client's branded app (Flutter)          │ CI (GitHub Actions + macOS):      │
   Android + iOS, one build per client ◄───┤   builds, signs, publishes apps   │
                                           └───────────────────────────────────┘
```

- The **app** only talks to the **client's own WordPress site**. Student data
  never passes through Yallapp's servers.
- The **plugin** talks to Yallapp only for license checks and plugin updates
  (site URL, plugin version, license key).
- The **platform** stores client accounts, plans, licenses, app settings and
  build records. It builds apps through CI and hands the files to the client.

## WordPress plugin

One plugin, `yallapp`, with a stable REST namespace `yallapp/v1`. The full
contract is [`api/openapi.yaml`](api/openapi.yaml).

### Adapters

The plugin never exposes an LMS's own data model. Each integration sits
behind an interface, and the plugin picks the implementation at runtime from
what is installed and which version it is.

| Interface | First implementation | Later |
|---|---|---|
| `LmsAdapter`: catalog, course detail, curriculum, enrollment, progress, quizzes, certificates, checkout URL | Tutor LMS (Free and Pro) | LearnDash, LearnPress, LifterLMS, MasterStudy, Sensei, Masteriyo |
| `OtpAdapter`: send code, verify code, find or create the WordPress user by phone | Digits | Other OTP plugins if clients need them |
| `CheckoutAdapter`: where "Enroll now" sends the student | WooCommerce, LMS built-in checkout | |

Rules for adapters:

- Detect features (`class_exists`, `function_exists`, plugin version), never
  assume. Pro features are reported in `GET /config` so the app only shows what
  the site supports.
- Use the LMS's public PHP functions and hooks, not its REST API, which differs
  between versions and is partly Pro-only.
- Keep each adapter's quirks inside the adapter. The REST layer only sees the
  plugin's own data shapes.

### Authentication

1. `POST /auth/otp/request`: the plugin asks Digits to send the code through
   the gateway configured on the site (for example waabek). Requests are rate
   limited per phone number and per IP.
2. `POST /auth/otp/verify`: on success the plugin returns a short-lived access
   token (JWT, HS256, signed with a per-site secret) and a long-lived refresh
   token (random, stored hashed, bound to the device). A new phone number gets
   a one-time `signup_token` instead, exchanged at `POST /auth/register`.
3. Devices are recorded per user. When the limit is reached, the site's setting
   decides: block the new device or sign out the oldest.
4. **Store review access**: an optional test number and fixed code, so Apple
   and Google reviewers can sign in without receiving an SMS.

### Lesson content

The plugin renders lesson content on the server with the same filters the
website uses (`the_content`: blocks, shortcodes, oEmbeds), then:

- strips editor artefacts such as TinyMCE bookmark spans;
- extracts every iframe into an `embeds` list with its source, the width and
  height set in the lesson, the provider (YouTube, Vimeo, same site, other) and
  a known aspect ratio where there is one;
- decides `render_mode`: `native` for plain content, `webview` for scripts,
  page-builder markup or anything the native renderer can't show faithfully.
  The site setting and a per-lesson override can force either mode;
- replaces direct video URLs with signed, expiring links.

### Iframe sizing in the app

Width always matches the content width. Height, in order of preference:

1. measured from the embedded page when it is on the same site;
2. reported by the embedded page through `postMessage` (iframe-resizer style);
3. the provider's aspect ratio (16:9 for YouTube and Vimeo);
4. the height set in the lesson, capped to the visible screen, with a
   full-screen button;
5. otherwise, the visible screen height.

Height is measured again on rotation and when the keyboard opens. Pages that
refuse to be framed show an "Open" card that opens them full screen.

## Flutter app

```
mobile/
  core/            shared: config, theme, templates, auth, API client, storage
  modules/shared/  sign-in, account, settings, orders, notifications
  modules/lms/     Academy screens
  modules/store/   Store screens (WooCommerce): home, shop, product, cart
  modules/booking/ later
```

- The build config's `app_type` (`lms` or `store`) picks the module's routes
  and bottom navigation; everything in `core/` and `modules/shared/` is common.

- One codebase, one build per client. Build-time config: app name, bundle IDs,
  icons, site URL, Firebase files, default template and font.
- Runtime config comes from `GET /config`: colors, home sections, features,
  checkout rules, minimum version, maintenance mode.
- Purchases: Android opens the site's checkout with a one-time sign-in link.
  iOS shows no purchase buttons for paid courses (Apple's digital content rule);
  free enrollment works on both.
- Store apps keep the cart on the device and price it with `POST /store/cart`.
  Checkout opens a one-time link that fills the WooCommerce cart and signs the
  customer in (guests when the shop allows it). Physical goods sell on both
  platforms; iOS never offers digital products.
- Video: screen capture blocked (`FLAG_SECURE` on Android, capture detection on
  iOS) and a watermark with the student's phone number.

## Platform (yallapp.com.tr)

- Next.js on Netlify for pages and API routes.
- MySQL on `host.webek.org`, reached directly from Netlify functions. Because
  Netlify has no fixed outbound IP, the database is protected by:
  - a dedicated user with rights on the Yallapp database only;
  - a long random password, kept only in Netlify environment variables;
  - TLS required on the connection;
  - one connection per function invocation, so cPanel's connection limit is
    never reached.
- Secrets that clients give us (store API keys, signing keys) are encrypted
  with a key that never leaves the server environment.

## Build pipeline

- GitHub Actions builds Android on Linux and iOS on macOS runners.
- Inputs: the client's build config from the platform.
- Outputs: APK, AAB, IPA, signing key (encrypted), store assets, stored on
  `files.yallapp.com.tr` and listed in the client's dashboard.
- Pro plan: upload to Google Play and TestFlight with the client's API keys.
