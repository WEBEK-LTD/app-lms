import type { Metadata } from "next";
import { resetPlanAction } from "@/app/actions/admin-settings";
import { SubmitButton } from "@/components/form";
import { requireAdmin } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { PLAN_FEATURES, planPrice, PLANS } from "@/lib/plans";
import { getPlans, platformSetting } from "@/lib/settings/platform";
import { PlanForm } from "./forms";

export const metadata: Metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

/** Plans and prices: shown on the pricing page, used by licenses and card payments. */
export default async function PlansPage() {
  await requireAdmin();
  const store = await getStore();
  const [plans, edits] = await Promise.all([getPlans(store), platformSetting(store, "plans")]);
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Plans</h1>
        <span className="text-[15px] text-muted">
          Changes show on the pricing page at once. License features are what the plugin and the apps may use. A card price lets clients pay
          online once card payments for plans are on.
        </span>
      </div>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr))]">
        {PLANS.map((id) => {
          const plan = plans[id];
          const shown = planPrice(plan);
          return (
            <section key={id} aria-labelledby={`h-${id}`} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`h-${id}`} className="m-0 text-xl font-bold">
                  {plan.name}
                </h2>
                <span className="text-sm font-semibold text-muted">
                  {shown.price}
                  {shown.period ? ` / ${shown.period}` : ""}
                </span>
              </div>
              <PlanForm
                features={PLAN_FEATURES}
                plan={{
                  id,
                  name: plan.name,
                  tagline: plan.tagline,
                  highlights: plan.highlights.join("\n"),
                  price: plan.price,
                  cardPrice: plan.priceCents !== null ? centsToDecimal(plan.priceCents) : "",
                  currency: plan.currency,
                  months: String(plan.billingMonths),
                  features: plan.features,
                }}
              />
              {edits?.value[id] ? (
                <form action={resetPlanAction} className="border-t border-line-soft pt-3">
                  <input type="hidden" name="plan" value={id} />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    Back to the default plan
                  </SubmitButton>
                </form>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
