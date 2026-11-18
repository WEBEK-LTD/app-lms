# 18 November 2026 — "اخترناها لك" is empty on Leqaa / Kech Flora (ROADMAP Phase 164)

The owner's report: on "اختياراتك" (Your picks), "شاهدتها مؤخرًا" (Recently viewed) shows real products, but under "اخترناها لك" (Picked for you), next to "تسوّق الكل" (Shop all), there is nothing down to the bottom of the page.

## Root cause

1. **The binding.** The Leqaa Signature template binds "Picked for you" to the shop's **featured** products:
   `platform/web/src/lib/studio/demo-designs/leqaa-signature.ts:871`, `query: { limit: 6, category_id: null, featured: true, sort: "popular", ids: [] }`.
   Look B's price list has the same binding (`leqaa-signature.ts:1174`). It isn't bound to a collection, a tag or the template's sample IDs (`ids: []`).
2. **Why it was empty in a real shop.** The template's sample flowers are partly `featured: true` (`platform/web/src/lib/demo/flowers.ts:116`, `:128`, `:152`), so the list looked right while the samples were there. Leqaa and Kech Flora replaced the samples with their own products, and none of those is marked featured. The store API then answers an empty list: `GET /store/products?featured=true` filters on `p.featured` (`platform/web/src/lib/hosted/connectors/catalog.ts:388`), after `listProducts` sends `featured=true` (`platform/web/src/lib/hosted/pages/index.ts:414` before the fix).
3. **Why the title stayed over nothing.** `GET /pages` drops an empty list: `resolveBlock` returns null (`index.ts:281`), and `servedStudio` returns null for the node (`index.ts:98` before the fix). But the title and its "Shop all" are a separate row before the list (`headOf(...)`, `leqaa-signature.ts:861`), so they stayed. The app (`mobile/lib/modules/shared/pages/studio_page.dart`, `_layout` at line 1775 before the fix) drew what it got: the title, then empty space. "Recently viewed" worked because it is filled on the phone and carries its own `title`, which hides with it.

## The fix

- **Fallback at serving time** (`platform/web/src/lib/hosted/pages/lists.ts`, `productFallbacks`; used in `index.ts:101`). Any Studio list of products that comes back empty is served with the shop's best sellers instead (`orderby=popular`, the newest first among equals), else its newest products. That covers lists bound to featured products, a category, products picked by hand, or a template's sample IDs. The original binding still wins whenever the shop has matching products. A list of products **on sale** does not fall back, so other products never appear under a "Sale" title; it hides while nothing is on sale. Because this happens when the page is served, Leqaa and Kech Flora are fixed without their owners editing anything.
- **The title goes with its list** (`listHeadings` / `withListHeadings`, `index.ts:115`). A list's title is the element just before it that holds only words (texts, icons, buttons and rows or columns of them). It must either have the same name as the list, which is how the templates name a list after its title, or be the list's only companion in a column. When the server leaves a list out, it leaves the title out too, along with any row or column that ends up empty. When the list stays, its title is marked `heads: <list id>` (added to both copies of the contract).
- **The app** (`StudioNodeView.shownChildren`, `studio_page.dart`): a title marked `heads` hides while its list is hidden. That covers an empty list, a list the server left out, and "Recently viewed" before anything has been viewed. `CLIENT_APP_RELEASE` is now 7 and the preview has been rebuilt.
- **Studio** (`platform/web/src/app/studio/editor/inspector.tsx`, texts in `platform/web/src/i18n/dashboard/studio.ts` in English, Egyptian Arabic and Turkish): a products list now has a "This list shows" choice: featured products, a category, a collection you pick (the shop's products, ticked), best sellers, or newest. The sort and category controls appear only where they apply. A line explains what the app shows when there is nothing to show.
- **Every list section of the Leqaa template, looks A and B:**
  - Home: "Loved most" (look A, popular) and the price list (look B, featured).
  - Picks page: "Picked for you" (featured) and "Recently viewed" (filled on the phone).
  - The flash sale was already left out while no sale is on.
  - "The edit", "Collections" (bento and arches) and the occasions are photo tiles that open the shop, not product lists. Making those follow real categories is the `wip-app-categories` branch's work.
  - The template has no "New arrivals" or "Best sellers" sections. The general store sections of those names are also covered by the fallback and title rules.

Not covered: WordPress apps' own `/pages` (the wp-plugin) still keep an empty list's title (ROADMAP 164.7). Leqaa's template is for hosted stores.

## Tests and their real results

All of these were run in this session on branch `wip-empty-lists`.

| What | Command | Result |
|---|---|---|
| Serving fallbacks and titles, Leqaa looks A and B in a real shop (no featured flags, none of the template's IDs), shop with no products | `npx vitest run tests/unit/phase164-empty-lists.test.ts` | 9 passed. Against the old `index.ts`: 4 failed (both looks, "Picked for you", the empty shop), 5 passed (the pure helpers) |
| Related vitest | `studio-store`, `leqaa-flowers`, `dashboard-i18n`, `studio-templates`, `studio-project-templates`, `demo-apps`, `phase138-mysql`, `publish-for-all` and the files that read `/pages/home` | 13 files passed, 1 skipped; 152 tests passed, 4 skipped (MySQL: no database here) |
| Contract and API reference, release, i18n | `api-reference`, `publish-for-all`, `dashboard-i18n` | 27 passed |
| e2e: sign up, create the app from the Rose hour template, remove its sample products, check the served page JSON, add three unfeatured products, check again | `npx playwright test tests/e2e/empty-lists.spec.ts` (production build, memory mode) | 2 passed. Run only against the fixed build; the old code wasn't rebuilt for e2e |
| Flutter widget test: empty list hides with its title; a title whose list was left out hides; "Recently viewed" title; with products it shows | `flutter test test/widget/phase164_empty_lists_test.dart` | 5 passed. Without the `studio_page.dart` change: 3 failed |
| Existing Studio widget tests | `phase112_store`, `phase115_market`, `phase128_10_review_fixes`, `phase130_market_deck`, `zad_demo_home`, `studio_element_settings`, `phase129_studio_premium_motion` | 96 passed |
| `flutter analyze` | (Flutter 3.47.5, installed for this run) | No issues found |
| `dart format` (changed files) | | 0 changed |
| Preview | `mobile/tool/build_preview.sh`, then `--check` | Built; "The app preview is up to date." |
| Types | `npx next typegen` and `tsc --noEmit` | Both exit 0 (`tsc` needed `NODE_OPTIONS=--max-old-space-size=8192`; it ran out of memory with the default heap) |
| ESLint (changed files) | `npx eslint …` | Exit 0, no findings |

Running the e2e here used a local Playwright config, not committed, that only pointed at the pre-installed Chromium (`/opt/pw-browsers/chromium`). The project's Playwright version expects another browser build. The spec has its own super admin (`emptyListsAdminEmail` in `playwright.config.ts`).
