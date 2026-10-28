import { planNamesOf } from "@/lib/plans";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setCouponActiveAction } from "@/app/actions/admin-coupons";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, formatDateTime } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { couponFormValues, couponStatus, describeDiscount } from "@/lib/billing/coupons";
import { formatAmount } from "@/lib/billing/prices";
import { getStore } from "@/lib/data";
import { planName } from "@/lib/plans";
import { getPlans } from "@/lib/settings/platform";
import { CouponForm } from "../forms";

export const metadata: Metadata = { title: "Coupon" };
export const dynamic = "force-dynamic";

const USE_STATUS = { pending: "On the payment page", redeemed: "Used", failed: "Payment failed" } as const;
const USE_TONE = { pending: "warn", redeemed: "success", failed: "neutral" } as const;

const NOTICES: Record<string, string> = {
  created: "Coupon created. Clients can use it on the card payment.",
  disabled: "Coupon turned off. Clients can't use it anymore.",
  enabled: "Coupon turned on again.",
};

export default async function CouponPage({ params, searchParams }: PageProps<"/admin/coupons/[id]">) {
  const { adminRole } = await requireAdmin();
  const store = await getStore();
  const coupon = await store.getCoupon((await params).id);
  if (!coupon) notFound();
  const { done } = await searchParams;
  const [plans, uses] = await Promise.all([getPlans(store), store.listCouponRedemptions({ couponId: coupon.id })]);
  const names = new Map<string, string>();
  for (const clientId of new Set(uses.map((u) => u.clientId))) {
    const client = await store.getClientById(clientId);
    const user = client ? await store.getUserById(client.userId) : null;
    names.set(clientId, user?.name ?? "Deleted client");
  }
  const status = couponStatus(coupon, new Date());
  const notice = typeof done === "string" ? NOTICES[done] : undefined;
  return (
    <ReadOnly when={!can(adminRole, "plans.edit")} what="change coupons">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/coupons" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Coupons
        </Link>
        <h1 className="m-0 flex flex-wrap items-center gap-3 font-mono text-[28px] font-extrabold">
          {coupon.code} <Badge tone={status.tone}>{status.label}</Badge>
        </h1>
        <span className="text-[15px] text-muted">
          {describeDiscount(coupon.discount)} · created {formatDateTime(coupon.createdAt)} by {coupon.createdBy}
        </span>
      </div>
      {notice ? (
        <Notice tone="success" icon="check_circle" role="status">
          {notice}
        </Notice>
      ) : null}
      <form action={setCouponActiveAction}>
        <input type="hidden" name="id" value={coupon.id} />
        {coupon.active ? null : <input type="hidden" name="active" value="on" />}
        <SubmitButton variant={coupon.active ? "danger" : "secondary"} className="h-10">
          {coupon.active ? "Turn off" : "Turn on again"}
        </SubmitButton>
      </form>
      <section aria-label="Coupon" className="max-w-[760px] rounded-2xl border border-line bg-white p-5 sm:p-6">
        {/* Turning it off or on starts the form again from the saved coupon. */}
        <CouponForm key={String(done ?? "")} id={coupon.id} coupon={couponFormValues(coupon)} planNames={planNamesOf(plans)} />
      </section>
      <div className="flex flex-col gap-1.5 pt-2">
        <h2 className="m-0 text-[22px] font-extrabold">Uses</h2>
        <span className="text-[15px] text-muted">Each card payment with this coupon. Only used ones count against the limits, and ones still on the payment page for an hour.</span>
      </div>
      <section aria-label="Uses" className="relative overflow-x-auto rounded-2xl border border-line bg-white">
        {uses.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">Not used yet.</p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Client</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                <th scope="col" className="px-4 py-3 font-semibold">Discount</th>
                <th scope="col" className="px-4 py-3 font-semibold">Paid</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {uses.map((u) => (
                <tr key={u.paymentId} className="border-t border-line-soft">
                  <td className="px-4 py-3">
                    <Link href={`/admin?client=${u.clientId}`}>{names.get(u.clientId)}</Link>
                  </td>
                  <td className="px-4 py-3">{planName(u.plan, plans)}</td>
                  <td className="px-4 py-3">{formatAmount(u.fullCents, u.currency)}</td>
                  <td className="px-4 py-3">{formatAmount(u.discountCents, u.currency)}</td>
                  <td className="px-4 py-3 font-semibold">{formatAmount(u.fullCents - u.discountCents, u.currency)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={USE_TONE[u.status]}>{USE_STATUS[u.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(u.redeemedAt ?? u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </ReadOnly>
  );
}
