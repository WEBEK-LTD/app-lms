"use client";

/* eslint-disable @next/next/no-img-element -- the event's pictures, served by our own asset route */
import { useActionState, type ReactNode } from "react";
import { saveEventAction, saveEventSettingsAction, saveTicketTypeAction } from "@/app/actions/events";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";
import { useDashT } from "@/components/dashboard-i18n";
import { richText } from "@/i18n/rich";

export interface EventFormValues {
  id: number | null;
  title: string;
  category: string;
  description: string;
  organiser: string;
  startAt: string;
  endAt: string;
  venueName: string;
  venueAddress: string;
  latitude: string;
  longitude: string;
  onlineUrl: string;
  capacity: string;
  images: { assetId: string; url: string }[];
  /** A draft can be published from the form; published and cancelled events are only saved. */
  draft: boolean;
}

function Group({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-4 border-0 border-t border-line-soft p-0 pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full text-[17px] font-bold">{title}</legend>
      {hint ? <p className="m-0 text-[14px] text-muted">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

function Check({ name, label, hint, defaultChecked, value }: { name: string; label: string; hint?: string; defaultChecked: boolean; value?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{label}</span>
        {hint ? <span className="text-[13px] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Adding or editing an event. Times are in the organiser's time zone. */
export function EventForm({
  event,
  categories,
  timeZone,
  limits,
}: {
  event: EventFormValues;
  /** Categories used before, offered as suggestions. */
  categories: string[];
  timeZone: string;
  limits: { title: number; category: number; description: number; organiser: number; venue: number; address: number; images: number; imageMb: number };
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveEventAction, initialFormState);
  const v = (key: keyof EventFormValues & string, fallback: string) => state.values?.[key] ?? fallback;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {event.id !== null ? <input type="hidden" name="id" value={event.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />

      <Group title={t("events.event")}>
        <Field label={t("common.title")} name="title" required maxLength={limits.title} defaultValue={v("title", event.title)} error={e.title} />
        <Field
          label={t("events.category")}
          name="category"
          maxLength={limits.category}
          list="event-categories"
          placeholder={t("events.categoryPlaceholder")}
          defaultValue={v("category", event.category)}
          hint={t("events.categoryHint")}
          error={e.category}
        />
        <datalist id="event-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-description" className="text-sm font-semibold">
            {t("common.description")}
          </label>
          <textarea
            id="f-description"
            name="description"
            rows={10}
            maxLength={limits.description}
            defaultValue={v("description", event.description)}
            className="input min-h-48 py-3"
            aria-describedby="f-description-hint"
            aria-invalid={e.description ? true : undefined}
          />
          <span id="f-description-hint" className="text-[13px] text-muted">
            {t("events.descriptionHint")}
          </span>
          <FieldError id="f-description-error" error={e.description} />
        </div>
        <Field
          label={t("events.organiser")}
          name="organiser"
          maxLength={limits.organiser}
          defaultValue={v("organiser", event.organiser)}
          hint={t("events.organiserHint")}
          error={e.organiser}
        />
      </Group>

      <Group title={t("events.when")} hint={richText(t("events.whenHint"), { zone: () => <bdi dir="ltr">{timeZone}</bdi> })}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("events.starts")} name="startAt" type="datetime-local" required defaultValue={v("startAt", event.startAt)} error={e.startAt} />
          <Field label={t("events.ends")} name="endAt" type="datetime-local" required defaultValue={v("endAt", event.endAt)} error={e.endAt} />
        </div>
      </Group>

      <Group title={t("events.where")} hint={t("events.whereHint")}>
        <Field label={t("events.venue")} name="venueName" maxLength={limits.venue} placeholder={t("events.venuePlaceholder")} defaultValue={v("venueName", event.venueName)} error={e.venueName} />
        <Field label={t("events.address")} name="venueAddress" maxLength={limits.address} defaultValue={v("venueAddress", event.venueAddress)} error={e.venueAddress} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("events.latitude")} name="latitude" inputMode="decimal" placeholder="40.9837" defaultValue={v("latitude", event.latitude)} error={e.latitude} />
          <Field label={t("events.longitude")} name="longitude" inputMode="decimal" placeholder="29.0262" defaultValue={v("longitude", event.longitude)} error={e.longitude} />
        </div>
        <p className="m-0 text-[13px] text-muted">{t("events.mapHint")}</p>
        <Field
          label={t("events.onlineLink")}
          name="onlineUrl"
          type="url"
          placeholder="https://"
          defaultValue={v("onlineUrl", event.onlineUrl)}
          hint={t("events.onlineLinkHint")}
          error={e.onlineUrl}
        />
      </Group>

      <Group title={t("events.places")}>
        <Field
          label={t("events.placesTotal")}
          name="capacity"
          inputMode="numeric"
          placeholder={t("events.noLimit")}
          defaultValue={v("capacity", event.capacity)}
          hint={t("events.placesHint")}
          error={e.capacity}
        />
      </Group>

      <Group title={t("events.pictures")} hint={t("events.picturesHint", { max: limits.images, size: limits.imageMb })}>
        {event.images.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
            {event.images.map((image, i) => (
              <li key={image.assetId} className="flex flex-col gap-2">
                <img src={image.url} alt={i === 0 ? t("events.coverPicture") : t("events.pictureN", { n: i + 1 })} className="h-24 w-40 rounded-lg border border-line object-cover" />
                <Check name="removeImage" value={image.assetId} label={t("common.remove")} defaultChecked={false} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-images" className="text-sm font-semibold">
            {t("events.addPictures")}
          </label>
          <input id="f-images" type="file" name="images" multiple accept="image/png,image/jpeg" className="text-sm" aria-invalid={e.images ? true : undefined} />
          <FieldError id="f-images-error" error={e.images} />
        </div>
      </Group>

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        {event.draft ? (
          <>
            <SubmitButton variant="secondary" className="h-11" name="intent" value="draft" pendingText={t("common.saving")}>
              {t("events.saveDraft")}
            </SubmitButton>
            <SubmitButton className="h-11" name="intent" value="publish" pendingText={t("events.publishing")}>
              {t("events.publish")}
            </SubmitButton>
          </>
        ) : (
          <SubmitButton className="h-11" pendingText={t("common.saving")}>
            {t("events.saveEvent")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

export interface TicketTypeValues {
  id: number | null;
  name: string;
  price: string;
  capacity: string;
  saleEndsAt: string;
  maxPerOrder: string;
}

/** Adding (id null) or editing a ticket type. */
export function TicketTypeForm({ eventId, type, currency }: { eventId: number; type: TicketTypeValues; currency: string }) {
  const t = useDashT();
  const [state, action] = useActionState(saveTicketTypeAction, initialFormState);
  const fresh = type.id === null && state.ok;
  const v = (key: keyof TicketTypeValues & string, fallback: string) => (fresh ? fallback : (state.values?.[key] ?? fallback));
  const e = state.errors ?? {};
  const prefix = type.id === null ? "new" : `t${type.id}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-3" key={fresh ? state.message : "form"}>
      <input type="hidden" name="eventId" value={eventId} />
      {type.id !== null ? <input type="hidden" name="id" value={type.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field
          label={t("events.ticketName")}
          id={`${prefix}-name`}
          name="name"
          small
          maxLength={80}
          placeholder={t("events.ticketPlaceholder")} defaultValue={v("name", type.name)} error={e.name} className="lg:col-span-2" />
        <Field
          label={t("events.priceIn", { currency })}
          id={`${prefix}-price`}
          name="price"
          small
          inputMode="decimal"
          placeholder={t("events.pricePlaceholder")} defaultValue={v("price", type.price)} error={e.price} />
        <Field
          label={t("events.howMany")}
          id={`${prefix}-capacity`}
          name="capacity"
          small
          inputMode="numeric"
          placeholder={t("events.noLimit")} defaultValue={v("capacity", type.capacity)} error={e.capacity} />
        <Field label={t("events.mostPerPerson")} id={`${prefix}-max`} name="maxPerOrder" small inputMode="numeric" defaultValue={v("maxPerOrder", type.maxPerOrder)} error={e.maxPerOrder} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label={t("events.salesEnd")}
          id={`${prefix}-sale-ends`}
          name="saleEndsAt"
          type="datetime-local"
          small
          defaultValue={v("saleEndsAt", type.saleEndsAt)}
          hint={t("events.salesEndHint")}
          error={e.saleEndsAt}
          className="min-w-[220px]"
        />
        <SubmitButton variant={type.id === null ? "primary" : "secondary"} className="h-10" pendingText={t("common.saving")}>
          {type.id === null ? t("events.addTypeButton") : t("common.save")}
        </SubmitButton>
      </div>
      <FormMessage message={state.errors ? undefined : state.message} ok={state.ok} />
    </form>
  );
}

export function EventSettingsForm({
  settings,
  currencies,
}: {
  settings: { currency: string; timeZone: string; showMap: boolean; allowCancelHours: number | null };
  currencies: string[];
}) {
  const t = useDashT();
  const [state, action] = useActionState(saveEventSettingsAction, initialFormState);
  const e = state.errors ?? {};
  const value = (key: string, fallback: string) => state.values?.[key] ?? fallback;
  const checked = (key: string, fallback: boolean) => (state.values ? state.values[key] === "on" : fallback);
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <FormMessage message={state.errors ? undefined : state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-currency" className="text-sm font-semibold">
            {t("shop.currency")}
          </label>
          <select id="f-currency" name="currency" defaultValue={value("currency", settings.currency)} className="input">
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError id="f-currency-error" error={e.currency} />
        </div>
        <Field
          label={t("shop.timeZone")}
          name="timeZone"
          dir="ltr"
          defaultValue={value("timeZone", settings.timeZone)}
          hint={t("events.timeZoneHint")}
          error={e.timeZone}
        />
      </div>
      <Check name="showMap" label={t("events.openInMaps")} defaultChecked={checked("showMap", settings.showMap)} />
      <Check
        name="allowCancel"
        label={t("events.allowCancel")}
        hint={t("events.allowCancelHint")}
        defaultChecked={checked("allowCancel", settings.allowCancelHours !== null)}
      />
      <Field
        label={t("events.cancelHours")}
        name="allowCancelHours"
        inputMode="numeric"
        defaultValue={value("allowCancelHours", String(settings.allowCancelHours ?? 24))}
        error={e.allowCancelHours}
        className="max-w-[260px]"
      />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
          {t("shop.saveSettings")}
        </SubmitButton>
      </div>
    </form>
  );
}
