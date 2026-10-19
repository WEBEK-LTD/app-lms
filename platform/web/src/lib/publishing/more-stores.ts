import { createPrivateKey, X509Certificate } from "node:crypto";

/**
 * 35, 36, 42 Samsung Galaxy Store, Huawei AppGallery and Xiaomi GetApps
 * details the client enters on the dashboard's "More Android stores" page:
 * pure checks, unit tested. Keys are encrypted by the caller and never shown
 * again.
 */

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** A content ID: the number Seller Portal shows for the app. An AppGallery app ID is a number too. */
const NUMBER_ID = /^\d{6,20}$/;
/** Service account and API client IDs: letters, numbers and dashes. */
const ACCOUNT_ID = /^[A-Za-z0-9._-]{6,64}$/;
/** API client keys and app secrets: no spaces. */
const SECRET = /^[A-Za-z0-9._~+/=-]{16,256}$/;

export function checkGalaxyContentId(value: string): string | null {
  return NUMBER_ID.test(value) ? null : "The content ID is the number Seller Portal shows for your app, like 000001234567.";
}

export function checkGalaxyServiceAccountId(value: string): string | null {
  return ACCOUNT_ID.test(value) ? null : "Paste the service account ID from Seller Portal › Assistance › API Service.";
}

/**
 * The Seller Portal service account's private key: an RSA key in PEM form,
 * which signs the token requests (RS256). Returns the key as saved, trimmed.
 */
export function checkGalaxyPrivateKey(value: string): Checked<string> {
  const pem = value.trim().replace(/\r\n/g, "\n");
  const problem = "This isn't the service account's private key. Paste the whole key Seller Portal gave you, from -----BEGIN PRIVATE KEY----- to the end.";
  if (pem.length > 10_000 || !/-----BEGIN (RSA )?PRIVATE KEY-----/.test(pem)) return { ok: false, error: problem };
  try {
    const key = createPrivateKey(pem);
    if (key.asymmetricKeyType !== "rsa") return { ok: false, error: problem };
  } catch {
    return { ok: false, error: problem };
  }
  return { ok: true, value: pem };
}

export function checkHuaweiAppId(value: string): string | null {
  return NUMBER_ID.test(value) ? null : "The app ID is the number AppGallery Connect shows under Project settings › App information.";
}

export function checkHuaweiClientId(value: string): string | null {
  return ACCOUNT_ID.test(value) ? null : "Paste the client ID from AppGallery Connect › Users and permissions › API key › Connect API.";
}

export function checkHuaweiSecret(value: string, what: "client" | "push"): string | null {
  if (SECRET.test(value)) return null;
  return what === "client"
    ? "Paste the key shown next to the API client in AppGallery Connect › Users and permissions › API key › Connect API."
    : "Paste the app secret from AppGallery Connect › Project settings › App information.";
}

/**
 * agconnect-services.json from AppGallery Connect: it must be for the app's
 * package name. Returns the app ID it carries. The file is built into the app
 * (like google-services.json), so it holds no secret we keep private.
 */
export function checkAgconnectServices(source: string, androidPackage: string): Checked<{ appId: string }> {
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return { ok: false, error: "This isn't an agconnect-services.json file." };
  }
  const root = (json ?? {}) as { client?: Record<string, unknown>; app_info?: Record<string, unknown> };
  const appId = [root.app_info?.app_id, root.client?.app_id].find((v): v is string => typeof v === "string" && NUMBER_ID.test(v));
  const packageName = [root.app_info?.package_name, root.client?.package_name].find((v): v is string => typeof v === "string");
  if (!appId || !packageName) return { ok: false, error: "This isn't an agconnect-services.json file. Download it from AppGallery Connect › Project settings › App information." };
  if (packageName !== androidPackage) {
    return { ok: false, error: `This file is for ${packageName}, not ${androidPackage}. Add an app with the package name ${androidPackage} in AppGallery Connect and download its file.` };
  }
  return { ok: true, value: { appId } };
}

/** 42 What's new, sent with every Xiaomi GetApps update when the client wrote nothing (Xiaomi requires a text). */
export const XIAOMI_DEFAULT_RELEASE_NOTES = "Improvements and fixes.";
/** Xiaomi takes up to 500 characters (42.7: confirm). */
export const XIAOMI_RELEASE_NOTES_MAX = 500;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The API private key: one word, no spaces (its exact shape isn't documented in English, 42.7). */
const XIAOMI_KEY = /^\S{8,512}$/;

export function checkXiaomiUserName(value: string): string | null {
  return value.length <= 254 && EMAIL.test(value) ? null : "Enter the email you sign in to the Xiaomi developer platform with.";
}

export function checkXiaomiPassword(value: string): string | null {
  return XIAOMI_KEY.test(value) ? null : "Paste the private key from the automatic publishing page of the Xiaomi developer platform, without spaces.";
}

export function checkXiaomiReleaseNotes(value: string): string | null {
  return value.length <= XIAOMI_RELEASE_NOTES_MAX ? null : `Keep what's new under ${XIAOMI_RELEASE_NOTES_MAX} characters.`;
}

/**
 * Xiaomi's public certificate, as downloaded from the automatic publishing
 * page (PEM or DER): an X.509 certificate with an RSA key, still valid. It
 * encrypts the pipeline's signatures, so it's public: kept as PEM.
 */
export function checkXiaomiCertificate(source: Buffer, now: Date): Checked<string> {
  const problem = "This isn't Xiaomi's public certificate. Download it again from the automatic publishing page of the Xiaomi developer platform.";
  if (source.length === 0 || source.length > 10_000) return { ok: false, error: problem };
  let certificate: X509Certificate;
  try {
    const text = source.toString("utf8");
    certificate = new X509Certificate(text.includes("-----BEGIN CERTIFICATE-----") ? text.trim() : source);
  } catch {
    return { ok: false, error: problem };
  }
  if (certificate.publicKey.asymmetricKeyType !== "rsa") return { ok: false, error: problem };
  if (new Date(certificate.validTo).getTime() < now.getTime()) {
    return { ok: false, error: "This certificate has expired. Download the current one from the automatic publishing page of the Xiaomi developer platform." };
  }
  return { ok: true, value: certificate.toString().trim() };
}
