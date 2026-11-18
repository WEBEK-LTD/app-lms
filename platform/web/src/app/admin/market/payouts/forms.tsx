"use client";

import { useActionState } from "react";
import { cancelPayoutAction, markPayoutSentAction, reviewPayoutDetailsAction } from "@/app/actions/admin-market-money";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";

/** 106.11 Admin › Studio Market › Payouts: a prepared payout marked sent with the bank's reference and the day it went out. */
export function MarkSentForm({ payoutId, today }: { payoutId: string; today: string }) {
  const [state, action] = useActionState(markPayoutSentAction, initialFormState);
  const e = state.errors ?? {};
  const id = (name: string) => `${name}-${payoutId}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2" data-mark-sent={payoutId}>
      <input type="hidden" name="payout" value={payoutId} />
      <FormMessage message={state.message && !state.ok ? state.message : undefined} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[180px] flex-1 flex-col gap-1">
          <label htmlFor={id("reference")} className="text-xs font-semibold">
            Bank reference
          </label>
          <input id={id("reference")} name="reference" defaultValue={state.values?.reference ?? ""} maxLength={64} className="input h-9 px-2 text-sm" aria-invalid={e.reference ? true : undefined} aria-describedby={e.reference ? id("reference-error") : undefined} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={id("sentOn")} className="text-xs font-semibold">
            Sent on
          </label>
          <input id={id("sentOn")} name="sentOn" type="date" defaultValue={state.values?.sentOn ?? today} max={today} className="input h-9 px-2 text-sm" aria-invalid={e.sentOn ? true : undefined} aria-describedby={e.sentOn ? id("sentOn-error") : undefined} />
        </div>
        <SubmitButton pendingText="Saving…" className="h-9 px-3 text-sm">
          <Icon name="task_alt" size={18} />
          Mark as sent
        </SubmitButton>
      </div>
      <FieldError id={id("reference-error")} error={e.reference} />
      <FieldError id={id("sentOn-error")} error={e.sentOn} />
    </form>
  );
}

/** A prepared payout the bank didn't send: cancelled with why, the amount back in the designer's balance. */
export function CancelPayoutForm({ payoutId }: { payoutId: string }) {
  const [state, action] = useActionState(cancelPayoutAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-danger">Not sent? Cancel it</summary>
      <form action={action} noValidate className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="payout" value={payoutId} />
        <FormMessage message={state.message && !state.ok ? state.message : undefined} />
        <label htmlFor={`note-${payoutId}`} className="text-xs font-semibold">
          Why it wasn't sent
        </label>
        <input id={`note-${payoutId}`} name="note" defaultValue={state.values?.note ?? ""} maxLength={500} className="input h-9 px-2 text-sm" aria-invalid={e.note ? true : undefined} aria-describedby={e.note ? `note-${payoutId}-error` : undefined} />
        <FieldError id={`note-${payoutId}-error`} error={e.note} />
        <div>
          <SubmitButton variant="danger" pendingText="Cancelling…" className="h-9 px-3 text-sm">
            Cancel this payout
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}

/** Admin › Studio Market › Payout checks: approve the designer's checks, or ask for a fix with a note (emailed to them). */
export function DetailsDecisionForm({ designerId, seen }: { designerId: string; seen: string }) {
  const [state, action] = useActionState(reviewPayoutDetailsAction, initialFormState);
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="designer" value={designerId} />
      <input type="hidden" name="seen" value={seen} />
      <FormMessage message={state.message && !state.ok ? state.message : undefined} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="details-note" className="text-sm font-semibold">
          Note to the designer (when asking for a fix)
        </label>
        <textarea id="details-note" name="note" rows={3} maxLength={1000} defaultValue={state.values?.note ?? ""} className="input min-h-[84px] py-2.5" aria-invalid={e.note ? true : undefined} aria-describedby={e.note ? "details-note-error" : undefined} />
        <FieldError id="details-note-error" error={e.note} />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <SubmitButton name="decision" value="approve" pendingFor={{ name: "decision", value: "approve" }} pendingText="Approving…" className="h-11">
          <Icon name="verified_user" size={20} />
          Approve
        </SubmitButton>
        <SubmitButton name="decision" value="fix" variant="secondary" pendingFor={{ name: "decision", value: "fix" }} pendingText="Sending…" className="h-11">
          <Icon name="edit_note" size={20} />
          Ask for a fix
        </SubmitButton>
      </div>
    </form>
  );
}
