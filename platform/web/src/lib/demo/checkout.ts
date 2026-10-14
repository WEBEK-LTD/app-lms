import { deliverPaidOrder } from "../catalog/payment";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder } from "../data/types";

/** The payment ID a demo order is marked with: nothing was charged. */
export const DEMO_PAYMENT_ID = "demo";

/**
 * 16 The demo payment page's "Place demo order": the order goes through as
 * if paid (a course order enrols the visitor, 28 a ticket order issues the tickets) without any card or payment
 * account. Only for demo apps; false when the order wasn't pending.
 */
export async function placeDemoOrder(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<boolean> {
  if (!app.demo || order.appId !== app.id || order.status !== "pending") return false;
  const placed = await store.payCatalogOrder(app.id, order.id, DEMO_PAYMENT_ID, now);
  // A course order enrols, 27 a gym's membership starts, 28 a ticket order issues its tickets.
  if (placed) await deliverPaidOrder(store, app, order, now);
  return placed;
}
