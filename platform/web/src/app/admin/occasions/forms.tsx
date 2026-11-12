"use client";

import { useActionState, useState } from "react";
import { createOccasionAction, deleteOccasionAction, nextYearOccasionAction, updateOccasionAction } from "@/app/actions/admin-occasions";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import type { OccasionPlans, OccasionRecord, OccasionTemplate } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";
import { newOccasion, OCCASION_TEMPLATES } from "@/lib/occasions";

/** Kept in sync with OCCASION_PLANS_LABELS (lib/occasions/admin.ts, a server module). */
const PLAN_OPTIONS: { id: OccasionPlans; label: string; hint: string }[] = [
  { id: "all", label: "All plans", hint: "Regular apps' plans and Yallapp Studio's" },
  { id: "regular", label: "Regular apps' plans", hint: "Starter, Growth, Pro and Business" },
  { id: "studio", label: "Yallapp Studio's plans", hint: "Studio projects only" },
];

type Fields = Pick<OccasionRecord, "name" | "startsOn" | "endsOn" | "percent" | "couponCode" | "plans" | "active">;

/**
 * 124 An occasion's form. A new one starts from its kind and year (its
 * usual days, percentage and code); changing either starts the fields again.
 */
export function OccasionForm({
  id,
  occasion,
  templates,
  years,
}: {
  /** Saved occasions; none for a new one. */
  id?: string;
  occasion: Fields & { template: OccasionTemplate };
  /** For a new occasion: the kinds and years to choose from. */
  templates?: readonly OccasionTemplate[];
  years?: readonly number[];
}) {
  const [state, action] = useActionState(id ? updateOccasionAction : createOccasionAction, initialFormState);
  const [pick, setPick] = useState<{ template: OccasionTemplate; year: number; changed: boolean }>({
    template: (state.values?.template as OccasionTemplate | undefined) ?? occasion.template,
    year: Number(state.values?.year ?? occasion.startsOn.slice(0, 4)),
    changed: false,
  });
  const base: Fields = id || !pick.changed ? occasion : newOccasion(pick.template, pick.year, "", "", new Date(0));
  const s = pick.changed ? undefined : state.values;
  const v = (name: Exclude<keyof Fields, "active">) => (s ? (s[name] ?? "") : String(base[name]));
  const plans = s ? s.plans : base.plans;
  const active = s ? s.active === "on" : base.active;
  const e = state.errors ?? {};
  const choose = (next: Partial<{ template: OccasionTemplate; year: number }>) => setPick((p) => ({ ...p, ...next, changed: true }));
  return (
    <form action={action} noValidate onSubmit={() => setPick((p) => ({ ...p, changed: false }))} className="flex flex-col gap-5">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      {id ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="f-template" className="text-sm font-semibold">
              Kind
            </label>
            <select id="f-template" name="template" value={pick.template} onChange={(ev) => choose({ template: ev.target.value as OccasionTemplate })} className="input">
              {(templates ?? [occasion.template]).map((t) => (
                <option key={t} value={t}>
                  {OCCASION_TEMPLATES[t].name}
                </option>
              ))}
            </select>
            <FieldError id="f-template-error" error={e.template} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="f-year" className="text-sm font-semibold">
              Year
            </label>
            <select id="f-year" name="year" value={pick.year} onChange={(ev) => choose({ year: Number(ev.target.value) })} className="input">
              {(years ?? [pick.year]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">Fills in the kind&apos;s usual days, percentage and code for that year.</span>
          </div>
        </div>
      )}

      <div key={`${pick.template}-${pick.year}`} className="flex flex-col gap-5">
        <Field label="Name" name="name" maxLength={80} defaultValue={v("name")} hint="For the team, like Black Friday 2026." error={e.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First day" name="startsOn" type="date" defaultValue={v("startsOn")} hint="From the start of the day, in Istanbul's time." error={e.startsOn} />
          <Field label="Last day" name="endsOn" type="date" defaultValue={v("endsOn")} hint="To the end of the day. To extend the offer, choose a later day." error={e.endsOn} />
          <Field
            label="Percent off"
            name="percent"
            inputMode="numeric"
            defaultValue={v("percent")}
            hint="1 to 90, off the first payment made with the code, monthly or yearly. Renewals after it are at the normal price."
            error={e.percent}
          />
          <Field label="Code" name="couponCode" maxLength={40} defaultValue={v("couponCode")} hint="Clients type it at the card payment, in any case. Saving updates the coupon with this code." error={e.couponCode} />
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">Plans</legend>
          {PLAN_OPTIONS.map((option) => (
            <label key={option.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="radio" name="plans" value={option.id} defaultChecked={plans === option.id} className="h-4 w-4 accent-midnight" />
              {option.label}
              <span className="text-[13px] text-muted">· {option.hint}</span>
            </label>
          ))}
          <FieldError id="f-plans-error" error={e.plans} />
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="active" defaultChecked={active} className="h-4 w-4 accent-midnight" />
          On: its page shows the offer and clients can use the code on its days
        </label>
      </div>

      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          {id ? "Save" : "Create occasion"}
        </SubmitButton>
      </div>
    </form>
  );
}

/** "Run it again next year": a new occasion a year on; this one stays as the record of its year. */
export function NextYearForm({ id }: { id: string }) {
  const [state, action] = useActionState(nextYearOccasionAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} ok={state.ok} />
      <div>
        <SubmitButton variant="secondary" className="h-10" pendingText="Making it…">
          <Icon name="redo" size={20} />
          Run it again next year
        </SubmitButton>
      </div>
    </form>
  );
}

/** Deletes the occasion after a confirm; its coupon is turned off, not deleted. */
export function DeleteOccasionForm({ id, name, code }: { id: string; name: string; code: string }) {
  const [state, action] = useActionState(deleteOccasionAction, initialFormState);
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!window.confirm(`Delete ${name}? Its page stops showing it and its coupon ${code} is turned off (kept with its uses).`)) ev.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} ok={state.ok} />
      <div>
        <SubmitButton variant="danger" className="h-10" pendingText="Deleting…">
          <Icon name="delete" size={20} />
          Delete occasion
        </SubmitButton>
      </div>
    </form>
  );
}
