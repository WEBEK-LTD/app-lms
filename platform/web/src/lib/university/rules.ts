import type { UniCourse, UniEnrolment, UniGrade, UniMeeting, UniProgram, UniSection, UniTerm } from "../data/types";

/**
 * 113.9 A university's rules, without the store: the grading scale and the
 * GPA (credit-weighted, the latest attempt of a course counting in the
 * cumulative one), lectures that clash, prerequisites passed, the program's
 * credits per term, seats and the registration window.
 */

/** The scale a university starts with (it changes it in University › Settings). */
export const DEFAULT_SCALE: readonly UniGrade[] = [
  { letter: "A", points: 4, minPercent: 90, gpa: true, passes: true },
  { letter: "A-", points: 3.7, minPercent: 85, gpa: true, passes: true },
  { letter: "B+", points: 3.3, minPercent: 80, gpa: true, passes: true },
  { letter: "B", points: 3, minPercent: 75, gpa: true, passes: true },
  { letter: "B-", points: 2.7, minPercent: 70, gpa: true, passes: true },
  { letter: "C+", points: 2.3, minPercent: 65, gpa: true, passes: true },
  { letter: "C", points: 2, minPercent: 60, gpa: true, passes: true },
  { letter: "D", points: 1, minPercent: 50, gpa: true, passes: true },
  { letter: "F", points: 0, minPercent: 0, gpa: true, passes: false },
  { letter: "W", points: 0, minPercent: null, gpa: false, passes: false },
];

/** Without a program, a term can't have more credits than this. */
export const MAX_TERM_CREDITS = 30;

export function gradeOf(scale: readonly UniGrade[], letter: string | null): UniGrade | null {
  if (!letter) return null;
  return scale.find((g) => g.letter.toLowerCase() === letter.toLowerCase()) ?? null;
}

/** The letter of a percent: the highest step it reaches. */
export function letterFor(scale: readonly UniGrade[], percent: number): string | null {
  const steps = scale.filter((g) => g.minPercent !== null && percent >= g.minPercent).sort((a, b) => b.minPercent! - a.minPercent!);
  return steps[0]?.letter ?? null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** A graded course: its credits and letter. */
export interface Graded {
  courseId: number;
  credits: number;
  grade: string;
  /** The term's start, to know the latest attempt. */
  termStartsOn: string;
}

/** The credit-weighted average of the points of the letters that count; null without any. */
export function gpaOf(rows: readonly Pick<Graded, "credits" | "grade">[], scale: readonly UniGrade[]): number | null {
  let credits = 0;
  let points = 0;
  for (const row of rows) {
    const grade = gradeOf(scale, row.grade);
    if (!grade || !grade.gpa || row.credits <= 0) continue;
    credits += row.credits;
    points += grade.points * row.credits;
  }
  return credits > 0 ? round2(points / credits) : null;
}

/** Each course's latest attempt (a course taken again replaces the earlier grade). */
export function latestAttempts<T extends Graded>(rows: readonly T[]): T[] {
  const latest = new Map<number, T>();
  for (const row of rows) {
    const found = latest.get(row.courseId);
    if (!found || row.termStartsOn > found.termStartsOn) latest.set(row.courseId, row);
  }
  return [...latest.values()];
}

export interface Standing {
  gpa: number | null;
  /** The credits of the courses passed. */
  creditsEarned: number;
  /** The credits that count in the GPA. */
  creditsAttempted: number;
}

/** The cumulative GPA and credits over every term's published grades. */
export function standingOf(rows: readonly Graded[], scale: readonly UniGrade[]): Standing {
  const latest = latestAttempts(rows);
  let earned = 0;
  let attempted = 0;
  for (const row of latest) {
    const grade = gradeOf(scale, row.grade);
    if (!grade) continue;
    if (grade.passes) earned += row.credits;
    if (grade.gpa) attempted += row.credits;
  }
  return { gpa: gpaOf(latest, scale), creditsEarned: round2(earned), creditsAttempted: round2(attempted) };
}

/** The codes of the courses passed (their latest attempt). */
export function passedCodes(rows: readonly (Graded & { code: string })[], scale: readonly UniGrade[]): Set<string> {
  return new Set(
    latestAttempts(rows)
      .filter((r) => gradeOf(scale, r.grade)?.passes)
      .map((r) => r.code.toUpperCase()),
  );
}

/** The prerequisites of the course not passed yet. */
export function missingPrerequisites(course: Pick<UniCourse, "prerequisites">, passed: ReadonlySet<string>): string[] {
  return course.prerequisites.filter((code) => !passed.has(code.toUpperCase()));
}

/** Whether two weeks of lectures meet at the same time on a day. */
export function meetingsClash(a: readonly UniMeeting[], b: readonly UniMeeting[]): boolean {
  return a.some((x) => b.some((y) => x.weekday === y.weekday && x.startMinute < y.endMinute && y.startMinute < x.endMinute));
}

/** The sections of `others` whose lectures clash with the section's. */
export function clashesWith<T extends Pick<UniSection, "id" | "meetings">>(section: Pick<UniSection, "id" | "meetings">, others: readonly T[]): T[] {
  return others.filter((o) => o.id !== section.id && meetingsClash(section.meetings, o.meetings));
}

/** The seats a section has left, with `held` students in it (asked for or enrolled). */
export function seatsLeft(section: Pick<UniSection, "seats">, held: number): number {
  return Math.max(0, section.seats - held);
}

/** Whether an enrolment holds a seat and its credits count in the term. */
export const holdsSeat = (e: Pick<UniEnrolment, "status">) => e.status === "pending" || e.status === "enrolled";

export type RegistrationPhase = "before" | "open" | "drop" | "closed";

/** Where the term's registration is on a day: open (add and drop), drop only, before or after. */
export function registrationPhase(term: Pick<UniTerm, "registrationOpens" | "registrationCloses" | "dropUntil">, today: string): RegistrationPhase {
  if (today < term.registrationOpens) return "before";
  if (today <= term.registrationCloses) return "open";
  if (today <= term.dropUntil) return "drop";
  return "closed";
}

export const canAdd = (phase: RegistrationPhase) => phase === "open";
export const canDrop = (phase: RegistrationPhase) => phase === "open" || phase === "drop";

/** The least and the most credits of a term: the program's, else none and the ceiling. */
export function creditLimits(program: Pick<UniProgram, "minTermCredits" | "maxTermCredits"> | null): { min: number; max: number } {
  return program ? { min: program.minTermCredits, max: program.maxTermCredits } : { min: 0, max: MAX_TERM_CREDITS };
}

export type AddProblem = "taken" | "clash" | "prerequisites" | "credits" | "full";

export interface AddCheck {
  /** Empty: it can be added. */
  problems: { code: AddProblem; detail: string }[];
  /** It is full but takes a waiting list (with nothing else in the way). */
  waitlist: boolean;
}

/**
 * Whether a student can add the section: not the same course twice in the
 * term, no lecture at the same time as one of theirs, the prerequisites
 * passed, the term's credits within the program's most, a seat left.
 */
export function checkAdd(input: {
  section: Pick<UniSection, "id" | "meetings" | "seats">;
  course: Pick<UniCourse, "id" | "code" | "credits" | "prerequisites">;
  /** The student's sections this term that hold a seat, with their course. */
  held: readonly { section: Pick<UniSection, "id" | "meetings" | "code">; course: Pick<UniCourse, "id" | "code" | "credits"> }[];
  passed: ReadonlySet<string>;
  maxCredits: number;
  /** Students holding a seat in the section. */
  taken: number;
  waitlistOn: boolean;
}): AddCheck {
  const problems: AddCheck["problems"] = [];
  const same = input.held.find((h) => h.course.id === input.course.id);
  if (same) problems.push({ code: "taken", detail: `${same.course.code}-${same.section.code}` });
  const clash = input.held.find((h) => h.section.id !== input.section.id && meetingsClash(input.section.meetings, h.section.meetings));
  if (clash) problems.push({ code: "clash", detail: `${clash.course.code}-${clash.section.code}` });
  const missing = missingPrerequisites(input.course, input.passed);
  if (missing.length) problems.push({ code: "prerequisites", detail: missing.join(", ") });
  const credits = input.held.filter((h) => h.course.id !== input.course.id).reduce((sum, h) => sum + h.course.credits, 0) + input.course.credits;
  if (credits > input.maxCredits) problems.push({ code: "credits", detail: String(input.maxCredits) });
  const full = seatsLeft(input.section, input.taken) === 0;
  if (full && problems.length === 0 && input.waitlistOn) return { problems: [], waitlist: true };
  if (full) problems.push({ code: "full", detail: "" });
  return { problems, waitlist: false };
}

export type PlanStatus = "done" | "in_progress" | "left";

/** The program's courses, each done (passed), in progress (this term's, not graded yet) or left. */
export function studyPlan(
  program: Pick<UniProgram, "plan" | "creditsRequired">,
  courses: ReadonlyMap<number, Pick<UniCourse, "id" | "code" | "title" | "credits">>,
  results: { passed: ReadonlySet<string>; inProgress: ReadonlySet<number>; grades: ReadonlyMap<number, string> },
) {
  const rows = program.plan
    .map((p) => ({ plan: p, course: courses.get(p.courseId) }))
    .filter((r): r is { plan: (typeof program.plan)[number]; course: NonNullable<typeof r.course> } => r.course !== undefined)
    .map(({ plan, course }) => {
      const status: PlanStatus = results.passed.has(course.code.toUpperCase()) ? "done" : results.inProgress.has(course.id) ? "in_progress" : "left";
      return { course, year: plan.year, required: plan.required, status, grade: results.grades.get(course.id) ?? null };
    })
    .sort((a, b) => a.year - b.year || a.course.code.localeCompare(b.course.code));
  const sum = (status: PlanStatus) => round2(rows.filter((r) => r.status === status).reduce((n, r) => n + r.course.credits, 0));
  return { rows, credits: { required: program.creditsRequired, done: sum("done"), inProgress: sum("in_progress"), left: sum("left") } };
}
