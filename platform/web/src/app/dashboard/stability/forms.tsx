"use client";

import { useActionState } from "react";
import { saveAppHealthAction } from "@/app/actions/app-links";
import { FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

/** 46 The owner's switches: the store's own rating prompt and crash reports. */
export function AppHealthForm({ reviewPrompt, crashReports }: { reviewPrompt: boolean; crashReports: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAppHealthAction, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input type="checkbox" name="reviewPrompt" defaultChecked={reviewPrompt} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">{t("health.askRating")}</span>
          <span className="text-sm leading-relaxed text-ink-4">{t("health.askRatingText")}</span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
        <input type="checkbox" name="crashReports" defaultChecked={crashReports} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">{t("health.crashReports")}</span>
          <span className="text-sm leading-relaxed text-ink-4">{t("health.crashReportsText")}</span>
        </span>
      </label>
      <div>
        <SubmitButton className="h-10">{t("common.save")}</SubmitButton>
      </div>
    </form>
  );
}
