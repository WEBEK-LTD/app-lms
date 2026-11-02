"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, SchoolPerson } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";
import { hostedSettings } from "@/lib/hosted/service";
import { parseAnyPhone } from "@/lib/hosted/phone";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import type { TeamPermission } from "@/lib/team/permissions";
import { addSection, decideRegistration, dropSection, publishResults, saveGrades, type GradeInput } from "@/lib/university/flow";
import { parseCourseForm, parseCoursesCsv, parsePlanText, parseProgramForm, parseScaleText, parseSectionForm, parseTermForm, parseUniStudentsCsv, parseUnitForm, UNI_LIMITS } from "@/lib/university/forms";
import { academicRecord, uniData } from "@/lib/university/records";
import { loadUniSettings } from "@/lib/university/settings";

/**
 * 113.9 The University pages of school apps: the university's settings and
 * grading scale, faculties and departments, programs and their study plan,
 * courses (and a sheet of them), students' programs and advisors, terms and
 * sections, registrations (approved or sent back, sections added and
 * dropped by the office), grades and published results. Students hear of
 * what concerns them in the app (lib/university/flow.ts).
 */

const CSV_MAX_BYTES = 2 * 1024 * 1024;
const PATHS = ["", "/structure", "/programs", "/courses", "/students", "/terms", "/registration", "/results", "/transcripts"];

async function requireSchoolApp(permission: TeamPermission = "settings"): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "school") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  for (const path of PATHS) revalidatePath(`/dashboard/school/university${path}`, "layout");
}

const idOf = (formData: FormData, name = "id"): number | null => {
  const n = Number(formData.get(name));
  return formData.get(name) && Number.isSafeInteger(n) ? n : null;
};

const saved = (values: Record<string, string>, id: number | null): FormState => ({ ok: true, message: "Saved.", values: id ? values : {} });

// Settings

export async function saveUniSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const scale = parseScaleText(values.scale ?? "");
  if (!scale.ok) return { errors: { scale: scale.message }, values };
  const terms = await store.listUniTerms(context.app.id);
  const termId = idOf(formData, "currentTermId");
  if (termId !== null && !terms.some((t) => t.id === termId)) return { errors: { currentTermId: "Choose one of your terms." }, values };
  const before = await loadUniSettings(store, context.app.id);
  const enabled = values.enabled === "on";
  await store.saveUniSettings(context.app.id, { ...before, enabled, waitlist: values.waitlist === "on", currentTermId: termId, scale: scale.value }, new Date());
  await recordStaffChange(context, enabled ? "Saved the university's settings" : "Saved the university's settings (university mode off)");
  refresh();
  revalidatePath("/dashboard/school", "layout");
  return { ok: true, message: "Saved. The app shows it the next time it opens.", values };
}

// Faculties and departments

export async function saveFacultyAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const parsed = parseUnitForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (id === null && (await store.listUniFaculties(context.app.id)).length >= UNI_LIMITS.faculties) return { message: `You can have up to ${UNI_LIMITS.faculties} faculties.`, values };
  const done = await store.saveUniFaculty({ appId: context.app.id, id, ...parsed.value }, new Date());
  if (!done) return { message: "This faculty doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the faculty "${parsed.value.name}"`);
  refresh();
  return saved(values, id);
}

export async function deleteFacultyAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData);
  const found = (await store.listUniFaculties(context.app.id)).find((f) => f.id === id);
  if (!found) return;
  await store.deleteUniFaculty(context.app.id, found.id);
  await recordStaffChange(context, `Deleted the faculty "${found.name}"`);
  refresh();
}

export async function saveDepartmentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const parsed = parseUnitForm(values);
  const facultyId = idOf(formData, "facultyId");
  const faculties = await store.listUniFaculties(context.app.id);
  if (!parsed.ok || facultyId === null || !faculties.some((f) => f.id === facultyId)) {
    return { errors: { ...(parsed.ok ? {} : parsed.errors), ...(facultyId === null || !faculties.some((f) => f.id === facultyId) ? { facultyId: "Choose a faculty." } : {}) }, values };
  }
  if (id === null && (await store.listUniDepartments(context.app.id)).length >= UNI_LIMITS.departments) return { message: `You can have up to ${UNI_LIMITS.departments} departments.`, values };
  const done = await store.saveUniDepartment({ appId: context.app.id, id, facultyId, ...parsed.value }, new Date());
  if (!done) return { message: "This department doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the department "${parsed.value.name}"`);
  refresh();
  return saved(values, id);
}

export async function deleteDepartmentAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData);
  const found = (await store.listUniDepartments(context.app.id)).find((d) => d.id === id);
  if (!found) return;
  await store.deleteUniDepartment(context.app.id, found.id);
  await recordStaffChange(context, `Deleted the department "${found.name}"`);
  refresh();
}

// Programs

export async function saveProgramAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const [departments, courses, programs] = await Promise.all([store.listUniDepartments(context.app.id), store.listUniCourses(context.app.id), store.listUniPrograms(context.app.id)]);
  const parsed = parseProgramForm(values, departments.map((d) => d.id));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const plan = parsePlanText(values.plan ?? "", courses, parsed.value.years);
  if (!plan.ok) return { errors: { plan: plan.message }, values };
  if (id === null && programs.length >= UNI_LIMITS.programs) return { message: `You can have up to ${UNI_LIMITS.programs} programs.`, values };
  const done = await store.saveUniProgram({ appId: context.app.id, id, ...parsed.value, plan: plan.value }, new Date());
  if (!done) return { message: "This program doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the program "${parsed.value.name}"`);
  refresh();
  return saved(values, id);
}

export async function deleteProgramAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData);
  const found = (await store.listUniPrograms(context.app.id)).find((p) => p.id === id);
  if (!found) return;
  await store.deleteUniProgram(context.app.id, found.id);
  await recordStaffChange(context, `Deleted the program "${found.name}"`);
  refresh();
}

// Courses

export async function saveCourseAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const [departments, courses] = await Promise.all([store.listUniDepartments(context.app.id), store.listUniCourses(context.app.id)]);
  const parsed = parseCourseForm(values, departments.map((d) => d.id));
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (id === null && courses.length >= UNI_LIMITS.courses) return { message: `You can have up to ${UNI_LIMITS.courses} courses.`, values };
  const done = await store.saveUniCourse({ appId: context.app.id, id, ...parsed.value }, new Date());
  if (!done.ok) return done.reason === "duplicate" ? { errors: { code: "Another course has this code." }, values } : { message: "This course doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the course ${parsed.value.code}`);
  refresh();
  return saved(values, id);
}

export async function deleteCourseAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData);
  const found = (await store.listUniCourses(context.app.id)).find((c) => c.id === id);
  if (!found) return;
  await store.deleteUniCourse(context.app.id, found.id);
  await recordStaffChange(context, `Deleted the course ${found.code}`);
  refresh();
}

export async function importCoursesAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const now = new Date();
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { errors: { file: "Choose a CSV file." } };
  if (file.size > CSV_MAX_BYTES) return { errors: { file: "The file can be up to 2 MB." } };
  const parsed = parseCoursesCsv(await file.text());
  if (!parsed.ok) return { errors: { file: parsed.message } };
  const [departments, courses] = await Promise.all([store.listUniDepartments(context.app.id), store.listUniCourses(context.app.id)]);
  const departmentOf = (text: string | null) => (text ? departments.find((d) => d.code?.toLowerCase() === text.toLowerCase() || d.name.toLowerCase() === text.toLowerCase()) : undefined);
  const problems = [...parsed.problems];
  let added = 0;
  let updated = 0;
  for (const row of parsed.rows) {
    const department = departmentOf(row.department);
    if (row.department && !department) {
      problems.push(`Line ${row.line}: there's no department ${row.department}.`);
      continue;
    }
    const same = courses.find((c) => c.code === row.code);
    if (!same && courses.length + added >= UNI_LIMITS.courses) {
      problems.push(`Line ${row.line}: you can have up to ${UNI_LIMITS.courses} courses.`);
      continue;
    }
    const done = await store.saveUniCourse(
      { appId: context.app.id, id: same?.id ?? null, code: row.code, title: row.title, credits: row.credits, departmentId: department?.id ?? same?.departmentId ?? null, prerequisites: row.prerequisites, description: same?.description ?? "" },
      now,
    );
    if (!done.ok) continue;
    if (same) updated++;
    else added++;
  }
  await recordStaffChange(context, `Imported courses: ${added} added, ${updated} updated`);
  refresh();
  // The rows with problems are listed under the message, by their line.
  const errors = Object.fromEntries(problems.slice(0, 50).map((problem, i) => [`line-${i}`, problem]));
  return { ok: added + updated > 0 || problems.length === 0, message: `Imported: ${added} added, ${updated} updated.`, ...(problems.length ? { errors } : {}) };
}

// Students

/** A teacher by their number, email or name. */
function teacherBy(teachers: readonly SchoolPerson[], text: string, countryCode: string): SchoolPerson | undefined {
  const phone = parseAnyPhone(text, countryCode)?.e164 ?? null;
  const lower = text.toLowerCase();
  return teachers.find((t) => (phone && t.phone === phone) || t.email === lower || t.name.toLowerCase() === lower);
}

export async function saveUniStudentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const studentId = idOf(formData, "studentId");
  const student = studentId !== null ? await store.getSchoolPerson(context.app.id, studentId) : null;
  if (!student || student.role !== "student") return { message: "This person isn't on your list anymore." };
  const [programs, teachers] = await Promise.all([store.listUniPrograms(context.app.id), store.listSchoolPeople(context.app.id, { role: "teacher" })]);
  const programId = idOf(formData, "programId");
  const advisorId = idOf(formData, "advisorId");
  const errors: Record<string, string> = {};
  if (programId !== null && !programs.some((p) => p.id === programId)) errors.programId = "Choose a program.";
  if (advisorId !== null && !teachers.some((t) => t.id === advisorId)) errors.advisorId = "Choose one of your lecturers.";
  const startYear = (values.startYear ?? "").trim();
  if (startYear.length > UNI_LIMITS.year) errors.startYear = `Keep it under ${UNI_LIMITS.year} characters.`;
  if (Object.keys(errors).length) return { errors, values };
  await store.saveUniStudent({ appId: context.app.id, studentId: student.id, programId, advisorId, startYear: startYear || null, updatedAt: new Date() });
  await recordStaffChange(context, `Set the program and advisor of ${student.name}`);
  refresh();
  return { ok: true, message: "Saved.", values };
}

export async function importUniStudentsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { errors: { file: "Choose a CSV file." } };
  if (file.size > CSV_MAX_BYTES) return { errors: { file: "The file can be up to 2 MB." } };
  const parsed = parseUniStudentsCsv(await file.text());
  if (!parsed.ok) return { errors: { file: parsed.message } };
  const [students, teachers, programs, rows] = await Promise.all([
    store.listSchoolPeople(app.id, { role: "student" }),
    store.listSchoolPeople(app.id, { role: "teacher" }),
    store.listUniPrograms(app.id),
    store.listUniStudents(app.id),
  ]);
  const problems = [...parsed.problems];
  let updated = 0;
  for (const row of parsed.rows) {
    const lower = row.code.toLowerCase();
    const student = students.find((s) => s.code?.toLowerCase() === lower) ?? students.find((s) => s.name.toLowerCase() === lower);
    if (!student) {
      problems.push(`Line ${row.line}: there's no student with the code or name ${row.code}.`);
      continue;
    }
    const program = row.program ? programs.find((p) => p.code?.toLowerCase() === row.program!.toLowerCase() || p.name.toLowerCase() === row.program!.toLowerCase()) : undefined;
    if (row.program && !program) {
      problems.push(`Line ${row.line}: there's no program ${row.program}.`);
      continue;
    }
    const advisor = row.advisor ? teacherBy(teachers, row.advisor, hostedSettings(app).defaultCountryCode) : undefined;
    if (row.advisor && !advisor) {
      problems.push(`Line ${row.line}: there's no lecturer ${row.advisor}.`);
      continue;
    }
    const before = rows.find((r) => r.studentId === student.id);
    await store.saveUniStudent({
      appId: app.id,
      studentId: student.id,
      programId: program?.id ?? before?.programId ?? null,
      advisorId: advisor?.id ?? before?.advisorId ?? null,
      startYear: row.startYear ?? before?.startYear ?? null,
      updatedAt: new Date(),
    });
    updated++;
  }
  await recordStaffChange(context, `Imported the programs and advisors of ${updated} students`);
  refresh();
  const errors = Object.fromEntries(problems.slice(0, 50).map((problem, i) => [`line-${i}`, problem]));
  return { ok: updated > 0 || problems.length === 0, message: `Imported: ${updated} students.`, ...(problems.length ? { errors } : {}) };
}

// Terms and sections

export async function saveTermAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const parsed = parseTermForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (id === null && (await store.listUniTerms(context.app.id)).length >= UNI_LIMITS.terms) return { message: `You can have up to ${UNI_LIMITS.terms} terms.`, values };
  const done = await store.saveUniTerm({ appId: context.app.id, id, ...parsed.value }, new Date());
  if (!done) return { message: "This term doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the term "${parsed.value.name}"`);
  refresh();
  return saved(values, id);
}

export async function deleteTermAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData);
  const found = (await store.listUniTerms(context.app.id)).find((t) => t.id === id);
  if (!found) return;
  await store.deleteUniTerm(context.app.id, found.id);
  await recordStaffChange(context, `Deleted the term "${found.name}"`);
  refresh();
}

export async function saveSectionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const termId = idOf(formData, "termId");
  const term = (await store.listUniTerms(context.app.id)).find((t) => t.id === termId);
  if (!term) return { message: "This term doesn't exist anymore." };
  const [courses, teachers, sections] = await Promise.all([store.listUniCourses(context.app.id), store.listSchoolPeople(context.app.id, { role: "teacher" }), store.listUniSections(context.app.id, { termId: term.id })]);
  const parsed = parseSectionForm(
    values,
    courses.map((c) => c.id),
    teachers.map((t) => t.id),
  );
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (sections.some((s) => s.id !== id && s.courseId === parsed.value.courseId && s.code.toLowerCase() === parsed.value.code.toLowerCase())) return { errors: { code: "The course has a section with this code this term." }, values };
  if (id === null && sections.length >= UNI_LIMITS.sectionsPerTerm) return { message: `A term can have up to ${UNI_LIMITS.sectionsPerTerm} sections.`, values };
  const before = id !== null ? sections.find((s) => s.id === id) : undefined;
  if (id !== null && !before) return { message: "This section doesn't exist anymore." };
  const done = await store.saveUniSection({ appId: context.app.id, id, termId: term.id, ...parsed.value, resultsPublishedAt: before?.resultsPublishedAt ?? null }, new Date());
  if (!done) return { message: "This section doesn't exist anymore." };
  const course = courses.find((c) => c.id === parsed.value.courseId)!;
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the section ${course.code}-${parsed.value.code} of "${term.name}"`);
  refresh();
  return saved(values, id);
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData);
  const found = id !== null ? await store.getUniSection(context.app.id, id) : null;
  if (!found) return;
  await store.deleteUniSection(context.app.id, found.id);
  await recordStaffChange(context, `Deleted the section ${found.code}`);
  refresh();
}

// Registration

async function studentAndTerm(context: ClientContext & { app: App }, formData: FormData) {
  const store = await getStore();
  const data = await uniData(store, context.app.id);
  const studentId = idOf(formData, "studentId");
  const student = studentId !== null ? await store.getSchoolPerson(context.app.id, studentId) : null;
  const term = data.termById.get(idOf(formData, "termId") ?? -1);
  const settings = schoolSettingsOf(await store.getSchoolSettings(context.app.id), context.app);
  return { store, data, student: student?.role === "student" ? student : null, term: term ?? null, today: schoolToday(settings, new Date()) };
}

export async function decideRegistrationAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { store, data, student, term } = await studentAndTerm(context, formData);
  if (!student || !term) return { message: "This registration doesn't exist anymore." };
  const values = formValues(formData);
  const approve = values.decision !== "return";
  const note = (values.note ?? "").trim();
  if (note.length > UNI_LIMITS.note) return { errors: { note: `Keep it under ${UNI_LIMITS.note} characters.` }, values };
  const now = new Date();
  const result = await decideRegistration({ store, app: context.app, now, data }, { record: await academicRecord(store, data, student), term, approve, note: note || null, by: null });
  if (!result.ok) return { message: result.message };
  await recordStaffChange(context, `${approve ? "Approved" : "Sent back"} the registration of ${student.name} for "${term.name}"`);
  refresh();
  return { ok: true, message: approve ? "Approved. The student was told in the app." : "Sent back. The student was told in the app." };
}

export async function officeAddSectionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { store, data, student, term, today } = await studentAndTerm(context, formData);
  if (!student || !term) return { message: "This registration doesn't exist anymore." };
  const values = formValues(formData);
  const sectionId = idOf(formData, "sectionId");
  const section = sectionId !== null ? await store.getUniSection(context.app.id, sectionId) : null;
  if (!section || section.termId !== term.id) return { errors: { sectionId: "Choose a section of this term." }, values };
  const result = await addSection({ store, app: context.app, now: new Date(), data }, { record: await academicRecord(store, data, student), term, section, by: "office", override: values.override === "on", today });
  if (!result.ok) return { message: result.message, values };
  await recordStaffChange(context, `Added ${student.name} to a section of "${term.name}"`);
  refresh();
  return { ok: true, message: "Added. The student is enrolled." };
}

export async function officeDropSectionAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { store, data, student, term, today } = await studentAndTerm(context, formData);
  const sectionId = idOf(formData, "sectionId");
  if (!student || !term || sectionId === null) return;
  const result = await dropSection({ store, app: context.app, now: new Date(), data }, { record: await academicRecord(store, data, student), term, sectionId, by: "office", today });
  if (!result.ok) return;
  await recordStaffChange(context, `Dropped ${student.name} from a section of "${term.name}"`);
  refresh();
}

// Results

export async function saveSectionGradesAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData, "sectionId");
  const section = id !== null ? await store.getUniSection(context.app.id, id) : null;
  if (!section) return { message: "This section doesn't exist anymore." };
  const values = formValues(formData);
  const rows: GradeInput[] = [];
  for (const [key, value] of Object.entries(values)) {
    const m = /^grade_(\d+)$/.exec(key);
    if (!m) continue;
    const markText = (values[`mark_${m[1]}`] ?? "").trim().replace(",", ".");
    const mark = markText ? Number(markText) : null;
    if (mark !== null && !Number.isFinite(mark)) return { errors: { [`mark_${m[1]}`]: "A mark is a percent from 0 to 100." }, values };
    rows.push({ studentId: Number(m[1]), grade: value.trim() || null, mark });
  }
  const data = await uniData(store, context.app.id);
  const result = await saveGrades({ store, app: context.app, now: new Date(), data }, section, rows);
  if (!result.ok) return { message: result.message, values };
  await recordStaffChange(context, `Saved the grades of the section ${section.code}`);
  refresh();
  return { ok: true, message: "Saved.", values };
}

export async function publishSectionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const id = idOf(formData, "sectionId");
  const section = id !== null ? await store.getUniSection(context.app.id, id) : null;
  if (!section) return { message: "This section doesn't exist anymore." };
  const data = await uniData(store, context.app.id);
  const result = await publishResults({ store, app: context.app, now: new Date(), data }, section);
  if (!result.ok) return { message: result.message };
  await recordStaffChange(context, `Published the results of the section ${section.code}`);
  refresh();
  return { ok: true, message: "Published. The students were told in the app." };
}
