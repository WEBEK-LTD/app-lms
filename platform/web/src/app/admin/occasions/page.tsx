import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { OCCASION_TEMPLATES } from "@/lib/occasions";
import { OCCASION_PLANS_LABELS, occasionDaysText, occasionStateLabel } from "@/lib/occasions/admin";
import { occasionsOf } from "@/lib/occasions/store";

export const metadata: Metadata = { title: "Occasions" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  deleted: "Occasion deleted. Its coupon is turned off and kept with its uses in Coupons.",
};

/** 124 Offers for a season, such as Black Friday: each with its page on the website and its coupon. */
export default async function OccasionsPage({ searchParams }: PageProps<"/admin/occasions">) {
  const { adminRole } = await requireAdmin();
  const occasions = [...(await occasionsOf(await getStore(), { fresh: true }))].sort((a, b) => b.startsOn.localeCompare(a.startsOn));
  const now = new Date();
  const { done } = await searchParams;
  const notice = typeof done === "string" ? NOTICES[done] : undefined;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-extrabold">Occasions</h1>
          <span className="text-[15px] text-muted">
            An offer for a season, with its own page on the website and its coupon. Saving an occasion creates or updates its coupon in Coupons; extend it with a
            later last day, or run it again the next year.
          </span>
        </div>
        {can(adminRole, "plans.edit") ? (
          <Link href="/admin/occasions/new" className={`${btn.primary} h-10`}>
            <Icon name="add" size={20} />
            New occasion
          </Link>
        ) : null}
      </div>
      {notice ? (
        <Notice tone="success" icon="check_circle" role="status">
          {notice}
        </Notice>
      ) : null}
      <section aria-label="Occasions" className="relative overflow-x-auto rounded-2xl border border-line bg-white">
        {occasions.length === 0 ? (
          <p className="m-0 p-6 text-[15px] text-muted">No occasions yet.</p>
        ) : (
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="bg-sand text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Kind</th>
                <th scope="col" className="px-4 py-3 font-semibold">Days</th>
                <th scope="col" className="px-4 py-3 font-semibold">Discount</th>
                <th scope="col" className="px-4 py-3 font-semibold">Code</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plans</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 font-semibold">Page</th>
              </tr>
            </thead>
            <tbody>
              {occasions.map((o) => {
                const status = occasionStateLabel(o, now);
                const template = OCCASION_TEMPLATES[o.template];
                return (
                  <tr key={o.id} className="border-t border-line-soft">
                    <th scope="row" className="px-4 py-3 text-left font-semibold">
                      <Link href={`/admin/occasions/${o.id}`}>{o.name}</Link>
                    </th>
                    <td className="px-4 py-3">{template.name}</td>
                    <td className="px-4 py-3">{occasionDaysText(o)}</td>
                    <td className="px-4 py-3">{o.percent}% off</td>
                    <td className="px-4 py-3 font-mono">
                      {o.couponId ? <Link href={`/admin/coupons/${o.couponId}`}>{o.couponCode}</Link> : <span title="Its coupon went to a later occasion">{o.couponCode}</span>}
                    </td>
                    <td className="px-4 py-3">{OCCASION_PLANS_LABELS[o.plans]}</td>
                    <td className="px-4 py-3">
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/${template.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                        /{template.slug}
                        <Icon name="open_in_new" size={16} />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
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
