import type { DataStore } from "../data/store";
import type { SchoolAttendanceStatus, SchoolPerson, UniEnrolment, UniRegistration, UniSection, UniTerm } from "../data/types";
import { notifyDeps, type FlowDeps } from "../delivery/flow";
import { tellAdvisor, tellRegistration, tellResults, tellSeat } from "./notify";
import { academicRecord, registrationView, seatsTaken, type AcademicRecord, type UniData } from "./records";
import { canAdd, canDrop, checkAdd, creditLimits, gradeOf, holdsSeat, letterFor, registrationPhase, type AddProblem } from "./rules";

/**
 * 113.9 What changes at a university, the same from the app and from the
 * dashboard: a section added (a seat held until the advisor approves, or
 * the waiting list) or dropped (the first on the waiting list moves up), a
 * registration sent to the advisor, approved or sent back, grades given and
 * a section's results published. Pushes never stop a change.
 */

export type UniFlowDeps = FlowDeps;

async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch {
    // The change is saved either way.
  }
}

export type FlowResult<T = undefined> = { ok: true; value: T } | { ok: false; status: number; code: string; message: string };

const fail = (status: number, code: string, message: string): FlowResult<never> => ({ ok: false, status, code, message });

/** The words of a problem adding a section (also `known` texts of the dashboard). */
export function addProblemMessage(code: AddProblem, detail: string): string {
  switch (code) {
    case "taken":
      return `This course is on your list already (${detail}).`;
    case "clash":
      return `Its lectures are at the same time as ${detail}.`;
    case "prerequisites":
      return `Pass ${detail} first.`;
    case "credits":
      return `That's more than ${detail} credits this term.`;
    case "full":
      return "This section is full.";
  }
}

function registrationRow(found: UniRegistration | undefined, appId: string, termId: number, studentId: number, now: Date): UniRegistration {
  return found ?? { appId, termId, studentId, status: "draft", note: null, submittedAt: null, decidedAt: null, decidedBy: null, updatedAt: now };
}

/**
 * Adds the student to the section. The student: while registration is open
 * and their registration isn't with their advisor, with every rule kept (a
 * full section takes the waiting list when the university has one); the
 * office: enrolled at once, `override` past the rules.
 */
export async function addSection(
  deps: UniFlowDeps & { data: UniData },
  input: { record: AcademicRecord; term: UniTerm; section: UniSection; by: "student" | "office"; override?: boolean; today: string },
): Promise<FlowResult<UniEnrolment>> {
  const { store, app, now, data } = deps;
  const { record, term, section, by } = input;
  if (section.termId !== term.id) return fail(404, "not_found", "Section not found.");
  const course = data.courses.get(section.courseId);
  if (!course) return fail(404, "not_found", "Section not found.");
  const [found] = await store.listUniRegistrations(app.id, { termId: term.id, studentId: record.student.id });
  if (by === "student") {
    if (!canAdd(registrationPhase(term, input.today))) return fail(409, "registration_closed", "Registration for this term isn't open.");
    if (found?.status === "submitted") return fail(409, "waiting_for_advisor", "Your registration is with your advisor. Wait for their answer to change it.");
  }
  const existing = record.taken.find((t) => t.section.id === section.id);
  if (existing && existing.enrolment.status !== "dropped") return fail(409, "already_added", "This section is on your list already.");
  const held = record.taken.filter((t) => t.term.id === term.id && holdsSeat(t.enrolment));
  const taken = (await seatsTaken(store, app.id, term.id)).get(section.id) ?? 0;
  const check = checkAdd({ section, course, held, passed: record.passed, maxCredits: creditLimits(record.program).max, taken, waitlistOn: data.settings.waitlist && by === "student" });
  if (check.problems.length && !(by === "office" && input.override)) {
    const first = check.problems[0]!;
    return fail(409, `not_allowed_${first.code}`, addProblemMessage(first.code, first.detail));
  }
  const status = by === "office" ? "enrolled" : check.waitlist ? "waitlisted" : "pending";
  let enrolment: UniEnrolment | null;
  if (existing) {
    await store.updateUniEnrolment(app.id, existing.enrolment.id, { status, addedBy: by, addedAt: now, droppedAt: null, grade: null, mark: null, gradedAt: null }, now);
    enrolment = { ...existing.enrolment, status, addedBy: by, addedAt: now, droppedAt: null, grade: null, mark: null, gradedAt: null, updatedAt: now };
  } else {
    enrolment = await store.createUniEnrolment({
      appId: app.id,
      termId: term.id,
      sectionId: section.id,
      courseId: course.id,
      studentId: record.student.id,
      status,
      addedBy: by,
      addedAt: now,
      droppedAt: null,
      grade: null,
      mark: null,
      gradedAt: null,
      updatedAt: now,
    });
    if (!enrolment) return fail(409, "already_added", "This section is on your list already.");
  }
  if (by === "student") {
    // A course added after the advisor approved goes to them again once sent.
    const row = registrationRow(found, app.id, term.id, record.student.id, now);
    if (!found || row.status === "approved") await store.saveUniRegistration({ ...row, status: "draft", updatedAt: now });
  }
  return { ok: true, value: enrolment };
}

/** Drops the student from the section (the student: until the term's drop date); the first on its waiting list who fits moves up. */
export async function dropSection(
  deps: UniFlowDeps & { data: UniData },
  input: { record: AcademicRecord; term: UniTerm; sectionId: number; by: "student" | "office"; today: string },
): Promise<FlowResult> {
  const { store, app, now } = deps;
  const row = input.record.taken.find((t) => t.section.id === input.sectionId && t.term.id === input.term.id && t.enrolment.status !== "dropped");
  if (!row) return fail(404, "not_found", "This section isn't on your list.");
  if (input.by === "student") {
    if (!canDrop(registrationPhase(input.term, input.today))) return fail(409, "drop_closed", "The last day to drop a course this term has passed.");
    const [found] = await store.listUniRegistrations(app.id, { termId: input.term.id, studentId: input.record.student.id });
    if (found?.status === "submitted") return fail(409, "waiting_for_advisor", "Your registration is with your advisor. Wait for their answer to change it.");
  }
  await store.updateUniEnrolment(app.id, row.enrolment.id, { status: "dropped", droppedAt: now }, now);
  if (holdsSeat(row.enrolment)) await safely(() => promoteWaitlist(deps, row.section));
  return { ok: true, value: undefined };
}

/** A seat opened: the first on the section's waiting list whose lectures and credits fit takes it, waiting for their advisor. */
async function promoteWaitlist(deps: UniFlowDeps & { data: UniData }, section: UniSection): Promise<void> {
  const { store, app, now, data } = deps;
  const course = data.courses.get(section.courseId);
  if (!course) return;
  const waiting = await store.listUniEnrolments(app.id, { sectionId: section.id, statuses: ["waitlisted"] });
  for (const entry of waiting) {
    const student = await store.getSchoolPerson(app.id, entry.studentId);
    if (!student) continue;
    const record = await academicRecord(store, data, student);
    const held = record.taken.filter((t) => t.term.id === section.termId && holdsSeat(t.enrolment));
    const taken = (await seatsTaken(store, app.id, section.termId)).get(section.id) ?? 0;
    const check = checkAdd({ section, course, held, passed: record.passed, maxCredits: creditLimits(record.program).max, taken, waitlistOn: false });
    if (check.problems.some((p) => p.code === "full")) return;
    if (check.problems.length) continue;
    await store.updateUniEnrolment(app.id, entry.id, { status: "pending" }, now);
    const [found] = await store.listUniRegistrations(app.id, { termId: section.termId, studentId: student.id });
    // With the advisor again when it was with them or approved.
    if (found && (found.status === "approved" || found.status === "submitted")) await store.saveUniRegistration({ ...found, status: "submitted", submittedAt: now, updatedAt: now });
    await safely(() => tellSeat(notifyDeps(deps), student, `${course.code} ${course.title}`, section.termId));
    return;
  }
}

/** The student sends their registration to their advisor: something to approve, and at least the program's credits. */
export async function submitRegistration(
  deps: UniFlowDeps & { data: UniData },
  input: { record: AcademicRecord; term: UniTerm; today: string },
): Promise<FlowResult<UniRegistration>> {
  const { store, app, now, data } = deps;
  const view = await registrationView(store, data, input.record, input.term, input.today);
  const status = view.registration?.status ?? "draft";
  if (status === "submitted") return fail(409, "waiting_for_advisor", "Your registration is with your advisor already.");
  if (view.phase !== "open" && view.phase !== "drop") return fail(409, "registration_closed", "Registration for this term isn't open.");
  if (!view.mine.some((t) => t.enrolment.status === "pending")) return fail(409, "nothing_to_send", "Add a section first: there's nothing new for your advisor.");
  if (view.credits < view.limits.min) return fail(409, "credits_low", `Take at least ${view.limits.min} credits this term.`);
  const row: UniRegistration = { ...registrationRow(view.registration ?? undefined, app.id, input.term.id, input.record.student.id, now), status: "submitted", submittedAt: now, updatedAt: now };
  await store.saveUniRegistration(row);
  const advisorId = input.record.uni?.advisorId ?? null;
  const advisor = advisorId !== null ? await store.getSchoolPerson(app.id, advisorId) : null;
  if (advisor?.active) await safely(() => tellAdvisor(notifyDeps(deps), advisor, input.record.student, input.term));
  return { ok: true, value: row };
}

/** The advisor (or the office, `by` null) approves the registration (its sections asked for are enrolled) or sends it back with a note. */
export async function decideRegistration(
  deps: UniFlowDeps & { data: UniData },
  input: { record: AcademicRecord; term: UniTerm; approve: boolean; note: string | null; by: number | null },
): Promise<FlowResult<UniRegistration>> {
  const { store, app, now } = deps;
  const [found] = await store.listUniRegistrations(app.id, { termId: input.term.id, studentId: input.record.student.id });
  const pending = input.record.taken.filter((t) => t.term.id === input.term.id && t.enrolment.status === "pending");
  // The office decides whatever waits; an advisor what was sent to them.
  if (input.by !== null ? found?.status !== "submitted" : !pending.length && found?.status !== "submitted") return fail(409, "not_submitted", "There's no registration waiting for an answer.");
  if (input.approve) for (const t of pending) await store.updateUniEnrolment(app.id, t.enrolment.id, { status: "enrolled" }, now);
  const row: UniRegistration = {
    ...registrationRow(found, app.id, input.term.id, input.record.student.id, now),
    status: input.approve ? "approved" : "returned",
    note: input.approve ? null : input.note,
    decidedAt: now,
    decidedBy: input.by,
    updatedAt: now,
  };
  await store.saveUniRegistration(row);
  await safely(() => tellRegistration(notifyDeps(deps), input.record.student, input.approve ? "approved" : "returned", input.term, row.note));
  return { ok: true, value: row };
}

/** One student's grade in a section: a letter of the scale, or a percent it comes from. */
export interface GradeInput {
  studentId: number;
  grade: string | null;
  mark: number | null;
}

/** Saves the section's grades for its enrolled students; a percent without a letter gets the scale's letter. */
export async function saveGrades(deps: UniFlowDeps & { data: UniData }, section: UniSection, rows: readonly GradeInput[]): Promise<FlowResult> {
  const { store, app, now, data } = deps;
  const enrolled = new Map((await store.listUniEnrolments(app.id, { sectionId: section.id, statuses: ["enrolled"] })).map((e) => [e.studentId, e]));
  const changes: { id: number; grade: string | null; mark: number | null }[] = [];
  for (const row of rows) {
    const enrolment = enrolled.get(row.studentId);
    if (!enrolment) return fail(400, "invalid_request", "A student isn't enrolled in this section.");
    if (row.mark !== null && (!Number.isFinite(row.mark) || row.mark < 0 || row.mark > 100)) return fail(400, "invalid_request", "A mark is a percent from 0 to 100.");
    const letter = row.grade !== null ? (gradeOf(data.settings.scale, row.grade)?.letter ?? null) : row.mark !== null ? letterFor(data.settings.scale, row.mark) : null;
    if (row.grade !== null && letter === null) return fail(400, "invalid_request", `${row.grade} isn't a grade of the university's scale.`);
    changes.push({ id: enrolment.id, grade: letter, mark: row.mark });
  }
  for (const change of changes) await store.updateUniEnrolment(app.id, change.id, { grade: change.grade, mark: change.mark, gradedAt: change.grade !== null ? now : null }, now);
  return { ok: true, value: undefined };
}

/** Publishes the section's results: its graded students (and their parents) hear of them. */
export async function publishResults(deps: UniFlowDeps & { data: UniData }, section: UniSection): Promise<FlowResult<UniSection>> {
  const { store, app, now, data } = deps;
  const graded = (await store.listUniEnrolments(app.id, { sectionId: section.id, statuses: ["enrolled"] })).filter((e) => e.grade !== null);
  if (!graded.length) return fail(409, "nothing_graded", "Give the grades first.");
  const { id, createdAt: _createdAt, updatedAt: _updatedAt, ...fields } = section;
  void _createdAt;
  void _updatedAt;
  const saved = await store.saveUniSection({ ...fields, id, resultsPublishedAt: now }, now);
  if (!saved) return fail(404, "not_found", "Section not found.");
  const course = data.courses.get(section.courseId);
  const students = (await store.listSchoolPeople(app.id, { role: "student", ids: graded.map((e) => e.studentId) })).filter((s) => s.active);
  await safely(() => tellResults(notifyDeps(deps), students, course ? `${course.code} ${course.title}` : section.code));
  return { ok: true, value: saved };
}

/** A lecture's attendance for the section's students. */
export async function takeLectureAttendance(
  store: DataStore,
  input: { appId: string; sectionId: number; date: string; items: { student: SchoolPerson; status: SchoolAttendanceStatus; note: string | null }[]; takenBy: number | null; now: Date },
): Promise<void> {
  await store.saveUniAttendance(
    input.items.map((i) => ({ appId: input.appId, sectionId: input.sectionId, studentId: i.student.id, date: input.date, status: i.status, note: i.note, takenBy: input.takenBy, updatedAt: input.now })),
  );
}
