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
} from "@/app/actions/courses";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { initialFormState } from "@/lib/forms";
import { MediaPickButton } from "@/components/media-picker";
import { useDashT } from "@/components/dashboard-i18n";

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
}: {
  current: Record<string, string>;
  categories: { id: number; name: string }[];
  currency: string;
  imageUrl: string | null;
  submit: string;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveCourseAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const chosen = new Set((v.categoryIds ?? "").split(",").filter(Boolean).map(Number));
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Check name="preview" label={t("courses.freePreview")} checked={v.preview === "on"} />
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

export function StudentForm({ courseId }: { courseId: number }) {
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
