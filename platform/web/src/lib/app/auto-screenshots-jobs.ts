import { randomBytes } from "node:crypto";
import type { DataStore } from "../data/store";
import type { App, AssetKind, AutoScreenshots, AutoShot, ShotDevice } from "../data/types";
import { appIsActive } from "../license/status";
import { createPreviewToken, previewAppPath, previewKey } from "../preview/token";
import { checkScreenshot } from "../store-files";
import {
  AUTO_SHOTS_WAIT_MINUTES,
  appIdOfJob,
  DEVICE_SIZES,
  freshAutoScreenshots,
  newJobId,
  parseShotKey,
  plannedShots,
  SHOT_LANGUAGES_MAX,
  shotKey,
  shotsFingerprint,
  type DeviceSize,
  type PlannedShot,
} from "./auto-screenshots";
import { listingLanguages } from "./listing-languages";
import { websiteReady } from "./setup";
import { previewContentSource } from "../preview/config";
import { wordpressPluginConnected } from "../preview/service";

/**
 * 139 The automatic store screenshots' runs: asked for after a change (in
 * AUTO_SHOTS_WAIT_MINUTES, later again with each change, like automatic
 * builds), by Make again, or once a month for the content that changed; the
 * frequent job queues the runs due and starts the screenshots workflow
 * (.github/workflows/store-screenshots.yml), which claims each run, takes the
 * shots and sends them back (docs/api/pipeline.yaml › Screenshots).
 */

export { AUTO_SHOTS_WAIT_MINUTES, scheduleAutoScreenshots } from "./auto-screenshots";
/** The same set is made again after this long, for the content shown on it (products, courses…). */
export const AUTO_SHOTS_REFRESH_DAYS = 30;
/** A run the pipeline hasn't finished in this long stopped without saying: it fails, and can be asked for again. */
export const AUTO_SHOTS_STALL_MINUTES = 120;
/** How long the run's preview link works. */
export const AUTO_SHOTS_PREVIEW_SECONDS = 3 * 60 * 60;

export const STALLED_SHOTS = "The screenshots stopped before they were finished. Make them again.";

const SHOT_ASSET: Record<ShotDevice, AssetKind> = { phone: "play_screenshot", iphone: "ios_screenshot", tablet: "tablet_screenshot", ipad: "ipad_screenshot" };

/** The upload kind of each device's screenshots. */
export const shotAssetKind = (device: ShotDevice): AssetKind => SHOT_ASSET[device];

const iso = (date: Date) => date.toISOString();
const minutes = (n: number) => n * 60_000;

function current(app: Pick<App, "autoScreenshots">): AutoScreenshots {
  return { ...freshAutoScreenshots(false), ...(app.autoScreenshots ?? {}) };
}

const busy = (auto: AutoScreenshots) => auto.state === "queued" || auto.state === "running";

/** The listing's languages the set is made in: its own, then those with a translation (in the app's languages). */
export async function shotLanguagesFor(store: Pick<DataStore, "getAppLayout">, app: Pick<App, "id" | "listingLanguage" | "listingTranslations">): Promise<string[]> {
  const { main, others } = await listingLanguages(store, app);
  const translated = new Set((app.listingTranslations ?? []).map((t) => t.language));
  return [main, ...others.filter((code) => translated.has(code))].slice(0, SHOT_LANGUAGES_MAX);
}

/** Whether the app has what its screens show: content to show (the Website step) and its name and look (Branding). */
export function readyForShots(app: App): boolean {
  return websiteReady(app) && Boolean(app.brandingDoneAt && app.appName);
}

/**
 * Ready, and the preview shows the app's content (never its "connect your
 * site" message): content kept in Yallapp, the app's own API, or a WordPress
 * site whose Yallapp plugin is connected.
 */
export async function shotsReady(store: DataStore, app: App): Promise<boolean> {
  if (!readyForShots(app)) return false;
  return previewContentSource(app, await wordpressPluginConnected(store, app)) !== "none";
}

async function fingerprintOf(store: Pick<DataStore, "getAppLayout">, app: App): Promise<string> {
  const layout = await store.getAppLayout(app.id);
  return shotsFingerprint({ app, languages: await shotLanguagesFor(store, app), layout: layout?.published ?? layout?.draft ?? null });
}

/** "Make them for me" switched on or off with the listing. On: a run soon (at once when nothing was made). */
export function switchedAutoScreenshots(app: Pick<App, "autoScreenshots">, on: boolean, now: Date): AutoScreenshots {
  const auto = current(app);
  if (!on) return { ...auto, on: false, dueAt: null };
  const wait = auto.on && auto.shots.length > 0 ? minutes(AUTO_SHOTS_WAIT_MINUTES) : 0;
  return { ...auto, on: true, dueAt: iso(new Date(now.getTime() + wait)) };
}

export type MakeAgainResult = { ok: true; queued: AutoScreenshots } | { ok: false; reason: "off" | "running" | "not_ready" | "inactive" };

/** Make again: the whole set now, the removed places back; the owner's uploads stay. */
export async function makeAgain(store: DataStore, app: App, now: Date): Promise<MakeAgainResult> {
  const auto = current(app);
  if (!auto.on) return { ok: false, reason: "off" };
  if (busy(auto) && !stalled(auto, now)) return { ok: false, reason: "running" };
  if (!(await shotsReady(store, app))) return { ok: false, reason: "not_ready" };
  // Made only while the app's plan is active, as builds are.
  if (!(await activeApp(store, app, now))) return { ok: false, reason: "inactive" };
  const queued: AutoScreenshots = { ...auto, removed: [], ...queuedNow(app.id, now) };
  await store.updateApp(app.id, { autoScreenshots: queued }, now);
  return { ok: true, queued };
}

function queuedNow(appId: string, now: Date): Pick<AutoScreenshots, "state" | "jobId" | "queuedAt" | "startedAt" | "dueAt" | "message"> {
  return { state: "queued", jobId: newJobId(appId, randomBytes(9).toString("hex")), queuedAt: iso(now), startedAt: null, dueAt: null, message: null };
}

function stalled(auto: AutoScreenshots, now: Date): boolean {
  const since = auto.state === "running" ? auto.startedAt : auto.state === "queued" ? auto.queuedAt : null;
  return Boolean(since && now.getTime() - Date.parse(since) > minutes(AUTO_SHOTS_STALL_MINUTES));
}

export interface AutoShotsDeps {
  store: DataStore;
  now: Date;
  /** Starts the screenshots workflow once when a run was queued. */
  start: () => Promise<unknown>;
}

/**
 * The frequent job: runs that stopped are closed; the runs due are queued
 * when what shows on the set changed (or nothing was made yet, or the set is
 * a month old), and the workflow started.
 */
export async function runAutoScreenshots(deps: AutoShotsDeps): Promise<{ queued: number; same: number; stalled: number }> {
  const { store, now } = deps;
  let queued = 0;
  let same = 0;
  let closed = 0;
  for (const app of await store.listApps()) {
    const auto = app.autoScreenshots;
    if (!auto?.on || app.deletedAt) continue;
    if (busy(auto)) {
      if (!stalled(auto, now)) continue;
      await store.updateApp(app.id, { autoScreenshots: { ...current(app), state: "failed", jobId: null, message: STALLED_SHOTS } }, now);
      closed += 1;
      continue;
    }
    const due = auto.dueAt !== null && Date.parse(auto.dueAt) <= now.getTime();
    const firstSet = auto.shots.every((s) => s.source === "uploaded") && auto.state === "idle" && !auto.madeAt;
    const old = auto.madeAt !== null && now.getTime() - Date.parse(auto.madeAt) > AUTO_SHOTS_REFRESH_DAYS * 86_400_000;
    if (!due && !firstSet && !old) continue;
    if (!(await shotsReady(store, app)) || !(await activeApp(store, app, now))) {
      if (auto.dueAt) await store.updateApp(app.id, { autoScreenshots: { ...current(app), dueAt: null } }, now);
      continue;
    }
    const fingerprint = await fingerprintOf(store, app);
    if (due && !old && auto.madeAt && auto.fingerprint === fingerprint) {
      await store.updateApp(app.id, { autoScreenshots: { ...current(app), dueAt: null } }, now);
      same += 1;
      continue;
    }
    await store.updateApp(app.id, { autoScreenshots: { ...current(app), ...queuedNow(app.id, now) } }, now);
    queued += 1;
  }
  if (queued > 0) await deps.start();
  return { queued, same, stalled: closed };
}

/** Whether the app's plan is active (its account too). */
export async function activeApp(store: DataStore, app: App, now: Date): Promise<boolean> {
  const client = await store.getClientById(app.clientId);
  const license = client ? await store.getLicenseForApp(client.id, app.id) : null;
  return Boolean(client && license && appIsActive(license, client, now));
}

/** GET /screenshots/queue: the runs waiting, oldest first. */
export async function queuedRuns(store: Pick<DataStore, "listApps">, limit: number): Promise<{ id: string; app_id: string }[]> {
  const apps = (await store.listApps()).filter((app) => app.autoScreenshots?.on && app.autoScreenshots.state === "queued" && app.autoScreenshots.jobId && !app.deletedAt);
  apps.sort((a, b) => (a.autoScreenshots!.queuedAt ?? "").localeCompare(b.autoScreenshots!.queuedAt ?? ""));
  return apps.slice(0, limit).map((app) => ({ id: app.autoScreenshots!.jobId!, app_id: app.id }));
}

/** The app whose run this is, with its run; null when it isn't (any more) the app's run. */
export async function runApp(store: Pick<DataStore, "getAppById">, jobId: string): Promise<{ app: App; auto: AutoScreenshots } | null> {
  const appId = appIdOfJob(jobId);
  const app = appId ? await store.getAppById(appId) : null;
  if (!app || app.deletedAt || !app.autoScreenshots?.on || app.autoScreenshots.jobId !== jobId) return null;
  return { app, auto: current(app) };
}

export interface RunPlan {
  id: string;
  app_id: string;
  /** The app preview with a signed, read-only link for this app; each shot adds `lang`, `os` and its route. */
  preview_url: string;
  /** Browser storage the preview reads before it starts: guest mode, so its screens open without signing in. */
  storage: Record<string, string>;
  devices: Record<ShotDevice, { width: number; height: number; viewport_width: number; viewport_height: number; scale: number; os: DeviceSize["os"] }>;
  shots: PlannedShot[];
}

export type ClaimResult = { ok: true; plan: RunPlan } | { ok: false; reason: "not_found" | "not_ready" };

/** POST /screenshots/{id}/claim: the run starts; what to take and where. */
export async function claimRun(store: DataStore, jobId: string, now: Date, platform: { url: string; signingSecret: string }): Promise<ClaimResult> {
  const found = await runApp(store, jobId);
  if (!found || !busy(found.auto)) return { ok: false, reason: "not_found" };
  const { app, auto } = found;
  if (!(await shotsReady(store, app))) {
    await store.updateApp(app.id, { autoScreenshots: { ...auto, state: "failed", jobId: null, message: "The app has no content or name yet." } }, now);
    return { ok: false, reason: "not_ready" };
  }
  const layout = await store.getAppLayout(app.id);
  const languages = await shotLanguagesFor(store, app);
  const fingerprint = shotsFingerprint({ app, languages, layout: layout?.published ?? layout?.draft ?? null });
  await store.updateApp(app.id, { autoScreenshots: { ...auto, state: "running", startedAt: iso(now), runFingerprint: fingerprint } }, now);
  // The pages the app shows: the published ones, else (before the first publish) the draft.
  const token = createPreviewToken({ appId: app.id, draft: !layout?.published }, previewKey(platform.signingSecret), now, AUTO_SHOTS_PREVIEW_SECONDS);
  const devices = Object.fromEntries(
    Object.values(DEVICE_SIZES).map((d) => [d.device, { width: d.width, height: d.height, viewport_width: d.viewport.width, viewport_height: d.viewport.height, scale: d.scale, os: d.os }]),
  ) as RunPlan["devices"];
  return {
    ok: true,
    plan: {
      id: jobId,
      app_id: app.id,
      preview_url: `${platform.url.replace(/\/$/, "")}${previewAppPath(token)}&theme=light`,
      storage: { [`yallapp.preview.${app.id}.settings.guest_mode`]: "true" },
      devices,
      shots: plannedShots(app, languages, auto),
    },
  };
}

export type SaveShotResult = { ok: true; assetId: string } | { ok: false; status: 404 | 409 | 422; code: string; message: string };

/** PUT /screenshots/{id}/shots/{key}: one shot made; the owner's own in that place is never replaced. */
export async function saveRunShot(
  store: DataStore,
  jobId: string,
  key: string,
  data: Buffer,
  now: Date,
  saveAsset: (clientId: string, kind: AssetKind, data: Buffer, contentType: string, extension: string) => Promise<string>,
): Promise<SaveShotResult> {
  const found = await runApp(store, jobId);
  if (!found || found.auto.state !== "running") return { ok: false, status: 404, code: "run_not_found", message: "There's no running screenshots run with this ID." };
  const place = parseShotKey(key);
  if (!place) return { ok: false, status: 422, code: "invalid_shot", message: "Not a screenshot of the set." };
  const checked = checkScreenshot(data, place.device);
  if (!checked.ok) return { ok: false, status: 422, code: "invalid_image", message: checked.error };
  const { app } = found;
  const existing = found.auto.shots.find((s) => shotKey(s) === key);
  if (existing?.source === "uploaded") return { ok: false, status: 409, code: "owner_upload", message: "The owner uploaded their own screenshot here; it is kept." };
  const assetId = await saveAsset(app.clientId, shotAssetKind(place.device), data, checked.contentType, checked.contentType === "image/png" ? "png" : "jpg");
  // Read again: the owner may have changed the set while the run went on.
  const latest = await runApp(store, jobId);
  if (!latest) return { ok: false, status: 404, code: "run_not_found", message: "There's no running screenshots run with this ID." };
  const shot: AutoShot = { ...place, assetId, source: "auto", at: iso(now) };
  const shots = latest.auto.shots.filter((s) => shotKey(s) !== key || s.source === "uploaded");
  if (!shots.some((s) => shotKey(s) === key)) shots.push(shot);
  await store.updateApp(app.id, { autoScreenshots: { ...latest.auto, shots } }, now);
  return { ok: true, assetId };
}

export type FinishResult = { ok: true; auto: AutoScreenshots } | { ok: false; reason: "not_found" };

/**
 * POST /screenshots/{id}/status: the run finished. Done: the automatic shots
 * not made again in it (a screen the app no longer has, a language left out)
 * go; the owner's uploads stay. Failed: the set stays as it was, with why.
 */
export async function finishRun(store: DataStore, jobId: string, result: { status: "done" | "failed"; message?: string | null }, now: Date): Promise<FinishResult> {
  const found = await runApp(store, jobId);
  if (!found || !busy(found.auto)) return { ok: false, reason: "not_found" };
  const { app, auto } = found;
  const { runFingerprint, ...rest } = auto;
  let next: AutoScreenshots;
  if (result.status === "done") {
    const since = auto.startedAt ? Date.parse(auto.startedAt) : 0;
    const shots = auto.shots.filter((s) => s.source === "uploaded" || Date.parse(s.at) >= since);
    next = { ...rest, state: "idle", jobId: null, madeAt: iso(now), fingerprint: runFingerprint ?? auto.fingerprint, message: (result.message ?? "").slice(0, 300) || null, shots };
  } else {
    next = { ...rest, state: "failed", jobId: null, message: (result.message ?? "").slice(0, 300) || "The screenshots couldn't be made." };
  }
  // The listing changed: an automatic build takes it (lib/builds/auto.ts checks the plan and what changed).
  const builds = result.status === "done" ? await store.listBuildsByApp(app.id, 1) : [];
  await store.updateApp(app.id, { autoScreenshots: next, ...(builds.length ? { autoBuildDueAt: new Date(now.getTime() + minutes(AUTO_SHOTS_WAIT_MINUTES)) } : {}) }, now);
  return { ok: true, auto: next };
}

/** The owner's own screenshot in a place of the set: kept when the set is made again. */
export function withUpload(auto: AutoScreenshots, key: string, assetId: string, now: Date): AutoScreenshots | null {
  const place = parseShotKey(key);
  if (!place) return null;
  const shots = auto.shots.filter((s) => shotKey(s) !== key);
  shots.push({ ...place, assetId, source: "uploaded", at: iso(now) });
  return { ...auto, shots, removed: auto.removed.filter((k) => k !== key) };
}

/** A place removed by the owner: left out of the listing and not made again on its own (Make again brings it back). */
export function withRemoved(auto: AutoScreenshots, key: string): AutoScreenshots | null {
  if (!parseShotKey(key)) return null;
  return { ...auto, shots: auto.shots.filter((s) => shotKey(s) !== key), removed: [...new Set([...auto.removed, key])] };
}
