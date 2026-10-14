import { readApiList } from "../../app/api-check";
import type { DataStore } from "../../data/store";
import type { App } from "../../data/types";
import type { ItemSource } from "../../pages/types";
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
  // 19 Real estate: the published listings (a list block shows only those), from the dashboard's own data.
  if (app.appType === "real_estate") {
    const listings = (await deps.store.listListings(app.id)).filter((l) => l.status === "published").slice(0, 200);
    out.items.listings = listings.map((l) => ({ id: String(l.id), title: l.reference ? `${l.title} (${l.reference})` : l.title }));
    return out;
  }
  const connector = connectorFor(app, deps.key, { store: deps.store, assetUrl: deps.assetUrl, platformUrl: deps.platformUrl });
  if (!connector) return out;
  if (app.appType === "lms") {
    out.items.courses = (await items(connector, ["courses"], now)).map((c) => ({ id: String(c.id), title: String(c.title ?? "") }));
    out.categories.courses = (await items(connector, ["categories"], now)).map((c) => ({ id: String(c.id), name: String(c.name ?? "") }));
  }
  if (app.appType === "store") {
    out.items.products = (await items(connector, ["store", "products"], now)).map((p) => ({ id: String(p.id), title: String(p.name ?? "") }));
    out.categories.products = (await items(connector, ["store", "categories"], now)).map((c) => ({ id: String(c.id), name: String(c.name ?? "") }));
  }
  if (app.appType === "booking") {
    out.items.services = (await items(connector, ["bookings", "services"], now)).map((s) => ({ id: String(s.id), title: String(s.name ?? "") }));
    out.categories.services = (await items(connector, ["bookings", "categories"], now)).map((c) => ({ id: String(c.id), name: String(c.name ?? "") }));
  }
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
  if (app.appType === "lms") {
    const [items, categories] = await Promise.all([readList(base, `/courses${q}`), readList(base, `/categories${q}`)]);
    out.items.courses = titles(items, "title");
    out.categories.courses = names(categories);
  }
  if (app.appType === "store") {
    const [items, categories] = await Promise.all([readList(base, `/store/products${q}`), readList(base, `/store/categories${q}`)]);
    out.items.products = titles(items, "name");
    out.categories.products = names(categories);
  }
  if (app.appType === "booking") {
    const [items, categories] = await Promise.all([readList(base, `/bookings/services${q}`), readList(base, `/bookings/categories${q}`)]);
    out.items.services = titles(items, "name");
    out.categories.services = names(categories);
  }
  return out;
}
