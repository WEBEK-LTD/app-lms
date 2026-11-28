# yallapp.com.tr audit, November 2026

What was checked: every page in the sitemap (396 pages: English, Arabic and Turkish), on a production build of `main` at 2f4d5618a (after #530), at 390 wide. Every internal link on those pages was followed.

Area F is the marketing site. Area A (the docs, the help and the legal pages) adds its own tables below.

## How the crawl went

| Check | Result |
|---|---|
| Pages that don't answer 200 | none |
| Dead internal links | none |
| Images that don't load | none |
| Missing meta description, OG image or canonical | none |
| Pages with fewer than 3 hreflang links | none |
| Pages wider than the screen at 390 | none |
| English left on the marketing pages in ar and tr | none, apart from the competitor source titles on /compare/*, which are quotes and stay English, and the docs titles in /developers' guide list (area A) |
| Duplicate titles | `/solutions/multi-vendor` and `/docs/multi-vendor` are both "Multi-vendor apps · Yallapp" (area A to rename the guide); `/yallapp-studio` keeps the product's name in all three languages (fine) |

## Area F: the marketing site

| Page | Problem | Fix | Size |
|---|---|---|---|
| Header and footer, every page | **Missing:** Yallapp Community (232–235, shipped) has no link anywhere on the marketing site. | Add "Community" to the footer's product links (en, ar, tr). | S |
| robots.txt | **Missing:** the Community site's own sitemap (`/community/sitemap.xml`) isn't listed, so search engines only find it by chance. | List both sitemaps in robots.txt. | S |
| Home hero badge | **Inconsistent:** "Android and iOS apps for eleven kinds of business", while the section below now says "nine kinds of Studio apps", and /solutions has 18 kinds. | Count every kind with a solutions page (18), in en, ar and tr. | S |
| FAQ: "Which kinds of apps can I build?" (/faq, and the home's FAQ) | **Out of date:** it lists only the app editor's eleven kinds. Studio's kinds (delivery, food delivery, multi-vendor, rides, school, university, academy with many teachers, and the shop types) are left out. | Name the app editor's kinds and Studio's in the answer, from the registries. | S |
| /solutions/multi-vendor | **Inconsistent:** same title as the docs guide. | Area A renames the guide. | S |
| Yallapp Courier | **Not missing:** it isn't published yet (ROADMAP 104.8 is still open), so the site rightly doesn't sell it. Its docs guide exists (area A). | none | none |
| Payments, currencies, publishing | **Checked, consistent:** Kashier, iyzico, Stripe, Apple Pay and Google Pay are named on /integrations and in the FAQ; "We publish for you on Google Play and the App Store" matches the plans; plan prices come from the settings. | none | none |
| Legal pages (privacy, terms) | Area A lists what's out of date; the wording doesn't change here. | none | none |

## Follow-ups (not in this change)

- A marketing page for Yallapp Community, beyond the footer link: needs the owner's words and pictures of the site, so I didn't write one.
- A marketing page for Yallapp Courier, once 104.8 is published.
