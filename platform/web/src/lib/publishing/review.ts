import { createPrivateKey, sign } from "node:crypto";
import { decrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { App, PublishingRequest, PublishingStatus, PublishingTrack, RejectionReason } from "../data/types";
import { keyContext } from "../builds/signing";
import { noteMilestones } from "../milestones/record";
import { notifyPublishingStatus } from "./service";

/**
 * 88.3 What the stores say about a version under review. The App Store's
 * state is read from App Store Connect with the client's key (the API every
 * build already uses); Google Play has no review status in its API, so its
 * status stays the team's. A rejection, whoever reports it, carries one of the
 * common reasons, each with what it means, what to do and where (the
 * Publishing page's `reject` texts, in en/ar/tr).
 */

/** Where to fix each reason; null: nothing in the dashboard (the team's note says). */
export const REJECTION_LINK: Record<RejectionReason, string | null> = {
  sign_in: "/dashboard/app-sign-in",
  incomplete: "/dashboard/preview",
  metadata: "/dashboard/setup?step=listing",
  purchases: "/dashboard/pages",
  account_deletion: "/dashboard/publishing#h-ready",
  privacy: "/dashboard/setup?step=listing",
  minimum: "/dashboard/pages",
  content_rating: "/dashboard/publishing#h-listing",
  binary: "/dashboard/builds",
  other: null,
};

/** The store guideline each reason usually comes from, for the team's choice. */
export const REJECTION_GUIDELINE: Record<RejectionReason, string> = {
  sign_in: "App Store 2.1 · Google Play App access",
  incomplete: "App Store 2.1 · Google Play Broken functionality",
  metadata: "App Store 2.3 · Google Play Metadata",
  purchases: "App Store 3.1.1 · Google Play Payments",
  account_deletion: "App Store 5.1.1(v) · Google Play Account deletion",
  privacy: "App Store 5.1.1 · Google Play Data safety",
  minimum: "App Store 4.2 · Google Play Minimum functionality",
  content_rating: "Google Play Content rating",
  binary: "App Store: invalid binary",
  other: "Another reason",
};

/**
 * App Store Connect's version states (`appVersionState`, and the older
 * `appStoreState`) as the Publishing statuses; null leaves the status as the
 * team set it (a version being prepared, or one the client withdrew).
 */
const APPLE_STATES: Record<string, { status: PublishingStatus; rejection?: RejectionReason } | null> = {
  WAITING_FOR_REVIEW: { status: "submitted" },
  READY_FOR_REVIEW: { status: "submitted" },
  WAITING_FOR_EXPORT_COMPLIANCE: { status: "submitted" },
  IN_REVIEW: { status: "in_review" },
  // Approved, waiting to be released: still "in review" for the client until it's on the store.
  ACCEPTED: { status: "in_review" },
  PENDING_APPLE_RELEASE: { status: "in_review" },
  PENDING_DEVELOPER_RELEASE: { status: "in_review" },
  PROCESSING_FOR_APP_STORE: { status: "in_review" },
  PROCESSING_FOR_DISTRIBUTION: { status: "in_review" },
  READY_FOR_SALE: { status: "live" },
  READY_FOR_DISTRIBUTION: { status: "live" },
  REJECTED: { status: "rejected" },
  METADATA_REJECTED: { status: "rejected", rejection: "metadata" },
  INVALID_BINARY: { status: "rejected", rejection: "binary" },
  PREPARE_FOR_SUBMISSION: null,
  DEVELOPER_REJECTED: null,
  REPLACED_WITH_NEW_VERSION: null,
};

export function fromAppleState(state: string): { status: PublishingStatus; rejection?: RejectionReason } | null {
  return APPLE_STATES[state] ?? null;
}

/** The statuses a store is asked about: sent, under review, or turned down (a version sent again shows). */
const WATCHED: readonly PublishingStatus[] = ["submitted", "in_review", "rejected"];
/** How often one app's version is read. */
export const REVIEW_CHECK_MINUTES = 30;

export interface AppleCredentials {
  keyId: string;
  issuerId: string;
  /** The .p8 key (PEM). */
  privateKey: string;
}

/** App Store Connect's token: ES256, 20 minutes at most (Apple's limit). */
export function appleToken(credentials: AppleCredentials, now: Date): string {
  const base64url = (value: Buffer | string) => Buffer.from(value).toString("base64url");
  const header = base64url(JSON.stringify({ alg: "ES256", kid: credentials.keyId, typ: "JWT" }));
  const issued = Math.floor(now.getTime() / 1000);
  const payload = base64url(JSON.stringify({ iss: credentials.issuerId, iat: issued, exp: issued + 15 * 60, aud: "appstoreconnect-v1" }));
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), { key: createPrivateKey(credentials.privateKey), dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${base64url(signature)}`;
}

export type AppleReading = { ok: true; state: string; version: string } | { ok: false; reason: "no_app" | "no_version" | "refused" | "unreachable" };

const ASC = "https://api.appstoreconnect.apple.com/v1";

/** The newest App Store version of the app with this bundle ID, and its state. */
export async function readAppleState(fetcher: typeof fetch, credentials: AppleCredentials, bundleId: string, now: Date): Promise<AppleReading> {
  const headers = { authorization: `Bearer ${appleToken(credentials, now)}`, accept: "application/json" };
  const get = async (url: string) => {
    try {
      const response = await fetcher(url, { headers, signal: AbortSignal.timeout(15_000) });
      if (!response.ok) return { refused: response.status === 401 || response.status === 403, body: null };
      return { refused: false, body: (await response.json()) as { data?: { id: string; attributes?: Record<string, unknown> }[] } };
    } catch {
      return { refused: false, body: null };
    }
  };
  const apps = await get(`${ASC}/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`);
  if (!apps.body) return { ok: false, reason: apps.refused ? "refused" : "unreachable" };
  const id = apps.body.data?.[0]?.id;
  if (!id) return { ok: false, reason: "no_app" };
  const versions = await get(`${ASC}/apps/${encodeURIComponent(id)}/appStoreVersions?filter[platform]=IOS&limit=10`);
  if (!versions.body) return { ok: false, reason: versions.refused ? "refused" : "unreachable" };
  const newest = [...(versions.body.data ?? [])].sort((a, b) => String(b.attributes?.createdDate ?? "").localeCompare(String(a.attributes?.createdDate ?? "")))[0];
  const state = String(newest?.attributes?.appVersionState ?? newest?.attributes?.appStoreState ?? "");
  if (!newest || !state) return { ok: false, reason: "no_version" };
  return { ok: true, state, version: String(newest.attributes?.versionString ?? "") };
}

function credentialsOf(app: App, key: Buffer): AppleCredentials | null {
  if (!app.ascKeyId || !app.ascIssuerId || !app.ascPrivateKeyEncrypted) return null;
  try {
    return { keyId: app.ascKeyId, issuerId: app.ascIssuerId, privateKey: decrypt(app.ascPrivateKeyEncrypted, key, keyContext.appStore(app.id)) };
  } catch {
    return null;
  }
}

/** The App Store track after a reading: the new status (with its reason) when the store's state says one. */
export function nextAppleTrack(track: PublishingTrack, reading: { state: string }, now: Date): PublishingTrack {
  const read = { storeState: reading.state, checkedAt: now };
  const mapped = fromAppleState(reading.state);
  if (!mapped || mapped.status === track.status) {
    // The same status: a reason Apple's state gives fills in one the team hasn't chosen.
    const rejection = mapped?.status === "rejected" && !track.rejection && mapped.rejection ? mapped.rejection : (track.rejection ?? null);
    return { ...track, ...read, rejection };
  }
  return {
    ...track,
    ...read,
    status: mapped.status,
    rejection: mapped.status === "rejected" ? (mapped.rejection ?? "other") : null,
    updatedAt: now,
  };
}

export interface ReviewSyncReport {
  checked: number;
  changed: number;
  failed: number;
}

/**
 * Reads the App Store state of every app our team publishes whose iPhone
 * version was sent, is in review or was turned down, at most every
 * REVIEW_CHECK_MINUTES. A new status is recorded in the history (by "App
 * Store Connect") and emailed to the client, as when the team sets it.
 */
export async function syncReviewStatuses(deps: { store: DataStore; key: Buffer; now: Date; fetcher?: typeof fetch }): Promise<ReviewSyncReport> {
  const report: ReviewSyncReport = { checked: 0, changed: 0, failed: 0 };
  const fetcher = deps.fetcher ?? fetch;
  for (const request of await deps.store.listManagedPublishingRequests()) {
    const track = request.ios;
    if (!WATCHED.includes(track.status)) continue;
    if (track.checkedAt && deps.now.getTime() - track.checkedAt.getTime() < REVIEW_CHECK_MINUTES * 60_000) continue;
    const app = await deps.store.getAppById(request.appId);
    const credentials = app?.iosBundleId ? credentialsOf(app, deps.key) : null;
    if (!app?.iosBundleId || !credentials) continue;
    report.checked++;
    const reading = await readAppleState(fetcher, credentials, app.iosBundleId, deps.now);
    if (!reading.ok) {
      report.failed++;
      await deps.store.savePublishingRequest({ ...request, ios: { ...track, checkedAt: deps.now } });
      continue;
    }
    const next = nextAppleTrack(track, reading, deps.now);
    const saved: PublishingRequest = { ...request, ios: next, updatedAt: next.status !== track.status ? deps.now : request.updatedAt };
    await deps.store.savePublishingRequest(saved);
    if (next.status !== track.status) {
      report.changed++;
      await deps.store.addPublishingEvent({ appId: request.appId, store: "ios", status: next.status, note: null, actorEmail: "App Store Connect", at: deps.now });
      await noteMilestones(deps.store, request.clientId, deps.now);
      await notifyPublishingStatus(deps.store, saved, "ios");
    }
  }
  return report;
}
