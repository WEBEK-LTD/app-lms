import { assetUrl as publicAssetUrl } from "../assets";
import type { DataStore } from "../data/store";
import type { Item } from "../hosted/pages/items";
import type { ItemsQuery } from "../pages/types";
import { offeredTypes } from "./settings";

const MAX_ITEMS = 30;

/**
 * 110 A ride company's vehicle types in a list block (`vehicle_types`), as
 * `Item` cards: the ones riders may choose (active, with fares), in the
 * company's order, with their description under the name. Tapping one
 * opens the ride screen.
 */
export async function vehicleTypePageItems(appId: string, query: ItemsQuery, deps: { store: DataStore; assetUrl?: (assetId: string) => string }): Promise<Item[]> {
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const offered = offeredTypes(await deps.store.listVehicleTypes(appId)).sort((a, b) => a.position - b.position || a.id - b.id);
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  const byId = new Map(offered.map((t) => [String(t.id), t]));
  const list = query.ids.length > 0 ? query.ids.map((id) => byId.get(id)).filter((t) => t !== undefined) : offered;
  return list.slice(0, limit).map((t) => {
    const id = String(t.id);
    return {
      source: "vehicle_types",
      id,
      title: t.name,
      subtitle: t.description,
      image_url: t.imageAssetId ? assetUrl(t.imageAssetId) : null,
      price_label: null,
      badge: null,
      action: { type: "item", item: { source: "vehicle_types", id } },
    };
  });
}
