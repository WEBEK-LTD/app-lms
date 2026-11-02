import { assetUrl as publicAssetUrl } from "../assets";
import { formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { Item } from "../hosted/pages/items";
import { itemWords } from "../hosted/pages/item-words";
import type { ItemsQuery } from "../pages/types";
import { bundleCourses, compareAtCents, shownBundles } from "./bundles";
import { courseSetup } from "./setup";

const MAX_ITEMS = 30;

/**
 * 113.1 An academy's bundles for list blocks (`bundles`), in the owner's
 * order or the hand-picked ones: how many courses, the bundle's price and
 * what its courses cost on their own; each card opens the bundle's page.
 */
export async function bundlePageItems(appId: string, query: ItemsQuery, deps: { store: DataStore; lang?: string; assetUrl?: (assetId: string) => string }): Promise<Item[]> {
  const app = await deps.store.getAppById(appId);
  if (!app || app.connector?.kind !== "courses") return [];
  const words = itemWords(deps.lang);
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const setup = courseSetup(app);
  const all = shownBundles(setup);
  const byId = new Map(all.map((b) => [String(b.id), b]));
  const list = query.ids.length > 0 ? query.ids.map((id) => byId.get(id)).filter((b) => b !== undefined) : all;
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  return list.slice(0, limit).map((b) => {
    const courses = bundleCourses(setup, b);
    const compare = compareAtCents(courses);
    return {
      source: "bundles",
      id: String(b.id),
      title: b.title,
      subtitle: words.courses(courses.length),
      image_url: b.imageAssetId ? assetUrl(b.imageAssetId) : null,
      price_label: formatCents(b.priceCents, setup.currency),
      badge: compare > b.priceCents ? words.instead(formatCents(compare, setup.currency)) : null,
      action: { type: "item", item: { source: "bundles", id: String(b.id) } },
    };
  });
}
