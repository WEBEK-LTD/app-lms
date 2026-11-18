import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { PUBLIC_STUN, RING_SECONDS } from "@/lib/contact/app-call";
import { withContact } from "@/lib/contact/chat";
import { saveCallSettings } from "@/lib/contact/settings";
import { contactSettingsOf } from "@/lib/contact/thread";
import { TWILIO_API } from "@/lib/contact/twilio";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings } from "@/lib/data/types";
import { assignShipment, moveShipment } from "@/lib/delivery/flow";
import type { DeliveryNotifyDeps } from "@/lib/delivery/notify";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { forgetApnsTokens, sendApnsPush, voipPayload, type ApnsCredentials, type ApnsRequest, type ApnsTransport } from "@/lib/hosted/apns";
import { DeliveryConnector } from "@/lib/hosted/connectors/delivery";
import { LogSender } from "@/lib/hosted/otp-sender";
import { sendPush, type PushMessage, type PushTarget, type ServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const P8 = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const APNS: ApnsCredentials = { keyId: "ABCDE12345", teamId: "TEAM123456", privateKey: P8, bundleId: "com.nile.express", roleBundleIds: { courier: "com.nile.express.courier" } };
const VOIP_TOKEN = "d".repeat(64);
const OFFER = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n";
const ANSWER = "v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n";
const ACCOUNT_SID = `AC${"a1".repeat(16)}`;

function fakeApns() {
  const requests: ApnsRequest[] = [];
  const transport: ApnsTransport = () => ({
    send: async (request) => {
      requests.push(request);
      return { status: 200, reason: null, apnsId: "x" } as never;
    },
    close: () => undefined,
  });
  return { transport, requests };
}

afterEach(() => forgetApnsTokens());

describe("184.6 the call's pushes", () => {
  it("rings an iPhone through PushKit: push type voip, the app's .voip topic, 30 seconds, no alert", async () => {
    const apns = fakeApns();
    const message: PushMessage = { title: "Karim, your courier", body: "Calling you in the app", data: { type: "contact_call", call_id: "7" } };
    const result = await sendApnsPush(APNS, [{ token: VOIP_TOKEN, role: "courier" }], message, { transport: apns.transport, now: NOW, voip: true });
    expect(result.sent).toBe(1);
    const sent = apns.requests[0]!;
    expect(sent.headers).toMatchObject({ "apns-push-type": "voip", "apns-topic": "com.nile.express.courier.voip", "apns-priority": "10", "apns-expiration": String(NOW.getTime() / 1000 + 30) });
    expect(JSON.parse(sent.body)).toEqual({ type: "contact_call", call_id: "7", title: "Karim, your courier", body: "Calling you in the app", aps: {} });
    expect(voipPayload(message).aps).toEqual({});
    // An ordinary push is unchanged.
    await sendApnsPush(APNS, [{ token: VOIP_TOKEN }], message, { transport: apns.transport, now: NOW });
    expect(apns.requests[1]!.headers).toMatchObject({ "apns-push-type": "alert", "apns-topic": "com.nile.express" });
  });

  it("rings an Android phone with data only, at high priority, kept 30 seconds", async () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const account: ServiceAccount = { project_id: "nile", client_email: "push@nile.iam.gserviceaccount.com", private_key: rsa };
    const bodies: Record<string, unknown>[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "t", expires_in: 3600 });
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json({ name: "m" });
    }) as typeof fetch;
    await sendPush(account, ["android-token"], { title: "Mona", body: "Calling you in the app", data: { type: "contact_call" }, dataOnly: true, ttlSeconds: 30 }, { fetcher, now: NOW });
    expect(bodies[0]).toEqual({ message: { token: "android-token", data: { type: "contact_call", title: "Mona", body: "Calling you in the app" }, android: { priority: "high", ttl: "30s" } } });
    await sendPush(account, ["android-token"], { title: "Hi", body: "There", data: {} }, { fetcher, now: NOW });
    expect(bodies[1]).toMatchObject({ message: { notification: { title: "Hi", body: "There" }, apns: { payload: { aps: { sound: "default" } } } } });
  });
});

describe("184.6 app calls on the hosted API", () => {
  const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
  const TAHRIR = { address: "Tahrir Square, Cairo", details: "Gate 2", lat: 30.0444, lng: 31.2357 };
  const TOWER = { address: "Cairo Tower, Zamalek", lat: 30.0459, lng: 31.2243 };
  const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", pricing: "fixed", fixedCents: 50_00, cash: true, card: false };
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let fcm: { tokens: string[]; message: PushMessage }[];
  let voip: ReturnType<typeof fakeApns>;
  let twilioAsked: string[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "delivery");
    app = { ...base, backend: "hosted", appName: "Nile Express", websiteDoneAt: NOW, connector: { kind: "deliveries" }, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" } };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    sender = new LogSender();
    now = NOW;
    fcm = [];
    voip = fakeApns();
    twilioAsked = [];
  });

  const notify = (at: Date): DeliveryNotifyDeps => ({
    store,
    app,
    now: at,
    account: { project_id: "nile", client_email: "push@nile.test", private_key: "k", apns: APNS },
    send: async (_account: ServiceAccount, targets: PushTarget[], message: PushMessage) => {
      fcm.push({ tokens: targets.map((t) => (typeof t === "string" ? t : t.token)), message });
      return { sent: targets.length, invalidTokens: [] };
    },
  });
  const twilio = (async (url: string) => {
    twilioAsked.push(url);
    if (url === `${TWILIO_API}/Accounts/${ACCOUNT_SID}/Tokens.json`) return Response.json({ ice_servers: [{ urls: "turn:global.turn.twilio.com:443?transport=tcp", username: "u", credential: "c" }] }, { status: 201 });
    return Response.json({ code: 20404 }, { status: 404 });
  }) as typeof fetch;

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.9",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: ASSETS,
    platformUrl: "https://yallapp.test",
    connector: withContact(new DeliveryConnector({ store, app, assetUrl: ASSETS, platformUrl: "https://yallapp.test" }), {
      store,
      app,
      enabled: true,
      notify,
      appCalls: { key: KEY, fetcher: twilio, sendVoip: (credentials, targets, message, options) => sendApnsPush(credentials, targets, message, { ...options, transport: voip.transport }) },
    }),
  });

  async function call(method: string, route: string, options: { params?: string[]; token?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string, platform: "android" | "ios", push: Record<string, unknown>) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const device = { id: `install-${phone}`, platform, name: "Phone", app_version: "1.0.0" };
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = (await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device } })).body as { access_token: string; user: { id: number } };
    expect((await call("PUT", "/me/push-token", { token: registered.access_token, body: push })).status).toBe(204);
    return registered;
  }

  /** Mona (an iPhone with PushKit) and Karim (Android) on a parcel on its way; app calls on. */
  async function scene(options: { appCall?: boolean } = {}) {
    const made = await store.createCourier({ appId: app.id, name: "Karim Mostafa", phone: "+201005556666", email: null, vehicle: null, active: true }, NOW);
    const mona = await signUp("1001112222", "Mona Adel", "ios", { token: "e".repeat(64), voip_token: VOIP_TOKEN.toUpperCase() });
    const karim = await signUp("1005556666", "Karim", "android", { token: "karim-fcm", role: "courier" });
    const stranger = await signUp("1009990000", "Someone", "android", { token: "stranger-fcm" });
    const sent = await call("POST", "/delivery/shipments", {
      query: { platform: "android" },
      token: mona.access_token,
      body: { pickup: TAHRIR, dropoff: TOWER, recipient: { name: "Mona Adel", phone: "0101 555 0000" }, package: { size: "small" }, payment: "cash" },
    });
    const id = (sent.body as { shipment: { id: number } }).shipment.id;
    const courier = (made as { courier: { id: number } }).courier;
    await assignShipment({ store, app, now, account: null, courierAccount: null }, (await store.getShipment(app.id, id))!, (await store.getCourier(app.id, courier.id))!, "company");
    if (options.appCall !== false) expect((await saveCallSettings(store, app.id, { chat: "on", appCall: "on" }, KEY, now)).ok).toBe(true);
    fcm = [];
    return { mona, karim, stranger, id };
  }

  const CUSTOMER = "/me/shipments/{shipment_id}";
  const COURIER = "/courier/jobs/{shipment_id}";
  const start = (token: string, base: string, id: number, offer: unknown = OFFER) => call("POST", `${base}/contact/app-call`, { params: [String(id)], token, body: { offer } });
  const signalOf = (token: string, base: string, id: number, callId: number) => call("GET", `${base}/contact/calls/{call_id}/signal`, { params: [String(id), String(callId)], token });

  it("rings the other side with the app closed, carries the offer and the answer, and keeps no SDP after", async () => {
    const { mona, karim, id } = await scene();
    const ways = (await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token })).body as { ways: { app_call: boolean } };
    expect(ways.ways.app_call).toBe(true);
    // Karim calls Mona: her iPhone rings through PushKit.
    const started = await start(karim.access_token, COURIER, id);
    expect(started.status).toBe(201);
    const body = started.body as { call: { id: number; status: string; mine: boolean }; ice_servers: unknown; relay: boolean; ringing_phones: number };
    expect(body).toMatchObject({ call: { status: "ringing", mine: true, kind: "app" }, ice_servers: PUBLIC_STUN, relay: false, ringing_phones: 1 });
    expect(voip.requests).toHaveLength(1);
    expect(voip.requests[0]!.path).toBe(`/3/device/${VOIP_TOKEN}`);
    expect(voip.requests[0]!.headers["apns-push-type"]).toBe("voip");
    expect(JSON.parse(voip.requests[0]!.body)).toMatchObject({ type: "contact_call", call_id: String(body.call.id), from: "courier", name: "Karim", title: "Karim, your courier" });
    expect(fcm).toEqual([]);
    const callId = body.call.id;

    // Mona's phone reads the offer; Karim's has nothing yet.
    expect((await signalOf(mona.access_token, CUSTOMER, id, callId)).body).toMatchObject({ offer: OFFER, answer: null, poll_after_ms: 1000, call: { mine: false, status: "ringing" } });
    expect((await signalOf(karim.access_token, COURIER, id, callId)).body).toMatchObject({ offer: null, answer: null });
    // Only the one called answers.
    expect((await call("POST", `${COURIER}/contact/calls/{call_id}/answer`, { params: [String(id), String(callId)], token: karim.access_token, body: { answer: ANSWER } })).status).toBe(404);
    expect((await call("POST", `${CUSTOMER}/contact/calls/{call_id}/answer`, { params: [String(id), String(callId)], token: mona.access_token, body: { answer: "nope" } })).status).toBe(400);
    now = new Date(now.getTime() + 5_000);
    expect((await call("POST", `${CUSTOMER}/contact/calls/{call_id}/answer`, { params: [String(id), String(callId)], token: mona.access_token, body: { answer: ANSWER } })).body).toMatchObject({ call: { status: "connected" } });
    expect((await signalOf(karim.access_token, COURIER, id, callId)).body).toMatchObject({ answer: ANSWER, offer: null, call: { status: "connected" } });

    // 72 seconds later Mona hangs up: Karim's Android phone is told, the SDPs are gone.
    now = new Date(now.getTime() + 72_000);
    const ended = await call("POST", `${CUSTOMER}/contact/calls/{call_id}/end`, { params: [String(id), String(callId)], token: mona.access_token, body: { reason: "hangup" } });
    expect(ended.body).toMatchObject({ call: { status: "completed", duration_seconds: 72 } });
    expect(fcm.map((p) => [p.tokens, p.message.data.type, p.message.dataOnly])).toEqual([[["karim-fcm"], "contact_call_end", true]]);
    expect(await store.getContactCall(app.id, callId)).toMatchObject({ offerSdp: null, answerSdp: null, status: "completed" });
    expect((await signalOf(karim.access_token, COURIER, id, callId)).body).toMatchObject({ offer: null, answer: null, poll_after_ms: null, ice_servers: [] });
  });

  it("rings Android with data only, declines as busy, misses after 45 seconds, and refuses outsiders", async () => {
    const { mona, karim, stranger, id } = await scene();
    const first = ((await start(mona.access_token, CUSTOMER, id)).body as { call: { id: number } }).call.id;
    expect(fcm.map((p) => [p.tokens, p.message.data.type, p.message.data.name, p.message.dataOnly, p.message.ttlSeconds])).toEqual([[["karim-fcm"], "contact_call", "Mona", true, 30]]);
    expect((await signalOf(stranger.access_token, CUSTOMER, id, first)).status).toBe(404);
    expect((await signalOf(stranger.access_token, COURIER, id, first)).status).toBe(403);
    expect((await start(stranger.access_token, CUSTOMER, id)).status).toBe(404);
    const declined = await call("POST", `${COURIER}/contact/calls/{call_id}/end`, { params: [String(id), String(first)], token: karim.access_token, body: { reason: "decline" } });
    expect(declined.body).toMatchObject({ call: { status: "busy" } });
    // A missed call.
    const second = ((await start(mona.access_token, CUSTOMER, id)).body as { call: { id: number } }).call.id;
    now = new Date(now.getTime() + (RING_SECONDS + 1) * 1000);
    expect((await signalOf(karim.access_token, COURIER, id, second)).body).toMatchObject({ call: { status: "no_answer" }, offer: null });
    expect((await call("POST", `${COURIER}/contact/calls/{call_id}/answer`, { params: [String(id), String(second)], token: karim.access_token, body: { answer: ANSWER } })).status).toBe(409);
    expect((await start(mona.access_token, CUSTOMER, id, "not an sdp")).status).toBe(400);
  });

  it("offers TURN only from the owner's Twilio, and works only while switched on and on its way", async () => {
    const { mona, id } = await scene({ appCall: false });
    const off = await start(mona.access_token, CUSTOMER, id);
    expect([off.status, (off.body as { code: string }).code]).toEqual([409, "app_call_unavailable"]);
    // The owner's relay: Twilio's short-lived TURN servers, fetched for this call.
    const sealed = await saveCallSettings(store, app.id, { chat: "on", appCall: "on", turn: "twilio", accountSid: ACCOUNT_SID, keySid: `SK${"b2".repeat(16)}`, secret: "S3cr3tS3cr3tS3cr3tS3cr3tS3cr3tAB", number: "+14155550142" }, KEY, now);
    expect(sealed.ok).toBe(true);
    const relayed = (await start(mona.access_token, CUSTOMER, id)).body as { relay: boolean; ice_servers: unknown[] };
    expect(relayed).toMatchObject({ relay: true, ice_servers: [{ urls: "turn:global.turn.twilio.com:443?transport=tcp", username: "u", credential: "c" }] });
    expect(twilioAsked).toEqual([`${TWILIO_API}/Accounts/${ACCOUNT_SID}/Tokens.json`]);
    expect(contactSettingsOf(app.id, await store.getContactSettings(app.id)).turn).toBe("twilio");
    for (const status of ["picked_up", "on_the_way", "delivered"] as const) await moveShipment({ store, app, now, account: null, courierAccount: null }, (await store.getShipment(app.id, id))!, status, "courier");
    expect((await start(mona.access_token, CUSTOMER, id)).status).toBe(409);
  });

  it("keeps the iPhone's PushKit token with its push token, and forgets it on request", async () => {
    const { mona } = await scene();
    const device = async () => (await store.listHostedPushDevices(app.id, [mona.user.id], "customers"))[0]!;
    expect((await device()).voipToken).toBe(VOIP_TOKEN);
    expect((await call("PUT", "/me/push-token", { token: mona.access_token, body: { token: "e".repeat(64), voip_token: "not-hex" } })).status).toBe(400);
    await call("PUT", "/me/push-token", { token: mona.access_token, body: { token: "e".repeat(64) } });
    expect((await device()).voipToken).toBe(VOIP_TOKEN);
    await call("PUT", "/me/push-token", { token: mona.access_token, body: { token: "e".repeat(64), voip_token: null } });
    expect((await device()).voipToken).toBeNull();
  });
});
