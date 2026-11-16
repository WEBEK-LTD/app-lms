import { createServer, type Http2Server } from "node:http2";
import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { decrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import {
  apnsPayload,
  checkApnsKey,
  forgetApnsTokens,
  http2TransportFor,
  keyIdFromFileName,
  parseApnsKey,
  PROBE_DEVICE_TOKEN,
  providerToken,
  sendApnsPush,
  type ApnsCredentials,
  type ApnsEnvironment,
  type ApnsRequest,
  type ApnsResponse,
  type ApnsTransport,
} from "@/lib/hosted/apns";
import { serviceAccountOf } from "@/lib/hosted/notify";
import { pushTarget, sendPush, type ServiceAccount } from "@/lib/hosted/push";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext } from "@/lib/hosted/service";
import { apnsCredentialsOf, apnsDirectOn, apnsKeyApplies, apnsKeyContext, readApnsKey, readApnsKeyForm, yallappPushSetup } from "@/lib/integrations/apns-key";
import { expectContract } from "./contract";
import { NOW } from "./helpers";

const KEY = Buffer.alloc(32, 7);
const P8 = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const CREDENTIALS: ApnsCredentials = { keyId: "ABCDE12345", teamId: "TEAM123456", privateKey: P8, bundleId: "com.nile.shop", roleBundleIds: { courier: "com.nile.shop.courier" } };
const TOKEN_A = "a".repeat(64);
const TOKEN_B = "b".repeat(64);
const TOKEN_C = "c".repeat(64);

type Answer = ApnsResponse | Error;

/** A fake APNs: answers by server and device token, and keeps every request. */
function fakeApns(answer: (environment: ApnsEnvironment, request: ApnsRequest) => Answer) {
  const requests: { environment: ApnsEnvironment; request: ApnsRequest }[] = [];
  let opened = 0;
  let closed = 0;
  const transport: ApnsTransport = (environment) => {
    opened += 1;
    return {
      send: async (request) => {
        requests.push({ environment, request });
        const result = answer(environment, request);
        if (result instanceof Error) throw result;
        return result;
      },
      close: () => {
        closed += 1;
      },
    };
  };
  return { transport, requests, counts: () => ({ opened, closed }) };
}

const tokenOf = (request: ApnsRequest) => request.path.split("/").pop()!;

afterEach(() => forgetApnsTokens());

describe("136.20 the APNs key", () => {
  it("reads the Key ID from Apple's file name", () => {
    expect(keyIdFromFileName("AuthKey_ABCDE12345.p8")).toBe("ABCDE12345");
    expect(keyIdFromFileName("C:\\Downloads\\authkey_abcde12345.p8")).toBe("ABCDE12345");
    expect(keyIdFromFileName("AuthKey_ABCDE12345 (1).p8")).toBeNull();
    expect(keyIdFromFileName("key.p8")).toBeNull();
  });

  it("takes only a P-256 private key in PEM", () => {
    expect(parseApnsKey(P8).ok).toBe(true);
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    expect(parseApnsKey(rsa)).toEqual({ ok: false, reason: "not_p256" });
    const p384 = generateKeyPairSync("ec", { namedCurve: "secp384r1" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    expect(parseApnsKey(p384)).toEqual({ ok: false, reason: "not_p256" });
    expect(parseApnsKey("-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----")).toEqual({ ok: false, reason: "not_pem" });
    expect(parseApnsKey("{}")).toEqual({ ok: false, reason: "not_pem" });
  });

  it("signs the provider token as Apple asks (ES256, kid, iss, iat)", () => {
    const token = providerToken(CREDENTIALS, NOW);
    const [header, claims, signature] = token.split(".");
    expect(JSON.parse(Buffer.from(header!, "base64url").toString())).toEqual({ alg: "ES256", kid: "ABCDE12345" });
    expect(JSON.parse(Buffer.from(claims!, "base64url").toString())).toEqual({ iss: "TEAM123456", iat: Math.floor(NOW.getTime() / 1000) });
    const signatureBytes = Buffer.from(signature!, "base64url");
    expect(signatureBytes.length).toBe(64);
    expect(verify("sha256", Buffer.from(`${header}.${claims}`), { key: createPublicKey(P8), dsaEncoding: "ieee-p1363" }, signatureBytes)).toBe(true);
  });
});

describe("136.20 checking the key with Apple", () => {
  it("calls BadDeviceToken a good key: one push of nothing to a token no phone has", async () => {
    const apns = fakeApns(() => ({ status: 400, reason: "BadDeviceToken" }));
    const check = await checkApnsKey(CREDENTIALS, { transport: apns.transport, now: NOW });
    expect(check).toEqual({ ok: true, environment: "production", status: 400, reason: "BadDeviceToken" });
    expect(apns.requests).toHaveLength(1);
    const { environment, request } = apns.requests[0]!;
    expect(environment).toBe("production");
    expect(request.path).toBe(`/3/device/${PROBE_DEVICE_TOKEN}`);
    expect(request.headers["apns-topic"]).toBe("com.nile.shop");
    expect(request.headers["apns-push-type"]).toBe("background");
    expect(request.headers.authorization).toMatch(/^bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    expect(JSON.parse(request.body)).toEqual({ aps: { "content-available": 1 } });
    expect(apns.counts()).toEqual({ opened: 1, closed: 1 });
  });

  it("tells a refused key, a key for Sandbox only, another team's bundle, and no answer", async () => {
    const refused = fakeApns(() => ({ status: 403, reason: "InvalidProviderToken" }));
    expect(await checkApnsKey(CREDENTIALS, { transport: refused.transport })).toEqual({ ok: false, problem: "rejected", status: 403, reason: "InvalidProviderToken" });
    // Tried on the sandbox server too, to tell a Sandbox-only key.
    expect(refused.requests.map((r) => r.environment)).toEqual(["production", "sandbox"]);

    const sandboxOnly = fakeApns((environment) => (environment === "production" ? { status: 403, reason: "InvalidProviderToken" } : { status: 400, reason: "BadDeviceToken" }));
    expect(await checkApnsKey(CREDENTIALS, { transport: sandboxOnly.transport })).toMatchObject({ ok: false, problem: "sandbox_only" });

    const topic = fakeApns(() => ({ status: 400, reason: "TopicDisallowed" }));
    expect(await checkApnsKey(CREDENTIALS, { transport: topic.transport })).toEqual({ ok: false, problem: "topic", status: 400, reason: "TopicDisallowed" });
    expect(topic.requests).toHaveLength(1);

    const down = fakeApns(() => new Error("ECONNREFUSED"));
    expect(await checkApnsKey(CREDENTIALS, { transport: down.transport })).toEqual({ ok: false, problem: "unreachable", status: null, reason: null });
    expect(down.counts()).toEqual({ opened: 1, closed: 1 });

    const odd = fakeApns(() => ({ status: 500, reason: "InternalServerError" }));
    expect(await checkApnsKey(CREDENTIALS, { transport: odd.transport })).toMatchObject({ ok: false, problem: "unexpected", reason: "InternalServerError" });
  });
});

describe("136.21 sending to APNs", () => {
  const message = { title: "Order on its way", body: "Your parcel left the shop.", data: { type: "shipment_update", shipment_id: "12", aps: "not ours" } };

  it("has the FCM message's meaning: the alert, a sound, the data at the top and Firebase's message ID", () => {
    expect(apnsPayload(message, "m-1")).toEqual({
      type: "shipment_update",
      shipment_id: "12",
      aps: { alert: { title: "Order on its way", body: "Your parcel left the shop." }, sound: "default" },
      "gcm.message_id": "m-1",
    });
  });

  it("sends each token, drops the gone ones, keeps the ones Apple couldn't take now", async () => {
    const apns = fakeApns((environment, request) => {
      const token = tokenOf(request);
      if (token === TOKEN_A) return { status: 200, reason: null };
      if (token === TOKEN_B) return { status: 410, reason: "Unregistered" };
      if (token === TOKEN_C) return { status: 429, reason: "TooManyRequests" };
      return { status: 503, reason: "ServiceUnavailable" };
    });
    const d = "d".repeat(64);
    const result = await sendApnsPush(CREDENTIALS, [{ token: TOKEN_A }, { token: TOKEN_B }, { token: TOKEN_C }, { token: d }, { token: "not-hex" }], message, { transport: apns.transport, now: NOW });
    expect(result).toEqual({ sent: 1, invalidTokens: ["not-hex", TOKEN_B], failed: 2, keyRefused: false });
    expect(apns.requests.map((r) => r.environment)).toEqual(["production", "production", "production", "production"]);
    const first = apns.requests[0]!.request;
    expect(first.headers["apns-topic"]).toBe("com.nile.shop");
    expect(first.headers["apns-push-type"]).toBe("alert");
    expect(first.headers["apns-priority"]).toBe("10");
    expect(Number(first.headers["apns-expiration"])).toBe(Math.floor(NOW.getTime() / 1000) + 28 * 86_400);
    expect(JSON.parse(first.body)).toMatchObject({ aps: { alert: { title: "Order on its way" } }, type: "shipment_update" });
    // One connection for the batch, closed at the end; one provider token for all.
    expect(apns.counts()).toEqual({ opened: 1, closed: 1 });
    expect(new Set(apns.requests.map((r) => r.request.headers.authorization)).size).toBe(1);
  });

  it("tries a development build's token on the sandbox server before dropping it", async () => {
    const apns = fakeApns((environment, request) => {
      if (environment === "production") return { status: 400, reason: "BadDeviceToken" };
      return tokenOf(request) === TOKEN_A ? { status: 200, reason: null } : { status: 400, reason: "BadDeviceToken" };
    });
    const result = await sendApnsPush(CREDENTIALS, [{ token: TOKEN_A }, { token: TOKEN_B }], message, { transport: apns.transport, now: NOW });
    expect(result.sent).toBe(1);
    expect(result.invalidTokens).toEqual([TOKEN_B]);
    expect(apns.counts()).toEqual({ opened: 2, closed: 2 });
  });

  it("sends a second app's token to its own bundle ID", async () => {
    const apns = fakeApns(() => ({ status: 200, reason: null }));
    await sendApnsPush(CREDENTIALS, [{ token: TOKEN_A, role: "courier" }, { token: TOKEN_B, role: "customer" }, { token: TOKEN_C, role: null }], message, { transport: apns.transport, now: NOW });
    expect(apns.requests.map((r) => r.request.headers["apns-topic"])).toEqual(["com.nile.shop.courier", "com.nile.shop", "com.nile.shop"]);
  });

  it("stops when Apple refuses the key, and signs a new token once when it's expired", async () => {
    const refused = fakeApns(() => ({ status: 403, reason: "InvalidProviderToken" }));
    const many = Array.from({ length: 45 }, (_, i) => ({ token: i.toString(16).padStart(64, "0") }));
    const result = await sendApnsPush(CREDENTIALS, many, message, { transport: refused.transport, now: NOW });
    expect(result.keyRefused).toBe(true);
    expect(result.sent).toBe(0);
    expect(result.invalidTokens).toEqual([]);
    // The first 20 at once, then no more.
    expect(refused.requests.length).toBe(20);

    let calls = 0;
    const expired = fakeApns(() => (++calls === 1 ? { status: 403, reason: "ExpiredProviderToken" } : { status: 200, reason: null }));
    const again = await sendApnsPush(CREDENTIALS, [{ token: TOKEN_A }], message, { transport: expired.transport, now: NOW });
    expect(again.sent).toBe(1);
    expect(expired.requests).toHaveLength(2);
  });

  it("goes through node:http2 (a local HTTP/2 server standing in for Apple)", async () => {
    const seen: { path: string; topic: string; auth: string; body: unknown }[] = [];
    const server: Http2Server = createServer();
    server.on("stream", (stream, headers) => {
      let body = "";
      stream.setEncoding("utf8");
      stream.on("data", (chunk: string) => (body += chunk));
      stream.on("end", () => {
        const path = String(headers[":path"]);
        seen.push({ path, topic: String(headers["apns-topic"]), auth: String(headers.authorization), body: JSON.parse(body) });
        if (path.endsWith(TOKEN_A)) {
          stream.respond({ ":status": 200, "apns-id": "id-1" });
          stream.end();
        } else {
          stream.respond({ ":status": 410, "content-type": "application/json" });
          stream.end(JSON.stringify({ reason: "Unregistered", timestamp: 1 }));
        }
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const transport = http2TransportFor({ production: origin, sandbox: origin });
      const result = await sendApnsPush(CREDENTIALS, [{ token: TOKEN_A }, { token: TOKEN_B }], message, { transport, now: NOW });
      expect(result).toEqual({ sent: 1, invalidTokens: [TOKEN_B], failed: 0, keyRefused: false });
      expect(seen.map((s) => s.path).sort()).toEqual([`/3/device/${TOKEN_A}`, `/3/device/${TOKEN_B}`]);
      expect(seen[0]!.topic).toBe("com.nile.shop");
      expect(seen[0]!.auth.startsWith("bearer ")).toBe(true);
      // Its answer to the made-up token (Unregistered) also means the key and topic passed.
      const check = await checkApnsKey(CREDENTIALS, { transport, now: NOW });
      expect(check).toEqual({ ok: true, environment: "production", status: 410, reason: "Unregistered" });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    // Nothing listens there any more: no answer.
    expect(await checkApnsKey(CREDENTIALS, { transport: http2TransportFor({ production: origin, sandbox: origin }) })).toMatchObject({ ok: false, problem: "unreachable" });
  });
});

describe("136.21 sendPush hands APNs tokens to Apple", () => {
  const message = { title: "Hi", body: "There", data: { type: "announcement" } };

  it("sends apns tokens with the client's key, never to FCM", async () => {
    const apns = fakeApns(() => ({ status: 200, reason: null }));
    const fcm: string[] = [];
    const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (href.includes("oauth2")) return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
      fcm.push((JSON.parse(String(init?.body)) as { message: { token: string } }).message.token);
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const account: ServiceAccount = { project_id: "p", client_email: "push@p.test", private_key: rsa, apns: CREDENTIALS };
    const targets = [pushTarget({ pushToken: "fcm-token", pushProvider: "fcm" }), pushTarget({ pushToken: TOKEN_A, pushProvider: "apns", appRole: "courier" })];
    expect(targets[1]).toEqual({ token: TOKEN_A, provider: "apns", role: "courier" });
    const result = await sendPush(account, targets, message, { fetcher, now: NOW, apnsTransport: apns.transport });
    expect(result.sent).toBe(2);
    expect(fcm).toEqual(["fcm-token"]);
    expect(apns.requests.map((r) => [tokenOf(r.request), r.request.headers["apns-topic"]])).toEqual([[TOKEN_A, "com.nile.shop.courier"]]);

    // Without the key, APNs tokens are skipped (as Huawei ones without Push Kit), and FCM isn't asked at all.
    const none = await sendPush({ ...account, apns: null }, [targets[1]!], message, { fetcher: (async () => { throw new Error("no FCM"); }) as typeof fetch });
    expect(none).toEqual({ sent: 0, invalidTokens: [] });
  });
});

describe("136.20 the app's key", () => {
  const appWith = (patch: Partial<App> = {}): App => ({ ...newApp("client-1", null, NOW, "store"), id: "app-1", backend: "hosted", iosBundleId: "com.nile.shop", ...patch });

  it("is for hosted iPhone apps whose notifications Yallapp sets up, and turns direct APNs on once saved", () => {
    expect(apnsKeyApplies(appWith())).toBe(true);
    expect(apnsKeyApplies(appWith({ iosBundleId: null }))).toBe(false);
    expect(apnsKeyApplies(appWith({ backend: "wordpress" }))).toBe(false);
    // Own Firebase (a service account of the client's): unchanged.
    expect(yallappPushSetup(appWith({ firebaseServiceAccountEncrypted: "sealed" }))).toBe(false);
    expect(apnsKeyApplies(appWith({ firebaseServiceAccountEncrypted: "sealed" }))).toBe(false);
    // Phase 1's mode wins over a service account left from before.
    expect(yallappPushSetup({ ...appWith({ firebaseServiceAccountEncrypted: "sealed" }), pushSetup: "yallapp" } as App)).toBe(true);
    expect(apnsDirectOn(appWith())).toBe(false);
    expect(apnsDirectOn(appWith({ apnsKeyEncrypted: "sealed", apnsKeyId: "ABCDE12345", apnsTeamId: "TEAM123456" }))).toBe(true);
  });

  it("checks the key with Apple, saves it encrypted, and gives sendPush the credentials", async () => {
    const app = appWith({ appleTeamId: "TEAM123456" });
    const apns = fakeApns(() => ({ status: 400, reason: "BadDeviceToken" }));
    const file = { name: "AuthKey_ABCDE12345.p8", text: P8, size: P8.length };
    // The Key ID from the file name, the Team ID from the iOS build.
    const result = await readApnsKey(app, { file, keyId: "", teamId: "" }, { key: KEY, transport: apns.transport, now: NOW });
    expect(result).toMatchObject({ ok: true, keyId: "ABCDE12345", teamId: "TEAM123456", message: "Apple accepted the key for com.nile.shop. iPhones with your latest app now get notifications straight from Apple." });
    if (!result.ok || !result.patch) throw new Error("not saved");
    expect(result.patch.apnsKeyEncrypted).not.toContain("PRIVATE KEY");
    expect(decrypt(result.patch.apnsKeyEncrypted!, KEY, apnsKeyContext(app.id))).toBe(P8.trim());
    const saved = { ...app, ...result.patch } as App;
    expect(apnsCredentialsOf(saved, KEY)).toMatchObject({ keyId: "ABCDE12345", teamId: "TEAM123456", bundleId: "com.nile.shop", roleBundleIds: { courier: "com.nile.shop.courier", driver: "com.nile.shop.driver", vendor: "com.nile.shop.vendor", staff: "com.nile.shop.staff" } });
    // Bound to its app: another app's row can't open it.
    expect(apnsCredentialsOf({ ...saved, id: "app-2" }, KEY)).toBeNull();
    // serviceAccountOf carries it next to the Firebase account.
    expect(serviceAccountOf(saved, KEY)).toBeNull();
  });

  it("says what's wrong, and what Apple answered", async () => {
    const app = appWith();
    const ok = fakeApns(() => ({ status: 400, reason: "BadDeviceToken" }));
    expect(await readApnsKey(app, { file: null, keyId: "", teamId: "" }, { key: KEY, transport: ok.transport })).toEqual({ ok: true, patch: null });
    expect(await readApnsKey(app, { file: null, keyId: "abcde12345", teamId: "" }, { key: KEY, transport: ok.transport })).toMatchObject({
      ok: false,
      errors: { apnsKeyFile: "Upload your APNs key (.p8).", apnsTeamId: "Enter your 10-character Team ID." },
    });
    const notKey = { name: "AuthKey_ABCDE12345.p8", text: "hello", size: 5 };
    expect(await readApnsKey(app, { file: notKey, keyId: "", teamId: "TEAM123456" }, { key: KEY, transport: ok.transport })).toMatchObject({ ok: false, errors: { apnsKeyFile: expect.stringContaining("This isn't an APNs key") } });
    const file = { name: "key.p8", text: P8, size: P8.length };
    expect(await readApnsKey(app, { file, keyId: "", teamId: "TEAM123456" }, { key: KEY, transport: ok.transport })).toMatchObject({ ok: false, errors: { apnsKeyId: "Enter the key's 10-character Key ID." } });
    expect(ok.requests).toHaveLength(0);

    const refused = fakeApns(() => ({ status: 403, reason: "InvalidProviderToken" }));
    expect(await readApnsKey(app, { file, keyId: "ABCDE12345", teamId: "TEAM123456" }, { key: KEY, transport: refused.transport })).toMatchObject({
      ok: false,
      errors: { apnsKeyFile: "Apple didn't accept this key (InvalidProviderToken). Check the Key ID and Team ID, and that the key has Apple Push Notifications service (APNs) turned on." },
    });
    const down = fakeApns(() => new Error("offline"));
    expect(await readApnsKey(app, { file, keyId: "ABCDE12345", teamId: "TEAM123456" }, { key: KEY, transport: down.transport })).toMatchObject({
      ok: false,
      errors: { apnsKeyFile: "We couldn't reach Apple to check the key. Try again in a few minutes." },
    });
  });

  it("reads the form, and leaves own-Firebase apps alone", async () => {
    const form = new FormData();
    form.set("apnsKeyFile", new File([P8], "AuthKey_ABCDE12345.p8"));
    form.set("apnsTeamId", "team123456");
    const apns = fakeApns(() => ({ status: 400, reason: "BadDeviceToken" }));
    const read = await readApnsKeyForm(appWith(), form, { key: KEY, transport: apns.transport });
    expect(read.errors).toEqual({});
    expect(read.patch).toMatchObject({ apnsKeyId: "ABCDE12345", apnsTeamId: "TEAM123456" });
    const own = await readApnsKeyForm(appWith({ firebaseServiceAccountEncrypted: "sealed" }), form, { key: KEY, transport: apns.transport });
    expect(own).toEqual({ patch: {}, errors: {}, values: {}, message: null });
    expect(apns.requests).toHaveLength(1);
  });
});

describe("136.21 the app registers its APNs token", () => {
  it("offers features.apns and takes provider apns only when the app sends iPhone pushes straight to Apple", async () => {
    const store = new MemoryStore();
    const app: App = { ...newApp("client-1", null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" }, iosBundleId: "com.nile.shop" };
    await store.createApp(app);
    const sender = new LogSender();
    const call = async (apns: boolean, method: string, route: string, options: { body?: unknown; token?: string | null } = {}) => {
      const context: HostedContext = { store, app, active: true, now: NOW, ip: "203.0.113.9", country: "EG", secret: "test-hosted-secret", sender, push: true, apns, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" };
      const [pathPart, queryPart] = route.split("?");
      const result = await handleHosted(context, { method, path: pathPart!.split("/").filter(Boolean), query: new URLSearchParams(queryPart ?? ""), body: options.body, token: options.token ?? null });
      expectContract(method, pathPart!, result);
      return result;
    };
    const features = async (apns: boolean) => ((await call(apns, "GET", "/config?platform=ios&app_version=2.0.0")).body as { features: Record<string, unknown> }).features;
    expect((await features(true)).apns).toBe(true);
    expect((await features(false)).apns).toBeUndefined();

    const requested = await call(true, "POST", "/auth/otp/request", { body: { country_code: "+20", phone: "1005557777" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const device = { id: "install-iphone", platform: "ios", name: "iPhone 16", app_version: "2.0.0" };
    const verified = (await call(true, "POST", "/auth/otp/verify", { body: { request_id: requestId, code: sender.sent.get("+201005557777")!, device } })).body as { signup_token?: string; access_token?: string };
    const token = verified.access_token ?? ((await call(true, "POST", "/auth/register", { body: { signup_token: verified.signup_token, name: "Mona", device } })).body as { access_token: string }).access_token;

    expect((await call(false, "PUT", "/me/push-token", { token, body: { token: TOKEN_A, provider: "apns" } })).status).toBe(400);
    expect((await call(true, "PUT", "/me/push-token", { token, body: { token: TOKEN_A, provider: "apns", role: "customer" } })).status).toBe(204);
    expect((await call(true, "PUT", "/me/push-token", { token, body: { token: TOKEN_A, provider: "pigeon" } })).status).toBe(400);
    const [saved] = await store.listAppHostedDevices(app.id);
    expect(saved).toMatchObject({ pushToken: TOKEN_A, pushProvider: "apns", appRole: "customer" });
    expect(pushTarget(saved!)).toEqual({ token: TOKEN_A, provider: "apns", role: "customer" });
  });
});
