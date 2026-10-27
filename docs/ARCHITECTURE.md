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
  never passes through Yallapp's servers. The exception is a hosted app for a
  client without WordPress (the hosted API, Phase 8 below).
- The **plugin** talks to Yallapp only for license checks (site URL, plugin
  version, license key), the app's layout, media links and, when
  Yallapp sends the sign-in codes (the default), each code to deliver with
  its phone number, which the platform passes on and doesn't keep.
- The **platform** stores client accounts, plans, licenses, app settings and
  build records. It builds apps through CI and hands the files to the client.
  It calls a WordPress site only to nudge it (Phase 31): after the owner
  saves something the license status carries (app type, sign-in choices,
  plan, account status) or publishes pages, `POST /license/refresh` on the
  plugin, signed with an HMAC of the time keyed with the license key, sent
  after the response (`after()`), 5 seconds at most, https only, never to a
  private address. The plugin accepts it within 5 minutes of its clock, at
  most once every 30 seconds (a nudge too soon schedules one check for when
  the 30 seconds are over), and then runs its usual license check and layout
  fetch: nothing in the nudge is trusted. 47 When the team edits what a plan
  includes (or puts it back to its defaults), every WordPress site whose
  license is on that plan now gets the nudge (`refreshPlanSites`): five at
  once, a second between batches, at most 500 and within 20 seconds; sites
  past that get the change at their next check (within 12 hours). Local
  tests send every nudge to a fake site (`LICENSE_REFRESH_TEST_URL`,
  refused on Netlify).

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
| `OtpAdapter`: send code, verify code, find or create the WordPress user by phone | Yallapp (codes made by the plugin, sent by the platform), Digits (its REST API add-on), development codes | Other OTP plugins if clients need them |
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

1. `POST /auth/otp/request`: the plugin sends a code through the provider
   chosen in its settings: "Sent by Yallapp" (the default; see "Sign-in for
   every app") or Digits, through the gateway configured on the site (needs
   Digits' REST API add-on). Requests are rate limited per phone number and
   per IP. With email sign-in on, `POST /auth/password` signs in with a
   WordPress account's email and password.
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

### Videos on video sites

72 By default a lesson video, a video in lesson text or a page's video
block from YouTube, Vimeo or another video site plays in the site's own
player, with its controls and branding: the page below still follows it
(watch tracking, resume, the end) through the site's JavaScript API, but
the frame fills the box, takes the touches and nothing covers it. The owner
can choose "Hide the video site's branding (at your own risk)" on Screen
protection (`Config.app.hide_video_branding`; WordPress through
`LicenseStatus.hide_video_branding`): then the rest of this section
applies. Hiding YouTube's branding may break YouTube's terms, and YouTube
can block the videos in the app.

With the branding hidden, a lesson video, a video in lesson text or a page's video block never shows
where it is hosted (roadmap 40). YouTube (IFrame Player API), Vimeo (its
player.js) and Bunny Stream (the Player.js protocol) play in a web view
behind the app's own controls, the same as for uploaded files: the site's
player loads with its controls, title, related videos and sharing turned
off, five times as tall as the visible box (51: three before) so what it
still draws along its edges, its pause overlay included, falls outside it,
under a transparent layer that takes every touch, and under the poster
before it starts, in its last half second and after it ends. A listing's
"Watch the video" plays in the same player (51: it opened the site's page
before). What a site draws over the picture itself can't be cropped: a
creator's end-screen cards in the last seconds, a paid-promotion label, ads
on a monetized video. For a guaranteed player without any site, owners
upload to the Media library (below). The page reports
state, time and duration to the app over a JavaScript channel (watch
tracking, resume, the watermark and the screen-capture cover work as for
files) and takes play, pause, seek, speed, captions and quality commands.
Wistia, Dailymotion and Loom keep their own player with the branding options
they offer. In every video web view nothing may replace the page and frames
may not load the sites' own pages or app links, so no tap opens the site,
its app or a browser. The app preview shows the same player in a sandboxed
frame.

## Flutter app

```
mobile/
  core/            shared: config, theme, templates, auth, API client, storage
  modules/shared/  sign-in, account, settings, orders, notifications
  modules/lms/     Academy screens
  modules/store/   Store screens (WooCommerce): home, shop, product, cart
  modules/bookings/ Bookings screens (Amelia, BookingPress, LatePoint): home,
                   services, a service's free times, appointments
  modules/news/    News & blog screens: home, latest, article, saved
  modules/events/  Events & tickets screens: events (list, calendar), event,
                   My tickets with QR codes
  modules/donations/ Charity & donations screens: campaigns, campaign with
                   the donation form, my donations
```

- The build config's `app_type` (`lms`, `store`, `booking`, `real_estate`, `news`, `events` or `donations`) picks the module's routes
  and bottom navigation; everything in `core/` and `modules/shared/` is common.
- App kinds (roadmap 20): `app_type` is the engine (the module); the optional
  `vertical` (`restaurant`, `clinic`, `fitness`, `charity`, `services`; `apps.vertical`,
  build config `vertical`, `Config.vertical`) is the kind of business and only
  changes wording, defaults, the demo and marketing, never routes. The
  dashboard's app type picker shows kinds (an engine with a vertical). What
  each engine and kind is (names, icons, websites it offers, its own content,
  page sources, default pages, store categories, demo and marketing pages)
  lives in one registry, `platform/web/src/lib/app/kinds.ts`; the platform
  reads every per-type value from it. The app's wording helper is
  `mobile/lib/core/l10n/vertical_wording.dart`.
- Services and companies (84.1) are the bookings engine with the
  `services` vertical: the bookings wording and screens, with designs that
  present the company too (About us, Offers and Contact pages as well as
  the home page).
- Clinics (Phase 21) are the bookings engine with the `clinic` vertical:
  doctor, patient and visit wording, doctor profiles (`StaffMember`
  `specialties`, `languages`, `bio`) and an intake form
  (`BookingsConfig.intake_fields`, `answers` when booking). Answers are
  health data: kept with the appointment (`booking_appointments.answers_json`),
  shown only to the patient and on the clinic's dashboard, never in an email,
  push or text message. The intake form is on the hosted API only for now.
- Restaurants (Phase 26) are the store engine with the `restaurant` vertical:
  the Shop tab is a menu with category tabs, dishes have option groups
  (`ProductDetail.option_groups`; the cart sends option IDs and the server
  checks min and max and prices them, never trusting the app), and
  `StoreConfig.fulfilment` asks pickup or delivery, the address and when
  (`GET /store/order-times` computes opening, closing and the times for
  later in the kitchen's time zone; `lib/catalog/fulfilment.ts`). Paid
  orders keep their options and fulfilment (`catalog_orders.fulfilment`,
  `fulfilment_status`) and move forward on the dashboard's Kitchen page
  (`lib/catalog/kitchen.ts`), each step a notification and a push with the
  `order_id`, which opens the order's tracking screen
  (`GET /me/orders/{order_id}`). On WordPress the step follows the
  WooCommerce status; options there are variations (hosted first).
- Gyms (Phase 27) are the bookings engine with the `fitness` vertical:
  `BookingsConfig.classes` turns on the Classes and Membership tabs
  (`/bookings/classes`, `/memberships/*`, `/me/memberships`). Hosted only:
  weekly class templates and plans live in `apps.booking_setup`; classes
  are rows in `class_sessions`, made 8 weeks ahead when the timetable is
  saved and by the daily job (`lib/bookings/classes.ts`). A spot is taken
  in one transaction that locks the class's row and raises `booked_count`
  only while it is below `capacity` (the memory store does it in one
  synchronous step), and uses a credit of the member's membership when
  classes need one; cancelling in time, or the gym calling a class off
  (inbox notification and push), gives both back. Memberships are bought on
  the payment page as an order like products and courses, on iOS too (a
  service used in person, 3.1.3(e)); paying starts the membership
  (`startPaidMemberships`).

- One codebase, one build per client. Build-time config: app name, bundle IDs,
  icons, site URL, Firebase files, default template and font.
- Runtime config comes from `GET /config`: colors, the look (`appearance`), home sections, features,
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
  iOS) and a watermark with the student's phone number, also over videos
  played from video sites.
- Screen protection (Phase 53, `core/services/screen_security.dart`):
  `Config.app.screen_protection` is `off`, `content` (lessons, quizzes and
  their attachments, under `ProtectedContent`) or `app`, as the owner chose
  on the dashboard (WordPress: else the plugin's setting). Android sets
  `FLAG_SECURE` on the window while it applies; iOS draws the window inside a
  secure text field's layer (left out of screenshots where iOS allows it),
  covers protected screens while the screen is recorded or mirrored, says so
  after a screenshot and blurs the app switcher's picture. While it's on,
  attachments open only in the app's own viewer (PDFs drawn by the phone's
  renderer, in memory). The web preview protects nothing.
- Lessons offline (Phase 45, `modules/lms/downloads/`): with
  `features.downloads` (offline mode in the plan and the owner's choice) a
  student saves a lesson or a whole course: the lesson itself, then
  `POST /lessons/{id}/download` gives links to its files (the uploaded or
  direct video file, attachments, images in the text), signed for the
  student for 15 minutes (the plugin's `/media/{id}` with a `download|`
  signature of its own). background_downloader transfers them (in the
  background, pausable, Wi-Fi only when asked, one notification when the
  batch is done) into the app's cache; each file is then sealed with
  AES-256-GCM in 256 KiB chunks (the header and chunk index as associated
  data) into the app's support folder, the key in the Keystore or Keychain
  (this device only), and the plain copy deleted. Nothing is in the gallery
  or the Files app. A saved video plays from a loopback server with a random
  path that decrypts the chunks a range asks for, so the app's own player,
  watermark and capture cover apply; images in the text come from it too, and
  an attachment opens from a temporary decrypted copy deleted at the next
  start. Lessons whose video plays from a video site can't be saved (409
  `not_downloadable`). At each start online the app asks
  `POST /me/downloads/check` and deletes what the student may no longer open
  (and everything when downloads are off); without a check for `keep_days`
  (30) days everything is deleted. Signing out deletes it all. Watch progress
  and "Mark as complete" made offline wait on the phone and go out with the
  usual calls when the connection is back (places first). The web build (the
  app preview) has no downloads.

## Platform (yallapp.com.tr)

- Next.js on Netlify for pages and API routes.
- MySQL on `host.webek.org`, reached directly from Netlify functions. Because
  Netlify has no fixed outbound IP, the database is protected by:
  - a dedicated user with rights on the Yallapp database only;
  - a long random password, kept only in Netlify environment variables;
  - TLS required on the connection;
  - one connection per function instance, so cPanel's connection limit is
    never reached; a warm instance keeps it up to 30 seconds for the next
    request (98.1), since every query is a round trip to host.webek.org and
    opening a connection costs several more. The functions region must be
    the one closest to host.webek.org.
- Secrets that clients give us (store API keys, signing keys) are encrypted
  with a key that never leaves the server environment.
- Hosted API (`/api/app/{app_id}`), for apps without WordPress: it serves the
  app contract's configuration, sign-in, account, devices, push token and
  notifications endpoints from our own database, behaving like the plugin
  (6-digit codes, 5 attempts, 15-minute access tokens, rotating 30-day
  refresh tokens, a device limit). Codes go out through WABEK (from one of
  our WhatsApp numbers, through its approved OTP template outside the 24-hour
  window), our WhatsApp Cloud API number, or a signed webhook to our gateway. Clients send notifications
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
  five minutes. Reviews are off for Shopify apps. Order history needs an
  optional Admin API token (read_orders, read_customers) on the Website
  step: the customer's orders are those of the Shopify customer with
  exactly the phone number they signed in with.
- Other platforms (8.5): ikas, Ticimax and IdeaSoft (Store), Teachable and
  Thinkific (Academy) and SimplyBook.me (Bookings) are connectors that
  register themselves with their fields in
  `platform/web/src/lib/hosted/connectors/platforms.ts`. The Website step
  shows one more choice per app type with the platform's fields; the keys
  are checked with the platform before they're saved (values that aren't
  secret as they are, secrets encrypted together, renewed OAuth tokens
  saved back).
- Wix (22, Store) is one of them: a Headless OAuth app's client ID gets
  visitor tokens for the catalog (Catalog V3), cart pricing and a checkout
  that opens Wix's hosted checkout page; an optional account API key with
  the site ID reads order history, matched exactly by verified phone or
  email.
- Salla and Zid (25, Store) connect with OAuth through Yallapp's own partner
  apps (client ID, secret and webhook secret in admin Settings, encrypted
  platform settings `sallaApp` and `zidApp`): "Connect with …" on the Website
  step sends the owner to the platform's approval page with the app's ID
  signed as `state`, and `/oauth/salla` or `/oauth/zid` saves the tokens in
  the app's connector. Tokens are renewed before they expire and when
  refused; refresh tokens work once, so one renewal runs per app and
  server, and across servers the refresh token is claimed in the store
  first (`oauth-tokens.ts`). Checkout hands one product off to its page on
  the storefront, in the browser; orders are matched exactly by verified
  phone or email.
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

- Platform settings (`platform_settings`): the team sets Yallapp's contact
  details (72: two WhatsApp numbers, one for customers in Egypt and one for
  everywhere else, and the email, shown on every page, in the dashboard
  and in email signatures; saving rebuilds the pages made ahead of time),
  the sign-in code sender, the email server and Yallapp's own payment
  accounts on the admin's Settings pages (95.1: one page each, Payments,
  Email, Sign-in codes, Contact & publishing, Invoices, Store platforms,
  New apps and Server, with tabs between them; `/admin/settings` lists them
  with what's set now). A saved setting replaces the matching Netlify variables
  (removing it brings them back); secrets inside are encrypted with the
  context `platform:<key>` and never shown again. Each server instance
  caches the settings for 30 seconds. The plans (names, what's included,
  price text or card price, monthly or yearly, license features) are edited
  on the admin's Plans page the same way; plans without edits keep the
  defaults in `src/lib/plans.ts`. The pricing and home pages render on
  request so they always show the current plans.

- Managing a client: "Manage their app" on the admin's client panel opens
  that client's own dashboard for the super admin (an `httpOnly` cookie with
  the client ID, read only for super admins, 8 hours, cleared on sign-out).
  Every dashboard page and action then works on that client, also before
  activation or while suspended, under a bar naming the client with a way
  back to the admin. The team can also edit a client's name, WhatsApp
  number and website on the panel. "Edit their app settings" on a client's
  page opens their dashboard on that app.

- Several apps per account (Phase 12): a client account (one sign-in) has
  any number of apps (`apps.client_id` is indexed, not unique; at most 20
  per account), listed oldest first. Each app is like a separate client:
  - **Data model.** A license belongs to one app (`licenses.app_id`, unique,
    cascade) and keeps its own plan, end date, key and website
    (`license_activations`); `licenses.client_id` stays for lookups. A
    license given before the account's first app exists has `app_id` null,
    and creating that first app takes it, together with plan payments made
    before it (`plan_payments.app_id`, set null if the app is deleted). Build
    numbers and version codes go up per app (`builds_app_number_unique`).
    Migration `0016_several_apps` backfills `app_id` from each client's
    single app. Coupon limits per client and dismissed announcements stay
    per account.
  - **Dashboard.** The current app is chosen with the switcher in the
    dashboard header and remembered in an `httpOnly` cookie
    (`yallapp_app`), used only when it names one of the client's own apps
    (else their first app). `getClientContext` gives the account's apps and
    licenses, the current app and *its* license and state. "Add an app"
    (`/dashboard/app-type?new=1`) creates an app that starts the setup steps
    and waits for activation (the team, or its plan paid by card); every
    page, action and build works on the current app.
  - **States.** An app is pending until it has a license, then active or
    expired by its own end date. The account is pending until its first
    activation, active while any app's license is, expired when all ended;
    suspension is for the whole account (every app and its plugin).
  - **Everything that needs a plan uses the app's.** The plugin's license
    key names its app (license API, `POST /apps/layout`); the hosted API
    answers while that app's license is active; builds, switches per plan,
    the marketplace and push use the app's plan; a card payment (and its
    coupon, where "first payment only" means the app's first) activates or
    extends the app it was started for, and the activation and renewal
    emails name it (`{{app_name}}`). The admin shows a section per app on a
    client's page, and the pipeline API sends each build's `app_id`.

- Plans, limits and owner notices (Phase 13): four plans per app, Starter,
  Growth, Pro and Business (`src/lib/plans.ts`). Each has features
  (`ios`, `push`, `offline_downloads` for offline mode, `page_editor`,
  `card_payments`, `auto_rebuild`, `auto_publish` for "We publish for you")
  and limits (app users, languages, connected platforms; team members,
  support, an account manager and custom features are display-only). The
  team edits names, prices, features and limits on the admin's Plans page
  (audited); an edit saved before the four plans keeps only its price.
  `src/lib/entitlements.ts` gives an app's plan as it is now (switches
  applied, a scheduled downgrade counted from its date). Where it is held to:
  - **Builds:** without `ios` the iOS stages start skipped and
    `/builds/{id}/secrets` sends no App Store Connect key, so the pipeline
    skips iOS; `auto_publish` uploads to the stores; with `auto_rebuild` a
    saved setup step queues a new build after the first one.
  - **Pages:** without `page_editor` the served layout (hosted API and
    `POST /apps/layout`) has the ready-made pages and tabs for the app type,
    with the published look; languages beyond the plan's are dropped
    (publishing more is refused); lists from sources beyond its connected
    platforms (the app's main content first, then the blog on WordPress) are
    left out. The page editor shows the same limits with "Upgrade".
  - **Hosted API:** `features.push` and `features.offline` follow the plan;
    without `card_payments` products show without a cart and paid courses
    without a purchase button (checkout links are refused). A new user past
    the plan's app users is refused with 403 `app_user_limit` at
    `/auth/otp/verify` and `/auth/register`; existing users keep signing in
    and the store review number always gets in. WordPress sites keep their
    users on their own site: no limit there.
  - **Plugin:** the license API reports the plan's features and limits; the
    plugin's `features.push` and `features.offline` follow them (the license
    is enforced on every live site from plugin 0.4.6, Phase 68).
  - **App:** offline mode keeps GET answers (never sign-in calls, at most 150,
    forgotten on sign-out) and shows them without a connection. Saving
    lessons for offline viewing (Phase 45) needs the same plan feature and
    the owner's choice on the Courses page (`apps.hosted_settings.offlineDownloads`:
    on by default for courses managed in Yallapp; on WordPress null leaves the
    plugin's "Allow offline downloads", sent as `LicenseStatus.offline_downloads`).

  Changing plans (License & plugin, `#change-plan`): an upgrade is paid by
  card and starts at once; the days left on the old plan are credited at
  their value (list prices in the same currency; otherwise one for one). A
  lower plan never loses days: chosen without paying it is scheduled
  (`licenses.next_plan`, `next_plan_at` = the current end), paid ahead it
  starts at the current end and adds its period. Owner notices
  (`owner_notices`, unique per app and key, so each is told once): app users
  at 80% and 100% (per crossing; resolved when the number goes back down) and
  the plan ending in 7 days, tomorrow and today (per license period), on the
  dashboard's overview and by email (templates in the admin). The daily job
  (Netlify scheduled function → `POST /api/internal/daily` with
  `INTERNAL_JOB_SECRET`) applies due downgrades and sends the reminders.
  Links open the dashboard on the notice's app (`/dashboard/open`).

  Owner contact: `license_inactive` and `account_suspended` (503) and
  `app_user_limit` (403) carry `contact` (`{name, whatsapp, email}` from the
  app's support settings). The app shows "{App} is paused" with "Contact
  {App}" (WhatsApp first, else email; from the error, else the last config it
  loaded) and "Try again", and on sign-up "{App} isn't taking new members
  right now".

- Bookings without a website (connector `bookings`): a Bookings app whose
  client picks "I don't have a website" gets its services, categories,
  team (services each person provides, working hours per weekday, days off)
  and booking rules (time zone, currency, how often times start, how soon
  and how far ahead, cancelling, notes, approval) from the dashboard's
  Services & team page, kept with the app (`apps.booking_setup`). The hosted
  API answers the plugin's bookings endpoints from them (`bookings.plugin`
  is `yallapp`): free times are each person's hours minus their active
  appointments, and a booking is written only if it still doesn't overlap
  one of theirs (checked and written in one transaction, locking the app's
  row). Appointments are in `booking_appointments`; the business sees them
  on the Appointments page (approve or reject, cancel, done, no-show) and
  gets an email for each new one. Payment is at the appointment.

- Courses without a website (connector `courses`): an Academy app whose
  client picks "I don't have a website" gets its courses (title,
  description, cover image, price, instructor, level, categories, sections
  with lessons: a YouTube, Vimeo or video file address and/or text, a
  length and a free-preview flag) from the dashboard's Courses pages, kept
  with the app (`apps.course_setup`). The hosted API answers the LMS
  endpoints from them (`features.lms` is `yallapp`; no quizzes,
  certificates, wishlist, reviews or Q&A). Free courses are enrolled in
  from the app. Paid courses are bought on Android only (iOS shows no
  purchase button): `/auth/checkout-link` opens the payment page with the
  same card payments as shops (own iyzico account or Yallapp's), and the
  paid order enrols the student. The client can also add a student by the
  phone number they sign in with. Enrolments and lesson progress are in
  `course_enrollments` and `lesson_progress`.

- Real estate apps (connector `listings`, 10.7): the app type `real_estate`
  has no WordPress side. On the Website step the only choice is "Listings
  managed in Yallapp", which moves the app to the hosted API. The office adds
  its properties on the dashboard's Listings page (`listings`: purpose, one of
  a fixed list of property types, price and currency, rent per month or year,
  place and map position, area, rooms, features, ordered photos, a video
  link; draft, published or archived; featured) and sets its contact details,
  currency, area unit and whether people can message it (`listing_settings`,
  sent as `Config.listings`). The hosted API serves the Listings endpoints:
  search with filters, sort and pages over published listings only, details
  with similar listings, favorites (`listing_favorites`) and conversations
  with the office (`listing_inquiries`, `listing_inquiry_messages`, rate
  limited, refused while messages are off). Descriptions are cleaned to a few
  formatting tags whenever they're served. The office gets an email for each
  message and answers on the Inquiries page; a reply lands in the user's
  notifications inbox and is pushed to their phones. Texts are served as the
  office wrote them. Page list blocks get listing cards from
  `lib/hosted/listings/page-items.ts`.

- News & blog apps (engine `news`, roadmap 23): read-only articles, free to
  read (no paid content, so no reader-app rules apply). Their content comes
  from WordPress (the plugin serves published posts: never private or
  password-protected ones; sticky posts are the top stories), an own API,
  articles written on the dashboard's Articles page (connector `articles`:
  `articles`, `article_categories`, `news_settings`), or the site's RSS or
  Atom feed (platform connector `rss`: read like the API check reads an own
  API, https only, public addresses only, no redirects, 8 seconds, 2 MB, with
  a small XML reader that never reads a DTD; cached 5 minutes). The News
  endpoints are the same for both hosted sources (`lib/news/service.ts`), and
  every body is processed like lesson content (iframes become embeds), so the
  app renders articles with the lesson renderer. Breaking news: the plugin
  sends a new post a minute after it is published when "Notify app users
  about new posts" is on (a post can opt out); the dashboard sends an article
  when it is published with "Send as breaking news". Both reach the inbox of
  everyone and the phones of signed-in users that allow news
  (`NotificationPreferences.news`); the notification opens the article.
  Saved articles stay on the device.

- Events & tickets apps (engine `events`, roadmap 28, hosted only for now):
  the organiser manages events (`events`), their ticket types
  (`event_ticket_types`) and settings (`event_settings`: currency, time
  zone, map link, how long before the start free tickets can be cancelled)
  on the dashboard's Events page; the hosted API serves the Events endpoints
  (`lib/events/service.ts`, connector `events`). A ticket (`event_tickets`)
  has a code of 12 random characters (32 letters and digits that can't be
  confused, 60 bits) and a QR payload `YT1.<code>.<HMAC>` signed with a key
  per app made from `SIGNING_SECRET`, so a QR code can't be made up offline
  and never checks in at another app's door. Places: a ticket holds one while
  valid or used, and a pending one (bought, not paid yet) until its hold ends
  (the payment link's hour plus iyzico's page, so a confirmed payment always
  finds its places); `claimTickets` counts and writes in one transaction that
  locks the event's row, so the last place is never given twice. Free
  tickets are issued at once; paid ones go through the payment page like paid
  courses (own iyzico account or the marketplace, with its commission) and
  become valid only when iyzico confirms the payment (or a demo order is
  placed). Apple's rule: a ticket to an event at a venue is a physical-world
  service, sold on both platforms; an online-only event (no venue) is digital
  content, so on iOS its paid tickets have no button and the checkout link is
  refused (the app checks again). The online link is sent to ticket holders
  only. Check-in (dashboard, on a phone) reads a scanned QR code (the
  browser's BarcodeDetector) or a typed code and marks a valid ticket used
  in one conditional update: a second scan answers "Already used" with the
  time. Changing an event's time, place or link, or cancelling it (which
  cancels its tickets), notifies the holders (`hosted_notifications.event_id`,
  push type `event`). The app keeps the user's tickets on the phone, so they
  show at the door offline, and forgets them on sign-out. WordPress (The
  Events Calendar and Event Tickets) is a follow-up.

- Charity & donation apps (engine `donations`, kind "Charity & donations"
  with the vertical `charity`, roadmap 29): hosted only. Campaigns are
  managed on the dashboard's Campaigns page (connector `campaigns`:
  `campaigns`, `donations`, `donation_settings`); stories are cleaned like
  articles. A donation starts with `POST /donations/checkout-link`, which
  saves a pending donation and returns our donation page `/give/<token>`;
  the donor gives their name and email there and pays on iyzico's page into
  the charity's own account (own keys in `catalogSettings.payment`, never
  Yallapp's marketplace account, so no commission). Only iyzico's answer
  after the callback (`/api/pay/donation/<token>`) marks the donation paid,
  and the same transaction adds it to the campaign's `raised_cents` and, for
  a new email address, `donor_count`; then the donor gets the
  `donation_receipt` email and a receipt page `/receipts/<code>`. App Store
  guideline 3.2.2(iv): an iPhone app may take donations itself only for an
  Apple-approved nonprofit using Apple Pay, so the server always answers
  `open_in: browser` for iOS and the app opens the system browser whatever
  it is told ("Donate on our website"); `ios_mode: off` hides the button.
  Android opens the page in the app (Google Play's billing rules don't cover
  donations to charities; policy-dependent). Monthly donations aren't
  offered yet (no iyzico subscriptions): `Config.donations.monthly` is false
  and monthly requests are refused. Campaign updates go to the inboxes of
  the campaign's signed-in donors and only to phones that turned them on
  (`NotificationPreferences.donations`, off by default). Demo donations
  charge nothing and never change a campaign's totals.

- Plans paid by card (`plan_payments`): when Yallapp's account with the
  chosen provider is set (37 iyzico, Kashier or Fawaterk; only plans
  priced in a currency it takes) and a plan has a card price, pending clients see "Pay by card" on the
  waiting page and active clients on License & plugin, for the current app
  (pending, active or expired). The client
  picks a plan and gives a billing city and address; iyzico's page takes the
  card into Yallapp's merchant account. iyzico calls back to
  `/api/pay/plan/<token>`; only iyzico's own answer for that payment's
  basket and amount marks it paid (once), and then the payment's app is
  activated or its license is extended by the plan's period from its current
  end date (or from today when it ended), keeping the same key; the
  account's other apps are unchanged. The client gets
  the activation or renewal email; the team sees payments on the admin's
  Payments page and on the client's panel. The iyzico keys are always read
  from the database, never from the 30-second settings cache, so a callback
  never misses keys saved a moment earlier.

- 72 Ended: Yallapp never collects payments for its clients' sales (see
  "Two support numbers, no marketplace, the video sites' own players and
  analytics kept by plan" below). What follows describes orders paid before
  Phase 72, which are still confirmed, refunded and released this way.
  Selling through Yallapp (iyzico marketplace): with Yallapp's iyzico
  account and a commission set in the admin (Settings, "Shops selling
  through Yallapp"; iyzico's marketplace must be on for the account), a
  shop without its own iyzico account gives the details iyzico needs (who
  gets paid, ID or tax details, IBAN) on its Products page. iyzico registers
  it as a sub-merchant (`/onboarding/submerchant`) and the shop's payment
  setting keeps only the sub-merchant key, the payee name and the IBAN's
  last 4 digits. Each basket item then names the shop and its share (the
  price minus the commission; shipping goes to the shop in full), and the
  order records the commission and iyzico's item transactions. iyzico pays
  the shop once its items are approved (`/payment/iyzipos/item/approve`):
  when the shop marks the order completed, or from the admin's Payments
  page. The callback and the approval follow the account an order started
  with, even if the shop switched since. 37 When Yallapp's provider is
  Kashier or Fawaterk, a joining shop gives who gets paid and its IBAN
  (kept encrypted, `payoutEncrypted`); the whole payment goes to Yallapp's
  account, the order still records the commission, and releasing the
  payout records it for the team, who transfer the share (the admin's
  Payments page shows the payee). A shop sells through Yallapp only while
  Yallapp's provider is the one it joined with.

- Card payment providers (Phase 37, `src/lib/payments/`): iyzico (Türkiye),
  Kashier and Fawaterk (Egypt) behind one interface (`provider.ts`):
  `startCheckout` (amount, currency, our reference, the customer, return
  and webhook addresses) gives the provider's hosted page and its own
  reference (iyzico's token, Kashier's session, Fawaterk's invoice), kept on
  the payment (`payment_provider`, `provider_ref` on `plan_payments`,
  `catalog_orders` and `donations`; null means iyzico, as before);
  `confirmCheckout` reads the payment back from the provider with our keys
  and accepts it only when it is paid, ours (iyzico's basket; Kashier's
  merchant order; Fawaterk's `payLoad.reference`), for the exact amount
  (iyzico: at least it) and the same currency; `checkAccount` is the
  harmless "Test connection" call (iyzico: a BIN lookup; Kashier: the
  merchant; Fawaterk: the payment methods).
  49 Ticket holds end with the provider's page (`lib/events/holds.ts`): a
  checkout link holds the places for the pay link's hour; starting the card
  payment sets the hold to when the page stops taking it (iyzico's
  `tokenExpireTime`, the `expireAt` we give Kashier's session: 30 minutes;
  Fawaterk takes no expiry to the minute, so the same 30 minutes) plus 5
  minutes for the confirmation to arrive (`holdOrderTickets`). A payment
  can't start once the hold ended. A payment confirmed later gets its
  tickets only while the places are free (`issueOrderTickets`, the event's
  row locked like a claim); otherwise the tickets are cancelled, the order
  stays paid, the buyer's page says the organiser will refund them and the
  owner gets a `ticket_refund_due` notice. Amounts go out as decimal
  strings in major units ("450.00"). Each provider takes its own
  currencies: iyzico TRY, USD, EUR; Kashier EGP, USD, EUR; Fawaterk EGP,
  USD, SAR, AED, EUR. Kashier: `POST /v3/payment/sessions` with the secret
  key as `Authorization` and the Payment API key as `api-key`, read back
  with `GET /v3/payment/sessions/{id}/payment`; its webhook is signed in
  `x-kashier-signature` (HMAC-SHA256 with the Payment API key over the
  `signatureKeys` of `data` as a query string). Fawaterk: API v2 with the
  vendor key as a Bearer token, `createInvoiceLink`, read back with
  `getInvoiceData/{id}`; its webhook's `hashKey` is HMAC-SHA256 of
  `InvoiceId=…&InvoiceKey=…&PaymentMethod=…` with the same key.
  Callbacks: iyzico posts to `/api/pay/plan|iyzico|donation/<token>`;
  Kashier and Fawaterk send the customer back (GET) and post their webhook
  (POST) to `/api/pay/<provider>/<plan|order|donation>/<token>`. Every
  trigger goes through `settle.ts`, which takes the account the payment
  started with, verifies a webhook's signature, reads the payment back and
  marks it paid with a conditional update (pending only), so a webhook and
  a redirect arriving together deliver once. A Kashier or Fawaterk payment
  that isn't confirmed stays pending (the customer sees "not confirmed
  yet") rather than failing. Yallapp's own accounts are platform settings
  (`iyzico`, `kashier`, `fawaterk`, secrets encrypted as `platform:<key>`)
  with `paymentProvider` choosing which takes new plan payments and
  marketplace sales; a client's own keys stay in `catalogSettings.payment`
  (provider `iyzico`, `kashier` or `fawaterk`, encrypted as
  `app:payment:<app id>`). Refunds: see below.
  Test runs point `IYZICO_API_URL`, `KASHIER_API_URL` and
  `FAWATERK_API_URL` at fake servers (refused on Netlify).
  96 Stripe and PayPal (`stripe.ts`, `paypal.ts`) are for a client's own
  keys only (Yallapp's plans stay on iyzico, Kashier and Fawaterk:
  `YallappProviderId`). Stripe: the secret key (or a restricted key) as a
  Bearer token; test or live by its prefix; `POST /v1/checkout/sessions`
  with one line for the total, `client_reference_id` our reference and
  `expires_at` the hold (31 minutes to 23 hours), read back with
  `GET /v1/checkout/sessions/{id}` (paid when `payment_status` is paid and
  `status` complete); refunds by `POST /v1/refunds` on the payment intent.
  PayPal: Orders v2 with an OAuth token from the REST app's client ID and
  secret; `custom_id` our reference; the customer approves on PayPal and the
  read-back captures the order (`PayPal-Request-Id` keeps it to one capture)
  before checking the capture; refunds by
  `POST /v2/payments/captures/{id}/refund`. Neither sends a webhook here:
  the customer's return and the pending-payments job read the payment back.
  Their currencies: Stripe TRY, USD, EUR, EGP, SAR, AED; PayPal USD, EUR.
  Test runs point `STRIPE_API_URL` and `PAYPAL_API_URL` at fakes (refused on
  Netlify).
  96.2 Bank transfer and the client's own method (`lib/catalog/manual.ts`,
  `catalogSettings.manualPayments`, migration `0086_manual_payments`): paid
  outside Yallapp, never checked by it. The pay page offers them next to the
  card (or alone: `paymentsSetUp` counts them); choosing one keeps the
  customer and a copy of the method's details with the day to pay by on the
  order (`catalog_orders.manual_payment`), holds ticket places until then and
  emails both sides (`order_awaiting_payment`, `new_order_awaiting_payment`).
  The order stays `pending`, listed apart (`listCatalogOrders` `manualOnly`,
  `awaitingManual`) on Orders, the Kitchen, the Owner API and the customer's
  own orders (`pay_outside`), until the owner marks it paid
  (`changeOrderStatus` to `processing`: `markManualOrderPaid` pays it once and
  runs `afterOrderPaid`, as a card payment's settle does) or cancels it
  (ticket holds released). The pending-payments job never asks about it (no
  `provider_ref`); its refunds are recorded only.
  96.3 Events, courses and a gym's bookings connectors serve the customer's
  own orders through the shop's (`myOrdersRoute` in
  `hosted/connectors/catalog.ts`), with `features.orders`, so tickets, paid
  courses and memberships are listed with their receipts. 96.4 Orders and
  donations keep the app's language at checkout (`lang`, migration
  `0087_receipt_language`, from `Accept-Language`); receipts default to it
  (`customerLang`), before the browser's.

- Refunds from the dashboard (Phase 47, `lib/payments/refund.ts`,
  `lib/refunds/service.ts`, migration `0039_refunds_time_zone`): the owner
  refunds a paid order (products, a restaurant's order, tickets, paid
  courses, memberships) or a donation, all of it or part, under it on
  Orders or Donations, with the account the payment was taken with.
  iyzico: a whole payment on the day it was taken (Istanbul's day) is
  cancelled (`POST /payment/cancel` with its `paymentId`); otherwise, or
  when iyzico refuses the cancel, the payment's item transactions are read
  (`POST /payment/detail`) and refunded one by one (`POST /payment/refund`,
  `paymentTransactionId`, `price`, `currency`, `ip`, `reason`), never more
  than was paid for an item less what earlier refunds took from it; all
  signed IYZWSv2 like the payments. Kashier: the session is read back for
  its `kashierOrderId` and `transactionId`, then `PUT
  /v3/orders/{orderId}/` on its fep host (`fep.kashier.io`,
  `test-fep.kashier.io`) with the secret key, `apiOperation: "REFUND"`,
  the amount in major units and `targetTransactionId`. Fawaterk's API v2
  has no refund call, so its refunds are made in Fawaterk's panel and
  recorded (`method: manual`, with its reference if given); an owner can
  record one made in any provider's panel the same way, except for
  marketplace payments, which are in Yallapp's account. A refund that stops
  half-way (an iyzico item refused) records what was done; a provider that
  doesn't answer is never retried by itself (the owner checks the panel).
  `payment_refunds` keeps each refund (amount, reason, note, provider,
  method, the provider's calls and references, the commission given back,
  what was taken back, who, when); `recordRefund` adds it to the order's or
  donation's `refunded_cents` in one statement that refuses more than the
  total, so two refunds at once never refund more than was paid. All of it
  refunded makes the status `refunded`. What it took back: tickets are
  cancelled with `refunded_at` (their places go back on sale), course
  enrolments of the order are removed (progress stays), memberships end;
  with a refund in part only what the owner ticked. A donation's refund
  comes off its campaign's total, and a fully refunded donor stops counting
  unless they gave another. The customer gets `payment_refunded` in the
  app's name; the audit log gets `payment.refund`. Marketplace orders:
  Yallapp's commission is given back in proportion to what is refunded of
  what is left (all of it with the last refund) and `commission_cents`
  goes down by it; with iyzico the item's own transaction is refunded, so
  iyzico takes it from the item's split; with Kashier the shop's share of
  a refund after its payout was released comes off the next transfer. The
  app sees `Order.refunded_total`, `Ticket.refunded` (status stays
  `cancelled`: a new status would read as valid in older apps) and
  `Donation.refunded_total`.

- App sign-in (`apps.hosted_settings`): for apps on the hosted API, the
  dashboard's App sign-in page sets whether new customers can sign up and
  what they are asked, the default country code, devices per customer, the
  support WhatsApp number, the terms page, and the app store review number
  with its fixed code. The hosted API reads them on each request, so no
  new build is needed.

- Website content (`site_content`, 11.3): the home page's texts, the
  closing band, the page titles, the FAQ, the documentation (/docs) and the legal pages
  are edited on the admin's Website content page. Each page's defaults are
  the texts in code (`src/lib/content/site.ts`, `src/content/`), so a page
  is unchanged until someone saves it; "Back to the default text" removes
  the edit. Long texts are a small Markdown (`src/lib/content/markdown.ts`)
  rendered as React elements or escaped HTML: no raw HTML, links only to
  http(s), mailto, tel or paths on the site. Pages stay prerendered and
  read the content once; a save rebuilds the pages that show it.
- Email templates (`email_templates`, 11.4): every email the platform sends
  has a subject and a plain-text body with documented `{{placeholders}}`
  (`src/lib/email/templates.ts`); the defaults are the emails as they were.
  Saving refuses placeholders the email doesn't have. Sending
  (`sendTemplate`) reads the saved template each time and adds an HTML part
  in which every value is escaped. In memory mode `YALLAPP_MAIL_DIR` keeps
  each email as a file for the end-to-end tests.
- Coupons (`coupons`, `coupon_redemptions`, 11.6): a percentage or an
  amount per currency off a plan's card payment, limited to plans, billing
  periods, dates, uses in total and per client, or a first payment. The
  client enters the code on the card payment form; the server works out the
  price from the plan and the coupon each time (never below iyzico's 1.00
  minimum) and charges that. A coupon for the whole price activates or
  extends the plan without iyzico, recorded as a paid payment of 0. Each
  use is recorded with its plan payment: pending on iyzico's page (holding
  its use for an hour), then used or failed.
- Announcements (`announcements`, `announcement_dismissals`, 11.8): the
  team writes a title and a Markdown message for all clients or by plan,
  app type or account state, with an optional link, a start and an end,
  as information or a warning. Clients see the live ones above their
  overview (and on the waiting page) until they close them, and all of
  them on the Announcements page. The team can email one to its audience
  with the Announcement template, in batches of 20.
- The dashboard's bell, "Notifications from Yallapp" (Phase 57,
  `lib/updates.ts`, `components/updates-bell.tsx`): next to the logo in the
  sidebar and in the phone's top bar, with the unread count (9+ above 9).
  Each announcement has a kind (`update`, `announcement`, `maintenance`,
  `offer`; older ones `announcement`), says whether it is also a banner
  (`show_as_banner`; older ones are) and may have Arabic and Turkish titles
  and messages (`announcementText(a, lang)` falls back to English; the
  dashboard passes "en" until it follows the user's language). The bell
  holds the live announcements for the account and the account's own items,
  "Your account", made from data the dashboard already has: owner notices
  still true (60 days, also the ones closed on the overview), builds that
  finished or failed (14 days, three per app) and payments received (30
  days). Read state is per person, not per client (`update_reads`: user,
  item key such as `announcement:<id>`, `notice:<id>`, `build:<id>`,
  `payment:<id>`, first read time), so our team member managing a
  dashboard has their own; closing a banner stays per client. The count is
  worked out by the layout on each load of the dashboard; opening the panel
  marks what it shows read (a server action that answers with the new
  count), "Mark all as read" marks everything listed, the full list
  (Dashboard › Announcements, now "Updates from Yallapp", ended
  announcements included) marks its items once shown, and when the window
  comes back after a minute or more the bell asks again. No polling.

- We publish for you (Phase 14, `publishing_requests`, `publishing_events`,
  `apps.publishing_mode`): each app is published by its client ("self", with
  the files and our guides) or by our team ("managed"). For "managed" the
  client keeps every account in their own name: they create a Google Play
  developer account and an Apple Developer Program membership (paying the
  stores directly; organisations need a D-U-N-S number), invite our
  publishing team email (Admin or a release manager in Play Console, App
  Manager with access to certificates in App Store Connect, Editor in their
  Firebase project, or we create the Firebase project), tick each step, and
  add what the stores ask beyond the setup's Store listing step: the
  categories, notes for the content rating questionnaires and for the
  reviewers. Passwords are never asked for or stored. One request per app
  holds the checklist (when each step was ticked), the listing details and
  a status per store (Waiting for the client → Accounts ready → Submitted →
  In review → Live, or Rejected with a note), with the team's note to the
  client, the store link once live, and the team's own notes. The team
  works from the admin's Publishing queue; each new status is written to
  the history (`publishing_events`) and emailed to the client. With
  "managed", the setup's Publishing step needs no store keys on Pro.

## Sign-in for every app (Phase 18)

- **"Sent by Yallapp" (WordPress).** Digits' `/digits/v1/send_otp` and
  `verify_otp` routes come from its paid REST API add-on, which most sites
  don't have. So by default the plugin makes each code itself
  (`Otp\Yallapp_Adapter`, `Otp\Code_Challenge`: 6 digits, kept as an HMAC with
  the site secret in a transient named by a hash of the number, valid for 5
  minutes, 5 attempts; a new code replaces the last one only once it was
  sent) and asks the platform to deliver it: `POST /api/v1/sign-in-codes/send`
  (`docs/api/platform.yaml`) with the SiteInfo, the number in E.164 and the
  code. The platform answers only for an active license bound to that site
  (not expired or suspended), checks the number with libphonenumber, limits
  120 requests a minute per IP, 300 an hour and 2000 a day per license, and
  per number (across every site) one every 30 seconds and 10 an hour, then
  sends through the app owner's own WhatsApp number when they connected one,
  else the platform's sign-in code sender (WABEK on production), with the
  app's name in the message. The code isn't stored or logged; the number
  appears only as an HMAC in the rate-limit counters. A per-license daily
  counter shows on the admin's client page ("Sign-in codes sent today"). It
  comes with every plan.
- **Which provider.** Settings › Sign-in in the plugin: "Sent by Yallapp
  (WhatsApp)" (default), Digits (shown as available only when its routes
  exist), and development codes (123456) on local sites with
  `YALLAPP_DEV_OTP`. When the saved choice can't send codes (no active
  license, or Digits without its REST API add-on), `Otp\Adapter_Choice` picks
  another that can and the settings page says why, in plain words.
- **Same accounts.** Every provider finds and stores people by Digits' phone
  fields (`digits_phone`, `digt_countrycode`, `digits_phone_no`), whether
  Digits is installed or not, so Digits accounts sign in with the same number
  and a site can switch providers at any time.
- **Sign-in methods.** The app's owner chooses phone, email or both on the
  dashboard's App sign-in page (`apps.hosted_settings.signInMethods`; also
  for WordPress apps now) and the app reads `Config.auth.methods`:
  - the hosted API emails a 6-digit code (`POST /auth/email/request`, the
    "Sign-in code" email template, in the app's name, through the platform's
    SMTP) with the phone codes' rules and limits; a new address signs up with
    the same details, without being asked for its email again. Accounts made
    by email have no phone (`hosted_users.phone` is nullable,
    `drizzle/0020_sign_in_methods.sql`), only they are found by email (an
    address typed at a phone sign-up was never proven), and their address
    can't be changed from the app. Email is offered only where content is
    managed in Yallapp: connected platforms find customers by phone;
  - WordPress signs in with the account's email (or username) and password
    (`POST /auth/password`, `wp_authenticate`, so the site's own rules and
    security plugins apply), only for existing accounts, limited per IP and
    per address, with the same answer for an unknown address and a wrong
    password; "Forgot your password?" opens the site's reset page. The owner's
    choice reaches the plugin with the license status (`sign_in_methods`,
    within 12 hours or at once with "Check now") and replaces the plugin's own
    setting.
  With email only, the store review number still signs in by phone, for the
  stores' reviewers and the preview. Demo apps stay on the demo number.
- **The owner's own WhatsApp number.** Optional, on App sign-in: a WABEK API
  key (encrypted with the context `app-whatsapp:<app id>`, never shown again)
  and an instance ID, with "Send a test code". The app's phone codes then go
  out from it, on the hosted API and for its WordPress site.
- **The app's own email (Phase 24).** Optional, on App sign-in under "Your
  app's email": "Sent by Yallapp" (the platform's SMTP, from Yallapp's
  address with the app's name as the display name) or the owner's own SMTP
  server (`apps.hosted_settings.mailServer`; presets in
  `src/lib/email/app-mail-presets.ts`; the password encrypted with the
  context `app-smtp:<app id>`, never shown again). Emails to the app's own
  users (`sendTemplate(…, { app })`: email sign-in codes on the hosted API
  and for WordPress) go through it; emails to owners and the team never do.
  The platform connects only on ports 25, 465, 587 or 2525, resolves the host
  once, refuses private and local addresses and connects to the checked
  address (the name is kept for TLS), with 10-second timeouts. When the own
  server fails, the email goes out once more from Yallapp's server, the
  reason is logged and kept on the app in plain words (`mailFailedAt`,
  `mailFailedReason`; App sign-in shows it) and the owner gets the "Own
  email server failed" email at most once a day. "Send a test email" (5 per
  10 minutes per app) shows the server's error in plain words, never the
  password.
- **Email codes on WordPress (Phase 24).** The owner (App sign-in, sent as
  `LicenseStatus.email_sign_in`) or the plugin setting chooses how email
  works: the password (the default) or a code. With a code, the plugin
  serves `email_sign_in: code`, makes each code like a phone code
  (`Otp\Email_Codes`, an HMAC bound to `email:<address>`) and asks the
  platform to email it (`POST /sign-in-codes/send` with `channel: email`,
  the same license limits, per address one every 30 seconds and 10 an hour
  as a keyed hash). A new address signs up through `/auth/register` (a
  WordPress account with that email, when sign-up from the app is allowed);
  accounts that can edit the site get no email and never sign in by code.

## Yallapp sign-in for apps on their own API (Phase 34)

An app whose content comes from the client's own API can leave sign-in to
Yallapp: App sign-in › "Who signs people in" (`apps.hosted_settings.signInBy`:
`api`, the default, or `yallapp`).

- **Accounts.** The hosted API's own: `hosted_users`, devices, refresh tokens
  and challenges for that app, with the same sign-in methods (phone, email or
  both), code senders (Yallapp's or the owner's WhatsApp number and email
  server), store review number and address, device limit, sign-up rules,
  plan limits and rate limits as a hosted app. `handleHosted` answers such an
  app only for `GET /config`, the `/auth/*` sign-in endpoints, `GET`, `PATCH`
  and `DELETE /me`, `GET /me/devices` and `DELETE /me/devices/{id}`;
  everything else (pages, content, push tokens, notifications) is 404: the
  client's API serves it. Its `/config` is a valid Config whose `auth` counts:
  the owner's choices plus `provider: yallapp` and `base_url`.
- **Tokens.** Access tokens are JWTs signed with ES256 by a key pair of that
  app (`src/lib/hosted/app-auth.ts`, with `jose`): header `kid` (the key's
  RFC 7638 thumbprint); claims `iss` (the platform's address), `aud` (the app
  ID), `sub` (the hosted user ID as a string), `did` (the device row, for
  Yallapp's own session check), `phone` and `email` only when proven by a
  code (an email typed at a phone sign-up never is), `name`, `iat`, `exp`
  (15 minutes). Refresh tokens stay opaque, hashed and single use; signing
  out, removing a device and deleting the account delete them, so access
  tokens stop within 15 minutes. Apps on the hosted API keep their HS256
  tokens.
- **Keys.** `app_auth_keys` (`drizzle/0032_app_auth_keys.sql`): the public
  JWK, and the private key as PKCS#8 encrypted with ENCRYPTION_KEY and the
  context `app-auth-key:<app id>`. A key is made when the owner chooses
  Yallapp (or at the first token). "Replace the signing key" (3 an hour)
  retires the current key, drops its private key at once and keeps its public
  key published for a day; older retired keys are deleted then.
  `GET /api/app/{id}/.well-known/jwks.json` serves the current and recently
  retired public keys, `Cache-Control: public, max-age=300`, also while the
  app is paused; 404 for any other app.
- **The app.** The build config's `auth_base_url` (and the preview's) is the
  hosted API's address for the app. The Flutter app sends sign-in, the
  account, device list and refreshes there (a second Dio with the same token
  manager) and every other call to `api_base_url` with the JWT; it reads both
  `/config`s and takes `auth` from Yallapp's. An app built before the switch
  follows the client's `/config` when it says `auth.provider: yallapp`; when
  Yallapp's `/config` answers 404 (the owner went back) sign-in returns to
  the client's API. Deleting the account calls the client's `DELETE /me`
  first, then Yallapp's whatever the first answered (49). The preview sends
  its token (`X-Yallapp-Preview`) only to Yallapp.
- **Account deletion notices** (Phase 49, `lib/hosted/api-webhooks.ts`).
  Yallapp's `DELETE /me` deletes the account at once and queues
  `account.deleted` in `api_webhooks` (`drizzle/0037_api_webhooks.sql`):
  `POST <API address>/webhooks/yallapp`, a Security Event Token
  (`application/secevent+jwt`, `typ` `secevent+jwt`) signed with the app's
  key, `aud` `<app id>:events` (never an access token's), `sub`, `jti` (the
  row's ID, also `Yallapp-Delivery`), signed again for each try with a
  5-minute `exp`. The first try goes with the deletion (5 seconds); the
  webhook job (`netlify/functions/api-webhooks.mts` every 5 minutes →
  `POST /api/internal/webhooks`) takes due rows one run at a time
  (`claimApiWebhook`) and tries again after 1, 5 and 30 minutes, 2, 6, 12
  and 24 hours on 5xx, 408, 425, 429, timeouts and unreachable APIs; other
  answers, redirects (never followed) and private addresses fail at once.
  App sign-in › For your developer lists the last 30 days, which the job
  then deletes. Contract: the `accountDeleted` webhook in
  `docs/api/openapi.yaml`.
- **The client's API** checks the token with the key set (signature, `iss`,
  `aud`, `exp`) and maps `sub` to its own users (the developer guide, with
  samples for jose, firebase/php-jwt and PyJWT). "Copy a test token" (20 per
  10 minutes) signs a 15-minute token for the store review account (made if
  needed, outside the plan's user count), without `did`, so it works only on
  the client's API. The API check then skips sign-in and checks that the
  app type's signed-in endpoint (`/me/courses`, `/me/appointments`, or
  `/me/orders` when the Store has orders) answers 401 without a token and
  200 with a test token.

## Analytics for app owners (Phase 44)

First-party usage statistics, so each owner sees how their app is used
(Dashboard › Analytics). No third-party analytics SDK, no advertising ID, no
fingerprinting; reports show totals only.

- **Every backend sends to Yallapp.** WordPress, hosted, connected platforms
  and own APIs alike: the build config's `analytics` (`events_url`,
  `key`) points the app at `POST /api/v1/apps/{app_id}/events`
  (`docs/api/platform.yaml`, tag Analytics). The key is
  `HMAC(SIGNING_SECRET, "analytics:v1:" + app_id)`, the same in every build,
  stored nowhere. It is in every copy of the app, so it isn't a secret: it
  keeps out batches made up from an app ID alone, and the limits (60
  requests a minute per IP, 30 per 10 minutes per install, 3000 a minute per
  app, 100 events and 64 KB a request) cap what a copied key can do. The
  build config gets it only when the platform's address is https; the app
  preview's config never has it, so the preview never sends.
- **What arrives.** A batch carries a random install ID (a version 4 UUID the
  app makes, not its device ID, renewed when sharing is turned off and on),
  the platform, app and system versions and the language, and up to 100
  events: `app_open` (with `first_open` once per install; each one is a
  session: a start, or back after 30 minutes), `screen_view` (a screen kind,
  never an address), `item_view` (kind, ID, title), `add_to_cart`,
  `purchase_click`, `enroll`, `book`, `donate`, `ticket`, `share` (with the
  amount when known), `search`, `push_open` and (Phase 62) `screenshot`: a
  screenshot an iPhone noticed while the owner's screen protection covered
  what was open, with the lesson when one was (Android blocks screenshots
  with `FLAG_SECURE` and can't tell). Academies see "Screenshots taken" per
  lesson (metric `screenshot`, key `lesson:<id>` or `other`). One invalid event fails the
  batch (400); events older than 7 days or 10 minutes ahead are skipped and
  counted in `dropped`. The country comes from the request (`x-nf-geo` or
  `x-country` on Netlify, or our proxy's `X-Yallapp-Client-Country` with its
  secret); the IP is used only as a rate-limit key.
- **Storage** (`lib/analytics`, migration `0035_analytics`).
  `analytics_events` keeps raw events for 90 days (72: 40 before), without
  the search text. `analytics_daily` (app, day, metric, key, label, value)
  keeps totals as long as the app's plan says (72: `PlanLimits.analyticsMonths`,
  by default 3 months on Starter, 1 year on Growth, 2 years on Pro, 3 years
  on Business; null keeps them until the app is deleted). Both cascade with
  `apps`. Search texts are
  counted there at once (`search`, lower case; texts that look like a phone
  number or an email address are dropped), as are the phones each dashboard
  notification was pushed to (`push_sent`, written by `announce`).
- **Counting** (`aggregate.ts`). `totalsOfDay` turns a day's raw events into
  installs (first opens), active installs, sessions, splits (platform,
  system, app version, country, language: each install once a day),
  screens, items (top 200 a day), event counts, checkout value per
  currency and notification opens (distinct installs). `aggregateDay` adds
  the installs active over the 7 and 30 days ending that day and writes the
  returns of the cohorts that first opened 1, 7 and 30 days before on the
  cohort's day (`ret_d1`, `ret_d7`, `ret_d30`), and marks a finished day
  `done`. A batch with events of an earlier day marks that day `dirty`.
  The daily job (`POST /api/internal/daily`) counts every app with events
  in the last week (finished days not done or dirty, within a 15-second
  budget) and deletes raw events older than 90 days, in batches of 5,000
  (72, `lib/analytics/retention.ts`), then each app's daily totals older
  than its plan keeps, a batch at a time on the primary key's (app, day)
  prefix within a 10-second budget; the dashboard counts
  what is still due, and today so far, before each report.
- **Days in the owner's time zone** (Phase 47, `zone.ts`). A day is the
  app's day: its time zone is the owner's choice (Analytics › Time zone,
  `apps.time_zone`), else the zone of the account's country (from its
  WhatsApp number's calling code), else Europe/Istanbul. The simplest
  correct way: each event is filed under the date in the app's zone when it
  arrives (`analytics_events.day`), so the daily totals, the 7 and 30-day
  users, retention, search counts and push counts are all counted in that
  zone with no change to the tables or the counting; "today", the ranges,
  the daily job and the CSV use the same zone. Regrouping UTC totals
  couldn't be exact (a UTC day spans two local days), and re-filing raw
  events on a change would only reach 40 days back, so a change of zone
  applies from then on: days counted before keep the zone they were
  counted in (before Phase 47: UTC), and the day of the change may hold a
  few hours more or less. The page says which zone its days are in.
- **Reports** (`report.ts`). Ranges of 7, 30 or 90 days or custom (at most
  366), compared with the period just before: installs, average daily,
  weekly and monthly active users, sessions and sessions per user, day 1, 7
  and 30 retention (only cohorts whose day N is over), the splits, top
  screens and items (named per app type), the funnel (views, then add to
  cart / enroll / book / tickets / give, then checkout), each dashboard
  notification's open rate (installs that opened it over phones pushed) and
  website notifications by type, and searches made at least twice. The CSV
  export (`/api/dashboard/analytics/export`) has the same totals; a cell
  that would run as a spreadsheet formula starts with an apostrophe. Admin ›
  a client's page shows each app's last 30 days.
- **App** (`mobile/lib/core/services/analytics.dart`). Events queue in memory
  and in the app's preferences (at most 500, each dropped after 7 days),
  are sent every 30 seconds and when the app goes to the background, and a
  failed batch is retried with a growing pause (30 seconds to 30 minutes;
  400 drops it, 404 stops sending until the next start). A route observer
  sends screen kinds; the shared item, cart, checkout, booking, ticket and
  donation flows send their events. Settings › "Share usage statistics" (on
  by default, with a short note) turns it off: sending stops and the queue
  and install ID are deleted. The preview (`env.isPreview`) and builds
  without `analytics` never send.

## Yallapp's prices in pounds and dollars (Phase 52)

Yallapp's own prices (the plans clients pay Yallapp for, and any add-on) are
set in Egyptian pounds and charged in pounds through Kashier, wherever the
client is. People in Egypt see pounds; everyone else sees US dollars. What
app owners sell to their own customers keeps each app's own currency.

- **One place for the money rules** (`lib/billing/prices.ts`). A
  `YallappPrice` is `{ egpCents, usdCents }`: the charged price in piastres
  and the dollar price set by hand (null: the pounds at the team's rate,
  `egpPerUsd`, rounded to whole dollars, at least $1). `shownPrice` gives the
  visitor's price, `chargedPrice` what a gateway charges (Kashier and
  Fawaterk: pounds; iyzico takes no pounds, so with iyzico the dollar price
  is charged), `offerFor` both and the line "You'll be charged EGP X (about
  $Y); your bank may convert it." when they differ, `loweredOffer` the same
  after a coupon (the coupon lowers the charge; the shown price drops in the
  same proportion, to the cent). `formatMoney` writes "EGP 1,500" and "$29"
  (English pages; "ج.م" would be for Arabic ones only). Plans use it through
  `planPriceOf` (null when "On request"); an add-on only needs a
  `YallappPrice` to get the same display, charge, coupon and receipt rules.
- **Settings.** Each plan's edit (`platform_settings.plans`) keeps
  `priceCents` (pounds), `usdCents` and `onRequest` (the team can keep a
  price and still show "On request"). `platform_settings.billing` holds the
  gateway for plans and add-ons (Kashier until set) and the rate. The
  old marketplace's provider (`paymentProvider`) is kept in the database
  but no longer read (72). Edits from before
  Phase 52 named a currency: pounds stay the price, dollars become the
  shown dollar price, other currencies are dropped.
- **The visitor's country** (`lib/geo.ts`), first that answers: our reverse
  proxy's `X-Yallapp-Client-Country` (trusted only with
  `X-Yallapp-Proxy-Secret`; the proxy looks the visitor up with
  `mod_maxminddb`, because Netlify sees the proxy's own country), Netlify's
  `x-nf-geo` (JSON, base64 or plain) and `x-country`, Cloudflare's
  `cf-ipcountry` (if a Cloudflare zone is ever put in front), then the region
  of the browser's preferred language (`Accept-Language: ar-EG`); none:
  dollars. A signed-in client's account country (`clients.country`, saved
  from the request at sign-up) comes before the request's
  (`lib/billing/display.ts`). Spoofing a header only changes what is shown:
  the charge is the same pounds.
- **Caching.** The pages with prices (`/`, `/pricing`, the dashboard) are
  rendered per request (`dynamic = "force-dynamic"`, so Next.js sends
  `Cache-Control: private, no-cache, no-store`): no CDN or proxy keeps a
  copy, and the country is read on each request. As a second guard,
  `next.config.ts` sends `Netlify-Vary: header=X-Yallapp-Client-Country|
  X-Country|CF-IPCountry|Accept-Language,country=eg` on `/` and `/pricing`
  (`lib/geo-vary.ts`), so Netlify's cache, if turned on for them later,
  keeps one copy per country. A plain `Vary` can't be added: Next.js
  replaces it on app pages with its own. Static or ISR pages must never show
  a price: a page that needs one reads `priceView` (which makes it dynamic)
  or shows prices from the client side.
- **Payments.** `payPlanAction` works out the offer on the server (never from
  the browser), checks a coupon against the charge, and starts the payment
  with the charge; the payment keeps `shown_cents` and `shown_currency` when
  the client saw dollars (migration 0038). Kashier is asked for pounds
  (`currency: "EGP"`) and the read-back must match the pounds. The receipt
  (`/dashboard/license/receipts/<id>`, `lib/billing/receipt.ts`), the
  activation and renewal emails (`{{payment_line}}`) and Admin › Payments
  show the pounds charged and the dollar price as "about".

## The website in Arabic and Turkish (Phase 55)

yallapp.com.tr is in English, Arabic and Turkish. English is the default and
the source of every text; Phase 56 puts the client dashboard on the same
foundation. The admin stays in English. Client apps keep their own languages
(`lib/i18n/locales.ts`, "Pages, looks and languages" below): the two lists
are separate.

- **Addresses.** English pages keep their addresses, with no prefix. Arabic
  and Turkish ones live under `/ar/…` and `/tr/…`: the home page, solutions,
  features, integrations, how it works, pricing, demo, contact, FAQ, docs (the
  index and every article), developers, terms, privacy, refund, (66) delete-account, sign-in,
  sign-up, forgot and reset password, and "page not found". Dashboard, admin,
  API, `/pay`, `/give`, `/shop`, `/receipts`, `/a`, `/m`, `/media`, `/oauth`
  and `/pending` have no language prefix. There is no proxy, middleware or
  rewrite: `src/app/[lang]/…` mirrors the pages, and both the English route
  files and the `[lang]` ones render the same page modules (`src/site/*`)
  with a `lang`. `[lang]/layout.tsx` makes `ar` and `tr` ahead of time
  (`generateStaticParams`); each page checks its language
  (`src/site/lang.ts` `routeLang`), so `/xyz` is "page not found" in English
  and `/ar/xyz` (`[lang]/[...rest]`) is in Arabic
  (`components/localized-not-found.tsx`). Every page keeps how it was
  rendered: `/`, `/pricing` and their `/ar`, `/tr` versions are dynamic
  (prices, Phase 52, and `lib/geo-vary.ts` lists them), the others are
  static. Pages never redirect by the browser's languages.
- **Paths** (`src/i18n/paths.ts`). `localePath(lang, href)` gives a link in a
  language (paths that aren't site pages, like `/dashboard`, stay as they
  are, with any `?` and `#`), `switchLangPath(path, lang)` the same page in
  another language, `languageAlternates(path)` the `en`, `ar`, `tr` and
  `x-default` (English) addresses for `hreflang`.
- **Texts** (`src/i18n`). `messages/en.ts` is the typed catalog (`as const`,
  type `Messages`), by area (`nav`, `footer`, `pricing`, `auth`,
  `formErrors`, …); `ar.ts` and `tr.ts` are `Messages` too, so a missing key
  fails the type check, and `tests/unit/site-i18n.test.ts` checks every key,
  ICU placeholder and rich-text tag against English. Messages are ICU
  (`{count, plural, …}`, parsed by `lib/i18n/icu.ts`); `<tag>…</tag>` marks
  links and bold parts, rendered by `richText` (`src/i18n/rich.tsx`).
  `messagesFor(lang)` and `getT(lang)` work on the server and in client
  components; server pages pass client components only the texts they need,
  so the catalogs stay out of the browser's code. `translateKnown(lang,
  "formErrors", english)` turns an English message from shared code (like
  "Use at least 10 characters.") into the page's language.
- **Numbers and dates.** `formatNumber`, `formatDate` and `formatList` use
  `LANG_INFO[lang].intl`: `en-US`, `tr-TR` and `ar-EG-u-nu-latn`. Arabic
  pages write Latin digits (0–9), as most Arabic websites with prices do, so
  the same numbers read the same in every language. Prices are written the
  same way in all three ("EGP 1,500", "$29", `lib/billing/prices.ts`) and
  kept left to right inside Arabic text (`dir="ltr"`).
- **`<html lang dir>`** comes from `components/html-shell.tsx`, a client
  component in the root layout that reads the route's `lang` parameter, so
  static pages stay static. Pages without the parameter (dashboard, admin)
  are `lang="en" dir="ltr"`.
- **Right to left.** Arabic pages use Tailwind's logical classes (`ms-`,
  `ps-`, `start-`, `text-start`, `border-s`) and the `rtl:` variant where a
  movement has a direction. `Icon` mirrors directional symbols (arrows,
  chevrons) with `.icon-flip:dir(rtl)`. The Works-with strip scrolls the
  other way (`marquee-rtl`), the timeline's line and dots follow the
  direction, phone and browser frames aren't mirrored, and code, addresses,
  phone numbers and the API reference stay left to right.
- **Fonts.** IBM Plex Sans Arabic (`next/font`, Arabic subset only,
  `--font-arabic`) comes first for `:lang(ar)`; Latin words stay in
  Bricolage Grotesque (`docs/BRAND.md` › Type).
- **The switcher** (`components/language-switcher.tsx`): "English ·
  العربية · Türkçe", each name in its own language with `lang` and
  `hreflang`, in the header (a menu on wide screens, a row in the phone menu)
  and the footer, also on the sign-in pages. Plain links to the same page in
  the other language, so the page loads with its own direction. Choosing one
  sets the `yallapp_lang` cookie (`src/i18n/config.ts`: one year, `Path=/`,
  `SameSite=Lax`, readable by scripts); signing in or up from an Arabic or
  Turkish page sets it too (`app/actions/auth.ts`). Nothing redirects by it;
  the dashboard reads it (Phase 56, below). Sign-in still goes to the dashboard.
- **Signed in on this browser** (Phases 54 and 62). Next to the HttpOnly
  session cookie, a readable `yallapp_signed_in=1` lets the public pages,
  the same for everyone, show "Dashboard" instead of "Sign in"
  (`components/account-link.tsx`). When the session ended on the server
  (signed out elsewhere, a new password, expired), the dashboard, the admin
  and `/pending` send the person through `/api/session/ended`, which removes
  both cookies and opens the sign-in page in their language
  (`signInPath`); the sign-in page itself removes a leftover readable
  cookie (`ClearSignedIn`) and the links on the page follow at once.
- **Search engines** (`lib/seo.ts` `siteMetadata`). Each page has its own
  title, description and canonical, `alternates.languages` with `en`, `ar`,
  `tr` and `x-default` (English), `og:locale` with the other two as
  `og:locale:alternate`, and JSON-LD with `inLanguage`. `sitemap.xml`
  (`lib/sitemap.ts` `siteSitemap`) lists each page in the three languages
  with their alternates. Sign-in pages stay `noindex`, and `robots.txt` is
  unchanged.
- **(67) The address, the favicon and previews.** Canonical addresses,
  `hreflang`, the sitemap, `robots.txt` and JSON-LD use `siteUrl()`:
  `APP_URL`, else Netlify's `URL`, else `https://yallapp.com.tr`, but never
  a `*.netlify.app` address. Netlify's `URL` is `yallapp.netlify.app`
  (the domain isn't added in Netlify, the proxy serves it), and static pages
  take the address when they are built. Every page links the favicons from
  the root layout (`SITE_ICONS`): `/favicon.ico` (16, 32 and 48 px), PNGs of
  48, 96 and 192 px, the SVG and the Apple touch icon, the files of
  `brand/favicon` in `public/`, never under a `robots.txt` rule. Google
  Search shows the home page's favicon (a square of at least 48 px) and
  reads the Organization's `logo` (512 px). Builds for deploy previews and
  branch deploys (`CONTEXT` other than `production`) send
  `X-Robots-Tag: noindex, nofollow` on every response (`lib/indexing.ts`).
  The proxy sends `www.yallapp.com.tr` to `https://yallapp.com.tr` in one
  301. `yallapp.netlify.app` itself still answers with the same pages; their
  canonical addresses name yallapp.com.tr.
- **Share images.** The Open Graph images are made per language
  (`components/og-image.tsx`). The image library draws neither Arabic letter
  joining nor right-to-left order, so `lib/arabic-shape.ts` prepares each
  line as a text engine would (Phase 62): the letters' contextual forms
  (Arabic Presentation Forms) by their Unicode joining types, marks kept and
  transparent, tatweel, ZWJ and ZWNJ, lam-alef and the Persian letters; then
  the bidirectional algorithm for a right-to-left line (numbers, Arabic-Indic
  digits and Latin read left to right, bracket pairs resolved and mirrored),
  each mark just before its letter (the renderer draws a zero-width mark over
  the glyph after it). The line is cut into units at its right-to-left spaces
  and laid out from the right, so it wraps. The font files are in
  `src/app/fonts/og`.
- **Long texts.** Built-in translations live in `src/content/ar` and
  `src/content/tr` (marketing lists, plans, FAQ, the documentation, the
  legal pages and the texts the team edits), with types in
  `src/content/translation-types.ts`; `lib/marketing-lang.ts` picks them.
  Translated articles keep the English heading anchors with `## Heading
  {#anchor}`, so links like `/docs/wordpress-plugin#sign-in-codes` still work.
  Brand, store and platform names, and third-party screens' labels, stay as
  they are. The legal pages say the English version prevails and link to it.
- **Texts the team edits** (Admin › Website content). Each page has
  English, Arabic and Turkish tabs (`?lang=ar`). Translations are saved in
  the same `site_content` table under `<key>@ar` and `<key>@tr` (no
  migration). A field shows the team's edit in that language, else the
  built-in translation, else the English text; an empty field falls back.
  Plan texts (Phase 62): Admin › Plans has optional Arabic and Turkish
  fields for a plan's name, tagline, highlights and price text
  (`PlanInfo.translations`, kept in the `plans` setting); a page shows the
  team's text in its language, else the built-in translation of the
  default texts, else the English (`lib/marketing-lang.ts` `planFor`,
  `plansIn` for the dashboard's pages).
- **The dashboard** uses the same formats and ICU messages with its own
  catalogs: "The client dashboard in Arabic and Turkish (Phase 56)" below.

## The client dashboard in Arabic and Turkish (Phase 56)

Every client-facing page after sign-in (`app/dashboard/**`, `/pending`) and
the components they share are in English, Arabic and Turkish. The admin
stays in English: components it shares with the dashboard take a `lang`
that defaults to English, and the client-side hooks do nothing outside the
dashboard.

- **The language** (`lib/dashboard-lang.ts` `dashboardLang`). The person's
  choice (`users.language`, migration 0042, null until they choose), else
  the `yallapp_lang` cookie, else English (`preferredLang`). The switcher in
  the sidebar's account area (`components/dashboard-language.tsx`, a form)
  posts `setDashboardLanguageAction`, which saves it on whoever is signed
  in (our team member managing a client changes their own) and in the
  cookie. Signing in from `/ar` or `/tr` saves the page's language when the
  person had none. The dashboard layout and `/pending` set `<html lang dir>`
  for their pages (`DocumentLang`); other pages keep the route's.
- **Catalogs** (`src/i18n/dashboard/<area>.ts`, registered in `index.ts`
  `AREAS`). Each area exports `en` (`as const`, the source) and `ar` and
  `tr` typed `Strings<typeof en>`, so a missing key fails the type check;
  `dashboard-i18n.test.ts` also checks placeholders, plural forms and tags
  and scans the dashboard's files for English written into them
  (`tests/unit/dashboard-strings.ts`; `i18n-ok` marks a line that is code
  or a name). Keys are `area.key`. Messages are ICU (placeholders, plural,
  select; `{kind, select, …}` for words that depend on the app's kind) with
  rich-text tags (`richText(text, { link: (chunk) => <Link…/> })`), never
  sentences joined from pieces.
- **Server and client.** Server components call `dashboardText()` for
  `{ lang, dir, t, k, date, num }`; client components get the same catalog
  from `DashboardI18n` (one language per page) through `useDashT`,
  `useDashLang`, `useDashFormat` and `useKnownText`.
- **Messages from shared code** (server actions, `lib/` validation, checks,
  notices) stay English sentences, so actions don't need the language. Each
  area's `known` group lists the English texts it can show with their
  translations; `k(text)` (and `FormMessage`, `FieldError` and the other
  shared components) translate a text by exact match, then by `{name}`
  patterns, putting values back as they were (a date written the English
  way is written again in the language, and a known "The …" phrase is
  translated). An unknown text shows in English. A new message is added in
  English to the right `known` group with its Arabic and Turkish. Phase 62:
  a value that is itself a known sentence is translated the same way, up to
  three levels ("Nothing was refunded. {error}", whose error is a
  provider's answer).
- **Payment providers' and email servers' answers** (Phase 62,
  `lib/payments/explain.ts`). iyzico, Kashier and Fawaterk refuse with their
  own short texts (English or Turkish); the dashboard shows what they mean
  (API keys, IBAN, ID or tax number, amount, not found, currency, phone,
  email, address, else "refused the request"), with Yallapp's own keys said
  so, and the provider's text after "Details:". The email server's checks
  (`lib/email/app-mail.ts`) already say what happened, its answer quoted.
- **Downloads** (Phase 62). The analytics, donations and attendees CSV
  files take the downloader's dashboard language for their column names and
  words (`lib/analytics/localize.ts`; the English analytics file keeps its
  machine-friendly columns). Notes for store reviewers stay in English (the
  reviewers read them), with their meaning shown in the dashboard's
  language. The Languages page says what each interface string is for
  (`lib/i18n/app-string-notes.ts`, keyed by the ARB description, every one
  in English, Arabic and Turkish without the app's code names; a test lists
  any new description without them).
- **Right to left.** Tailwind's logical utilities (`ms`, `pe`, `start`,
  `text-end`), `Icon` mirroring the directional symbols, charts and number
  columns kept left to right, and the phone preview and phone frames in
  `dir="ltr"`. Numbers use Latin digits in every language.
- **Emails to clients** (`lib/email/templates-lang.ts`). Unedited emails to
  clients have Arabic and Turkish defaults with the same placeholders;
  `sendTemplate(key, to, values, { lang })` picks the one for
  `emailLangOf(user)` (their dashboard language, else English) and writes
  English-style dates in it; the lines that go into the placeholders come
  from the `emails` area. A template the team edited in Admin › Emails is
  one English text, sent in every language. Emails to the team and to the
  people using a client's app don't take a language.

## The Owner API: Yallapp Business (Phase 58)

Yallapp's own mobile app for the people who run an app on Yallapp (the app is
Phase 59) talks to the Owner API, `https://yallapp.com.tr/api/owner/v1`
(`docs/api/owner.yaml`, linted with the other contracts, not on the public
developer pages). It is the client dashboard on a phone: the same accounts,
the same database, and the same code.

- **Route and code.** `src/app/api/owner/v1/[...path]/route.ts` reads the
  request and hands it to `lib/owner/service.ts`, a small router over the
  handlers in `lib/owner/` (`account`, `sales`, `catalog`, `library`,
  `insights`). Errors are `{code, message}` (`lib/owner/http.ts`); messages
  are English sentences translated by their words (the dashboard's `known`
  texts, `src/i18n/dashboard/owner.ts`) into the person's language: their
  dashboard choice (`users.language`), else `Accept-Language`, else English.
- **Same rules, same code.** Where a dashboard server action held a rule,
  its core moved into `lib` and both call it: an order's steps and the
  kitchen's (`lib/catalog/order-status.ts`, with the payout release), an
  appointment's steps (`lib/bookings/appointments.ts`), sending an app
  notification with its limit (`lib/hosted/send-notification.ts`), saving a
  lesson (`lib/courses/edit.ts`), a product's price, sale price and stock
  (`lib/catalog/product-fields.ts`), article and listing status and the
  office's reply (`lib/news/status.ts`, `lib/listings/office.ts`), starting
  a Media upload (`lib/media/start.ts`). Refunds, check-in, Media, the bell
  and Analytics were already in `lib`.
- **Accounts and tokens.** `POST /auth/sign-in` takes the dashboard's email
  and password with the website's limits (the same counters) and the same
  password check; Yallapp's team (an admin role) and accounts without a
  client get `use_website`. Each sign-in is a row of `owner_devices`
  (migration `0043_yallapp_business`): name, platform, app version, the
  language its phone asked in, the user's session version, the SHA-256 of
  its refresh token, its push token and choices. The access token is signed,
  not stored (`yo1.<device>.<expires>.<HMAC>`, a key made from
  `SIGNING_SECRET` for this use only, 15 minutes); every request reads the
  device back, so signing a device out (the app, `GET/DELETE /me/devices`,
  or Dashboard › Your phones) or changing the password (the session version)
  stops it at once. The refresh token (`yor1_` and 32 random bytes, 60 days)
  is replaced on each use by a conditional update on its hash, so of two
  renewals with the same token one wins. Hashes are compared in constant
  time; at most 10 devices a person (the one used longest ago makes room);
  the daily job deletes devices whose refresh token ended. Pending and
  suspended accounts sign in and see their state (`GET /me`); everything
  else answers 403, as the dashboard sends them to its waiting page.
- **Scope.** Every `/apps/{app_id}` path takes the app from the signed-in
  client's own list, so another client's app is 404 whatever the ID, and
  what the app has comes from `lib/app/areas.ts` (its type and content
  source, as the dashboard's pages and actions test it): a path it doesn't
  have is 404 `not_available`. Expired apps stay usable as on the dashboard;
  Media uploads wait for an active plan, as there.
- **No payments.** Nothing is bought in the app: the license, plan and
  storage are read-only with a `manage_url` to the dashboard on the website
  (`/dashboard/open/<app>?to=license|media`).
- **Pushes to the owner's phone** (`lib/owner/push.ts`): from Yallapp
  Business's own Firebase project (`OWNER_PUSH_FIREBASE_SERVICE_ACCOUNT`,
  optional Huawei Push Kit), sent where the dashboard and its emails learn
  of things: a paid order and a donation or Yallapp payment confirmed
  (`lib/payments/settle.ts`), an appointment booked and a listing message
  (the hosted API's `onBooked`, `onInquiry`), a build finished
  (`lib/builds/notify.ts`), an announcement created live (Admin ›
  Announcements, to its audience), an owner notice created (`lib/notices.ts`
  and the other places that make one). Each device gets the kinds it left on
  (`PUT /me/push-preferences`), in the person's language, else its phone's;
  tokens the push service refuses are forgotten; a push never fails what
  caused it (`pushOwnerSafely`). Local runs and tests keep each push in
  `YALLAPP_OWNER_PUSH_DIR`.
- **Limits.** Sign-in: the website's (30 per IP and 8 per email in 15
  minutes); renewing: 60 per IP in 10 minutes; uploads: 200 an hour per app
  and notifications to the app's users: 10 an hour per app, both counted
  with the dashboard's.
- **Moving an appointment (61)** (`lib/bookings/reschedule.ts`, Dashboard ›
  Appointments › Change time and `GET …/appointments/{id}/times`, `POST
  …/reschedule`): a pending or approved appointment that hasn't started moves
  to one of the times booking in the app would offer for its service
  (`freeTimes` over `busyTimes`, `lib/bookings/busy.ts`: the staff's hours
  and days off, their other appointments and classes, the minimum notice and
  how far ahead the business takes bookings; its own time counts as free).
  `moveBookingAppointment` checks and writes as one step (the app's row is
  the lock, as booking), so two moves never take one time. The status stays;
  the customer gets "Your appointment moved" in the app's inbox and on their
  phones when push is on (as a class called off), in the app's main language
  (English, Arabic or Turkish).
- **Notifications sent later (61)** (`lib/hosted/scheduled-notifications.ts`,
  `scheduled_notifications`, migration 0044): Dashboard › App notifications ›
  Later and `…/notifications/scheduled` take a date and time in the app's
  time zone (Analytics', roadmap 47), later than now and within 90 days, at
  most 50 waiting per app; those waiting are changed or cancelled. The
  frequent job sends each through `sendAppNotification` (the same words,
  inbox, push and hourly limit as sending now; when the hour's 10 are used it
  waits for a later run without counting a try). A run takes a row with a
  conditional update (`scheduled` to `sending`), so two runs never send it
  twice; one left `sending` for 30 minutes is marked failed, never resent.
- **The frequent job (61)**: `netlify/functions/frequent-jobs.mts` calls `POST
  /api/internal/frequent` every 5 minutes with `INTERNAL_JOB_SECRET`
  (`lib/jobs/frequent.ts`): notifications sent later, then announcements that
  started (`pushStartedAnnouncements`: each live one not pushed yet is taken
  once with `claimAnnouncementPush` and pushed to its audience's phones; one
  created live is marked pushed at once; one that started over a day ago is
  marked, not pushed late).
- **Today's numbers (61)** are counted by the database for the app's whole
  day (`sumPaidCatalogOrders`, `sumPaidDonations`, `countHostedUsersCreated`,
  `countTicketsInWindow`: sums and counts in SQL, with indexes on the paid
  and created times), no longer from the newest 200 rows.

## Yallapp Business, the app (Phase 59)

`business/` is a Flutter app of its own (package `yallapp_business`, store id
`tr.com.yallapp.business` on Android and iOS), separate from the white-label
client app in `mobile/` but built the same way: Riverpod, go_router, Material
Symbols Rounded, ARB strings in English, Arabic and Turkish, tokens in
`flutter_secure_storage`. It talks only to the Owner API above.

- **API client** (`lib/core/api/`): typed models of `owner.yaml`, an
  `OwnerApi` interface with the HTTP client (Dio: bearer token,
  `Accept-Language` from the app's language, `{code, message}` errors with
  field errors and `Retry-After`) and an in-memory `FakeOwnerApi` with sample
  apps of every kind, used by the widget tests and by the demo
  (`--dart-define=YB_DEMO=true`). `TokenManager` renews the access token
  shortly before it ends and once for any number of 401s, keeps only the
  newest refresh token, and signs the person out when the refresh token is
  refused. A 403 `account_pending`/`account_suspended` reloads the account,
  which shows its state.
- **Session and routes** (`lib/core/session.dart`, `lib/core/routing/`): the
  router's redirect follows the session: sign-in, the fingerprint or face
  lock (on after the first sign-in on a phone that can, asked again after 5
  minutes in the background, off in Settings), the account's state (pending,
  suspended, no app, Yallapp out of reach), the app switcher when the account
  has several apps and none is chosen, then Today. The bottom navigation is
  built from `AppSummary.features`: Today, the app's main tool, Inbox and
  Stats when it has them, More; every other screen opens from Today's quick
  actions or More, and only when the app has it.
- **Language**: the account's dashboard language (`Me.user.language`), else
  the choice on this phone, else the phone's; changing it in Settings saves
  it to the account (`PUT /me/language`). Arabic is right to left with IBM
  Plex Sans Arabic as the fallback after Bricolage Grotesque (both bundled),
  normal letter spacing and taller lines; arrows that point a way are
  mirrored.
- **Pushes** (`lib/core/services/push.dart`): Firebase options at build time
  (`--dart-define-from-file=config/firebase.json`, never committed); without
  them push is simply off. The token is registered after sign-in and on each
  refresh; a tapped push's `app_id` selects the app and its item opens its
  screen (after the lock or sign-in if needed); a push while the app is open
  shows with "Open", and Kitchen mode reloads on `new_order`.
- **Media uploads** (`lib/features/media/uploads.dart`): `startUpload`, then
  the file in `chunk_bytes` chunks straight to the media gate (64b `POST` as
  `application/octet-stream` with the offset in `Upload-Offset` and the
  query; `GET` for the offset, read from the header or the JSON body; a 409
  carries on from the gate's offset; 403/410 ask `resumeUpload` for a fresh
  link at most twice in a row; a refused upload says so with the HTTP status:
  `upload_refused`, `upload_storage`, `upload_too_big`), then `complete`. An unfinished upload is remembered with its file
  path, so it carries on later from where the gate is (`resumeUpload`).
- **No payments**: nothing is bought in the app. The plan and storage are
  read-only; "Manage on yallapp.com.tr" opens `manage_url` in the browser.
- **Light and dark (61)**: `buildTheme` makes both from Yallapp's palette;
  screens take colors from the theme's `YbColors` (`context.yb`): Ivory pages,
  white cards and Midnight text in light; Midnight pages, lifted Midnight
  cards and Ivory text in dark, Ember for small accents in both; every text
  pair at least 4.5:1 (`test/unit/theme_test.dart`). The door scanner stays
  dark in both. Settings › Appearance: the phone's setting (default), light
  or dark, kept on the phone.
- **Kitchen mode keeps the screen on (61)** while it is open and in front
  (`wakelock_plus` through `KitchenWake`: asked again on return from the
  background, released on leaving; a phone that refuses still runs it).
- **Releases (65)**: `.github/workflows/business-release.yml` builds the
  App Bundle (upload key from secrets) and the IPA (App Store Connect key,
  certificate and profile through fastlane as for clients' apps) and uploads
  them to a Google Play testing track and TestFlight with the listings in
  `business/store/` and screenshots drawn in CI from the demo
  (`test/store/store_screenshots_test.dart`). It never publishes or submits;
  the App Bundle is also on the "Yallapp Business test build" pre-release.
  The iOS project carries the push entitlement and `PrivacyInfo.xcprivacy`.
- **Moving appointments and sending later (61)**: Appointments › Change time
  (the free times a week at a time, a staff filter, a confirmation) and Send
  notification › Later (date and time, the scheduled ones with Edit and
  Cancel), on the Owner API paths above.

## Team members for clients (Phase 60)

The people who work with a business owner sign in with their own email and
password and see only what their role allows, on the dashboard, in the Owner
API and in Yallapp Business. The admin stays as it was (Yallapp's team).

- **Roles** (`lib/team/permissions.ts`, the one place that decides). The
  client's own user is the **Owner**: everything. A **Manager** has every
  area and the app's settings (`settings`: setup, pages, languages, builds,
  publishing, app sign-in, protection, stability) but not what is the
  owner's (`billing`: License & plugin, Yallapp's plans, storage packs,
  receipts, and where a shop's or charity's money goes; `team`; `apps`:
  adding or deleting apps, an app's type and content source). **Staff** have
  only the areas the owner ticked (`orders`, `bookings`, `events`,
  `donations`, `catalog`, `media`, `messages`, `app_users`, `analytics`,
  `notifications`). Any member can be limited to some of the business's
  apps; another app is as if it didn't exist. `teamCan(access, permission,
  appId)` answers for everyone; Yallapp's team managing a dashboard has the
  owner's access.
- **Data** (migration `0045_team_members`): `team_members` (client, user,
  role, areas, apps; the owner has no row), `team_invitations` (email, name,
  role, areas, apps, the SHA-256 of the link's token, language, 7 days,
  accepted or cancelled), `team_activity`. `lib/team/service.ts`: inviting
  (refused for the owner's email, someone on the team, Yallapp's team and an
  address with an invitation waiting; 20 an hour per business, 5 a day per
  address), sending again (a new token, 7 more days), cancelling, joining
  (`/team/join?token=`: a new account sets its name and password, an existing
  one gives its password with the sign-in limits; the store marks the
  invitation accepted with a conditional update, so a link works once),
  changing access (read on every request, so it applies at once) and
  removing: the person's session version goes up, so every website session
  and Yallapp Business device of theirs stops on its next request, and their
  phones signed in to that business are deleted.
- **Dashboard.** `getClientContext` gives the signed-in person's `access`,
  `member` (null for the owner and our team) and `businesses`: their own
  client first, then the teams they joined; the one chosen with the switcher
  is kept in `yallapp_business` (else the first active). Every page calls
  `requireClient(permission)` with its address's permission
  (`DASHBOARD_PATHS`); every client server action calls
  `clientFor(permission)` before anything else; the download routes check
  too. Without it the person goes to the overview, which says why. The
  sidebar shows only what `pathPermission(href)` allows; Staff get their own
  overview. Dashboard › Team (owner only) invites, lists the invitations,
  changes access, removes and shows the activity. Someone on several
  businesses picks one after signing in (`/dashboard/businesses`), with the
  switcher above the app switcher, or on the waiting page. The bell reads for
  the signed-in person; notices and builds show to those with `settings`,
  Yallapp payments to the owner.
- **Owner API.** A device is signed in to one business (`owner_devices.client_id`,
  the person's own first) and only while they still work on it; `PUT
  /me/business` moves it. `GET /me` gives `business`, `businesses` and
  `AppSummary.access`; `features` lists what the app has and the role
  allows. `appScope` refuses an area the role doesn't have with 403
  `not_allowed`, routes without an area name theirs (License: `billing`; the
  Team paths: `team`). Today counts only what the person has, and notices
  for those with `settings`.
- **Pushes** (`lib/owner/push.ts`): to every device signed in to the
  business whose person (the owner, or a member) may see the push's area on
  its app (`PUSH_PERMISSION`: a paid order to `orders`, a booking to
  `bookings`, a message to `messages`, a donation to `donations`, a payment
  to Yallapp to `billing`, builds and notices to `settings`, Yallapp's
  updates to everyone), each in that person's language. Roadmap 64: the
  people are found first (the owner and the team with the area on the app),
  then every device each of them signed in on, whichever business it works
  on (one they still work on, with their current session), so someone on
  several businesses hears of all of them. The data has `business_id` and
  `business_name` (the name as that person knows the business, from the apps
  they work on); on a phone working on another business the title starts
  with that name, and Yallapp Business switches to it (`PUT /me/business`)
  when the push is tapped.
- **Activity** (`lib/team/activity.ts`): order steps, refunds, appointment
  steps and notifications sent, from the dashboard and the Owner API alike,
  with who did them, and the team's own changes; one English line each,
  translated on the Team page by the dashboard's `known` texts. Roadmap 64:
  the Team page pages it (50 a page, newest first, Newer and Older links)
  and filters it by person (the owner or a member: `team_activity.actor_id`);
  the Owner API has no activity path.
- **Languages.** The dashboard's `team` catalog, the `team_invitation` email
  in English, Arabic and Turkish (the invitee's language when they have an
  account, else the owner's), the join page in the invitation's language,
  Yallapp Business's `tool/strings_e.py`. The admin's client page lists the
  team read-only, in English.

## Course questions and reviews, and a gym's door (Phase 63)

What the dashboard, the Owner API (Yallapp Business) and the customer's app
do for the questions and reviews of courses managed in Yallapp and for a
gym's members at the door, with one set of rules in `lib`.

- **Questions and reviews** (`lib/courses/community.ts`, migration
  `0046_members_and_course_community`: `course_questions`, `course_answers`,
  `course_reviews`). The hosted courses connector serves the contract's
  Community endpoints (`features.reviews` and `qna` are on): enrolled
  students ask (20 questions and answers an hour per student), write again
  under a question, and write or edit one review per course; the course
  lists show the rating of the reviews shown. A question is `open` until the
  business answers and again when a student writes under it; adding an
  answer updates the question's status in one transaction (the question's
  row first, so two answers at once can't deadlock); its answers are counted
  when read, so a deleted student's answers (they go with the account) leave
  the count. Students write or edit at most 20 reviews an hour. The
  business answers in its name (the course's instructor, else the app's
  name), and the student is told in the app's inbox and by push in the
  app's language; it replies under a review (`Review.reply`, for everyone)
  or hides one (`status: hidden`, only its author gets it). New questions
  and follow-ups push `new_message` to people with Messages, a new review
  `new_review` to people with Catalog & content (`pushNewQuestion`,
  `pushNewReview`). Dashboard › Courses › Questions (Messages) and Reviews
  (Catalog & content); the Owner API's `questions` and `reviews` paths
  (features `questions`, `reviews`); Today's `questions_to_answer`; the
  Team page's activity lines (`recordCommunity`). Visitors' questions and
  reviews of demo academies are purged with their other activity.
- **Member codes** (`lib/bookings/member-codes.ts`). The design of the
  ticket codes (lib/events/codes.ts: the same 32 characters, 12 of them,
  typed in groups of four, a key per app from the signing secret), but not
  stored: a code is the first 60 bits of an HMAC of the app and the
  membership with the app's key, so it can't be guessed, works only at its
  own gym and needs no migration of existing memberships. The QR code holds
  `YM1.<membership>.<code>`; a typed code is found among the gym's
  memberships. `GET /me/memberships` gives `member_code` for an active
  membership of a gym (vertical fitness); the customer's app keeps the list
  on the phone (forgotten on sign-out), so the code shows offline. So a
  typed code is one indexed lookup, `memberships.code_hash` keeps an HMAC of
  the code (not the code) once it has been shown in the app or used at the
  door; one with no hash yet is looked for once among the memberships that
  can get in, then kept. The match is checked in constant time.
- **The door** (`lib/bookings/door.ts`, `member_check_ins`). A code, a QR
  code or a membership chosen by name: cancelled, ended, not started and
  used-up class packs are refused with the reason; otherwise the store adds
  a row keyed by (app, app user, the gym's day in its time zone), so a
  member counts once a day whichever membership or phone did it, and of two
  scans at once one wins and the other answers `already_in` with the time.
  Dashboard › Members › Member check-in (camera where the browser reads QR
  codes, typing, search by name, today's list; the camera scanner shared
  with the events' Check-in), the Owner API's `members`, `members/check-in`
  and `members/check-ins` (feature `member_check_in`, the Bookings area),
  Today's `member_check_ins`, and Yallapp Business's Scan members and
  Members. The day's list and Today's count read the gym's own day by the
  same key; the members list is filtered, ordered (those who can get in
  first) and paged by the database. Checking in never uses a class credit
  (credits are for booking classes); a membership with credits and none left
  is refused at the door.

## Hidden questions and frozen memberships (Phase 64)

- **Hidden questions and answers** (`lib/courses/community.ts`, migration
  `0047_frozen_memberships_hidden_questions`: `hidden` on
  `course_questions` and `course_answers`). Like a hidden review, a hidden
  question or a hidden student's answer reaches its author only: the hosted
  API lists a hidden question only to its author (`viewerId` in the store's
  query, so totals are right) and answers others 404 for it; hidden answers
  are filtered out for everyone but their author, and a question's
  `answer_count` never counts them. The author gets `hidden: true` and the
  app shows "Hidden by the academy. Only you can see it." The business's
  own answers can't be hidden. Hiding doesn't answer a question; the
  business's "Waiting" and "Answered" lists and Today's count are of the
  shown questions, with the hidden ones in their own list (`questionFilter`).
  A hidden question's follow-ups aren't pushed. Dashboard › Courses ›
  Questions (Hidden filter; hide or show the question and each student's
  answer), the Owner API's `PATCH questions/{id}` and
  `questions/{id}/answers/{id}` (the Messages area), Yallapp Business's
  Inbox, and the Team page's lines.
- **Frozen memberships** (`lib/bookings/freeze.ts`, `memberships.frozen_from`
  and `frozen_until`). A freeze runs from the start of a gym day (today to
  90 days ahead, before the membership ends) until the start of the day
  it's back (at most a year later) or, without one, until the gym unfreezes
  it. The rule for the end date, the common gym rule: it moves later by the
  days frozen. With a day it's back, the end moves by the whole freeze at
  once; unfreezing early gives back the days not taken (a freeze that
  hadn't started is simply removed). Without one, the end waits while it is
  frozen (the membership doesn't expire meanwhile) and moves by the days
  from the first frozen day to the day it is unfrozen (that day isn't
  frozen). Days are the gym's in its time zone. Freezing is one conditional
  update (active, and no freeze now or to come), and unfreezing another
  (the freeze that was read, while it isn't over), each writing the
  new end (computed in the gym's days, keeping its time of day there, so a
  change of clocks doesn't move the day), only while the end is still the
  one read; unfreezing also checks the freeze's day it's back
  (null-safe) and that the membership is active (a cancelled one keeps its
  end, and shows no freeze). Two people at once change it once. Classes:
  a membership is judged frozen on the class's own day, so a freeze from
  tomorrow doesn't stop today's class and one ending Friday doesn't stop
  Saturday's; when a freeze is set, the classes that membership booked that
  start inside it are cancelled through the store's own cancelling (spot
  and credit back) and the member is told in the app's inbox and by push, in
  the app's language. While frozen the door answers `frozen` ("Frozen until
  …", or "Frozen"), classes answer `membership_frozen`, and `GET /me/memberships` gives
  `frozen` (the app says Frozen and the code no longer promises to let them
  in; the status stays `active`). Dashboard › Members (Freeze with the first
  day and the day it's back, Unfreeze), the Owner API's `PUT` and `DELETE
  members/{id}/freeze` (the door's Bookings area; `Member.status` `frozen`
  and `Member.frozen`), Yallapp Business's Members, and the Team page's
  lines.

## Deleting a Yallapp account (Phase 66)

Google Play (Data safety's "Delete account URL") and the App Store (5.1.1(v))
want a public page where someone with a Yallapp account, the people who sign
in to the dashboard and to Yallapp Business, can ask for their account and
its data to be deleted without the app. The address to give both stores is
`https://yallapp.com.tr/delete-account`.

- **The public page** (`site/delete-account.tsx`, `/delete-account` and
  `/ar`, `/tr`; in the sitemap, the footer's Legal column, the legal pages'
  menu, and section 9 of the privacy policy): how to ask (from the dashboard;
  by email to the contact email from the account's address when they can't
  sign in; team members ask the owner to remove them), what is deleted (the
  account, its apps and their data, store and signing keys, the team's
  access), what is kept and for how long (billing records as accounting and
  tax laws require, a record of the request, technical logs up to 12 months,
  as the privacy policy says; apps under the client's own store accounts stay
  there), within 30 days (`DELETION_DAYS`), and that it ends the plans (they
  renew only when paid; refunds as the refund policy says). People using a
  client's app are sent to that app's own account deletion.
- **Asking** (`lib/account/deletion.ts`, `app/actions/account.ts`):
  Dashboard › Your account (`/dashboard/account`, open to everyone on the
  team; the sidebar's Account group) and, for an account waiting for
  activation or suspended, the bottom of the waiting page (`/pending`). Only
  the owner can ask: a team member is told to ask the owner to remove them,
  and Yallapp's team managing the dashboard is refused. The owner types their
  email again and gives their password (counted with the sign-in attempts
  for the address, `RATE_LIMITS.signInEmail`), with an optional reason. The
  request is saved (`account_deletion_requests`, migration
  `0048_account_deletion_requests`: no foreign keys, so the record outlives
  the account; `open_client_id` is unique while it is open, so of two
  requests at once one wins and asking again returns the first), every
  Yallapp Business phone of the owner is signed out at once, the contact
  email (Settings) gets `account_deletion_request` and the owner
  `account_deletion_received` in their dashboard language. Until it is done
  the owner sees it and can cancel it (the team is emailed again). The
  account works as before meanwhile; nothing is charged since plans renew
  only when paid. The Owner API is unchanged (`owner.yaml`): the stores'
  listings give the page's address, and Yallapp Business can link to it.
- **Our team** (Admin › Account deletion, `clients.suspend`, a badge with
  the open requests): open requests oldest first, with "delete by" (30 days)
  and Overdue, the reason, and what belongs to the account: the user and
  client IDs, the Blobs prefix `assets/<client id>/`, the apps, the build
  folders (`builds/<build id>/` on the files host), the paid payments and the
  team. Since Phase 73 the platform deletes the account itself (see
  "Start a course again, deleted apps and accounts…": the daily job after 7
  days, or Delete now), keeping the billing records. Until then it was
  done by hand, because deleting the client's rows also deletes its
  payments (on delete cascade) and the files live in three places:
  1. Keep the billing records the law requires (the client's page ›
     Payments, and their receipts) in our accounting records.
  2. Note the build folders listed.
  3. Delete the owner's row in `users`; the client, its apps, licenses,
     builds, payments, team, content, app users and the rest go with it.
     Team members keep their own sign-ins.
  4. Delete `assets/<client id>/` in Netlify Blobs (`yallapp-files`) and the
     build folders on files.yallapp.com.tr; the daily job removes the Media
     files 7 days after their app is gone (`lib/media/sweep.ts`).
  5. "Mark done and email them" (a tick that the rows and files are gone is
     required) sends `account_deletion_done` in the language they asked in;
     "Cancel the request" closes it without an email. Both are in the audit
     log. A request by email is handled the same way after checking it came
     from the account's address.

## An ended plan stops the app everywhere (Phase 68)

When a client's plan ends, their app stops everywhere, whatever serves it,
and comes back as soon as the plan is renewed. Nothing stores "ended": every
part asks the same question against the plan's end date at that moment,
`appIsActive(license, client, now)` (`lib/license/status.ts`): the account is
active and the app's own license hasn't reached `expires_at`.

- **Hosted API** (`/api/app/<app id>`): paused with 503 `license_inactive`
  (or `account_suspended`) and the owner's `contact` on every call,
  `GET /config` included, so the app shows "{App} is paused". The owner's
  preview still answers. `OPEN_WHILE_PAUSED` (`lib/hosted/service.ts`) keeps
  `POST /auth/refresh`, `POST /auth/logout` and `DELETE /me` answering, so
  someone signed in can always delete their account (Apple 5.1.1(v), Google
  Play). Signing in stays paused (no codes are sent for an ended plan).
- **WordPress** (plugin 0.4.6): the license is enforced on every site.
  `License_Client::state_of()` reads the stored status: `active` until its
  `expires_at` passes (compared with the site's clock, so the app pauses on
  time even when the site can't reach Yallapp), `unreachable` when an active
  plan hasn't been confirmed for 72 hours (the grace only covers network
  failures before the end), else what the platform said (`expired`,
  `suspended`, `invalid`, `none`). While it isn't `active` the Gatekeeper
  answers 503 with the contact from the plugin settings (`/config` too),
  except `POST /license/refresh` and the same three account routes; push and
  offline mode follow the plan. Only a development site (`WP_ENVIRONMENT_TYPE`
  `local` or `development`) can switch the checks off, with
  `YALLAPP_ENFORCE_LICENSE` false (the dev site's `wp-config.php` does) or the
  `yallapp_enforce_license` filter. Settings › License says active until …,
  ended on … with how to renew, suspended, or not confirmed.
- **Telling the site at once**: the frequent job (every 5 minutes,
  `refreshEndedSites` in `lib/license/refresh.ts`) sends the signed
  `POST /license/refresh` to the site of every license that ended in the last
  3 days, once per end date: `licenses.end_refreshed_for` (migration 0049)
  is set by one conditional update, so two runs at once ask once, and a
  renewed plan's next end is told again. Five sites at once, within 15
  seconds; the rest on the next run. Renewing (card payment, the admin)
  already nudges the site, so the app comes back within seconds.
- **Notifications** to the app's users stop through one check,
  `appMaySend` in `sendAppNotification` and `scheduleAppNotification`
  (`lib/hosted/send-notification.ts`, `scheduled-notifications.ts`): the
  dashboard (a notice above the form), the Owner API (403 `plan_not_active`,
  `push` false; Yallapp Business's composer says so and waits) and the
  frequent job. A notification sent later whose time comes after the end is
  marked `failed` with its reason and never sent late after a renewal; the
  owner sends it again. While an account is suspended or pending they wait,
  as before. Yallapp's team can still send from the admin.
- **Builds**: `GET /api/v1/builds/queue` checks each queued build again
  (`takeQueuedBuilds`, `lib/builds/queue.ts`): one whose plan ended or
  whose account was suspended after it was queued is closed as `failed`
  (`license_inactive` in `pipeline.yaml`) with the reason, the client is
  emailed, and the pipeline never sees it.
- **The customer's app**: the paused screen keeps "Contact {App}" and "Try
  again", and offers "Delete account" to someone signed in (asked and
  answered on the screen, which sits above the app's navigator). Someone
  not signed in asks the owner (the Contact button); our team can delete an
  app user from the client's page in the admin. `/delete-account` (Phase 66)
  is for Yallapp accounts.
- **What stays**: the dashboard and Yallapp Business stay readable and
  editable for an expired app, as before (uploads to Media and notifications
  wait for the plan); nothing is deleted.

## Security review (Phase 69)

What the review settled, for whoever changes these parts next (the findings
and what's still open are in ROADMAP, Phase 69):

- **Addresses clients give** (their own API, news feeds, webhooks to their
  API, link files, their email server, license nudges, a Ticimax shop) are
  called only after every address the name resolves to passed
  `isPrivateAddress` (`lib/app/api-check.ts`; `privateHostProblem` for a
  host), web addresses over https and without following redirects; 70 the
  connection itself goes to an address that was checked (`lib/net/safe-fetch.ts`,
  "Two-step sign-in and sessions" below). IPv6 is read group by group, so an IPv4
  address written inside one is checked as that address. A new connector on
  a client's own domain uses the same check before each call; platforms on
  their own domains (`*.myshopify.com`, `*.myideasoft.com`, fixed API hosts)
  only take names under those domains.
- **Headers:** every page sends `X-Frame-Options: DENY`, `nosniff`, HSTS,
  the referrer and permissions policies, and a Content-Security-Policy of
  `base-uri 'self'; object-src 'none'; frame-ancestors 'none'`
  (`next.config.ts`). API routes and media links are left out of that
  policy because they send their own: uploaded files and SVGs are served
  with `default-src 'none'; sandbox`. The app preview alone may be framed,
  by the dashboard.
- **Store review access** on the hosted API skips the per-number and per-IP
  limits but has one of its own per app (30 requests an hour), so its fixed
  code can't be guessed.
- **The plugin** accepts the app's access token only on the route WordPress
  actually serves when it is the plugin's (`Request_Auth::route_of`): never
  because the address's query string names the plugin.
- **CI:** our own runners also build clients' apps with the pipeline's
  secrets, so a pull request from a fork runs on GitHub's runners (the
  `runs-on` of `ci.yml`, `platform.yml` and `mobile.yml`).
- **Build files:** names that end up in Gradle, Xcode or resource files are
  one line (the platform turns control characters into spaces,
  `apply_config.dart` again) and escaped for each format.

## Receipts as PDF (Phase 71)

Every payment the platform takes has a receipt as a PDF, made on request
and attached to the email that confirms the payment. Nothing is stored: the
PDF is made again from the payment each time, so a refund shows on the next
download.

- **What has one.** A client's plan or storage packs paid to Yallapp
  (`plan_payments`, Kashier, Fawaterk or iyzico, or a coupon that covered
  everything), a customer's order in an app without a website (products, a
  restaurant's order, tickets, a paid course, a membership; through the
  business's own account or Yallapp's for marketplace sales, which the
  receipt says) and a donation. WordPress apps' orders are WooCommerce's or
  the LMS's.
- **Making it** (`lib/receipts/pdf.ts`): PDFKit, pure JavaScript, kept out
  of the bundle (`serverExternalPackages`) and given the fonts as bytes, so
  it never reads its own font files. The fonts are the site's static files
  in `src/app/fonts/og` (traced for every route): Bricolage Grotesque for
  Latin and Turkish, IBM Plex Sans Arabic for Arabic, embedded as subsets.
  fontkit, PDFKit's font engine, shapes Arabic with the font's own forms
  (joined letters, lam-alef) and lays a right-to-left run out from its end,
  but runs no bidirectional algorithm, and PDFKit lays a text out word by
  word unless OpenType features are given. So each line is cut first into
  runs in visual order (`bidiRuns` in `lib/arabic-shape.ts`, the same rules
  as the share images', for right-to-left and left-to-right lines), every
  run is drawn whole (`features: []`) in its font, and an Arabic receipt is
  laid out from the right. Text between LRI and PDI (`ltrSpan`: phone
  numbers, emails, amounts, references, the time zone) reads left to right
  as one piece. A glyph standing for several Arabic letters gets them in
  drawing order in the PDF's text map, so readers that copy or search the
  text get them in reading order.
- **What it says** (`lib/receipts/build.ts`, words in
  `lib/receipts/words.ts`): the seller (Yallapp's name, "Cairo, Egypt", the
  website and the contact details of Admin › Settings, plus the lines the
  team writes in Settings › Invoices, the `invoice` platform setting; a
  business's app name, support email and WhatsApp), the buyer, the number
  (`YA-…`, the order's, `D-…`), the date and time in the app's time zone
  (`appZone`), the items, subtotal, shipping or delivery fee, a coupon, the
  total, refunds and the status, the provider and its reference, and the
  dollar price a client saw. Amounts are written as on the dashboard
  (`formatAmount` for Yallapp's prices, `formatCents` for a business's). No
  tax lines and no registration details that aren't set. Yallapp's receipts
  follow the client's language (`users.language`; the dashboard's language
  for its own download); a business's follow the `lang` asked for when the
  app has it, else the app's main language (a customer's own language isn't
  kept with an order).
- **Who may download** (`lib/receipts/service.ts`, each answer
  `application/pdf`, `attachment`, `private, no-store`): the dashboard's
  `/dashboard/license/receipts/<id>/pdf` gives only the account's own paid
  payments to whoever may see billing (owner-only, as the License page);
  the admin's `/admin/payments/<id>/pdf` and
  `/admin/payments/orders/<app>/<order>/pdf` are for anyone on our team; a
  donation's `/receipts/<code>/pdf` needs its random receipt code, and an
  order's `/receipts/orders/<app>.<order>.<signature>` is signed with an
  HMAC of `SIGNING_SECRET` (`lib/receipts/links.ts`; rotating the secret
  ends the links in earlier emails, the app gets new ones). The hosted API
  gives the links as `Order.receipt_url` and `Donation.receipt_pdf_url`.
- **Emails** (`lib/mail.ts`, `lib/email/app-mail.ts`): messages carry
  attachments through Yallapp's server and an app's own. The activation
  and renewal emails, "Storage pack added", the donation receipt and the
  customer's new "Order receipt" (`sendOrderReceipt`, after the owner's
  "New order") attach the PDF; `receiptAttachment` logs why a PDF couldn't
  be made and the email goes without it. End-to-end runs keep attachments
  in `YALLAPP_MAIL_DIR` as base64.

## Two-step sign-in and sessions (Phase 70)

- **Sessions on the server.** The `yallapp_session` cookie (sealed, 14 days)
  carries the user, their session version and a random session ID; only the
  ID's SHA-256 is stored (`user_sessions`). Every request needs both the row
  and the same session version (`getCurrentUser`). Signing out deletes the
  row, so a copy of the cookie stops working; "Sign out of all devices"
  (Your account) deletes every row of the person, bumps the session version
  and deletes their Yallapp Business devices; a password reset bumps the
  version and deletes the rows; removing someone from a client's team bumps
  the version as before. The daily job deletes expired rows. Cookies made
  before Phase 70 have no session ID and sign in again.
- **Two-step sign-in** (`lib/auth/totp.ts`, `lib/auth/two-step.ts`): TOTP
  (RFC 6238, HMAC-SHA1, 30 seconds, 6 digits, one step either side). The
  secret is 20 random bytes, encrypted with `ENCRYPTION_KEY` and the context
  `two-step:<user id>` (`user_two_factor`), shown once as a QR code drawn on
  the server (`lib/qr.ts`; the `otpauth://` address never leaves our pages)
  and as base32 text. A setup waits (`enabled_at` null) until a first right
  code. `last_step` is claimed by a conditional update, so each code works
  once and never an older one; 10 recovery codes (`user_recovery_codes`,
  SHA-256 with the user ID) work once each. Codes count per person, 8 in 15
  minutes (`two-step:user`), besides the sign-in limits per email and IP.
  Turning it off needs the password and a code; our team can only reset
  someone's (Admin › Team, owners, audit-logged, emailed).
- **Every way in** goes through `afterPassword` (`lib/auth/sign-in.ts`): the
  sign-in page, a password reset and a team invitation. Someone with
  two-step sign-in gets a sealed 10-minute step (`yallapp_two_step`, the user,
  their session version and where to go next) and the code page
  (`/sign-in/code` in each language, noindex); the session starts only after
  the code. The Owner API's `POST /auth/sign-in` takes the code as `otp`
  (`two_factor_required`, `invalid_two_factor_code`; `owner.yaml`).
- **The team's rule** (`platform_settings.security.requireTeamTwoStep`, Admin ›
  Team): `requireAdmin` sends anyone on the team without two-step sign-in to
  Admin › Your account (the only page that lets them through), and
  `getClientContext` gives them no client's dashboard.
- **Safe fetches** (`lib/net/safe-fetch.ts`): the address checks
  (`isPrivateAddress`, `privateHostProblem`) are in `lib/net/addresses.ts`.
  Calls to addresses clients give use undici's `fetch` with an `Agent` whose
  `connect.lookup` resolves the name once, refuses it when any answer is
  private or reserved, and hands `net.connect` exactly the checked addresses
  (TLS still checks the certificate against the name). An IP written in the
  URL is checked before the call, since Node connects to it without a lookup.
  Redirects are followed by hand (each address checked again, at most 5),
  refused with `redirect: "error"`, or given back with `"manual"`. Call sites
  keep their own check first for the owner's message, and take
  `pinnedFetch(fetcher, resolve)`: a test's fake fetch, else the safe one with
  the same resolver. undici is loaded on first use, after Node's own fetch
  has claimed the global dispatcher, so every other request keeps Node's.
- **Coupon limits:** `claimCouponRedemption` locks the coupon's row
  (`SELECT … FOR UPDATE`), counts its uses that hold a place (redeemed, or
  pending for less than an hour) in all and for the client, and saves the
  use with its payment in the same transaction, or nothing.

## Two support numbers, no marketplace, the video sites' own players and analytics kept by plan (Phase 72)

- **Two WhatsApp numbers** (`lib/contact-lines.ts`, `lib/contact.ts`). The
  contact setting has `whatsapp` (customers outside Egypt, and wherever the
  country isn't known) and `whatsappEgypt` (a setting saved before has none:
  the default, +20 104 256 0010). Where there's room both show with their
  labels (the footer's contact column, the Contact page, the legal pages'
  `{{contact_whatsapp_egypt}}` and `{{contact_whatsapp}}`, emails'
  `{{yallapp_whatsapp}}`, Yallapp Business's help screen, the JSON-LD
  `contactPoint`s with `areaServed`). Where one fits, the number follows the
  visitor's country as Phase 52 finds it: `getVisitorContact()` on pages
  rendered per request (a signed-in client's account country, then the
  request's), and on pages built ahead of time the `WhatsAppLink` client
  component renders the international number and switches to Egypt's in a
  browser in Cairo's time zone or with an Egyptian language region, so those
  pages stay static. The Owner API's `links.support_whatsapp` follows the
  account's country and `support_whatsapp_egypt` and
  `support_whatsapp_international` carry both. Demo apps keep one support
  number (the international one), as the apps show one.
- **No marketplace.** Yallapp never collects payments for its clients:
  every shop, academy, event, gym or charity takes payments in its own
  provider account. `checkoutAccount` returns only the shop's own account
  and `paymentsSetUp` is false for a shop that had joined (it sells nothing
  until it adds its own keys, and the dashboard tells it so); `startPayment`
  refuses an account marked as a marketplace. The admin's commission,
  provider choice and switch, the join form and its action are gone; the
  `marketplace` and `paymentProvider` settings and the shops' old payment
  settings stay in the database untouched, and orders paid through Yallapp's
  account before are still confirmed, refunded and released as before
  (`accountForOrder`). The terms say each business uses its own payment
  provider account and Yallapp isn't a party to those sales.
- **The video sites' own players by default** (`hidesVideoBranding`,
  `apps.hosted_settings.hideVideoBranding`, no migration): see "Videos on
  video sites" above.
- **Analytics kept by plan** (`lib/analytics/retention.ts`): see "Analytics
  for app owners". The Analytics page, its CSV and the Owner API's analytics
  start no earlier than the first day the app's plan keeps
  (`rangeFrom(…, keptFrom)`); the page says how long the plan keeps them,
  and the pricing page and the dashboard's plan cards show it.

## Start a course again, deleted apps and accounts, dark mode and the account country (Phase 73)

- **Start a course again** (contract: `CourseDetail.can_restart`, `POST
  /courses/{course_id}/restart`, 403 `not_enrolled` and `restart_disabled`).
  The customer app shows, on a finished course whose `can_restart` is true,
  "Review course" beside **Start the course again**; it asks to confirm
  (`confirmAction`), calls the endpoint, drops what the phone still waits to
  send for the course's lessons (`ProgressQueue.forgetLessons`), refreshes
  the course and opens the first lesson (`nextItemToOpen`). Strings in
  English, Arabic and Turkish (and the owner's string packs through the
  overlay). Hosted courses: `Course.canRestart` in `apps.course_setup`
  (missing: on), the checkbox "Students can start this course again" on the
  course's Details; the restart deletes the student's `lesson_progress` rows
  of the course (`deleteLessonProgress`; hosted courses have no quizzes).
  WordPress (plugin 0.4.7): `Lms_Adapter::can_reset_progress` and
  `reset_progress` with each LMS's own API: Tutor LMS
  `Utils::delete_course_progress` (lessons, quiz attempts, the completion,
  assignments through its hook), LearnDash `learndash_delete_course_progress`
  (steps and the course's quizzes), LifterLMS `llms_mark_incomplete` on the
  lessons, sections and course (quiz attempts stay in its history), Sensei
  LMS `Sensei_Utils::reset_course_for_user` (its own "Reset course"),
  LearnPress `UserCourseModel::handle_retake` only while the course's own
  "Retake course" count allows one (it counts one). MasterStudy and
  Masteriyo have no such API, so `can_restart` is false there
  (`Base_Adapter`). `Course_Restart` adds the owner's choice per course (the
  "In the app" box, meta `_yallapp_no_restart`) and forgets what the plugin
  keeps (video positions, watched shares, the completion date). Enrollments,
  orders, reviews and questions stay; a certificate already issued is the
  LMS's to keep or take back.
- **Deleting an app** (`lib/apps/deletion.ts`, roadmap 60.13). Setup's
  danger zone, "Delete this app": the owner only (the `apps` permission;
  a team member and our team managing the dashboard are refused), with the
  app's name as shown and the password (counted with the sign-in attempts).
  `softDeleteApp` sets `apps.deleted_at` and saves an `app_deletions` record
  (no foreign keys; `open_app_id` unique while it waits) in one
  transaction. From then on the store leaves the app and its license out of
  every read (`liveApp()`, `liveLicense()` in MySQL; the memory store moves
  it aside): the hosted API answers 404, the license API
  `license_not_found` (and the WordPress site is asked to check at once,
  `refreshSiteOf` with the license read before), the Owner API and the
  dashboard forget it, a queued build is closed ("The app was deleted
  before this build started.", without an email), scheduled notifications
  are cancelled, the media sweep leaves its folder alone. Admin › Deleted
  apps (`clients.suspend`, audit-logged) restores it as it was within
  `APP_RESTORE_DAYS` (7) or deletes it now; the daily job
  (`runAppPurges`) purges it after them: its Media folder and rows
  (`deleteAppMedia`; a media server that doesn't answer stops the purge and
  it is tried again), its build folders on the files host
  (`lib/apps/build-files.ts`: `DELETE /builds/<id>/` signed over "DELETE
  <path>?expires=…", which `build/files-host/index.php` answers with 204;
  folders it doesn't confirm stay on the record as `pending_builds` and are
  tried again daily), the uploads only this app named
  (`listAppAssetReferences`: its row, pages, products, articles, listings,
  events, campaigns and settings) from Netlify Blobs, then its row: every
  table hanging from it goes by `on delete cascade`, and `plan_payments`
  keep their rows with `app_id` null (`set null`).
- **Deleting an account** (`lib/account/purge.ts`, 66.7). The daily job
  carries out a request `DELETION_WAIT_DAYS` (7) after it was made (the
  owner can cancel until then; the dashboard says the date), and Admin ›
  Account deletion's **Delete now** at once. In order: every paid plan
  payment is copied to `kept_billing_records` (no foreign keys) with the
  buyer's name, email, WhatsApp and country, the payment row, its coupon
  and the receipt document as `planReceiptDocument` made it (the admin
  makes its PDF again: `/admin/payments/kept/<id>/pdf`); each app's files
  are deleted as above and the account's uploads (`assets`); every app gets
  a purged `app_deletions` record (reason `account`); then
  `deleteUserAccount` deletes the owner's `users` row, and the client, its
  apps, licenses, builds, payments, coupon uses, team, sessions
  (`user_sessions`), two-step data, phones and content go with it by
  cascade. Team members keep their own users. The request is marked done
  and `account_deletion_done` is emailed in the language they asked in.
  The MySQL test (`phase73-mysql.test.ts`) checks that the payments go
  with the client while their kept records stay, and that another account
  is untouched.
- **Dark mode** (`globals.css`, `components/theme-switch.tsx`,
  `components/theme-script.tsx`). Yallapp's own pages mark themselves with
  `data-site-theme` (the website's header, the sign-in pages' shell, the
  dashboard and the admin); a business's pages for its customers don't.
  The `yallapp-dark` custom variant swaps the brand tokens on `<html>` when
  the system prefers dark and the visitor didn't choose light, or when they
  chose dark (`data-theme`); `in-dark` does the same for what is inside
  (`.on-dark` bands keep their dark colors, the third-party marks their
  dark color, `.theme-dark-only` shows the reversed logo). The switch is a
  toggle button, "Dark mode" (Arabic "الوضع الداكن", Turkish "Koyu mod"),
  pressed while the page is dark; it stores `yallapp-theme` in
  `localStorage`, and a few lines in `<head>` set `data-theme` before the
  page paints, so nothing flashes. The tokens' contrast is Phase 41's.
- **The account's country** (`lib/account/country.ts`, 52.9). Dashboard ›
  Your account › Your country (the owner, or our team managing the
  dashboard; a team member sees it), the admin's client details, and a
  line on the License page ("Prices for Egypt", or for where they are when
  it isn't set). Countries are the ISO codes `libphonenumber-js` knows,
  named in the dashboard's language with `Intl.DisplayNames`. It feeds
  `priceView` (pounds or dollars), `getVisitorContact` (the WhatsApp number)
  and the receipts' time zone, as before.

## The license key belongs to WordPress apps (Phase 75)

Every app has a license (its plan, end date and key), but only the plugin
uses the key. `lib/license/site.ts` (`licenseUsesSite`) says whether the
license's app may use it on a site: an app on WordPress, one waiting for the
site our team sets up (`setup_requested`), or a license whose app doesn't
exist yet. For every other app (the hosted API with or without a store
platform, its own API):

- `POST /licenses/activate` answers 403 `license_not_for_site`, so the key
  can't put Yallapp's sign-in codes, media server or page layouts behind a
  site the plan isn't for;
- a site activated before the app left WordPress gets `status: invalid` on
  its next check, 403 `license_inactive` for layouts, media links and
  sign-in codes, and no plugin updates. Moving the app back to WordPress
  makes the same activation work again;
- the dashboard page is **Plan** (not License & plugin) and shows no key;
  its notices don't mention the key or the plugin;
- the activation email is `app_activated` (English, Arabic, Turkish): the
  app, plan and end date and the next step, without the key. The admin's
  "Email the license key again" sends that one for these apps.

## Invoices and bank transfers (Phase 95)

- **Admin › Invoices** lists the paid plan payments (`listPlanPayments`
  with `status: "paid"`), newest first: the invoice number (`YA-…`), the
  client and app, what it paid for, the amount, how it was paid (by card
  through a gateway, covered by a coupon, or a bank transfer) and the PDF
  the client got (`/admin/payments/<id>/pdf`), with filters by how it was
  paid.
- **Bank transfers.** The team finds the client by email and records a
  transfer that has arrived: the app (or the account's first app, not made
  yet), the plan, one month or one year, the amount and currency, and the
  bank's reference. `recordBankTransfer` (lib/billing/bank-transfer.ts)
  stores a paid `plan_payments` row with `method = 'bank_transfer'`,
  `bank_reference` and `recorded_by` (migration `0085`), then activates or
  extends the app's license exactly as a card payment does
  (`planChangeFor`, `activateClient`): an upgrade starts now with the old
  plan's days credited, a downgrade when the paid period ends. The client
  gets the activation or renewal email with the invoice as a PDF
  (`sendPlanPaidMail`), and finds it on their Plan page; the receipt, the
  PDF and the email say "Bank transfer to Yallapp" with the reference, in
  the client's language. It needs the `payments.manage` permission and is
  in the audit log (`payments.bank_transfer`). There are no unpaid
  invoices: a transfer is recorded once the money is in the account.

## The plugin and WordPress.org (Phase 76)

0.4.8 was made ready for WordPress.org's plugin guidelines (slug `yallapp`,
contributor `yallapp`). Its review asked for every local feature to work
without a paid plan; the owner chose to keep the plugin paused without an
active plan (68) and not to list it there (2026-10-26). What stays from
that work:

- **Updates from Yallapp (76.6).** `License_Client` adds a newer release to
  WordPress's update list (`pre_set_site_transient_update_plugins`) and to
  "View version details" (`plugins_api`) from `GET /api/v1/plugin/update`
  (Admin › Plugin releases), only while the plan is active: the platform
  answers 204 otherwise and the plugin doesn't ask. The answer is cached for
  12 hours (`yallapp_release`) and dropped with every license check. 0.4.8
  to 0.4.17 had no updater, so those sites install 0.4.18 by hand once.
- **Headers and readme.** The Plugin URI (`/docs/wordpress-plugin`) and the
  Author URI (`yallapp.com.tr`) differ; the readme says a Yallapp account is
  required and lists every external service under "External services":
  Yallapp (what each call sends and when), Firebase Cloud Messaging and
  Huawei Push Kit (only when their keys are set), with their terms and
  privacy links.
- **Plugin Check.** `bin/plugin-check.sh` builds the zip, installs it on a
  dev site with WordPress.org's Plugin Check (2.1.0, from GitHub) and fails
  on any error or warning, leaving out only its check against updaters; CI
  runs it on every plugin change ("Plugin Check (WordPress.org)"). Queries
  on the LMS's, shop's and booking plugin's own tables name those tables
  from `$wpdb->prefix`, which the ignores say.

## Chat in the app (Phase 77)

On the Pro and Business plans (the `chat` plan feature) the people using an
app write to the business, and in academies with course groups each
course has a group. People never write to each other in private: there are
only `direct` conversations (a person and the business) and `group` ones
(a course). The chat lives on Yallapp's hosted API for every app, whatever
runs the rest of it.

- **Data.** Migration `0052_chat.sql`: `chat_members` (a person of an app,
  from the hosted API's users or a WordPress site's), `chat_conversations`
  (`keep_until`, the business's read mark), `chat_participants`,
  `chat_messages` (increasing IDs, `client_id` for safe retries, the team
  member behind a business answer), reports, blocks, uploads and the
  WordPress chat sessions; `apps.chat_settings` (on, course groups) and
  `media_files.source` (`chat` files show in Media as "From the chat" and
  count in the app's storage). Memory and MySQL stores share one suite.
- **Who and how** (`lib/chat/access.ts`). `Config.chat` (`base_url`,
  `session`, `groups`) when the plan has chat and it's on. Hosted apps and
  own APIs with Yallapp sign-in use the app's access token (`session:
  access_token`); WordPress apps (`session: site`) ask their site for an
  hour's chat token (`POST /chat/session`, plugin 0.4.9), which the plugin
  gets from `POST /api/v1/chat/sessions` with the person's user ID, name,
  picture and courses. Own APIs that sign people in themselves have no chat.
- **The app's routes** (`lib/chat/service.ts`, `hosted.ts`, the Chat tag of
  openapi.yaml): conversations (the direct one made on the first call; a
  student joins the groups of their courses there), unread, messages
  (`after` to poll, `before` for older pages, `poll_after_seconds` 3 to 15),
  send, read, members, delete one's own, report, block (for oneself), and
  uploads through the media gate's chunked protocol (gate 3: voice
  messages and documents). Rate limits on sends, reports and uploads.
- **Pushes** (`lib/chat/push.ts`). A new message reaches the people in the
  conversation (the person, or a group's members but the sender and those
  who blocked them): hosted apps from Yallapp with the app's Firebase
  account; WordPress sites by a signed `POST /chat/notify` (HMAC of
  `yallapp-chat-notify:<ts>:<sha256 of the notification>` with the license
  key), as the site keeps the push tokens. The business's phones get
  `new_chat_message` (Yallapp Business, the Chat area) when a person wrote.
- **The business's side** (`lib/chat/owner.ts`): the dashboard's Chat page
  (77.3) and the Owner API's `/apps/{app_id}/chat/...` (77.6,
  `lib/owner/chat.ts`) call the same functions: the inbox with unread,
  open reports and what expires soon, answers as the business (with a Media
  file), deleting a message or a whole conversation, keeping a conversation
  another year, reports (keep, delete, delete and stop the sender),
  stopping a person from sending, and the settings (Settings to change).
  404 `not_available` without chat or without the Chat area.
- **Retention** (`lib/chat/retention.ts`, the daily job). Messages and
  files go a year after they're sent unless the conversation is kept;
  30 days before, the business gets the `chat_expiring` notice (dashboard,
  email, phone), once per app per 30 days. Deleting an account (hosted
  `DELETE /me`, or the plugin's `delete_user` hook) deletes the person's
  chat.
- **The customer app** (`mobile/lib/modules/chat`, 77.5): the Chat tab
  before Account when the tabs leave room, else a row in Account; polling
  while a conversation is open and in front, `chat` pushes open it; photos,
  videos, voice messages (AAC in m4a) and documents checked for type and
  size, then sent in chunks; reports, blocking in groups.
- **Yallapp Business** (`business/lib/features/chat`, 77.6): the Chat tab
  after the app's main tool (Stats moves to More when the bar is full), the
  inbox with reports and expiring notices, a conversation with polling and
  replies with a Media file, reports, the settings sheet.
- **Terms.** The terms of service say the business is responsible for its
  app's chat (as the App Store and Google Play ask of apps where people
  write to each other); the privacy policy says what the chat keeps.

## In-app purchases through the stores (Phase 100)

Courses and memberships are bought in the app through Google Play Billing
and the App Store's In-App Purchase (docs/api/openapi.yaml, the Store
billing tag), on every plan but Starter (plan feature `store_billing`).
Code in `lib/store-billing`.

100.2 Store products. `store_products` keeps one row per paid course
(`course_<id>`, a one-time product) and membership plan (`plan_<site id>`,
a monthly or yearly subscription) with the same product ID in both stores.
They come from the dashboard's courses (`reconcileHostedCourses`, read
when the page opens and before each sync) or from the plugin's
`POST /api/v1/billing/catalog` (`catalog.ts`); `reconcileProducts` adds
new ones, changes their title, price or courses, and stops the ones no
longer sent. Products are never deleted (the stores never give an ID back,
and buyers keep what they bought). The owner may set a product's own price
on Dashboard › In-app purchases (`ownPrice`; empty: the site's).

The products are made in the owner's own Google Play and App Store
accounts with the keys of the Publishing step (`sync.ts`), by the frequent
job (`runStoreProductSync`, apps whose owner turned it on) and by "Update
the stores now", ten per store per run. Google (`google.ts`, the Android
Publisher API's `monetization.onetimeproducts` and
`monetization.subscriptions`): Google converts the price to every region
(`convertRegionPrices`) and the regions that use the site's currency keep
the site's price exactly; listings are in the app's default language in
Play. Apple (`apple.ts`, App Store Connect API): the nearest price point
in the currency's territory (one manual price for a one-time product,
which Apple equalizes; each territory's equalization for a subscription),
the English text on a product version, availability everywhere; all
memberships share one subscription group ("Memberships"). The first sync
(or "Check") finds the app in App Store Connect and points its App Store
Server Notifications (V2, production and sandbox) at
`/api/v1/billing/notifications/apple/<app id>`. Each store's result
(`synced`, `failed` with its code, `stopped`) is kept on the product; a
failed product is tried again after an hour; a refused key stops that
store's run and shows on the page. Stopping a product deactivates its
purchase option or base plan in Play and removes its territories in App
Store Connect. Signed data from Apple (transactions, notifications) is
checked offline against Apple Root CA - G3 (`apple-root.ts`); Google's
Pub/Sub pushes by their OIDC token (`verifyPubSubPush`). Apple reviews new
in-app purchases with the next version sent for review.

## Notification campaigns (Phase 85)

### Audiences (85.1)

`lib/hosted/audiences.ts`. A campaign goes to everyone, or to the people
the app knows something about: who paid for an order (`catalog_orders`
with `paid_at`), the students of one course or of any
(`course_enrollments`), members whose membership is active now
(`memberships`), or people none of whose phones opened the app for 7 to
90 days (`hosted_devices.last_seen_at`, refreshed at sign-in and at each
token refresh; the sign-up date for someone without a phone). The kinds
offered follow the app (`audienceKinds`, from `lib/app/areas.ts`).

It can be narrowed by the language the app shows on the phone, the
phone's platform and its country. A person matches when one of their
phones does; a phone that never said (an app from before 85.1) matches no
narrowing. The app sends its language with `PUT /me/push-token` (again
when the person changes it); the country comes from the request
(`lib/geo.ts`, the IP itself is never kept) at sign-in, token refresh and
push registration. Both are on `hosted_devices` (migration
`0064_device_language_country`). Everyone, not narrowed, is still one
notification to the whole app (`resolveAudience` answers `null`).

### Campaigns (85.2)

`lib/hosted/campaigns.ts`, Dashboard › App notifications › Campaigns
(`/dashboard/notifications/campaigns`). A campaign is a title and message,
a picture (from the Media library made public, or Yallapp's pictures: only
addresses on Yallapp's own domain), what it opens (nothing, a page of the
app as a Links-format link `<base>/page/<slug>`, or another `https`
address, which the app opens in the browser) and an audience (85.1). It is
kept as a draft, sent now, at a date and time, or every week on a day and
time in the app's time zone (`notification_campaigns`, migration
`0065_notification_campaigns`; `repeats` and `local_time` avoid MySQL's
reserved words).

Each send is `announce()` with the audience: one `hosted_notifications`
row, to everyone (as before) or `targeted` with its people in
`notice_recipients` (the inbox query adds those), and a push to their
phones that allow announcements, with `link` and `image_url` in the data
(FCM `notification.image`, Push Kit `android.notification.image`; iPhones
show the picture in the inbox). `campaign_sends` keeps each send's people,
phones reached and missed (targets minus accepted); opens are the app's
`push_open` analytics by notification ID, counted each night. Sends count
in the hourly limit of 10 with the app's other notifications; nothing goes
out once the plan has ended (68). The frequent job sends the due ones,
each taken by one run (a conditional update); a weekly one is set to the
next week's time after each send, waits when the hour's limit is used,
and skips a week with nobody in its audience. Notifications "sent to
everyone" (the dashboard's Sent list and the Owner API) leave targeted
ones out.

### Automatic notifications (85.3)

`lib/hosted/auto-notifications.ts`, hosted apps only (WordPress apps send
theirs from the plugin). The kinds an app has follow its areas
(`autoKindsFor`): `new_lesson` and `study_reminder` (courses),
`appointment_confirmed` and `appointment_reminder` (bookings), `class_soon`
and `membership_ending` (gyms), `event_soon` (events), `cart_left`
(shops). A new lesson is told when it is saved (courses actions); an
appointment confirmed when it goes from waiting to approved (the dashboard
and the Owner API); the others by the frequent job: an appointment in the
next 1–24 hours, a class in the next 2, an event in the next 24, a
membership ending in the next 3 days, the study reminder from 19:00 to
21:00 in the app's time zone to students one of whose phones turned it on,
and a cart with items unchanged for 3 hours (up to a week). The app says
how many items its cart holds with `PUT /me/cart` (`hosted_carts`);
nothing else of the cart leaves the phone.

Each goes once per person and what it is about (`auto_notices`, its key
taken by an insert, migration `0066_auto_notifications`; a renewed
membership or a cart changed after its reminder is a new one), in the
language of the person's phone when it is English, Arabic or Turkish (else
the app's), to their inbox (`hosted_notifications.data` keeps its type and
ids for the app) and to their phones that allow it (`new_lessons`,
`daily_reminder`, `announcements`). Pushes carry `type` = the kind and no
`notification_id`, so the app's opens count by kind (`push_open`
`type:<kind>`); people and phones are counted per day (`auto_sent`,
`auto_pushed`). The owner turns each off on App notifications
(`HostedSettings.autoNotifications`). They aren't in the hourly limit of
the notifications the owner sends, and stop when the plan ends.

### WordPress apps' campaigns (85.4)

A WordPress site keeps its people's push tokens, so a campaign of a
WordPress app goes through it (`lib/license/campaign-site.ts`): the platform
makes the send's row first (`campaign_sends`, its ID is the `send_id`), then
signs `POST <site>/wp-json/yallapp/v1/campaigns/send` like the chat's
notify (`yallapp-campaign:<timestamp>:<sha256 of the campaign JSON>`,
keyed with the license key). The plugin (0.4.12) puts it in everyone's
inbox (`link` and `image_url` columns, DB version 5), queues the pushes in
cron batches (`yallapp_campaign_send`) and keeps an option per send, so the
same `send_id` twice is sent once; after the last batch it calls
`POST /api/v1/campaigns/report` with the phones reached and missed, which
the platform saves once (`reported_at`, migration
`0067_campaign_reports`). Until then the dashboard says the site is still
sending. A site that can't be reached, or a plugin from before 0.4.12 (404),
leaves the campaign a draft (sent now) or failed (sent later; a weekly one
tries the next week), and the send's row is removed. WordPress campaigns go
to everyone (the platform doesn't know the site's people); a page of the
app opens on the site's links (`<site>/a/page/<slug>`).

## Shops, complete (Phase 91)

- **Coupons and the cart's total** (91.1, `lib/catalog/coupons.ts`):
  `catalog_coupons` (migration 0079, a code once per app) holds a percentage
  or an amount off the products, with an optional minimum order, last day
  and number of uses; `catalog_orders.coupon_code` and `discount_cents` keep
  what an order used. `POST /store/cart` takes `coupon` and answers the
  coupon's status, the discount, shipping, taxes and `total`, with
  `total_final` false when the checkout still adds to it (a restaurant's
  delivery, a connected platform's shipping). The payment page charges the
  total less the discount, spread over the lines for the providers
  (`spreadDiscount`); a paid order counts one use in one statement
  (`used_count < max_uses`), so the last use goes once. WooCommerce sites
  check the code with WooCommerce's own rules (`Store\Coupon_Quote`;
  coupons limited to products, emails or uses per customer say
  `at_checkout`) and the checkout link applies it to the cart. Connected
  platforms answer `at_checkout`; Shopify carries the code in `cartCreate`'s
  `discountCodes`.
- **Order updates** (91.2): an `order_update` notification (with `order_id`,
  which opens the order) that phones can turn off (`orders` preference).
  Shops without a website send it when an order is completed or cancelled
  (the automatic kind `order_update`, `notifyOrderUpdate`, which the owner can
  turn off) and, as before, when it's shipped (`shipOrder`). The plugin
  (`Commerce\Order_Updates`, 0.4.16) sends it from WooCommerce: tracking
  added with WooCommerce Shipment Tracking or Advanced Shipment Tracking
  (`_wc_shipment_tracking_items`, `Commerce\Order_Tracking`, also the order's
  `shipment`; each shipment once, remembered in `_yallapp_shipment_told`),
  and completed, cancelled or refunded. Its inbox keeps `order_id`
  (database version 6). Shops on Shopify and the other connected platforms
  (`lib/hosted/order-watch.ts`): a checkout from the app starts a 30-day
  watch of the person's orders (`hosted_order_watches`, migration 0080); the
  frequent job looks at the due ones every 15 minutes through the connector's
  `GET /me/orders` and tells an order shipped (its tracking appeared or
  changed), completed, cancelled or refunded since the last look, once
  (`auto_notices`); the first look only notes what's there. Shopify's orders
  carry the newest fulfillment's tracking as `shipment`. `GET /me/orders/{id}`
  on a connector without one answers from its order list.
- **Returns** (91.3): `StoreConfig.returns` ({enabled, days}, null for none)
  and `POST /me/orders/{id}/return` ({reason, note}; the note is needed with
  `other`). An order can be returned (`can_return`) when it's completed, has
  something to send back (not only downloads; never a restaurant's), has no
  request yet, and was completed within the shop's days; it carries its
  `return_request` (requested, approved or declined, with the shop's reply).
  Shops without a website: `catalog.returnDays` (Shop settings),
  `catalog_orders.return_request` (migration 0081), `lib/catalog/returns.ts`;
  the owner gets a Yallapp Business push and answers on Dashboard › Orders
  (`decideReturnAction`, the `orders` permission), which tells the customer
  (`notifyReturnDecision`, sent even with order updates off). The plugin
  (`Commerce\Order_Returns`, 0.4.17): `store_return_days`, the request in the
  order's `_yallapp_return` meta with an order note and an email to the
  site's admin, the answer on the order's screen
  (`woocommerce_process_shop_order_meta`), then an `order_update` to the
  customer. Connected platforms take returns on their own sites: their orders
  never say `can_return`. Refunds stay where they were (Refund, WooCommerce).
- **Loyalty points** (91.4), shops without a website, the plan feature
  `loyalty` (every plan but Starter; a saved plan edit gains a feature added
  after it, `knownFeatures`, until the team saves the plan again).
  `catalog.loyalty` {spendPerPointCents, pointValueCents, minPoints} from
  Products › Loyalty points; `StoreConfig.loyalty`. `lib/catalog/loyalty.ts`:
  `loyalty_balances` (one row per customer, changed in a transaction that
  locks it, never below 0) and `loyalty_entries` (the history), migration
  0082; `catalog_orders.points` {used, discountCents, earned, givenBack,
  takenBack}. The cart (`use_points`) takes as many as the customer has, up
  to the products after the coupon less a cent per line (each line keeps a
  cent for the providers); the checkout records them on the order and the
  payment spends them (`deliverPaidOrder`). Completed (`changeOrderStatus`,
  also the kitchen's): earns `floor((total - shipping) / spend)`, once.
  Cancelled after paying: gives back the used points; refunded in full:
  gives them back and takes back the earned ones; a return approved takes
  back the earned ones. `GET /me/points` (balance, value, latest 50
  changes). The payment page, the owner's email and the receipt show the
  points' line. The plugin and connected platforms have no points
  (`store.loyalty` missing).
- **Variations and tax** (91.5), shops without a website.
  `catalog_products.variants` {attributes: up to 3 {name, values}, items:
  up to 100 {id, values, priceCents, salePriceCents, stock, sku, active}}
  from the product's Variations editor (`parseVariants`, not for
  restaurants, which keep option groups). `lib/catalog/variants.ts`: the
  connector answers like a WooCommerce variable product: `type: variable`,
  a price range, attributes `a1`–`a3` and the variations (null price: the
  product's; stock: the variation's and the product's, the lower). The cart
  needs `variation_id`, prices it and caps it by its stock; the order line
  keeps `variantId` and `variant`, and `payCatalogOrder` takes the
  variation's stock down in the same transaction (the product's row
  locked). `catalog.tax` {label, rateBps, included} from Shop settings
  (`lib/catalog/tax.ts`): included, the totals stay and the quote's
  `tax_included` says how much is tax (base × r / (1 + r)); added, the
  products after coupon and points plus shipping × r go on the total
  (`tax`), and the payment gets a "tax" line. `catalog_orders.tax` {label,
  rateBps, included, cents}, migration 0083; the pay page, receipt,
  owner's email and Orders page show it. `Cart.tax_label`, `tax_included`.
- **Your first app** (93.1): `lib/app/first-app.ts` `firstAppGuide()`
  turns the setup steps (`stepStatus`), the license state, the builds, the
  88.1 readiness (once the owner chose who publishes) and the publishing
  request's tracks into nine steps (done, next, waiting, to do) with their
  links. The overview shows it instead of the setup card until a store
  shows the app or the owner hides it (`apps.guide_hidden_at`, migration
  0084, `setGuideAction`).
- **Help and search** (93.2): `lib/docs/help.ts` `DASHBOARD_HELP` names the
  article for each part of the dashboard (the longest address prefix wins,
  `help-match.ts`); the layout's `PageHelp` links to it in the dashboard's
  language, in a new tab. `/docs/search?q=` (and `/ar`, `/tr`) searches the
  articles' titles, descriptions and text with the team's edits
  (`lib/docs/search.ts`: every word, without accents or Arabic marks,
  titles first, the text around the words), not indexed; Enter in the
  docs' menu goes there. Nine articles joined (Integrations, builds and
  connections, Ready to submit, Team, two-step sign-in and deleting an app,
  Protection, Stability, Yallapp Business, links that open the app), the
  Arabic and Turkish in `content/{ar,tr}/docs-8.ts`.
- **Needs your attention** (93.3): `lib/app/problems.ts` `problemsOf()`
  gathers what needs the owner now: a connection in `problem` (80), the
  latest build failed or stalled, a store's rejection (88.3), what Ready to
  submit still misses (88.1, once the owner chose who publishes) and fewer
  than 99% crash-free sessions over at least 100 (46). `problems-load.ts`
  `appProblems()` reads it once per request (React `cache`); the overview
  lists each with Fix it and the menu shows the count on Overview (the
  nav item's `badge`), for whoever may change settings.
- **What you pay for** (94.1): `lib/billing/usage.ts` `planUsage()` (app
  users on the hosted API, languages of the published layout, Media storage
  from `appStorage` with its packs; `usageLevel` near at 80%, full at the
  limit). The Plan page's `UsageSection` shows them with the plan's price
  (`planPrice` in the client's currency), analytics kept, the features
  included and the lowest plan with each other one, and the account's apps
  with their plans, prices and ends.

## Academies, complete (Phase 90)

- **Without a website** (90.1, `lib/courses/learning.ts`,
  `lib/courses/quizzes.ts`): a section's quizzes follow its lessons in
  `courseSetup` (questions, options and the right answers stay on the
  platform; the owner writes them as text, `Q:`, `*` and `-`). Attempts are in
  `quiz_attempts` (migration 0078): one row per attempt, submitted once,
  scored when exactly a question's right options were chosen, deleted when
  the student starts the course again. Lessons carry files (a Media link
  signed per request, or an https address) and `dripDays`; courses carry
  `accessDays` and `certificate`. A course is finished when every lesson is
  completed and every quiz passed; its certificate is
  `/a/<app>/certificate/<user>-<course>-<HMAC>` (`SIGNING_SECRET`), checked
  against the enrolment and the progress each time it opens, showing the
  student's name only.
- **Progress for the teacher** (90.2, `lib/courses/report.ts`): a course's
  students with their progress, best quiz scores and last activity, from the
  enrolments, lesson progress and submitted attempts; the Students page
  (`/dashboard/courses/<id>/students`) and its CSV file
  (`/api/dashboard/courses/<id>/progress`, the Courses permission).
- **Memberships from the site** (90.3, plugin `Lms\Site_Memberships`): Paid
  Memberships Pro's levels on a course (`pmpro_has_membership_access`) give
  `CourseDetail.membership`; without one the course button is `none`,
  enrolling is `membership_required` and its lessons close (to those who
  can't edit it); members enroll as in a free course. `GET /me/subscriptions`
  lists PMPro levels, WooCommerce Subscriptions still giving access
  (active, on hold, cancelled until the paid period ends) and LearnDash
  groups. The integration suite (`MEMBERSHIPS=1`) runs Paid Memberships Pro
  from GitHub on the Tutor LMS dev site; WooCommerce Subscriptions and
  LearnDash are paid plugins, covered by PHPUnit.

## Updates you can undo (Phase 89)

- **Versions** (89.1, `lib/app/version-policy.ts`): the owner's minimum and
  recommended versions (migration 0076). Every app asks Yallapp on start
  (`GET /api/v1/apps/{id}/version`, platform.yaml, with the analytics key)
  whatever its content comes from, and gets the page of the store it was
  installed from; below the minimum it shows Update required, below the
  recommended version it asks once per version.
- **Staged releases** (89.2, `lib/publishing/rollout.ts`): with "We publish
  for you", the app's choice (migration 0077) goes on each build as
  `release` (pipeline.yaml): the pipeline uploads to Google Play's
  production track for that share and sets Apple's phased release. A status
  report finishing the upload starts `apps.rollout`; the owner continues,
  stops or completes it through the Android Publisher API (a token from the
  service account) and App Store Connect's phased release.
- **Going back** (89.3, `lib/builds/go-back.ts`): a build's settings (from
  its config and listing) and the pages published then (as the draft), then
  the build again as it was; the versions in use from the `version` daily
  statistics.

## Publishing without surprises (Phase 88)

- **Ready to submit** (88.1, `lib/publishing/readiness.ts`): the Publishing
  page checks what the stores ask (review access for the app's sign-in
  methods, a public https privacy page, account deletion, the iPhone purchase
  rule of the app's kind, the listing, the screenshots each store needs).
  Each app has a public account deletion page at `/a/<app>/delete-account`
  for Google Play's Data safety form.
- **Listings in every language** (88.2): the listing step keeps the texts'
  language, the listing in the app's other languages, tablet and iPad
  screenshots and framed screenshots' captions (migration 0074); the build's
  store listing carries them (`StoreListing` in `pipeline.yaml`).
  `build/scripts/store_listing.py` writes fastlane's folders per store locale
  and draws the framed screenshots; `android.sh` and `ios.sh` send them after
  the upload (`play_listing`, `appstore_listing`), never submitting for review.
- **Review status** (88.3, `lib/publishing/review.ts`): the frequent job reads
  the newest App Store version's state (App Store Connect, the client's key,
  an ES256 token) for iPhone versions sent, in review or turned down, every
  half hour per app; a new status goes into the history ("App Store
  Connect") and the client's email. Google Play has no review status in its
  API: the team sets it. A rejection carries one of the common reasons
  (`REJECTION_REASONS`), each explained with what to do and a link, in
  en/ar/tr (migration 0075).

## Builds that explain themselves (Phase 87)

- **Before a build** (87.1, `lib/builds/preflight.ts`): `queueBuild` runs the
  checks when given their inputs (the dashboard and the automatic builds do):
  the icon (1024 × 1024 PNG, no transparency), the Firebase files against the
  package name and bundle ID as they are now, the App Store Connect key (an EC
  `.p8`, key and issuer IDs) and the signing keys. Errors stop the build
  (`reason: "preflight"`); warnings are listed on Builds.
- **Why it failed** (87.2): `android.sh` and `ios.sh` keep their output in
  `build.log`; on a failure or a store upload that didn't work,
  `build/scripts/diagnose.py` writes `failure` (a FailureCode, the stage and the
  end of the output without secrets, tokens, keys, e-mail addresses or paths)
  into `result.json`, and `report.py` sends it (`StatusReport.failure`). The
  build keeps it (migration 0071); `lib/builds/failures.ts` says what happened
  and what to do (known texts, en/ar/tr) on the page and in the email.
- **Rebuild as it was** (87.3): the jobs report `source_commit`; a rebuild
  carries the earlier build's commit as `source_ref` (checked out instead of
  the workflow's commit), its config and listing, with a new version
  (migration 0072).
- **Automatic builds** (87.4, `lib/builds/auto.ts`): a save that a build
  would bring (`buildChanges`: the build config, the listing when publishing
  for the client, newly connected stores) sets `apps.auto_build_due_at` ten
  minutes ahead (migration 0073); later saves move it. The frequent job queues
  the due ones, waits for a running build, and skips the ones a build wouldn't
  change.

## Analytics with the business's numbers (Phase 86)

- **Sales** (86.1, `lib/analytics/sales.ts`): the Analytics range's local
  days as `[from, to)` instants, summed by the database (paid orders less
  refunds, refunds, enrolments, appointments booked, tickets, donations;
  migration 0068 adds the indexes), beside the period before; conversion is
  paid orders over the report's `item_view` events. Only what `appAreas`
  says the app has. WordPress apps read the totals their site sends (86.4).
- **Where people come from** (86.2): the app sends `store` with its first
  `app_open` (Android's installer, an iPhone's receipt) and `link_open` when
  one of its own links (`isAppLink`) opens it, with `source` (`qr` for
  `utm_medium=qr`), `campaign` and `referrer` (`utm_campaign`,
  `utm_source`). Raw events keep them (migration 0069); the nightly count
  writes `install_store`, `link_source`, `utm_campaign` and `utm_source`;
  `sourcesOf` adds opens from notifications and "on their own" (the rest of
  the sessions). Dashboard › Analytics makes the app's link and QR code
  (`/a/<app>/page/home`, the site's links for WordPress) with a campaign name.
- **Notifications' results** (86.3): the automatic ones by kind from
  `auto_sent`, `auto_pushed` and the opens of `type:<kind>`; a WordPress
  campaign's report writes `push_sent` under the site's notification ID.
- **Weekly summary** (86.4, `lib/analytics/weekly.ts`): the daily job, on
  Monday to Wednesday in each app's zone, emails the owner the week before
  (template `weekly_summary`, en/ar/tr), once (`weekly_mail` on the week's
  first day), skipping quiet weeks and apps with `weekly_summary` off
  (migration 0070). WordPress sites send `SiteInfo.sales` with each license
  check (plugin `Site_Sales`, 0.4.13): eight days of WooCommerce totals,
  kept as `site_orders`, `site_revenue`, `site_refunds` and `site_refunded`.

## Milestones (Phase 78)

`client_milestones` (migration 0053, `lib/milestones/record.ts`) keeps when
each client first reached each point on the way to a published, paid app:
`signed_up` (with its source), each setup step (`step_app_type` …
`step_publishing`) and `setup_done`, `first_build`, `build_ready`,
`store_upload` (a build's upload stage done, or the team marking a store
submitted), `store_live`, `paid` (the first plan paid with money: not a
coupon that took the whole price, not storage packs alone) and `renewed`
(each later payment of the same app's plan; `ref` is the payment). One row
per client, kind and `ref` (the app's ID, "" for the account's own): the
first one recorded stays.

They are worked out from the data (`milestonesOf`: the steps' done times,
the builds, the publishing requests and events, the plan payments), so the
accounts from before Phase 78 get theirs too, and then kept as that data
changes: a step saved again keeps its first time, and a deleted app's
milestones stay with the account (no foreign key to the app; the account's
deletion takes them). `noteMilestones` runs where things happen (a step
saved, a build's status changed, a store's status changed in the admin, a
plan paid) and never fails its caller; the daily job runs
`recordAllMilestones` for every account before deleted apps are purged. The
demo apps' account (`lib/demo`) has none.

The sign-up's source (`signed_up.source`): the campaign link's UTM source,
medium and campaign and `from`, the host name of the website that sent the
visitor (never the page), and `from: "demo"` when they looked at the demo
apps. `components/campaign.tsx` keeps them in the page's memory from the
first page opened (`KeepCampaign` in the root layout) to the sign-up form's
hidden fields (`CampaignFields`): no cookie and nothing in the browser's
storage, as the privacy policy promises, so a reload forgets them.
`lib/milestones/source.ts` checks them on the server. Accounts the team
adds in the admin get `from: "team"`.

### Admin › Product (78.2)

`/admin/product` (read only, every team role) shows the milestones as
numbers (`lib/admin/product.ts`, pure functions): sign-ups by month and how
many of each month reached each step by now (setup done, first build, a build
that worked, live in a store, paid, renewed), the median days from the
sign-up to each step (sign-ups of the last 12 months), sign-ups of the last
90 days by source with how many paid, and builds by the month they were
queued (finished, worked, median time from the start, Android and iOS, the
stage the failed ones stopped at). The demo apps aren't counted.

Who had a plan running when can't be worked out later (a license's end date
moves with each renewal), so the daily job saves a snapshot each day
(`product_days`, migration 0054, `lib/admin/product-days.ts`): clients by
state, apps, apps that have been live, and the IDs of the clients with a plan
running. The page compares each month's first and last snapshot: at the
start, new, lost, at the end, and churn (lost over at the start). The
snapshots hold no personal data and stay when an account is deleted.

### Watching (78.3)

`lib/watch` tells the team about problems without anyone looking:

- **Job runs** (`job_runs`, migration 0055, `runs.ts`): the daily, frequent
  and webhook jobs run inside `recordJobRun`, which keeps when each run
  started and finished, whether it went well, its JSON answer (cut to 4,000
  characters) or its error; the build pipeline's `GET /builds/queue` is noted
  as a `pipeline` run. Runs are kept 30 days (the daily job).
- **Alerts** (`team_alerts`, `alerts.ts`, `watch.ts`): one open alert per key
  (`open_key` is unique and cleared when it closes), counted each time it is
  seen again, emailed to the super admins once when it opens (`team_alert`
  template), and closed by the watch when the problem goes or by the team
  ("Done", audited). The frequent job opens them for a build queued over 30
  minutes ago that the pipeline hasn't taken (with what to do, depending on
  `GITHUB_DISPATCH_TOKEN`), a stalled build, a job with no good run for
  longer than expected (daily 26 h, frequent and webhooks 20 minutes, the
  pipeline 8 h; the daily job checks the frequent one), an app whose share of
  crashed sessions today is 5% or more, at least 5 crashed sessions and three
  times its share of the 7 days before (one a day), and scheduled
  notifications that failed (one a day). A push to Yallapp Business that
  fails opens one a day (`OwnerPushDeps.failed`); an app's own push failing
  goes to the bell only (it is usually the app's Firebase key, which its owner
  sees).
- **Health** (`health.ts`): Admin › Watching checks, when it opens, the
  database, the media gate (`/ping`), the files host, SMTP, the owners'
  Firebase key, the pipeline (its tokens and when it last asked for builds)
  and each job's last good run.

The admin menu's **Watching** shows how many alerts are open.

### Errors per app and the client's timeline (78.4)

`app_errors` (migration 0056, `lib/watch/app-errors.ts`) counts what failed
for one client's app: one row per client, app (or none, for the account),
source and code, with how many times, when first and last, and the last
message (never a key, a code sent to someone or a customer's details). Rows
go with their app and account, and the daily job deletes those not seen for
90 days. `noteAppError` never throws. It is called where things fail:

- `platform`: the connected platform's answer of 500 or more to the app
  (`shop_unavailable`, `lms_unavailable`…) and its config failing
  (`lib/hosted/service.ts`);
- `server`: anything unexpected in the hosted API (`unhandled:<first path
  part>`), which now answers a plain JSON 500;
- `wordpress`: the site not taking a license check request, or a chat push;
- `mail` and `whatsapp`: the app's own email server or WhatsApp number
  failing (Yallapp's sent instead); `sign_in`: a code not sent at all;
- `webhook`: a notice to the app's own API not delivered (each try);
- `payment`: a card payment of a shop order or a donation that couldn't start
  or be confirmed with the provider;
- `push`: an announcement's push failing.

Admin › Clients › a client shows **Errors** (per app, how often, last seen)
and a **Timeline** (`lib/admin/timeline.ts`): builds queued and finished,
errors, notices to the owner, plan payments, milestones, store statuses and
the team's changes, newest first.

## Encryption keys (79.2)

Secrets at rest are sealed with AES-256-GCM (`lib/crypto/encryption.ts`) as
`v2.<key id>.<iv>.<tag>.<ciphertext>`, with a context (the record they belong
to) as additional data. The key ID is 8 characters of SHA-256 over the key,
so the key that opens a value is known; values of before 79.2 (`v1.…`, no
ID) are tried with each key. `encryptionKey()` returns `ENCRYPTION_KEY` with
the keys of `ENCRYPTION_KEY_OLD` attached: decrypting opens a value of any of
them, encrypting always uses the current one.

The rekey job (`lib/jobs/rekey.ts`, from the frequent job, a few seconds at a
time) moves every stored value that isn't on the current key. The store lists
the cells holding such values (`listCellsToRekey`: on MySQL every text column
of every table, picked with `REGEXP`, page by page by primary key; on the
memory store every string of every collection), with the row's short strings.
The value's context isn't stored, so it is found among the contexts the
platform uses (`CONTEXT_TEMPLATES`), built from those strings; AES-GCM refuses
a wrong one. The cell is written back only if it didn't change since it was
listed. Progress is kept in the job's runs (`job_runs`, job `rekey`); a pass
that finished for the current keys isn't started again until they change.
Admin › Watching › Encryption keys says where it stands, and when
`ENCRYPTION_KEY_OLD` can be removed. A new encrypted value must use a context
built by one of `CONTEXT_TEMPLATES` (or one of those already there).

## Isolation between clients (79.3)

Every Owner API path with an app answers only for the signed-in person's own
apps (`handleOwner`: another client's app is 404, as one that doesn't exist),
before the route's own checks. `tests/unit/isolation.test.ts` gives one
client, then another, an app of each kind with one object of each kind the
APIs name, and calls every Owner API path naming an object (from `ROUTES`)
with the other client's objects, on the caller's own app and on theirs, and
every hosted API path naming an object (from `docs/api/openapi.yaml`): with
the other client's IDs on the caller's app, with another customer's things in
the same app, and with another app's token. None may answer 2xx (a customer's
own list, and blocking someone, aside), none may show the other client's data,
and the other client's rows must stay as they were. A path naming an ID the
test has no object for fails it until one is added. `tests/e2e/isolation.spec.ts`
checks the dashboard: another client's app in an email's link
(`/dashboard/open/<app>`) or in the cookie that picks the current app never
opens it.

## Scripts limited by a nonce (69.12)

Every page sends `base-uri 'self'; object-src 'none'; frame-ancestors 'none'`
(`lib/csp.ts`, next.config.ts). The signed-in pages (`/dashboard`, `/admin`)
and the sign-in forms (`/sign-in`, `/sign-up`, `/reset-password`, `/pending`,
`/team/join`, and their `/ar` and `/tr` pages) also limit scripts:
`src/proxy.ts` makes a nonce for each request and sends `script-src 'self'
'nonce-…' 'strict-dynamic' 'sha256-…'` on the request (Next.js reads the nonce
there and puts it on its own scripts) and on the response. The hash is the
theme script's (`components/theme-script.tsx`), the one inline script of ours;
JSON-LD is data and isn't limited. These pages are rendered for each request
anyway; the website's pages stay static, without a nonce. A new inline script
on those pages needs the nonce (`headers().get("content-security-policy")`) or
a hash in `lib/csp-nonce.ts`. `tests/e2e/csp.spec.ts` checks the policy, that
every script carries the nonce, that signing in and the admin run with no
violation, and that a script put into the page's HTML doesn't run.

## Integrations (80.1)

Dashboard › Integrations (`lib/integrations`) lists every connection of the
app in one place: its website or platform, card payments, who sends its
sign-in codes (Yallapp's WhatsApp number and email, or the app's own), Firebase
and Huawei push, and each store's key. Each has a state (connected, needs
attention, not set up, waiting), a reason worded by the dashboard in English,
Arabic and Turkish (`i18n/dashboard/integrations.ts`), a link to where it is
set up and its errors of the last 30 days (`app_errors`, 78.4, matched by
`integrationOfError`). Test asks the other side now without sending anything
to anyone: the website through the same check as the Website step, payment
keys through the provider's check, push by asking Google or Huawei for a
token. The result is kept per connection in `apps.integration_checks`
(migration 0057); a failed last test makes a connected one need attention
until it passes. The senders are tested by sending, on App sign-in; the
stores' keys when a build uploads with them. Every plan has the page: it only
shows what the app already has.

### Checked every day (80.2)

The frequent job (`/api/internal/frequent`) also checks a few apps'
connections each run, for 5 seconds at most (`lib/integrations/schedule.ts`):
the apps whose last check (`apps.integrations_checked_at`, migration 0058) is
a day old or more, never-checked ones first, so every app is checked about
once a day. Only apps whose plan is running are tested: their website or
platform (twice before it counts as down), payment keys, Firebase and Huawei
push. A WordPress site whose plugin hasn't checked in for 3 days needs
attention even when it answers. When a connection that worked (or was never
tested) fails, the owner is told once: a notice on the overview and in the
dashboard's updates (`integration_failed`), an email in their dashboard
language (`integration_failed` template) and their phone. The team gets an
alert in Admin › Watching (`integration:<app>:<key>`), counted while it lasts.
When it works again (on the next day's check, or with Test on Integrations),
both close. A payment provider that can't be reached tells no one. The e2e
tests turn these checks off (`INTEGRATION_CHECKS=off`) because their websites
are made up.

## Retries (80.3)

**Send again.** App sign-in › For your developer has a Send again button on
each failed account deletion notice (`resendWebhook` in
`lib/hosted/api-webhooks.ts`): the notice starts over with its 8 tries and
the same `jti`, the first try at once. Only the app's own failed notices can
be sent again; it counts with the API checks (10 every 10 minutes).

**Payments left pending** (`lib/payments/pending.ts`). A payment is settled
when its provider calls back. When that call never comes (the customer
closed the page, a webhook was lost), the frequent job asks the provider,
through the same settle functions as the callbacks
(`settleOrderRecord`, `settlePlanRecord`, `settleDonationRecord` in
`lib/payments/settle.ts`), so a payment confirmed this way is delivered and
its emails sent once, as if the provider had called back. It looks at
orders, plan payments and donations still pending with a provider
reference (`provider_checked_at`, migration 0059):

- first once the callback had its time: Kashier and Fawaterk after 10
  minutes, iyzico after 45, once its payment page has expired, since
  iyzico's "not paid" is final and fails a plan payment;
- then every hour, while it can still be paid: iyzico 3 hours, Kashier 2
  days, Fawaterk a week (a reference paid at a kiosk);
- 20 at most per run, for 5 seconds at most.

## Shipping (80.4)

Shops without a website ship to any country with any carrier, and need no
carrier account (`lib/catalog/shipping.ts`). On the Orders page, an order
with something physical to ship (not a restaurant's) has a Shipping form: the
carrier's name (any; the form suggests common ones) and at least one of the
tracking link, the tracking number and the waybill (its number, or a link to
it). It is kept on the order (`catalog_orders.shipment`, JSON, migration
0060) and can be changed. Each time it is saved the customer is told: a
notification in the app's inbox, a push to their phones, and the
`order_shipped` email when the order has an email. The app's order (`GET
/me/orders`, `shipment`) shows it and opens the tracking page and the
waybill's link; a shipped order in progress reads "Shipped". Yallapp Business
can set it too (`PUT /apps/{app}/orders/{order}/shipment`, `owner.yaml`). Every
plan with a shop has it.

## Site scan (81.1)

`lib/scan/site-scan.ts` reads a website from its address and proposes what
an app made from it needs (81.3 builds the draft from it; nothing is kept):

- **Name:** `og:site_name`, `application-name`, the manifest, schema.org's
  Organization or WebSite, then the title's first part.
- **Logo:** schema.org's `logo`, then the header's logo image (WordPress's
  `custom-logo`, Shopify's `header__heading-logo`, any image named logo but
  not payment or partner logos).
- **Icon:** the manifest's largest icon (192 px or more), then
  `apple-touch-icon`, then the largest `icon`.
- **Colours:** the theme colour, the manifest's, the stylesheets' named
  brand colours (`--wp--preset--color--primary`, `--color-primary`, Shopify's
  and Wix's `r, g, b` variables), then the most used; greys, white and black
  are left out.
- **Fonts:** Google Fonts links, `@font-face`, `font-family` and the themes'
  font variables. 97.1 The site's first font that is a free font (any Google
  font) is the app's; a font that isn't (Helvetica, a paid font) is matched
  to the closest of the app's six fonts (Helvetica → Manrope…).
- **Platform:** WordPress with its plugins (WooCommerce, the LMS and
  booking plugins, The Events Calendar, GiveWP), Shopify, Salla, Zid, ikas,
  Ticimax, IdeaSoft, Wix, Teachable, Thinkific, SimplyBook, Squarespace,
  Webflow.
- **App type:** from the plugins and platform first, then the page's words
  in English, Arabic and Turkish (a restaurant, a clinic, a gym, a charity,
  courses, events, real estate, a shop; else news).

It reads the home page (1.5 MB at most), the web app manifest and up to two
of the site's own stylesheets (400 KB each), 8 seconds each, all through the
safe fetch (public addresses only, redirects checked). Saved home pages of
each platform are its tests (`tests/unit/fixtures/sites`).

### The site's look from the plugin (81.2)

On WordPress the plugin says what the site looks like (`Site_Brand`, plugin
0.4.10) with every license activation and check (`SiteInfo.brand` in
`docs/api/platform.yaml`):

- the site's title and tagline;
- the custom logo and the site icon (512 px);
- the theme's colours: theme.json's palette, the site's own (custom, then
  the theme's), with the brand slugs (primary, brand, accent, secondary…)
  first and greys left out, six at most;
- its menus by location, two levels deep: three menus of 30 items, with 15
  children each.

The platform keeps it to the contract's limits (`parseSiteBrand`) and stores
it on the app (`hostedSettings.siteBrand`) only when it changed, with the
site's link paths (`saveSiteReport`). A draft app from the website (81.3)
comes before the plugin is installed, so it reads the site itself.

### A draft app from the website (81.3)

A new app (the account's first, or "Add an app") can start from the
website's address: Choose app type › "Start from your website"
(`startFromWebsiteAction`). The site scan (81.1, with the site's main menu:
the links of its main `<nav>`, or the header's, its own pages only, without
its home, cart, sign-in or the same page twice, eight at most) becomes the
app (`lib/scan/draft.ts`):

- **Its details:** the type and kind the scan found, the name (the site's,
  or one made from its address), the name under the icon, the main and
  splash colours, the font, the template of its design, the website, and the
  logo when it is a PNG or SVG; the icon only when it is what the stores ask
  for (1024 × 1024 PNG without transparency), which a website's rarely is,
  so Branding still asks for it.
- **Its Pages & look draft:** the first ready-made design for its kind (33),
  with the site's font and accent colour, the site's language first when the
  app speaks it, and the menu: an entry the design already has a screen for
  (Courses, Shop, Menu…, by its words in English, Turkish and Arabic) is left
  to that screen; each other one becomes a page showing that page of the
  website (an `embed` block; https pages only), a tab before Account while
  there is room for one, else a link in a Quick links block on the home page.

Nothing is published: the editor opens with a notice, and the setup steps go
on as for any app (the Website step connects the site). Each client can start
from a website ten times an hour (`RATE_LIMITS.siteScan`); a type the team
switched off isn't made. In local tests every scan reads a fake site
(`SITE_SCAN_TEST_URL`, refused on Netlify; `tests/e2e/site-start.spec.ts`).

### Import (81.4)

Apps whose products, menu, services or courses live in the dashboard (no
connector) can bring them from a file or a feed: "Import from a file" on
Products, Services and Courses (`/dashboard/catalog/import`,
`/dashboard/services/import`, `/dashboard/courses/import`, with those pages'
permissions; `components/import-view.tsx`, `app/actions/import.ts`).

- **Reading** (`lib/import/table.ts`, `source.ts`): a CSV file (UTF-8, with
  or without its byte order mark; commas, semicolons or tabs, found from the
  header; quoted cells with line breaks), a feed (RSS or Atom; Google
  Merchant Center's `g:` fields win over the plain ones), or a link to either,
  read through the safe fetch (a Google Sheet's link becomes its CSV export).
  2 MB and 500 rows at most.
- **Planning** (`lib/import/plan.ts`): columns are found by their names in
  English, Turkish and Arabic (`ALIASES`), exact names first; each row is
  checked by the dashboard form's own rules and messages
  (`readProductNumbers`, `parseService`, `parseCourse`). Prices are read as
  written ("45,50", "120.00 TRY"), HTML descriptions become plain text, a
  feed's "out of stock" is a stock of 0 and its "Home > Kitchen > Mugs" the
  category "Mugs".
- **Saving** (`lib/import/apply.ts`): the owner sees the plan first (the
  columns found, the first rows, the rows left out and why), then imports:
  a row naming what exists updates it (a product by its SKU, else its name;
  a service or course by its name), the rest are added; categories are found
  by name or added; pictures are read for 12 seconds at most, only for what
  has none; the rest are added by hand. Rows with errors are left out.

Checks and imports are limited to 30 an hour per client
(`RATE_LIMITS.importRead`).

## Demo apps (Phase 16)

Four apps people can try before they pay, shown on yallapp.com.tr/demo:
Nour Academy (Academy), Lale Flowers (Store), Studio Nur (Bookings) and
Nile Homes (Real estate), on the hosted API with sample content.

- **Made by the platform itself.** Admin › Demo apps (`/admin/demos`,
  permission `demos.manage`, owners and admins) runs `setupDemoApps`
  (`platform/web/src/lib/demo/setup.ts`): the account `demos@yallapp.com.tr`
  (no password; the team opens it with "Open in the dashboard"), recorded in
  the platform setting `demo`, and one app per type marked `apps.demo`, with
  branding, store listing, published pages, a Business license to 2099 and
  the content from `lib/demo/content.ts` through the same data the dashboard
  edits (courses, products and categories, services, team and hours,
  listings). Pictures are drawn in code (`lib/demo/pictures.ts`, PNG by
  `lib/demo/art.ts`) and saved under IDs made from the drawing, so a refresh
  reuses them. Running it again updates everything in place (products by
  SKU, listings by reference, courses, services and staff with fixed IDs).
  An app is a demo only when it is marked and belongs to the demo account
  (`withDemoChecked`). Demo apps are left out of the admin overview's
  numbers and get no owner notices or emails.
- **Sign-in.** In a demo app only the public number +1 202 555 0123 (a
  555-01XX number, reserved for fiction) signs in, with the code 246810 and
  no message sent; other numbers get 403 `demo_number_only`. It is limited to
  10 code requests an hour per IP and 300 per app. Everyone shares one
  account ("Demo visitor"): no device limit, each visitor sees only their own
  device, and the account can't be renamed or deleted (deleting signs out
  this phone). The demo code is checked only when the app is a demo app, so
  it never signs in to a client's app.
- **No payments.** Checkout in a demo app opens the payment page with a
  "Demo" notice and "Place demo order": the order goes through (a course
  order enrols) without a card or a payment account. `checkoutAccount`
  returns none for demo apps, so iyzico is never called. A Real estate demo
  answers each new conversation once, automatically.
- **Clean-up.** The daily job (`runDailyNotices` → `cleanDemoActivity`)
  deletes what visitors added more than 24 hours ago in demo apps only
  (orders, appointments, conversations, favorites, enrolments, lesson
  progress, notifications to the account) and signs out devices idle for a
  day (`DataStore.purgeDemoActivity`).
- **Downloads.** Demo apps build through the normal pipeline ("Start a
  build" on the admin page). The team picks a ready build with an APK as the
  public download (`apps.demo_build_id`); `/demo/download/<slug>` redirects to
  a link signed at that moment, or back to /demo, which shows "Coming soon"
  until a download is picked. The QR codes on /demo are made on our server
  (`lib/qr.ts`).

## App preview (Phase 17)

Clients try their real app from the dashboard ("Preview your app") before a
build. The preview is the Flutter app from `mobile/`, built for the web.

- **One codebase, two ways to get the build config.** Android and iOS builds
  keep the config compiled in by `tool/apply_config.dart`. The web build is
  only the preview: `main.dart` starts `runPreview()`
  (`lib/core/preview/preview_start.dart`), which reads
  `GET <platform>/api/preview/{token}/config` from the address it was opened
  on. The answer (`docs/api/platform.yaml`, `getPreviewConfig`) is
  `buildConfigFor` from the app's current setup, also before the setup is
  complete (placeholders such as "Your app", listed in
  `preview.placeholders`), without Firebase files, plus the content source,
  the missing setup steps and whether it shows the draft pages.
- **Preview links** (`platform/web/src/lib/preview/token.ts`):
  `p1.<app id>.<expires>.<draft>.<signature>`, HMAC-SHA256 with a key made
  from `SIGNING_SECRET` for preview links only. A link is made each time the
  Preview page opens (and on "Reload after changes"), names one app, and
  works for an hour. Nothing is stored. The config endpoint is limited to 120
  requests per 10 minutes per IP.
- **Serving.** `mobile/tool/build_preview.sh` builds the web app and copies
  what browsers load to `platform/web/public/preview-app/` (committed,
  about 22 MB: Netlify builds the platform without Flutter). CanvasKit, the
  engine's drawing library, is served with it (`--no-web-resources-cdn`:
  the default build and the Chromium one), so the preview never depends on
  another server. `source.sha256`
  in the bundle is a fingerprint of the app's sources; CI (`mobile.yml`)
  fails when it doesn't match (`--check`) and also builds the web app. The
  bundle holds no client data or secrets: every app's config comes from the
  platform at start-up. `/preview-app/` may be framed by the site itself
  only (`X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`); every
  other page keeps `DENY`. No service worker: a deploy serves the new app
  at once.
- **Reaching the content.** The preview calls the app's API from the
  browser at yallapp.com.tr:
  - the hosted API is on the same origin; it also sends CORS headers to the
    platform's own addresses (`APP_URL`, Netlify's `URL` and deploy
    addresses), and the preview sends its link as `X-Yallapp-Preview`. With
    a valid link for that app the hosted API answers the owner's preview
    while the app isn't active yet (never while the account is suspended)
    and serves the Pages & look draft when the link asks for it;
  - WordPress answers cross-origin REST requests itself; the plugin adds
    the headers the app sends and reads (`Rest\Cors`). The preview reads a
    WordPress site only once the Website step chose it and the plugin there
    has activated the app's license (`wordpressPluginConnected`): a
    website's address given at sign-up or read by "Start from your website"
    is no content source, and a site without the plugin can't be reached
    from the browser. Until then `preview.waiting_for` (website, plugin or
    setup) has the preview say what to do instead of "We couldn't connect".
    A pending WordPress app shows "paused" until its plan is active;
  - a client's own API must allow `https://yallapp.com.tr` (CORS); the
    preview says so when the browser can't reach it, and "Connect your own
    API" shows how. On the web the app never sends `If-None-Match` (the
    browser revalidates by itself), so sites need no extra permission for
    it.
- **Sign-in.** The preview never sends codes. It sends `preview: true` at
  `POST /auth/otp/request`, and offers sign-in only when `/config` says
  `auth.preview_sign_in` (the hosted API and the new plugin do): then only
  the store review number signs in, with its fixed code; other numbers get
  403 `preview_review_number_only`. On the hosted API the preview link alone
  is enough for that rule. Otherwise the sign-in screen says signing in works
  in the installed app and offers browsing without signing in. Tokens are
  kept in the browser's storage, separate for each app's preview
  (`SharedPreferences.setPrefix`).
- **What the web can't do** shows a short note instead: web views (lessons
  shown as web pages, embeds, in-app pages, checkout and payment pages) show
  "Available in the installed app" with "Open in a new tab"; checkout links
  are never requested; no push (no Firebase in the preview) and no screen
  capture protection. Pictures from sites that don't allow other addresses
  to read them still show, as page images. The platform is the browser's
  OS: on an iPhone the iOS purchase rules apply.
- **Dashboard** (`/dashboard/preview`): the app in a phone frame
  (`PhoneFrame` in `components/device-frame.tsx`), Light / Dark and the
  app's languages (passed in the link as `theme` and `lang`), "Reload after
  changes", "Open on your phone" with a QR code made on our server
  (`lib/qr.ts`) for the same link, what's missing, and how to sign in.

### The real app in the editor (82.1)

Pages & look shows the app preview beside the editor for apps whose content
is on the hosted API (the ones that can preview the draft): the preview with a
draft token, in the shared phone frame (`dashboard/pages/live-preview.tsx`),
with the quick view (the editor's own drawing of the draft) one click away.
After each saved draft (and a design applied, a publish or a discard) the
editor posts `{yallappPreview: "draft-saved"}` to the frame, to its own
origin. The app takes it only from the page holding it, on the platform's
origin (`mobile/lib/core/preview/draft_updates_web.dart`), and reloads its
tabs and pages in place, a few saves close together once
(`draftReloadProvider`): the frame never loads again, so the screen and
where the owner is in the app stay. The phone apps listen to nothing.

### Editing on the phone (82.2)

In the quick view each block on the phone is a button ("Edit Notice"): it
opens that block in the editor's list and scrolls to it. The buttons of Add a
block can also be dragged (`application/x-yallapp-block`) onto the phone: the
block goes before the block it falls on (its top half) or after it, or at the
end below the last block, with the same limits as Add a block.

### Sizes, systems, light and dark (82.3)

The real app beside the editor comes at a small phone's, a phone's or a
tablet's size (`DEVICE_SIZES` in `live-preview.tsx`), as on Android or an
iPhone, and in light and dark side by side (two frames, each told about every
save). The app preview's link takes `os=android` or `os=ios`
(`PreviewLaunch.platform`): the app runs as on that system
(`AppEnvironment.platform`), with its rules, so an iPhone shows no purchase
buttons.

### Undo, redo and the publish history (82.4)

Undo and Redo step through the draft's changes in the editor (changes less
than a second apart are one step, 50 kept, in the browser only); Ctrl+Z and
Ctrl+Shift+Z (or Ctrl+Y) do the same outside the fields, which undo their own
typing. A draft replaced from the server (a design, a discard, a publish
brought back) starts its own history.

Each publish is kept (`app_layout_versions`, the last 20,
`LAYOUT_VERSIONS_KEPT`), with when and who published it. The editor lists
them under Publish history, marking the one in the app; "Use as draft"
(`restoreLayoutVersion`) makes one the draft again, checked like any draft,
with the draft's own interface strings; what's published stays until the
owner publishes.

### The team's designs (84.4)

Owners choose from the design catalogue (`lib/pages/designs/catalog.ts`):
the built-in designs the team didn't hide, then the team's own (the
`designs` platform setting). The team makes one in Admin › Designs from an
app's draft (`lib/pages/designs/team.ts`): its tabs, side menu, pages and
look, for that app's kind, checked like a publish, without the app's
hand-picked list entries; and renames, describes or deletes it, or hides a
built-in one. Apps that used a design keep their pages.

### Saved sections (84.3)

An account's saved sections (`saved_sections`, `lib/pages/sections.ts`):
blocks of a page saved together under a name, checked as a page of the app
they came from (the same validator as publishing), at most 10 blocks and 30
sections an account. "Your sections" in Add a block adds copies with new
IDs to a page of any of the account's apps, leaving out the block types that
app doesn't have (`lib/pages/section-blocks.ts`); the draft's own check
flags the rest. They go with the account (the rows cascade with the client).

### Designs with several pages, colours and pictures (84.2)

Every design (`lib/pages/designs`, `withCompanyPages`) has an About us and
a Contact page besides its own, in the side menu when no tab opens them,
and three palettes: its own (the app keeps its main colour) and two of
`PALETTES`. Choosing one on the design's card sets the look's second colour
and the app's main colour (`applyDesignAction`). Yallapp's picture library
(`lib/pages/picture-library.ts`): plain shapes in the palettes' colours,
made by `scripts/design-pictures.py` into `public/design-pictures`,
offered in "Choose from Media" for slides, banners and images.

99.1 Each built-in design also has its own main colour
(`designs/colours.json`, its first palette's) and two pictures in its
colours (`<design>-1.jpg`, `-2.jpg`, by the same script). `applyDesign`
puts them on the design's slides (or a banner on a home page with
neither), at `pictureBase` (the platform's address, which the validator
accepts like its own assets), and a Social links block with the app's
current profiles (`socialProfilesOf`) on the Contact page.

99.2 `saveDesignDraft` takes a `mode`: "all" (the design's layout,
`withKeptPages` adding the draft's pages it lacks to its side menu) or
"look" (`designLookOnly`: only the design's look on the draft; the app's
`design` and sample texts stay). The editor keeps the draft, main colour
and design from before the switch for one "Undo" (`undoDesignAction`),
until the next edit.

99.3 `BlockLook` also has `align`, `text_size`, `corners` and
`image_fit` (left out when usual); `LayoutPage` has `background` and
`header_image_url`. `LayoutBlock.show` (dates, platforms, languages) is
for servers only: the hosted API (`shownNow`) and the plugin
(`Block_Resolver::shows`) leave the block out of the page they serve, at
the time of the request, for the request's platform and its
`Accept-Language`.

99.4 Five more blocks (`cards`, `gallery`, `map`, `divider`, `form`) in
`BLOCK_DEFINITIONS`, with entry lists `cards`, `images` and `fields`. A
form's answers by email reach `lib/hosted/pages/forms.ts`
(`checkFormAnswers`, rate-limited per address once they pass), which
hands them to `HostedContext.onFormAnswers` (the route emails the
business); the plugin has its own `Form_Answers`. Answers to the chat are
sent by the app itself as a chat message.

### One definition per block (83.1)

Each block type has one definition in `lib/pages/blocks.ts`
(`BLOCK_DEFINITIONS`): its name and hint in the dashboard, its icon, its
group in "Add a block", the longest each of its texts can be, how many
entries each of its lists takes, `since` (the first app version that shows
it) and `olderApps` (what an older app shows instead: today, nothing, since
the app leaves out a block type it doesn't know). The validator's limits,
the editor's text fields (`maxLength`) and lists, "Add a block" and the
preview's drawing of a block it has no picture for all read it.

83.2 The editor says how many people won't see a block until they update
the app: the phones that opened the app in the last 30 days (its usage
statistics, so the people who share them), each counted by the version it
last used (`countAnalyticsVersions`, `lib/pages/reach.ts`), against the
block's `since`.

Adding a block: add its type to `BLOCK_TYPES` and the contract
(`docs/api/openapi.yaml`, `platform.yaml`), its definition (with `since` set
to the app version that brings it), its fields in the validator and the
editor, its drawing in the preview, the hosted API, the plugin
(`Rich_Blocks`) and the app.

### Connector and adapter versions (83.4)

Each connector (`CONNECTOR_VERSIONS`, `lib/hosted/connectors/versions.ts`)
and each plugin adapter (`ADAPTER_VERSION`) has its own version; the plugin
sends those of the adapters a site uses with each license check
(`SiteInfo.adapters`, kept in `hostedSettings.siteAdapters`). Admin › the
client shows the app's connector and its site's adapters with their
versions. `docs/CONNECTORS.md` lists them all, says how versions go up and
how to add a connector or an adapter; tests on both sides keep it in step
with the code.

### Switches per app (83.3)

Besides the switches for everyone and per plan (Admin › Switches, 11.5),
the team can turn a module or a new feature off for one app (Admin › the
client › App switches, `lib/app/switches.ts`): `chat`, `side_menu`,
`block_looks` and `own_icons`. Each is on unless turned off; only the ones
turned off are stored (`apps.switches`), so a new switch starts on
everywhere. The platform applies them to what it serves: no chat
(`chatAvailable`), and the pages (`layoutForPlan`, so the hosted API and
the plugin's layout) without the side menu, the blocks' looks or the own
icons, with a new version. It also sends them as `Config.switches` (hosted)
and `LicenseStatus.switches`, which the plugin (0.4.11) serves as
`Config.switches`; a WordPress site is asked to check its license at once.
The app follows them as well, for what it does on its own.

### Block looks, own icons and the side menu (82.5)

Each block can have a look (`BlockLook`): a background within the app's
brand (`tint`, a light wash of the main colour; `primary`; `secondary`, the
second colour or else the main one; `surface`, the colour of cards) and its
spacing (`none`, `small`, `medium`, `large`). The validator stores it only
when it changes something, and the hosted API and the plugin
(`Block_Resolver::look`) pass it on the same way. On the main or the second
colour the block's title and its own text turn light; cards in it keep their
colours. The space between two blocks is the larger of what each asks for.

A tab, a side menu entry or a quick link can have the owner's own icon
(`icon_url`, https only, from the media library); `icon` stays as the
fallback for an app that can't load it. `Navigation.menu` is the side menu
(up to 12 entries, each a `NavTab`, translated like the tabs, dropped when
the app can't open its target). The app shows the menu button where a
page in the tabs would have its back button, and the menu also opens from
the screen's edge; with no entries there is neither.

## Pages, looks and languages

Clients build their app's pages and pick its look in the client dashboard,
without a new build. The app renders whatever the API sends.

- **Looks.** `Config.appearance` carries the template, the opening mode
  (system, light or dark), whether students can switch it, the font, the
  secondary color, corners and card style. The build config only sets the
  defaults used before the first `/config` and when `appearance` is missing.
- **Fonts (97.1).** Any family of Google Fonts, about 1,976 of them:
  `scripts/google-fonts.mjs` makes `src/lib/fonts/google-fonts.json` from
  github.com/google/fonts at one commit (family, folder, category, whether
  it draws Arabic, and its upright files: one variable file, or one per
  weight from 400 to 700). Icon and emoji fonts are left out, and so are
  families with a file over 5 MB (a Netlify function answers at most 6 MB;
  mostly Chinese, Japanese and Korean fonts). The files are served at
  `/api/v1/fonts/<licence>/<folder>/<file>` (docs/api/platform.yaml, tag
  Fonts): copied once from raw.githubusercontent.com at that commit, checked
  to be a TrueType or OpenType file, kept in Netlify Blobs and cached for a
  year. Neither the dashboard nor the app ever loads a font from Google.
  `Appearance.font` stays one of the six bundled fonts (older apps and
  plugins read only that, and the app shows it until the chosen font is on
  the phone); `font_family` names a free font and `arabic_font` the font of
  Arabic text (Readex Pro, bundled, when missing). Their files
  (`font_files`, `arabic_font_files`) are added when the look is served
  (hosted API, and the layout the plugin pulls, from plugin 0.4.19), never
  stored. The app (`lib/core/theme/fonts`) downloads them once, keeps them
  in its support folder and registers them with `FontLoader`; the web
  preview lets the browser keep them. The dashboard's font picker
  (`components/font-picker.tsx`) searches `GET /api/v1/fonts` and draws
  each name in its own font as it scrolls into view. 97.2 The owner's own
  fonts (`own_fonts`, `lib/fonts/own.ts`): TrueType or OpenType files they
  upload in Pages & look after confirming the font's licence allows apps,
  read by `lib/fonts/sfnt.ts` (WOFF, collections, italic files and fonts
  whose `OS/2` fsType forbids embedding are refused), up to four weights or
  one variable file, ten fonts per app. The files are assets (kind `font`,
  served at `/api/v1/assets/<id>`), counted in the app's Media storage
  (`mediaUsage`) and deleted with the app; `font_family` names them like a
  free font, so the plugin and the app need nothing new. 97.3 The Figma
  look (`figma_look` in the layout, `lib/figma`): a look made from files
  exported from Figma, kept apart from the standard look (`appearance`),
  with `look_mode` saying which one the app shows; switching never changes
  the other. The design tokens JSON is read in the browser
  (`lib/figma/tokens.ts`: W3C tokens as Figma exports its variables, Tokens
  Studio, Style Dictionary, variable lists, `{references}`) into colors,
  font families and radii, with a suggestion the owner changes before
  saving; the logo and pictures are assets of kind `figma_image` (PNG, JPEG
  or WebP, 5 MB each), and a draft may name only its own account's. When
  served (`shownAppearance`), the Figma look gives the app its colors,
  font, corners and, in `Appearance.primary_color` and `logo_url`, its
  main color and logo over the branding (plugin 0.4.20 passes them on);
  the template, the opening mode and the cards stay the standard look's.
  Its pictures are offered in the editor's Choose from Media. 97.4 The
  same look from a Figma link (`lib/figma/api.ts`): the owner pastes the
  file's link and a personal access token; the token goes to Figma's REST
  API (`api.figma.com`, in the `X-Figma-Token` header, through the safe
  fetch) for that call only and is never saved or logged: it stays in the
  dashboard page's memory between reading and importing and is cleared
  when the look is saved. Reading takes the file (`depth=2`), its FILL and
  TEXT styles' nodes, its local variables when Figma allows it (Enterprise
  files; a refusal is ignored) and small pictures of its top-level frames
  (logos first, up to 40); importing has Figma draw the chosen frames as
  PNG at twice their size (once more at their own size when that is over
  5 MB) and keeps them as `figma_image` assets. Figma's refusals are said
  in the owner's words (wrong token, file not found or not shared, Figma's
  rate limit with its Retry-After, too large, unreachable), and an account
  reads at most 30 files an hour (`RATE_LIMITS.figmaRead`). Local tests use
  a fake API (`FIGMA_API_TEST_URL`, refused on Netlify). Apps on their own API
  get only the bundled font from the build config, unless their API sends
  `font_files` itself. 97.5 Frames marked Page become pages of the draft
  (`lib/figma/pages.ts`): the frames are read with everything in them
  (`/v1/files/:key/nodes`, up to 10), their texts made Text blocks (headings
  by size and weight), buttons Button blocks, a search field a Search box, a
  picture with a heading over it a Banner, and pictures, drawings and rows
  of cards Image blocks that Figma draws (up to 30, kept as `figma_image`
  assets and named by their own `/api/v1/assets/` address, which the page
  checks accept). The status bar, top bar (its title names the page) and
  tab bar are the app's own; the tab bar's labels can become the tabs.
  Buttons and tabs open the page of the same name or the screen their words
  name, else the first page. The editor adds the pages to the draft as one
  step (undone in one), saved and checked like any edit.
- **Pages.** `GET /pages` returns the bottom tabs and the page list;
  `GET /pages/{slug}` returns one page as a list of blocks: banner, text
  (HTML), image, video, button, a list of items, categories, search,
  continue learning, embed and spacer, and (Phase 33) blocks whose content
  the owner writes: slider, quick links, testimonials, questions, countdown,
  contact, opening hours, social links, team, numbers and notice. Blocks
  stack vertically; there is no free positioning. The server resolves lists
  (courses, products, services, posts, listings) into one `Item` card shape,
  so the app has one renderer for all of them. Entries of a block's own
  lists (slides, quotes, people...) carry their own translations; the
  platform's validator (`lib/pages/validate.ts`), the hosted API and the
  plugin (`Rich_Blocks`) each check them, drop what the app can't open and
  leave out a countdown that has ended without a text for it. The app works
  out "Open now" and the countdown on the phone's clock. The app skips block
  types, entries and actions it does not know, so old apps keep working
  when new ones are added.
- **Ready-made designs.** `lib/pages/designs` holds three or four designs
  for each kind of app (tabs, a home page of blocks and a look), as data.
  The owner picks one in the Branding step or in Pages & look; it replaces
  the draft (never the published layout), and `apps.design` remembers it so
  the editor can mark the blocks that still have the design's sample texts.
  A unit test checks every design with the same validator publishing uses.
- **Built-in screens stay native.** Course detail, lessons, quizzes, search
  with filters, favorites, messages and the account are screens, not
  blocks. Tabs, buttons and cards open them with a `screen` action.
- **Fallback.** When nothing is published, the server builds default pages
  and tabs for the app type from the site's content. When `/pages` returns
  404 (an older plugin), the app uses its built-in tabs and the `/home`
  sections.
- **Where pages are edited.** One editor, in the client dashboard, for both
  kinds of client. The platform keeps a draft (saved as the client edits)
  and the published layout, which gets a new version on every publish; a
  WordPress client's plugin fetches the published one from the platform
  (cached, refreshed with the layout version) and serves `/pages` with its
  own data filled in. A new app's first draft is a home page and tabs for its
  type, with the look and languages the team set as defaults in the admin.
- **Hosted apps.** Apps on the hosted API (Phase 8) get their pages and look
  from the platform directly, filled from their dashboard content or their
  connected platform (the connector's own list endpoints). Before the first
  publish they get the default pages for their type.
- **Languages.** Every text in the apps is English by default. A client can
  offer any language the app's system widgets come in (Flutter's Material
  and Cupertino localizations, 82 languages: `lib/i18n/locales.ts`, the same
  list in `mobile/lib/core/l10n/locales.dart` and the plugin's
  `Translator`), in their own order; right to left for Arabic, Persian,
  Hebrew, Urdu, Pashto and Uyghur. Students pick one in the app's
  settings, by its own name. Plans count every language. (Phase 43)
  - **Yallapp's own texts.** The app ships its interface in English, Arabic
    and Turkish (the ARB files). The texts Yallapp writes into pages (the
    default tabs, page titles and home blocks of every kind of app, the
    designs' sample texts, what a new block starts with) have Arabic and
    Turkish in a built-in dictionary (`lib/i18n/builtin`), keyed by the
    English text (`{app}` for the app's name). A served layout (hosted API,
    the plugin's `POST /apps/layout`, the preview's draft) gets them in
    `translations` wherever the owner wrote none, and as the main text for
    an Arabic- or Turkish-first app; a text the owner changed is theirs.
    The hosted API also answers its error messages and the events' price
    labels in the app's language (`Accept-Language`). A unit test fails
    when a new default text or message has no Arabic or Turkish. The plugin
    has the same for its own default pages (`Builtin_Texts`).
  - **The owner's translations.** Page texts carry `translations` per
    entry, as before. The app's own strings can be translated or changed
    per language too: the layout keeps them in `strings` (draft and
    published, like the pages), checked against the app's string files
    (`lib/i18n/app-strings.json`, a copy of the ARB files that a unit test
    keeps current: placeholders, plurals and selects must stay valid ICU).
    The dashboard's **Languages** page lists every text per language, with
    Yallapp's as the starting point, progress, filters, search, CSV, JSON
    and XLIFF import and export, and a preview link.
  - **String packs.** `Config.languages.list` names each language, its
    direction and its pack (`GET /api/app/{app_id}/strings/{language}`,
    served by the platform for every app, also WordPress ones through the
    plugin's layout). The app downloads a pack when its version changes,
    keeps it for offline use, and lays it over its own strings
    (`OverlayLocalizations`, generated by `tool/gen_l10n_overlay.dart`):
    the owner's string, else the app's in that language, else English. A
    string that doesn't parse or uses an unknown placeholder is ignored.
    The preview gets the draft's pack.
- **Purchases.** The iOS rule applies to every block: no purchase actions for
  paid content on iOS. Prices are display text only.

## Links, ratings and crash reports (Phase 46)

- **Links that open the app** (Android App Links, iOS Universal Links;
  `docs/api/openapi.yaml`, tag Links). A link is `<base>/<kind>/<id>`;
  the kinds and the screens they open are one table,
  `docs/api/app-links.json`, which the app (`core/routing/app_links.dart`),
  the platform (`lib/links/table.ts`) and the plugin (`App_Links`) follow,
  each with a test against the file. Two bases:
  - Yallapp's link domain, every app: `https://yallapp.com.tr/a/<app_id>`.
    The platform serves `/.well-known/assetlinks.json` (every app's package
    with the Play App Signing key's and the upload key's SHA-256) and
    `/.well-known/apple-app-site-association` (each `<Team ID>.<bundle ID>`
    for its own `/a/<app_id>/*`) at the root (`next.config.ts` rewrites to
    `/api/links/*`; the reverse proxy passes these two files through). Without
    the app, `/a/<app_id>/<kind>/<id>` sends a WordPress app's visitor on to
    the site's own link (once its plugin serves them, `LINKS_PLUGIN_VERSION`),
    and otherwise shows the item's name and picture in the app's branding
    with its store buttons; never a price or a purchase button.
  - A WordPress site: `<site>/a`. The plugin serves the same two files at
    the root of the site's domain from `LicenseStatus.app_links` (only
    well-formed values), for `/a/*`, and redirects `/a/<kind>/<id>` to the
    item's permalink (a published, public post) or the home page.
  The Play signing fingerprint is entered by the owner (Publishing › Links
  to your app); the build pipeline reports the upload key's fingerprint and
  the Team ID of the provisioning profile (`StatusReport.signing`). The
  build config's `links` gives the Android build one verified intent filter
  per host (`android/app/src/links/AndroidManifest.xml`, release builds) and
  the iOS build the Associated Domains entitlement; Flutter's deep linking
  hands an opened link to go_router, whose redirect maps it with the table
  (an unknown kind opens the home page). Push notifications and inbox
  notifications may carry a `link`, which goes through the same redirect.
  Share buttons share `Config.links.share_base_url` (the site's on
  WordPress, else Yallapp's). "Check links" (App setup, Publishing › Links
  to your app) fetches a WordPress site's two files as the phones do (https,
  no redirect, JSON, never a private address) and keeps the result on the
  app (`apps.links_check`).
- **The site's own pages** (Phase 48). On WordPress, `Link_Paths` works out
  the permalink bases of what the app type shows (course and lesson post
  types, `product` and `product_cat`, the posts' permalink structure, pages
  with the booking plugin's shortcode; a sample item's permalink catches a
  base that doesn't follow its post type, like Tutor LMS's lessons under
  `/courses/`) and lists them in `apple-app-site-association` after the
  exclusions (wp-admin, wp-login.php, REST, feeds, the home page, the cart,
  checkout, account and payment pages, `add-to-cart` and similar queries).
  The bases that start with a fixed folder go to the platform with each
  license check (`SiteInfo.link_paths`), which keeps them on the app
  (`apps.hosted_settings.sitePaths`, written only when they change) for the
  build config's `links.site_paths`: the Android build adds an intent filter
  per path on the site's host. In the app, go_router's redirect sends an
  address on the site's host (iOS) or a path under a site path that isn't
  one of the app's screens (Android) to `/open?url=`, whose screen asks
  `GET /links/resolve` (`Link_Resolver`: `url_to_postid`, then the slug in
  the entry's post types; only public, published items) and opens the
  screen (`resolved_kinds` in `docs/api/app-links.json`) or the address in
  the in-app web view, which never hands an address back to the phone.
- **Rating prompt** (`core/services/review_prompt.dart`): the store's own
  prompt (`in_app_review`: Google Play In-App Review, SKStoreReviewController)
  after a finished lesson, an order, a booking, a ticket, a donation or the
  third run; not before three runs over two days, at most once in 120 days
  and three times a year, never in the preview, off when the owner turns
  it off (`Config.app.review_prompt`, `apps.review_prompt`). No question
  first: everyone gets the store's prompt, which the stores require.
- **Crash reports** (`core/services/crash_reporter.dart`): `FlutterError.onError`
  (silent errors left out), `PlatformDispatcher.onError`, `runZonedGuarded`
  around the app and the isolate's error listener record a report: the
  error and stack scrubbed of addresses' queries, emails, numbers, tokens
  and codes, the app version and build, the system version, phone or
  tablet, the route's pattern and the time. Each fingerprint (the error's
  type and its first frames in the app's code, without line numbers) once
  per run; at most 10 wait on the phone. They go to `POST /crashes` on the
  hosted API's address of every app (`links.crash_report_url`) with the runs
  counted since the last batch, when the owner (`Config.app.crash_reports`)
  and the user (Settings › Privacy) allow it, never from development builds
  or the preview. The platform scrubs again, rate limits per address and per
  app, and groups by fingerprint (`crash_issues`: count, first and last
  seen, versions, platforms, open or resolved; reported again after being
  resolved opens it again) with the runs per day (`crash_sessions`). The
  team sees them in Admin › Crashes; the owner's Stability page and
  overview card show crash-free sessions over 30 days and the top problems.
  Native crashes (Java/Kotlin, Swift) aren't caught yet.

### Media library (roadmap 51)

Owners' videos, pictures and PDFs are kept by Yallapp, on our own host and
in our own database, never a third-party host. The platform's functions on
Netlify can't take a 5 GB upload or stream a video (request and response
sizes are limited), so the bytes go through the **media gate** instead:
`platform/web/deploy/media-host/index.php`, PHP under the Apache that
already serves yallapp.com.tr (`ProxyPass /media/ !` keeps `/media/*` on the
host), with the files in a folder outside the web root. In local runs and
tests the platform's own `/media` route does the same on `.data/media`
(`lib/media/disk.ts`, the same protocol, checked against the PHP gate by
`media.test.ts` with PHP's built-in server).

- **Signed links** (`lib/media/signing.ts`): `/media/<op>/<app>/<id>/<ext>`
  (Phase 64b: the extension as a segment of its own, since LiteSpeed or nginx
  in front of PHP answer paths ending in `.mp4`, `.jpg`… as static files and
  never pass them to the gate; links signed before, `<id>.<ext>`, still work;
  on disk the file is still `<app>/<id>.<ext>`)
  with `expires` and an HMAC-SHA256 `sig` over the path and parameters, with
  `MEDIA_SIGNING_SECRET` (the gate's `config.php`). `v` plays (GET/HEAD with
  range requests; `dl=1` as an attachment), `u` uploads, `s` reports what's
  on disk, `d` deletes. The operation is signed, so a playing link can't
  upload, and an upload link can't write past its signed `size`.
- **Uploads**: the dashboard's Media page starts an upload (type and size per
  file checked, the size reserved in the app's storage at once, a
  `media_files` row "uploading"), then the browser sends 5 MB chunks straight
  to the gate (Phase 64b: `POST` as `application/octet-stream`, the offset in
  `Upload-Offset` and in the query's unsigned `offset`, since server
  firewalls refuse `PUT` and unusual content types and proxies may drop
  unknown headers; the gate answers 200 with `{"offset":N}` and the header;
  `PUT` answered 204 still works for older uploaders; written to `<id>.part`
  with a lock and renamed when the last byte arrives; a wrong offset answers
  409 with where it stands). A 403/410 gets a fresh link at most twice in a
  row; a refused upload names the HTTP status (`lib/media/upload-client.ts`).
  Admin › Settings › Server › "Check the media server" (`lib/media/check.ts`)
  reaches the gate, signs a stat, sends a test upload by POST, checks it and
  removes it, naming the step that failed and what to do. A broken connection retries; choosing the same file again
  after a reload resumes from the server's offset (the upload's ID is kept in
  the browser). The platform then asks the gate (`s`) and marks the file
  ready only when its size is the one announced. Uploads left for two days
  are cancelled by the daily job.
- **Playback**: a hosted lesson whose video address is a file's Yallapp link
  (`https://yallapp.com.tr/m/<id>`) answers `Video.source: upload` with a
  `v` link for 4 hours and `expires_at`; the app renews it five minutes
  before the end and when the player stops on an old link, and carries on
  (`SignedVideoLink`). Offline downloads get a 15-minute `dl` link with the
  file's size. `/m/<id>` itself redirects (302) to a 6-hour link for pictures
  and for files the owner shared (page videos), and refuses lesson videos.
  Products' and listings' photos from Media are `media:<id>` asset IDs.
- **Bound to the student** (Phase 62): an app that sends
  `X-Yallapp-Bound-Media: 1` (built after Phase 62, never the preview in a
  browser) with a user token gets the lesson's `v` link with `t`, the first
  52 bits of the token's SHA-256 (`mediaTokenDigest`, the same in PHP); the
  gate plays it only to a request with `Authorization: Bearer` that token,
  which the app's player sends. The 4 hours stay; a link refused after the
  token was renewed is fetched again like an expired one. Download links
  aren't bound.
- **Deleted apps** (Phase 62, `lib/media/sweep.ts`): the gate also removes
  an app's folder (`a`, DELETE `/media/a/<app>`) and lists the folders (`l`,
  GET `/media/l/apps`). `deleteAppMedia` removes an app's files and rows at
  once; the daily job lists the folders and removes those whose app has been
  gone for a week (kept in the `mediaSweep` setting), doing nothing when
  most folders look gone (another database than the gate's).
- **WordPress**: a lesson's "Yallapp video" box, its LMS video address or a
  `[yallapp_video]` shortcode holding a media link; after the LMS lets the
  student in, the plugin asks `POST /api/v1/licenses/media` with its license
  (only its app's ready files; 4-hour play links cached for an hour, download
  links not cached) and serves it as an upload. The shortcode shows a
  `<video>` on the website.
- **Storage**: `PlanLimits.storageGb` (2, 20, 100 and 500 GB by default,
  editable in Admin › Plans, decimals allowed) plus `storage_packs` still
  running. Uploads that don't fit are refused with "Buy more storage";
  nothing is ever deleted for being over. Packs (+25 GB, +100 GB; a month's
  price set in Admin › Plans as a `YallappPrice`, like the plans: pounds
  charged, dollars shown outside Egypt, `lib/billing/prices.ts`) are bought
  by card through the plans' gateway (`yallappPlanAccount`, Kashier in
  pounds) as a `plan_payments` row with `purpose: storage` and the shown
  price kept, priced for the months left in the plan's period and running
  until it ends; a plan renewal by card offers them (`storage_packs` on the
  payment, their charge added to the plan's, the coupon on the plan only)
  and extends them to the new end. Tables: migration `0040_media_storage`. The daily job tells the owner once (notice and email) when a
  pack ended and the files are over; the team adds or removes packs by hand
  on the client's admin page.

## Build pipeline

- GitHub Actions builds Android on Linux and iOS on macOS runners.
- Inputs: the client's build config from the platform.
- Outputs: APK, AAB, IPA, signing key (encrypted), store assets, stored on
  `files.yallapp.com.tr` and listed in the client's dashboard.
- Pro plan: upload to Google Play and TestFlight with the client's API keys.
- 35, 36 Pro plan, optional: the APK (signed with the upload key) to Samsung
  Galaxy Store (Content Publish API: a JWT signed with the Seller Portal
  service account's key, an upload session, the binary added to a new
  version, submitted) and to Huawei AppGallery (Publishing API: client
  credentials, an upload URL, the app's file information, submitted). Each
  store's first version is published by hand. The keys are on the dashboard's
  Publishing › More Android stores page, encrypted like the other store keys,
  and `/builds/{id}/secrets` sends them only to builds whose plan uploads.
- 42 Pro plan, optional: the APK to Xiaomi GetApps through the Xiaomi
  developer platform's automatic publishing API (`build/scripts/xiaomi_getapps.py`):
  `/dev/query` checks the app is on the store under the account and may take
  an update, then one multipart `/dev/push` sends RequestData (the account
  email, update type 1 and appInfo: the name on the store, the package, what's
  new, the privacy link), the APK and the 512 px icon, which submits it.
  Every request carries SIG: the MD5s of RequestData and each file with the
  API private key, as JSON, encrypted with Xiaomi's public certificate (RSA,
  PKCS#1 v1.5, in blocks) as hex. The keys (`apps.xiaomi_*`, the private key
  encrypted with its own context, the certificate kept as PEM) are on the
  same page; a push is never repeated, since a lost answer may still have
  submitted the update.
- 36 Huawei push: with the client's agconnect-services.json in the build
  config, the Android build includes `android/hms_push` (Huawei's Push Kit
  SDK) and the app's channel to it (`android/app/src/huawei`); builds without
  the file have nothing from Huawei. At start-up the app uses Push Kit only on
  phones without Google Play services that have Huawei Mobile Services, and
  registers that token with `provider: hms` (`PUT /me/push-token`). The
  hosted API (`lib/hosted/push.ts`) and the plugin (`Push\Hms_Sender`) send
  `hms` tokens through Push Kit (server API v1, the app ID and app secret,
  encrypted) and the others through FCM as before.
- A build is ready when its Android app was built (an iOS app that couldn't
  be built shows as a failed stage, with a message, and the team is
  emailed); it fails when the Android app couldn't be built. Messages are
  plain words for the client; the CI log is for the team only. A build that
  stops reporting (a cancelled run) is closed as failed after 6 hours, so
  the app can build again.
