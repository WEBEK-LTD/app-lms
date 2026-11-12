import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { ReadOnly } from "@/components/read-only";
import { Badge, Notice, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { couponStatus } from "@/lib/billing/coupons";
import { getStore } from "@/lib/data";
import { dayNextYear, OCCASION_TEMPLATES } from "@/lib/occasions";
import { occasionDaysText, occasionStateLabel } from "@/lib/occasions/admin";
import { occasionsOf } from "@/lib/occasions/store";
import { DeleteOccasionForm, NextYearForm, OccasionForm } from "../forms";

export const metadata: Metadata = { title: "Occasion" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  created: "Occasion created, with its coupon.",
  next_year: "Next year's occasion is ready, on the same days a year on. Its coupon moved to it; last year's stays here as a record.",
};

export default async function OccasionPage({ params, searchParams }: PageProps<"/admin/occasions/[id]">) {
  const { adminRole } = await requireAdmin();
  const store = await getStore();
  const { id } = await params;
  const occasions = await occasionsOf(store, { fresh: true });
  const occasion = occasions.find((o) => o.id === id);
  if (!occasion) notFound();
  const { done } = await searchParams;
  const notice = typeof done === "string" ? NOTICES[done] : undefined;
  const now = new Date();
  const status = occasionStateLabel(occasion, now);
  const template = OCCASION_TEMPLATES[occasion.template];
  const coupon = occasion.couponId ? await store.getCoupon(occasion.couponId) : null;
  const uses = coupon ? (await store.listCouponRedemptions({ couponId: coupon.id })).filter((r) => r.status === "redeemed").length : 0;
  // The occasion its coupon went to, when it was run again.
  const later = coupon ? null : occasions.find((o) => o.id !== occasion.id && o.template === occasion.template && o.couponCode === occasion.couponCode && o.couponId);
  const nextDays = occasionDaysText({ startsOn: dayNextYear(occasion.startsOn), endsOn: dayNextYear(occasion.endsOn) });
  return (
    <ReadOnly when={!can(adminRole, "plans.edit")} what="change occasions">
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/occasions" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Occasions
        </Link>
        <h1 className="m-0 flex flex-wrap items-center gap-3 text-[28px] font-extrabold">
          {occasion.name} <Badge tone={status.tone}>{status.label}</Badge>
        </h1>
        <span className="text-[15px] text-muted">
          {template.name} · {occasionDaysText(occasion)} · saved {formatDateTime(new Date(occasion.updatedAt))} by {occasion.updatedBy}
        </span>
      </div>
      {notice ? (
        <Notice tone="success" icon="check_circle" role="status">
          {notice}
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
        <a href={`/${template.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold">
          Its page: /{template.slug}
          <Icon name="open_in_new" size={18} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        {coupon ? (
          <Link href={`/admin/coupons/${coupon.id}`} className="inline-flex items-center gap-1 font-semibold">
            <Icon name="local_offer" size={18} />
            Its coupon {coupon.code} ({couponStatus(coupon, now).label}, used {uses} {uses === 1 ? "time" : "times"})
          </Link>
        ) : later ? (
          <Link href={`/admin/occasions/${later.id}`} className="inline-flex items-center gap-1 font-semibold">
            <Icon name="local_offer" size={18} />
            Its coupon {occasion.couponCode} went to {later.name}
          </Link>
        ) : (
          <span className="text-muted">No coupon yet: saving creates it.</span>
        )}
      </div>
      <section aria-label="Occasion" className="max-w-[760px] rounded-2xl border border-line bg-white p-5 sm:p-6">
        <OccasionForm key={String(done ?? "")} id={occasion.id} occasion={occasion} />
      </section>

      <section aria-labelledby="next-year" className="flex max-w-[760px] flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="next-year" className="m-0 text-[20px] font-extrabold">
          Run it again next year
        </h2>
        <p className="m-0 text-[15px] text-muted">
          A new occasion copying this one, on {nextDays}, turned on, with a coupon {occasion.couponCode} of its own: an account that used the code this year
          can use it again. This one&apos;s coupon keeps its uses, off, as {occasion.couponCode.slice(0, 34)}-{occasion.startsOn.slice(0, 4)}. Do this once
          this one has ended; this one stays here as the record of its year.
        </p>
        <NextYearForm id={occasion.id} />
      </section>

      <section aria-labelledby="delete" className="flex max-w-[760px] flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="delete" className="m-0 text-[20px] font-extrabold">
          Delete
        </h2>
        <p className="m-0 text-[15px] text-muted">Its page stops showing it, and its coupon is turned off. The coupon itself stays in Coupons with its uses.</p>
        <DeleteOccasionForm id={occasion.id} name={occasion.name} code={occasion.couponCode} />
      </section>
    </ReadOnly>
  );
}
