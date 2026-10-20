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
- The **plugin** talks to Yallapp only for license checks and plugin updates
  (site URL, plugin version, license key), the app's layout, and, when
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

A lesson video, a video in lesson text or a page's video block never shows
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
  `vertical` (`restaurant`, `clinic`, `fitness`, `charity`; `apps.vertical`,
  build config `vertical`, `Config.vertical`) is the kind of business and only
  changes wording, defaults, the demo and marketing, never routes. The
  dashboard's app type picker shows kinds (an engine with a vertical). What
  each engine and kind is (names, icons, websites it offers, its own content,
  page sources, default pages, store categories, demo and marketing pages)
  lives in one registry, `platform/web/src/lib/app/kinds.ts`; the platform
  reads every per-type value from it. The app's wording helper is
  `mobile/lib/core/l10n/vertical_wording.dart`.
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
  - one connection per function invocation, so cPanel's connection limit is
    never reached.
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
  details (WhatsApp number and email, shown on every page, in the dashboard
  and in email signatures; saving rebuilds the pages made ahead of time),
  the sign-in code sender, the email server, Yallapp's own iyzico account
  and the marketplace commission on the admin's Settings page. A saved setting replaces the matching Netlify variables
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
    plugin's `features.push` and `features.offline` follow them when the
    license is enforced.
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

- Selling through Yallapp (iyzico marketplace): with Yallapp's iyzico
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
  `analytics_events` keeps raw events for 40 days, without the search text.
  `analytics_daily` (app, day, metric, key, label, value) keeps totals
  until the app is deleted (both cascade with `apps`). Search texts are
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
  budget) and deletes raw events older than 40 days; the dashboard counts
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
  marketplace keeps its own provider (`paymentProvider`). Edits from before
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
  index and every article), developers, terms, privacy, refund, sign-in,
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
  the file in `chunk_bytes` chunks straight to the media gate (`PUT` with
  `Upload-Offset`; `HEAD` for the offset; a 409 carries on from the gate's
  offset), then `complete`. An unfinished upload is remembered with its file
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
    the headers the app sends and reads (`Rest\Cors`). A pending WordPress
    app shows "paused" until its plugin is connected and its plan is active;
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

## Pages, looks and languages

Clients build their app's pages and pick its look in the client dashboard,
without a new build. The app renders whatever the API sends.

- **Looks.** `Config.appearance` carries the template, the opening mode
  (system, light or dark), whether students can switch it, the font, the
  secondary color, corners and card style. The build config only sets the
  defaults used before the first `/config` and when `appearance` is missing.
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

- **Signed links** (`lib/media/signing.ts`): `/media/<op>/<app>/<id>.<ext>`
  with `expires` and an HMAC-SHA256 `sig` over the path and parameters, with
  `MEDIA_SIGNING_SECRET` (the gate's `config.php`). `v` plays (GET/HEAD with
  range requests; `dl=1` as an attachment), `u` uploads, `s` reports what's
  on disk, `d` deletes. The operation is signed, so a playing link can't
  upload, and an upload link can't write past its signed `size`.
- **Uploads**: the dashboard's Media page starts an upload (type and size per
  file checked, the size reserved in the app's storage at once, a
  `media_files` row "uploading"), then the browser sends 5 MB chunks straight
  to the gate (`PUT` with `Upload-Offset`, written to `<id>.part` with a lock
  and renamed when the last byte arrives; a wrong offset answers 409 with
  where it stands). A broken connection retries; choosing the same file again
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
