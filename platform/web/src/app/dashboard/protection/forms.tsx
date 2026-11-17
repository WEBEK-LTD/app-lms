"use client";

import { useActionState, useState } from "react";
import { saveScreenProtectionAction, saveVideoBrandingAction } from "@/app/actions/screen-protection";
import { FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

/**
 * 53 What the app protects from screenshots and screen recording.
 * 132.160 The choices side by side as the console's options, what the one
 * chosen does under them, Save at the end.
 */
export function ScreenProtectionForm({ current, academy, wordpress }: { current: string; academy: boolean; wordpress: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveScreenProtectionAction, initialFormState);
  const value = state.values?.protection ?? current;
  const [chosen, setChosen] = useState(value);
  const choices = [
    { value: "off", label: t("health.off"), hint: t("health.offHint") },
    ...(academy ? [{ value: "content", label: t("health.content"), hint: t("health.contentHint") }] : []),
    { value: "app", label: t("health.app"), hint: t("health.appHint") },
    ...(wordpress ? [{ value: "plugin", label: t("health.plugin"), hint: t("health.pluginHint") }] : []),
  ];
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={value}>
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0" aria-describedby={`protection-hint${state.errors?.protection ? " protection-error" : ""}`}>
        <legend className="mb-2 text-[13px] font-bold text-(--sp-muted)">{t("health.block")}</legend>
        <div className="flex flex-wrap gap-2">
          {choices.map((c) => (
            <label
              key={c.value}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-(--sp-line) px-3.5 text-[14px] font-semibold text-(--sp-ink) transition-colors hover:bg-(--sp-soft) has-[:checked]:border-(--sp-ink) has-[:checked]:bg-(--sp-soft)"
            >
              <input type="radio" name="protection" value={c.value} defaultChecked={value === c.value} onChange={() => setChosen(c.value)} className="h-4 w-4 accent-(--sp-ink)" />
              {c.label}
            </label>
          ))}
        </div>
        <p id="protection-hint" className="m-0 text-[13.5px] leading-relaxed text-(--sp-muted)">
          {choices.find((c) => c.value === chosen)?.hint}
        </p>
        <FieldError id="protection-error" error={state.errors?.protection} />
      </fieldset>
      <div className="flex">
        <SubmitButton variant="pill" className="h-10">
          {t("common.save")}
        </SubmitButton>
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
    <form action={action} noValidate className="flex flex-col gap-3" key={String(checked)}>
      <FormMessage message={state.message} ok={state.ok} />
      <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-(--sp-line) px-4 py-3 has-[:checked]:border-(--sp-ink)">
        <input type="checkbox" name="hideVideoBranding" defaultChecked={checked} className="mt-1 h-4 w-4 shrink-0 accent-(--sp-ink)" />
        <span className="flex flex-col gap-1">
          <span className="text-[14.5px] font-bold text-(--sp-ink)">{t("health.hideBranding")}</span>
          <span className="text-[13.5px] leading-relaxed text-(--sp-muted)">{t("health.hideBrandingText")}</span>
        </span>
      </label>
      <div className="flex">
        <SubmitButton variant="pill" className="h-10">
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
