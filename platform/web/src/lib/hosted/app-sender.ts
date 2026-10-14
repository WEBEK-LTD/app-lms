import { decrypt, encrypt } from "../crypto/encryption";
import type { App, AppWhatsappSender } from "../data/types";
import { waabekSender, type OtpSender } from "./otp-sender";

/**
 * 18 An app owner's own WhatsApp number on WABEK (waabek.com), set on the
 * dashboard's App sign-in page: that app's phone codes go out from it, on the
 * hosted API and for its WordPress site (POST /api/v1/sign-in-codes/send).
 * Without one, Yallapp's own sender (Settings › Sign-in codes) sends them.
 */

const context = (appId: string) => `app-whatsapp:${appId}`;

/** The saved form of a new key and instance. */
export function appWhatsappSender(appId: string, apiKey: string, instanceId: string | null, encryptionKey: Buffer, now: Date): AppWhatsappSender {
  return {
    apiKeyEncrypted: encrypt(apiKey, encryptionKey, context(appId)),
    instanceId,
    keyLast4: apiKey.slice(-4),
    savedAt: now.toISOString(),
  };
}

/** The app's own sender, or null when it has none (or its key can't be read). */
export function appOtpSender(
  app: Pick<App, "id" | "hostedSettings">,
  encryptionKey: Buffer,
  baseUrl: string,
  fetcher: typeof fetch = fetch,
): OtpSender | null {
  const saved = app.hostedSettings?.whatsappSender;
  if (!saved) return null;
  let apiKey: string;
  try {
    apiKey = decrypt(saved.apiKeyEncrypted, encryptionKey, context(app.id));
  } catch {
    return null;
  }
  return waabekSender({ kind: "waabek", apiKey, baseUrl, instanceId: saved.instanceId }, fetcher);
}

/** Validates the form: the WABEK API key and an optional instance ID. */
export function parseAppWhatsappForm(values: { apiKey: string; instanceId: string }):
  | { ok: true; apiKey: string; instanceId: string | null }
  | { ok: false; errors: Record<string, string> } {
  const apiKey = values.apiKey.trim();
  const instanceId = values.instanceId.trim();
  const errors: Record<string, string> = {};
  if (!apiKey) errors.apiKey = "Paste the API key from your WABEK account.";
  else if (apiKey.length > 200 || /\s/.test(apiKey)) errors.apiKey = "That doesn't look like a WABEK API key.";
  if (instanceId.length > 100 || /\s/.test(instanceId)) errors.instanceId = "Enter the instance ID as WABEK shows it, or leave it empty.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, apiKey, instanceId: instanceId || null };
}
