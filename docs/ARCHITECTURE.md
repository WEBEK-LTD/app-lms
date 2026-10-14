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

- The build config's `app_type` (`lms`, `store`, `booking` or `real_estate`) picks the module's routes
  and bottom navigation; everything in `core/` and `modules/shared/` is common.

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

- Plans paid by card (`plan_payments`): when Yallapp's iyzico account is set
  and a plan has a card price, pending clients see "Pay by card" on the
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
  with, even if the shop switched since.

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
  continue learning, embed and spacer. Blocks stack vertically; there is no
  free positioning. The server resolves lists (courses, products, services,
  posts, listings) into one `Item` card shape, so the app has one renderer for all
  of them. The app skips block types and actions it does not know, so old
  apps keep working when new ones are added.
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
  turn on more languages (Arabic shows right to left); students pick one in
  the app's settings, and page texts can carry a translation per language,
  falling back to English.
- **Purchases.** The iOS rule applies to every block: no purchase actions for
  paid content on iOS. Prices are display text only.

## Build pipeline

- GitHub Actions builds Android on Linux and iOS on macOS runners.
- Inputs: the client's build config from the platform.
- Outputs: APK, AAB, IPA, signing key (encrypted), store assets, stored on
  `files.yallapp.com.tr` and listed in the client's dashboard.
- Pro plan: upload to Google Play and TestFlight with the client's API keys.
- A build is ready when its Android app was built (an iOS app that couldn't
  be built shows as a failed stage, with a message, and the team is
  emailed); it fails when the Android app couldn't be built. Messages are
  plain words for the client; the CI log is for the team only. A build that
  stops reporting (a cancelled run) is closed as failed after 6 hours, so
  the app can build again.
