import { chargeCurrencyFor } from "../../billing/prices";
import { randomToken, sha256Hex } from "../../crypto/tokens";
import { PaymentError } from "../../payments/errors";
import type { CheckoutRequest, ExpectedPayment, PaymentAccount, ProviderOptions, StartedCheckout, Confirmation } from "../../payments/provider";
import type { Settled, Trigger } from "../../payments/settle";
import { communityLang } from "../trust/notifications";
import { fail, type Fail } from "../trust/service";
import { engageOf, type EngageCtx } from "./context";
import { courseReceiptEmail } from "./receipt";
import type { CourseOrder } from "./store";

/**
 * 233 Buying a course, on the website only: the same checkout as Yallapp's
 * own payments (Studio Market templates, plans): Yallapp's account with the
 * gateway the team chose (yallappPlanAccount), the gateway's page, then
 * the payment read back from the gateway on the return and the webhook,
 * whichever comes first, settled once. A paid order unlocks the course
 * (area B's access record) and sends a receipt. The admin sets each course's
 * price in dollars, or makes it free (area B). The app never shows a price,
 * a buy button or a payment link: it shows courses bought here, unlocked.
 */

/** What area B's academy gives the checkout (lib/community/academy). */
export interface CourseShop {
  /** The course's price for the checkout (never in the API), its title and its page's slug; null: no such course. */
  price(ctx: EngageCtx, courseId: string): Promise<{ title: string; slug: string; amountMinor: number; currency: string; free: boolean } | null>;
  owned(ctx: EngageCtx, memberId: string, courseId: string): Promise<boolean>;
  /** Idempotent on (member, course). */
  grant(ctx: EngageCtx, input: { tenant: string; memberId: string; courseId: string; source: "purchase"; ref: string }): Promise<void>;
}

/** Yallapp's own checkout, as Studio Market uses it (lib/community/deps.ts gives the real one; tests a fake). */
export interface CourseCheckoutGateway {
  /** Yallapp's account for its own payments; null until the team sets one. */
  account: PaymentAccount | null;
  /** The team's pound-to-dollar rate, for gateways that charge pounds. */
  egpPerUsd: number | null;
  start(account: PaymentAccount, request: CheckoutRequest, options?: ProviderOptions): Promise<StartedCheckout>;
  confirm(account: PaymentAccount, expected: ExpectedPayment, options?: ProviderOptions): Promise<Confirmation>;
  /** Where the gateway sends the buyer back and posts its webhook (/api/pay/<gateway>/course/<token>). */
  callbackUrls(provider: PaymentAccount["provider"], token: string): { returnUrl: string; webhookUrl: string | null };
}

const PAGE_OPEN_MS = 60 * 60 * 1000;

/** What the gateway charges for a price in dollars: dollars where it takes only those, pounds at the team's rate otherwise. */
export function courseCharge(usdCents: number, provider: PaymentAccount["provider"], egpPerUsd: number | null): { cents: number; currency: "USD" | "EGP" } | null {
  if (chargeCurrencyFor(provider) === "USD") return { cents: usdCents, currency: "USD" };
  if (!egpPerUsd || !Number.isFinite(egpPerUsd) || egpPerUsd <= 0) return null;
  return { cents: Math.round(usdCents * egpPerUsd), currency: "EGP" };
}

/** The course's page on the Community's website, with how the checkout went. */
const coursePage = (ctx: EngageCtx, slug: string, outcome: "done" | "pending" | "failed" | "cancelled") => `${ctx.deps.siteUrl}/academy/${encodeURIComponent(slug)}?checkout=${outcome}`;

/**
 * Starts the checkout for a member on the website (a cookie session; the
 * app's token is refused by the route): the gateway's page to send them to.
 */
export async function startCourseCheckout(ctx: EngageCtx, memberId: string, courseId: string, input: { ip: string }): Promise<{ ok: true; url: string; order: CourseOrder } | Fail> {
  const shop = ctx.deps.courses;
  const gateway = ctx.deps.courseCheckout ? await ctx.deps.courseCheckout() : null;
  if (!shop || !gateway?.account) return fail(503, "checkout_unavailable", "Buying courses isn't available right now.");
  const course = await shop.price(ctx, courseId);
  if (!course) return fail(404, "not_found", "There's no such course.");
  if (course.free) return fail(409, "course_free", "This course is free: start it from its page.");
  if (await shop.owned(ctx, memberId, courseId)) return fail(409, "already_owned", "You have this course already.");
  if (course.currency !== "USD" || !Number.isInteger(course.amountMinor) || course.amountMinor <= 0) return fail(503, "checkout_unavailable", "This course can't be bought right now.");
  const account = gateway.account;
  const charge = courseCharge(course.amountMinor, account.provider, gateway.egpPerUsd);
  if (!charge) return fail(503, "checkout_unavailable", "Buying courses isn't available right now.");
  const member = await ctx.store.base.getMember(memberId);
  if (!member) return fail(404, "not_found", "There's no such member.");

  const { store, tenantId } = engageOf(ctx);
  const token = randomToken(24);
  const order = await store.addOrder({ tenantId, memberId, courseId, amountCents: charge.cents, currency: charge.currency, provider: account.provider, providerRef: null, tokenHash: sha256Hex(token), status: "pending", createdAt: ctx.now, paidAt: null });
  const name = `Yallapp Academy: ${course.title}`.slice(0, 100);
  const { returnUrl, webhookUrl } = gateway.callbackUrls(account.provider, token);
  let started: StartedCheckout;
  try {
    started = await gateway.start(account, {
      reference: `crs-${order.id}`,
      amountCents: order.amountCents,
      currency: order.currency as "USD" | "EGP",
      description: name,
      lines: [{ id: `course-${courseId}`, name, cents: order.amountCents, category: "Education", digital: true }],
      customer: { id: `member-${memberId}`, name: member.displayName, email: member.email ?? "", phone: null, city: "Istanbul", address: null, ip: input.ip },
      returnUrl,
      webhookUrl,
      iyzico: { conversationId: `crs-${order.id}`, basketId: order.id, shipping: false },
      pageExpiresAt: new Date(ctx.now.getTime() + PAGE_OPEN_MS),
    });
  } catch (e) {
    await store.settleOrder(order.id, { status: "failed", at: ctx.now });
    if (e instanceof PaymentError) return fail(502, "checkout_failed", "The payment page couldn't open. Nothing was charged; try again.");
    throw e;
  }
  const ref = started.providerRef.slice(0, 191);
  await store.setOrderRef(order.id, ref);
  return { ok: true, url: started.url, order: { ...order, providerRef: ref } };
}

/**
 * The gateway's return, its webhook, or iyzico's callback: the payment read
 * back from the gateway with Yallapp's account, the order paid once, the
 * course unlocked and the receipt sent. Nothing in the address is trusted.
 */
export async function settleCourseOrder(ctx: EngageCtx, token: string, trigger: Trigger): Promise<Settled> {
  const academy = `${ctx.deps.siteUrl}/academy`;
  const { store } = engageOf(ctx);
  const order = await store.getOrderByToken(sha256Hex(token));
  if (!order) return { status: "not_found", path: academy };
  const shop = ctx.deps.courses;
  const course = shop ? await shop.price({ ...ctx, tenant: order.tenantId }, order.courseId) : null;
  const page = (outcome: "done" | "pending" | "failed") => (course ? coursePage(ctx, course.slug, outcome) : academy);
  if (order.status === "paid") return { status: "already_paid", path: page("done") };
  if (order.status !== "pending" || order.provider !== trigger.provider) return { status: "failed", path: page("failed") };
  const gateway = ctx.deps.courseCheckout ? await ctx.deps.courseCheckout() : null;
  const account = gateway?.account;
  if (!gateway || !account || account.provider !== order.provider || !shop) return { status: "failed", path: page("failed") };
  if (trigger.verify && !trigger.verify(account)) return { status: "rejected", path: page("pending") };
  let result: Confirmation;
  try {
    result = await gateway.confirm(account, {
      reference: `crs-${order.id}`,
      amountCents: order.amountCents,
      currency: order.currency as "USD" | "EGP",
      providerRef: trigger.providerRef ?? order.providerRef,
      ...(trigger.iyzicoToken ? { iyzico: { token: trigger.iyzicoToken, conversationId: `crs-${order.id}`, basketId: order.id } } : {}),
    });
  } catch (e) {
    if (e instanceof PaymentError) return { status: order.provider === "iyzico" ? "failed" : "pending", path: page(order.provider === "iyzico" ? "failed" : "pending") };
    throw e;
  }
  if (!result.paid) {
    // iyzico's answer is final; the other gateways' payment may still complete (their webhook tells us).
    if (order.provider !== "iyzico") return { status: "pending", path: page("pending") };
    await store.settleOrder(order.id, { status: "failed", at: ctx.now });
    return { status: "failed", path: page("failed") };
  }
  const paid = await store.settleOrder(order.id, { status: "paid", at: ctx.now, providerRef: result.paymentId ?? null });
  // Settled a moment ago by the other call (the return and the webhook at once).
  if (!paid) return { status: "already_paid", path: page("done") };
  await shop.grant({ ...ctx, tenant: order.tenantId }, { tenant: order.tenantId, memberId: order.memberId, courseId: order.courseId, source: "purchase", ref: order.id });
  await sendReceipt(ctx, paid, course?.title ?? "");
  return { status: "paid", path: page("done") };
}

/** The buyer's receipt by email, in their language. Never fails the payment. */
async function sendReceipt(ctx: EngageCtx, order: CourseOrder, title: string): Promise<void> {
  try {
    const member = await ctx.store.base.getMember(order.memberId);
    if (!member?.email) return;
    const mail = courseReceiptEmail({ lang: communityLang(member.language), title, amountCents: order.amountCents, currency: order.currency, paidAt: order.paidAt ?? ctx.now, orderId: order.id, link: `${ctx.deps.siteUrl}/academy` });
    await ctx.deps.mail({ to: member.email, ...mail });
  } catch (error) {
    console.warn(`[community] receipt for course order ${order.id} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
