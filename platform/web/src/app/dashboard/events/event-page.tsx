import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelTicketAction, deleteEventAction, deleteTicketTypeAction, setEventStatusAction } from "@/app/actions/events";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { EventStatus } from "@/lib/data/types";
import { attendeesOf } from "@/lib/events/attendees";
import {
  EVENT_ADDRESS_MAX,
  EVENT_CATEGORY_MAX,
  EVENT_DESCRIPTION_MAX,
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGES_MAX,
  EVENT_ORGANISER_MAX,
  EVENT_TITLE_MAX,
  EVENT_VENUE_MAX,
  localDateTimeValue,
} from "@/lib/events/forms";
import { eventWhen } from "@/lib/events/notify";
import { loadEvents, onlineOnly, phaseOf, placesLeft } from "@/lib/events/service";
import { EventForm, TicketTypeForm, type EventFormValues } from "./forms";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { formatDate } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import { utcToLocal } from "@/lib/bookings/time";

export function EventStatusBadge({ status, t }: { status: EventStatus; t: DashboardText["t"] }) {
  if (status === "published") return <Badge tone="success">{t("events.published")}</Badge>;
  if (status === "cancelled") return <Badge tone="danger">{t("events.cancelled")}</Badge>;
  return <Badge tone="neutral">{t("events.draft")}</Badge>;
}

/** 56 "Saturday 18 October, 20:30" (lib/events/notify.ts eventWhen) in the dashboard's language, in the organiser's time zone. */
export function eventWhenIn(lang: Lang, startAt: Date, timeZone: string): string {
  if (lang === "en") return eventWhen(startAt, timeZone);
  const local = utcToLocal(startAt, timeZone);
  return `${formatDate(lang, new Date(`${local.date}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}, ${local.time}`;
}

const STATUS_TONE = { Valid: "success", Used: "info", Cancelled: "neutral" } as const;

/** 28 Adding (id null) or editing an event, with its ticket types and attendees. */
export async function EventPage({ id, notice }: { id: number | null; notice: { saved?: string; told?: string; cancelled?: string; error?: string } }) {
  const { app } = await requireClient("events");
  if (!app || app.connector?.kind !== "events") notFound();
  const store = await getStore();
  const now = new Date();
  const data = await loadEvents(store, app, now);
  const event = id !== null ? (data.events.find((e) => e.id === id) ?? null) : null;
  if (id !== null && !event) notFound();
  const tz = data.settings.timeZone;
  const { t, k, lang } = await dashboardText();
  const categories = [...new Set(data.events.map((e) => e.category).filter((c): c is string => Boolean(c)))].sort();
  const values: EventFormValues = event
    ? {
        id: event.id,
        title: event.title,
        category: event.category ?? "",
        description: event.description,
        organiser: event.organiser ?? "",
        startAt: localDateTimeValue(event.startAt, tz),
        endAt: localDateTimeValue(event.endAt, tz),
        venueName: event.venueName ?? "",
        venueAddress: event.venueAddress ?? "",
        latitude: event.latitude === null ? "" : String(event.latitude),
        longitude: event.longitude === null ? "" : String(event.longitude),
        onlineUrl: event.onlineUrl ?? "",
        capacity: event.capacity === null ? "" : String(event.capacity),
        images: event.imageAssetIds.map((assetId) => ({ assetId, url: assetUrl(assetId) })),
        draft: event.status === "draft",
      }
    : {
        id: null,
        title: "",
        category: "",
        description: "",
        organiser: app.appName ?? "",
        startAt: "",
        endAt: "",
        venueName: "",
        venueAddress: "",
        latitude: "",
        longitude: "",
        onlineUrl: "",
        capacity: "",
        images: [],
        draft: true,
      };
  const form = (
    <section aria-label={t("events.event")} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <EventForm
        event={values}
        categories={categories}
        timeZone={tz}
        limits={{
          title: EVENT_TITLE_MAX,
          category: EVENT_CATEGORY_MAX,
          description: EVENT_DESCRIPTION_MAX,
          organiser: EVENT_ORGANISER_MAX,
          venue: EVENT_VENUE_MAX,
          address: EVENT_ADDRESS_MAX,
          images: EVENT_IMAGES_MAX,
          imageMb: EVENT_IMAGE_MAX_BYTES / 1024 / 1024,
        }}
      />
    </section>
  );
  const header = (
    <div className="flex flex-col gap-2">
      <Link href="/dashboard/events" className="text-sm font-semibold">
        {t("events.back")}
      </Link>
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{event ? event.title : t("events.newEvent")}</h1>
      {event ? <p className="m-0 text-[15px] text-ink-4">{[eventWhenIn(lang, event.startAt, tz), event.venueName ?? t("events.online")].join(" · ")}</p> : null}
    </div>
  );
  if (!event) {
    return (
      <div className="flex max-w-[860px] flex-col gap-6">
        {header}
        {form}
      </div>
    );
  }

  const types = data.types.filter((t) => t.eventId === event.id);
  const left = placesLeft(data, event);
  const attendees = await attendeesOf(store, app, event);
  const counted = attendees.filter((a) => a.status !== "Cancelled");
  const used = attendees.filter((a) => a.status === "Used").length;
  const revenue = counted.reduce((sum, a) => sum + a.ticket.priceCents, 0);
  const phase = phaseOf(event, now);
  const paidOnline = onlineOnly(event) && types.some((t) => t.priceCents > 0);

  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      {header}
      {notice.saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {notice.told ? t("events.savedTold", { count: Number(notice.told) }) : t("events.saved")}
        </p>
      ) : null}
      {notice.cancelled !== undefined ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("events.cancelledTold", { count: Number(notice.cancelled) })}
        </p>
      ) : null}
      {notice.error ? (
        <p role="alert" className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger">
          {k(notice.error)}
        </p>
      ) : null}

      <section aria-labelledby="h-status" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="h-status" className="m-0 text-lg font-bold">
            {t("events.status")}
          </h2>
          <EventStatusBadge status={event.status} t={t} />
          {phase === "ended" ? <Badge tone="neutral">{t("events.ended")}</Badge> : null}
        </div>
        <p className="m-0 text-[15px] text-ink-4">
          {event.status === "published" ? t("events.isPublished") : event.status === "cancelled" ? t("events.isCancelled") : t("events.isDraft")}
        </p>
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t("events.statTickets"), String(counted.length)],
            [t("events.statCheckedIn"), String(used)],
            [t("events.statLeft"), left.event === null ? t("events.noLimit") : String(left.event)],
            [t("events.statSales"), revenue ? formatCents(revenue, data.settings.currency) : t("common.free")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-sand px-3 py-2.5">
              <dt className="text-[13px] text-muted">{label}</dt>
              <dd className="m-0 text-[18px] font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        {event.status !== "cancelled" ? (
          <div className="flex flex-wrap items-start gap-3">
            {event.status === "draft" ? (
              <form action={setEventStatusAction}>
                <input type="hidden" name="id" value={event.id} />
                <input type="hidden" name="status" value="published" />
                <SubmitButton className="h-10" pendingText={t("events.publishing")}>
                  {t("events.publish")}
                </SubmitButton>
              </form>
            ) : counted.length === 0 ? (
              <form action={setEventStatusAction}>
                <input type="hidden" name="id" value={event.id} />
                <input type="hidden" name="status" value="draft" />
                <SubmitButton variant="secondary" className="h-10" pendingText={t("common.saving")}>
                  {t("events.unpublish")}
                </SubmitButton>
              </form>
            ) : null}
            {event.status === "published" && phase !== "ended" ? (
              <form action={setEventStatusAction}>
                <input type="hidden" name="id" value={event.id} />
                <input type="hidden" name="status" value="cancelled" />
                <SubmitButton variant="secondary" className="h-10 text-danger" pendingText={t("events.cancelling")}>
                  <Icon name="event_busy" size={18} />
                  {t("events.cancelEvent")}
                </SubmitButton>
              </form>
            ) : null}
            {attendees.every((a) => a.status === "Cancelled") && !attendees.some((a) => a.ticket.orderId !== null) ? (
              <form action={deleteEventAction}>
                <input type="hidden" name="id" value={event.id} />
                <SubmitButton variant="secondary" className="h-10 text-danger" pendingText={t("common.deleting")}>
                  {t("common.delete")}
                </SubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
        {event.status === "published" && phase !== "ended" ? (
          <p className="m-0 text-[13px] text-muted">{t("events.cancelNote")}</p>
        ) : null}
      </section>

      <section id="tickets" aria-labelledby="h-tickets" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-tickets" className="m-0 text-lg font-bold">
            {t("events.ticketTypes")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("events.ticketTypesText")}</p>
        </div>
        {paidOnline ? (
          <Notice tone="info" icon="info">
            {t("events.onlineIphone")}
          </Notice>
        ) : null}
        {types.length ? (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {types.map((type) => {
              const remaining = left.types.get(type.id) ?? null;
              const price = type.priceCents ? formatCents(type.priceCents, data.settings.currency) : t("common.free");
              const taken = counted.filter((a) => a.ticket.ticketTypeId === type.id).length;
              return (
                <li key={type.id} className="flex flex-col gap-3 border-t border-line-soft pt-4 first:border-t-0 first:pt-0">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-bold">
                    {type.name}
                    <span className="font-normal text-muted">
                      {remaining !== null ? t("events.typeLineLeft", { price, taken, left: remaining }) : t("events.typeLine", { price, taken })}
                    </span>
                  </p>
                  <TicketTypeForm
                    eventId={event.id}
                    currency={data.settings.currency}
                    type={{
                      id: type.id,
                      name: type.name,
                      price: centsToDecimal(type.priceCents),
                      capacity: type.capacity === null ? "" : String(type.capacity),
                      saleEndsAt: localDateTimeValue(type.saleEndsAt, tz),
                      maxPerOrder: String(type.maxPerOrder),
                    }}
                  />
                  <form action={deleteTicketTypeAction}>
                    <input type="hidden" name="id" value={type.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <SubmitButton variant="secondary" className="h-9 px-3 text-sm text-danger" pendingText={t("common.deleting")}>
                      {t("events.deleteType", { name: type.name })}
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 text-[15px] text-muted">{t("events.noTypes")}</p>
        )}
        <div className="rounded-xl border border-dashed border-line p-4">
          <h3 className="m-0 mb-3 text-[15px] font-bold">{t("events.addType")}</h3>
          <TicketTypeForm eventId={event.id} currency={data.settings.currency} type={{ id: null, name: "", price: "", capacity: "", saleEndsAt: "", maxPerOrder: "10" }} />
        </div>
      </section>

      <section id="attendees" aria-labelledby="h-attendees" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-attendees" className="m-0 text-lg font-bold">
            {t("events.attendees")}
          </h2>
          {attendees.length ? (
            <a href={`/api/dashboard/events/${event.id}/attendees`} className={`${btn.secondary} h-10`} download>
              <Icon name="download" size={18} />
              {t("events.downloadList")}
            </a>
          ) : null}
        </div>
        {attendees.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("events.noAttendees")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-start text-[14px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  <th className="py-2 pe-3 text-start font-semibold">{t("events.nameOnTicket")}</th>
                  <th className="py-2 pe-3 text-start font-semibold">{t("events.ticket")}</th>
                  <th className="py-2 pe-3 text-start font-semibold">{t("events.code")}</th>
                  <th className="py-2 pe-3 text-start font-semibold">{t("events.gotBy")}</th>
                  <th className="py-2 pe-3 text-start font-semibold">{t("common.status")}</th>
                  <th className="py-2 font-semibold">
                    <span className="sr-only">{t("common.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.ticket.id} className="border-b border-line-soft align-top">
                    <td className="py-2.5 pe-3 font-semibold">{a.holder}</td>
                    <td className="py-2.5 pe-3">
                      {a.type}
                      <span className="block text-[13px] text-muted">
                        {k(a.price)}
                        {a.order ? ` · ${t("events.orderN", { number: a.order })}` : ""}
                      </span>
                    </td>
                    <td className="py-2.5 pe-3 font-mono text-[13px]" dir="ltr">
                      {a.code}
                    </td>
                    <td className="py-2.5 pe-3">
                      {k(a.buyer)}
                      {a.contact ? (
                        <span className="block text-[13px] text-muted" dir="ltr">
                          {a.contact}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pe-3">
                      <Badge tone={STATUS_TONE[a.status]}>{k(a.status)}</Badge>
                    </td>
                    <td className="py-2.5 text-end">
                      {a.status === "Valid" ? (
                        <form action={cancelTicketAction}>
                          <input type="hidden" name="code" value={a.ticket.code} />
                          <SubmitButton variant="secondary" className="h-8 px-2.5 text-[13px]" pendingText="…">
                            {t("events.cancelTicket")}
                          </SubmitButton>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form}
    </div>
  );
}
