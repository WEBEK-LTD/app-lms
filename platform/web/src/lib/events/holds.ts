import type { DataStore } from "../data/store";
import type { App, CatalogOrder, EventTicket, OwnerNotice } from "../data/types";
import { orderNumber } from "../catalog/settings";
import { appLabel } from "../app/label";
import { PaymentError } from "../payments/errors";

/**
 * 49 Places held for a ticket payment end with the provider's payment page
 * (roadmap 37.10):
 *
 * - The checkout link holds the places as long as the payment page link
 *   works (`HOLD_MINUTES`, the pay link's hour).
 * - When the buyer starts the card payment, the hold is set to when the
 *   provider's page stops taking it: iyzico's token (`tokenExpireTime`, 30
 *   minutes), Kashier's session (`expireAt`, which we set to 30 minutes),
 *   plus `SETTLE_GRACE_MINUTES` for the provider's confirmation to reach
 *   us. Fawaterk's invoice takes no expiry to the minute (it may be paid
 *   later, at a Fawry outlet for one): its hold is the same 30 minutes.
 * - A payment confirmed after the hold ended gets its tickets only while the
 *   places are still free (counted atomically, like a claim). Otherwise the
 *   tickets are cancelled, the order stays paid, the buyer's page says the
 *   organiser will refund them, and the owner gets a notice to refund it.
 *   We never sell a place twice and never keep a payment silently.
 * - A payment can't start once the hold has ended: the buyer goes back to
 *   the app for new places.
 */

/** How long a provider's payment page takes a payment, as we set it or the provider says. */
export const PROVIDER_PAGE_MINUTES = 30;
/** Time for a provider's confirmation to arrive after its page closes. */
export const SETTLE_GRACE_MINUTES = 5;

const MINUTE = 60_000;

/** The places of these tickets were held and the hold has ended: none is issued, none still held. */
export function holdEnded(tickets: readonly Pick<EventTicket, "status" | "holdUntil">[], now: Date): boolean {
  return (
    tickets.length > 0 &&
    tickets.every((t) => t.status === "pending") &&
    tickets.every((t) => t.holdUntil === null || t.holdUntil.getTime() <= now.getTime())
  );
}

/** When the provider's page should stop taking the payment, sent to providers that take one (Kashier). */
export function providerPageExpiry(now: Date): Date {
  return new Date(now.getTime() + PROVIDER_PAGE_MINUTES * MINUTE);
}

/** Until when the places are held once the payment started: the page's end (or ours), plus the grace. */
export function paymentHoldUntil(pageExpiresAt: Date | null, now: Date): Date {
  return new Date((pageExpiresAt ?? providerPageExpiry(now)).getTime() + SETTLE_GRACE_MINUTES * MINUTE);
}

/** The buyer's places were released before they started paying. */
export class HoldEndedError extends PaymentError {
  constructor() {
    super("The places held for this order were released.");
    this.name = "HoldEndedError";
  }
}

/** Refuses to start a payment for an order whose places were released. Orders without tickets pass. */
export async function checkTicketHold(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<void> {
  if (app.connector?.kind !== "events") return;
  if (holdEnded(await store.listTickets({ appId: app.id, orderId: order.id }), now)) throw new HoldEndedError();
}

/** Holds the order's places until the provider's page ends (plus the grace). */
export async function holdForPayment(store: DataStore, app: App, order: CatalogOrder, pageExpiresAt: Date | null, now: Date): Promise<number> {
  if (app.connector?.kind !== "events") return 0;
  return store.holdOrderTickets(app.id, order.id, paymentHoldUntil(pageExpiresAt, now), now);
}

/** A paid order whose tickets were released because the event filled up after its hold ended. */
export function paidWithoutPlaces(order: Pick<CatalogOrder, "status">, tickets: readonly Pick<EventTicket, "status">[]): boolean {
  return (order.status === "processing" || order.status === "completed") && tickets.length > 0 && tickets.every((t) => t.status === "cancelled");
}

/** Tells the owner to refund a payment that came after the places were gone. */
export async function noticeRefundDue(store: DataStore, app: App, order: CatalogOrder, now: Date, baseUrl: string): Promise<OwnerNotice | null> {
  const number = orderNumber(order);
  return store.createOwnerNotice({
    clientId: app.clientId,
    appId: app.id,
    kind: "ticket_refund_due",
    dedupeKey: `ticket_refund_due:${order.id}`,
    title: `${appLabel(app)}: refund order ${number}`,
    body: `The payment for order ${number} arrived after the places held for it were released, and the event had no places left, so no tickets were issued. Refund the payment from your payment provider's panel; the buyer has been told you will.`,
    linkUrl: `${baseUrl.replace(/\/+$/, "")}/dashboard/orders`,
    linkLabel: "See orders",
    tone: "warn",
    createdAt: now,
    emailedAt: null,
    dismissedAt: null,
    resolvedAt: null,
  });
}
