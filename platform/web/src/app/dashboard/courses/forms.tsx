"use client";

import { useActionState } from "react";
import {
  addCourseCategoryAction,
  addStudentAction,
  addTopicAction,
  saveCourseAction,
  saveCourseCurrencyAction,
  saveLessonAction,
  saveOfflineDownloadsAction,
  saveQuizAction,
  saveQuestionBankAction,
} from "@/app/actions/courses";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { initialFormState } from "@/lib/forms";
import { MediaPickButton } from "@/components/media-picker";
import { useDashT } from "@/components/dashboard-i18n";
import { CohortSelect } from "./builder-forms";

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-midnight" />
      {label}
    </label>
  );
}

function TextArea({ id, label, name, value, rows, error, hint }: { id: string; label: string; name: string; value?: string; rows: number; error?: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea id={id} name={name} rows={rows} defaultValue={value} className="input min-h-[84px] py-2.5" />
      {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function CourseForm({
  current,
  categories,
  currency,
  imageUrl,
  submit,
  others = [],
}: {
  current: Record<string, string>;
  categories: { id: number; name: string }[];
  currency: string;
  imageUrl: string | null;
  submit: string;
  /** 113.7 The academy's other courses, to need first. */
  others?: { id: number; title: string }[];
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveCourseAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const chosen = new Set((v.categoryIds ?? "").split(",").filter(Boolean).map(Number));
  const needed = new Set((v.prerequisiteIds ?? "").split(",").filter(Boolean).map(Number));
  const key = `f-course-${current.id || "new"}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <Field label={t("common.title")} name="title" defaultValue={v.title} error={e.title} small />
      <TextArea id="f-course-description" label={t("common.description")} name="description" value={v.description} rows={4} error={e.description} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t("courses.priceIn", { currency })}
          name="price"
          inputMode="decimal"
          defaultValue={v.price}
          hint={t("courses.priceHint")}
          error={e.price}
          small
        />
        <Field label={t("courses.instructor")} name="instructor" defaultValue={v.instructor} error={e.instructor} small />
        <Field label={t("courses.level")} name="level" placeholder={t("courses.levelPlaceholder")} defaultValue={v.level} error={e.level} small />
      </div>
      {categories.length ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-sm font-semibold">{t("courses.categories")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={chosen.has(c.id)} className="h-4 w-4 accent-midnight" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-course-image" className="text-sm font-semibold">
          {t("courses.coverImage")}
        </label>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- A small preview of an uploaded file.
          <img src={imageUrl} alt="" className="h-24 w-40 rounded-lg border border-line object-cover" />
        ) : null}
        <input id="f-course-image" type="file" name="image" accept="image/png,image/jpeg" className="text-sm" />
        <span className="text-[13px] text-muted">{t("courses.imageHint")}</span>
        {imageUrl ? <Check name="removeImage" label={t("courses.removeImage")} checked={false} /> : null}
        <FieldError id="f-course-image-error" error={e.image} />
      </div>
      <div className="flex flex-col gap-1">
        <Check name="restart" label={t("courses.restart")} checked={v.restart !== ""} />
        <span className="ps-6 text-[13px] text-muted">{t("courses.restartHint")}</span>
      </div>
      {/* 90.1 Certificates and access that ends. */}
      <div className="flex flex-col gap-1">
        <Check name="certificate" label={t("courses.certificate")} checked={v.certificate === "on"} />
        <span className="ps-6 text-[13px] text-muted">{t("courses.certificateHint")}</span>
      </div>
      {/* 112.5 Who signs the certificate, and a course taken in order. */}
      <Field
        label={t("lms.certificateSigner")}
        name="certificateSigner"
        defaultValue={v.certificateSigner}
        placeholder={t("lms.certificateSignerPlaceholder")}
        hint={t("lms.certificateSignerHint")}
        error={e.certificateSigner}
        className="sm:max-w-[420px]"
        small
      />
      <div className="flex flex-col gap-1">
        <Check name="sequential" label={t("lms.sequential")} checked={v.sequential === "on"} />
        <span className="ps-6 text-[13px] text-muted">{t("lms.sequentialHint")}</span>
      </div>
      {/* 113.7 The rules to complete the course (and earn its certificate), and the courses it needs first. */}
      <fieldset className="m-0 flex flex-col gap-3 rounded-lg border border-line-soft p-3">
        <legend className="px-1 text-sm font-semibold">{t("learning.completeTitle")}</legend>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${key}-complete`} className="text-sm font-semibold">
            {t("learning.completeWhen")}
          </label>
          <select id={`${key}-complete`} name="completeWhen" defaultValue={v.completeWhen || "all"} className="input input-sm sm:max-w-[420px]">
            <option value="lessons">{t("learning.completeLessons")}</option>
            <option value="quizzes">{t("learning.completeQuizzes")}</option>
            <option value="all">{t("learning.completeAll")}</option>
          </select>
        </div>
        <Field
          label={t("learning.minFinalScore")}
          name="minFinalScore"
          id={`${key}-min-score`}
          inputMode="numeric"
          defaultValue={v.minFinalScore}
          hint={t("learning.minFinalScoreHint")}
          error={e.minFinalScore}
          className="sm:max-w-[320px]"
          small
        />
      </fieldset>
      {others.length ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-sm font-semibold">{t("learning.prerequisites")}</legend>
          <span className="text-[13px] text-muted">{t("learning.prerequisitesHint")}</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {others.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input type="checkbox" name="prerequisiteIds" value={c.id} defaultChecked={needed.has(c.id)} className="h-4 w-4 accent-midnight" />
                {c.title}
              </label>
            ))}
          </div>
          <FieldError id={`${key}-prerequisites-error`} error={e.prerequisites} />
        </fieldset>
      ) : null}
      <Field
        label={t("courses.accessDays")}
        name="accessDays"
        inputMode="numeric"
        defaultValue={v.accessDays}
        hint={t("courses.accessDaysHint")}
        error={e.accessDays}
        className="sm:max-w-[320px]"
        small
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Check name="active" label={t("courses.visible")} checked={v.active !== ""} />
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

export function CourseCategoryForm() {
  const t = useDashT();
  const [state, action] = useActionState(addCourseCategoryAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3" key={state.ok ? state.message : "form"}>
      <Field label={t("courses.newCategory")} name="name" defaultValue={state.values?.name} error={state.errors?.name} className="min-w-[200px] flex-1" small />
      <SubmitButton variant="secondary" className="h-11">
        {t("common.add")}
      </SubmitButton>
    </form>
  );
}

export function CurrencyForm({ currency }: { currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveCourseCurrencyAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="f-currency" className="text-sm font-semibold">
          {t("courses.currency")}
        </label>
        <select id="f-currency" name="currency" defaultValue={currency} className="input input-sm w-[140px]">
          {CATALOG_CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <SubmitButton variant="secondary" className="h-11">
        {t("common.save")}
      </SubmitButton>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

export function TopicForm({ courseId }: { courseId: number }) {
  const t = useDashT();
  const [state, action] = useActionState(addTopicAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-end gap-3" key={state.ok ? state.message : "form"}>
      <input type="hidden" name="courseId" value={courseId} />
      <Field label={t("courses.newSection")} name="title" id={`f-new-section-${courseId}`} placeholder={t("courses.sectionPlaceholder")} defaultValue={state.values?.title} error={state.errors?.title} className="min-w-[220px] flex-1" small />
      <SubmitButton variant="secondary" className="h-11">
        {t("courses.addSection")}
      </SubmitButton>
    </form>
  );
}

export function LessonForm({ courseId, topicId, current, submit }: { courseId: number; topicId: number; current: Record<string, string>; submit: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveLessonAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = `lesson-${current.id ?? `new-${topicId}`}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label={t("courses.lessonTitle")} name="title" id={`${key}-title`} defaultValue={v.title} error={e.title} small />
        <Field label={t("courses.minutes")} name="duration" id={`${key}-duration`} inputMode="numeric" defaultValue={v.duration} error={e.duration} small />
      </div>
      <div className="flex flex-col gap-1.5">
        <Field
          label={t("courses.videoAddress")}
          name="videoUrl"
          id={`${key}-video`}
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          dir="ltr"
          defaultValue={v.videoUrl}
          hint={t("courses.videoHint")}
          error={e.videoUrl}
          small
        />
        {/* 51 Videos uploaded to Yallapp. */}
        <MediaPickButton kind="video" inputId={`${key}-video`} label={t("courses.chooseMedia")} />
      </div>
      <TextArea id={`${key}-text`} label={t("courses.text")} name="text" value={v.text} rows={3} error={e.text} hint={t("courses.lessonTextHint")} />
      {/* 90.1 Files with the lesson, and lessons that open some days after enrolling. */}
      <TextArea id={`${key}-files`} label={t("courses.files")} name="attachments" value={v.attachments} rows={2} error={e.attachments} hint={t("courses.filesHint")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("courses.dripDays")} name="dripDays" id={`${key}-drip`} inputMode="numeric" defaultValue={v.dripDays} hint={t("courses.dripDaysHint")} error={e.dripDays} small />
        {/* 112.5 Or on a day, for everyone. */}
        <Field label={t("lms.opensOn")} name="opensOn" id={`${key}-opens`} type="date" defaultValue={v.opensOn} hint={t("lms.opensOnHint")} error={e.opensOn} small />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Check name="preview" label={t("courses.freePreview")} checked={v.preview === "on"} />
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 90.1 A quiz at the end of a section, its questions written as text. */
export function QuizForm({ courseId, topicId, current, submit }: { courseId: number; topicId: number; current: Record<string, string>; submit: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveQuizAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = `quiz-${current.id ?? `new-${topicId}`}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <Field label={t("courses.quizTitle")} name="title" id={`${key}-title`} defaultValue={v.title} error={e.title} small />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("courses.passPercent")} name="passPercent" id={`${key}-pass`} inputMode="numeric" defaultValue={v.passPercent} error={e.passPercent} small />
        <Field
          label={t("courses.attempts")}
          name="attemptsAllowed"
          id={`${key}-attempts`}
          inputMode="numeric"
          defaultValue={v.attemptsAllowed}
          hint={t("courses.attemptsHint")}
          error={e.attemptsAllowed}
          small
        />
        <Field
          label={t("courses.timeLimit")}
          name="timeLimit"
          id={`${key}-time`}
          inputMode="numeric"
          defaultValue={v.timeLimit}
          hint={t("courses.timeLimitHint")}
          error={e.timeLimit}
          small
        />
      </div>
      {/* 112.5 Questions drawn from the course's bank for each attempt. */}
      <Field
        label={t("lms.bankPicks")}
        name="bankPicks"
        id={`${key}-bank`}
        inputMode="numeric"
        defaultValue={v.bankPicks}
        hint={t("lms.bankPicksHint")}
        error={e.bankPicks}
        className="sm:max-w-[320px]"
        small
      />
      <TextArea id={`${key}-questions`} label={t("courses.questions")} name="questions" value={v.questions} rows={8} error={e.questions} hint={`${t("courses.questionsHint")} ${t("lms.shortAnswerHint")}`} />
      {/* 112.5 */}
      <div className="flex flex-col gap-2">
        <Check name="shuffle" label={t("lms.shuffle")} checked={v.shuffle === "on"} />
        <div className="flex flex-col gap-1">
          <Check name="showAnswers" label={t("lms.showAnswers")} checked={v.showAnswers === "on"} />
          <span className="ps-6 text-[13px] text-muted">{t("lms.showAnswersHint")}</span>
        </div>
      </div>
      {/* 113.7 A timed exam: open between two times, its time kept by the server. */}
      <details className="rounded-lg border border-line-soft p-3" open={v.exam === "on"}>
        <summary className="cursor-pointer text-[15px] font-semibold">{t("learning.examTitle")}</summary>
        <div className="flex flex-col gap-3 pt-3">
          <div className="flex flex-col gap-1">
            <Check name="exam" label={t("learning.exam")} checked={v.exam === "on"} />
            <span className="ps-6 text-[13px] text-muted">{t("learning.examHint")}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("learning.opensOn")} name="opensOn" id={`${key}-opens-on`} type="date" defaultValue={v.opensOn} error={e.opensOn} small />
            <Field label={t("learning.opensTime")} name="opensTime" id={`${key}-opens-time`} type="time" defaultValue={v.opensTime} small />
            <Field label={t("learning.closesOn")} name="closesOn" id={`${key}-closes-on`} type="date" defaultValue={v.closesOn} error={e.closesOn} small />
            <Field label={t("learning.closesTime")} name="closesTime" id={`${key}-closes-time`} type="time" defaultValue={v.closesTime} small />
          </div>
          <span className="text-[13px] text-muted">{t("learning.examTimesHint")}</span>
          <Check name="resultsAfterClose" label={t("learning.resultsAfterClose")} checked={v.resultsAfterClose === "on"} />
        </div>
      </details>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

export function StudentForm({ courseId, cohorts = [] }: { courseId: number; cohorts?: { id: number; name: string }[] }) {
  const t = useDashT();
  const [state, action] = useActionState(addStudentAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-2" key={state.ok ? state.message : "form"}>
      <div className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="courseId" value={courseId} />
        <Field
          label={t("courses.addStudent")}
          name="phone"
          type="tel"
          defaultValue={state.values?.phone}
          hint={t("courses.addStudentHint")}
          error={state.errors?.phone}
          className="min-w-[220px] flex-1"
          small
        />
        {/* 112.5 Into a cohort. */}
        <CohortSelect id={`f-student-cohort-${courseId}`} cohorts={cohorts} />
        <SubmitButton variant="secondary" className="h-11">
          {t("courses.addStudentButton")}
        </SubmitButton>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
    </form>
  );
}

/** 45 Whether students can save lessons for offline viewing. */
export function OfflineDownloadsForm({ current, wordpress, disabled }: { current: "on" | "off" | "plugin"; wordpress: boolean; disabled: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveOfflineDownloadsAction, initialFormState);
  const value = state.values?.downloads ?? current;
  const choices = [
    { value: "on", label: t("common.on"), hint: t("courses.offlineOnHint") },
    { value: "off", label: t("common.off"), hint: t("courses.offlineOffHint") },
    ...(wordpress ? [{ value: "plugin", label: t("courses.offlinePlugin"), hint: t("courses.offlinePluginHint") }] : []),
  ];
  return (
    <form action={action} noValidate className="flex flex-col gap-4" key={value}>
      <FormMessage message={state.message} ok={state.ok} />
      <fieldset disabled={disabled} className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={state.errors?.downloads ? "downloads-error" : undefined}>
        <legend className="sr-only">{t("courses.offline")}</legend>
        {choices.map((c) => (
          <label key={c.value} className="flex cursor-pointer items-start gap-2.5 text-[15px]">
            <input type="radio" name="downloads" value={c.value} defaultChecked={value === c.value} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col">
              <span className="font-semibold">{c.label}</span>
              <span className="text-sm text-muted">{c.hint}</span>
            </span>
          </label>
        ))}
        <FieldError id="downloads-error" error={state.errors?.downloads} />
      </fieldset>
      {disabled ? null : (
        <div className="flex justify-end">
          <SubmitButton className="h-11" pendingText={t("common.saving")}>
            {t("common.save")}
          </SubmitButton>
        </div>
      )}
    </form>
  );
}

/** 112.5 The course's question bank, in the quizzes' format. */
export function QuestionBankForm({ courseId, current }: { courseId: number; current: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveQuestionBankAction, initialFormState);
  const value = state.values?.bank ?? current;
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="courseId" value={courseId} />
      <TextArea id={`f-bank-${courseId}`} label={t("lms.bankQuestions")} name="bank" value={value} rows={10} error={state.errors?.bank} hint={`${t("courses.questionsHint")} ${t("lms.shortAnswerHint")}`} />
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("lms.saveBank")}
        </SubmitButton>
      </div>
    </form>
  );
}
