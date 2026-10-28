import { CATALOG_CURRENCIES, centsToDecimal, parsePrice } from "../catalog/money";
import type { CatalogCurrency, CourierApp, DeliveryService, DeliverySettings, DeliveryZone } from "../data/types";
import { COURIER_APPS, DELIVERY_ASSIGNMENTS, DELIVERY_PRICINGS, DELIVERY_TRACKINGS } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";
import { DELIVERY_LIMITS } from "./settings";

/**
 * 104 The dashboard's delivery forms, checked: the company's prices and
 * choices, a service, a courier. Messages are English; the dashboard
 * translates them (`delivery.known`).
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

function money(form: Record<string, string>, name: string, errors: Record<string, string>, required: boolean): number {
  const text = str(form, name);
  if (!text) {
    if (required) errors[name] = "Enter a price.";
    return 0;
  }
  const cents = parsePrice(text);
  if (cents === null || cents > DELIVERY_LIMITS.maxCents) {
    errors[name] = "Enter a price, like 45 or 45.50.";
    return 0;
  }
  return cents;
}

/** "Zone, price" lines, one zone each, as the form's text area holds them. */
export function zonesText(zones: DeliveryZone[]): string {
  return zones.map((z) => `${z.name}, ${centsToDecimal(z.cents)}`).join("\n");
}

/** The zones of the text area; their IDs stay with their names, new ones get the next free one. */
export function parseZones(text: string, saved: DeliveryZone[]): { zones: DeliveryZone[]; error: string | null } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > DELIVERY_LIMITS.zones) return { zones: [], error: `Add up to ${DELIVERY_LIMITS.zones} areas.` };
  const zones: DeliveryZone[] = [];
  const used = new Set(saved.map((z) => z.id));
  let next = 1;
  for (const raw of lines) {
    // An Arabic comma works too.
    const line = raw.replace(/،/g, ",");
    const at = line.lastIndexOf(",");
    const name = (at > 0 ? line.slice(0, at) : "").trim();
    const cents = at > 0 ? parsePrice(line.slice(at + 1)) : null;
    if (!name || name.length > DELIVERY_LIMITS.zoneName || cents === null || cents > DELIVERY_LIMITS.maxCents) {
      return { zones: [], error: `Write each area on its own line as its name, a comma and its price, like "Maadi, 45". Check: ${raw.slice(0, 60)}` };
    }
    if (zones.some((z) => z.name.toLowerCase() === name.toLowerCase())) return { zones: [], error: `"${name}" is there twice.` };
    const known = saved.find((z) => z.name.toLowerCase() === name.toLowerCase());
    let id = known?.id;
    if (!id) {
      while (used.has(`z${next}`)) next++;
      id = `z${next}`;
      used.add(id);
    }
    zones.push({ id, name, cents });
  }
  return { zones, error: null };
}

/** The settings form; `saved` keeps the zones' IDs. */
export function parseDeliverySettings(form: Record<string, string>, saved: DeliverySettings, courierAppAllowed: boolean): Parsed<DeliverySettings> {
  const errors: Record<string, string> = {};
  const currency = CATALOG_CURRENCIES.find((c) => c === str(form, "currency")) as CatalogCurrency | undefined;
  if (!currency) errors.currency = "Choose a currency.";
  const pricing = DELIVERY_PRICINGS.find((p) => p === str(form, "pricing"));
  if (!pricing) errors.pricing = "Choose how you price a delivery.";
  const fixedCents = money(form, "fixed", errors, pricing === "fixed");
  const baseCents = money(form, "base", errors, false);
  const perKmCents = money(form, "perKm", errors, pricing === "distance");
  const minCents = money(form, "min", errors, false);
  let maxKm: number | null = null;
  const maxText = str(form, "maxKm");
  if (maxText) {
    const n = Number(maxText.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0 || n > DELIVERY_LIMITS.maxKm) errors.maxKm = `Enter a distance from 1 to ${DELIVERY_LIMITS.maxKm} km, or leave it empty.`;
    else maxKm = Math.round(n * 10) / 10;
  }
  const { zones, error } = parseZones(str(form, "zones"), saved.zones);
  if (error) errors.zones = error;
  else if (pricing === "zone" && zones.length === 0) errors.zones = "Add the areas you deliver to, each with its price.";
  const cash = form.cash === "on";
  const card = form.card === "on";
  if (!cash && !card) errors.cash = "Choose at least one way to pay.";
  const tracking = DELIVERY_TRACKINGS.find((v) => v === str(form, "tracking"));
  if (!tracking) errors.tracking = "Choose how customers follow a shipment.";
  const assignment = DELIVERY_ASSIGNMENTS.find((v) => v === str(form, "assignment"));
  if (!assignment) errors.assignment = "Choose who gives out the jobs.";
  const courierApp = COURIER_APPS.find((v) => v === str(form, "courierApp")) as CourierApp | undefined;
  if (!courierApp) errors.courierApp = "Choose where your couriers work.";
  else if (courierApp === "bundle" && !courierAppAllowed && saved.courierApp !== "bundle") errors.courierApp = "A second app for couriers isn't in your plan.";
  if (Object.keys(errors).length || !currency || !pricing || !tracking || !assignment || !courierApp) return { ok: false, errors };
  return { ok: true, value: { currency, pricing, fixedCents, baseCents, perKmCents, minCents, maxKm, zones, cash, card, tracking, assignment, courierApp } };
}

export interface ServiceForm {
  name: string;
  description: string | null;
  extraCents: number;
  eta: string | null;
  active: boolean;
}

export function parseServiceForm(form: Record<string, string>): Parsed<ServiceForm> {
  const errors: Record<string, string> = {};
  const name = str(form, "name");
  if (!name) errors.name = "Name the service, like Same-day or Documents.";
  else if (name.length > DELIVERY_LIMITS.serviceName) errors.name = `Keep the name under ${DELIVERY_LIMITS.serviceName} characters.`;
  const description = str(form, "description");
  if (description.length > DELIVERY_LIMITS.serviceDescription) errors.description = `Keep it under ${DELIVERY_LIMITS.serviceDescription} characters.`;
  const eta = str(form, "eta");
  if (eta.length > DELIVERY_LIMITS.eta) errors.eta = `Keep it under ${DELIVERY_LIMITS.eta} characters.`;
  const extraCents = money(form, "extra", errors, false);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, description: description || null, extraCents, eta: eta || null, active: form.active === "on" } };
}

export function serviceFormValues(service: DeliveryService | null): Record<string, string> {
  return {
    name: service?.name ?? "",
    description: service?.description ?? "",
    extra: service && service.extraCents > 0 ? centsToDecimal(service.extraCents) : "",
    eta: service?.eta ?? "",
    active: service === null || service.active ? "on" : "",
  };
}

export interface CourierForm {
  name: string;
  phone: string | null;
  email: string | null;
  vehicle: string | null;
}

/** A courier: a mobile number, or an email for apps that sign in by email only. */
export function parseCourierForm(form: Record<string, string>, defaultCountryCode: string, emailOnly: boolean): Parsed<CourierForm> {
  const errors: Record<string, string> = {};
  const name = str(form, "name");
  if (!name) errors.name = "Enter the courier's name.";
  else if (name.length > DELIVERY_LIMITS.courierName) errors.name = `Keep the name under ${DELIVERY_LIMITS.courierName} characters.`;
  const phoneText = str(form, "phone");
  const phone = phoneText ? parseAnyPhone(phoneText, defaultCountryCode) : null;
  if (phoneText && !phone) errors.phone = "Enter a valid mobile number.";
  const email = str(form, "email").toLowerCase();
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191)) errors.email = "Enter a valid email address, or leave it empty.";
  if (!phoneText && !email) errors[emailOnly ? "email" : "phone"] = emailOnly ? "Enter the email the courier signs in with." : "Enter the mobile number the courier signs in with.";
  const vehicle = str(form, "vehicle");
  if (vehicle.length > DELIVERY_LIMITS.vehicle) errors.vehicle = `Keep it under ${DELIVERY_LIMITS.vehicle} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, phone: phone?.e164 ?? null, email: email || null, vehicle: vehicle || null } };
}
