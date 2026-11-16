"use server";

import { redirect } from "next/navigation";
import { clientFor, requestIp } from "@/lib/auth/session";
import { readBilling } from "@/lib/billing/plan-payment";
import { COUPON_CHECK_LIMIT, CouponUsedUpError, findCoupon, type CouponCheck } from "@/lib/billing/coupons";
import { priceView } from "@/lib/billing/display";
import { formatMoney, loweredOffer, offerFor } from "@/lib/billing/prices";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { PaymentError } from "@/lib/payments/errors";
import { explainPaymentError } from "@/lib/payments/explain";
import { providerTakes } from "@/lib/payments/provider";
import { callbackUrls } from "@/lib/payments/routes";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getPlans, platformSetting, yallappPlanAccount } from "@/lib/settings/platform";
import { appPlan } from "@/lib/entitlements";
import { revalidatePath } from "next/cache";
import { recordStaffChange } from "@/lib/admin/audit";
import { addonById, addonMonthsOf, addonPriceOf, isAddonBilling } from "@/lib/addons/catalog";
import { addonRefusal, addonRenewable } from "@/lib/addons/rules";
import { addonWithFreeCoupon, startAddonPayment } from "@/lib/addons/payment";
import { afterAddonPaid } from "@/lib/addons/notify";
import type { AppAddon } from "@/lib/addons/types";
import { addonsPath, isStudioProject } from "@/lib/studio/section";


/**
 * 133 The client buys an add-on for the current app, or renews one it has:
 * off to the provider's payment page (Yallapp's plan gateway, charged in
 * pounds), or at once with a coupon for the whole price. Who may buy it,
 * its price and the coupon are checked here, never taken from the browser.
 */
export async function buyAddonAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  const values: Record<string, string> = {};
  for (const name of ["addon", "billing", "renews", "city", "address", "coupon"]) values[name] = String(formData.get(name) ?? "").trim();
  if (context.client.status === "suspended") return { message: "This account is suspended. Message us on WhatsApp.", values };
  if (String(formData.get("appId") ?? "") !== (context.app?.id ?? "")) {
    return { message: "You switched to another app in the meantime. Reload the page and check which app you're paying for.", values };
  }
  const app = context.app;
  const license = context.license;
  if (!app || !license) return { message: "Add-ons come with a plan. Choose your plan first.", values };
  const store = await getStore();
  const now = new Date();
  const setting = (await platformSetting(store, "addons", { fresh: true }))?.value;
  const addon = addonById(setting, values.addon!);
  if (!addon) return { message: "This add-on isn't available. Reload the page.", values };
  if (!isAddonBilling(values.billing) || !addonPriceOf(addon, values.billing)) return { errors: { billing: "Choose how you pay for it." }, values };
  const billing = values.billing;
  const owned = await store.listAppAddons({ appId: app.id });
  // Renewing one the app has: its own add-on, still renewable, for one of its periods.
  let renews: AppAddon | null = null;
  if (values.renews) {
    renews = owned.find((o) => o.id === values.renews && o.addonId === addon.id) ?? null;
    if (!renews || !addonRenewable(renews) || billing === "once") return { message: "This add-on can't be renewed. Reload the page.", values };
  } else {
    const plan = await appPlan(store, license, now);
    const refusal = addonRefusal(addon, { plans: await getPlans(store), plan, family: isStudioProject(app) ? "studio" : "regular", owned, setting, now });
    if (refusal) return { message: refusal === "owned" ? "This app has this add-on already. Renew it below." : "This add-on isn't available for this app.", values };
  }
  const details = readBilling(values);
  if (!details.ok) return { errors: details.errors, values };
  const account = await yallappPlanAccount(store, encryptionKey());
  if (!account) return { message: "Card payments aren't available right now. Message us on WhatsApp to pay.", values };
  const view = await priceView(store, context.client, { fresh: true });
  let offer = offerFor(addonPriceOf(addon, billing)!, view.display, account.provider, view.egpPerUsd);
  if (!offer || !providerTakes(account.provider, offer.charged.currency)) return { message: "This add-on can't be paid by card right now. Message us on WhatsApp to pay.", values };
  if (!(await hitRateLimit(store, RATE_LIMITS.planPayment, context.client.id, now)).allowed) {
    return { message: "Too many payment attempts. Try again in an hour, or message us on WhatsApp.", values };
  }
  let coupon: Extract<CouponCheck, { ok: true }> | undefined;
  const plans = await getPlans(store);
  if (values.coupon) {
    const check = await findCoupon(store, {
      code: values.coupon,
      plan: plans[license.plan],
      months: addonMonthsOf(billing),
      target: { kind: "addon", id: addon.id, name: addon.en.name, boughtBefore: owned.some((o) => o.addonId === addon.id) },
      charged: offer.charged,
      client: context.client,
      license,
      now,
    });
    if (!check.ok) return { errors: { coupon: check.error }, values };
    coupon = check;
  }
  if (coupon && coupon.amountCents === 0) {
    let done: Awaited<ReturnType<typeof addonWithFreeCoupon>>;
    try {
      done = await addonWithFreeCoupon({ store, client: context.client, app, license, addon, billing, renews, coupon, currency: offer.charged.currency, now });
    } catch (e) {
      if (e instanceof CouponUsedUpError) return { errors: { coupon: e.message }, values };
      throw e;
    }
    await afterAddonPaid(store, context.client, app, done.payment, done.addon);
    await recordStaffChange(context, `Added the add-on ${addon.en.name} with a coupon`);
    revalidatePath("/dashboard", "layout");
    redirect(addonsPath(app, "?payment=paid"));
  }
  if (coupon) offer = loweredOffer(offer, coupon.amountCents);
  let url: string;
  try {
    url = await startAddonPayment({
      store,
      account,
      urls: paymentApiUrls(),
      now,
      client: context.client,
      app,
      license,
      user: context.user,
      addon,
      billing,
      renews,
      offer,
      coupon,
      billingDetails: details.billing,
      ip: await requestIp(),
      callbackUrls: (token) => callbackUrls(appUrl(), "plan", account.provider, token),
    });
  } catch (e) {
    if (e instanceof PaymentError) return { message: `The payment couldn't start: ${explainPaymentError(account.provider, e, { whose: "yallapp" })}`, values };
    if (e instanceof CouponUsedUpError) return { errors: { coupon: e.message }, values };
    throw e;
  }
  redirect(url);
}

export interface AddonCouponState {
  code?: string;
  error?: string;
  message?: string;
  /** By way to pay: the lowered price in the client's currency. */
  prices?: Record<string, { price: string; was: string; free: boolean; charge: string | null }>;
}

/** 133 What a coupon takes off an add-on's ways to pay; the payment checks it again. */
export async function checkAddonCouponAction(_: AddonCouponState, formData: FormData): Promise<AddonCouponState> {
  const context = await clientFor("billing");
  if (!context) redirect("/sign-in");
  const code = String(formData.get("coupon") ?? "").trim();
  if (!code) return { error: "Enter a coupon code." };
  if (!context.app || !context.license) return { error: "This coupon code isn't valid." };
  const store = await getStore();
  const now = new Date();
  if (!(await hitRateLimit(store, COUPON_CHECK_LIMIT, context.client.id, now)).allowed) return { error: "Too many coupon codes tried. Try again in an hour." };
  const addon = addonById((await platformSetting(store, "addons"))?.value, String(formData.get("addon") ?? ""));
  const account = await yallappPlanAccount(store, encryptionKey());
  if (!addon || !account) return { error: "This coupon code isn't valid." };
  const view = await priceView(store, context.client, { fresh: true });
  const plans = await getPlans(store);
  const owned = await store.listAppAddons({ appId: context.app.id });
  const prices: NonNullable<AddonCouponState["prices"]> = {};
  let firstError: string | undefined;
  for (const billing of Object.keys(addon.prices)) {
    if (!isAddonBilling(billing)) continue;
    const price = addonPriceOf(addon, billing);
    const offer = price ? offerFor(price, view.display, account.provider, view.egpPerUsd) : null;
    if (!offer) continue;
    const check = await findCoupon(store, {
      code,
      plan: plans[context.license.plan],
      months: addonMonthsOf(billing),
      target: { kind: "addon", id: addon.id, name: addon.en.name, boughtBefore: owned.some((o) => o.addonId === addon.id) },
      charged: offer.charged,
      client: context.client,
      license: context.license,
      now,
    });
    if (!check.ok) {
      firstError ??= check.error;
      continue;
    }
    const lowered = loweredOffer(offer, check.amountCents);
    prices[billing] = { price: formatMoney(lowered.shown), was: formatMoney(offer.shown), free: check.amountCents === 0, charge: lowered.line };
  }
  if (!Object.keys(prices).length) return { error: firstError ?? "This coupon code isn't valid." };
  return { code: code.toUpperCase(), prices, message: "Coupon applied. The price below is what you pay." };
}
