import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { productDetails } from "@/lib/catalog/details";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { BEAUTY_CATEGORIES, BEAUTY_COMMERCE, BEAUTY_COUPON, BEAUTY_FLASH_SALE, BEAUTY_PRODUCTS, BRANDS_CATEGORY, FOUNDATION_SHADES, SKIN_TYPE_CATEGORY, SKIN_TYPES, beautyCategoriesOf, beautyDetails, beautyMainOf, beautyVariants, routineSteps } from "@/lib/demo/beauty";
import { BEAUTY_DEMO, demoIdOf, demoKind, DEMO_SLUGS, isStoreTemplateDemo, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { BEAUTY_PHOTO_NAMES, isShopPhoto } from "@/lib/demo/shop-photos";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted, type HostedContext, type HostedResult } from "@/lib/hosted/service";
import { mediaAddress, parseStudioPage } from "@/lib/pages/validate";
import type { StudioNode, StudioPage } from "@/lib/pages/types";
import { APP_WORDS, appWords, type AppWord } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { BEAUTY_COUPON_CODE, BEAUTY_SECTIONS, MENU_PAGE, QUIZ_PAGE } from "@/lib/studio/demo-designs/beauty-signature";
import { liabilityDue, withAcceptance } from "@/lib/studio/liability";
import { showsInstallmentsSoon } from "@/lib/studio/installments";
import { SECTIONS, TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { SHOP_TYPES, shopTypeById, shopTypeOfDesign, shopTypeReady, shopTypesIn, shopTypeTemplate } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { withShopCategoriesIn } from "@/lib/studio/shop-categories";
import { ICON_NAMES } from "@/components/icon-names";
import { appUrl } from "@/lib/env";
import { en as shopTypesEn, ar as shopTypesAr, tr as shopTypesTr } from "@/i18n/dashboard/shop-types";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { expectContract } from "./contract";
import { KEY, NOW } from "./helpers";

/**
 * 209 Studio's cosmetics type, Velours: the type ready with its notice, the
 * demo's products (shades with the stock of each and their colours, skin
 * types and brands as categories, every product's ingredients, how to use
 * it, its facts, genuine and its expiry, the ready-made routines), the demo
 * on the hosted API, and its two looks A (VELOURS) and B (NAQA LAB) with
 * the shade finder, the skin quiz, the routine, the category menu and the
 * ready sections.
 */

const ROOT = join(__dirname, "../..");
const LANGS = ["en", "ar", "tr"] as const;

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

describe("209 the cosmetics type", () => {
  it("is ready in Beauty & care with its two looks, and the cosmetics notice", () => {
    const cosmetics = shopTypeById("cosmetics")!;
    expect(shopTypeReady(cosmetics)).toBe(true);
    expect(cosmetics.demo).toBe(BEAUTY_DEMO);
    expect(shopTypesIn("beauty").map((t) => t.id)).toEqual(["cosmetics"]);
    // 224 Its main template is C.
    expect(shopTypeTemplate(cosmetics)).toBe("beauty_signature_c");
    expect(shopTypeTemplate(cosmetics, "b")).toBe("beauty_signature_b");
    expect(shopTypeOfDesign("beauty_signature_b")?.id).toBe("cosmetics");
    expect(SHOP_TYPES.filter(shopTypeReady).map((t) => t.id)).toContain("cosmetics");
    // No installments tag: it isn't one of the types that sell on installments.
    expect(showsInstallmentsSoon("cosmetics")).toBe(false);
    const store = templatesFor({ type: "store", vertical: null }).map((t) => t.id);
    expect(store).toEqual(expect.arrayContaining(["beauty_signature_c", "beauty_signature_d", "beauty_signature_a", "beauty_signature_b"]));
    expect(TEMPLATES.filter((t) => t.demo === BEAUTY_DEMO).map((t) => t.id)).toEqual(["beauty_signature_c", "beauty_signature_d", "beauty_signature_a", "beauty_signature_b"]);
  });

  it("asks its owner to accept the cosmetics notice once: registered, genuine, ingredients and expiry written correctly", () => {
    const app = (design: string, accepted: App["liabilityAccepted"] = null) => ({ section: "studio" as const, design, liabilityAccepted: accepted });
    expect(liabilityDue(app("beauty_signature_a"))).toMatchObject({ kind: "cosmetics", type: { id: "cosmetics" } });
    expect(liabilityDue(app("beauty_signature_b"))?.kind).toBe("cosmetics");
    const accepted = withAcceptance(null, "cosmetics", "user-1", NOW);
    expect(liabilityDue(app("beauty_signature_a", accepted))).toBeNull();
    // A clothes notice accepted is not the cosmetics one.
    expect(liabilityDue(app("beauty_signature_a", withAcceptance(null, "general", "user-1", NOW)))?.kind).toBe("cosmetics");
    expect(shopTypesEn.notice_cosmetics).toMatch(/registered and genuine/);
    expect(shopTypesEn.notice_cosmetics).toMatch(/ingredients and expiry/);
    expect(shopTypesAr.notice_cosmetics).toMatch(/مسجّلة وأصلية/);
    expect(shopTypesTr.notice_cosmetics).toMatch(/kayıtlı ve orijinal/);
  });
});

describe("209 Velours's products", () => {
  it("sorts every product by its category, its skin types and its brand", () => {
    const names = BEAUTY_CATEGORIES.map((c) => c.name);
    expect(names).toEqual(["Skincare", "Makeup", "Fragrance", "Body & bath", "Hair", "Gifts & sets", "Skin type", "Brands"]);
    expect(BEAUTY_CATEGORIES.find((c) => c.name === SKIN_TYPE_CATEGORY.name)!.subs.map((s) => s.name)).toEqual(["Dry", "Combination", "Oily", "Sensitive"]);
    expect(BEAUTY_CATEGORIES.find((c) => c.name === BRANDS_CATEGORY.name)!.subs).toHaveLength(6);
    // Every category name once (the products find theirs by name).
    const all = BEAUTY_CATEGORIES.flatMap((c) => [c.name, ...c.subs.map((s) => s.name)]);
    expect(new Set(all).size).toBe(all.length);
    for (const c of BEAUTY_CATEGORIES) for (const n of [c, ...c.subs]) expect(n.names.ar && n.names.tr, n.name).toBeTruthy();
    for (const p of BEAUTY_PRODUCTS) {
      const cats = beautyCategoriesOf(p);
      expect(cats, p.sku).toContain(beautyMainOf(p.sub).name);
      expect(cats, p.sku).toContain(p.brand);
      expect(cats, p.sku).toContain(BRANDS_CATEGORY.name);
      for (const s of p.skins) expect(cats, p.sku).toContain(s);
      expect(cats.every((c) => all.includes(c)), p.sku).toBe(true);
    }
    // Every sub-category has products, and every skin type and brand.
    for (const c of BEAUTY_CATEGORIES) for (const s of c.subs) expect(BEAUTY_PRODUCTS.some((p) => beautyCategoriesOf(p).includes(s.name)), s.name).toBe(true);
    expect(new Set(BEAUTY_PRODUCTS.map((p) => p.sku)).size).toBe(BEAUTY_PRODUCTS.length);
  });

  it("gives every product its ingredients, how to use it, its facts, the genuine badge and its expiry", () => {
    for (const p of BEAUTY_PRODUCTS) {
      const d = productDetails({ details: beautyDetails(p) })!;
      expect(d.info?.map((i) => i.kind), p.sku).toEqual(["ingredients", "how_to_use"]);
      expect(d.badges, p.sku).toContain("genuine");
      expect(d.expiry, p.sku).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
      // After the demo's day: never sold expired.
      expect(d.expiry! > NOW.toISOString().slice(0, 7), p.sku).toBe(true);
      expect(d.facts?.[0], p.sku).toEqual({ name: "Brand", value: p.brand });
      if (p.skins.length) expect(d.facts?.some((f) => f.name === "Skin type"), p.sku).toBe(true);
    }
    expect(BEAUTY_PRODUCTS.filter((p) => p.crueltyFree).length).toBeGreaterThan(BEAUTY_PRODUCTS.length / 2);
  });

  it("sells its shades as choices with the stock of each, a colour each, one gone", () => {
    const foundation = BEAUTY_PRODUCTS.find((p) => p.sku === "BT-201")!;
    expect(foundation.shades).toBe(FOUNDATION_SHADES);
    const v = beautyVariants(foundation, BEAUTY_PRODUCTS.indexOf(foundation))!;
    expect(v.attributes).toEqual([{ name: "Shade", values: FOUNDATION_SHADES.map(([s]) => s) }]);
    expect(v.items).toHaveLength(12);
    expect(v.items.some((i) => i.stock === 0)).toBe(true);
    // 3W chosen when the page opens, as the shade finder picks it.
    expect(v.items.find((i) => i.id === v.defaultId)?.values).toEqual(["3W"]);
    const d = productDetails({ details: beautyDetails(foundation) })!;
    expect(Object.keys(d.swatches!)).toEqual(FOUNDATION_SHADES.map(([s]) => s));
    expect(d.swatches!["3W"]).toBe("#D7A887");
    for (const p of BEAUTY_PRODUCTS.filter((x) => x.shades)) {
      const sw = productDetails({ details: beautyDetails(p) })!.swatches!;
      expect(Object.keys(sw), p.sku).toEqual(p.shades!.map(([s]) => s));
    }
    expect(BEAUTY_PRODUCTS.filter((p) => p.shades).length).toBeGreaterThanOrEqual(5);
    // Nothing to choose: no variations.
    expect(beautyVariants(BEAUTY_PRODUCTS.find((p) => p.sku === "BT-101")!, 0)).toBeNull();
  });

  it("makes ready-made routines of its products: their steps in the description, the sum as the price, sold for less", () => {
    const routines = BEAUTY_PRODUCTS.filter((p) => p.sub === "Routines");
    expect(routines).toHaveLength(4);
    // The featured products are the routines only (the home's routine card lists them).
    expect(BEAUTY_PRODUCTS.filter((p) => p.featured)).toEqual(routines);
    for (const r of routines) {
      const steps = routineSteps(r.sku).map((sku) => BEAUTY_PRODUCTS.find((p) => p.sku === sku)!);
      expect(steps.length, r.sku).toBeGreaterThanOrEqual(3);
      expect(r.priceCents, r.sku).toBe(steps.reduce((n, p) => n + p.priceCents, 0));
      expect(r.salePriceCents!, r.sku).toBeLessThan(r.priceCents);
      for (const p of steps) expect(r.description, r.sku).toContain(p.name);
      expect(r.skins.length).toBe(1);
    }
    // A routine for each skin type.
    expect(routines.map((r) => r.skins[0])).toEqual(expect.arrayContaining(SKIN_TYPES.map((s) => s.name)));
    expect(BEAUTY_FLASH_SALE.skus.every((sku) => BEAUTY_PRODUCTS.some((p) => p.sku === sku))).toBe(true);
    expect(BEAUTY_COUPON.code).toBe(BEAUTY_COUPON_CODE);
  });

  it("has its photos (CC0, credited) where the looks and its products take them", () => {
    const credits = JSON.parse(readFileSync(join(ROOT, "public/beauty-photos/CREDITS.json"), "utf8")) as { file: string; license: string; page: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(BEAUTY_PHOTO_NAMES.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(c.page).toMatch(/^https:\/\/stocksnap\.io\/photo\//);
      expect(existsSync(join(ROOT, "public/beauty-photos", c.file)), c.file).toBe(true);
    }
    for (const p of BEAUTY_PRODUCTS) for (const photo of p.photos) expect(isShopPhoto(`bt-${photo}`), photo).toBe(true);
    expect(mediaAddress(`${appUrl()}/beauty-photos/foundation.jpg`)).toBe(`${appUrl()}/beauty-photos/foundation.jpg`);
    expect(readFileSync(join(ROOT, "next.config.ts"), "utf8")).toContain("./public/beauty-photos/*.jpg");
  });

  it("names its skin types, brands and the looks' categories in the app's words as the shop names them", () => {
    const words: [AppWord, string][] = [
      ["btSkinDry", "Dry"],
      ["btSkinCombination", "Combination"],
      ["btSkinOily", "Oily"],
      ["btSkinSensitive", "Sensitive"],
      ["btBrandRose", "Rosé Lab"],
      ["btBrandNoor", "Noor Skin"],
      ["btBrandVela", "Vela"],
      ["btBrandAura", "Maison Aura"],
      ["btBrandNaqa", "Naqa Lab"],
      ["btBrandPure", "Pure Formula"],
      ["btCatBathSalts", "Bath salts"],
      ["btCatCandles", "Scented candles"],
      ["btCatLips", "Lips"],
      ["btCatPerfume", "Women's perfume"],
      ["btCatRoutines", "Routines"],
      ["btCatSerums", "Serums"],
      ["btCatMoisturisers", "Moisturisers"],
      ["btCatSunscreen", "Sunscreen"],
      ["btCatCleansers", "Cleansers"],
    ];
    const byName = new Map(BEAUTY_CATEGORIES.flatMap((c) => [c, ...c.subs]).map((c) => [c.name, c]));
    for (const [word, name] of words) {
      const c = byName.get(name)!;
      expect(APP_WORDS.en[word], word).toBe(c.name);
      expect(APP_WORDS.ar[word], word).toBe(c.names.ar);
      expect(APP_WORDS.tr[word], word).toBe(c.names.tr);
    }
  });
});

describe("209 Velours, the cosmetics shop's demo", () => {
  it("is a Studio demo of the store kind, told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(BEAUTY_DEMO);
    expect(isStoreTemplateDemo(BEAUTY_DEMO)).toBe(true);
    expect(demoKind(BEAUTY_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.beauty).toBe("beauty");
    expect(demoIdOf({ appType: "store", vertical: null, design: "beauty_signature_a" })).toBe(BEAUTY_DEMO);
    expect(DEMO_BRANDS.beauty.appName).toBe("Velours");
    expect(DEMO_GUIDES.beauty.screens).toEqual(["velours-home", "velours-menu", "velours-product"]);
  });

  describe("the demo app on the hosted API", () => {
    let store: MemoryStore;
    let app: App;
    beforeEach(async () => {
      clearPlatformSettingsCache();
      store = new MemoryStore();
      const result = await setupDemoApps(deps(store), [BEAUTY_DEMO]);
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

    /** A GET of `route` (its `{...}` the `params` in order), checked against the contract unless `contract` is false (a page with the 209 elements, until the contract has them). */
    async function call(route: string, query: Record<string, string> = {}, lang = "en", params: string[] = [], contract = true): Promise<HostedResult> {
      let i = 0;
      const path = route.replace(/\{[^}]+\}/g, () => params[i++]!);
      const result = await handleHosted(context(), { method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams({ platform: "android", ...query }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) });
      if (contract) expectContract("GET", route, result);
      else expect(result.status).toBe(200);
      return result;
    }

    it("keeps its categories, skin types and brands, its products and settings, its flash deals and code", async () => {
      expect(app.design).toBe("beauty_signature_c");
      expect(app.catalogSettings?.currency).toBe("AED");
      expect(app.catalogSettings?.returnDays).toBe(BEAUTY_COMMERCE.returnDays);
      const categories = await store.listCatalogCategories(app.id);
      expect(categories).toHaveLength(BEAUTY_CATEGORIES.length + BEAUTY_CATEGORIES.reduce((n, c) => n + c.subs.length, 0));
      const skin = categories.find((c) => c.name === "Skin type")!;
      expect(categories.find((c) => c.name === "Oily")?.parentId).toBe(skin.id);
      expect(categories.find((c) => c.name === "Oily")?.names).toEqual({ ar: "دهنية", tr: "Yağlı" });
      const products = await store.listCatalogProducts(app.id);
      expect(products).toHaveLength(BEAUTY_PRODUCTS.length);
      expect(products.every((p) => productDetails(p)?.badges?.includes("genuine"))).toBe(true);
      expect(await store.getCatalogCouponByCode(app.id, BEAUTY_COUPON.code)).toBeTruthy();
      const sale = (await store.listFlashSales(app.id)).find((f) => f.title === BEAUTY_FLASH_SALE.title)!;
      expect(sale.productIds).toHaveLength(BEAUTY_FLASH_SALE.skus.length);
      expect(sale.endsAt.getTime()).toBeGreaterThan(NOW.getTime());
    });

    it("serves the skin types and brands with their products, and a product's shades, ingredients, how to use, facts and expiry", async () => {
      const listed = (await call("/store/categories")).body as { items: { id: number; name: string; count: number; parent_id: number | null }[] };
      const skin = listed.items.find((c) => c.name === "Skin type")!;
      const oily = listed.items.find((c) => c.name === "Oily")!;
      expect(oily.parent_id).toBe(skin.id);
      expect(oily.count).toBe(BEAUTY_PRODUCTS.filter((p) => p.skins.includes("Oily")).length);
      const vela = listed.items.find((c) => c.name === "Vela")!;
      const inVela = (await call("/store/products", { category: String(vela.id), per_page: "50" })).body as { items: unknown[] };
      expect(inVela.items).toHaveLength(BEAUTY_PRODUCTS.filter((p) => p.brand === "Vela").length);
      // In Arabic, as the shop named them.
      const arabic = (await call("/store/categories", {}, "ar")).body as { items: { name: string }[] };
      expect(arabic.items.map((c) => c.name)).toEqual(expect.arrayContaining(["نوع البشرة", "مختلطة", "روزيه لاب"]));
      const foundation = (await store.listCatalogProducts(app.id)).find((p) => p.sku === "BT-201")!;
      const detail = (await call("/store/products/{product_id}", {}, "en", [String(foundation.id)])).body as {
        attributes: { name: string; variation?: boolean; options: { value: string; swatch?: string }[] }[];
        info?: { kind: string; text: string }[];
        badges?: string[];
        expiry?: string;
        variations: { stock_status: string }[];
      };
      const shade = detail.attributes.find((a) => a.name === "Shade")!;
      expect(shade.options.find((o) => o.value === "3W")?.swatch).toBe("#D7A887");
      expect(shade.options.every((o) => /^#[0-9A-F]{6}$/.test(o.swatch ?? ""))).toBe(true);
      expect(detail.attributes.find((a) => a.name === "Brand")?.options[0]?.value).toBe("Rosé Lab");
      expect(detail.info?.map((i) => i.kind)).toEqual(["ingredients", "how_to_use"]);
      expect(detail.badges).toEqual(["genuine", "cruelty_free"]);
      expect(detail.expiry).toBe("2027-10");
      expect(detail.variations.some((v) => v.stock_status === "out_of_stock")).toBe(true);
    });

    it("serves the category menu (the skin types' and brands' rows too) and the skin quiz, its results opening their categories", async () => {
      const menu = (await call("/pages/{slug}", {}, "en", [MENU_PAGE])).body as { studio: { body: StudioNode } };
      const rows = (allNodes({ body: menu.studio.body }).find((n) => n.type === "categories" && n.style === "rows") as unknown as { categories: { name: string; children: { name: string }[] }[] }).categories;
      expect(rows.map((r) => r.name)).toEqual(BEAUTY_CATEGORIES.map((c) => c.name));
      expect(rows.find((r) => r.name === "Skin type")!.children.map((c) => c.name)).toEqual(["Dry", "Combination", "Oily", "Sensitive"]);
      // 224 The demo is template C: the menu's skin types each open their category.
      const listed = (await call("/store/categories")).body as { items: { id: number; name: string }[] };
      const id = (name: string) => String(listed.items.find((c) => c.name === name)!.id);
      for (const skin of ["Dry", "Combination", "Oily", "Sensitive"]) expect(allNodes({ body: menu.studio.body }).find((n) => n.name === skin)!.action, skin).toMatchObject({ type: "screen", screen: "search", category_id: id(skin) });
      // Its skin test is on the home.
      const home = (await call("/pages/{slug}", {}, "en", ["home"], false)).body as { studio: { body: StudioNode } };
      const node = allNodes({ body: home.studio.body }).find((n) => n.type === "quiz")!;
      expect(node.entries!.map((e) => e.action?.category_id)).toEqual([id("Dry"), id("Combination"), id("Oily"), id("Sensitive")]);
      expect(node.quiz!.questions).toHaveLength(4);
      // In Arabic, the results by their Arabic names open the same categories.
      const ar = (await call("/pages/{slug}", {}, "ar", ["home"], false)).body as { studio: { body: StudioNode } };
      const arNode = allNodes({ body: ar.studio.body }).find((n) => n.type === "quiz")!;
      expect(arNode.entries!.map((e) => e.title)).toEqual(["جافة", "مختلطة", "دهنية", "حساسة"]);
      expect(arNode.entries!.map((e) => e.action?.category_id)).toEqual([id("Dry"), id("Combination"), id("Oily"), id("Sensitive")]);
    });
  });
});

describe("209 Velours's two looks: VELOURS and NAQA LAB", () => {
  const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
    let n = 0;
    return { brand: "#6D1B3B", source: "products", app: "Velours", lang, w: appWords(lang, "Velours"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `bt-${++n}` };
  };
  const storeApp = { appType: "store" as const, backend: "hosted" as const, vertical: null };
  const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
  const icons = (page: StudioPage) => allNodes(page).flatMap((n) => [n.icon, ...(n.entries ?? []).map((e) => e.icon)]).filter((i): i is string => Boolean(i));

  it.each(["a", "b"] as const)("look %s: the header's menu, the compact hero, the shade finder, the skin quiz, the routine, the flash deals and the trust strip", (look) => {
    const d = signatureDesign(BEAUTY_DEMO, look)!;
    const home = d.home(ctx());
    expect(home.header?.buttons).toEqual(["menu", "notifications", "cart"]);
    expect(home.header?.menu_page).toBe(MENU_PAGE);
    // The checker takes it (alone, its own pages' links open the shop: the checker knows no pages here).
    const parsed = parseStudioPage(d.home({ ...ctx(), ownPages: false }), storeApp, languages);
    expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    const nodes = allNodes(home);
    // 9 to 12 tight sections: the column's direct parts, a title and its list counting once.
    const parts = home.body.children!.filter((n) => !(n.type === "row" && n.cross === "end"));
    expect(parts.length).toBeGreaterThanOrEqual(9);
    expect(parts.length).toBeLessThanOrEqual(12);
    const hero = nodes.find((n) => n.type === "slider")!;
    expect(hero.height).toBe(210);
    expect(hero.per_view).toBeGreaterThan(1);
    const shades = nodes.find((n) => n.type === "swatches")!;
    expect(shades.entries).toHaveLength(8);
    expect(shades.entries!.filter((e) => e.highlight).map((e) => e.subtitle)).toEqual(["3W"]);
    expect(shades.entries!.every((e) => /^#[0-9A-F]{6}$/.test(e.color ?? ""))).toBe(true);
    expect(shades.text && shades.title).toBeTruthy();
    const quiz = nodes.find((n) => n.type === "quiz")!;
    expect(quiz.entries!.map((e) => e.title)).toEqual(["Dry", "Combination", "Oily", "Sensitive"]);
    expect(quiz.entries!.every((e) => e.action?.type === "screen" && e.action.screen === "search")).toBe(true);
    for (const q of quiz.quiz!.questions) {
      // As many answers as results, in each of Studio's languages.
      expect(q.text!.split("\n")).toHaveLength(4);
      for (const l of ["ar", "tr"] as const) expect((q.translations?.[l] as { text: string }).text.split("\n")).toHaveLength(4);
    }
    // The ready-made routines: the shop's featured products, at their prices before and now.
    const routines = nodes.find((n) => n.type === "items" && n.query?.featured)!;
    expect(routines.card && allNodes({ body: routines.card }).map((n) => n.bind)).toEqual(expect.arrayContaining(["price", "was_price", "title", "image"]));
    expect(nodes.some((n) => n.type === "tabs" && n.children?.length === 2)).toBe(true);
    expect(nodes.some((n) => n.type === "flash_sale")).toBe(true);
    expect(nodes.some((n) => n.type === "row" && n.children?.some((c) => c.name === "100% genuine"))).toBe(true);
    expect(nodes.some((n) => n.action?.type === "page" && n.action.page_slug === QUIZ_PAGE)).toBe(true);
    for (const icon of icons(home)) expect(ICON_NAMES, icon).toContain(icon);
  });

  it.each(["a", "b"] as const)("look %s: the category menu, the skin quiz page, the shop, cart and orders, the bar and five tabs", (look) => {
    const d = signatureDesign(BEAUTY_DEMO, look)!;
    const pages = d.pages!(ctx());
    expect(pages.map((p) => p.slug)).toEqual([MENU_PAGE, QUIZ_PAGE]);
    for (const page of d.pages!({ ...ctx(), ownPages: false })) {
      const parsed = parseStudioPage(page.studio, storeApp, languages);
      expect(parsed.ok ? [] : parsed.errors, page.slug).toEqual([]);
      for (const icon of icons(page.studio)) expect(ICON_NAMES, icon).toContain(icon);
    }
    const menu = allNodes(pages[0]!.studio);
    expect(menu.find((n) => n.type === "categories" && n.style === "rows")?.category_menu?.look).toBe(look === "a" ? "label" : "lead");
    expect(menu.flatMap((n) => (n.action?.type === "screen" ? [n.action.screen] : []))).toEqual(expect.arrayContaining(["account", "orders", "settings", "search"]));
    expect(menu.some((n) => n.action?.type === "page" && n.action.page_slug === QUIZ_PAGE)).toBe(true);
    expect(allNodes(pages[1]!.studio).filter((n) => n.type === "quiz")).toHaveLength(1);
    for (const screen of ["search", "cart", "orders"]) expect(d.over(screen, ctx())?.length, screen).toBeGreaterThan(0);
    expect(d.over("cart", ctx())!.find((n) => n.type === "coupon")?.code).toBe(BEAUTY_COUPON_CODE);
    expect(d.bar.design).toBe("float");
    const tabs = d.tabs!([
      { id: "home", label: "Home", icon: "home", target: { type: "page", page_slug: "home" } },
      { id: "shop", label: "Products", icon: "storefront", target: { type: "screen", screen: "search" } },
      { id: "cart", label: "Basket", icon: "shopping_cart", target: { type: "screen", screen: "cart" } },
      { id: "account", label: "Account", icon: "person", target: { type: "screen", screen: "account" } },
    ]);
    expect(tabs.map((t) => t.label)).toEqual(["Home", "Shop", "Cart", "Orders", "Account"]);
  });

  it("writes the quiz's and the shades' words in Arabic and Turkish too", () => {
    for (const lang of LANGS) {
      const home = signatureDesign(BEAUTY_DEMO, "a")!.home(ctx(lang));
      const quiz = allNodes(home).find((n) => n.type === "quiz")!;
      const others = LANGS.filter((l) => l !== lang);
      for (const l of others) {
        expect(quiz.translations?.[l]?.text, l).toBe(APP_WORDS[l].btQuizTitle);
        for (const e of quiz.entries!) expect((e.translations?.[l] as { title: string }).title, l).toBeTruthy();
      }
      const shades = allNodes(home).find((n) => n.type === "swatches")!;
      expect(shades.entries!.find((e) => e.highlight)?.title).toBe(APP_WORDS[lang].btShade4);
    }
  });

  it("opens the categories its parts are named after: the brands' marks, the rituals and the skin types", () => {
    const home = signatureDesign(BEAUTY_DEMO, "a")!.home(ctx());
    const subs = [
      { id: 41, name: "Vela" },
      { id: 42, name: "Bath salts" },
      { id: 43, name: "Dry" },
    ];
    const linked = allNodes({ body: withShopCategoriesIn(home.body, { list: [{ id: 1, name: "Skincare" }], own: false, subs }) });
    expect(linked.find((n) => n.name === "Vela")?.action?.category_id).toBe("41");
    expect(linked.find((n) => n.name === "Bath salts")?.action?.category_id).toBe("42");
    expect(linked.find((n) => n.type === "quiz")?.entries?.[0]?.action?.category_id).toBe("43");
    // Without the sub-categories (an older list), the shop.
    const plain = allNodes({ body: withShopCategoriesIn(home.body, { list: [{ id: 1, name: "Skincare" }], own: false }) });
    expect(plain.find((n) => n.name === "Vela")?.action?.category_id).toBeUndefined();
  });

  it("are new ready sections of the editor's library, for any store, each one the page checker takes", () => {
    expect(BEAUTY_SECTIONS.length).toBeGreaterThanOrEqual(15);
    for (const s of BEAUTY_SECTIONS) {
      expect(SECTIONS.some((x) => x.id === s.id), s.id).toBe(true);
      expect(s.id.startsWith("bt_")).toBe(true);
      expect(s.isNew).toBe(true);
      expect(s.fits).toEqual({ types: ["store"], plain: true });
      const made = s.make({ ...ctx(), w: (word) => `[${word}]` });
      expect(parseStudioPage({ header: null, body: { id: "root", type: "column", children: [made] } }, storeApp, languages), s.id).toMatchObject({ ok: true });
      // On its own in any store's page, never a link to a page the store doesn't have.
      expect(allNodes({ body: s.make({ ...ctx(), ownPages: false }) }).some((n) => n.action?.type === "page"), s.id).toBe(false);
    }
  });

  it("starts a project from NAQA LAB with Velours's products as samples, their shades and details", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Naqa", email: "owner@naqa.test", whatsapp: "+971500000000", siteUrl: "", password: null }, NOW);
    const naqa = TEMPLATES.find((t) => t.id === "beauty_signature_b")!;
    const made = await makeStudioProject(store, { clientId: client.id, name: "Naqa Lab", kind: kindById("store")!, source: "catalog", template: naqa, words: appWords("en", "Naqa Lab"), lang: "en" }, NOW);
    const app = (await store.getAppById(made.id))!;
    expect(app.design).toBe("beauty_signature_b");
    const products = await store.listCatalogProducts(app.id);
    expect(products.length).toBe(BEAUTY_PRODUCTS.length);
    expect(products.every((p) => p.sample)).toBe(true);
    const foundation = products.find((p) => p.name === "Velvet cushion foundation SPF 25")!;
    expect(productDetails(foundation)?.swatches?.["3W"]).toBe("#D7A887");
    expect(foundation.variants?.attributes[0]?.name).toBe("Shade");
    expect((await store.listCatalogCategories(app.id)).some((c) => c.name === "Skin type")).toBe(true);
  });
});
