import { createSign } from "node:crypto";

/**
 * Firebase Cloud Messaging (HTTP v1) with the client's service account, as
 * the plugin's Push_Service does: the same message shape, so the app handles
 * pushes from either the same way.
 */

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

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

/** Sends one message to each token. */
export async function sendPush(
  account: ServiceAccount,
  tokens: string[],
  message: PushMessage,
  options: { fetcher?: Fetch; now?: Date } = {},
): Promise<PushResult> {
  const result: PushResult = { sent: 0, invalidTokens: [] };
  if (tokens.length === 0) return result;
  const fetcher = options.fetcher ?? fetch;
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
