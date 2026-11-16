"use client";

import { useActionState, useState } from "react";
import { savePlanExtrasAction } from "@/app/actions/admin-plans";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { btn } from "@/components/ui";
import { initialFormState } from "@/lib/forms";

export interface ExtraLimitValues {
  id: string;
  name: string;
  ar: string;
  tr: string;
  /** The plans that have a value for it. */
  used: string[];
}

/**
 * 133 Admin › Plans › Limits & lifetime: the team's own limits (a name per
 * language; each plan's number is set with its features and limits), and
 * the team's own wording of what "lifetime" covers on the lifetime card.
 */
export function PlanExtrasForm({ limits, note }: { limits: ExtraLimitValues[]; note: { en: string; ar: string; tr: string } }) {
  const [state, action] = useActionState(savePlanExtrasAction, initialFormState);
  const [rows, setRows] = useState(() => [...limits, { id: "", name: "", ar: "", tr: "", used: [] }]);
  const v = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  return (
    <form action={action} noValidate className="flex flex-col gap-5" aria-label="Limits and lifetime">
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 text-base font-bold">Your own limits</legend>
        {rows.map((row, i) => (
          <div key={row.id || `new-${i}`} data-extra-limit={row.id || "new"} className="grid items-start gap-3 rounded-xl border border-line-soft p-3.5 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
            <input type="hidden" name={`id${i}`} value={row.id} />
            <Field id={`limit-${i}-name`} label={row.id ? "Name" : "New limit's name"} name={`name${i}`} maxLength={40} placeholder="Builds per month" defaultValue={v(`name${i}`, row.name)} error={state.errors?.[`name${i}`]} small />
            <Field id={`limit-${i}-ar`} label="In Arabic (optional)" name={`ar${i}`} maxLength={40} dir="rtl" lang="ar" defaultValue={v(`ar${i}`, row.ar)} small />
            <Field id={`limit-${i}-tr`} label="In Turkish (optional)" name={`tr${i}`} maxLength={40} lang="tr" defaultValue={v(`tr${i}`, row.tr)} small />
            {row.id ? (
              <label className="flex h-10 cursor-pointer items-center gap-2 self-end text-sm">
                <input type="checkbox" name={`remove${i}`} className="h-4 w-4 accent-midnight" />
                Remove
              </label>
            ) : (
              <span />
            )}
            {row.used.length ? <span className="text-[12px] text-muted sm:col-span-4">On {row.used.join(", ")}.</span> : null}
          </div>
        ))}
        {rows.length < 20 ? (
          <button type="button" className={`${btn.secondary} h-9 self-start px-3 text-sm`} onClick={() => setRows((r) => [...r, { id: "", name: "", ar: "", tr: "", used: [] }])}>
            Another limit
          </button>
        ) : null}
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-ember/40 bg-peach-soft p-3.5">
        <legend className="px-1 text-base font-bold">What &ldquo;lifetime&rdquo; covers</legend>
        <p className="m-0 text-[13px] text-muted">
          The note on the lifetime card, on the pricing page and the Plan page. Empty: the default note, which says one payment keeps the plan active for as long as
          Yallapp runs the service, covers what the plan includes on the day of payment, and that add-ons, the stores&apos; fees and work outside the plan are separate.
        </p>
        {(
          [
            ["en", "In English", "ltr"],
            ["ar", "In Arabic", "rtl"],
            ["tr", "In Turkish", "ltr"],
          ] as const
        ).map(([lang, label, dir]) => (
          <div key={lang} className="flex flex-col gap-1.5">
            <label htmlFor={`note-${lang}`} className="text-sm font-semibold">
              {label}
            </label>
            <textarea id={`note-${lang}`} name={`note_${lang}`} rows={3} maxLength={600} dir={dir} lang={lang} defaultValue={v(`note_${lang}`, note[lang])} className="input min-h-20 py-3" />
            <FieldError id={`note-${lang}-error`} error={state.errors?.[`note_${lang}`]} />
          </div>
        ))}
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save limits and note
        </SubmitButton>
      </div>
    </form>
  );
}
