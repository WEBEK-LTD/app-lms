# The rides and taxi templates by hand: QA and fixes (18 November 2026)

ROADMAP Phase 178. Branch `wip-qa-rides-taxi`.

## What was set up

The platform ran locally the way the e2e suite runs it: `next build`, then `next start` in memory mode (`YALLAPP_DATA=memory`, the e2e suite's secrets, a local listener for sign-in codes). The app was the committed web build at `/preview-app/` (release 9), in headless Chromium at 360 × 800, deviceScaleFactor 1.

Two owners, each signed up and activated by the team:

1. **Masar QA**: `/start?for=studio` → Masar Rides → "Start with this app" → "Create my app".
2. **Lamha QA**: `/start/taxi` → "Start with this app" → "Create my app".

Both on Studio plan 1; the team ticked Ride hailing, Live taxi and the second app on that plan (Admin › Plans) so the hosted API answers their rides. App sign-in got a store review number (+90 544 000 00 01) and code, the only way to sign in in the preview. No map tiles or place search were set up (Admin › Maps), so the maps say "Map not available" and places are picked with "Paste a maps link"; the preview's location was allowed by the test browser (see B6).

Then, in the dashboard, Masar's currency went to TRY and its sample types were replaced with **Sedan** (₺40 + ₺18/km + ₺3/min, at least ₺120) and **Minivan** (at least ₺180).

## What was tested

- Sign-in with the review number and a code, creating the account (name), Not now, sign-out is in Account (167).
- Masar: the home signed out and in, English / Arabic (RTL, dark) / Turkish; "Where to?", the quote (3.3 km, Economy E£46.10), the request, "Looking for a driver", the ride's page and its stages, "No driver found" and Try again; My rides empty and with rides, Chat, Account.
- Lamha: the same home in English and Turkish, "Where to?", the Ride page.
- The Drivers' app preview (Preview › Drivers' app) signed in with the review number.
- Dashboard: Ride settings, Vehicle types, Drivers, Rides, Live map in English, Arabic and Turkish.
- In Flutter tests (the real app on Masar's served pages, `mobile/test/support/phase178_masar_pages.json`): text 1.0 and 1.3 on a 360-point phone, light and dark.

## Bugs, most serious first

### B1. The home's car classes and fares were the template's (fixed, 178.1)

Masar's home showed **Economy from E£35, Comfort from E£50, Van from E£80**, and Lamha's **Taxi from E£35, Comfort from E£55, XL from E£85**, whatever vehicle types, fares and currency the company set: after the owner set lira and their own Sedan and Minivan, the home still said "Economy from E£35" while the quote offered "Sedan ₺…". Shots: `before-masar-home-signed-out-en.png`, `before-lamha-home-signed-out-en.png`, `masar-home-still-old-classes.png` (after the owner's changes), and the quote `before-masar-quote.png`.

**Cause.** The looks (`masar-signature.ts`, `lamha-signature.ts`) draw the classes as Studio cards with static words: the class word, "from E£" (`sigFareFrom`) or "E£" (`sigCurrency`) and the number from the demo's `RIDES_DEMO_TYPES`/`TAXI_DEMO_TYPES`. Served as saved, they never followed Dashboard › Vehicle types or Ride settings. The same kind of bug as Leqaa's categories (157).

**Fix.** `lib/studio/ride-classes.ts`: a row of the template's class cards (as the template left it) is served in hosted `GET /pages`, and drawn on Studio's canvas, as the company's offered vehicle types in their order (at most as many as the template drew), each card in the look of the template's at its place, with the type's name, its smallest fare, its seats, and the fare's words in the company's currency ("from ₺", "من ₺", "başlangıç ₺"; in pounds the template's words as they are). The pages' version follows the types and the currency, so an open app asks for its pages again. Apps already made have it with no change to their pages.

### B2. The Drivers' app preview was the riders' app (fixed, 178.4)

Preview › Drivers' app, signed in as the review driver, showed Masar's riders' home ("Finding your driver", the car classes) instead of the driver's screen. Shots: `before-drivers-app-preview-sign-in.png`, `before-drivers-app-preview-riders-home.png`.

**Cause.** The platform puts `role: "driver"` in the second app's preview config (112.3), but the app's `buildConfigFromJson` (the web preview's build config) never read `role`, so every preview was the customers' app. The same for the couriers', vendors' and staff's previews.

**Fix.** The role is read (`driver`, `courier`, `vendor`, `staff`; anything else the customers').

### B3. An empty frosted card over Masar's map (fixed, 178.5)

Signed in without a ride, a blank frosted strip sat under the greeting on the home and on top of the ride screen. Shots: `before-masar-home-empty-glass.png`, `before-masar-ride-two-headers.png`.

**Cause.** Masar's "On the way" is a glass column holding only the person's ride (`tracking` kind `ride`); the ride hides without one, but its glass, padding and corners stayed.

**Fix.** A row or column holding only live elements (the person's ride, the taxis near them, a list, an order…) that show nothing now shows nothing (`StudioNodeView.shows`).

### B4. Two headers on the ride screen (fixed, 178.6)

"Where to?" on Masar's home opened the ride screen with its Studio page's "Ride" header and back button, and under it the taxi layout's own toolbar: the app's name chip, a side-menu button (or a second back) and the bell. Shot: `before-masar-ride-two-headers.png`.

**Cause.** The taxi layout of `RideScreen` drew its toolbar whatever is over it; the list screens hide their title under a Studio header (`StudioScreenScope.hidesTitleOf`, 120), the map layout didn't.

**Fix.** Under a Studio header the toolbar has no side-menu button and no app chip; its back to "Where to?" (once a destination is set) and the bell stay.

### B5. A drawn map's words in English in Arabic and Turkish (fixed, 178.2)

In Arabic, Masar's map said Home, Office, Airport, DOWNTOWN, TAHRIR, ZAMALEK; in Turkish Lamha's said MAADİ and NİLE (the English "Nile" upper-cased in Turkish). Shots: `before-masar-ar-dark-map-words.png`, `before-lamha-tr-map-words.png`.

**Cause.** A map drawing's places, labels, route chips and sign have no translations: the template wrote them in the dashboard's language, and `GET /pages` served them as they were.

**Fix.** `lib/studio/map-words.ts`: a map word that is still one of the templates' (in any of the three languages) is served, and drawn on the canvas, in the language asked for; the maps' own words are read first, so "Home" is the saved place (المنزل), never the Home tab (الرئيسية). The owner's own words stay as written.

### B6. The app preview could not find the person (fixed, 178.3)

In the preview, "My location" failed: "Geolocation access has been blocked because of a permissions policy". A ride or taxi app can't be tried there without the person's position.

**Cause.** `/preview-app` and the Preview page sent `Permissions-Policy: geolocation=()` (155).

**Fix.** `PREVIEW_PERMISSIONS_POLICY` (`geolocation=(self)`) on `/preview-app/*`, `/dashboard/preview` and `/studio/project/preview` only, and the frame has `allow="geolocation"`; every other page keeps `geolocation=()`.

### B7. Lamha's Ride page had an invisible back button (fixed, 178.8)

The Ride page opened from Lamha's home had a working back button nobody could see (tapping the empty corner went back); the same for the bell on its My rides. Shot: `before-lamha-ride-invisible-back.png`.

**Cause.** Lamha's pages have a `brand`-style header the template gave a cream background (#FFFDF6) and navy ink; the brand style always draws its buttons white for the brand's own colour.

**Fix.** On a brand header with a background of the owner's, the buttons are white only on a dark one (luminance under 0.4), else in the header's ink.

### B8. "Nearest free taxi · 0 taxis around you, live" (fixed, 178.8)

Lamha's home, signed in with no taxi free near the person, said "Nearest free taxi" with "0 taxis around you, live". Shot: `before-lamha-home-no-free-taxi.png`.

**Fix.** With none free the card says "No free taxis near you" (the app's own words in its three languages), without the count.

### B9. Lists under the floating bar; the glass bar at 1.3 (fixed, 178.7)

My rides, the driver's ride lists and the ride sheet ended a fixed 24 points after their last row, under Masar's frosted bar on a short phone (158 fixed the other screens with `endRoom`). At a 1.3 text scale the glass bar's tab names overflowed the bar by a point (`app_nav_bar.dart`, a RenderFlex overflow in the Flutter test).

**Fix.** `endRoom` on those lists; the tab's name takes the room the bar has left (`Flexible`), drawn as designed when it fits.

### B10. Yallapp Business: an accepted ride in grey (fixed, 178.9)

On the Rides board (and a ride's page) a ride whose driver is on the way had the grey tag of an unknown status, unlike "Driver at the pickup" and "Booked for later" in blue.

**Cause.** `rideTone` named an `assigned` status; the Owner API's ride is `accepted` then (`docs/api/owner.yaml` `Ride.status`).

**Fix.** `accepted` in the blue.

### B11. The home's ride card and living map never followed the ride (fixed, 178.10)

The home's "On the way" card (and the living map's live route) read the person's ride once: "Finding your driver" stayed after the driver had accepted and arrived, and a ride that ended stayed shown, until the app was opened again (`activeRideProvider`, read once; the ride's own page reads every 5 seconds). Found walking the trip below.

**Fix.** `ActiveRideFollower` around the ride's card and a map whose route follows the ride: while one is on its way it is read again every 15 seconds, one timer for all of them on screen, stopped when they leave it.

### B12. The review number's riders' app was blocked by the drivers' app's sample rides (fixed, 178.11)

With the review number online in the drivers' app (how the store reviewers try it), the platform makes it a sample ride from the review account (105.2.6). The riders' app, signed in with the same number, then listed "App Review (sample)" rides at E£0.00, and "Request" said "You already have a ride on the way" for a ride the rider never asked for. Shot: `driver-review-sample-offer.png`. This is also what the "Your driver is coming" seen earlier on Masar's home was: the sample ride, not the rider's.

**Fix.** `GET /me/rides` and the "ride on the way" check leave out the sample rides (`RideQuery.notRiderName`, no migration); the drivers' app still gets them. With it, the review rider's own ride goes to the review driver, which is how the trip below was walked.

## The whole trip, after the fixes

With the fixes in a local build of the app preview (not committed) and of the platform, Masar in lira with its own Minivan:

1. The home: the car classes from ₺35 / ₺50 / ₺80 and the Minivan's (`after-masar-home-lira.png`), the map in Arabic by night (`after-masar-ar-dark-map-words.png`).
2. "Where to?": the Ride page with one header (`after-masar-ride-one-header.png`), the quote in lira (`after-masar-quote-lira.png`).
3. Requested, "Looking for a driver"; the Drivers' app preview is the driver's screen (`after-drivers-app-preview.png`), online it gets the ride at ₺46.10 (`after-driver-offer-real.png`), accepts (`after-driver-accepted-real.png`), at the pickup, starts it, ends it ("Collect ₺46.10 in cash", `after-driver-completed.png`).
4. The rider's My rides has only their own ride, completed, ₺46.10 (`after-masar-my-rides.png`); its page asks "How was your driver?" (`after-masar-ride-done.png`), five stars sent, "Thanks for rating." (`after-masar-rated.png`).

On the way: signing in to the drivers' app with the review number on another device signed the riders' app out (one device per account, App sign-in's rules), so its home showed nothing until it signed in again: as configured, not a bug. Without a geocoder the pickup's address is "My location" for the driver too (`after-driver-offer-real.png`); with Admin › Maps it is the street.

## Seen, not fixed

- **The template's stock photo for the driver.** Masar's "On the way" card falls back to the template's photo (`/stories/rides/rides-driver.jpg`) for a driver without a photo: a stranger's face stands for the real driver. Left: an approved design's picture; a choice for the owner.
- **Lamha's airport card** promises "One set price, day or night · To and from Cairo International": the rides settings have no airport price, and the airport is Cairo's. They are the template's words, editable in Studio; a company elsewhere should change them. Not changed (approved design, customer-visible wording).
- **The review driver's sample ride** is offered at E£0.00 (its fares are zero), and **its car** shows "Sample car · REVIEW" in English on the Turkish and Arabic dashboards (the sample's own words).
- **The maps' street drawings** stay the template's Cairo (the Nile, its districts' places): a picture, not data.
- **"Place search isn't set up"**: without Admin › Maps, the app asks `GET /maps/address` and gets 403 at each look up (only in the console); the screen offers "My location" and "Paste a maps link".

## Not tested here

- The card payment of a ride (a web page the preview doesn't open) and the start with the rider's code (Masar's settings had no code): the trip above was paid in cash.
- The trip with two different accounts: in the preview only the review number signs in, so the rider and the driver were the same account (as the store reviewers are).
- Real map tiles, place search, routes and live positions (no tile server or keys here).
- Push notifications and where they open (the preview has none).
- Lamha after the fixes: its home and Ride page were checked by hand before them, and its fixes (B1, B5, B7, B8) by the vitest and Flutter tests; the trip was walked on Masar, whose ride screens Lamha shares.
- Sign-in's other ways (email and a code, passwords, Forgot password): the preview signs in only with the review number; 160's tests cover them.
- Text 1.3 by hand: in the Flutter tests only (`phase178_rides_taxi_test.dart`, My rides and the glass bar).
- Yallapp Courier (Admin › Yallapp Courier): for delivery companies' couriers; ride and taxi drivers work in the company's own drivers' app (112.3), so it has no screens for these kinds.
- Yallapp Business's Rides board and a ride (125) were read in code and run in its tests, not by hand against a running Owner API (B10 above).
- Studio's editor by hand on every element (text, picture, button, list, ring, tile, size, corners, links) for these looks: the class cards are now the company's, and the rest goes through 156's publish path, which its own tests cover.
