import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { hostedSignInMethods, normalizeUsername, passwordChannels, passwordProblem, passwordSignIn, passwordSignInPossible } from "@/lib/hosted/sign-in-methods";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/** 118 Yallapp Studio apps: sign-in with a password (email, phone or username), forgotten passwords, changing it. */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const OTHER_DEVICE = { id: "install-2", platform: "ios", name: "iPhone", app_version: "1.0.0" };
const STRONG = "Nile-river-2026";

describe("118 password sign-in settings", () => {
  const app = (over: Partial<App>) => ({ ...newApp("c", null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" }, ...over }) as App;
  const saved = { passwordSignIn: { by: ["email", "username"], codes: [], recovery: "email" } } as unknown as App["hostedSettings"];

  it("work only in Yallapp Studio apps whose accounts are Yallapp's", () => {
    expect(passwordSignInPossible(app({ section: "studio" }))).toBe(true);
    expect(passwordSignInPossible(app({ section: "regular" }))).toBe(false);
    expect(passwordSignInPossible(app({}))).toBe(false);
    expect(passwordSignInPossible(app({ section: "studio", demo: true }))).toBe(false);
    expect(passwordSignInPossible(app({ section: "studio", backend: "wordpress" }))).toBe(false);
    expect(passwordSignIn(app({ section: "regular", hostedSettings: saved }))).toBeNull();
    expect(passwordSignIn(app({ section: "studio", hostedSettings: saved }))).toEqual({ by: ["email", "username"], codes: [], recovery: "email" });
  });

  it("drop email where the app's content finds people by phone, and send codes where accounts need them", () => {
    const shopify = app({ section: "studio", connector: { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "x" }, hostedSettings: saved });
    expect(passwordSignIn(shopify)).toEqual({ by: ["username"], codes: [], recovery: "phone" });
    expect(passwordChannels({ by: ["username"], codes: [], recovery: "phone" })).toEqual(["phone"]);
    expect(passwordChannels({ by: ["email", "phone"], codes: [], recovery: "email" })).toEqual(["phone", "email"]);
    expect(hostedSignInMethods(app({ section: "studio", hostedSettings: saved }))).toEqual(["email"]);
  });

  it("refuse short, common and personal passwords, and keep usernames simple", () => {
    expect(passwordProblem("short1")).toMatch(/at least 8/);
    expect(passwordProblem("aaaaaaaaaa")).toMatch(/too easy/);
    expect(passwordProblem("Password123")).toMatch(/too easy/);
    expect(passwordProblem("sara@example.com", ["sara@example.com"])).toMatch(/can't be your email/);
    expect(passwordProblem("905321234567", ["+905321234567"])).toMatch(/can't be your email/);
    expect(passwordProblem("x".repeat(129) + "y")).toMatch(/up to 128/);
    expect(passwordProblem(STRONG)).toBeNull();
    expect(normalizeUsername("  Sara.Y ")).toBe("sara.y");
    expect(normalizeUsername("1sara")).toBeNull();
    expect(normalizeUsername("ab")).toBeNull();
    expect(normalizeUsername("sara y")).toBeNull();
  });
});

describe("118 password sign-in on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let mails: { to: string; code: string }[];
  let sender: LogSender;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      section: "studio",
      appName: "Safra",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      hostedSettings: {
        signupAllowed: true,
        signupFields: [],
        defaultCountryCode: "+90",
        deviceLimit: 3,
        supportWhatsapp: null,
        termsUrl: null,
        reviewPhone: "+905550000000",
        reviewCode: "424242",
        signInMethods: ["phone", "email"],
        passwordSignIn: { by: ["email", "phone", "username"], codes: [], recovery: "email" },
      },
    };
    await store.createApp(app);
    mails = [];
    sender = new LogSender();
    now = NOW;
  });

  const context = (): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.30",
    secret: "test-hosted-secret",
    sender,
    sendEmailCode: async (input) => {
      mails.push(input);
    },
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
  });

  async function call(method: string, route: string, body?: unknown, token: string | null = null): Promise<HostedResult> {
    const result = await handleHosted(context(), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body, token });
    expectContract(method, route, result);
    return result;
  }

  async function emailCode(email: string, purpose?: "reset") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/email/request", { email });
    expect(requested.status).toBe(200);
    const requestId = (requested.body as { request_id: string }).request_id;
    return call("POST", "/auth/otp/verify", { request_id: requestId, code: mails.at(-1)!.code, device: DEVICE, ...(purpose ? { purpose } : {}) });
  }

  async function phoneCode(phone: string, purpose?: "reset") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { country_code: "+90", phone });
    expect(requested.status).toBe(200);
    const requestId = (requested.body as { request_id: string }).request_id;
    return call("POST", "/auth/otp/verify", { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE, ...(purpose ? { purpose } : {}) });
  }

  async function signUpByEmail(email: string, extra: Record<string, unknown> = {}) {
    const verified = await emailCode(email);
    expect(verified.body).toMatchObject({ signup_required: true, fields: ["name", "username", "password"] });
    return call("POST", "/auth/register", { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Layla", username: "Layla.H", password: STRONG, device: DEVICE, ...extra });
  }

  it("says what a password signs in with in /config", async () => {
    const config = await call("GET", "/config");
    expect((config.body as { auth: Record<string, unknown> }).auth).toMatchObject({
      methods: ["phone", "email"],
      password_sign_in: { by: ["email", "phone", "username"], codes: [], recovery: "email", min_length: 8 },
    });
  });

  it("signs a new address up with a username and a password after one code, then signs in with either", async () => {
    const weak = await signUpByEmail("layla@example.com", { password: "12345678" });
    expect(weak).toMatchObject({ status: 400, body: { code: "weak_password" } });
    const created = await signUpByEmail("layla@example.com");
    expect(created.status).toBe(201);
    expect((created.body as { user: unknown }).user).toMatchObject({ name: "Layla", email: "layla@example.com", username: "layla.h" });

    const byEmail = await call("POST", "/auth/password", { email: "Layla@Example.com", password: STRONG, device: DEVICE });
    expect(byEmail.status).toBe(200);
    const byUsername = await call("POST", "/auth/password", { username: "LAYLA.H", password: STRONG, device: OTHER_DEVICE });
    expect(byUsername.status).toBe(200);

    // A wrong password and an unknown account get the same answer.
    const wrong = await call("POST", "/auth/password", { email: "layla@example.com", password: "Nile-river-2027", device: DEVICE });
    const nobody = await call("POST", "/auth/password", { email: "nobody@example.com", password: STRONG, device: DEVICE });
    expect(wrong).toMatchObject({ status: 400, body: { code: "invalid_credentials" } });
    expect(nobody.body).toEqual(wrong.body);

    // Passwords only: a code doesn't sign the account in.
    const code = await emailCode("layla@example.com");
    expect(code).toMatchObject({ status: 409, body: { code: "use_password" } });
  });

  it("keeps usernames unique in the app", async () => {
    expect((await signUpByEmail("layla@example.com")).status).toBe(201);
    const verified = await emailCode("omar@example.com");
    const taken = await call("POST", "/auth/register", { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Omar", username: "layla.h", password: STRONG, device: DEVICE });
    expect(taken).toMatchObject({ status: 409, body: { code: "username_taken" } });
    const bad = await call("POST", "/auth/register", { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Omar", username: "1 omar", password: STRONG, device: DEVICE });
    expect(bad).toMatchObject({ status: 400, body: { code: "invalid_username" } });
  });

  it("sets a forgotten password again with a code, and signs the account's other phones out", async () => {
    await signUpByEmail("layla@example.com");
    const other = await call("POST", "/auth/password", { email: "layla@example.com", password: STRONG, device: OTHER_DEVICE });
    const otherRefresh = (other.body as { refresh_token: string }).refresh_token;

    const none = await emailCode("nobody@example.com", "reset");
    expect(none).toMatchObject({ status: 404, body: { code: "no_account" } });
    const verified = await emailCode("layla@example.com", "reset");
    expect(verified.status).toBe(200);
    const resetToken = (verified.body as { reset_token: string }).reset_token;
    const weak = await call("POST", "/auth/password/reset", { reset_token: resetToken, password: "password", device: DEVICE });
    expect(weak).toMatchObject({ status: 400, body: { code: "weak_password" } });
    const reset = await call("POST", "/auth/password/reset", { reset_token: resetToken, password: "Desert-wind-77", device: DEVICE });
    expect(reset.status).toBe(200);
    // The token works once.
    expect((await call("POST", "/auth/password/reset", { reset_token: resetToken, password: "Desert-wind-78", device: DEVICE })).status).toBe(400);

    expect((await call("POST", "/auth/refresh", { refresh_token: otherRefresh })).status).toBe(401);
    expect((await call("POST", "/auth/password", { email: "layla@example.com", password: STRONG, device: DEVICE })).status).toBe(400);
    expect((await call("POST", "/auth/password", { email: "layla@example.com", password: "Desert-wind-77", device: DEVICE })).status).toBe(200);
  });

  it("changes the password with the current one", async () => {
    const created = await signUpByEmail("layla@example.com");
    const token = (created.body as { access_token: string }).access_token;
    const wrong = await call("PUT", "/me/password", { current_password: "nope-nope-nope", password: "Desert-wind-77" }, token);
    expect(wrong).toMatchObject({ status: 400, body: { code: "invalid_credentials" } });
    const changed = await call("PUT", "/me/password", { current_password: STRONG, password: "Desert-wind-77" }, token);
    expect(changed.status).toBe(204);
    expect((await call("POST", "/auth/password", { username: "layla.h", password: "Desert-wind-77", device: DEVICE })).status).toBe(200);
  });

  it("lets a code sign in where the owner kept codes, and asks a phone account for a password only where it needs one", async () => {
    app = { ...app, hostedSettings: { ...app.hostedSettings!, passwordSignIn: { by: ["phone"], codes: ["phone"], recovery: "phone" }, signInMethods: ["phone"] } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    const verified = await phoneCode("5321234567");
    // A code still signs in by phone here: the password is optional to set later, so it isn't asked.
    expect(verified.body).toMatchObject({ signup_required: true, fields: ["name"] });
    const created = await call("POST", "/auth/register", { signup_token: (verified.body as { signup_token: string }).signup_token, name: "Omar", device: DEVICE });
    expect(created.status).toBe(201);
    expect((await phoneCode("5321234567")).status).toBe(200);
    // No password yet: "Forgot password" sets one.
    const reset = await phoneCode("5321234567", "reset");
    const token = (reset.body as { reset_token: string }).reset_token;
    expect((await call("POST", "/auth/password/reset", { reset_token: token, password: STRONG, device: DEVICE })).status).toBe(200);
    expect((await call("POST", "/auth/password", { country_code: "+90", phone: "532 123 45 67", password: STRONG, device: DEVICE })).status).toBe(200);
    // Email isn't one of this app's ways.
    expect((await call("POST", "/auth/password", { email: "x@example.com", password: STRONG, device: DEVICE })).body).toMatchObject({ code: "method_not_allowed" });
  });

  it("signs the store review number in with the review code as its password", async () => {
    const wrong = await call("POST", "/auth/password", { country_code: "+90", phone: "5550000000", password: "000000", device: DEVICE });
    expect(wrong).toMatchObject({ status: 400, body: { code: "invalid_credentials" } });
    const review = await call("POST", "/auth/password", { country_code: "+90", phone: "5550000000", password: "424242", device: DEVICE });
    expect(review.status).toBe(200);
    expect((review.body as { user: unknown }).user).toMatchObject({ phone: "+905550000000" });
  });

  it("waits after too many wrong passwords", async () => {
    await signUpByEmail("layla@example.com");
    for (let i = 0; i < 10; i++) {
      expect((await call("POST", "/auth/password", { email: "layla@example.com", password: `wrong-pass-${i}`, device: DEVICE })).status).toBe(400);
    }
    const limited = await call("POST", "/auth/password", { email: "layla@example.com", password: STRONG, device: DEVICE });
    expect(limited).toMatchObject({ status: 429, body: { code: "rate_limited" } });
  });

  it("refuses passwords in apps outside Yallapp Studio", async () => {
    app = { ...app, section: "regular" };
    await store.updateApp(app.id, { section: "regular" }, NOW);
    expect((await call("POST", "/auth/password", { email: "layla@example.com", password: STRONG, device: DEVICE })).body).toMatchObject({ code: "method_not_allowed" });
    const config = await call("GET", "/config");
    expect((config.body as { auth: Record<string, unknown> }).auth).not.toHaveProperty("password_sign_in");
  });
});
