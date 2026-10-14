import { isDate, isTimeZone, localToUtc, utcToLocal } from "../bookings/time";
import { CATALOG_CURRENCIES, parsePrice } from "../catalog/money";
import type { CatalogCurrency, EventInput, EventSettings, TicketTypeInput } from "../data/types";
import { plainText } from "../news/html";
import { MAX_TICKETS_PER_ORDER } from "./service";

/** 28 Checks of the dashboard's event, ticket type and settings forms. */

export const EVENT_TITLE_MAX = 150;
export const EVENT_CATEGORY_MAX = 60;
export const EVENT_DESCRIPTION_MAX = 50_000;
export const EVENT_ORGANISER_MAX = 120;
export const EVENT_VENUE_MAX = 150;
export const EVENT_ADDRESS_MAX = 250;
export const EVENT_IMAGES_MAX = 6;
export const EVENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TICKET_TYPE_NAME_MAX = 80;
export const TICKET_TYPES_MAX = 10;
export const CAPACITY_MAX = 1_000_000;
export const CANCEL_HOURS_MAX = 720;

type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** "2026-10-20T20:30" from a datetime-local field, as an instant in the time zone; null when it isn't one. */
export function readLocalDateTime(value: string, timeZone: string): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!m || !isDate(m[1]!)) return null;
  const [h, min] = m[2]!.split(":").map(Number) as [number, number];
  if (h > 23 || min > 59) return null;
  return localToUtc(m[1]!, m[2]!, timeZone);
}

/** An instant as a datetime-local field's value in the time zone. */
export function localDateTimeValue(at: Date | null, timeZone: string): string {
  if (!at) return "";
  const local = utcToLocal(at, timeZone);
  return `${local.date}T${local.time}`;
}

function readCapacity(value: string): number | null | "invalid" {
  const text = value.trim().replace(/[\s,.]/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isInteger(n) && n >= 1 && n <= CAPACITY_MAX ? n : "invalid";
}

export type EventFields = Pick<
  EventInput,
  "title" | "description" | "category" | "startAt" | "endAt" | "venueName" | "venueAddress" | "latitude" | "longitude" | "onlineUrl" | "organiser" | "capacity"
>;

/** The event's fields from the form (times in the organiser's time zone). */
export function parseEventForm(values: Record<string, string>, timeZone: string): Result<EventFields> {
  const v = (name: string) => (values[name] ?? "").trim().replace(/\s+/g, " ");
  const errors: Record<string, string> = {};
  const title = v("title");
  if (!title) errors.title = "Enter a title.";
  else if (title.length > EVENT_TITLE_MAX) errors.title = `Use at most ${EVENT_TITLE_MAX} characters.`;
  const category = v("category");
  if (category.length > EVENT_CATEGORY_MAX) errors.category = `Use at most ${EVENT_CATEGORY_MAX} characters.`;
  const description = (values.description ?? "").replace(/\r\n?/g, "\n").trim();
  if (!description || !plainText(description)) errors.description = "Describe the event.";
  else if (description.length > EVENT_DESCRIPTION_MAX) errors.description = `Use at most ${EVENT_DESCRIPTION_MAX.toLocaleString("en-GB")} characters.`;
  const organiser = v("organiser");
  if (organiser.length > EVENT_ORGANISER_MAX) errors.organiser = `Use at most ${EVENT_ORGANISER_MAX} characters.`;
  const startAt = readLocalDateTime(values.startAt ?? "", timeZone);
  const endAt = readLocalDateTime(values.endAt ?? "", timeZone);
  if (!startAt) errors.startAt = "Choose when it starts.";
  if (!endAt) errors.endAt = "Choose when it ends.";
  else if (startAt && endAt.getTime() <= startAt.getTime()) errors.endAt = "It must end after it starts.";
  const venueName = v("venueName");
  const venueAddress = v("venueAddress");
  if (venueName.length > EVENT_VENUE_MAX) errors.venueName = `Use at most ${EVENT_VENUE_MAX} characters.`;
  if (venueAddress.length > EVENT_ADDRESS_MAX) errors.venueAddress = `Use at most ${EVENT_ADDRESS_MAX} characters.`;
  if (venueAddress && !venueName) errors.venueName = "Name the venue too.";
  const lat = v("latitude");
  const lng = v("longitude");
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (lat || lng) {
    latitude = Number(lat.replace(",", "."));
    longitude = Number(lng.replace(",", "."));
    if (!lat || !Number.isFinite(latitude) || Math.abs(latitude) > 90) errors.latitude = "Enter a latitude between -90 and 90, like 40.9837.";
    if (!lng || !Number.isFinite(longitude) || Math.abs(longitude) > 180) errors.longitude = "Enter a longitude between -180 and 180, like 29.0262.";
    if (!venueName) errors.venueName = "The map position is the venue's: name the venue too.";
  }
  const onlineUrl = v("onlineUrl");
  if (onlineUrl) {
    let ok = onlineUrl.length <= 500;
    try {
      ok = ok && new URL(onlineUrl).protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok) errors.onlineUrl = "Paste the full https:// link to join.";
  }
  if (!venueName && !onlineUrl && !errors.venueName) errors.venueName = "Give the venue, or an online link for an online event.";
  const capacity = readCapacity(values.capacity ?? "");
  if (capacity === "invalid") errors.capacity = `Enter a whole number from 1 to ${CAPACITY_MAX.toLocaleString("en-GB")}, or leave it empty for no limit.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      description,
      category: category || null,
      startAt: startAt!,
      endAt: endAt!,
      venueName: venueName || null,
      venueAddress: venueName ? venueAddress || null : null,
      latitude: venueName ? latitude : null,
      longitude: venueName ? longitude : null,
      onlineUrl: onlineUrl || null,
      organiser: organiser || null,
      capacity: capacity as number | null,
    },
  };
}

export type TicketTypeFields = Pick<TicketTypeInput, "name" | "priceCents" | "capacity" | "saleEndsAt" | "maxPerOrder">;

export function parseTicketTypeForm(values: Record<string, string>, timeZone: string): Result<TicketTypeFields> {
  const errors: Record<string, string> = {};
  const name = (values.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Name the ticket, like Standard or Student.";
  else if (name.length > TICKET_TYPE_NAME_MAX) errors.name = `Use at most ${TICKET_TYPE_NAME_MAX} characters.`;
  const priceText = (values.price ?? "").trim();
  const priceCents = priceText === "" ? 0 : parsePrice(priceText);
  if (priceCents === null) errors.price = "Enter a price like 150 or 149.90, or 0 for free tickets.";
  else if (priceCents > 0 && priceCents < 100) errors.price = "Paid tickets cost at least 1.00.";
  const capacity = readCapacity(values.capacity ?? "");
  if (capacity === "invalid") errors.capacity = "Enter a whole number, or leave it empty for no limit.";
  const saleEndsText = (values.saleEndsAt ?? "").trim();
  const saleEndsAt = saleEndsText ? readLocalDateTime(saleEndsText, timeZone) : null;
  if (saleEndsText && !saleEndsAt) errors.saleEndsAt = "Choose a day and time, or leave it empty.";
  const maxText = (values.maxPerOrder ?? "").trim();
  const maxPerOrder = maxText === "" ? 10 : Number(maxText);
  if (!Number.isInteger(maxPerOrder) || maxPerOrder < 1 || maxPerOrder > MAX_TICKETS_PER_ORDER) {
    errors.maxPerOrder = `Enter a whole number from 1 to ${MAX_TICKETS_PER_ORDER}.`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, priceCents: priceCents!, capacity: capacity as number | null, saleEndsAt, maxPerOrder } };
}

export function parseEventSettings(values: Record<string, string>): Result<EventSettings> {
  const errors: Record<string, string> = {};
  const currency = (values.currency ?? "").trim() as CatalogCurrency;
  if (!CATALOG_CURRENCIES.includes(currency)) errors.currency = "Choose a currency.";
  const timeZone = (values.timeZone ?? "").trim();
  if (!timeZone || !isTimeZone(timeZone)) errors.timeZone = "Choose a time zone, like Europe/Istanbul.";
  const cancelText = (values.allowCancelHours ?? "").trim();
  const allowCancel = values.allowCancel === "on";
  const hours = cancelText === "" ? 0 : Number(cancelText);
  if (allowCancel && (!Number.isInteger(hours) || hours < 0 || hours > CANCEL_HOURS_MAX)) {
    errors.allowCancelHours = `Enter a whole number of hours from 0 to ${CANCEL_HOURS_MAX}.`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { currency, timeZone, showMap: values.showMap === "on", allowCancelHours: allowCancel ? hours : null } };
}

/** Tickets as a spreadsheet (RFC 4180): a cell starting with =, +, - or @ is quoted with a ' first, so spreadsheets never run it. */
export function csv(rows: (string | number | null)[][]): string {
  const cell = (value: string | number | null) => {
    let text = value === null ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
