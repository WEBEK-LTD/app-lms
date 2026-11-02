"use client";

import { useActionState } from "react";
import { addStudentsAction, gradeSubmissionAction, renameTopicAction, saveAssignmentAction, saveCohortAction, saveLiveAction } from "@/app/actions/courses";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { MediaPickButton } from "@/components/media-picker";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 112.5 The course builder's forms: a section's name, assignments, live classes, grading and students added at once. */

function TextArea({ id, label, name, value, rows, error, hint }: { id: string; label: string; name: string; value?: string; rows: number; error?: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={value}
        className="input min-h-[84px] py-2.5"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function TopicTitleForm({ courseId, topicId, title }: { courseId: number; topicId: number; title: string }) {
  const t = useDashT();
  const [state, action] = useActionState(renameTopicAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-2" key={state.ok ? state.message : "form"}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="topicId" value={topicId} />
      <Field label={t("lms.sectionName")} name="title" id={`f-topic-${topicId}`} defaultValue={state.values?.title ?? title} error={state.errors?.title} className="min-w-[200px] flex-1" small />
      <SubmitButton variant="secondary" className="h-11">
        {t("lms.rename")}
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

export function AssignmentForm({ courseId, topicId, current, submit }: { courseId: number; topicId: number; current: Record<string, string>; submit: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveAssignmentAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = `assignment-${current.id || `new-${topicId}`}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <Field label={t("lms.assignmentTitle")} name="title" id={`${key}-title`} defaultValue={v.title} error={e.title} small />
      <TextArea id={`${key}-instructions`} label={t("lms.instructions")} name="instructions" value={v.instructions} rows={4} error={e.instructions} hint={t("lms.instructionsHint")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("lms.maxPoints")} name="maxPoints" id={`${key}-max`} inputMode="numeric" defaultValue={v.maxPoints} error={e.maxPoints} small />
        <Field label={t("lms.passPoints")} name="passPoints" id={`${key}-pass`} inputMode="numeric" defaultValue={v.passPoints} hint={t("lms.passPointsHint")} error={e.passPoints} small />
        <Field label={t("lms.dueDays")} name="dueDays" id={`${key}-due-days`} inputMode="numeric" defaultValue={v.dueDays} hint={t("lms.dueDaysHint")} error={e.dueDays} small />
        <Field label={t("lms.dueOn")} name="dueOn" id={`${key}-due-on`} type="date" defaultValue={v.dueOn} hint={t("lms.dueOnHint")} error={e.dueOn} small />
      </div>
      <TextArea id={`${key}-files`} label={t("lms.assignmentFiles")} name="attachments" value={v.attachments} rows={2} error={e.attachments} hint={t("courses.filesHint")} />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

export function LiveForm({ courseId, topicId, current, submit, zone }: { courseId: number; topicId: number; current: Record<string, string>; submit: string; zone: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveLiveAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = `live-${current.id || `new-${topicId}`}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <Field label={t("lms.liveTitle")} name="title" id={`${key}-title`} defaultValue={v.title} error={e.title} small />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("lms.liveDate")} name="date" id={`${key}-date`} type="date" defaultValue={v.date} error={e.date} small />
        <Field label={t("lms.liveTime", { zone })} name="time" id={`${key}-time`} type="time" defaultValue={v.time} small />
        <Field label={t("lms.liveLength")} name="duration" id={`${key}-duration`} inputMode="numeric" defaultValue={v.duration} error={e.duration} small />
      </div>
      <Field
        label={t("lms.meetingUrl")}
        name="meetingUrl"
        id={`${key}-meeting`}
        type="url"
        dir="ltr"
        placeholder="https://zoom.us/j/…"
        defaultValue={v.meetingUrl}
        hint={t("lms.meetingUrlHint")}
        error={e.meetingUrl}
        small
      />
      <TextArea id={`${key}-notes`} label={t("lms.liveNotes")} name="notes" value={v.notes} rows={2} error={e.notes} />
      <div className="flex flex-col gap-1.5">
        <Field
          label={t("lms.recordingUrl")}
          name="recordingUrl"
          id={`${key}-recording`}
          type="url"
          dir="ltr"
          defaultValue={v.recordingUrl}
          hint={t("lms.recordingUrlHint")}
          error={e.recordingUrl}
          small
        />
        <MediaPickButton kind="video" inputId={`${key}-recording`} label={t("lms.chooseRecording")} />
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

/** A score and a note, or the assignment sent back for another try. */
export function GradeForm({ submissionId, maxPoints, current }: { submissionId: number; maxPoints: number; current: Record<string, string> }) {
  const t = useDashT();
  const [state, action] = useActionState(gradeSubmissionAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = `grade-${submissionId}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="submissionId" value={submissionId} />
      <Field label={t("lms.scoreOf", { max: maxPoints })} name="score" id={`${key}-score`} inputMode="numeric" defaultValue={v.score} error={e.score} className="sm:max-w-[220px]" small />
      <TextArea id={`${key}-feedback`} label={t("lms.feedback")} name="feedback" value={v.feedback} rows={3} error={e.feedback} hint={t("lms.feedbackHint")} />
      <div className="flex flex-wrap justify-end gap-2">
        <SubmitButton variant="secondary" className="h-10" name="outcome" value="return">
          {t("lms.sendBack")}
        </SubmitButton>
        <SubmitButton className="h-10" name="outcome" value="grade" pendingText={t("common.saving")}>
          {t("lms.saveGrade")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 112.5 Which cohort students added join (none by default). */
export function CohortSelect({ id, cohorts, value }: { id: string; cohorts: { id: number; name: string }[]; value?: string }) {
  const t = useDashT();
  if (!cohorts.length) return null;
  return (
    <div className="flex min-w-[180px] flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {t("lms.cohort")}
      </label>
      <select id={id} name="cohortId" defaultValue={value ?? ""} className="input input-sm">
        <option value="">{t("lms.noCohort")}</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 112.5 A new cohort: its name and first day. */
export function CohortForm({ courseId }: { courseId: number }) {
  const t = useDashT();
  const [state, action] = useActionState(saveCohortAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-2" key={state.ok ? state.message : "form"}>
      <input type="hidden" name="courseId" value={courseId} />
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("lms.cohortName")} name="name" id={`f-cohort-name-${courseId}`} placeholder={t("lms.cohortPlaceholder")} defaultValue={state.values?.name} error={state.errors?.name} className="min-w-[200px] flex-1" small />
        <Field label={t("lms.cohortStarts")} name="startsOn" id={`f-cohort-start-${courseId}`} type="date" defaultValue={state.values?.startsOn} error={state.errors?.startsOn} small />
        <SubmitButton variant="secondary" className="h-11">
          {t("lms.addCohort")}
        </SubmitButton>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

export function StudentsForm({ courseId, cohorts = [] }: { courseId: number; cohorts?: { id: number; name: string }[] }) {
  const t = useDashT();
  const [state, action] = useActionState(addStudentsAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-2" key={state.ok ? state.message : JSON.stringify(state.values ?? {})}>
      <input type="hidden" name="courseId" value={courseId} />
      <TextArea id={`f-students-${courseId}`} label={t("lms.addStudents")} name="phones" value={state.values?.phones} rows={4} error={state.errors?.phones} hint={t("lms.addStudentsHint")} />
      <CohortSelect id={`f-students-cohort-${courseId}`} cohorts={cohorts} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormMessage message={state.message} ok={state.ok} />
        <SubmitButton variant="secondary" className="h-11">
          {t("lms.addStudentsButton")}
        </SubmitButton>
      </div>
    </form>
  );
}
