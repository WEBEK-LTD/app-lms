import { decrypt, encrypt } from "../crypto/encryption";
import type { App } from "../data/types";
import type { AppPatch } from "../data/store";
import { courierBundleIdOf } from "../delivery/courier-app";
import { vendorBundleIdOf } from "../market/vendor-app";
import { staffBundleIdOf } from "../school/staff-app";
import { APPLE_ID_PATTERN, checkApnsKey, keyIdFromFileName, parseApnsKey, type ApnsCredentials, type ApnsKeyCheck, type ApnsTransport } from "../hosted/apns";

/**
 * 136.20 The client's APNs auth key for an app: saved once (setup's
 * Publishing step or the Notifications page), checked with Apple first,
 * kept encrypted (context `app:<id>:apns-key`), never shown again, and
 * removable. Apple has no API that makes APNs keys, so this upload is the
 * one thing the client does for iPhone notifications in Yallapp mode.
 */

export const apnsKeyContext = (appId: string) => `app:${appId}:apns-key`;

/** A .p8 is about 250 bytes; anything much larger isn't one. */
export const APNS_KEY_MAX_BYTES = 4_000;

/**
 * Whether the app's notifications are set up by Yallapp rather than by the
 * client's own Firebase project.
 *
 * MERGE POINT (Phase 1, branch wip-yallapp-firebase): Phase 1 adds
 * `apps.push_setup` ("yallapp" | null). Until it's merged no app has it, so
 * an app counts as Yallapp mode when it has no Firebase service account of
 * its own. An app with its own Firebase keeps sending iPhone pushes through
 * it, as before.
 */
export function yallappPushSetup(app: App): boolean {
  const mode = (app as App & { pushSetup?: string | null }).pushSetup;
  if (mode === "yallapp") return true;
  return !app.firebaseServiceAccountEncrypted;
}

/** Whether the app may take the APNs key: an iPhone app (a bundle ID) on the hosted API whose notifications Yallapp sets up. */
export function apnsKeyApplies(app: App): boolean {
  return app.backend === "hosted" && Boolean(app.iosBundleId) && yallappPushSetup(app);
}

/** The saved key's public facts, for the pages; null when none is saved. */
export function savedApnsKey(app: App): { keyId: string; teamId: string } | null {
  return app.apnsKeyEncrypted && app.apnsKeyId && app.apnsTeamId ? { keyId: app.apnsKeyId, teamId: app.apnsTeamId } : null;
}

/**
 * Whether the app's iPhones register their APNs token (`Config.features.apns`)
 * so their pushes go straight to Apple: Yallapp mode with a saved key.
 */
export function apnsDirectOn(app: App): boolean {
  return apnsKeyApplies(app) && savedApnsKey(app) !== null;
}

/** The second apps' bundle IDs (`apns-topic` by the device's role). */
function roleBundleIds(bundleId: string): Record<string, string> {
  return {
    courier: courierBundleIdOf(bundleId, "courier"),
    driver: courierBundleIdOf(bundleId, "driver"),
    vendor: vendorBundleIdOf(bundleId),
    staff: staffBundleIdOf(bundleId),
  };
}

/** The APNs credentials sendPush uses for the app's "apns" tokens, or null without a saved key (or when it can't be opened). */
export function apnsCredentialsOf(app: App, key: Buffer): ApnsCredentials | null {
  const saved = savedApnsKey(app);
  if (!saved || !app.iosBundleId || !app.apnsKeyEncrypted) return null;
  try {
    const privateKey = decrypt(app.apnsKeyEncrypted, key, apnsKeyContext(app.id));
    return { keyId: saved.keyId, teamId: saved.teamId, privateKey, bundleId: app.iosBundleId, roleBundleIds: roleBundleIds(app.iosBundleId) };
  } catch {
    return null;
  }
}

/** What Apple answered, for the person (English; the dashboard translates it: i18n/dashboard/apns.ts). */
export function apnsCheckMessage(check: ApnsKeyCheck, bundleId: string): string {
  if (check.ok) return `Apple accepted the key for ${bundleId}.`;
  switch (check.problem) {
    case "rejected":
      return `Apple didn't accept this key (${check.reason ?? `HTTP ${check.status}`}). Check the Key ID and Team ID, and that the key has Apple Push Notifications service (APNs) turned on.`;
    case "sandbox_only":
      return "This key only works with Apple's Sandbox server. Make a key for Production, or for Sandbox & Production.";
    case "topic":
      return `Apple says this key can't send to ${bundleId} (${check.reason ?? `HTTP ${check.status}`}). Use a key of the team that owns the app.`;
    case "unreachable":
      return "We couldn't reach Apple to check the key. Try again in a few minutes.";
    default:
      return `Apple answered ${check.reason ?? `HTTP ${check.status}`}, so the key wasn't saved.`;
  }
}

export interface ApnsKeyInput {
  /** The .p8 file, when one was chosen. */
  file: { name: string; text: string; size: number } | null;
  keyId: string;
  teamId: string;
}

export type ApnsKeyResult =
  | { ok: true; patch: AppPatch; keyId: string; teamId: string; message: string }
  | { ok: false; errors: Record<string, string>; values: Record<string, string> }
  /** Nothing was filled in. */
  | { ok: true; patch: null };

/**
 * Reads the APNs key fields, checks the key with Apple and returns the patch
 * to save. The Key ID comes from the file name (`AuthKey_<KEYID>.p8`) when
 * the field is empty; the Team ID from the field, else the one saved, else
 * the iOS build's (`apps.apple_team_id`).
 */
export async function readApnsKey(
  app: App,
  input: ApnsKeyInput,
  deps: { key: Buffer; transport?: ApnsTransport; now?: Date },
): Promise<ApnsKeyResult> {
  const keyId = (input.keyId.trim() || (input.file ? keyIdFromFileName(input.file.name) : null) || "").toUpperCase();
  const teamId = (input.teamId.trim() || app.apnsTeamId || app.appleTeamId || "").toUpperCase();
  const values = { apnsKeyId: keyId, apnsTeamId: teamId };
  if (!input.file && !input.keyId.trim() && !input.teamId.trim()) return { ok: true, patch: null };
  const errors: Record<string, string> = {};
  if (!app.iosBundleId) return { ok: false, errors: { apnsKeyFile: "Add the iOS bundle ID first." }, values };
  if (!input.file) errors.apnsKeyFile = "Upload your APNs key (.p8).";
  else if (input.file.size > APNS_KEY_MAX_BYTES) errors.apnsKeyFile = "That file is too large for an APNs key.";
  let privateKey = "";
  if (input.file && !errors.apnsKeyFile) {
    privateKey = input.file.text.trim();
    const parsed = parseApnsKey(privateKey);
    if (!parsed.ok) errors.apnsKeyFile = "This isn't an APNs key. Download the .p8 file from Certificates, Identifiers & Profiles › Keys.";
  }
  if (!APPLE_ID_PATTERN.test(keyId)) errors.apnsKeyId = "Enter the key's 10-character Key ID.";
  if (!APPLE_ID_PATTERN.test(teamId)) errors.apnsTeamId = "Enter your 10-character Team ID.";
  if (Object.keys(errors).length > 0) return { ok: false, errors, values };
  const check = await checkApnsKey({ keyId, teamId, privateKey, bundleId: app.iosBundleId }, { transport: deps.transport, now: deps.now });
  if (!check.ok) return { ok: false, errors: { apnsKeyFile: apnsCheckMessage(check, app.iosBundleId) }, values };
  return {
    ok: true,
    patch: { apnsKeyEncrypted: encrypt(privateKey, deps.key, apnsKeyContext(app.id)), apnsKeyId: keyId, apnsTeamId: teamId },
    keyId,
    teamId,
    message: `Apple accepted the key for ${app.iosBundleId}. iPhones with your latest app now get notifications straight from Apple.`,
  };
}

/** The patch that removes the key. */
export const REMOVE_APNS_KEY: AppPatch = { apnsKeyEncrypted: null, apnsKeyId: null, apnsTeamId: null };

/**
 * The APNs key fields of a form (`apnsKeyFile`, `apnsKeyId`, `apnsTeamId`),
 * as the other key fields of the Publishing step return them: an empty
 * patch when nothing was filled in or the app doesn't take the key.
 */
export async function readApnsKeyForm(
  app: App,
  formData: FormData,
  deps: { key: Buffer; transport?: ApnsTransport; now?: Date },
): Promise<{ patch: AppPatch; errors: Record<string, string>; values: Record<string, string>; message: string | null }> {
  if (!apnsKeyApplies(app)) return { patch: {}, errors: {}, values: {}, message: null };
  const field = (name: string) => String(formData.get(name) ?? "");
  const result = await readApnsKey(app, { file: await apnsFileOf(formData.get("apnsKeyFile")), keyId: field("apnsKeyId"), teamId: field("apnsTeamId") }, deps);
  if (!result.ok) return { patch: {}, errors: result.errors, values: result.values, message: null };
  return result.patch ? { patch: result.patch, errors: {}, values: {}, message: result.message } : { patch: {}, errors: {}, values: {}, message: null };
}

/** A form's file as `readApnsKey` takes it, or null when none was chosen. */
export async function apnsFileOf(value: FormDataEntryValue | null): Promise<ApnsKeyInput["file"]> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  return { name: value.name, size: value.size, text: value.size > APNS_KEY_MAX_BYTES ? "" : await value.text() };
}
