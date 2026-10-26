import { appLabel } from "@/lib/app/label";
import type { Metadata } from "next";
import Link from "next/link";
import { releasePayoutAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, formatDateTime } from "@/components/ui";
import type { PayoutDetails } from "@/lib/catalog/marketplace";
import { ORDER_STATUS_LABELS, orderNumber, payoutDetails } from "@/lib/catalog/settings";
import { encryptionKey } from "@/lib/env";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { formatAmount } from "@/lib/billing/prices";
import { paymentWhat } from "@/lib/billing/receipt";
import { getStore } from "@/lib/data";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { PAYMENT_STATUS, PAYMENT_TONE } from "./labels";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

/** Clients' card payments for their plans, newest first. */
export default async function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  const { adminRole } = await requireAdmin();
  const { done } = await searchParams;
  const store = await getStore();
  const [payments, plans, sales] = await Promise.all([store.listPlanPayments({ limit: 100 }), getPlans(store), store.listMarketplaceOrders(100)]);
  const shops = new Map<string, string>();
  // 37 Who the team transfers a share to (Kashier or Fawaterk), for those allowed to manage payments.
  const payees = new Map<string, PayoutDetails>();
  for (const appId of new Set(sales.map((o) => o.appId))) {
    const app = await store.getAppById(appId);
    shops.set(appId, app?.appName ?? "Deleted app");
    const payee = app && can(adminRole, "payments.manage") ? payoutDetails(app, encryptionKey()) : null;
    if (payee) payees.set(appId, payee);
  }
  const names = new Map<string, string>();
  for (const id of new Set(payments.map((p) => p.clientId))) {
    const client = await store.getClientById(id);
    const user = client ? await store.getUserById(client.userId) : null;
    names.set(id, user?.name ?? "Deleted client");
  }
  // 12: each payment pays one app's plan.
  const appNames = new Map<string, string>();
  for (const appId of new Set(payments.flatMap((p) => (p.appId ? [p.appId] : [])))) {
    appNames.set(appId, appLabel(await store.getAppById(appId)));
  }
  const paid = payments.filter((p) => p.status === "paid");
  // 11.6: the coupon each payment used.
  const coupons = new Map((await store.listCouponRedemptions({})).map((r) => [r.paymentId, r]));

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Payments</h1>
        <span className="text-[15px] text-muted">
          Plans paid by card into Yallapp&apos;s account (iyzico, Kashier, Fawaterk, Stripe or PayPal), each for one app. A paid one activates that app or extends its license at once.
        </span>
      </div>
      <section aria-label="Card payments" className="overflow-x-auto rounded-2xl border border-line bg-white">
        {payments.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No card payments yet. Set Yallapp&apos;s Kashier account in Settings and a price in Plans.</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                <th scope="col" className="px-4 py-3 font-semibold">App</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-4 py-3 font-semibold">Amount</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                <th scope="col" className="px-4 py-3 font-semibold">Payment</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-line-soft">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clients?client=${p.clientId}`}>{names.get(p.clientId)}</Link>
                  </td>
                  <td className="px-4 py-3">{p.appId ? appNames.get(p.appId) : <span className="text-muted">Before the first app</span>}</td>
                  <td className="px-4 py-3">
                    {paymentWhat(p, planName(p.plan, plans))}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatAmount(p.amountCents, p.currency)}
                    {/* 52 Charged in pounds; the client outside Egypt saw dollars. */}
                    {p.shownCents && p.shownCurrency ? (
                      <span className="block text-xs font-normal text-muted">Shown as {formatAmount(p.shownCents, p.shownCurrency)}</span>
                    ) : null}
                    {coupons.has(p.id) ? (
                      <span className="block text-xs font-normal text-muted">
                        Coupon {coupons.get(p.id)!.code}, {formatAmount(coupons.get(p.id)!.discountCents, p.currency)} off
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={PAYMENT_TONE[p.status]}>{PAYMENT_STATUS[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(p.paidAt ?? p.createdAt)}</td>
                  <td className="px-4 py-3 text-[13px]">
                    {/* 95.2 A bank transfer the team recorded. */}
                    {p.method === "bank_transfer" ? (
                      <>
                        Bank transfer <span className="font-mono">{p.bankReference ?? "—"}</span>
                      </>
                    ) : (
                      <>
                        {PROVIDER_NAME[p.paymentProvider ?? "iyzico"]} <span className="font-mono">{p.paymentId ?? "—"}</span>
                      </>
                    )}
                    {/* 71 The receipt the client got, as a PDF. */}
                    {p.status === "paid" ? (
                      <a href={`/admin/payments/${p.id}/pdf`} download className="mt-1 flex items-center gap-1 font-semibold">
                        <Icon name="download" size={16} />
                        Receipt PDF
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {paid.length ? (
        <p className="m-0 text-sm text-muted">
          {paid.length} paid in this list. Refunds are made in the provider&apos;s merchant panel; then shorten the client&apos;s plan on the Clients page.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5 pt-4">
        <h2 className="m-0 text-[22px] font-extrabold">Shop sales through Yallapp</h2>
        <span className="text-[15px] text-muted">
          Orders paid into Yallapp&apos;s account by shops without their own payment account. The payout is released when the shop completes
          the order, or here. With iyzico, iyzico then pays each shop its share; with Kashier or Fawaterk, transfer the share to the IBAN shown.
        </span>
      </div>
      {done === "payout-released" ? (
        <Notice tone="success" icon="check_circle" role="status">
          Payout released. With iyzico, iyzico pays the shop its share; with Kashier or Fawaterk, transfer it to the shop&apos;s IBAN.
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
                  <td className="px-4 py-3">
                    {shops.get(o.appId)}
                    {/* 37 Kashier or Fawaterk: the team transfers the share, to this payee. */}
                    {o.paymentProvider && o.paymentProvider !== "iyzico" ? (
                      <span className="block text-xs text-muted">
                        {PROVIDER_NAME[o.paymentProvider]}
                        {payees.get(o.appId) ? ` · ${payees.get(o.appId)!.name}, IBAN ${payees.get(o.appId)!.iban}` : ""}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {orderNumber(o)} · {formatDateTime(o.paidAt)}
                    {/* 71 The customer's receipt, as a PDF. */}
                    <a href={`/admin/payments/orders/${o.appId}/${o.id}/pdf`} download className="mt-1 flex items-center gap-1 text-[13px] font-semibold">
                      <Icon name="download" size={16} />
                      Receipt PDF
                    </a>
                  </td>
                  <td className="px-4 py-3">{formatCents(o.totalCents, o.currency)}</td>
                  <td className="px-4 py-3 font-semibold">{formatCents(o.commissionCents ?? 0, o.currency)}</td>
                  <td className="px-4 py-3">{formatCents(o.totalCents - (o.commissionCents ?? 0), o.currency)}</td>
                  <td className="px-4 py-3">{ORDER_STATUS_LABELS[o.status]}</td>
                  <td className="px-4 py-3">
                    {o.payoutApprovedAt ? (
                      <span>Released {formatDateTime(o.payoutApprovedAt)}</span>
                    ) : (o.status === "processing" || o.status === "completed") && can(adminRole, "payments.manage") ? (
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
