// 126 Travel: hotels and flights (a Studio project type). Re-exported from ./types.

import type { CatalogCurrency } from "./types";

/** Where the hotels come from (Admin › client › Travel). Only `dashboard` is connected; the others are a later connector (lib/travel/sources.ts). */
export const TRAVEL_HOTEL_SOURCES = ["dashboard", "hotel_api", "supplier"] as const;
export type TravelHotelSource = (typeof TRAVEL_HOTEL_SOURCES)[number];
/** Where the flights come from: `fixed` seats from the dashboard (connected), or a live `provider` account (later). */
export const TRAVEL_FLIGHT_SOURCES = ["fixed", "provider"] as const;
export type TravelFlightSource = (typeof TRAVEL_FLIGHT_SOURCES)[number];

export const TRAVEL_HOTEL_KINDS = ["hotel", "resort", "boutique", "apartments", "villa", "hostel", "guesthouse"] as const;
export type TravelHotelKind = (typeof TRAVEL_HOTEL_KINDS)[number];
export const TRAVEL_AMENITIES = ["pool", "spa", "wifi", "breakfast", "shuttle", "gym", "parking", "beach", "restaurant", "bar", "air_conditioning", "family", "pets", "accessible", "kitchen", "view"] as const;
export type TravelAmenity = (typeof TRAVEL_AMENITIES)[number];
export const TRAVEL_BOARDS = ["room_only", "breakfast", "half_board", "full_board", "all_inclusive"] as const;
export type TravelBoard = (typeof TRAVEL_BOARDS)[number];
export const TRAVEL_FARE_IDS = ["light", "standard", "flex"] as const;
export type TravelFareId = (typeof TRAVEL_FARE_IDS)[number];
export const TRAVEL_FLIGHT_STATUSES = ["scheduled", "on_time", "delayed", "boarding", "departed", "landed", "cancelled"] as const;
export type TravelFlightStatus = (typeof TRAVEL_FLIGHT_STATUSES)[number];
export const TRAVEL_FLIGHT_AMENITIES = ["wifi", "meal", "power", "entertainment", "lounge"] as const;
export type TravelFlightAmenity = (typeof TRAVEL_FLIGHT_AMENITIES)[number];
export const TRAVEL_REQUESTS = ["late_arrival", "early_arrival", "high_floor", "quiet_room", "airport_pickup", "twin_beds", "accessible"] as const;
export type TravelRequest = (typeof TRAVEL_REQUESTS)[number];
export const TRAVEL_TRIP_TYPES = ["couple", "family", "friends", "solo", "business"] as const;
export type TravelTripType = (typeof TRAVEL_TRIP_TYPES)[number];

/** The project's travel settings (travel_settings): Yallapp's switches and the company's choices. Every amount is the company's. */
export interface TravelSettings {
  /** Yallapp's switches (Admin › client › Travel); at least one stays on. */
  hotels: boolean;
  hotelSource: TravelHotelSource;
  flights: boolean;
  flightSource: TravelFlightSource;
  currency: CatalogCurrency;
  /** Paid in the app on the company's payment page. */
  payNow: boolean;
  /** A stay alone may be paid at the hotel (where the hotel and the rate take it). */
  payAtHotel: boolean;
  /** Off stays for people signed in; 0 none. */
  memberOffPercent: number;
  /** Off the stay of a trip (a stay booked with a flight); 0 none. */
  bundleOffPercent: number;
  /** The airport transfer offered with a trip; null none. */
  transfer: { cents: number; note: string | null } | null;
  /** Per extra checked bag and per meal, on the flights. */
  bagCents: number;
  mealCents: number;
  /** The large titles' and prices' free font (lib/fonts/catalog.ts); null the app's own. */
  displayFont: string | null;
  help: { phone: string | null; email: string | null; whatsapp: string | null };
  /** Templates = demos: the sample entries were added once (lib/samples). */
  samplesAdded?: boolean;
}

export interface TravelHotel {
  id: number;
  appId: string;
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
  /** Asset IDs, the first is the cover. */
  photos: string[];
  amenities: TravelAmenity[];
  /** The kinds of stay it is ("Beach", "Desert"), in the company's words. */
  themes: string[];
  checkInTime: string;
  checkOutTime: string;
  /** Taxes and fees on the nights, in basis points (1400 = 14%). */
  taxBp: number;
  /** Whether a stay can be paid at the hotel. */
  payAtHotel: boolean;
  policies: string | null;
  phone: string | null;
  badge: string | null;
  featured: boolean;
  active: boolean;
  position: number;
  /** 110.2 A sample entry. */
  sample: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type TravelHotelInput = Omit<TravelHotel, "id" | "createdAt" | "updatedAt">;

export interface TravelRate {
  id: string;
  name: string;
  board: TravelBoard;
  refundable: boolean;
  /** Free cancellation until this many days before the check-in. */
  freeCancelDays: number;
  /** On top of the room's night, per night. */
  extraCents: number;
  payAtHotel: boolean;
  popular: boolean;
}

export interface TravelRoom {
  id: number;
  appId: string;
  hotelId: number;
  name: string;
  description: string | null;
  photos: string[];
  sizeM2: number | null;
  beds: string | null;
  sleeps: number;
  features: string[];
  /** Rooms of this type. */
  units: number;
  nightlyCents: number;
  /** Nights priced otherwise (YYYY-MM-DD → cents). */
  prices: Record<string, number>;
  /** The days it is open; null on either side: no limit. */
  openFrom: string | null;
  openUntil: string | null;
  /** Days it is closed. */
  closed: string[];
  minNights: number;
  rates: TravelRate[];
  active: boolean;
  position: number;
  sample: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type TravelRoomInput = Omit<TravelRoom, "id" | "createdAt" | "updatedAt">;

export interface TravelFare {
  id: TravelFareId;
  name: string;
  cents: number;
  /** Seats sold at this fare. */
  seats: number;
  cabinKg: number;
  bags: number;
  bagKg: number;
  changeable: boolean;
  changeFeeCents: number;
  refundable: boolean;
  refundFeeCents: number;
  seat: "fee" | "standard" | "any";
  priority: boolean;
}

/** The plane's seats, when the company draws them. */
export interface TravelSeatMap {
  firstRow: number;
  rows: number;
  /** "ABC DEF": letters, a space for the aisle. */
  layout: string;
  extraRows: number[];
  extraCents: number;
  /** A seat on a light fare. */
  seatCents: number;
  blocked: string[];
}

export interface TravelAirportInfo {
  code: string;
  city: string;
  airport: string | null;
  terminal: string | null;
}

export interface TravelFlight {
  id: number;
  appId: string;
  number: string;
  carrier: { name: string; code: string; color: string };
  from: TravelAirportInfo;
  to: TravelAirportInfo;
  /** Local wall times, "YYYY-MM-DDTHH:MM". */
  departs: string;
  arrives: string;
  minutes: number;
  stops: number;
  via: string | null;
  aircraft: string | null;
  amenities: TravelFlightAmenity[];
  fares: TravelFare[];
  seatMap: TravelSeatMap | null;
  status: TravelFlightStatus;
  statusNote: string | null;
  gate: string | null;
  boardsAt: string | null;
  delayedDeparts: string | null;
  /** The company opened check-in (else 48 hours before). */
  checkInOpen: boolean;
  active: boolean;
  sample: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type TravelFlightInput = Omit<TravelFlight, "id" | "createdAt" | "updatedAt">;

export interface TravelStayPart {
  hotelId: number;
  hotelName: string;
  roomId: number;
  roomName: string;
  rateId: string;
  rateName: string;
  board: TravelBoard;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  /** Each night's price of one room, with the rate's extra. */
  nights: { date: string; cents: number }[];
  refundable: boolean;
  freeCancelUntil: string | null;
  taxBp: number;
}

export interface TravelLegPart {
  flightId: number;
  number: string;
  fareId: TravelFareId;
  fareName: string;
  /** One person's fare. */
  cents: number;
  /** One per traveller. */
  seats: (string | null)[];
  seatCents: number;
}

export interface TravelFlightPart {
  outbound: TravelLegPart;
  inbound: TravelLegPart | null;
  travellers: number;
  bags: number;
  meals: number;
  bagCents: number;
  mealCents: number;
  changeable: boolean;
  changeFeeCents: number;
  refundable: boolean;
  refundFeeCents: number;
}

export interface TravelLine {
  kind: "nights" | "fare" | "seats" | "bags" | "meals" | "transfer" | "taxes" | "member" | "bundle" | "change_fee";
  count: number;
  unitCents: number | null;
  cents: number;
}

export const TRAVEL_BOOKING_STATUSES = ["awaiting_payment", "confirmed", "cancelled", "completed"] as const;
export type TravelBookingStatus = (typeof TRAVEL_BOOKING_STATUSES)[number];
export type TravelPaymentStatus = "unpaid" | "paid" | "at_hotel" | "refund_due" | "refunded";

export interface TravelBooking {
  id: number;
  appId: string;
  userId: number | null;
  reference: string;
  kind: "stay" | "flight" | "trip";
  status: TravelBookingStatus;
  stay: TravelStayPart | null;
  flight: TravelFlightPart | null;
  transfer: { cents: number; note: string | null } | null;
  travellers: { firstName: string; lastName: string }[];
  contact: { name: string; email: string | null; phone: string | null };
  requests: TravelRequest[];
  note: string | null;
  currency: CatalogCurrency;
  lines: TravelLine[];
  totalCents: number;
  paymentMethod: "now" | "at_hotel";
  paymentStatus: TravelPaymentStatus;
  paidCents: number;
  /** Refunded or to refund after a cancellation or a cheaper change. */
  refundCents: number;
  orderId: number | null;
  holdUntil: Date | null;
  cancellation: { at: string; by: "customer" | "company" | "unpaid"; reason: string | null } | null;
  /** What changed, for the company. */
  changes: { at: string; what: string }[];
  lang: string | null;
  sample: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type TravelBookingInput = Omit<TravelBooking, "id">;
export type TravelBookingPatch = Partial<Omit<TravelBooking, "id" | "appId" | "createdAt">>;

export interface TravelBookingQuery {
  appId: string;
  userId?: number;
  statuses?: TravelBookingStatus[];
  hotelId?: number;
  flightId?: number;
  search?: string;
  page: number;
  perPage: number;
}

export interface TravelReview {
  id: number;
  appId: string;
  hotelId: number;
  bookingId: number;
  userId: number | null;
  name: string;
  score: number;
  staff: number | null;
  clean: number | null;
  location: number | null;
  value: number | null;
  trip: TravelTripType | null;
  text: string | null;
  /** YYYY-MM of the stay. */
  stayed: string;
  hidden: boolean;
  createdAt: Date;
}
export type TravelReviewInput = Omit<TravelReview, "id">;

export interface TravelAlert {
  id: number;
  appId: string;
  userId: number;
  kind: "flight" | "trip" | "anywhere";
  from: string;
  to: string | null;
  month: string | null;
  roundTrip: boolean;
  nights: number | null;
  travellers: number;
  maxCents: number | null;
  /** The price when made, and the last one the person was told of. */
  firstCents: number | null;
  lastCents: number | null;
  createdAt: Date;
  updatedAt: Date;
}
export type TravelAlertInput = Omit<TravelAlert, "id">;

/** Rooms and seats held by other bookings, as the store sees them in the booking's lock. */
export interface TravelHeld {
  bookings: TravelBooking[];
}
