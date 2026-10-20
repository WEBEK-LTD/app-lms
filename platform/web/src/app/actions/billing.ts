"use server";

import { redirect } from "next/navigation";
import { clientFor, requestIp } from "@/lib/auth/session";
import { cardPlans, readBilling, startPlanPayment, activateWithFreeCoupon } from "@/lib/billing/plan-payment";
import { COUPON_CHECK_LIMIT, findCoupon, type CouponCheck } from "@/lib/billing/coupons";
import { sendPlanPaidMail } from "@/lib/billing/plan-mail";
import { priceView } from "@/lib/billing/display";
import { formatMoney, loweredOffer, offerFor } from "@/lib/billing/prices";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { PaymentError } from "@/lib/payments/errors";
import { explainPaymentError } from "@/lib/payments/explain";
import { callbackUrls } from "@/lib/payments/routes";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getPlans, platformSetting, yallappBilling, yallappPlanAccount } from "@/lib/settings/platform";
import { packOffers, renewablePacks } from "@/lib/media/packs";
import { featureOn, getSwitches } from "@/lib/switches";
import { revalidatePath } from "next/cache";
import { recordStaffChange } from "@/lib/admin/audit";
import { cancelScheduledPlan, scheduleDowngrade } from "@/lib/billing/plan-change";
import { isPlan, planPriceOf } from "@/lib/plans";

/**
 * The client pays the current app's plan by card: off to the provider's payment
 * page (or, with a coupon for the whole price, activated at once). The
 * payment activates or extends that app only.
 */
export async function payPlanAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (context.client.status === "suspended") return { message: "This account is suspended. Message us on WhatsApp." };
  const values: Record<string, string> = {};
  for (const name of ["plan", "city", "address", "coupon", "renewStorage"]) values[name] = String(formData.get(name) ?? "").trim();
  // The form names the app it was shown for: never pay for another app because the switcher changed in another tab.
  if (String(formData.get("appId") ?? "") !== (context.app?.id ?? "")) {
    return { message: "You switched to another app in the meantime. Reload the page and check which app you're paying for.", values };
  }
  const store = await getStore();
  const plans = await getPlans(store);
  const plan = isPlan(values.plan) ? plans[values.plan] : null;
  const price = plan ? planPriceOf(plan) : null;
  if (!plan || !price) return { errors: { plan: "Choose a plan." }, values };
  // 11.5 Switches: card payments can be switched off, for everyone or per plan.
  if (!featureOn(await getSwitches(store), "plan_card_payments", plan.id)) {
    return { message: "Card payments aren't available for this plan. Message us on WhatsApp to pay.", values };
  }
  const billing = readBilling(values);
  if (!billing.ok) return { errors: billing.errors, values };
  // 52 Yallapp's account with the gateway the team chose for its plans (Kashier unless set otherwise).
  const account = await yallappPlanAccount(store, encryptionKey());
  if (!account) return { message: "Card payments aren't available right now. Message us on WhatsApp to pay.", values };
  const view = await priceView(store, context.client, { fresh: true });
  // 52 Charged in pounds through Kashier wherever the client is; shown in dollars outside Egypt.
  let offer = offerFor(price, view.display, account.provider, view.egpPerUsd);
  if (!offer || !cardPlans(plans, account.provider, view.egpPerUsd).some((p) => p.id === plan.id)) {
    return { message: "This plan can't be paid by card right now. Message us on WhatsApp to pay.", values };
  }
  const now = new Date();
  if (!(await hitRateLimit(store, RATE_LIMITS.planPayment, context.client.id, now)).allowed) {
    return { message: "Too many payment attempts. Try again in an hour, or message us on WhatsApp.", values };
  }
  // The price comes from the plan and the coupon here, never from the browser.
  let coupon: Extract<CouponCheck, { ok: true }> | undefined;
  if (values.coupon) {
    const check = await findCoupon(store, { code: values.coupon, plan, charged: offer.charged, client: context.client, license: context.license, now });
    if (!check.ok) return { errors: { coupon: check.error }, values };
    coupon = check;
  }
  // 51 The app's storage packs renewed with the plan, when the owner left them ticked: for the plan's months, charged with it.
  const storagePacks =
    values.renewStorage === "on" && context.app
      ? renewablePacks(await store.listStoragePacks(context.app.id), packOffers((await platformSetting(store, "storagePacks", { fresh: true }))?.value), {
          provider: account.provider,
          view,
          months: plan.billingMonths,
          now,
        })
      : null;
  // The coupon is for the plan only: with packs to pay, the card payment still goes ahead.
  if (coupon && coupon.amountCents === 0 && !storagePacks) {
    const outcome = await activateWithFreeCoupon({
      store,
      client: context.client,
      app: context.app,
      plan,
      coupon,
      charged: offer.charged,
      encryptionKey: encryptionKey(),
      now,
    });
    await sendPlanPaidMail(store, context.client, outcome);
    redirect("/dashboard/license?payment=paid");
  }
  if (coupon) offer = loweredOffer(offer, coupon.amountCents);
  let url: string;
  try {
    url = await startPlanPayment({
      store,
      account,
      urls: paymentApiUrls(),
      now,
      client: context.client,
      app: context.app,
      user: context.user,
      plan,
      billing: billing.billing,
      ip: await requestIp(),
      callbackUrls: (token) => callbackUrls(appUrl(), "plan", account.provider, token),
      coupon,
      offer,
      storagePacks,
    });
  } catch (e) {
    if (e instanceof PaymentError) return { message: `The payment couldn't start: ${explainPaymentError(account.provider, e, { whose: "yallapp" })}`, values };
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
  /** 52 In the client's currency; `charge`: the line about the charge in pounds, when the price shows in dollars. */
  prices?: Record<string, { price: string; was: string; free: boolean; charge: string | null }>;
}

/** Shows what a coupon takes off each plan the client can pay by card; the payment checks it again. */
export async function checkCouponAction(_: CouponState, formData: FormData): Promise<CouponState> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  const code = String(formData.get("coupon") ?? "").trim();
  if (!code) return { error: "Enter a coupon code." };
  const store = await getStore();
  const now = new Date();
  if (!(await hitRateLimit(store, COUPON_CHECK_LIMIT, context.client.id, now)).allowed) {
    return { error: "Too many coupon codes tried. Try again in an hour." };
  }
  // 52 The prices as the form shows them: the client's currency, lowered from the charge in pounds.
  const [{ planProvider }, view] = await Promise.all([yallappBilling(store, { fresh: true }), priceView(store, context.client, { fresh: true })]);
  const plans = cardPlans(await getPlans(store), planProvider, view.egpPerUsd);
  const prices: NonNullable<CouponState["prices"]> = {};
  let firstError: string | undefined;
  for (const plan of plans) {
    const offer = offerFor(planPriceOf(plan)!, view.display, planProvider, view.egpPerUsd);
    if (!offer) continue;
    const check = await findCoupon(store, { code, plan, charged: offer.charged, client: context.client, license: context.license, now });
    if (!check.ok) {
      firstError ??= check.error;
      continue;
    }
    const lowered = loweredOffer(offer, check.amountCents);
    prices[plan.id] = { price: formatMoney(lowered.shown), was: formatMoney(offer.shown), free: check.amountCents === 0, charge: lowered.line };
  }
  if (!Object.keys(prices).length) return { error: firstError ?? "This coupon code isn't valid." };
  const applies = plans.filter((p) => prices[p.id]).map((p) => p.name);
  return {
    code: code.toUpperCase(),
    prices,
    message: `Coupon applied${applies.length < plans.length ? ` to ${applies.join(" and ")}` : ""}. The price below is what you pay.`,
  };
}

// 13.3 Plan changes without paying now

/** The form names the app it was shown for; never change another app because the switcher moved in another tab. */
async function contextFor(formData: FormData) {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  if (String(formData.get("appId") ?? "") !== (context.app?.id ?? "")) redirect("/dashboard/license?plan_change=switched#change-plan");
  return context;
}

/** A lower plan from the end of the paid period: no days are lost, nothing is charged now. */
export async function scheduleDowngradeAction(formData: FormData): Promise<void> {
  const context = await contextFor(formData);
  const to = String(formData.get("plan") ?? "");
  if (!context.license || !isPlan(to) || context.client.status === "suspended") redirect("/dashboard/license#change-plan");
  const store = await getStore();
  const result = await scheduleDowngrade(store, context.license, to, new Date());
  if (result.ok) {
    const plans = await getPlans(store);
    await recordStaffChange(context, `Scheduled a move to the ${plans[to].name} plan when the current period ends`);
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/license?plan_change=${result.ok ? "scheduled" : "refused"}#change-plan`);
}

/** Keeps the current plan: drops a scheduled downgrade. */
export async function cancelScheduledPlanAction(formData: FormData): Promise<void> {
  const context = await contextFor(formData);
  if (context.license) {
    await cancelScheduledPlan(await getStore(), context.license, new Date());
    await recordStaffChange(context, "Kept the current plan (dropped a scheduled plan change)");
  }
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/license?plan_change=kept#change-plan");
}

/** Closes an owner notice on the dashboard (13.2, 13.4). Only the client's own. */
export async function dismissNoticeAction(formData: FormData): Promise<void> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  const id = Number(formData.get("id"));
  if (Number.isSafeInteger(id) && id > 0) await (await getStore()).updateOwnerNotice(context.client.id, id, { dismissedAt: new Date() });
  revalidatePath("/dashboard", "layout");
}
