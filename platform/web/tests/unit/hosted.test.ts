import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { newApp, buildConfigFor, websiteReady } from "@/lib/app/setup";
import { decodeJwt, encodeJwt } from "@/lib/hosted/jwt";
import { announce } from "@/lib/hosted/notify";
import { LogSender, waabekSender, webhookSender, whatsappSender } from "@/lib/hosted/otp-sender";
import { parseAnyPhone, parsePhone } from "@/lib/hosted/phone";
import { parseServiceAccount } from "@/lib/hosted/push";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { hostedSettingsValues, parseHostedSettingsForm } from "@/lib/hosted/settings-form";
import { validateBuildConfig } from "@/lib/build-config/validate";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";
import { connectorFor, shopifyConnectorConfig } from "@/lib/hosted/connectors";
import { platformConnectorConfig, platformDefinition } from "@/lib/hosted/connectors/platforms";
import { ConnectorError, type Connector } from "@/lib/hosted/connectors/types";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

describe("phone numbers", () => {
  it("refuses numbers that don't exist and drops a 0 typed after the country code", () => {
    // A typo for +90 544 673 19 42: +95 (Myanmar) 446731942 isn't a valid number there.
    expect(parseAnyPhone("+95446731942", "+90")).toBeNull();
    expect(parseAnyPhone("+90 0544 673 19 42", "+90")?.e164).toBe("+905446731942");
    expect(parseAnyPhone("0090 544 673 19 42", "+20")?.e164).toBe("+905446731942");
    expect(parseAnyPhone("+20 100 123 4567", "+90")?.e164).toBe("+201001234567");
    expect(parseAnyPhone("+20 1001234", "+90")).toBeNull();
    expect(parsePhone("+90", "123 456 7890")).toBeNull();
    expect(parsePhone("+999", "5321234567")).toBeNull();
  });

  it("parses like the plugin", () => {
    expect(parsePhone("+90", "0532 123 45 67")?.e164).toBe("+905321234567");
    expect(parsePhone("+90", "+90 532 123 45 67")?.e164).toBe("+905321234567");
    expect(parsePhone("90", "00905321234567")?.e164).toBe("+905321234567");
    expect(parsePhone("+90", "123")).toBeNull();
    expect(parsePhone("", "5321234567")).toBeNull();
    expect(parseAnyPhone("+20 100 123 4567", "+90")?.e164).toBe("+201001234567");
    expect(parseAnyPhone("5321234567", "+90")?.e164).toBe("+905321234567");
  });
});

describe("access tokens", () => {
  const claims = { aud: "app-1", sub: 7, did: "device-1", iat: 1000, exp: 2000 };
  it("decode what they encode, for the same app and before expiry", () => {
    const token = encodeJwt(claims, "secret");
    expect(decodeJwt(token, "secret", "app-1", 1500)).toEqual(claims);
    expect(decodeJwt(token, "secret", "app-2", 1500)).toBeNull();
    expect(decodeJwt(token, "secret", "app-1", 2000)).toBeNull();
    expect(decodeJwt(token, "other", "app-1", 1500)).toBeNull();
    expect(decodeJwt(`${token}x`, "secret", "app-1", 1500)).toBeNull();
  });
});

describe("hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;
  let ip: string;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Rose Shop", websiteDoneAt: NOW };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
    ip = "203.0.113.9";
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip,
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    ...overrides,
  });

  async function call(
    method: string,
    route: string,
    options: { body?: unknown; token?: string | null; query?: Record<string, string>; params?: string[] } = {},
    overrides: Partial<HostedContext> = {},
  ): Promise<HostedResult> {
    let concrete = route;
    for (const param of options.params ?? []) concrete = concrete.replace(/\{[^}]+\}/, param);
    const result = await handleHosted(context(overrides), {
      method,
      path: concrete.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    expectContract(method, route, result);
    return result;
  }

  async function signIn(phone = "5321234567", device = DEVICE) {
    // Past the resend wait of the previous code.
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    expect(requested.status).toBe(200);
    const requestId = (requested.body as { request_id: string }).request_id;
    const code = sender.sent.get(`+90${phone}`)!;
    return call("POST", "/auth/otp/verify", { body: { request_id: requestId, code, device } });
  }

  async function signUp(phone = "5321234567", device = DEVICE) {
    const verified = await signIn(phone, device);
    const token = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: token, name: "Sara Yilmaz", device } });
    expect(registered.status).toBe(201);
    return registered.body as { access_token: string; refresh_token: string; user: { id: number } };
  }

  it("serves the configuration", async () => {
    const result = await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } });
    expect(result.status).toBe(200);
    const body = result.body as { site: { name: string; url: string }; features: { lms: null; push: boolean }; auth: { signup_fields: string[] } };
    expect(body.site).toMatchObject({ name: "Rose Shop", url: "https://yallapp.test" });
    expect(body.features).toMatchObject({ lms: null, push: false });
    expect(body.auth.signup_fields).toEqual(["name"]);
    expect((await call("GET", "/config", { query: { platform: "web", app_version: "1" } })).status).toBe(400);
  });

  it("20 sends the app's vertical, null without one or for a value it doesn't know", async () => {
    const vertical = async () => ((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } })).body as { vertical: unknown }).vertical;
    expect(await vertical()).toBeNull();
    app = { ...app, vertical: "restaurant" };
    expect(await vertical()).toBe("restaurant");
    app = { ...app, vertical: "salon" as never };
    expect(await vertical()).toBeNull();
  });

  it("19 still serves the configuration when the connected platform fails, and logs it without secrets", async () => {
    const logged: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => void logged.push(args.map(String).join(" ")));
    onTestFinished(() => spy.mockRestore());
    for (const failure of [new ConnectorError("Shopify answered HTTP 503."), new TypeError("Cannot read properties of undefined")]) {
      const connector: Connector = {
        config: async () => {
          throw failure;
        },
        handle: async () => null,
      };
      const result = await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } }, { connector });
      expect(result.status).toBe(200);
      const body = result.body as Record<string, unknown>;
      expect(body.site).toMatchObject({ name: "Rose Shop" });
      expect(body.features).toMatchObject({ orders: false });
      expect(body.store).toBeUndefined();
    }
    expect(logged).toHaveLength(2);
    expect(logged[0]).toContain(`app ${app.id}`);
    expect(logged[0]).toContain("Shopify answered HTTP 503.");
    expect(logged[1]).toContain("TypeError");
  });

  it("19 logs a connected platform whose saved keys can't be read", async () => {
    const logged: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => void logged.push(args.map(String).join(" ")));
    onTestFinished(() => spy.mockRestore());
    const deps = { store, assetUrl: (id: string) => id, platformUrl: "https://yallapp.test" };
    const shopify = { ...app, connector: shopifyConnectorConfig(app.id, "rose.myshopify.com", "storefront-secret-token", KEY) };
    expect(connectorFor(shopify, KEY, deps)).not.toBeNull();
    expect(connectorFor(shopify, Buffer.alloc(32, 9), deps)).toBeNull();
    const ikas = { ...app, connector: platformConnectorConfig(app.id, platformDefinition("ikas")!, { store: "rose", clientId: "id", clientSecret: "ikas-secret" }, KEY) };
    expect(connectorFor(ikas, Buffer.alloc(32, 9), deps)).toBeNull();
    expect(connectorFor({ ...app, connector: { kind: "platform", platform: "nope", settings: {}, secretsEncrypted: "x" } }, KEY, deps)).toBeNull();
    expect(logged).toEqual([
      expect.stringContaining("the saved Shopify token can't be decrypted"),
      expect.stringContaining("the saved ikas keys can't be decrypted"),
      expect.stringContaining('unknown platform "nope"'),
    ]);
    expect(logged.join(" ")).not.toMatch(/storefront-secret-token|ikas-secret/);
  });

  it("answers only for hosted apps with an active account", async () => {
    expect((await handleHosted(context({ app: { ...app, backend: "wordpress" } }), { method: "GET", path: ["config"], query: new URLSearchParams(), body: undefined, token: null })).status).toBe(404);
    const inactive = await call("GET", "/config", { query: { platform: "android", app_version: "1" } }, { active: false });
    expect(inactive).toMatchObject({ status: 503, body: { code: "license_inactive" } });
  });

  it("signs a new customer up, then signs them in again", async () => {
    const verified = await signIn();
    expect(verified.body).toMatchObject({ signup_required: true, fields: ["name"] });
    const session = await signUp("5321234568");
    expect(session.user).toMatchObject({ name: "Sara Yilmaz" });

    const again = await signIn("5321234568");
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ user: { id: session.user.id, phone: "+905321234568" } });
  });

  it("asks for the fields the business wants", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, signupFields: ["email", "city"] } as App["hostedSettings"] };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    const verified = await signIn();
    expect(verified.body).toMatchObject({ fields: ["name", "email", "city"] });
    const token = (verified.body as { signup_token: string }).signup_token;
    const missing = await call("POST", "/auth/register", { body: { signup_token: token, name: "Sara", email: "nope", device: DEVICE } });
    expect(missing).toMatchObject({ status: 400, body: { code: "invalid_request" } });
    const ok = await call("POST", "/auth/register", {
      body: { signup_token: token, name: "Sara", email: "sara@example.com", city: "Istanbul", device: DEVICE },
    });
    expect(ok.status).toBe(201);
  });

  it("rejects wrong and expired codes", async () => {
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } });
    const requestId = (requested.body as { request_id: string }).request_id;
    const wrong = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: "000000x", device: DEVICE } });
    expect(wrong.body).toMatchObject({ code: "invalid_code" });
    for (let i = 0; i < 4; i++) await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: "1", device: DEVICE } });
    const right = sender.sent.get("+905321234567")!;
    const tooMany = await call("POST", "/auth/otp/verify", { body: { request_id: requestId, code: right, device: DEVICE } });
    expect(tooMany.body).toMatchObject({ code: "code_expired" });

    now = new Date(NOW.getTime() + 61_000);
    const again = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } });
    now = new Date(NOW.getTime() + 61_000 + 301_000);
    const late = await call("POST", "/auth/otp/verify", {
      body: { request_id: (again.body as { request_id: string }).request_id, code: sender.sent.get("+905321234567")!, device: DEVICE },
    });
    expect(late.body).toMatchObject({ code: "code_expired" });
  });

  it("limits how often codes are sent", async () => {
    await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } });
    const soon = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } });
    expect(soon).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    expect((soon.body as { retry_after_seconds: number }).retry_after_seconds).toBeGreaterThan(0);
    expect((await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "12" } })).body).toMatchObject({
      code: "invalid_phone",
    });
  });

  it("reports a code that couldn't be sent", async () => {
    const failing = { send: async () => Promise.reject(new Error("down")) };
    const result = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } }, { sender: failing });
    expect(result).toMatchObject({ status: 502, body: { code: "provider_error" } });
    const none = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234569" } }, { sender: null });
    expect(none.status).toBe(502);
  });

  it("lets the app store review number in with the review code, without sending anything", async () => {
    const settings = { ...app.hostedSettings, reviewPhone: "+905550000000", reviewCode: "246810" } as App["hostedSettings"];
    app = { ...app, hostedSettings: settings };
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5550000000" } });
    expect(sender.sent.size).toBe(0);
    const verified = await call("POST", "/auth/otp/verify", {
      body: { request_id: (requested.body as { request_id: string }).request_id, code: "246810", device: DEVICE },
    });
    expect(verified.body).toMatchObject({ signup_required: true });
  });

  it("keeps the account, devices and limit", async () => {
    const session = await signUp();
    const me = await call("GET", "/me", { token: session.access_token });
    expect(me.body).toMatchObject({ name: "Sara Yilmaz", phone: "+905321234567", email: null });
    const updated = await call("PATCH", "/me", { token: session.access_token, body: { name: "Sara Y.", city: "Izmir" } });
    expect(updated.body).toMatchObject({ name: "Sara Y.", city: "Izmir" });
    expect((await call("PATCH", "/me", { token: session.access_token, body: { email: "x" } })).status).toBe(400);

    await signIn("5321234567", { ...DEVICE, id: "install-2", platform: "ios" });
    const third = await signIn("5321234567", { ...DEVICE, id: "install-3" });
    expect(third).toMatchObject({ status: 403, body: { code: "device_limit_reached" } });

    const devices = await call("GET", "/me/devices", { token: session.access_token });
    const list = devices.body as { items: { id: string; current: boolean }[]; limit: number };
    expect(list.limit).toBe(2);
    expect(list.items).toHaveLength(2);
    const other = list.items.find((d) => !d.current)!;
    expect((await call("DELETE", "/me/devices/{device_id}", { token: session.access_token, params: [other.id] })).status).toBe(204);
    expect((await call("DELETE", "/me/devices/{device_id}", { token: session.access_token, params: [other.id] })).status).toBe(404);
    expect((await signIn("5321234567", { ...DEVICE, id: "install-3" })).status).toBe(200);
  });

  it("rotates refresh tokens and signs out", async () => {
    const session = await signUp();
    const refreshed = await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } });
    expect(refreshed.status).toBe(200);
    expect((await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).status).toBe(401);

    const tokens = refreshed.body as { access_token: string; refresh_token: string };
    expect((await call("POST", "/auth/logout", { token: tokens.access_token })).status).toBe(204);
    expect((await call("GET", "/me", { token: tokens.access_token })).status).toBe(401);
    expect((await call("POST", "/auth/refresh", { body: { refresh_token: tokens.refresh_token } })).status).toBe(401);
    expect((await call("GET", "/me", {})).status).toBe(401);
  });

  it("access tokens expire and don't work for another app", async () => {
    const session = await signUp();
    const issued = now;
    now = new Date(issued.getTime() + 901_000);
    expect((await call("GET", "/me", { token: session.access_token })).status).toBe(401);
    now = issued;
    expect((await call("GET", "/me", { token: session.access_token }, { app: { ...app, id: "other-app" } })).status).toBe(401);
  });

  it("delivers notifications to the inbox and by push", async () => {
    const session = await signUp();
    expect((await call("PUT", "/me/push-token", { token: session.access_token, body: { token: "fcm-1", preferences: { announcements: true } } })).status).toBe(204);
    const pushed: unknown[][] = [];
    const sent = await announce({
      store,
      app,
      title: "New arrivals",
      body: "Fresh tulips today.",
      account: { project_id: "rose", client_email: "push@rose.iam", private_key: "-----BEGIN PRIVATE KEY-----" },
      now: new Date(NOW.getTime() + 1000),
      send: async (_account, tokens) => {
        pushed.push(tokens);
        return { sent: 0, invalidTokens: ["fcm-1"] };
      },
    });
    expect(pushed).toEqual([["fcm-1"]]);
    expect(sent.pushError).toBeNull();
    expect(await store.listHostedPushDevices(app.id, null)).toHaveLength(0);

    now = new Date(NOW.getTime() + 2000);
    const inbox = await call("GET", "/me/notifications", { token: session.access_token });
    expect(inbox.body).toMatchObject({ total: 1, unread_count: 1, items: [{ title: "New arrivals", type: "announcement", read: false }] });
    expect((await call("POST", "/me/notifications/read", { token: session.access_token })).status).toBe(204);
    const read = await call("GET", "/me/notifications", { token: session.access_token });
    expect(read.body).toMatchObject({ unread_count: 0, items: [{ read: true }] });

    const withoutPush = await announce({ store, app, title: "Hi", body: "There", account: null, now });
    expect(withoutPush.pushError).toMatch(/Push is off/);
  });

  it("36 keeps where a push token is from and sends Huawei tokens as Huawei's", async () => {
    const session = await signUp();
    const bad = await call("PUT", "/me/push-token", { token: session.access_token, body: { token: "hms-1", provider: "apns" } });
    expect(bad.status).toBe(400);
    expect((await call("PUT", "/me/push-token", { token: session.access_token, body: { token: "hms-1", provider: "hms", preferences: { announcements: true } } })).status).toBe(204);
    expect((await store.listHostedPushDevices(app.id, null)).map((d) => [d.pushToken, d.pushProvider])).toEqual([["hms-1", "hms"]]);
    const pushed: unknown[][] = [];
    await announce({
      store,
      app,
      title: "New arrivals",
      body: "Fresh tulips today.",
      account: { project_id: "rose", client_email: "push@rose.iam", private_key: "-----BEGIN PRIVATE KEY-----" },
      now: new Date(NOW.getTime() + 1000),
      send: async (_account, targets) => {
        pushed.push(targets);
        return { sent: 1, invalidTokens: [] };
      },
    });
    expect(pushed).toEqual([[{ token: "hms-1", provider: "hms" }]]);
    // Without a provider (older apps) the token is Firebase's again.
    expect((await call("PUT", "/me/push-token", { token: session.access_token, body: { token: "fcm-9" } })).status).toBe(204);
    expect((await store.listHostedPushDevices(app.id, null)).map((d) => [d.pushToken, d.pushProvider])).toEqual([["fcm-9", "fcm"]]);
  });

  it("deletes the account", async () => {
    const session = await signUp();
    expect((await call("DELETE", "/me", { token: session.access_token })).status).toBe(204);
    expect((await call("GET", "/me", { token: session.access_token })).status).toBe(401);
    expect(await store.getHostedUserByPhone(app.id, "+905321234567")).toBeNull();
  });

  it("doesn't serve content endpoints yet", async () => {
    const result = await handleHosted(context(), { method: "GET", path: ["store", "home"], query: new URLSearchParams(), body: undefined, token: null });
    expect(result).toMatchObject({ status: 404, body: { code: "not_found" } });
  });

  it("goes in the build config as the API address", () => {
    process.env.APP_URL = "https://yallapp.test";
    onTestFinished(() => {
      delete process.env.APP_URL;
    });
    const config = buildConfigFor(app, { id: app.clientId }, { name: "1.0.0", code: 1 }, (id) => `https://x/${id}`);
    expect(config.api_base_url).toBe(`https://yallapp.test/api/app/${app.id}`);
    // 19 Moved to the hosted API by our team, but nothing serves content yet: the Website step stays open.
    expect(websiteReady(app)).toBe(false);
    expect(websiteReady({ ...app, connector: { kind: "catalog" } })).toBe(true);
    const valid = validateBuildConfig({ ...config, app_name: "Rose", short_name: "Rose", site_url: "https://rose.test", android_package: "com.rose.app", ios_bundle_id: "com.rose.app" });
    expect(valid.ok ? [] : valid.errors).toEqual([]);
  });
});

describe("code senders", () => {
  it("send WhatsApp authentication templates", async () => {
    const requests: { url: string; body: unknown }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(String(init.body)) });
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    await whatsappSender({ kind: "whatsapp", accessToken: "t", phoneNumberId: "123", template: "yallapp_code", language: "en" }, fetcher).send({
      phone: "+905321234567",
      code: "481902",
      appName: "Rose",
      expiresInSeconds: 300,
    });
    expect(requests[0]!.url).toBe("https://graph.facebook.com/v21.0/123/messages");
    expect(requests[0]!.body).toMatchObject({ to: "905321234567", template: { name: "yallapp_code", components: [{ parameters: [{ text: "481902" }] }, { sub_type: "url" }] } });
  });

  it("sign webhook bodies and fail on errors", async () => {
    let signature = "";
    const ok = (async (_url: string, init: RequestInit) => {
      signature = new Headers(init.headers).get("x-yallapp-signature") ?? "";
      return new Response("", { status: 202 });
    }) as unknown as typeof fetch;
    const sender = webhookSender({ kind: "webhook", url: "https://sms.test/send", secret: "s" }, ok);
    await sender.send({ phone: "+905321234567", code: "1", appName: "Rose", expiresInSeconds: 300 });
    expect(signature).toMatch(/^sha256=/);
    const down = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    await expect(webhookSender({ kind: "webhook", url: "https://sms.test/send", secret: "s" }, down).send({ phone: "+1", code: "1", appName: "R", expiresInSeconds: 1 })).rejects.toThrow();
  });

  it("send through WABEK from the chosen number", async () => {
    const calls: { url: string; key: string | null; body: Record<string, unknown> }[] = [];
    const answers: Response[] = [];
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, key: new Headers(init.headers).get("x-api-key"), body: JSON.parse(String(init.body)) });
      return answers.shift()!;
    }) as unknown as typeof fetch;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    const input = { phone: "+201234567890", code: "481902", appName: "Nile Homes", expiresInSeconds: 300 };

    answers.push(json({ success: true, message_id: "wamid.1" }));
    await waabekSender({ kind: "waabek", apiKey: "wk-test", baseUrl: "https://waabek.test", instanceId: "inst-2" }, fake).send(input);
    expect(calls[0]).toEqual({
      url: "https://waabek.test/api/v1/send",
      key: "wk-test",
      body: { to: "201234567890", message: "481902 is your Nile Homes code. It expires in 5 minutes. Don't share it.", type: "otp", code: "481902", instance_id: "inst-2" },
    });

    // Without an instance, WABEK picks the account's connected number.
    answers.push(json({ success: true }));
    await waabekSender({ kind: "waabek", apiKey: "wk-test", baseUrl: "https://waabek.test", instanceId: null }, fake).send(input);
    expect(calls[1]!.body).not.toHaveProperty("instance_id");

    // WABEK's reason reaches the admin's test.
    const wabek = waabekSender({ kind: "waabek", apiKey: "wk-test", baseUrl: "https://waabek.test", instanceId: "inst-2" }, fake);
    answers.push(json({ error: "No connected WhatsApp instance" }, 404));
    await expect(wabek.send(input)).rejects.toThrow("WABEK answered HTTP 404 (No connected WhatsApp instance).");
    answers.push(json({ error: "Invalid API key" }, 401));
    await expect(wabek.send(input)).rejects.toThrow("WABEK answered HTTP 401 (Invalid API key).");
    answers.push(json({ error: "Failed to deliver message outside the 24h window", detail: "Configure OTP Template Name." }, 422));
    await expect(wabek.send(input)).rejects.toThrow("HTTP 422 (Failed to deliver message outside the 24h window: Configure OTP Template Name.)");
    answers.push(new Response("<html>bad gateway</html>", { status: 502 }));
    await expect(wabek.send(input)).rejects.toThrow("WABEK answered HTTP 502.");
  });

  it("recognise a Firebase service account", () => {
    expect(parseServiceAccount(JSON.stringify({ project_id: "p", client_email: "e", private_key: "-----BEGIN PRIVATE KEY-----\nx" }))).toMatchObject({ project_id: "p" });
    expect(parseServiceAccount("{}")).toBeNull();
    expect(parseServiceAccount("not json")).toBeNull();
  });
});

describe("App sign-in form", () => {
  const base = {
    signupAllowed: "on",
    askEmail: "",
    askCity: "on",
    defaultCountryCode: "90",
    deviceLimit: "3",
    supportWhatsapp: "0532 123 45 67",
    termsUrl: "https://shop.test/terms",
    reviewPhone: "555 000 00 01",
    reviewCode: "246810",
  };

  it("turns the form into hosted settings", () => {
    const parsed = parseHostedSettingsForm(base);
    expect(parsed).toEqual({
      ok: true,
      value: {
        signupAllowed: true,
        signupFields: ["city"],
        defaultCountryCode: "+90",
        deviceLimit: 3,
        supportWhatsapp: "+905321234567",
        termsUrl: "https://shop.test/terms",
        reviewPhone: "+905550000001",
        reviewEmail: null,
        reviewCode: "246810",
      },
    });
    if (parsed.ok) expect(parseHostedSettingsForm(hostedSettingsValues(parsed.value))).toEqual(parsed);
  });

  it("refuses bad values", () => {
    const parsed = parseHostedSettingsForm({
      ...base,
      defaultCountryCode: "0",
      deviceLimit: "11",
      termsUrl: "http://shop.test/terms",
      reviewCode: "12",
    });
    expect(parsed.ok).toBe(false);
    // Without a valid default country code, numbers typed without one can't be read either.
    if (!parsed.ok) {
      expect(Object.keys(parsed.errors).sort()).toEqual(["defaultCountryCode", "deviceLimit", "reviewCode", "reviewPhone", "supportWhatsapp", "termsUrl"]);
    }
    const noPhone = parseHostedSettingsForm({ ...base, reviewPhone: "" });
    expect(noPhone.ok ? null : noPhone.errors.reviewPhone).toBe("Enter the number or email address reviewers sign in with, or clear the code.");
    const off = parseHostedSettingsForm({ ...base, reviewPhone: "", reviewCode: "", supportWhatsapp: "", termsUrl: "", signupAllowed: "" });
    expect(off.ok && off.value).toMatchObject({ signupAllowed: false, reviewPhone: null, reviewCode: null, supportWhatsapp: null, termsUrl: null });
  });
});
