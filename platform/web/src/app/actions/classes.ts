"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { classWhen, parseClassTemplate, syncClassSessions } from "@/lib/bookings/classes";
import { membershipEnd, parseMembershipPlan } from "@/lib/bookings/memberships";
import { bookingSetup } from "@/lib/bookings/setup";
import { getStore } from "@/lib/data";
import type { App, BookingSetup } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { notifyClassCancelled, serviceAccountOf } from "@/lib/hosted/notify";
import { parseAnyPhone } from "@/lib/hosted/phone";
import { hostedSettings } from "@/lib/hosted/service";

/** 27 The Timetable, Membership plans and Members pages: bookings managed in the dashboard only. */
async function requireBookingsApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("bookings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "bookings") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const values = (formData: FormData, names: string[]) => Object.fromEntries(names.map((n) => [n, String(formData.get(n) ?? "").trim()]));

/** Saves the setup; with the timetable changed, the coming weeks' classes follow at once. */
async function saveSetup(app: App, setup: BookingSetup, timetable: boolean): Promise<void> {
  const store = await getStore();
  const now = new Date();
  await store.updateApp(app.id, { bookingSetup: setup }, now);
  if (timetable) await syncClassSessions(store, { id: app.id, bookingSetup: setup }, now);
  revalidatePath("/dashboard/timetable");
  revalidatePath("/dashboard/memberships");
  revalidatePath("/dashboard/members");
}

const TEMPLATE_FIELDS = ["id", "serviceId", "staffId", "weekday", "time", "duration", "capacity"];

/** Adds a class to the weekly timetable, or edits one (`id`). */
export async function saveClassTemplateAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const v = values(formData, TEMPLATE_FIELDS);
  v.active = formData.get("active") === "on" ? "on" : "";
  const setup = bookingSetup(app);
  const id = v.id ? Number(v.id) : null;
  const existing = id === null ? null : setup.classTemplates.find((t) => t.id === id);
  if (id !== null && !existing) return { message: "This class is no longer on the timetable." };
  const parsed = parseClassTemplate(v, setup);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  const name = setup.services.find((s) => s.id === parsed.value.serviceId)?.name ?? "The class";
  if (existing) {
    await saveSetup(app, { ...setup, classTemplates: setup.classTemplates.map((t) => (t.id === existing.id ? { ...existing, ...parsed.value } : t)) }, true);
    return { ok: true, message: `Saved ${name}. The coming weeks follow it; classes someone booked keep their time.`, values: v };
  }
  await saveSetup(app, { ...setup, classTemplates: [...setup.classTemplates, { id: setup.nextId, ...parsed.value }], nextId: setup.nextId + 1 }, true);
  return { ok: true, message: `Added ${name} to the timetable. Its classes for the next 8 weeks are in the app.` };
}

/** Takes a class off the timetable: its coming classes go, except ones someone booked (cancel those below). */
export async function deleteClassTemplateAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  const setup = bookingSetup(app);
  await saveSetup(app, { ...setup, classTemplates: setup.classTemplates.filter((t) => t.id !== id) }, true);
}

/** Calls one class off: spots and credits go back, and everyone who booked is told in the app. */
export async function cancelClassSessionAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  const store = await getStore();
  const session = await store.getClassSession(app.id, id);
  if (!session) return;
  const now = new Date();
  const released = await store.cancelClassSession(app.id, id, now);
  const userIds = released.map((b) => b.userId).filter((u): u is number => u !== null);
  if (userIds.length && !app.demo) {
    await notifyClassCancelled({
      store,
      app,
      className: session.serviceName,
      when: classWhen(session.startAt, bookingSetup(app).rules.timezone),
      userIds,
      account: serviceAccountOf(app, encryptionKey()),
      now,
    }).catch((e: unknown) => {
      // The class is cancelled either way; the app shows it.
      console.error(`[classes] cancel notice for app ${app.id}: ${e instanceof Error ? e.message : String(e)}`);
    });
  }
  revalidatePath("/dashboard/timetable");
}

/** "Classes need a membership". */
export async function saveMembershipRulesAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const required = formData.get("membershipRequired") === "on";
  await saveSetup(app, { ...bookingSetup(app), membershipRequired: required }, false);
  return {
    ok: true,
    message: required ? "Saved. Booking a class now needs a membership; plans with classes use one each." : "Saved. Anyone signed in can book a class.",
    values: { membershipRequired: required ? "on" : "" },
  };
}

const PLAN_FIELDS = ["id", "name", "price", "period", "credits", "description"];

/** Adds or edits a membership plan. Plans are taken off sale, never deleted, so memberships keep their plan. */
export async function saveMembershipPlanAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const v = values(formData, PLAN_FIELDS);
  v.active = formData.get("active") === "on" ? "on" : "";
  const setup = bookingSetup(app);
  const id = v.id ? Number(v.id) : null;
  const existing = id === null ? null : setup.membershipPlans.find((p) => p.id === id);
  if (id !== null && !existing) return { message: "This plan no longer exists." };
  const parsed = parseMembershipPlan(v);
  if (!parsed.ok) return { errors: parsed.errors, values: v };
  if (existing) {
    await saveSetup(app, { ...setup, membershipPlans: setup.membershipPlans.map((p) => (p.id === existing.id ? { ...existing, ...parsed.value } : p)) }, false);
    return { ok: true, message: `Saved “${parsed.value.name}”. Memberships already bought keep what they were sold with.`, values: v };
  }
  await saveSetup(app, { ...setup, membershipPlans: [...setup.membershipPlans, { id: setup.nextId, ...parsed.value }], nextId: setup.nextId + 1 }, false);
  return { ok: true, message: `Added “${parsed.value.name}”.` };
}

/** Gives a member a membership paid another way, by the phone number or email address they sign in with. */
export async function giveMembershipAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const v = values(formData, ["who", "planId"]);
  const plan = bookingSetup(app).membershipPlans.find((p) => p.id === Number(v.planId));
  if (!plan) return { errors: { planId: "Choose a plan." }, values: v };
  const store = await getStore();
  const email = v.who!.includes("@") ? v.who!.toLowerCase() : null;
  const phone = email ? null : parseAnyPhone(v.who!, hostedSettings(app).defaultCountryCode);
  if (!email && !phone) return { errors: { who: "Enter their mobile number or email address." }, values: v };
  const user = email ? await store.getHostedEmailUser(app.id, email) : await store.getHostedUserByPhone(app.id, phone!.e164);
  if (!user) return { errors: { who: "No one with this number or address has signed in to your app yet." }, values: v };
  const now = new Date();
  await store.createMembership({
    appId: app.id,
    userId: user.id,
    planId: plan.id,
    planName: plan.name,
    period: plan.period,
    creditsLeft: plan.credits,
    status: "active",
    startsAt: now,
    endsAt: membershipEnd(plan.period, now),
    orderId: null,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/dashboard/members");
  return { ok: true, message: `${user.name} now has “${plan.name}”.` };
}

/** Adds classes to a membership with credits, or takes some away (a negative number). */
export async function addMembershipCreditsAction(_: FormState, formData: FormData): Promise<FormState> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  const text = String(formData.get("credits") ?? "").trim();
  const credits = /^-?\d{1,4}$/.test(text) ? Number(text) : Number.NaN;
  if (!Number.isInteger(credits) || credits === 0 || Math.abs(credits) > 1000) {
    return { errors: { credits: "Enter a number of classes, like 5 (or -1 to take one away)." }, values: { credits: text } };
  }
  const store = await getStore();
  const membership = await store.getMembership(app.id, id);
  if (!membership) return { message: "This membership no longer exists." };
  if (membership.creditsLeft === null) return { message: "This membership has unlimited classes." };
  await store.addMembershipCredits(app.id, id, credits, new Date());
  revalidatePath("/dashboard/members");
  return { ok: true, message: credits > 0 ? `Added ${credits === 1 ? "1 class" : `${credits} classes`}.` : `Took away ${-credits === 1 ? "1 class" : `${-credits} classes`}.` };
}

/** Ends a membership now (a refund or a mistake). */
export async function cancelMembershipAction(formData: FormData): Promise<void> {
  const { app } = await requireBookingsApp();
  const id = Number(formData.get("id"));
  await (await getStore()).updateMembership(app.id, id, { status: "cancelled", updatedAt: new Date() });
  revalidatePath("/dashboard/members");
}
