import type { DataStore } from "../data/store";
import type { App, FoodOrder, HostedUser, Restaurant } from "../data/types";
import { isReviewUser, reviewUserId } from "../delivery/review";

/**
 * 105.1 The store reviewers try all three sides of a food delivery app with
 * the app's review number (or email) from App sign-in: as a customer they
 * order; as the company's first restaurant's staff they take their own
 * orders, and only those; as a courier (104.7) they deliver them. The
 * review account's orders never reach the restaurant's real staff or the
 * company's couriers, and what the reviewers do never changes the real
 * restaurant (setting it busy is shown, not kept).
 */

/** The restaurant the reviewers work for: the company's first active one, or null. */
export async function reviewRestaurantFor(store: DataStore, app: App, user: Pick<HostedUser, "phone" | "email">): Promise<Restaurant | null> {
  if (!isReviewUser(app, user)) return null;
  const restaurants = await store.listRestaurants(app.id);
  return restaurants.filter((r) => r.active).sort((a, b) => a.position - b.position || a.id - b.id)[0] ?? null;
}

/** Whose orders a restaurant's list holds: the reviewers' own only, or everyone's but theirs. */
export async function ordersFor(store: DataStore, app: Pick<App, "id" | "hostedSettings">, review: boolean): Promise<{ userId: number } | { notUserId: number } | {} | null> {
  const id = await reviewUserId(store, app);
  if (review) return id === null ? null : { userId: id };
  return id === null ? {} : { notUserId: id };
}

/** Whether the order is the review account's. */
export async function isReviewOrder(store: DataStore, app: Pick<App, "id" | "hostedSettings">, order: Pick<FoodOrder, "userId">): Promise<boolean> {
  const id = await reviewUserId(store, app);
  return id !== null && order.userId === id;
}
