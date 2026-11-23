# Phase 228: Lujain A's own product page

Drawn by the real app (`mobile/test/screenshots/product_page_screenshots_test.dart`,
`--dart-define=YALLAPP_SCREENSHOTS=true`) from the project Lujain's look A
starts (`mobile/test/support/signatures/clothes_a.json`), for one of
Lujain's dresses with its own CC0 photos (`platform/web/public/clothes-photos`).
The page is 360 × 780 points at 3x. Each shot has its top and a second one
further down (`-2`).

- `lujain-a-product-light*.png`: by day
- `lujain-a-product-dark*.png`: by night
- `lujain-a-product-ar*.png`: in Arabic, right to left

The test draws the look's font (IBM Plex Sans Arabic) with the app's
bundled fallbacks (DM Sans, Readex Pro), because the test can't download
it. Without a header, the status bar and the back button stay over the
page as it scrolls, as on every pushed Studio page without a header.
