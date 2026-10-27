"use client";

import { useActionState, useState } from "react";
import { savePublishingTeamNotesAction, updatePublishingTrackAction } from "@/app/actions/admin-publishing";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import type { PublishingStore } from "@/lib/data/types";
import { initialFormState } from "@/lib/forms";

/** What each store's link looks like (42: the extra stores had the App Store's). */
const LINK_PLACEHOLDER: Record<PublishingStore, string> = {
  android: "https://play.google.com/store/apps/details?id=…",
  ios: "https://apps.apple.com/app/…",
  galaxy: "https://galaxystore.samsung.com/detail/…",
  huawei: "https://appgallery.huawei.com/app/…",
  xiaomi: "https://global.app.mi.com/details?id=…",
};

/** One store's status, the note to the client and the store link: the rejection reason once rejected, the link once live. */
export function TrackForm({
  appId,
  store,
  storeTitle,
  current,
  statuses,
  reasons,
  disabled,
}: {
  appId: string;
  store: PublishingStore;
  storeTitle: string;
  current: { status: string; note: string; storeUrl: string; rejection: string };
  statuses: { id: string; label: string }[];
  /** 88.3 The common reasons a store turns an app down, with their guidelines. */
  reasons: { id: string; label: string }[];
  disabled: boolean;
}) {
  const [state, action] = useActionState(updatePublishingTrackAction, initialFormState);
  const v = { ...current, ...state.values };
  const e = state.errors ?? {};
  const id = `${appId}-${store}`;
  const [status, setStatus] = useState(v.status);
  const showLink = status === "live" || Boolean(v.storeUrl);
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={JSON.stringify(state.values ?? {})}>
      <input type="hidden" name="appId" value={appId} />
      <input type="hidden" name="store" value={store} />
      <fieldset disabled={disabled} className="m-0 grid gap-3 border-0 p-0 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`status-${id}`} className="text-sm font-semibold">
            {storeTitle} status
          </label>
          <select id={`status-${id}`} name="status" value={status} onChange={(event) => setStatus(event.target.value)} className="input input-sm" aria-invalid={e.status ? true : undefined}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <FieldError id={`status-${id}-error`} error={e.status} />
        </div>
        {showLink ? (
          <Field
            id={`url-${id}`}
            label={`${storeTitle} link`}
            name="storeUrl"
            type="url"
            small
            defaultValue={v.storeUrl}
            placeholder={LINK_PLACEHOLDER[store]}
            error={e.storeUrl}
          />
        ) : null}
        {status === "rejected" ? (
          <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
            <label htmlFor={`rejection-${id}`} className="text-sm font-semibold">
              {storeTitle} rejection reason
            </label>
            <select id={`rejection-${id}`} name="rejection" defaultValue={v.rejection} className="input input-sm" aria-describedby={`rejection-${id}-hint`} aria-invalid={e.rejection ? true : undefined}>
              <option value="">Choose the reason</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <span id={`rejection-${id}-hint`} className="text-xs text-muted">
              The client sees what it means, what to do and where, in their language. Without a reason, say why in the note.
            </span>
            <FieldError id={`rejection-${id}-error`} error={e.rejection} />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={`note-${id}`} className="text-sm font-semibold">
            {storeTitle} note to the client
          </label>
          <textarea
            id={`note-${id}`}
            name="note"
            rows={2}
            maxLength={2000}
            defaultValue={v.note}
            className="input min-h-[72px]"
            aria-invalid={e.note ? true : undefined}
            aria-describedby={e.note ? `note-${id}-error` : undefined}
          />
          <FieldError id={`note-${id}-error`} error={e.note} />
        </div>
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
