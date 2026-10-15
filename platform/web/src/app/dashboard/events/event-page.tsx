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

export function EventStatusBadge({ status }: { status: EventStatus }) {
  if (status === "published") return <Badge tone="success">Published</Badge>;
  if (status === "cancelled") return <Badge tone="danger">Cancelled</Badge>;
  return <Badge tone="neutral">Draft</Badge>;
}

const STATUS_TONE = { Valid: "success", Used: "info", Cancelled: "neutral" } as const;

/** 28 Adding (id null) or editing an event, with its ticket types and attendees. */
export async function EventPage({ id, notice }: { id: number | null; notice: { saved?: string; told?: string; cancelled?: string; error?: string } }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "events") notFound();
  const store = await getStore();
  const now = new Date();
  const data = await loadEvents(store, app, now);
  const event = id !== null ? (data.events.find((e) => e.id === id) ?? null) : null;
  if (id !== null && !event) notFound();
  const tz = data.settings.timeZone;
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
    <section aria-label="Event" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
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
        ← Events
      </Link>
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{event ? event.title : "New event"}</h1>
      {event ? <p className="m-0 text-[15px] text-ink-4">{[eventWhen(event.startAt, tz), event.venueName ?? "Online"].join(" · ")}</p> : null}
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
          Saved.{notice.told ? ` ${notice.told} ticket ${notice.told === "1" ? "holder was" : "holders were"} told about the change.` : ""}
        </p>
      ) : null}
      {notice.cancelled !== undefined ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          The event is cancelled, with its tickets. {notice.cancelled} ticket {notice.cancelled === "1" ? "holder was" : "holders were"} told.
        </p>
      ) : null}
      {notice.error ? (
        <p role="alert" className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger">
          {notice.error}
        </p>
      ) : null}

      <section aria-labelledby="h-status" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="h-status" className="m-0 text-lg font-bold">
            Status
          </h2>
          <EventStatusBadge status={event.status} />
          {phase === "ended" ? <Badge tone="neutral">Ended</Badge> : null}
        </div>
        <p className="m-0 text-[15px] text-ink-4">
          {event.status === "published"
            ? "Published: it's in the app, with its tickets."
            : event.status === "cancelled"
              ? "Cancelled: the app shows it as cancelled and its tickets are cancelled."
              : "A draft: only you see it. Add its tickets, then publish it."}
        </p>
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Tickets", String(counted.length)],
            ["Checked in", String(used)],
            ["Places left", left.event === null ? "No limit" : String(left.event)],
            ["Sales", revenue ? formatCents(revenue, data.settings.currency) : "Free"],
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
                <SubmitButton className="h-10" pendingText="Publishing…">
                  Publish
                </SubmitButton>
              </form>
            ) : counted.length === 0 ? (
              <form action={setEventStatusAction}>
                <input type="hidden" name="id" value={event.id} />
                <input type="hidden" name="status" value="draft" />
                <SubmitButton variant="secondary" className="h-10" pendingText="Saving…">
                  Unpublish
                </SubmitButton>
              </form>
            ) : null}
            {event.status === "published" && phase !== "ended" ? (
              <form action={setEventStatusAction}>
                <input type="hidden" name="id" value={event.id} />
                <input type="hidden" name="status" value="cancelled" />
                <SubmitButton variant="secondary" className="h-10 text-danger" pendingText="Cancelling…">
                  <Icon name="event_busy" size={18} />
                  Cancel the event
                </SubmitButton>
              </form>
            ) : null}
            {attendees.every((a) => a.status === "Cancelled") && !attendees.some((a) => a.ticket.orderId !== null) ? (
              <form action={deleteEventAction}>
                <input type="hidden" name="id" value={event.id} />
                <SubmitButton variant="secondary" className="h-10 text-danger" pendingText="Deleting…">
                  Delete
                </SubmitButton>
              </form>
            ) : null}
          </div>
        ) : null}
        {event.status === "published" && phase !== "ended" ? (
          <p className="m-0 text-[13px] text-muted">Cancelling cancels every ticket and tells their holders in the app. Refund paid tickets in your payment provider&apos;s panel.</p>
        ) : null}
      </section>

      <section id="tickets" aria-labelledby="h-tickets" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-tickets" className="m-0 text-lg font-bold">
            Ticket types
          </h2>
          <p className="m-0 text-[15px] text-ink-4">A price of 0 makes free tickets, taken in the app. Paid tickets are paid by card and issued once the payment is confirmed.</p>
        </div>
        {paidOnline ? (
          <Notice tone="info" icon="info">
            This is an online event (no venue): on iPhones, Apple doesn&apos;t let apps sell tickets to it, so paid tickets show without a buy button there. Android
            sells them, and free tickets work everywhere.
          </Notice>
        ) : null}
        {types.length ? (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {types.map((t) => {
              const remaining = left.types.get(t.id) ?? null;
              return (
                <li key={t.id} className="flex flex-col gap-3 border-t border-line-soft pt-4 first:border-t-0 first:pt-0">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-bold">
                    {t.name}
                    <span className="font-normal text-muted">
                      {t.priceCents ? formatCents(t.priceCents, data.settings.currency) : "Free"} ·{" "}
                      {counted.filter((a) => a.ticket.ticketTypeId === t.id).length} taken
                      {remaining !== null ? ` · ${remaining} left` : ""}
                    </span>
                  </p>
                  <TicketTypeForm
                    eventId={event.id}
                    currency={data.settings.currency}
                    type={{
                      id: t.id,
                      name: t.name,
                      price: centsToDecimal(t.priceCents),
                      capacity: t.capacity === null ? "" : String(t.capacity),
                      saleEndsAt: localDateTimeValue(t.saleEndsAt, tz),
                      maxPerOrder: String(t.maxPerOrder),
                    }}
                  />
                  <form action={deleteTicketTypeAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <SubmitButton variant="secondary" className="h-9 px-3 text-sm text-danger" pendingText="Deleting…">
                      Delete {t.name}
                    </SubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 text-[15px] text-muted">No tickets yet. Add at least one type so people can get tickets.</p>
        )}
        <div className="rounded-xl border border-dashed border-line p-4">
          <h3 className="m-0 mb-3 text-[15px] font-bold">Add a ticket type</h3>
          <TicketTypeForm eventId={event.id} currency={data.settings.currency} type={{ id: null, name: "", price: "", capacity: "", saleEndsAt: "", maxPerOrder: "10" }} />
        </div>
      </section>

      <section id="attendees" aria-labelledby="h-attendees" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-attendees" className="m-0 text-lg font-bold">
            Attendees
          </h2>
          {attendees.length ? (
            <a href={`/api/dashboard/events/${event.id}/attendees`} className={`${btn.secondary} h-10`} download>
              <Icon name="download" size={18} />
              Download the attendee list
            </a>
          ) : null}
        </div>
        {attendees.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No tickets yet. Tickets people get in the app show here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-line text-[13px] text-muted">
                  <th className="py-2 pr-3 font-semibold">Name on ticket</th>
                  <th className="py-2 pr-3 font-semibold">Ticket</th>
                  <th className="py-2 pr-3 font-semibold">Code</th>
                  <th className="py-2 pr-3 font-semibold">Got by</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.ticket.id} className="border-b border-line-soft align-top">
                    <td className="py-2.5 pr-3 font-semibold">{a.holder}</td>
                    <td className="py-2.5 pr-3">
                      {a.type}
                      <span className="block text-[13px] text-muted">
                        {a.price}
                        {a.order ? ` · order ${a.order}` : ""}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[13px]">{a.code}</td>
                    <td className="py-2.5 pr-3">
                      {a.buyer}
                      {a.contact ? <span className="block text-[13px] text-muted">{a.contact}</span> : null}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      {a.status === "Valid" ? (
                        <form action={cancelTicketAction}>
                          <input type="hidden" name="code" value={a.ticket.code} />
                          <SubmitButton variant="secondary" className="h-8 px-2.5 text-[13px]" pendingText="…">
                            Cancel ticket
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
