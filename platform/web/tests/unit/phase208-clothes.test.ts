import { CLOTHES_PRODUCT_NAMES } from "@/lib/demo/product-names";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { CLOTHES_DEMO, demoIdOf, demoKind, DEMO_SLUGS, isStoreTemplateDemo, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { CLOTHES_CATEGORIES, CLOTHES_PRODUCTS, CLOTHES_SIZE_CHART, clothesMainOf, clothesVariants } from "@/lib/demo/clothes";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { clothesPartsForSamples } from "@/lib/demo/clothes-entries";
import { CLOTHES_PHOTO_NAMES, isShopPhoto } from "@/lib/demo/shop-photos";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { mediaAddress, parseStudioPage } from "@/lib/pages/validate";
import { itemSourcesFor } from "@/lib/pages/sources";
import type { StudioNode } from "@/lib/pages/types";
import { completeLookFor, FASHION_FORM_ERRORS, fashionOf, parentChoice, parseFashionForm, sizeChartJson, sizeChartOf } from "@/lib/selling/fashion";
import { appWords } from "@/lib/studio/app-words";
import { mainTemplateOf, signatureDesign } from "@/lib/studio/demo-designs";
import { CLOTHES_SECTIONS, MENU_PAGE, SIZE_PAGE } from "@/lib/studio/demo-designs/clothes-signature";
import { ELEMENTS, newNode } from "@/lib/studio/elements";
import { INSTALLMENTS_SECTION, showsInstallmentsSoon } from "@/lib/studio/installments";
import { liabilityDue, withAcceptance } from "@/lib/studio/liability";
import { SECTIONS, TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { SECTION_DEMOS, SHOP_SECTIONS, SHOP_TYPES, shopTypeById, shopTypeOfDesign, shopTypeReady, shopTypesIn, shopTypeTemplate } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { appUrl } from "@/lib/env";
import { en as shopTypesEn, ar as shopTypesAr, tr as shopTypesTr } from "@/i18n/dashboard/shop-types";
import { categoryRows } from "@/components/studio/category-menu";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW } from "./helpers";

/**
 * 208 Studio's shop types, the first of them Clothes (Lujain): the
 * registry of sections and types, the liability notice once, the
 * installments tag, the category menu (sub-categories in the shop, rows in
 * the app), the size chart and "Complete the look", the demo and its two
 * looks A (LUJAIN) and B (NOUN).
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

describe("208 the shop types: sections, then types, then templates", () => {
  it("lists every type of the planning doc in its sections, Clothes (209 kids' clothes, cosmetics and toys, 210 furniture, decor and crochet, 211 electronics, mobiles and computers) ready: every type", () => {
    expect([...SHOP_SECTIONS]).toEqual(["fashion", "beauty", "home", "kids", "shopping"]);
    expect(SHOP_TYPES.map((t) => t.id)).toEqual(["clothes", "kids_clothes", "cosmetics", "furniture", "decor", "crochet", "toys", "electronics", "mobiles", "computers"]);
    // 209 And Kids' clothes, Cosmetics and Toys; 210 Furniture, Decor and Crochet; 211 Electronics, Mobiles and Computers: all ten, none coming soon.
    expect(SHOP_TYPES.filter(shopTypeReady).map((t) => t.id)).toEqual(SHOP_TYPES.map((t) => t.id));
    expect(SHOP_TYPES.filter(shopTypeReady)).toHaveLength(10);
    // Kids' clothes in Fashion and in Kids & toys, the same type once.
    expect(shopTypesIn("fashion").map((t) => t.id)).toEqual(["clothes", "kids_clothes"]);
    // 209 Both ready: kids' clothes, then toys.
    expect(shopTypesIn("kids").map((t) => t.id)).toEqual(["kids_clothes", "toys"]);
    expect(shopTypesIn("shopping").map((t) => t.id).sort()).toEqual(["computers", "electronics", "mobiles"]);
    expect(SECTION_DEMOS.shopping).toEqual(["flowers", "marketplace"]);
    // Installments: never active, "coming soon" for furniture, electronics, mobiles and computers only.
    expect(SHOP_TYPES.filter((t) => t.installmentsSoon).map((t) => t.id)).toEqual(["furniture", "electronics", "mobiles", "computers"]);
    expect(showsInstallmentsSoon("clothes")).toBe(false);
    expect(showsInstallmentsSoon("mobiles")).toBe(true);
    // The notices by type.
    expect(Object.fromEntries(SHOP_TYPES.map((t) => [t.id, t.liability]))).toMatchObject({ clothes: "general", cosmetics: "cosmetics", kids_clothes: "kids", toys: "kids", furniture: "warranty", electronics: "warranty", decor: "general", crochet: "general" });
  });

  it("offers a ready type's two looks as store templates, and nothing for a coming one", () => {
    const clothes = shopTypeById("clothes")!;
    // 223 Its main template is C, RUNWAY.
    expect(shopTypeTemplate(clothes)).toBe("clothes_signature_c");
    expect(shopTypeTemplate(clothes, "b")).toBe("clothes_signature_b");
    // 210 Furniture is ready now; a type without a demo still has no template.
    // 223 225 Its main look (C where the type has one).
    expect(shopTypeTemplate(shopTypeById("furniture")!)).toBe(mainTemplateOf("furniture"));
    expect(shopTypeTemplate({ ...shopTypeById("furniture")!, demo: undefined })).toBeNull();
    const store = templatesFor({ type: "store", vertical: null }).map((t) => t.id);
    expect(store).toContain("clothes_signature_a");
    expect(store).toContain("clothes_signature_b");
    // Not a restaurant's.
    expect(templatesFor({ type: "store", vertical: "restaurant" }).map((t) => t.id)).not.toContain("clothes_signature_a");
    expect(shopTypeOfDesign("clothes_signature_b")?.id).toBe("clothes");
    expect(shopTypeOfDesign("flowers_signature_a")).toBeNull();
    expect(shopTypeOfDesign(null)).toBeNull();
  });

  it("names every section and type in the dashboard's three languages", () => {
    for (const words of [shopTypesEn, shopTypesAr, shopTypesTr] as Record<string, unknown>[]) {
      for (const s of SHOP_SECTIONS) expect(words[`section_${s}`], s).toBeTruthy();
      for (const t of SHOP_TYPES) {
        expect(words[`type_${t.id}`], t.id).toBeTruthy();
        expect(words[`text_${t.id}`], t.id).toBeTruthy();
      }
      for (const kind of ["general", "cosmetics", "kids", "warranty"]) expect(words[`notice_${kind}`], kind).toBeTruthy();
    }
    expect(shopTypesAr.noticeAccept).toBe("قرأت وموافق");
  });
});

describe("208 the liability notice, once", () => {
  const app = (design: string | null, accepted: App["liabilityAccepted"] = null) => ({ section: "studio" as const, design, liabilityAccepted: accepted });

  it("is due for a project made from a shop type until its owner accepts it", () => {
    expect(liabilityDue(app("clothes_signature_a"))).toMatchObject({ kind: "general", type: { id: "clothes" } });
    expect(liabilityDue(app("clothes_signature_b"))?.kind).toBe("general");
    // Accepted: never again.
    const accepted = withAcceptance(null, "general", "user-1", NOW);
    expect(accepted.general).toEqual({ at: NOW.toISOString(), userId: "user-1" });
    expect(liabilityDue(app("clothes_signature_a", accepted))).toBeNull();
    // An earlier acceptance stays as it was.
    expect(withAcceptance(accepted, "general", "user-2", new Date(NOW.getTime() + 1000)).general?.userId).toBe("user-1");
    // Other projects never see one.
    expect(liabilityDue(app("flowers_signature_a"))).toBeNull();
    expect(liabilityDue(app(null))).toBeNull();
    expect(liabilityDue({ section: undefined, design: "clothes_signature_a", liabilityAccepted: null })).toBeNull();
  });
});

describe("208 a clothes shop's size chart and Complete the look", () => {
  it("reads the owner's chart, its titles in the app's other languages, and refuses a wrong one", () => {
    const parsed = parseFashionForm({ fashionChart: "Size | Bust | Waist\nS | 84 | 66\nM | 88 | 70", fashionUnit: "cm", fashionTitles_ar: "المقاس | الصدر | الخصر", completeLook: "on" }, ["ar", "tr"]);
    expect(parsed).toEqual({ ok: true, value: { sizeChart: { headers: ["Size", "Bust", "Waist"], rows: [["S", "84", "66"], ["M", "88", "70"]], unit: "cm", translations: { ar: ["المقاس", "الصدر", "الخصر"] } }, completeLook: true } });
    expect(parseFashionForm({ fashionChart: "Size | Bust\nS" })).toEqual({ ok: false, errors: { fashionChart: FASHION_FORM_ERRORS.columns } });
    expect(parseFashionForm({ fashionChart: "Size only" })).toEqual({ ok: false, errors: { fashionChart: FASHION_FORM_ERRORS.chart } });
    expect(parseFashionForm({ fashionChart: "Size | Bust\nS | 84", fashionTitles_tr: "Beden" }, ["tr"])).toEqual({ ok: false, errors: { fashionTitles_tr: FASHION_FORM_ERRORS.columns } });
    // Nothing set: off.
    expect(parseFashionForm({})).toEqual({ ok: true, value: null });
  });

  it("serves the chart in the language asked for, and only a well-made one", () => {
    expect(sizeChartJson(CLOTHES_SIZE_CHART, "ar")!.headers[0]).toBe("المقاس");
    expect(sizeChartJson(CLOTHES_SIZE_CHART, "de")!.headers[0]).toBe("Size");
    expect(sizeChartJson(null, "en")).toBeNull();
    expect(sizeChartOf({ headers: ["Size"], rows: [["S"]] })).toBeNull();
    expect(sizeChartOf({ headers: ["Size", "Bust"], rows: [["S", "84", "x"]] })).toBeNull();
    expect(fashionOf({ appType: "store", vertical: "restaurant", catalogSettings: { fashion: { sizeChart: CLOTHES_SIZE_CHART, completeLook: true } } as App["catalogSettings"] })).toBeNull();
  });

  it("completes the look with one product of each other main category, never the product or an add-on", () => {
    const categories = [
      { id: 1, parentId: null, position: 0 },
      { id: 11, parentId: 1, position: 1 },
      { id: 2, parentId: null, position: 2 },
      { id: 21, parentId: 2, position: 3 },
      { id: 3, parentId: null, position: 4 },
    ];
    const p = (id: number, categoryIds: number[], extra: { addon?: boolean; featured?: boolean; salesCount?: number } = {}) => ({ id, categoryIds, addon: extra.addon ?? false, featured: extra.featured ?? false, salesCount: extra.salesCount ?? 0 });
    const dress = p(10, [1, 11]);
    const all = [dress, p(11, [11]), p(20, [21]), p(21, [2], { featured: true }), p(30, [3], { addon: true }), p(31, [3], { salesCount: 4 })];
    expect(completeLookFor(dress, all, categories).map((x) => x.id)).toEqual([21, 31]);
  });

  it("keeps sub-categories one level deep", () => {
    const categories = [{ id: 1, parentId: null }, { id: 2, parentId: null }, { id: 3, parentId: 1 }];
    expect(parentChoice(categories, 2, "1")).toBe(1);
    // Never itself, nor inside a sub-category, nor a main one that has its own.
    expect(parentChoice(categories, 2, "2")).toBeNull();
    expect(parentChoice(categories, 2, "3")).toBeNull();
    expect(parentChoice(categories, 1, "2")).toBeNull();
    expect(parentChoice(categories, null, "")).toBeNull();
    expect(parentChoice(categories, null, "99")).toBeNull();
  });
});

describe("208 Lujain, the clothes shop's demo", () => {
  it("is a Studio demo of the store kind, told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(CLOTHES_DEMO);
    expect(isStoreTemplateDemo(CLOTHES_DEMO)).toBe(true);
    expect(demoKind(CLOTHES_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.clothes).toBe("clothes");
    expect(demoIdOf({ appType: "store", vertical: null, design: "clothes_signature_a" })).toBe(CLOTHES_DEMO);
    expect(demoIdOf({ appType: "store", vertical: null, design: "flowers_signature_a" })).toBe("flowers");
    expect(demoIdOf({ appType: "store", vertical: null })).toBe("store");
    expect(DEMO_BRANDS.clothes.appName).toBe("Lujain");
    expect(DEMO_GUIDES.clothes.screens).toEqual(["lujain-home", "lujain-menu", "lujain-product"]);
  });

  it("has its photos (CC0, credited) where the looks and its products take them", () => {
    const credits = JSON.parse(readFileSync(join(ROOT, "public/clothes-photos/CREDITS.json"), "utf8")) as { file: string; license: string; page: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(CLOTHES_PHOTO_NAMES.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(c.page).toMatch(/^https:\/\/stocksnap\.io\/photo\//);
      expect(existsSync(join(ROOT, "public/clothes-photos", c.file)), c.file).toBe(true);
    }
    for (const p of CLOTHES_PRODUCTS) for (const photo of p.photos) expect(isShopPhoto(`cl-${photo}`), photo).toBe(true);
    // The platform's own photos, kept by the page checker.
    expect(mediaAddress(`${appUrl()}/clothes-photos/rust-1.jpg`)).toBe(`${appUrl()}/clothes-photos/rust-1.jpg`);
  });

  it("sells its clothes in sizes and colours with the stock of each, a size gone in some", () => {
    const dress = CLOTHES_PRODUCTS.find((p) => p.sku === "CL-101")!;
    const v = clothesVariants(dress, 0)!;
    expect(v.attributes).toEqual([
      { name: "Size", values: ["XS", "S", "M", "L", "XL"] },
      { name: "Colour", values: ["Blue", "Black", "Olive"] },
    ]);
    expect(v.items).toHaveLength(15);
    expect(v.items.some((i) => i.stock === 0)).toBe(true);
    expect(v.items.every((i) => i.stock !== null && i.active)).toBe(true);
    // One size in one colour (a ring): nothing to choose.
    expect(clothesVariants(CLOTHES_PRODUCTS.find((p) => p.sku === "CL-803")!, 0)).toBeNull();
    // Shoes in their sizes.
    expect(clothesVariants(CLOTHES_PRODUCTS.find((p) => p.sku === "CL-601")!, 0)!.attributes[0]!.values).toEqual(["36", "37", "38", "39", "40"]);
    for (const p of CLOTHES_PRODUCTS) expect(clothesMainOf(p.sub).subs.some((s) => s.name === p.sub)).toBe(true);
    expect(new Set(CLOTHES_PRODUCTS.map((p) => p.sku)).size).toBe(CLOTHES_PRODUCTS.length);
  });

  describe("the demo app on the hosted API", () => {
    let store: MemoryStore;
    let app: App;
    beforeEach(async () => {
      clearPlatformSettingsCache();
      store = new MemoryStore();
      const result = await setupDemoApps(deps(store), [CLOTHES_DEMO]);
      app = (await store.getAppById(result.apps[0]!.appId))!;
    });

    const context = (): HostedContext => ({
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.30",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
      connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
    });

    /** A GET of `route` (its `{...}` the `params` in order), checked against the contract. */
    async function call(route: string, query: Record<string, string> = {}, lang = "en", params: string[] = []): Promise<HostedResult> {
      let i = 0;
      const path = route.replace(/\{[^}]+\}/g, () => params[i++]!);
      const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...query }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
      expectContract("GET", route, result);
      return result;
    }

    it("keeps its categories and sub-categories, its pieces and settings", async () => {
      // 223 The demo is its main template, C.
      expect(app.design).toBe("clothes_signature_c");
      expect(app.catalogSettings?.currency).toBe("SAR");
      expect(app.catalogSettings?.returnDays).toBe(14);
      expect(fashionOf(app)).toEqual({ sizeChart: CLOTHES_SIZE_CHART, completeLook: true });
      const categories = await store.listCatalogCategories(app.id);
      expect(categories).toHaveLength(CLOTHES_CATEGORIES.length + CLOTHES_CATEGORIES.reduce((n, c) => n + c.subs.length, 0));
      const dresses = categories.find((c) => c.name === "Dresses")!;
      expect(categories.find((c) => c.name === "Midi dresses")?.parentId).toBe(dresses.id);
      expect(dresses.parentId ?? null).toBeNull();
      expect(dresses.names).toEqual({ ar: "فساتين", tr: "Elbiseler" });
      expect(await store.listCatalogProducts(app.id)).toHaveLength(CLOTHES_PRODUCTS.length);
    });

    it("serves the sub-categories with their main one, a main category's products from its sub-categories, the size chart and Complete the look", async () => {
      const listed = (await call("/store/categories")).body as { items: { id: number; name: string; count: number; parent_id: number | null; image_url: string | null }[] };
      const dresses = listed.items.find((c) => c.name === "Dresses")!;
      const midi = listed.items.find((c) => c.name === "Midi dresses")!;
      expect(midi.parent_id).toBe(dresses.id);
      expect(dresses.parent_id).toBeNull();
      expect(dresses.count).toBe(CLOTHES_PRODUCTS.filter((p) => clothesMainOf(p.sub).name === "Dresses").length);
      expect(dresses.image_url).toMatch(/^https:\/\/yallapp\.test\/api\/v1\/assets\//);
      // In Arabic, as the shop named them.
      const arabic = (await call("/store/categories", {}, "ar")).body as { items: { name: string }[] };
      expect(arabic.items.map((c) => c.name)).toContain("فساتين");
      // 223 Its products in Arabic and Turkish too, each named.
      expect(CLOTHES_PRODUCTS.filter((p) => !CLOTHES_PRODUCT_NAMES[p.sku])).toEqual([]);
      const arProducts = (await call("/store/products", { per_page: "100" }, "ar")).body as { items: { name: string }[] };
      expect(arProducts.items.map((p) => p.name)).toContain(CLOTHES_PRODUCT_NAMES["CL-101"]!.ar);
      expect(arProducts.items.every((p) => /[\u0600-\u06FF]/u.test(p.name))).toBe(true);
      const trProducts = (await call("/store/products", { per_page: "100" }, "tr")).body as { items: { name: string }[] };
      expect(trProducts.items.map((p) => p.name)).toContain("Çizgili gömlek elbise");
      const inDresses = (await call("/store/products", { category: String(dresses.id), per_page: "50" })).body as { items: { id: number }[] };
      expect(inDresses.items).toHaveLength(dresses.count);
      const config = (await call("/config", { platform: "android", app_version: "1.0.0" })).body as { store: { size_chart: { headers: string[]; unit: string } | null; returns: { days: number } | null } };
      expect(config.store.size_chart).toMatchObject({ headers: ["Size", "Bust", "Waist", "Hips", "Length"], unit: "cm" });
      expect(config.store.returns?.days).toBe(14);
      const products = await store.listCatalogProducts(app.id);
      const dress = products.find((p) => p.sku === "CL-101")!;
      const detail = (await call("/store/products/{product_id}", {}, "en", [String(dress.id)])).body as { complete_look: { name: string }[]; variations: { stock_status: string; attributes: Record<string, string> }[] };
      // Shoes, a bag, sunglasses: never another dress.
      expect(detail.complete_look.length).toBeGreaterThanOrEqual(3);
      expect(detail.complete_look.map((p) => p.name)).not.toContain(dress.name);
      expect(detail.variations.some((v) => v.stock_status === "out_of_stock")).toBe(true);
    });

    it("serves the category menu on its page: each main category with its sub-categories", async () => {
      const page = (await call("/pages/{slug}", {}, "en", [MENU_PAGE])).body as { studio: { body: StudioNode } };
      const menu = allNodes({ body: page.studio.body }).find((n) => n.type === "categories" && n.style === "rows")!;
      const rows = (menu as unknown as { categories: { name: string; children: { name: string }[] }[] }).categories;
      expect(rows.map((r) => r.name)).toEqual(CLOTHES_CATEGORIES.map((c) => c.name));
      expect(rows[0]!.children.map((c) => c.name)).toEqual(["Midi dresses", "Maxi dresses", "Mini dresses"]);
      const size = (await call("/pages/{slug}", {}, "en", [SIZE_PAGE])).body as { studio: { body: StudioNode } };
      expect(allNodes({ body: size.studio.body }).some((n) => n.type === "size_chart")).toBe(true);
      // The search fields (made without a source, as the editor makes them) search the shop's products, which the app needs to show them.
      const menuSearch = allNodes({ body: page.studio.body }).filter((n) => n.type === "search");
      expect(menuSearch.length).toBeGreaterThan(0);
      for (const n of menuSearch) expect(n.source).toBe("products");
    });
  });
});

describe("208 Lujain's two looks: LUJAIN the boutique and NOUN streetwear", () => {
  const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
    let n = 0;
    return { brand: "#121212", source: "products", app: "Lujain", lang, w: appWords(lang, "Lujain"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `cl-${++n}` };
  };

  it.each(["a", "b"] as const)("look %s: the header's menu opens the category menu, the size card its size guide, each page the checker takes", (look) => {
    const d = signatureDesign(CLOTHES_DEMO, look)!;
    const home = d.home(ctx());
    expect(home.header?.buttons).toContain("menu");
    expect(home.header?.menu_page).toBe(MENU_PAGE);
    const nodes = allNodes(home);
    // The compact hero: about 210 px, the next card peeking.
    const hero = nodes.find((n) => n.type === "slider")!;
    expect(hero.height).toBe(210);
    expect(hero.per_view).toBeGreaterThan(1);
    expect(nodes.some((n) => n.type === "flash_sale")).toBe(true);
    expect(nodes.some((n) => n.action?.type === "page" && n.action.page_slug === SIZE_PAGE)).toBe(true);
    // Shop the look: three numbered spots on its photo, each opening a piece (the shop without entries).
    expect(nodes.filter((n) => n.place && n.type === "row").length).toBe(3);
    const pages = d.pages!(ctx());
    expect(pages.map((p) => p.slug)).toEqual([MENU_PAGE, SIZE_PAGE]);
    const menu = allNodes(pages[0]!.studio).find((n) => n.type === "categories" && n.style === "rows")!;
    expect(menu.category_menu?.look).toBe(look === "a" ? "lead" : "label");
    const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
    const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
    for (const page of pages) expect(parseStudioPage(page.studio, app, languages)).toMatchObject({ ok: true });
    // The account, the orders, the language and how to reach the shop at the menu's foot.
    const opens = allNodes(pages[0]!.studio).flatMap((n) => (n.action?.type === "screen" ? [n.action.screen] : []));
    expect(opens).toEqual(expect.arrayContaining(["account", "orders", "settings"]));
    expect(d.bar.design).toBe("float");
    expect(d.tabs!([]).length).toBeGreaterThan(0);
    expect(itemSourcesFor({ appType: "store", backend: "hosted" } as App)[0]).toBe("products");
  });

  it("are new ready sections and elements of the editor's library, for any store", () => {
    for (const s of CLOTHES_SECTIONS) {
      expect(SECTIONS.some((x) => x.id === s.id)).toBe(true);
      expect(s.fits).toEqual({ types: ["store"], plain: true });
      expect(s.make(ctx())).toBeTruthy();
    }
    expect(SECTIONS).toContain(INSTALLMENTS_SECTION);
    const tag = INSTALLMENTS_SECTION.make(ctx("ar"));
    expect(allNodes({ body: tag }).some((n) => n.text === "التقسيط قريبًا")).toBe(true);
    expect(ELEMENTS.some((e) => e.type === "categories" && e.preset === "category_menu" && e.only === "store")).toBe(true);
    expect(ELEMENTS.some((e) => e.type === "size_chart" && e.only === "store")).toBe(true);
    const words = () => "x";
    expect(newNode("categories", { source: "products", brand: "#000000", text: words, preset: "category_menu" })).toMatchObject({ style: "rows", category_menu: { look: "lead" } });
    expect(newNode("size_chart", { source: "products", brand: "#000000", text: words }).type).toBe("size_chart");
    // 223 C and D first, A and B kept after them.
    expect(TEMPLATES.filter((t) => t.demo === CLOTHES_DEMO).map((t) => t.id)).toEqual(["clothes_signature_c", "clothes_signature_d", "clothes_signature_a", "clothes_signature_b"]);
  });

  it("draws the canvas's rows from the shop's categories: each main one with its sub-categories", () => {
    const rows = categoryRows([
      { id: "1", name: "Dresses" },
      { id: "11", name: "Midi", parent_id: "1" },
      { id: "2", name: "Shoes" },
      { id: "21", name: "Heels", parent_id: "2" },
      // A sub-category whose main one isn't listed stands on its own.
      { id: "31", name: "Rings", parent_id: "3" },
    ]);
    expect(rows.map((r) => [r.main.name, r.subs.map((s) => s.name)])).toEqual([
      ["Dresses", ["Midi"]],
      ["Shoes", ["Heels"]],
      ["Rings", []],
    ]);
  });

  it("starts a project from NOUN with Lujain's pieces as samples, its size chart and Complete the look", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Noun", email: "owner@noun.test", whatsapp: "+966500000000", siteUrl: "", password: null }, NOW);
    const noun = TEMPLATES.find((t) => t.id === "clothes_signature_b")!;
    const made = await makeStudioProject(store, { clientId: client.id, name: "Noun Street", kind: kindById("store")!, source: "catalog", template: noun, words: appWords("en", "Noun Street"), lang: "en" }, NOW);
    const app = (await store.getAppById(made.id))!;
    expect(app.design).toBe("clothes_signature_b");
    const products = await store.listCatalogProducts(app.id);
    expect(products.length).toBe(CLOTHES_PRODUCTS.length);
    expect(products.every((p) => p.sample)).toBe(true);
    expect(fashionOf(app)).toEqual({ sizeChart: CLOTHES_SIZE_CHART, completeLook: true });
    // An own chart is kept when the samples come again.
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, fashion: { sizeChart: null, completeLook: false } } }, NOW);
    await clothesPartsForSamples({ store, now: NOW }, (await store.getAppById(app.id))!);
    expect((await store.getAppById(app.id))!.catalogSettings?.fashion).toEqual({ sizeChart: null, completeLook: false });
  });
});

