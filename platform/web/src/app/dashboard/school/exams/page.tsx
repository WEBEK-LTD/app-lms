import type { Metadata } from "next";
import { deleteSchoolExamAction, publishSchoolExamsAction, saveSchoolExamAction } from "@/app/actions/school-calendar";
import { Field } from "@/components/form";
import { Badge, EmptyState, btn } from "@/components/ui";
import { ItemRow, Stat, StatRow } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
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
import { Choice, SchoolForm } from "../forms";
import { audienceLabel, audienceOptions } from "../life";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("schoolLife.exams") };
}

/** 113.8 The exams' timetable: exams per class or grade and subject, drafts until published; families are told, and reminded the day before. */
export default async function SchoolExamsPage({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
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

  const canAdd = classes.length > 0 && subjects.length > 0;

  const row = (e: SchoolExam) => (
    <ItemRow
      key={e.id}
      data-exam={e.id}
      media={
        <span dir="ltr" className="flex h-11 w-[104px] shrink-0 items-center justify-center rounded-xl bg-ivory text-[14px] font-bold tabular-nums">
          {e.date}
        </span>
      }
      title={subjectName.get(e.subjectId) ?? "—"}
      badges={<Badge tone={e.published ? "success" : "neutral"}>{e.published ? t("schoolLife.published") : t("schoolLife.draft")}</Badge>}
      meta={[
        audienceLabel({ audience: e.classId !== null ? "class" : "grade", grade: e.grade, classId: e.classId }, className, t),
        t("schoolLife.examLine", { starts: timeOf(e.startMinute), ends: timeOf(Math.min(e.startMinute + e.durationMinutes, 1439)), minutes: e.durationMinutes }),
        e.room ? t("schoolLife.roomIs", { room: e.room }) : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      extra={e.notes ? <span className="whitespace-pre-line text-ink-4">{e.notes}</span> : null}
      actions={
        <>
          <SheetButton target={`exam-${e.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
            {t("schoolLife.edit")}
          </SheetButton>
          <form action={deleteSchoolExamAction}>
            <input type="hidden" name="id" value={e.id} />
            <ConfirmButton confirm={t("schoolLife.deleteExam", { subject: subjectName.get(e.subjectId) ?? "—", date: e.date })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
              {t("schoolLife.delete")}
            </ConfirmButton>
          </form>
          <Sheet id={`exam-${e.id}`} title={t("schoolLife.editExam", { subject: subjectName.get(e.subjectId) ?? "—" })} description={e.date}>
            <SchoolForm action={saveSchoolExamAction} submit={t("school.save")} sheet>
              <input type="hidden" name="id" value={e.id} />
              {fields(`-${e.id}`, e)}
            </SchoolForm>
          </Sheet>
        </>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the drafts to publish, then the exams. */}
      <PageHead
        title={t("schoolLife.exams")}
        intro={t("schoolLife.examsIntro")}
        actions={
          canAdd && exams.length ? (
            <SheetButton target="new-exam" icon="add">
              {t("schoolLife.addExam")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {classes.length > 0 && subjects.length === 0 ? <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" /> : null}

      {exams.length ? (
        <StatRow label={t("schoolLife.exams")}>
          <Stat icon="event" tone="accent" label={t("schoolLife.upcomingExams")} value={upcoming.length} />
          <Stat icon="check_circle" tone="success" label={t("schoolLife.published")} value={exams.length - drafts.length} />
          <Stat icon="edit" tone={drafts.length ? "warn" : "neutral"} label={t("schoolLife.draft")} value={drafts.length} />
          <Stat icon="event_available" label={t("schoolLife.pastExams")} value={past.length} />
        </StatRow>
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

      {canAdd ? (
        // One place in the page either way, so the form that adds the first exam keeps its message.
        <Sheet id="new-exam" inline={exams.length === 0} title={t("schoolLife.addExam")}>
          <SchoolForm action={saveSchoolExamAction} submit={t("school.add")} reset sheet>
            {fields("-new", null)}
          </SchoolForm>
        </Sheet>
      ) : null}

      <Panel id="h-upcoming" title={t("schoolLife.upcomingExams")} flush>
        {upcoming.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="event" title={t("schoolLife.noExams")} />
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col p-0" data-exams="upcoming">
          {upcoming.map(row)}
        </ul>
      </Panel>

      {past.length > 0 ? (
        <Panel id="h-past" title={t("schoolLife.pastExams")} flush>
          <ul className="m-0 flex list-none flex-col p-0" data-exams="past">
            {past.slice(0, query.past === "all" ? undefined : 30).map(row)}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
