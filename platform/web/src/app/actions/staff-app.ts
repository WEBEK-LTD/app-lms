"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { StaffAppPlace } from "@/lib/data/types";
import { staffAppKindOf } from "@/lib/school/staff-app";
import { isStudioProject } from "@/lib/studio/section";

/**
 * 116 Studio › Settings: where a school's (a university's) or an academy's
 * teachers and staff work, in the staff app of the bundle or in the main
 * app. Saved on the app, read by the app's Config at once.
 */
export async function saveStaffAppAction(formData: FormData): Promise<void> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app || staffAppKindOf(app) === null) redirect("/dashboard");
  const place: StaffAppPlace = formData.get("staffApp") === "same" ? "same" : "bundle";
  const back = isStudioProject(app) ? "/studio/project/setup" : "/dashboard/setup";
  const step = String(formData.get("step") ?? "");
  const stepQuery = /^(branding|listing|publishing)$/.test(step) ? `step=${step}&` : "";
  if (app.staffApp !== place) {
    await (await getStore()).updateApp(app.id, { staffApp: place }, new Date());
    await recordStaffChange(context, place === "bundle" ? "Moved the staff to the staff app" : "Kept the staff in the main app");
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/studio/project", "layout");
  redirect(`${back}?${stepQuery}staff=saved#h-staff-app`);
}
