import type { App } from "../data/types";
import type { Pickable } from "../hosted/pages/pickable";
import { appOpensScreen, itemSourcesFor, pageScreenOptionsFor } from "../pages/sources";
import { ENTRY_LISTS, TRANSLATABLE_ENTRIES, type Action, type LayoutContent, type StudioNode, type StudioPage } from "../pages/types";
import { DEMO_BRANDS } from "../demo/content";
import { APP_WORDS } from "./app-words";
import { DEMO_FACTS } from "./demo-templates";

/**
 * 182 The app check's rules: what a customer must never meet in an app, read
 * the way a phone reads it (hosted `GET /pages`, then each `GET /pages/{slug}`,
 * in each of the app's languages). They began as the template guard's (166,
 * tests/unit/template-guard.test.ts) and are product code here, so the guard
 * over Yallapp's templates and the check over each owner's real app (lib/
 * studio/app-check.ts) apply the same ones. Pure: no store, no clock.
 *
 * Each problem is an error (the customer sees something broken: a tap that
 * opens nothing, a page that doesn't load, a list's title over nothing, a
 * [placeholder], a price that can't be shown) or a warning (a text not
 * translated into one of the app's languages, a template's word left in, a
 * photo missing). Layout (a text past its card at a large text size) can't be
 * measured here: the build's check in a browser finds it (build/scripts/
 * check_app.mjs).
 */

// ——— The shapes read ———

/** A served page: its slug, the screen it's drawn around, its Studio page as the app gets it, and the answer's status. */
export interface CheckedPage {
  slug: string;
  screen: string | null;
  studio: StudioPage | null;
  /** The answer to `GET /pages/{slug}`: 200, or why the page didn't load. */
  result: { status: number; body?: unknown };
}

/** The app as a phone in `lang` reads it. The template guard's `ServedApp` is one. */
export interface CheckedApp {
  lang: string;
  navigation: Record<string, unknown>;
  pages: CheckedPage[];
}

export type AppCheckSeverity = "error" | "warning";

export const APP_CHECK_RULES = [
  // Errors
  "page_load",
  "placeholder",
  "dead_tap",
  "tap_page",
  "tap_screen",
  "tap_entry",
  "tap_url",
  "tap_unknown",
  "category",
  "empty_list",
  "price",
  "sample_data",
  "label_alone",
  // Warnings
  "written_price",
  "untranslated",
  "template_word",
  "missing_photo",
] as const;
export type AppCheckRule = (typeof APP_CHECK_RULES)[number];

/** Each rule's severity: what the customer would see broken is an error. */
export const RULE_SEVERITY: Record<AppCheckRule, AppCheckSeverity> = {
  page_load: "error",
  placeholder: "error",
  dead_tap: "error",
  tap_page: "error",
  tap_screen: "error",
  tap_entry: "error",
  tap_url: "error",
  tap_unknown: "error",
  category: "error",
  empty_list: "error",
  price: "error",
  sample_data: "error",
  label_alone: "error",
  written_price: "warning",
  untranslated: "warning",
  template_word: "warning",
  missing_photo: "warning",
};

/** One problem: where it is (the page, the element, the language) and what it says (`values` for the owner's sentence). */
export interface AppProblem {
  severity: AppCheckSeverity;
  rule: AppCheckRule;
  /** The language the phone read the app in; null when it's the same in every language (a tap). */
  lang: string | null;
  /** The page's slug; null for the tabs and menus of `GET /pages`. */
  page: string | null;
  /** The element's ID on the page ("header" for the page's header), or `tab:<id>`, `more:<id>`, `menu:<id>`; null for the page itself. */
  element: string | null;
  /** Where exactly, for the team and the logs ("/pages/home column#a/items#b items[2]"). */
  path: string;
  /** The values in the owner's sentence (a text, a page, a screen). */
  values: Record<string, string>;
}

function problem(rule: AppCheckRule, at: { lang: string | null; page: string | null; element: string | null; path: string }, values: Record<string, string> = {}): AppProblem {
  return { severity: RULE_SEVERITY[rule], rule, ...at, values };
}

/** Every node of a Studio page, its cards' too, with where it is ("column#a/row#b/card"). */
export function nodesOf(page: Pick<StudioPage, "body">): { node: StudioNode; path: string }[] {
  const out: { node: StudioNode; path: string }[] = [];
  const walk = (node: StudioNode, path: string) => {
    out.push({ node, path });
    node.children?.forEach((c, i) => walk(c, `${path}/${c.type}#${c.id ?? i}`));
    if (node.card) walk(node.card, `${path}/card`);
  };
  walk(page.body, `${page.body.type}#${page.body.id}`);
  return out;
}

// ——— What the customer may never read ———

/** A bracketed placeholder ("[Customer name]", "[اسم العميل]"), with letters inside: the template asking the owner for their own words. */
export const PLACEHOLDER = /[[［【][^\]］】]*\p{L}[^\]］】]*[\]］】]/u;
/** Template filler that is never a business's own words. */
export const SAMPLE_TEXT = /lorem ipsum|dolor sit amet/i;

/** Fields that are never shown as words: addresses, names of icons, colours, kinds and Studio's own layer names. */
export const NOT_SHOWN = /^(id|type|source|layout|slug|page_slug|screen|icon|icon_url|image_url|url|video_url|color|ring_color|background|dark_background|font|font_family|fit|align|shape|style|variant|size|ring|bind|pin|enter|press|loop|direction|kind|section|sort|indicator|platforms|visibility|code|heads|translations)$/;

/** Every text a customer can read in `value`, with where it is. A node's `name` is its layer's name in Studio, never shown. */
export function shownTexts(value: unknown, path: string, out: { path: string; text: string }[] = []): { path: string; text: string }[] {
  if (typeof value === "string") {
    out.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => shownTexts(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    const isNode = typeof (value as { type?: unknown }).type === "string" && "id" in value;
    for (const [key, v] of Object.entries(value)) {
      if (NOT_SHOWN.test(key) || key.endsWith("_url") || (isNode && key === "name")) continue;
      shownTexts(v, `${path}.${key}`, out);
    }
  }
  return out;
}

/** Whether `text` is a placeholder or template filler. */
export function isPlaceholderText(text: string): boolean {
  return PLACEHOLDER.test(text) || SAMPLE_TEXT.test(text);
}

/** A node's own fields, without its children and its card (they are nodes of their own). */
function ownPart(node: StudioNode): Record<string, unknown> {
  const own: Record<string, unknown> = { ...(node as unknown as Record<string, unknown>) };
  delete own.children;
  delete own.card;
  return own;
}

/** Each text the customer reads on `app`, with its page and element. */
function textsOf(app: CheckedApp): { page: string | null; element: string | null; path: string; text: string }[] {
  const nav = app.navigation as { tabs?: { id: string }[]; more?: { id: string }[]; menu?: { id: string }[] };
  const out: { page: string | null; element: string | null; path: string; text: string }[] = [];
  for (const [list, entries] of [["tab", nav.tabs], ["more", nav.more], ["menu", nav.menu]] as const) {
    for (const entry of entries ?? []) for (const t of shownTexts(entry, `GET /pages ${list} ${entry.id}`)) out.push({ page: null, element: `${list}:${entry.id}`, ...t });
  }
  for (const page of app.pages) {
    if (!page.studio) continue;
    const title = (page.result.body as { title?: unknown } | undefined)?.title;
    for (const t of shownTexts({ title }, `/pages/${page.slug}`)) out.push({ page: page.slug, element: null, ...t });
    if (page.studio.header) for (const t of shownTexts(page.studio.header, `/pages/${page.slug} header`)) out.push({ page: page.slug, element: "header", ...t });
    for (const { node, path } of nodesOf(page.studio)) {
      for (const t of shownTexts(ownPart(node), `/pages/${page.slug} ${path}`)) out.push({ page: page.slug, element: node.id, ...t });
    }
  }
  return out;
}

/** Placeholders and template filler the customer would read (error). `allowed`: texts shown on purpose. */
export function placeholderProblems(app: CheckedApp, allowed: ReadonlySet<string> = new Set()): AppProblem[] {
  return textsOf(app)
    .filter(({ text }) => isPlaceholderText(text) && !allowed.has(text))
    .map(({ page, element, path, text }) => problem("placeholder", { lang: app.lang, page, element, path }, { text }));
}

// ——— Taps ———

export interface Tap {
  page: string | null;
  element: string | null;
  where: string;
  action: Action | null | undefined;
  /** Whether the element is drawn as something to tap (a button, a story, a slide's button), so a missing action is a dead tap. */
  tappable: boolean;
}

/** Every tap of `app`: the tabs, More and the menu, then each page's elements, their entries and slides. */
export function tapsOf(app: CheckedApp): Tap[] {
  const taps: Tap[] = [];
  const nav = app.navigation as { tabs?: { id: string; target: Action }[]; more?: { id: string; target: Action }[]; menu?: { id: string; target: Action }[] };
  for (const [list, entries] of [["tab", nav.tabs], ["more", nav.more], ["menu", nav.menu]] as const) {
    for (const t of entries ?? []) taps.push({ page: null, element: `${list}:${t.id}`, where: `GET /pages ${list} ${t.id}`, action: t.target, tappable: true });
  }
  for (const page of app.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const at = `/pages/${page.slug} ${path}`;
      const base = { page: page.slug, element: node.id };
      const n = node as StudioNode & { items?: { id: string; action?: Action }[]; slides?: { action?: Action | null; heading?: string | null; label?: string | null }[]; entries?: { action?: Action | null }[] };
      if (n.action !== undefined || n.type === "button" || n.type === "cta_bar") taps.push({ ...base, where: at, action: n.action, tappable: n.type === "button" || n.type === "cta_bar" });
      n.items?.forEach((item, i) => taps.push({ ...base, where: `${at} items[${i}] ${item.id}`, action: item.action, tappable: true }));
      // A story opens its viewer, whose button follows the story's action; a slide with a button, its action.
      n.slides?.forEach((slide, i) => taps.push({ ...base, where: `${at} slides[${i}] ${JSON.stringify(slide.heading ?? slide.label ?? "")}`, action: slide.action, tappable: n.type === "stories" || Boolean(slide.label) }));
      n.entries?.forEach((entry, i) => {
        if (entry.action !== undefined) taps.push({ ...base, where: `${at} entries[${i}]`, action: entry.action, tappable: false });
      });
    }
  }
  return taps;
}

/**
 * The store's entries as read for the check. `complete`: whether a source's
 * list is all of them (Studio's inspector reads up to 50), so an entry not in
 * it is surely not the store's.
 */
const PICKABLE_LIMIT = 50;

const URL_ACTION = /^(https?:\/\/[^\s/]+\.[^\s]+|tel:\+?\d+|mailto:\S+@\S+|sms:\+?\d+|whatsapp:\S+)$/;

/** Taps that open nothing, or something that isn't there (error). */
export function tapProblems(app: Pick<App, "appType" | "vertical" | "backend"> & Partial<Pick<App, "connector">>, served: CheckedApp, store: Pickable): AppProblem[] {
  const slugs = new Map(served.pages.map((page) => [page.slug, page.screen]));
  // A page drawn around a screen: one a tab opens, or one opened from them (a school's Family).
  const aroundable = new Set(pageScreenOptionsFor(app).map((s) => s.value));
  const sources = new Set<string>(itemSourcesFor(app));
  const list = (source: string) => (store.items as Record<string, { id: string }[] | undefined>)[source];
  // An entry is surely missing only when the list read is the whole of it.
  const missing = (source: string, id: string) => {
    const entries = list(source) ?? [];
    return entries.length < PICKABLE_LIMIT && !entries.some((e) => e.id === id);
  };
  const out: AppProblem[] = [];
  for (const { page, element, where, action, tappable } of tapsOf(served)) {
    const at = { lang: null, page, element, path: where };
    if (!action) {
      if (tappable) out.push(problem("dead_tap", at));
      continue;
    }
    // The served tabs also carry `more` (the More tab, GET /pages), beyond the stored ACTION_TYPES.
    switch (action.type as string) {
      case "page":
        if (!action.page_slug || !slugs.has(action.page_slug)) out.push(problem("tap_page", at, { target: action.page_slug ?? "" }));
        else if (slugs.get(action.page_slug) && !aroundable.has(slugs.get(action.page_slug)!)) out.push(problem("tap_screen", at, { target: slugs.get(action.page_slug)! }));
        break;
      case "screen":
        if (!appOpensScreen(app, action.screen)) out.push(problem("tap_screen", at, { target: String(action.screen ?? "") }));
        break;
      case "item":
        if (!action.item || !sources.has(action.item.source) || missing(action.item.source, action.item.id)) out.push(problem("tap_entry", at, { target: action.item ? `${action.item.source} ${action.item.id}` : "" }));
        break;
      case "course":
        if (!sources.has("courses") || missing("courses", String(action.course_id))) out.push(problem("tap_entry", at, { target: `courses ${action.course_id ?? ""}` }));
        break;
      case "url":
        if (!action.url || !URL_ACTION.test(action.url)) out.push(problem("tap_url", at, { target: action.url ?? "" }));
        break;
      // 167 Studio's Sign out: asked first, then signed out.
      case "sign_out":
        break;
      case "more":
        if (!where.startsWith("GET /pages tab")) out.push(problem("tap_unknown", at, { target: "more" }));
        break;
      default:
        out.push(problem("tap_unknown", at, { target: String((action as { type?: unknown }).type ?? "") }));
    }
  }
  return out;
}

/** Categories a page shows, or filters a list by, which the store hasn't (the app else opens an empty shop): error. */
export function categoryProblems(draft: Pick<LayoutContent, "pages">, served: CheckedApp, store: Pickable): AppProblem[] {
  const out: AppProblem[] = [];
  const known = (source: string) => new Set(((store.categories as Record<string, { id: string }[] | undefined>)[source] ?? []).map((c) => c.id));
  for (const page of draft.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const id = node.query?.category_id;
      if (node.type === "items" && !node.hidden && id && !known(node.source!).has(String(id))) out.push(problem("category", { lang: null, page: page.slug, element: node.id, path: `draft /pages/${page.slug} ${path}` }, { target: String(id) }));
    }
  }
  for (const page of served.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const cats = (node as { categories?: { id: string | number; name?: string }[] }).categories;
      if (node.type !== "categories" || !cats) continue;
      cats.forEach((c, i) => {
        if (!known(node.source!).has(String(c.id))) out.push(problem("category", { lang: null, page: page.slug, element: node.id, path: `/pages/${page.slug} ${path} categories[${i}]` }, { target: c.name ?? String(c.id) }));
      });
    }
  }
  return out;
}

// ——— Pages that don't load ———

/** A page the navigation lists that didn't load (error). */
export function pageLoadProblems(served: CheckedApp): AppProblem[] {
  return served.pages.filter((p) => p.result.status !== 200).map((p) => problem("page_load", { lang: served.lang, page: p.slug, element: null, path: `GET /pages/${p.slug}` }, { status: String(p.result.status) }));
}

// ——— Bound lists ———

/** The lists a draft binds to the store's entries: items and categories elements, not hidden, not the phone's own "lately viewed". */
export function boundLists(draft: Pick<LayoutContent, "pages">): { slug: string; node: StudioNode; path: string }[] {
  return draft.pages.flatMap((page) =>
    page.studio ? nodesOf(page.studio).filter(({ node }) => (node.type === "items" || node.type === "categories") && !node.hidden && !node.recent).map(({ node, path }) => ({ slug: page.slug, node, path })) : [],
  );
}

/**
 * A bound list the customer sees as an empty section (error): served with
 * nothing in it, or left out while its title stays (a title the servers keep
 * names its list with `heads`; a phone before 164 doesn't hide it, and one
 * without the mark stays whatever the phone).
 */
export function emptyListProblems(draft: Pick<LayoutContent, "pages">, served: CheckedApp): AppProblem[] {
  const out: AppProblem[] = [];
  for (const { slug, node, path } of boundLists(draft)) {
    const page = served.pages.find((pg) => pg.slug === slug);
    if (!page?.studio) continue;
    const nodes = nodesOf(page.studio);
    const shown = nodes.find(({ node: n }) => n.id === node.id)?.node as (StudioNode & { items?: unknown[]; categories?: unknown[] }) | undefined;
    const at = { lang: served.lang, page: slug, element: node.id, path: `/pages/${slug} ${path}` };
    const name = (node.name ?? "").trim();
    if (shown) {
      const entries = node.type === "items" ? shown.items : shown.categories;
      // A flash sale and the like fill `items` themselves; only a list whose entries were asked for and came back empty.
      if (Array.isArray(entries) && entries.length === 0) out.push(problem("empty_list", at, { name }));
      continue;
    }
    // Left out: its title must have gone with it.
    const title = nodes.find(({ node: n }) => (n as { heads?: string }).heads === node.id);
    if (title) out.push(problem("empty_list", { ...at, element: title.node.id }, { name }));
  }
  return out;
}

// ——— Prices ———

const AMOUNT = /^\d{1,12}(\.\d{1,3})?$/;
/** A price written out with its currency ("₺590.00", "EGP 450", "450 ج.م"). */
export const WRITTEN_PRICE = /(₺|\$|€|£|¥|\b(?:EGP|TRY|TL|USD|EUR|GBP|SAR|AED|KWD|QAR|BHD|OMR|JOD)\b|ج\.م|ر\.س|د\.إ)\s?\d|\d[\d.,]*\s?(₺|\b(?:EGP|TRY|TL|USD|EUR|SAR|AED|KWD)\b|ج\.م|ر\.س|د\.إ)/u;

interface PricedItem {
  id: string;
  title?: string | null;
  price_label?: string | null;
  sale?: Record<string, unknown> | null;
  price?: { amount?: unknown; currency?: unknown; display?: { currency?: unknown } | null } | null;
}

/**
 * An entry priced only as a text, with no amount and currency the app can
 * show in the customer's currency (error); and, with `customerCurrency`, one
 * without a price in it (the template guard asks for one). An element's own
 * words with a price written in them are a warning: they never convert.
 */
export function priceProblems(served: CheckedApp, customerCurrency?: string): AppProblem[] {
  const out: AppProblem[] = [];
  for (const page of served.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const where = `/pages/${page.slug} ${path}`;
      const at = { lang: served.lang, page: page.slug, element: node.id };
      for (const item of (node as { items?: PricedItem[] }).items ?? []) {
        if (!item.price_label && !item.sale && !item.price) continue;
        const price = item.price;
        if (!price || typeof price.amount !== "string" || !AMOUNT.test(price.amount) || typeof price.currency !== "string" || !/^[A-Z]{3}$/.test(price.currency)) {
          out.push(problem("price", { ...at, path: `${where} item ${item.id}` }, { text: String(item.price_label ?? item.sale?.now_formatted ?? ""), entry: item.title ?? item.id }));
        } else if (customerCurrency && price.currency !== customerCurrency && price.display?.currency !== customerCurrency) {
          out.push(problem("price", { ...at, path: `${where} item ${item.id}` }, { text: `${price.amount} ${price.currency}`, entry: item.title ?? item.id, currency: customerCurrency }));
        }
      }
      for (const field of ["text", "title", "label"] as const) {
        const text = (node as unknown as Record<string, unknown>)[field];
        if (typeof text === "string" && !node.bind && WRITTEN_PRICE.test(text)) out.push(problem("written_price", { ...at, path: `${where}.${field}` }, { text }));
      }
    }
  }
  return out;
}

// ——— Warnings: translations, template words, photos ———

/** Whether a text is words a language would translate: two words of letters at least, not a number, a code ("SFR 251") or a name in one word. */
function wordy(text: string): boolean {
  const words = text.trim().split(/\s+/);
  if (words.filter((w) => /\p{L}{2,}/u.test(w)).length < 2) return false;
  // A person's or a place's name ("Hannah Clarke", "Deniz Kaya") is the same in every language written in its letters.
  return !(words.length <= 3 && words.every((w) => /^\p{Lu}/u.test(w)));
}

/** An element's own texts, entry by entry, as one language's phone reads them. */
function ownTexts(node: StudioNode): Map<string, string> {
  const out = new Map<string, string>();
  const n = node as unknown as Record<string, unknown>;
  for (const field of ["text", "title", "subtitle", "label"]) if (typeof n[field] === "string") out.set(field, n[field] as string);
  for (const list of ENTRY_LISTS) {
    const entries = n[list];
    if (!Array.isArray(entries)) continue;
    entries.forEach((entry, i) => {
      for (const field of TRANSLATABLE_ENTRIES[list] as readonly string[]) {
        const v = (entry as Record<string, unknown> | null)?.[field];
        if (typeof v === "string") out.set(`${list}[${i}].${field}`, v);
      }
    });
  }
  return out;
}

/**
 * A text the phone in another of the app's languages reads in the main
 * language, word for word (warning): the owner wrote it, and nobody wrote
 * it in that language. Words bound to the store's entries are the store's;
 * the app's own name, numbers and one-word names never need translating.
 */
export function untranslatedProblems(main: CheckedApp, other: CheckedApp, appName?: string | null): AppProblem[] {
  if (main.lang === other.lang) return [];
  const out: AppProblem[] = [];
  const name = appName?.trim();
  for (const page of other.pages) {
    const mainPage = main.pages.find((p) => p.slug === page.slug);
    if (!page.studio || !mainPage?.studio) continue;
    const mainNodes = new Map(nodesOf(mainPage.studio).map(({ node }) => [node.id, node]));
    for (const { node, path } of nodesOf(page.studio)) {
      if (node.bind) continue;
      const before = mainNodes.get(node.id);
      if (!before) continue;
      const mine = ownTexts(before);
      for (const [field, text] of ownTexts(node)) {
        if (!wordy(text) || text.trim() === name || mine.get(field) !== text) continue;
        out.push(problem("untranslated", { lang: other.lang, page: page.slug, element: node.id, path: `/pages/${page.slug} ${path}.${field}` }, { text }));
      }
    }
  }
  return out;
}

// ——— A template's or a demo's own data where the business's belongs ———

/** A person's, a place's or a product's name in a template's words ("Hannah Clarke", "Forno Zamalek"), never its headings. */
function isSampleName(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return !text.includes("{") && !text.includes("[") && words.length >= 2 && words.length <= 3 && words.every((w) => /^\p{Lu}/u.test(w));
}
/** A coupon code ("FRESH15"). */
const SAMPLE_CODE = /^[A-Z]{3,}\d{1,3}$/;
/** A price in a template's words ("Delivery EGP 25", "from E£35"). */
const SAMPLE_PRICE = /\d/;
const SAMPLE_CURRENCY = /(£|\$|€|₺|\bEGP\b|E£|\bTL\b|\bSAR\b|\bAED\b|ج\.م|ر\.س|د\.إ)/u;

let samples: Set<string> | null = null;

/**
 * The sample values Yallapp's templates and demos write, in every language,
 * collected from their own words (never a list kept by hand): the people,
 * places, codes and prices in the templates' words (lib/studio/app-words.ts,
 * the same word in each language), the demos' facts (`DEMO_FACTS`, a line
 * each), and the demo apps' banner and welcome lines (lib/demo/content.ts).
 */
export function sampleValues(): ReadonlySet<string> {
  if (samples) return samples;
  const out = new Set<string>();
  const add = (text: unknown) => {
    if (typeof text !== "string") return;
    for (const line of text.split("\n")) if (line.trim().length >= 3) out.add(line.trim());
  };
  const en = APP_WORDS.en as Record<string, string>;
  // The templates' own headings and buttons: a demo's line that is one of them ("Where to?") is the template's copy, not its data.
  const copy = new Set<string>();
  for (const [key, text] of Object.entries(en)) {
    const sample = isSampleName(text) || SAMPLE_CODE.test(text.trim()) || (SAMPLE_PRICE.test(text) && SAMPLE_CURRENCY.test(text));
    for (const lang of ["en", "ar", "tr"] as const) {
      const form = (APP_WORDS[lang] as Record<string, string>)[key];
      if (sample) add(form);
      else if (typeof form === "string") for (const line of form.split("\n")) copy.add(line.trim());
    }
  }
  for (const facts of Object.values(DEMO_FACTS)) for (const forms of Object.values(facts ?? {})) for (const text of Object.values(forms ?? {})) add(text);
  for (const brand of Object.values(DEMO_BRANDS)) {
    add(brand.banner.heading);
    add(brand.banner.subheading);
    add(brand.welcome);
  }
  for (const line of copy) if (out.has(line) && !SAMPLE_CODE.test(line) && !(SAMPLE_PRICE.test(line) && SAMPLE_CURRENCY.test(line)) && !isSampleName(line)) out.delete(line);
  samples = out;
  return out;
}

/** The demos' names: never a business's own. */
function demoNames(): string[] {
  return [...new Set(["Leqaa", "لقاء", ...Object.values(DEMO_BRANDS).flatMap((b) => [b.appName, b.storeTitle])])];
}

/**
 * A template's or a demo's own data where the business's belongs (error): a
 * sample person, place, code or price, a demo's fact or its banner or
 * welcome line, as an element's own words (a whole text or one of its
 * lines). The store's entries (a sample product the owner keeps) are the
 * store's: 110's samples check covers them. Yallapp's demo apps are left alone.
 */
export function sampleDataProblems(app: { demo?: boolean }, served: CheckedApp): AppProblem[] {
  if (app.demo) return [];
  const known = sampleValues();
  const out: AppProblem[] = [];
  for (const t of textsOf(served)) {
    if (!t.text.trim() || /\.(items|categories)\[/.test(t.path)) continue;
    const hit = t.text.split("\n").map((l) => l.trim()).find((line) => known.has(line));
    if (hit) out.push(problem("sample_data", { lang: served.lang, page: t.page, element: t.element, path: t.path }, { text: hit }));
  }
  return out;
}

/**
 * A demo's name left in a business's app (warning): the owner should write
 * their own. Yallapp's demo apps themselves are left alone.
 */
export function templateWordProblems(app: Pick<App, "appName"> & { demo?: boolean }, served: CheckedApp): AppProblem[] {
  if (app.demo) return [];
  const own = app.appName?.trim() ?? "";
  const names = demoNames().filter((n) => n && n !== own && !own.includes(n));
  const known = sampleValues();
  const out: AppProblem[] = [];
  for (const t of textsOf(served)) {
    const text = t.text.trim();
    // The store's own entries are the store's; a sample value is sample_data's.
    if (!text || /\.(items|categories)\[/.test(t.path) || known.has(text)) continue;
    if (names.some((n) => new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(text))) out.push(problem("template_word", { lang: served.lang, ...t }, { text }));
  }
  return out;
}

// ——— A label left alone ———

/** Elements that only label or mark something: a short text, an icon, a divider. */
const LABEL_TYPES = new Set(["text", "icon", "divider", "spacer"]);

/**
 * A label or icon left alone once its placeholder value was dropped (error):
 * a row or column the template made with a [placeholder] value next to its
 * labels ("Deliver to" over "[Your address]" and a chevron), served without
 * that value and with only labels and icons left.
 */
export function labelAloneProblems(draft: Pick<LayoutContent, "pages">, served: CheckedApp): AppProblem[] {
  const out: AppProblem[] = [];
  for (const page of draft.pages) {
    const shownPage = served.pages.find((p) => p.slug === page.slug)?.studio;
    if (!page.studio || !shownPage) continue;
    const shown = new Map(nodesOf(shownPage).map(({ node, path }) => [node.id, { node, path }]));
    for (const { node } of nodesOf(page.studio)) {
      const kids = node.children ?? [];
      const placeholders = kids.filter((c) => ["text", "title"].some((f) => typeof (c as unknown as Record<string, unknown>)[f] === "string" && PLACEHOLDER.test((c as unknown as Record<string, string>)[f]!)));
      if (!placeholders.length) continue;
      const now = shown.get(node.id);
      if (!now) continue;
      // A list's title marked `heads` goes with its list on the phone (164): not left alone.
      const left = (now.node.children ?? []).filter((c) => !(c as { heads?: string }).heads);
      const dropped = placeholders.every((p) => !left.some((c) => c.id === p.id));
      if (dropped && left.length > 0 && left.every((c) => LABEL_TYPES.has(c.type))) {
        out.push(problem("label_alone", { lang: served.lang, page: page.slug, element: node.id, path: `/pages/${page.slug} ${now.path}` }, { text: left.map((c) => (c as { text?: string }).text ?? "").filter(Boolean).join(" ") }));
      }
    }
  }
  return out;
}

/** A photo element or a gallery's photo with no picture (warning): the app draws an empty frame. */
export function missingPhotoProblems(served: CheckedApp): AppProblem[] {
  const out: AppProblem[] = [];
  for (const page of served.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const at = { lang: served.lang, page: page.slug, element: node.id, path: `/pages/${page.slug} ${path}` };
      // A card's photo bound to its entry is the entry's.
      if (node.type === "image" && !node.bind && !(node as { image_url?: string | null }).image_url?.trim()) out.push(problem("missing_photo", at));
      if (node.type === "gallery" || node.type === "before_after") {
        const images = (node as { images?: { url?: string | null; image_url?: string | null }[] }).images ?? [];
        if (images.some((img) => !(img.url ?? img.image_url ?? "").trim())) out.push(problem("missing_photo", at));
      }
    }
  }
  return out;
}

// ——— Summing up ———

/** One key for a problem wherever it was found in each language: the same tap in en, ar and tr is one problem. */
export function problemKey(p: Pick<AppProblem, "rule" | "page" | "element" | "path" | "lang">): string {
  return `${p.rule}|${p.page ?? ""}|${p.element ?? ""}|${p.lang ?? ""}|${p.path}`;
}

/** The problems with each one once, errors first, then by page. */
export function sortedProblems(problems: readonly AppProblem[]): AppProblem[] {
  const seen = new Map<string, AppProblem>();
  for (const p of problems) if (!seen.has(problemKey(p))) seen.set(problemKey(p), p);
  return [...seen.values()].sort((a, b) => (a.severity === b.severity ? (a.page ?? "").localeCompare(b.page ?? "") : a.severity === "error" ? -1 : 1));
}
