import type { FirebaseAppPlatform } from "../data/types";
import type { GoogleEndpoints } from "./endpoints";
import { googleJson, type Fetch, type Operation } from "./http";

/**
 * 136 The Firebase Management API (v1beta1) for Yallapp's own projects:
 * adding a client's Android and iOS apps (long-running operations), finding
 * one by its package name or bundle ID (so a retry never adds it twice),
 * reading its config file, and removing it. Every call carries the token of
 * the `firebase-apps` service account (lib/google/federation.ts).
 */

export interface FirebaseAppRecord {
  /** `projects/<project>/androidApps/<appId>`. */
  name: string;
  /** Firebase's app ID, like `1:1234567890:android:321abc456def7890`. */
  appId: string;
  /** The package name (Android) or the bundle ID (iOS). */
  identifier: string;
  state?: string;
}

export interface FirebaseProjectInfo {
  projectId: string;
  projectNumber: string;
  displayName?: string;
  state?: string;
}

export interface FirebaseConfigFile {
  filename: string;
  /** The file's text: google-services.json or GoogleService-Info.plist. */
  contents: string;
}

export interface FirebaseManagement {
  getProject(projectId: string): Promise<FirebaseProjectInfo>;
  /** Starts adding the app; Firebase answers with the operation creating it. */
  createApp(projectId: string, platform: FirebaseAppPlatform, input: { identifier: string; displayName: string; apiKeyId: string; teamId?: string | null }): Promise<Operation>;
  getOperation(name: string): Promise<Operation>;
  /** The project's app with this package name or bundle ID, or null. */
  findApp(projectId: string, platform: FirebaseAppPlatform, identifier: string): Promise<FirebaseAppRecord | null>;
  getConfig(projectId: string, platform: FirebaseAppPlatform, appId: string): Promise<FirebaseConfigFile>;
  /** Removes the app at once (no 30 days in the bin); an app already gone is fine. */
  removeApp(projectId: string, platform: FirebaseAppPlatform, appId: string): Promise<void>;
  /** Starts adding Firebase to a Google Cloud project. */
  addFirebase(projectId: string): Promise<Operation>;
}

const collection = (platform: FirebaseAppPlatform) => (platform === "android" ? "androidApps" : "iosApps");
/** A Firebase app ID in a path: its colons kept, as Google's own examples write `androidApps/1:123:android:abc:remove`. */
const appPath = (appId: string) => encodeURIComponent(appId).replace(/%3A/gi, ":");

/** The app of an operation's response, or of a list. */
export function appRecordOf(platform: FirebaseAppPlatform, value: unknown): FirebaseAppRecord | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { name?: unknown; appId?: unknown; packageName?: unknown; bundleId?: unknown; state?: unknown };
  const identifier = platform === "android" ? v.packageName : v.bundleId;
  if (typeof v.name !== "string" || typeof v.appId !== "string" || typeof identifier !== "string") return null;
  return { name: v.name, appId: v.appId, identifier, ...(typeof v.state === "string" ? { state: v.state } : {}) };
}

export function firebaseManagement(deps: { token: () => Promise<string>; endpoints: Pick<GoogleEndpoints, "firebase">; fetcher?: Fetch }): FirebaseManagement {
  const fetcher = deps.fetcher ?? fetch;
  const base = `${deps.endpoints.firebase}/v1beta1`;
  const call = async <T>(url: string, init: { method?: string; body?: unknown } = {}) => googleJson<T>(fetcher, url, { ...init, token: await deps.token() });
  const project = (projectId: string) => `${base}/projects/${encodeURIComponent(projectId)}`;
  return {
    async getProject(projectId) {
      const p = await call<{ projectId?: string; projectNumber?: string; displayName?: string; state?: string }>(project(projectId));
      return { projectId: p.projectId ?? projectId, projectNumber: String(p.projectNumber ?? ""), displayName: p.displayName, state: p.state };
    },
    createApp(projectId, platform, input) {
      const body =
        platform === "android"
          ? { packageName: input.identifier, displayName: input.displayName, apiKeyId: input.apiKeyId }
          : { bundleId: input.identifier, displayName: input.displayName, apiKeyId: input.apiKeyId, ...(input.teamId ? { teamId: input.teamId } : {}) };
      return call<Operation>(`${project(projectId)}/${collection(platform)}`, { body });
    },
    getOperation(name) {
      // `operations/…`: the name as Firebase gave it, slashes kept.
      return call<Operation>(`${base}/${name.split("/").map(encodeURIComponent).join("/")}`);
    },
    async findApp(projectId, platform, identifier) {
      let pageToken = "";
      // At most a few pages: a pool project holds about 30 apps.
      for (let page = 0; page < 10; page++) {
        const query = new URLSearchParams({ pageSize: "100", ...(pageToken ? { pageToken } : {}) });
        const list = await call<{ apps?: unknown[]; nextPageToken?: string }>(`${project(projectId)}/${collection(platform)}?${query}`);
        for (const item of list.apps ?? []) {
          const record = appRecordOf(platform, item);
          if (record && record.identifier === identifier && record.state !== "DELETED") return record;
        }
        if (!list.nextPageToken) return null;
        pageToken = list.nextPageToken;
      }
      return null;
    },
    async getConfig(projectId, platform, appId) {
      const config = await call<{ configFilename?: string; configFileContents?: string }>(`${project(projectId)}/${collection(platform)}/${appPath(appId)}/config`);
      if (!config.configFileContents) throw new Error("Firebase gave no config file.");
      return { filename: config.configFilename ?? (platform === "android" ? "google-services.json" : "GoogleService-Info.plist"), contents: Buffer.from(config.configFileContents, "base64").toString("utf8") };
    },
    async removeApp(projectId, platform, appId) {
      await call<Operation>(`${project(projectId)}/${collection(platform)}/${appPath(appId)}:remove`, { body: { allowMissing: true, immediate: true } });
    },
    addFirebase(projectId) {
      return call<Operation>(`${project(projectId)}:addFirebase`, { body: {} });
    },
  };
}
