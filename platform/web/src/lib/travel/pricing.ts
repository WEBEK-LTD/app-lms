import type { TravelBooking, TravelFare, TravelFareId, TravelFlight, TravelHotel, TravelLine, TravelRate, TravelRoom, TravelSeatMap, TravelSettings } from "../data/types";
import { localToUtc, utcToLocal } from "../bookings/time";
import { flightIdsOf } from "./holds";

/**
 * 126 Prices, dates and what is free: a room's nights, a stay's price with
 * its taxes and the member and bundle prices, a flight's fares and seats,
 * and what other bookings hold. Pure, so the stores' booking lock and the
 * app API work them out the same way.
 */

// Dates are the hotel's and the flight's own days, "YYYY-MM-DD".

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The nights of a stay: each date slept. */
export function nightsOf(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  for (let d = checkIn; d < checkOut && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 126.10 Today at the company: the day in its time zone (Travel settings). */
export function today(now: Date, zone: string): string {
  return utcToLocal(now, zone).date;
}

/** A local wall time "YYYY-MM-DDTHH:MM" read as if it were UTC: only to compare two wall times (which is first, how far apart). */
export function wallTime(value: string): number {
  return Date.parse(`${value}:00Z`);
}

/** 126.10 The instant of a local wall time "YYYY-MM-DDTHH:MM" (or a day, at midnight) in the company's time zone: to say what is past and how long until it. */
export function localInstant(value: string, zone: string): number {
  return localToUtc(value.slice(0, 10), value.length > 10 ? value.slice(11, 16) : "00:00", zone).getTime();
}

// Rooms

/** One room's price on a night, with the rate's extra; null when it isn't open then. */
export function nightCents(room: Pick<TravelRoom, "nightlyCents" | "prices" | "openFrom" | "openUntil" | "closed">, rate: Pick<TravelRate, "extraCents"> | null, date: string): number | null {
  if (room.openFrom && date < room.openFrom) return null;
  if (room.openUntil && date > room.openUntil) return null;
  if (room.closed.includes(date)) return null;
  const base = room.prices[date] ?? room.nightlyCents;
  if (!(base > 0)) return null;
  return base + (rate?.extraCents ?? 0);
}

/** Each night's price of one room, or null when a night isn't open. */
export function stayNights(room: TravelRoom, rate: TravelRate | null, checkIn: string, checkOut: string): { date: string; cents: number }[] | null {
  const nights: { date: string; cents: number }[] = [];
  for (const date of nightsOf(checkIn, checkOut)) {
    const cents = nightCents(room, rate, date);
    if (cents === null) return null;
    nights.push({ date, cents });
  }
  return nights.length ? nights : null;
}

/** How many rooms of the type are still free on every night (`others`: the bookings holding it). */
export function freeUnits(room: Pick<TravelRoom, "id" | "units">, others: readonly TravelBooking[], checkIn: string, checkOut: string): number {
  let free = room.units;
  for (const date of nightsOf(checkIn, checkOut)) {
    let used = 0;
    for (const b of others) if (b.stay?.roomId === room.id && b.stay.checkIn <= date && b.stay.checkOut > date) used += b.stay.rooms;
    free = Math.min(free, room.units - used);
  }
  return Math.max(0, free);
}

/** The last day of free cancellation (23:59 at the hotel), or null when the rate has none. */
export function freeCancelUntil(rate: Pick<TravelRate, "refundable" | "freeCancelDays">, checkIn: string): string | null {
  return rate.refundable ? addDays(checkIn, -Math.max(0, rate.freeCancelDays)) : null;
}

export interface StayPrice {
  nights: number;
  /** All the rooms' nights. */
  nightsCents: number;
  taxCents: number;
  memberCents: number;
  bundleCents: number;
  totalCents: number;
  /** Before the member and bundle prices. */
  wasCents: number;
}

/** A stay's price: the nights, their taxes and fees, less the member price (signed in) and the bundle saving (with a flight). */
export function stayPrice(
  nights: readonly { cents: number }[],
  rooms: number,
  hotel: Pick<TravelHotel, "taxBp">,
  offs: { member: boolean; bundle: boolean },
  settings: Pick<TravelSettings, "memberOffPercent" | "bundleOffPercent">,
): StayPrice {
  const nightsCents = nights.reduce((sum, n) => sum + n.cents, 0) * rooms;
  const taxCents = Math.round((nightsCents * hotel.taxBp) / 10_000);
  const memberCents = offs.member ? Math.round((nightsCents * settings.memberOffPercent) / 100) : 0;
  const bundleCents = offs.bundle ? Math.round((nightsCents * settings.bundleOffPercent) / 100) : 0;
  const wasCents = nightsCents + taxCents;
  return { nights: nights.length, nightsCents, taxCents, memberCents, bundleCents, totalCents: wasCents - memberCents - bundleCents, wasCents };
}

/** The cheapest night of a room type, before taxes (open on some day ahead); null when none. */
export function fromNightly(rooms: readonly TravelRoom[]): number | null {
  let best: number | null = null;
  for (const room of rooms) {
    if (!room.active) continue;
    const extra = Math.min(...room.rates.map((r) => r.extraCents), 0);
    const prices = [room.nightlyCents, ...Object.values(room.prices)].filter((c) => c > 0);
    for (const c of prices) if (best === null || c + extra < best) best = c + extra;
  }
  return best;
}

// Flights

export const FARE_ORDER: readonly TravelFareId[] = ["light", "standard", "flex"];

/** Seats still free at a fare (`others`: the bookings holding seats on the flight). */
export function fareSeatsLeft(flight: Pick<TravelFlight, "id" | "fares">, fareId: TravelFareId, others: readonly TravelBooking[]): number {
  const fare = flight.fares.find((f) => f.id === fareId);
  if (!fare) return 0;
  let used = 0;
  for (const b of others) {
    const f = b.flight;
    if (!f) continue;
    if (f.outbound.flightId === flight.id && f.outbound.fareId === fareId) used += f.travellers;
    if (f.inbound?.flightId === flight.id && f.inbound.fareId === fareId) used += f.travellers;
  }
  return Math.max(0, fare.seats - used);
}

/** The seats taken on a flight's map: by other bookings and blocked by the company. */
export function takenSeats(flight: Pick<TravelFlight, "id" | "seatMap">, others: readonly TravelBooking[]): Set<string> {
  const taken = new Set(flight.seatMap?.blocked ?? []);
  for (const b of others) {
    const f = b.flight;
    if (!f || !flightIdsOf(b).includes(flight.id)) continue;
    const leg = f.outbound.flightId === flight.id ? f.outbound : f.inbound;
    for (const seat of leg?.seats ?? []) if (seat) taken.add(seat);
  }
  return taken;
}

/** Every seat of a map, row by row: "14A". */
export function seatIds(map: TravelSeatMap): { row: number; seats: string[] }[] {
  const letters = map.layout.replace(/\s+/g, "").split("");
  const rows: { row: number; seats: string[] }[] = [];
  for (let n = map.firstRow; n < map.firstRow + map.rows; n++) rows.push({ row: n, seats: letters.map((l) => `${n}${l}`) });
  return rows;
}

export function seatExists(map: TravelSeatMap, seat: string): boolean {
  const m = /^(\d{1,2})([A-K])$/.exec(seat);
  if (!m) return false;
  const row = Number(m[1]);
  return row >= map.firstRow && row < map.firstRow + map.rows && map.layout.replace(/\s+/g, "").includes(m[2]!);
}

/** What a seat costs on a fare: extra legroom at its price, a seat on a light fare at the seat price. */
export function seatCents(map: TravelSeatMap | null, fare: Pick<TravelFare, "seat">, seat: string | null): number {
  if (!map || !seat) return 0;
  if (fare.seat === "any") return 0;
  const row = Number(/^\d+/.exec(seat)?.[0] ?? 0);
  if (map.extraRows.includes(row)) return map.extraCents;
  return fare.seat === "fee" ? map.seatCents : 0;
}

// Totals

/** The lines' total. */
export function linesTotal(lines: readonly TravelLine[]): number {
  return lines.reduce((sum, l) => sum + l.cents, 0);
}

/** What a booking's parts cost: the stay (with its taxes, less the member and bundle prices), the flights (fares, seats, bags, meals, change fees) and the transfer. */
export function partsOf(lines: readonly TravelLine[]): { stay: number; flight: number; transfer: number } {
  let stay = 0;
  let flight = 0;
  let transfer = 0;
  for (const l of lines) {
    if (l.kind === "nights" || l.kind === "taxes" || l.kind === "member" || l.kind === "bundle") stay += l.cents;
    else if (l.kind === "transfer") transfer += l.cents;
    else flight += l.cents;
  }
  return { stay, flight, transfer };
}

/** What is still to pay in the app; 0 for nothing. */
export function dueCents(booking: Pick<TravelBooking, "paymentMethod" | "status" | "totalCents" | "paidCents">): number {
  if (booking.paymentMethod !== "now") return 0;
  if (booking.status !== "awaiting_payment" && booking.status !== "confirmed") return 0;
  return Math.max(0, booking.totalCents - booking.paidCents);
}

/** Percentile of sorted numbers (0..1). */
export function percentile(sorted: readonly number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[i]!;
}

/** low, typical or high against the prices around it. */
export function levelOf(cents: number, all: readonly number[]): "low" | "typical" | "high" {
  const sorted = [...all].sort((a, b) => a - b);
  if (sorted.length < 3) return "typical";
  if (cents <= percentile(sorted, 1 / 3)) return "low";
  if (cents >= percentile(sorted, 2 / 3) && cents > sorted[0]!) return "high";
  return "typical";
}
