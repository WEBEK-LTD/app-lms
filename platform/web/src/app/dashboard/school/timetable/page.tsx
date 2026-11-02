import type { Metadata } from "next";
import { deleteSchoolPeriodAction, saveSchoolPeriodAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { EmptyState, btn } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { ListBar } from "@/components/page-kit-c";
import { requireClient } from "@/lib/auth/session";
import { timeOf } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolPeriod } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { periodFormValues, SCHOOL_LIMITS } from "@/lib/school/forms";
import { ConfirmButton } from "../../chat/forms";
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

  const minutes = periods.reduce((sum, p) => sum + Math.max(0, p.endMinute - p.startMinute), 0);
  const canAdd = klass !== null && subjects.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the week's numbers, then the week by day. */}
      <PageHead
        title={t("school.timetable")}
        intro={t("school.timetableIntro")}
        actions={
          canAdd && periods.length ? (
            <SheetButton target="new-lesson" icon="add">
              {t("school.addLesson")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {classes.length > 0 && subjects.length === 0 ? <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" /> : null}
      {klass ? (
        <>
          {periods.length ? (
            <StatRow label={t("school.weekOf", { name: klass.name })}>
              <Stat icon="calendar_month" tone="accent" label={t("school.statLessons")} value={periods.length} />
              <Stat icon="schedule" label={t("school.statHours")} value={(minutes / 60).toLocaleString("en", { maximumFractionDigits: 1 })} />
              <Stat icon="menu_book" label={t("school.subjects")} value={new Set(periods.map((p) => p.subjectId)).size} />
              <Stat icon="person" label={t("school.teachers")} value={new Set(periods.map((p) => p.teacherId).filter((id) => id !== null)).size} />
            </StatRow>
          ) : null}
          <Panel id="h-week" title={t("school.weekOf", { name: klass.name })} flush>
            <ListBar>
              <ClassTabs classes={classes} current={klass.id} base="/dashboard/school/timetable" label={t("school.classes")} />
            </ListBar>
            {periods.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState icon="calendar_month" title={t("school.noLessons")} />
              </div>
            ) : null}
            {WEEKDAY_KEYS.map((key, i) => {
              const day = periods.filter((p) => p.weekday === i + 1);
              if (!day.length) return null;
              return (
                <div key={key} role="group" aria-labelledby={`h-day-${i + 1}`} className="flex flex-col border-t border-line-soft first:border-t-0">
                  <h3 id={`h-day-${i + 1}`} className="m-0 flex items-center gap-2 bg-sand px-5 py-2 text-xs font-bold tracking-[0.4px] text-muted uppercase sm:px-6">
                    {t(key)}
                    <span className="rounded-full bg-white px-1.5 tabular-nums">{day.length}</span>
                  </h3>
                  <ItemList>
                    {day.map((period) => (
                      <ItemRow
                        key={period.id}
                        media={
                          <span dir="ltr" className="flex h-11 w-[112px] shrink-0 items-center justify-center rounded-xl bg-ivory text-[14px] font-bold tabular-nums">
                            {timeOf(period.startMinute)}–{timeOf(period.endMinute)}
                          </span>
                        }
                        title={subjectName.get(period.subjectId) ?? "—"}
                        meta={[period.teacherId ? teacherName.get(period.teacherId) : null, period.room ? t("school.roomIs", { room: period.room }) : null].filter(Boolean).join(" · ") || null}
                        actions={
                          <>
                            <SheetButton target={`lesson-${period.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                              {t("school.edit")}
                            </SheetButton>
                            <form action={deleteSchoolPeriodAction}>
                              <input type="hidden" name="id" value={period.id} />
                              <ConfirmButton confirm={t("school.deleteLesson")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                                {t("school.delete")}
                              </ConfirmButton>
                            </form>
                            <Sheet id={`lesson-${period.id}`} title={t("school.editLesson")} description={`${subjectName.get(period.subjectId) ?? "—"} · ${t(key)}`}>
                              <SchoolForm action={saveSchoolPeriodAction} submit={t("school.save")} sheet>
                                <input type="hidden" name="id" value={period.id} />
                                <input type="hidden" name="classId" value={klass.id} />
                                {fields(`-${period.id}`, period)}
                              </SchoolForm>
                            </Sheet>
                          </>
                        }
                      />
                    ))}
                  </ItemList>
                </div>
              );
            })}
          </Panel>
          {canAdd ? (
            // Keyed by the class, so another class's first lesson shows its form in place.
            <Sheet key={klass.id} id="new-lesson" inline={periods.length === 0} title={t("school.addLesson")}>
              <SchoolForm action={saveSchoolPeriodAction} submit={t("school.add")} reset sheet>
                <input type="hidden" name="classId" value={klass.id} />
                {fields("-new", null)}
              </SchoolForm>
            </Sheet>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
