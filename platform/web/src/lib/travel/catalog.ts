import { centsToDecimal, formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type { App, TravelBooking, TravelFare, TravelFareId, TravelFlight, TravelHotel, TravelReview, TravelRoom, TravelSettings } from "../data/types";
import { TRAVEL_AMENITIES } from "../data/types";
import { fontFiles } from "../fonts/catalog";
import { addDays, daysBetween, FARE_ORDER, fareSeatsLeft, freeCancelUntil, freeUnits, fromNightly, isDate, levelOf, localInstant, percentile, seatIds, stayNights, stayPrice, takenSeats, today, wallTime } from "./pricing";
import { TRAVEL_LIMITS, travelMode } from "./settings";
import type { FlightSource, HotelSource } from "./sources";

/**
 * 126 What the travel app shows before booking: Config.travel, Explore, the
 * places, the hotels and their rooms with prices, the flights with their
 * fares, the price calendar and the seat map (docs/api/openapi.yaml, tag
 * Travel).
 */

export interface TravelDeps {
  store: DataStore;
  app: App;
  settings: TravelSettings;
  hotels: HotelSource;
  flights: FlightSource;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  now: Date;
}

const money = (deps: Pick<TravelDeps, "settings">, cents: number) => formatCents(cents, deps.settings.currency);
const amount = (cents: number) => centsToDecimal(cents);

export const AMENITY_ICONS: Record<(typeof TRAVEL_AMENITIES)[number], string> = {
  pool: "pool",
  spa: "spa",
  wifi: "wifi",
  breakfast: "free_breakfast",
  shuttle: "airport_shuttle",
  gym: "fitness_center",
  parking: "local_parking",
  beach: "beach_access",
  restaurant: "restaurant",
  bar: "local_bar",
  air_conditioning: "ac_unit",
  family: "family_restroom",
  pets: "pets",
  accessible: "accessible",
  kitchen: "kitchen",
  view: "landscape",
};

// Config

export async function travelConfig(deps: TravelDeps) {
  const s = deps.settings;
  const hotels = s.hotels ? (await deps.hotels.hotels()).filter((h) => h.active) : [];
  const themes = [...new Set(hotels.flatMap((h) => h.themes))].slice(0, 12);
  const amenities = TRAVEL_AMENITIES.filter((a) => hotels.some((h) => h.amenities.includes(a))).map((id) => ({ id, icon: AMENITY_ICONS[id] }));
  const files = s.displayFont ? fontFiles(deps.platformUrl, s.displayFont) : [];
  return {
    mode: travelMode(s),
    hotels: s.hotels,
    flights: s.flights,
    currency: s.currency,
    single_hotel_id: hotels.length === 1 ? hotels[0]!.id : null,
    payment: { now: s.payNow, at_hotel: s.payAtHotel && s.hotels },
    member_off_percent: s.hotels ? s.memberOffPercent : 0,
    bundle_off_percent: s.hotels && s.flights ? s.bundleOffPercent : 0,
    transfer: s.transfer && s.hotels && s.flights ? { price: amount(s.transfer.cents), price_formatted: money(deps, s.transfer.cents), note: s.transfer.note } : null,
    display_font: s.displayFont && files.length ? { family: s.displayFont, files } : null,
    themes,
    amenities,
    help: { phone: s.help.phone, email: s.help.email, whatsapp: s.help.whatsapp },
  };
}

// Hotels

export interface StayAsk {
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  rooms: number;
}

export type Refusal = { status: number; code: string; message: string };
const bad = (message: string): Refusal => ({ status: 400, code: "invalid_request", message });

/** The dates and guests asked for, or why they can't be. */
export function readStayAsk(query: URLSearchParams, now: Date, zone: string): StayAsk | Refusal {
  const checkIn = query.get("check_in");
  const checkOut = query.get("check_out");
  const guests = query.get("guests") ? Number(query.get("guests")) : 2;
  const rooms = query.get("rooms") ? Number(query.get("rooms")) : 1;
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) return bad("Choose from 1 to 12 guests.");
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 5) return bad("Choose from 1 to 5 rooms.");
  if (!checkIn && !checkOut) return { checkIn: null, checkOut: null, guests, rooms };
  if (!isDate(checkIn) || !isDate(checkOut)) return bad("Choose the check-in and check-out days.");
  const refusal = stayDatesRefusal(checkIn, checkOut, now, zone);
  if (refusal) return refusal;
  return { checkIn, checkOut, guests, rooms };
}

export function stayDatesRefusal(checkIn: string, checkOut: string, now: Date, zone: string): Refusal | null {
  const day = today(now, zone);
  if (checkIn < day) return bad("The check-in day has passed.");
  // 126.10 Rooms are priced up to TRAVEL_LIMITS.priceDays ahead.
  if (checkIn > addDays(day, TRAVEL_LIMITS.priceDays)) return bad(`Choose a check-in day within ${TRAVEL_LIMITS.priceDays} days.`);
  const nights = daysBetween(checkIn, checkOut);
  if (nights < 1) return bad("Check-out comes after check-in.");
  if (nights > 30) return bad("A stay can be up to 30 nights.");
  return null;
}

interface RatePrice {
  rateId: string;
  totalCents: number;
  wasCents: number;
  nights: number;
}

/** A room's rates priced for the dates (null prices without dates), and how many are free. */
async function pricedRoom(deps: TravelDeps, hotel: TravelHotel, room: TravelRoom, ask: StayAsk, member: boolean) {
  if (!ask.checkIn || !ask.checkOut) return { free: room.units, prices: new Map<string, RatePrice>(), fits: room.sleeps * ask.rooms >= ask.guests };
  const holds = await deps.hotels.holds(room.id, ask.checkIn, ask.checkOut, deps.now);
  const free = freeUnits(room, holds, ask.checkIn, ask.checkOut);
  const fits = room.sleeps * ask.rooms >= ask.guests && daysBetween(ask.checkIn, ask.checkOut) >= room.minNights;
  const prices = new Map<string, RatePrice>();
  for (const rate of room.rates) {
    const nights = stayNights(room, rate, ask.checkIn, ask.checkOut);
    if (!nights) continue;
    const p = stayPrice(nights, ask.rooms, hotel, { member, bundle: false }, deps.settings);
    prices.set(rate.id, { rateId: rate.id, totalCents: p.totalCents, wasCents: p.wasCents, nights: p.nights });
  }
  return { free, prices, fits };
}

function priceJson(deps: TravelDeps, p: RatePrice, member: boolean) {
  return {
    nights: p.nights,
    total: amount(p.totalCents),
    total_formatted: money(deps, p.totalCents),
    nightly_formatted: money(deps, Math.round(p.totalCents / Math.max(1, p.nights))),
    was_total_formatted: member && p.wasCents > p.totalCents ? money(deps, p.wasCents) : null,
    member: member && p.wasCents > p.totalCents,
  };
}

export interface ScoreSummary {
  score: number | null;
  reviews: number;
  staff: number | null;
  clean: number | null;
  location: number | null;
  value: number | null;
}

const avg = (values: (number | null)[]) => {
  const nums = values.filter((v): v is number => typeof v === "number");
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
};

export function scoresOf(reviews: readonly TravelReview[]): ScoreSummary {
  const shown = reviews.filter((r) => !r.hidden);
  return {
    score: avg(shown.map((r) => r.score)),
    reviews: shown.length,
    staff: avg(shown.map((r) => r.staff)),
    clean: avg(shown.map((r) => r.clean)),
    location: avg(shown.map((r) => r.location)),
    value: avg(shown.map((r) => r.value)),
  };
}

export function reviewJson(review: TravelReview) {
  return { name: review.name.split(/\s+/)[0] ?? review.name, score: review.score, trip: review.trip, text: review.text, stayed: review.stayed };
}

/** A hotel on a list: its cheapest free room and rate for the dates. */
async function hotelCard(deps: TravelDeps, hotel: TravelHotel, rooms: readonly TravelRoom[], reviews: readonly TravelReview[], ask: StayAsk, member: boolean, saved: ReadonlySet<number>) {
  const own = rooms.filter((r) => r.hotelId === hotel.id && r.active);
  const rates = own.flatMap((r) => r.rates);
  let best: RatePrice | null = null;
  if (ask.checkIn && ask.checkOut) {
    for (const room of own) {
      const priced = await pricedRoom(deps, hotel, room, ask, member);
      if (!priced.fits || priced.free < ask.rooms) continue;
      for (const p of priced.prices.values()) if (!best || p.totalCents < best.totalCents) best = p;
    }
  }
  const scores = scoresOf(reviews.filter((r) => r.hotelId === hotel.id));
  const nightly = fromNightly(own);
  return {
    card: {
      id: hotel.id,
      name: hotel.name,
      kind: hotel.kind,
      stars: hotel.stars,
      city: hotel.city,
      country: hotel.country,
      area: hotel.area,
      landmark: hotel.landmark,
      lat: hotel.lat,
      lng: hotel.lng,
      photo_urls: hotel.photos.map(deps.assetUrl),
      score: scores.score,
      reviews: scores.reviews,
      badge: hotel.badge,
      themes: hotel.themes,
      amenities: hotel.amenities,
      free_cancellation: rates.some((r) => r.refundable),
      breakfast: rates.some((r) => r.board !== "room_only") || hotel.amenities.includes("breakfast"),
      pay_at_hotel: deps.settings.payAtHotel && hotel.payAtHotel && rates.some((r) => r.payAtHotel),
      member_price: deps.settings.memberOffPercent > 0,
      from_nightly_formatted: nightly === null ? null : money(deps, nightly),
      price: best ? priceJson(deps, best, member) : null,
      saved: saved.has(hotel.id),
    },
    bestCents: best?.totalCents ?? null,
    score: scores.score,
    available: !ask.checkIn || best !== null,
  };
}

export interface HotelFilters {
  city: string | null;
  theme: string | null;
  freeCancellation: boolean;
  payAtHotel: boolean;
  minScore: number | null;
  amenities: string[];
  sort: "recommended" | "price" | "score" | "stars";
}

export const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

export async function searchHotels(deps: TravelDeps, ask: StayAsk, filters: HotelFilters, member: boolean, saved: ReadonlySet<number>) {
  const [hotels, rooms, reviews] = await Promise.all([deps.hotels.hotels(), deps.hotels.rooms(), deps.store.listTravelReviews(deps.app.id)]);
  const shown = hotels.filter(
    (h) =>
      h.active &&
      (!filters.city || same(h.city, filters.city) || same(h.country, filters.city) || same(h.area, filters.city)) &&
      (!filters.theme || h.themes.some((t) => same(t, filters.theme))) &&
      filters.amenities.every((a) => (h.amenities as string[]).includes(a)),
  );
  const cards: (Awaited<ReturnType<typeof hotelCard>> & { hotel: TravelHotel })[] = [];
  for (const hotel of shown) {
    const c = await hotelCard(deps, hotel, rooms, reviews, ask, member, saved);
    if (!c.available) continue;
    if (filters.freeCancellation && !c.card.free_cancellation) continue;
    if (filters.payAtHotel && !c.card.pay_at_hotel) continue;
    if (filters.minScore !== null && (c.score ?? 0) < filters.minScore) continue;
    cards.push({ ...c, hotel });
  }
  const priceOf = (c: (typeof cards)[number]) => c.bestCents ?? Number.MAX_SAFE_INTEGER;
  cards.sort((a, b) => {
    if (filters.sort === "price") return priceOf(a) - priceOf(b);
    if (filters.sort === "score") return (b.score ?? 0) - (a.score ?? 0);
    if (filters.sort === "stars") return b.hotel.stars - a.hotel.stars;
    return Number(b.hotel.featured) - Number(a.hotel.featured) || (b.score ?? 0) - (a.score ?? 0) || a.hotel.position - b.hotel.position;
  });
  return { items: cards.map((c) => c.card), total: cards.length, nights: ask.checkIn && ask.checkOut ? daysBetween(ask.checkIn, ask.checkOut) : null };
}

export async function hotelCards(deps: TravelDeps, ids: readonly number[], ask: StayAsk, member: boolean, saved: ReadonlySet<number>) {
  const [hotels, rooms, reviews] = await Promise.all([deps.hotels.hotels(), deps.hotels.rooms(), deps.store.listTravelReviews(deps.app.id)]);
  const out = [];
  for (const id of ids) {
    const hotel = hotels.find((h) => h.id === id && h.active);
    if (hotel) out.push((await hotelCard(deps, hotel, rooms, reviews, ask, member, saved)).card);
  }
  return out;
}

/** A hotel's page: everything about it and its rooms with each rate's price. */
export async function hotelJson(deps: TravelDeps, hotel: TravelHotel, ask: StayAsk, member: boolean, saved: ReadonlySet<number>) {
  const [rooms, reviews] = await Promise.all([deps.hotels.rooms(hotel.id), deps.store.listTravelReviews(deps.app.id, hotel.id)]);
  const card = (await hotelCard(deps, hotel, rooms, reviews, ask, member, saved)).card;
  const scores = scoresOf(reviews);
  const shown = reviews.filter((r) => !r.hidden);
  const quote = shown.filter((r) => r.text && r.score >= 8).sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  const roomsJson = [];
  for (const room of rooms.filter((r) => r.active)) {
    const priced = await pricedRoom(deps, hotel, room, ask, member);
    const dated = Boolean(ask.checkIn && ask.checkOut);
    const available = !dated || (priced.fits && priced.free >= ask.rooms && priced.prices.size > 0);
    roomsJson.push({
      id: room.id,
      name: room.name,
      description: room.description,
      photo_urls: room.photos.map(deps.assetUrl),
      size_m2: room.sizeM2,
      beds: room.beds,
      sleeps: room.sleeps,
      features: room.features,
      available,
      left: dated && available && priced.free <= 3 ? priced.free : null,
      rates: room.rates.map((rate) => {
        const p = priced.prices.get(rate.id) ?? null;
        const until = dated ? freeCancelUntil(rate, ask.checkIn!) : null;
        return {
          id: rate.id,
          name: rate.name,
          board: rate.board,
          refundable: rate.refundable && (!until || until >= today(deps.now, deps.settings.timeZone)),
          free_cancel_until: until && until >= today(deps.now, deps.settings.timeZone) ? until : null,
          pay_now: deps.settings.payNow,
          pay_at_hotel: deps.settings.payAtHotel && hotel.payAtHotel && rate.payAtHotel,
          popular: rate.popular,
          price: p && available ? priceJson(deps, p, member) : null,
        };
      }),
    });
  }
  return {
    ...card,
    description: hotel.description,
    address: hotel.address,
    phone: hotel.phone,
    check_in_time: hotel.checkInTime,
    check_out_time: hotel.checkOutTime,
    policies: hotel.policies,
    scores: { staff: scores.staff, clean: scores.clean, location: scores.location, value: scores.value },
    quote: quote ? reviewJson(quote) : null,
    reviews_list: shown.slice(0, 10).map(reviewJson),
    nights: ask.checkIn && ask.checkOut ? daysBetween(ask.checkIn, ask.checkOut) : null,
    rooms: roomsJson,
  };
}

// Flights

export function legJson(flight: TravelFlight) {
  const departDay = flight.departs.slice(0, 10);
  const arriveDay = flight.arrives.slice(0, 10);
  return {
    flight_id: flight.id,
    number: flight.number,
    carrier: flight.carrier,
    from: flight.from,
    to: flight.to,
    departs: flight.departs,
    arrives: flight.arrives,
    days_later: Math.max(0, daysBetween(departDay, arriveDay)),
    minutes: flight.minutes,
    stops: flight.stops,
    via: flight.via,
    aircraft: flight.aircraft,
    amenities: flight.amenities,
    status: flight.status,
    status_note: flight.statusNote,
    gate: flight.gate,
    boards_at: flight.boardsAt,
    delayed_departs: flight.delayedDeparts,
    has_seat_map: flight.seatMap !== null,
  };
}

/** Whether a flight can still be sold: active, not cancelled, not leaving within 2 hours (its local time, in the company's time zone). */
export function onSale(flight: TravelFlight, now: Date, zone: string): boolean {
  return flight.active && flight.status !== "cancelled" && flight.status !== "departed" && flight.status !== "landed" && localInstant(flight.departs, zone) > now.getTime() + 2 * 3_600_000;
}

const code = (value: string) => value.trim().toUpperCase();

export interface FareOffer {
  fare: TravelFare;
  cents: number;
  left: number;
}

/** A pair's fares for one person: each fare both legs have, at both legs' prices. */
export function pairFares(outbound: TravelFlight, inbound: TravelFlight | null, holds: readonly TravelBooking[], travellers: number): FareOffer[] {
  const offers: FareOffer[] = [];
  for (const id of FARE_ORDER) {
    const out = outbound.fares.find((f) => f.id === id);
    const back = inbound ? inbound.fares.find((f) => f.id === id) : null;
    if (!out || (inbound && !back)) continue;
    const left = Math.min(fareSeatsLeft(outbound, id, holds), inbound ? fareSeatsLeft(inbound, id, holds) : Number.MAX_SAFE_INTEGER);
    offers.push({ fare: out, cents: out.cents + (back?.cents ?? 0), left: left >= travellers ? left : 0 });
  }
  return offers;
}

function fareJson(deps: TravelDeps, offer: FareOffer, travellers: number) {
  const f = offer.fare;
  return {
    id: f.id,
    name: f.name,
    price: amount(offer.cents),
    price_formatted: money(deps, offer.cents),
    available: offer.left >= travellers,
    seats_left: offer.left >= travellers && offer.left <= 9 ? offer.left : null,
    cabin_kg: f.cabinKg,
    bags: f.bags,
    bag_kg: f.bagKg,
    change: { allowed: f.changeable, fee_formatted: f.changeable && f.changeFeeCents > 0 ? money(deps, f.changeFeeCents) : null },
    refund: { allowed: f.refundable, fee_formatted: f.refundable && f.refundFeeCents > 0 ? money(deps, f.refundFeeCents) : null },
    seat: f.seat,
    priority: f.priority,
  };
}

export interface FlightAsk {
  from: string;
  to: string;
  depart: string;
  back: string | null;
  adults: number;
  direct: boolean;
}

export function readFlightAsk(query: URLSearchParams, now: Date, zone: string): FlightAsk | Refusal {
  const from = query.get("from") ?? "";
  const to = query.get("to") ?? "";
  const depart = query.get("depart");
  const back = query.get("return");
  const adults = query.get("adults") ? Number(query.get("adults")) : 1;
  if (!/^[A-Za-z]{3}$/.test(from) || !/^[A-Za-z]{3}$/.test(to)) return bad("Choose where you fly from and to.");
  if (!isDate(depart)) return bad("Choose the day you fly.");
  if (back !== null && (!isDate(back) || back < depart)) return bad("The flight back can't be before the flight out.");
  if (depart < today(now, zone)) return bad("That day has passed.");
  if (!Number.isInteger(adults) || adults < 1 || adults > 9) return bad("Choose from 1 to 9 travellers.");
  return { from: code(from), to: code(to), depart, back, adults, direct: query.get("direct") === "true" };
}

function routeFlights(all: readonly TravelFlight[], from: string, to: string, day: string | null, now: Date, zone: string, direct: boolean): TravelFlight[] {
  return all.filter((f) => code(f.from.code) === from && code(f.to.code) === to && (!day || f.departs.slice(0, 10) === day) && onSale(f, now, zone) && (!direct || f.stops === 0));
}

/** The pairs on a route for the days asked, each with its cheapest available fare for one person. */
async function pairsFor(deps: TravelDeps, all: readonly TravelFlight[], ask: FlightAsk, known?: readonly TravelBooking[]) {
  const outs = routeFlights(all, ask.from, ask.to, ask.depart, deps.now, deps.settings.timeZone, ask.direct);
  const backs = ask.back ? routeFlights(all, ask.to, ask.from, ask.back, deps.now, deps.settings.timeZone, ask.direct) : [];
  const holds = known ?? (await deps.flights.holds([...outs, ...backs].map((f) => f.id), deps.now));
  const pairs: { outbound: TravelFlight; inbound: TravelFlight | null; offers: FareOffer[]; cheapest: number | null; minutes: number }[] = [];
  for (const outbound of outs) {
    const inbounds = ask.back ? backs.filter((b) => wallTime(b.departs) > wallTime(outbound.arrives) + 60 * 60_000) : [null];
    for (const inbound of inbounds) {
      const offers = pairFares(outbound, inbound, holds, ask.adults);
      const open = offers.filter((o) => o.left >= ask.adults);
      pairs.push({ outbound, inbound, offers, cheapest: open.length ? Math.min(...open.map((o) => o.cents)) : null, minutes: outbound.minutes + (inbound?.minutes ?? 0) });
    }
  }
  return pairs.slice(0, 60);
}

/** The cheapest available fare for one person on a route, leaving on `day` (and back `nights` later); null when none. */
export async function cheapestOn(
  deps: TravelDeps,
  all: readonly TravelFlight[],
  from: string,
  to: string,
  day: string,
  nights: number | null,
  adults = 1,
  holds?: readonly TravelBooking[],
): Promise<{ cents: number; left: number } | null> {
  const pairs = await pairsFor(deps, all, { from, to, depart: day, back: nights ? addDays(day, nights) : null, adults, direct: false }, holds);
  let best: { cents: number; left: number } | null = null;
  for (const p of pairs) for (const o of p.offers) if (o.left >= adults && (!best || o.cents < best.cents)) best = { cents: o.cents, left: o.left };
  return best;
}

/** The bookings holding seats on any of the flights on sale: read once for a whole month or a route's weeks. */
export async function allHolds(deps: Pick<TravelDeps, "flights" | "now" | "settings">, all: readonly TravelFlight[]): Promise<TravelBooking[]> {
  const ids = all.filter((f) => onSale(f, deps.now, deps.settings.timeZone)).map((f) => f.id);
  return ids.length ? deps.flights.holds(ids, deps.now) : [];
}

/** The days ahead a route flies, within `days`. */
function routeDays(all: readonly TravelFlight[], from: string, to: string, now: Date, zone: string, days: number): string[] {
  const first = today(now, zone);
  const last = addDays(first, days);
  return [...new Set(all.filter((f) => code(f.from.code) === from && code(f.to.code) === to && onSale(f, now, zone)).map((f) => f.departs.slice(0, 10)))].filter((d) => d >= first && d <= last).sort();
}

export async function searchFlights(deps: TravelDeps, ask: FlightAsk) {
  const all = await deps.flights.flights();
  const pairs = (await pairsFor(deps, all, ask)).filter((p) => p.offers.length > 0);
  const open = pairs.filter((p) => p.cheapest !== null);
  const cheapest = open.length ? Math.min(...open.map((p) => p.cheapest!)) : null;
  const fastest = pairs.length ? Math.min(...pairs.map((p) => p.minutes)) : null;
  const maxPrice = open.length ? Math.max(...open.map((p) => p.cheapest!)) : 0;
  const maxMinutes = pairs.length ? Math.max(...pairs.map((p) => p.minutes)) : 0;
  // Price and time together, each between its lowest and highest.
  const score = (p: (typeof pairs)[number]) => {
    if (p.cheapest === null) return Number.MAX_SAFE_INTEGER;
    const price = maxPrice > cheapest! ? (p.cheapest - cheapest!) / (maxPrice - cheapest!) : 0;
    const time = maxMinutes > fastest! ? (p.minutes - fastest!) / (maxMinutes - fastest!) : 0;
    return price * 0.7 + time * 0.3;
  };
  pairs.sort((a, b) => score(a) - score(b) || a.outbound.departs.localeCompare(b.outbound.departs));
  const best = pairs.find((p) => p.cheapest !== null) ?? null;
  const items = pairs.map((p) => {
    const tags: ("best" | "cheapest" | "fastest")[] = [];
    if (p === best) tags.push("best");
    if (p.cheapest !== null && p.cheapest === cheapest) tags.push("cheapest");
    if (p.minutes === fastest) tags.push("fastest");
    return {
      id: p.inbound ? `${p.outbound.id}-${p.inbound.id}` : String(p.outbound.id),
      outbound: legJson(p.outbound),
      inbound: p.inbound ? legJson(p.inbound) : null,
      fares: p.offers.map((o) => fareJson(deps, o, ask.adults)),
      from_price: amount(p.cheapest ?? Math.min(...p.offers.map((o) => o.cents))),
      from_price_formatted: money(deps, p.cheapest ?? Math.min(...p.offers.map((o) => o.cents))),
      minutes: p.minutes,
      tags,
    };
  });
  // How today's cheapest compares with the route's next eight weeks.
  let level = null;
  if (cheapest !== null) {
    const nights = ask.back ? Math.max(1, daysBetween(ask.depart, ask.back)) : null;
    const prices: number[] = [];
    const holds = await allHolds(deps, all);
    for (const day of routeDays(all, ask.from, ask.to, deps.now, deps.settings.timeZone, 56).slice(0, 40)) {
      const c = await cheapestOn(deps, all, ask.from, ask.to, day, nights, ask.adults, holds);
      if (c) prices.push(c.cents);
    }
    if (prices.length >= 3) {
      const sorted = [...prices].sort((a, b) => a - b);
      const lo = percentile(sorted, 0.25);
      const hi = percentile(sorted, 0.75);
      const min = sorted[0]!;
      const max = sorted[sorted.length - 1]!;
      level = {
        level: levelOf(cheapest, prices),
        position: max > min ? Math.min(1, Math.max(0, (cheapest - min) / (max - min))) : 0.5,
        usual_from_formatted: money(deps, lo),
        usual_to_formatted: money(deps, hi),
      };
    }
  }
  return {
    items,
    best_formatted: best?.cheapest != null ? money(deps, best.cheapest) : null,
    cheapest_formatted: cheapest === null ? null : money(deps, cheapest),
    fastest_minutes: fastest,
    price_level: level,
  };
}

export async function flightCalendar(deps: TravelDeps, from: string, to: string, month: string, nights: number | null, depart: string | null, adults: number) {
  const all = await deps.flights.flights();
  const holds = await allHolds(deps, all);
  const first = `${month}-01`;
  const days: { date: string; cents: number | null }[] = [];
  for (let d = first; d.slice(0, 7) === month; d = addDays(d, 1)) {
    const c = d < today(deps.now, deps.settings.timeZone) ? null : await cheapestOn(deps, all, code(from), code(to), d, nights, adults, holds);
    days.push({ date: d, cents: c?.cents ?? null });
  }
  const prices = days.flatMap((d) => (d.cents === null ? [] : [d.cents]));
  let tip = null;
  if (depart && isDate(depart)) {
    const picked = days.find((d) => d.date === depart)?.cents ?? (await cheapestOn(deps, all, code(from), code(to), depart, nights, adults, holds))?.cents ?? null;
    if (picked !== null) {
      const near = days.filter((d) => d.cents !== null && d.date !== depart && Math.abs(daysBetween(depart, d.date)) <= 3).sort((a, b) => a.cents! - b.cents!)[0];
      if (near && near.cents! < picked) tip = { date: near.date, saving_formatted: money(deps, (picked - near.cents!) * adults) };
    }
  }
  return {
    month,
    days: days.map((d) => ({ date: d.date, price: d.cents === null ? null : amount(d.cents), price_formatted: d.cents === null ? null : money(deps, d.cents), level: d.cents === null ? null : levelOf(d.cents, prices) })),
    tip,
  };
}

export async function seatMapJson(deps: TravelDeps, flight: TravelFlight) {
  const map = flight.seatMap!;
  const taken = takenSeats(flight, await deps.flights.holds([flight.id], deps.now));
  const columns: string[] = [];
  for (const ch of map.layout) {
    if (ch === " ") columns.push("");
    else columns.push(ch);
  }
  return {
    flight_id: flight.id,
    columns,
    rows: seatIds(map).map((r) => ({ number: r.row, extra_legroom: map.extraRows.includes(r.row), seats: r.seats.map((id) => ({ id, taken: taken.has(id) })) })),
    seat_price_formatted: map.seatCents > 0 ? money(deps, map.seatCents) : null,
    extra_price_formatted: map.extraRows.length ? money(deps, map.extraCents) : null,
  };
}

// Places and Explore

export async function places(deps: TravelDeps) {
  const [hotels, flights] = await Promise.all([deps.settings.hotels ? deps.hotels.hotels() : Promise.resolve([]), deps.settings.flights ? deps.flights.flights() : Promise.resolve([])]);
  const live = flights.filter((f) => onSale(f, deps.now, deps.settings.timeZone));
  const airports = new Map<string, { code: string; city: string; airport: string | null }>();
  for (const f of live) for (const p of [f.from, f.to]) if (!airports.has(code(p.code))) airports.set(code(p.code), { code: code(p.code), city: p.city, airport: p.airport });
  const cities = new Map<string, { city: string; country: string | null; hotels: number; code: string | null }>();
  for (const h of hotels.filter((x) => x.active)) {
    const key = h.city.trim().toLowerCase();
    const had = cities.get(key);
    if (had) had.hotels++;
    else cities.set(key, { city: h.city, country: h.country, hotels: 1, code: [...airports.values()].find((a) => same(a.city, h.city))?.code ?? null });
  }
  return { cities: [...cities.values()], airports: [...airports.values()] };
}

/** Where trips start from: the asked airport, else the one most of the flights leave. */
function homeAirport(flights: readonly TravelFlight[], asked: string | null) {
  const counts = new Map<string, { n: number; code: string; city: string; airport: string | null }>();
  for (const f of flights) {
    const c = code(f.from.code);
    const had = counts.get(c) ?? { n: 0, code: c, city: f.from.city, airport: f.from.airport };
    had.n++;
    counts.set(c, had);
  }
  if (asked && counts.has(code(asked))) {
    const a = counts.get(code(asked))!;
    return { code: a.code, city: a.city, airport: a.airport };
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n)[0];
  return top ? { code: top.code, city: top.city, airport: top.airport } : null;
}

export async function explore(deps: TravelDeps, from: string | null, nights: number, member: boolean, saved: ReadonlySet<number>) {
  const [hotels, rooms, flights] = await Promise.all([
    deps.settings.hotels ? deps.hotels.hotels() : Promise.resolve([]),
    deps.settings.hotels ? deps.hotels.rooms() : Promise.resolve([]),
    deps.settings.flights ? deps.flights.flights() : Promise.resolve([]),
  ]);
  const live = flights.filter((f) => onSale(f, deps.now, deps.settings.timeZone));
  const home = homeAirport(live, from);
  const holds = await allHolds(deps, live);
  const active = hotels.filter((h) => h.active);
  const destinations = [];
  // Cities with hotels; with flights only, the airports flown to.
  const cityNames = active.length ? [...new Set(active.map((h) => h.city))] : [...new Set(live.filter((f) => !home || code(f.from.code) === home.code).map((f) => f.to.city))];
  for (const city of cityNames.slice(0, 12)) {
    const there = active.filter((h) => same(h.city, city));
    const cover = there.find((h) => h.featured && h.photos.length) ?? there.find((h) => h.photos.length) ?? null;
    const nightly = fromNightly(rooms.filter((r) => there.some((h) => h.id === r.hotelId)));
    const airport = live.find((f) => same(f.to.city, city) && (!home || code(f.from.code) === home.code))?.to ?? null;
    let trip: number | null = null;
    if (airport && home) {
      let fare: number | null = null;
      for (const day of routeDays(live, home.code, code(airport.code), deps.now, deps.settings.timeZone, 120).slice(0, 30)) {
        const c = await cheapestOn(deps, live, home.code, code(airport.code), day, nights, 1, holds);
        if (c && (fare === null || c.cents < fare)) fare = c.cents;
      }
      if (fare !== null) {
        const taxBp = there.length ? Math.min(...there.map((h) => h.taxBp)) : 0;
        const stay = nightly === null ? 0 : stayPrice(Array.from({ length: nights }, () => ({ cents: nightly })), 1, { taxBp }, { member, bundle: true }, deps.settings).totalCents;
        trip = fare * 2 + stay;
      }
    }
    destinations.push({
      city,
      country: there[0]?.country ?? null,
      code: airport ? code(airport.code) : null,
      photo_url: cover ? deps.assetUrl(cover.photos[0]!) : null,
      hotels: there.length,
      stay_from_formatted: nightly === null ? null : money(deps, nightly),
      trip_from: trip === null ? null : amount(trip),
      trip_from_formatted: trip === null ? null : money(deps, trip),
    });
  }
  const featured = await hotelCards(
    deps,
    active.filter((h) => h.featured).map((h) => h.id),
    { checkIn: null, checkOut: null, guests: 2, rooms: 1 },
    member,
    saved,
  );
  return { from: home, nights, destinations, featured };
}

/** The fares a flight sells, as the dashboard and the quote read them. */
export function fareOf(flight: TravelFlight, id: TravelFareId): TravelFare | null {
  return flight.fares.find((f) => f.id === id) ?? null;
}
