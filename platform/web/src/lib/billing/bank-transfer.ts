import { activateClient } from "../admin/clients";
import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, CatalogCurrency, Client, PlanPayment } from "../data/types";
import { noteMilestones } from "../milestones/record";
import type { Plan } from "../plans";
import { getPlans } from "../settings/platform";
import { planChangeFor } from "./plan-change";
import type { PlanPaymentOutcome } from "./plan-payment";
import { formatAmount } from "./prices";

/**
 * 95.2 A client paid an app's plan into Yallapp's bank account: once the
 * money has arrived, the team records it in Admin › Invoices. It is an
 * invoice like a card payment's (paid, with its PDF), and it activates the
 * app or extends its license the same way: an upgrade starts now with the
 * old plan's days credited, a downgrade when the paid period ends.
 */

export const BANK_REFERENCE_MAX = 100;

export interface BankTransferInput {
  client: Client;
  /** The app whose plan it pays; null before the account's first app (creating that app takes it, as with a card payment). */
  app: Pick<App, "id"> | null;
  plan: Plan;
  months: 1 | 12;
  amountCents: number;
  currency: CatalogCurrency;
  /** The bank's reference for the transfer. */
  reference: string;
  /** The admin who records it. */
  recordedBy: string;
}

export async function recordBankTransfer(
  store: DataStore,
  input: BankTransferInput,
  encryptionKey: Buffer,
  now: Date,
): Promise<Extract<PlanPaymentOutcome, { kind: "paid" }>> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("A bank transfer has an amount");
  const reference = input.reference.trim().slice(0, BANK_REFERENCE_MAX);
  const payment: PlanPayment = {
    id: newId(),
    clientId: input.client.id,
    appId: input.app?.id ?? null,
    plan: input.plan,
    months: input.months,
    amountCents: input.amountCents,
    currency: input.currency,
    status: "paid",
    // Nobody calls back with this token: the payment is complete.
    tokenHash: sha256Hex(randomToken(24)),
    paymentId: null,
    createdAt: now,
    paidAt: now,
    method: "bank_transfer",
    bankReference: reference || null,
    recordedBy: input.recordedBy,
  };
  await store.createPlanPayment(payment);
  const plans = await getPlans(store);
  const license = await store.getLicenseForApp(input.client.id, payment.appId);
  const change = planChangeFor(license, plans[input.plan], input.months, plans, now);
  const activation = await activateClient(
    store,
    {
      clientId: input.client.id,
      appId: payment.appId,
      plan: change.plan,
      activeUntil: change.activeUntil,
      nextPlan: change.nextPlan,
      nextPlanAt: change.nextPlanAt,
      paymentNote: `Paid ${formatAmount(payment.amountCents, payment.currency)} by bank transfer${reference ? ` (${reference})` : ""}, recorded by ${input.recordedBy}`,
    },
    encryptionKey,
    now,
  );
  // 78 The first payment, or a renewal.
  await noteMilestones(store, input.client.id, now);
  return { kind: "paid", activation, activeUntil: change.activeUntil, payment, change };
}
