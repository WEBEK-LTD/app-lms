import { assetUrl as publicAssetUrl } from "../assets";
import { formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { Item } from "../hosted/pages/items";
import type { ItemsQuery } from "../pages/types";
import { fromNightly } from "./pricing";
import { travelSettingsOf } from "./settings";

const MAX_ITEMS = 30;

/**
 * 126 A travel company's hotels in a list block (`hotels`), as `Item`
 * cards: the active ones, featured first (only the featured with
 * `featured`), in the company's order, with the city under the name and the
 * cheapest night. Tapping one opens the hotel's page.
 */
export async function hotelPageItems(appId: string, query: ItemsQuery, deps: { store: DataStore; assetUrl?: (assetId: string) => string }): Promise<Item[]> {
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const settings = travelSettingsOf(await deps.store.getTravelSettings(appId));
  if (!settings.hotels) return [];
  const [hotels, rooms] = await Promise.all([deps.store.listTravelHotels(appId), deps.store.listTravelRooms(appId)]);
  const active = hotels.filter((h) => h.active).sort((a, b) => Number(b.featured) - Number(a.featured) || a.position - b.position || a.id - b.id);
  const byId = new Map(active.map((h) => [String(h.id), h]));
  const list = query.ids.length > 0 ? query.ids.map((id) => byId.get(id)).filter((h) => h !== undefined) : active.filter((h) => !query.featured || h.featured);
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  return list.slice(0, limit).map((h) => {
    const id = String(h.id);
    const nightly = fromNightly(rooms.filter((r) => r.hotelId === h.id));
    return {
      source: "hotels",
      id,
      title: h.name,
      subtitle: [h.area, h.city].filter(Boolean).join(", "),
      image_url: h.photos[0] ? assetUrl(h.photos[0]) : null,
      price_label: nightly === null ? null : formatCents(nightly, settings.currency),
      badge: h.badge,
      action: { type: "item", item: { source: "hotels", id } },
    };
  });
}
