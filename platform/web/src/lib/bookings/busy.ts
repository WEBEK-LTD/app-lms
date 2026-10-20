import type { DataStore } from "../data/store";
import { ACTIVE_BOOKING_STATUSES, type BookingAppointment } from "../data/types";
import { hasClasses } from "./classes";
import type { FullBookingSetup } from "./setup";
import { addDays } from "./time";

/**
 * When staff are busy around these local days: active appointments (with a
 * margin for any time zone and for appointments across midnight) and 27 the
 * classes they teach. Booking in the app and 61 moving an appointment read
 * the same; `exceptId` leaves out the appointment being moved.
 */
export async function busyTimes(
  store: Pick<DataStore, "listBookingAppointments" | "listClassSessions">,
  appId: string,
  setup: Pick<FullBookingSetup, "classTemplates">,
  from: string,
  days: number,
  exceptId?: number,
): Promise<Pick<BookingAppointment, "staffId" | "startAt" | "endAt">[]> {
  const startFrom = new Date(new Date(`${addDays(from, -1)}T00:00:00Z`).getTime() - 14 * 3_600_000);
  const startBefore = new Date(new Date(`${addDays(from, days + 1)}T00:00:00Z`).getTime() + 14 * 3_600_000);
  const { items } = await store.listBookingAppointments({ appId, statuses: ACTIVE_BOOKING_STATUSES, startFrom, startBefore, offset: 0, limit: 5000 });
  const appointments = exceptId === undefined ? items : items.filter((a) => a.id !== exceptId);
  if (!hasClasses(setup)) return appointments;
  // 27 A coach teaching a class isn't free for a personal session then.
  const classes = await store.listClassSessions({ appId, startFrom, startBefore });
  return [...appointments, ...classes.filter((c) => c.status === "scheduled")];
}
