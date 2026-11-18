# Dashboard › Stories (Phase 165), 18 November 2026

The owner's request: the stories of the Leqaa app are managed from the
dashboard (add, remove, reorder, the category, the button…), not only in
the editor. Branch `wip-stories-dashboard`. **Migration number: 0143**
(`drizzle/0143_app_stories.sql`). It was 0142 until main took
`0142_studio_market_money` (#452); after merging main it was dropped and
made again with `drizzle-kit generate` on top of 0142. Studio Market stage 4
(`wip-market-discounts`) renumbers after this one.

## What the owner now sees

- **Dashboard › Stories** in the dashboard's menu right after Pages & look,
  and in a Studio project's menu after the editor (in Studio's frame, at
  `/studio/project/stories`). The first time it opens for an app made from
  the flower shop's template (Leqaa, Kech Flora) a green note says the
  Studio stories were copied here and nothing in the app changed, with a
  link to Studio.
- The list of stories in the app's order: drag a story, or use its arrows
  (keyboard too); each one has its photo, its dates ("From…", "Until…",
  "Ended on…"), a switch to show it or turn it off, **Edit** and **Remove**
  (asks first). At most 20.
- **Add a story / Edit**: Photo or Video (choose from Media, or paste an
  https link; a video's first picture); **Words**: small label, title,
  line, ring name and button text, each in the main language with Arabic
  and Turkish beside it (and any other language the app has), right to
  left for Arabic; **Ring**: its icon (picker, or any Material Symbols
  name); **Button**: "When the customer taps": the shop (default), a
  category or collection, a product, a page, a screen or a link; the
  story's own category (optional; with no button chosen the button opens
  the shop on it); **When it shows**: on/off, start and end. Errors show in
  the dashboard's language.
- A **live preview** beside the form: the story full screen (photo or
  video, label, title, line, button) and as a ring, in each language.
- **In Studio**, selecting the hero's slider, the rings or look B's chips
  shows "Stories from: Dashboard › Stories / As designed here in Studio",
  "These stories come from Dashboard › Stories." and **Open Stories**; the
  canvas draws the dashboard's stories in the language being edited.
- **In the app** (no new build needed): the hero's slides, the rings and
  look B's chips are the dashboard's stories, in order, only those on and
  between their dates, in the phone's language (else the main language).
  Apps built with release 9 also show each story's label, title, line,
  button words and video in the full-screen viewer and open the shop on
  the chosen category; older builds show the ring's name and photo with
  "Open" and open the shop.

## Where it is

Data
- Table and column: `platform/web/src/lib/db/schema.ts:1277` (`app_stories`,
  foreign key `app_stories_app_fk`, `app_stories_import_unique`),
  `platform/web/src/lib/db/schema.ts:394` (`apps.stories_seeded_at`);
  migration `platform/web/drizzle/0143_app_stories.sql`.
- Type: `platform/web/src/lib/data/types.ts:1443` (`AppStory`).
- Store interface: `platform/web/src/lib/data/store.ts:876`; memory
  `platform/web/src/lib/data/memory.ts:1386`; MySQL
  `platform/web/src/lib/data/mysql.ts:1671`, `markStoriesSeeded` at
  `platform/web/src/lib/data/mysql.ts:1737`.
- App tables and copy: `platform/web/src/lib/apps/app-tables.ts`
  (`app_stories: "content"`), copier `platform/web/src/lib/apps/copy.ts:267`.

Rules, serving and the copy from Studio
- Checking a story: `platform/web/src/lib/stories/index.ts:105` (`parseStory`).
- Copy of an app's Studio stories, once: `platform/web/src/lib/stories/index.ts:191`
  (`ensureStoriesSeeded`), merging the elements:
  `platform/web/src/lib/stories/index.ts:157` (`designStories`).
- Which elements, their source, their parts, the fill:
  `platform/web/src/lib/stories/elements.ts:56` (`storiesSourceOf`),
  `:93` (`storyParts`), `:247` (`withServedStories`).
- The button: `platform/web/src/lib/stories/serve.ts:23` (`storyAction`; the
  shop, `SHOP_ACTION` at `:8`).
- `GET /pages/{slug}`: `platform/web/src/lib/hosted/pages/index.ts:85` and
  `:120` (in `servedStudio`, next to the flash sale and coupon fills).
- Node fields and the category on actions: `platform/web/src/lib/pages/types.ts:174`
  (`STORIES_SOURCES`, `STORY_PARTS`, served story fields above it),
  `platform/web/src/lib/pages/types.ts:550` (`Action.category_id`); kept by
  Studio's checks: `platform/web/src/lib/pages/validate.ts:451`.
- Leqaa's template, its elements from the dashboard and their parts:
  `platform/web/src/lib/studio/demo-designs/leqaa-signature.ts:227` (and the
  slider, the slides' parts and look B's chips below it).
- Contract: `docs/api/openapi.yaml:16657` (`stories_source`, `story_part`, the
  story fields above it), `docs/api/openapi.yaml:17447` (`Action.category_id`);
  `platform/web/public/developers/openapi.yaml` the same.

Dashboard
- Page: `platform/web/src/app/dashboard/stories/page.tsx:30` (the copy at
  `:36`, the shop's categories at `:45`); Studio's frame
  `platform/web/src/app/studio/project/stories/page.tsx`.
- Editor: `platform/web/src/app/dashboard/stories/stories-editor.tsx:102`
  (list), `:250` (form), `:355` (button picker), `:449` (preview).
- Actions: `platform/web/src/app/actions/stories.ts:33`.
- Menu and permission: `platform/web/src/app/dashboard/layout.tsx:103`,
  `platform/web/src/lib/studio/project-nav.ts:145`,
  `platform/web/src/lib/team/permissions.ts:120` (`settings`, as Pages & look).
- Words: `platform/web/src/i18n/dashboard/stories.ts` (English, Egyptian
  Arabic, Turkish).

Studio
- Inspector: `platform/web/src/app/studio/editor/stories-source-controls.tsx:38`,
  used at `platform/web/src/app/studio/editor/inspector.tsx:782`.
- Canvas: `platform/web/src/lib/stories/canvas.ts:13`, used at
  `platform/web/src/components/studio/view.tsx:206`; the stories given to the
  editor at `platform/web/src/app/studio/editor/page.tsx:83`.

App (`mobile/lib`)
- `PageAction.categoryId`: `mobile/lib/core/api/models/page_models.dart:501`;
  the story's new fields and `viewerTitle`: `mobile/lib/core/api/models/page_models.dart:2386`.
- The shop on a category: `mobile/lib/modules/shared/pages/page_actions.dart:40`.
- Viewer: button words `mobile/lib/modules/shared/pages/studio_stories.dart:547`,
  video `mobile/lib/modules/shared/pages/studio_stories.dart:590`.
- `CLIENT_APP_RELEASE` 9 (the urgent apps' one release): `platform/web/src/lib/builds/app-release.ts:26`
  (with its line in the list of releases); preview rebuilt
  (`platform/web/public/preview-app`).

## Coordination with `wip-app-currency`

That branch fixes "Open on a story goes to Home". The story's button here
is an ordinary `Action` (by default `screen` `courses`, the shop; a category
is the same with `category_id`), served in the story's `action` and opened
by the app's `runPageAction` (`mobile/lib/modules/shared/pages/page_actions.dart`),
the path every tap takes, which the viewer's Open button already uses. The
only change there is the `category_id` branch at the top of the `screen`
case; the rest of the case is untouched, so that fix and this one fit
together. If that branch changes how the viewer pops and runs the action,
nothing here depends on it.

## Decisions worth knowing

- Missing `stories_source` means "as designed", except Leqaa's occasion
  elements (known by the template's names in English, Arabic and Turkish:
  "Every occasion", and look B's chips under "Who are the flowers for?"),
  which come from the dashboard: that is how projects made before 165 are
  switched without rewriting their pages. New projects from the template
  carry `stories_source: "dashboard"` and `story_part` marks.
- The copy from Studio needs no job and touches no page: it runs when the
  Stories page, Studio's editor or the app's page needs the stories, reads
  the published design (else the draft), copies each story once under its
  key (unique index), then marks the app (`stories_seeded_at`, set only
  while empty, read again from the database first). A design without such
  elements leaves the app unmarked, to look again once it has one.
- One list feeds the hero, the rings and the chips (they show the same five
  occasions): the slides lead the copy, the rings and chips add the ring's
  name and icon.
- A story element with no story shown is left out of the page (as a flash
  sale with none); the hero's stack keeps its height (STATUS, known gaps).
- Categories listed for a button: a dashboard-managed shop's own (also
  empty ones), and the connector's.

## Tests, as run here

All run in this container on 18 November 2026.

| What | Command | Result |
|---|---|---|
| Stores, validation, serving in en/ar/tr (checked against the contract), the copy of existing apps, Studio's canvas, the app copy | `npx vitest run tests/unit/phase165-stories.test.ts` | 21 passed |
| The store suite on MariaDB 10.11 (local, migrations applied) | `YALLAPP_TEST_DATABASE_URL=mysql://…@127.0.0.1:3306/yallapp npx vitest run tests/unit/app-stories-mysql.test.ts` | 4 passed |
| Migrations as CI runs them, on MariaDB 10.11 | `npm run db:migrate` twice (second: "up to date"); last row of `__drizzle_migrations` deleted, then again ("4 of 4 statements were already there"), then "up to date" | passed |
| Migrations match the schema | `npx drizzle-kit generate --name ci-check` + `git status --porcelain drizzle` | no changes |
| Related vitest files (template, signature looks, Studio, nav, i18n, app tables and copy, API reference, releases, commerce) | `npx vitest run …` (14 files) | 383 passed, 7 skipped (MySQL files without a database) |
| The whole vitest suite | `npx vitest run` | 4703 passed, 175 skipped (372 files passed, 58 skipped). An earlier run had 2 failures, `signature-looks.test.ts`'s Leqaa fixtures (`mobile/test/support/signatures/flowers_a.json`, `flowers_b.json`), regenerated with `YALLAPP_WRITE_SIGNATURES=1` as the test says; `mobile/test/support/leqaa_demo.json` likewise (`YALLAPP_WRITE_LEQAA=1`) |
| Types | `npx next typegen` + `tsc --noEmit` | no errors |
| ESLint on the changed files | `npx eslint <38 files>` | 0 errors; 20 warnings, all in `src/lib/data/mysql.ts` and the same 20 on main |
| Contract | `npx @redocly/cli@2.54.2 lint docs/api/openapi.yaml` | valid; 6 warnings, the same as on main |
| e2e: adds, reorders, removes a story and sets its button to a category; the served JSON in en, ar, tr; Studio shows the dashboard's stories | `npx next build` then `npx playwright test tests/e2e/dashboard-stories.spec.ts --trace off` | 3 passed |
| App widget test | `flutter test test/widget/phase165_dashboard_stories_test.dart test/widget/phase129_studio_premium_motion_test.dart` (Flutter 3.47.5) | 50 passed |
| App tests near the change | `flutter test` on the Leqaa screenshots, app type, donations, events, news and premium motion files | 139 passed, 145 skipped (screenshot tests need `YALLAPP_SCREENSHOTS`) |
| App format and analysis | `dart format --set-exit-if-changed lib …`, `flutter analyze` | 0 changed; no issues |
| Preview | `mobile/tool/build_preview.sh`, then `--check` | rebuilt; up to date |

Notes on the environment: the e2e run needed the pre-installed browser
linked where this project's Playwright (1.56.1) looks for it; nothing in the
repository changed for that. The screenshot suites were not run with
`YALLAPP_SCREENSHOTS`, so the app's pictures of the Leqaa home weren't
redrawn here.

## Not done here

- Nothing was run against production; Leqaa's and Kech Flora's stories are
  copied by the code the first time they're needed after deploy
  (LAUNCH-CHECKLIST Phase 165).
- A video story plays in the viewer only from release 9.

## After merging main (#451, #452, #453, #455)

Main took `0142_studio_market_money`, so this migration was dropped and made
again on top of it: **0143_app_stories**. `CLIENT_APP_RELEASE` is 9 (main's
152 is 7 and 163 is 8; the urgent apps share 9), with its line in
the releases' list. Main's 152 (`linkedProduct`, a product link with none
chosen or one the shop no longer has opens the shop) also applies to a
dashboard story's button. Run again after the merge:

| What | Result |
|---|---|
| `next typegen` + `tsc --noEmit` | no errors |
| ESLint on the files changed against main | 0 errors (20 warnings, `mysql.ts`, as on main) |
| Related vitest files (the 14 above and `phase152*`) | 383 passed, 7 skipped |
| Migrations as CI runs them, on a fresh MariaDB 10.11 database: twice, then the half-applied resume | 143 applied; up to date; "4 of 4 statements were already there"; up to date |
| `drizzle-kit generate --name ci-check` | no changes |
| `app-stories-mysql.test.ts` on MariaDB | 4 passed |
| e2e `dashboard-stories.spec.ts` on a new production build | 3 passed |
| Flutter: `phase165_dashboard_stories_test.dart` and the premium motion tests; `dart format`; `flutter analyze`; preview rebuilt and `build_preview.sh --check` | 50 passed; 0 changed; no issues; up to date |
