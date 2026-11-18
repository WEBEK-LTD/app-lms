# The vendor app's live orders, picking and stock (115.70–115.77), 18 November 2026

Branch `wip-market-vendor-app`. The approved designs are 08, 09 and 10 in
`docs/design/2026-11-18-marketplace/` on `wip-marketplace-designs` (newest:
f0dbb9f3, where 09 shows the D1 cap as "Card order: up to 750 g · EGP
120.00").

## The pictures

- `side-by-side/`: each approved PNG (left) beside the app as built (right),
  per screen, in English and Arabic, light and dark, at the designs' size.
- `built/`: the app's own pictures at 390 × 844 points and twice the pixels.

They come from `mobile/test/screenshots/vendor_screenshots_test.dart`, on
the Flutter widget tree with the app's bundled fonts and the demo's photos
(Zad Market's data from `mobile/test/support/vendor_fixtures.dart`):

```
cd mobile
TZ=Africa/Cairo flutter test test/screenshots/vendor_screenshots_test.dart \
  --dart-define=YALLAPP_SHOTS_OUT=../docs/qa/2026-11-18-market-vendor/built
```

## Where the app differs from the pictures, and why

- **The tab bar.** Orders, Picking, Stock, Offers and Account are there, in
  the app's own bar for its template (Bold): only the active tab shows its
  label, and the last tab is the account, as in every Yallapp app, not
  "More".
- **The night.** The app's dark palette (Yallapp's midnight) is used, not
  the designs' green night (`#09130E`); the header is the app's colour made
  deep, as in the light theme.
- **The fonts.** The app's font for the whole screen (Plus Jakarta Sans,
  Readex Pro in Arabic), with JetBrains Mono for SKUs and barcodes; the
  designs' Lexend numbers aren't used.
- **The desk** keeps its existing buttons under the header (Running late,
  Hours, Statements, Complaints) and its Done list after For later.
- **A new order's first line** (tag, number, who and when, price) goes onto
  two lines when it can't fit, with large text on a small phone.
- **The keypad** has every digit (two rows); the design's single row was a
  sketch of it. "From scale" says a connected scale comes later.
- **Scan** opens wip-market-app's camera scanner (mobile_scanner) on
  phones; the pictures and tests type the code, as on a phone without a
  camera.
- **Aisle icons** are one shelves icon; the designs' per-aisle icons
  (kitchen, grain, nutrition) aren't in the data.

## What was checked here (all run in this session)

- Flutter 3.47.5: `dart format --set-exit-if-changed lib test tool`,
  `flutter analyze` (no issues), `flutter test` (the whole suite), and the
  vendor tests: `test/widget/phase115_vendor_app_test.dart` (08–10 and the
  tabs: ringing, minutes, reasons, a picker; aisles, the cap per payment
  way, a waiting proposal, leave it out and their pick; stock search, out,
  price and offer, scan, add; Picking and Offers; every screen in en and
  ar, light and dark, text ×1.3 on a 360-point phone) and
  `test/widget/phase115_vendor_test.dart`.
- Platform: `vitest run` (the whole suite), `tsc --noEmit`, `eslint` on the
  changed files, `redocly lint` on the contract;
  `tests/unit/market-vendor-app.test.ts` (the vendor role, first names
  only, aisles, the D1 cap per payment way, the review account and its
  notes, the place's offers), `tests/unit/market-vendor-words.test.ts` (the
  app's words are the partner panel's).

## What needs a real phone

- The ringing: the system alert sound and the vibration every 6 seconds
  while a new order waits and the desk is open; with the app closed only
  the `vendor_order` push (wip-market-fixes) reaches the phone.
- The keypad, the 1.3× text and Arabic on a small Android phone and an
  iPhone, and the 5-minute countdown of a proposal against the server's
  clock.
- The store reviewers' sign-in with a live app's review number: the sample
  order needs the place open (and pick-up on, else it's delivered to the
  place's own address).
- The camera scanner in Stock, and the proposal, price edit and product
  form against a live server (wip-market-app and wip-market-catalog are
  merged; their routes are covered by their own tests and the fake here).
