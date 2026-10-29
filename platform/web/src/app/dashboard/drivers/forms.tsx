"use client";

import { useActionState } from "react";
import { saveDriverAction } from "@/app/actions/rides";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 105.2 A driver: the number (or email) they sign in with, their vehicle type and car, their photo and papers, their own share. */
export function DriverForm({
  id,
  values,
  emailOnly,
  types,
  usualShare,
  photoUrl,
  documents,
}: {
  id: number | null;
  values: Record<string, string>;
  emailOnly: boolean;
  types: { id: number; name: string }[];
  usualShare: string;
  photoUrl: string | null;
  documents: { label: string; assetId: string; url: string }[];
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveDriverAction, initialFormState);
  const value = (key: string) => state.values?.[key] ?? values[key] ?? "";
  const suffix = id ? `-${id}` : "-new";
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-name${suffix}`} label={t("rides.name")} name="name" defaultValue={value("name")} maxLength={80} error={state.errors?.name} required />
        {emailOnly ? (
          <Field id={`f-email${suffix}`} label={t("rides.email")} name="email" type="email" defaultValue={value("email")} error={state.errors?.email} hint={t("rides.emailHint")} />
        ) : (
          <Field id={`f-phone${suffix}`} label={t("rides.phone")} name="phone" type="tel" dir="ltr" defaultValue={value("phone")} error={state.errors?.phone} hint={t("rides.phoneHint")} />
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`f-type${suffix}`} className="text-sm font-semibold">
            {t("rides.vehicleTypeOf")}
          </label>
          <select id={`f-type${suffix}`} name="vehicleTypeId" defaultValue={value("vehicleTypeId")} className="input">
            <option value="">{t("rides.noType")}</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <FieldError id={`f-type${suffix}-error`} error={state.errors?.vehicleTypeId} />
        </div>
        <Field id={`f-car${suffix}`} label={t("rides.carModel")} name="carModel" defaultValue={value("carModel")} maxLength={40} error={state.errors?.carModel} />
        <Field id={`f-color${suffix}`} label={t("rides.carColor")} name="carColor" defaultValue={value("carColor")} maxLength={40} error={state.errors?.carColor} />
        <Field id={`f-plate${suffix}`} label={t("rides.plate")} name="plate" dir="auto" defaultValue={value("plate")} maxLength={20} error={state.errors?.plate} />
        <Field id={`f-share${suffix}`} label={t("rides.driverShare")} name="share" inputMode="decimal" defaultValue={value("share")} error={state.errors?.share} hint={t("rides.driverShareHint", { percent: usualShare })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-photo${suffix}`} className="text-sm font-semibold">
          {t("rides.photo")}
        </label>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : null}
        <input id={`f-photo${suffix}`} type="file" name="photo" accept="image/png,image/jpeg" className="text-sm" aria-describedby={`f-photo${suffix}-hint`} />
        <span id={`f-photo${suffix}-hint`} className="text-[13px] text-muted">
          {t("rides.photoHint")}
        </span>
        {photoUrl ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removePhoto" className="h-4 w-4 accent-midnight" />
            {t("rides.removePhoto")}
          </label>
        ) : null}
        <FieldError id={`f-photo${suffix}-error`} error={state.errors?.photo} />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("rides.documents")}</legend>
        <p className="m-0 text-[13px] text-muted">{t("rides.documentsHint")}</p>
        {documents.map((d) => (
          <div key={d.assetId} className="flex flex-wrap items-center gap-3 text-sm">
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold">
              {d.label}
            </a>
            <label className="flex items-center gap-2">
              <input type="checkbox" name={`removeDocument-${d.assetId}`} className="h-4 w-4 accent-midnight" />
              {t("rides.removeDocument", { label: d.label })}
            </label>
          </div>
        ))}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`f-doclabel${suffix}`} label={t("rides.documentLabel")} name="documentLabel" placeholder={t("rides.documentLabelPlaceholder")} maxLength={60} error={state.errors?.documentLabel} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`f-doc${suffix}`} className="text-sm font-semibold">
              {t("rides.documentFile")}
            </label>
            <input id={`f-doc${suffix}`} type="file" name="document" accept="application/pdf,image/png,image/jpeg" className="text-sm" />
            <FieldError id={`f-doc${suffix}-error`} error={state.errors?.document} />
          </div>
        </div>
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {id ? t("rides.saveDriver") : t("rides.add")}
        </SubmitButton>
      </div>
    </form>
  );
}
