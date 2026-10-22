import { createSign } from "node:crypto";
import type { PushProvider } from "../data/types";

/**
 * Firebase Cloud Messaging (HTTP v1) with the client's service account, as
 * the plugin's Push_Service does: the same message shape, so the app handles
 * pushes from either the same way. 36 Tokens from Huawei phones without
 * Google Play go through Huawei Push Kit (server API v1) with the app's ID
 * and app secret, when the client saved them.
 */

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  /** 36 Huawei Push Kit, for "hms" tokens; without it those tokens are skipped. */
  hms?: HmsCredentials | null;
}

/** 36 Huawei Push Kit: the app ID and app secret from AppGallery Connect. */
export interface HmsCredentials {
  app_id: string;
  app_secret: string;
}

/** A device token and the service it's from (a bare string is a Firebase token). */
export type PushTarget = string | { token: string; provider?: PushProvider | null };

/** The service account fields FCM needs, or null when the JSON isn't one. */
export function parseServiceAccount(json: string): ServiceAccount | null {
  try {
    const value = JSON.parse(json) as Partial<ServiceAccount> & { type?: string };
    if (
      typeof value.project_id === "string" &&
      typeof value.client_email === "string" &&
      typeof value.private_key === "string" &&
      value.private_key.includes("PRIVATE KEY")
    ) {
      return { project_id: value.project_id, client_email: value.client_email, private_key: value.private_key };
    }
  } catch {
    // Not JSON.
  }
  return null;
}

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface PushResult {
  sent: number;
  /** Tokens Firebase says no longer exist; the caller forgets them. */
  invalidTokens: string[];
}

type Fetch = typeof fetch;

function signedAssertion(account: ServiceAccount, nowSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  ).toString("base64url");
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key, "base64url");
  return `${header}.${claims}.${signature}`;
}

async function accessToken(account: ServiceAccount, fetcher: Fetch, now: Date): Promise<string> {
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedAssertion(account, Math.floor(now.getTime() / 1000)),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string };
  if (!response.ok || !body.access_token) throw new Error(`Google sign-in for push failed (HTTP ${response.status}).`);
  return body.access_token;
}

/** 80.1 Whether Google accepts the Firebase service account: a token for sending is asked for, nothing is sent. Throws why not. */
export async function checkFirebaseAccount(account: ServiceAccount, options: { fetcher?: Fetch; now?: Date } = {}): Promise<void> {
  await accessToken(account, options.fetcher ?? fetch, options.now ?? new Date());
}

/** 80.1 Whether Huawei accepts the Push Kit app ID and secret, the same way. Throws why not. */
export async function checkHmsCredentials(credentials: HmsCredentials, options: { fetcher?: Fetch } = {}): Promise<void> {
  await hmsAccessToken(credentials, options.fetcher ?? fetch);
}

/** The target of a hosted device: a Firebase token as it is, a Huawei token with its provider. */
export function pushTarget(device: { pushToken: string | null; pushProvider?: PushProvider | null }): PushTarget {
  const token = device.pushToken ?? "";
  return device.pushProvider === "hms" ? { token, provider: "hms" } : token;
}

/**
 * Sends one message to each token: Firebase tokens through FCM, 36 Huawei
 * tokens through Push Kit (only when the account has Push Kit credentials).
 */
export async function sendPush(
  account: ServiceAccount,
  targets: PushTarget[],
  message: PushMessage,
  options: { fetcher?: Fetch; now?: Date } = {},
): Promise<PushResult> {
  const result: PushResult = { sent: 0, invalidTokens: [] };
  const fetcher = options.fetcher ?? fetch;
  const tokens: string[] = [];
  const hmsTokens: string[] = [];
  for (const target of targets) {
    const token = typeof target === "string" ? target : target.token;
    if (!token) continue;
    if (typeof target !== "string" && target.provider === "hms") hmsTokens.push(token);
    else tokens.push(token);
  }
  if (hmsTokens.length > 0 && account.hms) {
    const hms = await sendHmsPush(account.hms, hmsTokens, message, { fetcher });
    result.sent += hms.sent;
    result.invalidTokens.push(...hms.invalidTokens);
  }
  if (tokens.length === 0) return result;
  const token = await accessToken(account, fetcher, options.now ?? new Date());
  const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`;
  for (const deviceToken of tokens) {
    const response = await fetcher(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: message.title, body: message.body },
          data: message.data,
          android: { priority: "high" },
          apns: { payload: { aps: { sound: "default" } } },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      result.sent += 1;
    } else if (response.status === 404 || (await response.text().catch(() => "")).includes("UNREGISTERED")) {
      result.invalidTokens.push(deviceToken);
    }
  }
  return result;
}

// 36 Huawei Push Kit (server API v1)

export const HMS_TOKEN_URL = "https://oauth-login.cloud.huawei.com/oauth2/v3/token";
export const HMS_PUSH_URL = "https://push-api.cloud.huawei.com/v1";
/** Push Kit takes up to 1,000 tokens per request. */
const HMS_BATCH = 1000;

async function hmsAccessToken(credentials: HmsCredentials, fetcher: Fetch): Promise<string> {
  const response = await fetcher(HMS_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: credentials.app_id, client_secret: credentials.app_secret }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string };
  if (!response.ok || !body.access_token) throw new Error(`Huawei sign-in for push failed (HTTP ${response.status}).`);
  return body.access_token;
}

/**
 * The Push Kit message: a notification that opens the app, with the same
 * `data` as the FCM message (as a JSON string, which Push Kit requires). The
 * app reads it from the notification it was opened from.
 */
export function hmsMessage(tokens: string[], message: PushMessage) {
  return {
    validate_only: false,
    message: {
      data: JSON.stringify(message.data),
      notification: { title: message.title, body: message.body },
      android: {
        urgency: "HIGH",
        notification: { title: message.title, body: message.body, default_sound: true, click_action: { type: 3 } },
      },
      token: tokens,
    },
  };
}

/** Tokens Push Kit refused, from a partly successful answer (80100000: the message lists them). */
function illegalTokens(msg: unknown): string[] {
  if (typeof msg !== "string") return [];
  try {
    const parsed = JSON.parse(msg) as { illegal_tokens?: unknown };
    return Array.isArray(parsed.illegal_tokens) ? parsed.illegal_tokens.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/** Sends one message to Huawei tokens, in batches of 1,000. */
export async function sendHmsPush(credentials: HmsCredentials, tokens: string[], message: PushMessage, options: { fetcher?: Fetch } = {}): Promise<PushResult> {
  const result: PushResult = { sent: 0, invalidTokens: [] };
  if (tokens.length === 0) return result;
  const fetcher = options.fetcher ?? fetch;
  const token = await hmsAccessToken(credentials, fetcher);
  const url = `${HMS_PUSH_URL}/${encodeURIComponent(credentials.app_id)}/messages:send`;
  for (let i = 0; i < tokens.length; i += HMS_BATCH) {
    const batch = tokens.slice(i, i + HMS_BATCH);
    const response = await fetcher(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=UTF-8" },
      body: JSON.stringify(hmsMessage(batch, message)),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => ({}))) as { code?: string; msg?: unknown };
    if (body.code === "80000000") {
      result.sent += batch.length;
    } else if (body.code === "80100000") {
      // Some tokens were refused: the others got it.
      const refused = illegalTokens(body.msg);
      result.sent += batch.length - refused.length;
      result.invalidTokens.push(...refused);
    } else if (body.code === "80300007") {
      // All the tokens are invalid.
      result.invalidTokens.push(...batch);
    }
  }
  return result;
}
