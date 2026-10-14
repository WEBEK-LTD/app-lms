"use client";

import { useActionState } from "react";
import { savePlanAction, savePlanLimitsAction } from "@/app/actions/admin-settings";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export interface PlanFormValues {
  id: string;
  name: string;
  tagline: string;
  highlights: string;
  price: string;
  cardPrice: string;
  currency: string;
  months: string;
}

export function PlanForm({ plan }: { plan: PlanFormValues }) {
  const [state, action] = useActionState(savePlanAction, initialFormState);
  const v = (name: keyof PlanFormValues & string, fallback: string) => state.values?.[name] ?? fallback;
  const id = (name: string) => `${plan.id}-${name}`;
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
      <div className="grid gap-4 sm:grid-cols-[1fr_110px_150px]">
        <Field
          id={id("cardPrice")}
          label="Card price"
          name="cardPrice"
          inputMode="decimal"
          defaultValue={v("cardPrice", plan.cardPrice)}
          hint="Empty: prices are agreed on WhatsApp."
          error={state.errors?.cardPrice}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id("currency")} className="text-sm font-semibold">
            Currency
          </label>
          <select id={id("currency")} name="currency" defaultValue={v("currency", plan.currency)} className="input">
            <option>TRY</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </div>
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
        hint="Shown when there's no card price."
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

export interface PlanLimitsValues {
  id: string;
  name: string;
  features: string[];
  appUsers: string;
  languages: string;
  sources: string;
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
  limits: { id: "appUsers" | "languages" | "sources"; label: string; enforced: string }[];
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
      <div className="grid gap-4 sm:grid-cols-3">
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
