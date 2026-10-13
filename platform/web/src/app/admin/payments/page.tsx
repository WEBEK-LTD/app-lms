import type { Metadata } from "next";
import Link from "next/link";
import { Badge, formatDateTime } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { PAYMENT_STATUS, PAYMENT_TONE } from "./labels";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

/** Clients' card payments for their plans, newest first. */
export default async function PaymentsPage() {
  await requireAdmin();
  const store = await getStore();
  const [payments, plans] = await Promise.all([store.listPlanPayments({ limit: 100 }), getPlans(store)]);
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
    </>
  );
}
