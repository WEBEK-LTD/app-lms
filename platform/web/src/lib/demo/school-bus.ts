import type { SchoolBusMark, SchoolBusRider, SchoolBusRoute, SchoolBusRun, SchoolBusStop, SchoolBusTrip } from "../data/types";
import { metersBetween, tripStops } from "../school/bus";

/**
 * Nakhla School's bus in Studio's school demo (113.10). Nobody's phone
 * drives it, so while no trip of the day was started in the app, the
 * route's bus goes round its trip again and again: from the first stop to
 * the school in the morning, from the school to the last stop in the
 * afternoon, at city speed, a minute at each stop and a few minutes at the
 * end before the next round. Worked out from the time when it's read (as
 * the delivery and taxi demos' drivers, lib/demo/courier.ts and taxi.ts),
 * never kept. A trip the visitor starts as Ms. Mona is a real one and
 * takes its place.
 */

/** Nakhla School, Degla, Maadi. */
export const NAKHLA_SCHOOL = { lat: 29.9605, lng: 31.277 };

/** City speed, in km an hour; the way by road is about this much longer than the straight line. */
const SPEED_KMH = 20;
const ROAD = 1.3;
/** Minutes at each stop, and at the end of the trip before the bus starts again. */
const DWELL_MINUTES = 1;
const REST_MINUTES = 5;
/** Before 11:00 the morning trip goes round; after, the afternoon's. */
const AFTERNOON_FROM = 11 * 60;

/** The trip the demo's bus is on at this time of the school's day (minutes from midnight). */
export function demoBusTrip(localMinute: number): SchoolBusTrip {
  return localMinute < AFTERNOON_FROM ? "morning" : "afternoon";
}

interface Point {
  lat: number;
  lng: number;
  stopId: number | null;
}

export interface DemoBusNow {
  lat: number;
  lng: number;
  /** When this round started. */
  startedAt: Date;
  /** The stops reached on this round, in order, with when. */
  reached: { stopId: number; at: Date }[];
  /** When the bus reached the school this round (the morning's end), or null. */
  atSchool: Date | null;
}

/** Where the demo's bus is now on the trip, through the trip's stops in order. */
export function demoBusNow(stops: readonly SchoolBusStop[], trip: SchoolBusTrip, now: Date): DemoBusNow | null {
  const ordered = tripStops(stops, trip);
  if (ordered.length === 0) return null;
  const school: Point = { ...NAKHLA_SCHOOL, stopId: null };
  const points: Point[] = trip === "morning" ? [...ordered.map((s) => ({ lat: s.lat, lng: s.lng, stopId: s.id })), school] : [school, ...ordered.map((s) => ({ lat: s.lat, lng: s.lng, stopId: s.id }))];
  // Each leg: driving to the next point, then waiting there.
  const legs = points.slice(1).map((to, i) => ({ from: points[i]!, to, minutes: (metersBetween(points[i]!, to) * ROAD) / ((SPEED_KMH * 1000) / 60) }));
  const round = legs.reduce((sum, leg) => sum + leg.minutes + DWELL_MINUTES, 0) + REST_MINUTES;
  const minuteNow = now.getTime() / 60_000;
  const into = minuteNow % round;
  const startedAt = new Date((minuteNow - into) * 60_000);
  const at = (minutes: number) => new Date(startedAt.getTime() + minutes * 60_000);
  const reached: { stopId: number; at: Date }[] = [];
  // In the afternoon the first stop is the school, where everyone gets on.
  if (points[0]!.stopId !== null) reached.push({ stopId: points[0]!.stopId, at: startedAt });
  let clock = trip === "morning" ? DWELL_MINUTES : 0;
  let where = { lat: points[0]!.lat, lng: points[0]!.lng };
  let atSchool: Date | null = null;
  if (into < clock) return { ...where, startedAt, reached, atSchool };
  for (const leg of legs) {
    if (into < clock + leg.minutes) {
      const part = (into - clock) / leg.minutes;
      where = { lat: leg.from.lat + (leg.to.lat - leg.from.lat) * part, lng: leg.from.lng + (leg.to.lng - leg.from.lng) * part };
      return { ...where, startedAt, reached, atSchool };
    }
    clock += leg.minutes;
    where = { lat: leg.to.lat, lng: leg.to.lng };
    if (leg.to.stopId !== null) reached.push({ stopId: leg.to.stopId, at: at(clock) });
    else atSchool = at(clock);
    clock += DWELL_MINUTES;
    if (into < clock) break;
  }
  return { ...where, startedAt, reached, atSchool };
}

/** The demo's trip as a running trip of today, with the bus where it is now. Its ID is 0: it is never kept. */
export function demoBusRun(appId: string, route: Pick<SchoolBusRoute, "id" | "driverId">, stops: readonly SchoolBusStop[], trip: SchoolBusTrip, date: string, now: Date): { run: SchoolBusRun; bus: DemoBusNow } | null {
  const bus = demoBusNow(stops, trip, now);
  if (!bus) return null;
  return {
    bus,
    run: {
      id: 0,
      appId,
      routeId: route.id,
      trip,
      date,
      status: "running",
      startedAt: bus.startedAt,
      endedAt: null,
      startedBy: route.driverId,
      lat: bus.lat,
      lng: bus.lng,
      locatedAt: now,
      passedStopIds: bus.reached.map((r) => r.stopId),
      toldStopIds: [],
    },
  };
}

/**
 * How a rider is marked on the demo's trip now: in the morning on the bus
 * once it reached their stop and off at the school; in the afternoon on
 * the bus from the school and off at their stop. Undefined before.
 */
export function demoBusMark(run: SchoolBusRun, bus: DemoBusNow, rider: Pick<SchoolBusRider, "studentId" | "stopId">): SchoolBusMark | undefined {
  const atStop = bus.reached.find((r) => r.stopId === rider.stopId)?.at ?? null;
  const base = { appId: run.appId, runId: run.id, studentId: rider.studentId, markedBy: run.startedBy };
  if (run.trip === "morning") {
    if (!atStop) return undefined;
    if (bus.atSchool) return { ...base, status: "off", boardedAt: atStop, offAt: bus.atSchool, updatedAt: bus.atSchool };
    return { ...base, status: "boarded", boardedAt: atStop, offAt: null, updatedAt: atStop };
  }
  if (atStop) return { ...base, status: "off", boardedAt: bus.startedAt, offAt: atStop, updatedAt: atStop };
  return { ...base, status: "boarded", boardedAt: bus.startedAt, offAt: null, updatedAt: bus.startedAt };
}
