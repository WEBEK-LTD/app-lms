# Studio shop types, round 3: two new templates per type (C and D)

You are one of five programmers working in parallel on the WEBEK-LTD/app-lms repository (Yallapp: the platform in platform/web, the Flutter app in mobile, the WordPress plugin in wp-plugin). The coordinating session merges your work. Its session id is session_01MSAbbHjPLVdK4KhggTQ4Tg.

## Why this round exists (the owner's words, 23 Nov 2026)

The owner looked at the 10 new Studio shop types merged in #492 and #496: clothes, kids' clothes, cosmetics, furniture, decor, crochet, toys, electronics, mobiles, computers. Every one has templates A and B (platform/web/src/lib/studio/demo-designs/*-signature.ts). The owner was furious that **they all look like the same template**.
- They really do: every one is drawn with the same skeleton from `shop-kit-parts.ts` and `food-signature-parts.ts`. That skeleton is a small header, a search pill, category avatars, the same ~210 px hero carousel, the same product cards, the same sections and the same floating bar. Only the colours and the font change.
- The owner said: keep them exactly as they are, as side templates. Never delete them. Then give every type **two new templates that are completely different**: different from each other, from A and B, and from every other type's templates. They must be **extremely premium, top of the market**, the thing that makes people subscribe.

So the bar is this. Put any two of the 20 new templates side by side and nobody should think they share a skeleton. If yours could be produced by recolouring another one, it has failed.

## What you build, for each of your types

1. **Templates C and D**, a whole Studio project each, the same scope A and B cover today:
   - the home;
   - the category menu sheet (the header menu icon opens it; every category is a horizontal slider of cards with photo and name, its sub-categories sliding in the row; logo, close and search at the top; account, orders, wishlist, language and contact at the bottom);
   - the listing (category) page;
   - the product page;
   - cart, orders, account and sign-in in the look;
   - the tabs and the tab bar;
   - light and dark, and Arabic, English and Turkish words (lib/studio/words/*, app-words.ts);
   - everything built only from Studio's elements, so the owner can change every part.

   Each template follows **its own archetype, given below**. That archetype sets the template's header, hero, navigation, card shape, section rhythm, font and signature feature. Do not reuse `kitHero`, `kitProducts`, `kitHomeHeader`, `kitTabs`, `kitCategories` or the rest of the kit's visual parts for C and D. Write each template's own parts in its own file (for example `clothes-c-signature.ts`). Data plumbing (`ownPage`, `shop`, `kitPhoto`, `say`, ids, words, the demo kit's products and categories) may be shared.

2. **C becomes the type's main template, D its second, and A and B stay as extra templates.**
   - The demo app, /start?for=studio, Studio's new project (section, then type, then template), the Studio demo page, the picker and Studio Market (free) all show C first, then D, then A and B. A and B are listed after them, unchanged.
   - Story pages (`site/story`) use C's and D's screens.

3. **Real proof:**
   - Render the built templates themselves, in light and dark: the Studio canvas / preview at 390 px, deviceScaleFactor 2, home, menu, listing and product. Use `build/scripts/capture_screens.mjs` or the Studio preview with Playwright, whichever works.
   - Look at every image yourself and fix what is off: overflow, unreadable text in either mode, empty sections, missing photos, cramped spacing.
   - Run the platform tests that cover Studio and templates (the guard in phase 166, sections, demo, start, market), typecheck and lint, and the Flutter tests if you touch mobile.
   - Never claim a test passed unless you ran it.

## Steps

1. **Design first, quickly.**
   - For each of your two types, make HTML mockups of C and D (home light and dark, plus product light) at 390 px, rendered at deviceScaleFactor 2.
   - Each must follow its archetype.
   - Push them as JPGs to a branch `wip-v3-previews-<type>` (never merged, no PR) under `previews/<type>/`.
   - Send the coordinator a message listing the branch and files.
   - Then carry on building. **Do not wait for approval.** If the coordinator relays the owner's changes, apply them.
2. **Build C and D in Studio** to match your mockups.
3. **Screenshots, fix, tests**, then open a PR from your branch to main. Squash-ready, with ROADMAP and STATUS entries in your phase's number. Send the coordinator the PR link and the screenshot branch or files. **Do not merge.** The coordinator merges.

## The archetypes (all 20; do yours, and know the others so you stay distinct)

The font is the template's Arabic face. Check that it is in `platform/web/src/lib/fonts/google-fonts.json` with Arabic. If it is missing, pick the closest unused Arabic Google Font and say so.

| Type | C (main) | D |
|---|---|---|
| **clothes** (Lujain) | **Runway.** Immersive app-native lookbook like the best fashion apps: an edge-to-edge vertical swipe of looks at the top, with a transparent header and a tiny centred wordmark over it. Text-only category tabs (Women / Men / ...). Big quiet type, products as tall 3:4 cards with no boxes. Ivory and black, one burgundy accent. Minimal text-and-icon bar, no pill. Font: Reem Kufi. | **Outfit builder.** Light warm neutral. A "build your outfit" card stacking top / bottom / shoes as three swipeable rows. Mood chips (work, weekend, evening). Two-column staggered masonry with 28 px corners. A round floating bag button. Font: Tajawal. |
| **kids_clothes** (Toota) | **Story world.** Soft 3D-like blobs and illustrated shapes. Big round age selector at the top (0–2, 3–5, 6–9, 10+). A mascot greeting card, wavy dividers between sections, bubble icons, a bouncy rounded bar. Font: Lemonada. | **Nursery calm.** Scandinavian linen and sage. Large editorial type, a "baby gift list" card, a size-by-age guide strip, a split two-column editorial layout, thin lines, no shadows. Font: Vazirmatn. |
| **cosmetics** (Velours) | **Ritual clinic.** Clinical white with frosted glass cards. A skin-type quiz card first. A morning / night routine as a numbered step timeline, ingredient chips, lab-style numbered product cards. Font: Zain. | **Shade studio.** Deep plum and black with gloss. A shade swatch carousel that is the hero, a vertical tutorial-reel strip, a before / after card, bold display type. Font: Kufam. |
| **crochet** (Ghurza) | **Maker's market.** Textured paper, stitched dashed borders. "Who made it" artisan cards, a made-to-order timeline (order, make days, ship), a yarn-colour picker row. Font: Aref Ruqaa for display, Noto Naskh Arabic for text. | **Cozy studio.** Soft large photos, dusty rose. A toggle between "ready pieces" and "kits to make yourself", workshop / class cards with dates, a pattern of the week. Font: Mada. |
| **furniture** (Rukn) | **Architect.** Monochrome with fine grid lines. Full-width room scenes with hotspots. Dimension-first cards (W × D × H as the headline figure), a "see it in your room" card, a plan-drawing feel. Font: Cairo. | **Room by room.** A sticky segmented room switcher at the top (living, bedroom, dining, office, outdoor). A material swatch strip (oak, walnut, linen, boucle), a delivery and assembly timeline, large horizontal cards. Font: Noto Sans Arabic. |
| **decor** (Sakan) | **Gallery.** A museum wall: framed product cards with museum-label captions (name, maker, material, size), an asymmetric masonry, gallery white, black accent, generous whitespace. Font: Amiri for display, IBM Plex Sans Arabic for text. | **Moodboard.** A collage hero of overlapping polaroids. Shop by colour as colour circles that open the shop, seasonal palette cards, terracotta and cream. Font: Marhey. |
| **toys** (Toot) | **Adventure map.** Categories as islands on an illustrated map card, chunky 3D-like buttons, a stickers / rewards strip, bright primary colours, a bar with a big centre button. Font: Lalezar for display, Rubik for text. | **Montessori.** Muted earth tones with wood. Filter by skill (motor, STEM, language, creativity) and by age, "how to play" guide cards, calm photos. Font: Playpen Sans Arabic. |
| **mobiles** (Nova) | **Keynote.** Black. A single-device spotlight hero with colour swatches, spec reveal rows, a two-phone compare strip, a trade-in estimate card. Apple-keynote calm. Font: Readex Pro. | **Deals hub.** Bright white. A brand chip row, price-per-month-first cards (the installments-soon notice), a sticky compare tray, a flash countdown, a dense three-column grid. Font: Almarai. |
| **electronics** (Madar) | **Bento.** The home is a bento grid of mixed-size tiles (categories, a deal, a smart-home scene, the best seller), dark glass, spec chips. Font: IBM Plex Sans Arabic. | **Colour stage.** Every product shot on its own saturated colour background, big horizontal snapping cards, story circles of categories at the top. Font: El Messiri. |
| **computers** (Nawah) | **Battle station.** Neon RGB on black, a build-your-PC configurator card (CPU, then GPU, then RAM), FPS badges on GPUs, angular cut-corner cards. Font: Changa. | **Workstation pro.** Clean light blue-grey. A spec-sheet list of rows, a compare table, a "business / bulk quote" request card (the form element), serious and dense. Font: Alexandria. |

Vary the tab bar across all 20, using the styles Studio has (pill, dock, glass, minimal, centre button and so on), so that no two neighbours share one.

Photos:
- Use each type's existing CC0 photo folder (`platform/web/public/<type>-photos`).
- If an archetype needs more, add real, desirable CC0 photos with CREDITS entries.
- No cheap filler, no visible real brands or logos.


## The owner's standing rule (added 23 Nov, applies forever)

"مش عايز اي شبه بين تطبيق والتاني بعد كدا": from now on there must be no resemblance at all between one app (type or template) and another.
- Before you open your PR, put your C and D home screenshots next to every other template's screenshots you can render (the existing A and B of all 10 shop types, and the other sessions' preview branches `wip-v3-previews-*` once they exist). Change anything that resembles another template: header, hero, card shape, section order, bar, type scale.
- Write the rule into the Studio docs. This means ROADMAP, plus a short "Distinct templates" note in docs/STATUS.md under your phase, so future work keeps it.

## Rules (all of them, no exceptions)

- **Text:**
  - App and site text is in Modern Standard Arabic, with Western digits, plus English and Turkish.
  - Dashboard text is in Egyptian Arabic.
- **Icons:** Material Symbols Rounded only.
- **Formatting:** don't run prettier. Keep the repo's style.
- **Dependencies:** any new one must be at least 2 weeks old.
- **Secrets:** never commit secrets, keys, google-services.json, GoogleService-Info.plist or config/firebase.json.
- **Wording:**
  - No model names and no "AI" wording anywhere in the repo.
  - The public host is yallapp.com.tr.
  - Never write the company's registration details.
- **Git:**
  - Commit with `git -c user.name="WEBEK LTD" -c user.email="info@webek.org" commit`.
  - End every message with `Claude-Session: <your own session URL>`, and no Co-Authored-By line.
  - Push only to your own `wip-*` branches. Never push to main, never force-push, never rewrite history, and never delete branches, tags or releases.
  - Merge `origin/main` into your branch when you need it (a merge, not a rebase).
- **Releases:**
  - Don't bump `CLIENT_APP_RELEASE` and don't publish anything.
  - If C or D truly needs a new element in the Flutter app, keep it small, add it to the app too, with tests, and tell the coordinator, because it ships with the next app release only after the owner approves. Prefer what Studio's elements already do.
- **Production:** no production settings, no credentials, no keys rotated.
- **Cost:** spending money, licences or anything customers pay for: ask the coordinator.
- **PR body:** describe the change and the tests you actually ran with their results. End it with:

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  <your session URL>

## Coordination

- **The base:**
  - Session 1 (clothes and kids) owns the shared base: the `c` and `d` looks in `SIGNATURE_LOOKS`, the ordering C, D, A, B everywhere, and the demo default being C.
  - Session 1 pushes it first as its own small PR from `wip-v3-base`, and tells the coordinator when CI is green.
  - The others design and build on top of their own copy meanwhile, then merge main once the base lands, keeping the base's version of the shared files.
- **Messages:** send the coordinator short messages at each milestone: previews pushed, base PR, build PR, blockers.
