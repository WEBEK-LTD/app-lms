/**
 * 132.160 Where an order is on its journey, as a timeline that follows the
 * person's newest order (`timeline.source: "latest_order"`) draws it: four
 * steps, ordered or paid → prepared → on its way → delivered, spread over the
 * entries the owner drew. Read from the app API's `Order` (`GET /me/orders`):
 * its delivery `stage` first (a hosted store's or a WordPress shop's), then a
 * carrier's `shipment`, then a restaurant's step. The app draws the same
 * (mobile/lib/modules/shared/account/order_journey.dart); Studio's canvas
 * shows a sample order out for delivery.
 */

export const ORDER_JOURNEY_STEPS = ["ordered", "prepared", "on_its_way", "delivered"] as const;
export type OrderJourneyStep = (typeof ORDER_JOURNEY_STEPS)[number];

/** What the journey reads of an app API `Order`. */
export interface JourneyOrder {
  status: string;
  stage?: { code: string } | null;
  shipment?: unknown;
  fulfilment?: unknown;
  fulfilment_status?: string | null;
  created_at?: string;
}

/** Each delivery stage (lib/data/types.ts `DELIVERY_STAGES`) to its step. */
export const STAGE_JOURNEY: Record<string, OrderJourneyStep> = {
  preparing: "prepared",
  postponed: "prepared",
  returned: "prepared",
  shipped: "on_its_way",
  failed: "on_its_way",
  delivered: "delivered",
};

/** Still on its way: placed or paid, not yet completed, cancelled, refunded or failed. */
export function orderInProgress(order: Pick<JourneyOrder, "status">): boolean {
  return order.status === "pending" || order.status === "processing" || order.status === "on_hold";
}

export function orderJourneyStep(order: JourneyOrder): OrderJourneyStep {
  const byStage = order.stage ? STAGE_JOURNEY[order.stage.code] : undefined;
  if (byStage) return byStage;
  if (order.status === "completed") return "delivered";
  if (order.shipment) return "on_its_way";
  const step = order.fulfilment_status ?? null;
  // A restaurant's order (it has how it's collected); a WordPress shop's "preparing" is only its paid order.
  if (order.fulfilment) {
    if (step === "preparing" || step === "ready") return "prepared";
    if (step === "out_for_delivery") return "on_its_way";
    if (step === "completed") return "delivered";
    return "ordered";
  }
  return step === "out_for_delivery" ? "on_its_way" : "ordered";
}

/** The person's newest order still on its way, or null. */
export function latestOrderOnItsWay<T extends JourneyOrder>(orders: readonly T[]): T | null {
  let latest: T | null = null;
  for (const o of orders) {
    if (!orderInProgress(o)) continue;
    if (!latest || Date.parse(o.created_at ?? "") > Date.parse(latest.created_at ?? "")) latest = o;
  }
  return latest;
}

/** The entry to make active for `step` among `count` entries; -1 for none. */
export function journeyEntryIndex(step: OrderJourneyStep, count: number): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const last = ORDER_JOURNEY_STEPS.length - 1;
  return Math.min(count - 1, Math.max(0, Math.round((ORDER_JOURNEY_STEPS.indexOf(step) * (count - 1)) / last)));
}

/** Studio's canvas: a sample order out for delivery. */
export const SAMPLE_JOURNEY_ORDER: JourneyOrder = { status: "processing", stage: { code: "shipped" } };
