import { createHmac } from "node:crypto";
import { centsToDecimal, formatCents } from "../catalog/money";
import { hmacSha256 } from "../crypto/tokens";
import type { HostedUser, TravelBooking, TravelFareId, TravelFlight, TravelFlightPart, TravelHotel, TravelLegPart, TravelLine, TravelRequest, TravelReview, TravelRoom, TravelStayPart } from "../data/types";
import { TRAVEL_FARE_IDS, TRAVEL_REQUESTS, TRAVEL_TRIP_TYPES } from "../data/types";
import { fareOf, legJson, onSale, reviewJson, same, stayDatesRefusal, type Refusal, type TravelDeps } from "./catalog";
import { addDays, daysBetween, dueCents, fareSeatsLeft, freeCancelUntil, freeUnits, isDate, linesTotal, localInstant, partsOf, seatCents, seatExists, stayNights, stayPrice, takenSeats, today, wallTime } from "./pricing";
import { HOLD_MINUTES } from "./settings";

/**
 * 126 Booking: what the person chose (a stay, a flight, or both as one
 * trip), priced as the quote shows it, booked in the store's lock so the
 * last room and a seat go to one person, then paid on the company's payment
 * page or at the hotel; and what can be done with it after: cancel, change
 * the dates or a flight, choose seats, show the boarding passes, review the
 * stay.
 */

const bad = (message: string): Refusal => ({ status: 400, code: "invalid_request", message });
const conflict = (code: string, message: string): Refusal => ({ status: 409, code, message });
const notFound = (message: string): Refusal => ({ status: 404, code: "not_found", message });
export const NOT_AVAILABLE = "not_available";
const taken = () => conflict(NOT_AVAILABLE, "That's no longer free. Please choose again.");

const SEAT = /^\d{1,2}[A-K]$/;

export interface Choice {
  stay: { hotelId: number; roomId: number; rateId: string; checkIn: string; checkOut: string; guests: number; rooms: number } | null;
  flight: { outboundId: number; inboundId: number | null; fare: TravelFareId; travellers: number; seatsOut: (string | null)[]; seatsBack: (string | null)[]; bags: number; meals: number } | null;
  transfer: boolean;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const int = (v: unknown, min: number, max: number, fallback: number | null): number | null => {
  if (v === undefined || v === null) return fallback;
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
};

function seatList(v: unknown): (string | null)[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 9) return null;
  const out: (string | null)[] = [];
  for (const s of v) {
    if (s === null) out.push(null);
    else if (typeof s === "string" && SEAT.test(s.toUpperCase())) out.push(s.toUpperCase());
    else return null;
  }
  return out;
}

export function readChoice(body: unknown): Choice | Refusal {
  const b = obj(body);
  let stay: Choice["stay"] = null;
  let flight: Choice["flight"] = null;
  if (b.stay !== undefined && b.stay !== null) {
    const s = obj(b.stay);
    const hotelId = int(s.hotel_id, 1, Number.MAX_SAFE_INTEGER, null);
    const roomId = int(s.room_id, 1, Number.MAX_SAFE_INTEGER, null);
    const guests = int(s.guests, 1, 12, 2);
    const rooms = int(s.rooms, 1, 5, 1);
    if (hotelId === null || roomId === null || typeof s.rate_id !== "string" || !s.rate_id) return bad("Choose a room and a rate.");
    if (!isDate(s.check_in) || !isDate(s.check_out)) return bad("Choose the check-in and check-out days.");
    if (guests === null || rooms === null) return bad("Choose the guests and rooms.");
    stay = { hotelId, roomId, rateId: s.rate_id, checkIn: s.check_in, checkOut: s.check_out, guests, rooms };
  }
  if (b.flight !== undefined && b.flight !== null) {
    const f = obj(b.flight);
    const outboundId = int(f.outbound_id, 1, Number.MAX_SAFE_INTEGER, null);
    const inboundId = f.inbound_id === undefined || f.inbound_id === null ? null : int(f.inbound_id, 1, Number.MAX_SAFE_INTEGER, null);
    const travellers = int(f.travellers, 1, 9, 1);
    const bags = int(f.bags, 0, 18, 0);
    const meals = int(f.meals, 0, 18, 0);
    const seatsOut = seatList(f.seats_out);
    const seatsBack = seatList(f.seats_back);
    if (outboundId === null || (f.inbound_id !== undefined && f.inbound_id !== null && inboundId === null)) return bad("Choose a flight.");
    if (typeof f.fare !== "string" || !(TRAVEL_FARE_IDS as readonly string[]).includes(f.fare)) return bad("Choose a fare.");
    if (travellers === null || bags === null || meals === null) return bad("Choose the travellers, bags and meals.");
    if (!seatsOut || !seatsBack || seatsOut.length > travellers || seatsBack.length > travellers) return bad("Choose one seat per traveller.");
    flight = { outboundId, inboundId, fare: f.fare as TravelFareId, travellers, seatsOut, seatsBack, bags, meals };
  }
  if (!stay && !flight) return bad("Choose a stay or a flight.");
  return { stay, flight, transfer: b.transfer === true };
}

export interface Priced {
  stay: TravelStayPart | null;
  flight: TravelFlightPart | null;
  transfer: { cents: number; note: string | null } | null;
  lines: TravelLine[];
  totalCents: number;
  refundable: boolean;
  freeCancelUntil: string | null;
  payment: { now: boolean; atHotel: boolean };
  hotel: TravelHotel | null;
  room: TravelRoom | null;
  outbound: TravelFlight | null;
  inbound: TravelFlight | null;
}

function legPart(flight: TravelFlight, fareId: TravelFareId, seats: (string | null)[], travellers: number): TravelLegPart {
  const fare = fareOf(flight, fareId)!;
  const padded = Array.from({ length: travellers }, (_, i) => seats[i] ?? null);
  return {
    flightId: flight.id,
    number: flight.number,
    fareId,
    fareName: fare.name,
    cents: fare.cents,
    seats: padded,
    seatCents: padded.reduce((sum, s) => sum + seatCents(flight.seatMap, fare, s), 0),
  };
}

/** Seats chosen on a leg: on its map, not twice, not taken by another booking. */
function seatsRefusal(flight: TravelFlight, seats: readonly (string | null)[], others: readonly TravelBooking[]): Refusal | null {
  const chosen = seats.filter((s): s is string => s !== null);
  if (!chosen.length) return null;
  if (!flight.seatMap) return bad("Seats on this flight are given at the airport.");
  if (new Set(chosen).size !== chosen.length) return bad("Choose a different seat for each traveller.");
  if (chosen.some((s) => !seatExists(flight.seatMap!, s))) return bad("That seat isn't on this plane.");
  const busy = takenSeats(flight, others);
  return chosen.some((s) => busy.has(s)) ? taken() : null;
}

/** The lines of a stay part: its nights, taxes and fees, and the member and bundle prices. */
function stayLines(nights: { cents: number }[], rooms: number, hotel: Pick<TravelHotel, "taxBp">, offs: { member: boolean; bundle: boolean }, deps: Pick<TravelDeps, "settings">): TravelLine[] {
  const p = stayPrice(nights, rooms, hotel, offs, deps.settings);
  const lines: TravelLine[] = [{ kind: "nights", count: p.nights * rooms, unitCents: Math.round(p.nightsCents / Math.max(1, p.nights * rooms)), cents: p.nightsCents }];
  if (p.taxCents) lines.push({ kind: "taxes", count: 1, unitCents: null, cents: p.taxCents });
  if (p.memberCents) lines.push({ kind: "member", count: 1, unitCents: null, cents: -p.memberCents });
  if (p.bundleCents) lines.push({ kind: "bundle", count: 1, unitCents: null, cents: -p.bundleCents });
  return lines;
}

function flightLines(part: TravelFlightPart): TravelLine[] {
  const fare = part.outbound.cents + (part.inbound?.cents ?? 0);
  const seats = part.outbound.seatCents + (part.inbound?.seatCents ?? 0);
  const seatCount = [...part.outbound.seats, ...(part.inbound?.seats ?? [])].filter(Boolean).length;
  const lines: TravelLine[] = [{ kind: "fare", count: part.travellers, unitCents: fare, cents: fare * part.travellers }];
  if (seats) lines.push({ kind: "seats", count: seatCount, unitCents: null, cents: seats });
  if (part.bags && part.bagCents) lines.push({ kind: "bags", count: part.bags, unitCents: part.bagCents, cents: part.bags * part.bagCents });
  if (part.meals && part.mealCents) lines.push({ kind: "meals", count: part.meals, unitCents: part.mealCents, cents: part.meals * part.mealCents });
  return lines;
}

/**
 * 126.10 A stay and a flight are one trip (the bundle price, the transfer)
 * when the flight out lands in the hotel's city on the check-in day or the
 * day before, and the flight back, if any, leaves that city on the
 * check-out day or the day after.
 */
export function isTrip(
  stay: Pick<TravelStayPart, "checkIn" | "checkOut"> | null,
  hotel: Pick<TravelHotel, "city"> | null,
  outbound: Pick<TravelFlight, "to" | "arrives"> | null,
  inbound: Pick<TravelFlight, "from" | "departs"> | null,
): boolean {
  if (!stay || !hotel || !outbound) return false;
  const lands = outbound.arrives.slice(0, 10);
  if (!same(outbound.to.city, hotel.city) || lands > stay.checkIn || lands < addDays(stay.checkIn, -1)) return false;
  if (!inbound) return true;
  const leaves = inbound.departs.slice(0, 10);
  return same(inbound.from.city, hotel.city) && leaves >= stay.checkOut && leaves <= addDays(stay.checkOut, 1);
}

/** Whether a booking, changed to `stay` and `flight`, is still one trip: its hotel and flights read again (as it was when one can't be). */
async function stillTrip(deps: TravelDeps, booking: TravelBooking, stay: TravelStayPart | null, flight: TravelFlightPart | null, known: ReadonlyMap<number, TravelFlight> = new Map()): Promise<boolean> {
  if (!stay || !flight) return false;
  const flightOf = async (id: number) => known.get(id) ?? (await deps.flights.flight(id));
  const hotel = await deps.hotels.hotel(stay.hotelId);
  const outbound = await flightOf(flight.outbound.flightId);
  const inbound = flight.inbound ? await flightOf(flight.inbound.flightId) : null;
  if (!hotel || !outbound || (flight.inbound && !inbound)) return booking.lines.some((l) => l.kind === "bundle");
  return isTrip(stay, hotel, outbound, inbound);
}

/** The lines of a booking from its parts (a change keeps the change fees it had); `trip`: the stay has the bundle price (isTrip). */
export function linesOf(
  deps: Pick<TravelDeps, "settings">,
  parts: { stay: TravelStayPart | null; flight: TravelFlightPart | null; transfer: { cents: number } | null },
  member: boolean,
  hotel: Pick<TravelHotel, "taxBp"> | null,
  fees: readonly TravelLine[] = [],
  trip = false,
): TravelLine[] {
  const lines: TravelLine[] = [];
  if (parts.flight) lines.push(...flightLines(parts.flight));
  if (parts.stay) lines.push(...stayLines(parts.stay.nights, parts.stay.rooms, hotel ?? { taxBp: parts.stay.taxBp }, { member, bundle: trip && parts.flight !== null }, deps));
  if (parts.transfer) lines.push({ kind: "transfer", count: 1, unitCents: parts.transfer.cents, cents: parts.transfer.cents });
  lines.push(...fees.filter((l) => l.kind === "change_fee"));
  return lines;
}

/** Prices what was chosen, against what other bookings hold now; `others` given inside the store's lock. */
export async function priceChoice(deps: TravelDeps, choice: Choice, member: boolean): Promise<{ priced: Priced; check: (others: TravelBooking[]) => string | null } | Refusal> {
  const s = deps.settings;
  let stay: TravelStayPart | null = null;
  let hotel: TravelHotel | null = null;
  let room: TravelRoom | null = null;
  let refundable = true;
  let until: string | null = null;
  if (choice.stay) {
    if (!s.hotels) return notFound("Hotel not found.");
    const c = choice.stay;
    hotel = await deps.hotels.hotel(c.hotelId);
    room = hotel?.active ? ((await deps.hotels.rooms(hotel.id)).find((r) => r.id === c.roomId && r.active) ?? null) : null;
    const rate = room?.rates.find((r) => r.id === c.rateId) ?? null;
    if (!hotel || !hotel.active || !room || !rate) return notFound("That room isn't offered.");
    const dates = stayDatesRefusal(c.checkIn, c.checkOut, deps.now, s.timeZone);
    if (dates) return dates;
    if (daysBetween(c.checkIn, c.checkOut) < room.minNights) return bad(`This room is booked for at least ${room.minNights} nights.`);
    if (room.sleeps * c.rooms < c.guests) return bad("Choose more rooms for that many guests.");
    if (c.rooms > room.units) return taken();
    const nights = stayNights(room, rate, c.checkIn, c.checkOut);
    if (!nights) return taken();
    until = freeCancelUntil(rate, c.checkIn);
    if (until && until < today(deps.now, s.timeZone)) until = null;
    refundable = until !== null;
    stay = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomId: room.id,
      roomName: room.name,
      rateId: rate.id,
      rateName: rate.name,
      board: rate.board,
      checkIn: c.checkIn,
      checkOut: c.checkOut,
      guests: c.guests,
      rooms: c.rooms,
      nights,
      refundable,
      freeCancelUntil: until,
      taxBp: hotel.taxBp,
    };
  }
  let flight: TravelFlightPart | null = null;
  let outbound: TravelFlight | null = null;
  let inbound: TravelFlight | null = null;
  if (choice.flight) {
    if (!s.flights) return notFound("Flight not found.");
    const c = choice.flight;
    outbound = await deps.flights.flight(c.outboundId);
    inbound = c.inboundId ? await deps.flights.flight(c.inboundId) : null;
    if (!outbound || !onSale(outbound, deps.now, s.timeZone) || (c.inboundId && (!inbound || !onSale(inbound, deps.now, s.timeZone)))) return notFound("That flight isn't on sale.");
    if (inbound && (inbound.from.code.toUpperCase() !== outbound.to.code.toUpperCase() || inbound.to.code.toUpperCase() !== outbound.from.code.toUpperCase() || wallTime(inbound.departs) <= wallTime(outbound.arrives))) {
      return bad("The flight back must leave from where the first one lands, after it.");
    }
    const outFare = fareOf(outbound, c.fare);
    const backFare = inbound ? fareOf(inbound, c.fare) : null;
    if (!outFare || (inbound && !backFare)) return bad("That fare isn't sold on these flights.");
    flight = {
      outbound: legPart(outbound, c.fare, c.seatsOut, c.travellers),
      inbound: inbound ? legPart(inbound, c.fare, c.seatsBack, c.travellers) : null,
      travellers: c.travellers,
      bags: c.bags,
      meals: c.meals,
      bagCents: s.bagCents,
      mealCents: s.mealCents,
      changeable: outFare.changeable,
      changeFeeCents: outFare.changeFeeCents,
      refundable: outFare.refundable,
      refundFeeCents: outFare.refundFeeCents,
    };
    if (!outFare.refundable) refundable = false;
    if (stay && !until) refundable = false;
  }
  const trip = isTrip(stay, hotel, outbound, inbound);
  const transfer = choice.transfer && s.transfer && trip ? { cents: s.transfer.cents, note: s.transfer.note } : null;
  const lines = linesOf(deps, { stay, flight, transfer }, member, hotel, [], trip);
  const payAtHotel = Boolean(stay && !flight && s.payAtHotel && hotel?.payAtHotel && room?.rates.find((r) => r.id === stay!.rateId)?.payAtHotel);
  const priced: Priced = {
    stay,
    flight,
    transfer,
    lines,
    totalCents: linesTotal(lines),
    refundable,
    freeCancelUntil: stay ? until : null,
    payment: { now: s.payNow, atHotel: payAtHotel },
    hotel,
    room,
    outbound,
    inbound,
  };
  const check = (others: TravelBooking[]): string | null => {
    if (stay && room && freeUnits(room, others, stay.checkIn, stay.checkOut) < stay.rooms) return NOT_AVAILABLE;
    if (flight && outbound) {
      if (fareSeatsLeft(outbound, flight.outbound.fareId, others) < flight.travellers) return NOT_AVAILABLE;
      if (inbound && fareSeatsLeft(inbound, flight.outbound.fareId, others) < flight.travellers) return NOT_AVAILABLE;
      if (seatsRefusal(outbound, flight.outbound.seats, others)) return NOT_AVAILABLE;
      if (inbound && flight.inbound && seatsRefusal(inbound, flight.inbound.seats, others)) return NOT_AVAILABLE;
    }
    return null;
  };
  // Checked now for the quote; again in the store's lock when booking.
  const holds = [
    ...(stay ? await deps.hotels.holds(stay.roomId, stay.checkIn, stay.checkOut, deps.now) : []),
    ...(flight ? await deps.flights.holds([flight.outbound.flightId, ...(flight.inbound ? [flight.inbound.flightId] : [])], deps.now) : []),
  ];
  if (flight && outbound) {
    const seatsBad = seatsRefusal(outbound, flight.outbound.seats, holds) ?? (inbound && flight.inbound ? seatsRefusal(inbound, flight.inbound.seats, holds) : null);
    if (seatsBad) return seatsBad;
  }
  if (check(holds)) return taken();
  return { priced, check };
}

const money = (deps: Pick<TravelDeps, "settings">, cents: number) => formatCents(cents, deps.settings.currency);

export function lineJson(deps: Pick<TravelDeps, "settings">, line: TravelLine, currency = deps.settings.currency) {
  return {
    kind: line.kind,
    count: line.count,
    unit_formatted: line.unitCents === null ? null : formatCents(line.unitCents, currency),
    amount: centsToDecimal(line.cents),
    amount_formatted: line.cents < 0 ? `−${formatCents(-line.cents, currency)}` : formatCents(line.cents, currency),
  };
}

export function quoteJson(deps: TravelDeps, priced: Priced) {
  const saving = -priced.lines.filter((l) => l.kind === "member" || l.kind === "bundle").reduce((sum, l) => sum + l.cents, 0);
  return {
    currency: deps.settings.currency,
    lines: priced.lines.map((l) => lineJson(deps, l)),
    total: centsToDecimal(priced.totalCents),
    total_formatted: money(deps, priced.totalCents),
    saving_formatted: saving > 0 ? money(deps, saving) : null,
    refundable: priced.refundable,
    free_cancel_until: priced.freeCancelUntil,
    payment: { now: priced.payment.now, at_hotel: priced.payment.atHotel },
  };
}

// The booking

export interface BookingExtras {
  travellers: { firstName: string; lastName: string }[];
  contact: { name: string; email: string | null; phone: string | null };
  requests: TravelRequest[];
  note: string | null;
  payment: "now" | "at_hotel";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readExtras(body: unknown, choice: Choice): BookingExtras | Refusal {
  const b = obj(body);
  const list = Array.isArray(b.travellers) ? b.travellers : [];
  if (!list.length || list.length > 9) return bad("Add each traveller's name.");
  const travellers = [];
  for (const t of list) {
    const o = obj(t);
    const first = typeof o.first_name === "string" ? o.first_name.trim().slice(0, 60) : "";
    const last = typeof o.last_name === "string" ? o.last_name.trim().slice(0, 60) : "";
    if (!first || !last) return bad("Add each traveller's first and last name, as on the passport.");
    travellers.push({ firstName: first, lastName: last });
  }
  if (choice.flight && travellers.length !== choice.flight.travellers) return bad("Add a name for each traveller.");
  const c = obj(b.contact);
  const name = typeof c.name === "string" ? c.name.trim().slice(0, 120) : "";
  if (!name) return bad("Add the name to contact.");
  const email = typeof c.email === "string" && c.email.trim() ? c.email.trim().slice(0, 190) : null;
  if (email && !EMAIL.test(email)) return bad("That email doesn't look right.");
  const phone = typeof c.phone === "string" && c.phone.trim() ? c.phone.trim().slice(0, 24) : null;
  const requests = (Array.isArray(b.requests) ? b.requests : []).filter((r): r is TravelRequest => typeof r === "string" && (TRAVEL_REQUESTS as readonly string[]).includes(r));
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 500) : null;
  if (b.payment !== "now" && b.payment !== "at_hotel") return bad("Choose how to pay.");
  return { travellers, contact: { name, email, phone }, requests: [...new Set(requests)], note, payment: b.payment };
}

const REF_LETTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function newReference(random: (n: number) => number): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += REF_LETTERS[random(REF_LETTERS.length)];
  return `T-${out}`;
}

/** Unpaid bookings past their hold are released; confirmed ones past their last day (the flight back's, when there is one) are completed. Returns the booking as it is now. */
export async function refreshBooking(deps: Pick<TravelDeps, "store" | "app" | "now" | "flights" | "settings">, booking: TravelBooking): Promise<TravelBooking> {
  if (booking.status === "awaiting_payment" && booking.holdUntil && booking.holdUntil.getTime() <= deps.now.getTime() && booking.paidCents === 0) {
    const r = await deps.store.updateTravelBooking(
      deps.app.id,
      booking.id,
      { status: "cancelled", holdUntil: null, cancellation: { at: deps.now.toISOString(), by: "unpaid", reason: null } },
      { statuses: ["awaiting_payment"] },
      deps.now,
    );
    return r.ok ? r.booking : booking;
  }
  if (booking.status === "confirmed" && endsOf(booking, await bookingFlights(deps, [booking])).slice(0, 10) < today(deps.now, deps.settings.timeZone)) {
    const r = await deps.store.updateTravelBooking(deps.app.id, booking.id, { status: "completed" }, { statuses: ["confirmed"] }, deps.now);
    return r.ok ? r.booking : booking;
  }
  return booking;
}

/** The first thing of a booking (the flight out, else the check-in day), local. */
export function startsOf(booking: Pick<TravelBooking, "stay" | "flight">, flights?: ReadonlyMap<number, TravelFlight>): string {
  const out = booking.flight ? flights?.get(booking.flight.outbound.flightId) : undefined;
  if (out) return out.departs;
  return booking.stay?.checkIn ?? "9999-12-31";
}

export function endsOf(booking: Pick<TravelBooking, "stay" | "flight">, flights?: ReadonlyMap<number, TravelFlight>): string {
  const back = booking.flight?.inbound ? flights?.get(booking.flight.inbound.flightId) : undefined;
  if (back) return back.arrives;
  if (booking.stay) return booking.stay.checkOut;
  const out = booking.flight ? flights?.get(booking.flight.outbound.flightId) : undefined;
  return out?.arrives ?? startsOf(booking, flights);
}

/** Whether nothing of it has started yet (in the company's time zone). */
function notStarted(booking: TravelBooking, flights: ReadonlyMap<number, TravelFlight>, now: Date, zone: string): boolean {
  const out = booking.flight ? flights.get(booking.flight.outbound.flightId) : undefined;
  if (out && localInstant(out.departs, zone) <= now.getTime() + 2 * 3_600_000) return false;
  if (booking.stay && booking.stay.checkIn <= today(now, zone)) return false;
  return true;
}

/** What cancelling now refunds of what was paid (in the app), and of the whole. */
export function cancelRefund(booking: TravelBooking, now: Date, zone: string): number {
  const parts = partsOf(booking.lines);
  let refund = parts.transfer;
  if (booking.stay) refund += booking.stay.refundable && booking.stay.freeCancelUntil && booking.stay.freeCancelUntil >= today(now, zone) ? parts.stay : 0;
  if (booking.flight) refund += booking.flight.refundable ? Math.max(0, parts.flight - booking.flight.refundFeeCents * booking.flight.travellers) : 0;
  return Math.max(0, Math.min(booking.paidCents, refund));
}

export function canCancel(booking: TravelBooking, flights: ReadonlyMap<number, TravelFlight>, now: Date, zone: string): boolean {
  return (booking.status === "confirmed" || booking.status === "awaiting_payment") && notStarted(booking, flights, now, zone);
}

export function canChange(booking: TravelBooking, flights: ReadonlyMap<number, TravelFlight>, now: Date, zone: string): boolean {
  if (booking.status !== "confirmed" && booking.status !== "awaiting_payment") return false;
  if (!notStarted(booking, flights, now, zone)) return false;
  const stayOk = Boolean(booking.stay?.refundable && booking.stay.freeCancelUntil && booking.stay.freeCancelUntil >= today(now, zone));
  return stayOk || Boolean(booking.flight?.changeable);
}

/** Boarding passes open: confirmed, nothing to pay, and check-in open on a flight (by the company, or 48 hours before). */
export function passesOpen(booking: TravelBooking, flights: ReadonlyMap<number, TravelFlight>, now: Date, zone: string): boolean {
  if (booking.status !== "confirmed" || !booking.flight || dueCents(booking) > 0) return false;
  return legsOf(booking).some(({ part }) => {
    const f = flights.get(part.flightId);
    return Boolean(f && f.status !== "cancelled" && (f.checkInOpen || localInstant(f.departs, zone) - now.getTime() <= 48 * 3_600_000) && localInstant(f.arrives, zone) > now.getTime() - 6 * 3_600_000);
  });
}

export function legsOf(booking: Pick<TravelBooking, "flight">): { leg: "out" | "back"; part: TravelLegPart }[] {
  if (!booking.flight) return [];
  return [{ leg: "out" as const, part: booking.flight.outbound }, ...(booking.flight.inbound ? [{ leg: "back" as const, part: booking.flight.inbound }] : [])];
}

/** The flights a booking has, by ID. */
export async function bookingFlights(deps: Pick<TravelDeps, "flights">, bookings: readonly Pick<TravelBooking, "flight">[]): Promise<Map<number, TravelFlight>> {
  const ids = [...new Set(bookings.flatMap((b) => legsOf(b).map((l) => l.part.flightId)))];
  const map = new Map<number, TravelFlight>();
  for (const id of ids) {
    const f = await deps.flights.flight(id);
    if (f) map.set(id, f);
  }
  return map;
}

export async function bookingJson(deps: TravelDeps, booking: TravelBooking, flights: ReadonlyMap<number, TravelFlight>, review: TravelReview | null) {
  const hotel = booking.stay ? await deps.hotels.hotel(booking.stay.hotelId) : null;
  const currency = booking.currency;
  const fm = (cents: number) => formatCents(cents, currency);
  const due = dueCents(booking);
  const stay = booking.stay;
  const zone = deps.settings.timeZone;
  const day = today(deps.now, zone);
  const ended = stay ? stay.checkOut <= day : false;
  const refund = canCancel(booking, flights, deps.now, zone) ? cancelRefund(booking, deps.now, zone) : 0;
  const starts = startsOf(booking, flights);
  return {
    id: booking.id,
    reference: booking.reference,
    kind: booking.kind,
    status: booking.status,
    created_at: booking.createdAt.toISOString(),
    hold_until: booking.status === "awaiting_payment" && booking.holdUntil ? booking.holdUntil.toISOString() : null,
    starts,
    // 126.10 The same moment as an instant (the company's time zone), for the trip's countdown on any phone.
    starts_at: new Date(localInstant(starts, zone)).toISOString(),
    ends: endsOf(booking, flights),
    stay: stay
      ? {
          hotel: {
            id: stay.hotelId,
            name: hotel?.name ?? stay.hotelName,
            city: hotel?.city ?? "",
            photo_url: hotel?.photos[0] ? deps.assetUrl(hotel.photos[0]) : null,
            lat: hotel?.lat ?? null,
            lng: hotel?.lng ?? null,
            phone: hotel?.phone ?? null,
            address: hotel?.address ?? null,
            check_in_time: hotel?.checkInTime ?? "15:00",
            check_out_time: hotel?.checkOutTime ?? "12:00",
          },
          room_name: stay.roomName,
          rate_name: stay.rateName,
          board: stay.board,
          check_in: stay.checkIn,
          check_out: stay.checkOut,
          nights: stay.nights.length,
          guests: stay.guests,
          rooms: stay.rooms,
          refundable: stay.refundable && Boolean(stay.freeCancelUntil && stay.freeCancelUntil >= day),
          free_cancel_until: stay.freeCancelUntil,
          can_review: !review && ended && (booking.status === "completed" || booking.status === "confirmed") && daysBetween(stay.checkOut, day) <= 30,
          review: review ? reviewJson(review) : null,
        }
      : null,
    flights: legsOf(booking).flatMap(({ leg, part }) => {
      const f = flights.get(part.flightId);
      if (!f) return [];
      return [{ ...legJson(f), leg, fare_id: part.fareId, fare_name: part.fareName, seats: part.seats }];
    }),
    transfer: booking.transfer ? { note: booking.transfer.note } : null,
    travellers: booking.travellers.map((t) => ({ first_name: t.firstName, last_name: t.lastName })),
    contact: booking.contact,
    requests: booking.requests,
    payment: {
      method: booking.paymentMethod,
      status: booking.paymentStatus,
      paid_formatted: booking.paidCents > 0 ? fm(booking.paidCents) : null,
      due: due > 0 ? centsToDecimal(due) : null,
      due_formatted: due > 0 ? fm(due) : null,
    },
    currency,
    lines: booking.lines.map((l) => lineJson(deps, l, currency)),
    total: centsToDecimal(booking.totalCents),
    total_formatted: fm(booking.totalCents),
    cancellation: booking.cancellation ? { at: booking.cancellation.at, by: booking.cancellation.by, refund_formatted: booking.refundCents > 0 ? fm(booking.refundCents) : null } : null,
    can_cancel: canCancel(booking, flights, deps.now, zone),
    cancel_refund_formatted: refund > 0 ? fm(refund) : null,
    can_change: canChange(booking, flights, deps.now, zone),
    passes_open: passesOpen(booking, flights, deps.now, zone),
  };
}

export function newBooking(deps: TravelDeps, user: HostedUser, priced: Priced, extras: BookingExtras, reference: string, lang: string | null) {
  const atHotel = extras.payment === "at_hotel";
  const now = deps.now;
  return {
    appId: deps.app.id,
    userId: user.id,
    reference,
    kind: priced.stay && priced.flight ? ("trip" as const) : priced.stay ? ("stay" as const) : ("flight" as const),
    status: atHotel ? ("confirmed" as const) : ("awaiting_payment" as const),
    stay: priced.stay,
    flight: priced.flight,
    transfer: priced.transfer,
    travellers: extras.travellers,
    contact: extras.contact,
    requests: extras.requests,
    note: extras.note,
    currency: deps.settings.currency,
    lines: priced.lines,
    totalCents: priced.totalCents,
    paymentMethod: extras.payment,
    paymentStatus: atHotel ? ("at_hotel" as const) : ("unpaid" as const),
    paidCents: 0,
    refundCents: 0,
    orderId: null,
    holdUntil: atHotel ? null : new Date(now.getTime() + HOLD_MINUTES * 60_000),
    cancellation: null,
    changes: [],
    lang,
    sample: false,
    createdAt: now,
    updatedAt: now,
  };
}

// After booking

/** The patch that cancels a booking: what is refunded of what was paid, by whom. */
export function cancelPatch(booking: TravelBooking, by: "customer" | "company", reason: string | null, now: Date, zone: string, full = false) {
  const refund = full ? booking.paidCents : cancelRefund(booking, now, zone);
  return {
    status: "cancelled" as const,
    holdUntil: null,
    refundCents: refund,
    paymentStatus: refund > 0 ? ("refund_due" as const) : booking.paymentStatus,
    cancellation: { at: now.toISOString(), by, reason },
    changes: [...booking.changes, { at: now.toISOString(), what: by === "company" ? "Cancelled by the company" : "Cancelled in the app" }],
  };
}

/** The booking with new stay dates, priced again (taxes and prices of the new nights); a refusal when they can't be. */
export async function changedStay(deps: TravelDeps, booking: TravelBooking, checkIn: string, checkOut: string, member: boolean): Promise<{ patch: Partial<TravelBooking>; room: TravelRoom } | Refusal> {
  const stay = booking.stay!;
  const zone = deps.settings.timeZone;
  if (!(stay.refundable && stay.freeCancelUntil && stay.freeCancelUntil >= today(deps.now, zone))) return conflict("not_changeable", "This stay's rate can't be changed.");
  const dates = stayDatesRefusal(checkIn, checkOut, deps.now, zone);
  if (dates) return dates;
  const room = (await deps.hotels.rooms(stay.hotelId)).find((r) => r.id === stay.roomId && r.active) ?? null;
  const rate = room?.rates.find((r) => r.id === stay.rateId) ?? null;
  if (!room || !rate) return conflict("not_changeable", "This room isn't offered anymore.");
  if (daysBetween(checkIn, checkOut) < room.minNights) return bad(`This room is booked for at least ${room.minNights} nights.`);
  const nights = stayNights(room, rate, checkIn, checkOut);
  if (!nights) return taken();
  const until = freeCancelUntil(rate, checkIn);
  const nextStay: TravelStayPart = { ...stay, checkIn, checkOut, nights, freeCancelUntil: until, refundable: rate.refundable };
  const hotel = await deps.hotels.hotel(stay.hotelId);
  const trip = await stillTrip(deps, booking, nextStay, booking.flight);
  const lines = linesOf(deps, { stay: nextStay, flight: booking.flight, transfer: booking.transfer }, member, hotel ?? { taxBp: stay.taxBp }, booking.lines, trip);
  return {
    room,
    patch: withTotal(booking, lines, { stay: nextStay, changes: [...booking.changes, { at: deps.now.toISOString(), what: `Dates changed to ${checkIn} – ${checkOut}` }] }),
  };
}

/** A leg moved to another flight of the same route, for the fare's change fee. */
export async function changedLeg(deps: TravelDeps, booking: TravelBooking, leg: "out" | "back", flightId: number, member: boolean): Promise<{ patch: Partial<TravelBooking>; flight: TravelFlight } | Refusal> {
  const part = booking.flight!;
  if (!part.changeable) return conflict("not_changeable", "This fare can't be changed.");
  const current = leg === "out" ? part.outbound : part.inbound;
  if (!current) return bad("This booking has no flight back.");
  const before = await deps.flights.flight(current.flightId);
  const next = await deps.flights.flight(flightId);
  if (!next || !onSale(next, deps.now, deps.settings.timeZone)) return notFound("That flight isn't on sale.");
  if (before && (next.from.code.toUpperCase() !== before.from.code.toUpperCase() || next.to.code.toUpperCase() !== before.to.code.toUpperCase())) return bad("Choose a flight on the same route.");
  if (!fareOf(next, current.fareId)) return bad("That fare isn't sold on that flight.");
  const nextLeg = legPart(next, current.fareId, [], part.travellers);
  const nextPart: TravelFlightPart = leg === "out" ? { ...part, outbound: nextLeg } : { ...part, inbound: nextLeg };
  const other = leg === "out" ? (part.inbound ? await deps.flights.flight(part.inbound.flightId) : null) : await deps.flights.flight(part.outbound.flightId);
  if (other && (leg === "out" ? wallTime(other.departs) <= wallTime(next.arrives) : wallTime(next.departs) <= wallTime(other.arrives))) return bad("The flight back must leave after the flight out lands.");
  const hotel = booking.stay ? await deps.hotels.hotel(booking.stay.hotelId) : null;
  const fee: TravelLine[] = part.changeFeeCents > 0 ? [{ kind: "change_fee", count: part.travellers, unitCents: part.changeFeeCents, cents: part.changeFeeCents * part.travellers }] : [];
  const trip = await stillTrip(deps, booking, booking.stay, nextPart, new Map([[next.id, next], ...(other ? [[other.id, other] as const] : [])]));
  const lines = linesOf(deps, { stay: booking.stay, flight: nextPart, transfer: booking.transfer }, member, hotel, [...booking.lines, ...fee], trip);
  return { flight: next, patch: withTotal(booking, lines, { flight: nextPart, changes: [...booking.changes, { at: deps.now.toISOString(), what: `Flight ${current.number} changed to ${next.number}` }] }) };
}

/** Seats chosen again on a leg. */
export function seatsPatch(deps: TravelDeps, booking: TravelBooking, leg: "out" | "back", flight: TravelFlight, seats: (string | null)[], member: boolean, hotel: TravelHotel | null): Partial<TravelBooking> {
  const part = booking.flight!;
  const current = leg === "out" ? part.outbound : part.inbound!;
  const nextLeg = legPart(flight, current.fareId, seats, part.travellers);
  const nextPart: TravelFlightPart = leg === "out" ? { ...part, outbound: nextLeg } : { ...part, inbound: nextLeg };
  // The same flight, other seats: still the trip it was.
  const lines = linesOf(deps, { stay: booking.stay, flight: nextPart, transfer: booking.transfer }, member, hotel, booking.lines, booking.lines.some((l) => l.kind === "bundle"));
  return withTotal(booking, lines, { flight: nextPart });
}

/**
 * 126.10 What a booking paid in the app owes back, from what was paid and
 * its total now: the refund is always what was paid over the total (none
 * when the total rose again), the payment status follows it.
 */
export function settledPayment(booking: Pick<TravelBooking, "paidCents" | "paymentStatus">, total: number): Pick<TravelBooking, "refundCents" | "paymentStatus"> {
  const refund = Math.max(0, booking.paidCents - total);
  if (refund > 0) return { refundCents: refund, paymentStatus: "refund_due" };
  if (booking.paidCents > 0 && booking.paidCents >= total) return { refundCents: 0, paymentStatus: "paid" };
  return { refundCents: 0, paymentStatus: booking.paidCents > 0 || booking.paymentStatus === "refund_due" ? "unpaid" : booking.paymentStatus };
}

/** New lines and total; less than what was paid is refunded by the company. */
function withTotal(booking: TravelBooking, lines: TravelLine[], patch: Partial<TravelBooking>): Partial<TravelBooking> {
  const total = linesTotal(lines);
  return {
    ...patch,
    lines,
    totalCents: total,
    ...(booking.paymentMethod === "now" ? settledPayment(booking, total) : {}),
  };
}

/** 126.10 The company refunded what was due: it is no longer paid, nothing is due back (a later cancel refunds only what is still paid). */
export function refundedPatch(booking: TravelBooking, now: Date): Partial<TravelBooking> {
  return {
    paymentStatus: "refunded",
    paidCents: Math.max(0, booking.paidCents - booking.refundCents),
    refundCents: 0,
    changes: [...booking.changes, { at: now.toISOString(), what: `Refunded ${booking.refundCents / 100} ${booking.currency}` }],
  };
}

/** Whether a changed booking still fits what others hold. */
export function fitsCheck(room: TravelRoom | null, flights: ReadonlyMap<number, TravelFlight>) {
  return (others: TravelBooking[], next: TravelBooking): string | null => {
    if (next.stay && room && freeUnits(room, others, next.stay.checkIn, next.stay.checkOut) < next.stay.rooms) return NOT_AVAILABLE;
    for (const { part } of legsOf(next)) {
      const f = flights.get(part.flightId);
      if (!f) continue;
      if (fareSeatsLeft(f, part.fareId, others) < next.flight!.travellers) return NOT_AVAILABLE;
      if (seatsRefusal(f, part.seats, others)) return NOT_AVAILABLE;
    }
    return null;
  };
}

export function seatsRefusalOf(flight: TravelFlight, seats: readonly (string | null)[], others: readonly TravelBooking[]): Refusal | null {
  return seatsRefusal(flight, seats, others);
}

// Boarding passes

/** 126.10 The app's key for boarding pass codes, made from the platform's signing secret (as tickets' are). */
export function passKey(signingSecret: string, appId: string): string {
  return hmacSha256(signingSecret, `travel-passes:${appId}`);
}

/** A boarding pass's code, signed with the app's key (passKey). */
export function passCode(key: string, booking: TravelBooking, flightId: number, traveller: number): string {
  const body = `${booking.reference}.${flightId}.${traveller + 1}`;
  const mac = createHmac("sha256", key).update(`${booking.appId}.${body}`).digest("base64url").slice(0, 10);
  return `YT1.${body}.${mac}`;
}

const GROUPS: Record<TravelFareId, number> = { flex: 2, standard: 3, light: 4 };

export function passesJson(booking: TravelBooking, flights: ReadonlyMap<number, TravelFlight>, key: string, now: Date, zone: string) {
  const out = [];
  for (const { leg, part } of legsOf(booking)) {
    const f = flights.get(part.flightId);
    if (!f || f.status === "cancelled") continue;
    if (!(f.checkInOpen || localInstant(f.departs, zone) - now.getTime() <= 48 * 3_600_000)) continue;
    const fare = fareOf(f, part.fareId);
    for (const [i, t] of booking.travellers.entries()) {
      out.push({
        leg,
        flight: legJson(f),
        passenger: `${t.firstName} ${t.lastName}`.toUpperCase(),
        seat: part.seats[i] ?? null,
        group: fare?.priority ? 1 : GROUPS[part.fareId],
        fare_name: part.fareName,
        code: passCode(key, booking, f.id, i),
      });
    }
  }
  return out;
}

// Reviews

export interface ReviewInput {
  score: number;
  staff: number | null;
  clean: number | null;
  location: number | null;
  value: number | null;
  trip: (typeof TRAVEL_TRIP_TYPES)[number] | null;
  text: string | null;
}

export function readReview(body: unknown): ReviewInput | Refusal {
  const b = obj(body);
  const score = int(b.score, 1, 10, null);
  if (score === null) return bad("Give a score from 1 to 10.");
  const part = (key: string) => (b[key] === undefined || b[key] === null ? null : int(b[key], 1, 10, null));
  const parts = { staff: part("staff"), clean: part("clean"), location: part("location"), value: part("value") };
  for (const [key, value] of Object.entries(parts)) if (value === null && b[key] !== undefined && b[key] !== null) return bad("Give each score from 1 to 10.");
  const trip = typeof b.trip === "string" && (TRAVEL_TRIP_TYPES as readonly string[]).includes(b.trip) ? (b.trip as ReviewInput["trip"]) : null;
  const text = typeof b.text === "string" && b.text.trim() ? b.text.trim().slice(0, 600) : null;
  return { score, ...parts, trip, text };
}

export { addDays };
