"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { ENGINES, kindById } from "@/lib/app/kinds";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { ownContentSetup } from "@/lib/app/own-content";
import { newApp } from "@/lib/app/setup";
import { chooseApp, clientFor, mayUseDashboard } from "@/lib/auth/session";
import type { DashKey } from "@/i18n/dashboard";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import { defaultLayout } from "@/lib/pages/defaults";
import { appDefaults, saveDraft } from "@/lib/pages/layout";
import { itemSourcesFor } from "@/lib/pages/sources";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { studioSourcesFor, type StudioSource } from "@/lib/studio/section";
import { appTypeOn, getSwitches } from "@/lib/switches";
import type { TeamPermission } from "@/lib/team/permissions";

/** 103R.3 Yallapp Studio's own section: opening and making its projects. */

async function requireClientFor(permission: TeamPermission) {
  const context = await clientFor(permission);
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  return context;
}

/** Opens one of the account's Studio projects: its dashboard, or straight in the editor. */
export async function openStudioProjectAction(formData: FormData): Promise<void> {
  const context = await requireClientFor("dashboard");
  const project = context.apps.find((a) => a.id === String(formData.get("appId") ?? "") && a.section === "studio");
  if (!project) redirect("/studio");
  await chooseApp(project.id);
  revalidatePath("/studio", "layout");
  redirect(formData.get("to") === "editor" ? "/studio/editor" : "/studio/project");
}

/** Back to the regular apps: the dashboard on the first of them, or a new one. */
export async function openRegularAppsAction(): Promise<void> {
  const context = await requireClientFor("dashboard");
  const regular = context.apps.find((a) => a.section !== "studio");
  if (!regular) {
    await chooseApp(null);
    redirect("/dashboard/app-type?new=1");
  }
  await chooseApp(regular.id);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

/**
 * A new Studio project from the three steps: its kind, where its content
 * comes from (content kept in Yallapp is set up at once; a website or
 * platform is connected from the project's dashboard), and the page its home
 * starts from. It waits for its own plan from Studio's plans like any app.
 */
export async function createStudioProjectAction(formData: FormData): Promise<void> {
  const context = await requireClientFor("apps");
  const back = (problem: string) => redirect(`/studio/new?error=${problem}`);
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 30) back("name");
  const kind = kindById(formData.get("kind"));
  if (!kind) return back("kind");
  if (context.apps.length >= MAX_APPS_PER_CLIENT) back("limit");
  const store = await getStore();
  // 11.5 A type the team switched off isn't offered; a new project has no plan yet.
  if (!appTypeOn(await getSwitches(store), kind.engine, null)) back("unavailable");
  const sources = studioSourcesFor(kind);
  const chosen = String(formData.get("source") ?? "");
  const source: StudioSource = (sources as readonly string[]).includes(chosen) ? (chosen as StudioSource) : (sources[0] ?? "catalog");
  const template = TEMPLATES.find((x) => x.id === formData.get("template")) ?? TEMPLATES.find((x) => x.id === "blank")!;
  const now = new Date();
  const base: App = { ...newApp(context.client.id, null, now, kind.engine, kind.vertical), section: "studio", appName: name };
  const app: App =
    source === "catalog"
      ? { ...base, backend: "hosted", ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: now }
      : base;
  await store.createApp(app);
  await chooseApp(app.id);
  // The home page starts as a Studio page from the chosen template, in the dashboard's language.
  const { t } = await dashboardText();
  const layout = defaultLayout(app, await appDefaults(store), now);
  const home = template.make({
    brand: app.primaryColor,
    source: itemSourcesFor(app)[0] ?? null,
    w: (word: SectionWord) => t(`studio.w_${word}` as DashKey, { app: name }),
  });
  const pages = layout.pages.some((p) => p.slug === "home")
    ? layout.pages.map((p) => (p.slug === "home" ? { ...p, blocks: [], studio: home } : p))
    : [{ slug: "home", title: "Home", show_title: false, updated_at: now.toISOString(), blocks: [], studio: home }, ...layout.pages];
  const saved = await saveDraft(store, app, { ...layout, pages }, now);
  // The ready-made pages then; the project is made all the same.
  if (!saved.ok) console.error("[studio] new project draft", saved.errors.slice(0, 3).join("; "));
  await recordStaffChange({ ...context, app }, `Added a Studio project: ${kind.name}`, { appType: null }, { appType: kind.engine, vertical: kind.vertical, section: "studio" });
  revalidatePath("/studio", "layout");
  // Content kept in Yallapp is ready; a website, platform or API is connected next.
  redirect(source === "catalog" ? "/studio/project" : "/studio/project/setup?step=website");
}
