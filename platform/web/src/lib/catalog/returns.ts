import type { DataStore } from "../data/store";
import type { App, CatalogOrder, CatalogSettings, OrderReturn, ReturnReason } from "../data/types";
import { notifyReturnDecision } from "../hosted/auto-notifications";
import type { sendPush } from "../hosted/push";

/**
 * 91.3 Returns asked for in the app (shops without a website): a completed
 * order with something to send back, within the shop's days
 * (`CatalogSettings.returnDays`, counted from when it was completed, its
 * last change). Asked once; the shop approves or declines it with a reply
 * on Orders, and the customer is told (`order_update`). A refund stays the
 * Refund form's (47).
 */

export const RETURN_REASONS: readonly ReturnReason[] = ["damaged", "wrong_item", "not_as_described", "no_longer_needed", "other"];
export const RETURN_DAYS_MAX = 365;
const NOTE_MAX = 500;
const REPLY_MAX = 500;
const DAY = 86_400_000;

/** The shop's return days, or null when it takes no returns from the app. */
export function returnDays(settings: Pick<CatalogSettings, "returnDays">): number | null {
  const days = settings.returnDays ?? null;
  return days !== null && Number.isInteger(days) && days >= 1 && days <= RETURN_DAYS_MAX ? days : null;
}

/** Whether the customer may ask to return the order now. */
export function canReturn(order: Pick<CatalogOrder, "status" | "lines" | "fulfilment" | "updatedAt" | "returnRequest">, settings: Pick<CatalogSettings, "returnDays">, now: Date): boolean {
  const days = returnDays(settings);
  if (days === null || order.status !== "completed" || order.returnRequest || order.fulfilment) return false;
  if (!order.lines.some((line) => !line.digital)) return false;
  return now.getTime() - order.updatedAt.getTime() <= days * DAY;
}

const clean = (value: unknown, max: number): string | null => {
  const text = typeof value === "string" ? value.replace(/[ \t]+/g, " ").trim() : "";
  return text ? text.slice(0, max) : null;
};

/** The app's request: a reason, and a note (needed with "other"). */
export function parseReturnInput(body: unknown): { ok: true; reason: ReturnReason; note: string | null } | { ok: false; message: string } {
  const input = (body ?? {}) as { reason?: unknown; note?: unknown };
  const reason = RETURN_REASONS.find((r) => r === input.reason);
  if (!reason) return { ok: false, message: "Choose why you want to return it." };
  if (input.note !== undefined && input.note !== null && typeof input.note !== "string") return { ok: false, message: "Choose why you want to return it." };
  if (typeof input.note === "string" && input.note.trim().length > NOTE_MAX) return { ok: false, message: "Keep the note under 500 characters." };
  const note = clean(input.note, NOTE_MAX);
  if (reason === "other" && !note) return { ok: false, message: "Tell the shop why you want to return it." };
  return { ok: true, reason, note };
}

/** Saves the request: false when the order can't be returned now. */
export async function requestReturn(store: DataStore, app: App, order: CatalogOrder, settings: CatalogSettings, input: { reason: ReturnReason; note: string | null }, now: Date): Promise<CatalogOrder | null> {
  if (!canReturn(order, settings, now)) return null;
  const returnRequest: OrderReturn = { status: "requested", reason: input.reason, note: input.note, requestedAt: now.toISOString(), decidedAt: null, reply: null };
  await store.updateCatalogOrder(app.id, order.id, { returnRequest });
  return { ...order, returnRequest };
}

export interface DecideDeps {
  store: DataStore;
  key: Buffer;
  now: Date;
  send?: typeof sendPush;
}

/** The shop's answer: saved and told to the customer. False when there's nothing to answer. */
export async function decideReturn(deps: DecideDeps, app: App, order: CatalogOrder, decision: "approved" | "declined", reply: unknown): Promise<boolean> {
  const current = order.returnRequest;
  if (!current || current.status !== "requested") return false;
  const answer: OrderReturn = { ...current, status: decision, decidedAt: deps.now.toISOString(), reply: clean(reply, REPLY_MAX) };
  await deps.store.updateCatalogOrder(app.id, order.id, { returnRequest: answer });
  if (order.userId !== null) {
    try {
      await notifyReturnDecision(deps, app, { id: order.id, userId: order.userId }, decision, answer.reply);
    } catch (e) {
      console.error(`[returns] the answer couldn't be told: ${e instanceof Error ? e.message : String(e)}`.slice(0, 400));
    }
  }
  return true;
}

/** The order's `return_request` in the app's answers. */
export function returnJson(r: OrderReturn | null | undefined) {
  if (!r) return null;
  return { status: r.status, reason: r.reason, note: r.note, requested_at: r.requestedAt, decided_at: r.decidedAt, reply: r.reply };
}
