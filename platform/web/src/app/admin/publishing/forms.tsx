"use client";

import { useActionState } from "react";
import { savePublishingTeamNotesAction, updatePublishingTrackAction } from "@/app/actions/admin-publishing";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** One store's status, the note to the client and the store link. */
export function TrackForm({
  appId,
  store,
  storeTitle,
  current,
  statuses,
  disabled,
}: {
  appId: string;
  store: "android" | "ios";
  storeTitle: string;
  current: { status: string; note: string; storeUrl: string };
  statuses: { id: string; label: string }[];
  disabled: boolean;
}) {
  const [state, action] = useActionState(updatePublishingTrackAction, initialFormState);
  const v = { ...current, ...state.values };
  const e = state.errors ?? {};
  const id = `${appId}-${store}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={JSON.stringify(state.values ?? {})}>
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="store" value={store} />
      <fieldset disabled={disabled} className="m-0 flex flex-col gap-3 border-0 p-0">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`status-${id}`} className="text-sm font-semibold">
            {storeTitle} status
          </label>
          <select id={`status-${id}`} name="status" defaultValue={v.status} className="input input-sm" aria-invalid={e.status ? true : undefined}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <FieldError id={`status-${id}-error`} error={e.status} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`note-${id}`} className="text-sm font-semibold">
            {storeTitle} note to the client
          </label>
          <textarea
            id={`note-${id}`}
            name="note"
            rows={3}
            maxLength={2000}
            defaultValue={v.note}
            className="input"
            aria-invalid={e.note ? true : undefined}
            aria-describedby={`note-${id}-hint${e.note ? ` note-${id}-error` : ""}`}
          />
          <span id={`note-${id}-hint`} className="text-xs text-muted">
            Shown on their Publishing page and in the email. Needed when rejected.
          </span>
          <FieldError id={`note-${id}-error`} error={e.note} />
        </div>
        <Field
          id={`url-${id}`}
          label={`${storeTitle} link`}
          name="storeUrl"
          type="url"
          small
          defaultValue={v.storeUrl}
          placeholder={store === "android" ? "https://play.google.com/store/apps/details?id=…" : "https://apps.apple.com/app/…"}
          hint="The app's store page, once it's live."
          error={e.storeUrl}
        />
      </fieldset>
      <FormMessage message={state.message} ok={state.ok} />
      {disabled ? null : (
        <div>
          <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText="Saving…">
            Save {storeTitle}
          </SubmitButton>
        </div>
      )}
    </form>
  );
}

/** The team's own notes, never shown to the client. */
export function TeamNotesForm({ appId, current, disabled }: { appId: string; current: string; disabled: boolean }) {
  const [state, action] = useActionState(savePublishingTeamNotesAction, initialFormState);
  const value = state.values?.teamNotes ?? current;
  return (
    <form action={action} className="flex flex-col gap-2" key={value}>
      <input type="hidden" name="appId" value={appId} />
      <label htmlFor={`notes-${appId}`} className="text-sm font-semibold">
        Team notes (only the team sees these)
      </label>
      <textarea id={`notes-${appId}`} name="teamNotes" rows={3} maxLength={5000} defaultValue={value} disabled={disabled} className="input" />
      <FieldError id={`notes-${appId}-error`} error={state.errors?.teamNotes} />
      <FormMessage message={state.message} ok={state.ok} />
      {disabled ? null : (
        <div>
          <SubmitButton variant="secondary" className="h-9 px-3 text-sm" pendingText="Saving…">
            Save notes
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
