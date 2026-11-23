# Yallapp Business · Pharaonic theme (design pilot)

A second, optional theme for the Business app: night lapis and burnished gold,
faience turquoise for "now" and action links, warm papyrus for light mode. The
owner picks it in Settings › Appearance; the current look stays the default.
This folder is design only: no app code changed.

How themes work (confirmed by the owner): the current Business look stays
exactly as it is, stays the default, and keeps its own light and dark. Pharaonic
is an extra theme with its own light and dark. The existing light/dark setting
applies to whichever theme is chosen. The theme screen shows the default first
(on the start side), marked "الافتراضي", with Pharaonic beside it.

## Screens (`screens/`, 390 × 844 at 2x, JPEG 90)

| File | Screen |
|---|---|
| `signin-dark.jpg`, `signin-light.jpg` | Welcome / sign-in (`SignInScreen`) |
| `home-dark.jpg`, `home-light.jpg` | Today: greeting, shop cartouche, KPIs, a new-order card, "Needs you now" |
| `home-en-dark.jpg` | The same home in English, LTR |
| `home-tr-dark.jpg` | The same home in Turkish, LTR (`E£385,00`, tr-TR format) |
| `order-dark.jpg`, `order-light.jpg` | An order's page (`OrderScreen`): stage, customer, items, totals |
| `sounds-dark.jpg`, `sounds-light.jpg` | Settings › Ringtones › New orders (`RingtonePickerScreen`) |
| `theme-picker-dark.jpg` | Settings › Appearance: Default vs Pharaonic, then light/dark |

All text is the app's own Arabic/English strings (`lib/l10n/app_*.arb`) except
the theme picker's new ones (below). Prices use the server's Arabic format
(`ar-EG-u-nu-latn`, narrow symbol: `385.00 E£`; English `E£385.00`), digits are
Western, and every amount, time and order number is isolated LTR so it never
reorders inside RTL text.

Re-render: `node src/render.js` (from this folder; uses the preinstalled
Playwright, serves the folder on localhost because CSS masks don't load from
`file://`). Sources: `src/*.html`, `src/theme.css`, `src/home.css`,
`src/ornaments.js`, `svg/*.svg`.

## Palette

| Token | Dark (hero) | Light | Use |
|---|---|---|---|
| background | `#0A0F1E` night | `#F3EBD9` papyrus | pages |
| glow | `#17244D` lapis | `#E7D9B9` | radial glow behind headers |
| surface | `#121A31` | `#FBF7EE` | cards, fields |
| surface2 | `#18223F` | `#EFE4CC` | chips, tonal buttons, nav pill |
| line | `#27314F` | `#E0D3B6` | borders, separators |
| gold line | gold @ 40% | `#7A5710` @ 38% | gilt frames |
| ink | `#F4EAD5` | `#161B2E` | text |
| ink2 | `#B9AF98` | `#4D4535` | secondary text |
| gold | `#E2BE6A` | `#674A0B` | headings accents, order numbers, chosen state |
| faience | `#56D4C3` | `#075A52` | "now" state, links, call/message icons |
| danger (carnelian) | `#FF8E7A` | `#8E2918` | reject, cancel |
| success | `#7FD9A6` | `#17583A` | paid |
| primary button | gold gradient `#F0D48C → #C3963C`, text `#1A1406` | lapis `#24346E → #1C2A5C`, text `#F7EBCB`, gold hairline | |

Contrast (WCAG): every text colour above is AA on background, surface and
surface2 in its mode. In light mode it is also AA on the darkest pixel of the
washed papyrus (`#DACAA7`): ink 10.6, ink2 5.9, danger 5.2, success 5.2, gold
5.1, faience 5.0. In dark mode ink2 on surface2 is 7.2:1; button text 10.3:1
(dark) and 11.5:1 (light). Text that sits directly on the starry or papyrus
ground also gets a soft halo in the ground colour (a `Shadow` in Flutter), so
no star or fibre ever crosses a letter. Ornaments are decorative only.

## Round 2: clearly Pharaonic

- **Dark ground: the starry tomb ceiling.** Hand-varied gold five-pointed
  stars in offset rows (`svg/star-ceiling.svg`, 36% opacity) under a wide
  diagonal band of sky and a faint gold horizon.
- **Light ground: real papyrus.** A seamless 384 px tile of crossed strips and
  fibres (`img/papyrus.jpg`, made from `img/papyrus-source.svg`), washed 38%
  for contrast, with ruled inscription columns of abstract carved marks down
  both edges (`svg/relief-column.svg`).
- **Temple architecture.** A painted cavetto cornice (gold, faience and lapis
  flutes over a bound torus; `svg/cornice.svg`) tops the welcome and home
  screens; a kheker frieze (`svg/kheker.svg`) tops the inner pages; bound
  papyrus columns (`svg/papyrus-column.svg`) frame the welcome screen; a pylon
  (`svg/pylon.svg`, `svg/pylon-lines.svg`) stands behind the winged sun, which
  now carries two uraei.
- **Cards.** Solid as before, with gold corner pieces (`svg/corner-*.svg`).
  The new-order card has a faience-tile edge; the chosen ringtone a vertical
  one.
- **Motifs** (`svg/motifs/`): ankh, djed, was sceptre, Eye of Horus, scarab,
  as section-title ends, in-card heading marks and the welcome footer frieze.
  Decoration only; every action is still a Material Symbol.
- **Fonts:** Reem Kufi was tried for headings: monumental, but its tight word
  spacing reads worse at a glance, so El Messiri stays.
- **Not used:** museum photos (Openverse). The drawn ornament carries the look
  and a photo layer would fight the starry/papyrus grounds and the text.
- **The sign-in period:** the sentence ends "…لوحة تحكم Yallapp." In RTL the end
  of a line is on the left, so the period correctly appears to the left of
  the Latin word (".Yallapp" visually). The word is isolated and now kept on
  the same line as "تحكم" so it no longer stands alone.

## Fonts

- **El Messiri** (Google Fonts, OFL): headings, greetings, section titles,
  shop name, the wordmark. Designed with Arabic and Latin together, it reads
  as refined and Egyptian without becoming calligraphy.
- **IBM Plex Sans Arabic** (OFL, already bundled in the app): all body text,
  fields, buttons, and **every number** (order numbers, prices, times) with
  tabular, lining figures. Numbers never use the display font.
- **Material Symbols Rounded** (Apache 2.0): every icon that means an action
  or a state. Decoration is custom SVG only.

## Ornaments (all original, in `svg/` and `src/ornaments.js`)

- **Winged sun** (`svg/winged-sun.svg`): a disc with two curls and three tiers
  of swept feathers; the sign-in mark and the theme's preview.
- **Cartouche** (`src/ornaments.js`): a double-lined oval with its tie bar at
  the inline end (left in Arabic, right in English), drawn to each box's size.
  Frames the shop's name on Today and the order number on its page.
- **Lotus border** (`svg/lotus-border.svg`): an open lotus and a bud on arcs
  over a hairline, tiled whole (never cut). Section rules, the top edge of the
  nav bar and the order page's action bar, the sign-in divider.
- **Glyph texture** (`svg/glyph-texture.svg`): abstract carved-stone marks
  (arcs, ovals, bars, chevrons, dots), no real signs or words, at 3.5% (dark)
  or 5% (light), fading out under the headers.

## New strings the theme would need

| Key (proposed) | ar | en |
|---|---|---|
| `themeTitle` | السمة | Theme |
| (name) | Yallapp | Yallapp |
| `themeDefaultBadge` | الافتراضي | Default |
| `themeDefaultHelp` | المظهر الحالي للتطبيق | The app's current look |
| `themePharaonic` | فرعوني | Pharaonic |
| `themePharaonicHelp` | ليلي وذهبي، بزخارف مصرية قديمة | Night and gold, with ancient Egyptian ornaments |
| `themeModeTitle` | فاتح أو داكن | Light or dark |
| `themeModeHelp` | لكل سمة وضعها الفاتح والداكن، ويتبعان هذا الإعداد. | Each theme has its own light and dark; both follow this setting. |

(Turkish to be written with the others.)

## Building it in Flutter

1. **Choice and storage.** An `AppTheme { standard, pharaonic }` enum kept on
   the phone next to `themeModeProvider` (same `SettingsService`), read in
   `app.dart` where `buildTheme` is called. `AppearanceScreen` gains the two
   preview cards above its existing light/dark radios. Prime's `PrimeLook`
   stays as it is; under Pharaonic it is ignored (or Pharaonic becomes a look
   that every plan may pick: a product decision).
2. **Colours.** Two more `YbColors` presets (`pharaonicDark`, `pharaonicLight`)
   with the values above: `accent` = gold, `accentText` = faience, `head*` for
   the Prime header. Add them to `test/unit/theme_test.dart`'s AA checks.
3. **A second ThemeExtension, `YbOrnaments`**: `gold`, `goldLine`, `faience`,
   `glyphOpacity`, the primary button gradient, the display font family, and
   `bool pharaonic` so widgets can ask `context.ornaments?.pharaonic`. The
   default theme has none, so nothing changes for it.
4. **Fonts.** Bundle El Messiri (the variable TTF from google/fonts, OFL) in
   `pubspec.yaml`; `buildTheme` uses it for `display*`, `headline*` and
   `titleLarge/Medium`, Plex Sans Arabic for the rest, and a `NumText` /
   `TextStyle` helper with `FontFeature.tabularFigures()` for amounts and order
   numbers (wrapped in `Directionality.ltr` where they stand alone).
5. **Ornaments as CustomPainters** (no new package: the app has no SVG
   renderer). `CartouchePainter(size, textDirection)`, `LotusBorder`,
   `CorniceFrieze`, `KhekerFrieze`, `ColumnBand` (repeating `Path`s, tile
   counts rounded so none is cut), `WingedSun`, `Pylon`, the five motifs, and
   a `StarCeiling` backdrop (a cached `ui.Picture` tile as an `ImageShader`).
   The light ground is `img/papyrus.jpg` as a repeating `DecorationImage`
   (~18 KB asset). The SVG paths in `svg/` port directly to `Path` calls.
6. **Components.** `FilledButton` with `backgroundBuilder` for the gold
   gradient; a `GiltCard` (card + inner hairline); a `PharaonicSectionTitle`
   (title + lotus rule) used where `SectionTitle` is; the `NavigationBar`
   wrapped with the lotus edge and a gold-outlined indicator.
7. **Welcome screen.** `SignInScreen` (and `LockScreen`, `OpeningScreen`)
   swap the plain `Wordmark` for the winged sun + wordmark + lotus divider and
   the glyph backdrop when `pharaonic` is on. The theme is known before
   sign-in because it is kept on the phone. The native launch splash stays the
   default brand (Android 12+ can't vary it per in-app choice).
8. **Today.** The shop switcher sits in a cartouche; the newest order that
   waits to be accepted can show as the new-order card (data from the orders
   or food-orders list the app already loads).

**Size, roughly:** 8–10 developer days with the round-2 ornament set. Tokens, choice and storage 1 day;
fonts and text styles 0.5; painters and backdrops 3–3.5; sign-in, lock and opening screens
1; Today, order page, ringtones, nav and buttons 1.5–2; contrast tests, RTL/LTR
golden screenshots and store-screenshot pass 1.

## Not done / open points

- Turkish strings for the theme picker (the Turkish home is rendered).
- The new-order card on Today is a proposal: today the app lists new orders in
  Orders and Food orders, not on Today.
- Light-mode ornaments reuse the gold artwork darkened by a CSS filter; in the
  app they would be painted directly in `#9C7428`-range golds.
