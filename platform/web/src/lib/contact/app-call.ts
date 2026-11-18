import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { DataStore } from "../data/store";
import type { App, ContactCall, ContactCallStatus, ContactSettings, HostedDevice } from "../data/types";
import { asLang, courierUser, type DeliveryNotifyDeps } from "../delivery/notify";
import { sendApnsPush } from "../hosted/apns";
import { pushTarget, sendPush, type PushMessage, type ServiceAccount } from "../hosted/push";
import { hitRateLimit, type RateLimitRule } from "../rate-limit";
import { twilioCredentials } from "./settings";
import { firstName, onItsWay, type Thread } from "./thread";
import { relayServers } from "./twilio";

/**
 * 184.6 The in-app call over the internet, like a WhatsApp call, between an
 * order's customer and its courier: WebRTC audio, one to one, with no phone
 * number on either side. The server only carries the signalling, over HTTP
 * (no WebSocket):
 *
 *   POST …/contact/app-call                  the caller's offer (SDP, its ICE gathered); the other side rings
 *   GET  …/contact/calls/{id}/signal         the offer (to the one called), the answer (to the caller), the call's state
 *   POST …/contact/calls/{id}/answer         the answer; the call is connected
 *   POST …/contact/calls/{id}/end            hung up, declined, or couldn't connect
 *
 * Each side asks for the signal about every second only while the call is
 * being set up. A call nobody answers in 45 seconds is missed.
 *
 * ICE servers come per call: public STUN, and TURN only from the app owner's
 * own Twilio account (Network Traversal, short-lived), never a server of
 * Yallapp's. Without it a call is direct only, and one that can't connect
 * offers chat (the app's own screen).
 *
 * The other side rings with the app closed: an iPhone through PushKit (a
 * VoIP push through the app's own APNs key, which the app reports to CallKit
 * at once, as iOS requires of every VoIP push), an Android phone through a
 * high-priority data message that the app turns into a full-screen call.
 * An iPhone without a PushKit token (or an app without its APNs key) gets an
 * ordinary alert instead.
 */

export interface AppCallDeps {
  store: DataStore;
  app: App;
  key: Buffer;
  fetcher: typeof fetch;
  notify?: (now: Date) => DeliveryNotifyDeps;
  /** The VoIP push's sender (tests pass a fake). */
  sendVoip?: typeof sendApnsPush;
}

/** Public STUN servers: they only tell a phone its own address. */
export const PUBLIC_STUN = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
/** A call not answered in this long is missed. */
export const RING_SECONDS = 45;
/** An SDP with its candidates fits in this. */
const SDP_MAX = 20_000;
const CALL_LIMIT: RateLimitRule = { name: "contact_app_call", limit: 10, windowSeconds: 600 };

type Result = { status: number; body?: unknown };
const fail = (status: number, code: string, message: string): Result => ({ status, body: { code, message } });
const UNAVAILABLE = "Calls in the app aren't available right now. Write in the chat instead.";

/** Whether app calls can be made now: switched on, the order on its way. */
export function appCallsReady(settings: ContactSettings, thread: Pick<Thread, "job">): boolean {
  return settings.appCall && onItsWay(thread.job);
}

/** The ICE servers for one call: public STUN, and the owner's Twilio relay when chosen and it answers. */
export async function iceServers(deps: Pick<AppCallDeps, "app" | "key" | "fetcher">, settings: ContactSettings) {
  if ((settings.turn ?? "direct") === "twilio" && settings.twilio) {
    try {
      const relay = await relayServers(deps.fetcher, twilioCredentials(deps.app.id, settings.twilio, deps.key)!);
      if (relay && relay.length > 0) return { relay: true, servers: relay };
    } catch {
      // Direct only, this time.
    }
  }
  return { relay: false, servers: PUBLIC_STUN };
}

const readSdp = (value: unknown, type: "offer" | "answer"): string | null => {
  const sdp = (value as Record<string, unknown> | null)?.[type];
  return typeof sdp === "string" && sdp.startsWith("v=0") && sdp.length <= SDP_MAX ? sdp : null;
};

/** The call, missed once it rang 45 seconds unanswered. */
async function fresh(store: DataStore, call: ContactCall, now: Date): Promise<ContactCall> {
  if ((call.status === "ringing" || call.status === "calling") && now.getTime() - call.createdAt.getTime() > RING_SECONDS * 1000) {
    const missed = { status: "no_answer" as const, endedAt: now, offerSdp: null, answerSdp: null };
    await store.updateContactCall(call.appId, call.id, missed);
    return { ...call, ...missed };
  }
  return call;
}

/** Starts an app call from this side of the thread: keeps the offer and rings the other side. */
export async function startAppCall(deps: AppCallDeps, thread: Thread, settings: ContactSettings, body: unknown, now: Date): Promise<Result> {
  if (!appCallsReady(settings, thread)) return fail(409, "app_call_unavailable", UNAVAILABLE);
  const offer = readSdp(body, "offer");
  if (!offer) return fail(400, "invalid_request", "Send the call's offer (SDP).");
  const limit = await hitRateLimit(deps.store, CALL_LIMIT, `${deps.app.id}:${thread.job.id}:${thread.side}`, now);
  if (!limit.allowed) return fail(429, "rate_limited", "Too many calls. Wait a few minutes, or write in the chat.");
  // One call at a time on a job: an earlier one still ringing is ended.
  for (const earlier of await deps.store.listContactCalls(deps.app.id, thread.job.id, 5)) {
    if (earlier.kind === "app" && (earlier.status === "ringing" || earlier.status === "calling")) await deps.store.updateContactCall(deps.app.id, earlier.id, { status: "cancelled", endedAt: now, offerSdp: null, answerSdp: null });
  }
  const call = await deps.store.createContactCall({
    appId: deps.app.id,
    shipmentId: thread.job.id,
    courierId: thread.courier.id,
    kind: "app",
    caller: thread.side,
    status: "ringing",
    providerSid: null,
    problem: null,
    durationSeconds: null,
    offerSdp: offer,
    answerSdp: null,
    createdAt: now,
    answeredAt: null,
    endedAt: null,
  });
  const ice = await iceServers(deps, settings);
  const rang = await ring(deps, thread, call, now).catch(() => 0);
  return { status: 201, body: { call: appCallJson(call, thread), ice_servers: ice.servers, relay: ice.relay, ringing_phones: rang } };
}

export function appCallJson(call: ContactCall, thread: Pick<Thread, "side">) {
  return {
    id: call.id,
    kind: call.kind,
    caller: call.caller,
    status: call.status,
    ring_from: null,
    duration_seconds: call.durationSeconds,
    created_at: call.createdAt.toISOString(),
    ended_at: call.endedAt?.toISOString() ?? null,
    ...(call.status === "ringing" ? { rings_until: new Date(call.createdAt.getTime() + RING_SECONDS * 1000).toISOString() } : {}),
    mine: call.caller === thread.side,
  };
}

/** The call's signal for this side: the offer to the one called, the answer to the caller, and the ICE servers. */
export async function signal(deps: AppCallDeps, thread: Thread, settings: ContactSettings, found: ContactCall, now: Date): Promise<Result> {
  if (found.kind !== "app") return fail(404, "not_found", "Call not found.");
  const call = await fresh(deps.store, found, now);
  const mine = call.caller === thread.side;
  const live = call.status === "ringing" || call.status === "connected";
  const ice = live ? await iceServers(deps, settings) : { relay: false, servers: [] };
  return {
    status: 200,
    body: {
      call: appCallJson(call, thread),
      offer: !mine && call.status === "ringing" ? (call.offerSdp ?? null) : null,
      answer: mine && call.status === "connected" ? (call.answerSdp ?? null) : null,
      ice_servers: ice.servers,
      relay: ice.relay,
      poll_after_ms: live ? 1000 : null,
    },
  };
}

/** The one called answers. */
export async function answer(deps: AppCallDeps, thread: Thread, found: ContactCall, body: unknown, now: Date): Promise<Result> {
  if (found.kind !== "app" || found.caller === thread.side) return fail(404, "not_found", "Call not found.");
  const call = await fresh(deps.store, found, now);
  if (call.status !== "ringing") return fail(409, "call_ended", "This call has ended.");
  const sdp = readSdp(body, "answer");
  if (!sdp) return fail(400, "invalid_request", "Send the call's answer (SDP).");
  await deps.store.updateContactCall(deps.app.id, call.id, { status: "connected", answerSdp: sdp, answeredAt: now });
  return { status: 200, body: { call: appCallJson({ ...call, status: "connected", answeredAt: now }, thread) } };
}

const END_REASONS = ["hangup", "decline", "failed"] as const;

/** Either side ends the call: a hang-up, a decline (the one called) or a call that couldn't connect. */
export async function end(deps: AppCallDeps, thread: Thread, found: ContactCall, body: unknown, now: Date): Promise<Result> {
  if (found.kind !== "app") return fail(404, "not_found", "Call not found.");
  const reason = (body as { reason?: unknown } | null)?.reason;
  if (!(END_REASONS as readonly unknown[]).includes(reason)) return fail(400, "invalid_request", "reason is hangup, decline or failed.");
  const call = await fresh(deps.store, found, now);
  if (["completed", "no_answer", "busy", "failed", "cancelled"].includes(call.status)) return { status: 200, body: { call: appCallJson(call, thread) } };
  const mine = call.caller === thread.side;
  const status: ContactCallStatus =
    reason === "failed" ? "failed" : call.status === "connected" ? "completed" : mine ? "cancelled" : "busy";
  const duration = call.answeredAt ? Math.max(0, Math.round((now.getTime() - call.answeredAt.getTime()) / 1000)) : null;
  // The offer and the answer carry each phone's network addresses: they go with the call.
  const patch = { status, endedAt: now, durationSeconds: status === "completed" ? duration : null, offerSdp: null, answerSdp: null, problem: reason === "failed" ? "no_route" : null };
  await deps.store.updateContactCall(deps.app.id, call.id, patch);
  await stopRinging(deps, thread, call, now).catch(() => 0);
  return { status: 200, body: { call: appCallJson({ ...call, ...patch }, thread) } };
}

const RINGS: Record<"customer" | "courier", Record<Lang, (n: string) => { title: string; body: string }>> = {
  // The courier is calling the customer.
  courier: {
    en: (n) => ({ title: `${n}, your courier`, body: "Calling you in the app" }),
    ar: (n) => ({ title: `${n}، مندوب التوصيل`, body: "يتصل بك عبر التطبيق" }),
    tr: (n) => ({ title: `${n}, kuryeniz`, body: "Uygulamadan arıyor" }),
  },
  // The customer is calling the courier.
  customer: {
    en: (n) => ({ title: `${n}, your customer`, body: "Calling you in the app" }),
    ar: (n) => ({ title: `${n}، العميل`, body: "يتصل بك عبر التطبيق" }),
    tr: (n) => ({ title: `${n}, müşteriniz`, body: "Uygulamadan arıyor" }),
  },
};

/** The other side of `thread` (the one called, when `thread` is the caller's): their account, and which of the company's apps rings. */
async function callee(deps: AppCallDeps, thread: Thread): Promise<{ userId: number; audience: "customers" | "second" } | null> {
  if (thread.side === "courier") return thread.job.userId !== null ? { userId: thread.job.userId, audience: "customers" } : null;
  const user = await courierUser(deps.store, thread.courier);
  return user ? { userId: user.id, audience: "second" } : null;
}

/**
 * Rings the other side's phones: an iPhone with a PushKit token through a VoIP push (the app's APNs key),
 * an Android phone through a high-priority data message kept 30 seconds, any other iPhone with an alert.
 * Returns the phones reached.
 */
export async function ring(deps: AppCallDeps, thread: Thread, call: ContactCall, now: Date): Promise<number> {
  if (!deps.notify) return 0;
  const n = deps.notify(now);
  const to = await callee(deps, thread);
  if (!to) return 0;
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [to.userId], to.audience);
  const lang = asLang(devices[0]?.language) ?? (thread.side === "courier" ? asLang(thread.job.lang) : null) ?? (await appLang(deps.store, deps.app.id));
  const name = thread.side === "customer" ? firstName(thread.job.recipientName) : firstName(thread.courier.name);
  const words = RINGS[thread.side][lang](name);
  const data = { type: "contact_call", call_id: String(call.id), shipment_id: String(thread.job.id), from: thread.side, name, rings_until: new Date(call.createdAt.getTime() + RING_SECONDS * 1000).toISOString() };
  return sendCallPush(deps, n, devices, { ...words, data });
}

/** Stops the other side's ringing (Android): an iPhone's CallKit asks the signal, which says the call ended. */
async function stopRinging(deps: AppCallDeps, thread: Thread, call: ContactCall, now: Date): Promise<number> {
  if (!deps.notify) return 0;
  const n = deps.notify(now);
  // The side that didn't end it.
  const other = await callee(deps, thread);
  if (!other) return 0;
  const devices = (await deps.store.listHostedPushDevices(deps.app.id, [other.userId], other.audience)).filter((d) => d.platform === "android");
  return sendCallPush(deps, n, devices, { title: "", body: "", data: { type: "contact_call_end", call_id: String(call.id), shipment_id: String(thread.job.id) } }, { androidOnly: true });
}

async function sendCallPush(deps: AppCallDeps, n: DeliveryNotifyDeps, devices: HostedDevice[], message: PushMessage, options: { androidOnly?: boolean } = {}): Promise<number> {
  let sent = 0;
  const accountOf = (d: HostedDevice): ServiceAccount | null => (d.courierDeviceId ? (n.courierAccount ?? null) : (n.account ?? null));
  const send = n.send ?? sendPush;
  for (const d of devices) {
    const account = accountOf(d);
    if (!account) continue;
    const data = d.courierDeviceId ? { ...message.data, app_id: deps.app.id } : message.data;
    try {
      if (d.platform === "ios" && !options.androidOnly) {
        if (d.voipToken && account.apns) {
          sent += (await (deps.sendVoip ?? sendApnsPush)(account.apns, [{ token: d.voipToken, role: d.appRole ?? null }], { ...message, data }, { now: n.now, voip: true })).sent;
        } else if (d.pushToken) {
          // No PushKit: an ordinary alert that opens the call.
          sent += (await send(account, [pushTarget(d)], { ...message, data }, { now: n.now })).sent;
        }
      } else if (d.platform === "android" && d.pushToken) {
        sent += (await send(account, [pushTarget(d)], { ...message, data, dataOnly: true, ttlSeconds: 30 }, { now: n.now })).sent;
      }
    } catch {
      // The signal still has the call: an open app sees it.
    }
  }
  return sent;
}
