import type { AppFont } from "../build-config/types";
import type { Appearance } from "../pages/types";
import { DEFAULT_ARABIC_FONT, fontFiles, freeFont, isBundledFont, type FreeFont } from "./catalog";

/**
 * 97.1 A free font in the app's look (`Appearance`): `font` stays one of the
 * fonts bundled with the app (older apps and plugins read only that, and the
 * app shows it until the chosen font is on the phone); `font_family` names
 * the chosen font when it isn't bundled.
 */

/** The bundled font closest to a free one, shown until it's downloaded. */
function nearestBundled(font: FreeFont): AppFont {
  return font.category === "sans" || font.category === "mono" ? "DM Sans" : "Bricolage Grotesque";
}

/** The look's fields for a chosen font: null when the catalog has no such font. */
export function lookFont(family: string | null | undefined): { font: AppFont; font_family?: string } | null {
  const font = freeFont(family);
  if (!font) return null;
  if (isBundledFont(font.family) && font.family !== DEFAULT_ARABIC_FONT) return { font: font.family as AppFont };
  return { font: nearestBundled(font), font_family: font.family };
}

/** The look's field for a chosen Arabic font: {} for the bundled default, null when it isn't a free font drawing Arabic. */
export function lookArabicFont(family: string | null | undefined): { arabic_font?: string } | null {
  if (!family || family === DEFAULT_ARABIC_FONT) return {};
  const font = freeFont(family);
  return font?.arabic ? { arabic_font: font.family } : null;
}

/** The font a look shows: its free font, else its bundled one. */
export function lookFontName(look: Pick<Appearance, "font" | "font_family">): string {
  return look.font_family ?? look.font;
}

/** The look as served to the app: with the files of its free fonts on Yallapp (`base`, like https://yallapp.com.tr). */
export function servedAppearance(look: Appearance, base: string): Appearance {
  const { font_files: _files, arabic_font_files: _arabic, ...stored } = look;
  void _files;
  void _arabic;
  const files = fontFiles(base, look.font_family);
  const arabic = fontFiles(base, look.arabic_font);
  return { ...stored, ...(files.length ? { font_files: files } : {}), ...(arabic.length ? { arabic_font_files: arabic } : {}) };
}

/** `look` over `base`: a new `font` without a `font_family` replaces the base's free font too. */
export function withLook<T extends Pick<Appearance, "font" | "font_family">>(base: T, look: Partial<Appearance>): T {
  const { font_family: _drop, ...rest } = base;
  void _drop;
  return { ...(look.font && !look.font_family ? (rest as T) : base), ...look };
}
