import { appLabel } from "../app/label";
import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import { DEFAULT_HOSTED_SETTINGS, type App, type AppWhatsappSender } from "../data/types";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { waabekSender, type OtpSender } from "./otp-sender";
import type { Lang } from "@/i18n/config";
import { mailOptions } from "../email/mail-lang";
import { noteAppError } from "../watch/app-errors";

/**
 * 18 An app owner's own WhatsApp number on WABEK (waabek.com), set on the
 * dashboard's App sign-in page: that app's phone codes go out from it, on the
 * hosted API and for its WordPress site (POST /api/v1/sign-in-codes/send).
 * Without one, Yallapp's own sender (Settings › Sign-in codes) sends them.
 */

export const context = (appId: string) => `app-whatsapp:${appId}`;

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

/**
 * 19 The sender for an app's phone codes: the owner's own number when they
 * connected one, else Yallapp's. When the own number fails, the code goes out
 * once more from Yallapp's sender (when one is set up), so the customer still
 * gets it, and `onOwnFailed` hears about it (to keep it on the app and tell
 * the owner). The failure is logged with the provider's answer, never the code.
 */
export function senderWithFallback(own: OtpSender | null, platform: OtpSender | null, onOwnFailed: () => Promise<void>): OtpSender | null {
  if (!own) return platform;
  return {
    async send(input) {
      try {
        await own.send(input);
        return;
      } catch (e) {
        const reason = (e instanceof Error ? e.message : String(e)).slice(0, 300);
        console.error(`[sign-in codes] the app's own WhatsApp number didn't send a code: ${reason}${platform ? " Sending it from Yallapp's number." : ""}`);
        try {
          await onOwnFailed();
        } catch (report) {
          console.error("[sign-in codes] couldn't record the own number's failure", report);
        }
        if (!platform) throw e;
      }
      await platform.send(input);
    },
  };
}

export interface OwnNumberFailureDeps {
  store: DataStore;
  now: Date;
  /** The platform's address, for the link in the email. */
  baseUrl: string;
  /** Sends the "own_whatsapp_failed" email. */
  mail: (key: "own_whatsapp_failed", to: string, values: Record<string, string>, options?: { lang?: Lang }) => Promise<unknown>;
}

/** The day of a failure, as the dashboard and the email show it. */
export function failureDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * 19 The owner's own number failed to send a code: kept on the app (App
 * sign-in shows it) and the owner gets an email, at most one per app a day.
 */
export async function recordOwnWhatsappFailure(deps: OwnNumberFailureDeps, appId: string): Promise<void> {
  const app = await deps.store.getAppById(appId);
  if (!app?.hostedSettings?.whatsappSender) return;
  // 78.4 Counted for the team, each time.
  await noteAppError(deps.store, { clientId: app.clientId, appId: app.id, source: "whatsapp", code: "own_number_failed", detail: "The app's own WhatsApp number couldn't send a sign-in code; Yallapp's number sent it." }, deps.now);
  const at = deps.now.toISOString();
  await deps.store.updateApp(app.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...app.hostedSettings, whatsappFailedAt: at } }, deps.now);
  if (app.demo) return;
  const limit = await hitRateLimit(deps.store, RATE_LIMITS.ownWhatsappFailedMail, app.id, deps.now);
  if (!limit.allowed) return;
  const client = await deps.store.getClientById(app.clientId);
  const owner = client ? await deps.store.getUserById(client.userId) : null;
  if (!owner) return;
  const link = new URLSearchParams({ app: app.id, to: "app-sign-in" });
  await deps.mail(
    "own_whatsapp_failed",
    owner.email,
    {
      name: owner.name,
      app_name: appLabel(app),
      date: failureDate(at),
      sign_in_url: `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/open?${link.toString()}`,
    },
    ...mailOptions(owner),
  );
}
