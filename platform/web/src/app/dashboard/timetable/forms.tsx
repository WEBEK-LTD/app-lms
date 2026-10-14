"use client";

import { useActionState } from "react";
import { saveClassTemplateAction } from "@/app/actions/classes";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Select({ id, label, name, value, options, error }: { id: string; label: string; name: string; value: string; options: { value: string; label: string }[]; error?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value} className="input input-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

/** 27 A class on the weekly timetable: which class, its coach, the day, the start, how long and how many spots. */
export function ClassTemplateForm({
  current,
  services,
  coaches,
  submit,
}: {
  current: Record<string, string>;
  services: { id: number; name: string; durationMinutes: number }[];
  coaches: { id: number; name: string }[];
  submit: string;
}) {
  const [state, action] = useActionState(saveClassTemplateAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = current.id ?? "new";
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={current.id || !state.ok ? JSON.stringify(v) : state.message}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          id={`class-${key}-service`}
          label="Class"
          name="serviceId"
          value={v.serviceId ?? ""}
          options={[{ value: "", label: "Choose a class" }, ...services.map((s) => ({ value: String(s.id), label: s.name }))]}
          error={e.serviceId}
        />
        <Select
          id={`class-${key}-coach`}
          label="Coach"
          name="staffId"
          value={v.staffId ?? ""}
          options={[{ value: "", label: "Choose a coach" }, ...coaches.map((s) => ({ value: String(s.id), label: s.name }))]}
          error={e.staffId}
        />
        <Select
          id={`class-${key}-day`}
          label="Day"
          name="weekday"
          value={v.weekday ?? "1"}
          options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
          error={e.weekday}
        />
        <Field id={`class-${key}-time`} label="Starts at" name="time" type="time" defaultValue={v.time} error={e.time} small />
        <Field id={`class-${key}-duration`} label="Length (minutes)" name="duration" inputMode="numeric" defaultValue={v.duration} error={e.duration} small />
        <Field id={`class-${key}-capacity`} label="Spots" name="capacity" inputMode="numeric" defaultValue={v.capacity} error={e.capacity} small />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="active" defaultChecked={v.active !== ""} className="h-4 w-4 accent-midnight" />
          On the timetable
        </label>
        <SubmitButton className="h-10" pendingText="Saving…">
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}
