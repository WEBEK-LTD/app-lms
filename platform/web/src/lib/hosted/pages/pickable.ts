import { readApiList } from "../../app/api-check";
import type { DataStore } from "../../data/store";
import { ENGINES, isAppType } from "../../app/kinds";
import type { App } from "../../data/types";
import type { ItemSource } from "../../pages/types";
import { offeredTypes } from "../../rides/settings";
import { connectorFor } from "../connectors";
import type { Connector } from "../connectors/types";

/** Entries and categories the page editor offers to pick from. */
export interface Pickable {
  items: Partial<Record<ItemSource, { id: string; title: string }[]>>;
  categories: Partial<Record<ItemSource, { id: string; name: string }[]>>;
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
    return out;
  }
  const connector = connectorFor(app, deps.key, { store: deps.store, assetUrl: deps.assetUrl, platformUrl: deps.platformUrl });
  if (!connector) return out;
  const { read, source } = engine;
  out.items[source] = (await items(connector, read.items.split("/"), now)).map((x) => ({ id: String(x.id), title: String(x[read.title] ?? "") }));
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
