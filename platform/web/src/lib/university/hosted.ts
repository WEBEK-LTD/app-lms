import { addDays, isDate } from "../bookings/time";
import { SCHOOL_ATTENDANCE_STATUSES, type SchoolAttendanceStatus, type SchoolPerson, type UniSection, type UniTerm } from "../data/types";
import { error } from "../hosted/connectors/common";
import type { ConnectorRequest, ConnectorResult } from "../hosted/connectors/types";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import type { SchoolContext } from "../school/hosted";
import { schoolToday, studentJson, type SchoolMember } from "../school/service";
import { schoolSettingsOf } from "../school/settings";
import { addSection, decideRegistration, dropSection, publishResults, saveGrades, submitRegistration, takeLectureAttendance, type FlowResult, type GradeInput } from "./flow";
import { planJson, programJson, registrationJson, resultsJson, scaleJson, sectionJson, termJson, uniTimetableJson } from "./json";
import { academicRecord, registrationView, seatsTaken, uniData, type AcademicRecord, type UniData } from "./records";
import { holdsSeat } from "./rules";
import { currentTerm, registrationTerm, universityOn } from "./settings";
import { transcriptCode, transcriptPdfUrl } from "./transcript";

/**
 * 113.9 The hosted API's University endpoints, for schools in university
 * mode: a student's (and their parents') program, registration for the
 * term, timetable, results with the GPA, transcript and study plan
 * (`/school/students/{id}/university…`), and a lecturer's sections,
 * lecture attendance, grades and published results, and the registrations
 * of the students they advise (`/classroom/university…`).
 */

const ok = (body: unknown, status = 200): ConnectorResult => ({ status, body });
const record = (value: unknown): Record<string, unknown> => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const idOf = (value: string | null | undefined): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);
const notUniversity = () => error(404, "not_university", "This school isn't a university.");
const fromFlow = (result: Exclude<FlowResult<unknown>, { ok: true }>) => error(result.status, result.code, result.message);

const WRITE_LIMIT: RateLimitRule = { name: "uni_write", limit: 200, windowSeconds: 3600 };
/** A lecture's attendance can be taken for today and this many days back. */
const ATTENDANCE_DAYS_BACK = 14;

async function limited(ctx: SchoolContext, request: ConnectorRequest): Promise<ConnectorResult | null> {
  const result = await hitRateLimit(ctx.store, WRITE_LIMIT, `${ctx.app.id}:${request.user!.id}`, request.now);
  if (result.allowed) return null;
  return { status: 429, body: { code: "rate_limited", message: "You've done this many times in a short while. Please try again later.", retry_after_seconds: result.retryAfter } };
}

interface Uni {
  data: UniData;
  today: string;
  people: Map<number, SchoolPerson>;
}

async function uniOf(ctx: SchoolContext, request: ConnectorRequest): Promise<Uni | null> {
  const data = await uniData(ctx.store, ctx.app.id);
  if (!universityOn(ctx.app, ctx.plan, data.settings)) return null;
  const settings = schoolSettingsOf(await ctx.store.getSchoolSettings(ctx.app.id), ctx.app);
  const people = new Map((await ctx.store.listSchoolPeople(ctx.app.id)).map((p) => [p.id, p]));
  return { data, today: schoolToday(settings, request.now), people };
}

/** The term in `?term_id=`, else `fallback`. */
function termFrom(request: ConnectorRequest, uni: Uni, fallback: UniTerm | null): UniTerm | null | "unknown" {
  const raw = request.query.get("term_id") ?? (typeof record(request.body).term_id === "number" ? String(record(request.body).term_id) : null);
  if (raw === null) return fallback;
  return uni.data.termById.get(idOf(raw) ?? -1) ?? "unknown";
}

/** Terms a student still registers in or sees: not ended, the soonest first. */
const openTerms = (uni: Uni) => [...uni.data.terms].filter((t) => t.endsOn >= uni.today || t.dropUntil >= uni.today).sort((a, b) => a.startsOn.localeCompare(b.startsOn));

// Students and parents

/** `/school/students/{id}/university…`: the student is one the signed-in person sees. */
export async function universityStudentRoute(ctx: SchoolContext, request: ConnectorRequest, member: SchoolMember, student: SchoolPerson): Promise<ConnectorResult> {
  const uni = await uniOf(ctx, request);
  if (!uni) return notUniversity();
  const tail = request.path.slice(4).join("/");
  const route = `${request.method} ${tail}`;
  const own = member.student?.id === student.id;
  const rec = await academicRecord(ctx.store, uni.data, student);
  if (route === "GET ") return overview(ctx, uni, rec);
  if (route === "GET timetable") {
    const term = termFrom(request, uni, currentTerm(uni.data.terms, uni.data.settings, uni.today));
    if (term === "unknown") return error(404, "not_found", "Term not found.");
    if (!term) return ok({ term: null, days: [] });
    return ok(uniTimetableJson(rec, term, uni.people));
  }
  if (route === "GET results") return ok(resultsJson(rec, uni.data));
  if (route === "GET transcript") {
    const code = ctx.secret ? transcriptCode(ctx.secret, ctx.app.id, student.id, request.now) : null;
    return ok({
      student: studentJson(student, { classes: new Map() }, ctx.assetUrl),
      program: rec.program ? programJson(rec.program, uni.data) : null,
      ...resultsJson(rec, uni.data),
      pdf_url: code ? transcriptPdfUrl(ctx.platformUrl, ctx.app.id, code) : null,
    });
  }
  if (route === "GET plan") return ok(planJson(rec, uni.data));
  if (tail === "registration" || tail.startsWith("registration/")) {
    const term = termFrom(request, uni, registrationTerm(uni.data.terms, uni.data.settings, uni.today));
    if (term === "unknown") return error(404, "not_found", "Term not found.");
    if (!term) return error(404, "no_term", "The university has no term to register in yet.");
    if (route === "GET registration") return registration(ctx, uni, rec, term);
    if (!own) return error(403, "not_student", "Only the student changes their registration.");
    const wait = await limited(ctx, request);
    if (wait) return wait;
    const deps = { store: ctx.store, app: ctx.app, now: request.now, data: uni.data };
    if (route === "POST registration/sections") {
      const sectionId = record(request.body).section_id;
      const section = typeof sectionId === "number" ? await ctx.store.getUniSection(ctx.app.id, sectionId) : null;
      if (!section || section.termId !== term.id) return error(404, "not_found", "Section not found.");
      const result = await addSection(deps, { record: rec, term, section, by: "student", today: uni.today });
      if (!result.ok) return fromFlow(result);
      return registration(ctx, uni, await academicRecord(ctx.store, uni.data, student), term);
    }
    const sectionId = idOf(request.path[6]);
    if (request.method === "DELETE" && request.path[5] === "sections" && request.path.length === 7 && sectionId !== null) {
      const result = await dropSection(deps, { record: rec, term, sectionId, by: "student", today: uni.today });
      if (!result.ok) return fromFlow(result);
      return registration(ctx, uni, await academicRecord(ctx.store, uni.data, student), term);
    }
    if (route === "POST registration/submit") {
      const result = await submitRegistration(deps, { record: rec, term, today: uni.today });
      if (!result.ok) return fromFlow(result);
      return registration(ctx, uni, rec, term);
    }
  }
  return error(404, "not_found", "Page not found.");
}

async function overview(ctx: SchoolContext, uni: Uni, rec: AcademicRecord): Promise<ConnectorResult> {
  const term = currentTerm(uni.data.terms, uni.data.settings, uni.today);
  const regTerm = registrationTerm(uni.data.terms, uni.data.settings, uni.today);
  const view = regTerm ? await registrationView(ctx.store, uni.data, rec, regTerm, uni.today) : null;
  const advisor = rec.uni?.advisorId ? (uni.people.get(rec.uni.advisorId) ?? null) : null;
  return ok({
    student: studentJson(rec.student, { classes: new Map() }, ctx.assetUrl),
    program: rec.program ? programJson(rec.program, uni.data) : null,
    advisor: advisor ? { id: advisor.id, name: advisor.name } : null,
    start_year: rec.uni?.startYear ?? null,
    gpa: rec.standing.gpa,
    credits_earned: rec.standing.creditsEarned,
    current_term: term ? termJson(term) : null,
    registration: view ? { term: termJson(view.term), status: view.registration?.status ?? "draft", phase: view.phase, credits: view.credits } : null,
    scale: scaleJson(uni.data.settings.scale),
  });
}

async function registration(ctx: SchoolContext, uni: Uni, rec: AcademicRecord, term: UniTerm): Promise<ConnectorResult> {
  const view = await registrationView(ctx.store, uni.data, rec, term, uni.today);
  return ok(registrationJson(view, uni.people, openTerms(uni)));
}

// Lecturers and advisors

/** `/classroom/university…`, for the school's teachers: their sections and the students they advise. */
export async function universityClassroomRoute(ctx: SchoolContext, request: ConnectorRequest, teacher: SchoolPerson): Promise<ConnectorResult> {
  const uni = await uniOf(ctx, request);
  if (!uni) return notUniversity();
  const path = request.path;
  const route = `${request.method} /${path.join("/")}`;
  const fallback = currentTerm(uni.data.terms, uni.data.settings, uni.today);
  if (route === "GET /classroom/university") {
    const term = termFrom(request, uni, fallback);
    if (term === "unknown") return error(404, "not_found", "Term not found.");
    return lecturerHome(ctx, uni, teacher, term);
  }
  const id = idOf(path[3]);
  if (path[2] === "sections" && id !== null) {
    const section = await ctx.store.getUniSection(ctx.app.id, id);
    if (!section || section.lecturerId !== teacher.id) return error(404, "not_found", "Section not found.");
    const tail = path.slice(4).join("/");
    if (request.method === "GET" && tail === "") return sectionDetail(ctx, uni, section);
    if (tail === "attendance" && request.method === "GET") return sectionAttendance(ctx, uni, section, request.query.get("date") ?? uni.today);
    if (tail === "attendance" && request.method === "PUT") return saveSectionAttendance(ctx, request, uni, section, teacher);
    if (tail === "grades" && request.method === "PUT") return saveSectionGrades(ctx, request, uni, section);
    if (tail === "publish" && request.method === "POST") {
      const wait = await limited(ctx, request);
      if (wait) return wait;
      const result = await publishResults({ store: ctx.store, app: ctx.app, now: request.now, data: uni.data }, section);
      if (!result.ok) return fromFlow(result);
      return sectionDetail(ctx, uni, result.value);
    }
  }
  if (path[2] === "advisees") {
    const term = termFrom(request, uni, registrationTerm(uni.data.terms, uni.data.settings, uni.today));
    if (term === "unknown") return error(404, "not_found", "Term not found.");
    const advisees = await ctx.store.listUniStudents(ctx.app.id, { advisorId: teacher.id });
    if (route === "GET /classroom/university/advisees") return adviseeList(ctx, uni, advisees.map((a) => a.studentId), term);
    const studentId = idOf(path[3]);
    const student = studentId !== null && advisees.some((a) => a.studentId === studentId) ? uni.people.get(studentId) : undefined;
    if (!student || student.role !== "student" || !term) return error(404, "not_found", "Student not found.");
    const tail = path.slice(4).join("/");
    if (request.method === "GET" && tail === "") return adviseeDetail(ctx, uni, student, term);
    if (request.method === "POST" && (tail === "approve" || tail === "return")) {
      const note = typeof record(request.body).note === "string" ? (record(request.body).note as string).trim() : "";
      if (note.length > 500) return error(400, "invalid_request", "The note can be up to 500 characters.");
      const wait = await limited(ctx, request);
      if (wait) return wait;
      const rec = await academicRecord(ctx.store, uni.data, student);
      const result = await decideRegistration({ store: ctx.store, app: ctx.app, now: request.now, data: uni.data }, { record: rec, term, approve: tail === "approve", note: note || null, by: teacher.id });
      if (!result.ok) return fromFlow(result);
      return adviseeDetail(ctx, uni, student, term);
    }
  }
  return error(404, "not_found", "Page not found.");
}

async function lecturerHome(ctx: SchoolContext, uni: Uni, teacher: SchoolPerson, term: UniTerm | null): Promise<ConnectorResult> {
  const sections = term ? await ctx.store.listUniSections(ctx.app.id, { termId: term.id, lecturerId: teacher.id }) : [];
  const taken = term ? await seatsTaken(ctx.store, ctx.app.id, term.id) : new Map<number, number>();
  const advisees = await ctx.store.listUniStudents(ctx.app.id, { advisorId: teacher.id });
  const regTerm = registrationTerm(uni.data.terms, uni.data.settings, uni.today);
  const waiting = regTerm ? (await ctx.store.listUniRegistrations(ctx.app.id, { termId: regTerm.id, status: "submitted", studentIds: advisees.map((a) => a.studentId) })).length : 0;
  return ok({
    name: teacher.name,
    term: term ? termJson(term) : null,
    terms: [...uni.data.terms].sort((a, b) => a.startsOn.localeCompare(b.startsOn)).map(termJson),
    sections: sections
      .map((s) => ({ section: s, course: uni.data.courses.get(s.courseId) }))
      .filter((x): x is { section: UniSection; course: NonNullable<typeof x.course> } => x.course !== undefined)
      .sort((a, b) => a.course.code.localeCompare(b.course.code) || a.section.code.localeCompare(b.section.code))
      .map(({ section, course }) => ({
        ...sectionJson(section, course, uni.people, Math.max(0, section.seats - (taken.get(section.id) ?? 0))),
        students: taken.get(section.id) ?? 0,
        results_published: section.resultsPublishedAt !== null,
      })),
    advisees: { count: advisees.length, waiting },
  });
}

async function sectionStudents(ctx: SchoolContext, uni: Uni, section: UniSection) {
  const rows = (await ctx.store.listUniEnrolments(ctx.app.id, { sectionId: section.id })).filter(holdsSeat);
  return rows
    .map((e) => ({ enrolment: e, student: uni.people.get(e.studentId) }))
    .filter((r): r is { enrolment: typeof r.enrolment; student: SchoolPerson } => r.student !== undefined && r.student.active)
    .sort((a, b) => a.student.name.localeCompare(b.student.name));
}

async function sectionDetail(ctx: SchoolContext, uni: Uni, section: UniSection): Promise<ConnectorResult> {
  const course = uni.data.courses.get(section.courseId);
  const term = uni.data.termById.get(section.termId);
  if (!course || !term) return error(404, "not_found", "Section not found.");
  const students = await sectionStudents(ctx, uni, section);
  return ok({
    section: sectionJson(section, course, uni.people, Math.max(0, section.seats - students.length)),
    term: termJson(term),
    results_published_at: section.resultsPublishedAt?.toISOString() ?? null,
    scale: scaleJson(uni.data.settings.scale),
    students: students.map(({ enrolment, student }) => ({
      student: studentJson(student, { classes: new Map() }, ctx.assetUrl),
      status: enrolment.status,
      grade: enrolment.grade,
      mark: enrolment.mark,
    })),
  });
}

async function sectionAttendance(ctx: SchoolContext, uni: Uni, section: UniSection, date: string): Promise<ConnectorResult> {
  if (!isDate(date)) return error(400, "invalid_request", "date is a day like 2026-10-29.");
  const [students, rows] = await Promise.all([sectionStudents(ctx, uni, section), ctx.store.listUniAttendance(ctx.app.id, { sectionId: section.id, from: date, to: date })]);
  const marks = new Map(rows.map((r) => [r.studentId, r]));
  return ok({
    section_id: section.id,
    date,
    students: students.map(({ student }) => ({ student: studentJson(student, { classes: new Map() }, ctx.assetUrl), status: marks.get(student.id)?.status ?? null, note: marks.get(student.id)?.note ?? null })),
  });
}

async function saveSectionAttendance(ctx: SchoolContext, request: ConnectorRequest, uni: Uni, section: UniSection, teacher: SchoolPerson): Promise<ConnectorResult> {
  const body = record(request.body);
  const date = typeof body.date === "string" ? body.date : "";
  if (!isDate(date)) return error(400, "invalid_request", "date is a day like 2026-10-29.");
  if (date > uni.today || date < addDays(uni.today, -ATTENDANCE_DAYS_BACK)) return error(400, "date_out_of_range", `Attendance can be taken for today and the ${ATTENDANCE_DAYS_BACK} days before.`);
  if (!Array.isArray(body.items) || body.items.length > 500) return error(400, "invalid_request", "Send the students' marks (up to 500).");
  const students = new Map((await sectionStudents(ctx, uni, section)).map((s) => [s.student.id, s.student]));
  const items: { student: SchoolPerson; status: SchoolAttendanceStatus; note: string | null }[] = [];
  for (const raw of body.items) {
    const item = record(raw);
    const student = typeof item.student_id === "number" ? students.get(item.student_id) : undefined;
    if (!student) return error(400, "invalid_request", "A student isn't in this section.");
    if (typeof item.status !== "string" || !SCHOOL_ATTENDANCE_STATUSES.includes(item.status as SchoolAttendanceStatus)) return error(400, "invalid_request", "A mark is present, absent, late or excused.");
    const note = typeof item.note === "string" && item.note.trim() ? item.note.trim().slice(0, 300) : null;
    items.push({ student, status: item.status as SchoolAttendanceStatus, note });
  }
  const wait = await limited(ctx, request);
  if (wait) return wait;
  await takeLectureAttendance(ctx.store, { appId: ctx.app.id, sectionId: section.id, date, items, takenBy: teacher.id, now: request.now });
  return sectionAttendance(ctx, uni, section, date);
}

async function saveSectionGrades(ctx: SchoolContext, request: ConnectorRequest, uni: Uni, section: UniSection): Promise<ConnectorResult> {
  const body = record(request.body);
  if (!Array.isArray(body.items) || body.items.length > 500) return error(400, "invalid_request", "Send the students' grades (up to 500).");
  const rows: GradeInput[] = [];
  for (const raw of body.items) {
    const item = record(raw);
    if (typeof item.student_id !== "number") return error(400, "invalid_request", "A student isn't enrolled in this section.");
    const grade = typeof item.grade === "string" && item.grade.trim() ? item.grade.trim() : null;
    const mark = typeof item.mark === "number" ? item.mark : null;
    rows.push({ studentId: item.student_id, grade, mark });
  }
  const wait = await limited(ctx, request);
  if (wait) return wait;
  const result = await saveGrades({ store: ctx.store, app: ctx.app, now: request.now, data: uni.data }, section, rows);
  if (!result.ok) return fromFlow(result);
  return sectionDetail(ctx, uni, section);
}

async function adviseeList(ctx: SchoolContext, uni: Uni, studentIds: number[], term: UniTerm | null): Promise<ConnectorResult> {
  if (!term) return ok({ term: null, items: [] });
  const [rows, uniRows] = await Promise.all([ctx.store.listUniRegistrations(ctx.app.id, { termId: term.id, studentIds }), ctx.store.listUniStudents(ctx.app.id, { studentIds })]);
  const enrolments = await ctx.store.listUniEnrolments(ctx.app.id, { termId: term.id });
  const byStudent = new Map(rows.map((r) => [r.studentId, r]));
  const order = { submitted: 0, returned: 1, draft: 2, approved: 3 } as const;
  const items = studentIds
    .map((id) => uni.people.get(id))
    .filter((s): s is SchoolPerson => s !== undefined && s.active)
    .map((student) => {
      const reg = byStudent.get(student.id) ?? null;
      const program = uniRows.find((u) => u.studentId === student.id)?.programId;
      const credits = enrolments.filter((e) => e.studentId === student.id && holdsSeat(e)).reduce((sum, e) => sum + (uni.data.courses.get(e.courseId)?.credits ?? 0), 0);
      return {
        student: studentJson(student, { classes: new Map() }, ctx.assetUrl),
        program_name: program ? (uni.data.programs.get(program)?.name ?? null) : null,
        status: reg?.status ?? "draft",
        credits,
        submitted_at: reg?.submittedAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => order[a.status] - order[b.status] || a.student.name.localeCompare(b.student.name));
  return ok({ term: termJson(term), items });
}

async function adviseeDetail(ctx: SchoolContext, uni: Uni, student: SchoolPerson, term: UniTerm): Promise<ConnectorResult> {
  const rec = await academicRecord(ctx.store, uni.data, student);
  const view = await registrationView(ctx.store, uni.data, rec, term, uni.today);
  const reg = registrationJson(view, uni.people, []);
  return ok({
    student: studentJson(student, { classes: new Map() }, ctx.assetUrl),
    program: rec.program ? programJson(rec.program, uni.data) : null,
    gpa: rec.standing.gpa,
    credits_earned: rec.standing.creditsEarned,
    term: reg.term,
    status: reg.status,
    note: reg.note,
    submitted_at: reg.submitted_at,
    credits: reg.credits,
    sections: reg.mine,
    can_decide: reg.status === "submitted",
  });
}
