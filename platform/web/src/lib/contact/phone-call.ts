import type { Lang } from "@/i18n/config";
import { signUrl, verifySignedUrl } from "../crypto/signed-url";
import type { DataStore } from "../data/store";
import type { App, ContactCall, ContactCallStatus, ContactSettings, TwilioProblem } from "../data/types";
import { asLang } from "../delivery/notify";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { phoneCallsReady, twilioCredentials } from "./settings";
import { firstName, onItsWay, type Thread } from "./thread";
import { ACCOUNT_PROBLEMS, placeBridgeCall } from "./twilio";

/**
 * 184.5 The masked phone call: the app's button asks the server, Twilio
 * rings the caller from the app owner's Twilio number and, once they answer,
 * dials the other side from the same number. Each phone shows the owner's
 * number; neither person's number reaches the other, the app, or the call's
 * log. It works only while the order is on its way, and nothing is recorded.
 *
 * Twilio tells `/api/contact/twilio` how the two legs went, at an address
 * signed for two hours (lib/crypto/signed-url.ts). A failure that's the
 * account's (the key, the number, the balance) pauses phone calls for the
 * app until Test the connection passes again: customers and couriers see
 * chat instead, and Settings › Calls says why.
 */

export interface CallDeps {
  store: DataStore;
  app: App;
  /** The platform's encryption key (the owner's Twilio secret). */
  key: Buffer;
  fetcher: typeof fetch;
  /** The platform's address, for Twilio's callbacks. */
  platformUrl: string;
  /** Signs the callbacks' addresses. */
  secret: string;
}

export const CALLBACK_PATH = "/api/contact/twilio";
const CALLBACK_SECONDS = 2 * 60 * 60;
/** 5 calls in 10 minutes per side of a job. */
const CALL_LIMIT: RateLimitRule = { name: "contact_phone_call", limit: 5, windowSeconds: 600 };

type Result = { status: number; body?: unknown };
const fail = (status: number, code: string, message: string): Result => ({ status, body: { code, message } });

/** The words the caller hears first: the other side's first name and role, in the caller's language. */
const SAY: Record<"customer" | "courier", Record<Lang, (name: string) => string>> = {
  // The customer calls the courier.
  customer: { en: (n) => `Connecting you to ${n}, your courier.`, ar: (n) => `جارٍ وصلك بـ${n}، مندوب التوصيل.`, tr: (n) => `Kuryeniz ${n} ile bağlanıyorsunuz.` },
  // The courier calls the customer.
  courier: { en: (n) => `Connecting you to ${n}, your customer.`, ar: (n) => `جارٍ وصلك بـ${n}، العميل.`, tr: (n) => `Müşteriniz ${n} ile bağlanıyorsunuz.` },
};

/** What the app is told when a call can't be placed, in plain words. The owner's own words for each are in Settings › Calls. */
const PROBLEM_WORDS: Partial<Record<TwilioProblem, string>> = {
  unreachable: "That phone can't be reached right now. Write in the chat instead.",
  geo_blocked: "Calls to that country aren't open. Write in the chat instead.",
};
const UNAVAILABLE = "Phone calls aren't available right now. Write in the chat instead.";

export function callJson(call: ContactCall, settings: ContactSettings) {
  return {
    id: call.id,
    kind: call.kind,
    caller: call.caller,
    status: call.status,
    // The number the caller's phone rings from: the owner's own, never the other side's.
    ring_from: call.kind === "phone" ? (settings.twilio?.number ?? null) : null,
    duration_seconds: call.durationSeconds,
    created_at: call.createdAt.toISOString(),
    ended_at: call.endedAt?.toISOString() ?? null,
  };
}

/** The two numbers: the caller's own (rung first) and the other side's. */
async function numbersOf(deps: CallDeps, thread: Thread): Promise<{ caller: string | null; other: string | null }> {
  const customer = thread.job.userId !== null ? await deps.store.getHostedUser(deps.app.id, thread.job.userId) : null;
  // The customer's own account's number only: a job's sender is a place for a marketplace order, and a parcel's recipient is someone else.
  const customerPhone = customer?.phone ?? null;
  const courierPhone = thread.courier.phone;
  return thread.side === "customer" ? { caller: customerPhone, other: courierPhone } : { caller: courierPhone, other: customerPhone };
}

/** Starts a masked phone call from this side of the thread. */
export async function startPhoneCall(deps: CallDeps, thread: Thread, settings: ContactSettings, now: Date, lang: string | null | undefined): Promise<Result> {
  if (!phoneCallsReady(settings) || !onItsWay(thread.job)) return fail(409, "phone_call_unavailable", UNAVAILABLE);
  const { caller, other } = await numbersOf(deps, thread);
  if (!caller) return fail(409, "no_phone", "Add a mobile number to your account to call. Write in the chat instead.");
  if (!other) return fail(409, "phone_call_unavailable", UNAVAILABLE);
  const limit = await hitRateLimit(deps.store, CALL_LIMIT, `${deps.app.id}:${thread.job.id}:${thread.side}`, now);
  if (!limit.allowed) return fail(429, "rate_limited", "Too many calls. Wait a few minutes, or write in the chat.");
  const call = await deps.store.createContactCall({
    appId: deps.app.id,
    shipmentId: thread.job.id,
    courierId: thread.courier.id,
    kind: "phone",
    caller: thread.side,
    status: "calling",
    providerSid: null,
    problem: null,
    durationSeconds: null,
    createdAt: now,
    answeredAt: null,
    endedAt: null,
  });
  const url = (leg: "caller" | "dial") => signUrl(deps.platformUrl, CALLBACK_PATH, { app: deps.app.id, call: String(call.id), leg }, deps.secret, CALLBACK_SECONDS, now);
  const words = asLang(lang) ?? "en";
  const otherName = thread.side === "customer" ? firstName(thread.courier.name) : firstName(thread.job.recipientName);
  let placed: Awaited<ReturnType<typeof placeBridgeCall>>;
  try {
    const credentials = twilioCredentials(deps.app.id, settings.twilio, deps.key)!;
    placed = await placeBridgeCall(deps.fetcher, credentials, {
      ring: caller,
      connect: other,
      from: settings.twilio!.number,
      say: SAY[thread.side][words](otherName),
      lang: words,
      callerStatusUrl: url("caller"),
      dialResultUrl: url("dial"),
    });
  } catch {
    // The secret couldn't be opened (a key that was changed without ENCRYPTION_KEY_OLD): the account's problem.
    placed = { ok: false, problem: "auth" };
  }
  if (!placed.ok) {
    await deps.store.updateContactCall(deps.app.id, call.id, { status: "failed", problem: placed.problem, endedAt: now });
    if (ACCOUNT_PROBLEMS.includes(placed.problem)) await pausePhoneCalls(deps.store, deps.app.id, placed.problem, now);
    return fail(503, "phone_call_failed", PROBLEM_WORDS[placed.problem] ?? UNAVAILABLE);
  }
  await deps.store.updateContactCall(deps.app.id, call.id, { providerSid: placed.sid });
  return { status: 202, body: callJson({ ...call, providerSid: placed.sid }, settings) };
}

/** Phone calls stop for the app until Test the connection passes; the dashboard says why. */
export async function pausePhoneCalls(store: DataStore, appId: string, problem: TwilioProblem, now: Date): Promise<void> {
  const saved = await store.getContactSettings(appId);
  if (!saved || saved.phonePausedAt) return;
  await store.saveContactSettings({
    ...saved,
    phonePausedAt: now,
    twilioCheck: { at: now, ok: false, problem, checks: saved.twilioCheck?.checks ?? [], balance: saved.twilioCheck?.balance ?? null },
    updatedAt: now,
  });
}

/** Twilio's call states, as the call's log keeps them. */
const CALLER_STATES: Record<string, ContactCallStatus> = { queued: "calling", initiated: "calling", ringing: "ringing", "in-progress": "connected", busy: "busy", "no-answer": "no_answer", failed: "failed", canceled: "cancelled" };
const DIAL_STATES: Record<string, ContactCallStatus> = { completed: "completed", answered: "completed", busy: "busy", "no-answer": "no_answer", failed: "failed", canceled: "cancelled" };
const ENDED: ContactCallStatus[] = ["completed", "no_answer", "busy", "failed", "cancelled"];

/**
 * Twilio's callbacks for a call: the caller's leg (`leg=caller`: ringing, answered, ended) and the
 * other side's (`leg=dial`: how the bridge went, and how long). Only at an address this server signed.
 * Answers TwiML for the dial leg (nothing more is said or done).
 */
export async function handleTwilioCallback(store: DataStore, url: URL, form: URLSearchParams, secret: string, now: Date): Promise<{ status: number; body: string; type: string }> {
  const twiml = { status: 200, body: `<?xml version="1.0" encoding="UTF-8"?><Response/>`, type: "text/xml" };
  if (verifySignedUrl(url, secret, now) !== "valid") return { status: 403, body: "", type: "text/plain" };
  const appId = url.searchParams.get("app") ?? "";
  const id = Number(url.searchParams.get("call"));
  const leg = url.searchParams.get("leg");
  const call = Number.isInteger(id) ? await store.getContactCall(appId, id) : null;
  if (!call) return twiml;
  // Only the call Twilio placed for it.
  const sid = form.get("CallSid") ?? form.get("ParentCallSid");
  if (call.providerSid && sid && sid !== call.providerSid && form.get("ParentCallSid") !== call.providerSid) return twiml;
  if (leg === "dial") {
    const status = DIAL_STATES[form.get("DialCallStatus") ?? ""] ?? "failed";
    const duration = Number(form.get("DialCallDuration"));
    await store.updateContactCall(appId, call.id, { status, durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0, endedAt: now });
    return twiml;
  }
  const state = form.get("CallStatus") ?? "";
  if (ENDED.includes(call.status)) return twiml;
  if (state === "completed") {
    // The caller hung up before the bridge reported: the dial leg's answer, if it comes, is the outcome.
    await store.updateContactCall(appId, call.id, { status: call.answeredAt ? "completed" : "cancelled", endedAt: now });
    return twiml;
  }
  const status = CALLER_STATES[state];
  if (!status) return twiml;
  await store.updateContactCall(appId, call.id, { status, ...(state === "in-progress" ? { answeredAt: now } : {}), ...(ENDED.includes(status) ? { endedAt: now } : {}) });
  return twiml;
}
