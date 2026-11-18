import type { BlobStore } from "../blobs";
import { newId, randomToken, sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, Client, MarketTemplate, PaymentProviderId, TemplateLicence, TemplateOrder, User } from "../data/types";
import { chargeCurrencyFor, type DisplayCurrency } from "../billing/prices";
import { PaymentError } from "../payments/errors";
import { confirmCheckout, startCheckout, type PaymentAccount, type ProviderUrls } from "../payments/provider";
import type { PlanInfo } from "../plans";
import { isStudioProject } from "../studio/section";
import { APPLY_MESSAGES, applyTemplate } from "./apply";
import { templateFits } from "./kinds";
import { recordSale } from "./money";
import { offeredPlans, periodEnd, splitSale } from "./plans";
import { CODE_PROBLEM_MESSAGES, COUPON_HOLD_MS, couponProblem, discountFor, DISCOUNT_MESSAGES, normalizeCode, quotePlan, type PlanQuote } from "./discounts";
import { templateText } from "./templates";

/**
 * 106.2 Buying a template, or renewing one, with Yallapp's own payment
 * account (Kashier unless the team chose another gateway): a one-time
 * payment on the gateway's page, where the card details stay. Prices are
 * the designer's, in US dollars; Kashier charges pounds at the team's rate
 * (lib/billing/prices.ts), and the buyer sees both. Nothing here trusts the
 * browser for a price, and nothing is delivered before the gateway confirms
 * the payment to our own request (the redirect and the webhook prove
 * nothing). Delivering happens once, however many times the gateway calls:
 * the order turns paid once (`payTemplateOrder`), and only that call goes on.
 *
 * Delivered: a purchase makes a licence (its id is the order's), with the
 * plan's period from now, and goes on the app chosen at checkout (or waits
 * for the buyer to apply it); a renewal extends the licence from its end
 * date, or from now when it ended. Each paid period is recorded, and the
 * sale's split (75% the designer's, 25% Yallapp's) is kept on the order.
 *
 * 106.12 Discounts: the plan's price is the better of its automatic price
 * (a price drop or a flash sale) or the buyer's code, worked out here when
 * the buyer pays, never taken from the browser; the order's gross is the
 * price paid, and the split is of it (the designer's 75% is of what was
 * paid). The price the buyer saw comes with the payment and must be the
 * one worked out (a flash sale ending meanwhile, or a price changed in the
 * browser, is refused). A coupon with a usage limit takes its use with the
 * order, in one step (two buyers at once: one gets the last use).
 *
 * 106.11 A paid order is never taken back (no refunds, the owner's
 * decision: nothing here or in the admin reverses one), so each one is a
 * sale in the designer's ledger for good (lib/studio-market/money.ts).
 */

/** English texts the dashboard translates (studioMarket.known). */
export const CHECKOUT_MESSAGES = {
  consent: "Tick the box to agree: it's digital content, applied right away, without refunds.",
  plan: "Choose a plan.",
  app: "Choose the app it goes on, or apply it later.",
  free: "This template is free: apply it from its page.",
  unavailable: "Card payments for templates aren't available right now. Message us on WhatsApp.",
  renewal: "This plan can't be renewed. Buy the template again instead.",
  busy: "Too many payment attempts. Try again in an hour.",
  start: "The payment couldn't start. Try again in a few minutes.",
  paidApplied: "Payment received. The template is on your app.",
  paidLater: "Payment received. Apply it to one of your apps when you're ready.",
  paidNotApplied: "Payment received, but the template couldn't go on your app. Apply it from here.",
  renewed: "Payment received. Your plan was renewed.",
  pending: "The payment isn't confirmed yet. It shows here as soon as it is.",
  failed: "The payment didn't go through. Nothing was charged; you can try again.",
} as const;

/** What the gateway charges for a price in dollars: dollars where it takes only those (iyzico), else pounds at the team's rate. Null without a rate. */
export function chargeFor(usdCents: number, provider: PaymentProviderId, egpPerUsd: number | null | undefined): { cents: number; currency: DisplayCurrency; egpPerUsd: number | null } | null {
  if (chargeCurrencyFor(provider) === "USD") return { cents: usdCents, currency: "USD", egpPerUsd: null };
  if (!egpPerUsd || !Number.isFinite(egpPerUsd) || egpPerUsd <= 0) return null;
  return { cents: Math.round(usdCents * egpPerUsd), currency: "EGP", egpPerUsd };
}

export interface CheckoutDeps {
  store: DataStore;
  /** Yallapp's account for its own payments (lib/settings/platform.ts › yallappPlanAccount). */
  account: PaymentAccount;
  /** The team's rate, pounds for one dollar. */
  egpPerUsd: number | null;
  urls?: ProviderUrls;
  fetcher?: typeof fetch;
  now: Date;
}

export interface TemplateCheckoutInput {
  client: Client;
  user: Pick<User, "name" | "email">;
  /** The buyer's apps. */
  apps: readonly App[];
  template: MarketTemplate;
  plan: string;
  /** A purchase: the app it goes on, or null to apply it later. */
  appId: string | null;
  /** A renewal: the licence it renews. */
  renew: TemplateLicence | null;
  /** "Digital content, applied right away: no refunds." ticked. */
  consent: boolean;
  /** For the gateway's page; the city stands in for an address. */
  city: string;
  ip: string;
  callbackUrls: (token: string) => { returnUrl: string; webhookUrl: string | null };
  /** 106.12 The buyer's code, as typed (any case); empty or missing for none. */
  code?: string | null;
  /** 106.12 The total the buyer saw, in US cents: when given, it must be the price worked out here. */
  expectedCents?: number;
}

export type CheckoutResult = { ok: true; url: string; order: TemplateOrder } | { ok: false; message: string; field?: "plan" | "app" | "consent" | "code" | "price" };

/** 106.12 A plan's price for this buyer now: its automatic price, or their code's when it is better. */
export async function quoteCheckout(store: DataStore, template: MarketTemplate, plan: { period: TemplateOrder["plan"]; cents: number }, code: string | null | undefined, now: Date): Promise<{ ok: true; quote: PlanQuote } | { ok: false; message: string }> {
  const automatic = await store.listMarketDiscounts({ templateIds: [template.id], kinds: ["drop", "flash"], notEndedAt: now });
  const wanted = code ? normalizeCode(code) : "";
  let coupon = null;
  if (wanted) {
    coupon = await store.findMarketCoupon(template.id, wanted);
    const uses = coupon?.usageLimit != null ? ((await store.countMarketDiscountUses([coupon.id]))[coupon.id] ?? 0) : 0;
    const problem = couponProblem(coupon, uses, now);
    if (problem) return { ok: false, message: CODE_PROBLEM_MESSAGES[problem] };
    if (!discountFor(coupon!, plan.period)) return { ok: false, message: DISCOUNT_MESSAGES.wrongPlan };
  }
  return { ok: true, quote: quotePlan(plan, automatic, coupon, now) };
}

/** Why an app can't take the template at checkout (greyed out with it), or null when it can. */
export function appProblem(template: Pick<MarketTemplate, "kinds">, app: App): "not_studio" | "kind" | null {
  if (!isStudioProject(app)) return "not_studio";
  if (!templateFits(template, app)) return "kind";
  return null;
}

/** Records the order and starts it on the gateway's page; returns the page to send the buyer to. */
export async function startTemplateCheckout(deps: CheckoutDeps, input: TemplateCheckoutInput): Promise<CheckoutResult> {
  const { template, client, now } = { ...input, now: deps.now };
  if (template.clientId === client.id) return { ok: false, message: APPLY_MESSAGES.own };
  if (template.status !== "published" || !template.currentVersionId) return { ok: false, message: APPLY_MESSAGES.notPublished };
  const plans = offeredPlans(template);
  if (!plans.length) return { ok: false, message: CHECKOUT_MESSAGES.free };
  const plan = plans.find((p) => p.period === input.plan);
  if (!plan) return { ok: false, message: CHECKOUT_MESSAGES.plan, field: "plan" };
  let appId: string | null = null;
  if (input.renew) {
    const licence = input.renew;
    if (licence.clientId !== client.id || licence.templateId !== template.id || licence.plan === "free" || licence.plan === "life") return { ok: false, message: CHECKOUT_MESSAGES.renewal };
  } else if (input.appId) {
    const app = input.apps.find((a) => a.id === input.appId && a.clientId === client.id);
    if (!app) return { ok: false, message: CHECKOUT_MESSAGES.app, field: "app" };
    if (appProblem(template, app)) return { ok: false, message: APPLY_MESSAGES.kind, field: "app" };
    const mine = await deps.store.listTemplateLicences({ clientId: client.id, templateId: template.id });
    if (mine.some((l) => l.status === "active" && l.appId === app.id)) return { ok: false, message: APPLY_MESSAGES.already, field: "app" };
    appId = app.id;
  }
  if (!input.consent) return { ok: false, message: CHECKOUT_MESSAGES.consent, field: "consent" };
  // 106.12 The price now: the better of the automatic price or the code, never the browser's.
  const quoted = await quoteCheckout(deps.store, template, plan, input.code, now);
  if (!quoted.ok) return { ok: false, message: quoted.message, field: "code" };
  const { quote } = quoted;
  if (input.expectedCents !== undefined && input.expectedCents !== quote.cents) return { ok: false, message: DISCOUNT_MESSAGES.priceChanged, field: "price" };
  const charge = chargeFor(quote.cents, deps.account.provider, deps.egpPerUsd);
  if (!charge) return { ok: false, message: CHECKOUT_MESSAGES.unavailable };

  const token = randomToken(24);
  const designer = await deps.store.getTemplateDesigner(template.designerId);
  if (!designer) return { ok: false, message: APPLY_MESSAGES.notPublished };
  const order: TemplateOrder = {
    id: newId(),
    templateId: template.id,
    designerId: designer.id,
    clientId: client.id,
    kind: input.renew ? "renew" : "buy",
    licenceId: input.renew?.id ?? null,
    plan: plan.period,
    appId,
    // 106.12 The price paid: the split is of it.
    grossCents: quote.cents,
    ...splitSale(quote.cents),
    amountCents: charge.cents,
    currency: charge.currency,
    egpPerUsd: charge.egpPerUsd,
    status: "pending",
    tokenHash: sha256Hex(token),
    paymentProvider: deps.account.provider,
    providerRef: null,
    paymentId: null,
    consentAt: now,
    startsAt: null,
    endsAt: null,
    appliedAt: null,
    applyError: null,
    createdAt: now,
    paidAt: null,
    discount: quote.discount,
  };
  // Recorded before the gateway's page: a coupon with a usage limit takes its use with it, or there is none left.
  const limit = quote.wins === "code" ? quote.code!.discount.usageLimit : null;
  if (limit !== null) {
    const claimed = await deps.store.createTemplateOrderWithCoupon(order, limit, new Date(now.getTime() - COUPON_HOLD_MS));
    if (claimed !== "ok") return { ok: false, message: CODE_PROBLEM_MESSAGES[claimed === "gone" ? "unknown" : claimed], field: "code" };
  } else await deps.store.createTemplateOrder(order);
  const name = `Studio Market: ${templateText(template, "en").title}`.slice(0, 100);
  const { returnUrl, webhookUrl } = input.callbackUrls(token);
  let started;
  try {
    started = await startCheckout(
      deps.account,
      {
        reference: `tpl-${order.id}`,
        amountCents: order.amountCents,
        currency: order.currency as "EGP" | "USD",
        description: name,
        lines: [{ id: `template-${template.id}`, name, cents: order.amountCents, category: "Design", digital: true }],
        customer: {
          id: `client-${client.id}`,
          name: input.user.name,
          email: input.user.email,
          phone: client.whatsapp ? (client.whatsapp.startsWith("+") ? client.whatsapp : `+${client.whatsapp}`) : null,
          city: input.city || "Cairo",
          address: null,
          ip: input.ip,
        },
        returnUrl,
        webhookUrl,
        iyzico: { conversationId: `tpl-${order.id}`, basketId: order.id, shipping: false },
        // The gateway's page takes the payment for an hour.
        pageExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      },
      { fetcher: deps.fetcher, urls: deps.urls },
    );
  } catch (e) {
    // Nothing to pay: the order fails (a coupon's use it held is free again).
    await deps.store.failTemplateOrder(order.id);
    if (e instanceof PaymentError) return { ok: false, message: CHECKOUT_MESSAGES.start };
    throw e;
  }
  const recorded = { ...order, providerRef: started.providerRef.slice(0, 191) };
  await deps.store.updateTemplateOrder(order.id, { providerRef: recorded.providerRef });
  return { ok: true, url: started.url, order: recorded };
}

export type OrderOutcome =
  | { kind: "paid"; order: TemplateOrder; licence: TemplateLicence; applied: boolean | null }
  | { kind: "already_paid"; order: TemplateOrder }
  | { kind: "pending" }
  | { kind: "failed" };

export interface DeliverDeps {
  store: DataStore;
  blobs: BlobStore;
  now: Date;
  /** The copies of the template's pictures and fonts for the buyer (lib/studio-market/assets.ts). */
  baseUrl?: string;
  readMedia?: (id: string) => Promise<Buffer | null>;
  /** The buyer's apps, and the plan of one (its published design keeps to it). */
  appsOf: (clientId: string) => Promise<App[]>;
  planOf: (clientId: string, appId: string) => Promise<PlanInfo | null>;
}

/**
 * Reads the order's payment back from the gateway (the trigger proves
 * nothing) and, the first time it is confirmed, delivers it. A webhook and
 * the buyer's return arriving together deliver once.
 */
export async function completeTemplateOrder(
  deps: Omit<CheckoutDeps, "egpPerUsd"> & DeliverDeps,
  order: TemplateOrder,
  trigger: { providerRef?: string | null; iyzicoToken?: string },
): Promise<OrderOutcome> {
  if (order.status === "paid") return { kind: "already_paid", order };
  if (order.status !== "pending") return { kind: "failed" };
  if (deps.account.provider !== order.paymentProvider) return { kind: "failed" };
  let result;
  try {
    result = await confirmCheckout(
      deps.account,
      {
        reference: `tpl-${order.id}`,
        amountCents: order.amountCents,
        currency: order.currency as "EGP" | "USD",
        providerRef: trigger.providerRef ?? order.providerRef,
        ...(trigger.iyzicoToken ? { iyzico: { token: trigger.iyzicoToken, conversationId: `tpl-${order.id}`, basketId: order.id } } : {}),
      },
      { fetcher: deps.fetcher, urls: deps.urls },
    );
  } catch (e) {
    if (e instanceof PaymentError) return { kind: order.paymentProvider === "iyzico" ? "failed" : "pending" };
    throw e;
  }
  if (!result.paid) {
    // iyzico's answer is final; the other gateways' payment may still complete (their webhook tells us).
    if (order.paymentProvider !== "iyzico") return { kind: "pending" };
    await deps.store.failTemplateOrder(order.id);
    return { kind: "failed" };
  }
  if (!(await deps.store.payTemplateOrder(order.id, result.paymentId, deps.now))) return { kind: "already_paid", order };
  const paid: TemplateOrder = { ...order, status: "paid", paymentId: result.paymentId, paidAt: deps.now };
  return deliverTemplateOrder(deps, paid);
}

/**
 * A paid order's licence and period, then (a purchase for an app) the
 * template on that app. Safe to run again for an order paid before (a
 * delivery cut short): what is there already is kept.
 */
export async function deliverTemplateOrder(deps: DeliverDeps, order: TemplateOrder): Promise<OrderOutcome> {
  const { store, now } = deps;
  // 106.11 The sale in the designer's ledger first, from the order's own split (once, however often this runs).
  await recordSale(store, order, now);
  const template = await store.getMarketTemplate(order.templateId);
  if (!template) return { kind: "failed" };
  let licence: TemplateLicence | null;
  let startsAt: Date;
  let endsAt: Date | null;
  if (order.kind === "buy") {
    licence = await store.getTemplateLicence(order.id);
    startsAt = licence?.startsAt ?? order.paidAt ?? now;
    endsAt = order.plan === "life" ? null : periodEnd(startsAt, order.plan);
    if (!licence) {
      licence = {
        id: order.id,
        templateId: template.id,
        clientId: order.clientId,
        plan: order.plan,
        status: "active",
        appId: null,
        versionId: template.currentVersionId,
        startsAt,
        endsAt,
        movedAt: null,
        afterEnd: endsAt ? template.afterEnd : null,
        remindedEarlyFor: null,
        remindedLastFor: null,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await store.createTemplateLicence(licence);
      } catch (e) {
        // Delivered by another call meanwhile.
        licence = await store.getTemplateLicence(order.id);
        if (!licence) throw e;
      }
    }
    await store.updateTemplateOrder(order.id, { licenceId: licence.id });
  } else {
    const found = order.licenceId ? await store.getTemplateLicence(order.licenceId) : null;
    if (!found) return { kind: "failed" };
    licence = found;
    const periods = await store.listTemplateLicencePeriods(found.id);
    const had = periods.find((p) => p.orderId === order.id);
    if (had) {
      startsAt = had.startsAt;
      endsAt = had.endsAt;
    } else {
      // From its end date while it runs, from now once it ended; two renewals at once each extend the other's end.
      let extended = false;
      let from: Date | null = found.endsAt;
      let current = found;
      startsAt = now;
      endsAt = null;
      for (let attempt = 0; attempt < 5 && !extended; attempt++) {
        startsAt = current.status === "active" && from && from.getTime() > now.getTime() ? from : now;
        endsAt = order.plan === "life" ? null : periodEnd(startsAt, order.plan);
        extended = await store.extendTemplateLicence(current.id, from, { plan: order.plan, endsAt, afterEnd: endsAt ? template.afterEnd : null }, now);
        if (!extended) {
          const again = await store.getTemplateLicence(current.id);
          if (!again) return { kind: "failed" };
          current = again;
          from = again.endsAt;
        }
      }
      if (!extended) throw new Error("The licence couldn't be extended");
      licence = (await store.getTemplateLicence(found.id)) ?? found;
    }
  }
  await store.createTemplateLicencePeriod({ id: order.id, licenceId: licence.id, orderId: order.id, plan: order.plan, startsAt, endsAt, createdAt: now });
  const first = await store.markTemplateOrderDelivered(order.id, startsAt, endsAt);
  let applied: boolean | null = null;
  // A purchase for an app: the template goes on it now (once).
  if (order.kind === "buy" && order.appId && first && !licence.appId) {
    const apps = await deps.appsOf(order.clientId);
    const done = await applyTemplate(
      { store, blobs: deps.blobs, now, baseUrl: deps.baseUrl, readMedia: deps.readMedia },
      { clientId: order.clientId, apps, appId: order.appId, template, licenceId: licence.id, by: "Studio Market checkout", plan: await deps.planOf(order.clientId, order.appId) },
    );
    applied = done.ok;
    await store.updateTemplateOrder(order.id, done.ok ? { appliedAt: now } : { applyError: done.message });
    licence = (await store.getTemplateLicence(licence.id)) ?? licence;
  }
  const delivered = (await store.getTemplateOrder(order.id)) ?? order;
  return first ? { kind: "paid", order: delivered, licence, applied } : { kind: "already_paid", order: delivered };
}

/** The plans a renewal may take: every plan the template offers now (lifetime too: it then never ends). */
export function renewalPlans(template: Pick<MarketTemplate, "free" | "plans">) {
  return offeredPlans(template);
}

/** Whether a licence's plan is one that ends (can be renewed). */
export function renewable(licence: Pick<TemplateLicence, "plan">): boolean {
  return licence.plan !== "free" && licence.plan !== "life";
}
