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
  fetch: nothing in the nudge is trusted.

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
off, three times as tall as the visible box so what it still draws along its
edges falls outside it, under a transparent layer that takes every touch,
and under the poster before it starts and after it ends. The page reports
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
    forgotten on sign-out) and shows them without a connection.

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
  merchant; Fawaterk: the payment methods). Amounts go out as decimal
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
  `app:payment:<app id>`). Refunds are made in each provider's panel.
  Test runs point `IYZICO_API_URL`, `KASHIER_API_URL` and
  `FAWATERK_API_URL` at fake servers (refused on Netlify).

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
  first (404 or 405 ignored), then Yallapp's. The preview sends its token
  (`X-Yallapp-Preview`) only to Yallapp.
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
  amount when known), `search` and `push_open`. One invalid event fails the
  batch (400); events older than 7 days or 10 minutes ahead are skipped and
  counted in `dropped`. The country comes from the request (`x-nf-geo` or
  `x-country` on Netlify, or our proxy's `X-Yallapp-Client-Country` with its
  secret); the IP is used only as a rate-limit key.
- **Storage** (`lib/analytics`, migration `0036_analytics`).
  `analytics_events` keeps raw events for 40 days, without the search text.
  `analytics_daily` (app, UTC day, metric, key, label, value) keeps totals
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
