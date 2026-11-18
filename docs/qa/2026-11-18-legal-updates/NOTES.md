# Phase 172: a saved legal page that lacks the default's new text

18 November 2026. Branch `wip-legal-updates`, based on `main` at 693531d0.

## Why

Phase 106.11 (#452) added three sentences to the privacy policy's default
text (sections 2, 6 and 8) in English, Arabic and Turkish. A version of a
legal page saved in Admin › Website content replaces the default, so the
sentences would not show on the live site. It isn't known from the code
whether production has a saved version. The team now sees it in the admin.

## What the team sees

1. **Admin › Website content (the list).** If a saved Privacy policy, Terms
   or Refund policy lacks new text from the default, its row has an amber
   **Default updated (English)** badge (or Arabic, Turkish), one per
   language. `platform/web/src/app/admin/content/page.tsx:51`
2. **The page's editor, in that language.** An amber notice above the form:
   "Yallapp's default text for this page was updated on 18 November 2026.
   Your saved version doesn't have the changes." It also says how many
   paragraphs are new or changed since the version the saved text started
   from. `platform/web/src/app/admin/content/legal-update.tsx:86`
3. **Review the changes** lists each new, changed or removed paragraph,
   with its section, the new sentences highlighted in green (removed ones
   struck through in red), and a "Not in your version" or "Already in your
   version" badge. `platform/web/src/app/admin/content/legal-update.tsx:97`
4. **Add the new text** changes only the form. Each new paragraph goes after
   the paragraph it follows in the default. Each new sentence goes after the
   sentence it follows in its paragraph. The team's own wording is kept, and
   Last updated is set to the default's date. Then: "Check it, then click
   Save and publish. Nothing is published until you save."
   `platform/web/src/app/admin/content/forms.tsx:49`,
   `platform/web/src/lib/content/legal-diff.ts:281`
5. **When a change can't be placed** (for example, the team rewrote the
   whole paragraph), the text goes between two `====` lines at the end of
   its section, and a notice says so. A save is refused until the team
   moves the text and deletes the two lines: "Move the new text between the
   ==== lines to its place, then delete the two ==== lines."
   `platform/web/src/app/admin/content/legal-update.tsx:115`,
   `platform/web/src/lib/content/site.ts:513`
6. **Save and publish** saves the text and records the version of the
   default it's based on. The notice and the badge go away, and /privacy
   (/ar/privacy, /tr/privacy) shows the new sentences. Nothing ever happens
   automatically. `platform/web/src/app/actions/admin-content.ts:44`

## How it decides

- `platform/web/src/lib/content/legal-updates.ts:105` (`legalUpdateFor`):
  saved text, then its base, then the changes since that base. A change
  counts only while the saved text lacks a sentence the default added.
  Whatever the base, a saved version that already has the three sentences
  shows nothing.
- **Base.** A save records it in `_basedOn`, kept with the page's fields
  (no migration). Only a known version's hash is accepted
  (`legal-updates.ts:129`). A version saved before bases were recorded is
  taken as based on the default as it was when it was saved, and never
  later than the version before 18 November 2026 (`legal-updates.ts:70`).
  So any saved privacy page without the three sentences shows the notice.
- **The default's earlier versions** come from git:
  `platform/web/scripts/legal-history.mjs` writes
  `platform/web/src/content/legal-history.ts` from every commit of the three
  `legal.ts` files. It holds 17 English privacy versions, and 10 Arabic and
  10 Turkish ones. The file is committed because Netlify's clone may be
  shallow. Run the script after changing a legal page's default; a unit test
  fails until you do. The data is one JSON string, because as an object
  literal it ran `tsc` out of memory at the default heap. If no earlier
  version is known, the saved text is compared with today's default when it
  was saved before that default.
- **Removals.** A sentence the default only removed is shown in the review,
  but it never triggers the notice and is never deleted from the team's
  text.

## Tests (run on 18 November 2026, in this container)

| Check | Result |
|---|---|
| `npx next typegen` | exit 0 |
| `npx tsc --noEmit` (default heap) | exit 0 |
| eslint on every changed file | no problems |
| `npx vitest run tests/unit/legal-updates.test.ts` | 34 passed |
| `npx vitest run` (whole suite) | 374 files passed, 57 skipped; 4763 tests passed, 175 skipped |
| `npm run build` | exit 0 |
| `playwright test tests/e2e/legal-updates.spec.ts` | 4 passed (en, ar, tr, and the block that can't be placed) |
| `playwright test tests/e2e/admin-content.spec.ts tests/e2e/site-languages.spec.ts` (regression) | 12 passed |

Playwright ran with `executablePath` set to the container's own Chromium,
through a config file that wasn't kept, because the browser Playwright
1.56.1 expects isn't installed here. The spec itself is unchanged and runs
with the repo's config in CI.

The unit tests cover:

- the history having the current default for every page and language;
- the diff (one new list item and two changed paragraphs, each with exactly
  its new sentence, in en, ar and tr; paragraphs and sentences; a removed
  paragraph versus a reworded sentence);
- the detection:
  - no base, before 18 November: notice;
  - the saved text already has the sentences: no notice;
  - one sentence of three missing;
  - a recorded base (current, or 4 November);
  - a version saved without a base on 10 and 25 November;
  - the terms and the refund policy unchanged;
  - only known bases recorded;
- the merge:
  - the old default becomes the new one exactly in all three languages;
  - the team's own wording is kept;
  - text that can't be placed goes in a block, and the save is refused until
    it's moved;
  - nothing is added twice.

The e2e spec, in each language:

1. Saves a custom privacy page from before 18 November, with the team's own
   sentence. The form's base is taken out to act as an older save.
2. /privacy lacks the sentences, and the list shows the badge.
3. The notice shows. Review lists three changes, each "Not in your
   version".
4. Add the new text puts all three sentences in the form, keeps the team's
   sentence, and sets the date. /privacy is still unchanged.
5. After Save, the notice is gone, also after a reload. /privacy shows the
   three sentences and the team's sentence.
6. Back to the default text.

## Not checked

- Production: whether a saved privacy, terms or refund page exists there.
  After deploy, follow the Launch checklist's Phase 172 line.
- Against MySQL: the base is one more key in `site_content.fields` (JSON),
  stored like any field. Only the memory store was used here.
