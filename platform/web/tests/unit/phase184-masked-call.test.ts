import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { withContact } from "@/lib/contact/chat";
import { CALLBACK_PATH, handleTwilioCallback } from "@/lib/contact/phone-call";
import { callSettingsView, maskSid, readCallSettings, saveCallSettings, testCallSettings, twilioCredentials, twilioSecretContext } from "@/lib/contact/settings";
import { contactSettingsOf } from "@/lib/contact/thread";
import { bridgeTwiml, placeBridgeCall, problemOf, relayServers, testTwilio, TWILIO_API } from "@/lib/contact/twilio";
import { decrypt } from "@/lib/crypto/encryption";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type DeliverySettings } from "@/lib/data/types";
import { assignShipment, moveShipment } from "@/lib/delivery/flow";
import { DEFAULT_DELIVERY_SETTINGS } from "@/lib/delivery/settings";
import { DeliveryConnector } from "@/lib/hosted/connectors/delivery";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { contextsFor } from "@/lib/jobs/rekey";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

// Made-up test credentials in Twilio's shapes: never a real account, and no request leaves the test.
const ACCOUNT_SID = `AC${"a1".repeat(16)}`;
const KEY_SID = `SK${"b2".repeat(16)}`;
const SECRET = "S3cr3tS3cr3tS3cr3tS3cr3tS3cr3tAB";
const AUTH_TOKEN = "t0kent0kent0kent0kent0kent0ken12";
const OWNER_NUMBER = "+14155550142";
const SIGNING = "contact-callback-secret-0123456789abcdef";

type Seen = { method: string; url: string; auth: string | null; form: URLSearchParams };

/** Twilio, as the tests answer for it: each path a status and a body. */
function fakeTwilio(answers: Record<string, { status?: number; body: unknown }>) {
  const seen: Seen[] = [];
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    expect(url.startsWith(`${TWILIO_API}/Accounts/${ACCOUNT_SID}`), url).toBe(true);
    const form = new URLSearchParams(init?.body ? String(init.body) : "");
    seen.push({ method: init?.method ?? "GET", url, auth: new Headers(init?.headers).get("authorization"), form });
    const path = url.slice(`${TWILIO_API}/Accounts/${ACCOUNT_SID}`.length).split("?")[0]!;
    const answer = answers[path] ?? { status: 404, body: { code: 20404, message: "Not found" } };
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fetcher, seen };
}

const HEALTHY = {
  ".json": { body: { sid: ACCOUNT_SID, status: "active", type: "Full" } },
  "/IncomingPhoneNumbers.json": { body: { incoming_phone_numbers: [{ phone_number: OWNER_NUMBER, capabilities: { voice: true, sms: true } }] } },
  "/Balance.json": { body: { balance: "23.40", currency: "USD" } },
  "/Tokens.json": { status: 201, body: { ice_servers: [{ urls: "stun:global.stun.twilio.com:3478" }, { urls: "turn:global.turn.twilio.com:3478?transport=udp", username: "u", credential: "c" }] } },
  "/Calls.json": { status: 201, body: { sid: "CA0123456789abcdef0123456789abcdef", status: "queued" } },
};

describe("184.5 the owner's Twilio account in Settings › Calls", () => {
  const empty = contactSettingsOf("app-1", null);
  const form = { chat: "on", accountSid: ACCOUNT_SID, keySid: KEY_SID, secret: SECRET, number: "+1 (415) 555-0142" };

  it("seals the secret with the platform's key, bound to the app, and never shows it again", () => {
    const read = readCallSettings("app-1", form, empty, KEY, NOW);
    expect(read.ok).toBe(true);
    const value = (read as { value: typeof empty }).value;
    expect(value.twilio).toMatchObject({ accountSid: ACCOUNT_SID, keySid: KEY_SID, number: OWNER_NUMBER });
    expect(value.twilio!.secretEncrypted).not.toContain(SECRET);
    expect(decrypt(value.twilio!.secretEncrypted, KEY, twilioSecretContext("app-1"))).toBe(SECRET);
    // Another app's context can't open it.
    expect(() => decrypt(value.twilio!.secretEncrypted, KEY, twilioSecretContext("app-2"))).toThrow();
    expect(twilioCredentials("app-1", value.twilio, KEY)).toEqual({ accountSid: ACCOUNT_SID, keySid: KEY_SID, secret: SECRET });
    // What the form shows: masked SIDs, "saved", the owner's own number, and nothing that opens the account.
    const view = callSettingsView(value);
    expect(view.twilio).toEqual({ accountSid: maskSid(ACCOUNT_SID), keySid: maskSid(KEY_SID), usesAuthToken: false, secretSaved: true, number: OWNER_NUMBER });
    expect(maskSid(ACCOUNT_SID)).toMatch(/^AC•{28}a1a1$/);
    const shown = JSON.stringify(view);
    for (const secret of [SECRET, ACCOUNT_SID, KEY_SID, value.twilio!.secretEncrypted]) expect(shown).not.toContain(secret);
    // The rekey job knows the context.
    expect(contextsFor(["app-1"])).toContain(twilioSecretContext("app-1"));
  });

  it("keeps the saved secret when the form leaves it empty, and asks again for a new key or the auth token", () => {
    const saved = (readCallSettings("app-1", form, empty, KEY, NOW) as { value: typeof empty }).value;
    const tested = { ...saved, twilioCheck: { at: NOW, ok: true, problem: null, checks: [], balance: null } };
    // The masked values come back as the form showed them.
    const again = readCallSettings("app-1", { chat: "on", phoneCall: "on", accountSid: maskSid(ACCOUNT_SID), keySid: maskSid(KEY_SID), secret: "", number: OWNER_NUMBER }, tested, KEY, NOW);
    expect(again).toMatchObject({ ok: true, changedAccount: false, value: { phoneCall: true, twilio: { secretEncrypted: saved.twilio!.secretEncrypted } } });
    const newKey = readCallSettings("app-1", { ...form, keySid: `SK${"c3".repeat(16)}`, secret: "" }, tested, KEY, NOW);
    expect(newKey).toMatchObject({ ok: false, errors: { secret: expect.any(String) } });
    const token = readCallSettings("app-1", { ...form, auth: "auth_token", keySid: "", secret: "" }, tested, KEY, NOW);
    expect(token).toMatchObject({ ok: false, errors: { secret: "Paste the account's auth token." } });
    const withToken = readCallSettings("app-1", { ...form, auth: "auth_token", keySid: "", secret: AUTH_TOKEN }, tested, KEY, NOW);
    expect(withToken).toMatchObject({ ok: true, value: { twilio: { keySid: null } } });
    expect(twilioCredentials("app-1", (withToken as { value: typeof empty }).value.twilio, KEY)).toEqual({ accountSid: ACCOUNT_SID, keySid: null, secret: AUTH_TOKEN });
    expect(callSettingsView((withToken as { value: typeof empty }).value).twilio).toMatchObject({ keySid: null, usesAuthToken: true });
    // Forgotten on request.
    expect(readCallSettings("app-1", { chat: "on", removeTwilio: "on" }, tested, KEY, NOW)).toMatchObject({ ok: true, value: { twilio: null, phoneCall: false, twilioCheck: null } });
  });

  it("refuses wrong shapes, and phone calls before a passing test", () => {
    const wrong = readCallSettings("app-1", { accountSid: "AC123", keySid: "key", secret: "short", number: "555" }, empty, KEY, NOW);
    expect(wrong).toMatchObject({ ok: false, errors: { accountSid: expect.any(String), keySid: expect.any(String), secret: expect.any(String), number: expect.any(String) } });
    expect(readCallSettings("app-1", { phoneCall: "on" }, empty, KEY, NOW)).toMatchObject({ ok: false, errors: { phoneCall: "Add your Twilio account first." } });
    expect(readCallSettings("app-1", { turn: "twilio" }, empty, KEY, NOW)).toMatchObject({ ok: false, errors: { turn: expect.any(String) } });
    const saved = (readCallSettings("app-1", form, empty, KEY, NOW) as { value: typeof empty }).value;
    expect(readCallSettings("app-1", { ...form, secret: "", phoneCall: "on" }, saved, KEY, NOW)).toMatchObject({ ok: false, errors: { phoneCall: expect.stringContaining("Test the connection") } });
    // A changed number is tested again: its last test is forgotten and phone calls wait for the new one.
    const tested = { ...saved, phoneCall: true, twilioCheck: { at: NOW, ok: true, problem: null, checks: [], balance: null } };
    expect(readCallSettings("app-1", { ...form, secret: "", phoneCall: "on", number: "+14155550199" }, tested, KEY, NOW)).toMatchObject({ ok: true, changedAccount: true, value: { phoneCall: false, twilioCheck: null } });
  });
});

describe("184.5 Twilio, mocked", () => {
  const creds = { accountSid: ACCOUNT_SID, keySid: KEY_SID, secret: SECRET };

  it("tests the connection: the account, the number, the balance and the relay", async () => {
    const { fetcher, seen } = fakeTwilio(HEALTHY);
    const check = await testTwilio(fetcher, creds, OWNER_NUMBER, { relay: true, now: NOW });
    expect(check).toEqual({
      at: NOW,
      ok: true,
      problem: null,
      balance: { amount: "23.40", currency: "USD" },
      checks: [{ name: "account", ok: true }, { name: "number", ok: true }, { name: "balance", ok: true }, { name: "relay", ok: true }],
    });
    // Signed in with the API key, never placing a call.
    expect(seen.every((s) => s.auth === `Basic ${Buffer.from(`${KEY_SID}:${SECRET}`).toString("base64")}`)).toBe(true);
    expect(seen.some((s) => s.url.includes("/Calls.json"))).toBe(false);
    expect(seen[1]!.url).toContain(`PhoneNumber=${encodeURIComponent(OWNER_NUMBER)}`);
    // With the auth token: the account's SID signs in.
    const token = fakeTwilio(HEALTHY);
    await testTwilio(token.fetcher, { accountSid: ACCOUNT_SID, keySid: null, secret: AUTH_TOKEN }, OWNER_NUMBER, { relay: false, now: NOW });
    expect(token.seen[0]!.auth).toBe(`Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`);
    expect(token.seen.some((s) => s.url.endsWith("/Tokens.json"))).toBe(false);
  });

  it("says plainly what's wrong: the key, the account, the number, the balance", async () => {
    const run = (answers: Record<string, { status?: number; body: unknown }>) => testTwilio(fakeTwilio({ ...HEALTHY, ...answers }).fetcher, creds, OWNER_NUMBER, { relay: false, now: NOW });
    expect(await run({ ".json": { status: 401, body: { code: 20003, message: "Authenticate" } } })).toMatchObject({ ok: false, problem: "auth" });
    expect(await run({ ".json": { body: { status: "suspended", type: "Full" } } })).toMatchObject({ ok: false, problem: "account_inactive" });
    expect(await run({ ".json": { body: { status: "active", type: "Trial" } } })).toMatchObject({ ok: false, problem: "trial" });
    expect(await run({ "/IncomingPhoneNumbers.json": { body: { incoming_phone_numbers: [] } } })).toMatchObject({ ok: false, problem: "number_not_owned" });
    expect(await run({ "/IncomingPhoneNumbers.json": { body: { incoming_phone_numbers: [{ phone_number: OWNER_NUMBER, capabilities: { voice: false } }] } } })).toMatchObject({ ok: false, problem: "number_no_voice" });
    expect(await run({ "/Balance.json": { body: { balance: "0.12", currency: "USD" } } })).toMatchObject({ ok: false, problem: "low_balance", balance: { amount: "0.12" } });
    // A key that can't read the balance: not a problem.
    expect(await run({ "/Balance.json": { status: 403, body: { code: 20403 } } })).toMatchObject({ ok: true, balance: null });
    // The relay matters only for app calls: phone calls still pass.
    expect(await testTwilio(fakeTwilio({ ...HEALTHY, "/Tokens.json": { status: 403, body: { code: 20403 } } }).fetcher, creds, OWNER_NUMBER, { relay: true, now: NOW })).toMatchObject({ ok: true, problem: "relay_unavailable" });
    expect([problemOf({ status: 400, code: 21212 }), problemOf({ status: 400, code: 21215 }), problemOf({ status: 400, code: 21219 }), problemOf({ status: 500, code: null })]).toEqual(["number_not_owned", "geo_blocked", "trial", "unknown"]);
  });

  it("bridges: rings the caller from the owner's number, then dials the other side from it, recording nothing", async () => {
    const { fetcher, seen } = fakeTwilio(HEALTHY);
    const placed = await placeBridgeCall(fetcher, creds, {
      ring: "+201001112222",
      connect: "+201005556666",
      from: OWNER_NUMBER,
      say: `Connecting you to Karim & <co>, your courier.`,
      lang: "ar",
      callerStatusUrl: "https://yallapp.test/api/contact/twilio?leg=caller",
      dialResultUrl: "https://yallapp.test/api/contact/twilio?a=1&leg=dial",
    });
    expect(placed).toEqual({ ok: true, sid: "CA0123456789abcdef0123456789abcdef" });
    const form = seen[0]!.form;
    expect([form.get("To"), form.get("From"), form.get("Record"), form.getAll("StatusCallbackEvent")]).toEqual(["+201001112222", OWNER_NUMBER, "false", ["ringing", "answered", "completed"]]);
    const twiml = form.get("Twiml")!;
    expect(twiml).toContain(`<Dial callerId="${OWNER_NUMBER}" timeout="30" record="do-not-record" action="https://yallapp.test/api/contact/twilio?a=1&amp;leg=dial" method="POST"><Number>+201005556666</Number></Dial>`);
    expect(twiml).toContain(`<Say voice="Polly.Zeina" language="arb">Connecting you to Karim &amp; &lt;co&gt;, your courier.</Say>`);
    expect(bridgeTwiml({ connect: "+2", from: "+1", say: "Hi", lang: "tr", dialResultUrl: "u" })).toContain(`language="tr-TR"`);
    const refused = await placeBridgeCall(fakeTwilio({ "/Calls.json": { status: 400, body: { code: 21212, message: "Invalid From" } } }).fetcher, creds, { ring: "+2", connect: "+2", from: "+1", say: "", lang: "en", callerStatusUrl: "u", dialResultUrl: "u" });
    expect(refused).toEqual({ ok: false, problem: "number_not_owned" });
    // 184.6 The relay's short-lived servers.
    expect(await relayServers(fetcher, creds)).toEqual([{ urls: "stun:global.stun.twilio.com:3478" }, { urls: "turn:global.turn.twilio.com:3478?transport=udp", username: "u", credential: "c" }]);
  });
});

describe("184.5 masked phone calls on the hosted API", () => {
  const ASSETS = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
  const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
  const TAHRIR = { address: "Tahrir Square, Cairo", details: "Gate 2", lat: 30.0444, lng: 31.2357 };
  const TOWER = { address: "Cairo Tower, Zamalek", lat: 30.0459, lng: 31.2243 };
  const SETTINGS: DeliverySettings = { ...DEFAULT_DELIVERY_SETTINGS, currency: "EGP", pricing: "fixed", fixedCents: 50_00, cash: true, card: false };
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let twilio: ReturnType<typeof fakeTwilio>;
  let logged: string[];

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const base = newApp(client.id, null, NOW, "delivery");
    app = { ...base, backend: "hosted", appName: "Nile Express", websiteDoneAt: NOW, connector: { kind: "deliveries" }, hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, ...base.hostedSettings, defaultCountryCode: "+20" } };
    await store.createApp(app);
    await store.saveDeliverySettings(app.id, SETTINGS, NOW);
    sender = new LogSender();
    now = NOW;
    twilio = fakeTwilio(HEALTHY);
    // Nothing about the account or the numbers is ever logged.
    logged = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logged.push(args.map(String).join(" ")));
  });
  afterEach(() => {
    for (const line of logged) for (const secret of [SECRET, ACCOUNT_SID, KEY_SID, "+201001112222", "+201005556666"]) expect(line).not.toContain(secret);
    vi.restoreAllMocks();
  });

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
      calls: { key: KEY, fetcher: twilio.fetcher, platformUrl: "https://yallapp.test", secret: SIGNING },
    }),
  });

  async function call(method: string, route: string, options: { params?: string[]; token?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(), { method, path: concrete.split("/").filter(Boolean), query: new URLSearchParams(options.query ?? {}), body: options.body, token: options.token ?? null });
    expectContract(method, route, result);
    return result;
  }

  async function signUp(phone: string, name: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+20", phone } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const device = { ...DEVICE, id: `install-${phone}` };
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get(`+20${phone}`)!, device } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    return (await call("POST", "/auth/register", { body: { signup_token: signupToken, name, device } })).body as { access_token: string; user: { id: number } };
  }

  /** Mona's parcel on its way with Karim, and phone calls set up on the owner's Twilio (tested). */
  async function scene() {
    const made = await store.createCourier({ appId: app.id, name: "Karim Mostafa", phone: "+201005556666", email: null, vehicle: null, active: true }, NOW);
    const mona = await signUp("1001112222", "Mona Adel");
    const karim = await signUp("1005556666", "Karim");
    const stranger = await signUp("1009990000", "Someone");
    const sent = await call("POST", "/delivery/shipments", {
      query: { platform: "android" },
      token: mona.access_token,
      body: { pickup: TAHRIR, dropoff: TOWER, recipient: { name: "Mona Adel", phone: "0101 555 0000" }, package: { size: "small" }, payment: "cash" },
    });
    const id = (sent.body as { shipment: { id: number } }).shipment.id;
    const courier = (made as { courier: { id: number } }).courier;
    await assignShipment({ store, app, now, account: null, courierAccount: null }, (await store.getShipment(app.id, id))!, (await store.getCourier(app.id, courier.id))!, "company");
    const saved = await saveCallSettings(store, app.id, { chat: "on", accountSid: ACCOUNT_SID, keySid: KEY_SID, secret: SECRET, number: OWNER_NUMBER }, KEY, now);
    expect(saved.ok).toBe(true);
    expect((await testCallSettings(store, app.id, KEY, twilio.fetcher, now))?.ok).toBe(true);
    expect(await saveCallSettings(store, app.id, { chat: "on", phoneCall: "on", accountSid: maskSid(ACCOUNT_SID), keySid: maskSid(KEY_SID), number: OWNER_NUMBER }, KEY, now)).toMatchObject({ ok: true, value: { phoneCall: true } });
    twilio.seen.length = 0;
    return { mona, karim, stranger, id };
  }

  const CUSTOMER = "/me/shipments/{shipment_id}";
  const COURIER = "/courier/jobs/{shipment_id}";
  const phone = (token: string, base: string, id: number) => call("POST", `${base}/contact/phone-call`, { params: [String(id)], token });

  it("rings the caller from the owner's number and connects the other side, numbers hidden from both", async () => {
    const { mona, karim, id } = await scene();
    const ways = (await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token })).body as { ways: { phone_call: boolean } };
    expect(ways.ways.phone_call).toBe(true);
    const placed = await phone(mona.access_token, CUSTOMER, id);
    expect(placed.status).toBe(202);
    expect(placed.body).toMatchObject({ kind: "phone", caller: "customer", status: "calling", ring_from: OWNER_NUMBER });
    expect(JSON.stringify(placed.body)).not.toMatch(/1001112222|5556666/);
    const form = twilio.seen.find((s) => s.url.endsWith("/Calls.json"))!.form;
    expect([form.get("To"), form.get("From")]).toEqual(["+201001112222", OWNER_NUMBER]);
    expect(form.get("Twiml")).toContain(`<Number>+201005556666</Number>`);
    expect(form.get("Twiml")).toContain("Connecting you to Karim, your courier.");
    // The log keeps no number.
    const logged = (await store.listContactCalls(app.id, id, 10))[0]!;
    expect(JSON.stringify(logged)).not.toMatch(/\+20/);
    expect(logged.providerSid).toBe("CA0123456789abcdef0123456789abcdef");

    // Twilio's callbacks, at the signed addresses only.
    const callbackOf = (leg: string) => new URL(form.get(leg === "dial" ? "Twiml" : "StatusCallback")!.match(leg === "dial" ? /action="([^"]+)"/ : /(.*)/)![1]!.replaceAll("&amp;", "&"));
    const callerUrl = callbackOf("caller");
    const dialUrl = callbackOf("dial");
    expect(callerUrl.pathname).toBe(CALLBACK_PATH);
    const back = (url: URL, fields: Record<string, string>) => handleTwilioCallback(store, url, new URLSearchParams(fields), SIGNING, now);
    expect((await back(new URL(callerUrl.toString().replace("leg=caller", "leg=dial")), { CallSid: logged.providerSid! })).status).toBe(403);
    expect((await back(callerUrl, { CallSid: logged.providerSid!, CallStatus: "in-progress" })).status).toBe(200);
    const status = () => call("GET", `${CUSTOMER}/contact/calls/{call_id}`, { params: [String(id), String(logged.id)], token: mona.access_token });
    expect((await status()).body).toMatchObject({ status: "connected" });
    const dial = await back(dialUrl, { CallSid: logged.providerSid!, DialCallStatus: "completed", DialCallDuration: "73" });
    expect([dial.status, dial.type, dial.body]).toEqual([200, "text/xml", `<?xml version="1.0" encoding="UTF-8"?><Response/>`]);
    await back(callerUrl, { CallSid: logged.providerSid!, CallStatus: "completed" });
    expect((await status()).body).toMatchObject({ status: "completed", duration_seconds: 73, ended_at: expect.any(String) });

    // The courier calls back: Mona's own account number is rung second, and Karim hears her first name.
    expect((await phone(karim.access_token, COURIER, id)).status).toBe(202);
    const back2 = twilio.seen.filter((s) => s.url.endsWith("/Calls.json")).at(-1)!.form;
    expect([back2.get("To"), back2.get("Twiml")!.includes("<Number>+201001112222</Number>"), back2.get("Twiml")!.includes("Connecting you to Mona, your customer.")]).toEqual(["+201005556666", true, true]);
  });

  it("works only for the job's two sides, while it's on its way", async () => {
    const { mona, stranger, id } = await scene();
    expect((await phone(stranger.access_token, CUSTOMER, id)).status).toBe(404);
    expect((await phone(stranger.access_token, COURIER, id)).status).toBe(403);
    expect((await call("GET", `${CUSTOMER}/contact/calls/{call_id}`, { params: [String(id), "999"], token: mona.access_token })).status).toBe(404);
    for (const status of ["picked_up", "on_the_way", "delivered"] as const) await moveShipment({ store, app, now, account: null, courierAccount: null }, (await store.getShipment(app.id, id))!, status, "courier");
    const late = await phone(mona.access_token, CUSTOMER, id);
    expect([late.status, (late.body as { code: string }).code]).toEqual([409, "phone_call_unavailable"]);
    expect(((await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token })).body as { ways: { phone_call: boolean; chat: boolean } }).ways).toMatchObject({ phone_call: false, chat: true });
    expect(twilio.seen.some((s) => s.url.endsWith("/Calls.json"))).toBe(false);
  });

  it("pauses phone calls when the account fails, offers chat in plain words, and comes back when the test passes", async () => {
    const { mona, id } = await scene();
    twilio = fakeTwilio({ ...HEALTHY, "/Calls.json": { status: 401, body: { code: 20003, message: "Authenticate" } } });
    const failed = await phone(mona.access_token, CUSTOMER, id);
    expect([failed.status, (failed.body as { code: string; message: string }).message]).toEqual([503, "Phone calls aren't available right now. Write in the chat instead."]);
    const settings = contactSettingsOf(app.id, await store.getContactSettings(app.id));
    expect(settings).toMatchObject({ phoneCall: true, phonePausedAt: now, twilioCheck: { ok: false, problem: "auth" } });
    expect(callSettingsView(settings)).toMatchObject({ pausedAt: now, check: { problem: "auth" } });
    expect(((await call("GET", `${CUSTOMER}/contact`, { params: [String(id)], token: mona.access_token })).body as { ways: { phone_call: boolean } }).ways.phone_call).toBe(false);
    expect((await phone(mona.access_token, CUSTOMER, id)).status).toBe(409);
    twilio = fakeTwilio(HEALTHY);
    expect((await testCallSettings(store, app.id, KEY, twilio.fetcher, now))?.ok).toBe(true);
    expect((await phone(mona.access_token, CUSTOMER, id)).status).toBe(202);
  });

  it("keeps one call's trouble to that call, and limits how often", async () => {
    const { mona, id } = await scene();
    twilio = fakeTwilio({ ...HEALTHY, "/Calls.json": { status: 400, body: { code: 21214, message: "To number cannot be reached" } } });
    const unreachable = await phone(mona.access_token, CUSTOMER, id);
    expect([unreachable.status, (unreachable.body as { message: string }).message]).toEqual([503, "That phone can't be reached right now. Write in the chat instead."]);
    expect((await store.getContactSettings(app.id))!.phonePausedAt ?? null).toBeNull();
    twilio = fakeTwilio(HEALTHY);
    for (let i = 0; i < 4; i += 1) expect((await phone(mona.access_token, CUSTOMER, id)).status).toBe(202);
    expect((await phone(mona.access_token, CUSTOMER, id)).status).toBe(429);
  });
});
