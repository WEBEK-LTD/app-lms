import { addDays } from "../bookings/time";
import type { DataStore } from "../data/store";
import { SCHOOL_ROLES, type App, type HostedUser, type SchoolPerson, type SchoolRole } from "../data/types";
import { isReviewUser } from "../delivery/review";
import { behaviourCategories, signedPoints } from "./behaviour";
import { markFeePaid } from "./fees";
import { schoolToday } from "./service";
import { schoolSettingsOf } from "./settings";

/**
 * 105.4.7b The store reviewers sign in to a school app with the app's review
 * number (or email) and fixed code from App sign-in, as in every app (102).
 * The first time they do, the school gets a class of their own ("App
 * Review class", grade "App Review") with sample classmates, and the review
 * account is on its list as each role at once: the class's student, that
 * student's parent, the class's teacher and a member of the school's
 * staff (113.3: the app's Staff tab). The class has a week of lessons, homework,
 * scores, attendance, an event and a day off on the calendar, a published
 * exam, merits and notes, news and a paid fee, so every screen has
 * something. The school's own teachers never see the review class (they
 * don't teach it), and the review teacher sees only it.
 */

export const REVIEW_CLASS_NAME = "App Review class";
export const REVIEW_GRADE = "App Review";
export const REVIEW_NAMES = { student: "App Review (student)", parent: "App Review (parent)", teacher: "App Review (teacher)", staff: "App Review (staff)" } as const;
const CLASSMATES = ["Sample student A", "Sample student B"];
const SUBJECTS = ["Mathematics", "English", "Science"];
const LESSONS: [number, number][] = [
  [8 * 60, 8 * 60 + 45],
  [9 * 60, 9 * 60 + 45],
  [10 * 60, 10 * 60 + 45],
];

/** The roles the review account takes at the school: all of them, 113.3's `staff` too. */
export function reviewRoles(): SchoolRole[] {
  return [...SCHOOL_ROLES];
}

/** Makes the review class and the review account's people the first time the reviewers sign in; nothing for anyone else. */
export async function ensureSchoolReview(store: DataStore, app: App, user: HostedUser, now: Date): Promise<void> {
  // Studio's demo school has its own people (lib/demo/school.ts).
  if (app.connector?.kind !== "school" || app.demo || !isReviewUser(app, user)) return;
  const who = user.phone ? { phone: user.phone, email: null } : { phone: null, email: user.email?.toLowerCase() ?? null };
  const found = await store.findSchoolPeople(app.id, who);
  if (found.some((p) => p.role === "student")) {
    // 113.3 Staff came after the rest was made: the review account becomes staff too.
    await addMissingRoles(store, app, who, found, now);
    return;
  }
  const classes = await store.listSchoolClasses(app.id);
  const klass = classes.find((c) => c.name === REVIEW_CLASS_NAME) ?? (await store.saveSchoolClass({ appId: app.id, id: null, name: REVIEW_CLASS_NAME, grade: REVIEW_GRADE, homeroomTeacherId: null }, now));
  if (!klass) return;
  const person = async (role: SchoolRole, name: string, contact: { phone: string | null; email: string | null }, classId: number | null): Promise<SchoolPerson | null> => {
    const made = await store.createSchoolPerson({ appId: app.id, role, name, phone: contact.phone, email: contact.email, classId, code: role === "student" ? "REVIEW" : null, photoAssetId: null, active: true }, now);
    if (made.ok) return made.person;
    return (await store.findSchoolPeople(app.id, contact)).find((p) => p.role === role) ?? null;
  };
  const student = await person("student", REVIEW_NAMES.student, who, klass.id);
  const teacher = found.find((p) => p.role === "teacher") ?? (await person("teacher", REVIEW_NAMES.teacher, who, null));
  const parent = found.find((p) => p.role === "parent") ?? (await person("parent", REVIEW_NAMES.parent, who, null));
  if (!student || !teacher || !parent) return;
  await addMissingRoles(store, app, who, [student, teacher, parent], now);
  await store.saveSchoolClass({ appId: app.id, id: klass.id, name: klass.name, grade: klass.grade, homeroomTeacherId: teacher.id }, now);
  const existing = (await store.listSchoolFamily(app.id, { parentId: parent.id })).map((l) => l.studentId);
  await store.setSchoolChildren(app.id, parent.id, [...existing, student.id]);
  const classmates: SchoolPerson[] = [];
  for (const name of CLASSMATES) {
    const made = await store.createSchoolPerson({ appId: app.id, role: "student", name, phone: null, email: null, classId: klass.id, code: null, photoAssetId: null, active: true }, now);
    if (made.ok) classmates.push(made.person);
  }
  await sampleSchoolDay(store, app, { classId: klass.id, student, teacher, classmates }, now);
}

async function addMissingRoles(store: DataStore, app: App, who: { phone: string | null; email: string | null }, found: readonly SchoolPerson[], now: Date): Promise<void> {
  for (const role of reviewRoles()) {
    if (role === "student" || role === "parent" || role === "teacher" || found.some((p) => p.role === role)) continue;
    const name = role in REVIEW_NAMES ? REVIEW_NAMES[role as keyof typeof REVIEW_NAMES] : `App Review (${role})`;
    await store.createSchoolPerson({ appId: app.id, role, name, phone: who.phone, email: who.email, classId: null, code: null, photoAssetId: null, active: true }, now);
  }
}

/** The review class's sample week, dated from today. */
async function sampleSchoolDay(
  store: DataStore,
  app: App,
  input: { classId: number; student: SchoolPerson; teacher: SchoolPerson; classmates: SchoolPerson[] },
  now: Date,
): Promise<void> {
  const { classId, student, teacher, classmates } = input;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const today = schoolToday(settings, now);
  // The school's own subjects when it has some, else three to start with.
  let subjects = (await store.listSchoolSubjects(app.id)).slice(0, 3);
  if (subjects.length === 0) {
    for (const name of SUBJECTS) {
      const made = await store.saveSchoolSubject({ appId: app.id, id: null, name }, now);
      if (made.ok) subjects.push(made.subject);
    }
    subjects = subjects.slice(0, 3);
  }
  if (subjects.length === 0) return;
  // Lessons every day of the week, so the reviewers see today's on any day.
  for (let weekday = 1; weekday <= 7; weekday++) {
    for (const [i, [start, end]] of LESSONS.entries()) {
      const subject = subjects[(weekday + i) % subjects.length]!;
      await store.saveSchoolPeriod({ id: null, appId: app.id, classId, subjectId: subject.id, teacherId: teacher.id, weekday, startMinute: start, endMinute: end, room: "1" });
    }
  }
  const first = subjects[0]!;
  const second = subjects[1 % subjects.length]!;
  await store.createSchoolHomework({ appId: app.id, classId, subjectId: first.id, teacherId: teacher.id, title: "Sample homework: exercises 1 to 5", text: "Solve exercises 1 to 5 on page 12 and hand in a photo of your work.", dueOn: addDays(today, 3), files: [], createdAt: now });
  const done = await store.createSchoolHomework({ appId: app.id, classId, subjectId: second.id, teacherId: teacher.id, title: "Sample homework: a short paragraph", text: "Write five sentences about your weekend.", dueOn: addDays(today, -2), files: [], createdAt: now });
  await store.saveSchoolSubmission({ appId: app.id, homeworkId: done.id, studentId: student.id, text: "Last weekend I visited my grandparents.", file: null, submittedAt: now, late: false, mark: "A", feedback: "Well written.", markedAt: now });
  const quiz = await store.createSchoolAssessment({ appId: app.id, classId, subjectId: first.id, teacherId: teacher.id, kind: "quiz", title: "Sample quiz", date: addDays(today, -4), maxScore: 10, createdAt: now });
  await store.saveSchoolScores(app.id, quiz.id, [{ studentId: student.id, score: 8, note: null }, ...classmates.map((c, i) => ({ studentId: c.id, score: 7 + i, note: null }))], now);
  await store.createSchoolAssessment({ appId: app.id, classId, subjectId: second.id, teacherId: teacher.id, kind: "exam", title: "Sample exam", date: addDays(today, 7), maxScore: 100, createdAt: now });
  const days = [1, 2, 3, 4, 5].map((n) => addDays(today, -n));
  await store.saveSchoolAttendance(
    [student, ...classmates].flatMap((s) =>
      days.map((date, i) => ({ appId: app.id, classId, studentId: s.id, date, status: s.id === student.id && i === 2 ? ("late" as const) : ("present" as const), note: null, takenBy: teacher.id, updatedAt: now })),
    ),
  );
  // 113.8 The calendar, the exams' timetable and behaviour.
  await store.saveSchoolEvent({ id: null, appId: app.id, kind: "event", title: "Class trip (sample)", notes: "Bring a packed lunch.", startsOn: addDays(today, 5), endsOn: addDays(today, 5), startMinute: 9 * 60, endMinute: 13 * 60, place: "Science museum", audience: "class", grade: null, classId }, now);
  await store.saveSchoolEvent({ id: null, appId: app.id, kind: "holiday", title: "Day off (sample)", notes: null, startsOn: addDays(today, 10), endsOn: addDays(today, 10), startMinute: null, endMinute: null, place: null, audience: "class", grade: null, classId }, now);
  const exam = await store.saveSchoolExam({ id: null, appId: app.id, classId, grade: null, subjectId: second.id, date: addDays(today, 7), startMinute: 9 * 60, durationMinutes: 60, room: "1", notes: "Units 1 to 3. Bring a pen and a ruler." }, now);
  if (exam) await store.publishSchoolExams(app.id, [exam.id], now);
  const categories = (await behaviourCategories(store, app, now)).filter((c) => c.active);
  const good = categories.find((c) => c.kind === "positive");
  const bad = categories.find((c) => c.kind === "negative");
  const note = (s: SchoolPerson, c: (typeof categories)[number], text: string | null, ago: number) =>
    store.createSchoolBehaviour({ appId: app.id, studentId: s.id, classId, categoryId: c.id, categoryName: c.name, kind: c.kind, points: signedPoints(c.kind, c.points), note: text, teacherId: teacher.id, createdAt: new Date(now.getTime() - ago * 3_600_000) });
  if (good) await note(student, good, "Helped a classmate with the exercises.", 26);
  if (bad) await note(student, bad, null, 50);
  if (good && classmates[0]) await note(classmates[0], good, null, 30);
  await store.createSchoolAnnouncement({ appId: app.id, audience: "class", classId, studentId: null, title: "Welcome to the review class", body: "This class, its lessons and its people are samples for the store review.", teacherId: teacher.id, createdAt: now });
  const fee = await store.createSchoolFee({ appId: app.id, studentId: student.id, title: "Sample fee (store review)", amountCents: 0, dueOn: today, status: "due", paidAt: null, paidBy: null, orderId: null, receiptCode: null, createdAt: now, updatedAt: now });
  await markFeePaid(store, app, fee, "office", now);
  // 113.4 A permission slip for the parent to sign in the Parent tab.
  await store.saveSchoolSlip({ id: null, appId: app.id, title: "Class trip (sample slip)", details: "May your child come on the class trip to the science museum?", dueOn: addDays(today, 4), feeNote: null, audience: "class", grade: null, classId }, now);
}

/**
 * The notes for the stores' reviewers of a school app, in English as they
 * read them: one sign-in, and where each role is in the app.
 */
export function schoolReviewNotes(app: Pick<App, "appName" | "hostedSettings">): string | null {
  const settings = app.hostedSettings;
  if (!settings?.reviewCode || (!settings.reviewPhone && !settings.reviewEmail)) return null;
  const login = settings.reviewPhone ? `the phone number ${settings.reviewPhone}` : `the email ${settings.reviewEmail}`;
  const school = (app.appName ?? "").trim() || "the school";
  const staff = reviewRoles().includes("staff" as SchoolRole);
  return [
    `${school} is a school's app for its students, their parents${staff ? ", its teachers and its staff" : " and its teachers"}. Sign in with ${login} and the code ${settings.reviewCode} (no message is sent to it). The school has put this one account on its list as each role at once, in a class of samples ("${REVIEW_CLASS_NAME}"), so every role can be tried without signing out:`,
    `As a student: the School tab shows today's lessons, homework (open "Sample homework: exercises 1 to 5" and hand in a text or a photo), grades and the report card, attendance, the calendar (month or list, with Add to calendar), the exams' timetable, behaviour (merits, notes and points), and the news.`,
    `As a parent: the same account is the parent of that student, so the app has a Parent tab, which only parents see: the child's day (lessons, homework due, the latest grades, behaviour), fees with a receipt, a permission slip to sign ("Class trip (sample slip)", yes or no with a name), an absence to excuse, and who picks the child up; the parent is told of new homework, scores, exams and behaviour notes.`,
    `As a teacher: the Classroom tab shows the class; take attendance, give homework, mark it, enter scores, write a merit or a note in Behaviour, and see the exams and the calendar.`,
    staff ? `As a member of staff: the same account is on the school's staff list too, so the app has a Staff tab, as the school's staff who don't teach have: checking in and out, their job and hours, leave requests (ask for a day off and withdraw it), the staff's news, the school's calendar with the staff's own events, and the library when the school has books.` : null,
    `Real students, parents and teachers of the school never see this class or what is written in it.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
