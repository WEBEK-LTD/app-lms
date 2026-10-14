"use client";

/* eslint-disable @next/next/no-img-element -- the event's pictures, served by our own asset route */
import { useActionState, type ReactNode } from "react";
import { saveEventAction, saveEventSettingsAction, saveTicketTypeAction } from "@/app/actions/events";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { initialFormState } from "@/lib/forms";

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

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
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
  const [state, action] = useActionState(saveEventAction, initialFormState);
  const v = (key: keyof EventFormValues & string, fallback: string) => state.values?.[key] ?? fallback;
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {event.id !== null ? <input type="hidden" name="id" value={event.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />

      <Group title="Event">
        <Field label="Title" name="title" required maxLength={limits.title} defaultValue={v("title", event.title)} error={e.title} />
        <Field
          label="Category"
          name="category"
          maxLength={limits.category}
          list="event-categories"
          placeholder="Concerts"
          defaultValue={v("category", event.category)}
          hint="Optional. People filter events by category in the app."
          error={e.category}
        />
        <datalist id="event-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-description" className="text-sm font-semibold">
            Description
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
            Leave an empty line between paragraphs. Simple HTML works too: headings, bold, lists, links, pictures from https addresses, and YouTube or Vimeo videos
            pasted as their embed code.
          </span>
          <FieldError id="f-description-error" error={e.description} />
        </div>
        <Field label="Organiser" name="organiser" maxLength={limits.organiser} defaultValue={v("organiser", event.organiser)} hint="Optional. Shown on the event's page." error={e.organiser} />
      </Group>

      <Group title="When" hint={`Times are in ${timeZone} (change it in Event settings).`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts" name="startAt" type="datetime-local" required defaultValue={v("startAt", event.startAt)} error={e.startAt} />
          <Field label="Ends" name="endAt" type="datetime-local" required defaultValue={v("endAt", event.endAt)} error={e.endAt} />
        </div>
      </Group>

      <Group title="Where" hint="A venue, an online link, or both. An event with only an online link is an online event: on iPhones its paid tickets can't be bought in the app.">
        <Field label="Venue" name="venueName" maxLength={limits.venue} placeholder="Main Hall" defaultValue={v("venueName", event.venueName)} error={e.venueName} />
        <Field label="Address" name="venueAddress" maxLength={limits.address} defaultValue={v("venueAddress", event.venueAddress)} error={e.venueAddress} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" name="latitude" inputMode="decimal" placeholder="40.9837" defaultValue={v("latitude", event.latitude)} error={e.latitude} />
          <Field label="Longitude" name="longitude" inputMode="decimal" placeholder="29.0262" defaultValue={v("longitude", event.longitude)} error={e.longitude} />
        </div>
        <p className="m-0 text-[13px] text-muted">Optional: the map position for “Open in maps”. In Google Maps, right-click the place to copy both numbers.</p>
        <Field
          label="Online link"
          name="onlineUrl"
          type="url"
          placeholder="https://"
          defaultValue={v("onlineUrl", event.onlineUrl)}
          hint="Optional. Only people holding a ticket see it."
          error={e.onlineUrl}
        />
      </Group>

      <Group title="Places">
        <Field
          label="Places in total"
          name="capacity"
          inputMode="numeric"
          placeholder="No limit"
          defaultValue={v("capacity", event.capacity)}
          hint="Optional. Every ticket type counts towards it; each ticket type can have its own limit too."
          error={e.capacity}
        />
      </Group>

      <Group title="Pictures" hint={`Up to ${limits.images}, PNG or JPEG, up to ${limits.imageMb} MB each. The first one is the cover.`}>
        {event.images.length ? (
          <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
            {event.images.map((image, i) => (
              <li key={image.assetId} className="flex flex-col gap-2">
                <img src={image.url} alt={i === 0 ? "The cover picture" : `Picture ${i + 1}`} className="h-24 w-40 rounded-lg border border-line object-cover" />
                <Check name="removeImage" value={image.assetId} label="Remove" defaultChecked={false} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-images" className="text-sm font-semibold">
            Add pictures
          </label>
          <input id="f-images" type="file" name="images" multiple accept="image/png,image/jpeg" className="text-sm" aria-invalid={e.images ? true : undefined} />
          <FieldError id="f-images-error" error={e.images} />
        </div>
      </Group>

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        {event.draft ? (
          <>
            <SubmitButton variant="secondary" className="h-11" name="intent" value="draft" pendingText="Saving…">
              Save as draft
            </SubmitButton>
            <SubmitButton className="h-11" name="intent" value="publish" pendingText="Publishing…">
              Publish
            </SubmitButton>
          </>
        ) : (
          <SubmitButton className="h-11" pendingText="Saving…">
            Save event
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
        <Field label="Ticket name" id={`${prefix}-name`} name="name" small maxLength={80} placeholder="Standard" defaultValue={v("name", type.name)} error={e.name} className="lg:col-span-2" />
        <Field label={`Price (${currency})`} id={`${prefix}-price`} name="price" small inputMode="decimal" placeholder="0 for free" defaultValue={v("price", type.price)} error={e.price} />
        <Field label="How many" id={`${prefix}-capacity`} name="capacity" small inputMode="numeric" placeholder="No limit" defaultValue={v("capacity", type.capacity)} error={e.capacity} />
        <Field label="Most per person" id={`${prefix}-max`} name="maxPerOrder" small inputMode="numeric" defaultValue={v("maxPerOrder", type.maxPerOrder)} error={e.maxPerOrder} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Sales end"
          id={`${prefix}-sale-ends`}
          name="saleEndsAt"
          type="datetime-local"
          small
          defaultValue={v("saleEndsAt", type.saleEndsAt)}
          hint="Optional. Sales always end when the event starts."
          error={e.saleEndsAt}
          className="min-w-[220px]"
        />
        <SubmitButton variant={type.id === null ? "primary" : "secondary"} className="h-10" pendingText="Saving…">
          {type.id === null ? "Add ticket type" : "Save"}
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
            Currency
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
        <Field label="Time zone" name="timeZone" defaultValue={value("timeZone", settings.timeZone)} hint="Like Europe/Istanbul or Asia/Dubai." error={e.timeZone} />
      </div>
      <Check name="showMap" label="Offer “Open in maps” for venues with a map position" defaultChecked={checked("showMap", settings.showMap)} />
      <Check
        name="allowCancel"
        label="Let people cancel free tickets in the app"
        hint="Their place goes back on sale. Paid tickets are refunded by you."
        defaultChecked={checked("allowCancel", settings.allowCancelHours !== null)}
      />
      <Field
        label="Until how many hours before the start"
        name="allowCancelHours"
        inputMode="numeric"
        defaultValue={value("allowCancelHours", String(settings.allowCancelHours ?? 24))}
        error={e.allowCancelHours}
        className="max-w-[260px]"
      />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
          Save settings
        </SubmitButton>
      </div>
    </form>
  );
}
