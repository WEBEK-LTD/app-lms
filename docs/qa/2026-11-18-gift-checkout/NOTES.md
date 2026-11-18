# The gift checkout end to end: QA and fixes (18 November 2026)

ROADMAP Phase 168. Branch `wip-qa-food`.

## What was set up

The platform ran locally the way the e2e suite runs it:

- `next build`, then `next start` with `playwright.config.ts`'s environment: the memory store, the fake Stripe, PayPal, Kashier and Fawaterk, and a local listener for the sign-in codes.
- The app was the committed web build at `/preview-app/`. Chromium was headless.

The shop was made the way an owner makes one:

1. Signed up as "Salma Bennani", and the team activated the account.
2. Created **KechFlora** from `/start?for=studio` → Leqaa → "Create my app".
3. The admin gave it Studio plan 1.

Then, in the dashboard:

- **Currency:** MAD. The template's samples were removed. Own categories: Bouquets, Roses, Birthday, Love, Gift extras.
- **Products, with photos from `public/flower-photos`:**
  - Marrakech Red Roses, MAD 450
  - Atlas Tulips, MAD 320, on sale for MAD 280
  - Majorelle Orchid
  - Sunflower Souk
  - White Lily Grace
  - Add-ons only: Ceramic Vase, MAD 150, and Greeting Card, MAD 30
- **Checkout:** the gift checkout.
- **Delivery times:**
  - Day required; same day until a 14:00 cut-off; 10 days ahead; time zone Africa/Casablanca.
  - Slots 10–13 (capacity 8), 13–16, and 16–20 (+MAD 20).
- **Delivery places:** by distance from 31.6295, −7.9811, up to 30 km, MAD 20 base + MAD 4 per km.
- **Gifts:** card message, recipient, "Send anonymously". The template's 11 occasions and 24 messages, plus an occasion of my own ("Graduation").
- **Offers:**
  - Flash sale: "Valentine roses", 20% off the roses, 10 units.
  - Coupon: FLORA10, 10%, shown in the app.
- **Payments:** the shop's own Stripe (the fake).
- **Platform map tiles:** set in Admin › Maps, after F1 below.

## What was tested, and how

| Step | 390×844 en | 360×800 ar | How |
|---|---|---|---|
| Home, product, flash price (MAD 450 → 360), add-on, cart | yes | yes | in the app |
| Gift checkout: sender, recipient, address, map pin, day and slot, card by occasion, coupon | yes | the fields, the summary | in the app |
| After the cut-off (set to 05:00) | yes | — | in the app ("Today" struck out, "Orders for today have closed") and the API (`/store/delivery-slots`; the checkout refuses) |
| Payment | — | — | **The preview never opens a checkout, by design** (`yallapp_api.dart` `_noCheckoutInPreview`). So the order was placed with the same `POST /store/checkout-link` the app sends, as a customer signed in by phone (code from the local listener), and paid on the payment page with the fake Stripe's test card |
| Order confirmation | yes | — | the payment page's "Thank you" (order 1037, MAD 394.60); the order in the app's Orders |
| Orders → "How your flowers travel": preparing, shipped (with courier), delivered from the dashboard | yes | — | the app after each change (the preview has no push) |
| The order as the owner sees it: card, slot, add-on, sender, recipient | yes | — | dashboard, Orders |

**Not tested:**

- dark mode
- Turkish
- 390×844 in Arabic, and 360×800 in English
- the journey refreshed by a push or by the app coming back to the front: the preview has no push, and headless Chrome didn't fire Flutter's resume
- the flash sale running out of units
- the new occasion's own messages: the drawer to add them was not driven

## Bugs found, and their causes

Line numbers are from `main` before the fixes.

### F5: the cart's total loses the delivery when the day is chosen (fixed, 168.1)

- **Steps** (en 390×844): pin the place (total MAD 433.60 = 390 + 43.60 shipping), then tap "Today".
- **Result:** the total drops to MAD 390.00 and the shipping disappears. It comes back once a slot is chosen.
- **Screenshot:** `shots/01-total-drops-after-today.png`.
- **Cause:** `checkStoreCheckout` returns the day's failure ("Choose a delivery time.") before pricing the place (`platform/web/src/lib/selling/store.ts:176`). The quote then has no `placed` and, priced by place, sets shipping to null (`src/lib/hosted/connectors/catalog.ts:651`, `:659`).

### F11: the shipping breakdown is in English in an Arabic app (fixed, 168.2)

- **Steps:** the Arabic cart's summary reads "Base fee" and "km 10.8".
- **Screenshot:** `shots/04-arabic-cart-base-fee-in-english.png`.
- **Cause:** the lines' labels are written in English when priced (`src/lib/selling/shipping.ts:231`, `:232`, `:241`, `:245`). `breakdownJson` (`:267`) sends them as they are, whatever the `Accept-Language`.

### F6: the payment page stops a gift with "Enter your city." (fixed, 168.3)

- **Steps:** a gift priced by distance, pinned, with the recipient's full address. On the payment page, Pay.
- **Result:** "Enter your city." The app never asks for a city here (no countries listed, by distance), so every gift order of such a shop hits it.
- **Screenshot:** `shots/02-pay-page-enter-your-city.png`.
- **Cause:** `readCustomer` requires a city (`src/lib/catalog/payment.ts:51`). The page fills it from `order.delivery.place?.city`, which is empty (`src/app/pay/[token]/page.tsx:230`).

### F8: the owner can't see where the customer pinned (fixed, 168.4)

- **Steps:** Orders → the order.
- **Result:** the recipient's address text only. The pin (`delivery.place.lat/lng`, kept on the order) is shown nowhere, so the courier can't use it.
- **Screenshot:** `shots/05-owner-order-no-pin.png`.
- **Cause:** `src/app/dashboard/orders/page.tsx:245-250` renders the address and city only.

### F9: "How your flowers travel" goes back to "Order placed" once delivered (fixed, 168.5)

- **Steps:** the owner marks order 1037 delivered, and the customer opens Orders.
- **Result:** the timeline shows the drawn steps with "Order placed" current and no order number, while the order card under it says Completed.
- **Screenshot:** `shots/03-journey-back-to-order-placed.png`.
- **Cause:** the journey follows only orders in progress (`mobile/lib/modules/shared/account/order_journey.dart:99`, used at `:136`). A completed order falls back to the template's steps. The web mirror is the same (`src/lib/studio/order-journey.ts` `latestOrderOnItsWay`).

### F1: without the platform's map, the pin is the phone's own position (open, 168.6)

- **Steps:** with Admin › Maps empty (the e2e environment's default), tap "Pin the delivery place on the map".
- **Result:**
  - The app asks for the phone's location. Refused (as in headless Chrome), it says "Allow the app to use your location in your phone's settings", and the checkout can't continue ("Pin the delivery place").
  - Allowed, it would price and deliver to where the **sender** is, not the recipient's door.
- **Screenshot:** `shots/06-pin-without-map-uses-own-location.png`.
- **Cause:** `pickDeliveryPin` falls back to `_myPosition` when `mapTilesUrl` is null (`mobile/lib/modules/store/widgets/delivery_place.dart:191-192`). The tiles come from Admin › Maps only (`src/lib/selling/store.ts` `storeMap`), and the dashboard offers "By distance" without one.
- **Not fixed:** it needs a product decision: refuse "By distance" without a platform map, or a pin without tiles. In production Admin › Maps is set for the ride and delivery apps, so it may not show there. After this was found, the rest of the walk-through used a map set in Admin › Maps.

### F7: the payment page is English only, left to right (open, 168.7)

- **Where:** the whole payment page ("Checkout", "Full name", "Pay", "Thank you!") for an Arabic app's customer.
- **Cause:** hard-coded English in `src/app/pay/[token]/form.tsx`, `page.tsx` and `order-received/page.tsx`.
- **Not fixed:** it's a translation of the whole page and its gateways' parts.

### Smaller ones (open)

- **168.8:** the quote's `delivery_problem` ("Choose a delivery time.") is in English. Errors are translated by `localizedError`; answers that went through aren't.
- **168.9:** the dashboard's order ("Paid 18 Nov 2026, 05:30 UTC") and its stage history are in UTC, not the shop's Africa/Casablanca.
- **New shop's time zone:** Delivery times opens on Europe/Istanbul for a shop in dirhams with a +212 number, so the owner has to change it.
- **The payment page's contact block** ("Full name, Mobile number, Email") is the sender's, and "Address" is the recipient's, with nothing saying whose.
- **Coupon and flash sale stack:** FLORA10 takes 10% off the roses' flash-sale price (MAD 39 off 390). Noted, not judged.

## The fixes

| # | Change | Files |
|---|---|---|
| 168.1 | When the day fails in the quote, the place is priced alone (`placeOnly`, the day and slot left out). The shipping stays and `delivery_problem` still says what's missing | `src/lib/hosted/connectors/catalog.ts` |
| 168.2 | Each shipping line carries `words` (what it is). `breakdownJson` writes it in Arabic or Turkish from the request's language (`shippingLineLabel`). The owner's English `label` is unchanged on orders | `src/lib/selling/shipping.ts`, `src/lib/selling/store.ts`, `src/lib/data/types.ts` |
| 168.3 | `cityOptionalFor(order)`: a pinned place or a recipient's address with no city makes the city optional ("City (optional)"). iyzico, which needs one, gets the address's last part | `src/lib/catalog/payment.ts`, `src/app/actions/pay.ts`, `src/app/pay/[token]/form.tsx`, `src/app/pay/[token]/page.tsx`, `src/lib/payments/provider.ts` |
| 168.4 | "The pin on the map" link (Google Maps) on the owner's order, in English, Egyptian Arabic and Turkish | `src/app/dashboard/orders/page.tsx`, `src/i18n/dashboard/selling.ts` |
| 168.5 | `orderToFollow`: the newest order in progress, else the newest delivered in the last three days (all four steps done). Done in the app and in its web mirror; `CLIENT_APP_RELEASE` 9; the preview rebuilt | `mobile/lib/modules/shared/account/order_journey.dart`, `src/lib/studio/order-journey.ts`, `src/lib/builds/app-release.ts`, `public/preview-app` |

## Tests and their results

All were run in this container on 18 November 2026.

- **Unit tests (vitest), new:**
  - `tests/unit/phase168-gift-checkout.test.ts`: 4 passed. With the quote fix reverted, 2 of them fail, as they should.
  - `tests/unit/order-journey.test.ts`, with its new case: passed.
- **Unit tests, the related suites:** 160 tests in `phase131-place`, `phase131-commerce`, `shipping`, `catalog`, `payment-providers`, `leqaa-flowers`, `phase134-in-app-pay`, `manual-payments`, `hosted` and `maps-delivery`.
  - 1 failed at first: `phase131-commerce`'s exact breakdown line, which now has its `words`. Its expectation was updated, and the suite then passed 32/32.
- **Unit tests, the full suite** (`npx vitest run`): 372 files passed, 57 skipped; 4687 tests passed, 171 skipped.
- **End to end (e2e), new:** `tests/e2e/gift-checkout.spec.ts`, 3 passed. It covers:
  - the shop made from Leqaa in dirhams, by distance, with its Stripe
  - the cart's shipping kept while the day waits, and its Arabic breakdown
  - the payment without a city, through the fake Stripe
  - the owner's pin link
- **End to end, the existing specs on the same code:** `catalog.spec.ts`, `stripe-paypal.spec.ts` and `egypt-payments.spec.ts`, 15 passed. The suite's own Playwright browser isn't in this container, so they ran with the preinstalled Chromium through a local config that was not committed.
- **Flutter:**
  - `flutter test test/widget/phase132_order_journey_test.dart`: 16 passed, with a widget test for "just delivered" and a unit test for `orderToFollow`. On the old code the file doesn't load (no `orderToFollow`).
  - `flutter analyze`: no issues.
  - `tool/build_preview.sh --check`: up to date. Flutter 3.47.5 was installed as `mobile.yml` does.
- **Static checks:** `tsc --noEmit` clean; ESLint on the changed files clean.

## Bugs that belong to the others' fixes (listed, not touched)

| Fix | What I saw |
|---|---|
| 156 (stale texts and template words) | The home's "Send today" card says "Order before 4 pm and it arrives today, anywhere in Cairo." The shop's cut-off is 14:00 and it is in Marrakech. This is the template's own words (`DEMO_FACTS.flowers.lqCutoff`, `src/lib/studio/demo-templates.ts`) |
| 160 (sign-in) | The preview's sign-in starts on +90 for a Moroccan shop (MAD, an owner on +212) |
| 161 (currency) | In Arabic the flash-sale badge reads "20%-", and prices show as "MAD 360.00" in the Arabic screens |
| 163 (layout) | At 390×844 the cart's fixed top ("Send", Cart, the five steps, about 204 px) and bottom (the Checkout bar and the tab bar, about 270 px) leave about 370 px to fill the form in. At 360×800 it's less. The floating "Send" tab overlaps the Checkout bar's lower edge |
| 157, 158, 162 | Nothing seen in this flow |

## Test-harness notes, not app bugs

- With Flutter's accessibility tree on, synthetic mouse clicks can trip the web engine's tap debouncer (`Cannot read properties of null (reading 'a')` in `main.dart.js`). Touch taps and reloads avoided it.
- With the accessibility tree on, a SnackBar with an action ("Added to cart · View cart") stays until tapped, as Flutter keeps it for screen readers. It then covers the Checkout button. This was not checked with TalkBack on a phone.

## Second round: the Leqaa tester's findings in this area (168.11–168.17)

The coordinating session passed these on from the Leqaa QA tester. I didn't find them in my own walk-through. Each fix has tests.

| # | Finding | Cause | Fix |
|---|---|---|---|
| 168.11 | A flash sale on a product with sizes was missing from lists, though discounted on its page and at checkout | `withSale` returned early for range prices (`src/lib/selling/flash-sales.ts:104`) | Both ends of the range at the sale's price; the cheapest size's `sale` |
| 168.12 | The sale's name never showed | The element's own title won (`mobile/lib/modules/shared/pages/studio_flash_sale.dart:77`), and the template always sets one; a product's `sale` had no name | `ProductSale.title`/`titles` (in the contract too); the sale's name wins on the element and the product page |
| 168.13 | Delivery & offers said "Standard checkout" and delivery days off for a Leqaa project, which runs the gift checkout with the day and time required | The page's checkout choice read only the owner's saved choice, and its delivery times read only the saved switches; the look's gift mode turns both on (`src/app/dashboard/selling/page.tsx`) | The page shows the effective mode and the delivery that `deliveryOf(app, true)` gives |
| 168.14 | Step bar: When filled but not ticked while For was in view | A step was ticked only when it came before the step in view (`gift_checkout_look.dart` `_ticked`) | Every done step is ticked |
| 168.15 | The cart note said "at checkout", but Checkout waits for the day picked in the cart | Leqaa's template words (`lqCartNote`, `src/lib/studio/app-words.ts`) | New words in three languages; the fixtures written again |
| 168.16 | Dark mode: the flash price, plum on the night card, about 2.1:1 | The day accent used on the card whatever its colour | `flashPriceColor`: the accent where it reads at 4.5:1, else the same hue lighter |
| 168.17 | At 360×800 the form had about 400 points | A full step bar on short screens | A one-line step bar under 860 points high |

**Results:**

- **Unit tests (vitest):** the full suite has 4689 passed and 171 skipped. That includes the two new flash-sale tests and the regenerated API reference.
- **End to end:** `gift-checkout.spec.ts` passed 4 of 4. Its new checks:
  - the sized product's flash sale and its name, in the list and in `/store/flash-sales` in Arabic
  - the dashboard showing Gift checkout and the day and time required on a new Leqaa shop
- **Existing end-to-end specs:** `catalog.spec.ts` and `stripe-paypal.spec.ts` passed 10 of 10.
- **Flutter:**
  - The three widget files passed 45 tests.
  - The dark-price test fails on the old colour, as it should.
  - `flutter analyze` is clean.
  - `dart format` is clean.

**Not done:**

- 168.13 was not re-run with the dashboard change reverted (a rebuild each time).
- The release bump and the preview rebuild for these app changes are left to the integration branch, as the coordinator asked. Until then `tool/build_preview.sh --check` reports the preview out of date.
- Projects made before 168.15 keep the old cart note: stale template words (156).

## Third round: the open items closed (168.6–168.9)

The coordinating session asked for these, in this order.

| # | Was | Now |
|---|---|---|
| 168.7 | The payment page was in English only, left to right | In the order's app language (`CatalogOrder.lang`): English, Arabic (Modern Standard, right to left) or Turkish. This covers the details, the card step, the thank-you page, and the form's checks and messages. All the words are in `src/lib/catalog/pay-words.ts`, and English is unchanged |
| 168.8 | `delivery_problem` was in English | It uses the hosted API's Arabic and Turkish, as errors do (`serverMessage`) |
| 168.9 | Order times were in UTC | Shown in the shop's time zone with its offset (`formatDateTime(date, lang, zone)`, used only on the orders page) |
| 168.6 | Without a map, the phone's location was used silently | The app first says "This shop has no map yet…" and uses the location only after "Use where I am". Three new strings in en, ar and tr |

**Results:**

- **Unit tests:** `phase168-gift-checkout.test.ts` passed 11 of 11. The new cases cover:
  - every payment-page word in Arabic and Turkish, with the same placeholders
  - the form's checks in Arabic and Turkish
  - `delivery_problem` in Arabic and Turkish
  - order times in the shop's time zone
- **End to end:** `gift-checkout.spec.ts` passed 5 of 5. Its new cases:
  - the payment page in Arabic at 360×800: `dir=rtl`, a check failing in Arabic, the payment through the fake Stripe, and "شكرًا لك!" at the end
  - the payment page in Turkish
  - the owner's order time in GMT+offset, not UTC
- **Every other spec that goes through the payment page passed, 68 tests in all:** `catalog`, `connected-pay`, `demo-apps`, `donations-hosted`, `egypt-payments`, `events-hosted`, `fitness-hosted`, `manual-payments`, `owner-api`, `refunds`, `restaurant-hosted`, `stripe-paypal`, `team-members` and `world-currencies`.
- **Flutter:** `phase131_place_test.dart` passed 8 of 8, with the notice, Cancel, and "Use where I am". The full `flutter test` passed 2153, with 776 skipped. `flutter analyze` is clean.
- **Unit tests, the full suite:** 1 test failed at first: `phase62.test.ts`, because the 3 new app strings' dashboard notes were missing. I added them to `app-string-notes.ts` in en, ar and tr, and the test then passed 14 of 14. The rest of the suite: 4693 passed, 171 skipped.

**Checks the coordinator asked for:**

- **Turkish:** covered by the payment page's e2e test and the word tests.
- **Dark mode:** the payment page has no dark look (a white page, as before). The app's no-map notice is a standard dialog in the app's theme. It was not checked in the preview.

**Left as they were:**

- The dashboard still offers "By distance" without a platform map.
- The release number and the preview are left to the integration branch.
