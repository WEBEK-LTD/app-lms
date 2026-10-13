"use client";

import { useActionState } from "react";
import { replyInquiryAction } from "@/app/actions/listings";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

export function ReplyForm({ id }: { id: number }) {
  const [state, action] = useActionState(replyInquiryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3 border-t border-line-soft pt-4">
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-message" className="text-sm font-semibold">
          Your reply
        </label>
        <textarea
          id="f-message"
          name="message"
          rows={4}
          maxLength={2000}
          defaultValue={state.ok ? "" : state.values?.message}
          className="input min-h-24 py-3"
          aria-invalid={state.errors?.message ? true : undefined}
          aria-describedby={state.errors?.message ? "f-message-error" : "f-message-hint"}
        />
        <span id="f-message-hint" className="text-[13px] text-muted">
          They get it in the app, with a notification on their phone when push is on.
        </span>
        <FieldError id="f-message-error" error={state.errors?.message} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Sending…">
          Send reply
        </SubmitButton>
      </div>
    </form>
  );
}
