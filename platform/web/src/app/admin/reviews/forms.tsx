"use client";

import { useActionState } from "react";
import { addReviewAction, saveReviewsSettingAction } from "@/app/actions/admin-reviews";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export interface Option {
  value: string;
  label: string;
}

const LANG_OPTIONS: Option[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "tr", label: "Turkish" },
];

function Select({ name, label, options, value, error, empty }: { name: string; label: string; options: Option[]; value?: string; error?: string; empty?: string }) {
  const id = `f-${name}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={name} className="input input-sm" defaultValue={value ?? ""} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}>
        {empty !== undefined ? <option value="">{empty}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function TextArea({ name, label, value, error, hint, dir }: { name: string; label: string; value?: string; error?: string; hint?: string; dir?: "auto" | "rtl" }) {
  const id = `f-${name}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={3}
        maxLength={600}
        dir={dir ?? "auto"}
        defaultValue={value}
        className="input min-h-[84px] py-2"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
      />
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** A review from a real customer, only with the box ticked. */
export function ReviewForm({ plans, sources, today }: { plans: Option[]; sources: Option[]; today: string }) {
  const [state, action] = useActionState(addReviewAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  return (
    <form key={state.ok ? state.message : JSON.stringify(state.values ?? {})} action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer's name, as they agreed to be shown" name="name" maxLength={80} autoComplete="off" defaultValue={v.name} error={e.name} small />
        <Field label="Role or business (optional)" name="role" maxLength={80} autoComplete="off" defaultValue={v.role} error={e.role} small />
        <Field label="City (optional)" name="city" maxLength={60} autoComplete="off" defaultValue={v.city} error={e.city} small />
        <Field label="The app (optional)" name="appName" maxLength={80} autoComplete="off" defaultValue={v.appName} error={e.appName} hint="Shown with the name, as the customer agreed." small />
        <Select name="plan" label="Plan (optional, not shown)" options={plans} value={v.plan} error={e.plan} empty="None" />
        <Field label="Their client account (optional, not shown)" name="client" maxLength={191} autoComplete="off" defaultValue={v.client} error={e.client} hint="The account's email or the client's ID." small />
        <Select name="rating" label="Stars" options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} of 5` }))} value={v.rating ?? "5"} error={e.rating} />
        <Field label="The day they gave it" name="reviewedOn" type="date" max={today} defaultValue={v.reviewedOn ?? today} error={e.reviewedOn} small />
        <Select name="lang" label="Written in" options={LANG_OPTIONS} value={v.lang ?? "en"} error={e.lang} />
        <Select name="source" label="Where it was written" options={sources} value={v.source ?? "direct"} error={e.source} />
        <Field
          label="Link to the original review (optional)"
          name="sourceUrl"
          type="url"
          inputMode="url"
          maxLength={500}
          autoComplete="off"
          dir="ltr"
          defaultValue={v.sourceUrl}
          error={e.sourceUrl}
          hint="https:// or http:// only. The card's badge opens it in a new tab."
          small
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-photo" className="text-sm font-semibold">
            Photo (optional)
          </label>
          <input id="f-photo" type="file" name="photo" accept="image/png,image/jpeg,image/webp" className="text-sm" aria-describedby={e.photo ? "f-photo-error f-photo-hint" : "f-photo-hint"} />
          <span id="f-photo-hint" className="text-xs text-muted">
            PNG, JPEG or WebP up to 5 MB, only with the customer&apos;s agreement. Without one, the card shows their initial.
          </span>
          <FieldError id="f-photo-error" error={e.photo} />
        </div>
      </div>
      <TextArea name="text" label="The review, as the customer wrote it" value={v.text} error={e.text} />
      <details className="rounded-xl border border-line-soft p-3">
        <summary className="cursor-pointer text-sm font-semibold">Translations (optional)</summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="m-0 text-[13px] text-muted">Each language page shows its translation; without one, it shows the customer&apos;s own words. The language it was written in is skipped.</p>
          <TextArea name="text_en" label="English" value={v.text_en} error={e.text_en} />
          <TextArea name="text_ar" label="Arabic" value={v.text_ar} error={e.text_ar} dir="rtl" />
          <TextArea name="text_tr" label="Turkish" value={v.text_tr} error={e.text_tr} />
        </div>
      </details>
      <div className="flex flex-col gap-1.5">
        <label className="flex cursor-pointer items-start gap-2 text-[15px] font-semibold">
          <input
            type="checkbox"
            name="consent"
            required
            defaultChecked={v.consent === "on"}
            aria-invalid={e.consent ? true : undefined}
            aria-describedby={e.consent ? "f-consent-error" : undefined}
            className="mt-1 h-4 w-4 accent-midnight"
          />
          This is a real review and the customer agreed to it being shown.
        </label>
        <FieldError id="f-consent-error" error={e.consent} />
      </div>
      <SubmitButton className="h-10 self-start">Add review</SubmitButton>
    </form>
  );
}

/** "Show sample cards until real reviews are added" (on by default). */
export function ReviewsSettingForm({ samples }: { samples: boolean }) {
  const [state, action] = useActionState(saveReviewsSettingAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex cursor-pointer items-start gap-2 text-[15px] font-semibold">
        <input type="checkbox" name="samples" defaultChecked={state.values ? state.values.samples === "on" : samples} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-0.5">
          Show sample cards until real reviews are added
          <span className="text-[13px] font-normal text-muted">
            Each sample card says &ldquo;Sample review&rdquo; on it, names a role instead of a person, and has no rating, score, source badge or link; the section says
            they aren&apos;t real. As soon as one real review is shown, samples are never shown.
          </span>
        </span>
      </label>
      <SubmitButton className="h-10 self-start">Save</SubmitButton>
    </form>
  );
}
