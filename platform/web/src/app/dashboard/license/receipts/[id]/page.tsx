import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader, Section, btn, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { planReceiptRows, receiptNumber } from "@/lib/billing/receipt";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { licensePath } from "@/lib/studio/section";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("license.receipt"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

/**
 * 52 The receipt of one of the account's plan payments: what was charged
 * (pounds through Kashier) and, outside Egypt, the dollar price the client
 * saw. Only the account's own paid payments.
 */
export default async function PlanReceiptPage({ params }: PageProps<"/dashboard/license/receipts/[id]">) {
  const { id } = await params;
  const { client, user, app: open } = await requireClient("billing");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const payment = (await store.listPlanPayments({ clientId: client.id, limit: 200 })).find((p) => p.id === id && p.status === "paid");
  if (!payment) notFound();
  const [plans, app, redemptions] = await Promise.all([
    getPlans(store),
    payment.appId ? store.getAppById(payment.appId) : null,
    store.listCouponRedemptions({ clientId: client.id }),
  ]);
  const coupon = redemptions.find((r) => r.paymentId === payment.id && r.status === "redeemed") ?? null;
  const rows = planReceiptRows({
    payment,
    planName: planName(payment.plan, plans),
    appName: app && app.clientId === client.id ? (appLabel(app) === "Untitled app" ? k("Untitled app") : appLabel(app)) : t("license.yourApp"),
    billedTo: { name: user.name, email: user.email },
    paidOn: formatDate(payment.paidAt ?? payment.createdAt, lang),
    coupon,
  });
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: back to the plan, the PDF as the one main action, then the receipt. */}
      <PageHeader
        back={{ href: licensePath(open), label: t("license.backToPlan") }}
        title={t("license.receiptTitle", { number: receiptNumber(payment) })}
        description={t("license.receiptText")}
        actions={
          // 71 The same receipt as a PDF (the payment email has it attached too).
          <a href={`/dashboard/license/receipts/${payment.id}/pdf`} download className={`${btn.main} h-11`}>
            <Icon name="download" size={20} />
            {t("license.downloadPdf")}
          </a>
        }
      />
      <Section
        titleId="h-receipt"
        className="max-w-[720px]"
        title={
          <span className="flex items-center gap-2">
            <Icon name="receipt_long" size={22} />
            {payment.purpose === "storage" ? t("license.storagePayment") : t("license.planPayment")}
          </span>
        }
        flush
      >
        <dl className="m-0 flex flex-col">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 border-t border-line-soft px-5 py-3 text-[15px] first:border-t-0 sm:px-6">
              <dt className="font-semibold text-muted">{k(label)}</dt>
              <dd className="m-0 min-w-0 break-words text-midnight">{k(value)}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
