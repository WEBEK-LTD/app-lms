import { assetUrl as publicAssetUrl } from "../assets";
import { utcToLocal } from "../bookings/time";
import { getStore } from "../data";
import type { DataStore } from "../data/store";
import type { EventRecord } from "../data/types";
import { itemWords, type ItemWords } from "../hosted/pages/item-words";
import { centsToDecimal, formatCents } from "../catalog/money";
import { categoryId, loadEvents, placesLeft, priceLabel } from "./service";

/** 161 An event's lowest paid ticket as an amount and a currency (what "From ₺150" says); none when all are free. */
function lowestPrice(cents: number[], currency: string): { price?: { amount: string; currency: string; formatted: string } } {
  const paid = cents.filter((c) => c > 0);
  if (!paid.length) return {};
  const low = Math.min(...paid);
  return { price: { amount: centsToDecimal(low, currency), currency, formatted: formatCents(low, currency) } };
}

/** One card of a list block (`Item` in docs/api/openapi.yaml), from the "events" source. */
export interface EventItem {
  source: "events";
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  price_label: string | null;
  /** 161 The lowest price as an amount and a currency (`ItemPrice`); the hosted API adds it in the customer's. */
  price?: { amount: string; currency: string; formatted: string };
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

/** "Sat 18 Oct, 20:30 · Main Hall", in the organiser's time zone (38: and the app's language). */
function subtitle(e: EventRecord, timeZone: string, words: ItemWords): string {
  const local = utcToLocal(e.startAt, timeZone);
  const format = new Intl.DateTimeFormat(words.locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const day = format.format(new Date(`${local.date}T12:00:00Z`)).replace(/,/g, "");
  return [`${day}, ${local.time}`, e.venueName ?? (e.onlineUrl ? words.online : null)].filter(Boolean).join(" · ");
}

/**
 * 28 The upcoming published events a list block shows on a page of an
 * Events & tickets app, soonest first, as `Item` cards. Prices are display
 * text only (never a purchase button).
 */
export async function eventPageItems(
  appId: string,
  query: EventItemsQuery,
  deps: { store?: DataStore; assetUrl?: (assetId: string) => string; now?: Date; lang?: string } = {},
): Promise<EventItem[]> {
  const words = itemWords(deps.lang);
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
      subtitle: subtitle(e, data.settings.timeZone, words),
      image_url: e.imageAssetIds[0] ? assetUrl(e.imageAssetIds[0]) : null,
      price_label: priceLabel(types, data.settings.currency, words),
      ...lowestPrice(types.map((t) => t.priceCents), data.settings.currency),
      badge: left === 0 ? words.soldOut : left !== null && left <= 10 ? words.left(left) : null,
      action: { type: "item", item: { source: "events", id } },
    };
  });
}
