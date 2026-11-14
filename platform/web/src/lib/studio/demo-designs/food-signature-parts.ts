import type { Action, StudioEntry, StudioFont, StudioHeader, StudioHeaderStyle, StudioNode, StudioSides, TabBarStyle, Translations } from "../../pages/types";
import { APP_WORDS } from "../app-words";
import type { SectionContext, SectionWord } from "../sections";
import { idOf, photo } from "./parts";

/**
 * 130.1–130.6 What Sofra Eats's, Zad's and Sahm Express's Signature looks
 * (sofra-signature.ts, zad-signature.ts, sahm-signature.ts) are drawn with:
 * a look's two inks, its texts, section titles, round buttons, photos, bar
 * and page headers. The looks' shape and list are ./signature.ts and
 * ./index.ts, as every look's.
 */

/** A look's colours by day and by night, as its board's two themes have them. */
export interface SignatureInk {
  page: string;
  darkPage: string;
  surface: string;
  darkSurface: string;
  ink: string;
  darkInk: string;
  muted: string;
  darkMuted: string;
  line: string;
  darkLine: string;
  /** The board's accent for words and small marks, and for fills (the bar's open tab, a button). */
  accent: string;
  darkAccent: string;
  fill: string;
  darkFill: string;
  /** Words on a fill. */
  onFill: string;
  darkOnFill: string;
}

export const sides = (top: number, end: number, bottom: number, start: number): StudioSides => ({ top, end, bottom, start });

/** A text in the look's ink by day and by night (`muted` for the quieter one). */
export function inked(ctx: SectionContext, k: SignatureInk, text: string, font: StudioFont, extra: Partial<StudioNode> & { muted?: boolean; accent?: boolean } = {}): StudioNode {
  const { muted, accent, ...rest } = extra;
  const [day, night] = accent ? [k.accent, k.darkAccent] : muted ? [k.muted, k.darkMuted] : [k.ink, k.darkInk];
  return { id: idOf(ctx)(), type: "text", text, font, color: day, dark_color: night, ...rest };
}

/** A section's title (in the look's display font) with a quieter word or a link at its end. */
export function signatureHead(ctx: SectionContext, k: SignatureInk, title: string, font: StudioFont, end: { text: string; action?: Action | null; muted?: boolean } | null, padding: StudioSides = sides(20, 16, 10, 16)): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    name: title,
    cross: "end",
    gap: 12,
    padding,
    children: [
      inked(ctx, k, title, font, { width: "fill" }),
      ...(end ? [inked(ctx, k, end.text, { size: 13, weight: 700 }, end.muted ? { muted: true } : { accent: true, ...(end.action ? { action: end.action } : {}) })] : []),
    ],
  };
}

/** A round frosted button over a photo: a white disc at a sixth of its strength, a thin white ring, a white icon. */
export function glassDisc(ctx: SectionContext, icon: string, action: Action, size = 44): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    overlay: { color: "#FFFFFF", opacity: 0.16 },
    border_color: "#FFFFFF",
    border_width: 1,
    surface: { glass: 14, tint: 0.16 },
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 22, color: "#FFFFFF" }],
  };
}

/** A round button on the page: the look's surface with its line, the icon in its ink. */
export function surfaceDisc(ctx: SectionContext, k: SignatureInk, icon: string, action: Action, size = 44): StudioNode {
  const id = idOf(ctx);
  return {
    id: id(),
    type: "row",
    width: size,
    height: size,
    radius: size / 2,
    align: "center",
    cross: "center",
    background: k.surface,
    dark_background: k.darkSurface,
    border_color: k.line,
    dark_border_color: k.darkLine,
    border_width: 1,
    shadow: "light",
    action,
    children: [{ id: id(), type: "icon", icon, icon_size: 22, color: k.ink, dark_color: k.darkInk }],
  };
}

const APP = APP_WORDS;

/**
 * An entry of a premium element's list (a bento tile, a story, a stat) in
 * Studio's words: its texts in the dashboard's language, Studio's other
 * two as its translations (entries keep their own, not the element's).
 */
export function sigEntry(ctx: SectionContext, words: Partial<Record<"title" | "subtitle" | "text" | "label", SectionWord>>, rest: Omit<StudioEntry, "title" | "subtitle" | "text" | "label" | "translations"> = {}): StudioEntry {
  const lang = ctx.lang ?? "en";
  const translations: Record<string, Record<string, string>> = {};
  for (const l of (["en", "ar", "tr"] as const).filter((x) => x !== lang)) {
    translations[l] = Object.fromEntries(Object.entries(words).map(([field, word]) => [field, APP[l][word!].replaceAll("{app}", ctx.app ?? "")]));
  }
  const own = Object.fromEntries(Object.entries(words).map(([field, word]) => [field, ctx.w(word!)]));
  return { ...own, ...rest, translations: translations as Translations };
}

/** Fields of a list's entry (a story's `heading`) in Studio's words: their texts in the dashboard's language and `translations` with the other two. */
export function sigTexts<K extends string>(ctx: SectionContext, words: Record<K, SectionWord>): Record<K, string> & { translations: Translations } {
  const lang = ctx.lang ?? "en";
  const translations: Record<string, Record<string, string>> = {};
  for (const l of (["en", "ar", "tr"] as const).filter((x) => x !== lang)) {
    translations[l] = Object.fromEntries(Object.entries<SectionWord>(words).map(([field, word]) => [field, APP[l][word].replaceAll("{app}", ctx.app ?? "")]));
  }
  const own = Object.fromEntries(Object.entries<SectionWord>(words).map(([field, word]) => [field, ctx.w(word)])) as Record<K, string>;
  return { ...own, translations: translations as Translations };
}

/** One of Yallapp's photos, or (without the platform's address at hand) none. */
export const sigPhoto = (ctx: SectionContext, path: string): string | null => photo(ctx, path);

/** A photo of Yallapp's as an image, or (without the platform's address at hand) a shape in the look's line colour for the owner's own photo. */
export function sigImage(ctx: SectionContext, k: SignatureInk, path: string, look: Partial<StudioNode>): StudioNode {
  const url = sigPhoto(ctx, path);
  return url
    ? { id: idOf(ctx)(), type: "image", image_url: url, fit: "cover", ...look }
    : { id: idOf(ctx)(), type: "column", background: k.line, dark_background: k.darkLine, ...look, children: [] };
}

/** A look's bar, in the look's colours by day and by night. */
export function signatureBar(k: SignatureInk, bar: Omit<TabBarStyle, "background" | "dark_background" | "active" | "dark_active" | "inactive" | "dark_inactive"> & Partial<TabBarStyle>): TabBarStyle {
  return { background: k.page, dark_background: k.darkPage, active: k.fill, dark_active: k.darkFill, inactive: k.muted, dark_inactive: k.darkMuted, ...bar };
}

/** The header of a look's pages after the home, in its colours, drawn in the look's premium header. */
export function signatureHeader(k: SignatureInk, style: StudioHeaderStyle): Pick<StudioHeader, "background" | "color" | "dark_background" | "dark_color" | "style"> {
  return { background: k.page, color: k.ink, dark_background: k.darkPage, dark_color: k.darkInk, style };
}
