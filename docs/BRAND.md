# Brand rules

These rules apply to everything Yallapp ships under its own name: the website,
the client dashboard, the super admin and the plugin's admin pages. Client apps
use each client's own logo and colors; Yallapp's palette is only their default.

Designs: [Yallapp design canvas](https://claude.ai/artifact/KXsMPBp2at8HgoCssXzt44)

## Colors

| Name | Hex | Use |
|---|---|---|
| Midnight | `#0E0D24` | Text, dark backgrounds, primary buttons |
| Ivory | `#F4EFE6` | Light backgrounds, text on dark |
| Ember | `#FF5A1F` | Small accents only: the logo dot, progress fills, active indicators |
| White | `#FFFFFF` | Cards and inputs |
| Ember (text) | `#C2410C` | Links and accent text on light backgrounds |

- Never put body text in Ember (`#FF5A1F`) on white or Ivory, or white text on
  Ember. The contrast is too low. Use Ember (text) or Midnight instead.
- Primary buttons are Midnight with white text.

## Type

- Bricolage Grotesque (Google Fonts) for Yallapp's own pages and as the default
  font of the Classic app template.
- The Bold and Minimal templates use Outfit and Manrope.

## Icons

- Google Material Symbols (Rounded) only. No hand-drawn or third-party icon sets.
- No imagery, icons or wording that suggests AI: no sparkles, no "AI" labels,
  no gradient glows.

## Logo files

Everything is in [`/brand`](../brand). Use the SVG files on screens and the PNG
files only where a platform requires them (stores, favicons, social).
