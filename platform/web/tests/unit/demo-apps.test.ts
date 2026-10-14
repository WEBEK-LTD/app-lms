import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withoutDemo } from "@/lib/admin/overview";
import { isSetupComplete, newApp, queueBuild } from "@/lib/app/setup";
import { GET as DOWNLOAD } from "@/app/demo/download/[slug]/route";
import { checkoutAccount } from "@/lib/catalog/settings";
import { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogOrder } from "@/lib/data/types";
import { artPng } from "@/lib/demo/art";
import { demoDownloadBuild, isDemoApp, listDemoApps, withDemoChecked } from "@/lib/demo/apps";
import { placeDemoOrder } from "@/lib/demo/checkout";
import { cleanDemoActivity, demoOfficeReply } from "@/lib/demo/cleanup";
import { DEMO_ACCOUNT, DEMO_LICENSE_UNTIL, DEMO_LIMITS, DEMO_SIGN_IN, DEMO_USER_NAME, demoTypeOfSlug } from "@/lib/demo/constants";
import { ARTICLE_CATEGORIES, CLINIC_DOCTORS, CLINIC_INTAKE, CLINIC_SERVICES, DEMO_ARTICLES, DEMO_CAMPAIGNS, DEMO_COURSES, DEMO_DISHES, DEMO_EVENTS, DEMO_LISTINGS, DEMO_PRODUCTS, DEMO_SERVICES, DEMO_STAFF, RESTAURANT_FULFILMENT, FITNESS_PLANS, FITNESS_TIMETABLE } from "@/lib/demo/content";
import { PICTURES } from "@/lib/demo/pictures";
import { DemoSetupError, setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { runDailyNotices } from "@/lib/notices";
import { readPngInfo } from "@/lib/png";
import { encodeQr, qrSvgPath } from "@/lib/qr";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW, setupClient } from "./helpers";

const DEVICE = { id: "install-1", platform: "android", name: "Pixel 8", app_version: "1.0.0" };
const HOUR = 3_600_000;

function deps(store: MemoryStore, now: Date = NOW, blobs = new Map<string, Buffer>()): DemoSetupDeps {
  return {
    store,
    encryptionKey: KEY,
    putBlob: async (key, data) => void blobs.set(key, data),
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
    actorEmail: "admin@yallapp.test",
    now,
  };
}

beforeEach(() => clearPlatformSettingsCache());

// 27 Eight (28 nine, 29 ten) demo apps draw their pictures: slower when the whole suite runs at once.
describe("creating the demo apps", { timeout: 20_000 }, () => {
  it("makes the demo account with ten apps, their content, pages and a license that doesn't end", async () => {
    const store = new MemoryStore();
    const blobs = new Map<string, Buffer>();
    const result = await setupDemoApps(deps(store, NOW, blobs));
    expect(result.accountCreated).toBe(true);
    expect(result.apps.map((a) => [a.type, a.created])).toEqual([
      ["lms", true],
      ["store", true],
      ["restaurant", true],
      ["booking", true],
      ["clinic", true],
      ["fitness", true],
      ["real_estate", true],
      ["news", true],
      ["events", true],
      ["donations", true],
    ]);
    const user = await store.getUserByEmail(DEMO_ACCOUNT.email);
    expect(user?.passwordHash).toBeNull();
    const client = (await store.getClientById(result.clientId))!;
    expect(client.status).toBe("active");

    const apps = await listDemoApps(store, { fresh: true });
    expect(apps.map((a) => a.appType)).toEqual(["lms", "store", "store", "booking", "booking", "booking", "real_estate", "news", "events", "donations"]);
    // 21 The clinic demo is the bookings engine with the clinic vertical; 26 the café the store engine with the restaurant vertical; 27 the gym the bookings engine with the fitness vertical; 29 the charity the donations engine with the charity vertical.
    expect(apps.map((a) => a.vertical ?? null)).toEqual([null, null, "restaurant", null, "clinic", "fitness", null, null, null, "charity"]);
    expect(new Set(apps.map((a) => a.primaryColor)).size).toBe(10);
    expect(new Set(apps.map((a) => a.template))).toEqual(new Set(["classic", "bold", "minimal"]));
    for (const app of apps) {
      expect(app).toMatchObject({ demo: true, backend: "hosted", publishingMode: "managed" });
      expect(app.iconAssetId).toBeTruthy();
      expect(app.hostedSettings?.defaultCountryCode).toBe(DEMO_SIGN_IN.countryCode);
      const license = await store.getLicenseForApp(client.id, app.id);
      expect(license).toMatchObject({ plan: "business", expiresAt: DEMO_LICENSE_UNTIL });
      const layout = await store.getAppLayout(app.id);
      expect(layout?.published?.pages[0]?.blocks.map((b) => b.id)).toContain("demo-banner");
      expect(await store.getHostedUserByPhone(app.id, DEMO_SIGN_IN.e164)).toMatchObject({ name: DEMO_USER_NAME });
    }
    const [lms, shop, cafe, bookings, clinic, gym, homes, news, events, charity] = apps as [App, App, App, App, App, App, App, App, App, App];
    expect(lms.courseSetup?.courses).toHaveLength(DEMO_COURSES.length);
    expect(lms.courseSetup?.courses.some((c) => c.priceCents === 0)).toBe(true);
    expect(await store.listCatalogProducts(shop.id)).toHaveLength(DEMO_PRODUCTS.length);
    expect(await store.listCatalogCategories(shop.id)).toHaveLength(4);
    // 26 The café's dishes with their options, and its pickup and delivery.
    const dishes = await store.listCatalogProducts(cafe.id);
    expect(dishes).toHaveLength(DEMO_DISHES.length);
    expect(dishes.find((d) => d.name === "Defne Burger")?.optionGroups?.map((g) => g.name)).toEqual(["Size", "Extras", "Side"]);
    expect((await store.listCatalogCategories(cafe.id)).map((c) => c.name)).toEqual(["Breakfast", "Mains", "Desserts", "Drinks"]);
    expect(cafe.catalogSettings?.fulfilment).toEqual(RESTAURANT_FULFILMENT);
    expect(cafe.appName).toBe("Defne Café");
    for (const dish of DEMO_DISHES) {
      const ids = (dish.optionGroups ?? []).flatMap((g) => [...g.options.map((o) => o.id)]);
      expect(new Set(ids).size, dish.name).toBe(ids.length);
    }
    expect(bookings.bookingSetup?.services).toHaveLength(DEMO_SERVICES.length);
    expect(bookings.bookingSetup?.staff).toHaveLength(DEMO_STAFF.length);
    expect(bookings.bookingSetup?.intakeFields ?? []).toEqual([]);
    expect(clinic.bookingSetup?.services).toHaveLength(CLINIC_SERVICES.length);
    expect(clinic.bookingSetup?.staff.map((s) => s.name)).toEqual(CLINIC_DOCTORS.map((d) => d.name));
    expect(clinic.bookingSetup?.staff[0]).toMatchObject({ specialties: CLINIC_DOCTORS[0]!.specialties, languages: CLINIC_DOCTORS[0]!.languages, bio: CLINIC_DOCTORS[0]!.bio });
    expect(clinic.bookingSetup?.intakeFields).toEqual(CLINIC_INTAKE);
    expect(clinic.appName).toBe("Kardelen Clinic");
    // 27 Pulse Studio: a week of classes, made for the coming weeks, and two plans on its demo payment page.
    expect(gym.appName).toBe("Pulse Studio");
    expect(gym.bookingSetup?.classTemplates).toHaveLength(FITNESS_TIMETABLE.length);
    expect(gym.bookingSetup?.membershipPlans?.map((p) => [p.name, p.period, p.credits])).toEqual(FITNESS_PLANS.map((p) => [p.name, p.period, p.credits]));
    expect(gym.bookingSetup?.membershipRequired).toBe(true);
    expect(gym.bookingSetup?.services.filter((s) => s.active).map((s) => s.name)).toEqual(["Personal training"]);
    const classes = await store.listClassSessions({ appId: gym.id });
    expect(classes.length).toBeGreaterThanOrEqual(FITNESS_TIMETABLE.length * 7);
    expect(new Set(classes.map((c) => c.serviceName))).toEqual(new Set(["Yoga flow", "Spin", "HIIT", "Mat pilates"]));
    expect((await store.getAppLayout(gym.id))?.published?.tabs.map((t) => t.label)).toEqual(["Home", "Classes", "Membership", "My bookings", "Account"]);
    expect(await store.listListings(homes.id)).toHaveLength(DEMO_LISTINGS.length);
    // 23 The news demo: its articles, published with pictures, in its sections.
    expect(news.connector).toEqual({ kind: "articles" });
    const articles = await store.listArticles(news.id);
    expect(articles).toHaveLength(DEMO_ARTICLES.length);
    expect(articles.every((a) => a.status === "published" && a.imageAssetId && a.categoryIds.length === 1)).toBe(true);
    expect((await store.listArticleCategories(news.id)).map((c) => c.name)).toEqual(ARTICLE_CATEGORIES);
    // 28 The events demo: upcoming published events, one free and one paid at least, and an online one.
    expect(events.connector).toEqual({ kind: "events" });
    expect(events.appName).toBe("Kuzey Culture Centre");
    const programme = await store.listEvents(events.id);
    expect(programme.map((e) => e.title).sort()).toEqual(DEMO_EVENTS.map((e) => e.title).sort());
    expect(programme.every((e) => e.status === "published" && e.startAt.getTime() > NOW.getTime() && e.imageAssetIds.length === 1)).toBe(true);
    const types = await store.listTicketTypes(events.id);
    expect(types.some((t) => t.priceCents === 0)).toBe(true);
    expect(types.some((t) => t.priceCents > 0)).toBe(true);
    expect(programme.some((e) => e.venueName === null && e.onlineUrl)).toBe(true);
    // 29 The charity demo: its campaigns, open, with pictures and the demo's totals, and no payment account.
    expect(charity.connector).toEqual({ kind: "campaigns" });
    expect(charity.catalogSettings?.payment).toBeNull();
    const campaigns = await store.listCampaigns(charity.id);
    expect(campaigns.map((c) => c.title).sort()).toEqual(DEMO_CAMPAIGNS.map((c) => c.title).sort());
    for (const seed of DEMO_CAMPAIGNS) {
      expect(campaigns.find((c) => c.title === seed.title)).toMatchObject({ status: "open", raisedCents: seed.raisedCents, donorCount: seed.donorCount, goalCents: seed.goalCents });
    }
    expect(await store.getDonationSettings(charity.id)).toEqual({ currency: "TRY", iosMode: "browser" });
    // Every picture is a PNG we drew.
    for (const data of blobs.values()) expect(readPngInfo(data)).toMatchObject({ hasTransparency: false });
  });

  it("updates instead of duplicating when run again", async () => {
    const store = new MemoryStore();
    const blobs = new Map<string, Buffer>();
    const first = await setupDemoApps(deps(store, NOW, blobs));
    const pictures = blobs.size;
    const shop = first.apps.find((a) => a.type === "store")!.appId;
    await store.updateCatalogProduct(shop, (await store.listCatalogProducts(shop))[0]!.id, { name: "Changed by hand" }, NOW);
    const second = await setupDemoApps(deps(store, new Date(NOW.getTime() + HOUR), blobs));
    expect(second.accountCreated).toBe(false);
    expect(second.clientId).toBe(first.clientId);
    expect(second.apps.map((a) => a.appId)).toEqual(first.apps.map((a) => a.appId));
    expect(second.apps.every((a) => !a.created)).toBe(true);
    expect(await store.listAppsByClient(first.clientId)).toHaveLength(10);
    expect(await store.listLicensesByClient(first.clientId)).toHaveLength(10);
    const products = await store.listCatalogProducts(shop);
    expect(products).toHaveLength(DEMO_PRODUCTS.length);
    expect(products.map((p) => p.name)).not.toContain("Changed by hand");
    expect(blobs.size).toBe(pictures);
    const homes = second.apps.find((a) => a.type === "real_estate")!.appId;
    expect(await store.listListings(homes)).toHaveLength(DEMO_LISTINGS.length);
    const news = second.apps.find((a) => a.type === "news")!.appId;
    expect(await store.listArticles(news)).toHaveLength(DEMO_ARTICLES.length);
    expect(await store.listArticleCategories(news)).toHaveLength(ARTICLE_CATEGORIES.length);
    const events = second.apps.find((a) => a.type === "events")!.appId;
    expect(await store.listEvents(events)).toHaveLength(DEMO_EVENTS.length);
    expect(await store.listTicketTypes(events)).toHaveLength(DEMO_EVENTS.reduce((n, e) => n + e.ticketTypes.length, 0));
    const charity = second.apps.find((a) => a.type === "donations")!.appId;
    expect(await store.listCampaigns(charity)).toHaveLength(DEMO_CAMPAIGNS.length);
    // One app at a time works too.
    const one = await setupDemoApps(deps(store), ["booking"]);
    expect(one.apps).toEqual([{ type: "booking", appId: first.apps[3]!.appId, created: false }]);
    const clinicOnly = await setupDemoApps(deps(store), ["clinic"]);
    expect(clinicOnly.apps).toEqual([{ type: "clinic", appId: first.apps[4]!.appId, created: false }]);
    const cafeOnly = await setupDemoApps(deps(store), ["restaurant"]);
    expect(cafeOnly.apps).toEqual([{ type: "restaurant", appId: first.apps[2]!.appId, created: false }]);
    expect(await store.listCatalogProducts(first.apps[2]!.appId)).toHaveLength(DEMO_DISHES.length);
  });

  it("never takes over someone else's account", async () => {
    const { store } = await setupClient({ email: DEMO_ACCOUNT.email });
    await expect(setupDemoApps(deps(store))).rejects.toBeInstanceOf(DemoSetupError);
    expect(await listDemoApps(store, { fresh: true })).toEqual([]);
  });

  it("knows its slugs", () => {
    expect(demoTypeOfSlug("real-estate")).toBe("real_estate");
    expect(demoTypeOfSlug("academy")).toBe("lms");
    expect(demoTypeOfSlug("clinic")).toBe("clinic");
    expect(demoTypeOfSlug("restaurant")).toBe("restaurant");
    expect(demoTypeOfSlug("nope")).toBeNull();
  });
});

describe("signing in to a demo app", () => {
  let store: MemoryStore;
  let demo: App;
  let other: App;
  let sender: LogSender;
  let ip: string;
  let now: Date;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    other = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", appName: "Rose Shop" };
    await store.createApp(other);
    const result = await setupDemoApps(deps(store));
    demo = (await store.getAppById(result.apps.find((a) => a.type === "store")!.appId))!;
    sender = new LogSender();
    ip = "203.0.113.20";
    now = NOW;
  });

  const context = (app: App, overrides: Partial<HostedContext> = {}): HostedContext => ({
    store,
    app,
    active: true,
    now,
    ip,
    secret: "test-hosted-secret",
    sender,
    push: false,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    ...overrides,
  });

  async function call(app: App, method: string, route: string, body?: unknown, token: string | null = null): Promise<HostedResult> {
    const result = await handleHosted(context(app), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams(), body, token });
    expectContract(method, route, result);
    return result;
  }

  async function demoSignIn(app: App, device = DEVICE, code: string = DEMO_SIGN_IN.code) {
    const requested = await call(app, "POST", "/auth/otp/request", { country_code: DEMO_SIGN_IN.countryCode, phone: DEMO_SIGN_IN.number });
    expect(requested.status).toBe(200);
    const { request_id } = requested.body as { request_id: string };
    return call(app, "POST", "/auth/otp/verify", { request_id, code, device });
  }

  it("signs in with the demo number and code, without sending anything, to the shared account", async () => {
    const first = await demoSignIn(demo);
    expect(first.status).toBe(200);
    expect(sender.sent.size).toBe(0);
    const body = first.body as { user: { name: string; phone: string }; access_token: string };
    expect(body.user).toMatchObject({ name: DEMO_USER_NAME, phone: DEMO_SIGN_IN.e164 });
    // Many phones, one account, no device limit.
    for (let i = 2; i <= 5; i++) {
      ip = `203.0.113.${20 + i}`;
      expect((await demoSignIn(demo, { ...DEVICE, id: `install-${i}` })).status).toBe(200);
    }
    // Each visitor sees only their own phone and can't change or delete the shared account.
    expect(((await call(demo, "GET", "/me/devices", undefined, body.access_token)).body as { items: unknown[] }).items).toHaveLength(1);
    expect((await call(demo, "PATCH", "/me", { name: "Someone" }, body.access_token)).status).toBe(403);
    expect((await call(demo, "DELETE", "/me", undefined, body.access_token)).status).toBe(204);
    expect(await store.getHostedUserByPhone(demo.id, DEMO_SIGN_IN.e164)).toMatchObject({ name: DEMO_USER_NAME });
    expect((await call(demo, "GET", "/me", undefined, body.access_token)).status).toBe(401);
  });

  it("refuses other numbers and wrong codes in a demo app", async () => {
    const refused = await call(demo, "POST", "/auth/otp/request", { country_code: "+90", phone: "5321234567" });
    expect(refused.status).toBe(403);
    expect((refused.body as { code: string }).code).toBe("demo_number_only");
    expect(sender.sent.size).toBe(0);
    expect((await demoSignIn(demo, DEVICE, "000000")).status).toBe(400);
    expect((await call(demo, "POST", "/auth/register", { signup_token: "x", name: "A", device: DEVICE })).status).toBe(403);
  });

  it("limits the demo number per visitor", async () => {
    for (let i = 0; i < DEMO_LIMITS.ip.limit; i++) {
      expect((await call(demo, "POST", "/auth/otp/request", { country_code: "+1", phone: DEMO_SIGN_IN.number })).status).toBe(200);
    }
    const limited = await call(demo, "POST", "/auth/otp/request", { country_code: "+1", phone: DEMO_SIGN_IN.number });
    expect(limited.status).toBe(429);
    ip = "203.0.113.99";
    expect((await call(demo, "POST", "/auth/otp/request", { country_code: "+1", phone: DEMO_SIGN_IN.number })).status).toBe(200);
  });

  it("never signs in to an app that isn't a demo app", async () => {
    // A normal app: the demo number gets a real code by message, and the demo code doesn't work.
    const requested = await call(other, "POST", "/auth/otp/request", { country_code: "+1", phone: DEMO_SIGN_IN.number });
    expect(requested.status).toBe(200);
    expect(sender.sent.get(DEMO_SIGN_IN.e164)).toMatch(/^\d{6}$/);
    const { request_id } = requested.body as { request_id: string };
    const sent = sender.sent.get(DEMO_SIGN_IN.e164)!;
    const wrong = sent === DEMO_SIGN_IN.code ? "111111" : DEMO_SIGN_IN.code;
    expect((await call(other, "POST", "/auth/otp/verify", { request_id, code: wrong, device: DEVICE })).status).toBe(400);
    // A demo app's request can't be used in another app.
    const demoRequest = await call(demo, "POST", "/auth/otp/request", { country_code: "+1", phone: DEMO_SIGN_IN.number });
    const demoId = (demoRequest.body as { request_id: string }).request_id;
    expect((await call(other, "POST", "/auth/otp/verify", { request_id: demoId, code: DEMO_SIGN_IN.code, device: DEVICE })).status).toBe(400);
    // An app marked "demo" outside the demo account isn't treated as one.
    const marked = { ...other, demo: true };
    expect(await isDemoApp(store, marked)).toBe(false);
    expect((await withDemoChecked(store, marked)).demo).toBe(false);
    expect((await withDemoChecked(store, demo)).demo).toBe(true);
  });
});

describe("demo checkout and the daily clean-up", () => {
  let store: MemoryStore;
  let shop: App;
  let homes: App;
  let other: App;

  beforeEach(async () => {
    ({ store } = await setupClient());
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    other = { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "catalog" } };
    await store.createApp(other);
    const result = await setupDemoApps(deps(store));
    shop = (await store.getAppById(result.apps.find((a) => a.type === "store")!.appId))!;
    homes = (await store.getAppById(result.apps.find((a) => a.type === "real_estate")!.appId))!;
  });

  function order(app: App, at: Date): Omit<CatalogOrder, "id"> {
    return {
      appId: app.id,
      tokenHash: createHash("sha256").update(`${app.id}${at.toISOString()}${Math.random()}`).digest("hex"),
      userId: null,
      status: "pending",
      lines: [{ productId: 1, name: "Roses", quantity: 1, unitCents: 100, imageAssetId: null, digital: false }],
      subtotalCents: 100,
      shippingCents: 0,
      totalCents: 100,
      currency: "TRY",
      customer: null,
      paymentId: null,
      createdAt: at,
      paidAt: null,
      updatedAt: at,
      commissionCents: null,
      itemTransactionIds: null,
      payoutApprovedAt: null,
    };
  }

  it("checks out without a card and never charges", async () => {
    expect(await checkoutAccount(store, shop, KEY)).toBeNull();
    const connector = connectorFor(shop, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test" })!;
    const product = (await store.listCatalogProducts(shop.id))[0]!;
    const link = await connector.handle({
      method: "POST",
      path: ["store", "checkout-link"],
      query: new URLSearchParams({ platform: "android" }),
      body: { lines: [{ product_id: product.id, quantity: 1 }] },
      user: null,
      now: NOW,
    });
    expect(link?.status).toBe(200);
    const { items } = await store.listCatalogOrders({ appId: shop.id, offset: 0, limit: 5 });
    expect(await placeDemoOrder(store, shop, items[0]!, NOW)).toBe(true);
    expect(await store.getCatalogOrder(shop.id, items[0]!.id)).toMatchObject({ status: "processing", paymentId: "demo" });
    // Not for a real shop, and only once.
    const real = await store.createCatalogOrder(order(other, NOW));
    expect(await placeDemoOrder(store, other, real, NOW)).toBe(false);
    expect(await placeDemoOrder(store, shop, (await store.getCatalogOrder(shop.id, items[0]!.id))!, NOW)).toBe(false);
  });

  it("deletes what visitors added after a day, in demo apps only", async () => {
    const user = (await store.getHostedUserByPhone(shop.id, DEMO_SIGN_IN.e164))!;
    await store.createCatalogOrder(order(shop, NOW));
    const fresh = await store.createCatalogOrder(order(shop, new Date(NOW.getTime() + 20 * HOUR)));
    const kept = await store.createCatalogOrder(order(other, NOW));
    const homeUser = (await store.getHostedUserByPhone(homes.id, DEMO_SIGN_IN.e164))!;
    const listing = (await store.listListings(homes.id))[0]!;
    const inquiry = await store.createListingInquiry({ appId: homes.id, listingId: listing.id, userId: homeUser.id, status: "open", createdAt: NOW, updatedAt: NOW });
    await store.addListingInquiryMessage({ appId: homes.id, inquiryId: inquiry.id, from: "user", text: "Is it still free?", createdAt: NOW });
    await demoOfficeReply(store, homes, inquiry, NOW);
    await demoOfficeReply(store, homes, inquiry, NOW);
    expect((await store.listListingInquiryMessages(homes.id, inquiry.id)).map((m) => m.from)).toEqual(["user", "office"]);
    await store.addListingFavorite({ appId: homes.id, userId: homeUser.id, listingId: listing.id, createdAt: NOW });
    await store.createHostedDevice({
      id: "device-row",
      appId: shop.id,
      userId: user.id,
      deviceId: "install-9",
      platform: "android",
      name: "Pixel",
      appVersion: "1.0.0",
      pushToken: null,
      pushPreferences: null,
      createdAt: NOW,
      lastSeenAt: NOW,
    });

    // Less than a day later nothing goes.
    expect((await cleanDemoActivity(store, new Date(NOW.getTime() + 2 * HOUR))).deleted).toBe(0);

    const report = await runDailyNotices({ store, baseUrl: "https://yallapp.test", mail: async () => undefined, now: new Date(NOW.getTime() + 25 * HOUR) });
    expect(report.demo.apps).toBe(10);
    expect(report.demo.deleted).toBe(4); // an order, a conversation, a favorite, a device
    const left = await store.listCatalogOrders({ appId: shop.id, offset: 0, limit: 10 });
    expect(left.items.map((o) => o.id)).toEqual([fresh.id]);
    expect(await store.getCatalogOrder(other.id, kept.id)).not.toBeNull();
    expect(await store.getListingInquiry(homes.id, inquiry.id)).toBeNull();
    expect(await store.listListingFavorites(homes.id, homeUser.id)).toEqual([]);
    expect(await store.getHostedDevice(shop.id, "device-row")).toBeNull();
    // The content and the shared account stay.
    expect(await store.listListings(homes.id)).toHaveLength(DEMO_LISTINGS.length);
    expect(await store.getHostedUserByPhone(shop.id, DEMO_SIGN_IN.e164)).not.toBeNull();
  });

  it("offers a download only for a ready build with an APK of that app", async () => {
    expect(await demoDownloadBuild(store, shop)).toBeNull();
    const build = await store.createBuild({
      id: "b1",
      clientId: shop.clientId,
      appId: shop.id,
      versionName: "1.0.0",
      status: "ready",
      stages: { queued: "done", android: "done", ios: "skipped", upload_play: "skipped", upload_testflight: "skipped" },
      config: {} as never,
      storeListing: { storeTitle: "", shortDescription: "", fullDescription: "", supportEmail: "", privacyUrl: "" },
      autoPublish: false,
      artifacts: [{ kind: "apk", url: "https://files.yallapp.test/b1/app.apk" }],
      message: null,
      logUrl: null,
      createdAt: NOW,
      startedAt: NOW,
      finishedAt: NOW,
      updatedAt: NOW,
    });
    await store.updateApp(shop.id, { demoBuildId: build.id }, NOW);
    expect((await demoDownloadBuild(store, (await store.getAppById(shop.id))!))?.id).toBe("b1");
    await store.updateApp(homes.id, { demoBuildId: build.id }, NOW);
    expect(await demoDownloadBuild(store, (await store.getAppById(homes.id))!)).toBeNull();
  });

  it("leaves the demo account out of the admin's numbers", async () => {
    const rows = await store.listClients({ filter: "all", now: NOW });
    const apps = await store.listApps();
    const { rows: counted, apps: countedApps } = withoutDemo(rows, apps, shop.clientId);
    expect(counted).toHaveLength(rows.length - 1);
    expect(countedApps.map((a) => a.id)).toEqual([other.id]);
  });
});

describe("building a demo app and its public download", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    (globalThis as { __yallappStore?: unknown }).__yallappStore = undefined;
  });

  it("builds through the normal pipeline, and /demo/download redirects to a signed link of the chosen build", async () => {
    vi.stubEnv("APP_URL", "https://yallapp.com.tr");
    vi.stubEnv("FILES_BASE_URL", "https://files.yallapp.com.tr");
    vi.stubEnv("FILES_SIGNING_SECRET", "unit-files-signing-secret-0123456789abcdef");
    const store = new MemoryStore();
    (globalThis as { __yallappStore?: unknown }).__yallappStore = Promise.resolve(store);
    const result = await setupDemoApps({ ...deps(store), assetUrl: (id) => `https://yallapp.com.tr/api/v1/assets/${id}`, platformUrl: "https://yallapp.com.tr" });
    const app = (await store.getAppById(result.apps.find((a) => a.type === "store")!.appId))!;
    const client = (await store.getClientById(app.clientId))!;
    const license = await store.getLicenseForApp(client.id, app.id);
    expect(isSetupComplete(app, "business")).toBe(true);
    const queued = await queueBuild(store, { client, app, license, versionName: "1.0.0" }, NOW, (id) => `https://yallapp.com.tr/api/v1/assets/${id}`);
    expect(queued.ok).toBe(true);
    if (!queued.ok) return;
    expect(queued.build.config).toMatchObject({ app_type: "store", app_name: "Lale Flowers", android_package: "com.yallapp.demo.store" });

    const download = (slug: string) => DOWNLOAD(new Request(`https://yallapp.com.tr/demo/download/${slug}`), { params: Promise.resolve({ slug }) });
    const before = await download("store");
    expect(before.status).toBe(303);
    expect(before.headers.get("location")).toBe("https://yallapp.com.tr/demo?download=unavailable#store");

    await store.updateBuild(queued.build.id, { status: "ready", artifacts: [{ kind: "apk", url: "https://files.yallapp.com.tr/demo/lale.apk" }] }, NOW);
    await store.updateApp(app.id, { demoBuildId: queued.build.id }, NOW);
    const after = await download("store");
    expect(after.status).toBe(303);
    expect(after.headers.get("location")).toMatch(/^https:\/\/files\.yallapp\.com\.tr\/demo\/lale\.apk\?expires=\d+&sig=[0-9a-f]{64}$/);
    expect((await download("nope")).headers.get("location")).toContain("download=unavailable");
    // Another demo can't borrow it.
    expect((await download("academy")).headers.get("location")).toContain("download=unavailable");
  });
});

describe("pictures and QR codes", () => {
  it("draws every picture as an RGB PNG, the same every time", () => {
    const first = artPng(PICTURES["product-roses"], 120, 90);
    expect(readPngInfo(first)).toEqual({ width: 120, height: 90, colorType: 2, hasTransparency: false });
    expect(artPng(PICTURES["product-roses"], 120, 90).equals(first)).toBe(true);
    for (const art of Object.values(PICTURES)) expect(readPngInfo(artPng(art, 40, 30))?.width).toBe(40);
  });

  // Matrices checked with a QR decoder (zxing-cpp) when this test was written.
  it.each([
    ["https://yallapp.com.tr/demo/download/academy", 4, "8946e020c45708dd02ad567734897b9e57282b0917563b2bc578fca45ca246ea"],
    ["https://yallapp.com.tr/demo/download/real-estate", 4, "f196200fbf399f6257ae22bd080ca9bbe4c8eba3c1bc6e38c8267302b0aad964"],
    ["A", 1, "177b3a1897a152aee17ab1ee4b667913c6bb873e6ba357debfc5ba243dabff0e"],
    [`https://yallapp.com.tr/${"y".repeat(300)}`, 13, "b2af898ac159ccfa8cfe392153dfce8402f3e25cd817bd9638d88c0e8740db70"],
  ])("encodes %s", (text, version, fingerprint) => {
    const code = encodeQr(text);
    expect(code.version).toBe(version);
    expect(code.size).toBe(version * 4 + 17);
    const rows = code.modules.map((row) => row.map((v) => (v ? "1" : "0")).join(""));
    expect(createHash("sha256").update(rows.join("\n")).digest("hex")).toBe(fingerprint);
    // The three finder patterns.
    expect(rows[0]!.slice(0, 7)).toBe("1111111");
    expect(rows[0]!.slice(-7)).toBe("1111111");
    expect(rows[code.size - 1]!.slice(0, 7)).toBe("1111111");
  });

  it("draws the code as one SVG path with a quiet zone", () => {
    const { path, side } = qrSvgPath(encodeQr("A"));
    expect(side).toBe(29);
    expect(path.startsWith("M4 4h7v1h-7z")).toBe(true);
  });
});
