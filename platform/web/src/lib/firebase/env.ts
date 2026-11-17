import "server-only";
import { getBlobStore } from "../blobs";
import { newId } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App, PushSetup } from "../data/types";
import { yallappFirebaseEnv, type YallappFirebaseEnv } from "../env";
import { platformSetting } from "../settings/platform";
import { cloudProjects, type CloudProjects } from "../google/cloud-projects";
import { CLOUD_PLATFORM_SCOPE, federatedAccessToken, WIF_SUBJECTS, type Federation } from "../google/federation";
import { federationFromEnv } from "../google/federation-env";
import { firebaseManagement, type FirebaseManagement } from "../google/firebase-management";
import type { Fetch } from "../google/http";
import type { TeamMail } from "../watch/alerts";
import type { CheckDeps } from "./check";
import { firebaseSlotsFor, usesYallappFirebase, yallappFirebaseFits } from "./mode";
import { chooseProject, poolOf } from "./pool";
import type { ProjectDeps } from "./projects";
import type { FirebaseDeps } from "./register";

/**
 * 136 Yallapp's Firebase wired to this server: the federation from the
 * environment (GOOGLE_WIF_PROVIDER and the two service accounts), the
 * Firebase Management and Cloud project APIs with the apps account's token,
 * and the files saved as assets in Netlify Blobs. Null when it isn't set up:
 * nothing then calls Google.
 */
export interface YallappFirebase {
  env: YallappFirebaseEnv;
  federation: Federation;
  management: FirebaseManagement;
  cloud: CloudProjects;
  registrations(now?: () => Date): FirebaseDeps;
  /** Null without a parent to create projects under: only the team adds them. */
  projects(parent: string | null, mail?: TeamMail | null): ProjectDeps | null;
  check(parent: string | null): CheckDeps;
}

/** 136 Where the platform creates projects: Admin's setting, else GOOGLE_FIREBASE_PROJECT_PARENT; null: nowhere. */
export async function poolParent(store: DataStore): Promise<string | null> {
  const saved = (await platformSetting(store, "firebasePool"))?.value.parent ?? null;
  return saved ?? yallappFirebaseEnv()?.parent ?? null;
}

const PARENT = /^(organizations|folders)\/\d{1,20}$/;

/** A parent as typed: `organizations/123…` or `folders/123…`; null when it isn't one. */
export function parsePoolParent(value: string): string | null {
  const v = value.trim();
  return PARENT.test(v) ? v : null;
}

export function yallappFirebase(store: DataStore, options: { fetcher?: Fetch } = {}): YallappFirebase | null {
  const found = federationFromEnv(store);
  if (!found) return null;
  const { env, federation } = found;
  const token = () => federatedAccessToken(federation, { serviceAccount: env.appsAccount, subject: WIF_SUBJECTS.apps, scopes: [CLOUD_PLATFORM_SCOPE], fetcher: options.fetcher });
  const management = firebaseManagement({ token, endpoints: federation.endpoints, fetcher: options.fetcher });
  const cloud = cloudProjects({ token, endpoints: federation.endpoints, fetcher: options.fetcher });
  const accounts = { pushAccount: env.pushAccount, appsAccount: env.appsAccount };
  return {
    env,
    federation,
    management,
    cloud,
    registrations: (now = () => new Date()) => ({
      store,
      now,
      management,
      saveFile: (clientId, kind, data) => saveConfigAsset(store, clientId, kind, data, now()),
      readAsset: async (id) => {
        const asset = await store.getAsset(id);
        return asset ? ((await getBlobStore().get(asset.blobKey))?.data ?? null) : null;
      },
    }),
    projects: (parent, mail) => (parent ? { store, now: () => new Date(), cloud, management, accounts: { ...accounts, parent }, mail } : null),
    check: (parent) => ({ store, now: () => new Date(), federation, accounts: { ...accounts, parent }, management, cloud, fetcher: options.fetcher }),
  };
}

/** A config file Firebase gave, saved as the client's asset of that kind. */
async function saveConfigAsset(store: DataStore, clientId: string, kind: "firebase_android" | "firebase_ios", data: Buffer, now: Date): Promise<string> {
  const id = newId();
  const android = kind === "firebase_android";
  const blobKey = `assets/${clientId}/${id}.${android ? "json" : "plist"}`;
  const contentType = android ? "application/json" : "application/xml";
  await getBlobStore().put(blobKey, data, contentType);
  await store.createAsset({ id, clientId, kind, blobKey, contentType, size: data.length, createdAt: now });
  return id;
}

/** Whether a project of the pool has room for this app's possible apps now. */
export async function poolHasRoomFor(store: DataStore, app: Pick<App, "appType" | "vertical">): Promise<boolean> {
  return chooseProject(poolOf(await store.listFirebaseProjects(), await store.countAppFirebaseAppsByProject()), firebaseSlotsFor(app)) !== null;
}

/**
 * Whether the app is offered "Yallapp sets up notifications": Yallapp's
 * Firebase is set up here, the app is on the hosted API, and it's in it
 * already, or a project has room for it, or the platform makes the next one.
 */
export async function yallappFirebaseOffered(store: DataStore, app: App): Promise<boolean> {
  const firebase = federationFromEnv(store);
  if (!firebase || !yallappFirebaseFits(app)) return false;
  if (usesYallappFirebase(app) || (await poolParent(store))) return true;
  return poolHasRoomFor(store, app);
}

/** A new app starts in Yallapp's Firebase when it's set up here and a project has room; otherwise as before (null). */
export async function pushSetupForNewApp(store: DataStore, app: Pick<App, "appType" | "vertical">): Promise<PushSetup | null> {
  if (!federationFromEnv(store)) return null;
  return (await poolHasRoomFor(store, app)) ? "yallapp" : null;
}
