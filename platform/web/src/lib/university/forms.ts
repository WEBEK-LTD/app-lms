import { isDate, minutesOf, timeOf } from "../bookings/time";
import type { UniCourse, UniGrade, UniMeeting, UniPlanCourse, UniProgram, UniSection, UniTerm } from "../data/types";
import { parseCsv, ImportFormatError } from "../import/table";

/**
 * 113.9 The dashboard's university forms, checked: faculties, departments,
 * programs and their study plan, courses (one by one or from a CSV file),
 * terms, sections and their weekly lectures, the grading scale and the
 * students' programs and advisors from a CSV file. Messages are English;
 * the dashboard translates them (`university.known`).
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

export const UNI_LIMITS = {
  faculties: 50,
  departments: 300,
  programs: 300,
  courses: 3000,
  terms: 60,
  sectionsPerTerm: 2000,
  name: 120,
  code: 20,
  title: 160,
  degree: 40,
  year: 20,
  description: 2000,
  room: 30,
  note: 500,
  meetings: 10,
  seats: 2000,
  credits: 30,
} as const;

function limited(form: Record<string, string>, name: string, max: number, errors: Record<string, string>, empty: string | null): string {
  const value = str(form, name);
  if (!value && empty) errors[name] = empty;
  else if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
  return value;
}

function optionalId(form: Record<string, string>, name: string, allowed: readonly number[], errors: Record<string, string>, message: string): number | null {
  const text = str(form, name);
  if (!text) return null;
  const id = Number(text);
  if (!Number.isSafeInteger(id) || !allowed.includes(id)) errors[name] = message;
  return id;
}

function number(form: Record<string, string>, name: string, min: number, max: number, errors: Record<string, string>, message: string, integer = false): number {
  const value = Number(str(form, name).replace(",", "."));
  if (!str(form, name) || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) errors[name] = message;
  return value;
}

/** "cs101, MA 101" → ["CS101", "MA101"]. */
export function courseCodes(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,;|\n]+/)
        .map((c) => c.replace(/\s+/g, "").toUpperCase())
        .filter(Boolean),
    ),
  ];
}

const CODE = /^[A-Z0-9][A-Z0-9-]{0,19}$/;

export function parseUnitForm(form: Record<string, string>): Parsed<{ name: string; code: string | null }> {
  const errors: Record<string, string> = {};
  const name = limited(form, "name", UNI_LIMITS.name, errors, "Enter the name.");
  const code = limited(form, "code", UNI_LIMITS.code, errors, null);
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, code: code || null } };
}

export type ProgramForm = Pick<UniProgram, "departmentId" | "name" | "code" | "degree" | "creditsRequired" | "years" | "minTermCredits" | "maxTermCredits">;

export function parseProgramForm(form: Record<string, string>, departmentIds: readonly number[]): Parsed<ProgramForm> {
  const errors: Record<string, string> = {};
  const departmentId = optionalId(form, "departmentId", departmentIds, errors, "Choose a department.");
  if (departmentId === null) errors.departmentId = "Choose a department.";
  const name = limited(form, "name", UNI_LIMITS.name, errors, "Enter the name.");
  const code = limited(form, "code", UNI_LIMITS.code, errors, null);
  const degree = limited(form, "degree", UNI_LIMITS.degree, errors, "Enter the degree, like BSc.");
  const creditsRequired = number(form, "creditsRequired", 1, 1000, errors, "Enter the credits to graduate, like 132.");
  const years = number(form, "years", 1, 10, errors, "Enter the years, from 1 to 10.", true);
  const minTermCredits = number(form, "minTermCredits", 0, 60, errors, "Enter the least credits of a term, from 0 to 60.");
  const maxTermCredits = number(form, "maxTermCredits", 1, 60, errors, "Enter the most credits of a term, from 1 to 60.");
  if (!errors.minTermCredits && !errors.maxTermCredits && minTermCredits > maxTermCredits) errors.maxTermCredits = "The most credits are at least the least.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { departmentId: departmentId!, name, code: code || null, degree, creditsRequired, years, minTermCredits, maxTermCredits } };
}

/**
 * A study plan as lines "year code" (an elective with "elective" after):
 * "1 CS101", "2 MA201 elective". Unknown codes are the problems.
 */
export function parsePlanText(text: string, courses: readonly Pick<UniCourse, "id" | "code">[], years: number): { ok: true; value: UniPlanCourse[] } | { ok: false; message: string } {
  const byCode = new Map(courses.map((c) => [c.code.toUpperCase(), c.id]));
  const out: UniPlanCourse[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const m = /^(\d{1,2})\s+([A-Za-z0-9-]+)(\s+elective)?$/i.exec(line);
    if (!m) return { ok: false, message: `Line ${i + 1}: write the year and the course's code, like 1 CS101.` };
    const year = Number(m[1]);
    const id = byCode.get(m[2]!.toUpperCase());
    if (year < 1 || year > years) return { ok: false, message: `Line ${i + 1}: the year is from 1 to ${years}.` };
    if (id === undefined) return { ok: false, message: `Line ${i + 1}: there's no course with the code ${m[2]!.toUpperCase()}.` };
    if (out.some((p) => p.courseId === id)) continue;
    out.push({ courseId: id, year, required: !m[3] });
  }
  return { ok: true, value: out };
}

export function planText(plan: readonly UniPlanCourse[], courses: ReadonlyMap<number, Pick<UniCourse, "code">>): string {
  return [...plan]
    .sort((a, b) => a.year - b.year)
    .map((p) => (courses.get(p.courseId) ? `${p.year} ${courses.get(p.courseId)!.code}${p.required ? "" : " elective"}` : null))
    .filter(Boolean)
    .join("\n");
}

export type CourseForm = Pick<UniCourse, "code" | "title" | "credits" | "departmentId" | "prerequisites" | "description">;

export function parseCourseForm(form: Record<string, string>, departmentIds: readonly number[]): Parsed<CourseForm> {
  const errors: Record<string, string> = {};
  const code = str(form, "code").replace(/\s+/g, "").toUpperCase();
  if (!CODE.test(code)) errors.code = "Enter the course's code, like CS101.";
  const title = limited(form, "title", UNI_LIMITS.title, errors, "Enter the course's title.");
  const credits = number(form, "credits", 0.5, UNI_LIMITS.credits, errors, `Enter the credits, from 0.5 to ${UNI_LIMITS.credits}.`);
  const departmentId = optionalId(form, "departmentId", departmentIds, errors, "Choose a department.");
  const prerequisites = courseCodes(str(form, "prerequisites"));
  if (prerequisites.includes(code)) errors.prerequisites = "A course isn't its own prerequisite.";
  else if (prerequisites.some((c) => !CODE.test(c)) || prerequisites.length > 10) errors.prerequisites = "Write up to 10 course codes, with commas.";
  const description = limited(form, "description", UNI_LIMITS.description, errors, null);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { code, title, credits, departmentId, prerequisites, description } };
}

export interface CourseRow {
  line: number;
  code: string;
  title: string;
  credits: number;
  /** A department's code or name. */
  department: string | null;
  prerequisites: string[];
}

const COURSE_COLUMNS: Record<string, string[]> = {
  code: ["code", "course", "course code", "الرمز", "kod"],
  title: ["title", "name", "العنوان", "الاسم", "ad", "başlık"],
  credits: ["credits", "credit", "الساعات", "kredi"],
  department: ["department", "القسم", "bölüm"],
  prerequisites: ["prerequisites", "prerequisite", "المتطلبات", "ön koşul"],
};

function table(text: string) {
  try {
    return { ok: true as const, table: parseCsv(text) };
  } catch (e) {
    if (e instanceof ImportFormatError) return { ok: false as const, message: e.message };
    throw e;
  }
}

/** Courses from a CSV file: code, title, credits, department (its code or name) and prerequisites (codes with `|` or commas). */
export function parseCoursesCsv(text: string): { ok: true; rows: CourseRow[]; problems: string[] } | { ok: false; message: string } {
  const read = table(text);
  if (!read.ok) return read;
  const at = (name: string) => read.table.columns.findIndex((c) => COURSE_COLUMNS[name]!.includes(c.toLowerCase()));
  const columns = Object.fromEntries(Object.keys(COURSE_COLUMNS).map((k) => [k, at(k)])) as Record<string, number>;
  if (columns.code! < 0 || columns.title! < 0 || columns.credits! < 0) return { ok: false, message: "The file needs the columns code, title and credits." };
  const rows: CourseRow[] = [];
  const problems: string[] = [];
  read.table.rows.forEach((cells, i) => {
    const line = i + 2;
    const cell = (name: string) => (columns[name]! >= 0 ? (cells[columns[name]!] ?? "") : "");
    const parsed = parseCourseForm({ code: cell("code"), title: cell("title"), credits: cell("credits"), prerequisites: cell("prerequisites") }, []);
    if (!parsed.ok) {
      problems.push(parsed.errors.code || parsed.errors.title || parsed.errors.credits ? `Line ${line}: give the course a code, a title and its credits.` : `Line ${line}: ${Object.values(parsed.errors)[0]}`);
      return;
    }
    rows.push({ line, code: parsed.value.code, title: parsed.value.title, credits: parsed.value.credits, department: cell("department") || null, prerequisites: parsed.value.prerequisites });
  });
  return { ok: true, rows, problems };
}

export const COURSES_CSV_EXAMPLE = "code,title,credits,department,prerequisites\nCS101,Introduction to programming,3,CS,\nCS201,Data structures,3,CS,CS101\nMA101,Calculus I,4,MATH,";

export interface UniStudentRow {
  line: number;
  /** The student's code (or name). */
  code: string;
  /** A program's code or name. */
  program: string | null;
  /** The advisor's number, email or name. */
  advisor: string | null;
  startYear: string | null;
}

const STUDENT_COLUMNS: Record<string, string[]> = {
  code: ["code", "student", "student code", "الرقم الجامعي", "öğrenci no"],
  program: ["program", "البرنامج"],
  advisor: ["advisor", "المرشد", "danışman"],
  startYear: ["start_year", "start year", "year", "سنة الالتحاق", "giriş yılı"],
};

/** Students' programs and advisors from a CSV file, by the student's code (the students themselves are on People). */
export function parseUniStudentsCsv(text: string): { ok: true; rows: UniStudentRow[]; problems: string[] } | { ok: false; message: string } {
  const read = table(text);
  if (!read.ok) return read;
  const at = (name: string) => read.table.columns.findIndex((c) => STUDENT_COLUMNS[name]!.includes(c.toLowerCase()));
  const columns = Object.fromEntries(Object.keys(STUDENT_COLUMNS).map((k) => [k, at(k)])) as Record<string, number>;
  if (columns.code! < 0 || (columns.program! < 0 && columns.advisor! < 0)) return { ok: false, message: "The file needs the columns code, and program or advisor." };
  const rows: UniStudentRow[] = [];
  const problems: string[] = [];
  read.table.rows.forEach((cells, i) => {
    const line = i + 2;
    const cell = (name: string) => (columns[name]! >= 0 ? (cells[columns[name]!] ?? "").trim() : "");
    if (!cell("code")) {
      problems.push(`Line ${line}: give the student's code.`);
      return;
    }
    rows.push({ line, code: cell("code"), program: cell("program") || null, advisor: cell("advisor") || null, startYear: cell("startYear").slice(0, UNI_LIMITS.year) || null });
  });
  return { ok: true, rows, problems };
}

export const STUDENTS_CSV_EXAMPLE = "code,program,advisor,start_year\n1023,BCS,+201110000000,2025/2026\n1024,BCS,mona@example.com,2026/2027";

export type TermForm = Pick<UniTerm, "name" | "academicYear" | "startsOn" | "endsOn" | "registrationOpens" | "registrationCloses" | "dropUntil">;

export function parseTermForm(form: Record<string, string>): Parsed<TermForm> {
  const errors: Record<string, string> = {};
  const name = limited(form, "name", 80, errors, "Name the term, like Fall 2026.");
  const academicYear = limited(form, "academicYear", UNI_LIMITS.year, errors, "Enter the academic year, like 2026/2027.");
  const day = (key: string, message: string) => {
    const value = str(form, key);
    if (!isDate(value)) errors[key] = message;
    return value;
  };
  const startsOn = day("startsOn", "Choose the day the term starts.");
  const endsOn = day("endsOn", "Choose the day the term ends.");
  const registrationOpens = day("registrationOpens", "Choose the day registration opens.");
  const registrationCloses = day("registrationCloses", "Choose the day registration closes.");
  const dropUntil = day("dropUntil", "Choose the last day to drop a course.");
  if (!errors.startsOn && !errors.endsOn && endsOn <= startsOn) errors.endsOn = "The term ends after it starts.";
  if (!errors.registrationOpens && !errors.registrationCloses && registrationCloses < registrationOpens) errors.registrationCloses = "Registration closes on or after the day it opens.";
  if (!errors.registrationOpens && !errors.dropUntil && dropUntil < registrationOpens) errors.dropUntil = "The last day to drop is on or after registration opens.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, academicYear, startsOn, endsOn, registrationOpens, registrationCloses, dropUntil } };
}

/** "1 09:00-10:30 B2" lines: the weekday (1 Monday … 7 Sunday), the times and the room. */
export function parseMeetings(text: string): UniMeeting[] | null {
  const out: UniMeeting[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = /^([1-7])\s+(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})(?:\s+(.+))?$/.exec(line);
    if (!m) return null;
    const start = minutesOf(m[2]!);
    const end = minutesOf(m[3]!);
    if (start === null || end === null || end <= start) return null;
    out.push({ weekday: Number(m[1]), startMinute: start, endMinute: end, room: m[4]?.trim().slice(0, UNI_LIMITS.room) || null });
  }
  return out;
}

export const meetingsText = (meetings: readonly UniMeeting[]) => meetings.map((m) => `${m.weekday} ${timeOf(m.startMinute)}-${timeOf(m.endMinute)}${m.room ? ` ${m.room}` : ""}`).join("\n");

export type SectionForm = Pick<UniSection, "courseId" | "code" | "seats" | "lecturerId" | "meetings">;

export function parseSectionForm(form: Record<string, string>, courseIds: readonly number[], lecturerIds: readonly number[]): Parsed<SectionForm> {
  const errors: Record<string, string> = {};
  const courseId = optionalId(form, "courseId", courseIds, errors, "Choose a course.");
  if (courseId === null) errors.courseId = "Choose a course.";
  const code = limited(form, "code", UNI_LIMITS.code, errors, "Enter the section's code, like 01.");
  const seats = number(form, "seats", 1, UNI_LIMITS.seats, errors, `Enter the seats, from 1 to ${UNI_LIMITS.seats}.`, true);
  const lecturerId = optionalId(form, "lecturerId", lecturerIds, errors, "Choose one of your lecturers.");
  const meetings = parseMeetings(str(form, "meetings"));
  if (meetings === null || meetings.length > UNI_LIMITS.meetings) errors.meetings = "Write each lecture on a line: the day's number (1 Monday … 7 Sunday), the times and the room, like 1 09:00-10:30 B2.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { courseId: courseId!, code, seats, lecturerId, meetings: meetings! } };
}

/**
 * The grading scale as lines "letter points least-percent", a dash for a
 * letter given by hand, "nogpa" for one that doesn't count in the GPA: "A 4
 * 90", "W 0 - nogpa". A letter of 0 points that counts in the GPA fails.
 */
export function parseScaleText(text: string): { ok: true; value: UniGrade[] } | { ok: false; message: string } {
  const out: UniGrade[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const m = /^(\S{1,4})\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?|-)(\s+nogpa)?$/i.exec(line);
    const points = m ? Number(m[2]!.replace(",", ".")) : NaN;
    const min = m && m[3] !== "-" ? Number(m[3]!.replace(",", ".")) : null;
    if (!m || points > 10 || (min !== null && min > 100)) return { ok: false, message: `Line ${i + 1}: write the letter, its points and its least percent, like A 4 90.` };
    if (out.some((g) => g.letter.toLowerCase() === m[1]!.toLowerCase())) return { ok: false, message: `Line ${i + 1}: ${m[1]} is on the scale already.` };
    const gpa = !m[4];
    out.push({ letter: m[1]!, points, minPercent: min, gpa, passes: gpa && points > 0 });
  }
  if (!out.length) return { ok: false, message: "Write at least one letter." };
  return { ok: true, value: out };
}

export const scaleText = (scale: readonly UniGrade[]) => scale.map((g) => `${g.letter} ${g.points} ${g.minPercent ?? "-"}${g.gpa ? "" : " nogpa"}`).join("\n");
