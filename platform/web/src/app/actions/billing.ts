"use server";

import { redirect } from "next/navigation";
import { getClientContext, requestIp } from "@/lib/auth/session";
import { cardPlans, readBilling, startPlanPayment, activateWithFreeCoupon } from "@/lib/billing/plan-payment";
import { COUPON_CHECK_LIMIT, findCoupon, type CouponCheck } from "@/lib/billing/coupons";
import { sendPlanPaidMail } from "@/lib/billing/plan-mail";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { IyzicoError } from "@/lib/payments/iyzico";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getPlans, yallappIyzicoKeys } from "@/lib/settings/platform";

/** The client pays a plan by card: off to iyzico's payment page (or, with a coupon for the whole price, activated at once). */
export async function payPlanAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (context.client.status === "suspended") return { message: "This account is suspended. Message us on WhatsApp." };
  const values: Record<string, string> = {};
  for (const name of ["plan", "city", "address", "coupon"]) values[name] = String(formData.get(name) ?? "").trim();
  const store = await getStore();
  const plans = await getPlans(store);
  const plan = values.plan === "starter" || values.plan === "pro" ? plans[values.plan] : null;
  if (!plan || plan.priceCents === null) return { errors: { plan: "Choose a plan." }, values };
  const billing = readBilling(values);
  if (!billing.ok) return { errors: billing.errors, values };
  const keys = await yallappIyzicoKeys(store, encryptionKey());
  if (!keys) return { message: "Card payments aren't available right now. Message us on WhatsApp to pay.", values };
  const now = new Date();
  if (!(await hitRateLimit(store, RATE_LIMITS.planPayment, context.client.id, now)).allowed) {
    return { message: "Too many payment attempts. Try again in an hour, or message us on WhatsApp.", values };
  }
  // The price comes from the plan and the coupon here, never from the browser.
  let coupon: Extract<CouponCheck, { ok: true }> | undefined;
  if (values.coupon) {
    const check = await findCoupon(store, { code: values.coupon, plan, client: context.client, now });
    if (!check.ok) return { errors: { coupon: check.error }, values };
    coupon = check;
  }
  if (coupon && coupon.amountCents === 0) {
    const outcome = await activateWithFreeCoupon({ store, client: context.client, plan, coupon, encryptionKey: encryptionKey(), now });
    await sendPlanPaidMail(store, context.client, outcome);
    redirect("/dashboard/license?payment=paid");
  }
  let url: string;
  try {
    url = await startPlanPayment({
      store,
      keys,
      baseUrl: iyzicoApiUrl(),
      now,
      client: context.client,
      user: context.user,
      plan,
      billing: billing.billing,
      ip: await requestIp(),
      callbackUrl: (token) => `${appUrl()}/api/pay/plan/${encodeURIComponent(token)}`,
      coupon,
    });
  } catch (e) {
    if (e instanceof IyzicoError) return { message: `The payment couldn't start: ${e.message}`, values };
    throw e;
  }
  redirect(url);
}

export interface CouponState {
  /** The code as applied, upper case. */
  code?: string;
  error?: string;
  /** "20% off" and the price per plan with the coupon. */
  message?: string;
  prices?: Record<string, { price: string; was: string; free: boolean }>;
}

/** Shows what a coupon takes off each plan the client can pay by card; the payment checks it again. */
export async function checkCouponAction(_: CouponState, formData: FormData): Promise<CouponState> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  const code = String(formData.get("coupon") ?? "").trim();
  if (!code) return { error: "Enter a coupon code." };
  const store = await getStore();
  const now = new Date();
  if (!(await hitRateLimit(store, COUPON_CHECK_LIMIT, context.client.id, now)).allowed) {
    return { error: "Too many coupon codes tried. Try again in an hour." };
  }
  const plans = cardPlans(await getPlans(store));
  const prices: NonNullable<CouponState["prices"]> = {};
  let firstError: string | undefined;
  for (const plan of plans) {
    const check = await findCoupon(store, { code, plan, client: context.client, now });
    if (!check.ok) {
      firstError ??= check.error;
      continue;
    }
    prices[plan.id] = { price: formatCents(check.amountCents, plan.currency), was: formatCents(check.fullCents, plan.currency), free: check.amountCents === 0 };
  }
  if (!Object.keys(prices).length) return { error: firstError ?? "This coupon code isn't valid." };
  const applies = plans.filter((p) => prices[p.id]).map((p) => p.name);
  return {
    code: code.toUpperCase(),
    prices,
    message: `Coupon applied${applies.length < plans.length ? ` to ${applies.join(" and ")}` : ""}. The price below is what you pay.`,
  };
}
