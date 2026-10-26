import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { assetIdOf, restoreFromBuild, settingsFromBuild, versionsInUse } from "@/lib/builds/go-back";
import { MemoryStore } from "@/lib/data/memory";
import { publishLayout } from "@/lib/pages/layout";
import type { Build } from "@/lib/data/types";
import { NOW, days } from "./helpers";

const ICON = "11111111-1111-4111-8111-111111111111";
const GONE = "22222222-2222-4222-8222-222222222222";

function earlier(appId: string, overrides: Partial<Build["config"]["branding"]> = {}): Build {
  return {
    id: "b1",
    clientId: "c1",
    appId,
    number: 4,
    versionName: "1.3.0",
    versionCode: 4,
    status: "ready",
    autoPublish: true,
    stages: {} as Build["stages"],
    artifacts: [],
    message: null,
    logUrl: null,
    sourceCommit: "a".repeat(40),
    config: {
      app_name: "Ada Academy",
      short_name: "Ada",
      branding: { primary_color: "#0E0D24", splash_color: "#F4EFE6", template: "classic", font: "dmsans", icon_url: `https://yallapp.test/api/v1/assets/${ICON}`, ...overrides },
    } as unknown as Build["config"],
    storeListing: { storeTitle: "Ada Academy", shortDescription: "Learn with Ada", fullDescription: "Every course.", supportEmail: "help@ada.test", privacyUrl: "https://ada.test/privacy" },
    createdAt: days(-3),
    startedAt: days(-3),
    finishedAt: days(-3),
    updatedAt: days(-3),
  } as Build;
}

describe("89.3 going back to an earlier build", () => {
  it("reads the build's look, names and listing back", () => {
    expect(assetIdOf(`https://yallapp.test/api/v1/assets/${ICON}`)).toBe(ICON);
    expect(assetIdOf("https://elsewhere.test/icon.png")).toBeNull();
    const patch = settingsFromBuild(earlier("a1"));
    expect(patch).toMatchObject({ appName: "Ada Academy", shortName: "Ada", primaryColor: "#0E0D24", template: "classic", font: "dmsans", iconAssetId: ICON, logoAssetId: null, storeTitle: "Ada Academy", privacyUrl: "https://ada.test/privacy" });
  });

  it("puts the settings back, keeps today's upload when the old one is gone, and the pages published then as the draft", async () => {
    const store = new MemoryStore();
    const app = { ...newApp("c1", null, NOW), appName: "Ada 2", primaryColor: "#FF5A1F" };
    await store.createApp(app);
    await store.createAsset({ id: ICON, clientId: "c1", kind: "icon", blobKey: "k", contentType: "image/png", size: 1, createdAt: NOW });
    const result = await restoreFromBuild(store, app, earlier(app.id), NOW);
    expect(result).toEqual({ pagesFrom: null, missing: [] });
    expect(await store.getAppById(app.id)).toMatchObject({ appName: "Ada Academy", primaryColor: "#0E0D24", iconAssetId: ICON });

    const gone = await restoreFromBuild(store, { ...app, iconAssetId: ICON }, earlier(app.id, { icon_url: `https://yallapp.test/api/v1/assets/${GONE}` }), NOW);
    expect(gone.missing).toEqual(["icon"]);
    expect((await store.getAppById(app.id))!.iconAssetId).toBe(ICON);
  });

  it("brings back, as the draft, the pages published before the build", async () => {
    const store = new MemoryStore();
    const app = newApp("c1", null, NOW);
    await store.createApp(app);
    // Published three times: before the build, and twice after it.
    await publishLayout(store, app, undefined, "ada@ada.test", days(-5));
    await publishLayout(store, app, undefined, "ada@ada.test", days(-1));
    await publishLayout(store, app, undefined, "ada@ada.test", NOW);
    const result = await restoreFromBuild(store, app, earlier(app.id), NOW);
    expect(result.pagesFrom).toBe(1);
  });

  it("lists the versions people use, newest first, and those below the minimum", async () => {
    const rows = [
      { day: "2026-10-20", key: "1.2.0", value: 40 },
      { day: "2026-10-25", key: "1.2.0", value: 30 },
      { day: "2026-10-25", key: "1.3.0", value: 60 },
      { day: "2026-10-26", key: "1.10.0", value: 10 },
    ];
    const store = { listAnalyticsDaily: async (_app: string, from: string, to: string) => rows.filter((r) => r.day >= from && r.day <= to).map((r) => ({ ...r, appId: "a1", metric: "version" as const, label: null })) };
    const inUse = await versionsInUse(store as never, { id: "a1", minVersion: "1.3.0" }, "2026-10-26");
    expect(inUse.map((v) => [v.version, v.phones, v.belowMinimum])).toEqual([
      ["1.10.0", 10, false],
      ["1.3.0", 60, false],
      ["1.2.0", 40, true],
    ]);
    expect(inUse.reduce((sum, v) => sum + v.share, 0)).toBeCloseTo(1);
  });
});
