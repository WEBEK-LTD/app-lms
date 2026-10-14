import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkApi, readSignIn } from "@/lib/app/api-check";
import { newApp } from "@/lib/app/setup";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { emailTemplate, placeholderErrors, renderTemplate } from "@/lib/email/templates";
import { appWhatsappSender, failureDate, recordOwnWhatsappFailure, senderWithFallback } from "@/lib/hosted/app-sender";
import { LogSender, OtpSendError, type OtpSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { hostedSettingsValues, parseHostedSettingsForm } from "@/lib/hosted/settings-form";
import { codeDeliveryText, emailOffWarning, emailOnlyUsersAtRisk } from "@/lib/hosted/sign-in-methods";
import { parseSignInCodeRequest, sendSignInCode } from "@/lib/license/sign-in-codes";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/** 19 Sign-in gaps: store review by email, failed codes leave a trace, email users and content sources, own APIs. */

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const INPUT = { phone: "+905321234567", code: "482913", appName: "Rose Shop", expiresInSeconds: 300 };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("store review by email", () => {
  let store: MemoryStore;
  let app: App;
  let mails: { to: string; code: string }[];
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      appName: "Rose Shop",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInMethods: ["email"], reviewEmail: "review@roseshop.test", reviewCode: "246810" },
    };
    await store.createApp(app);
    mails = [];
    now = NOW;
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.30",
    secret: "test-hosted-secret",
    sender: new LogSender(),
    sendEmailCode: async (input) => void mails.push(input),
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    ...overrides,
  });

  async function call(route: string, body: unknown, overrides: Partial<HostedContext> = {}): Promise<HostedResult> {
    const result = await handleHosted(context(overrides), { method: "POST", path: route.split("/").filter(Boolean), query: new URLSearchParams(), body, token: null });
    expectContract("POST", route, result);
    return result;
  }

  it("signs the review address in with the review code, without sending an email", async () => {
    const requested = await call("/auth/email/request", { email: " Review@RoseShop.test " });
    expect(requested.status).toBe(200);
    expect(mails).toEqual([]);
    const requestId = (requested.body as { request_id: string }).request_id;
    expect(await call("/auth/otp/verify", { request_id: requestId, code: "111111", device: DEVICE })).toMatchObject({ status: 400, body: { code: "invalid_code" } });
    const verified = await call("/auth/otp/verify", { request_id: requestId, code: "246810", device: DEVICE });
    expect(verified.body).toMatchObject({ signup_required: true });
    const created = await call("/auth/register", { signup_token: (verified.body as { signup_token: string }).signup_token, name: "App Review", device: DEVICE });
    expect(created.status).toBe(201);
    expect((created.body as { user: unknown }).user).toMatchObject({ email: "review@roseshop.test", phone: null });
    // Reviewers try often: the address isn't limited like a customer's.
    const again = await call("/auth/email/request", { email: "review@roseshop.test" });
    expect(again.status).toBe(200);
    const signedIn = await call("/auth/otp/verify", { request_id: (again.body as { request_id: string }).request_id, code: "246810", device: DEVICE });
    expect(signedIn.status).toBe(200);
  });

  it("is the only address the preview signs in, and needs the review code set", async () => {
    expect(await call("/auth/email/request", { email: "sara@example.com", preview: true })).toMatchObject({ status: 403, body: { code: "preview_review_number_only" } });
    expect((await call("/auth/email/request", { email: "review@roseshop.test", preview: true })).status).toBe(200);
    expect(mails).toEqual([]);
    // Without the review code it's an address like any other (a minute later: the same limits).
    app = { ...app, hostedSettings: { ...app.hostedSettings!, reviewCode: null } };
    now = new Date(now.getTime() + 61_000);
    expect((await call("/auth/email/request", { email: "review@roseshop.test" })).status).toBe(200);
    expect(mails.map((m) => m.to)).toEqual(["review@roseshop.test"]);
  });

  it("is set on App sign-in next to the review number", () => {
    const base: Record<string, string> = { ...hostedSettingsValues(DEFAULT_HOSTED_SETTINGS), defaultCountryCode: "90", deviceLimit: "2" };
    expect(base.reviewEmail).toBe("");
    const ok = parseHostedSettingsForm({ ...base, reviewEmail: " Review@RoseShop.test ", reviewCode: "246810" });
    expect(ok.ok && ok.value).toMatchObject({ reviewEmail: "review@roseshop.test", reviewPhone: null, reviewCode: "246810" });
    const bad = parseHostedSettingsForm({ ...base, reviewEmail: "review", reviewCode: "12" });
    expect(bad.ok ? null : bad.errors).toEqual({ reviewEmail: "Enter an email address, like review@your-site.com.", reviewCode: "Enter the 6-digit code reviewers type." });
    const codeOnly = parseHostedSettingsForm({ ...base, reviewCode: "246810" });
    expect(codeOnly.ok ? null : codeOnly.errors.reviewPhone).toBe("Enter the number or email address reviewers sign in with, or clear the code.");
    const cleared = parseHostedSettingsForm(base);
    expect(cleared.ok && cleared.value).toMatchObject({ reviewEmail: null, reviewCode: null });
  });
});

describe("codes that couldn't be sent", () => {
  let store: MemoryStore;
  let app: App;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      appName: "Rose Shop",
      websiteDoneAt: NOW,
      connector: { kind: "catalog" },
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInMethods: ["phone", "email"] },
    };
    await store.createApp(app);
  });

  const failing: OtpSender = {
    send: async () => {
      throw new OtpSendError("WABEK answered HTTP 404 (no connected number).");
    },
  };

  it("are logged with the provider's answer, never the code or the address", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const base: HostedContext = {
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.31",
      secret: "s",
      sender: failing,
      sendEmailCode: async () => {
        throw new Error("SMTP answered 451.");
      },
      push: false,
      assetUrl: (id) => id,
      platformUrl: "https://yallapp.test",
    };
    const phone = await handleHosted(base, { method: "POST", path: ["auth", "otp", "request"], query: new URLSearchParams(), body: { country_code: "+90", phone: "5321234567" }, token: null });
    expect(phone).toMatchObject({ status: 502, body: { code: "provider_error" } });
    const email = await handleHosted(base, { method: "POST", path: ["auth", "email", "request"], query: new URLSearchParams(), body: { email: "sara@example.com" }, token: null });
    expect(email).toMatchObject({ status: 502, body: { code: "provider_error" } });
    const lines = logged.mock.calls.map((c) => c.join(" "));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("WABEK answered HTTP 404");
    expect(lines[1]).toContain("SMTP answered 451.");
    for (const line of lines) {
      expect(line).toContain(app.id);
      expect(line).not.toMatch(/sara@example\.com|5321234567|\d{6}\b(?!-)/);
    }
  });

  it("go out once more from Yallapp's number when the owner's own number fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const platform = new LogSender();
    const failures: number[] = [];
    const sender = senderWithFallback(failing, platform, async () => void failures.push(1))!;
    await sender.send(INPUT);
    expect(platform.sent.get("+905321234567")).toBe("482913");
    expect(failures).toHaveLength(1);
    // Without Yallapp's sender the failure stands.
    await expect(senderWithFallback(failing, null, async () => {})!.send(INPUT)).rejects.toThrow("WABEK answered HTTP 404");
    // A working own number is used alone, and no own number means Yallapp's.
    const own = new LogSender();
    await senderWithFallback(own, platform, async () => void failures.push(1))!.send({ ...INPUT, phone: "+905321234568" });
    expect(own.sent.size).toBe(1);
    expect(failures).toHaveLength(1);
    expect(senderWithFallback(null, platform, async () => {})).toBe(platform);
  });

  it("are kept on the app and the owner is told at most once a day", async () => {
    const sent: { key: string; to: string; values: Record<string, string> }[] = [];
    const mail = async (key: "own_whatsapp_failed", to: string, values: Record<string, string>) => void sent.push({ key, to, values });
    // Nothing to record without an own number.
    await recordOwnWhatsappFailure({ store, now: NOW, baseUrl: "https://yallapp.test", mail }, app.id);
    expect(sent).toEqual([]);

    await store.updateApp(app.id, { hostedSettings: { ...app.hostedSettings!, whatsappSender: appWhatsappSender(app.id, "wk-1", null, KEY, NOW) } }, NOW);
    await recordOwnWhatsappFailure({ store, now: NOW, baseUrl: "https://yallapp.test", mail }, app.id);
    const later = new Date(NOW.getTime() + 3_600_000);
    await recordOwnWhatsappFailure({ store, now: later, baseUrl: "https://yallapp.test", mail }, app.id);
    expect(sent).toEqual([
      {
        key: "own_whatsapp_failed",
        to: "ada@academy.test",
        values: { name: "Ada Academy", app_name: "Rose Shop", date: "12 Oct 2026", sign_in_url: `https://yallapp.test/dashboard/open?app=${app.id}&to=app-sign-in` },
      },
    ]);
    const saved = (await store.getAppById(app.id))!.hostedSettings!;
    expect(saved.whatsappFailedAt).toBe(later.toISOString());
    expect(saved.signInMethods).toEqual(["phone", "email"]);
    await recordOwnWhatsappFailure({ store, now: new Date(NOW.getTime() + 86_400_000), baseUrl: "https://yallapp.test", mail }, app.id);
    expect(sent).toHaveLength(2);
    expect(failureDate(later.toISOString())).toBe("12 Oct 2026");
  });

  it("from a WordPress site fall back to Yallapp's number too, and are logged when nothing could send them", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { store, client, licenseKey } = await setupClient();
    const wp: App = { ...newApp(client.id, "https://academy.test", NOW), appName: "Nour Academy", hostedSettings: null };
    await store.createApp(wp);
    const request = parseSignInCodeRequest({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.3.2", phone: "+905321234567", code: "123456" });
    if (!request.ok) throw new Error("bad request");
    const { activateLicense, parseSiteInfo } = await import("@/lib/license/service");
    const site = parseSiteInfo({ license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.3.2" });
    if (!site.ok) throw new Error("bad site");
    await activateLicense(store, site.value, NOW);
    await store.updateApp(wp.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, whatsappSender: appWhatsappSender(wp.id, "wk-1", null, KEY, NOW) } }, NOW);

    const platform = new LogSender();
    const failed: string[] = [];
    const result = await sendSignInCode(store, request.value, {
      sender: platform,
      appSender: () => failing,
      onAppSenderFailed: async (a) => void failed.push(a.id),
      secret: "s",
      now: NOW,
    });
    expect(result).toEqual({ status: 204 });
    expect(platform.sent.get("+905321234567")).toBe("123456");
    expect(failed).toHaveLength(1);

    const nothing = await sendSignInCode(store, request.value, { sender: null, appSender: () => failing, secret: "s", now: new Date(NOW.getTime() + 60_000) });
    expect(nothing).toMatchObject({ status: 502, body: { code: "provider_error" } });
    const lines = logged.mock.calls.map((c) => c.join(" "));
    expect(lines.some((l) => l.includes("[sign-in codes] code not sent") && l.includes("WABEK answered HTTP 404"))).toBe(true);
    expect(lines.join("\n")).not.toContain("123456");
  });

  it("have an email to the owner that the team can edit", () => {
    const template = emailTemplate("own_whatsapp_failed")!;
    expect(placeholderErrors(template.subject, template)).toEqual([]);
    expect(placeholderErrors(template.body, template)).toEqual([]);
    const email = renderTemplate(template, { name: "Ada", app_name: "Rose Shop", date: "12 Oct 2026", sign_in_url: "https://x.test/open", yallapp_whatsapp: "+90" });
    expect(email.subject).toBe("Rose Shop: your WhatsApp number couldn't send sign-in codes");
    expect(email.text).toContain("On 12 Oct 2026, your own WhatsApp number couldn't send a sign-in code for Rose Shop.");
    expect(email.text).toContain("https://x.test/open");
  });
});

describe("email users and content sources", () => {
  it("counts the customers a connected platform would lock out", async () => {
    const { store, client } = await setupClient();
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" } };
    await store.createApp(app);
    await store.createHostedUser({ appId: app.id, phone: null, name: "Sara", email: "sara@example.com", city: null, now: NOW });
    await store.createHostedUser({ appId: app.id, phone: "+905321234567", name: "Mert", email: "mert@example.com", city: null, now: NOW });
    expect(await store.countHostedEmailOnlyUsers(app.id)).toBe(1);
    expect(await emailOnlyUsersAtRisk(store, app)).toBe(1);
    // Already on a platform (phone only), or not on the hosted API: nothing more to lose.
    expect(await emailOnlyUsersAtRisk(store, { ...app, connector: { kind: "shopify", shopDomain: "x.myshopify.com", storefrontTokenEncrypted: "x" } })).toBe(0);
    expect(await emailOnlyUsersAtRisk(store, { ...app, backend: "custom_api", connector: null })).toBe(0);
    expect(emailOffWarning(1)).toMatch(/^1 customer signed up with their email address\. .*couldn't sign in any more\.$/);
    expect(emailOffWarning(1200)).toMatch(/^1,200 customers signed up/);
  });

  it("says how customers get their code in the setup", () => {
    expect(codeDeliveryText(["phone"])).toBe("a code we send to their phone");
    expect(codeDeliveryText(["email"])).toBe("a code we send to their email address");
    expect(codeDeliveryText(["phone", "email"])).toBe("a code we send to their phone or email address");
    expect(codeDeliveryText([])).toBe("a code we send to their phone");
  });
});

describe("API check of sign-in", () => {
  const config = (auth: Record<string, unknown> = {}) => ({
    site: { name: "Ada Shop", url: "https://shop.test" },
    branding: { primary_color: "#0E0D24" },
    features: { lms: null, push: false },
    auth: { signup_allowed: true, signup_fields: ["name"], default_country_code: "+90", ...auth },
    purchases: { enroll_button: false, free_enrollment: false },
    content: { block_screen_capture: false, watermark: "off", embed_fullscreen_button: false, embed_height: "auto" },
    app: { update_required: false, maintenance: false },
    store: { currency: "TRY" },
  });
  const error = [400, { code: "invalid_request", message: "Missing." }] as const;

  function fakeApi(routes: Record<string, readonly [number, unknown]>) {
    const calls: string[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      const path = url.replace("https://api.shop.test/v1", "").split("?")[0]!;
      calls.push(`${init?.method ?? "GET"} ${path}`);
      const [status, body] = routes[`${init?.method ?? "GET"} ${path}`] ?? [404, { code: "not_found", message: "Not found." }];
      return new Response(JSON.stringify(body), { status });
    };
    return { fetcher, calls, resolve: async () => ["93.184.216.34"] };
  }

  it("reads auth.methods and email_sign_in", () => {
    expect(readSignIn({})).toEqual({ ok: true, value: { methods: ["phone"], emailSignIn: null, previewSignIn: false } });
    expect(readSignIn({ methods: ["email"], email_sign_in: "password", preview_sign_in: true })).toEqual({
      ok: true,
      value: { methods: ["email"], emailSignIn: "password", previewSignIn: true },
    });
    expect(readSignIn({ methods: ["phone"], email_sign_in: "code" })).toMatchObject({ ok: true, value: { emailSignIn: null } });
    expect(readSignIn({ methods: [] })).toMatchObject({ ok: false });
    expect(readSignIn({ methods: ["sms"] })).toMatchObject({ ok: false });
    expect(readSignIn({ methods: ["phone", "phone"] })).toMatchObject({ ok: false });
    expect(readSignIn({ methods: "phone" })).toMatchObject({ ok: false });
    expect(readSignIn({ methods: ["email"] })).toEqual({ ok: false, problems: ['auth.email_sign_in ("code" or "password", needed with email)'] });
    expect(readSignIn({ methods: ["phone"], email_sign_in: "magic" })).toEqual({ ok: false, problems: ['auth.email_sign_in ("code" or "password")'] });
  });

  it("probes only the sign-in endpoints the API offers", async () => {
    const emailCode = fakeApi({ "GET /config": [200, config({ methods: ["email"], email_sign_in: "code" })], "GET /store/home": [200, { sections: [] }], "POST /auth/email/request": error });
    const result = await checkApi("https://api.shop.test/v1", "store", emailCode);
    expect(result.ok).toBe(true);
    expect(emailCode.calls).toEqual(["GET /config", "GET /store/home", "POST /auth/email/request"]);
    expect(result.signIn).toEqual({ methods: ["email"], emailSignIn: "code", previewSignIn: false });

    const both = fakeApi({
      "GET /config": [200, config({ methods: ["phone", "email"], email_sign_in: "password" })],
      "GET /store/home": [200, { sections: [] }],
      "POST /auth/otp/request": error,
    });
    const mixed = await checkApi("https://api.shop.test/v1", "store", both);
    expect(both.calls).toEqual(["GET /config", "GET /store/home", "POST /auth/otp/request", "POST /auth/password"]);
    expect(mixed.checks.map((c) => [c.id, c.ok])).toContainEqual(["errors", true]);
    const password = mixed.checks.find((c) => c.id === "password_errors")!;
    expect(password).toMatchObject({ ok: false, label: "POST /auth/password errors use the contract's shape" });
    expect(password.detail).toBe("POST /auth/password answered 404. Serve it, or don't offer this sign-in in /config.");
  });

  it("fails sign-in settings that aren't the contract's, and probes phone then", async () => {
    const api = fakeApi({ "GET /config": [200, config({ methods: ["email"] })], "GET /store/home": [200, { sections: [] }], "POST /auth/otp/request": error });
    const result = await checkApi("https://api.shop.test/v1", "store", api);
    expect(result.ok).toBe(false);
    expect(result.checks.find((c) => c.id === "config")!.detail).toContain("auth.email_sign_in");
    expect(result.signIn).toBeUndefined();
    expect(api.calls.at(-1)).toBe("POST /auth/otp/request");
  });
});
