# Status

The current state of the project: what is released in the code, what still
needs checking against real services, and what a deployment needs.
`docs/ROADMAP.md` is the plan; this file is the current state.

Last updated: 16 November 2026.

## Current release

Roadmap 134 (pay inside the app for connected stores, Demo) is built for
WooCommerce: Payments › How customers pay offers Yallapp's checkout (its
own products), the store's checkout (the default) and paying inside the
app once the owner's gateway is connected and tested; the payment goes to
the owner's own gateway on Yallapp's payment page, and the order is then
made on WooCommerce, marked paid, once per payment (plugin 0.4.47); a
refused order waits as "Paid, needs attention" with Retry and Refund.
Wix, Shopify and the other platforms keep their own checkout (Known gaps).

Phase 133 (plans, billing periods and add-ons) is in the code: regular
plans are added, copied, ordered, hidden, archived and removed like
Studio's; every limit is editable, with the team's own limits and a
regular app's page limit; each plan has its main price and any of 1, 6,
12, 24 and 36 months or a lifetime price, chosen by the client on the
pricing page, the Plan page, `/pending` and the payment form, carried to
the payments (`plan_payments.months`, 0 for life), receipts, emails and
Admin; a lifetime offer card on the pricing page (`/pricing#lifetime`) and
the Plan page; and an add-ons store (Admin › Add-ons, Dashboard ›
Add-ons, migration `0133_plans_addons`) whose quantity and feature
add-ons raise the app's limits and switch features on wherever its plan
is read, and whose services are tasks for the team. At the owner's
request, the periods a plan's team hasn't priced, its lifetime offer
included, have suggested prices worked out from the plan's own monthly
or yearly price, and the publishing service has suggested prices (still
not offered); Admin shows them prefilled for the owner to edit or keep
(roadmap 133.12, 133.13).

Roadmap 132.110–132.115 (Admin working in a client's account, and apps
made, moved and copied for clients) is complete: our team's create paths
in a client's account no longer bounce to the admin, a banner shows whose
account it is, and every action there is in the audit log with the team
member's name; Admin can make an app for a client and open it as them,
move an app (with or without its data and its subscription) or only its
plan to another app with the owner's emailed 6-digit approval, and copy an
app into any account. Migration `0130_app_moves` (the requests, and
`apps.moved_at`, `apps.moved_to_client_id` for the read-only record an app
leaves behind).

Roadmap 132.180–132.185 (Payments in the console): `/dashboard/payments`
and `/studio/project/payments` are built in the console's look. At first
the page shows only its title, "Connect a card gateway" while none is
connected, the summary as four tiles (the gateway, the last test, the
webhook, the currency) and "Ways customers pay" as setting rows: the card
gateway (its keys and Test connection under Connect or Edit), bank
transfer and the owner's own way each with the console's switch, the days
to pay while either is on, how they work under "How it works". How
customers pay is one row (Change opens the ways); the payments made in the
app are a table, each in the inspector with Retry and Refund. The way rows
are `components/studio-page/way-row.tsx` (KitWayRow, KitWaySwitch: the
console's KitSwitch with the field a form sends). Events and Memberships
share the bank transfer form. `tests/screens/studio-payments.screens.ts`
takes the page's pictures.

Roadmap 132.150–132.153 (Studio's console): every Studio project page and
Your account and Team are in Studio's console (`app/studio/console.tsx`): a
midnight frame with an icon rail of the menu's groups and a panel of the
group open, the page on a rounded canvas under a bar with where it is,
Preview, the editor and the account's menu; a tab bar and a sheet on
phones. The page kit (`components/studio-page`) has the console's look
(segmented tabs, tiles, tables, a docked inspector from 1280 px); Products
is built as the design, with a new Featured switch. Orders, Plan and Your
account sit in it with their behaviour kept; the other project pages are
in the console's frame but keep their own markup until they move to the
kit.

Roadmap 132.130–132.134 (Studio's premium pages): a shared page kit
(`src/components/studio-page`: header, hero card, sections, rows with one
pill and one action, drawers, settings rows, folds, "?" help, empty
states; its colours `--sp-…` in `globals.css`, the dashboard's outside
Studio and the Studio frame's in it, light and dark) is applied to
Products, Orders, Plan, Your account and (132.145) Payments, in the
dashboard and in Studio alike; on Payments every way customers pay is in
one card, bank transfer and the owner's own way each with an on/off switch
(`manualPayments.bankTransferOff`, `customOff`). The other Studio project
pages and `/studio/team` still use the older page kit (`page-kit.tsx`)
until they move to it.
`tests/screens/studio-premium.screens.ts` takes their pictures.

Roadmap 132.1–132.8 (Studio dashboard fixes): a Studio project's menu has
every page of the dashboard that applies to the project, behind the
dashboard's gates, in six groups that fold away, with a quick search
(Ctrl+K), the person, language, dark mode and sign-out at its foot, every
page about the account reachable from it and from the account menu on the
bar (Your account and Team at /studio/account and /studio/team, the plan,
invoices, phones and updates in the project's frame), Payments under The
app, a food company's marketplace pages, and the bar on one line on phones; Studio › Screens shows and
sets whether sign-in (and the account's top) follows the system screens'
look or has its own, its preview draws sign-in, the code and a new account
as the app does, and the app draws the code screen and a new account in
sign-in's own look too; "Not now" and the back button work in every system
look (they were under the scroll view). Checks: platform unit tests and
e2e, flutter analyze and widget tests. Setting a password again
(Forgot password) keeps the app's own look.

Roadmap 131.54 (the documentation up to date for Phase 131) is complete:
a new article `delivery-and-offers` ("Delivery days, gifts and flash
sales", Delivery & offers' help link) explains the checkout, delivery days
and times, where the shop delivers and what it costs, gifts, card messages
by occasion, gift add-ons, the titles in the app, flash sales, the codes
shown in the app, Deliveries from the app and plugin 0.4.44's settings,
with what each source supports and what it doesn't; `studio-premium-elements`
adds the Flash sale element, sales on the cards, the coupon's premium looks,
the petal header, bar and system screens and the gift checkout's look;
`studio-templates` has Studio's ten demos with Leqaa's two looks, its ready
sections and the Petal home; and `studio-elements`, `yallapp-studio`,
`store-orders`, `app-types`, `wordpress-plugin` (and the plugin's readme)
and `my-own-api` follow, with the store's solution and features on the
website, in English, Arabic and Turkish. Phase 130's last items are
documented too: the academy's course screens (130.52–130.57), the team's
screens in the look (130.58), Monochrome luxe as the seventh premium
whole design, the seven landings (130.62 and Petal home) and photos in
black and white (130.61), with plugin 0.4.42 and 0.4.43.

Phase 131 (the flower shop) is complete: every store app, whatever its
source, has Delivery & offers (`lib/selling`, migrations
`0128_flower_shop` and `0129_gift_addons`): delivery days and times (a
same-day cut-off in the shop's time zone, next day, the days ahead, closed
weekdays, up to 8 slots with a capacity and a fee), the gift checkout (the
sender, the recipient with the address, the day and slot required, the
card), card messages by occasion (a starting set in English, Arabic and
Turkish), where the shop delivers and what it costs (flat, by city, by
distance, by weight, a city's own price, a minimum, free over an amount),
flash sales, coupons shown in the app and gift add-ons, with titles the
owner words. Yallapp's own products get all of it at Yallapp's checkout;
WooCommerce through plugin 0.4.44, its own shipping zones pricing
shipping; the connected platforms through `withStoreExtras`, their own
checkout charging their prices and shipping (Shopify and Wix keep the
details on their order, the others in Deliveries from the app for 60
days). In Studio, Leqaa (لقاء) is the tenth demo, a store with two
Signature looks (Rose hour, Botanical press); every app can take its
petal header, bar and system screens, the gift checkout's look, the
Petal home landing, the Flash sale element, sale badges and the coupon's
ticket and glass looks; its story is `/yallapp-studio/flowers`.

Roadmap 130.48 (the documentation up to date for Phases 128–130) is
complete: `studio-premium-elements` covers Studio's premium library
(Phase 129: sliders, stories, the ticker, video and parallax banners, the
gallery, before and after, motion as people scroll, testimonials, pricing,
numbers, progress, the timeline, the profile card, the bento grid, glass,
ticket and texture cards, the badge, the action bar, the small dock, the
maps' looks and the live route) and Phase 130's options (the live cards'
looks, the next trip, a greeting's words, the gold ring and this week's
days, the places as a deck), the premium headers and the system screens'
look; `studio-templates` covers the nine Studio demos as their look A, the
eighteen Signature looks on /start and among the templates, the six premium
whole designs and the app's words in Modern Standard Arabic; and
`studio-elements`, `yallapp-studio`, `wordpress-plugin` (0.4.40, 0.4.41),
`my-own-api` and `travel` follow, in English, Arabic and Turkish, with the
nine look B homes as screenshots and Sign-in and account's help link.

Roadmap 129.30 (the documentation up to date) is complete: the docs have
articles for every element of Studio's editor (`studio-elements`), the
premium elements of Phase 128 (`studio-premium-elements`, Phase 129's
elements added as they land), ready sections, templates and Studio's
demos with /start (`studio-templates`) and Travel (`travel`, Phase 126,
the outside providers "Coming soon"), and `yallapp-business` (1.0.2: the
Studio apps' tools, Prime and VIP), `yallapp-studio`, `wordpress-plugin`
(0.4.39) and `my-own-api` brought up to date, in English, Arabic and
Turkish, with the screenshots already in `public/screens`. The dashboard's
Travel pages, Studio's Help and the editor's Help link to them.

The website shows Yallapp Studio apart from the regular apps: its own page
(`/yallapp-studio`) with the editor, apps made in it, the Studio-only project
types, a Regular apps and Studio projects table and Studio's own plans (the
offered ones with their prices, else "on request"); its own demo page
(`/demo/studio`, the regular `/demo` unchanged); the two plan families apart
on `/pricing`; a section on the home page; a menu and footer link; FAQ
entries; a note on How it works; and the docs article `yallapp-studio`
(plus a Studio section in `plans-and-billing`), in English, Arabic and
Turkish. Its screenshots are real: the app's from the Flutter screenshot
tests (since 130.49 the Studio demos as they are now, their Signature looks
A and B by day and by night, `<demo's address>-sig-<a|b>-home(-dark)`, and
each demo's own screens), the dashboard's (`studio-editor`, `studio-home`,
`studio-project`) from `tests/screens/studio.screens.ts`.

Phase 126 (Travel: hotels and flights, phase 1) is complete: a Yallapp
Studio app type for a travel company's hotels, its fixed-seat flights or
both (migration 0127; `lib/travel`, the hosted API's Travel tag, the app's
`lib/modules/travel`). The team switches Hotels and Flights in Admin ›
client › Travel, which sets the app's tabs; the company adds its hotels,
rooms, rates, prices, open dates and flights in the dashboard (in Studio at
`/studio/project/travel`); people search, book a stay, a flight or both as
one trip and pay on the company's own payment page or at the hotel, then
follow the trip, its boarding passes and its flight's news in the app.
Safra is its demo on `/demo/studio`, with CC0 photos. The outside providers
(a hotel's own system, a hotel supplier, a live flight provider) are shown in
Admin as coming soon and are not connected.

Phase 111 (Studio setup fixes) is complete: in `/studio/project/setup` a
save that doesn't go through keeps the chosen design (and the other choices)
on screen and says why, its links and saves stay in Studio, a Studio project
is offered Studio's plans, and the Studio kinds' designs read in Arabic and
Turkish (`tests/e2e/studio-setup.spec.ts`).

Phase 110.2 (sample entries) is complete: choosing a design for an app
whose content is kept in Yallapp fills each empty list it shows with sample
entries (`sample` on the entries and categories, migration 0102;
`lib/samples`), in the app's main language (English, Arabic or Turkish;
English for others) and currency. The dashboard marks them, removes them
with their pictures and asks after the first own entry; store builds,
"We publish for you" and the team's store statuses wait until none are left.
The hosted API's public JSON is unchanged (no `sample` field).

Phase 110.3 (full templates) is complete: each of the 52 ready-made
designs is a whole app its owner only edits. Its home page has 8 to 12
blocks (three slides, the kind's lists, numbers, three quotes, questions,
a short story, contact and hours), the header of the pages in the tabs shows
the app's logo or name, and every design has About us (story, a team of
four with drawn pictures, numbers, six photos), Contact (map, hours, a form,
the contact details) and Questions pages, plus its kind's own (Pricing,
Offers and Delivery & returns, Catering, Prices, Our doctors and Patient
info, Timetable and Plans, Areas and Valuation, Visit and Hire, Our work and
Volunteer, How it works and a page to join as a courier, driver or partner,
Admissions). The texts are samples in the business's voice, marked in the
editor until changed, with Arabic and Turkish in the built-in dictionary.
The map's place is a sample the owner moves to theirs: the editor and the
draft preview show it, marked as a sample, but a published app never does
(the hosted API's pages and the plugin's layout leave a Location block at
the sample place out). The Social links block still comes only from the
business's own profiles.

Phase 104 (delivery and courier companies) steps 104.1 to 104.7 are
complete: a new project type in Yallapp Studio, Delivery, with no website
(a Studio project only, on Studio's plans). Customers send a
parcel (pickup and drop-off by address, their position, a pasted maps link
or the map), see the price as they type, pay in cash or by card through the
company's own gateway, and follow the stages and, where the company picks
it, the courier on a map. The company's couriers get a Courier tab in the
same app (no one else sees it): on duty, their jobs, waiting jobs to take,
each step, cash to collect and the position shared while a parcel is on the
way. The project's dashboard in Studio has Shipments, Couriers, Delivery settings
and the services; prices by distance, area or fixed, cash or card, jobs given or
taken and where couriers work are each company's choice. Delivery is the
Studio plan feature `delivery` (and `courier_app` for a second courier
app), ticked per plan in Admin › Plans › Yallapp Studio. A company that
picks the second app in its name gets it from Builds: the same app built
with the courier's screens only, under its own package name and bundle ID
(the app's own with `.courier`) and its own name, listed for the company's
couriers only (Unlisted on the App Store).
The store reviewers sign in with the App sign-in review number and code as
a customer and as a test courier (its parcels are its own; a sample job
waits in the courier app), and Publishing gives the notes for both apps.
Still to come: the shared Yallapp Courier app (104.8, published together
with the owner). Checks: redocly lint, platform unit
tests, tsc, eslint, flutter analyze and widget tests.

Phase 105.1 (food delivery from many restaurants) is complete: a new Studio project type, Food delivery (no website,
on Studio's plans). Customers browse the company's restaurants and their
menus, order from one restaurant (dishes with their choices, the delivery
fee from the restaurant by the company's delivery prices), pay in cash or by
card through the company's own gateway, follow the order and rate it. A
restaurant's staff (added by number on its page) get a Restaurant tab: new
orders, accept with the minutes it needs, turn down with a reason, ready,
busy for a while. The company's couriers deliver through the courier
screens of Phase 104; a courier job is made when the restaurant accepts an
order or once it is ready, as the company chooses. The dashboard in Studio
has Restaurants (details, hours, menu, staff and the company's share of each
order, set by the company), Food orders with a monthly statement per
restaurant, Courier jobs, Couriers and Delivery settings (with the cuisines
and the time zone). Food delivery is the Studio plan feature `food`. In
Studio, a food project starts from one of three ready-made designs
(Restaurants, Food offers, Food brand) and has its own welcome section;
its couriers can have their own app in the company's name (104.6), and the
store reviewers' notes walk through all three roles. Checks: redocly lint, platform unit tests (with the
isolation tests), tsc, eslint, e2e of the dashboard, flutter analyze and
widget tests.

Phase 105.2 (ride hailing, like Uber) is complete: a new Studio project
type, Ride hailing (no website, on Studio's plans). Riders set the pickup
and drop-off (their position, a maps link or the map), see each vehicle
type's fare and how soon a car can come, ride now or book for later, and
follow the ride: the driver, the car and plate, the driver on the map, the
code to tell the driver, sharing the ride's page, an emergency button;
they cancel by the company's rule (a fee carried into the next ride), pay a
card ride once it ends through the company's own gateway, and rate the
driver. The company's drivers (added by number, with their car, photo and
documents) get a Driver tab: online or offline, one offer at a time with the
seconds left to take it, arrived, start (with the rider's code when the
company asks for it), end, the cash to collect, their earnings by day, week
and month. Rides go to the nearest free driver of the vehicle type, then
the next one; or the company gives them out. The dashboard in Studio has
Rides (with the drivers online now), Drivers, Vehicle types and their
fares, Statements per driver and Ride settings (fares upfront or by the
meter, areas, promo codes, cancelling, the company's share). Ride hailing
is the Studio plan feature `rides`. In Studio, a ride project starts from
one of three ready-made designs (Rides, Ride offers, Ride brand) and has its
own welcome section; its drivers can have their own app in the company's
name (`.driver`, as 104.6), and the store reviewers' notes walk through
both roles (in the drivers' app the review driver gets a sample ride).
Every fare, fee and share is the company's: Yallapp sets none. Checks:
redocly lint, platform unit tests (with the isolation tests), tsc, eslint,
e2e of the dashboard, flutter analyze and widget tests.

Phase 105.9 (live taxi on the map) has its core: a new Studio project type
`taxi`, Live taxi on the map, on 105.2's rides engine (its fares, drivers,
matching and drivers' app). The company chooses its map on Maps & live:
Google Maps with its own key, or its own OpenStreetMap tile server with
optional search and routing servers, each with a test; and its own
Firebase Realtime Database, with a test and the rules to paste. Riders
open the app on a full-screen map with the free taxis around them moving,
choose where to, see the route, the fares and how soon, and follow their
driver coming second by second; drivers see the offer with its countdown
over the map, and their position is written live (a driver on a ride
leaves the cells riders look in). Without a live database the app asks
Yallapp every five seconds. The dashboard's Live map shows the company's
drivers (free, on a ride), the rides waiting at their pickup and the rides
going on now, updated every five seconds. Live taxis are the Studio plan
feature `taxi`. Its demo app (Lamha Taxi, 110.5) and the store reviewers'
notes are done: Publishing walks the reviewers through the map, asking for
a taxi and, as the test driver riders never see on the map, taking it.
Still to do in 105.9.6: the Studio designs. Checks: platform unit tests,
tsc, eslint, e2e of the dashboard, flutter analyze and widget tests.

Studio has its own demo apps on `/demo/studio`, apart from the regular
demos on `/demo`: Sahm Express (delivery), Sofra Eats (food delivery),
Masar Rides (ride hailing) and (110.5) Lamha Taxi (live taxi on the map),
Nakhla School (school) and Rawaq Academy (an academy with many teachers).
The team creates them with the other demos in Admin › Demo apps and picks
their builds there; until then the page shows "Coming soon". Visitors sign
in with the same demo number and try both sides: the customer, then the
courier, the restaurant's staff or the driver. In Nakhla School the demo
number is Lina (a student in Grade 5 A), her mother Rania (also Adam's, in
Grade 3 B) and Ms. Mona, Lina's class teacher, so what the visitor gives as
the teacher reaches Lina at once; the school day (homework, scores,
attendance, news, fees) is dated from today and made again by the daily
job. In Rawaq Academy seven teachers each have their published courses,
and the demo number is one more teacher ("Demo teacher", which students
never see) whose Teacher tab makes a course and sends it for review. In
Lamha Taxi the demo's eight drivers (never online, never offered a ride)
drive up and down streets around wherever the rider asks, worked out from
the time; the map is the platform's (Admin › Settings › Maps), and without
one the app shows the plain ride screens; there is no live database, so the
app asks Yallapp every five seconds. The daily clean-up removes visitors'
shipments, orders and rides, the teachers they followed and rated, the
courses they made as the demo teacher and what they wrote as the school's
teacher.

Phase 105.4 (schools) has its core: a new Studio project type `school`
(an app type of its own, on Studio's plans as the feature `school`). The
school adds its classes and subjects, its students, parents (linked to
their children by the student's code) and teachers, one by one or from a
CSV file, and the week's timetable. Teachers get a Classroom tab: today's
lessons, their classes, taking attendance (the families of those absent or
late are told), giving homework with files, marking what students hand
in, exams and their scores, and writing to a class and its families.
Students see their timetable, homework (handed in with text, a photo or a
PDF), grades by subject, attendance, fees and news; a parent sees the same
for each child and pays fees by card into the school's own account (or at
the school), each payment with a receipt at `/fee-receipts/<code>`. The
dashboard in Studio has Classes, People, Timetable, Attendance, Homework,
Grades, Fees, News and School settings. Every amount is the school's:
Yallapp sets none. Still to come: universities, report cards and grading
scales, the store reviewers' accounts for the three roles. Checks: redocly
lint, platform unit tests (with the isolation tests), tsc, eslint, e2e of
the dashboard, flutter analyze and widget tests.

Phase 105.3 (academies with many teachers, like Udemy) is complete: a new
Studio project type, an academy whose teachers each publish their own
courses (the Academy app type with the vertical `instructors`, on Studio's
plans). The academy adds its teachers by number (or lets people apply from
the app), sets each one's share in percent, features some, and publishes
or returns (with a note) the courses they send. Teachers get a Teacher tab:
their courses, sections and lessons (a video link, an uploaded video or
PDF into the academy's Media library, or text), sending a course for
review, their students' questions (answered in their name) and their
earnings this month, last month or this year. Students browse the teachers
(by name or subject, featured first), open a teacher's page, follow them
(a push when they publish a course) and rate them once in one of their
courses. The dashboard in Studio has Teachers, Courses to review and
Teacher statements for any period, from paid orders after coupons and
refunds. Academies with many teachers are the Studio plan feature
`instructors`. In Studio, such an academy starts from one of three
ready-made designs (Teachers, Course offers, Academy brand), and Studio
pages can open its teachers and the Teacher tab; the store review account
is a student and a test teacher students never see. Every price and share
is the academy's: Yallapp sets none. Checks: redocly lint, platform unit
tests (with the isolation tests), tsc, eslint, e2e of the dashboard,
flutter analyze and widget tests.

Phase 103R (Yallapp Studio as the owner approved it) is complete. A
Studio page is a tree of elements (`AppPage.studio`): rows, columns, layers,
grids and sliders; texts, pictures, buttons, lists with the owner's own card,
categories, videos, forms, maps, ratings and search, sized to fill, hug or a
fixed size, light and dark, with motion. Done:
- the contract;
- the editor at `/studio/editor`, as in the approved design;
- serving by the hosted API and plugin 0.4.26, with forms on a Studio page
  answered like the form block;
- the app drawing the tree natively;
- Studio's own section of the account: its home with the projects, a new
  project in three steps and each project's dashboard, as the owner
  approved them; Studio projects (`App.section` "studio") apart from the
  regular apps, on Studio's own plans (Admin › Plans › Yallapp Studio);
- templates and ready sections for each project type, its own first (the
  shop, a restaurant's menu, courses, services, listings, news, events,
  charity, the delivery company's), then the ones for every project.

Studio's plans are offered once the team turns them on and prices them;
until then a project designs and tries everything, and publishing it to
the stores waits for a plan. Checks: redocly lint, platform unit tests, e2e
of Studio's section and editor, composer lint, plugin unit tests, flutter
analyze and widget tests.

Phase 102 (a store review account in every app, required) is complete:
Publishing › Store review account holds the reviewers' sign-in for every
app (App sign-in's fixed number or email and code where Yallapp signs people
in; an account of the site or API, its password encrypted, elsewhere), with
the steps for Play Console and App Store Connect. Ready to submit and the
checks before a build need it. Checks: platform unit tests, e2e of
publishing and the client flow.

Phase 101 (header types in the regular editor) is complete: Pages & look ›
Look › Header offers Title, Centered, Logo and Search, with up to four
buttons (search, cart, notifications, chat, account). The app shows it on
the pages in the bottom tabs; WordPress sites pass it on from plugin
0.4.24. Checks: redocly lint, platform unit tests, composer lint and the
plugin's integration suite, flutter analyze and widget tests.

Phase 100 (courses and memberships bought in the app through Google Play
Billing and the App Store's in-app purchase) is complete (steps 100.1 to
100.7):

| Step | What | Checks |
|---|---|---|
| 100.1 | Contract: store products, purchases, notifications, `Config.store_billing` | redocly lint |
| 100.2 | Store connections and products in Google Play and App Store Connect | unit, e2e, MariaDB migrations |
| 100.3 | Purchases checked with Google and Apple, access given and taken back | unit (with the store suite on MariaDB), e2e |
| 100.4 | WordPress plugin 0.4.23: gives and takes access on the site | composer lint, `php -l`, PHPUnit, the LMS integration suites |
| 100.5 | App: Google Play Billing and StoreKit, restore, manage subscription | dart format, flutter analyze, flutter test |
| 100.6 | Sales in Analytics and the Owner API, the guide, the terms | unit, e2e (analytics, owner API, public pages) |
| 100.7 | Apps on their own API, Teachable and Thinkific schools | unit, MariaDB store suites, e2e of the dashboard |

## To verify against real services before release

- 133 A Kashier payment for 6, 24 or 36 months, for life and for an
  add-on (the amounts are the team's prices; the flow is the plans').

These parts were tested against recorded answers or could not run in the
test environment:

- The plugin's calls into LearnDash and WooCommerce Subscriptions (both are
  paid plugins).
- Teachable's enrolment calls (`POST /enroll`, `POST /unenroll`), its price
  unit (taken as the minor unit) and its `one_time` payment type.
- Thinkific's enrolment calls (`POST /enrollments`,
  `PUT /enrollments/{id}` with `expiry_date`) and its `one-time` payment
  type.
- Restore purchases on an iPhone, and phones without Google Play.
- 117 The website's live activity feed (`/api/live-activity`) is cached a
  minute by `Cache-Control: s-maxage=60`; that Netlify's CDN keeps it per
  `?lang=` is not checked on Netlify yet.
- 134 Pay inside the app (Demo) on WooCommerce: the plugin's
  `POST /store/paid-orders` prices with WooCommerce's cart and makes the
  order with its checkout (`WC()->checkout()->create_order`) in a REST
  request; its store integration checks (`store-test.php`) need
  WordPress and WooCommerce downloads, so they run in CI only. A real
  Stripe, PayPal, Kashier, Fawaterk or iyzico test payment end to end, a
  shop with taxes added at checkout, HPOS and a shop with shipping zones
  by postcode are still to try.

## Known gaps

- 134 Pay inside the app is WooCommerce's only. Shopify's API terms keep
  payments on Shopify Checkout; Wix's Create Order needs an app or Wix
  user identity (the connection has a visitor client ID and an account API
  key) and is limited to 5 calls an hour per site for apps not published in
  the Wix App Market, which couldn't be confirmed against dev.wix.com from
  here; ikas (`createOrderWithTransactions`), Salla and Zid have order APIs
  their connections have no write scopes for. A payment whose order the
  store refused waits for the owner (no automatic retry). The payment page
  asks for a city and an address, not a postcode or state, so a shop
  priced by postcode zones gets its country's rate.

- 132.40 An app started from a demo in Arabic or Turkish has its pages,
  tabs and template words in that language, but the demo's own entries
  (its products, dishes, places, courses, listings) stay in English: they
  are one-language records. The sign-in code and receipt emails to an
  app's users are in English. The app picks the phone's language when it
  offers it, and its main language only otherwise.
- 133 A lifetime license's plan is changed by the team only (no self-serve
  upgrade or downgrade); builds per month and apps per account can be the
  team's own limits, shown to clients but not counted by the platform;
  quantity add-ons for team members are shown, as the team members limit
  itself is.

- 132.112 After a move without its data, the builds already on people's
  phones talk to the app in its new account, and their accounts stayed in
  the old one's archived record: they sign up again there. A ticket or
  booking kept in the archive names an event or service of the moved app,
  which the archive can't show by name.
- 132.113 The move's emails (the code, done, added) are written in
  `lib/apps/move-mail.ts` and can't be edited in Admin › Emails.
- 132.114 A copied page's lists keep their hand-picked entries when they
  are the app's products, listings, articles, events, campaigns, services,
  restaurants, hotels or teachers; any other entry a page names by its
  number keeps the source's number. Media files are copied through the
  media server chunk by chunk in the request; a very large library can
  take long, and a file that fails is named in the audit log.

- 131 A flash sale's units aren't counted from a connected platform's
  orders (its own checkout sells them).

- 126 Travel: the outside providers are not connected (Admin shows them as
  coming soon); the hotel map is drawn by the app from the hotels' places,
  without map tiles; a trip can't be split into several payments, and the
  boarding pass can't be added to a phone's wallet yet.

- The Owner API returns `in_app_sales`, but Yallapp Business does not show it
  yet.
- Apps built before Phase 102 without a review sign-in can't start a new
  build until the owner adds one on Publishing.
- Until an app turns on in-app purchases, its Android app keeps the website
  checkout for paid courses.
- An app on its own API returns `store_billing` and the `store` action from
  its own API (the developer guide's "Sell in the app").
- Studio pages need the app update that draws them: older apps show a
  Studio page empty. The Studio editor shows the canvas left to right; the
  app mirrors it in right-to-left languages.

- 110.2 A sample category the owner renamed is still a sample: Remove all
  samples deletes it when none of the owner's entries is in it. A gym's
  sample classes are bookable services (no sample timetable).
- 110.5 Files visitors upload in the Studio demos (a demo teacher's lesson
  videos and PDFs, homework handed in with a photo) stay in the demo app's
  Media library: the daily job doesn't remove them. Lamha Taxi shows its
  live map only once Admin › Settings › Maps has tiles.
- 117 The live activity card names a paid subscription's country from the
  account (billing cities aren't kept), shows apps gone live only through
  "We publish for you" (the store from Publishing's events), and its demo
  cards start with sign-ins after this release. The privacy policy doesn't
  mention the card's consent box or demo sign-ins yet.

## Deployment

- 134 Migration `0137_connected_pay` (the table `store_platform_orders`).
  Plugin 0.4.47 (pay inside the app) goes to sites with the app update
  that knows `StoreConfig.checkout_payment`; an older app or plugin keeps
  the store's own checkout.

- Migrations up to `0097` (`npm run db:migrate` in `platform/web`).
- 131 Migrations `0128_flower_shop` and `0129_gift_addons` run with the
  others. Plugins 0.4.44 and 0.4.45 go to sites after the app update with
  the delivery picker, the gift checkout, "Where it goes" with the pin
  map, "Add a little more" and the petal chrome.
- Delivery apps (Phase 104): turn on the plan features `delivery` and,
  for a second courier app, `courier_app`, with their prices, in Admin ›
  Plans; set the map tiles (an address with `{z}`, `{x}`, `{y}` and its
  attribution) in Admin › Settings › Maps before any company picks the
  live map. Without tiles, maps show the stages only.
- Food delivery apps (105.1): turn on the plan feature `food`, with its
  price, in Admin › Plans › Yallapp Studio.
- Ride hailing apps (105.2): turn on the plan feature `rides`, with its
  price, in Admin › Plans › Yallapp Studio; the drivers' own app is the
  plan feature `courier_app`, as for couriers.
- Live taxi apps (105.9): turn on the plan feature `taxi`, with its
  price, in Admin › Plans › Yallapp Studio. Each company brings its own
  map (Google key or tile server) and Firebase Realtime Database.
- Academies with many teachers (105.3): turn on the plan feature
  `instructors`, with its price, in Admin › Plans › Yallapp Studio.
- Schools (105.4): turn on the plan feature `school`, with its price, in
  Admin › Plans › Yallapp Studio. Fees by card need the school's own
  payment account (School settings) and card payments in the plan.
- Google real-time notifications use one Pub/Sub topic for every app
  (`GOOGLE_PUBSUB_PUSH_EMAIL`, `GOOGLE_PUBSUB_TOPIC`; see
  `docs/LAUNCH-CHECKLIST.md`). Each app's owner enters the topic in their own
  Play Console › Monetization setup; the platform finds the app by its
  package name.
- Plugin 0.4.23 goes to sites once the app update with in-app purchases is
  in the stores; 0.4.24 (the header), 0.4.26 (Studio pages), 0.4.27
  (107.2: more style on Studio pages), 0.4.28 (107.3: new Studio
  elements) and 0.4.29 (109: the More tab and the tab bar's look) after
  the app update that shows them.

## Planned (to agree on before any work)

- More Studio project types (Phase 105): see `docs/ROADMAP.md`.
- Studio Market, the Studio template marketplace (Phase 106), no longer
  postponed: stage 1 (designers, free templates reviewed once, applying,
  moving and going back to the previous design) is built, in the look the
  owner chose ("Gallery" in light, "Night showroom" in dark); stage 2 (paid
  plans, checkout with Kashier, renewing, the reminders and the end of a
  plan) too. The designers' money, and discounts with the public
  `/templates` page follow (see `docs/ROADMAP.md`).
