# Premium Studio app mockups, round 2: the shared brief

The owner approved the pilot style in
`/tmp/claude-0/-home-user/79dd7bf6-1ec5-553b-bdbf-feab2c11c43f/scratchpad/designs/pilot/`. It has three home screens (`clothes-home.png`, `beauty-home.png`, `decor-home.png`) and their sources in `pilot/_src/`:
- `*.html` for each screen
- `common.js`, which crops photos to a focal point
- `render.js`, the Playwright render
- `fonts/`, local copies of the Google Fonts and Material Symbols Rounded
- `search.py`, the Openverse search
- `img/`

Look at those three PNGs and read their HTML before you start. Your work must match that level, and keep that style.

The owner said "حلوين كمل باقي المراحل بنفس الأسلوب". The first round had giant website heroes and amateur photos, and it was rejected as "not premium". Do not go back to it.

## What the style is (keep it)
- **Frame:** a native phone app, 390 CSS px wide, rendered at deviceScaleFactor 2.
  - Top: a status bar (9:41), then a compact header of about 56 px.
  - Then a pill search field, and categories as round avatars, chips or square tiles.
  - The hero is a compact rounded card carousel: 16 px margins, radius 22–24, height about 200–230 px. It has a soft scrim, a 2-line title, a CTA pill and page dots, and the next card peeks at the edge. Never a full-bleed or tall hero.
  - Bottom: a floating translucent 5-tab bar: Home, Shop, Cart, Orders, Account.
- **Length:** each home screen has 9–12 tight native sections and is about 2,700–3,500 CSS px tall.
- **Text and icons:**
  - Arabic RTL in Modern Standard Arabic, with Western digits.
  - Material Symbols Rounded only.
  - One excellent Arabic UI font family per app.
- **Colour:**
  - A restrained palette with one accent per app.
  - No orange headers. Never white pills on coloured cards.
  - Every text must be clearly readable in both light and dark (check the contrast).
- **Templates:** each type has templates A and B. They must be clearly different personalities: a different layout rhythm, font, palette and hero/card treatment. Not a recolour.
- **Products:** real and desirable. No cheap filler: no random speakers, no junk. Fictional brand names only, with no real logos or brands visible.

## NEW in this round: the header menu (owner's request)
- **Header icon:** in every template's header, put a **menu icon** (Material Symbols `menu`, or a refined variant such as `segment`) next to the notifications icon.
- **The menu screen:** tapping it opens a menu sheet or drawer. Design it as its own screen.
  - It lists **all the categories the shop owner has made for its products** as **sliders**. Each category is a horizontal row, a carousel of cards, and **each card shows the category's name and the category's photo**.
  - Where a category has sub-categories, they slide within that row.
  - It also has the app's logo or wordmark, a close button and a search field at the top.
  - At the bottom: account, orders, wishlist, language and contact.
  - The sheet is premium, in the app's own style. The cards are rounded, with the photo filling the card and the name readable on a scrim, or the name under the photo.
- **Size:** about 1.3–2 screen heights is fine. Render it full page.

## Screens per template (render each in light and dark)
1. `home`: the full home page.
2. `menu`: the category-slider menu described above.
3. `listing`: a category page.
   - Top: a compact header with the category title and a back button, sub-category chips, and a filter/sort bar with active filter tags.
   - Then a 2-column product grid of consistent cards (badges, heart, price/old price, add button), with one promo card in the grid.
   - Then a "load more" button and the tab bar.
4. `product`: a product page.
   - The gallery (dots, thumbnails), price/old price with the discount, rating, and variant pickers (size/colour/etc.).
   - The type-specific premium blocks (see your task), the delivery/returns box, and accordion sections.
   - The reviews summary with the photo reviews, then "goes well with" and "you may also like".
   - A sticky add-to-cart bar.

Dark mode is a real dark design with deep neutral surfaces and the right contrast, not just inverted colours. The photos stay the same.

## Photos
Use ONLY StockSnap (CC0, professional) photos through the Openverse API, the same way as the pilot.
- **Search:** `https://api.openverse.org/v1/images/?q=<query>&source=stocksnap&page_size=40`
- **Download:** `https://api.openverse.org/v1/images/<id>/thumb/?full_size=true` (about 960 px)
- **Hosts:**
  - cdn.stocksnap.io is blocked.
  - Do NOT try Unsplash/Pexels search or any bot-protected site, and don't get around any protection.
  - If Openverse returns 429, back off (sleep and retry). Search sparingly, and cache the JSON results.
- **Reuse:** you may reuse the pilot's downloaded photos (`pilot/_src/img/`) where they fit your type. Their credits are in `pilot/CREDITS.md`.
- **Check every photo with the Read tool:**
  - Reject anything cluttered, off-topic, branded (readable brand names or logos), watermarked or amateur.
  - Prefer clean studio and product shots on neutral backgrounds.
  - Give product cards a uniform tinted backdrop so the grids look consistent. Pillow (python3) is available for crops and colour matching.
- **Credits:** keep a `CREDITS.md` for your output with the file, Openverse id, title, creator, licence and source URL.

## Output and disk (disk is tight: about 1.5 GB free in total for everyone)
- **Folder:** write only under your own output folder, given in your task. Copy the pilot's fonts, `common.js` and `render.js` into your `_src/` instead of editing the pilot folder.
- **Images:**
  - Final images are **JPEG, quality 90**, 780 px wide, full page.
  - Name them `<type>-<A|B>-<screen>-<light|dark>.jpg`, e.g. `clothes-A-menu-dark.jpg`.
  - Don't keep PNG copies.
- **Disk:** keep your whole folder under about 200 MB. Delete contact sheets, unused downloads and temporary renders as you go.
- **Zip:** at the end, zip the final JPGs plus `CREDITS.md` into the zip path given in your task. Keep the loose JPGs too (the owner may want changes).
- **Git:** do NOT commit or push anything.

## Rendering and checking
- **Playwright:** Chromium and Playwright are preinstalled (`require('playwright')`, `chromium.launch()` with no options). Do not install Playwright.
- **Before each screenshot:** wait for `document.fonts.ready` and for the images to load. Check there is no horizontal overflow.
- **Review every final image** with the Read tool, in slices if it is tall, as a demanding art director:
  - It must look like a top-tier native App Store app.
  - The hero must be compact.
  - Every label must be readable.
  - Nothing may be clipped or overlapping.
  - RTL must not be broken: numbers, ranges, prices and currency order.
  - Grids must be aligned and the photos consistent.
  - Dark mode must be legible.

  Fix anything that fails and re-render.

## Your final report
- The zip path, and the list of files.
- For each template: its name, palette, fonts and its home sections in order.
- The menu design.
- The photo sources.
- Anything you couldn't get right.
