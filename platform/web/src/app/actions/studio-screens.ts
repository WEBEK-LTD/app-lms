"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { parseStudioScreens, studioScreensOn } from "@/lib/studio/screens";

/**
 * 118.3 Saves the sign-in screen's look and the account menu of a Studio
 * project, as designed on Studio › Sign-in & account. `reset` goes back to
 * the app's own screens.
 */
export async function saveStudioScreensAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app || !studioScreensOn(app)) redirect("/studio/project");

  const reset = formData.get("reset") === "1";
  let screens = null;
  if (!reset) {
    let input: unknown = null;
    try {
      input = JSON.parse(String(formData.get("screens") ?? "null"));
    } catch {
      input = null;
    }
    const parsed = parseStudioScreens(input);
    if (parsed.problems.length) return { message: parsed.problems[0], ok: false };
    screens = parsed.screens;
  }
  const settings = { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), studioScreens: screens };
  await (await getStore()).updateApp(app.id, { hostedSettings: settings }, new Date());
  await recordStaffChange(context, "Changed the sign-in screen and the account menu", { studioScreens: app.hostedSettings?.studioScreens ?? null }, { studioScreens: screens });
  revalidatePath("/studio/project/screens");
  return { ok: true, message: reset ? "Back to the app's own screens. The app shows them the next time it opens." : "Saved. The app shows it the next time it opens; no new build is needed." };
}
