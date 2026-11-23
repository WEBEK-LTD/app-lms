"use client";

import { useActionState, useState } from "react";
import { saveHouseDesignerAction } from "@/app/actions/admin-market";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";
import { safePhotoUrl } from "@/lib/studio-market/photo-url";

/**
 * 218 Admin › Studio Market › Designers › Yallapp's own page: the photo the
 * page shows now (the uploaded one, or the Yallapp logo), a new one to
 * upload, "Use the Yallapp logo" to remove the uploaded one, and the line
 * about it. Saved, it shows at once (no review).
 */
export function HouseDesignerForm({ photoUrl, uploaded, bio: savedBio, disabled }: { photoUrl: string; uploaded: boolean; bio: string; disabled?: boolean }) {
  const [state, action] = useActionState(saveHouseDesignerAction, initialFormState);
  const [bio, setBio] = useState(savedBio);
  const errors = state.errors ?? {};
  const photo = safePhotoUrl(photoUrl);
  return (
    <form action={action} className="flex flex-col gap-4" data-house-form="">
      <FormMessage message={state.message ?? errors.form} ok={state.ok} />
      <div className="flex flex-wrap items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- The page's photo: the uploaded one at the platform's own asset route, or Yallapp's logo.
          <img src={photo} alt={uploaded ? "Yallapp's page photo" : "The Yallapp logo"} width={84} height={84} className="h-[84px] w-[84px] flex-none rounded-full object-cover" data-house-photo={uploaded ? "uploaded" : "logo"} />
        ) : null}
        <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
          <label htmlFor="house-photo" className="text-sm font-semibold">
            {uploaded ? "Replace the photo" : "Upload a photo"}
          </label>
          <input id="house-photo" name="photo" type="file" accept="image/png,image/jpeg" disabled={disabled} aria-describedby="house-photo-hint" className="text-sm" />
          <span id="house-photo-hint" className="text-xs text-muted">
            PNG or JPEG, up to 2 MB. {uploaded ? "Shown now on the page." : "Until one is uploaded, the page shows the Yallapp logo."}
          </span>
          <FieldError id="house-photo-error" error={errors.photo} />
          {uploaded ? (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="useLogo" disabled={disabled} />
              Use the Yallapp logo (removes the uploaded photo)
            </label>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="house-bio" className="text-sm font-semibold">
          A line about Yallapp
        </label>
        <textarea id="house-bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400} rows={3} disabled={disabled} className="input min-h-[88px] py-3" aria-invalid={errors.bio ? true : undefined} aria-describedby="house-bio-count" />
        <span id="house-bio-count" className="text-xs text-muted">
          {bio.length}/400 · one language: it shows as written on the page in English, Arabic and Turkish.
        </span>
        <FieldError id="house-bio-error" error={errors.bio} />
      </div>
      <div>
        <SubmitButton pendingText="Saving…" disabled={disabled}>
          <Icon name="check_circle" size={18} />
          Save Yallapp&apos;s page
        </SubmitButton>
      </div>
    </form>
  );
}
