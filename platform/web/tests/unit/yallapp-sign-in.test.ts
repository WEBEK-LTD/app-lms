import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify, SignJWT, generateKeyPair } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { checkApi, configProblems, signedInPath } from "@/lib/app/api-check";
import { buildConfigFor, newApp } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, AppAuthKey } from "@/lib/data/types";
import { DEFAULT_HOSTED_SETTINGS } from "@/lib/data/types";
import {
  appSignIn,
  ensureAuthKey,
  jwksOf,
  jwksUrl,
  newAuthKey,
  personClaims,
  publishedKeys,
  RETIRED_KEY_SECONDS,
  rotateAuthKey,
  signingKey,
  signWithKey,
  tokenIssuer,
  verifyWithKeys,
  yallappSignsIn,
} from "@/lib/hosted/app-auth";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { emailSignInPossible, hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { apiCheckSignIn, issueTestToken, reviewUser } from "@/lib/hosted/test-token";
import { previewConfigFor } from "@/lib/preview/config";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

/** 34 Yallapp signs people in for apps on their own API. */

const PLATFORM = "https://yallapp.test";
const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const seconds = (d: Date) => Math.floor(d.getTime() / 1000);

const contract = parse(readFileSync(path.join(__dirname, "../../../../docs/api/openapi.yaml"), "utf8")) as object;
const ajv = new Ajv2020({ strict: false, validateSchema: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(contract, "openapi");

async function ownApiApp(store: MemoryStore, signInBy: "api" | "yallapp" = "yallapp"): Promise<App> {
  const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
  const app: App = {
    ...newApp(client.id, null, NOW, "lms"),
    backend: "custom_api",
    apiBaseUrl: "https://api.academy.test/yallapp/v1",
    siteUrl: "https://academy.test",
    appName: "Ada Academy",
    androidPackage: "com.ada.academy",
    iosBundleId: "com.ada.academy",
    websiteDoneAt: NOW,
    hostedSettings: { ...DEFAULT_HOSTED_SETTINGS, signInBy, reviewPhone: "+90 532 000 00 01", reviewCode: "246810" },
  };
  await store.createApp(app);
  return app;
}

describe("signing keys and tokens", () => {
  let store: MemoryStore;
  beforeEach(async () => {
    ({ store } = await setupClient());
  });

  it("keeps the private key encrypted and publishes only the public parts", async () => {
    const key = await newAuthKey("app-1", KEY, NOW);
    expect(key.privateKeyEncrypted).not.toContain("PRIVATE KEY");
    expect(key.kid).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const set = jwksOf([key], NOW);
    expect(set.keys).toHaveLength(1);
    expect(set.keys[0]).toEqual({ kty: "EC", crv: "P-256", x: key.publicJwk.x, y: key.publicJwk.y, kid: key.kid, alg: "ES256", use: "sig" });
    expect(JSON.stringify(set)).not.toMatch(/"d"/);
    const validate = ajv.getSchema("openapi#/components/schemas/Jwks")!;
    expect(validate(set), JSON.stringify(validate.errors)).toBe(true);
  });

  it("signs ES256 tokens any JWT library checks with the key set: iss, aud, sub, exp", async () => {
    const key = await newAuthKey("app-1", KEY, NOW);
    const iat = seconds(NOW);
    const token = await signWithKey(key, KEY, { iss: PLATFORM, aud: "app-1", sub: "42", did: "d-1", phone: "+905321234567", name: "Sara", iat, exp: iat + 900 });
    expect(decodeProtectedHeader(token)).toEqual({ alg: "ES256", typ: "JWT", kid: key.kid });
    // As a client's API would check it (jose, Node).
    const { payload } = await jwtVerify(token, createLocalJWKSet(jwksOf([key], NOW)), { issuer: PLATFORM, audience: "app-1", currentDate: NOW });
    expect(payload).toMatchObject({ iss: PLATFORM, aud: "app-1", sub: "42", phone: "+905321234567", name: "Sara", iat, exp: iat + 900 });

    const keys = [key];
    expect(await verifyWithKeys(token, keys, { issuer: PLATFORM, audience: "app-1", now: NOW })).toMatchObject({ sub: "42", did: "d-1" });
    // Another app, another issuer, after expiry: refused.
    expect(await verifyWithKeys(token, keys, { issuer: PLATFORM, audience: "app-2", now: NOW })).toBeNull();
    expect(await verifyWithKeys(token, keys, { issuer: "https://other.test", audience: "app-1", now: NOW })).toBeNull();
    expect(await verifyWithKeys(token, keys, { issuer: PLATFORM, audience: "app-1", now: new Date(NOW.getTime() + 901_000) })).toBeNull();
    // Another app's key, a changed payload, or HS256: refused.
    const other = await newAuthKey("app-2", KEY, NOW);
    expect(await verifyWithKeys(token, [other], { issuer: PLATFORM, audience: "app-1", now: NOW })).toBeNull();
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ iss: PLATFORM, aud: "app-1", sub: "1", iat, exp: iat + 900 })).toString("base64url");
    expect(await verifyWithKeys(`${h}.${forged}.${s}`, keys, { issuer: PLATFORM, audience: "app-1", now: NOW })).toBeNull();
    const hs = await new SignJWT({}).setProtectedHeader({ alg: "HS256", kid: key.kid }).setIssuer(PLATFORM).setAudience("app-1").setSubject("1").setIssuedAt(iat).setExpirationTime(iat + 900).sign(Buffer.alloc(32, 1));
    expect(await verifyWithKeys(hs, keys, { issuer: PLATFORM, audience: "app-1", now: NOW })).toBeNull();
    // A key pair that isn't Yallapp's, with the same kid: refused.
    const stranger = await generateKeyPair("ES256");
    const fake = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: key.kid }).setIssuer(PLATFORM).setAudience("app-1").setSubject("1").setIssuedAt(iat).setExpirationTime(iat + 900).sign(stranger.privateKey);
    expect(await verifyWithKeys(fake, keys, { issuer: PLATFORM, audience: "app-1", now: NOW })).toBeNull();
  });

  it("rotates: the new key signs, the old one stays published for a day, then goes", async () => {
    const first = await ensureAuthKey(store, "app-1", KEY, NOW);
    expect((await ensureAuthKey(store, "app-1", KEY, NOW)).kid).toBe(first.kid);
    const signer = appSignIn(store, "app-1", { encryptionKey: KEY, platformUrl: PLATFORM, now: () => NOW });
    const old = await signer.sign({ sub: "1", name: "A", iat: seconds(NOW), exp: seconds(NOW) + 900 });

    const later = new Date(NOW.getTime() + 60_000);
    const second = await rotateAuthKey(store, "app-1", KEY, later);
    const keys = await store.listAppAuthKeys("app-1");
    expect(signingKey(keys)?.kid).toBe(second.kid);
    expect(keys.find((k) => k.kid === first.kid)).toMatchObject({ privateKeyEncrypted: null, retiredAt: later });
    expect(jwksOf(keys, later).keys.map((k) => k.kid)).toEqual([second.kid, first.kid]);
    expect(await verifyWithKeys(old, keys, { issuer: PLATFORM, audience: "app-1", now: later })).toMatchObject({ sub: "1" });

    const dayLater = new Date(later.getTime() + RETIRED_KEY_SECONDS * 1000);
    expect(publishedKeys(keys, dayLater).map((k) => k.kid)).toEqual([second.kid]);
    const third = await rotateAuthKey(store, "app-1", KEY, new Date(dayLater.getTime() + 1000));
    // The first key is deleted; the second stays published for its day.
    expect((await store.listAppAuthKeys("app-1")).map((k) => k.kid)).toEqual([third.kid, second.kid]);
    await expect(signWithKey({ ...first, privateKeyEncrypted: null } as AppAuthKey, KEY, { iss: PLATFORM, aud: "app-1", sub: "1", name: "A", iat: 1, exp: 2 })).rejects.toThrow();
  });

  it("names only proven addresses: an email typed at a phone sign-up isn't sent", () => {
    expect(personClaims({ phone: "+905321234567", email: "typed@example.com", name: "Sara" })).toEqual({ phone: "+905321234567", name: "Sara" });
    expect(personClaims({ phone: null, email: "sara@example.com", name: "Sara" })).toEqual({ email: "sara@example.com", name: "Sara" });
  });

  it("publishes the key set at the app's hosted API, with Yallapp's address as issuer", () => {
    expect(jwksUrl("https://yallapp.test/", "abc")).toBe("https://yallapp.test/api/app/abc/.well-known/jwks.json");
    expect(tokenIssuer("https://yallapp.test/")).toBe("https://yallapp.test");
  });
});

describe("Yallapp's sign-in for an app on its own API", () => {
  let store: MemoryStore;
  let app: App;
  let sender: LogSender;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    app = await ownApiApp(store);
    sender = new LogSender();
    now = NOW;
  });

  const context = (overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip: "203.0.113.34",
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `${PLATFORM}/api/v1/assets/${id}`,
    platformUrl: PLATFORM,
    yallappSignIn: appSignIn(store, app.id, { encryptionKey: KEY, platformUrl: PLATFORM, now: () => now }),
    ...overrides,
  });

  async function call(method: string, route: string, options: { body?: unknown; token?: string | null; query?: Record<string, string> } = {}, overrides: Partial<HostedContext> = {}): Promise<HostedResult> {
    const result = await handleHosted(context(overrides), {
      method,
      path: route.split("/").filter(Boolean),
      query: new URLSearchParams(options.query ?? {}),
      body: options.body,
      token: options.token ?? null,
    });
    return result;
  }

  async function signUp(phone = "5321234567") {
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone } });
    expectContract("POST", "/auth/otp/request", requested);
    const code = sender.sent.get(`+90${phone}`)!;
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: (requested.body as { request_id: string }).request_id, code, device: DEVICE } });
    const signupToken = (verified.body as { signup_token: string }).signup_token;
    const registered = await call("POST", "/auth/register", { body: { signup_token: signupToken, name: "Sara Yilmaz", email: "typed@example.com", device: DEVICE } });
    expectContract("POST", "/auth/register", registered);
    expect(registered.status).toBe(201);
    return registered.body as { access_token: string; refresh_token: string; user: { id: number } };
  }

  it("is only for own API apps whose owner chose it", async () => {
    expect(yallappSignsIn(app)).toBe(true);
    expect(yallappSignsIn({ ...app, hostedSettings: { ...app.hostedSettings!, signInBy: "api" } })).toBe(false);
    expect(yallappSignsIn({ ...app, backend: "hosted" })).toBe(false);
    // The client's API signs people in: the hosted API doesn't answer for the app.
    const theirs = { ...app, hostedSettings: { ...app.hostedSettings!, signInBy: "api" as const } };
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } }, { app: theirs })).status).toBe(404);
    // Without the signer (never in production), neither.
    expect((await call("GET", "/config", { query: { platform: "android", app_version: "1.0.0" } }, { yallappSignIn: null })).status).toBe(404);
    // Email works: the accounts are Yallapp's.
    expect(emailSignInPossible(app)).toBe(true);
    expect(emailSignInPossible(theirs)).toBe(false);
    expect(hostedSignInMethods({ ...app, hostedSettings: { ...app.hostedSettings!, signInMethods: ["phone", "email"] } })).toEqual(["phone", "email"]);
  });

  it("serves a config whose auth says Yallapp signs in, at its own address", async () => {
    const result = await call("GET", "/config", { query: { platform: "ios", app_version: "1.0.0" } });
    expectContract("GET", "/config", result);
    const body = result.body as { auth: Record<string, unknown>; purchases: { enroll_button: boolean } };
    expect(body.auth).toMatchObject({ provider: "yallapp", base_url: `${PLATFORM}/api/app/${app.id}`, methods: ["phone"], preview_sign_in: true });
    expect(body.purchases.enroll_button).toBe(false);
  });

  it("signs people in with ES256 tokens the client's API can check, and refreshes them once", async () => {
    const session = await signUp();
    const keys = await store.listAppAuthKeys(app.id);
    const { payload, protectedHeader } = await jwtVerify(session.access_token, createLocalJWKSet(jwksOf(keys, now)), {
      issuer: PLATFORM,
      audience: app.id,
      currentDate: now,
    });
    expect(protectedHeader).toMatchObject({ alg: "ES256", kid: keys[0]!.kid });
    expect(payload).toMatchObject({ sub: String(session.user.id), phone: "+905321234567", name: "Sara Yilmaz", exp: seconds(now) + 900 });
    // The address typed at sign-up was never proven.
    expect(payload.email).toBeUndefined();

    const me = await call("GET", "/me", { token: session.access_token });
    expectContract("GET", "/me", me);
    expect(me.status).toBe(200);
    expect((await call("GET", "/me/devices", { token: session.access_token })).status).toBe(200);
    // Content is the client's API's, never Yallapp's.
    for (const [method, route] of [["GET", "/pages"], ["GET", "/home"], ["PUT", "/me/push-token"], ["GET", "/me/notifications"], ["GET", "/me/courses"]] as const) {
      expect((await call(method, route, { token: session.access_token, body: { token: "x" } })).status, route).toBe(404);
    }

    now = new Date(now.getTime() + 600_000);
    const refreshed = await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } });
    expectContract("POST", "/auth/refresh", refreshed);
    expect(refreshed.status).toBe(200);
    const next = refreshed.body as { access_token: string; refresh_token: string };
    expect((await verifyWithKeys(next.access_token, keys, { issuer: PLATFORM, audience: app.id, now }))?.name).toBe("Sara Yilmaz");
    // Single use.
    expect((await call("POST", "/auth/refresh", { body: { refresh_token: session.refresh_token } })).status).toBe(401);

    // A hosted-style HS256 token isn't accepted for this app.
    expect((await call("GET", "/me", { token: "eyJhbGciOiJIUzI1NiJ9.e30.x" })).status).toBe(401);

    // Signing out ends the refresh token; the access token expires within 15 minutes.
    expect((await call("POST", "/auth/logout", { token: next.access_token })).status).toBe(204);
    expect((await call("POST", "/auth/refresh", { body: { refresh_token: next.refresh_token } })).status).toBe(401);
    expect((await call("GET", "/me", { token: next.access_token })).status).toBe(401);
  });

  it("refuses a token of another app, and a test token at Yallapp's own endpoints", async () => {
    const session = await signUp();
    const other = await ownApiApp(store);
    const otherCtx = { app: other, yallappSignIn: appSignIn(store, other.id, { encryptionKey: KEY, platformUrl: PLATFORM, now: () => now }) };
    expect((await call("GET", "/me", { token: session.access_token }, otherCtx)).status).toBe(401);
    expect(await otherCtx.yallappSignIn.verify(session.access_token)).toBeNull();

    const test = await issueTestToken(store, app, { encryptionKey: KEY, platformUrl: PLATFORM, now });
    expect(test).not.toBeNull();
    const claims = await verifyWithKeys(test!.token, await store.listAppAuthKeys(app.id), { issuer: PLATFORM, audience: app.id, now });
    expect(claims).toMatchObject({ sub: String(test!.user.id), phone: "+905320000001", name: "Store review" });
    expect(claims?.did).toBeUndefined();
    expect(test!.expiresAt.getTime()).toBe(now.getTime() + 900_000);
    expect((await call("GET", "/me", { token: test!.token })).status).toBe(401);
    // The same review account each time.
    expect((await reviewUser(store, app, now))?.id).toBe(test!.user.id);
  });

  it("signs the store review number in without a code, also in the preview", async () => {
    const requested = await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5320000001", preview: true } }, { preview: { draft: false }, active: false });
    expect(requested.status).toBe(200);
    expect(sender.sent.size).toBe(0);
    const verified = await call("POST", "/auth/otp/verify", { body: { request_id: (requested.body as { request_id: string }).request_id, code: "246810", device: DEVICE } }, { preview: { draft: false }, active: false });
    expect((verified.body as { signup_required?: boolean }).signup_required).toBe(true);
    // A paused app's real users can't sign in.
    expect((await call("POST", "/auth/otp/request", { body: { country_code: "+90", phone: "5321234567" } }, { active: false })).status).toBe(503);
  });

  it("gives the build and the preview Yallapp's address for sign-in", () => {
    const built = buildConfigFor(app, { id: app.clientId }, { name: "1.0.0", code: 1 }, (id) => id);
    expect(built.api_base_url).toBe("https://api.academy.test/yallapp/v1");
    expect(built.auth_base_url).toMatch(new RegExp(`/api/app/${app.id}$`));
    expect(validateBuildConfig({ ...built, auth_base_url: `https://yallapp.com.tr/api/app/${app.id}`, app_name: "Ada", short_name: "Ada" })).toMatchObject({ ok: true });
    const theirs = { ...app, hostedSettings: { ...app.hostedSettings!, signInBy: "api" as const } };
    expect(buildConfigFor(theirs, { id: app.clientId }, { name: "1.0.0", code: 1 }, (id) => id).auth_base_url).toBeUndefined();

    const grant = { appId: app.id, draft: false, expiresAt: new Date(NOW.getTime() + 3600_000) };
    const preview = previewConfigFor(app, grant, { token: "preview-token", platformUrl: PLATFORM, assetUrl: (id) => id, plan: null });
    expect(preview.config.auth_base_url).toBe(`${PLATFORM}/api/app/${app.id}`);
    expect(preview.config.api_base_url).toBe("https://api.academy.test/yallapp/v1");
    expect(preview.preview).toMatchObject({ content_source: "custom_api", api_token: "preview-token" });
    const own = previewConfigFor(theirs, grant, { token: "preview-token", platformUrl: PLATFORM, assetUrl: (id) => id, plan: null });
    expect(own.config.auth_base_url).toBeUndefined();
    expect(own.preview.api_token).toBeNull();
  });
});

describe("the API check when Yallapp signs people in", () => {
  const CONFIG = {
    site: { name: "Ada", url: "https://ada.test" },
    branding: { primary_color: "#0E0D24" },
    features: { lms: "yallapp" },
    purchases: {},
    content: {},
    app: { update_required: false, maintenance: false },
  };
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  function fakeApi(validToken: string) {
    const seen: string[] = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("authorization");
      seen.push(`${init?.method ?? "GET"} ${new URL(url).pathname}${auth ? " (token)" : ""}`);
      if (url.includes("/config")) return json(200, CONFIG);
      if (url.endsWith("/home")) return json(200, { sections: [] });
      if (url.endsWith("/me/courses")) return auth === `Bearer ${validToken}` ? json(200, { items: [] }) : json(401, { code: "invalid_token", message: "Sign in." });
      return json(404, { code: "not_found", message: "No." });
    };
    return { fetcher, seen };
  }
  const resolve = async () => ["93.184.216.34"];

  it("needs no sign-in in /config and probes no sign-in endpoint", async () => {
    expect(configProblems(CONFIG, { yallappSignIn: true })).toEqual([]);
    expect(configProblems(CONFIG)).toContain("auth.signup_allowed");
    const api = fakeApi("good");
    const result = await checkApi("https://api.ada.test/v1", "lms", { fetcher: api.fetcher, resolve, yallappSignIn: { token: "good" } });
    expect(result.ok).toBe(true);
    expect(result.checks.map((c) => c.id)).toEqual(["reachable", "config", "app_type", "home", "no_token", "test_token"]);
    expect(api.seen.filter((s) => s.startsWith("POST"))).toEqual([]);
    expect(result.signIn).toBeUndefined();
  });

  it("fails when the API takes no token or refuses Yallapp's", async () => {
    const api = fakeApi("good");
    const refused = await checkApi("https://api.ada.test/v1", "lms", { fetcher: api.fetcher, resolve, yallappSignIn: { token: "other" } });
    expect(refused.checks.find((c) => c.id === "test_token")).toMatchObject({ ok: false, detail: expect.stringContaining("401") });
    const open = async (url: string) => (url.includes("/config") ? json(200, CONFIG) : json(200, { sections: [], items: [] }));
    const result = await checkApi("https://api.ada.test/v1", "lms", { fetcher: open, resolve, yallappSignIn: { token: null } });
    expect(result.checks.find((c) => c.id === "no_token")).toMatchObject({ ok: false });
    // Without a store review account there's no test token: that check is left out.
    expect(result.checks.find((c) => c.id === "test_token")).toBeUndefined();
  });

  it("knows a signed-in endpoint per app type", () => {
    expect(signedInPath("lms")).toBe("/me/courses");
    expect(signedInPath("booking")).toBe("/me/appointments");
    expect(signedInPath("store")).toBe("/me/orders");
    expect(signedInPath("store", { orders: false })).toBeNull();
    expect(signedInPath("news")).toBeNull();
  });

  it("makes a test token only for an app Yallapp signs people in to", async () => {
    const { store } = await setupClient();
    const app = await ownApiApp(store);
    expect((await apiCheckSignIn(store, app, { encryptionKey: KEY, platformUrl: PLATFORM, now: NOW }))?.token).toMatch(/^eyJ/);
    const theirs = await ownApiApp(store, "api");
    expect(await apiCheckSignIn(store, theirs, { encryptionKey: KEY, platformUrl: PLATFORM, now: NOW })).toBeNull();
    const noReview = { ...app, hostedSettings: { ...app.hostedSettings!, reviewPhone: null, reviewEmail: null } };
    expect(await apiCheckSignIn(store, noReview, { encryptionKey: KEY, platformUrl: PLATFORM, now: NOW })).toEqual({ token: null });
  });
});
