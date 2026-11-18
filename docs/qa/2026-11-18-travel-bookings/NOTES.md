# Travel, bookings and the other kinds: QA and fixes (18 November 2026)

ROADMAP Phase 180. Branch `wip-qa-travel-bookings`, from `origin/main` (app release 9).

## What was set up

- **The platform** ran locally the way the e2e suite runs it: `next build`, then `next start` with `playwright.config.ts`'s environment and the memory store.
- **The app** was the committed web build at `/preview-app/`, at 360×800 with deviceScaleFactor 1, in headless Chromium, driven through Flutter's semantics.
- **The apps were made the way an owner makes them:**
  - Safra QA: signed up, activated by the team, started from `/start?for=studio` → Hotels and flights, then given Studio plan 1.
  - Nile Homes QA: `/start/real-estate` → Start with this app → Create my app.

  The classic demos are at `/start/bookings`, `/start/clinic`, `/start/fitness`, `/start/events`, `/start/real-estate`, `/start/news` and `/start/charity`.
- **The code was read against the server.** The app's travel, bookings, events, real estate, news and donations modules were checked against the hosted API's connectors. Every finding was checked in the code. Each fix has a test that fails without it.

## What was not done, and why

- **Not walked screen by screen in the running app:** every screen of every kind, in en/ar/tr, light and dark, at text sizes 1.0 and 1.3, with Studio edits published and compared.
  - The preview app needs the store review number and code to sign in. Its checkout is off by design.
  - A full walk of the seven kinds was more than this session had time for.
  - What was walked: Safra's sign-in and home (signed out), Studio's editor on Safra, and a real estate listing in Arabic.
- **Yallapp Business** (appointments, events, donations, the inbox): not opened.
- **The dashboard pages for each kind in en/ar/tr:** not opened, except Setup and the Studio editor.

## Bugs

Most serious first.

| # | Where | What a customer saw | Cause | Fix |
|---|---|---|---|---|
| 1 | Travel: Stays → hotel → rooms → Reserve | After opening a flight's fares and going back, a room booked from Stays opened "stay + flight", with the old flight in the price and asking for every traveller's name | `tripChoiceProvider` is app-wide. Only the flight searches cleared it; Reserve went to the bundle whenever a flight was held | **180.1** The flight goes with the room only when the trip is underneath (`travelTripBelow`). From the trip's Change, Reserve goes back to that trip instead of stacking a second one |
| 2 | Real estate and bookings pushes | "Nile Homes replied" and "Your appointment moved" opened Home | Both are sent as `announcement` with `inquiry_id` / `appointment_id`; `pushTargetLocation` only knew `course_id` | **180.4** Opens `/messages/{id}` and `/appointment/{id}`. The reply's title is now in the app's language |
| 3 | Travel: flights found, Track | Off didn't stop the alert, so prices kept coming. Always showed off. On again made a duplicate | Local `bool`, never read from or written to Price alerts | **180.3** Starts from the matching alert; off deletes it; on again adds none |
| 4 | Bookings (salon, clinic, gym) in Arabic and Turkish | "Approved", "Pending" on appointments; "Categories", "Services", "Your next appointment", "Our team" on the home | Hosted API wrote fixed English (`BOOKING_STATUS_LABELS`, the connector's titles); the app showed them as they came | **180.5** The hosted API writes them in the request's language (`lib/bookings/words.ts`); the app maps each state to its own words |
| 5 | Real estate in Arabic ([04](04-real-estate-listing-ar-type-in-english.png)) | "للبيع · Villa · Maadi, Cairo"; the filter chips "Apartment", "Villa" | `PROPERTY_TYPES` labels are English, and the app showed `type_label` | **180.6** `propertyTypeLabel` by key |
| 6 | Real estate filter and donation amount | Arabic digits never appeared in the price filter. "1.500.000" dropped the filter, "1.500" meant 1.5. Arabic digits gave "Enter an amount" | ASCII-only input filter and parsers | **180.9** `latinDigits`, `parseTypedNumber`, `TypedNumberFormatter` |
| 7 | Gym: Membership | A plan's price only in the gym's currency | Screen used `price.formatted` and ignored the `display` the server sent | **180.8** |
| 8 | Travel: a flight's details | "power", "entertainment", "lounge" shown as stored | Only wifi and meal were mapped | **180.7** `flightAmenityName` |
| 9 | Travel in Arabic | "07:30 → 09:40", "Sun 14 Nov → Thu 18 Nov": the arrow points against the reading way | Hard-coded "→" | **180.10** `route()` |
| 10 | Travel: hotels found, flights found | The last card under Android's navigation bar | Fixed bottom padding under `SafeArea(bottom: false)` | **180.2** `endRoom` |
| 11 | Studio's canvas, Safra A home ([01](01-studio-safra-hero-signed-in-and-out.png)) | The owner sees "Where does the next story begin?" over "Your next trip · in 4 days / Bali / 4 nights at Safra Bay Resort" | The canvas ignores `visibility` (signed in / signed out) and draws both. The app draws one ([03](03-safra-home-signed-out-en.png)) | **Not fixed (180.11):** needs a "Signed in / Signed out" switch on the canvas, a design decision |
| 12 | Travel prices | Hotels, rooms, flights and the trip always in the company's currency | The travel API sends `*_formatted` texts only, no money objects the display converter can read | **Not fixed (180.12):** a contract change for the server and the app |
| 13 | Event cards, donations, listings | Event lists show the organiser's currency only; donations and homes are never converted | `eventSummaryJson` sends no amount; donations and listings aren't in `DISPLAY_CONNECTORS` | **Not fixed (180.13):** to decide with 12 |
| 14 | Smaller | A Services list on an empty category says "No services yet" (the chips still lead out). An open real estate conversation doesn't show a reply that arrives. A Studio Categories element on an events page is empty. Travel's server errors are English. A failed seat map says nothing | — | **Not fixed (180.14)** |

## Checked and not a bug

- **"Pay at the hotel" when paying now is off:** the booking screen already switches to it (`booking_screens.dart`, line 801).
- **The travel tabs' lists (Explore, Trips, Saved):** the travel shell's bar doesn't float over them. The bottom padding under it is 0.
- **Safra on Studio plan 1:** its travel API answers `feature_disabled` (403). This is by design: Travel is a plan choice, as `travel-hosted.spec.ts` expects.
- **A real estate app from the Nile Homes demo:** its samples are in TRY. They are converted into the owner's currency on purpose (`samplePrice`), and a new app's currency is TRY until the owner changes it.
- **Icons:** every travel, bookings, events, real estate, news and donations file uses Material Symbols Rounded (`Symbols.*` and `AppIcon`). No bracket placeholders in these modules.

## Screenshots

1. `01-studio-safra-hero-signed-in-and-out.png`: Studio, Safra A's home: the signed-out title over the signed-in trip.
2. `02-safra-sign-in-en.png`: Safra's sign-in in the preview, 360×800.
3. `03-safra-home-signed-out-en.png`: Safra's home signed out: the title, without the trip.
4. `04-real-estate-listing-ar-type-in-english.png`: a home in Arabic with "Villa" in English (the build before 180.6).
