import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { currentPlanId } from "../billing/plan-change";
import { effectivePlans, plansForApp } from "../entitlements";
import { serviceAccountOf } from "../hosted/notify";
import type { ApnsTransport } from "../hosted/apns";
import { sendPush, type PushMessage, type ServiceAccount } from "../hosted/push";
import { hitRateLimit, RATE_LIMITS } from "../rate-limit";
import { hashLicenseKey } from "./key";
import { parseSiteInfo, type SiteInfo } from "./service";
import { licenseUsesSite } from "./site";
import { pushSetupOf } from "./push-setup";
import { licenseState } from "./status";

/**
 * 136.40 The WordPress relay (docs/api/platform.yaml: sendPush): a site whose
 * app is in "Yallapp sets up notifications" mode has no Firebase service
 * account of its own, so the plugin hands each batch of device tokens to the
 * platform with its license key, and the platform sends them through the
 * app's push path (`serviceAccountOf` and `sendPush`), as it does for hosted
 * apps. Each token gets an answer: sent, invalid (the plugin forgets it) or
 * retry (the plugin tries it again later). 136.46 iPhones of an app whose
 * notifications Yallapp sets up register their APNs token (`provider: apns`);
 * those go straight to Apple with the client's APNs key, as for hosted apps,
 * and are `skipped` (kept, not retried) while no key is saved.
 *
 * Nothing about the people is stored: the tokens, the texts and the data pass
 * through to Firebase and are dropped with the request. Only counts are kept,
 * in the rate-limit counters (requests and tokens per license, and the pushes
 * delivered per license and day).
 */

/** Tokens in one request: the plugin's batch (Push_Service::BATCH_SIZE). */
export const PUSH_RELAY_MAX_TOKENS = 200;
/** Tokens sent to Firebase at the same time. */
export const PUSH_RELAY_CONCURRENCY = 20;
/** No token starts after this long, so the answer comes inside the function's time limit; the rest are "retry". */
export const PUSH_RELAY_DEADLINE_MS = 7_000;
/** A send still waiting on Firebase this long after the start is given up ("retry"), so the answer still comes. */
export const PUSH_RELAY_HARD_STOP_MS = 9_000;
export const PUSH_RELAY_TITLE_MAX = 200;
export const PUSH_RELAY_BODY_MAX = 1000;
export const PUSH_RELAY_DATA_KEYS_MAX = 20;
export const PUSH_RELAY_DATA_BYTES_MAX = 3000;
/** The largest body the route reads: 200 real tokens (about 160 characters each) with their texts, with room to spare. */
export const PUSH_RELAY_BODY_BYTES = 256_000;
const TOKEN_MAX = 4096;
/** Keys FCM keeps for itself in `data`. */
const RESERVED_DATA_KEY = /^(from|notification|message_type|collapse_key|google.*|gcm.*)$/i;

export type PushRelayTokenStatus = "sent" | "invalid" | "retry" | "skipped";

/** 136.46 A token and the service it's from: Firebase, or Apple directly. */
export interface RelayTarget {
  token: string;
  provider: "fcm" | "apns";
}

export interface PushRelayRequest {
  site: SiteInfo;
  /** The tokens, without repeats, in the order they came. */
  tokens: RelayTarget[];
  message: PushMessage;
}

export interface PushRelayAnswer {
  status: 200;
  body: {
    results: { token: string; status: PushRelayTokenStatus }[];
    sent: number;
    invalid: number;
    retry: number;
    /** 136.46 iPhone (APNs) tokens not sent because the app has no APNs key yet. */
    skipped: number;
  };
}

type FailStatus = 400 | 403 | 404 | 409 | 429 | 503;
export type PushRelayFail = { status: FailStatus; body: { code: string; message: string; retry_after_seconds?: number } };

const fail = (status: FailStatus, code: string, message: string, extra: { retry_after_seconds?: number } = {}): PushRelayFail => ({
  status,
  body: { code, message, ...extra },
});
const bad = (message: string) => ({ ok: false as const, result: fail(400, "invalid_request", message) });

/** Line breaks and tabs stay; other control and format characters go. */
const clean = (text: string) => text.replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === "\n" || c === "\t" ? c : "")).trim();

/** Validates the body: SiteInfo, the tokens (`{token, provider}`), the notification and its data. */
export function parsePushRelayRequest(body: unknown): { ok: true; value: PushRelayRequest } | { ok: false; result: PushRelayFail } {
  const site = parseSiteInfo(body);
  if (!site.ok) return bad(site.result.body.message);
  const input = body as Record<string, unknown>;

  if (!Array.isArray(input.tokens) || input.tokens.length < 1 || input.tokens.length > PUSH_RELAY_MAX_TOKENS) {
    return bad(`tokens must be a list of 1 to ${PUSH_RELAY_MAX_TOKENS} device tokens.`);
  }
  const tokens: RelayTarget[] = [];
  for (const item of input.tokens) {
    const entry = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : null;
    const token = typeof entry?.token === "string" ? entry.token.trim() : "";
    if (!token || token.length > TOKEN_MAX || /\s/.test(token)) return bad("Each token must be {token, provider} with a device token of at most 4096 characters.");
    const provider = entry?.provider ?? "fcm";
    // Huawei Push Kit stays on the site (the plugin sends those tokens itself); 136.46 APNs tokens go to Apple.
    if (provider !== "fcm" && provider !== "apns") return bad('provider must be "fcm" or "apns": Huawei tokens are sent by the site itself.');
    if (!tokens.some((t) => t.token === token)) tokens.push({ token, provider });
  }

  const notification = input.notification && typeof input.notification === "object" && !Array.isArray(input.notification) ? (input.notification as Record<string, unknown>) : null;
  if (!notification) return bad("notification must be {title, body, image?}.");
  const title = typeof notification.title === "string" ? clean(notification.title) : "";
  const text = typeof notification.body === "string" ? clean(notification.body) : "";
  if (!title && !text) return bad("notification needs a title or a body.");
  if (title.length > PUSH_RELAY_TITLE_MAX || text.length > PUSH_RELAY_BODY_MAX) {
    return bad(`notification.title can be at most ${PUSH_RELAY_TITLE_MAX} characters and notification.body ${PUSH_RELAY_BODY_MAX}.`);
  }
  let image: string | null = null;
  if (notification.image !== undefined && notification.image !== null && notification.image !== "") {
    image = httpsUrl(notification.image);
    if (!image) return bad("notification.image must be an https address of at most 500 characters.");
  }

  const data: Record<string, string> = {};
  if (input.data !== undefined && input.data !== null) {
    if (typeof input.data !== "object" || Array.isArray(input.data)) return bad("data must be an object of strings.");
    const entries = Object.entries(input.data as Record<string, unknown>);
    if (entries.length > PUSH_RELAY_DATA_KEYS_MAX) return bad(`data can have at most ${PUSH_RELAY_DATA_KEYS_MAX} keys.`);
    for (const [key, value] of entries) {
      if (!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key) || RESERVED_DATA_KEY.test(key)) return bad(`data has a key Firebase doesn't take: ${key.slice(0, 40)}.`);
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return bad("data values must be strings.");
      data[key] = String(value);
    }
    if (Buffer.byteLength(JSON.stringify(data)) > PUSH_RELAY_DATA_BYTES_MAX) return bad(`data can be at most ${PUSH_RELAY_DATA_BYTES_MAX} bytes.`);
  }

  return { ok: true, value: { site: site.value, tokens, message: { title, body: text, data, image } } };
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * One sign-in to Google for the whole batch: every request that isn't a send
 * to FCM (the OAuth token, and Phase 1's federation exchange) is made once and
 * its answer reused, so 20 tokens at a time don't sign in 20 times.
 */
export function sharedSignIn(fetcher: typeof fetch, stop?: AbortSignal): typeof fetch {
  const made = new Map<string, Promise<Response>>();
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith("https://fcm.googleapis.com/")) {
      // The batch's hard stop ends a send still waiting, as well as sendPush's own timeout.
      const signal = stop && init?.signal ? AbortSignal.any([init.signal, stop]) : (stop ?? init?.signal ?? null);
      return fetcher(input, { ...init, signal });
    }
    const key = `${init?.method ?? "GET"} ${url}`;
    let first = made.get(key);
    if (!first) {
      first = fetcher(input, init);
      made.set(key, first);
      // A failed sign-in isn't kept, so a later token can try again.
      first.then((response) => (response.ok ? undefined : made.delete(key))).catch(() => made.delete(key));
    }
    return (await first).clone();
  }) as typeof fetch;
}

/** Sends each token on its own (20 at a time) and says what became of it. */
export async function relayTokens(
  account: ServiceAccount,
  targets: (string | RelayTarget)[],
  message: PushMessage,
  options: { fetcher?: typeof fetch; now?: Date; clock?: () => number; deadlineMs?: number; hardStopMs?: number; concurrency?: number; apnsTransport?: ApnsTransport } = {},
): Promise<PushRelayAnswer["body"]["results"]> {
  const tokens: RelayTarget[] = targets.map((t) => (typeof t === "string" ? { token: t, provider: "fcm" } : t));
  const stop = AbortSignal.timeout(options.hardStopMs ?? PUSH_RELAY_HARD_STOP_MS);
  const fetcher = sharedSignIn(options.fetcher ?? fetch, stop);
  const clock = options.clock ?? Date.now;
  const started = clock();
  const deadline = options.deadlineMs ?? PUSH_RELAY_DEADLINE_MS;
  // 136.46 Without the client's APNs key, Apple's tokens wait (sendPush would drop them): skipped, not retried.
  const statuses: PushRelayTokenStatus[] = tokens.map((t) => (t.provider === "apns" && !account.apns ? "skipped" : "retry"));
  let next = 0;
  const worker = async () => {
    while (next < tokens.length) {
      if (clock() - started > deadline) return;
      if (stop.aborted) return;
      const index = next++;
      if (statuses[index] === "skipped") continue;
      try {
        const target = tokens[index]!;
        const result = await sendPush(account, [target.provider === "apns" ? { token: target.token, provider: "apns" } : target.token], message, { fetcher, now: options.now, apnsTransport: options.apnsTransport });
        statuses[index] = result.sent > 0 ? "sent" : result.invalidTokens.length > 0 ? "invalid" : "retry";
      } catch {
        // Google's sign-in or the network failed: the site tries this one again.
        statuses[index] = "retry";
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency ?? PUSH_RELAY_CONCURRENCY, tokens.length) }, worker));
  return tokens.map((target, index) => ({ token: target.token, status: statuses[index] ?? "retry" }));
}

export interface PushRelayDeps {
  /** Decrypts the app's push credentials. */
  encryptionKey: Buffer;
  now: Date;
  fetcher?: typeof fetch;
  /** The app's push account: `serviceAccountOf` (Phase 1 gives Yallapp-mode apps the federated one). */
  accountOf?: (app: App, key: Buffer) => ServiceAccount | null;
  clock?: () => number;
  /** 136.46 Apple's HTTP/2 connection (tests give a fake). */
  apnsTransport?: ApnsTransport;
}

/** Checks the license, the app's push mode, the plan and the limits, then sends the batch. */
export async function relayPush(store: DataStore, request: PushRelayRequest, deps: PushRelayDeps): Promise<PushRelayAnswer | PushRelayFail> {
  const { now } = deps;
  const license = await store.getLicenseByHash(hashLicenseKey(request.site.licenseKey));
  const client = license ? await store.getClientById(license.clientId) : null;
  if (!license || !client) return fail(404, "license_not_found", "This license key doesn't exist. Check it in your Yallapp dashboard.");
  if (licenseState(client, license, now) !== "active") return fail(403, "license_inactive", "This license isn't active, so Yallapp can't send its notifications.");
  const activation = await store.getActivation(license.id);
  if (!activation || activation.siteUrl !== request.site.siteUrl || !(await licenseUsesSite(store, license))) {
    return fail(403, "license_inactive", "This license isn't active on this site.");
  }
  const app = license.appId ? await store.getAppById(license.appId) : null;
  if (!app) return fail(404, "not_found", "This license has no app yet.");
  const plans = await plansForApp(store, await effectivePlans(store), license, now);
  if (!plans[currentPlanId(license, now)]?.features.includes("push")) {
    return fail(403, "push_not_available", "Push notifications aren't on this app's plan.");
  }
  if (pushSetupOf(app) !== "yallapp") {
    return fail(409, "push_own_firebase", "This app sends notifications with its own Firebase, from the site. Check the license again to get the setting.");
  }

  const minute = await hitRateLimit(store, RATE_LIMITS.pushRelayLicense, license.id, now);
  if (!minute.allowed) return fail(429, "rate_limited", "Too many notification batches. Try again shortly.", { retry_after_seconds: minute.retryAfter });
  const hour = await hitRateLimit(store, RATE_LIMITS.pushRelayTokens, license.id, now, request.tokens.length);
  if (!hour.allowed) return fail(429, "rate_limited", "This site sent its notifications' hourly limit. Try again later.", { retry_after_seconds: hour.retryAfter });

  // Yallapp's Firebase: the app's project and push sender, no key (serviceAccountOf); null until the app is registered there.
  const account = (deps.accountOf ?? serviceAccountOf)(app, deps.encryptionKey);
  if (!account) return fail(503, "push_not_ready", "Yallapp is still setting up this app's notifications. Try again later.", { retry_after_seconds: 300 });

  // In a shared project, Android delivers only to this app's own package.
  const message = { ...request.message, restrictedPackage: app.androidPackage?.trim() || null };
  const results = await relayTokens(account, request.tokens, message, { fetcher: deps.fetcher, now, clock: deps.clock, apnsTransport: deps.apnsTransport });
  const count = (status: PushRelayTokenStatus) => results.filter((result) => result.status === status).length;
  const body = { results, sent: count("sent"), invalid: count("invalid"), retry: count("retry"), skipped: count("skipped") };
  if (body.sent > 0) await hitRateLimit(store, RATE_LIMITS.pushRelaySent, license.id, now, body.sent);
  return { status: 200, body };
}
