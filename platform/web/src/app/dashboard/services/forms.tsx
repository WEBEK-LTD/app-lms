"use client";

import { useActionState } from "react";
import {
  addBookingCategoryAction,
  saveBookingRulesAction,
  saveBookingServiceAction,
  saveBookingStaffAction,
} from "@/app/actions/bookings";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const [state, action] = useActionState(saveBookingRulesAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select label="Time zone" name="timezone" value={v.timezone ?? ""} options={timezones.map((t) => ({ value: t, label: t }))} error={e.timezone} />
        <Select label="Currency" name="currency" value={v.currency ?? "TRY"} options={["TRY", "USD", "EUR"].map((c) => ({ value: c, label: c }))} error={e.currency} />
        <Select
          label="Times start every"
          name="slotStep"
          value={v.slotStep ?? "30"}
          options={["10", "15", "20", "30", "45", "60"].map((m) => ({ value: m, label: `${m} minutes` }))}
          error={e.slotStep}
        />
        <Field label="Book at least (hours ahead)" name="minHoursAhead" inputMode="numeric" defaultValue={v.minHoursAhead} error={e.minHoursAhead} small />
        <Field label="Book up to (days ahead)" name="maxDaysAhead" inputMode="numeric" defaultValue={v.maxDaysAhead} error={e.maxDaysAhead} small />
        <Field
          label="Cancel up to (hours before)"
          name="cancelHours"
          inputMode="numeric"
          defaultValue={v.cancelHours}
          hint="Empty: customers can't cancel in the app."
          error={e.cancelHours}
          small
        />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check name="autoApprove" label="Approve new appointments at once" checked={v.autoApprove === "on"} />
        <Check name="notes" label="Customers can leave a note" checked={v.notes === "on"} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText="Saving…">
          Save rules
        </SubmitButton>
      </div>
    </form>
  );
}

export function CategoryForm() {
  const [state, action] = useActionState(addBookingCategoryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3" key={state.ok ? state.message : "form"}>
      <Field label="New category" name="name" defaultValue={state.values?.name} error={state.errors?.name} className="min-w-[200px] flex-1" small />
      <SubmitButton variant="secondary" className="h-11">
        Add
      </SubmitButton>
      {state.ok ? <span className="basis-full text-sm text-success">{state.message}</span> : null}
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
  const [state, action] = useActionState(saveBookingServiceAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service name" name="name" defaultValue={v.name} error={e.name} small />
        <Select
          label="Category"
          name="categoryId"
          value={v.categoryId ?? ""}
          options={[{ value: "", label: "No category" }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
          error={e.categoryId}
        />
        <Field label="Duration (minutes)" name="duration" inputMode="numeric" defaultValue={v.duration} error={e.duration} small />
        <Field label="Price" name="price" inputMode="decimal" defaultValue={v.price} hint="Paid at the appointment. Empty for free." error={e.price} small />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`f-description-${current.id ?? "new"}`} className="text-sm font-semibold">
          Description
        </label>
        <textarea id={`f-description-${current.id ?? "new"}`} name="description" rows={3} defaultValue={v.description} className="input min-h-[84px] py-2.5" />
        <FieldError id="f-description-error" error={e.description} />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Colour" name="color" placeholder="#1D6B48" defaultValue={v.color} error={e.color} className="w-[140px]" small />
          <Check name="active" label="Customers can book it" checked={v.active !== ""} />
        </div>
        <SubmitButton className="h-10" pendingText="Saving…">
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
}: {
  current: Record<string, string>;
  services: { id: number; name: string }[];
  submit: string;
}) {
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
        <Field label="Name" name="name" id={`${key}-name`} defaultValue={v.name} error={e.name} small />
        <Field label="Role" name="title" id={`${key}-title`} placeholder="Stylist" defaultValue={v.title} error={e.title} small />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">Services they provide</legend>
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
        <legend className="mb-1.5 text-sm font-semibold">Working hours</legend>
        {WEEKDAYS.map((day, d) => (
          <div key={day} className="flex flex-wrap items-center gap-3 text-[15px]">
            <label className="flex w-[130px] cursor-pointer items-center gap-2">
              <input type="checkbox" name={`open${d}`} defaultChecked={v[`open${d}`] === "on"} className="h-4 w-4 accent-midnight" aria-label={`Works on ${day}`} />
              {day}
            </label>
            <input type="time" name={`start${d}`} defaultValue={v[`start${d}`] || "09:00"} aria-label={`${day} from`} className="input input-sm w-[120px]" />
            <span className="text-muted">to</span>
            <input type="time" name={`end${d}`} defaultValue={v[`end${d}`] || "17:00"} aria-label={`${day} until`} className="input input-sm w-[120px]" />
          </div>
        ))}
        <FieldError id={`${key}-hours-error`} error={e.hours} />
      </fieldset>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${key}-days-off`} className="text-sm font-semibold">
          Days off
        </label>
        <textarea
          id={`${key}-days-off`}
          name="daysOff"
          rows={2}
          placeholder="2026-12-31"
          defaultValue={v.daysOff}
          className="input min-h-[60px] py-2.5"
        />
        <span className="text-[13px] text-muted">One date per line, like 2026-12-31.</span>
        <FieldError id={`${key}-days-off-error`} error={e.daysOff} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Check name="active" label="Customers can book them" checked={v.active !== ""} />
        <SubmitButton className="h-10" pendingText="Saving…">
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}
