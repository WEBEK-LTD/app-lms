"use client";

import { useActionState, useState, type ReactNode } from "react";
import { saveDeliveryServiceAction, saveDeliverySettingsAction } from "@/app/actions/delivery";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

export interface SettingsFormValues {
  currency: string;
  pricing: string;
  fixed: string;
  base: string;
  perKm: string;
  min: string;
  maxKm: string;
  zones: string;
  cash: boolean;
  card: boolean;
  tracking: string;
  assignment: string;
  courierApp: string;
  /** 104.6 The courier app's own name, and its name when none is given. */
  courierAppName: string;
  courierAppNameDefault: string;
  /** 104.6 Whether the courier iPhone app's Firebase file is in. */
  courierFirebaseIos: boolean;
}

function Choices({
  legend,
  name,
  value,
  onChange,
  options,
  error,
}: {
  legend: string;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  options: { value: string; label: string; hint: string; disabled?: boolean; extra?: ReactNode }[];
  error?: string;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 text-[15px] font-bold">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={`flex items-start gap-3 ${o.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={value === o.value}
            disabled={o.disabled}
            onChange={() => onChange?.(o.value)}
            className="mt-1 h-4 w-4 accent-midnight"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{o.label}</span>
            <span className="text-[13px] text-muted">{o.hint}</span>
            {o.extra}
          </span>
        </label>
      ))}
      <FieldError id={`f-${name}-error`} error={error} />
    </fieldset>
  );
}

/** 105.1 A food company's own settings. */
export interface FoodSettingsValues {
  cuisines: string;
  foodCourierJob: string;
  timezone: string;
  timezones: readonly string[];
}

/** 104 How the company prices, takes payment, follows parcels, gives out jobs and where its couriers work. 105.1 A food company's too, with its cuisines, when a courier gets an order and its time zone. */
export function DeliverySettingsForm({
  settings,
  currencies,
  bundleAllowed,
  bundleOff,
  food,
}: {
  settings: SettingsFormValues;
  currencies: readonly string[];
  bundleAllowed: boolean;
  /** Shown under the second app when the plan doesn't have it. */
  bundleOff: ReactNode;
  food?: FoodSettingsValues;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveDeliverySettingsAction, initialFormState);
  const value = (key: Exclude<keyof SettingsFormValues, "cash" | "card" | "courierFirebaseIos">) => state.values?.[key] ?? settings[key];
  const checked = (key: "cash" | "card") => (state.values ? state.values[key] === "on" : settings[key]);
  const [pricing, setPricing] = useState(value("pricing"));
  const [currency, setCurrency] = useState(value("currency"));
  const [courierApp, setCourierApp] = useState(value("courierApp"));
  const money = (key: "delivery.fixed" | "delivery.base" | "delivery.perKm" | "delivery.min") => t(key, { currency });
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormMessage message={state.message} ok={state.ok} />
      <section className="flex flex-col gap-4">
        <h3 className="m-0 text-[17px] font-bold">{t("delivery.pricing")}</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-currency" className="text-sm font-semibold">
            {t("delivery.currency")}
          </label>
          <select id="f-currency" name="currency" defaultValue={currency} onChange={(e) => setCurrency(e.target.value)} className="input max-w-[200px]">
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError id="f-currency-error" error={state.errors?.currency} />
        </div>
        <Choices
          legend={t("delivery.pricingMode")}
          name="pricing"
          value={pricing}
          onChange={setPricing}
          error={state.errors?.pricing}
          options={[
            { value: "fixed", label: t("delivery.modeFixed"), hint: t("delivery.modeFixedHint") },
            { value: "distance", label: t("delivery.modeDistance"), hint: t("delivery.modeDistanceHint") },
            { value: "zone", label: t("delivery.modeZone"), hint: t("delivery.modeZoneHint") },
          ]}
        />
        <div className={pricing === "fixed" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <Field label={money("delivery.fixed")} name="fixed" inputMode="decimal" defaultValue={value("fixed")} error={state.errors?.fixed} />
        </div>
        <div className={pricing === "distance" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <Field label={money("delivery.base")} name="base" inputMode="decimal" defaultValue={value("base")} error={state.errors?.base} />
          <Field label={money("delivery.perKm")} name="perKm" inputMode="decimal" defaultValue={value("perKm")} error={state.errors?.perKm} />
          <Field label={money("delivery.min")} name="min" inputMode="decimal" defaultValue={value("min")} error={state.errors?.min} hint={t("delivery.minHint")} />
          <Field label={t("delivery.maxKm")} name="maxKm" inputMode="decimal" defaultValue={value("maxKm")} error={state.errors?.maxKm} hint={t("delivery.maxKmHint")} />
        </div>
        <div className={pricing === "zone" ? "flex flex-col gap-1.5" : "hidden"}>
          <label htmlFor="f-zones" className="text-sm font-semibold">
            {t("delivery.zones")}
          </label>
          <textarea id="f-zones" name="zones" rows={6} maxLength={6000} defaultValue={value("zones")} className="input min-h-28 py-3" aria-describedby="f-zones-hint f-zones-error" />
          <span id="f-zones-hint" className="text-[13px] text-muted">
            {t("delivery.zonesHint")}
          </span>
          <FieldError id="f-zones-error" error={state.errors?.zones} />
        </div>
      </section>

      <fieldset className="m-0 flex flex-col gap-3 border-0 border-t border-line-soft p-0 pt-5">
        <legend className="float-left mb-1 w-full text-[17px] font-bold">{t("delivery.paying")}</legend>
        {(
          [
            ["cash", t("delivery.payCash"), t("delivery.payCashHint")],
            ["card", t("delivery.payCard"), t("delivery.payCardHint")],
          ] as const
        ).map(([name, label, hint]) => (
          <label key={name} className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" name={name} defaultChecked={checked(name)} className="mt-1 h-4 w-4 accent-midnight" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{label}</span>
              <span className="text-[13px] text-muted">{hint}</span>
            </span>
          </label>
        ))}
        <FieldError id="f-cash-error" error={state.errors?.cash} />
      </fieldset>

      <div className="flex flex-col gap-6 border-t border-line-soft pt-5">
        <Choices
          legend={t("delivery.tracking")}
          name="tracking"
          value={value("tracking")}
          error={state.errors?.tracking}
          options={[
            { value: "stages", label: t("delivery.trackStages"), hint: t("delivery.trackStagesHint") },
            { value: "live", label: t("delivery.trackLive"), hint: t("delivery.trackLiveHint") },
          ]}
        />
        <Choices
          legend={t("delivery.assignment")}
          name="assignment"
          value={value("assignment")}
          error={state.errors?.assignment}
          options={[
            { value: "dispatch", label: t("delivery.assignDispatch"), hint: t("delivery.assignDispatchHint") },
            { value: "open", label: t("delivery.assignOpen"), hint: t("delivery.assignOpenHint") },
          ]}
        />
        <Choices
          legend={t("delivery.courierApp")}
          name="courierApp"
          value={value("courierApp")}
          onChange={setCourierApp}
          error={state.errors?.courierApp}
          options={[
            { value: "same", label: t("delivery.courierSame"), hint: t("delivery.courierSameHint") },
            {
              value: "bundle",
              label: t("delivery.courierBundle"),
              hint: t("delivery.courierBundleHint"),
              disabled: !bundleAllowed && settings.courierApp !== "bundle",
              extra: bundleAllowed ? null : <span className="text-[13px]">{bundleOff}</span>,
            },
            { value: "yallapp_courier", label: t("delivery.courierYallapp"), hint: t("delivery.courierYallappHint"), disabled: settings.courierApp !== "yallapp_courier" },
          ]}
        />
        {/* 104.6 The courier app's name in the stores, and the Firebase file of its iPhone app. */}
        {courierApp === "bundle" && bundleAllowed ? (
          <div className="ms-7 flex max-w-[420px] flex-col gap-3">
            <Field
              label={t("delivery.courierAppName")}
              name="courierAppName"
              maxLength={30}
              defaultValue={value("courierAppName")}
              placeholder={settings.courierAppNameDefault}
              hint={t("delivery.courierAppNameHint", { name: settings.courierAppNameDefault })}
              error={state.errors?.courierAppName}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-courierFirebaseIos" className="text-sm font-semibold">
                {t("delivery.courierFirebaseIos")}
              </label>
              <input id="f-courierFirebaseIos" type="file" name="courierFirebaseIos" accept=".plist,application/xml,text/xml" className="text-sm" />
              <span className="text-[13px] text-muted">{t(settings.courierFirebaseIos ? "delivery.courierFirebaseIosSaved" : "delivery.courierFirebaseIosHint")}</span>
              <FieldError id="f-courierFirebaseIos-error" error={state.errors?.courierFirebaseIos} />
            </div>
          </div>
        ) : null}
      </div>

      {food ? (
        <section className="flex flex-col gap-5 border-t border-line-soft pt-5">
          <h3 className="m-0 text-[17px] font-bold">{t("food.foodSettings")}</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-cuisines" className="text-sm font-semibold">
              {t("food.cuisinesText")}
            </label>
            <textarea id="f-cuisines" name="cuisines" rows={5} maxLength={2000} defaultValue={state.values?.cuisines ?? food.cuisines} className="input min-h-24 py-3" aria-describedby="f-cuisines-hint f-cuisines-error" />
            <span id="f-cuisines-hint" className="text-[13px] text-muted">
              {t("food.cuisinesTextHint")}
            </span>
            <FieldError id="f-cuisines-error" error={state.errors?.cuisines} />
          </div>
          <Choices
            legend={t("food.courierJob_legend")}
            name="foodCourierJob"
            value={state.values?.foodCourierJob ?? food.foodCourierJob}
            error={state.errors?.foodCourierJob}
            options={[
              { value: "accepted", label: t("food.courierJob_accepted"), hint: t("food.courierJob_acceptedHint") },
              { value: "ready", label: t("food.courierJob_ready"), hint: t("food.courierJob_readyHint") },
            ]}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-timezone" className="text-sm font-semibold">
              {t("food.timezone")}
            </label>
            <select id="f-timezone" name="timezone" defaultValue={state.values?.timezone ?? food.timezone} className="input max-w-[280px]" dir="ltr">
              {food.timezones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <FieldError id="f-timezone-error" error={state.errors?.timezone} />
          </div>
        </section>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("delivery.saveSettings")}
        </SubmitButton>
      </div>
    </form>
  );
}

export interface ServiceFormValues {
  id: number | null;
  name: string;
  description: string;
  extra: string;
  eta: string;
  active: boolean;
  imageUrl: string | null;
}

/** 104 A service customers choose when they send a parcel. */
export function ServiceForm({ service, currency }: { service: ServiceFormValues; currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveDeliveryServiceAction, initialFormState);
  const value = (key: "name" | "description" | "extra" | "eta") => state.values?.[key] ?? service[key];
  const suffix = service.id ? `-${service.id}` : "-new";
  return (
    <form action={action} noValidate encType="multipart/form-data" className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {service.id ? <input type="hidden" name="id" value={service.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-name${suffix}`} label={t("delivery.serviceName")} name="name" defaultValue={value("name")} maxLength={80} error={state.errors?.name} required />
        <Field id={`f-extra${suffix}`} label={t("delivery.extra", { currency })} name="extra" inputMode="decimal" defaultValue={value("extra")} error={state.errors?.extra} hint={t("delivery.extraHint")} />
        <Field id={`f-eta${suffix}`} label={t("delivery.eta")} name="eta" defaultValue={value("eta")} maxLength={60} error={state.errors?.eta} hint={t("delivery.etaHint")} />
        <Field id={`f-description${suffix}`} label={t("delivery.serviceDescription")} name="description" defaultValue={value("description")} maxLength={300} error={state.errors?.description} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-image${suffix}`} className="text-sm font-semibold">
          {t("delivery.picture")}
        </label>
        {service.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- the service's picture, served by our own asset route
          <img src={service.imageUrl} alt="" className="h-20 w-28 rounded-lg object-cover" />
        ) : null}
        <input id={`f-image${suffix}`} name="image" type="file" accept="image/png,image/jpeg" className="text-sm" aria-describedby={`f-image${suffix}-hint`} />
        <span id={`f-image${suffix}-hint`} className="text-[13px] text-muted">
          {t("delivery.pictureHint")}
        </span>
        <FieldError id={`f-image${suffix}-error`} error={state.errors?.image} />
        {service.imageUrl ? (
          <label className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input type="checkbox" name="removeImage" className="h-4 w-4 accent-midnight" />
            {t("delivery.removePicture")}
          </label>
        ) : null}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[15px] font-semibold">
        <input type="checkbox" name="active" defaultChecked={state.values ? state.values.active === "on" : service.active} className="h-4 w-4 accent-midnight" />
        {t("delivery.activeService")}
      </label>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("delivery.saveService")}
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * The "Add a service" box, open while there are no services. Once opened it
 * stays open across the page's refresh after an add, so the form's message
 * stays in view.
 */
export function AddServiceBox({ title, open, children }: { title: string; open: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(open);
  return (
    <details className="rounded-xl border border-line p-4" open={shown} onToggle={(e) => setShown(e.currentTarget.open)}>
      <summary className="cursor-pointer text-[15px] font-bold">{title}</summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}
