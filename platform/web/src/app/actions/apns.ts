"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard, type ClientContext } from "@/lib/auth/session";
import { recordStaffChange } from "@/lib/admin/audit";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { apnsKeyApplies, readApnsKeyForm, REMOVE_APNS_KEY } from "@/lib/integrations/apns-key";
import { isStudioProject, studioPathFor } from "@/lib/studio/section";

/**
 * 136.20 The client's APNs key on the Notifications page (the Publishing
 * step of the setup saves it with its other keys, savePublishingAction):
 * checked with Apple, then saved encrypted; or removed.
 */

async function requireApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard");
  return context as ClientContext & { app: App };
}

export async function saveApnsKeyAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await requireApp();
  const { app } = context;
  if (!apnsKeyApplies(app)) return { message: "This app's iPhone notifications go through your own Firebase project." };
  const result = await readApnsKeyForm(app, formData, { key: encryptionKey() });
  if (Object.keys(result.errors).length > 0) return { errors: result.errors, values: result.values };
  if (!result.message) return { errors: { apnsKeyFile: "Upload your APNs key (.p8)." }, values: result.values };
  await (await getStore()).updateApp(app.id, result.patch, new Date());
  await recordStaffChange(context, `Saved the APNs key (key ${String(result.patch.apnsKeyId ?? "")}, team ${String(result.patch.apnsTeamId ?? "")})`);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: result.message };
}

/** Removes the key: from their next start iPhones send their Firebase token again. `back`: "setup" returns to the Publishing step (in Studio's frame for a Studio project). */
export async function removeApnsKeyAction(formData: FormData): Promise<void> {
  const context = await requireApp();
  await (await getStore()).updateApp(context.app.id, REMOVE_APNS_KEY, new Date());
  await recordStaffChange(context, "Removed the APNs key");
  revalidatePath("/dashboard", "layout");
  const setup = "/dashboard/setup?step=publishing";
  redirect(formData.get("back") === "setup" ? (isStudioProject(context.app) ? (studioPathFor(setup) ?? setup) : setup) : "/dashboard/notifications");
}
