import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { appOtpSender, appWhatsappSender, parseAppWhatsappForm } from "@/lib/hosted/app-sender";
import { LogSender, type OtpSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import {
  chosenSignInMethods,
  emailSignInNote,
  emailSignInPossible,
  hostedSignInMethods,
  normalizeEmail,
  parseSignInMethodsChoice,
  signInMethodsChoice,
} from "@/lib/hosted/sign-in-methods";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { parseSignInCodeRequest, sendSignInCode } from "@/lib/license/sign-in-codes";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };

describe("sign-in methods", () => {
  const app = (over: Partial<App>) => ({ ...newApp("c", null, NOW, "store"), ...over }) as App;

  it("are phone until the owner chooses, and email only where accounts are Yallapp's own", () => {
    expect(hostedSignInMethods(app({ backend: "hosted" }))).toEqual(["phone"]);
    expect(chosenSignInMethods(app({ backend: "hosted" }))).toBeNull();
    const both = { signInMethods: ["phone", "email"] } as App["hostedSettings"];
    expect(hostedSignInMethods(app({ backend: "hosted", hostedSettings: both }))).toEqual(["phone", "email"]);
    expect(hostedSignInMethods(app({ backend: "hosted", connector: { kind: "catalog" }, hostedSettings: both }))).toEqual(["phone", "email"]);
    // A connected platform finds customers by their phone number.
    const shopify = app({ backend: "hosted", connector: { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "x" }, hostedSettings: both });
    expect(emailSignInPossible(shopify)).toBe(false);
    expect(hostedSignInMethods(shopify)).toEqual(["phone"]);
    expect(emailSignInPossible(app({ backend: "hosted", demo: true }))).toBe(false);
    expect(emailSignInPossible(app({ backend: "wordpress" }))).toBe(true);
    expect(emailSignInPossible(app({ backend: "custom_api" }))).toBe(false);
  });

  it("19 offer email for the course platforms, which know students by email, and say why shops stay on phone", () => {
    const both = { signInMethods: ["phone", "email"] } as App["hostedSettings"];
    const platform = (id: string, appType: App["appType"]) =>
      app({ backend: "hosted", appType, connector: { kind: "platform", platform: id, settings: {}, secretsEncrypted: "x" }, hostedSettings: both });
    for (const id of ["teachable", "thinkific"]) {
      expect(emailSignInPossible(platform(id, "lms"))).toBe(true);
      expect(hostedSignInMethods(platform(id, "lms"))).toEqual(["phone", "email"]);
      expect(emailSignInNote(platform(id, "lms"))).toMatch(/knows students by email/);
    }
    for (const id of ["ikas", "ticimax", "ideasoft"]) {
      expect(emailSignInPossible(platform(id, "store"))).toBe(false);
      expect(emailSignInNote(platform(id, "store"))).toBe("Your connected shop finds each customer's orders by their phone number, so this app signs in by phone.");
    }
    expect(emailSignInPossible(platform("simplybook", "booking"))).toBe(false);
    expect(emailSignInNote(platform("simplybook", "booking"))).toMatch(/^Your booking platform finds each customer's bookings by their phone number/);
    expect(emailSignInNote(app({ backend: "hosted", connector: { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "x" } }))).toMatch(/connected shop/);
    expect(emailSignInNote(app({ backend: "hosted", connector: { kind: "catalog" } }))).toBeNull();
    expect(emailSignInNote(app({ backend: "wordpress" }))).toBeNull();
  });

  it("read and write the form's choice", () => {
    expect(parseSignInMethodsChoice("both")).toEqual(["phone", "email"]);
    expect(parseSignInMethodsChoice("email")).toEqual(["email"]);
    expect(parseSignInMethodsChoice("sms")).toBeNull();
    expect(signInMethodsChoice(["email", "phone"])).toBe("both");
    expect(signInMethodsChoice(["email"])).toBe("email");
    expect(normalizeEmail("  Sara@Example.COM ")).toBe("sara@example.com");
    expect(normalizeEmail("nope")).toBeNull();
  });
});

describe("email sign-in on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let mails: { to: string; code: string; appName: string; minutes: number }[];
  let now: Date;
  let failMail: boolean;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      appName: "Rose Shop",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      hostedSettings: { signupAllowed: true, signupFields: ["email", "city"], defaultCountryCode: "+90", deviceLimit: 2, supportWhatsapp: null, termsUrl: null, reviewPhone: null, reviewCode: null, signInMethods: ["phone", "email"] },
    };
    await store.createApp(app);
    mails = [];
    now = NOW;
    failMail = false;
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.20",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    sendEmailCode: async (input) => {
      if (failMail) throw new Error("SMTP down");
      mails.push(input);
    },
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    ...overrides,
  });

  async function call(method: string, route: string, body?: unknown, overrides: Partial<HostedContext> = {}, token: string | null = null, query: Record<string, string> = {}): Promise<HostedResult> {
    const result = await handleHosted(context(overrides), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(query), body, token });
    expectContract(method, route, result);
    return result;
  }

  async function emailCode(email: string) {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/email/request", { email });
    expect(requested.status).toBe(200);
    return { requestId: (requested.body as { request_id: string }).request_id, code: mails.at(-1)!.code };
  }

  it("says how people sign in in /config", async () => {
    const config = await call("GET", "/config", undefined, {}, null, { platform: "android", app_version: "1.0.0" });
    expect((config.body as { auth: unknown }).auth).toMatchObject({ methods: ["phone", "email"], email_sign_in: "code" });
    app = { ...app, hostedSettings: { ...app.hostedSettings!, signInMethods: ["phone"] } };
    const phoneOnly = await call("GET", "/config", undefined, {}, null, { platform: "android", app_version: "1.0.0" });
    expect((phoneOnly.body as { auth: Record<string, unknown> }).auth.methods).toEqual(["phone"]);
    expect((phoneOnly.body as { auth: Record<string, unknown> }).auth).not.toHaveProperty("email_sign_in");
  });

  it("emails a code in the app's name, signs a new address up without asking it again, then signs it in", async () => {
    const { requestId, code } = await emailCode(" Sara@Example.com ");
    expect(mails.at(-1)).toMatchObject({ to: "sara@example.com", appName: "Rose Shop", minutes: 5 });
    expect(code).toMatch(/^\d{6}$/);
    const wrong = await call("POST", "/auth/otp/verify", { request_id: requestId, code: code === "000000" ? "111111" : "000000", device: DEVICE });
    expect(wrong).toMatchObject({ status: 400, body: { code: "invalid_code" } });
    const verified = await call("POST", "/auth/otp/verify", { request_id: requestId, code, device: DEVICE });
    expect(verified.body).toMatchObject({ signup_required: true, fields: ["name", "city"] });
    const token = (verified.body as { signup_token: string }).signup_token;
    const created = await call("POST", "/auth/register", { signup_token: token, name: "Sara", email: "other@example.com", city: "Izmir", device: DEVICE });
    expect(created.status).toBe(201);
    expect((created.body as { user: unknown }).user).toMatchObject({ name: "Sara", phone: null, email: "sara@example.com", city: "Izmir" });

    const again = await emailCode("sara@example.com");
    const signedIn = await call("POST", "/auth/otp/verify", { request_id: again.requestId, code: again.code, device: DEVICE });
    expect(signedIn.status).toBe(200);
    expect(signedIn.body).toMatchObject({ user: { email: "sara@example.com", phone: null } });

    // The address is how they sign in: it isn't changed from the app.
    const access = (signedIn.body as { access_token: string }).access_token;
    const change = await call("PATCH", "/me", { email: "evil@example.com" }, {}, access);
    expect(change.status).toBe(400);
    expect((await call("PATCH", "/me", { name: "Sara K" }, {}, access)).status).toBe(200);
  });

  it("never signs in to a phone account that only typed the address", async () => {
    const phoneUser = await store.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Phone", email: "sara@example.com", city: null, now: NOW });
    const { requestId, code } = await emailCode("sara@example.com");
    const verified = await call("POST", "/auth/otp/verify", { request_id: requestId, code, device: DEVICE });
    expect(verified.body).toMatchObject({ signup_required: true });
    expect(phoneUser?.id).toBeGreaterThan(0);
  });

  it("refuses email where the app doesn't offer it, in the preview and in demo apps", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, signInMethods: ["phone"] } };
    expect(await call("POST", "/auth/email/request", { email: "sara@example.com" })).toMatchObject({ status: 403, body: { code: "method_not_allowed" } });
    app = { ...app, hostedSettings: { ...app.hostedSettings!, signInMethods: ["email"] } };
    expect(await call("POST", "/auth/email/request", { email: "sara@example.com", preview: true })).toMatchObject({ status: 403, body: { code: "preview_review_number_only" } });
    // Email only: phone codes are refused.
    expect(await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5321234567" })).toMatchObject({ status: 403, body: { code: "method_not_allowed" } });
    expect(await call("POST", "/auth/email/request", { email: "nope" })).toMatchObject({ status: 400, body: { code: "invalid_email" } });
    expect(await call("POST", "/auth/email/request", { email: "sara@example.com" }, { app: { ...app, demo: true } })).toMatchObject({ status: 403, body: { code: "demo_number_only" } });
    expect(mails).toEqual([]);
  });

  it("limits email codes like phone codes and reports a failed email", async () => {
    await emailCode("sara@example.com");
    const soon = await call("POST", "/auth/email/request", { email: "sara@example.com" });
    expect(soon).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    for (let i = 0; i < 4; i += 1) await emailCode("sara@example.com");
    now = new Date(now.getTime() + 61_000);
    expect((await call("POST", "/auth/email/request", { email: "sara@example.com" })).status).toBe(429);
    failMail = true;
    now = new Date(now.getTime() + 61_000);
    expect(await call("POST", "/auth/email/request", { email: "other@example.com" })).toMatchObject({ status: 502, body: { code: "provider_error" } });
  });

  it("allows five attempts per email code", async () => {
    const { requestId, code } = await emailCode("sara@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i += 1) expect((await call("POST", "/auth/otp/verify", { request_id: requestId, code: wrong, device: DEVICE })).status).toBe(400);
    expect(await call("POST", "/auth/otp/verify", { request_id: requestId, code, device: DEVICE })).toMatchObject({ status: 400, body: { code: "code_expired" } });
  });
});

describe("the owner's own WhatsApp number", () => {
  function fakeWabek() {
    const calls: { url: string; key: string | null; body: Record<string, unknown> }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, key: new Headers(init.headers).get("x-api-key"), body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    return { calls, fetcher };
  }

  it("keeps the key encrypted and sends from the chosen instance", async () => {
    const saved = appWhatsappSender("app-1", "wk-live-secret-1234", "inst-7", KEY, NOW);
    expect(saved.apiKeyEncrypted).not.toContain("wk-live");
    expect(saved.keyLast4).toBe("1234");
    const { calls, fetcher } = fakeWabek();
    const sender = appOtpSender({ id: "app-1", hostedSettings: { whatsappSender: saved } as App["hostedSettings"] }, KEY, "https://waabek.test", fetcher);
    await sender!.send({ phone: "+905321234567", code: "123456", appName: "Rose Shop", expiresInSeconds: 300 });
    expect(calls[0]).toEqual({
      url: "https://waabek.test/api/v1/send",
      key: "wk-live-secret-1234",
      body: { to: "905321234567", message: "123456 is your Rose Shop code. It expires in 5 minutes. Don't share it.", type: "otp", code: "123456", instance_id: "inst-7" },
    });
    // Another app can't read it, and an app without one uses Yallapp's sender.
    expect(appOtpSender({ id: "app-2", hostedSettings: { whatsappSender: saved } as App["hostedSettings"] }, KEY, "https://waabek.test", fetcher)).toBeNull();
    expect(appOtpSender({ id: "app-1", hostedSettings: null }, KEY, "https://waabek.test", fetcher)).toBeNull();
  });

  it("checks the form", () => {
    expect(parseAppWhatsappForm({ apiKey: " wk-1 ", instanceId: "" })).toEqual({ ok: true, apiKey: "wk-1", instanceId: null });
    expect(parseAppWhatsappForm({ apiKey: "", instanceId: "a b" })).toMatchObject({ ok: false, errors: { apiKey: expect.any(String), instanceId: expect.any(String) } });
  });

  it("sends a WordPress site's codes and tells the plugin the owner's methods", async () => {
    const { store, client, licenseKey } = await setupClient();
    const saved = appWhatsappSender("x", "unused", null, KEY, NOW);
    const app: App = { ...newApp(client.id, "https://academy.test", NOW), appName: "Nour Academy", hostedSettings: null };
    await store.createApp(app);
    const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.3.1" });
    if (!site.ok) throw new Error("bad site");
    const first = await activateLicense(store, site.value, NOW);
    expect(first).toMatchObject({ status: 200, body: { sign_in_methods: null } });
    expectPlatformContract("POST", "/licenses/activate", first);

    const appSent: string[] = [];
    const platformSent: string[] = [];
    const own: OtpSender = { send: async ({ phone }) => void appSent.push(phone) };
    const yallapp: OtpSender = { send: async ({ phone }) => void platformSent.push(phone) };
    const request = parseSignInCodeRequest({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.3.1", phone: "+905321234567", code: "123456" });
    if (!request.ok) throw new Error("bad request");
    await sendSignInCode(store, request.value, { sender: yallapp, appSender: (a) => (a.hostedSettings?.whatsappSender ? own : null), secret: "s", now: NOW });
    expect(platformSent).toEqual(["+905321234567"]);

    await store.updateApp(app.id, { hostedSettings: { ...({} as App["hostedSettings"]), signInMethods: ["phone", "email"], whatsappSender: saved } as App["hostedSettings"] }, NOW);
    const later = new Date(NOW.getTime() + 60_000);
    await sendSignInCode(store, request.value, { sender: yallapp, appSender: (a) => (a.hostedSettings?.whatsappSender ? own : null), secret: "s", now: later });
    expect(appSent).toEqual(["+905321234567"]);
    const checked = await checkLicense(store, site.value, later);
    expect(checked).toMatchObject({ status: 200, body: { sign_in_methods: ["phone", "email"] } });
    expectPlatformContract("POST", "/licenses/check", checked);
  });
});
