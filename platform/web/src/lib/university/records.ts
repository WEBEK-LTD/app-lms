import type { DataStore } from "../data/store";
import type { SchoolPerson, UniCourse, UniDepartment, UniEnrolment, UniFaculty, UniProgram, UniRegistration, UniSection, UniSettings, UniStudent, UniTerm } from "../data/types";
import { checkAdd, creditLimits, holdsSeat, passedCodes, registrationPhase, seatsLeft, standingOf, type AddCheck, type Graded, type RegistrationPhase, type Standing } from "./rules";
import { loadUniSettings } from "./settings";

/**
 * 113.9 A university's records as its pages and the app read them: its
 * structure once, a student's academic record (every section they were in,
 * their grades, GPA and credits) and their registration for a term.
 */

export interface UniData {
  settings: UniSettings;
  faculties: Map<number, UniFaculty>;
  departments: Map<number, UniDepartment>;
  programs: Map<number, UniProgram>;
  courses: Map<number, UniCourse>;
  /** The latest first. */
  terms: UniTerm[];
  termById: Map<number, UniTerm>;
}

export async function uniData(store: DataStore, appId: string): Promise<UniData> {
  const [settings, faculties, departments, programs, courses, terms] = await Promise.all([
    loadUniSettings(store, appId),
    store.listUniFaculties(appId),
    store.listUniDepartments(appId),
    store.listUniPrograms(appId),
    store.listUniCourses(appId),
    store.listUniTerms(appId),
  ]);
  return {
    settings,
    faculties: new Map(faculties.map((f) => [f.id, f])),
    departments: new Map(departments.map((d) => [d.id, d])),
    programs: new Map(programs.map((p) => [p.id, p])),
    courses: new Map(courses.map((c) => [c.id, c])),
    terms,
    termById: new Map(terms.map((t) => [t.id, t])),
  };
}

/** A student's row in a section, with what it is of. */
export interface Taken {
  enrolment: UniEnrolment;
  section: UniSection;
  course: UniCourse;
  term: UniTerm;
}

export interface GradedCourse extends Graded {
  code: string;
  title: string;
  termId: number;
  sectionId: number;
}

export interface AcademicRecord {
  student: SchoolPerson;
  uni: UniStudent | null;
  program: UniProgram | null;
  taken: Taken[];
  /** The grades out to the student (their section's results published), or every grade given for the office. */
  graded: GradedCourse[];
  standing: Standing;
  /** The codes of the courses passed (published grades). */
  passed: Set<string>;
}

/** The student's record; `everyGrade` for the office (grades not published yet count too). */
export async function academicRecord(store: DataStore, data: UniData, student: SchoolPerson, everyGrade = false): Promise<AcademicRecord> {
  const [[uni], enrolments] = await Promise.all([store.listUniStudents(student.appId, { studentIds: [student.id] }), store.listUniEnrolments(student.appId, { studentId: student.id })]);
  const sections = new Map((await store.listUniSections(student.appId, { ids: [...new Set(enrolments.map((e) => e.sectionId))] })).map((s) => [s.id, s]));
  const taken: Taken[] = [];
  for (const enrolment of enrolments) {
    const section = sections.get(enrolment.sectionId);
    const course = section ? data.courses.get(section.courseId) : undefined;
    const term = section ? data.termById.get(section.termId) : undefined;
    if (section && course && term) taken.push({ enrolment, section, course, term });
  }
  const gradedOf = (published: boolean) =>
    taken
      .filter((t) => t.enrolment.status === "enrolled" && t.enrolment.grade !== null && (!published || t.section.resultsPublishedAt !== null))
      .map((t): GradedCourse => ({ courseId: t.course.id, credits: t.course.credits, grade: t.enrolment.grade!, termStartsOn: t.term.startsOn, code: t.course.code, title: t.course.title, termId: t.term.id, sectionId: t.section.id }));
  const graded = gradedOf(!everyGrade);
  const program = uni?.programId ? (data.programs.get(uni.programId) ?? null) : null;
  return {
    student,
    uni: uni ?? null,
    program,
    taken,
    graded,
    standing: standingOf(graded, data.settings.scale),
    // Prerequisites are met by published grades only.
    passed: passedCodes(gradedOf(true), data.settings.scale),
  };
}

/** A section offered in the term, with its seats and whether the student can add it. */
export interface Offered {
  section: UniSection;
  course: UniCourse;
  left: number;
  check: AddCheck;
}

export interface RegistrationView {
  term: UniTerm;
  registration: UniRegistration | null;
  phase: RegistrationPhase;
  /** The student's sections this term that aren't dropped. */
  mine: Taken[];
  credits: number;
  limits: { min: number; max: number };
  offered: Offered[];
}

/** Students holding a seat in each section of the term. */
export async function seatsTaken(store: DataStore, appId: string, termId: number): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  for (const e of await store.listUniEnrolments(appId, { termId })) if (holdsSeat(e)) out.set(e.sectionId, (out.get(e.sectionId) ?? 0) + 1);
  return out;
}

/** The student's registration for the term, and what they could add. */
export async function registrationView(store: DataStore, data: UniData, record: AcademicRecord, term: UniTerm, today: string): Promise<RegistrationView> {
  const appId = record.student.appId;
  const [[registration], sections, taken] = await Promise.all([
    store.listUniRegistrations(appId, { termId: term.id, studentId: record.student.id }),
    store.listUniSections(appId, { termId: term.id }),
    seatsTaken(store, appId, term.id),
  ]);
  const mine = record.taken.filter((t) => t.term.id === term.id && t.enrolment.status !== "dropped");
  const held = mine.filter((t) => holdsSeat(t.enrolment));
  const limits = creditLimits(record.program);
  const offered = sections
    .map((section) => ({ section, course: data.courses.get(section.courseId) }))
    .filter((o): o is { section: UniSection; course: UniCourse } => o.course !== undefined)
    .map(({ section, course }) => ({
      section,
      course,
      left: seatsLeft(section, taken.get(section.id) ?? 0),
      check: checkAdd({ section, course, held, passed: record.passed, maxCredits: limits.max, taken: taken.get(section.id) ?? 0, waitlistOn: data.settings.waitlist }),
    }))
    .sort((a, b) => a.course.code.localeCompare(b.course.code) || a.section.code.localeCompare(b.section.code));
  return {
    term,
    registration: registration ?? null,
    phase: registrationPhase(term, today),
    mine,
    credits: held.reduce((sum, t) => sum + t.course.credits, 0),
    limits,
    offered,
  };
}

/** The student's terms with published grades, the latest first: each term's courses and GPA. */
export function termsOf(record: AcademicRecord, data: UniData) {
  const byTerm = new Map<number, GradedCourse[]>();
  for (const g of record.graded) byTerm.set(g.termId, [...(byTerm.get(g.termId) ?? []), g]);
  return [...byTerm.entries()]
    .map(([termId, rows]) => ({ term: data.termById.get(termId)!, rows: [...rows].sort((a, b) => a.code.localeCompare(b.code)) }))
    .filter((t) => t.term !== undefined)
    .sort((a, b) => b.term.startsOn.localeCompare(a.term.startsOn));
}
