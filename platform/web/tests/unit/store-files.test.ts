import { beforeAll, describe, expect, it } from "vitest";
import { GET as getStoreListing } from "@/app/api/v1/builds/[id]/store/route";
import { buildConfigFor, newApp, storeListingOf } from "@/lib/app/setup";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { Build } from "@/lib/data/types";
import { checkGoogleServiceInfoPlist, checkGoogleServicesJson, checkScreenshot, readJpegInfo } from "@/lib/store-files";
import { NOW } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;

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

/** A JPEG with an APP0 segment, then a start-of-frame marker (baseline or progressive). */
function jpeg(width: number, height: number, sof = 0xc0): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const frame = Buffer.alloc(19);
  frame.writeUInt8(0xff, 0);
  frame.writeUInt8(sof, 1);
  frame.writeUInt16BE(17, 2);
  frame.writeUInt8(8, 4);
  frame.writeUInt16BE(height, 5);
  frame.writeUInt16BE(width, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, frame, Buffer.from([0xff, 0xd9])]);
}

const googleServices = (packageName: string) =>
  JSON.stringify({
    project_info: { project_number: "123456789012", project_id: "ada-academy", storage_bucket: "ada-academy.appspot.com" },
    client: [
      {
        client_info: { mobilesdk_app_id: "1:123456789012:android:abc", android_client_info: { package_name: packageName } },
        api_key: [{ current_key: "AIzaSyTest" }],
      },
    ],
  });

const plist = (bundleId: string) => `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>API_KEY</key><string>AIzaSyTest</string>
  <key>GCM_SENDER_ID</key><string>123456789012</string>
  <key>BUNDLE_ID</key><string>${bundleId}</string>
  <key>PROJECT_ID</key><string>ada-academy</string>
  <key>GOOGLE_APP_ID</key><string>1:123456789012:ios:abc</string>
</dict></plist>`;

describe("store screenshots", () => {
  it("reads baseline and progressive JPEG sizes", () => {
    expect(readJpegInfo(jpeg(1080, 1920))).toEqual({ width: 1080, height: 1920 });
    expect(readJpegInfo(jpeg(1290, 2796, 0xc2))).toEqual({ width: 1290, height: 2796 });
    expect(readJpegInfo(png(10, 10))).toBeNull();
  });

  it("accepts what Google Play accepts", () => {
    expect(checkScreenshot(png(1080, 1920), "phone")).toEqual({ ok: true, contentType: "image/png" });
    expect(checkScreenshot(jpeg(1920, 1080), "phone")).toEqual({ ok: true, contentType: "image/jpeg" });
    expect(checkScreenshot(png(300, 600), "phone")).toMatchObject({ ok: false, error: expect.stringContaining("320 and 3840") });
    expect(checkScreenshot(png(1000, 2100), "phone")).toMatchObject({ ok: false, error: expect.stringContaining("twice") });
    expect(checkScreenshot(png(1080, 1920, 6), "phone")).toMatchObject({ ok: false, error: expect.stringContaining("transparency") });
    expect(checkScreenshot(Buffer.from("GIF89a"), "phone")).toMatchObject({ ok: false, error: expect.stringContaining("PNG or JPEG") });
  });

  it("accepts only the iPhone 6.9-inch sizes App Store Connect takes", () => {
    for (const [w, h] of [[1320, 2868], [1290, 2796], [1260, 2736], [2796, 1290]] as const) {
      expect(checkScreenshot(png(w, h), "iphone").ok).toBe(true);
    }
    expect(checkScreenshot(png(1080, 1920), "iphone")).toMatchObject({ ok: false, error: expect.stringContaining("1320 × 2868") });
  });
});

describe("Firebase config files", () => {
  it("needs the Android app with the app's package name", () => {
    expect(checkGoogleServicesJson(googleServices("com.adaacademy.app"), "com.adaacademy.app")).toBeNull();
    expect(checkGoogleServicesJson(googleServices("com.other.app"), "com.adaacademy.app")).toContain("no Android app for com.adaacademy.app");
    expect(checkGoogleServicesJson("{}", "com.adaacademy.app")).toContain("isn't a google-services.json");
    expect(checkGoogleServicesJson("not json", "com.adaacademy.app")).toContain("isn't a google-services.json");
  });

  it("needs the iOS app with the app's bundle ID", () => {
    expect(checkGoogleServiceInfoPlist(plist("com.adaacademy.app"), "com.adaacademy.app")).toBeNull();
    expect(checkGoogleServiceInfoPlist(plist("com.other.app"), "com.adaacademy.app")).toContain("for com.other.app, not com.adaacademy.app");
    expect(checkGoogleServiceInfoPlist(plist("x").replace(/<key>API_KEY<\/key><string>[^<]*<\/string>/, ""), "x")).toContain("no API_KEY");
    expect(checkGoogleServiceInfoPlist("{}", "x")).toContain("isn't a GoogleService-Info.plist");
  });
});

describe("build snapshot", () => {
  it("adds the Firebase file URLs to the config and the screenshots to the listing", () => {
    const app = {
      ...newApp("c1", "https://academy.test", NOW),
      storeTitle: "Ada",
      shortDescription: "Short",
      fullDescription: "Full",
      supportEmail: "help@academy.test",
      privacyUrl: "https://academy.test/privacy",
      phoneScreenshotIds: ["p1", "p2"],
      iphoneScreenshotIds: ["i1"],
      firebaseAndroidAssetId: "fa",
      firebaseIosAssetId: "fi",
    };
    expect(buildConfigFor(app, { id: "c1" }, { name: "1.0.0", code: 1 }, assetUrl).firebase).toEqual({
      android_config_url: assetUrl("fa"),
      ios_config_url: assetUrl("fi"),
    });
    expect(buildConfigFor({ ...app, firebaseAndroidAssetId: null, firebaseIosAssetId: null }, { id: "c1" }, { name: "1.0.0", code: 1 }, assetUrl)).not.toHaveProperty("firebase");
    expect(storeListingOf(app, assetUrl)).toMatchObject({ phoneScreenshots: [assetUrl("p1"), assetUrl("p2")], iphoneScreenshots: [assetUrl("i1")] });
  });
});

describe("GET /api/v1/builds/{id}/store", () => {
  const TOKEN = "pipeline-token-for-unit-tests-0123456789";
  beforeAll(() => {
    process.env.BUILD_PIPELINE_TOKEN = TOKEN;
  });

  async function build(listing: Build["storeListing"]): Promise<Build> {
    const store = await getStore();
    return store.createBuild({
      id: newId(),
      clientId: newId(),
      appId: newId(),
      versionName: "1.0.0",
      status: "building",
      stages: { queued: "done", android: "running", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" },
      config: {} as Build["config"],
      storeListing: listing,
      autoPublish: false,
      artifacts: [],
      message: null,
      logUrl: null,
      createdAt: NOW,
      startedAt: NOW,
      finishedAt: null,
      updatedAt: NOW,
    });
  }
  const get = (id: string, token = TOKEN) =>
    getStoreListing(new Request(`https://yallapp.test/api/v1/builds/${id}/store`, { headers: { authorization: `Bearer ${token}` } }), {
      params: Promise.resolve({ id }),
    } as never);

  it("returns the listing snapshot, with empty screenshot lists for older builds", async () => {
    const listing = { storeTitle: "Ada", shortDescription: "Short", fullDescription: "Full", supportEmail: "help@academy.test", privacyUrl: "https://academy.test/privacy" };
    const older = await build(listing);
    expect(await (await get(older.id)).json()).toEqual({
      store_title: "Ada",
      short_description: "Short",
      full_description: "Full",
      support_email: "help@academy.test",
      privacy_url: "https://academy.test/privacy",
      phone_screenshots: [],
      iphone_screenshots: [],
    });
    const newer = await build({ ...listing, phoneScreenshots: ["https://x.test/1"], iphoneScreenshots: ["https://x.test/2"] });
    expect(await (await get(newer.id)).json()).toMatchObject({ phone_screenshots: ["https://x.test/1"], iphone_screenshots: ["https://x.test/2"] });
  });

  it("needs the pipeline token and a known build", async () => {
    const b = await build({ storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" });
    expect((await get(b.id, "wrong-token-0123456789-0123456789")).status).toBe(401);
    expect((await get(newId())).status).toBe(404);
  });
});
