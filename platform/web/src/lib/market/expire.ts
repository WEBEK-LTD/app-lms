import type { DataStore } from "../data/store";
import type { MarketOrder } from "../data/types";
import { cancelMarketOrder } from "./flow";

/**
 * 115.24 Online orders whose payment was never completed don't hold their
 * stock: after UNPAID_MINUTES still awaiting payment, an order is cancelled
 * with the words the customer sees, and gives back its stock, its coupon's
 * use and the wallet's part (flow.ts cancelMarketOrder). Each order moves
 * only from "awaiting payment", so two runs at once cancel it once.
 */
export const UNPAID_MINUTES = 30;
export const UNPAID_NOTE = "Payment not completed";

export async function expireUnpaidMarketOrders(store: DataStore, appId: string, now: Date): Promise<number> {
  const app = await store.getAppById(appId);
  if (!app) return 0;
  const before = new Date(now.getTime() - UNPAID_MINUTES * 60_000);
  let expired = 0;
  for (;;) {
    const { items } = await store.listMarketOrders({ appId, statuses: ["awaiting_payment"], createdBefore: before, order: "oldest", limit: 100, offset: 0 });
    if (!items.length) return expired;
    let moved = 0;
    for (const order of items) {
      const done = await cancelMarketOrder({ store, app, now }, order, "owner");
      if (!done.ok) continue;
      moved += 1;
      // Said by the system, with the reason the customer sees.
      const timeline = done.order.timeline.map((s, i, all) => (i === all.length - 1 ? { ...s, by: "system" as const } : s));
      await store.updateMarketOrder(appId, order.id, { rejection: { reason: "other", note: UNPAID_NOTE }, timeline, updatedAt: now } satisfies Partial<MarketOrder>, { statuses: ["cancelled"] });
    }
    expired += moved;
    // Another run took this page: the next one is what's left.
    if (items.length < 100) return expired;
  }
}
