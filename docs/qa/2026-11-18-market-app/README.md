# The supermarket in the customer app: built against the designs

Roadmap 115.40–115.46 (the marketplace audit's Stage 3), on `wip-market-app`.

Each picture puts two screens side by side at 390 × 844 points:

- **left:** the approved design (`docs/design/2026-11-18-marketplace/png` at
  `f0dbb9f` on `wip-marketplace-designs`);
- **right:** the Flutter app, rendered by
  `mobile/test/screenshots/market_store_screenshots_test.dart`.

The app side uses Zad's look A, with Zad Market's fixtures
(`mobile/test/support/zad_market_fixtures.dart`) and the demo's real CC0 and
public-domain photos (`platform/web/public/demo-photos`).

| Screen | Files |
|---|---|
| 01 The supermarket's home | `01-supermarket-home-{en,ar}-{light,dark}.png` |
| 02 A department | `02-department-…` |
| 03 A product by weight | `03-product-by-weight-…` |
| 04 The cart, inside the basket's checkout | `04-cart-…` |
| 05a The order being picked, with a substitute asked live | `05a-order-picking-…` |
| 05b On the way, weighed and final | `05b-order-on-the-way-…` |

To render them again:

    cd mobile
    TZ=Africa/Cairo flutter test test/screenshots/market_store_screenshots_test.dart \
      --dart-define=YALLAPP_SHOTS_OUT=<folder>

## Where the app differs from the designs, on purpose

- **Existing screens keep their current look, and the new parts are added on top**
  (the brief). The store's home is the vendor page:
  - its cover, mark, facts and support note stay;
  - search, offers, departments and "Buy again" come under them;
  - the aisle shelves stay below.

  The cart is the basket's checkout. The order screen keeps its header and its
  map card.
- **Arabic units are the app's own** ("كجم", "جم"). The designs use "كغ" and "غ",
  but the app already shows "/ كجم" next to them.
- **The cart bar says "View basket"** (the app's existing words), not
  "View cart".
- **Neither the picker's name ("Samir") nor the courier's rating and plate are
  shown.** The contract has none of them: the proposal reads "We found this…",
  and the courier card shows the first name and vehicle.
- **The courier's call button is left out.** Contact comes with Phase 184's
  `MarketTracking.courier.call`.
- **Without counts, the counts are hidden.** Products page by the cursor (Stage 1),
  and a cursor page counts nothing. When the server sends no count, "N of M shown",
  the aisle chips' counts and "9 products" are hidden, and "N shown" shows instead.
- **The order's progress bar (Placed, Accepted, Picking…)** stays the order
  screen's existing list of steps.

There are no pixel goldens against these PNGs. The designs are HTML renders, so a
pixel diff against the app's own fonts and layout would never pass. The repo's
golden pattern (`website_screenshots_test.dart`) compares the app with its own
committed shots, not with designs.

## Checks

See the report to the coordinator. The widget tests are in
`mobile/test/widget/phase115_store_test.dart`. Every screen above is checked in
en and ar, light and dark, at text scale 1.0 and 1.3 on a 360-point phone, for
no overflow and for right to left in Arabic.
