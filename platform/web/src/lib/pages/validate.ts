import type { App } from "../data/types";
import { appUrl } from "../env";
import { lookArabicFont, lookFont } from "../fonts/look";
import { parseInterfaceStrings } from "../i18n/app-strings";
import { isLanguageCode, MAX_LANGUAGES } from "../i18n/locales";
import { BLOCK_DEFINITIONS, blockListLimits, blockTextLimit, ENTRY_TEXT_LIMITS, type BlockList, type BlockText } from "./blocks";
import { cleanBlockHtml, safeHref } from "./html";
import { BLOCK_LABELS } from "./labels";
import { ICON_NAME } from "./icons";
import { appOpensScreen, blockTypesFor, categorySourcesFor, itemSourcesFor, screenName, sortFor } from "./sources";
import {
  ACTION_TYPES,
  APP_FONTS,
  APP_TEMPLATES,
  BUTTON_STYLES,
  CARD_STYLES,
  CATEGORY_STYLES,
  CORNERS,
  LOOK_MODES,
  type FigmaLook,
  type FigmaPicture,
  ITEMS_LAYOUTS,
  ITEMS_SORTS,
  LAYOUT_LIMITS,
  BLOCK_ALIGNS,
  BLOCK_BACKGROUNDS,
  BLOCK_CORNERS,
  BLOCK_SPACINGS,
  BLOCK_TEXT_SIZES,
  DIVIDER_STYLES,
  FORM_FIELD_KINDS,
  FORM_SEND_TO,
  HEADER_ICONS,
  HEADER_LAYOUTS,
  IMAGE_FITS,
  MAX_HEADER_ICONS,
  PAGE_BACKGROUNDS,
  SHOW_PLATFORMS,
  NOTICE_TONES,
  QUICK_LINK_STYLES,
  SCREENS,
  SOCIAL_NETWORKS,
  SPACER_SIZES,
  STUDIO_ALIGNS,
  STUDIO_BINDS,
  STUDIO_CROSS,
  STUDIO_ENTERS,
  STUDIO_FITS,
  STUDIO_FONT_WEIGHTS,
  STUDIO_HEADER_BUTTONS,
  STUDIO_HEADER_TYPES,
  STUDIO_LAYOUT_TYPES,
  STUDIO_LIMITS,
  STUDIO_LOOPS,
  STUDIO_NODE_TYPES,
  STUDIO_PINS,
  STUDIO_PLATFORMS,
  STUDIO_PRESSES,
  STUDIO_SHADOWS,
  STUDIO_TEXT_ALIGNS,
  STUDIO_VISIBILITY,
  TAB_LABELS,
  THEME_MODES,
  TRANSLATABLE,
  TRANSLATABLE_ENTRIES,
  VISIBILITIES,
  WEEKDAYS,
  type Action,
  type AppHeader,
  type Appearance,
  type AppDefaultsSetting,
  type BlockType,
  type EntryList,
  type HeaderIcon,
  type StudioHeader,
  type StudioNode,
  type StudioPage,
  type StudioSides,
  type StudioSize,
  type FaqEntry,
  type HoursPeriod,
  type Person,
  type QuickLink,
  type Quote,
  type Slide,
  type SocialProfile,
  type Stat,
  type ItemSource,
  type ItemsQuery,
  type BlockLook,
  type BlockShow,
  type Card,
  type FormField,
  type GalleryImage,
  type LanguageCode,
  type Languages,
  type LayoutBlock,
  type LayoutContent,
  type LayoutPage,
  type LayoutTab,
  type TabBarStyle,
  type Translations,
} from "./types";

/**
 * Checks a layout the dashboard sends and rebuilds it from known fields only,
 * so nothing else is stored or served. Errors read like the dashboard's
 * other messages and say where the problem is.
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
/** 99.3 A date and time with its zone, as `toISOString` writes it. */
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const HEX = /^#[0-9A-Fa-f]{6}$/;

const BLOCK_NAMES: Record<string, string> = BLOCK_LABELS;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

class Checker {
  errors: string[] = [];
  fail(where: string, message: string): void {
    if (this.errors.length < 50) this.errors.push(where ? `${where}: ${message}` : message.charAt(0).toUpperCase() + message.slice(1));
  }

  /** Required text, trimmed, 1 to `max` characters. */
  text(where: string, value: unknown, max: number, what: string): string {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) this.fail(where, `add ${what}.`);
    else if (text.length > max) this.fail(where, `${what} can have at most ${max} characters.`);
    return text.slice(0, max);
  }

  /** Optional text: null when empty. */
  optionalText(where: string, value: unknown, max: number, what: string): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") {
      this.fail(where, `${what} must be text.`);
      return null;
    }
    const text = value.trim();
    if (text.length > max) this.fail(where, `${what} can have at most ${max} characters.`);
    return text ? text.slice(0, max) : null;
  }

  /** An https address for images, videos and web pages. */
  mediaUrl(where: string, value: unknown, what: string, required: true): string;
  mediaUrl(where: string, value: unknown, what: string, required: false): string | null;
  mediaUrl(where: string, value: unknown, what: string, required: boolean): string | null {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      if (required) this.fail(where, `add ${what}.`);
      return null;
    }
    let url: URL | null = null;
    try {
      url = new URL(text);
    } catch {
      url = null;
    }
    // 97.5 The platform's own files too, 99.1 and the designs' pictures (https in production; local tests serve them over http).
    const own = url !== null && url.origin === new URL(appUrl()).origin && /^\/(api\/v1\/assets|design-pictures)\//.test(url.pathname);
    if (!url || (url.protocol !== "https:" && !own) || text.length > 2000 || /\s/.test(text)) {
      this.fail(where, `${what} must be a full https address.`);
      return null;
    }
    return url.toString();
  }
}

export interface ParseOptions {
  /** 105.3 With its vertical: some open more screens than their engine. */
  app: Pick<App, "appType" | "backend" | "vertical">;
  now: Date;
  /** 97.2 The names of the app's own fonts, which its look may use. */
  ownFonts?: readonly string[];
}

export function parseAppearance(value: unknown, c: Checker = new Checker(), where = "Look", ownFonts: readonly string[] = []): Appearance {
  const v = record(value) ?? {};
  if (!record(value)) c.fail(where, "the look is missing.");
  if (!oneOf(APP_TEMPLATES, v.template)) c.fail(where, "choose a template.");
  if (!oneOf(THEME_MODES, v.theme_mode)) c.fail(where, "choose how the app opens: system, light or dark.");
  if (typeof v.user_can_change_mode !== "boolean") c.fail(where, "say whether people can switch light and dark mode.");
  if (v.secondary_color !== null && v.secondary_color !== undefined && v.secondary_color !== "" && !(typeof v.secondary_color === "string" && HEX.test(v.secondary_color))) {
    c.fail(where, "the secondary color must look like #E8B04B.");
  }
  if (!oneOf(APP_FONTS, v.font)) c.fail(where, "choose a font.");
  // 97.1 A free font, and the Arabic text's font (files are added when served, never kept).
  const chosen = v.font_family === undefined || v.font_family === null || v.font_family === "" ? {} : lookFont(typeof v.font_family === "string" ? v.font_family : null, ownFonts);
  if (!chosen) c.fail(where, "choose a font from the list.");
  const arabic = lookArabicFont(typeof v.arabic_font === "string" ? v.arabic_font : null, ownFonts);
  if (!arabic || (v.arabic_font != null && typeof v.arabic_font !== "string")) c.fail(where, "choose an Arabic font from the list.");
  if (!oneOf(CORNERS, v.corners)) c.fail(where, "choose the corners.");
  if (!oneOf(CARD_STYLES, v.cards)) c.fail(where, "choose the card style.");
  const header = v.header === undefined || v.header === null ? null : parseHeader(v.header, c, where);
  return {
    template: v.template as Appearance["template"],
    theme_mode: v.theme_mode as Appearance["theme_mode"],
    user_can_change_mode: v.user_can_change_mode === true,
    secondary_color: typeof v.secondary_color === "string" && HEX.test(v.secondary_color) ? v.secondary_color.toUpperCase() : null,
    font: v.font as Appearance["font"],
    ...(chosen ?? {}),
    ...(arabic ?? {}),
    corners: v.corners as Appearance["corners"],
    cards: v.cards as Appearance["cards"],
    ...(header ? { header } : {}),
  };
}

/** 101 The header of the pages in the bottom tabs: a layout and up to four buttons, each once. */
function parseHeader(value: unknown, c: Checker, where: string): AppHeader | null {
  const v = record(value);
  if (!v || !oneOf(HEADER_LAYOUTS, v.layout)) {
    c.fail(where, "choose the header.");
    return null;
  }
  const icons: HeaderIcon[] = [];
  for (const icon of Array.isArray(v.icons) ? v.icons : []) {
    if (!oneOf(HEADER_ICONS, icon)) c.fail(where, "a header button isn't one the app has.");
    else if (!icons.includes(icon)) icons.push(icon);
  }
  if (v.icons !== undefined && !Array.isArray(v.icons)) c.fail(where, "a header button isn't one the app has.");
  if (icons.length > MAX_HEADER_ICONS) c.fail(where, `keep at most ${MAX_HEADER_ICONS} buttons in the header.`);
  return { layout: v.layout, icons: icons.slice(0, MAX_HEADER_ICONS) };
}

/** 97.3 The look made from a Figma file. */
export const FIGMA_LIMITS = { pictures: 12, nameChars: 120 } as const;
const ASSET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFigmaLook(value: unknown, c: Checker = new Checker(), ownFonts: readonly string[] = [], where = "Figma look"): FigmaLook | null {
  const v = record(value);
  if (!v) {
    c.fail(where, "the look is missing.");
    return null;
  }
  if (!(typeof v.primary_color === "string" && HEX.test(v.primary_color))) c.fail(where, "the main color must look like #1F4E5F.");
  if (v.secondary_color != null && !(typeof v.secondary_color === "string" && HEX.test(v.secondary_color))) c.fail(where, "the second color must look like #E8B04B.");
  const font = v.font_family == null ? null : lookFont(typeof v.font_family === "string" ? v.font_family : null, ownFonts);
  if (v.font_family != null && !font) c.fail(where, "choose a free font or one of your own.");
  const arabic = lookArabicFont(typeof v.arabic_font === "string" ? v.arabic_font : null, ownFonts);
  if (!arabic) c.fail(where, "choose an Arabic font from the list.");
  if (!oneOf(CORNERS, v.corners)) c.fail(where, "choose the corners.");
  if (v.logo_asset_id != null && !(typeof v.logo_asset_id === "string" && ASSET_ID.test(v.logo_asset_id))) c.fail(where, "the logo isn't one of your files.");
  const pictures: FigmaPicture[] = [];
  for (const p of Array.isArray(v.pictures) ? v.pictures : []) {
    const pic = record(p);
    if (!pic || typeof pic.asset_id !== "string" || !ASSET_ID.test(pic.asset_id)) {
      c.fail(where, "a picture isn't one of your files.");
      continue;
    }
    pictures.push({ asset_id: pic.asset_id.toLowerCase(), name: typeof pic.name === "string" ? pic.name.trim().slice(0, FIGMA_LIMITS.nameChars) : "" });
  }
  if (pictures.length > FIGMA_LIMITS.pictures) c.fail(where, `keep at most ${FIGMA_LIMITS.pictures} pictures.`);
  const source = record(v.source);
  const kind = source?.kind === "link" ? "link" : "files";
  const imported = typeof source?.imported_at === "string" && !Number.isNaN(Date.parse(source.imported_at)) ? new Date(source.imported_at).toISOString() : new Date(0).toISOString();
  // The font as named in the catalog (a bundled one stays named, so this look shows it).
  const familyName = font ? (font.font_family ?? font.font) : null;
  return {
    primary_color: typeof v.primary_color === "string" ? v.primary_color.toUpperCase() : "#0E0D24",
    secondary_color: typeof v.secondary_color === "string" && HEX.test(v.secondary_color) ? v.secondary_color.toUpperCase() : null,
    font_family: familyName,
    ...(arabic ?? {}),
    corners: oneOf(CORNERS, v.corners) ? v.corners : "soft",
    logo_asset_id: typeof v.logo_asset_id === "string" && ASSET_ID.test(v.logo_asset_id) ? v.logo_asset_id.toLowerCase() : null,
    pictures: pictures.slice(0, FIGMA_LIMITS.pictures),
    source: { kind, name: typeof source?.name === "string" ? source.name.trim().slice(0, FIGMA_LIMITS.nameChars) : "", imported_at: imported },
  };
}

export function parseLanguages(value: unknown, c: Checker = new Checker(), where = "Languages"): Languages {
  const v = record(value) ?? {};
  // 43 Any language the app's system widgets come in (lib/i18n/locales.ts), not only the ones Yallapp translates.
  const def = isLanguageCode(v.default) ? v.default : null;
  if (!def) c.fail(where, "choose the default language.");
  const available: LanguageCode[] = [];
  if (!Array.isArray(v.available)) c.fail(where, "choose the languages.");
  for (const code of Array.isArray(v.available) ? v.available : []) {
    if (!isLanguageCode(code)) c.fail(where, `${String(code)} isn't a language apps support.`);
    else if (!available.includes(code)) available.push(code);
  }
  if (available.length > MAX_LANGUAGES) c.fail(where, `an app can have at most ${MAX_LANGUAGES} languages.`);
  const fallback = def ?? "en";
  if (!available.includes(fallback)) available.unshift(fallback);
  // 43 In the owner's order (the app's language picker shows them so).
  return { default: fallback, available: available.slice(0, MAX_LANGUAGES) };
}


/** Admin defaults for new apps (11.9). */
export function parseAppDefaults(value: unknown): ParseResult<AppDefaultsSetting> {
  const c = new Checker();
  const v = record(value) ?? {};
  const { secondary_color: _drop, ...appearance } = parseAppearance({ ...record(v.appearance), secondary_color: null }, c, "");
  void _drop;
  const languages = parseLanguages(v.languages, c, "");
  return c.errors.length ? { ok: false, errors: c.errors } : { ok: true, value: { appearance, languages } };
}

interface Context {
  c: Checker;
  /** 31 The app whose screens actions may open. */
  app: ParseOptions["app"];
  sources: ItemSource[];
  categorySources: ItemSource[];
  slugs: Set<string>;
  languages: Languages;
}

function parseAction(ctx: Context, where: string, value: unknown, required: boolean): Action | null {
  const { c } = ctx;
  if (value === undefined || value === null) {
    if (required) c.fail(where, "choose what happens on tap.");
    return null;
  }
  const v = record(value);
  if (!v || !oneOf(ACTION_TYPES, v.type)) {
    c.fail(where, "choose what happens on tap.");
    return null;
  }
  const openIn = v.open_in === "browser" ? "browser" : "in_app";
  switch (v.type) {
    case "page": {
      const slug = typeof v.page_slug === "string" ? v.page_slug : "";
      if (!ctx.slugs.has(slug)) c.fail(where, "choose a page that exists.");
      return { type: "page", page_slug: slug };
    }
    case "screen":
      if (!oneOf(SCREENS, v.screen)) c.fail(where, "choose a screen.");
      // 31 Only screens the app's module opens: anything else would do nothing when tapped.
      else if (!appOpensScreen(ctx.app, v.screen)) c.fail(where, `this app has no "${screenName(v.screen)}" screen. Choose another screen.`);
      return { type: "screen", screen: v.screen as Action["screen"] };
    case "course": {
      if (!ctx.sources.includes("courses")) c.fail(where, "this app has no courses. Choose what happens on tap.");
      const id = Number(v.course_id);
      if (!Number.isSafeInteger(id) || id < 1) c.fail(where, "enter the course ID.");
      return { type: "course", course_id: Number.isSafeInteger(id) ? id : null };
    }
    case "item": {
      const item = record(v.item);
      const source = item?.source;
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      if (!oneOf(ctx.sources, source)) c.fail(where, "this app can't show that kind of entry.");
      if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(id)) c.fail(where, "enter the entry's ID.");
      return { type: "item", item: { source: source as ItemSource, id } };
    }
    case "url": {
      const url = typeof v.url === "string" ? safeHref(v.url) : null;
      if (!url || !/^https?:/i.test(url)) c.fail(where, "enter a full web address starting with https://.");
      return { type: "url", url: url ?? "", open_in: openIn };
    }
  }
  return null;
}

function parseTranslations(ctx: Context, where: string, value: unknown, fields: readonly string[], limits: Record<string, number>): Translations | undefined {
  const v = record(value);
  if (!v) return undefined;
  const out: Translations = {};
  for (const [lang, texts] of Object.entries(v)) {
    if (!isLanguageCode(lang) || lang === ctx.languages.default) continue;
    // Translations of a language that's turned off are kept, so turning it back on brings them back.
    const t = record(texts);
    if (!t) continue;
    const kept: Record<string, string> = {};
    for (const [field, text] of Object.entries(t)) {
      if (!fields.includes(field) || typeof text !== "string") continue;
      const max = limits[field] ?? 200;
      let clean = field === "html" ? cleanBlockHtml(text) : text.trim();
      if (clean.length > max) {
        ctx.c.fail(where, `the ${lang} text of ${field} can have at most ${max} characters.`);
        clean = clean.slice(0, max);
      }
      if (clean) kept[field] = clean;
    }
    if (Object.keys(kept).length) out[lang] = kept;
  }
  return Object.keys(out).length ? out : undefined;
}

const PHONE = /^\+?[0-9][0-9 ()-]{5,22}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[A-Za-z]{2,}$/;
const CLOCK = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 33 A list of entries in a block: 1 to `max` objects (`min` at least), each parsed with `one`. */
function parseEntries<T>(ctx: Context, at: string, value: unknown, what: { one: string; many: string; min?: number; max: number }, one: (v: Record<string, unknown>, where: string) => T): T[] {
  const list = Array.isArray(value) ? value : [];
  const min = what.min ?? 1;
  if (list.length < min) ctx.c.fail(at, min === 1 ? `add a ${what.one}.` : `add at least ${min} ${what.many}.`);
  if (list.length > what.max) ctx.c.fail(at, `add at most ${what.max} ${what.many}.`);
  return list.slice(0, what.max).map((raw, i) => one(record(raw) ?? {}, `${at}, ${what.one} ${i + 1}`));
}

function entryTranslations<L extends EntryList>(ctx: Context, where: string, list: L, value: unknown): { translations?: Translations } {
  const translations = parseTranslations(ctx, where, value, TRANSLATABLE_ENTRIES[list], ENTRY_TEXT_LIMITS[list] as Record<string, number>);
  return translations ? { translations } : {};
}

/** 33 A rounded coordinate, or null; out of range fails. */
function coordinate(c: Checker, at: string, value: unknown, max: number, what: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > max) {
    c.fail(at, `the ${what} must be a number from -${max} to ${max}.`);
    return null;
  }
  return Math.round(n * 1e6) / 1e6;
}

/** 33 The fields of the new blocks; false when `type` isn't one of them. */
function parseMoreBlock(ctx: Context, at: string, type: string, v: Record<string, unknown>, block: LayoutBlock): boolean {
  const { c } = ctx;
  const L = ENTRY_TEXT_LIMITS;
  // 83.1 The limits from the block's definition.
  const T = (text: BlockText) => blockTextLimit(type as BlockType, text);
  const list = (name: BlockList) => blockListLimits(type as BlockType, name);
  switch (type) {
    case "slider":
      block.slides = parseEntries(ctx, at, v.slides, { one: "slide", many: "slides", max: list("slides").max }, (s, where) => {
        const slide: Slide = {
          image_url: c.mediaUrl(where, s.image_url, "The image address", false),
          heading: c.optionalText(where, s.heading, L.slides.heading, "The heading"),
          subheading: c.optionalText(where, s.subheading, L.slides.subheading, "The text under the heading"),
          action: parseAction(ctx, where, s.action, false),
        };
        if (!slide.image_url && !slide.heading) c.fail(where, "add an image or a heading.");
        return { ...slide, ...entryTranslations(ctx, where, "slides", s.translations) };
      });
      block.auto_advance = v.auto_advance !== false;
      return true;
    case "quick_links":
      block.style = oneOf(QUICK_LINK_STYLES, v.style) ? v.style : "grid";
      block.links = parseEntries(ctx, at, v.links, { one: "link", many: "links", max: list("links").max }, (l, where) => {
        if (!(typeof l.icon === "string" && ICON_NAME.test(l.icon))) c.fail(where, "choose an icon.");
        const link: QuickLink = {
          icon: typeof l.icon === "string" && ICON_NAME.test(l.icon) ? l.icon : "apps",
          label: c.text(where, l.label, L.links.label, "a label"),
          action: parseAction(ctx, where, l.action, true) ?? { type: "screen", screen: "account" },
        };
        // 82.5 The owner's own icon.
        const iconUrl = c.mediaUrl(where, l.icon_url, "The icon's picture address", false);
        if (iconUrl) link.icon_url = iconUrl;
        return { ...link, ...entryTranslations(ctx, where, "links", l.translations) };
      });
      return true;
    case "testimonials":
      block.quotes = parseEntries(ctx, at, v.quotes, { one: "quote", many: "quotes", max: list("quotes").max }, (q, where) => {
        const rating = q.rating === null || q.rating === undefined || q.rating === "" ? null : Number(q.rating);
        if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) c.fail(where, "the rating must be 1 to 5 stars.");
        const quote: Quote = {
          text: c.text(where, q.text, L.quotes.text, "what they said"),
          name: c.text(where, q.name, L.quotes.name, "their name"),
          role: c.optionalText(where, q.role, L.quotes.role, "The role"),
          photo_url: c.mediaUrl(where, q.photo_url, "The photo address", false),
          rating: rating !== null && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
        };
        return { ...quote, ...entryTranslations(ctx, where, "quotes", q.translations) };
      });
      return true;
    case "faq":
      block.questions = parseEntries(ctx, at, v.questions, { one: "question", many: "questions", max: list("questions").max }, (q, where) => {
        const entry: FaqEntry = {
          question: c.text(where, q.question, L.questions.question, "the question"),
          answer: c.text(where, q.answer, L.questions.answer, "the answer"),
        };
        return { ...entry, ...entryTranslations(ctx, where, "questions", q.translations) };
      });
      return true;
    case "countdown": {
      block.heading = c.text(at, v.heading, T("heading"), "a heading");
      block.subheading = c.optionalText(at, v.subheading, T("subheading"), "The text under the heading");
      const ends = typeof v.ends_at === "string" ? new Date(v.ends_at) : null;
      if (!ends || Number.isNaN(ends.getTime())) c.fail(at, "choose when the countdown ends.");
      block.ends_at = ends && !Number.isNaN(ends.getTime()) ? ends.toISOString().replace(/\.000Z$/, "Z") : "";
      block.ended_text = c.optionalText(at, v.ended_text, T("ended_text"), "The text after the end");
      block.label = c.optionalText(at, v.label, T("label"), "The button text") ?? undefined;
      block.action = parseAction(ctx, at, v.action, false);
      if (block.label && !block.action) c.fail(at, "choose what the button opens, or remove its text.");
      return true;
    }
    case "contact": {
      const phone = c.optionalText(at, v.phone, 30, "The phone number");
      if (phone && !PHONE.test(phone)) c.fail(at, "the phone number must look like +20 100 123 4567.");
      const whatsapp = c.optionalText(at, v.whatsapp, 30, "The WhatsApp number");
      if (whatsapp && !PHONE.test(whatsapp)) c.fail(at, "the WhatsApp number must look like +20 100 123 4567.");
      const email = c.optionalText(at, v.email, 254, "The email address");
      if (email && !EMAIL.test(email)) c.fail(at, "the email address isn't valid.");
      const website = typeof v.website === "string" && v.website.trim() ? safeHref(v.website.trim()) : null;
      if (typeof v.website === "string" && v.website.trim() && !(website && /^https?:\/\//i.test(website))) c.fail(at, "enter the website's full address starting with https://.");
      block.phone = phone;
      block.whatsapp = whatsapp;
      block.email = email;
      block.website = website && /^https?:\/\//i.test(website) ? website : null;
      block.address = c.optionalText(at, v.address, T("address"), "The address");
      block.latitude = coordinate(c, at, v.latitude, 90, "latitude");
      block.longitude = coordinate(c, at, v.longitude, 180, "longitude");
      if ((block.latitude === null) !== (block.longitude === null)) c.fail(at, "enter both the latitude and the longitude, or neither.");
      if (!block.phone && !block.whatsapp && !block.email && !block.website && !block.address && block.latitude === null) c.fail(at, "add at least one way to reach you.");
      return true;
    }
    case "hours": {
      const periods = Array.isArray(v.hours) ? v.hours : [];
      if (!Array.isArray(v.hours)) c.fail(at, "the opening hours are missing.");
      if (periods.length > list("hours").max) c.fail(at, `add at most ${list("hours").max} opening times.`);
      block.hours = periods.slice(0, list("hours").max).map((raw, i) => {
        const p = record(raw) ?? {};
        const where = `${at}, time ${i + 1}`;
        if (!oneOf(WEEKDAYS, p.day)) c.fail(where, "choose the day.");
        if (!(typeof p.opens === "string" && CLOCK.test(p.opens)) || !(typeof p.closes === "string" && CLOCK.test(p.closes))) c.fail(where, "times must look like 09:00 or 18:30.");
        else if (p.opens === p.closes) c.fail(where, "the closing time must differ from the opening time.");
        return { day: oneOf(WEEKDAYS, p.day) ? p.day : "mon", opens: String(p.opens ?? ""), closes: String(p.closes ?? "") } satisfies HoursPeriod;
      });
      // Monday first, then by opening time.
      block.hours.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.opens.localeCompare(b.opens));
      const dates = Array.isArray(v.closed_dates) ? v.closed_dates : [];
      if (dates.length > list("closed_dates").max) c.fail(at, `add at most ${list("closed_dates").max} closed days.`);
      const closed: string[] = [];
      for (const raw of dates.slice(0, list("closed_dates").max)) {
        const date = String(raw).trim();
        const parsed = DATE.test(date) ? new Date(`${date}T00:00:00Z`) : null;
        if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) c.fail(at, `${date || "An empty date"} isn't a date like 2026-12-31.`);
        else if (!closed.includes(date)) closed.push(date);
      }
      block.closed_dates = closed.sort();
      block.note = c.optionalText(at, v.note, T("note"), "The note");
      if (!block.hours.length && !block.note) c.fail(at, "add your opening times.");
      return true;
    }
    case "social": {
      const seen = new Set<string>();
      block.profiles = parseEntries(ctx, at, v.profiles, { one: "profile", many: "profiles", max: list("profiles").max }, (p, where) => {
        if (!oneOf(SOCIAL_NETWORKS, p.network)) c.fail(where, "choose the network.");
        else if (seen.has(p.network)) c.fail(where, "each network can be added once.");
        if (typeof p.network === "string") seen.add(p.network);
        const url = typeof p.url === "string" ? safeHref(p.url.trim()) : null;
        if (!url || !/^https:\/\//i.test(url)) c.fail(where, "enter the profile's full address starting with https://.");
        return { network: oneOf(SOCIAL_NETWORKS, p.network) ? p.network : "instagram", url: url ?? "" } satisfies SocialProfile;
      });
      return true;
    }
    case "team":
      block.layout = oneOf(ITEMS_LAYOUTS, v.layout) ? v.layout : "carousel";
      block.people = parseEntries(ctx, at, v.people, { one: "person", many: "people", max: list("people").max }, (p, where) => {
        const person: Person = {
          name: c.text(where, p.name, L.people.name, "a name"),
          role: c.optionalText(where, p.role, L.people.role, "The role"),
          bio: c.optionalText(where, p.bio, L.people.bio, "The bio"),
          photo_url: c.mediaUrl(where, p.photo_url, "The photo address", false),
          action: parseAction(ctx, where, p.action, false),
        };
        return { ...person, ...entryTranslations(ctx, where, "people", p.translations) };
      });
      return true;
    case "stats":
      block.stats = parseEntries(ctx, at, v.stats, { one: "number", many: "numbers", min: list("stats").min, max: list("stats").max }, (s, where) => {
        const stat: Stat = { value: c.text(where, s.value, L.stats.value, "the number"), label: c.text(where, s.label, L.stats.label, "a label") };
        return { ...stat, ...entryTranslations(ctx, where, "stats", s.translations) };
      });
      return true;
    case "notice":
      block.tone = oneOf(NOTICE_TONES, v.tone) ? v.tone : "info";
      block.text = c.text(at, v.text, T("text"), "the notice's text");
      block.label = c.optionalText(at, v.label, T("label"), "The link text") ?? undefined;
      block.action = parseAction(ctx, at, v.action, false);
      return true;
    // 99.4
    case "cards":
      block.columns = v.columns === 3 ? 3 : 2;
      block.cards = parseEntries(ctx, at, v.cards, { one: "card", many: "cards", max: list("cards").max }, (card, where) => {
        const out: Card = {
          title: c.text(where, card.title, L.cards.title, "a title"),
          text: c.optionalText(where, card.text, L.cards.text, "The text"),
          image_url: c.mediaUrl(where, card.image_url, "The picture's address", false),
          action: parseAction(ctx, where, card.action, false),
        };
        return { ...out, ...entryTranslations(ctx, where, "cards", card.translations) };
      });
      return true;
    case "gallery":
      block.columns = v.columns === 2 ? 2 : 3;
      block.images = parseEntries(ctx, at, v.images, { one: "photo", many: "photos", max: list("images").max }, (image, where) => {
        const out: GalleryImage = {
          image_url: c.mediaUrl(where, image.image_url, "a picture's address", true),
          caption: c.optionalText(where, image.caption, L.images.caption, "The caption"),
        };
        return { ...out, ...entryTranslations(ctx, where, "images", image.translations) };
      });
      return true;
    case "map": {
      const latitude = coordinate(c, at, v.latitude, 90, "latitude");
      const longitude = coordinate(c, at, v.longitude, 180, "longitude");
      if (latitude === null || longitude === null || (latitude === 0 && longitude === 0)) c.fail(at, "enter the place's latitude and longitude.");
      block.latitude = latitude ?? 0;
      block.longitude = longitude ?? 0;
      block.name = c.optionalText(at, v.name, T("name"), "The place's name");
      block.address = c.optionalText(at, v.address, T("address"), "The address");
      const label = c.optionalText(at, v.label, T("label"), "The button text");
      if (label) block.label = label;
      return true;
    }
    case "divider":
      block.style = oneOf(DIVIDER_STYLES, v.style) ? v.style : "line";
      return true;
    case "form": {
      if (!oneOf(FORM_SEND_TO, v.send_to)) c.fail(at, "choose where the answers go.");
      block.send_to = oneOf(FORM_SEND_TO, v.send_to) ? v.send_to : "email";
      const ids = new Set<string>();
      block.fields = parseEntries(ctx, at, v.fields, { one: "field", many: "fields", max: list("fields").max }, (field, where) => {
        const id = typeof field.id === "string" ? field.id : "";
        if (!ID.test(id)) c.fail(where, "the field has no valid ID.");
        else if (ids.has(id)) c.fail(where, "two fields have the same ID.");
        ids.add(id);
        if (!oneOf(FORM_FIELD_KINDS, field.kind)) c.fail(where, "choose the kind of answer.");
        const kind = oneOf(FORM_FIELD_KINDS, field.kind) ? field.kind : "text";
        let options: string[] | null = null;
        if (kind === "choice") {
          const raw = Array.isArray(field.options) ? field.options : [];
          options = raw.map((o) => (typeof o === "string" ? o.trim() : "")).filter(Boolean).slice(0, 10);
          if (options.length < 2 || raw.length > 10) c.fail(where, "give 2 to 10 choices.");
          if (options.some((o) => o.length > 80)) c.fail(where, "a choice can have at most 80 characters.");
          if (new Set(options).size !== options.length) c.fail(where, "each choice can be given once.");
        }
        const out: FormField = { id, kind, label: c.text(where, field.label, L.fields.label, "a question"), required: field.required === true, options };
        return { ...out, ...entryTranslations(ctx, where, "fields", field.translations) };
      });
      block.submit_label = c.optionalText(at, v.submit_label, T("submit_label"), "The button text");
      block.success_text = c.optionalText(at, v.success_text, T("success_text"), "The text after sending");
      return true;
    }
  }
  return false;
}

function parseQuery(ctx: Context, where: string, value: unknown, source: unknown): ItemsQuery {
  const { c } = ctx;
  const v = record(value) ?? {};
  const limit = Number(v.limit ?? 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > LAYOUT_LIMITS.maxItems) c.fail(where, `show 1 to ${LAYOUT_LIMITS.maxItems} entries.`);
  const category = v.category_id === null || v.category_id === undefined || v.category_id === "" ? null : String(v.category_id).trim();
  if (category !== null && !/^[A-Za-z0-9_.:-]{1,64}$/.test(category)) c.fail(where, "the category ID isn't valid.");
  const ids: string[] = [];
  if (v.ids !== undefined && !Array.isArray(v.ids)) c.fail(where, "the chosen entries must be a list.");
  for (const raw of Array.isArray(v.ids) ? v.ids : []) {
    const id = String(raw).trim();
    if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(id)) c.fail(where, `${id || "An empty ID"} isn't a valid ID.`);
    else if (!ids.includes(id)) ids.push(id);
  }
  if (ids.length > LAYOUT_LIMITS.maxHandPicked) c.fail(where, `choose at most ${LAYOUT_LIMITS.maxHandPicked} entries.`);
  const sort = v.sort ?? "newest";
  if (!oneOf(ITEMS_SORTS, sort)) c.fail(where, "choose the order.");
  const known = oneOf(ITEMS_SORTS, sort) ? sort : "newest";
  return {
    category_id: category,
    featured: v.featured === true,
    // 31 An order the source has no data for (prices of articles) is the first one, as the app gets it.
    sort: oneOf(ctx.sources, source) ? sortFor(source, known) : known,
    limit: Number.isInteger(limit) ? Math.min(Math.max(limit, 1), LAYOUT_LIMITS.maxItems) : 10,
    ids: ids.slice(0, LAYOUT_LIMITS.maxHandPicked),
  };
}

/** 99.3 Between two dates, on one platform, in some languages; null when always. */
function parseShow(ctx: Context, at: string, value: unknown): BlockShow | null {
  const { c } = ctx;
  if (value === undefined || value === null) return null;
  const v = record(value);
  if (!v) {
    c.fail(at, "choose when the block shows.");
    return null;
  }
  const date = (raw: unknown, what: string): string | null => {
    if (raw === undefined || raw === null || raw === "") return null;
    const time = typeof raw === "string" && ISO_TIME.test(raw) ? new Date(raw) : null;
    if (!time || Number.isNaN(time.getTime())) {
      c.fail(at, `${what} must be a date and time.`);
      return null;
    }
    return time.toISOString().replace(/\.000Z$/, "Z");
  };
  const show: BlockShow = {};
  const from = date(v.from, "The start");
  const until = date(v.until, "The end");
  if (from && until && from >= until) c.fail(at, "the end must come after the start.");
  if (from) show.from = from;
  if (until) show.until = until;
  if (v.platforms !== undefined && v.platforms !== null) {
    const platforms = Array.isArray(v.platforms) ? v.platforms : [];
    if (!platforms.length || !platforms.every((p) => oneOf(SHOW_PLATFORMS, p))) c.fail(at, "choose Android, iPhone or both.");
    const chosen = SHOW_PLATFORMS.filter((p) => platforms.includes(p));
    if (chosen.length && chosen.length < SHOW_PLATFORMS.length) show.platforms = chosen;
  }
  if (v.languages !== undefined && v.languages !== null) {
    const languages = Array.isArray(v.languages) ? v.languages : [];
    if (!languages.length || !languages.every((l) => typeof l === "string" && ctx.languages.available.includes(l as LanguageCode))) c.fail(at, "choose languages the app has.");
    const chosen = ctx.languages.available.filter((l) => languages.includes(l));
    if (chosen.length && chosen.length < ctx.languages.available.length) show.languages = chosen;
  }
  return Object.keys(show).length ? show : null;
}

function parseBlock(ctx: Context, where: string, value: unknown, allowed: string[]): LayoutBlock | null {
  const { c } = ctx;
  const v = record(value);
  if (!v) {
    c.fail(where, "this block is empty.");
    return null;
  }
  const type = v.type;
  if (typeof type !== "string" || !allowed.includes(type)) {
    c.fail(where, `${typeof type === "string" && BLOCK_NAMES[type] ? `${BLOCK_NAMES[type]} blocks aren't` : "this kind of block isn't"} available in this app.`);
    return null;
  }
  const at = `${where} (${BLOCK_NAMES[type]})`;
  // 83.1 The longest each of its texts can be, from the block's definition.
  const T = (text: BlockText) => blockTextLimit(type as BlockType, text);
  const id = typeof v.id === "string" ? v.id : "";
  if (!ID.test(id)) c.fail(at, "the block has no valid ID.");
  if (!oneOf(VISIBILITIES, v.visibility ?? "everyone")) c.fail(at, "choose who sees this block.");
  const block: LayoutBlock = {
    id,
    type: type as LayoutBlock["type"],
    visibility: oneOf(VISIBILITIES, v.visibility) ? v.visibility : "everyone",
    title: c.optionalText(at, v.title, T("title"), "The title"),
  };
  // 82.5 Its look within the brand: kept only when it isn't the usual.
  const look = record(v.look);
  if (look) {
    if (look.background !== undefined && !oneOf(BLOCK_BACKGROUNDS, look.background)) c.fail(at, "choose the background from the list.");
    if (look.spacing !== undefined && !oneOf(BLOCK_SPACINGS, look.spacing)) c.fail(at, "choose the spacing from the list.");
    const background = oneOf(BLOCK_BACKGROUNDS, look.background) ? look.background : "none";
    const spacing = oneOf(BLOCK_SPACINGS, look.spacing) ? look.spacing : "medium";
    // 99.3 Where its texts sit, their size, its corners and how its pictures fit.
    const more: Omit<BlockLook, "background" | "spacing"> = {};
    for (const [field, list, usual, what] of [
      ["align", BLOCK_ALIGNS, "start", "where the texts sit"],
      ["text_size", BLOCK_TEXT_SIZES, "medium", "the text size"],
      ["corners", BLOCK_CORNERS, "app", "the corners"],
      ["image_fit", IMAGE_FITS, "cover", "how the picture fits"],
    ] as const) {
      const value = look[field];
      if (value !== undefined && !oneOf(list as readonly string[], value)) c.fail(at, `choose ${what} from the list.`);
      if (oneOf(list as readonly string[], value) && value !== usual) (more as Record<string, string>)[field] = value;
    }
    if (background !== "none" || spacing !== "medium" || Object.keys(more).length) block.look = { background, spacing, ...more };
  }
  // 99.3 When it shows.
  const show = parseShow(ctx, at, v.show);
  if (show) block.show = show;
  switch (type) {
    case "banner":
      block.image_url = c.mediaUrl(at, v.image_url, "an image address", true);
      block.heading = c.optionalText(at, v.heading, T("heading"), "The heading");
      block.subheading = c.optionalText(at, v.subheading, T("subheading"), "The text under the heading");
      block.action = parseAction(ctx, at, v.action, false);
      break;
    case "text": {
      const html = typeof v.html === "string" ? cleanBlockHtml(v.html) : "";
      if (!html.replace(/<[^>]*>/g, "").trim()) c.fail(at, "add some text.");
      if (html.length > LAYOUT_LIMITS.htmlChars) c.fail(at, `the text can have at most ${LAYOUT_LIMITS.htmlChars} characters.`);
      block.html = html;
      break;
    }
    case "image": {
      block.image_url = c.mediaUrl(at, v.image_url, "an image address", true);
      const ratio = v.aspect_ratio === null || v.aspect_ratio === undefined || v.aspect_ratio === "" ? null : Number(v.aspect_ratio);
      if (ratio !== null && (!Number.isFinite(ratio) || ratio < 0.2 || ratio > 5)) c.fail(at, "the shape must be between 0.2 and 5 (width divided by height).");
      block.aspect_ratio = ratio !== null && Number.isFinite(ratio) ? Math.round(ratio * 100) / 100 : null;
      block.action = parseAction(ctx, at, v.action, false);
      break;
    }
    case "video":
      block.url = c.mediaUrl(at, v.url, "the video address", true);
      block.poster_url = c.mediaUrl(at, v.poster_url, "The cover image address", false);
      break;
    case "button":
      block.label = c.text(at, v.label, T("label"), "the button text");
      if (v.icon !== null && v.icon !== undefined && v.icon !== "" && !(typeof v.icon === "string" && ICON_NAME.test(v.icon))) c.fail(at, "choose an icon from the list.");
      block.icon = typeof v.icon === "string" && ICON_NAME.test(v.icon) ? v.icon : null;
      if (!oneOf(BUTTON_STYLES, v.style)) c.fail(at, "choose the button style.");
      block.style = oneOf(BUTTON_STYLES, v.style) ? v.style : "filled";
      block.action = parseAction(ctx, at, v.action, true);
      break;
    case "items":
      if (!oneOf(ctx.sources, v.source)) c.fail(at, "choose what the list shows.");
      block.source = v.source as ItemSource;
      if (!oneOf(ITEMS_LAYOUTS, v.layout)) c.fail(at, "choose how the list looks.");
      block.layout = oneOf(ITEMS_LAYOUTS, v.layout) ? v.layout : "carousel";
      block.see_all = parseAction(ctx, `${at} "See all"`, v.see_all, false);
      block.query = parseQuery(ctx, at, v.query, v.source);
      break;
    case "categories":
      if (!oneOf(ctx.categorySources, v.source)) c.fail(at, "choose whose categories to show.");
      block.source = v.source as ItemSource;
      block.style = oneOf(CATEGORY_STYLES, v.style) ? v.style : "chips";
      break;
    case "search":
      if (!oneOf(ctx.sources, v.source)) c.fail(at, "choose what people search.");
      block.source = v.source as ItemSource;
      block.placeholder = c.text(at, v.placeholder, T("placeholder"), "the text in the search box");
      break;
    case "continue_learning":
      break;
    case "embed": {
      block.url = c.mediaUrl(at, v.url, "the web page address", true);
      const height = v.height === null || v.height === undefined || v.height === "" ? null : Number(v.height);
      if (height !== null && (!Number.isInteger(height) || height < 50 || height > 2000)) c.fail(at, "the height must be 50 to 2000.");
      block.height = height !== null && Number.isInteger(height) ? height : null;
      break;
    }
    case "spacer":
      if (!oneOf(SPACER_SIZES, v.size)) c.fail(at, "choose the size.");
      block.size = oneOf(SPACER_SIZES, v.size) ? v.size : "medium";
      break;
    default:
      parseMoreBlock(ctx, at, type, v, block);
  }
  const texts = BLOCK_DEFINITIONS[type as BlockType].texts;
  const translations = parseTranslations(ctx, at, v.translations, Object.keys(texts), texts as Record<string, number>);
  if (translations) block.translations = translations;
  return block;
}

function parsePage(ctx: Context, index: number, value: unknown, allowedBlocks: string[], now: Date): LayoutPage | null {
  const { c } = ctx;
  const v = record(value);
  if (!v) {
    c.fail(`Page ${index + 1}`, "the page is empty.");
    return null;
  }
  const title = c.text(`Page ${index + 1}`, v.title, 60, "a title");
  const where = `Page "${title || index + 1}"`;
  const slug = typeof v.slug === "string" ? v.slug : "";
  if (!SLUG.test(slug) || slug.length > 40) c.fail(where, "the address must be 1 to 40 lowercase letters, digits and dashes.");
  const updated = typeof v.updated_at === "string" ? new Date(v.updated_at) : null;
  const blocksIn = Array.isArray(v.blocks) ? v.blocks : [];
  if (!Array.isArray(v.blocks)) c.fail(where, "the blocks are missing.");
  if (blocksIn.length > LAYOUT_LIMITS.maxBlocks) c.fail(where, `a page can have at most ${LAYOUT_LIMITS.maxBlocks} blocks.`);
  const blocks: LayoutBlock[] = [];
  const ids = new Set<string>();
  blocksIn.slice(0, LAYOUT_LIMITS.maxBlocks).forEach((raw, i) => {
    const block = parseBlock(ctx, `${where}, block ${i + 1}`, raw, allowedBlocks);
    if (!block) return;
    if (ids.has(block.id)) c.fail(`${where}, block ${i + 1}`, "two blocks have the same ID.");
    ids.add(block.id);
    blocks.push(block);
  });
  const page: LayoutPage = {
    slug,
    title,
    show_title: v.show_title !== false,
    updated_at: updated && !Number.isNaN(updated.getTime()) ? updated.toISOString() : now.toISOString(),
    blocks,
  };
  const translations = parseTranslations(ctx, where, v.translations, TRANSLATABLE.page, { title: 60 });
  if (translations) page.translations = translations;
  // 99.3 Its background and a picture across its top.
  if (v.background !== undefined && !oneOf(PAGE_BACKGROUNDS, v.background)) c.fail(where, "choose the background from the list.");
  if (oneOf(PAGE_BACKGROUNDS, v.background) && v.background !== "none") page.background = v.background;
  const header = v.header_image_url === undefined || v.header_image_url === null || v.header_image_url === "" ? null : c.mediaUrl(where, v.header_image_url, "the header picture's address", true);
  if (header) page.header_image_url = header;
  // 103R A Studio page: its elements, and no blocks.
  if (v.studio !== undefined && v.studio !== null) {
    const studio = parseStudio(ctx, where, v.studio);
    if (studio) {
      if (blocks.length) c.fail(where, "a Studio page has its elements instead of blocks.");
      page.studio = studio;
    }
  }
  return page;
}

function optionalColor(c: Checker, where: string, value: unknown, what: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && HEX.test(value)) return value.toUpperCase();
  c.fail(where, `${what} must look like #1F4E5F.`);
  return null;
}

/** 103R A Studio page on its own (an owner's own template): checked as in a layout of the app's. */
export function parseStudioPage(value: unknown, app: Pick<App, "appType" | "backend" | "vertical">, languages: Languages): ParseResult<StudioPage> {
  const c = new Checker();
  const ctx: Context = {
    c,
    app,
    sources: itemSourcesFor(app),
    categorySources: categorySourcesFor(app),
    slugs: new Set(),
    languages,
  };
  const page = parseStudio(ctx, "The page", value);
  const errors = c.errors;
  return page && errors.length === 0 ? { ok: true, value: page } : { ok: false, errors: errors.length ? errors : ["The page isn't valid."] };
}

/** 103R A Studio page (`StudioPage`): its header, its elements and its colours. */
function parseStudio(ctx: Context, where: string, value: unknown): StudioPage | null {
  const { c } = ctx;
  const v = record(value);
  if (!v) {
    c.fail(where, "the Studio page is missing.");
    return null;
  }
  if (JSON.stringify(v).length > STUDIO_LIMITS.maxBytes) {
    c.fail(where, "the Studio page is too large. Remove some elements.");
    return null;
  }
  const state = { count: 0, ids: new Set<string>() };
  const body = parseNode(ctx, `${where}, page`, v.body, state, 0, false);
  if (!body) return null;
  if (!(STUDIO_LAYOUT_TYPES as readonly string[]).includes(body.type)) c.fail(where, "the page must start with a row, a column or another layout.");
  const page: StudioPage = { body };
  if (v.header !== undefined && v.header !== null) {
    const header = parseStudioHeader(ctx, `${where}, header`, v.header);
    if (header) page.header = header;
  }
  const background = optionalColor(c, where, v.background, "the page's colour");
  if (background) page.background = background;
  const dark = optionalColor(c, where, v.dark_background, "the page's dark colour");
  if (dark) page.dark_background = dark;
  if (v.show_tabs === false) page.show_tabs = false;
  return page;
}

function parseStudioHeader(ctx: Context, where: string, value: unknown): StudioHeader | null {
  const { c } = ctx;
  const v = record(value);
  if (!v || !oneOf(STUDIO_HEADER_TYPES, v.type)) {
    c.fail(where, "choose the header's type.");
    return null;
  }
  const header: StudioHeader = { type: v.type };
  const title = c.optionalText(where, v.title, 80, "The header's title");
  if (title) header.title = title;
  const logo = c.mediaUrl(where, v.logo_url, "the logo's address", false);
  if (logo) header.logo_url = logo;
  if (v.buttons !== undefined) {
    const raw = Array.isArray(v.buttons) ? v.buttons : [];
    const buttons = raw.filter((b): b is (typeof STUDIO_HEADER_BUTTONS)[number] => oneOf(STUDIO_HEADER_BUTTONS, b));
    // Each button once, as in the regular header (101).
    if (buttons.length !== raw.length) c.fail(where, "a header button isn't one the app has.");
    else if (new Set(buttons).size > 4) c.fail(where, "keep at most 4 buttons in the header.");
    if (buttons.length) header.buttons = [...new Set(buttons)].slice(0, 4);
  }
  for (const [key, what] of [
    ["background", "the header's colour"],
    ["color", "the header's text colour"],
    ["dark_background", "the header's dark colour"],
    ["dark_color", "the header's dark text colour"],
  ] as const) {
    const color = optionalColor(c, where, v[key], what);
    if (color) header[key] = color;
  }
  const translations = parseTranslations(ctx, where, v.translations, TRANSLATABLE.studioHeader, { title: 80 });
  if (translations) header.translations = translations;
  return header;
}

const NODE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** A number in [min, max], rounded to tenths; `undefined` when left out; NaN when wrong. */
function studioNumber(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return NaN;
  return Math.round(value * 10) / 10;
}

function parseSize(c: Checker, where: string, value: unknown, what: string): StudioSize | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === "fill" || value === "hug") return value;
  const n = studioNumber(value, 0, STUDIO_LIMITS.maxSize);
  if (n === undefined || Number.isNaN(n)) {
    c.fail(where, `${what} must be fill, hug or 0 to ${STUDIO_LIMITS.maxSize}.`);
    return undefined;
  }
  return n;
}

function parseSides(c: Checker, where: string, value: unknown, what: string): StudioSides | undefined {
  if (value === undefined || value === null) return undefined;
  const v = record(value);
  if (!v) {
    c.fail(where, `${what} isn't valid.`);
    return undefined;
  }
  const out: StudioSides = {};
  for (const side of ["top", "end", "bottom", "start"] as const) {
    const n = studioNumber(v[side], 0, STUDIO_LIMITS.maxSide);
    if (n === undefined) continue;
    if (Number.isNaN(n)) c.fail(where, `${what} must be 0 to ${STUDIO_LIMITS.maxSide} on each side.`);
    else if (n) out[side] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

/** 103R One element and what it holds (`StudioNode`). `card`: inside an items element's card, where elements take `bind`. */
function parseNode(ctx: Context, where: string, value: unknown, state: { count: number; ids: Set<string> }, depth: number, card: boolean): StudioNode | null {
  const { c } = ctx;
  const L = STUDIO_LIMITS;
  const v = record(value);
  if (!v || !oneOf(STUDIO_NODE_TYPES, v.type)) {
    c.fail(where, "this kind of element isn't available.");
    return null;
  }
  if (depth > L.maxDepth) {
    c.fail(where, `elements can be nested at most ${L.maxDepth} deep.`);
    return null;
  }
  state.count += 1;
  if (state.count === L.maxNodes + 1) c.fail(where, `a page can have at most ${L.maxNodes} elements.`);
  if (state.count > L.maxNodes) return null;
  const id = typeof v.id === "string" && NODE_ID.test(v.id) ? v.id : null;
  if (!id) c.fail(where, "the element's ID isn't valid.");
  else if (state.ids.has(id)) c.fail(where, "two elements have the same ID.");
  if (id) state.ids.add(id);
  const node: StudioNode = { id: id ?? "", type: v.type };
  const bad = (what: string) => c.fail(where, what);
  const num = (key: string, min: number, max: number, what: string) => {
    const n = studioNumber(v[key], min, max);
    if (n !== undefined && Number.isNaN(n)) bad(`${what} must be ${min} to ${max}.`);
    return n === undefined || Number.isNaN(n) ? undefined : n;
  };
  const pick = <T extends string>(key: string, list: readonly T[], what: string): T | undefined => {
    if (v[key] === undefined || v[key] === null) return undefined;
    if (!oneOf(list, v[key])) {
      bad(what);
      return undefined;
    }
    return v[key] as T;
  };

  const name = c.optionalText(where, v.name, L.nameChars, "The element's name");
  if (name) node.name = name;
  // 107.2 Hidden in the app; the page's own element always shows.
  if (v.hidden === true && depth > 0) node.hidden = true;

  // Size and place.
  const width = parseSize(c, where, v.width, "the width");
  if (width !== undefined) node.width = width;
  const height = parseSize(c, where, v.height, "the height");
  if (height !== undefined) node.height = height;
  const minHeight = num("min_height", 0, L.maxSize, "the lowest height");
  if (minHeight) node.min_height = minHeight;
  const ratio = num("aspect_ratio", 0.1, 10, "the width over the height");
  if (ratio) node.aspect_ratio = ratio;
  const padding = parseSides(c, where, v.padding, "the space inside");
  if (padding) node.padding = padding;
  const margin = parseSides(c, where, v.margin, "the space outside");
  if (margin) node.margin = margin;
  const gap = num("gap", 0, L.maxGap, "the space between");
  if (gap) node.gap = gap;
  const align = pick("align", STUDIO_ALIGNS, "choose how the elements are spread.");
  if (align && align !== "start") node.align = align;
  const cross = pick("cross", STUDIO_CROSS, "choose how the elements line up.");
  if (cross && cross !== "stretch") node.cross = cross;
  const self = pick("self_align", STUDIO_CROSS, "choose where the element sits.");
  if (self) node.self_align = self;
  const pin = pick("pin", STUDIO_PINS, "choose whether it stays on the screen.");
  if (pin && pin !== "none") node.pin = pin;

  // Colours and shape.
  for (const [key, what] of [
    ["background", "the background"],
    ["color", "the text colour"],
    ["dark_background", "the dark background"],
    ["dark_color", "the dark text colour"],
    ["border_color", "the border colour"],
  ] as const) {
    const color = optionalColor(c, where, v[key], what);
    if (color) node[key] = color;
  }
  if (v.gradient !== undefined && v.gradient !== null) {
    const g = record(v.gradient);
    const from = optionalColor(c, where, g?.from, "the gradient's first colour");
    const to = optionalColor(c, where, g?.to, "the gradient's second colour");
    const angle = studioNumber(g?.angle, 0, 360);
    if (!from || !to || (angle !== undefined && Number.isNaN(angle))) bad("the gradient needs two colours and an angle of 0 to 360.");
    else node.gradient = { from, to, ...(angle !== undefined && angle !== 180 ? { angle } : {}) };
  }
  const picture = c.mediaUrl(where, v.image_background_url, "the background picture's address", false);
  if (picture) node.image_background_url = picture;
  const radius = num("radius", 0, L.maxRadius, "the corners");
  if (radius) node.radius = radius;
  // 107.2 Each corner on its own, turning, and a colour over the picture.
  if (v.corners !== undefined && v.corners !== null) {
    const k = record(v.corners);
    if (!k) bad("the corners aren't valid.");
    else {
      const corners: NonNullable<StudioNode["corners"]> = {};
      for (const corner of ["top_start", "top_end", "bottom_end", "bottom_start"] as const) {
        const n = studioNumber(k[corner], 0, L.maxRadius);
        if (n !== undefined && Number.isNaN(n)) bad(`each corner must be 0 to ${L.maxRadius}.`);
        else if (n) corners[corner] = n;
      }
      if (Object.keys(corners).length) node.corners = corners;
    }
  }
  const rotation = num("rotation", -180, 180, "the turn");
  if (rotation) node.rotation = rotation;
  if (v.overlay !== undefined && v.overlay !== null) {
    const o = record(v.overlay);
    const color = optionalColor(c, where, o?.color, "the colour over the picture");
    // Its strength in hundredths, as the editor's slider sets it.
    const strength = typeof o?.opacity === "number" && Number.isFinite(o.opacity) && o.opacity >= 0 && o.opacity <= 1 ? Math.round(o.opacity * 100) / 100 : NaN;
    if (!color || Number.isNaN(strength)) bad("the colour over the picture needs a colour and how strong it is, 0 to 1.");
    else if (strength > 0) node.overlay = { color, opacity: strength };
  }
  const border = num("border_width", 0, L.maxBorder, "the border");
  if (border && node.border_color) node.border_width = border;
  else delete node.border_color;
  const shadow = pick("shadow", STUDIO_SHADOWS, "choose the shadow.");
  if (shadow && shadow !== "none") node.shadow = shadow;
  const opacity = num("opacity", 0, 1, "the opacity");
  if (opacity !== undefined && opacity !== 1) node.opacity = opacity;

  // Text.
  if (v.font !== undefined && v.font !== null) {
    const f = record(v.font);
    if (!f) bad("the font isn't valid.");
    else {
      const font: NonNullable<StudioNode["font"]> = {};
      if (typeof f.family === "string" && f.family.trim()) {
        if (f.family.length > 60) bad("the font's name is too long.");
        else font.family = f.family.trim();
      }
      if (f.weight !== undefined) {
        if (!(STUDIO_FONT_WEIGHTS as readonly unknown[]).includes(f.weight)) bad("choose the text's weight.");
        else font.weight = f.weight as (typeof STUDIO_FONT_WEIGHTS)[number];
      }
      const size = studioNumber(f.size, L.minFont, L.maxFont);
      if (size !== undefined && Number.isNaN(size)) bad(`the text size must be ${L.minFont} to ${L.maxFont}.`);
      else if (size !== undefined) font.size = size;
      const line = studioNumber(f.line_height, 0.8, 3);
      if (line !== undefined && Number.isNaN(line)) bad("the line height must be 0.8 to 3.");
      else if (line !== undefined) font.line_height = line;
      const spacing = studioNumber(f.letter_spacing, -5, 20);
      if (spacing !== undefined && Number.isNaN(spacing)) bad("the letter spacing must be -5 to 20.");
      else if (spacing !== undefined) font.letter_spacing = spacing;
      if (f.italic === true) font.italic = true;
      if (f.underline === true) font.underline = true;
      if (f.strike === true) font.strike = true;
      if (f.uppercase === true) font.uppercase = true;
      if (Object.keys(font).length) node.font = font;
    }
  }
  const textAlign = pick("text_align", STUDIO_TEXT_ALIGNS, "choose where the text sits.");
  if (textAlign && textAlign !== "start") node.text_align = textAlign;
  const textual = node.type === "text" || node.type === "button" || node.type === "ratings" || node.type === "search" || node.type === "countdown" || node.type === "bullets";
  if (textual) {
    const text =
      (node.type === "text" || node.type === "bullets") && !card ? c.text(where, v.text, L.textChars, node.type === "bullets" ? "the list's lines" : "a text") : c.optionalText(where, v.text, L.textChars, node.type === "countdown" ? "The text once the time is up" : "The text");
    if (text) node.text = text;
  }
  // 107.3 A question of an accordion or a tab: its name.
  const title = c.optionalText(where, v.title, L.titleChars, "The question or the tab's name");
  if (title) node.title = title;
  if (textual || title) {
    const translations = parseTranslations(ctx, where, v.translations, TRANSLATABLE.studio, { text: L.textChars, title: L.titleChars });
    if (translations) node.translations = translations;
  }
  const lines = num("max_lines", 1, 50, "the lines");
  if (lines) node.max_lines = Math.round(lines);

  // What each kind holds.
  switch (node.type) {
    case "image": {
      const url = card ? c.mediaUrl(where, v.image_url, "the picture's address", false) : c.mediaUrl(where, v.image_url, "the picture's address", true);
      if (url) node.image_url = url;
      const fit = pick("fit", STUDIO_FITS, "choose how the picture fits.");
      if (fit && fit !== "cover") node.fit = fit;
      break;
    }
    case "icon":
      if (!(typeof v.icon === "string" && ICON_NAME.test(v.icon))) bad("choose an icon.");
      else node.icon = v.icon;
      break;
    case "button":
      if (v.icon !== undefined && v.icon !== null && v.icon !== "") {
        if (!(typeof v.icon === "string" && ICON_NAME.test(v.icon))) bad("choose an icon.");
        else node.icon = v.icon;
      }
      break;
    case "video":
      if (typeof v.video_url !== "string" || !/^https:\/\//.test(v.video_url)) bad("add the video's address.");
      else node.video_url = v.video_url;
      if (v.autoplay === true) node.autoplay = true;
      break;
    case "grid": {
      const columns = num("columns", 1, L.maxColumns, "the columns");
      node.columns = columns ? Math.round(columns) : 2;
      break;
    }
    case "slider": {
      if (v.autoplay === true) node.autoplay = true;
      const interval = num("interval_ms", 1500, 20000, "the time between slides");
      if (interval) node.interval_ms = Math.round(interval);
      const perView = num("per_view", 1, 4, "how many show at a time");
      if (perView && perView !== 1) node.per_view = perView;
      if (v.dots === false) node.dots = false;
      break;
    }
    case "row":
      if (v.scroll === true) node.scroll = true;
      break;
    case "countdown": {
      // 107.3 Counts down to a moment.
      const ends = typeof v.ends_at === "string" ? new Date(v.ends_at) : null;
      if (!ends || Number.isNaN(ends.getTime())) bad("set when the countdown ends.");
      else node.ends_at = ends.toISOString();
      break;
    }
    case "bullets":
      if (v.icon !== undefined && v.icon !== null && v.icon !== "") {
        if (!(typeof v.icon === "string" && ICON_NAME.test(v.icon))) bad("choose an icon.");
        else node.icon = v.icon;
      }
      break;
    case "items": {
      if (!oneOf(ctx.sources, v.source)) bad("choose what the list shows.");
      node.source = v.source as ItemSource;
      const layout = pick("layout", ITEMS_LAYOUTS, "choose how the list looks.");
      node.layout = layout ?? "grid";
      node.query = parseQuery(ctx, where, v.query, v.source);
      const columns = num("columns", 1, L.maxColumns, "the columns");
      if (columns) node.columns = Math.round(columns);
      if (v.card !== undefined && v.card !== null) {
        if (card) bad("a card can't hold another list.");
        else {
          const cardNode = parseNode(ctx, `${where}, card`, v.card, state, depth + 1, true);
          if (cardNode) node.card = cardNode;
        }
      }
      break;
    }
    case "categories":
      if (!oneOf(ctx.categorySources, v.source)) bad("choose whose categories to show.");
      node.source = v.source as ItemSource;
      break;
    case "form": {
      const f = record(v.form);
      if (!f) {
        bad("add the form's questions.");
        break;
      }
      const send = oneOf(FORM_SEND_TO, f.send_to) ? f.send_to : null;
      if (!send) bad("choose where the answers go.");
      const raw = Array.isArray(f.fields) ? f.fields : [];
      if (raw.length < 1 || raw.length > L.maxFormFields) bad(`a form has 1 to ${L.maxFormFields} questions.`);
      const ids = new Set<string>();
      const fields: FormField[] = raw.slice(0, L.maxFormFields).flatMap((item, i) => {
        const at = `${where}, question ${i + 1}`;
        const field = record(item);
        const fid = typeof field?.id === "string" ? field.id : "";
        if (!ID.test(fid)) c.fail(at, "the question has no valid ID.");
        else if (ids.has(fid)) c.fail(at, "two questions have the same ID.");
        ids.add(fid);
        if (!oneOf(FORM_FIELD_KINDS, field?.kind)) c.fail(at, "choose the kind of answer.");
        const kind = oneOf(FORM_FIELD_KINDS, field?.kind) ? field.kind : "text";
        let options: string[] | null = null;
        if (kind === "choice") {
          const list = Array.isArray(field?.options) ? field.options : [];
          options = list.map((o) => (typeof o === "string" ? o.trim() : "")).filter(Boolean).slice(0, 10);
          if (options.length < 2 || list.length > 10) c.fail(at, "give 2 to 10 choices.");
        }
        return [{ id: fid, kind, label: c.text(at, field?.label, 80, "a question"), required: field?.required === true, options }];
      });
      node.form = {
        fields,
        send_to: send ?? "email",
        submit_label: c.optionalText(where, f.submit_label, 40, "The button text") || null,
        success_text: c.optionalText(where, f.success_text, 200, "The text after sending") || null,
      };
      break;
    }
    case "map": {
      const m = record(v.map);
      const lat = studioNumber(m?.lat, -90, 90);
      const lng = studioNumber(m?.lng, -180, 180);
      if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) bad("set the place on the map.");
      else {
        const zoom = studioNumber(m?.zoom, 1, 19);
        node.map = { lat: typeof m?.lat === "number" ? m.lat : lat, lng: typeof m?.lng === "number" ? m.lng : lng };
        if (zoom !== undefined && !Number.isNaN(zoom) && zoom !== 15) node.map.zoom = zoom;
        const label = c.optionalText(where, m?.label, 120, "The place's name");
        if (label) node.map.label = label;
      }
      break;
    }
    case "ratings": {
      const rating = num("rating", 0, 5, "the stars");
      if (rating !== undefined) node.rating = rating;
      break;
    }
    default:
      break;
  }
  if (node.type === "button" || node.type === "icon" || node.type === "bullets") {
    const iconSize = num("icon_size", 8, 200, "the icon's size");
    if (iconSize && iconSize !== 24) node.icon_size = iconSize;
    const pos = pick("icon_position", ["start", "end"] as const, "choose where the icon sits.");
    if (pos && pos !== "end") node.icon_position = pos;
  }
  if (node.type === "image" || node.type === "video" || node.type === "map") {
    // aspect_ratio kept above.
  }

  // The data of an items card.
  if (v.bind !== undefined && v.bind !== null) {
    if (!card) bad("only a list's card takes its texts from the list.");
    else {
      const bind = pick("bind", STUDIO_BINDS, "choose what the element shows from the list.");
      if (bind) node.bind = bind;
    }
  }

  // A tap, where it shows, and motion.
  if (node.type !== "items" && node.type !== "categories" && node.type !== "form" && node.type !== "search" && !card) {
    const action = parseAction(ctx, where, v.action, false);
    if (action) node.action = action;
  }
  if (v.platforms !== undefined) {
    const raw = Array.isArray(v.platforms) ? v.platforms : [];
    const platforms = [...new Set(raw.filter((p): p is (typeof STUDIO_PLATFORMS)[number] => oneOf(STUDIO_PLATFORMS, p)))];
    if (platforms.length !== raw.length || platforms.length === 0) bad("show it on Android, iOS or both.");
    else if (platforms.length < STUDIO_PLATFORMS.length) node.platforms = platforms;
  }
  const visibility = pick("visibility", STUDIO_VISIBILITY, "choose who sees it.");
  if (visibility && visibility !== "everyone") node.visibility = visibility;
  if (v.motion !== undefined && v.motion !== null) {
    const m = record(v.motion);
    if (!m) bad("the motion isn't valid.");
    else {
      const motion: NonNullable<StudioNode["motion"]> = {};
      if (m.enter !== undefined && !oneOf(STUDIO_ENTERS, m.enter)) bad("choose how it comes in.");
      else if (m.enter && m.enter !== "none") motion.enter = m.enter as (typeof STUDIO_ENTERS)[number];
      const duration = studioNumber(m.duration_ms, 100, 3000);
      if (duration !== undefined && Number.isNaN(duration)) bad("the motion takes 100 to 3000 ms.");
      else if (duration !== undefined && duration !== 400) motion.duration_ms = Math.round(duration);
      const delay = studioNumber(m.delay_ms, 0, 5000);
      if (delay !== undefined && Number.isNaN(delay)) bad("the wait before it is 0 to 5000 ms.");
      else if (delay) motion.delay_ms = Math.round(delay);
      if (m.press !== undefined && !oneOf(STUDIO_PRESSES, m.press)) bad("choose how it moves when tapped.");
      else if (m.press && m.press !== "none") motion.press = m.press as (typeof STUDIO_PRESSES)[number];
      if (m.loop !== undefined && !oneOf(STUDIO_LOOPS, m.loop)) bad("choose how it keeps moving.");
      else if (m.loop && m.loop !== "none") motion.loop = m.loop as (typeof STUDIO_LOOPS)[number];
      if (Object.keys(motion).length) node.motion = motion;
    }
  }

  // What a layout holds.
  const layout = (STUDIO_LAYOUT_TYPES as readonly string[]).includes(node.type) && node.type !== "spacer";
  if (layout) {
    const raw = Array.isArray(v.children) ? v.children : [];
    if (raw.length > L.maxChildren) bad(`a layout can hold at most ${L.maxChildren} elements.`);
    node.children = raw
      .slice(0, L.maxChildren)
      .map((child, i) => parseNode(ctx, `${where} › ${i + 1}`, child, state, depth + 1, card))
      .filter((child): child is StudioNode => child !== null);
  } else if (Array.isArray(v.children) && v.children.length) bad("only rows, columns and other layouts hold elements.");
  return node;
}

function parseTab(ctx: Context, index: number, value: unknown, kind: "Tab" | "Menu entry" = "Tab"): LayoutTab | null {
  const { c } = ctx;
  const v = record(value) ?? {};
  const where = `${kind} ${index + 1}`;
  const id = typeof v.id === "string" ? v.id : "";
  if (!ID.test(id)) c.fail(where, "the tab has no valid ID.");
  const label = c.text(where, v.label, 20, "a label");
  const icon = typeof v.icon === "string" ? v.icon : "";
  if (!ICON_NAME.test(icon)) c.fail(where, "choose an icon.");
  const target = parseAction(ctx, where, v.target, true);
  const tab: LayoutTab = { id, label, icon, target: target ?? { type: "screen", screen: "account" } };
  // 82.5 The owner's own icon.
  const iconUrl = c.mediaUrl(where, v.icon_url, "The icon's picture address", false);
  if (iconUrl) tab.icon_url = iconUrl;
  const translations = parseTranslations(ctx, where, v.translations, TRANSLATABLE.tab, { label: 20 });
  if (translations) tab.translations = translations;
  return tab;
}

/** Checks and cleans a whole layout (without its version). */
export function parseLayoutContent(value: unknown, options: ParseOptions): ParseResult<LayoutContent> {
  const c = new Checker();
  const v = record(value);
  if (!v) return { ok: false, errors: ["The layout is missing."] };
  // 43 The interface strings have their own limits.
  const { strings: stringsIn, ...rest } = v;
  if (JSON.stringify(rest).length > LAYOUT_LIMITS.maxBytes) return { ok: false, errors: ["The layout is too large. Remove some blocks or pages."] };
  const appearance = parseAppearance(v.appearance, c, "Look", options.ownFonts);
  const languages = parseLanguages(v.languages, c);
  const pagesIn = Array.isArray(v.pages) ? v.pages : [];
  if (!Array.isArray(v.pages)) c.fail("", "The pages are missing.");
  if (pagesIn.length > LAYOUT_LIMITS.maxPages) c.fail("", `An app can have at most ${LAYOUT_LIMITS.maxPages} pages.`);
  const slugs = new Set<string>();
  for (const page of pagesIn) {
    const slug = record(page)?.slug;
    if (typeof slug !== "string") continue;
    if (slugs.has(slug)) c.fail(`Page "${String(record(page)?.title ?? slug)}"`, `another page already has the address ${slug}.`);
    slugs.add(slug);
  }
  const ctx: Context = {
    c,
    app: options.app,
    sources: itemSourcesFor(options.app),
    categorySources: categorySourcesFor(options.app),
    slugs,
    languages,
  };
  const allowedBlocks = blockTypesFor(options.app);
  const pages = pagesIn
    .slice(0, LAYOUT_LIMITS.maxPages)
    .map((p, i) => parsePage(ctx, i, p, allowedBlocks, options.now))
    .filter((p): p is LayoutPage => p !== null);
  const tabsIn = Array.isArray(v.tabs) ? v.tabs : [];
  if (tabsIn.length < LAYOUT_LIMITS.minTabs || tabsIn.length > LAYOUT_LIMITS.maxTabs) {
    c.fail("Tabs", `the app needs ${LAYOUT_LIMITS.minTabs} to ${LAYOUT_LIMITS.maxTabs} tabs.`);
  }
  const tabs = tabsIn
    .slice(0, LAYOUT_LIMITS.maxTabs)
    .map((t, i) => parseTab(ctx, i, t))
    .filter((t): t is LayoutTab => t !== null);
  const tabIds = new Set<string>();
  for (const tab of tabs) {
    if (tabIds.has(tab.id)) c.fail("Tabs", "two tabs have the same ID.");
    tabIds.add(tab.id);
  }
  // 109 How the bottom tabs look.
  const tabBar = v.tab_bar === undefined || v.tab_bar === null ? null : parseTabBar(v.tab_bar, tabs, c);
  // 82.5 The side menu: entries shaped like the tabs, none at all by default.
  const menuIn = Array.isArray(v.menu) ? v.menu : [];
  if (v.menu !== undefined && !Array.isArray(v.menu)) c.fail("Side menu", "the side menu is missing.");
  if (menuIn.length > LAYOUT_LIMITS.maxMenu) c.fail("Side menu", `the side menu can have at most ${LAYOUT_LIMITS.maxMenu} entries.`);
  const menu = menuIn
    .slice(0, LAYOUT_LIMITS.maxMenu)
    .map((t, i) => parseTab(ctx, i, t, "Menu entry"))
    .filter((t): t is LayoutTab => t !== null);
  const menuIds = new Set<string>();
  for (const entry of menu) {
    if (menuIds.has(entry.id)) c.fail("Side menu", "two entries have the same ID.");
    menuIds.add(entry.id);
  }
  const strings = stringsIn === undefined ? undefined : parseInterfaceStrings(stringsIn, (where, message) => c.fail(where, message));
  // 97.3 The Figma look, and which look the app shows.
  const figma = v.figma_look === undefined || v.figma_look === null ? null : parseFigmaLook(v.figma_look, c, options.ownFonts);
  if (v.look_mode !== undefined && !oneOf(LOOK_MODES, v.look_mode)) c.fail("Look", "choose the standard look or the Figma look.");
  if (v.look_mode === "figma" && !figma) c.fail("Look", "import a Figma file before showing its look.");
  if (c.errors.length) return { ok: false, errors: c.errors };
  return {
    ok: true,
    value: {
      appearance,
      languages,
      tabs,
      ...(tabBar && Object.keys(tabBar).length ? { tab_bar: tabBar } : {}),
      ...(menu.length ? { menu } : {}),
      pages,
      ...(strings && Object.keys(strings).length ? { strings } : {}),
      ...(v.look_mode === "figma" ? { look_mode: "figma" as const } : {}),
      ...(figma ? { figma_look: figma } : {}),
    },
  };
}

/** 109 How the bottom tabs look: colours, corners, the space around, the names' font and when they show, a tab in the middle. */
function parseTabBar(raw: unknown, tabs: LayoutTab[], c: { fail: (where: string, message: string) => void }): TabBarStyle | null {
  if (typeof raw !== "object" || Array.isArray(raw)) {
    c.fail("Tabs", "the tab bar's look is missing.");
    return null;
  }
  const v = raw as Record<string, unknown>;
  const out: TabBarStyle = {};
  for (const key of ["background", "dark_background", "active", "inactive"] as const) {
    const colour = v[key];
    if (colour === undefined || colour === null) continue;
    if (typeof colour === "string" && HEX.test(colour)) out[key] = colour.toUpperCase();
    else c.fail("Tabs", "a colour of the tab bar isn't a colour.");
  }
  for (const [key, max] of [
    ["radius", 32],
    ["margin", 24],
  ] as const) {
    const n = v[key];
    if (n === undefined) continue;
    if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= max) {
      if (n) out[key] = n;
    } else c.fail("Tabs", `the tab bar's ${key === "radius" ? "corners" : "space around"} must be 0 to ${max}.`);
  }
  if (v.font !== undefined && v.font !== null) {
    if (typeof v.font === "string" && v.font.trim() && v.font.length <= 60) out.font = v.font.trim();
    else c.fail("Tabs", "the tab bar's font name is too long.");
  }
  if (v.labels !== undefined) {
    if (oneOf(TAB_LABELS, v.labels)) {
      if (v.labels !== "always") out.labels = v.labels;
    } else c.fail("Tabs", "choose when the tabs' names show.");
  }
  if (v.center !== undefined && v.center !== null) {
    if (typeof v.center === "string" && tabs.some((t) => t.id === v.center)) out.center = v.center;
    else c.fail("Tabs", "the tab in the middle isn't one of the tabs.");
  }
  return out;
}
