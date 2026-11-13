import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256Hex } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, AssetKind, HostedUser, TravelBookingInput } from "../data/types";
import { linesOf } from "../travel/bookings";
import { linesTotal, stayNights, addDays, today } from "../travel/pricing";
import { makeTravelSamples, rollTravelFlights, TRAVEL_DEMO_SETTINGS, type TravelPhoto } from "../travel/samples";
import { travelSettingsOf } from "../travel/settings";
import { idFrom, savePicture, type PictureDeps } from "./picture-assets";

/**
 * 126 Safra, the travel demo: the hotels, rooms and flights of
 * lib/travel/samples.ts with their photos (public/demo-photos/travel-*.jpg,
 * CC0 or public domain, credited in public/demo-photos/CREDITS.md; a
 * drawing where a photo isn't there), and the demo number's trip to Bali in
 * two days, which the daily job moves along with the flights.
 */

const files = new Map<string, Buffer>();

function photoPath(name: TravelPhoto): string {
  return path.join(process.cwd(), "public/demo-photos", `travel-${name}.jpg`);
}

/** The asset of one of Safra's photos, saved the first time; the demo's drawing when the photo isn't in the bundle. */
export async function saveTravelPhoto(deps: PictureDeps, owner: { clientId: string; appId?: string }, name: TravelPhoto, kind: AssetKind): Promise<string> {
  const file = photoPath(name);
  if (!existsSync(file)) return savePicture(deps, owner, "banner-travel", "home", kind);
  const data = files.get(name) ?? (await readFile(file));
  files.set(name, data);
  const id = idFrom(JSON.stringify({ v: 1, ...owner, travel: name, sha: sha256Hex(data.toString("base64")) }));
  if (await deps.store.getAsset(id)) return id;
  const blobKey = `assets/${owner.clientId}/${id}.jpg`;
  await deps.putBlob(blobKey, data, "image/jpeg");
  await deps.store.createAsset({ id, clientId: owner.clientId, kind, blobKey, contentType: "image/jpeg", size: data.length, createdAt: deps.now });
  return id;
}

/** Safra's settings, hotels and flights, made once; the flights kept twelve weeks ahead. */
export async function syncTravelDemo(deps: PictureDeps, app: App): Promise<void> {
  const { store, now } = deps;
  const saved = await store.getTravelSettings(app.id);
  await store.saveTravelSettings(app.id, { ...TRAVEL_DEMO_SETTINGS, ...(saved ? { hotels: saved.hotels, flights: saved.flights } : {}) }, now);
  await makeTravelSamples({ store, app, now, sample: false, photo: (name) => saveTravelPhoto(deps, { clientId: app.clientId }, name, "product_image") });
  await rollTravelFlights(store, app, now);
}

/**
 * The demo number's trip: Cairo to Bali on the next flight two or more
 * days ahead, four nights at Safra Bay Resort with breakfast, the transfer
 * and the flight back, paid. Made again (dated from today) each day.
 */
export async function seedDemoTrip(store: DataStore, app: App, user: HostedUser, now: Date): Promise<void> {
  const mine = await store.listTravelBookings({ appId: app.id, userId: user.id, page: 1, perPage: 100 });
  for (const b of mine.items) if (b.sample && b.stay?.checkIn && b.stay.checkIn >= today(now)) return;
  const settings = travelSettingsOf(await store.getTravelSettings(app.id));
  const flights = await store.listTravelFlights(app.id);
  const out = flights.find((f) => f.from.code === "CAI" && f.to.code === "DPS" && f.departs.slice(0, 10) >= addDays(today(now), 2));
  const back = out ? flights.find((f) => f.from.code === "DPS" && f.to.code === "CAI" && f.departs.slice(0, 10) >= addDays(out.arrives.slice(0, 10), 4)) : undefined;
  const hotel = (await store.listTravelHotels(app.id)).find((h) => h.city === "Bali");
  const room = hotel ? (await store.listTravelRooms(app.id, hotel.id))[0] : undefined;
  const rate = room?.rates.find((r) => r.board === "breakfast") ?? room?.rates[0];
  if (!out || !back || !hotel || !room || !rate) return;
  const checkIn = out.arrives.slice(0, 10);
  const checkOut = back.departs.slice(0, 10);
  const nights = stayNights(room, rate, checkIn, checkOut);
  if (!nights) return;
  const fare = out.fares.find((f) => f.id === "standard")!;
  const backFare = back.fares.find((f) => f.id === "standard")!;
  const stay = {
    hotelId: hotel.id,
    hotelName: hotel.name,
    roomId: room.id,
    roomName: room.name,
    rateId: rate.id,
    rateName: rate.name,
    board: rate.board,
    checkIn,
    checkOut,
    guests: 2,
    rooms: 1,
    nights,
    refundable: rate.refundable,
    freeCancelUntil: rate.refundable ? addDays(checkIn, -rate.freeCancelDays) : null,
    taxBp: hotel.taxBp,
  };
  const flight = {
    outbound: { flightId: out.id, number: out.number, fareId: "standard" as const, fareName: fare.name, cents: fare.cents, seats: ["14A", "14B"], seatCents: 0 },
    inbound: { flightId: back.id, number: back.number, fareId: "standard" as const, fareName: backFare.name, cents: backFare.cents, seats: [null, null], seatCents: 0 },
    travellers: 2,
    bags: 0,
    meals: 0,
    bagCents: settings.bagCents,
    mealCents: settings.mealCents,
    changeable: fare.changeable,
    changeFeeCents: fare.changeFeeCents,
    refundable: fare.refundable,
    refundFeeCents: fare.refundFeeCents,
  };
  const transfer = settings.transfer ? { cents: settings.transfer.cents, note: settings.transfer.note } : null;
  const lines = linesOf({ settings }, { stay, flight, transfer }, true, hotel);
  const total = linesTotal(lines);
  const booking: TravelBookingInput = {
    appId: app.id,
    userId: user.id,
    reference: `T-D${checkIn.slice(2).replace(/-/g, "")}`,
    kind: "trip",
    status: "confirmed",
    stay,
    flight,
    transfer,
    travellers: [
      { firstName: "Layla", lastName: "Hassan" },
      { firstName: "Omar", lastName: "Hassan" },
    ],
    contact: { name: "Layla Hassan", email: null, phone: null },
    requests: ["late_arrival"],
    note: null,
    currency: settings.currency,
    lines,
    totalCents: total,
    paymentMethod: "now",
    paymentStatus: "paid",
    paidCents: total,
    refundCents: 0,
    orderId: null,
    holdUntil: null,
    cancellation: null,
    changes: [],
    lang: null,
    sample: true,
    createdAt: now,
    updatedAt: now,
  };
  // Yesterday's trip goes; today's is made.
  for (const b of mine.items) if (b.sample) await store.updateTravelBooking(app.id, b.id, { status: "cancelled", sample: false }, { statuses: [b.status] }, now);
  await store.createTravelBooking(booking, () => null, now);
}

/** The daily job's part: the flights moved on and the demo number's trip dated from today. */
export async function refreshTravelDemo(store: DataStore, app: App, user: HostedUser | null, now: Date): Promise<number> {
  const removed = await rollTravelFlights(store, app, now);
  if (user) await seedDemoTrip(store, app, user, now);
  return removed;
}
