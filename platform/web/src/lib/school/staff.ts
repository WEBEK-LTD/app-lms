import { addDays, isDate, minutesOf, timeOf } from "../bookings/time";
import { SCHOOL_LEAVE_KINDS, type SchoolCheckinSettings, type SchoolLeave, type SchoolLeaveKind, type SchoolPerson, type SchoolWorkHours } from "../data/types";
import { timesFor, timesJson, type CheckinRole } from "./checkin";
import { fileJson } from "./service";

/**
 * 113.3 Everyone who works at the school, teachers and staff: their job,
 * department, working hours and duties, their leave requests from the app
 * (answered in the dashboard) and the staff's own news. Their salaries,
 * recorded by hand, are 113.12's (lib/school/salaries.ts).
 */

export const STAFF_LIMITS = { jobTitle: 80, department: 80, duties: 1000, leaveNote: 1000, answer: 1000, leaveDays: 90 } as const;
/** Leave can be asked for up to this many days back (a sick day told after it). */
export const LEAVE_DAYS_BACK = 30;

/** Days between two dates, both counted. */
export function daysBetween(from: string, to: string): number {
  let n = 0;
  for (let d = from; d <= to && n <= 366; d = addDays(d, 1)) n += 1;
  return n;
}

export function workHoursJson(hours: SchoolWorkHours | null | undefined) {
  return hours ? { days: [...hours.days].sort((a, b) => a - b), starts: timeOf(hours.startMinute), ends: timeOf(hours.endMinute) } : null;
}

/** `GET /staff/me`. */
export function staffMeJson(person: SchoolPerson, c: SchoolCheckinSettings, timetable: { days: unknown[] }, assetUrl: (id: string) => string) {
  const role = person.role as CheckinRole;
  return {
    name: person.name,
    photo_url: person.photoAssetId ? assetUrl(person.photoAssetId) : null,
    role: person.role === "teacher" ? "teacher" : "staff",
    job_title: person.jobTitle ?? null,
    department: person.department ?? null,
    work_hours: workHoursJson(person.workHours),
    days: person.workHours?.days.length ? [...person.workHours.days].sort((a, b) => a - b) : [...c.days].sort((a, b) => a - b),
    times: timesJson(timesFor(c, person, role)),
    duties: person.duties ?? null,
    timetable,
  };
}

export function leaveJson(leave: SchoolLeave, platformUrl: string) {
  return {
    id: leave.id,
    kind: leave.kind,
    starts_on: leave.startsOn,
    ends_on: leave.endsOn,
    days: daysBetween(leave.startsOn, leave.endsOn),
    note: leave.note,
    file: leave.file ? fileJson(leave.file, platformUrl) : null,
    status: leave.status,
    answer: leave.answer,
    answered_at: leave.answeredAt?.toISOString() ?? null,
    created_at: leave.createdAt.toISOString(),
  };
}

/** A leave request from the app, checked. */
export function readLeaveInput(
  body: Record<string, unknown>,
  today: string,
): { ok: true; value: { kind: SchoolLeaveKind; startsOn: string; endsOn: string; note: string | null } } | { ok: false; message: string } {
  const kind = body.kind;
  if (typeof kind !== "string" || !(SCHOOL_LEAVE_KINDS as readonly string[]).includes(kind)) return { ok: false, message: "Choose sick, annual or other leave." };
  const startsOn = typeof body.starts_on === "string" ? body.starts_on : "";
  const endsOn = typeof body.ends_on === "string" ? body.ends_on : "";
  if (!isDate(startsOn) || !isDate(endsOn)) return { ok: false, message: "Give the first and the last day, like 2026-11-02." };
  if (endsOn < startsOn) return { ok: false, message: "The last day is on or after the first." };
  if (startsOn < addDays(today, -LEAVE_DAYS_BACK)) return { ok: false, message: `Leave can be asked for up to ${LEAVE_DAYS_BACK} days back.` };
  if (endsOn > addDays(today, 365)) return { ok: false, message: "Leave can be asked for up to a year ahead." };
  if (daysBetween(startsOn, endsOn) > STAFF_LIMITS.leaveDays) return { ok: false, message: `Ask for up to ${STAFF_LIMITS.leaveDays} days at a time.` };
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  if (note && note.length > STAFF_LIMITS.leaveNote) return { ok: false, message: `The note can be up to ${STAFF_LIMITS.leaveNote} characters.` };
  return { ok: true, value: { kind: kind as SchoolLeaveKind, startsOn, endsOn, note } };
}

// The dashboard's forms

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

export interface WorkForm {
  jobTitle: string | null;
  department: string | null;
  workHours: SchoolWorkHours | null;
  duties: string | null;
}

/** A teacher's or staff member's job, department, working days and hours, and duties (each optional). */
export function parseWorkForm(form: Record<string, string>): Parsed<WorkForm> {
  const errors: Record<string, string> = {};
  const text = (name: string, max: number) => {
    const value = (form[name] ?? "").trim();
    if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
    return value || null;
  };
  const jobTitle = text("jobTitle", STAFF_LIMITS.jobTitle);
  const department = text("department", STAFF_LIMITS.department);
  const duties = text("duties", STAFF_LIMITS.duties);
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => form[`workDay${d}`] === "on");
  const startText = (form.workStart ?? "").trim();
  const endText = (form.workEnd ?? "").trim();
  let workHours: SchoolWorkHours | null = null;
  if (startText || endText || days.length) {
    const start = minutesOf(startText);
    const end = minutesOf(endText);
    if (start === null) errors.workStart = "Enter the start, like 08:30.";
    if (end === null) errors.workEnd = "Enter the end, like 09:15.";
    else if (start !== null && end <= start) errors.workEnd = "The day ends after it starts.";
    if (!days.length) errors.workDays = "Choose the days they work.";
    if (start !== null && end !== null) workHours = { days, startMinute: start, endMinute: end };
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { jobTitle, department, workHours, duties } };
}

export function workFormValues(person: SchoolPerson | null): Record<string, string> {
  const hours = person?.workHours ?? null;
  return {
    jobTitle: person?.jobTitle ?? "",
    department: person?.department ?? "",
    duties: person?.duties ?? "",
    workStart: hours ? timeOf(hours.startMinute) : "",
    workEnd: hours ? timeOf(hours.endMinute) : "",
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [`workDay${d}`, hours?.days.includes(d) ? "on" : ""])),
  };
}
