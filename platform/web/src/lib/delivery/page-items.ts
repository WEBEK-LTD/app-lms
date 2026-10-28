import { assetUrl as publicAssetUrl } from "../assets";
import { formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { Item } from "../hosted/pages/items";
import type { ItemsQuery } from "../pages/types";
import { deliverySettingsOf } from "./settings";

const MAX_ITEMS = 30;

/**
 * 104 A delivery company's services in a list block, as `Item` cards: how
 * long each takes under the name, what it adds to the price as the badge.
 * Tapping one opens the send screen with it chosen.
 */
export async function deliveryServicePageItems(
  appId: string,
  query: ItemsQuery,
  deps: { store: DataStore; assetUrl?: (assetId: string) => string },
): Promise<Item[]> {
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const [services, saved] = await Promise.all([deps.store.listDeliveryServices(appId), deps.store.getDeliverySettings(appId)]);
  const { currency } = deliverySettingsOf(saved);
  const active = services.filter((s) => s.active);
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  const byId = new Map(active.map((s) => [String(s.id), s]));
  const list = query.ids.length > 0 ? query.ids.map((id) => byId.get(id)).filter((s) => s !== undefined) : active;
  return list.slice(0, limit).map((s) => {
    const id = String(s.id);
    return {
      source: "delivery_services",
      id,
      title: s.name,
      subtitle: s.eta ?? s.description,
      image_url: s.imageAssetId ? assetUrl(s.imageAssetId) : null,
      price_label: null,
      badge: s.extraCents > 0 ? `+${formatCents(s.extraCents, currency)}` : null,
      action: { type: "item", item: { source: "delivery_services", id } },
    };
  });
}
