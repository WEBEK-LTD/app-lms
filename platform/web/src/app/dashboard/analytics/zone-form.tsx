"use client";

import { useActionState } from "react";
import { saveAnalyticsZoneAction } from "@/app/actions/analytics";
import { useDashT } from "@/components/dashboard-i18n";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { richText } from "@/i18n/rich";
import { initialFormState } from "@/lib/forms";

/** 47 Analytics › Time zone: the owner's zone, which days are counted in. */
export function ZoneForm({ zone, label, zones, chosen }: { zone: string; label: string; zones: string[]; chosen: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAnalyticsZoneAction, initialFormState);
  return (
    <details className="text-sm" open={Boolean(state.message || state.errors)}>
      <summary className="cursor-pointer">
        {richText(t(chosen ? "analytics.zoneSummary" : "analytics.zoneSummaryCountry", { zone: label }), {
          b: (chunk) => (
            <strong>
              <bdi dir="ltr">{chunk}</bdi>
            </strong>
          ),
        })}
      </summary>
      <form action={action} aria-label={t("analytics.zone")} className="mt-3 flex flex-col gap-3">
        <FormMessage message={state.message} ok={state.ok} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] flex-col gap-1.5">
            <label htmlFor="f-zone" className="text-sm font-semibold">
              {t("analytics.zone")}
            </label>
            <select id="f-zone" name="zone" dir="ltr" defaultValue={state.values?.zone ?? zone} className="input input-sm" aria-describedby="f-zone-hint f-zone-error">
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
            {t("analytics.saveZone")}
          </SubmitButton>
        </div>
        <span id="f-zone-hint" className="text-xs text-muted">
          {t("analytics.zoneHint")}
        </span>
        <FieldError id="f-zone-error" error={state.errors?.zone} />
      </form>
    </details>
  );
}
