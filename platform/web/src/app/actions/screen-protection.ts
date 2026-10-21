"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { choosesScreenProtection, parseScreenProtectionChoice, screenProtectionChoice } from "@/lib/app/screen-protection";
import { choosesVideoBranding, hidesVideoBranding } from "@/lib/app/video-branding";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import type { FormState } from "@/lib/forms";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";

/** 53 Screenshots and screen recording: off, course content, the whole app or (WordPress) the plugin's own setting. */
export async function saveScreenProtectionAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard/app-type");
  if (!choosesScreenProtection(app)) redirect("/dashboard/protection");
  const choice = String(formData.get("protection") ?? "");
  const value = parseScreenProtectionChoice(choice, app);
  if (value === undefined) return { errors: { protection: "Choose what the app protects." }, values: { protection: choice } };
  const before = screenProtectionChoice(app);
  const next = { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), screenProtection: value };
  await (await getStore()).updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(context, "Changed screen protection for the app", { screenProtection: before }, { screenProtection: value });
  // The plugin reads the choice from its license status: ask the site to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  revalidatePath("/dashboard/protection");
  const message =
    app.backend === "setup_requested"
      ? "Saved. It applies as soon as your WordPress site and the Yallapp plugin are ready."
      : app.backend === "wordpress"
        ? "Saved. Your website gets it within a minute when it can be reached, otherwise at its next check (twice a day). The app follows it the next time it opens."
        : "Saved. The app follows it the next time it opens.";
  return { ok: true, message, values: { protection: choice } };
}

/** 72 Hide the video sites' own players (their branding and controls), at the owner's own risk; off by default. */
export async function saveVideoBrandingAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  const app = context.app;
  if (!app) redirect("/dashboard/app-type");
  if (!choosesVideoBranding(app)) redirect("/dashboard/protection");
  const hide = formData.get("hideVideoBranding") === "on";
  const before = hidesVideoBranding(app);
  const next = { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), hideVideoBranding: hide };
  await (await getStore()).updateApp(app.id, { hostedSettings: next }, new Date());
  await recordStaffChange(
    context,
    hide ? "Chose to hide the video sites' branding in the app" : "Chose the video sites' own players in the app",
    { hideVideoBranding: before },
    { hideVideoBranding: hide },
  );
  // The plugin reads the choice from its license status: ask the site to check now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  revalidatePath("/dashboard/protection");
  const message =
    app.backend === "setup_requested"
      ? "Saved. It applies as soon as your WordPress site and the Yallapp plugin are ready."
      : app.backend === "wordpress"
        ? "Saved. Your website gets it within a minute when it can be reached, otherwise at its next check (twice a day). The app follows it the next time it opens."
        : "Saved. The app follows it the next time it opens.";
  return { ok: true, message, values: { hideVideoBranding: hide ? "on" : "" } };
}
