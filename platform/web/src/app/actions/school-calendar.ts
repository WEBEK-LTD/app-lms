"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";
import { BEHAVIOUR_LIMITS, behaviourCategories } from "@/lib/school/behaviour";
import { CALENDAR_LIMITS, parseBehaviourAlerts, parseCategoryForm, parseEventForm, parseExamForm } from "@/lib/school/calendar-forms";
import { publishExams, writeBehaviour } from "@/lib/school/flow";
import { schoolSettingsOf } from "@/lib/school/settings";

/**
 * 113.8 The school's Calendar, Exams and Behaviour pages: events, holidays
 * and exam days; the exams' timetable and publishing it (families are
 * told); behaviour categories, merits and notes written by the school, and
 * whom parents are told of.
 */

const PATHS = ["calendar", "exams", "behaviour"];

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

// The calendar

export async function saveSchoolEventAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const classes = await store.listSchoolClasses(app.id);
  if (id !== null && !(await store.getSchoolEvent(app.id, id))) return { message: "This event isn't on the calendar anymore." };
  if (id === null && (await store.listSchoolEvents(app.id)).length >= CALENDAR_LIMITS.events) return { message: `The calendar can have up to ${CALENDAR_LIMITS.events} events.`, values };
  const parsed = parseEventForm(values, classes);
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.saveSchoolEvent({ appId: app.id, id, ...parsed.value }, new Date());
  await recordStaffChange(context, `${id ? "Edited" : "Added"} "${parsed.value.title}" on the school's calendar`);
  refresh();
  return { ok: true, message: "Saved. It is on the calendar in the app.", values: id ? values : {} };
}

export async function deleteSchoolEventAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  if (id === null) return;
  await (await getStore()).deleteSchoolEvent(context.app.id, id);
  await recordStaffChange(context, "Deleted an event from the school's calendar");
  refresh();
}

// The exams' timetable

export async function saveSchoolExamAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const [classes, subjects] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolSubjects(app.id)]);
  const found = id !== null ? await store.getSchoolExam(app.id, id) : null;
  if (id !== null && !found) return { message: "This exam isn't in the timetable anymore." };
  if (id === null && (await store.listSchoolExams(app.id)).length >= CALENDAR_LIMITS.exams) return { message: `The timetable can have up to ${CALENDAR_LIMITS.exams} exams.`, values };
  const parsed = parseExamForm(values, classes, subjects.map((s) => s.id));
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.saveSchoolExam({ appId: app.id, id, ...parsed.value }, new Date());
  await recordStaffChange(context, `${id ? "Edited" : "Added"} an exam on ${parsed.value.date}`);
  refresh();
  return { ok: true, message: found?.published ? "Saved. Families see the change in the app." : "Added as a draft. Publish the timetable when it is ready.", values: id ? values : {} };
}

export async function deleteSchoolExamAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  if (id === null) return;
  await (await getStore()).deleteSchoolExam(context.app.id, id);
  await recordStaffChange(context, "Deleted an exam from the timetable");
  refresh();
}

/** Publishes the chosen drafts (`ids`), or every draft. */
export async function publishSchoolExamsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const chosen = formData
    .getAll("ids")
    .map(Number)
    .filter((n) => Number.isSafeInteger(n));
  const drafts = (await store.listSchoolExams(app.id, { published: false })).map((e) => e.id);
  const ids = chosen.length > 0 ? chosen.filter((id) => drafts.includes(id)) : drafts;
  if (ids.length === 0) return { message: "There are no drafts to publish." };
  const published = await publishExams({ store, app, now: new Date() }, ids);
  await recordStaffChange(context, `Published ${published.length} exam(s) of the timetable`);
  refresh();
  return { ok: true, message: `Published ${published.length} exam(s). Students and families were told in the app.` };
}

// Behaviour

export async function saveBehaviourCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const saved = await store.listSchoolBehaviourCategories(app.id);
  if (id !== null && !saved.some((c) => c.id === id)) return { message: "This category doesn't exist anymore." };
  if (id === null && saved.length >= BEHAVIOUR_LIMITS.categories) return { message: `You can have up to ${BEHAVIOUR_LIMITS.categories} categories.`, values };
  const parsed = parseCategoryForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const now = new Date();
  await store.saveSchoolBehaviourCategory({ appId: app.id, id, ...parsed.value }, now);
  await markCategoriesSet(app, now);
  await recordStaffChange(context, `${id ? "Edited" : "Added"} the behaviour category "${parsed.value.name}"`);
  refresh();
  return { ok: true, message: "Saved.", values: id ? values : {} };
}

/** Once the school changed its categories, the suggested ones are never added again. */
async function markCategoriesSet(app: App, now: Date) {
  const store = await getStore();
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  if (!settings.behaviourCategoriesSet) await store.saveSchoolSettings(app.id, { ...settings, behaviourCategoriesSet: true }, now);
}

export async function deleteBehaviourCategoryAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  if (id === null) return;
  const now = new Date();
  await (await getStore()).deleteSchoolBehaviourCategory(context.app.id, id);
  await markCategoriesSet(context.app, now);
  await recordStaffChange(context, "Deleted a behaviour category");
  refresh();
}

/** A merit or a note from the school (the dashboard). */
export async function writeBehaviourAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const now = new Date();
  const studentId = idOf(formData, "studentId");
  const student = studentId !== null ? await store.getSchoolPerson(app.id, studentId) : null;
  const category = (await behaviourCategories(store, app, now)).find((c) => c.active && c.id === idOf(formData, "categoryId"));
  const errors: Record<string, string> = {};
  if (!student || student.role !== "student") errors.studentId = "Choose a student.";
  if (!category) errors.categoryId = "Choose one of the school's categories.";
  const note = (values.note ?? "").trim();
  if (note.length > BEHAVIOUR_LIMITS.note) errors.note = `Keep it under ${BEHAVIOUR_LIMITS.note} characters.`;
  if (Object.keys(errors).length) return { errors, values };
  await writeBehaviour({ store, app, now }, { student: student!, category: category!, note: note || null, teacherId: null });
  await recordStaffChange(context, `Wrote "${category!.name}" for ${student!.name}`);
  refresh();
  return { ok: true, message: "Saved. The student's parents see it in the app." };
}

export async function deleteBehaviourAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const id = idOf(formData);
  if (id === null) return;
  await (await getStore()).deleteSchoolBehaviour(context.app.id, id);
  await recordStaffChange(context, "Deleted a behaviour note");
  refresh();
}

export async function saveBehaviourAlertsAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const alerts = parseBehaviourAlerts(values);
  if (!alerts) return { errors: { behaviourAlerts: "Choose whom parents are told of." }, values };
  const settings = schoolSettingsOf(await store.getSchoolSettings(app.id), app);
  await store.saveSchoolSettings(app.id, { ...settings, behaviourAlerts: alerts }, new Date());
  await recordStaffChange(context, "Saved whom parents are told of in behaviour");
  refresh();
  return { ok: true, message: "Saved.", values };
}
