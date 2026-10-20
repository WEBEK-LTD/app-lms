"use client";

import { useActionState, useState } from "react";
import { editScheduledNotificationAction, saveServiceAccountAction, sendNotificationAction } from "@/app/actions/notifications";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";

export function SendNotificationForm({ titleMax, bodyMax, zone, today }: { titleMax: number; bodyMax: number; zone: string; today: string }) {
  const t = useDashT();
  const [state, action] = useActionState(sendNotificationAction, initialFormState);
  // 61 Now, or later at a date and time in the app's time zone.
  const [later, setLater] = useState(false);
  const keep = (name: string) => (state.ok ? "" : state.values?.[name]);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field label={t("notify.titleLabel")} name="title" required maxLength={titleMax} defaultValue={keep("title")} placeholder={t("notify.titlePlaceholder")} error={state.errors?.title} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-body" className="text-sm font-semibold">
          {t("notify.message")}
        </label>
        <textarea
          id="f-body"
          name="body"
          required
          rows={3}
          maxLength={bodyMax}
          defaultValue={keep("body")}
          className="input min-h-24 py-3"
          aria-invalid={state.errors?.body ? true : undefined}
          aria-describedby={state.errors?.body ? "f-body-error" : "f-body-hint"}
        />
        <span id="f-body-hint" className="text-[13px] text-muted">
          {t("notify.messageHint", { max: bodyMax })}
        </span>
        <FieldError id="f-body-error" error={state.errors?.body} />
      </div>
      <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
        <legend className="mb-1.5 p-0 text-sm font-semibold">{t("notify.when")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <label className="flex min-h-11 items-center gap-2 text-[15px]">
            <input type="radio" name="when" value="now" checked={!later} onChange={() => setLater(false)} className="size-5" />
            {t("notify.now")}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-[15px]">
            <input type="radio" name="when" value="later" checked={later} onChange={() => setLater(true)} className="size-5" />
            {t("notify.later")}
          </label>
        </div>
        {later ? <WhenFields zone={zone} today={today} values={state.ok ? undefined : state.values} error={state.errors?.send_at} /> : null}
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={later ? t("common.saving") : t("common.sending")}>
          {later ? t("notify.schedule") : t("notify.sendToEveryone")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 61 The date and time a notification goes out, in the app's time zone. */
function WhenFields({ zone, today, values, error, idPrefix = "f" }: { zone: string; today: string; values?: Record<string, string>; error?: string; idPrefix?: string }) {
  const t = useDashT();
  const describedBy = error ? `${idPrefix}-when-hint ${idPrefix}-when-error` : `${idPrefix}-when-hint`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-3">
        <Field id={`${idPrefix}-date`} label={t("notify.date")} name="date" type="date" min={today} required defaultValue={values?.date ?? today} className="min-w-40 flex-1" aria-describedby={describedBy} aria-invalid={error ? true : undefined} />
        <Field id={`${idPrefix}-time`} label={t("notify.time")} name="time" type="time" required defaultValue={values?.time ?? ""} className="min-w-32 flex-1" aria-describedby={describedBy} aria-invalid={error ? true : undefined} />
      </div>
      <span id={`${idPrefix}-when-hint`} className="text-[13px] text-muted">
        {t("notify.zoneHint", { zone })}
      </span>
      <FieldError id={`${idPrefix}-when-error`} error={error} />
    </div>
  );
}

/** 61 Changing one that waits: its words, date and time. */
export function EditScheduledForm({
  item,
  titleMax,
  bodyMax,
  zone,
  today,
}: {
  item: { id: number; title: string; body: string; date: string; time: string };
  titleMax: number;
  bodyMax: number;
  zone: string;
  today: string;
}) {
  const t = useDashT();
  const [state, action] = useActionState(editScheduledNotificationAction, initialFormState);
  const values = state.values ?? { title: item.title, body: item.body, date: item.date, time: item.time };
  const p = `s${item.id}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3 pt-3">
      <input type="hidden" name="id" value={item.id} />
      <FormMessage message={state.message} ok={state.ok} />
      <Field id={`${p}-title`} label={t("notify.titleLabel")} name="title" required maxLength={titleMax} defaultValue={values.title} error={state.errors?.title} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${p}-body`} className="text-sm font-semibold">
          {t("notify.message")}
        </label>
        <textarea
          id={`${p}-body`}
          name="body"
          required
          rows={3}
          maxLength={bodyMax}
          defaultValue={values.body}
          className="input min-h-24 py-3"
          aria-invalid={state.errors?.body ? true : undefined}
          aria-describedby={state.errors?.body ? `${p}-body-error` : undefined}
        />
        <FieldError id={`${p}-body-error`} error={state.errors?.body} />
      </div>
      <WhenFields zone={zone} today={today} values={values} error={state.errors?.send_at} idPrefix={p} />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10">
          {t("notify.saveChanges")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ServiceAccountForm() {
  const t = useDashT();
  const [state, action] = useActionState(saveServiceAccountAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <Field
        label={t("notify.keyLabel")}
        name="serviceAccount"
        type="file"
        accept="application/json,.json"
        required
        hint={t("notify.keyHint")}
        error={state.errors?.serviceAccount}
      />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("notify.saveKey")}
        </SubmitButton>
      </div>
    </form>
  );
}
