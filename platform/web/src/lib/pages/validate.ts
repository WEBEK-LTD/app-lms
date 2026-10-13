import type { App } from "../data/types";
import { cleanBlockHtml, safeHref } from "./html";
import { ICON_NAME } from "./icons";
import { blockTypesFor, categorySourcesFor, itemSourcesFor } from "./sources";
import {
  ACTION_TYPES,
  APP_FONTS,
  APP_TEMPLATES,
  BUTTON_STYLES,
  CARD_STYLES,
  CATEGORY_STYLES,
  CORNERS,
  ITEMS_LAYOUTS,
  ITEMS_SORTS,
  LANGUAGE_CODES,
  LAYOUT_LIMITS,
  SCREENS,
  SPACER_SIZES,
  THEME_MODES,
  TRANSLATABLE,
  VISIBILITIES,
  type Action,
  type Appearance,
  type AppDefaultsSetting,
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

const BLOCK_NAMES: Record<string, string> = {
  banner: "Banner",
  text: "Text",
  image: "Image",
  video: "Video",
  button: "Button",
  items: "List",
  categories: "Categories",
  search: "Search",
  continue_learning: "Continue learning",
  embed: "Web page",
  spacer: "Space",
};

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
    if (!url || url.protocol !== "https:" || text.length > 2000 || /\s/.test(text)) {
      this.fail(where, `${what} must be a full https address.`);
      return null;
    }
    return url.toString();
  }
}

export interface ParseOptions {
  app: Pick<App, "appType" | "backend">;
  now: Date;
}

export function parseAppearance(value: unknown, c: Checker = new Checker(), where = "Look"): Appearance {
  const v = record(value) ?? {};
  if (!record(value)) c.fail(where, "the look is missing.");
  if (!oneOf(APP_TEMPLATES, v.template)) c.fail(where, "choose a template.");
  if (!oneOf(THEME_MODES, v.theme_mode)) c.fail(where, "choose how the app opens: system, light or dark.");
  if (typeof v.user_can_change_mode !== "boolean") c.fail(where, "say whether people can switch light and dark mode.");
  if (v.secondary_color !== null && v.secondary_color !== undefined && v.secondary_color !== "" && !(typeof v.secondary_color === "string" && HEX.test(v.secondary_color))) {
    c.fail(where, "the secondary color must look like #E8B04B.");
  }
  if (!oneOf(APP_FONTS, v.font)) c.fail(where, "choose a font.");
  if (!oneOf(CORNERS, v.corners)) c.fail(where, "choose the corners.");
  if (!oneOf(CARD_STYLES, v.cards)) c.fail(where, "choose the card style.");
  return {
    template: v.template as Appearance["template"],
    theme_mode: v.theme_mode as Appearance["theme_mode"],
    user_can_change_mode: v.user_can_change_mode === true,
    secondary_color: typeof v.secondary_color === "string" && HEX.test(v.secondary_color) ? v.secondary_color.toUpperCase() : null,
    font: v.font as Appearance["font"],
    corners: v.corners as Appearance["corners"],
    cards: v.cards as Appearance["cards"],
  };
}

export function parseLanguages(value: unknown, c: Checker = new Checker(), where = "Languages"): Languages {
  const v = record(value) ?? {};
  const def = oneOf(LANGUAGE_CODES, v.default) ? v.default : null;
  if (!def) c.fail(where, "choose the default language.");
  const available: LanguageCode[] = [];
  if (!Array.isArray(v.available)) c.fail(where, "choose the languages.");
  for (const code of Array.isArray(v.available) ? v.available : []) {
    if (!oneOf(LANGUAGE_CODES, code)) c.fail(where, `${String(code)} isn't a language apps support.`);
    else if (!available.includes(code)) available.push(code);
  }
  const fallback = def ?? "en";
  if (!available.includes(fallback)) available.unshift(fallback);
  // The default first, then the others in the order of the list.
  return { default: fallback, available: [fallback, ...LANGUAGE_CODES.filter((l) => l !== fallback && available.includes(l))] };
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
      return { type: "screen", screen: v.screen as Action["screen"] };
    case "course": {
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
    if (!oneOf(LANGUAGE_CODES, lang) || lang === ctx.languages.default) continue;
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

const BLOCK_TEXT_LIMITS = { title: 80, heading: 120, subheading: 200, html: LAYOUT_LIMITS.htmlChars, label: 40, placeholder: 60 };

function parseQuery(ctx: Context, where: string, value: unknown): ItemsQuery {
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
  return {
    category_id: category,
    featured: v.featured === true,
    sort: oneOf(ITEMS_SORTS, sort) ? sort : "newest",
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
  const id = typeof v.id === "string" ? v.id : "";
  if (!ID.test(id)) c.fail(at, "the block has no valid ID.");
  if (!oneOf(VISIBILITIES, v.visibility ?? "everyone")) c.fail(at, "choose who sees this block.");
  const block: LayoutBlock = {
    id,
    type: type as LayoutBlock["type"],
    visibility: oneOf(VISIBILITIES, v.visibility) ? v.visibility : "everyone",
    title: c.optionalText(at, v.title, BLOCK_TEXT_LIMITS.title, "The title"),
  };
  switch (type) {
    case "banner":
      block.image_url = c.mediaUrl(at, v.image_url, "an image address", true);
      block.heading = c.optionalText(at, v.heading, BLOCK_TEXT_LIMITS.heading, "The heading");
      block.subheading = c.optionalText(at, v.subheading, BLOCK_TEXT_LIMITS.subheading, "The text under the heading");
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
      block.label = c.text(at, v.label, BLOCK_TEXT_LIMITS.label, "the button text");
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
      block.query = parseQuery(ctx, at, v.query);
      break;
    case "categories":
      if (!oneOf(ctx.categorySources, v.source)) c.fail(at, "choose whose categories to show.");
      block.source = v.source as ItemSource;
      block.style = oneOf(CATEGORY_STYLES, v.style) ? v.style : "chips";
      break;
    case "search":
      if (!oneOf(ctx.sources, v.source)) c.fail(at, "choose what people search.");
      block.source = v.source as ItemSource;
      block.placeholder = c.text(at, v.placeholder, BLOCK_TEXT_LIMITS.placeholder, "the text in the search box");
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
  }
  const translations = parseTranslations(ctx, at, v.translations, TRANSLATABLE.block, BLOCK_TEXT_LIMITS);
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

function parseTab(ctx: Context, index: number, value: unknown): LayoutTab | null {
  const { c } = ctx;
  const v = record(value) ?? {};
  const where = `Tab ${index + 1}`;
  const id = typeof v.id === "string" ? v.id : "";
  if (!ID.test(id)) c.fail(where, "the tab has no valid ID.");
  const label = c.text(where, v.label, 20, "a label");
  const icon = typeof v.icon === "string" ? v.icon : "";
  if (!ICON_NAME.test(icon)) c.fail(where, "choose an icon.");
  const target = parseAction(ctx, where, v.target, true);
  const tab: LayoutTab = { id, label, icon, target: target ?? { type: "screen", screen: "account" } };
  const translations = parseTranslations(ctx, where, v.translations, TRANSLATABLE.tab, { label: 20 });
  if (translations) tab.translations = translations;
  return tab;
}

/** Checks and cleans a whole layout (without its version). */
export function parseLayoutContent(value: unknown, options: ParseOptions): ParseResult<LayoutContent> {
  const c = new Checker();
  const v = record(value);
  if (!v) return { ok: false, errors: ["The layout is missing."] };
  if (JSON.stringify(v).length > LAYOUT_LIMITS.maxBytes) return { ok: false, errors: ["The layout is too large. Remove some blocks or pages."] };
  const appearance = parseAppearance(v.appearance, c);
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
  if (c.errors.length) return { ok: false, errors: c.errors };
  return { ok: true, value: { appearance, languages, tabs, pages } };
}
