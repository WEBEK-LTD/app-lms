import type { TravelBooking } from "../data/types";

/**
 * 126 Which bookings hold rooms and seats now: confirmed and completed ones,
 * and ones awaiting payment until their hold ends. Both stores use it, so
 * the memory store and MariaDB agree on what is free.
 */
export function holding(booking: Pick<TravelBooking, "status" | "holdUntil">, now: Date): boolean {
  if (booking.status === "confirmed" || booking.status === "completed") return true;
  return booking.status === "awaiting_payment" && booking.holdUntil !== null && booking.holdUntil.getTime() > now.getTime();
}

/** The flights a booking has seats on. */
export function flightIdsOf(booking: Pick<TravelBooking, "flight">): number[] {
  if (!booking.flight) return [];
  return booking.flight.inbound ? [booking.flight.outbound.flightId, booking.flight.inbound.flightId] : [booking.flight.outbound.flightId];
}

/** Whether a booking holds the room's nights in `[from, to)` or seats on one of the flights. */
export function holdsOn(booking: TravelBooking, on: { roomId?: number; from?: string; to?: string; flightIds?: number[] }, now: Date): boolean {
  if (!holding(booking, now)) return false;
  if (on.roomId !== undefined && booking.stay?.roomId === on.roomId) {
    const from = on.from ?? "0000-01-01";
    const to = on.to ?? "9999-12-31";
    if (booking.stay.checkIn < to && booking.stay.checkOut > from) return true;
  }
  if (on.flightIds?.length && flightIdsOf(booking).some((id) => on.flightIds!.includes(id))) return true;
  return false;
}

/** What a booking holds, as the store's lock needs it. */
export function holdsOf(booking: Pick<TravelBooking, "stay" | "flight">): { roomId?: number; from?: string; to?: string; flightIds?: number[] } {
  return {
    ...(booking.stay ? { roomId: booking.stay.roomId, from: booking.stay.checkIn, to: booking.stay.checkOut } : {}),
    flightIds: flightIdsOf(booking),
  };
}
