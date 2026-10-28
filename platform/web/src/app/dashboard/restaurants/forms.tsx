"use client";

import { useActionState } from "react";
import { addSectionAction, addStaffAction, foodOrderStepAction, renameSectionAction, saveDishAction, saveHoursAction, saveRestaurantAction } from "@/app/actions/food";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { initialFormState } from "@/lib/forms";

export interface RestaurantFormValues {
  id: number | null;
  name: string;
  description: string;
  phone: string;
  address: string;
  details: string;
  map: string;
  cuisines: string[];
  prepMinutes: string;
  minOrder: string;
  maxKm: string;
  commission: string;
  logoUrl: string | null;
  coverUrl: string | null;
}

/** 105.1 A restaurant's details: where it is, what it cooks, how long it takes, the company's share. */
export function RestaurantForm({ restaurant, cuisines, currency }: { restaurant: RestaurantFormValues; cuisines: { id: string; name: string }[]; currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveRestaurantAction, initialFormState);
  const value = (key: Exclude<keyof RestaurantFormValues, "id" | "cuisines" | "logoUrl" | "coverUrl">) => state.values?.[key] ?? restaurant[key];
  const suffix = restaurant.id ? `-${restaurant.id}` : "";
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {restaurant.id ? <input type="hidden" name="restaurant" value={restaurant.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-name${suffix}`} label={t("food.name")} name="name" defaultValue={value("name")} maxLength={80} error={state.errors?.name} required />
        <Field id={`f-phone${suffix}`} label={t("food.phone")} name="phone" type="tel" dir="ltr" defaultValue={value("phone")} error={state.errors?.phone} hint={t("food.phoneHint")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-description${suffix}`} className="text-sm font-semibold">
          {t("food.about")}
        </label>
        <textarea id={`f-description${suffix}`} name="description" rows={2} maxLength={500} defaultValue={value("description")} className="input min-h-16 py-3" />
        <FieldError id={`f-description${suffix}-error`} error={state.errors?.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-address${suffix}`} label={t("food.address")} name="address" defaultValue={value("address")} maxLength={300} error={state.errors?.address} required />
        <Field id={`f-details${suffix}`} label={t("food.addressDetails")} name="details" defaultValue={value("details")} maxLength={200} />
      </div>
      <Field id={`f-map${suffix}`} label={t("food.map")} name="map" dir="ltr" defaultValue={value("map")} maxLength={1000} error={state.errors?.map} hint={t("food.mapHint")} required />
      {cuisines.length ? (
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-sm font-semibold">{t("food.cuisines")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {cuisines.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  name={`cuisine-${c.id}`}
                  defaultChecked={state.values ? state.values[`cuisine-${c.id}`] === "on" : restaurant.cuisines.includes(c.id)}
                  className="h-4 w-4 accent-midnight"
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`f-prep${suffix}`} label={t("food.prepMinutes")} name="prepMinutes" inputMode="numeric" defaultValue={value("prepMinutes")} error={state.errors?.prepMinutes} />
        <Field id={`f-min${suffix}`} label={t("food.minOrder", { currency })} name="minOrder" inputMode="decimal" defaultValue={value("minOrder")} error={state.errors?.minOrder} />
        <Field id={`f-maxkm${suffix}`} label={t("food.maxKm")} name="maxKm" inputMode="decimal" defaultValue={value("maxKm")} error={state.errors?.maxKm} hint={t("food.maxKmHint")} />
        <Field id={`f-commission${suffix}`} label={t("food.commission")} name="commission" inputMode="decimal" defaultValue={value("commission")} error={state.errors?.commission} hint={t("food.commissionHint")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["logo", t("food.logo"), restaurant.logoUrl, "removeLogo", t("food.removeLogo")],
            ["cover", t("food.cover"), restaurant.coverUrl, "removeCover", t("food.removeCover")],
          ] as const
        ).map(([name, label, url, remove, removeLabel]) => (
          <div key={name} className="flex flex-col gap-1.5">
            <label htmlFor={`f-${name}${suffix}`} className="text-sm font-semibold">
              {label}
            </label>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="h-16 w-16 rounded-xl border border-line object-cover" />
            ) : null}
            <input id={`f-${name}${suffix}`} type="file" name={name} accept="image/png,image/jpeg" className="text-sm" />
            <span className="text-[13px] text-muted">{t("food.pictureHint")}</span>
            {url ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={remove} className="h-4 w-4 accent-midnight" />
                {removeLabel}
              </label>
            ) : null}
            <FieldError id={`f-${name}${suffix}-error`} error={state.errors?.[name]} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {restaurant.id ? t("food.saveRestaurant") : t("food.add")}
        </SubmitButton>
      </div>
    </form>
  );
}

export interface HoursValues {
  /** `<day>-opens`, `<day>-closes`, `<day>-opens2`, `<day>-closes2`. */
  values: Record<string, string>;
  days: { id: string; label: string }[];
}

/** 105.1 Opening hours: one or two periods a day; an empty day is closed. */
export function HoursForm({ restaurant, hours }: { restaurant: number; hours: HoursValues }) {
  const t = useDashT();
  const [state, action] = useActionState(saveHoursAction, initialFormState);
  const value = (key: string) => state.values?.[key] ?? hours.values[key] ?? "";
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="restaurant" value={restaurant} />
      <div className="flex flex-col gap-2">
        {hours.days.map((d) => (
          <div key={d.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-[15px] font-semibold">{d.label}</span>
              {(["", "2"] as const).map((n) => (
                <span key={n} className="flex items-center gap-1.5">
                  {n ? <span className="text-sm text-muted">{t("food.secondPeriod")}</span> : null}
                  <input type="time" name={`${d.id}-opens${n}`} aria-label={`${d.label} ${t("food.opens")}`} defaultValue={value(`${d.id}-opens${n}`)} className="input input-sm w-[120px]" dir="ltr" />
                  <span aria-hidden="true">–</span>
                  <input type="time" name={`${d.id}-closes${n}`} aria-label={`${d.label} ${t("food.closes")}`} defaultValue={value(`${d.id}-closes${n}`)} className="input input-sm w-[120px]" dir="ltr" />
                </span>
              ))}
            </div>
            <FieldError id={`f-${d.id}-error`} error={state.errors?.[`${d.id}-opens`] ?? state.errors?.[`${d.id}-opens2`]} />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {t("food.saveHours")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 105.1 A menu section's name: a new one, or renaming one (`section`). */
export function SectionForm({ restaurant, section, name }: { restaurant: number; section: number | null; name: string }) {
  const t = useDashT();
  const [state, action] = useActionState(section ? renameSectionAction : addSectionAction, initialFormState);
  const id = `f-section-${section ?? "new"}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="restaurant" value={restaurant} />
      {section ? <input type="hidden" name="section" value={section} /> : null}
      <div className="flex flex-wrap items-end gap-2">
        <Field id={id} label={t("food.sectionName")} name="name" defaultValue={state.values?.name ?? name} placeholder={t("food.sectionPlaceholder")} maxLength={60} error={state.errors?.name} className="min-w-[220px] flex-1" />
        <SubmitButton variant={section ? "secondary" : "primary"} className="h-11" pendingText={t("common.saving")}>
          {section ? t("food.rename") : t("food.add")}
        </SubmitButton>
      </div>
    </form>
  );
}

export interface DishFormValues {
  id: number | null;
  name: string;
  description: string;
  price: string;
  available: boolean;
  popular: boolean;
  choices: string;
  imageUrl: string | null;
}

/** 105.1 A dish: its name, price and picture, sold out or not, and its choices as lines of text. */
export function DishForm({ restaurant, section, dish, currency }: { restaurant: number; section: number; dish: DishFormValues; currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveDishAction, initialFormState);
  const value = (key: "name" | "description" | "price" | "choices") => state.values?.[key] ?? dish[key];
  const checked = (key: "available" | "popular") => (state.values ? state.values[key] === "on" : dish[key]);
  const suffix = `-${section}-${dish.id ?? "new"}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="restaurant" value={restaurant} />
      <input type="hidden" name="section" value={section} />
      {dish.id ? <input type="hidden" name="dish" value={dish.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field id={`f-dish${suffix}`} label={t("food.dishName")} name="name" defaultValue={value("name")} maxLength={80} error={state.errors?.name} required />
        <Field id={`f-price${suffix}`} label={t("food.price", { currency })} name="price" inputMode="decimal" defaultValue={value("price")} error={state.errors?.price} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-desc${suffix}`} className="text-sm font-semibold">
          {t("food.dishDescription")}
        </label>
        <textarea id={`f-desc${suffix}`} name="description" rows={2} maxLength={500} defaultValue={value("description")} className="input min-h-16 py-3" />
        <FieldError id={`f-desc${suffix}-error`} error={state.errors?.description} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-choices${suffix}`} className="text-sm font-semibold">
          {t("food.choices")}
        </label>
        <textarea
          id={`f-choices${suffix}`}
          name="choices"
          rows={3}
          maxLength={4000}
          defaultValue={value("choices")}
          className="input min-h-20 py-3"
          dir="auto"
          aria-describedby={`f-choices${suffix}-hint f-choices${suffix}-error`}
        />
        <span id={`f-choices${suffix}-hint`} className="text-[13px] text-muted">
          {t("food.choicesHint")}
        </span>
        <FieldError id={`f-choices${suffix}-error`} error={state.errors?.choices} />
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`f-image${suffix}`} className="text-sm font-semibold">
            {t("food.picture")}
          </label>
          {dish.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dish.imageUrl} alt="" className="h-16 w-16 rounded-xl border border-line object-cover" />
          ) : null}
          <input id={`f-image${suffix}`} type="file" name="image" accept="image/png,image/jpeg" className="text-sm" />
          {dish.imageUrl ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removeImage" className="h-4 w-4 accent-midnight" />
              {t("food.removePicture")}
            </label>
          ) : null}
          <FieldError id={`f-image${suffix}-error`} error={state.errors?.image} />
        </div>
        <div className="flex flex-col gap-2 pt-6">
          <label className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input type="checkbox" name="available" defaultChecked={checked("available")} className="h-4 w-4 accent-midnight" />
            {t("food.available")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[15px]">
            <input type="checkbox" name="popular" defaultChecked={checked("popular")} className="h-4 w-4 accent-midnight" />
            {t("food.popular")}
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton className="h-10" pendingText={t("common.saving")}>
          {dish.id ? t("food.saveDish") : t("food.add")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 105.1 Someone who takes a restaurant's orders in the app. */
export function StaffForm({ restaurant, emailOnly }: { restaurant: number; emailOnly: boolean }) {
  const t = useDashT();
  const [state, action] = useActionState(addStaffAction, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="restaurant" value={restaurant} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field id="f-staff-name" label={t("food.staffName")} name="name" defaultValue={state.values?.name ?? ""} maxLength={80} error={state.errors?.name} required />
        {emailOnly ? (
          <Field id="f-staff-email" label={t("food.staffEmail")} name="email" type="email" defaultValue={state.values?.email ?? ""} error={state.errors?.email} hint={t("food.staffEmailHint")} />
        ) : (
          <Field id="f-staff-phone" label={t("food.staffPhone")} name="phone" type="tel" dir="ltr" defaultValue={state.values?.phone ?? ""} error={state.errors?.phone} hint={t("food.staffPhoneHint")} />
        )}
        <SubmitButton className="h-11" pendingText={t("common.saving")}>
          {t("food.add")}
        </SubmitButton>
      </div>
    </form>
  );
}

/** 105.1 The company's step on an order: accept with the minutes, turn down with why, ready, cancel. */
export function OrderStepForm({ order, steps, prepMinutes }: { order: number; steps: string[]; prepMinutes: number }) {
  const t = useDashT();
  const [state, action] = useActionState(foodOrderStepAction, initialFormState);
  return (
    <div className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {steps.includes("accepted") ? (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={order} />
          <input type="hidden" name="step" value="accepted" />
          <Field id="f-prep" label={t("food.prepMinutes")} name="prepMinutes" inputMode="numeric" defaultValue={String(prepMinutes)} error={state.errors?.prepMinutes} className="w-[200px]" />
          <SubmitButton className="h-11">{t("food.accept")}</SubmitButton>
        </form>
      ) : null}
      {steps.includes("ready") ? (
        <form action={action}>
          <input type="hidden" name="id" value={order} />
          <input type="hidden" name="step" value="ready" />
          <SubmitButton className="h-11">{t("food.markReady")}</SubmitButton>
        </form>
      ) : null}
      {steps.includes("rejected") ? (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={order} />
          <input type="hidden" name="step" value="rejected" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-reason" className="text-sm font-semibold">
              {t("food.why")}
            </label>
            <select id="f-reason" name="reason" className="input" defaultValue="too_busy">
              {(["closing", "too_busy", "item_unavailable", "other"] as const).map((r) => (
                <option key={r} value={r}>
                  {t(`food.reason_${r}`)}
                </option>
              ))}
            </select>
            <FieldError id="f-reason-error" error={state.errors?.reason} />
          </div>
          <Field id="f-reject-note" label={t("food.note")} name="note" maxLength={300} className="min-w-[200px] flex-1" />
          <SubmitButton variant="secondary" className="h-11">
            {t("food.reject")}
          </SubmitButton>
        </form>
      ) : null}
      {steps.includes("cancelled") ? (
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm(t("food.cancelConfirm"))) e.preventDefault();
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="id" value={order} />
          <input type="hidden" name="step" value="cancelled" />
          <Field id="f-cancel-note" label={t("food.note")} name="note" maxLength={300} className="min-w-[200px] flex-1" />
          <SubmitButton variant="danger" className="h-11">
            {t("food.cancelOrder")}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
