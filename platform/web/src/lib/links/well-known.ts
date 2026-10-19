import type { AppLinkTarget } from "../data/types";
import { YALLAPP_LINK_PREFIX } from "./table";

/**
 * 46 The files a domain serves so phones open its links in the app
 * (docs/api/openapi.yaml, tag Links): `/.well-known/assetlinks.json`
 * (Android) and `/.well-known/apple-app-site-association` (iOS), and the
 * values they're made of.
 */

/** A SHA-256 certificate fingerprint as the files want it: 32 uppercase hex pairs with colons. */
export const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
export const TEAM_ID = /^[A-Z0-9]{10}$/;

/**
 * Reads a SHA-256 fingerprint the way Play Console and keytool show it
 * (pairs with colons, or 64 hex digits, any case, a "SHA256:" label allowed).
 */
export function normalizeFingerprint(input: string): { ok: true; value: string } | { ok: false; message: string } {
  const text = input.trim().replace(/^sha-?256\s*[:=]?\s*/i, "");
  const hex = text.replace(/[\s:]/g, "");
  if (!/^[0-9A-Fa-f]*$/.test(hex)) {
    return { ok: false, message: "Use only the letters A to F and digits, as Play Console shows the fingerprint." };
  }
  if (hex.length === 40) {
    return { ok: false, message: "That's the SHA-1 fingerprint. Copy the SHA-256 one, just below it in Play Console." };
  }
  if (hex.length !== 64) {
    return { ok: false, message: "A SHA-256 fingerprint has 32 pairs of characters, like 14:6D:E9:…:B5:C3." };
  }
  return { ok: true, value: hex.toUpperCase().match(/../g)!.join(":") };
}

/** An Apple Team ID: 10 capital letters and digits. */
export function normalizeTeamId(input: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = input.trim().toUpperCase();
  if (!TEAM_ID.test(value)) return { ok: false, message: "A Team ID has 10 letters and digits, like A1B2C3D4E5." };
  return { ok: true, value };
}

/** The app's fingerprints for its Android statement: the Play App Signing key's, then the upload key's. */
export function fingerprintsOf(target: Pick<AppLinkTarget, "playSigningSha256" | "androidUploadSha256">): string[] {
  const all = [target.playSigningSha256, target.androidUploadSha256].filter((f): f is string => Boolean(f && FINGERPRINT.test(f)));
  return [...new Set(all)];
}

/** `<Team ID>.<bundle ID>`, or null until both are known. */
export function appleAppId(target: Pick<AppLinkTarget, "appleTeamId" | "iosBundleId">): string | null {
  return target.appleTeamId && TEAM_ID.test(target.appleTeamId) && target.iosBundleId ? `${target.appleTeamId}.${target.iosBundleId}` : null;
}

export interface AssetLinkStatement {
  relation: string[];
  target: { namespace: "android_app"; package_name: string; sha256_cert_fingerprints: string[] };
}

export interface AppleAssociation {
  applinks: { details: { appIDs: string[]; components: { "/": string; comment?: string }[] }[] };
}

/** One app's Android statement, or null without a package name or fingerprint. */
export function assetLinkStatement(target: AppLinkTarget): AssetLinkStatement | null {
  const fingerprints = fingerprintsOf(target);
  if (!target.androidPackage || fingerprints.length === 0) return null;
  return {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: { namespace: "android_app", package_name: target.androidPackage, sha256_cert_fingerprints: fingerprints },
  };
}

/** Yallapp's own `/.well-known/assetlinks.json`: every app that can be verified. */
export function platformAssetLinks(targets: AppLinkTarget[]): AssetLinkStatement[] {
  return targets.map(assetLinkStatement).filter((s): s is AssetLinkStatement => s !== null);
}

/** Yallapp's own `/.well-known/apple-app-site-association`: each app for its own `/a/<app_id>/` only. */
export function platformAppleAssociation(targets: AppLinkTarget[]): AppleAssociation {
  const details = targets.flatMap((t) => {
    const appId = appleAppId(t);
    return appId ? [{ appIDs: [appId], components: [{ "/": `${YALLAPP_LINK_PREFIX}${t.id}/*` }] }] : [];
  });
  return { applinks: { details } };
}

/** `LicenseStatus.app_links` in docs/api/platform.yaml: what the plugin's link files say. */
export function licenseAppLinks(target: AppLinkTarget): {
  android: { package_name: string; sha256_cert_fingerprints: string[] } | null;
  ios: { app_ids: string[] } | null;
} | null {
  const statement = assetLinkStatement(target);
  const appId = appleAppId(target);
  if (!statement && !appId) return null;
  return {
    android: statement ? { package_name: statement.target.package_name, sha256_cert_fingerprints: statement.target.sha256_cert_fingerprints } : null,
    ios: appId ? { app_ids: [appId] } : null,
  };
}
