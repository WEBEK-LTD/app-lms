"use server";

import { redirect } from "next/navigation";
import { getClientContext, requestIp } from "@/lib/auth/session";
import { readBilling, startPlanPayment } from "@/lib/billing/plan-payment";
import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, iyzicoApiUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { IyzicoError } from "@/lib/payments/iyzico";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getPlans, yallappIyzicoKeys } from "@/lib/settings/platform";

/** The client pays a plan by card: off to iyzico's payment page. */
export async function payPlanAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (context.client.status === "suspended") return { message: "This account is suspended. Message us on WhatsApp." };
  const values: Record<string, string> = {};
  for (const name of ["plan", "city", "address"]) values[name] = String(formData.get(name) ?? "").trim();
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
    });
  } catch (e) {
    if (e instanceof IyzicoError) return { message: `The payment couldn't start: ${e.message}`, values };
    throw e;
  }
  redirect(url);
}
