import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { appOpensScreen, itemSourcesFor, pageScreenOptionsFor } from "@/lib/pages/sources";
import type { Action, LayoutContent, StudioNode, StudioPage } from "@/lib/pages/types";
import { updateNode } from "@/lib/studio/edit";
import { expectContract } from "./contract";
import {
  CUSTOMER_CURRENCY,
  GUARD_CASES,
  GUARD_LANGS,
  GUARD_NOW,
  guardProject,
  mainSlugs,
  nodesOf,
  pickable,
  publish,
  serve,
  withoutSamples,
  type GuardCase,
  type GuardLang,
  type GuardProject,
  type ServedApp,
} from "./support/template-guard";

/**
 * 166 The template guard: every Studio template and look, made into a
 * project the way an owner's is and read the way the phone reads it
 * (support/template-guard.ts), in English, Arabic and Turkish, must:
 *
 * - show the customer no bracketed placeholder or template sample;
 * - show the owner's edits in every language, unless the owner wrote that
 *   language's text themselves;
 * - open something real on every tap: a page that is served, a screen the
 *   app has, an entry or category the store has (else the shop), never
 *   nothing (the app then stays put or goes Home);
 * - serve every list bound to the store's entries filled while the store has
 *   entries, and leave it out while it has none;
 * - give every price as an amount and a currency the app can show in the
 *   customer's currency, never only a text in the shop's;
 * - and answer as docs/api/openapi.yaml says.
 *
 * Several of these fail until roadmap 156, 157, 161, 163, 164 and 165 land:
 * docs/qa/2026-11-18-guard/NOTES.md lists each failure and the fix it waits
 * for. They are never skipped or loosened to pass.
 */

// The clock at the guard's own time: what the samples date from "now" (a flash sale's end) is the same every run.
vi.useFakeTimers({ toFake: ["Date"], now: GUARD_NOW });

vi.spyOn(console, "error").mockImplementation(() => undefined);

// ——— What the customer may never read ———

/** A bracketed placeholder ("[Customer name]", "[اسم العميل]"), with letters inside: the template asking the owner for their own words. */
const PLACEHOLDER = /[[［【][^\]］】]*\p{L}[^\]］】]*[\]］】]/u;
/** Template filler that is never a business's own words. */
const SAMPLE_TEXT = /lorem ipsum|dolor sit amet/i;
/**
 * Texts a template shows the owner in Studio as samples on purpose, by
 * template: Studio's canvas only, never the served app, so none is allowed
 * in what this suite reads. Kept empty on purpose; a template that needs one
 * names the exact text here with the reason.
 */
const STUDIO_ONLY_SAMPLES: Readonly<Record<string, readonly string[]>> = {};

/** Fields that are never shown as words: addresses, names of icons, colours, kinds and Studio's own layer names. */
const NOT_SHOWN = /^(id|type|source|layout|slug|page_slug|screen|icon|icon_url|image_url|url|video_url|color|ring_color|background|dark_background|font|font_family|fit|align|shape|style|variant|size|ring|bind|pin|enter|press|loop|direction|kind|section|sort|indicator|platforms|visibility|code)$/;

/** Every text a customer can read in `value`, with where it is. A node's `name` is its layer's name in Studio, never shown. */
function shownTexts(value: unknown, path: string, out: { path: string; text: string }[] = []): { path: string; text: string }[] {
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

function placeholdersIn(app: ServedApp, template: string): string[] {
  const allowed = new Set(STUDIO_ONLY_SAMPLES[template] ?? []);
  const texts = [
    ...shownTexts({ tabs: app.navigation.tabs, more: app.navigation.more, menu: app.navigation.menu, pages: app.navigation.pages }, "GET /pages"),
    ...app.pages.flatMap((page) => (page.studio ? shownTexts({ title: (page.result.body as { title?: unknown }).title, header: page.studio.header, body: page.studio.body }, `/pages/${page.slug}`) : [])),
  ];
  return texts.filter(({ text }) => (PLACEHOLDER.test(text) || SAMPLE_TEXT.test(text)) && !allowed.has(text)).map(({ path, text }) => `${path}: ${JSON.stringify(text)}`);
}

// ——— Taps ———

interface Tap {
  where: string;
  action: Action | null | undefined;
  /** Whether the element is drawn as something to tap (a button, a story, a slide's button), so a missing action is a dead tap. */
  tappable: boolean;
}

function tapsOf(app: ServedApp): Tap[] {
  const taps: Tap[] = [];
  const nav = app.navigation as { tabs?: { id: string; target: Action }[]; more?: { id: string; target: Action }[]; menu?: { id: string; target: Action }[] };
  for (const [list, entries] of [["tab", nav.tabs], ["more", nav.more], ["menu", nav.menu]] as const) {
    for (const t of entries ?? []) taps.push({ where: `GET /pages ${list} ${t.id}`, action: t.target, tappable: true });
  }
  for (const page of app.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const at = `/pages/${page.slug} ${path}`;
      const n = node as StudioNode & { items?: { id: string; action?: Action }[]; slides?: { action?: Action | null; heading?: string | null; label?: string | null }[]; entries?: { action?: Action | null }[] };
      if (n.action !== undefined || n.type === "button" || n.type === "cta_bar") taps.push({ where: at, action: n.action, tappable: n.type === "button" || n.type === "cta_bar" });
      n.items?.forEach((item, i) => taps.push({ where: `${at} items[${i}] ${item.id}`, action: item.action, tappable: true }));
      // A story opens its viewer, whose button follows the story's action; a slide with a button, its action.
      n.slides?.forEach((slide, i) => taps.push({ where: `${at} slides[${i}] ${JSON.stringify(slide.heading ?? slide.label ?? "")}`, action: slide.action, tappable: n.type === "stories" || Boolean(slide.label) }));
      n.entries?.forEach((entry, i) => {
        if (entry.action !== undefined) taps.push({ where: `${at} entries[${i}]`, action: entry.action, tappable: false });
      });
    }
  }
  return taps;
}

function tapProblems(p: GuardProject, app: ServedApp, store: Pickable): string[] {
  const slugs = new Map(app.pages.map((page) => [page.slug, page.screen]));
  // A page drawn around a screen: one a tab opens, or one opened from them (a school's Family).
  const aroundable = new Set(pageScreenOptionsFor(p.app).map((s) => s.value));
  const sources = new Set<string>(itemSourcesFor(p.app));
  const has = (source: string, id: string) => (store.items as Record<string, { id: string }[] | undefined>)[source]?.some((e) => e.id === id) ?? false;
  const problems: string[] = [];
  for (const { where, action, tappable } of tapsOf(app)) {
    if (!action) {
      if (tappable) problems.push(`${where}: drawn to be tapped but opens nothing`);
      continue;
    }
    // The served tabs also carry `more` (the More tab, GET /pages), beyond the stored ACTION_TYPES.
    switch (action.type as string) {
      case "page":
        if (!action.page_slug || !slugs.has(action.page_slug)) problems.push(`${where}: opens page "${action.page_slug}", which isn't served (the app goes Home)`);
        else if (slugs.get(action.page_slug) && !aroundable.has(slugs.get(action.page_slug)!)) problems.push(`${where}: opens page "${action.page_slug}" drawn around "${slugs.get(action.page_slug)}", a screen this app hasn't`);
        break;
      case "screen":
        if (!appOpensScreen(p.app, action.screen)) problems.push(`${where}: opens screen "${action.screen}", which a ${p.app.appType} app hasn't`);
        break;
      case "item":
        if (!action.item || !sources.has(action.item.source)) problems.push(`${where}: opens ${action.item?.source ?? "no"} entry ${action.item?.id ?? ""}, a list this app doesn't serve`);
        else if (!has(action.item.source, action.item.id)) problems.push(`${where}: opens ${action.item.source} ${action.item.id}, which the store hasn't`);
        break;
      case "course":
        if (!sources.has("courses") || !has("courses", String(action.course_id))) problems.push(`${where}: opens course ${action.course_id}, which the academy hasn't`);
        break;
      case "url":
        if (!action.url || !/^(https?:\/\/[^\s/]+\.[^\s]+|tel:\+?\d+|mailto:\S+@\S+|sms:\+?\d+|whatsapp:\S+)$/.test(action.url)) problems.push(`${where}: opens the address ${JSON.stringify(action.url)}, which isn't one`);
        break;
      // 167 Studio's Sign out element: the app asks, then signs the person out (docs/api/openapi.yaml Action).
      case "sign_out":
        break;
      case "more":
        if (!where.startsWith("GET /pages tab")) problems.push(`${where}: a More action outside the tabs opens nothing`);
        break;
      default:
        problems.push(`${where}: an action of type ${JSON.stringify((action as { type?: unknown }).type)} the app doesn't know`);
    }
  }
  return problems;
}

/** Categories a page shows or filters a list by, which the store must have (the app else opens an empty shop). */
function categoryProblems(p: GuardProject, app: ServedApp, store: Pickable): string[] {
  const problems: string[] = [];
  const known = (source: string) => new Set(((store.categories as Record<string, { id: string }[] | undefined>)[source] ?? []).map((c) => c.id));
  for (const page of p.draft.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const id = node.query?.category_id;
      if (node.type === "items" && !node.hidden && id && !known(node.source!).has(String(id))) problems.push(`draft /pages/${page.slug} ${path}: lists ${node.source} of category ${id}, which the store hasn't`);
    }
  }
  for (const page of app.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const cats = (node as { categories?: { id: string | number; name?: string }[] }).categories;
      if (node.type !== "categories" || !cats) continue;
      cats.forEach((c, i) => {
        if (!known(node.source!).has(String(c.id))) problems.push(`/pages/${page.slug} ${path} categories[${i}] ${c.name ?? ""}: category ${c.id}, which the store hasn't`);
      });
    }
  }
  return problems;
}

// ——— Bound lists ———

/** The lists a draft binds to the store's entries: items and categories elements, not hidden, not the phone's own "lately viewed". */
function boundLists(draft: LayoutContent): { slug: string; node: StudioNode; path: string }[] {
  return draft.pages.flatMap((page) =>
    page.studio ? nodesOf(page.studio).filter(({ node }) => (node.type === "items" || node.type === "categories") && !node.hidden && !node.recent).map(({ node, path }) => ({ slug: page.slug, node, path })) : [],
  );
}

function listProblems(p: GuardProject, app: ServedApp, store: Pickable): string[] {
  const problems: string[] = [];
  for (const { slug, node, path } of boundLists(p.draft)) {
    const source = node.source!;
    const entries = node.type === "items" ? (store.items as Record<string, unknown[] | undefined>)[source] : (store.categories as Record<string, unknown[] | undefined>)[source];
    const storeHas = (entries?.length ?? 0) > 0;
    const page = app.pages.find((pg) => pg.slug === slug);
    const served = page?.studio ? nodesOf(page.studio).find(({ node: n }) => n.id === node.id)?.node : undefined;
    const shown = served ? ((served as { items?: unknown[]; categories?: unknown[] })[node.type === "items" ? "items" : "categories"] ?? []) : null;
    const where = `/pages/${slug} ${path} (${node.type} of ${source})`;
    if (storeHas && shown === null) problems.push(`${where}: left out though the store has ${entries!.length}`);
    else if (storeHas && shown!.length === 0) problems.push(`${where}: served empty though the store has ${entries!.length}`);
    else if (!storeHas && shown !== null) problems.push(`${where}: shown ${shown.length ? "with entries" : "empty"} though the store has none`);
  }
  return problems;
}

// ——— Prices ———

const AMOUNT = /^\d{1,12}(\.\d{1,3})?$/;
/** A price written out with its currency ("₺590.00", "EGP 450", "450 ج.م"). */
const WRITTEN_PRICE = /(₺|\$|€|£|¥|\b(?:EGP|TRY|TL|USD|EUR|GBP|SAR|AED|KWD|QAR|BHD|OMR|JOD)\b|ج\.م|ر\.س|د\.إ)\s?\d|\d[\d.,]*\s?(₺|\b(?:EGP|TRY|TL|USD|EUR|SAR|AED|KWD)\b|ج\.م|ر\.س|د\.إ)/u;

interface PricedItem {
  price_label?: string | null;
  sale?: Record<string, unknown> | null;
  price?: { amount?: unknown; currency?: unknown; display?: { currency?: unknown } | null } | null;
}

function priceProblems(app: ServedApp): string[] {
  const problems: string[] = [];
  for (const page of app.pages) {
    if (!page.studio) continue;
    for (const { node, path } of nodesOf(page.studio)) {
      const where = `/pages/${page.slug} ${path}`;
      const items = (node as { items?: (PricedItem & { id: string })[] }).items ?? [];
      for (const item of items) {
        if (!item.price_label && !item.sale && !item.price) continue;
        const price = item.price;
        if (!price || typeof price.amount !== "string" || !AMOUNT.test(price.amount) || typeof price.currency !== "string" || !/^[A-Z]{3}$/.test(price.currency)) {
          problems.push(`${where} item ${item.id}: priced only as ${JSON.stringify(item.price_label ?? item.sale?.now_formatted)}, with no amount and currency the app can convert`);
        } else if (price.currency !== CUSTOMER_CURRENCY && price.display?.currency !== CUSTOMER_CURRENCY) {
          problems.push(`${where} item ${item.id}: ${price.amount} ${price.currency} with no price in the customer's ${CUSTOMER_CURRENCY}`);
        }
      }
      // An element's own words with a price written in them (not a card's text bound to its entry's price).
      for (const field of ["text", "title", "label"] as const) {
        const text = (node as unknown as Record<string, unknown>)[field];
        if (typeof text === "string" && !node.bind && WRITTEN_PRICE.test(text)) problems.push(`${where}.${field}: a price written as text, ${JSON.stringify(text)}`);
      }
    }
  }
  return problems;
}

// ——— The owner's edits ———

interface Edit {
  slug: string;
  id: string;
  field: string;
  /** For an entry's edit: the list and the entry's index. */
  list?: "entries" | "slides";
  index?: number;
  text: string;
  /** The owner's own Arabic, written after the English. */
  ownArabic?: string;
}

const TRANSLATED_TEXT = ["text", "title"] as const;
const ENTRY_TEXT = { entries: ["title", "text", "subtitle", "label"], slides: ["heading", "subheading", "label"] } as const;

/**
 * The edits an owner makes in the default language on each page: a text
 * the template translated, an entry it translated, and one more text whose
 * Arabic the owner then writes themselves. Only elements the phone is
 * served in English are edited.
 */
function editsFor(p: GuardProject, en: ServedApp): Edit[] {
  const edits: Edit[] = [];
  for (const page of p.draft.pages) {
    if (!page.studio) continue;
    const served = en.pages.find((pg) => pg.slug === page.slug)?.studio;
    if (!served) continue;
    const servedIds = new Set(nodesOf(served).map(({ node }) => node.id));
    const nodes = nodesOf(page.studio).map(({ node }) => node).filter((n) => servedIds.has(n.id) && !n.bind);
    const texts = nodes.flatMap((n) => TRANSLATED_TEXT.filter((f) => typeof n[f] === "string" && n[f] && n.translations?.ar?.[f] && n.translations?.tr?.[f]).map((f) => ({ id: n.id, field: f })));
    const tag = page.slug.replace(/[^a-z0-9]/g, "");
    if (texts[0]) edits.push({ slug: page.slug, ...texts[0], text: `Owner words ${tag} one` });
    if (texts[1]) edits.push({ slug: page.slug, ...texts[1], text: `Owner words ${tag} two`, ownArabic: `كلمات المالك ${tag}` });
    entry: for (const n of nodes) {
      for (const list of ["entries", "slides"] as const) {
        const items = (n[list] ?? []) as { translations?: Record<string, Record<string, string>> }[];
        for (let i = 0; i < items.length; i++) {
          const field = ENTRY_TEXT[list].find((f) => typeof (items[i] as Record<string, unknown>)[f] === "string" && items[i]!.translations?.ar?.[f] && items[i]!.translations?.tr?.[f]);
          if (field) {
            edits.push({ slug: page.slug, id: n.id, field, list, index: i, text: `Owner entry ${tag}` });
            break entry;
          }
        }
      }
    }
  }
  return edits;
}

/** The draft with the edits, made as Studio's inspector makes them (`updateNode` with the element's new words). */
function edited(draft: LayoutContent, edits: readonly Edit[]): LayoutContent {
  const pages = draft.pages.map((page) => {
    if (!page.studio) return page;
    let studio: StudioPage = page.studio;
    for (const e of edits.filter((x) => x.slug === page.slug)) {
      const node = nodesOf(studio).find(({ node: n }) => n.id === e.id)!.node;
      if (e.list) {
        const list = [...((node[e.list] ?? []) as Record<string, unknown>[])];
        list[e.index!] = { ...list[e.index!], [e.field]: e.text };
        studio = updateNode(studio, e.id, { [e.list]: list } as Partial<StudioNode>);
      } else {
        studio = updateNode(studio, e.id, { [e.field]: e.text } as Partial<StudioNode>);
      }
      // Then, in Arabic, the owner's own words for it.
      if (e.ownArabic) {
        const now = nodesOf(studio).find(({ node: n }) => n.id === e.id)!.node;
        studio = updateNode(studio, e.id, { translations: { ...(now.translations ?? {}), ar: { ...(now.translations?.ar ?? {}), [e.field]: e.ownArabic } } } as Partial<StudioNode>);
      }
    }
    return { ...page, studio };
  });
  return { ...draft, pages };
}

function editProblems(app: ServedApp, edits: readonly Edit[]): string[] {
  const problems: string[] = [];
  for (const e of edits) {
    const page = app.pages.find((pg) => pg.slug === e.slug)?.studio;
    const node = page ? nodesOf(page).find(({ node: n }) => n.id === e.id)?.node : undefined;
    const where = `/pages/${e.slug} ${e.id}${e.list ? ` ${e.list}[${e.index}]` : ""}.${e.field}`;
    if (!node) {
      problems.push(`${where}: no longer served after the owner's edit`);
      continue;
    }
    const value = e.list ? ((node[e.list] as Record<string, unknown>[] | undefined)?.[e.index!]?.[e.field] as string | undefined) : (node[e.field as "text"] as string | undefined);
    const expected = e.ownArabic && app.lang === "ar" ? e.ownArabic : e.text;
    if (value !== expected) problems.push(`${where}: shows ${JSON.stringify(value)}, not the owner's ${JSON.stringify(expected)}`);
  }
  return problems;
}

// ——— The suite ———

/** Every problem found, by template and check: written to YALLAPP_GUARD_REPORT when set (docs/qa/2026-11-18-guard/NOTES.md is made from it). */
const report: { template: string; kind: string; check: string; problems: string[] }[] = [];
afterAll(() => {
  if (process.env.YALLAPP_GUARD_REPORT) writeFileSync(process.env.YALLAPP_GUARD_REPORT, JSON.stringify(report, null, 1));
});

/** Expects no problems, each one shown in full when there are. */
function expectNone(c: GuardCase, check: string, problems: string[]): void {
  if (problems.length) report.push({ template: c.template.id, kind: c.kind.id, check, problems });
  expect(problems.join("\n")).toBe("");
}

function label(c: GuardCase): string {
  return `${c.template.id}${c.template.look ? ` (look ${c.template.look})` : ""} on a ${c.kind.id} project`;
}

describe.each(GUARD_CASES.map((c) => [label(c), c] as const))("166 template guard: %s", (_name, c) => {
  let p: GuardProject;
  let store: Pickable;
  const served = {} as Record<GuardLang, ServedApp>;

  beforeAll(async () => {
    p = await guardProject(c);
    store = await pickable(p);
    for (const lang of GUARD_LANGS) served[lang] = await serve(p, lang);
  });

  it("answers GET /pages and every page as docs/api/openapi.yaml says, with Home among them", () => {
    for (const lang of GUARD_LANGS) {
      expectContract("GET", "/pages", served[lang].navigationResult);
      for (const page of served[lang].pages) expectContract("GET", "/pages/{slug}", page.result);
      expect(mainSlugs(served[lang])).toContain("home");
    }
  });

  it.each(GUARD_LANGS)("shows no placeholder or template sample in %s", (lang) => {
    expectNone(c, `placeholders ${lang}`, placeholdersIn(served[lang], c.template.id));
  });

  it("opens something real on every tap: a served page, a screen the app has, an entry or category the store has", () => {
    expectNone(c, "taps", [...tapProblems(p, served.en, store), ...categoryProblems(p, served.en, store)]);
  });

  it.each(GUARD_LANGS)("serves every bound list filled while the store has entries, in %s", (lang) => {
    expectNone(c, `lists ${lang}`, listProblems(p, served[lang], store));
  });

  it("gives every price as an amount and currency the app shows in the customer's currency", () => {
    expectNone(c, "prices", GUARD_LANGS.flatMap((lang) => priceProblems(served[lang]).map((x) => `${lang} ${x}`)));
  });

  it("shows the owner's edits in Arabic and Turkish, and the owner's own Arabic where they wrote it", async () => {
    const own = await guardProject(c);
    const edits = editsFor(own, await serve(own, "en"));
    // Every template with words of its own gives the owner something to edit.
    if (c.template.id !== "blank") expect(edits.length, "texts the template translated").toBeGreaterThan(0);
    await publish(own, edited(own.draft, edits));
    const problems: string[] = [];
    for (const lang of GUARD_LANGS) problems.push(...editProblems(await serve(own, lang), edits).map((x) => `${lang} ${x}`));
    expectNone(c, "edits", problems);
  });

  it("leaves every bound list out once the store has no entries of its own", async () => {
    const empty = await guardProject(c);
    await withoutSamples(empty);
    const none = await pickable(empty);
    const problems: string[] = [];
    for (const lang of GUARD_LANGS) problems.push(...listProblems(empty, await serve(empty, lang), none).map((x) => `${lang} ${x}`));
    expectNone(c, "lists without entries", problems);
  });
});

describe("166 the guard covers every template", () => {
  it("has a case for each Studio template and Signature look, each on a kind that lists it", () => {
    expect(GUARD_CASES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(GUARD_CASES.map((c) => c.template.id)).size).toBe(GUARD_CASES.length);
    expect(GUARD_CASES.filter((c) => c.template.look).length).toBeGreaterThanOrEqual(18);
    expect(GUARD_CASES.some((c) => c.template.id === "flowers_signature_a")).toBe(true);
  });

  it("finds a bracketed placeholder in each of Studio's languages", () => {
    for (const text of ["[Customer name]", "[اسم العميل]", "[رأي أحد العملاء فيك]", "[Müşteri adı]", "Order before [your cut-off time]"]) expect(PLACEHOLDER.test(text), text).toBe(true);
    for (const text of ["Blush Garden", "2 / 5", "[1]", "Order today"]) expect(PLACEHOLDER.test(text), text).toBe(false);
  });

  it("knows a price written as text", () => {
    for (const text of ["₺590.00", "EGP 450", "450 ج.م", "$12.40"]) expect(WRITTEN_PRICE.test(text), text).toBe(true);
    for (const text of ["Free delivery over 2 km", "Open 24/7", "Top 10"]) expect(WRITTEN_PRICE.test(text), text).toBe(false);
  });
});
