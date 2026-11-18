# Template guard: what fails, 18 November 2026

Roadmap 166. The guard checks every Studio template and Signature look the
way an owner's project gets it and the way a phone reads it. This file
records what it finds. It was first run on main at 14b2dcf, before the
fixes (the second part of this file). It was run again after merging main
at a9350e6 (app release 9, with 156, 157, 161, 163, 164 and 165) into
wip-template-guard. No check was skipped, loosened or quarantined to pass.

## After the fixes: main at a9350e6

| Suite | Tests | Passed | Failed |
|---|---|---|---|
| vitest guard and fixtures check (`tests/unit/template-guard*.test.ts`) | 741 | 732 | 9 |
| Flutter guard (`test/widget/template_guard_test.dart`, Flutter 3.47.5) | 311 | 267 | 44 |

The fixtures were regenerated with `mobile/tool/template_guard_fixtures.sh`
on the merge, and the fixtures check passes.

### What the fixes cleared

- **Placeholders (156):** no template serves a bracketed sample word any more,
  in any language. All 93 failures are gone.
- **Edits in every language (156):** an owner's edit in English now reaches
  Arabic and Turkish in all 66 templates, and an owner's own Arabic is still
  served.
- **List prices (161):** every list price now carries an amount and a
  currency, with a price in the customer's currency.
- **Layout (163):** the Leqaa looks, `brand`, `contact` and `blank` draw
  without an overflow or a cut-off element on every phone, text size and
  direction. 34 templates failed before; 24 still do (below).
- Bound lists (164), categories (157), stories (165), the contract and
  reaching the last element still pass.

### A check that was wrong, fixed

The tap check didn't know `sign_out`, the action of Studio's Sign out
element (Phase 167). It's in the contract's `Action` enum, in the
platform's `ACTION_TYPES` and in the app (`PageActionType.signOut`, which
asks first and then signs the person out). Every template whose Account
page has the element failed, 30 of them. The check now accepts
`sign_out`, as the contract does.

### What still fails

- **`brand`'s hero button opens nothing (NEW, not fixed).** "Start now" is
  served with `action: null`: the template for every project gives its
  hero no `button`, unlike the kinds' own templates, which name a screen.
  What it should open in every kind of app (a shop's products, an academy's
  courses, a ride app's ride) is a product decision, and no helper maps a
  kind to its main screen today. It's left for the owner or the team to
  decide rather than guessed here.
- **Prices written into the templates' own words (NEW):** 8 food, delivery
  and marketplace templates. Their designed homes write prices as text in
  Egyptian pounds, for example "Kofta, shish tawook and lamb chops · EGP 240",
  "over EGP 100" and "+EGP 45". 161 converts the prices it serves, not
  these words, so the customer reads EGP whatever their currency or the
  shop's.
- **Layout (NEW, after 163):** 44 pages in 24 templates. They overflow at
  text 1.3 or in Arabic, or have elements cut off by a parent that clips:
  the marketplace's photo tiles (`market`), the ride and taxi maps' labels
  (`mapHeader`), and food look B's bento text in Arabic.

The Leqaa looks (`flowers_signature_a`, `flowers_signature_b`), `contact` and
`blank` pass every check.

### By QA session

The other templates are being tested and fixed by hand in QA sessions
176–180, so they weren't changed here. This is what's left for each.

- **176 (food, delivery, restaurant):** `demo_food`, `food_signature_a`,
  `food_signature_b`, `demo_delivery`, `delivery_signature_a`,
  `delivery_signature_b` (prices in words); `delivery_city`, `demo_food`,
  `food_signature_a`, `food_signature_b` (layout).
- **177 (marketplace and store):** `demo_marketplace`,
  `marketplace_signature_a` (prices in words); `demo_marketplace`,
  `marketplace_signature_a`, `marketplace_signature_b`, `market`,
  `market_grocery`, `market_offers`, `shop_deals`, `shop_looks` (layout).
- **178 (rides and taxi):** `demo_rides`, `rides_signature_a`,
  `rides_signature_b`, `demo_taxi`, `taxi_signature_a`, `taxi_signature_b`
  (layout).
- **179 (school, instructors, academy, courses):** `instructors_signature_b`,
  `teachers`, `university` (layout).
- **180 (travel, bookings, events, real estate, news, charity):**
  `demo_travel`, `travel_signature_a`, `travel_signature_b` (layout).

### Summary by template

| QA session | Template | Prices in words | Taps | Layout rows (pages) |
|---|---|---|---|---|
| 176 | delivery_city |  |  | 1 (1) |
| 176 | delivery_signature_a | 12 |  |  |
| 176 | delivery_signature_b | 7 |  |  |
| 176 | demo_delivery | 12 |  |  |
| 176 | demo_food | 21 |  | 2 (1) |
| 176 | food_signature_a | 21 |  | 2 (1) |
| 176 | food_signature_b | 3 |  | 4 (2) |
| 177 | demo_marketplace | 18 |  | 13 (4) |
| 177 | market |  |  | 28 (2) |
| 177 | market_grocery |  |  | 28 (2) |
| 177 | market_offers |  |  | 28 (2) |
| 177 | marketplace_signature_a | 18 |  | 13 (4) |
| 177 | marketplace_signature_b |  |  | 8 (2) |
| 177 | shop_deals |  |  | 2 (1) |
| 177 | shop_looks |  |  | 1 (1) |
| 178 | demo_rides |  |  | 10 (2) |
| 178 | demo_taxi |  |  | 6 (2) |
| 178 | rides_signature_a |  |  | 10 (2) |
| 178 | rides_signature_b |  |  | 15 (2) |
| 178 | taxi_signature_a |  |  | 6 (2) |
| 178 | taxi_signature_b |  |  | 9 (1) |
| 179 | instructors_signature_b |  |  | 2 (1) |
| 179 | teachers |  |  | 3 (2) |
| 179 | university |  |  | 1 (1) |
| 180 | demo_travel |  |  | 4 (2) |
| 180 | travel_signature_a |  |  | 4 (2) |
| 180 | travel_signature_b |  |  | 4 (2) |
| this guard (166) | brand |  | 1 |  |

### Platform failures

| QA session | Template | Check | Language | Element | Reason |
|---|---|---|---|---|---|
| 176 | delivery_signature_a | prices | ar | /pages/home column#njbu6awk/column#n0mg37pj/button#nat2uxmv.text | a price written as text, "أرسل طردًا · من 40 ج.م" |
| 176 | delivery_signature_a | prices | ar | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#nek6geuy/text#n7cjv1wn.text | a price written as text, "+0 ج.م" |
| 176 | delivery_signature_a | prices | ar | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#ngmi0obq/text#n7y9g2g6.text | a price written as text, "+15 ج.م" |
| 176 | delivery_signature_a | prices | ar | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#nq5i7v8h/text#n5j6ar4p.text | a price written as text, "+45 ج.م" |
| 176 | delivery_signature_a | prices | en | /pages/home column#njbu6awk/column#n0mg37pj/button#nat2uxmv.text | a price written as text, "Send a parcel · from EGP 40" |
| 176 | delivery_signature_a | prices | en | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#nek6geuy/text#n7cjv1wn.text | a price written as text, "+EGP 0" |
| 176 | delivery_signature_a | prices | en | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#ngmi0obq/text#n7y9g2g6.text | a price written as text, "+EGP 15" |
| 176 | delivery_signature_a | prices | en | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#nq5i7v8h/text#n5j6ar4p.text | a price written as text, "+EGP 45" |
| 176 | delivery_signature_a | prices | tr | /pages/home column#njbu6awk/column#n0mg37pj/button#nat2uxmv.text | a price written as text, "Paket gönder · 40 EGP'den" |
| 176 | delivery_signature_a | prices | tr | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#nek6geuy/text#n7cjv1wn.text | a price written as text, "+0 EGP" |
| 176 | delivery_signature_a | prices | tr | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#ngmi0obq/text#n7y9g2g6.text | a price written as text, "+15 EGP" |
| 176 | delivery_signature_a | prices | tr | /pages/home column#njbu6awk/column#n0mg37pj/row#nooe3knq/column#nq5i7v8h/text#n5j6ar4p.text | a price written as text, "+45 EGP" |
| 176 | delivery_signature_b | prices | ar | /pages/home column#nu2n45y2/map_header#nnosw2gh/column#nf3eyc0c/row#n7roasms/photo_hero#njqs9de7/text#nbgfibzr.text | a price written as text, "+45 ج.م" |
| 176 | delivery_signature_b | prices | ar | /pages/home column#nu2n45y2/map_header#nnosw2gh/column#nf3eyc0c/row#n7roasms/photo_hero#nxi44enh/text#nyhwqfm8.text | a price written as text, "+15 ج.م" |
| 176 | delivery_signature_b | prices | en | /pages/home column#nu2n45y2/map_header#nnosw2gh/column#nf3eyc0c/row#n7roasms/photo_hero#njqs9de7/text#nbgfibzr.text | a price written as text, "+EGP 45" |
| 176 | delivery_signature_b | prices | en | /pages/home column#nu2n45y2/map_header#nnosw2gh/column#nf3eyc0c/row#n7roasms/photo_hero#nxi44enh/text#nyhwqfm8.text | a price written as text, "+EGP 15" |
| 176 | delivery_signature_b | prices | en | /pages/home column#nu2n45y2/map_header#nnosw2gh/column#nf3eyc0c/row#ntpgthd4/text#n4ebjy33.text | a price written as text, "EGP 40+" |
| 176 | delivery_signature_b | prices | tr | /pages/home column#nu2n45y2/map_header#nnosw2gh/column#nf3eyc0c/row#n7roasms/photo_hero#njqs9de7/text#nbgfibzr.text | a price written as text, "+45 EGP" |
| 176 | delivery_signature_b | prices | tr | /pages/home column#nu2n45y2/map_header#nnosw2gh/column#nf3eyc0c/row#n7roasms/photo_hero#nxi44enh/text#nyhwqfm8.text | a price written as text, "+15 EGP" |
| 176 | demo_delivery | prices | ar | /pages/home column#nxmd4to9/column#nxzvgkj7/button#n94xiuuv.text | a price written as text, "أرسل طردًا · من 40 ج.م" |
| 176 | demo_delivery | prices | ar | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#n5wyusmx/text#nvqidb1x.text | a price written as text, "+15 ج.م" |
| 176 | demo_delivery | prices | ar | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#nfck4jkw/text#ncc3e5ce.text | a price written as text, "+45 ج.م" |
| 176 | demo_delivery | prices | ar | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#nxzekawd/text#n0er7qvv.text | a price written as text, "+0 ج.م" |
| 176 | demo_delivery | prices | en | /pages/home column#nxmd4to9/column#nxzvgkj7/button#n94xiuuv.text | a price written as text, "Send a parcel · from EGP 40" |
| 176 | demo_delivery | prices | en | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#n5wyusmx/text#nvqidb1x.text | a price written as text, "+EGP 15" |
| 176 | demo_delivery | prices | en | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#nfck4jkw/text#ncc3e5ce.text | a price written as text, "+EGP 45" |
| 176 | demo_delivery | prices | en | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#nxzekawd/text#n0er7qvv.text | a price written as text, "+EGP 0" |
| 176 | demo_delivery | prices | tr | /pages/home column#nxmd4to9/column#nxzvgkj7/button#n94xiuuv.text | a price written as text, "Paket gönder · 40 EGP'den" |
| 176 | demo_delivery | prices | tr | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#n5wyusmx/text#nvqidb1x.text | a price written as text, "+15 EGP" |
| 176 | demo_delivery | prices | tr | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#nfck4jkw/text#ncc3e5ce.text | a price written as text, "+45 EGP" |
| 176 | demo_delivery | prices | tr | /pages/home column#nxmd4to9/column#nxzvgkj7/row#ndhwpu37/column#nxzekawd/text#n0er7qvv.text | a price written as text, "+0 EGP" |
| 176 | demo_food | prices | ar | /pages/home column#nsy8ypt0/column#njfh0olz/row#nr06ry7a/text#no2q7cbi.text | a price written as text, "150 ج.م" |
| 176 | demo_food | prices | ar | /pages/home column#nsy8ypt0/column#njfh0olz/row#ntqyirvo/text#n70kj898.text | a price written as text, "140 ج.م" |
| 176 | demo_food | prices | ar | /pages/home column#nsy8ypt0/row#na8q1vwi/text#nrltjw3j.text | a price written as text, "التوصيل 25 ج.م" |
| 176 | demo_food | prices | ar | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#n7w061yn/text#nxus4yex.text | a price written as text, "طماطم وموتزاريلا وريحان · 140 ج.م" |
| 176 | demo_food | prices | ar | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#ne1d7fep/text#npdujv97.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" |
| 176 | demo_food | prices | ar | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#nobl3j03/text#n33bv7vh.text | a price written as text, "أرز وعدس ومكرونة وبصل مقرمش · 55 ج.م" |
| 176 | demo_food | prices | ar | /pages/restaurants column#n1ewmmn9/photo_hero#nm4jb3ao/text#ngwh1e9n.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" |
| 176 | demo_food | prices | en | /pages/home column#nsy8ypt0/column#njfh0olz/row#nr06ry7a/text#no2q7cbi.text | a price written as text, "EGP 150" |
| 176 | demo_food | prices | en | /pages/home column#nsy8ypt0/column#njfh0olz/row#ntqyirvo/text#n70kj898.text | a price written as text, "EGP 140" |
| 176 | demo_food | prices | en | /pages/home column#nsy8ypt0/row#na8q1vwi/text#nrltjw3j.text | a price written as text, "Delivery EGP 25" |
| 176 | demo_food | prices | en | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#n7w061yn/text#nxus4yex.text | a price written as text, "Tomato, mozzarella and basil · EGP 140" |
| 176 | demo_food | prices | en | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#ne1d7fep/text#npdujv97.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" |
| 176 | demo_food | prices | en | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#nobl3j03/text#n33bv7vh.text | a price written as text, "Rice, lentils, pasta and crispy onions · EGP 55" |
| 176 | demo_food | prices | en | /pages/restaurants column#n1ewmmn9/photo_hero#nm4jb3ao/text#ngwh1e9n.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" |
| 176 | demo_food | prices | tr | /pages/home column#nsy8ypt0/column#njfh0olz/row#nr06ry7a/text#no2q7cbi.text | a price written as text, "150 EGP" |
| 176 | demo_food | prices | tr | /pages/home column#nsy8ypt0/column#njfh0olz/row#ntqyirvo/text#n70kj898.text | a price written as text, "140 EGP" |
| 176 | demo_food | prices | tr | /pages/home column#nsy8ypt0/row#na8q1vwi/text#nrltjw3j.text | a price written as text, "Teslimat 25 EGP" |
| 176 | demo_food | prices | tr | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#n7w061yn/text#nxus4yex.text | a price written as text, "Domates, mozzarella ve fesleğen · 140 EGP" |
| 176 | demo_food | prices | tr | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#ne1d7fep/text#npdujv97.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" |
| 176 | demo_food | prices | tr | /pages/home column#nsy8ypt0/stack#n7i70czc/column#n0sjkx5v/stack#nhtag1wz/slider#niqj2s0g/photo_hero#nobl3j03/text#n33bv7vh.text | a price written as text, "Pirinç, mercimek, makarna ve çıtır soğan · 55 EGP" |
| 176 | demo_food | prices | tr | /pages/restaurants column#n1ewmmn9/photo_hero#nm4jb3ao/text#ngwh1e9n.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" |
| 176 | food_signature_a | prices | ar | /pages/home column#n8juaxgr/column#n0klphoy/row#n5pbg3sx/text#nz188i8y.text | a price written as text, "150 ج.م" |
| 176 | food_signature_a | prices | ar | /pages/home column#n8juaxgr/column#n0klphoy/row#nxibg3wc/text#n6r5yb6h.text | a price written as text, "140 ج.م" |
| 176 | food_signature_a | prices | ar | /pages/home column#n8juaxgr/row#n46fte1y/text#n2wckxb6.text | a price written as text, "التوصيل 25 ج.م" |
| 176 | food_signature_a | prices | ar | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#n3hh3glq/text#nn7tywgu.text | a price written as text, "أرز وعدس ومكرونة وبصل مقرمش · 55 ج.م" |
| 176 | food_signature_a | prices | ar | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#n6v386gs/text#nnici0d4.text | a price written as text, "طماطم وموتزاريلا وريحان · 140 ج.م" |
| 176 | food_signature_a | prices | ar | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#nrfrhkdo/text#nsj6gw85.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" |
| 176 | food_signature_a | prices | ar | /pages/restaurants column#nvuhs1f1/photo_hero#nbu5h1zb/text#nog61fbj.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" |
| 176 | food_signature_a | prices | en | /pages/home column#n8juaxgr/column#n0klphoy/row#n5pbg3sx/text#nz188i8y.text | a price written as text, "EGP 150" |
| 176 | food_signature_a | prices | en | /pages/home column#n8juaxgr/column#n0klphoy/row#nxibg3wc/text#n6r5yb6h.text | a price written as text, "EGP 140" |
| 176 | food_signature_a | prices | en | /pages/home column#n8juaxgr/row#n46fte1y/text#n2wckxb6.text | a price written as text, "Delivery EGP 25" |
| 176 | food_signature_a | prices | en | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#n3hh3glq/text#nn7tywgu.text | a price written as text, "Rice, lentils, pasta and crispy onions · EGP 55" |
| 176 | food_signature_a | prices | en | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#n6v386gs/text#nnici0d4.text | a price written as text, "Tomato, mozzarella and basil · EGP 140" |
| 176 | food_signature_a | prices | en | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#nrfrhkdo/text#nsj6gw85.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" |
| 176 | food_signature_a | prices | en | /pages/restaurants column#nvuhs1f1/photo_hero#nbu5h1zb/text#nog61fbj.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" |
| 176 | food_signature_a | prices | tr | /pages/home column#n8juaxgr/column#n0klphoy/row#n5pbg3sx/text#nz188i8y.text | a price written as text, "150 EGP" |
| 176 | food_signature_a | prices | tr | /pages/home column#n8juaxgr/column#n0klphoy/row#nxibg3wc/text#n6r5yb6h.text | a price written as text, "140 EGP" |
| 176 | food_signature_a | prices | tr | /pages/home column#n8juaxgr/row#n46fte1y/text#n2wckxb6.text | a price written as text, "Teslimat 25 EGP" |
| 176 | food_signature_a | prices | tr | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#n3hh3glq/text#nn7tywgu.text | a price written as text, "Pirinç, mercimek, makarna ve çıtır soğan · 55 EGP" |
| 176 | food_signature_a | prices | tr | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#n6v386gs/text#nnici0d4.text | a price written as text, "Domates, mozzarella ve fesleğen · 140 EGP" |
| 176 | food_signature_a | prices | tr | /pages/home column#n8juaxgr/stack#nv80ix01/column#n58n03ev/stack#ndaez1kk/slider#n0gu1i24/photo_hero#nrfrhkdo/text#nsj6gw85.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" |
| 176 | food_signature_a | prices | tr | /pages/restaurants column#nvuhs1f1/photo_hero#nbu5h1zb/text#nog61fbj.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" |
| 176 | food_signature_b | prices | ar | /pages/home column#no3vhnp3/marquee#n2lfkqsh.text | a price written as text, "كشري 55 ج.م\nمشويات مشكّلة 240 ج.م\nمارجريتا 140 ج.م\nشيش طاووق 150 ج.م" |
| 176 | food_signature_b | prices | en | /pages/home column#no3vhnp3/marquee#n2lfkqsh.text | a price written as text, "Koshary EGP 55\nMixed grill EGP 240\nMargherita EGP 140\nShish tawook EGP 150" |
| 176 | food_signature_b | prices | tr | /pages/home column#no3vhnp3/marquee#n2lfkqsh.text | a price written as text, "Koşari 55 EGP\nKarışık ızgara 240 EGP\nMargherita 140 EGP\nŞiş tavuk 150 EGP" |
| 177 | demo_marketplace | prices | ar | /pages/home column#nww76dej/slider#nd77zuu9/row#n2eznttq/column#nc2118a7/text#ng750ems.text | a price written as text, "توصيل فوق 250 ج.م" |
| 177 | demo_marketplace | prices | ar | /pages/home column#nww76dej/slider#nd77zuu9/row#nb9ga65l/column#ngqzasjm/row#nrgciz7c/text#nexvfuxa.text | a price written as text, "فوق 200 ج.م" |
| 177 | demo_marketplace | prices | ar | /pages/home column#nww76dej/slider#nd77zuu9/row#nfvewyxy/column#nr0tk6oh/row#ng8dp3jd/text#nrn8i4vn.text | a price written as text, "فوق 100 ج.م" |
| 177 | demo_marketplace | prices | ar | /pages/search column#n9jugu87/slider#ng1qf10f/row#ngek1vxs/column#nh2h3htx/row#ny6ki9sd/text#nais5hku.text | a price written as text, "فوق 100 ج.م" |
| 177 | demo_marketplace | prices | ar | /pages/search column#n9jugu87/slider#ng1qf10f/row#nny7zgoh/column#n1sieb4f/row#npc7dzbd/text#n05xu2tx.text | a price written as text, "فوق 200 ج.م" |
| 177 | demo_marketplace | prices | ar | /pages/search column#n9jugu87/slider#ng1qf10f/row#no9092i5/column#ncqnpiad/text#n9c1xui8.text | a price written as text, "توصيل فوق 250 ج.م" |
| 177 | demo_marketplace | prices | en | /pages/home column#nww76dej/slider#nd77zuu9/row#n2eznttq/column#nc2118a7/text#ng750ems.text | a price written as text, "delivery over EGP 250" |
| 177 | demo_marketplace | prices | en | /pages/home column#nww76dej/slider#nd77zuu9/row#nb9ga65l/column#ngqzasjm/row#nrgciz7c/text#nexvfuxa.text | a price written as text, "over EGP 200" |
| 177 | demo_marketplace | prices | en | /pages/home column#nww76dej/slider#nd77zuu9/row#nfvewyxy/column#nr0tk6oh/row#ng8dp3jd/text#nrn8i4vn.text | a price written as text, "over EGP 100" |
| 177 | demo_marketplace | prices | en | /pages/search column#n9jugu87/slider#ng1qf10f/row#ngek1vxs/column#nh2h3htx/row#ny6ki9sd/text#nais5hku.text | a price written as text, "over EGP 100" |
| 177 | demo_marketplace | prices | en | /pages/search column#n9jugu87/slider#ng1qf10f/row#nny7zgoh/column#n1sieb4f/row#npc7dzbd/text#n05xu2tx.text | a price written as text, "over EGP 200" |
| 177 | demo_marketplace | prices | en | /pages/search column#n9jugu87/slider#ng1qf10f/row#no9092i5/column#ncqnpiad/text#n9c1xui8.text | a price written as text, "delivery over EGP 250" |
| 177 | demo_marketplace | prices | tr | /pages/home column#nww76dej/slider#nd77zuu9/row#n2eznttq/column#nc2118a7/text#ng750ems.text | a price written as text, "teslimat 250 EGP üzeri" |
| 177 | demo_marketplace | prices | tr | /pages/home column#nww76dej/slider#nd77zuu9/row#nb9ga65l/column#ngqzasjm/row#nrgciz7c/text#nexvfuxa.text | a price written as text, "200 EGP üzeri" |
| 177 | demo_marketplace | prices | tr | /pages/home column#nww76dej/slider#nd77zuu9/row#nfvewyxy/column#nr0tk6oh/row#ng8dp3jd/text#nrn8i4vn.text | a price written as text, "100 EGP üzeri" |
| 177 | demo_marketplace | prices | tr | /pages/search column#n9jugu87/slider#ng1qf10f/row#ngek1vxs/column#nh2h3htx/row#ny6ki9sd/text#nais5hku.text | a price written as text, "100 EGP üzeri" |
| 177 | demo_marketplace | prices | tr | /pages/search column#n9jugu87/slider#ng1qf10f/row#nny7zgoh/column#n1sieb4f/row#npc7dzbd/text#n05xu2tx.text | a price written as text, "200 EGP üzeri" |
| 177 | demo_marketplace | prices | tr | /pages/search column#n9jugu87/slider#ng1qf10f/row#no9092i5/column#ncqnpiad/text#n9c1xui8.text | a price written as text, "teslimat 250 EGP üzeri" |
| 177 | marketplace_signature_a | prices | ar | /pages/home column#nbnjkmdx/slider#n0c316z4/row#n1267dyl/column#nh8yvl4y/row#nj2vf7cb/text#nduo2pmd.text | a price written as text, "فوق 100 ج.م" |
| 177 | marketplace_signature_a | prices | ar | /pages/home column#nbnjkmdx/slider#n0c316z4/row#nehtdl1t/column#neivwgej/row#nbrohpoe/text#nv06j1ou.text | a price written as text, "فوق 200 ج.م" |
| 177 | marketplace_signature_a | prices | ar | /pages/home column#nbnjkmdx/slider#n0c316z4/row#nyae8650/column#nw5vw61h/text#n35soae3.text | a price written as text, "توصيل فوق 250 ج.م" |
| 177 | marketplace_signature_a | prices | ar | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nisi1c61/column#nvz55ncp/row#n70f01ql/text#ncxc727o.text | a price written as text, "فوق 200 ج.م" |
| 177 | marketplace_signature_a | prices | ar | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nj55v1ke/column#nnbm8p03/text#nc9vf9xl.text | a price written as text, "توصيل فوق 250 ج.م" |
| 177 | marketplace_signature_a | prices | ar | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nkn01ke7/column#n64ilkzz/row#neg6uq8k/text#nbvjti7t.text | a price written as text, "فوق 100 ج.م" |
| 177 | marketplace_signature_a | prices | en | /pages/home column#nbnjkmdx/slider#n0c316z4/row#n1267dyl/column#nh8yvl4y/row#nj2vf7cb/text#nduo2pmd.text | a price written as text, "over EGP 100" |
| 177 | marketplace_signature_a | prices | en | /pages/home column#nbnjkmdx/slider#n0c316z4/row#nehtdl1t/column#neivwgej/row#nbrohpoe/text#nv06j1ou.text | a price written as text, "over EGP 200" |
| 177 | marketplace_signature_a | prices | en | /pages/home column#nbnjkmdx/slider#n0c316z4/row#nyae8650/column#nw5vw61h/text#n35soae3.text | a price written as text, "delivery over EGP 250" |
| 177 | marketplace_signature_a | prices | en | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nisi1c61/column#nvz55ncp/row#n70f01ql/text#ncxc727o.text | a price written as text, "over EGP 200" |
| 177 | marketplace_signature_a | prices | en | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nj55v1ke/column#nnbm8p03/text#nc9vf9xl.text | a price written as text, "delivery over EGP 250" |
| 177 | marketplace_signature_a | prices | en | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nkn01ke7/column#n64ilkzz/row#neg6uq8k/text#nbvjti7t.text | a price written as text, "over EGP 100" |
| 177 | marketplace_signature_a | prices | tr | /pages/home column#nbnjkmdx/slider#n0c316z4/row#n1267dyl/column#nh8yvl4y/row#nj2vf7cb/text#nduo2pmd.text | a price written as text, "100 EGP üzeri" |
| 177 | marketplace_signature_a | prices | tr | /pages/home column#nbnjkmdx/slider#n0c316z4/row#nehtdl1t/column#neivwgej/row#nbrohpoe/text#nv06j1ou.text | a price written as text, "200 EGP üzeri" |
| 177 | marketplace_signature_a | prices | tr | /pages/home column#nbnjkmdx/slider#n0c316z4/row#nyae8650/column#nw5vw61h/text#n35soae3.text | a price written as text, "teslimat 250 EGP üzeri" |
| 177 | marketplace_signature_a | prices | tr | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nisi1c61/column#nvz55ncp/row#n70f01ql/text#ncxc727o.text | a price written as text, "200 EGP üzeri" |
| 177 | marketplace_signature_a | prices | tr | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nj55v1ke/column#nnbm8p03/text#nc9vf9xl.text | a price written as text, "teslimat 250 EGP üzeri" |
| 177 | marketplace_signature_a | prices | tr | /pages/search column#ne7g0xbd/slider#nikjv4w8/row#nkn01ke7/column#n64ilkzz/row#neg6uq8k/text#nbvjti7t.text | a price written as text, "100 EGP üzeri" |
| this guard (166) | brand | taps | en | /pages/home column#ni20x5k1/column#nwipwidf/button#nwapcavs | drawn to be tapped but opens nothing |

### Layout on the phone

The element is the Studio element (node id in the fixture, `test/support/template_guard/<template>.json`) the widget is in.

| QA session | Template | Page | Language | Phone | Element | Reason |
|---|---|---|---|---|---|---|
| 176 | delivery_city | /pages/home | ar | 360 pt, text 1.3x, RTL | column g2-over | A RenderFlex overflowed by 15 pixels on the bottom. |
| 176 | demo_food | /pages/home | ar | 360 pt, text 1.3x, RTL | column g6-over | A RenderFlex overflowed by 288 pixels on the bottom. |
| 176 | demo_food | /pages/home | ar | 412 pt, text 1.3x, RTL | column g6-over | A RenderFlex overflowed by 30 pixels on the bottom. |
| 176 | food_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g6-over | A RenderFlex overflowed by 288 pixels on the bottom. |
| 176 | food_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | column g6-over | A RenderFlex overflowed by 30 pixels on the bottom. |
| 176 | food_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | bento g11 | RenderPadding [0.0, -1.0, 328.0 x 93.0] outside its RenderStack [0.0, 0.0, 328.0 x 92.0] |
| 176 | food_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | bento g11 | RenderPadding [0.0, -1.0, 380.0 x 93.0] outside its RenderStack [0.0, 0.0, 380.0 x 92.0] |
| 176 | food_signature_b | /pages/restaurants | ar | 360 pt, text 1.3x, RTL | bento g24 | RenderPadding [0.0, -1.0, 328.0 x 93.0] outside its RenderStack [0.0, 0.0, 328.0 x 92.0] |
| 176 | food_signature_b | /pages/restaurants | ar | 412 pt, text 1.3x, RTL | bento g24 | RenderPadding [0.0, -1.0, 380.0 x 93.0] outside its RenderStack [0.0, 0.0, 380.0 x 92.0] |
| 177 | demo_marketplace | /pages/home | ar | 360 pt, text 1.0x, RTL | column g5 | A RenderFlex overflowed by 3.0 pixels on the bottom. |
| 177 | demo_marketplace | /pages/home | ar | 360 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 43 pixels on the bottom. |
| 177 | demo_marketplace | /pages/home | ar | 412 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 43 pixels on the bottom. |
| 177 | demo_marketplace | /pages/home | en | 360 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 54 pixels on the bottom. |
| 177 | demo_marketplace | /pages/home | en | 412 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 8.0 pixels on the bottom. |
| 177 | demo_marketplace | /pages/shops | ar | 360 pt, text 1.0x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | demo_marketplace | /pages/shops | ar | 360 pt, text 1.3x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | demo_marketplace | /pages/shops | ar | 412 pt, text 1.0x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | demo_marketplace | /pages/shops | ar | 412 pt, text 1.3x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | demo_marketplace | /pages/shops | en | 360 pt, text 1.0x, LTR | market g58 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | demo_marketplace | /pages/shops | en | 360 pt, text 1.3x, LTR | market g58 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | demo_marketplace | /pages/shops | en | 412 pt, text 1.0x, LTR | market g58 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | demo_marketplace | /pages/shops | en | 412 pt, text 1.3x, LTR | market g58 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market | /pages/home | ar | 360 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market | /pages/home | ar | 360 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market | /pages/home | ar | 412 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market | /pages/home | ar | 412 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market | /pages/home | en | 360 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market | /pages/home | en | 360 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market | /pages/home | en | 360 pt, text 1.3x, LTR | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market | /pages/home | en | 360 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market | /pages/home | en | 360 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market | /pages/home | en | 412 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market | /pages/home | en | 412 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market | /pages/home | en | 412 pt, text 1.3x, LTR | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market | /pages/home | en | 412 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market | /pages/home | en | 412 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_grocery | /pages/home | ar | 360 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 360 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market_grocery | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_grocery | /pages/home | ar | 412 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 412 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market_grocery | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_grocery | /pages/home | en | 360 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_grocery | /pages/home | en | 360 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market_grocery | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_grocery | /pages/home | en | 412 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_grocery | /pages/home | en | 412 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market_offers | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_offers | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_offers | /pages/home | ar | 360 pt, text 1.0x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market_offers | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_offers | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_offers | /pages/home | ar | 412 pt, text 1.0x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market_offers | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_offers | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_offers | /pages/home | en | 360 pt, text 1.0x, LTR | market g6 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] |
| 177 | market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] |
| 177 | market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g6 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | market_offers | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_offers | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_offers | /pages/home | en | 412 pt, text 1.0x, LTR | market g6 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] |
| 177 | market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] |
| 177 | market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g6 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 177 | marketplace_signature_a | /pages/home | ar | 360 pt, text 1.0x, RTL | column g5 | A RenderFlex overflowed by 3.0 pixels on the bottom. |
| 177 | marketplace_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 43 pixels on the bottom. |
| 177 | marketplace_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 43 pixels on the bottom. |
| 177 | marketplace_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 54 pixels on the bottom. |
| 177 | marketplace_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 8.0 pixels on the bottom. |
| 177 | marketplace_signature_a | /pages/shops | ar | 360 pt, text 1.0x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_a | /pages/shops | ar | 360 pt, text 1.3x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_a | /pages/shops | ar | 412 pt, text 1.0x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | marketplace_signature_a | /pages/shops | ar | 412 pt, text 1.3x, RTL | market g58 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | marketplace_signature_a | /pages/shops | en | 360 pt, text 1.0x, LTR | market g58 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_a | /pages/shops | en | 360 pt, text 1.3x, LTR | market g58 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_a | /pages/shops | en | 412 pt, text 1.0x, LTR | market g58 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | marketplace_signature_a | /pages/shops | en | 412 pt, text 1.3x, LTR | market g58 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | ar | 360 pt, text 1.0x, RTL | market g18 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | ar | 360 pt, text 1.3x, RTL | market g18 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | ar | 412 pt, text 1.0x, RTL | market g18 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | ar | 412 pt, text 1.3x, RTL | market g18 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | en | 360 pt, text 1.0x, LTR | market g18 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | en | 360 pt, text 1.3x, LTR | market g18 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | en | 412 pt, text 1.0x, LTR | market g18 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | marketplace_signature_b | /pages/shops | en | 412 pt, text 1.3x, LTR | market g18 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] |
| 177 | shop_deals | /pages/home | ar | 360 pt, text 1.3x, RTL | column g3 | A RenderFlex overflowed by 22 pixels on the bottom. |
| 177 | shop_deals | /pages/home | ar | 412 pt, text 1.3x, RTL | column g3 | A RenderFlex overflowed by 22 pixels on the bottom. |
| 177 | shop_looks | /pages/home | ar | 360 pt, text 1.3x, RTL | column g40 | A RenderFlex overflowed by 13 pixels on the bottom. |
| 178 | demo_rides | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [269.0, 193.0, 99.8 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | demo_rides | /pages/home | ar | 360 pt, text 1.3x, RTL | row g36 | A RenderFlex overflowed by 0.00894 pixels on the right. |
| 178 | demo_rides | /pages/home | ar | 360 pt, text 1.3x, RTL | row g47 | A RenderFlex overflowed by 0.893 pixels on the right. |
| 178 | demo_rides | /pages/home | en | 360 pt, text 1.0x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 81.3 x 10.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [263.8, 361.0, 102.6 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | row g25 | A RenderFlex overflowed by 6.3 pixels on the right. |
| 178 | demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | row g36 | A RenderFlex overflowed by 8.4 pixels on the right. |
| 178 | demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | row g47 | A RenderFlex overflowed by 9.3 pixels on the right. |
| 178 | demo_rides | /pages/home | en | 412 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [329.6, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 700.0] |
| 178 | demo_taxi | /pages/home | ar | 360 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 17 pixels on the bottom. |
| 178 | demo_taxi | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [338.4, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 376.0] |
| 178 | demo_taxi | /pages/home | ar | 412 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 17 pixels on the bottom. |
| 178 | demo_taxi | /pages/home | ar | 412 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [387.3, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 376.0] |
| 178 | demo_taxi | /pages/home | en | 360 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. |
| 178 | demo_taxi | /pages/home | en | 412 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. |
| 178 | rides_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [269.0, 193.0, 99.8 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | rides_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g36 | A RenderFlex overflowed by 0.00894 pixels on the right. |
| 178 | rides_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g47 | A RenderFlex overflowed by 0.893 pixels on the right. |
| 178 | rides_signature_a | /pages/home | en | 360 pt, text 1.0x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 81.3 x 10.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [263.8, 361.0, 102.6 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] |
| 178 | rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g25 | A RenderFlex overflowed by 6.3 pixels on the right. |
| 178 | rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g36 | A RenderFlex overflowed by 8.4 pixels on the right. |
| 178 | rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g47 | A RenderFlex overflowed by 9.3 pixels on the right. |
| 178 | rides_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [329.6, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 700.0] |
| 178 | rides_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g34 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g42 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g34 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g42 | A RenderFlex overflowed by 12 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | en | 360 pt, text 1.0x, LTR | mapHeader g2 | RenderFractionalTranslation [208.8, 412.9, 165.3 x 21.0] outside its RenderStack [0.0, 0.0, 360.0 x 444.0] |
| 178 | rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | column g26 | A RenderFlex overflowed by 11 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | column g34 | A RenderFlex overflowed by 11 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | column g42 | A RenderFlex overflowed by 11 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [208.8, 412.9, 207.0 x 27.0] outside its RenderStack [0.0, 0.0, 360.0 x 444.0] |
| 178 | rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | column g26 | A RenderFlex overflowed by 11 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | column g34 | A RenderFlex overflowed by 11 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | column g42 | A RenderFlex overflowed by 11 pixels on the bottom. |
| 178 | rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [239.0, 412.9, 207.0 x 27.0] outside its RenderStack [0.0, 0.0, 412.0 x 444.0] |
| 178 | taxi_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 17 pixels on the bottom. |
| 178 | taxi_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [338.4, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 376.0] |
| 178 | taxi_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 17 pixels on the bottom. |
| 178 | taxi_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [387.3, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 376.0] |
| 178 | taxi_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. |
| 178 | taxi_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. |
| 178 | taxi_signature_b | /pages/home | ar | 360 pt, text 1.0x, RTL | mapHeader g11 | RenderFractionalTranslation [294.8, 94.0, 73.2 x 10.0] outside its RenderStack [0.0, 0.0, 360.0 x 300.0] |
| 178 | taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g21 | A RenderFlex overflowed by 1.00 pixels on the bottom. |
| 178 | taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 1.00 pixels on the bottom. |
| 178 | taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g31 | A RenderFlex overflowed by 1.00 pixels on the bottom. |
| 178 | taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g11 | RenderFractionalTranslation [294.8, 94.0, 95.2 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 300.0] |
| 178 | taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g21 | A RenderFlex overflowed by 1.00 pixels on the bottom. |
| 178 | taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 1.00 pixels on the bottom. |
| 178 | taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g31 | A RenderFlex overflowed by 1.00 pixels on the bottom. |
| 178 | taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | mapHeader g11 | RenderFractionalTranslation [320.8, 94.0, 95.2 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 300.0] |
| 179 | instructors_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | row g14 | A RenderFlex overflowed by 54 pixels on the right. |
| 179 | instructors_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | row g14 | A RenderFlex overflowed by 1.6 pixels on the right. |
| 179 | teachers | /pages/home | ar | 360 pt, text 1.3x, RTL | row g6 | A RenderFlex overflowed by 46 pixels on the right. |
| 179 | teachers | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 57 pixels on the right. |
| 179 | teachers | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 4.8 pixels on the right. |
| 179 | university | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 27 pixels on the right. |
| 180 | demo_travel | /pages/home | ar | 360 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 53 pixels on the right. |
| 180 | demo_travel | /pages/home | ar | 412 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 1.2 pixels on the right. |
| 180 | demo_travel | /pages/home | en | 360 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. |
| 180 | demo_travel | /pages/home | en | 412 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. |
| 180 | travel_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 53 pixels on the right. |
| 180 | travel_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 1.2 pixels on the right. |
| 180 | travel_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. |
| 180 | travel_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. |
| 180 | travel_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | row g25 | A RenderFlex overflowed by 11 pixels on the right. |
| 180 | travel_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | row g33 | A RenderFlex overflowed by 3.5 pixels on the right. |
| 180 | travel_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | row g25 | A RenderFlex overflowed by 1.4 pixels on the right. |
| 180 | travel_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | row g33 | A RenderFlex overflowed by 1.6 pixels on the right. |

## Before the fixes: main at 14b2dcf

Roadmap 166. The guard checks every Studio template and Signature look the
way an owner's project gets it and the way a phone reads it. These are the
failures it finds on `main` at `14b2dcf`, before the fixes on the other
branches (156 translations, 157 categories, 161 currency and a story's Open,
163 layout, 164 empty lists, 165 stories from the dashboard) are merged.
Each failure is listed with its template, language, element and reason, and
the fix it waits for, or **NEW** when none of those fixes covers it. No test
was skipped, loosened or quarantined to pass. This branch is merged after
the fixes, and these tables are how to check that each fix did its part.

### How it was run

| Suite | Command | Tests | Passed | Failed | Time |
|---|---|---|---|---|---|
| vitest guard | `npx vitest run tests/unit/template-guard.test.ts` (platform/web) | 740 | 550 | 190 | 16 s |
| vitest fixtures check | `npx vitest run tests/unit/template-guard-fixtures.test.ts`, or `mobile/tool/template_guard_fixtures.sh --check` | 1 | 1 | 0 | 9 s |
| Flutter guard | `flutter test test/widget/template_guard_test.dart` (mobile, Flutter 3.47.5) | 311 | 251 | 60 | 48 s |

With `YALLAPP_GUARD_REPORT=<file>` set, either suite also writes every
problem it finds (vitest as one JSON file, Flutter as JSON lines). The
tables below were made from those two reports.

The vitest guard makes 67 projects, one for each entry in `TEMPLATES`
(`lib/studio/sections.ts`): the 8 demo templates, 18 Signature looks, every
kind's own templates and the 3 that fit every project. It uses each
template's demo kind, or the first kind `/studio/new` lists it for, or a
store for the ones that fit every project. Each project goes through
`makeStudioProject` with its content kept in Yallapp, gets sample entries
for its lists, has English as its main language with Arabic and Turkish on,
and is published. Then it's read with `GET /pages` and every
`GET /pages/{slug}` in en, ar and tr. The customer asks for prices in USD.
The sample shops sell in Turkish lira or Egyptian pounds; the travel
samples are in US dollars.

### Summary by template

Numbers are rows in the tables below. An empty cell means that check passed
for the template.

| Template | Placeholders | Edits (156) | Prices (161) | Taps | Layout (163) |
|---|---|---|---|---|---|
| academy_premium |  | 3 | 18 |  |  |
| brand | 27 | 3 |  | 1 | 3 |
| charity | 15 | 3 |  |  | 3 |
| contact | 3 | 3 |  |  |  |
| courses | 15 | 3 | 12 |  | 3 |
| delivery | 3 | 3 |  |  |  |
| delivery_city | 3 | 3 |  |  |  |
| delivery_signature_a | 3 | 3 | 12 |  |  |
| delivery_signature_b |  | 3 | 7 |  |  |
| demo_delivery | 3 | 3 | 12 |  |  |
| demo_food | 3 | 6 | 21 |  | 5 |
| demo_instructors |  | 7 | 18 |  |  |
| demo_marketplace | 6 | 9 | 18 |  | 12 |
| demo_rides |  | 6 |  |  | 10 |
| demo_school | 3 | 5 |  |  |  |
| demo_taxi |  | 6 |  |  | 6 |
| demo_travel |  | 3 | 12 |  | 4 |
| events |  | 3 | 12 |  |  |
| flowers_signature_a | 27 | 22 | 39 |  | 40 |
| flowers_signature_b | 27 | 22 | 30 |  | 9 |
| food |  | 3 |  |  |  |
| food_brand | 12 | 3 |  |  | 3 |
| food_offers | 9 | 3 |  |  |  |
| food_photo | 3 | 3 |  |  |  |
| food_signature_a | 3 | 6 | 21 |  | 5 |
| food_signature_b |  | 7 | 3 |  | 4 |
| instructors_signature_a |  | 7 | 18 |  |  |
| instructors_signature_b |  | 9 | 12 |  | 2 |
| listings | 3 | 3 | 12 |  |  |
| market |  | 3 |  |  | 28 |
| market_grocery |  | 3 |  |  | 28 |
| market_offers |  | 3 |  |  | 28 |
| market_photo | 3 | 3 |  |  | 1 |
| marketplace_signature_a | 6 | 9 | 18 |  | 12 |
| marketplace_signature_b | 6 | 12 |  |  | 8 |
| menu |  | 3 | 12 |  |  |
| news |  | 2 |  |  |  |
| premium_academy_signature_a |  | 3 | 18 |  |  |
| premium_academy_signature_b |  | 3 | 18 |  |  |
| ride |  | 3 |  |  |  |
| ride_brand | 21 | 3 |  |  | 3 |
| ride_night |  | 3 |  |  |  |
| ride_offers | 9 | 3 |  |  |  |
| rides_signature_a |  | 6 |  |  | 10 |
| rides_signature_b |  | 6 |  |  | 15 |
| school |  | 3 |  |  |  |
| school_brand | 21 | 3 |  |  | 3 |
| school_news | 9 | 3 |  |  |  |
| school_signature_a | 3 | 5 |  |  |  |
| school_signature_b |  | 5 |  |  |  |
| school_today |  | 3 |  |  |  |
| services | 15 | 3 | 12 |  |  |
| shop |  | 3 | 54 |  |  |
| shop_deals |  | 3 | 15 |  | 2 |
| shop_looks |  | 3 | 66 |  | 1 |
| taxi_map |  | 3 |  |  | 4 |
| taxi_signature_a |  | 6 |  |  | 6 |
| taxi_signature_b |  | 6 |  |  | 13 |
| teachers |  | 3 | 12 |  | 3 |
| teachers_brand | 21 | 3 |  |  | 3 |
| teachers_offers | 9 | 3 | 12 |  |  |
| teachers_photo |  | 3 | 18 |  |  |
| travel |  | 3 | 12 |  |  |
| travel_signature_a |  | 3 | 12 |  | 4 |
| travel_signature_b | 18 | 5 |  |  | 7 |
| university | 3 | 3 |  |  | 1 |

Templates not in this table passed every check: `blank`.

### What passes today

- **The contract:** every `GET /pages` and `GET /pages/{slug}` answer
  matches `docs/api/openapi.yaml`, in all three languages, for all 67
  templates.
- **Bound lists (164):** while the store has entries, every items and
  categories element bound to its entries is served filled, in en, ar and tr.
  After "Remove all samples" every one of them is left out. That holds for
  all 67 templates on content kept in Yallapp. The one list served empty on
  purpose is the phone's own "lately viewed" (`recent`), which the phone
  fills and the check leaves out. Nothing here fails before 164, so if 164
  fixes lists from another source (WooCommerce, Shopify or a platform), the
  guard needs a case for that source to cover it.
- **Categories (157):** no list filters by a category the store doesn't
  have, and every category a page shows is one of the store's. Leqaa's
  occasion stories open the shop's search (`screen: search`), which the
  check accepts as "the shop". If 157 makes them open their own category,
  the guard won't notice a regression back to the search.
- **Stories:** every served story has an action (161's "Open"). Stories
  published from the dashboard (165) are not made by any template, so the
  guard doesn't cover them yet.
- **Reaching the last element (Flutter):** on every page, phone width, text
  size and direction, the page's last element scrolls into view above the
  tab bar and the 48 pt bottom inset.

### What fails and why

### Placeholders reach the customer (NEW): 31 templates × en, ar, tr

Several templates write their sample words in brackets so the owner knows
what to replace in Studio, for example "[Customer name]", "[رأي أحد العملاء فيك]",
"[Number] customers", "Order before [your cut-off time] and it arrives today."
and "[Street name]". The served app shows these to customers exactly as
written. Leqaa's two looks show 9 each: the cut-off line, the testimonials'
name and message, and others. None of the listed fixes removes them, so this
is NEW. The rule in the test: no customer-visible text has letters inside
`[…]` (also `［…］` and `【…】`), and no "lorem ipsum". The allowlist for
samples shown only in Studio (`STUDIO_ONLY_SAMPLES`) is empty: the served
app allows none.

### An owner's edit doesn't reach Arabic or Turkish (156): 66 templates

For each Studio page, the test edits in English, as the inspector does
(`updateNode` with the new words, then `saveDraft`, then publish):

1. a text the template translated;
2. a second text, then the owner writes their own Arabic for it;
3. an entry or slide of a list the template translated.

In en the owner's words are served. In ar and tr the template's stored
`translations` win, so the customer reads the template's words. For edit 2
in tr, the template's Turkish shows instead of the owner's English. The
owner's own Arabic is served correctly everywhere: no row involves
"كلمات المالك". Every template with words of its own fails. `blank` has
nothing to edit. If 156 puts its fix in the inspector's patch instead of
`updateNode`, `saveDraft` or the serving code, `edited()` in the test must
make the same patch the inspector makes.

### Prices (161): 30 templates

- 444 rows: list items priced only by `price_label`, for example "₺1,290.00",
  "₺2,290.00 – ₺4,260.00", "TRY 22,900,000" or "Free". There's no amount and
  currency the app can convert, and nothing in the customer's USD. This
  covers products, courses, services, listings, events and hotels, and sales
  (`sale.now_formatted`). The test expects `price: { amount, currency }`, as
  `ProductPrice` has it, with a `display` in the customer's currency unless
  the shop's own currency is the customer's.
- 112 rows in 8 templates (the food, delivery and marketplace demos and
  their looks): prices written into the templates' own words, for example
  "Kofta, shish tawook and lamb chops · EGP 240", "over EGP 200", "+EGP 45"
  and "كشري 55 ج.م". They're in Egyptian pounds whatever the shop's currency,
  and never in the customer's. They're marked "161 / NEW": 161 converts the
  prices it serves, and only it knows whether it also covers words a
  template wrote.

### A button that opens nothing (NEW): `brand`

`brand`'s hero button ("Start now") is served with no action, so the tap
does nothing. Every other tap in every template opens a served page, a
screen the app has, or an entry, course or category the store has.

### Layout on the phone (163): 34 templates, 60 pages

Each page is drawn through `StudioPageView` in the app's own fonts on
360 × 780 and 412 × 915 phones, at text size 1.0 and 1.3, in LTR (English)
and RTL (Arabic). It's placed as the shell places it: under the template's
own tab bar, which floats over the page or sits under it, over a 48 pt
bottom inset. The test finds:

- 149 overflows (Flutter's own "A RenderFlex overflowed…" errors). Most
  happen at text size 1.3: Leqaa's occasion chip row by 8 to 20 pt to the
  right; the stats rows of `brand`, `charity`, `courses`, `food_brand`,
  `ride_brand`, `school_brand` and `teachers_brand`; the ride and taxi demos'
  vehicle rows; the marketplace's cards (`market`); and columns at the
  bottom of cards.
- 140 boxes outside their parents and cut off by a parent that clips:
  Leqaa's testimonial quote badge 6 pt above its card; the marketplace's
  department photos past their tiles (`market`, `Transform`/`AspectRatio`);
  street labels at the map's edge in the ride and taxi looks (`mapHeader`);
  and bento tiles whose text is 1 to 5 pt taller than the tile in Arabic at
  1.3. Some of these may be cut off on purpose (the map's labels, a photo
  bleeding past its tile). They're listed for 163 to decide, and the test
  isn't loosened for them.

The test doesn't check, on purpose: what a scroll view lays out (a
carousel's cards past the phone's edge); what moves while it animates
(`Transform` and `FractionalTranslation` as parents); a stack that doesn't
clip (`Clip.none`, a badge set to reach past it); and a shape that ignores
taps (`IgnorePointer`, a card's decorative circle, as in `market`, which
nobody reads or taps). Sample pictures the test can't download aren't
counted as errors.

The full tables for 14b2dcf are in this file as of commit dabb901.
