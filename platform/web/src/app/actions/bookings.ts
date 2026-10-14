"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { parseRules, parseService, parseStaff } from "@/lib/bookings/forms";
import { bookingSetup } from "@/lib/bookings/setup";
import { getStore } from "@/lib/data";
import type { App, BookingSetup, BookingStatus } from "@/lib/data/types";
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

const STAFF_FIELDS = ["id", "name", "title", "daysOff", ...[0, 1, 2, 3, 4, 5, 6].flatMap((d) => [`start${d}`, `end${d}`])];

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
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  if (existing) {
    await saveSetup(app, { ...setup, staff: setup.staff.map((s) => (s.id === existing.id ? { ...existing, ...parsed.value, imageAssetId: existing.imageAssetId } : s)) });
    return { ok: true, message: `Saved ${parsed.value.name}.`, values: v };
  }
  await saveSetup(app, { ...setup, staff: [...setup.staff, { id: setup.nextId, ...parsed.value }], nextId: setup.nextId + 1 });
  return { ok: true, message: `Added ${parsed.value.name}.` };
}

export async function deleteBookingStaffAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  const setup = bookingSetup(app);
  await saveSetup(app, { ...setup, staff: setup.staff.filter((s) => s.id !== id) });
}

/** What the business can do with an appointment in each status. */
const NEXT: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending: ["approved", "rejected"],
  approved: ["cancelled", "completed", "no_show"],
};

export async function setAppointmentStatusAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const store = await getStore();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as BookingStatus;
  const appointment = Number.isSafeInteger(id) ? await store.getBookingAppointment(app.id, id) : null;
  if (appointment && NEXT[appointment.status]?.includes(status)) {
    await store.updateBookingAppointment(app.id, id, { status, updatedAt: new Date() });
  }
  revalidatePath("/dashboard/appointments");
}
