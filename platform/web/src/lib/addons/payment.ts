import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Client, License, PlanPayment, User } from "../data/types";
import type { BillingDetails } from "../billing/plan-payment";
import { couponClaimLimits, CouponUsedUpError, redemptionOf, type CouponCheck } from "../billing/coupons";
import { LIFETIME_END, periodEnd } from "../billing/periods";
import { shownOf, type Offer } from "../billing/prices";
import { startCheckout, type PaymentAccount, type ProviderUrls } from "../payments/provider";
import { platformSetting } from "../settings/platform";
import { addonById, addonEnds, addonMonthsOf, addonPriceOf, billingLabel } from "./catalog";
import type { AddonBilling, AddonDef, AppAddon, PaidAddon } from "./types";

/**
 * 133 Paying for an add-on: by card on Yallapp's plan gateway (Kashier, in
 * pounds), the same way as a plan (a `plan_payments` row with purpose
 * "addon" and the add-on kept on it). Once the provider confirms it, the
 * add-on starts for the app (`applyPaidAddon`), or a running one is renewed
 * from its end. The team can also give one by hand, with no charge
 * (`grantAddon`, audited by the caller).
 */

/** When an add-on bought (or renewed) this way ends: a period from the later of today and its end; never for once; for life. */
export function addonEndFor(billing: AddonBilling, currentEnd: Date | null, now: Date): Date | null {
  if (billing === "once") return null;
  if (billing === "lifetime") return new Date(LIFETIME_END);
  return periodEnd(currentEnd, Number(billing), now);
}

/** A new add-on row for an app, as bought or given. */
export function newAppAddon(input: { client: Pick<Client, "id">; appId: string; addon: AddonDef; billing: AddonBilling; paymentId: string | null; grantedBy: string | null; now: Date }): AppAddon {
  const { addon, now } = input;
  return {
    id: newId(),
    clientId: input.client.id,
    appId: input.appId,
    addonId: addon.id,
    kind: addon.kind,
    name: addon.en.name.slice(0, 191),
    limit: addon.kind === "quantity" ? (addon.limit ?? null) : null,
    amount: addon.kind === "quantity" ? (addon.amount ?? null) : null,
    feature: addon.kind !== "quantity" ? (addon.feature ?? null) : null,
    billing: input.billing,
    activeUntil: addonEndFor(input.billing, null, now),
    status: "active",
    paymentId: input.paymentId,
    grantedBy: input.grantedBy,
    // A service is a task for the team.
    taskStatus: addon.kind === "service" ? "new" : null,
    taskNote: null,
    remindedFor: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Records the add-on's payment and starts it on the provider's page; returns the page to send the client to. */
export async function startAddonPayment(deps: {
  store: DataStore;
  account: PaymentAccount;
  fetcher?: typeof fetch;
  urls?: ProviderUrls;
  now: Date;
  client: Client;
  app: Pick<App, "id">;
  license: Pick<License, "plan">;
  user: User;
  addon: AddonDef;
  billing: AddonBilling;
  /** Renewing this add-on of the app; null: buying a new one. */
  renews: AppAddon | null;
  /** What is charged (with a coupon, its lowered price) and what the client saw. */
  offer: Pick<Offer, "charged" | "shown">;
  coupon?: Extract<CouponCheck, { ok: true }>;
  billingDetails: BillingDetails;
  ip: string;
  callbackUrls: (token: string) => { returnUrl: string; webhookUrl: string | null };
}): Promise<string> {
  const { client, user, addon, account, offer, coupon } = deps;
  if (!addonPriceOf(addon, deps.billing)) throw new Error("This add-on has no card price for this period");
  if (offer.charged.cents <= 0) throw new Error("A free payment doesn't go to the provider");
  if (coupon && offer.charged.cents !== coupon.amountCents) throw new Error("The offer isn't the coupon's price");
  const token = randomToken(24);
  const paid: PaidAddon = { addonId: addon.id, billing: deps.billing, renews: deps.renews?.id ?? null, name: addon.en.name.slice(0, 120) };
  const payment: PlanPayment = {
    id: newId(),
    clientId: client.id,
    appId: deps.app.id,
    plan: deps.license.plan,
    months: addonMonthsOf(deps.billing),
    amountCents: offer.charged.cents,
    currency: offer.charged.currency,
    status: "pending",
    tokenHash: sha256Hex(token),
    paymentId: null,
    createdAt: deps.now,
    paidAt: null,
    paymentProvider: account.provider,
    providerRef: null,
    ...shownOf(offer),
    purpose: "addon",
    addon: paid,
  };
  const name = `Yallapp ${addon.en.name} (${billingLabel(deps.billing).toLowerCase()})`.slice(0, 200);
  const { returnUrl, webhookUrl } = deps.callbackUrls(token);
  const started = await startCheckout(
    account,
    {
      reference: `plan-${payment.id}`,
      amountCents: payment.amountCents,
      currency: payment.currency,
      description: name,
      lines: [{ id: `addon-${addon.id}`, name, cents: payment.amountCents, category: addonEnds(deps.billing) ? "Subscription" : "Service", digital: true }],
      customer: {
        id: `client-${client.id}`,
        name: user.name,
        email: user.email,
        phone: client.whatsapp.startsWith("+") ? client.whatsapp : `+${client.whatsapp}`,
        city: deps.billingDetails.city,
        address: deps.billingDetails.address,
        ip: deps.ip,
      },
      returnUrl,
      webhookUrl,
      iyzico: { conversationId: `plan-${payment.id}`, basketId: payment.id, shipping: false },
    },
    { fetcher: deps.fetcher, urls: deps.urls },
  );
  const recorded: PlanPayment = { ...payment, providerRef: started.providerRef.slice(0, 191) };
  if (!coupon) await deps.store.createPlanPayment(recorded);
  // 70 With a coupon, the payment is recorded only with its use, while the coupon's limits still allow one (atomic).
  else if (!(await deps.store.claimCouponRedemption(redemptionOf(coupon, payment, "pending", deps.now), couponClaimLimits(coupon.coupon, deps.now), recorded))) {
    throw new CouponUsedUpError(false);
  }
  return started.url;
}

/** A coupon covered the whole price: the add-on starts at once, recorded as a payment of 0 with the coupon's use. */
export async function addonWithFreeCoupon(deps: {
  store: DataStore;
  client: Client;
  app: Pick<App, "id">;
  license: Pick<License, "plan">;
  addon: AddonDef;
  billing: AddonBilling;
  renews: AppAddon | null;
  coupon: Extract<CouponCheck, { ok: true }>;
  currency: PlanPayment["currency"];
  now: Date;
}): Promise<{ payment: PlanPayment; addon: AppAddon }> {
  const { store, coupon, now } = deps;
  if (coupon.amountCents !== 0) throw new Error("This coupon doesn't take the whole price");
  const payment: PlanPayment = {
    id: newId(),
    clientId: deps.client.id,
    appId: deps.app.id,
    plan: deps.license.plan,
    months: addonMonthsOf(deps.billing),
    amountCents: 0,
    currency: deps.currency,
    status: "paid",
    tokenHash: sha256Hex(randomToken(24)),
    paymentId: null,
    createdAt: now,
    paidAt: now,
    purpose: "addon",
    addon: { addonId: deps.addon.id, billing: deps.billing, renews: deps.renews?.id ?? null, name: deps.addon.en.name.slice(0, 120) },
  };
  if (!(await store.claimCouponRedemption(redemptionOf(coupon, payment, "redeemed", now), couponClaimLimits(coupon.coupon, now), payment))) throw new CouponUsedUpError(false);
  return { payment, addon: await applyPaidAddon(store, payment, now, deps.addon) };
}

/**
 * A paid add-on payment: renews the add-on it names (from its end, or from
 * today when it ended) or starts a new one. The add-on's definition is read
 * from the payment's own copy when the team removed it since.
 */
export async function applyPaidAddon(store: DataStore, payment: PlanPayment, now: Date, def?: AddonDef): Promise<AppAddon> {
  const paid = payment.addon;
  if (!paid || !payment.appId) throw new Error("This payment isn't for an add-on of an app");
  if (paid.renews) {
    const current = await store.getAppAddon(paid.renews);
    if (current && current.appId === payment.appId) {
      const activeUntil = addonEndFor(paid.billing, current.activeUntil, now);
      await store.updateAppAddon(current.id, { activeUntil, status: "active", paymentId: payment.id, updatedAt: now });
      return { ...current, activeUntil, status: "active", paymentId: payment.id, updatedAt: now };
    }
  }
  const definition = def ?? (await addonFromSettings(store, paid.addonId));
  const addon = definition
    ? newAppAddon({ client: { id: payment.clientId }, appId: payment.appId, addon: definition, billing: paid.billing, paymentId: payment.id, grantedBy: null, now })
    : // The team removed it after the payment started: kept as a service for the team to look at.
      { ...newAppAddon({ client: { id: payment.clientId }, appId: payment.appId, addon: { id: paid.addonId, kind: "service", icon: "widgets", en: { name: paid.name, description: "" }, prices: {}, rule: { family: "both", belowTop: false, plans: null }, repeatable: false, active: false, order: 0 }, billing: paid.billing, paymentId: payment.id, grantedBy: null, now }) };
  await store.createAppAddon(addon);
  return addon;
}

async function addonFromSettings(store: DataStore, id: string): Promise<AddonDef | null> {
  return addonById((await platformSetting(store, "addons", { fresh: true }))?.value, id);
}

/** The team gives an app an add-on by hand, with no charge (the caller records it in the audit log). */
export async function grantAddon(store: DataStore, input: { client: Pick<Client, "id">; app: Pick<App, "id">; addon: AddonDef; billing: AddonBilling; admin: string; now: Date }): Promise<AppAddon> {
  const addon = newAppAddon({ client: input.client, appId: input.app.id, addon: input.addon, billing: input.billing, paymentId: null, grantedBy: input.admin.slice(0, 191), now: input.now });
  await store.createAppAddon(addon);
  return addon;
}
