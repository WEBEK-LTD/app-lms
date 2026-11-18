# Template guard: what fails on main, 18 November 2026

Roadmap 166. The guard checks every Studio template and Signature look the
way an owner's project gets it and the way a phone reads it. These are the
failures it finds on `main` at `14b2dcf`, before the fixes on the other
branches (156 translations, 157 categories, 161 currency and a story's Open,
163 layout, 164 empty lists, 165 stories from the dashboard) are merged.
Each failure is listed with its template, language, element and reason, and
the fix it waits for, or **NEW** when none of those fixes covers it. No test
was skipped, loosened or quarantined to pass. This branch is merged after
the fixes, and these tables are how to check that each fix did its part.

## How it was run

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

## Summary by template

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

## What passes today

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

## What fails and why

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

## Tables

### Placeholders (NEW)

| Template | Language | Element | Text the customer reads | Fix |
|---|---|---|---|---|
| demo_delivery | en | /pages/home.body.children[1].children[0].children[1].children[1].text | "[Street name]" | NEW |
| demo_delivery | ar | /pages/home.body.children[1].children[0].children[1].children[1].text | "[اسم الشارع]" | NEW |
| demo_delivery | tr | /pages/home.body.children[1].children[0].children[1].children[1].text | "[Sokak adı]" | NEW |
| demo_food | en | /pages/home.body.children[0].children[0].children[0].children[1].children[0].children[1].children[0].text | "[Your area]" | NEW |
| demo_food | ar | /pages/home.body.children[0].children[0].children[0].children[1].children[0].children[1].children[0].text | "[منطقتك]" | NEW |
| demo_food | tr | /pages/home.body.children[0].children[0].children[0].children[1].children[0].children[1].children[0].text | "[Bölgeniz]" | NEW |
| demo_marketplace | en | /pages/home.body.children[1].children[2].children[0].children[0].text | "[One of your shops]" | NEW |
| demo_marketplace | en | /pages/search.body.children[0].children[2].children[0].children[0].text | "[One of your shops]" | NEW |
| demo_marketplace | ar | /pages/home.body.children[1].children[2].children[0].children[0].text | "[أحد متاجرك]" | NEW |
| demo_marketplace | ar | /pages/search.body.children[0].children[2].children[0].children[0].text | "[أحد متاجرك]" | NEW |
| demo_marketplace | tr | /pages/home.body.children[1].children[2].children[0].children[0].text | "[Mağazalarınızdan biri]" | NEW |
| demo_marketplace | tr | /pages/search.body.children[0].children[2].children[0].children[0].text | "[Mağazalarınızdan biri]" | NEW |
| demo_school | en | /pages/home.body.children[1].children[1].text | "[This week's news, a line each]\n[A trip, a holiday or an evening for parents]" | NEW |
| demo_school | ar | /pages/home.body.children[1].children[1].text | "[أخبار هذا الأسبوع، كل خبر في سطر]\n[رحلة أو عطلة أو لقاء لأولياء الأمور]" | NEW |
| demo_school | tr | /pages/home.body.children[1].children[1].text | "[Bu haftanın haberleri, her biri bir satırda]\n[Bir gezi, bir tatil ya da veli akşamı]" | NEW |
| food_signature_a | en | /pages/home.body.children[0].children[0].children[0].children[1].children[0].children[1].children[0].text | "[Your area]" | NEW |
| food_signature_a | ar | /pages/home.body.children[0].children[0].children[0].children[1].children[0].children[1].children[0].text | "[منطقتك]" | NEW |
| food_signature_a | tr | /pages/home.body.children[0].children[0].children[0].children[1].children[0].children[1].children[0].text | "[Bölgeniz]" | NEW |
| marketplace_signature_a | en | /pages/home.body.children[1].children[2].children[0].children[0].text | "[One of your shops]" | NEW |
| marketplace_signature_a | en | /pages/search.body.children[0].children[2].children[0].children[0].text | "[One of your shops]" | NEW |
| marketplace_signature_a | ar | /pages/home.body.children[1].children[2].children[0].children[0].text | "[أحد متاجرك]" | NEW |
| marketplace_signature_a | ar | /pages/search.body.children[0].children[2].children[0].children[0].text | "[أحد متاجرك]" | NEW |
| marketplace_signature_a | tr | /pages/home.body.children[1].children[2].children[0].children[0].text | "[Mağazalarınızdan biri]" | NEW |
| marketplace_signature_a | tr | /pages/search.body.children[0].children[2].children[0].children[0].text | "[Mağazalarınızdan biri]" | NEW |
| marketplace_signature_b | en | /pages/home.body.children[0].children[1].children[0].text | "[Your shop · your area]" | NEW |
| marketplace_signature_b | en | /pages/home.body.children[0].children[1].children[2].children[1].children[1].text | "[to your area]" | NEW |
| marketplace_signature_b | ar | /pages/home.body.children[0].children[1].children[0].text | "[متجرك · منطقتك]" | NEW |
| marketplace_signature_b | ar | /pages/home.body.children[0].children[1].children[2].children[1].children[1].text | "[إلى منطقتك]" | NEW |
| marketplace_signature_b | tr | /pages/home.body.children[0].children[1].children[0].text | "[Mağazanız · bölgeniz]" | NEW |
| marketplace_signature_b | tr | /pages/home.body.children[0].children[1].children[2].children[1].children[1].text | "[bölgenize]" | NEW |
| delivery_signature_a | en | /pages/home.body.children[1].children[0].children[1].children[1].text | "[Street name]" | NEW |
| delivery_signature_a | ar | /pages/home.body.children[1].children[0].children[1].children[1].text | "[اسم الشارع]" | NEW |
| delivery_signature_a | tr | /pages/home.body.children[1].children[0].children[1].children[1].text | "[Sokak adı]" | NEW |
| travel_signature_b | en | /pages/home.body.children[3].entries[0].title | "[One of your stays]" | NEW |
| travel_signature_b | en | /pages/home.body.children[3].entries[0].text | "[What makes it special · its price a night]" | NEW |
| travel_signature_b | en | /pages/home.body.children[3].entries[1].title | "[Your second stay]" | NEW |
| travel_signature_b | en | /pages/home.body.children[3].entries[1].text | "[The second one's price a night]" | NEW |
| travel_signature_b | en | /pages/home.body.children[3].entries[2].title | "[Your third stay]" | NEW |
| travel_signature_b | en | /pages/home.body.children[3].entries[2].text | "[The third one's price a night]" | NEW |
| travel_signature_b | ar | /pages/home.body.children[3].entries[0].title | "[إحدى إقاماتك]" | NEW |
| travel_signature_b | ar | /pages/home.body.children[3].entries[0].text | "[ما يميّزها · سعر الليلة]" | NEW |
| travel_signature_b | ar | /pages/home.body.children[3].entries[1].title | "[إقامتك الثانية]" | NEW |
| travel_signature_b | ar | /pages/home.body.children[3].entries[1].text | "[سعر ليلة فيها]" | NEW |
| travel_signature_b | ar | /pages/home.body.children[3].entries[2].title | "[إقامتك الثالثة]" | NEW |
| travel_signature_b | ar | /pages/home.body.children[3].entries[2].text | "[سعر ليلتها]" | NEW |
| travel_signature_b | tr | /pages/home.body.children[3].entries[0].title | "[Bir konaklamanız]" | NEW |
| travel_signature_b | tr | /pages/home.body.children[3].entries[0].text | "[Onu özel kılan · gecelik fiyatı]" | NEW |
| travel_signature_b | tr | /pages/home.body.children[3].entries[1].title | "[İkinci konaklamanız]" | NEW |
| travel_signature_b | tr | /pages/home.body.children[3].entries[1].text | "[İkincisinin gecelik fiyatı]" | NEW |
| travel_signature_b | tr | /pages/home.body.children[3].entries[2].title | "[Üçüncü konaklamanız]" | NEW |
| travel_signature_b | tr | /pages/home.body.children[3].entries[2].text | "[Üçüncüsünün gecelik fiyatı]" | NEW |
| school_signature_a | en | /pages/home.body.children[1].children[1].text | "[This week's news, a line each]\n[A trip, a holiday or an evening for parents]" | NEW |
| school_signature_a | ar | /pages/home.body.children[1].children[1].text | "[أخبار هذا الأسبوع، كل خبر في سطر]\n[رحلة أو عطلة أو لقاء لأولياء الأمور]" | NEW |
| school_signature_a | tr | /pages/home.body.children[1].children[1].text | "[Bu haftanın haberleri, her biri bir satırda]\n[Bir gezi, bir tatil ya da veli akşamı]" | NEW |
| flowers_signature_a | en | /pages/home.body.children[2].children[0].children[1].children[1].text | "Order before [your cut-off time] and it arrives today." | NEW |
| flowers_signature_a | en | /pages/home.body.children[10].entries[0].title | "[Customer name]" | NEW |
| flowers_signature_a | en | /pages/home.body.children[10].entries[0].subtitle | "[What they sent]" | NEW |
| flowers_signature_a | en | /pages/home.body.children[10].entries[0].text | "[What a customer says about you]" | NEW |
| flowers_signature_a | en | /pages/home.body.children[10].entries[1].title | "[Customer name]" | NEW |
| flowers_signature_a | en | /pages/home.body.children[10].entries[1].subtitle | "[What they sent]" | NEW |
| flowers_signature_a | en | /pages/home.body.children[10].entries[1].text | "[Another customer's words]" | NEW |
| flowers_signature_a | en | /pages/bouquet.body.children[1].children[1].text | "[Your signature bouquet]" | NEW |
| flowers_signature_a | en | /pages/bouquet.body.children[1].children[2].text | "[A line about it: its flowers and colours]" | NEW |
| flowers_signature_a | ar | /pages/home.body.children[2].children[0].children[1].children[1].text | "اطلب قبل [آخر موعد للطلب] ويصل اليوم." | NEW |
| flowers_signature_a | ar | /pages/home.body.children[10].entries[0].title | "[اسم العميل]" | NEW |
| flowers_signature_a | ar | /pages/home.body.children[10].entries[0].subtitle | "[ما أرسله]" | NEW |
| flowers_signature_a | ar | /pages/home.body.children[10].entries[0].text | "[رأي أحد العملاء فيك]" | NEW |
| flowers_signature_a | ar | /pages/home.body.children[10].entries[1].title | "[اسم العميل]" | NEW |
| flowers_signature_a | ar | /pages/home.body.children[10].entries[1].subtitle | "[ما أرسله]" | NEW |
| flowers_signature_a | ar | /pages/home.body.children[10].entries[1].text | "[كلمات عميل آخر]" | NEW |
| flowers_signature_a | ar | /pages/bouquet.body.children[1].children[1].text | "[باقتك المميّزة]" | NEW |
| flowers_signature_a | ar | /pages/bouquet.body.children[1].children[2].text | "[سطر عنها: زهورها وألوانها]" | NEW |
| flowers_signature_a | tr | /pages/home.body.children[2].children[0].children[1].children[1].text | "[Son sipariş saatiniz] öncesinde sipariş verin, bugün ulaşsın." | NEW |
| flowers_signature_a | tr | /pages/home.body.children[10].entries[0].title | "[Müşterinin adı]" | NEW |
| flowers_signature_a | tr | /pages/home.body.children[10].entries[0].subtitle | "[Ne gönderdi]" | NEW |
| flowers_signature_a | tr | /pages/home.body.children[10].entries[0].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| flowers_signature_a | tr | /pages/home.body.children[10].entries[1].title | "[Müşterinin adı]" | NEW |
| flowers_signature_a | tr | /pages/home.body.children[10].entries[1].subtitle | "[Ne gönderdi]" | NEW |
| flowers_signature_a | tr | /pages/home.body.children[10].entries[1].text | "[Başka bir müşterinin sözleri]" | NEW |
| flowers_signature_a | tr | /pages/bouquet.body.children[1].children[1].text | "[İmza buketiniz]" | NEW |
| flowers_signature_a | tr | /pages/bouquet.body.children[1].children[2].text | "[Onun hakkında bir satır: çiçekleri ve renkleri]" | NEW |
| flowers_signature_b | en | /pages/home.body.children[2].children[0].children[1].children[1].text | "Order before [your cut-off time] and it arrives today." | NEW |
| flowers_signature_b | en | /pages/home.body.children[12].entries[0].title | "[Customer name]" | NEW |
| flowers_signature_b | en | /pages/home.body.children[12].entries[0].subtitle | "[What they sent]" | NEW |
| flowers_signature_b | en | /pages/home.body.children[12].entries[0].text | "[What a customer says about you]" | NEW |
| flowers_signature_b | en | /pages/home.body.children[12].entries[1].title | "[Customer name]" | NEW |
| flowers_signature_b | en | /pages/home.body.children[12].entries[1].subtitle | "[What they sent]" | NEW |
| flowers_signature_b | en | /pages/home.body.children[12].entries[1].text | "[Another customer's words]" | NEW |
| flowers_signature_b | en | /pages/bouquet.body.children[1].children[1].text | "[Your signature bouquet]" | NEW |
| flowers_signature_b | en | /pages/bouquet.body.children[1].children[2].text | "[A line about it: its flowers and colours]" | NEW |
| flowers_signature_b | ar | /pages/home.body.children[2].children[0].children[1].children[1].text | "اطلب قبل [آخر موعد للطلب] ويصل اليوم." | NEW |
| flowers_signature_b | ar | /pages/home.body.children[12].entries[0].title | "[اسم العميل]" | NEW |
| flowers_signature_b | ar | /pages/home.body.children[12].entries[0].subtitle | "[ما أرسله]" | NEW |
| flowers_signature_b | ar | /pages/home.body.children[12].entries[0].text | "[رأي أحد العملاء فيك]" | NEW |
| flowers_signature_b | ar | /pages/home.body.children[12].entries[1].title | "[اسم العميل]" | NEW |
| flowers_signature_b | ar | /pages/home.body.children[12].entries[1].subtitle | "[ما أرسله]" | NEW |
| flowers_signature_b | ar | /pages/home.body.children[12].entries[1].text | "[كلمات عميل آخر]" | NEW |
| flowers_signature_b | ar | /pages/bouquet.body.children[1].children[1].text | "[باقتك المميّزة]" | NEW |
| flowers_signature_b | ar | /pages/bouquet.body.children[1].children[2].text | "[سطر عنها: زهورها وألوانها]" | NEW |
| flowers_signature_b | tr | /pages/home.body.children[2].children[0].children[1].children[1].text | "[Son sipariş saatiniz] öncesinde sipariş verin, bugün ulaşsın." | NEW |
| flowers_signature_b | tr | /pages/home.body.children[12].entries[0].title | "[Müşterinin adı]" | NEW |
| flowers_signature_b | tr | /pages/home.body.children[12].entries[0].subtitle | "[Ne gönderdi]" | NEW |
| flowers_signature_b | tr | /pages/home.body.children[12].entries[0].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| flowers_signature_b | tr | /pages/home.body.children[12].entries[1].title | "[Müşterinin adı]" | NEW |
| flowers_signature_b | tr | /pages/home.body.children[12].entries[1].subtitle | "[Ne gönderdi]" | NEW |
| flowers_signature_b | tr | /pages/home.body.children[12].entries[1].text | "[Başka bir müşterinin sözleri]" | NEW |
| flowers_signature_b | tr | /pages/bouquet.body.children[1].children[1].text | "[İmza buketiniz]" | NEW |
| flowers_signature_b | tr | /pages/bouquet.body.children[1].children[2].text | "[Onun hakkında bir satır: çiçekleri ve renkleri]" | NEW |
| courses | en | /pages/home.body.children[1].children[0].text | "[Number] customers" | NEW |
| courses | en | /pages/home.body.children[1].children[1].text | "[Number] years" | NEW |
| courses | en | /pages/home.body.children[1].children[2].text | "[Number] branches" | NEW |
| courses | en | /pages/home.body.children[3].children[1].text | "[What a customer says about you]" | NEW |
| courses | en | /pages/home.body.children[3].children[2].text | "[Customer name]" | NEW |
| courses | ar | /pages/home.body.children[1].children[0].text | "[رقم] عميل" | NEW |
| courses | ar | /pages/home.body.children[1].children[1].text | "[رقم] سنة" | NEW |
| courses | ar | /pages/home.body.children[1].children[2].text | "[رقم] فرع" | NEW |
| courses | ar | /pages/home.body.children[3].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| courses | ar | /pages/home.body.children[3].children[2].text | "[اسم العميل]" | NEW |
| courses | tr | /pages/home.body.children[1].children[0].text | "[Sayı] müşteri" | NEW |
| courses | tr | /pages/home.body.children[1].children[1].text | "[Sayı] yıl" | NEW |
| courses | tr | /pages/home.body.children[1].children[2].text | "[Sayı] şube" | NEW |
| courses | tr | /pages/home.body.children[3].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| courses | tr | /pages/home.body.children[3].children[2].text | "[Müşterinin adı]" | NEW |
| services | en | /pages/home.body.children[1].children[0].children[2].text | "[Why customers choose you]" | NEW |
| services | en | /pages/home.body.children[1].children[1].children[2].text | "[What you promise]" | NEW |
| services | en | /pages/home.body.children[1].children[2].children[2].text | "[How to reach you]" | NEW |
| services | en | /pages/home.body.children[3].children[1].text | "[What a customer says about you]" | NEW |
| services | en | /pages/home.body.children[3].children[2].text | "[Customer name]" | NEW |
| services | ar | /pages/home.body.children[1].children[0].children[2].text | "[لماذا يختارك العملاء]" | NEW |
| services | ar | /pages/home.body.children[1].children[1].children[2].text | "[ما تعد به عملاءك]" | NEW |
| services | ar | /pages/home.body.children[1].children[2].children[2].text | "[كيف يتواصلون معك]" | NEW |
| services | ar | /pages/home.body.children[3].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| services | ar | /pages/home.body.children[3].children[2].text | "[اسم العميل]" | NEW |
| services | tr | /pages/home.body.children[1].children[0].children[2].text | "[Müşteriler neden sizi seçiyor]" | NEW |
| services | tr | /pages/home.body.children[1].children[1].children[2].text | "[Sözünüz]" | NEW |
| services | tr | /pages/home.body.children[1].children[2].children[2].text | "[Size nasıl ulaşılır]" | NEW |
| services | tr | /pages/home.body.children[3].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| services | tr | /pages/home.body.children[3].children[2].text | "[Müşterinin adı]" | NEW |
| listings | en | /pages/home.body.children[3].children[1].text | "[Your address and opening hours]" | NEW |
| listings | ar | /pages/home.body.children[3].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| listings | tr | /pages/home.body.children[3].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| charity | en | /pages/home.body.children[1].children[0].text | "[Number] customers" | NEW |
| charity | en | /pages/home.body.children[1].children[1].text | "[Number] years" | NEW |
| charity | en | /pages/home.body.children[1].children[2].text | "[Number] branches" | NEW |
| charity | en | /pages/home.body.children[3].children[1].text | "[What a customer says about you]" | NEW |
| charity | en | /pages/home.body.children[3].children[2].text | "[Customer name]" | NEW |
| charity | ar | /pages/home.body.children[1].children[0].text | "[رقم] عميل" | NEW |
| charity | ar | /pages/home.body.children[1].children[1].text | "[رقم] سنة" | NEW |
| charity | ar | /pages/home.body.children[1].children[2].text | "[رقم] فرع" | NEW |
| charity | ar | /pages/home.body.children[3].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| charity | ar | /pages/home.body.children[3].children[2].text | "[اسم العميل]" | NEW |
| charity | tr | /pages/home.body.children[1].children[0].text | "[Sayı] müşteri" | NEW |
| charity | tr | /pages/home.body.children[1].children[1].text | "[Sayı] yıl" | NEW |
| charity | tr | /pages/home.body.children[1].children[2].text | "[Sayı] şube" | NEW |
| charity | tr | /pages/home.body.children[3].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| charity | tr | /pages/home.body.children[3].children[2].text | "[Müşterinin adı]" | NEW |
| delivery | en | /pages/home.body.children[3].children[1].text | "[Your address and opening hours]" | NEW |
| delivery | ar | /pages/home.body.children[3].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| delivery | tr | /pages/home.body.children[3].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| food_offers | en | /pages/home.body.children[0].children[0].children[1].text | "[Your offer here]" | NEW |
| food_offers | en | /pages/home.body.children[2].children[1].text | "[What a customer says about you]" | NEW |
| food_offers | en | /pages/home.body.children[2].children[2].text | "[Customer name]" | NEW |
| food_offers | ar | /pages/home.body.children[0].children[0].children[1].text | "[اكتب عرضك]" | NEW |
| food_offers | ar | /pages/home.body.children[2].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| food_offers | ar | /pages/home.body.children[2].children[2].text | "[اسم العميل]" | NEW |
| food_offers | tr | /pages/home.body.children[0].children[0].children[1].text | "[Fırsatınızı buraya yazın]" | NEW |
| food_offers | tr | /pages/home.body.children[2].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| food_offers | tr | /pages/home.body.children[2].children[2].text | "[Müşterinin adı]" | NEW |
| food_brand | en | /pages/home.body.children[1].children[0].text | "[Number] customers" | NEW |
| food_brand | en | /pages/home.body.children[1].children[1].text | "[Number] years" | NEW |
| food_brand | en | /pages/home.body.children[1].children[2].text | "[Number] branches" | NEW |
| food_brand | en | /pages/home.body.children[4].children[1].text | "[Your address and opening hours]" | NEW |
| food_brand | ar | /pages/home.body.children[1].children[0].text | "[رقم] عميل" | NEW |
| food_brand | ar | /pages/home.body.children[1].children[1].text | "[رقم] سنة" | NEW |
| food_brand | ar | /pages/home.body.children[1].children[2].text | "[رقم] فرع" | NEW |
| food_brand | ar | /pages/home.body.children[4].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| food_brand | tr | /pages/home.body.children[1].children[0].text | "[Sayı] müşteri" | NEW |
| food_brand | tr | /pages/home.body.children[1].children[1].text | "[Sayı] yıl" | NEW |
| food_brand | tr | /pages/home.body.children[1].children[2].text | "[Sayı] şube" | NEW |
| food_brand | tr | /pages/home.body.children[4].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| food_photo | en | /pages/home.body.children[0].children[0].children[0].children[0].children[0].children[1].children[0].text | "[Your area]" | NEW |
| food_photo | ar | /pages/home.body.children[0].children[0].children[0].children[0].children[0].children[1].children[0].text | "[منطقتك]" | NEW |
| food_photo | tr | /pages/home.body.children[0].children[0].children[0].children[0].children[0].children[1].children[0].text | "[Bölgeniz]" | NEW |
| ride_offers | en | /pages/home.body.children[0].children[0].children[1].text | "[Your offer here]" | NEW |
| ride_offers | en | /pages/home.body.children[2].children[1].text | "[What a customer says about you]" | NEW |
| ride_offers | en | /pages/home.body.children[2].children[2].text | "[Customer name]" | NEW |
| ride_offers | ar | /pages/home.body.children[0].children[0].children[1].text | "[اكتب عرضك]" | NEW |
| ride_offers | ar | /pages/home.body.children[2].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| ride_offers | ar | /pages/home.body.children[2].children[2].text | "[اسم العميل]" | NEW |
| ride_offers | tr | /pages/home.body.children[0].children[0].children[1].text | "[Fırsatınızı buraya yazın]" | NEW |
| ride_offers | tr | /pages/home.body.children[2].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| ride_offers | tr | /pages/home.body.children[2].children[2].text | "[Müşterinin adı]" | NEW |
| ride_brand | en | /pages/home.body.children[1].children[0].text | "[Number] customers" | NEW |
| ride_brand | en | /pages/home.body.children[1].children[1].text | "[Number] years" | NEW |
| ride_brand | en | /pages/home.body.children[1].children[2].text | "[Number] branches" | NEW |
| ride_brand | en | /pages/home.body.children[2].children[0].children[2].text | "[Why customers choose you]" | NEW |
| ride_brand | en | /pages/home.body.children[2].children[1].children[2].text | "[What you promise]" | NEW |
| ride_brand | en | /pages/home.body.children[2].children[2].children[2].text | "[How to reach you]" | NEW |
| ride_brand | en | /pages/home.body.children[4].children[1].text | "[Your address and opening hours]" | NEW |
| ride_brand | ar | /pages/home.body.children[1].children[0].text | "[رقم] عميل" | NEW |
| ride_brand | ar | /pages/home.body.children[1].children[1].text | "[رقم] سنة" | NEW |
| ride_brand | ar | /pages/home.body.children[1].children[2].text | "[رقم] فرع" | NEW |
| ride_brand | ar | /pages/home.body.children[2].children[0].children[2].text | "[لماذا يختارك العملاء]" | NEW |
| ride_brand | ar | /pages/home.body.children[2].children[1].children[2].text | "[ما تعد به عملاءك]" | NEW |
| ride_brand | ar | /pages/home.body.children[2].children[2].children[2].text | "[كيف يتواصلون معك]" | NEW |
| ride_brand | ar | /pages/home.body.children[4].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| ride_brand | tr | /pages/home.body.children[1].children[0].text | "[Sayı] müşteri" | NEW |
| ride_brand | tr | /pages/home.body.children[1].children[1].text | "[Sayı] yıl" | NEW |
| ride_brand | tr | /pages/home.body.children[1].children[2].text | "[Sayı] şube" | NEW |
| ride_brand | tr | /pages/home.body.children[2].children[0].children[2].text | "[Müşteriler neden sizi seçiyor]" | NEW |
| ride_brand | tr | /pages/home.body.children[2].children[1].children[2].text | "[Sözünüz]" | NEW |
| ride_brand | tr | /pages/home.body.children[2].children[2].children[2].text | "[Size nasıl ulaşılır]" | NEW |
| ride_brand | tr | /pages/home.body.children[4].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| teachers_offers | en | /pages/home.body.children[0].children[0].children[1].text | "[Your offer here]" | NEW |
| teachers_offers | en | /pages/home.body.children[2].children[1].text | "[What a customer says about you]" | NEW |
| teachers_offers | en | /pages/home.body.children[2].children[2].text | "[Customer name]" | NEW |
| teachers_offers | ar | /pages/home.body.children[0].children[0].children[1].text | "[اكتب عرضك]" | NEW |
| teachers_offers | ar | /pages/home.body.children[2].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| teachers_offers | ar | /pages/home.body.children[2].children[2].text | "[اسم العميل]" | NEW |
| teachers_offers | tr | /pages/home.body.children[0].children[0].children[1].text | "[Fırsatınızı buraya yazın]" | NEW |
| teachers_offers | tr | /pages/home.body.children[2].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| teachers_offers | tr | /pages/home.body.children[2].children[2].text | "[Müşterinin adı]" | NEW |
| teachers_brand | en | /pages/home.body.children[1].children[0].text | "[Number] customers" | NEW |
| teachers_brand | en | /pages/home.body.children[1].children[1].text | "[Number] years" | NEW |
| teachers_brand | en | /pages/home.body.children[1].children[2].text | "[Number] branches" | NEW |
| teachers_brand | en | /pages/home.body.children[2].children[0].children[2].text | "[Why customers choose you]" | NEW |
| teachers_brand | en | /pages/home.body.children[2].children[1].children[2].text | "[What you promise]" | NEW |
| teachers_brand | en | /pages/home.body.children[2].children[2].children[2].text | "[How to reach you]" | NEW |
| teachers_brand | en | /pages/home.body.children[4].children[1].text | "[Your address and opening hours]" | NEW |
| teachers_brand | ar | /pages/home.body.children[1].children[0].text | "[رقم] عميل" | NEW |
| teachers_brand | ar | /pages/home.body.children[1].children[1].text | "[رقم] سنة" | NEW |
| teachers_brand | ar | /pages/home.body.children[1].children[2].text | "[رقم] فرع" | NEW |
| teachers_brand | ar | /pages/home.body.children[2].children[0].children[2].text | "[لماذا يختارك العملاء]" | NEW |
| teachers_brand | ar | /pages/home.body.children[2].children[1].children[2].text | "[ما تعد به عملاءك]" | NEW |
| teachers_brand | ar | /pages/home.body.children[2].children[2].children[2].text | "[كيف يتواصلون معك]" | NEW |
| teachers_brand | ar | /pages/home.body.children[4].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| teachers_brand | tr | /pages/home.body.children[1].children[0].text | "[Sayı] müşteri" | NEW |
| teachers_brand | tr | /pages/home.body.children[1].children[1].text | "[Sayı] yıl" | NEW |
| teachers_brand | tr | /pages/home.body.children[1].children[2].text | "[Sayı] şube" | NEW |
| teachers_brand | tr | /pages/home.body.children[2].children[0].children[2].text | "[Müşteriler neden sizi seçiyor]" | NEW |
| teachers_brand | tr | /pages/home.body.children[2].children[1].children[2].text | "[Sözünüz]" | NEW |
| teachers_brand | tr | /pages/home.body.children[2].children[2].children[2].text | "[Size nasıl ulaşılır]" | NEW |
| teachers_brand | tr | /pages/home.body.children[4].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| school_news | en | /pages/home.body.children[2].children[1].text | "[What a customer says about you]" | NEW |
| school_news | en | /pages/home.body.children[2].children[2].text | "[Customer name]" | NEW |
| school_news | en | /pages/home.body.children[3].children[1].text | "[Your address and opening hours]" | NEW |
| school_news | ar | /pages/home.body.children[2].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| school_news | ar | /pages/home.body.children[2].children[2].text | "[اسم العميل]" | NEW |
| school_news | ar | /pages/home.body.children[3].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| school_news | tr | /pages/home.body.children[2].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| school_news | tr | /pages/home.body.children[2].children[2].text | "[Müşterinin adı]" | NEW |
| school_news | tr | /pages/home.body.children[3].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| school_brand | en | /pages/home.body.children[1].children[0].text | "[Number] customers" | NEW |
| school_brand | en | /pages/home.body.children[1].children[1].text | "[Number] years" | NEW |
| school_brand | en | /pages/home.body.children[1].children[2].text | "[Number] branches" | NEW |
| school_brand | en | /pages/home.body.children[2].children[0].children[2].text | "[Why customers choose you]" | NEW |
| school_brand | en | /pages/home.body.children[2].children[1].children[2].text | "[What you promise]" | NEW |
| school_brand | en | /pages/home.body.children[2].children[2].children[2].text | "[How to reach you]" | NEW |
| school_brand | en | /pages/home.body.children[4].children[1].text | "[Your address and opening hours]" | NEW |
| school_brand | ar | /pages/home.body.children[1].children[0].text | "[رقم] عميل" | NEW |
| school_brand | ar | /pages/home.body.children[1].children[1].text | "[رقم] سنة" | NEW |
| school_brand | ar | /pages/home.body.children[1].children[2].text | "[رقم] فرع" | NEW |
| school_brand | ar | /pages/home.body.children[2].children[0].children[2].text | "[لماذا يختارك العملاء]" | NEW |
| school_brand | ar | /pages/home.body.children[2].children[1].children[2].text | "[ما تعد به عملاءك]" | NEW |
| school_brand | ar | /pages/home.body.children[2].children[2].children[2].text | "[كيف يتواصلون معك]" | NEW |
| school_brand | ar | /pages/home.body.children[4].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| school_brand | tr | /pages/home.body.children[1].children[0].text | "[Sayı] müşteri" | NEW |
| school_brand | tr | /pages/home.body.children[1].children[1].text | "[Sayı] yıl" | NEW |
| school_brand | tr | /pages/home.body.children[1].children[2].text | "[Sayı] şube" | NEW |
| school_brand | tr | /pages/home.body.children[2].children[0].children[2].text | "[Müşteriler neden sizi seçiyor]" | NEW |
| school_brand | tr | /pages/home.body.children[2].children[1].children[2].text | "[Sözünüz]" | NEW |
| school_brand | tr | /pages/home.body.children[2].children[2].children[2].text | "[Size nasıl ulaşılır]" | NEW |
| school_brand | tr | /pages/home.body.children[4].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| university | en | /pages/home.body.children[3].children[1].text | "[Your address and opening hours]" | NEW |
| university | ar | /pages/home.body.children[3].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| university | tr | /pages/home.body.children[3].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| market_photo | en | /pages/home.body.children[1].children[0].children[1].text | "[This week's offer]" | NEW |
| market_photo | ar | /pages/home.body.children[1].children[0].children[1].text | "[عرض الأسبوع]" | NEW |
| market_photo | tr | /pages/home.body.children[1].children[0].children[1].text | "[Bu haftanın fırsatı]" | NEW |
| delivery_city | en | /pages/home.body.children[0].children[2].children[0].children[1].children[1].text | "[Street name]" | NEW |
| delivery_city | ar | /pages/home.body.children[0].children[2].children[0].children[1].children[1].text | "[اسم الشارع]" | NEW |
| delivery_city | tr | /pages/home.body.children[0].children[2].children[0].children[1].children[1].text | "[Sokak adı]" | NEW |
| brand | en | /pages/home.body.children[1].children[0].text | "[Number] customers" | NEW |
| brand | en | /pages/home.body.children[1].children[1].text | "[Number] years" | NEW |
| brand | en | /pages/home.body.children[1].children[2].text | "[Number] branches" | NEW |
| brand | en | /pages/home.body.children[2].children[0].children[2].text | "[Why customers choose you]" | NEW |
| brand | en | /pages/home.body.children[2].children[1].children[2].text | "[What you promise]" | NEW |
| brand | en | /pages/home.body.children[2].children[2].children[2].text | "[How to reach you]" | NEW |
| brand | en | /pages/home.body.children[3].children[1].text | "[What a customer says about you]" | NEW |
| brand | en | /pages/home.body.children[3].children[2].text | "[Customer name]" | NEW |
| brand | en | /pages/home.body.children[4].children[1].text | "[Your address and opening hours]" | NEW |
| brand | ar | /pages/home.body.children[1].children[0].text | "[رقم] عميل" | NEW |
| brand | ar | /pages/home.body.children[1].children[1].text | "[رقم] سنة" | NEW |
| brand | ar | /pages/home.body.children[1].children[2].text | "[رقم] فرع" | NEW |
| brand | ar | /pages/home.body.children[2].children[0].children[2].text | "[لماذا يختارك العملاء]" | NEW |
| brand | ar | /pages/home.body.children[2].children[1].children[2].text | "[ما تعد به عملاءك]" | NEW |
| brand | ar | /pages/home.body.children[2].children[2].children[2].text | "[كيف يتواصلون معك]" | NEW |
| brand | ar | /pages/home.body.children[3].children[1].text | "[رأي أحد العملاء فيك]" | NEW |
| brand | ar | /pages/home.body.children[3].children[2].text | "[اسم العميل]" | NEW |
| brand | ar | /pages/home.body.children[4].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| brand | tr | /pages/home.body.children[1].children[0].text | "[Sayı] müşteri" | NEW |
| brand | tr | /pages/home.body.children[1].children[1].text | "[Sayı] yıl" | NEW |
| brand | tr | /pages/home.body.children[1].children[2].text | "[Sayı] şube" | NEW |
| brand | tr | /pages/home.body.children[2].children[0].children[2].text | "[Müşteriler neden sizi seçiyor]" | NEW |
| brand | tr | /pages/home.body.children[2].children[1].children[2].text | "[Sözünüz]" | NEW |
| brand | tr | /pages/home.body.children[2].children[2].children[2].text | "[Size nasıl ulaşılır]" | NEW |
| brand | tr | /pages/home.body.children[3].children[1].text | "[Bir müşterinin sizin hakkınızdaki sözü]" | NEW |
| brand | tr | /pages/home.body.children[3].children[2].text | "[Müşterinin adı]" | NEW |
| brand | tr | /pages/home.body.children[4].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |
| contact | en | /pages/home.body.children[0].children[1].text | "[Your address and opening hours]" | NEW |
| contact | ar | /pages/home.body.children[0].children[1].text | "[العنوان ومواعيد العمل]" | NEW |
| contact | tr | /pages/home.body.children[0].children[1].text | "[Adresiniz ve çalışma saatleriniz]" | NEW |

### Edits in the default language (156)

| Template | Language | Element | Reason | Fix |
|---|---|---|---|---|
| demo_delivery | ar | /pages/home nppusu2d.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| demo_delivery | tr | /pages/home nppusu2d.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| demo_delivery | tr | /pages/home n7sr1ye9.text | shows "Şehrin her yerine,", not the owner's "Owner words home two" | 156 |
| demo_food | ar | /pages/home noazd9v6.text | shows "الليلة في صحارى جريل", not the owner's "Owner words home one" | 156 |
| demo_food | ar | /pages/restaurants nuoc0l6w.text | shows "الليلة في صحارى جريل", not the owner's "Owner words restaurants one" | 156 |
| demo_food | tr | /pages/home noazd9v6.text | shows "Bu akşam Sahara Grill'de", not the owner's "Owner words home one" | 156 |
| demo_food | tr | /pages/home njsr6esf.text | shows "Karışık\nızgara.", not the owner's "Owner words home two" | 156 |
| demo_food | tr | /pages/restaurants nuoc0l6w.text | shows "Bu akşam Sahara Grill'de", not the owner's "Owner words restaurants one" | 156 |
| demo_food | tr | /pages/restaurants nrev757o.text | shows "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP", not the owner's "Owner words restaurants two" | 156 |
| demo_marketplace | ar | /pages/home nzmd1z22.text | shows "ابحث عن منتجات ومتاجر", not the owner's "Owner words home one" | 156 |
| demo_marketplace | ar | /pages/shops ni8umqdi.title | shows "كل المتاجر في سلة واحدة", not the owner's "Owner words shops one" | 156 |
| demo_marketplace | ar | /pages/search nqm4l67n.text | shows "عرض الأسبوع", not the owner's "Owner words search one" | 156 |
| demo_marketplace | tr | /pages/home nzmd1z22.text | shows "Ürün ve dükkân arayın", not the owner's "Owner words home one" | 156 |
| demo_marketplace | tr | /pages/home nt7wbxv2.text | shows "Haftanın fırsatı", not the owner's "Owner words home two" | 156 |
| demo_marketplace | tr | /pages/shops ni8umqdi.title | shows "Tüm dükkânlar, tek sepet", not the owner's "Owner words shops one" | 156 |
| demo_marketplace | tr | /pages/shops nj4wwuq4.text | shows "Ücretsiz teslimat ve üyelere özel kampanyalar için kulübe katılın.", not the owner's "Owner words shops two" | 156 |
| demo_marketplace | tr | /pages/search nqm4l67n.text | shows "Haftanın fırsatı", not the owner's "Owner words search one" | 156 |
| demo_marketplace | tr | /pages/search n8uj1ne8.text | shows "%15", not the owner's "Owner words search two" | 156 |
| demo_rides | ar | /pages/home no2fmtf2.text | shows "اقتصادية", not the owner's "Owner words home one" | 156 |
| demo_rides | ar | /pages/rides nwbdonmt.text | shows "تصل إلى بيتك بأمان في كل رحلة", not the owner's "Owner words rides one" | 156 |
| demo_rides | tr | /pages/home no2fmtf2.text | shows "Ekonomi", not the owner's "Owner words home one" | 156 |
| demo_rides | tr | /pages/home nlmy7ix1.text | shows "başlangıç E£", not the owner's "Owner words home two" | 156 |
| demo_rides | tr | /pages/rides nwbdonmt.text | shows "Her yolculukta eve güvenle", not the owner's "Owner words rides one" | 156 |
| demo_rides | tr | /pages/rides ns15mcoc.text | shows "Yolculuklarınız, ücretleri ve fişleri.", not the owner's "Owner words rides two" | 156 |
| demo_taxi | ar | /pages/home n50kfdc7.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| demo_taxi | ar | /pages/rides ngocxbqc.text | shows "رحلاتك ليلًا ونهارًا", not the owner's "Owner words rides one" | 156 |
| demo_taxi | tr | /pages/home n50kfdc7.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| demo_taxi | tr | /pages/home nf54qesg.text | shows "Çağır", not the owner's "Owner words home two" | 156 |
| demo_taxi | tr | /pages/rides ngocxbqc.text | shows "Gece gündüz yolculuklarınız", not the owner's "Owner words rides one" | 156 |
| demo_taxi | tr | /pages/rides nu04mr2q.text | shows "Yolculuklarınız, ücretleri ve fişleri.", not the owner's "Owner words rides two" | 156 |
| demo_school | ar | /pages/home nk6eqtri.text | shows "Guard Shop · هذا الصباح", not the owner's "Owner words home one" | 156 |
| demo_school | ar | /pages/school n93qjl9e.text | shows "الأخبار والجدول والواجبات في مكان واحد.", not the owner's "Owner words school one" | 156 |
| demo_school | tr | /pages/home nk6eqtri.text | shows "Guard Shop · bu sabah", not the owner's "Owner words home one" | 156 |
| demo_school | tr | /pages/home nx9ruy1k.text | shows "Guard Shop ailesine hoş geldiniz", not the owner's "Owner words home two" | 156 |
| demo_school | tr | /pages/school n93qjl9e.text | shows "Haberler, ders programı ve ödevler tek yerde.", not the owner's "Owner words school one" | 156 |
| demo_instructors | ar | /pages/home nv22r5mx.text | shows "تعلّم ممن يمارسونها", not the owner's "Owner words home one" | 156 |
| demo_instructors | ar | /pages/teachers nfrtoqob.text | shows "تابع معلمًا لتعرف بدوراته الجديدة أولًا.", not the owner's "Owner words teachers one" | 156 |
| demo_instructors | ar | /pages/learning n4zbw8zn.text | shows "تابع من حيث توقفت.", not the owner's "Owner words learning one" | 156 |
| demo_instructors | tr | /pages/home nv22r5mx.text | shows "İşi yapanlardan öğrenin", not the owner's "Owner words home one" | 156 |
| demo_instructors | tr | /pages/home naqp1tti.text | shows "Gerçek öğretmenler.", not the owner's "Owner words home two" | 156 |
| demo_instructors | tr | /pages/teachers nfrtoqob.text | shows "Yeni kurslarından ilk siz haberdar olmak için bir öğretmeni takip edin.", not the owner's "Owner words teachers one" | 156 |
| demo_instructors | tr | /pages/learning n4zbw8zn.text | shows "Kaldığınız yerden devam edin.", not the owner's "Owner words learning one" | 156 |
| demo_travel | ar | /pages/home nyux06xl.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| demo_travel | tr | /pages/home nyux06xl.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| demo_travel | tr | /pages/home ndo86ff5.text | shows "Keşfet", not the owner's "Owner words home two" | 156 |
| food_signature_a | ar | /pages/home nzcvnn42.text | shows "الليلة في صحارى جريل", not the owner's "Owner words home one" | 156 |
| food_signature_a | ar | /pages/restaurants n94o0gdy.text | shows "الليلة في صحارى جريل", not the owner's "Owner words restaurants one" | 156 |
| food_signature_a | tr | /pages/home nzcvnn42.text | shows "Bu akşam Sahara Grill'de", not the owner's "Owner words home one" | 156 |
| food_signature_a | tr | /pages/home npwh4u8s.text | shows "Karışık\nızgara.", not the owner's "Owner words home two" | 156 |
| food_signature_a | tr | /pages/restaurants n94o0gdy.text | shows "Bu akşam Sahara Grill'de", not the owner's "Owner words restaurants one" | 156 |
| food_signature_a | tr | /pages/restaurants nisio26c.text | shows "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP", not the owner's "Owner words restaurants two" | 156 |
| food_signature_b | ar | /pages/home nvu64buo.text | shows "ماذا على العشاء؟", not the owner's "Owner words home one" | 156 |
| food_signature_b | ar | /pages/home n8v4ge9n entries[0].title | shows "مشويات", not the owner's "Owner entry home" | 156 |
| food_signature_b | ar | /pages/restaurants nrn9a9et entries[0].title | shows "مشويات", not the owner's "Owner entry restaurants" | 156 |
| food_signature_b | tr | /pages/home nvu64buo.text | shows "Akşam yemeğinde ne var?", not the owner's "Owner words home one" | 156 |
| food_signature_b | tr | /pages/home ni6j1s1q.text | shows "Koşari 55 EGP\nKarışık ızgara 240 EGP\nMargherita 140 EGP\nŞiş tavuk 150 EGP", not the owner's "Owner words home two" | 156 |
| food_signature_b | tr | /pages/home n8v4ge9n entries[0].title | shows "Izgara", not the owner's "Owner entry home" | 156 |
| food_signature_b | tr | /pages/restaurants nrn9a9et entries[0].title | shows "Izgara", not the owner's "Owner entry restaurants" | 156 |
| marketplace_signature_a | ar | /pages/home ngqq4su6.text | shows "ابحث عن منتجات ومتاجر", not the owner's "Owner words home one" | 156 |
| marketplace_signature_a | ar | /pages/shops n9sv9q3u.title | shows "كل المتاجر في سلة واحدة", not the owner's "Owner words shops one" | 156 |
| marketplace_signature_a | ar | /pages/search n720zjho.text | shows "عرض الأسبوع", not the owner's "Owner words search one" | 156 |
| marketplace_signature_a | tr | /pages/home ngqq4su6.text | shows "Ürün ve dükkân arayın", not the owner's "Owner words home one" | 156 |
| marketplace_signature_a | tr | /pages/home nzj3nbag.text | shows "Haftanın fırsatı", not the owner's "Owner words home two" | 156 |
| marketplace_signature_a | tr | /pages/shops n9sv9q3u.title | shows "Tüm dükkânlar, tek sepet", not the owner's "Owner words shops one" | 156 |
| marketplace_signature_a | tr | /pages/shops n3h27g7h.text | shows "Ücretsiz teslimat ve üyelere özel kampanyalar için kulübe katılın.", not the owner's "Owner words shops two" | 156 |
| marketplace_signature_a | tr | /pages/search n720zjho.text | shows "Haftanın fırsatı", not the owner's "Owner words search one" | 156 |
| marketplace_signature_a | tr | /pages/search n2ycrhfc.text | shows "%15", not the owner's "Owner words search two" | 156 |
| marketplace_signature_b | ar | /pages/home nj051hsm.text | shows "[متجرك · منطقتك]", not the owner's "Owner words home one" | 156 |
| marketplace_signature_b | ar | /pages/home n2sklwfc slides[0].heading | shows "فاكهة وخضار", not the owner's "Owner entry home" | 156 |
| marketplace_signature_b | ar | /pages/shops n31g5gq6.title | shows "كل المتاجر في سلة واحدة", not the owner's "Owner words shops one" | 156 |
| marketplace_signature_b | ar | /pages/search nhueqio6.text | shows "ابحث عن منتجات ومتاجر", not the owner's "Owner words search one" | 156 |
| marketplace_signature_b | ar | /pages/search nqd3zfp2 slides[0].heading | shows "فاكهة وخضار", not the owner's "Owner entry search" | 156 |
| marketplace_signature_b | tr | /pages/home nj051hsm.text | shows "[Mağazanız · bölgeniz]", not the owner's "Owner words home one" | 156 |
| marketplace_signature_b | tr | /pages/home nu9vyz4q.text | shows "Haftanın alışverişi,", not the owner's "Owner words home two" | 156 |
| marketplace_signature_b | tr | /pages/home n2sklwfc slides[0].heading | shows "Meyve ve sebze", not the owner's "Owner entry home" | 156 |
| marketplace_signature_b | tr | /pages/shops n31g5gq6.title | shows "Tüm dükkânlar, tek sepet", not the owner's "Owner words shops one" | 156 |
| marketplace_signature_b | tr | /pages/shops nj4nzjx5.text | shows "Ücretsiz teslimat ve üyelere özel kampanyalar için kulübe katılın.", not the owner's "Owner words shops two" | 156 |
| marketplace_signature_b | tr | /pages/search nhueqio6.text | shows "Ürün ve dükkân arayın", not the owner's "Owner words search one" | 156 |
| marketplace_signature_b | tr | /pages/search nqd3zfp2 slides[0].heading | shows "Meyve ve sebze", not the owner's "Owner entry search" | 156 |
| delivery_signature_a | ar | /pages/home ncek5ujm.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| delivery_signature_a | tr | /pages/home ncek5ujm.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| delivery_signature_a | tr | /pages/home n86l1ax7.text | shows "Şehrin her yerine,", not the owner's "Owner words home two" | 156 |
| delivery_signature_b | ar | /pages/home n2dje2ob.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| delivery_signature_b | tr | /pages/home n2dje2ob.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| delivery_signature_b | tr | /pages/home n9svfi91.text | shows "Kargo gönder", not the owner's "Owner words home two" | 156 |
| rides_signature_a | ar | /pages/home ne77lf80.text | shows "اقتصادية", not the owner's "Owner words home one" | 156 |
| rides_signature_a | ar | /pages/rides npxf4p79.text | shows "تصل إلى بيتك بأمان في كل رحلة", not the owner's "Owner words rides one" | 156 |
| rides_signature_a | tr | /pages/home ne77lf80.text | shows "Ekonomi", not the owner's "Owner words home one" | 156 |
| rides_signature_a | tr | /pages/home ntvhm9zm.text | shows "başlangıç E£", not the owner's "Owner words home two" | 156 |
| rides_signature_a | tr | /pages/rides npxf4p79.text | shows "Her yolculukta eve güvenle", not the owner's "Owner words rides one" | 156 |
| rides_signature_a | tr | /pages/rides nzbk4fzb.text | shows "Yolculuklarınız, ücretleri ve fişleri.", not the owner's "Owner words rides two" | 156 |
| rides_signature_b | ar | /pages/home n9nhbpru.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| rides_signature_b | ar | /pages/rides ntnbwecp.text | shows "تصل إلى بيتك بأمان في كل رحلة", not the owner's "Owner words rides one" | 156 |
| rides_signature_b | tr | /pages/home n9nhbpru.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| rides_signature_b | tr | /pages/home nnena9lp.text | shows "Nereye,\n{name}?", not the owner's "Owner words home two" | 156 |
| rides_signature_b | tr | /pages/rides ntnbwecp.text | shows "Her yolculukta eve güvenle", not the owner's "Owner words rides one" | 156 |
| rides_signature_b | tr | /pages/rides nagrx7dx.text | shows "Yolculuklarınız, ücretleri ve fişleri.", not the owner's "Owner words rides two" | 156 |
| taxi_signature_a | ar | /pages/home ntirdqwi.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| taxi_signature_a | ar | /pages/rides n5m02pb0.text | shows "رحلاتك ليلًا ونهارًا", not the owner's "Owner words rides one" | 156 |
| taxi_signature_a | tr | /pages/home ntirdqwi.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| taxi_signature_a | tr | /pages/home nkz52lgb.text | shows "Çağır", not the owner's "Owner words home two" | 156 |
| taxi_signature_a | tr | /pages/rides n5m02pb0.text | shows "Gece gündüz yolculuklarınız", not the owner's "Owner words rides one" | 156 |
| taxi_signature_a | tr | /pages/rides n9dphq60.text | shows "Yolculuklarınız, ücretleri ve fişleri.", not the owner's "Owner words rides two" | 156 |
| taxi_signature_b | ar | /pages/home ns7ja7ap.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| taxi_signature_b | ar | /pages/rides nwyj1gzq.text | shows "رحلاتك ليلًا ونهارًا", not the owner's "Owner words rides one" | 156 |
| taxi_signature_b | tr | /pages/home ns7ja7ap.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| taxi_signature_b | tr | /pages/home njeuqtzj.text | shows "Çevrenizde boş taksiler.", not the owner's "Owner words home two" | 156 |
| taxi_signature_b | tr | /pages/rides nwyj1gzq.text | shows "Gece gündüz yolculuklarınız", not the owner's "Owner words rides one" | 156 |
| taxi_signature_b | tr | /pages/rides nt4uo4hn.text | shows "Yolculuklarınız, ücretleri ve fişleri.", not the owner's "Owner words rides two" | 156 |
| travel_signature_a | ar | /pages/home n8hh8pgp.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| travel_signature_a | tr | /pages/home n8hh8pgp.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| travel_signature_a | tr | /pages/home n6d77hsi.text | shows "Keşfet", not the owner's "Owner words home two" | 156 |
| travel_signature_b | ar | /pages/home nvpk8put.text | shows "إلى أين بعد ذلك؟", not the owner's "Owner words home one" | 156 |
| travel_signature_b | ar | /pages/home nx08j8gh entries[0].title | shows "[إحدى إقاماتك]", not the owner's "Owner entry home" | 156 |
| travel_signature_b | tr | /pages/home nvpk8put.text | shows "Sırada neresi var?", not the owner's "Owner words home one" | 156 |
| travel_signature_b | tr | /pages/home na3bmoi2.text | shows "Konaklama + uçuş, tek fiyat", not the owner's "Owner words home two" | 156 |
| travel_signature_b | tr | /pages/home nx08j8gh entries[0].title | shows "[Bir konaklamanız]", not the owner's "Owner entry home" | 156 |
| school_signature_a | ar | /pages/home n8bltq30.text | shows "Guard Shop · هذا الصباح", not the owner's "Owner words home one" | 156 |
| school_signature_a | ar | /pages/school n75lt069.text | shows "الأخبار والجدول والواجبات في مكان واحد.", not the owner's "Owner words school one" | 156 |
| school_signature_a | tr | /pages/home n8bltq30.text | shows "Guard Shop · bu sabah", not the owner's "Owner words home one" | 156 |
| school_signature_a | tr | /pages/home ndxpx9b2.text | shows "Guard Shop ailesine hoş geldiniz", not the owner's "Owner words home two" | 156 |
| school_signature_a | tr | /pages/school n75lt069.text | shows "Haberler, ders programı ve ödevler tek yerde.", not the owner's "Owner words school one" | 156 |
| school_signature_b | ar | /pages/home nfnvnrbj.text | shows "مرحبًا بكم في Guard Shop", not the owner's "Owner words home one" | 156 |
| school_signature_b | ar | /pages/school n5ldju6t.text | shows "الأخبار والجدول والواجبات في مكان واحد.", not the owner's "Owner words school one" | 156 |
| school_signature_b | tr | /pages/home nfnvnrbj.text | shows "Guard Shop ailesine hoş geldiniz", not the owner's "Owner words home one" | 156 |
| school_signature_b | tr | /pages/home nwqaj3dq.text | shows "Okul servisi", not the owner's "Owner words home two" | 156 |
| school_signature_b | tr | /pages/school n5ldju6t.text | shows "Haberler, ders programı ve ödevler tek yerde.", not the owner's "Owner words school one" | 156 |
| instructors_signature_a | ar | /pages/home nys07y9z.text | shows "تعلّم ممن يمارسونها", not the owner's "Owner words home one" | 156 |
| instructors_signature_a | ar | /pages/teachers n9ppsnvs.text | shows "تابع معلمًا لتعرف بدوراته الجديدة أولًا.", not the owner's "Owner words teachers one" | 156 |
| instructors_signature_a | ar | /pages/learning n0fooosn.text | shows "تابع من حيث توقفت.", not the owner's "Owner words learning one" | 156 |
| instructors_signature_a | tr | /pages/home nys07y9z.text | shows "İşi yapanlardan öğrenin", not the owner's "Owner words home one" | 156 |
| instructors_signature_a | tr | /pages/home nm27nm4q.text | shows "Gerçek öğretmenler.", not the owner's "Owner words home two" | 156 |
| instructors_signature_a | tr | /pages/teachers n9ppsnvs.text | shows "Yeni kurslarından ilk siz haberdar olmak için bir öğretmeni takip edin.", not the owner's "Owner words teachers one" | 156 |
| instructors_signature_a | tr | /pages/learning n0fooosn.text | shows "Kaldığınız yerden devam edin.", not the owner's "Owner words learning one" | 156 |
| instructors_signature_b | ar | /pages/home nxhjiws1.text | shows "س ن", not the owner's "Owner words home one" | 156 |
| instructors_signature_b | ar | /pages/home nffbicze slides[0].heading | shows "هانا كلارك", not the owner's "Owner entry home" | 156 |
| instructors_signature_b | ar | /pages/teachers n55om8fx.text | shows "تابع معلمًا لتعرف بدوراته الجديدة أولًا.", not the owner's "Owner words teachers one" | 156 |
| instructors_signature_b | ar | /pages/learning nq9xlrez.text | shows "تابع من حيث توقفت.", not the owner's "Owner words learning one" | 156 |
| instructors_signature_b | tr | /pages/home nxhjiws1.text | shows "SN", not the owner's "Owner words home one" | 156 |
| instructors_signature_b | tr | /pages/home nvd1qrwn.text | shows "Salma Nasser", not the owner's "Owner words home two" | 156 |
| instructors_signature_b | tr | /pages/home nffbicze slides[0].heading | shows "Hannah Clarke", not the owner's "Owner entry home" | 156 |
| instructors_signature_b | tr | /pages/teachers n55om8fx.text | shows "Yeni kurslarından ilk siz haberdar olmak için bir öğretmeni takip edin.", not the owner's "Owner words teachers one" | 156 |
| instructors_signature_b | tr | /pages/learning nq9xlrez.text | shows "Kaldığınız yerden devam edin.", not the owner's "Owner words learning one" | 156 |
| premium_academy_signature_a | ar | /pages/home nsr43bbq.text | shows "تعلّم من الأفضل، في الوقت الذي يناسبك", not the owner's "Owner words home one" | 156 |
| premium_academy_signature_a | tr | /pages/home nsr43bbq.text | shows "En iyilerden, kendi hızında öğren", not the owner's "Owner words home one" | 156 |
| premium_academy_signature_a | tr | /pages/home nx2tpnmy.text | shows "Kurslara göz at", not the owner's "Owner words home two" | 156 |
| premium_academy_signature_b | ar | /pages/home ni9ml2da.text | shows "تعلّم من الأفضل، في الوقت الذي يناسبك", not the owner's "Owner words home one" | 156 |
| premium_academy_signature_b | tr | /pages/home ni9ml2da.text | shows "En iyilerden, kendi hızında öğren", not the owner's "Owner words home one" | 156 |
| premium_academy_signature_b | tr | /pages/home nqcengq4.text | shows "Kurslara göz at", not the owner's "Owner words home two" | 156 |
| flowers_signature_a | ar | /pages/home n3iz2dyv.text | shows "للحب", not the owner's "Owner words home one" | 156 |
| flowers_signature_a | ar | /pages/home nhtcwlg0 slides[0].heading | shows "حب", not the owner's "Owner entry home" | 156 |
| flowers_signature_a | ar | /pages/shop nrd6dm8b.text | shows "اعثر على الزهور المناسبة", not the owner's "Owner words shop one" | 156 |
| flowers_signature_a | ar | /pages/shop n3dlq6wa slides[0].heading | shows "حب", not the owner's "Owner entry shop" | 156 |
| flowers_signature_a | ar | /pages/cart nb5dw9ln.text | shows "اختر يوم التوصيل واكتب البطاقة عند إتمام الطلب.", not the owner's "Owner words cart one" | 156 |
| flowers_signature_a | ar | /pages/orders nhd2x10z.text | shows "رحلة زهورك إليهم", not the owner's "Owner words orders one" | 156 |
| flowers_signature_a | ar | /pages/orders nvlfevz8 entries[0].title | shows "تم الطلب", not the owner's "Owner entry orders" | 156 |
| flowers_signature_a | ar | /pages/bouquet ncmxhz9d.text | shows "الباقة المميّزة", not the owner's "Owner words bouquet one" | 156 |
| flowers_signature_a | ar | /pages/wishlist nr8qutzf.title | shows "شاهدتها مؤخرًا", not the owner's "Owner words wishlist one" | 156 |
| flowers_signature_a | tr | /pages/home n3iz2dyv.text | shows "Aşk için", not the owner's "Owner words home one" | 156 |
| flowers_signature_a | tr | /pages/home n40ngprd.text | shows "Güllerle söyleyin.", not the owner's "Owner words home two" | 156 |
| flowers_signature_a | tr | /pages/home nhtcwlg0 slides[0].heading | shows "Aşk", not the owner's "Owner entry home" | 156 |
| flowers_signature_a | tr | /pages/shop nrd6dm8b.text | shows "Doğru çiçekleri bulun", not the owner's "Owner words shop one" | 156 |
| flowers_signature_a | tr | /pages/shop nws6nymc.text | shows "Vesileye, renge, koleksiyona göre.", not the owner's "Owner words shop two" | 156 |
| flowers_signature_a | tr | /pages/shop n3dlq6wa slides[0].heading | shows "Aşk", not the owner's "Owner entry shop" | 156 |
| flowers_signature_a | tr | /pages/cart nb5dw9ln.text | shows "Teslimat gününü seçin ve kartı ödemede yazın.", not the owner's "Owner words cart one" | 156 |
| flowers_signature_a | tr | /pages/orders nhd2x10z.text | shows "Çiçekleriniz nasıl yol alır", not the owner's "Owner words orders one" | 156 |
| flowers_signature_a | tr | /pages/orders nvlfevz8 entries[0].title | shows "Sipariş alındı", not the owner's "Owner entry orders" | 156 |
| flowers_signature_a | tr | /pages/bouquet ncmxhz9d.text | shows "İmza buket", not the owner's "Owner words bouquet one" | 156 |
| flowers_signature_a | tr | /pages/bouquet n30k14z8.text | shows "[İmza buketiniz]", not the owner's "Owner words bouquet two" | 156 |
| flowers_signature_a | tr | /pages/wishlist nr8qutzf.title | shows "Son baktıklarınız", not the owner's "Owner words wishlist one" | 156 |
| flowers_signature_a | tr | /pages/wishlist narayh98.text | shows "Sizin için seçtik", not the owner's "Owner words wishlist two" | 156 |
| flowers_signature_b | ar | /pages/home nna6au7e.text | shows "لمن هذه الزهور؟", not the owner's "Owner words home one" | 156 |
| flowers_signature_b | ar | /pages/home n0ivcom5 entries[0].title | shows "[اسم العميل]", not the owner's "Owner entry home" | 156 |
| flowers_signature_b | ar | /pages/shop ntx8jnz1.text | shows "اعثر على الزهور المناسبة", not the owner's "Owner words shop one" | 156 |
| flowers_signature_b | ar | /pages/shop n6crg642 slides[0].heading | shows "حب", not the owner's "Owner entry shop" | 156 |
| flowers_signature_b | ar | /pages/cart nhpd6n3l.text | shows "اختر يوم التوصيل واكتب البطاقة عند إتمام الطلب.", not the owner's "Owner words cart one" | 156 |
| flowers_signature_b | ar | /pages/orders ndm23scg.text | shows "رحلة زهورك إليهم", not the owner's "Owner words orders one" | 156 |
| flowers_signature_b | ar | /pages/orders ng78gvpo entries[0].title | shows "تم الطلب", not the owner's "Owner entry orders" | 156 |
| flowers_signature_b | ar | /pages/bouquet nc057b71.text | shows "الباقة المميّزة", not the owner's "Owner words bouquet one" | 156 |
| flowers_signature_b | ar | /pages/wishlist nuz5eqdu.title | shows "شاهدتها مؤخرًا", not the owner's "Owner words wishlist one" | 156 |
| flowers_signature_b | tr | /pages/home nna6au7e.text | shows "Çiçekler kime?", not the owner's "Owner words home one" | 156 |
| flowers_signature_b | tr | /pages/home njb8xkcl.text | shows "Aşk", not the owner's "Owner words home two" | 156 |
| flowers_signature_b | tr | /pages/home n0ivcom5 entries[0].title | shows "[Müşterinin adı]", not the owner's "Owner entry home" | 156 |
| flowers_signature_b | tr | /pages/shop ntx8jnz1.text | shows "Doğru çiçekleri bulun", not the owner's "Owner words shop one" | 156 |
| flowers_signature_b | tr | /pages/shop n489tatt.text | shows "Vesileye, renge, koleksiyona göre.", not the owner's "Owner words shop two" | 156 |
| flowers_signature_b | tr | /pages/shop n6crg642 slides[0].heading | shows "Aşk", not the owner's "Owner entry shop" | 156 |
| flowers_signature_b | tr | /pages/cart nhpd6n3l.text | shows "Teslimat gününü seçin ve kartı ödemede yazın.", not the owner's "Owner words cart one" | 156 |
| flowers_signature_b | tr | /pages/orders ndm23scg.text | shows "Çiçekleriniz nasıl yol alır", not the owner's "Owner words orders one" | 156 |
| flowers_signature_b | tr | /pages/orders ng78gvpo entries[0].title | shows "Sipariş alındı", not the owner's "Owner entry orders" | 156 |
| flowers_signature_b | tr | /pages/bouquet nc057b71.text | shows "İmza buket", not the owner's "Owner words bouquet one" | 156 |
| flowers_signature_b | tr | /pages/bouquet nimtqfwb.text | shows "[İmza buketiniz]", not the owner's "Owner words bouquet two" | 156 |
| flowers_signature_b | tr | /pages/wishlist nuz5eqdu.title | shows "Son baktıklarınız", not the owner's "Owner words wishlist one" | 156 |
| flowers_signature_b | tr | /pages/wishlist ngoj7izq.text | shows "Sizin için seçtik", not the owner's "Owner words wishlist two" | 156 |
| shop | ar | /pages/home ng7w51ng.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| shop | tr | /pages/home ng7w51ng.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| shop | tr | /pages/home ne6p8br3.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| shop_deals | ar | /pages/home np2xmgb5.text | shows "توصيل مجاني في عطلة نهاية هذا الأسبوع", not the owner's "Owner words home one" | 156 |
| shop_deals | tr | /pages/home np2xmgb5.text | shows "Bu hafta sonu ücretsiz teslimat", not the owner's "Owner words home one" | 156 |
| shop_deals | tr | /pages/home nlrp4rhh.text | shows "Tüm siparişlerde, kapınıza kadar.", not the owner's "Owner words home two" | 156 |
| shop_looks | ar | /pages/home noxf7t3s.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| shop_looks | tr | /pages/home noxf7t3s.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| shop_looks | tr | /pages/home njm40tu5.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| menu | ar | /pages/home nodu9qyz.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| menu | tr | /pages/home nodu9qyz.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| menu | tr | /pages/home n5fukubh.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| travel | ar | /pages/home nqj4v15s.text | shows "من أين تبدأ حكايتك القادمة؟", not the owner's "Owner words home one" | 156 |
| travel | tr | /pages/home nqj4v15s.text | shows "Bir sonraki hikâye nerede başlıyor?", not the owner's "Owner words home one" | 156 |
| travel | tr | /pages/home nc9k7f8f.text | shows "Konaklama, uçuş ya da ikisi tek seyahatte, tek fiyata. Seyahatiniz ve biniş kartınız uygulamada.", not the owner's "Owner words home two" | 156 |
| academy_premium | ar | /pages/home nmgog70e.text | shows "تعلّم من الأفضل، في الوقت الذي يناسبك", not the owner's "Owner words home one" | 156 |
| academy_premium | tr | /pages/home nmgog70e.text | shows "En iyilerden, kendi hızında öğren", not the owner's "Owner words home one" | 156 |
| academy_premium | tr | /pages/home nrox8rmu.text | shows "Kurslara göz at", not the owner's "Owner words home two" | 156 |
| courses | ar | /pages/home n3mg6ywi.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| courses | tr | /pages/home n3mg6ywi.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| courses | tr | /pages/home ng514k9k.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| services | ar | /pages/home n86l10d0.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| services | tr | /pages/home n86l10d0.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| services | tr | /pages/home nie8fc2x.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| listings | ar | /pages/home nwgps7l4.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| listings | tr | /pages/home nwgps7l4.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| listings | tr | /pages/home ngfs0fbz.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| news | ar | /pages/home nwlfjiyk.text | shows "الأكثر طلبًا", not the owner's "Owner words home one" | 156 |
| news | tr | /pages/home nwlfjiyk.text | shows "En çok tercih edilenler", not the owner's "Owner words home one" | 156 |
| events | ar | /pages/home ndcp15lj.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| events | tr | /pages/home ndcp15lj.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| events | tr | /pages/home nulph41t.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| charity | ar | /pages/home n3jb8njy.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| charity | tr | /pages/home n3jb8njy.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| charity | tr | /pages/home nktlke01.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| delivery | ar | /pages/home nb1huero.text | shows "أرسل شحنتك مع Guard Shop", not the owner's "Owner words home one" | 156 |
| delivery | tr | /pages/home nb1huero.text | shows "Guard Shop ile kargo gönderin", not the owner's "Owner words home one" | 156 |
| delivery | tr | /pages/home n4bdidws.text | shows "Kapınızdan alıp kapıya teslim ediyoruz. Yolda takip edin.", not the owner's "Owner words home two" | 156 |
| food | ar | /pages/home n06ddxfc.text | shows "جائع؟ اطلب من المطاعم القريبة منك", not the owner's "Owner words home one" | 156 |
| food | tr | /pages/home n06ddxfc.text | shows "Acıktınız mı? Yakınınızdaki restoranlardan sipariş verin", not the owner's "Owner words home one" | 156 |
| food | tr | /pages/home nyimcvpg.text | shows "Bir restoran seçin, yemeklerinizi seçin ve siparişinizi kapıya kadar takip edin.", not the owner's "Owner words home two" | 156 |
| food_offers | ar | /pages/home ns0kk3dy.text | shows "عرض الأسبوع", not the owner's "Owner words home one" | 156 |
| food_offers | tr | /pages/home ns0kk3dy.text | shows "Haftanın fırsatı", not the owner's "Owner words home one" | 156 |
| food_offers | tr | /pages/home nrk7qdu0.text | shows "[Fırsatınızı buraya yazın]", not the owner's "Owner words home two" | 156 |
| food_brand | ar | /pages/home nvzg1apk.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| food_brand | tr | /pages/home nvzg1apk.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| food_brand | tr | /pages/home n4m578vz.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| food_photo | ar | /pages/home nflsjc0k.text | shows "التوصيل إلى", not the owner's "Owner words home one" | 156 |
| food_photo | tr | /pages/home nflsjc0k.text | shows "Teslimat adresi", not the owner's "Owner words home one" | 156 |
| food_photo | tr | /pages/home nuwydwjq.text | shows "[Bölgeniz]", not the owner's "Owner words home two" | 156 |
| ride | ar | /pages/home n5g5c4zs.text | shows "إلى أين؟ Guard Shop يوصلك", not the owner's "Owner words home one" | 156 |
| ride | tr | /pages/home n5g5c4zs.text | shows "Nereye? Guard Shop sizi götürsün", not the owner's "Owner words home one" | 156 |
| ride | tr | /pages/home nvbd7kw8.text | shows "Alış ve bırakış noktasını belirleyin, ücreti önce görün ve sürücünüzü yolda takip edin.", not the owner's "Owner words home two" | 156 |
| ride_offers | ar | /pages/home nik1c0mt.text | shows "عرض الأسبوع", not the owner's "Owner words home one" | 156 |
| ride_offers | tr | /pages/home nik1c0mt.text | shows "Haftanın fırsatı", not the owner's "Owner words home one" | 156 |
| ride_offers | tr | /pages/home nz4zdvbj.text | shows "[Fırsatınızı buraya yazın]", not the owner's "Owner words home two" | 156 |
| ride_brand | ar | /pages/home nuem0e5e.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| ride_brand | tr | /pages/home nuem0e5e.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| ride_brand | tr | /pages/home nxugyfrz.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| teachers | ar | /pages/home n4u54l7i.text | shows "تعلّم مع معلمي Guard Shop", not the owner's "Owner words home one" | 156 |
| teachers | tr | /pages/home n4u54l7i.text | shows "Guard Shop eğitmenleriyle öğrenin", not the owner's "Owner words home one" | 156 |
| teachers | tr | /pages/home nys6l4u9.text | shows "Konunuz için bir eğitmen bulun, kurslarını ve öğrenci yorumlarını görün, yenileri için takip edin.", not the owner's "Owner words home two" | 156 |
| teachers_offers | ar | /pages/home niev085r.text | shows "عرض الأسبوع", not the owner's "Owner words home one" | 156 |
| teachers_offers | tr | /pages/home niev085r.text | shows "Haftanın fırsatı", not the owner's "Owner words home one" | 156 |
| teachers_offers | tr | /pages/home nj8g8zks.text | shows "[Fırsatınızı buraya yazın]", not the owner's "Owner words home two" | 156 |
| teachers_brand | ar | /pages/home nzc3lkvn.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| teachers_brand | tr | /pages/home nzc3lkvn.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| teachers_brand | tr | /pages/home ns2o9fbp.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| teachers_photo | ar | /pages/home n2rjiy6u.text | shows "تعلّم ممن يمارسونها", not the owner's "Owner words home one" | 156 |
| teachers_photo | tr | /pages/home n2rjiy6u.text | shows "İşi yapanlardan öğrenin", not the owner's "Owner words home one" | 156 |
| teachers_photo | tr | /pages/home nib5la45.text | shows "Gerçek öğretmenler.\nGerçek beceriler.", not the owner's "Owner words home two" | 156 |
| school | ar | /pages/home nv15nzb9.text | shows "يومك الدراسي في Guard Shop", not the owner's "Owner words home one" | 156 |
| school | tr | /pages/home nv15nzb9.text | shows "Guard Shop ile okul gününüz", not the owner's "Owner words home one" | 156 |
| school | tr | /pages/home nicxa35j.text | shows "Ders programı, ödevler, notlar ve devam durumu; öğrenciler ve velileri için.", not the owner's "Owner words home two" | 156 |
| school_news | ar | /pages/home n0op87mk.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| school_news | tr | /pages/home n0op87mk.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| school_news | tr | /pages/home nv5mwkjb.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| school_brand | ar | /pages/home nx3y0oyn.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| school_brand | tr | /pages/home nx3y0oyn.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| school_brand | tr | /pages/home nejyypig.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| school_today | ar | /pages/home nvbzylkd.text | shows "مرحبًا بكم في Guard Shop", not the owner's "Owner words home one" | 156 |
| school_today | tr | /pages/home nvbzylkd.text | shows "Guard Shop ailesine hoş geldiniz", not the owner's "Owner words home one" | 156 |
| school_today | tr | /pages/home nxe49g3d.text | shows "Bu hafta okulda", not the owner's "Owner words home two" | 156 |
| university | ar | /pages/home nzujz5s5.text | shows "حياتك الجامعية في Guard Shop", not the owner's "Owner words home one" | 156 |
| university | tr | /pages/home nzujz5s5.text | shows "Guard Shop ile üniversite hayatınız", not the owner's "Owner words home one" | 156 |
| university | tr | /pages/home nxxyt7uc.text | shows "Ders programınız, dersleriniz, notlarınız ve devam durumunuz; fakültenizden haberlerle.", not the owner's "Owner words home two" | 156 |
| market | ar | /pages/home n2qqvz9h.text | shows "ابحث في المطاعم والسوبرماركت والمتاجر", not the owner's "Owner words home one" | 156 |
| market | tr | /pages/home n2qqvz9h.text | shows "Restoran, market ve mağaza arayın", not the owner's "Owner words home one" | 156 |
| market | tr | /pages/home nlbqo8qb.title | shows "Canınız ne istiyor?", not the owner's "Owner words home two" | 156 |
| market_offers | ar | /pages/home nypslqwr.text | shows "ابحث في المطاعم والسوبرماركت والمتاجر", not the owner's "Owner words home one" | 156 |
| market_offers | tr | /pages/home nypslqwr.text | shows "Restoran, market ve mağaza arayın", not the owner's "Owner words home one" | 156 |
| market_offers | tr | /pages/home ny4rhi58.text | shows "Yakınınızdaki yerlerden", not the owner's "Owner words home two" | 156 |
| market_grocery | ar | /pages/home noo2h3rs.text | shows "ابحث في المطاعم والسوبرماركت والمتاجر", not the owner's "Owner words home one" | 156 |
| market_grocery | tr | /pages/home noo2h3rs.text | shows "Restoran, market ve mağaza arayın", not the owner's "Owner words home one" | 156 |
| market_grocery | tr | /pages/home nrhc06jn.title | shows "Canınız ne istiyor?", not the owner's "Owner words home two" | 156 |
| market_photo | ar | /pages/home nsvclyut.text | shows "ابحث عن منتجات ومتاجر", not the owner's "Owner words home one" | 156 |
| market_photo | tr | /pages/home nsvclyut.text | shows "Ürün ve dükkân arayın", not the owner's "Owner words home one" | 156 |
| market_photo | tr | /pages/home nonaqmba.text | shows "Bu hafta", not the owner's "Owner words home two" | 156 |
| delivery_city | ar | /pages/home nvqjmrtr.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| delivery_city | tr | /pages/home nvqjmrtr.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| delivery_city | tr | /pages/home nc1r00va.text | shows "Her şey, şehrin\nher yerine. Bugün.", not the owner's "Owner words home two" | 156 |
| ride_night | ar | /pages/home naq5lfou.text | shows "إلى أين\nالليلة؟", not the owner's "Owner words home one" | 156 |
| ride_night | tr | /pages/home naq5lfou.text | shows "Bu gece\nnereye?", not the owner's "Owner words home one" | 156 |
| ride_night | tr | /pages/home nnt712na.text | shows "Bir yer arayın", not the owner's "Owner words home two" | 156 |
| taxi_map | ar | /pages/home nfk2wg3o.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| taxi_map | tr | /pages/home nfk2wg3o.text | shows "Guard Shop", not the owner's "Owner words home one" | 156 |
| taxi_map | tr | /pages/home nktel0kj.text | shows "Bir bakışta taksi.", not the owner's "Owner words home two" | 156 |
| brand | ar | /pages/home n82zycyl.text | shows "مرحبًا بك في Guard Shop", not the owner's "Owner words home one" | 156 |
| brand | tr | /pages/home n82zycyl.text | shows "Guard Shop'e hoş geldiniz", not the owner's "Owner words home one" | 156 |
| brand | tr | /pages/home n2qfo13e.text | shows "İhtiyacınız olan her şey bir dokunuş uzağınızda.", not the owner's "Owner words home two" | 156 |
| contact | ar | /pages/home nb607o04.text | shows "موقعنا", not the owner's "Owner words home one" | 156 |
| contact | tr | /pages/home nb607o04.text | shows "Bize ulaşın", not the owner's "Owner words home one" | 156 |
| contact | tr | /pages/home nqql4r7h.text | shows "[Adresiniz ve çalışma saatleriniz]", not the owner's "Owner words home two" | 156 |

### Prices (161)

| Template | Language | Element | Reason | Fix |
|---|---|---|---|---|
| demo_delivery | en | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#nuvdapcc/text#ntmah3fe.text | a price written as text, "+EGP 0" | 161 / NEW |
| demo_delivery | en | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#np96ixhc/text#nkts0r66.text | a price written as text, "+EGP 45" | 161 / NEW |
| demo_delivery | en | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#nyxcha0i/text#n4htmdvh.text | a price written as text, "+EGP 15" | 161 / NEW |
| demo_delivery | en | /pages/home column#ntt43eng/column#nsy93qhe/button#nf7uytg3.text | a price written as text, "Send a parcel · from EGP 40" | 161 / NEW |
| demo_delivery | ar | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#nuvdapcc/text#ntmah3fe.text | a price written as text, "+0 ج.م" | 161 / NEW |
| demo_delivery | ar | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#np96ixhc/text#nkts0r66.text | a price written as text, "+45 ج.م" | 161 / NEW |
| demo_delivery | ar | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#nyxcha0i/text#n4htmdvh.text | a price written as text, "+15 ج.م" | 161 / NEW |
| demo_delivery | ar | /pages/home column#ntt43eng/column#nsy93qhe/button#nf7uytg3.text | a price written as text, "أرسل طردًا · من 40 ج.م" | 161 / NEW |
| demo_delivery | tr | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#nuvdapcc/text#ntmah3fe.text | a price written as text, "+0 EGP" | 161 / NEW |
| demo_delivery | tr | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#np96ixhc/text#nkts0r66.text | a price written as text, "+45 EGP" | 161 / NEW |
| demo_delivery | tr | /pages/home column#ntt43eng/column#nsy93qhe/row#nxwazokh/column#nyxcha0i/text#n4htmdvh.text | a price written as text, "+15 EGP" | 161 / NEW |
| demo_delivery | tr | /pages/home column#ntt43eng/column#nsy93qhe/button#nf7uytg3.text | a price written as text, "Paket gönder · 40 EGP'den" | 161 / NEW |
| demo_food | en | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#ng3vqfzi/text#njr7tufk.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" | 161 / NEW |
| demo_food | en | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#nam07jyk/text#nfnayfch.text | a price written as text, "Tomato, mozzarella and basil · EGP 140" | 161 / NEW |
| demo_food | en | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#nxkbyglx/text#njdnflbd.text | a price written as text, "Rice, lentils, pasta and crispy onions · EGP 55" | 161 / NEW |
| demo_food | en | /pages/home column#n6dz57z6/row#nfemrk36/text#nlijk7ah.text | a price written as text, "Delivery EGP 25" | 161 / NEW |
| demo_food | en | /pages/home column#n6dz57z6/column#n3mla5jg/row#njb2j7l3/text#nfoecgqq.text | a price written as text, "EGP 140" | 161 / NEW |
| demo_food | en | /pages/home column#n6dz57z6/column#n3mla5jg/row#nnvdj6uz/text#n1d3gl0t.text | a price written as text, "EGP 150" | 161 / NEW |
| demo_food | en | /pages/restaurants column#n89da83r/photo_hero#nabuup66/text#n8tzw1cg.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" | 161 / NEW |
| demo_food | ar | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#ng3vqfzi/text#njr7tufk.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" | 161 / NEW |
| demo_food | ar | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#nam07jyk/text#nfnayfch.text | a price written as text, "طماطم وموتزاريلا وريحان · 140 ج.م" | 161 / NEW |
| demo_food | ar | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#nxkbyglx/text#njdnflbd.text | a price written as text, "أرز وعدس ومكرونة وبصل مقرمش · 55 ج.م" | 161 / NEW |
| demo_food | ar | /pages/home column#n6dz57z6/row#nfemrk36/text#nlijk7ah.text | a price written as text, "التوصيل 25 ج.م" | 161 / NEW |
| demo_food | ar | /pages/home column#n6dz57z6/column#n3mla5jg/row#njb2j7l3/text#nfoecgqq.text | a price written as text, "140 ج.م" | 161 / NEW |
| demo_food | ar | /pages/home column#n6dz57z6/column#n3mla5jg/row#nnvdj6uz/text#n1d3gl0t.text | a price written as text, "150 ج.م" | 161 / NEW |
| demo_food | ar | /pages/restaurants column#n89da83r/photo_hero#nabuup66/text#n8tzw1cg.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" | 161 / NEW |
| demo_food | tr | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#ng3vqfzi/text#njr7tufk.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" | 161 / NEW |
| demo_food | tr | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#nam07jyk/text#nfnayfch.text | a price written as text, "Domates, mozzarella ve fesleğen · 140 EGP" | 161 / NEW |
| demo_food | tr | /pages/home column#n6dz57z6/stack#nex062vv/column#nuxxo6xa/stack#n12rgedh/slider#neljnyb8/photo_hero#nxkbyglx/text#njdnflbd.text | a price written as text, "Pirinç, mercimek, makarna ve çıtır soğan · 55 EGP" | 161 / NEW |
| demo_food | tr | /pages/home column#n6dz57z6/row#nfemrk36/text#nlijk7ah.text | a price written as text, "Teslimat 25 EGP" | 161 / NEW |
| demo_food | tr | /pages/home column#n6dz57z6/column#n3mla5jg/row#njb2j7l3/text#nfoecgqq.text | a price written as text, "140 EGP" | 161 / NEW |
| demo_food | tr | /pages/home column#n6dz57z6/column#n3mla5jg/row#nnvdj6uz/text#n1d3gl0t.text | a price written as text, "150 EGP" | 161 / NEW |
| demo_food | tr | /pages/restaurants column#n89da83r/photo_hero#nabuup66/text#n8tzw1cg.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" | 161 / NEW |
| demo_marketplace | en | /pages/home column#n1km545m/slider#npr21tw8/row#nh2fg43u/column#ndudmtu7/row#n740fjb6/text#npol6cqd.text | a price written as text, "over EGP 100" | 161 / NEW |
| demo_marketplace | en | /pages/home column#n1km545m/slider#npr21tw8/row#nbjg4wzo/column#nbp5a2z6/row#n5fdsykv/text#nverwv8t.text | a price written as text, "over EGP 200" | 161 / NEW |
| demo_marketplace | en | /pages/home column#n1km545m/slider#npr21tw8/row#n28ot33g/column#nvg9dxrq/text#n9r5btjr.text | a price written as text, "delivery over EGP 250" | 161 / NEW |
| demo_marketplace | en | /pages/search column#n98bbie6/slider#nof92upe/row#nk7cyjze/column#nsje7ycz/row#ndmfpeuo/text#ncd7m39l.text | a price written as text, "over EGP 100" | 161 / NEW |
| demo_marketplace | en | /pages/search column#n98bbie6/slider#nof92upe/row#noeabsq9/column#n4p9sbjs/row#nxhigk03/text#n1fat0zx.text | a price written as text, "over EGP 200" | 161 / NEW |
| demo_marketplace | en | /pages/search column#n98bbie6/slider#nof92upe/row#nl4i7die/column#n412yc9y/text#nl9tvrqb.text | a price written as text, "delivery over EGP 250" | 161 / NEW |
| demo_marketplace | ar | /pages/home column#n1km545m/slider#npr21tw8/row#nh2fg43u/column#ndudmtu7/row#n740fjb6/text#npol6cqd.text | a price written as text, "فوق 100 ج.م" | 161 / NEW |
| demo_marketplace | ar | /pages/home column#n1km545m/slider#npr21tw8/row#nbjg4wzo/column#nbp5a2z6/row#n5fdsykv/text#nverwv8t.text | a price written as text, "فوق 200 ج.م" | 161 / NEW |
| demo_marketplace | ar | /pages/home column#n1km545m/slider#npr21tw8/row#n28ot33g/column#nvg9dxrq/text#n9r5btjr.text | a price written as text, "توصيل فوق 250 ج.م" | 161 / NEW |
| demo_marketplace | ar | /pages/search column#n98bbie6/slider#nof92upe/row#nk7cyjze/column#nsje7ycz/row#ndmfpeuo/text#ncd7m39l.text | a price written as text, "فوق 100 ج.م" | 161 / NEW |
| demo_marketplace | ar | /pages/search column#n98bbie6/slider#nof92upe/row#noeabsq9/column#n4p9sbjs/row#nxhigk03/text#n1fat0zx.text | a price written as text, "فوق 200 ج.م" | 161 / NEW |
| demo_marketplace | ar | /pages/search column#n98bbie6/slider#nof92upe/row#nl4i7die/column#n412yc9y/text#nl9tvrqb.text | a price written as text, "توصيل فوق 250 ج.م" | 161 / NEW |
| demo_marketplace | tr | /pages/home column#n1km545m/slider#npr21tw8/row#nh2fg43u/column#ndudmtu7/row#n740fjb6/text#npol6cqd.text | a price written as text, "100 EGP üzeri" | 161 / NEW |
| demo_marketplace | tr | /pages/home column#n1km545m/slider#npr21tw8/row#nbjg4wzo/column#nbp5a2z6/row#n5fdsykv/text#nverwv8t.text | a price written as text, "200 EGP üzeri" | 161 / NEW |
| demo_marketplace | tr | /pages/home column#n1km545m/slider#npr21tw8/row#n28ot33g/column#nvg9dxrq/text#n9r5btjr.text | a price written as text, "teslimat 250 EGP üzeri" | 161 / NEW |
| demo_marketplace | tr | /pages/search column#n98bbie6/slider#nof92upe/row#nk7cyjze/column#nsje7ycz/row#ndmfpeuo/text#ncd7m39l.text | a price written as text, "100 EGP üzeri" | 161 / NEW |
| demo_marketplace | tr | /pages/search column#n98bbie6/slider#nof92upe/row#noeabsq9/column#n4p9sbjs/row#nxhigk03/text#n1fat0zx.text | a price written as text, "200 EGP üzeri" | 161 / NEW |
| demo_marketplace | tr | /pages/search column#n98bbie6/slider#nof92upe/row#nl4i7die/column#n412yc9y/text#nl9tvrqb.text | a price written as text, "teslimat 250 EGP üzeri" | 161 / NEW |
| demo_instructors | en | /pages/home column#nd3rgfj6/items#nhawut4v item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| demo_instructors | en | /pages/home column#nd3rgfj6/items#nhawut4v item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| demo_instructors | en | /pages/home column#nd3rgfj6/items#nhawut4v item 20 | priced only as "Free", with no amount and currency the app can convert | 161 |
| demo_instructors | en | /pages/home column#nd3rgfj6/items#nhawut4v item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| demo_instructors | en | /pages/home column#nd3rgfj6/items#nhawut4v item 33 | priced only as "₺645.00", with no amount and currency the app can convert | 161 |
| demo_instructors | en | /pages/home column#nd3rgfj6/items#nhawut4v item 40 | priced only as "₺1,590.00", with no amount and currency the app can convert | 161 |
| demo_instructors | ar | /pages/home column#nd3rgfj6/items#nhawut4v item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| demo_instructors | ar | /pages/home column#nd3rgfj6/items#nhawut4v item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| demo_instructors | ar | /pages/home column#nd3rgfj6/items#nhawut4v item 20 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| demo_instructors | ar | /pages/home column#nd3rgfj6/items#nhawut4v item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| demo_instructors | ar | /pages/home column#nd3rgfj6/items#nhawut4v item 33 | priced only as "₺645.00", with no amount and currency the app can convert | 161 |
| demo_instructors | ar | /pages/home column#nd3rgfj6/items#nhawut4v item 40 | priced only as "₺1,590.00", with no amount and currency the app can convert | 161 |
| demo_instructors | tr | /pages/home column#nd3rgfj6/items#nhawut4v item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| demo_instructors | tr | /pages/home column#nd3rgfj6/items#nhawut4v item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| demo_instructors | tr | /pages/home column#nd3rgfj6/items#nhawut4v item 20 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| demo_instructors | tr | /pages/home column#nd3rgfj6/items#nhawut4v item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| demo_instructors | tr | /pages/home column#nd3rgfj6/items#nhawut4v item 33 | priced only as "₺645.00", with no amount and currency the app can convert | 161 |
| demo_instructors | tr | /pages/home column#nd3rgfj6/items#nhawut4v item 40 | priced only as "₺1,590.00", with no amount and currency the app can convert | 161 |
| demo_travel | en | /pages/home column#ntloezg9/items#nl0jmywk item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| demo_travel | en | /pages/home column#ntloezg9/items#nl0jmywk item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| demo_travel | en | /pages/home column#ntloezg9/items#nl0jmywk item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| demo_travel | en | /pages/home column#ntloezg9/items#nl0jmywk item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| demo_travel | ar | /pages/home column#ntloezg9/items#nl0jmywk item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| demo_travel | ar | /pages/home column#ntloezg9/items#nl0jmywk item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| demo_travel | ar | /pages/home column#ntloezg9/items#nl0jmywk item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| demo_travel | ar | /pages/home column#ntloezg9/items#nl0jmywk item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| demo_travel | tr | /pages/home column#ntloezg9/items#nl0jmywk item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| demo_travel | tr | /pages/home column#ntloezg9/items#nl0jmywk item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| demo_travel | tr | /pages/home column#ntloezg9/items#nl0jmywk item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| demo_travel | tr | /pages/home column#ntloezg9/items#nl0jmywk item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| food_signature_a | en | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#n1kdgv8r/text#nbqwqptd.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" | 161 / NEW |
| food_signature_a | en | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#n5nsipr0/text#n54er531.text | a price written as text, "Tomato, mozzarella and basil · EGP 140" | 161 / NEW |
| food_signature_a | en | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#np5ym2d8/text#n48tvb9p.text | a price written as text, "Rice, lentils, pasta and crispy onions · EGP 55" | 161 / NEW |
| food_signature_a | en | /pages/home column#nfte44op/row#nxltpbpa/text#n7n5es4q.text | a price written as text, "Delivery EGP 25" | 161 / NEW |
| food_signature_a | en | /pages/home column#nfte44op/column#nowjl1j3/row#n21z9g1k/text#nxsihxpi.text | a price written as text, "EGP 140" | 161 / NEW |
| food_signature_a | en | /pages/home column#nfte44op/column#nowjl1j3/row#nv4rf2rq/text#nzmfvagl.text | a price written as text, "EGP 150" | 161 / NEW |
| food_signature_a | en | /pages/restaurants column#nu37lj97/photo_hero#n9grzn69/text#nfu2uax2.text | a price written as text, "Kofta, shish tawook and lamb chops · EGP 240" | 161 / NEW |
| food_signature_a | ar | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#n1kdgv8r/text#nbqwqptd.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" | 161 / NEW |
| food_signature_a | ar | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#n5nsipr0/text#n54er531.text | a price written as text, "طماطم وموتزاريلا وريحان · 140 ج.م" | 161 / NEW |
| food_signature_a | ar | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#np5ym2d8/text#n48tvb9p.text | a price written as text, "أرز وعدس ومكرونة وبصل مقرمش · 55 ج.م" | 161 / NEW |
| food_signature_a | ar | /pages/home column#nfte44op/row#nxltpbpa/text#n7n5es4q.text | a price written as text, "التوصيل 25 ج.م" | 161 / NEW |
| food_signature_a | ar | /pages/home column#nfte44op/column#nowjl1j3/row#n21z9g1k/text#nxsihxpi.text | a price written as text, "140 ج.م" | 161 / NEW |
| food_signature_a | ar | /pages/home column#nfte44op/column#nowjl1j3/row#nv4rf2rq/text#nzmfvagl.text | a price written as text, "150 ج.م" | 161 / NEW |
| food_signature_a | ar | /pages/restaurants column#nu37lj97/photo_hero#n9grzn69/text#nfu2uax2.text | a price written as text, "كفتة وشيش طاووق وريش ضاني · 240 ج.م" | 161 / NEW |
| food_signature_a | tr | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#n1kdgv8r/text#nbqwqptd.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" | 161 / NEW |
| food_signature_a | tr | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#n5nsipr0/text#n54er531.text | a price written as text, "Domates, mozzarella ve fesleğen · 140 EGP" | 161 / NEW |
| food_signature_a | tr | /pages/home column#nfte44op/stack#ngaj62tz/column#no1d3uxy/stack#nfw3wljt/slider#n5muqia1/photo_hero#np5ym2d8/text#n48tvb9p.text | a price written as text, "Pirinç, mercimek, makarna ve çıtır soğan · 55 EGP" | 161 / NEW |
| food_signature_a | tr | /pages/home column#nfte44op/row#nxltpbpa/text#n7n5es4q.text | a price written as text, "Teslimat 25 EGP" | 161 / NEW |
| food_signature_a | tr | /pages/home column#nfte44op/column#nowjl1j3/row#n21z9g1k/text#nxsihxpi.text | a price written as text, "140 EGP" | 161 / NEW |
| food_signature_a | tr | /pages/home column#nfte44op/column#nowjl1j3/row#nv4rf2rq/text#nzmfvagl.text | a price written as text, "150 EGP" | 161 / NEW |
| food_signature_a | tr | /pages/restaurants column#nu37lj97/photo_hero#n9grzn69/text#nfu2uax2.text | a price written as text, "Köfte, şiş tavuk ve kuzu pirzola · 240 EGP" | 161 / NEW |
| food_signature_b | en | /pages/home column#n631v4y9/marquee#nxmuhkbm.text | a price written as text, "Koshary EGP 55\nMixed grill EGP 240\nMargherita EGP 140\nShish tawook EGP 150" | 161 / NEW |
| food_signature_b | ar | /pages/home column#n631v4y9/marquee#nxmuhkbm.text | a price written as text, "كشري 55 ج.م\nمشويات مشكّلة 240 ج.م\nمارجريتا 140 ج.م\nشيش طاووق 150 ج.م" | 161 / NEW |
| food_signature_b | tr | /pages/home column#n631v4y9/marquee#nxmuhkbm.text | a price written as text, "Koşari 55 EGP\nKarışık ızgara 240 EGP\nMargherita 140 EGP\nŞiş tavuk 150 EGP" | 161 / NEW |
| marketplace_signature_a | en | /pages/home column#nuy5g19y/slider#n25nc4ez/row#nq9g4a7u/column#nuet8ej4/row#nprjwcnl/text#nfna08u0.text | a price written as text, "over EGP 100" | 161 / NEW |
| marketplace_signature_a | en | /pages/home column#nuy5g19y/slider#n25nc4ez/row#np7bfeqf/column#npo66isr/row#nv8p8v92/text#naiklf10.text | a price written as text, "over EGP 200" | 161 / NEW |
| marketplace_signature_a | en | /pages/home column#nuy5g19y/slider#n25nc4ez/row#n1otdm7l/column#nrk9hcpa/text#nb4tvzz4.text | a price written as text, "delivery over EGP 250" | 161 / NEW |
| marketplace_signature_a | en | /pages/search column#n15qlgu7/slider#n0fs90g4/row#no3c4404/column#nu435jts/row#na1vov46/text#n65ogyxm.text | a price written as text, "over EGP 100" | 161 / NEW |
| marketplace_signature_a | en | /pages/search column#n15qlgu7/slider#n0fs90g4/row#nh7rnd4w/column#n337f96d/row#n9at1v6l/text#nmy8hl1s.text | a price written as text, "over EGP 200" | 161 / NEW |
| marketplace_signature_a | en | /pages/search column#n15qlgu7/slider#n0fs90g4/row#nxe9sd5v/column#ntgszxyv/text#nkde5fsk.text | a price written as text, "delivery over EGP 250" | 161 / NEW |
| marketplace_signature_a | ar | /pages/home column#nuy5g19y/slider#n25nc4ez/row#nq9g4a7u/column#nuet8ej4/row#nprjwcnl/text#nfna08u0.text | a price written as text, "فوق 100 ج.م" | 161 / NEW |
| marketplace_signature_a | ar | /pages/home column#nuy5g19y/slider#n25nc4ez/row#np7bfeqf/column#npo66isr/row#nv8p8v92/text#naiklf10.text | a price written as text, "فوق 200 ج.م" | 161 / NEW |
| marketplace_signature_a | ar | /pages/home column#nuy5g19y/slider#n25nc4ez/row#n1otdm7l/column#nrk9hcpa/text#nb4tvzz4.text | a price written as text, "توصيل فوق 250 ج.م" | 161 / NEW |
| marketplace_signature_a | ar | /pages/search column#n15qlgu7/slider#n0fs90g4/row#no3c4404/column#nu435jts/row#na1vov46/text#n65ogyxm.text | a price written as text, "فوق 100 ج.م" | 161 / NEW |
| marketplace_signature_a | ar | /pages/search column#n15qlgu7/slider#n0fs90g4/row#nh7rnd4w/column#n337f96d/row#n9at1v6l/text#nmy8hl1s.text | a price written as text, "فوق 200 ج.م" | 161 / NEW |
| marketplace_signature_a | ar | /pages/search column#n15qlgu7/slider#n0fs90g4/row#nxe9sd5v/column#ntgszxyv/text#nkde5fsk.text | a price written as text, "توصيل فوق 250 ج.م" | 161 / NEW |
| marketplace_signature_a | tr | /pages/home column#nuy5g19y/slider#n25nc4ez/row#nq9g4a7u/column#nuet8ej4/row#nprjwcnl/text#nfna08u0.text | a price written as text, "100 EGP üzeri" | 161 / NEW |
| marketplace_signature_a | tr | /pages/home column#nuy5g19y/slider#n25nc4ez/row#np7bfeqf/column#npo66isr/row#nv8p8v92/text#naiklf10.text | a price written as text, "200 EGP üzeri" | 161 / NEW |
| marketplace_signature_a | tr | /pages/home column#nuy5g19y/slider#n25nc4ez/row#n1otdm7l/column#nrk9hcpa/text#nb4tvzz4.text | a price written as text, "teslimat 250 EGP üzeri" | 161 / NEW |
| marketplace_signature_a | tr | /pages/search column#n15qlgu7/slider#n0fs90g4/row#no3c4404/column#nu435jts/row#na1vov46/text#n65ogyxm.text | a price written as text, "100 EGP üzeri" | 161 / NEW |
| marketplace_signature_a | tr | /pages/search column#n15qlgu7/slider#n0fs90g4/row#nh7rnd4w/column#n337f96d/row#n9at1v6l/text#nmy8hl1s.text | a price written as text, "200 EGP üzeri" | 161 / NEW |
| marketplace_signature_a | tr | /pages/search column#n15qlgu7/slider#n0fs90g4/row#nxe9sd5v/column#ntgszxyv/text#nkde5fsk.text | a price written as text, "teslimat 250 EGP üzeri" | 161 / NEW |
| delivery_signature_a | en | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#nwdiqdoh/text#n566l26j.text | a price written as text, "+EGP 0" | 161 / NEW |
| delivery_signature_a | en | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#n37yn9mi/text#ncpa845v.text | a price written as text, "+EGP 45" | 161 / NEW |
| delivery_signature_a | en | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#natbmx8x/text#ncg7e9bj.text | a price written as text, "+EGP 15" | 161 / NEW |
| delivery_signature_a | en | /pages/home column#ntjscjjs/column#n8lydkap/button#nevm8o70.text | a price written as text, "Send a parcel · from EGP 40" | 161 / NEW |
| delivery_signature_a | ar | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#nwdiqdoh/text#n566l26j.text | a price written as text, "+0 ج.م" | 161 / NEW |
| delivery_signature_a | ar | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#n37yn9mi/text#ncpa845v.text | a price written as text, "+45 ج.م" | 161 / NEW |
| delivery_signature_a | ar | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#natbmx8x/text#ncg7e9bj.text | a price written as text, "+15 ج.م" | 161 / NEW |
| delivery_signature_a | ar | /pages/home column#ntjscjjs/column#n8lydkap/button#nevm8o70.text | a price written as text, "أرسل طردًا · من 40 ج.م" | 161 / NEW |
| delivery_signature_a | tr | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#nwdiqdoh/text#n566l26j.text | a price written as text, "+0 EGP" | 161 / NEW |
| delivery_signature_a | tr | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#n37yn9mi/text#ncpa845v.text | a price written as text, "+45 EGP" | 161 / NEW |
| delivery_signature_a | tr | /pages/home column#ntjscjjs/column#n8lydkap/row#n54rk5o3/column#natbmx8x/text#ncg7e9bj.text | a price written as text, "+15 EGP" | 161 / NEW |
| delivery_signature_a | tr | /pages/home column#ntjscjjs/column#n8lydkap/button#nevm8o70.text | a price written as text, "Paket gönder · 40 EGP'den" | 161 / NEW |
| delivery_signature_b | en | /pages/home column#nhuhl3bu/map_header#nxduu8b3/column#n8aoba1c/row#n1ktalz1/text#nvkypy2w.text | a price written as text, "EGP 40+" | 161 / NEW |
| delivery_signature_b | en | /pages/home column#nhuhl3bu/map_header#nxduu8b3/column#n8aoba1c/row#nbwmua56/photo_hero#nkr58snd/text#no4txc3f.text | a price written as text, "+EGP 45" | 161 / NEW |
| delivery_signature_b | en | /pages/home column#nhuhl3bu/map_header#nxduu8b3/column#n8aoba1c/row#nbwmua56/photo_hero#nfoih530/text#n6pb3g9d.text | a price written as text, "+EGP 15" | 161 / NEW |
| delivery_signature_b | ar | /pages/home column#nhuhl3bu/map_header#nxduu8b3/column#n8aoba1c/row#nbwmua56/photo_hero#nkr58snd/text#no4txc3f.text | a price written as text, "+45 ج.م" | 161 / NEW |
| delivery_signature_b | ar | /pages/home column#nhuhl3bu/map_header#nxduu8b3/column#n8aoba1c/row#nbwmua56/photo_hero#nfoih530/text#n6pb3g9d.text | a price written as text, "+15 ج.م" | 161 / NEW |
| delivery_signature_b | tr | /pages/home column#nhuhl3bu/map_header#nxduu8b3/column#n8aoba1c/row#nbwmua56/photo_hero#nkr58snd/text#no4txc3f.text | a price written as text, "+45 EGP" | 161 / NEW |
| delivery_signature_b | tr | /pages/home column#nhuhl3bu/map_header#nxduu8b3/column#n8aoba1c/row#nbwmua56/photo_hero#nfoih530/text#n6pb3g9d.text | a price written as text, "+15 EGP" | 161 / NEW |
| travel_signature_a | en | /pages/home column#nsghrb0p/items#nbzznh5v item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | en | /pages/home column#nsghrb0p/items#nbzznh5v item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | en | /pages/home column#nsghrb0p/items#nbzznh5v item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | en | /pages/home column#nsghrb0p/items#nbzznh5v item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | ar | /pages/home column#nsghrb0p/items#nbzznh5v item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | ar | /pages/home column#nsghrb0p/items#nbzznh5v item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | ar | /pages/home column#nsghrb0p/items#nbzznh5v item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | ar | /pages/home column#nsghrb0p/items#nbzznh5v item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | tr | /pages/home column#nsghrb0p/items#nbzznh5v item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | tr | /pages/home column#nsghrb0p/items#nbzznh5v item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | tr | /pages/home column#nsghrb0p/items#nbzznh5v item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| travel_signature_a | tr | /pages/home column#nsghrb0p/items#nbzznh5v item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | en | /pages/home column#n2cig8pe/items#nl0278fw item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | en | /pages/home column#n2cig8pe/items#nl0278fw item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | en | /pages/home column#n2cig8pe/items#nl0278fw item 20 | priced only as "Free", with no amount and currency the app can convert | 161 |
| instructors_signature_a | en | /pages/home column#n2cig8pe/items#nl0278fw item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | en | /pages/home column#n2cig8pe/items#nl0278fw item 33 | priced only as "₺645.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | en | /pages/home column#n2cig8pe/items#nl0278fw item 40 | priced only as "₺1,590.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | ar | /pages/home column#n2cig8pe/items#nl0278fw item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | ar | /pages/home column#n2cig8pe/items#nl0278fw item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | ar | /pages/home column#n2cig8pe/items#nl0278fw item 20 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| instructors_signature_a | ar | /pages/home column#n2cig8pe/items#nl0278fw item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | ar | /pages/home column#n2cig8pe/items#nl0278fw item 33 | priced only as "₺645.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | ar | /pages/home column#n2cig8pe/items#nl0278fw item 40 | priced only as "₺1,590.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | tr | /pages/home column#n2cig8pe/items#nl0278fw item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | tr | /pages/home column#n2cig8pe/items#nl0278fw item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | tr | /pages/home column#n2cig8pe/items#nl0278fw item 20 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| instructors_signature_a | tr | /pages/home column#n2cig8pe/items#nl0278fw item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | tr | /pages/home column#n2cig8pe/items#nl0278fw item 33 | priced only as "₺645.00", with no amount and currency the app can convert | 161 |
| instructors_signature_a | tr | /pages/home column#n2cig8pe/items#nl0278fw item 40 | priced only as "₺1,590.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | en | /pages/home column#nioq4p69/items#nbe37mdd item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | en | /pages/home column#nioq4p69/items#nbe37mdd item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | en | /pages/home column#nioq4p69/items#nbe37mdd item 20 | priced only as "Free", with no amount and currency the app can convert | 161 |
| instructors_signature_b | en | /pages/home column#nioq4p69/items#nbe37mdd item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | ar | /pages/home column#nioq4p69/items#nbe37mdd item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | ar | /pages/home column#nioq4p69/items#nbe37mdd item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | ar | /pages/home column#nioq4p69/items#nbe37mdd item 20 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| instructors_signature_b | ar | /pages/home column#nioq4p69/items#nbe37mdd item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | tr | /pages/home column#nioq4p69/items#nbe37mdd item 5 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | tr | /pages/home column#nioq4p69/items#nbe37mdd item 13 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| instructors_signature_b | tr | /pages/home column#nioq4p69/items#nbe37mdd item 20 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| instructors_signature_b | tr | /pages/home column#nioq4p69/items#nbe37mdd item 27 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | en | /pages/home column#ndhaj9it/items#nvnrzh2k item 6 | priced only as "₺1,250.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | en | /pages/home column#ndhaj9it/items#nvnrzh2k item 14 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | en | /pages/home column#ndhaj9it/items#nvnrzh2k item 22 | priced only as "Free", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | en | /pages/home column#ndhaj9it/items#nvnrzh2k item 29 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | en | /pages/home column#ndhaj9it/items#nvnrzh2k item 36 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | en | /pages/home column#ndhaj9it/items#nvnrzh2k item 42 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | ar | /pages/home column#ndhaj9it/items#nvnrzh2k item 6 | priced only as "₺1,250.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | ar | /pages/home column#ndhaj9it/items#nvnrzh2k item 14 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | ar | /pages/home column#ndhaj9it/items#nvnrzh2k item 22 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | ar | /pages/home column#ndhaj9it/items#nvnrzh2k item 29 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | ar | /pages/home column#ndhaj9it/items#nvnrzh2k item 36 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | ar | /pages/home column#ndhaj9it/items#nvnrzh2k item 42 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | tr | /pages/home column#ndhaj9it/items#nvnrzh2k item 6 | priced only as "₺1,250.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | tr | /pages/home column#ndhaj9it/items#nvnrzh2k item 14 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | tr | /pages/home column#ndhaj9it/items#nvnrzh2k item 22 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | tr | /pages/home column#ndhaj9it/items#nvnrzh2k item 29 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | tr | /pages/home column#ndhaj9it/items#nvnrzh2k item 36 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_a | tr | /pages/home column#ndhaj9it/items#nvnrzh2k item 42 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | en | /pages/home column#ny62mitk/items#nhqx42ct item 6 | priced only as "₺1,250.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | en | /pages/home column#ny62mitk/items#nhqx42ct item 14 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | en | /pages/home column#ny62mitk/items#nhqx42ct item 22 | priced only as "Free", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | en | /pages/home column#ny62mitk/items#nhqx42ct item 29 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | en | /pages/home column#ny62mitk/items#nhqx42ct item 36 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | en | /pages/home column#ny62mitk/items#nhqx42ct item 42 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | ar | /pages/home column#ny62mitk/items#nhqx42ct item 6 | priced only as "₺1,250.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | ar | /pages/home column#ny62mitk/items#nhqx42ct item 14 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | ar | /pages/home column#ny62mitk/items#nhqx42ct item 22 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | ar | /pages/home column#ny62mitk/items#nhqx42ct item 29 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | ar | /pages/home column#ny62mitk/items#nhqx42ct item 36 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | ar | /pages/home column#ny62mitk/items#nhqx42ct item 42 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | tr | /pages/home column#ny62mitk/items#nhqx42ct item 6 | priced only as "₺1,250.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | tr | /pages/home column#ny62mitk/items#nhqx42ct item 14 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | tr | /pages/home column#ny62mitk/items#nhqx42ct item 22 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | tr | /pages/home column#ny62mitk/items#nhqx42ct item 29 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | tr | /pages/home column#ny62mitk/items#nhqx42ct item 36 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| premium_academy_signature_b | tr | /pages/home column#ny62mitk/items#nhqx42ct item 42 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 22 | priced only as "₺1,730.00 – ₺3,230.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 20 | priced only as "₺2,600.00 – ₺4,650.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 19 | priced only as "₺1,500.00 – ₺2,760.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 18 | priced only as "₺2,760.00 – ₺4,970.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/home column#nt1nnyms/items#n6mrjh5j item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | en | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 22 | priced only as "₺1,730.00 – ₺3,230.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 20 | priced only as "₺2,600.00 – ₺4,650.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 19 | priced only as "₺1,500.00 – ₺2,760.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 18 | priced only as "₺2,760.00 – ₺4,970.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/home column#nt1nnyms/items#n6mrjh5j item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | ar | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 22 | priced only as "₺1,730.00 – ₺3,230.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 20 | priced only as "₺2,600.00 – ₺4,650.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 19 | priced only as "₺1,500.00 – ₺2,760.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 18 | priced only as "₺2,760.00 – ₺4,970.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/home column#nt1nnyms/items#n6mrjh5j item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_a | tr | /pages/wishlist column#n8zuujr9/items#nj0ovwh5 item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/home column#ntg7xiks/items#nu6ej32w item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/home column#ntg7xiks/items#nu6ej32w item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/home column#ntg7xiks/items#nu6ej32w item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/home column#ntg7xiks/items#nu6ej32w item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/home column#ntg7xiks/items#nu6ej32w item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/wishlist column#negywgop/items#ndrtc4qd item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/wishlist column#negywgop/items#ndrtc4qd item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/wishlist column#negywgop/items#ndrtc4qd item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/wishlist column#negywgop/items#ndrtc4qd item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | en | /pages/wishlist column#negywgop/items#ndrtc4qd item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/home column#ntg7xiks/items#nu6ej32w item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/home column#ntg7xiks/items#nu6ej32w item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/home column#ntg7xiks/items#nu6ej32w item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/home column#ntg7xiks/items#nu6ej32w item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/home column#ntg7xiks/items#nu6ej32w item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/wishlist column#negywgop/items#ndrtc4qd item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/wishlist column#negywgop/items#ndrtc4qd item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/wishlist column#negywgop/items#ndrtc4qd item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/wishlist column#negywgop/items#ndrtc4qd item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | ar | /pages/wishlist column#negywgop/items#ndrtc4qd item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/home column#ntg7xiks/items#nu6ej32w item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/home column#ntg7xiks/items#nu6ej32w item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/home column#ntg7xiks/items#nu6ej32w item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/home column#ntg7xiks/items#nu6ej32w item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/home column#ntg7xiks/items#nu6ej32w item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/wishlist column#negywgop/items#ndrtc4qd item 24 | priced only as "₺2,290.00 – ₺4,260.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/wishlist column#negywgop/items#ndrtc4qd item 23 | priced only as "₺2,510.00 – ₺5,190.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/wishlist column#negywgop/items#ndrtc4qd item 21 | priced only as "₺3,780.00 – ₺7,100.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/wishlist column#negywgop/items#ndrtc4qd item 17 | priced only as "₺3,470.00", with no amount and currency the app can convert | 161 |
| flowers_signature_b | tr | /pages/wishlist column#negywgop/items#ndrtc4qd item 15 | priced only as "₺4,570.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#npz3gkup/items#nxsqssdv item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#npz3gkup/items#nxsqssdv item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop | en | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#npz3gkup/items#nxsqssdv item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#npz3gkup/items#nxsqssdv item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop | ar | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#npz3gkup/items#nxsqssdv item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#npz3gkup/items#nxsqssdv item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#n829pako/items#n7r9u1xn item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop | tr | /pages/home column#nj5hulfw/column#ncyvywki/items#nff42pgl item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop_deals | en | /pages/home column#nqgdp692/column#nem2tuns/items#n5lfkihx item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_deals | en | /pages/home column#nqgdp692/column#nem2tuns/items#n5lfkihx item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_deals | en | /pages/home column#nqgdp692/column#nj7fvag4/items#nwz9t1kl item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_deals | en | /pages/home column#nqgdp692/column#n3h3b1fy/items#nod4yb1b item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_deals | en | /pages/home column#nqgdp692/column#n3h3b1fy/items#nod4yb1b item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_deals | ar | /pages/home column#nqgdp692/column#nem2tuns/items#n5lfkihx item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_deals | ar | /pages/home column#nqgdp692/column#nem2tuns/items#n5lfkihx item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_deals | ar | /pages/home column#nqgdp692/column#nj7fvag4/items#nwz9t1kl item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_deals | ar | /pages/home column#nqgdp692/column#n3h3b1fy/items#nod4yb1b item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_deals | ar | /pages/home column#nqgdp692/column#n3h3b1fy/items#nod4yb1b item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_deals | tr | /pages/home column#nqgdp692/column#nem2tuns/items#n5lfkihx item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_deals | tr | /pages/home column#nqgdp692/column#nem2tuns/items#n5lfkihx item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_deals | tr | /pages/home column#nqgdp692/column#nj7fvag4/items#nwz9t1kl item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_deals | tr | /pages/home column#nqgdp692/column#n3h3b1fy/items#nod4yb1b item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_deals | tr | /pages/home column#nqgdp692/column#n3h3b1fy/items#nod4yb1b item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop_looks | en | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop_looks | ar | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#njn7w9he/items#nle8y3yj item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#n84hrgw8/items#nux6fols item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 12 | priced only as "₺1,290.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 11 | priced only as "₺1,850.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 10 | priced only as "₺590.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 9 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 8 | priced only as "₺940.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 7 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 6 | priced only as "₺280.00", with no amount and currency the app can convert | 161 |
| shop_looks | tr | /pages/home column#npcpir6l/column#nc589z0m/items#nolylq0q item 5 | priced only as "₺560.00", with no amount and currency the app can convert | 161 |
| menu | en | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 12 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| menu | en | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 11 | priced only as "₺340.00", with no amount and currency the app can convert | 161 |
| menu | en | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 10 | priced only as "₺460.00", with no amount and currency the app can convert | 161 |
| menu | en | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 9 | priced only as "₺140.00", with no amount and currency the app can convert | 161 |
| menu | ar | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 12 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| menu | ar | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 11 | priced only as "₺340.00", with no amount and currency the app can convert | 161 |
| menu | ar | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 10 | priced only as "₺460.00", with no amount and currency the app can convert | 161 |
| menu | ar | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 9 | priced only as "₺140.00", with no amount and currency the app can convert | 161 |
| menu | tr | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 12 | priced only as "₺420.00", with no amount and currency the app can convert | 161 |
| menu | tr | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 11 | priced only as "₺340.00", with no amount and currency the app can convert | 161 |
| menu | tr | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 10 | priced only as "₺460.00", with no amount and currency the app can convert | 161 |
| menu | tr | /pages/home column#nwegggjp/column#nm2w8lag/items#nagct9h7 item 9 | priced only as "₺140.00", with no amount and currency the app can convert | 161 |
| travel | en | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| travel | en | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| travel | en | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| travel | en | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| travel | ar | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| travel | ar | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| travel | ar | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| travel | ar | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| travel | tr | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 1 | priced only as "$168.00", with no amount and currency the app can convert | 161 |
| travel | tr | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 2 | priced only as "$134.00", with no amount and currency the app can convert | 161 |
| travel | tr | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 3 | priced only as "$96.00", with no amount and currency the app can convert | 161 |
| travel | tr | /pages/home column#n4m7jnr9/column#nhi9cepi/items#nf7u0rov item 4 | priced only as "$262.00", with no amount and currency the app can convert | 161 |
| academy_premium | en | /pages/home column#nyb5fny2/items#ndzrgdof item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| academy_premium | en | /pages/home column#nyb5fny2/items#ndzrgdof item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| academy_premium | en | /pages/home column#nyb5fny2/items#ndzrgdof item 17 | priced only as "Free", with no amount and currency the app can convert | 161 |
| academy_premium | en | /pages/home column#nyb5fny2/items#ndzrgdof item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| academy_premium | en | /pages/home column#nyb5fny2/items#ndzrgdof item 31 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| academy_premium | en | /pages/home column#nyb5fny2/items#ndzrgdof item 39 | priced only as "₺1,600.00", with no amount and currency the app can convert | 161 |
| academy_premium | ar | /pages/home column#nyb5fny2/items#ndzrgdof item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| academy_premium | ar | /pages/home column#nyb5fny2/items#ndzrgdof item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| academy_premium | ar | /pages/home column#nyb5fny2/items#ndzrgdof item 17 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| academy_premium | ar | /pages/home column#nyb5fny2/items#ndzrgdof item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| academy_premium | ar | /pages/home column#nyb5fny2/items#ndzrgdof item 31 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| academy_premium | ar | /pages/home column#nyb5fny2/items#ndzrgdof item 39 | priced only as "₺1,600.00", with no amount and currency the app can convert | 161 |
| academy_premium | tr | /pages/home column#nyb5fny2/items#ndzrgdof item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| academy_premium | tr | /pages/home column#nyb5fny2/items#ndzrgdof item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| academy_premium | tr | /pages/home column#nyb5fny2/items#ndzrgdof item 17 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| academy_premium | tr | /pages/home column#nyb5fny2/items#ndzrgdof item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| academy_premium | tr | /pages/home column#nyb5fny2/items#ndzrgdof item 31 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| academy_premium | tr | /pages/home column#nyb5fny2/items#ndzrgdof item 39 | priced only as "₺1,600.00", with no amount and currency the app can convert | 161 |
| courses | en | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| courses | en | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| courses | en | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 17 | priced only as "Free", with no amount and currency the app can convert | 161 |
| courses | en | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| courses | ar | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| courses | ar | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| courses | ar | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 17 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| courses | ar | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| courses | tr | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| courses | tr | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| courses | tr | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 17 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| courses | tr | /pages/home column#n25gtg3n/column#n5ydyl0f/items#n98whxku item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| services | en | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 1 | priced only as "₺850.00", with no amount and currency the app can convert | 161 |
| services | en | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 3 | priced only as "₺1,900.00", with no amount and currency the app can convert | 161 |
| services | en | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 4 | priced only as "₺1,200.00", with no amount and currency the app can convert | 161 |
| services | en | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 6 | priced only as "₺950.00", with no amount and currency the app can convert | 161 |
| services | ar | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 1 | priced only as "₺850.00", with no amount and currency the app can convert | 161 |
| services | ar | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 3 | priced only as "₺1,900.00", with no amount and currency the app can convert | 161 |
| services | ar | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 4 | priced only as "₺1,200.00", with no amount and currency the app can convert | 161 |
| services | ar | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 6 | priced only as "₺950.00", with no amount and currency the app can convert | 161 |
| services | tr | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 1 | priced only as "₺850.00", with no amount and currency the app can convert | 161 |
| services | tr | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 3 | priced only as "₺1,900.00", with no amount and currency the app can convert | 161 |
| services | tr | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 4 | priced only as "₺1,200.00", with no amount and currency the app can convert | 161 |
| services | tr | /pages/home column#no5h1aut/column#n70bk8h4/items#n34vf70y item 6 | priced only as "₺950.00", with no amount and currency the app can convert | 161 |
| listings | en | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 7 | priced only as "TRY 22,900,000", with no amount and currency the app can convert | 161 |
| listings | en | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 6 | priced only as "TRY 50,500,000", with no amount and currency the app can convert | 161 |
| listings | en | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 5 | priced only as "TRY 50,500 / month", with no amount and currency the app can convert | 161 |
| listings | en | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 4 | priced only as "TRY 22,900 / month", with no amount and currency the app can convert | 161 |
| listings | ar | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 7 | priced only as "TRY 22,900,000", with no amount and currency the app can convert | 161 |
| listings | ar | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 6 | priced only as "TRY 50,500,000", with no amount and currency the app can convert | 161 |
| listings | ar | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 5 | priced only as "⁦TRY 50,500⁩ / شهريًا", with no amount and currency the app can convert | 161 |
| listings | ar | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 4 | priced only as "⁦TRY 22,900⁩ / شهريًا", with no amount and currency the app can convert | 161 |
| listings | tr | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 7 | priced only as "TRY 22,900,000", with no amount and currency the app can convert | 161 |
| listings | tr | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 6 | priced only as "TRY 50,500,000", with no amount and currency the app can convert | 161 |
| listings | tr | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 5 | priced only as "TRY 50,500 / ay", with no amount and currency the app can convert | 161 |
| listings | tr | /pages/home column#n4ol2s5c/column#nggw8ymx/items#nv72j2ui item 4 | priced only as "TRY 22,900 / ay", with no amount and currency the app can convert | 161 |
| events | en | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 2 | priced only as "Free", with no amount and currency the app can convert | 161 |
| events | en | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 1 | priced only as "From ₺350.00", with no amount and currency the app can convert | 161 |
| events | en | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 4 | priced only as "Free", with no amount and currency the app can convert | 161 |
| events | en | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 3 | priced only as "₺450.00", with no amount and currency the app can convert | 161 |
| events | ar | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 2 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| events | ar | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 1 | priced only as "ابتداءً من ⁦₺350.00⁩", with no amount and currency the app can convert | 161 |
| events | ar | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 4 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| events | ar | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 3 | priced only as "₺450.00", with no amount and currency the app can convert | 161 |
| events | tr | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 2 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| events | tr | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 1 | priced only as "₺350.00 ve üzeri", with no amount and currency the app can convert | 161 |
| events | tr | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 4 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| events | tr | /pages/home column#ni44ccfv/column#nh0un8k7/items#nv3uh2hv item 3 | priced only as "₺450.00", with no amount and currency the app can convert | 161 |
| teachers | en | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers | en | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers | en | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 17 | priced only as "Free", with no amount and currency the app can convert | 161 |
| teachers | en | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers | ar | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers | ar | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers | ar | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 17 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| teachers | ar | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers | tr | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers | tr | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers | tr | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 17 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| teachers | tr | /pages/home column#nq4w4qvc/column#n3t26qy0/items#nk1koryz item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers_offers | en | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers_offers | en | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers_offers | en | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 17 | priced only as "Free", with no amount and currency the app can convert | 161 |
| teachers_offers | en | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers_offers | ar | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers_offers | ar | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers_offers | ar | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 17 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| teachers_offers | ar | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers_offers | tr | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers_offers | tr | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers_offers | tr | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 17 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| teachers_offers | tr | /pages/home column#nu706vq2/column#n9wkul4l/items#noojijg1 item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers_photo | en | /pages/home column#nw65ww3t/items#nwd6wdzj item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers_photo | en | /pages/home column#nw65ww3t/items#nwd6wdzj item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers_photo | en | /pages/home column#nw65ww3t/items#nwd6wdzj item 17 | priced only as "Free", with no amount and currency the app can convert | 161 |
| teachers_photo | en | /pages/home column#nw65ww3t/items#nwd6wdzj item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers_photo | en | /pages/home column#nw65ww3t/items#nwd6wdzj item 31 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| teachers_photo | en | /pages/home column#nw65ww3t/items#nwd6wdzj item 39 | priced only as "₺1,600.00", with no amount and currency the app can convert | 161 |
| teachers_photo | ar | /pages/home column#nw65ww3t/items#nwd6wdzj item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers_photo | ar | /pages/home column#nw65ww3t/items#nwd6wdzj item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers_photo | ar | /pages/home column#nw65ww3t/items#nwd6wdzj item 17 | priced only as "مجاني", with no amount and currency the app can convert | 161 |
| teachers_photo | ar | /pages/home column#nw65ww3t/items#nwd6wdzj item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers_photo | ar | /pages/home column#nw65ww3t/items#nwd6wdzj item 31 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| teachers_photo | ar | /pages/home column#nw65ww3t/items#nwd6wdzj item 39 | priced only as "₺1,600.00", with no amount and currency the app can convert | 161 |
| teachers_photo | tr | /pages/home column#nw65ww3t/items#nwd6wdzj item 1 | priced only as "₺1,450.00", with no amount and currency the app can convert | 161 |
| teachers_photo | tr | /pages/home column#nw65ww3t/items#nwd6wdzj item 10 | priced only as "₺890.00", with no amount and currency the app can convert | 161 |
| teachers_photo | tr | /pages/home column#nw65ww3t/items#nwd6wdzj item 17 | priced only as "Ücretsiz", with no amount and currency the app can convert | 161 |
| teachers_photo | tr | /pages/home column#nw65ww3t/items#nwd6wdzj item 25 | priced only as "₺1,100.00", with no amount and currency the app can convert | 161 |
| teachers_photo | tr | /pages/home column#nw65ww3t/items#nwd6wdzj item 31 | priced only as "₺650.00", with no amount and currency the app can convert | 161 |
| teachers_photo | tr | /pages/home column#nw65ww3t/items#nwd6wdzj item 39 | priced only as "₺1,600.00", with no amount and currency the app can convert | 161 |

### Taps (NEW)

| Template | Language | Element | Reason | Fix |
|---|---|---|---|---|
| brand | en | /pages/home column#nav741s3/column#nhwzgrmu/button#nhm9j30n | drawn to be tapped but opens nothing | NEW |

### Layout on the phone (163)

The element is the Studio element (node id in the fixture, `test/support/template_guard/<template>.json`) the widget is in.

| Template | Page | Language | Phone | Element | Reason | Fix |
|---|---|---|---|---|---|---|
| brand | /pages/home | en | 360 pt, text 1.0x, LTR | row g6 | A RenderFlex overflowed by 8.5 pixels on the right. | 163 |
| brand | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 103 pixels on the right. | 163 |
| brand | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 51 pixels on the right. | 163 |
| charity | /pages/home | en | 360 pt, text 1.0x, LTR | row g6 | A RenderFlex overflowed by 8.5 pixels on the right. | 163 |
| charity | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 103 pixels on the right. | 163 |
| charity | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 51 pixels on the right. | 163 |
| courses | /pages/home | en | 360 pt, text 1.0x, LTR | row g6 | A RenderFlex overflowed by 8.5 pixels on the right. | 163 |
| courses | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 103 pixels on the right. | 163 |
| courses | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 51 pixels on the right. | 163 |
| demo_food | /pages/home | en | 360 pt, text 1.3x, LTR | column g28 | A RenderFlex overflowed by 8.0 pixels on the bottom. | 163 |
| demo_food | /pages/home | en | 412 pt, text 1.3x, LTR | column g28 | A RenderFlex overflowed by 8.0 pixels on the bottom. | 163 |
| demo_food | /pages/home | ar | 360 pt, text 1.3x, RTL | column g6-over | A RenderFlex overflowed by 92 pixels on the bottom. | 163 |
| demo_food | /pages/home | ar | 360 pt, text 1.3x, RTL | column g28 | A RenderFlex overflowed by 10.0 pixels on the bottom. | 163 |
| demo_food | /pages/home | ar | 412 pt, text 1.3x, RTL | column g28 | A RenderFlex overflowed by 10.0 pixels on the bottom. | 163 |
| demo_marketplace | /pages/home | en | 360 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 54 pixels on the bottom. | 163 |
| demo_marketplace | /pages/home | en | 412 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 8.0 pixels on the bottom. | 163 |
| demo_marketplace | /pages/shops | en | 360 pt, text 1.0x, LTR | market g59 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| demo_marketplace | /pages/shops | en | 360 pt, text 1.3x, LTR | market g59 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| demo_marketplace | /pages/shops | en | 412 pt, text 1.0x, LTR | market g59 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| demo_marketplace | /pages/shops | en | 412 pt, text 1.3x, LTR | market g59 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| demo_marketplace | /pages/home | ar | 360 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 35 pixels on the bottom. | 163 |
| demo_marketplace | /pages/home | ar | 412 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 35 pixels on the bottom. | 163 |
| demo_marketplace | /pages/shops | ar | 360 pt, text 1.0x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| demo_marketplace | /pages/shops | ar | 360 pt, text 1.3x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| demo_marketplace | /pages/shops | ar | 412 pt, text 1.0x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| demo_marketplace | /pages/shops | ar | 412 pt, text 1.3x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| demo_rides | /pages/home | en | 360 pt, text 1.0x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 81.3 x 10.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | row g25 | A RenderFlex overflowed by 6.3 pixels on the right. | 163 |
| demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | row g36 | A RenderFlex overflowed by 8.4 pixels on the right. | 163 |
| demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | row g47 | A RenderFlex overflowed by 9.3 pixels on the right. | 163 |
| demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| demo_rides | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [263.8, 361.0, 102.6 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| demo_rides | /pages/home | en | 412 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [329.6, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 700.0] | 163 |
| demo_rides | /pages/home | ar | 360 pt, text 1.3x, RTL | row g36 | A RenderFlex overflowed by 0.00894 pixels on the right. | 163 |
| demo_rides | /pages/home | ar | 360 pt, text 1.3x, RTL | row g47 | A RenderFlex overflowed by 0.893 pixels on the right. | 163 |
| demo_rides | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [269.0, 193.0, 99.8 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| demo_taxi | /pages/home | en | 360 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. | 163 |
| demo_taxi | /pages/home | en | 412 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. | 163 |
| demo_taxi | /pages/home | ar | 360 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 7.0 pixels on the bottom. | 163 |
| demo_taxi | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [338.4, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 376.0] | 163 |
| demo_taxi | /pages/home | ar | 412 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 6.0 pixels on the bottom. | 163 |
| demo_taxi | /pages/home | ar | 412 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [387.3, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 376.0] | 163 |
| demo_travel | /pages/home | en | 360 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. | 163 |
| demo_travel | /pages/home | en | 412 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. | 163 |
| demo_travel | /pages/home | ar | 360 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 53 pixels on the right. | 163 |
| demo_travel | /pages/home | ar | 412 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 1.2 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.0x, LTR | testimonials g107 | RenderSemanticsAnnotations [198.2, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 234.2 x 109.0] | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 19 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 8.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 11 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 9.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 20 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 12 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 15 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g85-over | A RenderFlex overflowed by 31 pixels on the bottom. | 163 |
| flowers_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | testimonials g107 | RenderSemanticsAnnotations [198.2, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 234.2 x 152.0] | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.0x, LTR | testimonials g107 | RenderSemanticsAnnotations [241.8, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 277.8 x 109.0] | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 19 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 8.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 11 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 9.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 20 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 12 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | row g82 | A RenderFlex overflowed by 15 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g85-over | A RenderFlex overflowed by 31 pixels on the bottom. | 163 |
| flowers_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | testimonials g107 | RenderSemanticsAnnotations [241.8, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 277.8 x 152.0] | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.0x, RTL | testimonials g107 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 234.2 x 109.0] | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 19 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 8.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 11 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 9.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 20 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 12 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 15 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g85-over | A RenderFlex overflowed by 9.0 pixels on the bottom. | 163 |
| flowers_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | testimonials g107 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 234.2 x 126.0] | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.0x, RTL | testimonials g107 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 277.8 x 109.0] | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 19 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 8.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 11 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 9.0 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 20 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 12 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g82 | A RenderFlex overflowed by 15 pixels on the right. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | column g85-over | A RenderFlex overflowed by 9.0 pixels on the bottom. | 163 |
| flowers_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | testimonials g107 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 277.8 x 126.0] | 163 |
| flowers_signature_b | /pages/home | en | 360 pt, text 1.0x, LTR | testimonials g116 | RenderSemanticsAnnotations [250.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 286.0 x 108.0] | 163 |
| flowers_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | testimonials g116 | RenderSemanticsAnnotations [250.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 286.0 x 152.0] | 163 |
| flowers_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | testimonials g116 | RenderSemanticsAnnotations [250.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 286.0 x 123.0] | 163 |
| flowers_signature_b | /pages/home | en | 412 pt, text 1.0x, LTR | testimonials g116 | RenderSemanticsAnnotations [302.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 338.0 x 108.0] | 163 |
| flowers_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | testimonials g116 | RenderSemanticsAnnotations [302.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 338.0 x 123.0] | 163 |
| flowers_signature_b | /pages/home | ar | 360 pt, text 1.0x, RTL | testimonials g116 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 286.0 x 109.0] | 163 |
| flowers_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | testimonials g116 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 286.0 x 124.0] | 163 |
| flowers_signature_b | /pages/home | ar | 412 pt, text 1.0x, RTL | testimonials g116 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 338.0 x 109.0] | 163 |
| flowers_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | testimonials g116 | RenderSemanticsAnnotations [-4.0, -6.0, 40.0 x 40.0] outside its RenderStack [0.0, 0.0, 338.0 x 124.0] | 163 |
| food_brand | /pages/home | en | 360 pt, text 1.0x, LTR | row g6 | A RenderFlex overflowed by 8.5 pixels on the right. | 163 |
| food_brand | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 103 pixels on the right. | 163 |
| food_brand | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 51 pixels on the right. | 163 |
| food_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g28 | A RenderFlex overflowed by 8.0 pixels on the bottom. | 163 |
| food_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g28 | A RenderFlex overflowed by 8.0 pixels on the bottom. | 163 |
| food_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g6-over | A RenderFlex overflowed by 92 pixels on the bottom. | 163 |
| food_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g28 | A RenderFlex overflowed by 10.0 pixels on the bottom. | 163 |
| food_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | column g28 | A RenderFlex overflowed by 10.0 pixels on the bottom. | 163 |
| food_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | bento g11 | RenderPadding [0.0, -1.0, 328.0 x 93.0] outside its RenderStack [0.0, 0.0, 328.0 x 92.0] | 163 |
| food_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | bento g11 | RenderPadding [0.0, -1.0, 380.0 x 93.0] outside its RenderStack [0.0, 0.0, 380.0 x 92.0] | 163 |
| food_signature_b | /pages/restaurants | ar | 360 pt, text 1.3x, RTL | bento g24 | RenderPadding [0.0, -1.0, 328.0 x 93.0] outside its RenderStack [0.0, 0.0, 328.0 x 92.0] | 163 |
| food_signature_b | /pages/restaurants | ar | 412 pt, text 1.3x, RTL | bento g24 | RenderPadding [0.0, -1.0, 380.0 x 93.0] outside its RenderStack [0.0, 0.0, 380.0 x 92.0] | 163 |
| instructors_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | row g14 | A RenderFlex overflowed by 54 pixels on the right. | 163 |
| instructors_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | row g14 | A RenderFlex overflowed by 1.6 pixels on the right. | 163 |
| market | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market | /pages/home | en | 360 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market | /pages/home | en | 360 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market | /pages/home | en | 360 pt, text 1.3x, LTR | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market | /pages/home | en | 360 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market | /pages/home | en | 360 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market | /pages/home | en | 412 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market | /pages/home | en | 412 pt, text 1.0x, LTR | market g4 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market | /pages/home | en | 412 pt, text 1.3x, LTR | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market | /pages/home | en | 412 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market | /pages/home | en | 412 pt, text 1.3x, LTR | market g4 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market | /pages/home | ar | 360 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market | /pages/home | ar | 360 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market | /pages/home | ar | 360 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market | /pages/home | ar | 412 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market | /pages/home | ar | 412 pt, text 1.0x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g11 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market | /pages/home | ar | 412 pt, text 1.3x, RTL | market g4 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_grocery | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_grocery | /pages/home | en | 360 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_grocery | /pages/home | en | 360 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_grocery | /pages/home | en | 360 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_grocery | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_grocery | /pages/home | en | 412 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_grocery | /pages/home | en | 412 pt, text 1.0x, LTR | market g7 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_grocery | /pages/home | en | 412 pt, text 1.3x, LTR | market g7 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_grocery | /pages/home | ar | 360 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 360 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 360 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_grocery | /pages/home | ar | 412 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 412 pt, text 1.0x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_grocery | /pages/home | ar | 412 pt, text 1.3x, RTL | market g7 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_offers | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_offers | /pages/home | en | 360 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_offers | /pages/home | en | 360 pt, text 1.0x, LTR | market g6 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [184.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [194.8, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_offers | /pages/home | en | 360 pt, text 1.3x, LTR | market g6 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_offers | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_offers | /pages/home | en | 412 pt, text 1.0x, LTR | market g3 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_offers | /pages/home | en | 412 pt, text 1.0x, LTR | market g6 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [230.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g3 | RenderAspectRatio [240.6, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_offers | /pages/home | en | 412 pt, text 1.3x, LTR | market g6 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_offers | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_offers | /pages/home | ar | 360 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_offers | /pages/home | ar | 360 pt, text 1.0x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 294.8 x 164.0] | 163 |
| market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 304.8 x 164.0] | 163 |
| market_offers | /pages/home | ar | 360 pt, text 1.3x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| market_offers | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_offers | /pages/home | ar | 412 pt, text 1.0x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_offers | /pages/home | ar | 412 pt, text 1.0x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g8 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 340.6 x 164.0] | 163 |
| market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g3 | RenderAspectRatio [-26.0, 14.0, 136.0 x 136.0] outside its RenderStack [0.0, 0.0, 350.6 x 164.0] | 163 |
| market_offers | /pages/home | ar | 412 pt, text 1.3x, RTL | market g6 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| market_photo | /pages/home | en | 360 pt, text 1.3x, LTR | column g4 | A RenderFlex overflowed by 3.0 pixels on the bottom. | 163 |
| marketplace_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 54 pixels on the bottom. | 163 |
| marketplace_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g5 | A RenderFlex overflowed by 8.0 pixels on the bottom. | 163 |
| marketplace_signature_a | /pages/shops | en | 360 pt, text 1.0x, LTR | market g59 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_a | /pages/shops | en | 360 pt, text 1.3x, LTR | market g59 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_a | /pages/shops | en | 412 pt, text 1.0x, LTR | market g59 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| marketplace_signature_a | /pages/shops | en | 412 pt, text 1.3x, LTR | market g59 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| marketplace_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 35 pixels on the bottom. | 163 |
| marketplace_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | column g5 | A RenderFlex overflowed by 35 pixels on the bottom. | 163 |
| marketplace_signature_a | /pages/shops | ar | 360 pt, text 1.0x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_a | /pages/shops | ar | 360 pt, text 1.3x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_a | /pages/shops | ar | 412 pt, text 1.0x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| marketplace_signature_a | /pages/shops | ar | 412 pt, text 1.3x, RTL | market g59 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | en | 360 pt, text 1.0x, LTR | market g20 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | en | 360 pt, text 1.3x, LTR | market g20 | RenderTransform [61.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | en | 412 pt, text 1.0x, LTR | market g20 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | en | 412 pt, text 1.3x, LTR | market g20 | RenderTransform [87.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | ar | 360 pt, text 1.0x, RTL | market g20 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | ar | 360 pt, text 1.3x, RTL | market g20 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 163.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | ar | 412 pt, text 1.0x, RTL | market g20 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| marketplace_signature_b | /pages/shops | ar | 412 pt, text 1.3x, RTL | market g20 | RenderTransform [-14.0, 82.0, 116.0 x 88.0] outside its RenderStack [0.0, 0.0, 189.0 x 156.0] | 163 |
| ride_brand | /pages/home | en | 360 pt, text 1.0x, LTR | row g6 | A RenderFlex overflowed by 8.5 pixels on the right. | 163 |
| ride_brand | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 103 pixels on the right. | 163 |
| ride_brand | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 51 pixels on the right. | 163 |
| rides_signature_a | /pages/home | en | 360 pt, text 1.0x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 81.3 x 10.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g25 | A RenderFlex overflowed by 6.3 pixels on the right. | 163 |
| rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g36 | A RenderFlex overflowed by 8.4 pixels on the right. | 163 |
| rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | row g47 | A RenderFlex overflowed by 9.3 pixels on the right. | 163 |
| rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [288.0, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| rides_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [263.8, 361.0, 102.6 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| rides_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [329.6, 322.0, 100.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 700.0] | 163 |
| rides_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g36 | A RenderFlex overflowed by 0.00894 pixels on the right. | 163 |
| rides_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g47 | A RenderFlex overflowed by 0.893 pixels on the right. | 163 |
| rides_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [269.0, 193.0, 99.8 x 34.0] outside its RenderStack [0.0, 0.0, 360.0 x 700.0] | 163 |
| rides_signature_b | /pages/home | en | 360 pt, text 1.0x, LTR | mapHeader g2 | RenderFractionalTranslation [208.8, 412.9, 165.3 x 21.0] outside its RenderStack [0.0, 0.0, 360.0 x 444.0] | 163 |
| rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | column g26 | A RenderFlex overflowed by 11 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | column g34 | A RenderFlex overflowed by 11 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | column g42 | A RenderFlex overflowed by 11 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [208.8, 412.9, 207.0 x 27.0] outside its RenderStack [0.0, 0.0, 360.0 x 444.0] | 163 |
| rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | column g26 | A RenderFlex overflowed by 11 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | column g34 | A RenderFlex overflowed by 11 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | column g42 | A RenderFlex overflowed by 11 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | mapHeader g2 | RenderFractionalTranslation [239.0, 412.9, 207.0 x 27.0] outside its RenderStack [0.0, 0.0, 412.0 x 444.0] | 163 |
| rides_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g34 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g42 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g34 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| rides_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g42 | A RenderFlex overflowed by 12 pixels on the bottom. | 163 |
| school_brand | /pages/home | en | 360 pt, text 1.0x, LTR | row g6 | A RenderFlex overflowed by 8.5 pixels on the right. | 163 |
| school_brand | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 103 pixels on the right. | 163 |
| school_brand | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 51 pixels on the right. | 163 |
| shop_deals | /pages/home | ar | 360 pt, text 1.3x, RTL | column g3 | A RenderFlex overflowed by 22 pixels on the bottom. | 163 |
| shop_deals | /pages/home | ar | 412 pt, text 1.3x, RTL | column g3 | A RenderFlex overflowed by 22 pixels on the bottom. | 163 |
| shop_looks | /pages/home | ar | 360 pt, text 1.3x, RTL | column g40 | A RenderFlex overflowed by 3.0 pixels on the bottom. | 163 |
| taxi_map | /pages/home | en | 360 pt, text 1.3x, LTR | column g19-over | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_map | /pages/home | en | 412 pt, text 1.3x, LTR | column g19-over | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_map | /pages/home | ar | 360 pt, text 1.3x, RTL | column g19-over | A RenderFlex overflowed by 3.0 pixels on the bottom. | 163 |
| taxi_map | /pages/home | ar | 412 pt, text 1.3x, RTL | column g19-over | A RenderFlex overflowed by 3.0 pixels on the bottom. | 163 |
| taxi_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. | 163 |
| taxi_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g46 | A RenderFlex overflowed by 4.0 pixels on the bottom. | 163 |
| taxi_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 7.0 pixels on the bottom. | 163 |
| taxi_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [338.4, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 376.0] | 163 |
| taxi_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | column g46 | A RenderFlex overflowed by 6.0 pixels on the bottom. | 163 |
| taxi_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | mapHeader g2 | RenderFractionalTranslation [387.3, 270.7, 28.0 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 376.0] | 163 |
| taxi_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | column g36-over | A RenderFlex overflowed by 42 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | column g36-over | A RenderFlex overflowed by 14 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 360 pt, text 1.0x, RTL | mapHeader g11 | RenderFractionalTranslation [294.8, 94.0, 73.2 x 10.0] outside its RenderStack [0.0, 0.0, 360.0 x 300.0] | 163 |
| taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g21 | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g31 | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | column g36-over | A RenderFlex overflowed by 16 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | mapHeader g11 | RenderFractionalTranslation [294.8, 94.0, 95.2 x 13.0] outside its RenderStack [0.0, 0.0, 360.0 x 300.0] | 163 |
| taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g21 | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g26 | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g31 | A RenderFlex overflowed by 1.00 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | column g36-over | A RenderFlex overflowed by 16 pixels on the bottom. | 163 |
| taxi_signature_b | /pages/home | ar | 412 pt, text 1.3x, RTL | mapHeader g11 | RenderFractionalTranslation [320.8, 94.0, 95.2 x 13.0] outside its RenderStack [0.0, 0.0, 412.0 x 300.0] | 163 |
| teachers | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 57 pixels on the right. | 163 |
| teachers | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 4.8 pixels on the right. | 163 |
| teachers | /pages/home | ar | 360 pt, text 1.3x, RTL | row g6 | A RenderFlex overflowed by 46 pixels on the right. | 163 |
| teachers_brand | /pages/home | en | 360 pt, text 1.0x, LTR | row g6 | A RenderFlex overflowed by 8.5 pixels on the right. | 163 |
| teachers_brand | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 103 pixels on the right. | 163 |
| teachers_brand | /pages/home | en | 412 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 51 pixels on the right. | 163 |
| travel_signature_a | /pages/home | en | 360 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. | 163 |
| travel_signature_a | /pages/home | en | 412 pt, text 1.3x, LTR | column g33 | A RenderFlex overflowed by 5.0 pixels on the bottom. | 163 |
| travel_signature_a | /pages/home | ar | 360 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 53 pixels on the right. | 163 |
| travel_signature_a | /pages/home | ar | 412 pt, text 1.3x, RTL | row g9 | A RenderFlex overflowed by 1.2 pixels on the right. | 163 |
| travel_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | row g26 | A RenderFlex overflowed by 1.4 pixels on the right. | 163 |
| travel_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | row g34 | A RenderFlex overflowed by 1.6 pixels on the right. | 163 |
| travel_signature_b | /pages/home | en | 360 pt, text 1.3x, LTR | bento g11 | RenderPadding [0.0, -5.0, 159.0 x 97.0] outside its RenderStack [0.0, 0.0, 159.0 x 92.0] | 163 |
| travel_signature_b | /pages/home | en | 412 pt, text 1.3x, LTR | bento g11 | RenderPadding [0.0, -5.0, 185.0 x 97.0] outside its RenderStack [0.0, 0.0, 185.0 x 92.0] | 163 |
| travel_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | row g26 | A RenderFlex overflowed by 11 pixels on the right. | 163 |
| travel_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | row g34 | A RenderFlex overflowed by 3.5 pixels on the right. | 163 |
| travel_signature_b | /pages/home | ar | 360 pt, text 1.3x, RTL | bento g11 | RenderPadding [0.0, -8.0, 159.0 x 100.0] outside its RenderStack [0.0, 0.0, 159.0 x 92.0] | 163 |
| university | /pages/home | en | 360 pt, text 1.3x, LTR | row g6 | A RenderFlex overflowed by 27 pixels on the right. | 163 |
