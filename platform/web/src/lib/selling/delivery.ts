import { addDays, isDate, isTimeZone, minutesOf, utcToLocal } from "../bookings/time";
import { centsToDecimal, formatCents, parsePrice } from "../catalog/money";
import type { App, CatalogCurrency, DeliveryScheduleSettings, DeliverySlot } from "../data/types";

/**
 * 131 Same-day and next-day delivery for every store app (the flower shop
 * first): the owner turns on today until a cut-off, tomorrow, the days ahead
 * allowed and the closed weekdays, and the time slots, each with an optional
 * capacity and fee. It extends the store's `delivery_date`
 * (`StoreConfig.delivery_date`): older apps that only know the date still
 * work, and the server checks the cut-off, the day and the slot in the
 * shop's time zone whatever the app sends.
 */

export const DELIVERY_LIMITS = { maxDays: 60, slots: 8, capacity: 10_000, feeCents: 100_000_00 } as const;

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const SLOT_ID = /^s[0-9]{1,3}$/;

/** The form's starting point: today until 14:00, tomorrow, two weeks ahead, three slots (the owner changes them). */
export const DEFAULT_DELIVERY: DeliveryScheduleSettings = {
  enabled: false,
  required: true,
  sameDay: true,
  cutoff: "14:00",
  nextDay: true,
  maxDays: 14,
  closedWeekdays: [],
  timezone: "Europe/Istanbul",
  slots: [
    { id: "s1", start: "10:00", end: "13:00", capacity: null, feeCents: null },
    { id: "s2", start: "13:00", end: "16:00", capacity: null, feeCents: null },
    { id: "s3", start: "16:00", end: "20:00", capacity: null, feeCents: null },
  ],
};

/**
 * The shop's delivery days and slots when they are on; null when off. The
 * gift checkout (`gift`) always asks for the day and the slot: they are on
 * and required there, with the form's starting slots until the owner saves
 * their own.
 */
export function deliveryOf(app: Pick<App, "catalogSettings" | "vertical">, gift = false): DeliveryScheduleSettings | null {
  // A restaurant's orders are for a time its kitchen takes them (26), never a delivery day.
  if (app.vertical === "restaurant") return null;
  const saved = app.catalogSettings?.delivery;
  if (gift) {
    const base = { ...DEFAULT_DELIVERY, ...(saved ?? {}) };
    return { ...base, enabled: true, required: true, slots: base.slots?.length ? base.slots : DEFAULT_DELIVERY.slots };
  }
  if (!saved?.enabled) return null;
  return { ...DEFAULT_DELIVERY, ...saved, slots: saved.slots ?? [] };
}

/** The first day offered, in days from today: 0 with same-day delivery, 1 with next-day, else 2. */
export function minDaysOf(s: Pick<DeliveryScheduleSettings, "sameDay" | "nextDay">): number {
  return s.sameDay ? 0 : s.nextDay ? 1 : 2;
}

/** "10:00–13:00". */
export function slotLabel(slot: Pick<DeliverySlot, "start" | "end">): string {
  return `${slot.start}–${slot.end}`;
}

/** Today in the shop's time zone, and the minutes past midnight there. */
export function shopToday(s: Pick<DeliveryScheduleSettings, "timezone">, now: Date): { date: string; minutes: number } {
  const local = utcToLocal(now, s.timezone);
  return { date: local.date, minutes: minutesOf(local.time) ?? 0 };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export type DayCheck = { ok: true } | { ok: false; reason: "invalid" | "closed" | "cutoff" | "too_soon" | "too_far" };

/** Whether the shop delivers on `date` (YYYY-MM-DD, its time zone), asked at `now`. */
export function dayOpen(s: DeliveryScheduleSettings, date: string, now: Date): DayCheck {
  if (!isDate(date)) return { ok: false, reason: "invalid" };
  const today = shopToday(s, now);
  const days = daysBetween(today.date, date);
  if (days < minDaysOf(s)) return { ok: false, reason: "too_soon" };
  if (days > s.maxDays) return { ok: false, reason: "too_far" };
  if (s.closedWeekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay())) return { ok: false, reason: "closed" };
  if (days === 0 && s.cutoff !== null && today.minutes >= (minutesOf(s.cutoff) ?? 24 * 60)) return { ok: false, reason: "cutoff" };
  return { ok: true };
}

/** A slot of today is taken until it starts; a later day's always. */
export function slotStarted(s: DeliveryScheduleSettings, slot: DeliverySlot, date: string, now: Date): boolean {
  const today = shopToday(s, now);
  return date === today.date && today.minutes >= (minutesOf(slot.start) ?? 0);
}

const money = (cents: number, currency: string) => formatCents(cents, currency as CatalogCurrency);

/** One slot as the app gets it (`DeliverySlot` in the contract). `fees`: whether the fee is charged (Yallapp's own checkout). */
export function slotJson(slot: DeliverySlot, currency: string, fees: boolean) {
  const fee = fees && slot.feeCents ? slot.feeCents : null;
  return {
    id: slot.id,
    start: slot.start,
    end: slot.end,
    label: slotLabel(slot),
    fee: fee !== null ? centsToDecimal(fee) : null,
    fee_formatted: fee !== null ? money(fee, currency) : null,
    capacity: slot.capacity,
  };
}

/** `StoreConfig.delivery_date`: the date as before, with the time zone, the cut-off and the slots. */
export function deliveryConfigJson(s: DeliveryScheduleSettings | null, currency: string, fees: boolean) {
  if (!s) return { enabled: false, required: false, min_days: 0, max_days: 0, closed_weekdays: [] as number[] };
  return {
    enabled: true,
    required: s.required,
    min_days: minDaysOf(s),
    max_days: Math.max(minDaysOf(s), s.maxDays),
    closed_weekdays: [...s.closedWeekdays].sort((a, b) => a - b),
    timezone: s.timezone,
    same_day_cutoff: s.sameDay ? s.cutoff : null,
    slots: s.slots.map((slot) => slotJson(slot, currency, fees)),
  };
}

/** How many orders each slot of a day has (by slot id; "" those without a slot). */
export type SlotCounts = Record<string, number>;

/** `GET /store/delivery-slots`: the day, whether it is open, each slot with whether it can still be chosen. */
export function deliverySlotsJson(s: DeliveryScheduleSettings, date: string, counts: SlotCounts, now: Date, currency: string, fees: boolean) {
  const open = dayOpen(s, date, now);
  return {
    date,
    open: open.ok,
    reason: open.ok ? null : open.reason,
    slots: s.slots.map((slot) => {
      const used = counts[slot.id] ?? 0;
      const remaining = slot.capacity !== null ? Math.max(0, slot.capacity - used) : null;
      const started = slotStarted(s, slot, date, now);
      return { ...slotJson(slot, currency, fees), available: open.ok && !started && remaining !== 0, full: remaining === 0, remaining };
    }),
  };
}

const DAY_MESSAGES: Record<Exclude<DayCheck, { ok: true }>["reason"], string> = {
  invalid: "Choose a valid delivery date.",
  closed: "The shop doesn't deliver on that day. Please choose another day.",
  cutoff: "Orders for today have closed. Please choose another day.",
  too_soon: "That day is too soon. Please choose a later day.",
  too_far: "That day is too far ahead. Please choose an earlier day.",
};

export type DeliveryChoice =
  | { ok: true; date: string | null; slot: DeliverySlot | null; feeCents: number }
  | { ok: false; status: number; code: string; message: string };

/**
 * The checkout's `delivery_date` and `delivery_slot`, checked: an open day
 * (the cut-off counted), a slot of the shop's not started yet and not full.
 * `counts` gives a day's orders by slot. A shop without delivery days takes
 * none (older apps sent none).
 */
export async function checkDelivery(
  s: DeliveryScheduleSettings | null,
  body: unknown,
  now: Date,
  counts: (date: string) => Promise<SlotCounts>,
  fees: boolean,
): Promise<DeliveryChoice> {
  const input = (body ?? {}) as { delivery_date?: unknown; delivery_slot?: unknown };
  const rawDate = typeof input.delivery_date === "string" ? input.delivery_date.trim() : "";
  const rawSlot = typeof input.delivery_slot === "string" ? input.delivery_slot.trim() : "";
  if (!s) return { ok: true, date: null, slot: null, feeCents: 0 };
  const bad = (message: string, code = "invalid_request", status = 400): DeliveryChoice => ({ ok: false, status, code, message });
  if (rawDate === "") {
    if (s.required) return bad("Choose a delivery date.");
    return { ok: true, date: null, slot: null, feeCents: 0 };
  }
  const day = dayOpen(s, rawDate, now);
  if (!day.ok) return bad(DAY_MESSAGES[day.reason]);
  if (s.slots.length === 0) return { ok: true, date: rawDate, slot: null, feeCents: 0 };
  if (rawSlot === "") return bad("Choose a delivery time.");
  const slot = s.slots.find((x) => x.id === rawSlot);
  if (!slot) return bad("Choose one of the shop's delivery times.");
  if (slotStarted(s, slot, rawDate, now)) return bad("That delivery time has started. Please choose a later one.");
  if (slot.capacity !== null) {
    const used = (await counts(rawDate))[slot.id] ?? 0;
    if (used >= slot.capacity) return bad("That delivery time is full. Please choose another time or day.", "slot_full", 409);
  }
  return { ok: true, date: rawDate, slot, feeCents: fees && slot.feeCents ? slot.feeCents : 0 };
}

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/**
 * The dashboard's Delivery days form: `slotStart{i}`, `slotEnd{i}`,
 * `slotCapacity{i}`, `slotFee{i}` for each row (an empty start drops it),
 * `closed{0-6}`, and the switches.
 */
export function parseDeliveryForm(v: Record<string, string>, current: DeliveryScheduleSettings | null): Parsed<DeliveryScheduleSettings> {
  const errors: Record<string, string> = {};
  const on = (name: string) => v[name] === "on";
  const timezone = (v.timezone ?? "").trim() || current?.timezone || DEFAULT_DELIVERY.timezone;
  if (!isTimeZone(timezone)) errors.timezone = "Choose a time zone.";
  const sameDay = on("sameDay");
  const cutoffText = (v.cutoff ?? "").trim();
  if (cutoffText !== "" && !TIME.test(cutoffText)) errors.cutoff = "Enter a time like 14:00, or leave it empty for all day.";
  const maxDays = Number((v.maxDays ?? "").trim());
  if (!Number.isInteger(maxDays) || maxDays < 0 || maxDays > DELIVERY_LIMITS.maxDays) errors.maxDays = `Enter a number of days from 0 to ${DELIVERY_LIMITS.maxDays}.`;
  const nextDay = on("nextDay");
  if (Number.isInteger(maxDays) && maxDays < minDaysOf({ sameDay, nextDay })) errors.maxDays = "The days ahead must reach the first day you deliver.";
  const closedWeekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => on(`closed${d}`));
  if (closedWeekdays.length === 7) errors.closed = "Leave at least one day open.";
  const slots: DeliverySlot[] = [];
  const used = new Set<string>();
  const submitted = new Set(Array.from({ length: DELIVERY_LIMITS.slots }, (_, i) => (v[`slotId${i}`] ?? "").trim()).filter((id) => SLOT_ID.test(id)));
  for (let i = 0; i < DELIVERY_LIMITS.slots; i += 1) {
    const start = (v[`slotStart${i}`] ?? "").trim();
    const end = (v[`slotEnd${i}`] ?? "").trim();
    if (start === "" && end === "") continue;
    if (!TIME.test(start) || !TIME.test(end) || (minutesOf(end) ?? 0) <= (minutesOf(start) ?? 0)) {
      errors[`slot${i}`] = "Enter a start and an end like 10:00 and 13:00, the end after the start.";
      continue;
    }
    const capText = (v[`slotCapacity${i}`] ?? "").trim();
    const capacity = capText === "" ? null : Number(capText);
    if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > DELIVERY_LIMITS.capacity)) {
      errors[`slot${i}`] = "Enter how many orders it takes, or leave it empty for no limit.";
      continue;
    }
    const feeText = (v[`slotFee${i}`] ?? "").trim();
    const feeCents = feeText === "" ? null : parsePrice(feeText);
    if (feeText !== "" && (feeCents === null || feeCents > DELIVERY_LIMITS.feeCents)) {
      errors[`slot${i}`] = "Enter a fee like 25, or leave it empty for free.";
      continue;
    }
    // A saved slot keeps its id, so orders made for it still match it; a new one takes the first free.
    let id = (v[`slotId${i}`] ?? "").trim();
    if (!SLOT_ID.test(id) || used.has(id)) {
      let n = 1;
      while (used.has(`s${n}`) || submitted.has(`s${n}`)) n += 1;
      id = `s${n}`;
    }
    used.add(id);
    slots.push({ id, start, end, capacity, feeCents: feeCents && feeCents > 0 ? feeCents : null });
  }
  slots.sort((a, b) => (minutesOf(a.start) ?? 0) - (minutesOf(b.start) ?? 0));
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { enabled: on("enabled"), required: on("required"), sameDay, cutoff: sameDay && cutoffText !== "" ? cutoffText : null, nextDay, maxDays, closedWeekdays, timezone, slots },
  };
}

/** A delivery day as people read it: "Fri 15 Nov" in the language. */
export function deliveryDayLabel(date: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : lang === "tr" ? "tr-TR" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

/** The days after `date`, for tests and the dashboard. */
export function nextDays(date: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(date, i));
}
