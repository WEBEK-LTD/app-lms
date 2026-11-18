import type { ContactTwilioCheck, TwilioProblem } from "../data/types";

/**
 * 184.5 The app owner's own Twilio account, spoken to over Twilio's REST API
 * (https://api.twilio.com/2010-04-01). The owner pays Twilio directly:
 * Yallapp never pays, resells or sees the bill. Everything here takes the
 * `fetch` to use, so tests answer for Twilio and no real call is ever placed.
 *
 * Nothing here logs: the secret, the numbers and Twilio's answers never reach
 * a log line.
 */

export const TWILIO_API = "https://api.twilio.com/2010-04-01";

/** What the server signs in to Twilio with: the account's SID and an API key (or the auth token), opened only here. */
export interface TwilioCredentials {
  accountSid: string;
  /** An API key's SID (SK…); null: `secret` is the account's auth token. */
  keySid: string | null;
  secret: string;
}

/** A balance below this (in the account's currency) is too low to place calls. */
export const LOW_BALANCE = 1;

const auth = (c: TwilioCredentials) => `Basic ${Buffer.from(`${c.keySid ?? c.accountSid}:${c.secret}`).toString("base64")}`;

type Answer = { ok: true; status: number; body: Record<string, unknown> } | { ok: false; status: number; code: number | null };

async function twilio(fetcher: typeof fetch, c: TwilioCredentials, method: "GET" | "POST", path: string, form?: Record<string, string | string[]>): Promise<Answer> {
  let body: URLSearchParams | undefined;
  if (form) {
    body = new URLSearchParams();
    for (const [k, v] of Object.entries(form)) for (const one of Array.isArray(v) ? v : [v]) body.append(k, one);
  }
  let response: Response;
  try {
    response = await fetcher(`${TWILIO_API}/Accounts/${encodeURIComponent(c.accountSid)}${path}`, {
      method,
      headers: { authorization: auth(c), accept: "application/json", ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, status: 0, code: null };
  }
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) return { ok: false, status: response.status, code: typeof json.code === "number" ? json.code : null };
  return { ok: true, status: response.status, body: json };
}

/** Twilio's error codes, as the few things an owner can put right (https://www.twilio.com/docs/api/errors). */
export function problemOf(answer: { status: number; code: number | null }): TwilioProblem {
  if (answer.status === 401 || answer.code === 20003) return "auth";
  if (answer.code === 20005 || answer.code === 10001 || answer.code === 20008) return "account_inactive";
  if (answer.code === 21219 || answer.code === 21608) return "trial";
  if (answer.code === 21210 || answer.code === 21212 || answer.code === 21606) return "number_not_owned";
  if (answer.code === 21215 || answer.code === 13227) return "geo_blocked";
  if (answer.code === 21214 || answer.code === 21217 || answer.code === 21211 || answer.code === 13224) return "unreachable";
  if (answer.code === 20429 || answer.code === 30044) return "low_balance";
  return "unknown";
}

/** Problems that are the owner's account's, not one call's: they pause phone calls until a test passes. */
export const ACCOUNT_PROBLEMS: TwilioProblem[] = ["auth", "account_inactive", "number_not_owned", "number_no_voice", "low_balance", "trial"];

/**
 * Test the connection: the account (the key works, it's active, not a trial), the number (one of the
 * account's, able to make calls), the balance (above USD 1 or its equal), and, for app calls through
 * the owner's relay, Network Traversal (a token for one minute).
 */
export async function testTwilio(fetcher: typeof fetch, c: TwilioCredentials, number: string, options: { relay: boolean; now: Date }): Promise<ContactTwilioCheck> {
  const checks: ContactTwilioCheck["checks"] = [];
  let balance: ContactTwilioCheck["balance"] = null;
  const done = (): ContactTwilioCheck => {
    const first = checks.find((x) => !x.ok && x.name !== "relay") ?? checks.find((x) => !x.ok);
    return { at: options.now, ok: checks.every((x) => x.ok || x.name === "relay"), problem: first?.problem ?? null, checks, balance };
  };

  const account = await twilio(fetcher, c, "GET", ".json");
  if (!account.ok) {
    checks.push({ name: "account", ok: false, problem: account.status === 0 ? "unknown" : problemOf(account) === "unknown" && account.status === 404 ? "auth" : problemOf(account) });
    return done();
  }
  const status = String(account.body.status ?? "");
  const trial = String(account.body.type ?? "").toLowerCase() === "trial";
  checks.push(status !== "active" ? { name: "account", ok: false, problem: "account_inactive" } : trial ? { name: "account", ok: false, problem: "trial" } : { name: "account", ok: true });

  const numbers = await twilio(fetcher, c, "GET", `/IncomingPhoneNumbers.json?${new URLSearchParams({ PhoneNumber: number, PageSize: "1" })}`);
  if (!numbers.ok) checks.push({ name: "number", ok: false, problem: problemOf(numbers) });
  else {
    const found = (numbers.body.incoming_phone_numbers as { phone_number?: string; capabilities?: { voice?: boolean } }[] | undefined)?.find((n) => n.phone_number === number);
    checks.push(!found ? { name: "number", ok: false, problem: "number_not_owned" } : found.capabilities?.voice === false ? { name: "number", ok: false, problem: "number_no_voice" } : { name: "number", ok: true });
  }

  const money = await twilio(fetcher, c, "GET", "/Balance.json");
  if (money.ok && typeof money.body.balance === "string") {
    balance = { amount: money.body.balance, currency: String(money.body.currency ?? "USD") };
    checks.push(Number(money.body.balance) < LOW_BALANCE ? { name: "balance", ok: false, problem: "low_balance" } : { name: "balance", ok: true });
  }
  // A key that can't read the balance isn't a problem: Twilio says so on the first call it can't pay for.

  if (options.relay) {
    const token = await twilio(fetcher, c, "POST", "/Tokens.json", { Ttl: "60" });
    checks.push(token.ok && Array.isArray(token.body.ice_servers) ? { name: "relay", ok: true } : { name: "relay", ok: false, problem: "relay_unavailable" });
  }
  return done();
}

/** XML's five, for the words and numbers in the call's instructions. */
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Twilio's voices for the words the caller hears first (Amazon Polly through Twilio, billed to the owner as part of the call). */
const VOICES: Record<string, { voice: string; language: string }> = {
  en: { voice: "Polly.Joanna", language: "en-US" },
  ar: { voice: "Polly.Zeina", language: "arb" },
  tr: { voice: "Polly.Filiz", language: "tr-TR" },
};

export interface BridgeCall {
  /** The caller's own number, rung first. */
  ring: string;
  /** The other side's number, dialled once the caller answers. */
  connect: string;
  /** The owner's Twilio number: both phones see it. */
  from: string;
  /** What the caller hears before the other side rings ("Connecting you to Karim, your courier."). */
  say: string;
  lang: "en" | "ar" | "tr";
  /** Twilio tells these how the two legs went (lib/contact/phone-call.ts). */
  callerStatusUrl: string;
  dialResultUrl: string;
}

/** The call's instructions: say who it is, then dial the other side from the owner's number; no recording. */
export function bridgeTwiml(call: Pick<BridgeCall, "connect" | "from" | "say" | "lang" | "dialResultUrl">): string {
  const v = VOICES[call.lang] ?? VOICES.en!;
  return (
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Say voice="${v.voice}" language="${v.language}">${xml(call.say)}</Say>` +
    `<Dial callerId="${xml(call.from)}" timeout="30" record="do-not-record" action="${xml(call.dialResultUrl)}" method="POST"><Number>${xml(call.connect)}</Number></Dial>` +
    `</Response>`
  );
}

/**
 * The click-to-call bridge: Twilio rings the caller from the owner's number and, once they answer,
 * dials the other side from it, so each phone shows the owner's number and never the other's.
 */
export async function placeBridgeCall(fetcher: typeof fetch, c: TwilioCredentials, call: BridgeCall): Promise<{ ok: true; sid: string } | { ok: false; problem: TwilioProblem }> {
  const answer = await twilio(fetcher, c, "POST", "/Calls.json", {
    To: call.ring,
    From: call.from,
    Twiml: bridgeTwiml(call),
    Timeout: "30",
    StatusCallback: call.callerStatusUrl,
    StatusCallbackMethod: "POST",
    StatusCallbackEvent: ["ringing", "answered", "completed"],
    Record: "false",
  });
  if (!answer.ok) return { ok: false, problem: answer.status === 0 ? "unknown" : problemOf(answer) };
  const sid = answer.body.sid;
  return typeof sid === "string" ? { ok: true, sid } : { ok: false, problem: "unknown" };
}

/** 184.6 Short-lived ICE servers (STUN and TURN) for one app call, from the owner's Network Traversal Service. */
export async function relayServers(fetcher: typeof fetch, c: TwilioCredentials, ttlSeconds = 3600): Promise<{ urls: string | string[]; username?: string; credential?: string }[] | null> {
  const answer = await twilio(fetcher, c, "POST", "/Tokens.json", { Ttl: String(ttlSeconds) });
  if (!answer.ok || !Array.isArray(answer.body.ice_servers)) return null;
  return (answer.body.ice_servers as { urls?: unknown; url?: unknown; username?: unknown; credential?: unknown }[])
    .map((s) => ({
      urls: (typeof s.urls === "string" || Array.isArray(s.urls) ? s.urls : s.url) as string | string[],
      ...(typeof s.username === "string" ? { username: s.username } : {}),
      ...(typeof s.credential === "string" ? { credential: s.credential } : {}),
    }))
    .filter((s) => s.urls);
}
