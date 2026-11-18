import type { CatalogOrder, OrderStageRefund } from "../data/types";
import { awaitingManualPayment } from "./manual";
import { changeOrderStatus, type OrderMoveDeps } from "./order-status";
import { refundAfterFailedDelivery, type StageRefundDeps } from "./stage-refunds";

/**
 * 175 Cancel order on a paid order (Dashboard › Orders, Yallapp Business):
 * the owner confirms first and chooses, every time, between "Cancel and
 * refund" (all that's left of the payment, through the order's payment
 * gateway when it refunds by itself, else the order shows Needs a refund
 * for the owner) and "Cancel without refund". Nothing is refunded without
 * that choice. Either way the units go back in stock (changeOrderStatus),
 * the customer is told (a signed-in one in the app, a guest by email), and
 * the order leaves the paid orders and the revenue of Analytics.
 */

/** What can still go back if the order is cancelled now: what's left of its payment; null when nothing was paid, or nothing is left. */
export function cancelRefundCents(order: Pick<CatalogOrder, "status" | "paidAt" | "totalCents" | "refundedCents" | "stageRefund" | "manualPayment">): number | null {
  if (order.status !== "processing" || !order.paidAt || order.stageRefund || awaitingManualPayment(order as CatalogOrder)) return null;
  const left = order.totalCents - (order.refundedCents ?? 0);
  return left > 0 ? left : null;
}

/** Whether cancelling this order needs the owner's choice of refunding it or not. */
export function cancelNeedsChoice(order: Parameters<typeof cancelRefundCents>[0]): boolean {
  return cancelRefundCents(order) !== null;
}

export type CancelRefundChoice = boolean | null;

/** Reads the choice sent with a cancel: "yes"/true, "no"/false; null when none was sent. */
export function readRefundChoice(value: unknown): CancelRefundChoice {
  if (value === true || value === "yes" || value === "true") return true;
  if (value === false || value === "no" || value === "false") return false;
  return null;
}

/**
 * Cancels the order with the owner's choice. `refund` null (no choice sent:
 * an older Yallapp Business) keeps the rule from before: the money goes back
 * only after a failed or returned delivery (132), as that app's own sheet
 * says. False when the order couldn't be cancelled.
 */
export async function cancelOrder(
  deps: OrderMoveDeps,
  refunds: StageRefundDeps,
  order: CatalogOrder,
  refund: CancelRefundChoice,
): Promise<{ moved: boolean; refund: OrderStageRefund | null }> {
  const moved = await changeOrderStatus(deps, order, "cancelled");
  if (!moved || refund === false) return { moved, refund: null };
  const cancelled = await deps.store.getCatalogOrder(deps.app.id, order.id);
  if (!cancelled) return { moved, refund: null };
  return { moved, refund: await refundAfterFailedDelivery(refunds, cancelled, { chosen: refund === true }) };
}
