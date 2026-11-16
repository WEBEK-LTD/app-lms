import type { App, CatalogOrder, DeliverySlot, DeliveryStage, FailedNextStep, FailedReason, OrderStageEntry, PostponeReason } from "../data/types";
import { DELIVERY_STAGES, FAILED_NEXT_STEPS, FAILED_REASONS, POSTPONE_REASONS } from "../data/types";
import { notifyOrderStage } from "../hosted/auto-notifications";
import { deliveryOf, nextDays, shopToday, slotLabel, slotStarted } from "../selling/delivery";
import { awaitingManualPayment } from "./manual";
import { changeOrderStatus, type OrderMoveDeps } from "./order-status";

/**
 * 132 A store order's delivery stages, after it is paid: Preparing, Shipped
 * (out for delivery, with the courier and a tracking link when the shop has
 * them), Postponed (another day and slot, and why), a failed attempt (why,
 * and what's next: another day, back to the shop, or the order cancelled),
 * Returned to shop, and Delivered, which completes the order. Every change
 * is kept on the order (`stageLog`): who, when, why and the team's note,
 * which the customer never sees. The customer is told at Shipped,
 * Postponed, a failed attempt and Delivered, in the app's language.
 *
 * Yallapp's own products only: a WordPress shop has the same stages as
 * WooCommerce statuses (the plugin); Shopify and the other connected
 * platforms keep their orders, which Yallapp only watches (order-watch).
 */

/** Where each stage may go next; "none" is an order no stage was given yet. */
export const STAGE_NEXT: Record<DeliveryStage | "none", readonly DeliveryStage[]> = {
  none: ["preparing", "shipped", "postponed", "delivered"],
  preparing: ["shipped", "postponed", "delivered"],
  shipped: ["delivered", "postponed", "failed"],
  postponed: ["preparing", "shipped", "postponed", "delivered"],
  failed: ["shipped", "postponed", "returned"],
  returned: ["shipped", "postponed"],
  delivered: [],
};

export const STAGE_LIMITS = { note: 500, courierName: 80, courierPhone: 30, trackingUrl: 500, maxDays: 60 } as const;

/** Whether the order's delivery is followed in stages: a paid store order with something to deliver, not a restaurant's. */
export function followsStages(app: Pick<App, "connector">, order: Pick<CatalogOrder, "lines" | "fulfilment">): boolean {
  // A restaurant's order moves with its kitchen instead.
  if (app.connector?.kind !== "catalog" || order.fulfilment) return false;
  return order.lines.some((l) => !l.digital);
}

/** What the order's stage buttons offer now: none once it is completed, cancelled or refunded, or still waiting for its payment. */
export function nextStages(app: Pick<App, "connector">, order: CatalogOrder): DeliveryStage[] {
  if (order.status !== "processing" || awaitingManualPayment(order) || !followsStages(app, order)) return [];
  return [...STAGE_NEXT[order.deliveryStage ?? "none"]];
}

export interface StageInput {
  stage: DeliveryStage;
  reason: PostponeReason | FailedReason | null;
  note: string | null;
  courierName: string | null;
  courierPhone: string | null;
  trackingUrl: string | null;
  date: string | null;
  slotId: string | null;
  next: FailedNextStep | null;
}

type Parsed = { ok: true; input: StageInput } | { ok: false; errors: Record<string, string> };

const text = (value: unknown, max: number): string | null => {
  const s = typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
  return s ? s.slice(0, max) : null;
};
const oneLine = (value: unknown, max: number) => text(typeof value === "string" ? value.replace(/\s+/g, " ") : value, max);

/**
 * The request's fields (the Owner API's snake_case, the dashboard form's
 * too): `stage`, `reason`, `note`, `courier_name`, `courier_phone`,
 * `tracking_url`, `date`, `slot_id`, `next_step`.
 */
export function parseStageInput(raw: Record<string, unknown>): Parsed {
  const errors: Record<string, string> = {};
  const stage = raw.stage;
  if (typeof stage !== "string" || !(DELIVERY_STAGES as readonly string[]).includes(stage)) return { ok: false, errors: { stage: "Choose a delivery stage." } };
  const s = stage as DeliveryStage;
  const note = text(raw.note, STAGE_LIMITS.note);
  const rawReason = typeof raw.reason === "string" ? raw.reason : "";
  const rawNext = typeof raw.next_step === "string" ? raw.next_step : "";
  let reason: StageInput["reason"] = null;
  let next: FailedNextStep | null = null;
  if (s === "postponed") {
    if (!(POSTPONE_REASONS as readonly string[]).includes(rawReason)) errors.reason = "Choose why it is postponed.";
    else reason = rawReason as PostponeReason;
  }
  if (s === "failed") {
    if (!(FAILED_REASONS as readonly string[]).includes(rawReason)) errors.reason = "Choose why it couldn't be delivered.";
    else reason = rawReason as FailedReason;
    if (!(FAILED_NEXT_STEPS as readonly string[]).includes(rawNext)) errors.next_step = "Choose what happens next.";
    else next = rawNext as FailedNextStep;
  }
  if (reason === "other" && !note) errors.note = "Write the reason in the note.";
  const date = s === "postponed" || next === "retry" ? text(raw.date, 10) : null;
  if ((s === "postponed" || next === "retry") && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))) errors.date = "Choose the new delivery day.";
  const trackingUrl = s === "shipped" ? text(raw.tracking_url, STAGE_LIMITS.trackingUrl) : null;
  if (trackingUrl && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(trackingUrl)) errors.tracking_url = "Enter the tracking link starting with https://.";
  const courierPhone = s === "shipped" ? oneLine(raw.courier_phone, STAGE_LIMITS.courierPhone) : null;
  if (courierPhone && !/^\+?[0-9 ()-]{5,30}$/.test(courierPhone)) errors.courier_phone = "Enter the courier's phone number.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    input: {
      stage: s,
      reason,
      note,
      courierName: s === "shipped" ? oneLine(raw.courier_name, STAGE_LIMITS.courierName) : null,
      courierPhone,
      trackingUrl,
      date,
      slotId: date ? text(raw.slot_id, 8) : null,
      next,
    },
  };
}

export type StageResult = { ok: true; order: CatalogOrder } | { ok: false; status: 400 | 409; code: string; message: string; errors?: Record<string, string> };

/** Who moves it, as the stage keeps them. */
export interface StageActor {
  userId: string | null;
  name: string;
  via: "business" | "dashboard" | "api";
}

/** The day and slot a postponed or retried delivery moves to: a day from today, one of the shop's slots that hasn't started. */
function newDay(app: App, order: CatalogOrder, input: StageInput, now: Date): { ok: true; slot: DeliverySlot | null } | { ok: false; errors: Record<string, string> } {
  // The shop's delivery days when they're on; a gift's always (the gift checkout's); else its slots to choose from, none needed.
  const own = deliveryOf(app) ?? (order.delivery?.sender || order.delivery?.recipient ? deliveryOf(app, true) : null);
  const settings = own ?? deliveryOf(app, true)!;
  const today = shopToday(settings, now).date;
  const last = nextDays(today, STAGE_LIMITS.maxDays + 1).at(-1)!;
  if (input.date! < today) return { ok: false, errors: { date: "Choose today or a later day." } };
  if (input.date! > last) return { ok: false, errors: { date: "Choose a day in the next 60 days." } };
  if (!input.slotId) return own?.slots.length ? { ok: false, errors: { slot_id: "Choose a delivery time." } } : { ok: true, slot: null };
  const slot = settings.slots.find((x) => x.id === input.slotId);
  if (!slot) return { ok: false, errors: { slot_id: "Choose one of the shop's delivery times." } };
  if (slotStarted(settings, slot, input.date!, now)) return { ok: false, errors: { slot_id: "That delivery time has started. Please choose a later one." } };
  return { ok: true, slot };
}

/**
 * Moves the order's delivery to `input.stage` when its stages allow it, keeps
 * the change, moves the delivery day for a postponed or retried one, and
 * tells the customer. Delivered completes the order (as Mark as completed:
 * its points, a marketplace share's release); a failed attempt whose next
 * step is to cancel cancels it (as Cancel order: no refund by itself).
 */
export async function setOrderStage(deps: OrderMoveDeps, order: CatalogOrder, input: StageInput, actor: StageActor | null): Promise<StageResult> {
  const { store, app, now } = deps;
  if (!nextStages(app, order).includes(input.stage)) {
    return { ok: false, status: 409, code: "invalid_stage", message: "This order's delivery can't move to that stage." };
  }
  let slot: DeliverySlot | null = null;
  if (input.date) {
    const day = newDay(app, order, input, now);
    if (!day.ok) return { ok: false, status: 400, code: "invalid_request", message: "The request isn't valid.", errors: day.errors };
    slot = day.slot;
  }
  const entry: OrderStageEntry = {
    stage: input.stage,
    at: now.toISOString(),
    by: actor,
    reason: input.reason,
    note: input.note,
    courier: input.courierName || input.courierPhone ? { name: input.courierName, phone: input.courierPhone } : null,
    trackingUrl: input.trackingUrl,
    date: input.date,
    slot: slot ? { id: slot.id, start: slot.start, end: slot.end } : null,
    next: input.next,
  };
  const log = [...(order.stageLog ?? []), entry];
  const patch: Partial<CatalogOrder> = { deliveryStage: input.stage, stageLog: log, updatedAt: now };
  // The new day counts in the slots' capacity from now on.
  if (input.date) {
    const delivery = order.delivery ?? { date: null, slot: null, feeCents: 0, sender: null, recipient: null, message: null, anonymous: false };
    patch.delivery = { ...delivery, date: input.date, slot: entry.slot };
    patch.deliveryDate = input.date;
  }
  await store.updateCatalogOrder(app.id, order.id, patch);
  const fresh = { ...order, ...patch } as CatalogOrder;
  // Delivered completes it; a failed attempt may cancel it. The customer hears of the stage, not twice.
  if (input.stage === "delivered") await changeOrderStatus(deps, fresh, "completed", { notice: "delivered" });
  if (input.stage === "failed" && input.next === "cancel") await changeOrderStatus(deps, fresh, "cancelled", { notice: false });
  if (input.stage === "shipped" || input.stage === "postponed" || input.stage === "failed") {
    try {
      await notifyOrderStage({ store, key: deps.key, now, send: deps.send }, app, fresh, entry);
    } catch (e) {
      console.error(`[orders] the stage notice failed: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    }
  }
  return { ok: true, order: (await store.getCatalogOrder(app.id, order.id)) ?? fresh };
}

/** "10:00–13:00" for a stage's slot. */
export function stageSlotLabel(slot: OrderStageEntry["slot"]): string | null {
  return slot ? slotLabel(slot) : null;
}
