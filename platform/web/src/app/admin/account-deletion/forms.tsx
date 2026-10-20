"use client";

import { useActionState } from "react";
import { closeAccountDeletionAction } from "@/app/actions/admin-account-deletion";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 66 Marking a request done (after deleting the account by hand) or cancelling it, with a note for the team. */
export function CloseDeletionForm({ id }: { id: string }) {
  const [state, action] = useActionState(closeAccountDeletionAction, initialFormState);
  return (
    <form action={action} noValidate className="flex max-w-[640px] flex-col gap-3 border-t border-line-soft pt-4">
      <input type="hidden" name="id" value={id} />
      <FormMessage message={state.message} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`note-${id}`} className="text-sm font-semibold">
          Note for the team (optional)
        </label>
        <textarea id={`note-${id}`} name="note" rows={2} maxLength={1000} defaultValue={state.values?.note ?? ""} className="input min-h-[64px] py-2.5" />
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="deleted" className="mt-1" aria-describedby={state.errors?.deleted ? `deleted-${id}-error` : undefined} />
        <span>The account&apos;s database rows and its files are deleted, and the billing records are kept.</span>
      </label>
      <FieldError id={`deleted-${id}-error`} error={state.errors?.deleted} />
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton name="status" value="done" className="h-10 px-4 text-sm">
          Mark done and email them
        </SubmitButton>
        <SubmitButton name="status" value="cancelled" variant="secondary" className="h-10 px-4 text-sm">
          Cancel the request
        </SubmitButton>
      </div>
    </form>
  );
}
