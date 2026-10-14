import { newBlockId } from "./defaults";
import { TRANSLATABLE, type BlockType, type ItemSource, type LanguageCode, type LayoutBlock, type LayoutContent, type LayoutPage, type Translations } from "./types";

/** Changes the page and look editor makes to a layout; pure, so the dashboard and tests share them. */

type WithTexts = { translations?: Translations } & object;

/** A text in `lang`: the default text, or its translation (empty when there's none yet). */
export function textIn(value: WithTexts, field: string, lang: LanguageCode, def: LanguageCode): string {
  if (lang === def) return String((value as Record<string, unknown>)[field] ?? "");
  return value.translations?.[lang]?.[field] ?? "";
}

/** Sets a text in `lang`: the default text, or its translation (removed when empty). */
export function withText<T extends WithTexts>(value: T, field: string, text: string, lang: LanguageCode, def: LanguageCode): T {
  if (lang === def) return { ...value, [field]: text };
  const translations: Translations = { ...value.translations };
  const texts = { ...translations[lang] };
  if (text) texts[field] = text;
  else delete texts[field];
  if (Object.keys(texts).length) translations[lang] = texts;
  else delete translations[lang];
  if (Object.keys(translations).length) return { ...value, translations };
  const { translations: _none, ...rest } = value;
  void _none;
  return rest as T;
}

function swapTexts<T extends WithTexts>(value: T, fields: readonly string[], from: LanguageCode, to: LanguageCode): T {
  const record = value as Record<string, unknown>;
  let out: T = { ...value };
  for (const field of fields) {
    const base = record[field];
    if (typeof base !== "string") continue;
    const translatedText = value.translations?.[to]?.[field];
    out = withText(out, field, base, from, to);
    out = { ...out, [field]: translatedText ?? base };
  }
  if (out.translations?.[to]) {
    const { [to]: _gone, ...rest } = out.translations;
    void _gone;
    out = { ...out, translations: rest };
    if (!Object.keys(rest).length) delete out.translations;
  }
  return out;
}

/**
 * A new default language: its translations become the main texts and the
 * old main texts become translations, so nothing is lost.
 */
export function switchDefaultLanguage(layout: LayoutContent, to: LanguageCode): LayoutContent {
  const from = layout.languages.default;
  if (from === to) return layout;
  return {
    ...layout,
    languages: { default: to, available: [to, ...layout.languages.available.filter((l) => l !== to)] },
    tabs: layout.tabs.map((t) => swapTexts(t, TRANSLATABLE.tab, from, to)),
    pages: layout.pages.map((p) => ({
      ...swapTexts(p, TRANSLATABLE.page, from, to),
      blocks: p.blocks.map((b) => swapTexts(b, TRANSLATABLE.block, from, to)),
    })),
  };
}

/** A page address from a title: lowercase letters, digits and dashes, unique in the layout. */
export function uniqueSlug(title: string, taken: string[]): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32)
      .replace(/-+$/, "") || "page";
  let slug = base;
  for (let n = 2; taken.includes(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

/** A block of `type` with sensible starting settings. */
export function newBlock(type: BlockType, sources: ItemSource[]): LayoutBlock {
  const id = newBlockId();
  const source = sources[0] ?? "courses";
  const base: LayoutBlock = { id, type, visibility: "everyone", title: null };
  switch (type) {
    case "banner":
      return { ...base, image_url: "", heading: "", subheading: null, action: null };
    case "text":
      return { ...base, html: "" };
    case "image":
      return { ...base, image_url: "", aspect_ratio: null, action: null };
    case "video":
      return { ...base, url: "", poster_url: null };
    case "button":
      return { ...base, label: "", icon: null, style: "filled", action: { type: "screen", screen: "account" } };
    case "items":
      return {
        ...base,
        title: "",
        source,
        layout: "carousel",
        see_all: null,
        query: { category_id: null, featured: false, sort: "newest", limit: 10, ids: [] },
      };
    case "categories":
      // Listings and (28) events have no category lists.
      return { ...base, title: "", source: sources.find((s) => s !== "listings" && s !== "events") ?? source, style: "chips" };
    case "search":
      return { ...base, source, placeholder: "Search" };
    case "continue_learning":
      return { ...base, title: "Continue learning", visibility: "signed_in" };
    case "embed":
      return { ...base, url: "", height: null };
    case "spacer":
      return { ...base, size: "medium" };
  }
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const out = [...list];
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved!);
  return out;
}

/** A copy of a page under a new address, with new block IDs. */
export function duplicatePage(page: LayoutPage, taken: string[], now: Date): LayoutPage {
  const slug = uniqueSlug(`${page.slug}-copy`, taken);
  return {
    ...structuredClone(page),
    slug,
    title: `${page.title} (copy)`.slice(0, 60),
    updated_at: now.toISOString(),
    blocks: page.blocks.map((b) => ({ ...structuredClone(b), id: newBlockId() })),
  };
}

/** Points tabs, buttons and banners that opened `from` to `to` (a renamed page address). */
export function renamePageLinks(layout: LayoutContent, from: string, to: string): LayoutContent {
  const fix = <A extends { type: string; page_slug?: string | null } | null | undefined>(action: A): A =>
    action && action.type === "page" && action.page_slug === from ? { ...action, page_slug: to } : action;
  return {
    ...layout,
    tabs: layout.tabs.map((t) => ({ ...t, target: fix(t.target) })),
    pages: layout.pages.map((p) => ({
      ...p,
      slug: p.slug === from ? to : p.slug,
      blocks: p.blocks.map((b) => ({ ...b, ...(b.action !== undefined ? { action: fix(b.action) } : {}), ...(b.see_all !== undefined ? { see_all: fix(b.see_all) } : {}) })),
    })),
  };
}

/** What opens the page: tab labels, and blocks on other pages. */
export function pageLinks(layout: LayoutContent, slug: string): string[] {
  const opens = (a: { type: string; page_slug?: string | null } | null | undefined) => a?.type === "page" && a.page_slug === slug;
  const links = layout.tabs.filter((t) => opens(t.target)).map((t) => `the ${t.label || "untitled"} tab`);
  for (const page of layout.pages) {
    if (page.slug === slug) continue;
    if (page.blocks.some((b) => opens(b.action) || opens(b.see_all))) links.push(`a block on ${page.title || page.slug}`);
  }
  return links;
}
