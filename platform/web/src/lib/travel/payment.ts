import { hmacSha256, sha256Hex } from "../crypto/tokens";
import { PAY_LINK_MINUTES, payLinkExpired } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, TravelBooking, TravelBookingPatch, TravelFlight } from "../data/types";
import { payUrlFor } from "../delivery/payment";
import { fitsCheck, legsOf, settledPayment } from "./bookings";
import { dueCents } from "./pricing";
import { HOLD_MINUTES } from "./settings";

/**
 * 126 A booking paid now is paid like a shop's order: an order with one
 * line for what is due (its productId is the booking's ID) on the
 * company's own payment page (its own gateway, into its own account; no
 * commission to Yallapp). Paying all of it confirms the booking.
 */

/**
 * 126.10 A pay link's token, made again from the order (the app's signing
 * key, the booking, when the order was made and its amount): the open
 * order's link is the same link each time it is asked for.
 */
function payToken(secret: string, appId: string, bookingId: number, createdAt: Date, cents: number): string {
  return hmacSha256(hmacSha256(secret, `travel-pay:${appId}`), `${bookingId}.${createdAt.getTime()}.${cents}`);
}

/**
 * The link to pay what is due. 126.10 An open order for that amount (not
 * paid, its link not expired) is reused rather than another made, and the
 * hold is given the payment page's time only up to HOLD_MINUTES +
 * PAY_LINK_MINUTES after booking (each tap doesn't hold the rooms longer).
 */
export async function travelPayLink(store: DataStore, app: App, booking: TravelBooking, platformUrl: string, now: Date, secret: string): Promise<{ url: string; expiresAt: Date; order: CatalogOrder }> {
  const cents = dueCents(booking);
  const open = booking.orderId ? await store.getCatalogOrder(app.id, booking.orderId) : null;
  let order: CatalogOrder;
  if (open && open.status === "pending" && !open.manualPayment && !payLinkExpired(open, now) && open.totalCents === cents && open.lines[0]?.productId === booking.id) {
    order = open;
  } else {
    const name = booking.stay ? `${booking.stay.hotelName}: ${booking.reference}` : `${booking.flight?.outbound.number ?? "Flight"}: ${booking.reference}`;
    order = await store.createCatalogOrder({
      lang: booking.lang,
      appId: app.id,
      tokenHash: sha256Hex(payToken(secret, app.id, booking.id, now, cents)),
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
  }
  // Paying gives the hold the payment page's time, up to a cap after booking.
  let holdUntil = booking.holdUntil;
  if (booking.status === "awaiting_payment") {
    const cap = booking.createdAt.getTime() + (HOLD_MINUTES + PAY_LINK_MINUTES) * 60_000;
    holdUntil = new Date(Math.max(booking.holdUntil?.getTime() ?? 0, Math.min(cap, now.getTime() + PAY_LINK_MINUTES * 60_000)));
  }
  if (order.id !== booking.orderId || holdUntil?.getTime() !== booking.holdUntil?.getTime()) {
    await store.updateTravelBooking(app.id, booking.id, { orderId: order.id, holdUntil }, { statuses: ["awaiting_payment", "confirmed"] }, now);
  }
  const token = payToken(secret, app.id, booking.id, order.createdAt, order.totalCents);
  return { url: payUrlFor(platformUrl, token), expiresAt: new Date(order.createdAt.getTime() + PAY_LINK_MINUTES * 60_000), order };
}

/** Whether a booking whose hold ended still fits: its room and flights read again, for the store's lock. */
async function fitsNow(store: DataStore, app: App, booking: TravelBooking): Promise<ReturnType<typeof fitsCheck>> {
  const room = booking.stay ? await store.getTravelRoom(app.id, booking.stay.roomId) : null;
  const flights = new Map<number, TravelFlight>();
  for (const { part } of legsOf(booking)) {
    const f = await store.getTravelFlight(app.id, part.flightId);
    if (f) flights.set(f.id, f);
  }
  return fitsCheck(room, flights);
}

const holdEnded = (booking: TravelBooking, now: Date) => booking.status === "awaiting_payment" && (!booking.holdUntil || booking.holdUntil.getTime() <= now.getTime());

/**
 * A paid order of a travel app: its booking is paid (what the order paid is
 * added) and, once all of it is paid, confirmed. A booking released
 * meanwhile keeps the payment as a refund the company makes. Returns the
 * booking when it changed.
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
  const changes = [...booking.changes, { at: now.toISOString(), what: `Paid ${order.totalCents / 100} ${order.currency} online` }];
  // 126.10 Less than it costs now (its dates or seats changed while the link was open): still awaiting the rest, its hold kept.
  if (booking.status === "awaiting_payment" && paid < booking.totalCents) {
    const r = await store.updateTravelBooking(app.id, booking.id, { paidCents: paid, ...settledPayment({ paidCents: paid, paymentStatus: booking.paymentStatus }, booking.totalCents), changes }, { statuses: ["awaiting_payment"] }, now);
    return r.ok ? r.booking : null;
  }
  // Paid after its hold ended: confirmed only when the rooms and seats are still free.
  const check = holdEnded(booking, now) ? await fitsNow(store, app, booking) : undefined;
  const r = await store.updateTravelBooking(
    app.id,
    booking.id,
    { paidCents: paid, status: "confirmed", holdUntil: null, ...settledPayment({ paidCents: paid, paymentStatus: booking.paymentStatus }, booking.totalCents), changes },
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

/**
 * 126.10 The company marks a booking paid (at the hotel, by bank transfer):
 * confirmed and settled. One whose hold ended is confirmed only when its
 * rooms and seats are still free (as a payment in the app).
 */
export async function markTravelPaid(store: DataStore, app: App, booking: TravelBooking, now: Date) {
  const patch: TravelBookingPatch = {
    status: booking.status === "awaiting_payment" ? "confirmed" : booking.status,
    holdUntil: null,
    paymentStatus: "paid",
    paidCents: booking.totalCents,
    changes: [...booking.changes, { at: now.toISOString(), what: "Marked as paid by the company" }],
  };
  const check = holdEnded(booking, now) ? await fitsNow(store, app, booking) : undefined;
  return store.updateTravelBooking(app.id, booking.id, patch, { statuses: ["awaiting_payment", "confirmed", "completed"], ...(check ? { check } : {}) }, now);
}
