"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { SCHOOL_BUS_TRIPS, type App, type SchoolBusTrip } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";
import { BUS_LIMITS, isCrewPerson } from "@/lib/school/bus";
import { parseBusSettings, parseRouteForm, parseStopForm, tickedStudents, tripsOf } from "@/lib/school/bus-forms";
import { schoolSettingsOf } from "@/lib/school/settings";

/**
 * 113.10 The school's buses on the dashboard: routes and their bus, the
 * stops in order, the students of each stop on the morning and afternoon
 * trips (put on together), and when families are told the bus is near.
 */

async function requireSchoolApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "school") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  revalidatePath("/dashboard/school/bus", "layout");
  revalidatePath("/studio/project/school/bus", "layout");
}

const idOf = (formData: FormData, name = "id"): number | null => {
  const n = Number(formData.get(name));
  return formData.get(name) && Number.isSafeInteger(n) ? n : null;
};

async function crewIds(appId: string): Promise<number[]> {
  return (await (await getStore()).listSchoolPeople(appId)).filter(isCrewPerson).map((p) => p.id);
}

// Routes

export async function saveBusRouteAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const routes = await store.listSchoolBusRoutes(app.id);
  if (id !== null && !routes.some((r) => r.id === id)) return { message: "This route doesn't exist anymore." };
  if (id === null && routes.length >= BUS_LIMITS.routes) return { message: `You can have up to ${BUS_LIMITS.routes} routes.`, values };
  const parsed = parseRouteForm(values, await crewIds(app.id));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const saved = await store.saveSchoolBusRoute({ appId: app.id, id, ...parsed.value }, new Date());
  if (!saved) return { message: "This route doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the bus route "${parsed.value.name}"`);
  refresh();
  if (id === null) redirect(`/dashboard/school/bus/${saved.id}`);
  return { ok: true, message: "Saved.", values };
}

export async function deleteBusRouteAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const route = id !== null ? await store.getSchoolBusRoute(context.app.id, id) : null;
  if (!route) return;
  await store.deleteSchoolBusRoute(context.app.id, route.id);
  await recordStaffChange(context, `Deleted the bus route "${route.name}"`);
  refresh();
  redirect("/dashboard/school/bus");
}

// Stops

export async function saveBusStopAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const routeId = idOf(formData, "routeId");
  const route = routeId !== null ? await store.getSchoolBusRoute(app.id, routeId) : null;
  if (!route) return { message: "This route doesn't exist anymore." };
  const id = idOf(formData);
  const stops = await store.listSchoolBusStops(app.id, { routeId: route.id });
  if (id !== null && !stops.some((s) => s.id === id)) return { message: "This stop doesn't exist anymore." };
  if (id === null && stops.length >= BUS_LIMITS.stopsPerRoute) return { message: `A route can have up to ${BUS_LIMITS.stopsPerRoute} stops.`, values };
  const parsed = parseStopForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.saveSchoolBusStop({ appId: app.id, routeId: route.id, id, ...parsed.value });
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the stop "${parsed.value.name}" of the bus route "${route.name}"`);
  refresh();
  return { ok: true, message: "Saved.", values: id ? values : {} };
}

export async function deleteBusStopAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const stop = id !== null ? (await store.listSchoolBusStops(context.app.id)).find((s) => s.id === id) : undefined;
  if (!stop) return;
  await store.deleteSchoolBusStop(context.app.id, stop.id);
  await recordStaffChange(context, `Deleted the bus stop "${stop.name}"`);
  refresh();
}

/** Moves a stop one place up or down its route. */
export async function moveBusStopAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const stop = id !== null ? (await store.listSchoolBusStops(context.app.id)).find((s) => s.id === id) : undefined;
  if (!stop) return;
  const order = (await store.listSchoolBusStops(context.app.id, { routeId: stop.routeId })).map((s) => s.id);
  const at = order.indexOf(stop.id);
  const to = formData.get("direction") === "up" ? at - 1 : at + 1;
  if (to < 0 || to >= order.length) return;
  [order[at], order[to]] = [order[to]!, order[at]!];
  await store.orderSchoolBusStops(context.app.id, stop.routeId, order);
  refresh();
}

// Students on the stops

/** Puts the ticked students on a stop for the chosen trips, or takes them off the route for them. */
export async function assignBusRidersAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const routeId = idOf(formData, "routeId");
  const route = routeId !== null ? await store.getSchoolBusRoute(app.id, routeId) : null;
  if (!route) return { message: "This route doesn't exist anymore." };
  const trips = tripsOf(String(formData.get("trips") ?? ""));
  if (!trips) return { errors: { trips: "Choose the trips." }, values };
  const students = (await store.listSchoolPeople(app.id, { role: "student" })).filter((s) => s.active);
  const ticked = tickedStudents(values, students.map((s) => s.id));
  if (ticked.length === 0) return { errors: { students: "Tick the students first." }, values };
  const stopText = String(formData.get("stopId") ?? "");
  const stops = await store.listSchoolBusStops(app.id, { routeId: route.id });
  if (stopText === "off") {
    const riders = await store.listSchoolBusRiders(app.id, { routeId: route.id });
    const rows = riders.filter((r) => ticked.includes(r.studentId) && trips.includes(r.trip)).map((r) => ({ studentId: r.studentId, trip: r.trip, stop: null }));
    await store.setSchoolBusRiders(app.id, rows);
    await recordStaffChange(context, `Took ${rows.length} students off the bus route "${route.name}"`);
    refresh();
    return { ok: true, message: `Taken off this route: ${ticked.length}.` };
  }
  const stop = stops.find((s) => String(s.id) === stopText);
  if (!stop) return { errors: { stopId: "Choose one of this route's stops." }, values };
  const wanted = trips.filter((trip) => (trip === "morning" ? stop.morningMinute : stop.afternoonMinute) !== null);
  if (wanted.length === 0) return { errors: { trips: "The bus doesn't stop here on that trip. Give the stop a time for it first." }, values };
  // A route's seats: the students of each trip.
  const riders = await store.listSchoolBusRiders(app.id, { routeId: route.id });
  for (const trip of wanted) {
    const onIt = new Set([...riders.filter((r) => r.trip === trip).map((r) => r.studentId), ...ticked]);
    if (onIt.size > route.capacity) {
      const message = trip === "morning" ? `This bus has ${route.capacity} seats: that would put ${onIt.size} students on the morning trip.` : `This bus has ${route.capacity} seats: that would put ${onIt.size} students on the afternoon trip.`;
      return { message, values };
    }
  }
  await store.setSchoolBusRiders(
    app.id,
    ticked.flatMap((studentId) => wanted.map((trip) => ({ studentId, trip, stop }))),
  );
  await recordStaffChange(context, `Put ${ticked.length} students on the stop "${stop.name}" of the bus route "${route.name}"`);
  refresh();
  return { ok: true, message: `Saved. On ${stop.name}: ${ticked.length}.` };
}

export async function removeBusRiderAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const studentId = idOf(formData, "studentId");
  const trip = String(formData.get("trip") ?? "") as SchoolBusTrip;
  if (studentId === null || !SCHOOL_BUS_TRIPS.includes(trip)) return;
  await (await getStore()).setSchoolBusRiders(context.app.id, [{ studentId, trip, stop: null }]);
  refresh();
}

// Settings

export async function saveBusSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const values = formValues(formData);
  const parsed = parseBusSettings(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const store = await getStore();
  const settings = schoolSettingsOf(await store.getSchoolSettings(context.app.id), context.app);
  await store.saveSchoolSettings(context.app.id, { ...settings, bus: parsed.value }, new Date());
  await recordStaffChange(context, "Saved when families are told the bus is near");
  refresh();
  return { ok: true, message: "Saved.", values };
}
