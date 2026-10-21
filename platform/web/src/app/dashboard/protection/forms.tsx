"use client";

import { useActionState } from "react";
import { saveScreenProtectionAction, saveVideoBrandingAction } from "@/app/actions/screen-protection";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

/** 53 What the app protects from screenshots and screen recording. */
export function ScreenProtectionForm({ current, academy, wordpress }: { current: string; academy: boolean; wordpress: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveScreenProtectionAction, initialFormState);
  const value = state.values?.protection ?? current;
  const choices = [
    { value: "off", label: t("health.off"), hint: t("health.offHint") },
    ...(academy ? [{ value: "content", label: t("health.content"), hint: t("health.contentHint") }] : []),
    { value: "app", label: t("health.app"), hint: t("health.appHint") },
    ...(wordpress ? [{ value: "plugin", label: t("health.plugin"), hint: t("health.pluginHint") }] : []),
  ];
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={value}>
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={state.errors?.protection ? "protection-error" : undefined}>
        <legend className="mb-1 text-[15px] font-bold">{t("health.block")}</legend>
        {choices.map((c) => (
          <label key={c.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
            <input type="radio" name="protection" value={c.value} defaultChecked={value === c.value} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col">
              <span className="font-semibold">{c.label}</span>
              <span className="text-sm text-muted">{c.hint}</span>
            </span>
          </label>
        ))}
        <FieldError id="protection-error" error={state.errors?.protection} />
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-11">{t("common.save")}</SubmitButton>
      </div>
    </form>
  );
}

/** 72 Hide the video sites' own players, at the owner's own risk (off by default). */
export function VideoBrandingForm({ hide }: { hide: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveVideoBrandingAction, initialFormState);
  const checked = state.values ? state.values.hideVideoBranding === "on" : hide;
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={String(checked)}>
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" name="hideVideoBranding" defaultChecked={checked} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-col gap-1">
          <span className="text-[15px] font-bold">{t("health.hideBranding")}</span>
          <span className="text-sm leading-relaxed text-ink-4">{t("health.hideBrandingText")}</span>
        </span>
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-11">{t("common.save")}</SubmitButton>
      </div>
    </form>
  );
}
