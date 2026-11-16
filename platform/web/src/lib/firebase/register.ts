import { scheduleAutoBuild } from "../builds/auto";
import type { DataStore } from "../data/store";
import type { App, AppFirebaseApp, DeliverySettings, FirebaseAppPlatform, FirebaseProject } from "../data/types";
import { deliverySettingsOf } from "../delivery/settings";
import type { FirebaseManagement } from "../google/firebase-management";
import { appRecordOf } from "../google/firebase-management";
import { GoogleApiError, operationProblem, type Operation } from "../google/http";
import { checkGoogleServiceInfoPlist, checkGoogleServicesJson } from "../store-files";
import { mergeGoogleServices, sameFile } from "./files";
import { firebaseSlotsFor, mayHaveSecondApps, usesYallappFirebase, wantedFirebaseApps, type WantedFirebaseApp } from "./mode";
import { chooseProject, poolOf } from "./pool";

/**
 * 136 Registering a client's apps in Yallapp's Firebase, step by step and
 * safe to run again at any time (the owner's save, a build, the frequent
 * job): each app of the bundle gets its row (`app_firebase_apps`), is found
 * by its package name or bundle ID before it's added (so a retry never adds
 * it twice), waits for Firebase's operation, and once ready its file is read
 * and saved where a client's own would be. A file is saved again only when
 * its content changed (an automatic build follows on plans that have them).
 * A package name or bundle ID changed: the old Firebase app is removed and
 * the new one added. What fails stays for the next run (the frequent job,
 * every 5 minutes), with Google's reason kept on the row for the team.
 */

export interface FirebaseDeps {
  store: DataStore;
  now: () => Date;
  management: FirebaseManagement;
  /** Saves a config file as an asset of the client's account; its ID. */
  saveFile(clientId: string, kind: "firebase_android" | "firebase_ios", data: Buffer): Promise<string>;
  /** The bytes of an asset; null when it's gone. */
  readAsset(assetId: string): Promise<Buffer | null>;
  /** Waits between two reads of an operation (tests: none). */
  wait?: (ms: number) => Promise<void>;
  /** How long one sync may wait for Firebase's operations (default 6 s). */
  budgetMs?: number;
}

export type FirebaseSyncState =
  /** Not in Yallapp's Firebase. */
  | "off"
  /** No package name or bundle ID yet. */
  | "waiting"
  /** No pool project has room yet (the platform is making one, or the team adds one). */
  | "no_room"
  /** Firebase is still adding some of the apps. */
  | "pending"
  | "ready"
  /** Some of the apps couldn't be added; the next run tries again. */
  | "failed";

export interface FirebaseSyncResult {
  state: FirebaseSyncState;
  /** A file was saved, or the app got its project. */
  changed: boolean;
  /** Google's words for the first thing that failed. */
  problem: string | null;
}

/** How soon a failed app is tried again by the frequent job. */
export const RETRY_FAILED_MS = 15 * 60_000;
const POLL_MS = 1500;
const DISPLAY_NAME_MAX = 100;

const problemOf = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 500);

/** The name the Firebase console shows: the app's name, which app of the bundle, and its Yallapp ID's start. */
export function firebaseDisplayName(app: Pick<App, "id" | "appName">, variant: AppFirebaseApp["variant"]): string {
  const name = (app.appName ?? "").trim() || "Yallapp app";
  return `${name}${variant === "customer" ? "" : ` (${variant})`} · ${app.id.slice(0, 8)}`.slice(0, DISPLAY_NAME_MAX);
}

/** The app's bundle's delivery settings, when its kind can have second apps. */
async function bundleSettings(store: DataStore, app: App): Promise<DeliverySettings | null> {
  return mayHaveSecondApps(app) ? deliverySettingsOf(await store.getDeliverySettings(app.id)) : null;
}

/** Whether the app is fully set up: every app of its bundle ready in its project, and its files saved. Reads no file and calls nobody. */
export async function firebaseSetUp(store: DataStore, app: App): Promise<boolean> {
  if (!usesYallappFirebase(app) || !app.firebaseProjectId) return false;
  const settings = await bundleSettings(store, app);
  const wanted = wantedFirebaseApps(app, settings);
  if (wanted.length === 0) return false;
  const rows = await store.listAppFirebaseApps(app.id);
  const ready = wanted.every((w) => rows.some((r) => r.variant === w.variant && r.platform === w.platform && r.identifier === w.identifier && r.firebaseProjectId === app.firebaseProjectId && r.status === "ready"));
  if (!ready) return false;
  if (wanted.some((w) => w.platform === "android") && !app.firebaseAndroidAssetId) return false;
  if (wanted.some((w) => w.variant === "customer" && w.platform === "ios") && !app.firebaseIosAssetId) return false;
  if (wanted.some((w) => w.variant !== "customer" && w.platform === "ios") && !settings?.courierFirebaseIosAssetId) return false;
  return true;
}

/** Where Yallapp's set-up of the app is, for the owner: waiting for its package name, being set up, or ready. */
export async function firebaseSetupState(store: DataStore, app: App): Promise<"waiting" | "setting_up" | "ready"> {
  if (!app.androidPackage?.trim() && !app.iosBundleId?.trim()) return "waiting";
  return (await firebaseSetUp(store, app)) ? "ready" : "setting_up";
}

/**
 * Registers what's missing and saves the files. `retryFailed` false (the
 * frequent job) leaves an app that failed less than 15 minutes ago for later.
 */
export async function syncAppFirebase(deps: FirebaseDeps, input: App, options: { retryFailed?: boolean } = {}): Promise<FirebaseSyncResult> {
  const { store } = deps;
  let app = (await store.getAppById(input.id)) ?? input;
  if (!usesYallappFirebase(app)) return { state: "off", changed: false, problem: null };
  const settings = await bundleSettings(store, app);
  const wanted = wantedFirebaseApps(app, settings);
  if (wanted.length === 0) return { state: "waiting", changed: false, problem: null };
  let changed = false;

  // The app's project: kept once chosen, so its apps stay together.
  let project = app.firebaseProjectId ? await store.getFirebaseProject(app.firebaseProjectId) : null;
  if (!project) {
    const pool = poolOf(await store.listFirebaseProjects(), await store.countAppFirebaseAppsByProject());
    project = chooseProject(pool, firebaseSlotsFor(app));
    if (!project) return { state: "no_room", changed: false, problem: null };
    await store.updateApp(app.id, { firebaseProjectId: project.projectId }, deps.now());
    app = { ...app, firebaseProjectId: project.projectId };
    changed = true;
  }

  const deadline = Date.now() + (deps.budgetMs ?? 6000);
  const rows = await store.listAppFirebaseApps(app.id);
  let problem: string | null = null;
  const done: AppFirebaseApp[] = [];
  for (const want of wanted) {
    const row = rows.find((r) => r.variant === want.variant && r.platform === want.platform) ?? null;
    const next = await advance(deps, app, project, want, row, deadline, options.retryFailed ?? true);
    problem ??= next.error;
    done.push(next);
  }

  if (await saveFiles(deps, app, project, wanted, done, settings)) changed = true;
  await markFullWhenFull(store, project, deps.now());
  const state: FirebaseSyncState = done.every((r) => r.status === "ready") ? "ready" : done.some((r) => r.status === "failed") ? "failed" : "pending";
  return { state, changed, problem };
}

/** The row moved on as far as it goes now. */
async function advance(deps: FirebaseDeps, app: App, project: FirebaseProject, want: WantedFirebaseApp, current: AppFirebaseApp | null, deadline: number, retryFailed: boolean): Promise<AppFirebaseApp> {
  const { store, management } = deps;
  const save = async (row: AppFirebaseApp) => {
    const next = { ...row, updatedAt: deps.now() };
    await store.saveAppFirebaseApp(next);
    return next;
  };
  let row: AppFirebaseApp =
    current ??
    (await save({
      appId: app.id,
      variant: want.variant,
      platform: want.platform,
      firebaseProjectId: project.projectId,
      identifier: want.identifier,
      firebaseAppId: null,
      operation: null,
      status: "pending",
      error: null,
      apnsConfiguredAt: null,
      createdAt: deps.now(),
      updatedAt: deps.now(),
    }));

  // A new package name or bundle ID (or project): the old Firebase app goes first, then the new one is added.
  if (row.identifier !== want.identifier || row.firebaseProjectId !== project.projectId) {
    const old = row.firebaseAppId;
    if (old) {
      row = await save({ ...row, status: "removing" });
      try {
        await management.removeApp(row.firebaseProjectId, row.platform, old);
      } catch (error) {
        return save({ ...row, error: problemOf(error) });
      }
    }
    row = await save({ ...row, firebaseProjectId: project.projectId, identifier: want.identifier, firebaseAppId: null, operation: null, status: "pending", error: null, apnsConfiguredAt: null });
  }
  if (row.status === "ready" && row.firebaseAppId) return row;
  if (row.status === "removing") row = { ...row, status: "pending" };
  if (row.status === "failed" && !retryFailed && deps.now().getTime() - row.updatedAt.getTime() < RETRY_FAILED_MS) return row;

  try {
    let operation: Operation | null = row.operation ? await management.getOperation(row.operation) : null;
    if (!operation) {
      // Found first: an earlier try may have added it already.
      const found = await management.findApp(project.projectId, want.platform, want.identifier);
      if (found) return save({ ...row, firebaseAppId: found.appId, operation: null, status: "ready", error: null });
      try {
        operation = await management.createApp(project.projectId, want.platform, {
          identifier: want.identifier,
          displayName: firebaseDisplayName(app, want.variant),
          apiKeyId: project.apiKeyId,
          teamId: want.platform === "ios" ? (app.appleTeamId ?? null) : null,
        });
      } catch (error) {
        if (error instanceof GoogleApiError && (error.code === "ALREADY_EXISTS" || error.httpStatus === 409)) {
          const again = await management.findApp(project.projectId, want.platform, want.identifier);
          if (again) return save({ ...row, firebaseAppId: again.appId, operation: null, status: "ready", error: null });
        }
        throw error;
      }
      row = await save({ ...row, operation: operation.name ?? null, status: "pending", error: null });
    }
    // Firebase usually adds an app in a few seconds: wait a little, the next run reads the rest.
    while (!operation.done && operation.name && Date.now() + POLL_MS < deadline) {
      await (deps.wait ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(POLL_MS);
      operation = await management.getOperation(operation.name);
    }
    if (!operation.done) return row;
    const failed = operationProblem(operation);
    if (failed) return save({ ...row, operation: null, status: "failed", error: problemOf(failed) });
    const record = appRecordOf(want.platform, operation.response);
    if (!record) return save({ ...row, operation: null, status: "failed", error: "Firebase's answer named no app." });
    return save({ ...row, firebaseAppId: record.appId, operation: null, status: "ready", error: null });
  } catch (error) {
    return save({ ...row, status: "failed", error: problemOf(error) });
  }
}

/** Saves the files of the apps that are ready, each only when its content changed; whether any was saved. */
async function saveFiles(deps: FirebaseDeps, app: App, project: FirebaseProject, wanted: WantedFirebaseApp[], rows: AppFirebaseApp[], settings: DeliverySettings | null): Promise<boolean> {
  const { store, management } = deps;
  const ready = (variant: string, platform: FirebaseAppPlatform) => rows.find((r) => r.variant === variant && r.platform === platform && r.status === "ready" && r.firebaseAppId && r.firebaseProjectId === project.projectId);
  const current = async (assetId: string | null | undefined) => (assetId ? ((await deps.readAsset(assetId))?.toString("utf8") ?? null) : null);
  const patch: Partial<App> = {};
  let courierIos: string | null = null;
  let saved = false;

  // Android: one google-services.json with the customers' app and the second apps that are ready.
  const android = wanted.filter((w) => w.platform === "android");
  if (app.androidPackage && ready("customer", "android")) {
    try {
      const files: string[] = [];
      const packages: string[] = [];
      for (const want of android) {
        const row = ready(want.variant, "android");
        if (!row) continue;
        files.push((await management.getConfig(project.projectId, "android", row.firebaseAppId!)).contents);
        packages.push(want.identifier);
      }
      const merged = mergeGoogleServices(files, packages);
      if (merged && checkGoogleServicesJson(merged, app.androidPackage) === null && !sameFile(merged, await current(app.firebaseAndroidAssetId))) {
        patch.firebaseAndroidAssetId = await deps.saveFile(app.clientId, "firebase_android", Buffer.from(merged));
      }
    } catch (error) {
      console.error(`[firebase] the Android file of ${app.id}: ${problemOf(error)}`);
    }
  }

  // iOS: the customers' app's plist, and the second app's.
  for (const want of wanted.filter((w) => w.platform === "ios")) {
    const row = ready(want.variant, "ios");
    if (!row) continue;
    try {
      const plist = (await management.getConfig(project.projectId, "ios", row.firebaseAppId!)).contents;
      if (checkGoogleServiceInfoPlist(plist, want.identifier) !== null) continue;
      if (want.variant === "customer") {
        if (!sameFile(plist, await current(app.firebaseIosAssetId))) patch.firebaseIosAssetId = await deps.saveFile(app.clientId, "firebase_ios", Buffer.from(plist));
      } else if (settings && !sameFile(plist, await current(settings.courierFirebaseIosAssetId))) {
        courierIos = await deps.saveFile(app.clientId, "firebase_ios", Buffer.from(plist));
      }
    } catch (error) {
      console.error(`[firebase] the iOS file of ${app.id} (${want.variant}): ${problemOf(error)}`);
    }
  }

  const now = deps.now();
  if (Object.keys(patch).length) {
    await store.updateApp(app.id, patch, now);
    saved = true;
  }
  if (courierIos && settings) {
    await store.saveDeliverySettings(app.id, { ...deliverySettingsOf(await store.getDeliverySettings(app.id)), courierFirebaseIosAssetId: courierIos }, now);
    saved = true;
  }
  // A build made before the files has no push: plans with automatic builds get the next one.
  if (saved && (await store.listBuildsByApp(app.id, 1, "all")).length > 0) await scheduleAutoBuild(store, app, now);
  return saved;
}

/** A project that reached its most apps takes no new client. */
async function markFullWhenFull(store: DataStore, project: FirebaseProject, now: Date): Promise<void> {
  if (project.status !== "open") return;
  const used = (await store.countAppFirebaseAppsByProject())[project.projectId] ?? 0;
  if (used >= project.maxApps) await store.saveFirebaseProject({ ...project, status: "full", updatedAt: now });
}

/**
 * 73 The app is purged: its apps leave Yallapp's Firebase (removed at once,
 * so their places are free). Throws when one can't be removed: the purge
 * waits and the daily job tries again.
 */
export async function removeAppFirebase(deps: Pick<FirebaseDeps, "store" | "management">, appId: string): Promise<number> {
  let removed = 0;
  for (const row of await deps.store.listAppFirebaseApps(appId)) {
    if (row.firebaseAppId) await deps.management.removeApp(row.firebaseProjectId, row.platform, row.firebaseAppId);
    await deps.store.deleteAppFirebaseApp(row.appId, row.variant, row.platform);
    removed++;
  }
  return removed;
}

export interface FirebaseRunReport {
  /** Apps looked at, and the ones now ready or still failing. */
  apps: number;
  ready: number;
  failed: number;
  /** Apps waiting for a project with room. */
  waiting?: number;
}

/**
 * 136 The frequent job: every app in Yallapp's Firebase that isn't fully set
 * up yet is taken one step further, within a few seconds in all; an app set
 * up costs no call to Google.
 */
export async function runFirebaseRegistrations(deps: FirebaseDeps, options: { budgetMs?: number } = {}): Promise<FirebaseRunReport> {
  const report: FirebaseRunReport = { apps: 0, ready: 0, failed: 0 };
  const until = Date.now() + (options.budgetMs ?? 8000);
  for (const app of await deps.store.listApps()) {
    if (Date.now() > until) break;
    if (app.deletedAt || !usesYallappFirebase(app) || (await firebaseSetUp(deps.store, app))) continue;
    report.apps++;
    try {
      const result = await syncAppFirebase({ ...deps, budgetMs: Math.min(deps.budgetMs ?? 4000, Math.max(0, until - Date.now())) }, app, { retryFailed: false });
      if (result.state === "ready") report.ready++;
      if (result.state === "failed") report.failed++;
      if (result.state === "no_room") report.waiting = (report.waiting ?? 0) + 1;
    } catch (error) {
      report.failed++;
      console.error(`[firebase] ${app.id}: ${problemOf(error)}`);
    }
  }
  return report;
}
