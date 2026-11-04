import { addDays, localToUtc, timeOf } from "../bookings/time";
import type { DataStore } from "../data/store";
import type { App, SchoolBehaviourKind, SchoolCheckin, SchoolEventInput, SchoolPerson, SchoolReportField, SchoolSalaryAdvance } from "../data/types";
import { lockMonth, makeMonthSheets, monthBefore, recordPayment } from "../school/salaries";
import { tripStops } from "../school/bus";
import { DEMO_TEACHER, schoolDay, type SchoolPeople, SCHOOL_CLASSES, SCHOOL_DAYS } from "./school";

/**
 * Nakhla School's everyday life in Studio's school demo, besides the
 * lessons, homework and grades (lib/demo/school.ts): behaviour points, the
 * gate's check-ins of the students and the people who work there, the
 * school's calendar, the exam timetable, the syllabus and how far each
 * class got, the teachers' reports, messages between teachers and parents,
 * salaries with their payslips, a leave and an advance, and the bus's past
 * trips. Dated from today and made again with the school day; what the
 * visitor added to these as the teacher goes with it.
 */

const TZ = "Africa/Cairo";
const DAY = 86_400_000;

type Deps = { store: DataStore; app: Pick<App, "id" | "timeZone" | "catalogSettings">; now: Date; today: string; people: SchoolPeople };

const at = (date: string, minute: number) => localToUtc(date, timeOf(minute), TZ);

function who(people: SchoolPeople, role: SchoolPerson["role"], name: string): SchoolPerson | null {
  return people.byName.get(`${role}:${name}`) ?? null;
}

// Behaviour

const CATEGORIES: { name: string; kind: SchoolBehaviourKind; points: number }[] = [
  { name: "Helping others", kind: "positive", points: 2 },
  { name: "Great participation", kind: "positive", points: 1 },
  { name: "Homework on time", kind: "positive", points: 1 },
  { name: "Kindness", kind: "positive", points: 2 },
  { name: "Late to class", kind: "negative", points: 1 },
  { name: "Talking in class", kind: "negative", points: 1 },
  { name: "Forgot equipment", kind: "negative", points: 1 },
];

/** Behaviour notes: the student, the category, the teacher, school days ago and a note. */
const NOTES: [string, string, string, number, string | null][] = [
  ["Lina Haddad", "Helping others", "Mona Saleh", 1, "Helped Malak with the fractions exercise."],
  ["Lina Haddad", "Great participation", "Daniel Brooks", 3, null],
  ["Lina Haddad", "Forgot equipment", "Mona Saleh", 6, "No protractor in the Maths lesson."],
  ["Lina Haddad", "Kindness", "Heba Mansour", 8, "Shared her paints with a new classmate."],
  ["Adam Haddad", "Homework on time", "Nadia Fahmy", 2, null],
  ["Adam Haddad", "Talking in class", "Nadia Fahmy", 4, "During the reading lesson."],
  ["Adam Haddad", "Great participation", "Youssef Kamal", 5, "Great questions about plants."],
  ["Omar Khalil", "Late to class", "Mona Saleh", 2, null],
  ["Farida Nabil", "Helping others", "Mona Saleh", 3, null],
  ["Ziad Samir", "Talking in class", "Tarek Adel", 1, null],
  ["Nour Hegazy", "Kindness", "Tarek Adel", 2, null],
  ["Jana Ashraf", "Homework on time", "Nadia Fahmy", 6, null],
];

async function behaviour({ store, app, now, today, people }: Deps): Promise<void> {
  for (const n of await store.listSchoolBehaviour(app.id)) await store.deleteSchoolBehaviour(app.id, n.id);
  for (const c of await store.listSchoolBehaviourCategories(app.id)) await store.deleteSchoolBehaviourCategory(app.id, c.id);
  const ids = new Map<string, number>();
  for (const c of CATEGORIES) {
    const saved = await store.saveSchoolBehaviourCategory({ appId: app.id, id: null, name: c.name, kind: c.kind, points: c.points, active: true }, now);
    if (saved) ids.set(c.name, saved.id);
  }
  for (const [name, category, teacher, ago, note] of NOTES) {
    const student = who(people, "student", name);
    const c = CATEGORIES.find((x) => x.name === category)!;
    if (!student) continue;
    await store.createSchoolBehaviour({
      appId: app.id,
      studentId: student.id,
      classId: student.classId,
      categoryId: ids.get(category) ?? null,
      categoryName: c.name,
      kind: c.kind,
      points: c.points,
      note,
      teacherId: who(people, "teacher", teacher)?.id ?? null,
      createdAt: at(schoolDay(today, -ago), 10 * 60 + ago * 7),
    });
  }
}

// The calendar and the exams

async function calendar({ store, app, now, today, people }: Deps): Promise<void> {
  for (const e of await store.listSchoolEvents(app.id)) await store.deleteSchoolEvent(app.id, e.id);
  for (const e of await store.listSchoolExams(app.id)) await store.deleteSchoolExam(app.id, e.id);
  const fiveA = people.classes.get("Grade 5 A") ?? null;
  const threeB = people.classes.get("Grade 3 B") ?? null;
  const events: Omit<SchoolEventInput, "appId">[] = [
    { kind: "event", title: "Parents' evening, Grade 5", notes: "Meet your child's teachers in the main hall. No booking needed.", startsOn: schoolDay(today, 3), endsOn: schoolDay(today, 3), startMinute: 17 * 60, endMinute: 19 * 60, place: "Main hall", audience: "grade", grade: "Grade 5", classId: null },
    { kind: "event", title: "Sports day", notes: "Races, football and a picnic. Children come in their sports kit.", startsOn: schoolDay(today, 6), endsOn: schoolDay(today, 6), startMinute: 8 * 60, endMinute: 13 * 60, place: "Sports ground", audience: "school", grade: null, classId: null },
    { kind: "event", title: "Science museum trip", notes: "Grade 5 A, with Ms. Mona and Mr. Youssef. Back by 13:00.", startsOn: schoolDay(today, 4), endsOn: schoolDay(today, 4), startMinute: 9 * 60, endMinute: 13 * 60, place: "Children's Science Museum", audience: "class", grade: null, classId: fiveA },
    { kind: "event", title: "Zoo trip", notes: "Pack a hat, water and a small lunch.", startsOn: schoolDay(today, 2), endsOn: schoolDay(today, 2), startMinute: 9 * 60, endMinute: 12 * 60 + 30, place: "Giza Zoo", audience: "class", grade: null, classId: threeB },
    { kind: "holiday", title: "Mid-term break", notes: "No school. Lessons start again on the Sunday after.", startsOn: addDays(today, 24), endsOn: addDays(today, 27), startMinute: null, endMinute: null, place: null, audience: "school", grade: null, classId: null },
    { kind: "event", title: "Staff meeting", notes: "The term's reports and the exam timetable.", startsOn: schoolDay(today, 1), endsOn: schoolDay(today, 1), startMinute: 14 * 60 + 30, endMinute: 15 * 60 + 30, place: "Staff room", audience: "staff", grade: null, classId: null },
    { kind: "event", title: "Reading week", notes: "Every class reads together for the first 20 minutes of the day.", startsOn: schoolDay(today, -2), endsOn: schoolDay(today, 2), startMinute: null, endMinute: null, place: null, audience: "school", grade: null, classId: null },
  ];
  for (const e of events) await store.saveSchoolEvent({ ...e, appId: app.id, id: null }, now);

  // The mid-term exams, a week and a half away, published for Grade 5 and Grade 3 B.
  const exams: { grade: string | null; klass: string | null; subject: string; in: number; minute: number; room: string }[] = [
    { grade: "Grade 5", klass: null, subject: "Maths", in: 8, minute: 8 * 60 + 30, room: "Hall A" },
    { grade: "Grade 5", klass: null, subject: "Arabic", in: 9, minute: 8 * 60 + 30, room: "Hall A" },
    { grade: "Grade 5", klass: null, subject: "English", in: 10, minute: 8 * 60 + 30, room: "Hall A" },
    { grade: "Grade 5", klass: null, subject: "Science", in: 11, minute: 8 * 60 + 30, room: "Hall A" },
    { grade: null, klass: "Grade 3 B", subject: "Maths", in: 9, minute: 9 * 60, room: "7" },
    { grade: null, klass: "Grade 3 B", subject: "English", in: 11, minute: 9 * 60, room: "7" },
  ];
  const ids: number[] = [];
  for (const e of exams) {
    const subjectId = people.subjects.get(e.subject);
    if (subjectId === undefined) continue;
    const saved = await store.saveSchoolExam(
      { appId: app.id, id: null, classId: e.klass ? (people.classes.get(e.klass) ?? null) : null, grade: e.grade, subjectId, date: schoolDay(today, e.in), startMinute: e.minute, durationMinutes: e.klass ? 45 : 90, room: e.room, notes: "Bring two pencils, an eraser and a ruler." },
      now,
    );
    if (saved) ids.push(saved.id);
  }
  await store.publishSchoolExams(app.id, ids, now);
}

// The syllabus

const SYLLABUS: { subject: string; grade: string; title: string; topics: { title: string; weeks: [number, number] }[] }[] = [
  {
    subject: "Maths",
    grade: "Grade 5",
    title: "Fractions",
    topics: [
      { title: "Equivalent fractions", weeks: [-5, -4] },
      { title: "Adding and subtracting fractions", weeks: [-3, -2] },
      { title: "Mixed numbers", weeks: [-1, -1] },
    ],
  },
  {
    subject: "Maths",
    grade: "Grade 5",
    title: "Angles",
    topics: [
      { title: "Measuring angles", weeks: [0, 0] },
      { title: "Types of angles", weeks: [1, 1] },
      { title: "Angles in a triangle", weeks: [2, 3] },
    ],
  },
  {
    subject: "Science",
    grade: "Grade 5",
    title: "Plants",
    topics: [
      { title: "Plant cells", weeks: [-2, -1] },
      { title: "Photosynthesis", weeks: [0, 1] },
      { title: "Seeds and how plants grow", weeks: [2, 3] },
    ],
  },
  {
    subject: "English",
    grade: "Grade 5",
    title: "Telling a story",
    topics: [
      { title: "The past tense", weeks: [-2, -1] },
      { title: "Writing about my weekend", weeks: [0, 0] },
      { title: "Beginning, middle and end", weeks: [1, 2] },
    ],
  },
  {
    subject: "Maths",
    grade: "Grade 3",
    title: "Times tables",
    topics: [
      { title: "Tables of 2, 5 and 10", weeks: [-4, -3] },
      { title: "Tables of 3 and 4", weeks: [-2, -1] },
      { title: "Tables of 6 and 7", weeks: [0, 1] },
    ],
  },
];

async function syllabus({ store, app, now, today, people }: Deps): Promise<void> {
  for (const u of await store.listSchoolSyllabusUnits(app.id)) await store.deleteSchoolSyllabusUnit(app.id, u.id);
  const week = (n: number) => addDays(today, n * 7);
  for (const unit of SYLLABUS) {
    const subjectId = people.subjects.get(unit.subject);
    if (subjectId === undefined) continue;
    const saved = await store.saveSchoolSyllabusUnit({ appId: app.id, id: null, subjectId, grade: unit.grade, title: unit.title }, now);
    if (!saved) continue;
    for (const topic of unit.topics) {
      const t = await store.saveSchoolSyllabusTopic({ appId: app.id, id: null, unitId: saved.id, title: topic.title, startsOn: week(topic.weeks[0]), endsOn: addDays(week(topic.weeks[1]), 4) }, now);
      if (!t || topic.weeks[1] >= 0) continue;
      // Covered: every class of the grade, Grade 5 B a topic behind in Maths.
      for (const klass of SCHOOL_CLASSES.filter((c) => c.grade === unit.grade)) {
        if (klass.name === "Grade 5 B" && unit.subject === "Maths" && topic.weeks[1] === -1) continue;
        const classId = people.classes.get(klass.name);
        if (classId === undefined) continue;
        await store.saveSchoolTopicProgress({ appId: app.id, classId, topicId: t.id, coveredOn: addDays(week(topic.weeks[1]), 3), note: null, teacherId: null, updatedAt: now });
      }
    }
  }
}

// The teachers' reports

const PROGRESS: SchoolReportField[] = [
  { id: "f1", label: "Effort", type: "rating", options: [], required: true },
  { id: "f2", label: "Homework", type: "choice", options: ["Always on time", "Mostly on time", "Often late"], required: true },
  { id: "f3", label: "Strengths", type: "text", options: [], required: true },
  { id: "f4", label: "Next steps", type: "text", options: [], required: false },
];
const CLASS_WEEK: SchoolReportField[] = [
  { id: "f1", label: "What we covered", type: "text", options: [], required: true },
  { id: "f2", label: "How the class did", type: "rating", options: [], required: true },
  { id: "f3", label: "Anything the school should know", type: "text", options: [], required: false },
];

async function reports({ store, app, now, today, people }: Deps): Promise<void> {
  for (const r of await store.listSchoolReports(app.id)) await store.deleteSchoolReport(app.id, r.id);
  for (const t of await store.listSchoolReportTemplates(app.id)) await store.deleteSchoolReportTemplate(app.id, t.id);
  const progress = await store.saveSchoolReportTemplate({ appId: app.id, id: null, kind: "student", name: "Monthly progress", fields: PROGRESS }, now);
  const week = await store.saveSchoolReportTemplate({ appId: app.id, id: null, kind: "class", name: "Weekly class report", fields: CLASS_WEEK }, now);
  const monthStart = addDays(today, -30);
  const days = (n: number) => new Date(now.getTime() - n * DAY);
  const base = { appId: app.id, subjectId: null, periodFrom: monthStart, periodTo: today, readAt: null };
  const rows: { teacher: string; student?: string; klass?: string; template: typeof progress; answers: Record<string, string | number>; status: "draft" | "sent" | "returned" | "approved"; shared: boolean; ago: number; comments?: { by: "school" | "teacher"; name: string; text: string }[] }[] = [
    {
      teacher: "Mona Saleh",
      student: "Lina Haddad",
      template: progress,
      answers: { f1: 5, f2: "Always on time", f3: "Lina explains her working clearly and helps her classmates. Her fractions quiz was one of the best in the class.", f4: "Practise measuring angles at home with a protractor." },
      status: "approved",
      shared: true,
      ago: 2,
    },
    {
      teacher: "Nadia Fahmy",
      student: "Adam Haddad",
      template: progress,
      answers: { f1: 4, f2: "Mostly on time", f3: "Adam reads with confidence and loves Science. His plant drawing was excellent.", f4: "Learn the 6 and 7 times tables by heart before the quiz." },
      status: "approved",
      shared: true,
      ago: 3,
    },
    {
      teacher: "Mona Saleh",
      student: "Omar Khalil",
      template: progress,
      answers: { f1: 3, f2: "Often late", f3: "Omar is quick with mental maths.", f4: "Hand homework in on time and arrive before the bell." },
      status: "sent",
      shared: false,
      ago: 1,
    },
    {
      teacher: "Mona Saleh",
      klass: "Grade 5 A",
      template: week,
      answers: { f1: "Mixed numbers, and we started angles.", f2: 4, f3: "Six students still need a protractor." },
      status: "returned",
      shared: false,
      ago: 4,
      comments: [{ by: "school", name: "Nakhla School", text: "Thank you. Please add which students need a protractor so the office can lend them one." }],
    },
  ];
  for (const r of rows) {
    if (!r.template) continue;
    const teacher = who(people, "teacher", r.teacher);
    const student = r.student ? who(people, "student", r.student) : null;
    const sentAt = r.status === "draft" ? null : days(r.ago);
    await store.createSchoolReport({
      ...base,
      kind: r.template.kind,
      templateId: r.template.id,
      templateName: r.template.name,
      fields: r.template.fields,
      answers: r.answers,
      teacherId: teacher?.id ?? null,
      teacherName: r.teacher,
      studentId: student?.id ?? null,
      classId: r.klass ? (people.classes.get(r.klass) ?? null) : (student?.classId ?? null),
      status: r.status,
      comments: (r.comments ?? []).map((c) => ({ ...c, at: days(r.ago - 1).toISOString() })),
      sentAt,
      reviewedAt: r.status === "approved" || r.status === "returned" ? days(r.ago - 1) : null,
      sharedAt: r.shared ? days(r.ago - 1) : null,
      createdAt: days(r.ago + 1),
      updatedAt: days(Math.max(0, r.ago - 1)),
    });
  }
}

// The gate's check-ins

/** How many school days back the gate's check-ins go, for the students and for the people who work there. */
const STUDENT_DAYS = 10;
const WORKER_DAYS = 22;

/** A minute from a name and a day, so the times look like a real gate's and stay the same when made again. */
function spread(name: string, date: string, span: number): number {
  let h = 0;
  for (const ch of `${name}${date}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % span;
}

/** Late or away days: [school days ago, name, what]. */
const GATE_MARKS: [number, string, "late" | "absent" | "excused" | "early"][] = [
  [5, "Lina Haddad", "late"],
  [8, "Adam Haddad", "excused"],
  [3, "Ziad Samir", "absent"],
  [2, "Jana Ashraf", "late"],
  [11, "Seif Ramzy", "absent"],
  [7, "Omar Khalil", "late"],
  [4, "Mona Saleh", "late"],
  [10, "Youssef Kamal", "early"],
  [6, "Hany Lotfy", "late"],
];

async function checkins({ store, app, now, today, people }: Deps, leaveDays: Map<number, Set<string>>): Promise<void> {
  const everyone = [...people.byName.values()].filter((p) => p.active && p.role !== "parent");
  const from = schoolDay(today, -WORKER_DAYS);
  const have = new Set((await store.listSchoolCheckins(app.id, { from, to: today })).map((c) => `${c.personId}:${c.date}`));
  for (const person of everyone) {
    const role: SchoolCheckin["role"] = person.role === "student" ? "student" : person.role === "teacher" ? "teacher" : "staff";
    const back = role === "student" ? STUDENT_DAYS : WORKER_DAYS;
    for (let ago = 1; ago <= back; ago++) {
      const date = schoolDay(today, -ago);
      if (have.has(`${person.id}:${date}`) || !SCHOOL_DAYS.includes(isoDay(date))) continue;
      if (leaveDays.get(person.id)?.has(date)) continue;
      const mark = GATE_MARKS.find(([days, name]) => days === ago && name === person.name)?.[2];
      const student = role === "student";
      const empty = { appId: app.id, personId: person.id, role, date, corrections: [], updatedAt: now };
      if (mark === "absent" || mark === "excused") {
        await store.saveSchoolCheckin({ ...empty, inAt: null, inMethod: null, outAt: null, outMethod: null, late: false, leftEarly: false, mark });
        continue;
      }
      const late = mark === "late";
      const inMinute = student ? (late ? 8 * 60 + 6 + spread(person.name, date, 10) : 7 * 60 + 32 + spread(person.name, date, 26)) : late ? 7 * 60 + 36 + spread(person.name, date, 12) : 6 * 60 + 48 + spread(person.name, date, 38);
      const early = mark === "early";
      const outMinute = student ? 14 * 60 + spread(person.name, `${date}out`, 12) : early ? 13 * 60 + 40 : 15 * 60 + spread(person.name, `${date}out`, 20);
      await store.saveSchoolCheckin({
        ...empty,
        inAt: at(date, inMinute),
        inMethod: student ? "qr" : spread(person.name, date, 3) === 0 ? "location" : "qr",
        outAt: at(date, outMinute),
        outMethod: student ? "qr" : "location",
        late,
        leftEarly: early,
        mark: null,
      });
    }
  }
}

function isoDay(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

// Leave, salaries and payslips

/** Monthly salaries in pounds, and the allowances. */
const SALARIES: Record<string, number> = {
  "Mona Saleh": 16_500,
  "Youssef Kamal": 15_800,
  "Nadia Fahmy": 15_200,
  "Daniel Brooks": 17_000,
  "Heba Mansour": 13_500,
  "Tarek Adel": 15_000,
  "Samia Fouad": 9_800,
  "Hany Lotfy": 8_200,
  "Amal Zaki": 10_400,
};

/** Ms. Mona's leave: a sick day, approved, and a few days later this month she asked for. */
async function leave({ store, app, now, today, people }: Deps): Promise<Map<number, Set<string>>> {
  const out = new Map<number, Set<string>>();
  const mona = who(people, "teacher", DEMO_TEACHER);
  const heba = who(people, "teacher", "Heba Mansour");
  const sick = "A cold; the doctor's note is with the office.";
  const trip = "Family wedding in Alexandria.";
  const visit = "Hospital appointment.";
  const mine = mona ? await store.listSchoolLeave(app.id, { personId: mona.id }) : [];
  if (mona && !mine.some((l) => l.note === sick)) {
    const day = schoolDay(today, -9);
    await store.createSchoolLeave({ appId: app.id, personId: mona.id, kind: "sick", startsOn: day, endsOn: day, note: sick, file: null, status: "approved", answer: "Get well soon.", answeredBy: "Nakhla School", answeredAt: new Date(now.getTime() - 9 * DAY), createdAt: new Date(now.getTime() - 9 * DAY), updatedAt: now });
  }
  // The one she asked for, waiting for an answer; once its days are past it was approved, and she asks for the next one.
  const waiting = mine.find((l) => l.note === trip && l.status === "pending");
  if (mona && waiting && waiting.startsOn <= today) await store.updateSchoolLeave(app.id, waiting.id, { status: "approved", answer: "Enjoy the wedding.", answeredBy: "Nakhla School", answeredAt: now, updatedAt: now }, ["pending"]);
  if (mona && (!waiting || waiting.startsOn <= today)) {
    await store.createSchoolLeave({ appId: app.id, personId: mona.id, kind: "annual", startsOn: schoolDay(today, 12), endsOn: schoolDay(today, 13), note: trip, file: null, status: "pending", answer: null, answeredBy: null, answeredAt: null, createdAt: new Date(now.getTime() - DAY), updatedAt: now });
  }
  if (heba && !(await store.listSchoolLeave(app.id, { personId: heba.id })).some((l) => l.note === visit)) {
    const day = schoolDay(today, -3);
    await store.createSchoolLeave({ appId: app.id, personId: heba.id, kind: "other", startsOn: day, endsOn: day, note: visit, file: null, status: "approved", answer: null, answeredBy: "Nakhla School", answeredAt: new Date(now.getTime() - 5 * DAY), createdAt: new Date(now.getTime() - 6 * DAY), updatedAt: now });
  }
  for (const l of await store.listSchoolLeave(app.id, { statuses: ["approved"] })) {
    const set = out.get(l.personId) ?? new Set<string>();
    for (let d = l.startsOn; d <= l.endsOn; d = addDays(d, 1)) set.add(d);
    out.set(l.personId, set);
  }
  return out;
}

async function salaries(deps: Deps): Promise<void> {
  const { store, app, now, today, people } = deps;
  const workers = [...people.byName.values()].filter((p) => p.active && (p.role === "teacher" || p.role === "staff"));
  for (const p of workers) {
    const pounds = SALARIES[p.name];
    if (!pounds) continue;
    const allowances = p.role === "teacher" ? [{ name: "Transport", cents: 800_00 }, { name: "Class teacher", cents: SCHOOL_CLASSES.some((c) => c.homeroom === p.name) ? 1_000_00 : 0 }].filter((a) => a.cents > 0) : [{ name: "Transport", cents: 600_00 }];
    await store.saveSchoolSalary({ appId: app.id, personId: p.id, monthlyCents: pounds * 100, currency: "EGP", allowances, note: null, updatedBy: "Nakhla School", updatedAt: now });
  }
  const current = today.slice(0, 7);
  const mona = who(people, "teacher", DEMO_TEACHER);
  // Ms. Mona's advance, given two months ago and paid back a thousand pounds a month.
  if (mona && (await store.listSchoolSalaryAdvances(app.id, { personId: mona.id })).length === 0) {
    const given = monthBefore(current, 2);
    const advance: Omit<SchoolSalaryAdvance, "id"> = {
      appId: app.id,
      personId: mona.id,
      personName: mona.name,
      currency: "EGP",
      amountCents: 5_000_00,
      instalmentCents: 1_000_00,
      startsMonth: monthBefore(current, 1),
      given: { id: "demo-advance", cents: 5_000_00, method: "cash", paidOn: `${given}-12`, note: "For the new term's books.", receiptAssetId: null, by: "Nakhla School", at: new Date(now.getTime() - 50 * DAY).toISOString() },
      repayments: [],
      createdAt: new Date(now.getTime() - 50 * DAY),
      updatedAt: now,
    };
    await store.createSchoolSalaryAdvance(advance);
  }
  const salaryDeps = { store, app, now, by: "Nakhla School" };
  // The last two months paid by bank on the 27th; this month's sheets still drafts.
  for (const month of [monthBefore(current, 2), monthBefore(current, 1)]) {
    if ((await store.listSchoolPayslips(app.id, { month })).length > 0) continue;
    const made = await makeMonthSheets(salaryDeps, month);
    if (!made.ok) continue;
    await lockMonth(salaryDeps, month);
    for (const sheet of await store.listSchoolPayslips(app.id, { month })) {
      if (sheet.netCents > 0) await recordPayment(salaryDeps, sheet, { cents: sheet.netCents - sheet.paidCents, method: "bank", paidOn: `${month}-27`, note: null, receiptAssetId: null });
    }
  }
  await makeMonthSheets(salaryDeps, current);
}

// Messages between teachers and parents

/** The conversations: the teacher, the parent, and the messages, oldest first (who writes and how many hours ago). */
const CONVERSATIONS: { teacher: string; parent: string; messages: [("teacher" | "parent"), number, string][] }[] = [
  {
    teacher: "Nadia Fahmy",
    parent: "Rania Haddad",
    messages: [
      ["teacher", 52, "Good morning Mrs. Rania. Adam did very well in the spelling quiz this week, 8 out of 10."],
      ["parent", 50, "Thank you Ms. Nadia! He practised every evening."],
      ["teacher", 26, "A small thing: he talks a lot during the reading lesson. Could you have a word with him?"],
      ["parent", 25, "Of course, I'll talk to him tonight. Thank you for telling me."],
      ["teacher", 3, "Reminder: the zoo trip is in two days. A hat and water, please."],
    ],
  },
  {
    teacher: "Mona Saleh",
    parent: "Khaled Khalil",
    messages: [
      ["parent", 30, "Hello Ms. Mona, Omar was late twice this week because of the traffic. I'm sorry."],
      ["teacher", 28, "Thank you for letting me know, Mr. Khaled. He has missed the start of Maths both times, so the bus might help."],
      ["parent", 6, "We've asked the office about Route 1. Is there anything he should catch up on?"],
    ],
  },
];

async function messages({ store, app, now, people }: Deps): Promise<void> {
  for (const c of CONVERSATIONS) {
    const teacher = who(people, "teacher", c.teacher);
    const parent = who(people, "parent", c.parent);
    if (!teacher?.userId || !parent?.userId) continue;
    const member = (p: SchoolPerson) => store.upsertChatMember({ appId: app.id, source: "hosted", externalId: String(p.userId), name: p.name, imageUrl: null }, now);
    const [t, f] = [await member(teacher), await member(parent)];
    const conversation = await store.ensureSchoolConversation({ appId: app.id, teacherId: teacher.id, personId: parent.id }, now);
    await store.addChatParticipant(conversation.id, t.id, now);
    await store.addChatParticipant(conversation.id, f.id, now);
    let last = 0;
    for (const [i, [side, hoursAgo, text]] of c.messages.entries()) {
      const sender = side === "teacher" ? t : f;
      const { message } = await store.createChatMessage({
        appId: app.id,
        conversationId: conversation.id,
        senderKind: "member",
        memberId: sender.id,
        teamUserId: null,
        teamName: null,
        clientId: `demo:${teacher.id}:${parent.id}:${i}`,
        text,
        mediaId: null,
        durationSeconds: null,
        deletedAt: null,
        createdAt: new Date(now.getTime() - hoursAgo * 3_600_000),
      });
      last = message.id;
      await store.setChatRead(conversation.id, sender.id, message.id);
    }
    // The teacher read everything; the parent's last message is the teacher's to answer.
    if (last) await store.setChatRead(conversation.id, t.id, last);
    if (!conversation.teacherWroteAt) await store.updateChatConversation(conversation.id, { teacherWroteAt: new Date(now.getTime() - 50 * 3_600_000) });
  }
}

// The bus's past trips

const BUS_DAYS = 5;

async function busHistory({ store, app, today, people }: Deps): Promise<void> {
  const [route] = await store.listSchoolBusRoutes(app.id);
  if (!route) return;
  const stops = await store.listSchoolBusStops(app.id, { routeId: route.id });
  for (let ago = 1; ago <= BUS_DAYS; ago++) {
    const date = schoolDay(today, -ago);
    for (const trip of ["morning", "afternoon"] as const) {
      const ordered = tripStops(stops, trip);
      if (ordered.length === 0) continue;
      const first = trip === "morning" ? ordered[0]!.morningMinute! - 5 : ordered[0]!.afternoonMinute! - 10;
      const last = trip === "morning" ? ordered[ordered.length - 1]!.morningMinute! + 15 : ordered[ordered.length - 1]!.afternoonMinute! + 2;
      const { run, created } = await store.startSchoolBusRun({
        appId: app.id,
        routeId: route.id,
        trip,
        date,
        status: "done",
        startedAt: at(date, first),
        endedAt: at(date, last),
        startedBy: route.driverId,
        lat: null,
        lng: null,
        locatedAt: null,
        passedStopIds: ordered.map((s) => s.id),
        toldStopIds: ordered.map((s) => s.id),
      });
      if (!created) continue;
      for (const rider of await store.listSchoolBusRiders(app.id, { routeId: route.id, trip })) {
        const stop = ordered.find((s) => s.id === rider.stopId);
        const student = [...people.byName.values()].find((p) => p.id === rider.studentId);
        if (!stop || !student) continue;
        const minute = trip === "morning" ? stop.morningMinute! : stop.afternoonMinute!;
        const away = GATE_MARKS.some(([days, name, what]) => days === ago && name === student.name && (what === "absent" || what === "excused"));
        if (away) {
          await store.saveSchoolBusMark({ appId: app.id, runId: run.id, studentId: student.id, status: "absent", boardedAt: null, offAt: null, markedBy: route.supervisorId, updatedAt: at(date, minute) });
          continue;
        }
        const boarded = trip === "morning" ? at(date, minute) : at(date, first + 3);
        const off = trip === "morning" ? at(date, last - 2) : at(date, minute);
        await store.saveSchoolBusMark({ appId: app.id, runId: run.id, studentId: student.id, status: "off", boardedAt: boarded, offAt: off, markedBy: route.supervisorId, updatedAt: off });
      }
    }
  }
}

/** Everything above, for the school day `today`. */
export async function syncSchoolLife(store: DataStore, app: Pick<App, "id" | "timeZone" | "catalogSettings">, people: SchoolPeople, now: Date, today: string): Promise<void> {
  const deps: Deps = { store, app, now, today, people };
  await behaviour(deps);
  await calendar(deps);
  await syllabus(deps);
  await reports(deps);
  const leaveDays = await leave(deps);
  await checkins(deps, leaveDays);
  await salaries(deps);
  await messages(deps);
  await busHistory(deps);
}
