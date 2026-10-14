import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Notice } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { creditsText, PERIOD_LABELS } from "@/lib/bookings/memberships";
import { bookingSetup } from "@/lib/bookings/setup";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { paymentsSetUp } from "@/lib/catalog/settings";
import type { MembershipPlan } from "@/lib/data/types";
import { CardPayments } from "../catalog/payments";
import { MembershipPlanForm, MembershipRulesForm } from "./forms";

export const metadata: Metadata = { title: "Membership plans" };

function planValues(p: MembershipPlan | null): Record<string, string> {
  if (!p) return { name: "", price: "", period: "month", credits: "", description: "", active: "on" };
  return {
    id: String(p.id),
    name: p.name,
    price: centsToDecimal(p.priceCents),
    period: p.period,
    credits: p.credits === null ? "" : String(p.credits),
    description: p.description,
    active: p.active ? "on" : "",
  };
}

/** 27 A gym's or studio's membership plans, sold in the app on the payment page, and whether classes need one. */
export default async function MembershipPlansPage() {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Membership plans</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Memberships are for businesses without a website. To sell them here, choose &quot;I don&apos;t have a website&quot; on the{" "}
          <Link href="/dashboard/setup?step=website">Website step</Link>.
        </p>
      </div>
    );
  }
  const setup = bookingSetup(app);
  const { currency } = setup.rules;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Membership plans</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Members buy a plan in the app and pay by card on your payment page; it starts at once. On iPhones too: a membership is for classes at your
          place, which Apple lets apps sell outside the App Store.
        </p>
      </div>
      {!paymentsSetUp(app) ? (
        <Notice tone="warn" icon="warning">
          Plans go on sale in the app once card payments are set up below.
        </Notice>
      ) : null}

      <section aria-labelledby="h-rules" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-rules" className="m-0 text-lg font-bold">
          Booking classes
        </h2>
        <MembershipRulesForm required={setup.membershipRequired} />
      </section>

      <section aria-labelledby="h-plans" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-plans" className="m-0 text-lg font-bold">
            Plans
          </h2>
          <p className="m-0 text-[15px] text-ink-4">Take a plan off sale to stop selling it; memberships already bought keep running.</p>
        </div>
        {setup.membershipPlans.length ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {setup.membershipPlans.map((p) => (
              <li key={p.id} className="rounded-xl border border-line">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-[15px] font-bold">{p.name}</span>
                    <span className="flex items-center gap-2 text-sm text-muted">
                      {formatCents(p.priceCents, currency)} · {PERIOD_LABELS[p.period]} · {creditsText(p.credits)}
                      {p.active ? null : <Badge tone="warn">Not on sale</Badge>}
                    </span>
                  </summary>
                  <div className="border-t border-line-soft p-4">
                    <MembershipPlanForm current={planValues(p)} submit="Save plan" currency={currency} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : null}
        <details className="rounded-xl border border-line p-4" open={setup.membershipPlans.length === 0}>
          <summary className="cursor-pointer text-[15px] font-bold">Add a plan</summary>
          <div className="pt-3">
            <MembershipPlanForm current={planValues(null)} submit="Add plan" currency={currency} />
          </div>
        </details>
      </section>

      <CardPayments app={app} />
    </div>
  );
}
