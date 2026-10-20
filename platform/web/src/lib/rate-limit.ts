import type { DataStore } from "./data/store";

export interface RateLimitRule {
  /** Bucket name prefix, e.g. "sign-in:ip". */
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  hits: number;
  limit: number;
  /** Seconds until the current window ends. */
  retryAfter: number;
}

function windowOf(rule: RateLimitRule, subject: string, now: Date): { bucket: string; windowStart: number; windowMs: number } {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  return { bucket: `${rule.name}:${rule.windowSeconds}:${subject}`.slice(0, 191), windowStart, windowMs };
}

/** Fixed-window counter stored in the data store, so it holds across function instances. */
export async function hitRateLimit(
  store: Pick<DataStore, "hitRateLimit">,
  rule: RateLimitRule,
  subject: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const { bucket, windowStart, windowMs } = windowOf(rule, subject, now);
  const hits = await store.hitRateLimit(bucket, windowStart, now);
  return {
    allowed: hits <= rule.limit,
    hits,
    limit: rule.limit,
    retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now.getTime()) / 1000)),
  };
}

/** The hits so far in the current window, without adding one (counters shown to the team). */
export async function rateLimitHits(
  store: Pick<DataStore, "peekRateLimit">,
  rule: RateLimitRule,
  subject: string,
  now: Date = new Date(),
): Promise<number> {
  const { bucket, windowStart } = windowOf(rule, subject, now);
  return store.peekRateLimit(bucket, windowStart);
}

export const RATE_LIMITS = {
  apiCheck: { name: "api-check:client", limit: 10, windowSeconds: 10 * 60 },
  signInIp: { name: "sign-in:ip", limit: 30, windowSeconds: 15 * 60 },
  signInEmail: { name: "sign-in:email", limit: 8, windowSeconds: 15 * 60 },
  signUpIp: { name: "sign-up:ip", limit: 10, windowSeconds: 60 * 60 },
  resetIp: { name: "reset:ip", limit: 10, windowSeconds: 60 * 60 },
  resetEmail: { name: "reset:email", limit: 3, windowSeconds: 60 * 60 },
  licenseIp: { name: "license:ip", limit: 30, windowSeconds: 60 },
  updateIp: { name: "update:ip", limit: 60, windowSeconds: 60 },
  pipelineIp: { name: "pipeline:ip", limit: 600, windowSeconds: 60 },
  hostedNotify: { name: "hosted-notify:app", limit: 10, windowSeconds: 60 * 60 },
  planPayment: { name: "plan-payment:client", limit: 10, windowSeconds: 60 * 60 },
  otpTest: { name: "otp-test:admin", limit: 5, windowSeconds: 10 * 60 },
  // 17 The app preview reads its config once per load (and on "Reload after changes").
  previewIp: { name: "preview:ip", limit: 120, windowSeconds: 10 * 60 },
  // 18 Sign-in codes WordPress sites send through Yallapp (POST /api/v1/sign-in-codes/send).
  // Per license (its ID), and per phone number as a keyed hash, across every site.
  signInCodeIp: { name: "codes:ip", limit: 120, windowSeconds: 60 },
  signInCodeLicenseHour: { name: "codes:license", limit: 300, windowSeconds: 60 * 60 },
  signInCodeLicenseDay: { name: "codes:license-day", limit: 2000, windowSeconds: 24 * 60 * 60 },
  signInCodePhoneResend: { name: "codes:phone-resend", limit: 1, windowSeconds: 30 },
  signInCodePhoneHour: { name: "codes:phone", limit: 10, windowSeconds: 60 * 60 },
  // The owner's test of their own WhatsApp number (App sign-in), per app.
  appWhatsappTest: { name: "app-whatsapp-test:app", limit: 5, windowSeconds: 10 * 60 },
  // 19 The email telling an owner their own WhatsApp number failed: at most one per app a day (UTC).
  ownWhatsappFailedMail: { name: "own-whatsapp-failed:app", limit: 1, windowSeconds: 24 * 60 * 60 },
  // 24 Email codes WordPress sites send through Yallapp: per address as a keyed hash, across every site (the license limits above apply too).
  signInCodeEmailResend: { name: "codes:email-resend", limit: 1, windowSeconds: 30 },
  signInCodeEmailHour: { name: "codes:email", limit: 10, windowSeconds: 60 * 60 },
  // 24 The owner's test of their own email server (App sign-in), per app.
  appMailTest: { name: "app-mail-test:app", limit: 5, windowSeconds: 10 * 60 },
  // 24 The email telling an owner their own email server failed: at most one per app a day (UTC).
  ownMailFailedMail: { name: "own-mail-failed:app", limit: 1, windowSeconds: 24 * 60 * 60 },
  // 34 Test tokens for an own API (App sign-in, and the API check), and replacing the signing key, per app.
  appTestToken: { name: "app-test-token:app", limit: 20, windowSeconds: 10 * 60 },
  appSigningKey: { name: "app-signing-key:app", limit: 3, windowSeconds: 60 * 60 },
  // 44 Usage events the apps send (POST /api/v1/apps/{app_id}/events): per IP, per install and per app.
  analyticsIp: { name: "analytics:ip", limit: 60, windowSeconds: 60 },
  analyticsInstall: { name: "analytics:install", limit: 30, windowSeconds: 10 * 60 },
  analyticsApp: { name: "analytics:app", limit: 3000, windowSeconds: 60 },
  // 51 Signed media links WordPress sites ask for (POST /api/v1/license/media): per IP and per license.
  mediaLinksIp: { name: "media-links:ip", limit: 120, windowSeconds: 60 },
  mediaLinksLicense: { name: "media-links:license", limit: 3000, windowSeconds: 60 * 60 },
  // 51 Uploads an owner starts in the Media library, per app.
  mediaUploads: { name: "media-uploads:app", limit: 200, windowSeconds: 60 * 60 },
  // 58 Yallapp Business renewing its tokens (POST /api/owner/v1/auth/refresh), per IP. Signing in counts with the website's (signInIp, signInEmail).
  ownerRefreshIp: { name: "owner-refresh:ip", limit: 60, windowSeconds: 10 * 60 },
  // Not a limit: the codes a license sent today (UTC), for the admin's client page.
  signInCodesSent: { name: "codes:sent", limit: Number.MAX_SAFE_INTEGER, windowSeconds: 24 * 60 * 60 },
} satisfies Record<string, RateLimitRule>;
