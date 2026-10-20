"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { parseRules, parseService, parseStaff } from "@/lib/bookings/forms";
import { parseIntakeField, parseStaffProfile } from "@/lib/bookings/intake";
import { bookingSetup } from "@/lib/bookings/setup";
import { getStore } from "@/lib/data";
import type { App, BookingSetup } from "@/lib/data/types";
import { changeAppointmentStatus } from "@/lib/bookings/appointments";
import type { FormState } from "@/lib/forms";

/** A client whose bookings are managed in the dashboard, or a redirect. */
async function requireBookingsApp(): Promise<ClientContext & { app: App }> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "bookings") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

async function saveSetup(app: App, setup: BookingSetup): Promise<void> {
  await (await getStore()).updateApp(app.id, { bookingSetup: setup }, new Date());
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/appointments");
}

const values = (formData: FormData, names: string[]) => Object.fromEntries(names.map((n) => [n, String(formData.get(n) ?? "").trim()]));

export async function saveBookingRulesAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const v = values(formData, ["timezone", "currency", "slotStep", "minHoursAhead", "maxDaysAhead", "cancelHours"]);
  v.notes = formData.get("notes") === "on" ? "on" : "";
  v.autoApprove = formData.get("autoApprove") === "on" ? "on" : "";
  const parsed = parseRules(v);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  await saveSetup(app, { ...bookingSetup(app), rules: parsed.value });
  return { ok: true, message: "Booking rules saved. The app uses them now.", values: v };
}

export async function addBookingCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 60) return { errors: { name: "Enter a name of up to 60 characters." }, values: { name } };
  const setup = bookingSetup(app);
  await saveSetup(app, { ...setup, categories: [...setup.categories, { id: setup.nextId, name }], nextId: setup.nextId + 1 });
  return { ok: true, message: `Added “${name}”.` };
}

export async function deleteBookingCategoryAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  const setup = bookingSetup(app);
  await saveSetup(app, {
    ...setup,
    categories: setup.categories.filter((c) => c.id !== id),
    services: setup.services.map((s) => (s.categoryId === id ? { ...s, categoryId: null } : s)),
  });
}

const SERVICE_FIELDS = ["id", "name", "duration", "price", "categoryId", "description", "color"];

export async function saveBookingServiceAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const v = values(formData, SERVICE_FIELDS);
  v.active = formData.get("active") === "on" ? "on" : "";
  const setup = bookingSetup(app);
  const id = v.id ? Number(v.id) : null;
  const existing = id === null ? null : setup.services.find((s) => s.id === id);
  if (id !== null && !existing) return { message: "This service no longer exists." };
  const parsed = parseService(v, setup);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  if (existing) {
    await saveSetup(app, { ...setup, services: setup.services.map((s) => (s.id === existing.id ? { ...existing, ...parsed.value, imageAssetId: existing.imageAssetId } : s)) });
    return { ok: true, message: `Saved “${parsed.value.name}”.`, values: v };
  }
  await saveSetup(app, { ...setup, services: [...setup.services, { id: setup.nextId, ...parsed.value }], nextId: setup.nextId + 1 });
  return { ok: true, message: `Added “${parsed.value.name}”. Choose who provides it under Team.` };
}

export async function deleteBookingServiceAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  const setup = bookingSetup(app);
  await saveSetup(app, {
    ...setup,
    services: setup.services.filter((s) => s.id !== id),
    staff: setup.staff.map((m) => ({ ...m, serviceIds: m.serviceIds.filter((s) => s !== id) })),
  });
}

const STAFF_FIELDS = ["id", "name", "title", "daysOff", "specialties", "languages", "bio", ...[0, 1, 2, 3, 4, 5, 6].flatMap((d) => [`start${d}`, `end${d}`])];

export async function saveBookingStaffAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const v = values(formData, STAFF_FIELDS);
  for (let d = 0; d < 7; d += 1) v[`open${d}`] = formData.get(`open${d}`) === "on" ? "on" : "";
  v.active = formData.get("active") === "on" ? "on" : "";
  const serviceIds = formData.getAll("serviceIds").map(Number);
  v.serviceIds = serviceIds.join(",");
  const setup = bookingSetup(app);
  const id = v.id ? Number(v.id) : null;
  const existing = id === null ? null : setup.staff.find((s) => s.id === id);
  if (id !== null && !existing) return { message: "This team member no longer exists." };
  const parsed = parseStaff(v, setup, serviceIds);
  // 21 Their profile in the app: specialties, languages and a short introduction.
  const profile = parseStaffProfile(v);
  if (!parsed.ok || !profile.ok) return { errors: { ...(parsed.ok ? {} : parsed.errors), ...(profile.ok ? {} : profile.errors) }, values: v };
  const member = { ...parsed.value, ...profile.value };
  if (existing) {
    await saveSetup(app, { ...setup, staff: setup.staff.map((s) => (s.id === existing.id ? { ...existing, ...member, imageAssetId: existing.imageAssetId } : s)) });
    return { ok: true, message: `Saved ${member.name}.`, values: v };
  }
  await saveSetup(app, { ...setup, staff: [...setup.staff, { id: setup.nextId, ...member }], nextId: setup.nextId + 1 });
  return { ok: true, message: `Added ${member.name}.` };
}

export async function deleteBookingStaffAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  const setup = bookingSetup(app);
  await saveSetup(app, { ...setup, staff: setup.staff.filter((s) => s.id !== id) });
}

/** 21 Adds or edits a question of the intake form (`id` when editing). */
export async function saveIntakeFieldAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const v = values(formData, ["id", "label", "type"]);
  v.options = String(formData.get("options") ?? "");
  v.required = formData.get("required") === "on" ? "on" : "";
  const setup = bookingSetup(app);
  const editing = v.id ? (setup.intakeFields.find((f) => f.id === v.id) ?? null) : null;
  if (v.id && !editing) return { message: "This question no longer exists." };
  const parsed = parseIntakeField(v, setup.intakeFields, editing);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  const intakeFields = editing ? setup.intakeFields.map((f) => (f.id === editing.id ? parsed.value : f)) : [...setup.intakeFields, parsed.value];
  await saveSetup(app, { ...setup, intakeFields });
  return editing ? { ok: true, message: "Question saved. The app asks it now.", values: v } : { ok: true, message: `Added “${parsed.value.label}”.` };
}

/** 21 Removes a question, or moves it up one place (`move=up`). Answers already given keep the question as asked. */
export async function changeIntakeFieldAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = String(formData.get("id") ?? "");
  const setup = bookingSetup(app);
  const index = setup.intakeFields.findIndex((f) => f.id === id);
  if (index < 0) return;
  const fields = [...setup.intakeFields];
  if (formData.get("move") === "up") {
    if (index === 0) return;
    [fields[index - 1], fields[index]] = [fields[index]!, fields[index - 1]!];
  } else {
    fields.splice(index, 1);
  }
  await saveSetup(app, { ...setup, intakeFields: fields });
}

export async function setAppointmentStatusAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const appointment = Number.isSafeInteger(id) ? await store.getBookingAppointment(app.id, id) : null;
  if (appointment) await changeAppointmentStatus(store, appointment, String(formData.get("status")), new Date());
  revalidatePath("/dashboard/appointments");
}
