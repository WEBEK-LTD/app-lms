import type { Metadata } from "next";
import { deleteSchoolPeriodAction, saveSchoolPeriodAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { timeOf } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolPeriod } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { periodFormValues, SCHOOL_LIMITS } from "@/lib/school/forms";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { ClassTabs, FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice, WEEKDAY_KEYS } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.timetable") };
}

/** 105.4 Each class's week: its lessons by day, with the subject, the teacher and the room. */
export default async function SchoolTimetablePage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.timetable")} t={t} />;
  const store = await getStore();
  const [classes, subjects, teachers, plan] = await Promise.all([
    store.listSchoolClasses(app.id),
    store.listSchoolSubjects(app.id),
    store.listSchoolPeople(app.id, { role: "teacher" }),
    appPlan(store, license, new Date()),
  ]);
  const wanted = Number((await searchParams).class);
  const klass = classes.find((c) => c.id === wanted) ?? classes[0] ?? null;
  const periods = klass ? await store.listSchoolPeriods(app.id, { classId: klass.id }) : [];
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const teacherName = new Map(teachers.map((p) => [p.id, p.name]));
  const subjectOptions = subjects.map((s) => ({ value: String(s.id), label: s.name }));
  const teacherOptions = teachers.filter((p) => p.active).map((p) => ({ value: String(p.id), label: p.name }));
  const dayOptions = WEEKDAY_KEYS.map((key, i) => ({ value: String(i + 1), label: t(key) }));

  const fields = (suffix: string, period: SchoolPeriod | null) => {
    const values = periodFormValues(period);
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <Choice id={`f-day${suffix}`} name="weekday" label={t("school.day")} options={dayOptions} defaultValue={values.weekday} />
        <Field id={`f-start${suffix}`} label={t("school.starts")} name="start" type="time" dir="ltr" defaultValue={values.start} required />
        <Field id={`f-end${suffix}`} label={t("school.ends")} name="end" type="time" dir="ltr" defaultValue={values.end} required />
        <Choice id={`f-subject${suffix}`} name="subjectId" label={t("school.subject")} options={subjectOptions} defaultValue={values.subjectId} empty={t("school.choose")} />
        <Choice id={`f-teacher${suffix}`} name="teacherId" label={t("school.teacher")} options={teacherOptions} defaultValue={values.teacherId} empty={t("school.none")} />
        <Field id={`f-room${suffix}`} label={t("school.room")} name="room" defaultValue={values.room} maxLength={SCHOOL_LIMITS.room} />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.timetable")} intro={t("school.timetableIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {classes.length > 0 && subjects.length === 0 ? <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" /> : null}
      {klass ? (
        <>
          <ClassTabs classes={classes} current={klass.id} base="/dashboard/school/timetable" label={t("school.classes")} />
          <Panel id="h-week" title={t("school.weekOf", { name: klass.name })}>
            {periods.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noLessons")}</p> : null}
            {WEEKDAY_KEYS.map((key, i) => {
              const day = periods.filter((p) => p.weekday === i + 1);
              if (!day.length) return null;
              return (
                <div key={key} className="flex flex-col gap-2">
                  <h3 className="m-0 text-[15px] font-bold">{t(key)}</h3>
                  <ul className="m-0 flex list-none flex-col p-0">
                    {day.map((period) => (
                      <li key={period.id} className="flex flex-col gap-2 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span dir="ltr" className="w-[110px] shrink-0 text-[14px] font-semibold tabular-nums">
                            {timeOf(period.startMinute)}–{timeOf(period.endMinute)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-[15px] font-bold">{subjectName.get(period.subjectId) ?? "—"}</span>
                            <span className="text-[13px] text-muted">
                              {[period.teacherId ? teacherName.get(period.teacherId) : null, period.room ? t("school.roomIs", { room: period.room }) : null].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <form action={deleteSchoolPeriodAction}>
                            <input type="hidden" name="id" value={period.id} />
                            <ConfirmButton confirm={t("school.deleteLesson")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                              {t("school.delete")}
                            </ConfirmButton>
                          </form>
                        </div>
                        <details className="rounded-xl border border-line p-4">
                          <summary className="cursor-pointer text-[15px] font-semibold">{t("school.editLesson")}</summary>
                          <div className="pt-3">
                            <SchoolForm action={saveSchoolPeriodAction} submit={t("school.save")}>
                              <input type="hidden" name="id" value={period.id} />
                              <input type="hidden" name="classId" value={klass.id} />
                              {fields(`-${period.id}`, period)}
                            </SchoolForm>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <AddServiceBox title={t("school.addLesson")} open={periods.length === 0}>
              <SchoolForm action={saveSchoolPeriodAction} submit={t("school.add")} reset>
                <input type="hidden" name="classId" value={klass.id} />
                {fields("-new", null)}
              </SchoolForm>
            </AddServiceBox>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
