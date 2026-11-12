import { describe, expect, it } from "vitest";
import { ENGINES } from "@/lib/app/kinds";
import { ownContentSetup } from "@/lib/app/own-content";
import { newApp } from "@/lib/app/setup";
import { bookingSetup } from "@/lib/bookings/setup";
import { courseSetup } from "@/lib/courses/setup";
import type { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { ALL_DEMO_TYPES, DEMO_SIGN_IN, demoKind, type DemoId } from "@/lib/demo/constants";
import { DEMO_ARTICLES, DEMO_CAMPAIGNS, DEMO_COURSES, DEMO_DELIVERY_SERVICES, DEMO_DISHES, DEMO_EVENTS, DEMO_LISTINGS, DEMO_PRODUCTS, DEMO_RESTAURANTS, DEMO_SERVICES, RIDES_DEMO_TYPES, TAXI_DEMO_TYPES } from "@/lib/demo/content";
import { DEMO_DESIGN_TYPES, demoDesignId, demoOfDesign } from "@/lib/demo/look";
import { MARKET_CATALOG, MARKET_VENDORS } from "@/lib/demo/marketplace";
import { SCHOOL_CLASSES, SCHOOL_STAFF, SCHOOL_SUBJECTS, SCHOOL_TEACHERS } from "@/lib/demo/school";
import { ACADEMY_COURSES, ACADEMY_TEACHERS } from "@/lib/demo/teachers";
import { demoSampleLists, seedDemoSamples } from "@/lib/samples/demo";
import { countList, sampleListsOf, sampleTotal } from "@/lib/samples/lists";
import { removeAllSamples } from "@/lib/samples/remove";
import { NOW, days, setupClient } from "./helpers";

/**
 * Templates = demos: an app started from a demo gets the demo's own entries
 * as samples, made by the demo's generators, without its sign-in number,
 * and removed in one click.
 */

async function world() {
  const setup = await setupClient({ plan: "pro", activeUntil: days(60) });
  const blobs = new Map<string, Buffer>();
  const deps = { store: setup.store, putBlob: async (key: string, data: Buffer) => void blobs.set(key, data), now: NOW };
  const removeDeps = { store: setup.store, deleteBlob: async (key: string) => void blobs.delete(key), now: NOW };
  return { ...setup, blobs, deps, removeDeps };
}

/** A hosted app of the demo's kind with its content kept in Yallapp, as a new app or Studio project gets it. */
async function appLike(store: MemoryStore, clientId: string, demo: DemoId, patch: Partial<App> = {}): Promise<App> {
  const kind = demoKind(demo);
  const base: App = { ...newApp(clientId, null, NOW, kind.engine, kind.vertical), backend: "hosted", siteUrl: null, appName: "Nour" };
  const app: App = { ...base, ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: NOW, ...patch };
  await store.createApp(app);
  return (await store.getAppById(app.id))!;
}

const names = (rows: readonly { name: string }[]) => rows.map((r) => r.name).sort();

describe("templates = demos: the demo's own sample entries", () => {
  it("gives every demo's lists the demo's entries, each marked, with none of the demo's sign-in", { timeout: 120_000 }, async () => {
    const { store, client, deps } = await world();
    for (const demo of ALL_DEMO_TYPES) {
      const app = await appLike(store, client.id, demo);
      const filled = await seedDemoSamples(deps, app.id, demo);
      const saved = (await store.getAppById(app.id))!;
      // Every list the demo brings is filled; every other list gets 110.2's samples.
      for (const list of demoSampleLists(demo)) expect(filled, `${demo} ${list}`).toContain(list);
      for (const list of sampleListsOf(saved)) {
        const { samples, own } = await countList(store, saved, list);
        expect(own, `${demo} ${list}`).toBe(0);
        if (filled.includes(list)) expect(samples, `${demo} ${list}`).toBeGreaterThan(0);
      }
      // Nobody signs in with the demo's number, and the demo's accounts and drivers stay with the demo.
      expect((await store.listHostedUsers({ appId: app.id, offset: 0, limit: 10 })).total, demo).toBe(0);
      expect(await store.getHostedUserByPhone(app.id, DEMO_SIGN_IN.e164), demo).toBeNull();
      expect(await store.listCouriers(app.id), demo).toEqual([]);
      for (const p of await store.listSchoolPeople(app.id)) expect(p.phone, `${demo} ${p.name}`).toBeNull();
      for (const t of await store.listTeachers(app.id)) expect([t.phone, t.userId], `${demo} ${t.name}`).toEqual([null, null]);
      // Seeding again adds nothing.
      expect(await seedDemoSamples(deps, app.id, demo), demo).toEqual([]);
    }
  });

  it("are the demo's: Zad's places and aisles, Nakhla School, Rawaq Academy, Sofra's restaurants and the rest", { timeout: 60_000 }, async () => {
    const { store, client, deps } = await world();
    const make = async (demo: DemoId) => {
      const app = await appLike(store, client.id, demo);
      await seedDemoSamples(deps, app.id, demo);
      return (await store.getAppById(app.id))!;
    };

    const zad = await make("marketplace");
    const vendors = await store.listRestaurants(zad.id);
    expect(names(vendors)).toEqual(names(MARKET_VENDORS));
    expect(vendors.every((v) => v.sample === true)).toBe(true);
    const market = vendors.find((v) => v.kind !== "restaurant")!;
    const products = await store.listMarketProducts({ appId: zad.id, vendorId: market.id, page: 1, perPage: 500 });
    expect(products.total).toBe(MARKET_CATALOG.flatMap((d) => d.aisles.flatMap((a) => a.products)).length);
    expect(names(await store.listMarketDepartments(zad.id, market.id))).toEqual(names(MARKET_CATALOG));
    // Zad's photos, as the app's own: every place's cover and every product's.
    expect(vendors.every((v) => v.coverAssetId !== null)).toBe(true);
    expect(products.items.every((p) => p.imageAssetId !== null)).toBe(true);
    // Their cuisines are added to the company's, as samples.
    expect((deliverySettingsOf(await store.getDeliverySettings(zad.id)).cuisines ?? []).every((c) => c.sample === true)).toBe(true);

    const nakhla = await make("school");
    expect(names(await store.listSchoolClasses(nakhla.id))).toEqual(names(SCHOOL_CLASSES));
    expect((await store.listSchoolSubjects(nakhla.id)).map((s) => s.name).sort()).toEqual([...SCHOOL_SUBJECTS].sort());
    const people = await store.listSchoolPeople(nakhla.id);
    expect(people.filter((p) => p.role === "teacher").map((p) => p.name).sort()).toEqual([...SCHOOL_TEACHERS].sort());
    expect(people.filter((p) => p.role === "staff").length).toBe(SCHOOL_STAFF.length);
    expect(people.filter((p) => p.role === "student").length).toBe(SCHOOL_CLASSES.flatMap((c) => c.students).length);
    expect((await store.listSchoolPeriods(nakhla.id)).length).toBeGreaterThan(0);
    expect((await countList(store, nakhla, "school")).samples).toBe(people.length);
    // Its news are the demo's, and none of its school day (homework, scores, fees) is made.
    expect((await store.listSchoolAnnouncements(nakhla.id)).length).toBeGreaterThan(0);
    expect(await store.listSchoolHomework(nakhla.id, {})).toEqual([]);

    const rawaq = await make("instructors");
    expect(names(await store.listTeachers(rawaq.id))).toEqual(names(ACADEMY_TEACHERS));
    const academy = courseSetup(rawaq);
    expect(academy.courses.map((c) => c.title)).toEqual(ACADEMY_COURSES.map((c) => c.title));
    expect(academy.courses.every((c) => c.sample === true && typeof c.teacherId === "number")).toBe(true);

    const sofra = await make("food");
    expect(names(await store.listRestaurants(sofra.id))).toEqual(names(DEMO_RESTAURANTS));

    const lists: [DemoId, (app: App) => Promise<string[]>, string[]][] = [
      ["store", async (a) => (await store.listCatalogProducts(a.id)).map((p) => p.name), DEMO_PRODUCTS.map((p) => p.name)],
      ["restaurant", async (a) => (await store.listCatalogProducts(a.id)).map((p) => p.name), DEMO_DISHES.map((p) => p.name)],
      ["lms", async (a) => courseSetup(a).courses.map((c) => c.title), DEMO_COURSES.map((c) => c.title)],
      ["booking", async (a) => bookingSetup(a).services.map((s) => s.name), DEMO_SERVICES.map((s) => s.name)],
      ["real_estate", async (a) => (await store.listListings(a.id)).map((l) => l.title), DEMO_LISTINGS.map((l) => l.title)],
      ["news", async (a) => (await store.listArticles(a.id)).map((x) => x.title), DEMO_ARTICLES.map((x) => x.title)],
      ["events", async (a) => (await store.listEvents(a.id)).map((e) => e.title), DEMO_EVENTS.map((e) => e.title)],
      ["donations", async (a) => (await store.listCampaigns(a.id)).map((c) => c.title), DEMO_CAMPAIGNS.map((c) => c.title)],
      ["delivery", async (a) => (await store.listDeliveryServices(a.id)).map((s) => s.name), DEMO_DELIVERY_SERVICES.map((s) => s.name)],
      ["rides", async (a) => (await store.listVehicleTypes(a.id)).map((t) => t.name), RIDES_DEMO_TYPES.map((t) => t.name)],
      ["taxi", async (a) => (await store.listVehicleTypes(a.id)).map((t) => t.name), TAXI_DEMO_TYPES.map((t) => t.name)],
    ];
    for (const [demo, read, expected] of lists) expect((await read(await make(demo))).sort(), demo).toEqual([...expected].sort());
  });

  it("prices them in the app's currency and leaves the owner's entries and settings alone", async () => {
    const { store, client, deps } = await world();
    // Zad's prices are in Egyptian pounds; this company sells in lira.
    const zad = await appLike(store, client.id, "marketplace");
    const settings = deliverySettingsOf(await store.getDeliverySettings(zad.id));
    await store.saveDeliverySettings(zad.id, { ...settings, currency: "TRY" }, NOW);
    await seedDemoSamples(deps, zad.id, "marketplace");
    const grill = (await store.listRestaurants(zad.id)).find((r) => r.name === MARKET_VENDORS[0]!.name)!;
    expect(grill.minOrderCents).not.toBe(MARKET_VENDORS[0]!.minOrder);
    expect(deliverySettingsOf(await store.getDeliverySettings(zad.id)).currency).toBe("TRY");

    // A shop with a product of its own keeps its list as it is.
    const shop = await appLike(store, client.id, "store");
    await store.createCatalogProduct({ appId: shop.id, name: "Our own", description: "", priceCents: 1000, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null, optionGroups: null }, NOW);
    expect(await seedDemoSamples(deps, shop.id, "store")).not.toContain("products");
    expect((await store.listCatalogProducts(shop.id)).map((p) => p.name)).toEqual(["Our own"]);
  });

  it("are removed all at once, with their pictures, the sample school and Zad Market's aisles", { timeout: 60_000 }, async () => {
    const { store, client, deps, removeDeps } = await world();
    for (const demo of ["marketplace", "school", "instructors", "fitness", "store"] as const) {
      const app = await appLike(store, client.id, demo);
      await seedDemoSamples(deps, app.id, demo);
      expect(await sampleTotal(store, (await store.getAppById(app.id))!), demo).toBeGreaterThan(0);
      expect(await removeAllSamples(removeDeps, app.id), demo).toBeGreaterThan(0);
      const saved = (await store.getAppById(app.id))!;
      expect(await sampleTotal(store, saved), demo).toBe(0);
      expect(await store.listRestaurants(app.id), demo).toEqual([]);
      expect(await store.listSchoolClasses(app.id), demo).toEqual([]);
      expect(await store.listSchoolSubjects(app.id), demo).toEqual([]);
      expect(await store.listSchoolPeople(app.id), demo).toEqual([]);
      expect(await store.listTeachers(app.id), demo).toEqual([]);
      expect(courseSetup(saved).courses, demo).toEqual([]);
      expect(bookingSetup(saved).services, demo).toEqual([]);
      expect(bookingSetup(saved).classTemplates ?? [], demo).toEqual([]);
      expect(await store.listCatalogProducts(app.id), demo).toEqual([]);
      expect((await store.getSchoolSettings(app.id))?.sampleSchool, demo).toBeUndefined();
    }
    // None of the samples' pictures are left.
    expect(await store.listAssetsByClient(client.id)).toEqual([]);
  });

  it("keeps a sample class the owner put their own student in", async () => {
    const { store, client, deps, removeDeps } = await world();
    const app = await appLike(store, client.id, "school");
    await seedDemoSamples(deps, app.id, "school");
    const klass = (await store.listSchoolClasses(app.id)).find((c) => c.name === SCHOOL_CLASSES[0]!.name)!;
    const own = await store.createSchoolPerson({ appId: app.id, role: "student", name: "Our own student", phone: null, email: null, classId: klass.id, code: null, photoAssetId: null, active: true, jobTitle: null, department: null }, NOW);
    expect(own.ok).toBe(true);
    await removeAllSamples(removeDeps, app.id);
    expect((await store.listSchoolClasses(app.id)).map((c) => c.name)).toEqual([klass.name]);
    expect((await store.listSchoolPeople(app.id)).map((p) => p.name)).toEqual(["Our own student"]);
  });

  it("knows a demo's design by its ID", () => {
    for (const demo of DEMO_DESIGN_TYPES) expect(demoOfDesign(demoDesignId(demo))).toBe(demo);
    expect(demoOfDesign("store-fashion")).toBeNull();
    // 123 The premium academy's design is its Studio template, no design of pages.
    expect(demoOfDesign("demo-premium_academy")).toBeNull();
    expect(demoOfDesign(null)).toBeNull();
  });
});
