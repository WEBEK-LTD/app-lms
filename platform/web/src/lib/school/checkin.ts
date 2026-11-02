import { createHmac } from "node:crypto";
import { addDays, localToUtc, minutesOf, timeOf, utcToLocal } from "../bookings/time";
import { hmacSha256, safeEqual } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type {
  App,
  SchoolAttendanceStatus,
  SchoolCheckin,
  SchoolCheckinMethod,
  SchoolCheckinSettings,
  SchoolDayTimes,
  SchoolLeave,
  SchoolPerson,
  SchoolSettings,
} from "../data/types";
import { notifyDeps, type FlowDeps } from "../delivery/flow";
import { tellCheckin } from "./notify";
import { isoWeekday, schoolToday, type SchoolMember } from "./service";
import { schoolSettingsOf } from "./settings";

/**
 * 113.2 Checking in and out at the school, from the app: with the gate's
 * code (a QR code and six digits on a screen at the gate, new every 30
 * seconds, signed with a key only the platform holds, so an old or a made-up
 * code fails), inside the school's area (the phone's position against the
 * school's place and radius), either one or both at once, as the school
 * chooses. Late after the school's time, leaving early before its end;
 * students' parents are told. The office corrects a day with a reason, kept
 * on the record with who made it. The teacher's class register
 * (school_attendance) stays apart.
 */

export type CheckinRole = SchoolCheckin["role"];

/** How long one gate code lasts. */
export const GATE_SECONDS = 30;
/** What a gate QR code holds: `YG1.<window>.<signature>`. */
export const GATE_PREFIX = "YG1";
/** Check-in opens this long before the day starts. */
export const CHECKIN_OPENS_MINUTES = 120;

/** Sunday to Thursday where the week is so (Cairo, Riyadh); Monday to Friday in Europe. */
export function defaultSchoolDays(timezone: string): number[] {
  return timezone.startsWith("Europe/") ? [1, 2, 3, 4, 5] : [7, 1, 2, 3, 4];
}

export const DEFAULT_STUDENT_TIMES: SchoolDayTimes = { startMinute: 7 * 60 + 30, lateMinute: 8 * 60, endMinute: 14 * 60, earlyMinute: 13 * 60 + 45 };
export const DEFAULT_STAFF_TIMES: SchoolDayTimes = { startMinute: 7 * 60, lateMinute: 7 * 60 + 30, endMinute: 15 * 60, earlyMinute: 14 * 60 + 45 };

/** The school's check-in settings, with the defaults for what it hasn't set. */
export function checkinSettingsOf(settings: SchoolSettings): SchoolCheckinSettings {
  return {
    on: false,
    methods: "either",
    place: null,
    days: defaultSchoolDays(settings.timezone),
    students: DEFAULT_STUDENT_TIMES,
    staff: DEFAULT_STAFF_TIMES,
    parentAlerts: true,
    gateKey: 1,
    since: null,
    ...(settings.checkin ?? {}),
  };
}

export const usesCode = (c: Pick<SchoolCheckinSettings, "methods">) => c.methods !== "location";
export const usesPlace = (c: Pick<SchoolCheckinSettings, "methods">) => c.methods !== "qr";

// The gate's codes

/** The school's gate key, from the platform's hosted API secret: never in the app, new when `gateKey` goes up. */
export function gateSecret(hostedSecret: string, appId: string, gateKey: number): string {
  return hmacSha256(hostedSecret, `school-gate:${appId}:${gateKey}`);
}

export const gateWindow = (now: Date) => Math.floor(now.getTime() / (GATE_SECONDS * 1000));

/** The six digits of a window. */
export function gateCode(secret: string, window: number): string {
  const mac = createHmac("sha256", secret).update(`code:${window}`).digest();
  return String(mac.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

/** What the gate's QR code holds in a window. */
export function gatePayload(secret: string, window: number): string {
  return `${GATE_PREFIX}.${window}.${hmacSha256(secret, `qr:${window}`).slice(0, 22)}`;
}

export interface GateCode {
  window: number;
  startsAt: Date;
  endsAt: Date;
  code: string;
  payload: string;
}

/** This window's code and the next ones, so the gate's screen keeps going a while without the network. */
export function gateCodes(secret: string, now: Date, count: number): GateCode[] {
  const first = gateWindow(now);
  return Array.from({ length: count }, (_, i) => {
    const window = first + i;
    return { window, startsAt: new Date(window * GATE_SECONDS * 1000), endsAt: new Date((window + 1) * GATE_SECONDS * 1000), code: gateCode(secret, window), payload: gatePayload(secret, window) };
  });
}

/**
 * Whether what was typed or scanned is the gate's code now: this window's or
 * the one before (the time it takes to type it), nothing older and nothing
 * not signed with this school's key.
 */
export function readGateCode(secret: string, input: string, now: Date): boolean {
  const value = input.trim();
  const windows = [gateWindow(now), gateWindow(now) - 1];
  if (value.startsWith(`${GATE_PREFIX}.`)) {
    const [, windowText, sig] = value.split(".");
    const window = Number(windowText);
    if (!sig || !Number.isSafeInteger(window) || !windows.includes(window)) return false;
    return safeEqual(sig, gatePayload(secret, window).split(".")[2]!);
  }
  const digits = value.replace(/[\s-]/g, "");
  if (!/^\d{6}$/.test(digits)) return false;
  return windows.some((w) => safeEqual(digits, gateCode(secret, w)));
}

// The school's area

/** Metres between two places on Earth. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h))));
}

// Who, when

/** Who checks in as the signed-in person: as a teacher, else as staff, else as a student; a parent alone doesn't. */
export function checkinPersonOf(member: SchoolMember): { person: SchoolPerson; role: CheckinRole } | null {
  if (member.teacher) return { person: member.teacher, role: "teacher" };
  if (member.staff) return { person: member.staff, role: "staff" };
  if (member.student) return { person: member.student, role: "student" };
  return null;
}

export const isCheckinRole = (role: string): role is CheckinRole => role === "student" || role === "teacher" || role === "staff";

/** A person's day: the students' times, else their own working hours (with the staff's grace), else the staff's. */
export function timesFor(c: SchoolCheckinSettings, person: Pick<SchoolPerson, "workHours">, role: CheckinRole): SchoolDayTimes {
  if (role === "student") return c.students;
  const hours = person.workHours;
  if (!hours) return c.staff;
  const grace = Math.max(0, c.staff.lateMinute - c.staff.startMinute);
  const early = Math.max(0, c.staff.endMinute - c.staff.earlyMinute);
  return { startMinute: hours.startMinute, lateMinute: hours.startMinute + grace, endMinute: hours.endMinute, earlyMinute: Math.max(hours.startMinute, hours.endMinute - early) };
}

/** The days a person comes: a teacher's or staff member's own, else the school's. */
export function daysFor(c: SchoolCheckinSettings, person: Pick<SchoolPerson, "workHours">, role: CheckinRole): number[] {
  return role !== "student" && person.workHours && person.workHours.days.length > 0 ? person.workHours.days : c.days;
}

/** Minutes after midnight of an instant in the zone. */
export function localMinute(at: Date, timezone: string): number {
  return minutesOf(utcToLocal(at, timezone).time) ?? 0;
}

export type CheckinState = "not_yet" | "in" | "left" | "absent" | "excused" | "leave" | "off";

/** Where a person's day stands. */
export function dayState(input: { row: SchoolCheckin | null; date: string; today: string; nowMinute: number; times: SchoolDayTimes; workDay: boolean; onLeave: boolean; since: string | null }): CheckinState {
  const { row } = input;
  if (row?.mark === "excused") return "excused";
  if (row?.mark === "absent") return "absent";
  if (row?.outAt) return "left";
  if (row?.inAt) return "in";
  if (input.onLeave) return "leave";
  if (!input.workDay || (input.since !== null && input.date < input.since)) return "off";
  if (input.date > input.today) return "not_yet";
  if (input.date < input.today) return "absent";
  return input.nowMinute >= input.times.endMinute ? "absent" : "not_yet";
}

/** Whether an approved leave request covers the day. */
export const onLeaveOn = (leave: readonly SchoolLeave[], personId: number, date: string) => leave.some((l) => l.personId === personId && l.status === "approved" && l.startsOn <= date && l.endsOn >= date);

export function checkinDayJson(row: SchoolCheckin | null, date: string, state: CheckinState, timezone: string) {
  const at = (d: Date | null) => (d ? utcToLocal(d, timezone).time : null);
  return {
    date,
    state,
    in_at: row?.inAt?.toISOString() ?? null,
    in_time: at(row?.inAt ?? null),
    in_method: row?.inMethod ?? null,
    out_at: row?.outAt?.toISOString() ?? null,
    out_time: at(row?.outAt ?? null),
    out_method: row?.outMethod ?? null,
    late: row?.late ?? false,
    left_early: row?.leftEarly ?? false,
    corrections: (row?.corrections ?? []).map((c) => ({ at: c.at, reason: c.reason, change: c.change })),
  };
}

export const timesJson = (t: SchoolDayTimes) => ({ starts: timeOf(t.startMinute), late_from: timeOf(t.lateMinute), ends: timeOf(t.endMinute), early_before: timeOf(t.earlyMinute) });

// Checking in and out from the app

export type CheckinError = "checkin_off" | "not_school_day" | "too_early" | "code_needed" | "invalid_code" | "location_needed" | "outside_area" | "already_in" | "not_in" | "already_out";

export const CHECKIN_MESSAGES: Record<CheckinError, string> = {
  checkin_off: "The school doesn't take check-ins in the app.",
  not_school_day: "Today isn't one of your school days.",
  too_early: "It's too early: check-in opens two hours before the day starts.",
  code_needed: "Type the code shown on the school's screen at the gate.",
  invalid_code: "This code isn't the gate's code now. Type the code on the screen as it is now.",
  location_needed: "Allow the app to use your location to check in at the school.",
  outside_area: "You're not at the school: check in when you're inside its area.",
  already_in: "You've checked in today already.",
  not_in: "Check in first.",
  already_out: "You've checked out today already.",
};

export interface CheckinInput {
  person: SchoolPerson;
  role: CheckinRole;
  action: "in" | "out";
  code: string | null;
  position: { lat: number; lng: number } | null;
}

export type CheckinAnswer =
  | { ok: true; row: SchoolCheckin; date: string; result: "on_time" | "late" | "out" | "left_early" }
  | { ok: false; code: CheckinError; distanceM?: number };

function emptyDay(appId: string, person: SchoolPerson, role: CheckinRole, date: string, now: Date): SchoolCheckin {
  return { appId, personId: person.id, role, date, inAt: null, inMethod: null, outAt: null, outMethod: null, late: false, leftEarly: false, mark: null, corrections: [], updatedAt: now };
}

/** The proof a check-in brings, against the school's methods: the method used, or why it isn't enough. */
export function proofOf(c: SchoolCheckinSettings, secret: string, input: Pick<CheckinInput, "code" | "position">, now: Date): { method: SchoolCheckinMethod } | { code: CheckinError; distanceM?: number } {
  const code = input.code?.trim() ? input.code.trim() : null;
  const codeOk = code !== null && readGateCode(secret, code, now);
  const place = c.place;
  const distance = place && input.position ? distanceM(place, input.position) : null;
  const inside = distance !== null && place !== null && distance <= place.radiusM;
  const area = (): { code: CheckinError; distanceM?: number } | null => {
    if (!place) return { code: "checkin_off" };
    if (!input.position) return { code: "location_needed" };
    return inside ? null : { code: "outside_area", distanceM: distance ?? undefined };
  };
  const gate = (): { code: CheckinError } | null => (code === null ? { code: "code_needed" } : codeOk ? null : { code: "invalid_code" });
  switch (c.methods) {
    case "qr":
      return gate() ?? { method: "qr" };
    case "location":
      return area() ?? { method: "location" };
    case "both":
      return gate() ?? area() ?? { method: "qr" };
    case "either":
      if (code !== null) return gate() ?? { method: "qr" };
      if (input.position && place) return area() ?? { method: "location" };
      return { code: "code_needed" };
  }
}

/** A check-in or check-out from the app; a student's parents are told when the school wants. */
export async function checkInOrOut(deps: FlowDeps & { secret: string }, input: CheckinInput): Promise<CheckinAnswer> {
  const { store, app, now } = deps;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const c = checkinSettingsOf(settings);
  if (!c.on) return { ok: false, code: "checkin_off" };
  const date = schoolToday(settings, now);
  if (!daysFor(c, input.person, input.role).includes(isoWeekday(date))) return { ok: false, code: "not_school_day" };
  const minute = localMinute(now, settings.timezone);
  const times = timesFor(c, input.person, input.role);
  const before = (await store.getSchoolCheckin(app.id, input.person.id, date)) ?? emptyDay(app.id, input.person, input.role, date, now);
  // Where the day stands first, then the proof.
  if (input.action === "in" && before.inAt) return { ok: false, code: "already_in" };
  if (input.action === "in" && minute < times.startMinute - CHECKIN_OPENS_MINUTES) return { ok: false, code: "too_early" };
  if (input.action === "out" && !before.inAt) return { ok: false, code: "not_in" };
  if (input.action === "out" && before.outAt) return { ok: false, code: "already_out" };
  const proof = proofOf(c, gateSecret(deps.secret, app.id, c.gateKey), input, now);
  if ("code" in proof) return { ok: false, ...proof };
  let row: SchoolCheckin;
  let result: "on_time" | "late" | "out" | "left_early";
  if (input.action === "in") {
    const late = minute >= times.lateMinute;
    // Coming in undoes the office's "absent"; an excuse stays.
    row = { ...before, inAt: now, inMethod: proof.method, late, mark: before.mark === "excused" ? "excused" : null, updatedAt: now };
    result = late ? "late" : "on_time";
  } else {
    const leftEarly = minute < times.earlyMinute;
    row = { ...before, outAt: now, outMethod: proof.method, leftEarly, updatedAt: now };
    result = leftEarly ? "left_early" : "out";
  }
  await store.saveSchoolCheckin(row);
  if (input.role === "student" && c.parentAlerts) {
    try {
      await tellCheckin(notifyDeps(deps), input.person, input.action, utcToLocal(now, settings.timezone).time, input.action === "in" ? row.late : row.leftEarly);
    } catch {
      // The check-in is saved either way.
    }
  }
  return { ok: true, row, date, result };
}

// The office's corrections

export interface CorrectionInput {
  person: SchoolPerson;
  role: CheckinRole;
  date: string;
  /** "HH:MM", or null for none. */
  inTime: string | null;
  outTime: string | null;
  mark: "present" | "absent" | "excused";
  reason: string;
  by: string;
}

/** The office's correction of a day: the times and the mark, with the reason and who made it kept on the record. Null: nothing changed. */
export async function correctCheckin(deps: { store: DataStore; app: App; now: Date }, input: CorrectionInput): Promise<SchoolCheckin | null> {
  const { store, app, now } = deps;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const c = checkinSettingsOf(settings);
  const times = timesFor(c, input.person, input.role);
  const before = (await store.getSchoolCheckin(app.id, input.person.id, input.date)) ?? emptyDay(app.id, input.person, input.role, input.date, now);
  const zone = settings.timezone;
  const local = (d: Date | null) => (d ? utcToLocal(d, zone).time : null);
  const inAt = input.inTime ? (local(before.inAt) === input.inTime ? before.inAt : localToUtc(input.date, input.inTime, zone)) : null;
  const outAt = input.outTime ? (local(before.outAt) === input.outTime ? before.outAt : localToUtc(input.date, input.outTime, zone)) : null;
  const mark = input.mark === "present" ? null : input.mark;
  const changes: string[] = [];
  const show = (t: string | null) => t ?? "—";
  if (local(before.inAt) !== local(inAt)) changes.push(`In ${show(local(before.inAt))} → ${show(local(inAt))}`);
  if (local(before.outAt) !== local(outAt)) changes.push(`Out ${show(local(before.outAt))} → ${show(local(outAt))}`);
  if (before.mark !== mark) changes.push(mark === "absent" ? "Marked absent" : mark === "excused" ? "Marked excused" : "Marked present");
  if (changes.length === 0) return null;
  const inMinute = inAt ? localMinute(inAt, zone) : null;
  const outMinute = outAt ? localMinute(outAt, zone) : null;
  const row: SchoolCheckin = {
    ...before,
    role: input.role,
    inAt,
    inMethod: inAt ? (inAt === before.inAt ? before.inMethod : "office") : null,
    outAt,
    outMethod: outAt ? (outAt === before.outAt ? before.outMethod : "office") : null,
    late: inMinute !== null && inMinute >= times.lateMinute,
    leftEarly: outMinute !== null && outMinute < times.earlyMinute,
    mark,
    corrections: [...before.corrections, { at: now.toISOString(), by: input.by, reason: input.reason, change: changes.join(", ") }],
    updatedAt: now,
  };
  await store.saveSchoolCheckin(row);
  return row;
}

// The board of the day and the month's report

export interface BoardRow {
  person: SchoolPerson;
  role: CheckinRole;
  row: SchoolCheckin | null;
  state: CheckinState;
  times: SchoolDayTimes;
  /** A student's mark in the teacher's class register that day. */
  register: SchoolAttendanceStatus | null;
}

/** Everyone who checks in (active students, teachers and staff), and where their day stands. */
export async function checkinBoard(store: DataStore, app: Pick<App, "id" | "timeZone" | "catalogSettings">, date: string, now: Date): Promise<BoardRow[]> {
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const c = checkinSettingsOf(settings);
  const [people, rows, leave, register] = await Promise.all([
    store.listSchoolPeople(app.id),
    store.listSchoolCheckins(app.id, { date }),
    store.listSchoolLeave(app.id, { statuses: ["approved"], from: date, to: date }),
    store.listSchoolAttendance(app.id, { from: date, to: date }),
  ]);
  const today = schoolToday(settings, now);
  const nowMinute = localMinute(now, settings.timezone);
  const byPerson = new Map(rows.map((r) => [r.personId, r]));
  const marks = new Map(register.map((r) => [r.studentId, r.status]));
  const weekday = Number.isNaN(isoWeekday(date)) ? 0 : isoWeekday(date);
  return people
    .filter((p) => p.active && isCheckinRole(p.role))
    .map((person) => {
      const role = person.role as CheckinRole;
      const row = byPerson.get(person.id) ?? null;
      const times = timesFor(c, person, role);
      const state = dayState({ row, date, today, nowMinute, times, workDay: daysFor(c, person, role).includes(weekday), onLeave: onLeaveOn(leave, person.id, date), since: c.since });
      return { person, role, row, state, times, register: role === "student" ? (marks.get(person.id) ?? null) : null };
    });
}

export interface MonthRow {
  person: SchoolPerson;
  role: CheckinRole;
  /** The person's school days counted (to today). */
  days: number;
  present: number;
  late: number;
  leftEarly: number;
  absent: number;
  excused: number;
  leave: number;
}

/** "2026-11" → its first and last days. */
export function monthRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  return { from, to: addDays(addDays(from, 31).slice(0, 8) + "01", -1) };
}

/** A month's days for each person, to today: present, late, left early, absent, excused and on leave. */
export async function monthReport(
  store: DataStore,
  app: Pick<App, "id" | "timeZone" | "catalogSettings">,
  month: string,
  now: Date,
  only?: { personId?: number; roles?: CheckinRole[] },
): Promise<{ from: string; to: string; rows: MonthRow[]; days: Map<number, { date: string; row: SchoolCheckin | null; state: CheckinState }[]> }> {
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const c = checkinSettingsOf(settings);
  const { from, to } = monthRange(month);
  const today = schoolToday(settings, now);
  const last = to < today ? to : today;
  const nowMinute = localMinute(now, settings.timezone);
  const people = (only?.personId !== undefined ? [await store.getSchoolPerson(app.id, only.personId)].filter((p) => p !== null) : await store.listSchoolPeople(app.id)).filter(
    (p) => isCheckinRole(p.role) && (only?.personId !== undefined || p.active) && (!only?.roles || only.roles.includes(p.role as CheckinRole)),
  );
  const ids = people.map((p) => p.id);
  const [rows, leave] = await Promise.all([store.listSchoolCheckins(app.id, { personIds: ids, from, to }), store.listSchoolLeave(app.id, { statuses: ["approved"], from, to })]);
  const byKey = new Map(rows.map((r) => [`${r.personId}:${r.date}`, r]));
  const out: MonthRow[] = [];
  const days = new Map<number, { date: string; row: SchoolCheckin | null; state: CheckinState }[]>();
  for (const person of people) {
    const role = person.role as CheckinRole;
    const times = timesFor(c, person, role);
    const weekdays = daysFor(c, person, role);
    // Days before they were added are never counted.
    const added = utcToLocal(person.createdAt, settings.timezone).date;
    const line: MonthRow = { person, role, days: 0, present: 0, late: 0, leftEarly: 0, absent: 0, excused: 0, leave: 0 };
    const list: { date: string; row: SchoolCheckin | null; state: CheckinState }[] = [];
    for (let date = from; date <= last; date = addDays(date, 1)) {
      const row = byKey.get(`${person.id}:${date}`) ?? null;
      const state = dayState({ row, date, today, nowMinute, times, workDay: weekdays.includes(isoWeekday(date)) && date >= added, onLeave: onLeaveOn(leave, person.id, date), since: c.since });
      if (state === "off" || state === "not_yet") {
        if (row) list.push({ date, row, state });
        continue;
      }
      list.push({ date, row, state });
      line.days += 1;
      if (state === "in" || state === "left") line.present += 1;
      if (state === "absent") line.absent += 1;
      if (state === "excused") line.excused += 1;
      if (state === "leave") line.leave += 1;
      if (row?.late && (state === "in" || state === "left")) line.late += 1;
      if (row?.leftEarly && state === "left") line.leftEarly += 1;
    }
    out.push(line);
    days.set(person.id, list.reverse());
  }
  return { from, to, rows: out, days };
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const ROLE_WORDS: Record<CheckinRole, string> = { student: "Student", teacher: "Teacher", staff: "Staff member" };

/** The month's report as a CSV file, its header in the dashboard's language (`k`, English when not given). */
export function monthCsv(rows: readonly MonthRow[], detail: (row: MonthRow) => string, k: (english: string) => string = (english) => english): string {
  const head = [k("Name"), k("Role"), k("Class or job"), k("School days"), k("Present"), k("Late"), k("Left early"), k("Absent"), k("Excused"), k("On leave")];
  const lines = rows.map((r) => [r.person.name, k(ROLE_WORDS[r.role]), detail(r), r.days, r.present, r.late, r.leftEarly, r.absent, r.excused, r.leave].map(csvCell).join(","));
  return [head.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
