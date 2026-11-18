# Studio QA: Leqaa flower-shop template (18 Nov 2026)

Tester: QA session on branch `wip-qa-studio`. Nothing was fixed; this is a test report only.

## Setup (what was actually run)

- `platform/web`: `npm ci`, then `next build` (with `NODE_OPTIONS=--max-old-space-size=8192`, because the default heap ran out during the TypeScript step), then `next start -p 3210` with the exact `webServer.env` from `playwright.config.ts` (memory store, fs blobs, e2e secrets). There was no font server (`GOOGLE_FONTS_TEST_URL`), so `/api/v1/fonts/…` returns 503. Those console errors are ignored below.
- Owner flow as a real client: `/sign-up` → `/start?for=studio` → **Flower shop** → look **A · Rose hour** → name **Leqaa** → *Create my app*; then `/start?for=studio&new=1` → Flower shop → **Look B · Botanical press** → **KechFlora**. Both apps were then activated by a team admin (`/admin/clients/<id>` → *Activate & send license*, default plan).
- For each app: *Your shop › Settings* currency set to **MAD**. Added 2 categories (`<App> Weddings`, `<App> Ramadan`) and 3 products with photos from `public/flower-photos` (Atlas Red Roses / red-rose.jpg MAD 350, Majorelle Orchid / orchid.jpg MAD 520, Medina Ranunculus / ranunculus.jpg MAD 280).
- Editor driven with Playwright (Chromium, 1440×900). After each action, the **stored** result was read from what the app fetches: the hosted API `GET /api/app/<id>/pages/<slug>?platform=android` and `GET …/config?platform=android&app_version=1.0.0`, with `Accept-Language: en | ar | tr`. That header is how the app picks a language (`mobile/lib/core/api/http_client.dart:70`; there is no `lang=` query on these endpoints). Draft reads add `x-yallapp-preview: <draft token>`; published reads have no token.
- The real app was opened at `/preview-app/index.html?token=…&lang=en|ar|tr` (the Flutter web build, the dashboard's "Preview your app") at 390×844, device scale 2.
- The browser console was checked after every action (errors and page errors). **No console errors or page errors came from the editor in any run.** The only errors were the font 503s above.

Screenshots: `shots/`, JPEG, device scale 2 unless noted.

---

## Bugs

### 1. English edits never reach Arabic or Turkish phones; the template's old translations are served [156] (blocker)
- **Where:** Leqaa · Home · cover slide 1 title (`Text «Say it with roses.»`, id `nkbvnh10`). The same happens for every text that came with the template: story ring titles, marquee words, Kind words quotes, bento tiles, page titles. Large phone, light.
- **Steps:** Editor in **EN** → select the title → type `QA rose headline EN` → wait for "Saved" → *Publish*. Fetch `/pages/home` with `Accept-Language: en`, `ar`, `tr`. Open the app preview in `ar` and `tr`.
- **Expected:** The owner's edit shows on every phone, or the editor at least warns that the other languages still hold the template's words.
- **Actual:**
  - Published API: `en` = "QA rose headline EN", `ar` = "قلها بالورد.", `tr` = "Güllerle söyleyin.". Same for the draft.
  - Switching the editor to عربي or TR shows the old template text in the field and on the canvas. Nothing marks it as out of date.
  - Same result measured for: stories (`slides[0].heading` en "QA ring", ar "حب"), marquee (en "Roses\nTulips\nQA word", ar still "حب\nعيد ميلاد…"), Kind words quote 1 (en "QA quote EN", ar "[رأي أحد العملاء فيك]").
  - The app preview shows exactly this (`shots/b01-app-en-ar-tr-after-en-edit.jpg`: en / ar / tr).
- **Screenshots:** `shots/b01-app-en-ar-tr-after-en-edit.jpg`, `shots/b01-editor-ar-mode.jpg`
- **Likely cause:**
  - The template writes every text with `translations` for the other languages (`platform/web/src/lib/studio/demo-pages.ts:83-87`, the `wordIn` helper).
  - An edit in the default language only sets `text` (`platform/web/src/app/studio/editor/inspector.tsx:573-578`, `withText`).
  - The API prefers any non-empty translation (`platform/web/src/lib/pages/translate.ts:27-36`).
- **Works:** Editing **while the editor is in عربي** stores `translations.ar` and the `ar` API returns it; `en` is untouched.

### 2. "Pill" corners can't be saved; every later edit is lost and Publish is disabled [NEW] (blocker)
- **Where:** Any element's *Design › Corners › Pill*. Tried on Leqaa `Text «Collections»` and KechFlora `Text «Pick a date»`. EN, light.
- **Steps:** Select an element → click **Pill** under Corners → then edit any other text.
- **Expected:** Rounded pill saved like the other presets.
- **Actual:**
  - The bar shows `Not saved: Page "Home", page › 4 › 2 › 3 › 1: the corners must be 0 to 500.`
  - All later edits stay unsaved: after a reload the next text edit was gone.
  - **Publish is disabled** while this is shown.
  - The long message also wraps the dark bar onto two rows and pushes Publish onto the second row.
  - Typing a valid corner value (24) recovers saving.
- **Screenshot:** `shots/b02-pill-not-saved.jpg`
- **Likely cause:** The preset sends `radius: 999` (`app/studio/editor/inspector.tsx:1059`). The server allows at most `maxRadius: 500` (`lib/pages/types.ts:228`, checked at `lib/pages/validate.ts:1684`).

### 3. Corner handles are clipped on most elements, so resize and double-click can't be used [NEW, related to 159] (major)
- **Where:** Leqaa Home: `Start` button (`nag67gh9`), `Text «Collections»`, the `Collections` row (`nyupi0na`). Any element with corners, a line limit or full width. Large phone, EN, light.
- **Steps:** Select the element → drag its bottom-right corner handle, or double-click it.
- **Expected:** The element resizes; a double-click resets it.
- **Actual:**
  - Nothing is stored and the size doesn't change. The pointer lands on the element underneath (`elementFromPoint` returns the neighbour `div`, not `[data-studio-resize]`).
  - The handles are drawn 9px outside the element, inside an element with `overflow: hidden`, so they are cut off. In the screenshot the selected "Start" shows no handles at all.
  - On full-width rows the handles sit outside the phone screen, which clips them.
  - Handles work on elements with no corners (a column: drag stored `width: 204, height: 124`; double-click reset both to auto).
- **Screenshot:** `shots/b03-handles-clipped.jpg`
- **Likely cause:** `components/studio/view.tsx:710` (`overflow: node.radius || node.corners ? "hidden"`) and `:897` (line-limit text), with the handle offset at `view.tsx:1425` (`[v]: -9, [h]: -9`).

### 4. A column left on Auto width inside a row makes the whole row disappear in the app (the canvas still draws it) [159] (major)
- **Where:** Leqaa · Home · `Collections` row → `Column` (`n9b2bink`) holding `Text «Collections»` at a fixed width of 150. EN, light.
- **Steps:**
  1. Double-click a column's corner, which resets its size to Auto, or set its Width to Auto.
  2. Its child text has a fixed width.
  3. Open the app preview.
- **Expected:** The row shows as on the canvas.
- **Actual:**
  - The canvas shows "EVERY OCCASION / COLLECTIONS … Shop all".
  - The app shows "EVERY OCCASION" then an empty gap: the heading **and** "Shop all" are gone. No console error.
  - Setting the column back to **Fill** brings the row back. This was reproduced both ways.
- **Screenshots:** `shots/b04a-row-canvas.jpg` (canvas), `shots/b04b-row-app-strip.jpg` (app, scrolled; see the 4th and 5th frames)
- **Likely cause:** The app's studio row/column layout with an unbounded (auto) child holding a fixed-width child. The editor's double-click reset (`view.tsx:1487-1490`) produces this state from a template column that was `fill`.

### 5. "Build your bouquet": Start, the size chips, the day chips and "Choose this bouquet" all just open Search [162] (major)
- **Where:**
  - Leqaa · Home · `Build your bouquet` → `Start` (`nag67gh9`).
  - Page **Our bouquet**: `Classic / Deluxe / Grand` columns, `Today / Tomorrow / Pick a date`, and the `Choose this bouquet` button (`nnz8sewn`).
- **Steps:** Read the stored actions in `/pages/home` and `/pages/bouquet`; look at the page on the canvas.
- **Expected:**
  - Start opens the bouquet builder (the "Our bouquet" page).
  - A size chip selects a size.
  - "Choose this bouquet" adds the shown bouquet (Blush Garden) to the cart or opens that product.
- **Actual:**
  - Every one of them is `{"type":"screen","screen":"search"}`.
  - "Deluxe" is always drawn as selected, and nothing changes it.
  - "Blush Garden" and its description are fixed texts, not linked to the product, and no price is shown.
- **Screenshot:** `shots/b05-our-bouquet.jpg`

### 6. No way to make a tap open a category; the template's occasion rings and collection tiles all open Search [157] (major)
- **Where:**
  - "When the customer taps" on any element.
  - Leqaa Home stories ring entries (Love, Birthday, …), bento tiles (Signature bouquets, Roses, …), "Shop all".
  - KechFlora "Who are the flowers for?" chips.
- **Steps:** Open "When the customer taps"; read `slides[].action` and `entries[].action` from the API.
- **Expected:** "Roses" opens the Roses category; the owner can pick a category as the target.
- **Actual:**
  - The list has 23 choices: Nothing, 7 screens, 13 pages, *A web address*, *One entry*. There is **no category** choice.
  - *One entry* lists products only.
  - Every ring and tile stores `screen: search`, so "Love" shows all products. The owner can't fix this from Studio.

### 7. Category names stay English on Arabic and Turkish phones [157] (major)
- **Where:** App · Bouquets screen category chips; `GET /store/categories` with `Accept-Language: ar` and `tr`.
- **Steps:** Open the app in `ar`.
- **Expected:** Arabic names, as the template's own texts are (the bento tile shows "الورود").
- **Actual:**
  - The API returns "Signature bouquets, Roses, In season, … Leqaa Ramadan" for `ar` and `tr`.
  - The chips read "الكل · تخفيضات · Signature bouquets · Roses". The bento right above says "الورود".
  - *Your shop › Categories* has only one name field, so there is nowhere to enter a translation.
- **Screenshot:** `shots/b07-app-ar-categories-english.jpg`

### 8. Template product prices are Turkish-lira numbers relabelled as MAD [161] (major)
- **Where:** `GET /store/products` (both apps) after changing the currency to MAD.
- **Expected:** Converted prices, or the owner told to review them.
- **Actual:** "Blush Garden MAD 2,290.00 – MAD 4,260.00", "Velvet Red Roses MAD 2,510.00 – MAD 5,190.00", and so on. The amounts are unchanged from the TRY template.

### 9. Canvas shows ₺ prices and "[1] [2] [Price]" placeholders while the shop is in MAD and has real products [161 / 157] (minor)
- **Where:** Both apps · Home · *Fresh picks at sale prices* (flash sale) and *Loved most*. Large phone, EN, light.
- **Actual:**
  - The flash sale cards read "[1] ₺400 ₺500". The products list reads "[1] [Price] / Add a picture".
  - The app shows the real products in MAD, and leaves the flash sale out because there is no live sale.
  - The canvas never shows the owner's products.
- **Screenshot:** `shots/b08-canvas-try-prices.jpg`

### 10. Motion is set and "Saved" but removed from what the app gets; the Motion tab doesn't say why [NEW] (major)
- **Where:** Leqaa · `Text «Kind words»` (`nlv2q5it`) · Motion tab. Default plan from *Activate & send license*.
- **Steps:** When it shows **Rise**, While tapped **Bounce**, Again and again **Pulse**. Reload the editor; read `/pages/home`.
- **Expected:** The app gets `motion`, or the tab says motion isn't on this plan.
- **Actual:**
  - The choices survive a reload (they are in the draft).
  - The served node has **no `motion`**, and the template's own entrance motions are stripped too.
  - The editor shows no notice.
- **Screenshot:** `shots/b11-motion-no-plan-notice.jpg` (scale 1)
- **Likely cause:** `lib/pages/plan.ts:115-125` strips motion without `studio_motion`. Nothing in `app/studio/editor/*` reads that feature.

### 11. The Arabic text field is left-to-right [NEW] (minor)
- **Where:** Inspector › Text (and the Kind words quote field) with the editor in عربي.
- **Actual:**
  - The textarea computes `direction: ltr`. "قلها بالورد." shows aligned left with the full stop on the wrong side.
  - The quote textarea also has no accessible label.
- **Screenshot:** `shots/b01-editor-ar-mode.jpg` (right panel)

### 12. On the canvas, Arabic in the template's display font gets Latin letter-spacing, which breaks the joined letters [NEW] (minor)
- **Where:** Leqaa Home cover title in عربي (canvas only; the app draws it correctly joined).
- **Screenshot:** `shots/b01-editor-ar-mode.jpg` (the canvas title)

### 13. In dark preview, the Colours rows still change the light colours [NEW] (minor)
- **Where:** KechFlora `Text «Who are the flowers for?»`. Canvas switched with *Light / dark*.
- **Actual:**
  - Picking a Text colour stores `color` (the light one). The dark canvas doesn't change, so the control looks dead.
  - The dark colours are under a collapsed "In dark mode" section. That section works: it stored `dark_color` and the canvas updated.

### 14. The picture picker can't upload and doesn't offer the shop's own photos [NEW] (minor)
- **Where:** *Choose a picture* (e.g. the Build your bouquet photo hero).
- **Actual:**
  - The dialog says "No pictures yet. Upload in Media", then offers only Yallapp's abstract shapes.
  - The product photos just uploaded aren't offered, and there is no upload in the dialog.
  - Choosing a shape works: `image_url` was stored.
- **Screenshot:** `shots/b15-picture-picker.jpg`

### 15. Prices, delivery time zone and the template's city aren't right for a Moroccan shop [161] (minor)
- **Where:** App, `ar`.
- **Actual:**
  - Prices read "MAD 280.00" in Arabic.
  - Store `delivery_date.timezone` is `Europe/Istanbul` for this MAD shop, so the "Order before 4 pm" cut-off is computed in Turkey time.
  - The template's text says "anywhere in Cairo" in every language.

### 16. History "Bring back" is listed in Changes as "Applied a whole design" [NEW] (minor)
- **Where:** KechFlora, after *Published versions › Bring back*. Then open *Changes*.
- **Actual:** The step reads "Applied a whole design". The restore itself works (see below).

### 17. Catalog Settings breadcrumb says "Products" [NEW] (minor)
- **Where:** `/studio/project/catalog/settings`.
- **Actual:** The breadcrumb reads "KechFlora › Your shop › **Products**" on the Settings page.

### 18. Sign-in in the app defaults to +90 for a Moroccan (MAD) shop [160] (minor)
- **Where:** App preview sign-in, both apps.
- **Actual:** The country code is +90.

### 19. The coupon on the canvas is silently left out of the app [157] (minor)
- **Where:** Home · "A code for your first bouquet" (LEQAA10), both apps.
- **Actual:**
  - The canvas shows "LEQAA10 · Copy".
  - The app leaves it out because the shop has no such coupon (`coupon.bind: "public"`).
  - The editor doesn't say so.

### 20. Unlabelled inspector controls [NEW] (minor)
- **Where:**
  - Row: two checkboxes, a colour input, and selects with options `0,1,2,3` and `none,grain,dots,grid,stripes`.
  - Icon: a number input.
  - Kind words: the quote textarea.
- **Actual:** No `aria-label` and no `<label>`.

### 21. New list entries get "…" placeholders that would reach the app [NEW] (minor)
- **Where:** Kind words *Add one*, bento *Add one*.
- **Actual:** The API serves an entry with `text: "…"`, `title: "…"` straight away.

### 22. "Your app has Leqaa's 13 products" shown in KechFlora [NEW] (minor)
- **Where:** KechFlora editor › *Your first steps* › step 2.

---

## Specific checks requested

- **Cover top row** (Leqaa, look A; search disc · wordmark · bag disc; row `nu0wx9yq` 340 wide on the phone; x is relative to the page):

  | Wordmark width | Search disc | Wordmark | Bag disc |
  |---|---|---|---|
  | **Fill** (template) | x=546, 42 wide | x=598, 204 wide | x=812 (16 px from the right edge) |
  | Hug | x=546 | 78 wide | x=686 (next to the wordmark) |
  | Auto | same as Hug | | |
  | Fixed 100 | | | x=708 |

  - Row height 68 in every case.
  - The canvas is correct for Fill. In the app (`shots/b04b-row-app-strip.jpg`, frame 1) the row is drawn the same way.
  - KechFlora (look B) has no element row: its top is the page's *petal header*.
- **Build your bouquet "Start", the bouquet chips and "Choose this bouquet" (Phase 152):** bug 5.
- **"Picked for you"** (page *Your picks*): the products list is served with 5 of the shop's products. *Lately viewed* is served empty with `recent: true`, as designed.

## Tested and working

- **Selection:** clicking on the canvas selects the element, fills the inspector header and highlights its layer; layer rows select too.
- **Size:**
  - Width and Height: Auto, Fill, Hug and Fixed, then a typed number. Each stores (`width: "fill" | "hug" | 150`) and the canvas follows.
  - Lowest height.
  - Column corner drag, and double-click reset (where the handle can be reached, see bug 3).
- **Spacing:** padding top/bottom and sides; margin. Rows: Space between (`gap`), Spread (`align: between`), Line up (`cross: center`), Scrolls sideways.
- **Alignment:** To the start / In the middle / To the end (`text_align`).
- **Style:**
  - Font family through the picker (Outfit), weight, size, line height, letter spacing, italic, underline, capitals, lines at most, text style.
  - Corners (numeric), turn (90°), shadow (Medium), border (2, with a default colour), opacity (50 % → `0.5`).
  - Light colour swatches and a custom colour; background; dark colours via "In dark mode".
  - Picture change from Yallapp's pictures.
- **Visibility:** Android/iOS (`platforms`); Who sees it (`visibility`); Hide in the app (gone from the API, faded on the canvas); Name in the layers.
- **Taps:**
  - A page (`{"type":"page","page_slug":"home"}`).
  - A screen (`{"type":"screen","screen":"cart"}`).
  - A link (`{"type":"url","url":"https://…","open_in":"in_app"}`).
  - A product via *One entry* (`{"type":"item","item":{"source":"products","id":"53"}}`).
- **Lists:**
  - Stories: title, *Add a story*.
  - Marquee: words.
  - Kind words: quote, *Add one*.
  - Bento: *Add one*.
  - All of these store and are served. The language caveat is bug 1.
- **Structure:**
  - Move up/down.
  - Duplicate (button and Ctrl+D).
  - Delete (button and the Delete key).
  - Undo/Redo (bar buttons, Ctrl+Z, Ctrl+Shift+Z).
  - Lock (stores `locked: true`, removes the handles).
  - Hide/unhide from the layer's eye.
- **Saving:**
  - Autosave; Ctrl+S.
  - Publish: the live app changes only after Publish, and a second Publish replaces it.
  - *Published versions › Bring back*: confirm dialog, the draft gets the old text, the live version stays.
- **Device preview sizes:** Small phone 310, Large phone 340, Tablet 600 (page width).
- **App config:** `store.currency: "MAD"`; languages en/ar/tr; tab names translated.
- **Shop:** currency switch to MAD; categories and products added with photos; "Add product" in Studio returns to Studio's catalog.
- **Console:** no editor console errors or page errors in any run (font 503s from the test environment excluded).

## Not tested or not confirmed

- Layer drag-and-drop reorder: an automated `dragTo` between layer rows didn't move anything. I couldn't tell whether that's the control or the automation, so it's not filed as a bug.
- Corner drag on most element types (blocked by bug 3); motion in the app (blocked by the plan, bug 10).
- The story viewer's "Open" button inside the app (161); real devices; a real (non-preview) build.
- Bento tile title editing (the field wasn't reachable by my script after the entry was toggled).
- The app's dark theme.

The scripts used are in `scripts/` (Playwright; they need the e2e server above on port 3210).
