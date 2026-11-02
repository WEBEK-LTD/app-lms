import type { Lang } from "@/i18n/config";
import { timeOf } from "../bookings/time";
import type { DataStore } from "../data/store";
import type {
  App,
  SchoolBusMark,
  SchoolBusMarkStatus,
  SchoolBusRider,
  SchoolBusRoute,
  SchoolBusRun,
  SchoolBusSettings,
  SchoolBusStop,
  SchoolBusTrip,
  SchoolPerson,
  SchoolSettings,
} from "../data/types";
import { notifyDeps, type FlowDeps } from "../delivery/flow";
import type { Words } from "../delivery/notify";
import { schoolToday } from "./service";
import { parentUsers, tellUsers } from "./tell";

/**
 * 113.10 The school bus: routes with their stops in order and the students
 * of each stop on the morning and afternoon trips; a trip the driver starts
 * in the app, the phone sending the bus's position (as 104's couriers do)
 * while it runs; the stops it reached and how soon it reaches the others;
 * the parents told when the bus is near their child's stop and when the
 * child gets on and off. The driver and the supervisor are people of the
 * school who aren't students or parents (teachers, and 113.3's staff).
 */

export const DEFAULT_BUS_SETTINGS: SchoolBusSettings = { nearBy: "minutes", nearMeters: 1000, nearMinutes: 5 };

export const BUS_LIMITS = {
  routes: 100,
  stopsPerRoute: 60,
  name: 80,
  plate: 20,
  maxCapacity: 120,
  maxNearMeters: 10_000,
  maxNearMinutes: 60,
} as const;

/** A position older than this isn't shown. */
export const BUS_FRESH_MINUTES = 10;
/** The driver's phone sends its position this often at most. */
export const BUS_LOCATION_SECONDS = 5;
/** Within this of a stop, the bus reached it. */
export const BUS_ARRIVE_METERS = 120;
/** For how soon: roads are this much longer than a straight line, buses go this fast in town, and stop this long at each stop. */
const ROAD_FACTOR = 1.3;
const BUS_KMH = 25;
const STOP_MINUTES = 1;

export function busSettingsOf(settings: Pick<SchoolSettings, "bus">): SchoolBusSettings {
  return { ...DEFAULT_BUS_SETTINGS, ...(settings.bus ?? {}) };
}

/** Who may drive or supervise a bus: anyone of the school who isn't a student or a parent. */
export const isCrewPerson = (person: Pick<SchoolPerson, "role" | "active">): boolean => person.active && person.role !== "student" && person.role !== "parent";

/** The great-circle distance in metres. */
export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The bus's time at the stop on the trip; null: the trip doesn't stop there. */
export const stopMinute = (stop: SchoolBusStop, trip: SchoolBusTrip): number | null => (trip === "morning" ? stop.morningMinute : stop.afternoonMinute);

/** The trip's stops in the order the bus reaches them: by their time on it, then by the route's order. */
export function tripStops(stops: readonly SchoolBusStop[], trip: SchoolBusTrip): SchoolBusStop[] {
  return stops.filter((s) => stopMinute(s, trip) !== null).sort((a, b) => stopMinute(a, trip)! - stopMinute(b, trip)! || a.position - b.position || a.id - b.id);
}

/** The stops still ahead of the bus, in order: those after the last one it reached. */
export function stopsAhead(stops: readonly SchoolBusStop[], passed: readonly number[]): SchoolBusStop[] {
  let last = -1;
  stops.forEach((s, i) => {
    if (passed.includes(s.id)) last = i;
  });
  return stops.slice(last + 1);
}

/** How far by road and how soon the bus reaches the stop, from where it is, through the stops before it; null once it passed. */
export function busEta(position: { lat: number; lng: number }, stops: readonly SchoolBusStop[], passed: readonly number[], stopId: number): { meters: number; minutes: number } | null {
  const ahead = stopsAhead(stops, passed);
  const at = ahead.findIndex((s) => s.id === stopId);
  if (at < 0) return null;
  let meters = 0;
  let from = position;
  for (const stop of ahead.slice(0, at + 1)) {
    meters += metersBetween(from, stop) * ROAD_FACTOR;
    from = stop;
  }
  const minutes = Math.ceil(meters / ((BUS_KMH * 1000) / 60) + at * STOP_MINUTES);
  return { meters: Math.round(meters), minutes };
}

/** Whether the bus is near enough for the family to be told, as the school chose. */
export function isNear(eta: { meters: number; minutes: number }, settings: SchoolBusSettings): boolean {
  return settings.nearBy === "distance" ? eta.meters <= settings.nearMeters : eta.minutes <= settings.nearMinutes;
}

/** The bus's position while it runs, and recent; else null. */
export function freshPosition(run: SchoolBusRun, now: Date): { lat: number; lng: number; updated_at: string } | null {
  if (run.status !== "running" || run.lat === null || run.lng === null || !run.locatedAt) return null;
  if (now.getTime() - run.locatedAt.getTime() > BUS_FRESH_MINUTES * 60_000) return null;
  return { lat: run.lat, lng: run.lng, updated_at: run.locatedAt.toISOString() };
}

/** A trip still running from an earlier day is over: it ends where its last position was sent. */
export async function settleRun(store: DataStore, app: Pick<App, "id">, run: SchoolBusRun, today: string): Promise<SchoolBusRun> {
  if (run.status !== "running" || run.date >= today) return run;
  const endedAt = run.locatedAt ?? run.startedAt;
  // The bus's position is kept only while the trip runs.
  await store.updateSchoolBusRun(app.id, run.id, { status: "done", endedAt, lat: null, lng: null, locatedAt: null }, { status: "running" });
  return { ...run, status: "done", endedAt, lat: null, lng: null, locatedAt: null };
}

/** The crew's part on a route: its driver, its supervisor, or none. */
export function crewRole(route: Pick<SchoolBusRoute, "driverId" | "supervisorId">, personId: number): "driver" | "supervisor" | null {
  if (route.driverId === personId) return "driver";
  if (route.supervisorId === personId) return "supervisor";
  return null;
}

/** Who drives: the route's driver; without one, its supervisor. They start the trip and their phone sends its position. */
export function mayDrive(route: Pick<SchoolBusRoute, "driverId" | "supervisorId">, personId: number): boolean {
  return route.driverId === personId || (route.driverId === null && route.supervisorId === personId);
}

/** The routes the person drives or supervises. */
export async function crewRoutes(store: DataStore, appId: string, people: readonly SchoolPerson[]): Promise<{ route: SchoolBusRoute; person: SchoolPerson; role: "driver" | "supervisor" }[]> {
  const crew = people.filter(isCrewPerson);
  if (crew.length === 0) return [];
  const out: { route: SchoolBusRoute; person: SchoolPerson; role: "driver" | "supervisor" }[] = [];
  for (const route of await store.listSchoolBusRoutes(appId)) {
    if (!route.active) continue;
    for (const person of crew) {
      const role = crewRole(route, person.id);
      if (role) {
        out.push({ route, person, role });
        break;
      }
    }
  }
  return out;
}

// JSON

export function busStopJson(stop: SchoolBusStop, trip: SchoolBusTrip, passed: readonly number[] = []) {
  const minute = stopMinute(stop, trip);
  return { id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng, time: minute === null ? null : timeOf(minute), passed: passed.includes(stop.id) };
}

export function markJson(mark: SchoolBusMark | undefined) {
  return { status: mark?.status ?? null, boarded_at: mark?.boardedAt?.toISOString() ?? null, off_at: mark?.offAt?.toISOString() ?? null };
}

export function runSummaryJson(run: SchoolBusRun, riders: readonly SchoolBusRider[], marks: readonly SchoolBusMark[]) {
  const mine = marks.filter((m) => m.runId === run.id);
  const count = (status: SchoolBusMarkStatus) => mine.filter((m) => m.status === status).length;
  return {
    id: run.id,
    trip: run.trip,
    date: run.date,
    status: run.status,
    started_at: run.startedAt.toISOString(),
    ended_at: run.endedAt?.toISOString() ?? null,
    riders: riders.filter((r) => r.trip === run.trip).length,
    boarded: count("boarded"),
    off: count("off"),
    absent: count("absent"),
  };
}

// Pushes

const NEAR: Record<Lang, (name: string, stop: string, how: { meters: number; minutes: number }, byDistance: boolean) => Words> = {
  en: (name, stop, how, byDistance) => ({
    title: "The bus is near",
    body: byDistance ? `${name}'s bus is about ${distanceText(how.meters, "en")} from ${stop}.` : `${name}'s bus is about ${how.minutes} min from ${stop}.`,
  }),
  ar: (name, stop, how, byDistance) => ({
    title: "الحافلة قريبة",
    body: byDistance ? `حافلة ${name} على بُعد نحو ${distanceText(how.meters, "ar")} من ${stop}.` : `حافلة ${name} على بُعد نحو ${how.minutes} دقيقة من ${stop}.`,
  }),
  tr: (name, stop, how, byDistance) => ({
    title: "Servis yaklaştı",
    body: byDistance ? `${name} adlı öğrencinin servisi ${stop} durağına yaklaşık ${distanceText(how.meters, "tr")} uzakta.` : `${name} adlı öğrencinin servisi ${stop} durağına yaklaşık ${how.minutes} dk uzakta.`,
  }),
};

function distanceText(meters: number, lang: Lang): string {
  if (meters < 1000) return lang === "ar" ? `${Math.max(50, Math.round(meters / 50) * 50)} متر` : `${Math.max(50, Math.round(meters / 50) * 50)} m`;
  const km = (Math.round(meters / 100) / 10).toString();
  return lang === "ar" ? `${km} كم` : `${km} km`;
}

const ON_OFF: Record<"boarded" | "off", Record<Lang, (name: string, where: string) => Words>> = {
  boarded: {
    en: (name, where) => ({ title: `${name} got on the bus`, body: `At ${where}.` }),
    ar: (name, where) => ({ title: `صعد ${name} إلى الحافلة`, body: `في ${where}.` }),
    tr: (name, where) => ({ title: `${name} servise bindi`, body: `${where} durağında.` }),
  },
  off: {
    en: (name, where) => ({ title: `${name} got off the bus`, body: `At ${where}.` }),
    ar: (name, where) => ({ title: `نزل ${name} من الحافلة`, body: `في ${where}.` }),
    tr: (name, where) => ({ title: `${name} servisten indi`, body: `${where} durağında.` }),
  },
};

const SCHOOL_WORD: Record<Lang, string> = { en: "school", ar: "المدرسة", tr: "okul" };

async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch {
    // The change is saved either way.
  }
}

/**
 * The driver's phone sent the bus's position: the stops it reached, and
 * the families of the stops it is now near told once each (in the
 * morning those still waiting, in the afternoon those on the bus).
 */
export async function busMoved(deps: FlowDeps, run: SchoolBusRun, route: SchoolBusRoute, position: { lat: number; lng: number }): Promise<SchoolBusRun> {
  const { store, app, now } = deps;
  const stops = tripStops(await store.listSchoolBusStops(app.id, { routeId: route.id }), run.trip);
  const passed = [...run.passedStopIds];
  const reached = stopsAhead(stops, passed).findLast((s) => metersBetween(position, s) <= BUS_ARRIVE_METERS);
  if (reached) for (const stop of stops.slice(0, stops.indexOf(reached) + 1)) if (!passed.includes(stop.id)) passed.push(stop.id);
  const settings = busSettingsOf((await store.getSchoolSettings(app.id)) ?? {});
  const told = [...run.toldStopIds];
  const near: { stop: SchoolBusStop; eta: { meters: number; minutes: number } }[] = [];
  for (const stop of stopsAhead(stops, passed)) {
    if (told.includes(stop.id)) continue;
    const eta = busEta(position, stops, passed, stop.id);
    if (!eta || !isNear(eta, settings)) break;
    told.push(stop.id);
    near.push({ stop, eta });
  }
  const next = { ...run, lat: position.lat, lng: position.lng, locatedAt: now, passedStopIds: passed, toldStopIds: told };
  await store.updateSchoolBusRun(app.id, run.id, { lat: next.lat, lng: next.lng, locatedAt: now, passedStopIds: passed, toldStopIds: told }, { status: "running" });
  if (near.length > 0) {
    const [riders, marks, students] = await Promise.all([
      store.listSchoolBusRiders(app.id, { routeId: route.id, trip: run.trip }),
      store.listSchoolBusMarks(app.id, { runId: run.id }),
      store.listSchoolPeople(app.id, { role: "student" }),
    ]);
    const markOf = new Map(marks.map((m) => [m.studentId, m.status]));
    const student = new Map(students.map((s) => [s.id, s]));
    const push = notifyDeps(deps);
    for (const { stop, eta } of near) {
      for (const rider of riders.filter((r) => r.stopId === stop.id)) {
        const child = student.get(rider.studentId);
        const mark = markOf.get(rider.studentId);
        // In the morning, children still to get on; in the afternoon, children on the bus.
        const waiting = run.trip === "morning" ? mark === undefined : mark === "boarded";
        if (!child?.active || !waiting) continue;
        await safely(async () =>
          tellUsers(push, await parentUsers(store, child), (lang) => NEAR[lang](child.name, stop.name, eta, settings.nearBy === "distance"), {
            type: "school_bus",
            student_id: String(child.id),
          }),
        );
      }
    }
  }
  return next;
}

/** The driver or the supervisor marked a student on the trip; their parents hear when they got on and off. */
export async function markRider(
  deps: FlowDeps,
  run: SchoolBusRun,
  student: SchoolPerson,
  stop: SchoolBusStop | null,
  status: SchoolBusMarkStatus,
  markedBy: number,
): Promise<SchoolBusMark> {
  const { store, app, now } = deps;
  const [found] = await store.listSchoolBusMarks(app.id, { runId: run.id, studentId: student.id });
  const mark: SchoolBusMark = {
    appId: app.id,
    runId: run.id,
    studentId: student.id,
    status,
    boardedAt: status === "boarded" ? (found?.status === "boarded" ? found.boardedAt : now) : status === "off" ? (found?.boardedAt ?? null) : null,
    offAt: status === "off" ? (found?.status === "off" ? found.offAt : now) : null,
    markedBy,
    updatedAt: now,
  };
  await store.saveSchoolBusMark(mark);
  if ((status === "boarded" || status === "off") && found?.status !== status) {
    // In the morning they get on at their stop and off at school; in the afternoon the other way round.
    const atStop = (status === "boarded") === (run.trip === "morning");
    await safely(async () =>
      tellUsers(notifyDeps(deps), await parentUsers(store, student), (lang) => ON_OFF[status][lang](student.name, atStop && stop ? stop.name : SCHOOL_WORD[lang]), {
        type: "school_bus",
        student_id: String(student.id),
      }),
    );
  }
  return mark;
}

/** Today's trip of the route, ended or not. */
export async function todaysRun(store: DataStore, app: Pick<App, "id">, routeId: number, trip: SchoolBusTrip, settings: SchoolSettings, now: Date): Promise<SchoolBusRun | null> {
  const [run] = await store.listSchoolBusRuns(app.id, { routeId, date: schoolToday(settings, now), limit: 5 }).then((runs) => runs.filter((r) => r.trip === trip));
  return run ?? null;
}

/** 113.10 How often the dashboard's live map of the buses asks again. */
export const BUS_BOARD_EVERY_SECONDS = 15;

export interface BusBoardRun {
  run: SchoolBusRun;
  route: SchoolBusRoute;
  position: { lat: number; lng: number } | null;
  stops: SchoolBusStop[];
  riders: number;
  boarded: number;
  off: number;
  absent: number;
  driverName: string | null;
}

/** 113.10 The buses running now (today's trips not ended), for the dashboard's live map. */
export async function busBoard(store: DataStore, app: Pick<App, "id">, settings: SchoolSettings, now: Date): Promise<BusBoardRun[]> {
  const today = schoolToday(settings, now);
  const [routes, running, people] = await Promise.all([store.listSchoolBusRoutes(app.id), store.listSchoolBusRuns(app.id, { status: "running" }), store.listSchoolPeople(app.id)]);
  const name = new Map(people.map((p) => [p.id, p.name]));
  const out: BusBoardRun[] = [];
  for (const found of running) {
    const run = await settleRun(store, app, found, today);
    const route = routes.find((r) => r.id === run.routeId);
    if (run.status !== "running" || !route) continue;
    const [stops, riders, marks] = await Promise.all([
      store.listSchoolBusStops(app.id, { routeId: route.id }),
      store.listSchoolBusRiders(app.id, { routeId: route.id, trip: run.trip }),
      store.listSchoolBusMarks(app.id, { runId: run.id }),
    ]);
    const position = freshPosition(run, now);
    out.push({
      run,
      route,
      position: position ? { lat: position.lat, lng: position.lng } : null,
      stops: tripStops(stops, run.trip),
      riders: riders.length,
      boarded: marks.filter((m) => m.status === "boarded").length,
      off: marks.filter((m) => m.status === "off").length,
      absent: marks.filter((m) => m.status === "absent").length,
      driverName: run.startedBy !== null ? (name.get(run.startedBy) ?? null) : null,
    });
  }
  return out.sort((a, b) => a.route.position - b.route.position);
}
