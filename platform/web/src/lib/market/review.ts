import type { DataStore } from "../data/store";
import type { App, DeliverySettings, HostedUser, MarketOrder, Restaurant, RestaurantStaff } from "../data/types";
import { isReviewUser, reviewUserId } from "../delivery/review";
import { priceMarketCart, repriceFor, type Cart } from "./cart";
import { collectedByOf } from "./flow";
import { vendorAppNameOf } from "./vendor-app";

/**
 * 115.74 The store reviewers in a marketplace's vendor app. They sign in
 * with the app's review number (or email) from App sign-in and work as
 * "App Review", a manager of the marketplace's first supermarket or shop
 * (else its first place), on their own orders only: a sample pick-up order
 * waits for them when they have none open. Real customers' orders never
 * reach them, and what they change on the place (busy, paused, running
 * late, hours, stock, prices) is shown but never kept: the place is a real
 * one.
 */

export const REVIEW_STAFF_NAME = "App Review";
/** The sample order's pick-up code, written in the reviewers' notes. */
export const REVIEW_PICKUP_CODE = "1234";

/** The place the reviewers work for: the first active supermarket or shop, else the first active place; null for anyone else. */
export async function reviewVendorFor(store: DataStore, app: App, user: Pick<HostedUser, "phone" | "email">): Promise<Restaurant | null> {
  return isReviewUser(app, user) ? reviewPlaceOf(store, app.id) : null;
}

/** The place the reviewers work for, whoever asks (for their notes). */
export async function reviewPlaceOf(store: DataStore, appId: string): Promise<Restaurant | null> {
  const places = (await store.listRestaurants(appId)).filter((r) => r.active).sort((a, b) => a.position - b.position || a.id - b.id);
  return places.find((r) => (r.kind ?? "restaurant") !== "restaurant") ?? places[0] ?? null;
}

/** The reviewers as the place's staff: a manager, never saved. */
export function reviewStaffOf(vendor: Restaurant, user: Pick<HostedUser, "phone" | "email">, now: Date): RestaurantStaff {
  return { id: 0, appId: vendor.appId, restaurantId: vendor.id, name: REVIEW_STAFF_NAME, phone: user.phone, email: user.email, active: true, role: "manager", createdAt: now, updatedAt: now };
}

/**
 * Whether a vendor's list shows this order: the reviewers see their own
 * only, the place's staff everyone's but theirs. Staff who sign in with the
 * review number themselves (a demo's number, the owner of its place) see
 * them all.
 */
export function reviewSees(order: Pick<MarketOrder, "userId">, reviewId: number | null, who: "review" | "staff" | "all"): boolean {
  if (who === "review") return reviewId !== null && order.userId === reviewId;
  return who === "all" || reviewId === null || order.userId !== reviewId;
}

/** Which orders a vendor's staff member sees (`reviewSees`). */
export function reviewWhoOf(app: App, s: { review?: boolean; staff: Pick<RestaurantStaff, "phone" | "email"> }): "review" | "staff" | "all" {
  if (s.review) return "review";
  return isReviewUser(app, s.staff) ? "all" : "staff";
}

const OPEN = ["placed", "accepted", "picking", "ready"];

/**
 * A sample order for the reviewers, when they have none open at the place:
 * picked up at the place and paid in cash, with three of its items in
 * stock (a weighed one first when it sells by weight), placed now.
 */
export async function sampleReviewOrder(store: DataStore, app: App, delivery: DeliverySettings, vendor: Restaurant, now: Date): Promise<MarketOrder | null> {
  const reviewId = await reviewUserId(store, app);
  if (reviewId === null) return null;
  const mine = await store.listMarketOrders({ appId: app.id, vendorId: vendor.id, userId: reviewId, limit: 50, offset: 0, order: "newest" });
  if (mine.items.some((o) => OPEN.includes(o.status))) return null;
  const user = await store.getHostedUser(app.id, reviewId);
  if (!user) return null;
  let lines: Cart["lines"];
  if ((vendor.kind ?? "restaurant") === "restaurant") {
    const menu = await store.getRestaurantMenu(app.id, vendor.id);
    const dishes = (menu?.sections ?? []).flatMap((s) => s.dishes).filter((d) => d.available && d.choiceGroups.every((g) => g.min === 0));
    lines = dishes.slice(0, 2).map((d) => ({ productId: d.id, quantity: 1, choices: [], note: null, ifMissing: "remove", substituteProductId: null }));
  } else {
    const found = await store.listMarketProducts({ appId: app.id, vendorId: vendor.id, outOfStock: false, page: 1, perPage: 50 });
    const items = [...found.items].sort((a, b) => Number(b.unit !== "item") - Number(a.unit !== "item"));
    lines = items.slice(0, 3).map((p) => ({ productId: p.id, quantity: p.unit === "item" ? 1 : Math.max(p.step, 1), choices: [], note: null, ifMissing: "similar", substituteProductId: null }));
  }
  if (!lines.length) return null;
  // Picked up at the place; where the app has no pick-up, delivered to the place's own address.
  let cart: Cart = { vendorId: vendor.id, lines, fulfilment: "pickup", dropoff: null, scheduledFor: null, couponCode: null, useWallet: false, tip: 0 };
  let priced = await priceMarketCart(store, { appId: app.id, delivery, cart, userId: reviewId, now });
  if (!priced.ok && priced.refusal.code === "no_pickup" && vendor.address) {
    cart = { ...cart, fulfilment: "delivery", dropoff: vendor.address };
    priced = await priceMarketCart(store, { appId: app.id, delivery, cart, userId: reviewId, now });
  }
  if (!priced.ok) return null;
  const pr = priced.priced;
  const pickup = cart.fulfilment === "pickup";
  const deliveryBy = pickup ? null : pr.delivery.by;
  const money = repriceFor(pr, cart, collectedByOf({ paymentMethod: "cash", fulfilment: cart.fulfilment, deliveryBy }));
  const at = now.toISOString();
  return store.createMarketOrder({
    appId: app.id,
    vendorId: vendor.id,
    vendorName: vendor.name,
    vendorKind: vendor.kind ?? "restaurant",
    userId: reviewId,
    customerName: user.name || REVIEW_STAFF_NAME,
    customerPhone: user.phone ?? "",
    fulfilment: cart.fulfilment,
    deliveryBy,
    scheduledFor: null,
    lines: pr.lines,
    money,
    currency: pr.currency,
    paymentMethod: "cash",
    paymentStatus: "unpaid",
    paymentRef: null,
    couponCode: null,
    status: "placed",
    dropoff: cart.dropoff,
    distanceKm: pr.delivery.distanceKm,
    notes: null,
    pickupCode: pickup ? REVIEW_PICKUP_CODE : null,
    prepMinutes: null,
    readyAt: null,
    rejection: null,
    shipmentId: null,
    rating: null,
    timeline: [{ status: "placed", at, by: "customer" }],
    completedAt: null,
    lang: "en",
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * The vendor app's notes for the stores' reviewers (Google Play › App
 * access, App Store › App Review Information), in English as they read
 * them; null without a review account.
 */
export function vendorReviewNotes(app: Pick<App, "appName" | "hostedSettings">, place: Pick<Restaurant, "name" | "kind"> | null): string | null {
  const settings = app.hostedSettings;
  if (!settings?.reviewCode || (!settings.reviewPhone && !settings.reviewEmail)) return null;
  const login = settings.reviewPhone ? `the phone number ${settings.reviewPhone}` : `the email ${settings.reviewEmail}`;
  const company = (app.appName ?? "").trim() || "the company";
  const name = vendorAppNameOf(app);
  const where = place ? `${place.name}, one of ${company}'s places` : `one of ${company}'s places`;
  const picks = place ? (place.kind ?? "restaurant") !== "restaurant" : true;
  return [
    `${name} is for the staff of the restaurants and shops on ${company} only; customers order in the ${company} app, and the app's support answers them. Staff can't reach customers: they see a customer's first name and the order, never a phone number or an email.`,
    `Sign in with ${login} and the code ${settings.reviewCode} (no message is sent to it). This account is a test manager of ${where}, and sees its own orders only: a sample order paid in cash is waiting in New while the place is open (another appears once it is done).`,
    picks
      ? `Orders: the new order rings until you act. Choose a ready-in time (10 to 45 minutes) and Accept, or Turn down with a reason. Then open it and pick it: for each line, type the weight on the keypad (items sold by weight) and tap Picked, or tap Out, or Swap to offer the customer something similar. Ready for courier turns on once every line is done. Then hand it over with the pick-up code ${REVIEW_PICKUP_CODE}.`
      : `Orders: the new order rings until you act. Choose a ready-in time (10 to 45 minutes) and Accept, or Turn down with a reason. Mark it Ready, then hand it over with the pick-up code ${REVIEW_PICKUP_CODE}.`,
    "Stock: search by name, SKU or barcode, switch an item in or out of stock, or tap its price to change it. Busy, running late, hours, stock and prices are shown but not kept for this account: the place is a real one.",
  ].join("\n\n");
}
