import { beforeEach, describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, PasswordSignInSettings, SignInMethod } from "@/lib/data/types";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { conflictingCodes, hostedSignInMethods, passwordOwnedChannels, passwordSignIn, SIGN_IN_CLASH } from "@/lib/hosted/sign-in-methods";
import { studioRecoveryAfter, studioWaysAfter } from "@/lib/hosted/studio-ways";
import { en as signinEn } from "@/i18n/dashboard/signin";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";

/**
 * 160 The owner (18 November): with "Email address and password" or "Phone
 * number and password" the password is mandatory: the address or number is
 * checked with a code once, at sign-up, which sets a password; sign-in is
 * the password only; a forgotten one is reset with a code. Only "Phone
 * number and a code" and "Email address and a code" have no password: a
 * 6-digit code every time. A channel is a code's or a password's, never both.
 */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const STRONG = "Nile-river-2026";

describe("160 a channel is a code's or a password's", () => {
  it("names the channels a password owns: its own, and the one usernames are checked on", () => {
    expect(passwordOwnedChannels(["email"], "email")).toEqual(["email"]);
    expect(passwordOwnedChannels(["phone"], "email")).toEqual(["phone"]);
    expect(passwordOwnedChannels(["email", "phone"], "email")).toEqual(["phone", "email"]);
    expect(passwordOwnedChannels(["username"], "phone")).toEqual(["phone"]);
    expect(passwordOwnedChannels([], "email")).toEqual([]);
  });

  it("finds a code way turned on with a password on the same channel", () => {
    expect(conflictingCodes(["phone"], ["email"], "email")).toEqual([]);
    expect(conflictingCodes(["email"], ["phone"], "email")).toEqual([]);
    expect(conflictingCodes(["phone", "email"], [], "email")).toEqual([]);
    expect(conflictingCodes(["phone"], ["phone"], "email")).toEqual(["phone"]);
    expect(conflictingCodes(["email"], ["email"], "email")).toEqual(["email"]);
    expect(conflictingCodes(["email"], ["username"], "email")).toEqual(["email"]);
    expect(conflictingCodes(["email"], ["username"], "phone")).toEqual([]);
    // Each says what to turn off, in the dashboard's three languages (`known`).
    expect(Object.values(signinEn.known)).toEqual(expect.arrayContaining([SIGN_IN_CLASH.phone, SIGN_IN_CLASH.email]));
  });

  it("turns the other kind off in the dashboard's form", () => {
    expect(studioWaysAfter({ code_email: true }, "email", "password_email", true, true).on).toEqual({ code_email: false, password_email: true });
    expect(studioWaysAfter({ password_phone: true }, "email", "code_phone", true, true).on).toEqual({ password_phone: false, code_phone: true });
    // Codes on one channel and a password on the other stay together.
    expect(studioWaysAfter({ code_phone: true }, "email", "password_email", true, true).on).toEqual({ code_phone: true, code_email: false, password_email: true });
    // Usernames move off the channel a code signs in on, when the other is free.
    expect(studioWaysAfter({ code_email: true }, "email", "password_username", true, true)).toEqual({ on: { code_email: true, password_username: true }, recovery: "phone" });
    expect(studioWaysAfter({ password_username: true }, "phone", "code_phone", true, true)).toEqual({ on: { password_username: true, code_phone: true, password_phone: false }, recovery: "email" });
    // Both channels a code's: the newer choice wins.
    expect(studioWaysAfter({ code_email: true, code_phone: true }, "email", "password_username", true, true).on).toEqual({ code_email: false, code_phone: true, password_username: true });
    expect(studioWaysAfter({ code_email: true, password_username: true }, "phone", "code_phone", true, true).on).toEqual({ code_email: true, code_phone: true, password_phone: false, password_username: false });
    // No email: usernames stay on the phone, and its code goes.
    expect(studioWaysAfter({ code_phone: true }, "phone", "password_username", true, false)).toEqual({ on: { code_phone: false, password_username: true }, recovery: "phone" });
    // Usernames checked by email: the email's code way goes off.
    expect(studioRecoveryAfter({ password_username: true, code_email: true }, "email")).toEqual({ password_username: true, code_email: false });
    // Turning a way off changes nothing else.
    expect(studioWaysAfter({ code_phone: true, password_email: true }, "email", "code_phone", false, true).on).toEqual({ code_phone: false, password_email: true });
  });
});

describe("160 each sign-in way on the hosted API", () => {
  let store: MemoryStore;
  let app: App;
  let mails: { to: string; code: string }[];
  let sender: LogSender;
  let now: Date;

  async function setWays(codes: SignInMethod[], passwords: PasswordSignInSettings | null) {
    const settings = {
      ...app.hostedSettings!,
      passwordSignIn: passwords,
      signInMethods: codes.length || !passwords ? codes : [],
    };
    app = { ...app, hostedSettings: settings };
    if (passwords) app = { ...app, hostedSettings: { ...settings, signInMethods: hostedSignInMethods(app) } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
  }

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      section: "studio",
      appName: "Kech Flora",
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
        signInMethods: ["phone"],
        passwordSignIn: null,
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
    ip: "203.0.113.31",
    secret: "test-hosted-secret",
    sender,
    sendEmailCode: async (input) => {
      mails.push(input);
    },
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
  });

  async function call(method: string, route: string, body?: unknown): Promise<HostedResult> {
    const result = await handleHosted(context(), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", app_version: "1.0.0" }), body, token: null });
    expectContract(method, route, result);
    return result;
  }

  const auth = async () => ((await call("GET", "/config")).body as { auth: Record<string, unknown> }).auth;

  async function emailCode(email: string, purpose?: "reset") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/email/request", { email });
    if (requested.status !== 200) return requested;
    const requestId = (requested.body as { request_id: string }).request_id;
    return call("POST", "/auth/otp/verify", { request_id: requestId, code: mails.at(-1)!.code, device: DEVICE, ...(purpose ? { purpose } : {}) });
  }

  async function phoneCode(phone: string, purpose?: "reset") {
    now = new Date(now.getTime() + 61_000);
    const requested = await call("POST", "/auth/otp/request", { country_code: "+90", phone });
    if (requested.status !== 200) return requested;
    const requestId = (requested.body as { request_id: string }).request_id;
    return call("POST", "/auth/otp/verify", { request_id: requestId, code: sender.sent.get(`+90${phone}`)!, device: DEVICE, ...(purpose ? { purpose } : {}) });
  }

  const signupToken = (r: HostedResult) => (r.body as { signup_token: string }).signup_token;

  it("Phone number and a code: a 6-digit code on WhatsApp every time, no password", async () => {
    await setWays(["phone"], null);
    expect(await auth()).toMatchObject({ methods: ["phone"] });
    expect(await auth()).not.toHaveProperty("password_sign_in");
    const first = await phoneCode("5321234567");
    expect(first.body).toMatchObject({ signup_required: true, fields: ["name"] });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(first), name: "Omar", device: DEVICE })).status).toBe(201);
    expect((await phoneCode("5321234567")).status).toBe(200);
    expect((await call("POST", "/auth/password", { country_code: "+90", phone: "5321234567", password: STRONG, device: DEVICE })).body).toMatchObject({ code: "method_not_allowed" });
    expect((await emailCode("omar@example.com")).body).toMatchObject({ code: "method_not_allowed" });
    expect((await phoneCode("5321234567", "reset")).body).toMatchObject({ code: "method_not_allowed" });
  });

  it("Email address and a code: a 6-digit code by email every time, no password", async () => {
    await setWays(["email"], null);
    expect(await auth()).toMatchObject({ methods: ["email"], email_sign_in: "code" });
    expect(await auth()).not.toHaveProperty("password_sign_in");
    const first = await emailCode("layla@example.com");
    expect(first.body).toMatchObject({ signup_required: true, fields: ["name"] });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(first), name: "Layla", device: DEVICE })).status).toBe(201);
    expect((await emailCode("layla@example.com")).status).toBe(200);
    expect((await call("POST", "/auth/password", { email: "layla@example.com", password: STRONG, device: DEVICE })).body).toMatchObject({ code: "method_not_allowed" });
    expect((await phoneCode("5321234567")).body).toMatchObject({ code: "method_not_allowed" });
  });

  it("Email address and password: a code once at sign-up, which must set a password; then the password only; a code to reset", async () => {
    await setWays([], { by: ["email"], codes: [], recovery: "email" });
    expect(await auth()).toMatchObject({ methods: ["email"], password_sign_in: { by: ["email"], codes: [] } });
    const first = await emailCode("layla@example.com");
    expect(first.body).toMatchObject({ signup_required: true, fields: ["name", "password"] });
    // No skipping the password.
    expect((await call("POST", "/auth/register", { signup_token: signupToken(first), name: "Layla", device: DEVICE })).body).toMatchObject({ code: "weak_password" });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(first), name: "Layla", password: STRONG, device: DEVICE })).status).toBe(201);
    // A code never signs in.
    expect((await emailCode("layla@example.com")).body).toMatchObject({ code: "use_password" });
    expect((await call("POST", "/auth/password", { email: "layla@example.com", password: STRONG, device: DEVICE })).status).toBe(200);
    // Forgot password: a code by email, then the new one.
    const reset = await emailCode("layla@example.com", "reset");
    const token = (reset.body as { reset_token: string }).reset_token;
    expect((await call("POST", "/auth/password/reset", { reset_token: token, password: "Desert-wind-77", device: DEVICE })).status).toBe(200);
    expect((await call("POST", "/auth/password", { email: "layla@example.com", password: "Desert-wind-77", device: DEVICE })).status).toBe(200);
    // Not by phone.
    expect((await phoneCode("5321234567")).body).toMatchObject({ code: "method_not_allowed" });
  });

  it("Phone number and password: a WhatsApp code once at sign-up, which must set a password; then the password only; a WhatsApp code to reset", async () => {
    await setWays([], { by: ["phone"], codes: [], recovery: "phone" });
    expect(await auth()).toMatchObject({ methods: ["phone"], password_sign_in: { by: ["phone"], codes: [] } });
    const first = await phoneCode("5321234567");
    expect(first.body).toMatchObject({ signup_required: true, fields: ["name", "password"] });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(first), name: "Omar", password: "", device: DEVICE })).body).toMatchObject({ code: "weak_password" });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(first), name: "Omar", password: STRONG, device: DEVICE })).status).toBe(201);
    expect((await phoneCode("5321234567")).body).toMatchObject({ code: "use_password" });
    expect((await call("POST", "/auth/password", { country_code: "+90", phone: "532 123 45 67", password: STRONG, device: DEVICE })).status).toBe(200);
    const reset = await phoneCode("5321234567", "reset");
    expect(reset.status).toBe(200);
    expect(reset.body).toHaveProperty("reset_token");
    expect((await emailCode("omar@example.com")).body).toMatchObject({ code: "method_not_allowed" });
  });

  it("Phone number and a code with Email address and password: each channel as its own way says", async () => {
    await setWays(["phone"], { by: ["email"], codes: ["phone"], recovery: "email" });
    expect(await auth()).toMatchObject({ methods: ["phone", "email"], password_sign_in: { by: ["email"], codes: ["phone"] } });
    // The phone: a code every time, no password.
    const phone = await phoneCode("5321234567");
    expect(phone.body).toMatchObject({ signup_required: true, fields: ["name"] });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(phone), name: "Omar", device: DEVICE })).status).toBe(201);
    expect((await phoneCode("5321234567")).status).toBe(200);
    expect((await call("POST", "/auth/password", { country_code: "+90", phone: "5321234567", password: STRONG, device: DEVICE })).body).toMatchObject({ code: "method_not_allowed" });
    // The email: a password, set at sign-up; a code doesn't sign in.
    const email = await emailCode("layla@example.com");
    expect(email.body).toMatchObject({ signup_required: true, fields: ["name", "password"] });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(email), name: "Layla", password: STRONG, device: DEVICE })).status).toBe(201);
    expect((await emailCode("layla@example.com")).body).toMatchObject({ code: "use_password" });
    expect((await call("POST", "/auth/password", { email: "layla@example.com", password: STRONG, device: DEVICE })).status).toBe(200);
  });

  it("Email address and a code with Phone number and password: the reverse", async () => {
    await setWays(["email"], { by: ["phone"], codes: ["email"], recovery: "phone" });
    expect(await auth()).toMatchObject({ methods: ["phone", "email"], password_sign_in: { by: ["phone"], codes: ["email"] } });
    const email = await emailCode("layla@example.com");
    expect(email.body).toMatchObject({ signup_required: true, fields: ["name"] });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(email), name: "Layla", device: DEVICE })).status).toBe(201);
    expect((await emailCode("layla@example.com")).status).toBe(200);
    const phone = await phoneCode("5321234567");
    expect(phone.body).toMatchObject({ signup_required: true, fields: ["name", "password"] });
    expect((await call("POST", "/auth/register", { signup_token: signupToken(phone), name: "Omar", password: STRONG, device: DEVICE })).status).toBe(201);
    expect((await phoneCode("5321234567")).body).toMatchObject({ code: "use_password" });
  });

  it("Both passwords: every new account sets one, and no code signs in", async () => {
    await setWays([], { by: ["email", "phone"], codes: [], recovery: "email" });
    expect(await auth()).toMatchObject({ methods: ["phone", "email"], password_sign_in: { by: ["email", "phone"], codes: [] } });
    expect((await emailCode("layla@example.com")).body).toMatchObject({ fields: ["name", "password"] });
    expect((await phoneCode("5321234567")).body).toMatchObject({ fields: ["name", "password"] });
  });

  it("Both codes: no password anywhere", async () => {
    await setWays(["phone", "email"], null);
    expect(await auth()).toMatchObject({ methods: ["phone", "email"] });
    expect(await auth()).not.toHaveProperty("password_sign_in");
    expect((await emailCode("layla@example.com")).body).toMatchObject({ fields: ["name"] });
    expect((await phoneCode("5321234567")).body).toMatchObject({ fields: ["name"] });
  });

  it("a code and a password saved on one channel before: the password wins, and an account made with a code sets one with Forgot password", async () => {
    // As saved before 160: "Phone number and a code" with "Phone number and password".
    app = { ...app, hostedSettings: { ...app.hostedSettings!, passwordSignIn: { by: ["phone"], codes: ["phone"], recovery: "phone" }, signInMethods: ["phone"] } };
    await store.updateApp(app.id, { hostedSettings: app.hostedSettings }, NOW);
    expect(passwordSignIn(app)).toEqual({ by: ["phone"], codes: [], recovery: "phone" });
    expect(await auth()).toMatchObject({ methods: ["phone"], password_sign_in: { by: ["phone"], codes: [] } });
    // A new account sets its password.
    expect((await phoneCode("5321234567")).body).toMatchObject({ signup_required: true, fields: ["name", "password"] });
    // One made with a code before has none: the code doesn't sign it in, and says how to set one.
    await store.createHostedUser({ appId: app.id, phone: "+905329876543", name: "Old", email: null, city: null, now: NOW });
    expect((await phoneCode("5329876543")).body).toMatchObject({ code: "use_password", message: "You already have an account. Set your password with “Forgot password”, then sign in with it." });
    const reset = await phoneCode("5329876543", "reset");
    const token = (reset.body as { reset_token: string }).reset_token;
    expect((await call("POST", "/auth/password/reset", { reset_token: token, password: STRONG, device: DEVICE })).status).toBe(200);
    expect((await call("POST", "/auth/password", { country_code: "+90", phone: "5329876543", password: STRONG, device: DEVICE })).status).toBe(200);
    // The email's code with usernames checked by email, as saved before: the code goes too.
    app = { ...app, hostedSettings: { ...app.hostedSettings!, passwordSignIn: { by: ["username"], codes: ["email", "phone"], recovery: "email" } } };
    expect(passwordSignIn(app)).toEqual({ by: ["username"], codes: ["phone"], recovery: "email" });
  });
});
