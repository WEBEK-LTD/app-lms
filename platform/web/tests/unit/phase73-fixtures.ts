import { randomUUID } from "node:crypto";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import type { PurgeDeps } from "@/lib/apps/deletion";
import { registerClient } from "@/lib/auth/accounts";
import type { DataStore } from "@/lib/data/store";
import type { App, Asset, Build, MediaFile, PlanPayment } from "@/lib/data/types";
import type { MediaStorage } from "@/lib/media/storage";
import { KEY } from "./helpers";

/**
 * 73 An account to delete, on either store: the owner (with a password, a
 * session and a phone), two apps (the first with the license, a build with
 * files, a customer, a Media file, a paid plan payment; an icon of its own
 * and a logo shared with the second app), and a team member with their own
 * sign-in.
 */

export const PASSWORD = "a long enough password 42";

export async function seedAccount(store: DataStore, now: Date, email = `ada-${randomUUID()}@academy.test`) {
  const { user, client } = await registerClient(store, { name: "Ada", email, whatsapp: "+201001234567", siteUrl: "", password: PASSWORD, country: "EG" }, now);
  const { licenseKey } = await activateClient(store, { clientId: client.id, plan: "growth", activeUntil: new Date(now.getTime() + 30 * 86_400_000), paymentNote: "" }, KEY, now);
  const asset = async (kind: Asset["kind"]): Promise<Asset> => {
    const id = randomUUID();
    const row: Asset = { id, clientId: client.id, kind, blobKey: `assets/${client.id}/${id}.png`, contentType: "image/png", size: 10, createdAt: now };
    await store.createAsset(row);
    return row;
  };
  const icon = await asset("icon");
  const shared = await asset("logo");
  const ownB = await asset("product_image");
  const appA: App = { ...newApp(client.id, null, now, "lms"), appName: "Ada Academy", backend: "hosted", iconAssetId: icon.id, logoAssetId: shared.id };
  await store.createApp(appA);
  const appB: App = { ...newApp(client.id, null, new Date(now.getTime() + 1000), "store"), appName: "Ada Shop", logoAssetId: shared.id, iconAssetId: ownB.id };
  await store.createApp(appB);
  const build = await store.createBuild({
    id: randomUUID(),
    clientId: client.id,
    appId: appA.id,
    versionName: "1.0.0",
    status: "ready",
    stages: { queued: "done", android: "done", ios: "skipped", upload_play: "skipped", upload_testflight: "skipped" },
    config: {} as Build["config"],
    storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
    autoPublish: false,
    artifacts: [{ kind: "apk", url: "https://files.yallapp.test/builds/x/app.apk" }],
    message: null,
    logUrl: null,
    createdAt: now,
    startedAt: now,
    finishedAt: now,
    updatedAt: now,
  });
  const customer = await store.createHostedUser({ appId: appA.id, phone: "+905321234567", name: "Deniz", email: null, city: null, now });
  const media: MediaFile = {
    id: randomUUID(),
    appId: appA.id,
    name: "Lesson 1.mp4",
    kind: "video",
    contentType: "video/mp4",
    sizeBytes: 1000,
    storageKey: `${appA.id}/lesson.mp4`,
    status: "ready",
    public: false,
    source: "library",
    createdAt: now,
    updatedAt: now,
  };
  await store.createMediaFile(media);
  const payment: PlanPayment = {
    id: randomUUID(),
    clientId: client.id,
    appId: appA.id,
    plan: "growth",
    months: 1,
    amountCents: 150_000,
    currency: "EGP",
    status: "paid",
    tokenHash: randomUUID().replace(/-/g, "").padEnd(64, "0"),
    paymentId: "kashier-1",
    createdAt: now,
    paidAt: now,
    paymentProvider: "kashier",
    providerRef: "ref-1",
  };
  await store.createPlanPayment(payment);
  await store.createUserSession({ idHash: randomUUID().replace(/-/g, "").padEnd(64, "a"), userId: user.id, createdAt: now, expiresAt: new Date(now.getTime() + 14 * 86_400_000) });
  const teammate = await store.createUser({ email: `kerem-${randomUUID()}@cafe.test`, name: "Kerem", passwordHash: null, now });
  await store.saveTeamMember({ clientId: client.id, userId: teammate.id, role: "manager", areas: [], appIds: null, addedBy: email, createdAt: now, updatedAt: now });
  const license = (await store.getLicenseForApp(client.id, appA.id))!;
  return { user, client, appA, appB, build, customer: customer!, media, payment, teammate, license, licenseKey: licenseKey!, assets: { icon, shared, ownB } };
}

/** Where the purge's files went: a media server, Netlify Blobs and the files host that record what they're asked. */
export function fakeFiles(store: DataStore, now: Date, options: { mediaDown?: boolean; filesDown?: Set<string> } = {}) {
  const calls = { mediaApps: [] as string[], blobs: [] as string[], folders: [] as string[] };
  const media = {
    mode: "fs",
    link: () => ({ url: "https://media.test", expiresAt: now }),
    stat: async () => ({ exists: false, complete: false, size: 0 }),
    delete: async () => undefined,
    deleteApp: async (appId: string) => {
      if (options.mediaDown) throw new Error("The media server couldn't be reached.");
      calls.mediaApps.push(appId);
    },
    listApps: async () => [],
  } as unknown as MediaStorage;
  const deps: PurgeDeps = {
    store,
    now,
    media,
    blobs: { delete: async (key: string) => void calls.blobs.push(key) },
    removeBuildFolder: async (buildId: string) => {
      if (options.filesDown?.has(buildId)) throw new Error("The files host answered 404.");
      calls.folders.push(buildId);
    },
  };
  return { deps, calls };
}
