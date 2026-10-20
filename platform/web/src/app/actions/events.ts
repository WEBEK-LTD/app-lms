"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { DataStore } from "@/lib/data/store";
import type { App, EventRecord } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { encryptionKey, signingSecret } from "@/lib/env";
import { checkIn, type CheckInAnswer } from "@/lib/events/check-in";
import { ticketKey } from "@/lib/events/codes";
import { EVENT_IMAGE_MAX_BYTES, EVENT_IMAGES_MAX, TICKET_TYPES_MAX, parseEventForm, parseEventSettings, parseTicketTypeForm } from "@/lib/events/forms";
import { eventChange, eventNoticeText, notifyTicketHolders, ticketHolders } from "@/lib/events/notify";
import { eventSettingsOf } from "@/lib/events/service";
import { formValues, type FormState } from "@/lib/forms";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { imageType } from "@/lib/images";
import { hasFeature } from "@/lib/plans";

/**
 * 28 The Events and Check-in pages of Events & tickets apps: events (drafts,
 * published, cancelled), their ticket types, the app's event settings,
 * cancelling a ticket, and checking tickets at the door.
 */

/** An active client whose app's events are managed in the dashboard, or a redirect. */
async function requireEventsApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("events");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "events") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/events", "layout");
  revalidatePath("/dashboard/check-in");
}

/** Push, when the app's plan has it and Firebase is set up. */
async function pushAccount(context: ClientContext & { app: App }, store: DataStore, now: Date) {
  const push = hasFeature(await appPlan(store, context.license, now), "push");
  return push ? serviceAccountOf(context.app, encryptionKey()) : null;
}

/** Tells the event's ticket holders what changed; returns how many were told. */
async function tellHolders(
  context: ClientContext & { app: App },
  store: DataStore,
  event: EventRecord,
  kind: "time" | "place" | "link" | "cancelled",
  userIds: number[],
  now: Date,
): Promise<number> {
  if (userIds.length === 0) return 0;
  const { timeZone } = await eventSettingsOf(store, context.app.id);
  const text = eventNoticeText(event, kind, timeZone);
  const result = await notifyTicketHolders({ store, app: context.app, event, userIds, ...text, account: await pushAccount(context, store, now), now });
  return result.notified;
}

/** Saves the pictures a form sent; their asset IDs, or an error. */
async function savePictures(context: ClientContext, formData: FormData, room: number, now: Date): Promise<{ assetIds: string[] } | { error: string }> {
  const files = formData.getAll("images").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > room) return { error: `An event can have up to ${EVENT_IMAGES_MAX} pictures.` };
  const assetIds: string[] = [];
  for (const file of files) {
    if (file.size > EVENT_IMAGE_MAX_BYTES) return { error: `Each picture can be up to ${EVENT_IMAGE_MAX_BYTES / 1024 / 1024} MB.` };
    const data = Buffer.from(await file.arrayBuffer());
    const type = imageType(data);
    if (!type) return { error: "Pictures must be PNG or JPEG files." };
    const assetId = newId();
    const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
    await getBlobStore().put(blobKey, data, type.contentType);
    await (await getStore()).createAsset({
      id: assetId,
      clientId: context.client.id,
      kind: "product_image",
      blobKey,
      contentType: type.contentType,
      size: data.length,
      createdAt: now,
    });
    assetIds.push(assetId);
  }
  return { assetIds };
}

export async function saveEventAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireEventsApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null && Number.isSafeInteger(id) ? await store.getEvent(app.id, id) : null;
  if (id !== null && !existing) return { message: "This event doesn't exist anymore." };
  const values = formValues(formData, ["images"]);
  const { timeZone } = await eventSettingsOf(store, app.id);
  const parsed = parseEventForm(values, timeZone);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const removed = new Set(formData.getAll("removeImage").map(String));
  const kept = (existing?.imageAssetIds ?? []).filter((assetId) => !removed.has(assetId));
  const pictures = await savePictures(context, formData, EVENT_IMAGES_MAX - kept.length, now);
  if ("error" in pictures) return { errors: { images: pictures.error }, values };
  const imageAssetIds = [...kept, ...pictures.assetIds];

  const publish = formData.get("intent") === "publish";
  let event: EventRecord;
  let told = 0;
  if (existing) {
    const patch = { ...parsed.value, imageAssetIds, ...(publish && existing.status === "draft" ? { status: "published" as const, publishedAt: existing.publishedAt ?? now } : {}) };
    await store.updateEvent(app.id, existing.id, patch, now);
    event = { ...existing, ...patch };
    // Ticket holders hear when the time, the place or the online link changes.
    const change = existing.status === "published" ? eventChange(existing, event) : null;
    if (change) told = await tellHolders(context, store, event, change, await ticketHolders(store, app, event.id), now);
  } else {
    event = await store.createEvent(
      { ...parsed.value, appId: app.id, imageAssetIds, status: publish ? "published" : "draft", publishedAt: publish ? now : null },
      now,
    );
  }
  await recordStaffChange(context, `${existing ? "Saved" : "Added"} the event "${event.title}"`);
  refresh();
  const query = new URLSearchParams({ saved: "1" });
  if (told) query.set("told", String(told));
  redirect(`/dashboard/events/${event.id}?${query}`);
}

/** Publish, back to draft, or cancel (its tickets are cancelled and their holders told). */
export async function setEventStatusAction(formData: FormData): Promise<void> {
  const context = await requireEventsApp();
  const { app } = context;
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = formData.get("status");
  const event = Number.isSafeInteger(id) ? await store.getEvent(app.id, id) : null;
  const query = new URLSearchParams();
  if (event && (status === "published" || status === "draft" || status === "cancelled") && event.status !== status) {
    const now = new Date();
    const tickets = await store.listTickets({ appId: app.id, eventId: event.id });
    const issued = tickets.some((t) => t.status === "valid" || t.status === "used");
    if (status === "draft" && issued) {
      query.set("error", "People already have tickets: cancel the event instead.");
    } else if (event.status === "cancelled") {
      query.set("error", "A cancelled event stays cancelled. Add a new event instead.");
    } else {
      await store.updateEvent(app.id, event.id, { status, ...(status === "published" && !event.publishedAt ? { publishedAt: now } : {}) }, now);
      if (status === "cancelled") {
        const holders = await ticketHolders(store, app, event.id);
        await store.cancelTickets(app.id, { eventId: event.id }, now);
        const told = await tellHolders(context, store, { ...event, status }, "cancelled", holders, now);
        query.set("cancelled", String(told));
      }
      await recordStaffChange(context, `${status === "cancelled" ? "Cancelled" : status === "published" ? "Published" : "Unpublished"} the event "${event.title}"`);
    }
  }
  refresh();
  redirect(`/dashboard/events/${id}${query.size ? `?${query}` : ""}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const context = await requireEventsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const event = Number.isSafeInteger(id) ? await store.getEvent(context.app.id, id) : null;
  if (event) {
    const tickets = await store.listTickets({ appId: context.app.id, eventId: event.id });
    // Tickets people hold (or paid for) are never deleted with an event: cancel it instead.
    if (tickets.some((t) => t.status !== "cancelled")) redirect(`/dashboard/events/${id}?error=${encodeURIComponent("People have tickets to this event: cancel it instead.")}`);
    await store.deleteEvent(context.app.id, event.id);
    await recordStaffChange(context, `Deleted the event "${event.title}"`);
  }
  refresh();
  redirect(`/dashboard/events${event ? `?deleted=${encodeURIComponent(event.title)}` : ""}`);
}

// Ticket types

export async function saveTicketTypeAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireEventsApp();
  const store = await getStore();
  const eventId = Number(formData.get("eventId"));
  const event = Number.isSafeInteger(eventId) ? await store.getEvent(app.id, eventId) : null;
  if (!event) return { message: "This event doesn't exist anymore." };
  const values = formValues(formData);
  const { timeZone } = await eventSettingsOf(store, app.id);
  const parsed = parseTicketTypeForm(values, timeZone);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const types = await store.listTicketTypes(app.id, event.id);
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const existing = id !== null ? types.find((t) => t.id === id) : undefined;
  if (id !== null && !existing) return { message: "This ticket type doesn't exist anymore." };
  if (existing) {
    // The price of tickets already sold stays what they paid; a new price is for new tickets.
    await store.updateTicketType(app.id, existing.id, parsed.value);
  } else {
    if (types.length >= TICKET_TYPES_MAX) return { message: `An event can have up to ${TICKET_TYPES_MAX} ticket types.`, values };
    const position = types.reduce((max, t) => Math.max(max, t.position + 1), 0);
    await store.createTicketType({ ...parsed.value, appId: app.id, eventId: event.id, position }, new Date());
  }
  refresh();
  return { ok: true, message: existing ? "Saved." : `Added “${parsed.value.name}”.` };
}

export async function deleteTicketTypeAction(formData: FormData): Promise<void> {
  const { app } = await requireEventsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const eventId = Number(formData.get("eventId"));
  const type = (await store.listTicketTypes(app.id, eventId)).find((t) => t.id === id);
  let error: string | null = null;
  if (type) {
    const tickets = await store.listTickets({ appId: app.id, eventId });
    if (tickets.some((t) => t.ticketTypeId === type.id && t.status !== "cancelled")) error = "People have tickets of this type, so it can't be deleted.";
    else await store.deleteTicketType(app.id, type.id);
  }
  refresh();
  redirect(`/dashboard/events/${eventId}${error ? `?error=${encodeURIComponent(error)}` : ""}#tickets`);
}

/** The organiser cancels one ticket (after refunding it, for example). Its place goes back on sale. */
export async function cancelTicketAction(formData: FormData): Promise<void> {
  const context = await requireEventsApp();
  const store = await getStore();
  const code = String(formData.get("code") ?? "");
  const ticket = /^[A-Z0-9]{1,16}$/.test(code) ? await store.getTicketByCode(context.app.id, code) : null;
  if (ticket && ticket.status === "valid") {
    await store.cancelTickets(context.app.id, { ids: [ticket.id] }, new Date());
    await recordStaffChange(context, `Cancelled the ticket ${ticket.code} of ${ticket.holderName}`);
  }
  refresh();
  redirect(`/dashboard/events/${ticket?.eventId ?? ""}#attendees`);
}

export async function saveEventSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireEventsApp();
  const values = formValues(formData);
  const parsed = parseEventSettings(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await (await getStore()).saveEventSettings(app.id, parsed.value, new Date());
  refresh();
  return { ok: true, message: "Saved. The app shows it the next time it opens." };
}

// Check-in

export interface CheckInState {
  answer?: CheckInAnswer;
  /** What was scanned or typed, so the page can say it. */
  at?: string;
}

export async function checkInAction(_: CheckInState, formData: FormData): Promise<CheckInState> {
  const { app } = await requireEventsApp();
  const scanned = String(formData.get("code") ?? "").slice(0, 200);
  const eventText = String(formData.get("eventId") ?? "");
  const eventId = /^\d{1,15}$/.test(eventText) ? Number(eventText) : null;
  const now = new Date();
  const answer = await checkIn({ store: await getStore(), app, key: ticketKey(signingSecret(), app.id), scanned, eventId, now });
  if (answer.outcome === "admitted") revalidatePath("/dashboard/events", "layout");
  return { answer, at: now.toISOString() };
}
