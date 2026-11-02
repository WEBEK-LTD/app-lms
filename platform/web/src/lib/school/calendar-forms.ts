import { addDays, isDate, minutesOf, timeOf } from "../bookings/time";
import {
  SCHOOL_BEHAVIOUR_ALERTS,
  SCHOOL_EVENT_KINDS,
  type SchoolBehaviourAlerts,
  type SchoolBehaviourKind,
  type SchoolClass,
  type SchoolEvent,
  type SchoolEventAudience,
  type SchoolEventKind,
  type SchoolExam,
} from "../data/types";
import { BEHAVIOUR_LIMITS } from "./behaviour";

/**
 * 113.8 The dashboard's forms for the calendar, the exams' timetable and
 * behaviour, checked. Messages are English; the dashboard translates them
 * (`schoolLife.known`).
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

export const CALENDAR_LIMITS = {
  events: 2000,
  exams: 2000,
  title: 120,
  notes: 1000,
  examNotes: 2000,
  place: 120,
  room: 30,
  /** A holiday or a break of up to this many days. */
  days: 120,
  /** An exam of up to 8 hours. */
  minutes: 480,
} as const;

function limited(form: Record<string, string>, name: string, max: number, errors: Record<string, string>, empty: string | null): string {
  const value = str(form, name);
  if (!value && empty) errors[name] = empty;
  else if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
  return value;
}

/** Who it is for, from the form's choice: `school`, `staff`, `grade:Grade 5` or `class:12`. */
function audienceOf(value: string, classes: readonly Pick<SchoolClass, "id" | "grade">[]): { audience: SchoolEventAudience; grade: string | null; classId: number | null } | null {
  if (value === "school" || value === "staff") return { audience: value, grade: null, classId: null };
  if (value.startsWith("grade:")) {
    const grade = value.slice(6);
    return classes.some((c) => c.grade === grade) ? { audience: "grade", grade, classId: null } : null;
  }
  if (value.startsWith("class:")) {
    const id = Number(value.slice(6));
    return classes.some((c) => c.id === id) ? { audience: "class", grade: null, classId: id } : null;
  }
  return null;
}

export function audienceValue(item: { audience?: SchoolEventAudience; grade: string | null; classId: number | null }): string {
  if (item.audience === "school" || item.audience === "staff") return item.audience;
  if (item.classId !== null) return `class:${item.classId}`;
  return item.grade !== null ? `grade:${item.grade}` : "school";
}

export type EventForm = Omit<SchoolEvent, "id" | "appId" | "createdAt" | "updatedAt">;

export function parseEventForm(form: Record<string, string>, classes: readonly Pick<SchoolClass, "id" | "grade">[]): Parsed<EventForm> {
  const errors: Record<string, string> = {};
  const kind = str(form, "kind") as SchoolEventKind;
  if (!SCHOOL_EVENT_KINDS.includes(kind)) errors.kind = "Choose an event, a holiday or exam days.";
  const title = limited(form, "title", CALENDAR_LIMITS.title, errors, "Give it a title.");
  const notes = limited(form, "notes", CALENDAR_LIMITS.notes, errors, null);
  const place = limited(form, "place", CALENDAR_LIMITS.place, errors, null);
  const startsOn = str(form, "startsOn");
  const endsOn = str(form, "endsOn") || startsOn;
  if (!isDate(startsOn)) errors.startsOn = "Choose the day it starts.";
  else if (!isDate(endsOn) || endsOn < startsOn) errors.endsOn = "It ends on or after the day it starts.";
  else if (addDays(startsOn, CALENDAR_LIMITS.days) < endsOn) errors.endsOn = `Up to ${CALENDAR_LIMITS.days} days.`;
  const allDay = kind === "holiday" || form.allDay === "on" || (!str(form, "starts") && !str(form, "ends"));
  let startMinute: number | null = null;
  let endMinute: number | null = null;
  if (!allDay) {
    startMinute = minutesOf(str(form, "starts"));
    endMinute = str(form, "ends") ? minutesOf(str(form, "ends")) : null;
    if (startMinute === null) errors.starts = "Enter the start, like 08:30.";
    else if (str(form, "ends") && (endMinute === null || endMinute <= startMinute)) errors.ends = "It ends after it starts.";
  }
  const who = audienceOf(str(form, "for"), classes);
  if (!who) errors.for = "Choose who it is for.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { kind, title, notes: notes || null, startsOn, endsOn, startMinute, endMinute, place: place || null, ...who! } };
}

export function eventFormValues(event: SchoolEvent | null, day: string): Record<string, string> {
  if (!event) return { kind: "event", title: "", notes: "", startsOn: day, endsOn: "", starts: "", ends: "", place: "", for: "school", allDay: "on" };
  return {
    kind: event.kind,
    title: event.title,
    notes: event.notes ?? "",
    startsOn: event.startsOn,
    endsOn: event.endsOn === event.startsOn ? "" : event.endsOn,
    starts: event.startMinute !== null ? timeOf(event.startMinute) : "",
    ends: event.endMinute !== null ? timeOf(event.endMinute) : "",
    place: event.place ?? "",
    for: audienceValue(event),
    allDay: event.startMinute === null ? "on" : "",
  };
}

export type ExamForm = Pick<SchoolExam, "classId" | "grade" | "subjectId" | "date" | "startMinute" | "durationMinutes" | "room" | "notes">;

export function parseExamForm(form: Record<string, string>, classes: readonly Pick<SchoolClass, "id" | "grade">[], subjectIds: readonly number[]): Parsed<ExamForm> {
  const errors: Record<string, string> = {};
  const who = audienceOf(str(form, "for"), classes);
  if (!who || (who.audience !== "grade" && who.audience !== "class")) errors.for = "Choose a class or a grade.";
  const subjectId = Number(str(form, "subjectId"));
  if (!subjectIds.includes(subjectId)) errors.subjectId = "Choose a subject.";
  const date = str(form, "date");
  if (!isDate(date)) errors.date = "Choose its date.";
  const startMinute = minutesOf(str(form, "starts"));
  if (startMinute === null) errors.starts = "Enter the start, like 08:30.";
  const duration = Number(str(form, "duration"));
  if (!Number.isInteger(duration) || duration < 5 || duration > CALENDAR_LIMITS.minutes) errors.duration = `The exam takes 5 to ${CALENDAR_LIMITS.minutes} minutes.`;
  const room = limited(form, "room", CALENDAR_LIMITS.room, errors, null);
  const notes = limited(form, "notes", CALENDAR_LIMITS.examNotes, errors, null);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { classId: who!.classId, grade: who!.grade, subjectId, date, startMinute: startMinute!, durationMinutes: duration, room: room || null, notes: notes || null } };
}

export function examFormValues(exam: SchoolExam | null): Record<string, string> {
  if (!exam) return { for: "", subjectId: "", date: "", starts: "09:00", duration: "60", room: "", notes: "" };
  return {
    for: audienceValue(exam),
    subjectId: String(exam.subjectId),
    date: exam.date,
    starts: timeOf(exam.startMinute),
    duration: String(exam.durationMinutes),
    room: exam.room ?? "",
    notes: exam.notes ?? "",
  };
}

export function parseCategoryForm(form: Record<string, string>): Parsed<{ name: string; kind: SchoolBehaviourKind; points: number; active: boolean }> {
  const errors: Record<string, string> = {};
  const name = limited(form, "name", BEHAVIOUR_LIMITS.name, errors, "Name the category, like Helping others.");
  const kind = str(form, "kind");
  if (kind !== "positive" && kind !== "negative") errors.kind = "Choose positive or negative.";
  const points = Number(str(form, "points"));
  if (!Number.isInteger(points) || points < 0 || points > BEHAVIOUR_LIMITS.points) errors.points = `Points are 0 to ${BEHAVIOUR_LIMITS.points}.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  const signed = kind === "negative" ? -points : points;
  return { ok: true, value: { name, kind: kind as SchoolBehaviourKind, points: signed, active: form.active !== "off" } };
}

export function parseBehaviourAlerts(form: Record<string, string>): SchoolBehaviourAlerts | null {
  const value = str(form, "behaviourAlerts") as SchoolBehaviourAlerts;
  return SCHOOL_BEHAVIOUR_ALERTS.includes(value) ? value : null;
}

