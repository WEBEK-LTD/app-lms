import type { DataStore } from "../data/store";
import type { FirebaseProject, FirebaseProjectCreation, FirebaseProjectStep } from "../data/types";
import { keyUidOf, POOL_PROJECT_SERVICES, projectNumberOf, withRoles, type CloudProjects } from "../google/cloud-projects";
import type { FirebaseManagement } from "../google/firebase-management";
import { GoogleApiError, operationProblem, type Operation } from "../google/http";
import { closeAlerts, raiseAlert, type TeamMail } from "../watch/alerts";
import { DEFAULT_MAX_APPS, poolLow, poolOf } from "./pool";

/**
 * 136 The pool grows by itself: when the room left falls under
 * POOL_LOW_ROOM (lib/firebase/pool.ts), the frequent job creates the next
 * `yallapp-push-NN` project under GOOGLE_FIREBASE_PROJECT_PARENT as the
 * `firebase-apps` service account, one step per run at most when Google is
 * slow, each step safe to run again:
 *
 * 1. `create`: the Google Cloud project (Resource Manager), on the Spark
 *    plan (no billing account).
 * 2. `services`: the APIs push needs (Service Usage).
 * 3. `firebase`: Firebase added to it (no Analytics).
 * 4. `key`: the one API key the apps carry, restricted to Firebase
 *    Installations and FCM registration (API Keys).
 * 5. `roles`: the push sender may send, the apps account may add apps and
 *    read the key.
 *
 * Then it's open. A step that fails waits longer each time (15 minutes,
 * doubling, at most 6 hours) and alerts the team once with Google's exact
 * words, also shown in Admin › Settings › Yallapp Firebase projects, where
 * "Try again now" skips the wait.
 */

export const POOL_PROJECT_PREFIX = "yallapp-push-";
export const PROJECT_STEPS: readonly FirebaseProjectStep[] = ["create", "services", "firebase", "key", "roles"];
export const PUSH_KEY_NAME = "Yallapp apps (push only)";
const FIRST_RETRY_MS = 15 * 60_000;
const LAST_RETRY_MS = 6 * 3600_000;
const POLL_MS = 1500;

export interface PoolAccounts {
  /** Where projects are created: `organizations/<id>` or `folders/<id>`. */
  parent: string;
  pushAccount: string;
  appsAccount: string;
}

export interface ProjectDeps {
  store: DataStore;
  now: () => Date;
  cloud: CloudProjects;
  management: FirebaseManagement;
  accounts: PoolAccounts;
  /** Emails the team a new alert. */
  mail?: TeamMail | null;
  wait?: (ms: number) => Promise<void>;
  budgetMs?: number;
}

/** The roles the two service accounts get on a project of the pool. */
export function poolRoles(accounts: Pick<PoolAccounts, "pushAccount" | "appsAccount">): { member: string; role: string }[] {
  return [
    { member: `serviceAccount:${accounts.pushAccount}`, role: "roles/firebasecloudmessaging.admin" },
    { member: `serviceAccount:${accounts.appsAccount}`, role: "roles/firebase.admin" },
    { member: `serviceAccount:${accounts.appsAccount}`, role: "roles/serviceusage.apiKeysViewer" },
  ];
}

/** The next free name: `yallapp-push-` and the next number, two digits at least, past every project of the pool. */
export function nextProjectId(projects: readonly Pick<FirebaseProject, "projectId">[], skip: ReadonlySet<string> = new Set()): string {
  let n = 0;
  for (const { projectId } of projects) {
    const match = new RegExp(`^${POOL_PROJECT_PREFIX}(\\d+)`).exec(projectId);
    if (match) n = Math.max(n, Number(match[1]));
  }
  let id = "";
  do id = `${POOL_PROJECT_PREFIX}${String(++n).padStart(2, "0")}`;
  while (skip.has(id) || projects.some((p) => p.projectId === id));
  return id;
}

/** A display name for the console: "Yallapp Push 07". */
export function projectDisplayName(projectId: string): string {
  const n = projectId.startsWith(POOL_PROJECT_PREFIX) ? projectId.slice(POOL_PROJECT_PREFIX.length) : projectId;
  return `Yallapp Push ${n}`.slice(0, 30);
}

/** How long after `attempts` failures the step is tried again. */
export function retryDelayMs(attempts: number): number {
  return Math.min(LAST_RETRY_MS, FIRST_RETRY_MS * 2 ** Math.max(0, attempts - 1));
}

export const alertKeyOf = (projectId: string) => `firebase_project:${projectId}`;

const STEP_TEXT: Record<FirebaseProjectStep, string> = {
  create: "creating the project",
  services: "turning on its APIs",
  firebase: "adding Firebase to it",
  key: "making its API key",
  roles: "giving the service accounts their roles",
};

export function stepText(step: FirebaseProjectStep): string {
  return STEP_TEXT[step];
}

export interface ProjectRunReport {
  /** A project started this run, by its ID. */
  started: string | null;
  /** The project being made, and its step now (`open` once done). */
  project: string | null;
  step: FirebaseProjectStep | "open" | null;
  problem: string | null;
}

/** Starts the pool's next project when it runs low and none is being made, and moves on the one being made. */
export async function keepPoolStocked(deps: ProjectDeps, options: { force?: boolean; start?: boolean } = {}): Promise<ProjectRunReport> {
  const { store } = deps;
  const projects = await store.listFirebaseProjects();
  let creating = projects.find((p) => p.status === "creating") ?? null;
  let started: string | null = null;
  // `start`: Admin's "Make the next project now", whatever room is left.
  if (!creating && (options.start || poolLow(poolOf(projects, await store.countAppFirebaseAppsByProject())))) {
    const now = deps.now();
    creating = {
      projectId: nextProjectId(projects),
      projectNumber: "",
      apiKeyId: "",
      maxApps: DEFAULT_MAX_APPS,
      status: "creating",
      createdBy: "platform",
      creation: { step: "create", operation: null, attempts: 0, problem: null, failedAt: null, nextTryAt: null },
      checkedAt: null,
      checkProblem: null,
      createdAt: now,
      updatedAt: now,
    };
    await store.saveFirebaseProject(creating);
    started = creating.projectId;
  }
  if (!creating) return { started, project: null, step: null, problem: null };
  const next = await advanceProject(deps, creating, options);
  return { started, project: next.projectId, step: next.status === "open" ? "open" : (next.creation?.step ?? null), problem: next.creation?.problem ?? null };
}

/** Takes a project being made as far as it goes now; it's saved after each step. */
export async function advanceProject(deps: ProjectDeps, start: FirebaseProject, options: { force?: boolean } = {}): Promise<FirebaseProject> {
  const { store, cloud, management } = deps;
  let project = start;
  if (project.status !== "creating" || !project.creation) return project;
  const creation0 = project.creation;
  if (!options.force && creation0.nextTryAt && Date.parse(creation0.nextTryAt) > deps.now().getTime()) return project;
  const deadline = Date.now() + (deps.budgetMs ?? 8000);
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const save = async (patch: Partial<FirebaseProject>, creation: Partial<FirebaseProjectCreation> | null) => {
    project = { ...project, ...patch, creation: creation === null ? null : { ...project.creation!, ...creation }, updatedAt: deps.now() };
    await store.saveFirebaseProject(project);
    return project;
  };
  /** Waits for the operation while there's time; null when it's still running. */
  const settle = async (operation: Operation, read: (name: string) => Promise<Operation>): Promise<Operation | null> => {
    let op = operation;
    while (!op.done && op.name && Date.now() + POLL_MS < deadline) {
      await wait(POLL_MS);
      op = await read(op.name);
    }
    if (!op.done) {
      await save({}, { operation: op.name ?? null });
      return null;
    }
    const failed = operationProblem(op);
    if (failed) throw failed;
    return op;
  };
  const advanceTo = (step: FirebaseProjectStep) => save({}, { step, operation: null, attempts: 0, problem: null, failedAt: null, nextTryAt: null });

  try {
    // One step at least each run, then as many as the time allows.
    for (let first = true; project.status === "creating" && project.creation && (first || Date.now() < deadline); first = false) {
      const { step, operation } = project.creation;
      if (step === "create") {
        let op: Operation | null;
        if (operation) op = await settle(await cloud.getOperation(operation), (n) => cloud.getOperation(n));
        else {
          try {
            op = await settle(await cloud.createProject({ projectId: project.projectId, displayName: projectDisplayName(project.projectId), parent: deps.accounts.parent }), (n) => cloud.getOperation(n));
          } catch (error) {
            if (!(error instanceof GoogleApiError && (error.code === "ALREADY_EXISTS" || error.httpStatus === 409))) throw error;
            // Ours from an earlier run that stopped, or someone else's name: then the next name.
            const number = await cloud.projectNumber(project.projectId);
            if (!number) {
              const renamed = nextProjectId(await store.listFirebaseProjects(), new Set([project.projectId]));
              await store.deleteFirebaseProject(project.projectId);
              project = { ...project, projectId: renamed };
              await save({}, { step: "create", operation: null });
              continue;
            }
            op = { name: "", done: true, response: { name: `projects/${number}` } };
          }
        }
        if (!op) break;
        const number = projectNumberOf(op.response) ?? (await cloud.projectNumber(project.projectId));
        if (!number) throw new GoogleApiError("Google created the project but gave no project number.", 200, null);
        await save({ projectNumber: number }, {});
        await advanceTo("services");
      } else if (step === "services") {
        const op = await settle(operation ? await cloud.getServiceOperation(operation) : await cloud.enableServices(project.projectNumber, POOL_PROJECT_SERVICES), (n) => cloud.getServiceOperation(n));
        if (!op) break;
        await advanceTo("firebase");
      } else if (step === "firebase") {
        let op: Operation | null;
        try {
          op = await settle(operation ? await management.getOperation(operation) : await management.addFirebase(project.projectId), (n) => management.getOperation(n));
        } catch (error) {
          // Firebase is on it already (a run stopped after asking).
          if (!(error instanceof GoogleApiError && (error.code === "ALREADY_EXISTS" || error.httpStatus === 409))) throw error;
          op = { name: "", done: true };
        }
        if (!op) break;
        await advanceTo("key");
      } else if (step === "key") {
        const op = await settle(operation ? await cloud.getKeyOperation(operation) : await cloud.createPushKey(project.projectNumber, PUSH_KEY_NAME), (n) => cloud.getKeyOperation(n));
        if (!op) break;
        const uid = keyUidOf(op.response);
        if (!uid) throw new GoogleApiError("Google made the API key but gave no key ID.", 200, null);
        await save({ apiKeyId: uid }, {});
        await advanceTo("roles");
      } else {
        const policy = await cloud.getIamPolicy(project.projectId);
        const next = withRoles(policy, poolRoles(deps.accounts));
        if (next.changed) await cloud.setIamPolicy(project.projectId, next.policy);
        await save({ status: "open" }, null);
        await closeAlerts(store, [alertKeyOf(project.projectId)], deps.now());
      }
    }
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    const attempts = (project.creation?.attempts ?? 0) + 1;
    const now = deps.now();
    const step = project.creation?.step ?? "create";
    await save({}, { attempts, problem: message, failedAt: now.toISOString(), nextTryAt: new Date(now.getTime() + retryDelayMs(attempts)).toISOString() });
    await raiseAlert(
      store,
      {
        kind: "firebase",
        key: alertKeyOf(project.projectId),
        title: `Yallapp's next Firebase project couldn't be made (${STEP_TEXT[step]})`,
        detail: `${project.projectId}: ${message}\nThe platform tries again by itself; Admin › Settings › Yallapp Firebase projects shows where it is.`,
        link: "/admin/settings/firebase",
      },
      now,
      deps.mail,
    );
  }
  return project;
}

/** The parent's permission the Check looks for. */
export const CREATE_PERMISSION = "resourcemanager.projects.create";
