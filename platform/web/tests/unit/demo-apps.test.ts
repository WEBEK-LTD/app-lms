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
import { EMPTY_DRIVER } from "@/lib/rides/settings";
import { placeDemoOrder } from "@/lib/demo/checkout";
import { cleanDemoActivity, demoOfficeReply } from "@/lib/demo/cleanup";
import { DEMO_ACCOUNT, DEMO_LICENSE_UNTIL, DEMO_LIMITS, DEMO_SIGN_IN, DEMO_TYPES, DEMO_USER_NAME, demoIdOf, demoTypeOfSlug, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { ARTICLE_CATEGORIES, CLINIC_DOCTORS, CLINIC_INTAKE, CLINIC_SERVICES, DEMO_ARTICLES, DEMO_CAMPAIGNS, DEMO_COURSES, DEMO_DELIVERY_SERVICES, DEMO_DISHES, DEMO_EVENTS, DEMO_LISTINGS, DEMO_RESTAURANTS, DEMO_PRODUCTS, DEMO_SERVICES, DEMO_STAFF, RESTAURANT_FULFILMENT, FITNESS_PLANS, FITNESS_TIMETABLE, TAXI_DEMO_DRIVERS, TAXI_DEMO_TYPES } from "@/lib/demo/content";
import { PICTURES } from "@/lib/demo/pictures";
import { SCHOOL_CLASSES, SCHOOL_HOMEWORK, SCHOOL_SUBJECTS, SCHOOL_TEACHERS } from "@/lib/demo/school";
import { ACADEMY_COURSES, ACADEMY_TEACHERS } from "@/lib/demo/teachers";
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
  it("makes the demo account with sixteen apps, their content, pages and a license that doesn't end", async () => {
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
      ["delivery", true],
      ["food", true],
      ["rides", true],
      ["taxi", true],
      ["school", true],
      ["instructors", true],
    ]);
    const user = await store.getUserByEmail(DEMO_ACCOUNT.email);
    expect(user?.passwordHash).toBeNull();
    const client = (await store.getClientById(result.clientId))!;
    expect(client.status).toBe("active");

    const apps = await listDemoApps(store, { fresh: true });
    expect(apps.map((a) => a.appType)).toEqual(["lms", "store", "store", "booking", "booking", "booking", "real_estate", "news", "events", "donations", "delivery", "food", "rides", "rides", "school", "lms"]);
    // 21 The clinic demo is the bookings engine with the clinic vertical; 26 the café the store engine with the restaurant vertical; 27 the gym the bookings engine with the fitness vertical; 29 the charity the donations engine with the charity vertical.
    // 110.5 The live taxi app is the rides engine with the taxi vertical, the academy with many teachers the courses engine with the instructors vertical.
    expect(apps.map((a) => a.vertical ?? null)).toEqual([null, null, "restaurant", null, "clinic", "fitness", null, null, null, "charity", null, null, null, "taxi", null, "instructors"]);
    expect(new Set(apps.map((a) => a.primaryColor)).size).toBe(16);
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
    const [lms, shop, cafe, bookings, clinic, gym, homes, news, events, charity, parcels, food, rides, taxi, school, academy] = apps as [App, App, App, App, App, App, App, App, App, App, App, App, App, App, App, App];
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
    // Studio's demos: Studio projects whose demo account is also the company's courier, restaurant staff and driver.
    for (const app of [parcels, food, rides, taxi, school, academy]) {
      expect(app.section).toBe("studio");
      expect(app.hostedSettings).toMatchObject({ reviewPhone: DEMO_SIGN_IN.e164, reviewCode: DEMO_SIGN_IN.code });
    }
    for (const app of [lms, shop, homes]) expect(app.hostedSettings).toMatchObject({ reviewPhone: null, reviewCode: null });
    expect(parcels).toMatchObject({ appName: "Sahm Express", connector: { kind: "deliveries" } });
    expect((await store.listDeliveryServices(parcels.id)).map((s) => s.name)).toEqual(DEMO_DELIVERY_SERVICES.map((s) => s.name));
    expect(await store.getDeliverySettings(parcels.id)).toMatchObject({ pricing: "distance", tracking: "live", courierApp: "same", cash: true, card: false });
    expect(food).toMatchObject({ appName: "Sofra Eats", connector: { kind: "restaurants" } });
    const restaurants = await store.listRestaurants(food.id);
    expect(restaurants.map((r) => r.name)).toEqual(DEMO_RESTAURANTS.map((r) => r.name));
    const menu = (await store.getRestaurantMenu(food.id, restaurants[0]!.id))!;
    expect(menu.sections.flatMap((s) => s.dishes).find((d) => d.name === "Koshary")?.choiceGroups[0]).toMatchObject({ name: "Size", min: 1, max: 1 });
    expect(restaurants.every((r) => r.hours.length === 7 && r.active)).toBe(true);
    expect(rides).toMatchObject({ appName: "Masar Rides", connector: { kind: "rides" } });
    expect((await store.listVehicleTypes(rides.id)).map((t) => t.name)).toEqual(["Economy", "Comfort", "Van"]);
    expect((await store.getDeliverySettings(rides.id))?.rides).toMatchObject({ fareMode: "upfront", pin: true, scheduling: true });
    // 110.5 Lamha Taxi: three vehicle types with fares, and drivers with their cars who are never online.
    expect(taxi).toMatchObject({ appName: "Lamha Taxi", connector: { kind: "rides" }, vertical: "taxi" });
    expect((await store.listVehicleTypes(taxi.id)).map((t) => [t.name, t.baseCents > 0])).toEqual(TAXI_DEMO_TYPES.map((t) => [t.name, true]));
    const drivers = await store.listCouriers(taxi.id);
    expect(drivers.map((d) => d.name).sort()).toEqual(TAXI_DEMO_DRIVERS.map((d) => d.name).sort());
    expect(drivers.every((d) => d.active && !d.onDuty && d.lat === null && d.driver?.vehicleTypeId && d.driver.plate && d.driver.carModel)).toBe(true);
    expect((await store.getDeliverySettings(taxi.id))?.taxi).toMatchObject({ provider: "osm", tilesUrl: null, databaseUrl: null });
    // 110.5 Nakhla School: its classes, subjects and timetable, and the demo number as a student, a parent and a teacher.
    expect(school).toMatchObject({ appName: "Nakhla School", connector: { kind: "school" } });
    expect((await store.listSchoolClasses(school.id)).map((c) => c.name)).toEqual(SCHOOL_CLASSES.map((c) => c.name));
    expect((await store.listSchoolSubjects(school.id)).map((x) => x.name).sort()).toEqual([...SCHOOL_SUBJECTS].sort());
    expect((await store.findSchoolPeople(school.id, { phone: DEMO_SIGN_IN.e164, email: null })).map((p) => [p.role, p.name]).sort()).toEqual([
      ["parent", "Rania Haddad"],
      ["student", "Lina Haddad"],
      ["teacher", "Mona Saleh"],
    ]);
    expect(await store.listSchoolPeriods(school.id)).toHaveLength(SCHOOL_CLASSES.length * 5 * 5);
    expect(await store.listSchoolHomework(school.id)).toHaveLength(SCHOOL_HOMEWORK.length);
    expect(await store.getSchoolSettings(school.id)).toMatchObject({ timezone: "Africa/Cairo", feesByCard: true });
    // 110.5 Rawaq Academy: seven teachers, each with their courses, and the demo number as a teacher students never see.
    expect(academy).toMatchObject({ appName: "Rawaq Academy", connector: { kind: "courses" }, vertical: "instructors" });
    const teachers = await store.listTeachers(academy.id);
    expect(teachers.filter((t) => t.phone === null).map((t) => t.name).sort()).toEqual(ACADEMY_TEACHERS.map((t) => t.name).sort());
    expect(teachers.filter((t) => t.phone === null).every((t) => t.photoAssetId && t.bio && t.shareBp === 7000)).toBe(true);
    expect(teachers.find((t) => t.phone === DEMO_SIGN_IN.e164)).toMatchObject({ name: "Demo teacher", status: "active" });
    expect(academy.courseSetup?.courses).toHaveLength(ACADEMY_COURSES.length);
    expect(academy.courseSetup?.courses.every((c) => c.teacherId && teachers.find((t) => t.id === c.teacherId)?.name === c.instructorName && c.active)).toBe(true);
    expect(academy.courseSetup?.teachersApply).toBe(true);
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
    expect(await store.listAppsByClient(first.clientId)).toHaveLength(16);
    expect(await store.listLicensesByClient(first.clientId)).toHaveLength(16);
    const food = second.apps.find((a) => a.type === "food")!.appId;
    expect(await store.listRestaurants(food)).toHaveLength(DEMO_RESTAURANTS.length);
    const parcels = second.apps.find((a) => a.type === "delivery")!.appId;
    expect(await store.listDeliveryServices(parcels)).toHaveLength(DEMO_DELIVERY_SERVICES.length);
    const rides = second.apps.find((a) => a.type === "rides")!.appId;
    expect(await store.listVehicleTypes(rides)).toHaveLength(3);
    const taxi = second.apps.find((a) => a.type === "taxi")!.appId;
    expect(await store.listCouriers(taxi)).toHaveLength(TAXI_DEMO_DRIVERS.length);
    const school = second.apps.find((a) => a.type === "school")!.appId;
    expect(await store.listSchoolPeople(school)).toHaveLength(SCHOOL_TEACHERS.length + SCHOOL_CLASSES.reduce((n, c) => n + c.students.length, 0) + 1);
    expect(await store.listSchoolHomework(school)).toHaveLength(SCHOOL_HOMEWORK.length);
    expect(await store.listSchoolFees(school)).toHaveLength(4);
    const academy = second.apps.find((a) => a.type === "instructors")!.appId;
    expect(await store.listTeachers(academy)).toHaveLength(ACADEMY_TEACHERS.length + 1);
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
    expect(demoTypeOfSlug("food-delivery")).toBe("food");
    expect(demoTypeOfSlug("rides")).toBe("rides");
    expect(demoTypeOfSlug("taxi")).toBe("taxi");
    expect(demoTypeOfSlug("school")).toBe("school");
    expect(demoTypeOfSlug("teachers")).toBe("instructors");
    expect(DEMO_TYPES).not.toContain("rides");
    expect(STUDIO_DEMO_TYPES).toEqual(["delivery", "food", "rides", "taxi", "school", "instructors"]);
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

  it("Studio's demos: the visitor is the rider and, in Driver mode, the driver who gets their own ride", async () => {
    const ridesApp = (await listDemoApps(store, { fresh: true })).find((a) => a.appType === "rides")!;
    const connector = connectorFor(ridesApp, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test", rides: true })!;
    const ride = (app: App) => ({ ...context(app), connector });
    const go = async (method: string, route: string, body?: unknown, token: string | null = null) => {
      const result = await handleHosted(ride(ridesApp), { method, path: route.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android" }), body, token });
      expectContract(method, route, result);
      return result;
    };
    const requested = await go("POST", "/auth/otp/request", { country_code: DEMO_SIGN_IN.countryCode, phone: DEMO_SIGN_IN.number });
    const signedIn = await go("POST", "/auth/otp/verify", { request_id: (requested.body as { request_id: string }).request_id, code: DEMO_SIGN_IN.code, device: DEVICE });
    const { access_token: token, user } = signedIn.body as { access_token: string; user: { roles: string[] } };
    expect(user.roles).toEqual(["driver"]);
    const place = (address: string, lat: number, lng: number) => ({ address, details: null, lat, lng });
    const estimate = await go("POST", "/rides/estimate", { pickup: place("Tahrir Square", 30.0444, 31.2357), dropoff: place("Cairo Tower", 30.0459, 31.2243) }, token);
    expect((estimate.body as { options: { vehicle_type: { name: string } }[] }).options.map((o) => o.vehicle_type.name)).toEqual(["Economy", "Comfort", "Van"]);
    const asked = await go("POST", "/rides", { pickup: place("Tahrir Square", 30.0444, 31.2357), dropoff: place("Cairo Tower", 30.0459, 31.2243), vehicle_type_id: (await store.listVehicleTypes(ridesApp.id))[0]!.id, payment: "cash" }, token);
    expect(asked.body).toMatchObject({ status: "searching" });
    expect(asked.status).toBe(201);
    await go("PATCH", "/driver/me", { online: true }, token);
    const offers = await go("GET", "/driver/offers", undefined, token);
    expect((offers.body as { items: { id: number }[] }).items.map((o) => o.id)).toEqual([(asked.body as { id: number }).id]);
  });

  /** Signs in to a Studio demo with the demo number, through its connector when it has one. */
  async function studio(type: "taxi" | "school" | "instructors") {
    const app = (await listDemoApps(store, { fresh: true })).find((a) => demoIdOf(a) === type)!;
    const connector = connectorFor(app, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test", rides: true }) ?? undefined;
    const go = async (method: string, route: string, body?: unknown, token: string | null = null, query: Record<string, string> = {}) => {
      const [path, search] = route.split("?");
      const parts = path!.split("/").filter(Boolean);
      const result = await handleHosted({ ...context(app), connector }, { method, path: parts, query: new URLSearchParams({ platform: "android", app_version: "1.0.0", ...Object.fromEntries(new URLSearchParams(search ?? "")), ...query }), body, token });
      // The contract's route: an ID is named after the list before it (/school/students/{student_id}).
      const names: Record<string, string> = { students: "student_id", homework: "homework_id", classes: "class_id", teachers: "teacher_id", courses: "course_id", fees: "fee_id", assessments: "assessment_id" };
      expectContract(method, `/${parts.map((part, i) => (/^\d+$/.test(part) ? `{${names[parts[i - 1]!]}}` : part)).join("/")}`, result);
      return result;
    };
    const requested = await go("POST", "/auth/otp/request", { country_code: DEMO_SIGN_IN.countryCode, phone: DEMO_SIGN_IN.number });
    const signedIn = await go("POST", "/auth/otp/verify", { request_id: (requested.body as { request_id: string }).request_id, code: DEMO_SIGN_IN.code, device: DEVICE });
    const { access_token: token, user } = signedIn.body as { access_token: string; user: { roles: string[] } };
    return { app, go, token, roles: user.roles };
  }

  it("110.5 Lamha Taxi: taxis drive around wherever the rider is, the platform's map, and the visitor drives their own ride", async () => {
    const { app, go, token, roles } = await studio("taxi");
    expect(roles).toEqual(["driver"]);
    // No map of its own: the plain ride screens until the team sets Admin › Settings › Maps.
    const plain = (await go("GET", "/config")).body as { taxi: { map: { tiles_url: string | null; search: boolean }; live: unknown } };
    expect(plain.taxi).toMatchObject({ map: { tiles_url: null, search: false }, live: null });
    await store.setPlatformSetting("maps", { tilesUrl: "https://tiles.yallapp.test/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors" }, "admin@yallapp.test", NOW);
    clearPlatformSettingsCache();
    const mapped = (await go("GET", "/config")).body as { taxi: { map: { tiles_url: string | null; attribution: string | null } } };
    expect(mapped.taxi.map).toMatchObject({ tiles_url: "https://tiles.yallapp.test/{z}/{x}/{y}.png", attribution: "© OpenStreetMap contributors" });

    // Anywhere in the world: the demo's drivers around the place, a little further a few seconds later.
    for (const at of [{ lat: 30.0444, lng: 31.2357 }, { lat: 41.0082, lng: 28.9784 }, { lat: -33.86, lng: 151.21 }]) {
      const near = (await go("GET", `/taxi/nearby?lat=${at.lat}&lng=${at.lng}`, undefined, token)).body as { items: { driver_key: string; lat: number; lng: number; heading: number | null }[] };
      expect(near.items).toHaveLength(TAXI_DEMO_DRIVERS.length);
      for (const taxi of near.items) {
        expect(Math.abs(taxi.lat - at.lat)).toBeLessThan(0.025);
        expect(Math.abs(taxi.lng - at.lng)).toBeLessThan(0.03);
        expect(taxi.heading).not.toBeNull();
      }
    }
    now = new Date(NOW.getTime() + 5000);
    const first = ((await go("GET", "/taxi/nearby?lat=30.0444&lng=31.2357", undefined, token)).body as { items: { driver_key: string; lat: number; lng: number }[] }).items;
    now = new Date(NOW.getTime() + 10_000);
    const later = ((await go("GET", "/taxi/nearby?lat=30.0444&lng=31.2357", undefined, token)).body as { items: { driver_key: string; lat: number; lng: number }[] }).items;
    const moved = first.filter((a) => later.some((b) => b.driver_key === a.driver_key && (b.lat !== a.lat || b.lng !== a.lng)));
    expect(moved.length).toBeGreaterThan(TAXI_DEMO_DRIVERS.length / 2);

    // The visitor's taxi is offered to the visitor as the test driver, never to the demo's drivers, and the test driver isn't on the map.
    const place = (address: string, lat: number, lng: number) => ({ address, details: null, lat, lng });
    const asked = await go("POST", "/rides", { pickup: place("Tahrir Square", 30.0444, 31.2357), dropoff: place("Cairo Tower", 30.0459, 31.2243), vehicle_type_id: (await store.listVehicleTypes(app.id))[0]!.id, payment: "cash" }, token);
    expect(asked.status).toBe(201);
    await go("PATCH", "/driver/me", { online: true }, token);
    await go("PUT", "/driver/location", { lat: 30.0444, lng: 31.2357 }, token);
    const offers = await go("GET", "/driver/offers", undefined, token);
    expect((offers.body as { items: { id: number }[] }).items.map((o) => o.id)).toEqual([(asked.body as { id: number }).id]);
    const near = (await go("GET", "/taxi/nearby?lat=30.0444&lng=31.2357", undefined, token)).body as { items: unknown[] };
    expect(near.items).toHaveLength(TAXI_DEMO_DRIVERS.length);
    expect((await store.listCouriers(app.id)).filter((c) => c.onDuty).map((c) => c.name)).toEqual(["App Review"]);
  });

  it("110.5 a live taxi app that isn't a demo shows only its drivers online now", async () => {
    const client = (await store.listClients({ filter: "all", now: NOW }))[0]!.client;
    const taxi: App = { ...newApp(client.id, null, NOW, "rides", "taxi"), backend: "hosted", connector: { kind: "rides" } };
    await store.createApp(taxi);
    await store.createCourier({ appId: taxi.id, name: "Off duty", phone: "+905321112233", email: null, vehicle: null, active: true, driver: { ...EMPTY_DRIVER } }, NOW);
    const connector = connectorFor(taxi, KEY, { store, assetUrl: (id) => id, platformUrl: "https://yallapp.test", rides: true })!;
    const result = await handleHosted({ ...context(taxi), connector }, { method: "GET", path: ["taxi", "nearby"], query: new URLSearchParams({ lat: "30.0444", lng: "31.2357" }), body: undefined, token: null });
    expect(result.body).toEqual({ items: [] });
  });

  it("110.5 Nakhla School: the visitor is Lina, her mother and her class teacher, and what the teacher gives reaches Lina", async () => {
    const { app, go, token, roles } = await studio("school");
    expect(roles).toEqual(["student", "parent", "teacher"]);
    const me = (await go("GET", "/school/me", undefined, token)).body as { name: string; students: { id: number; name: string; class_name: string }[] };
    expect(me.name).toBe("Rania Haddad");
    expect(me.students.map((s) => [s.name, s.class_name])).toEqual([
      ["Lina Haddad", "Grade 5 A"],
      ["Adam Haddad", "Grade 3 B"],
    ]);
    const [lina, adam] = me.students as unknown as [{ id: number }, { id: number }];
    const week = (await go("GET", `/school/students/${lina.id}/timetable`, undefined, token)).body as { days: { weekday: number; lessons: unknown[] }[] };
    expect(week.days.map((d) => [d.weekday, d.lessons.length])).toEqual([
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [7, 5],
    ]);
    const grades = (await go("GET", `/school/students/${adam.id}/grades`, undefined, token)).body as { subjects: unknown[] };
    expect(grades.subjects.length).toBeGreaterThan(0);
    const fees = (await go("GET", `/school/students/${adam.id}/fees`, undefined, token)).body as { items: { status: string }[] };
    expect(fees.items.map((f) => f.status).sort()).toEqual(["due", "paid"]);

    // As Ms. Mona: homework for Grade 5 A, which Lina sees at once.
    const classroom = (await go("GET", "/classroom/me", undefined, token)).body as { classes: { id: number; name: string }[] };
    const fiveA = classroom.classes.find((c) => c.name === "Grade 5 A")!;
    const maths = (await store.listSchoolSubjects(app.id)).find((x) => x.name === "Maths")!;
    const given = await go("POST", "/classroom/homework", { class_id: fiveA.id, subject_id: maths.id, title: "Angles worksheet", text: "Measure the five angles.", due_on: "2026-10-14" }, token);
    expect(given.status).toBe(201);
    const homework = (await go("GET", `/school/students/${lina.id}/homework`, undefined, token)).body as { items: { title: string }[] };
    expect(homework.items.map((h) => h.title)).toContain("Angles worksheet");

    // The next days: the visitor's homework goes after a day; the school day is made again from that day.
    const later = new Date(NOW.getTime() + 25 * HOUR);
    const report = await cleanDemoActivity(store, later);
    expect(report.deleted).toBeGreaterThanOrEqual(1);
    const left = await store.listSchoolHomework(app.id);
    expect(left.map((h) => h.title)).not.toContain("Angles worksheet");
    expect(left).toHaveLength(SCHOOL_HOMEWORK.length);
    expect(left.every((h) => h.createdAt.getTime() > NOW.getTime())).toBe(true);
    // Run again the same day, nothing more is made.
    expect((await cleanDemoActivity(store, new Date(later.getTime() + HOUR))).deleted).toBe(0);
    expect((await store.listSchoolHomework(app.id)).map((h) => h.id).sort()).toEqual(left.map((h) => h.id).sort());
  });

  it("110.5 Rawaq Academy: seven teachers for students, and the visitor's own Teacher tab, cleaned after a day", async () => {
    const { app, go, token, roles } = await studio("instructors");
    expect(roles).toEqual(["teacher"]);
    const list = (await go("GET", "/teachers", undefined, token)).body as { items: { name: string; courses: number }[] };
    expect(list.items.map((t) => t.name).sort()).toEqual(ACADEMY_TEACHERS.map((t) => t.name).sort());
    expect((await go("GET", "/teacher/me", undefined, token)).body).toMatchObject({ name: "Demo teacher" });
    const made = await go("POST", "/teacher/courses", { title: "My first course", description: "Made in the demo." }, token);
    expect(made.status).toBe(201);
    await go("PATCH", "/teacher/me", { name: "Someone else", bio: "Changed" }, token);

    expect(await cleanDemoActivity(store, new Date(NOW.getTime() + 2 * HOUR))).toMatchObject({ deleted: 0 });
    const report = await cleanDemoActivity(store, new Date(NOW.getTime() + 25 * HOUR));
    expect(report.deleted).toBeGreaterThanOrEqual(1);
    const saved = (await store.getAppById(app.id))!;
    expect(saved.courseSetup?.courses.map((c) => c.title)).not.toContain("My first course");
    expect(saved.courseSetup?.courses).toHaveLength(ACADEMY_COURSES.length);
    expect(await store.findTeacher(app.id, { phone: DEMO_SIGN_IN.e164, email: null })).toMatchObject({ name: "Demo teacher", bio: expect.stringContaining("This is you") });
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
    expect(report.demo.apps).toBe(16);
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
