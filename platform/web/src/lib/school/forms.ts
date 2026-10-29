import { isDate, isTimeZone, minutesOf, timeOf } from "../bookings/time";
import { CATALOG_CURRENCIES, centsToDecimal, parsePrice } from "../catalog/money";
import { SCHOOL_ASSESSMENT_KINDS, SCHOOL_ROLES, type SchoolAssessmentKind, type SchoolClass, type SchoolPerson, type SchoolRole, type SchoolSettings } from "../data/types";
import { parseAnyPhone } from "../hosted/phone";
import { parseCsv, ImportFormatError } from "../import/table";

/**
 * 105.4 The dashboard's school forms, checked: classes and subjects, people
 * (one by one or from a CSV file), the timetable, homework, assessments,
 * fees, news and the school's settings. Messages are English; the dashboard
 * translates them (`school.known`). Every amount is the school's.
 */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, name: string) => (form[name] ?? "").trim();

export const SCHOOL_LIMITS = {
  classes: 200,
  subjects: 100,
  people: 5000,
  periodsPerClass: 80,
  className: 60,
  grade: 40,
  subjectName: 60,
  personName: 80,
  code: 30,
  room: 30,
  title: 120,
  homeworkTitle: 200,
  text: 5000,
  body: 2000,
  maxScore: 1000,
  /** The largest fee: 1,000,000.00. */
  maxCents: 100_000_000,
} as const;

/** The time zones a school may choose. */
export const SCHOOL_TIMEZONES = ["Africa/Cairo", "Europe/Istanbul", "Asia/Riyadh", "Asia/Dubai", "Asia/Amman", "Asia/Kuwait", "Asia/Qatar", "Asia/Baghdad", "Africa/Casablanca", "Africa/Tunis", "Africa/Algiers", "Europe/London"] as const;

function optionalId(form: Record<string, string>, name: string, allowed: readonly number[], errors: Record<string, string>, message: string): number | null {
  const text = str(form, name);
  if (!text) return null;
  const id = Number(text);
  if (!Number.isSafeInteger(id) || !allowed.includes(id)) errors[name] = message;
  return id;
}

function requiredId(form: Record<string, string>, name: string, allowed: readonly number[], errors: Record<string, string>, message: string): number {
  const id = optionalId(form, name, allowed, errors, message);
  if (id === null) errors[name] = message;
  return id ?? 0;
}

function limited(form: Record<string, string>, name: string, max: number, errors: Record<string, string>, empty: string | null): string {
  const value = str(form, name);
  if (!value && empty) errors[name] = empty;
  else if (value.length > max) errors[name] = `Keep it under ${max} characters.`;
  return value;
}

// Classes and subjects

export interface ClassForm {
  name: string;
  grade: string | null;
  homeroomTeacherId: number | null;
}

export function parseClassForm(form: Record<string, string>, teacherIds: readonly number[]): Parsed<ClassForm> {
  const errors: Record<string, string> = {};
  const name = limited(form, "name", SCHOOL_LIMITS.className, errors, "Name the class, like Grade 5 A.");
  const grade = limited(form, "grade", SCHOOL_LIMITS.grade, errors, null);
  const homeroomTeacherId = optionalId(form, "homeroomTeacherId", teacherIds, errors, "Choose one of your teachers.");
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, grade: grade || null, homeroomTeacherId } };
}

export function classFormValues(klass: SchoolClass | null): Record<string, string> {
  return { name: klass?.name ?? "", grade: klass?.grade ?? "", homeroomTeacherId: klass?.homeroomTeacherId ? String(klass.homeroomTeacherId) : "" };
}

export function parseSubjectForm(form: Record<string, string>): Parsed<{ name: string }> {
  const errors: Record<string, string> = {};
  const name = limited(form, "name", SCHOOL_LIMITS.subjectName, errors, "Name the subject, like Mathematics.");
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name } };
}

// People

export interface PersonForm {
  role: SchoolRole;
  name: string;
  phone: string | null;
  email: string | null;
  classId: number | null;
  code: string | null;
  active: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePersonForm(form: Record<string, string>, defaultCountryCode: string, classIds: readonly number[], fixedRole: SchoolRole | null = null): Parsed<PersonForm> {
  const errors: Record<string, string> = {};
  const roleText = fixedRole ?? str(form, "role");
  const role = (SCHOOL_ROLES as readonly string[]).includes(roleText) ? (roleText as SchoolRole) : null;
  if (!role) errors.role = "Choose a student, a parent or a teacher.";
  const name = limited(form, "name", SCHOOL_LIMITS.personName, errors, "Enter the name.");
  const phoneText = str(form, "phone");
  const phone = phoneText ? parseAnyPhone(phoneText, defaultCountryCode) : null;
  if (phoneText && !phone) errors.phone = "Enter a valid mobile number.";
  const email = str(form, "email").toLowerCase();
  if (email && (!EMAIL.test(email) || email.length > 191)) errors.email = "Enter a valid email address, or leave it empty.";
  if (!phoneText && !email) errors.phone = "Enter the mobile number they sign in with (or an email).";
  const classId = role === "student" ? optionalId(form, "classId", classIds, errors, "Choose one of your classes.") : null;
  const code = role === "student" ? limited(form, "code", SCHOOL_LIMITS.code, errors, null) : "";
  if (Object.keys(errors).length || !role) return { ok: false, errors };
  return { ok: true, value: { role, name, phone: phone?.e164 ?? null, email: email || null, classId, code: code || null, active: form.active === undefined ? true : form.active === "on" } };
}

export function personFormValues(person: SchoolPerson | null, role: SchoolRole = "student"): Record<string, string> {
  return {
    role: person?.role ?? role,
    name: person?.name ?? "",
    phone: person?.phone ?? "",
    email: person?.email ?? "",
    classId: person?.classId ? String(person.classId) : "",
    code: person?.code ?? "",
    active: person === null || person.active ? "on" : "",
  };
}

/** One row of a people file, checked; `children` are the students' codes (or names) a parent has. */
export interface PeopleRow {
  line: number;
  person: PersonForm;
  className: string | null;
  children: string[];
}

const COLUMN_NAMES: Record<string, string[]> = {
  role: ["role", "type"],
  name: ["name", "full name", "full_name"],
  phone: ["phone", "mobile", "number", "phone number"],
  email: ["email", "e-mail"],
  class: ["class", "class name", "class_name"],
  code: ["code", "student code", "student number", "student_code"],
  children: ["children", "child", "students", "child codes"],
};

/** A people file to start from, as the People page shows it. */
export const PEOPLE_CSV_EXAMPLE = [
  "role,name,phone,email,class,code,children",
  "student,Omar Hassan,01001234567,,Grade 5 A,1023,",
  "parent,Hassan Ali,01007654321,,,,1023",
  "teacher,Mona Adel,01112223334,mona@example.com,,,",
].join("\n");

const ROLE_WORDS: Record<string, SchoolRole> = { student: "student", students: "student", parent: "parent", parents: "parent", teacher: "teacher", teachers: "teacher" };

/**
 * A CSV of people: a header row with role, name, phone, email, class (a
 * student's class by name), code (a student's number) and children (a
 * parent's children by code or name, separated with `|`). Rows with problems
 * are listed by their line; the others are taken.
 */
export function parsePeopleCsv(text: string, defaultCountryCode: string): { ok: true; rows: PeopleRow[]; problems: string[] } | { ok: false; message: string } {
  let table;
  try {
    table = parseCsv(text);
  } catch (e) {
    if (e instanceof ImportFormatError) return { ok: false, message: e.message };
    throw e;
  }
  const at = (name: string) => table.columns.findIndex((c) => COLUMN_NAMES[name]!.includes(c.toLowerCase()));
  const columns = Object.fromEntries(Object.keys(COLUMN_NAMES).map((k) => [k, at(k)])) as Record<keyof typeof COLUMN_NAMES, number>;
  if (columns.role! < 0 || columns.name! < 0 || (columns.phone! < 0 && columns.email! < 0)) {
    return { ok: false, message: "The file needs the columns role, name, and phone or email." };
  }
  const rows: PeopleRow[] = [];
  const problems: string[] = [];
  table.rows.forEach((cells, i) => {
    const line = i + 2;
    const cell = (name: string) => (columns[name]! >= 0 ? (cells[columns[name]!] ?? "") : "");
    const role = ROLE_WORDS[cell("role").toLowerCase()];
    if (!role) {
      problems.push(`Line ${line}: the role is student, parent or teacher.`);
      return;
    }
    const parsed = parsePersonForm({ name: cell("name"), phone: cell("phone"), email: cell("email"), code: cell("code") }, defaultCountryCode, [], role);
    if (!parsed.ok) {
      problems.push(`Line ${line}: ${Object.values(parsed.errors)[0]}`);
      return;
    }
    const children = role === "parent" ? cell("children").split("|").map((c) => c.trim()).filter(Boolean) : [];
    rows.push({ line, person: parsed.value, className: role === "student" ? cell("class") || null : null, children });
  });
  return { ok: true, rows, problems };
}

// Timetable

export interface PeriodForm {
  weekday: number;
  startMinute: number;
  endMinute: number;
  subjectId: number;
  teacherId: number | null;
  room: string | null;
}

export function parsePeriodForm(form: Record<string, string>, subjectIds: readonly number[], teacherIds: readonly number[]): Parsed<PeriodForm> {
  const errors: Record<string, string> = {};
  const weekday = Number(str(form, "weekday"));
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) errors.weekday = "Choose a day.";
  const start = minutesOf(str(form, "start"));
  const end = minutesOf(str(form, "end"));
  if (start === null) errors.start = "Enter the start, like 08:30.";
  if (end === null) errors.end = "Enter the end, like 09:15.";
  else if (start !== null && end <= start) errors.end = "The lesson ends after it starts.";
  const subjectId = requiredId(form, "subjectId", subjectIds, errors, "Choose a subject.");
  const teacherId = optionalId(form, "teacherId", teacherIds, errors, "Choose one of your teachers.");
  const room = limited(form, "room", SCHOOL_LIMITS.room, errors, null);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { weekday, startMinute: start!, endMinute: end!, subjectId, teacherId, room: room || null } };
}

export function periodFormValues(period: { weekday: number; startMinute: number; endMinute: number; subjectId: number; teacherId: number | null; room: string | null } | null): Record<string, string> {
  return {
    weekday: String(period?.weekday ?? 1),
    start: period ? timeOf(period.startMinute) : "",
    end: period ? timeOf(period.endMinute) : "",
    subjectId: period ? String(period.subjectId) : "",
    teacherId: period?.teacherId ? String(period.teacherId) : "",
    room: period?.room ?? "",
  };
}

// Homework and assessments

export interface HomeworkForm {
  classId: number;
  subjectId: number;
  title: string;
  text: string;
  dueOn: string;
}

export function parseHomeworkForm(form: Record<string, string>, classIds: readonly number[], subjectIds: readonly number[], today: string): Parsed<HomeworkForm> {
  const errors: Record<string, string> = {};
  const classId = requiredId(form, "classId", classIds, errors, "Choose one of your classes.");
  const subjectId = requiredId(form, "subjectId", subjectIds, errors, "Choose a subject.");
  const title = limited(form, "title", SCHOOL_LIMITS.homeworkTitle, errors, "Give the homework a title.");
  const text = limited(form, "text", SCHOOL_LIMITS.text, errors, null);
  const dueOn = str(form, "dueOn");
  if (!isDate(dueOn)) errors.dueOn = "Choose the due date.";
  else if (dueOn < today) errors.dueOn = "The due date is today or later.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { classId, subjectId, title, text, dueOn } };
}

export interface AssessmentForm {
  classId: number;
  subjectId: number;
  kind: SchoolAssessmentKind;
  title: string;
  date: string;
  maxScore: number;
}

export function parseAssessmentForm(form: Record<string, string>, classIds: readonly number[], subjectIds: readonly number[]): Parsed<AssessmentForm> {
  const errors: Record<string, string> = {};
  const classId = requiredId(form, "classId", classIds, errors, "Choose one of your classes.");
  const subjectId = requiredId(form, "subjectId", subjectIds, errors, "Choose a subject.");
  const kindText = str(form, "kind");
  if (!(SCHOOL_ASSESSMENT_KINDS as readonly string[]).includes(kindText)) errors.kind = "Choose an exam, a quiz or an assignment.";
  const title = limited(form, "title", SCHOOL_LIMITS.title, errors, "Give it a title, like Midterm exam.");
  const date = str(form, "date");
  if (!isDate(date)) errors.date = "Choose its date.";
  const maxScore = Number(str(form, "maxScore"));
  if (!str(form, "maxScore") || !Number.isFinite(maxScore) || maxScore <= 0 || maxScore > SCHOOL_LIMITS.maxScore) errors.maxScore = `The full mark is more than 0 and up to ${SCHOOL_LIMITS.maxScore}.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { classId, subjectId, kind: kindText as SchoolAssessmentKind, title, date, maxScore } };
}

/** A score typed on the dashboard: empty for none, else 0 to the full mark. */
export function parseScore(text: string, maxScore: number): number | null | "invalid" {
  const value = text.trim().replace(",", ".");
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= maxScore ? Math.round(n * 100) / 100 : "invalid";
}

// Fees and news

export interface FeeForm {
  title: string;
  amountCents: number;
  dueOn: string | null;
  /** One student, or every active student of a class. */
  studentId: number | null;
  classId: number | null;
}

export function parseFeeForm(form: Record<string, string>, studentIds: readonly number[], classIds: readonly number[]): Parsed<FeeForm> {
  const errors: Record<string, string> = {};
  const title = limited(form, "title", SCHOOL_LIMITS.title, errors, "Name the fee, like First term tuition.");
  const amountText = str(form, "amount");
  const amountCents = amountText ? parsePrice(amountText) : null;
  if (amountCents === null || amountCents <= 0 || amountCents > SCHOOL_LIMITS.maxCents) errors.amount = "Enter an amount, like 4500 or 4500.50.";
  const dueOn = str(form, "dueOn");
  if (dueOn && !isDate(dueOn)) errors.dueOn = "Choose a date, or leave it empty.";
  const to = str(form, "to");
  let studentId: number | null = null;
  let classId: number | null = null;
  if (to.startsWith("student:")) {
    studentId = Number(to.slice(8));
    if (!studentIds.includes(studentId)) errors.to = "Choose a student or a class.";
  } else if (to.startsWith("class:")) {
    classId = Number(to.slice(6));
    if (!classIds.includes(classId)) errors.to = "Choose a student or a class.";
  } else errors.to = "Choose a student or a class.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, amountCents: amountCents!, dueOn: dueOn || null, studentId, classId } };
}

export interface NewsForm {
  audience: "school" | "class" | "student";
  classId: number | null;
  studentId: number | null;
  title: string;
  body: string;
}

export function parseNewsForm(form: Record<string, string>, classIds: readonly number[], studentIds: readonly number[]): Parsed<NewsForm> {
  const errors: Record<string, string> = {};
  const to = str(form, "to");
  let audience: NewsForm["audience"] = "school";
  let classId: number | null = null;
  let studentId: number | null = null;
  if (to.startsWith("class:")) {
    audience = "class";
    classId = Number(to.slice(6));
    if (!classIds.includes(classId)) errors.to = "Choose who it is for.";
  } else if (to.startsWith("student:")) {
    audience = "student";
    studentId = Number(to.slice(8));
    if (!studentIds.includes(studentId)) errors.to = "Choose who it is for.";
  } else if (to !== "school") errors.to = "Choose who it is for.";
  const title = limited(form, "title", SCHOOL_LIMITS.title, errors, "Give it a title.");
  const body = limited(form, "body", SCHOOL_LIMITS.body, errors, "Write the news.");
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { audience, classId, studentId, title, body } };
}

// Settings

export function parseSchoolSettings(form: Record<string, string>): Parsed<SchoolSettings> {
  const errors: Record<string, string> = {};
  const timezone = str(form, "timezone");
  if (!isTimeZone(timezone)) errors.timezone = "Choose a time zone.";
  const currency = str(form, "currency");
  if (!(CATALOG_CURRENCIES as readonly string[]).includes(currency)) errors.currency = "Choose a currency.";
  const termName = limited(form, "termName", 60, errors, null);
  const startsOn = str(form, "termStarts");
  const endsOn = str(form, "termEnds");
  let term: SchoolSettings["term"] = null;
  if (termName || startsOn || endsOn) {
    if (!termName) errors.termName = "Name the term, like First term 2026.";
    if (!isDate(startsOn)) errors.termStarts = "Choose the day the term starts.";
    if (!isDate(endsOn)) errors.termEnds = "Choose the day the term ends.";
    else if (isDate(startsOn) && endsOn < startsOn) errors.termEnds = "The term ends after it starts.";
    term = { name: termName, startsOn, endsOn };
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { timezone, currency, term, absenceAlerts: form.absenceAlerts === "on", feesByCard: form.feesByCard === "on" } };
}

export function schoolSettingsFormValues(settings: SchoolSettings): Record<string, string> {
  return {
    timezone: settings.timezone,
    currency: settings.currency,
    termName: settings.term?.name ?? "",
    termStarts: settings.term?.startsOn ?? "",
    termEnds: settings.term?.endsOn ?? "",
    absenceAlerts: settings.absenceAlerts ? "on" : "",
    feesByCard: settings.feesByCard ? "on" : "",
  };
}

/** 4500 → "4500.00" for a fee's amount field. */
export const amountText = (cents: number) => centsToDecimal(cents);
