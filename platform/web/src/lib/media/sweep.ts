import type { DataStore } from "../data/store";
import type { MediaStorage } from "./storage";

/**
 * 62 The files of an app that no longer exists. Deleting an app (or the
 * client and every app with it) removes its rows, Media library ones
 * included, from the database; its files are on the media server, so they
 * are removed there too:
 *
 * - `deleteAppMedia` at once, for whatever deletes an app in code;
 * - the daily job (`sweepMediaFolders`) for apps deleted any other way:
 *   it lists the app folders on the media server, and removes a folder whose
 *   app is gone once it has been seen gone for `ORPHAN_GRACE_DAYS` (so a
 *   database restored from a backup finds its files). When most folders look
 *   gone it does nothing and says so: the platform is likely looking at
 *   another database than the media server's.
 */

export const ORPHAN_GRACE_DAYS = 7;
const DAY = 86_400_000;

/** Removes every file of an app from the media server and its rows. */
export async function deleteAppMedia(deps: { store: Pick<DataStore, "listMediaFiles" | "deleteMediaFile">; storage: MediaStorage | null }, appId: string): Promise<void> {
  if (deps.storage) await deps.storage.deleteApp(appId);
  for (const file of await deps.store.listMediaFiles(appId, { limit: 10_000 })) await deps.store.deleteMediaFile(appId, file.id);
}

export interface SweepResult {
  folders: number;
  /** Folders of apps that no longer exist, still in their days of grace. */
  waiting: number;
  removed: number;
  /** Nothing was done: most folders looked gone. */
  skipped: boolean;
}

export async function sweepMediaFolders(deps: {
  store: Pick<DataStore, "getAppIncludingDeleted" | "listPlatformSettings" | "setPlatformSetting">;
  storage: MediaStorage | null;
  now: Date;
}): Promise<SweepResult> {
  const result: SweepResult = { folders: 0, waiting: 0, removed: 0, skipped: false };
  if (!deps.storage) return result;
  const folders = await deps.storage.listApps();
  result.folders = folders.length;
  const gone: string[] = [];
  // 73 A deleted app's files stay while it can be restored: its purge removes them.
  for (const appId of folders) if (!(await deps.store.getAppIncludingDeleted(appId))) gone.push(appId);
  if (folders.length > 0 && gone.length * 2 > folders.length) {
    console.error(`[daily] media: ${gone.length} of ${folders.length} app folders have no app in the database; nothing removed. Check that the platform and the media server belong together.`);
    return { ...result, skipped: true };
  }
  const saved = (await deps.store.listPlatformSettings()).find((s) => s.key === "mediaSweep")?.value as { orphans?: Record<string, string> } | undefined;
  const seen = saved?.orphans ?? {};
  const orphans: Record<string, string> = {};
  for (const appId of gone) {
    const since = seen[appId] && !Number.isNaN(Date.parse(seen[appId]!)) ? new Date(seen[appId]!) : deps.now;
    if (deps.now.getTime() - since.getTime() >= ORPHAN_GRACE_DAYS * DAY) {
      try {
        await deps.storage.deleteApp(appId);
        result.removed++;
        continue;
      } catch (e) {
        console.error(`[daily] media folder ${appId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    orphans[appId] = since.toISOString();
    result.waiting++;
  }
  if (JSON.stringify(orphans) !== JSON.stringify(seen)) await deps.store.setPlatformSetting("mediaSweep", { orphans }, "daily job", deps.now);
  return result;
}
