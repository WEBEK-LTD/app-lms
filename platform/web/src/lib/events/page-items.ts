import { assetUrl as publicAssetUrl } from "../assets";
import { utcToLocal } from "../bookings/time";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import type { EventRecord } from "../data/types";
import { categoryId, loadEvents, placesLeft, priceLabel } from "./service";

/** One card of a list block (`Item` in docs/api/openapi.yaml), from the "events" source. */
export interface EventItem {
  source: "events";
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  price_label: string | null;
  badge: string | null;
  action: { type: "item"; item: { source: "events"; id: string } };
}

export interface EventItemsQuery {
  /** These events, in this order (published ones only). */
  ids?: string[];
  /** A category's ID (lib/events/service.ts `categoryId`). */
  category_id?: string | null;
  limit: number;
}

const MAX_ITEMS = 30;
const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "Sat 18 Oct, 20:30 · Main Hall", in the organiser's time zone. */
function subtitle(e: EventRecord, timeZone: string): string {
  const local = utcToLocal(e.startAt, timeZone);
  const day = DAY.format(new Date(`${local.date}T12:00:00Z`));
  return [`${day}, ${local.time}`, e.venueName ?? (e.onlineUrl ? "Online" : null)].filter(Boolean).join(" · ");
}

/**
 * 28 The upcoming published events a list block shows on a page of an
 * Events & tickets app, soonest first, as `Item` cards. Prices are display
 * text only (never a purchase button).
 */
export async function eventPageItems(
  appId: string,
  query: EventItemsQuery,
  deps: { store?: DataStore; assetUrl?: (assetId: string) => string; now?: Date } = {},
): Promise<EventItem[]> {
  const store = deps.store ?? (await getStore());
  const assetUrl = deps.assetUrl ?? publicAssetUrl;
  const app = await store.getAppById(appId);
  if (!app) return [];
  const data = await loadEvents(store, app, deps.now ?? new Date());
  const limit = Math.max(0, Math.min(MAX_ITEMS, Math.floor(query.limit)));
  const upcoming = data.events.filter((e) => e.status === "published" && e.endAt.getTime() > data.now.getTime());
  let list: EventRecord[];
  if (query.ids && query.ids.length > 0) {
    const byId = new Map(upcoming.map((e) => [String(e.id), e]));
    list = query.ids.map((id) => byId.get(id)).filter((e): e is EventRecord => e !== undefined);
  } else {
    list = upcoming.filter((e) => !query.category_id || (e.category !== null && categoryId(e.category) === query.category_id));
  }
  return list.slice(0, limit).map((e) => {
    const left = placesLeft(data, e).event;
    const types = data.types.filter((t) => t.eventId === e.id);
    const id = String(e.id);
    return {
      source: "events",
      id,
      title: e.title,
      subtitle: subtitle(e, data.settings.timeZone),
      image_url: e.imageAssetIds[0] ? assetUrl(e.imageAssetIds[0]) : null,
      price_label: priceLabel(types, data.settings.currency),
      badge: left === 0 ? "Sold out" : left !== null && left <= 10 ? `${left} left` : null,
      action: { type: "item", item: { source: "events", id } },
    };
  });
}
