import type { Metadata } from "next";
import { saveSchoolAttendanceAction } from "@/app/actions/school";
import { btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { addDays, isDate } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { SCHOOL_ATTENDANCE_STATUSES, type SchoolAttendanceStatus } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { SchoolForm } from "../forms";
import { ClassTabs, FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.attendance") };
}

const STATUS_KEYS: Record<SchoolAttendanceStatus, DashKey> = {
  present: "school.present",
  absent: "school.absent",
  late: "school.late",
  excused: "school.excused",
};

/** 105.4 A class's attendance on a day, as the office takes it (teachers take it in the app). */
export default async function SchoolAttendancePage({ searchParams }: { searchParams: Promise<{ class?: string; date?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.attendance")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [classes, saved, plan] = await Promise.all([store.listSchoolClasses(app.id), store.getSchoolSettings(app.id), appPlan(store, license, now)]);
  const settings = schoolSettingsOf(saved, app);
  const today = schoolToday(settings, now);
  const date = params.date && isDate(params.date) && params.date <= today && params.date >= addDays(today, -366) ? params.date : today;
  const klass = classes.find((c) => c.id === Number(params.class)) ?? classes[0] ?? null;
  const [students, rows] = klass
    ? await Promise.all([store.listSchoolPeople(app.id, { role: "student", classId: klass.id }), store.listSchoolAttendance(app.id, { classId: klass.id, from: date, to: date })])
    : [[], []];
  const marks = new Map(rows.map((r) => [r.studentId, r]));
  const active = students.filter((s) => s.active);
  const counts = SCHOOL_ATTENDANCE_STATUSES.map((s) => ({ status: s, count: rows.filter((r) => r.status === s).length }));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.attendance")} intro={t("school.attendanceIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {klass ? (
        <>
          <ClassTabs classes={classes} current={klass.id} base="/dashboard/school/attendance" label={t("school.classes")} extra={`&date=${date}`} />
          <form method="get" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="class" value={klass.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-date" className="text-sm font-semibold">
                {t("school.date")}
              </label>
              <input id="f-date" name="date" type="date" dir="ltr" defaultValue={date} max={today} className="input input-sm" />
            </div>
            <button type="submit" className={`${btn.secondary} h-10`}>
              {t("school.show")}
            </button>
          </form>
          <Panel id="h-day" title={t("school.attendanceOf", { name: klass.name, date })} intro={rows.length ? counts.map((c) => `${t(STATUS_KEYS[c.status])}: ${c.count}`).join(" · ") : t("school.notTaken")}>
            {active.length === 0 ? (
              <FirstNote text={t("school.studentsFirst")} href="/dashboard/school/people" />
            ) : (
              <SchoolForm action={saveSchoolAttendanceAction} submit={t("school.saveAttendance")}>
                <input type="hidden" name="classId" value={klass.id} />
                <input type="hidden" name="date" value={date} />
                <ul className="m-0 flex list-none flex-col p-0">
                  {active.map((student) => {
                    const mark = marks.get(student.id);
                    return (
                      <li key={student.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                        <span className="min-w-[160px] flex-1 text-[15px] font-semibold">{student.name}</span>
                        <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
                          <legend className="sr-only">{student.name}</legend>
                          {SCHOOL_ATTENDANCE_STATUSES.map((status) => (
                            <label key={status} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand has-[:checked]:font-bold">
                              <input type="radio" name={`status-${student.id}`} value={status} defaultChecked={(mark?.status ?? "present") === status} className="h-4 w-4 accent-midnight" />
                              {t(STATUS_KEYS[status])}
                            </label>
                          ))}
                        </fieldset>
                        <label className="sr-only" htmlFor={`f-note-${student.id}`}>
                          {t("school.noteFor", { name: student.name })}
                        </label>
                        <input id={`f-note-${student.id}`} name={`note-${student.id}`} defaultValue={mark?.note ?? ""} maxLength={300} placeholder={t("school.note")} className="input input-sm w-full sm:w-[200px]" />
                      </li>
                    );
                  })}
                </ul>
              </SchoolForm>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
