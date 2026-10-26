import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET, OPTIONS } from "@/app/api/preview/[token]/config/route";
import { GET as hostedGet } from "@/app/api/app/[appId]/[...path]/route";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { validateBuildConfig } from "@/lib/build-config/validate";
import { getStore } from "@/lib/data";
import type { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import { DEFAULT_HOSTED_SETTINGS, type App } from "@/lib/data/types";
import { appUrl, signingSecret } from "@/lib/env";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { loadLayout, publishLayout, saveDraft } from "@/lib/pages/layout";
import { previewConfigFor, previewContentSource, previewWaitingFor } from "@/lib/preview/config";
import { corsHeaders, previewOrigins } from "@/lib/preview/cors";
import { previewConfigResult } from "@/lib/preview/service";
import { createPreviewToken, PREVIEW_TTL_SECONDS, previewAppPath, previewKey, verifyPreviewToken } from "@/lib/preview/token";
import { expectContract } from "./contract";
import { NOW, setupClient } from "./helpers";
import { expectPlatformContract } from "./platform-contract";

const KEY = previewKey("test-signing-secret-0123456789abcdef0123456789");
const APP_A = "11111111-2222-4333-8444-555555555555";
const APP_B = "66666666-7777-4888-9999-000000000000";

describe("preview tokens", () => {
  it("name one app, expire after an hour and can't be changed", () => {
    const token = createPreviewToken({ appId: APP_A, draft: false }, KEY, NOW);
    const check = verifyPreviewToken(token, KEY, NOW);
    expect(check).toEqual({ ok: true, grant: { appId: APP_A, draft: false, expiresAt: new Date(NOW.getTime() + PREVIEW_TTL_SECONDS * 1000) } });
    // Still valid a second before the hour, expired at the hour.
    expect(verifyPreviewToken(token, KEY, new Date(NOW.getTime() + (PREVIEW_TTL_SECONDS - 1) * 1000)).ok).toBe(true);
    expect(verifyPreviewToken(token, KEY, new Date(NOW.getTime() + PREVIEW_TTL_SECONDS * 1000))).toEqual({ ok: false, reason: "expired" });
  });

  it("never work for another app, with another key, or edited", () => {
    const token = createPreviewToken({ appId: APP_A, draft: true }, KEY, NOW);
    expect(verifyPreviewToken(token, KEY, NOW, APP_A).ok).toBe(true);
    expect(verifyPreviewToken(token, KEY, NOW, APP_B)).toEqual({ ok: false, reason: "invalid" });
    expect(verifyPreviewToken(token, previewKey("another-signing-secret-0123456789abcdef"), NOW)).toEqual({ ok: false, reason: "invalid" });
    // Swapping the app, extending the expiry or turning the draft off breaks the signature.
    expect(verifyPreviewToken(token.replace(APP_A, APP_B), KEY, NOW).ok).toBe(false);
    const [p, id, exp, d, sig] = token.split(".");
    expect(verifyPreviewToken([p, id, String(Number(exp) + 3600), d, sig].join("."), KEY, NOW).ok).toBe(false);
    expect(verifyPreviewToken([p, id, exp, "0", sig].join("."), KEY, NOW).ok).toBe(false);
    for (const bad of ["", "p1", "x".repeat(200), `${token}.`, token.toUpperCase(), null, undefined]) {
      expect(verifyPreviewToken(bad, KEY, NOW)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(verifyPreviewToken(token, KEY, NOW).ok && verifyPreviewToken(token, KEY, NOW)).toMatchObject({ grant: { draft: true } });
  });

  it("go in the preview link, URL safe", () => {
    const token = createPreviewToken({ appId: APP_A, draft: false }, KEY, NOW);
    expect(previewAppPath(token)).toBe(`/preview-app/index.html?token=${token}`);
    expect(() => createPreviewToken({ appId: "not-an-app", draft: false }, KEY, NOW)).toThrow();
  });
});

describe("cross-origin access", () => {
  it("allows only the platform's own addresses", () => {
    const origins = previewOrigins("https://yallapp.com.tr/", { URL: "https://yallapp.netlify.app", DEPLOY_PRIME_URL: "https://main--yallapp.netlify.app" });
    expect(origins).toEqual(["https://yallapp.com.tr", "https://yallapp.netlify.app", "https://main--yallapp.netlify.app"]);
    expect(corsHeaders("https://yallapp.com.tr", origins)["access-control-allow-origin"]).toBe("https://yallapp.com.tr");
    expect(corsHeaders("https://evil.example", origins)).toEqual({});
    expect(corsHeaders(null, origins)).toEqual({});
  });
});

describe("preview config", () => {
  let store: MemoryStore;
  let clientId: string;

  beforeEach(async () => {
    ({ store } = await setupClient());
    clientId = (await store.listClients({ filter: "all", now: NOW }))[0]!.client.id;
  });

  const options = () => ({ key: KEY, platformUrl: "https://yallapp.test", assetUrl: (id: string) => `https://yallapp.test/api/v1/assets/${id}` });

  it("fills an app that isn't set up with placeholders and says which", async () => {
    const app: App = newApp(clientId, null, NOW, "store");
    await store.createApp(app);
    const token = createPreviewToken({ appId: app.id, draft: true }, KEY, NOW);
    const result = await previewConfigResult(store, token, NOW, options());
    expectPlatformContract("GET", "/preview/{token}/config", result);
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    const { config, preview } = result.body;
    // The same shape as a build's config: it passes the build config schema.
    expect(validateBuildConfig(config).ok).toBe(true);
    expect(config).toMatchObject({ app_type: "store", app_name: "Your app", short_name: "Your app", site_url: "https://yallapp.test" });
    expect(config.firebase).toBeUndefined();
    expect(preview).toMatchObject({ app_id: app.id, content_source: "none", draft: false, api_token: null });
    expect(preview.placeholders).toEqual(expect.arrayContaining(["app_name", "short_name", "android_package", "ios_bundle_id", "site_url", "branding.icon_url"]));
    expect(preview.missing_steps.map((m) => m.step)).toEqual(["website", "branding", "listing", "publishing"]);
  });

  it("points at the content source the app has, and shows drafts on the hosted API only", async () => {
    const wordpress: App = { ...newApp(clientId, "https://academy.test", NOW, "lms"), appName: "Ada Academy", shortName: "Ada", websiteDoneAt: NOW };
    const hosted: App = { ...newApp(clientId, null, NOW, "real_estate"), backend: "hosted", appName: "Nile Homes", shortName: "Nile" };
    const own: App = { ...newApp(clientId, "https://own.test", NOW, "booking"), backend: "custom_api", apiBaseUrl: "https://api.own.test/v1" };
    for (const app of [wordpress, hosted, own]) await store.createApp(app);

    const wp = previewConfigFor(wordpress, { appId: wordpress.id, draft: true, expiresAt: NOW }, { token: "t", platformUrl: "https://yallapp.test", assetUrl: (id) => id, plan: null, pluginConnected: true });
    expect(wp.config).toMatchObject({ site_url: "https://academy.test", app_name: "Ada Academy", short_name: "Ada" });
    expect(wp.config.api_base_url).toBeUndefined();
    expect(wp.preview).toMatchObject({ content_source: "wordpress", waiting_for: null, draft: false, api_token: null });

    const token = createPreviewToken({ appId: hosted.id, draft: true }, KEY, NOW);
    const result = await previewConfigResult(store, token, NOW, options());
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.config.api_base_url).toBe(`https://yallapp.test/api/app/${hosted.id}`);
    expect(result.body.preview).toMatchObject({ content_source: "hosted", draft: true, api_token: token });

    expect(previewContentSource({ ...own, websiteDoneAt: NOW }, false)).toBe("custom_api");
    // A WordPress site our team is still setting up has no content yet.
    expect(previewContentSource({ ...wordpress, backend: "setup_requested" }, false)).toBe("none");
  });

  it("reads a website only once the Website step chose it and the plugin there is connected", async () => {
    const preview = async (app: App) => {
      const result = await previewConfigResult(store, createPreviewToken({ appId: app.id, draft: false }, KEY, NOW), NOW, options());
      expect(result.status).toBe(200);
      return result.status === 200 ? result.body.preview : null;
    };
    // "Start from your website" (or the sign-up's website): an address, but no source chosen yet.
    const scanned: App = { ...newApp(clientId, "https://shop-on-wix.test", NOW, "store"), appName: "Wix Shop" };
    await store.createApp(scanned);
    expect(await preview(scanned)).toMatchObject({ content_source: "none", waiting_for: "website" });
    // The Website step chose WordPress: the preview waits for the plugin to activate the app's license there.
    const chosen: App = { ...scanned, websiteDoneAt: NOW };
    await store.updateApp(scanned.id, { websiteDoneAt: NOW }, NOW);
    expect(await preview(chosen)).toMatchObject({ content_source: "none", waiting_for: "plugin" });
    // Once it has, the preview reads the site.
    const license = (await store.getLicenseForApp(clientId, scanned.id))!;
    const activation = { licenseId: license.id, siteUrlRaw: "https://www.shop-on-wix.test/", pluginVersion: "0.4.18", wpVersion: "6.6", lms: "", store: "woocommerce", bookings: "", activatedAt: NOW, lastCheckedAt: NOW };
    // The plugin on another site doesn't count.
    await store.claimActivation({ ...activation, siteUrl: "other.test" });
    expect(await preview(chosen)).toMatchObject({ content_source: "none", waiting_for: "plugin" });
    await store.deleteActivation(license.id);
    await store.claimActivation({ ...activation, siteUrl: "shop-on-wix.test" });
    expect(await preview(chosen)).toMatchObject({ content_source: "wordpress", waiting_for: null });
    expect(previewWaitingFor({ ...chosen, backend: "setup_requested" }, false)).toBe("setup");
    expect(previewWaitingFor({ ...chosen, backend: "hosted" }, false)).toBeNull();
    expect(previewWaitingFor({ ...chosen, appType: "real_estate" }, false)).toBeNull();
  });

  it("refuses expired, broken and other apps' tokens", async () => {
    const app: App = newApp(clientId, null, NOW, "lms");
    await store.createApp(app);
    const token = createPreviewToken({ appId: app.id, draft: false }, KEY, NOW);
    const later = new Date(NOW.getTime() + PREVIEW_TTL_SECONDS * 1000 + 1);
    const expired = await previewConfigResult(store, token, later, options());
    expect(expired).toMatchObject({ status: 410, body: { code: "preview_expired" } });
    expectPlatformContract("GET", "/preview/{token}/config", expired);
    const broken = await previewConfigResult(store, `${token}x`, NOW, options());
    expect(broken).toMatchObject({ status: 403, body: { code: "invalid_token" } });
    expectPlatformContract("GET", "/preview/{token}/config", broken);
    const gone = createPreviewToken({ appId: APP_B, draft: false }, KEY, NOW);
    const missing = await previewConfigResult(store, gone, NOW, options());
    expect(missing).toMatchObject({ status: 404, body: { code: "not_found" } });
    expectPlatformContract("GET", "/preview/{token}/config", missing);
  });
});

describe("GET /api/preview/{token}/config", () => {
  let store: DataStore;
  let app: App;

  beforeAll(async () => {
    store = await getStore();
    const { client } = await registerClient(store, { name: "Preview Shop", email: "preview@shop.test", whatsapp: "+905446731901", siteUrl: "", password: null }, new Date());
    app = { ...newApp(client.id, null, new Date(), "store"), appName: "Lale Flowers" };
    await store.createApp(app);
  });

  const get = (token: string, ip = "198.51.100.77", origin?: string) =>
    GET(new Request(`https://yallapp.test/api/preview/${token}/config`, { headers: { "x-forwarded-for": ip, ...(origin ? { origin } : {}) } }), {
      params: Promise.resolve({ token }),
    });

  it("answers with the app's preview config, not cached, for a fresh token", async () => {
    const token = createPreviewToken({ appId: app.id, draft: false }, previewKey(signingSecret()), new Date());
    const response = await get(token, "198.51.100.77", new URL(appUrl()).origin);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBe(new URL(appUrl()).origin);
    const body = (await response.json()) as { config: { app_name: string }; preview: { app_id: string } };
    expect(body.config.app_name).toBe("Lale Flowers");
    expect(body.preview.app_id).toBe(app.id);
    // Another site gets no cross-origin access.
    const other = await get(token, "198.51.100.78", "https://evil.example");
    expect(other.headers.get("access-control-allow-origin")).toBeNull();
    const pre = OPTIONS(new Request("https://yallapp.test/x", { method: "OPTIONS", headers: { origin: new URL(appUrl()).origin } }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("is rate limited per IP", async () => {
    const token = createPreviewToken({ appId: app.id, draft: false }, previewKey(signingSecret()), new Date());
    let last = 0;
    for (let i = 0; i < 121; i++) last = (await get(token, "198.51.100.99")).status;
    expect(last).toBe(429);
  });
});

describe("hosted API in the app preview", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    app = {
      ...newApp(client.id, null, NOW, "store"),
      backend: "hosted",
      appName: "Rose Shop",
      websiteDoneAt: NOW,
      hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, reviewPhone: "+905550001122", reviewCode: "135790" },
    };
    await store.createApp(app);
    sender = new LogSender();
    now = NOW;
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.10",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    ...overrides,
  });

  async function call(method: string, route: string, body: unknown, overrides: Partial<HostedContext> = {}, query: Record<string, string> = {}): Promise<HostedResult> {
    const result = await handleHosted(context(overrides), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(query), body, token: null });
    expectContract(method, route, result);
    return result;
  }

  it("answers the owner's preview before activation, never for a suspended account", async () => {
    const config = { platform: "android", app_version: "1.0.0" };
    expect((await call("GET", "/config", undefined, { active: false }, config)).status).toBe(503);
    const preview = await call("GET", "/config", undefined, { active: false, preview: { draft: false } }, config);
    expect(preview.status).toBe(200);
    expect((preview.body as { auth: { preview_sign_in: boolean } }).auth.preview_sign_in).toBe(true);
    expect((await call("GET", "/config", undefined, { active: false, suspended: true, preview: { draft: false } }, config)).status).toBe(503);
  });

  it("signs in only the store review number and never sends a code", async () => {
    for (const overrides of [{ preview: { draft: false } }, {}]) {
      const refused = await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5321234567", preview: true }, overrides);
      expect(refused).toMatchObject({ status: 403, body: { code: "preview_review_number_only" } });
    }
    const viaHeaderOnly = await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5321234567" }, { preview: { draft: false } });
    expect(viaHeaderOnly.status).toBe(403);
    expect(sender.sent.size).toBe(0);
    const review = await call("POST", "/auth/otp/request", { country_code: "+90", phone: "5550001122", preview: true }, { preview: { draft: false } });
    expect(review.status).toBe(200);
    const verified = await call(
      "POST",
      "/auth/otp/verify",
      { request_id: (review.body as { request_id: string }).request_id, code: "135790", device: { id: "browser-1", platform: "android", name: "Preview", app_version: "1.0.0" } },
      { preview: { draft: false } },
    );
    expect(verified.status).toBe(200);
    expect(sender.sent.size).toBe(0);
  });

  it("serves the Pages & look draft in a draft preview, the published pages otherwise", async () => {
    const record = await loadLayout(store, app, now);
    const published = await publishLayout(store, app, undefined, "owner@shop.test", now);
    expect(published.ok).toBe(true);
    const renamed = { ...record.draft, pages: record.draft.pages.map((p, i) => (i === 0 ? { ...p, title: "Draft home" } : p)) };
    expect((await saveDraft(store, app, renamed, now)).ok).toBe(true);
    const query = { platform: "android" };
    const live = await call("GET", "/pages", undefined, {}, query);
    const draft = await call("GET", "/pages", undefined, { preview: { draft: true } }, query);
    const titles = (r: HostedResult) => (r.body as { pages: { title: string }[] }).pages.map((p) => p.title);
    expect(titles(live)).not.toContain("Draft home");
    expect(titles(draft)).toContain("Draft home");
    expect((draft.body as { version: string }).version).toMatch(/^draft\./);
  });
});

describe("hosted API route with a preview token", () => {
  let store: DataStore;
  let app: App;

  beforeAll(async () => {
    store = await getStore();
    const { client } = await registerClient(store, { name: "Pending Shop", email: "pending@shop.test", whatsapp: "+905446731902", siteUrl: "", password: null }, new Date());
    app = { ...newApp(client.id, null, new Date(), "store"), backend: "hosted", appName: "Pending Shop" };
    await store.createApp(app);
  });

  const request = (headers: Record<string, string>) =>
    hostedGet(new Request(`https://yallapp.test/api/app/${app.id}/config?platform=android&app_version=1.0.0`, { headers }), {
      params: Promise.resolve({ appId: app.id, path: ["config"] }),
    });

  it("answers a pending app's preview, and only with this app's token", async () => {
    expect((await request({})).status).toBe(503);
    const key = previewKey(signingSecret());
    expect((await request({ "x-yallapp-preview": createPreviewToken({ appId: app.id, draft: false }, key, new Date()) })).status).toBe(200);
    expect((await request({ "x-yallapp-preview": createPreviewToken({ appId: APP_A, draft: false }, key, new Date()) })).status).toBe(503);
    const origin = new URL(appUrl()).origin;
    const response = await request({ origin });
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
  });
});
