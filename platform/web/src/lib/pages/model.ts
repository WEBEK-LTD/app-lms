import { blockActions, mapBlockActions } from "./block-actions";
import { newBlockId } from "./defaults";
import type { ScreenOption } from "./sources";
import {
  ENTRY_LISTS,
  TRANSLATABLE,
  TRANSLATABLE_ENTRIES,
  type BlockType,
  type Card,
  type FormField,
  type GalleryImage,
  type ItemSource,
  type LanguageCode,
  type LayoutBlock,
  type LayoutContent,
  type LayoutPage,
  type Person,
  type QuickLink,
  type Quote,
  type ScreenName,
  type Slide,
  type Stat,
  type Translations,
} from "./types";

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
    // 43 The owner's order stays; a language that wasn't offered yet comes first.
    languages: { default: to, available: layout.languages.available.includes(to) ? layout.languages.available : [to, ...layout.languages.available] },
    tabs: layout.tabs.map((t) => swapTexts(t, TRANSLATABLE.tab, from, to)),
    ...(layout.menu ? { menu: layout.menu.map((t) => swapTexts(t, TRANSLATABLE.tab, from, to)) } : {}),
    pages: layout.pages.map((p) => ({
      ...swapTexts(p, TRANSLATABLE.page, from, to),
      blocks: p.blocks.map((b) => {
        const block = swapTexts(b, TRANSLATABLE.block, from, to);
        // 33 The entries of its lists too.
        for (const list of ENTRY_LISTS) {
          const entries = block[list] as ({ translations?: Translations } & object)[] | undefined;
          if (entries) (block as unknown as Record<string, unknown>)[list] = entries.map((e) => swapTexts(e, TRANSLATABLE_ENTRIES[list], from, to));
        }
        return block;
      }),
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
export function newBlock(type: BlockType, sources: ItemSource[], screens: readonly ScreenOption[] = []): LayoutBlock {
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
    // 33 The new blocks start with empty texts to fill in, like the others; lists start with entries to fill.
    case "slider":
      return { ...base, auto_advance: true, slides: [emptySlide(), emptySlide()] };
    case "quick_links":
      return { ...base, style: "grid", links: quickLinksFor(screens) };
    case "testimonials":
      return { ...base, title: "", quotes: [emptyQuote()] };
    case "faq":
      return { ...base, title: "", questions: [{ question: "", answer: "" }] };
    case "countdown": {
      // A week from now, on the hour.
      const ends = new Date(Date.now() + 7 * 86_400_000);
      ends.setUTCMinutes(0, 0, 0);
      return { ...base, heading: "", subheading: null, ends_at: ends.toISOString().replace(/\.000Z$/, "Z"), ended_text: null, action: null };
    }
    case "contact":
      return { ...base, title: "", phone: null, whatsapp: null, email: null, website: null, address: null, latitude: null, longitude: null };
    case "hours":
      return {
        ...base,
        title: "",
        hours: (["mon", "tue", "wed", "thu", "fri"] as const).map((day) => ({ day, opens: "09:00", closes: "17:00" })),
        closed_dates: [],
        note: null,
      };
    case "social":
      return { ...base, profiles: [{ network: "instagram", url: "" }] };
    case "team":
      return { ...base, title: "", layout: "carousel", people: [emptyPerson()] };
    case "stats":
      return { ...base, stats: [emptyStat(), emptyStat(), emptyStat()] };
    case "notice":
      return { ...base, tone: "info", text: "", action: null };
    // 99.4
    case "cards":
      return { ...base, columns: 2, cards: [emptyCard(), emptyCard()] };
    case "gallery":
      return { ...base, columns: 3, images: [emptyImage()] };
    case "map":
      return { ...base, latitude: 0, longitude: 0, name: null, address: null };
    case "divider":
      return { ...base, style: "line" };
    case "form":
      return {
        ...base,
        title: "",
        fields: [
          { id: "name", kind: "text", label: "Name", required: true, options: null },
          { id: "email", kind: "email", label: "Email", required: true, options: null },
          { id: "message", kind: "long_text", label: "Message", required: false, options: null },
        ],
        submit_label: null,
        success_text: null,
        send_to: "email",
      };
  }
}

// 33 Empty entries the editor adds to a block's list.
export const emptySlide = (): Slide => ({ image_url: null, heading: "", subheading: null, action: null });
export const emptyQuote = (): Quote => ({ text: "", name: "", role: null, photo_url: null, rating: 5 });
export const emptyPerson = (): Person => ({ name: "", role: null, bio: null, photo_url: null, action: null });
export const emptyStat = (): Stat => ({ value: "", label: "" });
export const emptyCard = (): Card => ({ title: "", text: null, image_url: null, action: null });
export const emptyImage = (): GalleryImage => ({ image_url: "", caption: null });
/** 99.4 A new form field, with an ID the form doesn't have yet. */
export function emptyField(taken: readonly string[]): FormField {
  let n = taken.length + 1;
  while (taken.includes(`field-${n}`)) n += 1;
  return { id: `field-${n}`, kind: "text", label: "", required: false, options: null };
}

/** The icon a quick link to a screen starts with. */
export const SCREEN_ICONS: Partial<Record<ScreenName, string>> = {
  courses: "school",
  my_courses: "menu_book",
  search: "search",
  favorites: "favorite",
  messages: "chat",
  account: "person",
  settings: "settings",
  notifications: "notifications",
  cart: "shopping_cart",
  orders: "receipt_long",
  services: "calendar_month",
  appointments: "event_available",
  articles: "newspaper",
  bookmarks: "bookmark",
  classes: "fitness_center",
  memberships: "card_membership",
  events: "event",
  tickets: "confirmation_number",
  campaigns: "volunteer_activism",
  my_donations: "receipt_long",
  send_parcel: "local_shipping",
  shipments: "package_2",
  courier: "two_wheeler",
};

/** Four quick links to the app's first screens, named as the editor names them. */
export function quickLinksFor(screens: readonly ScreenOption[]): QuickLink[] {
  return screens
    .filter((s) => !s.alias && s.value !== "settings")
    .slice(0, 4)
    .map((s) => ({ icon: SCREEN_ICONS[s.value] ?? "apps", label: s.label.slice(0, 24), action: { type: "screen", screen: s.value } }));
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
  const fix = <A extends { type: string; page_slug?: string | null }>(action: A): A => (action.type === "page" && action.page_slug === from ? { ...action, page_slug: to } : action);
  return {
    ...layout,
    tabs: layout.tabs.map((t) => ({ ...t, target: fix(t.target) })),
    ...(layout.menu ? { menu: layout.menu.map((t) => ({ ...t, target: fix(t.target) })) } : {}),
    pages: layout.pages.map((p) => ({
      ...p,
      slug: p.slug === from ? to : p.slug,
      // 33 The actions of slides, quick links and people too.
      blocks: p.blocks.map((b) => mapBlockActions(b, fix)),
    })),
  };
}

/** What opens the page: tab labels, and blocks on other pages. */
export function pageLinks(layout: LayoutContent, slug: string): string[] {
  const opens = (a: { type: string; page_slug?: string | null } | null | undefined) => a?.type === "page" && a.page_slug === slug;
  const links = layout.tabs.filter((t) => opens(t.target)).map((t) => `the ${t.label || "untitled"} tab`);
  for (const entry of layout.menu ?? []) if (opens(entry.target)) links.push(`the ${entry.label || "untitled"} entry of the side menu`);
  for (const page of layout.pages) {
    if (page.slug === slug) continue;
    if (page.blocks.some((b) => blockActions(b).some(opens))) links.push(`a block on ${page.title || page.slug}`);
  }
  return links;
}
