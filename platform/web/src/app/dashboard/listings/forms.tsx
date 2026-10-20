"use client";

/* eslint-disable @next/next/no-img-element -- previews of uploaded photos served by our own asset route */
import { useActionState, useState, type ReactNode } from "react";
import { saveListingAction, saveOfficeAction } from "@/app/actions/listings";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";
import { MediaImagesPicker } from "@/components/media-picker";
import { useDashT } from "@/components/dashboard-i18n";
import { LISTING_IMAGE_MAX_BYTES, LISTING_IMAGES_MAX } from "@/lib/listings/forms";

export interface ListingFormValues {
  id: number | null;
  reference: string;
  title: string;
  description: string;
  purpose: "sale" | "rent";
  type: string;
  price: string;
  currency: string;
  period: string;
  negotiable: boolean;
  city: string;
  district: string;
  address: string;
  latitude: string;
  longitude: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  yearBuilt: string;
  furnished: string;
  features: string;
  videoUrl: string;
  images: { id: string; url: string }[];
}

function Select({
  label,
  name,
  options,
  defaultValue,
  error,
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  error?: string;
  hint?: string;
}) {
  const id = `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function Check({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[13px] text-muted">{hint}</span>
      </span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-4 border-0 border-t border-line-soft p-0 pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-[17px] font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Adding or editing a listing. Photos are ordered here and sent in that order. */
export function ListingForm({
  listing,
  types,
  currencies,
  areaSymbol,
}: {
  listing: ListingFormValues;
  types: { key: string; label: string }[];
  currencies: readonly string[];
  areaSymbol: string;
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveListingAction, initialFormState);
  const v = (key: keyof ListingFormValues & string, fallback: string) => state.values?.[key] ?? fallback;
  const checked = (key: string, fallback: boolean) => (state.values ? state.values[key] === "on" : fallback);
  const [purpose, setPurpose] = useState<"sale" | "rent">((state.values?.purpose as "sale" | "rent" | undefined) ?? listing.purpose);
  const [images, setImages] = useState(listing.images);
  const move = (from: number, to: number) =>
    setImages((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {listing.id !== null ? <input type="hidden" name="id" value={listing.id} /> : null}
      <input type="hidden" name="purpose" value={purpose} />
      {images.map((image) => (
        <input key={image.id} type="hidden" name="imageOrder" value={image.id} />
      ))}
      <FormMessage message={state.message} ok={state.ok} />

      <Group title={t("listings.basics")}>
        <Field label={t("common.title")} name="title" required maxLength={150} defaultValue={v("title", listing.title)} error={e.title} />
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 text-sm font-semibold">{t("listings.purpose")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {(
              [
                ["sale", t("listings.forSale")],
                ["rent", t("listings.forRent")],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-[15px]">
                <input
                  type="radio"
                  name="purposeChoice"
                  value={value}
                  checked={purpose === value}
                  onChange={() => setPurpose(value)}
                  className="h-4 w-4 accent-midnight"
                />
                {label}
              </label>
            ))}
          </div>
          <FieldError id="f-purpose-error" error={e.purpose} />
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t("listings.propertyType")}
            name="type"
            defaultValue={v("type", listing.type)}
            options={[{ value: "", label: t("listings.chooseType") }, ...types.map((type) => ({ value: type.key, label: type.label }))]}
            error={e.type}
          />
          <Field
            label={t("listings.reference")}
            name="reference"
            maxLength={40}
            defaultValue={v("reference", listing.reference)}
            hint={t("listings.referenceHint")}
            error={e.reference}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-description" className="text-sm font-semibold">
            {t("common.description")}
          </label>
          <textarea
            id="f-description"
            name="description"
            rows={6}
            maxLength={10_000}
            defaultValue={v("description", listing.description)}
            className="input min-h-32 py-3"
            aria-describedby="f-description-hint"
          />
          <span id="f-description-hint" className="text-[13px] text-muted">
            {t("listings.descriptionHint")}
          </span>
          <FieldError id="f-description-error" error={e.description} />
        </div>
      </Group>

      <Group title={t("listings.price")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("listings.price")} name="price" inputMode="decimal" required defaultValue={v("price", listing.price)} placeholder="4250000" error={e.price} />
          <Select label={t("shop.currency")} name="currency" defaultValue={v("currency", listing.currency)} options={currencies.map((c) => ({ value: c, label: c }))} error={e.currency} />
          {purpose === "rent" ? (
            <Select
              label={t("listings.rentPer")}
              name="period"
              defaultValue={v("period", listing.period || "month")}
              options={[
                { value: "month", label: t("listings.month") },
                { value: "year", label: t("listings.year") },
              ]}
              error={e.period}
            />
          ) : null}
        </div>
        <Check
          name="negotiable"
          label={t("listings.negotiable")}
          hint={t("listings.negotiableHint")}
          defaultChecked={checked("negotiable", listing.negotiable)}
        />
      </Group>

      <Group title={t("listings.location")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("listings.city")} name="city" required maxLength={80} defaultValue={v("city", listing.city)} error={e.city} />
          <Field
            label={t("listings.district")}
            name="district"
            maxLength={80}
            defaultValue={v("district", listing.district)}
            hint={t("listings.districtHint")}
            error={e.district}
          />
        </div>
        <Field
          label={t("listings.address")}
          name="address"
          maxLength={200}
          defaultValue={v("address", listing.address)}
          hint={t("listings.addressHint")}
          error={e.address}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("listings.latitude")}
            name="latitude"
            inputMode="decimal"
            defaultValue={v("latitude", listing.latitude)}
            placeholder="29.9602"
            hint={t("listings.latitudeHint")}
            error={e.latitude}
          />
          <Field label={t("listings.longitude")} name="longitude" inputMode="decimal" defaultValue={v("longitude", listing.longitude)} placeholder="31.2569" error={e.longitude} />
        </div>
      </Group>

      <Group title={t("listings.details")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("listings.area", { unit: areaSymbol })} name="area" inputMode="decimal" defaultValue={v("area", listing.area)} error={e.area} />
          <Field label={t("listings.bedrooms")} name="bedrooms" inputMode="numeric" defaultValue={v("bedrooms", listing.bedrooms)} error={e.bedrooms} />
          <Field label={t("listings.bathrooms")} name="bathrooms" inputMode="numeric" defaultValue={v("bathrooms", listing.bathrooms)} error={e.bathrooms} />
          <Field label={t("listings.floor")} name="floor" inputMode="numeric" defaultValue={v("floor", listing.floor)} hint={t("listings.floorHint")} error={e.floor} />
          <Field label={t("listings.yearBuilt")} name="yearBuilt" inputMode="numeric" defaultValue={v("yearBuilt", listing.yearBuilt)} error={e.yearBuilt} />
          <Select
            label={t("listings.furnished")}
            name="furnished"
            defaultValue={v("furnished", listing.furnished)}
            options={[
              { value: "", label: t("listings.notSet") },
              { value: "yes", label: t("common.yes") },
              { value: "no", label: t("common.no") },
            ]}
            error={e.furnished}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-features" className="text-sm font-semibold">
            {t("listings.features")}
          </label>
          <textarea
            id="f-features"
            name="features"
            rows={4}
            defaultValue={v("features", listing.features)}
            className="input min-h-24 py-3"
            aria-describedby="f-features-hint"
          />
          <span id="f-features-hint" className="text-[13px] text-muted">
            {t("listings.featuresHint")}
          </span>
          <FieldError id="f-features-error" error={e.features} />
        </div>
        <Field
          label={t("listings.video")}
          name="videoUrl"
          type="url"
          defaultValue={v("videoUrl", listing.videoUrl)}
          placeholder="https://www.youtube.com/watch?v=…"
          hint={t("listings.videoHint")}
          error={e.videoUrl}
        />
      </Group>

      <Group title={t("listings.photos")}>
        {images.length > 0 ? (
          <ol aria-label={t("listings.photosOrder")} className="m-0 flex list-none flex-wrap gap-3 p-0">
            {images.map((image, i) => (
              <li key={image.id} className="flex flex-col items-center gap-1.5">
                <img src={image.url} alt={t("listings.photoN", { n: i + 1 })} className="h-24 w-24 rounded-lg border border-line object-cover" />
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    aria-label={t("listings.earlier", { n: i + 1 })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-midnight disabled:opacity-40"
                  >
                    <Icon name="arrow_back" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, i + 1)}
                    disabled={i === images.length - 1}
                    aria-label={t("listings.later", { n: i + 1 })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-midnight disabled:opacity-40"
                  >
                    <Icon name="arrow_forward" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImages((list) => list.filter((x) => x.id !== image.id))}
                    aria-label={t("listings.removePhoto", { n: i + 1 })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-danger"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-images" className="text-sm font-semibold">
            {t("listings.addPhotos")}
          </label>
          <input
            id="f-images"
            type="file"
            name="images"
            multiple
            accept="image/png,image/jpeg"
            className="text-sm"
            aria-describedby="f-images-hint"
            aria-invalid={e.images ? true : undefined}
          />
          <span id="f-images-hint" className="text-[13px] text-muted">
            {t("listings.photosHint", { size: LISTING_IMAGE_MAX_BYTES / 1024 / 1024, max: LISTING_IMAGES_MAX })}
          </span>
          {/* 51 Or pictures already in the Media library. */}
          <MediaImagesPicker />
          <FieldError id="f-images-error" error={e.images} />
        </div>
      </Group>

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        {listing.id === null ? (
          <>
            <SubmitButton variant="secondary" className="h-11" name="intent" value="draft" pendingText={t("common.saving")}>
              {t("events.saveDraft")}
            </SubmitButton>
            <SubmitButton className="h-11" name="intent" value="publish" pendingText={t("events.publishing")}>
              {t("listings.publish")}
            </SubmitButton>
          </>
        ) : (
          <SubmitButton className="h-11" pendingText={t("common.saving")}>
            {t("listings.saveListing")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

export function OfficeForm({
  office,
  currencies,
  units,
}: {
  office: { currency: string; areaUnit: string; contactName: string; contactPhone: string; contactWhatsapp: string; contactEmail: string; messages: boolean };
  currencies: readonly string[];
  units: { key: string; label: string }[];
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveOfficeAction, initialFormState);
  const v = (key: keyof typeof office & string, fallback: string) => state.values?.[key] ?? fallback;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      <Field label={t("listings.officeName")} name="contactName" required maxLength={120} defaultValue={v("contactName", office.contactName)} error={e.contactName} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.phone")} name="contactPhone" type="tel" defaultValue={v("contactPhone", office.contactPhone)} placeholder="+20 100 123 4567" error={e.contactPhone} />
        <Field label="WhatsApp" name="contactWhatsapp" type="tel" defaultValue={v("contactWhatsapp", office.contactWhatsapp)} placeholder="+20 100 123 4567" error={e.contactWhatsapp} />
      </div>
      <Field label={t("listings.officeEmail")} name="contactEmail" type="email" defaultValue={v("contactEmail", office.contactEmail)} error={e.contactEmail} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t("listings.defaultCurrency")} name="currency" defaultValue={v("currency", office.currency)} options={currencies.map((c) => ({ value: c, label: c }))} error={e.currency} />
        <Select label={t("listings.areaUnit")} name="areaUnit" defaultValue={v("areaUnit", office.areaUnit)} options={units.map((u) => ({ value: u.key, label: u.label }))} error={e.areaUnit} />
      </div>
      <Check
        name="messages"
        label={t("listings.messages")}
        hint={t("listings.messagesHint")}
        defaultChecked={state.values ? state.values.messages === "on" : office.messages}
      />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("listings.saveOffice")}
        </SubmitButton>
      </div>
    </form>
  );
}
