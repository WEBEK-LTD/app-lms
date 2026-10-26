import "server-only";
import { formatDate } from "@/components/ui";
import { activationEmail, appLabel } from "../app/label";
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
import { planReceiptPdf, receiptAttachment } from "../receipts/service";
import type { PlanPayment } from "../data/types";

/** 52 "Paid: EGP 1,500 (about $30) by card through Kashier." and the receipt, for the activation and renewal emails; 56 in the email's language. */
export function paymentLine(payment: PlanPayment, base: string, lang: Lang = "en"): string {
  const t = getDashT(lang);
  const receipt = `${t("emails.receipt", { url: `${base}/dashboard/license/receipts/${payment.id}` })}\n\n`;
  if (payment.amountCents === 0) return `${t("emails.paidCoupon")}\n${receipt}`;
  const amount = formatAmount(payment.amountCents, payment.currency);
  // 95.2 A bank transfer the team recorded.
  if (payment.method === "bank_transfer") return `${t("emails.paidBank", { amount })}\n${receipt}`;
  const provider = PROVIDER_NAME[payment.paymentProvider ?? "iyzico"];
  const paid =
    payment.shownCents && payment.shownCurrency && payment.shownCurrency !== payment.currency
      ? t("emails.paidAbout", { amount, shown: formatAmount(payment.shownCents, payment.shownCurrency), provider })
      : t("emails.paid", { amount, provider });
  return `${paid}\n${receipt}`;
}

/** After an app's plan is paid (by card, free with a coupon, or 95.2 by a bank transfer the team recorded): the activation or renewal email, naming the app. Never fails the payment. */
export async function sendPlanPaidMail(store: DataStore, client: Client, outcome: Extract<PlanPaymentOutcome, { kind: "paid" }>): Promise<void> {
  const user = await store.getUserById(client.userId);
  if (!user) return;
  const plan = (await getPlans(store))[outcome.payment.plan].name;
  const until = formatDate(outcome.activeUntil);
  const dashboard = `${appUrl()}/dashboard`;
  const appName = appLabel(outcome.activation.app);
  const lang = emailLangOf(user);
  const payment_line = paymentLine(outcome.payment, appUrl(), lang);
  // 71 The receipt as a PDF, in the client's language; without it if it can't be made.
  const attachments = await receiptAttachment(() => planReceiptPdf(store, outcome.payment, lang));
  await (
    outcome.activation.created
      ? sendTemplate(
          activationEmail(outcome.activation.app),
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
          { lang, attachments },
        )
      : sendTemplate("plan_renewed", user.email, { name: user.name, app_name: appName, plan, active_until: until, dashboard_url: dashboard, payment_line }, { lang, attachments })
  ).catch((error: unknown) => console.error("[mail] payment email failed", error));
}
