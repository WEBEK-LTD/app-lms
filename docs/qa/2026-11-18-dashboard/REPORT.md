# QA report: the shop owner's dashboard and Yallapp Business: a flower shop in MAD

Date: 18 November 2026 · Commit tested: `14b2dcf` (main) · Tester: Claude (automated QA session)

## Scope and setup

**The shop.** A new owner signed up and was activated, then created the shop the way an owner does:

- `/start?for=studio` → the Leqaa card → "Start with this app" → named **KechFlora**.
- The Yallapp team then activated the app (Admin › Clients › Manage › Activate & send license).
- The store currency was changed to **MAD** in Products › Settings.
- Owner: Karim Benali, WhatsApp +212.

**The platform.** It ran the way the e2e suite runs it:

- `npm ci`, then `next build` and `next start -p 3210` with the env of `platform/web/playwright.config.ts`.
- Memory store, files on disk, emails as JSON in `.data/e2e-mail`.
- The suite's fakes, started from `tests/e2e/fake-*.ts`: Stripe, PayPal, Kashier, Fawaterk, a rates source with the suite's list of 26 currencies, and the OTP webhook.
- The fake iyzico and the fake Google Fonts server were **not** running, so the iyzico "couldn't reach" message and the 503 on the Fraunces font are environment gaps, not bugs.
- `next build` ran out of memory during type checking with Node's default heap. It built with `NODE_OPTIONS=--max-old-space-size=6144`, as `netlify.toml` does. This is an environment note only.

**Orders.** All orders were placed through the app API (`POST /api/app/{id}/store/checkout-link`) as gift orders:

- recipient in Marrakech, delivery tomorrow in a slot, a card message in Arabic and English, a gift add-on (Greeting Card);
- one order sent anonymously, one shown in EUR (`X-Currency: EUR`);
- each paid on the fake Stripe from the payment page.

**How each page was checked.**

- An automated crawl of all **41 dashboard pages** in English and Egyptian Arabic, light and dark, at 1440 and 390 px (328 page loads). It recorded console errors, horizontal overflow, Latin-only lines in Arabic, and currency marks.
- Each page's controls were then used by hand: create, edit, save, delete.
- After each change, I checked what the app API serves.

**Screenshots** are in `shots/`, taken at deviceScaleFactor 2 (#1 is the only exception; see that bug).

---

## Bugs

Severity: **High** means customers or money are affected. **Medium** means the owner is misled or a feature doesn't do what it says. **Low** is cosmetic, or a wrong default.

### 1. Cancelling a paid order: no confirmation, no refund, stock not returned, customer not told, still counted as revenue: **High**
- **Page:** Your shop › Orders, order drawer · desktop 1440 · English · light. The same control is in Arabic.
- **Steps:**
  1. A customer pays order 1058 (MAD 477.70) by card.
  2. Open the order and press **Cancel order**.
- **Expected:**
  - a confirmation first;
  - the payment refunded, or at least a clear "refund it now" step;
  - the units back in stock;
  - the customer told;
  - the order out of "Paid orders" and revenue.
- **Actual:**
  - It cancels at once, with no `confirm()` and no dialog (`05a` → `05b`).
  - No refund is made and none is offered.
  - No email reaches the customer: only "New order" and the receipt were sent.
  - Stock stays taken. Atlas Roses Large stays "out_of_stock" after Large order 1051 was cancelled, and Small stays at 3 after order 1058.
  - Analytics › Sales counts it: Paid orders 3, Revenue MAD 2,043.10, which includes cancelled order 1051 (`07`, `08`).
- **Screenshots:** `shots/05a-cancel-paid-order-before.png`, `shots/05b-cancel-paid-order-after.png`, `shots/07-orders-cancelled-counted.png`, `shots/08-analytics-revenue.png`
- **Likely cause:**
  - `src/app/dashboard/orders/page.tsx:404`: a plain `StatusButton` form, with no confirm.
  - `src/app/actions/catalog.ts:594-611` (`setOrderStatusAction`) refunds only when the order was cancelled after a failed delivery (`refundAfterFailedDelivery`, line 608).
  - `src/lib/catalog/order-status.ts:59` and after (`changeOrderStatus`) give back loyalty points but never stock.
  - Customer notices go only to signed-in app users (see #4).

### 2. A shop made from Leqaa tells its customers about Cairo and keeps the demo's sample offers: **High**
- **Pages:** Overview (`/studio/project`) and the app's live home page after Publish (`GET /api/app/{id}/pages/home`) · English and Arabic.
- **Steps:**
  1. Create the app from Leqaa at `/start?for=studio`.
  2. Set currency MAD, delivery Africa/Casablanca, Marrakech by distance.
  3. Add the coupon KECH15 and a live flash sale.
  4. Open the editor and press **Publish**.
- **Expected:** a shop that is the owner's own: their city and cut-off, their code, their sale, their currency. If not, the template's demo facts are clearly marked as samples to replace before publishing.
- **Actual:**
  - The published home still tells customers **"Order before 4 pm and it arrives today, anywhere in Cairo."**; in Arabic: "…إلى أي مكان في القاهرة".
  - The testimonials are still "[Customer name] / [What a customer says about you]".
  - Before publishing, the Overview canvas showed the demo's coupon **LEQAA10**, which doesn't exist in this shop (`GET /store/coupons` was empty), and a sample flash sale "12 left −20% [1] ₺400 ₺500" in **TRY** after the shop switched to MAD (`01`).
  - The shop's own settings were not copied from the demo (ROADMAP 131.33): Europe/Istanbul time zone, 14:00 cut-off, 3 generic slots, no flash sale, no coupon.
  - Publish gave no warning about the bracketed placeholders.
- **Screenshot:** `shots/01-overview-sample-currency-cairo.png`. This one is the crawl's 1x capture: after Publish, the Overview no longer shows the canvas, so it couldn't be taken again at 2x.
- **Likely cause:** the demo's words are copied into the new app as fixed text (`lqCutoff` in `src/lib/studio/demo-templates.ts:300`: "Order before 4 pm and it arrives today, anywhere in Cairo."), not bound to the shop's `delivery.cutoff` or city. The demo's commerce settings (131.33) apply to the demo app only, not to an app started from it.

### 3. "Delivery days: Off" in the dashboard while the app requires a day and slot: **Medium**
- **Page:** Your shop › Delivery & offers · 1440 English light, and 390 Arabic dark.
- **Steps:**
  1. The shop has the gift checkout, because Leqaa's look turns it on.
  2. In Delivery times, untick "Customers choose the delivery day" and save ("Saved.").
- **Expected:** the tile and the app agree. Either the switch can't be turned off under the gift checkout (it says so), or the app stops asking.
- **Actual:**
  - The tile says **Delivery days: Off**, and "Customers can't choose a delivery day yet." (Arabic: "متوقف", "العملا لسه مش بيقدروا يختاروا يوم التوصيل").
  - `GET /config` still serves `delivery_date: {enabled: true, required: true, timezone: "Africa/Casablanca", same_day_cutoff: "16:00"}`.
  - The Checkout tab shows **Standard checkout** selected, under a note that the look turns on the gift checkout.
- **Screenshots:** `shots/04-delivery-days-off-tile.png`, `shots/04b-delivery-days-off-ar-dark-390.png`
- **Likely cause:**
  - `src/app/dashboard/selling/page.tsx:101` uses `settings.delivery ?? DEFAULT_DELIVERY`.
  - The API uses `deliveryOf(app, mode === "gift")`, which forces `enabled: true, required: true` (`src/lib/selling/delivery.ts:48-50`).

### 4. "The customer is told when it ships…" but a guest customer is never told: **Medium**
- **Page:** Orders, order drawer, Delivery section · 1440 English light.
- **Steps:**
  1. The app allows guest checkout (`guest_checkout: true`), and the customer gave an email.
  2. Move order 1050 through Preparing → Shipped (courier Hamid) → Delivered.
- **Expected:** what the drawer says: "The customer is told when it ships, is postponed, can't be delivered and is delivered."
- **Actual:** no email at any stage. Only the receipt and the refund mail reached `yasmine@example.com`. Yallapp Business's cancel dialog also promises "The customer is told" (`business/lib/l10n/app_en.arb:143`).
- **Screenshot:** `shots/09-guest-told-but-not.png`
- **Likely cause:** `src/lib/hosted/auto-notifications.ts:402` and `:423` return early when `order.userId === null`. There is no email path for guest orders' stages.

### 5. Changing the store currency keeps every number: ₺2,290 becomes MAD 2,290: **Medium**
- **Page:** Products › Settings · 1440 English light.
- **Steps:**
  1. The shop was created in TRY, with prices converted from the demo's EGP.
  2. Pick "Moroccan Dirham · MAD" and press Save settings.
- **Expected:** the prices converted at the day's rate, or a warning that the prices keep their numbers and must be checked.
- **Actual:**
  - "Shop settings saved." and nothing else.
  - Blush Garden goes from ₺2,290.00–₺4,260.00 to **MAD 2,290.00–4,260.00**, about 4× its TRY value.
  - The same happens to the variations, the add-ons, and the 14 sample products.
- **Screenshot:** `shots/06-products-list-prices.png`
- **Likely cause:** the shop settings form (`ShopSettingsForm`, `src/app/dashboard/catalog/forms.tsx:830`) only changes `currency`. Prices are stored as cents with no currency of their own.

### 6. Wrong currency in Studio's samples after switching to MAD: **Low**
- **Pages:** Sign-in and account (`/studio/project/screens`), and Identity and logo (`/studio/project/setup?step=branding`) · 1440 English light; Arabic too.
- **Actual:**
  - The gift checkout preview shows **E£ 2,100 / E£ 60 / E£ 2,480 / E£ 95**.
  - It also shows a fixed date, **"Tomorrow, 15 Nov"** (today is 18 Nov), and country Egypt, city Cairo.
  - The Lale Flowers template's thumbnail says **"Free delivery on orders over ₺1,500."**
- **Expected:** the sample in the shop's currency (MAD) and dated from today, or clearly a generic sample without a currency.
- **Screenshots:** `shots/03-screens-gift-sample-egp.png`, `shots/02-branding-preview-try.png`
- **Likely cause:** fixed sample data in `src/lib/studio/checkout-words.ts` and `src/components/studio/gift-checkout.tsx`, plus the template thumbnails.

### 7. A Moroccan shop gets Turkish defaults: **Low**
- **Pages:** Products › Settings, Delivery times, App sign-in, Areas and fees.
- **Actual:**
  - The new shop's currency is **TRY**, though the owner's number is +212 and the template is in EGP.
  - The delivery time zone is **Europe/Istanbul** (`src/lib/selling/delivery.ts:30`).
  - The sign-in country code is **90**, "like 90 for Turkey" (`10`).
  - The shop's latitude and longitude hint is "like 41.0369 and 28.9850", which is Istanbul (`11`).
- **Expected:** defaults from the owner's country (the platform already maps +212 → Africa/Casablanca in `src/lib/analytics/zone.ts:26`), or from the template.
- **Screenshots:** `shots/10-signin-country-code.png`, `shots/11-areas-distance-no-map.png`

### 8. "By distance" has no map in the dashboard: **Low**
- **Page:** Delivery & offers › Areas and fees · 1440 English light.
- **Actual:**
  - The text says "from your shop's pin on a map", but there's no map. The owner types latitude and longitude by hand (`11`).
  - The app's map is off too (`shipping.map.tiles_url: null`). That may be because this env has no map tiles, so not tested further.
- **Screenshot:** `shots/11-areas-distance-no-map.png`

### 9. The products list shows a price customers don't pay: **Low**
- **Page:** Products · 1440 English light.
- **Steps:** create "Atlas Roses" with Price 450, Sale 390, then sizes Small 450 and Large 690 → 620.
- **Expected:** the list shows what the app shows, MAD 450.00 – MAD 620.00.
- **Actual:** the row shows **MAD 390.00 ~~MAD 450.00~~**, the product's own sale price, which no size uses (`06`). The API serves `MAD 450.00 – MAD 620.00`.
- **Screenshot:** `shots/06-products-list-prices.png`

### 10. Smaller issues: **Low**
- **Duplicate category names:** Categories accepts a second "Ramadan gifts" with no warning.
- **Wrong breadcrumb:** Products › Settings shows "KechFlora › Your shop › **Products**".
- **Two digit systems:** in the Arabic order drawer, the dates use Arabic-Indic digits and the times use Latin ones ("الخميس، ١٩ نوفمبر · 10:00–13:00"). Amounts are formatted as "MAD 737.70" in Arabic too, because `Intl.NumberFormat("en-US", …)` is used in `src/lib/catalog/money.ts:23`.
- **Admin in English:** Admin › Clients and the client page are in English when the language is Arabic. These are team pages, so this is only noted.
- **Numbering:** App setup counts "3 of 5 steps" in Admin while the owner's list numbers Store listing "3" and Publishing "4".
- **Missing pages:** there's no **customers list** and no **product reviews** page for a store app. The hosted API serves `reviews: false`, hard-coded in `src/lib/hosted/service.ts:615`. These are features that don't exist yet, not broken pages.

### 11. Yallapp Business: medium and low gaps, from code reading and widget tests
These come from running Yallapp Business's checks with Flutter 3.47.5 and reading its code against the platform's Owner API. They were not tried on a phone. Business is in `business/`, not `mobile/`; the CI job "Yallapp Business" works in `business/`.

- **Medium: Cancel order after a failed or returned delivery refunds the money without saying so.**
  - The cancel confirm says "A payment taken for it is refunded separately" (`business/lib/features/orders/order_actions.dart:72-79`, `cancelOrderText`).
  - On the server, cancelling at the `failed` or `returned` stage refunds at once (`platform/web/src/lib/catalog/stage-refunds.ts`).
  - The Delivery failed sheet does warn about this; the Cancel button doesn't.
- **Medium (cosmetic): MAD reads as "MAD 1,234.50" in Arabic, never "د.م.".** The server formats every amount as en-US (`src/lib/catalog/money.ts:23`), and the app shows it as received. The demo is in EGP, so no test covers MAD.
- **Low: Postpone and Retry offer days by the phone's clock** (`order_stages.dart:562`). The server checks against the shop's time zone, which defaults to Europe/Istanbul (#7). Near midnight, a day the app offers can be refused; the server sends a field error.
- **Low: full or closed slots.** The app greys them out (`models.dart:1734`). The server's postpone check (`src/lib/catalog/order-stages.ts:140`) only refuses slots that have started.
- **Low: "Signed by " with no name.** A signed card with no sender and no customer name shows an empty name (`order_screen.dart:263-265`).
- **Low: add-ons can attach to the wrong line.** They are placed under the first line with the same product (`order_screen.dart` ~489-503). With two sizes of one bouquet, every add-on lands under the first.
- **Low: no client for the shipment endpoint.** The app has none for `PUT …/orders/{id}/shipment` (carrier and tracking number); the Shipped stage covers courier and link only.
- **Low: the refund amount accepts only ASCII digits.** Arabic-Indic digits from the keyboard are refused, with a field error.

---

## What works

**Pages**
- All 41 owner pages load (HTTP 200) in English and Egyptian Arabic, light and dark, 1440 and 390.
- **No horizontal overflow at 390 px** on any of them.
- **No console errors**, apart from the e2e env's missing font server.
- Old `/dashboard/...` links inside Studio redirect to their `/studio/project/...` page.
- The Arabic dashboard is translated. The Latin text left is the owner's own content (product names, the template's English words), icon names, and URLs.

**Products and categories**
- Create with 2 photos, price, sale price, stock and a category.
- Two sizes with their own price, sale and stock.
- Edit: rename, a size's price, a size set out of stock.
- Every change reaches `GET /store/products` at once, and the photos are served.
- Categories: add, rename, reorder (the order reaches the API), and delete with a confirmation.
- CSV import: the check step lists the columns found and the rows left out with their reason. An Arabic row, a "1,250.50" price and a new Arabic category were imported.

**Delivery & offers**
- Delivery times: cut-off, time zone, a slot's capacity and fee. All reach `config.store.delivery_date`.
- Areas and fees: Morocco and Marrakech, priced by distance. They reach `config.store.shipping`, and the fee at checkout was computed (base 20 + km, plus the slot's 30).
- Gift add-ons go with a bouquet.
- Card messages: 11 occasions in EN, AR and TR. An added message reaches `GET /store/gift-messages` in Arabic.
- Flash sale: name in EN and AR, product, 20%, units, times in Africa/Casablanca. It reaches `GET /store/flash-sales`, live, with "5 left".
- Coupons: KECH15, 15% off, minimum MAD 300, shown in the app. It reaches `GET /store/coupons`.

**Payments**
- Each gateway's form takes fake keys, and **Test connection** reports item by item.
- iyzico, Kashier, Fawaterk and PayPal each correctly say they don't take MAD.
- Stripe passes ("Stripe takes MAD"), saves, and takes the payments.

**Customer currency (Phase 149)**
- After the daily job fetched the rates, the switch and the "Only these currencies" chips (EUR, USD) saved.
- `GET /currencies` returns MAD, USD and EUR.
- An X-Currency of SAR gets no `display`; EUR gets €116.21.
- The payment page shows "≈ €68.55 · you pay MAD 737.70".

**Orders**
- Paid gift orders appear at once with everything a florist needs: the sender and recipient with phones, the address, the day and slot, the zone and km, the fee, the card message, "Sent anonymously", and the add-on under its bouquet.
- Stages work: Preparing with a team note, Shipped with courier name and phone, Delivered (which completes the order).
- A partial refund of MAD 200 goes through Stripe (`re_1`), emails the customer, and leaves the Refund control for the rest.
- In Arabic, dark, at 390, the drawer is translated and fits.

**Other pages**
- App sign-in: turning on email codes saves and reaches `config.auth.methods`.
- Analytics shows sales in MAD, including refunds.
- Store listing saves and moves on to Publishing.
- Builds correctly refuse to start until setup is complete.
- Editor: **Publish** sends the Leqaa layout to the app (five tabs, 13 pages).
- Admin › Clients: the client and app pages for this shop load with no errors, and activation works.

**Yallapp Business** (Flutter 3.47.5, as CI installs it, in `business/`)
- These passed:
  - `flutter pub get --enforce-lockfile`
  - `tool/build_arb.py` (1222 strings in en, ar, tr) and `flutter gen-l10n`, with no diff
  - `dart format`, unchanged
  - `flutter analyze`, with no issues
  - `flutter test`: **576 passed**, among them `phase132_orders_test.dart`, `orders_test.dart` and `phase132_stages_test.dart`, in English and Arabic
- From the code: every endpoint and JSON field the app reads matches the Owner API (`src/lib/owner/service.ts:56-63`, `sales.ts`, `order-details.ts`).
- From the code: stage changes only offer the server's `next_stages`.
- A parse check of a MAD gift order's JSON (date, slot, card, anonymous, add-on, recipient) read every field correctly.

## Not tested
- **Yallapp Business on a phone or emulator.** There's no Android SDK here and no web target, so it was checked by its widget tests and by code only.
- **Sending a notification or campaign.** No Firebase key in this env; the pages were read only.
- **Chat.**
- **Turkish.**
- **Starting a real build or downloads.** Blocked: setup has to be complete.
- **iyzico payments.** The fake iyzico wasn't running.
- **A customer signed in to the app.** All orders were guest checkouts, so app push notifications and `/me/orders` were not checked.
- **Postpone and Delivery failed stages** in the dashboard. Shipped and Delivered were done.
