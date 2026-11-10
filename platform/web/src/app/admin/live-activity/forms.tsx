"use client";

import { useActionState } from "react";
import { addLiveEntryAction, saveLiveSettingAction } from "@/app/actions/admin-live";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { LIVE_KIND_LABEL, LIVE_KINDS, LIVE_LIMITS, LIVE_PAGES, LIVE_PAGES_LABEL, type LiveActivitySetting } from "@/lib/live-activity/types";

export interface Option {
  value: string;
  label: string;
}

/** On or off, which kinds, which pages, the first delay, the pause and the cards per visit. */
export function LiveSettingForm({ setting }: { setting: LiveActivitySetting }) {
  const [state, action] = useActionState(saveLiveSettingAction, initialFormState);
  const v = state.values;
  const kinds = v ? (v.kinds ?? "").split(",") : setting.kinds;
  const pages = v?.pages ?? setting.pages;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex cursor-pointer items-center gap-2 text-[15px] font-semibold">
        <input type="checkbox" name="on" defaultChecked={v ? v.on === "on" : setting.on} className="h-4 w-4 accent-midnight" />
        Show the live activity card on the website
      </label>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby={state.errors?.kinds ? "f-kinds-error" : undefined}>
        <legend className="mb-1 text-sm font-semibold">Kinds of card</legend>
        {LIVE_KINDS.map((kind) => (
          <label key={kind} className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input type="checkbox" name="kinds" value={kind} defaultChecked={kinds.includes(kind)} className="h-4 w-4 accent-midnight" />
            {LIVE_KIND_LABEL[kind]}
          </label>
        ))}
        <FieldError id="f-kinds-error" error={state.errors?.kinds} />
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">Pages</legend>
        {LIVE_PAGES.map((p) => (
          <label key={p} className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input type="radio" name="pages" value={p} defaultChecked={pages === p} className="h-4 w-4 accent-midnight" />
            {LIVE_PAGES_LABEL[p]}
          </label>
        ))}
        <FieldError id="f-pages-error" error={state.errors?.pages} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="First card after (seconds)"
          name="firstDelaySeconds"
          type="number"
          inputMode="numeric"
          min={LIVE_LIMITS.firstDelaySeconds.min}
          max={LIVE_LIMITS.firstDelaySeconds.max}
          defaultValue={v?.firstDelaySeconds ?? String(setting.firstDelaySeconds)}
          error={state.errors?.firstDelaySeconds}
          small
        />
        <Field
          label="Pause between cards (seconds)"
          name="gapSeconds"
          type="number"
          inputMode="numeric"
          min={LIVE_LIMITS.gapSeconds.min}
          max={LIVE_LIMITS.gapSeconds.max}
          defaultValue={v?.gapSeconds ?? String(setting.gapSeconds)}
          error={state.errors?.gapSeconds}
          small
        />
        <Field
          label="Cards per visit"
          name="maxPerVisit"
          type="number"
          inputMode="numeric"
          min={LIVE_LIMITS.maxPerVisit.min}
          max={LIVE_LIMITS.maxPerVisit.max}
          defaultValue={v?.maxPerVisit ?? String(setting.maxPerVisit)}
          error={state.errors?.maxPerVisit}
          small
        />
      </div>
      <SubmitButton className="h-10 self-start">Save settings</SubmitButton>
    </form>
  );
}

/** A customer who signed up offline: shown like any subscription, only with their agreement. */
export function LiveEntryForm({ plans, countries, today }: { plans: Option[]; countries: Option[]; today: string }) {
  const [state, action] = useActionState(addLiveEntryAction, initialFormState);
  const v = state.values ?? {};
  // A saved entry empties the form; a refused one keeps what was typed and chosen (React resets a form after its action, selects too).
  const key = state.ok ? state.message : JSON.stringify(state.values ?? {});
  return (
    <form key={key} action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="off" maxLength={40} defaultValue={v.firstName} error={state.errors?.firstName} small />
        <Field
          label="Last name or initial"
          name="lastName"
          autoComplete="off"
          maxLength={40}
          defaultValue={v.lastName}
          error={state.errors?.lastName}
          hint="Only its initial is kept and shown: “Ahmed M.”"
          small
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-plan" className="text-sm font-semibold">
            Plan
          </label>
          <select id="f-plan" name="plan" className="input input-sm" defaultValue={v.plan ?? ""} aria-invalid={state.errors?.plan ? true : undefined} aria-describedby={state.errors?.plan ? "f-plan-error" : undefined}>
            <option value="">Choose…</option>
            {plans.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <FieldError id="f-plan-error" error={state.errors?.plan} />
        </div>
        <Field label="The day they subscribed or agreed" name="agreedOn" type="date" max={today} defaultValue={v.agreedOn ?? today} error={state.errors?.agreedOn} small />
        <Field label="City (optional)" name="city" autoComplete="off" maxLength={60} defaultValue={v.city} error={state.errors?.city} small />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-country" className="text-sm font-semibold">
            Country (optional)
          </label>
          <select id="f-country" name="country" className="input input-sm" defaultValue={v.country ?? ""} aria-invalid={state.errors?.country ? true : undefined} aria-describedby={state.errors?.country ? "f-country-error" : undefined}>
            <option value="">None</option>
            {countries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <FieldError id="f-country-error" error={state.errors?.country} />
        </div>
        <Field
          label="Their client account (optional)"
          name="client"
          autoComplete="off"
          maxLength={191}
          defaultValue={v.client}
          error={state.errors?.client}
          hint="The account's email or the client's ID, to link the entry to it."
          small
          className="sm:col-span-2"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-2 text-[15px] font-semibold">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={v.consent === "on"}
            aria-invalid={state.errors?.consent ? true : undefined}
            aria-describedby={state.errors?.consent ? "f-consent-error" : undefined}
            className="mt-1 h-4 w-4 accent-midnight"
          />
          This customer agreed to be shown on the website.
        </label>
        <FieldError id="f-consent-error" error={state.errors?.consent} />
      </div>
      <SubmitButton className="h-10 self-start">Add customer</SubmitButton>
    </form>
  );
}
