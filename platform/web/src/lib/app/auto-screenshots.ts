import { createHash } from "node:crypto";
import type { DataStore } from "../data/store";
import type { App, AppType, AutoScreenshots, AutoShot, ShotDevice, ShotScreen } from "../data/types";

/**
 * 139 Store screenshots made by Yallapp ("Make them for me"): the app's
 * main screens for its kind, at every size the stores ask for, in each of the
 * listing's languages. The pipeline's Linux job opens the app preview (the
 * app's own web build) with a signed, read-only link at each device's size
 * and takes the screens one by one (build/scripts/store_screenshots.py); they
 * are then the listing's screenshots, framed at build time when the owner
 * asked (store_listing.py), as uploaded ones are. Only real screens of the
 * app: no device frame, no added text but the owner's own captions.
 */

export const SHOT_DEVICES = ["phone", "iphone", "tablet", "ipad"] as const satisfies readonly ShotDevice[];

export interface DeviceSize {
  device: ShotDevice;
  /** The picture's size in pixels, portrait. */
  width: number;
  height: number;
  /** The screen the app is drawn on, in CSS pixels, and the pixel ratio that gives the size above. */
  viewport: { width: number; height: number };
  scale: number;
  /** The platform the app preview draws (its `os` parameter): Android's look on Google Play, iOS's on the App Store. */
  os: "android" | "ios";
}

/**
 * The sizes (store-files.ts checks them on upload too):
 * Google Play phones 1080 × 1920 (9:16, eligible for its larger promotions);
 * Google Play tablets 1600 × 2560 (sent for 7" and 10" tablets, at least 1080 on the short side);
 * iPhone 6.9" 1320 × 2868; iPad 13" 2064 × 2752.
 */
export const DEVICE_SIZES: Record<ShotDevice, DeviceSize> = {
  phone: { device: "phone", width: 1080, height: 1920, viewport: { width: 360, height: 640 }, scale: 3, os: "android" },
  iphone: { device: "iphone", width: 1320, height: 2868, viewport: { width: 440, height: 956 }, scale: 3, os: "ios" },
  tablet: { device: "tablet", width: 1600, height: 2560, viewport: { width: 800, height: 1280 }, scale: 2, os: "android" },
  ipad: { device: "ipad", width: 2064, height: 2752, viewport: { width: 1032, height: 1376 }, scale: 2, os: "ios" },
};

/** One screen to take: where it opens in the app (its route), or for an item, the list whose first item it opens. */
export interface ScreenPlan {
  screen: ShotScreen;
  /** The app's route (mobile/lib/core/routing/paths.dart); for an item, with `{id}` for its id. */
  route: string;
  /** For an item: the API list (docs/api/openapi.yaml, a Page of `items`) whose first item's id goes in the route. */
  list?: string;
}

const HOME: ScreenPlan = { screen: "home", route: "/" };
const list = (route: string): ScreenPlan => ({ screen: "list", route });
const item = (api: string, route: string): ScreenPlan => ({ screen: "item", route, list: api });
const cart = (route: string): ScreenPlan => ({ screen: "cart", route });

/**
 * The main screens of each kind, in the order the stores show them: home, a
 * list, an item, the cart. Only screens a guest sees as in the installed app:
 * not the account, which a guest sees as the sign-in screen, and which the
 * preview draws with its own preview note (not the app's); a booking or an
 * order is the customer's own. ("account" stays a place a set made before may name.)
 */
export const SCREENS: Record<AppType, readonly ScreenPlan[]> = {
  lms: [HOME, list("/courses"), item("/courses", "/course/{id}")],
  store: [HOME, list("/shop"), item("/store/products", "/product/{id}"), cart("/cart")],
  booking: [HOME, list("/services"), item("/bookings/services", "/service/{id}")],
  real_estate: [HOME, item("/listings", "/listing/{id}")],
  news: [HOME, list("/articles"), item("/news/articles", "/article/{id}")],
  events: [HOME, list("/events"), item("/events", "/event/{id}")],
  donations: [HOME, list("/campaigns"), item("/donations/campaigns", "/campaign/{id}")],
  delivery: [HOME, list("/send")],
  food: [HOME, list("/restaurants"), item("/food/restaurants", "/restaurant/{id}"), cart("/food-cart")],
  rides: [{ screen: "home", route: "/ride" }],
  school: [HOME],
  travel: [HOME, list("/stays")],
  community: [HOME, list("/community")],
};

/** At most this many languages are made (each one is every screen at four sizes). */
export const SHOT_LANGUAGES_MAX = 8;

/** A place in the set: one screen, in one language, for one device. */
export const shotKey = (shot: Pick<AutoShot, "device" | "language" | "screen">) => `${shot.device}:${shot.language}:${shot.screen}`;

const SHOT_KEY = /^(phone|iphone|tablet|ipad):([a-z]{2,3}):(home|list|item|cart|account)$/;

export function parseShotKey(key: string): Pick<AutoShot, "device" | "language" | "screen"> | null {
  const match = SHOT_KEY.exec(key);
  return match ? { device: match[1] as ShotDevice, language: match[2]!, screen: match[3] as ShotScreen } : null;
}

export interface PlannedShot {
  key: string;
  device: ShotDevice;
  language: string;
  screen: ShotScreen;
  route: string;
  list?: string;
}

/**
 * The shots to make: every screen of the app's kind, for each device, in each
 * language. Left out: the owner's uploads in a place (never overwritten),
 * and, unless `all` (Make again), the places the owner removed.
 */
export function plannedShots(app: Pick<App, "appType">, languages: readonly string[], auto: Pick<AutoScreenshots, "shots" | "removed"> | null, all = false): PlannedShot[] {
  const uploaded = new Set((auto?.shots ?? []).filter((s) => s.source === "uploaded").map(shotKey));
  const removed = new Set(all ? [] : (auto?.removed ?? []));
  const out: PlannedShot[] = [];
  for (const language of [...new Set(languages)].slice(0, SHOT_LANGUAGES_MAX)) {
    for (const device of SHOT_DEVICES) {
      for (const plan of SCREENS[app.appType]) {
        const key = shotKey({ device, language, screen: plan.screen });
        if (uploaded.has(key) || removed.has(key)) continue;
        out.push({ key, device, language, screen: plan.screen, route: plan.route, ...(plan.list ? { list: plan.list } : {}) });
      }
    }
  }
  return out;
}

/** A new app's choice: on, nothing made yet. */
export function freshAutoScreenshots(on = true): AutoScreenshots {
  return { on, state: "idle", jobId: null, dueAt: null, queuedAt: null, startedAt: null, madeAt: null, fingerprint: null, message: null, shots: [], removed: [] };
}

/** Whether the listing uses the screenshots made from the app. */
export function autoOn(app: Pick<App, "autoScreenshots">): boolean {
  return Boolean(app.autoScreenshots?.on);
}

const SCREEN_ORDER: readonly ShotScreen[] = ["home", "list", "item", "cart", "account"];

/** The set's screenshots (asset IDs) for a device in a language, in screen order, without the removed ones. */
export function shotIds(auto: Pick<AutoScreenshots, "shots" | "removed">, device: ShotDevice, language: string): string[] {
  const removed = new Set(auto.removed);
  return auto.shots
    .filter((s) => s.device === device && s.language === language && !removed.has(shotKey(s)))
    .sort((a, b) => SCREEN_ORDER.indexOf(a.screen) - SCREEN_ORDER.indexOf(b.screen))
    .map((s) => s.assetId);
}

/** The languages the set was made in, the listing's own first. */
export function shotLanguages(auto: Pick<AutoScreenshots, "shots">, main: string): string[] {
  const all = [...new Set(auto.shots.map((s) => s.language))];
  return all.includes(main) ? [main, ...all.filter((l) => l !== main)] : all;
}

export type ScreenshotLists = { phone: string[]; iphone: string[]; tablet: string[]; ipad: string[] };

/**
 * The listing's screenshots in its own language: the set made from the app
 * when "Make them for me" is on (in the listing's language, else the first one
 * it was made in), else the owner's uploads.
 */
export function listingScreenshotIds(app: Pick<App, "autoScreenshots" | "listingLanguage" | "phoneScreenshotIds" | "iphoneScreenshotIds" | "tabletScreenshotIds" | "ipadScreenshotIds">): ScreenshotLists {
  const auto = app.autoScreenshots;
  if (auto?.on) {
    const language = shotLanguages(auto, app.listingLanguage ?? "en")[0] ?? app.listingLanguage ?? "en";
    return { phone: shotIds(auto, "phone", language), iphone: shotIds(auto, "iphone", language), tablet: shotIds(auto, "tablet", language), ipad: shotIds(auto, "ipad", language) };
  }
  return { phone: app.phoneScreenshotIds, iphone: app.iphoneScreenshotIds, tablet: app.tabletScreenshotIds ?? [], ipad: app.ipadScreenshotIds ?? [] };
}

/**
 * Captions for the framed screenshots when the owner wrote none in a place:
 * the first two from the listing's own texts (its title, its short
 * description), so nothing is said the owner didn't write.
 */
export function captionsWithDefaults(own: readonly string[], texts: { storeTitle: string; shortDescription: string }): string[] {
  const out = [...own];
  const defaults = [texts.storeTitle, texts.shortDescription];
  for (let i = 0; i < defaults.length; i += 1) if (!out[i]?.trim()) out[i] = defaults[i]!.trim();
  return out;
}

/** What shows on the set: when it changes, the set is made again (only the automatic shots). */
export function shotsFingerprint(input: {
  app: Pick<App, "appType" | "vertical" | "appName" | "primaryColor" | "splashColor" | "template" | "font" | "iconAssetId" | "logoAssetId" | "backend" | "siteUrl" | "apiBaseUrl">;
  languages: readonly string[];
  /** The pages and look the app shows (its published layout, else the draft). */
  layout: unknown;
}): string {
  const { app } = input;
  const data = {
    v: 1,
    kind: [app.appType, app.vertical ?? null],
    look: [app.appName, app.primaryColor, app.splashColor, app.template, app.font, app.iconAssetId, app.logoAssetId],
    source: [app.backend, app.siteUrl, app.apiBaseUrl],
    languages: [...input.languages].slice(0, SHOT_LANGUAGES_MAX),
    screens: SCREENS[app.appType],
    layout: input.layout ?? null,
  };
  return createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 32);
}

/** A run's id: the app's and a nonce, so the pipeline's calls find the app at once. */
export function newJobId(appId: string, nonce: string): string {
  return `${appId}.${nonce}`;
}

const JOB_ID = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9a-z]{6,40})$/;

export function appIdOfJob(jobId: string): string | null {
  return JOB_ID.exec(jobId)?.[1] ?? null;
}

/** A change waits this long for the next ones before the set is made again (like automatic builds). */
export const AUTO_SHOTS_WAIT_MINUTES = 10;

/**
 * After a change that shows on the screenshots (the look, the pages, the
 * languages): a run in a few minutes, later again if one was coming; the
 * frequent job makes it only when what shows on them changed. Nothing when
 * they're off.
 */
export async function scheduleAutoScreenshots(store: Pick<DataStore, "updateApp" | "getAppById">, app: Pick<App, "id" | "autoScreenshots">, now: Date): Promise<void> {
  if (!app.autoScreenshots?.on) return;
  // Read again, so a run's progress saved meanwhile is kept.
  const auto = (await store.getAppById(app.id))?.autoScreenshots;
  if (!auto?.on) return;
  await store.updateApp(app.id, { autoScreenshots: { ...auto, dueAt: new Date(now.getTime() + AUTO_SHOTS_WAIT_MINUTES * 60_000).toISOString() } }, now);
}
