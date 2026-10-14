import type { DataStore } from "../data/store";
import type { App, BookingSetup, ClassSession, ClassTemplate } from "../data/types";
import { bookingSetup, type FullBookingSetup } from "./setup";
import { addDays, localToUtc, minutesOf, utcToLocal, weekdayOf } from "./time";

/**
 * 27 Group classes: a gym's or studio's weekly timetable (kept in the
 * booking setup) and the classes made from it for the next weeks, one row
 * each (`class_sessions`) so their spots can be counted and locked.
 */

/** How far ahead classes are made: by the daily job and whenever the timetable is saved. */
export const CLASS_WEEKS = 8;

/** Whether the app has a timetable (`bookings.classes` in its config). */
export function hasClasses(setup: Pick<FullBookingSetup, "classTemplates">): boolean {
  return setup.classTemplates.length > 0;
}

/** A class's local day and time, as people read it: "Mon 20 Oct, 07:30". */
export function classWhen(startAt: Date, timeZone: string): string {
  const local = utcToLocal(startAt, timeZone);
  const day = new Date(`${local.date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `${day.replace(/,/g, "")}, ${local.time}`;
}

type Parsed<T> ={ ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** The Timetable page's form: a class on a weekday, with its coach, start, length and spots. */
export function parseClassTemplate(v: Record<string, string>, setup: BookingSetup): Parsed<Omit<ClassTemplate, "id">> {
  const errors: Record<string, string> = {};
  const serviceId = Number(v.serviceId);
  if (!setup.services.some((s) => s.id === serviceId)) errors.serviceId = "Choose a class.";
  const staffId = Number(v.staffId);
  if (!setup.staff.some((s) => s.id === staffId)) errors.staffId = "Choose a coach.";
  const weekday = /^[0-6]$/.test(v.weekday ?? "") ? Number(v.weekday) : null;
  if (weekday === null) errors.weekday = "Choose a day.";
  const time = (v.time ?? "").trim();
  if (minutesOf(time) === null) errors.time = "Enter a start like 07:30.";
  const duration = /^\d{1,3}$/.test(v.duration ?? "") ? Number(v.duration) : null;
  if (duration === null || duration < 10 || duration > 300) errors.duration = "Enter 10 to 300 minutes.";
  const capacity = /^\d{1,4}$/.test(v.capacity ?? "") ? Number(v.capacity) : null;
  if (capacity === null || capacity < 1 || capacity > 500) errors.capacity = "Enter 1 to 500 spots.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { serviceId, staffId, weekday: weekday!, time, durationMinutes: duration!, capacity: capacity!, active: v.active === "on" } };
}

interface PlannedClass {
  template: ClassTemplate;
  serviceName: string;
  staffName: string;
  startAt: Date;
  endAt: Date;
}

/** The classes the timetable makes from now for CLASS_WEEKS weeks (active entries whose class and coach still exist). */
export function plannedClasses(setup: FullBookingSetup, now: Date): PlannedClass[] {
  const { timezone } = setup.rules;
  const today = utcToLocal(now, timezone).date;
  const out: PlannedClass[] = [];
  for (const template of setup.classTemplates) {
    const service = setup.services.find((s) => s.id === template.serviceId);
    const staff = setup.staff.find((s) => s.id === template.staffId);
    if (!template.active || !service || !staff) continue;
    for (let d = 0; d < CLASS_WEEKS * 7; d += 1) {
      const date = addDays(today, d);
      if (weekdayOf(date) !== template.weekday) continue;
      const startAt = localToUtc(date, template.time, timezone);
      if (startAt <= now) continue;
      out.push({ template, serviceName: service.name, staffName: staff.name, startAt, endAt: new Date(startAt.getTime() + template.durationMinutes * 60_000) });
    }
  }
  return out.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export interface ClassSyncReport {
  created: number;
  updated: number;
  removed: number;
}

/**
 * Brings the coming classes in line with the timetable: makes the missing
 * ones, updates the coach, names and spots of the ones it still has, and
 * removes empty ones it no longer has. Classes someone booked stay (the
 * business can call them off on the Timetable page). Safe to run again.
 */
export async function syncClassSessions(store: DataStore, app: Pick<App, "id" | "bookingSetup">, now: Date): Promise<ClassSyncReport> {
  const setup = bookingSetup(app);
  const report: ClassSyncReport = { created: 0, updated: 0, removed: 0 };
  const planned = plannedClasses(setup, now);
  const key = (templateId: number | null, startAt: Date) => `${templateId}|${startAt.getTime()}`;
  const wanted = new Map(planned.map((p) => [key(p.template.id, p.startAt), p]));
  const existing = await store.listClassSessions({ appId: app.id, startFrom: now });
  const have = new Set<string>();
  for (const session of existing) {
    if (session.status !== "scheduled" || session.templateId === null) continue;
    const plan = wanted.get(key(session.templateId, session.startAt));
    if (!plan) {
      if (session.bookedCount === 0 && (await store.deleteClassSession(app.id, session.id))) report.removed++;
      continue;
    }
    have.add(key(session.templateId, session.startAt));
    const patch = changes(session, plan);
    if (patch) {
      await store.updateClassSession(app.id, session.id, { ...patch, updatedAt: now });
      report.updated++;
    }
  }
  for (const [k, plan] of wanted) {
    // Cancelled classes keep their place: a class the business called off isn't made again.
    if (have.has(k) || existing.some((s) => s.templateId === plan.template.id && s.startAt.getTime() === plan.startAt.getTime())) continue;
    const created = await store.createClassSession({
      appId: app.id,
      templateId: plan.template.id,
      serviceId: plan.template.serviceId,
      staffId: plan.template.staffId,
      serviceName: plan.serviceName,
      staffName: plan.staffName,
      startAt: plan.startAt,
      endAt: plan.endAt,
      capacity: plan.template.capacity,
      bookedCount: 0,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });
    if (created) report.created++;
  }
  return report;
}

function changes(session: ClassSession, plan: PlannedClass) {
  const want = {
    serviceId: plan.template.serviceId,
    staffId: plan.template.staffId,
    serviceName: plan.serviceName,
    staffName: plan.staffName,
    capacity: Math.max(plan.template.capacity, session.bookedCount),
  };
  const same = (Object.keys(want) as (keyof typeof want)[]).every((k) => session[k] === want[k]);
  return same && session.endAt.getTime() === plan.endAt.getTime() ? null : { ...want, endAt: plan.endAt };
}
