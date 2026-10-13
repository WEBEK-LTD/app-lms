"use client";

import { useActionState } from "react";
import { savePlanAction } from "@/app/actions/admin-settings";
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
  features: string[];
}

export function PlanForm({ plan, features }: { plan: PlanFormValues; features: { id: string; label: string }[] }) {
  const [state, action] = useActionState(savePlanAction, initialFormState);
  const v = (name: keyof PlanFormValues & string, fallback: string) => state.values?.[name] ?? fallback;
  const checked = state.values ? state.values.features!.split(",") : plan.features;
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
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">License features</legend>
        {features.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input type="checkbox" name="features" value={f.id} defaultChecked={checked.includes(f.id)} className="h-4 w-4 accent-midnight" />
            {f.label}
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save plan
        </SubmitButton>
      </div>
    </form>
  );
}
