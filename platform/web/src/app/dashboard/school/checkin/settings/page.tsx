import type { Metadata } from "next";
import { saveCheckinSettingsAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import type { DashT } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { SCHOOL_CHECKIN_METHODS, type SchoolCheckinMethods } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { checkinSettingsOf } from "@/lib/school/checkin";
import { checkinFormValues } from "@/lib/school/forms";
import { schoolSettingsOf } from "@/lib/school/settings";
import { SchoolForm } from "../../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../../parts";
import { DayBoxes } from "../../staff/parts";
import { CheckinLinks } from "../parts";
import { LocateButton } from "./locate-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.checkinSettings") };
}

const METHOD_KEYS = { qr: "school.methodQr", location: "school.methodLocation", either: "school.methodEither", both: "school.methodBoth" } as const satisfies Record<SchoolCheckinMethods, string>;

function TimesFields({ prefix, legend, hint, values, t }: { prefix: string; legend: string; hint?: string; values: Record<string, string>; t: DashT }) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line-soft bg-sand p-4">
      <legend className="px-1 text-sm font-bold">{legend}</legend>
      {hint ? <p className="m-0 text-[14px] text-muted">{hint}</p> : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id={`f-${prefix}-start`} label={t("school.dayStarts")} name={`${prefix}Start`} type="time" dir="ltr" defaultValue={values[`${prefix}Start`]} />
        <Field id={`f-${prefix}-late`} label={t("school.lateFrom")} name={`${prefix}Late`} type="time" dir="ltr" defaultValue={values[`${prefix}Late`]} />
        <Field id={`f-${prefix}-end`} label={t("school.dayEnds")} name={`${prefix}End`} type="time" dir="ltr" defaultValue={values[`${prefix}End`]} />
        <Field id={`f-${prefix}-early`} label={t("school.earlyBefore")} name={`${prefix}Early`} type="time" dir="ltr" defaultValue={values[`${prefix}Early`]} />
      </div>
    </fieldset>
  );
}

/** 113.2 How people check in (the gate's code, the school's area, either or both), the school's place, days and times, and the parents' alerts. */
export default async function SchoolCheckinSettingsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.checkinSettings")} t={t} />;
  const store = await getStore();
  const [saved, plan] = await Promise.all([store.getSchoolSettings(app.id), appPlan(store, license, new Date())]);
  const values = checkinFormValues(checkinSettingsOf(schoolSettingsOf(saved, app)));

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header with the way back, the other check-in pages, then the settings in their parts. */}
      <PageHead title={t("school.checkinSettings")} intro={t("school.checkinSettingsIntro")} back={{ href: "/dashboard/school/checkin", label: t("school.checkin") }} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      <CheckinLinks t={t} current="/dashboard/school/checkin/settings" />
      <Panel id="h-checkin-settings" title={t("school.checkinSettings")}>
        <SchoolForm action={saveCheckinSettingsAction} submit={t("school.saveCheckin")}>
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="on" defaultChecked={values.on === "on"} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t("school.checkinOn")}</span>
              <span className="text-[14px] text-muted">{t("school.checkinOnHint")}</span>
            </span>
          </label>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1.5 text-sm font-semibold">{t("school.methods")}</legend>
            {SCHOOL_CHECKIN_METHODS.map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input type="radio" name="methods" value={m} defaultChecked={values.methods === m} className="h-4 w-4 accent-midnight" />
                {t(METHOD_KEYS[m])}
              </label>
            ))}
            <p className="m-0 text-[14px] text-muted">{t("school.methodsHint")}</p>
          </fieldset>
          <fieldset className="m-0 flex flex-col gap-3 rounded-xl border border-line-soft bg-sand p-4">
            <legend className="px-1 text-sm font-bold">{t("school.place")}</legend>
            <p className="m-0 text-[14px] text-muted">{t("school.placeHint")}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="f-lat" label={t("school.latitude")} name="lat" inputMode="decimal" dir="ltr" defaultValue={values.lat} placeholder="30.0444" />
              <Field id="f-lng" label={t("school.longitude")} name="lng" inputMode="decimal" dir="ltr" defaultValue={values.lng} placeholder="31.2357" />
              <Field id="f-radius" label={t("school.radius")} name="radius" type="number" min={20} max={5000} dir="ltr" defaultValue={values.radius} />
            </div>
            <LocateButton latId="f-lat" lngId="f-lng" />
          </fieldset>
          <DayBoxes id="f-days" prefix="day" values={values} legend={t("school.schoolDays")} t={t} />
          <TimesFields prefix="student" legend={t("school.studentTimes")} values={values} t={t} />
          <TimesFields prefix="staff" legend={t("school.staffTimes")} hint={t("school.staffTimesHint")} values={values} t={t} />
          <label className="flex items-start gap-2 text-[15px]">
            <input type="checkbox" name="parentAlerts" defaultChecked={values.parentAlerts === "on"} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="font-semibold">{t("school.parentAlerts")}</span>
          </label>
          <p className="m-0 text-[14px] text-muted">{t("school.gateKeyNote")}</p>
        </SchoolForm>
      </Panel>
    </div>
  );
}
