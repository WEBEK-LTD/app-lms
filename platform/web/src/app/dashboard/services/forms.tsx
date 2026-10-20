"use client";

import { useActionState } from "react";
import {
  addBookingCategoryAction,
  saveBookingRulesAction,
  saveBookingServiceAction,
  saveBookingStaffAction,
  saveIntakeFieldAction,
} from "@/app/actions/bookings";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { INTAKE_TYPE_LABELS, INTAKE_TYPES } from "@/lib/bookings/intake";
import { initialFormState } from "@/lib/forms";
import { useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import { formatDate } from "@/i18n/format";

/** Sunday to Saturday: 1 January 2023 was a Sunday. */
const WEEKDAY_DATES = [0, 1, 2, 3, 4, 5, 6].map((d) => new Date(Date.UTC(2023, 0, 1 + d)));

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-midnight" />
      {label}
    </label>
  );
}

function Select({ label, name, value, options, error }: { label: string; name: string; value: string; options: { value: string; label: string }[]; error?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={value} className="input input-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`f-${name}-error`} error={error} />
    </div>
  );
}

export function RulesForm({ current, timezones }: { current: Record<string, string>; timezones: string[] }) {
  const t = useDashT();
  const [state, action] = useActionState(saveBookingRulesAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label={t("shop.timeZone")} name="timezone" value={v.timezone ?? ""} options={timezones.map((t) => ({ value: t, label: t }))} error={e.timezone} />
        <Select label={t("shop.currency")} name="currency" value={v.currency ?? "TRY"} options={CATALOG_CURRENCIES.map((c) => ({ value: c, label: c }))} error={e.currency} />
        <Select
          label={t("bookings.slotEvery")}
          name="slotStep"
          value={v.slotStep ?? "30"}
          options={["10", "15", "20", "30", "45", "60"].map((m) => ({ value: m, label: t("bookings.minutesN", { count: m }) }))}
          error={e.slotStep}
        />
        <Field label={t("bookings.minHours")} name="minHoursAhead" inputMode="numeric" defaultValue={v.minHoursAhead} error={e.minHoursAhead} small />
        <Field label={t("bookings.maxDays")} name="maxDaysAhead" inputMode="numeric" defaultValue={v.maxDaysAhead} error={e.maxDaysAhead} small />
        <Field
          label={t("bookings.cancelHours")}
          name="cancelHours"
          inputMode="numeric"
          defaultValue={v.cancelHours}
          hint={t("bookings.cancelHint")}
          error={e.cancelHours}
          small
        />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check name="autoApprove" label={t("bookings.autoApprove")} checked={v.autoApprove === "on"} />
        <Check name="notes" label={t("bookings.notes")} checked={v.notes === "on"} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("bookings.saveRules")}
        </SubmitButton>
      </div>
    </form>
  );
}

export function CategoryForm() {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(addBookingCategoryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3" key={state.ok ? state.message : "form"}>
      <Field label={t("shop.newCategory")} name="name" defaultValue={state.values?.name} error={state.errors?.name} className="min-w-[200px] flex-1" small />
      <SubmitButton variant="secondary" className="h-11">
        {t("common.add")}
      </SubmitButton>
      {state.ok && state.message ? <span className="basis-full text-sm text-success">{known(state.message)}</span> : null}
    </form>
  );
}

export function ServiceForm({
  current,
  categories,
  submit,
}: {
  current: Record<string, string>;
  categories: { id: number; name: string }[];
  submit: string;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveBookingServiceAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("bookings.serviceName")} name="name" defaultValue={v.name} error={e.name} small />
        <Select
          label={t("events.category")}
          name="categoryId"
          value={v.categoryId ?? ""}
          options={[{ value: "", label: t("bookings.noCategory") }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
          error={e.categoryId}
        />
        <Field label={t("bookings.duration")} name="duration" inputMode="numeric" defaultValue={v.duration} error={e.duration} small />
        <Field label={t("common.price")} name="price" inputMode="decimal" defaultValue={v.price} hint={t("bookings.priceHint")} error={e.price} small />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`f-description-${current.id ?? "new"}`} className="text-sm font-semibold">
          {t("common.description")}
        </label>
        <textarea id={`f-description-${current.id ?? "new"}`} name="description" rows={3} defaultValue={v.description} className="input min-h-[84px] py-2.5" />
        <FieldError id="f-description-error" error={e.description} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <Field label={t("bookings.colour")} name="color" placeholder="#1D6B48" dir="ltr" defaultValue={v.color} error={e.color} className="w-[140px]" small />
          <Check name="active" label={t("bookings.bookable")} checked={v.active !== ""} />
        </div>
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

export function StaffForm({
  current,
  services,
  submit,
  clinic = false,
}: {
  current: Record<string, string>;
  services: { id: number; name: string }[];
  submit: string;
  /** 21 A clinic: a doctor's examples. */
  clinic?: boolean;
}) {
  const t = useDashT();
  const lang = useDashLang();
  const kind = clinic ? "clinic" : "other";
  const weekdays = WEEKDAY_DATES.map((date) => formatDate(lang, date, { weekday: "long", timeZone: "UTC" }));
  const [state, action] = useActionState(saveBookingStaffAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const chosen = new Set((v.serviceIds ?? "").split(",").filter(Boolean).map(Number));
  const key = current.id ? `staff-${current.id}` : "staff-new";
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} name="name" id={`${key}-name`} defaultValue={v.name} error={e.name} small />
        <Field label={t("bookings.role")} name="title" id={`${key}-title`} placeholder={t("bookings.rolePlaceholder", { kind })} defaultValue={v.title} error={e.title} small />
        {/* 21 Their profile in the app. */}
        <Field
          label={t("bookings.specialties")}
          name="specialties"
          id={`${key}-specialties`}
          placeholder={t("bookings.specialtiesPlaceholder", { kind })}
          hint={t("bookings.commasHint")}
          defaultValue={v.specialties}
          error={e.specialties}
          small
        />
        <Field
          label={t("bookings.languages")}
          name="languages"
          id={`${key}-languages`}
          placeholder={t("bookings.languagesPlaceholder")}
          hint={t("bookings.commasHint")}
          defaultValue={v.languages}
          error={e.languages}
          small
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${key}-bio`} className="text-sm font-semibold">
          {t("bookings.about")}
        </label>
        <textarea id={`${key}-bio`} name="bio" rows={3} defaultValue={v.bio} className="input min-h-[84px] py-2.5" />
        <span className="text-[13px] text-muted">{t("bookings.aboutHint")}</span>
        <FieldError id={`${key}-bio-error`} error={e.bio} />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("bookings.providesServices")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {services.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={chosen.has(s.id)} className="h-4 w-4 accent-midnight" />
              {s.name}
            </label>
          ))}
        </div>
        <FieldError id={`${key}-services-error`} error={e.services} />
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("bookings.workingHours")}</legend>
        {weekdays.map((day, d) => (
          <div key={d} className="flex flex-wrap items-center gap-3 text-[15px]">
            <label className="flex w-[130px] cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name={`open${d}`}
                defaultChecked={v[`open${d}`] === "on"}
                className="h-4 w-4 accent-midnight"
                aria-label={t("bookings.worksOn", { day })}
              />
              {day}
            </label>
            <input type="time" name={`start${d}`} defaultValue={v[`start${d}`] || "09:00"} aria-label={t("bookings.dayFrom", { day })} className="input input-sm w-[120px]" />
            <span className="text-muted">{t("shop.to")}</span>
            <input type="time" name={`end${d}`} defaultValue={v[`end${d}`] || "17:00"} aria-label={t("bookings.dayUntil", { day })} className="input input-sm w-[120px]" />
          </div>
        ))}
        <FieldError id={`${key}-hours-error`} error={e.hours} />
      </fieldset>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${key}-days-off`} className="text-sm font-semibold">
          {t("bookings.daysOff")}
        </label>
        <textarea
          id={`${key}-days-off`}
          name="daysOff"
          rows={2}
          placeholder="2026-12-31"
          dir="ltr"
          defaultValue={v.daysOff}
          className="input min-h-[60px] py-2.5"
        />
        <span className="text-[13px] text-muted">{t("bookings.daysOffHint")}</span>
        <FieldError id={`${key}-days-off-error`} error={e.daysOff} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Check name="active" label={t("bookings.bookableThem")} checked={v.active !== ""} />
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 21 A question of the intake form: what's asked, the kind of answer, its options and whether it must be answered. */
export function IntakeFieldForm({ current, submit }: { current: Record<string, string>; submit: string }) {
  const t = useDashT();
  const known = useKnownText();
  const [state, action] = useActionState(saveIntakeFieldAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = current.id ? `intake-${current.id}` : "intake-new";
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label={t("bookings.question")} name="label" id={`${key}-label`} placeholder={t("bookings.questionPlaceholder")} defaultValue={v.label} error={e.label} small />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${key}-type`} className="text-sm font-semibold">
            {t("bookings.answer")}
          </label>
          <select id={`${key}-type`} name="type" defaultValue={v.type || "text"} className="input input-sm">
            {INTAKE_TYPES.map((type) => (
              <option key={type} value={type}>
                {known(INTAKE_TYPE_LABELS[type])}
              </option>
            ))}
          </select>
          <FieldError id={`${key}-type-error`} error={e.type} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${key}-options`} className="text-sm font-semibold">
          {t("bookings.options")}
        </label>
        <textarea id={`${key}-options`} name="options" rows={3} placeholder={t("bookings.optionsPlaceholder")} defaultValue={v.options} className="input min-h-[72px] py-2.5" />
        <span className="text-[13px] text-muted">{t("bookings.optionsHint")}</span>
        <FieldError id={`${key}-options-error`} error={e.options} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Check name="required" label={t("bookings.mustAnswer")} checked={v.required === "on"} />
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}
