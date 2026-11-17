import { generateKeyPairSync, randomUUID } from "node:crypto";
import { createLocalJWKSet, decodeJwt, jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newApp } from "@/lib/app/setup";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App, FirebaseProject } from "@/lib/data/types";
import { pushSetupForNewApp, yallappFirebase, yallappFirebaseOffered } from "@/lib/firebase/env";
import { endpointsAt } from "@/lib/google/endpoints";
import { forgetFederatedTokens, type Federation } from "@/lib/google/federation";
import { ensurePlatformKey, platformJwks, signPlatformJwt } from "@/lib/google/platform-keys";
import { pushConfigured, SERVICE_ACCOUNT_CONTEXT, serviceAccountOf } from "@/lib/hosted/notify";
import { checkFirebaseAccount, googleAccessToken, sendPush, type ServiceAccount } from "@/lib/hosted/push";
import type { ApnsTransport } from "@/lib/hosted/apns";
import { integrationsOf, testIntegration } from "@/lib/integrations";
import { runFrequentJobs } from "@/lib/jobs/frequent";
import { liveDatabase } from "@/lib/taxi/live";
import { FakeGoogle } from "./fake-google";
import { KEY, NOW } from "./helpers";

/**
 * 136 Sending in both modes: an app on its own Firebase sends as before
 * (its service account, Google's token endpoint, FCM); an app in Yallapp's
 * Firebase gets Yallapp's project and push sender, no key, and its token
 * through Workload Identity Federation. Without the three settings Yallapp's
 * Firebase is off and nothing calls Google.
 */

const PROVIDER = "projects/123456789012/locations/global/workloadIdentityPools/yallapp-platform/providers/platform";
const PUSH = "yallapp-push-sender@yallapp-firebase.iam.gserviceaccount.com";
const APPS = "yallapp-firebase-apps@yallapp-firebase.iam.gserviceaccount.com";
const message = { title: "Hello", body: "Fresh tulips", data: { type: "announcement" } };

function yallappEnv() {
  vi.stubEnv("GOOGLE_WIF_PROVIDER", PROVIDER);
  vi.stubEnv("GOOGLE_PUSH_SERVICE_ACCOUNT", PUSH);
  vi.stubEnv("GOOGLE_FIREBASE_APPS_SERVICE_ACCOUNT", APPS);
}

function hosted(patch: Partial<App> = {}): App {
  return { ...newApp("client-1", null, NOW, "store"), id: randomUUID(), backend: "hosted", androidPackage: "com.rose.app", ...patch };
}

function setup() {
  const store = new MemoryStore();
  const google = new FakeGoogle({
    provider: PROVIDER,
    accounts: { "push-sender": PUSH, "firebase-apps": APPS },
    verify: async (jwt) => (await jwtVerify(jwt, createLocalJWKSet(platformJwks(await store.listPlatformSigningKeys("gcp-wif"), new Date())), { currentDate: new Date(((decodeJwt(jwt).iat ?? 0) + 1) * 1000) })).payload,
  });
  const federation: Federation = {
    provider: PROVIDER,
    issuer: "https://yallapp.com.tr/oidc",
    endpoints: endpointsAt("https://google.test"),
    sign: async (claims) => signPlatformJwt(await ensurePlatformKey(store, "gcp-wif", KEY, NOW), KEY, claims),
  };
  return { store, google, federation };
}

beforeEach(() => forgetFederatedTokens());
afterEach(() => {
  vi.unstubAllEnvs();
  forgetFederatedTokens();
});

describe("136 the account an app sends with", () => {
  it("is off for Yallapp's Firebase until it's set up here and the app has its project", () => {
    const app = hosted({ pushSetup: "yallapp", firebaseProjectId: "yallapp-push-01" });
    expect(serviceAccountOf(app, KEY)).toBeNull();
    expect(pushConfigured(app)).toBe(false);
    yallappEnv();
    expect(serviceAccountOf(hosted({ pushSetup: "yallapp" }), KEY)).toBeNull();
    expect(serviceAccountOf(app, KEY)).toEqual({ apns: null, project_id: "yallapp-push-01", client_email: PUSH, private_key: "", federated: true, hms: null });
    expect(pushConfigured(app)).toBe(true);
  });

  it("stays the client's own service account for an app on its own Firebase, set up here or not", () => {
    yallappEnv();
    const key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const app = hosted({ pushSetup: null });
    app.firebaseServiceAccountEncrypted = encrypt(JSON.stringify({ type: "service_account", project_id: "rose-shop", client_email: "push@rose-shop.iam.gserviceaccount.com", private_key: key }), KEY, `${SERVICE_ACCOUNT_CONTEXT}:${app.id}`);
    expect(serviceAccountOf(app, KEY)).toMatchObject({ project_id: "rose-shop", client_email: "push@rose-shop.iam.gserviceaccount.com", hms: null });
    expect(serviceAccountOf(app, KEY)?.federated).toBeUndefined();
    expect(pushConfigured(app)).toBe(true);
    expect(pushConfigured(hosted({ pushSetup: null }))).toBe(false);
    // A WordPress app with the choice stored isn't in Yallapp's Firebase (Phase 3): its own key, as before.
    expect(pushConfigured({ ...app, backend: "wordpress", pushSetup: "yallapp" })).toBe(true);
  });
});

describe("136 sending", () => {
  it("in Yallapp's Firebase: signs in without a key, then sends to Yallapp's project", async () => {
    const { google, federation } = setup();
    const account: ServiceAccount = { project_id: "yallapp-push-01", client_email: PUSH, private_key: "", federated: true };
    const result = await sendPush(account, ["tok-1", "gone-2", { token: "tok-3", provider: "fcm" }], message, { fetcher: google.fetch, now: NOW, federation });
    expect(result).toEqual({ sent: 2, invalidTokens: ["gone-2"] });
    expect(google.calls.map((c) => c.path)).toEqual([
      "/sts/v1/token",
      `/iamcredentials/v1/projects/-/serviceAccounts/${PUSH}:generateAccessToken`,
      "/fcm/v1/projects/yallapp-push-01/messages:send",
      "/fcm/v1/projects/yallapp-push-01/messages:send",
      "/fcm/v1/projects/yallapp-push-01/messages:send",
    ]);
    expect(google.pushes.map((p) => [p.token, p.authorization])).toEqual([
      ["tok-1", `Bearer ya29.${PUSH}`],
      ["tok-3", `Bearer ya29.${PUSH}`],
    ]);
    expect(google.pushes[0]!.message).toMatchObject({ notification: { title: "Hello", body: "Fresh tulips" }, data: { type: "announcement" }, android: { priority: "high" } });
    // The next push reuses the token: no new sign-in.
    await sendPush(account, ["tok-4"], message, { fetcher: google.fetch, now: NOW, federation });
    expect(google.calls.filter((c) => c.path === "/sts/v1/token")).toHaveLength(1);
    // Integrations' test: the push sender signs in.
    forgetFederatedTokens();
    await expect(checkFirebaseAccount(account, { fetcher: google.fetch, now: NOW, federation })).resolves.toBeUndefined();
  });

  it("on the client's own Firebase: Google's token endpoint and FCM, as before", async () => {
    const key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const urls: string[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      return new Response(JSON.stringify(url.includes("oauth2") ? { access_token: "own-token", expires_in: 3600 } : { name: "m" }), { status: 200 });
    };
    const result = await sendPush({ project_id: "rose-shop", client_email: "push@rose-shop.iam.gserviceaccount.com", private_key: key }, ["tok-1"], message, { fetcher, now: NOW });
    expect(result).toEqual({ sent: 1, invalidTokens: [] });
    expect(urls).toEqual(["https://oauth2.googleapis.com/token", "https://fcm.googleapis.com/v1/projects/rose-shop/messages:send"]);
  });

  it("fails clearly when Yallapp's Firebase isn't set up on this server", async () => {
    const account: ServiceAccount = { project_id: "yallapp-push-01", client_email: PUSH, private_key: "", federated: true };
    const fetcher = vi.fn<typeof fetch>();
    await expect(sendPush(account, ["tok-1"], message, { fetcher, now: NOW })).rejects.toThrow("Yallapp's Firebase isn't set up on this server");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends Phase 2's apns tokens straight to Apple with the client's key, or skips them", async () => {
    const pem = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const sent: string[] = [];
    const apnsTransport: ApnsTransport = () => ({ send: async (request) => (sent.push(request.path), { status: 200, reason: null }), close: () => {} });
    const fetcher = vi.fn<typeof fetch>();
    const apns = { keyId: "ABCDE12345", teamId: "TEAM123456", privateKey: pem, bundleId: "com.rose.shop" };
    const account: ServiceAccount = { project_id: "p", client_email: "e", private_key: "", federated: true, apns };
    const token = "a".repeat(64);
    expect(await sendPush(account, [{ token, provider: "apns" }], message, { fetcher, now: NOW, apnsTransport })).toEqual({ sent: 1, invalidTokens: [] });
    expect(sent).toEqual([`/3/device/${token}`]);
    expect(await sendPush({ ...account, apns: null }, [{ token, provider: "apns" }], message, { fetcher, now: NOW, apnsTransport })).toEqual({ sent: 0, invalidTokens: [] });
    expect(sent).toHaveLength(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps the taxi's live database on the client's own Firebase", async () => {
    const account: ServiceAccount = { project_id: "p", client_email: PUSH, private_key: "", federated: true };
    expect(liveDatabase({ id: "a" }, { databaseUrl: "https://x-default-rtdb.firebaseio.com" }, account)).toBeNull();
    await expect(googleAccessToken(account, "https://www.googleapis.com/auth/firebase.database")).rejects.toThrow("only sends pushes");
  });
});

describe("136 the Integrations page", () => {
  it("shows Yallapp's Firebase as connected, or being set up, and tests it by signing in", async () => {
    const pending = hosted({ pushSetup: "yallapp" });
    yallappEnv();
    expect(integrationsOf({ app: pending, activation: null, errors: [] }).find((r) => r.key === "push")).toMatchObject({ state: "not_set", reason: "yallapp_firebase_pending", testable: false });
    const ready = hosted({ pushSetup: "yallapp", firebaseProjectId: "yallapp-push-01" });
    expect(integrationsOf({ app: ready, activation: null, errors: [] }).find((r) => r.key === "push")).toMatchObject({ state: "connected", reason: "yallapp_firebase", testable: true });
    expect(integrationsOf({ app: hosted({ pushSetup: null }), activation: null, errors: [] }).find((r) => r.key === "push")).toMatchObject({ state: "not_set", reason: "no_firebase" });
    // Its test, with Google unreachable from here: refused, with the reason.
    const check = await testIntegration("push", ready, { store: new MemoryStore(), encryptionKey: KEY, now: NOW, fetcher: async () => new Response("{}", { status: 503 }) });
    expect(check).toMatchObject({ ok: false, code: "yallapp_push_refused" });
  });
});

describe("136 off unless set up", () => {
  it("offers nothing, defaults nothing and calls nobody without the three settings", async () => {
    const store = new MemoryStore();
    const project: FirebaseProject = { projectId: "yallapp-push-01", projectNumber: "1", apiKeyId: "k", maxApps: 28, status: "open", createdBy: "team", creation: null, checkedAt: null, checkProblem: null, createdAt: NOW, updatedAt: NOW };
    await store.saveFirebaseProject(project);
    expect(yallappFirebase(store)).toBeNull();
    expect(await pushSetupForNewApp(store, { appType: "store", vertical: null })).toBeNull();
    expect(await yallappFirebaseOffered(store, hosted())).toBe(false);
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    const report = await runFrequentJobs({ store, key: KEY, now: NOW, ownerPush: { store, now: NOW, account: null } });
    expect(report.firebase).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("set up and with room: new apps start in it, and hosted apps are offered it", async () => {
    yallappEnv();
    const store = new MemoryStore();
    expect(await pushSetupForNewApp(store, { appType: "store", vertical: null })).toBeNull();
    // No project with room yet: offered only when the platform can make one.
    expect(await yallappFirebaseOffered(store, hosted())).toBe(false);
    vi.stubEnv("GOOGLE_FIREBASE_PROJECT_PARENT", "organizations/555000111222");
    expect(await yallappFirebaseOffered(store, hosted())).toBe(true);
    vi.stubEnv("GOOGLE_FIREBASE_PROJECT_PARENT", "");
    await store.saveFirebaseProject({ projectId: "yallapp-push-01", projectNumber: "1", apiKeyId: "k", maxApps: 28, status: "open", createdBy: "team", creation: null, checkedAt: null, checkProblem: null, createdAt: NOW, updatedAt: NOW });
    expect(await pushSetupForNewApp(store, { appType: "store", vertical: null })).toBe("yallapp");
    expect(await yallappFirebaseOffered(store, hosted())).toBe(true);
    // WordPress and own API apps aren't offered it in Phase 1.
    expect(await yallappFirebaseOffered(store, hosted({ backend: "wordpress" }))).toBe(false);
    expect(await yallappFirebaseOffered(store, hosted({ backend: "custom_api" }))).toBe(false);
  });
});
