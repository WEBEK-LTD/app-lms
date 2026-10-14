import { hmacSha256, safeEqual } from "../crypto/tokens";

/**
 * 17 Preview links: a short-lived token per app, signed with a key made from
 * SIGNING_SECRET, so the app preview (the app's web build at /preview-app/)
 * can read that one app's preview config. Nothing is stored: the token
 * carries the app, its expiry and whether it shows the draft pages, and the
 * signature covers all three.
 *
 * Format: `p1.<app id>.<expires, unix seconds>.<0|1 draft>.<signature>`.
 */

/** How long a preview link works. */
export const PREVIEW_TTL_SECONDS = 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TOKEN = /^p1\.([0-9a-f-]{36})\.(\d{1,12})\.([01])\.([A-Za-z0-9_-]{43})$/;

export interface PreviewGrant {
  appId: string;
  /** The preview shows the Pages & look draft instead of the published pages (hosted API only). */
  draft: boolean;
  expiresAt: Date;
}

export type PreviewCheck = { ok: true; grant: PreviewGrant } | { ok: false; reason: "invalid" | "expired" };

/** The signing key for preview tokens only, so they can't be mistaken for any other signature. */
export function previewKey(signingSecret: string): string {
  return hmacSha256(signingSecret, "app-preview-token");
}

function sign(key: string, payload: string): string {
  return hmacSha256(key, `preview:${payload}`);
}

export function createPreviewToken(input: { appId: string; draft: boolean }, key: string, now: Date = new Date(), ttlSeconds = PREVIEW_TTL_SECONDS): string {
  const appId = input.appId.toLowerCase();
  if (!UUID.test(appId)) throw new Error("Not an app ID");
  const expires = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const payload = `p1.${appId}.${expires}.${input.draft ? 1 : 0}`;
  return `${payload}.${sign(key, payload)}`;
}

/** Checks a token's signature and expiry. `appId`, when given, must be the token's app. */
export function verifyPreviewToken(token: string | null | undefined, key: string, now: Date = new Date(), appId?: string): PreviewCheck {
  const match = TOKEN.exec((token ?? "").trim());
  if (!match) return { ok: false, reason: "invalid" };
  const [, id, expires, draft, sig] = match as unknown as [string, string, string, string, string];
  if (!UUID.test(id)) return { ok: false, reason: "invalid" };
  const payload = `p1.${id}.${expires}.${draft}`;
  if (!safeEqual(sig, sign(key, payload))) return { ok: false, reason: "invalid" };
  // Another app's token never works here, even while it is valid.
  if (appId !== undefined && appId.toLowerCase() !== id) return { ok: false, reason: "invalid" };
  const expiresAt = new Date(Number(expires) * 1000);
  if (expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, grant: { appId: id, draft: draft === "1", expiresAt } };
}

/** The header the app preview sends to the hosted API with its token. */
export const PREVIEW_HEADER = "x-yallapp-preview";

/** Where the app preview opens: the app's web build (public/preview-app) with a preview link for one app. */
export function previewAppPath(token: string): string {
  return `/preview-app/index.html?token=${encodeURIComponent(token)}`;
}
