import { describe, expect, it, vi } from "vitest";
import { ENGINES, KINDS, type KindInfo } from "@/lib/app/kinds";
import { ownContentSetup } from "@/lib/app/own-content";
import { newApp, queueBuild } from "@/lib/app/setup";
import { courseSetup } from "@/lib/courses/setup";
import { withCourse } from "@/lib/courses/edit";
import type { MemoryStore } from "@/lib/data/memory";
import type { App, CatalogCurrency } from "@/lib/data/types";
import { connectorFor } from "@/lib/hosted/connectors";
import { handleHosted } from "@/lib/hosted/service";
import { designsFor, applyDesign } from "@/lib/pages/designs";
import { previewConfigResult } from "@/lib/preview/service";
import { createPreviewToken } from "@/lib/preview/token";
import * as CONTENT from "@/lib/samples/content";
import { SAMPLE_MENU, SAMPLE_PRODUCTS, sampleLang, type Tri } from "@/lib/samples/content";
import { askAfterOwnEntry, canHaveSamples, countList, listsForSources, sampleListsOf, sampleTotal, samplesBlockedMessage, sourcesIn, type SampleList } from "@/lib/samples/lists";
import { roundPrice, samplePrice } from "@/lib/samples/money";
import { removeSamples } from "@/lib/samples/remove";
import { appMainLanguage, seedSamples } from "@/lib/samples/seed";
import { expectContract } from "./contract";
import { days, KEY, licenseOf, NOW, setupClient } from "./helpers";

const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;

async function world() {
  const setup = await setupClient({ plan: "pro", activeUntil: days(60) });
  const blobs = new Map<string, Buffer>();
  const deps = { store: setup.store, putBlob: async (key: string, data: Buffer) => void blobs.set(key, data), now: NOW };
  const removeDeps = { store: setup.store, deleteBlob: async (key: string) => void blobs.delete(key), now: NOW };
  return { ...setup, blobs, deps, removeDeps };
}

/** A hosted app of this kind with its content kept in Yallapp, as the Website step's "I don't have a website" makes it. */
async function hostedApp(store: MemoryStore, clientId: string, kind: Pick<KindInfo, "engine" | "vertical">, patch: Partial<App> = {}): Promise<App> {
  const base: App = { ...newApp(clientId, null, NOW, kind.engine, kind.vertical), backend: "hosted", siteUrl: null, appName: "Nour" };
  const app: App = { ...base, ...ownContentSetup(ENGINES[kind.engine].ownContent.kind, base), websiteDoneAt: NOW, ...patch };
  await store.createApp(app);
  return app;
}

const kindOf = (id: string) => KINDS.find((k) => k.id === id)!;

/** How many sample entries each list gets. */
const EXPECTED: Record<SampleList, [number, number]> = {
  teachers: [4, 4],
  courses: [8, 8],
  products: [8, 8],
  services: [6, 7],
  staff: [3, 3],
  listings: [7, 7],
  articles: [8, 8],
  events: [6, 6],
  campaigns: [6, 6],
  // Settings the company needs anyway: three each (lib/samples/content.ts).
  delivery_services: [3, 3],
  restaurants: [6, 6],
  vehicle_types: [3, 3],
  school_news: [6, 6],
};

/** Every text of the sample content, by where it is. */
function tris(value: unknown, at = "", found: [string, Tri][] = []): [string, Tri][] {
  if (Array.isArray(value)) value.forEach((v, i) => tris(v, `${at}[${i}]`, found));
  else if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 3 && keys.includes("en") && keys.includes("ar") && keys.includes("tr") && typeof (value as Tri).en === "string") found.push([at, value as Tri]);
    else for (const [k, v] of Object.entries(value)) tris(v, `${at}.${k}`, found);
  }
  return found;
}

describe("110.2 sample content", () => {
  it("has every visible text in English, Modern Standard Arabic and Turkish", () => {
    const all = tris(CONTENT);
    expect(all.length).toBeGreaterThan(300);
    for (const [at, text] of all) {
      expect(text.en.trim(), at).not.toBe("");
      expect(text.ar, at).toMatch(/[؀-ۿ]/);
      expect(text.tr.trim(), at).not.toBe("");
      expect(text.tr, at).not.toMatch(/[؀-ۿ]/);
    }
    // Most Turkish texts are written in Turkish, not left in English (names and brands may stay).
    const same = all.filter(([, t]) => t.tr === t.en).length;
    expect(same / all.length).toBeLessThan(0.2);
    // No real businesses' or Yallapp's words: none of the samples speaks of AI.
    expect(JSON.stringify(CONTENT)).not.toMatch(/\bAI\b|artificial intelligence|ذكاء اصطناعي|yapay zek/i);
  });

  it("comes in the app's main language, English for any other", () => {
    expect(sampleLang("ar")).toBe("ar");
    expect(sampleLang("tr")).toBe("tr");
    expect(sampleLang("fr")).toBe("en");
    expect(sampleLang(null)).toBe("en");
  });

  it("moves prices to the app's currency, rounded as a price list would be", () => {
    expect(samplePrice(1450_00, "TRY", "TRY")).toBe(1450_00);
    expect(samplePrice(0, "TRY", "USD")).toBe(0);
    // ₺1,450 is about $61; koshary for E£55 about $3.50; a coffee is never free.
    expect(samplePrice(1450_00, "TRY", "USD")).toBe(61_00);
    expect(samplePrice(55_00, "EGP", "USD")).toBe(3_50);
    expect(samplePrice(1_00, "EGP", "USD")).toBeGreaterThan(0);
    for (const to of ["USD", "EUR", "EGP", "SAR", "AED", "TRY"] as CatalogCurrency[]) {
      const price = samplePrice(1450_00, "TRY", to) / 100;
      expect(price, to).toBeGreaterThan(0);
      if (price >= 100) expect(price % 5, to).toBe(0);
    }
    expect(roundPrice(0.42)).toBe(0.4);
    expect(roundPrice(12.3)).toBe(12.5);
    expect(roundPrice(1234)).toBe(1230);
    expect(roundPrice(14_512_345)).toBe(14_500_000);
  });
});

describe("110.2 seeding sample entries", () => {
  it("fills every list of every kind of app whose content is kept in Yallapp, each entry marked", { timeout: 60_000 }, async () => {
    const { store, client, deps } = await world();
    const seen = new Set<SampleList>();
    for (const kind of KINDS) {
      const app = await hostedApp(store, client.id, kind);
      const lists = await seedSamples(deps, app.id);
      expect(lists, kind.id).toEqual(sampleListsOf(app));
      expect(lists.length, kind.id).toBeGreaterThan(0);
      const saved = (await store.getAppById(app.id))!;
      for (const list of lists) {
        seen.add(list);
        const { samples, own } = await countList(store, saved, list);
        const [min, max] = EXPECTED[list];
        expect(samples, `${kind.id} ${list}`).toBeGreaterThanOrEqual(min);
        expect(samples, `${kind.id} ${list}`).toBeLessThanOrEqual(max);
        expect(own, `${kind.id} ${list}`).toBe(0);
      }
      // Seeding again adds nothing: the lists aren't empty any more.
      expect(await seedSamples(deps, app.id), kind.id).toEqual([]);
    }
    // Every list a design shows has samples.
    expect([...seen].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("gives entries pictures, prices and three or four categories", async () => {
    const { store, client, deps } = await world();
    const shop = await hostedApp(store, client.id, kindOf("store"));
    await seedSamples(deps, shop.id);
    const products = await store.listCatalogProducts(shop.id);
    const categories = await store.listCatalogCategories(shop.id);
    expect(categories.map((c) => c.name)).toEqual(["Flowers", "Gift boxes", "Sweets", "Home"]);
    expect(categories.every((c) => c.sample)).toBe(true);
    for (const p of products) {
      expect(p.sample).toBe(true);
      expect(p.priceCents).toBeGreaterThan(0);
      expect(p.categoryIds).toHaveLength(1);
      expect(await store.getAsset(p.imageAssetIds[0]!)).toMatchObject({ clientId: client.id, contentType: "image/png" });
    }
    // In the order the samples have them, newest first.
    expect(products.map((p) => p.name)).toEqual(SAMPLE_PRODUCTS.products.map((p) => p.name.en));

    const academy = await hostedApp(store, client.id, kindOf("academy"));
    await seedSamples(deps, academy.id);
    const setup = courseSetup((await store.getAppById(academy.id))!);
    expect(setup.categories.map((c) => c.name)).toEqual(["Design", "Business", "Languages", "Technology"]);
    expect(setup.courses.every((c) => c.sample && c.imageAssetId && c.topics.length > 0)).toBe(true);
    expect(setup.courses.filter((c) => c.priceCents === 0)).toHaveLength(1);
  });

  it("writes them in the app's main language, with its currency", async () => {
    const { store, client, deps } = await world();
    for (const [lang, currency] of [["ar", "EGP"], ["tr", "TRY"], ["en", "USD"]] as const) {
      const cafe = await hostedApp(store, client.id, kindOf("restaurant"), { catalogSettings: { currency, shippingCents: 0, freeShippingOverCents: null, payment: null } });
      const draft = { ...applyDesign(designsFor(cafe)[0]!, { appName: "Nour", facts: { website: null, email: null, whatsapp: null }, current: { appearance: {} as never, languages: { default: lang, available: [lang] } }, now: NOW }) };
      await store.saveAppLayout({ appId: cafe.id, draft, draftUpdatedAt: NOW, published: null, publishedAt: null, publishedBy: null, publishCount: 0 });
      expect(await appMainLanguage(store, cafe)).toBe(lang);
      expect(await seedSamples(deps, cafe.id)).toEqual(["products"]);
      const dishes = await store.listCatalogProducts(cafe.id);
      expect(dishes.map((d) => d.name), lang).toEqual(SAMPLE_MENU.products.map((p) => p.name[lang]));
      expect((await store.listCatalogCategories(cafe.id)).map((c) => c.name)).toEqual(Object.values(SAMPLE_MENU.categories).map((c) => c[lang]));
      const breakfast = dishes[0]!;
      expect(breakfast.priceCents).toBe(samplePrice(SAMPLE_MENU.products[0]!.priceCents, "TRY", currency));
      expect(breakfast.optionGroups![0]!.name).toBe(SAMPLE_MENU.products[0]!.optionGroups![0]!.name[lang]);
    }
    // An academy in Arabic: its courses, categories, levels and lessons are Arabic too.
    const academy = await hostedApp(store, client.id, kindOf("instructors"));
    await seedSamples(deps, academy.id, { lang: "ar" });
    const setup = courseSetup((await store.getAppById(academy.id))!);
    expect(setup.courses.every((c) => /[؀-ۿ]/.test(c.title + c.description + c.level + c.topics[0]!.title))).toBe(true);
    // 105.3 With many teachers: the samples' teachers, whose courses are theirs, and nobody signs in as them.
    const teachers = await store.listTeachers(academy.id);
    expect(teachers).toHaveLength(4);
    expect(teachers.every((t) => t.sample && t.phone === null && t.email === null && /[؀-ۿ]/.test(t.name))).toBe(true);
    expect(setup.courses.filter((c) => c.teacherId).length).toBeGreaterThanOrEqual(4);
  });

  it("fills only the lists the design shows", async () => {
    const { store, client, deps } = await world();
    const shop = await hostedApp(store, client.id, kindOf("store"));
    const design = designsFor(shop)[0]!;
    expect([...sourcesIn(design.pages)]).toContain("products");
    expect(listsForSources(shop, ["events"])).toEqual([]);
    expect(await seedSamples(deps, shop.id, { sources: ["events"] })).toEqual([]);
    expect(await seedSamples(deps, shop.id, { sources: sourcesIn(design.pages) })).toEqual(["products"]);
    // A salon's services come with its team.
    const salon = await hostedApp(store, client.id, kindOf("bookings"));
    expect(listsForSources(salon, ["services"])).toEqual(["services", "staff"]);
    // Studio's Studio pages name their lists too.
    expect([...sourcesIn([{ slug: "home", blocks: [], studio: { body: { id: "b", type: "box", children: [{ id: "i", type: "items", source: "restaurants" }] } } }])]).toEqual(["restaurants"]);
  });

  it("never fills a list that has the owner's entries", async () => {
    const { store, client, deps } = await world();
    const shop = await hostedApp(store, client.id, kindOf("store"));
    await store.createCatalogProduct({ appId: shop.id, name: "My mug", description: "", priceCents: 100_00, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null }, NOW);
    expect(await seedSamples(deps, shop.id)).toEqual([]);
    expect(await store.listCatalogProducts(shop.id)).toHaveLength(1);
    expect(await store.listCatalogCategories(shop.id)).toHaveLength(0);
    // A salon with its own services gets no sample team either.
    const salon = await hostedApp(store, client.id, kindOf("bookings"), { bookingSetup: { ...courseFreeBooking(), services: [{ id: 1, categoryId: null, name: "Cut", description: "", durationMinutes: 30, priceCents: 100_00, imageAssetId: null, color: null, active: true }], nextId: 2 } });
    expect(await seedSamples(deps, salon.id)).toEqual([]);
  });

  it("never fills the lists of apps whose content comes from a website or a platform, nor the demo apps", async () => {
    const { store, client, deps } = await world();
    const apps: App[] = [
      { ...newApp(client.id, "https://shop.test", NOW, "store"), backend: "wordpress", connector: null },
      { ...newApp(client.id, null, NOW, "store"), backend: "hosted", connector: { kind: "shopify", shopDomain: "x.myshopify.com", tokenEncrypted: "v1.x", storefrontTokenEncrypted: null } as never },
      { ...newApp(client.id, null, NOW, "lms"), backend: "hosted", connector: { kind: "platform", platform: "teachable" } as never },
      { ...newApp(client.id, null, NOW, "store"), backend: "custom_api" as never, connector: { kind: "catalog" } },
    ];
    for (const app of apps) {
      await store.createApp(app);
      expect(canHaveSamples(app), app.backend).toBe(false);
      expect(await seedSamples(deps, app.id)).toEqual([]);
      expect(await store.listCatalogProducts(app.id)).toHaveLength(0);
    }
    const demo = await hostedApp(store, client.id, kindOf("store"), { demo: true });
    expect(await seedSamples(deps, demo.id)).toEqual([]);
  });
});

function courseFreeBooking() {
  return { rules: { timezone: "Europe/Istanbul", currency: "TRY" as const, maxDaysAhead: 30, minMinutesAhead: 60, cancelBeforeMinutes: 60, slotStepMinutes: 30, notes: true, autoApprove: true }, categories: [], services: [], staff: [], nextId: 1 };
}

describe("110.2 sample entries become the owner's", () => {
  it("a course changed in any way loses its mark", async () => {
    const { store, client, deps } = await world();
    const academy = await hostedApp(store, client.id, kindOf("academy"));
    await seedSamples(deps, academy.id);
    const setup = courseSetup((await store.getAppById(academy.id))!);
    const first = setup.courses[0]!;
    const next = withCourse(setup, first.id, (c) => ({ ...c, title: "My own course" }));
    expect(next.courses[0]).not.toHaveProperty("sample");
    expect(next.courses.slice(1).every((c) => c.sample)).toBe(true);
  });

  it("the first own entry next to samples asks whether to remove them, once", async () => {
    const { store, client, deps } = await world();
    const shop = await hostedApp(store, client.id, kindOf("store"));
    await seedSamples(deps, shop.id);
    const add = (name: string) => store.createCatalogProduct({ appId: shop.id, name, description: "", priceCents: 100_00, salePriceCents: null, categoryIds: [], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null }, NOW);
    await add("My mug");
    expect(await askAfterOwnEntry(store, shop.id, "products")).toBe("/dashboard/catalog?samples=products");
    await add("My cup");
    expect(await askAfterOwnEntry(store, shop.id, "products")).toBeNull();
  });
});

describe("110.2 removing all samples", () => {
  it("deletes a list's samples, the sample categories left empty and the pictures only they used", async () => {
    const { store, client, deps, removeDeps, blobs } = await world();
    const shop = await hostedApp(store, client.id, kindOf("store"));
    await seedSamples(deps, shop.id);
    const products = await store.listCatalogProducts(shop.id);
    // The owner made the first sample theirs, in its category, with its picture.
    const kept = products[0]!;
    await store.updateCatalogProduct(shop.id, kept.id, { name: "Our roses", sample: false }, NOW);
    const assets = products.map((p) => p.imageAssetIds[0]!);
    expect(blobs.size).toBe(new Set(assets).size);

    expect(await removeSamples(removeDeps, shop.id, "products")).toBe(products.length - 1);
    expect((await store.listCatalogProducts(shop.id)).map((p) => p.name)).toEqual(["Our roses"]);
    expect((await store.listCatalogCategories(shop.id)).map((c) => c.name)).toEqual(["Flowers"]);
    expect(await store.getAsset(kept.imageAssetIds[0]!)).not.toBeNull();
    for (const id of assets.slice(1)) expect(await store.getAsset(id)).toBeNull();
    expect(blobs.size).toBe(1);
    expect(await sampleTotal(store, (await store.getAppById(shop.id))!)).toBe(0);
  });

  it("works for every list, leaving the owner's entries", { timeout: 60_000 }, async () => {
    const { store, client, deps, removeDeps } = await world();
    for (const kind of KINDS) {
      const app = await hostedApp(store, client.id, kind);
      const lists = await seedSamples(deps, app.id);
      for (const list of lists) {
        const before = await countList(store, (await store.getAppById(app.id))!, list);
        expect(await removeSamples(removeDeps, app.id, list), `${kind.id} ${list}`).toBe(before.samples);
        expect(await countList(store, (await store.getAppById(app.id))!, list), `${kind.id} ${list}`).toEqual({ samples: 0, own: 0 });
      }
    }
    // Only the account's own files are left: none of the samples' pictures.
    expect(await store.listAssetsByClient(client.id)).toEqual([]);
  });

  it("takes the sample restaurants' cuisines and the courses' sample teachers away with them", async () => {
    const { store, client, deps, removeDeps } = await world();
    const food = await hostedApp(store, client.id, kindOf("food"));
    await seedSamples(deps, food.id);
    expect((await store.getDeliverySettings(food.id))!.cuisines!.every((c) => c.sample)).toBe(true);
    await removeSamples(removeDeps, food.id, "restaurants");
    expect((await store.getDeliverySettings(food.id))!.cuisines).toEqual([]);

    const academy = await hostedApp(store, client.id, kindOf("instructors"));
    await seedSamples(deps, academy.id);
    // The owner keeps one course, whose teacher is a sample.
    const setup = courseSetup((await store.getAppById(academy.id))!);
    const theirs = setup.courses.find((c) => c.teacherId)!;
    await store.updateApp(academy.id, { courseSetup: withCourse(setup, theirs.id, (c) => c) }, NOW);
    await removeSamples(removeDeps, academy.id, "teachers");
    await removeSamples(removeDeps, academy.id, "courses");
    const left = courseSetup((await store.getAppById(academy.id))!);
    expect(left.courses.map((c) => [c.title, c.teacherId])).toEqual([[theirs.title, null]]);
    expect(left.categories.map((c) => c.id)).toEqual(theirs.categoryIds);
  });
});

describe("110.2 the stores' guard", () => {
  async function readyShop() {
    const w = await world();
    const app = await hostedApp(w.store, w.client.id, kindOf("store"), {
      appName: "Nour",
      shortName: "Nour",
      iconAssetId: "7f1d2c4e-1111-4222-8333-944455556666",
      brandingDoneAt: NOW,
      androidPackage: "com.nour.app",
      iosBundleId: "com.nour.app",
      storeTitle: "Nour",
      shortDescription: "Flowers and gifts on your phone.",
      fullDescription: "Nour brings our flowers, gift boxes and sweets to your phone, with delivery the same day.",
      supportEmail: "help@nour.test",
      privacyUrl: "https://nour.test/privacy",
      listingDoneAt: NOW,
      publishingDoneAt: NOW,
      appTypeDoneAt: NOW,
      publishingMode: "managed",
    });
    const client = (await w.store.getClientById(w.client.id))!;
    const license = await w.store.getLicenseForApp(client.id, app.id) ?? (await licenseOf(w.store, client.id));
    return { ...w, app, client, license };
  }

  it("blocks every build for the stores while samples are left, and allows it once they're gone", async () => {
    // The hosted API's address, as in production.
    vi.stubEnv("APP_URL", "https://yallapp.test");
    const { store, app, client, license, deps, removeDeps } = await readyShop();
    await seedSamples(deps, app.id);
    const withSamples = (await store.getAppById(app.id))!;
    for (const variant of ["app", "courier"] as const) {
      const refused = await queueBuild(store, { client, app: withSamples, license, versionName: "1.0.0", variant }, NOW, assetUrl);
      expect(refused).toEqual({ ok: false, reason: "samples", samples: 8 });
    }
    expect(samplesBlockedMessage(8)).toBe("Sample entries left: 8. Remove them, or edit them to make them yours, before your app goes to the stores.");
    await removeSamples(removeDeps, app.id, "products");
    const queued = await queueBuild(store, { client, app: (await store.getAppById(app.id))!, license, versionName: "1.0.0" }, NOW, assetUrl);
    expect(queued.ok).toBe(true);
    vi.unstubAllEnvs();
  });

  it("leaves the preview and the hosted API serving the samples as content, without a sample field", async () => {
    const { store, app, deps } = await readyShop();
    await seedSamples(deps, app.id);
    const saved = (await store.getAppById(app.id))!;
    const token = createPreviewToken({ appId: app.id, draft: true }, "preview-test-key", NOW);
    expect((await previewConfigResult(store, token, NOW, { key: "preview-test-key", platformUrl: "https://yallapp.test", assetUrl })).status).toBe(200);
    const connector = connectorFor(saved, KEY, { store, assetUrl, platformUrl: "https://yallapp.test" })!;
    const ctx = { store, app: saved, active: true, now: NOW, ip: "203.0.113.9", secret: "test-hosted-secret", sender: null, push: false, assetUrl, platformUrl: "https://yallapp.test", connector };
    const result = await handleHosted(ctx as never, { method: "GET", path: ["store", "products"], query: new URLSearchParams(), body: null, token: null });
    expectContract("GET", "/store/products", result);
    const body = JSON.stringify(result.body);
    expect(body).toContain(SAMPLE_PRODUCTS.products[0]!.name.en);
    expect(body).not.toMatch(/"sample"/);
  });
});
