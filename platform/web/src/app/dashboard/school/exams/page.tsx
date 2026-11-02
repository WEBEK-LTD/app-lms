import type { Metadata } from "next";
import Link from "next/link";
import { deleteSchoolExamAction, publishSchoolExamsAction, saveSchoolExamAction } from "@/app/actions/school-calendar";
import { Field } from "@/components/form";
import { Badge, btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { timeOf } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolExam } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { CALENDAR_LIMITS, examFormValues } from "@/lib/school/calendar-forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { audienceLabel, audienceOptions } from "../life";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("schoolLife.exams") };
}

/** 113.8 The exams' timetable: exams per class or grade and subject, drafts until published; families are told, and reminded the day before. */
export default async function SchoolExamsPage({ searchParams }: { searchParams: Promise<{ edit?: string; past?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("schoolLife.exams")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const [classes, subjects, saved, exams, plan] = await Promise.all([
    store.listSchoolClasses(app.id),
    store.listSchoolSubjects(app.id),
    store.getSchoolSettings(app.id),
    store.listSchoolExams(app.id),
    appPlan(store, license, new Date()),
  ]);
  const today = schoolToday(schoolSettingsOf(saved, app), new Date());
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const upcoming = exams.filter((e) => e.date >= today);
  const past = exams.filter((e) => e.date < today).reverse();
  const drafts = exams.filter((e) => !e.published);
  const editing = query.edit ? (exams.find((e) => e.id === Number(query.edit)) ?? null) : null;
  const forOptions = audienceOptions(classes, t, false);
  const subjectOptions = subjects.map((s) => ({ value: String(s.id), label: s.name }));

  const fields = (suffix: string, exam: SchoolExam | null) => {
    const v = examFormValues(exam);
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice id={`f-for${suffix}`} name="for" label={t("schoolLife.examFor")} options={forOptions} defaultValue={v.for} empty={t("school.choose")} />
        <Choice id={`f-subject${suffix}`} name="subjectId" label={t("schoolLife.subject")} options={subjectOptions} defaultValue={v.subjectId} empty={t("school.choose")} />
        <Field id={`f-date${suffix}`} label={t("schoolLife.date")} name="date" type="date" dir="ltr" defaultValue={v.date} required />
        <Field id={`f-starts${suffix}`} label={t("schoolLife.examStarts")} name="starts" type="time" dir="ltr" defaultValue={v.starts} required />
        <Field id={`f-duration${suffix}`} label={t("schoolLife.duration")} name="duration" type="number" min={5} max={CALENDAR_LIMITS.minutes} dir="ltr" defaultValue={v.duration} required />
        <Field id={`f-room${suffix}`} label={t("schoolLife.room")} name="room" defaultValue={v.room} maxLength={CALENDAR_LIMITS.room} />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={`f-notes${suffix}`} className="text-sm font-semibold">
            {t("schoolLife.examNotes")}
          </label>
          <textarea id={`f-notes${suffix}`} name="notes" rows={3} defaultValue={v.notes} maxLength={CALENDAR_LIMITS.examNotes} className="input min-h-20 py-3" />
        </div>
      </div>
    );
  };

  const row = (e: SchoolExam) => (
    <li key={e.id} data-exam={e.id} className="flex flex-wrap items-start gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
      <span dir="ltr" className="w-[100px] shrink-0 text-[14px] font-semibold tabular-nums">
        {e.date}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
          {subjectName.get(e.subjectId) ?? "—"}
          <Badge tone={e.published ? "success" : "neutral"}>{e.published ? t("schoolLife.published") : t("schoolLife.draft")}</Badge>
        </span>
        <span className="text-[13px] text-muted">
          {[
            audienceLabel({ audience: e.classId !== null ? "class" : "grade", grade: e.grade, classId: e.classId }, className, t),
            t("schoolLife.examLine", { starts: timeOf(e.startMinute), ends: timeOf(Math.min(e.startMinute + e.durationMinutes, 1439)), minutes: e.durationMinutes }),
            e.room ? t("schoolLife.roomIs", { room: e.room }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {e.notes ? <span className="text-[14px] whitespace-pre-line text-ink-4">{e.notes}</span> : null}
      </span>
      <Link href={`?edit=${e.id}#h-edit`} className={`${btn.secondary} h-9 px-3.5 text-sm`}>
        {t("schoolLife.edit")}
      </Link>
      <form action={deleteSchoolExamAction}>
        <input type="hidden" name="id" value={e.id} />
        <ConfirmButton confirm={t("schoolLife.deleteExam", { subject: subjectName.get(e.subjectId) ?? "—", date: e.date })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
          {t("schoolLife.delete")}
        </ConfirmButton>
      </form>
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("schoolLife.exams")} intro={t("schoolLife.examsIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {classes.length > 0 && subjects.length === 0 ? <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" /> : null}

      {editing ? (
        <Panel id="h-edit" title={t("schoolLife.editExam", { subject: subjectName.get(editing.subjectId) ?? "—" })}>
          <SchoolForm action={saveSchoolExamAction} submit={t("school.save")}>
            <input type="hidden" name="id" value={editing.id} />
            {fields(`-${editing.id}`, editing)}
          </SchoolForm>
          <Link href="?" className="text-sm font-semibold no-underline">
            {t("schoolLife.cancel")}
          </Link>
        </Panel>
      ) : null}

      {drafts.length > 0 ? (
        <Panel id="h-publish" title={t("schoolLife.publishDrafts", { count: drafts.length })} intro={t("schoolLife.publishHint")}>
          <SchoolForm action={publishSchoolExamsAction} submit={t("schoolLife.publishDrafts", { count: drafts.length })}>
            {drafts.map((d) => (
              <input key={d.id} type="hidden" name="ids" value={d.id} />
            ))}
          </SchoolForm>
        </Panel>
      ) : null}

      <Panel id="h-upcoming" title={t("schoolLife.upcomingExams")}>
        {upcoming.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("schoolLife.noExams")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-exams="upcoming">
          {upcoming.map(row)}
        </ul>
        {classes.length > 0 && subjects.length > 0 ? (
          <AddServiceBox title={t("schoolLife.addExam")} open={exams.length === 0}>
            <SchoolForm action={saveSchoolExamAction} submit={t("school.add")} reset>
              {fields("-new", null)}
            </SchoolForm>
          </AddServiceBox>
        ) : null}
      </Panel>

      {past.length > 0 ? (
        <Panel id="h-past" title={t("schoolLife.pastExams")}>
          <ul className="m-0 flex list-none flex-col p-0" data-exams="past">
            {past.slice(0, query.past === "all" ? undefined : 30).map(row)}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
