"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { kindById } from "@/lib/app/kinds";
import { MAX_APPS_PER_CLIENT } from "@/lib/app/label";
import { ownerLang } from "@/lib/app/owner-lang";
import { startLanguages, wordsLangOf } from "@/lib/app/start-language";
import { chooseApp, clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { appDefaults } from "@/lib/pages/layout";
import { makeStudioProject } from "@/lib/studio/new-project";
import { liabilityDue, withAcceptance } from "@/lib/studio/liability";
import { templatesFor, TEMPLATES } from "@/lib/studio/sections";
import { appWords } from "@/lib/studio/app-words";
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
  // 103R.7 One of the project type's templates (or the ones for every project).
  const template = templatesFor({ type: kind.engine, vertical: kind.vertical }).find((x) => x.id === formData.get("template")) ?? TEMPLATES.find((x) => x.id === "blank")!;
  const now = new Date();
  // The home page starts as a Studio page from the chosen template, in the project's main language:
  // 132.40 an Arabic or Turkish dashboard's project has that language as its main one.
  const languages = startLanguages(await ownerLang(context), (await appDefaults(store)).languages);
  const lang = wordsLangOf(languages, "en");
  const app = await makeStudioProject(store, { clientId: context.client.id, name, kind, source, template, words: appWords(lang, name), lang, languages }, now);
  await chooseApp(app.id);
  await recordStaffChange({ ...context, app }, `Added a Studio project: ${kind.name}`, { appType: null }, { appType: kind.engine, vertical: kind.vertical, section: "studio" });
  revalidatePath("/studio", "layout");
  // Content kept in Yallapp is ready; a website, platform or API is connected next.
  redirect(source === "catalog" ? "/studio/project" : "/studio/project/setup?step=website");
}

/**
 * 208 The owner's "I read it and agree" to their shop type's liability
 * notice (lib/studio/liability.ts): kept on the app with who and when, so
 * the dashboard never shows it again. A team member can't accept it for the
 * owner: it stays until the owner (or our team in their account) does.
 */
export async function acceptLiabilityAction(): Promise<void> {
  const context = await requireClientFor("dashboard");
  const app = context.app;
  const due = liabilityDue(app);
  if (!app || !due || context.member) return;
  const now = new Date();
  await (await getStore()).updateApp(app.id, { liabilityAccepted: withAcceptance(app.liabilityAccepted, due.kind, (context.staff ?? context.user).id, now) }, now);
  await recordStaffChange(context, `Accepted the ${due.kind} liability notice`);
  revalidatePath("/studio", "layout");
}
