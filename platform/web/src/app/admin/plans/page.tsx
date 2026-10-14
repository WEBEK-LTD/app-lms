import type { Metadata } from "next";
import { resetPlanAction } from "@/app/actions/admin-settings";
import { SubmitButton } from "@/components/form";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { SwitchesSetting } from "@/lib/data/types";
import { PLAN_FEATURES, PLAN_LIMITS, planPrice, PLANS, SUPPORT_LABEL, SUPPORT_LEVELS, type Plan } from "@/lib/plans";
import { getPlans, platformSetting } from "@/lib/settings/platform";
import { getSwitches, LICENSE_FEATURE_SWITCHES, switchGroups, switchKey } from "@/lib/switches";
import { PlanAvailabilityForm, type AvailabilityGroup } from "./availability";
import { PlanForm, PlanLimitsForm } from "./forms";

export const metadata: Metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

/** Plans and prices: shown on the pricing page, used by licenses and card payments. */
export default async function PlansPage() {
  const { adminRole } = await requireAdmin();
  const store = await getStore();
  const [plans, edits, switches] = await Promise.all([getPlans(store), platformSetting(store, "plans"), getSwitches(store, { fresh: true })]);
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Plans</h1>
        <span className="text-[15px] text-muted">
          Changes show on the pricing page at once. Features and limits are what each app on the plan may use: the platform, the builds, the hosted
          API, the plugin and the app hold to them. A card price lets clients pay online once card payments for plans are on.
        </span>
      </div>
      <ReadOnly when={!can(adminRole, "plans.edit")} what="change plans or prices">
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
                plan={{
                  id,
                  name: plan.name,
                  tagline: plan.tagline,
                  highlights: plan.highlights.join("\n"),
                  price: plan.price,
                  cardPrice: plan.priceCents !== null ? centsToDecimal(plan.priceCents) : "",
                  currency: plan.currency,
                  months: String(plan.billingMonths),
                }}
              />
              <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
                <h3 className="m-0 text-base font-bold">Features and limits</h3>
                <PlanLimitsForm
                  plan={{
                    id,
                    name: plan.name,
                    features: plan.features,
                    appUsers: plan.limits.appUsers === null ? "" : String(plan.limits.appUsers),
                    languages: plan.limits.languages === null ? "" : String(plan.limits.languages),
                    sources: plan.limits.sources === null ? "" : String(plan.limits.sources),
                    teamMembers: plan.limits.teamMembers === null ? "" : String(plan.limits.teamMembers),
                    support: plan.limits.support,
                    accountManager: plan.limits.accountManager,
                    customFeatures: plan.limits.customFeatures,
                  }}
                  features={PLAN_FEATURES}
                  limits={PLAN_LIMITS}
                  supportLevels={SUPPORT_LEVELS.map((s) => ({ id: s, label: SUPPORT_LABEL[s] }))}
                />
              </div>
              {edits?.value[id] ? (
                <form action={resetPlanAction} className="border-t border-line-soft pt-3">
                  <input type="hidden" name="plan" value={id} />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    Back to the default plan
                  </SubmitButton>
                </form>
              ) : null}
              <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
                <h3 className="m-0 text-base font-bold">
                  What {plan.name} offers
                </h3>
                <p className="m-0 text-[13px] text-muted">
                  Clients on this plan can choose what&apos;s ticked. Switches turn things off for everyone; the plan&apos;s features are set above.
                </p>
                <PlanAvailabilityForm plan={id} planName={plan.name} groups={availabilityGroups(switches, id)} />
              </div>
            </section>
          );
        })}
      </div>
      </ReadOnly>
    </>
  );
}

// 11.5 Switches: per plan, everything but the license features.
function availabilityGroups(switches: SwitchesSetting | null, plan: Plan): AvailabilityGroup[] {
  const licenseKeys = new Set(LICENSE_FEATURE_SWITCHES.map((f) => switchKey("feature", f)));
  return switchGroups().map((group) => ({
    title: group.title,
    items: group.items
      .filter((item) => !licenseKeys.has(item.key))
      .map((item) => ({
        key: item.key,
        label: item.label,
        on: !(switches?.offByPlan[plan] ?? []).includes(item.key),
        offForEveryone: (switches?.off ?? []).includes(item.key),
      })),
  }));
}
