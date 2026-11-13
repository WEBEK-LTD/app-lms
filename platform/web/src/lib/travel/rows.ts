import type { TravelAlert, TravelBooking, TravelFlight, TravelHotel, TravelReview, TravelRoom } from "../data/types";

/**
 * 126 The travel rows as MariaDB keeps them: the columns that are looked up,
 * the rest of each row in its `data` (JSON). Dates inside `data` are ISO
 * strings.
 */

type Common = "id" | "appId" | "createdAt" | "updatedAt";
export type TravelHotelData = Omit<TravelHotel, Common | "position" | "active" | "sample">;
export type TravelRoomData = Omit<TravelRoom, Common | "hotelId" | "position" | "active" | "sample">;
export type TravelFlightData = Omit<TravelFlight, Common | "departs" | "active" | "sample">;
export type TravelBookingData = Omit<TravelBooking, Common | "userId" | "reference" | "status" | "holdUntil" | "sample">;
export type TravelReviewData = Omit<TravelReview, "id" | "appId" | "hotelId" | "bookingId" | "userId" | "hidden" | "createdAt">;
export type TravelAlertData = Omit<TravelAlert, Common | "userId">;

function without<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}

export function hotelData(hotel: Partial<TravelHotel>): Partial<TravelHotelData> {
  return without(hotel as TravelHotel, ["id", "appId", "createdAt", "updatedAt", "position", "active", "sample"]);
}
export function roomData(room: Partial<TravelRoom>): Partial<TravelRoomData> {
  return without(room as TravelRoom, ["id", "appId", "createdAt", "updatedAt", "hotelId", "position", "active", "sample"]);
}
export function flightData(flight: Partial<TravelFlight>): Partial<TravelFlightData> {
  return without(flight as TravelFlight, ["id", "appId", "createdAt", "updatedAt", "departs", "active", "sample"]);
}
export function bookingData(booking: Partial<TravelBooking>): Partial<TravelBookingData> {
  return without(booking as TravelBooking, ["id", "appId", "createdAt", "updatedAt", "userId", "reference", "status", "holdUntil", "sample"]);
}
export function reviewData(review: Partial<TravelReview>): Partial<TravelReviewData> {
  return without(review as TravelReview, ["id", "appId", "hotelId", "bookingId", "userId", "hidden", "createdAt"]);
}
export function alertData(alert: Partial<TravelAlert>): Partial<TravelAlertData> {
  return without(alert as TravelAlert, ["id", "appId", "createdAt", "updatedAt", "userId"]);
}

/** The columns kept next to a booking's data, for the holds' lookups. */
export function bookingColumns(booking: Pick<TravelBooking, "stay" | "flight">) {
  return {
    hotelId: booking.stay?.hotelId ?? null,
    roomId: booking.stay?.roomId ?? null,
    checkIn: booking.stay?.checkIn ?? null,
    checkOut: booking.stay?.checkOut ?? null,
    outFlightId: booking.flight?.outbound.flightId ?? null,
    inFlightId: booking.flight?.inbound?.flightId ?? null,
  };
}
