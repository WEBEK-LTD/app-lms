"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { isTimeZone } from "@/lib/analytics/zone";
import { getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";

/**
 * 47 Analytics › Time zone: the zone the app's days are counted in from now
 * on. Days already counted keep the zone they were counted in.
 */
export async function saveAnalyticsZoneAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getClientContext();
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
