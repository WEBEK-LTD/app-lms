# Travel, bookings and the other kinds: QA and fixes (18 November 2026)

ROADMAP Phase 180. Branch `wip-qa-travel-bookings`, from `origin/main` (app release 9).

## What was set up

### The platform

It ran locally the way the e2e suite runs it: `next build`, then `next start` with `playwright.config.ts`'s environment and the memory store. `APP_URL` pointed at a small local proxy that served:

- the app's **own web build from this branch** at `/preview-app/` (`flutter build web`, not committed; the committed preview isn't rebuilt);
- everything else from the platform.

### The app

It was driven in headless Chromium at 360×800, deviceScaleFactor 1, through Flutter's semantics:

- text at 1.3 by the browser's root font size;
- a customer signed in with each app's **store review number and code**, set in App sign-in (the preview never sends codes).

### Eight apps, made as an owner makes them

Each owner signed up and the team activated them. Then:

- **Safra QA**: from `/start?for=studio` → Hotels and flights, on Studio plan 1 with Travel ticked in Admin › Plans.
- **The seven classic kinds**: from their demos' "Make it yours" step: `/start/bookings`, `/start/clinic`, `/start/fitness`, `/start/events`, `/start/real-estate`, `/start/news` and `/start/charity`.

### The walk

Each app was walked with every tab and its end, three ways:

- English by day at 1.0;
- Arabic by night at 1.3;
- Turkish by day at 1.3.

The salon, clinic, gym, news and charity demos offer English and Turkish only, so their "Arabic" run is English by night.

### The code

The travel, bookings, events, real estate, news and donations modules were read against the hosted API's connectors. Every fix has a test that fails without it.

### The template guard

The guard (166, branch `wip-template-guard` b5e199b) was run over this branch for the travel templates: its test files were laid over a scratch worktree, and its fixtures were written again from this branch's platform.

## Not done, and why

- **The main flows weren't driven end to end in the app.** That is booking a slot, buying a ticket and donating; only every tab was walked. The preview has no checkout by design.
  - Travel's main flow (search → stay → price → book → the trip) is covered by the new e2e spec, against the API the app uses.
  - The other kinds' flows are covered by their existing e2e specs (`bookings-hosted`, `clinic-hosted`, `fitness-hosted`, `events-hosted`, `listings-hosted`, `news-hosted`, `donations-hosted`). Those weren't run in this session, only `travel-hosted` and the new spec.
- **Yallapp Business** wasn't opened.
- **The dashboard pages for each kind in ar and tr** weren't opened.
- **Notifications opening the right place** were checked in the code and in tests (180.4); there's no push in the preview.

## Bugs

Most serious first.

| # | Where | What a customer saw | Cause | Fix |
|---|---|---|---|---|
| 1 | Travel: Stays → hotel → Reserve | A flight looked at earlier and left was priced into the room | `tripChoiceProvider` kept it | **180.1** |
| 2 | Gym from the demo | "No classes this day", all week ([05](05-gym-no-classes-before-180.22.png)) | The timetable's classes were made only by the next day's job | **180.22** |
| 3 | Real estate and bookings pushes | The reply and a moved appointment opened Home | Sent as `announcement` with `inquiry_id` / `appointment_id` | **180.4** |
| 4 | Travel: checkout without card payments | "Confirm and pay", refused by the server | `Config.travel` offered paying now without a gateway | **180.17** |
| 5 | Safra signed in, no trip | An empty cover photo | The question shows signed out only; the ticket had no trip | **180.18** ([07](07-safra-signed-in-no-trip-after-180.18.png)) |
| 6 | Safra's Stays, Flights and Trips | The navy title unreadable over the photo | The look's header colour over a photo | **180.19** ([08](08-safra-tr-1.3-trips-title-after-180.19.png)) |
| 7 | Travel: flights found, Track | Off didn't stop the alert; on again made two | Not read from or written to Price alerts | **180.3** |
| 8 | Prices in the customer's currency: travel, events, homes, campaigns | Always the company's currency | No amount or currency beside the travel API's texts; listings and campaigns not converted; events sent a label only | **180.12, 180.13** |
| 9 | Bookings in Arabic and Turkish | "Approved", "Categories", "Our team"… in English | The hosted API wrote them in English | **180.5** |
| 10 | Studio's canvas, Safra | The question over the next trip's ticket ([01](01-studio-safra-hero-signed-in-and-out.png)) | It ignored signed in / signed out | **180.11** (a switch, signed out first) |
| 11 | Real estate in Arabic | "للبيع · Villa" ([04](04-real-estate-listing-ar-type-in-english.png)) | The property types' labels are English | **180.6** |
| 12 | Price filter and donation amount | Arabic digits refused; "1.500.000" dropped | ASCII-only parsing | **180.9** |
| 13 | Safra at text 1.3 (the guard) | The tab pill, Stay + flight and the departures overflowed | Fixed widths and heights | **180.16** |
| 14 | Flights' search, ar and tr at 1.3 | The travellers broken mid-word ("السياحي/ة", "Eko/nomi") | "Direct only" took the row | **180.20** ([09](09-safra-tr-1.3-flights-search-after-180.20.png)) |
| 15 | Every account look, tr at 1.3 | The phone number on two lines | No line limit beside Edit | **180.21** |
| 16 | A charity's home, tr at 1.3 | "Kampanyaları/mız" ([06](06-charity-tr-1.3-title-broken-before-180.23.png)) | One long word wider than its room | **180.23** |
| 17 | Smaller | See below | — | **180.2, 180.7, 180.8, 180.10, 180.14** |

The smaller ones (17):

- **180.2:** the hotels and flights found ended under Android's buttons.
- **180.7:** three flight amenities showed as raw ids.
- **180.8:** a membership's price only in the gym's currency.
- **180.10:** the "→" arrows pointed against the reading way in Arabic.
- **180.14:** five fixes:
  - an empty category said "No services yet";
  - an open real estate conversation didn't show a reply that arrived;
  - seats that didn't load in Manage booking said nothing;
  - the Categories block was offered for events, where it showed nothing;
  - the travel API's errors were found already translated, and a test keeps them so.

## Checked and not a bug, or not ours to change

- **Pay at the hotel when paying now is off:** already handled in the app.
- **The travel tabs' lists:** the travel shell's bar doesn't float over them.
- **Safra on Studio plan 1 without Travel:** `feature_disabled`, by design.
- **Samples priced in TRY:** demo samples are converted into the owner's currency, TRY until changed.
- **Sample content in English in Turkish and Arabic apps:** the owner's sample data, copied from the demos in English only, to replace with their own. This covers Safra's hotel themes ("Beach", "Spa"), the salon's and the clinic's services and categories, the events' categories, and the homes' and campaigns' titles.
- **"Appointments" cut to "Appoint…" in a five-tab bar at 1.3:** the bar's labels are one line by design.
- **Icons:** Material Symbols Rounded throughout these modules; no bracket placeholders.

## Screenshots

1. `01-studio-safra-hero-signed-in-and-out.png`: Studio before 180.11.
2. `02-safra-sign-in-en.png`, `03-safra-home-signed-out-en.png`: Safra's sign-in and home in the committed preview.
3. `04-real-estate-listing-ar-type-in-english.png`: before 180.6.
4. `05-gym-no-classes-before-180.22.png`: before 180.22.
5. `06-charity-tr-1.3-title-broken-before-180.23.png`: before 180.23.
6. `07-…after-180.18`, `08-…after-180.19`, `09-…after-180.20`: Safra after the fixes, from this branch's build.
