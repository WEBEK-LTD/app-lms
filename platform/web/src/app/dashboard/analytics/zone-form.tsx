"use client";

import { useActionState } from "react";
import { saveAnalyticsZoneAction } from "@/app/actions/analytics";
import { useDashT } from "@/components/dashboard-i18n";
import { FormMessage, SubmitButton } from "@/components/form";
import { TimeZonePicker } from "@/components/time-zone-picker";
import { richText } from "@/i18n/rich";
import { initialFormState } from "@/lib/forms";

/** 47 Analytics › Time zone: the owner's zone, which days are counted in. */
export function ZoneForm({ zone, label, chosen }: { zone: string; label: string; chosen: boolean }) {
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
          {/* 137 Every time zone: searched by city, zone or offset, the usual ones first. */}
          <TimeZonePicker id="f-zone" name="zone" label={t("analytics.zone")} defaultValue={state.values?.zone ?? zone} hintId="f-zone-hint" error={state.errors?.zone} size="sm" className="min-w-[240px] flex-1" />
          <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
            {t("analytics.saveZone")}
          </SubmitButton>
        </div>
        <span id="f-zone-hint" className="text-xs text-muted">
          {t("analytics.zoneHint")}
        </span>
      </form>
    </details>
  );
}
