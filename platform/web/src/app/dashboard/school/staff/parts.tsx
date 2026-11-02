import { Field } from "@/components/form";
import type { DashT } from "@/i18n/dashboard";
import type { STAFF_LIMITS } from "@/lib/school/staff";
import { WEEKDAY_KEYS } from "../parts";

/** 113.3 The days of the week as checkboxes (`<prefix>1` Monday … `<prefix>7` Sunday). */
export function DayBoxes({ prefix, values, legend, t, id }: { prefix: string; values: Record<string, string>; legend: string; t: DashT; id: string }) {
  return (
    <fieldset id={id} className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_KEYS.map((key, i) => (
          <label key={key} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand has-[:checked]:font-bold">
            <input type="checkbox" name={`${prefix}${i + 1}`} defaultChecked={values[`${prefix}${i + 1}`] === "on"} className="h-4 w-4 accent-midnight" />
            {t(key)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** 113.3 A teacher's or staff member's job, department, working days and hours, and duties, on the People page. */
export function WorkFields({ suffix, values, t, limits }: { suffix: string; values: Record<string, string>; t: DashT; limits: typeof STAFF_LIMITS }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line-soft p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-job${suffix}`} label={t("school.jobTitle")} name="jobTitle" defaultValue={values.jobTitle} maxLength={limits.jobTitle} placeholder={t("school.jobExample")} />
        <Field id={`f-department${suffix}`} label={t("school.department")} name="department" defaultValue={values.department} maxLength={limits.department} placeholder={t("school.departmentExample")} hint={t("school.departmentHint")} />
      </div>
      <DayBoxes id={`f-workdays${suffix}`} prefix="workDay" values={values} legend={t("school.workDays")} t={t} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-workstart${suffix}`} label={t("school.workStart")} name="workStart" type="time" dir="ltr" defaultValue={values.workStart} />
        <Field id={`f-workend${suffix}`} label={t("school.workEnd")} name="workEnd" type="time" dir="ltr" defaultValue={values.workEnd} />
      </div>
      <p className="m-0 text-[13px] text-muted">{t("school.workHint")}</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-duties${suffix}`} className="text-sm font-semibold">
          {t("school.duties")}
        </label>
        <textarea id={`f-duties${suffix}`} name="duties" rows={2} maxLength={limits.duties} defaultValue={values.duties} className="input min-h-16 py-3" aria-describedby={`f-duties${suffix}-hint`} />
        <span id={`f-duties${suffix}-hint`} className="text-xs text-muted">
          {t("school.dutiesHint")}
        </span>
      </div>
    </div>
  );
}
