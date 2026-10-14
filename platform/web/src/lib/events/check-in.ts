import type { DataStore } from "../data/store";
import type { App, EventTicket } from "../data/types";
import { formatTicketCode, readCheckIn } from "./codes";

/**
 * 28 Check-in at the door (the dashboard's Check-in page): a scanned QR code
 * (its signature checked with the app's key) or a typed code. A valid ticket
 * is marked used, once; the store makes that atomic, so two phones scanning
 * the same ticket at once let it in only once.
 */

export type CheckInOutcome = "admitted" | "used" | "cancelled" | "not_paid" | "other_event" | "not_found" | "forged" | "not_a_code";

export interface CheckInAnswer {
  outcome: CheckInOutcome;
  /** The ticket, for every outcome that found one. */
  ticket?: { code: string; holderName: string; typeName: string; eventTitle: string; eventId: number; usedAt: Date | null };
}

async function describe(store: DataStore, app: App, ticket: EventTicket): Promise<NonNullable<CheckInAnswer["ticket"]>> {
  const [event, types] = await Promise.all([store.getEvent(app.id, ticket.eventId), store.listTicketTypes(app.id, ticket.eventId)]);
  return {
    code: formatTicketCode(ticket.code),
    holderName: ticket.holderName,
    typeName: types.find((t) => t.id === ticket.ticketTypeId)?.name ?? "Ticket",
    eventTitle: event?.title ?? "An event",
    eventId: ticket.eventId,
    usedAt: ticket.usedAt,
  };
}

export async function checkIn(input: { store: DataStore; app: App; key: string; scanned: string; eventId: number | null; now: Date }): Promise<CheckInAnswer> {
  const { store, app } = input;
  const read = readCheckIn(input.key, app.id, input.scanned);
  if ("error" in read) return { outcome: read.error === "bad_signature" ? "forged" : "not_a_code" };
  const found = await store.getTicketByCode(app.id, read.code);
  if (!found) return { outcome: "not_found" };
  // A ticket for another event doesn't get in, and stays valid for its own.
  if (input.eventId !== null && found.eventId !== input.eventId) return { outcome: "other_event", ticket: await describe(store, app, found) };
  const event = await store.getEvent(app.id, found.eventId);
  if (event?.status === "cancelled" && found.status === "valid") return { outcome: "cancelled", ticket: await describe(store, app, found) };
  const result = await store.checkInTicket(app.id, read.code, input.now);
  if (result.ok) return { outcome: "admitted", ticket: await describe(store, app, result.ticket) };
  if (result.reason === "not_found") return { outcome: "not_found" };
  const outcome = result.reason === "pending" ? "not_paid" : result.reason;
  return { outcome, ticket: await describe(store, app, result.ticket) };
}
