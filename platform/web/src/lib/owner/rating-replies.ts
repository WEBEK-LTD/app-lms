import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import { readCommunityText } from "../courses/community";
import type { App, FoodOrder, MarketOrder, RatingReply, Ride } from "../data/types";
import { asLang, deliver, type DeliveryNotifyDeps } from "../delivery/notify";
import { foodOrderReference } from "../food/service";
import { marketOrderReference } from "../market/json";
import { rideReference } from "../rides/service";
export { appReplyJson, ownerReplyJson } from "./reply-json";

/**
 * 132 The business answers a customer's rating of a food order, a
 * marketplace order or a ride (Yallapp Business, the dashboard): one reply
 * per rating, written again to change it, removed to take it back; as long
 * as a course review's reply (2000 characters). It shows under the rating
 * in the customer's app in the business's name, and the customer is told
 * the first time ("Burger Lab replied to your review"), in their language.
 * Ratings have no moderation or reports of their own (course reviews keep
 * theirs: hiding), so neither do their replies. Stores have no product
 * reviews to answer.
 */

export const RATED_SOURCES = ["food", "market", "ride"] as const;
export type RatedSource = (typeof RATED_SOURCES)[number];

type Rated =
  | { source: "food"; item: FoodOrder; rating: NonNullable<FoodOrder["rating"]> }
  | { source: "market"; item: MarketOrder; rating: NonNullable<MarketOrder["rating"]> }
  | { source: "ride"; item: Ride; rating: NonNullable<Ride["rating"]> };

/** The rated order or ride of the app, or null when it isn't there or has no rating. */
export async function findRated(store: DeliveryNotifyDeps["store"], app: Pick<App, "id">, source: string, id: number): Promise<Rated | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  if (source === "food") {
    const item = await store.getFoodOrder(app.id, id);
    return item?.rating ? { source, item, rating: item.rating } : null;
  }
  if (source === "market") {
    const item = await store.getMarketOrder(app.id, id);
    return item?.rating ? { source, item, rating: item.rating } : null;
  }
  if (source === "ride") {
    const item = await store.getRide(app.id, id);
    return item?.rating ? { source, item, rating: item.rating } : null;
  }
  return null;
}

/** The name the reply is shown with: the business's app. */
export function businessName(app: Pick<App, "appName" | "shortName">): string {
  return app.appName?.trim() || app.shortName?.trim() || "The business";
}

async function save(store: DeliveryNotifyDeps["store"], app: Pick<App, "id">, rated: Rated, reply: RatingReply | null, now: Date): Promise<void> {
  const rating = { ...rated.rating, reply };
  if (rated.source === "food") await store.updateFoodOrder(app.id, rated.item.id, { rating: rating as FoodOrder["rating"], updatedAt: now });
  else if (rated.source === "market") await store.updateMarketOrder(app.id, rated.item.id, { rating: rating as MarketOrder["rating"], updatedAt: now });
  else await store.updateRide(app.id, rated.item.id, { rating: rating as Ride["rating"], updatedAt: now });
}

const TOLD: Record<Lang, (business: string, reply: string) => { title: string; body: string }> = {
  en: (business, reply) => ({ title: `${business} replied to your review`, body: reply }),
  ar: (business, reply) => ({ title: `ردّ ${business} على تقييمك`, body: reply }),
  tr: (business, reply) => ({ title: `${business} değerlendirmenizi yanıtladı`, body: reply }),
};

/**
 * Writes the reply (or changes it). The customer is told the first time;
 * a change is shown in the app, not pushed again. Returns the field error
 * for an empty or too long reply.
 */
export async function replyToRating(
  deps: DeliveryNotifyDeps,
  rated: Rated,
  value: unknown,
  by: string | null,
): Promise<{ ok: true; first: boolean; pushed: number } | { ok: false; error: string }> {
  const read = readCommunityText(value, "Write your reply.");
  if (!read.ok) return read;
  const { store, app, now } = deps;
  const before = rated.rating.reply ?? null;
  const reply: RatingReply = before
    ? { ...before, text: read.text, editedAt: now.toISOString(), by }
    : { text: read.text, at: now.toISOString(), editedAt: null, by };
  await save(store, app, rated, reply, now);
  const userId = rated.item.userId;
  if (before || userId === null) return { ok: true, first: !before, pushed: 0 };
  const lang = asLang(rated.item.lang) ?? (await appLang(store, app.id));
  const words = TOLD[lang](businessName(app), read.text);
  const data: Record<string, string> =
    rated.source === "food"
      ? { type: "food_order_update", food_order_id: String(rated.item.id) }
      : rated.source === "ride"
        ? { type: "ride_update", ride_id: String(rated.item.id) }
        : { type: "market_order_update", market_order_id: String(rated.item.id) };
  let pushed = 0;
  try {
    pushed = await deliver(deps, userId, words, data, false);
  } catch {
    // The reply is saved either way.
  }
  return { ok: true, first: true, pushed };
}

/** Takes the reply back. */
export async function removeRatingReply(store: DeliveryNotifyDeps["store"], app: Pick<App, "id">, rated: Rated, now: Date): Promise<void> {
  await save(store, app, rated, null, now);
}

/** What the rating is about, for the owner: the restaurant, the shop, the driver. */
export function ratedAbout(rated: Rated): string {
  if (rated.source === "food") return rated.item.restaurantName;
  if (rated.source === "market") return rated.item.vendorName;
  return rated.item.driverName ?? rated.item.vehicleTypeName;
}

/** The order's or the ride's reference ("F-1042"). */
export function ratedReference(rated: Rated): string {
  if (rated.source === "food") return foodOrderReference(rated.item);
  if (rated.source === "market") return marketOrderReference(rated.item);
  return rideReference(rated.item);
}
