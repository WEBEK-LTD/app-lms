import { parsePrice, CATALOG_CURRENCIES } from "../catalog/money";
import type { BookingRules, BookingService, BookingSetup, BookingStaff, CatalogCurrency, TimeRange } from "../data/types";
import { isDate, isTimeZone, minutesOf } from "./time";

/** Checks of the Services & team page's forms, kept apart from the actions so they can be tested. */

type Values = Record<string, string>;
type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const int = (value: string | undefined) => (/^\d{1,6}$/.test(value ?? "") ? Number(value) : null);

export function parseRules(v: Values): Parsed<BookingRules> {
  const errors: Record<string, string> = {};
  if (!isTimeZone(v.timezone ?? "") || !(v.timezone ?? "").includes("/")) errors.timezone = "Choose a time zone, like Europe/Istanbul.";
  if (!CATALOG_CURRENCIES.includes(v.currency as CatalogCurrency)) errors.currency = "Choose a currency.";
  const step = int(v.slotStep);
  if (step === null || ![10, 15, 20, 30, 45, 60].includes(step)) errors.slotStep = "Choose how often times start.";
  const minHours = int(v.minHoursAhead);
  if (minHours === null || minHours > 720) errors.minHoursAhead = "Enter 0 to 720 hours.";
  const maxDays = int(v.maxDaysAhead);
  if (maxDays === null || maxDays < 1 || maxDays > 365) errors.maxDaysAhead = "Enter 1 to 365 days.";
  const cancel = v.cancelHours === "" ? null : int(v.cancelHours);
  if (v.cancelHours !== "" && (cancel === null || cancel > 720)) errors.cancelHours = "Enter 0 to 720 hours, or leave it empty.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      timezone: v.timezone!,
      currency: v.currency as CatalogCurrency,
      slotStepMinutes: step!,
      minMinutesAhead: minHours! * 60,
      maxDaysAhead: maxDays!,
      cancelBeforeMinutes: cancel === null ? null : cancel * 60,
      notes: v.notes === "on",
      autoApprove: v.autoApprove === "on",
    },
  };
}

export function parseService(v: Values, setup: BookingSetup): Parsed<Omit<BookingService, "id">> {
  const errors: Record<string, string> = {};
  const name = (v.name ?? "").trim();
  if (name.length < 2 || name.length > 80) errors.name = "Enter a name of up to 80 characters.";
  const duration = int(v.duration);
  if (duration === null || duration < 5 || duration > 720) errors.duration = "Enter 5 to 720 minutes.";
  const price = (v.price ?? "").trim() === "" ? 0 : parsePrice(v.price!);
  if (price === null) errors.price = "Enter a price, like 300, or leave it empty for free.";
  const categoryId = v.categoryId ? Number(v.categoryId) : null;
  if (categoryId !== null && !setup.categories.some((c) => c.id === categoryId)) errors.categoryId = "Choose a category.";
  const description = (v.description ?? "").trim();
  if (description.length > 2000) errors.description = "Use at most 2000 characters.";
  const color = (v.color ?? "").trim();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) errors.color = "Use a colour like #1D6B48.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, durationMinutes: duration!, priceCents: price!, categoryId, description, color: color || null, imageAssetId: null, active: v.active === "on" },
  };
}

/** One working range per weekday: `open<d>`, `start<d>` and `end<d>` (0 is Sunday). */
export function parseStaff(v: Values, setup: BookingSetup, serviceIds: number[]): Parsed<Omit<BookingStaff, "id">> {
  const errors: Record<string, string> = {};
  const name = (v.name ?? "").trim();
  if (name.length < 2 || name.length > 80) errors.name = "Enter a name of up to 80 characters.";
  const title = (v.title ?? "").trim();
  if (title.length > 80) errors.title = "Use at most 80 characters.";
  const known = new Set(setup.services.map((s) => s.id));
  const services = [...new Set(serviceIds.filter((id) => known.has(id)))];
  if (services.length === 0) errors.services = "Choose at least one service.";
  const hours: TimeRange[][] = [];
  for (let d = 0; d < 7; d += 1) {
    if (v[`open${d}`] !== "on") {
      hours.push([]);
      continue;
    }
    const start = v[`start${d}`] ?? "";
    const end = v[`end${d}`] ?? "";
    const from = minutesOf(start);
    const to = minutesOf(end);
    if (from === null || to === null || to <= from) errors.hours = "Each open day needs a start before its end, like 09:00 to 17:00.";
    hours.push([{ start, end }]);
  }
  if (!errors.hours && hours.every((h) => h.length === 0)) errors.hours = "Open at least one day.";
  const daysOff = (v.daysOff ?? "")
    .split(/[\s,]+/)
    .map((d) => d.trim())
    .filter(Boolean);
  if (daysOff.some((d) => !isDate(d)) || daysOff.length > 366) errors.daysOff = "Write dates like 2026-12-31, one per line.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, title: title || null, imageAssetId: null, serviceIds: services, hours, daysOff: [...new Set(daysOff)].sort(), active: v.active === "on" },
  };
}
