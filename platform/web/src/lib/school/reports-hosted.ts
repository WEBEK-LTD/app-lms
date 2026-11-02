import { addDays, isDate } from "../bookings/time";
import type { DataStore } from "../data/store";
import { SCHOOL_REPORT_STATUSES, type SchoolPerson, type SchoolReport, type SchoolReportStatus, type SchoolSettings } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import type { SchoolContext } from "./hosted";
import { reportPeriod } from "./report-cards";
import { NO_MEMBER, schoolDirectory, schoolToday, teachesSubject, visibleStudents, type SchoolDirectory, type SchoolMember } from "./service";
import { classProgress, SYLLABUS_LIMITS, type SubjectProgress } from "./syllabus";
import { checkAnswers, reportPeriodOf, reportTemplateJson, sendReport, sharedReportJson, teacherReportJson, REPORT_LIMITS } from "./teacher-reports";

/**
 * 113.5 The hosted API's syllabus and reports: a teacher's classes' progress
 * through the syllabus (a topic marked covered on a day, with a note), and
 * their reports to the administration on the school's templates (Classroom
 * tag); the reports the school shared with a student's parents (School tag).
 */

interface Teaching {
  dir: SchoolDirectory;
  periods: Awaited<ReturnType<DataStore["listSchoolPeriods"]>>;
  classIds: number[];
}

const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (value: string | undefined): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);
const WRITE_LIMIT: RateLimitRule = { name: "school_report_write", limit: 200, windowSeconds: 3600 };
/** A topic can be marked covered for today and this many days back. */
const COVERED_DAYS_BACK = 365;

async function limited(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, WRITE_LIMIT, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

/** The response for a syllabus or reports path of the Classroom, or null when the path isn't one. */
export async function classroomReportsRoute(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, settings: SchoolSettings): Promise<ConnectorResult | null> {
  const path = request.path;
  const route = `${request.method} /${path.join("/")}`;
  if (path[1] === "classes" && path[3] === "syllabus") {
    const classId = idOf(path[2]);
    if (classId === null || !teaching.classIds.includes(classId)) return error(404, "not_found", "School class not found.");
    if (route === `GET /classroom/classes/${classId}/syllabus`) return syllabus(ctx, teacher, teaching, classId, settings);
    const topicId = idOf(path[4]);
    if (path.length === 5 && topicId !== null && (request.method === "PUT" || request.method === "DELETE")) return markTopic(ctx, request, teacher, teaching, classId, topicId, settings);
    return error(404, "not_found", "Page not found.");
  }
  if (route === "GET /classroom/report-templates") {
    return ok({ items: (await ctx.store.listSchoolReportTemplates(ctx.app.id)).map(reportTemplateJson) });
  }
  if (path[1] !== "reports") return null;
  if (route === "GET /classroom/reports") return listReports(ctx, request, teacher, teaching);
  if (route === "POST /classroom/reports") return newReport(ctx, request, teacher, teaching, settings);
  const id = idOf(path[2]);
  const report = id !== null ? await ctx.store.getSchoolReport(ctx.app.id, id) : null;
  if (!report || report.teacherId !== teacher.id) return error(404, "not_found", "Report not found.");
  if (path.length === 3 && request.method === "GET") return ok(teacherReportJson(report, teaching.dir, ctx.assetUrl));
  if (path.length === 3 && request.method === "PUT") return editReport(ctx, request, teacher, teaching, report);
  if (path.length === 3 && request.method === "DELETE") {
    if (report.status !== "draft") return error(409, "report_sent", "Only a draft can be deleted.");
    await ctx.store.deleteSchoolReport(ctx.app.id, report.id);
    return { status: 204 };
  }
  if (path.length === 4 && path[3] === "send" && request.method === "POST") return send(ctx, request, teacher, teaching, report);
  return error(404, "not_found", "Page not found.");
}

// The syllabus

function topicJson(t: SubjectProgress["units"][number]["topics"][number]) {
  return { id: t.topic.id, title: t.topic.title, starts_on: t.topic.startsOn, ends_on: t.topic.endsOn, due: t.due, now: t.now, covered_on: t.covered?.coveredOn ?? null, note: t.covered?.note ?? null };
}

export function subjectProgressJson(p: SubjectProgress) {
  return {
    subject_id: p.subject.id,
    subject: p.subject.name,
    total: p.total,
    covered: p.covered,
    due: p.due,
    percent: p.percent,
    planned_percent: p.plannedPercent,
    behind_by: p.behindBy,
    status: p.status,
    planned_topic: p.planned ? { id: p.planned.id, title: p.planned.title } : null,
    units: p.units.map((u) => ({ id: u.unit.id, title: u.unit.title, topics: u.topics.map(topicJson) })),
  };
}

/** The subjects of the class the teacher teaches: their syllabus and the class's progress. */
async function syllabus(ctx: SchoolContext, teacher: SchoolPerson, teaching: Teaching, classId: number, settings: SchoolSettings): Promise<ConnectorResult> {
  const klass = teaching.dir.classes.get(classId)!;
  const today = schoolToday(settings, ctx.now);
  const taught = [...teaching.dir.subjects.keys()].filter((s) => teachesSubject(teacher.id, classId, s, teaching.periods, teaching.dir.classes));
  const progress = await classProgress(ctx.store, ctx.app, klass, today, taught);
  return ok({ class_id: klass.id, class_name: klass.name, grade: progress.grade, today, subjects: progress.subjects.map(subjectProgressJson) });
}

async function markTopic(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, classId: number, topicId: number, settings: SchoolSettings): Promise<ConnectorResult> {
  const klass = teaching.dir.classes.get(classId)!;
  const [topic] = await ctx.store.listSchoolSyllabusTopics(ctx.app.id, { ids: [topicId] });
  const [unit] = topic ? (await ctx.store.listSchoolSyllabusUnits(ctx.app.id)).filter((u) => u.id === topic.unitId) : [];
  const today = schoolToday(settings, request.now);
  const progress = unit ? await classProgress(ctx.store, ctx.app, klass, today, [unit.subjectId]) : null;
  if (!topic || !unit || !progress?.subjects.some((s) => s.units.some((u) => u.unit.id === unit.id))) return error(404, "not_found", "Topic not found.");
  if (!teachesSubject(teacher.id, classId, unit.subjectId, teaching.periods, teaching.dir.classes)) return error(403, "not_your_class", "You don't teach this subject in this class.");
  const wait = await limited(ctx, request);
  if (wait) return wait;
  if (request.method === "DELETE") {
    await ctx.store.deleteSchoolTopicProgress(ctx.app.id, classId, topic.id);
  } else {
    const body = record(request.body);
    const day = typeof body.covered_on === "string" ? body.covered_on : today;
    if (!isDate(day) || day > today || day < addDays(today, -COVERED_DAYS_BACK)) return error(400, "invalid_request", "The day it was covered is today or a day in the last year.");
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    if (note && note.length > SYLLABUS_LIMITS.note) return error(400, "invalid_request", `The note can be up to ${SYLLABUS_LIMITS.note} characters.`);
    await ctx.store.saveSchoolTopicProgress({ appId: ctx.app.id, classId, topicId: topic.id, coveredOn: day, note, teacherId: teacher.id, updatedAt: request.now });
  }
  return syllabus(ctx, teacher, teaching, classId, settings);
}

// The teacher's reports

const STATUS_WORDS = SCHOOL_REPORT_STATUSES as readonly string[];

async function listReports(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching): Promise<ConnectorResult> {
  const status = request.query.get("status");
  if (status && !STATUS_WORDS.includes(status)) return error(400, "invalid_request", "status is draft, sent, returned or approved.");
  const studentParam = request.query.get("student_id");
  const classParam = request.query.get("class_id");
  const studentId = studentParam ? idOf(studentParam) : undefined;
  const classId = classParam ? idOf(classParam) : undefined;
  if (studentId === null || classId === null) return error(400, "invalid_request", "student_id and class_id are numbers.");
  const all = await ctx.store.listSchoolReports(ctx.app.id, { teacherId: teacher.id, ...(status ? { statuses: [status as SchoolReportStatus] } : {}), ...(studentId !== undefined ? { studentId } : {}), ...(classId !== undefined ? { classId } : {}) });
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 100);
  return ok({
    page,
    per_page: perPage,
    total: all.length,
    total_pages: Math.max(1, Math.ceil(all.length / perPage)),
    items: all.slice((page - 1) * perPage, page * perPage).map((r) => teacherReportJson(r, teaching.dir, ctx.assetUrl)),
  });
}

/** The subject and period of a teacher's input, checked against the class; a class report's period is the term's when not given. */
function subjectAndPeriod(
  body: Record<string, unknown>,
  teacher: SchoolPerson,
  teaching: Teaching,
  classId: number | null,
  fallback: { from: string; to: string } | null,
): { subjectId: number | null; period: { from: string; to: string } | null } | ConnectorResult {
  let subjectId: number | null = null;
  if (body.subject_id !== undefined && body.subject_id !== null) {
    if (typeof body.subject_id !== "number" || !teaching.dir.subjects.has(body.subject_id)) return error(400, "invalid_request", "Choose a subject.");
    if (classId === null || !teachesSubject(teacher.id, classId, body.subject_id, teaching.periods, teaching.dir.classes)) return error(403, "not_your_class", "You don't teach this subject in this class.");
    subjectId = body.subject_id;
  }
  const period = reportPeriodOf(body.period_from, body.period_to);
  if (period === "invalid") return error(400, "invalid_request", "Give the period as two dates, the first not after the second.");
  return { subjectId, period: period ?? fallback };
}

async function newReport(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, settings: SchoolSettings): Promise<ConnectorResult> {
  const body = record(request.body);
  const template = typeof body.template_id === "number" ? await ctx.store.getSchoolReportTemplate(ctx.app.id, body.template_id) : null;
  if (!template) return error(400, "invalid_request", "Choose one of the school's report templates.");
  let studentId: number | null = null;
  let classId: number | null = null;
  if (template.kind === "student") {
    const student = typeof body.student_id === "number" ? teaching.dir.people.get(body.student_id) : undefined;
    if (!student || student.role !== "student" || !student.active) return error(400, "invalid_request", "Choose a student.");
    if (student.classId === null || !teaching.classIds.includes(student.classId)) return error(403, "not_your_class", "This student isn't in a class you teach.");
    studentId = student.id;
    classId = student.classId;
  } else {
    if (typeof body.class_id !== "number" || !teaching.dir.classes.has(body.class_id)) return error(400, "invalid_request", "Choose a class.");
    if (!teaching.classIds.includes(body.class_id)) return error(403, "not_your_class", "You don't teach this class.");
    classId = body.class_id;
  }
  const term = template.kind === "class" ? reportPeriod(settings, {}, schoolToday(settings, request.now)) : null;
  const chosen = subjectAndPeriod(body, teacher, teaching, classId, term ? { from: term.from, to: term.to } : null);
  if ("status" in chosen) return chosen;
  const answers = checkAnswers(template.fields, body.answers, false);
  if (!answers.ok) return error(400, "invalid_request", answers.message);
  const wait = await limited(ctx, request);
  if (wait) return wait;
  const report = await ctx.store.createSchoolReport({
    appId: ctx.app.id,
    kind: template.kind,
    templateId: template.id,
    templateName: template.name,
    fields: template.fields,
    answers: answers.answers,
    teacherId: teacher.id,
    teacherName: teacher.name,
    studentId,
    classId,
    subjectId: chosen.subjectId,
    periodFrom: chosen.period?.from ?? null,
    periodTo: chosen.period?.to ?? null,
    status: "draft",
    comments: [],
    sentAt: null,
    readAt: null,
    reviewedAt: null,
    sharedAt: null,
    createdAt: request.now,
    updatedAt: request.now,
  });
  return ok(teacherReportJson(report, teaching.dir, ctx.assetUrl), 201);
}

const locked = () => error(409, "report_sent", "This report is with the school. You can change it once they send it back.");

async function editReport(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, report: SchoolReport): Promise<ConnectorResult> {
  if (report.status !== "draft" && report.status !== "returned") return locked();
  const body = record(request.body);
  const chosen = subjectAndPeriod(
    { subject_id: body.subject_id === undefined ? report.subjectId : body.subject_id, period_from: body.period_from ?? report.periodFrom, period_to: body.period_to ?? report.periodTo },
    teacher,
    teaching,
    report.classId,
    null,
  );
  if ("status" in chosen) return chosen;
  const answers = checkAnswers(report.fields, body.answers === undefined ? report.answers : body.answers, false);
  if (!answers.ok) return error(400, "invalid_request", answers.message);
  const wait = await limited(ctx, request);
  if (wait) return wait;
  const patch = { answers: answers.answers, subjectId: chosen.subjectId, periodFrom: chosen.period?.from ?? null, periodTo: chosen.period?.to ?? null, updatedAt: request.now };
  if (!(await ctx.store.updateSchoolReport(ctx.app.id, report.id, patch, { statuses: ["draft", "returned"] }))) return locked();
  return ok(teacherReportJson({ ...report, ...patch }, teaching.dir, ctx.assetUrl));
}

async function send(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, teaching: Teaching, report: SchoolReport): Promise<ConnectorResult> {
  if (report.status !== "draft" && report.status !== "returned") return locked();
  const body = record(request.body);
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  if (note && note.length > REPORT_LIMITS.comment) return error(400, "invalid_request", `The note can be up to ${REPORT_LIMITS.comment} characters.`);
  const complete = checkAnswers(report.fields, report.answers, true);
  if (!complete.ok) return error(400, "incomplete_report", complete.message);
  const wait = await limited(ctx, request);
  if (wait) return wait;
  const sent = await sendReport({ store: ctx.store, app: ctx.app, now: request.now }, report, teacher, note);
  if (!sent) return locked();
  return ok(teacherReportJson(sent, teaching.dir, ctx.assetUrl));
}

// The parents' part

/** The reports the school shared with a student's parents, newest first: for the student's parents only. */
export async function studentReports(ctx: SchoolContext, member: SchoolMember, student: SchoolPerson): Promise<ConnectorResult> {
  const children = member.parent ? await visibleStudents(ctx.store, ctx.app, { ...NO_MEMBER, parent: member.parent }) : [];
  if (!children.some((c) => c.id === student.id)) return error(403, "not_parent", "The school shares these with the student's parents.");
  const [dir, reports] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), ctx.store.listSchoolReports(ctx.app.id, { studentId: student.id, statuses: ["approved"] })]);
  const shared = reports.filter((r) => r.sharedAt !== null).sort((a, b) => b.sharedAt!.getTime() - a.sharedAt!.getTime() || b.id - a.id);
  return ok({ items: shared.map((r) => sharedReportJson(r, dir)) });
}
