import { describe, expect, it } from "vitest";
import { GET as getStoreListing } from "@/app/api/v1/builds/[id]/store/route";
import { captionLines, listingLanguages, parseListingExtras, translationField } from "@/lib/app/listing-languages";
import { newApp, readableOn, storeListingOf } from "@/lib/app/setup";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Build } from "@/lib/data/types";
import { checkScreenshot } from "@/lib/store-files";
import { NOW } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
const languages = { main: "en", others: ["ar", "tr"] };
const form = (values: Record<string, string>) => (name: string) => values[name] ?? "";

const arabic = {
  [translationField("ar", "storeTitle")]: "أكاديمية آدا",
  [translationField("ar", "shortDescription")]: "تعلّم مع آدا على هاتفك في أي وقت.",
  [translationField("ar", "fullDescription")]: "كل دورات أكاديمية آدا على هاتفك، مع دروس تشاهدها في أي مكان وفي أي وقت تريده.",
};

function png(width: number, height: number): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header);
  header.writeUInt32BE(13, 8);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header.writeUInt8(8, 24);
  header.writeUInt8(2, 25);
  const idat = Buffer.alloc(12);
  idat.write("IDAT", 4, "ascii");
  return Buffer.concat([header, idat]);
}

describe("88.2 the listing in the app's languages", () => {
  it("keeps a complete translation, leaves out an empty one and refuses a half-written one", () => {
    const saved = parseListingExtras(form({ listingLanguage: "en", ...arabic }), languages);
    expect(saved).toEqual({
      ok: true,
      extras: {
        listingLanguage: "en",
        listingTranslations: [{ language: "ar", storeTitle: "أكاديمية آدا", shortDescription: arabic.tr_ar_shortDescription, fullDescription: arabic.tr_ar_fullDescription, captions: [] }],
        screenshotFrame: null,
      },
    });
    const half = parseListingExtras(form({ [translationField("tr", "storeTitle")]: "Ada Akademi" }), languages);
    expect(half).toEqual({ ok: false, errors: { tr_tr_shortDescription: "Write a short description.", tr_tr_fullDescription: "Write at least 50 characters." } });
    const long = parseListingExtras(form({ ...arabic, [translationField("ar", "storeTitle")]: "أ".repeat(31) }), languages);
    expect(long).toMatchObject({ ok: false, errors: { tr_ar_storeTitle: "Use at most 30 characters." } });
  });

  it("writes the main texts in another of the app's languages, never one it hasn't", () => {
    const turkish = parseListingExtras(form({ listingLanguage: "tr", [translationField("en", "storeTitle")]: "" }), languages);
    expect(turkish).toMatchObject({ ok: true, extras: { listingLanguage: "tr", listingTranslations: [] } });
    expect(parseListingExtras(form({ listingLanguage: "fr" }), languages)).toMatchObject({ ok: true, extras: { listingLanguage: "en" } });
  });

  it("frames the screenshots with captions, one per line, within the limits", () => {
    const framed = parseListingExtras(form({ frameScreenshots: "on", captions: "Your courses in your pocket\n\n  Learn offline  \n", ...arabic, [translationField("ar", "captions")]: "دوراتك في جيبك" }), languages);
    expect(framed).toMatchObject({
      ok: true,
      extras: { screenshotFrame: { captions: ["Your courses in your pocket", "Learn offline"] }, listingTranslations: [{ language: "ar", captions: ["دوراتك في جيبك"] }] },
    });
    expect(parseListingExtras(form({ frameScreenshots: "on", captions: "x".repeat(61) }), languages)).toMatchObject({ ok: false, errors: { captions: "Keep each caption to 60 characters." } });
    expect(parseListingExtras(form({ captions: Array.from({ length: 11 }, (_, i) => `Line ${i}`).join("\n") }), languages)).toMatchObject({
      ok: false,
      errors: { captions: "Write at most 10 captions, one for each screenshot." },
    });
    expect(captionLines("a\r\nb\n\n")).toEqual(["a", "b"]);
  });

  it("takes the languages from the app's published pages, else its draft, the listing's own first", async () => {
    const store = new MemoryStore();
    const app = newApp("c1", null, NOW);
    expect(await listingLanguages(store, app)).toEqual({ main: "en", others: [] });
    const layout = { languages: { default: "ar", available: ["ar", "en", "tr"] } };
    const read = { getAppLayout: async () => ({ draft: layout, published: null }) } as never;
    expect(await listingLanguages(read, app)).toEqual({ main: "ar", others: ["en", "tr"] });
    expect(await listingLanguages(read, { ...app, listingLanguage: "tr" })).toEqual({ main: "tr", others: ["ar", "en"] });
  });

  it("sends the languages, tablet and iPad screenshots and the frame to the pipeline; an app without them reads as before", async () => {
    const app: App = {
      ...newApp("c1", null, NOW),
      storeTitle: "Ada Academy",
      shortDescription: "Learn with Ada",
      fullDescription: "Every course on your phone.",
      supportEmail: "help@academy.test",
      privacyUrl: "https://academy.test/privacy",
      primaryColor: "#F5C04A",
    };
    const plain = storeListingOf(app, assetUrl)!;
    expect(Object.keys(plain).sort()).toEqual(["fullDescription", "iphoneScreenshots", "phoneScreenshots", "privacyUrl", "shortDescription", "storeTitle", "supportEmail"]);
    const full = storeListingOf(
      {
        ...app,
        listingLanguage: "ar",
        listingTranslations: [{ language: "en", storeTitle: "Ada", shortDescription: "Short text here", fullDescription: "F".repeat(60), captions: ["One"] }],
        tabletScreenshotIds: ["t1"],
        ipadScreenshotIds: ["i1"],
        screenshotFrame: { captions: ["أولى"] },
      },
      assetUrl,
    )!;
    expect(full).toMatchObject({
      language: "ar",
      tabletScreenshots: ["https://yallapp.test/api/v1/assets/t1"],
      ipadScreenshots: ["https://yallapp.test/api/v1/assets/i1"],
      frame: { background: "#F5C04A", textColor: "#14121F", captions: ["أولى"] },
    });
    expect(readableOn("#0E0D24")).toBe("#FFFFFF");

    const token = "pipeline-token-for-unit-tests-0123456789";
    process.env.BUILD_PIPELINE_TOKEN = token;
    const store = await getStore();
    const made = await store.createBuild({
      id: newId(),
      clientId: newId(),
      appId: app.id,
      versionName: "1.0.0",
      status: "building",
      stages: { queued: "done", android: "running", ios: "pending", upload_play: "skipped", upload_testflight: "skipped" },
      config: {} as Build["config"],
      storeListing: full,
      autoPublish: true,
      artifacts: [],
      message: null,
      logUrl: null,
      createdAt: NOW,
      startedAt: NOW,
      finishedAt: null,
      updatedAt: NOW,
    } as never);
    const response = await getStoreListing(new Request(`https://yallapp.test/api/v1/builds/${made.id}/store`, { headers: { authorization: `Bearer ${token}` } }), {
      params: Promise.resolve({ id: made.id }),
    } as never);
    expect(await response.json()).toMatchObject({
      language: "ar",
      translations: [{ language: "en", store_title: "Ada", short_description: "Short text here", captions: ["One"] }],
      tablet_screenshots: ["https://yallapp.test/api/v1/assets/t1"],
      ipad_screenshots: ["https://yallapp.test/api/v1/assets/i1"],
      frame: { background: "#F5C04A", text_color: "#14121F", captions: ["أولى"] },
    });
  });

  it("checks tablet and iPad screenshots against what the stores take", () => {
    expect(checkScreenshot(png(1600, 2560), "tablet")).toMatchObject({ ok: true });
    expect(checkScreenshot(png(800, 1280), "tablet")).toEqual({ ok: false, error: "Google Play needs tablet screenshots at least 1080 pixels on the short side. This one is 800 × 1280." });
    expect(checkScreenshot(png(2064, 2752), "ipad")).toMatchObject({ ok: true });
    expect(checkScreenshot(png(2752, 2064), "ipad")).toMatchObject({ ok: true });
    expect(checkScreenshot(png(1320, 2868), "ipad")).toMatchObject({ ok: false, error: expect.stringMatching(/^iPad screenshots must be 2064 × 2752/) });
  });
});
