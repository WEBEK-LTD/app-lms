import { describe, expect, it } from "vitest";
import {
  AUTO_SHOTS_WAIT_MINUTES,
  DEVICE_SIZES,
  SCREENS,
  SHOT_DEVICES,
  SHOT_LANGUAGES_MAX,
  appIdOfJob,
  captionsWithDefaults,
  freshAutoScreenshots,
  listingScreenshotIds,
  parseShotKey,
  plannedShots,
  scheduleAutoScreenshots,
  shotIds,
  shotKey,
  shotsFingerprint,
} from "@/lib/app/auto-screenshots";
import {
  AUTO_SHOTS_STALL_MINUTES,
  STALLED_SHOTS,
  claimRun,
  finishRun,
  makeAgain,
  queuedRuns,
  runAutoScreenshots,
  saveRunShot,
  switchedAutoScreenshots,
  withRemoved,
  withUpload,
} from "@/lib/app/auto-screenshots-jobs";
import { newApp, storeListingOf } from "@/lib/app/setup";
import { readiness } from "@/lib/publishing/readiness";
import { verifyPreviewToken, previewKey } from "@/lib/preview/token";
import { checkScreenshot, SCREENSHOT_LIMITS } from "@/lib/store-files";
import type { App, AppType, AutoScreenshots, AutoShot } from "@/lib/data/types";
import { solidPng } from "../e2e/png";
import { days, NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.com.tr/api/v1/assets/${id}`;
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const SECRET = "unit-signing-secret-0123456789abcdef0123456789";
const PLATFORM = { url: "https://yallapp.com.tr", signingSecret: SECRET };

const shot = (device: AutoShot["device"], language: string, screen: AutoShot["screen"], assetId: string, source: AutoShot["source"] = "auto"): AutoShot => ({
  device,
  language,
  screen,
  assetId,
  source,
  at: NOW.toISOString(),
});

function readyApp(clientId: string, appType: AppType = "store"): App {
  return {
    ...newApp(clientId, null, NOW, appType),
    // Content kept in Yallapp: the preview shows it.
    backend: "hosted",
    connector: { kind: "catalog" },
    websiteDoneAt: NOW,
    appName: "Harbour Books",
    shortName: "Harbour",
    iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
    brandingDoneAt: NOW,
    androidPackage: "com.harbour.books",
    iosBundleId: "com.harbour.books",
    storeTitle: "Harbour Books",
    shortDescription: "Books from the harbour shop, at your door.",
    fullDescription: "Harbour Books brings the whole shop to your phone: new titles, the classics and the cart.",
    supportEmail: "help@harbour.test",
    privacyUrl: "https://harbour.test/privacy",
    listingDoneAt: NOW,
  };
}

async function setup(appType: AppType = "store") {
  const { store, client } = await setupClient({ plan: "growth", activeUntil: days(60) });
  const app = readyApp(client.id, appType);
  await store.createApp(app);
  return { store, client, app };
}

describe("139 sizes the stores ask for", () => {
  it("each device's picture is its screen at its pixel ratio, and passes the upload checks", () => {
    for (const device of SHOT_DEVICES) {
      const size = DEVICE_SIZES[device];
      expect(size.viewport.width * size.scale).toBe(size.width);
      expect(size.viewport.height * size.scale).toBe(size.height);
      expect(checkScreenshot(solidPng(size.width, size.height, [20, 120, 200]), device)).toEqual({ ok: true, contentType: "image/png" });
    }
    expect([DEVICE_SIZES.iphone.width, DEVICE_SIZES.iphone.height]).toEqual([1320, 2868]);
    expect([DEVICE_SIZES.ipad.width, DEVICE_SIZES.ipad.height]).toEqual([2064, 2752]);
    // Google Play: 9:16 phones; tablets at least 1080 on the short side (sent for 7" and 10").
    expect(DEVICE_SIZES.phone.height / DEVICE_SIZES.phone.width).toBeCloseTo(16 / 9);
    expect(Math.min(DEVICE_SIZES.tablet.width, DEVICE_SIZES.tablet.height)).toBeGreaterThanOrEqual(1080);
    // Android's look on Google Play, iOS's on the App Store.
    expect([DEVICE_SIZES.phone.os, DEVICE_SIZES.tablet.os, DEVICE_SIZES.iphone.os, DEVICE_SIZES.ipad.os]).toEqual(["android", "android", "ios", "ios"]);
  });
});

describe("139 the main screens of each kind", () => {
  it("home first, never the account (the preview draws its sign-in with a note of its own), within each store's count", () => {
    for (const [kind, screens] of Object.entries(SCREENS)) {
      expect(screens[0]!.screen, kind).toBe("home");
      expect(screens.some((s) => s.screen === "account"), kind).toBe(false);
      // Rides and schools show a guest one screen: the owner adds a second of their own (Google Play asks for two).
      if (kind !== "rides" && kind !== "school") expect(screens.length, kind).toBeGreaterThanOrEqual(SCREENSHOT_LIMITS.phone.min);
      expect(screens.length, kind).toBeLessThanOrEqual(SCREENSHOT_LIMITS.phone.max);
      expect(new Set(screens.map((s) => s.screen)).size, kind).toBe(screens.length);
      for (const s of screens) {
        expect(s.route.startsWith("/"), kind).toBe(true);
        // An item opens the first of its list: the route takes its id.
        if (s.screen === "item") expect(s.route.includes("{id}") && Boolean(s.list), kind).toBe(true);
        else expect(s.list, kind).toBeUndefined();
      }
    }
  });

  it("a shop: home, the shop, a product and the cart", () => {
    expect(SCREENS.store.map((s) => [s.screen, s.route])).toEqual([
      ["home", "/"],
      ["list", "/shop"],
      ["item", "/product/{id}"],
      ["cart", "/cart"],
    ]);
    expect(SCREENS.store[2]!.list).toBe("/store/products");
    expect(SCREENS.lms.map((s) => s.screen)).toEqual(["home", "list", "item"]);
  });
});

describe("139 the shots of a run", () => {
  it("every screen, for every device, in each language", () => {
    const planned = plannedShots({ appType: "store" }, ["en", "ar"], null);
    expect(planned).toHaveLength(2 * 4 * 4);
    expect(planned[0]).toEqual({ key: "phone:en:home", device: "phone", language: "en", screen: "home", route: "/" });
    expect(planned.find((p) => p.key === "ipad:ar:item")).toEqual({ key: "ipad:ar:item", device: "ipad", language: "ar", screen: "item", route: "/product/{id}", list: "/store/products" });
  });

  it("leaves out the owner's uploads always, and the removed places unless made again", () => {
    const auto = { shots: [shot("phone", "en", "cart", "a1", "uploaded"), shot("phone", "en", "home", "a2")], removed: ["iphone:en:list"] };
    const keys = (all = false) => plannedShots({ appType: "store" }, ["en"], auto, all).map((p) => p.key);
    expect(keys()).not.toContain("phone:en:cart");
    expect(keys()).toContain("phone:en:home");
    expect(keys()).not.toContain("iphone:en:list");
    expect(keys(true)).toContain("iphone:en:list");
    expect(keys(true)).not.toContain("phone:en:cart");
  });

  it("at most a few languages, each once", () => {
    const many = ["en", "ar", "tr", "fr", "de", "es", "it", "nl", "pt", "ru", "en"];
    const languages = new Set(plannedShots({ appType: "school" }, many, null).map((p) => p.language));
    expect(languages.size).toBe(SHOT_LANGUAGES_MAX);
  });

  it("keys and run ids read back", () => {
    expect(parseShotKey(shotKey({ device: "tablet", language: "tr", screen: "item" }))).toEqual({ device: "tablet", language: "tr", screen: "item" });
    expect(parseShotKey("tv:en:home")).toBeNull();
    expect(parseShotKey("phone:EN:home")).toBeNull();
    expect(appIdOfJob("7f1d2c4e-1111-4222-8333-944455556666.abc123def")).toBe("7f1d2c4e-1111-4222-8333-944455556666");
    expect(appIdOfJob("not-a-run")).toBeNull();
  });
});

describe("139 the listing's screenshots", () => {
  const base = (auto: AutoScreenshots | null) =>
    ({
      ...readyApp("c1"),
      phoneScreenshotIds: ["up-p1", "up-p2"],
      iphoneScreenshotIds: ["up-i1"],
      listingLanguage: "en",
      listingTranslations: [{ language: "ar", storeTitle: "كتب الميناء", shortDescription: "كتب من متجر الميناء إلى بابك.", fullDescription: "ن".repeat(60), captions: [] }],
      autoScreenshots: auto,
    }) as App;
  const auto: AutoScreenshots = {
    ...freshAutoScreenshots(true),
    madeAt: NOW.toISOString(),
    shots: [
      shot("phone", "en", "cart", "p-cart"),
      shot("phone", "en", "home", "p-home"),
      shot("phone", "en", "list", "p-list", "uploaded"),
      shot("iphone", "en", "home", "i-home"),
      shot("phone", "ar", "home", "ar-home"),
      shot("ipad", "ar", "home", "ar-ipad"),
    ],
    removed: ["phone:en:cart"],
  };

  it("on: the set in screen order, without the removed ones; off: the owner's uploads", () => {
    expect(listingScreenshotIds(base(auto))).toEqual({ phone: ["p-home", "p-list"], iphone: ["i-home"], tablet: [], ipad: [] });
    expect(listingScreenshotIds(base({ ...auto, on: false }))).toEqual({ phone: ["up-p1", "up-p2"], iphone: ["up-i1"], tablet: [], ipad: [] });
    expect(listingScreenshotIds(base(null)).phone).toEqual(["up-p1", "up-p2"]);
    expect(shotIds(auto, "phone", "ar")).toEqual(["ar-home"]);
  });

  it("each translation gets the ones made in its language", () => {
    const listing = storeListingOf(base(auto), assetUrl)!;
    expect(listing.phoneScreenshots).toEqual([assetUrl("p-home"), assetUrl("p-list")]);
    expect(listing.translations![0]).toMatchObject({ language: "ar", phoneScreenshots: [assetUrl("ar-home")], ipadScreenshots: [assetUrl("ar-ipad")] });
    expect(listing.translations![0]!.iphoneScreenshots).toBeUndefined();
    // Off: as before, the translations without screenshots of their own.
    const off = storeListingOf(base({ ...auto, on: false }), assetUrl)!;
    expect(off.translations![0]).not.toHaveProperty("phoneScreenshots");
    expect(off.phoneScreenshots).toEqual([assetUrl("up-p1"), assetUrl("up-p2")]);
  });

  it("framed: a place without the owner's caption gets the listing's own title, then short description, in each language", () => {
    const framed = { ...base(auto), screenshotFrame: { captions: ["", "", "Free delivery in the city"] } } as App;
    const listing = storeListingOf(framed, assetUrl)!;
    expect(listing.frame!.captions).toEqual(["Harbour Books", "Books from the harbour shop, at your door.", "Free delivery in the city"]);
    expect(listing.translations![0]!.captions).toEqual(["كتب الميناء", "كتب من متجر الميناء إلى بابك."]);
    // The owner's uploads keep the owner's captions as they are.
    expect(storeListingOf({ ...framed, autoScreenshots: null }, assetUrl)!.frame!.captions).toEqual(["", "", "Free delivery in the city"]);
    expect(captionsWithDefaults(["Mine"], { storeTitle: "T", shortDescription: "S" })).toEqual(["Mine", "S"]);
  });

  it("the publishing check counts the set", () => {
    const items = readiness({ app: base({ ...auto, removed: [] }), listing: null, ios: true, managed: false, platformUrl: "https://yallapp.com.tr" });
    expect(items.find((i) => i.key === "screenshots")).toMatchObject({ state: "ok", values: { play: 3, apple: 1 } });
  });

  it("a new app (and a copy) makes its own", () => {
    expect(newApp("c1", null, NOW).autoScreenshots).toEqual(freshAutoScreenshots(true));
  });
});

describe("139 the owner's changes to the set", () => {
  it("an upload takes a place for good; a removed place is left out", () => {
    const auto = { ...freshAutoScreenshots(true), shots: [shot("phone", "en", "home", "a1")] };
    const uploaded = withUpload(auto, "phone:en:home", "mine", NOW)!;
    expect(uploaded.shots).toEqual([{ ...shot("phone", "en", "home", "mine", "uploaded") }]);
    const removed = withRemoved(uploaded, "phone:en:home")!;
    expect(removed.shots).toEqual([]);
    expect(removed.removed).toEqual(["phone:en:home"]);
    // Uploading again in a removed place brings it back.
    expect(withUpload(removed, "phone:en:home", "mine2", NOW)!.removed).toEqual([]);
    expect(withRemoved(auto, "phone:en:nowhere")).toBeNull();
  });

  it("switched on: made at once the first time, after the wait when a set exists; off: nothing waits", () => {
    const off = { autoScreenshots: freshAutoScreenshots(false) };
    expect(switchedAutoScreenshots(off, true, NOW)).toMatchObject({ on: true, dueAt: NOW.toISOString() });
    const made = { autoScreenshots: { ...freshAutoScreenshots(true), shots: [shot("phone", "en", "home", "a1")] } };
    expect(switchedAutoScreenshots(made, true, NOW).dueAt).toBe(minutes(AUTO_SHOTS_WAIT_MINUTES).toISOString());
    expect(switchedAutoScreenshots(made, false, NOW)).toMatchObject({ on: false, dueAt: null, shots: made.autoScreenshots.shots });
  });

  it("the fingerprint follows what shows: the look, the pages, the languages", () => {
    const app = readyApp("c1");
    const of = (patch: Partial<App> = {}, languages = ["en"], layout: unknown = { pages: [] }) => shotsFingerprint({ app: { ...app, ...patch }, languages, layout });
    expect(of()).toBe(of());
    expect(of({ primaryColor: "#123456" })).not.toBe(of());
    expect(of({}, ["en", "ar"])).not.toBe(of());
    expect(of({}, ["en"], { pages: [{ slug: "home" }] })).not.toBe(of());
    // What doesn't show on the screens doesn't count.
    expect(of({ supportEmail: "other@harbour.test" })).toBe(of());
  });
});

describe("139 runs", () => {
  it("a new, ready app's first set is queued and the workflow started once; then claimed, shot, finished", async () => {
    const { store, app } = await setup();
    const started: Date[] = [];
    expect(await runAutoScreenshots({ store, now: NOW, start: async () => void started.push(NOW) })).toEqual({ queued: 1, same: 0, stalled: 0 });
    expect(started).toHaveLength(1);
    const [run] = await queuedRuns(store, 10);
    expect(run!.app_id).toBe(app.id);
    expect(appIdOfJob(run!.id)).toBe(app.id);

    // Claimed: the preview's signed, read-only link for this app, guest mode, the sizes and the shots.
    const claimed = await claimRun(store, run!.id, minutes(1), PLATFORM);
    if (!claimed.ok) throw new Error(claimed.reason);
    const { plan } = claimed;
    expect(plan.preview_url).toMatch(/^https:\/\/yallapp\.com\.tr\/preview-app\/index\.html\?token=.+&theme=light$/);
    const token = new URL(plan.preview_url).searchParams.get("token");
    const grant = verifyPreviewToken(token, previewKey(SECRET), minutes(2), app.id);
    expect(grant.ok).toBe(true);
    expect(plan.storage).toEqual({ [`yallapp.preview.${app.id}.settings.guest_mode`]: "true" });
    expect(plan.devices.iphone).toEqual({ width: 1320, height: 2868, viewport_width: 440, viewport_height: 956, scale: 3, os: "ios" });
    expect(plan.shots).toHaveLength(4 * 4);
    expect(await queuedRuns(store, 10)).toEqual([]);
    // A second claim of the same run gets it again (a retried request); another id doesn't.
    expect((await claimRun(store, `${app.id}.nope000`, minutes(1), PLATFORM)).ok).toBe(false);

    const saved: string[] = [];
    const saver = async (_client: string, kind: string) => {
      saved.push(kind);
      return `asset-${saved.length}`;
    };
    const png = (device: keyof typeof DEVICE_SIZES) => solidPng(DEVICE_SIZES[device].width, DEVICE_SIZES[device].height, [10, 10, 10]);
    expect(await saveRunShot(store, run!.id, "phone:en:home", png("phone"), minutes(2), saver)).toEqual({ ok: true, assetId: "asset-1" });
    expect(await saveRunShot(store, run!.id, "iphone:en:home", png("iphone"), minutes(2), saver)).toEqual({ ok: true, assetId: "asset-2" });
    // The wrong size for the device, or a place that isn't one, is refused.
    expect(await saveRunShot(store, run!.id, "iphone:en:list", png("phone"), minutes(2), saver)).toMatchObject({ ok: false, status: 422, code: "invalid_image" });
    expect(await saveRunShot(store, run!.id, "watch:en:home", png("phone"), minutes(2), saver)).toMatchObject({ ok: false, status: 422, code: "invalid_shot" });
    expect(saved).toEqual(["play_screenshot", "ios_screenshot"]);

    const done = await finishRun(store, run!.id, { status: "done", message: "2 screenshots." }, minutes(3));
    if (!done.ok) throw new Error("not finished");
    expect(done.auto).toMatchObject({ state: "idle", jobId: null, madeAt: minutes(3).toISOString(), message: "2 screenshots." });
    expect(done.auto.fingerprint).toMatch(/^[0-9a-f]{32}$/);
    const after = (await store.getAppById(app.id))!;
    expect(listingScreenshotIds(after)).toMatchObject({ phone: ["asset-1"], iphone: ["asset-2"] });
    // Finished: nothing more to send.
    expect((await saveRunShot(store, run!.id, "phone:en:list", png("phone"), minutes(4), saver)).ok).toBe(false);
  });

  it("the owner's upload is never overwritten by a run, and stays when the set is made again", async () => {
    const { store, app } = await setup();
    await store.updateApp(app.id, { autoScreenshots: withUpload(freshAutoScreenshots(true), "phone:en:home", "mine", NOW)! }, NOW);
    await runAutoScreenshots({ store, now: NOW, start: async () => undefined });
    const [run] = await queuedRuns(store, 1);
    const claimed = await claimRun(store, run!.id, NOW, PLATFORM);
    if (!claimed.ok) throw new Error(claimed.reason);
    expect(claimed.plan.shots.map((s) => s.key)).not.toContain("phone:en:home");
    const png = solidPng(1080, 1920, [1, 2, 3]);
    expect(await saveRunShot(store, run!.id, "phone:en:home", png, NOW, async () => "x")).toMatchObject({ ok: false, status: 409 });
    await saveRunShot(store, run!.id, "phone:en:list", png, minutes(1), async () => "auto-list");
    await finishRun(store, run!.id, { status: "done" }, minutes(2));
    const shots = (await store.getAppById(app.id))!.autoScreenshots!.shots;
    expect(shots.map((s) => [shotKey(s), s.assetId, s.source])).toEqual([
      ["phone:en:home", "mine", "uploaded"],
      ["phone:en:list", "auto-list", "auto"],
    ]);
  });

  it("made again after a change only when what shows changed, a few minutes after the last change", async () => {
    const { store, app } = await setup();
    const run = async (now: Date) => runAutoScreenshots({ store, now, start: async () => undefined });
    // A first set.
    await run(NOW);
    const [first] = await queuedRuns(store, 1);
    await claimRun(store, first!.id, NOW, PLATFORM);
    await saveRunShot(store, first!.id, "phone:en:home", solidPng(1080, 1920, [1, 1, 1]), minutes(1), async () => "old");
    await finishRun(store, first!.id, { status: "done" }, minutes(2));

    // A save that changes nothing shown: due, but the same set.
    await scheduleAutoScreenshots(store, (await store.getAppById(app.id))!, minutes(3));
    expect(await run(minutes(3 + AUTO_SHOTS_WAIT_MINUTES - 1))).toEqual({ queued: 0, same: 0, stalled: 0 });
    expect(await run(minutes(3 + AUTO_SHOTS_WAIT_MINUTES))).toEqual({ queued: 0, same: 1, stalled: 0 });

    // A new colour: made again.
    await store.updateApp(app.id, { primaryColor: "#FF6600" }, minutes(20));
    await scheduleAutoScreenshots(store, (await store.getAppById(app.id))!, minutes(20));
    expect(await run(minutes(20 + AUTO_SHOTS_WAIT_MINUTES))).toEqual({ queued: 1, same: 0, stalled: 0 });

    // Off: nothing is made, whatever changes.
    const { store: other, app: offApp } = await setup();
    await other.updateApp(offApp.id, { autoScreenshots: freshAutoScreenshots(false) }, NOW);
    expect(await runAutoScreenshots({ store: other, now: NOW, start: async () => undefined })).toEqual({ queued: 0, same: 0, stalled: 0 });
  });

  it("not before the preview shows the app's content and the app has a name; a run that stopped is closed and can be made again", async () => {
    const { store, app } = await setup();
    await store.updateApp(app.id, { connector: null }, NOW);
    expect((await runAutoScreenshots({ store, now: NOW, start: async () => undefined })).queued).toBe(0);
    expect(await makeAgain(store, (await store.getAppById(app.id))!, NOW)).toEqual({ ok: false, reason: "not_ready" });
    // A WordPress site whose Yallapp plugin isn't connected: the preview would show how to connect it, never a store screenshot.
    await store.updateApp(app.id, { backend: "wordpress", siteUrl: "https://harbour.test", websiteDoneAt: NOW }, NOW);
    expect(await makeAgain(store, (await store.getAppById(app.id))!, NOW)).toEqual({ ok: false, reason: "not_ready" });

    await store.updateApp(app.id, { backend: "hosted", connector: { kind: "catalog" }, siteUrl: null }, NOW);
    // Only while the app's plan is active, as builds.
    expect(await makeAgain(store, (await store.getAppById(app.id))!, days(61))).toEqual({ ok: false, reason: "inactive" });
    const asked = await makeAgain(store, (await store.getAppById(app.id))!, NOW);
    expect(asked.ok).toBe(true);
    expect(await makeAgain(store, (await store.getAppById(app.id))!, minutes(1))).toEqual({ ok: false, reason: "running" });
    const later = minutes(AUTO_SHOTS_STALL_MINUTES + 1);
    expect(await runAutoScreenshots({ store, now: later, start: async () => undefined })).toEqual({ queued: 0, same: 0, stalled: 1 });
    expect((await store.getAppById(app.id))!.autoScreenshots).toMatchObject({ state: "failed", jobId: null, message: STALLED_SHOTS });
    expect((await makeAgain(store, (await store.getAppById(app.id))!, later)).ok).toBe(true);
  });

  it("Make again brings the removed places back; a failed run keeps the set as it was", async () => {
    const { store, app } = await setup();
    const auto = withRemoved({ ...freshAutoScreenshots(true), madeAt: NOW.toISOString(), shots: [shot("phone", "en", "home", "kept")] }, "phone:en:cart")!;
    await store.updateApp(app.id, { autoScreenshots: auto }, NOW);
    const asked = await makeAgain(store, (await store.getAppById(app.id))!, NOW);
    if (!asked.ok) throw new Error(asked.reason);
    expect(asked.queued.removed).toEqual([]);
    await claimRun(store, asked.queued.jobId!, NOW, PLATFORM);
    const failed = await finishRun(store, asked.queued.jobId!, { status: "failed", message: "The preview didn't open." }, minutes(1));
    if (!failed.ok) throw new Error("not finished");
    expect(failed.auto).toMatchObject({ state: "failed", message: "The preview didn't open.", madeAt: NOW.toISOString() });
    expect(failed.auto.shots.map((s) => s.assetId)).toEqual(["kept"]);
  });
});
