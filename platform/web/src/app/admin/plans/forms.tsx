"use client";

import { useActionState, useState } from "react";
import { savePlanAction, savePlanLimitsAction, saveStoragePacksAction } from "@/app/actions/admin-settings";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

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
}

export function PlanForm({ plan }: { plan: PlanFormValues }) {
  const [state, action] = useActionState(savePlanAction, initialFormState);
  const v = (name: keyof PlanFormValues & string, fallback: string) => state.values?.[name] ?? fallback;
  const id = (name: string) => `${plan.id}-${name}`;
  const [pricing, setPricing] = useState(v("pricing", plan.pricing));
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="plan" value={plan.id} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field id={id("name")} label="Name" name="name" maxLength={30} defaultValue={v("name", plan.name)} error={state.errors?.name} />
      <Field id={id("tagline")} label="Tagline" name="tagline" maxLength={80} defaultValue={v("tagline", plan.tagline)} error={state.errors?.tagline} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id("highlights")} className="text-sm font-semibold">
          What&apos;s included
        </label>
        <textarea id={id("highlights")} name="highlights" rows={5} defaultValue={v("highlights", plan.highlights)} className="input min-h-28 py-3" />
        <span className="text-[13px] text-muted">One line per point on the pricing page.</span>
        <FieldError id={`${id("highlights")}-error`} error={state.errors?.highlights} />
      </div>
      {/* 52 A price in pounds (charged through Kashier), shown in dollars outside Egypt; or the price text ("On request"). */}
      {/* The choice is sent from state: React resets the form's own radios after each submit. */}
      <input type="hidden" name="pricing" value={pricing} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
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
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_150px]">
        <Field
          id={id("egpPrice")}
          label="Price in EGP"
          name="egpPrice"
          inputMode="decimal"
          defaultValue={v("egpPrice", plan.egpPrice)}
          hint="What everyone is charged, in Egypt or not. Shown to people in Egypt."
          error={state.errors?.egpPrice}
        />
        <Field
          id={id("usdPrice")}
          label="Price in USD (optional)"
          name="usdPrice"
          inputMode="decimal"
          defaultValue={v("usdPrice", plan.usdPrice)}
          hint={plan.usdAtRate ? `Shown outside Egypt. Empty: ${plan.usdAtRate} at the exchange rate.` : "Shown outside Egypt. Empty: the EGP price at the exchange rate in Settings."}
          error={state.errors?.usdPrice}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("months")} className="text-sm font-semibold">
            Billed
          </label>
          <select id={id("months")} name="months" defaultValue={v("months", plan.months)} className="input">
            <option value="1">Monthly</option>
            <option value="12">Yearly</option>
          </select>
        </div>
      </div>
      <Field
        id={id("price")}
        label="Price text"
        name="price"
        maxLength={30}
        defaultValue={v("price", plan.price)}
        hint="Shown instead of a price when the plan is On request."
        error={state.errors?.price}
      />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save plan
        </SubmitButton>
      </div>
    </form>
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
  teamMembers: string;
  support: string;
  accountManager: boolean;
  customFeatures: boolean;
}

/**
 * 13.1 What a plan includes: features (each enforced where it says) and
 * limits; empty means no limit. Team members, support, the account manager
 * and custom features are display-only: shown to clients, handled by the team.
 */
export function PlanLimitsForm({
  plan,
  features,
  limits,
  supportLevels,
}: {
  plan: PlanLimitsValues;
  features: { id: string; label: string; description: string; enforced: string }[];
  limits: { id: "appUsers" | "languages" | "sources" | "storageGb"; label: string; enforced: string }[];
  supportLevels: { id: string; label: string }[];
}) {
  const [state, action] = useActionState(savePlanLimitsAction, initialFormState);
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const checked = state.values ? (state.values.features ?? "").split(",") : plan.features;
  const id = (name: string) => `${plan.id}-limits-${name}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-label={`${plan.name}: features and limits`}>
      <input type="hidden" name="plan" value={plan.id} />
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Features</legend>
        {features.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-start gap-2 text-[15px]">
            <input type="checkbox" name="features" value={f.id} defaultChecked={checked.includes(f.id)} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col">
              <span>{f.label}</span>
              <span className="text-[12px] text-muted">Enforced: {f.enforced}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-4">
        {limits.map((l) => (
          <Field
            key={l.id}
            id={id(l.id)}
            label={l.label}
            name={l.id}
            inputMode="numeric"
            defaultValue={v(l.id, plan[l.id])}
            hint="Empty: no limit."
            error={state.errors?.[l.id]}
            small
          />
        ))}
      </div>
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
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save features and limits
        </SubmitButton>
      </div>
    </form>
  );
}
