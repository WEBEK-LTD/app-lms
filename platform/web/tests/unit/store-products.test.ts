import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { keyContext } from "@/lib/builds/signing";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import type { App, Course, StoreProduct } from "@/lib/data/types";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { storeBillingOn, storeBillingSource } from "@/lib/store-billing/access";
import { parseCatalog, receiveSiteCatalog } from "@/lib/store-billing/catalog";
import { checkStoreKeys } from "@/lib/store-billing/check";
import { needsSync, priceText, productIdFor, reconcileProducts, RETRY_AFTER_MS, wantedFromCatalog, wantedFromCourses } from "@/lib/store-billing/products";
import { APPLE_GROUP, appleNotificationsUrl, runStoreProductSync, syncStoreProducts } from "@/lib/store-billing/sync";
import { PLAN_INFO } from "@/lib/plans";
import { days, KEY, NOW } from "./helpers";
import { storeBillingStoreSuite } from "./store-billing-store-suite";

const later = (ms: number) => new Date(NOW.getTime() + ms);
let ids = 0;
const newId = () => `p${++ids}`;

const course = (id: number, patch: Partial<Course> = {}): Course => ({
  id,
  title: `Course ${id}`,
  description: "",
  imageAssetId: null,
  priceCents: 45000,
  categoryIds: [],
  instructorName: null,
  level: null,
  topics: [],
  active: true,
  createdAt: NOW.toISOString(),
  ...patch,
});

const CATALOG = {
  currency: "TRY",
  courses: [
    { id: 12, title: "Arabic for beginners", price: "450.00" },
    { id: 13, title: "Free taster", price: "0" },
  ],
  plans: [{ id: "pmpro:3", title: "Gold", price: "199", period: "month" as const, course_ids: [13, 12, 12] }],
};

describe("100.2 store products from the source", () => {
  it("names products the same way in both stores", () => {
    expect(productIdFor("course", 12)).toBe("course_12");
    expect(productIdFor("membership", "pmpro:3")).toBe("plan_pmpro_3");
    expect(productIdFor("membership", "LD Group/12")).toBe("plan_ld_group_12");
    expect(productIdFor("membership", "x".repeat(80))).toHaveLength(40);
    expect(priceText("450")).toBe("450.00");
    expect(priceText(0)).toBeNull();
    expect(priceText("abc")).toBeNull();
  });

  it("sells the dashboard's paid, active courses", () => {
    const wanted = wantedFromCourses({ currency: "TRY", categories: [], courses: [course(1), course(2, { priceCents: 0 }), course(3, { active: false }), course(4, { priceCents: 19999 })], nextId: 5 });
    expect(wanted.map((w) => [w.productId, w.sitePrice, w.currency])).toEqual([
      ["course_1", "450.00", "TRY"],
      ["course_4", "199.99", "TRY"],
    ]);
  });

  it("reads the plugin's catalog: paid courses and plans, each course once", () => {
    const parsed = parseCatalog(CATALOG);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(wantedFromCatalog(parsed.value)).toEqual([
      { productId: "course_12", kind: "course", courseId: 12, planId: null, title: "Arabic for beginners", period: null, courseIds: [12], currency: "TRY", sitePrice: "450.00" },
      { productId: "plan_pmpro_3", kind: "membership", courseId: null, planId: "pmpro:3", title: "Gold", period: "month", courseIds: [12, 13], currency: "TRY", sitePrice: "199.00" },
    ]);
    expect(parseCatalog({ ...CATALOG, currency: "try" })).toMatchObject({ ok: false });
    expect(parseCatalog({ ...CATALOG, courses: [{ id: 1, title: "A", price: "4,50" }] })).toMatchObject({ ok: false });
    expect(parseCatalog({ ...CATALOG, plans: [{ id: "x", title: "A", price: "1", period: "week" }] })).toMatchObject({ ok: false });
    expect(parseCatalog({ ...CATALOG, courses: Array.from({ length: 1001 }, (_, i) => ({ id: i + 1, title: "A", price: "1" })) })).toMatchObject({ ok: false });
  });

  it("adds, changes, stops and sells again, keeping the owner's price", () => {
    const parsed = parseCatalog(CATALOG);
    if (!parsed.ok) throw new Error("catalog");
    const first = reconcileProducts("app1", [], wantedFromCatalog(parsed.value), NOW, newId);
    expect(first.map((p) => [p.productId, p.active, p.ownPrice])).toEqual([
      ["course_12", true, null],
      ["plan_pmpro_3", true, null],
    ]);
    // Nothing changed: nothing to save.
    expect(reconcileProducts("app1", first, wantedFromCatalog(parsed.value), later(1000), newId)).toEqual([]);
    // The owner's price stays when the site's changes; a plan no longer sent stops.
    const owned = first.map((p) => (p.productId === "course_12" ? { ...p, ownPrice: "399.99" } : p));
    const next = reconcileProducts("app1", owned, [{ ...wantedFromCatalog(parsed.value)[0]!, sitePrice: "500.00" }], later(1000), newId);
    expect(next.map((p) => [p.productId, p.sitePrice, p.ownPrice, p.active, p.updatedAt])).toEqual([
      ["course_12", "500.00", "399.99", true, later(1000)],
      ["plan_pmpro_3", "199.00", null, false, later(1000)],
    ]);
    // Another currency drops the owner's price; a stopped plan sent again sells again under the same ID.
    const merged = owned.map((p) => next.find((n) => n.productId === p.productId) ?? p);
    const again = reconcileProducts("app1", merged, wantedFromCatalog({ ...parsed.value, currency: "USD" }), later(2000), newId);
    expect(again.map((p) => [p.productId, p.id, p.currency, p.ownPrice, p.active])).toEqual([
      ["course_12", first[0]!.id, "USD", null, true],
      ["plan_pmpro_3", first[1]!.id, "USD", null, true],
    ]);
  });

  it("knows what each store must hear again, and waits an hour after a failure", () => {
    const product = reconcileProducts("app1", [], wantedFromCourses({ currency: "TRY", categories: [], courses: [course(1)], nextId: 2 }), NOW, newId)[0]!;
    const sync = (status: "synced" | "failed" | "stopped", at: Date) => ({ status, storeState: null, price: null, error: null, at: at.toISOString() });
    expect(needsSync(product, null)).toBe(true);
    expect(needsSync(product, sync("synced", later(1)))).toBe(false);
    expect(needsSync({ ...product, updatedAt: later(2) }, sync("synced", later(1)))).toBe(true);
    expect(needsSync(product, sync("failed", NOW), later(RETRY_AFTER_MS - 1))).toBe(false);
    expect(needsSync(product, sync("failed", NOW), later(RETRY_AFTER_MS))).toBe(true);
    expect(needsSync(product, sync("failed", NOW))).toBe(true);
    // Stopped on the source: once in each store that had it.
    expect(needsSync({ ...product, active: false }, null)).toBe(false);
    expect(needsSync({ ...product, active: false }, sync("synced", NOW))).toBe(true);
    expect(needsSync({ ...product, active: false }, sync("stopped", NOW))).toBe(false);
  });

  it("is for academies on the dashboard's courses or WordPress, on plans with it, once turned on", () => {
    const base = newApp("c1", "https://academy.test", NOW, "lms");
    expect(storeBillingSource({ ...base, backend: "wordpress" })).toBe("site");
    expect(storeBillingSource({ ...base, backend: "hosted", connector: { kind: "courses" } })).toBe("courses");
    expect(storeBillingSource({ ...base, backend: "custom_api" })).toBeNull();
    expect(storeBillingSource({ ...newApp("c1", "https://shop.test", NOW, "store"), backend: "wordpress" })).toBeNull();
    const app = { ...base, backend: "wordpress" as const, storeBilling: { enabled: true } };
    expect(storeBillingOn(app, PLAN_INFO.growth)).toBe(true);
    expect(storeBillingOn(app, PLAN_INFO.starter)).toBe(false);
    expect(storeBillingOn({ ...app, storeBilling: null }, PLAN_INFO.growth)).toBe(false);
  });
});

/** A WordPress academy whose site took its license. */
async function wordpress(plan: "starter" | "growth" = "growth") {
  const store = new MemoryStore();
  const { client } = await registerClient(store, { name: "Ada", email: "ada@academy.test", whatsapp: "+905446731942", siteUrl: "https://academy.test", password: null }, NOW);
  const created: App = { ...newApp(client.id, "https://academy.test", NOW, "lms"), backend: "wordpress", appName: "Ada Academy" };
  await store.createApp(created);
  const { licenseKey } = await activateClient(store, { clientId: client.id, appId: created.id, plan, activeUntil: days(30), paymentNote: "" }, KEY, NOW);
  const info = { license_key: licenseKey, site_url: "https://academy.test", plugin_version: "0.4.23", wp_version: "6.8", lms: "tutor" };
  const site = parseSiteInfo(info);
  if (!site.ok) throw new Error("site");
  expect((await activateLicense(store, site.value, NOW)).status).toBe(200);
  return { store, app: (await store.getAppById(created.id))!, info };
}

describe("100.2 POST /api/v1/billing/catalog", () => {
  it("keeps a product for each paid course and plan, and stops the ones no longer sent", async () => {
    const { store, app, info } = await wordpress();
    expect(await receiveSiteCatalog(store, { ...info, ...CATALOG }, NOW)).toEqual({ status: 204 });
    expect((await store.listStoreProducts(app.id)).map((p) => [p.productId, p.kind, p.active])).toEqual([
      ["course_12", "course", true],
      ["plan_pmpro_3", "membership", true],
    ]);
    expect(await receiveSiteCatalog(store, { ...info, ...CATALOG, plans: [] }, later(1000))).toEqual({ status: 204 });
    expect((await store.getStoreProduct(app.id, "plan_pmpro_3"))?.active).toBe(false);
    // Only the license's own site; a bad catalog is refused.
    expect(await receiveSiteCatalog(store, { ...info, site_url: "https://other.test", ...CATALOG }, NOW)).toMatchObject({ status: 403 });
    expect(await receiveSiteCatalog(store, { ...info, ...CATALOG, currency: "" }, NOW)).toMatchObject({ status: 400 });
  });

  it("keeps nothing on Starter", async () => {
    const { store, app, info } = await wordpress("starter");
    expect(await receiveSiteCatalog(store, { ...info, ...CATALOG }, NOW)).toEqual({ status: 204 });
    expect(await store.listStoreProducts(app.id)).toEqual([]);
  });
});

// The stores, as recorded answers --------------------------------------------------

interface Call {
  method: string;
  url: string;
  body: unknown;
}

type Answer = (call: Call) => { status?: number; body?: unknown } | undefined;

function fakeFetch(...answers: Answer[]) {
  const calls: Call[] = [];
  const fetcher = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const raw = init?.body ? String(init.body) : "";
    const call = { method: init?.method ?? "GET", url, body: raw.startsWith("{") ? JSON.parse(raw) : raw };
    calls.push(call);
    for (const answer of answers) {
      const found = answer(call);
      if (found) return Response.json(found.body ?? {}, { status: found.status ?? 200 });
    }
    return Response.json({ error: `no answer for ${call.method} ${url}` }, { status: 500 });
  }) as typeof fetch;
  return { fetcher, calls };
}

const PLAY = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.ada.app";
const ASC = "https://api.appstoreconnect.apple.com";
const money = (currencyCode: string, units: string, nanos = 0) => ({ currencyCode, units, nanos });

const googleAnswers: Answer = (call) => {
  if (call.url === "https://oauth2.googleapis.com/token") return { body: { access_token: "ya29.token" } };
  if (call.url === `${PLAY}/pricing:convertRegionPrices`)
    return { body: { convertedRegionPrices: { TR: { regionCode: "TR", price: money("TRY", "529", 990000000) }, US: { regionCode: "US", price: money("USD", "13", 990000000) } }, regionVersion: { version: "2025/03" } } };
  if (call.method === "POST" && call.url === `${PLAY}/edits`) return { body: { id: "e1" } };
  if (call.url === `${PLAY}/edits/e1/details`) return { body: { defaultLanguage: "tr-TR" } };
  if (call.method === "DELETE") return { body: {} };
  if (call.method === "PATCH" && call.url.startsWith(`${PLAY}/onetimeproducts/`)) return { body: { ...(call.body as object), purchaseOptions: [{ purchaseOptionId: "buy", state: "ACTIVE", regionalPricingAndAvailabilityConfigs: (call.body as { purchaseOptions: { regionalPricingAndAvailabilityConfigs: unknown[] }[] }).purchaseOptions[0]!.regionalPricingAndAvailabilityConfigs }] } };
  if (call.url.startsWith(`${PLAY}/oneTimeProducts?`)) return { body: { oneTimeProducts: [] } };
  return undefined;
};

const appleAnswers: Answer = (call) => {
  const path = call.url.slice(ASC.length);
  if (path.startsWith("/v1/apps?filter[bundleId]")) return { body: { data: [{ id: "6450000001", type: "apps", attributes: { bundleId: "com.ada.app" } }] } };
  if (call.method === "PATCH" && path === "/v1/apps/6450000001") return { body: { data: { id: "6450000001", type: "apps" } } };
  if (path.startsWith("/v1/apps/6450000001/inAppPurchasesV2")) return { body: { data: [] } };
  if (call.method === "POST" && path === "/v2/inAppPurchases") return { status: 201, body: { data: { id: "iap1", type: "inAppPurchases", attributes: { state: "MISSING_METADATA", productId: "course_12" } } } };
  if (path.startsWith("/v2/inAppPurchases/iap1/versions") || path.startsWith("/v1/inAppPurchaseVersions/")) return { body: { data: [] } };
  if (call.method === "POST" && path === "/v1/inAppPurchaseVersions") return { status: 201, body: { data: { id: "ver1", type: "inAppPurchaseVersions", attributes: { state: "PREPARE_FOR_SUBMISSION" } } } };
  if (call.method === "POST" && path === "/v2/inAppPurchaseLocalizations") return { status: 201, body: { data: { id: "loc1", type: "inAppPurchaseLocalizations" } } };
  if (path.startsWith("/v1/territories")) return { body: { data: [{ id: "TUR", type: "territories" }, { id: "USA", type: "territories" }] } };
  if (call.method === "POST" && path === "/v1/inAppPurchaseAvailabilities") return { status: 201, body: { data: { id: "av1", type: "inAppPurchaseAvailabilities" } } };
  if (path.startsWith("/v2/inAppPurchases/iap1/pricePoints"))
    return { body: { data: ["399.99", "449.99", "499.99"].map((customerPrice, i) => ({ id: `pp${i}`, type: "inAppPurchasePricePoints", attributes: { customerPrice } })) } };
  if (call.method === "POST" && path === "/v1/inAppPurchasePriceSchedules") return { status: 201, body: { data: { id: "iap1", type: "inAppPurchasePriceSchedules" } } };
  if (path === "/v2/inAppPurchases/iap1") return { body: { data: { id: "iap1", type: "inAppPurchases", attributes: { state: "READY_TO_SUBMIT" } } } };
  return undefined;
};

/** A dashboard academy with one paid course and both store keys saved. */
async function hostedAcademy(keys: { google?: boolean; apple?: boolean } = { google: true, apple: true }) {
  const store = new MemoryStore();
  const account = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const p8 = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const base = newApp("c1", null, NOW, "lms");
  const app: App = {
    ...base,
    backend: "hosted",
    connector: { kind: "courses" },
    courseSetup: { currency: "TRY", categories: [], courses: [course(12, { title: "Arabic for beginners" })], nextId: 13 },
    androidPackage: "com.ada.app",
    iosBundleId: "com.ada.app",
    storeBilling: { enabled: true },
    googlePlayKeyEncrypted: keys.google ? encrypt(JSON.stringify({ client_email: "yallapp@ada.iam.gserviceaccount.com", private_key: account }), KEY, keyContext.googlePlay(base.id)) : null,
    ascKeyId: keys.apple ? "ABC123DEF4" : null,
    ascIssuerId: keys.apple ? "69a6de70-0000-47e3-e053-5b8c7c11a4d1" : null,
    ascPrivateKeyEncrypted: keys.apple ? encrypt(p8, KEY, keyContext.appStore(base.id)) : null,
  };
  await store.createApp(app);
  return { store, app: (await store.getAppById(app.id))! };
}

describe("100.2 making the products in the stores", () => {
  it("makes a course's product in Google Play and the App Store at the site's price, and points Apple's notifications at Yallapp", async () => {
    const { store, app } = await hostedAcademy();
    const { fetcher, calls } = fakeFetch(googleAnswers, appleAnswers);
    const report = await syncStoreProducts({ store, key: KEY, now: NOW, fetcher }, app);
    expect(report).toEqual({ google: { done: 1, failed: 0, waiting: 0 }, apple: { done: 1, failed: 0, waiting: 0 } });
    const product = (await store.getStoreProduct(app.id, "course_12")) as StoreProduct;
    // Google keeps the site's price where its currency is used; Apple the nearest price point.
    expect(product.google).toEqual({ status: "synced", storeState: "ACTIVE", price: "450.00", error: null, at: NOW.toISOString() });
    expect(product.apple).toEqual({ status: "synced", storeState: "READY_TO_SUBMIT", price: "449.99", error: null, at: NOW.toISOString() });
    // The Play listing is in the app's default language there.
    const patch = calls.find((c) => c.method === "PATCH" && c.url.startsWith(`${PLAY}/onetimeproducts/course_12?`))!;
    expect((patch.body as { listings: unknown[] }).listings).toEqual([{ languageCode: "tr-TR", title: "Arabic for beginners", description: "Arabic for beginners" }]);
    const notified = calls.find((c) => c.method === "PATCH" && c.url === `${ASC}/v1/apps/6450000001`)!;
    expect((notified.body as { data: { attributes: Record<string, string> } }).data.attributes).toMatchObject({ subscriptionStatusUrl: appleNotificationsUrl(app.id), subscriptionStatusUrlVersion: "V2" });
    expect((await store.getAppById(app.id))?.storeBilling).toMatchObject({ enabled: true, appleAppId: "6450000001", appleNotificationsUrl: appleNotificationsUrl(app.id), syncedAt: NOW.toISOString() });

    // Up to date: the next run asks no store anything.
    const again = fakeFetch(googleAnswers, appleAnswers);
    expect(await syncStoreProducts({ store, key: KEY, now: later(60_000), fetcher: again.fetcher }, (await store.getAppById(app.id))!)).toEqual({ google: { done: 0, failed: 0, waiting: 0 }, apple: { done: 0, failed: 0, waiting: 0 } });
    expect(again.calls).toEqual([]);
  });

  it("keeps a store's refusal on the product and on the app, and tries again after an hour", async () => {
    const { store, app } = await hostedAcademy({ google: true });
    const refused: Answer = (call) => (call.url.startsWith(`${PLAY}/pricing`) ? { status: 403, body: { error: { code: 403 } } } : undefined);
    const { fetcher } = fakeFetch(refused, googleAnswers);
    expect((await syncStoreProducts({ store, key: KEY, now: NOW, fetcher }, app)).google).toEqual({ done: 0, failed: 1, waiting: 0 });
    expect((await store.getStoreProduct(app.id, "course_12"))?.google).toMatchObject({ status: "failed", error: "google_refused" });
    expect((await store.getAppById(app.id))?.storeBilling?.googleCheck).toEqual({ at: NOW.toISOString(), error: "google_refused" });
    const soon = fakeFetch(googleAnswers);
    expect((await syncStoreProducts({ store, key: KEY, now: later(60_000), fetcher: soon.fetcher }, (await store.getAppById(app.id))!)).google.done).toBe(0);
    expect(soon.calls).toEqual([]);
    const hour = fakeFetch(googleAnswers);
    expect((await syncStoreProducts({ store, key: KEY, now: later(RETRY_AFTER_MS), fetcher: hour.fetcher }, (await store.getAppById(app.id))!)).google.done).toBe(1);
    expect((await store.getAppById(app.id))?.storeBilling?.googleCheck).toEqual({ at: later(RETRY_AFTER_MS).toISOString(), error: null });
  });

  it("stops a course no longer paid, in both stores", async () => {
    const { store, app } = await hostedAcademy();
    await syncStoreProducts({ store, key: KEY, now: NOW, fetcher: fakeFetch(googleAnswers, appleAnswers).fetcher }, app);
    const free = { ...(await store.getAppById(app.id))!, courseSetup: { ...app.courseSetup!, courses: [course(12, { priceCents: 0 })] } };
    await store.updateApp(app.id, { courseSetup: free.courseSetup }, NOW);
    const stopping: Answer = (call) => {
      if (call.method === "GET" && call.url === `${PLAY}/oneTimeProducts/course_12`) return { body: { purchaseOptions: [{ purchaseOptionId: "buy", state: "ACTIVE" }] } };
      if (call.url === `${PLAY}/oneTimeProducts/course_12/purchaseOptions:batchUpdateStates`) return { body: { oneTimeProducts: [] } };
      if (call.url.startsWith(`${ASC}/v1/apps/6450000001/inAppPurchasesV2`)) return { body: { data: [{ id: "iap1", type: "inAppPurchases", attributes: { productId: "course_12" } }] } };
      return undefined;
    };
    const { fetcher, calls } = fakeFetch(stopping, googleAnswers, appleAnswers);
    const report = await syncStoreProducts({ store, key: KEY, now: later(60_000), fetcher }, (await store.getAppById(app.id))!);
    expect(report.google.done + report.apple.done).toBe(2);
    const product = (await store.getStoreProduct(app.id, "course_12"))!;
    expect([product.active, product.google?.status, product.apple?.status]).toEqual([false, "stopped", "stopped"]);
    expect(calls.find((c) => c.url.endsWith("purchaseOptions:batchUpdateStates"))?.body).toEqual({ requests: [{ deactivatePurchaseOptionRequest: { packageName: "com.ada.app", productId: "course_12", purchaseOptionId: "buy" } }] });
    const availability = calls.find((c) => c.method === "POST" && c.url === `${ASC}/v1/inAppPurchaseAvailabilities`)!;
    expect(availability.body).toMatchObject({ data: { attributes: { availableInNewTerritories: false }, relationships: { availableTerritories: { data: [] } } } });
  });

  it("runs for the apps that sell in the app, on plans that have it", async () => {
    const { store, app } = await hostedAcademy({ google: true });
    const { fetcher } = fakeFetch(googleAnswers);
    expect(await runStoreProductSync({ store, key: KEY, now: NOW, fetcher }, async () => false)).toEqual({ apps: 0, done: 0, failed: 0 });
    expect(await runStoreProductSync({ store, key: KEY, now: NOW, fetcher }, async () => true)).toEqual({ apps: 1, done: 1, failed: 0 });
    await store.updateApp(app.id, { storeBilling: { enabled: false } }, NOW);
    expect(await runStoreProductSync({ store, key: KEY, now: later(1), fetcher }, async () => true)).toEqual({ apps: 0, done: 0, failed: 0 });
  });

  it("checks each store's key", async () => {
    const { store, app } = await hostedAcademy();
    const { fetcher, calls } = fakeFetch(googleAnswers, appleAnswers);
    expect(await checkStoreKeys({ store, key: KEY, now: NOW, fetcher }, app)).toEqual({ ok: true, google: null, apple: null });
    expect(calls.map((c) => `${c.method} ${c.url.replace(ASC, "").replace(PLAY, "")}`)).toEqual([
      "POST https://oauth2.googleapis.com/token",
      "GET /oneTimeProducts?pageSize=1",
      "GET /v1/apps?filter[bundleId]=com.ada.app&limit=1",
      "PATCH /v1/apps/6450000001",
    ]);
    const { fetcher: refused } = fakeFetch((call) => (call.url.startsWith(ASC) ? { status: 401, body: {} } : undefined), googleAnswers);
    expect(await checkStoreKeys({ store, key: KEY, now: NOW, fetcher: refused }, { ...app, storeBilling: { enabled: true } })).toEqual({ ok: false, google: null, apple: "apple_refused" });
    expect((await store.getAppById(app.id))?.storeBilling?.appleCheck).toEqual({ at: NOW.toISOString(), error: "apple_refused" });
    // A key that can't be read says so.
    expect(await checkStoreKeys({ store, key: Buffer.alloc(32, 9), now: NOW, fetcher }, app)).toMatchObject({ google: "unreadable", apple: "unreadable" });
    expect(APPLE_GROUP).toBe("Memberships");
  });
});

describe("100.2/100.3 store billing in the memory store", () => {
  const store = new MemoryStore();
  storeBillingStoreSuite(() => store);
});
