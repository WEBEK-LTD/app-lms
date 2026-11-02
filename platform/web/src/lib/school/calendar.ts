import { addDays, timeOf } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { SchoolClass, SchoolEvent, SchoolExam, SchoolPerson } from "../data/types";
import type { SchoolDirectory, SchoolMember } from "./service";

/**
 * 113.8 The school's calendar (events, holidays and breaks, exam days) and
 * the exams' timetable as each person sees them: everyone's events, their
 * grade's and their class's; the staff's for those who work at the school;
 * the exams of their class or grade once published. A holiday is a day
 * without school: no absence is told that day (lib/school/flow.ts).
 */

/** The classes and grades someone sees the calendar of, and whether they work at the school. */
export interface CalendarView {
  classIds: Set<number>;
  grades: Set<string>;
  works: boolean;
}

/** Whether the person works at the school (a teacher, or 113.3's staff). */
export function worksAtSchool(member: SchoolMember): boolean {
  return Object.entries(member).some(([role, person]) => person !== null && role !== "student" && role !== "parent");
}

export function calendarView(classes: Map<number, SchoolClass>, classIds: Iterable<number>, works: boolean): CalendarView {
  const ids = new Set([...classIds].filter((id) => classes.has(id)));
  const grades = new Set([...ids].map((id) => classes.get(id)?.grade ?? null).filter((g): g is string => g !== null));
  return { classIds: ids, grades, works };
}

/** A student's view: their class and its grade. */
export function studentView(student: Pick<SchoolPerson, "classId">, classes: Map<number, SchoolClass>): CalendarView {
  return calendarView(classes, student.classId !== null ? [student.classId] : [], false);
}

export function eventFor(event: Pick<SchoolEvent, "audience" | "grade" | "classId">, view: CalendarView): boolean {
  switch (event.audience) {
    case "school":
      return true;
    case "staff":
      return view.works;
    case "grade":
      return event.grade !== null && view.grades.has(event.grade);
    case "class":
      return event.classId !== null && view.classIds.has(event.classId);
  }
}

/** Whether the exam is for a class of the view (its own, or every class of its grade). */
export function examFor(exam: Pick<SchoolExam, "classId" | "grade">, view: Pick<CalendarView, "classIds" | "grades">): boolean {
  return exam.classId !== null ? view.classIds.has(exam.classId) : exam.grade !== null && view.grades.has(exam.grade);
}

/** The classes an exam is for. */
export function examClassIds(exam: Pick<SchoolExam, "classId" | "grade">, classes: Iterable<SchoolClass>): number[] {
  if (exam.classId !== null) return [exam.classId];
  return [...classes].filter((c) => exam.grade !== null && c.grade === exam.grade).map((c) => c.id);
}

/** Every day of an event, from its first to its last. */
export function eventDays(event: Pick<SchoolEvent, "startsOn" | "endsOn">): string[] {
  const out: string[] = [];
  for (let day = event.startsOn; day <= event.endsOn && out.length < 400; day = addDays(day, 1)) out.push(day);
  return out;
}

/** The holiday or break that makes `date` a day without school for a class; null on a school day. */
export async function dayOff(store: DataStore, appId: string, date: string, klass: Pick<SchoolClass, "id" | "grade"> | null): Promise<SchoolEvent | null> {
  const events = await store.listSchoolEvents(appId, { from: date, to: date });
  const view: CalendarView = { classIds: new Set(klass ? [klass.id] : []), grades: new Set(klass?.grade ? [klass.grade] : []), works: false };
  return events.find((e) => e.kind === "holiday" && e.audience !== "staff" && eventFor(e, view)) ?? null;
}

/** Whom an event is for, in a word: the class's or grade's name, else null (everyone, or the staff). */
export function eventForName(event: Pick<SchoolEvent, "audience" | "grade" | "classId">, dir: Pick<SchoolDirectory, "classes">): string | null {
  if (event.audience === "grade") return event.grade;
  if (event.audience === "class") return event.classId !== null ? (dir.classes.get(event.classId)?.name ?? null) : null;
  return null;
}

export function eventJson(event: SchoolEvent, dir: Pick<SchoolDirectory, "classes">) {
  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    notes: event.notes,
    starts_on: event.startsOn,
    ends_on: event.endsOn,
    all_day: event.startMinute === null,
    starts: event.startMinute !== null ? timeOf(event.startMinute) : null,
    ends: event.endMinute !== null ? timeOf(event.endMinute) : null,
    place: event.place,
    audience: event.audience,
    for_name: eventForName(event, dir),
  };
}

export function examJson(exam: SchoolExam, dir: Pick<SchoolDirectory, "classes" | "subjects">) {
  return {
    id: exam.id,
    subject: dir.subjects.get(exam.subjectId)?.name ?? "",
    class_id: exam.classId,
    class_name: exam.classId !== null ? (dir.classes.get(exam.classId)?.name ?? null) : null,
    grade: exam.classId !== null ? (dir.classes.get(exam.classId)?.grade ?? exam.grade) : exam.grade,
    date: exam.date,
    starts: timeOf(exam.startMinute),
    ends: timeOf(Math.min(exam.startMinute + exam.durationMinutes, 24 * 60 - 1)),
    duration_minutes: exam.durationMinutes,
    room: exam.room,
    notes: exam.notes,
    published: exam.published,
  };
}

/** The calendar of a view from `from` to `to`: its events, and its published exams. */
export async function calendarOf(store: DataStore, appId: string, view: CalendarView, range: { from: string; to: string }): Promise<{ events: SchoolEvent[]; exams: SchoolExam[] }> {
  const [events, exams] = await Promise.all([store.listSchoolEvents(appId, range), store.listSchoolExams(appId, { ...range, published: true })]);
  return { events: events.filter((e) => eventFor(e, view)), exams: exams.filter((e) => examFor(e, view)) };
}

/** A month's first and last day ("2026-11" → 2026-11-01 … 2026-11-30). */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const from = `${month}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from, to };
}
