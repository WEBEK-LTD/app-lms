import { buildConfigFor, initialStages, isSetupComplete, queueBuild, storeListingOf } from "../app/setup";
import type { DataStore } from "../data/store";
import type { App, Build } from "../data/types";
import { currentPlanId } from "../billing/plan-change";
import { effectivePlans } from "../entitlements";
import { appIsActive } from "../license/status";
import { hasFeature } from "../plans";
import { bumpPatch } from "../semver";
import type { PreflightDeps } from "./preflight";
import { isInProgress } from "./view";

/**
 * 87.4 Automatic builds (plans with `auto_rebuild`) only for what a new build
 * changes: what goes into the app itself (its build config: name, package,
 * icon and colours, Firebase, links…), the store listing when Yallapp
 * publishes for the client, and stores newly connected. Pages, texts and
 * settings reach the app without one. A save asks for the build in
 * AUTO_BUILD_WAIT_MINUTES; another save before then moves it later, so
 * several saves go in one build. The frequent job starts the builds due.
 */

export const AUTO_BUILD_WAIT_MINUTES = 10;

export type BuildChange = "app" | "listing" | "stores";

/** What a build made now would change from the last one; empty: nothing a build would bring. */
export function buildChanges(app: App, client: { id: string }, last: Build, assetUrl: (id: string) => string): BuildChange[] {
  const out: BuildChange[] = [];
  const now = buildConfigFor(app, client, { name: last.versionName, code: last.versionCode }, assetUrl);
  if (JSON.stringify(withoutVersion(now)) !== JSON.stringify(withoutVersion(last.config))) out.push("app");
  if (last.autoPublish && JSON.stringify(storeListingOf(app, assetUrl)) !== JSON.stringify(last.storeListing)) out.push("listing");
  // A store connected since (or iOS newly possible): the new build goes there too.
  const stages = initialStages(last.autoPublish, app, last.stages.ios !== "skipped" || Boolean(app.ascPrivateKeyEncrypted));
  if ((Object.keys(stages) as (keyof typeof stages)[]).some((k) => stages[k] === "pending" && last.stages[k] === "skipped")) out.push("stores");
  return out;
}

function withoutVersion(config: Build["config"]): Record<string, unknown> {
  const { version_name: _name, version_code: _code, ...rest } = config as unknown as Record<string, unknown>;
  void _name;
  void _code;
  return rest;
}

/** After a save: the app's automatic build in a few minutes (later again if one was coming). */
export async function scheduleAutoBuild(store: Pick<DataStore, "updateApp">, app: Pick<App, "id">, now: Date): Promise<Date> {
  const due = new Date(now.getTime() + AUTO_BUILD_WAIT_MINUTES * 60_000);
  await store.updateApp(app.id, { autoBuildDueAt: due }, now);
  return due;
}

export interface AutoBuildDeps {
  store: DataStore;
  now: Date;
  assetUrl: (id: string) => string;
  preflight?: PreflightDeps;
  /** Starts the pipeline once when something was queued. */
  start: () => Promise<unknown>;
}

/** The frequent job: queues the automatic builds that are due and still bring something. */
export async function runAutoBuilds(deps: AutoBuildDeps): Promise<{ queued: number; nothing: number; later: number }> {
  const { store, now } = deps;
  let queued = 0;
  let nothing = 0;
  let later = 0;
  const plans = await effectivePlans(store);
  for (const app of await store.listApps()) {
    if (!app.autoBuildDueAt || app.autoBuildDueAt > now || app.deletedAt) continue;
    const client = await store.getClientById(app.clientId);
    const license = client ? await store.getLicenseForApp(client.id, app.id) : null;
    const plan = license ? currentPlanId(license, now) : null;
    const last = (await store.listBuildsByApp(app.id, 1))[0];
    if (!client || !license || !plan || !appIsActive(license, client, now) || !hasFeature(plans[plan], "auto_rebuild") || !last || !isSetupComplete(app, plan, plans)) {
      await store.updateApp(app.id, { autoBuildDueAt: null }, now);
      continue;
    }
    // A build is running: this one waits for it.
    if (isInProgress(last, now)) {
      await store.updateApp(app.id, { autoBuildDueAt: new Date(now.getTime() + AUTO_BUILD_WAIT_MINUTES * 60_000) }, now);
      later += 1;
      continue;
    }
    await store.updateApp(app.id, { autoBuildDueAt: null }, now);
    if (buildChanges(app, client, last, deps.assetUrl).length === 0) {
      nothing += 1;
      continue;
    }
    const result = await queueBuild(store, { client, app, license, versionName: bumpPatch(last.versionName) }, now, deps.assetUrl, deps.preflight);
    if (result.ok) queued += 1;
  }
  if (queued > 0) await deps.start();
  return { queued, nothing, later };
}
