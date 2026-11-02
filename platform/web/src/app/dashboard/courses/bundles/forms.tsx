"use client";

import { useActionState } from "react";
import { saveBundleAction } from "@/app/actions/courses";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { FormActions, FormSection } from "@/components/page-kit";
import { initialFormState } from "@/lib/forms";

/** 113.1 A bundle's form: its title, description, picture, courses, the owner's price and whether it shows. */
export function BundleForm({
  current,
  courses,
  currency,
  imageUrl,
  submit,
}: {
  current: Record<string, string>;
  /** The academy's courses that can go in a bundle, with their own price shown. */
  courses: { id: number; title: string; price: string; hidden: boolean }[];
  currency: string;
  imageUrl: string | null;
  submit: string;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveBundleAction, initialFormState);
  const v = state.values ?? current;
  const e = state.errors ?? {};
  const chosen = new Set((v.courseIds ?? "").split(",").filter(Boolean).map(Number));
  const key = `f-bundle-${current.id || "new"}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-5" key={JSON.stringify(v)}>
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={current.id ?? ""} />
      {/* The page kit: the form in three parts. */}
      <FormSection id={`${key}-about`} title={t("lms.formBundle")}>
        <Field label={t("common.title")} name="title" defaultValue={v.title} error={e.title} small />
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="f-bundle-description" className="text-sm font-semibold">
            {t("common.description")}
          </label>
          <textarea id="f-bundle-description" name="description" rows={3} defaultValue={v.description} className="input min-h-[84px] py-2.5" />
          <FieldError id="f-bundle-description-error" error={e.description} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-bundle-image" className="text-sm font-semibold">
            {t("lms.bundlePicture")}
          </label>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- A small preview of an uploaded file.
            <img src={imageUrl} alt="" className="h-24 w-40 rounded-lg border border-line object-cover" />
          ) : null}
          <input id="f-bundle-image" type="file" name="image" accept="image/png,image/jpeg" className="text-sm" />
          <span className="text-[13px] text-muted">{t("courses.imageHint")}</span>
          {imageUrl ? (
            <label className="flex cursor-pointer items-center gap-2 text-[15px]">
              <input type="checkbox" name="removeImage" className="h-4 w-4 accent-midnight" />
              {t("courses.removeImage")}
            </label>
          ) : null}
          <FieldError id="f-bundle-image-error" error={e.image} />
        </div>
      </FormSection>
      <FormSection id={`${key}-courses`} title={t("lms.bundleCourses")} description={t("lms.bundleCoursesHint")}>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">{t("lms.bundleCourses")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {courses.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-[15px] has-[:checked]:border-midnight has-[:checked]:bg-sand">
                <input type="checkbox" name="courseIds" value={c.id} defaultChecked={chosen.has(c.id)} className="h-4 w-4 shrink-0 accent-midnight" />
                <span className="flex min-w-0 flex-col">
                  <span className="break-words">{c.title}</span>
                  <span className="text-[13px] text-muted">
                    {c.price}
                    {c.hidden ? ` · ${t("common.hidden")}` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id="f-bundle-courses-error" error={e.courseIds} />
        </fieldset>
      </FormSection>
      <FormSection id={`${key}-price`} title={t("lms.formBundlePrice")}>
        <Field
          label={t("lms.bundlePriceIn", { currency })}
          name="price"
          inputMode="decimal"
          defaultValue={v.price}
          hint={t("lms.bundlePriceHint")}
          error={e.price}
          className="sm:max-w-[320px]"
          small
        />
        <label className="flex cursor-pointer items-center gap-2 text-[15px]">
          <input type="checkbox" name="active" defaultChecked={v.active !== ""} className="h-4 w-4 accent-midnight" />
          {t("lms.bundleShow")}
        </label>
      </FormSection>
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {submit}
        </SubmitButton>
      </FormActions>
    </form>
  );
}
