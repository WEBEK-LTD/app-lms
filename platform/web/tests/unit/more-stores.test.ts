import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildConfigFor, hasStoreKeys, initialStages, newApp } from "@/lib/app/setup";
import { validateBuildConfig } from "@/lib/build-config/validate";
import { applyPipelineStatus, pipelineStatusSchema } from "@/lib/builds/pipeline";
import { buildSecrets, keyContext } from "@/lib/builds/signing";
import { failureReason } from "@/lib/builds/view";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Build, PublishingRequest } from "@/lib/data/types";
import { hmsCredentialsOf, serviceAccountOf, SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { HMS_PUSH_URL, HMS_TOKEN_URL, hmsMessage, pushTarget, sendHmsPush, sendPush } from "@/lib/hosted/push";
import {
  checkAgconnectServices,
  checkGalaxyContentId,
  checkGalaxyPrivateKey,
  checkGalaxyServiceAccountId,
  checkHuaweiAppId,
  checkHuaweiSecret,
} from "@/lib/publishing/more-stores";
import {
  checklistProgress,
  isLiveEverywhere,
  isLiveSomewhere,
  newPublishingRequest,
  publishingEventLabel,
  requestStores,
  statusText,
  stepsFor,
  storeUrlProblem,
  trackOf,
  withMoreStores,
} from "@/lib/publishing/steps";
import { KEY, NOW } from "./helpers";

const { privateKey: rsaPem } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
const { privateKey: ecPem } = generateKeyPairSync("ec", { namedCurve: "P-256", privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });

function app(patch: Partial<App> = {}): App {
  return { ...newApp("client-1", "https://academy.test", NOW), androidPackage: "com.academy.app", iosBundleId: "com.academy.app", ...patch };
}

function withStoreKeys(base: App): App {
  return {
    ...base,
    galaxyContentId: "000001234567",
    galaxyServiceAccountId: "sa-123456",
    galaxyKeyEncrypted: encrypt(rsaPem, KEY, keyContext.galaxyStore(base.id)),
    huaweiAppId: "104123456",
    huaweiClientId: "client-777",
    huaweiClientSecretEncrypted: encrypt("connect-secret-0123456789", KEY, keyContext.appGallery(base.id)),
  };
}

const agconnect = (packageName = "com.academy.app") =>
  JSON.stringify({ client: { app_id: "104123456", package_name: packageName, client_secret: "x" }, app_info: { app_id: "104123456", package_name: packageName } });

describe("35, 36 store keys for the pipeline", () => {
  it("sends Galaxy Store and AppGallery keys only to builds that upload", () => {
    const keyed = withStoreKeys(app());
    expect(buildSecrets(keyed, KEY)).toMatchObject({ galaxy_store: null, huawei_appgallery: null });
    expect(buildSecrets(keyed, KEY, { autoPublish: false })).toMatchObject({ galaxy_store: null, huawei_appgallery: null });
    expect(buildSecrets(keyed, KEY, { autoPublish: true })).toMatchObject({
      galaxy_store: { content_id: "000001234567", service_account_id: "sa-123456", private_key: rsaPem },
      huawei_appgallery: { app_id: "104123456", client_id: "client-777", client_secret: "connect-secret-0123456789" },
    });
    // Without keys there's nothing, even with uploads.
    expect(buildSecrets(app(), KEY, { autoPublish: true })).toMatchObject({ galaxy_store: null, huawei_appgallery: null });
  });

  it("a key can't be moved to another app or column", () => {
    const keyed = withStoreKeys(app());
    const moved = { ...keyed, id: "another-app" };
    expect(() => buildSecrets(moved, KEY, { autoPublish: true })).toThrow();
  });

  it("starts the upload stages only with the plan and the keys", () => {
    const keyed = withStoreKeys(app());
    expect(hasStoreKeys(keyed)).toMatchObject({ galaxy: true, appGallery: true });
    expect(initialStages(true, keyed)).toMatchObject({ upload_galaxy: "pending", upload_appgallery: "pending" });
    expect(initialStages(false, keyed)).toMatchObject({ upload_galaxy: "skipped", upload_appgallery: "skipped" });
    expect(initialStages(true, app())).toMatchObject({ upload_galaxy: "skipped", upload_appgallery: "skipped" });
  });

  it("takes the pipeline's report of both uploads", async () => {
    const store = new MemoryStore();
    const base = app();
    await store.createApp(base);
    const build = await store.createBuild({
      id: "b-35",
      clientId: base.clientId,
      appId: base.id,
      versionName: "1.0.1",
      status: "building",
      // Queued before these stages existed.
      stages: { queued: "done", android: "running", ios: "skipped", upload_play: "skipped", upload_testflight: "skipped" },
      config: {} as Build["config"],
      storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
      autoPublish: true,
      artifacts: [],
      message: null,
      logUrl: null,
      createdAt: NOW,
      startedAt: NOW,
      finishedAt: null,
      updatedAt: NOW,
    });
    const update = pipelineStatusSchema.parse({
      status: "ready",
      stages: { android: "done", upload_galaxy: "done", upload_appgallery: "failed" },
      message: "The upload to Huawei AppGallery didn't work.",
    });
    const result = await applyPipelineStatus(store, build, update, NOW);
    expect(result.ok && result.build.stages).toMatchObject({ upload_galaxy: "done", upload_appgallery: "failed" });
    expect(pipelineStatusSchema.safeParse({ stages: { upload_amazon: "done" } }).success).toBe(false);
    expect(failureReason({ message: null, stages: { ...build.stages, upload_galaxy: "failed" } })).toBe("The upload to Galaxy Store didn't work.");
  });

  it("puts agconnect-services.json in the build config", () => {
    const config = buildConfigFor(app({ appName: "Academy", shortName: "Academy", huaweiAgconnectAssetId: "asset-1" }), { id: "client-1" }, { name: "1.0.0", code: 1 }, (id) => `https://yallapp.test/api/v1/assets/${id}`);
    expect(config.huawei).toEqual({ agconnect_config_url: "https://yallapp.test/api/v1/assets/asset-1" });
    expect(validateBuildConfig(config).ok).toBe(true);
    const without = buildConfigFor(app({ appName: "Academy", shortName: "Academy" }), { id: "client-1" }, { name: "1.0.0", code: 1 }, (id) => id);
    expect(without).not.toHaveProperty("huawei");
  });
});

describe("35, 36 the details the client enters", () => {
  it("checks the Galaxy Store content ID, service account and key", () => {
    expect(checkGalaxyContentId("000001234567")).toBeNull();
    expect(checkGalaxyContentId("com.academy.app")).toMatch(/content ID/);
    expect(checkGalaxyServiceAccountId("sa-123456")).toBeNull();
    expect(checkGalaxyServiceAccountId("has spaces in it")).toMatch(/service account ID/);
    expect(checkGalaxyPrivateKey(`\n${rsaPem}\n`)).toEqual({ ok: true, value: rsaPem.trim() });
    expect(checkGalaxyPrivateKey(ecPem).ok).toBe(false);
    expect(checkGalaxyPrivateKey("-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----").ok).toBe(false);
    expect(checkGalaxyPrivateKey("just text").ok).toBe(false);
  });

  it("checks agconnect-services.json against the package name and reads the app ID", () => {
    expect(checkAgconnectServices(agconnect(), "com.academy.app")).toEqual({ ok: true, value: { appId: "104123456" } });
    const other = checkAgconnectServices(agconnect("com.other.app"), "com.academy.app");
    expect(other.ok === false && other.error).toMatch(/com\.other\.app, not com\.academy\.app/);
    expect(checkAgconnectServices("{}", "com.academy.app").ok).toBe(false);
    expect(checkAgconnectServices("not json", "com.academy.app").ok).toBe(false);
  });

  it("checks the Huawei app ID and secrets", () => {
    expect(checkHuaweiAppId("104123456")).toBeNull();
    expect(checkHuaweiAppId("abc")).toMatch(/app ID/);
    expect(checkHuaweiSecret("0123456789abcdef0123456789abcdef", "push")).toBeNull();
    expect(checkHuaweiSecret("short", "push")).toMatch(/app secret/);
    expect(checkHuaweiSecret("with a space in the middle", "client")).toMatch(/API client/);
  });
});

describe("35, 36 Publish it for me on more stores", () => {
  const request = (): PublishingRequest => newPublishingRequest({ id: "app-1", clientId: "client-1" }, "managed", NOW);
  const listed = app({ storeTitle: "Academy", shortDescription: "Short", fullDescription: "Full", supportEmail: "a@b.test", privacyUrl: "https://b.test/p" });

  it("adds and drops the extra stores", () => {
    const base = request();
    expect(requestStores(base)).toEqual(["android", "ios"]);
    const both = withMoreStores(base, ["galaxy", "huawei", "amazon"]);
    expect(requestStores(both)).toEqual(["android", "ios", "galaxy", "huawei"]);
    expect(trackOf(both, "galaxy")).toMatchObject({ status: "waiting_client" });
    // Dropping one keeps the other's progress.
    const moved = { ...both, huawei: { ...trackOf(both, "huawei"), status: "submitted" as const } };
    const galaxyOnly = withMoreStores(moved, ["huawei"]);
    expect(requestStores(galaxyOnly)).toEqual(["android", "ios", "huawei"]);
    expect(trackOf(galaxyOnly, "huawei").status).toBe("submitted");
  });

  it("adds each store's steps to the checklist only when asked", () => {
    const base = { ...request(), listing: { playCategory: "Education", appStoreCategory: "Education", contentRatingNotes: "Courses only", reviewNotes: null } };
    expect(stepsFor(base).map((s) => s.id)).not.toContain("galaxy_invite");
    expect(checklistProgress(base, listed).total).toBe(6);
    const galaxy = withMoreStores(base, ["galaxy"]);
    expect(stepsFor(galaxy).map((s) => s.id)).toEqual(expect.arrayContaining(["galaxy_account", "galaxy_invite"]));
    expect(stepsFor(galaxy).map((s) => s.id)).not.toContain("huawei_invite");
    expect(checklistProgress(galaxy, listed).total).toBe(8);
  });

  it("is live everywhere only when every store it covers is", () => {
    const live = { status: "live" as const, note: null, storeUrl: "https://x", updatedAt: NOW };
    const both = { ...request(), android: live, ios: live };
    expect(isLiveEverywhere(both)).toBe(true);
    const galaxy = withMoreStores(both, ["galaxy"]);
    expect(isLiveEverywhere(galaxy)).toBe(false);
    expect(isLiveEverywhere({ ...galaxy, galaxy: live })).toBe(true);
    expect(isLiveSomewhere(withMoreStores(request(), ["huawei"]))).toBe(false);
  });

  it("words and links for the new stores", () => {
    expect(statusText("galaxy", "in_review")).toBe("Samsung is reviewing your app. This usually takes a few days.");
    expect(statusText("huawei", "live")).toBe("Your app is live on AppGallery.");
    expect(storeUrlProblem("galaxy", "https://galaxystore.samsung.com/detail/com.academy.app")).toBeNull();
    expect(storeUrlProblem("galaxy", "https://play.google.com/store/apps/details?id=x")).toMatch(/galaxystore\.samsung\.com/);
    expect(storeUrlProblem("huawei", "https://appgallery.huawei.com/app/C104123456")).toBeNull();
    expect(publishingEventLabel({ store: "huawei", status: "submitted" }, "client")).toBe("Huawei AppGallery: Submitted");
  });

  it("keeps the extra stores in the memory store", async () => {
    const store = new MemoryStore();
    const owned = app();
    await store.createApp(owned);
    const saved = withMoreStores(newPublishingRequest(owned, "managed", NOW), ["galaxy"]);
    await store.savePublishingRequest(saved);
    expect(requestStores((await store.getPublishingRequest(owned.id))!)).toEqual(["android", "ios", "galaxy"]);
  });
});

describe("36 Huawei Push Kit from the hosted API", () => {
  type Call = { url: string; init: RequestInit };
  function fakeFetch(answers: (url: string, init: RequestInit) => unknown, calls: Call[] = []) {
    return (async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = String(input);
      calls.push({ url, init });
      return new Response(JSON.stringify(answers(url, init)), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
  }
  const hms = { app_id: "104123456", app_secret: "app-secret-0123456789" };
  const message = { title: "New lesson", body: "Loops", data: { type: "new_lesson", lesson_id: "7" } };

  it("signs in with the app ID and secret and sends the tokens with the data", async () => {
    const calls: Call[] = [];
    const fetcher = fakeFetch((url) => (url === HMS_TOKEN_URL ? { access_token: "hms-access", expires_in: 3600 } : { code: "80000000", msg: "Success" }), calls);
    const result = await sendHmsPush(hms, ["t1", "t2"], message, { fetcher });
    expect(result).toEqual({ sent: 2, invalidTokens: [] });
    expect(calls.map((c) => c.url)).toEqual([HMS_TOKEN_URL, `${HMS_PUSH_URL}/104123456/messages:send`]);
    expect(String(calls[0]!.init.body)).toBe("grant_type=client_credentials&client_id=104123456&client_secret=app-secret-0123456789");
    expect((calls[1]!.init.headers as Record<string, string>).authorization).toBe("Bearer hms-access");
    const body = JSON.parse(String(calls[1]!.init.body));
    expect(body).toEqual(hmsMessage(["t1", "t2"], message));
    expect(body.message.token).toEqual(["t1", "t2"]);
    expect(JSON.parse(body.message.data)).toEqual(message.data);
    expect(body.message.android.notification.click_action).toEqual({ type: 3 });
  });

  it("forgets the tokens Push Kit refuses", async () => {
    const partly = fakeFetch((url) => (url === HMS_TOKEN_URL ? { access_token: "a" } : { code: "80100000", msg: JSON.stringify({ success: 1, failure: 1, illegal_tokens: ["t2"] }) }));
    expect(await sendHmsPush(hms, ["t1", "t2"], message, { fetcher: partly })).toEqual({ sent: 1, invalidTokens: ["t2"] });
    const none = fakeFetch((url) => (url === HMS_TOKEN_URL ? { access_token: "a" } : { code: "80300007", msg: "All the tokens are invalid" }));
    expect(await sendHmsPush(hms, ["t1"], message, { fetcher: none })).toEqual({ sent: 0, invalidTokens: ["t1"] });
    const refused = (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch;
    await expect(sendHmsPush(hms, ["t1"], message, { fetcher: refused })).rejects.toThrow(/Huawei sign-in for push failed/);
  });

  it("sends each token through its own service", async () => {
    const calls: Call[] = [];
    const fetcher = fakeFetch((url) => {
      if (url === HMS_TOKEN_URL) return { access_token: "hms-access" };
      if (url.startsWith(HMS_PUSH_URL)) return { code: "80000000" };
      if (url.includes("oauth2.googleapis.com")) return { access_token: "google-access" };
      return { name: "projects/rose/messages/1" };
    }, calls);
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    const account = { project_id: "rose", client_email: "push@rose.iam", private_key: privateKey, hms };
    const targets = [pushTarget({ pushToken: "fcm-1", pushProvider: "fcm" }), pushTarget({ pushToken: "hms-1", pushProvider: "hms" }), "fcm-2"];
    expect(targets).toEqual(["fcm-1", { token: "hms-1", provider: "hms" }, "fcm-2"]);
    const result = await sendPush(account, targets, message, { fetcher, now: NOW });
    expect(result.sent).toBe(3);
    const hmsSend = calls.find((c) => c.url.startsWith(HMS_PUSH_URL))!;
    expect(JSON.parse(String(hmsSend.init.body)).message.token).toEqual(["hms-1"]);
    const fcmTokens = calls.filter((c) => c.url.includes("fcm.googleapis.com")).map((c) => JSON.parse(String(c.init.body)).message.token);
    expect(fcmTokens).toEqual(["fcm-1", "fcm-2"]);

    // Without Push Kit credentials, Huawei tokens are skipped (not sent to Firebase).
    const fcmOnly: Call[] = [];
    const skipped = await sendPush({ ...account, hms: null }, targets, message, { fetcher: fakeFetch((url) => (url.includes("oauth2") ? { access_token: "g" } : {}), fcmOnly), now: NOW });
    expect(skipped.sent).toBe(2);
    expect(fcmOnly.some((c) => c.url.startsWith(HMS_PUSH_URL) || String(c.init.body).includes("hms-1"))).toBe(false);
  });

  it("carries the app's Push Kit credentials with its Firebase account", () => {
    const base = app();
    const serviceAccount = JSON.stringify({ type: "service_account", project_id: "rose", client_email: "push@rose.iam", private_key: "-----BEGIN PRIVATE KEY-----\nAAA\n-----END PRIVATE KEY-----\n" });
    const withFirebase = { ...base, firebaseServiceAccountEncrypted: encrypt(serviceAccount, KEY, `${SERVICE_ACCOUNT_CONTEXT}:${base.id}`) };
    expect(serviceAccountOf(withFirebase, KEY)?.hms).toBeNull();
    const withHuawei = { ...withFirebase, huaweiAppId: "104123456", huaweiPushSecretEncrypted: encrypt("app-secret-0123456789", KEY, keyContext.huaweiPush(base.id)) };
    expect(hmsCredentialsOf(withHuawei, KEY)).toEqual(hms);
    expect(serviceAccountOf(withHuawei, KEY)).toMatchObject({ project_id: "rose", hms });
  });
});
