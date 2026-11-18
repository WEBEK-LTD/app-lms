# Food and delivery templates: QA and fixes (18 November 2026)

ROADMAP Phase 176. Branch `wip-qa-food-delivery`, from `main` at app release 9.

## What was set up

The platform ran locally the way the e2e suite runs it: `next build`, then `next start` with `playwright.config.ts`'s environment (the memory store, fake gateways). The app was the committed web build at `/preview-app/`, in headless Chromium at 360×800, device scale 1, driven through Flutter's semantics.

Three apps were made the owner's way, each by a new owner the team activated:

- **Sofra Eats (food)**: `/start?for=studio` → Sofra → "Create my app" ("Lezzet"). Admin › Plans: food delivery and delivery added to Studio plan 3, the app on it. Dashboard › App sign-in: a store review number and code, to sign in in the preview. Dashboard › Delivery settings: currency TRY, one price of ₺30.
- **Sahm Express (delivery)**: the same from Sahm; one price of 40.
- **Restaurant & café**: `/start` (App editor) → Defne Café → "Create my app", on Pro.

A second build with the fixes 176.1–176.4 was walked again; 176.5 and 176.6 are covered by unit tests (the server wasn't rebuilt for them).

## What was tested

| What | Result | How |
|---|---|---|
| Sofra home, en / ar / tr, light, and ar dark | bugs F1, F2, then fixed (`40-*`, `41-*`) | in the app |
| Restaurants tab, a restaurant's menu, dish sheet with add-ons and quantity, cart | works | in the app (`12-*`, `13-*`, `15-*`) |
| Cart before delivery prices are set | bug F3 | in the app |
| Sign-in: phone and code (review number), new account's name step | works | in the app (`17-sofra-name-step`) |
| Address, totals (₺260 + ₺30 = ₺290), place order (cash) | works | in the app (`21-*`, `22-*`) |
| The order's page, My orders empty and with an order, the home's live card, notifications opening the order (customer's and restaurant's) | works | in the app (`19-*`, `23-*`, `24-*`, `25-*`) |
| Account, Log out shown | works | in the app (`19-sofra-account`) |
| Dashboard › Delivery settings in en, ar, tr; saving the price | bug F4 | dashboard (`30-*`) |
| Sahm home, Send, My shipments (empty) | bug F1, F5 | in the app (`50-*`, `51-*`) |
| Café home, a dish | bug F6; F7 noted | in the app (`60-*`, `61-*`) |
| Served pages of every food and delivery template, as a business's app, in en/ar/tr | F1, F2, F5 | `phase176-food-delivery.test.ts` |

**Not tested:**

- text scale 1.3 in the app (the web preview doesn't take the phone's text size); the 163 Samsung widget tests pass
- a parcel sent in Sahm's app (Flutter's form fields could not be driven by the script); the delivery e2e spec passes
- the café's order in the app (no card gateway set: F7); `restaurant-hosted.spec.ts` (order with options, pickup and delivery, the kitchen moving it on) passes
- Studio's element editing and Publish on these templates (Phase 156's path, unchanged here)
- Yallapp Business on a device: only its widget tests (food orders, orders, kitchen, shipments)
- push notifications (the preview has none)

## Bugs found, and their causes

### F1: a business's app shows the demo's restaurants and prices in Egyptian pounds (fixed, 176.1)

- **Where:** every app made from Sofra A or B or Sahm A or B, in English, Arabic and Turkish, whatever its currency.
- **Result:** "TONIGHT AT SAHARA GRILL · Kofta, shish tawook and lamb chops · EGP 240", "From the menus · Delivery EGP 25", "Margherita · Forno Zamalek · EGP 140", B's band "Koshary EGP 55 · Mixed grill EGP 240 …", "Bayt El Koshary · Koshary EGP 55"; Sahm's "+EGP 45", "+EGP 15", "Send a parcel · from EGP 40", "EGP 40+". Screenshot: `11-sofra-home-en-light.png`, `12-sofra-restaurants.png`.
- **Cause:** these were the template's own words (`lib/studio/app-words.ts` `sof*`, `sah*`), not the demo's facts, so 156.9's rule (a demo's facts leave a business's app) never applied.
- **Fix:** they are `DEMO_FACTS` of the food and delivery demos now. The template's words have no restaurant and no price ("Tonight on the grill", "Kofta, shish tawook and lamb chops", "Send a parcel now"); a price or a restaurant the business must write is a placeholder, which waits. Yallapp's demo apps fill their facts on every page, not only the home. Apps made before are served without them (their words map back to the template's).
- **Follow-up found while fixing:** "Sahara Grill" stood for two template words, and Turkish showed English "Charcoal grilled" (`40-sofra-fixed-tr-home.png`); fixed in the same item.

### F2: Sofra's "Deliver to" over nothing but a chevron (fixed, 176.3)

- **Result:** the address row in a business's app: "Deliver to", an empty line, a lone `expand_more`. Screenshot: `11-sofra-home-en-light.png`.
- **Cause:** the customer's area is the placeholder "[Your area]", which waits (156.9); the label and the icon beside it stayed.
- **Fix:** `lib/pages/template-translations.ts`: what stood only with words still to be written (an icon, the "Deliver to" label) goes with them, and in a row what filled the width leaves a spacer, so the search and the bell stay at the end. Screenshot: `40-sofra-fixed-en-home.png`.

### F3: "Delivery E£0.00" while the cart can't order (fixed, 176.2)

- **Result:** before the company sets its delivery prices, every restaurant's card and page said "Delivery E£0.00", as if free, while the cart said "We aren't taking orders in the app yet". Screenshot: `12-sofra-restaurants.png`.
- **Cause:** `FoodConnector.near` sent the fixed price (0) without checking `pricesSet`.
- **Fix:** no fee until prices are set.

### F4: a new company told its couriers worked in its customers' app (fixed, 176.4)

- **Result:** saving Delivery settings on a new company said "Until now your couriers worked in your customers' app… build and publish Lezzet Courier first".
- **Cause:** `workedInCustomersApp` read `courierApp: "same"`, which is also every new company's default.
- **Fix:** only once the customers' app was built (Delivery settings, Ride settings, the two apps' card).

### F5: Sahm's "PICKUP" over nothing (fixed, 176.5)

- **Result:** the route card's pickup line empty beside the drop-off's "Where to?". Screenshot: `50-sahm-home.png`.
- **Cause:** the pickup street is the placeholder "[Street name]", which waits.
- **Fix:** served pages fill it with "Where from?" / "من أين؟" / "Nereden?" (Sahm A and the express look).

### F6: a café from Defne Café's demo tells its customers the demo's hours and neighbourhoods (fixed, 176.6)

- **Result:** "Open every day from 08:00 to 23:00. Pickup in Moda, delivery in Kadıköy." and "Order ahead for pickup, or have it delivered in Moda." on the home of a café elsewhere. Screenshot: `60-cafe-home.png`.
- **Cause:** an App editor demo's design (`lib/demo/look.ts`) puts the demo's banner line and welcome sentence, about its own business, on the home of every app started from it.
- **Fix:** `lib/pages/demo-words.ts`: in a business's app, a banner line or welcome sentence that is still a demo's own is left out where pages are served; the heading and "Welcome to <app>" stay. It applies to every App editor demo (Lale Flowers' "Free delivery on orders over ₺1,500", Studio Nur's hours…), not only the café.

### Noted, not fixed

- **F7 (fixed later, 176.11):** a hosted café without a card gateway or its own way to pay showed "This item isn't sold in the app." on every dish (`61-cafe-dish.png`). Selling still needs a way to be paid (`paymentsSetUp`); the app now says "Ordering in the app isn't open yet." (`StoreConfig.ordering_open`), and Delivery & offers tells the owner what to turn on.
- **F8:** five tabs on a 360-point phone cut "Restaurants" and "My orders" to "Restaura…" / "My orde…" (`19-sofra-orders-empty.png`): the bar's one-line ellipsis (Phase 110), the same in every app; a design decision.
- **F9:** `POST /food/quote` answers 503 ("We aren't taking orders in the app yet") but the contract doesn't list it.
- The store review number is also a restaurant's staff in the preview, so a second "Restaurant" tab shows, by design (the review account).

## The template guard (Phase 166) on these templates

Run from a scratch worktree of this branch with `wip-template-guard` (b5e199b) merged locally, its fixtures regenerated there (`mobile/tool/template_guard_fixtures.sh`, not committed).

- **Prices written as text** (`template-guard.test.ts`): demo_food, food_signature_a/b, demo_delivery, delivery_signature_a/b all pass with 176.1 (their "EGP" words were the guard's findings). The four failures left are outside this scope: Zad's (marketplace) "over EGP 100" words ×2, a store template's tap, and the fixtures needing a commit on the guard's branch.
- **Layout** (`template_guard_test.dart`, 360/412 points, text 1.0 and 1.3, LTR and RTL): before, 5 in scope failed, all at 1.3 in Arabic. Fixed (176.9): demo_food and food_signature_a's home (the hero's words 260 points past a slide of a set height). Left (176.10): delivery_city's home (15 points under a hanging card), food_signature_b's home and restaurants (the bento's caption 1 point past its tile). The whole guard after the fix: 269 passed, 42 failed, the same list as before less those two.
