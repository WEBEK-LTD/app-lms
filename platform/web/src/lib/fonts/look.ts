import type { AppFont } from "../build-config/types";
import type { Appearance } from "../pages/types";
import type { OwnFont } from "../data/types";
import { DEFAULT_ARABIC_FONT, fontFiles, freeFont, isBundledFont, type FontFile, type FreeFont } from "./catalog";

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

/** The look's fields for a chosen font: null when it's neither a free font nor one of `own` (97.2 the app's own fonts' names). */
export function lookFont(family: string | null | undefined, own: readonly string[] = []): { font: AppFont; font_family?: string } | null {
  const mine = ownName(family, own);
  if (mine) return { font: "DM Sans", font_family: mine };
  const font = freeFont(family);
  if (!font) return null;
  if (isBundledFont(font.family) && font.family !== DEFAULT_ARABIC_FONT) return { font: font.family as AppFont };
  return { font: nearestBundled(font), font_family: font.family };
}

/** The look's field for a chosen Arabic font: {} for the bundled default, null when it isn't a free font drawing Arabic or one of `own`. */
export function lookArabicFont(family: string | null | undefined, own: readonly string[] = []): { arabic_font?: string } | null {
  if (!family || family === DEFAULT_ARABIC_FONT) return {};
  const mine = ownName(family, own);
  if (mine) return { arabic_font: mine };
  const font = freeFont(family);
  return font?.arabic ? { arabic_font: font.family } : null;
}

/** 97.2 The files the app downloads for an own font: its assets, on Yallapp (`base`, like https://yallapp.com.tr). */
export function ownFontFiles(base: string, font: Pick<OwnFont, "files">): FontFile[] {
  return font.files.map((f) => ({ url: `${base}/api/v1/assets/${f.assetId}`, weight: f.weight }));
}

/** 97.2 The app's own font by its name, any case. */
function ownName(family: string | null | undefined, own: readonly string[]): string | null {
  const wanted = family?.trim().toLowerCase();
  return (wanted && own.find((name) => name.toLowerCase() === wanted)) || null;
}

/** The font a look shows: its free font, else its bundled one. */
export function lookFontName(look: Pick<Appearance, "font" | "font_family">): string {
  return look.font_family ?? look.font;
}

/**
 * The look as served to the app: with the files of its free fonts and (97.2)
 * of the app's own fonts (`own`), on Yallapp (`base`, like https://yallapp.com.tr).
 */
export function servedAppearance(look: Appearance, base: string, own: readonly Pick<OwnFont, "family" | "files">[] = []): Appearance {
  const { font_files: _files, arabic_font_files: _arabic, ...stored } = look;
  void _files;
  void _arabic;
  const filesOf = (family: string | undefined): FontFile[] => {
    const mine = family ? own.find((f) => f.family === family) : undefined;
    return mine ? ownFontFiles(base, mine) : fontFiles(base, family);
  };
  const files = filesOf(look.font_family);
  const arabic = filesOf(look.arabic_font);
  return { ...stored, ...(files.length ? { font_files: files } : {}), ...(arabic.length ? { arabic_font_files: arabic } : {}) };
}

/** `look` over `base`: a new `font` without a `font_family` replaces the base's free font too. */
export function withLook<T extends Pick<Appearance, "font" | "font_family">>(base: T, look: Partial<Appearance>): T {
  const { font_family: _drop, ...rest } = base;
  void _drop;
  return { ...(look.font && !look.font_family ? (rest as T) : base), ...look };
}
