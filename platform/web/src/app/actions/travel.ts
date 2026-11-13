"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { assetUrl } from "@/lib/assets";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, TravelBooking } from "@/lib/data/types";
import { notifyDeps } from "@/lib/delivery/flow";
import { appUrl } from "@/lib/env";
import { formValues, type FormState } from "@/lib/forms";
import { tellTraveller, travelPricesChanged } from "@/lib/hosted/connectors/travel";
import { imageType } from "@/lib/images";
import { askAfterOwnEntry } from "@/lib/samples/lists";
import type { TeamPermission } from "@/lib/team/permissions";
import { cancelPatch, refundedPatch } from "@/lib/travel/bookings";
import { parseFlightForm, parseFlightStatusForm, parseHotelForm, parseRoomForm, parseTravelSettingsForm } from "@/lib/travel/forms";
import { tellFlight } from "@/lib/travel/notify";
import { markTravelPaid } from "@/lib/travel/payment";
import { addDays } from "@/lib/travel/pricing";
import { TRAVEL_LIMITS, travelSettingsOf } from "@/lib/travel/settings";

/**
 * 126 The Hotels, Flights, Bookings and Travel settings pages of travel
 * projects: the company's hotels with their rooms and rates, its flights and
 * their status, its bookings, and its choices. Payment keys are saved with
 * the shop's actions (app/actions/catalog.ts).
 */

const PICTURE_MAX_BYTES = 3 * 1024 * 1024;

async function requireTravelApp(permission: TeamPermission): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "travel") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  for (const path of ["/dashboard/travel", "/studio/project/travel"]) revalidatePath(path, "layout");
}

/** The photos chosen (PNG or JPEG, up to 3 MB each), kept as assets. */
async function photos(context: ClientContext, files: FormDataEntryValue[], now: Date): Promise<{ ids: string[] } | { error: string }> {
  const ids: string[] = [];
  for (const file of files) {
    if (!file || typeof file === "string" || file.size === 0) continue;
    if (file.size > PICTURE_MAX_BYTES) return { error: "Each photo can be up to 3 MB." };
    const data = Buffer.from(await file.arrayBuffer());
    const type = imageType(data);
    if (!type) return { error: "Photos must be PNG or JPEG files." };
    const assetId = newId();
    const blobKey = `assets/${context.client.id}/${assetId}.${type.extension}`;
    await getBlobStore().put(blobKey, data, type.contentType);
    await (await getStore()).createAsset({ id: assetId, clientId: context.client.id, kind: "product_image", blobKey, contentType: type.contentType, size: data.length, createdAt: now });
    ids.push(assetId);
  }
  return { ids };
}

/** The photos kept (not ticked to remove) and the new ones, in order, at most the limit. */
function keptPhotos(existing: readonly string[], formData: FormData, added: string[]): string[] {
  return [...existing.filter((id) => formData.get(`removePhoto_${id}`) !== "on"), ...added].slice(0, TRAVEL_LIMITS.photos);
}

const idOf = (formData: FormData, name = "id") => {
  const n = Number(formData.get(name));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

// Hotels

export async function saveTravelHotelAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTravelApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = formData.get("id") ? idOf(formData) : null;
  const existing = id !== null ? await store.getTravelHotel(app.id, id) : null;
  if (formData.get("id") && !existing) return { message: "This hotel doesn't exist anymore." };
  const parsed = parseHotelForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const hotels = await store.listTravelHotels(app.id);
  if (!existing && hotels.length >= TRAVEL_LIMITS.hotels) return { message: `You can have up to ${TRAVEL_LIMITS.hotels} hotels.`, values };
  const added = await photos(context, formData.getAll("photos"), now);
  if ("error" in added) return { errors: { photos: added.error }, values };
  const kept = keptPhotos(existing?.photos ?? [], formData, added.ids);
  if (existing) {
    await store.updateTravelHotel(app.id, existing.id, { ...parsed.value, photos: kept, sample: false }, now);
  } else {
    const position = hotels.reduce((max, h) => Math.max(max, h.position), 0) + 1;
    const made = await store.createTravelHotel({ appId: app.id, ...parsed.value, photos: kept, position, sample: false }, now);
    await recordStaffChange(context, `Added the hotel "${parsed.value.name}"`);
    refresh();
    const ask = await askAfterOwnEntry(store, app.id, "hotels");
    redirect(ask ?? `/dashboard/travel/hotels/${made.id}`);
  }
  await recordStaffChange(context, `Edited the hotel "${parsed.value.name}"`);
  refresh();
  return { ok: true, message: "Saved.", values };
}

export async function deleteTravelHotelAction(formData: FormData): Promise<void> {
  const context = await requireTravelApp("settings");
  const store = await getStore();
  const id = idOf(formData);
  const hotel = id ? await store.getTravelHotel(context.app.id, id) : null;
  if (!hotel) return;
  await store.deleteTravelHotel(context.app.id, hotel.id);
  await recordStaffChange(context, `Deleted the hotel "${hotel.name}"`);
  refresh();
  if (formData.get("back") === "list") redirect("/dashboard/travel/hotels");
}

export async function moveTravelHotelAction(formData: FormData): Promise<void> {
  const context = await requireTravelApp("settings");
  const store = await getStore();
  const id = idOf(formData);
  const step = formData.get("step") === "up" ? -1 : 1;
  const hotels = await store.listTravelHotels(context.app.id);
  const i = hotels.findIndex((h) => h.id === id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= hotels.length) return;
  const order = [...hotels];
  [order[i], order[j]] = [order[j]!, order[i]!];
  const now = new Date();
  for (const [position, hotel] of order.entries()) if (hotel.position !== position + 1) await store.updateTravelHotel(context.app.id, hotel.id, { position: position + 1 }, now);
  refresh();
}

// Rooms

export async function saveTravelRoomAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTravelApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const hotelId = idOf(formData, "hotelId");
  const hotel = hotelId ? await store.getTravelHotel(app.id, hotelId) : null;
  if (!hotel) return { message: "This hotel doesn't exist anymore." };
  const id = formData.get("id") ? idOf(formData) : null;
  const existing = id !== null ? await store.getTravelRoom(app.id, id) : null;
  if (formData.get("id") && (!existing || existing.hotelId !== hotel.id)) return { message: "This room doesn't exist anymore." };
  const parsed = parseRoomForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const rooms = await store.listTravelRooms(app.id, hotel.id);
  if (!existing && rooms.length >= TRAVEL_LIMITS.roomsPerHotel) return { message: `A hotel can have up to ${TRAVEL_LIMITS.roomsPerHotel} kinds of room.`, values };
  const added = await photos(context, formData.getAll("photos"), now);
  if ("error" in added) return { errors: { photos: added.error }, values };
  const kept = keptPhotos(existing?.photos ?? [], formData, added.ids);
  if (existing) await store.updateTravelRoom(app.id, existing.id, { ...parsed.value, photos: kept, sample: false }, now);
  else {
    const position = rooms.reduce((max, r) => Math.max(max, r.position), 0) + 1;
    await store.createTravelRoom({ appId: app.id, hotelId: hotel.id, ...parsed.value, photos: kept, position, sample: false }, now);
  }
  await recordStaffChange(context, `${existing ? "Edited" : "Added"} the room "${parsed.value.name}" of "${hotel.name}"`);
  refresh();
  return { ok: true, message: existing ? "Saved." : "Added. People can book it in the app on its open days.", values: existing ? values : {} };
}

export async function deleteTravelRoomAction(formData: FormData): Promise<void> {
  const context = await requireTravelApp("settings");
  const store = await getStore();
  const id = idOf(formData);
  const room = id ? await store.getTravelRoom(context.app.id, id) : null;
  if (!room) return;
  await store.deleteTravelRoom(context.app.id, room.id);
  await recordStaffChange(context, `Deleted the room "${room.name}"`);
  refresh();
}

export async function setTravelReviewHiddenAction(formData: FormData): Promise<void> {
  const context = await requireTravelApp("settings");
  const store = await getStore();
  const id = idOf(formData);
  if (!id) return;
  await store.setTravelReviewHidden(context.app.id, id, formData.get("hidden") === "true");
  refresh();
}

// Flights

export async function saveTravelFlightAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTravelApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = formData.get("id") ? idOf(formData) : null;
  const existing = id !== null ? await store.getTravelFlight(app.id, id) : null;
  if (formData.get("id") && !existing) return { message: "This flight doesn't exist anymore." };
  const parsed = parseFlightForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const { repeatWeeks, ...flight } = parsed.value;
  const all = await store.listTravelFlights(app.id);
  if (all.length + (existing ? 0 : 1) + repeatWeeks > TRAVEL_LIMITS.flights) return { message: `You can have up to ${TRAVEL_LIMITS.flights} flights.`, values };
  if (existing) {
    // Seats already sold at a fare can't be taken away.
    const held = await store.listTravelHolds(app.id, { flightIds: [existing.id] }, now);
    for (const fare of existing.fares) {
      const sold = held.reduce((sum, b) => sum + (b.flight && (b.flight.outbound.flightId === existing.id ? b.flight.outbound.fareId : b.flight.inbound?.fareId) === fare.id ? b.flight.travellers : 0), 0);
      const next = flight.fares.find((f) => f.id === fare.id);
      if (sold > 0 && (!next || next.seats < sold)) return { errors: { [`fare_${fare.id}_seats`]: `${sold} seats are already booked at this fare.` }, values };
    }
    await store.updateTravelFlight(app.id, existing.id, { ...flight, sample: false }, now);
  }
  const made = existing ? 0 : repeatWeeks + 1;
  for (let w = 0; w < made; w++) {
    const shift = (v: string) => `${addDays(v.slice(0, 10), w * 7)}${v.slice(10)}`;
    await store.createTravelFlight(
      { appId: app.id, ...flight, departs: shift(flight.departs), arrives: shift(flight.arrives), status: "scheduled", statusNote: null, gate: null, boardsAt: null, delayedDeparts: null, sample: false },
      now,
    );
  }
  await recordStaffChange(context, existing ? `Edited the flight ${flight.number} of ${flight.departs.slice(0, 10)}` : `Added the flight ${flight.number}${made > 1 ? ` for ${made} weeks` : ""}`);
  // Price alerts hear of lower prices.
  await travelPricesChanged(store, app, assetUrl, appUrl(), now).catch(() => 0);
  refresh();
  if (!existing) {
    const ask = await askAfterOwnEntry(store, app.id, "flights");
    if (ask) redirect(ask);
  }
  return { ok: true, message: existing ? "Saved." : made > 1 ? `Added ${made} flights, a week apart.` : "Added. People can book it in the app.", values: existing ? values : {} };
}

export async function saveFlightStatusAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTravelApp("orders");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = idOf(formData);
  const before = id ? await store.getTravelFlight(app.id, id) : null;
  if (!before) return { message: "This flight doesn't exist anymore." };
  const parsed = parseFlightStatusForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.updateTravelFlight(app.id, before.id, parsed.value, now);
  const after = (await store.getTravelFlight(app.id, before.id))!;
  const booked = await store.listTravelHolds(app.id, { flightIds: [before.id] }, now);
  const told = await tellFlight(notifyDeps({ store, app, now }), after, before, booked.filter((b) => b.status === "confirmed"));
  await recordStaffChange(context, `Updated the flight ${after.number}: ${after.status}`);
  refresh();
  return { ok: true, message: told > 0 ? "Saved. The travellers on it were told." : "Saved.", values };
}

export async function deleteTravelFlightAction(formData: FormData): Promise<void> {
  const context = await requireTravelApp("settings");
  const store = await getStore();
  const id = idOf(formData);
  const flight = id ? await store.getTravelFlight(context.app.id, id) : null;
  if (!flight) return;
  // A flight with bookings is stopped, not deleted: its travellers keep their trip.
  const held = await store.listTravelHolds(context.app.id, { flightIds: [flight.id] }, new Date());
  if (held.length) await store.updateTravelFlight(context.app.id, flight.id, { active: false }, new Date());
  else await store.deleteTravelFlight(context.app.id, flight.id);
  await recordStaffChange(context, `${held.length ? "Stopped selling" : "Deleted"} the flight ${flight.number} of ${flight.departs.slice(0, 10)}`);
  refresh();
}

// Bookings

export async function travelBookingAction(formData: FormData): Promise<void> {
  const context = await requireTravelApp("orders");
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const booking = id ? await store.getTravelBooking(app.id, id) : null;
  if (!booking) return;
  const now = new Date();
  const op = formData.get("op");
  const say = (what: string) => recordStaffChange(context, `${what} the booking ${booking.reference}`);
  let done: TravelBooking | null = null;
  if (op === "cancel") {
    const zone = travelSettingsOf(await store.getTravelSettings(app.id), app).timeZone;
    const r = await store.updateTravelBooking(app.id, booking.id, cancelPatch(booking, "company", null, now, zone, true), { statuses: ["confirmed", "awaiting_payment"] }, now);
    if (r.ok) {
      done = r.booking;
      await tellTraveller(store, app, r.booking, "cancelled", now);
      await say("Cancelled");
    }
  } else if (op === "refunded") {
    // 126.10 What was refunded is no longer paid: a later cancel refunds only what is still paid.
    const r = await store.updateTravelBooking(app.id, booking.id, refundedPatch(booking, now), { statuses: [booking.status] }, now);
    if (r.ok) await say("Marked as refunded");
  } else if (op === "paid") {
    // Paid at the hotel, or by bank transfer: confirmed and settled (126.10 one whose hold ended, only while its rooms and seats are free).
    const r = await markTravelPaid(store, app, booking, now);
    if (r.ok) {
      done = r.booking;
      if (booking.status === "awaiting_payment") await tellTraveller(store, app, r.booking, "confirmed", now);
      await say("Marked as paid");
    }
  }
  void done;
  refresh();
}

// Settings

export async function saveTravelSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireTravelApp("settings");
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const parsed = parseTravelSettingsForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const saved = travelSettingsOf(await store.getTravelSettings(app.id), app);
  // Yallapp's switches stay as Yallapp set them (Admin › client › Travel).
  await store.saveTravelSettings(app.id, { ...saved, ...parsed.value }, now);
  await recordStaffChange(context, "Edited the travel settings");
  await travelPricesChanged(store, app, assetUrl, appUrl(), now).catch(() => 0);
  refresh();
  return { ok: true, message: "Saved. The app shows it on its next start.", values };
}
