import { randomToken, sha256Hex } from "../crypto/tokens";
import { PAY_LINK_MINUTES } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, Ride } from "../data/types";
import { payUrlFor } from "../delivery/payment";
import { rideReference } from "./service";

/**
 * 105.2 A card ride is paid once it ends, like a delivery (lib/delivery/
 * payment.ts): a shop order with one line for the ride's fare (its productId
 * is the ride's ID) on the company's payment page, into the company's own
 * account.
 */

/** A new order and payment link for the ride's fare, good for an hour. */
export async function ridePayLink(store: DataStore, app: App, ride: Ride, platformUrl: string, now: Date): Promise<{ url: string; expiresAt: Date; order: CatalogOrder }> {
  const token = randomToken(24);
  const cents = ride.finalCents ?? ride.quotedCents;
  const paid = await store.createCatalogOrder({
    lang: ride.lang,
    appId: app.id,
    tokenHash: sha256Hex(token),
    userId: ride.userId,
    status: "pending",
    lines: [
      {
        productId: ride.id,
        name: `${ride.vehicleTypeName}: ${rideReference(ride)}`.slice(0, 200),
        quantity: 1,
        unitCents: cents,
        imageAssetId: null,
        // A ride is a service in the physical world, nothing to ship.
        digital: true,
      },
    ],
    subtotalCents: cents,
    shippingCents: 0,
    totalCents: cents,
    currency: ride.currency,
    customer: null,
    paymentId: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
  });
  await store.updateRide(app.id, ride.id, { orderId: paid.id, updatedAt: now });
  return { url: payUrlFor(platformUrl, token), expiresAt: new Date(now.getTime() + PAY_LINK_MINUTES * 60_000), order: paid };
}

/**
 * A paid order of a ride company: its ride is paid (once, whichever of its
 * links was paid). Returns the ride when it is now paid, so the fee it
 * carried is settled too.
 */
export async function payRide(store: DataStore, app: App, paid: CatalogOrder, now: Date): Promise<Ride | null> {
  if (app.connector?.kind !== "rides") return null;
  const id = paid.lines[0]?.productId;
  const ride = id ? await store.getRide(app.id, id) : null;
  await store.updateCatalogOrder(app.id, paid.id, { status: "completed", updatedAt: now });
  if (!ride || ride.paymentMethod !== "card" || ride.paymentStatus !== "unpaid" || ride.status !== "completed") return null;
  const changed = await store.updateRide(app.id, ride.id, { paymentStatus: "paid", orderId: paid.id, updatedAt: now }, { statuses: ["completed"] });
  return changed ? { ...ride, paymentStatus: "paid", orderId: paid.id, updatedAt: now } : null;
}
