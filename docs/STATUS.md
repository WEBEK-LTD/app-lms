# Status

The current state of the project: what is released in the code, what still
needs checking against real services, and what a deployment needs.
`docs/ROADMAP.md` is the plan; this file is the current state.

Last updated: 24 November 2026.

## Current release

Roadmap 231 area A (Yallapp Community's base, on `wip-community-base`):
the community's API contract, its 24 tables (migration 0155), joining and
signing in with email, Apple and Google, profiles, follow, friends, block,
reports, linking a Yallapp account, its three languages and its own host
(`community.yallapp.com.tr`). Needs `COMMUNITY_APPLE_AUDIENCES`,
`COMMUNITY_GOOGLE_CLIENT_IDS` and (optionally) `COMMUNITY_SITE_URL`.

Roadmap 231 area B (Yallapp Community's Q&A and tutorials): questions and answers with the similar questions before asking, official answers from Yallapp's team, replies, votes and points, accepting, sections and tags, saving, search and the team's tutorials (articles and videos by section, level and language) through `/api/community/v1`, held for review and noticed through area C.

Roadmap 231 area C (Yallapp Community's trust, area C): badges (Gold by the
verification form and an admin's review, Blue and Green by their rules),
the admins' tools and audit log, settings, moderation, reports and
notifications (list and email) in English, Arabic and Turkish, through
`/api/community/v1` (`community-trust-*`).

Roadmap 231, area D (the Yallapp Community app, `community/`): the opening,
welcome and signing in (Apple, Google, email), the shell, Home, the side
menu, profiles with follow, friends, block and report, and settings, on area
A's contract; no payments in the app (a test guards it); not yet released.

Roadmap 231 (area E, the Community app's features): the question screen
as the approved dark question phone, the Q&A tab, asking with similar
questions, official tutorials (all free, never a lock),
the Gold badge's verification form, notifications with the bell's count,
search and saved, in English, Arabic and Turkish, light and dark.

Roadmap 231 area F (Yallapp Community's website, under `src/app/community/`,
served on `community.yallapp.com.tr`): the approved look in English, Arabic
and Turkish, light and dark; welcome and signing in (Apple, Google, email),
the home, Q&A, tutorials, search, profiles and the social graph, the Pro
Developer form, notifications, settings and the admins' pages, through the
community's modules and `/api/community/v1`; never a price or payment.
Needs `COMMUNITY_APPLE_WEB_SERVICE_ID` and `COMMUNITY_GOOGLE_WEB_CLIENT_ID`
(the website's public ids, also in A's audience lists) for Apple and Google.

Roadmap 229.4 (prices that read cleanly everywhere else): the dashboard,
the emails, the owner's pushes and the web checkout drop ".00" on a whole
amount as the app does ("₺450", "Pay ₺750"), a fraction kept; receipts,
payslips and payout and sales statements keep every digit (`exact`).

Roadmap 228.7 and 228.8 (the looks' own product pages): every round-3
look C and D (Lujain, Toota, Velours, Ghurza, Toot, Nova, Madar, Nawah,
Rukn, Sakan) draws its own product page, no two with the same skeleton;
the demo shops' descriptions, choices and facts in MSA and Turkish. 228.8's
app fixes (chips as wide as their words, the name's alignment, the top band
on every header-less product page, the size as a headline, Arabic units in
their own direction, Notify me in the part's accent) ship with the next app
release (no `CLIENT_APP_RELEASE` change).

Roadmap 225.9 (the demo guides in look C): the demo guides of Velours,
Ghurza, Toot, Sakan, Rukn, Madar, Nova and Nawah show their apps as they
are now, in each type's main look C (home, menu or Ghurza's custom order,
and a product, from the real app), with their words in English, Arabic and
Turkish; the ten shop types' story pages name their four templates and show
no look A or B screen; Madar's and Nawah's Studio demo pages show their
looks C and D.

Roadmap 229 (prices that read cleanly): a product whose variations cost
differently shows "From SAR 4,899" (Arabic "من SAR 4,899", Turkish
"SAR 4,899 ve üzeri") instead of the whole range, and every whole amount
the app shows reads without ".00" ("₺450", "E£600"), a real fraction with
its digits ("€12.50"). Made once where the hosted API answers
(`cleanPrices`), so lists, product pages, the cart and its totals, orders
and every other type's prices change together; the app's own totals
(`formatMoney`) the same; the dashboard and the emails since 229.4.

Roadmap 228 (a look's own product page): `product` is a Studio page
screen (a shop's); a look's page for it is drawn for every product in place
of the app's product screen, its eleven product elements (photos, name,
price, sizes and colours, quantity, Add to cart / Buy now, description,
specs, reviews, related, delivery and returns) bound to the product open,
each with its looks, in the contract, the editor (library, canvas,
inspector) and the app. A shop without one keeps the app's product screen.
Lujain's look A is the first look with its own (`lib/studio/product-page.ts`).
Madar's (electronics) looks C and D and Nawah's (computers) have theirs
(228.7): a bento of dark glass tiles, a colour stage, neon cut-corner
frames, and a dense spec sheet with the business quote.
228.7: Lujain's templates C and D (RUNWAY's lookbook of photos and
minimal bar, the outfit builder's "Complete the outfit" card) and Toota's
(the story world's Tooti and ages on a bubble, the nursery's size-by-age
ruler and thin lines) draw their own product pages, each its own skeleton.
The app part ships with the next app release (no `CLIENT_APP_RELEASE`
change). Without a header, the status bar and the back button stay over
the page as it scrolls, as on any pushed Studio page without one.

Roadmap 228.7 (cosmetics and crochet): Velours's and Ghurza's templates C
and D each have their own product page, built from the product elements
and their template's parts, none like another's or like Lujain A's: the
clinic's formula sheet (actives, numbered use steps on frosted glass), the
shade studio's gloss panel with the shade swatches and the shade on real
skin, the makers' market's stitched frames with the price on a hanging tag
and who made it, and the cozy studio's ready piece or kit switch with the
piece's pattern. Light and dark, Arabic, English and Turkish.

228.7 (toys and mobiles): Toot's looks C (the adventure map) and D
(Montessori) and Nova's looks C (the keynote) and D (the deals hub) each
draw their own product page: chunky frames, the treasure chest and a big
red Add to cart; age and material tags with "How to play with it"; one
spotlight shot on black with swatches and specs revealed line by line; price
first, installments soon, the compare tray and today's countdown. No two
share a skeleton, and none shares Lujain A's (`phase228-7-toys-mobiles`).
The demo shops read in Arabic or Turkish show every product's description
in that language (397 products, 10 shop types), and a template's coupon
chest or deals card is left out, heading and frame, while a new shop has no
code or sale (`phase228-7-demo-polish`).

Roadmap 216 (Yallapp's Firebase rides out a moment when Google can't
reach the platform's issuer): the token exchange is tried up to 3 times
(about 1 s, then 3 s) on a passing failure only (unreachable, 429, 5xx,
or `invalid_grant` saying Google couldn't connect to the issuer), with a
fresh assertion each time; the daily check tells the owner about
`yallapp_push_refused` only when it fails again at a second look at the
next frequent run; `/oidc/jwks.json` is kept a minute in memory and both
OIDC endpoints allow `stale-while-revalidate`. Optional owner step, not
done: upload the key set to the Google provider (`jwksJson`) so Google
needs no call to the site, at the cost of uploading it again on every
key rotation.

Roadmap 227 (Studio's shop types, round 3: electronics and computers &
gaming; in the code, not released): each type gets two new looks, C its
main and D its second, listed before A and B, which stay as they are. Madar
C MADAR GRID is a bento of frosted and dark-glass tiles (IBM Plex Sans
Arabic, a glass bar); Madar D the colour stage puts every device on its own
saturated colour (story circles, big snapping cards, El Messiri, a colour
per tab); Nawah C the battle station is neon on black with cut-corner cards
and the Build your PC configurator first (Changa, a glowing bar); Nawah D
the workstation is a dense blue-grey spec sheet with a compare table and
the business quote form (Alexandria, a line bar). Each is a whole project
(home, category menu, its own pages, shop, cart, orders, sign-in and
account, tabs and bar, light and dark, English, Arabic and Turkish), built
only from Studio's existing elements. One app fix for every look: a
spec filter's chip and a product card's spec line read right in Arabic
(each value whole, a chip's count in a badge), the app's preview rebuilt; no `CLIENT_APP_RELEASE` change, no
migration.

**Distinct templates.** The owner's standing rule (23 November): no
resemblance at all between one app and another. A new template's header,
hero, navigation, card shape, section order, bar and type scale must differ
from every other template's, it draws nothing with the kit's visual parts,
and its home is compared beside every other template's before it ships.

Roadmap 226 (Studio shop types, round 3: toys and mobiles): Toot and Nova
each have two new templates on their own archetypes, C (now the demo) and
D: Toot C the adventure map (categories as islands, chunky pressed-out
cards, stickers, the treasure chest, the ages as a ladder of hero levels, a notch bar with the bag in the
middle), Toot D Montessori (a sage opening by skill and by age, quiet rows,
how-to-play cards, a names-only bar), Nova C the keynote (one phone on a
black stage, its colours, specs one per row, compare, the trade-in on a dark
card, a small dock) and Nova D the deals hub (category chips, today's deals
on hot pink, a dense grid of three with "Installments coming soon", the
compare tray and page, a bar whose open tab rises in a pink circle). Light and dark, Arabic, English and
Turkish, built only from Studio's elements; A and B stay as extra templates.
Not yet: the app draws a node's own font family only when it is the
project's main or Arabic font (Toot C's Lalezar headings show in Rubik).

Distinct templates (226, the owner's standing rule): each of these four was
compared side by side with every other template's home before it shipped;
toys D's opening was changed because it was too close to kids' clothes D.

Roadmap 225 (Studio shop types, round 3: furniture and home decor): Rukn
and Sakan each have two new whole templates, first in Studio's order, each
from its own parts file and in light and dark, English, Arabic and Turkish:
furniture C MIZAN the architect (monochrome hairlines, a room scene with
numbered hotspots, the rooms as an index, W × D × H first, a floor plan
that sends the room's size as a custom-order request, the line bar) and D
MANZIL room by room (its own top and a room switcher pinned under it, the
rooms as swipeable cards, the materials, large horizontal cards, the
order-to-assembly steps, the navy island bar); decor C ATHAR the gallery (a framed piece with its museum
label, a framed asymmetric masonry, the halls, the curator's note, the
words-only bar) and D MAZAJ the moodboard (a collage of taped polaroids,
shop by colour, the season's palettes, polaroid cards, the drop bar). A and
B are kept after them. No migration, no app release: they are built only
from Studio's elements the app already draws.

Distinct templates (225): the owner's standing rule holds for these four
and every template after them. Each new home was put beside every other
template's home before it shipped; none shares another's header, hero,
navigation, card shape, section order, bar or type scale.

Roadmap 224 (cosmetics and crochet, templates C and D): Velours and Ghurza
each have two new whole templates that share no skeleton with A and B or
with any other type's: Velours C, the ritual clinic (its main template:
clinical white and teal, Zain; the skin test as frosted glass first, the
morning and night routine as numbered steps, ingredient chips with their
strength, numbered lab cards, a segmented bar) and D, the shade studio
(plum and black gloss, Kufam; the shade swatches as the hero, tutorial
reels, before and after, mood tiles, a glowing bar); Ghurza C, the makers'
market (its main template: stitched paper, Aref Ruqaa headlines over Noto
Naskh Arabic text; the yarn-colour picker, "who made it" makers' cards,
made to order step by step, pieces on hanging tags, a line bar) and
D, the cozy studio (dusty rose, Mada; ready pieces or kits to make, the
pattern of the week, dated class cards, a bubble bar). Each has its own
category menu, shop, cart and orders tops, tabs, sign-in and account menu,
in light and dark and in Arabic, English and Turkish; their parts are
ready sections for any store too. A and B stay as extra templates.

Distinct templates (224): before shipping, the four homes were compared
side by side with all forty A and B homes and the other types' C and D
previews; crochet D's edge-to-edge photo under a header lying over it was
too close to clothes C (the runway) and became a soft photo card under a
large title, and crochet C's yarn swatches are squares, unlike decor D's
colour circles. The rule stands for every future template.

Roadmap 224.10 (the faces Studio pages name, in the app): a project's Studio
pages can name a face on an element besides the look's two fonts (a
heading's display face); it is now served with the look
(`Appearance.page_fonts`, at most 4, with their files) and the app downloads
it as it does the look's own, so the heading shows in its face on phones,
not only in Studio's canvas. Seven looks already on `main` (their numbers in
JetBrains Mono) show it too. The shade finder's, size finder's and quiz
result's buttons draw in the app's font too. The app's part rides the next
app release.


Roadmap 223 (Studio shop types, round 3, the shared base): Studio offers
every demo's looks in one order, C, D, A, B, its main look first (C for a
shop type that has one, else A), on /start, Studio's new project, the
editor's whole designs, Studio Market and the website; the demo app opens
on the main look. Templates C and D themselves come per type: the clothes
type's C RUNWAY (an edge-to-edge lookbook, Reem Kufi) and D the outfit
builder (Tajawal, a dock and a round bag button), and the kids' clothes
type's C the story world (Tooti the mascot, age bubbles, wavy edges,
Lemonada) and D the nursery (linen and sage, a size ruler, the baby gift
list, Vazirmatn); Lujain's and Toota's demos are now their C. Their
products are named in Arabic and Turkish too, so the demos read in Arabic
show Arabic names.

Distinct templates (the owner's standing rule, 23 November 2026): no app,
type or template may resemble another. Every new template is compared side
by side with every other template's home (header, hero, card shape, section
order, tab bar, type scale) before it ships; one that could be made by
recolouring another has failed.

Roadmap 222 (the plugin's follow-ups): plugin 0.4.54 (after 0.4.53, #496)
serves WordPress apps' Studio pages without an empty section, as hosted
shops' are (164.7): a list of products with nothing to show shows the
shop's best sellers, else its newest, and a list left out takes its title
and "Shop all" with it; and a flower shop's card beginnings can be written
in English, Arabic and Turkish, each customer seeing their language's,
the main ones kept for older apps (169.5). Deleting an account without
waiting on Yallapp and end-to-end checks that never call yallapp.com.tr
were already done in 206.1. Not yet released; the store end-to-end checks
run in CI.

Roadmap 220 (the code items earlier phases left open): every amount on the
dashboard's pages (courses, school fees and salaries, rides, deliveries,
food orders, events, donations, bookings, travel, Analytics) is written in
the dashboard's language, as the shop's pages were since 175; the
marketplace's checkout says "Cash at pickup" with Pick up chosen, in
English, Arabic and Turkish (app release 16); `POST /food/quote`'s 503 is in
the contract; the store review driver's sample ride has a real fare (the
company's fares, else 50), stays out of the drivers' statements and reads in
the dashboard's language, and Masar's driver card shows a neutral icon for a
driver without a photo, not the template's stock face (app release 16).
The phones by the app's country were already 206.2's. Zad's department
tiles still open the search: the marketplace has no departments of its own
to open (220.6).

Roadmap 215 (Yallapp Business 1.0.7, after 1.0.6; in the code, not
released): the Pharaonic theme beside the default look, chosen in Settings ›
Appearance and kept on the phone, light and dark following the same setting.
Its own colours (AA throughout), El Messiri and Cinzel for headings, tabular
figures for every number, the ground and ornaments painted in the app, the
welcome, lock and opening screens, Today, an order, the ringtones, the nav
and buttons, empty states, and the New order card in its skin (with a
shimmer that stops with the answer and with less motion). The default look
is unchanged: goldens of its screens match pixel for pixel. No migration,
no server change.

Roadmap 214 (Yallapp Business 1.0.6; in the code, not released: the
release waits for the owner): ring by order value (2 or 3 bands with their
own sounds), the end-of-day summary at the phone's time in the shop's time
zone, and Pause the shop (15, 30, 60 minutes or until reopened, with a
reason customers read; a shop's checkout refuses new orders, a
restaurant's or marketplace place's through its busy time; migration 0153).
The home-screen widget on Android and iPhone (sales today, orders today,
new orders waiting; its own read-only token for `GET /widget`), and a new
order until it is answered: Android's ongoing notification with Accept and
Open, the iPhone's Live Activity on the Lock Screen and in the Dynamic
Island, started and ended by the server's pushes (migration 0154); the
New order card on Today with Accept and Reject. New
iPhone extension: `tr.com.yallapp.business.ShopWidget`, its App ID and
profile made by fastlane on the first release. Time Sensitive is ready
but off (open item below).

Roadmap 212 (a store's wishlist, reviews with photos, back in stock,
filters and product languages; in the code, not released): every store,
wherever its products are (Yallapp's own shop, Shopify, the connected
platforms; `lib/selling/shop-features.ts`), gets the wishlist (a heart on
every card and product page, the Wishlist screen, a guest's hearts on the
phone merged at sign-in), reviews from customers who bought the product
(one each, editable, up to 4 photos into the shop's Media library, a short
name such as "Ahmed K." and never an email or phone, the rating on the
cards and the bars, photos row and first reviews on the product page; the
shop replies once and hides abusive ones in the dashboard's Delivery &
offers › Reviews and in Yallapp Business), "Notify me when it's back" for a
product or the size and colour chosen (the frequent job pushes, adds to the
inbox and emails once it's back; the owner sees who waits for what), and
filters by size, colour, price and brand on the shop's screen and as a
Studio element (`listing_filters`) for every shop type. Yallapp's own
products can be written in Arabic, English and Turkish (name, description,
choices), served in the customer's language. Migration 0152. WordPress
(plugin 0.4.53) has the wishlist, buyers' reviews, back in stock and the
attribute filters; photos with reviews are hosted shops' only. The size
chart and Complete the look now reach shops on connected platforms
(208.19). No `CLIENT_APP_RELEASE` change: older apps see none of it.

Roadmap 211 (Studio's shop types, Shopping & stores: electronics,
mobiles, computers & gaming): three more types ready, each a Studio demo of
the store kind with its two looks, light and dark, its CC0 photos and its
story page: Madar (electronics, Riyadh; A MADAR, B NABD), Nova (mobiles,
Cairo; A NOVA, B emerald) and Nawah (computers & gaming, Jeddah; A NAWAH,
B SILICA), all of fictional brands. New for every store that keeps its
products in Yallapp: a product's specifications (migration 0151), named in
the app's language, on its page and compared side by side; the shop by a
spec; Store › Delivery & offers › Electronics (matching accessories,
trade-in's devices and prices, Build your PC's parts); trade-in requests
that land in Store › Trade-in (migration 0151); Build your PC with its
checks (socket, memory, cooler, power, size); five new Studio elements
(specs table, compare, shop by spec, trade-in, Build your PC) and two flows;
"Installments coming soon" on a product's page, never a way to pay. The
app's preview is rebuilt; no `CLIENT_APP_RELEASE` change (older apps skip
the new elements and open the shop for the new flows).

Roadmap 210 (Studio's shop types, stage 2: home decor, crochet and
handmade, furniture): Sakan (decor: A SAKAN the decor magazine, B TEEN
earth tones), Ghurza (crochet: A GHURZA warm handmade, B HABKA colourful)
and Rukn (furniture: A RUKN white and wood, B KANAF quiet luxury) are ready
on /start?for=studio and Studio's new project, each a kit of real CC0
photos and products with its demo, two looks light and dark, story page and
screenshots. New for every store, each a reusable element: shop the look
(a room photo with tappable products), shop by room or style, a custom-order
request form whose answers land in Store › Custom orders and Yallapp
Business (migration 0150), a product's size in cm and days to make (cards
and product page), the delivery and assembly booking (`delivery_slots`,
kept for the checkout), the maker's story, gifts with a card, the seasons'
banners, and "Installments coming soon" on a furniture product (a tag only).
The app's preview is rebuilt; no `CLIENT_APP_RELEASE` change. Not yet: the
academy's courses served to a store (Ghurza's workshops are products with
seats for now) and turning an accepted request into a paid order.

Roadmap 209 (Studio's shop types, stage 2 A: kids' clothes, cosmetics and
toys): three more types are ready, each a Studio demo of the store kind with
its two approved looks, light and dark, CC0 StockSnap photos, its live demo
and its story page: Toota (kids' clothes, EGP: sizes by age from 0–3 months
to 12 years, girls, boys and baby, newborn gift boxes with wrapping and a
card, ready-made sets; looks TOOTA and MINIMO), Velours (cosmetics, AED:
shades with swatch colours, skin types and brands, ingredients and how to
use, routine bundles, the skin quiz, genuine and expiry; looks VELOURS and
NAQA LAB) and Toot (toys, AED: by age and by type, safety and materials,
birthday gifts with wraps and a card, the gift finder, gifts under 100 and
200; looks TOOT and MUKAAB). New for every app: a product's details
(migration 0149: facts, ingredients, how to use, safety, materials, care,
badges, expiry, ages and swatches; Products › More about it, the product's
page in the app), the size finder, swatches and quiz elements, a product
list's highest price (also in the WordPress plugin), and elements named
like a sub-category opening it. The app's preview is rebuilt; no
`CLIENT_APP_RELEASE` change (older apps skip what is new). Not yet: product
names in the app's other languages, an age filter on the shop's screen, and
the designs' loyalty club, skin scan and children's profiles.

Roadmap 206 (the follow-ups of 157, 158 and 160): plugin 0.4.52 never
makes WordPress wait on Yallapp when an account is deleted (the chat's
forget is queued in WP-Cron with a short timeout and retried), and its
end-to-end checks never call yallapp.com.tr; a WordPress flower shop's
Leqaa pages show its WooCommerce categories, each opening its products, as
hosted shops' do (157.7); every phone number typed without a country code
in the dashboard and the app's orders takes the code the app's sign-in
shows (the shop's country, not the saved +90); and the staff's and second
apps' lists end above the phone's bar (158.7, in app release 16).
158.3, 158.8 and Studio's 7th ring were already done on the integration
branch (181).

Roadmap 106.14 (a designer's public page on Studio Market, the owner's
decision of 23 November): `/designers/<handle>` in English, Arabic and
Turkish shows the designer's photo, name and line (after the team's first
look), their country and links if they choose, their published templates
with prices and ratings, the overall rating, ratings and buyers, and each
buyer's rating with the designer's one reply. Designers set it up in
Designer area › Your page (reserved addresses refused) and answer in
Ratings; an account that got a template rates it once from its page in
Studio and can change it; the team approves photos and lines, hides a
rating or locks a page in Admin › Studio Market › Designers. The market's
cards show the rating and link the designer's name to the page. Migration
0147. The privacy policy and the designer terms now say the page, ratings
and replies are public: after deploy, act on any "Default updated" badge
in Admin › Website content (Phase 172).

Roadmap 213 (Yallapp Business 1.0.5, the money sounds; in the code, not
released: the release waits for the owner): seven more order sounds beside
the 17 of 1.0.4, made from code the same way: Cha-ching, Coins dropping, Till
and bell, Coin chime, Sale made, Piggy bank and Receipt printer, under Money
and sales in Settings › Ringtones, on Android's channels, in iOS pushes and
in the server's list. The 17 are unchanged.

Roadmap 115.21–115.23 (the marketplace audit's three bugs,
docs/plans/2026-11-18-marketplace-audit.md): orders for later reach their
vendor from the frequent job at their time less the vendor's preparation
(with a delay in force), released and announced once even when two runs
overlap, on memory and MariaDB; the four marketplace notifications are
sent through the inbox and push path in the person's language, opening
the right screen (`market_order_update` on each stage, `vendor_order` to
the vendor's staff on a new or released order, `complaint_update` on
support's reply or decision, `club_renewal` 3 days before a kept club plan
ends and on its last day, nothing charged); the customer app opens a
dish's choices before it goes in the basket and sends them with the quote
and the order, and shows them in the basket, the checkout and the order.
No migration and no contract change. Still to check on a real phone: the
pushes arriving (customer app, vendor app, the Vendor tab) and each tap
opening its screen, and the dish sheet on a small screen.

Roadmap 176 (food and delivery apps say the business's own words): Sofra's
and Sahm's Signature looks showed every business made from them the demo's
restaurants and prices in Egyptian pounds, in every language; they are the
demos' facts now, and apps made before are served without them. Served
pages also drop what stood only beside a placeholder (Sofra's "Deliver to"
and its chevron) and ask "Where from?" for a pickup street still to be
written. A food company's restaurants show no delivery fee before its
prices are set; a new company isn't told its couriers worked in its
customers' app. An app started from an App editor demo is served without
the demo's banner line and welcome sentence (Defne Café's hours and
neighbourhoods). No migration, no app build. Not yet on a phone: text size
1.3, a parcel, a café's card order, Yallapp Business (ROADMAP 176.7).

Roadmap 177 (Zad and the classic store, walked end to end): in a project
made from Zad, the bar's Cart, Orders and Account tabs open their own
screens with the bar (the basket had no branch of the shell, so each
opened the next tab's screen and Account threw); the vendor page's aisle
chips go to their aisle, and its search, share and heart work (the heart
saves a place on the phone); a line on sale shows its old price, so an
order's lines add up to Items; one big word on one line ("15%") shrinks at
a larger text size instead of being cut; every Material Symbol is rounded.
On the platform: a business's own app no longer shows a template's coupon
code it doesn't have (Zad's FRESH15 and ZAD20); the marketplace's price
lines, notes and refusals are in Arabic and Turkish; a marketplace's
sign-in opens on its country's code; Dashboard › Vendors names vendors.
A marketplace customer chooses the delivery address on the map (a pin,
or a street found by the map's search) instead of only the phone's
position; the marketplace's and the store's templates pass the template
guard's prices and layout (Zad's third poster without a price in its
words, "Order again" and sliders of words growing with the text size).
The app's part reaches the stores with the next `CLIENT_APP_RELEASE`
(integration branch). Open: the template's tiles opening the search,
"Cash on delivery" with pick-up (ROADMAP 177.11, 177.12).

Roadmap 178 (the rides and taxi templates, tested by hand): Masar Rides
and Lamha Taxi made both ways and walked through in the app preview. Their
homes' car classes (Economy, Comfort and Van "from E£35"; Taxi, Comfort,
XL) were the template's words, whatever vehicle types, fares and currency
the company set: hosted `GET /pages` and Studio's canvas now make them the
company's offered vehicle types, at their smallest fares in Ride settings'
currency, and the pages' version follows them. A drawn map's template
words (Home, Office, Airport, the districts, Pickup) are served in the
language asked for. The app preview may use the location (geolocation=
(self) on /preview-app and the Preview page only). In the app: the
drivers' app preview reads its role (it showed the riders' home), no empty
frosted card without a ride, no second menu and chip under the ride
screen's Studio header, My rides and the driver's lists end above a
floating bar, the glass bar fits at 1.3, Lamha's cream headers show their
buttons, and "No free taxis near you" with none free. Yallapp Business
colours an accepted ride (the driver on the way) in the board's blue.
The home's ride card and living map read the ride again every 15 seconds
while it is on its way, and the riders' app with the review number leaves
out the sample rides the drivers' app makes for it (it couldn't ask for a
ride while the drivers' app was online). A ride nobody took in time is no
longer sent among the rides on their way (the home said "Your driver is
coming" over the ride's "No driver found"), and the template guard's layout
passes on every rides and taxi look: the map's words stay inside it and the
car classes' cards fit at text 1.3, as designed where they fit. No migration; the
app's part needs the next app build (no `CLIENT_APP_RELEASE` change here);
the whole trip with a real driver's phone, real tiles and pushes is still
to try (ROADMAP 178.12).

Roadmap 179 (the education templates, tested by hand): Nakhla School's
look A home ran the template's words in its News pill, which customers'
apps leave out, so every school showed "News" with nothing after it; it now
runs the school's own news to everyone (Dashboard › School › News), newest
first, and goes when there is none. Rawaq Academy's faculty (look A's
index, look B's slides and rings) named the template's four teachers in
every academy; it is now the academy's own active teachers, featured
first, with their subjects and, on B, their newest course, and goes when
there is none. Both are made when the pages are served, so apps already
made from the templates have them with no change to their pages, and the
pages' version follows the news and the teachers. Studio's inspector says
so over them. The academy's and the school's tabs (Teachers, My courses,
the parent's day, the school week) now end above the looks' floating tab
bars (Roadmap 158's `endRoom`); that needs the next app build (no
`CLIENT_APP_RELEASE` change here). Nakhla's "Forms to sign" card showed the
word SIGNATURE on Studio's canvas; its icon is in the site's icon font now.
A row of buttons only (Rawaq B's slides, the classic academy and
university heroes) puts its last buttons on a second line when they don't
fit at a large text, instead of running past the screen; as designed when
they fit (next app build). A faculty entry opens its teacher's page (the
contract's new `Action.teacher_id`; older apps open the Teachers list), a
card's price beside its title is never wider than the card's label, and
Studio's canvas draws the ticker and the faculty with the school's news and
the academy's teachers.
Not yet tried on a phone (ROADMAP 179.9); the WordPress dev site was not
run (179.10).

Roadmap 180 (travel, bookings, events, real estate, news and charity, tested
as a customer): Safra and the classic bookings, events, real estate, news and
charity apps, started from Studio and from their demos. Fixed: a room reserved
from a stays search no longer brings in a flight looked at earlier, and the
trip's Change goes back to the same trip; Track on the flights found reflects
the alert the person has, and off deletes it; the hotels and flights found end
above Android's buttons; the real estate office's reply and a moved
appointment's pushes open their screens (they opened Home), the reply's title
in the app's language; the hosted bookings API writes its home titles and an
appointment's state in the app's language, and the app shows the states, a
home's property type and every flight amenity in its own words; a membership's
price with the customer's currency; Arabic digits and "1.500.000" in the price
filter and the donation amount; the flights' arrows right to left. Open:
Studio's canvas drawing signed-in and signed-out elements together (Safra's
hero), and travel, events, donations and listings prices in the customer's
currency (ROADMAP 180.11–180.13). Needs the next app build (no
`CLIENT_APP_RELEASE` change here); the hosted API part (bookings words, the
reply's title) works for apps already in the stores once deployed.
Then (the coordinator's decisions): Studio's canvas has a Signed in /
Signed out switch, signed out first; travel, events, homes and campaigns
show their prices in the customer's currency (the travel API sends each
price's amount and currency, the contract in both copies); the smaller
ones fixed; Safra's homes fit text 1.3 (the template guard passes for
the travel demo and both Signature looks); and a walk of each kind in the
app found and fixed six more: a gym from the demo without classes until
the next day, the checkout offering a payment the company can't take,
Safra's empty cover for a signed-in person without a trip, photo
headers' titles unreadable, the flights' search and the account's phone
broken at 1.3, and a one-word section title broken (ROADMAP 180.11–180.23).
An e2e spec takes Safra from Studio to a booked stay.

Roadmap 181 (what 157 to 163 left open for Leqaa and Kech Flora): under a
premium header that folds as the page scrolls, a quick fling now ends at
the page's end on Android and the iPhone (it could stop up to about 10
points short on a page a little longer than the screen, as the fold moved
the end; 158.3). Settings' plain choice sheet (the language in an app
without a premium look, an academy's video quality and speed) scrolls to
its last choice above the phone's bar (158.8). In Studio's canvas a row of
more than 6 story rings scrolls as the app's does, and a click on any ring
picks its story, marked there and in the inspector (the dashboard's rings
once the owner saved Dashboard › Stories, 165, with its note). Studio ›
Screens says under each Arabic and Turkish text whether the app shows the
owner's own translation, Yallapp's or the owner's main text, as the page
inspector does. No migration; the app's part comes with the next app build
(no `CLIENT_APP_RELEASE` change here); not yet tried on a phone (ROADMAP
181.5, 181.6).
Roadmap 208 (Studio's shop types, stage 1: the foundation and Clothes):
the planning doc's shop types are in one registry (`lib/studio/shop-types.ts`)
by section (Fashion; Beauty & care; Home & living; Kids & toys; Shopping &
stores) on /start?for=studio and Studio's new project, Clothes ready and
the other nine coming soon (not to choose). Clothes is Lujain, a Studio demo
of the store kind with its two looks, A LUJAIN (black and white) and B NOUN
(streetwear), light and dark, 62 CC0 StockSnap photos, 46 pieces in their
sizes and colours with the stock of each, 8 categories and 17
sub-categories, its story page and its drawn icon. New for every store: sub-categories
in Store › Categories (migration 0148), the category menu element (every
main category a row of cards with its sub-categories, opened by the
header's menu button through `StudioHeader.menu_page`), the size chart
element and a product's size guide, sizes gone in the colour chosen,
"Complete the look", the shop's exchanges under the price (Store ›
Delivery & offers › Clothes for the chart and Complete the look), the
"Installments coming soon" tag, and the liability notice a shop type's
project accepts once ("قرأت وموافق", `App.liabilityAccepted`). The app's
preview is rebuilt; no `CLIENT_APP_RELEASE` change (older apps skip the new
element, draw the menu as chips and keep the side menu). Not yet: a
store's wishlist, reviews with photos, back in stock, filters by size,
colour and price, and the size chart and Complete the look from WordPress
and connected platforms (208.19).

Roadmap 207 (Yallapp Business 1.0.4, ringtones; in the code, not released:
the release waits for the owner): new orders ring until opened, like a call.
Seventeen ringtones of Yallapp's own, made from code
(`business/tool/ringtones.py`), and Settings › Ringtones: a sound for new
orders, bookings, cancelled orders, messages and the rest, orders and
bookings ringing until opened for at most 1 to 10 minutes, vibration,
Android's alarm volume, the in-app volume, quiet hours (everything but
orders silent) and a test ring. A phone that saved its ringtones
(`PUT /me/push-sounds`, `owner_devices.push_sounds`, migration 0146) gets
its pushes worded for them: Android as data only, shown by the app itself on
the sound's own channel and ringing on (`Ringing.kt`); iOS with the bundled
sound (25 seconds when it rings on) and time-sensitive orders; an older app
as before. While the app is open a ringing card sits over every screen with
Silence and Open. New pushes: a marketplace order reaching its vendor and an
order a customer cancelled. The review's additions: order search (number,
name, phone, email; `GET …/orders?q=`), marking an order shipped with its
carrier and tracking, copying or sending an order's details, finding a
product, lists that show what changed, one tap at a time on an order's
buttons, digits typed on an Arabic keyboard everywhere, right-to-left
paddings. Not tried on a real phone here: the Android receiver was compiled
against Android 14's framework, the iOS sounds bundled in the project; a
push to a real device needs Yallapp Business's Firebase project.

Roadmap 203 (Yallapp Business on the website): the owners' own app is on
the App Store and Google Play, and its two store links (one module,
`lib/business-app.ts`) are on the home page in a Yallapp Business section,
in the footer, in its docs article, on the dashboard's Your phones and in
Studio's account menu, as buttons of our own that open the store in a new
tab; in English, Arabic and Turkish, light and dark.

Roadmap 202 (old build files leave the files host): the daily job keeps
only each app's latest ready build's files (per app and variant, Android
and iPhone) and removes every older build's folder from
files.yallapp.com.tr; once the latest build is uploaded to Google Play or
the App Store and the app is live there, the Builds page shows the store's
link in place of its files, and the folder goes when nothing in it is
needed (the upload key keeps it). A new build's files stay until it's on
the store; nothing still building or uploading is touched.

Roadmap 200.3: the app asks for a forgotten password's email code as one,
so its email is worded for a new password (in the next app release).

Roadmap 190 (Yallapp's Studio demos in Studio Market, free): every look a
new Studio project starts from on /start?for=studio, each Studio demo's
Signature looks A and B (twenty), is a published, free template by
"Yallapp" in the dashboard's market and on /templates, with its cover, its
English, Arabic and Turkish texts and its kinds, found by Free, the kinds
and a search. Applied, the buyer's project gets what a new project from
that look starts with (its pages, tabs, bar, colours, fonts and screens'
looks, the buyer's app's name where the demo writes the app's), with a free
licence and back to the previous design as any template. They're seeded on
read where the market is read, by fixed ids (the same code finds the same
rows; a demo changed in code is a new version buyers get as an update), on
Yallapp's designer profile of the demo account (no account made, no
migration); never a designer's template, nor any money, payout or review.
They show once Admin › Demo apps has made the demo account; suspending the
Yallapp designer takes them off. The e2e case wasn't run here.

Roadmap 191 (Studio Market lives in Studio): the market's pages are in
Studio's own frame (/studio/market, a template, My templates, checkout), in
Studio's menu (Browse templates, My templates) and on
Studio's bar; the regular dashboard has none of it, its old addresses open
the same page in Studio. The website's header has Studio Market on its bar on wide screens;
the footer and Studio's list had it already.

Roadmap 201 (the links the stores ask for): at the top of Publishing, the
app's delete account page, privacy policy and support email, each with
Copy.

Roadmap 200 (the "how to pay" email in the receipt's look): a customer who
chose a bank transfer or cash on delivery gets the business's details in
the app's premium look, in their language. Every other email (shipped,
refunded, reminders, Yallapp's own) is sent in the same look too: the
app's logo and colour to its customers, Yallapp's to clients.

Roadmap 199 (the app's emails to its users in the receipt's look): a
welcome after signing up in an app with an email address, and the code
email (signing in, a forgotten password), both in the app's logo, name and
colour, light and dark, in the customer's language.

Roadmap 198 (the customer's receipt email in the business's look): after
paying, the customer gets a premium email in the business's look (its
logo, its colour, light and dark) in their language, the order as a card,
and the receipt as the attached PDF, with no link.
Roadmap 197 ("Added to cart" goes away by itself): the message with its
View cart stayed on the screen until closed (Flutter keeps a message with
an action); it now goes away like any other, on a card's Add to cart, a
product's page and a class's See plans. App release 14.
Roadmap 195 (no page fails with "Queue limit reached"): Admin › Builds
looked up each of its up to 200 builds' client, user and app at once, and
the documentation's menu and search each of its 73 articles, past the 50
queries the site's one database connection let wait, failing the page
and the session read with it. The build queue now looks each up once, ten
at a time, the documentation reads its articles in one query, and up to
1000 queries may wait.
Roadmap 196 (a finished build is never left on "building"): the
pipeline asks the platform again on a 500 (six tries, about two minutes),
and a build that reported nothing for three hours (was six) is stalled,
so Try again comes back sooner.

Roadmap 193 (Add to cart under every product, on Leqaa's looks): on a
store with the gift checkout (Leqaa's looks, Kech Flora), every product's
card keeps its look and gets Add to cart under it, on the shop's grid, the
home's rows, "You may also like" and every Studio list of products, and on
Studio's canvas. A product with nothing to choose goes straight in the cart
with "Added to cart"; one with sizes or options opens its page; out of
stock, the button is off. The shop's grid goes row by row, so a card's
price sits right under its name, level across the row, with no empty
band between them. `CLIENT_APP_RELEASE` is 13 (12 is #473's); the
preview rebuilt. No migration.

Roadmap 183 (`brand`'s Start now opens the app's main screen): the
template for every kind of project served its hero's "Start now" opening
nothing. Each kind now has a main screen (`mainScreenOf`, lib/app/kinds.ts):
a shop's and a marketplace's `search`, a restaurant's menu (`search`), a
food company's restaurants, an academy's courses, a booking kind's
services (a gym's classes), events, listings, articles, campaigns,
travel's Explore, the ride, a school's School screen (there is no Today
screen) and a delivery's Send a parcel. A project made from `brand` opens
it; hosted `GET /pages` gives it to a Studio page's button that names
nothing, so projects made before are fixed with no change to their pages;
the owner's own link always wins, and a list's card's buttons are left
alone. Studio's inspector shows "Opens: <the screen>" for such a button.
No migration, no contract change, no `CLIENT_APP_RELEASE` change. The
guard's `brand` tap check passes; its fixtures need regenerating on the
guard's branch (ROADMAP 183.6).

Roadmap 185 (client Android builds survive a busy Maven Central): the
client builds in `build-apps.yml` keep Gradle's downloaded dependencies
and wrapper in a cache shared by every client (`~/.gradle/caches/modules-2`
and `~/.gradle/wrapper/dists` only: no build outputs, nothing of a client's
config or keys), so three builds at once no longer each fetch them from
Maven Central and the Gradle Plugin Portal, which answered 429 Too Many
Requests on 18 November and failed a client's store build. When a build
still fails on a download (429, a 5xx, a timeout), `flutter build apk` and
`flutter build appbundle` run again after 30 s, 90 s and 180 s
(`build/scripts/network_retry.py`), each retry said in the build log; any
other failure fails at once as before. The iPhone build uses Swift Package
Manager, not CocoaPods, and is unchanged; mobile CI's debug APKs keep their
own Gradle cache. Signing, uploads and AUTO_PUBLISH are unchanged. Not yet
run on the runners (ROADMAP 185.5).

Roadmap 192 (client Android release builds past Stripe's private
dependency): a client's release build stopped in lint's vital pass, which
asked for Google's play-services-tapandpay (flutter_stripe's push
provisioning brings it; it is on no public repository). Release builds skip
lint and that artifact is left out of the libraries' lint checks; CI now
builds a release APK as client builds do.

Roadmap 189 (the hero's slides, plain to find in Studio): with a slider,
one of its slides or anything on one selected, the right side lists its
slides as the layers do, the open one with its icon, words and button, each
to select; whatever is picked on slide 2 or 3, on the left, the right or the
phone, is the slide the phone shows. On the canvas every slider has arrows to
the slide before and after and "Slide 2 of 5". Once Dashboard › Stories is
saved (until then the app shows the slides designed in Studio), a slider of
the app's stories says its slides are changed there, with "Edit the slides
in Stories". Studio's editor only: no app build.

Roadmap 188 (Stripe's PaymentSheet in the apps): the payment page stays
inside the app's web view, and a Stripe payment there is taken by Stripe's
native bottom sheet in the app, with the card, Google Pay on Android and
Apple Pay on iPhone (with the owner's Apple Pay merchant ID, Payments ›
Stripe). The platform makes one PaymentIntent per order on the owner's own
Stripe account (`POST /pay/<token>/sheet`), never alongside a Checkout
Session that could be paid too, and settles it only once read back from
Stripe (the status the app reads, and the webhook's
`payment_intent.succeeded`). A browser, the app preview and the apps already
on phones keep Stripe's form in the page. 170's browser sheet is dormant.
It reaches the apps with app release 11 (`CLIENT_APP_RELEASE` 11, the
preview rebuilt); not yet built for Android or iOS here, nor tried on real
phones (ROADMAP 188.6 to 188.9).

Roadmap 175 (the dashboard QA fixes of 18 November, a flower shop in MAD):
Cancel order on a paid order asks first, and the owner chooses every time
between "Cancel and refund {amount}" (through the order's payment gateway,
else Needs a refund) and "Cancel without refund", in the dashboard and in
Yallapp Business; the units go back in stock, the customer is told (a guest
by email), and the order leaves the paid orders and Analytics' revenue. The
Owner API takes the choice as `refund` (an older Business without it keeps
132's rule). A guest customer is now emailed at every stage the order
drawer promises (shipped, postponed, couldn't be delivered, delivered) and
when the order is cancelled, in the language they checked out in. A new
store currency asks to convert every price at the day's rate or keep the
numbers, and the Team page logs the change. A new shop starts in its
owner's country's currency and delivery time zone (+212: MAD,
Africa/Casablanca); Studio's gift checkout sample is drawn in the shop's
currency, country and city, dated from today. The products list shows the
price the app serves; the shop's pages and Yallapp Business write amounts
in the viewer's language (د.م. in Arabic, Latin digits), and amounts typed
with Arabic-Indic digits are read. Categories refuse a duplicate name and
have optional Arabic and Turkish names, served in the app's language;
Products › Settings is in Studio's breadcrumb. Migration
`0145_catalog_category_names` (after main's 0143 and 0144). Yallapp Business
places add-ons under their own size, says when a signed card has no name,
offers Postpone and Retry days from the shop's today, and the server
refuses a full or closed time. Nothing is released from this branch, and
`mobile/` is unchanged. Yallapp Business is not released from this
branch.

Roadmap 187 (no paid plan, no app and no publishing request): an app
without a paid plan running now (never paid, or its plan ended) can't
download its files (APK, AAB, IPA, store files; the Android upload key stays
the owner's), and its "Publish it for me" reaches nobody on our team: the
dashboard says the request goes out once the app has a plan, Admin ›
Publishing keeps such requests under "Waiting for a plan", and the team is
emailed when the plan is paid. Builds already needed the plan.

Roadmap 186 (the payment page back inside the app): on the owner's word,
Yallapp's payment page opens inside the app again, in the app's own web
view, not the phone's browser sheet (170). Done on the platform, so the apps
already on phones take it with no new build: the apps are handed the page's
`/pay/<token>/in-app`, which goes on to the page, and release 10's apps open
only the page itself in the sheet. Apple Pay and Google Pay don't show
inside the app's view; the card and the other ways to pay work as before
170. Not yet tried on real phones (ROADMAP 186.2).

Roadmap 170 (paying in the app in the phone's browser sheet, closing
155.6): inside the apps, Yallapp's payment page opens in the phone's browser
sheet over the app (SFSafariViewController on iPhone, Chrome Custom Tabs on
Android) instead of the app's web view, for every gateway, so Apple Pay and
Google Pay show and the card forms and gateways' pages work as in any
browser. The app opens `/pay/<token>/app`, which marks the payment as the
app's (a cookie kept to that payment's pages, no secret); its done, failed,
pending and closed pages then give "Back to the app" on the app's own
address (`yallapp-<app id>://app/pay-return`, registered by each build),
by itself once paid. The app never trusts the link: it reads
`/pay/<token>/status` on the link, on coming back and every few seconds
while the sheet is open, then closes the sheet and opens the order as
before, or says the payment isn't confirmed yet, wasn't made, or the order
is closed; never "failed" for a paid order. A shop's own website checkout,
donations' pages, the preview and older builds keep the web view;
it reaches the apps with app release 10 (`CLIENT_APP_RELEASE` 10). Not yet
tried on real phones (ROADMAP 170.8, LAUNCH-CHECKLIST Phase 170).

Roadmap 174 (Studio's QA on Leqaa's flower shop, fixed at the root):
"Pill" corners save again. The preset stored 999, above the server's
limit of 500, so the bar said "Not saved", later edits were lost on
reload and Publish stayed off; Pill is now 500 (a pill on anything up to
1000 px high, on the canvas and in the app), and larger corners already
in an editor are brought down to 500 when saved instead of refused. A
selected element's corners are drawn over the phone, so rounded buttons,
chips, cards and full-width rows can be resized again. The app lays out a
column left on Auto inside a row as the canvas does, instead of dropping
the whole row (in `mobile/`: it needs the next app build). The Motion tab
says when the plan leaves motion out and what a plan with it turns on.
Texts still the template's [placeholders] are said before and after
Publish and listed under What's missing with a jump to each. The canvas
marks the demo's coupon and a sample flash sale as samples, in the shop's
currency; a review's Stars show 5; and the report's minor Studio bugs are
fixed (ROADMAP 174.8). No migration. Not yet seen on a phone (ROADMAP
174.9).

Roadmap 157 (the template's categories are the shop's): Leqaa's occasion
rings, chips and ticker and its collections' bento, arches and cards were
the template's own words, opening the whole shop, whatever categories the
owner added. Hosted `GET /pages` now serves such a list, left as the
template made it, as the shop's categories: once the owner has their own,
one entry per category with its name as the shop has it in every
language, its photo and a tap that opens the shop filtered to it; until
then the template's. On any Studio page, an element that opens the shop
and is named like one of its categories opens that category (the demo's
own on an app started from it), and Studio's "When the customer taps"
lets the owner pick the category of any tile, ring or chip. Made at
serving time, so apps already made from the template have it with no
change to their pages. The shop's list leaves the demo's categories out
once the owner has one (a renamed demo category is theirs); the pages'
version follows the categories, so an open app asks for its pages again;
Studio's canvas draws the lists as the app does. `CLIENT_APP_RELEASE` 9:
the app opens the category (an older app the whole shop) and asks for the
shop's chips again when it comes back on screen.

Roadmap 158 (every page scrolls to its end, on every phone): the app's own
screens under a tab bar that floats over them (Leqaa's and Kech Flora's
petal, the floating pill, the dock, glass off the edges) end their lists
above it, as Studio pages did: the shop's grid, the Account screens' lists
and the other tabs' paginated lists, with one shared space (`endRoom`,
MediaQuery's bottom padding), so their last rows no longer stay under the
bar on a short phone. Studio pages over the tabs end above the phone's own
bar (home indicator, Android's navigation bar) and above what is pinned at
their foot (a sticky "Send flowers"). The sort and choice sheets scroll
to their last choice on a short phone or with a large font, and the shop's
next-page spinner lies across the grid, in its middle. The shop's filters
that are on stay first in their row, in sight, and "No products found" has
Clear filters. It reaches the stores with the release the urgent fixes
share. Not yet tried on a phone. Still open: on a page a little longer
than the screen under a folding premium header, a quick drag can stop a
few points short of the end, the last row still in sight (ROADMAP 158.3);
the staff's and second apps' tabs take the same space since 206.5 (158.7).

Roadmap 159 (sizes automatic, by hand only when asked): Kech Flora's bag
sat about three quarters of the way across the phone because the bar over
the stories had a width in points from a corner drag on Studio's phone
(a drag never became Fill there: the corner measured an empty wrapper), and
the app keeps a width in points. A cover's top bar is now at its automatic
size, across the cover with its wordmark between the buttons, in Studio's
canvas, in what the hosted API serves (so apps already on phones draw it at
once) and in the app (with the next `CLIENT_APP_RELEASE`), whatever width it had, unless
it was sized by hand. Every element's size is automatic until the owner
changes it: the size fields and the canvas corners ask first, "Back to
automatic" (or a double click on a corner) puts the template's size back,
and a corner dragged up to the edge becomes Fill again. WordPress apps keep
a size by hand with the next plugin release. With the next app release a round button
without words (the search, the bag) tells a screen reader what it opens
("Search", "Cart") in the app's language, or the owner's name for it, not
just "button". Not yet seen on Kech Flora's phone.

Roadmap 160 (sign-in as the owner's four ways say, and Forgot password): a
phone number or an email address signs in with a code every time ("…and a
code": no password anywhere) or with its password ("…and password": the
code only checks a new account once, which must set a password, and resets
a forgotten one), never both: the hosted API reads a choice saved with both
as the password, and App sign-in turns the other off and refuses both on a
channel. The app shows each way in once with what it signs in with; "Sign
in with a code instead" is gone. A sign-in opened over the app (the page
headers' bell, the cart) closes once signed in and opens what it was
opened for: its screens stayed before, and "Forgot password" tapped there
opened Notifications. Forgot password opens the reset for the way in use,
in every sign-in look. The code the phone number starts with follows the
app: the owner's choice, else the shop's country (where it delivers, else
its currency), else the owner's, then +90 (a MAD shop delivering to Morocco
opened on +90). The app's part reaches the stores with
`CLIENT_APP_RELEASE` 9. Not yet tried on a phone (ROADMAP 160.7).

Roadmap 161 (the whole app in the customer's currency, and a story's
Open): the hosted API sends every price of Yallapp's own with its amount,
currency and `display` in the customer's currency, the home's Studio lists
too (`GET /pages`, each card's `price`, its sale, the flash sale, the
coupon, plans), and the cart's lines and sums, fees, slots, points, options
and orders; the app shows each in the customer's currency ("≈", as the
shop's products), the owner's switch and list respected, what is charged
unchanged. A story's Open opens its link, or in a shop the shop, never
nothing (which left the customer on Home); a shop's story with a link that
opens nothing is served opening the shop, so older apps follow. Studio says
what a story's Open opens. `CLIENT_APP_RELEASE` is 9: apps get a build.
Prices a template wrote into its own words stay as written (ROADMAP 161.8).
Not yet tried on Kech Flora (ROADMAP 161.10). No migration.

Roadmap 162 (Build your bouquet): a store's owner sets it up in Store ›
Delivery & offers › Build your bouquet (the flowers' category, the wraps
from gift add-ons or a category, the cards, whether the wrap and the card
may be left out, the least and most stems). Leqaa's Build your bouquet
sections then open it from their Start (`Action.flow: bouquet`): the
flowers by the stem with the live total, one wrap, the card and its words
with the occasions' ready messages, the summary, and the bouquet goes in
the cart as one group of lines (`bouquet` on each line), priced by the
server as any cart, kept on the order and shown as one in the cart, the
customer's order, the dashboard and Yallapp Business. A shop that hasn't
set it up, an older app and WordPress keep today's Start: the shop.
Leqaa's demo has it on. `CLIENT_APP_RELEASE` is 9 (after 152's 7 and 163's 8).

Roadmap 164 (a bound list of products is never an empty section): Leqaa's
"Picked for you" was bound to featured products, which a real shop may not
have, so the served page dropped the list and kept its title and "Shop all"
over nothing. Served now with the shop's best sellers, else its newest, when
what a list is bound to has nothing (featured, a category, picks, a
template's sample products); a list with nothing at all goes with its title,
in the served page and in the app (`heads`, `CLIENT_APP_RELEASE` 9). The apps
already made from the template are right without any edit. Studio's
inspector chooses what such a list shows: featured, a category, a
collection, best sellers or newest. The "Our bouquet" page no longer shows
the template's sample "Blush Garden": it is one of the shop's products, the
one the owner picks, else the best seller, else the newest, and goes when
the shop has none; apps made before are served the same.

Roadmap 165 (Dashboard › Stories): the full-screen stories and story rings
of an app's home are the app's own data (`app_stories`, migration 0144),
managed in Dashboard › Stories (and in a Studio project's frame): added,
changed, switched off, scheduled, reordered and removed, each with its
photo or video, its words in the main language with Arabic and Turkish
beside it, the ring's name and icon, its button and what it opens, and its
category, with a live preview. `GET /pages/{slug}` serves them into the
Studio elements whose source is the dashboard (Leqaa's hero slides, rings
and look B's chips by default), in the language asked for, so the apps in
the stores show the changes without a build; a button with nothing chosen
opens the shop. An app made from the template has its Studio stories
copied there once, the first time they're needed, nothing it shows
changing. Studio says where the stories come from, switches the source and
draws them. `CLIENT_APP_RELEASE` 9: the viewer shows each story's words,
button and video, and a button opens the shop on a category; older apps
show the ring's name and photo and open the shop. Not yet checked on
Leqaa's and Kech Flora's real projects (ROADMAP 165.10).

Roadmap 167 (Sign out always there, whatever draws the Account): Leqaa's
and Kech Flora's Account had Sign out under the floating petal bar, where
it couldn't be reached. Every Account look now ends above a bar that floats
over it, Sign out asks first and signs out, a Studio page on the Account tab
without the account screen ends with Sign out and Delete account, and
Studio has a Sign out element, which every template's account page has.
Delete account stays in Settings, which every look lists. `CLIENT_APP_RELEASE`
8 rebuilds the apps; to check on a phone (ROADMAP 167.8).

Roadmap 168 (the gift checkout end to end): a flower shop made from Leqaa,
in dirhams and priced by distance, walked from the product to the
delivered order in English and Arabic. Fixed: the cart's total no longer
loses the delivery while the chosen day waits for its time; the shipping
breakdown is in the customer's language; the payment page takes a gift
without a city the order never had; the owner opens the customer's pin on
a map; and "How your flowers travel" stays on an order just delivered
instead of going back to "Order placed". `CLIENT_APP_RELEASE` 7. Still
open (ROADMAP 168.6–168.10): the pin without the platform's map, the
payment page in Arabic, and the dashboard's times in UTC. The notes:
docs/qa/2026-11-18-gift-checkout/NOTES.md.

Roadmap 169 (the flower apps in Arabic and Turkish): a shop's, a flower
shop's and every other kind's shared screens say their own words, not an
academy's (the notifications' empty state, updating the app, deleting the
account, "contact the academy", course files), in English, Arabic and
Turkish. Capitals follow the language (Turkish "AŞK İÇİN", not "AŞK
IÇIN") through one helper, in Studio's capitals, kickers, labels and
initials. The card's "Beginnings to tap" have a field per app language in
Delivery & offers › Gifts, sent by language in `StoreConfig` and shown in
the customer's; saved ones stay the main language's. Every screen of both
looks was walked in Arabic (day and night) and Turkish: a gift's delivery
in the cart's summary is "Delivery fee", not "Shipping". Not yet in a rebuilt
app (ROADMAP 169.6); the plugin's stay one field (169.5).

Roadmap 171 (the Orders tab keeps the tab bar): in Leqaa's app (both
looks, the petal bar), the Orders tab opened Orders on top, without the bar,
because a store's orders live under Account (`/account/orders`), not among
its tab places. Now a tab of the orders, the notifications, the settings,
the chat or an academy's teachers (Rawaq Academy's Teachers tab) shows its
screen in its place with the bar under it, in every app type; an order
opened from there covers the bar and Back returns to the tab. And "How your
flowers travel" with no order showed a sample journey, "Order placed" lit:
now it, its card and its heading show only with an order, at that order's
own step. From `CLIENT_APP_RELEASE` 9. Not yet tried on a phone (ROADMAP
171.7).

Roadmap 173 (an order shows its delivery, its card and its amounts): in
Leqaa's app an order showed its lines and its total only (360 + 120 against
482). The order screen now shows the delivery (the day and the time, in the
shop's time, the recipient and the address), the gift card (its message and
who sends it, only when there is one) and the totals that add up: the
subtotal, the coupon with its code, the points, the delivery for its zone,
the delivery time's fee, other fees and the tax, then the total. The
contract's new `Order.amounts` comes from hosted shops (`GET /me/orders`)
and from WordPress with plugin 0.4.51 (WooCommerce's coupon, shipping, fee
and tax lines); `delivery.recipient` adds the city. Older apps ignore it;
older servers leave it out and the app shows the lines and the total as
before. Needs the next app build (no `CLIENT_APP_RELEASE` change here) and
plugin 0.4.51 released; not yet tried on a phone (ROADMAP 173.6).

Roadmap 156 (what the owner publishes in Studio is what the app shows, in
every language): a template's translations of its own words stop applying
once the owner changes the text, so the app shows the owner's text in
every language (Kech Flora's review in English no longer shows the
template's Arabic placeholders on an Arabic phone); a template's
[placeholder] gives way to the owner's words in another language;
translations the owner wrote stay. Applied when serving (hosted
`GET /pages`, the plugin's layout, `Config.screens` for Studio › Screens'
texts, with a new version so apps and plugins fetch it again) and when
saving; Studio says what each language shows and which is the main one.
No template [placeholder] reaches a customer either: the same-day cut-off
fills Leqaa's "Order before [your cut-off time]", and an element or a
review whose words are still a placeholder waits for the owner's (Studio
says so under the field); a project started from a demo no longer shows
the demo's facts (Leqaa's "anywhere in Cairo" in a shop in Morocco).
The path itself (Publish, the published layout, `GET /pages`, its ETag,
the app's reload) was checked end to end and carries every edit. Admin ›
Demo apps asks before Refresh, which puts back a demo's own design over
any Studio edit. No migration, no app build. Not yet seen on a phone
(ROADMAP 156.10).

Roadmap 106.11, payouts on the 1st (the owner's answer, 18 November): the
payout of the 1st covers the sales paid up to the end of the month before,
cut off at midnight Istanbul time; a sale paid on the 1st or later waits for
the next 1st. Earnings says "Next payout · 1 December" with the sales it
includes and what counts toward the 1st after; Admin › Studio Market ›
Payouts shows that month's run from the 1st and prepares only the balance
before the cut-off; the daily job alerts the team on the 1st (Admin ›
Watching, emailed once). The privacy policy (en/ar/tr) and the designer
terms say what's kept for payouts and when it's paid (the owner's approved
text).

Roadmap 106.11 (Studio Market, the designer's money): each paid template
sale is written once in the designer's ledger with its split (the sale,
Yallapp's 25%, their exact 75%, in whole cents). The designer area's
Earnings shows the balance available, pending and paid out, each sale's
split and the payouts with their receipts (a page and a PDF, in the
designer's language). Before the first payout (not before publishing) the
designer sends their ID with a photo of it and their bank for SWIFT; the ID
number and the account are encrypted with the platform's key and shown
masked except to the new `market.payouts` permission (owners and admins).
Admin › Studio Market › Payout checks approves them or asks for a fix;
Payouts lists the month's due (USD 250 or more, checks approved, monthly;
below that the balance carries over), prepares the bank file (CSV), and
records each transfer the team sends from Yallapp's bank with Mark as sent
(the designer emailed a receipt). Nothing is sent by the platform.
Migration `0142_studio_market_money`; the first real payout is to be
checked by hand (LAUNCH-CHECKLIST, Phase 106.11).

Roadmap 106.12 (Studio Market's discounts): designers make price drops,
flash sales and coupon codes on their paid templates (Designer area ›
Discounts), each an amount or a percentage off some or all plans, lifetime
too, from a start to an end in their time zone; a code has an optional
usage limit, counted on paid orders. The market's cards show the
discounted "From $X/mo" with the old price struck through, a new flash
strip lists the templates on a flash sale now with a live countdown, and
checkout takes a code (any case) with the original price, the discount and
the total. Nothing stacks: the buyer gets the better of the automatic
price or the code. The server works the price out again at Pay; the
order's gross is the price paid, so the 75/25 split is of it. A discount
never takes a plan below $1 (100% off is $1). Migration 0143.

Roadmap 106.13 (Studio Market on the website): `/templates` (`/ar/templates`,
`/tr/templates`) shows visitors who aren't signed in the published
templates, in the market's two looks with the site's light and dark:
search, app kinds, price and order, the featured template, the flash
strip, new this week, the most applied and the top designers, with the
dashboard's cards and price rules ("From $X/mo", "$X once", "Free", the old
price struck through with the Sale or Flash sale pill and its countdown;
the plan prices and price words now come from one place,
`lib/studio-market/listing.ts`, for the dashboard and the website). A
template's page (`/templates/<slug>`) draws its pages in phones in the
visitor's language, light and dark, with each plan's price now, what
happens when a plan ends, what's included, the designer (their public name
and line only), "Try the demo", and buttons to the dashboard's checkout
for the plan or "Preview it on my app first": straight there when signed
in, through sign-up or sign-in first otherwise (a cookie for an hour,
`yallapp_market_next`, that only names those dashboard addresses). The
Arabic is Modern Standard Arabic. Metadata, Open Graph images, canonical
and hreflang per language; JSON-LD ItemList and Product with an Offer per
plan; each published template in the sitemap in each language; a template
not published, or whose designer is suspended, is "page not found" and
isn't listed. In the header's Studio list, the footer and /demo/studio; a
docs article (`/docs/studio-market`) for owners and designers and four FAQ
questions, in three languages. No migration. A designer's own public page
isn't built: the privacy policy doesn't say a designer's profile is public
(see the roadmap).

The plugin's end-to-end job (WordPress + Tutor LMS) no longer loses a check
about a minute into its run (main #449 and #450, PR #454): the dev site runs
no WP-Cron of its own (`DISABLE_WP_CRON`). WP-CLI took WordPress's cron lock
while building the site; 60 seconds later the next request started
wp-cron.php in the built-in server's only worker, with WordPress's update
checks to api.wordpress.org (30 seconds each in cron, then again over plain
HTTP), and the check waiting behind it timed out after 60 seconds. The suite
now takes about a minute, so slower runners crossed that point. The checks
call the cron jobs they test themselves, and the job shows the PHP log when
it fails. Test only: the plugin stays 0.4.50.

Roadmap 152 (Our bouquet's chips and button open the product the owner
links): in Leqaa's looks and the apps made from them (Kech Flora), the
bouquet's size chips and "Choose this bouquet" open the shop until the
owner links each to one of their products in Studio ("When the customer
taps": A product, from the app's own products, with the hint that without
one it opens the shop). A linked one opens its product; one with no product
chosen, or whose product the shop no longer has, opens the shop: hosted
`GET /pages` sends both as the shop, so apps already in the stores follow
it, and the app does the same from `CLIENT_APP_RELEASE` 7 (WooCommerce
stores' pages too). Not yet tried on a phone (ROADMAP 152.7).

Roadmap 155 (Apple Pay and Google Pay in Stripe's form): the payment page
(`/pay/…`) lets the page and Stripe's frames use the Payment Request API
(`payment=(self "https://js.stripe.com" "https://checkout.stripe.com")`, as
Stripe's Google Pay guide gives it); every other page keeps `payment=()`.
The page's domain is registered in each shop's own Stripe account with its
own key (Payment Method Domains), when its Stripe keys are saved or tested
and once before Stripe's form if it isn't yet; the answer is kept on the
shop's payment settings, and a failure never stops a card payment (noted
for the team). Payments says "Apple Pay and Google Pay: ready" or why not
yet. Inside the apps they show from Roadmap 170 (the browser sheet).
Not yet tried with a real Stripe account on real
devices (ROADMAP 155.7).

Roadmap 172 (a saved legal page that lacks the default's new text): Admin ›
Website content notices when the team's saved version of the privacy
policy, terms or refund policy, in any language, lacks sentences Yallapp's
default text added since the version it was based on: a badge in the list
and, on the page, "Yallapp's default text for this page was updated on …".
"Review the changes" lists each new or changed paragraph with the new
sentences highlighted; "Add the new text" puts them into the team's text
at the places the default has them (or between two ==== lines for the team
to place, which a save refuses), and nothing is published until Save. A
save keeps the default's version it was based on with the page's fields
(no migration); versions saved before are taken as based on the default
before 18 November 2026. The default's earlier versions come from git
(`scripts/legal-history.mjs` writes `src/content/legal-history.ts`; run it
after changing a legal page's default, a unit test says so).

Roadmap 151 (an iPhone build GitHub had no Mac for): when GitHub cancels
the iOS job in its queue before any step runs, the report says so as its
own reason (`ios_no_mac_runner`, read from the run's jobs), not a build
failure; the Android app is as before. Builds & downloads tells the owner,
without technical words and in their language, that it's a temporary
problem on our side and offers iPhone only; the admin shows the technical
cause and the team gets one alert per build. Nothing retries it. Every
iPhone failure now says its cause in plain words with where to fix it,
and the iPhone app's build output is for the admin only.

Roadmap 163 (Studio pages on a Samsung's settings): Leqaa's signature
template, every page of both looks, is drawn by the real app in tests at
font scales 1.0 to 1.5, display zoom (360, 384, 412 points) and both
navigation bars, Arabic and English, light and dark. Arabic text in Studio
pages is never under a 1.5 line, so the Orders title no longer draws over
the journey's card; a photo cover grows with its words; a row's last text
gives way (one that shows something, so a long price with no sale
shrinks); a testimonial's quote mark isn't cut; the flash sale's title
wraps; the folding header no longer redraws during layout.
`CLIENT_APP_RELEASE` is 8 (after 152's 7). Lists whose last items stay under the tab bar (Account, Bouquets, Picks) and the Orders empty
state under the phone's bar are `wip-page-scroll`'s (ROADMAP 163.7). The
journey's card offset in right-to-left wasn't reproduced (163.8).

Roadmap 153 (the card inside the payment page for iyzico and Kashier): as
with Stripe (144), Yallapp's payment page shows the gateway's own card form
under the customer's details: iyzico's Checkout Form (the script iyzico
answers with the payment) and Kashier's payment session in a frame, the same
payment our server starts, read back, confirmed and refunded as before; when
the form can't load, the gateway's own page, the same payment. Fawaterk and
PayPal keep their own pages (ROADMAP 153.7, 153.8). Not yet tried with real
iyzico and Kashier test accounts (ROADMAP 153.9).

Roadmap 146 (the pricing page: the app and Studio side by side): /pricing
starts with the two products side by side, each with a real screen and its
"from" price; one billing period for both, lifetime among its choices;
Studio's plans right under the regular ones with every period, the price
per month and the saving; each product explained with real screens; how
they differ; and every feature of the app's plans in a fold, so the page is
shorter. Prices still come from Admin › Plans: the owner checks Studio's
1, 2 and 3-year and lifetime prices there (ROADMAP 146.9).

Roadmap 144 (the card typed inside the payment page): with Stripe (its
publishable key saved), Yallapp's payment page (stores, food and
deliveries, bookings, courses, events, connected stores paying in the app)
shows Stripe's card form under the customer's details, Embedded Checkout on
the same Checkout Session, instead of sending them to Stripe's page; the
other gateways keep their own pages. Not yet tried with a real Stripe
account (ROADMAP 144.4).

Roadmap 140 (builds never left in the queue): the frequent job asks GitHub
to start the build workflow again when a build has been queued 10 minutes
with no run of it going. A run takes 5 builds and runs go one at a time,
and GitHub's hourly schedule often doesn't run, so a build left over from a
full run used to wait for the next build queued (Leqaa #2 waited 3 hours on
17 November). Uses the same `GITHUB_DISPATCH_TOKEN` (Actions: Read and
write), which already reads runs.

Roadmap 141 (the keyboard opens only when asked): in every client app, a
screen, a sheet or a dialog opening over a text field, or another tab,
closes its keyboard, so it no longer opens again by itself on the way back
(Flutter gave the field its focus back); a drag that scrolls closes the
keyboard on every screen, while a list the app moves and the scrolling
inside a text field don't. `CLIENT_APP_RELEASE` is 3, with 143 below, so
every active app gets one build with both (4 an hour). Not yet tried on a
phone.

Roadmap 142 (build one app alone): Builds & downloads has Android only and
iPhone only under Start new build once the app has both apps (iOS on its
plan and the App Store Connect key saved); Start new build still makes both.
The pipeline runs only the jobs of the apps a build makes, so an Android
build without the iPhone app no longer takes a Mac. Automatic builds and
Yallapp-release rebuilds compare with the last build of both apps.

Roadmap 143 (the sign-in buttons in the app's main colour): the premium
sign-in and the screens in its look draw their buttons in the app's main
colour, in the app and in Studio › Screens, not the second colour's gold
that looked the same in every app.

Roadmap 150: Studio's canvas draws a cover's top row (the search, the
wordmark and the bag) across the cover, as the app does; it shrank to its
icons, which put Kech Flora's bag in the middle.

Roadmap 132.188: Studio's menu and crumbs come to life with its frame, so
a page opened from the bar's account menu right after the overview no
longer throws React's hydration error #418 (main's MariaDB e2e job).

Roadmap 147 (a search opens with its keyboard closed): the shop's, the
academy's, real estate's, events' and news' searches no longer focus their
field when they open, so Leqaa's and Kech Flora's Bouquets tab doesn't bring
the keyboard up by itself; it comes up only on a tap. `CLIENT_APP_RELEASE`
is 5. Roadmap 148: an order under the least Stripe charges (Kech Flora's
MAD 1.00 test, about USD 0.10, under 0.50) says so on the payment page
instead of "couldn't start".

Roadmap 145 (the app audit): what the owner publishes shows in an open
app when it comes back on screen, not only after a full restart; Studio's
bar says "Not in the app yet" until Publish. A page over the same screen as
a tab's page no longer covers it (Leqaa's and Kech Flora's Bouquets showed
"Courses"). The header's bag, buttons and lists as set in Studio; controls
that did nothing do what they show; delivery days in the shop's time
(plugin 0.4.50); pictures kept on the phone and decoded at their size, and
media links kept by Netlify's cache for an hour. `CLIENT_APP_RELEASE` is 4,
so every active app gets one build with it (4 an hour). Not yet tried on a
phone. Leqaa's demo and Kech Flora still hold the old "Courses" page: one
publish of their layout (or deleting that page) clears it for older builds.

Roadmap 149 (prices in the customer's currency, per app): the shop's
settings (Products › Settings › Customers' currencies, in the dashboard and
Studio) have "Show prices in the customer's currency", on by default, and
"Only these currencies (leave empty for all)". The hosted API applies them
to every answer whatever the app sends (no `display`, nothing charged in
that currency, `GET /currencies` limited, the shop's own always allowed),
so apps already in the stores follow them; the config sends them as
`customer_currency` and the app hides Settings › Currency or lists only
those. `CLIENT_APP_RELEASE` is 6. Courses, events, bookings and food apps
keep the default (no form there yet). No migration.

Roadmap 79.5 (maintenance): Next.js is 16.4.5 (from 16.4.2, with
`eslint-config-next`), the first release fixed for GHSA-mfr8-8qww-v76h,
which `next build` warned about. Nothing else in the lockfile changed and
no code needed changing.

Roadmap 139 (store screenshots made automatically) is in the code: App
setup › Store listing has "Make them for me", on for new apps, in the
dashboard and in Studio. A separate Linux workflow
(`.github/workflows/store-screenshots.yml`, started by the platform)
opens each app's preview at Google Play's phone and tablet sizes, iPhone
6.9" and iPad 13", in each listing language, takes the main screens of its
kind and sends them back; they are the listing's screenshots, each
translation its own. The owner can replace or remove any one; theirs are
never overwritten. They're made again a few minutes after a change that
shows on them, and monthly. Not yet run on a GitHub runner against a real
app preview, nor sent to the stores (LAUNCH-CHECKLIST › Phase 139). It also fixes the owner's own tablet screenshot
upload on MySQL/MariaDB (`assets.kind` was 16 characters, too short for
`tablet_screenshot`; now 32, migration `0141_auto_screenshots`).

Phase 138 (We publish for you, on every plan) is in the code: every plan,
regular and Studio, includes "We publish for you" on Google Play and the
App Store, and the publishing add-on is retired (never offered, renewed
or reminded of; what apps bought keeps its records). Builds go to Google
Play's production for everyone unless the owner chooses a first share or
internal testing; the first release stays by hand, as a draft the
pipeline reports and the team is told about once. The platform sends each
iPhone version on TestFlight to App Review from the frequent job, with
the client's App Store Connect key, once Apple has processed it, and says
on Builds why when it can't (App Privacy on the first version, the age
rating, an agreement). A bump of `CLIENT_APP_RELEASE`
(`lib/builds/app-release.ts`) gives every active app that built before a
new build, 4 an hour; it is 2, so the first deploy rebuilds every active
app with 132.187's order refresh and 136's iPhone push token. Galaxy Store, AppGallery and GetApps are the
client's own, uploaded with their keys on every plan. The publishing
accounts pool (Admin › Settings › Publishing accounts) gives each app one
account for life; no migration (the app's `rollout` JSON and the setting
`publishingAccounts`). The pipeline contract adds the `app_review` stage
and the `play` report (docs/api/pipeline.yaml).

Roadmap 136 Phase 1 (Yallapp sets up notifications) is in the code, off
until its settings are in Netlify: apps on the hosted API can leave
Firebase to Yallapp, which registers their Android and iOS apps (and the
bundle's second apps) in its own Firebase projects, saves their files
where a client's own would be, and sends their pushes without any key
(the platform is its own OpenID Connect issuer for Google's Workload
Identity Federation, `/oidc`). The pool of projects grows by itself: the
frequent job creates the next project when it runs low, and Admin ›
Settings › Yallapp Firebase projects shows each project's room, Google's
words when a step failed, and Check. "Use my own Firebase" works as
before. iPhones in Yallapp's Firebase get pushes from Phase 2 (straight to
Apple); WordPress sites from Phase 3 (the relay).

Roadmap 132.187 (an order shipped in the dashboard shows as shipped in the
app) is in the code: the app asks again for the orders and the open order
on an order's notification (arriving while the app is open, or tapped), on
coming back to the front and when they open again; the stage shows on
every order on its way; and Leqaa's "How your flowers travel" follows the
person's newest order. It reaches phones with the next app build; the
platform's answers were already right. On Huawei phones without Google
Play, a notification arriving while the app is open isn't passed to it
(the Push Kit bridge sends taps only), so there the orders refresh on
coming back to the front and on opening.

Roadmap 136.20–136.23 (iPhone notifications straight to Apple, Phase 2
of "Yallapp sets up notifications") is in the code: the client's APNs
key is uploaded once, checked with Apple and saved encrypted; `apns`
device tokens are sent over HTTP/2 to APNs with it; the app sends its
APNs token on iPhones when `Config.features.apns` says so. Not yet
checked against Apple itself: this environment can't reach
`api.push.apple.com`, so the probe's answers (`BadDeviceToken`,
`InvalidProviderToken`) and a real delivery are verified only against a
local HTTP/2 server and fakes. Check both with the first client's key.

Roadmap 136.40–136.45 (Phase 3, the WordPress relay) is merged with
Phase 1: the platform's `POST /api/v1/push/send` sends a site's batch of
Firebase tokens through the app's keyless Yallapp-mode account and answers
each token sent, invalid or retry, within limits per license;
`LicenseStatus.push` says `yallapp` for an app in Yallapp's mode (`own`
otherwise); plugin 0.4.49 relays then (retries from cron, "Notifications
are sent by Yallapp" in its settings). The Publishing step offers Yallapp's
mode to a WordPress app only once its site runs plugin 0.4.49 or later.
136.46: those apps' iPhones register their APNs token (`Config.features.apns`
from the plugin), the relay sends them straight to Apple with the client's
APNs key (Notifications › iPhone notifications, now shown for such WordPress
apps), and answers them `skipped` while no key is saved.

Roadmap 134 (pay inside the app for connected stores, Demo) is built for
WooCommerce: Payments › How customers pay offers Yallapp's checkout (its
own products), the store's checkout (the default) and paying inside the
app once the owner's gateway is connected and tested; the payment goes to
the owner's own gateway on Yallapp's payment page, and the order is then
made on WooCommerce, marked paid, once per payment (plugin 0.4.47); a
refused order waits as "Paid, needs attention" with Retry and Refund.
Wix, Shopify and the other platforms keep their own checkout (Known gaps).

Phase 133 (plans, billing periods and add-ons) is in the code: regular
plans are added, copied, ordered, hidden, archived and removed like
Studio's; every limit is editable, with the team's own limits and a
regular app's page limit; each plan has its main price and any of 1, 6,
12, 24 and 36 months or a lifetime price, chosen by the client on the
pricing page, the Plan page, `/pending` and the payment form, carried to
the payments (`plan_payments.months`, 0 for life), receipts, emails and
Admin; a lifetime offer card on the pricing page (`/pricing#lifetime`) and
the Plan page; and an add-ons store (Admin › Add-ons, Dashboard ›
Add-ons, migration `0133_plans_addons`) whose quantity and feature
add-ons raise the app's limits and switch features on wherever its plan
is read, and whose services are tasks for the team. At the owner's
request, the periods a plan's team hasn't priced, its lifetime offer
included, have suggested prices worked out from the plan's own monthly
or yearly price, and the publishing service has suggested prices (still
not offered); Admin shows them prefilled for the owner to edit or keep
(roadmap 133.12, 133.13).

Roadmap 132.110–132.115 (Admin working in a client's account, and apps
made, moved and copied for clients) is complete: our team's create paths
in a client's account no longer bounce to the admin, a banner shows whose
account it is, and every action there is in the audit log with the team
member's name; Admin can make an app for a client and open it as them,
move an app (with or without its data and its subscription) or only its
plan to another app with the owner's emailed 6-digit approval, and copy an
app into any account. Migration `0130_app_moves` (the requests, and
`apps.moved_at`, `apps.moved_to_client_id` for the read-only record an app
leaves behind).

Roadmap 132.160–132.169 (group A in the console): Delivery & offers, Card
messages, Media, Notifications, Chat, Languages, Screen protection,
Integrations and App sign-in are built as the console's design: one main
action in Ember with the rest behind "⋯", the numbers as tiles, lists as
tables whose rows open in the inspector (a conversation's thread by
`?open=`), settings as rows. The kit's new pieces are in their own files
(`components/studio-page/table.tsx`, `parts.tsx`, `tabs.tsx`); the kit's
own files are unchanged. A flash sale's percent reads right in Arabic.

Roadmap 132.186 (Delivery & offers made easy): several delivery times a
day as rows with "Add another time" (a break between them), overlaps
refused in plain words; every country (Intl.DisplayNames names, a
search, the platform's first ones on top) or every country at once, each
chosen country's own cities typed right under it with their prices; a
flash sale's products with their pictures (`lib/selling/countries.ts`).

Roadmap 132.170–132.179 (group B in Studio's console): Publishing,
Builds, Stability, Invoices, Add-ons, Team, Updates from Yallapp and Your
phones are in the console's look: one main action in Ember with the rest
behind "⋯", Publishing's own pages as tabs, the figures as tiles (a store's
tile opens it), and their lists as tables whose rows open in the inspector
(group A's KitTable, `components/studio-page/table.tsx`, with the tiles that open
the inspector in `inspect.tsx`); the settings switches are the
console's KitSwitch (`studio-page/switch.tsx` puts it in a form).
`tests/screens/studio-console-b.screens.ts` takes their pictures.

Roadmap 132.180–132.185 (Payments in the console): `/dashboard/payments`
and `/studio/project/payments` are built in the console's look. At first
the page shows only its title, "Connect a card gateway" while none is
connected, the summary as four tiles (the gateway, the last test, the
webhook, the currency) and "Ways customers pay" as setting rows: the card
gateway (its keys and Test connection under Connect or Edit), bank
transfer and the owner's own way each with the console's switch, the days
to pay while either is on, how they work under "How it works". How
customers pay is one row (Change opens the ways); the payments made in the
app are a table, each in the inspector with Retry and Refund. The way rows
are `components/studio-page/way-row.tsx` (KitWayRow, KitWaySwitch: the
console's KitSwitch with the field a form sends). Events and Memberships
share the bank transfer form. `tests/screens/studio-payments.screens.ts`
takes the page's pictures.

Roadmap 132.150–132.153 (Studio's console): every Studio project page and
Your account and Team are in Studio's console (`app/studio/console.tsx`): a
midnight frame with an icon rail of the menu's groups and a panel of the
group open, the page on a rounded canvas under a bar with where it is,
Preview, the editor and the account's menu; a tab bar and a sheet on
phones. The page kit (`components/studio-page`) has the console's look
(segmented tabs, tiles, tables, a docked inspector from 1280 px); Products
is built as the design, with a new Featured switch. Orders, Plan and Your
account sit in it with their behaviour kept; the other project pages are
in the console's frame but keep their own markup until they move to the
kit.

Roadmap 132.130–132.134 (Studio's premium pages): a shared page kit
(`src/components/studio-page`: header, hero card, sections, rows with one
pill and one action, drawers, settings rows, folds, "?" help, empty
states; its colours `--sp-…` in `globals.css`, the dashboard's outside
Studio and the Studio frame's in it, light and dark) is applied to
Products, Orders, Plan, Your account and (132.145) Payments, in the
dashboard and in Studio alike; on Payments every way customers pay is in
one card, bank transfer and the owner's own way each with an on/off switch
(`manualPayments.bankTransferOff`, `customOff`). The other Studio project
pages and `/studio/team` still use the older page kit (`page-kit.tsx`)
until they move to it.
`tests/screens/studio-premium.screens.ts` takes their pictures.

Roadmap 132.140–132.144 (Studio's premium pages, the second set): the
kit is on Publishing, Builds, Stability, Invoices, Add-ons, Team, Updates
from Yallapp and Your phones too (each the dashboard's page, in Studio's
frame), with a settings switch (`studio-page/switch.tsx`) and a build's
stages as small pills (`BuildStages look="pills"`).
Their pictures: `tests/screens/studio-console-b.screens.ts` (132.179).

Roadmap 132.1–132.8 (Studio dashboard fixes): a Studio project's menu has
every page of the dashboard that applies to the project, behind the
dashboard's gates, in six groups that fold away, with a quick search
(Ctrl+K), the person, language, dark mode and sign-out at its foot, every
page about the account reachable from it and from the account menu on the
bar (Your account and Team at /studio/account and /studio/team, the plan,
invoices, phones and updates in the project's frame), Payments under The
app, a food company's marketplace pages, and the bar on one line on phones; Studio › Screens shows and
sets whether sign-in (and the account's top) follows the system screens'
look or has its own, its preview draws sign-in, the code and a new account
as the app does, and the app draws the code screen and a new account in
sign-in's own look too; "Not now" and the back button work in every system
look (they were under the scroll view). Checks: platform unit tests and
e2e, flutter analyze and widget tests. Setting a password again
(Forgot password) keeps the app's own look.

Roadmap 131.54 (the documentation up to date for Phase 131) is complete:
a new article `delivery-and-offers` ("Delivery days, gifts and flash
sales", Delivery & offers' help link) explains the checkout, delivery days
and times, where the shop delivers and what it costs, gifts, card messages
by occasion, gift add-ons, the titles in the app, flash sales, the codes
shown in the app, Deliveries from the app and plugin 0.4.44's settings,
with what each source supports and what it doesn't; `studio-premium-elements`
adds the Flash sale element, sales on the cards, the coupon's premium looks,
the petal header, bar and system screens and the gift checkout's look;
`studio-templates` has Studio's ten demos with Leqaa's two looks, its ready
sections and the Petal home; and `studio-elements`, `yallapp-studio`,
`store-orders`, `app-types`, `wordpress-plugin` (and the plugin's readme)
and `my-own-api` follow, with the store's solution and features on the
website, in English, Arabic and Turkish. Phase 130's last items are
documented too: the academy's course screens (130.52–130.57), the team's
screens in the look (130.58), Monochrome luxe as the seventh premium
whole design, the seven landings (130.62 and Petal home) and photos in
black and white (130.61), with plugin 0.4.42 and 0.4.43.

Phase 131 (the flower shop) is complete: every store app, whatever its
source, has Delivery & offers (`lib/selling`, migrations
`0128_flower_shop` and `0129_gift_addons`): delivery days and times (a
same-day cut-off in the shop's time zone, next day, the days ahead, closed
weekdays, up to 8 slots with a capacity and a fee), the gift checkout (the
sender, the recipient with the address, the day and slot required, the
card), card messages by occasion (a starting set in English, Arabic and
Turkish), where the shop delivers and what it costs (flat, by city, by
distance, by weight, a city's own price, a minimum, free over an amount),
flash sales, coupons shown in the app and gift add-ons, with titles the
owner words. Yallapp's own products get all of it at Yallapp's checkout;
WooCommerce through plugin 0.4.44, its own shipping zones pricing
shipping; the connected platforms through `withStoreExtras`, their own
checkout charging their prices and shipping (Shopify and Wix keep the
details on their order, the others in Deliveries from the app for 60
days). In Studio, Leqaa (لقاء) is the tenth demo, a store with two
Signature looks (Rose hour, Botanical press); every app can take its
petal header, bar and system screens, the gift checkout's look, the
Petal home landing, the Flash sale element, sale badges and the coupon's
ticket and glass looks; its story is `/yallapp-studio/flowers`.

Roadmap 130.48 (the documentation up to date for Phases 128–130) is
complete: `studio-premium-elements` covers Studio's premium library
(Phase 129: sliders, stories, the ticker, video and parallax banners, the
gallery, before and after, motion as people scroll, testimonials, pricing,
numbers, progress, the timeline, the profile card, the bento grid, glass,
ticket and texture cards, the badge, the action bar, the small dock, the
maps' looks and the live route) and Phase 130's options (the live cards'
looks, the next trip, a greeting's words, the gold ring and this week's
days, the places as a deck), the premium headers and the system screens'
look; `studio-templates` covers the nine Studio demos as their look A, the
eighteen Signature looks on /start and among the templates, the six premium
whole designs and the app's words in Modern Standard Arabic; and
`studio-elements`, `yallapp-studio`, `wordpress-plugin` (0.4.40, 0.4.41),
`my-own-api` and `travel` follow, in English, Arabic and Turkish, with the
nine look B homes as screenshots and Sign-in and account's help link.

Roadmap 129.30 (the documentation up to date) is complete: the docs have
articles for every element of Studio's editor (`studio-elements`), the
premium elements of Phase 128 (`studio-premium-elements`, Phase 129's
elements added as they land), ready sections, templates and Studio's
demos with /start (`studio-templates`) and Travel (`travel`, Phase 126,
the outside providers "Coming soon"), and `yallapp-business` (1.0.2: the
Studio apps' tools, Prime and VIP), `yallapp-studio`, `wordpress-plugin`
(0.4.39) and `my-own-api` brought up to date, in English, Arabic and
Turkish, with the screenshots already in `public/screens`. The dashboard's
Travel pages, Studio's Help and the editor's Help link to them.

The website shows Yallapp Studio apart from the regular apps: its own page
(`/yallapp-studio`) with the editor, apps made in it, the Studio-only project
types, a Regular apps and Studio projects table and Studio's own plans (the
offered ones with their prices, else "on request"); its own demo page
(`/demo/studio`, the regular `/demo` unchanged); the two plan families apart
on `/pricing`; a section on the home page; a menu and footer link; FAQ
entries; a note on How it works; and the docs article `yallapp-studio`
(plus a Studio section in `plans-and-billing`), in English, Arabic and
Turkish. Its screenshots are real: the app's from the Flutter screenshot
tests (since 130.49 the Studio demos as they are now, their Signature looks
A and B by day and by night, `<demo's address>-sig-<a|b>-home(-dark)`, and
each demo's own screens), the dashboard's (`studio-editor`, `studio-home`,
`studio-project`) from `tests/screens/studio.screens.ts`.

Phase 126 (Travel: hotels and flights, phase 1) is complete: a Yallapp
Studio app type for a travel company's hotels, its fixed-seat flights or
both (migration 0127; `lib/travel`, the hosted API's Travel tag, the app's
`lib/modules/travel`). The team switches Hotels and Flights in Admin ›
client › Travel, which sets the app's tabs; the company adds its hotels,
rooms, rates, prices, open dates and flights in the dashboard (in Studio at
`/studio/project/travel`); people search, book a stay, a flight or both as
one trip and pay on the company's own payment page or at the hotel, then
follow the trip, its boarding passes and its flight's news in the app.
Safra is its demo on `/demo/studio`, with CC0 photos. The outside providers
(a hotel's own system, a hotel supplier, a live flight provider) are shown in
Admin as coming soon and are not connected.

Phase 111 (Studio setup fixes) is complete: in `/studio/project/setup` a
save that doesn't go through keeps the chosen design (and the other choices)
on screen and says why, its links and saves stay in Studio, a Studio project
is offered Studio's plans, and the Studio kinds' designs read in Arabic and
Turkish (`tests/e2e/studio-setup.spec.ts`).

Phase 110.2 (sample entries) is complete: choosing a design for an app
whose content is kept in Yallapp fills each empty list it shows with sample
entries (`sample` on the entries and categories, migration 0102;
`lib/samples`), in the app's main language (English, Arabic or Turkish;
English for others) and currency. The dashboard marks them, removes them
with their pictures and asks after the first own entry; store builds,
"We publish for you" and the team's store statuses wait until none are left.
The hosted API's public JSON is unchanged (no `sample` field).

Phase 110.3 (full templates) is complete: each of the 52 ready-made
designs is a whole app its owner only edits. Its home page has 8 to 12
blocks (three slides, the kind's lists, numbers, three quotes, questions,
a short story, contact and hours), the header of the pages in the tabs shows
the app's logo or name, and every design has About us (story, a team of
four with drawn pictures, numbers, six photos), Contact (map, hours, a form,
the contact details) and Questions pages, plus its kind's own (Pricing,
Offers and Delivery & returns, Catering, Prices, Our doctors and Patient
info, Timetable and Plans, Areas and Valuation, Visit and Hire, Our work and
Volunteer, How it works and a page to join as a courier, driver or partner,
Admissions). The texts are samples in the business's voice, marked in the
editor until changed, with Arabic and Turkish in the built-in dictionary.
The map's place is a sample the owner moves to theirs: the editor and the
draft preview show it, marked as a sample, but a published app never does
(the hosted API's pages and the plugin's layout leave a Location block at
the sample place out). The Social links block still comes only from the
business's own profiles.

Phase 104 (delivery and courier companies) steps 104.1 to 104.7 are
complete: a new project type in Yallapp Studio, Delivery, with no website
(a Studio project only, on Studio's plans). Customers send a
parcel (pickup and drop-off by address, their position, a pasted maps link
or the map), see the price as they type, pay in cash or by card through the
company's own gateway, and follow the stages and, where the company picks
it, the courier on a map. The company's couriers get a Courier tab in the
same app (no one else sees it): on duty, their jobs, waiting jobs to take,
each step, cash to collect and the position shared while a parcel is on the
way. The project's dashboard in Studio has Shipments, Couriers, Delivery settings
and the services; prices by distance, area or fixed, cash or card, jobs given or
taken and where couriers work are each company's choice. Delivery is the
Studio plan feature `delivery` (and `courier_app` for a second courier
app), ticked per plan in Admin › Plans › Yallapp Studio. A company that
picks the second app in its name gets it from Builds: the same app built
with the courier's screens only, under its own package name and bundle ID
(the app's own with `.courier`) and its own name, listed for the company's
couriers only (Unlisted on the App Store).
The store reviewers sign in with the App sign-in review number and code as
a customer and as a test courier (its parcels are its own; a sample job
waits in the courier app), and Publishing gives the notes for both apps.
Still to come: the shared Yallapp Courier app (104.8, published together
with the owner). Checks: redocly lint, platform unit
tests, tsc, eslint, flutter analyze and widget tests.

Phase 105.1 (food delivery from many restaurants) is complete: a new Studio project type, Food delivery (no website,
on Studio's plans). Customers browse the company's restaurants and their
menus, order from one restaurant (dishes with their choices, the delivery
fee from the restaurant by the company's delivery prices), pay in cash or by
card through the company's own gateway, follow the order and rate it. A
restaurant's staff (added by number on its page) get a Restaurant tab: new
orders, accept with the minutes it needs, turn down with a reason, ready,
busy for a while. The company's couriers deliver through the courier
screens of Phase 104; a courier job is made when the restaurant accepts an
order or once it is ready, as the company chooses. The dashboard in Studio
has Restaurants (details, hours, menu, staff and the company's share of each
order, set by the company), Food orders with a monthly statement per
restaurant, Courier jobs, Couriers and Delivery settings (with the cuisines
and the time zone). Food delivery is the Studio plan feature `food`. In
Studio, a food project starts from one of three ready-made designs
(Restaurants, Food offers, Food brand) and has its own welcome section;
its couriers can have their own app in the company's name (104.6), and the
store reviewers' notes walk through all three roles. Checks: redocly lint, platform unit tests (with the
isolation tests), tsc, eslint, e2e of the dashboard, flutter analyze and
widget tests.

Phase 105.2 (ride hailing, like Uber) is complete: a new Studio project
type, Ride hailing (no website, on Studio's plans). Riders set the pickup
and drop-off (their position, a maps link or the map), see each vehicle
type's fare and how soon a car can come, ride now or book for later, and
follow the ride: the driver, the car and plate, the driver on the map, the
code to tell the driver, sharing the ride's page, an emergency button;
they cancel by the company's rule (a fee carried into the next ride), pay a
card ride once it ends through the company's own gateway, and rate the
driver. The company's drivers (added by number, with their car, photo and
documents) get a Driver tab: online or offline, one offer at a time with the
seconds left to take it, arrived, start (with the rider's code when the
company asks for it), end, the cash to collect, their earnings by day, week
and month. Rides go to the nearest free driver of the vehicle type, then
the next one; or the company gives them out. The dashboard in Studio has
Rides (with the drivers online now), Drivers, Vehicle types and their
fares, Statements per driver and Ride settings (fares upfront or by the
meter, areas, promo codes, cancelling, the company's share). Ride hailing
is the Studio plan feature `rides`. In Studio, a ride project starts from
one of three ready-made designs (Rides, Ride offers, Ride brand) and has its
own welcome section; its drivers can have their own app in the company's
name (`.driver`, as 104.6), and the store reviewers' notes walk through
both roles (in the drivers' app the review driver gets a sample ride).
Every fare, fee and share is the company's: Yallapp sets none. Checks:
redocly lint, platform unit tests (with the isolation tests), tsc, eslint,
e2e of the dashboard, flutter analyze and widget tests.

Phase 105.9 (live taxi on the map) has its core: a new Studio project type
`taxi`, Live taxi on the map, on 105.2's rides engine (its fares, drivers,
matching and drivers' app). The company chooses its map on Maps & live:
Google Maps with its own key, or its own OpenStreetMap tile server with
optional search and routing servers, each with a test; and its own
Firebase Realtime Database, with a test and the rules to paste. Riders
open the app on a full-screen map with the free taxis around them moving,
choose where to, see the route, the fares and how soon, and follow their
driver coming second by second; drivers see the offer with its countdown
over the map, and their position is written live (a driver on a ride
leaves the cells riders look in). Without a live database the app asks
Yallapp every five seconds. The dashboard's Live map shows the company's
drivers (free, on a ride), the rides waiting at their pickup and the rides
going on now, updated every five seconds. Live taxis are the Studio plan
feature `taxi`. Its demo app (Lamha Taxi, 110.5) and the store reviewers'
notes are done: Publishing walks the reviewers through the map, asking for
a taxi and, as the test driver riders never see on the map, taking it.
Still to do in 105.9.6: the Studio designs. Checks: platform unit tests,
tsc, eslint, e2e of the dashboard, flutter analyze and widget tests.

Studio has its own demo apps on `/demo/studio`, apart from the regular
demos on `/demo`: Sahm Express (delivery), Sofra Eats (food delivery),
Masar Rides (ride hailing) and (110.5) Lamha Taxi (live taxi on the map),
Nakhla School (school) and Rawaq Academy (an academy with many teachers).
The team creates them with the other demos in Admin › Demo apps and picks
their builds there; until then the page shows "Coming soon". Visitors sign
in with the same demo number and try both sides: the customer, then the
courier, the restaurant's staff or the driver. In Nakhla School the demo
number is Lina (a student in Grade 5 A), her mother Rania (also Adam's, in
Grade 3 B) and Ms. Mona, Lina's class teacher, so what the visitor gives as
the teacher reaches Lina at once; the school day (homework, scores,
attendance, news, fees) is dated from today and made again by the daily
job. In Rawaq Academy seven teachers each have their published courses,
and the demo number is one more teacher ("Demo teacher", which students
never see) whose Teacher tab makes a course and sends it for review. In
Lamha Taxi the demo's eight drivers (never online, never offered a ride)
drive up and down streets around wherever the rider asks, worked out from
the time; the map is the platform's (Admin › Settings › Maps), and without
one the app shows the plain ride screens; there is no live database, so the
app asks Yallapp every five seconds. The daily clean-up removes visitors'
shipments, orders and rides, the teachers they followed and rated, the
courses they made as the demo teacher and what they wrote as the school's
teacher.

Phase 105.4 (schools) has its core: a new Studio project type `school`
(an app type of its own, on Studio's plans as the feature `school`). The
school adds its classes and subjects, its students, parents (linked to
their children by the student's code) and teachers, one by one or from a
CSV file, and the week's timetable. Teachers get a Classroom tab: today's
lessons, their classes, taking attendance (the families of those absent or
late are told), giving homework with files, marking what students hand
in, exams and their scores, and writing to a class and its families.
Students see their timetable, homework (handed in with text, a photo or a
PDF), grades by subject, attendance, fees and news; a parent sees the same
for each child and pays fees by card into the school's own account (or at
the school), each payment with a receipt at `/fee-receipts/<code>`. The
dashboard in Studio has Classes, People, Timetable, Attendance, Homework,
Grades, Fees, News and School settings. Every amount is the school's:
Yallapp sets none. Still to come: universities, report cards and grading
scales, the store reviewers' accounts for the three roles. Checks: redocly
lint, platform unit tests (with the isolation tests), tsc, eslint, e2e of
the dashboard, flutter analyze and widget tests.

Phase 105.3 (academies with many teachers, like Udemy) is complete: a new
Studio project type, an academy whose teachers each publish their own
courses (the Academy app type with the vertical `instructors`, on Studio's
plans). The academy adds its teachers by number (or lets people apply from
the app), sets each one's share in percent, features some, and publishes
or returns (with a note) the courses they send. Teachers get a Teacher tab:
their courses, sections and lessons (a video link, an uploaded video or
PDF into the academy's Media library, or text), sending a course for
review, their students' questions (answered in their name) and their
earnings this month, last month or this year. Students browse the teachers
(by name or subject, featured first), open a teacher's page, follow them
(a push when they publish a course) and rate them once in one of their
courses. The dashboard in Studio has Teachers, Courses to review and
Teacher statements for any period, from paid orders after coupons and
refunds. Academies with many teachers are the Studio plan feature
`instructors`. In Studio, such an academy starts from one of three
ready-made designs (Teachers, Course offers, Academy brand), and Studio
pages can open its teachers and the Teacher tab; the store review account
is a student and a test teacher students never see. Every price and share
is the academy's: Yallapp sets none. Checks: redocly lint, platform unit
tests (with the isolation tests), tsc, eslint, e2e of the dashboard,
flutter analyze and widget tests.

Phase 103R (Yallapp Studio as the owner approved it) is complete. A
Studio page is a tree of elements (`AppPage.studio`): rows, columns, layers,
grids and sliders; texts, pictures, buttons, lists with the owner's own card,
categories, videos, forms, maps, ratings and search, sized to fill, hug or a
fixed size, light and dark, with motion. Done:
- the contract;
- the editor at `/studio/editor`, as in the approved design;
- serving by the hosted API and plugin 0.4.26, with forms on a Studio page
  answered like the form block;
- the app drawing the tree natively;
- Studio's own section of the account: its home with the projects, a new
  project in three steps and each project's dashboard, as the owner
  approved them; Studio projects (`App.section` "studio") apart from the
  regular apps, on Studio's own plans (Admin › Plans › Yallapp Studio);
- templates and ready sections for each project type, its own first (the
  shop, a restaurant's menu, courses, services, listings, news, events,
  charity, the delivery company's), then the ones for every project.

Studio's plans are offered once the team turns them on and prices them;
until then a project designs and tries everything, and publishing it to
the stores waits for a plan. Checks: redocly lint, platform unit tests, e2e
of Studio's section and editor, composer lint, plugin unit tests, flutter
analyze and widget tests.

Phase 102 (a store review account in every app, required) is complete:
Publishing › Store review account holds the reviewers' sign-in for every
app (App sign-in's fixed number or email and code where Yallapp signs people
in; an account of the site or API, its password encrypted, elsewhere), with
the steps for Play Console and App Store Connect. Ready to submit and the
checks before a build need it. Checks: platform unit tests, e2e of
publishing and the client flow.

Phase 101 (header types in the regular editor) is complete: Pages & look ›
Look › Header offers Title, Centered, Logo and Search, with up to four
buttons (search, cart, notifications, chat, account). The app shows it on
the pages in the bottom tabs; WordPress sites pass it on from plugin
0.4.24. Checks: redocly lint, platform unit tests, composer lint and the
plugin's integration suite, flutter analyze and widget tests.

Phase 100 (courses and memberships bought in the app through Google Play
Billing and the App Store's in-app purchase) is complete (steps 100.1 to
100.7):

| Step | What | Checks |
|---|---|---|
| 100.1 | Contract: store products, purchases, notifications, `Config.store_billing` | redocly lint |
| 100.2 | Store connections and products in Google Play and App Store Connect | unit, e2e, MariaDB migrations |
| 100.3 | Purchases checked with Google and Apple, access given and taken back | unit (with the store suite on MariaDB), e2e |
| 100.4 | WordPress plugin 0.4.23: gives and takes access on the site | composer lint, `php -l`, PHPUnit, the LMS integration suites |
| 100.5 | App: Google Play Billing and StoreKit, restore, manage subscription | dart format, flutter analyze, flutter test |
| 100.6 | Sales in Analytics and the Owner API, the guide, the terms | unit, e2e (analytics, owner API, public pages) |
| 100.7 | Apps on their own API, Teachable and Thinkific schools | unit, MariaDB store suites, e2e of the dashboard |

Roadmap 154 (the pricing page in its Day and night look): /pricing in the
design the owner chose, the app by day and Studio by night: a night hero
with the two products and their fanned phones, the period picker floating
over its edge with each period's saving, compact cards with the rest
folded, Studio's plans on a night band, every kind of app each product
makes, a few questions and a closing band in the night. Only the plans for
sale show, with their prices from Admin › Plans.

## To verify against real services before release

- 214 Yallapp Business 1.0.6 on real phones: the iPhone extension
  (widget and Live Activity) compiled and signed on the first release
  (CI compiles it unsigned; nothing here builds Swift), FCM's
  `apns.live_activity_token` start and end pushes, the push-to-start token
  (iOS 17.2), the widget's 15-minute timeline and Android's widget and
  ongoing notification on a device.
- 138 The App Store Connect calls of the App Review submission
  (`lib/publishing/app-review-submit.ts`): `builds` by version and
  processing state, `usesNonExemptEncryption`, making and renaming an
  `appStoreVersion`, `appStoreVersionPhasedReleases`, What's New on the
  localizations, `appStoreReviewDetails`, the build relationship and
  `reviewSubmissions` with their items. Tested against a fake App Store
  Connect only; Apple's own error words, which pick the reason Builds
  shows, are matched on their wording (`reasonOf`) and need a look on a
  real first version (App Privacy) and an update.
- 138 fastlane's `upload_to_app_store` with `app_version` and
  `automatic_release` making the version being prepared after a release,
  and `upload_play` to production for everyone with its draft fallback on
  an app whose first release isn't out: not run on the runners yet.

- 133 A Kashier payment for 6, 24 or 36 months, for life and for an
  add-on (the amounts are the team's prices; the flow is the plans').
- 102.2 A client's iOS build that uploads sets App Review Information
  (demo account, sign-in required, notes, contact) through App Store
  Connect's `appStoreReviewDetails`; the lane loads, but the call hasn't
  run on the macOS runner against a real client's version yet.

- 136 Yallapp's Firebase against real Google (tested only against a
  fake STS, IAM credentials, Firebase Management, Resource Manager,
  Service Usage, API Keys and FCM): the WIF exchange with the platform as
  issuer, whether `getConfig` returns one app or the project's (the
  platform keeps only the client's packages either way), the minimum
  roles, the project-creation quota, whether a removed app still counts
  toward Firebase's 30, whether the push-only key is enough for token
  registration, and a first Android push (LAUNCH-CHECKLIST 7z8 step 10).

- 136 Yallapp's Firebase against real Google (tested only against a
  fake STS, IAM credentials, Firebase Management, Resource Manager,
  Service Usage, API Keys and FCM): the WIF exchange with the platform as
  issuer, whether `getConfig` returns one app or the project's (the
  platform keeps only the client's packages either way), the minimum
  roles, the project-creation quota, whether a removed app still counts
  toward Firebase's 30, whether the push-only key is enough for token
  registration, and a first Android push (LAUNCH-CHECKLIST 7z8 step 10).

These parts were tested against recorded answers or could not run in the
test environment:

- The plugin's calls into LearnDash and WooCommerce Subscriptions (both are
  paid plugins).
- Teachable's enrolment calls (`POST /enroll`, `POST /unenroll`), its price
  unit (taken as the minor unit) and its `one_time` payment type.
- Thinkific's enrolment calls (`POST /enrollments`,
  `PUT /enrollments/{id}` with `expiry_date`) and its `one-time` payment
  type.
- Restore purchases on an iPhone, and phones without Google Play.
- 117 The website's live activity feed (`/api/live-activity`) is cached a
  minute by `Cache-Control: s-maxage=60`; that Netlify's CDN keeps it per
  `?lang=` is not checked on Netlify yet.
- 134 Pay inside the app (Demo) on WooCommerce: the plugin's
  `POST /store/paid-orders` prices with WooCommerce's cart and makes the
  order with its checkout (`WC()->checkout()->create_order`) in a REST
  request; its store integration checks (`store-test.php`) need
  WordPress and WooCommerce downloads, so they run in CI only. A real
  Stripe, PayPal, Kashier, Fawaterk or iyzico test payment end to end, a
  shop with taxes added at checkout, HPOS and a shop with shipping zones
  by postcode are still to try.

- 155 Stripe's Payment Method Domains (`/v1/payment_method_domains`, its
  list by `domain_name`, `…/validate`, `apple_pay.status_details`) against
  a real Stripe account, and Apple Pay and Google Pay showing in Embedded
  Checkout in Safari and Chrome (LAUNCH-CHECKLIST Phase 155). Stripe's docs
  couldn't be fetched from the work environment; they were read through
  search summaries.

## Known gaps

- 155 Apple Pay inside the iPhone app's web view and Google Pay inside the
  Android app's aren't expected: WebKit allows Apple Pay only in a
  WKWebView without injected scripts (the app's web view adds its
  JavaScript channels as user scripts), and Android's WebView keeps the
  Payment Request API off unless the app turns it on, with each app's
  Google Pay approval (ROADMAP 155.6). The card form works there as before.
- 138 An account's limit can be passed by one or two apps when several
  new apps are given accounts in the same instant (each app still gets
  exactly one account, written once). Assignment reads the settings
  cache, so a new or changed account reaches other instances within 30
  seconds.
- 138 What's New for an update is a short default per language ("Improvements
  and fixes.") where App Store Connect has none; the owner can't write
  their own yet.
- 138 Builds queued before Phase 138 keep `auto_publish: false` and the
  internal track; the next build is published for the client.
- 136 Yallapp's Firebase, Phase 1: iPhones receive no push until Phase 2
  (straight to Apple with the client's APNs key); the vendors' and staff's
  apps are registered on Android only (their builds have no iPhone
  Firebase file yet); WordPress and own API apps keep their own Firebase;
  after a switch between the two modes, phones keep the other project's
  token until they update the app (Phase 4); FCM's
  `android.restricted_package_name` isn't set yet; the taxi's live
  database needs the client's own Firebase.
- 134 Pay inside the app is WooCommerce's only. Shopify's API terms keep
  payments on Shopify Checkout; Wix's Create Order needs an app or Wix
  user identity (the connection has a visitor client ID and an account API
  key) and is limited to 5 calls an hour per site for apps not published in
  the Wix App Market, which couldn't be confirmed against dev.wix.com from
  here; ikas (`createOrderWithTransactions`), Salla and Zid have order APIs
  their connections have no write scopes for. A payment whose order the
  store refused waits for the owner (no automatic retry). The payment page
  asks for a city and an address, not a postcode or state, so a shop
  priced by postcode zones gets its country's rate.

- 132.40 An app started from a demo in Arabic or Turkish has its pages,
  tabs and template words in that language, but the demo's own entries
  (its products, dishes, places, courses, listings) stay in English: they
  are one-language records. The sign-in code and receipt emails to an
  app's users are in English. The app picks the phone's language when it
  offers it, and its main language only otherwise.
- 133 A lifetime license's plan is changed by the team only (no self-serve
  upgrade or downgrade); builds per month and apps per account can be the
  team's own limits, shown to clients but not counted by the platform;
  quantity add-ons for team members are shown, as the team members limit
  itself is.

- 132.112 After a move without its data, the builds already on people's
  phones talk to the app in its new account, and their accounts stayed in
  the old one's archived record: they sign up again there. A ticket or
  booking kept in the archive names an event or service of the moved app,
  which the archive can't show by name.
- 132.113 The move's emails (the code, done, added) are written in
  `lib/apps/move-mail.ts` and can't be edited in Admin › Emails.
- 132.114 A copied page's lists keep their hand-picked entries when they
  are the app's products, listings, articles, events, campaigns, services,
  restaurants, hotels or teachers; any other entry a page names by its
  number keeps the source's number. Media files are copied through the
  media server chunk by chunk in the request; a very large library can
  take long, and a file that fails is named in the audit log.

- 131 A flash sale's units aren't counted from a connected platform's
  orders (its own checkout sells them).

- 126 Travel: the outside providers are not connected (Admin shows them as
  coming soon); the hotel map is drawn by the app from the hotels' places,
  without map tiles; a trip can't be split into several payments, and the
  boarding pass can't be added to a phone's wallet yet.

- The Owner API returns `in_app_sales`, but Yallapp Business does not show it
  yet.
- Apps built before Phase 102 without a review sign-in can't start a new
  build until the owner adds one on Publishing.
- Until an app turns on in-app purchases, its Android app keeps the website
  checkout for paid courses.
- An app on its own API returns `store_billing` and the `store` action from
  its own API (the developer guide's "Sell in the app").
- Studio pages need the app update that draws them: older apps show a
  Studio page empty. The Studio editor shows the canvas left to right; the
  app mirrors it in right-to-left languages.

- 110.2 A sample category the owner renamed is still a sample: Remove all
  samples deletes it when none of the owner's entries is in it. A gym's
  sample classes are bookable services (no sample timetable).
- 110.5 Files visitors upload in the Studio demos (a demo teacher's lesson
  videos and PDFs, homework handed in with a photo) stay in the demo app's
  Media library: the daily job doesn't remove them. Lamha Taxi shows its
  live map only once Admin › Settings › Maps has tiles.
- 117 The live activity card names a paid subscription's country from the
  account (billing cities aren't kept), shows apps gone live only through
  "We publish for you" (the store from Publishing's events), and its demo
  cards start with sign-ins after this release. The privacy policy doesn't
  mention the card's consent box or demo sign-ins yet.

## Deployment

- 136 Migration `0138_yallapp_firebase` (the tables
  `platform_signing_keys`, `firebase_projects`, `app_firebase_apps` and
  the apps' `push_setup` and `firebase_project_id`). Nothing changes until
  GOOGLE_WIF_PROVIDER, GOOGLE_PUSH_SERVICE_ACCOUNT and
  GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT are set (and
  GOOGLE_FIREBASE_PROJECT_PARENT, or Admin's setting, for projects made by
  the platform): LAUNCH-CHECKLIST 7z8.

- 134 Migration `0137_connected_pay` (the table `store_platform_orders`).
  Plugin 0.4.47 (pay inside the app) goes to sites with the app update
  that knows `StoreConfig.checkout_payment`; an older app or plugin keeps
  the store's own checkout.

- Migrations up to `0097` (`npm run db:migrate` in `platform/web`).
- 131 Migrations `0128_flower_shop` and `0129_gift_addons` run with the
  others. Plugins 0.4.44 and 0.4.45 go to sites after the app update with
  the delivery picker, the gift checkout, "Where it goes" with the pin
  map, "Add a little more" and the petal chrome.
- Delivery apps (Phase 104): turn on the plan features `delivery` and,
  for a second courier app, `courier_app`, with their prices, in Admin ›
  Plans; set the map tiles (an address with `{z}`, `{x}`, `{y}` and its
  attribution) in Admin › Settings › Maps before any company picks the
  live map. Without tiles, maps show the stages only.
- Food delivery apps (105.1): turn on the plan feature `food`, with its
  price, in Admin › Plans › Yallapp Studio.
- Ride hailing apps (105.2): turn on the plan feature `rides`, with its
  price, in Admin › Plans › Yallapp Studio; the drivers' own app is the
  plan feature `courier_app`, as for couriers.
- Live taxi apps (105.9): turn on the plan feature `taxi`, with its
  price, in Admin › Plans › Yallapp Studio. Each company brings its own
  map (Google key or tile server) and Firebase Realtime Database.
- Academies with many teachers (105.3): turn on the plan feature
  `instructors`, with its price, in Admin › Plans › Yallapp Studio.
- Schools (105.4): turn on the plan feature `school`, with its price, in
  Admin › Plans › Yallapp Studio. Fees by card need the school's own
  payment account (School settings) and card payments in the plan.
- Google real-time notifications use one Pub/Sub topic for every app
  (`GOOGLE_PUBSUB_PUSH_EMAIL`, `GOOGLE_PUBSUB_TOPIC`; see
  `docs/LAUNCH-CHECKLIST.md`). Each app's owner enters the topic in their own
  Play Console › Monetization setup; the platform finds the app by its
  package name.
- Plugin 0.4.23 goes to sites once the app update with in-app purchases is
  in the stores; 0.4.24 (the header), 0.4.26 (Studio pages), 0.4.27
  (107.2: more style on Studio pages), 0.4.28 (107.3: new Studio
  elements) and 0.4.29 (109: the More tab and the tab bar's look) after
  the app update that shows them.

## Planned (to agree on before any work)

- More Studio project types (Phase 105): see `docs/ROADMAP.md`.
- Studio Market, the Studio template marketplace (Phase 106), no longer
  postponed: stage 1 (designers, free templates reviewed once, applying,
  moving and going back to the previous design) is built, in the look the
  owner chose ("Gallery" in light, "Night showroom" in dark); stage 2 (paid
  plans, checkout with Kashier, renewing, the reminders and the end of a
  plan) too, stage 3 (the designers' money: the ledger, the checks before
  the first payout and the monthly payouts, 106.11) and stage 4's discounts
  (price drops, flash sales and coupon codes, 106.12). The public
  `/templates` page (106.13) follows (see `docs/ROADMAP.md`).
