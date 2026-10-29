import { assetUrl as publicAssetUrl } from "../assets";
import type { DataStore } from "../data/store";
import { deliverySettingsOf } from "../delivery/settings";
import type { Item } from "../hosted/pages/items";
import type { ItemsQuery } from "../pages/types";
import { DEFAULT_FOOD_TIMEZONE, restaurantRating, restaurantState } from "./service";

const MAX_ITEMS = 30;

/**
 * 110 A food company's restaurants in a list block (`restaurants`), as
 * `Item` cards: open ones first, then in the company's order, like the
 * Restaurants screen. Their cuisines under the name, the rating as the
 * badge; tapping one opens its menu.
 */
export async function restaurantPageItems(
  appId: string,
  query: ItemsQuery,
  deps: { store: DataStore; now: Date; assetUrl?: (assetId: string) => string },
): Promise<Item[]> {
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const [all, saved] = await Promise.all([deps.store.listRestaurants(appId), deps.store.getDeliverySettings(appId)]);
  const settings = deliverySettingsOf(saved);
  const timezone = settings.timezone ?? DEFAULT_FOOD_TIMEZONE;
  const cuisines = new Map((settings.cuisines ?? []).map((c) => [c.id, c.name]));
  const active = all.filter((r) => r.active);
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  const byId = new Map(active.map((r) => [String(r.id), r]));
  const list =
    query.ids.length > 0
      ? query.ids.map((id) => byId.get(id)).filter((r) => r !== undefined)
      : active
          .map((r) => ({ r, open: restaurantState(r, timezone, deps.now).open }))
          .sort((a, b) => Number(b.open) - Number(a.open) || a.r.position - b.r.position || a.r.id - b.r.id)
          .map(({ r }) => r);
  return list.slice(0, limit).map((r) => {
    const id = String(r.id);
    const names = r.cuisines.map((c) => cuisines.get(c)).filter((n): n is string => !!n);
    const rating = restaurantRating(r);
    const image = r.coverAssetId ?? r.logoAssetId;
    return {
      source: "restaurants",
      id,
      title: r.name,
      subtitle: names.length ? names.join(" · ") : r.description,
      image_url: image ? assetUrl(image) : null,
      price_label: null,
      badge: rating === null ? null : `★ ${rating.toFixed(1)}`,
      action: { type: "item", item: { source: "restaurants", id } },
    };
  });
}
