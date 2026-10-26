"use client";

import { useActionState } from "react";
import { rebuildBuildAction, retryBuildAction, saveVersionsAction, startBuildAction } from "@/app/actions/dashboard";
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

/** 87.3 "Rebuild as it was": a ready build again, from its app code, config and listing. */
export function RebuildForm({ buildId, number }: { buildId: string; number: number }) {
  const t = useDashT();
  const [state, action] = useActionState(rebuildBuildAction, initialFormState);
  return (
    <form action={action} className="mt-1 flex flex-col items-start gap-1">
      <input type="hidden" name="buildId" value={buildId} />
      <SubmitButton variant="secondary" className="h-8 px-2.5 text-xs" pendingText={t("builds.starting")} aria-label={t("builds.rebuildLabel", { number })}>
        <Icon name="refresh" size={16} />
        {t("builds.rebuild")}
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

/** 89.1 The minimum and recommended versions of the app. */
export function VersionsForm({ current }: { current: { minVersion: string; recommendedVersion: string } }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(saveVersionsAction, initialFormState);
  const value = (key: keyof typeof current) => state.values?.[key] ?? current[key];
  const field = (name: keyof typeof current, label: string, hint: string) => {
    const error = state.errors?.[name];
    return (
      <div className="flex min-w-0 flex-col gap-1 [flex:1_1_220px]">
        <label htmlFor={`f-${name}`} className="text-sm font-semibold">
          {label}
        </label>
        <input
          id={`f-${name}`}
          name={name}
          defaultValue={value(name)}
          inputMode="decimal"
          placeholder="1.4.0"
          className="input input-sm max-w-[160px]"
          dir="ltr"
          aria-invalid={error ? true : undefined}
          aria-describedby={`f-${name}-hint${error ? ` f-${name}-error` : ""}`}
        />
        <span id={`f-${name}-hint`} className="text-xs text-muted">
          {hint}
        </span>
        {error ? (
          <span id={`f-${name}-error`} className="text-[13px] font-semibold text-danger">
            {known(error)}
          </span>
        ) : null}
      </div>
    );
  };
  return (
    <form action={action} noValidate className="flex flex-col gap-3" aria-label={t("builds.versionsTitle")}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-wrap gap-4">
        {field("minVersion", t("builds.minVersion"), t("builds.minVersionHint"))}
        {field("recommendedVersion", t("builds.recommendedVersion"), t("builds.recommendedVersionHint"))}
      </div>
      <div>
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("builds.saveVersions")}
        </SubmitButton>
      </div>
    </form>
  );
}
