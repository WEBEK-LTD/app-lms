import { createHmac } from "node:crypto";
import { safeEqual } from "../../crypto/tokens";
import type { DataStore } from "../../data/store";
import { partnerAppCredentials } from "./partner-apps";
import { platformConnectorConfig, platformValues } from "./platforms";
import { SALLA_PLATFORM } from "./salla";

/**
 * 25 Webhooks from Yallapp's Salla app (src/app/api/webhooks/salla), signed
 * with the app's webhook secret (`X-Salla-Signature`: HMAC-SHA256 of the raw
 * body, hex; the "Signature" security strategy).
 *
 * `app.store.authorize` ("easy mode") carries new tokens for a merchant: they
 * replace the saved tokens of the apps already connected to that merchant
 * here. A merchant who installs the app from Salla's App Store without
 * connecting from the Website step isn't tied to any app, so nothing is
 * saved for them. Other events are acknowledged and left alone.
 *
 * Unverified: the payload `{event, merchant, data: {access_token, refresh_token, expires}}`
 * with `expires` in seconds since 1970.
 */

export const SALLA_WEBHOOK_MAX_BYTES = 256 * 1024;

export async function handleSallaWebhook(
  raw: string,
  signature: string | null,
  deps: { store: DataStore; encryptionKey: Buffer; now: Date },
): Promise<{ status: number; body: { ok: boolean; updated?: number; message?: string } }> {
  const credentials = await partnerAppCredentials(deps.store, "sallaApp", deps.encryptionKey);
  if (!credentials?.webhookSecret) return { status: 404, body: { ok: false, message: "Not set up." } };
  const expected = createHmac("sha256", credentials.webhookSecret).update(raw).digest("hex");
  if (!signature || !safeEqual(signature.trim().toLowerCase(), expected)) return { status: 401, body: { ok: false, message: "Bad signature." } };
  let payload: { event?: unknown; merchant?: unknown; data?: Record<string, unknown> | null };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return { status: 400, body: { ok: false, message: "Not JSON." } };
  }
  if (payload.event !== "app.store.authorize") return { status: 200, body: { ok: true } };
  const merchantId = typeof payload.merchant === "number" || typeof payload.merchant === "string" ? String(payload.merchant) : "";
  const accessToken = typeof payload.data?.access_token === "string" ? payload.data.access_token : "";
  const refreshToken = typeof payload.data?.refresh_token === "string" ? payload.data.refresh_token : "";
  const expires = Number(payload.data?.expires);
  if (!/^\d{1,20}$/.test(merchantId) || !accessToken || !refreshToken) return { status: 400, body: { ok: false, message: "Missing tokens." } };
  // Seconds since 1970 (or, to be safe, milliseconds).
  const expiresAt = Number.isFinite(expires) && expires > 0 ? (expires < 1e12 ? expires * 1000 : expires) : deps.now.getTime() + 14 * 24 * 60 * 60_000;

  let updated = 0;
  for (const app of await deps.store.listApps()) {
    if (app.connector?.kind !== "platform" || app.connector.platform !== SALLA_PLATFORM.id) continue;
    const values = platformValues(app, deps.encryptionKey);
    if (!values || values.merchantId !== merchantId) continue;
    // Tokens older than the saved ones are never put back.
    if ((Number(values.tokenExpiresAt) || 0) > expiresAt) continue;
    const tokens = { accessToken, refreshToken, tokenExpiresAt: String(expiresAt) };
    await deps.store.updateApp(app.id, { connector: platformConnectorConfig(app.id, SALLA_PLATFORM, { ...values, ...tokens }, deps.encryptionKey) }, deps.now);
    updated++;
  }
  return { status: 200, body: { ok: true, updated } };
}
