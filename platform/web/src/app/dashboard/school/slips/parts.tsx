import { Field } from "@/components/form";
import type { DashT } from "@/i18n/dashboard";
import type { SchoolClass, SchoolSlip } from "@/lib/data/types";
import { PARENT_LIMITS, slipAudienceValue } from "@/lib/school/parent";
import { Choice } from "../forms";
import { audienceOptions } from "../life";

/** 113.4 A permission slip's fields: its title, details, due date, a fee note and whom it is for. */
export function SlipFields({ slip, classes, today, t }: { slip: SchoolSlip | null; classes: SchoolClass[]; today: string; t: DashT }) {
  const suffix = slip ? `-${slip.id}` : "-new";
  return (
    <>
      {slip ? <input type="hidden" name="id" value={slip.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-title${suffix}`} label={t("parents.slipTitle")} name="title" defaultValue={slip?.title ?? ""} placeholder={t("parents.slipTitleExample")} maxLength={PARENT_LIMITS.title} required className="sm:col-span-2" />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={`f-details${suffix}`} className="text-sm font-semibold">
            {t("parents.details")}
          </label>
          <textarea id={`f-details${suffix}`} name="details" rows={3} maxLength={PARENT_LIMITS.details} defaultValue={slip?.details ?? ""} className="input min-h-20 py-3" />
        </div>
        <Field id={`f-due${suffix}`} label={t("parents.dueOn")} name="dueOn" type="date" dir="ltr" defaultValue={slip?.dueOn ?? ""} min={slip ? undefined : today} required />
        <Choice
          id={`f-for${suffix}`}
          name="audience"
          label={t("parents.slipFor")}
          options={[{ value: "school", label: t("schoolLife.forSchool") }, ...audienceOptions(classes, t, false)]}
          defaultValue={slip ? slipAudienceValue(slip) : "school"}
        />
        <Field id={`f-fee${suffix}`} label={t("parents.feeNote")} name="feeNote" defaultValue={slip?.feeNote ?? ""} maxLength={PARENT_LIMITS.feeNote} hint={t("parents.feeNoteHint")} className="sm:col-span-2" />
      </div>
    </>
  );
}
