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
  BLOCK_BACKGROUNDS,
  BLOCK_SPACINGS,
  NOTICE_TONES,
  QUICK_LINK_STYLES,
  SCREENS,
  SOCIAL_NETWORKS,
  SPACER_SIZES,
  THEME_MODES,
  TRANSLATABLE,
  TRANSLATABLE_ENTRIES,
  VISIBILITIES,
  WEEKDAYS,
  type Action,
  type Appearance,
  type AppDefaultsSetting,
  type BlockType,
  type EntryList,
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
  type LanguageCode,
  type Languages,
  type LayoutBlock,
  type LayoutContent,
  type LayoutPage,
  type LayoutTab,
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
  app: Pick<App, "appType" | "backend">;
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
  };
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
    if (background !== "none" || spacing !== "medium") block.look = { background, spacing };
  }
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
  return page;
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
      ...(menu.length ? { menu } : {}),
      pages,
      ...(strings && Object.keys(strings).length ? { strings } : {}),
      ...(v.look_mode === "figma" ? { look_mode: "figma" as const } : {}),
      ...(figma ? { figma_look: figma } : {}),
    },
  };
}
