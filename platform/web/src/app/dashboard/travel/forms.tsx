"use client";

import { useActionState, type ReactNode } from "react";
import { saveFlightStatusAction, saveTravelFlightAction, saveTravelHotelAction, saveTravelRoomAction, saveTravelSettingsAction } from "@/app/actions/travel";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { useDashT } from "@/components/dashboard-i18n";
import { FormActions, FormSection } from "@/components/page-kit";
import type { DashKey } from "@/i18n/dashboard";
import { initialFormState, type FormState } from "@/lib/forms";

/** 126 The travel forms: a hotel, a room with its rates, a flight with its fares and seats, a flight's status, the travel settings. */

const HOTEL_KINDS = ["hotel", "resort", "boutique", "apartments", "villa", "hostel", "guesthouse"] as const;
const AMENITIES = ["pool", "spa", "wifi", "breakfast", "shuttle", "gym", "parking", "beach", "restaurant", "bar", "air_conditioning", "family", "pets", "accessible", "kitchen", "view"] as const;
const BOARDS = ["room_only", "breakfast", "half_board", "full_board", "all_inclusive"] as const;
const FARES = ["light", "standard", "flex"] as const;
const FLIGHT_AMENITIES = ["wifi", "meal", "power", "entertainment", "lounge"] as const;
const STATUSES = ["scheduled", "on_time", "delayed", "boarding", "departed", "landed", "cancelled"] as const;
const CURRENCIES = ["USD", "EUR", "EGP", "TRY", "SAR", "AED"] as const;
const RATE_ROWS = 6;

function useForm(action: (state: FormState, data: FormData) => Promise<FormState>, values: Record<string, string>) {
  const [state, run] = useActionState(action, initialFormState);
  const value = (key: string) => state.values?.[key] ?? values[key] ?? "";
  const checked = (key: string) => value(key) === "on";
  return { state, run, value, checked };
}

function Check({ name, label, checked, hint }: { name: string; label: ReactNode; checked: boolean; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-[15px] font-semibold">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col">
        {label}
        {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function Select({ id, name, label, value, options, error }: { id: string; name: string; label: ReactNode; value: string; options: { value: string; label: string }[]; error?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function Area({ id, name, label, value, hint, error, rows = 3 }: { id: string; name: string; label: ReactNode; value: string; hint?: ReactNode; error?: string; rows?: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <textarea id={id} name={name} defaultValue={value} rows={rows} className="input min-h-[80px] py-2" aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function Photos({ id, photos, error }: { id: string; photos: { id: string; url: string }[]; error?: string }) {
  const t = useDashT();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {t("travel.photos")}
      </label>
      {photos.length ? (
        <div className="flex flex-wrap gap-3">
          {photos.map((p) => (
            <label key={p.id} className="flex flex-col items-center gap-1 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-16 w-24 rounded-lg object-cover" />
              <span className="flex items-center gap-1">
                <input type="checkbox" name={`removePhoto_${p.id}`} className="h-3.5 w-3.5 accent-midnight" />
                {t("travel.removePhoto")}
              </span>
            </label>
          ))}
        </div>
      ) : null}
      <input id={id} type="file" name="photos" multiple accept="image/png,image/jpeg" className="text-sm" aria-describedby={`${id}-hint`} />
      <span id={`${id}-hint`} className="text-xs text-muted">
        {t("travel.photosHint")}
      </span>
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

export function HotelForm({ id, values, photos }: { id: number | null; values: Record<string, string>; photos: { id: string; url: string }[] }) {
  const t = useDashT();
  const { state, run, value, checked } = useForm(saveTravelHotelAction, values);
  const s = id ? `-${id}` : "-new";
  const e = state.errors ?? {};
  return (
    <form action={run} noValidate className="flex flex-col gap-5">
      <FormMessage message={state.message} ok={state.ok} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <FormSection id={`h-about${s}`} title={t("travel.details")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`h-name${s}`} label={t("travel.name")} name="name" defaultValue={value("name")} maxLength={120} error={e.name} required />
          <Select id={`h-kind${s}`} name="kind" label={t("travel.kind")} value={value("kind")} options={HOTEL_KINDS.map((k) => ({ value: k, label: t(`travel.hk_${k}` as DashKey) }))} />
          <Field id={`h-stars${s}`} label={t("travel.stars")} name="stars" inputMode="numeric" defaultValue={value("stars")} error={e.stars} />
          <Field id={`h-badge${s}`} label={t("travel.badge")} name="badge" defaultValue={value("badge")} maxLength={30} hint={t("travel.badgeHint")} error={e.badge} />
          <Area id={`h-description${s}`} name="description" label={t("travel.description")} value={value("description")} error={e.description} />
        </div>
      </FormSection>
      <FormSection id={`h-place${s}`} title={t("travel.city")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`h-city${s}`} label={t("travel.city")} name="city" defaultValue={value("city")} hint={t("travel.cityHint")} error={e.city} required />
          <Field id={`h-country${s}`} label={t("travel.country")} name="country" defaultValue={value("country")} error={e.country} />
          <Field id={`h-area${s}`} label={t("travel.area")} name="area" defaultValue={value("area")} error={e.area} />
          <Field id={`h-landmark${s}`} label={t("travel.landmark")} name="landmark" defaultValue={value("landmark")} hint={t("travel.landmarkHint")} error={e.landmark} />
          <Field id={`h-address${s}`} label={t("travel.address")} name="address" defaultValue={value("address")} error={e.address} className="sm:col-span-2" />
          <Field id={`h-lat${s}`} label={t("travel.lat")} name="lat" inputMode="decimal" defaultValue={value("lat")} hint={t("travel.mapHint")} error={e.lat} />
          <Field id={`h-lng${s}`} label={t("travel.lng")} name="lng" inputMode="decimal" defaultValue={value("lng")} />
          <Field id={`h-phone${s}`} label={t("travel.phone")} name="phone" defaultValue={value("phone")} error={e.phone} />
        </div>
      </FormSection>
      <FormSection id={`h-amenities${s}`} title={t("travel.amenities")}>
        <div className="grid gap-2 sm:grid-cols-3">
          {AMENITIES.map((a) => (
            <Check key={a} name={`amenity_${a}`} label={t(`travel.am_${a}` as DashKey)} checked={checked(`amenity_${a}`)} />
          ))}
        </div>
        <Field id={`h-themes${s}`} label={t("travel.themes")} name="themes" defaultValue={value("themes")} hint={t("travel.themesHint")} error={e.themes} />
      </FormSection>
      <FormSection id={`h-rules${s}`} title={t("travel.policies")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`h-in${s}`} label={t("travel.checkIn")} name="checkInTime" type="time" defaultValue={value("checkInTime")} error={e.checkInTime} />
          <Field id={`h-out${s}`} label={t("travel.checkOut")} name="checkOutTime" type="time" defaultValue={value("checkOutTime")} error={e.checkOutTime} />
          <Field id={`h-tax${s}`} label={t("travel.tax")} name="tax" inputMode="decimal" defaultValue={value("tax")} hint={t("travel.taxHint")} error={e.tax} />
          <Area id={`h-policies${s}`} name="policies" label={t("travel.policies")} value={value("policies")} error={e.policies} />
        </div>
        <Check name="payAtHotel" label={t("travel.payAtHotel")} checked={checked("payAtHotel")} />
        <Check name="featured" label={t("travel.featuredLabel")} checked={checked("featured")} />
        <Check name="active" label={t("travel.shown")} checked={checked("active")} />
      </FormSection>
      <FormSection id={`h-photos${s}`} title={t("travel.photos")}>
        <Photos id={`h-photos-file${s}`} photos={photos} error={e.photos} />
      </FormSection>
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("travel.saving")}>
          {id ? t("travel.save") : t("travel.add")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function RoomForm({ hotelId, id, values, photos, currency }: { hotelId: number; id: number | null; values: Record<string, string>; photos: { id: string; url: string }[]; currency: string }) {
  const t = useDashT();
  const { state, run, value, checked } = useForm(saveTravelRoomAction, values);
  const s = id ? `-${id}` : "-new";
  const e = state.errors ?? {};
  return (
    <form action={run} noValidate className="flex flex-col gap-5">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="hotelId" value={hotelId} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`r-name${s}`} label={t("travel.roomName")} name="name" defaultValue={value("name")} maxLength={100} error={e.name} required />
        <Field id={`r-nightly${s}`} label={t("travel.nightly", { currency })} name="nightly" inputMode="decimal" defaultValue={value("nightly")} error={e.nightly} required />
        <Field id={`r-units${s}`} label={t("travel.units")} name="units" inputMode="numeric" defaultValue={value("units")} error={e.units} />
        <Field id={`r-sleeps${s}`} label={t("travel.sleeps")} name="sleeps" inputMode="numeric" defaultValue={value("sleeps")} error={e.sleeps} />
        <Field id={`r-size${s}`} label={t("travel.size")} name="sizeM2" inputMode="numeric" defaultValue={value("sizeM2")} error={e.sizeM2} />
        <Field id={`r-beds${s}`} label={t("travel.beds")} name="beds" defaultValue={value("beds")} error={e.beds} />
        <Field id={`r-features${s}`} label={t("travel.features")} name="features" defaultValue={value("features")} hint={t("travel.featuresHint")} className="sm:col-span-2" />
        <Area id={`r-description${s}`} name="description" label={t("travel.description")} value={value("description")} error={e.description} />
      </div>
      <FormSection id={`r-days${s}`} title={t("travel.openFrom")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`r-from${s}`} label={t("travel.openFrom")} name="openFrom" type="date" defaultValue={value("openFrom")} error={e.openFrom} />
          <Field id={`r-until${s}`} label={t("travel.openUntil")} name="openUntil" type="date" defaultValue={value("openUntil")} error={e.openUntil} />
          <Field id={`r-min${s}`} label={t("travel.minNights")} name="minNights" inputMode="numeric" defaultValue={value("minNights")} error={e.minNights} />
          <Area id={`r-closed${s}`} name="closed" label={t("travel.closed")} value={value("closed")} hint={t("travel.closedHint")} error={e.closed} />
          <Area id={`r-prices${s}`} name="prices" label={t("travel.prices")} value={value("prices")} hint={t("travel.pricesHint")} error={e.prices} />
        </div>
      </FormSection>
      <FormSection id={`r-rates${s}`} title={t("travel.rates")} description={t("travel.ratesHint")}>
        <div className="flex flex-col gap-3">
          {Array.from({ length: RATE_ROWS }, (_, i) => (
            <div key={i} className="grid items-end gap-3 rounded-xl border border-line-soft p-3 sm:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
              <input type="hidden" name={`rate${i}_id`} value={value(`rate${i}_id`)} />
              <Field id={`r-rate${i}${s}`} small label={t("travel.rateName")} name={`rate${i}_name`} defaultValue={value(`rate${i}_name`)} error={e[`rate${i}_name`]} />
              <Select id={`r-board${i}${s}`} name={`rate${i}_board`} label={t("travel.board")} value={value(`rate${i}_board`) || "room_only"} options={BOARDS.map((b) => ({ value: b, label: t(`travel.board_${b}` as DashKey) }))} />
              <Field id={`r-extra${i}${s}`} small label={t("travel.extra")} name={`rate${i}_extra`} inputMode="decimal" defaultValue={value(`rate${i}_extra`)} error={e[`rate${i}_extra`]} />
              <Field id={`r-days${i}${s}`} small label={t("travel.freeDays")} name={`rate${i}_days`} inputMode="numeric" defaultValue={value(`rate${i}_days`)} error={e[`rate${i}_days`]} />
              <div className="flex flex-wrap gap-4 sm:col-span-4">
                <Check name={`rate${i}_refundable`} label={t("travel.refundable")} checked={checked(`rate${i}_refundable`)} />
                <Check name={`rate${i}_payAtHotel`} label={t("travel.ratePayAtHotel")} checked={checked(`rate${i}_payAtHotel`)} />
                <Check name={`rate${i}_popular`} label={t("travel.popular")} checked={checked(`rate${i}_popular`)} />
              </div>
            </div>
          ))}
        </div>
      </FormSection>
      <Photos id={`r-photos${s}`} photos={photos} error={e.photos} />
      <Check name="active" label={t("travel.shown")} checked={checked("active")} />
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("travel.saving")}>
          {id ? t("travel.save") : t("travel.add")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function FlightForm({ id, values, currency }: { id: number | null; values: Record<string, string>; currency: string }) {
  const t = useDashT();
  const { state, run, value, checked } = useForm(saveTravelFlightAction, values);
  const s = id ? `-${id}` : "-new";
  const e = state.errors ?? {};
  const side = (key: "from" | "to") => (
    <FormSection id={`f-${key}${s}`} title={t(`travel.${key}`)}>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id={`f-${key}Code${s}`} label={t("travel.code")} name={`${key}Code`} defaultValue={value(`${key}Code`)} maxLength={3} error={e[`${key}Code`]} required />
        <Field id={`f-${key}City${s}`} label={t("travel.city")} name={`${key}City`} defaultValue={value(`${key}City`)} error={e[`${key}City`]} required />
        <Field id={`f-${key}Airport${s}`} label={t("travel.airportName")} name={`${key}Airport`} defaultValue={value(`${key}Airport`)} />
        <Field id={`f-${key}Terminal${s}`} label={t("travel.terminal")} name={`${key}Terminal`} defaultValue={value(`${key}Terminal`)} />
      </div>
    </FormSection>
  );
  return (
    <form action={run} noValidate className="flex flex-col gap-5">
      <FormMessage message={state.message} ok={state.ok} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <Field id={`f-number${s}`} label={t("travel.number")} name="number" defaultValue={value("number")} maxLength={12} error={e.number} required />
        <Field id={`f-carrier${s}`} label={t("travel.carrier")} name="carrierName" defaultValue={value("carrierName")} error={e.carrierName} required />
        <Field id={`f-code${s}`} label={t("travel.carrierCode")} name="carrierCode" defaultValue={value("carrierCode")} maxLength={3} error={e.carrierCode} />
        <Field id={`f-color${s}`} label={t("travel.carrierColor")} name="carrierColor" type="color" defaultValue={value("carrierColor") || "#0E1424"} error={e.carrierColor} />
      </div>
      {side("from")}
      {side("to")}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`f-departs${s}`} label={t("travel.departs")} name="departs" type="datetime-local" defaultValue={value("departs")} error={e.departs} required />
        <Field id={`f-arrives${s}`} label={t("travel.arrives")} name="arrives" type="datetime-local" defaultValue={value("arrives")} error={e.arrives} required />
        <Field id={`f-shift${s}`} label={t("travel.shift")} name="shift" inputMode="numeric" defaultValue={value("shift")} hint={t("travel.shiftHint")} error={e.shift} />
        <Field id={`f-stops${s}`} label={t("travel.stops")} name="stops" inputMode="numeric" defaultValue={value("stops")} error={e.stops} />
        <Field id={`f-via${s}`} label={t("travel.via")} name="via" defaultValue={value("via")} error={e.via} />
        <Field id={`f-aircraft${s}`} label={t("travel.aircraft")} name="aircraft" defaultValue={value("aircraft")} error={e.aircraft} />
      </div>
      <FormSection id={`f-board${s}`} title={t("travel.onBoard")}>
        <div className="flex flex-wrap gap-4">
          {FLIGHT_AMENITIES.map((a) => (
            <Check key={a} name={`amenity_${a}`} label={t(`travel.fa_${a}` as DashKey)} checked={checked(`amenity_${a}`)} />
          ))}
        </div>
      </FormSection>
      <FormSection id={`f-fares${s}`} title={t("travel.fares")} description={t("travel.faresHint")}>
        <FieldError id={`f-fares${s}-error`} error={e.fare_standard_on} />
        {FARES.map((f) => (
          <div key={f} className="flex flex-col gap-3 rounded-xl border border-line-soft p-3">
            <Check name={`fare_${f}_on`} label={`${t(`travel.fare_${f}` as DashKey)} · ${t("travel.fareOn")}`} checked={checked(`fare_${f}_on`)} />
            <div className="grid gap-3 sm:grid-cols-4">
              <Field id={`f-${f}-name${s}`} small label={t("travel.fareName")} name={`fare_${f}_name`} defaultValue={value(`fare_${f}_name`)} />
              <Field id={`f-${f}-price${s}`} small label={t("travel.farePrice", { currency })} name={`fare_${f}_price`} inputMode="decimal" defaultValue={value(`fare_${f}_price`)} error={e[`fare_${f}_price`]} />
              <Field id={`f-${f}-seats${s}`} small label={t("travel.seats")} name={`fare_${f}_seats`} inputMode="numeric" defaultValue={value(`fare_${f}_seats`)} error={e[`fare_${f}_seats`]} />
              <Select
                id={`f-${f}-seat${s}`}
                name={`fare_${f}_seat`}
                label={t("travel.seat")}
                value={value(`fare_${f}_seat`) || "standard"}
                options={[
                  { value: "fee", label: t("travel.seatFee") },
                  { value: "standard", label: t("travel.seatStandard") },
                  { value: "any", label: t("travel.seatAny") },
                ]}
              />
              <Field id={`f-${f}-cabin${s}`} small label={t("travel.cabin")} name={`fare_${f}_cabin`} inputMode="numeric" defaultValue={value(`fare_${f}_cabin`)} error={e[`fare_${f}_cabin`]} />
              <Field id={`f-${f}-bags${s}`} small label={t("travel.bags")} name={`fare_${f}_bags`} inputMode="numeric" defaultValue={value(`fare_${f}_bags`)} error={e[`fare_${f}_bags`]} />
              <Field id={`f-${f}-bagKg${s}`} small label={t("travel.bagKg")} name={`fare_${f}_bagKg`} inputMode="numeric" defaultValue={value(`fare_${f}_bagKg`)} error={e[`fare_${f}_bagKg`]} />
              <Field id={`f-${f}-changeFee${s}`} small label={t("travel.changeFee")} name={`fare_${f}_changeFee`} inputMode="decimal" defaultValue={value(`fare_${f}_changeFee`)} error={e[`fare_${f}_changeFee`]} />
              <Field id={`f-${f}-refundFee${s}`} small label={t("travel.refundFee")} name={`fare_${f}_refundFee`} inputMode="decimal" defaultValue={value(`fare_${f}_refundFee`)} error={e[`fare_${f}_refundFee`]} />
            </div>
            <div className="flex flex-wrap gap-4">
              <Check name={`fare_${f}_change`} label={t("travel.change")} checked={checked(`fare_${f}_change`)} />
              <Check name={`fare_${f}_refund`} label={t("travel.refund")} checked={checked(`fare_${f}_refund`)} />
              <Check name={`fare_${f}_priority`} label={t("travel.priority")} checked={checked(`fare_${f}_priority`)} />
            </div>
          </div>
        ))}
      </FormSection>
      <FormSection id={`f-seats${s}`} title={t("travel.seatMap")}>
        <Check name="seatMap" label={t("travel.seatMapOn")} checked={checked("seatMap")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`f-layout${s}`} label={t("travel.layout")} name="layout" defaultValue={value("layout")} hint={t("travel.layoutHint")} error={e.layout} />
          <Field id={`f-first${s}`} label={t("travel.firstRow")} name="firstRow" inputMode="numeric" defaultValue={value("firstRow")} error={e.firstRow} />
          <Field id={`f-rows${s}`} label={t("travel.rowsCount")} name="rows" inputMode="numeric" defaultValue={value("rows")} error={e.rows} />
          <Field id={`f-extraRows${s}`} label={t("travel.extraRows")} name="extraRows" defaultValue={value("extraRows")} error={e.extraRows} />
          <Field id={`f-extraPrice${s}`} label={t("travel.extraPrice")} name="extraPrice" inputMode="decimal" defaultValue={value("extraPrice")} error={e.extraPrice} />
          <Field id={`f-seatPrice${s}`} label={t("travel.seatPrice")} name="seatPrice" inputMode="decimal" defaultValue={value("seatPrice")} error={e.seatPrice} />
          <Field id={`f-blocked${s}`} label={t("travel.blocked")} name="blocked" defaultValue={value("blocked")} error={e.blocked} className="sm:col-span-3" />
        </div>
      </FormSection>
      <Check name="checkInOpen" label={t("travel.checkInOpen")} hint={t("travel.checkInHint")} checked={checked("checkInOpen")} />
      <Check name="active" label={t("travel.shown")} checked={checked("active")} />
      {id ? null : <Field id={`f-repeat${s}`} label={t("travel.repeatWeeks")} name="repeatWeeks" inputMode="numeric" defaultValue={value("repeatWeeks")} hint={t("travel.addFlightHint")} error={e.repeatWeeks} />}
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("travel.saving")}>
          {id ? t("travel.save") : t("travel.add")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function FlightStatusForm({ id, values }: { id: number; values: Record<string, string> }) {
  const t = useDashT();
  const { state, run, value, checked } = useForm(saveFlightStatusAction, values);
  const e = state.errors ?? {};
  return (
    <form action={run} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id={`s-status-${id}`} name="status" label={t("travel.status")} value={value("status")} options={STATUSES.map((v) => ({ value: v, label: t(`travel.fs_${v}` as DashKey) }))} />
        <Field id={`s-gate-${id}`} label={t("travel.gate")} name="gate" defaultValue={value("gate")} maxLength={8} error={e.gate} />
        <Field id={`s-boards-${id}`} label={t("travel.boardsAt")} name="boardsAt" type="time" defaultValue={value("boardsAt")} error={e.boardsAt} />
        <Field id={`s-delayed-${id}`} label={t("travel.delayedDeparts")} name="delayedDeparts" type="datetime-local" defaultValue={value("delayedDeparts")} error={e.delayedDeparts} />
        <Field id={`s-note-${id}`} label={t("travel.statusNote")} name="statusNote" defaultValue={value("statusNote")} maxLength={140} hint={t("travel.statusNoteHint")} error={e.statusNote} className="sm:col-span-2" />
      </div>
      <Check name="checkInOpen" label={t("travel.checkInOpen")} hint={t("travel.checkInHint")} checked={checked("checkInOpen")} />
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("travel.saving")}>
          {t("travel.save")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}

export function TravelSettingsForm({ values, zones }: { values: Record<string, string>; zones: string[] }) {
  const t = useDashT();
  const { state, run, value, checked } = useForm(saveTravelSettingsAction, values);
  const e = state.errors ?? {};
  return (
    <form action={run} noValidate className="flex flex-col gap-5">
      <FormMessage message={state.message} ok={state.ok} />
      <FormSection id="ts-pay" title={t("travel.payment")}>
        <Select id="ts-currency" name="currency" label={t("travel.currency")} value={value("currency")} options={CURRENCIES.map((c) => ({ value: c, label: c }))} error={e.currency} />
        <Check name="payNow" label={t("travel.payNow")} hint={t("travel.payNowHint")} checked={checked("payNow")} />
        <Check name="payAtHotel" label={t("travel.payAtHotelSetting")} checked={checked("payAtHotel")} />
        <FieldError id="ts-pay-error" error={e.payNow} />
      </FormSection>
      <FormSection id="ts-save" title={t("travel.lines")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ts-member" label={t("travel.memberOff")} name="memberOff" inputMode="numeric" defaultValue={value("memberOff")} error={e.memberOff} />
          <Field id="ts-bundle" label={t("travel.bundleOff")} name="bundleOff" inputMode="numeric" defaultValue={value("bundleOff")} error={e.bundleOff} />
          <Field id="ts-bag" label={t("travel.bag")} name="bag" inputMode="decimal" defaultValue={value("bag")} error={e.bag} />
          <Field id="ts-meal" label={t("travel.meal")} name="meal" inputMode="decimal" defaultValue={value("meal")} error={e.meal} />
        </div>
      </FormSection>
      <FormSection id="ts-transfer" title={t("travel.transfer")}>
        <Check name="transferOn" label={t("travel.transferOn")} checked={checked("transferOn")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="ts-transfer-price" label={t("travel.transferPrice")} name="transfer" inputMode="decimal" defaultValue={value("transfer")} error={e.transfer} />
          <Field id="ts-transfer-note" label={t("travel.transferNote")} name="transferNote" defaultValue={value("transferNote")} maxLength={80} error={e.transferNote} />
        </div>
      </FormSection>
      <FormSection id="ts-help" title={t("travel.help")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="ts-phone" label={t("travel.helpPhone")} name="helpPhone" defaultValue={value("helpPhone")} error={e.helpPhone} />
          <Field id="ts-email" label={t("travel.helpEmail")} name="helpEmail" type="email" defaultValue={value("helpEmail")} error={e.helpEmail} />
          <Field id="ts-whatsapp" label={t("travel.helpWhatsapp")} name="helpWhatsapp" defaultValue={value("helpWhatsapp")} error={e.helpWhatsapp} />
        </div>
        <Field id="ts-font" label={t("travel.displayFont")} name="displayFont" defaultValue={value("displayFont")} hint={t("travel.displayFontHint")} error={e.displayFont} />
        <Select id="ts-zone" name="timeZone" label={t("travel.timeZone")} value={value("timeZone")} options={zones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))} error={e.timeZone} />
        <p className="m-0 text-sm text-muted">{t("travel.timeZoneHint")}</p>
      </FormSection>
      <FormActions>
        <SubmitButton className="h-10" pendingText={t("travel.saving")}>
          {t("travel.save")}
        </SubmitButton>
      </FormActions>
    </form>
  );
}
