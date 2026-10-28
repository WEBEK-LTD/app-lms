"use client";

import { useActionState } from "react";
import { saveVehicleTypeAction } from "@/app/actions/rides";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

/** 105.2 A vehicle type: its name, icon, seats, fares and picture. */
export function VehicleTypeForm({
  id,
  values,
  currency,
  icons,
  imageUrl,
}: {
  id: number | null;
  values: Record<string, string>;
  currency: string;
  icons: readonly string[];
  imageUrl: string | null;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveVehicleTypeAction, initialFormState);
  const value = (key: string) => state.values?.[key] ?? values[key] ?? "";
  const suffix = id ? `-${id}` : "-new";
  const money = (key: "rides.base" | "rides.perKm" | "rides.perMinute" | "rides.min" | "rides.waitPerMinute") => t(key, { currency });
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-name${suffix}`} label={t("rides.typeName")} name="name" defaultValue={value("name")} maxLength={60} error={state.errors?.name} required />
        <Field id={`f-seats${suffix}`} label={t("rides.seats")} name="seats" inputMode="numeric" defaultValue={value("seats")} error={state.errors?.seats} />
        <Field id={`f-description${suffix}`} label={t("rides.typeDescription")} name="description" defaultValue={value("description")} maxLength={200} error={state.errors?.description} className="sm:col-span-2" />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">{t("rides.icon")}</legend>
        <div className="flex flex-wrap gap-2">
          {icons.map((icon) => (
            <label key={icon} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 has-[:checked]:border-midnight has-[:checked]:bg-sand">
              <input type="radio" name="icon" value={icon} defaultChecked={value("icon") === icon} className="sr-only" />
              <span aria-hidden="true" className="material-symbols-rounded text-[22px]">
                {icon}
              </span>
              <span className="sr-only">{icon}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`f-base${suffix}`} label={money("rides.base")} name="base" inputMode="decimal" defaultValue={value("base")} error={state.errors?.base} />
        <Field id={`f-perKm${suffix}`} label={money("rides.perKm")} name="perKm" inputMode="decimal" defaultValue={value("perKm")} error={state.errors?.perKm} />
        <Field id={`f-perMinute${suffix}`} label={money("rides.perMinute")} name="perMinute" inputMode="decimal" defaultValue={value("perMinute")} error={state.errors?.perMinute} />
        <Field id={`f-min${suffix}`} label={money("rides.min")} name="min" inputMode="decimal" defaultValue={value("min")} error={state.errors?.min} />
        <Field id={`f-wait${suffix}`} label={money("rides.waitPerMinute")} name="waitPerMinute" inputMode="decimal" defaultValue={value("waitPerMinute")} error={state.errors?.waitPerMinute} hint={t("rides.waitHint")} className="sm:col-span-2" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-image${suffix}`} className="text-sm font-semibold">
          {t("rides.picture")}
        </label>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-16 w-auto max-w-[160px] rounded-lg object-contain" />
        ) : null}
        <input id={`f-image${suffix}`} type="file" name="image" accept="image/png,image/jpeg" className="text-sm" />
        {imageUrl ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeImage" className="h-4 w-4 accent-midnight" />
            {t("rides.removePicture")}
          </label>
        ) : null}
        <FieldError id={`f-image${suffix}-error`} error={state.errors?.image} />
      </div>
      <label className="flex items-center gap-2 text-[15px] font-semibold">
        <input type="checkbox" name="active" defaultChecked={value("active") === "on"} className="h-4 w-4 accent-midnight" />
        {t("rides.shownInApp")}
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {id ? t("rides.saveType") : t("rides.add")}
        </SubmitButton>
      </div>
    </form>
  );
}
