"use client";

import { useActionState } from "react";
import { saveAppHealthAction } from "@/app/actions/app-links";
import { FormMessage, SubmitButton } from "@/components/form";
import { KitSettingRow, KitSettings, KitStatus } from "@/components/studio-page";
import { KitFormSwitch } from "@/components/studio-page/switch";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

/**
 * 46 The owner's switches: the store's own rating prompt and crash reports.
 * 132.143 Each a settings row, its explanation behind "?"; 132.173 the
 * console's switch at the row's end, saved with the form's button.
 */
export function AppHealthForm({ reviewPrompt, crashReports }: { reviewPrompt: boolean; crashReports: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAppHealthAction, initialFormState);
  const pill = (on: boolean) => <KitStatus tone={on ? "success" : "neutral"}>{on ? t("common.on") : t("common.off")}</KitStatus>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <KitSettings>
        <KitSettingRow
          titleId="h-rating"
          icon="star"
          title={t("health.askRating")}
          status={pill(reviewPrompt)}
          help={t("health.askRatingText")}
          helpLabel={t("studioPage.helpSection")}
          action={<KitFormSwitch name="reviewPrompt" defaultChecked={reviewPrompt} labelledBy="h-rating" />}
        />
        <KitSettingRow
          titleId="h-crash-reports"
          icon="monitoring"
          title={t("health.crashReportsTitle")}
          status={pill(crashReports)}
          help={t("health.crashReportsText")}
          helpLabel={t("studioPage.helpSection")}
          action={
            <>
              {/* The row's name isn't the switch's, so the switch alone answers to "Send crash reports". */}
              <span id="sw-crash-reports" className="sr-only">
                {t("health.crashReports")}
              </span>
              <KitFormSwitch name="crashReports" defaultChecked={crashReports} labelledBy="sw-crash-reports" />
            </>
          }
        />
      </KitSettings>
      <div>
        <SubmitButton variant="secondary" className="h-10">
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
