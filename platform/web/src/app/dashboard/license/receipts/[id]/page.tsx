import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader, formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { requireClient } from "@/lib/auth/session";
import { planReceiptRows, receiptNumber } from "@/lib/billing/receipt";
import { getStore } from "@/lib/data";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";

export const metadata: Metadata = { title: "Receipt", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * 52 The receipt of one of the account's plan payments: what was charged
 * (pounds through Kashier) and, outside Egypt, the dollar price the client
 * saw. Only the account's own paid payments.
 */
export default async function PlanReceiptPage({ params }: PageProps<"/dashboard/license/receipts/[id]">) {
  const { id } = await params;
  const { client, user } = await requireClient();
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
    appName: app && app.clientId === client.id ? appLabel(app) : "Your app",
    billedTo: { name: user.name, email: user.email },
    paidOn: formatDate(payment.paidAt ?? payment.createdAt),
    coupon,
  });
  return (
    <>
      <PageHeader title={`Receipt ${receiptNumber(payment)}`} description="Keep it for your records, or print it from your browser." />
      <section aria-labelledby="h-receipt" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-receipt" className="m-0 text-lg font-bold">
          Yallapp plan payment
        </h2>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[15px]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-muted">{label}</dt>
              <dd className="m-0 min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Link href="/dashboard/license" className="inline-flex items-center gap-1.5 text-[15px] font-semibold">
        <Icon name="arrow_back" size={18} />
        Back to your plan
      </Link>
    </>
  );
}
