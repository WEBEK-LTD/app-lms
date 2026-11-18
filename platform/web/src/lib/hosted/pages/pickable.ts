import { readApiList } from "../../app/api-check";
import type { DataStore } from "../../data/store";
import { ENGINES, isAppType } from "../../app/kinds";
import type { App } from "../../data/types";
import type { ItemSource } from "../../pages/types";
import { offeredTypes } from "../../rides/settings";
import { connectorFor } from "../connectors";
import { itemResolver } from "./items";
import { itemSourcesFor } from "../../pages/sources";
import type { ShopCategories } from "../../studio/shop-categories";
import { readShopCategories } from "./shop-categories";
import "./sources";
import type { Connector } from "../connectors/types";
import { catalogSettings } from "../../catalog/settings";
import { listedSales, unitsLeft } from "../../selling/flash-sales";
import { giftMessagesJson, giftOccasionsOf } from "../../selling/gift-messages";
import { appLanguagesOf, couponShown, publicCouponJson } from "../../selling/store";
import { bouquetOf } from "../../selling/bouquet";
import { tickerLines } from "../../school/news-ticker";
import { facultyOf, type FacultyMember } from "../../teachers/faculty";
import { isPublished, isTeachersApp } from "../../teachers/service";
import { isReviewTeacher } from "../../teachers/review";
import { courseSetup } from "../../courses/setup";

/** An entry as the app's list card shows it: its picture, its line under the title, its price and its badge (`Item`). */
export interface PickableEntry {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  badge?: string | null;
  /** 128.8 A course's rating, for a card's `rating` element. */
  rating?: number | null;
  /** 131 A product's sale (`ProductSummary.sale`), for a card's `sale` and `was_price` elements and the flash sale. */
  sale?: { was: string; now: string; percentOff: number; endsAt: string | null; remaining: number | null; total: number | null } | null;
}

/** 131 A store's flash sales, coupons shown in the app and card messages, for Studio's inspector and canvas. */
export interface PickableCommerce {
  flashSales: { id: number; title: string; startsAt: string; endsAt: string; percentOff: number | null; remaining: number | null; total: number | null; productIds: number[] }[];
  coupons: { code: string; percentOff: number | null; amountOff: string | null; minOrder: string | null; endsAt: string | null }[];
  /** `GET /store/gift-messages` in each of the app's languages: the gift checkout's occasions and messages. */
  giftMessages: Record<string, ReturnType<typeof giftMessagesJson>>;
  /** 162 Whether Build your bouquet is set up (Store › Delivery & offers): a Start that opens it says so in the inspector. */
  bouquet?: boolean;
}

/** Entries and categories the page editor offers to pick from. */
export interface Pickable {
  items: Partial<Record<ItemSource, PickableEntry[]>>;
  categories: Partial<Record<ItemSource, { id: string; name: string }[]>>;
  /** Studio's canvas: the samples a list shows while it has no entries of its own, by language (lib/studio/sample-entries.ts); never offered to pick. */
  samples?: Partial<Record<string, Partial<Record<ItemSource, PickableEntry[]>>>>;
  /** 131 A store's flash sales, coupons and card messages. */
  commerce?: PickableCommerce;
  /** 157 The shop's categories a template's lists of them show (lib/studio/shop-categories.ts), as the app gets them. */
  shopCategories?: ShopCategories;
  /** 165 Dashboard › Stories, for Studio's canvas (the story elements whose source is the dashboard). */
  stories?: import("../../stories/view").StoryView[];
  /** 165 Whether the owner has saved them in Dashboard › Stories: until then the story elements follow this design (and stay editable here). */
  storiesSaved?: boolean;
  /** 179.7 A school's news to everyone, the lines Nakhla's ticker runs in the app (lib/school/news-ticker.ts). */
  schoolNews?: string[];
  /** 179.7 An academy's active teachers, as Rawaq's faculty shows them in the app (lib/teachers/faculty.ts). */
  faculty?: FacultyMember[];
}

/** 110 The cards the app shows for a source the platform fills (lib/hosted/pages/sources.ts), by entry. */
async function cardsOf(app: App, source: ItemSource, store: DataStore, now: Date): Promise<Map<string, PickableEntry>> {
  const resolver = itemResolver(source);
  if (!resolver) return new Map();
  try {
    const cards = await resolver({ appId: app.id, userId: null, lang: "en", store, now }, { limit: 50, category_id: null, featured: false, sort: "newest", ids: [] });
    return new Map(cards.map((c) => [c.id, { id: c.id, title: c.title, subtitle: c.subtitle ?? null, imageUrl: c.image_url ?? null, price: c.price_label ?? null, badge: c.badge ?? null, rating: c.rating ?? null }]));
  } catch {
    return new Map();
  }
}

/** A card's facts from the app API's JSON (a course's picture, price and teacher). */
function cardFacts(x: Record<string, unknown>): Omit<PickableEntry, "id" | "title"> {
  const text = (v: unknown) => (typeof v === "string" && v ? v : null);
  const price = (x.price ?? null) as { formatted?: unknown } | string | null;
  return {
    imageUrl: text(x.image_url) ?? text(x.cover_url) ?? (Array.isArray(x.images) ? text(x.images[0]) : null),
    price: typeof price === "string" ? text(price) : text(price?.formatted),
    subtitle: text((x.instructor as { name?: unknown } | undefined)?.name) ?? text(x.subtitle),
    rating: typeof x.rating === "number" && x.rating > 0 ? Math.round(x.rating * 10) / 10 : null,
    sale: saleFacts(x.sale),
  };
}

/** 131 A product's `sale` as the canvas draws it. */
function saleFacts(value: unknown): PickableEntry["sale"] {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.was_formatted !== "string" || typeof v.now_formatted !== "string") return null;
  return {
    was: v.was_formatted,
    now: v.now_formatted,
    percentOff: typeof v.percent_off === "number" ? v.percent_off : 0,
    endsAt: typeof v.ends_at === "string" ? v.ends_at : null,
    remaining: typeof v.remaining === "number" ? v.remaining : null,
    total: typeof v.total === "number" ? v.total : null,
  };
}

/** 131 A store's flash sales, the coupons it shows in the app and its card messages in each language. */
export async function pickableCommerce(store: DataStore, app: App, now: Date): Promise<PickableCommerce | undefined> {
  if (app.appType !== "store") return undefined;
  const [sales, coupons, occasions, languages] = await Promise.all([store.listFlashSales(app.id), store.listCatalogCoupons(app.id), giftOccasionsOf(store, app, now), appLanguagesOf(store, app)]);
  const currency = catalogSettings(app).currency;
  return {
    flashSales: listedSales(sales, now).map((s) => ({
      id: s.id,
      title: s.title,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt.toISOString(),
      percentOff: s.discount.kind === "percent" ? s.discount.percent : null,
      remaining: unitsLeft(s),
      total: s.limit,
      productIds: s.productIds,
    })),
    coupons: coupons
      .filter((c) => couponShown(c, now))
      .map((c) => {
        const j = publicCouponJson(c, currency);
        return { code: j.code, percentOff: j.percent_off, amountOff: j.amount_off_formatted, minOrder: j.min_order_formatted, endsAt: j.ends_at };
      }),
    giftMessages: Object.fromEntries(languages.available.map((lang) => [lang, giftMessagesJson(occasions, lang, languages.default)])),
    bouquet: bouquetOf(app) !== null,
  };
}

async function items(connector: Connector, path: string[], now: Date): Promise<Record<string, unknown>[]> {
  try {
    const result = await connector.handle({ method: "GET", path, query: new URLSearchParams({ per_page: "50", platform: "android" }), body: undefined, user: null, now });
    const list = (result?.status === 200 ? (result.body as { items?: unknown })?.items : null) ?? [];
    return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
  } catch {
    // The platform can't be reached: the editor asks for IDs instead.
    return [];
  }
}

/** Where a WordPress site (the Yallapp plugin) or a client's own API answers; null for other apps. */
export function ownApiBase(app: Pick<App, "backend" | "siteUrl" | "apiBaseUrl">): string | null {
  if (app.backend === "custom_api") return app.apiBaseUrl ?? null;
  if (app.backend === "wordpress" && app.siteUrl) return `${app.siteUrl.replace(/\/+$/, "")}/wp-json/yallapp/v1`;
  return null;
}

/**
 * The courses, products, services or listings and their categories, read the way the
 * app reads them: from the connected platform on the hosted API, or from the
 * client's WordPress site or own API.
 */
export async function pickableContent(
  app: App,
  deps: { store: DataStore; key: Buffer; assetUrl: (id: string) => string; platformUrl: string; readList?: typeof readApiList },
  now: Date,
): Promise<Pickable> {
  const content = await pickableOwn(app, deps, now);
  // 131 A store's flash sales, coupons shown in the app and card messages (Yallapp keeps them for every source).
  const commerce = await pickableCommerce(deps.store, app, now).catch(() => undefined);
  // 157 The shop's categories for the template's lists of them, so the canvas draws them as the app does.
  const shopCategories = await pickableShopCategories(app, deps, now).catch(() => null);
  // 179.7 A school's news and an academy's teachers, for the template's ticker and faculty on the canvas.
  const schoolNews = app.appType === "school" ? tickerLines(await deps.store.listSchoolAnnouncements(app.id).catch(() => [])) : null;
  const faculty = isTeachersApp(app)
    ? facultyOf(
        (await deps.store.listTeachers(app.id, { statuses: ["active"] }).catch(() => [])).filter((t) => !isReviewTeacher(app, t)),
        courseSetup(app).courses,
        isPublished,
      )
    : null;
  return { ...content, ...(commerce ? { commerce } : {}), ...(shopCategories ? { shopCategories } : {}), ...(schoolNews ? { schoolNews } : {}), ...(faculty ? { faculty } : {}) };
}

/** 157 The shop's categories as hosted `GET /pages` gives the template's lists of them; none for an app whose pages its own site serves. */
async function pickableShopCategories(app: App, deps: { store: DataStore; key: Buffer; assetUrl: (id: string) => string; platformUrl: string }, now: Date): Promise<ShopCategories | null> {
  if (app.backend !== "hosted" || !itemSourcesFor(app).includes("products")) return null;
  const connector = connectorFor(app, deps.key, { store: deps.store, assetUrl: deps.assetUrl, platformUrl: deps.platformUrl });
  return connector ? readShopCategories(app, deps.store, connector, { platform: "android", now }) : null;
}

async function pickableOwn(
  app: App,
  deps: { store: DataStore; key: Buffer; assetUrl: (id: string) => string; platformUrl: string; readList?: typeof readApiList },
  now: Date,
): Promise<Pickable> {
  const out: Pickable = { items: {}, categories: {} };
  const base = ownApiBase(app);
  if (base) return ownApiPickable(app, base, deps.readList ?? readApiList);
  if (app.backend !== "hosted") return out;
  // 20 What the engine lists (lib/app/kinds.ts).
  const engine = isAppType(app.appType) ? ENGINES[app.appType].pages : null;
  if (!engine) return out;
  // 19 Real estate: the published listings (a list block shows only those), from the dashboard's own data.
  if (!engine.read) {
    if (engine.source === "listings") {
      const listings = (await deps.store.listListings(app.id)).filter((l) => l.status === "published").slice(0, 200);
      out.items.listings = listings.map((l) => ({ id: String(l.id), title: l.reference ? `${l.title} (${l.reference})` : l.title }));
    }
    // 28 Events: the published ones still to come (a list block shows only those).
    if (engine.source === "events") {
      const events = (await deps.store.listEvents(app.id)).filter((e) => e.status === "published" && e.endAt.getTime() > now.getTime()).slice(0, 200);
      out.items.events = events.map((e) => ({ id: String(e.id), title: `${e.title} (${e.startAt.toISOString().slice(0, 10)})` }));
    }
    // 29 Campaigns that are open or closed (drafts aren't in the app).
    if (engine.source === "campaigns") {
      const campaigns = (await deps.store.listCampaigns(app.id)).filter((c) => c.status !== "draft").slice(0, 200);
      out.items.campaigns = campaigns.map((c) => ({ id: String(c.id), title: c.title }));
    }
    // 104 A delivery company's services the app shows.
    if (engine.source === "delivery_services") {
      const services = (await deps.store.listDeliveryServices(app.id)).filter((s) => s.active);
      out.items.delivery_services = services.map((s) => ({ id: String(s.id), title: s.name }));
    }
    // 110 A food company's restaurants and a ride company's vehicle types the app shows.
    if (engine.source === "restaurants") {
      const restaurants = (await deps.store.listRestaurants(app.id)).filter((r) => r.active).slice(0, 200);
      out.items.restaurants = restaurants.map((r) => ({ id: String(r.id), title: r.name }));
    }
    if (engine.source === "vehicle_types") {
      out.items.vehicle_types = offeredTypes(await deps.store.listVehicleTypes(app.id)).map((t) => ({ id: String(t.id), title: t.name }));
    }
    // 126 A travel company's hotels.
    if (engine.source === "hotels") {
      out.items.hotels = (await deps.store.listTravelHotels(app.id)).filter((h) => h.active).map((h) => ({ id: String(h.id), title: h.name }));
    }
    // 105.4 A school's news to the whole school.
    if (engine.source === "school_news") {
      out.items.school_news = (await deps.store.listSchoolAnnouncements(app.id)).filter((a) => a.audience === "school").slice(0, 200).map((a) => ({ id: String(a.id), title: a.title }));
    }
    // Studio's canvas draws each entry as the app's card: its picture, line, price and badge.
    const list = out.items[engine.source];
    if (list?.length) {
      const cards = await cardsOf(app, engine.source, deps.store, now);
      out.items[engine.source] = list.map((e) => ({ ...cards.get(e.id), ...e }));
    }
    return out;
  }
  const connector = connectorFor(app, deps.key, { store: deps.store, assetUrl: deps.assetUrl, platformUrl: deps.platformUrl });
  if (!connector) return out;
  const { read, source } = engine;
  out.items[source] = (await items(connector, read.items.split("/"), now)).map((x) => ({ id: String(x.id), title: String(x[read.title] ?? ""), ...cardFacts(x) }));
  out.categories[source] = (await items(connector, read.categories.split("/"), now)).map((c) => ({ id: String(c.id), name: String(c.name ?? "") }));
  return out;
}

/** The same lists from a WordPress site or a client's own API, in parallel. */
async function ownApiPickable(app: App, base: string, readList: typeof readApiList): Promise<Pickable> {
  const out: Pickable = { items: {}, categories: {} };
  const q = "?per_page=50&platform=android";
  const titles = (list: Record<string, unknown>[], field: string) =>
    list.filter((x) => x.id !== undefined && x.id !== null).map((x) => ({ id: String(x.id), title: String(x[field] ?? "") }));
  const names = (list: Record<string, unknown>[]) =>
    list.filter((x) => x.id !== undefined && x.id !== null).map((x) => ({ id: String(x.id), name: String(x.name ?? "") }));
  const engine = isAppType(app.appType) ? ENGINES[app.appType].pages : null;
  if (engine?.read) {
    const { read, source } = engine;
    const [items, categories] = await Promise.all([readList(base, `/${read.items}${q}`), readList(base, `/${read.categories}${q}`)]);
    out.items[source] = titles(items, read.title);
    out.categories[source] = names(categories);
  }
  return out;
}
