"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { FirebaseProject, FirebaseProjectStatus } from "@/lib/data/types";
import { checkYallappFirebase, type CheckLine } from "@/lib/firebase/check";
import { parsePoolParent, poolParent, yallappFirebase } from "@/lib/firebase/env";
import { DEFAULT_MAX_APPS, FIREBASE_APP_LIMIT } from "@/lib/firebase/pool";
import { advanceProject, keepPoolStocked, stepText } from "@/lib/firebase/projects";
import type { FormState } from "@/lib/forms";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { teamMail } from "@/lib/watch/env";

/**
 * 136 Admin › Settings › Yallapp Firebase projects: the pool of Firebase
 * projects Yallapp registers its clients' apps in. The platform makes the
 * next one itself when the pool runs low; the team can add one made by hand,
 * open or close one, set where new ones are made, start the next one now, and
 * run the Check. Nothing here is a secret: the platform signs in to Google
 * without a key.
 */

const PAGE = "/admin/settings/firebase";
const PROJECT_ID = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const PROJECT_NUMBER = /^\d{6,20}$/;
const KEY_UID = /^[A-Za-z0-9-]{8,64}$/;
const str = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export type FirebaseCheckState = FormState & { lines?: CheckLine[] };

function maxAppsOf(raw: string): number | null {
  if (!raw) return DEFAULT_MAX_APPS;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= FIREBASE_APP_LIMIT ? n : null;
}

/** A project the team made by hand (as LAUNCH-CHECKLIST 7z8 shows), added to the pool. */
export async function addFirebaseProjectAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const values = { projectId: str(formData, "projectId").toLowerCase(), projectNumber: str(formData, "projectNumber"), apiKeyId: str(formData, "apiKeyId"), maxApps: str(formData, "maxApps") };
  const errors: Record<string, string> = {};
  if (!PROJECT_ID.test(values.projectId)) errors.projectId = "Enter the project ID: 6 to 30 lowercase letters, digits and hyphens, like yallapp-push-01.";
  if (!PROJECT_NUMBER.test(values.projectNumber)) errors.projectNumber = "Enter the project number: digits only, from the project's settings.";
  if (!KEY_UID.test(values.apiKeyId)) errors.apiKeyId = "Enter the API key's ID (its uid), not the key itself.";
  const maxApps = maxAppsOf(values.maxApps);
  if (maxApps === null) errors.maxApps = `Enter a number from 1 to ${FIREBASE_APP_LIMIT}.`;
  if (Object.keys(errors).length) return { errors, values };
  const store = await getStore();
  if (await store.getFirebaseProject(values.projectId)) return { errors: { projectId: "This project is in the pool already." }, values };
  const now = new Date();
  const project: FirebaseProject = {
    projectId: values.projectId,
    projectNumber: values.projectNumber,
    apiKeyId: values.apiKeyId,
    maxApps: maxApps!,
    status: "open",
    createdBy: "team",
    creation: null,
    checkedAt: null,
    checkProblem: null,
    createdAt: now,
    updatedAt: now,
  };
  await store.saveFirebaseProject(project);
  await recordAudit({ actor: admin, action: "firebase.project_add", target: { type: "firebase_project", id: project.projectId }, summary: `Added ${project.projectId} to Yallapp's Firebase projects`, after: project });
  revalidatePath(PAGE);
  return { ok: true, message: `${project.projectId} is in the pool. Press Check to sign in to it.` };
}

const STATUSES: readonly FirebaseProjectStatus[] = ["open", "full", "closed"];

/** Opens, fills or closes a project of the pool, or changes how many apps it takes. */
export async function updateFirebaseProjectAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const before = await store.getFirebaseProject(str(formData, "projectId"));
  if (!before) return { message: "This project isn't in the pool." };
  const status = str(formData, "status") as FirebaseProjectStatus;
  const maxApps = maxAppsOf(str(formData, "maxApps"));
  const values = { status, maxApps: str(formData, "maxApps") };
  if (!STATUSES.includes(status) || before.status === "creating") return { message: "Choose open, full or closed.", values };
  if (maxApps === null) return { errors: { maxApps: `Enter a number from 1 to ${FIREBASE_APP_LIMIT}.` }, values };
  const after: FirebaseProject = { ...before, status, maxApps, updatedAt: new Date() };
  await store.saveFirebaseProject(after);
  await recordAudit({ actor: admin, action: "firebase.project_edit", target: { type: "firebase_project", id: before.projectId }, summary: `${before.projectId}: ${status}, up to ${maxApps} apps`, before, after });
  revalidatePath(PAGE);
  return { ok: true, message: `Saved: ${before.projectId} is ${status}, up to ${maxApps} apps.` };
}

/** Where the platform makes new projects: an organization or a folder; empty goes back to GOOGLE_FIREBASE_PROJECT_PARENT. */
export async function saveFirebaseParentAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const raw = str(formData, "parent");
  const parent = raw ? parsePoolParent(raw) : null;
  if (raw && !parent) return { errors: { parent: "Enter organizations/ or folders/ and the number, like organizations/123456789012." }, values: { parent: raw } };
  const store = await getStore();
  await store.setPlatformSetting("firebasePool", parent ? { parent } : null, admin.email, new Date());
  clearPlatformSettingsCache();
  await recordAudit({ actor: admin, action: "settings.save", target: { type: "setting", id: "firebasePool" }, summary: parent ? `New Firebase projects are made under ${parent}` : "New Firebase projects follow GOOGLE_FIREBASE_PROJECT_PARENT" });
  revalidatePath(PAGE);
  return { ok: true, message: parent ? `Saved. New projects are made under ${parent}.` : "Saved. New projects follow GOOGLE_FIREBASE_PROJECT_PARENT.", values: { parent: parent ?? "" } };
}

/** Signs in to Google as both service accounts, reads each project and asks whether projects can be made. */
export async function checkFirebaseAction(): Promise<FirebaseCheckState> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const firebase = yallappFirebase(store);
  if (!firebase) return { message: "Yallapp's Firebase isn't set up on this server: set GOOGLE_WIF_PROVIDER, GOOGLE_PUSH_SERVICE_ACCOUNT and GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT in Netlify." };
  const result = await checkYallappFirebase(firebase.check(await poolParent(store)));
  await recordAudit({ actor: admin, action: "firebase.check", target: { type: "firebase_project" }, summary: result.ok ? "Checked Yallapp's Firebase: everything works" : `Checked Yallapp's Firebase: ${result.lines.filter((l) => !l.ok).length} to look at` });
  revalidatePath(PAGE);
  return { ok: result.ok, message: result.ok ? "Everything works." : "Some of it needs a look:", lines: result.lines };
}

/** Starts the pool's next project now (or moves on the one being made), whatever room is left. */
export async function makeNextFirebaseProjectAction(): Promise<FormState> {
  const admin = await requireAdmin("settings.edit");
  const store = await getStore();
  const firebase = yallappFirebase(store);
  const deps = firebase?.projects(await poolParent(store), teamMail);
  if (!deps) return { message: "Set where new projects are made first (an organization or a folder), and Yallapp's Firebase in Netlify." };
  const report = await keepPoolStocked(deps, { start: true, force: true });
  if (report.project) {
    await recordAudit({ actor: admin, action: "firebase.project_create", target: { type: "firebase_project", id: report.project }, summary: report.step === "open" ? `${report.project} was made and is open` : `${report.project}: ${report.problem ?? `waiting for Google (${stepText(report.step ?? "create")})`}` });
  }
  revalidatePath(PAGE);
  if (report.step === "open") return { ok: true, message: `${report.project} is ready and open.` };
  if (report.problem) return { message: `${report.project}: ${report.problem}` };
  return { ok: true, message: `${report.project} is being made (${stepText(report.step ?? "create")}). The frequent job carries on within 5 minutes.` };
}

/** "Try again now": the project being made goes on at once, without waiting for its next try. */
export async function retryFirebaseProjectAction(formData: FormData): Promise<void> {
  await requireAdmin("settings.edit");
  const store = await getStore();
  const firebase = yallappFirebase(store);
  const deps = firebase?.projects(await poolParent(store), teamMail);
  const project = await store.getFirebaseProject(str(formData, "projectId"));
  if (deps && project) await advanceProject(deps, project, { force: true });
  revalidatePath(PAGE);
}
