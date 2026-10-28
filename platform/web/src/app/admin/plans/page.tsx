import type { Metadata } from "next";
import { resetPlanAction } from "@/app/actions/admin-settings";
import { SubmitButton } from "@/components/form";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { SwitchesSetting } from "@/lib/data/types";
import Link from "next/link";
import { PLAN_FEATURES, PLAN_LIMITS, planPrice, REGULAR_PLANS, STUDIO_ONLY_FEATURES, STUDIO_PLAN_CHOICES, STUDIO_PLANS, SUPPORT_LABEL, SUPPORT_LEVELS, type Plan, type PlanInfo } from "@/lib/plans";
import { getPlans, platformSetting, yallappBilling } from "@/lib/settings/platform";
import { formatMoney, usdCentsOf } from "@/lib/billing/prices";
import { getSwitches, LICENSE_FEATURE_SWITCHES, switchGroups, switchKey } from "@/lib/switches";
import { PlanAvailabilityForm, type AvailabilityGroup } from "./availability";
import { PlanForm, PlanLimitsForm, StoragePacksForm, StudioPlanForm } from "./forms";
import { packOffers } from "@/lib/media/packs";

export const metadata: Metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

/** Plans and prices: shown on the pricing page, used by licenses and card payments. 103R Regular apps and Studio projects apart. */
export default async function PlansPage({ searchParams }: PageProps<"/admin/plans">) {
  const { adminRole } = await requireAdmin();
  const query = await searchParams;
  const family = query.family === "studio" ? "studio" : query.family === "packs" ? "packs" : "regular";
  const store = await getStore();
  const [plans, edits, switches, billing, packs] = await Promise.all([
    getPlans(store),
    platformSetting(store, "plans"),
    getSwitches(store, { fresh: true }),
    yallappBilling(store, { fresh: true }),
    platformSetting(store, "storagePacks", { fresh: true }),
  ]);
  // One regular plan at a time, picked from the row of plans.
  const selected: Plan = REGULAR_PLANS.find((p) => p === query.plan) ?? REGULAR_PLANS[0];
  const priceOf = (id: Plan) => {
    const plan = plans[id];
    const shown = planPrice(plan);
    // 52 The dollar price people outside Egypt see: the plan's own, or the pounds at the rate.
    const usd = plan.priceCents ? usdCentsOf({ egpCents: plan.priceCents, usdCents: plan.usdCents }, billing.egpPerUsd) : null;
    return {
      main: shown.period ? `${shown.price} / ${shown.period}` : shown.price,
      usd: shown.period && usd !== null ? `${formatMoney({ cents: usd, currency: "USD" })} outside Egypt` : null,
    };
  };
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[28px] font-extrabold">Plans</h1>
        <p className="m-0 max-w-[760px] text-[15px] text-muted">
          What each plan costs and includes. Changes show on the pricing page at once, and the platform, the builds, the hosted API, the plugin and
          the app hold to them.
        </p>
        <details className="max-w-[760px] text-sm text-muted">
          <summary className="cursor-pointer font-semibold text-ink-2">How prices work</summary>
          <p className="mt-2 mb-0">
            A price lets clients pay online once card payments for plans are on. Prices are in Egyptian pounds, charged to everyone; people outside
            Egypt see US dollars (set the exchange rate in Settings › Yallapp&apos;s plan payments). Regular apps and Studio projects have separate
            plans: a Studio project is paid on a Studio plan only.
          </p>
        </details>
      </div>
      <div role="tablist" aria-label="Plan families" className="flex flex-wrap gap-1 border-b border-line">
        {(
          [
            ["regular", "Regular apps", "/admin/plans"],
            ["studio", "Yallapp Studio", "/admin/plans?family=studio"],
            ["packs", "Storage packs", "/admin/plans?family=packs"],
          ] as const
        ).map(([key, label, href]) => {
          const on = key === family;
          return (
            <Link
              key={key}
              href={href}
              role="tab"
              aria-selected={on}
              className={`flex h-10 items-center px-4 text-sm no-underline ${on ? "border-b-2 border-midnight font-bold text-ink" : "border-b-2 border-transparent text-muted"}`}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <ReadOnly when={!can(adminRole, "plans.edit")} what="change plans or prices">
        {family === "studio" ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {STUDIO_PLANS.map((id, i) => {
              const plan = plans[id];
              const usdAtRate = plan.priceCents ? usdCentsOf({ egpCents: plan.priceCents, usdCents: null }, billing.egpPerUsd) : null;
              return (
                <StudioPlanForm
                  key={id}
                  plan={{
                    id,
                    heading: `Studio plan ${i + 1}`,
                    offered: plan.offered === true,
                    // A plan never named keeps its placeholder name out of the field.
                    name: edits?.value[id]?.name ? plan.name : "",
                    egpPrice: plan.priceCents !== null ? centsToDecimal(plan.priceCents) : "",
                    usdPrice: plan.usdCents !== null ? centsToDecimal(plan.usdCents) : "",
                    months: String(plan.billingMonths),
                    features: plan.features,
                    studioPages: plan.limits.studioPages ? String(plan.limits.studioPages) : "",
                    usdAtRate: usdAtRate !== null ? formatMoney({ cents: usdAtRate, currency: "USD" }) : "",
                  }}
                  choices={STUDIO_PLAN_CHOICES.map((f) => ({ id: f, label: PLAN_FEATURES.find((d) => d.id === f)!.label }))}
                />
              );
            })}
          </div>
        ) : family === "packs" ? (
          // 51 Extra storage for the Media library, bought by card with the plans' gateway; 52 priced in pounds like the plans.
          <section aria-labelledby="h-storage-packs" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 id="h-storage-packs" className="m-0 text-xl font-bold">
                Storage packs
              </h2>
              <p className="m-0 text-sm text-muted">
                Extra storage on top of a plan&apos;s, for an app&apos;s videos, pictures and PDFs. A pack runs until the app&apos;s plan period ends (a month&apos;s
                price times the months left) and renews with the plan when the client renews by card. Priced in Egyptian pounds like the plans; people
                outside Egypt see US dollars. A plan&apos;s own storage is set with its limits.
              </p>
            </div>
            <StoragePacksForm
              offers={packOffers(packs?.value).map((o) => {
                const usdAtRate = o.price ? usdCentsOf({ egpCents: o.price.egpCents, usdCents: null }, billing.egpPerUsd) : null;
                return {
                  id: o.id,
                  gb: String(o.gb),
                  egpPrice: o.price ? centsToDecimal(o.price.egpCents) : "",
                  usdPrice: o.price?.usdCents ? centsToDecimal(o.price.usdCents) : "",
                  usdAtRate: usdAtRate !== null ? formatMoney({ cents: usdAtRate, currency: "USD" }) : "",
                };
              })}
            />
          </section>
        ) : (
          <>
            <nav aria-label="Regular plans" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]">
              {REGULAR_PLANS.map((id) => {
                const on = id === selected;
                const price = priceOf(id);
                return (
                  <Link
                    key={id}
                    href={`/admin/plans?plan=${id}`}
                    aria-current={on ? "page" : undefined}
                    className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-ink no-underline hover:text-ink ${on ? "border-midnight bg-white shadow-sm" : "border-line bg-white/60 hover:border-line-strong"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-ink">{plans[id].name}</span>
                      {edits?.value[id] ? <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink-2">Edited</span> : null}
                    </span>
                    <span className="text-sm text-ink-2">{price.main}</span>
                    {price.usd ? <span className="text-xs text-muted">{price.usd}</span> : null}
                  </Link>
                );
              })}
            </nav>
            <RegularPlan
              id={selected}
              plan={plans[selected]}
              edited={Boolean(edits?.value[selected])}
              price={priceOf(selected)}
              usdAtRate={plans[selected].priceCents ? usdCentsOf({ egpCents: plans[selected].priceCents!, usdCents: null }, billing.egpPerUsd) : null}
              groups={availabilityGroups(switches, selected)}
            />
          </>
        )}
      </ReadOnly>
    </>
  );
}

/** One regular plan: its name and price, its features and limits, and what its clients can choose, each in its own panel. */
function RegularPlan({
  id,
  plan,
  edited,
  price,
  usdAtRate,
  groups,
}: {
  id: Plan;
  plan: PlanInfo;
  edited: boolean;
  price: { main: string; usd: string | null };
  usdAtRate: number | null;
  groups: AvailabilityGroup[];
}) {
  const panel = "flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";
  return (
    <section aria-labelledby={`h-${id}`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id={`h-${id}`} className="m-0 text-2xl font-extrabold">
            {plan.name}
          </h2>
          <span className="text-sm text-muted">
            {price.main}
            {price.usd ? ` · ${price.usd}` : ""}
          </span>
        </div>
        {edited ? (
          <form action={resetPlanAction}>
            <input type="hidden" name="plan" value={id} />
            <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
              Back to the default plan
            </SubmitButton>
          </form>
        ) : null}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className={panel}>
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-base font-bold">Name and price</h3>
            <p className="m-0 text-[13px] text-muted">What the pricing page shows, in English and, if you like, Arabic and Turkish.</p>
          </div>
          <PlanForm
            plan={{
              id,
              name: plan.name,
              tagline: plan.tagline,
              highlights: plan.highlights.join("\n"),
              price: plan.price,
              pricing: plan.onRequest ? "request" : "price",
              egpPrice: plan.priceCents !== null ? centsToDecimal(plan.priceCents) : "",
              usdPrice: plan.usdCents !== null ? centsToDecimal(plan.usdCents) : "",
              months: String(plan.billingMonths),
              usdAtRate: usdAtRate !== null ? formatMoney({ cents: usdAtRate, currency: "USD" }) : "",
              // 62 The team's Arabic and Turkish texts; empty ones use the built-in translation, else the English.
              arName: plan.translations?.ar?.name ?? "",
              arTagline: plan.translations?.ar?.tagline ?? "",
              arHighlights: plan.translations?.ar?.highlights?.join("\n") ?? "",
              arPrice: plan.translations?.ar?.price ?? "",
              trName: plan.translations?.tr?.name ?? "",
              trTagline: plan.translations?.tr?.tagline ?? "",
              trHighlights: plan.translations?.tr?.highlights?.join("\n") ?? "",
              trPrice: plan.translations?.tr?.price ?? "",
            }}
          />
        </div>
        <div className={panel}>
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-base font-bold">Features and limits</h3>
            <p className="m-0 text-[13px] text-muted">What each app on the plan may use. An empty limit means no limit.</p>
          </div>
          <PlanLimitsForm
            plan={{
              id,
              name: plan.name,
              features: plan.features,
              appUsers: plan.limits.appUsers === null ? "" : String(plan.limits.appUsers),
              languages: plan.limits.languages === null ? "" : String(plan.limits.languages),
              sources: plan.limits.sources === null ? "" : String(plan.limits.sources),
              storageGb: plan.limits.storageGb === null ? "" : String(plan.limits.storageGb),
              analyticsMonths: plan.limits.analyticsMonths === null ? "" : String(plan.limits.analyticsMonths),
              teamMembers: plan.limits.teamMembers === null ? "" : String(plan.limits.teamMembers),
              support: plan.limits.support,
              accountManager: plan.limits.accountManager,
              customFeatures: plan.limits.customFeatures,
            }}
            features={PLAN_FEATURES.filter((f) => !STUDIO_ONLY_FEATURES.includes(f.id))}
            limits={PLAN_LIMITS}
            supportLevels={SUPPORT_LEVELS.map((s) => ({ id: s, label: SUPPORT_LABEL[s] }))}
          />
        </div>
      </div>
      <div className={panel}>
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-base font-bold">What {plan.name} offers</h3>
          <p className="m-0 text-[13px] text-muted">
            Clients on this plan can choose what&apos;s ticked. Switches turn things off for everyone; the plan&apos;s features are set above.
          </p>
        </div>
        <PlanAvailabilityForm plan={id} planName={plan.name} groups={groups} />
      </div>
    </section>
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
