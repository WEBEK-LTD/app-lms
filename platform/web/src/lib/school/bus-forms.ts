import { minutesOf, timeOf } from "../bookings/time";
import type { SchoolBusRoute, SchoolBusSettings, SchoolBusStop, SchoolBusTrip } from "../data/types";
import { coordinatesIn } from "../delivery/locate";
import { BUS_LIMITS } from "./bus";

/**
 * 113.10 The dashboard's bus forms, checked: a route and its bus, a stop
 * (its place pasted from a map or as coordinates, and its times), students
 * put on a stop together, and when families are told the bus is near.
 * Messages are English; the dashboard translates them (`bus.known`).
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

function limited(form: Record<string, string>, name: string, max: number, errors: Record<string, string>, empty: string): string {
  const value = str(form, name);
  if (!value) errors[name] = empty;
  else if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
  return value;
}

function crewId(form: Record<string, string>, name: string, allowed: readonly number[], errors: Record<string, string>): number | null {
  const text = str(form, name);
  if (!text) return null;
  const id = Number(text);
  if (!Number.isSafeInteger(id) || !allowed.includes(id)) errors[name] = "Choose one of your teachers or staff.";
  return id;
}

export type RouteForm = Pick<SchoolBusRoute, "name" | "plate" | "capacity" | "driverId" | "supervisorId" | "active">;

export function parseRouteForm(form: Record<string, string>, crewIds: readonly number[]): Parsed<RouteForm> {
  const errors: Record<string, string> = {};
  const name = limited(form, "name", BUS_LIMITS.name, errors, "Name the route, like Route 1, Maadi.");
  const plate = limited(form, "plate", BUS_LIMITS.plate, errors, "Enter the bus's plate.");
  const capacity = Number(str(form, "capacity"));
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > BUS_LIMITS.maxCapacity) errors.capacity = `Enter the seats, from 1 to ${BUS_LIMITS.maxCapacity}.`;
  const driverId = crewId(form, "driverId", crewIds, errors);
  const supervisorId = crewId(form, "supervisorId", crewIds, errors);
  if (driverId !== null && driverId === supervisorId) errors.supervisorId = "The supervisor is someone other than the driver.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, plate: plate.toUpperCase(), capacity, driverId, supervisorId, active: form.active === "on" } };
}

export function routeFormValues(route: SchoolBusRoute | null): Record<string, string> {
  return {
    name: route?.name ?? "",
    plate: route?.plate ?? "",
    capacity: route ? String(route.capacity) : "",
    driverId: route?.driverId ? String(route.driverId) : "",
    supervisorId: route?.supervisorId ? String(route.supervisorId) : "",
    active: !route || route.active ? "on" : "",
  };
}

export type StopForm = Pick<SchoolBusStop, "name" | "lat" | "lng" | "morningMinute" | "afternoonMinute">;

export function parseStopForm(form: Record<string, string>): Parsed<StopForm> {
  const errors: Record<string, string> = {};
  const name = limited(form, "name", BUS_LIMITS.name, errors, "Name the stop, like Nile Street corner.");
  const mapText = str(form, "place");
  const at = mapText ? coordinatesIn(mapText) : null;
  if (!mapText) errors.place = "Paste the stop's place from Google Maps, or its coordinates like 30.0444, 31.2357.";
  else if (!at) errors.place = "We couldn't find a place in this. Paste the link from the address bar of Google Maps, or coordinates like 30.0444, 31.2357.";
  const time = (field: string): number | null => {
    const text = str(form, field);
    if (!text) return null;
    const minute = minutesOf(text);
    if (minute === null) errors[field] = "Enter a time like 07:15.";
    return minute;
  };
  const morningMinute = time("morning");
  const afternoonMinute = time("afternoon");
  if (!errors.morning && !errors.afternoon && morningMinute === null && afternoonMinute === null) errors.morning = "Enter the bus's time here on the morning trip, the afternoon trip or both.";
  if (Object.keys(errors).length || !at) return { ok: false, errors };
  return { ok: true, value: { name, lat: at.lat, lng: at.lng, morningMinute, afternoonMinute } };
}

export function stopFormValues(stop: SchoolBusStop | null): Record<string, string> {
  return {
    name: stop?.name ?? "",
    place: stop ? `${stop.lat}, ${stop.lng}` : "",
    morning: stop?.morningMinute !== null && stop?.morningMinute !== undefined ? timeOf(stop.morningMinute) : "",
    afternoon: stop?.afternoonMinute !== null && stop?.afternoonMinute !== undefined ? timeOf(stop.afternoonMinute) : "",
  };
}

/** The trips students are put on: both, or one of them. */
export function tripsOf(text: string): SchoolBusTrip[] | null {
  if (text === "both") return ["morning", "afternoon"];
  if (text === "morning" || text === "afternoon") return [text];
  return null;
}

/** The students ticked on the form (`student-<id>`), among those allowed. */
export function tickedStudents(form: Record<string, string>, allowed: readonly number[]): number[] {
  return allowed.filter((id) => form[`student-${id}`] === "on");
}

export function parseBusSettings(form: Record<string, string>): Parsed<SchoolBusSettings> {
  const errors: Record<string, string> = {};
  const nearBy = str(form, "nearBy");
  if (nearBy !== "distance" && nearBy !== "minutes") errors.nearBy = "Choose when families are told.";
  const meters = Number(str(form, "nearMeters"));
  if (!Number.isInteger(meters) || meters < 100 || meters > BUS_LIMITS.maxNearMeters) errors.nearMeters = `Enter a distance from 100 to ${BUS_LIMITS.maxNearMeters} metres.`;
  const minutes = Number(str(form, "nearMinutes"));
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > BUS_LIMITS.maxNearMinutes) errors.nearMinutes = `Enter the minutes, from 1 to ${BUS_LIMITS.maxNearMinutes}.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { nearBy: nearBy as SchoolBusSettings["nearBy"], nearMeters: meters, nearMinutes: minutes } };
}
