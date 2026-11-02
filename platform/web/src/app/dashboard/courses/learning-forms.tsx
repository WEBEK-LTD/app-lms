"use client";

import { useActionState } from "react";
import { saveGamificationAction, savePathAction } from "@/app/actions/courses";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { FormActions } from "@/components/page-kit";
import { initialFormState } from "@/lib/forms";

/** 113.7 Learning paths, and points and badges on or off. */

export function PathForm({ current, courses, submit }: { current: Record<string, string>; courses: { id: number; title: string }[]; submit: string }) {
  const t = useDashT();
  const [state, action] = useActionState(savePathAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const key = `path-${current.id || "new"}`;
  const chosen = (v.courseIds ?? "").split(",").filter(Boolean).map(Number);
  const place = new Map(chosen.map((id, i) => [id, String(i + 1)]));
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={current.id ? JSON.stringify(v) : state.ok ? state.message : "new"}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      <Field label={t("learning.pathTitle")} name="title" id={`${key}-title`} defaultValue={v.title} error={e.title} small />
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={`${key}-description`} className="text-sm font-semibold">
          {t("common.description")}
        </label>
        <textarea id={`${key}-description`} name="description" rows={2} defaultValue={v.description} className="input min-h-[64px] py-2.5" />
        <FieldError id={`${key}-description-error`} error={e.description} />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1.5 text-sm font-semibold">{t("learning.pathCourses")}</legend>
        <span className="text-[13px] text-muted">{t("learning.pathCoursesHint")}</span>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {courses.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[15px]">
                <input type="checkbox" name="courseIds" value={c.id} defaultChecked={place.has(c.id)} className="h-4 w-4 accent-midnight" />
                <span className="truncate">{c.title}</span>
              </label>
              <label className="sr-only" htmlFor={`${key}-place-${c.id}`}>
                {t("learning.placeOf", { course: c.title })}
              </label>
              <input id={`${key}-place-${c.id}`} name={`place-${c.id}`} inputMode="numeric" defaultValue={place.get(c.id) ?? ""} placeholder="#" className="input input-sm w-16 text-center" />
            </li>
          ))}
        </ul>
        <FieldError id={`${key}-courses-error`} error={e.courseIds} />
      </fieldset>
      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="inOrder" defaultChecked={v.inOrder === "on"} className="h-4 w-4 accent-midnight" />
          {t("learning.inOrder")}
        </label>
        <span className="ps-6 text-[13px] text-muted">{t("learning.inOrderHint")}</span>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[15px]">
        <input type="checkbox" name="active" defaultChecked={v.active !== ""} className="h-4 w-4 accent-midnight" />
        {t("learning.pathShown")}
      </label>
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function GamificationForm({ on }: { on: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(saveGamificationAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-[15px]">
        <input type="checkbox" name="gamification" defaultChecked={on} className="h-4 w-4 accent-midnight" />
        {t("learning.gamificationOn")}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <FormMessage message={state.message} ok={state.ok} />
        <SubmitButton variant="secondary" className="h-10">
          {t("common.save")}
        </SubmitButton>
      </div>
    </form>
  );
}
