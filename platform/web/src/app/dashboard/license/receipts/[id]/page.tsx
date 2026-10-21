import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader, btn, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { planReceiptRows, receiptNumber } from "@/lib/billing/receipt";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";

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
  const { client, user } = await requireClient("billing");
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
    <>
      <PageHeader title={t("license.receiptTitle", { number: receiptNumber(payment) })} description={t("license.receiptText")} />
      <section aria-labelledby="h-receipt" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-receipt" className="m-0 text-lg font-bold">
          {payment.purpose === "storage" ? t("license.storagePayment") : t("license.planPayment")}
        </h2>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[15px]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-muted">{k(label)}</dt>
              <dd className="m-0 min-w-0 break-words">{k(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/license" className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
          <Icon name="arrow_back" size={18} />
          {t("license.backToPlan")}
        </Link>
        {/* 71 The same receipt as a PDF (the payment email has it attached too). */}
        <a href={`/dashboard/license/receipts/${payment.id}/pdf`} download className={`${btn.primary} h-10 px-4 text-sm`}>
          <Icon name="download" size={18} />
          {t("license.downloadPdf")}
        </a>
      </div>
    </>
  );
}
