import { addDays, timeOf, utcToLocal } from "../bookings/time";
import { centsToDecimal, formatCents } from "../catalog/money";
import type { DataStore } from "../data/store";
import type {
  App,
  HostedUser,
  SchoolAnnouncement,
  SchoolAssessment,
  SchoolClass,
  SchoolFee,
  SchoolFileRef,
  SchoolHomework,
  SchoolPeriod,
  SchoolPerson,
  SchoolSettings,
  SchoolSubject,
  SchoolSubmission,
} from "../data/types";
import { courierWho } from "../delivery/service";
import { mediaLink } from "../media/files";
import { schoolCurrency } from "./settings";

/**
 * 105.4 Who the signed-in person is at the school, what they may see, and
 * the school's records as the app reads them (docs/api/openapi.yaml, the
 * School and Classroom tags).
 */

export interface SchoolMember {
  /** The person's records by role; a teacher who is also a parent has two. */
  student: SchoolPerson | null;
  parent: SchoolPerson | null;
  teacher: SchoolPerson | null;
}

export const NO_MEMBER: SchoolMember = { student: null, parent: null, teacher: null };

/**
 * The school's active records for the signed-in person, matched by their
 * number (or email): the record keeps the account last used, for the
 * teacher's name on what they write.
 */
export async function schoolMemberOf(store: DataStore, app: Pick<App, "id">, user: HostedUser, now: Date): Promise<SchoolMember> {
  const found = (await store.findSchoolPeople(app.id, courierWho(user))).filter((p) => p.active);
  const out: SchoolMember = { student: null, parent: null, teacher: null };
  for (const person of found) {
    if (person.userId !== user.id) {
      await store.updateSchoolPerson(app.id, person.id, { userId: user.id }, now);
      person.userId = user.id;
    }
    out[person.role] = person;
  }
  return out;
}

export function memberRoles(member: SchoolMember): ("student" | "parent" | "teacher")[] {
  return (["student", "parent", "teacher"] as const).filter((role) => member[role] !== null);
}

/** The students the person may see: a student themselves, a parent their active children, in the order the school linked them. */
export async function visibleStudents(store: DataStore, app: Pick<App, "id">, member: SchoolMember): Promise<SchoolPerson[]> {
  const out: SchoolPerson[] = member.student ? [member.student] : [];
  if (member.parent) {
    const links = await store.listSchoolFamily(app.id, { parentId: member.parent.id });
    const children = await store.listSchoolPeople(app.id, { role: "student", ids: links.map((l) => l.studentId) });
    for (const child of children) if (child.active && !out.some((s) => s.id === child.id)) out.push(child);
  }
  return out;
}

/** Today in the school's time zone. */
export function schoolToday(settings: SchoolSettings, now: Date): string {
  return utcToLocal(now, settings.timezone).date;
}

/** 1 Monday … 7 Sunday, of a YYYY-MM-DD date. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** The current term's days, else the last 90 days to today. */
export function defaultRange(settings: SchoolSettings, now: Date): { from: string; to: string } {
  const today = schoolToday(settings, now);
  if (settings.term && settings.term.startsOn <= today) return { from: settings.term.startsOn, to: today < settings.term.endsOn ? today : settings.term.endsOn };
  return { from: addDays(today, -89), to: today };
}

/** The school's records an answer needs, read once. */
export interface SchoolDirectory {
  classes: Map<number, SchoolClass>;
  subjects: Map<number, SchoolSubject>;
  people: Map<number, SchoolPerson>;
}

export async function schoolDirectory(store: DataStore, appId: string): Promise<SchoolDirectory> {
  const [classes, subjects, people] = await Promise.all([store.listSchoolClasses(appId), store.listSchoolSubjects(appId), store.listSchoolPeople(appId)]);
  return { classes: new Map(classes.map((c) => [c.id, c])), subjects: new Map(subjects.map((s) => [s.id, s])), people: new Map(people.map((p) => [p.id, p])) };
}

export function studentJson(person: SchoolPerson, dir: Pick<SchoolDirectory, "classes">, assetUrl: (id: string) => string) {
  const klass = person.classId !== null ? (dir.classes.get(person.classId) ?? null) : null;
  return {
    id: person.id,
    name: person.name,
    photo_url: person.photoAssetId ? assetUrl(person.photoAssetId) : null,
    code: person.code,
    class_id: klass?.id ?? null,
    class_name: klass?.name ?? null,
  };
}

export function lessonJson(period: SchoolPeriod, dir: SchoolDirectory) {
  return {
    id: period.id,
    starts: timeOf(period.startMinute),
    ends: timeOf(period.endMinute),
    subject: dir.subjects.get(period.subjectId)?.name ?? "",
    class_id: period.classId,
    class_name: dir.classes.get(period.classId)?.name ?? "",
    teacher_name: period.teacherId !== null ? (dir.people.get(period.teacherId)?.name ?? null) : null,
    room: period.room,
  };
}

/** A week of lessons: the days that have any, Monday first. */
export function timetableJson(periods: readonly SchoolPeriod[], dir: SchoolDirectory) {
  const days = new Map<number, SchoolPeriod[]>();
  for (const p of periods) days.set(p.weekday, [...(days.get(p.weekday) ?? []), p]);
  return {
    days: [...days.entries()]
      .sort(([a], [b]) => a - b)
      .map(([weekday, list]) => ({ weekday, lessons: [...list].sort((a, b) => a.startMinute - b.startMinute || a.id - b.id).map((p) => lessonJson(p, dir)) })),
  };
}

export function fileJson(file: SchoolFileRef, platformUrl: string) {
  return { name: file.name, url: mediaLink(platformUrl, file.fileId), kind: file.kind };
}

export function submissionJson(submission: SchoolSubmission, platformUrl: string) {
  return {
    text: submission.text,
    file: submission.file ? fileJson(submission.file, platformUrl) : null,
    submitted_at: submission.submittedAt?.toISOString() ?? null,
    late: submission.late,
    mark: submission.mark,
    feedback: submission.feedback,
  };
}

/** Homework as a student and their parents see it. */
export function homeworkJson(homework: SchoolHomework, submission: SchoolSubmission | null, dir: SchoolDirectory, platformUrl: string) {
  return {
    id: homework.id,
    subject: dir.subjects.get(homework.subjectId)?.name ?? "",
    title: homework.title,
    text: homework.text,
    due_on: homework.dueOn,
    attachments: homework.files.map((f) => fileJson(f, platformUrl)),
    teacher_name: homework.teacherId !== null ? (dir.people.get(homework.teacherId)?.name ?? null) : null,
    submission: submission ? submissionJson(submission, platformUrl) : null,
  };
}

/** Homework as the teacher who gave it sees it. */
export function classroomHomeworkJson(homework: SchoolHomework, submissions: readonly SchoolSubmission[], students: number, dir: SchoolDirectory, platformUrl: string) {
  return {
    id: homework.id,
    class_id: homework.classId,
    class_name: dir.classes.get(homework.classId)?.name ?? "",
    subject: dir.subjects.get(homework.subjectId)?.name ?? "",
    title: homework.title,
    text: homework.text,
    due_on: homework.dueOn,
    attachments: homework.files.map((f) => fileJson(f, platformUrl)),
    students,
    handed_in: submissions.filter((s) => s.submittedAt !== null).length,
    marked: submissions.filter((s) => s.mark !== null).length,
  };
}

export function assessmentJson(assessment: SchoolAssessment, scored: number, dir: SchoolDirectory) {
  return {
    id: assessment.id,
    class_id: assessment.classId,
    class_name: dir.classes.get(assessment.classId)?.name ?? "",
    subject: dir.subjects.get(assessment.subjectId)?.name ?? "",
    kind: assessment.kind,
    title: assessment.title,
    date: assessment.date,
    max_score: assessment.maxScore,
    scored,
  };
}

export function announcementJson(announcement: SchoolAnnouncement, dir: SchoolDirectory, schoolName: string) {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    audience: announcement.audience,
    class_name: announcement.classId !== null ? (dir.classes.get(announcement.classId)?.name ?? null) : null,
    author: announcement.teacherId !== null ? (dir.people.get(announcement.teacherId)?.name ?? schoolName) : schoolName,
    created_at: announcement.createdAt.toISOString(),
  };
}

/** Whether the announcement is for someone who sees these students (or wrote it). */
export function announcementFor(announcement: SchoolAnnouncement, students: readonly SchoolPerson[], teacherId: number | null): boolean {
  if (announcement.audience === "school") return true;
  if (teacherId !== null && announcement.teacherId === teacherId) return true;
  if (announcement.audience === "class") return students.some((s) => s.classId !== null && s.classId === announcement.classId);
  return students.some((s) => s.id === announcement.studentId);
}

export function feeJson(fee: SchoolFee, settings: SchoolSettings, platformUrl: string) {
  const currency = schoolCurrency(settings);
  return {
    id: fee.id,
    title: fee.title,
    amount: centsToDecimal(fee.amountCents),
    amount_formatted: formatCents(fee.amountCents, currency),
    due_on: fee.dueOn,
    status: fee.status === "paid" ? "paid" : "due",
    paid_at: fee.paidAt?.toISOString() ?? null,
    paid_by: fee.paidBy,
    receipt_url: fee.status === "paid" && fee.receiptCode ? feeReceiptUrl(platformUrl, fee.receiptCode) : null,
  };
}

export function feeReceiptUrl(platformUrl: string, code: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/fee-receipts/${code}`;
}

/** A fee's reference on its receipt: F-000123. */
export function feeReference(fee: Pick<SchoolFee, "id">): string {
  return `F-${String(fee.id).padStart(6, "0")}`;
}

export function schoolConfig(settings: SchoolSettings, canTakeCards: boolean) {
  return {
    timezone: settings.timezone,
    currency: schoolCurrency(settings),
    term: settings.term ? { name: settings.term.name, starts_on: settings.term.startsOn, ends_on: settings.term.endsOn } : null,
    absence_alerts: settings.absenceAlerts,
    fees_by_card: settings.feesByCard && canTakeCards,
  };
}

/** The share of the marks over the scored assessments, 0 to 100 with one decimal; null without any. */
export function percentOf(rows: readonly { score: number; maxScore: number }[]): number | null {
  const max = rows.reduce((sum, r) => sum + r.maxScore, 0);
  if (rows.length === 0 || max <= 0) return null;
  const got = rows.reduce((sum, r) => sum + r.score, 0);
  return Math.round((got / max) * 1000) / 10;
}

/** Whether the teacher teaches the class: a lesson of theirs in its timetable, or they are its own teacher. */
export function teachesClass(teacherId: number, classId: number, periods: readonly SchoolPeriod[], classes: Map<number, SchoolClass>): boolean {
  return periods.some((p) => p.classId === classId && p.teacherId === teacherId) || classes.get(classId)?.homeroomTeacherId === teacherId;
}

/** Whether the teacher teaches the subject in the class (the class's own teacher teaches every subject of it). */
export function teachesSubject(teacherId: number, classId: number, subjectId: number, periods: readonly SchoolPeriod[], classes: Map<number, SchoolClass>): boolean {
  if (classes.get(classId)?.homeroomTeacherId === teacherId) return true;
  return periods.some((p) => p.classId === classId && p.subjectId === subjectId && p.teacherId === teacherId);
}
