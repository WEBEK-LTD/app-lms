"use client";

import { useActionState, useEffect, useState } from "react";
import { savePlanAction, savePlanLimitsAction, saveStoragePacksAction, removeStudioPlanAction, saveStudioPlanAction } from "@/app/actions/admin-settings";
import { AvailabilityFields, type AvailabilityGroup } from "./availability";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { btn } from "@/components/ui";
import { initialFormState, type FormState } from "@/lib/forms";

export interface PlanFormValues {
  id: string;
  name: string;
  tagline: string;
  highlights: string;
  price: string;
  /** 52 "price" or "request". */
  pricing: string;
  egpPrice: string;
  usdPrice: string;
  months: string;
  /** 52 The dollar price at the exchange rate, for the hint ("$30 at the rate"); empty without a rate. */
  usdAtRate: string;
  /** 62 The texts in Arabic and Turkish (optional). */
  arName: string;
  arTagline: string;
  arHighlights: string;
  arPrice: string;
  trName: string;
  trTagline: string;
  trHighlights: string;
  trPrice: string;
  /** 133 The badge on the card, and whether the card is highlighted. */
  featured: boolean;
  badge: string;
  arBadge: string;
  trBadge: string;
  /** 133 Regular plans: shown to clients (null: the form doesn't show it, a Studio plan's "Offered" does). */
  offered: boolean | null;
  /** 133 The other periods as saved: on, and the prices as decimals. */
  periods: Record<string, { on: boolean; egp: string; usd: string }>;
}

/** 133 The periods, in order, with their names in the admin. */
const PERIODS = [
  { key: "1", months: 1, name: "1 month" },
  { key: "6", months: 6, name: "6 months" },
  { key: "12", months: 12, name: "1 year" },
  { key: "24", months: 24, name: "2 years" },
  { key: "36", months: 36, name: "3 years" },
  { key: "lifetime", months: 0, name: "Lifetime" },
] as const;

/** 133 "1500" or "1,499.50" as piastres; null when it isn't a price. */
function cents(text: string): number | null {
  const v = text.trim().replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v)) return null;
  const n = Math.round(Number(v) * 100);
  return n > 0 ? n : null;
}

const pounds = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EGP", currencyDisplay: "code", maximumFractionDigits: c % 100 === 0 ? 0 : 2 }).format(c / 100);

const TEXT_LANGS = [
  { code: "ar", name: "Arabic", dir: "rtl" },
  { code: "tr", name: "Turkish", dir: "ltr" },
] as const;

type RoundState = FormState & { round?: number };

export function PlanForm({ plan }: { plan: PlanFormValues }) {
  // Each answer is counted: React resets the form's radios after each submit, and drawn again for each answer they show the choice kept in state.
  const [state, action] = useActionState(
    async (previous: RoundState, formData: FormData) => ({ ...(await savePlanAction(previous, formData)), round: (previous.round ?? 0) + 1 }),
    initialFormState as RoundState,
  );
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="plan" value={plan.id} />
      <FormMessage message={state.message} ok={state.ok} />
      <PlanTextFields plan={plan} state={state} />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save plan
        </SubmitButton>
      </div>
    </form>
  );
}

/** A plan's name, texts and price, in its own form or in a Studio plan's one form. */
function PlanTextFields({ plan, state, highlightsHint = "One line per point on the pricing page." }: { plan: PlanFormValues; state: RoundState; highlightsHint?: string }) {
  const v = (name: keyof PlanFormValues & string, fallback: string) => state.values?.[name] ?? fallback;
  const id = (name: string) => `${plan.id}-${name}`;
  const [pricing, setPricing] = useState(v("pricing", plan.pricing));
  // 133 The main price's period, and the other periods' prices as typed: their per month and saving are worked out here, never typed.
  const [months, setMonths] = useState(v("months", plan.months));
  const [mainEgp, setMainEgp] = useState(v("egpPrice", plan.egpPrice));
  const [others, setOthers] = useState<Record<string, { on: boolean; egp: string; usd: string }>>(() =>
    Object.fromEntries(
      PERIODS.map((p) => [
        p.key,
        {
          on: state.values ? state.values[`period_${p.key}_on`] === "on" : (plan.periods[p.key]?.on ?? false),
          egp: state.values?.[`period_${p.key}_egp`] ?? plan.periods[p.key]?.egp ?? "",
          usd: state.values?.[`period_${p.key}_usd`] ?? plan.periods[p.key]?.usd ?? "",
        },
      ]),
    ),
  );
  const mainKey = PERIODS.find((p) => String(p.months) === months)?.key ?? "12";
  // Every period with a price in pounds, the main one included, for the maths.
  const priced = PERIODS.flatMap((p) => {
    const c = p.key === mainKey ? cents(mainEgp) : others[p.key]?.on ? cents(others[p.key]!.egp) : null;
    return c ? [{ ...p, cents: c }] : [];
  });
  const reference = priced.filter((p) => p.months > 0).sort((a, b) => a.months - b.months)[0];
  const maths = (key: string) => {
    const p = priced.find((x) => x.key === key);
    if (!p) return null;
    if (!p.months) return "Paid once, never renewed.";
    const month = p.months > 1 ? `${pounds(Math.round(p.cents / p.months))} a month` : null;
    const full = reference && reference.key !== p.key ? (reference.cents * p.months) / reference.months : null;
    const saving = full && full > p.cents ? Math.floor(((full - p.cents) / full) * 100) : 0;
    return [month, saving >= 1 ? `saves ${saving}% against ${reference!.name.toLowerCase()}` : null].filter(Boolean).join(" · ") || null;
  };
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field id={id("name")} label="Name" name="name" maxLength={30} defaultValue={v("name", plan.name)} error={state.errors?.name} />
        <Field id={id("tagline")} label="Tagline" name="tagline" maxLength={80} defaultValue={v("tagline", plan.tagline)} error={state.errors?.tagline} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id("highlights")} className="text-sm font-semibold">
          What&apos;s included
        </label>
        <textarea id={id("highlights")} name="highlights" rows={4} defaultValue={v("highlights", plan.highlights)} className="input min-h-24 py-3" />
        <span className="text-[13px] text-muted">{highlightsHint}</span>
        <FieldError id={`${id("highlights")}-error`} error={state.errors?.highlights} />
      </div>
      {/* 52 A price in pounds (charged through Kashier), shown in dollars outside Egypt; or the price text ("On request"). */}
      {/* The choice is sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="pricing" value={pricing} />
      <div className="flex flex-col gap-4 rounded-xl border border-line-soft bg-sand/40 p-4">
      <fieldset key={state.round ?? 0} className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Price</legend>
        <div className="flex flex-wrap gap-5">
          {[
            { value: "price", label: "A price" },
            { value: "request", label: "On request" },
          ].map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input
                type="radio"
                name={id("pricing-choice")}
                value={option.value}
                checked={pricing === option.value}
                onChange={() => setPricing(option.value)}
                className="h-4 w-4 accent-midnight"
              />
              {option.label}
            </label>
          ))}
        </div>
        <FieldError id={`${id("pricing")}-error`} error={state.errors?.pricing} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_130px]">
        <Field
          id={id("egpPrice")}
          label="Price in EGP"
          name="egpPrice"
          inputMode="decimal"
          value={mainEgp}
          onChange={(e) => setMainEgp(e.target.value)}
          hint="Charged to everyone; shown in Egypt."
          error={state.errors?.egpPrice}
        />
        <Field
          id={id("usdPrice")}
          label="Price in USD (optional)"
          name="usdPrice"
          inputMode="decimal"
          defaultValue={v("usdPrice", plan.usdPrice)}
          hint={plan.usdAtRate ? `Shown outside Egypt. Empty: ${plan.usdAtRate} at the rate.` : "Shown outside Egypt. Empty: the EGP price at the rate."}
          error={state.errors?.usdPrice}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("months")} className="text-sm font-semibold">
            Billed
          </label>
          <select id={id("months")} name="months" value={months} onChange={(e) => setMonths(e.target.value)} className="input">
            <option value="1">Monthly</option>
            <option value="6">Every 6 months</option>
            <option value="12">Yearly</option>
            <option value="24">Every 2 years</option>
            <option value="36">Every 3 years</option>
            <option value="0">Once, for life</option>
          </select>
        </div>
      </div>
      {maths(mainKey) ? <p className="m-0 -mt-2 text-[13px] text-muted" data-period-maths={mainKey}>{maths(mainKey)}</p> : null}
      {/* 133 The other periods clients can choose: each switched on and priced here. Without a price in pounds, a period isn't offered. */}
      <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line-soft bg-white/60 p-3.5" data-plan-periods="">
        <legend className="px-1 text-sm font-semibold">Other billing periods</legend>
        <p className="m-0 text-[13px] text-muted">
          Clients choose among the periods with a price. The price per month and the saving are worked out from the prices, against the shortest period. A period without a price in EGP isn&apos;t offered.
        </p>
        {PERIODS.filter((p) => p.key !== mainKey).map((p) => {
          const row = others[p.key]!;
          const set = (patch: Partial<typeof row>) => setOthers((all) => ({ ...all, [p.key]: { ...all[p.key]!, ...patch } }));
          const status = !row.on ? "Off" : cents(row.egp) ? maths(p.key) : "No price yet: not offered";
          return (
            <div key={p.key} data-period-row={p.key} className={`grid items-start gap-3 rounded-lg border px-3 py-2.5 sm:grid-cols-[150px_1fr_1fr] ${p.key === "lifetime" ? "border-ember/40 bg-peach-soft" : "border-line-soft"}`}>
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[15px] font-semibold">
                <input type="checkbox" name={`period_${p.key}_on`} checked={row.on} onChange={(e) => set({ on: e.target.checked })} className="h-4 w-4 accent-midnight" />
                Offer {p.name.toLowerCase()}
              </label>
              <Field
                id={id(`period-${p.key}-egp`)}
                label={`EGP for ${p.name.toLowerCase()}`}
                name={`period_${p.key}_egp`}
                inputMode="decimal"
                value={row.egp}
                onChange={(e) => set({ egp: e.target.value })}
                error={state.errors?.[`period_${p.key}_egp`]}
                small
              />
              <Field
                id={id(`period-${p.key}-usd`)}
                label={`USD for ${p.name.toLowerCase()} (optional)`}
                name={`period_${p.key}_usd`}
                inputMode="decimal"
                value={row.usd}
                onChange={(e) => set({ usd: e.target.value })}
                error={state.errors?.[`period_${p.key}_usd`]}
                small
              />
              {status ? <span className="text-[13px] text-muted sm:col-span-3" data-period-status={p.key}>{status}</span> : null}
            </div>
          );
        })}
      </fieldset>
      <Field
        id={id("price")}
        label="Price text"
        name="price"
        maxLength={30}
        defaultValue={v("price", plan.price)}
        hint="Shown instead of a price when the plan is On request."
        error={state.errors?.price}
      />
      </div>
      {/* 133 The highlighted card and its badge; whether clients see a regular plan. */}
      <div className="grid gap-4 rounded-xl border border-line-soft p-3.5 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="featured" defaultChecked={state.values ? state.values.featured === "on" : plan.featured} className="h-4 w-4 accent-midnight" />
          Highlight this plan, with a badge
        </label>
        <Field id={id("badge")} label="Badge text" name="badge" maxLength={24} placeholder="Most popular" defaultValue={v("badge", plan.badge)} hint="Empty: Most popular." error={state.errors?.badge} small />
        {plan.offered !== null ? (
          <>
            <input type="hidden" name="visibility" value="1" />
            <label className="flex cursor-pointer items-start gap-2 text-[15px] sm:col-span-2">
              <input type="checkbox" name="offered" defaultChecked={state.values ? state.values.offered === "on" : plan.offered} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col gap-0.5">
                Shown to clients
                <span className="text-[13px] text-muted">On the pricing page and in the dashboard. Hidden: clients don&apos;t see it or pay for it; apps on it keep it.</span>
              </span>
            </label>
          </>
        ) : null}
      </div>
      {/* 62 The website and the dashboard in Arabic and Turkish show these; empty: the built-in translation of the default texts, else the English. */}
      {TEXT_LANGS.map((lang) => {
        const key = (field: "Name" | "Tagline" | "Highlights" | "Price" | "Badge") => `${lang.code}${field}` as keyof PlanFormValues & string;
        return (
          <details key={lang.code} className="rounded-xl border border-line-soft px-3.5 py-3" open={Boolean(plan[key("Name")] || plan[key("Tagline")] || plan[key("Highlights")] || plan[key("Price")] || plan[key("Badge")])}>
            <summary className="cursor-pointer text-sm font-semibold">In {lang.name} (optional)</summary>
            <div role="group" aria-label={`${lang.name} texts`} className="mt-3 flex flex-col gap-4" lang={lang.code} dir={lang.dir}>
              <p className="m-0 text-[13px] text-muted" lang="en" dir="ltr">
                Shown on the {lang.name} website and dashboard. An empty field shows the built-in {lang.name} text of the default plan, else the English above.
              </p>
              <Field id={id(key("Name"))} label="Name" name={key("Name")} maxLength={30} defaultValue={v(key("Name"), plan[key("Name")] as string)} error={state.errors?.[key("Name")]} />
              <Field id={id(key("Tagline"))} label="Tagline" name={key("Tagline")} maxLength={80} defaultValue={v(key("Tagline"), plan[key("Tagline")] as string)} error={state.errors?.[key("Tagline")]} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor={id(key("Highlights"))} className="text-sm font-semibold">
                  What&apos;s included
                </label>
                <textarea id={id(key("Highlights"))} name={key("Highlights")} rows={4} defaultValue={v(key("Highlights"), plan[key("Highlights")] as string)} className="input min-h-24 py-3" />
                <FieldError id={`${id(key("Highlights"))}-error`} error={state.errors?.[key("Highlights")]} />
              </div>
              <Field id={id(key("Price"))} label="Price text" name={key("Price")} maxLength={30} defaultValue={v(key("Price"), plan[key("Price")] as string)} error={state.errors?.[key("Price")]} />
              <Field id={id(key("Badge"))} label="Badge text" name={key("Badge")} maxLength={24} defaultValue={v(key("Badge"), plan[key("Badge")] as string)} hint="Empty: the built-in translation of Most popular, or the English badge." error={state.errors?.[key("Badge")]} />
            </div>
          </details>
        );
      })}
    </>
  );
}

export interface StoragePackValues {
  id: string;
  gb: string;
  /** 52 A month's price in pounds (charged) and, optionally, in dollars (shown outside Egypt). */
  egpPrice: string;
  usdPrice: string;
  /** 52 The dollar price at the exchange rate, for the hint; empty without a rate or a price. */
  usdAtRate: string;
}

/** 51 The storage packs owners buy for their Media library: size and a month's price each, 52 in pounds like the plans. */
export function StoragePacksForm({ offers }: { offers: StoragePackValues[] }) {
  const [state, action] = useActionState(saveStoragePacksAction, initialFormState);
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-label="Storage packs">
      <FormMessage message={state.message} ok={state.ok} />
      {offers.map((o, i) => (
        <fieldset key={o.id} className="m-0 grid gap-4 rounded-xl border border-line-soft p-3.5 sm:grid-cols-[120px_1fr_1fr]">
          <legend className="px-1 text-sm font-semibold">Pack {i + 1}</legend>
          <input type="hidden" name={`id${i}`} value={o.id} />
          <Field id={`pack-${o.id}-gb`} label="Gigabytes" name={`gb${i}`} inputMode="numeric" defaultValue={v(`gb${i}`, o.gb)} error={state.errors?.[`gb${i}`]} small />
          <Field
            id={`pack-${o.id}-egp`}
            label="Monthly price in EGP"
            name={`egp${i}`}
            inputMode="decimal"
            defaultValue={v(`egp${i}`, o.egpPrice)}
            hint="What everyone is charged. Empty: not sold by card (add it by hand on the client's page)."
            error={state.errors?.[`egp${i}`]}
            small
          />
          <Field
            id={`pack-${o.id}-usd`}
            label="Monthly price in USD (optional)"
            name={`usd${i}`}
            inputMode="decimal"
            defaultValue={v(`usd${i}`, o.usdPrice)}
            hint={o.usdAtRate ? `Shown outside Egypt. Empty: ${o.usdAtRate} at the exchange rate.` : "Shown outside Egypt. Empty: the EGP price at the exchange rate in Settings."}
            error={state.errors?.[`usd${i}`]}
            small
          />
        </fieldset>
      ))}
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save storage packs
        </SubmitButton>
      </div>
    </form>
  );
}

export interface PlanLimitsValues {
  id: string;
  name: string;
  features: string[];
  appUsers: string;
  languages: string;
  sources: string;
  storageGb: string;
  analyticsMonths: string;
  teamMembers: string;
  support: string;
  accountManager: boolean;
  customFeatures: boolean;
  /** 133 A regular plan's pages; the team's own limits by id ("" not on the plan, "unlimited", or a number). */
  pages: string;
  extra: Record<string, string>;
}

/**
 * 13.1 What a plan includes: features (each enforced where it says) and
 * limits; empty means no limit. Team members, support, the account manager
 * and custom features are display-only: shown to clients, handled by the team.
 */
export function PlanLimitsForm({ plan, features, limits, supportLevels, extraDefs }: LimitsProps) {
  const [state, action] = useActionState(savePlanLimitsAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-label={`${plan.name}: features and limits`}>
      <input type="hidden" name="plan" value={plan.id} />
      <FormMessage message={state.message} ok={state.ok} />
      <PlanLimitsFields plan={plan} state={state} features={features} limits={limits} supportLevels={supportLevels} extraDefs={extraDefs} />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save features and limits
        </SubmitButton>
      </div>
    </form>
  );
}

type LimitsProps = {
  plan: PlanLimitsValues;
  features: { id: string; label: string; description: string; enforced: string }[];
  limits: { id: "appUsers" | "languages" | "sources" | "storageGb" | "analyticsMonths" | "pages"; label: string; unlimited: string; enforced: string }[];
  supportLevels: { id: string; label: string }[];
  /** 133 The team's own limits (Admin › Plans › Limits). */
  extraDefs?: { id: string; name: string }[];
};

/** A plan's features and limits; `extra`, a Studio plan's own limit, next to the others. */
function PlanLimitsFields({ plan, state, features, limits, supportLevels, extra, extraDefs = [] }: LimitsProps & { state: FormState; extra?: React.ReactNode }) {
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const checked = state.values ? (state.values.features ?? "").split(",") : plan.features;
  const id = (name: string) => `${plan.id}-limits-${name}`;
  return (
    <>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Features</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <label key={f.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-line-soft px-3 py-2 text-sm has-[:checked]:border-line-strong has-[:checked]:bg-sand/40">
              <input type="checkbox" name="features" value={f.id} defaultChecked={checked.includes(f.id)} className="mt-0.5 h-4 w-4 flex-none accent-midnight" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold">{f.label}</span>
                <span className="text-[12px] leading-snug text-muted">Enforced: {f.enforced}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        {limits.map((l) => (
          <Field
            key={l.id}
            id={id(l.id)}
            label={l.label}
            name={l.id}
            inputMode="numeric"
            defaultValue={v(l.id, plan[l.id])}
            hint={
              l.id === "analyticsMonths"
                ? `Empty: ${l.unlimited.toLowerCase()}. Daily totals; single events are kept 90 days on every plan.`
                : l.id === "pages"
                  ? "Empty: no limit (the simple page editor keeps its template's 6 pages)."
                  : "Empty: no limit."
            }
            error={state.errors?.[l.id]}
            small
          />
        ))}
        {extra}
      </div>
      {/* 133 The team's own limits: shown to clients, handled by the team; add them in Plans › Limits. */}
      {extraDefs.length ? (
        <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line-soft p-3.5" data-extra-limits="">
          <legend className="px-1 text-sm font-semibold">Your own limits (handled by the team)</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {extraDefs.map((d) => (
              <Field
                key={d.id}
                id={id(`extra-${d.id}`)}
                label={d.name}
                name={`extra_${d.id}`}
                defaultValue={v(`extra_${d.id}`, plan.extra[d.id] ?? "")}
                hint="Empty: not on this plan. “unlimited”: no limit."
                error={state.errors?.[`extra_${d.id}`]}
                small
              />
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line-soft p-3.5">
        <legend className="px-1 text-sm font-semibold">Shown to clients only (handled by the team)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id("teamMembers")} label="Team members" name="teamMembers" inputMode="numeric" defaultValue={v("teamMembers", plan.teamMembers)} hint="Empty: no limit." error={state.errors?.teamMembers} small />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={id("support")} className="text-sm font-semibold">
              Support
            </label>
            <select id={id("support")} name="support" defaultValue={v("support", plan.support)} className="input input-sm">
              {supportLevels.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <FieldError id={`${id("support")}-error`} error={state.errors?.support} />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="accountManager" defaultChecked={state.values ? state.values.accountManager === "on" : plan.accountManager} className="h-4 w-4 accent-midnight" />
          A dedicated account manager
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="customFeatures" defaultChecked={state.values ? state.values.customFeatures === "on" : plan.customFeatures} className="h-4 w-4 accent-midnight" />
          Custom features on request
        </label>
      </fieldset>
    </>
  );
}

/** 103R Whether a Studio plan is offered to Studio projects, and how many Studio pages a project on it may have. */
export interface StudioOfferValues {
  offered: boolean;
  studioPages: string;
  /** Added by the team and on no license: it can be taken off the page. */
  removable: boolean;
}

/**
 * 103R A Studio plan on Admin › Plans › Yallapp Studio, in one form with
 * one Save button that stays at the bottom of the screen: whether it's
 * offered, its name and price, its features and limits (Pages per project
 * with the others) and what it offers. Leaving with changes not saved asks
 * first.
 */
export function StudioPlanForm({
  id,
  name,
  offer,
  texts,
  limits,
  groups,
}: {
  id: string;
  name: string;
  offer: StudioOfferValues;
  texts: PlanFormValues;
  limits: LimitsProps;
  groups: AvailabilityGroup[];
}) {
  const [state, action] = useActionState(
    async (previous: RoundState, formData: FormData) => ({ ...(await saveStudioPlanAction(previous, formData)), round: (previous.round ?? 0) + 1 }),
    initialFormState as RoundState,
  );
  const [changed, setChanged] = useState(false);
  const [round, setRound] = useState(0);
  // A save that went through leaves nothing to save.
  if ((state.round ?? 0) !== round) {
    setRound(state.round ?? 0);
    if (state.ok) setChanged(false);
  }
  useEffect(() => {
    if (!changed) return;
    const leaving = (e: BeforeUnloadEvent) => e.preventDefault();
    // Links in the page (another plan, another tab of Admin) ask first too.
    const clicked = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (link && !window.confirm("Your changes to this plan aren't saved. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", leaving);
    document.addEventListener("click", clicked, true);
    return () => {
      window.removeEventListener("beforeunload", leaving);
      document.removeEventListener("click", clicked, true);
    };
  }, [changed]);
  const offered = state.values ? state.values.offered === "on" : offer.offered;
  const panel = "flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";
  return (
    <form action={action} noValidate onChange={() => setChanged(true)} className="flex flex-col gap-4" aria-label={`${name}: the plan`}>
      <input type="hidden" name="plan" value={id} />
      <div className={panel}>
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-base font-bold">Offered to Studio projects</h3>
          <p className="m-0 text-[13px] text-muted">Studio projects see and pay only offered plans. Give the plan its own name and price first.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex h-10 cursor-pointer items-center gap-2 text-[15px] font-semibold">
            <input key={state.round ?? 0} type="checkbox" name="offered" defaultChecked={offered} className="h-4 w-4 accent-midnight" />
            Offered
          </label>
          {offer.removable ? (
            <button type="submit" formAction={removeStudioPlanAction} className={`${btn.secondary} h-10 px-3 text-sm`}>
              Remove plan
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className={panel}>
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-base font-bold">Name and price</h3>
            <p className="m-0 text-[13px] text-muted">What the pricing page shows, in English and, if you like, Arabic and Turkish.</p>
          </div>
          <PlanTextFields
            key={`texts-${state.ok ? (state.round ?? 0) : 0}`}
            plan={texts}
            state={state}
            highlightsHint="One line per point. Empty: written from the plan's numbers when you save, and again when they change, until you write your own."
          />
        </div>
        <div className={panel}>
          <div className="flex flex-col gap-1">
            <h3 className="m-0 text-base font-bold">Features and limits</h3>
            <p className="m-0 text-[13px] text-muted">What each project on the plan may use. An empty limit means no limit.</p>
          </div>
          <PlanLimitsFields
            key={`limits-${state.ok ? (state.round ?? 0) : 0}`}
            {...limits}
            state={state}
            extra={
              <Field
                id={`${id}-studioPages`}
                label="Pages per project"
                name="studioPages"
                inputMode="numeric"
                placeholder="No limit"
                defaultValue={state.values?.studioPages ?? offer.studioPages}
                hint="1 to 20. Empty: no limit."
                error={state.errors?.studioPages}
                small
              />
            }
          />
        </div>
      </div>
      <div className={panel}>
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-base font-bold">What {name} offers</h3>
          <p className="m-0 text-[13px] text-muted">Clients on this plan can choose what&apos;s ticked. Switches turn things off for everyone; the plan&apos;s features are set above.</p>
        </div>
        <AvailabilityFields key={`offers-${state.round ?? 0}`} groups={state.values ? groups.map((g) => ({ ...g, items: g.items.map((item) => ({ ...item, on: (state.values?.on ?? "").split(",").includes(item.key) })) })) : groups} />
      </div>
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-white/95 px-5 py-3 shadow-[0_-6px_18px_rgba(14,13,36,0.06)] backdrop-blur">
        <div className="me-auto min-w-0">
          {state.message ? <FormMessage message={state.message} ok={state.ok} /> : changed ? <span className="text-sm text-muted">Changes not saved yet.</span> : null}
        </div>
        <SubmitButton className="h-10" pendingText="Saving…">
          Save plan
        </SubmitButton>
      </div>
    </form>
  );
}
