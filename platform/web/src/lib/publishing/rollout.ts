import { createPrivateKey, sign } from "node:crypto";
import { decrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { App, Build, BuildStages, RolloutState } from "../data/types";
import { keyContext } from "../builds/signing";
import { appleToken, type AppleCredentials } from "./review";

/**
 * 89.2 Staged releases. With "We publish for you", a build can go to a share
 * of Google Play's production users first (the pipeline uploads it with
 * that share) and to Apple's phased release (seven days). The owner then
 * stops, continues or completes it here, through the stores' own APIs with
 * the keys the app already has: Google Play's Android Publisher API (the
 * service account) and App Store Connect (the .p8 key).
 */

/** The shares a Google Play release moves through, in order. */
export const ROLLOUT_STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1] as const;
/** The first shares the owner may choose (percent). */
export const FIRST_SHARES = [1, 5, 10, 20, 50] as const;

/** The next share after this one (1 stays 1). */
export function nextFraction(fraction: number): number {
  return ROLLOUT_STEPS.find((step) => step > fraction + 1e-9) ?? 1;
}

/** The release in progress after a build's report: set once its store upload is done. */
export function rolloutAfterReport(current: RolloutState | null | undefined, build: Pick<Build, "release" | "versionName" | "versionCode">, stages: BuildStages, now: Date): RolloutState | null {
  const release = build.release;
  if (!release) return null;
  let next: RolloutState = { ...current };
  let changed = false;
  if (release.androidRollout !== null && stages.upload_play === "done" && current?.android?.versionCode !== build.versionCode) {
    const fraction = release.androidRollout;
    next = { ...next, android: { versionName: build.versionName, versionCode: build.versionCode, fraction, status: fraction >= 1 ? "completed" : "inProgress", at: now.toISOString() } };
    changed = true;
  }
  if (release.iosPhased && stages.upload_testflight === "done" && current?.ios?.versionName !== build.versionName) {
    next = { ...next, ios: { versionName: build.versionName, state: "waiting", at: now.toISOString() } };
    changed = true;
  }
  return changed ? next : null;
}

// Google Play ---------------------------------------------------------------

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/** An access token for the Android Publisher API, from the service account (a signed JWT, RS256). */
export async function googleAccessToken(fetcher: typeof fetch, serviceAccountJson: string, now: Date): Promise<string> {
  const account = JSON.parse(serviceAccountJson) as ServiceAccount;
  const tokenUri = account.token_uri ?? "https://oauth2.googleapis.com/token";
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const issued = Math.floor(now.getTime() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: tokenUri,
    iat: issued,
    exp: issued + 3600,
  })}`;
  const signature = sign("sha256", Buffer.from(unsigned), createPrivateKey(account.private_key)).toString("base64url");
  const response = await fetcher(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string };
  if (!response.ok || !body.access_token) throw new RolloutError("google_key");
  return body.access_token;
}

/** Sets the production release of this version code: its share and status, in one edit. */
export async function setPlayRelease(
  fetcher: typeof fetch,
  token: string,
  packageName: string,
  release: { versionCode: number; fraction: number; status: "inProgress" | "halted" | "completed" },
): Promise<void> {
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits`;
  const call = async (url: string, init: RequestInit = {}) => {
    const response = await fetcher(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new RolloutError(response.status === 401 || response.status === 403 ? "google_refused" : "google_failed");
    return (await response.json().catch(() => ({}))) as { id?: string };
  };
  const edit = await call(base, { method: "POST", body: "{}" });
  if (!edit.id) throw new RolloutError("google_failed");
  const releaseBody = {
    versionCodes: [String(release.versionCode)],
    status: release.status,
    ...(release.status === "completed" ? {} : { userFraction: release.fraction }),
  };
  await call(`${base}/${edit.id}/tracks/production`, { method: "PUT", body: JSON.stringify({ track: "production", releases: [releaseBody] }) });
  await call(`${base}/${edit.id}:commit`, { method: "POST", body: "{}" });
}

// App Store -----------------------------------------------------------------

const ASC = "https://api.appstoreconnect.apple.com/v1";

/** Pauses, resumes or completes the phased release of the app's newest App Store version. */
export async function setApplePhase(fetcher: typeof fetch, credentials: AppleCredentials, bundleId: string, state: "ACTIVE" | "PAUSED" | "COMPLETE", now: Date): Promise<void> {
  const headers = { authorization: `Bearer ${appleToken(credentials, now)}`, "content-type": "application/json" };
  const get = async (url: string) => {
    const response = await fetcher(url, { headers, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new RolloutError(response.status === 401 || response.status === 403 ? "apple_refused" : "apple_failed");
    return (await response.json()) as { data?: { id: string; attributes?: Record<string, unknown> }[] | { id: string } | null };
  };
  const apps = await get(`${ASC}/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`);
  const appId = Array.isArray(apps.data) ? apps.data[0]?.id : undefined;
  if (!appId) throw new RolloutError("apple_no_app");
  const versions = await get(`${ASC}/apps/${encodeURIComponent(appId)}/appStoreVersions?filter[platform]=IOS&limit=10`);
  const list = Array.isArray(versions.data) ? versions.data : [];
  const newest = [...list].sort((a, b) => String(b.attributes?.createdDate ?? "").localeCompare(String(a.attributes?.createdDate ?? "")))[0];
  if (!newest) throw new RolloutError("apple_no_phase");
  const phased = await get(`${ASC}/appStoreVersions/${encodeURIComponent(newest.id)}/appStoreVersionPhasedRelease`);
  const phaseId = phased.data && !Array.isArray(phased.data) ? phased.data.id : undefined;
  if (!phaseId) throw new RolloutError("apple_no_phase");
  const response = await fetcher(`${ASC}/appStoreVersionPhasedReleases/${encodeURIComponent(phaseId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data: { type: "appStoreVersionPhasedReleases", id: phaseId, attributes: { phasedReleaseState: state } } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new RolloutError(response.status === 409 ? "apple_not_live" : "apple_failed");
}

// The owner's actions ---------------------------------------------------------

export type RolloutAction = "continue" | "stop" | "resume" | "complete";

/** Why a change didn't go through, as the dashboard words it (builds area known texts). */
export const ROLLOUT_ERROR_TEXT = {
  google_key: "Google Play didn't accept your service account. Add its key again on the Publishing step.",
  google_refused: "Google Play refused the change: the service account needs the right to release to production.",
  google_failed: "Google Play couldn't change the release just now. Try again in a few minutes.",
  apple_refused: "App Store Connect refused the change: check your App Store Connect key on the Publishing step.",
  apple_no_app: "App Store Connect has no app with your bundle ID.",
  apple_no_phase: "This version has no phased release in App Store Connect.",
  apple_not_live: "The phased release starts once Apple has approved the version and it's released.",
  apple_failed: "App Store Connect couldn't change the release just now. Try again in a few minutes.",
  no_key: "Add your store key on the Publishing step first.",
  nothing: "There's no release in progress to change.",
} as const;

export class RolloutError extends Error {
  constructor(readonly code: keyof typeof ROLLOUT_ERROR_TEXT) {
    super(ROLLOUT_ERROR_TEXT[code]);
  }
}

export interface RolloutDeps {
  store: Pick<DataStore, "updateApp">;
  key: Buffer;
  fetcher?: typeof fetch;
  now: Date;
}

/** Applies the owner's action on one store and keeps the new state on the app. */
export async function changeRollout(deps: RolloutDeps, app: App, which: "android" | "ios", action: RolloutAction): Promise<RolloutState> {
  const fetcher = deps.fetcher ?? fetch;
  const current = app.rollout ?? {};
  const at = deps.now.toISOString();
  if (which === "android") {
    const android = current.android;
    if (!android || android.status === "completed") throw new RolloutError("nothing");
    if (!app.googlePlayKeyEncrypted || !app.androidPackage) throw new RolloutError("no_key");
    const fraction = action === "continue" ? nextFraction(android.fraction) : action === "complete" ? 1 : android.fraction;
    const status = action === "stop" ? "halted" : fraction >= 1 ? "completed" : "inProgress";
    const token = await googleAccessToken(fetcher, decrypt(app.googlePlayKeyEncrypted, deps.key, keyContext.googlePlay(app.id)), deps.now);
    await setPlayRelease(fetcher, token, app.androidPackage, { versionCode: android.versionCode, fraction, status });
    const next: RolloutState = { ...current, android: { ...android, fraction, status, at } };
    await deps.store.updateApp(app.id, { rollout: next }, deps.now);
    return next;
  }
  const ios = current.ios;
  if (!ios || ios.state === "COMPLETE") throw new RolloutError("nothing");
  if (!app.ascPrivateKeyEncrypted || !app.ascKeyId || !app.ascIssuerId || !app.iosBundleId) throw new RolloutError("no_key");
  const state = action === "stop" ? "PAUSED" : action === "complete" ? "COMPLETE" : "ACTIVE";
  const credentials = { keyId: app.ascKeyId, issuerId: app.ascIssuerId, privateKey: decrypt(app.ascPrivateKeyEncrypted, deps.key, keyContext.appStore(app.id)) };
  await setApplePhase(fetcher, credentials, app.iosBundleId, state, deps.now);
  const next: RolloutState = { ...current, ios: { ...ios, state, at } };
  await deps.store.updateApp(app.id, { rollout: next }, deps.now);
  return next;
}
