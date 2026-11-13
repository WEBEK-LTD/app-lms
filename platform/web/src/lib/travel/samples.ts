import type { DataStore } from "../data/store";
import type { App, TravelFare, TravelFlightInput, TravelHotelInput, TravelRate, TravelRoomInput, TravelSettings } from "../data/types";
import { addDays, today } from "./pricing";
import { DEFAULT_TRAVEL_SETTINGS, travelSettingsOf } from "./settings";

/**
 * 126 Safra's hotels, rooms and flights: the travel demo's own entries
 * (lib/demo/setup.ts) and a travel project's sample entries (110.2,
 * lib/samples). Every name is made up (the company's own hotels and its
 * charter airline, never a real hotel or airline), every price an example
 * in US dollars. The flights run on set weekdays from two days ahead for
 * twelve weeks; the demo's daily job keeps them going.
 */

/** The photos the entries name (public/travel-photos/<name>.jpg, CC0, credited in its CREDITS.md). */
export const TRAVEL_PHOTOS = ["beach", "skyline", "city", "oia", "suite", "room"] as const;
export type TravelPhoto = (typeof TRAVEL_PHOTOS)[number];

export interface TravelSampleDeps {
  store: DataStore;
  app: App;
  now: Date;
  /** The asset of a photo, saved the first time; null when it can't be. */
  photo: (name: TravelPhoto) => Promise<string | null>;
  /** 110.2 Marked as samples. */
  sample: boolean;
  /** Only the hotels (with their rooms) or only the flights; both without it. */
  only?: "hotels" | "flights";
}

export const TRAVEL_DEMO_SETTINGS: TravelSettings = {
  ...DEFAULT_TRAVEL_SETTINGS,
  currency: "USD",
  payNow: true,
  payAtHotel: true,
  memberOffPercent: 10,
  bundleOffPercent: 8,
  transfer: { cents: 48_00, note: "Driver waits with your name" },
  bagCents: 35_00,
  mealCents: 14_00,
  displayFont: "Fraunces",
};

const rate = (id: string, name: string, board: TravelRate["board"], extraCents: number, refundable: boolean, popular = false): TravelRate => ({
  id,
  name,
  board,
  refundable,
  freeCancelDays: refundable ? 3 : 0,
  extraCents,
  payAtHotel: refundable,
  popular,
});

const RATES = [rate("room", "Room only", "room_only", 0, false), rate("breakfast", "Breakfast for 2", "breakfast", 22_00, true, true), rate("half", "Breakfast and dinner", "half_board", 46_00, true)];

interface HotelSeed {
  hotel: Omit<TravelHotelInput, "appId" | "photos" | "position" | "sample" | "active"> & { photos: TravelPhoto[] };
  rooms: (Omit<TravelRoomInput, "appId" | "hotelId" | "photos" | "position" | "sample" | "active" | "prices" | "openFrom" | "openUntil" | "closed" | "rates"> & { photos: TravelPhoto[] })[];
}

export const TRAVEL_HOTELS: readonly HotelSeed[] = [
  {
    hotel: {
      name: "Safra Bay Resort",
      kind: "resort",
      stars: 5,
      city: "Bali",
      country: "Indonesia",
      area: "Seminyak",
      landmark: "On the beach, 20 minutes from the airport",
      address: "Jalan Pantai, Seminyak, Bali",
      lat: -8.6913,
      lng: 115.1567,
      description: "Villas and suites around a long pool that runs to the sand, a spa in the garden and breakfast by the sea.",
      photos: ["room", "beach", "suite"],
      amenities: ["pool", "spa", "wifi", "breakfast", "beach", "restaurant", "bar", "shuttle"],
      themes: ["Beach", "Spa"],
      checkInTime: "15:00",
      checkOutTime: "12:00",
      taxBp: 2100,
      payAtHotel: true,
      policies: "Children of every age are welcome. Pets are not allowed. Quiet hours from 22:00.",
      phone: null,
      badge: "Only with us",
      featured: true,
    },
    rooms: [
      { name: "Deluxe Ocean View · King", description: "A balcony over the sea, a rain shower and a king bed.", photos: ["room"], sizeM2: 42, beds: "King", sleeps: 2, features: ["balcony", "rain shower", "sea view"], units: 6, nightlyCents: 168_00, minNights: 1 },
      { name: "Garden Suite · private pool", description: "Its own plunge pool in a walled garden.", photos: ["beach"], sizeM2: 68, beds: "King + sofa bed", sleeps: 3, features: ["private pool", "garden", "bathtub"], units: 3, nightlyCents: 240_00, minNights: 2 },
    ],
  },
  {
    hotel: {
      name: "Safra Skyline Hotel",
      kind: "hotel",
      stars: 5,
      city: "Dubai",
      country: "United Arab Emirates",
      area: "Downtown",
      landmark: "800 m from the city's tallest tower",
      address: "Downtown, Dubai",
      lat: 25.1972,
      lng: 55.2744,
      description: "High floors over the skyline, a rooftop pool and the metro at the door.",
      photos: ["skyline", "suite"],
      amenities: ["pool", "wifi", "gym", "restaurant", "bar", "parking", "air_conditioning", "view"],
      themes: ["City"],
      checkInTime: "14:00",
      checkOutTime: "12:00",
      taxBp: 1500,
      payAtHotel: true,
      policies: null,
      phone: null,
      badge: null,
      featured: true,
    },
    rooms: [
      { name: "Skyline Room · King", description: "Floor-to-ceiling windows on the towers.", photos: ["suite"], sizeM2: 36, beds: "King", sleeps: 2, features: ["city view", "rain shower"], units: 8, nightlyCents: 134_00, minNights: 1 },
      { name: "Family Room · two queens", description: "Room for four, and a view of the fountain.", photos: ["suite"], sizeM2: 48, beds: "2 Queen", sleeps: 4, features: ["city view", "bathtub"], units: 4, nightlyCents: 188_00, minNights: 1 },
    ],
  },
  {
    hotel: {
      name: "Safra Old Town House",
      kind: "boutique",
      stars: 4,
      city: "Istanbul",
      country: "Türkiye",
      area: "Sultanahmet",
      landmark: "600 m from the old city's mosques",
      address: "Sultanahmet, Istanbul",
      lat: 41.0067,
      lng: 28.9769,
      description: "A wooden town house of twelve rooms with a rooftop for breakfast over the Bosphorus.",
      photos: ["city", "suite"],
      amenities: ["wifi", "breakfast", "air_conditioning", "view"],
      themes: ["City"],
      checkInTime: "14:00",
      checkOutTime: "11:00",
      taxBp: 1000,
      payAtHotel: true,
      policies: "No lift: the rooms are up the stairs.",
      phone: null,
      badge: null,
      featured: false,
    },
    rooms: [{ name: "Classic Double", description: "Under the wooden beams, on a quiet lane.", photos: ["suite"], sizeM2: 22, beds: "Double", sleeps: 2, features: ["rain shower"], units: 5, nightlyCents: 96_00, minNights: 1 }],
  },
  {
    hotel: {
      name: "Safra Caldera Suites",
      kind: "boutique",
      stars: 5,
      city: "Santorini",
      country: "Greece",
      area: "Oia",
      landmark: "On the caldera, 5 minutes' walk from the village",
      address: "Oia, Santorini",
      lat: 36.4618,
      lng: 25.3753,
      description: "Cave suites cut into the cliff, each with its terrace over the caldera and the sunset.",
      photos: ["oia", "suite"],
      amenities: ["pool", "wifi", "breakfast", "shuttle", "view", "air_conditioning"],
      themes: ["Beach", "Islands"],
      checkInTime: "15:00",
      checkOutTime: "12:00",
      taxBp: 1400,
      payAtHotel: true,
      policies: null,
      phone: null,
      badge: null,
      featured: false,
    },
    rooms: [{ name: "Cave suite · caldera view", description: "A private terrace over the sea, carved into the rock.", photos: ["suite"], sizeM2: 40, beds: "King", sleeps: 2, features: ["terrace", "caldera view", "rain shower"], units: 5, nightlyCents: 262_00, minNights: 2 }],
  },
];

const CARRIER = { name: "Safra Air", code: "SFR", color: "#0E1424" };
const AIRPORTS = {
  CAI: { code: "CAI", city: "Cairo", airport: "Cairo International", terminal: "3" },
  DXB: { code: "DXB", city: "Dubai", airport: "Dubai International", terminal: "1" },
  IST: { code: "IST", city: "Istanbul", airport: "Istanbul Airport", terminal: null },
  JTR: { code: "JTR", city: "Santorini", airport: "Santorini (Thira)", terminal: null },
  DPS: { code: "DPS", city: "Bali", airport: "Ngurah Rai International", terminal: "I" },
} as const;

interface RouteSeed {
  from: keyof typeof AIRPORTS;
  to: keyof typeof AIRPORTS;
  number: string;
  /** 0 Sunday … 6 Saturday. */
  days: number[];
  departs: string;
  minutes: number;
  /** Local time difference of the arrival, in minutes. */
  shift: number;
  stops: number;
  via: string | null;
  lightCents: number;
}

const ROUTES: readonly RouteSeed[] = [
  { from: "CAI", to: "DXB", number: "SFR 141", days: [0, 2, 4, 6], departs: "10:15", minutes: 205, shift: 120, stops: 0, via: null, lightCents: 196_00 },
  { from: "DXB", to: "CAI", number: "SFR 142", days: [1, 3, 5, 0], departs: "17:30", minutes: 220, shift: -120, stops: 0, via: null, lightCents: 189_00 },
  { from: "CAI", to: "IST", number: "SFR 251", days: [1, 3, 5, 6], departs: "06:30", minutes: 130, shift: 60, stops: 0, via: null, lightCents: 138_00 },
  { from: "IST", to: "CAI", number: "SFR 252", days: [2, 4, 6, 0], departs: "18:40", minutes: 125, shift: -60, stops: 0, via: null, lightCents: 132_00 },
  { from: "CAI", to: "JTR", number: "SFR 361", days: [1, 4, 6], departs: "08:40", minutes: 265, shift: 0, stops: 1, via: "ATH", lightCents: 286_00 },
  { from: "JTR", to: "CAI", number: "SFR 362", days: [1, 3, 5], departs: "14:20", minutes: 290, shift: 0, stops: 1, via: "ATH", lightCents: 279_00 },
  { from: "CAI", to: "DPS", number: "SFR 471", days: [2, 5], departs: "21:05", minutes: 690, shift: 360, stops: 1, via: "DXB", lightCents: 412_00 },
  { from: "DPS", to: "CAI", number: "SFR 472", days: [0, 4], departs: "23:15", minutes: 720, shift: -360, stops: 1, via: "DXB", lightCents: 398_00 },
];

/** How many weeks of flights are on sale. */
export const TRAVEL_WEEKS = 12;

/** A day's price, the same every time for the same day: a little dearer at the weekend. */
function dayFactor(day: string, number: string): number {
  let h = 0;
  for (const ch of `${day}${number}`) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  const weekend = [4, 5].includes(new Date(`${day}T00:00:00Z`).getUTCDay()) ? 0.12 : 0;
  return 0.85 + (h % 30) / 100 + weekend;
}

const round = (cents: number) => Math.round(cents / 100) * 100;

function faresFor(lightCents: number): TravelFare[] {
  return [
    { id: "light", name: "Light", cents: lightCents, seats: 18, cabinKg: 8, bags: 0, bagKg: 0, changeable: false, changeFeeCents: 0, refundable: false, refundFeeCents: 0, seat: "fee", priority: false },
    { id: "standard", name: "Classic", cents: round(lightCents * 1.12), seats: 90, cabinKg: 8, bags: 1, bagKg: 23, changeable: true, changeFeeCents: 40_00, refundable: true, refundFeeCents: 60_00, seat: "standard", priority: false },
    { id: "flex", name: "Flex", cents: round(lightCents * 1.38), seats: 24, cabinKg: 10, bags: 2, bagKg: 23, changeable: true, changeFeeCents: 0, refundable: true, refundFeeCents: 0, seat: "any", priority: true },
  ];
}

function plusMinutes(day: string, time: string, minutes: number): string {
  const d = new Date(`${day}T${time}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

/** A few seats taken already, the same on every run of the same flight. */
function blockedSeats(number: string, day: string): string[] {
  const out: string[] = [];
  let h = 7;
  for (const ch of `${number}${day}`) h = (h * 33 + ch.charCodeAt(0)) % 10007;
  for (let row = 10; row < 30; row++) {
    for (const letter of "ABCDEF") {
      h = (h * 9301 + 49297) % 233280;
      if (h / 233280 > 0.72) out.push(`${row}${letter}`);
    }
  }
  return out;
}

export function flightsFor(appId: string, from: string, to: string, sample: boolean): TravelFlightInput[] {
  const out: TravelFlightInput[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    for (const route of ROUTES) {
      if (!route.days.includes(weekday)) continue;
      const departs = `${day}T${route.departs}`;
      out.push({
        appId,
        number: route.number,
        carrier: CARRIER,
        from: AIRPORTS[route.from],
        to: AIRPORTS[route.to],
        departs,
        arrives: plusMinutes(day, route.departs, route.minutes + route.shift),
        minutes: route.minutes,
        stops: route.stops,
        via: route.via,
        aircraft: route.minutes > 300 ? "Airbus A330" : "Airbus A321neo",
        amenities: route.minutes > 120 ? ["wifi", "meal", "power"] : ["wifi"],
        fares: faresFor(round(route.lightCents * dayFactor(day, route.number))),
        seatMap: { firstRow: 10, rows: 20, layout: "ABC DEF", extraRows: [12, 20], extraCents: 24_00, seatCents: 12_00, blocked: blockedSeats(route.number, day) },
        status: "scheduled",
        statusNote: null,
        gate: null,
        boardsAt: null,
        delayedDeparts: null,
        checkInOpen: false,
        active: true,
        sample,
      });
    }
  }
  return out;
}

const REVIEWS: readonly { hotel: number; name: string; score: number; staff: number; clean: number; location: number; value: number; trip: "couple" | "family" | "friends" | "solo" | "business"; text: string | null }[] = [
  { hotel: 0, name: "Mariam", score: 10, staff: 10, clean: 10, location: 9, value: 9, trip: "couple", text: "Sunrise from the pool, and the staff remembered our names on day two." },
  { hotel: 0, name: "Daniel", score: 9, staff: 9, clean: 9, location: 10, value: 8, trip: "family", text: "The beach is right there and the children loved the garden." },
  { hotel: 0, name: "Elif", score: 9, staff: 10, clean: 9, location: 9, value: 8, trip: "friends", text: null },
  { hotel: 1, name: "Omar", score: 9, staff: 9, clean: 10, location: 10, value: 8, trip: "business", text: "Quiet high floors and the metro at the door." },
  { hotel: 1, name: "Sara", score: 8, staff: 9, clean: 9, location: 9, value: 7, trip: "couple", text: null },
  { hotel: 2, name: "Lukas", score: 9, staff: 10, clean: 9, location: 10, value: 9, trip: "solo", text: "Breakfast on the roof over the water is worth the stairs." },
  { hotel: 3, name: "Nour", score: 10, staff: 10, clean: 10, location: 10, value: 8, trip: "couple", text: "The sunset from our own terrace, every evening." },
];

/**
 * Makes the hotels, rooms, reviews and twelve weeks of flights of an app
 * that has none, with the settings when it has none. Returns how many hotels
 * and flights it made.
 */
export async function makeTravelSamples(deps: TravelSampleDeps): Promise<{ hotels: number; flights: number }> {
  const { store, app, now, sample } = deps;
  const settings = await store.getTravelSettings(app.id);
  if (!settings) await store.saveTravelSettings(app.id, { ...TRAVEL_DEMO_SETTINGS, samplesAdded: true }, now);
  let hotels = 0;
  let flights = 0;
  if (deps.only !== "flights" && (await store.listTravelHotels(app.id)).length === 0) {
    const made: number[] = [];
    for (const [i, seed] of TRAVEL_HOTELS.entries()) {
      const photos = (await Promise.all(seed.hotel.photos.map((p) => deps.photo(p)))).filter((id): id is string => id !== null);
      const hotel = await store.createTravelHotel({ ...seed.hotel, appId: app.id, photos, position: i + 1, active: true, sample }, now);
      made.push(hotel.id);
      hotels++;
      for (const [j, room] of seed.rooms.entries()) {
        const roomPhotos = (await Promise.all(room.photos.map((p) => deps.photo(p)))).filter((id): id is string => id !== null);
        await store.createTravelRoom(
          { ...room, appId: app.id, hotelId: hotel.id, photos: roomPhotos, prices: {}, openFrom: null, openUntil: null, closed: [], rates: RATES.map((r) => ({ ...r })), position: j + 1, active: true, sample },
          now,
        );
      }
    }
    for (const [i, r] of REVIEWS.entries()) {
      const hotelId = made[r.hotel];
      if (hotelId === undefined) continue;
      // Reviews of stays before the app had bookings: their booking IDs are out of the bookings' range.
      await store.addTravelReview({ appId: app.id, hotelId, bookingId: 900_000_000 + i, userId: null, name: r.name, score: r.score, staff: r.staff, clean: r.clean, location: r.location, value: r.value, trip: r.trip, text: r.text, stayed: today(now).slice(0, 7), hidden: false, createdAt: new Date(now.getTime() - (i + 1) * 86_400_000) });
    }
  }
  if (deps.only !== "hotels" && (await store.listTravelFlights(app.id)).length === 0) {
    for (const f of flightsFor(app.id, addDays(today(now), 2), addDays(today(now), TRAVEL_WEEKS * 7), sample)) {
      await store.createTravelFlight(f, now);
      flights++;
    }
  }
  return { hotels, flights };
}

/**
 * The demo's daily job: flights that have left and that nobody booked are
 * removed, and the weeks ahead filled again, so the demo always has twelve
 * weeks of flights. Returns how many it removed.
 */
export async function rollTravelFlights(store: DataStore, app: App, now: Date): Promise<number> {
  const flights = await store.listTravelFlights(app.id);
  const first = addDays(today(now), 2);
  let removed = 0;
  for (const f of flights) {
    if (f.departs.slice(0, 10) >= today(now)) continue;
    const held = await store.listTravelHolds(app.id, { flightIds: [f.id] }, new Date(0));
    if (held.length) continue;
    await store.deleteTravelFlight(app.id, f.id);
    removed++;
  }
  const last = flights.reduce((max, f) => (f.departs.slice(0, 10) > max ? f.departs.slice(0, 10) : max), addDays(first, -1));
  const until = addDays(today(now), TRAVEL_WEEKS * 7);
  if (last < until) for (const f of flightsFor(app.id, addDays(last, 1) < first ? first : addDays(last, 1), until, false)) await store.createTravelFlight(f, now);
  return removed;
}

export { travelSettingsOf };
