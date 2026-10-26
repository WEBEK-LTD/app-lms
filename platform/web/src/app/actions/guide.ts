"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";

/** 93.1 Overview › Your first app: hide the guide, or show it again. */
export async function setGuideAction(formData: FormData): Promise<void> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard");
  const hide = formData.get("guide") === "hide";
  await (await getStore()).updateApp(app.id, { guideHiddenAt: hide ? new Date() : null }, new Date());
  await recordStaffChange(context, hide ? "Hid the guide through the first app" : "Showed the guide through the first app");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
