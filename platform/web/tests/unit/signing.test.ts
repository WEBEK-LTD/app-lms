import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET as getSecrets } from "@/app/api/v1/builds/[id]/secrets/route";
import { PUT as putSigning } from "@/app/api/v1/builds/[id]/signing/route";
import { newApp } from "@/lib/app/setup";
import { buildSecrets, keyContext, signingKeysSchema } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import type { DataStore } from "@/lib/data/store";
import type { App, Build, BuildStatus } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { KEY, NOW } from "./helpers";

const TOKEN = "pipeline-token-for-unit-tests-0123456789";
const auth = { authorization: `Bearer ${TOKEN}` };

const androidKey = {
  keystore_base64: Buffer.from("pkcs12 keystore bytes").toString("base64"),
  store_password: "store-password-0123456789",
  key_alias: "upload",
  key_password: "key-password-0123456789ab",
};
const iosKey = { p12_base64: Buffer.from("p12 bytes").toString("base64"), password: "p12-password-0123456789", certificate_id: "ABC123DEF4" };

const serviceAccount = JSON.stringify({ type: "service_account", client_email: "publisher@x.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nAAA\n-----END PRIVATE KEY-----\n" });
const p8 = "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49\n-----END PRIVATE KEY-----";

const context = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const secrets = (id: string, headers: Record<string, string> = auth) =>
  getSecrets(new Request(`https://yallapp.test/api/v1/builds/${id}/secrets`, { headers }), context(id));
const signing = (id: string, body: unknown, headers: Record<string, string> = auth) =>
  putSigning(
    new Request(`https://yallapp.test/api/v1/builds/${id}/signing`, {
      method: "PUT",
      headers: { ...headers, "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    context(id),
  );

let store: DataStore;

async function appWithBuild(status: BuildStatus, patch: Partial<App> = {}): Promise<{ app: App; build: Build }> {
  const clientId = newId();
  const app = { ...newApp(clientId, "https://academy.test", NOW), ...patch };
  await store.createApp(app);
  const build = await store.createBuild({
    id: newId(),
    clientId,
    appId: app.id,
    versionName: "1.0.0",
    status,
    stages: { queued: "done", android: "pending", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" },
    config: {} as Build["config"],
    storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
    autoPublish: false,
    artifacts: [],
    message: null,
    logUrl: null,
    createdAt: NOW,
    startedAt: null,
    finishedAt: null,
    updatedAt: NOW,
  });
  return { app, build };
}

beforeAll(async () => {
  process.env.BUILD_PIPELINE_TOKEN = TOKEN;
  store = await getStore();
});

afterAll(() => {
  delete process.env.BUILD_PIPELINE_TOKEN;
});

describe("GET /api/v1/builds/{id}/secrets", () => {
  it("needs the pipeline token", async () => {
    const { build } = await appWithBuild("building");
    expect((await secrets(build.id, {})).status).toBe(401);
    expect((await secrets(build.id, { authorization: "Bearer wrong" })).status).toBe(401);
  });

  it("answers 404 for an unknown build", async () => {
    const response = await secrets(newId());
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "build_not_found" });
  });

  it.each(["queued", "ready", "failed"] as const)("refuses a %s build with 409 build_not_building", async (status) => {
    const { build } = await appWithBuild(status);
    const response = await secrets(build.id);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "build_not_building" });
  });

  it("returns null for every key the app doesn't have", async () => {
    const { build } = await appWithBuild("building");
    const response = await secrets(build.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ android_upload_key: null, ios_distribution: null, google_play: null, app_store_connect: null, galaxy_store: null, huawei_appgallery: null, xiaomi_getapps: null });
  });

  it("decrypts the store keys the client uploaded", async () => {
    const appId = newId();
    const key = encryptionKey();
    const { build } = await appWithBuild("building", {
      id: appId,
      googlePlayKeyEncrypted: encrypt(serviceAccount, key, keyContext.googlePlay(appId)),
      googlePlayClientEmail: "publisher@x.iam.gserviceaccount.com",
      ascIssuerId: "69a6de7e-0000-4000-8000-000000000000",
      ascKeyId: "2X9R4HXF34",
      ascPrivateKeyEncrypted: encrypt(p8, key, keyContext.appStore(appId)),
    });
    expect(await (await secrets(build.id)).json()).toEqual({
      android_upload_key: null,
      ios_distribution: null,
      google_play: { service_account_json: serviceAccount },
      app_store_connect: { issuer_id: "69a6de7e-0000-4000-8000-000000000000", key_id: "2X9R4HXF34", private_key: p8 },
      // 35, 36, 42 Only for builds that upload (auto_publish): this one doesn't.
      galaxy_store: null,
      huawei_appgallery: null,
      xiaomi_getapps: null,
    });
  });

  it("35, 36 sends the Galaxy Store and AppGallery keys to builds that upload", async () => {
    const appId = newId();
    const key = encryptionKey();
    const { build } = await appWithBuild("building", {
      id: appId,
      galaxyContentId: "000001234567",
      galaxyServiceAccountId: "sa-123456",
      galaxyKeyEncrypted: encrypt("-----BEGIN PRIVATE KEY-----\nGALAXY\n-----END PRIVATE KEY-----", key, keyContext.galaxyStore(appId)),
      huaweiAppId: "104123456",
      huaweiClientId: "client-777",
      huaweiClientSecretEncrypted: encrypt("connect-secret-0123456789", key, keyContext.appGallery(appId)),
    });
    // A build whose plan includes "We publish for you" (builds keep it from when they were queued).
    await store.updateBuild(build.id, { autoPublish: true } as never, NOW);
    expect(await (await secrets(build.id)).json()).toMatchObject({
      galaxy_store: { content_id: "000001234567", service_account_id: "sa-123456", private_key: "-----BEGIN PRIVATE KEY-----\nGALAXY\n-----END PRIVATE KEY-----" },
      huawei_appgallery: { app_id: "104123456", client_id: "client-777", client_secret: "connect-secret-0123456789" },
    });
  });

  it("42 sends the Xiaomi GetApps keys to builds that upload, with what's new or the default", async () => {
    const appId = newId();
    const key = encryptionKey();
    const keys = {
      id: appId,
      xiaomiUserName: "owner@academy.test",
      xiaomiPasswordEncrypted: encrypt("xiaomi-api-key-0123456789", key, keyContext.xiaomi(appId)),
      xiaomiCertificate: "-----BEGIN CERTIFICATE-----\nXIAOMI\n-----END CERTIFICATE-----",
    };
    const { build } = await appWithBuild("building", keys);
    expect((await (await secrets(build.id)).json()).xiaomi_getapps).toBeNull();
    await store.updateBuild(build.id, { autoPublish: true } as never, NOW);
    expect((await (await secrets(build.id)).json()).xiaomi_getapps).toEqual({
      user_name: "owner@academy.test",
      password: "xiaomi-api-key-0123456789",
      public_certificate: "-----BEGIN CERTIFICATE-----\nXIAOMI\n-----END CERTIFICATE-----",
      release_notes: "Improvements and fixes.",
    });
    await store.updateApp(appId, { xiaomiReleaseNotes: "New courses every week." }, NOW);
    expect((await (await secrets(build.id)).json()).xiaomi_getapps.release_notes).toBe("New courses every week.");
  });

  it("returns no App Store Connect key without its Issuer ID and Key ID", async () => {
    const app = { ...newApp(newId(), null, NOW), ascPrivateKeyEncrypted: encrypt(p8, KEY, "x") };
    expect(buildSecrets(app, KEY).app_store_connect).toBeNull();
  });

  it("won't decrypt a key that was moved from another app", () => {
    const app = { ...newApp(newId(), null, NOW), googlePlayKeyEncrypted: encrypt(serviceAccount, KEY, keyContext.googlePlay("another-app")) };
    expect(() => buildSecrets(app, KEY)).toThrow();
  });
});

describe("PUT /api/v1/builds/{id}/signing", () => {
  let app: App;
  let build: Build;

  beforeEach(async () => {
    ({ app, build } = await appWithBuild("building"));
  });

  it("needs the pipeline token", async () => {
    expect((await signing(build.id, { android_upload_key: androidKey }, {})).status).toBe(401);
    expect((await store.getAppById(app.id))?.androidUploadKeyEncrypted).toBeNull();
  });

  it("answers 404 for an unknown build", async () => {
    expect((await signing(newId(), { android_upload_key: androidKey })).status).toBe(404);
  });

  it.each([
    ["an empty object", {}],
    ["not JSON", "{"],
    ["an unknown key", { android_upload_key: androidKey, extra: 1 }],
    ["an unknown field", { android_upload_key: { ...androidKey, extra: "x" } }],
    ["a short store password", { android_upload_key: { ...androidKey, store_password: "short" } }],
    ["a bad key alias", { android_upload_key: { ...androidKey, key_alias: "upload key" } }],
    ["a missing key password", { android_upload_key: { ...androidKey, key_password: undefined } }],
    ["a long keystore", { android_upload_key: { ...androidKey, keystore_base64: "A".repeat(20_001) } }],
    ["an empty keystore", { android_upload_key: { ...androidKey, keystore_base64: "" } }],
    ["a keystore that isn't base64", { android_upload_key: { ...androidKey, keystore_base64: "not base64!" } }],
    ["an empty certificate", { ios_distribution: { ...iosKey, p12_base64: "" } }],
    ["a short p12 password", { ios_distribution: { ...iosKey, password: "short" } }],
    ["a long certificate ID", { ios_distribution: { ...iosKey, certificate_id: "x".repeat(65) } }],
  ])("refuses %s with 400 invalid_request", async (_, body) => {
    const response = await signing(build.id, body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "invalid_request" });
  });

  it("matches the contract's SigningKeys schema", () => {
    expect(signingKeysSchema.safeParse({ android_upload_key: androidKey }).success).toBe(true);
    expect(signingKeysSchema.safeParse({ ios_distribution: { p12_base64: "AAAA", password: "p".repeat(16) } }).success).toBe(true);
    expect(signingKeysSchema.safeParse({ android_upload_key: { ...androidKey, key_alias: "a".repeat(65) } }).success).toBe(false);
    expect(signingKeysSchema.safeParse({ android_upload_key: { ...androidKey, key_password: "p".repeat(129) } }).success).toBe(false);
  });

  it.each(["queued", "ready", "failed"] as const)("refuses a %s build with 409 build_not_building", async (status) => {
    const other = await appWithBuild(status);
    const response = await signing(other.build.id, { android_upload_key: androidKey });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "build_not_building" });
    expect((await store.getAppById(other.app.id))?.androidUploadKeyEncrypted).toBeNull();
  });

  it("saves the keys encrypted and hands them back to the next build", async () => {
    const response = await signing(build.id, { android_upload_key: androidKey, ios_distribution: iosKey });
    expect(response.status).toBe(204);
    const saved = (await store.getAppById(app.id))!;
    expect(saved.androidUploadKeyEncrypted).toMatch(/^v1\./);
    expect(saved.iosDistributionEncrypted).toMatch(/^v1\./);
    expect(saved.androidUploadKeyEncrypted).not.toContain(androidKey.store_password);
    expect(saved.androidUploadKeyEncrypted).not.toContain(androidKey.keystore_base64);

    await store.updateBuild(build.id, { status: "ready" }, NOW);
    const next = await store.createBuild({ ...(await store.getBuild(build.id))!, id: newId(), status: "building" });
    expect(await (await secrets(next.id)).json()).toMatchObject({ android_upload_key: androidKey, ios_distribution: iosKey });
  });

  it("never overwrites a saved key", async () => {
    expect((await signing(build.id, { android_upload_key: androidKey })).status).toBe(204);
    const before = (await store.getAppById(app.id))!.androidUploadKeyEncrypted;

    const replacement = { ...androidKey, key_alias: "other", store_password: "another-password-0123456789" };
    const response = await signing(build.id, { android_upload_key: replacement });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "key_exists" });
    expect((await store.getAppById(app.id))!.androidUploadKeyEncrypted).toBe(before);
    expect((await (await secrets(build.id)).json()).android_upload_key).toEqual(androidKey);
  });

  it("saves nothing when one of the keys in the request already exists", async () => {
    expect((await signing(build.id, { android_upload_key: androidKey })).status).toBe(204);
    const response = await signing(build.id, { android_upload_key: androidKey, ios_distribution: iosKey });
    expect(response.status).toBe(409);
    expect((await response.json()).message).toContain("Android upload key");
    expect((await store.getAppById(app.id))!.iosDistributionEncrypted).toBeNull();
    // A key of the other kind can still be added on its own.
    expect((await signing(build.id, { ios_distribution: iosKey })).status).toBe(204);
  });

  it("lets only one of two simultaneous requests save", async () => {
    const replacement = { ...androidKey, key_alias: "other" };
    const statuses = (
      await Promise.all([signing(build.id, { android_upload_key: androidKey }), signing(build.id, { android_upload_key: replacement })])
    ).map((response) => response.status);
    expect(statuses.sort()).toEqual([204, 409]);
  });
});

describe("store: saveSigningKeys", () => {
  it("writes only when every requested column is empty", async () => {
    const memory = new MemoryStore();
    const app = newApp(newId(), null, NOW);
    await memory.createApp(app);
    expect(await memory.saveSigningKeys(app.id, {}, NOW)).toBe(false);
    expect(await memory.saveSigningKeys(app.id, { androidUploadKeyEncrypted: "first" }, NOW)).toBe(true);
    expect(await memory.saveSigningKeys(app.id, { androidUploadKeyEncrypted: "second" }, NOW)).toBe(false);
    expect(await memory.saveSigningKeys(app.id, { androidUploadKeyEncrypted: "second", iosDistributionEncrypted: "ios" }, NOW)).toBe(false);
    expect(await memory.getAppById(app.id)).toMatchObject({ androidUploadKeyEncrypted: "first", iosDistributionEncrypted: null });
    expect(await memory.saveSigningKeys("missing", { iosDistributionEncrypted: "ios" }, NOW)).toBe(false);
  });
});
