"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App, SchoolReportKind } from "@/lib/data/types";
import { SCHOOL_REPORT_KINDS } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { parseSyllabusCsv, plannedDays, schoolGrades, syllabusGradeOf, SYLLABUS_LIMITS } from "@/lib/school/syllabus";
import { moveField, parseFieldForm, parseTemplateForm, REPORT_LIMITS, reviewReport, shareReport, suggestedTemplate, type ReviewAction } from "@/lib/school/teacher-reports";
import { addDays } from "@/lib/bookings/time";

/**
 * 113.5 The administration's side of the reports with the teachers: the
 * syllabus of each subject per grade (written here or from a sheet), each
 * class's progress (a topic marked covered here too), the report templates,
 * and the teachers' reports (read, commented on, sent back, approved,
 * shared with a student's parents).
 */

const CSV_MAX_BYTES = 2 * 1024 * 1024;
const PATHS = ["syllabus", "progress", "teacher-reports", "report-templates"];

async function requireSchoolApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
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

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// The syllabus

export async function saveSyllabusUnitAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const subjectId = idOf(formData, "subjectId");
  const grade = text(formData, "grade");
  const title = text(formData, "title");
  const [subjects, classes] = await Promise.all([store.listSchoolSubjects(app.id), store.listSchoolClasses(app.id)]);
  if (subjectId === null || !subjects.some((s) => s.id === subjectId)) return { message: "This subject doesn't exist anymore." };
  if (!schoolGrades(classes).includes(grade)) return { message: "Choose one of your grades." };
  if (!title) return { errors: { title: "Name the unit, like Fractions." }, values };
  if (title.length > SYLLABUS_LIMITS.title) return { errors: { title: `Keep it under ${SYLLABUS_LIMITS.title} characters.` }, values };
  const units = await store.listSchoolSyllabusUnits(app.id, { subjectId, grade });
  if (id === null && units.length >= SYLLABUS_LIMITS.unitsPerSubject) return { message: `A subject can have up to ${SYLLABUS_LIMITS.unitsPerSubject} units.`, values };
  if (id !== null && !units.some((u) => u.id === id)) return { message: "This unit doesn't exist anymore." };
  await store.saveSchoolSyllabusUnit({ id, appId: app.id, subjectId, grade, title }, new Date());
  await recordStaffChange(context, `${id ? "Renamed" : "Added"} the syllabus unit "${title}"`);
  refresh();
  return { ok: true, message: "Saved.", values: id ? values : {} };
}

export async function deleteSyllabusUnitAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const unit = id !== null ? (await store.listSchoolSyllabusUnits(context.app.id)).find((u) => u.id === id) : undefined;
  if (!unit) return;
  await store.deleteSchoolSyllabusUnit(context.app.id, unit.id);
  await recordStaffChange(context, `Deleted the syllabus unit "${unit.title}"`);
  refresh();
}

/** A unit (`kind` unit) or a topic moved one place up or down among its own. */
export async function moveSyllabusAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const id = idOf(formData);
  const by = formData.get("by") === "up" ? -1 : 1;
  if (formData.get("kind") === "unit") {
    const all = await store.listSchoolSyllabusUnits(app.id);
    const unit = all.find((u) => u.id === id);
    if (!unit) return;
    const list = all.filter((u) => u.subjectId === unit.subjectId && u.grade === unit.grade);
    const other = list[list.indexOf(unit) + by];
    if (!other) return;
    await store.saveSchoolSyllabusUnit({ ...unit, position: other.position === unit.position ? unit.position + by : other.position }, now);
    await store.saveSchoolSyllabusUnit({ ...other, position: unit.position }, now);
  } else {
    const [topic] = id !== null ? await store.listSchoolSyllabusTopics(app.id, { ids: [id] }) : [];
    if (!topic) return;
    const list = await store.listSchoolSyllabusTopics(app.id, { unitIds: [topic.unitId] });
    const at = list.findIndex((t) => t.id === topic.id);
    const other = list[at + by];
    if (!other) return;
    await store.saveSchoolSyllabusTopic({ ...topic, position: other.position === topic.position ? topic.position + by : other.position }, now);
    await store.saveSchoolSyllabusTopic({ ...other, position: topic.position }, now);
  }
  refresh();
}

export async function saveSyllabusTopicAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const unitId = idOf(formData, "unitId");
  const unit = unitId !== null ? (await store.listSchoolSyllabusUnits(app.id)).find((u) => u.id === unitId) : undefined;
  if (!unit) return { message: "This unit doesn't exist anymore." };
  const errors: Record<string, string> = {};
  const title = text(formData, "title");
  if (!title) errors.title = "Name the lesson or topic, like Adding fractions.";
  else if (title.length > SYLLABUS_LIMITS.title) errors.title = `Keep it under ${SYLLABUS_LIMITS.title} characters.`;
  const days = plannedDays(text(formData, "startsOn"), text(formData, "endsOn"));
  if (!days) errors.endsOn = "Choose the days it is planned for: the first not after the last, up to a year.";
  if (Object.keys(errors).length) return { errors, values };
  const topics = await store.listSchoolSyllabusTopics(app.id, { unitIds: [unit.id] });
  if (id === null && topics.length >= SYLLABUS_LIMITS.topicsPerUnit) return { message: `A unit can have up to ${SYLLABUS_LIMITS.topicsPerUnit} lessons or topics.`, values };
  if (id !== null && !topics.some((t) => t.id === id)) return { message: "This lesson or topic doesn't exist anymore." };
  await store.saveSchoolSyllabusTopic({ id, appId: app.id, unitId: unit.id, title, ...days! }, new Date());
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the syllabus topic "${title}"`);
  refresh();
  return { ok: true, message: "Saved.", values: id ? values : {} };
}

export async function deleteSyllabusTopicAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const [topic] = id !== null ? await store.listSchoolSyllabusTopics(context.app.id, { ids: [id] }) : [];
  if (!topic) return;
  await store.deleteSchoolSyllabusTopic(context.app.id, topic.id);
  await recordStaffChange(context, `Deleted the syllabus topic "${topic.title}"`);
  refresh();
}

/** A syllabus from a CSV file: units and topics found by their names are kept (their days updated), the others added. */
export async function importSyllabusAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const now = new Date();
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { errors: { file: "Choose a CSV file." } };
  if (file.size > CSV_MAX_BYTES) return { errors: { file: "The file can be up to 2 MB." } };
  const parsed = parseSyllabusCsv(await file.text());
  if (!parsed.ok) return { errors: { file: parsed.message } };
  const [subjects, classes] = await Promise.all([store.listSchoolSubjects(app.id), store.listSchoolClasses(app.id)]);
  const grades = schoolGrades(classes);
  const subjectByName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));
  const gradeByName = new Map(grades.map((g) => [g.toLowerCase(), g]));
  const problems = [...parsed.problems];
  let added = 0;
  let updated = 0;
  const units = await store.listSchoolSyllabusUnits(app.id);
  const topics = await store.listSchoolSyllabusTopics(app.id, { unitIds: units.map((u) => u.id) });
  for (const row of parsed.rows) {
    const subject = subjectByName.get(row.subject.toLowerCase());
    if (!subject) {
      problems.push(`Line ${row.line}: there's no subject named ${row.subject}.`);
      continue;
    }
    const grade = gradeByName.get(row.grade.toLowerCase());
    if (!grade) {
      problems.push(`Line ${row.line}: none of your classes is in the grade ${row.grade}.`);
      continue;
    }
    let unit = units.find((u) => u.subjectId === subject.id && u.grade === grade && u.title.toLowerCase() === row.unit.toLowerCase());
    if (!unit) {
      if (units.filter((u) => u.subjectId === subject.id && u.grade === grade).length >= SYLLABUS_LIMITS.unitsPerSubject) {
        problems.push(`Line ${row.line}: a subject can have up to ${SYLLABUS_LIMITS.unitsPerSubject} units.`);
        continue;
      }
      unit = (await store.saveSchoolSyllabusUnit({ id: null, appId: app.id, subjectId: subject.id, grade, title: row.unit }, now))!;
      units.push(unit);
    }
    const same = topics.find((t) => t.unitId === unit.id && t.title.toLowerCase() === row.topic.toLowerCase());
    if (same) {
      await store.saveSchoolSyllabusTopic({ ...same, startsOn: row.startsOn, endsOn: row.endsOn }, now);
      updated += 1;
      continue;
    }
    if (topics.filter((t) => t.unitId === unit.id).length >= SYLLABUS_LIMITS.topicsPerUnit) {
      problems.push(`Line ${row.line}: a unit can have up to ${SYLLABUS_LIMITS.topicsPerUnit} lessons or topics.`);
      continue;
    }
    const made = await store.saveSchoolSyllabusTopic({ id: null, appId: app.id, unitId: unit.id, title: row.topic, startsOn: row.startsOn, endsOn: row.endsOn }, now);
    if (made) topics.push(made);
    added += 1;
  }
  await recordStaffChange(context, `Imported the syllabus: ${added} added, ${updated} updated`);
  refresh();
  const errors = Object.fromEntries(problems.slice(0, 50).map((problem, i) => [`line-${i}`, problem]));
  return { ok: added + updated > 0 || problems.length === 0, message: `Imported: ${added} added, ${updated} updated.`, ...(problems.length ? { errors } : {}) };
}

// Progress

/** The class and the topic of its grade's syllabus a form names. */
async function classTopic(app: App, formData: FormData) {
  const store = await getStore();
  const classId = idOf(formData, "classId");
  const topicId = idOf(formData, "topicId");
  const klass = classId !== null ? (await store.listSchoolClasses(app.id)).find((c) => c.id === classId) : undefined;
  const [topic] = topicId !== null ? await store.listSchoolSyllabusTopics(app.id, { ids: [topicId] }) : [];
  const unit = topic && klass ? (await store.listSchoolSyllabusUnits(app.id, { grade: syllabusGradeOf(klass) })).find((u) => u.id === topic.unitId) : undefined;
  return klass && topic && unit ? { store, klass, topic } : null;
}

/** A topic covered by a class on a day (today or before), with a note. */
export async function markTopicAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const now = new Date();
  const found = await classTopic(app, formData);
  if (!found) return { message: "This lesson or topic doesn't exist anymore." };
  const { store, klass, topic } = found;
  const today = schoolToday(schoolSettingsOf(await store.getSchoolSettings(app.id), app), now);
  const day = text(formData, "coveredOn") || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today || day < addDays(today, -365)) return { errors: { coveredOn: "Choose today or a day in the last year." } };
  const note = text(formData, "note");
  if (note.length > SYLLABUS_LIMITS.note) return { errors: { note: `Keep it under ${SYLLABUS_LIMITS.note} characters.` } };
  await store.saveSchoolTopicProgress({ appId: app.id, classId: klass.id, topicId: topic.id, coveredOn: day, note: note || null, teacherId: null, updatedAt: now });
  await recordStaffChange(context, `Marked "${topic.title}" covered in "${klass.name}"`);
  refresh();
  return { ok: true, message: "Saved." };
}

export async function unmarkTopicAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const found = await classTopic(context.app, formData);
  if (!found) return;
  await found.store.deleteSchoolTopicProgress(context.app.id, found.klass.id, found.topic.id);
  await recordStaffChange(context, `Marked "${found.topic.title}" not covered in "${found.klass.name}"`);
  refresh();
}

// Templates

export async function saveReportTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const parsed = parseTemplateForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const all = await store.listSchoolReportTemplates(app.id);
  const found = id !== null ? all.find((t) => t.id === id) : undefined;
  if (id !== null && !found) return { message: "This template doesn't exist anymore." };
  if (id === null && all.length >= REPORT_LIMITS.templates) return { message: `You can have up to ${REPORT_LIMITS.templates} templates.`, values };
  // A template keeps its kind.
  await store.saveSchoolReportTemplate({ id, appId: app.id, kind: found?.kind ?? parsed.value.kind, name: parsed.value.name, fields: found?.fields ?? [] }, new Date());
  await recordStaffChange(context, `${id ? "Renamed" : "Added"} the report template "${parsed.value.name}"`);
  refresh();
  return { ok: true, message: id ? "Saved." : "Added. Now add its fields.", values: id ? values : {} };
}

/** The ready-made template of a kind, in the dashboard's language. */
export async function addSuggestedTemplateAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const store = await getStore();
  const kind = String(formData.get("kind") ?? "") as SchoolReportKind;
  if (!SCHOOL_REPORT_KINDS.includes(kind)) return;
  if ((await store.listSchoolReportTemplates(context.app.id)).length >= REPORT_LIMITS.templates) return;
  const { t } = await dashboardText();
  const words =
    kind === "student"
      ? { name: t("reports.suggestedStudent"), labels: [t("reports.fieldLevel"), t("reports.fieldBehaviour"), t("reports.fieldAttendance"), t("reports.fieldStrengths"), t("reports.fieldNext")] }
      : { name: t("reports.suggestedClass"), labels: [t("reports.fieldSummary"), t("reports.fieldClassLevel"), t("reports.fieldWorked"), t("reports.fieldClassNext")] };
  await store.saveSchoolReportTemplate({ id: null, appId: context.app.id, ...suggestedTemplate(kind, words) }, new Date());
  await recordStaffChange(context, `Added the ready-made report template "${words.name}"`);
  refresh();
}

export async function deleteReportTemplateAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  const store = await getStore();
  const template = id !== null ? await store.getSchoolReportTemplate(context.app.id, id) : null;
  if (!template) return;
  await store.deleteSchoolReportTemplate(context.app.id, template.id);
  await recordStaffChange(context, `Deleted the report template "${template.name}"`);
  refresh();
}

export async function addTemplateFieldAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const template = id !== null ? await store.getSchoolReportTemplate(app.id, id) : null;
  if (!template) return { message: "This template doesn't exist anymore." };
  const parsed = parseFieldForm(values, template.fields);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.saveSchoolReportTemplate({ ...template, fields: [...template.fields, parsed.value] }, new Date());
  await recordStaffChange(context, `Added the field "${parsed.value.label}" to the report template "${template.name}"`);
  refresh();
  return { ok: true, message: "Added. Reports started from now on have it.", values: {} };
}

/** A field removed (`remove`) or moved up or down (`up`, `down`). */
export async function changeTemplateFieldAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const template = id !== null ? await store.getSchoolReportTemplate(app.id, id) : null;
  const field = String(formData.get("field") ?? "");
  if (!template || !template.fields.some((f) => f.id === field)) return;
  const what = formData.get("change");
  const fields = what === "remove" ? template.fields.filter((f) => f.id !== field) : moveField(template.fields, field, what === "up" ? -1 : 1);
  await store.saveSchoolReportTemplate({ ...template, fields }, new Date());
  if (what === "remove") await recordStaffChange(context, `Removed a field from the report template "${template.name}"`);
  refresh();
}

// The teachers' reports

/** A comment, a send-back for changes or the approval of a teacher's report; the teacher is told in the app. */
export async function reviewTeacherReportAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const report = id !== null ? await store.getSchoolReport(app.id, id) : null;
  if (!report || report.status === "draft") return { message: "This report doesn't exist anymore." };
  const action = String(formData.get("action") ?? "") as ReviewAction;
  if (!["comment", "return", "approve"].includes(action)) return { message: "Choose what to do." };
  const note = text(formData, "text");
  if (note.length > REPORT_LIMITS.comment) return { errors: { text: `Keep it under ${REPORT_LIMITS.comment} characters.` }, values: formValues(formData) };
  if ((action === "comment" || action === "return") && !note) return { errors: { text: action === "return" ? "Write what the teacher should change." : "Write your comment." } };
  const done = await reviewReport({ store, app, now: new Date() }, report, action, note, app.appName?.trim() || "The school");
  if (!done) return { message: "This report changed in the meantime. Open it again." };
  await recordStaffChange(context, `${action === "approve" ? "Approved" : action === "return" ? "Sent back" : "Commented on"} the report "${report.templateName}" of ${report.teacherName}`);
  refresh();
  return {
    ok: true,
    message: action === "approve" ? "Approved. The teacher was told in the app." : action === "return" ? "Sent back. The teacher was told what to change in the app." : "Sent. The teacher was told in the app.",
  };
}

/** An approved student report shared with the student's parents (they are told in the app), or no longer. */
export async function shareTeacherReportAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const report = id !== null ? await store.getSchoolReport(app.id, id) : null;
  if (!report) return;
  const share = formData.get("share") === "1";
  if (await shareReport({ store, app, now: new Date() }, report, share)) {
    await recordStaffChange(context, `${share ? "Shared" : "Stopped sharing"} the report "${report.templateName}" with the parents`);
  }
  refresh();
}
