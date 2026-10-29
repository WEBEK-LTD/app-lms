import { addDays, utcToLocal } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, SchoolAssessmentKind, SchoolAttendanceStatus, SchoolPerson, SchoolSettings } from "../data/types";
import { SAMPLE_SCHOOL_NEWS } from "../samples/content";
import { markFeePaid } from "../school/fees";
import { isoWeekday } from "../school/service";
import { DEMO_RETENTION_HOURS, DEMO_SIGN_IN } from "./constants";

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

export const SCHOOL_DEMO_SETTINGS: Omit<SchoolSettings, "term"> = { timezone: "Africa/Cairo", currency: "EGP", absenceAlerts: true, feesByCard: true };

export const SCHOOL_SUBJECTS = ["Arabic", "English", "Maths", "Science", "Social studies", "Art", "PE"];

/** The school's teachers; the first is the demo number's. */
export const SCHOOL_TEACHERS = ["Mona Saleh", "Youssef Kamal", "Nadia Fahmy", "Daniel Brooks", "Heba Mansour", "Tarek Adel"];
export const DEMO_TEACHER = SCHOOL_TEACHERS[0]!;

export const SCHOOL_CLASSES: { name: string; grade: string; homeroom: string; room: string; students: string[] }[] = [
  { name: "Grade 3 B", grade: "Grade 3", homeroom: "Nadia Fahmy", room: "Room 7", students: ["Adam Haddad", "Jana Ashraf", "Hamza Lotfy", "Salma Wagdy", "Karma Ezzat"] },
  { name: "Grade 5 A", grade: "Grade 5", homeroom: "Mona Saleh", room: "Room 12", students: ["Lina Haddad", "Omar Khalil", "Farida Nabil", "Ziad Samir", "Malak Hosny", "Yassin Fawzy"] },
  { name: "Grade 5 B", grade: "Grade 5", homeroom: "Tarek Adel", room: "Room 14", students: ["Nour Hegazy", "Ali Mostafa", "Habiba Gamal", "Seif Ramzy", "Mariam Ayman"] },
];

/** The demo number is Lina (a student) and Rania, the parent of Lina and Adam. */
export const DEMO_STUDENT = "Lina Haddad";
export const DEMO_PARENT = { name: "Rania Haddad", children: ["Lina Haddad", "Adam Haddad"] };

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

const ROOMS: Record<string, string> = { Science: "Lab 1", Art: "Art room", PE: "Sports hall" };

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
}

/**
 * The school's structure, matched by name so a refresh keeps its IDs: the
 * subjects, classes, teachers, students and the parent, the parent's
 * children and the timetable. People the demo no longer has are removed.
 */
export async function syncSchoolStructure(store: DataStore, app: Pick<App, "id">, now: Date): Promise<SchoolPeople> {
  const subjects = new Map<string, number>();
  const savedSubjects = await store.listSchoolSubjects(app.id);
  for (const name of SCHOOL_SUBJECTS) {
    const found = savedSubjects.find((s) => s.name === name);
    if (found) subjects.set(name, found.id);
    else {
      const made = await store.saveSchoolSubject({ appId: app.id, id: null, name }, now);
      if (made.ok) subjects.set(name, made.subject.id);
    }
  }
  for (const s of savedSubjects) if (!SCHOOL_SUBJECTS.includes(s.name)) await store.deleteSchoolSubject(app.id, s.id);

  const byName = new Map<string, SchoolPerson>();
  const people = await store.listSchoolPeople(app.id);
  const person = async (role: SchoolPerson["role"], name: string, fields: Partial<Pick<SchoolPerson, "phone" | "classId" | "code">>): Promise<SchoolPerson> => {
    const input = { phone: fields.phone ?? null, email: null, classId: fields.classId ?? null, code: fields.code ?? null, photoAssetId: null, active: true };
    const found = people.find((p) => p.role === role && p.name === name);
    if (found) {
      await store.updateSchoolPerson(app.id, found.id, { name, ...input }, now);
      return { ...found, ...input };
    }
    const made = await store.createSchoolPerson({ appId: app.id, role, name, ...input }, now);
    if (!made.ok) throw new Error(`Couldn't add ${name} to the demo school.`);
    return made.person;
  };
  const key = (role: string, name: string) => `${role}:${name}`;
  for (const name of SCHOOL_TEACHERS) byName.set(key("teacher", name), await person("teacher", name, { phone: name === DEMO_TEACHER ? DEMO_SIGN_IN.e164 : null }));

  const classes = new Map<string, number>();
  const savedClasses = await store.listSchoolClasses(app.id);
  for (const klass of SCHOOL_CLASSES) {
    const found = savedClasses.find((c) => c.name === klass.name);
    const saved = await store.saveSchoolClass({ appId: app.id, id: found?.id ?? null, name: klass.name, grade: klass.grade, homeroomTeacherId: byName.get(key("teacher", klass.homeroom))!.id }, now);
    classes.set(klass.name, saved!.id);
  }
  for (const c of savedClasses) if (!SCHOOL_CLASSES.some((k) => k.name === c.name)) await store.deleteSchoolClass(app.id, c.id);

  let code = 1000;
  for (const klass of SCHOOL_CLASSES) {
    for (const name of klass.students) {
      code += 7;
      byName.set(key("student", name), await person("student", name, { classId: classes.get(klass.name)!, code: `NS-${code}`, phone: name === DEMO_STUDENT ? DEMO_SIGN_IN.e164 : null }));
    }
  }
  const parent = await person("parent", DEMO_PARENT.name, { phone: DEMO_SIGN_IN.e164 });
  byName.set(key("parent", DEMO_PARENT.name), parent);
  await store.setSchoolChildren(app.id, parent.id, DEMO_PARENT.children.map((name) => byName.get(key("student", name))!.id));
  const kept = new Set([...byName.values()].map((p) => p.id));
  for (const p of people) if (!kept.has(p.id)) await store.deleteSchoolPerson(app.id, p.id);

  // The timetable, made again: nothing points at a lesson.
  for (const period of await store.listSchoolPeriods(app.id)) await store.deleteSchoolPeriod(app.id, period.id);
  for (const [index, klass] of SCHOOL_CLASSES.entries()) {
    for (const [weekday, lesson, subject, teacher, room] of classWeek(index)) {
      const [startMinute, endMinute] = SCHOOL_LESSONS[lesson]!;
      await store.saveSchoolPeriod({ id: null, appId: app.id, classId: classes.get(klass.name)!, subjectId: subjects.get(subject)!, teacherId: byName.get(key("teacher", teacher))!.id, weekday, startMinute, endMinute, room });
    }
  }
  return { byName, classes, subjects };
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
const SEEDED_NEWS = new Set([...SAMPLE_SCHOOL_NEWS.map((n) => n.title.en), ...CLASS_NEWS.map((n) => n.title)]);

/**
 * The school day: what the visitor wrote as the teacher more than a day ago
 * is deleted (its count returned); the seeded homework, scores, news, fees
 * and attendance are made again, dated from today, when they are from
 * another day (or always, with `force`, when the demo is set up).
 */
export async function refreshSchoolDay(store: DataStore, app: Pick<App, "id">, now: Date, options: { force?: boolean; people?: SchoolPeople } = {}): Promise<number> {
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
  for (const h of visitors(homework, SEEDED_HOMEWORK)) {
    await store.deleteSchoolHomework(app.id, h.id);
    deleted++;
  }
  for (const a of visitors(assessments, SEEDED_ASSESSMENTS)) {
    await store.deleteSchoolAssessment(app.id, a.id);
    deleted++;
  }
  for (const n of visitors(news, SEEDED_NEWS)) {
    await store.deleteSchoolAnnouncement(app.id, n.id);
    deleted++;
  }

  // The seeded day is made again once it is from another day.
  const marker = homework.find((h) => h.title === SCHOOL_HOMEWORK[0]!.title);
  if (!options.force && marker && utcToLocal(marker.createdAt, settings.timezone).date === today) return deleted;

  await store.saveSchoolSettings(app.id, { ...settings, term: termOf(today) }, now);
  for (const h of homework) if (SEEDED_HOMEWORK.has(h.title)) await store.deleteSchoolHomework(app.id, h.id);
  for (const a of assessments) if (SEEDED_ASSESSMENTS.has(a.title)) await store.deleteSchoolAssessment(app.id, a.id);
  for (const n of news) if (SEEDED_NEWS.has(n.title)) await store.deleteSchoolAnnouncement(app.id, n.id);
  const students = [...dir.byName.values()].filter((p) => p.role === "student");
  for (const s of students) for (const fee of await store.listSchoolFees(app.id, { studentId: s.id })) await store.deleteSchoolFee(app.id, fee.id);

  const teacherOf = (klass: string, subject: string) => teacher(TEACHES[SCHOOL_CLASSES.find((c) => c.name === klass)!.grade]![subject]!);
  // Oldest first, a minute apart, so "newest first" keeps the demo's order.
  for (const [i, seed] of [...SCHOOL_HOMEWORK].reverse().entries()) {
    const due = schoolDay(today, seed.due);
    const made = await store.createSchoolHomework({
      appId: app.id,
      classId: dir.classes.get(seed.klass)!,
      subjectId: dir.subjects.get(seed.subject)!,
      teacherId: teacherOf(seed.klass, seed.subject),
      title: seed.title,
      text: seed.text,
      dueOn: due,
      files: [],
      createdAt: new Date(now.getTime() - (SCHOOL_HOMEWORK.length - i) * 60_000),
    });
    for (const [name, { mark, feedback }] of Object.entries(seed.marked ?? {})) {
      const handedIn = new Date(now.getTime() - (2 - seed.due) * 86_400_000);
      await store.saveSchoolSubmission({ appId: app.id, homeworkId: made.id, studentId: student(name).id, text: "Done, it's in my book.", file: null, submittedAt: handedIn, late: false, mark, feedback, markedAt: new Date(handedIn.getTime() + 86_400_000) });
    }
  }
  for (const seed of SCHOOL_ASSESSMENTS) {
    const klass = SCHOOL_CLASSES.find((c) => c.name === seed.klass)!;
    const made = await store.createSchoolAssessment({
      appId: app.id,
      classId: dir.classes.get(seed.klass)!,
      subjectId: dir.subjects.get(seed.subject)!,
      teacherId: teacherOf(seed.klass, seed.subject),
      kind: seed.kind,
      title: seed.title,
      date: schoolDay(today, -seed.ago),
      maxScore: seed.maxScore,
      createdAt: now,
    });
    await store.saveSchoolScores(app.id, made.id, klass.students.map((name, i) => ({ studentId: student(name).id, score: seed.scores[i]!, note: null })), now);
  }
  // The school's news, oldest first, then each class's.
  for (const seed of [...SAMPLE_SCHOOL_NEWS].reverse()) {
    await store.createSchoolAnnouncement({ appId: app.id, audience: "school", classId: null, studentId: null, title: seed.title.en, body: seed.body.en, teacherId: null, createdAt: new Date(now.getTime() - (seed.daysAgo * 24 + 2) * 3_600_000) });
  }
  for (const seed of CLASS_NEWS) {
    await store.createSchoolAnnouncement({ appId: app.id, audience: "class", classId: dir.classes.get(seed.klass)!, studentId: null, title: seed.title, body: seed.body, teacherId: teacher(seed.teacher), createdAt: new Date(now.getTime() - seed.hoursAgo * 3_600_000) });
  }
  for (const seed of FEES) {
    const fee = await store.createSchoolFee({
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
    });
    if (seed.paidDaysAgo !== undefined) await markFeePaid(store, app, fee, "office", new Date(now.getTime() - seed.paidDaysAgo * 86_400_000));
  }
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
  return deleted;
}
