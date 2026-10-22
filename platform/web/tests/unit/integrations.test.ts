import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { keyContext } from "@/lib/builds/signing";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type Activation, type App, type AppError } from "@/lib/data/types";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { integrationOfError, integrationsOf, testIntegration, withCheck } from "@/lib/integrations";
import { KEY, NOW } from "./helpers";
import { integrationsStoreSuite } from "./integrations-store-suite";

const DAY = 86_400_000;

function error(source: AppError["source"], code: string, message = "boom", lastAt = NOW): AppError {
  return { id: `${source}-${code}`, clientId: "c1", appId: "a1", source, code, message, count: 2, firstAt: lastAt, lastAt };
}

const serviceAccount = () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return JSON.stringify({
    type: "service_account",
    project_id: "rose-shop",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    client_email: "push@rose-shop.iam.gserviceaccount.com",
  });
};

function shop(over: Partial<App> = {}): App {
  const base = newApp("c1", null, NOW, "store");
  return { ...base, backend: "hosted", appName: "Rose Shop", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS }, ...over };
}

describe("80.1 an app's integrations", () => {
  it("lists each connection with its state, for a shop without a website", () => {
    const rows = integrationsOf({ app: shop(), activation: null, errors: [] });
    expect(rows.map((r) => [r.key, r.state, r.reason, r.testable])).toEqual([
      ["website", "connected", "own_content", false],
      ["payments", "not_set", "no_keys", false],
      ["whatsapp", "connected", "yallapp_number", false],
      ["mail", "connected", "yallapp_mail", false],
      ["push", "not_set", "no_firebase", false],
      ["google_play", "not_set", "no_store_key", false],
      ["app_store", "not_set", "no_store_key", false],
    ]);
    expect(rows.find((r) => r.key === "payments")!.href).toBe("/dashboard/catalog");
  });

  it("says where a WordPress site's plugin was last seen, and what failed lately", () => {
    const app = { ...newApp("c1", "https://academy.test", NOW, "lms"), backend: "wordpress" as const, siteUrl: "https://academy.test" };
    const activation = { siteUrl: "academy.test", lastCheckedAt: new Date(NOW.getTime() - DAY) } as Activation;
    const errors = [error("wordpress", "refresh_failed", "timeout", new Date(NOW.getTime() - 2 * DAY)), error("server", "unhandled:courses", "TypeError", NOW), error("payment", "iyzico_start_failed")];
    const [site, ...rest] = integrationsOf({ app, activation, errors });
    expect(site).toMatchObject({ key: "website", state: "connected", reason: "plugin_seen", subject: "academy.test", at: activation.lastCheckedAt, testable: true });
    // Last seen first; another connection's errors aren't the website's.
    expect(site!.errors.map((e) => e.code)).toEqual(["unhandled:courses", "refresh_failed"]);
    // No card payments on a WordPress academy, no hosted sign-in or push.
    expect(rest.map((r) => r.key)).toEqual(["google_play", "app_store"]);
    // Without the plugin yet, it waits.
    expect(integrationsOf({ app, activation: null, errors: [] })[0]).toMatchObject({ state: "waiting", reason: "plugin_not_active" });
  });

  it("knows which connection an error belongs to", () => {
    expect(integrationOfError({ source: "platform", code: "http_502" })).toBe("website");
    expect(integrationOfError({ source: "webhook", code: "delivery_failed" })).toBe("website");
    expect(integrationOfError({ source: "sign_in", code: "email_code_not_sent" })).toBe("mail");
    expect(integrationOfError({ source: "sign_in", code: "phone_code_not_sent" })).toBe("whatsapp");
    expect(integrationOfError({ source: "push", code: "push_failed" })).toBe("push");
  });

  it("shows the own senders, their failures, the stores' saved keys and a failed last test as a problem", () => {
    const app = shop({
      hostedSettings: {
        whatsappSender: { apiKeyEncrypted: "x", instanceId: "inst-42", keyLast4: "1234", savedAt: NOW.toISOString() },
        whatsappFailedAt: NOW.toISOString(),
        mailServer: { host: "mail.rose.test" } as never,
      } as never,
      firebaseServiceAccountEncrypted: "x",
      googlePlayKeyEncrypted: "x",
      googlePlayClientEmail: "play@rose.iam.gserviceaccount.com",
      integrationChecks: { push: { at: NOW.toISOString(), ok: false, code: "push_refused", subject: "rose-shop", problems: ["Google sign-in for push failed (HTTP 400)."] } },
    });
    const by = Object.fromEntries(integrationsOf({ app, activation: null, errors: [] }).map((r) => [r.key, r]));
    expect(by.whatsapp).toMatchObject({ state: "problem", reason: "own_number_failed", subject: "inst-42", at: NOW });
    expect(by.mail).toMatchObject({ state: "connected", reason: "own_server", subject: "mail.rose.test" });
    expect(by.push).toMatchObject({ state: "problem", reason: "firebase", testable: true });
    expect(by.google_play).toMatchObject({ state: "connected", reason: "store_key", subject: "play@rose.iam.gserviceaccount.com" });
  });

  it("tests card payments with the provider, sending nothing", async () => {
    const store = new MemoryStore();
    const app = shop();
    app.catalogSettings = { ...DEFAULT_CATALOG_SETTINGS, payment: encryptOwnPayment(app.id, { provider: "iyzico", apiKey: "api", secretKey: "secret", sandbox: true }, KEY) };
    const calls: string[] = [];
    const answer = (status: string) =>
      (async (url: string) => {
        calls.push(String(url));
        return new Response(JSON.stringify({ status }), { status: 200, headers: { "content-type": "application/json" } });
      }) as unknown as typeof fetch;
    expect(await testIntegration("payments", app, { store, encryptionKey: KEY, now: NOW, fetcher: answer("success") })).toEqual({
      at: NOW.toISOString(),
      ok: true,
      code: "payments_accepted",
      subject: "iyzico",
      problems: [],
    });
    expect(calls[0]).toContain("/payment/bin/check");
    expect(await testIntegration("payments", app, { store, encryptionKey: KEY, now: NOW, fetcher: answer("failure") })).toMatchObject({ ok: false, code: "payments_refused" });
    const down = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    expect(await testIntegration("payments", app, { store, encryptionKey: KEY, now: NOW, fetcher: down })).toMatchObject({ ok: false, code: "payments_unreachable" });
    // Nothing to test without keys, or for what can't be asked without sending.
    expect(await testIntegration("payments", shop(), { store, encryptionKey: KEY, now: NOW })).toBeNull();
    expect(await testIntegration("whatsapp", app, { store, encryptionKey: KEY, now: NOW })).toBeNull();
    expect(await testIntegration("google_play", app, { store, encryptionKey: KEY, now: NOW })).toBeNull();
  });

  it("tests push by asking Google and Huawei for a token, sending nothing", async () => {
    const store = new MemoryStore();
    const app = shop();
    app.firebaseServiceAccountEncrypted = encrypt(serviceAccount(), KEY, `${SERVICE_ACCOUNT_CONTEXT}:${app.id}`);
    app.huaweiAppId = "107000001";
    app.huaweiPushSecretEncrypted = encrypt("hms-secret", KEY, keyContext.huaweiPush(app.id));
    const asked: string[] = [];
    const tokens = (ok: boolean) =>
      (async (url: string) => {
        asked.push(String(url));
        return ok ? new Response(JSON.stringify({ access_token: "t" }), { status: 200 }) : new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
      }) as unknown as typeof fetch;
    expect(await testIntegration("push", app, { store, encryptionKey: KEY, now: NOW, fetcher: tokens(true) })).toMatchObject({ ok: true, code: "push_accepted", subject: "rose-shop" });
    expect(asked).toEqual(["https://oauth2.googleapis.com/token"]);
    expect(await testIntegration("push", app, { store, encryptionKey: KEY, now: NOW, fetcher: tokens(false) })).toMatchObject({
      ok: false,
      code: "push_refused",
      problems: ["Google sign-in for push failed (HTTP 400)."],
    });
    expect(await testIntegration("huawei_push", app, { store, encryptionKey: KEY, now: NOW, fetcher: tokens(true) })).toMatchObject({ ok: true, code: "huawei_accepted", subject: "107000001" });
    expect(asked.at(-1)).toContain("oauth-login.cloud.huawei.com");
    // A key that can't be read says so.
    expect(await testIntegration("push", { ...app, firebaseServiceAccountEncrypted: "v2.broken" }, { store, encryptionKey: KEY, now: NOW })).toMatchObject({ ok: false, code: "push_unreadable" });
  });

  it("keeps each connection's last test", () => {
    const app = shop({ integrationChecks: { payments: { at: "a", ok: true, code: "payments_accepted", subject: "iyzico", problems: [] } } });
    const next = withCheck(app, "push", { at: "b", ok: false, code: "push_refused", subject: null, problems: [] });
    expect(Object.keys(next)).toEqual(["payments", "push"]);
  });
});

describe("80.1 integration checks on the memory store", () => {
  const store = new MemoryStore();
  integrationsStoreSuite(() => store);
});
