"use client";

import { useActionState } from "react";
import { saveAnalyticsZoneAction } from "@/app/actions/analytics";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 47 Analytics › Time zone: the owner's zone, which days are counted in. */
export function ZoneForm({ zone, label, zones, chosen }: { zone: string; label: string; zones: string[]; chosen: boolean }) {
  const [state, action] = useActionState(saveAnalyticsZoneAction, initialFormState);
  return (
    <details className="text-sm" open={Boolean(state.message || state.errors)}>
      <summary className="cursor-pointer">
        Days in <strong>{label}</strong>
        {chosen ? "" : ", from your account's country"} · Change
      </summary>
      <form action={action} aria-label="Time zone" className="mt-3 flex flex-col gap-3">
        <FormMessage message={state.message} ok={state.ok} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] flex-col gap-1.5">
            <label htmlFor="f-zone" className="text-sm font-semibold">
              Time zone
            </label>
            <select id="f-zone" name="zone" defaultValue={state.values?.zone ?? zone} className="input input-sm" aria-describedby="f-zone-hint f-zone-error">
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
            Save time zone
          </SubmitButton>
        </div>
        <span id="f-zone-hint" className="text-xs text-muted">
          Each day runs from midnight to midnight in this zone, on this page and in the CSV. Days already counted keep the zone they were counted in.
        </span>
        <FieldError id="f-zone-error" error={state.errors?.zone} />
      </form>
    </details>
  );
}
