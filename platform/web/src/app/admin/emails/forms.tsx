"use client";

import { useActionState, useState } from "react";
import { saveEmailTemplateAction, sendTestTemplateAction } from "@/app/actions/admin-emails";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { placeholderErrors, renderTemplate, type EmailTemplateDefinition } from "@/lib/email/templates";
import { initialFormState } from "@/lib/forms";

/** Subject and body, with a live preview filled with sample values. */
export function TemplateForm({
  template,
  subject,
  body,
  samples,
}: {
  template: EmailTemplateDefinition;
  subject: string;
  body: string;
  samples: Record<string, string>;
}) {
  const [state, action] = useActionState(saveEmailTemplateAction, initialFormState);
  const [draft, setDraft] = useState({ subject, body });
  const preview = renderTemplate(draft, samples);
  const problems = [...new Set([...placeholderErrors(draft.subject, template), ...placeholderErrors(draft.body, template)])];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="key" value={template.key} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Subject"
        name="subject"
        maxLength={200}
        value={draft.subject}
        onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
        error={state.errors?.subject}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-body" className="text-sm font-semibold">
            Text
          </label>
          <textarea
            id="f-body"
            name="body"
            rows={18}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            aria-invalid={state.errors?.body ? true : undefined}
            aria-describedby={state.errors?.body ? "f-body-error" : undefined}
            className="input min-h-72 py-3 font-mono text-[13px] leading-relaxed"
          />
          <FieldError id="f-body-error" error={state.errors?.body} />
          {problems.length ? (
            <span className="text-[13px] font-semibold text-warn" role="status">
              {problems.join(" ")}
            </span>
          ) : null}
        </div>
        <section aria-label="Preview with sample values" className="flex flex-col gap-2 rounded-xl border border-line bg-ivory p-4">
          <span className="text-xs font-bold tracking-[1px] text-muted">PREVIEW WITH SAMPLE VALUES</span>
          <span className="text-[15px] font-bold break-words">{preview.subject}</span>
          <pre className="m-0 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-2">{preview.text}</pre>
        </section>
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save email
        </SubmitButton>
      </div>
    </form>
  );
}

export function TestEmailForm({ templateKey }: { templateKey: string }) {
  const [state, action] = useActionState(sendTestTemplateAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="key" value={templateKey} />
      <FormMessage message={state.message} ok={state.ok} />
      <div>
        <SubmitButton variant="secondary" className="h-10" pendingText="Sending…">
          Send a test to me
        </SubmitButton>
      </div>
    </form>
  );
}
