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

/** Fixed-window counter stored in the data store, so it holds across function instances. */
export async function hitRateLimit(
  store: Pick<DataStore, "hitRateLimit">,
  rule: RateLimitRule,
  subject: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const bucket = `${rule.name}:${rule.windowSeconds}:${subject}`.slice(0, 191);
  const hits = await store.hitRateLimit(bucket, windowStart, now);
  return {
    allowed: hits <= rule.limit,
    hits,
    limit: rule.limit,
    retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now.getTime()) / 1000)),
  };
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
} satisfies Record<string, RateLimitRule>;
