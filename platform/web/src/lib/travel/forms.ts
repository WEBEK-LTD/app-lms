import { isTimeZone } from "../analytics/zone";
import { CATALOG_CURRENCIES, centsToDecimal, parsePrice } from "../catalog/money";
import type { CatalogCurrency, TravelAmenity, TravelBoard, TravelFare, TravelFareId, TravelFlight, TravelFlightAmenity, TravelFlightStatus, TravelHotel, TravelHotelKind, TravelRate, TravelRoom, TravelSeatMap, TravelSettings } from "../data/types";
import { TRAVEL_AMENITIES, TRAVEL_BOARDS, TRAVEL_FARE_IDS, TRAVEL_FLIGHT_AMENITIES, TRAVEL_FLIGHT_STATUSES, TRAVEL_HOTEL_KINDS } from "../data/types";
import { freeFont } from "../fonts/catalog";
import { daysBetween, isDate, seatExists } from "./pricing";
import { TRAVEL_LIMITS } from "./settings";

/**
 * 126 The dashboard's travel forms, checked: a hotel, a room with its rates
 * and calendar, a flight with its fares and seat map, a flight's status, the
 * company's travel settings. Messages are English; the dashboard translates
 * them (`travel.known`). Every amount is the company's.
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();
const on = (form: Record<string, string>, name: string) => form[name] === "on";
const MAX_CENTS = 1_000_000_00;

function money(form: Record<string, string>, name: string, errors: Record<string, string>, required = false): number {
  const text = str(form, name);
  if (!text) {
    if (required) errors[name] = "Enter a price, like 150 or 150.50.";
    return 0;
  }
  const cents = parsePrice(text);
  if (cents === null || cents > MAX_CENTS) {
    errors[name] = "Enter a price, like 150 or 150.50.";
    return 0;
  }
  return cents;
}

function whole(form: Record<string, string>, name: string, min: number, max: number, errors: Record<string, string>, message: string, fallback = min): number {
  const text = str(form, name);
  if (!text) return fallback;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) {
    errors[name] = message;
    return fallback;
  }
  return n;
}

function text(form: Record<string, string>, name: string, max: number, errors: Record<string, string>): string | null {
  const value = str(form, name);
  if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
  return value || null;
}

const lines = (value: string) =>
  value
    .split(/[\n,]/)
    .map((l) => l.trim())
    .filter(Boolean);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const CODE = /^[A-Za-z]{3}$/;
const LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Hotels

export interface HotelForm {
  name: string;
  kind: TravelHotelKind;
  stars: number;
  city: string;
  country: string | null;
  area: string | null;
  landmark: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  amenities: TravelAmenity[];
  themes: string[];
  checkInTime: string;
  checkOutTime: string;
  taxBp: number;
  payAtHotel: boolean;
  policies: string | null;
  phone: string | null;
  badge: string | null;
  featured: boolean;
  active: boolean;
}

export function parseHotelForm(form: Record<string, string>): Parsed<HotelForm> {
  const errors: Record<string, string> = {};
  const name = str(form, "name");
  if (!name) errors.name = "Name the hotel.";
  else if (name.length > 120) errors.name = "Keep the name under 120 characters.";
  const city = str(form, "city");
  if (!city) errors.city = "Enter the city, as people search it.";
  else if (city.length > 80) errors.city = "Keep it under 80 characters.";
  const kind = TRAVEL_HOTEL_KINDS.find((k) => k === str(form, "kind")) ?? "hotel";
  const stars = whole(form, "stars", 0, 5, errors, "Choose from 0 to 5 stars.", 0);
  const latText = str(form, "lat");
  const lngText = str(form, "lng");
  let lat: number | null = null;
  let lng: number | null = null;
  if (latText || lngText) {
    lat = Number(latText);
    lng = Number(lngText);
    if (!(Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180)) {
      errors.lat = "Enter the place on the map as a latitude and a longitude, like 25.70 and 32.64.";
      lat = null;
      lng = null;
    }
  }
  const checkInTime = str(form, "checkInTime") || "15:00";
  const checkOutTime = str(form, "checkOutTime") || "12:00";
  if (!TIME.test(checkInTime)) errors.checkInTime = "Enter a time, like 15:00.";
  if (!TIME.test(checkOutTime)) errors.checkOutTime = "Enter a time, like 12:00.";
  const taxText = str(form, "tax");
  const tax = taxText ? Number(taxText.replace(",", ".")) : 0;
  if (!(Number.isFinite(tax) && tax >= 0 && tax <= 60)) errors.tax = "Enter the taxes and fees as a percentage, from 0 to 60.";
  const themes = lines(str(form, "themes")).slice(0, 6);
  if (themes.some((t) => t.length > 30)) errors.themes = "Keep each kind of stay under 30 characters.";
  const value: HotelForm = {
    name,
    kind,
    stars,
    city,
    country: text(form, "country", 80, errors),
    area: text(form, "area", 80, errors),
    landmark: text(form, "landmark", 120, errors),
    address: text(form, "address", 200, errors),
    lat,
    lng,
    description: text(form, "description", 2000, errors),
    amenities: TRAVEL_AMENITIES.filter((a) => on(form, `amenity_${a}`)),
    themes,
    checkInTime,
    checkOutTime,
    taxBp: Math.round((Number.isFinite(tax) ? tax : 0) * 100),
    payAtHotel: on(form, "payAtHotel"),
    policies: text(form, "policies", 1000, errors),
    phone: text(form, "phone", 30, errors),
    badge: text(form, "badge", 30, errors),
    featured: on(form, "featured"),
    active: on(form, "active"),
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function hotelFormValues(hotel: TravelHotel | null): Record<string, string> {
  const v: Record<string, string> = {
    name: hotel?.name ?? "",
    kind: hotel?.kind ?? "hotel",
    stars: String(hotel?.stars ?? 4),
    city: hotel?.city ?? "",
    country: hotel?.country ?? "",
    area: hotel?.area ?? "",
    landmark: hotel?.landmark ?? "",
    address: hotel?.address ?? "",
    lat: hotel?.lat === null || hotel?.lat === undefined ? "" : String(hotel.lat),
    lng: hotel?.lng === null || hotel?.lng === undefined ? "" : String(hotel.lng),
    description: hotel?.description ?? "",
    themes: (hotel?.themes ?? []).join(", "),
    checkInTime: hotel?.checkInTime ?? "15:00",
    checkOutTime: hotel?.checkOutTime ?? "12:00",
    tax: hotel ? String(hotel.taxBp / 100) : "",
    payAtHotel: hotel ? (hotel.payAtHotel ? "on" : "") : "on",
    policies: hotel?.policies ?? "",
    phone: hotel?.phone ?? "",
    badge: hotel?.badge ?? "",
    featured: hotel?.featured ? "on" : "",
    active: hotel ? (hotel.active ? "on" : "") : "on",
  };
  for (const a of hotel?.amenities ?? []) v[`amenity_${a}`] = "on";
  return v;
}

// Rooms

export interface RoomForm {
  name: string;
  description: string | null;
  sizeM2: number | null;
  beds: string | null;
  sleeps: number;
  features: string[];
  units: number;
  nightlyCents: number;
  prices: Record<string, number>;
  openFrom: string | null;
  openUntil: string | null;
  closed: string[];
  minNights: number;
  rates: TravelRate[];
  active: boolean;
}

/** The rates' rows the form offers. */
export const RATE_ROWS = TRAVEL_LIMITS.ratesPerRoom;

export function parseRoomForm(form: Record<string, string>): Parsed<RoomForm> {
  const errors: Record<string, string> = {};
  const name = str(form, "name");
  if (!name) errors.name = "Name the room, like Deluxe King.";
  else if (name.length > 100) errors.name = "Keep the name under 100 characters.";
  const size = str(form, "sizeM2");
  const sizeM2 = size ? whole(form, "sizeM2", 5, 2000, errors, "Enter the size in square metres.") : null;
  const sleeps = whole(form, "sleeps", 1, 20, errors, "Enter how many it sleeps, from 1 to 20.", 2);
  const units = whole(form, "units", 1, 999, errors, "Enter how many rooms of this kind there are.", 1);
  const nightlyCents = money(form, "nightly", errors, true);
  const minNights = whole(form, "minNights", 1, 30, errors, "Enter from 1 to 30 nights.", 1);
  const openFrom = str(form, "openFrom") || null;
  const openUntil = str(form, "openUntil") || null;
  if (openFrom && !isDate(openFrom)) errors.openFrom = "Choose a day.";
  if (openUntil && !isDate(openUntil)) errors.openUntil = "Choose a day.";
  if (openFrom && openUntil && isDate(openFrom) && isDate(openUntil) && openUntil < openFrom) errors.openUntil = "The last open day can't be before the first.";
  const closed = lines(str(form, "closed"));
  if (closed.some((d) => !isDate(d))) errors.closed = "Write each closed day as 2026-12-24, one a line.";
  // Prices of some nights: "2026-12-24 = 220" a line.
  const prices: Record<string, number> = {};
  for (const line of str(form, "prices").split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = /^(\d{4}-\d{2}-\d{2})(?:\s*(?:…|to|-|–)\s*(\d{4}-\d{2}-\d{2}))?\s*[=:]\s*(.+)$/.exec(line);
    const cents = m ? parsePrice(m[3]!) : null;
    if (!m || !isDate(m[1]) || (m[2] && !isDate(m[2])) || cents === null || cents === 0) {
      errors.prices = "Write each night's price as 2026-12-24 = 220, or a range as 2026-12-20 to 2026-12-31 = 220.";
      break;
    }
    const last = m[2] ?? m[1]!;
    if (daysBetween(m[1]!, last) > TRAVEL_LIMITS.priceDays) {
      errors.prices = "A range can be up to two years.";
      break;
    }
    for (let d = m[1]!, n = 0; d <= last && n <= TRAVEL_LIMITS.priceDays; n++) {
      prices[d] = cents;
      const next = new Date(`${d}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      d = next.toISOString().slice(0, 10);
    }
  }
  const rates: TravelRate[] = [];
  for (let i = 0; i < RATE_ROWS; i++) {
    const rateName = str(form, `rate${i}_name`);
    if (!rateName) continue;
    if (rateName.length > 60) errors[`rate${i}_name`] = "Keep the name under 60 characters.";
    const board: TravelBoard = TRAVEL_BOARDS.find((b) => b === str(form, `rate${i}_board`)) ?? "room_only";
    const refundable = on(form, `rate${i}_refundable`);
    rates.push({
      id: str(form, `rate${i}_id`) || `r${i + 1}`,
      name: rateName,
      board,
      refundable,
      freeCancelDays: refundable ? whole(form, `rate${i}_days`, 0, 60, errors, "Enter from 0 to 60 days.", 1) : 0,
      extraCents: money(form, `rate${i}_extra`, errors),
      payAtHotel: on(form, `rate${i}_payAtHotel`),
      popular: on(form, `rate${i}_popular`),
    });
  }
  if (!rates.length) errors.rate0_name = "Add at least one rate, like Room only.";
  if (new Set(rates.map((r) => r.id)).size !== rates.length) rates.forEach((r, i) => (r.id = `r${i + 1}`));
  const value: RoomForm = {
    name,
    description: text(form, "description", 600, errors),
    sizeM2,
    beds: text(form, "beds", 60, errors),
    sleeps,
    features: lines(str(form, "features")).slice(0, 12),
    units,
    nightlyCents,
    prices,
    openFrom,
    openUntil,
    closed: [...new Set(closed)].sort(),
    minNights,
    rates,
    active: on(form, "active"),
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** Each night's price as lines, ranges of the same price kept together. */
export function priceLines(prices: Record<string, number>): string {
  const days = Object.keys(prices).sort();
  const out: string[] = [];
  let start: string | null = null;
  let prev: string | null = null;
  const flush = () => {
    if (!start || !prev) return;
    out.push(start === prev ? `${start} = ${centsToDecimal(prices[start]!)}` : `${start} to ${prev} = ${centsToDecimal(prices[start]!)}`);
  };
  for (const d of days) {
    if (start && prev && daysBetween(prev, d) === 1 && prices[d] === prices[start]) {
      prev = d;
      continue;
    }
    flush();
    start = d;
    prev = d;
  }
  flush();
  return out.join("\n");
}

export function roomFormValues(room: TravelRoom | null): Record<string, string> {
  const rates = room?.rates ?? [
    { id: "r1", name: "Room only", board: "room_only" as const, refundable: false, freeCancelDays: 0, extraCents: 0, payAtHotel: false, popular: false },
    { id: "r2", name: "Breakfast included", board: "breakfast" as const, refundable: true, freeCancelDays: 2, extraCents: 0, payAtHotel: true, popular: true },
  ];
  const v: Record<string, string> = {
    name: room?.name ?? "",
    description: room?.description ?? "",
    sizeM2: room?.sizeM2 ? String(room.sizeM2) : "",
    beds: room?.beds ?? "",
    sleeps: String(room?.sleeps ?? 2),
    features: (room?.features ?? []).join(", "),
    units: String(room?.units ?? 1),
    nightly: room?.nightlyCents ? centsToDecimal(room.nightlyCents) : "",
    minNights: String(room?.minNights ?? 1),
    openFrom: room?.openFrom ?? "",
    openUntil: room?.openUntil ?? "",
    closed: (room?.closed ?? []).join("\n"),
    prices: priceLines(room?.prices ?? {}),
    active: room ? (room.active ? "on" : "") : "on",
  };
  rates.forEach((r, i) => {
    v[`rate${i}_id`] = r.id;
    v[`rate${i}_name`] = r.name;
    v[`rate${i}_board`] = r.board;
    v[`rate${i}_refundable`] = r.refundable ? "on" : "";
    v[`rate${i}_days`] = String(r.freeCancelDays);
    v[`rate${i}_extra`] = r.extraCents ? centsToDecimal(r.extraCents) : "";
    v[`rate${i}_payAtHotel`] = r.payAtHotel ? "on" : "";
    v[`rate${i}_popular`] = r.popular ? "on" : "";
  });
  return v;
}

// Flights

export interface FlightForm {
  number: string;
  carrier: { name: string; code: string; color: string };
  from: { code: string; city: string; airport: string | null; terminal: string | null };
  to: { code: string; city: string; airport: string | null; terminal: string | null };
  departs: string;
  arrives: string;
  minutes: number;
  stops: number;
  via: string | null;
  aircraft: string | null;
  amenities: TravelFlightAmenity[];
  fares: TravelFare[];
  seatMap: TravelSeatMap | null;
  checkInOpen: boolean;
  active: boolean;
  /** Repeat it this many more weeks, the same day and time. */
  repeatWeeks: number;
}

/** Minutes between two local times, given the arrival's difference in time zone. */
function minutesBetween(departs: string, arrives: string, shiftMinutes: number): number {
  return Math.round((Date.parse(`${arrives}:00Z`) - Date.parse(`${departs}:00Z`)) / 60_000) - shiftMinutes;
}

export function parseFlightForm(form: Record<string, string>): Parsed<FlightForm> {
  const errors: Record<string, string> = {};
  const number = str(form, "number").toUpperCase();
  if (!number) errors.number = "Enter the flight number, like SF 691.";
  else if (number.length > 12) errors.number = "Keep it under 12 characters.";
  const carrierName = str(form, "carrierName");
  if (!carrierName) errors.carrierName = "Enter the airline or charter, as travellers know it.";
  const carrierCode = str(form, "carrierCode").toUpperCase();
  if (!/^[A-Z0-9]{2,3}$/.test(carrierCode)) errors.carrierCode = "Enter its short code, 2 or 3 letters.";
  const color = str(form, "carrierColor") || "#0E1424";
  if (!HEX.test(color)) errors.carrierColor = "Choose a colour.";
  const place = (side: "from" | "to") => {
    const code = str(form, `${side}Code`).toUpperCase();
    if (!CODE.test(code)) errors[`${side}Code`] = "Enter the airport's 3-letter code, like CAI.";
    const city = str(form, `${side}City`);
    if (!city) errors[`${side}City`] = "Enter the city.";
    return { code, city, airport: text(form, `${side}Airport`, 80, errors), terminal: text(form, `${side}Terminal`, 10, errors) };
  };
  const from = place("from");
  const to = place("to");
  if (from.code && from.code === to.code) errors.toCode = "The flight lands somewhere else than it leaves.";
  const departs = str(form, "departs");
  const arrives = str(form, "arrives");
  if (!LOCAL.test(departs)) errors.departs = "Choose the day and time it leaves (local time).";
  if (!LOCAL.test(arrives)) errors.arrives = "Choose the day and time it lands (local time).";
  const shift = whole(form, "shift", -840, 840, errors, "Enter the time difference in minutes, like 60 or -120.", 0);
  const minutes = LOCAL.test(departs) && LOCAL.test(arrives) ? minutesBetween(departs, arrives, shift) : 0;
  if (LOCAL.test(departs) && LOCAL.test(arrives) && (minutes < 15 || minutes > 24 * 60)) errors.arrives = "Check the times: the flight takes from 15 minutes to 24 hours, with the time difference.";
  const stops = whole(form, "stops", 0, 3, errors, "Choose from 0 to 3 stops.", 0);
  const via = str(form, "via").toUpperCase() || null;
  if (stops > 0 && via && !/^[A-Z]{3}(,\s*[A-Z]{3})*$/.test(via)) errors.via = "Enter the airport codes it stops at, like ATH.";
  const fares: TravelFare[] = [];
  for (const id of TRAVEL_FARE_IDS) {
    if (!on(form, `fare_${id}_on`)) continue;
    const seat = str(form, `fare_${id}_seat`);
    fares.push({
      id,
      name: str(form, `fare_${id}_name`) || { light: "Light", standard: "Standard", flex: "Flex" }[id],
      cents: money(form, `fare_${id}_price`, errors, true),
      seats: whole(form, `fare_${id}_seats`, 1, 999, errors, "Enter the seats sold at this fare, from 1 to 999.", 1),
      cabinKg: whole(form, `fare_${id}_cabin`, 0, 30, errors, "Enter from 0 to 30 kg.", 7),
      bags: whole(form, `fare_${id}_bags`, 0, 4, errors, "Enter from 0 to 4 bags.", 0),
      bagKg: whole(form, `fare_${id}_bagKg`, 0, 50, errors, "Enter from 0 to 50 kg.", 23),
      changeable: on(form, `fare_${id}_change`),
      changeFeeCents: money(form, `fare_${id}_changeFee`, errors),
      refundable: on(form, `fare_${id}_refund`),
      refundFeeCents: money(form, `fare_${id}_refundFee`, errors),
      seat: seat === "fee" || seat === "any" ? seat : "standard",
      priority: on(form, `fare_${id}_priority`),
    });
  }
  if (!fares.length) errors.fare_standard_on = "Sell at least one fare.";
  let seatMap: TravelSeatMap | null = null;
  if (on(form, "seatMap")) {
    const layout = str(form, "layout").toUpperCase() || "ABC DEF";
    if (!/^[A-K]{1,4}( [A-K]{1,4}){0,2}$/.test(layout)) errors.layout = "Write the seats across, a space for each aisle, like ABC DEF.";
    const firstRow = whole(form, "firstRow", 1, 90, errors, "Enter the first row's number.", 1);
    const rows = whole(form, "rows", 1, 60, errors, "Enter from 1 to 60 rows.", 30);
    const extraRows = lines(str(form, "extraRows")).map(Number);
    if (extraRows.some((n) => !Number.isInteger(n) || n < firstRow || n >= firstRow + rows)) errors.extraRows = "Enter row numbers of this plane, like 12, 20.";
    seatMap = { firstRow, rows, layout, extraRows: extraRows.filter((n) => Number.isInteger(n)), extraCents: money(form, "extraPrice", errors), seatCents: money(form, "seatPrice", errors), blocked: [] };
    const blocked = lines(str(form, "blocked")).map((s) => s.toUpperCase());
    if (blocked.some((s) => !seatExists(seatMap!, s))) errors.blocked = "Enter seats of this plane, like 10A, 10B.";
    seatMap.blocked = [...new Set(blocked)];
  }
  const repeatWeeks = whole(form, "repeatWeeks", 0, 52, errors, "Repeat it from 0 to 52 weeks.", 0);
  const value: FlightForm = {
    number,
    carrier: { name: carrierName.slice(0, 60), code: carrierCode, color: color.toUpperCase() },
    from,
    to,
    departs,
    arrives,
    minutes,
    stops,
    via: stops > 0 ? via : null,
    aircraft: text(form, "aircraft", 60, errors),
    amenities: TRAVEL_FLIGHT_AMENITIES.filter((a) => on(form, `amenity_${a}`)),
    fares,
    seatMap,
    checkInOpen: on(form, "checkInOpen"),
    active: on(form, "active"),
    repeatWeeks,
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

const FARE_DEFAULTS: Record<TravelFareId, Partial<TravelFare>> = {
  light: { name: "Light", cabinKg: 8, bags: 0, bagKg: 0, seat: "fee" },
  standard: { name: "Standard", cabinKg: 8, bags: 1, bagKg: 23, changeable: true, refundable: true, seat: "standard" },
  flex: { name: "Flex", cabinKg: 10, bags: 2, bagKg: 23, changeable: true, refundable: true, seat: "any", priority: true },
};

export function flightFormValues(flight: TravelFlight | null): Record<string, string> {
  const v: Record<string, string> = {
    number: flight?.number ?? "",
    carrierName: flight?.carrier.name ?? "",
    carrierCode: flight?.carrier.code ?? "",
    carrierColor: flight?.carrier.color ?? "#0E1424",
    fromCode: flight?.from.code ?? "",
    fromCity: flight?.from.city ?? "",
    fromAirport: flight?.from.airport ?? "",
    fromTerminal: flight?.from.terminal ?? "",
    toCode: flight?.to.code ?? "",
    toCity: flight?.to.city ?? "",
    toAirport: flight?.to.airport ?? "",
    toTerminal: flight?.to.terminal ?? "",
    departs: flight?.departs ?? "",
    arrives: flight?.arrives ?? "",
    shift: flight ? String(Math.round((Date.parse(`${flight.arrives}:00Z`) - Date.parse(`${flight.departs}:00Z`)) / 60_000) - flight.minutes) : "0",
    stops: String(flight?.stops ?? 0),
    via: flight?.via ?? "",
    aircraft: flight?.aircraft ?? "",
    seatMap: flight ? (flight.seatMap ? "on" : "") : "",
    layout: flight?.seatMap?.layout ?? "ABC DEF",
    firstRow: String(flight?.seatMap?.firstRow ?? 1),
    rows: String(flight?.seatMap?.rows ?? 30),
    extraRows: (flight?.seatMap?.extraRows ?? []).join(", "),
    extraPrice: flight?.seatMap?.extraCents ? centsToDecimal(flight.seatMap.extraCents) : "",
    seatPrice: flight?.seatMap?.seatCents ? centsToDecimal(flight.seatMap.seatCents) : "",
    blocked: (flight?.seatMap?.blocked ?? []).join(", "),
    checkInOpen: flight?.checkInOpen ? "on" : "",
    active: flight ? (flight.active ? "on" : "") : "on",
    repeatWeeks: "0",
  };
  for (const a of flight?.amenities ?? []) v[`amenity_${a}`] = "on";
  for (const id of TRAVEL_FARE_IDS) {
    const fare = flight ? flight.fares.find((f) => f.id === id) : null;
    const d = { ...FARE_DEFAULTS[id], ...(fare ?? {}) };
    v[`fare_${id}_on`] = flight ? (fare ? "on" : "") : id === "light" ? "" : "on";
    v[`fare_${id}_name`] = d.name ?? "";
    v[`fare_${id}_price`] = fare?.cents ? centsToDecimal(fare.cents) : "";
    v[`fare_${id}_seats`] = fare ? String(fare.seats) : "";
    v[`fare_${id}_cabin`] = String(d.cabinKg ?? 8);
    v[`fare_${id}_bags`] = String(d.bags ?? 0);
    v[`fare_${id}_bagKg`] = String(d.bagKg ?? 23);
    v[`fare_${id}_change`] = d.changeable ? "on" : "";
    v[`fare_${id}_changeFee`] = d.changeFeeCents ? centsToDecimal(d.changeFeeCents) : "";
    v[`fare_${id}_refund`] = d.refundable ? "on" : "";
    v[`fare_${id}_refundFee`] = d.refundFeeCents ? centsToDecimal(d.refundFeeCents) : "";
    v[`fare_${id}_seat`] = d.seat ?? "standard";
    v[`fare_${id}_priority`] = d.priority ? "on" : "";
  }
  return v;
}

export interface FlightStatusForm {
  status: TravelFlightStatus;
  gate: string | null;
  boardsAt: string | null;
  delayedDeparts: string | null;
  statusNote: string | null;
  checkInOpen: boolean;
}

export function parseFlightStatusForm(form: Record<string, string>): Parsed<FlightStatusForm> {
  const errors: Record<string, string> = {};
  const status = TRAVEL_FLIGHT_STATUSES.find((s) => s === str(form, "status")) ?? "scheduled";
  const boardsAt = str(form, "boardsAt") || null;
  if (boardsAt && !TIME.test(boardsAt)) errors.boardsAt = "Enter a time, like 09:40.";
  const delayed = str(form, "delayedDeparts") || null;
  if (delayed && !LOCAL.test(delayed)) errors.delayedDeparts = "Choose the new day and time it leaves.";
  const value = { status, gate: text(form, "gate", 8, errors), boardsAt, delayedDeparts: status === "delayed" ? delayed : null, statusNote: text(form, "statusNote", 140, errors), checkInOpen: on(form, "checkInOpen") };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

// Settings

export type TravelSettingsForm = Omit<TravelSettings, "hotels" | "flights" | "hotelSource" | "flightSource" | "samplesAdded">;

export function parseTravelSettingsForm(form: Record<string, string>): Parsed<TravelSettingsForm> {
  const errors: Record<string, string> = {};
  const currency = (CATALOG_CURRENCIES as string[]).includes(str(form, "currency")) ? (str(form, "currency") as CatalogCurrency) : null;
  if (!currency) errors.currency = "Choose a currency.";
  const payNow = on(form, "payNow");
  const payAtHotel = on(form, "payAtHotel");
  if (!payNow && !payAtHotel) errors.payNow = "Keep at least one way to pay.";
  const memberOffPercent = whole(form, "memberOff", 0, 50, errors, "Enter from 0 to 50 percent.", 0);
  const bundleOffPercent = whole(form, "bundleOff", 0, 50, errors, "Enter from 0 to 50 percent.", 0);
  const transferCents = money(form, "transfer", errors);
  const font = str(form, "displayFont");
  if (font && !freeFont(font)) errors.displayFont = "Choose a free font by its name, like Fraunces.";
  const email = str(form, "helpEmail");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.helpEmail = "That email doesn't look right.";
  const timeZone = str(form, "timeZone");
  if (!isTimeZone(timeZone)) errors.timeZone = "Choose a time zone.";
  const value: TravelSettingsForm = {
    currency: currency ?? "USD",
    payNow,
    payAtHotel,
    memberOffPercent,
    bundleOffPercent,
    transfer: on(form, "transferOn") ? { cents: transferCents, note: text(form, "transferNote", 80, errors) } : null,
    bagCents: money(form, "bag", errors),
    mealCents: money(form, "meal", errors),
    displayFont: font || null,
    help: { phone: text(form, "helpPhone", 30, errors), email: email || null, whatsapp: text(form, "helpWhatsapp", 30, errors) },
    timeZone,
  };
  if (on(form, "transferOn") && transferCents === 0) errors.transfer = "Enter the transfer's price.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function travelSettingsFormValues(s: TravelSettings): Record<string, string> {
  return {
    currency: s.currency,
    payNow: s.payNow ? "on" : "",
    payAtHotel: s.payAtHotel ? "on" : "",
    memberOff: String(s.memberOffPercent),
    bundleOff: String(s.bundleOffPercent),
    transferOn: s.transfer ? "on" : "",
    transfer: s.transfer ? centsToDecimal(s.transfer.cents) : "",
    transferNote: s.transfer?.note ?? "",
    bag: s.bagCents ? centsToDecimal(s.bagCents) : "",
    meal: s.mealCents ? centsToDecimal(s.mealCents) : "",
    displayFont: s.displayFont ?? "",
    helpPhone: s.help.phone ?? "",
    helpEmail: s.help.email ?? "",
    helpWhatsapp: s.help.whatsapp ?? "",
    timeZone: s.timeZone,
  };
}

/** 126.10 The time zones Travel settings offers (the one saved is offered too). */
export const TRAVEL_TIMEZONES = ["Europe/Istanbul", "Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Asia/Qatar", "Asia/Kuwait", "Asia/Amman", "Asia/Beirut", "Asia/Baghdad", "Africa/Casablanca", "Africa/Tunis", "Africa/Algiers", "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Makassar"] as const;
