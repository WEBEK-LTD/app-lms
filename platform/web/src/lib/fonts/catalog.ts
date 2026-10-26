import { APP_FONTS } from "../build-config/types";
import catalog from "./google-fonts.json";

/**
 * 97.1 The free fonts clients can choose: every family of Google Fonts
 * (scripts/google-fonts.mjs makes google-fonts.json from github.com/google/fonts
 * at one commit). Their files are served from Yallapp (/api/v1/fonts), copied
 * once from that commit: neither the dashboard nor the app ever loads a font
 * from Google. The fonts bundled with the app (the six of APP_FONTS and Readex
 * Pro, its Arabic letters) need no files.
 */

export type FontCategory = "sans" | "serif" | "display" | "handwriting" | "mono";

export interface FreeFont {
  family: string;
  /** Its folder in google/fonts, like "ofl/cairo". */
  dir: string;
  category: FontCategory;
  /** It draws Arabic. */
  arabic: boolean;
  /** One variable file for every weight, or a file per weight (400 to 700). */
  files: { variable: string } | Record<"400" | "500" | "600" | "700", string>;
}

/** A file the app loads: for `weight` (null: a variable file, every weight). */
export interface FontFile {
  url: string;
  weight: number | null;
}

export const FONTS_COMMIT: string = catalog.commit;
const FAMILIES = catalog.families as FreeFont[];
const BY_NAME = new Map(FAMILIES.map((f) => [f.family.toLowerCase(), f]));
const BY_DIR = new Map(FAMILIES.map((f) => [f.dir, f]));

export const FREE_FONT_COUNT = FAMILIES.length;

/** The family by its exact name, any case. */
export function freeFont(family: string | null | undefined): FreeFont | null {
  return family ? (BY_NAME.get(family.trim().toLowerCase()) ?? null) : null;
}

/** The Arabic fonts' default: the one bundled with the app for Arabic letters. */
export const DEFAULT_ARABIC_FONT = "Readex Pro";

const BUNDLED = new Set<string>([...APP_FONTS, DEFAULT_ARABIC_FONT]);

/** A family the app has without downloading anything. */
export function isBundledFont(family: string | null | undefined): boolean {
  return BUNDLED.has(family ?? "");
}

/** Its file names. */
export function fileNames(font: FreeFont): string[] {
  return "variable" in font.files ? [font.files.variable] : [...new Set(Object.values(font.files))];
}

/** The family a font file's address names (/api/v1/fonts/<dir>/<file>), when the catalog has that file. */
export function fontFileAt(dir: string, file: string): FreeFont | null {
  const font = BY_DIR.get(dir);
  return font && fileNames(font).includes(file) ? font : null;
}

/** Where a font file is served from: `<base>/api/v1/fonts/<dir>/<file>`. */
export function fontFileUrl(base: string, font: FreeFont, file: string): string {
  return `${base}/api/v1/fonts/${font.dir}/${encodeURIComponent(file)}`;
}

/** The files the app loads for a family: none for a bundled or unknown one. */
export function fontFiles(base: string, family: string | null | undefined): FontFile[] {
  const font = isBundledFont(family) ? null : freeFont(family);
  if (!font) return [];
  if ("variable" in font.files) return [{ url: fontFileUrl(base, font, font.files.variable), weight: null }];
  // One entry per file (a family without a 600 uses its 500 or 700 file there).
  const files = font.files;
  const seen = new Set<string>();
  return (["400", "500", "600", "700"] as const)
    .filter((w) => !seen.has(files[w]) && seen.add(files[w]))
    .map((w) => ({ url: fontFileUrl(base, font, files[w]), weight: Number(w) }));
}

export interface FontSearch {
  q?: string;
  arabic?: boolean;
  category?: FontCategory | null;
  limit?: number;
}

/**
 * The families matching a search, best first: names starting with the words,
 * then containing them; the bundled ones first when nothing is typed.
 */
export function searchFonts(search: FontSearch): FreeFont[] {
  const q = (search.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(search.limit ?? 40, 1), 100);
  const fits = (f: FreeFont) => (!search.arabic || f.arabic) && (!search.category || f.category === search.category);
  if (!q) {
    const bundled = APP_FONTS.map((name) => BY_NAME.get(name.toLowerCase())).filter((f): f is FreeFont => Boolean(f) && fits(f!));
    const rest = FAMILIES.filter((f) => fits(f) && !isBundledFont(f.family));
    return [...bundled, ...rest].slice(0, limit);
  }
  const starts: FreeFont[] = [];
  const contains: FreeFont[] = [];
  for (const f of FAMILIES) {
    if (!fits(f)) continue;
    const name = f.family.toLowerCase();
    if (name.startsWith(q)) starts.push(f);
    else if (name.includes(q)) contains.push(f);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** A file served at `dir/file` in the google/fonts repository, at the catalog's commit. */
export function googleFontsSource(dir: string, file: string, base = "https://raw.githubusercontent.com/google/fonts"): string {
  return `${base}/${FONTS_COMMIT}/${dir}/${encodeURIComponent(file)}`;
}
