"use client";

import { useActionState } from "react";
import { retryBuildAction, startBuildAction } from "@/app/actions/dashboard";
import { FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";

export function StartBuildForm({ suggestedVersion, disabledReason }: { suggestedVersion: string; disabledReason: string | null }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(startBuildAction, initialFormState);
  const error = state.errors?.versionName;
  return (
    <form action={action} noValidate className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label htmlFor="f-versionName" className="text-[13px] font-semibold text-muted">
            {t("builds.appVersion")}
          </label>
          <input
            id="f-versionName"
            name="versionName"
            defaultValue={state.values?.versionName ?? suggestedVersion}
            inputMode="decimal"
            pattern="\d+\.\d+\.\d+"
            className="input input-sm w-[110px]"
            dir="ltr"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "f-versionName-error" : undefined}
          />
        </div>
        <SubmitButton className="h-11" pendingText={t("builds.starting")} disabled={Boolean(disabledReason)} describedBy={disabledReason ? "start-build-hint" : undefined}>
          {t("builds.startNew")}
        </SubmitButton>
      </div>
      {error ? (
        <span id="f-versionName-error" className="text-[13px] font-semibold text-danger">
          {known(error)}
        </span>
      ) : null}
      {disabledReason ? <span id="start-build-hint" className="max-w-[360px] text-[13px] text-muted sm:text-end">
          {disabledReason}
        </span> : null}
      <div className="sm:max-w-[420px]">
        <FormMessage message={state.message} ok={state.ok} />
      </div>
    </form>
  );
}

/** "Try again": the same app version as the build that didn't finish (nothing of it was published). */
export function RetryBuildForm({ versionName }: { versionName: string }) {
  const t = useDashT();
  const [state, action] = useActionState(retryBuildAction, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="versionName" value={versionName} />
      <SubmitButton variant="secondary" className="h-[42px]" pendingText={t("builds.starting")}>
        <Icon name="refresh" size={20} />
        {t("builds.tryAgain")}
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}
