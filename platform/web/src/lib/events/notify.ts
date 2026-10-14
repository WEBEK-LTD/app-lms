import { utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, EventRecord } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { sendPush, type ServiceAccount } from "../hosted/push";

/**
 * 28 Ticket holders hear about their event: when its time, place or online
 * link changes, and when it's cancelled. Each holder gets a notification in
 * their inbox that opens the event, pushed to their phones when push is on.
 * The inbox keeps it even when push fails.
 */

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const DAY = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** "Saturday 18 October, 20:30", in the organiser's time zone. */
export function eventWhen(startAt: Date, timeZone: string): string {
  const local = utcToLocal(startAt, timeZone);
  return `${DAY.format(new Date(`${local.date}T12:00:00Z`))}, ${local.time}`;
}

/** What changed that ticket holders need to know, or null when nothing did. */
export function eventChange(before: EventRecord, after: EventRecord): "time" | "place" | "link" | null {
  if (before.startAt.getTime() !== after.startAt.getTime() || before.endAt.getTime() !== after.endAt.getTime()) return "time";
  if ((before.venueName ?? "") !== (after.venueName ?? "") || (before.venueAddress ?? "") !== (after.venueAddress ?? "")) return "place";
  if ((before.onlineUrl ?? "") !== (after.onlineUrl ?? "")) return "link";
  return null;
}

/** The notification's words for a change or a cancellation. */
export function eventNoticeText(event: EventRecord, kind: "time" | "place" | "link" | "cancelled", timeZone: string): { title: string; body: string } {
  const where = event.venueName ?? "online";
  const text =
    kind === "cancelled"
      ? { title: `Cancelled: ${event.title}`, body: `${event.title} on ${eventWhen(event.startAt, timeZone)} is cancelled. Your ticket is cancelled too.` }
      : kind === "link"
        ? { title: `New link: ${event.title}`, body: `The online link of ${event.title} changed. Open your ticket to join.` }
        : { title: `Changed: ${event.title}`, body: `${event.title} is now on ${eventWhen(event.startAt, timeZone)}, ${where}. Your ticket still works.` };
  return { title: clip(text.title, NOTIFICATION_TITLE_MAX), body: clip(text.body, NOTIFICATION_BODY_MAX) };
}

/** The app users holding tickets to the event (valid, used or, for a cancellation, just cancelled). */
export async function ticketHolders(store: DataStore, app: App, eventId: number, statuses: readonly string[] = ["valid", "used"]): Promise<number[]> {
  const tickets = await store.listTickets({ appId: app.id, eventId });
  return [...new Set(tickets.filter((t) => statuses.includes(t.status) && t.userId !== null).map((t) => t.userId!))];
}

/** Tells these holders: one notification each, and a push to their phones. */
export async function notifyTicketHolders(input: {
  store: DataStore;
  app: App;
  event: EventRecord;
  userIds: number[];
  title: string;
  body: string;
  account: ServiceAccount | null;
  now: Date;
  send?: typeof sendPush;
}): Promise<{ notified: number; pushed: number }> {
  const { store, app, event } = input;
  for (const userId of input.userIds) {
    await store.createHostedNotification({ appId: app.id, userId, title: input.title, body: input.body, eventId: event.id, createdAt: input.now });
  }
  if (!input.account || input.userIds.length === 0) return { notified: input.userIds.length, pushed: 0 };
  const tokens = (await store.listHostedPushDevices(app.id, input.userIds)).map((d) => d.pushToken!);
  if (tokens.length === 0) return { notified: input.userIds.length, pushed: 0 };
  try {
    const result = await (input.send ?? sendPush)(
      input.account,
      tokens,
      { title: input.title, body: input.body, data: { type: "event", event_id: String(event.id) } },
      { now: input.now },
    );
    for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    return { notified: input.userIds.length, pushed: result.sent };
  } catch (e) {
    console.error(`[events] app ${app.id}: push to ticket holders failed: ${e instanceof Error ? e.message : "unknown error"}`);
    return { notified: input.userIds.length, pushed: 0 };
  }
}
