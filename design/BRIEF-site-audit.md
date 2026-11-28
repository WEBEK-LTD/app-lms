# Yallapp website and docs: full review, update, and fill the gaps

The owner wants every page of yallapp.com.tr and its documentation reviewed, brought up to date with what the product does today, and the missing parts added. They also want a clear list of what was missing.

The coordinator is session_01MSAbbHjPLVdK4KhggTQ4Tg.

## Netlify credits are tight
- Push only to your wip branch.
- F integrates both areas into `wip-site-refresh` and opens **one** PR at the end.
- Every fix-up commit on that PR except the last carries `[skip netlify]`.

## Step 1: audit, read-only (send the list to the coordinator before fixing)

Go through every route in `platform/web/src/app` that a visitor or a signed-in client sees, and every guide under `/docs`. Check en, ar and tr each, plus light and dark.

For each page or guide, note:
1. **Out of date.** Wording, screenshots, counts, prices or plan names that no longer match the product. Examples:
   - Studio-first;
   - the 9 Studio kinds on the home page;
   - the Studio Market;
   - Signature looks;
   - Community;
   - the multi-vendor joining and partner panel;
   - payments (Stripe Embedded, Apple Pay/Google Pay, iyzico/Kashier in-page);
   - every world currency;
   - free publishing to the stores;
   - Yallapp Business and Yallapp Courier;
   - occasions such as Black Friday.
2. **Missing.** A shipped feature with no page, no docs guide or no mention. Use `docs/ROADMAP.md` (the [x] items) and `STATUS` as the list of what has shipped.
3. **Broken.**
   - Dead links and 404s.
   - Images that don't load.
   - Text that isn't translated (English left in ar/tr) or Arabic in the wrong register (the website uses MSA; Studio's own words use Egyptian Arabic, as the repo already does).
   - Layout that overflows at 390.
   - Missing meta title, description or OG image.
   - Sitemap or hreflang gaps.
4. **Inconsistent.** Product names, counts, plan features, or claims that contradict another page.

Write the result as `docs/audits/2026-11-site-audit.md` on your branch: one table per area with page, problem, fix and size (S/M/L). Send the coordinator a short summary. **Then start fixing right away**; don't wait.

## Step 2: fix

- Fix everything S and M in your area. For the L items, do the ones that only need words and pages; list the rest as follow-ups with a one-line reason.
- Use existing pictures (public/screens, the Signature shots, Studio demo shots). Don't invent features, numbers, customers, testimonials or prices that aren't in the code or settings.
- Every new page or guide is in en, ar and tr, with meta and OG, in the sitemap with hreflang, at 390 and 1440, in light and dark.
- **Legal pages (privacy, terms):** list what's outdated in the audit, but don't change their wording. The owner reads those first.
- **Customer-visible prices and plan contents:** only state what the code and settings already say.

## Who does what

| Area | Session | Branch |
|---|---|---|
| **F**: the marketing site (home, /solutions/*, /studio, /demo/*, /pricing, /templates and Studio Market pages, occasions, compare pages, about and contact, the footer and header nav, SEO, sitemap, OG); **integrator** | session_01PYAXYcncLY9hbcCRudL4E1 | wip-site-refresh-f → wip-site-refresh |
| **A**: documentation and help (/docs and every guide, API docs, the in-dashboard help and empty states that link to docs, emails' links to docs, the docs' screenshots, the search index of the docs), plus the legal pages' audit only | session_01PYAXYarYR6EuUg8syy5NuV | wip-site-refresh-a |

## Checks
- typecheck, lint, the vitest for the touched areas;
- the public, docs and seo e2e on a production build;
- a link check over every public route in all three languages.

Before the PR, send the coordinator before and after screenshots of the pages that changed most. Don't merge.

## Rules (unchanged)
- No "AI" wording or model names. Material Symbols Rounded only. Don't run prettier. Dependencies must be at least 2 weeks old.
- The host is yallapp.com.tr. Never write the company's registration details.
- Commit as `git -c user.name="WEBEK LTD" -c user.email="info@webek.org" commit`, with your own Claude-Session line and no Co-Authored-By.
- No force-push. Never push to main. Open no PR except F's one.
- Credits are low: when your area is handed to F, stop.
