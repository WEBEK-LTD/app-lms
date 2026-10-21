import { hmacSha256 } from "../crypto/tokens";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { senderWithFallback } from "../hosted/app-sender";
import type { OtpSender } from "../hosted/otp-sender";
import { parseAnyPhone, type Phone } from "../hosted/phone";
import { normalizeEmail } from "../hosted/sign-in-methods";
import { hitRateLimit, RATE_LIMITS, rateLimitHits, type RateLimitRule } from "../rate-limit";
import { hashLicenseKey } from "./key";
import { parseSiteInfo, type SiteInfo } from "./service";
import { licenseUsesSite } from "./site";
import { licenseState } from "./status";

/**
 * 18 "Sent by Yallapp" (docs/api/platform.yaml: sendSignInCode): a WordPress
 * site's plugin makes a sign-in code itself and asks the platform to deliver
 * it through the platform's sign-in code sender (WABEK on production), with
 * the app's name in the message. The code passes through and is never
 * stored or logged; the phone number appears only as a keyed hash in the
 * rate-limit counters. Available on every plan.
 *
 * 24 The email channel: the same for an email address, delivered with the
 * "Sign-in code" email through the app's own email server when its owner set
 * one, else Yallapp's.
 */

/** How long the plugin keeps a code valid; the message says so. */
export const SIGN_IN_CODE_TTL_SECONDS = 300;

export interface SignInCodeError {
  code: "invalid_request" | "invalid_phone" | "invalid_email" | "license_not_found" | "license_inactive" | "rate_limited" | "provider_error";
  message: string;
  retry_after_seconds?: number;
}

export type SignInCodeResult = { status: 204 } | { status: 400 | 403 | 404 | 429 | 502; body: SignInCodeError };

interface SignInCodeRequestBase {
  site: SiteInfo;
  code: string;
  /** The app's name on the site: used only when the license's app has no name yet. */
  appName: string | null;
}

/** 24 On WhatsApp to a phone number (the default), or by email to an address. */
export type SignInCodeRequest = SignInCodeRequestBase & ({ channel: "whatsapp"; phone: Phone } | { channel: "email"; email: string });

const fail = <S extends 400 | 403 | 404 | 429 | 502>(status: S, code: SignInCodeError["code"], message: string, extra: Partial<SignInCodeError> = {}) => ({
  status,
  body: { code, message, ...extra },
});

/** Validates the request body: SiteInfo with the phone number (E.164) and the 6-digit code. */
export function parseSignInCodeRequest(
  body: unknown,
): { ok: true; value: SignInCodeRequest } | { ok: false; result: { status: 400; body: SignInCodeError } } {
  const site = parseSiteInfo(body);
  if (!site.ok) return { ok: false, result: fail(400, "invalid_request", site.result.body.message) };
  const input = body as Record<string, unknown>;
  if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) {
    return { ok: false, result: fail(400, "invalid_request", "code must be 6 digits.") };
  }
  if (input.app_name !== undefined && input.app_name !== null && typeof input.app_name !== "string") {
    return { ok: false, result: fail(400, "invalid_request", "app_name must be a string.") };
  }
  const appName = typeof input.app_name === "string" ? input.app_name.replace(/[\p{Cc}\p{Cf}]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60) : "";
  const channel = input.channel ?? "whatsapp";
  if (channel !== "whatsapp" && channel !== "email") return { ok: false, result: fail(400, "invalid_request", 'channel must be "whatsapp" or "email".') };
  if (channel === "email") {
    // 24 A sign-in address, checked like the hosted API's email sign-in.
    const email = normalizeEmail(input.email);
    if (!email) return { ok: false, result: fail(400, "invalid_email", "email must be a valid email address.") };
    return { ok: true, value: { site: site.value, channel, email, code: input.code, appName: appName || null } };
  }
  // Only "+<country code><number>": the plugin sends the number in E.164, checked against each country's numbering plan.
  const raw = typeof input.phone === "string" ? input.phone.trim() : "";
  const phone = raw.startsWith("+") && raw.length <= 20 ? parseAnyPhone(raw, "") : null;
  if (!phone) return { ok: false, result: fail(400, "invalid_phone", "phone must be a valid mobile number in E.164, like +905321234567.") };
  return { ok: true, value: { site: site.value, channel, phone, code: input.code, appName: appName || null } };
}

/** The phone number in rate-limit buckets: a keyed hash, so the counters hold no number. */
export function phoneSubject(secret: string, phone: Phone): string {
  return hmacSha256(secret, `sign-in-code-phone:${phone.e164}`);
}

/** 24 The email address in rate-limit buckets: a keyed hash, so the counters hold no address. */
export function emailSubject(secret: string, email: string): string {
  return hmacSha256(secret, `sign-in-code-email:${email}`);
}

/** 24 Sends the "Sign-in code" email for the license's app (null when the license has none yet); throws when it can't. */
export type SignInCodeMailer = (app: App | null, input: { to: string; code: string; appName: string; minutes: number }) => Promise<void>;

export interface SignInCodeDeps {
  /** The platform's sign-in code sender; null when none is set up. */
  sender: OtpSender | null;
  /** The app owner's own WhatsApp number (App sign-in page), used instead when it has one. */
  appSender?: (app: App) => OtpSender | null;
  /** 19 The owner's own number failed (Yallapp's sender then sent the code): keep it on the app and tell the owner. */
  onAppSenderFailed?: (app: App) => Promise<void>;
  /** 24 Emails a code (the email channel); without it, email codes get 502. */
  mailer?: SignInCodeMailer;
  /** Keys the phone number's (and email address's) hash in the rate-limit counters. */
  secret: string;
  now: Date;
}

/** Checks the license and the limits, then hands the code to the sender. */
export async function sendSignInCode(store: DataStore, request: SignInCodeRequest, deps: SignInCodeDeps): Promise<SignInCodeResult> {
  const { now } = deps;
  const license = await store.getLicenseByHash(hashLicenseKey(request.site.licenseKey));
  const client = license ? await store.getClientById(license.clientId) : null;
  if (!license || !client) {
    return fail(404, "license_not_found", "This license key doesn't exist. Check it in your Yallapp dashboard.");
  }
  const state = licenseState(client, license, now);
  if (state !== "active") {
    const why = state === "suspended" ? "is suspended" : state === "expired" ? "has ended" : "isn't active yet";
    return fail(403, "license_inactive", `This license ${why}, so Yallapp can't send sign-in codes for it.`);
  }
  const activation = await store.getActivation(license.id);
  if (!activation || activation.siteUrl !== request.site.siteUrl || !(await licenseUsesSite(store, license))) {
    return fail(403, "license_inactive", "This license isn't active on this site.");
  }

  const rules: [RateLimitRule, string][] = [
    [RATE_LIMITS.signInCodeLicenseHour, license.id],
    [RATE_LIMITS.signInCodeLicenseDay, license.id],
  ];
  if (request.channel === "email") {
    const email = emailSubject(deps.secret, request.email);
    rules.push([RATE_LIMITS.signInCodeEmailResend, email], [RATE_LIMITS.signInCodeEmailHour, email]);
  } else {
    const phone = phoneSubject(deps.secret, request.phone);
    rules.push([RATE_LIMITS.signInCodePhoneResend, phone], [RATE_LIMITS.signInCodePhoneHour, phone]);
  }
  for (const [rule, subject] of rules) {
    const hit = await hitRateLimit(store, rule, subject, now);
    if (!hit.allowed) {
      return fail(429, "rate_limited", "Too many sign-in codes. Try again shortly.", { retry_after_seconds: hit.retryAfter });
    }
  }

  const app = license.appId ? await store.getAppById(license.appId) : null;
  const appName = app?.appName?.trim() || request.appName || "Yallapp";
  if (request.channel === "email") {
    if (!deps.mailer) return fail(502, "provider_error", "Sign-in codes can't be sent by email right now. Try again later.");
    try {
      await deps.mailer(app, { to: request.email, code: request.code, appName, minutes: SIGN_IN_CODE_TTL_SECONDS / 60 });
    } catch (e) {
      // The reason is logged in plain words (never the code, the address or a password).
      console.error(`[sign-in codes] email code not sent for license ${license.id}: ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`);
      return fail(502, "provider_error", "The sign-in code couldn't be sent. Try again.");
    }
    await hitRateLimit(store, RATE_LIMITS.signInCodesSent, license.id, now);
    return { status: 204 };
  }
  // 19 The owner's own number first; when it fails, Yallapp's sender sends the code once more.
  const sender = senderWithFallback((app && deps.appSender?.(app)) || null, deps.sender, async () => {
    if (app) await deps.onAppSenderFailed?.(app);
  });
  if (!sender) return fail(502, "provider_error", "Sign-in codes can't be sent right now. Try again later.");
  try {
    await sender.send({ phone: request.phone.e164, code: request.code, appName, expiresInSeconds: SIGN_IN_CODE_TTL_SECONDS });
  } catch (e) {
    // 19 The provider's answer is logged (it never holds the code); the number and the code aren't.
    console.error(`[sign-in codes] code not sent for license ${license.id}: ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`);
    return fail(502, "provider_error", "The sign-in code couldn't be sent. Try again.");
  }
  await hitRateLimit(store, RATE_LIMITS.signInCodesSent, license.id, now);
  return { status: 204 };
}

/** The sign-in codes a license sent today (UTC), for the admin's client page. */
export function signInCodesSentToday(store: Pick<DataStore, "peekRateLimit">, licenseId: string, now: Date): Promise<number> {
  return rateLimitHits(store, RATE_LIMITS.signInCodesSent, licenseId, now);
}
