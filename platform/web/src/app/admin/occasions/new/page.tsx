import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { requireAdmin } from "@/lib/auth/session";
import { newOccasion, OCCASION_TEMPLATE_IDS } from "@/lib/occasions";
import { defaultOccasionYear } from "@/lib/occasions/admin";
import { OccasionForm } from "../forms";

export const metadata: Metadata = { title: "New occasion" };
export const dynamic = "force-dynamic";

export default async function NewOccasionPage() {
  const admin = await requireAdmin("plans.edit");
  const now = new Date();
  const template = OCCASION_TEMPLATE_IDS[0]!;
  const year = defaultOccasionYear(template, now);
  const thisYear = now.getUTCFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/occasions" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Occasions
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold">New occasion</h1>
        <span className="text-[15px] text-muted">Creating it creates its coupon, or takes over the coupon with its code when no other occasion has it.</span>
      </div>
      <section aria-label="Occasion" className="max-w-[760px] rounded-2xl border border-line bg-white p-5 sm:p-6">
        <OccasionForm occasion={newOccasion(template, year, "", admin.email, now)} templates={OCCASION_TEMPLATE_IDS} years={years} />
      </section>
    </>
  );
}
