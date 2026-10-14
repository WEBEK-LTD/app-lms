"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getClientContext, mayUseDashboard } from "@/lib/auth/session";
import { recordStaffChange } from "@/lib/admin/audit";
import { getStore } from "@/lib/data";
import type { FormState } from "@/lib/forms";
import { parseHostedSettingsForm } from "@/lib/hosted/settings-form";

const FIELDS = ["signupAllowed", "askEmail", "askCity", "defaultCountryCode", "deviceLimit", "supportWhatsapp", "termsUrl", "reviewPhone", "reviewCode"];

/** Sign-in rules of an app on the hosted API. */
export async function saveAppSignInAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await getClientContext();
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app || app.backend !== "hosted") redirect("/dashboard");
  const values: Record<string, string> = {};
  for (const name of FIELDS) values[name] = String(formData.get(name) ?? "").trim();
  const parsed = parseHostedSettingsForm(values);
  if (!parsed.ok) return { errors: parsed.errors, values };
  const store = await getStore();
  await store.updateApp(app.id, { hostedSettings: parsed.value }, new Date());
  await recordStaffChange(context, "Saved the app sign-in rules", app.hostedSettings ?? {}, parsed.value);
  revalidatePath("/dashboard/app-sign-in");
  return { ok: true, message: "Saved. The app uses these rules now; no new build is needed.", values };
}
