import type { DataStore } from "../data/store";
import type { App, CatalogCustomer, CatalogOrder, ManualPaymentMethod, ManualPaymentSettings, OrderManualPayment } from "../data/types";
import { checkTicketHold, holdForPayment } from "../events/holds";

/**
 * 96.2 Bank transfer and the owner's own method ("Cash on delivery",
 * "Vodafone Cash"): paid outside Yallapp, straight to the business. The
 * customer picks one on the payment page and sees the owner's details; the
 * order waits, pending, until the owner marks it paid (then it is delivered
 * like a card payment: lib/payments/settle.ts afterOrderPaid) or cancels it.
 * Yallapp never sees or checks the money.
 */

export const PAY_WITHIN_DAYS = { min: 1, max: 14, default: 3 } as const;
export const MANUAL_TEXT_MAX = 1000;
export const MANUAL_NAME_MAX = 40;

const DAY = 86_400_000;

export interface ManualChoice {
  method: ManualPaymentMethod;
  name: string;
  instructions: string;
}

/** The methods the payment page offers besides the card, in order. */
export function manualChoices(settings: ManualPaymentSettings | null | undefined): ManualChoice[] {
  if (!settings) return [];
  return [
    ...(settings.bankTransfer?.trim() ? [{ method: "bank_transfer" as const, name: "Bank transfer", instructions: settings.bankTransfer.trim() }] : []),
    ...(settings.custom?.name.trim() && settings.custom.instructions.trim()
      ? [{ method: "custom" as const, name: settings.custom.name.trim(), instructions: settings.custom.instructions.trim() }]
      : []),
  ];
}

export function isManualMethod(value: unknown): value is ManualPaymentMethod {
  return value === "bank_transfer" || value === "custom";
}

/** Waiting for the owner to confirm a bank transfer or their own method. */
export function awaitingManualPayment(order: Pick<CatalogOrder, "status" | "manualPayment">): boolean {
  return order.status === "pending" && Boolean(order.manualPayment);
}

/** What the dashboard's form sends, checked. */
export function readManualPayments(input: {
  bankTransfer: string;
  customName: string;
  customInstructions: string;
  payWithinDays: string;
}): { ok: true; settings: ManualPaymentSettings | null } | { ok: false; field: "bankTransfer" | "customName" | "customInstructions" | "payWithinDays"; error: string } {
  const bank = input.bankTransfer.trim();
  const name = input.customName.trim();
  const instructions = input.customInstructions.trim();
  if (bank.length > MANUAL_TEXT_MAX) return { ok: false, field: "bankTransfer", error: `Keep the bank details under ${MANUAL_TEXT_MAX} characters.` };
  if (instructions.length > MANUAL_TEXT_MAX) return { ok: false, field: "customInstructions", error: `Keep the instructions under ${MANUAL_TEXT_MAX} characters.` };
  if (name.length > MANUAL_NAME_MAX) return { ok: false, field: "customName", error: `Keep the name under ${MANUAL_NAME_MAX} characters.` };
  if (name && !instructions) return { ok: false, field: "customInstructions", error: "Write what the customer does to pay this way." };
  if (instructions && !name) return { ok: false, field: "customName", error: "Give your payment method a name, like “Cash on delivery”." };
  const days = Number(input.payWithinDays || PAY_WITHIN_DAYS.default);
  if (!Number.isInteger(days) || days < PAY_WITHIN_DAYS.min || days > PAY_WITHIN_DAYS.max) {
    return { ok: false, field: "payWithinDays", error: `Choose between ${PAY_WITHIN_DAYS.min} and ${PAY_WITHIN_DAYS.max} days.` };
  }
  if (!bank && !name) return { ok: true, settings: null };
  return { ok: true, settings: { bankTransfer: bank || null, custom: name ? { name, instructions } : null, payWithinDays: days } };
}

/**
 * The customer chose a method: their details and the method's instructions
 * are kept on the order, which stays pending until the owner marks it paid.
 * 49 A ticket order's places are held until it is due.
 */
export async function chooseManualPayment(deps: {
  store: DataStore;
  app: App;
  settings: ManualPaymentSettings;
  order: CatalogOrder;
  customer: CatalogCustomer;
  method: ManualPaymentMethod;
  now: Date;
}): Promise<OrderManualPayment | null> {
  const { store, app, order, now } = deps;
  const choice = manualChoices(deps.settings).find((c) => c.method === deps.method);
  if (!choice || order.status !== "pending") return null;
  await checkTicketHold(store, app, order, now);
  const dueAt = new Date(now.getTime() + deps.settings.payWithinDays * DAY);
  const manualPayment: OrderManualPayment = { ...choice, dueAt: dueAt.toISOString() };
  await holdForPayment(store, app, order, dueAt, now);
  await store.updateCatalogOrder(app.id, order.id, { customer: deps.customer, manualPayment, paymentProvider: null, providerRef: null, commissionCents: null, updatedAt: now });
  return manualPayment;
}

/**
 * The owner cancelled an order still waiting for its payment: it closes,
 * and 49 its ticket places are released at once (91.4 points used on it are
 * only spent when it is paid). False when it wasn't waiting (paid meanwhile,
 * or closed).
 */
export async function cancelManualOrder(store: DataStore, app: App, order: CatalogOrder, now: Date): Promise<boolean> {
  if (!awaitingManualPayment(order)) return false;
  await store.updateCatalogOrder(app.id, order.id, { status: "cancelled", updatedAt: now });
  if (app.connector?.kind === "events") await store.holdOrderTickets(app.id, order.id, now, now);
  return true;
}
