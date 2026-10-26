import type { DataStore } from "../data/store";
import type { PaymentProviderId, PendingPayment } from "../data/types";
import { settleDonationRecord, settleOrderRecord, settlePlanRecord, type Settled, type Trigger } from "./settle";

/**
 * 80.3 Payments left pending, checked with the provider. A payment is
 * settled when the provider calls back (iyzico's callback, Kashier's and
 * Fawaterk's redirect and webhook, lib/payments/settle.ts). When that call
 * never comes (the customer closed the page, the webhook was lost), the
 * order, plan payment or donation would stay pending though it was paid.
 * The frequent job asks the provider about each one, through the same settle
 * functions: first once the callback had its time (iyzico: once its
 * payment page has expired, 30 minutes, since its "not paid" is final and
 * fails a plan payment), then every hour, for as long as it can still be paid
 * (iyzico's page: a few hours, for its last callback; Kashier's session for
 * two days; a Fawaterk reference, paid at a kiosk, for a week; 96.1 a Stripe
 * Checkout Session for a day; a PayPal order, approved and not yet captured,
 * for three days). A payment confirmed this way is delivered and its emails sent as
 * if the provider had called back; one that isn't paid stays pending.
 */

/** The callback's time, before a payment is asked about, by provider. */
export const FIRST_CHECK_MINUTES: Record<PaymentProviderId, number> = { iyzico: 45, kashier: 10, fawaterk: 10, stripe: 10, paypal: 10 };
/** Then every hour. */
export const CHECK_EVERY_MINUTES = 60;
/** How long a payment can still be paid, by provider. */
export const PAYABLE_HOURS: Record<PaymentProviderId, number> = { iyzico: 3, kashier: 48, fawaterk: 7 * 24, stripe: 24, paypal: 72 };

const MINUTE = 60_000;
const LONGEST_HOURS = Math.max(...Object.values(PAYABLE_HOURS));
const SOONEST_MINUTES = Math.min(...Object.values(FIRST_CHECK_MINUTES));

export type Settlers = {
  order: typeof settleOrderRecord;
  plan: typeof settlePlanRecord;
  donation: typeof settleDonationRecord;
};

export interface PendingDeps {
  store: DataStore;
  now: Date;
  /** Stops taking new payments after this long. */
  budgetMs?: number;
  /** Payments looked at in one run, at most. */
  limit?: number;
  clock?: () => Date;
  /** How each kind is settled (tests: stand-ins). */
  settle?: Settlers;
}

export interface PendingReport {
  checked: number;
  paid: number;
  /** Older than their provider takes payments for: left as they are. */
  skipped: number;
}

const DEFAULT_SETTLERS: Settlers = { order: settleOrderRecord, plan: settlePlanRecord, donation: settleDonationRecord };

/** The trigger a provider's callback would bring: its reference, kept when the payment started (iyzico's token too). */
export function triggerFor(payment: PendingPayment): Trigger {
  const provider = payment.record.paymentProvider ?? "iyzico";
  const ref = payment.record.providerRef ?? null;
  return provider === "iyzico" ? { provider, iyzicoToken: ref ?? undefined } : { provider, providerRef: ref };
}

/** One run: the payments due a check, as many as the budget allows. */
export async function checkPendingPayments(deps: PendingDeps): Promise<PendingReport> {
  const { store, now } = deps;
  const clock = deps.clock ?? (() => new Date());
  const settle = deps.settle ?? DEFAULT_SETTLERS;
  const started = clock().getTime();
  const report: PendingReport = { checked: 0, paid: 0, skipped: 0 };
  const due = await store.listPendingPayments({
    startedAfter: new Date(now.getTime() - LONGEST_HOURS * 60 * MINUTE),
    startedBefore: new Date(now.getTime() - SOONEST_MINUTES * MINUTE),
    checkedBefore: new Date(now.getTime() - CHECK_EVERY_MINUTES * MINUTE),
    limit: deps.limit ?? 20,
  });
  for (const payment of due) {
    if (report.checked + report.skipped > 0 && deps.budgetMs !== undefined && clock().getTime() - started >= deps.budgetMs) break;
    const provider = payment.record.paymentProvider ?? "iyzico";
    const age = now.getTime() - payment.record.createdAt.getTime();
    // Its callback may still come (iyzico's page may still be open): asked at a later run.
    if (age < FIRST_CHECK_MINUTES[provider] * MINUTE) continue;
    // Noted first: a payment the provider can't answer about now isn't asked again in this hour.
    await store.markPaymentChecked(payment.kind, payment.record.id, now);
    if (age > PAYABLE_HOURS[provider] * 60 * MINUTE) {
      report.skipped++;
      continue;
    }
    report.checked++;
    let settled: Settled;
    try {
      const trigger = triggerFor(payment);
      settled =
        payment.kind === "order"
          ? await settle.order(store, payment.record, trigger)
          : payment.kind === "plan"
            ? await settle.plan(store, payment.record, trigger)
            : await settle.donation(store, payment.record, trigger);
    } catch (error) {
      console.error("[payments] pending check", payment.kind, payment.record.id, error instanceof Error ? error.message : String(error));
      continue;
    }
    if (settled.status === "paid") report.paid++;
  }
  return report;
}
