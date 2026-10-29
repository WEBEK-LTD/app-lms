"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App, SchoolAttendanceStatus, SchoolPerson } from "@/lib/data/types";
import { SCHOOL_ATTENDANCE_STATUSES } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";
import { hostedSettings } from "@/lib/hosted/service";
import { markFeePaid } from "@/lib/school/fees";
import { addFee, enterScores, giveHomework, postAnnouncement, takeAttendance, tellFeePaid } from "@/lib/school/flow";
import {
  parseAssessmentForm,
  parseClassForm,
  parseFeeForm,
  parseHomeworkForm,
  parseNewsForm,
  parsePeopleCsv,
  parsePeriodForm,
  parsePersonForm,
  parseSchoolSettings,
  parseScore,
  parseSubjectForm,
  SCHOOL_LIMITS,
} from "@/lib/school/forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import type { TeamPermission } from "@/lib/team/permissions";
import { askAfterOwnEntry } from "@/lib/samples/lists";

/**
 * 105.4 The school pages of school apps: classes and subjects, people and
 * their families, the timetable, attendance, homework, grades, fees, news
 * and the school's settings. Families and students hear of what concerns
 * them in the app (lib/school/flow.ts).
 */

const CSV_MAX_BYTES = 2 * 1024 * 1024;
const PATHS = ["classes", "people", "timetable", "attendance", "homework", "grades", "fees", "news", "settings"];

async function requireSchoolApp(permission: TeamPermission = "settings"): Promise<ClientContext & { app: App }> {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "school") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  for (const path of PATHS) revalidatePath(`/dashboard/school/${path}`, "layout");
}

const idOf = (formData: FormData, name = "id"): number | null => {
  const n = Number(formData.get(name));
  return formData.get(name) && Number.isSafeInteger(n) ? n : null;
};

const ids = (list: readonly { id: number }[]) => list.map((x) => x.id);

// Classes and subjects

export async function saveSchoolClassAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const [classes, teachers] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolPeople(app.id, { role: "teacher" })]);
  if (id !== null && !classes.some((c) => c.id === id)) return { message: "This class doesn't exist anymore." };
  if (id === null && classes.length >= SCHOOL_LIMITS.classes) return { message: `You can have up to ${SCHOOL_LIMITS.classes} classes.`, values };
  const parsed = parseClassForm(values, ids(teachers));
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.saveSchoolClass({ appId: app.id, id, ...parsed.value }, new Date());
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the class "${parsed.value.name}"`);
  refresh();
  return { ok: true, message: "Saved.", values: id ? values : {} };
}

export async function deleteSchoolClassAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const klass = id !== null ? (await store.listSchoolClasses(context.app.id)).find((c) => c.id === id) : undefined;
  if (!klass) return;
  await store.deleteSchoolClass(context.app.id, klass.id);
  await recordStaffChange(context, `Deleted the class "${klass.name}"`);
  refresh();
}

export async function saveSchoolSubjectAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const parsed = parseSubjectForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  if (id === null && (await store.listSchoolSubjects(app.id)).length >= SCHOOL_LIMITS.subjects) return { message: `You can have up to ${SCHOOL_LIMITS.subjects} subjects.`, values };
  const saved = await store.saveSchoolSubject({ appId: app.id, id, name: parsed.value.name }, new Date());
  if (!saved.ok) return saved.reason === "duplicate" ? { errors: { name: "You already have a subject with this name." }, values } : { message: "This subject doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Renamed" : "Added"} the subject "${parsed.value.name}"`);
  refresh();
  return { ok: true, message: "Saved.", values: id ? values : {} };
}

export async function deleteSchoolSubjectAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const subject = id !== null ? (await store.listSchoolSubjects(context.app.id)).find((s) => s.id === id) : undefined;
  if (!subject) return;
  await store.deleteSchoolSubject(context.app.id, subject.id);
  await recordStaffChange(context, `Deleted the subject "${subject.name}"`);
  refresh();
}

// People

export async function saveSchoolPersonAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const id = idOf(formData);
  const existing = id !== null ? await store.getSchoolPerson(app.id, id) : null;
  if (id !== null && !existing) return { message: "This person isn't on your list anymore." };
  const classes = await store.listSchoolClasses(app.id);
  const parsed = parsePersonForm(values, hostedSettings(app).defaultCountryCode, ids(classes), existing?.role ?? null);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const { role, ...fields } = parsed.value;
  let person: SchoolPerson;
  if (existing) {
    const changed = await store.updateSchoolPerson(app.id, existing.id, fields, now);
    if (!changed.ok) return { errors: { phone: "Someone else on your list has this number or email." }, values };
    person = { ...existing, ...fields };
  } else {
    if ((await store.listSchoolPeople(app.id)).length >= SCHOOL_LIMITS.people) return { message: `You can have up to ${SCHOOL_LIMITS.people} people.`, values };
    const made = await store.createSchoolPerson({ appId: app.id, role, ...fields, photoAssetId: null }, now);
    if (!made.ok) return { errors: { phone: "Someone else on your list has this number or email." }, values };
    person = made.person;
  }
  // A parent's children by their students' codes (or names), separated with commas.
  if (person.role === "parent" && formData.has("children")) {
    const students = await store.listSchoolPeople(app.id, { role: "student" });
    const children: number[] = [];
    const missing: string[] = [];
    for (const word of String(formData.get("children")).split(/[,،|\n]/).map((w) => w.trim()).filter(Boolean)) {
      const found = students.find((p) => (p.code !== null && p.code.toLowerCase() === word.toLowerCase()) || p.name.toLowerCase() === word.toLowerCase());
      if (found) children.push(found.id);
      else missing.push(word);
    }
    await store.setSchoolChildren(app.id, person.id, [...new Set(children)]);
    if (missing.length) {
      refresh();
      return { ok: false, message: `Saved, but there's no student with the code or name ${missing.join(", ")}.`, values };
    }
  }
  await recordStaffChange(context, `${existing ? "Edited" : "Added"} the ${person.role} "${person.name}"`);
  refresh();
  return { ok: true, message: existing ? "Saved." : "Added. They sign in to the app with this number.", values: existing ? values : {} };
}

export async function deleteSchoolPersonAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const person = id !== null ? await store.getSchoolPerson(context.app.id, id) : null;
  if (!person) return;
  await store.deleteSchoolPerson(context.app.id, person.id);
  await recordStaffChange(context, `Removed the ${person.role} "${person.name}"`);
  refresh();
}

/** People from a CSV file: new ones are added, those already on the list (same role and number or email) updated. */
export async function importSchoolPeopleAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { errors: { file: "Choose a CSV file." } };
  if (file.size > CSV_MAX_BYTES) return { errors: { file: "The file can be up to 2 MB." } };
  const parsed = parsePeopleCsv(await file.text(), hostedSettings(app).defaultCountryCode);
  if (!parsed.ok) return { errors: { file: parsed.message } };
  const classes = await store.listSchoolClasses(app.id);
  const classByName = new Map(classes.map((c) => [c.name.toLowerCase(), c.id]));
  const problems = [...parsed.problems];
  let added = 0;
  let updated = 0;
  const people = await store.listSchoolPeople(app.id);
  // Students first, so parents' children are found.
  const ordered = [...parsed.rows].sort((a, b) => Number(a.person.role === "parent") - Number(b.person.role === "parent"));
  for (const row of ordered) {
    const classId = row.className ? (classByName.get(row.className.toLowerCase()) ?? null) : null;
    if (row.className && classId === null) {
      problems.push(`Line ${row.line}: there's no class named ${row.className}.`);
      continue;
    }
    const same = people.find((p) => p.role === row.person.role && ((row.person.phone && p.phone === row.person.phone) || (row.person.email && p.email === row.person.email)));
    let person: SchoolPerson;
    // A file without a class (or a code) keeps a student's own.
    const fields = { name: row.person.name, phone: row.person.phone, email: row.person.email, classId: row.className ? classId : (same?.classId ?? null), code: row.person.code ?? same?.code ?? null, active: true };
    if (same) {
      const changed = await store.updateSchoolPerson(app.id, same.id, fields, now);
      if (!changed.ok) {
        problems.push(`Line ${row.line}: someone else on your list has this number or email.`);
        continue;
      }
      person = { ...same, ...fields };
      Object.assign(same, fields);
      updated += 1;
    } else {
      if (people.length >= SCHOOL_LIMITS.people) {
        problems.push(`Line ${row.line}: you can have up to ${SCHOOL_LIMITS.people} people.`);
        continue;
      }
      const made = await store.createSchoolPerson({ appId: app.id, role: row.person.role, ...fields, photoAssetId: null }, now);
      if (!made.ok) {
        problems.push(`Line ${row.line}: someone else on your list has this number or email.`);
        continue;
      }
      person = made.person;
      people.push(person);
      added += 1;
    }
    if (person.role === "parent" && row.children.length) {
      const children: number[] = [];
      for (const child of row.children) {
        const found = people.find((p) => p.role === "student" && (p.code === child || p.name.toLowerCase() === child.toLowerCase()));
        if (found) children.push(found.id);
        else problems.push(`Line ${row.line}: there's no student with the code or name ${child}.`);
      }
      const before = (await store.listSchoolFamily(app.id, { parentId: person.id })).map((l) => l.studentId);
      await store.setSchoolChildren(app.id, person.id, [...new Set([...before, ...children])]);
    }
  }
  await recordStaffChange(context, `Imported people: ${added} added, ${updated} updated`);
  refresh();
  // The rows with problems are listed under the message, by their line.
  const errors = Object.fromEntries(problems.slice(0, 50).map((problem, i) => [`line-${i}`, problem]));
  return { ok: added + updated > 0 || problems.length === 0, message: `Imported: ${added} added, ${updated} updated.`, ...(problems.length ? { errors } : {}) };
}

// Timetable

export async function saveSchoolPeriodAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const classId = idOf(formData, "classId");
  const classes = await store.listSchoolClasses(app.id);
  if (classId === null || !classes.some((c) => c.id === classId)) return { message: "This class doesn't exist anymore." };
  const [subjects, teachers, periods] = await Promise.all([store.listSchoolSubjects(app.id), store.listSchoolPeople(app.id, { role: "teacher" }), store.listSchoolPeriods(app.id, { classId })]);
  const id = idOf(formData);
  if (id === null && periods.length >= SCHOOL_LIMITS.periodsPerClass) return { message: `A class can have up to ${SCHOOL_LIMITS.periodsPerClass} lessons a week.`, values };
  const parsed = parsePeriodForm(values, ids(subjects), ids(teachers));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const saved = await store.saveSchoolPeriod({ id, appId: app.id, classId, ...parsed.value });
  if (!saved) return { message: "This lesson doesn't exist anymore." };
  await recordStaffChange(context, `${id ? "Edited" : "Added"} a lesson in the timetable of "${classes.find((c) => c.id === classId)!.name}"`);
  refresh();
  return { ok: true, message: "Saved.", values: id ? values : { weekday: values.weekday ?? "1" } };
}

export async function deleteSchoolPeriodAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  if (id === null) return;
  await (await getStore()).deleteSchoolPeriod(context.app.id, id);
  await recordStaffChange(context, "Removed a lesson from the timetable");
  refresh();
}

// Attendance

export async function saveSchoolAttendanceAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const classId = idOf(formData, "classId");
  const date = String(formData.get("date") ?? "");
  const klass = classId !== null ? (await store.listSchoolClasses(app.id)).find((c) => c.id === classId) : undefined;
  if (!klass) return { message: "This class doesn't exist anymore." };
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > schoolToday(settings, now)) return { message: "Attendance is taken for today or a day before." };
  const students = (await store.listSchoolPeople(app.id, { role: "student", classId: klass.id })).filter((s) => s.active);
  const items: { student: SchoolPerson; status: SchoolAttendanceStatus; note: string | null }[] = [];
  for (const student of students) {
    const status = String(formData.get(`status-${student.id}`) ?? "");
    if (!SCHOOL_ATTENDANCE_STATUSES.includes(status as SchoolAttendanceStatus)) continue;
    const note = String(formData.get(`note-${student.id}`) ?? "").trim().slice(0, 300);
    items.push({ student, status: status as SchoolAttendanceStatus, note: note || null });
  }
  if (!items.length) return { message: "Mark at least one student." };
  await takeAttendance({ store, app, now }, { classId: klass.id, date, items, takenBy: null });
  await recordStaffChange(context, `Took attendance of "${klass.name}" for ${date}`);
  refresh();
  return { ok: true, message: settings.absenceAlerts ? "Saved. Families of students absent or late were told in the app." : "Saved." };
}

// Homework

export async function addSchoolHomeworkAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const [classes, subjects, saved] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolSubjects(app.id), store.getSchoolSettings(app.id)]);
  const parsed = parseHomeworkForm(values, ids(classes), ids(subjects), schoolToday(schoolSettingsOf(saved, app), now));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const subject = subjects.find((s) => s.id === parsed.value.subjectId)!;
  await giveHomework({ store, app, now }, { ...parsed.value, teacherId: null, files: [] }, subject.name);
  await recordStaffChange(context, `Gave the homework "${parsed.value.title}"`);
  refresh();
  return { ok: true, message: "Given. The class's students and their families were told in the app." };
}

export async function deleteSchoolHomeworkAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const homework = id !== null ? await store.getSchoolHomework(context.app.id, id) : null;
  if (!homework) return;
  await store.deleteSchoolHomework(context.app.id, homework.id);
  await recordStaffChange(context, `Deleted the homework "${homework.title}"`);
  refresh();
}

// Grades

export async function addSchoolAssessmentAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const [classes, subjects] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolSubjects(app.id)]);
  const parsed = parseAssessmentForm(values, ids(classes), ids(subjects));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const made = await store.createSchoolAssessment({ appId: app.id, ...parsed.value, teacherId: null, createdAt: new Date() });
  await recordStaffChange(context, `Added the assessment "${made.title}"`);
  refresh();
  return { ok: true, message: "Added. Enter the scores when you have them." };
}

export async function deleteSchoolAssessmentAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const assessment = id !== null ? await store.getSchoolAssessment(context.app.id, id) : null;
  if (!assessment) return;
  await store.deleteSchoolAssessment(context.app.id, assessment.id);
  await recordStaffChange(context, `Deleted the assessment "${assessment.title}"`);
  refresh();
}

export async function saveSchoolScoresAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = idOf(formData);
  const assessment = id !== null ? await store.getSchoolAssessment(app.id, id) : null;
  if (!assessment) return { message: "This assessment doesn't exist anymore." };
  const students = (await store.listSchoolPeople(app.id, { role: "student", classId: assessment.classId })).filter((s) => s.active);
  const rows: { student: SchoolPerson; score: number | null; note: string | null }[] = [];
  const errors: Record<string, string> = {};
  const values = formValues(formData);
  for (const student of students) {
    const score = parseScore(String(formData.get(`score-${student.id}`) ?? ""), assessment.maxScore);
    if (score === "invalid") {
      errors[`score-${student.id}`] = `A score is from 0 to ${assessment.maxScore}.`;
      continue;
    }
    rows.push({ student, score, note: null });
  }
  if (Object.keys(errors).length) return { errors, values };
  await enterScores({ store, app, now }, assessment, rows);
  await recordStaffChange(context, `Entered the scores of "${assessment.title}"`);
  refresh();
  return { ok: true, message: "Saved. Students and families were told of new scores in the app.", values };
}

// Fees

export async function addSchoolFeeAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const [classes, students] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolPeople(app.id, { role: "student" })]);
  const active = students.filter((s) => s.active);
  const parsed = parseFeeForm(values, ids(active), ids(classes));
  if (!parsed.ok) return { errors: parsed.errors, values };
  const to = parsed.value.studentId !== null ? active.filter((s) => s.id === parsed.value.studentId) : active.filter((s) => s.classId === parsed.value.classId);
  if (!to.length) return { errors: { to: "This class has no students yet." }, values };
  for (const student of to) await addFee({ store, app, now }, student, parsed.value);
  await recordStaffChange(context, `Added the fee "${parsed.value.title}" for ${to.length} student(s)`);
  refresh();
  return { ok: true, message: `Added for ${to.length} student(s). Their families were told in the app.` };
}

export async function markSchoolFeePaidAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = idOf(formData);
  const fee = id !== null ? await store.getSchoolFee(app.id, id) : null;
  if (!fee || fee.status !== "due") return;
  const paid = await markFeePaid(store, app, fee, "office", now);
  if (paid) await tellFeePaid({ store, app, now }, paid);
  await recordStaffChange(context, `Marked the fee "${fee.title}" paid at the school`);
  refresh();
}

export async function cancelSchoolFeeAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const fee = id !== null ? await store.getSchoolFee(app.id, id) : null;
  if (!fee || fee.status !== "due") return;
  await store.updateSchoolFee(app.id, fee.id, { status: "cancelled", updatedAt: new Date() }, { statuses: ["due"] });
  await recordStaffChange(context, `Cancelled the fee "${fee.title}"`);
  refresh();
}

// News

export async function postSchoolNewsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const [classes, students] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolPeople(app.id, { role: "student" })]);
  const parsed = parseNewsForm(values, ids(classes), ids(students));
  if (!parsed.ok) return { errors: parsed.errors, values };
  await postAnnouncement({ store, app, now: new Date() }, { ...parsed.value, teacherId: null });
  await recordStaffChange(context, `Posted the news "${parsed.value.title}"`);
  refresh();
  // 110.2 Their first own news next to the samples: the page asks whether to remove them.
  const ask = await askAfterOwnEntry(store, app.id, "school_news");
  if (ask) redirect(ask);
  return { ok: true, message: "Posted. Everyone it is for was told in the app." };
}

export async function deleteSchoolNewsAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  if (id === null) return;
  await (await getStore()).deleteSchoolAnnouncement(context.app.id, id);
  await recordStaffChange(context, "Deleted a news post");
  refresh();
}

// Settings

export async function saveSchoolSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const values = formValues(formData);
  const parsed = parseSchoolSettings(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await (await getStore()).saveSchoolSettings(context.app.id, parsed.value, new Date());
  await recordStaffChange(context, "Saved the school settings");
  refresh();
  return { ok: true, message: "Saved. The app shows it the next time it opens.", values };
}
