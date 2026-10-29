import { addDays, isDate } from "../bookings/time";
import { formatCents } from "../catalog/money";
import { paymentsSetUp } from "../catalog/settings";
import type { DataStore } from "../data/store";
import { SCHOOL_ASSESSMENT_KINDS, SCHOOL_ATTENDANCE_STATUSES, type App, type SchoolAssessmentKind, type SchoolAttendanceStatus, type SchoolFileRef, type SchoolPerson, type SchoolSettings } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { completeUpload, kindOf, MEDIA_KINDS, startUpload, uploadUrl } from "../media/files";
import { storageLimitBytes } from "../media/quota";
import type { MediaStorage } from "../media/storage";
import { hasFeature, type PlanInfo } from "../plans";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { feePayLink } from "./fees";
import { enterScores, giveHomework, markHomework, postAnnouncement, takeAttendance } from "./flow";
import {
  announcementFor,
  announcementJson,
  assessmentJson,
  classroomHomeworkJson,
  defaultRange,
  feeJson,
  homeworkJson,
  isoWeekday,
  lessonJson,
  memberRoles,
  percentOf,
  schoolDirectory,
  schoolMemberOf,
  schoolToday,
  studentJson,
  submissionJson,
  teachesClass,
  teachesSubject,
  timetableJson,
  visibleStudents,
  type SchoolDirectory,
  type SchoolMember,
} from "./service";
import { schoolCurrency, schoolSettingsOf } from "./settings";

/**
 * 105.4 The hosted API's School endpoints (a student and their parents:
 * timetable, attendance, homework, grades, fees and news) and Classroom
 * endpoints (the school's teachers: attendance, homework and its marks,
 * scores, writing to a class), for school apps.
 */

export interface SchoolContext {
  store: DataStore;
  app: App;
  plan: PlanInfo | null | undefined;
  now: Date;
  assetUrl: (assetId: string) => string;
  platformUrl: string;
  /** The media server, for homework files; null: files can't be sent. */
  storage: MediaStorage | null;
  chunkBytes: number;
}

const signIn = () => error(401, "invalid_token", "Your session has ended. Please sign in again.");
const notMember = () => error(403, "not_school_member", "This account isn't one the school added. Ask the school to add your number.");
const notTeacher = () => error(403, "not_teacher", "This account isn't one of the school's teachers.");
const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const noContent: ConnectorResult = { status: 204 };
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (value: string | undefined): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);

const UPLOAD_LIMIT: RateLimitRule = { name: "school_upload", limit: 60, windowSeconds: 3600 };
const WRITE_LIMIT: RateLimitRule = { name: "school_write", limit: 120, windowSeconds: 3600 };
const PAY_LIMIT: RateLimitRule = { name: "school_pay", limit: 20, windowSeconds: 3600 };
/** Attendance can be taken for today and this many days back. */
const ATTENDANCE_DAYS_BACK = 7;
/** The longest attendance period asked for. */
const ATTENDANCE_MAX_DAYS = 400;
const SCHOOL_KINDS = MEDIA_KINDS.filter((k) => k.kind === "image" || k.kind === "pdf");

async function limited(ctx: SchoolContext, request: ConnectorRequest, rule: RateLimitRule): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, rule, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

function paged<T>(request: ConnectorRequest, items: readonly T[]) {
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 100);
  return { page, per_page: perPage, total: items.length, total_pages: Math.max(1, Math.ceil(items.length / perPage)), items: items.slice((page - 1) * perPage, page * perPage) };
}

/** The response for a School or Classroom endpoint, or null when the path isn't one. */
export async function handleSchoolRoute(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult | null> {
  const path = request.path;
  if (path[0] !== "school" && path[0] !== "classroom") return null;
  if (!request.user) return signIn();
  const member = await schoolMemberOf(ctx.store, ctx.app, request.user, request.now);
  const settings = schoolSettingsOf(await ctx.store.getSchoolSettings(ctx.app.id), ctx.app);
  if (path[0] === "classroom") {
    if (!member.teacher) return notTeacher();
    return classroomRoute(ctx, request, member.teacher, settings);
  }
  if (memberRoles(member).length === 0) return notMember();
  const route = `${request.method} /${path.join("/")}`;
  if (route === "GET /school/me") return schoolMe(ctx, request, member);
  if (route === "GET /school/announcements") return announcements(ctx, request, member);
  if (path[1] === "uploads") return uploads(ctx, request);
  if (path[1] === "students") {
    const studentId = idOf(path[2]);
    const students = await visibleStudents(ctx.store, ctx.app, member);
    const student = students.find((s) => s.id === studentId);
    if (!student) return error(404, "not_found", "Student not found.");
    const tail = path.slice(3).join("/");
    if (request.method === "GET" && tail === "timetable") return timetable(ctx, student);
    if (request.method === "GET" && tail === "attendance") return attendance(ctx, request, student, settings);
    if (request.method === "GET" && tail === "homework") return homeworkList(ctx, request, student, settings);
    if (request.method === "PUT" && path[3] === "homework" && path[5] === "submission" && path.length === 6) {
      if (member.student?.id !== student.id) return error(403, "not_student", "Only the student hands in their homework.");
      return submit(ctx, request, student, idOf(path[4]), settings);
    }
    if (request.method === "GET" && tail === "grades") return grades(ctx, student, settings);
    if (request.method === "GET" && tail === "fees") return fees(ctx, student, settings);
    if (request.method === "POST" && path[3] === "fees" && path[5] === "pay" && path.length === 6) return pay(ctx, request, student, idOf(path[4]), settings);
  }
  return error(404, "not_found", "Page not found.");
}

// Students and parents

async function schoolMe(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember): Promise<ConnectorResult> {
  const [students, dir] = await Promise.all([visibleStudents(ctx.store, ctx.app, member), schoolDirectory(ctx.store, ctx.app.id)]);
  const name = member.parent?.name ?? member.student?.name ?? member.teacher?.name ?? request.user!.name;
  return ok({ name, roles: memberRoles(member), students: students.map((s) => studentJson(s, dir, ctx.assetUrl)) });
}

async function timetable(ctx: SchoolContext, student: SchoolPerson): Promise<ConnectorResult> {
  const [dir, periods] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), student.classId !== null ? ctx.store.listSchoolPeriods(ctx.app.id, { classId: student.classId }) : Promise.resolve([])]);
  return ok(timetableJson(periods, dir));
}

async function attendance(ctx: SchoolContext, request: ConnectorRequest, student: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const range = defaultRange(settings, request.now);
  const from = request.query.get("from") ?? range.from;
  const to = request.query.get("to") ?? range.to;
  if (!isDate(from) || !isDate(to) || from > to) return error(400, "invalid_request", "Give the period as two dates, the first not after the second.");
  if (addDays(from, ATTENDANCE_MAX_DAYS) < to) return error(400, "invalid_request", `Ask for up to ${ATTENDANCE_MAX_DAYS} days at a time.`);
  const rows = await ctx.store.listSchoolAttendance(ctx.app.id, { studentId: student.id, from, to });
  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const row of rows) counts[row.status] += 1;
  return ok({ from, to, counts, days: rows.map((r) => ({ date: r.date, status: r.status, note: r.note })) });
}

async function homeworkList(ctx: SchoolContext, request: ConnectorRequest, student: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const status = request.query.get("status") ?? "due";
  if (status !== "due" && status !== "done") return error(400, "invalid_request", "status is due or done.");
  if (student.classId === null) return ok(paged(request, []));
  const [dir, list, submissions] = await Promise.all([
    schoolDirectory(ctx.store, ctx.app.id),
    ctx.store.listSchoolHomework(ctx.app.id, { classId: student.classId }),
    ctx.store.listSchoolSubmissions(ctx.app.id, { studentId: student.id }),
  ]);
  const today = schoolToday(settings, request.now);
  const mine = new Map(submissions.map((s) => [s.homeworkId, s]));
  const handedIn = (id: number) => (mine.get(id)?.submittedAt ?? null) !== null || (mine.get(id)?.mark ?? null) !== null;
  const due = list.filter((h) => !handedIn(h.id) && h.dueOn >= today).sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.id - b.id);
  const done = list.filter((h) => handedIn(h.id) || h.dueOn < today).sort((a, b) => b.dueOn.localeCompare(a.dueOn) || b.id - a.id);
  const chosen = status === "due" ? due : done;
  const page = paged(request, chosen);
  return ok({ ...page, items: page.items.map((h) => homeworkJson(h, mine.get(h.id) ?? null, dir, ctx.platformUrl)) });
}

/** A ready file in the school's Media library, from the app's uploads (never chat files). */
async function schoolFile(ctx: SchoolContext, id: unknown): Promise<SchoolFileRef | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const file = await ctx.store.getMediaFile(ctx.app.id, id);
  if (!file || file.status !== "ready" || file.source === "chat" || (file.kind !== "image" && file.kind !== "pdf")) return null;
  return { fileId: file.id, name: file.name, kind: file.kind };
}

async function submit(ctx: SchoolContext, request: ConnectorRequest, student: SchoolPerson, homeworkId: number | null, settings: SchoolSettings): Promise<ConnectorResult> {
  const homework = homeworkId !== null ? await ctx.store.getSchoolHomework(ctx.app.id, homeworkId) : null;
  if (!homework || homework.classId !== student.classId) return error(404, "not_found", "Homework not found.");
  const wait = await limited(ctx, request, WRITE_LIMIT);
  if (wait) return wait;
  const body = record(request.body);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length > 5000) return error(400, "invalid_request", "The text can be up to 5000 characters.");
  let file: SchoolFileRef | null = null;
  if (body.upload_id !== undefined && body.upload_id !== null) {
    file = await schoolFile(ctx, body.upload_id);
    if (!file) return error(400, "invalid_request", "This file isn't ready. Send it again.");
  }
  if (!text && !file) return error(400, "invalid_request", "Write something or add a photo or a PDF.");
  const [found] = await ctx.store.listSchoolSubmissions(ctx.app.id, { homeworkId: homework.id, studentId: student.id });
  if (found?.mark) return error(409, "already_marked", "Your teacher has marked this homework already.");
  const submission = {
    appId: ctx.app.id,
    homeworkId: homework.id,
    studentId: student.id,
    text,
    file,
    submittedAt: request.now,
    late: schoolToday(settings, request.now) > homework.dueOn,
    mark: null,
    feedback: null,
    markedAt: null,
  };
  await ctx.store.saveSchoolSubmission(submission);
  return ok(homeworkJson(homework, submission, await schoolDirectory(ctx.store, ctx.app.id), ctx.platformUrl));
}

async function grades(ctx: SchoolContext, student: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const dir = await schoolDirectory(ctx.store, ctx.app.id);
  if (student.classId === null) return ok({ subjects: [], upcoming: [] });
  const [assessments, scores] = await Promise.all([ctx.store.listSchoolAssessments(ctx.app.id, { classId: student.classId }), ctx.store.listSchoolScores(ctx.app.id, { studentId: student.id })]);
  const byId = new Map(assessments.map((a) => [a.id, a]));
  const bySubject = new Map<string, { score: number; maxScore: number; row: Record<string, unknown>; date: string }[]>();
  for (const score of scores) {
    const a = byId.get(score.assessmentId);
    if (!a) continue;
    const subject = dir.subjects.get(a.subjectId)?.name ?? "";
    bySubject.set(subject, [
      ...(bySubject.get(subject) ?? []),
      { score: score.score, maxScore: a.maxScore, date: a.date, row: { assessment_id: a.id, title: a.title, kind: a.kind, date: a.date, score: score.score, max_score: a.maxScore, note: score.note } },
    ]);
  }
  const today = schoolToday(settings, ctx.now);
  const upcoming = assessments.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  return ok({
    subjects: [...bySubject.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([subject, rows]) => ({ subject, percent: percentOf(rows), scores: [...rows].sort((a, b) => b.date.localeCompare(a.date)).map((r) => r.row) })),
    upcoming: upcoming.map((a) => assessmentJson(a, 0, dir)),
  });
}

function canTakeCards(ctx: SchoolContext): boolean {
  return paymentsSetUp(ctx.app) && hasFeature(ctx.plan ?? null, "card_payments");
}

async function fees(ctx: SchoolContext, student: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const all = (await ctx.store.listSchoolFees(ctx.app.id, { studentId: student.id })).filter((f) => f.status !== "cancelled");
  const due = all.filter((f) => f.status === "due").sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") || a.id - b.id);
  const paid = all.filter((f) => f.status === "paid").sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0) || b.id - a.id);
  const currency = schoolCurrency(settings);
  return ok({
    currency,
    due_formatted: formatCents(
      due.reduce((sum, f) => sum + f.amountCents, 0),
      currency,
    ),
    can_pay: settings.feesByCard && canTakeCards(ctx),
    items: [...due, ...paid].map((f) => feeJson(f, settings, ctx.platformUrl)),
  });
}

async function pay(ctx: SchoolContext, request: ConnectorRequest, student: SchoolPerson, feeId: number | null, settings: SchoolSettings): Promise<ConnectorResult> {
  const fee = feeId !== null ? await ctx.store.getSchoolFee(ctx.app.id, feeId) : null;
  if (!fee || fee.studentId !== student.id || fee.status === "cancelled") return error(404, "not_found", "Fee not found.");
  if (fee.status === "paid") return error(409, "already_paid", "This fee is paid already.");
  if (!settings.feesByCard || !canTakeCards(ctx)) return error(503, "payments_unavailable", "The school doesn't take fees by card in the app. Please pay at the school.");
  const wait = await limited(ctx, request, PAY_LIMIT);
  if (wait) return wait;
  const link = await feePayLink(ctx.store, ctx.app, fee, student, settings, request.user!.id, ctx.platformUrl, request.now);
  return ok({ payment_url: link.url });
}

async function announcements(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember): Promise<ConnectorResult> {
  const [students, dir, all] = await Promise.all([visibleStudents(ctx.store, ctx.app, member), schoolDirectory(ctx.store, ctx.app.id), ctx.store.listSchoolAnnouncements(ctx.app.id)]);
  const mine = all.filter((a) => announcementFor(a, students, member.teacher?.id ?? null));
  const page = paged(request, mine);
  const school = ctx.app.appName ?? "The school";
  return ok({ ...page, items: page.items.map((a) => announcementJson(a, dir, school)) });
}

// Uploads (into the school's Media library)

async function uploads(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult> {
  const path = request.path;
  if (request.method === "POST" && path.length === 2) return startSchoolUpload(ctx, request);
  const id = path[2] ?? "";
  const file = /^[0-9a-f-]{36}$/.test(id) ? await ctx.store.getMediaFile(ctx.app.id, id) : null;
  const mine = file && (file.kind === "image" || file.kind === "pdf") && file.source !== "chat" ? file : null;
  if (request.method === "POST" && path.length === 4 && path[3] === "resume") {
    if (!mine || mine.status !== "uploading") return error(404, "not_found", "Upload not found.");
    if (!ctx.storage) return error(503, "media_unavailable", "Files can't be sent right now.");
    return ok({ id: mine.id, kind: mine.kind, upload_url: uploadUrl(ctx.storage, mine), chunk_bytes: ctx.chunkBytes, size: mine.sizeBytes });
  }
  if (request.method === "POST" && path.length === 4 && path[3] === "complete") {
    if (!mine) return error(404, "not_found", "Upload not found.");
    if (mine.status === "ready") return noContent;
    if (!ctx.storage) return error(503, "media_unavailable", "Files can't be sent right now.");
    const result = await completeUpload({ store: ctx.store, storage: ctx.storage, now: request.now }, ctx.app.id, mine.id);
    if (!result.ok) return { status: 409, body: { code: "incomplete", message: result.message, ...(result.offset !== undefined ? { offset: result.offset } : {}) } };
    return noContent;
  }
  return error(404, "not_found", "Page not found.");
}

async function startSchoolUpload(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult> {
  if (!ctx.storage) return error(503, "media_unavailable", "Files can't be sent right now.");
  const body = record(request.body);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const size = typeof body.size === "number" ? body.size : Number.NaN;
  const type = typeof body.type === "string" ? body.type : "";
  if (!name || !type) return error(400, "invalid_request", "Send the file's name, size and type.");
  if (!kindOf(type, SCHOOL_KINDS)) return error(400, "invalid_request", "Send a photo (JPEG, PNG or WebP) or a PDF.");
  const wait = await limited(ctx, request, UPLOAD_LIMIT);
  if (wait) return wait;
  const limitBytes = storageLimitBytes(ctx.plan ?? null, await ctx.store.listStoragePacks(ctx.app.id), request.now);
  const started = await startUpload(
    { store: ctx.store, storage: ctx.storage, now: request.now, limitBytes, chunkBytes: ctx.chunkBytes },
    { appId: ctx.app.id, name: `${request.user!.name} · ${name}`.slice(0, 200), size, contentType: type },
  );
  if (!started.ok) {
    if (started.code === "storage_full") return error(413, "storage_full", "There's no room for this file in the school's storage right now.");
    if (started.code === "too_big") return error(413, "too_big", started.message);
    return error(400, "invalid_request", started.message);
  }
  return ok({ id: started.file.id, kind: started.file.kind, upload_url: started.uploadUrl, chunk_bytes: started.chunkBytes, size: started.file.sizeBytes }, 201);
}

// Teachers

interface Teaching {
  dir: SchoolDirectory;
  periods: Awaited<ReturnType<DataStore["listSchoolPeriods"]>>;
  /** The classes the teacher teaches or is the own teacher of. */
  classIds: number[];
}

async function teachingOf(ctx: SchoolContext, teacher: SchoolPerson): Promise<Teaching> {
  const [dir, periods] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), ctx.store.listSchoolPeriods(ctx.app.id)]);
  const classIds = [...dir.classes.values()].filter((c) => teachesClass(teacher.id, c.id, periods, dir.classes)).map((c) => c.id);
  return { dir, periods, classIds };
}

async function classroomRoute(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const path = request.path;
  const route = `${request.method} /${path.join("/")}`;
  const teaching = await teachingOf(ctx, teacher);
  switch (route) {
    case "GET /classroom/me":
      return classroomMe(ctx, teacher, teaching, settings);
    case "GET /classroom/timetable":
      return ok(timetableJson(teaching.periods.filter((p) => p.teacherId === teacher.id), teaching.dir));
    case "GET /classroom/homework":
      return classroomHomework(ctx, request, teacher, teaching);
    case "POST /classroom/homework":
      return newHomework(ctx, request, teacher, teaching, settings);
    case "GET /classroom/assessments":
      return classroomAssessments(ctx, request, teacher, teaching, settings);
    case "POST /classroom/assessments":
      return newAssessment(ctx, request, teacher, teaching);
    case "POST /classroom/announcements":
      return classAnnouncement(ctx, request, teacher, teaching);
  }
  const id = idOf(path[2]);
  if (path[1] === "classes" && id !== null && teaching.classIds.includes(id)) {
    if (route === `GET /classroom/classes/${id}/students`) return classStudents(ctx, teaching, id);
    if (route === `GET /classroom/classes/${id}/attendance`) return classAttendance(ctx, request, teaching, id, settings, request.query.get("date"));
    if (route === `PUT /classroom/classes/${id}/attendance`) return saveAttendance(ctx, request, teacher, teaching, id, settings);
  }
  if (path[1] === "homework" && id !== null) {
    const homework = await ctx.store.getSchoolHomework(ctx.app.id, id);
    if (!homework || !teaching.classIds.includes(homework.classId)) return error(404, "not_found", "Homework not found.");
    if (request.method === "GET" && path.length === 3) return homeworkDetail(ctx, homework, teaching);
    const studentId = idOf(path[4]);
    if (request.method === "PUT" && path[3] === "submissions" && path.length === 5 && studentId !== null) return mark(ctx, request, homework, studentId, teaching);
  }
  if (path[1] === "assessments" && id !== null && path[3] === "scores" && path.length === 4) {
    const assessment = await ctx.store.getSchoolAssessment(ctx.app.id, id);
    if (!assessment || !teaching.classIds.includes(assessment.classId)) return error(404, "not_found", "Assessment not found.");
    if (request.method === "GET") return scores(ctx, assessment, teaching);
    if (request.method === "PUT") return saveScores(ctx, request, assessment, teaching);
  }
  return error(404, "not_found", "Page not found.");
}

async function classroomMe(ctx: SchoolContext, teacher: SchoolPerson, teaching: Teaching, settings: SchoolSettings): Promise<ConnectorResult> {
  const { dir, periods } = teaching;
  const students = await ctx.store.listSchoolPeople(ctx.app.id, { role: "student" });
  const today = isoWeekday(schoolToday(settings, ctx.now));
  return ok({
    name: teacher.name,
    photo_url: teacher.photoAssetId ? ctx.assetUrl(teacher.photoAssetId) : null,
    classes: teaching.classIds
      .map((id) => dir.classes.get(id)!)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const own = c.homeroomTeacherId === teacher.id;
        const subjectIds = [...new Set(periods.filter((p) => p.classId === c.id && (own || p.teacherId === teacher.id)).map((p) => p.subjectId))];
        return {
          id: c.id,
          name: c.name,
          student_count: students.filter((s) => s.active && s.classId === c.id).length,
          subjects: subjectIds
            .map((sid) => dir.subjects.get(sid))
            .filter((s) => s !== undefined)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => ({ id: s.id, name: s.name })),
          class_teacher: own,
        };
      }),
    today: periods
      .filter((p) => p.teacherId === teacher.id && p.weekday === today)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map((p) => lessonJson(p, dir)),
  });
}

async function classStudentsOf(ctx: SchoolContext, classId: number): Promise<SchoolPerson[]> {
  return (await ctx.store.listSchoolPeople(ctx.app.id, { role: "student", classId })).filter((s) => s.active);
}

async function classStudents(ctx: SchoolContext, teaching: Teaching, classId: number): Promise<ConnectorResult> {
  return ok({ items: (await classStudentsOf(ctx, classId)).map((s) => studentJson(s, teaching.dir, ctx.assetUrl)) });
}

async function classAttendance(ctx: SchoolContext, request: ConnectorRequest, teaching: Teaching, classId: number, settings: SchoolSettings, date: string | null): Promise<ConnectorResult> {
  const day = date ?? schoolToday(settings, request.now);
  if (!isDate(day)) return error(400, "invalid_request", "date is a day like 2026-10-29.");
  const [students, rows] = await Promise.all([classStudentsOf(ctx, classId), ctx.store.listSchoolAttendance(ctx.app.id, { classId, from: day, to: day })]);
  const marks = new Map(rows.map((r) => [r.studentId, r]));
  return ok({
    class_id: classId,
    date: day,
    students: students.map((s) => ({ student: studentJson(s, teaching.dir, ctx.assetUrl), status: marks.get(s.id)?.status ?? null, note: marks.get(s.id)?.note ?? null })),
  });
}

async function saveAttendance(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, classId: number, settings: SchoolSettings): Promise<ConnectorResult> {
  const body = record(request.body);
  const date = typeof body.date === "string" ? body.date : "";
  const today = schoolToday(settings, request.now);
  if (!isDate(date)) return error(400, "invalid_request", "date is a day like 2026-10-29.");
  if (date > today || date < addDays(today, -ATTENDANCE_DAYS_BACK)) return error(400, "date_out_of_range", `Attendance can be taken for today and the ${ATTENDANCE_DAYS_BACK} days before.`);
  if (!Array.isArray(body.items) || body.items.length > 200) return error(400, "invalid_request", "Send the students' marks (up to 200).");
  const wait = await limited(ctx, request, WRITE_LIMIT);
  if (wait) return wait;
  const students = new Map((await classStudentsOf(ctx, classId)).map((s) => [s.id, s]));
  const items: { student: SchoolPerson; status: SchoolAttendanceStatus; note: string | null }[] = [];
  for (const raw of body.items) {
    const item = record(raw);
    const student = typeof item.student_id === "number" ? students.get(item.student_id) : undefined;
    if (!student) return error(400, "invalid_request", "A student isn't in this class.");
    const status = item.status;
    if (typeof status !== "string" || !SCHOOL_ATTENDANCE_STATUSES.includes(status as SchoolAttendanceStatus)) return error(400, "invalid_request", "A mark is present, absent, late or excused.");
    const note = typeof item.note === "string" && item.note.trim() ? item.note.trim().slice(0, 300) : null;
    items.push({ student, status: status as SchoolAttendanceStatus, note });
  }
  await takeAttendance({ store: ctx.store, app: ctx.app, now: request.now }, { classId, date, items, takenBy: teacher.id });
  return classAttendance(ctx, request, teaching, classId, settings, date);
}

async function homeworkCounts(ctx: SchoolContext, list: readonly { id: number; classId: number }[]) {
  const [submissions, students] = await Promise.all([
    ctx.store.listSchoolSubmissions(ctx.app.id, { homeworkIds: list.map((h) => h.id) }),
    ctx.store.listSchoolPeople(ctx.app.id, { role: "student" }),
  ]);
  return {
    submissionsOf: (id: number) => submissions.filter((s) => s.homeworkId === id),
    studentsIn: (classId: number) => students.filter((s) => s.active && s.classId === classId).length,
  };
}

async function classroomHomework(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching): Promise<ConnectorResult> {
  const classId = request.query.get("class_id") ? idOf(request.query.get("class_id")!) : null;
  if (request.query.get("class_id") && (classId === null || !teaching.classIds.includes(classId))) return error(404, "not_found", "School class not found.");
  const list = classId !== null ? await ctx.store.listSchoolHomework(ctx.app.id, { classId }) : await ctx.store.listSchoolHomework(ctx.app.id, { teacherId: teacher.id });
  const page = paged(request, list);
  const counts = await homeworkCounts(ctx, page.items);
  return ok({ ...page, items: page.items.map((h) => classroomHomeworkJson(h, counts.submissionsOf(h.id), counts.studentsIn(h.classId), teaching.dir, ctx.platformUrl)) });
}

/** The class and subject of a teacher's input, checked against what they teach. */
function classAndSubject(body: Record<string, unknown>, teacher: SchoolPerson, teaching: Teaching): { classId: number; subjectId: number } | ConnectorResult {
  const classId = typeof body.class_id === "number" ? body.class_id : null;
  const subjectId = typeof body.subject_id === "number" ? body.subject_id : null;
  if (classId === null || !teaching.dir.classes.has(classId)) return error(400, "invalid_request", "Choose a class.");
  if (subjectId === null || !teaching.dir.subjects.has(subjectId)) return error(400, "invalid_request", "Choose a subject.");
  if (!teachesSubject(teacher.id, classId, subjectId, teaching.periods, teaching.dir.classes)) return error(403, "not_your_class", "You don't teach this subject in this class.");
  return { classId, subjectId };
}

async function newHomework(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, settings: SchoolSettings): Promise<ConnectorResult> {
  const body = record(request.body);
  const chosen = classAndSubject(body, teacher, teaching);
  if ("status" in chosen) return chosen;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const dueOn = typeof body.due_on === "string" ? body.due_on : "";
  if (!title || title.length > 200) return error(400, "invalid_request", "Give the homework a title of up to 200 characters.");
  if (text.length > 5000) return error(400, "invalid_request", "The text can be up to 5000 characters.");
  if (!isDate(dueOn) || dueOn < schoolToday(settings, request.now)) return error(400, "invalid_request", "The due date is today or later.");
  const ids = Array.isArray(body.upload_ids) ? body.upload_ids : [];
  if (ids.length > 5) return error(400, "invalid_request", "Attach up to 5 files.");
  const files: SchoolFileRef[] = [];
  for (const id of ids) {
    const file = await schoolFile(ctx, id);
    if (!file) return error(400, "invalid_request", "A file isn't ready. Send it again.");
    files.push(file);
  }
  const wait = await limited(ctx, request, WRITE_LIMIT);
  if (wait) return wait;
  const homework = await giveHomework(
    { store: ctx.store, app: ctx.app, now: request.now },
    { classId: chosen.classId, subjectId: chosen.subjectId, teacherId: teacher.id, title, text, dueOn, files },
    teaching.dir.subjects.get(chosen.subjectId)!.name,
  );
  const counts = await homeworkCounts(ctx, [homework]);
  return ok(classroomHomeworkJson(homework, [], counts.studentsIn(homework.classId), teaching.dir, ctx.platformUrl), 201);
}

async function homeworkDetail(ctx: SchoolContext, homework: Awaited<ReturnType<DataStore["getSchoolHomework"]>> & object, teaching: Teaching): Promise<ConnectorResult> {
  const [students, submissions] = await Promise.all([classStudentsOf(ctx, homework.classId), ctx.store.listSchoolSubmissions(ctx.app.id, { homeworkId: homework.id })]);
  const byStudent = new Map(submissions.map((s) => [s.studentId, s]));
  return ok({
    ...classroomHomeworkJson(homework, submissions, students.length, teaching.dir, ctx.platformUrl),
    submissions: students.map((s) => {
      const found = byStudent.get(s.id);
      return { student: studentJson(s, teaching.dir, ctx.assetUrl), submission: found ? submissionJson(found, ctx.platformUrl) : null };
    }),
  });
}

async function mark(ctx: SchoolContext, request: ConnectorRequest, homework: Parameters<typeof markHomework>[1], studentId: number, teaching: Teaching): Promise<ConnectorResult> {
  const student = (await classStudentsOf(ctx, homework.classId)).find((s) => s.id === studentId);
  if (!student) return error(404, "not_found", "Student not found.");
  const body = record(request.body);
  const value = typeof body.mark === "string" ? body.mark.trim() : "";
  if (!value || value.length > 20) return error(400, "invalid_request", "Write a mark of up to 20 characters.");
  const feedback = typeof body.feedback === "string" && body.feedback.trim() ? body.feedback.trim() : null;
  if (feedback && feedback.length > 1000) return error(400, "invalid_request", "The feedback can be up to 1000 characters.");
  const wait = await limited(ctx, request, WRITE_LIMIT);
  if (wait) return wait;
  await markHomework({ store: ctx.store, app: ctx.app, now: request.now }, homework, student, value, feedback);
  return homeworkDetail(ctx, homework, teaching);
}

async function classroomAssessments(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, settings: SchoolSettings): Promise<ConnectorResult> {
  const classParam = request.query.get("class_id");
  const classId = classParam ? idOf(classParam) : null;
  if (classParam && (classId === null || !teaching.classIds.includes(classId))) return error(404, "not_found", "School class not found.");
  const list = classId !== null ? await ctx.store.listSchoolAssessments(ctx.app.id, { classId }) : await ctx.store.listSchoolAssessments(ctx.app.id, { teacherId: teacher.id });
  const today = schoolToday(settings, request.now);
  const ordered = [...list.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id), ...list.filter((a) => a.date < today)];
  const page = paged(request, ordered);
  const scored = await Promise.all(page.items.map(async (a) => (await ctx.store.listSchoolScores(ctx.app.id, { assessmentId: a.id })).length));
  return ok({ ...page, items: page.items.map((a, i) => assessmentJson(a, scored[i]!, teaching.dir)) });
}

async function newAssessment(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching): Promise<ConnectorResult> {
  const body = record(request.body);
  const chosen = classAndSubject(body, teacher, teaching);
  if ("status" in chosen) return chosen;
  const kind = body.kind;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const maxScore = body.max_score;
  if (typeof kind !== "string" || !SCHOOL_ASSESSMENT_KINDS.includes(kind as SchoolAssessmentKind)) return error(400, "invalid_request", "Choose an exam, a quiz or an assignment.");
  if (!title || title.length > 120) return error(400, "invalid_request", "Give it a title of up to 120 characters.");
  if (!isDate(date)) return error(400, "invalid_request", "Give its date.");
  if (typeof maxScore !== "number" || !Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) return error(400, "invalid_request", "The full mark is more than 0 and up to 1000.");
  const wait = await limited(ctx, request, WRITE_LIMIT);
  if (wait) return wait;
  const assessment = await ctx.store.createSchoolAssessment({
    appId: ctx.app.id,
    classId: chosen.classId,
    subjectId: chosen.subjectId,
    teacherId: teacher.id,
    kind: kind as SchoolAssessmentKind,
    title,
    date,
    maxScore,
    createdAt: request.now,
  });
  return ok(assessmentJson(assessment, 0, teaching.dir), 201);
}

async function scores(ctx: SchoolContext, assessment: Parameters<typeof assessmentJson>[0], teaching: Teaching): Promise<ConnectorResult> {
  const [students, rows] = await Promise.all([classStudentsOf(ctx, assessment.classId), ctx.store.listSchoolScores(ctx.app.id, { assessmentId: assessment.id })]);
  const byStudent = new Map(rows.map((r) => [r.studentId, r]));
  return ok({
    assessment: assessmentJson(assessment, rows.length, teaching.dir),
    students: students.map((s) => ({ student: studentJson(s, teaching.dir, ctx.assetUrl), score: byStudent.get(s.id)?.score ?? null, note: byStudent.get(s.id)?.note ?? null })),
  });
}

async function saveScores(ctx: SchoolContext, request: ConnectorRequest, assessment: Parameters<typeof assessmentJson>[0], teaching: Teaching): Promise<ConnectorResult> {
  const body = record(request.body);
  if (!Array.isArray(body.items) || body.items.length > 200) return error(400, "invalid_request", "Send the students' scores (up to 200).");
  const students = new Map((await classStudentsOf(ctx, assessment.classId)).map((s) => [s.id, s]));
  const rows: { student: SchoolPerson; score: number | null; note: string | null }[] = [];
  for (const raw of body.items) {
    const item = record(raw);
    const student = typeof item.student_id === "number" ? students.get(item.student_id) : undefined;
    if (!student) return error(400, "invalid_request", "A student isn't in this class.");
    const score = item.score;
    if (score !== null && (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > assessment.maxScore)) {
      return error(400, "invalid_request", `A score is from 0 to ${assessment.maxScore}.`);
    }
    const note = typeof item.note === "string" && item.note.trim() ? item.note.trim().slice(0, 300) : null;
    rows.push({ student, score: score as number | null, note });
  }
  const wait = await limited(ctx, request, WRITE_LIMIT);
  if (wait) return wait;
  await enterScores({ store: ctx.store, app: ctx.app, now: request.now }, assessment, rows);
  return scores(ctx, assessment, teaching);
}

async function classAnnouncement(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching): Promise<ConnectorResult> {
  const body = record(request.body);
  const classId = typeof body.class_id === "number" ? body.class_id : null;
  if (classId === null || !teaching.classIds.includes(classId)) return error(403, "not_your_class", "You don't teach this class.");
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!title || title.length > 120) return error(400, "invalid_request", "Give it a title of up to 120 characters.");
  if (!text || text.length > 2000) return error(400, "invalid_request", "Write the message, up to 2000 characters.");
  const wait = await limited(ctx, request, WRITE_LIMIT);
  if (wait) return wait;
  const announcement = await postAnnouncement({ store: ctx.store, app: ctx.app, now: request.now }, { audience: "class", classId, studentId: null, title, body: text, teacherId: teacher.id });
  return ok(announcementJson(announcement, teaching.dir, ctx.app.appName ?? "The school"), 201);
}
