import type { DataStore } from "../data/store";
import type { App, CatalogOrder, CatalogOrderStatus, FulfilmentStatus } from "../data/types";
import type { sendPush, ServiceAccount } from "../hosted/push";
import type { ProviderUrls } from "../payments/provider";
import { canMoveTo, nextStep } from "./fulfilment";
import { moveOrder } from "./kitchen";
import { approvePayout } from "./payment";
import { accountForOrder } from "./settings";

/**
 * Moving a paid order on, for Dashboard › Orders and the Kitchen, and 58 the
 * Owner API: the same steps and the same consequences from both.
 */

// 47 Refunds go through the Refund form (app/actions/refunds.ts), which records them: never a bare status.
const NEXT_STATUSES: Partial<Record<CatalogOrderStatus, CatalogOrderStatus[]>> = {
  processing: ["completed", "cancelled"],
};

/** 26 A restaurant's order in the kitchen moves with the kitchen's steps instead. */
export function inKitchen(order: Pick<CatalogOrder, "fulfilment" | "status">): boolean {
  return Boolean(order.fulfilment) && order.status === "processing";
}

/** What the order's buttons offer now: the kitchen's next step and Cancel, or Completed and Cancel. */
export function nextOrderStatuses(order: CatalogOrder): string[] {
  if (inKitchen(order)) {
    const current = order.fulfilmentStatus;
    if (!current || !order.fulfilment) return [];
    const next = nextStep(current, order.fulfilment.type);
    return [...(next ? [next] : []), ...(canMoveTo(current, "cancelled", order.fulfilment.type) ? ["cancelled"] : [])];
  }
  return NEXT_STATUSES[order.status] ?? [];
}

export interface OrderMoveDeps {
  store: DataStore;
  app: App;
  now: Date;
  key: Buffer;
  urls: ProviderUrls;
  /** The app's push account, to tell a restaurant's customer (null: the inbox only). */
  account: ServiceAccount | null;
  send?: typeof sendPush;
}

/**
 * Moves an order to `status` when its steps allow it: an order in progress
 * to completed or cancelled; 26 a restaurant's order through the kitchen
 * (the customer is told). Completing a marketplace order releases the
 * shop's share. False (nothing changed) otherwise.
 */
export async function changeOrderStatus(deps: OrderMoveDeps, order: CatalogOrder, status: string): Promise<boolean> {
  const { store, app, now } = deps;
  let moved = false;
  if (inKitchen(order)) {
    moved = (await moveOrder({ store, app, order, to: status as FulfilmentStatus, account: deps.account, now, send: deps.send })).moved;
  } else if (NEXT_STATUSES[order.status]?.includes(status as CatalogOrderStatus)) {
    await store.updateCatalogOrder(app.id, order.id, { status: status as CatalogOrderStatus, updatedAt: now });
    moved = true;
  }
  // A completed marketplace order releases the shop's share; our team can also do it from the admin.
  if (moved && status === "completed" && order.commissionCents !== null && !order.payoutApprovedAt) {
    const account = await accountForOrder(store, app, order, deps.key);
    if (account) await approvePayout({ store, app, account, urls: deps.urls, now, order });
  }
  return moved;
}
