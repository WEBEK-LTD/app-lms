import { SCHOOL_BUS_MARKS, SCHOOL_BUS_TRIPS, type SchoolBusMarkStatus, type SchoolBusRoute, type SchoolBusRun, type SchoolBusTrip, type SchoolPerson, type SchoolSettings } from "../data/types";
import { error } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import {
  BUS_LOCATION_SECONDS,
  busEta,
  busMoved,
  busStopJson,
  crewRoutes,
  freshPosition,
  isCrewPerson,
  markJson,
  markRider,
  mayDrive,
  runSummaryJson,
  settleRun,
  tripStops,
} from "./bus";
import type { SchoolContext } from "./hosted";
import { mapConfigJson } from "../delivery/service";
import { platformSetting } from "../settings/platform";
import { memberRoles, schoolDirectory, schoolToday, studentJson, type SchoolMember } from "./service";

/**
 * 113.10 The hosted API's bus endpoints (tag School): a family's view of
 * their child's bus (`GET /school/students/{id}/bus`), and the crew's: the
 * routes they drive or supervise, a trip started, the bus's position sent
 * while it runs, each student marked on and off, the trip ended.
 */

const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const noContent: ConnectorResult = { status: 204 };
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (value: string | undefined): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);
const notCrew = () => error(403, "not_bus_crew", "This account doesn't drive or supervise any of the school's buses.");
const runNotFound = () => error(404, "not_found", "Trip not found.");

const START_LIMIT: RateLimitRule = { name: "school_bus_start", limit: 30, windowSeconds: 3600 };
const MARK_LIMIT: RateLimitRule = { name: "school_bus_mark", limit: 600, windowSeconds: 3600 };

async function limited(ctx: SchoolContext, request: ConnectorRequest, rule: RateLimitRule): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, rule, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

/** Everyone the signed-in person is at the school. */
const peopleOf = (member: SchoolMember): SchoolPerson[] => Object.values(member).filter((p): p is SchoolPerson => p !== null);

/** 113.10 `bus` among the person's roles when they drive or supervise one of the school's buses. */
export async function busRoles(ctx: Pick<SchoolContext, "store" | "app">, member: SchoolMember): Promise<"bus"[]> {
  return (await crewRoutes(ctx.store, ctx.app.id, peopleOf(member))).length > 0 ? ["bus"] : [];
}

// Families

/** The student's bus on each trip they ride: the route and its stops, their stop, and today's trip with the bus live while it runs. */
export async function studentBus(ctx: SchoolContext, student: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const riders = await ctx.store.listSchoolBusRiders(ctx.app.id, { studentId: student.id });
  const today = schoolToday(settings, ctx.now);
  const items = [];
  for (const trip of SCHOOL_BUS_TRIPS) {
    const rider = riders.find((r) => r.trip === trip);
    if (!rider) continue;
    const route = await ctx.store.getSchoolBusRoute(ctx.app.id, rider.routeId);
    if (!route || !route.active) continue;
    const stops = tripStops(await ctx.store.listSchoolBusStops(ctx.app.id, { routeId: route.id }), trip);
    const stop = stops.find((s) => s.id === rider.stopId);
    if (!stop) continue;
    const [found] = (await ctx.store.listSchoolBusRuns(ctx.app.id, { routeId: route.id, date: today })).filter((r) => r.trip === trip);
    const run = found ? await settleRun(ctx.store, ctx.app, found, today) : null;
    let live = null;
    if (run) {
      const [mark] = await ctx.store.listSchoolBusMarks(ctx.app.id, { runId: run.id, studentId: student.id });
      const bus = freshPosition(run, ctx.now);
      const eta = bus ? busEta(bus, stops, run.passedStopIds, stop.id) : null;
      live = {
        id: run.id,
        status: run.status,
        started_at: run.startedAt.toISOString(),
        ended_at: run.endedAt?.toISOString() ?? null,
        bus,
        // How soon on the way to the child's stop: in the morning before they get on, in the afternoon while they're on the bus.
        eta_minutes: eta && (trip === "morning" ? mark === undefined : mark?.status === "boarded") ? eta.minutes : null,
        distance_m: eta && (trip === "morning" ? mark === undefined : mark?.status === "boarded") ? eta.meters : null,
        student: markJson(mark),
      };
    }
    items.push({
      trip,
      route: { id: route.id, name: route.name, plate: route.plate },
      stop: busStopJson(stop, trip, run?.passedStopIds ?? []),
      stops: stops.map((s) => busStopJson(s, trip, run?.passedStopIds ?? [])),
      run: live,
    });
  }
  return ok({ items });
}

// The crew

interface Crew {
  person: SchoolPerson;
  role: "driver" | "supervisor";
  route: SchoolBusRoute;
}

/** The answer for a `/school/bus/…` path, or null when the path isn't one. */
export async function handleBusRoute(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember, settings: SchoolSettings): Promise<ConnectorResult | null> {
  const path = request.path;
  if (path[1] !== "bus") return null;
  const crew = await crewRoutes(ctx.store, ctx.app.id, peopleOf(member));
  if (crew.length === 0 || !peopleOf(member).some(isCrewPerson)) return notCrew();
  const route = `${request.method} /${path.join("/")}`;
  if (route === "GET /school/bus/routes") return crewRoutesJson(ctx, crew, settings);
  const id = idOf(path[3]);
  if (path[2] === "routes" && id !== null && path[4] === "runs" && path.length === 5 && request.method === "POST") {
    const mine = crew.find((c) => c.route.id === id);
    if (!mine) return error(404, "not_found", "Route not found.");
    return startRun(ctx, request, mine, settings);
  }
  if (path[2] === "runs" && id !== null) {
    const found = await ctx.store.getSchoolBusRun(ctx.app.id, id);
    const mine = found ? crew.find((c) => c.route.id === found.routeId) : undefined;
    if (!found || !mine) return runNotFound();
    const run = await settleRun(ctx.store, ctx.app, found, schoolToday(settings, request.now));
    if (request.method === "GET" && path.length === 4) return runJson(ctx, run, mine);
    if (request.method === "PUT" && path[4] === "location" && path.length === 5) return location(ctx, request, run, mine);
    if (request.method === "POST" && path[4] === "end" && path.length === 5) return endRun(ctx, run, mine);
    const studentId = idOf(path[5]);
    if (request.method === "PUT" && path[4] === "riders" && path.length === 6 && studentId !== null) return mark(ctx, request, run, mine, studentId);
  }
  return error(404, "not_found", "Page not found.");
}

async function crewRoutesJson(ctx: SchoolContext, crew: Crew[], settings: SchoolSettings): Promise<ConnectorResult> {
  const today = schoolToday(settings, ctx.now);
  const runs = await ctx.store.listSchoolBusRuns(ctx.app.id, { routeIds: crew.map((c) => c.route.id), date: today });
  const marks = await ctx.store.listSchoolBusMarks(ctx.app.id, { runIds: runs.map((r) => r.id) });
  const items = [];
  for (const { route, role, person } of crew) {
    const [stops, riders] = await Promise.all([ctx.store.listSchoolBusStops(ctx.app.id, { routeId: route.id }), ctx.store.listSchoolBusRiders(ctx.app.id, { routeId: route.id })]);
    items.push({
      id: route.id,
      name: route.name,
      plate: route.plate,
      capacity: route.capacity,
      role,
      drives: mayDrive(route, person.id),
      trips: SCHOOL_BUS_TRIPS.map((trip) => {
        const run = runs.find((r) => r.routeId === route.id && r.trip === trip);
        return { trip, stops: tripStops(stops, trip).length, riders: riders.filter((r) => r.trip === trip).length, run: run ? runSummaryJson(run, riders, marks) : null };
      }),
    });
  }
  return ok({ items });
}

/** The trip as its crew sees it: the stops in order with their students and how each was marked. */
async function runJson(ctx: SchoolContext, run: SchoolBusRun, crew: Crew, status = 200): Promise<ConnectorResult> {
  const [stops, riders, marks, dir] = await Promise.all([
    ctx.store.listSchoolBusStops(ctx.app.id, { routeId: crew.route.id }),
    ctx.store.listSchoolBusRiders(ctx.app.id, { routeId: crew.route.id, trip: run.trip }),
    ctx.store.listSchoolBusMarks(ctx.app.id, { runId: run.id }),
    schoolDirectory(ctx.store, ctx.app.id),
  ]);
  const markOf = new Map(marks.map((m) => [m.studentId, m]));
  const ordered = tripStops(stops, run.trip);
  const count = (s: SchoolBusMarkStatus) => marks.filter((m) => m.status === s && riders.some((r) => r.studentId === m.studentId)).length;
  return ok(
    {
      id: run.id,
      route: { id: crew.route.id, name: crew.route.name, plate: crew.route.plate, capacity: crew.route.capacity },
      trip: run.trip,
      date: run.date,
      status: run.status,
      started_at: run.startedAt.toISOString(),
      ended_at: run.endedAt?.toISOString() ?? null,
      role: crew.role,
      drives: mayDrive(crew.route, crew.person.id),
      bus: freshPosition(run, ctx.now),
      counts: { riders: riders.length, boarded: count("boarded"), off: count("off"), absent: count("absent") },
      stops: ordered.map((stop) => ({
        ...busStopJson(stop, run.trip, run.passedStopIds),
        riders: riders
          .filter((r) => r.stopId === stop.id)
          .map((r) => dir.people.get(r.studentId))
          .filter((p): p is SchoolPerson => p !== undefined && p.active)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => ({ student: studentJson(p, dir, ctx.assetUrl), ...markJson(markOf.get(p.id)) })),
      })),
    },
    status,
  );
}

async function startRun(ctx: SchoolContext, request: ConnectorRequest, crew: Crew, settings: SchoolSettings): Promise<ConnectorResult> {
  if (!mayDrive(crew.route, crew.person.id)) return error(403, "not_driver", "The route's driver starts its trips.");
  const trip = record(request.body).trip;
  if (typeof trip !== "string" || !(SCHOOL_BUS_TRIPS as readonly string[]).includes(trip)) return error(400, "invalid_request", "trip is morning or afternoon.");
  const wait = await limited(ctx, request, START_LIMIT);
  if (wait) return wait;
  const today = schoolToday(settings, request.now);
  const other = (await ctx.store.listSchoolBusRuns(ctx.app.id, { routeId: crew.route.id, status: "running", date: today })).find((r) => r.trip !== trip);
  if (other) return error(409, "trip_running", "This bus is on another trip. End it first.");
  const { run, created } = await ctx.store.startSchoolBusRun({
    appId: ctx.app.id,
    routeId: crew.route.id,
    trip: trip as SchoolBusTrip,
    date: today,
    status: "running",
    startedAt: request.now,
    endedAt: null,
    startedBy: crew.person.id,
    lat: null,
    lng: null,
    locatedAt: null,
    passedStopIds: [],
    toldStopIds: [],
  });
  if (!created && run.status === "done") {
    // Started again after it was ended by mistake: it goes on where it was.
    await ctx.store.updateSchoolBusRun(ctx.app.id, run.id, { status: "running", endedAt: null }, { status: "done" });
    return runJson(ctx, { ...run, status: "running", endedAt: null }, crew);
  }
  return runJson(ctx, run, crew, created ? 201 : 200);
}

async function location(ctx: SchoolContext, request: ConnectorRequest, run: SchoolBusRun, crew: Crew): Promise<ConnectorResult> {
  if (!mayDrive(crew.route, crew.person.id)) return error(403, "not_driver", "The driver's phone sends the bus's position.");
  const { lat, lng } = record(request.body);
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return error(400, "invalid_request", "The position isn't valid.");
  }
  if (run.status !== "running") return error(409, "trip_ended", "This trip has ended.");
  if (run.locatedAt && request.now.getTime() - run.locatedAt.getTime() < BUS_LOCATION_SECONDS * 1000) return noContent;
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  await busMoved({ store: ctx.store, app: ctx.app, now: request.now }, run, crew.route, { lat: round(lat), lng: round(lng) });
  return noContent;
}

async function endRun(ctx: SchoolContext, run: SchoolBusRun, crew: Crew): Promise<ConnectorResult> {
  if (!mayDrive(crew.route, crew.person.id)) return error(403, "not_driver", "The route's driver ends its trips.");
  if (run.status === "running") await ctx.store.updateSchoolBusRun(ctx.app.id, run.id, { status: "done", endedAt: ctx.now }, { status: "running" });
  return runJson(ctx, { ...run, status: "done", endedAt: run.endedAt ?? ctx.now }, crew);
}

async function mark(ctx: SchoolContext, request: ConnectorRequest, run: SchoolBusRun, crew: Crew, studentId: number): Promise<ConnectorResult> {
  const status = record(request.body).status;
  if (typeof status !== "string" || !(SCHOOL_BUS_MARKS as readonly string[]).includes(status)) return error(400, "invalid_request", "status is boarded, off or absent.");
  const [rider] = await ctx.store.listSchoolBusRiders(ctx.app.id, { routeId: crew.route.id, studentId, trip: run.trip });
  const student = rider ? await ctx.store.getSchoolPerson(ctx.app.id, studentId) : null;
  if (!rider || !student || !student.active) return error(404, "not_found", "This student isn't on this trip.");
  if (run.status !== "running") return error(409, "trip_ended", "This trip has ended.");
  const wait = await limited(ctx, request, MARK_LIMIT);
  if (wait) return wait;
  const stop = (await ctx.store.listSchoolBusStops(ctx.app.id, { routeId: crew.route.id })).find((s) => s.id === rider.stopId) ?? null;
  const saved = await markRider({ store: ctx.store, app: ctx.app, now: request.now }, run, student, stop, status as SchoolBusMarkStatus, crew.person.id);
  const dir = await schoolDirectory(ctx.store, ctx.app.id);
  return ok({ student: studentJson(student, dir, ctx.assetUrl), ...markJson(saved) });
}

/** 113.10 The person's roles at the school, with `bus` for a bus's crew (`User.roles`, `SchoolMe.roles`). */
export async function schoolRolesOf(ctx: Pick<SchoolContext, "store" | "app">, member: SchoolMember): Promise<string[]> {
  return [...memberRoles(member), ...(await busRoles(ctx, member))];
}

/** 113.10 and 113.11 `SchoolConfig.bus`, `.library` and `.map`: whether the school has buses and books, and the platform's map the bus is drawn on. */
export async function schoolPartsConfig(store: SchoolContext["store"], appId: string) {
  const [routes, books, maps] = await Promise.all([store.listSchoolBusRoutes(appId), store.listSchoolBooks(appId, { limit: 1 }), platformSetting(store, "maps")]);
  return { bus: routes.some((r) => r.active), library: books.length > 0, map: mapConfigJson(maps?.value ?? null) };
}
