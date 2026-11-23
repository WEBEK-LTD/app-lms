# Yallapp Business · Pharaonic theme (design pilot)

A second, optional theme for the Business app: night lapis and burnished gold,
faience turquoise for "now" and action links, warm papyrus for light mode. The
owner picks it in Settings › Appearance; the current look stays the default.
This folder is design only: no app code changed.

## Screens (`screens/`, 390 × 844 at 2x, JPEG 90)

| File | Screen |
|---|---|
| `signin-dark.jpg`, `signin-light.jpg` | Welcome / sign-in (`SignInScreen`) |
| `home-dark.jpg`, `home-light.jpg` | Today: greeting, shop cartouche, KPIs, a new-order card, "Needs you now" |
| `home-en-dark.jpg` | The same home in English, LTR |
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
| ink2 | `#B9AF98` | `#5A513F` | secondary text |
| gold | `#E2BE6A` | `#7A5710` | headings accents, order numbers, chosen state |
| faience | `#56D4C3` | `#0A6B62` | "now" state, links, call/message icons |
| danger (carnelian) | `#FF8E7A` | `#A3311E` | reject, cancel |
| success | `#7FD9A6` | `#1D6B43` | paid |
| primary button | gold gradient `#F0D48C → #C3963C`, text `#1A1406` | lapis `#24346E → #1C2A5C`, text `#F7EBCB`, gold hairline | |

Contrast (WCAG): every text colour above is AA on background, surface and
surface2 in its mode. Lowest pairs: light faience on surface2 5.05:1, light gold
on surface2 5.20:1; dark ink2 on surface2 7.20:1; button text 10.3:1 (dark) and
11.5:1 (light). Ornaments are decorative and carry no meaning.

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
| `themeDefault` | الافتراضي | Default |
| `themeDefaultHelp` | ألوان Yallapp المعتادة | Yallapp's usual colours |
| `themePharaonic` | فرعوني | Pharaonic |
| `themePharaonicHelp` | ليلي وذهبي، بزخارف مصرية قديمة | Night and gold, with ancient Egyptian ornaments |
| `themeModeTitle` | فاتح أو داكن | Light or dark |

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
   renderer). `CartouchePainter(size, textDirection)`, `LotusBorder` (a
   repeating `Path`, tile count rounded so none is cut), `WingedSun`, and a
   `GlyphBackdrop` (a cached `ui.Picture`/`ImageShader` tile with a vertical
   fade). The SVG paths in `svg/` port directly to `Path` calls.
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

**Size, roughly:** 6–8 developer days. Tokens, choice and storage 1 day;
fonts and text styles 0.5; painters 1.5–2; sign-in, lock and opening screens
1; Today, order page, ringtones, nav and buttons 1.5–2; contrast tests, RTL/LTR
golden screenshots and store-screenshot pass 1.

## Not done / open points

- Turkish strings and a Turkish render.
- The new-order card on Today is a proposal: today the app lists new orders in
  Orders and Food orders, not on Today.
- No artefact photo was used; nothing needed one.
- Light-mode ornaments reuse the gold artwork darkened by a CSS filter; in the
  app they would be painted directly in `#9C7428`-range golds.
