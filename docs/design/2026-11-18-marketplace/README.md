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
asks of the marketplace's pages). The apps' Arabic is Modern Standard Arabic.

Every name, price and product is Zad's demo (`lib/demo/marketplace.ts`): Zad
Market, its departments, its prices in EGP with VAT in them, FRESH15, Zad Club
at EGP 49 a month or EGP 490 a year, Karim the courier, Samir the picker. No
Talabat or Yemeksepeti logo, colour, name or screen is used.

## The screens

| # | Screen | Files |
|---|---|---|
| 1 | The supermarket's home inside the marketplace: the store's card (time, fee, smallest order, Club), search with a barcode button, offers, departments as arches, buy again, the cart bar | `screens/01-supermarket-home.html` |
| 2 | A department: aisles as photo chips, sort and filters, a two-column grid (add, then minus and plus; weighed items step in kilos), paged ("4 of 9 shown"), the free-delivery meter | `screens/02-department.html` |
| 3 | A product sold by weight: 250 g steps with a big stepper, a ruler and quick weights, the price per kg and per 100 g, the estimated price and the most it can come to, the note that the final price comes after weighing, the picker's options (sliced) | `screens/03-product-by-weight.html` |
| 4 | The cart, unit and weighed items: "If something is missing" for the whole order (similar item, my choice, leave it out), changed per item; the estimated total and the most it can come to | `screens/04-cart.html` |
| 5a | The order being picked: the picker's progress, a live substitution to accept or decline with its countdown | `screens/05a-order-picking.html` |
| 5b | On the way: the courier on the map, the weighed final price against the estimate, line by line | `screens/05b-order-on-the-way.html` |
| 6a | Opening a complaint: the reason, the items, photos and words, the 48-hour window | `screens/06a-complaint-open.html` |
| 6b | The support conversation in the app, beside the ticket | `screens/06b-support-chat.html` |
| 6c | The decision, four ways: refund to the card, refund to the wallet, a coupon, declined with a reason | `screens/06c-decision.html` (`?v=card\|wallet\|coupon\|declined`) |
| 7a | The wallet: balance and entries | `screens/07a-wallet.html` |
| 7b | The delivery club: plans monthly or yearly, the member's savings | `screens/07b-club.html` |
| 8 | Vendor app, live orders with the sound badge: accept with a time, or decline | `screens/08-vendor-live-orders.html` |
| 9 | Vendor app, the picking list: tick, the actual weight, out of stock, propose a substitute, ready for courier | `screens/09-vendor-picking.html` |
| 10 | Vendor app, stock: search or scan, in and out of stock, quick price edit | `screens/10-vendor-stock.html` |
| 11 | Dashboard, complaints queue: assignee, status, time since opened and since the last reply, ready replies | `screens/11-dashboard-complaints-queue.html` |
| 12 | Dashboard, a complaint: the order, the conversation, team notes, the decision panel | `screens/12-dashboard-complaint.html` |

PNGs are in `png/`, named `<screen>[-<variant>]-<en|ar>-<light|dark>.png`,
phones at 390×844 and the dashboard at 1440×1024, all at twice the pixels.

## Decisions these screens assume (for the owner to confirm)

**Weight and price**

1. **The weighed-price margin shown to the customer is 10%, upwards only.**
   The product and the cart show the estimate and "at most" (estimate + 10%,
   the marketplace setting `weightTolerancePercent`, 10 by default). Weighed
   lower, the customer pays less. The picker's app refuses a weight whose
   price would pass the ceiling (screen 9): the store gives less, or asks.
2. **A card is charged the final price on arrival.** At checkout the gateway
   holds the "at most" amount and takes the final price when the order
   arrives (hold and capture); the difference is never taken. Cash pays the
   final price. This needs each gateway's hold-and-capture to be confirmed.
3. **Weights step by the product's own step** (250 g for cheese, 500 g for
   fruit in the demo), with quick weights up to 2 kg, and an optional note
   for the picker ("Sliced", "One piece" or free text).

**If something is missing**

4. **One choice for the whole order, then per item.** The cart sets the
   order's choice (similar item by default) and each line can change it. The
   contract today keeps it per line only (`ifMissing` in `lib/market/cart.ts`);
   the order-wide choice is new and just fills every line.
5. **A similar item is asked live.** The picker proposes it; the customer has
   5 minutes to accept or leave it out, then the order's choice applies. A
   similar item costs its own price, shown as the difference; "my choice"
   items are not asked again. Today `lib/market/flow.ts` substitutes without
   asking; the live question is new.
6. **The final price explains itself line by line**: each weight against
   the one asked, each swap and what it added (screen 5b).

**The order and the courier**

7. The customer sees the **picker's first name** ("Samir is picking") and the
   **courier's first name, rating, vehicle and plate**, with a **call button
   through a masked number** (the app's couriers only). The store itself never
   reaches the customer (the owner's rule); nothing of the store's staff but a
   first name is shown.
8. **Buy again** lists items from the customer's earlier orders at this store;
   the **barcode button** in search finds the product by its barcode in this
   store only.

**Complaints**

9. A complaint can be opened from placing the order until **48 hours after it
   arrives**, the time left shown on the form; up to **5 photos** and **2,000
   characters** (as `lib/market/complaints.ts`); the items are optional
   ("the whole order" by default), with how many of each.
10. The customer sees **four decisions**: refund to the card (with the bank's
    usual 5 to 10 working days), refund to the wallet (at once), a coupon
    (its code, amount and an expiry of 30 days, the owner's choice), or
    declined with the reason support wrote. After a decision the conversation
    stays open for replies; it doesn't reopen the decision.
11. Support writes in the app's chat (77) under the team's name, "Zad
    support", with the agent's first name; the store doesn't take part.

**Wallet and club**

12. The **wallet is filled only by refunds and the owner's credit** (no
    topping up by card), pays all or part of an order at checkout, and its
    entries never expire (unless the owner decides otherwise).
13. The club's page shows the **member's savings**: delivery fees not paid
    plus members' offers, this month and since joining. Plans and prices are
    the owner's (EGP 49 a month, EGP 490 a year in the demo); renewal date and
    how to end it are always shown.

**The vendor app**

14. The vendor app is the store's staff app, in the same look as the
    customer app but denser: a deep green header and amber for what is new.
15. A new order **rings until someone acts**, with a badge on the tab and a
    sound toggle; it is accepted with a **preparation time** (10, 15, 20, 30
    or 45 minutes) or declined with a reason (busy, closing soon, items out
    of stock, something else), the customer told.
16. The picking list groups items by **aisle**, shows the customer's choice
    for each line ("similar", "their pick", "leave out"), takes the **actual
    weight** from a keypad (or a connected scale later), and keeps
    "Ready for courier" off until every line is ticked, missing or swapped.
17. **Quick price edits apply at once** to the catalogue, never to orders
    already placed; out of stock hides the product from customers at once.

**Dashboard**

18. The queue colours the time since the last reply amber after **15
    minutes** and red after **1 hour** (to be made the owner's setting);
    "since opened" counts from the ticket's creation.
19. Ready replies are the team's own (the ones in `lib/market/complaints.ts`
    to start), inserted into the reply box, never sent alone.

## Rendering

```
node docs/design/2026-11-18-marketplace/render.mjs            # every screen
node docs/design/2026-11-18-marketplace/render.mjs 04 06c     # some of them
```

It uses the repo's Playwright and Chromium. Icons load from Google Fonts; to
render offline, set `MSR_WOFF2` to a local copy of the Material Symbols
Rounded font. Any screen opens in a browser as
`screens/<name>.html?lang=en|ar&theme=light|dark`.
