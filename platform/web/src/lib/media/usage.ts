import { appLabel } from "../app/label";
import type { DataStore } from "../data/store";
import type { App, OwnerNotice, StoragePack } from "../data/types";
import { planOfLicense } from "../entitlements";
import type { NoticeDeps } from "../notices";
import { mailOptions } from "../email/mail-lang";
import type { Plan, PlanInfo } from "../plans";
import { activePacks, formatBytes, storageLimitBytes, storageState, type StorageState } from "./quota";

/** 51 An app's storage now: its plan, its packs, what its files take. */
export interface AppStorage extends StorageState {
  plan: PlanInfo | null;
  packs: StoragePack[];
  active: StoragePack[];
}

export async function appStorage(store: DataStore, app: Pick<App, "id" | "clientId">, plans: Record<Plan, PlanInfo>, now: Date): Promise<AppStorage> {
  const [license, packs, used] = await Promise.all([store.getLicenseForApp(app.clientId, app.id), store.listStoragePacks(app.id), store.mediaUsage(app.id)]);
  const plan = planOfLicense(plans, license, now);
  return { ...storageState(used, storageLimitBytes(plan, packs, now)), plan, packs, active: activePacks(packs, now) };
}

/**
 * 51 The daily job: each storage pack that ended is looked at once. When the
 * app's files take more than its storage now, the owner gets a dashboard
 * notice and an email; nothing is deleted, new uploads wait. Returns the
 * notices made.
 */
export async function noticeEndedPacks(deps: NoticeDeps, plans: Record<Plan, PlanInfo>): Promise<OwnerNotice[]> {
  const { store, now } = deps;
  const created: OwnerNotice[] = [];
  for (const pack of await store.listEndedStoragePacks(now, 500)) {
    await store.updateStoragePack(pack.id, { endedNoticeAt: now });
    const app = await store.getAppById(pack.appId);
    const client = app ? await store.getClientById(app.clientId) : null;
    if (!app || !client || app.demo) continue;
    const storage = await appStorage(store, app, plans, now);
    if (!storage.over) continue;
    const owner = await store.getUserById(client.userId);
    const name = appLabel(app);
    const mediaUrl = `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/open?${new URLSearchParams({ app: app.id, to: "media" }).toString()}`;
    const values = { app_name: name, pack: `+${pack.gb} GB`, used: formatBytes(storage.usedBytes), storage: formatBytes(storage.limitBytes ?? 0), media_url: mediaUrl };
    const notice = await store.createOwnerNotice({
      clientId: client.id,
      appId: app.id,
      kind: "storage_pack_ended",
      dedupeKey: `storage_pack_ended:${pack.id}:${pack.activeUntil.toISOString()}`.slice(0, 100),
      title: `${name}'s storage pack ended`,
      body: `Its files take ${values.used}, more than its ${values.storage} of storage now. Nothing was deleted and everything keeps playing, but new uploads wait until you buy more storage or delete files.`,
      linkUrl: mediaUrl,
      linkLabel: "Buy more storage",
      tone: "warn",
      createdAt: now,
      emailedAt: null,
      dismissedAt: null,
      resolvedAt: null,
    });
    if (!notice) continue;
    created.push(notice);
    if (owner) {
      try {
        await deps.mail("storage_pack_ended", owner.email, { name: owner.name, ...values }, ...mailOptions(owner));
        await store.updateOwnerNotice(client.id, notice.id, { emailedAt: now });
      } catch (e) {
        console.error("[media] storage email failed", e);
      }
    }
  }
  return created;
}

/** 51 Once the files fit again (deleted, or more storage bought), the notice goes. */
export async function resolveStorageNotices(store: DataStore, app: Pick<App, "id" | "clientId">, plans: Record<Plan, PlanInfo>, now: Date): Promise<void> {
  if (!(await appStorage(store, app, plans, now)).over) await store.resolveOwnerNotices(app.id, ["storage_pack_ended"], now);
}
