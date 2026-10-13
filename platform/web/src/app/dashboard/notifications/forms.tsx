"use client";

import { useActionState } from "react";
import { saveServiceAccountAction, sendNotificationAction } from "@/app/actions/notifications";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export function SendNotificationForm({ titleMax, bodyMax }: { titleMax: number; bodyMax: number }) {
  const [state, action] = useActionState(sendNotificationAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Title"
        name="title"
        required
        maxLength={titleMax}
        defaultValue={state.ok ? "" : state.values?.title}
        placeholder="New arrivals this week"
        error={state.errors?.title}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-body" className="text-sm font-semibold">
          Message
        </label>
        <textarea
          id="f-body"
          name="body"
          required
          rows={3}
          maxLength={bodyMax}
          defaultValue={state.ok ? "" : state.values?.body}
          className="input min-h-24 py-3"
          aria-invalid={state.errors?.body ? true : undefined}
          aria-describedby={state.errors?.body ? "f-body-error" : "f-body-hint"}
        />
        <span id="f-body-hint" className="text-[13px] text-muted">
          Up to {bodyMax} characters. Every customer gets it in their inbox; phones that allow notifications get a push.
        </span>
        <FieldError id="f-body-error" error={state.errors?.body} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-[46px]" pendingText="Sending…">
          Send to everyone
        </SubmitButton>
      </div>
    </form>
  );
}

export function ServiceAccountForm() {
  const [state, action] = useActionState(saveServiceAccountAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label="Firebase service account key (.json)"
        name="serviceAccount"
        type="file"
        accept="application/json,.json"
        required
        hint="Firebase console, Project settings, Service accounts, Generate new private key. It stays encrypted on our servers."
        error={state.errors?.serviceAccount}
      />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
          Save key
        </SubmitButton>
      </div>
    </form>
  );
}
