import { audit, fail, moderateNew, notify, requireAdmin, type Fail } from "../trust/service";
import { engageOf, type EngageCtx } from "./context";
import type { CommunityEvent, EventComment, EventKind, Page } from "./store";

/**
 * 234 Events and live sessions. An event is online (a join link) or in
 * person (a place), always free; a live session is an event with an embed
 * URL (YouTube Live) or a meeting link: no streaming server of our own.
 * Times are kept in UTC with the organiser's time zone; each reader's app
 * shows them in their own. Members RSVP, get a reminder the day before and
 * an hour before (push and email), save an .ics file, see who is going,
 * and talk in the comments during a live session; a replay link follows.
 */

const HTTPS = /^https:\/\/[^\s/$.?#][^\s]*$/i;
const KINDS: readonly EventKind[] = ["online", "in_person", "live"];
const MAX_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;
/** Without an end: an hour long. */
const DEFAULT_LENGTH_MS = 60 * 60 * 1000;
const CAPACITY_MAX = 100_000;
const COMMENT_MAX = 4000;

/** Where an event is now: before it, on now, over, or cancelled. */
export type EventPhase = "scheduled" | "live" | "ended" | "cancelled";

export function eventPhase(e: Pick<CommunityEvent, "status" | "startsAt" | "endsAt">, now: Date): EventPhase {
  if (e.status === "cancelled") return "cancelled";
  if (now >= e.endsAt) return "ended";
  if (now >= e.startsAt) return "live";
  return "scheduled";
}

/** Whether `zone` is a time zone the reader's device knows (IANA, "Europe/Istanbul"). */
export function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone.length <= 64;
  } catch {
    return false;
  }
}

/**
 * A YouTube video or live stream's player address, from any of its links
 * (watch, live, youtu.be, embed); null for anything else. A YouTube link is
 * always kept as its player's address (youtube-nocookie.com).
 */
export function youtubeEmbed(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = u.pathname.split("/");
    if (first === "watch") id = u.searchParams.get("v");
    else if (first === "live" || first === "embed" || first === "shorts") id = second ?? null;
  }
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

type EventFields = Pick<CommunityEvent, "kind" | "title" | "body" | "startsAt" | "endsAt" | "capacity" | "timeZone" | "location" | "joinUrl" | "embedUrl" | "replayUrl" | "coverUrl" | "groupId">;

/** An event's fields as the admin sends them (EventInput); with `current`, only what is sent changes. */
export function parseEvent(input: unknown, current?: CommunityEvent): { ok: true; value: EventFields } | { ok: false; errors: Record<string, string> } {
  const v = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const has = (k: string) => v[k] !== undefined;
  const str = (k: string, was: string | null | undefined) => (has(k) ? (typeof v[k] === "string" ? (v[k] as string).trim() : v[k] === null ? "" : null) : (was ?? ""));
  const kind = (has("kind") || !current ? v.kind : current.kind) as EventKind;
  if (!KINDS.includes(kind)) errors.kind = "kind must be online, in_person or live.";
  const title = str("title", current?.title);
  if (title === null || title.length < 5 || title.length > 160) errors.title = "Give it a title of 5 to 160 characters.";
  const body = str("description", current?.body);
  if (body === null || body.length > 10_000) errors.description = "Keep the description under 10,000 characters.";
  const time = (k: string, was: Date | undefined) => (has(k) || !was ? (typeof v[k] === "string" && !Number.isNaN(new Date(v[k] as string).getTime()) ? new Date(v[k] as string) : null) : was);
  const startsAt = time("starts_at", current?.startsAt);
  if (!startsAt) errors.starts_at = "Give the start as a date and time.";
  // No end (or null): an hour after the start, moving with it.
  const endGiven = has("ends_at") && v.ends_at !== null;
  const endsAt = endGiven ? time("ends_at", undefined) : has("ends_at") || !current || has("starts_at") ? (startsAt ? new Date(startsAt.getTime() + DEFAULT_LENGTH_MS) : null) : current.endsAt;
  if (endGiven && !endsAt) errors.ends_at = "Give the end as a date and time.";
  if (startsAt && endsAt && (endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > MAX_LENGTH_MS)) errors.ends_at = "It ends after it starts, within 7 days.";
  const timeZone = has("time_zone") || !current ? (typeof v.time_zone === "string" && v.time_zone.trim() ? v.time_zone.trim() : "UTC") : current.timeZone;
  if (!validTimeZone(timeZone)) errors.time_zone = "Choose the time zone it is held in.";
  const capacity = has("capacity") ? v.capacity : (current?.capacity ?? null);
  if (capacity !== null && (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity < 1 || capacity > CAPACITY_MAX)) errors.capacity = "The places are a whole number of at least 1, or none for no limit.";
  const link = (k: string, was: string | null | undefined, max = 500) => {
    const got = str(k, was);
    if (got === null || (got && (!HTTPS.test(got) || got.length > max))) {
      errors[k] = "A link starting with https://.";
      return null;
    }
    return got || null;
  };
  const location = str("location", current?.location);
  if (location === null || location.length > 300) errors.location = "Keep the place under 300 characters.";
  const joinUrl = link("join_url", current?.joinUrl);
  const replayUrl = link("replay_url", current?.replayUrl);
  const coverUrl = link("cover_url", current?.coverUrl, 512);
  const rawEmbed = link("embed_url", current?.embedUrl);
  // YouTube's links become its player's; a meeting's embed link is kept as given.
  const embedUrl = rawEmbed ? (youtubeEmbed(rawEmbed) ?? rawEmbed) : null;
  if (!errors.kind) {
    if (kind === "in_person" && !location) errors.location = "Say where it is held.";
    if (kind === "online" && !joinUrl) errors.join_url = "Give the link to join.";
    if (kind === "live" && !embedUrl && !joinUrl) errors.embed_url = "Give the YouTube Live link, or a meeting link in join_url.";
  }
  const groupId = has("group_id") ? (typeof v.group_id === "string" && v.group_id.trim() ? v.group_id.trim().slice(0, 36) : null) : (current?.groupId ?? null);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { kind, title: title!, body: body!, startsAt: startsAt!, endsAt: endsAt!, capacity: capacity as number | null, timeZone, location: location || null, joinUrl, embedUrl, replayUrl, coverUrl, groupId } };
}

type Result<T> = ({ ok: true } & T) | Fail;

export async function createEvent(ctx: EngageCtx, adminId: string, input: unknown): Promise<Result<{ event: CommunityEvent }>> {
  const { store, tenantId, trust } = engageOf(ctx);
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const parsed = parseEvent(input);
  if (!parsed.ok) return fail(400, "invalid_request", "Please check the highlighted fields.", parsed.errors);
  const event = await store.addEvent({ ...parsed.value, tenantId, status: "scheduled", createdBy: adminId, createdAt: ctx.now, updatedAt: ctx.now });
  await audit(trust, { actorId: adminId, action: "event.create", targetType: "event", targetId: event.id, details: { title: event.title, kind: event.kind } });
  return { ok: true, event };
}

/** The admin changes an event (a replay link after it, a new time), or cancels it: everyone going is told. */
export async function updateEvent(ctx: EngageCtx, adminId: string, id: string, input: unknown): Promise<Result<{ event: CommunityEvent }>> {
  const { store, trust } = engageOf(ctx);
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const current = await getEvent(ctx, id);
  if (!current) return fail(404, "not_found", "There's no such event.");
  const parsed = parseEvent(input, current);
  if (!parsed.ok) return fail(400, "invalid_request", "Please check the highlighted fields.", parsed.errors);
  const status = (input as { status?: unknown } | null)?.status;
  if (status !== undefined && status !== "scheduled" && status !== "cancelled") return fail(400, "invalid_request", "status must be scheduled or cancelled.");
  // A new time gets new reminders.
  const moved = parsed.value.startsAt.getTime() !== current.startsAt.getTime();
  const event = (await store.updateEvent(id, { ...parsed.value, ...(status ? { status } : {}), ...(moved ? { remindedDayAt: null, remindedHourAt: null } : {}), updatedAt: ctx.now }))!;
  await audit(trust, { actorId: adminId, action: "event.update", targetType: "event", targetId: id, details: { title: event.title, ...(status ? { status } : {}) } });
  if (status === "cancelled" && current.status !== "cancelled") await tellGoing(ctx, event, "event_cancelled");
  return { ok: true, event };
}

/** The admin cancels an event (DELETE /admin/events/{id}): it stays, marked cancelled, and everyone going hears of it. */
export async function cancelEvent(ctx: EngageCtx, adminId: string, id: string): Promise<{ ok: true; event: CommunityEvent } | Fail> {
  const { store, trust } = engageOf(ctx);
  const denied = await requireAdmin(trust, adminId);
  if (denied) return denied;
  const current = await getEvent(ctx, id);
  if (!current) return fail(404, "not_found", "There's no such event.");
  if (current.status === "cancelled") return { ok: true, event: current };
  const event = (await store.updateEvent(id, { status: "cancelled", updatedAt: ctx.now }))!;
  await audit(trust, { actorId: adminId, action: "event.delete", targetType: "event", targetId: id, details: { title: current.title } });
  if (eventPhase(current, ctx.now) !== "ended") await tellGoing(ctx, event, "event_cancelled");
  return { ok: true, event };
}

export async function getEvent(ctx: EngageCtx, id: string): Promise<CommunityEvent | null> {
  const { store, tenantId } = engageOf(ctx);
  const e = await store.getEvent(id);
  return e && e.tenantId === tenantId ? e : null;
}

export async function listEvents(ctx: EngageCtx, input: { when: "upcoming" | "past"; kind?: EventKind; groupId?: string; offset: number; limit: number }): Promise<Page<CommunityEvent>> {
  const { store, tenantId } = engageOf(ctx);
  return store.listEvents({ tenantId, ...input, now: ctx.now });
}

/** A member says they're going, or not any more; not to a cancelled or finished event. */
export async function rsvp(ctx: EngageCtx, memberId: string, eventId: string, going: boolean): Promise<Result<{ going: boolean; rsvpCount: number }>> {
  const { store } = engageOf(ctx);
  const event = await getEvent(ctx, eventId);
  if (!event) return fail(404, "not_found", "There's no such event.");
  const phase = eventPhase(event, ctx.now);
  if (going && (phase === "cancelled" || phase === "ended")) return fail(409, "event_closed", phase === "cancelled" ? "This event was cancelled." : "This event is over.");
  if (going) {
    if ((await store.addRsvp(eventId, memberId, ctx.now)) === "full") return fail(409, "event_full", "This event is full.");
  } else await store.removeRsvp(eventId, memberId);
  return { ok: true, going, rsvpCount: (await store.getEvent(eventId))!.rsvpCount };
}

export async function attendees(ctx: EngageCtx, eventId: string, input: { offset: number; limit: number }): Promise<Page<string> | null> {
  const event = await getEvent(ctx, eventId);
  return event ? ctx.store.engage.attendees(eventId, input.offset, input.limit) : null;
}

/** A comment on an event (a live session's chat), through phase 1's spam rules; not on a cancelled one. */
export async function addComment(ctx: EngageCtx, memberId: string, eventId: string, input: unknown): Promise<Result<{ comment: EventComment }>> {
  const { store, trust } = engageOf(ctx);
  const event = await getEvent(ctx, eventId);
  if (!event) return fail(404, "not_found", "There's no such event.");
  if (event.status === "cancelled") return fail(409, "event_closed", "This event was cancelled.");
  const body = typeof (input as { body?: unknown } | null)?.body === "string" ? (input as { body: string }).body.trim() : "";
  if (!body || body.length > COMMENT_MAX) return fail(400, "invalid_request", "Please check the highlighted fields.", { body: `Write a comment of up to ${COMMENT_MAX} characters.` });
  const made = await store.addEventComment({ eventId, memberId, body, status: "pending", createdAt: ctx.now });
  const gate = await moderateNew(trust, { memberId, targetType: "event_comment", targetId: made.id, text: body });
  const status = gate.status === "published" ? "published" : "pending";
  await store.setEventCommentStatus(made.id, status);
  return { ok: true, comment: { ...made, status } };
}

export async function listComments(ctx: EngageCtx, eventId: string, input: { after?: string | null; limit: number }): Promise<EventComment[] | null> {
  const event = await getEvent(ctx, eventId);
  return event ? ctx.store.engage.listEventComments(eventId, input) : null;
}

/** Everyone going hears of it (a cancellation, a reminder). */
async function tellGoing(ctx: EngageCtx, event: CommunityEvent, kind: "event_cancelled" | "event_tomorrow" | "event_soon"): Promise<number> {
  const { store, trust } = engageOf(ctx);
  let told = 0;
  for (let offset = 0; ; offset += 200) {
    const page = await store.attendees(event.id, offset, 200);
    for (const memberId of page.items) {
      await notify(trust, { memberId, kind, actorId: null, targetType: "event", targetId: event.id, data: { title: event.title }, link: `/events/${event.id}` });
      told++;
    }
    if (page.next === null) return told;
  }
}

/**
 * The frequent job (every few minutes): the day-before reminder for events
 * starting within a day (more than an hour away), and the hour-before one
 * for those starting within the hour, each sent once to everyone going.
 */
export async function runEventReminders(ctx: EngageCtx): Promise<{ day: number; hour: number }> {
  const { store } = engageOf(ctx);
  const now = ctx.now.getTime();
  const hour = 60 * 60 * 1000;
  let dayTold = 0;
  let hourTold = 0;
  for (const e of await store.eventsToRemind("hour", new Date(now), new Date(now + hour))) {
    await store.updateEvent(e.id, { remindedHourAt: ctx.now, remindedDayAt: e.remindedDayAt ?? ctx.now });
    hourTold += await tellGoing(ctx, e, "event_soon");
  }
  for (const e of await store.eventsToRemind("day", new Date(now + hour), new Date(now + 24 * hour))) {
    await store.updateEvent(e.id, { remindedDayAt: ctx.now });
    dayTold += await tellGoing(ctx, e, "event_tomorrow");
  }
  return { day: dayTold, hour: hourTold };
}

// ——— The .ics file ———

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsTime = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** RFC 5545 folds lines longer than 75 octets: the rest on lines starting with a space. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    // Never in the middle of a character.
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return parts.join("\r\n ");
}

/** The event as a calendar file (text/calendar): add-to-calendar on any device. Times in UTC; calendars show them in the reader's zone. */
export function eventIcs(event: CommunityEvent, siteUrl: string, now: Date): string {
  const url = new URL(`/events/${event.id}`, siteUrl).toString();
  const where = event.kind === "in_person" ? (event.location ?? "") : (event.joinUrl ?? event.embedUrl ?? url);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yallapp//Yallapp Community//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@yallapp.com.tr`,
    `DTSTAMP:${icsTime(now)}`,
    `DTSTART:${icsTime(event.startsAt)}`,
    `DTEND:${icsTime(event.endsAt)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText([event.body, url].filter(Boolean).join("\n\n"))}`,
    `LOCATION:${icsText(where)}`,
    `URL:${url}`,
    `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
