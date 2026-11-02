import { addDays, isDate } from "../bookings/time";
import type { SchoolPerson, SchoolSettings } from "../data/types";
import { error, intParam } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { BEHAVIOUR_LIMITS, behaviourCategories, behaviourJson, behaviourTotals, categoryJson, totalsByStudent } from "./behaviour";
import { calendarOf, calendarView, dayOff, eventJson, examFor, examJson, studentView, worksAtSchool, type CalendarView } from "./calendar";
import { writeBehaviour } from "./flow";
import type { SchoolContext } from "./hosted";
import { schoolDirectory, schoolToday, studentJson, teachesClass, visibleStudents, type SchoolDirectory, type SchoolMember } from "./service";

/**
 * 113.8 The hosted API's calendar, exams and behaviour (docs/api/openapi.yaml,
 * the School and Classroom tags): the calendar each person sees (a
 * parent's per child), a student's exams and behaviour record, and for
 * teachers their classes' exams, the class's behaviour and writing a merit
 * or a note.
 */

const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (value: string | undefined | null): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);

const WRITE_LIMIT: RateLimitRule = { name: "school_behaviour", limit: 200, windowSeconds: 3600 };
/** The longest calendar asked for at once. */
const CALENDAR_MAX_DAYS = 120;
/** A teacher takes back their own note on the day they wrote it. */
const TAKE_BACK_HOURS = 24;

function range(request: ConnectorRequest, settings: SchoolSettings): { from: string; to: string } | ConnectorResult {
  const today = schoolToday(settings, request.now);
  const from = request.query.get("from") ?? `${today.slice(0, 7)}-01`;
  const to = request.query.get("to") ?? addDays(from, 41);
  if (!isDate(from) || !isDate(to) || from > to) return error(400, "invalid_request", "Give the period as two dates, the first not after the second.");
  if (addDays(from, CALENDAR_MAX_DAYS) < to) return error(400, "invalid_request", `Ask for up to ${CALENDAR_MAX_DAYS} days at a time.`);
  return { from, to };
}

function paged<T>(request: ConnectorRequest, items: readonly T[]) {
  const page = intParam(request.query, "page", 1, 10_000);
  const perPage = intParam(request.query, "per_page", 20, 100);
  return { page, per_page: perPage, total: items.length, total_pages: Math.max(1, Math.ceil(items.length / perPage)), items: items.slice((page - 1) * perPage, page * perPage) };
}

/** The classes a teacher teaches or is the own teacher of. */
async function teacherClassIds(ctx: SchoolContext, teacher: SchoolPerson, dir: SchoolDirectory): Promise<number[]> {
  const periods = await ctx.store.listSchoolPeriods(ctx.app.id);
  return [...dir.classes.values()].filter((c) => teachesClass(teacher.id, c.id, periods, dir.classes)).map((c) => c.id);
}

/** `GET /school/calendar`: what the person sees, or one of their students' with `student_id`. */
export async function schoolCalendar(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember, settings: SchoolSettings): Promise<ConnectorResult> {
  const period = range(request, settings);
  if ("status" in period) return period;
  const [dir, students] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), visibleStudents(ctx.store, ctx.app, member)]);
  let view: CalendarView;
  const wanted = request.query.get("student_id");
  if (wanted !== null) {
    const student = students.find((s) => s.id === idOf(wanted));
    if (!student) return error(404, "not_found", "Student not found.");
    view = studentView(student, dir.classes);
  } else {
    const classIds = students.map((s) => s.classId).filter((id): id is number => id !== null);
    if (member.teacher) classIds.push(...(await teacherClassIds(ctx, member.teacher, dir)));
    view = calendarView(dir.classes, classIds, worksAtSchool(member));
  }
  const { events, exams } = await calendarOf(ctx.store, ctx.app.id, view, period);
  return ok({ from: period.from, to: period.to, events: events.map((e) => eventJson(e, dir)), exams: exams.map((e) => examJson(e, dir)) });
}

/** A list of exams as the app shows it: coming first (soonest first), then the last ones done. */
function examLists(exams: Parameters<typeof examJson>[0][], dir: SchoolDirectory, today: string) {
  return {
    upcoming: exams.filter((e) => e.date >= today).map((e) => examJson(e, dir)),
    past: exams
      .filter((e) => e.date < today)
      .reverse()
      .slice(0, 50)
      .map((e) => examJson(e, dir)),
  };
}

/** `GET /school/students/{id}/exams`: the student's published exams. */
export async function studentExams(ctx: SchoolContext, student: SchoolPerson, settings: SchoolSettings): Promise<ConnectorResult> {
  const [dir, all] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), ctx.store.listSchoolExams(ctx.app.id, { published: true })]);
  const view = studentView(student, dir.classes);
  return ok(examLists(all.filter((e) => examFor(e, view)), dir, schoolToday(settings, ctx.now)));
}

/** `GET /school/students/{id}/behaviour`: the student's record and points. */
export async function studentBehaviour(ctx: SchoolContext, request: ConnectorRequest, student: SchoolPerson): Promise<ConnectorResult> {
  const [dir, notes] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), ctx.store.listSchoolBehaviour(ctx.app.id, { studentId: student.id })]);
  const page = paged(request, notes);
  return ok({ ...page, ...totalsJson(behaviourTotals(notes)), items: page.items.map((n) => behaviourJson(n, dir)) });
}

const totalsJson = (t: ReturnType<typeof behaviourTotals>) => ({ points: t.points, positive_count: t.positive, negative_count: t.negative });

// Teachers

/** The Classroom's calendar, exams and behaviour routes; null when the path isn't one. */
export async function classroomLifeRoute(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, classIds: readonly number[], settings: SchoolSettings): Promise<ConnectorResult | null> {
  const path = request.path;
  const route = `${request.method} /${path.join("/")}`;
  if (route === "GET /classroom/exams") return classroomExams(ctx, request, classIds, settings);
  if (route === "GET /classroom/behaviour/categories") return ok({ items: (await behaviourCategories(ctx.store, ctx.app, request.now)).filter((c) => c.active).map(categoryJson) });
  if (route === "POST /classroom/behaviour") return newBehaviour(ctx, request, teacher, classIds);
  if (request.method === "DELETE" && path[1] === "behaviour" && path.length === 3) return takeBack(ctx, request, teacher, idOf(path[2]));
  const id = idOf(path[2]);
  if (path[1] === "classes" && id !== null && classIds.includes(id) && route === `GET /classroom/classes/${id}/behaviour`) return classBehaviour(ctx, request, id);
  return null;
}

async function classroomExams(ctx: SchoolContext, request: ConnectorRequest, classIds: readonly number[], settings: SchoolSettings): Promise<ConnectorResult> {
  const classParam = request.query.get("class_id");
  const classId = classParam ? idOf(classParam) : null;
  if (classParam && (classId === null || !classIds.includes(classId))) return error(404, "not_found", "School class not found.");
  const [dir, all] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), ctx.store.listSchoolExams(ctx.app.id, { published: true })]);
  const view = calendarView(dir.classes, classId !== null ? [classId] : classIds, true);
  return ok(examLists(all.filter((e) => examFor(e, view)), dir, schoolToday(settings, ctx.now)));
}

async function classStudentsOf(ctx: SchoolContext, classId: number): Promise<SchoolPerson[]> {
  return (await ctx.store.listSchoolPeople(ctx.app.id, { role: "student", classId })).filter((s) => s.active);
}

/** `GET /classroom/classes/{id}/behaviour`: each student's points, and the class's latest notes (a student's with `student_id`). */
async function classBehaviour(ctx: SchoolContext, request: ConnectorRequest, classId: number): Promise<ConnectorResult> {
  const [dir, students] = await Promise.all([schoolDirectory(ctx.store, ctx.app.id), classStudentsOf(ctx, classId)]);
  const notes = await ctx.store.listSchoolBehaviour(ctx.app.id, { studentIds: students.map((s) => s.id) });
  const wanted = request.query.get("student_id");
  const studentId = wanted !== null ? idOf(wanted) : null;
  if (wanted !== null && !students.some((s) => s.id === studentId)) return error(404, "not_found", "Student not found.");
  const recent = (studentId !== null ? notes.filter((n) => n.studentId === studentId) : notes).slice(0, 50);
  return ok({
    class_id: classId,
    class_name: dir.classes.get(classId)?.name ?? "",
    students: totalsByStudent(students, notes).map((row) => ({ student: studentJson(row.student, dir, ctx.assetUrl), ...totalsJson(row) })),
    recent: recent.map((n) => behaviourJson(n, dir)),
  });
}

async function limited(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, WRITE_LIMIT, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

/** `POST /classroom/behaviour`: a merit or a note on a student of one of the teacher's classes. */
async function newBehaviour(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, classIds: readonly number[]): Promise<ConnectorResult> {
  const body = record(request.body);
  const student = typeof body.student_id === "number" ? await ctx.store.getSchoolPerson(ctx.app.id, body.student_id) : null;
  if (!student || student.role !== "student" || !student.active || student.classId === null || !classIds.includes(student.classId)) return error(403, "not_your_class", "This student isn't in one of your classes.");
  const categories = (await behaviourCategories(ctx.store, ctx.app, request.now)).filter((c) => c.active);
  const category = categories.find((c) => c.id === body.category_id);
  if (!category) return error(400, "invalid_request", "Choose one of the school's categories.");
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  if (note && note.length > BEHAVIOUR_LIMITS.note) return error(400, "invalid_request", `The note can be up to ${BEHAVIOUR_LIMITS.note} characters.`);
  const wait = await limited(ctx, request);
  if (wait) return wait;
  const made = await writeBehaviour({ store: ctx.store, app: ctx.app, now: request.now }, { student, category, note, teacherId: teacher.id });
  return ok(behaviourJson(made, await schoolDirectory(ctx.store, ctx.app.id)), 201);
}

/** `DELETE /classroom/behaviour/{id}`: the teacher takes back their own note, within a day. */
async function takeBack(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson, id: number | null): Promise<ConnectorResult> {
  const note = id !== null ? await ctx.store.getSchoolBehaviour(ctx.app.id, id) : null;
  if (!note || note.teacherId !== teacher.id) return error(404, "not_found", "Note not found.");
  if (request.now.getTime() - note.createdAt.getTime() > TAKE_BACK_HOURS * 3_600_000) return error(409, "too_late", "A note can be taken back on the day it was written. Ask the school.");
  await ctx.store.deleteSchoolBehaviour(ctx.app.id, note.id);
  return { status: 204 };
}

/** The day off a class's register falls on, for the Classroom's attendance. */
export async function registerDayOff(ctx: SchoolContext, classId: number, date: string) {
  const klass = (await ctx.store.listSchoolClasses(ctx.app.id)).find((c) => c.id === classId) ?? null;
  const off = await dayOff(ctx.store, ctx.app.id, date, klass);
  return off ? { id: off.id, title: off.title } : null;
}
