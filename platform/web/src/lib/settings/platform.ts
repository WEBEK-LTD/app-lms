import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { PlatformSetting, PlatformSettingKey, PlatformSettingValues } from "../data/types";
import { otpSenderConfig, smtpConfig, type OtpSenderConfig, type SmtpConfig } from "../env";
import type { IyzicoKeys } from "../payments/iyzico";
import { plansWith, type Plan, type PlanInfo } from "../plans";

/**
 * Settings the team edits in the admin. Each one, when saved, replaces the
 * matching Netlify variables; removed, the variables apply again. Secrets
 * inside are encrypted with the context `platform:<key>`.
 */

const CACHE_MS = 30_000;
let cache: { at: number; settings: Map<PlatformSettingKey, PlatformSetting> } | null = null;

export const settingContext = (key: PlatformSettingKey) => `platform:${key}`;

export function encryptSetting(key: PlatformSettingKey, value: string, encryptionKey: Buffer): string {
  return encrypt(value, encryptionKey, settingContext(key));
}

export function decryptSetting(key: PlatformSettingKey, value: string, encryptionKey: Buffer): string {
  return decrypt(value, encryptionKey, settingContext(key));
}

/**
 * The saved settings, cached for 30 seconds per server instance (each
 * instance, and each server bundle, has its own copy). `fresh` reads the
 * database, for the admin page and for payments, where a stale copy could
 * miss keys saved a moment ago.
 */
export async function platformSettings(
  store: DataStore,
  options: { now?: number; fresh?: boolean } = {},
): Promise<Map<PlatformSettingKey, PlatformSetting>> {
  const now = options.now ?? Date.now();
  if (!options.fresh && cache && now - cache.at < CACHE_MS) return cache.settings;
  const settings = new Map((await store.listPlatformSettings()).map((s) => [s.key, s]));
  cache = { at: now, settings };
  return settings;
}

export async function platformSetting<K extends PlatformSettingKey>(
  store: DataStore,
  key: K,
  options: { fresh?: boolean } = {},
): Promise<PlatformSetting<K> | null> {
  return ((await platformSettings(store, options)).get(key) as PlatformSetting<K> | undefined) ?? null;
}

/** After a save: this instance reads the new values at once. */
export function clearPlatformSettingsCache(): void {
  cache = null;
}

/** How sign-in codes are sent: the admin's setting, or the OTP_* variables. */
export async function resolvedOtpSenderConfig(store: DataStore, encryptionKey: Buffer): Promise<OtpSenderConfig | null> {
  const saved = await platformSetting(store, "otp");
  if (!saved) return otpSenderConfig();
  const otp = saved.value;
  if (otp.kind === "off") return null;
  if (otp.kind === "whatsapp") {
    return {
      kind: "whatsapp",
      accessToken: decryptSetting("otp", otp.accessTokenEncrypted, encryptionKey),
      phoneNumberId: otp.phoneNumberId,
      template: otp.template,
      language: otp.language,
    };
  }
  if (otp.kind === "waabek") {
    return { kind: "waabek", apiKey: decryptSetting("otp", otp.apiKeyEncrypted, encryptionKey), baseUrl: otp.baseUrl };
  }
  return { kind: "webhook", url: otp.url, secret: decryptSetting("otp", otp.secretEncrypted, encryptionKey) };
}

/** The email server: the admin's setting, or the SMTP_* variables. */
export async function resolvedSmtpConfig(store: DataStore, encryptionKey: Buffer): Promise<SmtpConfig | null> {
  const saved = await platformSetting(store, "smtp");
  if (!saved) return smtpConfig();
  const smtp = saved.value;
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    user: smtp.user ?? undefined,
    pass: smtp.passEncrypted ? decryptSetting("smtp", smtp.passEncrypted, encryptionKey) : undefined,
    from: smtp.from,
  };
}

/** Yallapp's own iyzico account, or null until the team adds it. */
export async function yallappIyzicoKeys(store: DataStore, encryptionKey: Buffer): Promise<IyzicoKeys | null> {
  // Always read from the database: a payment must never miss keys saved a moment ago.
  const saved = await platformSetting(store, "iyzico", { fresh: true });
  if (!saved) return null;
  return {
    apiKey: decryptSetting("iyzico", saved.value.apiKeyEncrypted, encryptionKey),
    secretKey: decryptSetting("iyzico", saved.value.secretKeyEncrypted, encryptionKey),
    sandbox: saved.value.sandbox,
  };
}

/** The plans as the team set them in the admin. */
export async function getPlans(store: DataStore): Promise<Record<Plan, PlanInfo>> {
  return plansWith((await platformSetting(store, "plans"))?.value);
}

export type { PlatformSettingValues };
