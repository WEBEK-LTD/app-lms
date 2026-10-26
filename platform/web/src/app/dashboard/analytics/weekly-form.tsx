"use client";

import { useActionState } from "react";
import { setWeeklySummaryAction } from "@/app/actions/analytics";
import { useDashT } from "@/components/dashboard-i18n";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

/** 86.4 Analytics › Weekly summary by email: on or off for this app. */
export function WeeklyForm({ on }: { on: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(setWeeklySummaryAction, initialFormState);
  return (
    <form action={action} aria-label={t("analytics.weeklyTitle")} className="flex flex-col gap-2 rounded-2xl border border-line bg-white px-4 py-3.5">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold text-midnight">{t("analytics.weeklyTitle")}</span>
          <span className="text-sm text-muted" data-weekly={on ? "on" : "off"}>
            {on ? t("analytics.weeklyOnText") : t("analytics.weeklyOffText")}
          </span>
        </div>
        <input type="hidden" name="weekly" value={on ? "off" : "on"} />
        <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
          {on ? t("analytics.weeklyTurnOff") : t("analytics.weeklyTurnOn")}
        </SubmitButton>
      </div>
    </form>
  );
}
