import { timeOf } from "../bookings/time";
import type { SchoolPerson, UniCourse, UniGrade, UniMeeting, UniProgram, UniRegistration, UniSection, UniTerm } from "../data/types";
import { addProblemMessage } from "./flow";
import type { AcademicRecord, Offered, RegistrationView, Taken, UniData } from "./records";
import { canAdd, canDrop, gpaOf, gradeOf, holdsSeat, studyPlan } from "./rules";

/** 113.9 The university's records as the app reads them (docs/api/openapi.yaml, the University tag). */

export function termJson(term: UniTerm) {
  return {
    id: term.id,
    name: term.name,
    academic_year: term.academicYear,
    starts_on: term.startsOn,
    ends_on: term.endsOn,
    registration_opens: term.registrationOpens,
    registration_closes: term.registrationCloses,
    drop_until: term.dropUntil,
  };
}

export const meetingJson = (m: UniMeeting) => ({ weekday: m.weekday, starts: timeOf(m.startMinute), ends: timeOf(m.endMinute), room: m.room });

export const courseJson = (c: UniCourse) => ({ id: c.id, code: c.code, title: c.title, credits: c.credits, prerequisites: c.prerequisites });

export function sectionJson(section: UniSection, course: UniCourse, people: ReadonlyMap<number, SchoolPerson>, left: number | null) {
  return {
    id: section.id,
    code: section.code,
    course: courseJson(course),
    lecturer_name: section.lecturerId !== null ? (people.get(section.lecturerId)?.name ?? null) : null,
    seats: section.seats,
    seats_left: left,
    meetings: [...section.meetings].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute).map(meetingJson),
  };
}

export function programJson(program: UniProgram, data: UniData) {
  const department = data.departments.get(program.departmentId) ?? null;
  const faculty = department ? (data.faculties.get(department.facultyId) ?? null) : null;
  return {
    id: program.id,
    name: program.name,
    code: program.code,
    degree: program.degree,
    department: department?.name ?? null,
    faculty: faculty?.name ?? null,
    credits_required: program.creditsRequired,
    years: program.years,
    min_term_credits: program.minTermCredits,
    max_term_credits: program.maxTermCredits,
  };
}

export const scaleJson = (scale: readonly UniGrade[]) => scale.map((g) => ({ letter: g.letter, points: g.points, min_percent: g.minPercent, counts_in_gpa: g.gpa, passes: g.passes }));

function takenJson(t: Taken, people: ReadonlyMap<number, SchoolPerson>, left: number | null, dropOpen: boolean) {
  return {
    id: t.enrolment.id,
    status: t.enrolment.status,
    added_by: t.enrolment.addedBy,
    section: sectionJson(t.section, t.course, people, left),
    can_drop: dropOpen,
  };
}

function problemsJson(o: Offered) {
  return o.check.problems.map((p) => ({ code: p.code, message: addProblemMessage(p.code, p.detail) }));
}

/** The student's registration for the term. */
export function registrationJson(view: RegistrationView, people: ReadonlyMap<number, SchoolPerson>, otherTerms: readonly UniTerm[]) {
  const status: UniRegistration["status"] = view.registration?.status ?? "draft";
  const editable = status !== "submitted";
  const left = new Map(view.offered.map((o) => [o.section.id, o.left]));
  return {
    term: termJson(view.term),
    terms: otherTerms.map(termJson),
    status,
    note: view.registration?.note ?? null,
    submitted_at: view.registration?.submittedAt?.toISOString() ?? null,
    phase: view.phase,
    can_add: editable && canAdd(view.phase),
    can_drop: editable && canDrop(view.phase),
    can_submit: editable && (view.phase === "open" || view.phase === "drop") && view.mine.some((t) => t.enrolment.status === "pending"),
    credits: { taken: view.credits, min: view.limits.min, max: view.limits.max },
    mine: view.mine.map((t) => takenJson(t, people, left.get(t.section.id) ?? null, editable && canDrop(view.phase))),
    offered: view.offered
      .filter((o) => !view.mine.some((t) => t.section.id === o.section.id))
      .map((o) => ({ ...sectionJson(o.section, o.course, people, o.left), can_add: o.check.problems.length === 0, waitlist: o.check.waitlist, problems: problemsJson(o) })),
  };
}

/** The student's week in the term: their sections' lectures (asked for, enrolled or on a waiting list). */
export function uniTimetableJson(record: AcademicRecord, term: UniTerm, people: ReadonlyMap<number, SchoolPerson>) {
  const days = new Map<number, { starts: string; ends: string; minute: number; row: Record<string, unknown> }[]>();
  for (const t of record.taken) {
    if (t.term.id !== term.id || t.enrolment.status === "dropped") continue;
    for (const m of t.section.meetings) {
      days.set(m.weekday, [
        ...(days.get(m.weekday) ?? []),
        {
          starts: timeOf(m.startMinute),
          ends: timeOf(m.endMinute),
          minute: m.startMinute,
          row: {
            section_id: t.section.id,
            course_code: t.course.code,
            course_title: t.course.title,
            section_code: t.section.code,
            starts: timeOf(m.startMinute),
            ends: timeOf(m.endMinute),
            room: m.room,
            lecturer_name: t.section.lecturerId !== null ? (people.get(t.section.lecturerId)?.name ?? null) : null,
            status: t.enrolment.status,
          },
        },
      ]);
    }
  }
  return {
    term: termJson(term),
    days: [...days.entries()].sort(([a], [b]) => a - b).map(([weekday, list]) => ({ weekday, lectures: [...list].sort((a, b) => a.minute - b.minute).map((l) => l.row) })),
  };
}

/** Results by term, with each term's GPA and the cumulative one. */
export function resultsJson(record: AcademicRecord, data: UniData) {
  const scale = data.settings.scale;
  const byTerm = new Map<number, typeof record.graded>();
  for (const g of record.graded) byTerm.set(g.termId, [...(byTerm.get(g.termId) ?? []), g]);
  const terms = [...byTerm.entries()]
    .map(([termId, rows]) => ({ term: data.termById.get(termId), rows }))
    .filter((t): t is { term: UniTerm; rows: typeof record.graded } => t.term !== undefined)
    .sort((a, b) => b.term.startsOn.localeCompare(a.term.startsOn));
  return {
    gpa: record.standing.gpa,
    credits_earned: record.standing.creditsEarned,
    credits_attempted: record.standing.creditsAttempted,
    credits_required: record.program?.creditsRequired ?? null,
    terms: terms.map(({ term, rows }) => ({
      term: termJson(term),
      gpa: gpaOf(rows, scale),
      credits: rows.reduce((sum, r) => sum + r.credits, 0),
      courses: [...rows]
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((r) => {
          const grade = gradeOf(scale, r.grade);
          return { course_code: r.code, title: r.title, credits: r.credits, grade: r.grade, points: grade?.points ?? null, passed: grade?.passes ?? false };
        }),
    })),
  };
}

/** The program's study plan for the student. */
export function planJson(record: AcademicRecord, data: UniData) {
  if (!record.program) return { program: null, credits: null, years: [] };
  const inProgress = new Set(record.taken.filter((t) => holdsSeat(t.enrolment) && !(t.enrolment.grade !== null && t.section.resultsPublishedAt !== null)).map((t) => t.course.id));
  const grades = new Map<number, string>();
  for (const g of [...record.graded].sort((a, b) => a.termStartsOn.localeCompare(b.termStartsOn))) grades.set(g.courseId, g.grade);
  const plan = studyPlan(record.program, data.courses, { passed: record.passed, inProgress, grades });
  const years = new Map<number, typeof plan.rows>();
  for (const row of plan.rows) years.set(row.year, [...(years.get(row.year) ?? []), row]);
  return {
    program: programJson(record.program, data),
    credits: { required: plan.credits.required, done: plan.credits.done, in_progress: plan.credits.inProgress, left: plan.credits.left },
    years: [...years.entries()].map(([year, rows]) => ({
      year,
      courses: rows.map((r) => ({ course_code: r.course.code, title: r.course.title, credits: r.course.credits, required: r.required, status: r.status, grade: r.grade })),
    })),
  };
}
