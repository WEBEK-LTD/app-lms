# The marketplace (Phase 115): what exists, what's missing, and the build plan

Written 18 November 2026 from `origin/main` at `a9350e6`. It's read-only analysis:
no product code was changed. Paths are relative to the repo root.
`web/` is short for `platform/web/`.

## In short

Far more of Phase 115 is built than the open rows in `docs/ROADMAP.md` suggest.

- **Already built:**
  - the contract (39 operations, about 25 schemas);
  - the hosted API (`web/src/lib/hosted/connectors/market.ts`, 1,111 lines);
  - the money and statements;
  - the vendors' web panel, with nine tabs, a live board and a picking screen;
  - joining, with the /join page and the form builder;
  - the complaints queue and its decisions;
  - offers and the club;
  - the vendor app as the bundle's third app;
  - the customer app's marketplace screens;
  - Yallapp Business's Market board.
- **What's left is narrower and sharper.** It's mainly:
  - the catalog's editing, stock and scale;
  - the notifications, which the contract names but nothing sends;
  - settling the price of weighed items paid by card;
  - a few holes in the customer app;
  - vendors' own drivers on the map;
  - the owner's overview, wallets and vendor pages;
  - Paymob and the native wallet sheet;
  - the legal words.

Three real bugs turned up along the way (see "Bugs found", below the gap table).

---

## 1. The gap table

### 115.2 Contract

**What exists:** almost the whole row. The file is `docs/api/openapi.yaml`, and `web/public/developers/openapi.yaml` is byte-identical to it. It has:

- **The config.** `Config.market` → `MarketConfig` (:19572) holds the country, the currency and its decimals, the timezone, the kinds, `payment` {cash, card, apple_pay, google_pay, wallet, cash_max}, `tax`, `pickup`, `scheduling`, `club`, `wallet`, `weight_tolerance_percent` and `vendor_app` (same | bundle).
- **The vendors.** `VendorKind` (:19642), `MarketVendorSummary` (:19653) and `MarketVendor` (:19707), with its departments and aisles.
- **The catalog.** `MarketProduct` (:19766). The product list is paged with `page`/`per_page` and takes `q`, `department`, `aisle` and `barcode` (:6291).
- **The cart and orders.** `MarketCartInput` with `if_missing` and `substitute_product_id`, the priced lines in `MarketQuote`, and the order with its stages, `MarketTracking`, pick-up and `scheduled_for`.
- **Coupons, the wallet and the club.** Coupons as offers, `/me/wallet`, `/market/club` and `/me/club`.
- **Complaints.** `/me/.../complaints`, messages and photos.
- **The Vendor tag** (:324). It covers `/vendor/me`, the orders with accept, reject, `PATCH lines` (picking), ready and handover, plus statements, complaints and products with their stock.
- **Roles and notifications.** `User.roles` includes `vendor` (:13297). The four notification types are in the enum (:14586).
- **The owner's routes** for Yallapp Business are in `docs/api/owner.yaml` (:3288–3467).

**What's missing:**

- **Product fields.** `MarketProduct` has no `sku`, `barcode` or `stock`. They're in the TS type (`web/src/lib/data/types.ts:4952`) and only `stock` is in the PATCH body (:7254).
- **The price of weighed items.** There are no explicit fields for the estimated and the weighed price, on the line or on the order. Only `picked_quantity`, a recomputed `total` and the quote's `warnings` exist.
- **Cursor paging.** None: pages are offsets.
- **Catalog editing.** No product, department or aisle editing routes, for the vendor or for the owner.
- **A coupons flag.** None in `MarketConfig`.
- **Owner routes.** `owner.yaml` has none for vendor statements or applications.

### 115.5 Delivery per vendor

**What exists:**

- **The logic.** `web/src/lib/market/delivery.ts` has the vendor's fee (fixed or per km), the smallest order, the fewest and most items, pick-up codes and slots for later. The vendor's area is in `areas.ts` (115.19).
- **The courier's terms.** `MarketCourierTerms` (`delivery.ts:27`) covers what the customer pays and what the vendor is charged.
- **Settings.** The vendor's delivery form is in the panel's Delivery tab (`delivery-forms.ts`, `panel-pages.ts:232–251`).
- **The app's couriers.** Jobs are made at "ready" (`flow.ts:50` `makeMarketCourierJob`, only for `deliveryBy === "app"`), and the order follows the job when it's read (`flow.ts:217` `syncWithJob`).
- **Tracking.** The customer sees the map with the app's couriers and stages otherwise (`market.ts` `customerJson`, `mobile/lib/modules/market/screens/market_order_screen.dart:379,420`).
- **The vendor's own delivery.** Handover to the vendor's driver and "delivered" are in the vendor app (`vendor_order_screen.dart:228,240`).

**What's missing:**

- **The vendor's own driver on the map.**
  - `Courier` has no vendor link (`types.ts:4618`).
  - No job is made for `deliveryBy: "vendor"`.
  - Yallapp Courier has no vendor-driver sign-in (`mobile/lib/modules/courier_hub/`).
  - So a vendor that delivers itself is always tracked by its stages.
- **Orders for later are released late.** See bug B1.
- **Courier jobs show nothing about the order.** Yallapp Courier's job screen shows only the cash to collect: no vendor and no items (`courier_job_screen.dart:183`).

### 115.6 Joining

**What exists:**

- **The logic.** `web/src/lib/market/joining.ts` and `joining-forms.ts`.
- **The form builder and its link.** `web/src/app/dashboard/market/joining/[id]/page.tsx`.
- **The applications.** Each one is read, answered with "ask for more" or turned down, and on accepting it makes the vendor and its first staff member (`joining/applications/[id]/page.tsx`, `joining.ts:241`). The mails are in `joining.ts:214`.
- **The public page.** `web/src/app/join/[token]/page.tsx` and `web/src/app/actions/joining.ts:151`.
- **Limits.**
  - 5 an hour per IP and 200 a day per form (`joining.ts:23`).
  - 4 MB files.
  - One pending application per email.
- **Tests.** `market-joining*.test.ts`.

**What's missing:**

- **Bot protection.** There's no honeypot or challenge on /join.
- **Orphan files.** Files are saved before the answers are checked, so a refused submission leaves orphan assets (`actions/joining.ts:166`).
- **Business.** There's no applications screen in Yallapp Business.
- **Tests.** There's no e2e test.

Joining is otherwise done. The row's remaining work is small.

### 115.7 The vendors' web panel

**What exists:** `web/src/app/partner/[appId]/page.tsx` and `actions.ts`, `web/src/lib/market/panel*.ts`, and the live board in `web/src/components/vendor-board.tsx`.

- **Sign-in.**
  - An email code: 10 minutes and 5 tries.
  - 12-hour sessions in `vendor_web_sessions`.
  - Code requests limited to 8 an hour per IP (`actions.ts:26`).
- **The tabs.** Orders (polled every 8 s, with a sound), catalog, import, delivery, hours, offers, staff, statements and their exports (`web/src/app/api/partner/[appId]/statement/route.ts`), and complaints to read only.
- **Roles.** owner, manager, orders and picker (`panel-pages.ts:31`). The connector checks them again (`market.ts:198–219`).
- **Words.** en/ar/tr in `panel-words.ts`.
- **The picking screen** is part of the board (`vendor-board.tsx:376`).

**What's missing:**

- **Catalog editing.** The catalog tab changes only stock and photos (`actions.ts:78–198`). Nobody can make, edit or delete a single product, or a department or an aisle. The only way in is an import (`catalog-import.ts:241`).
- **Menus.** A restaurant's menu can't be edited from the panel ("Restaurants' menus are set by the app's team", `panel-pages.ts:189`).
- **Notifications.** No push to the vendor's staff on a new order. The sound plays only while the board or the app is open (see bug B2).
- **Tests.** The e2e (`web/tests/e2e/partner-panel.spec.ts`) covers only refusals. Nothing signs in and works an order.
- **The owner's screenshot** of the panel is still owed, as the row asks.

### 115.8 Supermarkets and shops

**What exists:**

- **Data.** `market_departments`, `market_aisles` and `market_products` (migration `0113`):
  - prices in minor units;
  - `unit` (item, kg, g or l);
  - `step` and `max_quantity`;
  - `stock` and `in_stock`;
  - a unique `sku` per vendor;
  - an index on `barcode`.
- **Paged search.** The paged, searched list is in `web/src/lib/data/mysql.ts:5697`: `LIKE %q%` on the name, brand and description, `LIMIT/OFFSET` and a `COUNT`. A barcode or SKU is matched exactly.
- **The cart.** It checks the step, the most allowed and the stock (`cart.ts:186–197`), and warns that weighed items can change by up to the tolerance (`cart.ts:293`).
- **The tolerance.** `weightTolerancePercent` defaults to 10 (`settings.ts:24`).
- **Picking.**
  - Each line is picked with its weight, swapped or left out.
  - "Leave it out" and "the chosen item" are both enforced.
  - The price is never above the estimate plus the tolerance.
  - The money is computed again afterwards (`flow.ts:135` `pickMarketOrder`).
  - It runs in the panel and in the vendor app (`vendor_pick_screen.dart`).
- **The import engine.** `catalog-import.ts` and `sheets/*` read xlsx, xls, CSV, TSV and JSON, guess the columns in three languages, show each row's errors, update by SKU or barcode, and make the departments and aisles a file names. A 50,000-row test exists (`market-imports.test.ts:190`).
- **Imports by link.** `readSheetUrl` (`sheets/url.ts`) reads a link and a Google Sheet.
- **The panel's import tab.** A 5 MB file is checked, then applied.
- **Photos.** Covered by 115.7.1.
- **The customer app.**
  - Departments are pinned tabs.
  - Weighed items step in their step and show their price per kg.
  - "Sold out" is shown.
  - The checkout has a dropdown for what to do with a missing item.

**What's missing:**

- **Stock never goes down.** No market order lowers `stock` (compare `mysql.ts:1810` for the shop catalog). "Out of stock by itself" isn't done, and two customers can buy the last item.
- **The weighed price after picking isn't settled with the payment.** A card is charged `payNow` once, on the hosted page (`market.ts:509`). Picking then changes `money` (`flow.ts:166`), but nothing refunds a lower total or collects a higher one. The paid amount and the order's total then disagree (see decision D1).
- **Contract and app fields** for the estimated and the weighed price (see 115.2). `MarketProduct` in `mobile/lib/core/api/models/market_api_models.dart:481` has no barcode or stock.
- **Catalog editing**, for the vendor and the owner (see 115.7).
  - The owner's vendor form (`web/src/app/dashboard/restaurants/forms.tsx`) has no kind field.
  - A grocery or shop can only be made by accepting an application, or by the demo.
- **Imports, the rest:**
  - choosing the columns by hand (`suggestMapping` is always used, `panel-pages.ts:199`);
  - an import by link (`readSheetUrl` is never called);
  - imports again on a schedule (no job and no table);
  - files over 5 MB (`IMPORT_MAX_BYTES`, the Netlify action limit), when a 50,000-row xlsx can be bigger;
  - the owner importing for a vendor.
- **The customer app:**
  - Only the first 12 products of each department are loaded, with no paging and no aisles (`mobile/lib/modules/market/data/market_providers.dart:134–145`). The client supports `page`, `aisle`, `query` and `barcode` (`core/api/yallapp_api.dart:3205`).
  - No product page.
  - "A chosen one" is shown as "similar" (`market_checkout_screen.dart:695`), and there's no way to choose the item.
  - No barcode scanner package in `mobile/pubspec.yaml`.
- **Search at scale.** With no index on the name, `LIKE %q%`, `OFFSET` and a `COUNT(*)` scan the vendor's whole catalog on every page (see risk R5).
- **The import holds the catalog in memory.** `vendorProducts` loads the whole catalog into memory for matching (`catalog-import.ts:231`).

### 115.9 Complaints

**What exists:**

- **The logic.** `web/src/lib/market/complaints.ts` covers:
  - the 48-hour window from delivery, pick-up, refusal or cancelling;
  - the reasons, the items and up to 5 photos;
  - one active ticket per order;
  - the queue's timers;
  - the decision: a full or part refund to the payment through `refundMarketPayment`, the wallet or a coupon; a compensation; or no refund with its reason;
  - the vendor's read-only view;
  - ready replies in en/ar/tr.
- **The dashboard.** `web/src/app/dashboard/market/complaints/*` has the queues (open, customer, mine, closed, all), taking a ticket, its status, internal notes, a 4-hour target (`support.ts:67`), ready replies, sharing with the vendor, and every step in the audit (`web/src/app/actions/market.ts:67,104,139`).
- **The customer app.** `market_complaint_screens.dart`.
- **Yallapp Business.** The thread, a reply and the decision (`business/lib/features/market/complaint_screen.dart`).
- **The vendor.** Reads the complaints shared with it (panel and app).

**What's missing:**

- **The notification.** `complaint_update` is never sent to the customer on a reply or decision (bug B2).
- **Chat (77).** The thread is the ticket's own `messages` column, not the app's support chat. The row asks for the chat beside the ticket (see decision D4).
- **Window edge cases:**
  - An order stuck "on the way" never ends, so its window never closes.
  - An app-courier order becomes "delivered" only when it's next read (`syncWithJob`), so `completedAt` (and the 48 hours) can start late.
  - See decision D3.
- **Tests.** No e2e.

### 115.10 Coupons, the wallet and the club

**What exists:**

- **The logic.** `offers.ts` checks coupons for every condition in the row and redeems them, makes one-person coupons, pays from the wallet and gives back to it, and handles the club's benefit, joining, renewing, cancelling, `clubDue` and the savings.
- **Places' own offers.** `vendor-coupons.ts` (115.18).
- **The owner's page.** "Offers & club" (`web/src/app/dashboard/market/offers/page.tsx`).
- **The customer app.** The wallet and the club (`market_club_screens.dart`), and the coupon and wallet at checkout.
- **Data.** `wallet_entries`, which are idempotent by `entry_key`.

**What's missing:**

- **Renewing the club.** Renewals are only counted: `runMarketDaily` adds up `due.renewals.length` and charges nothing (`web/src/lib/market/daily.ts:21–23`). No `club_renewal` notification is sent, so a membership simply lapses.
- **Wallets.** No Wallets page for the owner: no list, no balance, no hand adjustment. The wallet is only a settings switch.
- **The club.** No members list.
- **Cashing out.** The wallet has no rule for it (decision D5).

### 115.11 Payments

**What exists:**

- **The layer.** `web/src/lib/market/payments.ts`: the choices by gateway and currency, the highest cash amount, who collects cash, refunds, and the owner's setup steps.
- **Gateways.** Stripe's form with Apple Pay and Google Pay (#454), and the card inside the page for iyzico and Kashier (#450).
- **Settings.** The gateway, Apple Pay and Google Pay switches, and cash with its highest amount, in Marketplace settings.

**What's missing:**

- **Paymob.** Not in `HOSTED_WALLETS`/`PaymentProviderId` (`payments.ts:21`).
- **The app's own wallet sheet.** No native Apple Pay or Google Pay sheet, and no gateway that takes its token.
- **The weighed-items settlement** (115.8 and D1).
- **Holding money.** No authorize-then-capture hold anywhere.

### 115.12 Studio's pages

**What exists:** `web/src/app/dashboard/market/{orders,complaints,offers,joining,statements,settings}`, which Studio re-exports under `web/src/app/studio/project/market/*`. The menu is in `web/src/lib/app/kinds.ts:1205`.

- **Orders.** The day's numbers and status filters.
- **Statements.** Every vendor's month, each with CSV, XLSX and PDF.
- **Settings.** Country, currency, tax, areas, cash and its highest amount, the gateway, Apple Pay and Google Pay, and the courier's terms.
- **Vendors.** The 105.1 restaurant pages, reused.

**What's missing:**

- **An overview.** The live map is the generic `/dashboard/delivery/live`.
- **Vendor pages that know the marketplace:** the kind, the catalog, the delivery mode and the staff's roles. `forms.tsx` has commission, tax and area, but no kind.
- **Order filters.** No filters by vendor, date, payment or area. A name search only looks through the newest 200 orders (`orders/page.tsx:53–60`).
- **Separate pages:** Coupons, Club (with its members) and Wallets.
- **A statements export** for all vendors at once.
- **Tests.** No e2e. The owner's screenshot is owed.

### 115.16 The apps

**What exists:**

- **The customer app** (`mobile/lib/modules/market/`). The home's sections in three looks, the vendor page, search, checkout (delivery or pick-up, later, coupon, wallet, payment, every price line), orders, tracking, the wallet, the club and complaints.
- **The vendor app.** It's the bundle's third app, built when `market.vendor_app = bundle`:
  - the build: `web/src/lib/market/vendor-app.ts`, `web/src/lib/app/setup.ts:357–389`;
  - its package and bundle ID end in `.vendor`;
  - its store listing: `vendorListing`;
  - the screens (`mobile/lib/modules/vendor/screens/`): the desk, the order, picking, stock, hours and days off, running late, statements and complaints.

  Inside the customer app there's a Vendor tab instead when `vendor_app = same`.
- **Yallapp Courier.** It takes marketplace jobs (`mobile/test/widget/phase115_courier_test.dart`).
- **Yallapp Business.** The Market board with orders, complaints and vendors (read only) (`business/lib/features/market/market_screen.dart`).
- **Words and tests.** en/ar/tr strings in every app, and widget tests `phase115_*`.

**What's missing:**

- **Customer app:**
  - **Dish choices.** `_add` puts a dish in the basket without opening its choices, and the basket never sends `choices` (`market_vendor_screen.dart:58`, `market_basket.dart`). A dish with a required choice can't be ordered: the server refuses it (`cart.ts:172`).
  - **The catalog.** Paging, aisles, the product page and "a chosen one", as in 115.8.
- **Vendor app:** barcode in stock and picking, catalog editing, and push notifications.
- **Yallapp Courier:** vendors' own drivers, and the order's details on the job.
- **Yallapp Business:** vendor statements, applications, and editing a vendor (commission, pause).
- **Store reviews:** no reviewer notes for the vendor role (nothing in `web/src/lib/publishing/` or `web/src/lib/delivery/review.ts` speaks of vendors).

### 115.17 Words for people

**What exists:** the /solutions/multi-vendor page and the /docs/multi-vendor guide in en/ar/tr (115.13), and the vendor app's listing text (`vendor-app.ts:68`).

**What's missing:**

- **The privacy policy and terms.** `web/src/content/legal.ts` says nothing about vendors' data, the wallet, the club's renewals or complaints.
- **The customer app's listing.** It doesn't speak of the marketplace.
- **The docs** for the import formats and the picking.

### Bugs found

- **B1. Orders for later are released once a day.** `releaseScheduled` runs only in the daily job (`web/src/lib/market/daily.ts:24`, called from `web/src/app/api/internal/daily/route.ts:152`). An order for 14:00 reaches its vendor only on the next daily run, which can be hours late. It belongs in the frequent job (`web/src/app/api/internal/frequent/route.ts`).
- **B2. No marketplace notifications are sent.** `market_order_update`, `vendor_order`, `complaint_update` and `club_renewal` are in the contract. Nothing sends them except one rating reply (`web/src/lib/owner/rating-replies.ts:95`). The only marketplace push is to the owner's team on a new complaint (`market.ts:659`).
  - Vendors hear an order only while the board or the app is open.
  - Customers learn of a stage only by opening the order.
- **B3. A dish with a required choice can't be ordered from the app.** See 115.16.

---

## 2. The build plan

Each stage is one PR that can ship alone. They're listed in order of what depends on what.

The next migration number is `0145`, after `0144_app_stories`. The names below are placeholders: drizzle-kit gives the numbers when each one is generated.

**Order changed from the brief.** A small Stage 0 goes first. Both of its bugs hurt every vendor kind today, and nothing in it depends on the catalog. Delivery per vendor (115.5) stays after the vendor app, as asked.

### Stage 0: fixes that can't wait (S, about 1 day)

- **Contract:** none. The four notification types already exist.
- **Migrations:** none.
- **Platform:**
  - call `releaseScheduled` from the frequent job;
  - send `vendor_order` to the vendor's staff on placed and released orders;
  - send `market_order_update` to the customer on every stage;
  - send `complaint_update` on support's reply and decision;
  - put them in one `lib/market/notify.ts`, which `flow.ts` and `decideComplaint` call.
- **Apps:**
  - the customer and vendor apps open the order or complaint from a tap (the mobile agent);
  - a customer's dish opens its choices before it goes in the basket (B3).
- **Business:** none.
- **Tests:**
  - unit tests: each stage sends one push; a scheduled order is released within its preparation time;
  - a widget test for the dish's choices.
- **In parallel:** the platform part and the mobile part are on separate branches.

### Stage 1: the catalog, its data and API (L, 4–5 days)

- **Contract:**
  - `MarketProduct`: add `sku`, `barcode`, and `stock` (shown to the vendor only, or a `low_stock` flag for customers).
  - `MarketOrderLine`: add `estimated_total`, and `final_total` (null until picked). The order gets `estimated` (true while weighed lines aren't picked).
  - Vendor routes: `POST/PATCH/DELETE /vendor/products`, `GET/POST/PATCH/DELETE /vendor/departments` and `/vendor/aisles`.
  - An optional `cursor` beside `page` on the product lists.
- **Migrations:**
  - `market_product_search`: a normalized `search_name` column, with Arabic alef forms, taa marbuta and diacritics folded, Turkish dotted and dotless i folded, and lowercase; an index on (`app_id`, `vendor_id`, `search_name`); an index on (`app_id`, `vendor_id`, `sku`) for lookups.
  - `market_stock_moves`: the order, the product, the quantity and the kind (`taken`, `returned`), so stock is put back exactly once.
- **Platform:**
  - **Stock.** It goes down when an order is placed, with one `UPDATE … SET stock = stock - ? WHERE stock >= ?` for each counted line, and an "out of stock" refusal when no row changes. It comes back on cancel, refusal or a line picked as missing.
  - **Products.** `lib/market/catalog-edit.ts` makes, edits and deletes products, departments and aisles, with checks shared by the panel and the owner.
  - **Search.**
    - Use a prefix `LIKE 'q%'` on `search_name` first. Fall back to contains only when the prefix finds too few.
    - Use keyset paging on (`in_stock`, `position`, `id`) for long lists.
    - Count only on the first page.
- **Pages:**
  - the panel's catalog tab gets "Add product", an edit sheet with its unit, step, price, stock, SKU, barcode, department and aisle, and the departments and aisles in order;
  - the owner's vendor page (`dashboard/restaurants/[id]`) gets the same catalog for groceries and shops, plus the vendor's kind.
- **Apps:** none in this stage. They follow in Stage 3.
- **Tests:**
  - the store suites on memory and MariaDB, including two orders racing for the last item;
  - isolation: one vendor can't edit another's products;
  - search with Arabic text and keyset paging over 100,000 rows in the MariaDB suite;
  - the contract tests.
- **In parallel:**
  - the contract and the store/migration go first (one programmer, one day);
  - then the panel pages and the owner's pages are separate branches.

### Stage 2: imports, the rest (M, 3 days). Needs Stage 1.

- **Contract:** none. This stage is web only.
- **Migrations:** `market_catalog_feeds`: the vendor, a link, the column mapping, how often (daily or hourly), the last run, the last result and the next run.
- **Platform:**
  - **Columns.** The vendor can change the guessed columns before applying.
  - **Imports by link.** Wire in `readSheetUrl`, for Google Sheets and any CSV, xlsx or JSON link.
  - **Imports on a schedule.** A few feeds run each time the frequent job runs, each with a time limit.
  - **Big files.** Files up to 25 MB go up in chunks, like the photos' uploads (`market/uploads`), instead of through the 5 MB action.
  - **Matching.** It's done by queries on SKU and barcode, not by loading the whole catalog (`vendorProducts`).
  - **The owner.** The owner can import for a vendor.
- **Pages:** the panel's Import tab (the columns, the link and its schedule, the last run's result) and the same on the owner's vendor page.
- **Apps:** none.
- **Tests:**
  - unit tests: the column choice, a feed's run and its errors, a 50,000-row xlsx over chunks;
  - e2e: an import from a link in the panel.
- **In parallel:** runs alongside Stage 3. They share no files.

### Stage 3: the catalog in the apps (M/L, 4 days, the mobile agent). Needs Stage 1's contract.

- **Contract:** the fields from Stage 1.
- **Migrations:** none.
- **Platform:** none.
- **Customer screens:**
  - a department, then its aisles, then an endless list (`page`/`cursor`);
  - a product page with its photos, brand, unit and step;
  - "a chosen one" with a picker from the same vendor;
  - a note on weighed items ("weighed when picked, up to N% more or less");
  - the estimated total until the order is picked, then the weighed one.
- **Vendor screens:**
  - barcode scanning in Stock and Picking (a camera scanner package, with typed entry as a fallback);
  - catalog editing (add or edit a product, with its photo);
  - push taps (from Stage 0).
- **Courier screens:** none.
- **Business:** none.
- **Tests:**
  - widget tests: paging, the aisles, the chosen substitute, the scanner's typed fallback;
  - en, ar and dark goldens.
- **In parallel:** the customer and vendor screens can be two branches.

### Stage 4: settling weighed items (M, 2–3 days). Needs Stage 1 and decision D1.

- **Contract:**
  - `MarketOrder.settlement` {paid, final, difference, how (refund, wallet, none)};
  - the decision's words go in `MarketConfig`.
- **Migrations:** `market_order_settlement`: a column on `market_orders`, or a part of the `money` JSON. The JSON needs no migration.
- **Platform:**
  - **When the picked total is lower** than what was paid, the difference goes back automatically when the order is ready. It goes to the payment through `refundMarketPayment`, with the wallet as the fallback.
  - **When it's higher,** the D1 rule applies.
  - **Statements** count the settlement on the right side.
- **Apps:** the customer's order shows the estimate, the weighed price and the settlement.
- **Tests:**
  - unit tests: lower, equal and higher; three-decimal and no-decimal currencies; cash, card and wallet; a refund that fails and falls back to the wallet;
  - statement totals that still add up.
- **In parallel:** the platform part and the app part.

### Stage 5: complaints, finishing (S, 1–2 days)

- **Contract:** a complaint's `support_chat_id` if D4 links the chat.
- **Migrations:** none if D4 keeps the ticket's own thread.
- **Platform:**
  - the window's end for app-courier orders comes from the job's delivered time, not from when the order is next read;
  - the D3 rule for stuck orders;
  - a honeypot on /join, with its files saved after the check (from 115.6);
  - complaint e2e tests.
- **Apps:** none beyond Stage 0's push.
- **Business:** none (the decision form exists).
- **Tests:** unit tests for the window's edges; e2e from opening a ticket to its decision, in the dashboard.
- **In parallel:** fully parallel with Stages 2–4.

### Stage 6: the vendor's panel and app, finishing (M, 2–3 days). Needs Stages 0, 1 and 3.

- **Contract:** none new.
- **Migrations:** none.
- **Platform:**
  - an e2e that signs in and accepts, picks, readies and hands over an order;
  - a restaurant's menu editable in the panel by its owner and managers (decide: the row lists "the menu or catalog");
  - the owner's screenshot.
- **Apps:**
  - the vendor app's reviewer notes for Apple and Google: a demo staff number, and what the app is for;
  - the push permission prompt.
- **Business:** none.
- **Tests:** e2e, and widget tests for the push taps.
- **In parallel:** the web part and the app part.

### Stage 7: delivery per vendor (M/L, 3–4 days)

- **Contract:**
  - `Courier.vendor_id` in the courier contract;
  - in the vendor app, `GET/POST /vendor/drivers`;
  - `MarketTracking` stays the same (`mode: map`).
- **Migrations:** `courier_vendor`: a nullable `vendor_id` on `couriers`.
- **Platform:**
  - **Drivers.** A vendor's owner or manager adds drivers, who are couriers tied to the vendor.
  - **Jobs.** At "ready", a `deliveryBy: "vendor"` order gets a job offered only to its vendor's drivers.
  - **The customer.** Sees the map while the driver is signed in, and the stages otherwise.
  - **Jobs show the order.** They carry the vendor's name and the items' count.
  - **The panel** gets a Drivers tab.
- **Courier app:** Yallapp Courier opens "<vendor> at <app>" as a company, and the job screen shows the vendor and the items.
- **Business:** none.
- **Tests:**
  - isolation: one vendor's drivers never see another's jobs, and the app's couriers never see a vendor's;
  - widget tests for the courier screens.
- **In parallel:** the platform part, then the courier screens. Independent of Stages 2–5.

### Stage 8: joining, finishing (S, 1 day)

- **Business:** an Applications screen that lists them, reads one, and accepts or turns it down. The owner's API needs `GET/POST /apps/{id}/market/applications…` in `owner.yaml`.
- **Tests:** an e2e from the form's link to an accepted vendor.
- **In parallel:** yes.

### Stage 9: the wallet, the club and coupons, finishing (M, 2–3 days). Needs decisions D5 and D6.

- **Contract:**
  - `ClubMembership.renews_at` and `renewal_link`;
  - in `owner.yaml`, the wallets and a hand adjustment.
- **Migrations:** none (the wallet's entries are enough). Add a `cashout` entry kind only if D5 says yes.
- **Platform:**
  - **Renewals.** Ask for them by `club_renewal` with a payment link 3 days before the end, and once more on the last day. Gateways in the repo can't charge a saved card yet, so there's no automatic charge.
  - **Pages.** A Wallets page (balances, history, an adjustment with its reason in the audit), the Club's members, and Coupons apart from the club.
- **Apps:** the club's renewal screen from the notification.
- **Business:** a customer's wallet, read only.
- **Tests:** unit tests for renewal and adjustments; idempotent entries.
- **In parallel:** the pages and the renewal job.

### Stage 10: payments, finishing (L, 4–5 days, after each gateway confirms)

- **Contract:** `POST /me/market-orders/{id}/pay` takes `{ method, token }` for the native sheet. `MarketConfig.payment.native` says which wallets the sheet offers.
- **Migrations:** none (the gateway's keys sit in the existing payment accounts).
- **Platform:**
  - Paymob as a gateway, with its hosted page and Apple Pay in Egypt;
  - token payment where the gateway takes it (Stripe first);
  - what the owner sets up, shown in Studio › Payments.
- **Apps:** the native Apple Pay and Google Pay sheets.
- **Tests:** unit tests with fake gateways; the Paymob webhook's signature.
- **In parallel:** Paymob and the native sheet are separate branches.

### Stage 11: Studio's pages, finishing (M, 3 days). After Stages 1 and 9.

- **Pages:**
  - an overview: the orders now, the live map with the app's couriers and the vendors' drivers, and the day's numbers;
  - Vendors with the kind, delivery and staff's roles;
  - Orders filtered by vendor, date, payment and area, in SQL (no 200-order cap);
  - an export for all vendors' statements.
- **Words:** dashboard Arabic in MSA and Studio's words in Egyptian Arabic, in en/ar/tr.
- **Tests:** e2e for each page, and the owner's screenshot.
- **In parallel:** each page is a branch, if the menu (`kinds.ts`) is touched in one place only.

### Stage 12: words (S/M, 2 days, last)

- the privacy policy and terms (vendors' data, the wallet, the club's renewals, complaints and refunds) in en/ar/tr, for the owner to read before they merge;
- the docs on imports, picking and settlement;
- the customer app's store listing words for the marketplace.
- **Tests:** the pages' three-language tests.

### What runs side by side

- Stage 0 first.
- Then Stage 1's contract and store.
- Then, at once and on separate branches:
  - Stage 1's pages;
  - Stage 2;
  - Stage 3;
  - Stage 5;
  - Stage 7;
  - Stage 8.
- Stage 4 waits for D1.
- Stages 9 and 10 wait for their decisions.
- Stage 11 and then Stage 12 close it.

**Shared files to watch:**

- `docs/api/openapi.yaml`: merge contract changes first, one at a time;
- `web/src/lib/hosted/connectors/market.ts`;
- `web/src/lib/data/{store,memory,mysql}.ts`;
- the drizzle journal: generate migrations only on the branch about to merge.

---

## 3. Decisions for the owner

### Decided (18 November 2026)

The owner approved these on 18 November 2026. They're also in `docs/ROADMAP.md` Phase 115, under the owner's decisions. Where a decision differs from the proposals further down, the decision holds.

- **D1. Weighed items paid online.**
  - The card, Apple Pay, Google Pay or wallet pays the estimate.
  - A lower weighed total is refunded automatically to the payment, with the wallet as the fallback.
  - These orders never charge more than was paid.
  - Cash keeps the +10% tolerance (`weightTolerancePercent`).
  - Later, for Stripe only: a hold of the estimate **+10%**, captured at the weighed price.
- **D2. Substitutes are asked live** (this differs from the proposal).
  - The picker proposes a similar item from the same aisle, never dearer than the line.
  - The customer accepts it or leaves it out in the app within 5 minutes.
  - Otherwise the order's "If something is missing" choice applies. That choice is set once for the whole order (similar by default) and can be changed per item.
- **D3. The complaint window.**
  - The 48 hours start at the courier job's delivered time.
  - A stuck order can be complained about after 6 hours.
  - One new ticket is allowed after a decision.
  - Refused or cancelled orders take a ticket only if money was taken.
- **D4.** Keep the ticket's own thread, shown inside Support.
- **D5.** The wallet is credit only, with no cash-out.
- **D6.** The club renews by a reminder and a payment link, at the owner's prices.
- **D7.** The vendor app is the third app in the bundle. Keep the in-app tab for small marketplaces.
- **D8.** No cash limit unless the owner sets one. Weighed orders count the estimate plus the tolerance against it.
- **D9.** `stock` null means not counted.
- **D10. Places edit their own catalog and menus,** with the owner's Undo (this is wider than the proposal, which was menus only).
- **Customer contact** (new).
  - The customer sees the picker's and the courier's first names.
  - A call goes through a masked number, for the app's couriers only.
  - A store never reaches a customer.

### What the decisions change in the plan

- **Stage 1.** Products, departments and aisles edited by a place are marked "Changed by the place", with the owner's Undo, as for its hours (115.20's `vendor_edit`). The same holds for a restaurant's menu, which Stage 6 makes editable in the panel.
- **Stage 3.**
  - The checkout sets "If something is missing" once for the whole order, similar by default, and lets the customer change it per item.
  - The contract gets an order-level `if_missing` beside the line's.
- **Stage 4.**
  - The settlement follows D1 as written: card, Apple Pay, Google Pay and wallet orders are capped at the paid amount, and a lower total is refunded to the payment with the wallet as the fallback.
  - Cash keeps `weightTolerancePercent`.
  - The Stripe hold is estimate +10%, later.
- **New stage 4b: live substitutes (M, 3 days).** Needs Stage 0's notifications and Stage 3.
  - **Contract:** a line's `proposal` {product, quantity, price, expires_at}, and `POST /me/market-orders/{id}/lines/{line_id}/answer` {accept | leave_out}.
  - **Migrations:** none (it goes in the order's `lines` JSON).
  - **Platform:**
    - the picker proposes an item from the same aisle, never dearer than the line;
    - a push to the customer;
    - after 5 minutes the frequent job, or the next read, applies the order's choice;
    - the order can't be "ready" while a proposal is waiting.
  - **Apps:**
    - the customer answers from the notification or the order;
    - the vendor's picking screen shows "waiting for the customer" with its time left.
  - **Tests:**
    - unit tests: accepted, left out, timed out, a dearer item refused;
    - widget tests.
- **Stage 7 grows: masked calls (M, 2–3 days),** for the app's couriers only.
  - **Contract:** `MarketTracking.courier.call` {available}, and `POST /me/market-orders/{id}/call` that returns a number or connects a call.
  - **Platform:**
    - a masked-calling provider (to be chosen, and a cost for the owner);
    - calls only while the order is on its way;
    - the picker's and the courier's first names on the order.
  - **No calls for places:** no route lets a place or a vendor's own driver reach the customer.
  - **Tests:** unit tests for who may call and when.
  - **For the owner:** the provider and who pays for calls.

### The proposals as written

Each has a recommended default. They're only things Phase 115 doesn't already decide.

- **D1. Weighed items paid online.**
  - **Background.** Today the card pays the estimate once. Picking may go up to the tolerance (10% by default), and the difference is neither collected nor refunded.
  - **Default.** Charge the estimate.
    - If the weighed total is lower, give the difference back automatically to the card (to the wallet if the refund fails).
    - If it's higher, the place keeps to what was paid: the price is capped at the paid amount for card, Apple Pay, Google Pay and wallet orders.
    - The +N% tolerance stays for cash orders.
  - **Later, with Stripe.** A hold of the estimate + 15%, capturing the weighed price.
  - **The owner decides:** the extra margin a hold takes (+10% or +15%), and whether a place may go over it by asking the customer.
- **D2. Who picks a substitute.**
  - **Background.** The customer already picks similar, chosen or leave it out.
  - **Default.** For "similar", the picker chooses from the same department and aisle at the same or a lower price per unit. A dearer one costs no more than the original line, which is already enforced (`flow.ts:151–153`).
  - **Option.** Ask the customer in the app, with 5 minutes to answer, then leave it out. That needs a new stage.
- **D3. The 48-hour window's edges.**
  - **Default.**
    - **App-courier orders:** the 48 hours start at the courier job's delivered time.
    - **Stuck orders:** an order stuck "on the way" over 6 hours can be complained about at once, and its window closes 48 hours after the order's last stage.
    - **Repeat tickets:** a new ticket after a decision is allowed once.
    - **Turned-down and cancelled orders:** a ticket can be opened there only when money was taken.
- **D4. Where support talks to the customer.**
  - **Default.** Keep the ticket's own thread, which is built and tested. Show it in the app's Support (77) as a conversation, but don't move it into the chat tables.
- **D5. Cashing out the wallet.**
  - **Default.** No. The wallet is credit in the app only: refunds and compensations. A refund the customer wants in cash goes to the payment through a complaint. This keeps Yallapp and the owner out of holding customers' money.
- **D6. The club's renewal.**
  - **Background.** The club's prices are set by the app's owner, as already decided.
  - **Default.** It renews by a reminder with a payment link (3 days before, and on the last day). Automatic charging waits for a gateway with saved cards.
  - **Lapsed members** keep their savings history.
- **D7. How the vendor app ships.**
  - **Background.** Both exist today: `vendor_app = bundle` builds the third app, and `same` puts a Vendor tab in the customer app.
  - **Default.** The third app in the bundle, as the build already does, and not inside Yallapp Business. Business is the owner's app. A vendor's staff must never see the owner's other apps or customers.
  - **Recommendation.** Keep `same` for small marketplaces only.
- **D8. The highest cash amount.**
  - **Default.** No limit unless the owner sets one. Orders with weighed items count their estimate + tolerance against the limit.
- **D9. Stock that isn't counted.**
  - **Default.** `stock = null` means "not counted". Only counted items go out of stock by themselves.
  - **Weighed items.** Their stock is kept in their unit (kg) as a whole number of steps.
- **D10. Vendors editing a restaurant's menu in the panel.**
  - **Background.** Today the panel says the app's team sets menus.
  - **Default.** Allow it for the place's owner and managers, like its hours (115.20). The owner sees "Changed by the place", with Undo.

---

## 4. Risks

- **R1. MariaDB.**
  - **Search.** MariaDB has no `ngram` full-text parser (MySQL's), so FULLTEXT won't search Arabic or Turkish word parts well. Use a normalized `search_name` column with a prefix index (Stage 1), not FULLTEXT.
  - **JSON columns.** These are `longtext`: `lines`, `money`, `timeline` and `messages`. Keep any filter off them; anything filtered on needs its own column.
  - **The live database.** Migrations that add an index to `market_products` lock the table on big catalogs. Use `ALGORITHM=INPLACE, LOCK=NONE` where MariaDB allows it, and run them outside peak hours.
  - **Tests.** The store suites already run on MariaDB, and must cover each new query.
- **R2. The store reviews.**
  - **Apple.** The vendor app is listed for one company's places only (`vendorListing`), which Apple reviews as an Unlisted or business app. It needs a working demo staff sign-in and reviewer notes, which don't exist yet (Stage 6).
  - **Wallet payments.** Apple Pay for goods is allowed, but the app must not use in-app purchase words for the club. The club is a delivery service, not digital content, so it's paid by card.
  - **Google.** Google asks why a background location is needed for vendors' drivers (Stage 7). Use location only while a job is on the way.
- **R3. Money rounding.**
  - **What's sound.** Minor units everywhere and rounding per line (`currency.ts`, `money.ts`).
  - **The new risks:**
    - weighed lines (`price × 0.375 kg`) at 0 and 3 decimals;
    - repricing after picking with a coupon and tax kept as they were (`flow.ts:160–171`);
    - the D1 settlement;
    - part refunds after a statement.
  - Each needs a case in the totals-always-add-up tests.
  - **Gateways.** Some gateways take only 2 decimals: KWD, BHD and OMR with Stripe need ×10 rounding rules. Check `providerTakes` per currency before turning one on.
- **R4. Arabic and RTL.**
  - **Search.** Arabic letter forms (أ/إ/آ/ا, ة/ه, ى/ي) and diacritics must be folded for search and for matching an import's departments.
  - **Numbers and units.** Weights and prices must stay left to right inside Arabic text, as `ltrRun` already does.
  - **Imports.** Arabic headers are already guessed (`catalog-import.ts:30`). Arabic-Indic digits (٠١٢٣) in imported prices are stripped by `readAmount` (`catalog-import.ts:62` keeps only ASCII digits), so such a price is refused or misread. Fold them to ASCII first.
  - **Notifications.** New notifications need their three languages, with the dashboard in MSA and Studio's words in Egyptian Arabic.
- **R5. Big catalogs.**
  - **Product lists.** `LIKE %q%` + `OFFSET` + `COUNT(*)` scan the vendor's products on every page. At 100,000 products this will be slow. Stage 1 fixes it.
  - **Search across vendors.** `market/search` runs one product query per vendor, one after another (`market.ts:377–386`). With 200 vendors that's 200 queries for one search. Search one vendor kind at a time in a single query, or cap the vendors searched to those that deliver to the customer.
  - **The app.** Loading 12 products per department for every department at once (`market_providers.dart:136`) is one request per department on opening a supermarket.
  - **Imports.** Imports are held in memory, and server actions carry only 5 MB (Stage 2).
  - **App copies.** `apps/copy.ts:404` copies catalogs 200 at a time. A copy of a big marketplace is long, and should run as a job.
