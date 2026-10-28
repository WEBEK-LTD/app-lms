import type { FoodOrderStatus, Shipment, ShipmentStatus } from "../data/types";
import type { DeliveryNotifyDeps } from "../delivery/notify";
import { tellFoodCustomer } from "./notify";
import { DEFAULT_FOOD_TIMEZONE, foodStage } from "./service";

/**
 * 105.1 A food order follows its courier job: picked up, on the way,
 * delivered (cash is paid then) or failed, and the customer hears of each.
 * Called by the delivery flow after a job linked to an order moves; it reads
 * nothing of the delivery flow, so the two don't import each other.
 */

const FOLLOWS: Partial<Record<ShipmentStatus, FoodOrderStatus>> = {
  picked_up: "picked_up",
  on_the_way: "on_the_way",
  delivered: "delivered",
  failed: "failed",
};

export async function followCourierJob(deps: DeliveryNotifyDeps, shipment: Shipment): Promise<void> {
  if (!shipment.foodOrderId) return;
  const next = FOLLOWS[shipment.status];
  if (!next) return;
  const order = await deps.store.getFoodOrder(deps.app.id, shipment.foodOrderId);
  if (!order || order.status === next || ["delivered", "rejected", "cancelled"].includes(order.status)) return;
  const patch = {
    status: next,
    timeline: [...order.timeline, foodStage(next, deps.now, "courier")],
    ...(next === "delivered" && order.paymentMethod === "cash" && order.paymentStatus === "unpaid" ? { paymentStatus: "paid" as const } : {}),
    updatedAt: deps.now,
  };
  if (!(await deps.store.updateFoodOrder(deps.app.id, order.id, patch, { statuses: [order.status] }))) return;
  const settings = await deps.store.getDeliverySettings(deps.app.id);
  await tellFoodCustomer(deps, { ...order, ...patch }, settings?.timezone ?? DEFAULT_FOOD_TIMEZONE);
}
