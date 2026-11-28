# Site audit, November 2026: area A (documentation, help, legal)

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
