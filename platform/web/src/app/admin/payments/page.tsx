import type { Metadata } from "next";
import Link from "next/link";
import { releasePayoutAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { Badge, Notice, formatDateTime } from "@/components/ui";
import { ORDER_STATUS_LABELS, orderNumber } from "@/lib/catalog/settings";
import { requireAdmin } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { PAYMENT_STATUS, PAYMENT_TONE } from "./labels";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

/** Clients' card payments for their plans, newest first. */
export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireAdmin();
  const { done } = await searchParams;
  const store = await getStore();
  const [payments, plans, sales] = await Promise.all([store.listPlanPayments({ limit: 100 }), getPlans(store), store.listMarketplaceOrders(100)]);
  const shops = new Map<string, string>();
  for (const appId of new Set(sales.map((o) => o.appId))) {
    const app = await store.getAppById(appId);
    shops.set(appId, app?.appName ?? "Deleted app");
  }
  const names = new Map<string, string>();
  for (const id of new Set(payments.map((p) => p.clientId))) {
    const client = await store.getClientById(id);
    const user = client ? await store.getUserById(client.userId) : null;
    names.set(id, user?.name ?? "Deleted client");
  }
  const paid = payments.filter((p) => p.status === "paid");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Payments</h1>
        <span className="text-[15px] text-muted">
          Plans paid by card into Yallapp&apos;s iyzico account. A paid one activates the client or extends their license at once.
        </span>
      </div>
      <section aria-label="Card payments" className="overflow-x-auto rounded-2xl border border-line bg-white">
        {payments.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No card payments yet. Set Yallapp&apos;s iyzico account in Settings and a card price in Plans.</p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3 font-semibold">iyzico payment</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-line-soft">
                  <td className="px-4 py-3">
                    <Link href={`/admin?client=${p.clientId}`}>{names.get(p.clientId)}</Link>
                  </td>
                  <td className="px-4 py-3">
                    {planName(p.plan, plans)} · {p.months === 1 ? "1 month" : "1 year"}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCents(p.amountCents, p.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PAYMENT_TONE[p.status]}>{PAYMENT_STATUS[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(p.paidAt ?? p.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{p.paymentId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {paid.length ? (
        <p className="m-0 text-sm text-muted">
          {paid.length} paid in this list. Refunds are made in the iyzico merchant panel; then shorten the client&apos;s plan on the Clients page.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5 pt-4">
        <h2 className="m-0 text-[22px] font-extrabold">Shop sales through Yallapp</h2>
        <span className="text-[15px] text-muted">
          Orders paid into Yallapp&apos;s account by shops without their own iyzico account. iyzico pays each shop its share once the payout
          is released: when the shop completes the order, or here.
        </span>
      </div>
      {done === "payout-released" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Payout released. iyzico pays the shop its share.
        </Notice>
      ) : null}
      {done === "payout-failed" ? (
        <Notice tone="danger" icon="error" role="alert">
          iyzico didn&apos;t release the payout. Check the order in the iyzico merchant panel.
        </Notice>
      ) : null}
      <section aria-label="Shop sales" className="overflow-x-auto rounded-2xl border border-line bg-white">
        {sales.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No shop sales through Yallapp yet.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Shop</th>
                <th scope="col" className="px-4 py-3 font-semibold">Order</th>
                <th scope="col" className="px-4 py-3 font-semibold">Total</th>
                <th scope="col" className="px-4 py-3 font-semibold">Commission</th>
                <th scope="col" className="px-4 py-3 font-semibold">Shop&apos;s share</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Payout</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((o) => (
                <tr key={o.id} className="border-t border-line-soft">
                  <td className="px-4 py-3">{shops.get(o.appId)}</td>
                  <td className="px-4 py-3">
                    {orderNumber(o)} · {formatDateTime(o.paidAt)}
                  </td>
                  <td className="px-4 py-3">{formatCents(o.totalCents, o.currency)}</td>
                  <td className="px-4 py-3 font-semibold">{formatCents(o.commissionCents ?? 0, o.currency)}</td>
                  <td className="px-4 py-3">{formatCents(o.totalCents - (o.commissionCents ?? 0), o.currency)}</td>
                  <td className="px-4 py-3">{ORDER_STATUS_LABELS[o.status]}</td>
                  <td className="px-4 py-3">
                    {o.payoutApprovedAt ? (
                      <span>Released {formatDateTime(o.payoutApprovedAt)}</span>
                    ) : o.status === "processing" || o.status === "completed" ? (
                      <form action={releasePayoutAction}>
                        <input type="hidden" name="appId" value={o.appId} />
                        <input type="hidden" name="orderId" value={o.id} />
                        <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]">
                          Release payout
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="text-muted">Not released</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
