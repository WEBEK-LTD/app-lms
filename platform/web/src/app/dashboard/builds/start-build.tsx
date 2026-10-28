"use client";

import { useActionState } from "react";
import { changeRolloutAction, goBackToBuildAction, rebuildBuildAction, retryBuildAction, saveStagedReleaseAction, saveVersionsAction, startBuildAction } from "@/app/actions/dashboard";
import { FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";

export function StartBuildForm({
  suggestedVersion,
  disabledReason,
  courier = false,
  driver = false,
}: {
  suggestedVersion: string;
  disabledReason: string | null;
  /** 104.6 Starts a build of the delivery company's courier app. */
  courier?: boolean;
  /** 105.2 That second app is a ride company's drivers' app. */
  driver?: boolean;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(startBuildAction, initialFormState);
  const error = state.errors?.versionName;
  const id = courier ? "f-courierVersionName" : "f-versionName";
  const hint = courier ? "start-courier-build-hint" : "start-build-hint";
  return (
    <form action={action} noValidate className={`flex flex-col items-stretch gap-2 ${courier ? "" : "sm:items-end"}`}>
      {courier ? <input type="hidden" name="variant" value="courier" /> : null}
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-[13px] font-semibold text-muted">
            {t("builds.appVersion")}
          </label>
          <input
            id={id}
            name="versionName"
            defaultValue={state.values?.versionName ?? suggestedVersion}
            inputMode="decimal"
            pattern="\d+\.\d+\.\d+"
            className="input input-sm w-[110px]"
            dir="ltr"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <SubmitButton className="h-11" pendingText={t("builds.starting")} disabled={Boolean(disabledReason)} describedBy={disabledReason ? hint : undefined}>
          {t(courier ? (driver ? "builds.driverStart" : "builds.courierStart") : "builds.startNew")}
        </SubmitButton>
      </div>
      {error ? (
        <span id={`${id}-error`} className="text-[13px] font-semibold text-danger">
          {known(error)}
        </span>
      ) : null}
      {disabledReason ? (
        <span id={hint} className={`max-w-[360px] text-[13px] text-muted ${courier ? "" : "sm:text-end"}`}>
          {disabledReason}
        </span>
      ) : null}
      <div className="sm:max-w-[420px]">
        <FormMessage message={state.message} ok={state.ok} />
      </div>
    </form>
  );
}

/** "Try again": the same app version as the build that didn't finish (nothing of it was published). */
export function RetryBuildForm({ versionName, courier = false }: { versionName: string; courier?: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(retryBuildAction, initialFormState);
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="versionName" value={versionName} />
      {courier ? <input type="hidden" name="variant" value="courier" /> : null}
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

/** 89.3 Go back to a build: its settings and pages, and the build made again. */
export function GoBackForm({ buildId, number }: { buildId: string; number: number }) {
  const t = useDashT();
  const [state, action] = useActionState(goBackToBuildAction, initialFormState);
  return (
    <form action={action} className="mt-1 flex flex-col items-start gap-1">
      <input type="hidden" name="buildId" value={buildId} />
      <SubmitButton variant="ghost" className="h-8 px-2.5 text-xs" pendingText={t("builds.starting")} aria-label={t("builds.goBackLabel", { number })}>
        <Icon name="arrow_back" size={16} />
        {t("builds.goBack")}
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

/** 89.2 How updates are released: a first share of Google Play users, Apple's phased release. */
export function StagedReleaseForm({ current, shares }: { current: { androidPercent: string; iosPhased: boolean }; shares: number[] }) {
  const t = useDashT();
  const [state, action] = useActionState(saveStagedReleaseAction, initialFormState);
  const error = state.errors?.androidPercent;
  const known = useKnownText();
  return (
    <form action={action} noValidate className="flex flex-col gap-3" aria-label={t("builds.stagedTitle")}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="f-androidPercent" className="text-sm font-semibold">
          {t("builds.stagedAndroid")}
        </label>
        <select id="f-androidPercent" name="androidPercent" defaultValue={state.values?.androidPercent ?? current.androidPercent} className="input input-sm max-w-[320px]" aria-describedby="f-androidPercent-hint">
          <option value="">{t("builds.stagedAndroidOff")}</option>
          {shares.map((share) => (
            <option key={share} value={String(share)}>
              {t("builds.stagedAndroidShare", { percent: share })}
            </option>
          ))}
        </select>
        <span id="f-androidPercent-hint" className="text-xs text-muted">
          {t("builds.stagedAndroidHint")}
        </span>
        {error ? <span className="text-[13px] font-semibold text-danger">{known(error)}</span> : null}
      </div>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="iosPhased" defaultChecked={current.iosPhased} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{t("builds.stagedIos")}</span>
          <span className="text-xs text-muted">{t("builds.stagedIosHint")}</span>
        </span>
      </label>
      <div>
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("builds.stagedSave")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 89.2 The buttons for the release in progress on one store. */
export function RolloutButtons({ store, actions }: { store: "android" | "ios"; actions: { action: "continue" | "stop" | "resume" | "complete"; label: string }[] }) {
  const t = useDashT();
  const [state, action] = useActionState(changeRolloutAction, initialFormState);
  return (
    <div className="flex flex-col gap-2">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-wrap gap-2">
        {actions.map((item) => (
          <form key={item.action} action={action}>
            <input type="hidden" name="store" value={store} />
            <input type="hidden" name="action" value={item.action} />
            <SubmitButton variant={item.action === "stop" ? "secondary" : "primary"} className="h-10" pendingText={t("common.saving")}>
              {item.label}
            </SubmitButton>
          </form>
        ))}
      </div>
    </div>
  );
}
