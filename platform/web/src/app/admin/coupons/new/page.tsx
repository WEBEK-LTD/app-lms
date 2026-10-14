import { planNamesOf } from "@/lib/plans";
import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { getPlans } from "@/lib/settings/platform";
import { NEW_COUPON } from "@/lib/billing/coupons";
import { CouponForm } from "../forms";

export const metadata: Metadata = { title: "New coupon" };
export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  await requireAdmin("plans.edit");
  const plans = await getPlans(await getStore());
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/coupons" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Coupons
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold">New coupon</h1>
      </div>
      <section aria-label="Coupon" className="max-w-[760px] rounded-2xl border border-line bg-white p-5 sm:p-6">
        <CouponForm coupon={NEW_COUPON} planNames={planNamesOf(plans)} />
      </section>
    </>
  );
}
