import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDate } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/session";
import { couponStatus, describeDiscount } from "@/lib/billing/coupons";
import { getStore } from "@/lib/data";
import { getPlans } from "@/lib/settings/platform";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

/** Discounts clients enter when they pay their plan by card. */
export default async function CouponsPage() {
  await requireAdmin();
  const store = await getStore();
  const [coupons, plans] = await Promise.all([store.listCoupons(), getPlans(store)]);
  const now = new Date();
  const uses = new Map(
    await Promise.all(coupons.map(async (c) => [c.id, (await store.listCouponRedemptions({ couponId: c.id })).filter((r) => r.status === "redeemed").length] as const)),
  );
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-extrabold">Coupons</h1>
          <span className="text-[15px] text-muted">
            Clients enter a coupon when they pay their plan by card. The price is worked out on our server; a coupon for the whole price
            activates the plan without a payment.
          </span>
        </div>
        <Link href="/admin/coupons/new" className={`${btn.primary} h-10`}>
          <Icon name="add" size={20} />
          New coupon
        </Link>
      </div>
      <section aria-label="Coupons" className="relative overflow-x-auto rounded-2xl border border-line bg-white">
        {coupons.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No coupons yet.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Code</th>
                <th scope="col" className="px-4 py-3 font-semibold">Discount</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plans</th>
                <th scope="col" className="px-4 py-3 font-semibold">Valid</th>
                <th scope="col" className="px-4 py-3 font-semibold">Uses</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const status = couponStatus(c, now);
                return (
                  <tr key={c.id} className="border-t border-line-soft">
                    <th scope="row" className="px-4 py-3 text-left font-mono font-semibold">
                      <Link href={`/admin/coupons/${c.id}`}>{c.code}</Link>
                    </th>
                    <td className="px-4 py-3">{describeDiscount(c.discount)}</td>
                    <td className="px-4 py-3">{c.plans ? c.plans.map((p) => plans[p].name).join(", ") : "All plans"}</td>
                    <td className="px-4 py-3">
                      {c.validFrom || c.validUntil ? `${c.validFrom ? formatDate(c.validFrom) : "Now"} to ${c.validUntil ? formatDate(c.validUntil) : "no end"}` : "Always"}
                    </td>
                    <td className="px-4 py-3">
                      {uses.get(c.id)}
                      {c.maxRedemptions !== null ? ` of ${c.maxRedemptions}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
