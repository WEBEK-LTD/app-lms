import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { demoIdOf, demoKind, DEMO_SLUGS, isStoreTemplateDemo, MOBILES_DEMO, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { MOBILES_ACCESSORIES, MOBILES_CATEGORIES, MOBILES_COUPON, MOBILES_CURRENCY, MOBILES_FLASH_SALE, MOBILES_PRODUCTS, MOBILES_TRADE_IN, mobilesMainOf, mobilesVariants } from "@/lib/demo/mobiles";
import { mobilesPartsForSamples } from "@/lib/demo/mobiles-entries";
import { isShopPhoto, MOBILES_PHOTO_NAMES } from "@/lib/demo/shop-photos";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { mediaAddress, parseStudioPage } from "@/lib/pages/validate";
import { isSpecKey, specValue } from "@/lib/selling/specs";
import { techOf, tradeInEstimate } from "@/lib/selling/tech";
import { appWords, APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { MENU_PAGE } from "@/lib/studio/demo-designs/clothes-signature";
import { COMPARE_PAGE, MOBILES_SECTIONS, TRADE_PAGE } from "@/lib/studio/demo-designs/mobiles-signature";
import { showsInstallmentsSoon } from "@/lib/studio/installments";
import { SECTIONS, TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { shopTypeById, shopTypeOfDesign, shopTypeReady, shopTypeTemplate } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { appUrl } from "@/lib/env";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { KEY, NOW } from "./helpers";

/**
 * 211 Studio's mobiles type, Nova (نوفا): the type ready, its demo (a phone
 * shop in Cairo: new phones in storages and colours with a price for each,
 * a local or an international warranty, certified used devices with their
 * grade and battery health, specs keyed in the app's languages, trade-in and
 * matching accessories), its photos and its two looks A (NOVA) and B
 * (emerald), made of the tech elements (trade-in, compare, by storage).
 */

const ROOT = join(__dirname, "../..");

function deps(store: MemoryStore): DemoSetupDeps {
  return {
    store,
    encryptionKey: KEY,
    putBlob: async () => undefined,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
    actorEmail: "admin@yallapp.test",
    now: NOW,
  };
}

describe("211 the mobiles type", () => {
  it("is ready, its looks a store's templates, its notice the warranty's, installments only coming soon", () => {
    const t = shopTypeById("mobiles")!;
    expect(shopTypeReady(t)).toBe(true);
    expect(t.demo).toBe(MOBILES_DEMO);
    expect(t.liability).toBe("warranty");
    expect(showsInstallmentsSoon("mobiles")).toBe(true);
    // 226 Its main template is its look C, the keynote.
    expect(shopTypeTemplate(t)).toBe("mobiles_signature_c");
    expect(shopTypeTemplate(t, "a")).toBe("mobiles_signature_a");
    expect(shopTypeTemplate(t, "b")).toBe("mobiles_signature_b");
    expect(shopTypeOfDesign("mobiles_signature_b")?.id).toBe("mobiles");
    expect(TEMPLATES.filter((x) => x.demo === MOBILES_DEMO).map((x) => x.id)).toEqual(["mobiles_signature_c", "mobiles_signature_d", "mobiles_signature_a", "mobiles_signature_b"]);
  });
});

describe("211 Nova, the mobiles shop's demo", () => {
  it("is a Studio demo of the store kind, told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(MOBILES_DEMO);
    expect(isStoreTemplateDemo(MOBILES_DEMO)).toBe(true);
    expect(demoKind(MOBILES_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.mobiles).toBe("mobiles");
    expect(demoIdOf({ appType: "store", vertical: null, design: "mobiles_signature_a" })).toBe(MOBILES_DEMO);
    expect(DEMO_BRANDS.mobiles.appName).toBe("Nova");
    expect(DEMO_GUIDES.mobiles.screens).toEqual(["nova-home", "nova-menu", "nova-product"]);
  });

  it("has its photos (CC0, credited) where the looks and its products take them", () => {
    const credits = JSON.parse(readFileSync(join(ROOT, "public/mobiles-photos/CREDITS.json"), "utf8")) as { file: string; license: string; page: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(MOBILES_PHOTO_NAMES.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(c.page).toMatch(/^https:\/\/stocksnap\.io\/photo\//);
      expect(existsSync(join(ROOT, "public/mobiles-photos", c.file)), c.file).toBe(true);
    }
    for (const p of MOBILES_PRODUCTS) for (const photo of p.photos) expect(isShopPhoto(`mb-${photo}`), photo).toBe(true);
    expect(mediaAddress(`${appUrl()}/mobiles-photos/phone-cam.jpg`)).toBe(`${appUrl()}/mobiles-photos/phone-cam.jpg`);
  });

  it("names its categories in three languages, every device in one of their sub-categories, with fictional brands", () => {
    expect(MOBILES_CATEGORIES.map((c) => c.name)).toContain(MOBILES_ACCESSORIES);
    for (const c of MOBILES_CATEGORIES) {
      expect(c.names.ar && c.names.tr).toBeTruthy();
      expect(c.subs.length).toBeGreaterThan(0);
      for (const s of c.subs) {
        expect(s.names.ar && s.names.tr).toBeTruthy();
        expect(s.name).not.toBe(c.name);
      }
    }
    for (const p of MOBILES_PRODUCTS) expect(mobilesMainOf(p.sub).subs.some((s) => s.name === p.sub)).toBe(true);
    expect(new Set(MOBILES_PRODUCTS.map((p) => p.sku)).size).toBe(MOBILES_PRODUCTS.length);
    expect(MOBILES_PRODUCTS.length).toBeGreaterThanOrEqual(28);
    // No real brand's name.
    const names = MOBILES_PRODUCTS.map((p) => `${p.name} ${p.description}`).join(" ");
    expect(names).not.toMatch(/\b(iphone|apple|samsung|galaxy|pixel|google|xiaomi|huawei|oppo|airpods|ipad)\b/i);
  });

  it("sells new phones by storage and colour, each storage its own price, some with a local or international warranty", () => {
    const pro = MOBILES_PRODUCTS.find((p) => p.sku === "MB-101")!;
    const v = mobilesVariants(pro, 0)!;
    expect(v.attributes.map((a) => a.name)).toEqual(["Storage", "Colour", "Warranty"]);
    expect(v.attributes[0]!.values).toEqual(["256 GB", "512 GB", "1 TB"]);
    expect(v.attributes[2]!.values).toEqual(["Local", "International"]);
    expect(v.items).toHaveLength(3 * 4 * 2);
    const price = (values: string[]) => v.items.find((i) => i.values.join("|") === values.join("|"))!.priceCents ?? pro.priceCents;
    expect(price(["256 GB", "Titanium", "Local"])).toBe(54_999_00);
    expect(price(["512 GB", "Titanium", "Local"])).toBe(61_999_00);
    expect(price(["512 GB", "Titanium", "International"])).toBe(61_999_00 - 2_500_00);
    expect(v.items.some((i) => i.stock === 0)).toBe(true);
    // One storage in one colour: nothing to choose.
    expect(mobilesVariants(MOBILES_PRODUCTS.find((p) => p.sku === "MB-601")!, 0)).toBeNull();
  });

  it("gives every device its specs, keyed where Yallapp knows them, and every used one its grade and battery health", () => {
    for (const p of MOBILES_PRODUCTS) {
      expect(p.specs.length, p.sku).toBeGreaterThan(1);
      for (const s of p.specs) if (s.key) expect(isSpecKey(s.key)).toBe(true);
    }
    const phone = MOBILES_PRODUCTS.find((p) => p.sku === "MB-102")!;
    for (const key of ["screen", "cpu", "ram", "storage", "camera", "front_camera", "battery", "charging", "os", "refresh", "water", "weight", "warranty"] as const) expect(specValue(phone.specs, key), key).toBeTruthy();
    const used = MOBILES_PRODUCTS.filter((p) => p.sub.startsWith("Used "));
    expect(used.length).toBeGreaterThanOrEqual(4);
    for (const p of used) {
      expect(specValue(p.specs, "condition")).toBe("Certified used");
      expect(specValue(p.specs, "grade")).toMatch(/^(A\+|A|B) · /);
      expect(specValue(p.specs, "battery_health")).toMatch(/^\d{2}%$/);
      // The used ones are the shop's featured ones (its looks' "Certified used").
      expect(p.featured).toBe(true);
    }
    expect(MOBILES_PRODUCTS.filter((p) => p.featured)).toEqual(used);
  });

  it("estimates a trade-in from the shop's top price and the grade's share", () => {
    expect(MOBILES_TRADE_IN.grades).toEqual({ like_new: 100, good: 85, fair: 65, broken: 30 });
    expect(tradeInEstimate(MOBILES_TRADE_IN, "Veyra X2 Pro", "512 GB", "like_new")).toBe(14_500_00);
    expect(tradeInEstimate(MOBILES_TRADE_IN, "Veyra X2 Pro", "256 GB", "good")).toBe(11_560_00);
    expect(tradeInEstimate(MOBILES_TRADE_IN, "Veyra X2 Pro", "64 GB", "good")).toBeNull();
    expect(Math.max(...MOBILES_TRADE_IN.models.flatMap((m) => m.storages.map((s) => s.cents)))).toBe(14_500_00);
  });

  it("makes the demo app: Egyptian pounds, its devices with their specs, its sale, its code, trade-in and accessories", async () => {
    clearPlatformSettingsCache();
    const store = new MemoryStore();
    const result = await setupDemoApps(deps(store), [MOBILES_DEMO]);
    const app = (await store.getAppById(result.apps[0]!.appId))!;
    expect(app.design).toBe("mobiles_signature_c");
    expect(app.catalogSettings?.currency).toBe(MOBILES_CURRENCY);
    expect(app.catalogSettings?.returnDays).toBe(14);
    const products = await store.listCatalogProducts(app.id);
    expect(products).toHaveLength(MOBILES_PRODUCTS.length);
    expect(products.every((p) => (p.specs ?? []).length > 1)).toBe(true);
    const categories = await store.listCatalogCategories(app.id);
    expect(categories.filter((c) => !c.parentId).map((c) => c.name)).toEqual(expect.arrayContaining(MOBILES_CATEGORIES.map((c) => c.name)));
    expect(categories).toHaveLength(MOBILES_CATEGORIES.length + MOBILES_CATEGORIES.reduce((n, c) => n + c.subs.length, 0));
    const tech = techOf(app)!;
    expect(tech.accessoriesCategoryId).toBe(categories.find((c) => c.name === MOBILES_ACCESSORIES && !c.parentId)!.id);
    expect(tech.tradeIn).toEqual(MOBILES_TRADE_IN);
    expect((await store.listFlashSales(app.id)).find((f) => f.title === MOBILES_FLASH_SALE.title)?.productIds).toHaveLength(MOBILES_FLASH_SALE.skus.length);
    expect(await store.getCatalogCouponByCode(app.id, MOBILES_COUPON.code)).toBeTruthy();
    // A second run updates in place.
    await setupDemoApps(deps(store), [MOBILES_DEMO]);
    expect(await store.listCatalogProducts(app.id)).toHaveLength(MOBILES_PRODUCTS.length);
    expect(await store.listCatalogCategories(app.id)).toHaveLength(categories.length);
  });
});

describe("211 Nova's two looks: NOVA and emerald", () => {
  const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
    let n = 0;
    return { brand: "#0E1014", source: "products", app: "Nova", lang, w: appWords(lang, "Nova"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `mb-${++n}` };
  };

  it.each(["a", "b"] as const)("look %s: the header's menu opens the category menu; trade-in, compare and its pages", (look) => {
    const d = signatureDesign(MOBILES_DEMO, look)!;
    const home = d.home(ctx());
    expect(home.header?.buttons).toEqual(["menu", "notifications"]);
    expect(home.header?.menu_page).toBe(MENU_PAGE);
    const nodes = allNodes(home);
    const hero = nodes.find((n) => n.type === "slider")!;
    expect(hero.height).toBeGreaterThanOrEqual(200);
    expect(hero.height).toBeLessThanOrEqual(230);
    expect(hero.per_view).toBeGreaterThan(1);
    expect(nodes.some((n) => n.type === "flash_sale")).toBe(true);
    expect(nodes.find((n) => n.type === "trade_in")?.tech?.look).toBe(look === "a" ? "full" : "card");
    expect(nodes.some((n) => n.type === "compare")).toBe(true);
    // The trade-in hero and tiles open the estimator where the shop has it, else the shop.
    expect(nodes.some((n) => n.action?.flow === "trade_in" && n.action.screen === "search")).toBe(true);
    // Certified used: the shop's featured devices, their spec line (served as the subtitle) on each card.
    const used = nodes.find((n) => n.type === "items" && n.query?.featured)!;
    expect(allNodes({ body: used.card! }).some((n) => n.bind === "subtitle")).toBe(true);
    const pages = d.pages!(ctx());
    expect(pages.map((p) => p.slug)).toEqual([MENU_PAGE, TRADE_PAGE, COMPARE_PAGE]);
    expect(allNodes(pages[1]!.studio).find((n) => n.type === "trade_in")?.tech?.look).toBe("full");
    expect(allNodes(pages[2]!.studio).find((n) => n.type === "spec_filter")?.tech?.spec).toBe("storage");
    const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
    const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
    // Each page the checker takes (the home links the look's own pages, made with it).
    for (const page of pages.map((p) => p.studio)) {
      const parsed = parseStudioPage(page, app, languages);
      expect(parsed.ok ? null : parsed).toBeNull();
    }
    expect(d.bar.design).toBe("float");
    expect(d.tabs!([]).length).toBeGreaterThan(0);
  });

  it("writes every word of the looks in the app's three languages, the Arabic MSA", () => {
    const words = Object.keys(APP_WORDS.en).filter((w) => w.startsWith("mb"));
    expect(words.length).toBeGreaterThan(100);
    for (const w of words) for (const lang of ["ar", "tr"] as const) expect((APP_WORDS[lang] as Record<string, string>)[w], `${lang} ${w}`).toBeTruthy();
    // Never a white pill on a coloured card: the hero's buttons are the look's fill.
    for (const look of ["a", "b"] as const) {
      const hero = allNodes(signatureDesign(MOBILES_DEMO, look)!.home(ctx("ar"))).find((n) => n.type === "slider")!;
      for (const b of allNodes({ body: hero }).filter((n) => n.type === "button")) expect(b.background).not.toBe("#FFFFFF");
    }
  });

  it("are new ready sections for any store", () => {
    for (const s of MOBILES_SECTIONS) {
      expect(SECTIONS.some((x) => x.id === s.id)).toBe(true);
      expect(s.fits).toEqual({ types: ["store"], plain: true });
      expect(s.isNew).toBe(true);
      expect(s.make(ctx())).toBeTruthy();
    }
    // Made alone in another store, the estimator is the element itself.
    const made = MOBILES_SECTIONS.find((s) => s.id === "mb_trade_in")!.make({ ...ctx(), ownPages: false });
    expect(made.type).toBe("trade_in");
  });

  it("starts a project from look B with Nova's devices as samples, its trade-in and accessories", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Wasl", email: "owner@wasl.test", whatsapp: "+201000000000", siteUrl: "", password: null }, NOW);
    const b = TEMPLATES.find((t) => t.id === "mobiles_signature_b")!;
    const made = await makeStudioProject(store, { clientId: client.id, name: "Wasl Mobile", kind: kindById("store")!, source: "catalog", template: b, words: appWords("en", "Wasl Mobile"), lang: "en" }, NOW);
    const app = (await store.getAppById(made.id))! as App;
    expect(app.design).toBe("mobiles_signature_b");
    const products = await store.listCatalogProducts(app.id);
    expect(products.length).toBe(MOBILES_PRODUCTS.length);
    expect(products.every((p) => p.sample)).toBe(true);
    expect(techOf(app)?.tradeIn).toEqual(MOBILES_TRADE_IN);
    expect(techOf(app)?.accessoriesCategoryId).toBeTruthy();
    // An own setting is kept when the samples come again.
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, tech: { accessoriesCategoryId: null, tradeIn: null, pcBuilder: null } } }, NOW);
    await mobilesPartsForSamples({ store, now: NOW }, (await store.getAppById(app.id))!);
    expect((await store.getAppById(app.id))!.catalogSettings?.tech).toEqual({ accessoriesCategoryId: null, tradeIn: null, pcBuilder: null });
  });
});
