import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { demoIdOf, demoKind, DEMO_SLUGS, isStoreTemplateDemo, KIDS_DEMO, SHOP_TYPE_DEMOS, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { KIDS_ADDON_CATEGORY, KIDS_AGE_SIZES, KIDS_CATEGORIES, KIDS_COMMERCE, KIDS_GIFTS_CATEGORY, KIDS_PRODUCTS, KIDS_SETS_CATEGORY, KIDS_SIZE_CHART, kidsAgesOf, kidsCategoriesOf, kidsDetails, kidsMainOf, kidsVariants } from "@/lib/demo/kids";
import { kidsPartsForSamples } from "@/lib/demo/kids-entries";
import { isShopPhoto, KIDS_PHOTO_NAMES } from "@/lib/demo/shop-photos";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { mediaAddress, parseStudioPage } from "@/lib/pages/validate";
import type { StudioNode } from "@/lib/pages/types";
import { fashionOf, sizeChartJson, sizeChartOf } from "@/lib/selling/fashion";
import { appWords, APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { KIDS_MENU_PAGE, KIDS_SECTIONS, KIDS_SIZE_PAGE } from "@/lib/studio/demo-designs/kids-signature";
import { liabilityDue, withAcceptance } from "@/lib/studio/liability";
import { SECTIONS, TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { shopTypeById, shopTypeOfDemo, shopTypeOfDesign, shopTypeReady, shopTypesIn, shopTypeTemplate } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { appUrl } from "@/lib/env";
import { en as shopTypesEn, ar as shopTypesAr, tr as shopTypesTr } from "@/i18n/dashboard/shop-types";
import { en as studioEn, ar as studioAr, tr as studioTr } from "@/i18n/dashboard/studio";
import { ICON_NAMES } from "@/components/icon-names";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW } from "./helpers";

/**
 * 209 Studio's kids' clothes type (Toota): ready in Fashion and in Kids &
 * toys (the same type once), its liability notice (child safety and age,
 * sold to parents), its demo (sizes by age with the stock of each, the
 * size chart by age, girls, boys and baby with their sub-categories, the
 * newborn gifts with gift wrapping and a card as add-ons and the card's
 * message at checkout, the ready-made sets, each piece's details, the
 * weekend's deals and the code, exchanges within 30 days) and its two looks
 * A (TOOTA) and B (MINIMO) with the size finder, the category menu and the
 * size guide.
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

describe("209 the kids' clothes type", () => {
  it("is ready, in Fashion and in Kids & toys once, with its looks A and B and the kids' notice", () => {
    const kids = shopTypeById("kids_clothes")!;
    expect(shopTypeReady(kids)).toBe(true);
    expect(kids.demo).toBe(KIDS_DEMO);
    expect(SHOP_TYPE_DEMOS.kids).toBe("kids_signature_a");
    expect(shopTypesIn("fashion").map((t) => t.id)).toEqual(["clothes", "kids_clothes"]);
    expect(shopTypesIn("kids").map((t) => t.id)).toEqual(["kids_clothes", "toys"]);
    // 223 Its main template is C, the story world.
    expect(shopTypeTemplate(kids)).toBe("kids_signature_c");
    expect(shopTypeTemplate(kids, "b")).toBe("kids_signature_b");
    expect(shopTypeOfDemo(KIDS_DEMO)?.id).toBe("kids_clothes");
    expect(shopTypeOfDesign("kids_signature_b")?.id).toBe("kids_clothes");
    const store = templatesFor({ type: "store", vertical: null }).map((t) => t.id);
    expect(store).toEqual(expect.arrayContaining(["kids_signature_a", "kids_signature_b"]));
    expect(templatesFor({ type: "store", vertical: "restaurant" }).map((t) => t.id)).not.toContain("kids_signature_a");
    // 223 C and D first, A and B kept after them.
    expect(TEMPLATES.filter((t) => t.demo === KIDS_DEMO).map((t) => t.id)).toEqual(["kids_signature_c", "kids_signature_d", "kids_signature_a", "kids_signature_b"]);
  });

  it("shows its owner the kids' notice once: child safety and age warnings, sold to parents", () => {
    const app = (design: string, accepted: App["liabilityAccepted"] = null) => ({ section: "studio" as const, design, liabilityAccepted: accepted });
    expect(liabilityDue(app("kids_signature_a"))).toMatchObject({ kind: "kids", type: { id: "kids_clothes" } });
    expect(liabilityDue(app("kids_signature_b"))?.kind).toBe("kids");
    expect(liabilityDue(app("kids_signature_a", withAcceptance(null, "kids", "user-1", NOW)))).toBeNull();
    // Another notice accepted is not this one.
    expect(liabilityDue(app("kids_signature_a", withAcceptance(null, "general", "user-1", NOW)))?.kind).toBe("kids");
    for (const words of [shopTypesEn, shopTypesAr, shopTypesTr] as Record<string, unknown>[]) {
      expect(words.notice_kids).toBeTruthy();
      expect(words.type_kids_clothes).toBeTruthy();
    }
    expect(String(shopTypesEn.notice_kids)).toMatch(/child/i);
    expect(String(shopTypesEn.notice_kids)).toMatch(/parent/i);
  });

  it("names its looks and every ready section in Studio's three languages", () => {
    for (const words of [studioEn, studioAr, studioTr] as unknown as Record<string, string>[]) {
      for (const id of ["kids_signature_c", "kids_signature_d", "kids_signature_a", "kids_signature_b"]) {
        expect(words[`tpl_${id}`], id).toBeTruthy();
        expect(words[`tplText_${id}`], id).toBeTruthy();
      }
      for (const s of KIDS_SECTIONS) expect(words[`sec_${s.id}`], s.id).toBeTruthy();
    }
    for (const lang of ["en", "ar", "tr"] as const) for (const [word, text] of Object.entries(APP_WORDS[lang])) if (word.startsWith("kd")) expect(text, `${lang} ${word}`).toBeTruthy();
  });
});

describe("209 Toota, the kids' clothes shop's demo", () => {
  it("is a Studio demo of the store kind, told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(KIDS_DEMO);
    expect(isStoreTemplateDemo(KIDS_DEMO)).toBe(true);
    expect(demoKind(KIDS_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.kids).toBe("kids");
    expect(demoIdOf({ appType: "store", vertical: null, design: "kids_signature_a" })).toBe(KIDS_DEMO);
    expect(DEMO_BRANDS.kids.appName).toBe("Toota");
    expect(DEMO_GUIDES.kids.screens).toEqual(["toota-home", "toota-menu", "toota-product"]);
  });

  it("has its photos (CC0, credited) where the looks and its products take them", () => {
    const credits = JSON.parse(readFileSync(join(ROOT, "public/kids-photos/CREDITS.json"), "utf8")) as { file: string; license: string; page: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(KIDS_PHOTO_NAMES.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(c.page).toMatch(/^https:\/\/stocksnap\.io\/photo\//);
      expect(existsSync(join(ROOT, "public/kids-photos", c.file)), c.file).toBe(true);
    }
    for (const p of KIDS_PRODUCTS) for (const photo of p.photos) expect(isShopPhoto(`kd-${photo}`), photo).toBe(true);
    expect(mediaAddress(`${appUrl()}/kids-photos/tiered-dress.jpg`)).toBe(`${appUrl()}/kids-photos/tiered-dress.jpg`);
  });

  it("has a size chart by age (Age, Height, Weight, Chest) from 0–3 months to 11–12 years, in three languages", () => {
    expect(sizeChartOf(KIDS_SIZE_CHART)).toEqual(KIDS_SIZE_CHART);
    expect(KIDS_SIZE_CHART.headers).toEqual(["Age", "Height", "Weight (kg)", "Chest"]);
    expect(KIDS_SIZE_CHART.rows.map((r) => r[0])).toEqual([...KIDS_AGE_SIZES]);
    expect(KIDS_AGE_SIZES[0]).toBe("0–3M");
    expect(KIDS_AGE_SIZES.at(-1)).toBe("11–12Y");
    expect(sizeChartJson(KIDS_SIZE_CHART, "ar")!.headers[0]).toBe("العمر");
    expect(sizeChartJson(KIDS_SIZE_CHART, "tr")!.headers[0]).toBe("Yaş");
  });

  it("sells its clothes in sizes by age with the stock of each, a size gone in some", () => {
    const shoe = /^\d{2}$/;
    for (const p of KIDS_PRODUCTS) {
      for (const size of p.sizes) expect((KIDS_AGE_SIZES as readonly string[]).includes(size) || shoe.test(size), `${p.sku} ${size}`).toBe(true);
      const v = kidsVariants(p, 0);
      if (!p.sizes.length && p.colours.length < 2) expect(v, p.sku).toBeNull();
      if (v) {
        expect(v.items.every((i) => i.stock !== null && i.active && /^[A-Z0-9-]+$/.test(i.sku ?? "")), p.sku).toBe(true);
        expect(new Set(v.items.map((i) => i.sku)).size).toBe(v.items.length);
      }
    }
    const sweater = KIDS_PRODUCTS.find((p) => p.sku === "KD-306")!;
    const v = kidsVariants(sweater, 0)!;
    expect(v.attributes).toEqual([
      { name: "Size", values: ["12–18M", "18–24M", "2–3Y", "3–4Y", "4–5Y"] },
      { name: "Colour", values: ["Rust", "Oat"] },
    ]);
    expect(v.items).toHaveLength(10);
    expect(KIDS_PRODUCTS.some((p) => kidsVariants(p, KIDS_PRODUCTS.indexOf(p))?.items.some((i) => i.stock === 0))).toBe(true);
    expect(new Set(KIDS_PRODUCTS.map((p) => p.sku)).size).toBe(KIDS_PRODUCTS.length);
  });

  it("files every piece in its main category and sub-category: girls, boys, baby, newborn gifts and ready sets, a set in two", () => {
    expect(KIDS_CATEGORIES.map((c) => c.name)).toEqual(expect.arrayContaining(["Girls", "Boys", "Baby & newborn", KIDS_GIFTS_CATEGORY, KIDS_SETS_CATEGORY]));
    for (const c of KIDS_CATEGORIES) expect(c.subs.length, c.name).toBeGreaterThanOrEqual(2);
    for (const p of KIDS_PRODUCTS.filter((x) => !x.addon)) expect(kidsMainOf(p.sub).subs.some((s) => s.name === p.sub)).toBe(true);
    const sets = KIDS_PRODUCTS.filter((p) => !p.addon && kidsMainOf(p.sub).name === KIDS_SETS_CATEGORY);
    expect(sets.length).toBeGreaterThanOrEqual(3);
    for (const set of sets) {
      // In Ready sets and in the main category of its pieces (Girls, Boys, Baby & newborn).
      expect(kidsCategoriesOf(set)).toHaveLength(4);
      expect(kidsDetails(set)?.info?.find((i) => i.kind === "in_the_box")?.text, set.sku).toBeTruthy();
    }
    expect(kidsCategoriesOf(KIDS_PRODUCTS.find((p) => p.sku === "KD-702")!)).toEqual(["Ready sets", "Occasion sets", "Girls", "Dresses"]);
  });

  it("tells each piece's fabric, care, ages and badges; gift wrapping and a card are add-ons for the newborn gifts", () => {
    for (const p of KIDS_PRODUCTS.filter((x) => !x.addon)) {
      const d = kidsDetails(p)!;
      expect(d.facts?.[0]).toEqual({ name: "Fabric", value: p.fabric });
      expect(d.info?.map((i) => i.kind).slice(0, 2)).toEqual(["materials", "care"]);
      expect(kidsAgesOf(p), p.sku).not.toBeNull();
      expect(d.ageMonths, p.sku).toEqual(kidsAgesOf(p));
      if (p.colours.length > 1) expect(Object.keys(d.swatches ?? {})).toEqual(p.colours.map(([c]) => c));
    }
    expect(kidsDetails(KIDS_PRODUCTS.find((p) => p.sku === "KD-101")!)!.badges).toContain("organic");
    expect(kidsAgesOf(KIDS_PRODUCTS.find((p) => p.sku === "KD-101")!)).toEqual({ min: 0, max: 6 });
    const gifts = KIDS_PRODUCTS.filter((p) => !p.addon && kidsMainOf(p.sub).name === KIDS_GIFTS_CATEGORY && p.sub === "Gift boxes");
    expect(gifts.length).toBeGreaterThanOrEqual(3);
    for (const g of gifts) expect(kidsDetails(g)!.badges, g.sku).toContain("gift_wrap");
    const addons = KIDS_PRODUCTS.filter((p) => p.addon);
    expect(addons.map((a) => a.name)).toEqual(["Gift wrapping", "Greeting card"]);
    for (const a of addons) expect(kidsCategoriesOf(a)).toEqual([KIDS_ADDON_CATEGORY.name]);
    // The card's message at checkout, with beginnings in the three languages.
    expect(KIDS_COMMERCE.gifts).toMatchObject({ message: true, checkout: "standard" });
    expect(KIDS_COMMERCE.gifts!.starters.length).toBeGreaterThan(0);
    expect(KIDS_COMMERCE.gifts!.starterTexts?.ar?.[0]).toMatch(/[؀-ۿ]/);
    expect(KIDS_COMMERCE.gifts!.starterTexts?.tr).toHaveLength(KIDS_COMMERCE.gifts!.starters.length);
  });

  describe("the demo app on the hosted API", () => {
    let store: MemoryStore;
    let app: App;
    beforeEach(async () => {
      clearPlatformSettingsCache();
      store = new MemoryStore();
      const result = await setupDemoApps(deps(store), [KIDS_DEMO]);
      app = (await store.getAppById(result.apps[0]!.appId))!;
    });

    const context = (): HostedContext => ({
      store,
      app,
      active: true,
      now: NOW,
      ip: "203.0.113.31",
      secret: "test-hosted-secret",
      sender: new LogSender(),
      push: false,
      assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
      platformUrl: "https://yallapp.test",
      connector: new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" }),
    });

    /** A GET of `route`, checked against the contract (`contract` false: the size guide page, whose size finder the contract has yet to name). */
    async function call(route: string, query: Record<string, string> = {}, lang = "en", params: string[] = [], contract = true): Promise<HostedResult> {
      let i = 0;
      const path = route.replace(/\{[^}]+\}/g, () => params[i++]!);
      const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...query }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
      if (contract) expectContract("GET", route, result);
      return result;
    }

    it("keeps its categories, its pieces, their details and its settings", async () => {
      // 223 The demo is its main template, C.
      expect(app.design).toBe("kids_signature_c");
      expect(app.catalogSettings?.currency).toBe("EGP");
      expect(app.catalogSettings?.returnDays).toBe(30);
      expect(fashionOf(app)).toEqual({ sizeChart: KIDS_SIZE_CHART, completeLook: true });
      expect(app.catalogSettings?.gifts?.message).toBe(true);
      const categories = await store.listCatalogCategories(app.id);
      expect(categories).toHaveLength(KIDS_CATEGORIES.length + 1 + KIDS_CATEGORIES.reduce((n, c) => n + c.subs.length, 0));
      const girls = categories.find((c) => c.name === "Girls")!;
      expect(categories.find((c) => c.name === "Dresses")?.parentId).toBe(girls.id);
      expect(girls.names).toEqual({ ar: "البنات", tr: "Kız çocuk" });
      const products = await store.listCatalogProducts(app.id);
      expect(products).toHaveLength(KIDS_PRODUCTS.length);
      const box = products.find((p) => p.sku === "KD-601")!;
      expect(box.details?.badges).toContain("gift_wrap");
      expect(box.details?.info?.some((i) => i.kind === "in_the_box")).toBe(true);
      const wrap = products.find((p) => p.sku === "KD-901")!;
      expect(wrap.addon).toBe(true);
      expect(wrap.addonFor).toEqual({ offerWith: "categories", categoryIds: [categories.find((c) => c.name === KIDS_GIFTS_CATEGORY)!.id], productIds: [] });
    });

    it("serves the categories without the add-ons' own, the size chart by age, the card's message, and the wrapping and card with a gift only", async () => {
      const listed = (await call("/store/categories")).body as { items: { id: number; name: string; parent_id: number | null }[] };
      const names = listed.items.map((c) => c.name);
      expect(names).toEqual(expect.arrayContaining(["Baby & newborn", "Girls", "Boys", "Newborn gifts", "Ready sets"]));
      expect(names).not.toContain(KIDS_ADDON_CATEGORY.name);
      expect(listed.items.find((c) => c.name === "Gift boxes")?.parent_id).toBe(listed.items.find((c) => c.name === "Newborn gifts")!.id);
      const config = (await call("/config", { platform: "android", app_version: "1.0.0" })).body as { store: { size_chart: { headers: string[]; rows: string[][] } | null; returns: { days: number } | null; gift_message: unknown } };
      expect(config.store.size_chart?.headers).toEqual(["Age", "Height", "Weight (kg)", "Chest"]);
      expect(config.store.size_chart?.rows[0]?.[0]).toBe("0–3M");
      expect(config.store.returns?.days).toBe(30);
      expect(config.store.gift_message).toBeTruthy();
      const products = await store.listCatalogProducts(app.id);
      const box = products.find((p) => p.sku === "KD-601")!;
      const hoodie = products.find((p) => p.sku === "KD-301")!;
      const withBox = (await call("/store/addons", { product_id: String(box.id) })).body as { items: { name: string }[] };
      expect(withBox.items.map((x) => x.name)).toEqual(["Gift wrapping", "Greeting card"]);
      const withHoodie = (await call("/store/addons", { product_id: String(hoodie.id) })).body as { items: unknown[] };
      expect(withHoodie.items).toEqual([]);
      // Never listed on their own.
      const all = (await call("/store/products", { per_page: "100" })).body as { items: { name: string }[] };
      expect(all.items.map((x) => x.name)).not.toContain("Gift wrapping");
    });

    it("serves the category menu and the size guide on their pages", async () => {
      const page = (await call("/pages/{slug}", {}, "en", [KIDS_MENU_PAGE])).body as { studio: { body: StudioNode } };
      const menu = allNodes({ body: page.studio.body }).find((n) => n.type === "categories" && n.style === "rows")!;
      const rows = (menu as unknown as { categories: { name: string; children: { name: string }[] }[] }).categories;
      expect(rows.map((r) => r.name)).toEqual(KIDS_CATEGORIES.map((c) => c.name));
      expect(rows[1]!.children.map((c) => c.name)).toEqual(KIDS_CATEGORIES[1]!.subs.map((s) => s.name));
      const size = (await call("/pages/{slug}", {}, "en", [KIDS_SIZE_PAGE], false)).body as { studio: { body: StudioNode } };
      const nodes = allNodes({ body: size.studio.body });
      expect(nodes.some((n) => n.type === "size_chart")).toBe(true);
      expect(nodes.some((n) => n.type === "size_finder")).toBe(true);
    });
  });
});

describe("209 Toota's two looks: TOOTA soft pastels and MINIMO playful navy", () => {
  const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
    let n = 0;
    return { brand: "#B35C4B", source: "products", app: "Toota", lang, w: appWords(lang, "Toota"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `kd-${++n}` };
  };
  const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
  const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };

  it.each(["a", "b"] as const)("look %s: the menu opens the category menu, the size finder and the size guide, 9 to 12 sections, each page the checker takes", (look) => {
    const d = signatureDesign(KIDS_DEMO, look)!;
    const home = d.home(ctx());
    expect(home.header?.buttons).toContain("menu");
    expect(home.header?.menu_page).toBe(KIDS_MENU_PAGE);
    const nodes = allNodes(home);
    const hero = nodes.find((n) => n.type === "slider")!;
    expect(hero.height).toBe(210);
    expect(hero.per_view).toBeGreaterThan(1);
    expect(nodes.some((n) => n.type === "flash_sale")).toBe(true);
    expect(nodes.some((n) => n.type === "search")).toBe(true);
    expect(nodes.some((n) => n.type === "categories")).toBe(true);
    // The size finder by age, translated.
    const finder = nodes.find((n) => n.type === "size_finder")!;
    expect(finder.text).toBe("What size fits your child?");
    expect(finder.translations?.ar?.text).toBe("ما المقاس المناسب لطفلكِ؟");
    expect(nodes.some((n) => n.action?.type === "page" && n.action.page_slug === KIDS_SIZE_PAGE)).toBe(true);
    // The tiles named as the shop's main categories open them once served.
    for (const name of ["Girls", "Boys", "Baby & newborn", "Ready sets"]) expect(nodes.some((n) => n.text === name), name).toBe(true);
    // B's little gifts under a price.
    if (look === "b") expect(nodes.some((n) => n.type === "items" && n.query?.max_price === 500)).toBe(true);
    // Its sections, between 9 and 12 (each part a child of the home's column).
    const sections = home.body.children!.filter((n) => !(n.type === "row" && n.children?.[0]?.type === "column" && n.children[0].children?.some((c) => c.font?.size && c.font.size >= 21)));
    expect(sections.length).toBeGreaterThanOrEqual(9);
    expect(sections.length).toBeLessThanOrEqual(12);
    const pages = d.pages!(ctx());
    expect(pages.map((p) => p.slug)).toEqual([KIDS_MENU_PAGE, KIDS_SIZE_PAGE]);
    const menu = allNodes(pages[0]!.studio).find((n) => n.type === "categories" && n.style === "rows")!;
    expect(menu.category_menu?.look).toBe(look === "a" ? "lead" : "label");
    // Checked alone, without the look's other pages (the menu and the home open the size guide).
    for (const page of [home, ...pages.map((p) => p.studio)]) {
      const checked = parseStudioPage(page, app, languages);
      expect(checked.ok ? [] : checked.errors.filter((e) => !e.endsWith("choose a page that exists."))).toEqual([]);
    }
    const opens = allNodes(pages[0]!.studio).flatMap((n) => (n.action?.type === "screen" ? [n.action.screen] : []));
    expect(opens).toEqual(expect.arrayContaining(["account", "orders", "settings"]));
    expect(d.bar.design).toBe("float");
    const tabs = d.tabs!([
      { id: "home", label: "Home", icon: "home", target: { type: "screen", screen: "home" as never } },
      { id: "shop", label: "Shop", icon: "search", target: { type: "screen", screen: "search" } },
      { id: "cart", label: "Cart", icon: "shopping_cart", target: { type: "screen", screen: "cart" } },
      { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
    ]);
    expect(tabs.map((t) => t.label)).toEqual(["Home", "Shop", "Cart", "Orders", "Account"]);
  });

  it.each(["a", "b"] as const)("look %s: every icon one of Material Symbols Rounded's the site has, the home and pages in Arabic too", (look) => {
    const d = signatureDesign(KIDS_DEMO, look)!;
    const all = [d.home(ctx("ar")), ...d.pages!(ctx("ar")).map((p) => p.studio)];
    for (const page of all) for (const n of allNodes(page)) if (n.icon) expect(ICON_NAMES as readonly string[], n.icon).toContain(n.icon);
    const finder = allNodes(all[0]!).find((n) => n.type === "size_finder")!;
    expect(finder.text).toBe("ما المقاس المناسب لطفلكِ؟");
    expect(finder.translations?.en?.text).toBe("What size fits your child?");
  });

  it("are new ready sections of the editor's library, for any store", () => {
    for (const s of KIDS_SECTIONS) {
      expect(SECTIONS.some((x) => x.id === s.id)).toBe(true);
      expect(s.isNew).toBe(true);
      expect(s.fits).toEqual({ types: ["store"], plain: true });
      const made = s.make(ctx());
      expect(made, s.id).toBeTruthy();
      expect(ICON_NAMES as readonly string[], s.icon).toContain(s.icon);
      // On its own it never opens a page the store hasn't.
      expect(allNodes({ body: made }).some((n) => n.action?.type === "page"), s.id).toBe(false);
    }
  });

  it("starts a project from MINIMO with Toota's pieces as samples, its size chart and the card's message", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Minimo", email: "owner@minimo.test", whatsapp: "+201000000000", siteUrl: "", password: null }, NOW);
    const minimo = TEMPLATES.find((t) => t.id === "kids_signature_b")!;
    const made = await makeStudioProject(store, { clientId: client.id, name: "Minimo Kids", kind: kindById("store")!, source: "catalog", template: minimo, words: appWords("en", "Minimo Kids"), lang: "en" }, NOW);
    const project = (await store.getAppById(made.id))!;
    expect(project.design).toBe("kids_signature_b");
    expect(liabilityDue(project)?.kind).toBe("kids");
    const products = await store.listCatalogProducts(project.id);
    expect(products.length).toBe(KIDS_PRODUCTS.length);
    expect(products.every((p) => p.sample)).toBe(true);
    expect(fashionOf(project)).toEqual({ sizeChart: KIDS_SIZE_CHART, completeLook: true });
    expect(project.catalogSettings?.gifts?.message).toBe(true);
    // An own chart is kept when the samples come again.
    await store.updateApp(project.id, { catalogSettings: { ...project.catalogSettings!, fashion: { sizeChart: null, completeLook: false } } }, NOW);
    await kidsPartsForSamples({ store, now: NOW }, (await store.getAppById(project.id))!);
    expect((await store.getAppById(project.id))!.catalogSettings?.fashion).toEqual({ sizeChart: null, completeLook: false });
  });
});
