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

/**
 * For apps on the hosted API with a connected platform: the courses or
 * products and their categories, read the way the app reads them.
 */
export async function pickableContent(
  app: App,
  deps: { store: DataStore; key: Buffer; assetUrl: (id: string) => string; platformUrl: string },
  now: Date,
): Promise<Pickable> {
  const out: Pickable = { items: {}, categories: {} };
  if (app.backend !== "hosted") return out;
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
