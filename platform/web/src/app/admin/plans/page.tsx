import type { Metadata } from "next";
import { addStudioPlanAction, resetPlanAction } from "@/app/actions/admin-settings";
import { addPlanAction, archivePlanAction, duplicatePlanAction, movePlanAction, removePlanAction } from "@/app/actions/admin-plans";
import { PlanExtrasForm } from "./extras";
import { SubmitButton } from "@/components/form";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { centsToDecimal } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { SwitchesSetting } from "@/lib/data/types";
import Link from "next/link";
import { Icon } from "@/components/icon";
import {
  cleanLimitDefs,
  isAddedPlan,
  mainPeriodOf,
  periodIsSuggested,
  periodLeftToSuggestion,
  PLAN_FEATURES,
  PLAN_LIMITS,
  planOffered,
  planPrice,
  planPeriods,
  plansInOrder,
  suggestedPlanPrice,
  plansShown,
  STUDIO_ONLY_FEATURES,
  STUDIO_PLANS,
  STUDIO_PLANS_SHOWN,
  SUPPORT_LABEL,
  SUPPORT_LEVELS,
  type Plan,
  type PlanInfo,
  type PlanLimitDef,
} from "@/lib/plans";
import { periodLabel, PERIOD_KEYS } from "@/lib/billing/periods";
import { getPlans, platformSetting, yallappBilling } from "@/lib/settings/platform";
import { formatMoney, usdCentsOf } from "@/lib/billing/prices";
import { getSwitches, isStudioSwitch, LICENSE_FEATURE_SWITCHES, switchGroups, switchKey } from "@/lib/switches";
import { PlanAvailabilityForm, type AvailabilityGroup } from "./availability";
import { PlanForm, PlanLimitsForm, StoragePacksForm, StudioPlanForm } from "./forms";
import { packOffers } from "@/lib/media/packs";

export const metadata: Metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

/** Plans and prices: shown on the pricing page, used by licenses and card payments. 103R Regular apps and Studio projects apart. */
export default async function PlansPage({ searchParams }: PageProps<"/admin/plans">) {
  const { adminRole } = await requireAdmin();
  const query = await searchParams;
  const family = query.family === "studio" ? "studio" : query.family === "packs" ? "packs" : query.family === "limits" ? "limits" : "regular";
  const store = await getStore();
  const [plans, edits, switches, billing, packs, extras] = await Promise.all([
    getPlans(store),
    platformSetting(store, "plans", { fresh: true }),
    getSwitches(store, { fresh: true }),
    yallappBilling(store, { fresh: true }),
    platformSetting(store, "storagePacks", { fresh: true }),
    platformSetting(store, "planExtras", { fresh: true }),
  ]);
  const limitDefs = cleanLimitDefs(extras?.value);
  // 103R The Studio plans: the first three, and those the team added (each saved once added); 133 the regular ones the same way, in the team's order.
  const studioShown = plansInOrder(plansShown("studio", edits?.value), plans);
  const regularShown = plansInOrder(plansShown("regular", edits?.value), plans);
  // 133 Plans a client is on now or next, or was ever paid for: archived, never removed.
  const licenses = await store.listLicenses();
  const payments = family === "regular" || family === "studio" ? await store.listPlanPayments({ limit: 100_000 }) : [];
  const inUse = new Set<string>([...licenses.flatMap((l) => [l.plan, l.nextPlan ?? ""]), ...payments.map((p) => p.plan)]);
  const onPlan = (id: Plan) => licenses.filter((l) => l.plan === id || l.nextPlan === id).length;
  // One plan at a time, picked from the row of plans.
  const selected: Plan = regularShown.find((p) => p === query.plan) ?? regularShown[0]!;
  const studioSelected: Plan = studioShown.find((p) => p === query.plan) ?? studioShown[0]!;
  const priceOf = (id: Plan) => {
    const plan = plans[id];
    const shown = planPrice(plan);
    // 52 The dollar price people outside Egypt see: the plan's own, or the pounds at the rate.
    const usd = plan.priceCents ? usdCentsOf({ egpCents: plan.priceCents, usdCents: plan.usdCents }, billing.egpPerUsd) : null;
    // 133 Every period clients can choose, and how many are at their suggested price.
    const periods = planPeriods(plan).map((p) => periodLabel(p.key));
    const suggested = PERIOD_KEYS.filter((k) => periodIsSuggested(plan, k)).length;
    return {
      main: shown.period ? `${shown.price} / ${shown.period}` : shown.price,
      usd: shown.period && usd !== null ? `${formatMoney({ cents: usd, currency: "USD" })} outside Egypt` : null,
      periods: periods.length > 1 ? `${periods.join(" · ")}${suggested ? ` (${suggested} at a suggested price)` : ""}` : null,
    };
  };
  const status = (plan: PlanInfo): { label: string; tone: string } =>
    plan.archived ? { label: "Archived", tone: "bg-warn-bg text-warn" } : planOffered(plan) ? { label: "Offered", tone: "bg-success-bg text-success" } : { label: plan.id.startsWith("studio") ? "Not offered" : "Hidden", tone: "bg-sand text-ink-2" };
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
            // 133 The team's own limits and the lifetime note.
            ["limits", "Limits & lifetime", "/admin/plans?family=limits"],
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
      {query.added === "1" ? <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">Plan added. It&apos;s hidden until you give it its own name and offer it.</p> : null}
      {query.added === "full" ? <p role="alert" className="m-0 rounded-xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">There&apos;s no room for another plan in this family. Remove or reuse one first.</p> : null}
      {query.removed === "used" ? <p role="alert" className="m-0 rounded-xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">Clients are or were on this plan, so it can&apos;t be removed. Archive it instead: it leaves the pricing page and its clients keep it.</p> : null}
      {query.archived === "1" ? <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">Archived. New clients don&apos;t see it; the apps on it keep it and can renew it.</p> : null}
      {query.archived === "0" ? <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">Brought back. It&apos;s offered again if it&apos;s shown to clients.</p> : null}
      <ReadOnly when={!can(adminRole, "plans.edit")} what="change plans or prices">
        {family === "studio" ? (
          <>
            {/* 103R Studio's plans: the first three, then the ones the team added; one at a time, like the regular ones. */}
            <div className="flex flex-col gap-3">
              <nav aria-label="Studio plans" className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]">
                {studioShown.map((id) => {
                  const on = id === studioSelected;
                  const plan = plans[id];
                  const badge = status(plan);
                  return (
                    <Link
                      key={id}
                      href={`/admin/plans?family=studio&plan=${id}`}
                      aria-current={on ? "page" : undefined}
                      data-studio-plan={id}
                      className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-ink no-underline hover:text-ink ${on ? "border-midnight bg-white shadow-sm" : "border-line bg-white/60 hover:border-line-strong"} ${plan.archived ? "opacity-70" : ""}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-ink">{edits?.value[id]?.name ? plan.name : `Studio plan ${STUDIO_PLANS.indexOf(id as (typeof STUDIO_PLANS)[number]) + 1}`}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span>
                      </span>
                      <span className="text-sm text-ink-2">{priceOf(id).main}</span>
                      {priceOf(id).periods ? <span className="text-xs text-muted">{priceOf(id).periods}</span> : null}
                    </Link>
                  );
                })}
              </nav>
              {studioShown.length < STUDIO_PLANS.length ? (
                <form action={addStudioPlanAction}>
                  <SubmitButton variant="secondary" className="h-10 px-4 text-sm" pendingText="Adding…">
                    Add a Studio plan
                  </SubmitButton>
                </form>
              ) : null}
            </div>
            <PlanPanels
              key={studioSelected}
              id={studioSelected}
              family="studio"
              plan={plans[studioSelected]}
              edited={Boolean(edits?.value[studioSelected]) && STUDIO_PLANS.indexOf(studioSelected as (typeof STUDIO_PLANS)[number]) < STUDIO_PLANS_SHOWN}
              price={priceOf(studioSelected)}
              usdAtRate={plans[studioSelected].priceCents ? usdCentsOf({ egpCents: plans[studioSelected].priceCents!, usdCents: null }, billing.egpPerUsd) : null}
              groups={availabilityGroups(switches, studioSelected, "studio")}
              studio={{
                offered: plans[studioSelected].offered === true,
                studioPages: plans[studioSelected].limits.studioPages ? String(plans[studioSelected].limits.studioPages) : "",
                removable: STUDIO_PLANS.indexOf(studioSelected as (typeof STUDIO_PLANS)[number]) >= STUDIO_PLANS_SHOWN && !plans[studioSelected].offered && !inUse.has(studioSelected),
              }}
              order={{ first: studioShown[0] === studioSelected, last: studioShown.at(-1) === studioSelected }}
              clients={onPlan(studioSelected)}
              everUsed={inUse.has(studioSelected)}
              limitDefs={limitDefs}
            />
          </>
        ) : family === "limits" ? (
          // 133 The team's own limits (each plan's values are set with its features and limits) and the lifetime note.
          <section aria-labelledby="h-plan-extras" className="flex max-w-[900px] flex-col gap-4 rounded-2xl border border-line bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 id="h-plan-extras" className="m-0 text-xl font-bold">
                Limits &amp; lifetime
              </h2>
              <p className="m-0 text-sm text-muted">
                Limits of your own, like builds per month or apps: name them here, then give each plan its number with its features and limits. They show on the
                pricing page and the Plan page, and quantity add-ons can add to them; the team keeps to them (nothing in the platform counts them). Storage, pages,
                app users, languages and the others are already limits of every plan.
              </p>
            </div>
            <PlanExtrasForm
              limits={limitDefs.map((d: PlanLimitDef) => ({ id: d.id, name: d.name, ar: d.ar ?? "", tr: d.tr ?? "", used: Object.values(plans).filter((p) => p.extraLimits && d.id in p.extraLimits).map((p) => p.name) }))}
              note={{ en: extras?.value.lifetimeNote?.en ?? "", ar: extras?.value.lifetimeNote?.ar ?? "", tr: extras?.value.lifetimeNote?.tr ?? "" }}
            />
          </section>
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
              {regularShown.map((id) => {
                const on = id === selected;
                const price = priceOf(id);
                const badge = status(plans[id]);
                return (
                  <Link
                    key={id}
                    href={`/admin/plans?plan=${id}`}
                    aria-current={on ? "page" : undefined}
                    data-regular-plan={id}
                    className={`flex flex-col gap-1 rounded-2xl border px-4 py-3 text-ink no-underline hover:text-ink ${on ? "border-midnight bg-white shadow-sm" : "border-line bg-white/60 hover:border-line-strong"} ${plans[id].archived ? "opacity-70" : ""}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-ink">{plans[id].name}</span>
                      <span className="flex flex-wrap justify-end gap-1">
                        {badge.label !== "Offered" ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.tone}`}>{badge.label}</span> : null}
                        {edits?.value[id] && !isAddedPlan(id) ? <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink-2">Edited</span> : null}
                      </span>
                    </span>
                    <span className="text-sm text-ink-2">{price.main}</span>
                    {price.usd ? <span className="text-xs text-muted">{price.usd}</span> : null}
                    {price.periods ? <span className="text-xs text-muted">{price.periods}</span> : null}
                  </Link>
                );
              })}
            </nav>
            {/* 133 A regular plan more: a copy of the plan it starts from, hidden until offered. */}
            <AddPlanForm family="regular" shown={regularShown.map((id) => ({ id, name: plans[id].name }))} full={regularShown.length >= 12} />
            <PlanPanels
              key={selected}
              id={selected}
              family="regular"
              plan={plans[selected]}
              // 133 An added plan has no default to go back to: it's archived or removed instead.
              edited={Boolean(edits?.value[selected]) && !isAddedPlan(selected)}
              price={priceOf(selected)}
              usdAtRate={plans[selected].priceCents ? usdCentsOf({ egpCents: plans[selected].priceCents!, usdCents: null }, billing.egpPerUsd) : null}
              groups={availabilityGroups(switches, selected, "regular")}
              order={{ first: regularShown[0] === selected, last: regularShown.at(-1) === selected }}
              clients={onPlan(selected)}
              everUsed={inUse.has(selected)}
              limitDefs={limitDefs}
            />
          </>
        )}
      </ReadOnly>
    </>
  );
}

/**
 * One plan: its name and price, its features and limits, and what its clients can choose, each in its own panel.
 * 103R A Studio plan also has whether it is offered and its pages per project; its features are Studio's.
 */
function PlanPanels({
  id,
  family,
  plan,
  edited,
  price,
  usdAtRate,
  groups,
  studio,
  order,
  clients,
  everUsed,
  limitDefs,
}: {
  id: Plan;
  family: "regular" | "studio";
  plan: PlanInfo;
  edited: boolean;
  price: { main: string; usd: string | null; periods?: string | null };
  usdAtRate: number | null;
  groups: AvailabilityGroup[];
  studio?: { offered: boolean; studioPages: string; removable: boolean };
  /** 133 Its place among the family's plans shown. */
  order: { first: boolean; last: boolean };
  /** 133 Apps on it now or next. */
  clients: number;
  /** 133 A client is, or was, on it: it can be archived, never removed. */
  everUsed: boolean;
  limitDefs: PlanLimitDef[];
}) {
  const panel = "flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";
  const texts = {
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
    // 133
    featured: plan.featured === true,
    badge: plan.badge ?? "",
    arBadge: plan.translations?.ar?.badge ?? "",
    trBadge: plan.translations?.tr?.badge ?? "",
    offered: family === "regular" ? planOffered({ ...plan, archived: false }) : null,
    periods: Object.fromEntries(
      PERIOD_KEYS.filter((k) => k !== mainPeriodOf(plan)).map((k) => {
        const p = plan.periods?.[k];
        // A period the team left to its suggested price shows it prefilled, for the team to edit or keep.
        if (periodLeftToSuggestion(plan, k)) {
          const s = suggestedPlanPrice(plan, k);
          return [k, { on: true, egp: s ? centsToDecimal(s.egpCents) : "", usd: s?.usdCents ? centsToDecimal(s.usdCents) : "", suggested: true }];
        }
        return [k, { on: p?.on ?? false, egp: p?.egpCents ? centsToDecimal(p.egpCents) : "", usd: p?.usdCents ? centsToDecimal(p.usdCents) : "" }];
      }),
    ),
  };
  const limits = {
    plan: {
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
      // 133
      pages: typeof plan.limits.pages === "number" ? String(plan.limits.pages) : "",
      extra: Object.fromEntries(limitDefs.map((d) => [d.id, plan.extraLimits && d.id in plan.extraLimits ? (plan.extraLimits[d.id] === null ? "unlimited" : String(plan.extraLimits[d.id])) : ""])),
    },
    features: family === "studio" ? PLAN_FEATURES.filter((f) => f.id !== "studio") : PLAN_FEATURES.filter((f) => !STUDIO_ONLY_FEATURES.includes(f.id)),
    // 133 Pages in the app are a regular plan's; a Studio plan has its Pages per project.
    limits: family === "studio" ? PLAN_LIMITS.filter((l) => l.id !== "pages") : PLAN_LIMITS,
    supportLevels: SUPPORT_LEVELS.map((s) => ({ id: s, label: SUPPORT_LABEL[s] })),
    extraDefs: limitDefs.map((d) => ({ id: d.id, name: d.name })),
  };
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
          {price.periods ? <span className="text-[13px] text-muted">Clients choose: {price.periods}</span> : null}
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
      {/* 133 Its place, a copy, archiving and removing. */}
      <PlanStatusPanel id={id} plan={plan} order={order} clients={clients} everUsed={everUsed} />
      {studio ? (
        <StudioPlanForm id={id} name={plan.name} offer={{ offered: studio.offered, studioPages: studio.studioPages, removable: studio.removable }} texts={texts} limits={limits} groups={groups} />
      ) : (
        <>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <div className={panel}>
              <div className="flex flex-col gap-1">
                <h3 className="m-0 text-base font-bold">Name and price</h3>
                <p className="m-0 text-[13px] text-muted">What the pricing page shows, in English and, if you like, Arabic and Turkish.</p>
              </div>
              <PlanForm plan={texts} />
            </div>
            <div className={panel}>
              <div className="flex flex-col gap-1">
                <h3 className="m-0 text-base font-bold">Features and limits</h3>
                <p className="m-0 text-[13px] text-muted">What each app on the plan may use. An empty limit means no limit.</p>
              </div>
              <PlanLimitsForm {...limits} />
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
        </>
      )}
    </section>
  );
}

// 11.5 Switches: per plan, everything but the license features.
function availabilityGroups(switches: SwitchesSetting | null, plan: Plan, family: "regular" | "studio"): AvailabilityGroup[] {
  const licenseKeys = new Set(LICENSE_FEATURE_SWITCHES.map((f) => switchKey("feature", f)));
  return switchGroups().map((group) => ({
    title: group.title,
    items: group.items
      .filter((item) => !licenseKeys.has(item.key) && (family === "studio" || !isStudioSwitch(item.key)))
      .map((item) => ({
        key: item.key,
        label: item.label,
        on: !(switches?.offByPlan[plan] ?? []).includes(item.key),
        offForEveryone: (switches?.off ?? []).includes(item.key),
      })),
  }));
}

/**
 * 133 A plan's place and status: lower or higher in the family (the
 * pricing page's order, and what counts as an upgrade), a copy, archive
 * (hidden from new sales; its clients keep it and may renew it) and, for an
 * added plan no client was ever on, remove.
 */
function PlanStatusPanel({ id, plan, order, clients, everUsed }: { id: Plan; plan: PlanInfo; order: { first: boolean; last: boolean }; clients: number; everUsed: boolean }) {
  const small = "h-9 px-3 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3" data-plan-status="">
      <span className="me-auto text-[13px] text-muted">
        {plan.archived ? "Archived: hidden from new sales. " : ""}
        {clients === 1 ? "1 app is on this plan." : `${clients} apps are on this plan.`}
      </span>
      <form action={movePlanAction}>
        <input type="hidden" name="plan" value={id} />
        <input type="hidden" name="direction" value="down" />
        <SubmitButton variant="secondary" className={small} disabled={order.first} pendingText="Moving…">
          <Icon name="arrow_back" size={18} />
          Move lower
        </SubmitButton>
      </form>
      <form action={movePlanAction}>
        <input type="hidden" name="plan" value={id} />
        <input type="hidden" name="direction" value="up" />
        <SubmitButton variant="secondary" className={small} disabled={order.last} pendingText="Moving…">
          Move higher
          <Icon name="arrow_forward" size={18} />
        </SubmitButton>
      </form>
      <form action={duplicatePlanAction}>
        <input type="hidden" name="plan" value={id} />
        <SubmitButton variant="secondary" className={small} pendingText="Copying…">
          <Icon name="content_copy" size={18} />
          Duplicate
        </SubmitButton>
      </form>
      <form action={archivePlanAction}>
        <input type="hidden" name="plan" value={id} />
        <input type="hidden" name="archive" value={plan.archived ? "0" : "1"} />
        <SubmitButton variant="secondary" className={small} pendingText="Saving…">
          {plan.archived ? "Bring back" : "Archive"}
        </SubmitButton>
      </form>
      {isAddedPlan(id) && !everUsed && !plan.offered && !id.startsWith("studio") ? (
        <form action={removePlanAction}>
          <input type="hidden" name="plan" value={id} />
          <SubmitButton variant="secondary" className={small} pendingText="Removing…">
            <Icon name="delete" size={18} />
            Remove this plan
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

/** 133 Adds a plan to the family: a copy of the plan it starts from, hidden until the team names and offers it. */
function AddPlanForm({ family, shown, full }: { family: "regular" | "studio"; shown: { id: Plan; name: string }[]; full: boolean }) {
  if (full) return <p className="m-0 text-[13px] text-muted">Every place for a {family === "studio" ? "Studio" : "regular"} plan is taken. Remove a plan you added to add another.</p>;
  return (
    <form action={addPlanAction} className="flex flex-wrap items-end gap-3" aria-label={`Add a ${family === "studio" ? "Studio" : "regular"} plan`}>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`add-${family}-from`} className="text-sm font-semibold">
          Start a new plan from
        </label>
        <select id={`add-${family}-from`} name="from" className="input input-sm min-w-[200px]">
          {shown.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton variant="secondary" className="h-10 px-4 text-sm" pendingText="Adding…">
        <Icon name="add" size={18} />
        Add a plan
      </SubmitButton>
      <span className="text-[13px] text-muted">A copy of its features, limits, texts and prices, hidden until you give it its own name and show it.</span>
    </form>
  );
}
