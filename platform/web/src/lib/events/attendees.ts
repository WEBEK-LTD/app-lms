import { formatCents } from "../catalog/money";
import { orderNumber } from "../catalog/settings";
import type { DataStore } from "../data/store";
import type { App, EventRecord, EventTicket } from "../data/types";
import { utcToLocal } from "../bookings/time";
import { formatTicketCode } from "./codes";
import { csv } from "./forms";
import { eventSettingsOf } from "./service";

/** 28 An event's tickets for its organiser: the attendee list on the event's page and its CSV file. */

export interface AttendeeRow {
  ticket: EventTicket;
  code: string;
  holder: string;
  type: string;
  price: string;
  /** Valid, Used, Cancelled (the event's cancellation counts). */
  status: "Valid" | "Used" | "Cancelled";
  /** Who got it in the app, and how to reach them. */
  buyer: string;
  contact: string;
  order: string | null;
}

export async function attendeesOf(store: DataStore, app: App, event: EventRecord): Promise<AttendeeRow[]> {
  const [tickets, types, settings] = await Promise.all([
    store.listTickets({ appId: app.id, eventId: event.id }),
    store.listTicketTypes(app.id, event.id),
    eventSettingsOf(store, app.id),
  ]);
  const issued = tickets.filter((t) => t.status !== "pending");
  const users = new Map<number, Awaited<ReturnType<DataStore["getHostedUser"]>>>();
  for (const id of new Set(issued.map((t) => t.userId).filter((id): id is number => id !== null))) users.set(id, await store.getHostedUser(app.id, id));
  return issued.map((t) => {
    const user = t.userId !== null ? users.get(t.userId) : null;
    return {
      ticket: t,
      code: formatTicketCode(t.code),
      holder: t.holderName,
      type: types.find((x) => x.id === t.ticketTypeId)?.name ?? "Ticket",
      price: t.priceCents ? formatCents(t.priceCents, settings.currency) : "Free",
      status: t.status === "used" ? "Used" : t.status === "cancelled" || event.status === "cancelled" ? "Cancelled" : "Valid",
      buyer: user?.name ?? "Deleted account",
      contact: [user?.phone, user?.email].filter(Boolean).join(", "),
      order: t.orderId !== null ? orderNumber({ id: t.orderId }) : null,
    };
  });
}

/** The attendee list as a CSV file, times in the organiser's time zone. 62 `k` puts its words in the downloader's language. */
export async function attendeesCsv(store: DataStore, app: App, event: EventRecord, k: (english: string) => string = (english) => english): Promise<string> {
  const [rows, settings] = await Promise.all([attendeesOf(store, app, event), eventSettingsOf(store, app.id)]);
  const local = (at: Date | null) => {
    if (!at) return "";
    const l = utcToLocal(at, settings.timeZone);
    return `${l.date} ${l.time}`;
  };
  return csv([
    ["Ticket code", "Name on ticket", "Ticket type", "Price", "Status", "Got by", "Phone or email", "Order", "Got on", "Checked in at"].map(k),
    ...rows.map((r) => [
      r.code,
      r.holder,
      r.type === "Ticket" ? k(r.type) : r.type,
      r.price === "Free" ? k(r.price) : r.price,
      k(r.status),
      r.buyer === "Deleted account" ? k(r.buyer) : r.buyer,
      r.contact,
      r.order,
      local(r.ticket.createdAt),
      local(r.ticket.usedAt),
    ]),
  ]);
}
