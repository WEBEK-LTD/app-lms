"use client";

import { useActionState } from "react";
import { closeAccountDeletionAction } from "@/app/actions/admin-account-deletion";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/**
 * 66 An open request: 73 "Delete now" carries it out at once (the billing
 * records kept, the rows and files deleted, the person emailed), which the
 * daily job does otherwise after the waiting days; or "Cancel the request",
 * with a note for the team.
 */
export function CloseDeletionForm({ id }: { id: string }) {
  const [state, action] = useActionState(closeAccountDeletionAction, initialFormState);
  return (
    <form action={action} noValidate className="flex max-w-[640px] flex-col gap-3 border-t border-line-soft pt-4">
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`note-${id}`} className="text-sm font-semibold">
          Note for the team (optional, when cancelling)
        </label>
        <textarea id={`note-${id}`} name="note" rows={2} maxLength={1000} defaultValue={state.values?.note ?? ""} className="input min-h-[64px] py-2.5" />
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="confirm" className="mt-1" aria-describedby={state.errors?.confirm ? `confirm-${id}-error` : undefined} />
        <span>Delete the account now: its billing records are kept, everything else is deleted, and the person who asked is emailed. This can&apos;t be undone.</span>
      </label>
      <FieldError id={`confirm-${id}-error`} error={state.errors?.confirm} />
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton name="status" value="done" variant="danger" className="h-10 px-4 text-sm">
          Delete now
        </SubmitButton>
        <SubmitButton name="status" value="cancelled" variant="secondary" className="h-10 px-4 text-sm">
          Cancel the request
        </SubmitButton>
      </div>
    </form>
  );
}
