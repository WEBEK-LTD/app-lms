import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { blocking, preflightChecks, PREFLIGHT_TEXT, renderCheck } from "@/lib/builds/preflight";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import type { App } from "@/lib/data/types";
import { KEY, NOW } from "./helpers";

function png(width: number, height: number, colorType = 2): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header.writeUInt8(8, 24);
  header.writeUInt8(colorType, 25);
  const idat = Buffer.alloc(12);
  idat.write("IDAT", 4, "ascii");
  return Buffer.concat([header, idat]);
}

const googleServices = (packageName: string) =>
  JSON.stringify({
    project_info: { project_number: "123456789012", project_id: "ada", storage_bucket: "ada.appspot.com" },
    client: [{ client_info: { mobilesdk_app_id: "1:1:android:a", android_client_info: { package_name: packageName } }, api_key: [{ current_key: "AIzaSyTest" }] }],
  });
const plist = (bundleId: string) =>
  `<plist version="1.0"><dict><key>API_KEY</key><string>k</string><key>GCM_SENDER_ID</key><string>1</string><key>BUNDLE_ID</key><string>${bundleId}</string><key>PROJECT_ID</key><string>ada</string><key>GOOGLE_APP_ID</key><string>1:1:ios:a</string></dict></plist>`;

const p8 = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const rsa = generateKeyPairSync("rsa", { modulusLength: 1024 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();

function app(patch: Partial<App> = {}): App {
  return { ...newApp("client-1", null, NOW, "store"), androidPackage: "com.rose.shop", iosBundleId: "com.rose.shop", iconAssetId: "icon", ...patch };
}

describe("87.1 the checks before a build", () => {
  const files: Record<string, Buffer> = {
    icon: png(1024, 1024),
    small: png(512, 512),
    alpha: png(1024, 1024, 6),
    android: Buffer.from(googleServices("com.rose.shop")),
    otherAndroid: Buffer.from(googleServices("com.old.shop")),
    ios: Buffer.from(plist("com.rose.shop")),
    otherIos: Buffer.from(plist("com.old.shop")),
  };
  const deps = { key: KEY, readAsset: async (id: string) => files[id] ?? null };
  const keys = (checks: { key: string }[]) => checks.map((c) => c.key);

  it("passes an app whose icon, Firebase files and keys are right", async () => {
    const ready = app({
      firebaseAndroidAssetId: "android",
      firebaseIosAssetId: "ios",
      ascKeyId: "2X9R4HXF34",
      ascIssuerId: "57246542-96fe-1a63-e053-0824d011072a",
      ascPrivateKeyEncrypted: encrypt(p8, KEY, keyContext.appStore("x")),
    });
    // Encrypted for this app's own context.
    ready.ascPrivateKeyEncrypted = encrypt(p8, KEY, keyContext.appStore(ready.id));
    expect(await preflightChecks(deps, ready, { ios: true, autoPublish: true })).toEqual([]);
  });

  it("stops on an icon the stores refuse, and Firebase files for another package or bundle ID", async () => {
    for (const icon of [null, "gone", "small", "alpha"]) {
      const checks = await preflightChecks(deps, app({ iconAssetId: icon }), { ios: false, autoPublish: false });
      expect(blocking(checks).map((c) => c.key)).toEqual(["icon"]);
    }
    // The package name changed after the file was uploaded.
    const changed = await preflightChecks(deps, app({ firebaseAndroidAssetId: "otherAndroid", firebaseIosAssetId: "otherIos" }), { ios: true, autoPublish: false });
    expect(keys(blocking(changed))).toEqual(["firebase_android", "firebase_ios"]);
    expect(renderCheck(changed[0]!)).toBe(
      "Your Firebase file for Android doesn't match the app: This file has no Android app for com.rose.shop. Add an Android app with this package name in Firebase and download the file again. Upload the right google-services.json on the Publishing step.",
    );
    expect(changed[0]!.link).toBe("/dashboard/setup?step=publishing");
    // Without the iPhone app on the plan, its file isn't looked at.
    expect(keys(await preflightChecks(deps, app({ firebaseAndroidAssetId: "android", firebaseIosAssetId: "otherIos" }), { ios: false, autoPublish: false }))).toEqual([]);
  });

  it("warns without Firebase or an App Store Connect key, and stops on a key that can't be used", async () => {
    const bare = await preflightChecks(deps, app(), { ios: true, autoPublish: true });
    expect(bare.map((c) => [c.key, c.level])).toEqual([
      ["firebase", "warning"],
      ["apple_key", "warning"],
    ]);
    expect(blocking(bare)).toEqual([]);
    const withKey = (patch: Partial<App>) => {
      const a = app({ firebaseAndroidAssetId: "android", ascKeyId: "2X9R4HXF34", ascIssuerId: "57246542-96fe-1a63-e053-0824d011072a", ...patch });
      a.ascPrivateKeyEncrypted ??= encrypt(p8, KEY, keyContext.appStore(a.id));
      return a;
    };
    const wrongId = await preflightChecks(deps, withKey({ ascKeyId: "abc" }), { ios: true, autoPublish: true });
    expect(renderCheck(wrongId[0]!)).toBe("Your App Store Connect key can't be used: the key ID is 10 letters and numbers, like 2X9R4HXF34. Add it again on the Publishing step.");
    const a = withKey({});
    a.ascPrivateKeyEncrypted = encrypt(rsa, KEY, keyContext.appStore(a.id));
    expect(keys(blocking(await preflightChecks(deps, a, { ios: true, autoPublish: true })))).toEqual(["apple_key"]);
    // Signing keys that can't be read.
    const b = withKey({});
    b.iosDistributionEncrypted = encrypt(JSON.stringify({ p12_base64: "bm90LWEtcDEy", password: "a".repeat(16) }), KEY, keyContext.iosDistribution(b.id));
    b.androidUploadKeyEncrypted = encrypt("{}", KEY, keyContext.androidUploadKey(b.id));
    expect(keys(blocking(await preflightChecks(deps, b, { ios: true, autoPublish: true })))).toEqual(["ios_certificate", "android_key"]);
    expect(PREFLIGHT_TEXT.iosCertificateInvalid).toContain(".p12");
  });
});

describe("87.1 the checks' words", () => {
  it("are all in Arabic and Turkish", async () => {
    const { knownTranslator } = await import("@/i18n/dashboard");
    for (const lang of ["ar", "tr"] as const) {
      const known = knownTranslator(lang);
      for (const text of Object.values(PREFLIGHT_TEXT)) expect(known(text), `${lang}: ${text}`).not.toBe(text);
      // With the values filled in, the nested problem translated too.
      const filled = renderCheck({ message: PREFLIGHT_TEXT.appleKeyInvalid, values: { problem: "it isn't the .p8 file App Store Connect gives." } });
      expect(known(filled)).not.toContain("it isn't the .p8");
    }
  });
});
