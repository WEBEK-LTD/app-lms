"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import type { AppPatch } from "@/lib/data/store";
import type { FormState } from "@/lib/forms";
import { isStudioDemo, STUDIO_DEMO_TYPES, type StudioDemoId } from "@/lib/demo/constants";
import { demoStudioScreens } from "@/lib/demo/screens";
import { appUrl } from "@/lib/env";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { parseStudioScreens, studioScreensOn, type StudioScreens } from "@/lib/studio/screens";

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
  // 121 A WordPress site gets them with its license status: it asks again now.
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  revalidatePath("/studio/project/screens");
  return { ok: true, message: reset ? "Back to the app's own screens. The app shows them the next time it opens." : "Saved. The app shows it the next time it opens; no new build is needed." };
}

/**
 * 120 Templates = demos: a Studio demo's whole design applied to the
 * project brings the demo's sign-in screen and account menu too, as the
 * demo app has them (lib/demo/screens.ts). Nothing for an app whose screens
 * Studio doesn't design.
 */
export async function applyDemoScreensAction(demo: string): Promise<{ ok: boolean }> {
  const context = await clientFor("settings");
  if (!context || !mayUseDashboard(context)) return { ok: false };
  const app = context.app;
  if (!app || !studioScreensOn(app) || !(STUDIO_DEMO_TYPES as readonly string[]).includes(demo) || !isStudioDemo(demo as StudioDemoId)) return { ok: false };
  const screens = demoStudioScreens(demo as StudioDemoId, appUrl());
  const settings = { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), studioScreens: screens };
  await (await getStore()).updateApp(app.id, { hostedSettings: settings }, new Date());
  await recordStaffChange(context, "Took the demo's sign-in screen and account menu", { studioScreens: app.hostedSettings?.studioScreens ?? null }, { studioScreens: screens });
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  revalidatePath("/studio/project/screens");
  return { ok: true };
}

/**
 * 124.11 A project's whole design taken from a file (or kept in "Mine")
 * brings what is the app's and not the draft's: its main colour and the
 * looks of its screens (Studio › Screens). Each is checked as on its own
 * page; one that can't be is left as it was. Returns what was saved.
 */
export async function applyDesignLookAction(input: { primary?: string | null; screens?: unknown }): Promise<{ ok: boolean; primary?: string; screens?: StudioScreens }> {
  const context = await clientFor("settings");
  if (!context || !mayUseDashboard(context)) return { ok: false };
  const app = context.app;
  if (!app) return { ok: false };
  const update: AppPatch = {};
  const out: { ok: boolean; primary?: string; screens?: StudioScreens } = { ok: true };
  const primary = typeof input.primary === "string" && /^#[0-9a-f]{6}$/i.test(input.primary) ? input.primary.toUpperCase() : null;
  if (primary && primary !== app.primaryColor?.toUpperCase()) {
    update.primaryColor = primary;
    out.primary = primary;
  }
  if (input.screens && studioScreensOn(app)) {
    const parsed = parseStudioScreens(input.screens);
    if (!parsed.problems.length) {
      update.hostedSettings = { ...DEFAULT_HOSTED_SETTINGS, ...(app.hostedSettings ?? {}), studioScreens: parsed.screens };
      out.screens = parsed.screens;
    }
  }
  if (!Object.keys(update).length) return out;
  await (await getStore()).updateApp(app.id, update, new Date());
  await recordStaffChange(
    context,
    "Took a whole design's main colour and screens",
    { primaryColor: app.primaryColor, studioScreens: app.hostedSettings?.studioScreens ?? null },
    { primaryColor: update.primaryColor ?? app.primaryColor, studioScreens: out.screens ?? app.hostedSettings?.studioScreens ?? null },
  );
  if (app.backend === "wordpress") refreshSitesSoon([app.id]);
  revalidatePath("/studio/project/screens");
  return out;
}
