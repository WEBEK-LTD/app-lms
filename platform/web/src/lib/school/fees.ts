import { randomToken, sha256Hex } from "../crypto/tokens";
import { formatCents } from "../catalog/money";
import { PAY_LINK_MINUTES } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, CatalogOrder, SchoolFee, SchoolPerson, SchoolSettings } from "../data/types";
import { payUrlFor } from "../delivery/payment";
import { feeReference } from "./service";
import { schoolCurrency, schoolSettingsOf } from "./settings";

/**
 * 105.4 A school fee paid by card: a shop order with one line for the fee
 * (its productId is the fee's ID) on the school's own payment page, into the
 * school's own account, like a ride's fare (lib/rides/payment.ts). A fee is
 * paid once, whichever of its links was paid; it then has a receipt whose
 * address is a random code only the family has.
 */

/** A new order and payment link for the fee, good for an hour. */
export async function feePayLink(
  store: DataStore,
  app: App,
  fee: SchoolFee,
  student: SchoolPerson,
  settings: SchoolSettings,
  userId: number,
  platformUrl: string,
  now: Date,
): Promise<{ url: string; expiresAt: Date; order: CatalogOrder }> {
  const token = randomToken(24);
  const order = await store.createCatalogOrder({
    lang: null,
    appId: app.id,
    tokenHash: sha256Hex(token),
    userId,
    status: "pending",
    lines: [
      {
        productId: fee.id,
        name: `${fee.title}: ${student.name}`.slice(0, 200),
        quantity: 1,
        unitCents: fee.amountCents,
        imageAssetId: null,
        // Nothing to ship.
        digital: true,
      },
    ],
    subtotalCents: fee.amountCents,
    shippingCents: 0,
    totalCents: fee.amountCents,
    currency: schoolCurrency(settings),
    customer: null,
    paymentId: null,
    createdAt: now,
    paidAt: null,
    updatedAt: now,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
  });
  await store.updateSchoolFee(app.id, fee.id, { orderId: order.id, updatedAt: now });
  return { url: payUrlFor(platformUrl, token), expiresAt: new Date(now.getTime() + PAY_LINK_MINUTES * 60_000), order };
}

/** Marks a fee paid (by card or at the office) with its receipt; false when it was already paid or cancelled. */
export async function markFeePaid(store: DataStore, app: Pick<App, "id">, fee: SchoolFee, how: "card" | "office", now: Date, orderId: number | null = null): Promise<SchoolFee | null> {
  const receiptCode = randomToken(24);
  const changed = await store.updateSchoolFee(app.id, fee.id, { status: "paid", paidAt: now, paidBy: how, receiptCode, updatedAt: now, ...(orderId !== null ? { orderId } : {}) }, { statuses: ["due"] });
  return changed ? { ...fee, status: "paid", paidAt: now, paidBy: how, receiptCode, updatedAt: now, ...(orderId !== null ? { orderId } : {}) } : null;
}

/**
 * A paid order of a school: its fee is paid. Returns the fee when it is now
 * paid (so the family is told), null for other apps' orders and for a fee
 * paid meanwhile.
 */
export async function payFee(store: DataStore, app: App, paid: CatalogOrder, now: Date): Promise<SchoolFee | null> {
  if (app.connector?.kind !== "school") return null;
  const id = paid.lines[0]?.productId;
  const fee = id ? await store.getSchoolFee(app.id, id) : null;
  await store.updateCatalogOrder(app.id, paid.id, { status: "completed", updatedAt: now });
  if (!fee || fee.status !== "due") return null;
  return markFeePaid(store, app, fee, "card", now, paid.id);
}

/** What a fee's receipt says. */
export async function feeReceipt(store: DataStore, code: string) {
  const fee = /^[A-Za-z0-9_-]{16,64}$/.test(code) ? await store.getSchoolFeeByReceipt(code) : null;
  if (!fee || fee.status !== "paid") return null;
  const [app, student, saved] = await Promise.all([store.getAppById(fee.appId), store.getSchoolPerson(fee.appId, fee.studentId), store.getSchoolSettings(fee.appId)]);
  if (!app) return null;
  const settings = schoolSettingsOf(saved, app);
  return {
    app,
    rows: [
      ["Reference", feeReference(fee)],
      ["Date", fee.paidAt ? fee.paidAt.toISOString().slice(0, 10) : "—"],
      ["For", fee.title],
      ["Student", student?.name ?? "—"],
      ["Amount", formatCents(fee.amountCents, schoolCurrency(settings))],
      ["Paid", fee.paidBy === "card" ? "By card" : "At the school"],
      ["Paid to", app.appName ?? "The school"],
    ] as [string, string][],
  };
}
