# Zad marketplace screens (Phase 115), 18 November 2026

Designs for the owner's approval before anything is built: the supermarket
inside the marketplace (customer app), the vendor app for a store's staff, and
the complaints pages of the dashboard. Nothing here is product code.

Open **[index.html](index.html)** for the contact sheet: every screen side by
side in English and Arabic (right to left), light and dark.

## The look

The screens belong to Zad's approved look A, **Market arches**
(`platform/web/src/lib/studio/demo-designs/zad-signature.ts`, 130.3), checked
against the app's own renders of it (`platform/web/public/screens/zad-home.png`,
`zad-market.png`):

- paper `#F5F2EA`, deep green `#1B644C`, amber `#F2A93B` as the second colour,
  the poster green `#134A36`; a night designed for it (`#09130E`, mint
  `#8FDDB9`), never inverted;
- Plus Jakarta Sans, Lexend for prices and big numbers, Readex Pro for Arabic
  (the app's Arabic font), JetBrains Mono for codes;
- photos cut as arches, the deep green offer posters, the frosted tab bar with
  every tab named, round glass buttons over photos;
- Material Symbols Rounded for every icon.

The dashboard uses Yallapp's own dashboard tokens and fonts
(`platform/web/src/app/globals.css`: ivory and midnight, Bricolage Grotesque
and IBM Plex Sans Arabic), and its words and their Arabic come from
`platform/web/src/i18n/dashboard/market.ts` (Modern Standard Arabic, as 115.12
asks of the marketplace's pages). The apps' Arabic is Modern Standard Arabic;
the vendor app's words follow the partner panel's (`lib/market/panel-words.ts`).

Every name, price and product is Zad's demo (`lib/demo/marketplace.ts`): Zad
Market, its departments, its prices in EGP with VAT in them, FRESH15, Zad Club
at EGP 49 a month or EGP 490 a year, Karim the courier, Samir the picker. No
Talabat or Yemeksepeti logo, colour, name or screen is used.

## The screens

**New** means nothing like it exists today. **Addition** means the screen
exists (per the audit, `docs/plans/2026-11-18-marketplace-audit.md` on
`wip-marketplace-audit`) and the design adds the missing parts on top of its
current look; the existing screen is named so the owner can compare (see
"The existing screens" below).

| # | Screen | New or addition | Files |
|---|---|---|---|
| 1 | The supermarket's home inside the marketplace: the store's card (time, fee, smallest order, Club), search with a barcode button, offers, departments as arches, buy again, the cart bar | Addition to the vendor page (`market_vendor_screen.dart`, `public/screens/zad-market.png`): the barcode button, offers row and "Buy again" are new | `screens/01-supermarket-home.html` |
| 2 | A department: aisles as photo chips, sort and filters, a two-column grid (add, then minus and plus; weighed items step in kilos), paged ("4 of 9 shown"), the free-delivery meter | Addition: departments exist as pinned tabs with the first 12 products; aisles, paging and filters are new | `screens/02-department.html` |
| 3 | A product sold by weight: 250 g steps with a big stepper, a ruler and quick weights, the price per kg and per 100 g, the estimate, the cash "at most", how card and cash are settled, the picker's options (sliced) | New (no product page exists) | `screens/03-product-by-weight.html` |
| 4 | The cart, unit and weighed items: "If something is missing" for the whole order (similar item, my choice, leave it out), changed per item; the estimated total, card and cash settlement | Addition to the checkout (`market_checkout_screen.dart`): the order-wide choice, "my choice" and the settlement copy are new | `screens/04-cart.html` |
| 5a | The order being picked: the picker's progress, a live substitution to accept or decline with its countdown | Addition to the order screen (`market_order_screen.dart`): the live question is new | `screens/05a-order-picking.html` |
| 5b | On the way: the courier on the map, the weighed final price against what was paid, the automatic refund, line by line | Addition to tracking (`public/screens/zad-tracking.png`): the final price card and the masked call are new | `screens/05b-order-on-the-way.html` |
| 6a | Opening a complaint: the reason, the items, photos and words, the 48-hour window | Addition to `market_complaint_screens.dart`: a fresh look of the same fields | `screens/06a-complaint-open.html` |
| 6b | The support conversation in the app, beside the ticket | Addition: the ticket's thread exists; quick replies and the agent's name are new | `screens/06b-support-chat.html` |
| 6c | The decision, four ways: refund to the card, refund to the wallet, a coupon, declined with a reason; one new complaint allowed after it | Addition: decisions exist; their screen is new | `screens/06c-decision.html` (`?v=card\|wallet\|coupon\|declined`) |
| 7a | The wallet: balance and entries, credit only | Addition to `market_club_screens.dart` | `screens/07a-wallet.html` |
| 7b | The delivery club: plans monthly or yearly, the member's savings, renewal by reminder and payment link | Addition to `market_club_screens.dart` | `screens/07b-club.html` |
| 8 | Vendor app, live orders with the sound badge: accept with a time, or turn down | Addition to the vendor app's desk (`mobile/lib/modules/vendor/screens/`) and the panel's live board | `screens/08-vendor-live-orders.html` |
| 9 | Vendor app, the picking list: tick, the actual weight, out of stock, propose a substitute, ready for courier | Addition to `vendor_pick_screen.dart`: grouping by aisle, the keypad and the live swap state are new | `screens/09-vendor-picking.html` |
| 10 | Vendor app, stock: search or scan, in and out of stock, quick price edit with the owner's Undo | Addition to the stock screen: scanning and price editing are new | `screens/10-vendor-stock.html` |
| 11 | Dashboard, complaints queue: assignee, status, time since opened and since the last reply, ready replies | Addition to `/dashboard/market/complaints`: the stats row and the side panel with ready replies are new | `screens/11-dashboard-complaints-queue.html` |
| 12 | Dashboard, a complaint: the order, the conversation, team notes, the decision panel | Addition to `/dashboard/market/complaints/[id]`: the three-column layout and the order's weighed lines are new | `screens/12-dashboard-complaint.html` |

PNGs are in `png/` (76 of them, about 30 MB, lossless), named
`<screen>[-<variant>]-<en|ar>-<light|dark>.png`, phones at 390×844 and the
dashboard at 1440×1024, all at twice the pixels.

## The owner's decisions (approved 18 November 2026)

Screens 1–5 were approved on 18 November and are to be built exactly. The
owner's decisions, which every screen now follows:

**Weighed items**

1. **Paid by card or wallet:** the customer pays the estimate at checkout.
   If the weighed total is lower, the difference is refunded automatically
   (to the payment, the wallet as fallback). A card or wallet order never
   charges more than was paid: a heavier weight costs the customer nothing
   more (screen 5b, the cheese). Copy: "You pay the estimate now; if it
   weighs less, we refund the difference."
2. **Paid in cash:** the customer pays what the scale reads, never more than
   10% over the estimate ("at most", `weightTolerancePercent`). The picker's
   app refuses a weight above it.
3. Later, for Stripe only: a hold of the estimate + 10%, captured at the
   weighed price.
4. Weights step by the product's own step (250 g for cheese, 500 g for fruit
   in the demo), with quick weights up to 2 kg and an optional note for the
   picker.

**If something is missing**

5. One choice for the whole order (similar item by default), changeable per
   item. The contract keeps it per line today; the order-wide choice fills
   every line.
6. The picker chooses the "similar" item: same aisle, never dearer (D2). The
   customer is asked live and has 5 minutes to accept or leave it out; then
   the order's choice applies. "My choice" items are not asked again.
7. The final price is explained line by line (screen 5b).

**The order and the courier**

8. The customer sees the picker's first name and the courier's first name,
   rating, vehicle and plate, with a masked call. The store never reaches
   the customer and sees only the customer's first name.
9. "Buy again" lists items from earlier orders at this store; the barcode
   search looks in this store only.

**Complaints**

10. A complaint can be opened until 48 hours after delivery, and on an order
    stuck for 6 hours. Up to 5 photos and 2,000 characters; the items are
    optional (the whole order by default).
11. Four decisions are shown: refund to the card (the bank's 5 to 10
    working days), to the wallet (at once), a coupon (30 days; it may be
    worth more than the refund, as a compensation), or declined with
    support's reason. After a decision the customer may open **one** new
    complaint on the order (screen 6c).
12. Support writes as "Zad support" with the agent's first name. Ready
    replies are the ones in `lib/market/complaints.ts`, put into the reply
    box, never sent alone.

**Wallet and club**

13. The wallet is credit only (D5): refunds and the owner's credit, no
    top-up and no cashing out. It pays all or part of an order.
14. The club renews by a reminder with a payment link, at the owner's
    prices; nothing is charged by itself (screen 7b).

**Places**

15. Places edit their own catalog; the owner's team sees each change and can
    undo it (screen 10). Out of stock hides a product at once; a price
    change applies to new orders only.
16. A new order rings until someone acts; it's accepted with a ready-in time
    (10, 15, 20, 30 or 45 minutes) or turned down with the panel's reasons.
17. Picking groups lines by aisle, shows each line's choice, takes the
    actual weight from a keypad (a connected scale later), and keeps "Ready
    for courier" off until every line is done or answered.

**Payments and dashboard**

18. No cash limit unless the owner sets one.
19. Still to confirm: the queue colours "since last reply" amber after 15
    minutes and red after 1 hour (the existing target in `support.ts` is 4
    hours for a decision); both to be the owner's settings.

## The existing screens

For comparison with what is built today:

- **Dashboard (Studio):** `existing/` holds renders of the current pages, taken
  from a local run of the platform on Zad's demo (memory store), on 18
  November: `dashboard-complaints-queue-en.png`, `-ar.png`, `-en-dark.png`,
  `dashboard-complaint-en.png` and `-ar.png`. The dark band at their top is
  Yallapp's "working in this account" bar, shown because they were opened from
  Admin. Screens 11 and 12 keep that page's shell (Studio's rail, its menu,
  Cairo, the content panel, the pill filters) and its parts (status, the
  order, the conversation with ready replies, team notes, the decision), and
  add the stats row, the table with both timers, the side panel, the order's
  weighed lines and the refund after weighing.
- **Customer app:** the app's committed renders,
  `platform/web/public/screens/zad-home.png` (home), `zad-market.png` (the
  vendor page, screen 1's base) and `zad-tracking.png` (tracking, screen 5b's
  base). The other app screens (checkout, complaints, wallet, club, the vendor
  app's desk, picking and stock) have no committed render, and Flutter isn't
  available in this environment to make one; they are named in the table
  above so the mobile agent can place each addition.

## Rendering

```
node docs/design/2026-11-18-marketplace/render.mjs            # every screen
node docs/design/2026-11-18-marketplace/render.mjs 04 06c     # some of them
```

It uses the repo's Playwright and Chromium. Icons load from Google Fonts; to
render offline, set `MSR_WOFF2` to a local copy of the Material Symbols
Rounded font. Any screen opens in a browser as
`screens/<name>.html?lang=en|ar&theme=light|dark`.
