import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/sign-in-codes/send/route";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { getStore } from "@/lib/data";
import type { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_HOSTED_SETTINGS, type App, type AppMailServer } from "@/lib/data/types";
import {
  AppMailError,
  appMailFormValues,
  appMailServer,
  appMailTarget,
  checkMailHost,
  explainMailError,
  fromWithName,
  mailerWithFallback,
  parseAppMailForm,
  recordOwnMailFailure,
  sendThroughServer,
  type AppMailFormValues,
  type MailMessage,
  type SmtpTarget,
} from "@/lib/email/app-mail";
import { MAIL_PRESETS, presetOfHost } from "@/lib/email/app-mail-presets";
import { emailTemplate, placeholderErrors, renderTemplate } from "@/lib/email/templates";
import { encryptionKey } from "@/lib/env";
import { activateLicense, checkLicense, parseSiteInfo } from "@/lib/license/service";
import { parseSignInCodeRequest, sendSignInCode, signInCodesSentToday, type SignInCodeMailer } from "@/lib/license/sign-in-codes";
import { KEY, NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

/** 24 Your app's own email: the form, the SSRF checks, sending with a fake transport, the fallback and email codes for WordPress. */

afterEach(() => {
  vi.restoreAllMocks();
});

const FORM: AppMailFormValues = {
  sender: "own",
  preset: "google",
  host: "smtp.gmail.com",
  port: "465",
  security: "ssl",
  username: "hello@nour.test",
  password: "abcd efgh ijkl mnop",
  fromName: "Nour Academy",
  fromAddress: "hello@nour.test",
  replyTo: "",
};

const PUBLIC = async () => ["142.250.1.108"];
const MESSAGE: MailMessage = { to: "sara@example.com", subject: "482913 is your Nour Academy code", text: "Your code is 482913." };

function savedServer(appId: string, overrides: Partial<AppMailServer> = {}): AppMailServer {
  const parsed = parseAppMailForm(FORM, { production: true, saved: null });
  if (!parsed.ok || parsed.sender !== "own") throw new Error("bad form");
  return { ...appMailServer(appId, parsed.server, parsed.password, null, KEY, NOW), ...overrides };
}

/** A transport that keeps what it was asked to send, or fails like nodemailer would. */
function fakeTransport(error?: unknown) {
  const sent: { target: SmtpTarget; message: MailMessage }[] = [];
  return {
    sent,
    transport: async (target: SmtpTarget, message: MailMessage) => {
      if (error) throw error;
      sent.push({ target, message });
    },
  };
}

describe("the form", () => {
  it("keeps Yallapp, or takes a Google mailbox with an app password", () => {
    expect(parseAppMailForm({ ...FORM, sender: "yallapp", host: "" }, { production: true, saved: null })).toEqual({ ok: true, sender: "yallapp" });
    const parsed = parseAppMailForm({ ...FORM, host: " SMTP.Gmail.com ", fromAddress: "Hello@Nour.test" }, { production: true, saved: null });
    expect(parsed).toEqual({
      ok: true,
      sender: "own",
      server: { preset: "google", host: "smtp.gmail.com", port: 465, security: "ssl", username: "hello@nour.test", fromName: "Nour Academy", fromAddress: "hello@nour.test", replyTo: null },
      password: "abcd efgh ijkl mnop",
      warnings: [],
    });
  });

  it("refuses what can't work, in plain words", () => {
    const errors = (values: Partial<AppMailFormValues>, options: { production?: boolean; saved?: AppMailServer | null } = {}) => {
      const parsed = parseAppMailForm({ ...FORM, ...values }, { production: options.production ?? true, saved: options.saved ?? null });
      return parsed.ok ? {} : parsed.errors;
    };
    expect(errors({ sender: "" })).toHaveProperty("sender");
    expect(errors({ host: "" }).host).toMatch(/^Enter the email server/);
    for (const host of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.1.10", "mail.localhost", "[::1]", "::1"]) expect(errors({ host }).host, host).toMatch(/local or private/);
    expect(errors({ host: "not a host" }).host).toMatch(/server name like/);
    for (const port of ["22", "80", "3306", "", "abc"]) expect(errors({ port }).port, port).toBe("Use port 465, 587, 25 or 2525.");
    expect(errors({ port: "2525", security: "starttls" })).toEqual({});
    expect(errors({ security: "none" }).security).toMatch(/must be encrypted/);
    expect(errors({ security: "none" }, { production: false })).toEqual({});
    expect(errors({ security: "plain" }).security).toMatch(/^Choose the security/);
    expect(errors({ username: "" }).username).toMatch(/^Enter the username/);
    expect(errors({ password: "" }).password).toMatch(/^Enter the password/);
    expect(errors({ fromName: "" }).fromName).toMatch(/^Enter the name/);
    expect(errors({ fromName: 'Nour "Academy"' }).fromName).toMatch(/without/);
    expect(errors({ fromAddress: "hello" }).fromAddress).toMatch(/valid email address/);
    expect(errors({ replyTo: "nope" }).replyTo).toMatch(/valid email address/);
  });

  it("keeps the saved password when the field is blank, and warns about another domain", () => {
    const saved = savedServer("app-1");
    const parsed = parseAppMailForm({ ...FORM, password: "", fromAddress: "news@other.test" }, { production: true, saved });
    expect(parsed.ok && parsed.sender === "own" && parsed.password).toBeNull();
    expect(parsed.ok && parsed.sender === "own" && parsed.warnings[0]).toMatch(/^The From address \(news@other\.test\) isn't at the same domain as the username \(hello@nour\.test\)\. Some email services refuse/);
    if (!parsed.ok || parsed.sender !== "own") return;
    const kept = appMailServer("app-1", parsed.server, null, saved, KEY, NOW);
    expect(kept.passwordEncrypted).toBe(saved.passwordEncrypted);
    expect(() => appMailServer("app-1", parsed.server, null, null, KEY, NOW)).toThrow();
  });

  it("stores the password encrypted for this app only, and never puts it back in the form", () => {
    const saved = savedServer("app-1");
    expect(JSON.stringify(saved)).not.toContain("abcd efgh");
    const app = { id: "app-1", appName: "Nour Academy", hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, mailServer: saved } };
    expect(appMailTarget(app, KEY)).toMatchObject({ host: "smtp.gmail.com", port: 465, password: "abcd efgh ijkl mnop", from: { name: "Nour Academy", address: "hello@nour.test" } });
    // Another app's context or key can't read it.
    expect(appMailTarget({ ...app, id: "app-2" }, KEY)).toBeNull();
    expect(appMailTarget(app, Buffer.alloc(32, 9))).toBeNull();
    expect(appMailFormValues(app)).toMatchObject({ sender: "own", preset: "google", password: "", username: "hello@nour.test" });
    expect(appMailFormValues({ appName: "Rose Shop", hostedSettings: null })).toMatchObject({ sender: "yallapp", host: "smtp.gmail.com", port: "465", fromName: "Rose Shop" });
  });

  it("has the presets owners know, each with steps", () => {
    expect(MAIL_PRESETS.map((p) => [p.id, p.host, p.ports.map((x) => `${x.port}/${x.security}`)])).toEqual([
      ["google", "smtp.gmail.com", ["465/ssl", "587/starttls"]],
      ["microsoft", "smtp.office365.com", ["587/starttls"]],
      ["zoho", "smtp.zoho.com", ["465/ssl", "587/starttls"]],
      ["zoho_eu", "smtp.zoho.eu", ["465/ssl", "587/starttls"]],
      ["yandex", "smtp.yandex.com", ["465/ssl"]],
      ["custom", "", []],
    ]);
    for (const preset of MAIL_PRESETS) expect(preset.steps.length).toBeGreaterThan(1);
    expect(MAIL_PRESETS[0]!.steps.join(" ")).toContain("App passwords");
    expect(MAIL_PRESETS[1]!.steps.join(" ")).toContain("Authenticated SMTP");
    expect(presetOfHost("SMTP.zoho.eu")).toBe("zoho_eu");
    expect(presetOfHost("mail.example.com")).toBe("custom");
  });
});

describe("connecting", () => {
  it("connects only to public addresses on the email ports", async () => {
    await expect(checkMailHost("smtp.gmail.com", 465, PUBLIC)).resolves.toBe("142.250.1.108");
    await expect(checkMailHost("smtp.gmail.com", 22, PUBLIC)).rejects.toMatchObject({ kind: "blocked" });
    await expect(checkMailHost("rebind.test", 587, async () => ["93.184.216.34", "127.0.0.1"])).rejects.toThrow(/local or private address/);
    await expect(checkMailHost("metadata.test", 587, async () => ["169.254.169.254"])).rejects.toMatchObject({ kind: "blocked" });
    await expect(checkMailHost("v6.test", 587, async () => ["::ffff:10.0.0.1"])).rejects.toMatchObject({ kind: "blocked" });
    await expect(checkMailHost("missing.test", 587, async () => Promise.reject(new Error("ENOTFOUND")))).rejects.toThrow("We couldn't find the email server missing.test. Check the server name.");
    await expect(checkMailHost("empty.test", 587, async () => [])).rejects.toMatchObject({ kind: "dns" });
    // A literal private address needs no lookup to be refused.
    await expect(checkMailHost("10.0.0.5", 25)).rejects.toMatchObject({ kind: "blocked" });
  });

  it("sends through the checked address with the server's name, from the owner's address", async () => {
    const target = appMailTarget({ id: "app-1", hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, mailServer: { ...savedServer("app-1"), replyTo: "help@nour.test" } } }, KEY)!;
    const { sent, transport } = fakeTransport();
    await sendThroughServer(target, MESSAGE, { transport, resolve: PUBLIC });
    expect(sent).toEqual([
      {
        target: {
          host: "smtp.gmail.com",
          address: "142.250.1.108",
          port: 465,
          security: "ssl",
          username: "hello@nour.test",
          password: "abcd efgh ijkl mnop",
          from: { name: "Nour Academy", address: "hello@nour.test" },
          replyTo: "help@nour.test",
        },
        message: MESSAGE,
      },
    ]);
    // Nothing is sent to a private address.
    const blocked = fakeTransport();
    await expect(sendThroughServer(target, MESSAGE, { transport: blocked.transport, resolve: async () => ["127.0.0.1"] })).rejects.toBeInstanceOf(AppMailError);
    expect(blocked.sent).toEqual([]);
  });

  it("says what went wrong in plain words, without the password", async () => {
    const target = { host: "smtp.gmail.com", port: 465, username: "hello@nour.test", password: "s3cret-pass" };
    const encoded = Buffer.from("\u0000hello@nour.test\u0000s3cret-pass").toString("base64");
    const cases: [unknown, RegExp][] = [
      [Object.assign(new Error("Invalid login"), { code: "EAUTH", responseCode: 535, response: `535 5.7.8 Username and Password not accepted s3cret-pass ${encoded}` }), /^The email server refused the username or password\./],
      [Object.assign(new Error("connect ECONNREFUSED 1.2.3.4:465"), { code: "ESOCKET" }), /^The email server smtp\.gmail\.com refused the connection on port 465\./],
      [Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" }), /didn't answer on port 465 within 10 seconds/],
      [Object.assign(new Error("140:error:wrong version number"), { code: "ESOCKET" }), /^The secure connection to the email server failed\. Check the security/],
      [Object.assign(new Error("Hostname/IP does not match certificate's altnames"), { code: "ESOCKET" }), /secure connection/],
      [Object.assign(new Error("getaddrinfo ENOTFOUND smtp.gmail.com"), { code: "EDNS" }), /^We couldn't find the email server smtp\.gmail\.com/],
      [Object.assign(new Error("Sender address rejected"), { code: "EENVELOPE", responseCode: 553, response: "553 5.7.1 Sender address rejected: not owned by user" }), /may not allow this From address/],
      [Object.assign(new Error("Connection closed"), { code: "ECONNECTION" }), /^The connection to the email server smtp\.gmail\.com on port 465 failed/],
      [new Error("something else"), /^The email server didn't accept the email\.$/],
    ];
    for (const [error, expected] of cases) {
      const text = explainMailError(error, target);
      expect(text).toMatch(expected);
      expect(text).not.toContain("s3cret-pass");
      expect(text).not.toContain(encoded);
    }
    expect(explainMailError(cases[0]![0], target)).toContain('The server said: "535 5.7.8 Username and Password not accepted •••• ••••"');
    // sendThroughServer turns a transport's error into those words.
    const failing = fakeTransport(cases[0]![0]);
    const sent = sendThroughServer({ ...target, security: "ssl", from: { name: "N", address: "hello@nour.test" }, replyTo: null }, MESSAGE, { transport: failing.transport, resolve: PUBLIC });
    await expect(sent).rejects.toThrow(/^The email server refused the username or password/);
  });

  it("puts the app's name in front of Yallapp's address", () => {
    expect(fromWithName("Yallapp <info@yallapp.com.tr>", "Nour Academy")).toEqual({ name: "Nour Academy", address: "info@yallapp.com.tr" });
    expect(fromWithName("info@yallapp.com.tr", 'Rose "Shop"\r\nBcc: x')).toEqual({ name: "Rose Shop Bcc: x", address: "info@yallapp.com.tr" });
    expect(fromWithName("Yallapp <info@yallapp.com.tr>", "  ")).toBe("Yallapp <info@yallapp.com.tr>");
  });
});

describe("when the own server fails", () => {
  it("Yallapp's server sends the email once more and the failure is reported", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const platform: MailMessage[] = [];
    const reasons: string[] = [];
    const failing = async () => {
      throw new AppMailError("auth", "The email server refused the username or password.");
    };
    await mailerWithFallback(failing, async (m) => void platform.push(m), async (r) => void reasons.push(r))!(MESSAGE);
    expect(platform).toEqual([MESSAGE]);
    expect(reasons).toEqual(["The email server refused the username or password."]);
    // Without Yallapp's server the failure stands; a working own server is used alone; none means Yallapp's.
    await expect(mailerWithFallback(failing, null, async () => {})!(MESSAGE)).rejects.toThrow("refused the username");
    const own: MailMessage[] = [];
    await mailerWithFallback(async (m) => void own.push(m), async (m) => void platform.push(m), async (r) => void reasons.push(r))!(MESSAGE);
    expect(own).toHaveLength(1);
    expect(platform).toHaveLength(1);
    const yallapp = async () => {};
    expect(mailerWithFallback(null, yallapp, async () => {})).toBe(yallapp);
  });

  it("is kept on the app and the owner is told at most once a day", async () => {
    const { store, client } = await setupClient();
    const app: App = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Rose Shop", hostedSettings: { ...DEFAULT_HOSTED_SETTINGS } };
    await store.createApp(app);
    const sent: { key: string; to: string; values: Record<string, string> }[] = [];
    const deps = (now: Date) => ({ store, now, baseUrl: "https://yallapp.test/", mail: async (key: "own_email_failed", to: string, values: Record<string, string>) => void sent.push({ key, to, values }) });
    // Nothing to record without an own server.
    await recordOwnMailFailure(deps(NOW), app.id, "x");
    expect(sent).toEqual([]);
    await store.updateApp(app.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, mailServer: savedServer(app.id) } }, NOW);
    await recordOwnMailFailure(deps(NOW), app.id, "The email server refused the username or password.");
    const later = new Date(NOW.getTime() + 3_600_000);
    await recordOwnMailFailure(deps(later), app.id, "The email server didn't answer.");
    expect(sent).toEqual([
      {
        key: "own_email_failed",
        to: "ada@academy.test",
        values: {
          name: "Ada Academy",
          app_name: "Rose Shop",
          date: "12 Oct 2026",
          reason: "The email server refused the username or password.",
          sign_in_url: `https://yallapp.test/dashboard/open?app=${app.id}&to=app-sign-in`,
        },
      },
    ]);
    const saved = (await store.getAppById(app.id))!.hostedSettings!;
    expect(saved).toMatchObject({ mailFailedAt: later.toISOString(), mailFailedReason: "The email server didn't answer." });
    await recordOwnMailFailure(deps(new Date(NOW.getTime() + 86_400_000)), app.id, "again");
    expect(sent).toHaveLength(2);
  });

  it("has an email to the owner that the team can edit", () => {
    const template = emailTemplate("own_email_failed")!;
    expect(placeholderErrors(template.subject, template)).toEqual([]);
    expect(placeholderErrors(template.body, template)).toEqual([]);
    const email = renderTemplate(template, { name: "Ada", app_name: "Rose Shop", date: "12 Oct 2026", reason: "It refused the password.", sign_in_url: "https://x.test/open", yallapp_whatsapp: "+90" });
    expect(email.subject).toBe("Rose Shop: your email server couldn't send an email");
    expect(email.text).toContain("On 12 Oct 2026, your own email server couldn't send an email to someone using Rose Shop:\nIt refused the password.");
    expect(email.text).toContain("https://x.test/open");
  });
});

describe("email codes for WordPress sites", () => {
  const SITE = "https://academy.test";
  const BODY = { site_url: SITE, plugin_version: "0.3.5", channel: "email", email: " Sara@Example.com ", code: "482913" };

  async function activeSite() {
    const setup = await setupClient();
    const app: App = { ...newApp(setup.client.id, SITE, NOW), appName: "Nour Academy" };
    await setup.store.createApp(app);
    const site = parseSiteInfo({ license_key: setup.licenseKey, site_url: SITE, plugin_version: "0.3.5" });
    if (!site.ok) throw new Error("bad site");
    await activateLicense(setup.store, site.value, NOW);
    return { ...setup, app, licenseKey: setup.licenseKey! };
  }

  it("validates the email channel", () => {
    const parsed = parseSignInCodeRequest({ ...BODY, license_key: "YALL-7K2D-9QWE-4MNB" });
    expect(parsed.ok && parsed.value).toMatchObject({ channel: "email", email: "sara@example.com", code: "482913" });
    for (const [extra, code] of [
      [{ email: "nope" }, "invalid_email"],
      [{ email: undefined }, "invalid_email"],
      [{ channel: "sms" }, "invalid_request"],
    ] as const) {
      const bad = parseSignInCodeRequest({ ...BODY, license_key: "YALL-7K2D-9QWE-4MNB", ...extra });
      expect(bad.ok).toBe(false);
      if (bad.ok) continue;
      expect(bad.result.body.code).toBe(code);
      expectPlatformContract("POST", "/sign-in-codes/send", bad.result);
    }
    // Without a channel it's WhatsApp, as before.
    expect(parseSignInCodeRequest({ ...BODY, channel: undefined, license_key: "YALL-7K2D-9QWE-4MNB", phone: "+905321234567" }).ok).toBe(true);
  });

  it("emails the code for the license's app, limited per address, keeping no address", async () => {
    const { store, licenseKey, license, app } = await activeSite();
    const mails: { app: string | null; to: string; code: string; appName: string; minutes: number }[] = [];
    const mailer: SignInCodeMailer = async (a, input) => void mails.push({ app: a?.id ?? null, ...input });
    const request = parseSignInCodeRequest({ ...BODY, license_key: licenseKey });
    if (!request.ok) throw new Error("bad request");
    const result = await sendSignInCode(store, request.value, { sender: null, mailer, secret: "s", now: NOW });
    expect(result).toEqual({ status: 204 });
    expectPlatformContract("POST", "/sign-in-codes/send", result);
    expect(mails).toEqual([{ app: app.id, to: "sara@example.com", code: "482913", appName: "Nour Academy", minutes: 5 }]);
    expect(await signInCodesSentToday(store, license!.id, NOW)).toBe(1);
    // One every 30 seconds per address.
    const again = await sendSignInCode(store, request.value, { sender: null, mailer, secret: "s", now: NOW });
    expect(again).toMatchObject({ status: 429, body: { code: "rate_limited" } });
    expectPlatformContract("POST", "/sign-in-codes/send", again);
    for (const bucket of (store as unknown as { rateLimits: Map<string, unknown> }).rateLimits.keys()) expect(bucket).not.toContain("example.com");
    // A failing mailer is a provider error; no mailer at all too.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const other = parseSignInCodeRequest({ ...BODY, email: "mert@example.com", license_key: licenseKey });
    if (!other.ok) throw new Error("bad request");
    const failed = await sendSignInCode(store, other.value, { sender: null, mailer: async () => Promise.reject(new Error("No email server is set up.")), secret: "s", now: NOW });
    expect(failed).toMatchObject({ status: 502, body: { code: "provider_error" } });
    const third = parseSignInCodeRequest({ ...BODY, email: "ece@example.com", license_key: licenseKey });
    if (!third.ok) throw new Error("bad request");
    expect(await sendSignInCode(store, third.value, { sender: null, secret: "s", now: NOW })).toMatchObject({ status: 502 });
  });

  it("tells the plugin how email sign-in works with the license status", async () => {
    const { store, licenseKey, app } = await activeSite();
    const site = parseSiteInfo({ license_key: licenseKey, site_url: SITE, plugin_version: "0.3.5" });
    if (!site.ok) throw new Error("bad site");
    const first = await checkLicense(store, site.value, NOW);
    expect(first).toMatchObject({ status: 200, body: { email_sign_in: null } });
    expectPlatformContract("POST", "/licenses/check", first);
    await store.updateApp(app.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInMethods: ["email"], emailSignIn: "code" } }, NOW);
    const checked = await checkLicense(store, site.value, NOW);
    expect(checked).toMatchObject({ status: 200, body: { sign_in_methods: ["email"], email_sign_in: "code" } });
    expectPlatformContract("POST", "/licenses/check", checked);
  });

  it("go out through the route from Yallapp's address with the app's name, or the own server with a fallback", async () => {
    const store = (await getStore()) as MemoryStore;
    const now = new Date();
    const site = "https://mail-route.test";
    const { client } = await registerClient(store, { name: "Mail Route", email: "owner@mail-route.test", whatsapp: "+905446731945", siteUrl: site, password: null }, now);
    const outcome = await activateClient(store, { clientId: client.id, plan: "starter", activeUntil: new Date(now.getTime() + 30 * 86_400_000), paymentNote: "test" }, encryptionKey(), now);
    const app: App = { ...newApp(client.id, site, now), appName: "Route Academy" };
    await store.createApp(app);
    const info = parseSiteInfo({ license_key: outcome.licenseKey, site_url: site, plugin_version: "0.3.5" });
    if (!info.ok) throw new Error("bad site");
    await activateLicense(store, info.value, now);
    const logged = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = (email: string) =>
      POST(
        new Request("https://yallapp.test/api/v1/sign-in-codes/send", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.61" },
          body: JSON.stringify({ ...BODY, license_key: outcome.licenseKey, site_url: site, email }),
        }),
      );
    expect((await send("first@example.com")).status).toBe(204);
    expect(logged.mock.calls.flat().join("\n")).toMatch(/\[mail\] To: first@example.com\n\[mail\] Subject: 482913 is your Route Academy code/);

    // An own server on a private address is never contacted: Yallapp's server sends the code, and the owner is told.
    logged.mockClear();
    const own = savedServer(app.id);
    const server = { ...own, host: "10.0.0.25", passwordEncrypted: appMailServer(app.id, { ...own, host: "10.0.0.25" }, "pw-123456", null, encryptionKey(), now).passwordEncrypted };
    await store.updateApp(app.id, { hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, mailServer: server } }, now);
    expect((await send("second@example.com")).status).toBe(204);
    const out = logged.mock.calls.flat().join("\n");
    expect(out).toContain("[mail] To: second@example.com");
    expect(out).toContain("[mail] To: owner@mail-route.test\n[mail] Subject: Route Academy: your email server couldn't send an email");
    expect(out).not.toContain("pw-123456");
    const saved = (await store.getAppById(app.id))!.hostedSettings!;
    expect(saved.mailFailedAt).toBeTruthy();
    expect(saved.mailFailedReason).toMatch(/local or private address/);
  });
});
