import { ownCategoryIds } from "../../catalog/categories";
import type { DataStore } from "../../data/store";
import type { App, HostedUser } from "../../data/types";
import type { ShopCategories, ShopCategory } from "../../studio/shop-categories";
import { ConnectorError, type Connector } from "../connectors/types";

/**
 * 157 The shop's categories for a template's lists of them
 * (lib/studio/shop-categories.ts): those the app lists (`GET
 * /store/categories` of the app's connector, in the language asked for,
 * the top ones, each with its picture), and whether they are the owner's. A
 * demo app's are the template's own; with Yallapp's own products, the
 * owner's once one of them isn't the demo's (lib/catalog/categories.ts);
 * a connected platform's always are. Null when the shop can't be read.
 */
export async function readShopCategories(
  app: App,
  store: DataStore,
  connector: Connector,
  request: { platform: "android" | "ios"; now: Date; lang?: string | null; user?: HostedUser | null },
): Promise<ShopCategories | null> {
  try {
    const result = await connector.handle({ method: "GET", path: ["store", "categories"], query: new URLSearchParams({ platform: request.platform }), body: undefined, user: request.user ?? null, now: request.now, lang: request.lang ?? null });
    if (result?.status !== 200) return null;
    const items = (result.body as { items?: unknown } | undefined)?.items;
    const listed = (Array.isArray(items) ? (items as Record<string, unknown>[]) : []).filter((c) => c && typeof c === "object");
    const top = (c: Record<string, unknown>) => c.parent_id === null || c.parent_id === undefined;
    const shown = (rows: Record<string, unknown>[]): ShopCategory[] =>
      rows.map((c) => ({ id: Number(c.id), name: typeof c.name === "string" ? c.name.trim() : "", image_url: typeof c.image_url === "string" && c.image_url ? c.image_url : null })).filter((c) => Number.isSafeInteger(c.id) && c.id > 0 && c.name !== "");
    const list = shown(listed.filter(top));
    // 209 The sub-categories too, for the elements named like one (a skin type, a brand, an age), never for the lists.
    const found = shown(listed.filter((c) => !top(c)));
    // Left out when there are none, so a shop without sub-categories reads as before.
    const subs = found.length ? { subs: found } : {};
    if (app.demo) return { list, own: false, ...subs };
    if (app.connector?.kind !== "catalog") return { list, own: list.length > 0, ...subs };
    const [categories, products] = await Promise.all([store.listCatalogCategories(app.id), store.listCatalogProducts(app.id)]);
    const own = ownCategoryIds(categories, products.filter((p) => p.active && !p.addon));
    return { list, own: list.some((c) => own.has(c.id)), ...subs };
  } catch (e) {
    // The shop can't be reached: the lists as the template has them.
    if (e instanceof ConnectorError) return null;
    throw e;
  }
}
