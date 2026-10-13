import { activateClient, type ActivationOutcome } from "../admin/clients";
import { centsToDecimal, formatCents } from "../catalog/money";
import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { Client, PlanPayment, User } from "../data/types";
import { initializeCheckoutForm, IyzicoError, retrieveCheckoutForm, type IyzicoKeys } from "../payments/iyzico";
import type { Plan, PlanInfo } from "../plans";

/**
 * Clients pay their Yallapp plan by card on iyzico's page, into Yallapp's own
 * merchant account. A confirmed payment activates the client, or extends
 * their license from its current end date (or from today when it ended).
 */

export interface BillingDetails {
  city: string;
  address: string;
}

/** Plans with a card price, the ones clients can pay online. */
export function cardPlans(plans: Record<Plan, PlanInfo>): PlanInfo[] {
  return Object.values(plans).filter((p) => p.priceCents !== null && p.priceCents > 0);
}

export function readBilling(input: Record<string, unknown>): { ok: true; billing: BillingDetails } | { ok: false; errors: Record<string, string> } {
  const text = (name: string, max: number) => (typeof input[name] === "string" ? (input[name] as string).trim().slice(0, max) : "");
  const errors: Record<string, string> = {};
  const city = text("city", 60);
  const address = text("address", 300);
  if (city.length < 2) errors.city = "Enter your city.";
  if (address.length < 8) errors.address = "Enter your billing address.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, billing: { city, address } };
}

/** The new end date: `months` after the later of now and the current end. */
export function extendedUntil(currentEnd: Date | null, months: 1 | 12, now: Date): Date {
  const base = new Date(Math.max(now.getTime(), currentEnd?.getTime() ?? 0));
  const end = new Date(base);
  end.setUTCMonth(end.getUTCMonth() + months);
  // A month after 31 January is the last day of February, not 3 March.
  if (end.getUTCDate() !== base.getUTCDate()) end.setUTCDate(0);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

interface Deps {
  store: DataStore;
  keys: IyzicoKeys;
  fetcher?: typeof fetch;
  /** iyzico's address in tests. */
  baseUrl?: string | null;
  now: Date;
}

/** Records the payment and starts it on iyzico; returns the page to send the client to. */
export async function startPlanPayment(
  deps: Deps & {
    client: Client;
    user: User;
    plan: PlanInfo;
    billing: BillingDetails;
    ip: string;
    callbackUrl: (token: string) => string;
  },
): Promise<string> {
  const { client, user, plan } = deps;
  if (plan.priceCents === null) throw new Error("This plan has no card price");
  const token = randomToken(24);
  const payment: PlanPayment = {
    id: newId(),
    clientId: client.id,
    plan: plan.id,
    months: plan.billingMonths,
    amountCents: plan.priceCents,
    currency: plan.currency,
    status: "pending",
    tokenHash: sha256Hex(token),
    paymentId: null,
    createdAt: deps.now,
    paidAt: null,
  };
  await deps.store.createPlanPayment(payment);
  const [first, ...rest] = user.name.trim().split(/\s+/);
  const address = { contactName: user.name, city: deps.billing.city, country: "Turkey", address: deps.billing.address };
  const price = centsToDecimal(payment.amountCents);
  const { paymentPageUrl } = await initializeCheckoutForm(
    deps.keys,
    {
      conversationId: `plan-${payment.id}`,
      price,
      paidPrice: price,
      currency: payment.currency,
      basketId: payment.id,
      callbackUrl: deps.callbackUrl(token),
      buyer: {
        id: `client-${client.id}`,
        name: first || user.name,
        surname: rest.join(" ") || first || user.name,
        gsmNumber: client.whatsapp.startsWith("+") ? client.whatsapp : `+${client.whatsapp}`,
        email: user.email,
        // iyzico asks for a Turkish ID number; Yallapp doesn't collect it, so it sends this placeholder.
        identityNumber: "11111111111",
        registrationAddress: deps.billing.address,
        ip: deps.ip,
        city: deps.billing.city,
        country: "Turkey",
      },
      billingAddress: address,
      basketItems: [
        {
          id: `plan-${plan.id}`,
          name: `Yallapp ${plan.name} (${plan.billingMonths === 1 ? "1 month" : "1 year"})`,
          category1: "Subscription",
          itemType: "VIRTUAL",
          price,
        },
      ],
    },
    { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
  );
  return paymentPageUrl;
}

export type PlanPaymentOutcome =
  | { kind: "paid"; activation: ActivationOutcome; activeUntil: Date; payment: PlanPayment }
  | { kind: "already_paid" }
  | { kind: "failed" };

/**
 * Checks the payment with iyzico after its callback, then activates or
 * extends the license. The callback proves nothing by itself: only iyzico's
 * answer to our signed request does, for this payment's basket and amount.
 */
export async function completePlanPayment(
  deps: Deps & { payment: PlanPayment; iyzicoToken: string; encryptionKey: Buffer },
): Promise<PlanPaymentOutcome> {
  const { payment } = deps;
  if (payment.status !== "pending") return payment.status === "paid" ? { kind: "already_paid" } : { kind: "failed" };
  let result;
  try {
    result = await retrieveCheckoutForm(
      deps.keys,
      { token: deps.iyzicoToken, conversationId: `plan-${payment.id}` },
      { fetcher: deps.fetcher, baseUrl: deps.baseUrl },
    );
  } catch (e) {
    if (e instanceof IyzicoError) return { kind: "failed" };
    throw e;
  }
  if (!result.paid || result.basketId !== payment.id || result.paidCents < payment.amountCents || !result.paymentId) {
    await deps.store.failPlanPayment(payment.id);
    return { kind: "failed" };
  }
  if (!(await deps.store.payPlanPayment(payment.id, result.paymentId, deps.now))) return { kind: "already_paid" };
  const license = await deps.store.getLicenseByClientId(payment.clientId);
  const activeUntil = extendedUntil(license?.expiresAt ?? null, payment.months, deps.now);
  const activation = await activateClient(
    deps.store,
    {
      clientId: payment.clientId,
      plan: payment.plan,
      activeUntil,
      paymentNote: `Paid ${formatCents(payment.amountCents, payment.currency)} by card (iyzico ${result.paymentId})`,
    },
    deps.encryptionKey,
    deps.now,
  );
  return { kind: "paid", activation, activeUntil, payment: { ...payment, status: "paid", paymentId: result.paymentId, paidAt: deps.now } };
}
