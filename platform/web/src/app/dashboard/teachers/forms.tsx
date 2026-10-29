"use client";

import { useActionState } from "react";
import { answerApplicationAction, reviewCourseAction, saveTeacherAction } from "@/app/actions/teachers";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 105.3 A teacher: the number (or email) they sign in with, about them, their subjects, share and photo. */
export function TeacherForm({ id, values, emailOnly, photoUrl }: { id: number | null; values: Record<string, string>; emailOnly: boolean; photoUrl: string | null }) {
  const t = useDashT();
  const [state, action] = useActionState(saveTeacherAction, initialFormState);
  const value = (key: string) => state.values?.[key] ?? values[key] ?? "";
  const suffix = id ? `-${id}` : "-new";
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`t-name${suffix}`} label={t("teachers.name")} name="name" defaultValue={value("name")} maxLength={80} error={state.errors?.name} required />
        {emailOnly ? (
          <Field id={`t-email${suffix}`} label={t("teachers.email")} name="email" type="email" defaultValue={value("email")} error={state.errors?.email} hint={t("teachers.emailHint")} />
        ) : (
          <Field id={`t-phone${suffix}`} label={t("teachers.phone")} name="phone" type="tel" dir="ltr" defaultValue={value("phone")} error={state.errors?.phone} hint={t("teachers.phoneHint")} />
        )}
        <Field id={`t-subjects${suffix}`} label={t("teachers.subjects")} name="subjects" defaultValue={value("subjects")} maxLength={400} error={state.errors?.subjects} hint={t("teachers.subjectsHint")} />
        <Field id={`t-share${suffix}`} label={t("teachers.share")} name="share" inputMode="decimal" defaultValue={value("share")} error={state.errors?.share} hint={t("teachers.shareHint")} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`t-bio${suffix}`} className="text-sm font-semibold">
          {t("teachers.bio")}
        </label>
        <textarea id={`t-bio${suffix}`} name="bio" rows={4} maxLength={1000} defaultValue={value("bio")} className="input min-h-24 py-3" aria-describedby={`t-bio${suffix}-hint t-bio${suffix}-error`} />
        <span id={`t-bio${suffix}-hint`} className="text-[13px] text-muted">
          {t("teachers.bioHint")}
        </span>
        <FieldError id={`t-bio${suffix}-error`} error={state.errors?.bio} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`t-photo${suffix}`} className="text-sm font-semibold">
          {t("teachers.photo")}
        </label>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : null}
        <input id={`t-photo${suffix}`} type="file" name="photo" accept="image/png,image/jpeg" className="text-sm" aria-describedby={`t-photo${suffix}-hint`} />
        <span id={`t-photo${suffix}-hint`} className="text-[13px] text-muted">
          {t("teachers.photoHint")}
        </span>
        {photoUrl ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removePhoto" className="h-4 w-4 accent-midnight" />
            {t("teachers.removePhoto")}
          </label>
        ) : null}
        <FieldError id={`t-photo${suffix}-error`} error={state.errors?.photo} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={value("featured") === "on"} className="h-4 w-4 accent-midnight" />
        {t("teachers.featured")}
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {id ? t("teachers.save") : t("teachers.addButton")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** An application to teach: approve with a share, or decline with a note. */
export function ApplicationForm({ id }: { id: number }) {
  const t = useDashT();
  const [state, action] = useActionState(answerApplicationAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`a-share-${id}`} label={t("teachers.share")} name="share" inputMode="decimal" defaultValue={state.values?.share ?? ""} error={state.errors?.share} hint={t("teachers.shareHint")} />
        <Field id={`a-note-${id}`} label={t("teachers.declineNote")} name="note" maxLength={500} placeholder={t("teachers.declineNotePlaceholder")} defaultValue={state.values?.note ?? ""} />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <SubmitButton name="decision" value="decline" variant="secondary" className="h-10">
          {t("teachers.decline")}
        </SubmitButton>
        <SubmitButton name="decision" value="approve" className="h-10">
          {t("teachers.approve")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** A teacher's course waiting for review: publish it, or send it back with a note. */
export function ReviewForm({ courseId }: { courseId: number }) {
  const t = useDashT();
  const [state, action] = useActionState(reviewCourseAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="courseId" value={courseId} />
      <Field id={`r-note-${courseId}`} label={t("teachers.sendBackNote")} name="note" maxLength={500} defaultValue={state.values?.note ?? ""} error={state.errors?.note} />
      <div className="flex flex-wrap justify-end gap-2">
        <SubmitButton name="decision" value="return" variant="secondary" className="h-10">
          {t("teachers.sendBack")}
        </SubmitButton>
        <SubmitButton name="decision" value="publish" className="h-10">
          {t("teachers.publish")}
        </SubmitButton>
      </div>
    </form>
  );
}
