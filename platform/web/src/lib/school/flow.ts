import { formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import { addDays, timeOf, utcToLocal } from "../bookings/time";
import type { App, SchoolAnnouncement, SchoolAttendanceStatus, SchoolBehaviourCategory, SchoolBehaviourNote, SchoolExam, SchoolFee, SchoolHomework, SchoolPerson, SchoolSubmission } from "../data/types";
import { notifyDeps, type FlowDeps } from "../delivery/flow";
import { behaviourAlertsOf, signedPoints, tellsParents } from "./behaviour";
import { dayOff, examClassIds } from "./calendar";
import { tellAbsence, tellAnnouncement, tellBehaviour, tellExamReminder, tellExams, tellFee, tellGrade, tellHomework, type ExamWords } from "./notify";
import { schoolCurrency, schoolSettingsOf } from "./settings";

/**
 * 105.4 What changes at a school and who is told, the same from the app
 * (a teacher's Classroom tab) and from the dashboard: attendance, homework
 * and its marks, scores, news and fees; 113.8 exams published and their
 * reminders, merits and notes. Pushes never stop a change.
 */

export type SchoolFlowDeps = FlowDeps;

async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch {
    // The change is saved either way.
  }
}

/** Saves a day's marks for a class's students; the families of those newly absent or late are told when the school wants. */
export async function takeAttendance(
  deps: SchoolFlowDeps,
  input: { classId: number; date: string; items: { student: SchoolPerson; status: SchoolAttendanceStatus; note: string | null }[]; takenBy: number | null },
): Promise<void> {
  const { store, app, now } = deps;
  const before = new Map((await store.listSchoolAttendance(app.id, { classId: input.classId, from: input.date, to: input.date })).map((a) => [a.studentId, a.status]));
  await store.saveSchoolAttendance(
    input.items.map((i) => ({ appId: app.id, classId: input.classId, studentId: i.student.id, date: input.date, status: i.status, note: i.note, takenBy: input.takenBy, updatedAt: now })),
  );
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  if (!settings.absenceAlerts) return;
  // 113.8 A holiday or a break: nobody is told of an absence that day.
  const klass = (await store.listSchoolClasses(app.id)).find((c) => c.id === input.classId) ?? null;
  if (await dayOff(store, app.id, input.date, klass)) return;
  const told = notifyDeps(deps);
  for (const item of input.items) {
    if ((item.status === "absent" || item.status === "late") && before.get(item.student.id) !== item.status) {
      await safely(() => tellAbsence(told, item.student, item.status, input.date));
    }
  }
}

/** New homework for a class; its students and their families hear of it. */
export async function giveHomework(deps: SchoolFlowDeps, input: Omit<SchoolHomework, "id" | "appId" | "createdAt">, subjectName: string): Promise<SchoolHomework> {
  const homework = await deps.store.createSchoolHomework({ ...input, appId: deps.app.id, createdAt: deps.now });
  const students = (await deps.store.listSchoolPeople(deps.app.id, { role: "student", classId: input.classId })).filter((s) => s.active);
  await safely(() => tellHomework(notifyDeps(deps), students, homework, subjectName));
  return homework;
}

/** A teacher's mark on a student's homework (handed in or not); the student and family hear of it. */
export async function markHomework(deps: SchoolFlowDeps, homework: SchoolHomework, student: SchoolPerson, mark: string, feedback: string | null): Promise<SchoolSubmission> {
  const { store, app, now } = deps;
  const [found] = await store.listSchoolSubmissions(app.id, { homeworkId: homework.id, studentId: student.id });
  const next: SchoolSubmission = found
    ? { ...found, mark, feedback, markedAt: now }
    : { appId: app.id, homeworkId: homework.id, studentId: student.id, text: "", file: null, submittedAt: null, late: false, mark, feedback, markedAt: now };
  await store.saveSchoolSubmission(next);
  await safely(() => tellGrade(notifyDeps(deps), student, homework.title, mark));
  return next;
}

/** Saves scores for an assessment; students given one for the first time, and their families, hear of it. */
export async function enterScores(
  deps: SchoolFlowDeps,
  assessment: { id: number; title: string; maxScore: number },
  rows: { student: SchoolPerson; score: number | null; note: string | null }[],
): Promise<void> {
  const { store, app, now } = deps;
  const before = new Set((await store.listSchoolScores(app.id, { assessmentId: assessment.id })).map((s) => s.studentId));
  await store.saveSchoolScores(
    app.id,
    assessment.id,
    rows.map((r) => ({ studentId: r.student.id, score: r.score, note: r.note })),
    now,
  );
  const told = notifyDeps(deps);
  for (const row of rows) {
    if (row.score === null || before.has(row.student.id)) continue;
    await safely(() => tellGrade(told, row.student, assessment.title, `${trimScore(row.score!)}/${trimScore(assessment.maxScore)}`));
  }
}

/** 9 → "9", 8.5 → "8.5". */
export function trimScore(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

/** The school's or a teacher's news: everyone it is for hears of it. */
export async function postAnnouncement(deps: SchoolFlowDeps, input: Omit<SchoolAnnouncement, "id" | "appId" | "createdAt">): Promise<SchoolAnnouncement> {
  const { store, app, now } = deps;
  const announcement = await store.createSchoolAnnouncement({ ...input, appId: app.id, createdAt: now });
  let students: SchoolPerson[] = [];
  if (input.audience === "school") students = await store.listSchoolPeople(app.id, { role: "student" });
  else if (input.audience === "class" && input.classId !== null) students = await store.listSchoolPeople(app.id, { role: "student", classId: input.classId });
  else if (input.audience === "student" && input.studentId !== null) {
    const one = await store.getSchoolPerson(app.id, input.studentId);
    students = one ? [one] : [];
  }
  await safely(() => tellAnnouncement(notifyDeps(deps), students.filter((s) => s.active), input.title, input.body, input.audience === "student" ? input.studentId : null));
  return announcement;
}

/** A new fee for a student; the family hears of it. */
export async function addFee(deps: SchoolFlowDeps, student: SchoolPerson, input: { title: string; amountCents: number; dueOn: string | null }): Promise<SchoolFee> {
  const { store, app, now } = deps;
  const fee = await store.createSchoolFee({
    appId: app.id,
    studentId: student.id,
    title: input.title,
    amountCents: input.amountCents,
    dueOn: input.dueOn,
    status: "due",
    paidAt: null,
    paidBy: null,
    orderId: null,
    receiptCode: null,
    createdAt: now,
    updatedAt: now,
  });
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  await safely(() => tellFee(notifyDeps(deps), student, "due", fee.title, formatCents(fee.amountCents, schoolCurrency(settings))));
  return fee;
}

/** A fee was paid (by card or at the office): the family hears of it, with the receipt in the app. */
export async function tellFeePaid(deps: { store: DataStore; app: App; now: Date }, fee: SchoolFee): Promise<void> {
  const student = await deps.store.getSchoolPerson(deps.app.id, fee.studentId);
  if (!student) return;
  const settings = schoolSettingsOf(await deps.store.getSchoolSettings(deps.app.id), deps.app);
  await safely(() => tellFee(notifyDeps(deps), student, "paid", fee.title, formatCents(fee.amountCents, schoolCurrency(settings))));
}

// 113.8 Exams and behaviour

function examWords(exam: SchoolExam, subjects: Map<number, string>): ExamWords {
  return { id: exam.id, subject: subjects.get(exam.subjectId) ?? "", date: exam.date, time: timeOf(exam.startMinute), room: exam.room };
}

/** The active students an exam is for (its class, or every class of its grade). */
async function examStudents(store: DataStore, app: Pick<App, "id">, exam: SchoolExam): Promise<SchoolPerson[]> {
  const ids = examClassIds(exam, await store.listSchoolClasses(app.id));
  const all = await store.listSchoolPeople(app.id, { role: "student" });
  return all.filter((s) => s.active && s.classId !== null && ids.includes(s.classId));
}

/** Publishes drafts of the exams' timetable; each student hears once of all theirs. Returns those published. */
export async function publishExams(deps: SchoolFlowDeps, ids: number[]): Promise<SchoolExam[]> {
  const { store, app, now } = deps;
  const published = await store.publishSchoolExams(app.id, ids, now);
  if (published.length === 0) return [];
  const subjects = new Map((await store.listSchoolSubjects(app.id)).map((s) => [s.id, s.name]));
  const byStudent = new Map<number, { student: SchoolPerson; exams: ExamWords[] }>();
  for (const exam of published) {
    for (const student of await examStudents(store, app, exam)) {
      const entry = byStudent.get(student.id) ?? { student, exams: [] };
      entry.exams.push(examWords(exam, subjects));
      byStudent.set(student.id, entry);
    }
  }
  const told = notifyDeps(deps);
  for (const { student, exams } of byStudent.values()) await safely(() => tellExams(told, student, exams));
  return published;
}

/** The reminder of tomorrow's exams goes from this hour, in the school's time zone. */
export const EXAM_REMINDER_HOUR = 17;

/** The day before each published exam, from 17:00: its students and their families; once per exam. */
export async function remindExams(deps: SchoolFlowDeps): Promise<number> {
  const { store, app, now } = deps;
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  const local = utcToLocal(now, settings.timezone);
  if (Number(local.time.slice(0, 2)) < EXAM_REMINDER_HOUR) return 0;
  const tomorrow = addDays(local.date, 1);
  const exams = (await store.listSchoolExams(app.id, { from: tomorrow, to: tomorrow, published: true })).filter((e) => e.remindedAt === null);
  if (exams.length === 0) return 0;
  const subjects = new Map((await store.listSchoolSubjects(app.id)).map((s) => [s.id, s.name]));
  const told = notifyDeps(deps);
  let reminded = 0;
  for (const exam of exams) {
    if (!(await store.markSchoolExamReminded(app.id, exam.id, now))) continue;
    reminded += 1;
    for (const student of await examStudents(store, app, exam)) await safely(() => tellExamReminder(told, student, examWords(exam, subjects)));
  }
  return reminded;
}

/** A merit or a note on a student, by a teacher (or the school: null); their parents hear of it as the school chose. */
export async function writeBehaviour(deps: SchoolFlowDeps, input: { student: SchoolPerson; category: SchoolBehaviourCategory; note: string | null; teacherId: number | null }): Promise<SchoolBehaviourNote> {
  const { store, app, now } = deps;
  const made = await store.createSchoolBehaviour({
    appId: app.id,
    studentId: input.student.id,
    classId: input.student.classId,
    categoryId: input.category.id,
    categoryName: input.category.name,
    kind: input.category.kind,
    points: signedPoints(input.category.kind, input.category.points),
    note: input.note,
    teacherId: input.teacherId,
    createdAt: now,
  });
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  if (tellsParents(behaviourAlertsOf(settings), made.kind)) await safely(() => tellBehaviour(notifyDeps(deps), input.student, made));
  return made;
}
