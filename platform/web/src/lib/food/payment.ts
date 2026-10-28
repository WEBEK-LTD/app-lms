import { randomToken, sha256Hex } from "../crypto/tokens";
import { PAY_LINK_MINUTES } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, FoodOrder } from "../data/types";
import { payUrlFor } from "../delivery/payment";
import { foodOrderReference, foodStage } from "./service";

/**
 * 105.1 A food order paid by card is paid like a delivery (lib/delivery/
 * payment.ts): a shop order with one line for the whole food order (its
 * productId is the food order's ID) on the company's payment page, into the
 * company's own account. Paying it sends the order to the restaurant.
 */

/** A new order and payment link for the food order, good for an hour. */
export async function foodPayLink(store: DataStore, app: App, order: FoodOrder, platformUrl: string, now: Date): Promise<{ url: string; expiresAt: Date; order: CatalogOrder }> {
  const token = randomToken(24);
  const paid = await store.createCatalogOrder({
    lang: order.lang,
    appId: app.id,
    tokenHash: sha256Hex(token),
    userId: order.userId,
    status: "pending",
    lines: [
      {
        productId: order.id,
        name: `${order.restaurantName}: ${foodOrderReference(order)}`.slice(0, 200),
        quantity: 1,
        unitCents: order.totalCents,
        imageAssetId: null,
        // The food goes where the order says.
        digital: true,
      },
    ],
    subtotalCents: order.totalCents,
    shippingCents: 0,
    totalCents: order.totalCents,
    currency: order.currency,
    customer: null,
    paymentId: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
  });
  await store.updateFoodOrder(app.id, order.id, { orderId: paid.id, updatedAt: now });
  return { url: payUrlFor(platformUrl, token), expiresAt: new Date(now.getTime() + PAY_LINK_MINUTES * 60_000), order: paid };
}

/**
 * A paid order of a food delivery company: its food order is paid and goes
 * to the restaurant (once, whichever of its links was paid). One cancelled
 * before the payment arrived stays cancelled, paid: the company refunds it
 * from Paid orders. Returns the food order when it now reached the restaurant.
 */
export async function payFoodOrder(store: DataStore, app: App, paid: CatalogOrder, now: Date): Promise<FoodOrder | null> {
  if (app.connector?.kind !== "restaurants") return null;
  const id = paid.lines[0]?.productId;
  const order = id ? await store.getFoodOrder(app.id, id) : null;
  await store.updateCatalogOrder(app.id, paid.id, { status: "completed", updatedAt: now });
  if (!order || order.paymentMethod !== "card" || order.paymentStatus !== "unpaid") return null;
  if (order.status !== "awaiting_payment") {
    await store.updateFoodOrder(app.id, order.id, { paymentStatus: "paid", orderId: paid.id, updatedAt: now }, { statuses: [order.status] });
    return null;
  }
  const timeline = [...order.timeline, foodStage("placed", now, "payment")];
  const changed = await store.updateFoodOrder(app.id, order.id, { status: "placed", paymentStatus: "paid", orderId: paid.id, timeline, updatedAt: now }, { statuses: ["awaiting_payment"] });
  return changed ? { ...order, status: "placed", paymentStatus: "paid", orderId: paid.id, timeline, updatedAt: now } : null;
}
