import type { DataStore } from "../data/store";
import type { CloudProjects } from "../google/cloud-projects";
import { CLOUD_PLATFORM_SCOPE, federatedAccessToken, MESSAGING_SCOPE, WIF_SUBJECTS, type Federation } from "../google/federation";
import type { FirebaseManagement } from "../google/firebase-management";
import type { Fetch } from "../google/http";
import { CREATE_PERMISSION } from "./projects";

/**
 * 136 Admin's "Check": the platform signs in to Google through Workload
 * Identity Federation as each service account (no key anywhere), reads each
 * project of the pool and compares its number, and asks whether the apps
 * account may create projects under the pool's parent. Nothing
 * is changed at Google. Each project keeps its result.
 */

export interface CheckLine {
  label: string;
  ok: boolean;
  detail: string;
}

export interface FirebaseCheck {
  ok: boolean;
  lines: CheckLine[];
}

export interface CheckDeps {
  store: DataStore;
  now: () => Date;
  federation: Federation;
  accounts: { pushAccount: string; appsAccount: string; parent: string | null };
  management: FirebaseManagement;
  cloud: CloudProjects;
  fetcher?: Fetch;
}

const said = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);

export async function checkYallappFirebase(deps: CheckDeps): Promise<FirebaseCheck> {
  const lines: CheckLine[] = [];
  const signIn = async (label: string, serviceAccount: string, subject: (typeof WIF_SUBJECTS)[keyof typeof WIF_SUBJECTS], scope: string) => {
    try {
      await federatedAccessToken(deps.federation, { serviceAccount, subject, scopes: [scope], fetcher: deps.fetcher, now: deps.now(), fresh: true });
      lines.push({ label, ok: true, detail: `Signed in as ${serviceAccount}, without a key.` });
      return true;
    } catch (error) {
      lines.push({ label, ok: false, detail: said(error) });
      return false;
    }
  };
  await signIn("Push sender", deps.accounts.pushAccount, WIF_SUBJECTS.push, MESSAGING_SCOPE);
  const apps = await signIn("Apps account", deps.accounts.appsAccount, WIF_SUBJECTS.apps, CLOUD_PLATFORM_SCOPE);

  if (apps) {
    for (const project of await deps.store.listFirebaseProjects()) {
      if (project.status === "creating") continue;
      let problem: string | null = null;
      try {
        const info = await deps.management.getProject(project.projectId);
        if (info.projectNumber && info.projectNumber !== project.projectNumber) problem = `Its number is ${info.projectNumber}, not ${project.projectNumber}. Correct it here.`;
      } catch (error) {
        problem = said(error);
      }
      lines.push({ label: `Project ${project.projectId}`, ok: problem === null, detail: problem ?? "Firebase answers for it." });
      await deps.store.saveFirebaseProject({ ...project, checkedAt: deps.now(), checkProblem: problem, updatedAt: deps.now() });
    }
    if (deps.accounts.parent) {
      try {
        const granted = await deps.cloud.testPermissions(deps.accounts.parent, [CREATE_PERMISSION]);
        lines.push(
          granted.includes(CREATE_PERMISSION)
            ? { label: "Creating projects", ok: true, detail: `The apps account may create projects under ${deps.accounts.parent}.` }
            : { label: "Creating projects", ok: false, detail: `The apps account can't create projects under ${deps.accounts.parent}: give it the Project Creator role there (LAUNCH-CHECKLIST 7z8).` },
        );
      } catch (error) {
        lines.push({ label: "Creating projects", ok: false, detail: said(error) });
      }
    }
  }
  if (!deps.accounts.parent) {
    lines.push({ label: "Creating projects", ok: false, detail: "No organization or folder to create projects under is set (below, or GOOGLE_FIREBASE_PROJECT_PARENT): the platform can't make the next project when the pool runs low." });
  }
  return { ok: lines.every((l) => l.ok), lines };
}
