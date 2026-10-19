"use client";

import { useActionState, useState } from "react";
import { saveSiteContentAction } from "@/app/actions/admin-content";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Markdown } from "@/components/markdown";
import { fillValues } from "@/lib/content/markdown";
import type { ContentField } from "@/lib/content/site";
import { initialFormState } from "@/lib/forms";

/**
 * A page's texts; Markdown fields show a live preview next to the text.
 * 55 `lang` edits the Arabic or Turkish version: empty fields are allowed
 * (the page shows the built-in translation, else the English text) and
 * `placeholders` shows the English beside each field.
 */
export function ContentForm({
  pageKey,
  fields,
  values,
  previewValues,
  lang,
  placeholders = {},
}: {
  pageKey: string;
  lang?: "ar" | "tr";
  placeholders?: Record<string, string>;
  fields: ContentField[];
  values: Record<string, string>;
  /** Filled in the preview, like the contact details on legal pages. */
  previewValues: Record<string, string>;
}) {
  const [state, action] = useActionState(saveSiteContentAction, initialFormState);
  // Markdown fields are controlled, for the preview (and so a failed save keeps the text).
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.filter((f) => f.kind === "markdown").map((f) => [f.name, values[f.name] ?? ""])),
  );
  const v = (name: string) => state.values?.[name] ?? values[name] ?? "";
  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="key" value={pageKey} />
      {lang ? <input type="hidden" name="lang" value={lang} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      {fields.map((field) => {
        const id = `f-${field.name}`;
        const error = state.errors?.[field.name];
        if (field.kind === "line") {
          return (
            <Field
              key={field.name}
              label={field.label}
              name={field.name}
              maxLength={field.max}
              defaultValue={v(field.name)}
              hint={field.hint}
              error={error}
              dir={lang ? "auto" : undefined}
              placeholder={placeholders[field.name]}
            />
          );
        }
        if (field.kind === "text") {
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-sm font-semibold">
                {field.label}
              </label>
              <textarea
                id={id}
                name={field.name}
                rows={3}
                maxLength={field.max}
                defaultValue={v(field.name)}
                dir={lang ? "auto" : undefined}
                placeholder={placeholders[field.name]}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className="input min-h-20 py-3"
              />
              {field.hint ? <span className="text-xs text-muted">{field.hint}</span> : null}
              <FieldError id={`${id}-error`} error={error} />
            </div>
          );
        }
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-semibold">
              {field.label}
            </label>
            {field.hint ? (
              <span id={`${id}-hint`} className="text-xs leading-normal text-muted">
                {field.hint}
              </span>
            ) : null}
            <div className="grid gap-4 xl:grid-cols-2">
              <textarea
                id={id}
                name={field.name}
                rows={24}
                value={drafts[field.name] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [field.name]: e.target.value }))}
                dir={lang ? "auto" : undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={[field.hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
                className="input min-h-80 py-3 font-mono text-[13px] leading-relaxed"
              />
              <section
                aria-label={`Preview of ${field.label.toLowerCase()}`}
                dir={lang === "ar" ? "rtl" : undefined}
                lang={lang}
                className="flex max-h-[640px] flex-col gap-3 overflow-y-auto rounded-xl border border-line bg-white p-5 text-[15px] leading-relaxed text-ink-2 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:m-0 [&_h3]:font-bold [&_ol]:m-0 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5"
              >
                <span className="text-xs font-bold tracking-[1px] text-muted">PREVIEW</span>
                <Markdown source={fillValues(drafts[field.name] ?? "", previewValues)} />
              </section>
            </div>
            <FieldError id={`${id}-error`} error={error} />
          </div>
        );
      })}
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save and publish
        </SubmitButton>
      </div>
    </form>
  );
}
