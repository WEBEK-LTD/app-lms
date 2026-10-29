import { mapTreeAsync } from "../../studio/tree";
import { ENGINES, isAppType } from "../../app/kinds";
import type { App, HostedUser } from "../../data/types";
import { servedLayout } from "../../pages/layout";
import { etagValues } from "../../pages/plugin";
import { itemSourcesFor } from "../../pages/sources";
import { pickLanguage, translated, translatedBlock } from "../../pages/translate";
import { ENTRY_LISTS, type EntryList, type ItemSource, type ItemsQuery, type LanguageCode, type Layout, type LayoutBlock, type LayoutTab, type StudioNode, type StudioPage } from "../../pages/types";
import { ConnectorError, type Connector } from "../connectors/types";
import type { HostedContext, HostedRequest, HostedResult } from "../service";
import { durationLabel, itemWords } from "./item-words";
import { itemResolver, type Item } from "./items";
import "./sources";

/**
 * GET /pages and GET /pages/{slug} on the hosted API (roadmap 10.6): the
 * published layout (or the default pages for the app type before the first
 * publish), in the language the app asks for, with lists filled from the
 * app's connector (courses, products, services) or the platform's own data
 * (`registerItemSource`). Blocks the app can't be served are left out.
 */

const VARY = { vary: "Accept-Language" };
const SLUG = /^[a-z0-9-]{1,64}$/;

interface PageContext {
  ctx: HostedContext;
  user: HostedUser | null;
  platform: "android" | "ios";
  lang: LanguageCode;
  layout: Layout;
}

export async function handlePages(ctx: HostedContext, req: HostedRequest, user: HostedUser | null): Promise<HostedResult | null> {
  if (req.method !== "GET" || req.path[0] !== "pages" || req.path.length > 2) return null;
  const platform = req.query.get("platform");
  if (platform !== "android" && platform !== "ios") return { status: 400, body: { code: "invalid_request", message: "Unknown platform." } };
  const slug = req.path[1];
  if (slug !== undefined && !SLUG.test(slug)) return { status: 400, body: { code: "invalid_request", message: "This page address isn't valid." } };
  // 17 A draft preview gets the Pages & look draft.
  const layout = await servedLayout(ctx.store, ctx.app, ctx.plan ?? null, { draft: Boolean(ctx.preview?.draft), now: ctx.now });
  const lang = pickLanguage(req.headers?.get("accept-language"), layout.languages);
  if (slug === undefined) return navigation(layout, lang, req);
  const page = layout.pages.find((p) => p.slug === slug);
  if (!page) return { status: 404, body: { code: "not_found", message: "This page doesn't exist." }, headers: VARY };
  const pc: PageContext = { ctx, user, platform, lang, layout };
  const blocks: unknown[] = [];
  for (const block of page.blocks) {
    const resolved = await resolveBlock(pc, block);
    if (resolved) blocks.push(resolved);
  }
  const text = translated(page, lang, layout.languages.default);
  // 103R A Studio page: its texts in the language asked for and its lists filled.
  const studio = page.studio ? await servedStudio(pc, page.studio) : null;
  return {
    status: 200,
    body: {
      slug: page.slug,
      title: text.title,
      updated_at: page.updated_at,
      show_title: page.show_title,
      // 99.3 Its background and the picture across its top.
      ...(page.background ? { background: page.background } : {}),
      ...(page.header_image_url ? { header_image_url: page.header_image_url } : {}),
      blocks,
      ...(studio ? { studio } : {}),
    },
    headers: VARY,
  };
}

/**
 * 103R A Studio page as the app gets it (`StudioPage`): each text in the
 * language asked for; an items element filled like the items block and a
 * categories element like the categories block, without their queries, and
 * left out when their source can't be served.
 */
async function servedStudio(pc: PageContext, studio: StudioPage): Promise<StudioPage> {
  const def = pc.layout.languages.default;
  const body = await mapTreeAsync(studio.body, async (node) => {
    // 107.2 A hidden element stays in the editor only.
    if (node.hidden) return null;
    const { query, translations: _t, ...shown } = translated(node, pc.lang, def);
    void _t;
    if (node.type === "items") {
      const list = (await resolveBlock(pc, { id: node.id, type: "items", visibility: "everyone", title: null, source: node.source, layout: node.layout, query })) as { items?: unknown[] } | null;
      return list?.items ? ({ ...shown, items: list.items } as StudioNode) : null;
    }
    if (node.type === "categories") {
      const list = (await resolveBlock(pc, { id: node.id, type: "categories", visibility: "everyone", title: null, source: node.source })) as { categories?: unknown[] } | null;
      return list?.categories ? ({ ...shown, categories: list.categories } as StudioNode) : null;
    }
    return shown as StudioNode;
  });
  const header = studio.header ? (({ translations: _h, ...rest }) => (void _h, rest))(translated(studio.header, pc.lang, def)) : studio.header;
  return { ...studio, ...(header !== undefined ? { header } : {}), body: body ?? studio.body };
}

/** A tab or a side menu entry as the app gets it (`NavTab`): 82.5 with the owner's own icon. */
function navTab(tab: LayoutTab, lang: LanguageCode, def: LanguageCode) {
  const t = translated(tab, lang, def);
  return { id: t.id, label: t.label, icon: t.icon, ...(t.icon_url ? { icon_url: t.icon_url } : {}), target: t.target };
}

function navigation(layout: Layout, lang: LanguageCode, req: HostedRequest): HostedResult {
  const def = layout.languages.default;
  // Each language is its own version, so an app that switches language gets
  // the new texts instead of a 304 (the plugin does the same).
  const version = lang === def ? layout.version : `${layout.version}.${lang}`;
  const etag = `"${version}"`;
  if (etagValues(req.headers?.get("if-none-match") ?? null).includes(version)) {
    return { status: 304, headers: { ...VARY, etag } };
  }
  return {
    status: 200,
    body: {
      version,
      tabs: layout.tabs.map((tab) => navTab(tab, lang, def)),
      // 82.5 The side menu.
      menu: (layout.menu ?? []).map((entry) => navTab(entry, lang, def)),
      pages: layout.pages.map((page) => ({ slug: page.slug, title: translated(page, lang, def).title, updated_at: page.updated_at })),
    },
    headers: { ...VARY, etag },
  };
}

function visible(block: LayoutBlock, user: HostedUser | null): boolean {
  if (block.visibility === "signed_in") return user !== null;
  if (block.visibility === "signed_out") return user === null;
  return true;
}

/** 99.3 Whether the block shows now, on this platform and in this language (`LayoutBlock.show`). */
export function shownNow(show: LayoutBlock["show"], now: Date, platform: "android" | "ios", lang: LanguageCode): boolean {
  if (!show) return true;
  const time = now.getTime();
  if (show.from && Date.parse(show.from) > time) return false;
  if (show.until && Date.parse(show.until) <= time) return false;
  if (show.platforms?.length && !show.platforms.includes(platform)) return false;
  if (show.languages?.length && !show.languages.includes(lang)) return false;
  return true;
}

/** Whether the hosted API can fill lists and searches of this source for the app. */
function servable(app: App, connector: Connector | null | undefined, source: ItemSource | undefined): boolean {
  if (!source || !itemSourcesFor(app).includes(source)) return false;
  // The engine's own list, read from its connector (lib/app/kinds.ts); others (listings, posts) have their own resolvers.
  const engine = isAppType(app.appType) ? ENGINES[app.appType].pages : null;
  if (engine?.read && source === engine.source) return Boolean(connector);
  return itemResolver(source) !== null;
}

/** The block as the app gets it (`Block`), or null to leave it out. */
async function resolveBlock(pc: PageContext, block: LayoutBlock): Promise<Record<string, unknown> | null> {
  const { ctx, user } = pc;
  if (!visible(block, user) || !shownNow(block.show, ctx.now, pc.platform, pc.lang)) return null;
  // 33 With the texts of its entries (slides, quotes, ...) in the language too.
  const text = translatedBlock(block, pc.lang, pc.layout.languages.default);
  const { visibility: _v, show: _s, query, ...rest } = text;
  void _v;
  void _s;
  const out = withoutMissingActions(rest);
  try {
    switch (block.type) {
      // 33 A countdown that has ended goes, unless it says so.
      case "countdown": {
        const ends = Date.parse(block.ends_at ?? "");
        if (!Number.isFinite(ends)) return null;
        return ends <= ctx.now.getTime() && !out.ended_text ? null : out;
      }
      case "items": {
        if (!servable(ctx.app, ctx.connector, block.source) || !query) return null;
        const items = await listItems(pc, block.source!, query);
        if (!items || items.length === 0) return null;
        return { ...out, items: items.slice(0, 30) };
      }
      case "search":
        return servable(ctx.app, ctx.connector, block.source) ? out : null;
      case "categories": {
        if (!servable(ctx.app, ctx.connector, block.source)) return null;
        const categories = await listCategories(pc, block.source!);
        return categories && categories.length ? { ...out, style: block.style ?? "chips", categories } : null;
      }
      case "continue_learning": {
        if (!user || !ctx.connector || !isAppType(ctx.app.appType) || !ENGINES[ctx.app.appType].pages.blocks.includes("continue_learning")) return null;
        const course = await courseInProgress(pc);
        return course ? { ...out, course } : null;
      }
      default:
        return out;
    }
  } catch (e) {
    // A platform that can't be reached leaves its lists out, not the page.
    if (e instanceof ConnectorError) return null;
    throw e;
  }
}

/**
 * The block's fields without empty ones; missing actions are left out
 * (`Action` isn't nullable), also in its entries (33 slides, people).
 */
function withoutMissingActions(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || ((key === "action" || key === "see_all") && value === null)) continue;
    out[key] = Array.isArray(value) && ENTRY_LISTS.includes(key as EntryList) ? value.map((entry: Record<string, unknown>) => withoutMissingActions(entry)) : value;
  }
  return out;
}

/** A connector's answer to a GET, or null when it has none. */
async function get(pc: PageContext, path: string[], params: Record<string, string | number | null | undefined> = {}): Promise<Record<string, unknown> | null> {
  const { ctx } = pc;
  if (!ctx.connector) return null;
  const query = new URLSearchParams({ platform: pc.platform });
  for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
  const result = await ctx.connector.handle({ method: "GET", path, query, body: undefined, user: pc.user, now: ctx.now });
  if (!result || result.status !== 200 || !result.body || typeof result.body !== "object") return null;
  return result.body as Record<string, unknown>;
}

const list = (body: Record<string, unknown> | null): Record<string, unknown>[] =>
  Array.isArray(body?.items) ? (body.items as Record<string, unknown>[]).filter((i) => i && typeof i === "object") : [];

async function listItems(pc: PageContext, source: ItemSource, query: ItemsQuery): Promise<Item[] | null> {
  if (source === "courses") return listCourses(pc, query);
  if (source === "products") return listProducts(pc, query);
  if (source === "services") return listServices(pc, query);
  if (source === "articles") return listArticles(pc, query);
  const resolver = itemResolver(source);
  if (!resolver) return null;
  return resolver({ appId: pc.ctx.app.id, userId: pc.user ? String(pc.user.id) : null, lang: pc.lang, store: pc.ctx.store }, query);
}

const str = (value: unknown): string | null => (typeof value === "string" && value ? value : null);
const amount = (price: unknown): number => Number((price as { amount?: unknown } | null)?.amount ?? 0) || 0;

function courseItem(course: Record<string, unknown>, lang: LanguageCode): Item | null {
  const id = Number(course.id);
  if (!Number.isSafeInteger(id) || typeof course.title !== "string") return null;
  const price = (course.price ?? {}) as { is_free?: boolean; formatted?: string | null };
  return {
    source: "courses",
    id: String(id),
    title: course.title,
    subtitle: str((course.instructor as { name?: unknown } | undefined)?.name),
    image_url: str(course.image_url),
    // Display text only: there's never a purchase action in a list.
    // 38 In the app's language, like every word on a card.
    price_label: price.is_free ? itemWords(lang).free : str(price.formatted),
    badge: null,
    action: { type: "course", course_id: id },
  };
}

async function listCourses(pc: PageContext, query: ItemsQuery): Promise<Item[]> {
  let courses: Record<string, unknown>[];
  if (query.ids.length) {
    const found = await Promise.all(query.ids.filter((id) => /^\d{1,12}$/.test(id)).map((id) => get(pc, ["courses", id])));
    courses = found.filter((c): c is Record<string, unknown> => c !== null);
  } else {
    // Courses have no price order or featured flag in the app API: price orders are sorted here.
    const byPrice = query.sort === "price_asc" || query.sort === "price_desc";
    courses = list(
      await get(pc, ["courses"], {
        per_page: byPrice ? 50 : query.limit,
        category: query.category_id && /^\d+$/.test(query.category_id) ? query.category_id : null,
        orderby: query.sort === "popular" ? "popular" : "newest",
      }),
    );
    if (byPrice) courses.sort((a, b) => (query.sort === "price_asc" ? 1 : -1) * (amount(a.price) - amount(b.price)));
    courses = courses.slice(0, query.limit);
  }
  return courses.map((c) => courseItem(c, pc.lang)).filter((i): i is Item => i !== null);
}

function productItem(product: Record<string, unknown>, lang: LanguageCode): Item | null {
  const id = Number(product.id);
  if (!Number.isSafeInteger(id) || typeof product.name !== "string") return null;
  const price = (product.price ?? {}) as { formatted?: string; on_sale?: boolean };
  return {
    source: "products",
    id: String(id),
    title: product.name,
    subtitle: null,
    image_url: str(product.image_url),
    price_label: str(price.formatted),
    badge: product.stock_status === "out_of_stock" ? itemWords(lang).outOfStock : price.on_sale ? itemWords(lang).sale : null,
    action: { type: "item", item: { source: "products", id: String(id) } },
  };
}

async function listProducts(pc: PageContext, query: ItemsQuery): Promise<Item[]> {
  const ids = query.ids.filter((id) => /^\d{1,12}$/.test(id));
  const params = ids.length
    ? { ids: ids.join(","), per_page: Math.min(ids.length, 50) }
    : {
        per_page: query.limit,
        category: query.category_id && /^\d+$/.test(query.category_id) ? query.category_id : null,
        featured: query.featured ? "true" : null,
        orderby: query.sort,
      };
  if (query.ids.length && !ids.length) return [];
  return list(await get(pc, ["store", "products"], params))
    .slice(0, ids.length ? ids.length : query.limit)
    .map((p) => productItem(p, pc.lang))
    .filter((i): i is Item => i !== null);
}

function serviceItem(service: Record<string, unknown>, lang: LanguageCode): Item | null {
  const id = Number(service.id);
  if (!Number.isSafeInteger(id) || typeof service.name !== "string") return null;
  const price = (service.price ?? {}) as { formatted?: string; free?: boolean };
  const minutes = Number(service.duration_minutes);
  return {
    source: "services",
    id: String(id),
    title: service.name,
    // 38 "1 h" as on the service's own screen, not "60 min".
    subtitle: Number.isInteger(minutes) && minutes > 0 ? durationLabel(minutes, lang) : null,
    image_url: str(service.image_url),
    price_label: price.free ? itemWords(lang).free : str(price.formatted),
    badge: null,
    action: { type: "item", item: { source: "services", id: String(id) } },
  };
}

async function listServices(pc: PageContext, query: ItemsQuery): Promise<Item[]> {
  let services: Record<string, unknown>[];
  if (query.ids.length) {
    const found = await Promise.all(query.ids.filter((id) => /^\d{1,12}$/.test(id)).map((id) => get(pc, ["bookings", "services", id])));
    services = found.filter((s): s is Record<string, unknown> => s !== null);
  } else {
    // Services come in the business's order; price orders are sorted here.
    const byPrice = query.sort === "price_asc" || query.sort === "price_desc";
    services = list(
      await get(pc, ["bookings", "services"], {
        per_page: byPrice ? 50 : query.limit,
        category: query.category_id && /^\d+$/.test(query.category_id) ? query.category_id : null,
      }),
    );
    if (byPrice) services.sort((a, b) => (query.sort === "price_asc" ? 1 : -1) * (amount(a.price) - amount(b.price)));
    services = services.slice(0, query.limit);
  }
  return services.map((s) => serviceItem(s, pc.lang)).filter((i): i is Item => i !== null);
}

/** 23 An article card: its first category (or its date) under the title; it opens in the app. */
function articleItem(article: Record<string, unknown>): Item | null {
  const id = typeof article.id === "string" ? article.id : null;
  if (!id || !/^\d{1,15}$/.test(id) || typeof article.title !== "string") return null;
  const category = Array.isArray(article.categories) ? str((article.categories[0] as { name?: unknown } | undefined)?.name) : null;
  return {
    source: "articles",
    id,
    title: article.title,
    subtitle: category ?? str(article.author),
    image_url: str(article.image_url),
    price_label: null,
    badge: null,
    action: { type: "item", item: { source: "articles", id } },
  };
}

async function listArticles(pc: PageContext, query: ItemsQuery): Promise<Item[]> {
  const ids = query.ids.filter((id) => /^\d{1,15}$/.test(id));
  if (query.ids.length && !ids.length) return [];
  // Articles are always newest first: there are no prices, and "popular" keeps that order.
  const params = ids.length
    ? { ids: ids.slice(0, 30).join(","), per_page: Math.min(ids.length, 30) }
    : { per_page: query.limit, category: query.category_id && /^\d{1,15}$/.test(query.category_id) ? query.category_id : null, featured: query.featured ? "true" : null };
  return list(await get(pc, ["news", "articles"], params))
    .slice(0, ids.length ? ids.length : query.limit)
    .map(articleItem)
    .filter((i): i is Item => i !== null);
}

async function listCategories(pc: PageContext, source: ItemSource): Promise<{ id: number; name: string; count: number }[] | null> {
  const path =
    source === "courses"
      ? ["categories"]
      : source === "products"
        ? ["store", "categories"]
        : source === "services"
          ? ["bookings", "categories"]
          : source === "articles"
            ? ["news", "categories"]
            : null;
  if (!path) return null;
  return list(await get(pc, path))
    .filter((c) => c.parent_id === null || c.parent_id === undefined)
    .map((c) => ({ id: Number(c.id), name: String(c.name ?? ""), count: Number(c.count ?? 0) }))
    .filter((c) => Number.isSafeInteger(c.id) && c.name && Number.isInteger(c.count));
}

/** The student's first course with progress that isn't finished (`MyCourse`). */
async function courseInProgress(pc: PageContext): Promise<Record<string, unknown> | null> {
  const mine = list(await get(pc, ["me", "courses"], { status: "in_progress", per_page: 20 }));
  return (
    mine.find((m) => {
      const progress = (m.progress ?? {}) as { completed_items?: number; percent?: number; course_completed?: boolean };
      return ((progress.completed_items ?? 0) > 0 || (progress.percent ?? 0) > 0) && !progress.course_completed;
    }) ?? null
  );
}
