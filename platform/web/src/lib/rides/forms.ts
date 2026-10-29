import { CATALOG_CURRENCIES, centsToDecimal, parsePrice } from "../catalog/money";
import type { CatalogCurrency, DeliverySettings, DriverDetails, RideArea, RidePromo, RidesSettings, VehicleType } from "../data/types";
import { RIDE_FARE_MODES, RIDE_MATCHINGS } from "../data/types";
import { FOOD_TIMEZONES } from "../delivery/forms";
import { DELIVERY_LIMITS } from "../delivery/settings";
import { parseAnyPhone } from "../hosted/phone";
import { DEFAULT_RIDES_TIMEZONE, RIDES_LIMITS, ridesSettingsOf } from "./settings";

/**
 * 105.2 The dashboard's ride forms, checked: a vehicle type and its fares, a
 * driver and their car, the company's ride settings (areas and promo codes
 * as lines of text). Messages are English; the dashboard translates them
 * (`rides.known`). Every amount is the company's.
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

/** The icons a vehicle type may have (Material Symbols Rounded). */
export const VEHICLE_ICONS = ["directions_car", "local_taxi", "airport_shuttle", "two_wheeler", "electric_car", "accessible", "directions_bus", "electric_rickshaw"] as const;

function money(form: Record<string, string>, name: string, errors: Record<string, string>): number {
  const text = str(form, name);
  if (!text) return 0;
  const cents = parsePrice(text);
  if (cents === null || cents > RIDES_LIMITS.maxCents) {
    errors[name] = "Enter an amount, like 15 or 15.50.";
    return 0;
  }
  return cents;
}

/** A whole number from `min` to `max`, or the error. */
function whole(form: Record<string, string>, name: string, min: number, max: number, errors: Record<string, string>, message: string): number {
  const n = Number(str(form, name));
  if (!str(form, name) || !Number.isInteger(n) || n < min || n > max) {
    errors[name] = message;
    return min;
  }
  return n;
}

/** "20", "20%", "12,5": a share in basis points, or null when it isn't one from 0 to 50%. */
export function shareBp(text: string): number | null {
  const percent = Number(text.replaceAll(",", ".").replaceAll("%", "").trim() || "0");
  const bp = Math.round(percent * 100);
  return Number.isFinite(percent) && percent >= 0 && bp <= 5000 ? bp : null;
}

export const shareText = (bp: number | null) => (bp === null ? "" : String(bp / 100));

// Vehicle types

export type VehicleTypeForm = Pick<VehicleType, "name" | "description" | "icon" | "seats" | "baseCents" | "perKmCents" | "perMinuteCents" | "minCents" | "waitPerMinuteCents" | "active">;

export function parseVehicleTypeForm(form: Record<string, string>): Parsed<VehicleTypeForm> {
  const errors: Record<string, string> = {};
  const name = str(form, "name");
  if (!name) errors.name = "Name the vehicle type, like Economy or Comfort.";
  else if (name.length > RIDES_LIMITS.vehicleTypeName) errors.name = `Keep the name under ${RIDES_LIMITS.vehicleTypeName} characters.`;
  const description = str(form, "description");
  if (description.length > RIDES_LIMITS.vehicleTypeDescription) errors.description = `Keep it under ${RIDES_LIMITS.vehicleTypeDescription} characters.`;
  const icon = VEHICLE_ICONS.find((i) => i === str(form, "icon")) ?? "directions_car";
  const seats = whole(form, "seats", 1, 60, errors, "Enter the seats, from 1 to 60.");
  const baseCents = money(form, "base", errors);
  const perKmCents = money(form, "perKm", errors);
  const perMinuteCents = money(form, "perMinute", errors);
  const minCents = money(form, "min", errors);
  const waitPerMinuteCents = money(form, "waitPerMinute", errors);
  if (!errors.base && !errors.perKm && !errors.min && baseCents === 0 && perKmCents === 0 && perMinuteCents === 0 && minCents === 0) {
    errors.base = "Enter the fares: a start, per km, per minute or a smallest fare.";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, description: description || null, icon, seats, baseCents, perKmCents, perMinuteCents, minCents, waitPerMinuteCents, active: form.active === "on" } };
}

export function vehicleTypeFormValues(type: VehicleType | null): Record<string, string> {
  const amount = (cents: number | undefined) => (cents ? centsToDecimal(cents) : "");
  return {
    name: type?.name ?? "",
    description: type?.description ?? "",
    icon: type?.icon ?? "directions_car",
    seats: String(type?.seats ?? 4),
    base: amount(type?.baseCents),
    perKm: amount(type?.perKmCents),
    perMinute: amount(type?.perMinuteCents),
    min: amount(type?.minCents),
    waitPerMinute: amount(type?.waitPerMinuteCents),
    active: type === null || type.active ? "on" : "",
  };
}

// Drivers

export interface DriverForm {
  name: string;
  phone: string | null;
  email: string | null;
  vehicleTypeId: number | null;
  carModel: string | null;
  carColor: string | null;
  plate: string | null;
  commissionBp: number | null;
}

/** A driver: a mobile number (or an email for apps that sign in by email only), their vehicle type and car, their own share or the company's. */
export function parseDriverForm(form: Record<string, string>, defaultCountryCode: string, emailOnly: boolean, typeIds: number[]): Parsed<DriverForm> {
  const errors: Record<string, string> = {};
  const name = str(form, "name");
  if (!name) errors.name = "Enter the driver's name.";
  else if (name.length > DELIVERY_LIMITS.courierName) errors.name = `Keep the name under ${DELIVERY_LIMITS.courierName} characters.`;
  const phoneText = str(form, "phone");
  const phone = phoneText ? parseAnyPhone(phoneText, defaultCountryCode) : null;
  if (phoneText && !phone) errors.phone = "Enter a valid mobile number.";
  const email = str(form, "email").toLowerCase();
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191)) errors.email = "Enter a valid email address, or leave it empty.";
  if (!phoneText && !email) errors[emailOnly ? "email" : "phone"] = emailOnly ? "Enter the email the driver signs in with." : "Enter the mobile number the driver signs in with.";
  const typeText = str(form, "vehicleTypeId");
  const vehicleTypeId = typeText ? Number(typeText) : null;
  if (vehicleTypeId !== null && !typeIds.includes(vehicleTypeId)) errors.vehicleTypeId = "Choose one of your vehicle types.";
  const car = (field: string, max: number) => {
    const value = str(form, field);
    if (value.length > max) errors[field] = `Keep it under ${max} characters.`;
    return value || null;
  };
  const carModel = car("carModel", RIDES_LIMITS.carField);
  const carColor = car("carColor", RIDES_LIMITS.carField);
  const plate = car("plate", RIDES_LIMITS.plate);
  const shareTextValue = str(form, "share");
  const commissionBp = shareTextValue ? shareBp(shareTextValue) : null;
  if (shareTextValue && commissionBp === null) errors.share = "Enter the share from 0 to 50%, or leave it empty for your usual share.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, phone: phone?.e164 ?? null, email: email || null, vehicleTypeId, carModel, carColor, plate, commissionBp } };
}

export function driverFormValues(courier: { name: string; phone: string | null; email: string | null; driver?: DriverDetails | null } | null): Record<string, string> {
  const d = courier?.driver;
  return {
    name: courier?.name ?? "",
    phone: courier?.phone ?? "",
    email: courier?.email ?? "",
    vehicleTypeId: d?.vehicleTypeId ? String(d.vehicleTypeId) : "",
    carModel: d?.carModel ?? "",
    carColor: d?.carColor ?? "",
    plate: d?.plate ?? "",
    share: shareText(d?.commissionBp ?? null),
  };
}

// Areas and promo codes, a line each

/** "Cairo, 30.0444, 31.2357, 25" lines. */
export function areasText(areas: RideArea[]): string {
  return areas.map((a) => `${a.name}, ${a.lat}, ${a.lng}, ${a.radiusKm}`).join("\n");
}

export function parseAreas(text: string, saved: RideArea[]): { areas: RideArea[]; error: string | null } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > RIDES_LIMITS.areas) return { areas: [], error: `Add up to ${RIDES_LIMITS.areas} areas.` };
  const used = new Set(saved.map((a) => a.id));
  const areas: RideArea[] = [];
  let next = 1;
  for (const raw of lines) {
    // An Arabic comma works too.
    const parts = raw.replaceAll("،", ",").split(",").map((p) => p.trim());
    const [name, latText, lngText, radiusText] = parts;
    const lat = Number(latText);
    const lng = Number(lngText);
    const radiusKm = Number(radiusText);
    if (
      parts.length !== 4 ||
      !name ||
      name.length > RIDES_LIMITS.areaName ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 90 ||
      !Number.isFinite(lng) ||
      Math.abs(lng) > 180 ||
      !Number.isFinite(radiusKm) ||
      radiusKm <= 0 ||
      radiusKm > RIDES_LIMITS.maxRadiusKm
    ) {
      return { areas: [], error: `Write each area on its own line as its name, the latitude and longitude of its centre and how far it reaches in km, like "Cairo, 30.0444, 31.2357, 25". Check: ${raw.slice(0, 60)}` };
    }
    if (areas.some((a) => a.name.toLowerCase() === name.toLowerCase())) return { areas: [], error: `"${name}" is there twice.` };
    let id = saved.find((a) => a.name.toLowerCase() === name.toLowerCase())?.id;
    if (!id) {
      while (used.has(`a${next}`)) next++;
      id = `a${next}`;
      used.add(id);
    }
    areas.push({ id, name, lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, radiusKm: Math.round(radiusKm * 10) / 10 });
  }
  return { areas, error: null };
}

/** "WELCOME, 20, 50, 2026-12-31, 500" lines: the code, the share off, at most, until, for how many rides ("-" for no limit). */
export function promosText(promos: RidePromo[]): string {
  return promos
    .filter((p) => p.active)
    .map((p) => [p.code, p.percentOff, p.maxOffCents === null ? "-" : centsToDecimal(p.maxOffCents), p.endsAt ? p.endsAt.slice(0, 10) : "-", p.maxRides ?? "-"].join(", "))
    .join("\n");
}

export function parsePromos(text: string): { promos: RidePromo[]; error: string | null } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > RIDES_LIMITS.promos) return { promos: [], error: `Add up to ${RIDES_LIMITS.promos} promo codes.` };
  const promos: RidePromo[] = [];
  const none = (v: string | undefined) => !v || v === "-";
  for (const raw of lines) {
    const parts = raw.replaceAll("،", ",").split(",").map((p) => p.trim());
    const bad = () => ({ promos: [], error: `Write each code on its own line as the code, the % off, the most it takes off, the last day and how many rides may use it ("-" for no limit), like "WELCOME, 20, 50, 2026-12-31, 500". Check: ${raw.slice(0, 60)}` });
    if (parts.length < 2 || parts.length > 5) return bad();
    const code = parts[0]!.toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return bad();
    const percentOff = Number(parts[1]!.replaceAll("%", ""));
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) return bad();
    const maxOffCents = none(parts[2]) ? null : parsePrice(parts[2]!);
    if (!none(parts[2]) && (maxOffCents === null || maxOffCents > RIDES_LIMITS.maxCents)) return bad();
    const day = parts[3];
    if (!none(day) && !/^\d{4}-\d{2}-\d{2}$/.test(day!)) return bad();
    const endsAt = none(day) ? null : new Date(`${day}T23:59:59Z`);
    if (endsAt && Number.isNaN(endsAt.getTime())) return bad();
    const maxRides = none(parts[4]) ? null : Number(parts[4]);
    if (maxRides !== null && (!Number.isInteger(maxRides) || maxRides < 1)) return bad();
    if (promos.some((p) => p.code === code)) return { promos: [], error: `"${code}" is there twice.` };
    promos.push({ code, percentOff, maxOffCents, endsAt: endsAt ? endsAt.toISOString() : null, maxRides, active: true });
  }
  return { promos, error: null };
}

// Ride settings

/** The settings form: currency and payment with the delivery settings, the rest the company's ride settings. */
export function parseRideSettings(form: Record<string, string>, saved: DeliverySettings, driverAppAllowed: boolean, defaultCountryCode: string): Parsed<DeliverySettings> {
  const errors: Record<string, string> = {};
  const before = ridesSettingsOf(saved);
  const currency = CATALOG_CURRENCIES.find((c) => c === str(form, "currency")) as CatalogCurrency | undefined;
  if (!currency) errors.currency = "Choose a currency.";
  const cash = form.cash === "on";
  const card = form.card === "on";
  if (!cash && !card) errors.cash = "Choose at least one way to pay.";
  const fareMode = RIDE_FARE_MODES.find((v) => v === str(form, "fareMode"));
  if (!fareMode) errors.fareMode = "Choose how fares are worked out.";
  const matching = RIDE_MATCHINGS.find((v) => v === str(form, "matching"));
  if (!matching) errors.matching = "Choose how rides reach your drivers.";
  const timezone = FOOD_TIMEZONES.find((z) => z === str(form, "timezone"));
  if (!timezone) errors.timezone = "Choose your time zone.";
  const minutes = (name: string, min: number) => whole(form, name, min, RIDES_LIMITS.minutes, errors, `Enter minutes from ${min} to ${RIDES_LIMITS.minutes}.`);
  const cancelFreeMinutes = minutes("cancelFreeMinutes", 0);
  const noShowMinutes = minutes("noShowMinutes", 1);
  const freeWaitMinutes = minutes("freeWaitMinutes", 0);
  const cancelFeeCents = money(form, "cancelFee", errors);
  const commissionBp = shareBp(str(form, "share"));
  if (commissionBp === null) errors.share = "Enter your share from 0 to 50%.";
  const radius = Number(str(form, "matchRadiusKm").replaceAll(",", "."));
  if (!Number.isFinite(radius) || radius < 0.5 || radius > 50) errors.matchRadiusKm = "Enter a distance from 0.5 to 50 km.";
  const offerSeconds = whole(form, "offerSeconds", RIDES_LIMITS.offerSeconds.min, RIDES_LIMITS.offerSeconds.max, errors, `Enter seconds from ${RIDES_LIMITS.offerSeconds.min} to ${RIDES_LIMITS.offerSeconds.max}.`);
  const speedKmh = whole(form, "speedKmh", RIDES_LIMITS.speedKmh.min, RIDES_LIMITS.speedKmh.max, errors, `Enter a speed from ${RIDES_LIMITS.speedKmh.min} to ${RIDES_LIMITS.speedKmh.max} km/h.`);
  const phoneText = str(form, "emergencyPhone");
  const phone = phoneText ? parseAnyPhone(phoneText, defaultCountryCode) : null;
  if (phoneText && !phone) errors.emergencyPhone = "Enter a valid phone number with its country code, or leave it empty.";
  const { areas, error: areasError } = parseAreas(str(form, "areas"), before.areas);
  if (areasError) errors.areas = areasError;
  const { promos, error: promosError } = parsePromos(str(form, "promos"));
  if (promosError) errors.promos = promosError;
  const driverApp = str(form, "driverApp") === "bundle" ? "bundle" : str(form, "driverApp") === "same" ? "same" : null;
  if (!driverApp) errors.driverApp = "Choose where your drivers work.";
  else if (driverApp === "bundle" && !driverAppAllowed && saved.courierApp !== "bundle") errors.driverApp = "A second app for drivers isn't in your plan.";
  const driverAppName = str(form, "driverAppName") || null;
  if (driverAppName && driverAppName.length > DELIVERY_LIMITS.courierAppName) errors.driverAppName = `Give the drivers' app a name of up to ${DELIVERY_LIMITS.courierAppName} characters.`;
  if (Object.keys(errors).length || !currency || !fareMode || !matching || !timezone || commissionBp === null || !driverApp) return { ok: false, errors };
  const rides: RidesSettings = {
    fareMode,
    scheduling: form.scheduling === "on",
    matching,
    areas,
    cancelFreeMinutes,
    cancelFeeCents,
    noShowMinutes,
    freeWaitMinutes,
    pin: form.pin === "on",
    emergencyPhone: phone?.e164 ?? null,
    commissionBp,
    matchRadiusKm: Math.round(radius * 10) / 10,
    offerSeconds,
    speedKmh,
    // Codes no longer listed stay, switched off, so rides that used them keep their name.
    promos: [...promos, ...before.promos.filter((p) => !promos.some((n) => n.code === p.code)).map((p) => ({ ...p, active: false }))],
  };
  return { ok: true, value: { ...saved, currency, cash, card, timezone, courierApp: driverApp, courierAppName: driverAppName, rides } };
}

export function rideSettingsFormValues(saved: DeliverySettings): Record<string, string> {
  const rides = ridesSettingsOf(saved);
  return {
    currency: saved.currency,
    cash: saved.cash ? "on" : "",
    card: saved.card ? "on" : "",
    timezone: saved.timezone ?? DEFAULT_RIDES_TIMEZONE,
    fareMode: rides.fareMode,
    matching: rides.matching,
    scheduling: rides.scheduling ? "on" : "",
    cancelFreeMinutes: String(rides.cancelFreeMinutes),
    cancelFee: rides.cancelFeeCents ? centsToDecimal(rides.cancelFeeCents) : "",
    noShowMinutes: String(rides.noShowMinutes),
    freeWaitMinutes: String(rides.freeWaitMinutes),
    pin: rides.pin ? "on" : "",
    emergencyPhone: rides.emergencyPhone ?? "",
    share: shareText(rides.commissionBp),
    matchRadiusKm: String(rides.matchRadiusKm),
    offerSeconds: String(rides.offerSeconds),
    speedKmh: String(rides.speedKmh),
    areas: areasText(rides.areas),
    promos: promosText(rides.promos),
    driverApp: saved.courierApp === "bundle" ? "bundle" : "same",
    driverAppName: saved.courierAppName ?? "",
  };
}
