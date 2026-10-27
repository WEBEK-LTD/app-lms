# Brand rules

These rules apply to everything Yallapp ships under its own name: the website,
the client dashboard, the super admin and the plugin's admin pages. Client apps
use each client's own logo and colors; Yallapp's palette is only their default.

Designs: exported screens in [`docs/design/`](design).

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
- (55) IBM Plex Sans Arabic for the Arabic pages of yallapp.com.tr (/ar), in
  the same weights. Arabic text uses it first; Latin words on those pages,
  like "Yallapp" and store names, stay in Bricolage Grotesque. Arabic gets
  normal letter spacing (never the tight tracking of Latin headings) and a
  taller line height for headings. Turkish uses Bricolage Grotesque, which
  has every Turkish letter (ç, ğ, ı, İ, ö, ş, ü). Share images (Open Graph)
  for Arabic pages use IBM Plex Sans Arabic too.
- The Bold and Minimal templates use Outfit and Manrope.

## Icons

- Google Material Symbols (Rounded) only. No hand-drawn or third-party icon sets.
- No imagery, icons or wording that suggests AI: no sparkles, no "AI" labels,
  no gradient glows.

### Third-party brand marks

The Material Symbols rule is for interface icons. Logos of the stores and
platforms Yallapp really works with may appear only in the website's
**Works with** strip, as store marks on the plans and publishing texts, on
integration cards, (46) on an app's link page as its "Get it on Google
Play" and "Download on the App Store" buttons, and (54) WhatsApp's mark on
the buttons and links that open a WhatsApp chat with Yallapp ("Get started on
WhatsApp", "Talk to us on WhatsApp", the number in the footer), in the
button's own text color. Use them unaltered (the CC0 paths of the `simple-icons`
package; only the view box may be fitted to a wordmark), grey until hovered,
with the brand's name as the accessible name. A brand without a mark there is
shown as its name, never as a made-up logo. Never call these brands
"partners", and keep the note that the names and logos are trademarks of their
owners and don't mean endorsement.

## Logo files

Everything is in [`/brand`](../brand). Use the SVG files on screens and the PNG
files only where a platform requires them (stores, favicons, social).
