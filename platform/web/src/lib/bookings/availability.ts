import type { BookingAppointment, BookingSetup, BookingStaff } from "../data/types";
import { addDays, localToUtc, minutesOf, timeOf, utcToLocal, weekdayOf } from "./time";

export interface FreeSlot {
  start: Date;
  end: Date;
  localTime: string;
  staffIds: number[];
}

/** Staff who can be booked for a service. */
export function staffFor(setup: BookingSetup, serviceId: number): BookingStaff[] {
  return setup.staff.filter((s) => s.active && s.serviceIds.includes(serviceId));
}

/**
 * Free start times per local day: each staff member's working hours that
 * day (not on a day off), every `slotStepMinutes`, where the whole service
 * fits and doesn't overlap one of their active appointments, from
 * `minMinutesAhead` from now up to `maxDaysAhead` days ahead.
 */
export function freeTimes(input: {
  setup: BookingSetup;
  serviceId: number;
  staffId: number | null;
  from: string;
  days: number;
  now: Date;
  appointments: Pick<BookingAppointment, "staffId" | "startAt" | "endAt">[];
}): { date: string; slots: FreeSlot[] }[] {
  const { setup, now } = input;
  const { rules } = setup;
  const service = setup.services.find((s) => s.id === input.serviceId && s.active);
  const staff = staffFor(setup, input.serviceId).filter((s) => input.staffId === null || s.id === input.staffId);
  const earliest = now.getTime() + rules.minMinutesAhead * 60_000;
  const lastDay = addDays(utcToLocal(now, rules.timezone).date, rules.maxDaysAhead);
  const out: { date: string; slots: FreeSlot[] }[] = [];
  for (let i = 0; i < input.days; i += 1) {
    const date = addDays(input.from, i);
    const byTime = new Map<string, FreeSlot>();
    if (service && date <= lastDay) {
      for (const member of staff) {
        if (member.daysOff.includes(date)) continue;
        const busy = input.appointments.filter((a) => a.staffId === member.id);
        for (const range of member.hours[weekdayOf(date)] ?? []) {
          const open = minutesOf(range.start);
          const close = minutesOf(range.end);
          if (open === null || close === null) continue;
          for (let t = open; t + service.durationMinutes <= close; t += Math.max(5, rules.slotStepMinutes)) {
            const localTime = timeOf(t);
            const start = localToUtc(date, localTime, rules.timezone);
            const end = new Date(start.getTime() + service.durationMinutes * 60_000);
            if (start.getTime() < earliest) continue;
            if (busy.some((a) => a.startAt < end && start < a.endAt)) continue;
            const slot = byTime.get(localTime) ?? { start, end, localTime, staffIds: [] };
            if (!slot.staffIds.includes(member.id)) slot.staffIds.push(member.id);
            byTime.set(localTime, slot);
          }
        }
      }
    }
    const slots = [...byTime.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (const slot of slots) slot.staffIds.sort((a, b) => a - b);
    out.push({ date, slots });
  }
  return out;
}
