import { allNodes, mapTreeAsync } from "../../studio/tree";
import { showsShopCategories, withShopCategoriesIn, type ShopCategories } from "../../studio/shop-categories";
import { autoSized } from "../../studio/auto-size";
import { withMainScreen } from "../../studio/main-screen";
import { ENGINES, isAppType, mainScreenOfApp } from "../../app/kinds";
import type { App, HostedUser } from "../../data/types";
import { isSamplePlace } from "../../pages/designs/build";
import { servedLayout } from "../../pages/layout";
import { etagValues } from "../../pages/plugin";
import { appOpensScreen, itemSourcesFor, sameScreenAs } from "../../pages/sources";
import { moreTab, splitTabs } from "../../pages/tab-bar";
import { pickLanguage, translated, translatedBlock } from "../../pages/translate";
import { ENTRY_LISTS, STUDIO_PAGE_SCREENS, STUDIO_TECH_TYPES, type Action, type ScreenName, type EntryList, type ItemSource, type ItemsQuery, type LanguageCode, type Layout, type LayoutBlock, type LayoutTab, type StudioNode, type Translations, type StudioPage } from "../../pages/types";
import { centsToDecimal, formatCents } from "../../catalog/money";
import { addDisplayPrices, DISPLAY_CONNECTORS, Shown, type DisplayCurrency } from "../../money/display";
import { ConnectorError, type Connector } from "../connectors/types";
// 211 The tech elements.
import { CatalogConnector } from "../connectors/catalog";
import { servedTech } from "./tech";
import type { HostedContext, HostedRequest, HostedResult } from "../service";
import { durationLabel, itemWords } from "./item-words";
import { itemResolver, type Item } from "./items";
import { sha256Hex } from "../../crypto/tokens";
import { readShopCategories } from "./shop-categories";
import { showsRideClasses, withRideClassesIn } from "../../studio/ride-classes";
import { rideClassesOf } from "./ride-classes";
import { withMapWordsIn } from "../../studio/map-words";
import { listHeadings, productFallbacks, withListHeadings, withSampleProduct } from "./lists";
import "./sources";
import { dashboardStoriesSaved, ensureStoriesSeeded, servedStories } from "../../stories";
import { dashboardStoryElements, withServedStories, type ServedStory, type StoryElementKind } from "../../stories/elements";

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
  /** 161 The customer's currency the app asked for (and the owner allows), with the day's rates; null: the shop's prices only. */
  display: DisplayCurrency | null;
}

/**
 * `display`: 161 the customer's currency the app asked for, when the owner
 * allows it (lib/hosted/service.ts `displayOf`), read only for a page: its
 * lists' prices come in it too, as the shop's own answers do.
 */
export async function handlePages(ctx: HostedContext, req: HostedRequest, user: HostedUser | null, display?: () => Promise<DisplayCurrency | null>): Promise<HostedResult | null> {
  if (req.method !== "GET" || req.path[0] !== "pages" || req.path.length > 2) return null;
  const platform = req.query.get("platform");
  if (platform !== "android" && platform !== "ios") return { status: 400, body: { code: "invalid_request", message: "Unknown platform." } };
  const slug = req.path[1];
  if (slug !== undefined && !SLUG.test(slug)) return { status: 400, body: { code: "invalid_request", message: "This page address isn't valid." } };
  // 17 A draft preview gets the Pages & look draft.
  const layout = await servedLayout(ctx.store, ctx.app, ctx.plan ?? null, { draft: Boolean(ctx.preview?.draft), now: ctx.now });
  const lang = pickLanguage(req.headers?.get("accept-language"), layout.languages);
  if (slug === undefined) return navigation(layout, lang, req, ctx.app, await categoriesMark({ ctx, user, platform, lang, layout, display: null }));
  const page = layout.pages.find((p) => p.slug === slug);
  if (!page) return { status: 404, body: { code: "not_found", message: "This page doesn't exist." }, headers: VARY };
  const pc: PageContext = { ctx, user, platform, lang, layout, display: display ? await display() : null };
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
async function servedStudio(pc: PageContext, page: StudioPage): Promise<StudioPage> {
  const def = pc.layout.languages.default;
  // 164 The template's sample bouquet in an app made before: one of the shop's products.
  // 183 A button that names nothing to open (`brand`'s "Start now" in a project made before): the app's main screen.
  const studio: StudioPage = { ...page, body: isAppType(pc.ctx.app.appType) ? withMainScreen(withSampleProduct(page.body), mainScreenOfApp(pc.ctx.app)) : withSampleProduct(page.body) };
  // 152 The products the elements open that the shop no longer has.
  const gone = await goneProducts(pc, studio);
  // 157 A template's lists of the shop's categories follow them, read from the layout's own words before any translation.
  // 178 And a template's car classes follow the company's vehicle types, their fares in its currency.
  const listed = await withRideClasses(pc, await withCategoryLists(pc, studio.body));
  // 165 The story elements whose stories come from Dashboard › Stories (copied there from the design the first time), once
  // the owner has saved them there; until then they follow the Studio design, the owner's edits there included.
  const fromDashboard = dashboardStoryElements(studio.body);
  const saved = fromDashboard.length > 0 && (await dashboardStoriesSaved(pc.ctx.store, pc.ctx.app));
  // Copied there the first time all the same, so Dashboard › Stories starts from what the app shows.
  if (fromDashboard.length > 0 && !saved) await ensureStoriesSeeded(pc.ctx.store, pc.ctx.app, pc.ctx.now);
  const storyElements = new Map<string, StoryElementKind>(saved ? fromDashboard.map((e) => [e.node.id, e.kind]) : []);
  let stories: ServedStory[] | null = null;
  const dashboardStories = async () => {
    if (stories) return stories;
    await ensureStoriesSeeded(pc.ctx.store, pc.ctx.app, pc.ctx.now);
    // 152 A story's button linked to a product, as every tap: no product chosen (or one the shop no longer has), the shop.
    stories = servedStories(await pc.ctx.store.listAppStories(pc.ctx.app.id), pc.lang, def, pc.ctx.now).map((s) => ({ ...s, action: linkedProduct(pc, s.action, gone) }));
    return stories;
  };
  const body = await mapTreeAsync(listed, async (node) => {
    // 107.2 A hidden element stays in the editor only.
    if (node.hidden) return null;
    const { query, translations: _t, ...texts } = translated(node, pc.lang, def);
    void _t;
    // 152 A tap linked to one of the shop's products: the product, else the shop.
    const own = texts.action ? { ...texts, action: linkedProduct(pc, texts.action, gone) } : texts;
    // 129.11–129.20 A premium element's entries, each in the language asked for; 178 a drawn map's template words too.
    const shown = own.map_drawing ? withMapWordsIn(own as StudioNode, pc.lang) : own.entries ? { ...own, entries: own.entries.map((entry) => translated(entry, pc.lang, def)) } : own;
    // 129 The premium elements' entries (stories, photos) in the language asked for too.
    for (const list of ["slides", "images"] as const) {
      const entries = shown[list] as { translations?: Translations }[] | undefined;
      if (entries) (shown as Record<string, unknown>)[list] = entries.map((entry) => (({ translations: _e, ...rest }) => (void _e, rest))(translated(entry, pc.lang, def) as { translations?: Translations }));
    }
    // 165 Dashboard › Stories in the language asked for; left out while none is shown.
    const storyKind = storyElements.get(node.id);
    if (storyKind) return withServedStories(shown as StudioNode, storyKind, await dashboardStories());
    // 161 A shop's stories: each one's Open opens its link, else the shop (never nothing, which left the customer on Home).
    if (node.type === "stories" && Array.isArray(shown.slides) && pc.ctx.app.appType === "store") return { ...shown, slides: shown.slides.map((slide) => storyWithLink(pc, slide, gone)) } as StudioNode;
    // 161 A plan's prices in the customer's currency too.
    if (node.type === "pricing" && shown.entries) return { ...shown, entries: shown.entries.map((entry) => pricedEntry(entry, node.pricing?.currency ?? "TRY", pc.display)) } as StudioNode;
    // 112.4 What this person opened lately is kept on the phone: sent without entries.
    if (node.type === "items" && node.recent) return node.source === "products" && servable(pc.ctx.app, pc.ctx.connector, "products") ? ({ ...shown, items: [] } as StudioNode) : null;
    if (node.type === "items") {
      const listed = (q: ItemsQuery | undefined) => resolveBlock(pc, { id: node.id, type: "items", visibility: "everyone", title: null, source: node.source, layout: node.layout, query: q }) as Promise<{ items?: unknown[] } | null>;
      let list = await listed(query);
      // 164 Nothing featured, in its category or of the products picked: the shop's best sellers, else its newest.
      if (!list?.items && node.source === "products" && query) for (const next of productFallbacks(query)) if ((list = await listed(next))?.items) break;
      return list?.items ? ({ ...shown, items: list.items } as StudioNode) : null;
    }
    // 208 The category menu (`rows`): each main category with its sub-categories.
    if (node.type === "categories" && node.style === "rows") {
      const rows = node.source && servable(pc.ctx.app, pc.ctx.connector, node.source) ? await listCategories(pc, node.source, true) : null;
      return rows?.length ? ({ ...shown, categories: rows } as StudioNode) : null;
    }
    // 208 A search field the editor made has no source: it searches the app's own list (a shop its products), which the app needs to open it.
    if (node.type === "search" && !node.source) {
      const source = itemSourcesFor(pc.ctx.app).find((s) => SEARCHED.includes(s));
      return source && servable(pc.ctx.app, pc.ctx.connector, source) ? ({ ...shown, source } as StudioNode) : shown;
    }
    if (node.type === "categories") {
      const list = (await resolveBlock(pc, { id: node.id, type: "categories", visibility: "everyone", title: null, source: node.source })) as { categories?: unknown[] } | null;
      return list?.categories ? ({ ...shown, categories: list.categories } as StudioNode) : null;
    }
    // 131 A flash sale with its sale and products; a coupon bound to the shop's coupons with the one it shows; else left out.
    if (node.type === "flash_sale") return servedFlashSale(pc, shown as StudioNode);
    // 211 An electronics shop's parts, from its own products (left out with nothing to show).
    if ((STUDIO_TECH_TYPES as readonly string[]).includes(node.type)) return servedTech(pc.ctx.app, pc.ctx.connector instanceof CatalogConnector, shown as StudioNode, (path, params) => get(pc, path, params));
    if (node.type === "coupon" && node.coupon?.bind === "public") return servedCoupon(pc, shown as StudioNode);
    return shown as StudioNode;
  });
  // 157 and 165: the dashboard's stories still as the template made them follow the shop's categories too.
  const served = body && stories ? await withCategoryLists(pc, body) : body;
  const header = studio.header ? (({ translations: _h, ...rest }) => (void _h, rest))(translated(studio.header, pc.lang, def)) : studio.header;
  // 159 At their automatic sizes, as Studio's canvas draws them, so apps already on phones draw them so too (a cover's
  // top bar across the cover, its bag at the edge, whatever width a corner drag gave it before the owner was asked).
  // 164 A list's title goes with it, and is marked so the app hides it with a list it hides (what was seen lately).
  return { ...studio, ...(header !== undefined ? { header } : {}), body: autoSized(withListHeadings(served ?? studio.body, listHeadings(studio.body))) };
}

/**
 * 157 A Studio page's body with the template's lists of the shop's
 * categories (Leqaa's occasion rings, chips and ticker, its collections'
 * bento, arches and cards) as the shop's categories make them, and each
 * element named like a category opening it (lib/studio/shop-categories.ts);
 * the shop's categories are read only for a page with one of those.
 */
async function withCategoryLists(pc: PageContext, body: StudioNode): Promise<StudioNode> {
  if (!showsShopCategories(body)) return body;
  return withShopCategoriesIn(body, await shopCategoriesOf(pc));
}

/**
 * 178 A Studio page's body with the template's car classes (Masar's and
 * Lamha's) as the company's vehicle types make them
 * (lib/studio/ride-classes.ts); the types are read only for a page with such
 * a list.
 */
async function withRideClasses(pc: PageContext, body: StudioNode): Promise<StudioNode> {
  if (!showsRideClasses(body)) return body;
  return withRideClassesIn(body, await rideClassesOf(pc.ctx.app, pc.ctx.store), pc.lang);
}

/**
 * 157 What the published pages' lists of the shop's categories show, as a
 * short mark for the pages' version (`Navigation.version`): an app back on
 * screen asks for its pages again when the owner changed the shop's
 * categories, as after a publish (145.1). Null when no page has such a list.
 */
async function categoriesMark(pc: PageContext): Promise<string | null> {
  const lists = pc.layout.pages.some((page) => page.studio && showsShopCategories(page.studio.body));
  // 178 And the company's vehicle types and currency a template's car classes show.
  const classes = pc.layout.pages.some((page) => page.studio && showsRideClasses(page.studio.body));
  if (!lists && !classes) return null;
  // The pages' list never fails for it.
  const shop = lists ? await shopCategoriesOf(pc).catch(() => null) : null;
  const rides = classes ? await rideClassesOf(pc.ctx.app, pc.ctx.store).catch(() => null) : null;
  if (!shop && !rides) return null;
  return sha256Hex(JSON.stringify(rides ? [shop, rides] : shop)).slice(0, 10);
}

/** 157 The shop's categories for those lists (./shop-categories.ts); null without a shop. */
async function shopCategoriesOf(pc: PageContext): Promise<ShopCategories | null> {
  const { app, store, connector } = pc.ctx;
  if (!connector || !servable(app, connector, "products")) return null;
  return readShopCategories(app, store, connector, { platform: pc.platform, now: pc.ctx.now, lang: pc.lang, user: pc.user });
}

/** 152 A product's ID in the app API: a positive whole number. */
const PRODUCT_ID = /^[1-9]\d{0,11}$/;
/** 152 What a tap linked to no product, or to one the shop no longer has, opens: the shop, as the templates' sizes and buttons do. */
const SHOP: Action = { type: "screen", screen: "search" };
/** 152 At most this many of a page's linked products are looked up (each one connector read, in parallel). */
const LINKED_PRODUCTS_CHECKED = 12;

/** 152 The product a tap opens ("" for none chosen yet), or undefined when it opens something else. */
function productLink(action: Action | null | undefined): string | undefined {
  return action?.type === "item" && action.item?.source === "products" ? action.item.id.trim() : undefined;
}

/**
 * 152 Of the products a Studio page's elements open (a flower shop's
 * bouquet sizes and "Choose this bouquet"), those the shop no longer has:
 * its connector answers 404 for them, as the app's product page would. A
 * read that fails keeps the link (the app sends a product it can't find to
 * the shop too).
 */
async function goneProducts(pc: PageContext, studio: StudioPage): Promise<Set<string>> {
  const connector = pc.ctx.connector;
  if (!connector || !itemSourcesFor(pc.ctx.app).includes("products")) return new Set();
  // 161 And the stories' own links.
  const ids = [...new Set(allNodes(studio).flatMap((n) => (n.hidden ? [] : [productLink(n.action), ...(n.type === "stories" ? (n.slides ?? []).map((slide) => productLink(slide.action)) : [])])))].filter((id): id is string => id !== undefined && PRODUCT_ID.test(id)).slice(0, LINKED_PRODUCTS_CHECKED);
  const answers = await Promise.all(
    ids.map(async (id) => {
      try {
        const result = await connector.handle({ method: "GET", path: ["store", "products", id], query: new URLSearchParams({ platform: pc.platform }), body: undefined, user: pc.user, now: pc.ctx.now, lang: pc.lang });
        return result?.status === 404 ? id : null;
      } catch {
        return null;
      }
    }),
  );
  return new Set(answers.filter((id): id is string => id !== null));
}

/** 152 A tap as the app gets it: one linked to no product, or to one the shop no longer has, opens the shop. */
function linkedProduct(pc: PageContext, action: Action, gone: ReadonlySet<string>): Action {
  const id = productLink(action);
  if (id === undefined || !itemSourcesFor(pc.ctx.app).includes("products")) return action;
  return PRODUCT_ID.test(id) && !gone.has(id) ? action : SHOP;
}

/**
 * 161 A shop's story as the app gets it: a story with a photo (its viewer
 * has Open) whose link opens nothing in the app (none, a page not
 * published, a screen the app doesn't have) opens the shop, so apps already
 * in the stores follow it too. Its link otherwise, as the owner set it in
 * Studio (or the dashboard); a tile without a photo keeps opening its
 * stories.
 */
function storyWithLink<T extends { image_url?: string | null; action?: Action | null }>(pc: PageContext, slide: T, gone: ReadonlySet<string>): T {
  if (!slide.image_url) return slide;
  // 152 A story linked to one of the shop's products: the product, else the shop.
  const action = slide.action ? linkedProduct(pc, slide.action, gone) : slide.action;
  if (action !== slide.action) return { ...slide, action };
  const opens =
    action &&
    (action.type === "page"
      ? pc.layout.pages.some((p) => p.slug === action.page_slug)
      : action.type === "screen"
        ? Boolean(action.screen) && appOpensScreen(pc.ctx.app, action.screen!)
        : true);
  if (opens) return slide;
  return appOpensScreen(pc.ctx.app, "search") ? { ...slide, action: SHOP } : slide;
}

/**
 * 161 A pricing element's plan with its prices (cents of the element's
 * currency) also in the customer's currency (`display`: `price` and
 * `price_yearly` formatted, the rate and its day); as it is without one.
 */
export function pricedEntry<T extends { price?: number | null; price_yearly?: number | null }>(entry: T, currency: string, display: DisplayCurrency | null): T {
  const shown = Shown.for(currency, display);
  if (!shown || (typeof entry.price !== "number" && typeof entry.price_yearly !== "number")) return entry;
  const text = (cents: number | null | undefined) => (typeof cents === "number" ? shown.formatted(cents) : null);
  return { ...entry, display: { currency: shown.currency, price: text(entry.price), price_yearly: text(entry.price_yearly), rate: shown.rate, rate_date: shown.rateDate } };
}

/** 131 A store route of the app's connector (`GET /store/flash-sales`, `/store/products`, `/store/coupons`), or null. */
async function storeRead(pc: PageContext, path: string[], query: Record<string, string>): Promise<Record<string, unknown> | null> {
  const connector = pc.ctx.connector;
  if (!connector) return null;
  try {
    const result = await connector.handle({ method: "GET", path, query: new URLSearchParams({ platform: pc.platform, ...query }), body: null, user: pc.user, now: pc.ctx.now, lang: pc.lang, display: pc.display });
    return result?.status === 200 && result.body && typeof result.body === "object" ? withDisplay(pc, result.body as Record<string, unknown>) : null;
  } catch (e) {
    if (e instanceof ConnectorError) return null;
    throw e;
  }
}

/**
 * 131 A flash sale element as the app gets it: the sale it shows (`flash`)
 * and its products (`items`, each with its `sale`); the one it names, else
 * the one ending soonest, else the products on sale now without a sale's
 * end; left out when nothing is on sale.
 */
async function servedFlashSale(pc: PageContext, node: StudioNode): Promise<StudioNode | null> {
  const limit = node.flash_sale?.limit ?? 6;
  const sales = ((await storeRead(pc, ["store", "flash-sales"], {}))?.items as Record<string, unknown>[] | undefined) ?? [];
  const live = sales.filter((s) => s.live === true);
  const sale = (node.flash_sale?.sale_id ? live.find((s) => s.id === node.flash_sale?.sale_id) : null) ?? live[0];
  if (sale) {
    const items = shownItems(((sale.products as Record<string, unknown>[]) ?? []).map((p) => productItem(p, pc.lang)).filter((x): x is Item => x !== null).slice(0, limit), pc.display, false);
    if (!items.length) return null;
    return {
      ...node,
      flash: {
        id: sale.id as number,
        title: (sale.title as string) ?? null,
        starts_at: (sale.starts_at as string) ?? null,
        ends_at: (sale.ends_at as string) ?? null,
        percent_off: (sale.percent_off as number | null) ?? null,
        remaining: (sale.remaining as number | null) ?? null,
        total: (sale.total as number | null) ?? null,
      },
      items,
    } as StudioNode;
  }
  if (node.flash_sale?.sale_id) return null;
  // The source's own products on sale (their compare-at price): the soonest end any of them has.
  const onSale = (((await storeRead(pc, ["store", "products"], { on_sale: "true", per_page: String(limit) }))?.items as Record<string, unknown>[] | undefined) ?? []).filter((p) => p.sale);
  if (!onSale.length) return null;
  const ends = onSale.map((p) => (p.sale as { ends_at?: string | null }).ends_at).filter((e): e is string => typeof e === "string").sort()[0] ?? null;
  const items = shownItems(onSale.map((p) => productItem(p, pc.lang)).filter((x): x is Item => x !== null), pc.display, false);
  return { ...node, flash: { id: null, title: null, starts_at: null, ends_at: ends, percent_off: null, remaining: null, total: null }, items } as StudioNode;
}

/** 131 A coupon element bound to the shop's coupons: the one with its code, else the first shown in the app; left out without one. */
async function servedCoupon(pc: PageContext, node: StudioNode): Promise<StudioNode | null> {
  const coupons = ((await storeRead(pc, ["store", "coupons"], {}))?.items as { code: string }[] | undefined) ?? [];
  const offer = node.code ? coupons.find((c) => c.code.toUpperCase() === node.code!.toUpperCase()) : coupons[0];
  return offer ? ({ ...node, code: offer.code, coupon_offer: offer } as StudioNode) : null;
}

/**
 * A tab or a side menu entry as the app gets it (`NavTab`): 82.5 with the
 * owner's own icon. 120 One that opens a page drawn around one of the app's
 * screens opens that screen: the app draws the page around it (the page's
 * `screen` in the list of pages), and an app that doesn't know pages around
 * screens still shows the screen.
 */
function navTab(tab: LayoutTab, lang: LanguageCode, def: LanguageCode, layout: Layout) {
  const t = translated(tab, lang, def);
  const around = t.target.type === "page" ? layout.pages.find((p) => p.slug === t.target.page_slug)?.studio?.screen : undefined;
  // 120.4 A screen opened from the tabs needs what it shows: its page opens as a page.
  const target = around && (STUDIO_PAGE_SCREENS as readonly string[]).includes(around) ? { type: "screen" as const, screen: around as ScreenName } : t.target;
  return { id: t.id, label: t.label, icon: t.icon, ...(t.icon_url ? { icon_url: t.icon_url } : {}), target };
}

/**
 * 120 The screen each page is drawn around, as the app gets it: none for a
 * page drawn around a screen the app shows on the same screen as the page a
 * tab opens (a shop's All products is its Shop tab, the search), so the app
 * shows the tab's page there, the one the owner sees for that tab in Studio,
 * not another over it ("Courses" over a flower shop's bouquets).
 */
export function pageScreens(layout: Pick<Layout, "pages" | "tabs">, app: Pick<App, "appType">): Map<string, string> {
  const out = new Map<string, string>();
  for (const page of layout.pages) if (page.studio?.screen) out.set(page.slug, page.studio.screen);
  const tabPages = new Set(layout.tabs.flatMap((t) => (t.target.type === "page" && t.target.page_slug && out.has(t.target.page_slug) ? [t.target.page_slug] : [])));
  const tabScreens = new Set([...tabPages].map((slug) => out.get(slug)!));
  for (const [slug, screen] of out) {
    if (tabPages.has(slug) || tabScreens.has(screen)) continue;
    if (sameScreenAs(app, screen).some((s) => tabScreens.has(s))) out.delete(slug);
  }
  return out;
}

function navigation(layout: Layout, lang: LanguageCode, req: HostedRequest, app: Pick<App, "appType">, mark: string | null = null): HostedResult {
  const def = layout.languages.default;
  // Each language is its own version, so an app that switches language gets
  // the new texts instead of a 304 (the plugin does the same).
  // 157 And the shop's categories a template's lists show, so an open app asks for its pages again when they change.
  const version = `${lang === def ? layout.version : `${layout.version}.${lang}`}${mark ? `.c${mark}` : ""}`;
  const etag = `"${version}"`;
  if (etagValues(req.headers?.get("if-none-match") ?? null).includes(version)) {
    return { status: 304, headers: { ...VARY, etag } };
  }
  const split = splitTabs(layout.tabs.map((tab) => navTab(tab, lang, def, layout)));
  const screens = pageScreens(layout, app);
  return {
    status: 200,
    body: {
      version,
      // 109 Up to five tabs: with more, the first four, a More tab and the rest in `more`.
      tabs: [...split.shown, ...(split.more.length ? [moreTab(lang)] : [])],
      more: split.more,
      ...(layout.tab_bar ? { tab_bar: layout.tab_bar } : {}),
      // 82.5 The side menu.
      menu: (layout.menu ?? []).map((entry) => navTab(entry, lang, def, layout)),
      // 120 A page drawn around one of the app's screens says which.
      pages: layout.pages.map((page) => ({ slug: page.slug, title: translated(page, lang, def).title, updated_at: page.updated_at, ...(screens.has(page.slug) ? { screen: screens.get(page.slug) } : {}) })),
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
/** 208 The lists the app's search field opens (`searchLocation` in the app). */
const SEARCHED: readonly ItemSource[] = ["products", "courses", "services", "listings", "articles", "events", "hotels"];

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
  // 110.3 A Location block still at the design's sample place shows in the draft preview only.
  if (isSamplePlace(block) && !ctx.preview?.draft) return null;
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
  // 208 In the page's language: the categories' names (the category menu's) as the shop named them in it (175).
  const result = await ctx.connector.handle({ method: "GET", path, query, body: undefined, user: pc.user, now: ctx.now, display: pc.display, lang: pc.lang });
  if (!result || result.status !== 200 || !result.body || typeof result.body !== "object") return null;
  return withDisplay(pc, result.body as Record<string, unknown>);
}

/**
 * 161 A connector's answer with its prices also in the customer's currency
 * (`display`), as the hosted API adds them to the app's own requests
 * (lib/hosted/service.ts): only Yallapp's own prices, never a connected
 * platform's.
 */
function withDisplay(pc: PageContext, body: Record<string, unknown>): Record<string, unknown> {
  return DISPLAY_CONNECTORS.has(pc.ctx.app.connector?.kind ?? "") ? addDisplayPrices(body, pc.display) : body;
}

/**
 * 161 A card's price as amounts and a currency (`ItemPrice`), beside its
 * words (`price_label`, kept for older apps): what the app converts, with
 * the same price in the customer's currency (`display`) when the source is
 * Yallapp's own; a range's dearest end (`max_amount`). Nothing for a source
 * price without an amount and a currency (a connected platform's free
 * course).
 */
export function itemPrice(price: unknown): { price?: Record<string, unknown> } {
  const p = (price ?? {}) as Record<string, unknown>;
  if (typeof p.amount !== "string" || typeof p.currency !== "string" || typeof p.formatted !== "string") return {};
  const keep = ["amount", "currency", "formatted", "range", "max_amount", "regular_amount", "regular_formatted", "on_sale", "display"];
  return { price: Object.fromEntries(keep.filter((k) => p[k] !== undefined && p[k] !== null).map((k) => [k, p[k]])) };
}

/** 161 A free card's price: 0 in its currency, when the source says which; nothing otherwise. */
function freePrice(price: unknown): { price?: Record<string, unknown> } {
  const currency = (price as { currency?: unknown } | null | undefined)?.currency;
  return typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? { price: { amount: centsToDecimal(0, currency), currency, formatted: formatCents(0, currency) } } : {};
}

/**
 * 161 A list's cards with their prices also in the customer's currency:
 * the platform's own lists (listings, events, hotels, bundles) converted
 * here; each card's converted words (`price.display.label`: "From \$3.00",
 * "\$1,200.00 / month") from its own.
 */
function shownItems(items: Item[], display: DisplayCurrency | null, own: boolean): Item[] {
  return items.map((item) => {
    if (!item.price) return item;
    const price = own ? addDisplayPrices({ ...item.price }, display) : item.price;
    const shown = price.display as Record<string, unknown> | undefined;
    const label = item.price_label;
    if (shown && typeof shown.formatted === "string" && typeof price.formatted === "string" && label && label.includes(price.formatted)) {
      return { ...item, price: { ...price, display: { ...shown, label: label.replace(price.formatted, shown.formatted) } } };
    }
    return { ...item, price };
  });
}

const list = (body: Record<string, unknown> | null): Record<string, unknown>[] =>
  Array.isArray(body?.items) ? (body.items as Record<string, unknown>[]).filter((i) => i && typeof i === "object") : [];

async function listItems(pc: PageContext, source: ItemSource, query: ItemsQuery): Promise<Item[] | null> {
  // 161 The connector's own lists come converted when they are Yallapp's (`withDisplay`); a free card's 0 too.
  const own = DISPLAY_CONNECTORS.has(pc.ctx.app.connector?.kind ?? "");
  if (source === "courses") return shownItems(await listCourses(pc, query), pc.display, own);
  if (source === "products") return shownItems(await listProducts(pc, query), pc.display, own);
  if (source === "services") return shownItems(await listServices(pc, query), pc.display, own);
  if (source === "articles") return listArticles(pc, query);
  const resolver = itemResolver(source);
  if (!resolver) return null;
  const items = await resolver({ appId: pc.ctx.app.id, userId: pc.user ? String(pc.user.id) : null, lang: pc.lang, store: pc.ctx.store, now: pc.ctx.now }, query);
  // 161 The platform's own lists: converted here.
  return shownItems(items, pc.display, true);
}

const str = (value: unknown): string | null => (typeof value === "string" && value ? value : null);
const amount = (price: unknown): number => Number((price as { amount?: unknown } | null)?.amount ?? 0) || 0;

/** A course as a list's entry (exported for its tests). */
export function courseItem(course: Record<string, unknown>, lang: LanguageCode): Item | null {
  const id = Number(course.id);
  if (!Number.isSafeInteger(id) || typeof course.title !== "string") return null;
  const price = (course.price ?? {}) as { is_free?: boolean; formatted?: string | null };
  return {
    source: "courses",
    id: String(id),
    title: course.title,
    // 128.10 The teacher alone, as the WordPress plugin serves it; the rating is a card's `rating` element's.
    subtitle: str((course.instructor as { name?: unknown } | undefined)?.name),
    image_url: str(course.image_url),
    // Display text only: there's never a purchase action in a list.
    // 38 In the app's language, like every word on a card.
    price_label: price.is_free ? itemWords(lang).free : str(price.formatted),
    // 161 As amounts and a currency, also in the customer's (a free one: 0, its words "Free").
    ...(price.is_free ? freePrice(price) : itemPrice(price)),
    badge: null,
    // 128.8 Its rating, for a card's `rating` element.
    rating: typeof course.rating === "number" && course.rating > 0 ? Math.round(course.rating * 10) / 10 : null,
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
    // 211 Its main specs on one line ("256 GB · 6.7″ OLED · 5G"), for the cards' subtitle.
    subtitle: str(product.spec_line),
    image_url: str(product.image_url),
    price_label: str(price.formatted),
    // 161 As amounts and a currency, also in the customer's (its `sale` too: `sale.display`).
    ...itemPrice(price),
    badge: product.stock_status === "out_of_stock" ? itemWords(lang).outOfStock : price.on_sale ? itemWords(lang).sale : null,
    // 131 Its sale, for the cards' sale badge, the `sale` and `was_price` elements and the flash sale.
    ...(product.sale && typeof product.sale === "object" ? { sale: product.sale as Record<string, unknown> } : {}),
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
        // 112.4 Products on sale only.
        on_sale: query.on_sale ? "true" : null,
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
    // 161 As amounts and a currency, also in the customer's (a free one too: 0, its words "Free").
    ...itemPrice(price),
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

/** A category as an element shows it; 208 with its sub-categories (`children`) for the category menu. */
interface ShownCategory {
  id: number;
  name: string;
  count: number;
  image_url?: string;
  children?: ShownCategory[];
}

async function listCategories(pc: PageContext, source: ItemSource, subs = false): Promise<ShownCategory[] | null> {
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
  const all = list(await get(pc, path));
  // 112.4 With its picture when it has one (a store's categories).
  const shown = (c: Record<string, unknown>): ShownCategory => ({ id: Number(c.id), name: String(c.name ?? ""), count: Number(c.count ?? 0), ...(typeof c.image_url === "string" && c.image_url ? { image_url: c.image_url } : {}) });
  const fine = (c: ShownCategory) => Number.isSafeInteger(c.id) && c.name !== "" && Number.isInteger(c.count);
  const main = (c: Record<string, unknown>) => c.parent_id === null || c.parent_id === undefined || c.parent_id === 0;
  return all
    .filter(main)
    .map((c) => {
      const out = shown(c);
      // 208 Its sub-categories in the shop's order, those with products (at most 12).
      if (!subs) return out;
      const children = all
        .filter((x) => !main(x) && Number(x.parent_id) === out.id)
        .map(shown)
        .filter((x) => fine(x) && x.count > 0)
        .slice(0, 12);
      return { ...out, children };
    })
    .filter(fine);
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
