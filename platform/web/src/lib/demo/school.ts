import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore, SchoolRows } from "../data/store";
import type { App, SchoolAssessmentKind, SchoolAttendanceStatus, SchoolPerson, SchoolSample, SchoolSettings } from "../data/types";
import { SAMPLE_SCHOOL_NEWS } from "../samples/content";
import { paidFeePatch } from "../school/fees";
import { isoWeekday } from "../school/service";
import { DEFAULT_STAFF_TIMES, DEFAULT_STUDENT_TIMES } from "../school/checkin";
import { DEMO_RETENTION_HOURS, DEMO_SIGN_IN, DEMO_USER_NAME } from "./constants";
import { syncSchoolBusAndLibrary } from "./school-bus-library";
import { NAKHLA_SCHOOL } from "./school-bus";
import { syncSchoolLife } from "./school-life";
import { syncSchoolParentArea } from "./school-parent";
import { newest, sameIds, unchanged } from "./rows";

/**
 * 110.5 Nakhla School, Studio's school demo (105.4): three classes, their
 * subjects, teachers and weekly timetable, and the demo number as three
 * people at once: Lina, a student in Grade 5 A; her mother Rania, who also
 * has Adam in Grade 3 B; and Ms. Mona, Lina's class teacher. What the
 * teacher writes reaches the student and the parent at once, in the same app.
 *
 * The school day (homework, scores, attendance, news, fees) is dated from
 * today: made when the demo is set up and made again by the daily job once
 * it is from another day. What the visitor writes as the teacher is deleted
 * after a day, like the rest of what visitors add.
 */

const DAYS = [7, 1, 2, 3, 4] as const;
/** Sunday to Thursday, as schools in Cairo. */
export const SCHOOL_DAYS: readonly number[] = DAYS;

export const SCHOOL_DEMO_SETTINGS: Omit<SchoolSettings, "term"> = {
  timezone: "Africa/Cairo",
  currency: "EGP",
  absenceAlerts: true,
  feesByCard: true,
  // 113.2 The gate's check-in, by its code or at the school.
  checkin: { on: true, methods: "either", place: { ...NAKHLA_SCHOOL, radiusM: 300 }, days: [7, 1, 2, 3, 4], students: DEFAULT_STUDENT_TIMES, staff: DEFAULT_STAFF_TIMES, parentAlerts: true, gateKey: 1, since: null },
  // 113.6 Teachers and families write to each other at any time, so a visitor can try it.
  messages: { with: "parents_students", startedBy: "both", hours: null, classBroadcast: true, attachments: true, adminReads: false },
  bus: { nearBy: "minutes", nearMeters: 1000, nearMinutes: 5 },
  behaviourAlerts: "all",
  behaviourCategoriesSet: true,
};

export const SCHOOL_SUBJECTS = ["Arabic", "English", "Maths", "Science", "Social studies", "Art", "PE"];

/** The school's teachers; the first is the demo number's. */
export const SCHOOL_TEACHERS = ["Mona Saleh", "Youssef Kamal", "Nadia Fahmy", "Daniel Brooks", "Heba Mansour", "Tarek Adel"];
export const DEMO_TEACHER = SCHOOL_TEACHERS[0]!;

/** 113.3 What the teachers do, and the school's staff. */
const JOBS: Record<string, { jobTitle: string; department: string }> = {
  "Mona Saleh": { jobTitle: "Maths teacher, Grade 5 A's class teacher", department: "Primary" },
  "Youssef Kamal": { jobTitle: "Science teacher", department: "Primary" },
  "Nadia Fahmy": { jobTitle: "Grade 3 B's class teacher", department: "Primary" },
  "Daniel Brooks": { jobTitle: "English teacher", department: "Languages" },
  "Heba Mansour": { jobTitle: "Art and PE teacher, bus supervisor", department: "Activities" },
  "Tarek Adel": { jobTitle: "Arabic teacher, Grade 5 B's class teacher", department: "Primary" },
};
export const SCHOOL_STAFF: { name: string; jobTitle: string; department: string }[] = [
  { name: "Samia Fouad", jobTitle: "School secretary", department: "Office" },
  { name: "Hany Lotfy", jobTitle: "Caretaker", department: "Facilities" },
  { name: "Amal Zaki", jobTitle: "School nurse", department: "Health" },
];

export const SCHOOL_CLASSES: { name: string; grade: string; homeroom: string; room: string; students: string[] }[] = [
  { name: "Grade 3 B", grade: "Grade 3", homeroom: "Nadia Fahmy", room: "7", students: ["Adam Haddad", "Jana Ashraf", "Hamza Lotfy", "Salma Wagdy", "Karma Ezzat"] },
  { name: "Grade 5 A", grade: "Grade 5", homeroom: "Mona Saleh", room: "12", students: ["Lina Haddad", "Omar Khalil", "Farida Nabil", "Ziad Samir", "Malak Hosny", "Yassin Fawzy"] },
  { name: "Grade 5 B", grade: "Grade 5", homeroom: "Tarek Adel", room: "14", students: ["Nour Hegazy", "Ali Mostafa", "Habiba Gamal", "Seif Ramzy", "Mariam Ayman"] },
];

/** The demo number is Lina (a student) and Rania, the parent of Lina and Adam. */
export const DEMO_STUDENT = "Lina Haddad";
export const DEMO_PARENT = { name: "Rania Haddad", children: ["Lina Haddad", "Adam Haddad"] };
/** 113.6 Another parent, who writes to Ms. Mona about Omar. */
export const OTHER_PARENT = { name: "Khaled Khalil", children: ["Omar Khalil"] };
/**
 * People with an account of their own in the app, so they can write in the
 * demo's conversations: no phone, and an address under the reserved
 * `.example` domain, which no mail reaches, so nobody signs in as them.
 */
const WRITERS: [string, string][] = [
  ["teacher:Nadia Fahmy", "nadia.fahmy@nakhla-school.example"],
  [`parent:${OTHER_PARENT.name}`, "khaled.khalil@nakhla-school.example"],
];

/** Who teaches what: a subject's teacher per grade (the class's own teacher teaches every subject of it too). */
const TEACHES: Record<string, Record<string, string>> = {
  "Grade 3": { Arabic: "Nadia Fahmy", Maths: "Nadia Fahmy", "Social studies": "Nadia Fahmy", English: "Daniel Brooks", Science: "Youssef Kamal", Art: "Heba Mansour", PE: "Heba Mansour" },
  "Grade 5": { Arabic: "Tarek Adel", Maths: "Mona Saleh", "Social studies": "Tarek Adel", English: "Daniel Brooks", Science: "Youssef Kamal", Art: "Heba Mansour", PE: "Heba Mansour" },
};

/** Five lessons a day, with a break after the second and the fourth. */
export const SCHOOL_LESSONS: [number, number][] = [
  [8 * 60, 8 * 60 + 45],
  [8 * 60 + 50, 9 * 60 + 35],
  [9 * 60 + 50, 10 * 60 + 35],
  [10 * 60 + 40, 11 * 60 + 25],
  [11 * 60 + 45, 12 * 60 + 30],
];

/** One week of a class, Sunday first; each class starts the week on another day of it, so a teacher is in one class at a time. */
const WEEK: string[][] = [
  ["Maths", "Arabic", "English", "Science", "Art"],
  ["Arabic", "Maths", "Social studies", "English", "PE"],
  ["Science", "English", "Maths", "Arabic", "Social studies"],
  ["English", "Science", "Arabic", "PE", "Maths"],
  ["Social studies", "Arabic", "Science", "Maths", "English"],
];

/** The lab, the art room and the sports hall have numbers too: the app writes "Room 21". */
const ROOMS: Record<string, string> = { Science: "21", Art: "23", PE: "25" };

/** A class's lessons: [weekday, lesson number, subject, teacher, room]. */
export function classWeek(index: number): [number, number, string, string, string][] {
  const klass = SCHOOL_CLASSES[index]!;
  const out: [number, number, string, string, string][] = [];
  for (const [d, weekday] of DAYS.entries()) {
    const day = WEEK[(d + index * 2) % WEEK.length]!;
    for (const [lesson, subject] of day.entries()) out.push([weekday, lesson, subject, TEACHES[klass.grade]![subject]!, ROOMS[subject] ?? klass.room]);
  }
  return out;
}

interface HomeworkSeed {
  klass: string;
  subject: string;
  title: string;
  text: string;
  /** School days from today: below zero, already due. */
  due: number;
  /** What students handed in and the teacher's mark, by name. */
  marked?: Record<string, { mark: string; feedback: string | null }>;
}

export const SCHOOL_HOMEWORK: HomeworkSeed[] = [
  {
    klass: "Grade 5 A",
    subject: "Maths",
    title: "Fractions: exercises 1 to 10",
    text: "Page 42 of your book. Show how you worked out each one.",
    due: -2,
    marked: { "Lina Haddad": { mark: "9/10", feedback: "Very good. Look at number 7 again." }, "Farida Nabil": { mark: "10/10", feedback: "Perfect!" }, "Omar Khalil": { mark: "7/10", feedback: null } },
  },
  { klass: "Grade 5 A", subject: "English", title: "My weekend in five sentences", text: "Write five sentences about your weekend. Use the past tense.", due: 1 },
  { klass: "Grade 5 A", subject: "Science", title: "Plant cells worksheet", text: "Label the parts of the plant cell and write one line about what each part does.", due: 2 },
  { klass: "Grade 5 A", subject: "Arabic", title: "Read the story on pages 30 to 34", text: "Read it aloud at home and answer the three questions at the end.", due: 3 },
  { klass: "Grade 5 B", subject: "Maths", title: "Fractions: exercises 1 to 10", text: "Page 42 of your book. Show how you worked out each one.", due: -1 },
  { klass: "Grade 3 B", subject: "Maths", title: "Times tables 6 and 7", text: "Practise them every day. We have a short quiz on Thursday.", due: 1 },
  { klass: "Grade 3 B", subject: "English", title: "Colours and animals", text: "Learn the ten new words and draw three of them.", due: 2 },
  {
    klass: "Grade 3 B",
    subject: "Science",
    title: "Draw a plant and name its parts",
    text: "Roots, stem, leaves and flower. Colour it in.",
    due: -3,
    marked: { "Adam Haddad": { mark: "Excellent", feedback: "Lovely colours, and every part is right." }, "Jana Ashraf": { mark: "Very good", feedback: null } },
  },
];

interface AssessmentSeed {
  klass: string;
  subject: string;
  kind: SchoolAssessmentKind;
  title: string;
  /** School days ago. */
  ago: number;
  maxScore: number;
  /** In the order of the class's students. */
  scores: number[];
}

export const SCHOOL_ASSESSMENTS: AssessmentSeed[] = [
  { klass: "Grade 5 A", subject: "Maths", kind: "quiz", title: "Fractions quiz", ago: 4, maxScore: 20, scores: [17, 15, 19, 12, 16, 14] },
  { klass: "Grade 5 A", subject: "Science", kind: "exam", title: "Unit 1 test", ago: 9, maxScore: 50, scores: [43, 38, 47, 31, 40, 36] },
  { klass: "Grade 5 A", subject: "English", kind: "quiz", title: "Spelling quiz", ago: 6, maxScore: 10, scores: [9, 7, 10, 6, 8, 8] },
  { klass: "Grade 5 A", subject: "Arabic", kind: "assignment", title: "Reading aloud", ago: 3, maxScore: 10, scores: [8, 9, 9, 7, 10, 8] },
  { klass: "Grade 3 B", subject: "Maths", kind: "quiz", title: "Adding and taking away", ago: 5, maxScore: 20, scores: [18, 16, 20, 14, 17] },
  { klass: "Grade 3 B", subject: "English", kind: "quiz", title: "Spelling quiz", ago: 2, maxScore: 10, scores: [7, 9, 8, 10, 6] },
];

/** A class's own news, besides the school's (lib/samples SAMPLE_SCHOOL_NEWS). */
const CLASS_NEWS: { klass: string; teacher: string; title: string; body: string; hoursAgo: number }[] = [
  { klass: "Grade 5 A", teacher: "Mona Saleh", title: "Bring a ruler and a protractor", body: "We start angles in Maths this week. Please bring a ruler and a protractor to every Maths lesson.", hoursAgo: 3 },
  { klass: "Grade 3 B", teacher: "Nadia Fahmy", title: "Our class trip to the zoo", body: "Grade 3 B visits the zoo next Wednesday. Please pack a hat, water and a small lunch.", hoursAgo: 50 },
];

/** 113.3 News for the people who work at the school. */
const STAFF_NEWS: { title: string; body: string; hoursAgo: number }[] = [
  { title: "Staff meeting tomorrow at 14:30", body: "In the staff room: the term's reports and the exam timetable. Tea and biscuits as usual.", hoursAgo: 5 },
  { title: "Payslips are in the app", body: "Last month's payslips are in the app, under Account. Speak to Ms. Samia in the office about any question.", hoursAgo: 75 },
];

/** Fees by student: a term's fees paid at the office, and one due. */
const FEES: { student: string; title: string; amountCents: number; paidDaysAgo?: number; dueIn?: number }[] = [
  { student: "Lina Haddad", title: "Term 1 fees", amountCents: 45_000_00, paidDaysAgo: 40 },
  { student: "Lina Haddad", title: "Science museum trip", amountCents: 350_00, dueIn: 7 },
  { student: "Adam Haddad", title: "Term 1 fees", amountCents: 38_000_00, paidDaysAgo: 40 },
  { student: "Adam Haddad", title: "Art supplies", amountCents: 150_00, dueIn: 5 },
];

/** The days someone wasn't marked present: school days ago, the student, the mark and the note. */
const MARKS: [number, string, SchoolAttendanceStatus, string | null][] = [
  [5, "Lina Haddad", "late", "The bus was late."],
  [8, "Adam Haddad", "excused", "Dentist appointment."],
  [3, "Ziad Samir", "absent", null],
  [2, "Jana Ashraf", "late", null],
  [11, "Seif Ramzy", "absent", null],
  [7, "Omar Khalil", "late", null],
];

/** How many school days back the attendance is filled in. */
const ATTENDANCE_DAYS = 15;

const isSchoolDay = (date: string) => SCHOOL_DAYS.includes(isoWeekday(date));

/** The school day `n` school days from `today`: before it for a negative n; 0 is today, or the next school day. */
export function schoolDay(today: string, n: number): string {
  let date = today;
  while (!isSchoolDay(date)) date = addDays(date, 1);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n); left > 0; ) {
    date = addDays(date, step);
    if (isSchoolDay(date)) left--;
  }
  return date;
}

/** The term around today, so attendance and grades fall in it. */
function termOf(today: string): SchoolSettings["term"] {
  return { name: "Term 1", startsOn: addDays(today, -60), endsOn: addDays(today, 60) };
}

export interface SchoolPeople {
  byName: Map<string, SchoolPerson>;
  classes: Map<string, number>;
  subjects: Map<string, number>;
  /** As samples: what was added (lib/samples/demo.ts). */
  made?: SchoolSample;
}

/**
 * The school's structure, matched by name so a refresh keeps its IDs: the
 * subjects, classes, teachers, students and the parent, the parent's
 * children and the timetable. People the demo no longer has are removed.
 * Templates = demos: with `sample`, the same school is added to a school
 * started from the demo, without the demo number and its accounts, nothing
 * of the school's own changed, and what was added returned as `made`.
 */
export async function syncSchoolStructure(store: DataStore, app: Pick<App, "id">, now: Date, options: { sample?: boolean } = {}): Promise<SchoolPeople> {
  const sample = options.sample === true;
  const made: SchoolSample = { classIds: [], subjectIds: [], personIds: [] };
  const subjects = new Map<string, number>();
  const savedSubjects = await store.listSchoolSubjects(app.id);
  for (const name of SCHOOL_SUBJECTS) {
    const found = savedSubjects.find((s) => s.name === name);
    if (found) subjects.set(name, found.id);
    else {
      const saved = await store.saveSchoolSubject({ appId: app.id, id: null, name }, now);
      if (saved.ok) {
        subjects.set(name, saved.subject.id);
        made.subjectIds.push(saved.subject.id);
      }
    }
  }
  if (!sample) for (const s of savedSubjects) if (!SCHOOL_SUBJECTS.includes(s.name)) await store.deleteSchoolSubject(app.id, s.id);

  const byName = new Map<string, SchoolPerson>();
  const people = await store.listSchoolPeople(app.id);
  const key = (role: string, name: string) => `${role}:${name}`;
  type Wanted = [role: SchoolPerson["role"], name: string, fields: Partial<Pick<SchoolPerson, "phone" | "classId" | "code" | "jobTitle" | "department">>];
  /** These people, in this order: each saved again only when it changed, the new ones added in one go. */
  const ensure = async (wanted: Wanted[]): Promise<void> => {
    const adding: SchoolRows["people"][] = [];
    for (const [role, name, fields] of wanted) {
      // Templates = demos: the school's people as samples have no phone, so nobody signs in as one.
      const input = { phone: sample ? null : (fields.phone ?? null), email: null, classId: fields.classId ?? null, code: fields.code ?? null, photoAssetId: null, active: true, jobTitle: fields.jobTitle ?? null, department: fields.department ?? null };
      const found = sample ? undefined : people.find((p) => p.role === role && p.name === name);
      if (found) {
        // A refresh of the school as the demo has it writes nothing.
        if (!unchanged(found, { name, ...input })) await store.updateSchoolPerson(app.id, found.id, { name, ...input }, now);
        byName.set(key(role, name), { ...found, ...input });
      } else adding.push({ appId: app.id, role, name, ...input, userId: null, createdAt: now, updatedAt: now });
    }
    if (adding.length === 0) return;
    await store.saveSchoolRows("people", adding);
    const saved = await store.listSchoolPeople(app.id);
    for (const row of adding) {
      const person = newest(saved, (p) => p.role === row.role && p.name === row.name);
      if (!person) throw new Error(`Couldn't add ${row.name} to the demo school.`);
      made.personIds.push(person.id);
      byName.set(key(row.role, row.name), person);
    }
  };
  await ensure([
    ...SCHOOL_TEACHERS.map((name): Wanted => ["teacher", name, { phone: name === DEMO_TEACHER ? DEMO_SIGN_IN.e164 : null, ...JOBS[name] }]),
    ...SCHOOL_STAFF.map((s): Wanted => ["staff", s.name, { jobTitle: s.jobTitle, department: s.department }]),
  ]);

  const classes = new Map<string, number>();
  const savedClasses = await store.listSchoolClasses(app.id);
  for (const klass of SCHOOL_CLASSES) {
    const found = sample ? undefined : savedClasses.find((c) => c.name === klass.name);
    const wanted = { name: klass.name, grade: klass.grade, homeroomTeacherId: byName.get(key("teacher", klass.homeroom))!.id };
    const saved = found && unchanged(found, wanted) ? found : await store.saveSchoolClass({ appId: app.id, id: found?.id ?? null, ...wanted }, now);
    classes.set(klass.name, saved!.id);
    if (!found) made.classIds.push(saved!.id);
  }
  if (!sample) for (const c of savedClasses) if (!SCHOOL_CLASSES.some((k) => k.name === c.name)) await store.deleteSchoolClass(app.id, c.id);

  let code = 1000;
  const students: Wanted[] = [];
  for (const klass of SCHOOL_CLASSES) {
    for (const name of klass.students) {
      code += 7;
      students.push(["student", name, { classId: classes.get(klass.name)!, code: `NS-${code}`, phone: name === DEMO_STUDENT ? DEMO_SIGN_IN.e164 : null }]);
    }
  }
  await ensure([...students, ["parent", DEMO_PARENT.name, { phone: DEMO_SIGN_IN.e164 }], ["parent", OTHER_PARENT.name, {}]]);
  // A parent's children, set again only when they changed.
  const family = sample ? [] : await store.listSchoolFamily(app.id, {});
  const children = async (parent: SchoolPerson, names: string[]) => {
    const ids = names.map((name) => byName.get(key("student", name))!.id);
    if (!sameIds(family.filter((l) => l.parentId === parent.id).map((l) => l.studentId), ids)) await store.setSchoolChildren(app.id, parent.id, ids);
  };
  await children(byName.get(key("parent", DEMO_PARENT.name))!, DEMO_PARENT.children);
  await children(byName.get(key("parent", OTHER_PARENT.name))!, OTHER_PARENT.children);

  if (sample) {
    // No demo number, no accounts of the demo's, nothing of the owner's removed: only the timetable is added.
    await store.saveSchoolRows("periods", timetableOf(app, classes, subjects, byName));
    return { byName, classes, subjects, made };
  }

  // The demo number's account is Lina, Rania and Ms. Mona; Ms. Nadia and Omar's father have accounts too, to write in the demo's conversations.
  const demoUser = (await store.getHostedUserByPhone(app.id, DEMO_SIGN_IN.e164)) ?? (await store.createHostedUser({ appId: app.id, phone: DEMO_SIGN_IN.e164, name: DEMO_USER_NAME, email: null, city: null, now }));
  for (const p of byName.values()) {
    if (p.phone === DEMO_SIGN_IN.e164 && demoUser && p.userId !== demoUser.id) {
      await store.updateSchoolPerson(app.id, p.id, { userId: demoUser.id }, now);
      p.userId = demoUser.id;
    }
  }
  for (const [k, email] of WRITERS) {
    const p = byName.get(k);
    if (!p || (p.userId !== null && (await store.getHostedUser(app.id, p.userId)))) continue;
    const user = (await store.getHostedEmailUser(app.id, email)) ?? (await store.createHostedUser({ appId: app.id, phone: null, name: p.name, email, city: null, now }));
    if (!user) continue;
    await store.updateSchoolPerson(app.id, p.id, { userId: user.id }, now);
    p.userId = user.id;
  }
  const kept = new Set([...byName.values()].map((p) => p.id));
  for (const p of people) if (!kept.has(p.id)) await store.deleteSchoolPerson(app.id, p.id);

  // The timetable, made again when it isn't the demo's (nothing points at a lesson).
  const lessons = timetableOf(app, classes, subjects, byName);
  const periods = await store.listSchoolPeriods(app.id);
  const lesson = (p: SchoolRows["periods"]) => [p.classId, p.subjectId, p.teacherId, p.weekday, p.startMinute, p.endMinute, p.room].join(":");
  const have = periods.map(lesson).sort();
  const want = lessons.map(lesson).sort();
  if (have.length !== want.length || have.some((x, i) => x !== want[i])) {
    await store.deleteSchoolRows(app.id, "periods", periods.map((p) => p.id));
    await store.saveSchoolRows("periods", lessons);
  }
  return { byName, classes, subjects };
}

/** The classes' weekly lessons. */
function timetableOf(app: Pick<App, "id">, classes: Map<string, number>, subjects: Map<string, number>, byName: Map<string, SchoolPerson>): SchoolRows["periods"][] {
  const rows: SchoolRows["periods"][] = [];
  for (const [index, klass] of SCHOOL_CLASSES.entries()) {
    for (const [weekday, lesson, subject, teacher, room] of classWeek(index)) {
      const [startMinute, endMinute] = SCHOOL_LESSONS[lesson]!;
      rows.push({ appId: app.id, classId: classes.get(klass.name)!, subjectId: subjects.get(subject)!, teacherId: byName.get(`teacher:${teacher}`)!.id, weekday, startMinute, endMinute, room });
    }
  }
  return rows;
}

async function schoolPeopleOf(store: DataStore, appId: string): Promise<SchoolPeople> {
  const [people, classes, subjects] = await Promise.all([store.listSchoolPeople(appId), store.listSchoolClasses(appId), store.listSchoolSubjects(appId)]);
  return {
    byName: new Map(people.map((p) => [`${p.role}:${p.name}`, p])),
    classes: new Map(classes.map((c) => [c.name, c.id])),
    subjects: new Map(subjects.map((s) => [s.name, s.id])),
  };
}

const SEEDED_HOMEWORK = new Set(SCHOOL_HOMEWORK.map((h) => h.title));
const SEEDED_ASSESSMENTS = new Set(SCHOOL_ASSESSMENTS.map((a) => a.title));
const SEEDED_NEWS = new Set([...SAMPLE_SCHOOL_NEWS.map((n) => n.title.en), ...CLASS_NEWS.map((n) => n.title), ...STAFF_NEWS.map((n) => n.title)]);

/**
 * The school day: what the visitor wrote as the teacher more than a day ago
 * is deleted (its count returned); the seeded homework, scores, news, fees
 * and attendance are made again, dated from today, when they are from
 * another day (or always, with `force`, when the demo is set up).
 */
export async function refreshSchoolDay(store: DataStore, app: Pick<App, "id" | "timeZone" | "catalogSettings">, now: Date, options: { force?: boolean; people?: SchoolPeople } = {}): Promise<number> {
  const before = now.getTime() - DEMO_RETENTION_HOURS * 3_600_000;
  const settings: SchoolSettings = { ...SCHOOL_DEMO_SETTINGS, term: null };
  const today = utcToLocal(now, settings.timezone).date;
  const dir = options.people ?? (await schoolPeopleOf(store, app.id));
  const teacher = (name: string) => dir.byName.get(`teacher:${name}`)?.id ?? null;
  const student = (name: string) => dir.byName.get(`student:${name}`)!;
  const mine = teacher(DEMO_TEACHER);
  if (mine === null) return 0;

  // What the visitor wrote as Ms. Mona, after a day.
  let deleted = 0;
  const homework = await store.listSchoolHomework(app.id);
  const assessments = await store.listSchoolAssessments(app.id);
  const news = await store.listSchoolAnnouncements(app.id, { limit: 500 });
  const visitors = <T extends { teacherId: number | null; title: string; createdAt: Date }>(rows: T[], seeded: Set<string>) =>
    rows.filter((r) => r.teacherId === mine && !seeded.has(r.title) && r.createdAt.getTime() < before);
  // Each kind in one go (the demo apps' refresh runs in one request).
  const gone = <T extends { id: number }>(rows: T[]) => rows.map((r) => r.id);
  const [oldHomework, oldAssessments, oldNews] = [visitors(homework, SEEDED_HOMEWORK), visitors(assessments, SEEDED_ASSESSMENTS), visitors(news, SEEDED_NEWS)];
  await store.deleteSchoolRows(app.id, "homework", gone(oldHomework));
  await store.deleteSchoolRows(app.id, "assessments", gone(oldAssessments));
  await store.deleteSchoolRows(app.id, "announcements", gone(oldNews));
  deleted += oldHomework.length + oldAssessments.length + oldNews.length;

  // The seeded day is made again once it is from another day.
  const marker = homework.find((h) => h.title === SCHOOL_HOMEWORK[0]!.title);
  if (!options.force && marker && utcToLocal(marker.createdAt, settings.timezone).date === today) return deleted;

  await store.saveSchoolSettings(app.id, { ...settings, term: termOf(today) }, now);
  await store.deleteSchoolRows(app.id, "homework", gone(homework.filter((h) => SEEDED_HOMEWORK.has(h.title))));
  await store.deleteSchoolRows(app.id, "assessments", gone(assessments.filter((a) => SEEDED_ASSESSMENTS.has(a.title))));
  await store.deleteSchoolRows(app.id, "announcements", gone(news.filter((n) => SEEDED_NEWS.has(n.title))));
  const students = [...dir.byName.values()].filter((p) => p.role === "student");
  const studentIds = new Set(students.map((s) => s.id));
  await store.deleteSchoolRows(app.id, "fees", gone((await store.listSchoolFees(app.id)).filter((f) => studentIds.has(f.studentId))));

  const teacherOf = (klass: string, subject: string) => teacher(TEACHES[SCHOOL_CLASSES.find((c) => c.name === klass)!.grade]![subject]!);
  // Oldest first, a minute apart, so "newest first" keeps the demo's order.
  const homeworkRows: SchoolRows["homework"][] = [...SCHOOL_HOMEWORK].reverse().map((seed, i) => ({
    appId: app.id,
    classId: dir.classes.get(seed.klass)!,
    subjectId: dir.subjects.get(seed.subject)!,
    teacherId: teacherOf(seed.klass, seed.subject),
    title: seed.title,
    text: seed.text,
    dueOn: schoolDay(today, seed.due),
    files: [],
    createdAt: new Date(now.getTime() - (SCHOOL_HOMEWORK.length - i) * 60_000),
  }));
  await store.saveSchoolRows("homework", homeworkRows);
  const madeHomework = await store.listSchoolHomework(app.id);
  const submissions: SchoolRows["submissions"][] = [];
  for (const [i, seed] of [...SCHOOL_HOMEWORK].reverse().entries()) {
    const row = homeworkRows[i]!;
    const made = newest(madeHomework, (h) => h.classId === row.classId && h.title === row.title && h.createdAt.getTime() === row.createdAt.getTime());
    if (!made) continue;
    for (const [name, { mark, feedback }] of Object.entries(seed.marked ?? {})) {
      const handedIn = new Date(now.getTime() - (2 - seed.due) * 86_400_000);
      submissions.push({ appId: app.id, homeworkId: made.id, studentId: student(name).id, text: "Done, it's in my book.", file: null, submittedAt: handedIn, late: false, mark, feedback, markedAt: new Date(handedIn.getTime() + 86_400_000) });
    }
  }
  await store.saveSchoolRows("submissions", submissions);
  const assessmentRows: SchoolRows["assessments"][] = SCHOOL_ASSESSMENTS.map((seed) => ({
    appId: app.id,
    classId: dir.classes.get(seed.klass)!,
    subjectId: dir.subjects.get(seed.subject)!,
    teacherId: teacherOf(seed.klass, seed.subject),
    kind: seed.kind,
    title: seed.title,
    date: schoolDay(today, -seed.ago),
    maxScore: seed.maxScore,
    createdAt: now,
  }));
  await store.saveSchoolRows("assessments", assessmentRows);
  const madeAssessments = await store.listSchoolAssessments(app.id);
  const scores: SchoolRows["scores"][] = [];
  for (const [i, seed] of SCHOOL_ASSESSMENTS.entries()) {
    const row = assessmentRows[i]!;
    const made = newest(madeAssessments, (a) => a.classId === row.classId && a.subjectId === row.subjectId && a.title === row.title);
    const klass = SCHOOL_CLASSES.find((c) => c.name === seed.klass)!;
    if (made) for (const [n, name] of klass.students.entries()) scores.push({ appId: app.id, assessmentId: made.id, studentId: student(name).id, score: seed.scores[n]!, note: null, updatedAt: now });
  }
  await store.saveSchoolRows("scores", scores);
  // The school's news, oldest first, then each class's, then the staff's.
  await store.saveSchoolRows("announcements", [
    ...[...SAMPLE_SCHOOL_NEWS].reverse().map((seed) => ({ appId: app.id, audience: "school" as const, classId: null, studentId: null, title: seed.title.en, body: seed.body.en, teacherId: null, createdAt: new Date(now.getTime() - (seed.daysAgo * 24 + 2) * 3_600_000) })),
    ...CLASS_NEWS.map((seed) => ({ appId: app.id, audience: "class" as const, classId: dir.classes.get(seed.klass)!, studentId: null, title: seed.title, body: seed.body, teacherId: teacher(seed.teacher), createdAt: new Date(now.getTime() - seed.hoursAgo * 3_600_000) })),
    ...STAFF_NEWS.map((seed) => ({ appId: app.id, audience: "staff" as const, classId: null, studentId: null, title: seed.title, body: seed.body, teacherId: null, createdAt: new Date(now.getTime() - seed.hoursAgo * 3_600_000) })),
  ]);
  // A term's fees paid at the office (with their receipts), and one due.
  await store.saveSchoolRows(
    "fees",
    FEES.map((seed) => {
      const fee: SchoolRows["fees"] = {
        appId: app.id,
        studentId: student(seed.student).id,
        title: seed.title,
        amountCents: seed.amountCents,
        dueOn: seed.dueIn !== undefined ? addDays(today, seed.dueIn) : addDays(today, -(seed.paidDaysAgo ?? 0) - 5),
        status: "due",
        paidAt: null,
        paidBy: null,
        orderId: null,
        receiptCode: null,
        createdAt: new Date(now.getTime() - 50 * 86_400_000),
        updatedAt: now,
      };
      return seed.paidDaysAgo !== undefined ? { ...fee, ...paidFeePatch("office", new Date(now.getTime() - seed.paidDaysAgo * 86_400_000)) } : fee;
    }),
  );
  // Attendance of the past school days, taken by each class's own teacher; what the visitor marked those days is replaced.
  const rows = [];
  for (let ago = 1; ago <= ATTENDANCE_DAYS; ago++) {
    const date = schoolDay(today, -ago);
    for (const klass of SCHOOL_CLASSES) {
      for (const name of klass.students) {
        const mark = MARKS.find(([days, who]) => days === ago && who === name);
        rows.push({ appId: app.id, classId: dir.classes.get(klass.name)!, studentId: student(name).id, date, status: mark?.[2] ?? ("present" as const), note: mark?.[3] ?? null, takenBy: teacher(klass.homeroom), updatedAt: now });
      }
    }
  }
  await store.saveSchoolAttendance(rows);
  // 113.10 The bus; 113.11 the library; 113.4 the parent's area; and the rest of the school's life (lib/demo/school-life.ts).
  await syncSchoolBusAndLibrary(store, app, dir, now);
  await syncSchoolParentArea(store, app, dir, now);
  await syncSchoolLife(store, app, dir, now, today);
  return deleted;
}
