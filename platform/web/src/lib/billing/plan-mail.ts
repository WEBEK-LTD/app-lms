import "server-only";
import { formatDate } from "@/components/ui";
import { appLabel } from "../app/label";
import type { DataStore } from "../data/store";
import type { Client } from "../data/types";
import { emailLangOf, sendTemplate } from "../email/send";
import { getDashT } from "@/i18n/dashboard";
import type { Lang } from "@/i18n/config";
import { appUrl } from "../env";
import { getPlans } from "../settings/platform";
import type { PlanPaymentOutcome } from "./plan-payment";
import { formatAmount } from "./prices";
import { PROVIDER_NAME } from "../payments/provider";
import type { PlanPayment } from "../data/types";

/** 52 "Paid: EGP 1,500 (about $30) by card through Kashier." and the receipt, for the activation and renewal emails; 56 in the email's language. */
export function paymentLine(payment: PlanPayment, base: string, lang: Lang = "en"): string {
  const t = getDashT(lang);
  const receipt = `${t("emails.receipt", { url: `${base}/dashboard/license/receipts/${payment.id}` })}\n\n`;
  if (payment.amountCents === 0) return `${t("emails.paidCoupon")}\n${receipt}`;
  const amount = formatAmount(payment.amountCents, payment.currency);
  const provider = PROVIDER_NAME[payment.paymentProvider ?? "iyzico"];
  const paid =
    payment.shownCents && payment.shownCurrency && payment.shownCurrency !== payment.currency
      ? t("emails.paidAbout", { amount, shown: formatAmount(payment.shownCents, payment.shownCurrency), provider })
      : t("emails.paid", { amount, provider });
  return `${paid}\n${receipt}`;
}

/** After an app's plan is paid (by card, or free with a coupon): the activation or renewal email, naming the app. Never fails the payment. */
export async function sendPlanPaidMail(store: DataStore, client: Client, outcome: Extract<PlanPaymentOutcome, { kind: "paid" }>): Promise<void> {
  const user = await store.getUserById(client.userId);
  if (!user) return;
  const plan = (await getPlans(store))[outcome.payment.plan].name;
  const until = formatDate(outcome.activeUntil);
  const dashboard = `${appUrl()}/dashboard`;
  const appName = appLabel(outcome.activation.app);
  const lang = emailLangOf(user);
  const payment_line = paymentLine(outcome.payment, appUrl(), lang);
  await (
    outcome.activation.created
      ? sendTemplate(
          "account_activated",
          user.email,
          {
            name: user.name,
            app_name: appName,
            plan,
            active_until: until,
            license_key: outcome.activation.licenseKey,
            dashboard_url: dashboard,
            payment_line,
          },
          { lang },
        )
      : sendTemplate("plan_renewed", user.email, { name: user.name, app_name: appName, plan, active_until: until, dashboard_url: dashboard, payment_line }, { lang })
  ).catch((error: unknown) => console.error("[mail] payment email failed", error));
}
