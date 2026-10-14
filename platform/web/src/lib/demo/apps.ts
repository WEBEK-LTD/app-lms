import type { DataStore } from "../data/store";
import type { App, AppType, Build, Client } from "../data/types";
import { platformSetting } from "../settings/platform";
import { DEMO_TYPES } from "./constants";

/**
 * Finding the demo apps (roadmap 16). They belong to the account the admin's
 * Demo apps page made (platform setting `demo`), and are marked `demo`; an
 * app of any other account is never a demo app, whatever it says.
 */

/** The demo account, or null before the team created the demo apps. */
export async function demoClient(store: DataStore, options: { fresh?: boolean } = {}): Promise<Client | null> {
  const setting = await platformSetting(store, "demo", options);
  return setting ? store.getClientById(setting.value.clientId) : null;
}

/** The demo apps, one per app type at most, in the order of DEMO_TYPES. */
export async function listDemoApps(store: DataStore, options: { fresh?: boolean } = {}): Promise<App[]> {
  const client = await demoClient(store, options);
  if (!client) return [];
  const apps = (await store.listAppsByClient(client.id)).filter((app) => app.demo === true);
  return DEMO_TYPES.map((type) => apps.find((app) => app.appType === type)).filter((app): app is App => app !== undefined);
}

export async function demoAppOfType(store: DataStore, type: AppType): Promise<App | null> {
  return (await listDemoApps(store)).find((app) => app.appType === type) ?? null;
}

/**
 * Whether the app really is a demo app: marked, and of the demo account. Read
 * from the database (not the 30-second settings cache), and only for apps
 * marked demo, so a new demo app works at once and other apps cost nothing.
 */
export async function isDemoApp(store: DataStore, app: Pick<App, "demo" | "clientId">): Promise<boolean> {
  return app.demo === true && (await demoClientId(store, { fresh: true })) === app.clientId;
}

/** The app as the hosted API and the payment page treat it: `demo` only when it really is one. */
export async function withDemoChecked<T extends Pick<App, "demo" | "clientId">>(store: DataStore, app: T): Promise<T> {
  if (!app.demo || (await isDemoApp(store, app))) return app;
  return { ...app, demo: false };
}

/** The demo account's ID, for leaving it out of the admin's numbers. */
export async function demoClientId(store: DataStore, options: { fresh?: boolean } = {}): Promise<string | null> {
  return (await platformSetting(store, "demo", options))?.value.clientId ?? null;
}

/** Whether a build can be the public download: ready, with an APK, of this demo app. */
export function isDownloadableBuild(app: Pick<App, "id">, build: Pick<Build, "appId" | "status" | "artifacts"> | null): boolean {
  return Boolean(build && build.appId === app.id && build.status === "ready" && build.artifacts.some((a) => a.kind === "apk"));
}

/** The build /demo offers for an app, when it still can be downloaded. */
export async function demoDownloadBuild(store: DataStore, app: App): Promise<Build | null> {
  if (!app.demo || !app.demoBuildId) return null;
  const build = await store.getBuild(app.demoBuildId);
  return build && isDownloadableBuild(app, build) ? build : null;
}
