import { activateClient, type ActivationOutcome } from "../admin/clients";
import { formatCents } from "../catalog/money";
import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Client, PlanPayment, User } from "../data/types";
import { PaymentError } from "../payments/errors";
import { confirmCheckout, PROVIDER_NAME, providerTakes, startCheckout, type PaymentAccount, type ProviderUrls } from "../payments/provider";
import type { Plan, PlanInfo } from "../plans";
import { getPlans } from "../settings/platform";
import type { CouponCheck } from "./coupons";
import { planChangeFor, type PlanChange } from "./plan-change";

/**
 * Clients pay an app's Yallapp plan by card on the provider's page (37
 * iyzico, Kashier or Fawaterk, as the team chose), into Yallapp's own
 * merchant account. Each payment is for one app (the dashboard's current
 * app): a confirmed payment activates that app, or extends its license from
 * its current end date (or from today when it ended). Other apps of the
 * account are unchanged.
 */

export interface BillingDetails {
  city: string;
  address: string;
}

/** Plans with a card price, the ones clients can pay online; 37 with a provider, only those in a currency it takes. */
export function cardPlans(plans: Record<Plan, PlanInfo>, provider?: PaymentAccount["provider"]): PlanInfo[] {
  return Object.values(plans).filter((p) => p.priceCents !== null && p.priceCents > 0 && (!provider || providerTakes(provider, p.currency)));
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

export { extendedUntil } from "./plan-change";

interface Deps {
  store: DataStore;
  /** 37 Yallapp's account: for a new payment the chosen provider's, for a started one the provider it started with. */
  account: PaymentAccount;
  fetcher?: typeof fetch;
  /** The providers' addresses in tests. */
  urls?: ProviderUrls;
  now: Date;
}

/** Records the payment and starts it on the provider's page; returns the page to send the client to. */
export async function startPlanPayment(
  deps: Deps & {
    client: Client;
    /** The app whose plan is paid; null before the account's first app (creating it takes the payment). */
    app?: Pick<App, "id"> | null;
    user: User;
    plan: PlanInfo;
    billing: BillingDetails;
    ip: string;
    /** Where the provider sends the client back, and posts its webhook (lib/payments/routes.ts). */
    callbackUrls: (token: string) => { returnUrl: string; webhookUrl: string | null };
    /** 11.6: a coupon checked for this client and plan (checkCoupon); the payment is its lowered price. */
    coupon?: Extract<CouponCheck, { ok: true }>;
  },
): Promise<string> {
  const { client, user, plan, coupon, account } = deps;
  if (plan.priceCents === null) throw new Error("This plan has no card price");
  if (coupon && coupon.amountCents === 0) throw new Error("A free payment doesn't go to the provider");
  const token = randomToken(24);
  const payment: PlanPayment = {
    id: newId(),
    clientId: client.id,
    appId: deps.app?.id ?? null,
    plan: plan.id,
    months: plan.billingMonths,
    amountCents: coupon ? coupon.amountCents : plan.priceCents,
    currency: plan.currency,
    status: "pending",
    tokenHash: sha256Hex(token),
    paymentId: null,
    createdAt: deps.now,
    paidAt: null,
    paymentProvider: account.provider,
    providerRef: null,
  };
  const name = `Yallapp ${plan.name} (${plan.billingMonths === 1 ? "1 month" : "1 year"})`;
  const { returnUrl, webhookUrl } = deps.callbackUrls(token);
  // 37 The payment is recorded once the provider has started it, with the provider's reference to read it back.
  const started = await startCheckout(
    account,
    {
      reference: `plan-${payment.id}`,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description: name,
      lines: [{ id: `plan-${plan.id}`, name, cents: payment.amountCents, category: "Subscription", digital: true }],
      customer: {
        id: `client-${client.id}`,
        name: user.name,
        email: user.email,
        phone: client.whatsapp.startsWith("+") ? client.whatsapp : `+${client.whatsapp}`,
        city: deps.billing.city,
        address: deps.billing.address,
        ip: deps.ip,
      },
      returnUrl,
      webhookUrl,
      iyzico: { conversationId: `plan-${payment.id}`, basketId: payment.id, shipping: false },
    },
    { fetcher: deps.fetcher, urls: deps.urls },
  );
  await deps.store.createPlanPayment({ ...payment, providerRef: started.providerRef.slice(0, 191) });
  if (coupon) await deps.store.createCouponRedemption(redemptionOf(coupon, payment, "pending", deps.now));
  return started.url;
}

export type PlanPaymentOutcome =
  | { kind: "paid"; activation: ActivationOutcome; activeUntil: Date; payment: PlanPayment; change: PlanChange }
  | { kind: "already_paid" }
  /** 37 Kashier or Fawaterk haven't confirmed it (yet): it stays pending, and their webhook may still confirm it. */
  | { kind: "pending" }
  | { kind: "failed" };

/**
 * Reads the payment back from the provider after its callback, redirect or
 * webhook, then activates or extends the license. The trigger proves
 * nothing by itself: only the provider's answer to our own authenticated
 * request does, for this payment's reference, amount and currency. The
 * payment turns paid once (payPlanPayment only changes a pending one), so
 * a webhook and a redirect arriving together activate the plan once.
 */
export async function completePlanPayment(
  deps: Deps & {
    payment: PlanPayment;
    /** iyzico: the token its callback posted. */
    iyzicoToken?: string;
    /** 37 Kashier's session or Fawaterk's invoice named by a webhook; the one kept on the payment otherwise. */
    providerRef?: string | null;
    encryptionKey: Buffer;
  },
): Promise<PlanPaymentOutcome> {
  const { payment, account } = deps;
  if (payment.status !== "pending") return payment.status === "paid" ? { kind: "already_paid" } : { kind: "failed" };
  const provider = payment.paymentProvider ?? "iyzico";
  if (account.provider !== provider) return { kind: "failed" };
  let result;
  try {
    result = await confirmCheckout(
      account,
      {
        reference: `plan-${payment.id}`,
        amountCents: payment.amountCents,
        currency: payment.currency,
        providerRef: deps.providerRef ?? payment.providerRef ?? null,
        ...(deps.iyzicoToken ? { iyzico: { token: deps.iyzicoToken, conversationId: `plan-${payment.id}`, basketId: payment.id } } : {}),
      },
      { fetcher: deps.fetcher, urls: deps.urls },
    );
  } catch (e) {
    if (e instanceof PaymentError) return { kind: provider === "iyzico" ? "failed" : "pending" };
    throw e;
  }
  if (!result.paid) {
    // iyzico's answer to its callback is final. Kashier's and Fawaterk's payment may still complete (their webhook tells us).
    if (provider !== "iyzico") return { kind: "pending" };
    await deps.store.failPlanPayment(payment.id);
    await deps.store.settleCouponRedemption(payment.id, "failed", deps.now);
    return { kind: "failed" };
  }
  if (!(await deps.store.payPlanPayment(payment.id, result.paymentId, deps.now))) return { kind: "already_paid" };
  await deps.store.settleCouponRedemption(payment.id, "redeemed", deps.now);
  // The payment's app: the one it was started for (or the account's first app, which took it).
  const license = await deps.store.getLicenseForApp(payment.clientId, payment.appId);
  // 13.3 An upgrade starts now with the old plan's days credited; a downgrade starts when the paid period ends.
  const plans = await getPlans(deps.store);
  const change = planChangeFor(license, plans[payment.plan], payment.months, plans, deps.now);
  const activation = await activateClient(
    deps.store,
    {
      clientId: payment.clientId,
      appId: payment.appId,
      plan: change.plan,
      activeUntil: change.activeUntil,
      nextPlan: change.nextPlan,
      nextPlanAt: change.nextPlanAt,
      paymentNote: `Paid ${formatCents(payment.amountCents, payment.currency)} by card (${PROVIDER_NAME[provider]} ${result.paymentId})${noteFor(change, plans)}`,
    },
    deps.encryptionKey,
    deps.now,
  );
  return {
    kind: "paid",
    activation,
    activeUntil: change.activeUntil,
    payment: { ...payment, status: "paid", paymentId: result.paymentId, paidAt: deps.now },
    change,
  };
}

function noteFor(change: PlanChange, plans: Record<Plan, PlanInfo>): string {
  if (change.kind === "upgrade") return `, upgrade to ${plans[change.plan].name}${change.creditDays ? ` with ${change.creditDays} days credited` : ""}`;
  if (change.kind === "downgrade" && change.nextPlan) return `, moves to ${plans[change.nextPlan].name} when the current period ends`;
  return "";
}

// 11.6 Coupons

function redemptionOf(coupon: Extract<CouponCheck, { ok: true }>, payment: PlanPayment, status: "pending" | "redeemed", now: Date) {
  return {
    couponId: coupon.coupon.id,
    paymentId: payment.id,
    clientId: payment.clientId,
    code: coupon.coupon.code,
    plan: payment.plan,
    fullCents: coupon.fullCents,
    discountCents: coupon.discountCents,
    currency: payment.currency,
    status,
    createdAt: now,
    redeemedAt: status === "redeemed" ? now : null,
  };
}

/**
 * A coupon that takes the whole price: no card payment. The payment is
 * recorded as paid with an amount of 0, and the client is activated or their
 * license extended as after a card payment.
 */
export async function activateWithFreeCoupon(deps: {
  store: DataStore;
  client: Client;
  /** The app whose plan is paid; null before the account's first app. */
  app?: Pick<App, "id"> | null;
  plan: PlanInfo;
  coupon: Extract<CouponCheck, { ok: true }>;
  encryptionKey: Buffer;
  now: Date;
}): Promise<Extract<PlanPaymentOutcome, { kind: "paid" }>> {
  const { store, client, plan, coupon, now } = deps;
  if (coupon.amountCents !== 0) throw new Error("This coupon doesn't take the whole price");
  const payment: PlanPayment = {
    id: newId(),
    clientId: client.id,
    appId: deps.app?.id ?? null,
    plan: plan.id,
    months: plan.billingMonths,
    amountCents: 0,
    currency: plan.currency,
    status: "paid",
    // Nobody calls back with this token: the payment is complete.
    tokenHash: sha256Hex(randomToken(24)),
    paymentId: null,
    createdAt: now,
    paidAt: now,
  };
  await store.createPlanPayment(payment);
  await store.createCouponRedemption(redemptionOf(coupon, payment, "redeemed", now));
  const license = await store.getLicenseForApp(client.id, payment.appId);
  const plans = await getPlans(store);
  const change = planChangeFor(license, plan, payment.months, plans, now);
  const activation = await activateClient(
    store,
    {
      clientId: client.id,
      appId: payment.appId,
      plan: change.plan,
      activeUntil: change.activeUntil,
      nextPlan: change.nextPlan,
      nextPlanAt: change.nextPlanAt,
      paymentNote: `Free with coupon ${coupon.coupon.code} (${formatCents(coupon.fullCents, plan.currency)} off)${noteFor(change, plans)}`,
    },
    deps.encryptionKey,
    now,
  );
  return { kind: "paid", activation, activeUntil: change.activeUntil, payment, change };
}
