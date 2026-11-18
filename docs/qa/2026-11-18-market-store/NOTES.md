# Marketplace (Zad) and the classic store: QA and fixes (18 November 2026)

ROADMAP Phase 177. Branch `wip-qa-market-store`, from `origin/main` at
`a9350e6` (app release 9). Line numbers marked "before" are from that
commit.

## What was set up

The platform ran locally the way the e2e suite runs it: `next build`, then
`next start` with `playwright.config.ts`'s environment (the memory store,
the fake payment and code servers). The app was the committed web build at
`/preview-app/` (release 9), in headless Chromium at 360×800,
deviceScaleFactor 1. Text size 1.3 was set through the page's root font
size, which Flutter web follows.

- **Zad (marketplace).** Owner "Nour Haddad" signed up (WhatsApp +20),
  and the team activated the account. The owner made **Souq Nour** from
  `/start?for=studio` → Zad (`/start/multi-vendor`), look A "Market
  arches" → "Start with this app". The admin gave it Studio plan 1. A
  store-review number (+20 100 555 0177, code 177177) was set on App
  sign-in, because the preview signs in only that number.
- **The classic store (engine `store`).** Owner "Defne Aksoy" (+90) made
  **Lale Shop** from `/start` → the app editor's store demo (Lale
  Flowers, `/start/store`) → "Start with this app", on the Pro plan. Then:
  published in Pages & look, a review number (+90 532 555 0177), "Your own
  method" as a payment way, and a coupon LALE10 shown in the app.
- **Yallapp Business.** Its Owner API calls (`/api/owner/v1`), signed in as
  each owner: the marketplace's orders, an order and the vendors; the
  store's products (stock) and orders. Its widget tests for those screens
  were run.

## What was tested

| Area | en | ar (RTL) | tr | dark | 1.3 at 360 | How |
|---|---|---|---|---|---|---|
| Zad: start from Studio and from /start, Studio publish | yes | — | — | — | — | the dashboard, Studio |
| Zad: a Studio text edited and published, as served | yes | yes | yes | — | — | Studio, then `GET /pages/home` in each language |
| Zad: sign-in by phone (review number), the name step | yes | yes | — | — | — | the app |
| Zad: home, a vendor's page, its aisles and cover buttons | yes | the vendor page (widget test) | — | — | the home | the app; widget tests |
| Zad: the basket across two items, the checkout, pick-up, a coupon, placing an order | yes | yes | the API | — | — | the app; `POST /market/quote` |
| Zad: the bar's five tabs | yes | — | — | — | — | the app; widget test with the template's real project |
| Zad: Account, My orders, an order | yes | — | — | — | — | the app |
| Zad: the dashboard's marketplace pages | yes | yes | yes | — | — | the dashboard (7 pages each) |
| Zad: Marketplace settings and Offers reach the app | yes | — | — | — | — | pick-up off/on in `Config.market`; a coupon in the quote |
| Store: home, product, add to cart, cart, coupon field | yes | — | — | — | — | the app |
| Business: market orders and stock through its API | yes | yes | — | — | — | Owner API; its widget tests |

**Not tested:**

- dark mode
- Turkish in the app (only the API)
- notifications opening an order (the preview has no push)
- a delivery order in the marketplace: the preview's headless browser
  refuses the location, and the marketplace has no other way to give an
  address (M10)
- card payment in the marketplace (the gateway wasn't set up)
- the store's checkout and payment: the preview never opens a checkout, by
  design, and the gift QA (Phase 168) covered it
- each kind of Studio element (picture, button, list, ring, tile, size,
  corners and links) edited one by one: only a text was edited and
  published
- Forgot password and the other sign-in ways: the preview signs in the
  review number only

## Bugs, most serious first

### M1: Zad's bar opens the wrong screens, and Account throws (fixed, 177.7)

- **Steps:** Zad's look A (or B), signed in. Tap Cart, then Orders, then
  Account.
- **Result:** Cart opened the next tab's screen (the restaurant desk for the
  review account, Orders for a customer). Orders opened Account, and Account
  threw "Null check operator used on a null value". This affects every
  customer of every Zad project.
- **Screenshot:** `08-zad-cart-tab-opens-restaurant-desk.png`.
- **Cause:**
  - The bar's Cart is the marketplace's basket (`/market-checkout`). It is
    in the food module's `tabPaths`
    (`mobile/lib/modules/food/food_routes.dart:50`, before), so the tab
    gets a location.
  - But the basket wasn't one of the module's tab screens. It was only a
    pushed route (`food_routes.dart:236`, before), so `tabbedRoutes`
    skipped it and made no branch (`mobile/lib/modules/shared/shared_routes.dart:291`, before).
  - `MainShell` gave every tab with a location a branch number
    (`shared_routes.dart:409-413`, before). So every tab after Cart went to
    the next branch, and the last went to one that doesn't exist.
- **Fix:**
  - The basket is a `TabScreen` of the food engine. It is the tab's own
    screen with the bar, without Back; elsewhere it's a page on top.
  - The vendor page's basket bar and "Order again" open it with
    `openLocation`.
  - `MainShell` numbers the branches as `tabbedRoutes` builds them
    (`tabBranchIndexes`).
  - Test: `phase177_zad_tabs_test.dart`, both looks.

### M2: Zad's posters tell customers coupon codes the marketplace doesn't have (fixed, 177.2)

- **Steps:** a project from Zad look A, published as it is.
- **Result:** the home's offer posters say "FRESH15 over EGP 100" and
  "ZAD20 over EGP 200". `/market/offers` is empty, and the checkout answers
  "This code isn't valid." for either.
- **Screenshot:** `01-zad-poster-template-code-zad20.png`.
- **Cause:**
  - 156.9 takes the demo's *facts* out of a business's app, and the
    poster's kicker became "Offer of the week".
  - But the codes and their minimums are the template's own words
    (`app-words.ts` `zadOffer1Code`, `zadOffer2Code`), so nothing removed
    them.
- **Fix:**
  - In a business's own app, a chip holding one of the templates' coupon
    codes is left out, with its minimum, unless the app has an active
    coupon with that code. The coupon can be the marketplace's or the
    shop's (`templateCouponCodes`, `activeCouponCodes`, through
    `withFreshTranslations`).
  - The offer's own words stay for the owner to change in Studio.
  - Yallapp's demo apps keep theirs.
  - Test: `phase177-market-store.test.ts` 177.2.

### M3: the marketplace's checkout and orders in English for Arabic and Turkish customers (fixed, 177.3)

- **Steps:** the Arabic app: the basket and an order.
- **Result:** "Items", "Discounts" and "Total" are in English. So are the
  weighing note and "This code isn't valid.", and every refusal ("Add a
  little more to reach this place's smallest order.").
- **Screenshots:** `04-zad-checkout-ar-price-lines-in-english.png`,
  `05-zad-order-ar-english-lines.png`.
- **Cause:**
  - The labels are written in English (`lib/market/json.ts`
    `PRICE_LABELS`), and the warnings too (`lib/market/cart.ts:293`,
    `offers.ts` `MESSAGES`).
  - None of the marketplace's messages were in the hosted API's dictionaries
    (`lib/i18n/builtin/ar.ts`, `tr.ts`), so errors weren't translated either.
- **Fix:**
  - 29 entries in Modern Standard Arabic and Turkish: the price lines, the
    warnings (one pattern with the tolerance), the coupon refusals and the
    checkout's refusals.
  - The quote's and the order's labels and warnings are read in the
    customer's language (`inLanguage`).
  - The pages' version includes the dictionaries' fingerprint, so
    `mobile/test/support/studio_publish.json` was written again by its test
    (`YALLAPP_WRITE_STUDIO_PUBLISH=1`).
  - Test: `phase177-market-store.test.ts` 177.3.

### M4: Zad's vendor page: search, share and the heart do nothing, and the aisle chips only change colour (fixed, 177.4)

- **Steps:** Zad Market's page. Tap the search, share and heart on its
  cover, then "Dairy & eggs".
- **Result:** nothing happens. The chip turns dark, but the page stays on
  the first aisle. The heart on the places' cards does nothing either.
- **Screenshot:** `03-zad-vendor-page-dead-cover-buttons.png`.
- **Cause:**
  - The three cover buttons are icons in a `Container` with no tap
    (`mobile/lib/modules/market/screens/market_vendor_screen.dart:223-228`,
    before). The card's heart is the same (`market_sections.dart:1180-1196`,
    before).
  - The chips' `onSelect` only set the selected index (`:115`, before).
- **Fix:**
  - Search opens the marketplace's search.
  - Share sends the place's name and the app's link (`shareTextProvider`).
  - The heart saves the place on the phone (`marketSavedPlacesProvider`),
    because the marketplace's API has no favourite places. Both hearts use
    it.
  - A chip goes to its aisle under the pinned bars, building far aisles on
    the way.
  - All of these with the app's existing words ("Search", "Share", "Save to
    favorites").
  - Test: `phase177_market_vendor_test.dart`.

### M5: a marketplace's sign-in opens on +90 (fixed, 177.1)

- **Steps:** an Egyptian marketplace (Zad's settings: Egypt, EGP).
- **Result:** the sign-in opens on +90. A number typed with +20 is refused
  ("Please enter a valid mobile number").
- **Screenshot:** `07-zad-sign-in-plus-90.png`.
- **Cause:** 160.8's `shopCountryCode` reads the catalog's settings only.
  A marketplace (and food or delivery) keeps its country and currency in
  its delivery settings (`MarketAppSettings.country`).
- **Fix:**
  - After the catalog, the marketplace's own country, else the saved
    delivery settings' currency (`serviceCountryCode`).
  - Used in `Config.auth`, on App sign-in, and in its save.
  - Test: 177.1.

### M6: the offers' big number is cut at text size 1.3 (fixed, 177.5)

- **Steps:** Zad's home at 1.3 on a 360-wide phone.
- **Result:** "15%" reads "1…". Look B's "25%" is the same kind of text.
- **Screenshot:** `02-zad-poster-15-cut-at-text-1.3.png`.
- **Cause:** a 72-point text on one line with an ellipsis
  (`zad-signature.ts` `poster`). The app cut it
  (`mobile/lib/modules/shared/pages/studio_page.dart:1613-1621`, before).
- **Fix:**
  - One word on one line at 32 points or more shrinks to its room
    (`FittedBox` scale-down).
  - Leqaa's Samsung matrix (438 cases) still passes.
  - Test: `phase177_zad_text_scale_test.dart` (en and ar at 1.3, en at 1.5).

### M7: an order's lines don't add up to its Items (fixed, 177.6)

- **Steps:** an order with red apples on sale (0.5 kg).
- **Result:** "EGP 17.50 + EGP 45.00" stand over "Items EGP 72.50 ·
  Discounts −EGP 10.00".
- **Screenshot:** `06-zad-order-lines-dont-add-up.png`.
- **Cause:** the server's `items` line is the lines before their discounts.
  Each line sends `before_discount`, but the order screen showed only its
  `total` (`market_order_screen.dart:153`, before).
- **Fix:** a line on sale shows its price before the sale, struck.
- **Test:** `phase177_market_order_test.dart`.

### M8: 76 outlined Material Symbols (fixed, 177.8)

- **Where:** the marketplace's screens (44) and the vendor's (32), for
  example `Symbols.storefront` and `Symbols.two_wheeler` in the checkout.
  The rest of the app used `_rounded` only.
- **Fix:** all of them are rounded. A test reads every `Symbols.` in
  `mobile/lib`: `phase177_rounded_icons_test.dart`.

### M9: the marketplace's Vendors page says Restaurants (fixed, 177.9)

- **Where:** Dashboard › Your marketplace › Vendors.
- **Result:** the menu says "Vendors", but the page says "Restaurants", "Add
  a restaurant" and "3 restaurants", over Zad Market (a supermarket).
- **Screenshot:** `09-dashboard-vendors-page-says-restaurants.png`.
- **Fix:** a marketplace's page uses vendor words (English, Egyptian
  Arabic, Turkish). A food delivery app keeps its restaurants.
- **Test:** 177.6 in the unit test.

### Open (not fixed)

- **M10, a delivery address without the phone's location.**
  - The marketplace's "Deliver to" (home and checkout) only uses the
    phone's position: there's no map pin and no typed address.
  - A customer who refuses location can only pick up.
  - This needs a design: the store's `pickDeliveryPin` uses the platform's
    map, which is empty here, as in F1 of the gift QA.
- **M11, the template's tiles and "See all" open the search.**
  - Zad's department tiles and both "See all" open the generic search
    (`zad-signature.ts` `search`).
  - Linking "Places near you › See all" to the Shops page fails the page
    checker when the template is used as one page (the page isn't there),
    so it was left.
  - The owner can link each one in Studio.
- **M12, "Cash on delivery" with pick-up.** With Pick up chosen, the payment
  still reads "Cash on delivery" (`l10n.marketPayCash`). Fixing it needs a
  new app string in three languages.
  - Screenshot: `10-zad-checkout-pickup-cash-on-delivery.png`.
- **M13, the review account in a marketplace.**
  - The store-review number is made a restaurant's staff
    (`reviewRestaurantFor`), so its bar has Restaurant in Orders' place.
    This is by design, for the stores' reviewers.
  - In a marketplace the vendor desk would fit better.
- **M14, the plan.** Studio plan 1's default features don't include
  "market", so a Zad project on it runs as plain food delivery until the
  team turns the feature on in Admin › Plans. Nothing tells the owner.
- **M15, the classic store before payments.**
  - Every product says "This item isn't sold in the app." until a payment
    way is set.
  - The Overview warns the owner, but the app editor's "first steps" don't
    list payments.
- **M16, Business's marketplace order.** Its lines (sale prices) and
  `amounts.items` (before the discounts) don't add up either. This is the
  Owner API's shape; it was left for Business.

## Tests and their results (run here, 18 November 2026)

See ROADMAP Phase 177 and the report to the coordinator for the full list.
