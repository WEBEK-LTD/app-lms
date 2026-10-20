import type { Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import type { DataStore } from "../data/store";
import { ACTIVE_BOOKING_STATUSES, type App, type BookingAppointment } from "../data/types";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "../hosted/notify";
import { pushTarget, sendPush, type ServiceAccount } from "../hosted/push";
import { freeTimes, staffFor, type FreeSlot } from "./availability";
import { busyTimes } from "./busy";
import { bookingSetup } from "./setup";
import { isDate, utcToLocal } from "./time";

/**
 * 61 Moving an appointment to another time, for Dashboard › Appointments
 * and the Owner API (Yallapp Business) alike: only the times booking in the
 * app would offer for its service (the staff's hours and days off, their
 * other appointments and classes, the business's minimum notice and how far
 * ahead it takes bookings), checked and written as one step. The customer is
 * told as a class called off is: in the app's inbox and on their phones when
 * push is on, in the app's language.
 */

export interface MoveDeps {
  store: DataStore;
  app: App;
  now: Date;
  /** The app's push account (null: the inbox only). */
  account: ServiceAccount | null;
  send?: typeof sendPush;
}

export type MoveResult =
  | { ok: true; appointment: BookingAppointment; notified: boolean; pushed: number }
  | { ok: false; code: "invalid_status" | "not_bookable" | "invalid_request" | "slot_taken"; message: string };

/** Pending and approved appointments that haven't started can move. */
export function canReschedule(appointment: Pick<BookingAppointment, "status" | "startAt">, now: Date): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(appointment.status) && appointment.startAt.getTime() > now.getTime();
}

export interface MoveTimes {
  timeZone: string;
  /** Who can take the service (the appointment's own staff member first). */
  staff: { id: number; name: string }[];
  days: { date: string; slots: FreeSlot[] }[];
}

/** The free times for the appointment's service from `from` (its local date), for `days` days; null when its service can't be booked any more. */
export async function rescheduleTimes(
  deps: Pick<MoveDeps, "store" | "app" | "now">,
  appointment: BookingAppointment,
  input: { from?: string | null; days?: number; staffId?: number | null },
): Promise<MoveTimes | null> {
  const setup = bookingSetup(deps.app);
  const zone = setup.rules.timezone;
  const service = setup.services.find((s) => s.id === appointment.serviceId && s.active);
  if (!service) return null;
  const today = utcToLocal(deps.now, zone).date;
  const from = input.from && isDate(input.from) && input.from >= today ? input.from : today;
  const days = Math.min(14, Math.max(1, input.days ?? 7));
  const people = staffFor(setup, service.id);
  const staff = [...people.filter((s) => s.id === appointment.staffId), ...people.filter((s) => s.id !== appointment.staffId)].map((s) => ({ id: s.id, name: s.name }));
  const staffId = input.staffId !== undefined && input.staffId !== null && people.some((s) => s.id === input.staffId) ? input.staffId : null;
  const busy = await busyTimes(deps.store, deps.app.id, setup, from, days, appointment.id);
  return { timeZone: zone, staff, days: freeTimes({ setup, serviceId: service.id, staffId, from, days, now: deps.now, appointments: busy }) };
}

/**
 * Moves the appointment to `start` with `staffId` (null: its own staff
 * member when free then, else the first who is). Same status; the customer
 * is told.
 */
export async function rescheduleAppointment(deps: MoveDeps, appointment: BookingAppointment, input: { start: Date; staffId: number | null }): Promise<MoveResult> {
  const { store, app, now } = deps;
  if (!canReschedule(appointment, now)) return { ok: false, code: "invalid_status", message: "This appointment can't be moved." };
  if (Number.isNaN(input.start.getTime())) return { ok: false, code: "invalid_request", message: "Choose a time." };
  const setup = bookingSetup(app);
  const service = setup.services.find((s) => s.id === appointment.serviceId && s.active);
  if (!service) return { ok: false, code: "not_bookable", message: "This service can't be booked any more, so the appointment can't be moved." };
  const people = staffFor(setup, service.id);
  if (input.staffId !== null && !people.some((s) => s.id === input.staffId)) {
    return { ok: false, code: "invalid_request", message: "This staff member doesn't provide this service." };
  }
  const date = utcToLocal(input.start, setup.rules.timezone).date;
  const [day] = freeTimes({
    setup,
    serviceId: service.id,
    staffId: input.staffId,
    from: date,
    days: 1,
    now,
    appointments: await busyTimes(store, app.id, setup, date, 1, appointment.id),
  });
  const slot = day?.slots.find((s) => s.start.getTime() === input.start.getTime());
  if (!slot) return { ok: false, code: "slot_taken", message: "This time isn't free. Please choose another one." };
  const order = input.staffId !== null ? [input.staffId] : [...slot.staffIds.filter((id) => id === appointment.staffId), ...slot.staffIds.filter((id) => id !== appointment.staffId)];
  for (const staffId of order) {
    const member = people.find((s) => s.id === staffId);
    if (!member || !slot.staffIds.includes(staffId)) continue;
    const moved = await store.moveBookingAppointment(app.id, appointment.id, { staffId, staffName: member.name, startAt: slot.start, endAt: slot.end, updatedAt: now });
    if (!moved) continue;
    const saved = (await store.getBookingAppointment(app.id, appointment.id))!;
    const unchanged = saved.startAt.getTime() === appointment.startAt.getTime() && saved.staffId === appointment.staffId;
    const told = unchanged ? { notified: false, pushed: 0 } : await tellCustomer(deps, saved, setup.rules.timezone);
    return { ok: true, appointment: saved, ...told };
  }
  return { ok: false, code: "slot_taken", message: "This time isn't free. Please choose another one." };
}

/** What the customer reads, in the app's language (English, Arabic or Turkish; English otherwise). */
export function movedMessage(lang: Lang, appointment: Pick<BookingAppointment, "serviceName" | "staffName" | "startAt">, timeZone: string): { title: string; body: string } {
  const when = formatDate(lang, appointment.startAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
  const { serviceName: service, staffName: staff } = appointment;
  switch (lang) {
    case "ar":
      return { title: "تم تغيير موعدك", body: `موعدك (${service}) مع ${staff} أصبح في ${when}.` };
    case "tr":
      return { title: "Randevunuzun saati değişti", body: `${staff} ile ${service} randevunuz artık ${when}.` };
    default:
      return { title: "Your appointment moved", body: `Your ${service} with ${staff} is now on ${when}.` };
  }
}

/** The app's main language (its published pages', else the draft's), when it is one we write. */
async function appLang(store: Pick<DataStore, "getAppLayout">, appId: string): Promise<Lang> {
  const layout = await store.getAppLayout(appId);
  const lang = (layout?.published ?? layout?.draft)?.languages.default;
  return lang === "ar" || lang === "tr" ? lang : "en";
}

async function tellCustomer(deps: MoveDeps, appointment: BookingAppointment, timeZone: string): Promise<{ notified: boolean; pushed: number }> {
  const { store, app, now } = deps;
  if (appointment.userId === null) return { notified: false, pushed: 0 };
  const message = movedMessage(await appLang(store, app.id), appointment, timeZone);
  const title = message.title.slice(0, NOTIFICATION_TITLE_MAX);
  const body = message.body.slice(0, NOTIFICATION_BODY_MAX);
  const notification = await store.createHostedNotification({ appId: app.id, userId: appointment.userId, title, body, createdAt: now });
  if (!deps.account) return { notified: true, pushed: 0 };
  const tokens = (await store.listHostedPushDevices(app.id, [appointment.userId])).map(pushTarget);
  if (tokens.length === 0) return { notified: true, pushed: 0 };
  try {
    const result = await (deps.send ?? sendPush)(deps.account, tokens, { title, body, data: { type: "announcement", notification_id: String(notification.id), appointment_id: String(appointment.id) } }, { now });
    for (const token of result.invalidTokens) await store.clearHostedPushToken(app.id, token);
    return { notified: true, pushed: result.sent };
  } catch {
    // The inbox has it either way.
    return { notified: true, pushed: 0 };
  }
}
