"use client";

import { useActionState } from "react";
import { addBotPhraseAction, mapBotUnmatchedAction } from "@/app/actions/admin-bot";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export interface Option {
  value: string;
  label: string;
}

/** Adds a phrase to one intent, in a language or dialect. */
export function AddPhraseForm({ intent, label, langs, lang, max }: { intent: string; label: string; langs: Option[]; lang: string; max: number }) {
  const [state, action] = useActionState(addBotPhraseAction, initialFormState);
  const id = `add-${intent.replace(/\W/g, "-")}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2.5">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="intent" value={intent} />
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-lang`} className="text-sm font-semibold">
            Language
          </label>
          <select id={`${id}-lang`} name="lang" className="input input-sm" defaultValue={state.values?.lang || lang}>
            {langs.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[min(260px,100%)] flex-1 flex-col gap-1.5">
          <label htmlFor={`${id}-text`} className="text-sm font-semibold">
            New phrase for {label}
          </label>
          <input
            key={state.ok ? state.message : "typing"}
            id={`${id}-text`}
            name="text"
            dir="auto"
            maxLength={max}
            className="input input-sm"
            defaultValue={state.ok ? "" : (state.values?.text ?? "")}
            aria-invalid={state.errors?.text ? true : undefined}
            aria-describedby={state.errors?.text ? `${id}-text-error` : undefined}
          />
        </div>
        <SubmitButton className="h-10 px-4 text-sm">Add phrase</SubmitButton>
      </div>
      <FieldError id={`${id}-text-error`} error={state.errors?.text} />
    </form>
  );
}

interface Unmatched {
  step: string;
  normalized: string;
  text: string;
}

/** One click: adds what owners typed to the suggested intent, in the suggested language. */
export function MapButton({ row, intent, intentLabel, lang, langLabel }: { row: Unmatched; intent: string; intentLabel: string; lang: string; langLabel: string }) {
  const [state, action] = useActionState(mapBotUnmatchedAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage message={state.message} ok={state.ok} />
      <Hidden row={row} />
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="text" value={row.text} />
      <SubmitButton className="h-9 self-start px-3 text-sm">
        <span>
          Add to {intentLabel}
          <span className="font-normal"> · {langLabel}</span>
        </span>
      </SubmitButton>
    </form>
  );
}

/** Adds what owners typed to any intent of its question, in any language, the text edited first if need be. */
export function MapForm({ row, intents, intent, langs, lang }: { row: Unmatched; intents: Option[]; intent: string | null; langs: Option[]; lang: string }) {
  const [state, action] = useActionState(mapBotUnmatchedAction, initialFormState);
  const id = `map-${row.step}-${Math.abs(hash(row.normalized))}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2.5">
      <FormMessage message={state.message} ok={state.ok} />
      <Hidden row={row} />
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-intent`} className="text-sm font-semibold">
            Intent
          </label>
          <select id={`${id}-intent`} name="intent" className="input input-sm" defaultValue={state.values?.intent ?? intent ?? ""}>
            {intent ? null : <option value="">Choose…</option>}
            {intents.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-lang`} className="text-sm font-semibold">
            Language
          </label>
          <select id={`${id}-lang`} name="lang" className="input input-sm" defaultValue={state.values?.lang ?? lang}>
            {langs.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[min(240px,100%)] flex-1 flex-col gap-1.5">
          <label htmlFor={`${id}-text`} className="text-sm font-semibold">
            Phrase
          </label>
          <input id={`${id}-text`} name="text" dir="auto" maxLength={200} className="input input-sm" defaultValue={state.values?.text ?? row.text} />
        </div>
        <SubmitButton className="h-10 px-4 text-sm">Add to the dictionary</SubmitButton>
      </div>
    </form>
  );
}

function Hidden({ row }: { row: Unmatched }) {
  return (
    <>
      <input type="hidden" name="step" value={row.step} />
      <input type="hidden" name="normalized" value={row.normalized} />
    </>
  );
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}
