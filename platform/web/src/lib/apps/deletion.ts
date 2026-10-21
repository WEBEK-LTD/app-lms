import { verifyPassword } from "../auth/password";
import type { BlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, AppDeletion, Client, User } from "../data/types";
import type { MediaStorage } from "../media/storage";
import { deleteAppMedia } from "../media/sweep";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import type { BuildFolderRemover } from "./build-files";

/**
 * 73 Deleting an app (roadmap 60.13). The owner deletes an app from the
 * dashboard (Setup › Delete this app) with its name typed again and their
 * password. It is gone at once for everyone: the store leaves a deleted app
 * and its license out of every read, so the hosted API answers 404, the
 * WordPress plugin's license is `license_not_found`, the dashboard, the
 * Owner API and the admin's lists no longer show it, its builds don't run
 * and its notifications aren't sent. Our team can restore it from Admin ›
 * Deleted apps for `APP_RESTORE_DAYS`; then the daily job (or "Delete now")
 * purges it: its Media files on the media server, its build folders on the
 * files host, the images only it used in Netlify Blobs, and its rows (on
 * delete cascade). Plan payments stay, without their app, for billing.
 * Messages are English sentences, translated in the dashboard by the `apps`
 * catalog's `known` texts.
 */

export const APP_RESTORE_DAYS = 7;
const DAY = 86_400_000;

export const APP_DELETION_MESSAGES = {
  owner: "Only the owner of this business can delete an app, signed in with their own password.",
  name: "Type the app's name exactly as it shows here.",
  password: "Enter your password.",
  wrongPassword: "The password is incorrect.",
  tooMany: "Too many attempts. Please wait a few minutes and try again.",
  gone: "This app no longer exists.",
} as const;

/** Who is deleting: the dashboard's context (lib/auth/session.ts ClientContext). */
export interface AppDeleter {
  /** The account's owner. */
  user: User;
  staff: Pick<User, "id" | "email"> | null;
  member: Pick<User, "id" | "email"> | null;
  client: Client;
}

/** Why this person can't delete an app; null for the owner signed in themselves. */
export function appDeletionRefusal(asker: Pick<AppDeleter, "staff" | "member">): string | null {
  return asker.staff || asker.member ? APP_DELETION_MESSAGES.owner : null;
}

/** The typed name matches the app's as shown (spaces and letter case aside). */
export function sameAppName(typed: string, shown: string): boolean {
  const tidy = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return tidy(typed) !== "" && tidy(typed) === tidy(shown);
}

export type AppDeletionResult = { ok: true; deletion: AppDeletion } | { ok: false; errors?: Record<string, string>; message?: string };

/** The owner deletes one of their apps: `shownName` is its name as the page shows it. */
export async function deleteApp(
  deps: { store: DataStore; now: Date },
  asker: AppDeleter,
  input: { app: App; shownName: string; name: string; password: string },
): Promise<AppDeletionResult> {
  const refusal = appDeletionRefusal(asker);
  if (refusal) return { ok: false, message: refusal };
  if (input.app.clientId !== asker.client.id) return { ok: false, message: APP_DELETION_MESSAGES.gone };
  const errors: Record<string, string> = {};
  if (!sameAppName(input.name, input.shownName)) errors.name = APP_DELETION_MESSAGES.name;
  if (!input.password) errors.password = APP_DELETION_MESSAGES.password;
  if (Object.keys(errors).length) return { ok: false, errors };

  const { store, now } = deps;
  // The same counter as signing in with this address: the form can't be used to guess the password.
  const limited = await hitRateLimit(store, RATE_LIMITS.signInEmail, asker.user.email.toLowerCase(), now);
  if (!limited.allowed) return { ok: false, message: APP_DELETION_MESSAGES.tooMany };
  const fresh = (await store.getUserById(asker.user.id)) ?? asker.user;
  if (!(await verifyPassword(fresh.passwordHash, input.password))) return { ok: false, errors: { password: APP_DELETION_MESSAGES.wrongPassword } };

  const deletion: AppDeletion = {
    id: newId(),
    appId: input.app.id,
    clientId: asker.client.id,
    appName: input.shownName.slice(0, 120),
    reason: "owner",
    deletedBy: fresh.email,
    deletedAt: now,
    purgeAfter: new Date(now.getTime() + APP_RESTORE_DAYS * DAY),
    status: "waiting",
    closedAt: null,
    closedBy: null,
    pendingBuilds: [],
  };
  if (!(await store.softDeleteApp(deletion))) return { ok: false, message: APP_DELETION_MESSAGES.gone };
  return { ok: true, deletion };
}

/** Our team brings a deleted app back (Admin › Deleted apps) while it waits; false once it's restored or purged. */
export async function restoreApp(deps: { store: DataStore; now: Date }, deletionId: string, by: string): Promise<boolean> {
  return deps.store.restoreDeletedApp(deletionId, by, deps.now);
}

/** Where an app's files are, for its purge. Null parts aren't set up here (local runs, tests). */
export interface PurgeDeps {
  store: DataStore;
  now: Date;
  media: MediaStorage | null;
  blobs: Pick<BlobStore, "delete">;
  /** Removes a build's folder from the files host; null when the host isn't set up (FILES_SIGNING_SECRET). */
  removeBuildFolder: BuildFolderRemover | null;
}

/**
 * Deletes an app's files: its Media library (the media server's folder and
 * the rows), its build folders on the files host (those the host didn't
 * confirm are returned, to try again), and the uploaded images only this app
 * used (icon, logo, screenshots, course, product, article, listing, event and
 * campaign images, its pages' pictures) from Netlify Blobs with their rows.
 * Throws when the media server can't be reached: nothing is purged then.
 */
export async function purgeAppFiles(deps: PurgeDeps, app: App): Promise<{ pendingBuilds: string[] }> {
  const { store } = deps;
  await deleteAppMedia({ store, storage: deps.media }, app.id);

  const pendingBuilds: string[] = [];
  for (const build of await store.listBuildsByApp(app.id, 5000)) {
    if (!deps.removeBuildFolder) {
      // Only builds that reported files have a folder to remove.
      if (build.artifacts.length) pendingBuilds.push(build.id);
      continue;
    }
    try {
      await deps.removeBuildFolder(build.id);
    } catch (e) {
      console.error(`[apps] build folder ${build.id}: ${e instanceof Error ? e.message : String(e)}`);
      pendingBuilds.push(build.id);
    }
  }

  const mine = new Set(await store.listAppAssetReferences(app.id));
  const others = new Set<string>();
  for (const other of await store.listAppsByClientIncludingDeleted(app.clientId)) {
    if (other.id === app.id) continue;
    for (const id of await store.listAppAssetReferences(other.id)) others.add(id);
  }
  for (const asset of await store.listAssetsByClient(app.clientId)) {
    if (!mine.has(asset.id.toLowerCase()) || others.has(asset.id.toLowerCase())) continue;
    await deps.blobs.delete(asset.blobKey);
    await store.deleteAsset(asset.id);
  }
  return { pendingBuilds };
}

export type PurgeOutcome = "purged" | "not_waiting" | "failed";

/**
 * Purges a deleted app now: its files, then its rows (with the record marked
 * purged). `not_waiting` when it was restored or purged meanwhile; `failed`
 * (logged, nothing purged) when its files couldn't be deleted: the daily job
 * tries again.
 */
export async function purgeApp(deps: PurgeDeps, deletion: AppDeletion, by: string): Promise<PurgeOutcome> {
  const current = await deps.store.getAppDeletion(deletion.id);
  if (!current || current.status !== "waiting") return "not_waiting";
  const app = await deps.store.getAppIncludingDeleted(current.appId);
  let pendingBuilds: string[] = [];
  if (app) {
    try {
      ({ pendingBuilds } = await purgeAppFiles(deps, app));
    } catch (e) {
      console.error(`[apps] the files of app ${current.appId} weren't deleted: ${e instanceof Error ? e.message : String(e)}`);
      return "failed";
    }
  }
  return (await deps.store.purgeDeletedApp(current.id, by, deps.now, pendingBuilds)) ? "purged" : "not_waiting";
}

export interface AppPurgeReport {
  purged: number;
  failed: number;
  /** Build folders removed from the files host on a later try. */
  foldersRemoved: number;
  /** Build folders still on the files host. */
  foldersLeft: number;
}

/**
 * The daily job: purges the apps deleted more than `APP_RESTORE_DAYS` ago,
 * then tries again the build folders the files host didn't confirm.
 */
export async function runAppPurges(deps: PurgeDeps, limit = 25): Promise<AppPurgeReport> {
  const report: AppPurgeReport = { purged: 0, failed: 0, foldersRemoved: 0, foldersLeft: 0 };
  for (const deletion of await deps.store.listDueAppDeletions(deps.now, limit)) {
    const outcome = await purgeApp(deps, deletion, "daily job");
    if (outcome === "purged") report.purged += 1;
    if (outcome === "failed") report.failed += 1;
  }
  if (!deps.removeBuildFolder) return report;
  for (const deletion of await deps.store.listAppDeletionsWithPendingBuilds(50)) {
    const left: string[] = [];
    for (const buildId of deletion.pendingBuilds) {
      try {
        await deps.removeBuildFolder(buildId);
        report.foldersRemoved += 1;
      } catch {
        left.push(buildId);
      }
    }
    report.foldersLeft += left.length;
    if (left.length !== deletion.pendingBuilds.length) await deps.store.setAppDeletionPendingBuilds(deletion.id, left);
  }
  return report;
}
