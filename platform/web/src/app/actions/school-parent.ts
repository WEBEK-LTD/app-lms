"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { formValues, type FormState } from "@/lib/forms";
import { answerExcuse, PARENT_LIMITS, parsePickupNoteForm, parsePickupPersonForm, parseSlipForm, sendSlip } from "@/lib/school/parent";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";

/**
 * 113.4 The parent's area on the dashboard: permission slips sent and
 * changed, parents' absence excuses accepted or declined, and the pick-up
 * list and one-day notes the office writes when a parent calls.
 */

async function requireSchoolApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "school") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

function refresh() {
  for (const path of ["slips", "excuses", "people", "checkin", "attendance"]) {
    revalidatePath(`/dashboard/school/${path}`, "layout");
    revalidatePath(`/studio/project/school/${path}`, "layout");
  }
}

const idOf = (formData: FormData, name = "id"): number | null => {
  const n = Number(formData.get(name));
  return formData.get(name) && Number.isSafeInteger(n) ? n : null;
};

function whoActs(context: ClientContext): string {
  const person = context.member ?? context.staff ?? context.user;
  return (person.name || person.email).slice(0, 191);
}

async function todayOf(app: App): Promise<string> {
  const settings = schoolSettingsOf(await (await getStore()).getSchoolSettings(app.id), app);
  return schoolToday(settings, new Date());
}

// Permission slips

export async function saveSlipAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const id = idOf(formData);
  const existing = id !== null ? await store.getSchoolSlip(app.id, id) : null;
  if (id !== null && !existing) return { message: "This slip doesn't exist anymore." };
  if (!existing && (await store.listSchoolSlips(app.id)).length >= PARENT_LIMITS.slips) return { message: `The school can have up to ${PARENT_LIMITS.slips} slips.`, values };
  const parsed = parseSlipForm(values, await store.listSchoolClasses(app.id), await todayOf(app), existing);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const saved = await sendSlip({ store, app, now: new Date() }, { ...parsed.value, appId: app.id, id });
  if (!saved) return { message: "This slip doesn't exist anymore." };
  await recordStaffChange(context, `${existing ? "Changed" : "Sent"} the permission slip "${saved.title}"`);
  refresh();
  return { ok: true, message: existing ? "Saved." : "Sent. The parents were told in the app." };
}

export async function deleteSlipAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const slip = id !== null ? await store.getSchoolSlip(app.id, id) : null;
  if (slip) {
    await store.deleteSchoolSlip(app.id, slip.id);
    await recordStaffChange(context, `Deleted the permission slip "${slip.title}"`);
  }
  refresh();
  redirect("/dashboard/school/slips");
}

// Absence excuses

export async function answerExcuseAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const id = idOf(formData);
  const excuse = id !== null ? await store.getSchoolExcuse(app.id, id) : null;
  if (!excuse) return { message: "This excuse doesn't exist anymore." };
  const status = formData.get("answer") === "accepted" ? "accepted" : formData.get("answer") === "declined" ? "declined" : null;
  if (!status) return { message: "Choose to accept or decline it." };
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > PARENT_LIMITS.answer) return { errors: { note: `Keep it under ${PARENT_LIMITS.answer} characters.` } };
  if (status === "declined" && !note) return { errors: { note: "Write why it is declined." } };
  const student = await store.getSchoolPerson(app.id, excuse.studentId);
  const done = await answerExcuse({ store, app, now: new Date() }, excuse, status, note || null, whoActs(context));
  if (!done) return { message: "This excuse was answered or withdrawn already." };
  await recordStaffChange(context, `${status === "accepted" ? "Accepted" : "Declined"} the absence excuse of "${student?.name ?? "a student"}" from ${excuse.startsOn} to ${excuse.endsOn}`);
  refresh();
  return { ok: true, message: status === "accepted" ? "Accepted. Those days are excused, and the parents were told in the app." : "Declined. The parents were told in the app, with your note." };
}

// Pick-up

async function studentOf(app: App, formData: FormData) {
  const id = idOf(formData, "studentId");
  const person = id !== null ? await (await getStore()).getSchoolPerson(app.id, id) : null;
  return person && person.role === "student" ? person : null;
}

export async function addPickupPersonAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const student = await studentOf(app, formData);
  if (!student) return { message: "This student doesn't exist anymore." };
  const parsed = parsePickupPersonForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const before = await store.getSchoolPickup(app.id, student.id);
  const people = before?.people ?? [];
  if (people.length >= PARENT_LIMITS.people) return { message: `Up to ${PARENT_LIMITS.people} people.`, values };
  await store.saveSchoolPickup({ appId: app.id, studentId: student.id, people: [...people, parsed.value], updatedBy: whoActs(context), updatedAt: new Date() });
  await recordStaffChange(context, `Added "${parsed.value.name}" to the pick-up list of "${student.name}"`);
  refresh();
  return { ok: true, message: "Added to the pick-up list." };
}

export async function removePickupPersonAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const student = await studentOf(app, formData);
  const at = Number(formData.get("index"));
  const before = student ? await store.getSchoolPickup(app.id, student.id) : null;
  const person = before?.people[at];
  if (student && before && person) {
    await store.saveSchoolPickup({ ...before, people: before.people.filter((_, i) => i !== at), updatedBy: whoActs(context), updatedAt: new Date() });
    await recordStaffChange(context, `Took "${person.name}" off the pick-up list of "${student.name}"`);
  }
  refresh();
}

export async function savePickupNoteAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const values = formValues(formData);
  const student = await studentOf(app, formData);
  if (!student) return { message: "This student doesn't exist anymore." };
  const parsed = parsePickupNoteForm(values, await todayOf(app));
  if (!parsed.ok) return { errors: parsed.errors, values };
  await store.saveSchoolPickupNote({ appId: app.id, studentId: student.id, ...parsed.value, writtenBy: whoActs(context), createdAt: new Date() });
  await recordStaffChange(context, `Wrote who picks up "${student.name}" on ${parsed.value.date}`);
  refresh();
  return { ok: true, message: "Saved. It shows on the day's board." };
}

export async function deletePickupNoteAction(formData: FormData): Promise<void> {
  const context = await requireSchoolApp();
  const { app } = context;
  const store = await getStore();
  const student = await studentOf(app, formData);
  const date = String(formData.get("date") ?? "");
  if (student) await store.deleteSchoolPickupNote(app.id, student.id, date);
  refresh();
}
