import type { DataStore } from "../data/store";
import type { TravelBooking, TravelFlight, TravelFlightSource, TravelHotel, TravelHotelSource, TravelRoom } from "../data/types";

/**
 * 126 Where a travel app's hotels and flights come from, behind one
 * interface, so a connector to a hotel's own booking system, a hotel
 * supplier account or a live flight provider account can be added later
 * without touching the app API: it implements `HotelSource` or
 * `FlightSource` and says it is connected. Phase 1 connects only what the
 * company enters in the dashboard; the others are listed in Admin as coming
 * soon and are never used (lib/travel/settings.ts falls back to the
 * dashboard's). No outside service is called and no credentials are kept.
 */

export interface SourceInfo<Id extends string> {
  id: Id;
  title: string;
  text: string;
  /** Whether it can be chosen now. */
  connected: boolean;
}

export const HOTEL_SOURCES: readonly SourceInfo<TravelHotelSource>[] = [
  { id: "dashboard", title: "Entered in the dashboard", text: "Rooms, nightly prices, open dates, photos. No connection needed.", connected: true },
  { id: "hotel_api", title: "The hotel’s own booking system", text: "Through its API, the way Custom API works today.", connected: false },
  { id: "supplier", title: "A hotel supplier account", text: "Thousands of hotels, on the client’s own contract.", connected: false },
];

export const FLIGHT_SOURCES: readonly SourceInfo<TravelFlightSource>[] = [
  { id: "provider", title: "A flight provider account", text: "Live fares and seats; tickets issued by the provider or an accredited agency.", connected: false },
  { id: "fixed", title: "Fixed seats from the dashboard", text: "Charters, Umrah and packages with a set number of seats.", connected: true },
];

export function hotelSourceInfo(id: TravelHotelSource): SourceInfo<TravelHotelSource> {
  return HOTEL_SOURCES.find((s) => s.id === id) ?? HOTEL_SOURCES[0]!;
}

export function flightSourceInfo(id: TravelFlightSource): SourceInfo<TravelFlightSource> {
  return FLIGHT_SOURCES.find((s) => s.id === id) ?? FLIGHT_SOURCES[1]!;
}

/** What the app API reads hotels through. */
export interface HotelSource {
  readonly id: TravelHotelSource;
  hotels(): Promise<TravelHotel[]>;
  hotel(id: number): Promise<TravelHotel | null>;
  rooms(hotelId?: number): Promise<TravelRoom[]>;
  /** The bookings holding a room's nights in `[from, to)` now. */
  holds(roomId: number, from: string, to: string, now: Date): Promise<TravelBooking[]>;
}

/** What the app API reads flights through. */
export interface FlightSource {
  readonly id: TravelFlightSource;
  flights(): Promise<TravelFlight[]>;
  flight(id: number): Promise<TravelFlight | null>;
  /** The bookings holding seats on the flights now. */
  holds(flightIds: number[], now: Date): Promise<TravelBooking[]>;
}

/** The hotels the company entered in the dashboard. */
export class DashboardHotels implements HotelSource {
  readonly id = "dashboard" as const;
  constructor(
    private readonly store: DataStore,
    private readonly appId: string,
  ) {}
  hotels() {
    return this.store.listTravelHotels(this.appId);
  }
  hotel(id: number) {
    return this.store.getTravelHotel(this.appId, id);
  }
  rooms(hotelId?: number) {
    return this.store.listTravelRooms(this.appId, hotelId);
  }
  holds(roomId: number, from: string, to: string, now: Date) {
    return this.store.listTravelHolds(this.appId, { roomId, from, to }, now);
  }
}

/** The fixed seats the company entered in the dashboard (charters, Umrah, packages). */
export class FixedSeatFlights implements FlightSource {
  readonly id = "fixed" as const;
  constructor(
    private readonly store: DataStore,
    private readonly appId: string,
  ) {}
  flights() {
    return this.store.listTravelFlights(this.appId);
  }
  flight(id: number) {
    return this.store.getTravelFlight(this.appId, id);
  }
  holds(flightIds: number[], now: Date) {
    return flightIds.length ? this.store.listTravelHolds(this.appId, { flightIds }, now) : Promise.resolve([]);
  }
}

/** The app's sources: the dashboard's, the only ones connected in phase 1. */
export function sourcesFor(store: DataStore, appId: string, settings: { hotelSource: TravelHotelSource; flightSource: TravelFlightSource }): { hotels: HotelSource; flights: FlightSource } {
  // Another source is chosen only once its connector is built (`connected`); until then the dashboard's serve.
  void settings;
  return { hotels: new DashboardHotels(store, appId), flights: new FixedSeatFlights(store, appId) };
}
