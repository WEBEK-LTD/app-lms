"use client";

import { useActionState, useState, type ReactNode } from "react";
import { saveRideSettingsAction } from "@/app/actions/rides";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";
import { Choices } from "../delivery/forms";

/** 105.2 How fares are worked out, how rides reach drivers, cancelling, safety, payment, areas, promo codes and where drivers work. */
export function RideSettingsForm({
  values,
  currencies,
  timezones,
  bundleAllowed,
  bundleOff,
  driverAppNameDefault,
  driverFirebaseIos,
}: {
  values: Record<string, string>;
  currencies: readonly string[];
  timezones: readonly string[];
  bundleAllowed: boolean;
  /** Shown under the second app when the plan doesn't have it. */
  bundleOff: ReactNode;
  driverAppNameDefault: string;
  /** The drivers' iPhone app's Firebase file is in. */
  driverFirebaseIos: boolean;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveRideSettingsAction, initialFormState);
  const value = (key: string) => state.values?.[key] ?? values[key] ?? "";
  const checked = (key: string) => value(key) === "on";
  const [currency, setCurrency] = useState(value("currency"));
  const [driverApp, setDriverApp] = useState(value("driverApp"));
  const textArea = (name: "areas" | "promos", label: string, hint: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <textarea id={`f-${name}`} name={name} rows={4} maxLength={6000} defaultValue={value(name)} dir="ltr" className="input min-h-24 py-3" aria-describedby={`f-${name}-hint f-${name}-error`} />
      <span id={`f-${name}-hint`} className="text-[13px] text-muted">
        {hint}
      </span>
      <FieldError id={`f-${name}-error`} error={state.errors?.[name]} />
    </div>
  );
  const check = (name: string, label: string) => (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={checked(name)} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="text-[15px] font-semibold">{label}</span>
    </label>
  );
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FormMessage message={state.message} ok={state.ok} />
      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-currency" className="text-sm font-semibold">
              {t("rides.currency")}
            </label>
            <select id="f-currency" name="currency" defaultValue={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <FieldError id="f-currency-error" error={state.errors?.currency} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-timezone" className="text-sm font-semibold">
              {t("rides.timezone")}
            </label>
            <select id="f-timezone" name="timezone" defaultValue={value("timezone")} className="input" aria-describedby="f-timezone-hint">
              {timezones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <span id="f-timezone-hint" className="text-[13px] text-muted">
              {t("rides.timezoneHint")}
            </span>
            <FieldError id="f-timezone-error" error={state.errors?.timezone} />
          </div>
        </div>
        <Choices
          legend={t("rides.fareMode")}
          name="fareMode"
          value={value("fareMode")}
          error={state.errors?.fareMode}
          options={[
            { value: "upfront", label: t("rides.fareUpfront"), hint: t("rides.fareUpfrontHint") },
            { value: "metered", label: t("rides.fareMetered"), hint: t("rides.fareMeteredHint") },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("rides.yourShareSetting")} name="share" inputMode="decimal" defaultValue={value("share")} error={state.errors?.share} hint={t("rides.yourShareHint")} />
          <Field label={t("rides.speed")} name="speedKmh" inputMode="numeric" defaultValue={value("speedKmh")} error={state.errors?.speedKmh} hint={t("rides.speedHint")} />
        </div>
      </section>

      <fieldset className="m-0 flex flex-col gap-3 border-0 border-t border-line-soft p-0 pt-5">
        <legend className="float-left mb-1 w-full text-[17px] font-bold">{t("rides.payWays")}</legend>
        {check("cash", t("rides.payCash"))}
        {check("card", t("rides.payCard"))}
        <FieldError id="f-cash-error" error={state.errors?.cash} />
      </fieldset>

      <section className="flex flex-col gap-4 border-t border-line-soft pt-5">
        <Choices
          legend={t("rides.matching")}
          name="matching"
          value={value("matching")}
          error={state.errors?.matching}
          options={[
            { value: "nearest", label: t("rides.matchNearest"), hint: t("rides.matchNearestHint") },
            { value: "dispatch", label: t("rides.matchDispatch"), hint: t("rides.matchDispatchHint") },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("rides.matchRadius")} name="matchRadiusKm" inputMode="decimal" defaultValue={value("matchRadiusKm")} error={state.errors?.matchRadiusKm} />
          <Field label={t("rides.offerSeconds")} name="offerSeconds" inputMode="numeric" defaultValue={value("offerSeconds")} error={state.errors?.offerSeconds} />
        </div>
        {check("scheduling", t("rides.scheduling"))}
      </section>

      <section className="flex flex-col gap-4 border-t border-line-soft pt-5">
        <h3 className="m-0 text-[17px] font-bold">{t("rides.cancelling")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("rides.cancelFreeMinutes")} name="cancelFreeMinutes" inputMode="numeric" defaultValue={value("cancelFreeMinutes")} error={state.errors?.cancelFreeMinutes} />
          <Field label={t("rides.cancelFee", { currency })} name="cancelFee" inputMode="decimal" defaultValue={value("cancelFee")} error={state.errors?.cancelFee} hint={t("rides.cancelFeeHint")} />
          <Field label={t("rides.noShowMinutes")} name="noShowMinutes" inputMode="numeric" defaultValue={value("noShowMinutes")} error={state.errors?.noShowMinutes} />
          <Field label={t("rides.freeWaitMinutes")} name="freeWaitMinutes" inputMode="numeric" defaultValue={value("freeWaitMinutes")} error={state.errors?.freeWaitMinutes} />
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-line-soft pt-5">
        <h3 className="m-0 text-[17px] font-bold">{t("rides.safety")}</h3>
        {check("pin", t("rides.pin"))}
        <Field label={t("rides.emergencyPhone")} name="emergencyPhone" type="tel" dir="ltr" defaultValue={value("emergencyPhone")} error={state.errors?.emergencyPhone} hint={t("rides.emergencyHint")} />
      </section>

      <section className="flex flex-col gap-4 border-t border-line-soft pt-5">
        {textArea("areas", t("rides.areas"), t("rides.areasHint"))}
        {textArea("promos", t("rides.promos"), t("rides.promosHint"))}
      </section>

      <section className="flex flex-col gap-4 border-t border-line-soft pt-5">
        <Choices
          legend={t("rides.driverApp")}
          name="driverApp"
          value={driverApp}
          onChange={setDriverApp}
          error={state.errors?.driverApp}
          options={[
            { value: "same", label: t("rides.driverAppSame"), hint: t("rides.driverAppSameHint") },
            {
              value: "bundle",
              label: t("rides.driverAppBundle"),
              hint: t("rides.driverAppBundleHint"),
              disabled: !bundleAllowed && value("driverApp") !== "bundle",
              extra: bundleAllowed ? null : <span className="text-[13px]">{bundleOff}</span>,
            },
          ]}
        />
        <div className={driverApp === "bundle" ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
          <Field label={t("rides.driverAppName")} name="driverAppName" defaultValue={value("driverAppName")} maxLength={30} error={state.errors?.driverAppName} hint={t("rides.driverAppNameHint", { name: driverAppNameDefault })} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-driverFirebaseIos" className="text-sm font-semibold">
              {t("rides.driverFirebaseIos")}
            </label>
            <input id="f-driverFirebaseIos" type="file" name="driverFirebaseIos" accept=".plist,application/xml,text/xml" className="text-sm" />
            <span className="text-[13px] text-muted">{t(driverFirebaseIos ? "rides.driverFirebaseIosSaved" : "rides.driverFirebaseIosHint")}</span>
            <FieldError id="f-driverFirebaseIos-error" error={state.errors?.driverFirebaseIos} />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("rides.saveSettings")}
        </SubmitButton>
      </div>
    </form>
  );
}
