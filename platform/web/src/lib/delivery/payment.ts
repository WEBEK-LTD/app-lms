import { randomToken, sha256Hex } from "../crypto/tokens";
import { PAY_LINK_MINUTES } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, Shipment } from "../data/types";
import { shipmentReference, stage } from "./service";

/**
 * 104 A shipment paid by card is paid like a shop's order: an order with
 * one line for the delivery (its productId is the shipment's ID) on the
 * company's payment page (/pay/<token>), into the company's own account.
 * The receipt, refunds and the pending-payments check are the orders' own.
 * Paying it sends the shipment to the couriers.
 */

export function payUrlFor(platformUrl: string, token: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/pay/${token}`;
}

/** A new order and payment link for the shipment, good for an hour. */
export async function shipmentPayLink(store: DataStore, app: App, shipment: Shipment, platformUrl: string, now: Date): Promise<{ url: string; expiresAt: Date; order: CatalogOrder }> {
  const token = randomToken(24);
  const order = await store.createCatalogOrder({
    lang: shipment.lang,
    appId: app.id,
    tokenHash: sha256Hex(token),
    userId: shipment.userId,
    status: "pending",
    lines: [
      {
        productId: shipment.id,
        name: `Delivery ${shipmentReference(shipment)}${shipment.serviceName ? ` (${shipment.serviceName})` : ""}`.slice(0, 200),
        quantity: 1,
        unitCents: shipment.priceCents,
        imageAssetId: null,
        // Nothing is shipped to the customer: the parcel goes where the shipment says.
        digital: true,
      },
    ],
    subtotalCents: shipment.priceCents,
    shippingCents: 0,
    totalCents: shipment.priceCents,
    currency: shipment.currency,
    customer: null,
    paymentId: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
  });
  await store.updateShipment(app.id, shipment.id, { orderId: order.id, updatedAt: now });
  return { url: payUrlFor(platformUrl, token), expiresAt: new Date(now.getTime() + PAY_LINK_MINUTES * 60_000), order };
}

/**
 * A paid order of a delivery company: its shipment is paid and waits for a
 * courier (once, whichever of its links was paid). A shipment cancelled
 * before the payment arrived stays cancelled, paid: the company refunds it
 * from Orders. Returns the shipment when it now waits for a courier.
 */
export async function payShipmentOrder(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<Shipment | null> {
  if (app.connector?.kind !== "deliveries") return null;
  const id = order.lines[0]?.productId;
  const shipment = id ? await store.getShipment(app.id, id) : null;
  // Nothing to deliver to the customer: the order is done once paid.
  await store.updateCatalogOrder(app.id, order.id, { status: "completed", updatedAt: now });
  if (!shipment || shipment.paymentMethod !== "card" || shipment.paymentStatus !== "unpaid") return null;
  if (shipment.status !== "awaiting_payment") {
    await store.updateShipment(app.id, shipment.id, { paymentStatus: "paid", orderId: order.id, updatedAt: now }, { statuses: [shipment.status] });
    return null;
  }
  const timeline = [...shipment.timeline, stage("pending", now, "payment")];
  const changed = await store.updateShipment(
    app.id,
    shipment.id,
    { status: "pending", paymentStatus: "paid", orderId: order.id, timeline, updatedAt: now },
    { statuses: ["awaiting_payment"] },
  );
  return changed ? { ...shipment, status: "pending", paymentStatus: "paid", orderId: order.id, timeline, updatedAt: now } : null;
}
