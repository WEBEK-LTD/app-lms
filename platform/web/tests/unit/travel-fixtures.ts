import type { TravelFare, TravelFlightInput, TravelHotelInput, TravelRoomInput } from "@/lib/data/types";

/** 126 A hotel, its rooms and flights for the travel tests (prices and names are examples). */

export function hotelInput(appId: string, patch: Partial<TravelHotelInput> = {}): TravelHotelInput {
  return {
    appId,
    name: "Nile Garden Resort",
    kind: "resort",
    stars: 5,
    city: "Luxor",
    country: "Egypt",
    area: "West Bank",
    landmark: "2.1 km from the Valley of the Kings",
    address: "West Bank, Luxor",
    lat: 25.7,
    lng: 32.6,
    description: "An infinity pool above the river.",
    photos: ["pool-1", "suite-1"],
    amenities: ["pool", "spa", "wifi", "breakfast", "shuttle"],
    themes: ["Desert", "Spa"],
    checkInTime: "15:00",
    checkOutTime: "12:00",
    taxBp: 1750,
    payAtHotel: true,
    policies: null,
    phone: "+20 95 000 0000",
    badge: null,
    featured: true,
    active: true,
    position: 1,
    sample: false,
    ...patch,
  };
}

export function roomInput(appId: string, hotelId: number, patch: Partial<TravelRoomInput> = {}): TravelRoomInput {
  return {
    appId,
    hotelId,
    name: "Deluxe Nile View · King",
    description: null,
    photos: ["bed-1"],
    sizeM2: 42,
    beds: "King",
    sleeps: 2,
    features: ["balcony", "rain shower"],
    units: 2,
    nightlyCents: 150_00,
    prices: {},
    openFrom: null,
    openUntil: null,
    closed: [],
    minNights: 1,
    rates: [
      { id: "room", name: "Room only", board: "room_only", refundable: false, freeCancelDays: 0, extraCents: 0, payAtHotel: false, popular: false },
      { id: "bb", name: "Breakfast for 2", board: "breakfast", refundable: true, freeCancelDays: 2, extraCents: 18_00, payAtHotel: true, popular: true },
    ],
    active: true,
    position: 1,
    sample: false,
    ...patch,
  };
}

export const FARES: TravelFare[] = [
  { id: "light", name: "Light", cents: 120_00, seats: 3, cabinKg: 8, bags: 0, bagKg: 0, changeable: false, changeFeeCents: 0, refundable: false, refundFeeCents: 0, seat: "fee", priority: false },
  { id: "standard", name: "Classic", cents: 150_00, seats: 10, cabinKg: 8, bags: 1, bagKg: 23, changeable: true, changeFeeCents: 40_00, refundable: true, refundFeeCents: 50_00, seat: "standard", priority: false },
  { id: "flex", name: "Flex", cents: 200_00, seats: 4, cabinKg: 8, bags: 2, bagKg: 23, changeable: true, changeFeeCents: 0, refundable: true, refundFeeCents: 0, seat: "any", priority: true },
];

export function flightInput(appId: string, patch: Partial<TravelFlightInput> = {}): TravelFlightInput {
  return {
    appId,
    number: "SF 691",
    carrier: { name: "Safra Air", code: "SF", color: "#0E1424" },
    from: { code: "CAI", city: "Cairo", airport: "Cairo International", terminal: "3" },
    to: { code: "LXR", city: "Luxor", airport: "Luxor International", terminal: null },
    departs: "2026-11-14T10:15",
    arrives: "2026-11-14T11:20",
    minutes: 65,
    stops: 0,
    via: null,
    aircraft: "Airbus A321neo",
    amenities: ["wifi", "meal"],
    fares: FARES,
    seatMap: { firstRow: 10, rows: 10, layout: "ABC DEF", extraRows: [12], extraCents: 24_00, seatCents: 10_00, blocked: ["10A"] },
    status: "scheduled",
    statusNote: null,
    gate: null,
    boardsAt: null,
    delayedDeparts: null,
    checkInOpen: false,
    active: true,
    sample: false,
    ...patch,
  };
}
