import { randomToken, sha256Hex } from "../crypto/tokens";
import { PAY_LINK_MINUTES } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, TravelBooking, TravelFlight } from "../data/types";
import { payUrlFor } from "../delivery/payment";
import { fitsCheck, legsOf } from "./bookings";
import { dueCents } from "./pricing";

/**
 * 126 A booking paid now is paid like a shop's order: an order with one
 * line for what is due (its productId is the booking's ID) on the
 * company's own payment page (its own gateway, into its own account; no
 * commission to Yallapp). Paying it confirms the booking.
 */

export async function travelPayLink(store: DataStore, app: App, booking: TravelBooking, platformUrl: string, now: Date): Promise<{ url: string; expiresAt: Date; order: CatalogOrder }> {
  const token = randomToken(24);
  const cents = dueCents(booking);
  const name = booking.stay ? `${booking.stay.hotelName}: ${booking.reference}` : `${booking.flight?.outbound.number ?? "Flight"}: ${booking.reference}`;
  const order = await store.createCatalogOrder({
    lang: booking.lang,
    appId: app.id,
    tokenHash: sha256Hex(token),
    userId: booking.userId,
    status: "pending",
    lines: [{ productId: booking.id, name: name.slice(0, 200), quantity: 1, unitCents: cents, imageAssetId: null, digital: true }],
    subtotalCents: cents,
    shippingCents: 0,
    totalCents: cents,
    currency: booking.currency,
    customer: null,
    paymentId: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
  });
  // Paying gives the hold the payment page's time.
  const holdUntil = booking.status === "awaiting_payment" ? new Date(Math.max(booking.holdUntil?.getTime() ?? 0, now.getTime() + PAY_LINK_MINUTES * 60_000)) : booking.holdUntil;
  await store.updateTravelBooking(app.id, booking.id, { orderId: order.id, holdUntil }, { statuses: ["awaiting_payment", "confirmed"] }, now);
  return { url: payUrlFor(platformUrl, token), expiresAt: new Date(now.getTime() + PAY_LINK_MINUTES * 60_000), order };
}

/**
 * A paid order of a travel app: its booking is paid (what the order paid is
 * added) and confirmed. A booking released meanwhile keeps the payment as a
 * refund the company makes. Returns the booking when it changed.
 */
export async function payTravelBooking(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<TravelBooking | null> {
  if (app.connector?.kind !== "travel") return null;
  const id = order.lines[0]?.productId;
  const booking = id ? await store.getTravelBooking(app.id, id) : null;
  await store.updateCatalogOrder(app.id, order.id, { status: "completed", updatedAt: now });
  if (!booking) return null;
  const paid = booking.paidCents + order.totalCents;
  if (booking.status === "cancelled" || booking.status === "completed") {
    const r = await store.updateTravelBooking(app.id, booking.id, { paidCents: paid, refundCents: booking.refundCents + order.totalCents, paymentStatus: "refund_due" }, { statuses: [booking.status] }, now);
    return r.ok ? r.booking : null;
  }
  // Paid after its hold ended: confirmed only when the rooms and seats are still free.
  const expired = booking.status === "awaiting_payment" && (!booking.holdUntil || booking.holdUntil.getTime() <= now.getTime());
  let check: ReturnType<typeof fitsCheck> | undefined;
  if (expired) {
    const room = booking.stay ? await store.getTravelRoom(app.id, booking.stay.roomId) : null;
    const flights = new Map<number, TravelFlight>();
    for (const { part } of legsOf(booking)) {
      const f = await store.getTravelFlight(app.id, part.flightId);
      if (f) flights.set(f.id, f);
    }
    check = fitsCheck(room, flights);
  }
  const r = await store.updateTravelBooking(
    app.id,
    booking.id,
    {
      paidCents: paid,
      status: "confirmed",
      holdUntil: null,
      paymentStatus: paid > booking.totalCents ? "refund_due" : "paid",
      refundCents: Math.max(booking.refundCents, paid - booking.totalCents),
      changes: [...booking.changes, { at: now.toISOString(), what: `Paid ${order.totalCents / 100} ${order.currency} online` }],
    },
    { statuses: ["awaiting_payment", "confirmed"], ...(check ? { check } : {}) },
    now,
  );
  if (r.ok) return r.booking;
  if (r.reason === "not_available") {
    // Taken meanwhile: released, and the payment is the company's to refund.
    const released = await store.updateTravelBooking(
      app.id,
      booking.id,
      { status: "cancelled", holdUntil: null, paidCents: paid, refundCents: paid, paymentStatus: "refund_due", cancellation: { at: now.toISOString(), by: "unpaid", reason: "Paid after the hold ended; no longer free." } },
      { statuses: ["awaiting_payment"] },
      now,
    );
    return released.ok ? released.booking : null;
  }
  return null;
}
