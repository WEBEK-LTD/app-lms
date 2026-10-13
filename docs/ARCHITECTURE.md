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
  modules/bookings/ Bookings screens (Amelia, BookingPress, LatePoint): home,
                   services, a service's free times, appointments
```

- The build config's `app_type` (`lms`, `store` or `booking`) picks the module's routes
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
- Bookings apps show free times in the business's time zone, as the booking
  plugin computes them, and book through `POST /bookings/appointments`, which
  runs the plugin's own booking so its emails, approvals and calendar sync
  apply. Payment, when there is one, happens at the business; the app never
  takes payment for an appointment.
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
- Hosted API (`/api/app/{app_id}`), for apps without WordPress: it serves the
  app contract's configuration, sign-in, account, devices, push token and
  notifications endpoints from our own database, behaving like the plugin
  (6-digit codes, 5 attempts, 15-minute access tokens, rotating 30-day
  refresh tokens, a device limit). Codes go out through our WhatsApp Cloud
  API number or a signed webhook to our gateway. Clients send notifications
  from the dashboard; push uses the client's Firebase service account,
  stored encrypted. Content endpoints come from connectors (Shopify and
  others, 8.4 and 8.5) or the dashboard catalog (8.6); without one they
  answer `not_found`. Our team switches an app to it from the admin page.
- Shopify connector (Store apps): the client enters their `myshopify.com`
  address and a Storefront API token on the Website step; the token is
  checked against the shop, stored encrypted and the app moves to the
  hosted API. Products, collections (categories, "frontpage" as featured),
  cart pricing and checkout come from the Storefront API (GraphQL,
  version pinned in code). Checkout creates a Shopify cart with the
  customer's phone and email and opens its checkout page in the app; on
  iOS, carts with digital products (no shipping) are refused. Prices use
  the shop's money format. Shop details and collections are cached for
  five minutes. Reviews and order history are off for Shopify apps.
- No website (Store apps): the client picks "I don't have a website" on the
  Website step and manages products (price, sale price, stock, photos,
  categories, digital or physical), shipping and their iyzico keys on the
  dashboard's Products page (`catalog_*` tables, keys stored encrypted).
  The hosted API serves them through the catalog connector. Checkout
  creates a pending order and opens our payment page (`/pay/<token>`, in
  the client's branding), which collects the customer's details and sends
  them to iyzico's hosted card page with the client's own merchant keys.
  iyzico posts back to `/api/pay/iyzico/<token>`; the order is marked paid
  (and stock taken) only after iyzico confirms the payment for that basket
  and amount. The customer lands on `/pay/<token>/order-received`, which
  the app recognises as the end of checkout; the client gets an email and
  sees the order on the Orders page. Each product also has a public page
  (`/shop/<app>/<product>`) to share.

- Platform settings (`platform_settings`): the team sets the sign-in code
  sender, the email server and Yallapp's own iyzico account on the admin's
  Settings page. A saved setting replaces the matching Netlify variables
  (removing it brings them back); secrets inside are encrypted with the
  context `platform:<key>` and never shown again. Each server instance
  caches the settings for 30 seconds. The plans (names, what's included,
  price text or card price, monthly or yearly, license features) are edited
  on the admin's Plans page the same way; plans without edits keep the
  defaults in `src/lib/plans.ts`. The pricing and home pages render on
  request so they always show the current plans.

## Build pipeline

- GitHub Actions builds Android on Linux and iOS on macOS runners.
- Inputs: the client's build config from the platform.
- Outputs: APK, AAB, IPA, signing key (encrypted), store assets, stored on
  `files.yallapp.com.tr` and listed in the client's dashboard.
- Pro plan: upload to Google Play and TestFlight with the client's API keys.
