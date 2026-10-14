import { hmacSha256, randomToken, safeEqual } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import { decryptSetting, platformSetting } from "../../settings/platform";

/**
 * 25 Yallapp's partner apps on store platforms (Salla, Zid). The team creates
 * one app per platform in its partner portal and saves its client ID, client
 * secret and webhook secret in admin Settings (encrypted platform settings).
 * Each store then connects to it with OAuth: the Website step's "Connect
 * with …" button sends the owner to the platform's approval page with a
 * signed `state`, and src/app/oauth/<platform> saves the tokens.
 */

export type PartnerAppKey = "sallaApp" | "zidApp";

export interface PartnerCredentials {
  clientId: string;
  clientSecret: string;
  webhookSecret: string | null;
}

/** The partner app's credentials, decrypted, or null until the team saves them. */
export async function partnerAppCredentials(store: DataStore, key: PartnerAppKey, encryptionKey: Buffer): Promise<PartnerCredentials | null> {
  const saved = await platformSetting(store, key);
  if (!saved) return null;
  try {
    return {
      clientId: saved.value.clientId,
      clientSecret: decryptSetting(key, saved.value.clientSecretEncrypted, encryptionKey),
      webhookSecret: saved.value.webhookSecretEncrypted ? decryptSetting(key, saved.value.webhookSecretEncrypted, encryptionKey) : null,
    };
  } catch {
    console.error(`[hosted] the saved ${key} credentials can't be decrypted.`);
    return null;
  }
}

/** The address the platform sends the owner back to (registered in the partner app). */
export function oauthRedirectUri(appUrl: string, platform: string): string {
  return `${appUrl.replace(/\/+$/, "")}/oauth/${platform}`;
}

/** How long an approval may take before its `state` no longer works. */
export const OAUTH_STATE_MINUTES = 20;

export interface OAuthState {
  platform: string;
  appId: string;
}

/** `state` for the approval page: the platform and app, signed, with an expiry and a nonce. */
export function signOAuthState(state: OAuthState, secret: string, now: Date): string {
  const payload = Buffer.from(
    JSON.stringify({ p: state.platform, a: state.appId, e: now.getTime() + OAUTH_STATE_MINUTES * 60_000, n: randomToken(9) }),
  ).toString("base64url");
  return `${payload}.${hmacSha256(`oauth-state:${secret}`, payload)}`;
}

/** The platform and app of a `state` this server signed, or null when it's forged, changed or expired. */
export function readOAuthState(value: string, secret: string, now: Date): OAuthState | null {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra !== undefined || value.length > 1000) return null;
  if (!safeEqual(signature, hmacSha256(`oauth-state:${secret}`, payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { p?: unknown; a?: unknown; e?: unknown };
    if (typeof data.p !== "string" || typeof data.a !== "string" || typeof data.e !== "number") return null;
    if (data.e < now.getTime()) return null;
    return { platform: data.p, appId: data.a };
  } catch {
    return null;
  }
}
