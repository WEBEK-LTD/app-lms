# Samsung layout QA, 18 November 2026 (Roadmap 163)

The owner, 18 November, urgently: "On Samsung phones, and some other phones,
the app has a terrible amount of errors." Their picture: Leqaa's Orders tab in
Arabic on a Samsung with the navigation bar: the title "رحلة زهورك إليهم"
over the top of the journey's card, the card looking offset from its steps,
"ابدأ التسوق" cut off by the navigation bar, and the sample journey shown with
no orders.

Branch `wip-samsung-layout`. Flutter 3.47.5 (as CI).

## How it was reproduced

`mobile/test/support/samsung_layout.dart` opens the real app (the Studio
renderer, `studio_page.dart`, around the app's own screens) on Leqaa's
signature template as the platform makes it
(`test/support/signatures/flowers_a.json` and `_b.json`, written by
`signature-looks.test.ts` from `leqaa-signature.ts`), with the shop's data
(`screenshots/support/leqaa.dart`), the app's bundled fonts and Fraunces. A
page drawn around a screen opens at the screen's address, as its tab does.

The phone's settings:

- font scale 1.0, 1.15, 1.3, 1.5;
- display zoom: 360 × 780 at 3×, 384 × 832 at 2.8125× (a 1080-pixel Galaxy
  zoomed in), 412 × 892 at 2.625× (standard);
- the bottom bar: 48 (three buttons) or 24 (gestures), 24 at the top.

What each run checks:

- Flutter's own layout errors (a flex overflowing, an assertion), collected;
- each Studio element's text inside the element and inside its card (its
  background or border), through transforms (a mirrored icon in RTL);
- the text's own colour inside a nearby card's edge, as drawn (letters
  reaching past their line onto another card);
- text past the screen's side;
- once the page is dragged up until nothing moves, text left under the tab
  bar or the phone's bar.

## Root causes and fixes

| # | Where (before) | Cause | Fix (after) | Settings affected |
|---|---|---|---|---|
| 1 | `mobile/lib/modules/shared/pages/studio_page.dart:1345` (`height: font?.lineHeight`), with the template's `display()` at `platform/web/src/lib/studio/demo-designs/leqaa-signature.ts:116` (`line_height: 1.04`) | A heading's 1.04 is made for Fraunces. Fraunces has no Arabic, so Arabic falls back to the app's Arabic face, Readex Pro. Readex Pro gives its line 1.25 em, but its letters reach 0.514 em under the baseline (ي ج ح ع م) and 1.134 em over it (measured from the font file). The tail of "إليهم" drew over the journey card's border, and "اختر الحجم" drew over the bouquet's size cards. | `studioLineHeight` (`studio_page.dart:2105`, used at `:1346`): Arabic text is never under 1.5; Latin keeps its designed height. | Arabic, both looks. Orders: from 1.0 (2 px over the border at 384 pt), 6–9 px at 1.5. Bouquet: 1.5. |
| 2 | `mobile/lib/modules/shared/pages/studio_covers.dart:68` (`height: StudioSize.fixed(...)`) and `:127` (`height: height`) | A photo cover's height was fixed (Leqaa A's "Build your bouquet", 300 pt), so a larger text size pushed its button out ("A RenderFlex overflowed by 13/64 pixels on the bottom", the "Start"/"ابدأ" button cut). | The designed height is its least (`studio_covers.dart:67`, `:76`, `:143`); it grows with what is on it. Same layout when it fits; a cover with a `fill` child, or one with an element hanging over its foot, keeps its height. | Look A home: 1.3 and 1.5, all widths. |
| 3 | `studio_page.dart:2093` (`texts.length == 1 ? ... : null`) | With two texts cut to their lines in a row (the card's price and was-price), none gave way, so the row ran past the 172 pt card ("overflowed by 8.8 pixels", 1.5). | The last such text gives way (`studio_page.dart:2124`). | Look A home "Loved most": 1.5. |
| 4 | `studio_page.dart:1874` (`studioTextGivingWay(kids)`) | Found by the template guard (`wip-template-guard`). A product with no sale has an empty was-price, which draws nothing, yet it was the text giving way, so a long price range could not shrink. | Chosen among the texts that show something in the card (`studio_page.dart:1856`, `_boundEmpty` `:1906`). | Guard data (₺ ranges), 1.3, 360 and 412 pt, LTR and RTL: 8–20 pt. |
| 5 | `mobile/lib/modules/shared/pages/premium/premium_testimonials.dart:127` (`Stack(` clipping by default) | Found by the template guard. The quote mark sits in the card's padding at −6/−4, and the Stack around the words cut its top 6 pt. | `clipBehavior: Clip.none` (`premium_testimonials.dart:130`). | Every setting, both directions. |
| 6 | `mobile/lib/modules/shared/pages/studio_flash_sale.dart:98`–`100` (title `Text` in a `Row(min)` in a `Wrap`) | The title couldn't wrap: "Fresh picks at sale prices" / "اختيارات طازجة بأسعار مخفّضة" ran 18 px past the banner at 1.3 and 91 px at 1.5. | The title and "Ends in" are `Flexible` (`studio_flash_sale.dart:100`, `:119`). | Both looks' home: 1.15 and up. |
| 7 | `mobile/lib/core/widgets/premium_chrome.dart:981` (`_offset.value = ...` in `_onScroll`) | `NestedScrollView` sends a scroll notification during layout when its content size changes while scrolled. The folding header then rebuilt during the frame ("Build scheduled during frame"). | Deferred to after the frame when told during layout (`premium_chrome.dart:987`). | Seen on look B Orders, English, 360 pt at 1.5, once the page was dragged. |

`CLIENT_APP_RELEASE` is 7. Each design is as designed at font scale 1.0
for Latin text: the English title's line is still 27 × 1.04 and the cover
still 300 pt (tests 163.4). Arabic text set tighter than 1.5 is now taller,
on purpose.

### Not fixed here (as agreed with the coordinating session)

- **"ابدأ التسوق" under the navigation bar before Orders is scrolled.** The
  empty state is centred in the `NestedScrollView` body, which is a full
  screen tall below the journey. Scrolled to its end, it is above the bar at
  every setting (163.2). I had added the phone's bottom inset to
  `MessageView`'s padding, which put it 24 pt higher (clear of the bar at
  1.0 on every width) and passed the tests. I took it out again because the
  coordinating session gave bottom cut-offs to `wip-page-scroll`.
- **The last items under the floating petal tab bar at a list's end.**
  Account ("Terms & Conditions", "Log out"), Bouquets/shop (the last row's
  prices) and Picks/wishlist (the grid's last prices, 1.3 pt under the
  48 pt bar). Both looks, Arabic and English, from 1.0, on every width
  checked. This is a page that doesn't scroll to its end: for
  `wip-page-scroll` (the bar's height in `MediaQuery` padding with
  `extendBody`), and Account's lists for `wip-sign-out`. The Phase 163 test
  skips only the end-of-list check on those three pages; every other check
  runs there.

### Not reproduced

- **The journey card "offset from its content, the box further left and
  lower, the dots past its right edge" in RTL.** The template's journey (a
  `timeline`, `source: latest_order`) has a white background and border, no
  glass `surface`. Its steps and dots are inside its card at every setting,
  both looks, light and dark, with and without an order. No `BackdropFilter`
  is in that page. The owner's view may come from the title's letters over
  the card's top edge (cause 1). To check on their phone after this build
  (ROADMAP 163.8).

### The sample journey with no orders

This is the template's static sample, by design. The timeline follows "the
person's newest order on its way" (`timeline.source: latest_order`,
`order_journey.dart` `OrderJourneyTimeline`, 132.160/132.187). Signed out,
with no order in progress, or while the orders load, it shows the steps as
the template draws them, the first lit. Tested in 163.3: no orders shows the
sample and no order number; with an order in progress (#5107, processing),
its number shows.

## Tests, with their real results

| Run | Command (in `mobile/`) | Result |
|---|---|---|
| Before the fixes: every page, both looks, ar and en, 384 pt @1.0 and 360 pt @1.5 (3-button bar) | survey with the harness (not committed) | 104 runs; the problems above found (title over the card at 1.0; overflows at 1.3–1.5) |
| After the fixes, light: every page × both looks × ar/en × all 24 settings | the same survey | 1,248 runs. Left: only the end-of-list cut-offs on account, shop and wishlist (`wip-page-scroll`), plus harness false positives since removed (the tab bar's own labels; a chip's edge 10 pt below a line) |
| After the fixes, dark: every page × both looks × ar/en, 2 settings | the same survey | 104 runs, only the same end-of-list cut-offs |
| After the fixes, Orders with an order × both looks × ar/en × all 24 settings | the same survey | 96 runs, no problems |
| The Phase 163 test | `flutter test test/widget/phase163_samsung_layout_test.dart` | 406 tests: 404 passed, 2 failed (my own tests' scroll target); after fixing those, both pass when run alone (not rerun as a whole file; the full suite includes it) |
| The template guard's Leqaa layout cases (from `wip-template-guard`, not committed here) | `flutter test test/widget/template_guard_test.dart --plain-name flowers_signature` | before fixes 4–5: 16 passed, 4 failed (the price row 8–20 pt at 1.3; the quote mark 6 pt). After: **20 passed, 0 failed** |
| 128.10 rules, with the new price-row case | `flutter test test/widget/phase128_10_review_fixes_test.dart` | 15 passed |
| The quote-mark test without its fix | (fix removed for the run, then restored) | failed, as it should |
| Format | `dart format --output=none --set-exit-if-changed lib test tool` | 714 files, 0 changed |
| Analyze | `flutter analyze` | No issues found |
| Preview | `tool/build_preview.sh`, then `--check` | rebuilt; "The app preview is up to date." |
| **Whole suite, once** | `flutter test` | **2,554 passed, 776 skipped (the screenshot and gallery tests, off by default), 0 failed** (10 min 14 s) |

Not run: the platform's vitest suite (no `node_modules` here). The only
platform change is `CLIENT_APP_RELEASE` 6 → 7, and its tests read the
constant.
