"use client";

/* eslint-disable @next/next/no-img-element -- the campaign's pictures, served by our own asset route */
import { useActionState, type ReactNode } from "react";
import { saveCampaignAction, saveDonationSettingsAction, sendCampaignUpdateAction } from "@/app/actions/donations";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

export interface CampaignFormValues {
  id: number | null;
  title: string;
  summary: string;
  story: string;
  goal: string;
  presets: string;
  min: string;
  allowCustom: boolean;
  endsAt: string;
  images: { id: string; url: string }[];
  /** A draft: the form offers Save as draft and Publish. */
  draft: boolean;
}

function Check({ name, label, hint, defaultChecked, value }: { name: string; label: string; hint?: string; defaultChecked: boolean; value?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-4 border-0 border-t border-line-soft p-0 pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-[17px] font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function TextArea({ name, label, rows, max, value, hint, error }: { name: string; label: string; rows: number; max: number; value: string; hint?: string; error?: string }) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={max}
        defaultValue={value}
        className="input min-h-20 py-3"
        aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
      />
      {hint ? (
        <span id={`${id}-hint`} className="text-[13px] text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** 29 Adding or editing a campaign. A new one is saved as a draft or published. */
export function CampaignForm({
  campaign,
  currency,
  limits,
}: {
  campaign: CampaignFormValues;
  currency: string;
  limits: { title: number; summary: number; story: number; images: number; imageMb: number };
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveCampaignAction, initialFormState);
  const v = (key: Exclude<keyof CampaignFormValues, "id" | "images" | "draft" | "allowCustom">) => state.values?.[key] ?? campaign[key];
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {campaign.id !== null ? <input type="hidden" name="id" value={campaign.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />

      <Group title={t("donations.campaign")}>
        <Field label={t("common.title")} name="title" required maxLength={limits.title} defaultValue={v("title")} error={e.title} />
        <TextArea
          name="story"
          label={t("donations.story")}
          rows={12}
          max={limits.story}
          value={v("story")}
          hint={t("donations.storyHint")}
          error={e.story}
        />
        <TextArea
          name="summary"
          label={t("articles.summary")}
          rows={3}
          max={limits.summary}
          value={v("summary")}
          hint={t("donations.summaryHint")}
          error={e.summary}
        />
      </Group>

      <Group title={t("donations.goalAmounts")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("donations.goal", { currency })} name="goal" inputMode="decimal" defaultValue={v("goal")} hint={t("donations.goalHint")} error={e.goal} />
          <Field label={t("donations.min", { currency })} name="min" inputMode="decimal" defaultValue={v("min")} error={e.min} />
        </div>
        <Field
          label={t("donations.presets", { currency })}
          name="presets"
          defaultValue={v("presets")}
          placeholder="150, 300, 600, 1200"
          hint={t("donations.presetsHint")}
          error={e.presets}
        />
        <Check
          name="allowCustom"
          label={t("donations.allowCustom")}
          defaultChecked={state.values ? state.values.allowCustom === "on" : campaign.allowCustom}
        />
        <Field label={t("donations.endsOn")} name="endsAt" type="date" defaultValue={v("endsAt")} hint={t("donations.endsOnHint")} error={e.endsAt} />
      </Group>

      <Group title={t("events.pictures")}>
        {campaign.images.length ? (
          <div className="flex flex-wrap gap-4">
            {campaign.images.map((img, i) => (
              <div key={img.id} className="flex flex-col items-start gap-2">
                <img src={img.url} alt={t("events.pictureN", { n: i + 1 })} className="h-24 w-40 rounded-lg border border-line object-cover" />
                <Check name="removeImage" value={img.id} label={t("common.remove")} defaultChecked={false} />
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-images" className="text-sm font-semibold">
            {t("events.addPictures")}
          </label>
          <input
            id="f-images"
            type="file"
            name="images"
            multiple
            accept="image/png,image/jpeg"
            className="text-sm"
            aria-describedby="f-images-hint"
            aria-invalid={e.images ? true : undefined}
          />
          <span id="f-images-hint" className="text-[13px] text-muted">
            {t("donations.picturesHint", { size: limits.imageMb, max: limits.images })}
          </span>
          <FieldError id="f-images-error" error={e.images} />
        </div>
      </Group>

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        {campaign.draft ? (
          <>
            <SubmitButton variant="secondary" className="h-11" name="intent" value="draft" pendingText={t("common.saving")}>
              {t("events.saveDraft")}
            </SubmitButton>
            <SubmitButton className="h-11" name="intent" value="publish" pendingText={t("events.publishing")}>
              {t("donations.publish")}
            </SubmitButton>
          </>
        ) : (
          <SubmitButton className="h-11" pendingText={t("common.saving")}>
            {t("donations.saveCampaign")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

/** 29 The currency and how the iPhone app takes donations. */
export function DonationSettingsForm({
  settings,
  currencies,
  currencyLocked,
}: {
  settings: { currency: string; iosMode: "browser" | "off" };
  currencies: readonly string[];
  currencyLocked: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveDonationSettingsAction, initialFormState);
  const value = (key: "currency" | "iosMode") => state.values?.[key] ?? settings[key];
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-currency" className="text-sm font-semibold">
          {t("shop.currency")}
        </label>
        <select id="f-currency" name="currency" defaultValue={value("currency")} className="input max-w-[200px]" aria-describedby="f-currency-hint">
          {currencies.map((c) => (
            <option key={c} value={c} disabled={currencyLocked && c !== settings.currency}>
              {c}
            </option>
          ))}
        </select>
        <span id="f-currency-hint" className="text-[13px] text-muted">
          {currencyLocked ? t("donations.currencyLocked") : t("donations.currencyHint")}
        </span>
        <FieldError id="f-currency-error" error={state.errors?.currency} />
      </div>
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("donations.onIphone")}</legend>
        {(
          [
            ["browser", t("donations.iosBrowser"), t("donations.iosBrowserHint")],
            ["off", t("donations.iosOff"), t("donations.iosOffHint")],
          ] as const
        ).map(([id, label, hint]) => (
          <label key={id} className="flex cursor-pointer items-start gap-3">
            <input type="radio" name="iosMode" value={id} defaultChecked={value("iosMode") === id} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{label}</span>
              <span className="text-[13px] text-muted">{hint}</span>
            </span>
          </label>
        ))}
        <FieldError id="f-iosMode-error" error={state.errors?.iosMode} />
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 29 An update to the people who gave to the campaign. */
export function CampaignUpdateForm({ campaignId, limits, push }: { campaignId: number; limits: { title: number; body: number }; push: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(sendCampaignUpdateAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={state.ok ? state.message : "update"}>
      <input type="hidden" name="id" value={campaignId} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={t("common.title")}
        name="title"
        maxLength={limits.title}
        defaultValue={state.ok ? "" : (state.values?.title ?? "")}
        placeholder={t("donations.updateTitlePlaceholder")}
        error={state.errors?.title}
      />
      <TextArea
        name="body"
        label={t("donations.update")}
        rows={3}
        max={limits.body}
        value={state.ok ? "" : (state.values?.body ?? "")}
        hint={push ? t("donations.updateHintPush") : t("donations.updateHintInbox")}
        error={state.errors?.body}
      />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.sending")}>
          {t("donations.sendToDonors")}
        </SubmitButton>
      </div>
    </form>
  );
}
