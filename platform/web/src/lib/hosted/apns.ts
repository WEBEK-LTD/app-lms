import { connect, constants, type ClientHttp2Session } from "node:http2";
import { createPrivateKey, randomUUID, sign, type KeyObject } from "node:crypto";
import type { PushMessage, PushResult } from "./push";

/**
 * 136.20–136.21 iPhone pushes sent straight to Apple (APNs, HTTP/2) with the
 * client's APNs auth key (.p8), for apps whose notifications Yallapp sets up
 * ("Yallapp" mode). No Firebase on the way: the app sends its APNs device
 * token (`PUT /me/push-token` with `provider: apns`) and `sendPush`
 * (lib/hosted/push.ts) hands those tokens here.
 *
 * - The provider token is an ES256 JWT (`kid` = Key ID, `iss` = Team ID),
 *   signed with node:crypto and reused for 40 minutes: Apple refuses tokens
 *   older than an hour and ones renewed more often than every 20 minutes.
 * - The payload has the same meaning as the FCM message: title, body,
 *   `data` (top-level keys, as FCM puts them), a sound, and `gcm.message_id`
 *   so the app's Firebase Messaging plugin treats a tap on it like one on an
 *   FCM push (it only reports taps on payloads that carry that key).
 * - Every build Yallapp makes is signed for the App Store (production
 *   `aps-environment`, build/fastlane/Fastfile). A development build's token
 *   is a sandbox token, which production answers with `BadDeviceToken`: such
 *   a token is tried once on the sandbox server before it's dropped.
 * - HTTP/2 goes through `ApnsTransport`, injectable for tests; the default
 *   uses node:http2, one connection per server for a batch.
 */

export type ApnsEnvironment = "production" | "sandbox";

export const APNS_ORIGINS: Record<ApnsEnvironment, string> = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
};

/** What the platform holds for one app: the key and the bundle IDs its apps send to. */
export interface ApnsCredentials {
  /** The 10-character Key ID of the APNs auth key. */
  keyId: string;
  /** The Apple Developer team's 10-character ID. */
  teamId: string;
  /** The .p8 file's PEM (PKCS#8, P-256). */
  privateKey: string;
  /** The customers' app's bundle ID (`apns-topic`). */
  bundleId: string;
  /** 112.3 Second apps' bundle IDs by role (courier, driver, vendor, staff); missing ones use `bundleId`. */
  roleBundleIds?: Partial<Record<string, string>>;
}

/** One APNs answer: the HTTP status and Apple's `reason`. */
export interface ApnsResponse {
  status: number;
  reason: string | null;
  /** The `apns-id` Apple gives the notification. */
  id?: string | null;
}

export interface ApnsRequest {
  /** The path, `/3/device/<token>`. */
  path: string;
  headers: Record<string, string>;
  body: string;
}

/** A connection to one APNs server; `close` ends it. */
export interface ApnsConnection {
  send(request: ApnsRequest): Promise<ApnsResponse>;
  close(): void;
}

/** Opens a connection to an APNs server. Injected in tests; node:http2 by default. */
export type ApnsTransport = (environment: ApnsEnvironment) => ApnsConnection;

const REQUEST_TIMEOUT_MS = 10_000;

/** node:http2 to the given servers (Apple's by default; a local one in tests), one session per server, closed by the caller. */
export function http2TransportFor(origins: Record<ApnsEnvironment, string> = APNS_ORIGINS): ApnsTransport {
  return (environment) => http2Connection(origins[environment]);
}

function http2Connection(origin: string): ApnsConnection {
  let session: ClientHttp2Session | null = null;
  const open = (): ClientHttp2Session => {
    if (session && !session.closed && !session.destroyed) return session;
    const next = connect(origin);
    // A session that fails is dropped; the next request opens another.
    next.on("error", () => {
      if (session === next) session = null;
    });
    next.on("goaway", () => {
      if (session === next) session = null;
    });
    session = next;
    return next;
  };
  return {
    send(request) {
      return new Promise<ApnsResponse>((resolve, reject) => {
        let stream;
        try {
          stream = open().request({
            [constants.HTTP2_HEADER_METHOD]: "POST",
            [constants.HTTP2_HEADER_PATH]: request.path,
            "content-type": "application/json",
            ...request.headers,
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        let status = 0;
        let id: string | null = null;
        const chunks: Buffer[] = [];
        stream.setTimeout(REQUEST_TIMEOUT_MS, () => stream.close(constants.NGHTTP2_CANCEL));
        stream.on("response", (headers) => {
          status = Number(headers[constants.HTTP2_HEADER_STATUS] ?? 0);
          const apnsId = headers["apns-id"];
          id = typeof apnsId === "string" ? apnsId : null;
        });
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("error", (error) => reject(error));
        stream.on("close", () => {
          if (status === 0) {
            reject(new Error("Apple's push server closed the request without answering."));
            return;
          }
          resolve({ status, reason: reasonOf(Buffer.concat(chunks).toString("utf8")), id });
        });
        stream.end(request.body);
      });
    },
    close() {
      session?.close();
      session = null;
    },
  };
}

/** The default transport: node:http2 to Apple. */
export const http2Transport: ApnsTransport = http2TransportFor();

function reasonOf(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { reason?: unknown };
    return typeof parsed.reason === "string" ? parsed.reason : null;
  } catch {
    return null;
  }
}

// The key

/** The Key ID in Apple's file name, `AuthKey_<KEYID>.p8`; null otherwise. */
export function keyIdFromFileName(name: string): string | null {
  const match = /^AuthKey_([A-Z0-9]{10})\.p8$/i.exec(name.trim().split(/[\\/]/).pop() ?? "");
  return match ? match[1]!.toUpperCase() : null;
}

/** Key IDs and Team IDs are 10 letters and digits. */
export const APPLE_ID_PATTERN = /^[A-Z0-9]{10}$/;

/** The key object of a .p8, or why it isn't an APNs key (an EC P-256 private key in PKCS#8 PEM). */
export function parseApnsKey(pem: string): { ok: true; key: KeyObject } | { ok: false; reason: "not_pem" | "not_p256" } {
  const text = pem.trim();
  if (!text.includes("-----BEGIN PRIVATE KEY-----")) return { ok: false, reason: "not_pem" };
  let key: KeyObject;
  try {
    key = createPrivateKey({ key: text, format: "pem" });
  } catch {
    return { ok: false, reason: "not_pem" };
  }
  if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") return { ok: false, reason: "not_p256" };
  return { ok: true, key };
}

/** The provider token Apple asks for: ES256, `kid` the Key ID, `iss` the Team ID, `iat` now. */
export function providerToken(credentials: Pick<ApnsCredentials, "keyId" | "teamId" | "privateKey">, now: Date): string {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: credentials.keyId })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({ iss: credentials.teamId, iat: Math.floor(now.getTime() / 1000) })).toString("base64url");
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), { key: createPrivateKey(credentials.privateKey), dsaEncoding: "ieee-p1363" });
  return `${header}.${claims}.${signature.toString("base64url")}`;
}

/** Provider tokens by team and key, renewed after 40 minutes (one per warm server). */
const providerTokens = new Map<string, { token: string; until: number }>();
const TOKEN_LIFETIME_MS = 40 * 60_000;

function cachedProviderToken(credentials: ApnsCredentials, now: Date, fresh = false): string {
  const key = `${credentials.teamId}:${credentials.keyId}`;
  const kept = providerTokens.get(key);
  if (!fresh && kept && kept.until > now.getTime()) return kept.token;
  const token = providerToken(credentials, now);
  providerTokens.set(key, { token, until: now.getTime() + TOKEN_LIFETIME_MS });
  return token;
}

/** Forgets the kept provider tokens (tests). */
export function forgetApnsTokens(): void {
  providerTokens.clear();
}

// Checking a key

/** What Apple said about a key: accepted, or why not. */
export type ApnsKeyCheck =
  | { ok: true; environment: ApnsEnvironment; status: number; reason: string | null }
  | {
      ok: false;
      /** `rejected`: InvalidProviderToken (wrong Key ID, Team ID or key). `sandbox_only`: the key only works on the sandbox server. `topic`: the team doesn't own the bundle ID. `unreachable`: no answer from Apple. `unexpected`: another answer. */
      problem: "rejected" | "sandbox_only" | "topic" | "unreachable" | "unexpected";
      status: number | null;
      reason: string | null;
    };

/** A device token no device has: Apple checks the provider token and topic first, then says `BadDeviceToken`. */
export const PROBE_DEVICE_TOKEN = "0".repeat(64);

function probe(credentials: ApnsCredentials, now: Date): ApnsRequest {
  return {
    path: `/3/device/${PROBE_DEVICE_TOKEN}`,
    headers: {
      authorization: `bearer ${providerToken(credentials, now)}`,
      "apns-topic": credentials.bundleId,
      "apns-push-type": "background",
      "apns-priority": "5",
      "apns-expiration": "0",
    },
    body: JSON.stringify({ aps: { "content-available": 1 } }),
  };
}

async function answerOf(transport: ApnsTransport, environment: ApnsEnvironment, request: ApnsRequest): Promise<ApnsResponse | null> {
  const connection = transport(environment);
  try {
    return await connection.send(request);
  } catch {
    return null;
  } finally {
    connection.close();
  }
}

/** Answers that mean Apple accepted the provider token and the topic: only the (made-up) device token is wrong. */
const ACCEPTED_REASONS = new Set(["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"]);

/**
 * Whether Apple accepts the key for the bundle ID: one push of nothing
 * (`content-available`, no alert) to a device token no phone has. Nothing
 * reaches anyone. `BadDeviceToken` means the key, Key ID, Team ID and topic
 * are right; `InvalidProviderToken` means they aren't. A key Apple refuses on
 * the production server is tried on the sandbox one, to tell a key made for
 * Sandbox only.
 */
export async function checkApnsKey(credentials: ApnsCredentials, options: { transport?: ApnsTransport; now?: Date } = {}): Promise<ApnsKeyCheck> {
  const transport = options.transport ?? http2Transport;
  const now = options.now ?? new Date();
  const production = await answerOf(transport, "production", probe(credentials, now));
  if (!production) return { ok: false, problem: "unreachable", status: null, reason: null };
  const verdict = verdictOf(production, "production");
  if (verdict.ok || verdict.problem !== "rejected") return verdict;
  const sandbox = await answerOf(transport, "sandbox", probe(credentials, now));
  if (sandbox && verdictOf(sandbox, "sandbox").ok) return { ok: false, problem: "sandbox_only", status: production.status, reason: production.reason };
  return verdict;
}

function verdictOf(answer: ApnsResponse, environment: ApnsEnvironment): ApnsKeyCheck {
  if (answer.status === 200 || (answer.reason && ACCEPTED_REASONS.has(answer.reason))) return { ok: true, environment, status: answer.status, reason: answer.reason };
  if (answer.reason === "InvalidProviderToken" || answer.reason === "ExpiredProviderToken" || answer.reason === "MissingProviderToken") {
    return { ok: false, problem: "rejected", status: answer.status, reason: answer.reason };
  }
  if (answer.reason === "TopicDisallowed" || answer.reason === "BadTopic" || answer.reason === "MissingTopic") return { ok: false, problem: "topic", status: answer.status, reason: answer.reason };
  return { ok: false, problem: "unexpected", status: answer.status, reason: answer.reason };
}

// Sending

/** A device token sent to APNs, with the role of the app that registered it (its bundle ID). */
export interface ApnsTarget {
  token: string;
  role?: string | null;
}

/** APNs device tokens are hex: 64 characters today, up to 200 allowed. */
const DEVICE_TOKEN = /^[0-9a-f]{64,200}$/i;

/** FCM keeps a message for 4 weeks by default; APNs keeps it as long. */
const KEEP_SECONDS = 28 * 86_400;

/** Notifications at the same time, on one HTTP/2 connection. */
const CONCURRENCY = 20;

/** The APNs payload with the FCM message's meaning: `aps` with the alert and a sound, and `data` at the top level as FCM puts it. */
export function apnsPayload(message: PushMessage, messageId: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(message.data)) {
    // `aps` is Apple's, and `gcm.*` / `google.*` are the Firebase plugin's own.
    if (key === "aps" || key.startsWith("gcm.") || key.startsWith("google.")) continue;
    data[key] = value;
  }
  return {
    ...data,
    aps: { alert: { title: message.title, body: message.body }, sound: "default" },
    // Firebase Messaging on the phone reports taps (onMessageOpenedApp, getInitialMessage) only for payloads with this key.
    "gcm.message_id": messageId,
  };
}

/** 184.6 A ringing call is no use later: PushKit keeps it 30 seconds. */
const VOIP_KEEP_SECONDS = 30;

/** 184.6 PushKit's payload: the call's data for CallKit (who's calling, the call), no alert. */
export function voipPayload(message: PushMessage): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(message.data)) if (key !== "aps") data[key] = value;
  return { ...data, title: message.title, body: message.body, aps: {} };
}

function topicOf(credentials: ApnsCredentials, role: string | null | undefined): string {
  return (role && credentials.roleBundleIds?.[role]) || credentials.bundleId;
}

/**
 * Sends one message to APNs device tokens. 200 counts as sent; 410
 * (`Unregistered`, `ExpiredToken`) and `BadDeviceToken` (after the sandbox
 * try) put the token in `invalidTokens`, which the caller forgets. 429 and
 * 5xx leave the token as it is, like a failed FCM send: it gets the next
 * push. A refused provider token stops the batch (the key was revoked).
 */
export async function sendApnsPush(
  credentials: ApnsCredentials,
  targets: ApnsTarget[],
  message: PushMessage,
  /** 184.6 `voip`: a call for PushKit (push type `voip`, the app's `.voip` topic, kept 30 seconds), which the app reports to CallKit at once. */
  options: { transport?: ApnsTransport; now?: Date; voip?: boolean } = {},
): Promise<PushResult & { failed: number; keyRefused: boolean }> {
  const result = { sent: 0, invalidTokens: [] as string[], failed: 0, keyRefused: false };
  const transport = options.transport ?? http2Transport;
  const now = options.now ?? new Date();
  const valid: ApnsTarget[] = [];
  for (const target of targets) {
    if (DEVICE_TOKEN.test(target.token)) valid.push(target);
    else if (target.token) result.invalidTokens.push(target.token);
  }
  if (valid.length === 0) return result;
  const connections = new Map<ApnsEnvironment, ApnsConnection>();
  const connection = (environment: ApnsEnvironment) => {
    let open = connections.get(environment);
    if (!open) connections.set(environment, (open = transport(environment)));
    return open;
  };
  let token = cachedProviderToken(credentials, now);
  let renewed = false;
  const expiration = String(Math.floor(now.getTime() / 1000) + (options.voip ? VOIP_KEEP_SECONDS : KEEP_SECONDS));
  const request = (target: ApnsTarget): ApnsRequest => {
    const payload = options.voip ? voipPayload(message) : apnsPayload(message, randomUUID());
    return {
      path: `/3/device/${target.token.toLowerCase()}`,
      headers: {
        authorization: `bearer ${token}`,
        "apns-topic": options.voip ? `${topicOf(credentials, target.role)}.voip` : topicOf(credentials, target.role),
        "apns-push-type": options.voip ? "voip" : "alert",
        "apns-priority": "10",
        "apns-expiration": expiration,
      },
      body: JSON.stringify(payload),
    };
  };
  const attempt = async (environment: ApnsEnvironment, target: ApnsTarget): Promise<ApnsResponse | null> => {
    try {
      return await connection(environment).send(request(target));
    } catch {
      return null;
    }
  };
  const deliver = async (target: ApnsTarget): Promise<void> => {
    if (result.keyRefused) return;
    let answer = await attempt("production", target);
    // An old kept token (another server renewed it): sign a new one once.
    if (answer?.reason === "ExpiredProviderToken") {
      if (!renewed) {
        renewed = true;
        token = cachedProviderToken(credentials, new Date(), true);
      }
      answer = await attempt("production", target);
    }
    // A development build's token: the sandbox server knows it.
    if (answer?.status === 400 && answer.reason === "BadDeviceToken") answer = await attempt("sandbox", target);
    if (!answer) {
      result.failed += 1;
    } else if (answer.status === 200) {
      result.sent += 1;
    } else if (answer.status === 410 || answer.reason === "BadDeviceToken" || answer.reason === "DeviceTokenNotForTopic") {
      result.invalidTokens.push(target.token);
    } else if (answer.status === 403 && (answer.reason === "InvalidProviderToken" || answer.reason === "ExpiredProviderToken")) {
      result.keyRefused = true;
      result.failed += 1;
    } else {
      // 429 TooManyRequests, 5xx: the token stays; the next push tries again.
      result.failed += 1;
    }
  };
  try {
    for (let i = 0; i < valid.length; i += CONCURRENCY) {
      await Promise.all(valid.slice(i, i + CONCURRENCY).map(deliver));
      if (result.keyRefused) break;
    }
  } finally {
    for (const open of connections.values()) open.close();
  }
  return result;
}
