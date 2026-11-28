# Site audit, November 2026

Two areas: **A**, the documentation, help and the legal pages' audit (first); **F**, the marketing site (below).

# Area A (documentation, help, legal)

The brief: `design/BRIEF-site-audit.md`. Area A covers yallapp.com.tr/docs and every guide (en, ar, tr), the API docs, the dashboard's help links, the emails' links to the docs, the docs' screenshots and search, and the legal pages (audit only: their wording is the owner's). Area F has its own tables for the marketing site.

Shipped means `[x]` in `docs/ROADMAP.md` and live for customers. A feature that is in the code but waits for a release (Yallapp Business 1.0.4 to 1.0.7, the customer app's release 16) is listed as a follow-up, not documented as available. `CLIENT_APP_RELEASE` is 15.

Size: S under an hour, M a few hours (words only), L more, or it waits on something.

## What was checked mechanically (all three languages)

| Check | Result |
|---|---|
| 71 guides in `src/content/docs.ts`, each with its Arabic and Turkish text | All present; the sections match, and no translation is shorter than 60% of the English |
| Links between guides (`/docs/<slug>`) and to site pages | None dead |
| The dashboard's help links (`lib/docs/help.ts`, 40 routes) | All lead to a guide that exists |
| `/docs/<slug>` links anywhere in `src` (dashboard, emails, site) | None dead |
| Screenshots in guides (`figures`) | All 15 found in `public/screens` |
| Sitemap and hreflang | `/docs` and every guide, in en, ar and tr, with alternates (`lib/sitemap.ts`) |
| Meta and OG | Every guide has its own title, description and OG image (`[lang]/docs/[slug]`) |
| Docs search | Indexes every guide in every language (`lib/docs/search.ts`) |
| Layout at 390 and 1440, light and dark | Unchanged pages; checked again by the docs e2e after the fixes |

## Documentation and help

| Page | Problem | Fix | Size |
|---|---|---|---|
| /docs/create-account, /docs/getting-started, /docs/app-types | **Out of date.** Since #530 a new account's first page is "Studio first": Yallapp Studio's kinds of apps come first, and the app editor's types are folded under "Other app types". The guides still send you straight to "choose your app type" in App setup. | Describe the new first page and where the app editor's types are now, in en, ar and tr. | M |
| /docs/studio-templates | **Out of date.** "Studio's ten demos" and "Two looks for every demo". Studio now has 20 demos: the ten, plus ten shop types (Lujain clothes, Toota kids' clothes, Velours cosmetics, Toot toys, Sakan home decor, Ghurza crochet and handmade, Rukn furniture, Madar electronics, Nova mobiles, Nawah computers and gaming). Each shop type has four looks, A to D, and C is its main one. | Add the shop types and their four looks; correct the counts. | M |
| /docs/yallapp-studio | **Missing.** The shop types (phases 208–211, 223–227) aren't mentioned among Studio's kinds of apps. | One paragraph and a link to Studio's demos. | S |
| /docs/account-and-support | **Missing.** Yallapp Community (community.yallapp.com.tr, phase 231, live) isn't mentioned anywhere in the docs, though it's where app makers ask each other. | A short "Ask other app makers" part with the link. | S |
| /docs/yallapp-business | **Missing, waiting on a release.** Ringtones and money sounds (207, 213), ringing by order value, the end-of-day summary, pausing the shop, the home-screen widget (214) and the Pharaonic theme (215) are in Business 1.0.4–1.0.7, which isn't released (STATUS: the release waits for the owner). | Follow-up: document them with that release. | L |
| /docs/store-orders | **Missing, waiting on a release.** The wishlist, reviews with photos, "Notify me when it's back", filters and product languages (212) need the customer app's release 16. Only the dashboard's Reviews tab is live. | Follow-up: document them with release 16. | L |
| /docs/studio-elements | **Missing, waiting on a release.** A look's own product page and its eleven elements (228) are drawn by the customer app from release 16. | Follow-up with release 16. | L |
| /docs (API docs, /developers) | Checked: the developers' guide and `docs/api/openapi.yaml` include phase 228's product page. The Community API is its own (`docs/api/community.yaml`) and isn't for clients. | None. | – |

## Legal pages (audit only: no wording changed)

| Page | What is outdated or missing | Size |
|---|---|---|
| /privacy §3 (data about your app's users) | Delivery, rides and taxi apps, Yallapp Courier and the drivers' apps use live locations (couriers', drivers', and the customer's pick-up and drop-off), and the section doesn't say so. Yallapp Courier isn't named anywhere in the legal pages. | M |
| /privacy §3 | When release 16 ships: product reviews with photos, a short public name ("Ahmed K."), wishlists and "back in stock" requests. | S |
| /privacy | Yallapp Community has its own privacy page (community.yallapp.com.tr/privacy) and accounts that aren't Yallapp accounts; Yallapp's policy doesn't say so or link to it. Its data includes the Pro Developer form's ID proof, kept privately and removed after review. | S |
| /privacy §6, /terms §5 | Card payments in the apps now include Apple Pay and Google Pay through Stripe (155, 188). Stripe is named already; the wallets aren't. | S |
| /terms §3 | What Yallapp provides doesn't mention Yallapp Community, nor Studio Market's sales between designers and owners (the privacy policy covers the designers' data). | S |

## Follow-ups (not fixed here, with the reason)

- Yallapp Business 1.0.4–1.0.7 guide: waits for that release.
- Store features of 212 and the look's product page (228) in the guides: wait for the customer app's release 16.
- The legal items above: the owner rewrites the legal pages.

# Area F (the marketing site)

What was checked: every page in the sitemap (396 pages: English, Arabic and Turkish), on a production build of `main` at 2f4d5618a (after #530), at 390 wide. Every internal link on those pages was followed.


## How the crawl went

| Check | Result |
|---|---|
| Pages that don't answer 200 | none |
| Dead internal links | none |
| Images that don't load | none |
| Missing meta description, OG image or canonical | none |
| Pages with fewer than 3 hreflang links | none |
| Pages wider than the screen at 390 | none |
| English left on the marketing pages in ar and tr | none, apart from the competitor source titles on /compare/*, which are quotes and stay English. Eight guide titles in the docs menu showed in English on the test server only: earlier admin tests had saved English edits to them, and a team-edited English title shows until it's translated again. The built-in Arabic and Turkish titles are there. |
| Duplicate titles | `/solutions/multi-vendor` and `/docs/multi-vendor` were both "Multi-vendor apps · Yallapp"; a guide named like a solutions page now adds "Docs" to its title. `/yallapp-studio` keeps the product's name in all three languages (fine) |

## Area F: the marketing site

| Page | Problem | Fix | Size |
|---|---|---|---|
| Header and footer, every page | **Missing:** Yallapp Community (232–235, shipped) has no link anywhere on the marketing site. | Add "Community" to the footer's product links (en, ar, tr), to its new page. | S |
| robots.txt | **Missing:** the Community site's own sitemap (`/community/sitemap.xml`) isn't listed, so search engines only find it by chance. | List both sitemaps in robots.txt. | S |
| Home hero badge | **Inconsistent:** "Android and iOS apps for eleven kinds of business", while the section below now says "nine kinds of Studio apps", and /solutions has 18 kinds. | Count every kind with a solutions page (18), in en, ar and tr. | S |
| FAQ: "Which kinds of apps can I build?" (/faq, and the home's FAQ) | **Out of date:** it lists only the app editor's eleven kinds. Studio's kinds (delivery, food delivery, multi-vendor, rides, school, university, academy with many teachers, and the shop types) are left out. | Name the app editor's kinds and Studio's in the answer, from the registries. | S |
| /solutions/multi-vendor | **Inconsistent:** same title as the docs guide. | The guide's title adds "Docs" (en, ar, tr). | S |
| Yallapp Courier | **Not missing:** it isn't published yet (ROADMAP 104.8 is still open), so the site rightly doesn't sell it. Its docs guide exists (area A). | none | none |
| Payments, currencies, publishing | **Checked, consistent:** Kashier, iyzico, Stripe, Apple Pay and Google Pay are named on /integrations and in the FAQ; "We publish for you on Google Play and the App Store" matches the plans; plan prices come from the settings. | none | none |
| /pricing, the home, Black Friday | **Owner's rule, not met:** Studio's plans came after the app editor's: the classic product first in /pricing's hero, plan sections and product details; the home's classic plans before Studio's band; Black Friday's classic tab first, and its price drop could quote a classic plan. | Studio first everywhere with prices: /pricing's hero, plans (01 Studio, 02 the app), lifetime and details; the home's Studio band before the classic plans; Black Friday's Studio tab first and selected, with its price drop taken from Studio's plans first. | M |
| /compare/*, /solutions/*, /demo/* | **Checked:** no prices or plans on these pages. | none | none |
| Dashboard › License (plan picker) | **Checked:** an app's picker shows only its own product's plans (an app editor app can't take Studio's plans there), so the order rule doesn't apply. | none | none |
| (new) /yallapp-community | **Missing:** no marketing page for Yallapp Community. | A page in en, ar and tr: what's in the Community (Q&A, tutorials, posts and stories, showcase, groups, messages, Academy, challenges, pros, jobs, events and live, points and badges, from what it does), our own Community screenshots by day and night, and the way in to community.yallapp.com.tr; linked from the footer, in the sitemap with hreflang. | M |
| Legal pages (privacy, terms) | Area A lists what's out of date; the wording doesn't change here. | none | none |

## Follow-ups (not in this change)

- A marketing page for Yallapp Courier, once 104.8 is published.
