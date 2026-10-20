import type { DataStore } from "../data/store";
import type { BookingAppointment, BookingStatus } from "../data/types";

/**
 * What the business can do with an appointment in each status, for
 * Dashboard › Appointments and 58 the Owner API. There is no reschedule:
 * a new time is a new booking.
 */
const NEXT: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending: ["approved", "rejected"],
  approved: ["cancelled", "completed", "no_show"],
};

export function nextAppointmentStatuses(appointment: Pick<BookingAppointment, "status">): BookingStatus[] {
  return NEXT[appointment.status] ?? [];
}

/** Moves the appointment when its status allows it; false (nothing changed) otherwise. */
export async function changeAppointmentStatus(store: DataStore, appointment: BookingAppointment, status: string, now: Date): Promise<boolean> {
  if (!nextAppointmentStatuses(appointment).includes(status as BookingStatus)) return false;
  await store.updateBookingAppointment(appointment.appId, appointment.id, { status: status as BookingStatus, updatedAt: now });
  return true;
}
