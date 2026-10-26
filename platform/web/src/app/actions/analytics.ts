"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { isTimeZone } from "@/lib/analytics/zone";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";

/**
 * 47 Analytics › Time zone: the zone the app's days are counted in from now
 * on. Days already counted keep the zone they were counted in.
 */
export async function saveAnalyticsZoneAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("analytics");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard");
  const zone = String(formData.get("zone") ?? "").trim();
  if (!isTimeZone(zone)) return { errors: { zone: "Choose a time zone from the list." }, values: { zone } };
  await (await getStore()).updateApp(app.id, { timeZone: zone }, new Date());
  await recordStaffChange(context, `Set the Analytics time zone to ${zone}`);
  revalidatePath("/dashboard/analytics");
  return { ok: true, message: `Time zone saved: days are counted in ${zone.replace(/_/g, " ")} from now on.`, values: { zone } };
}

/** 86.4 Analytics › Weekly summary by email: on or off for this app. */
export async function setWeeklySummaryAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("analytics");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard");
  const on = formData.get("weekly") === "on";
  await (await getStore()).updateApp(app.id, { weeklySummary: on }, new Date());
  await recordStaffChange(context, on ? "Turned on the weekly summary email" : "Turned off the weekly summary email");
  revalidatePath("/dashboard/analytics");
  return { ok: true, message: on ? "Weekly summary turned on: the next one comes on Monday." : "Weekly summary turned off." };
}
