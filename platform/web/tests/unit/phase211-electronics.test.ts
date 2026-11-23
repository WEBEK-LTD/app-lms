import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import { demoIdOf, demoKind, DEMO_SLUGS, ELECTRONICS_DEMO, isStoreTemplateDemo, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { ELECTRONICS_ACCESSORIES, ELECTRONICS_CATEGORIES, ELECTRONICS_PRODUCTS, ELECTRONICS_TRADE_IN, electronicsMainOf, electronicsVariants } from "@/lib/demo/electronics";
import { electronicsPartsForSamples } from "@/lib/demo/electronics-entries";
import { ELECTRONICS_PHOTO_NAMES, isShopPhoto } from "@/lib/demo/shop-photos";
import { mediaAddress } from "@/lib/pages/validate";
import { isSpecKey } from "@/lib/selling/specs";
import { techOf, tradeInEstimate } from "@/lib/selling/tech";
import { appWords, APP_WORDS } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { COMPARE_PAGE, ELECTRONICS_SECTIONS, MENU_PAGE, TRADE_PAGE } from "@/lib/studio/demo-designs/electronics-signature";
import { EL_AR, EL_EN, EL_TR } from "@/lib/studio/demo-designs/electronics-words";
import { showsInstallmentsSoon } from "@/lib/studio/installments";
import { liabilityDue } from "@/lib/studio/liability";
import { SECTIONS, TEMPLATES, templatesFor, type SectionContext } from "@/lib/studio/sections";
import { shopTypeById, shopTypeOfDesign, shopTypeReady, shopTypeTemplate } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { appUrl } from "@/lib/env";
import { NOW } from "./helpers";

/**
 * 211 Studio's electronics type (Madar, مدار): ready on /start and Studio's
 * new project, its liability notice (warranty and returns) and
 * "Installments coming soon" only; its demo's products with their keyed
 * specifications, colours and storages (each storage its own price), more
 * cover to add, matching accessories and trade-in; its photos CC0 and
 * credited; its two looks A (MADAR) and B (NABD), whole store projects
 * using the tech elements (trade-in, compare, the spec table).
 */

const ROOT = join(__dirname, "../..");
/** Whether a colour is an orange (hue 15° to 45°, saturated, neither near black nor near white). */
function orange(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  if (max === min || light < 0.25 || light > 0.85) return false;
  const sat = (max - min) / (1 - Math.abs(2 * light - 1));
  if (sat < 0.5 || max !== r) return false;
  const hue = (60 * ((g - b) / (max - min)) + 360) % 360;
  return hue >= 15 && hue <= 45;
}

const REAL_BRANDS = /\b(apple|iphone|ipad|macbook|samsung|galaxy|sony|playstation|xbox|nintendo|huawei|xiaomi|lg|dell|lenovo|asus|acer|hp|canon|nikon|dji|bose|beats|jbl|airpods|philips|bosch|nespresso|delonghi)\b/i;

describe("211 the electronics type", () => {
  it("is ready, its two looks a store's templates, its notice the warranty one and installments only coming soon", () => {
    const t = shopTypeById("electronics")!;
    expect(shopTypeReady(t)).toBe(true);
    expect(t.demo).toBe(ELECTRONICS_DEMO);
    expect(t.liability).toBe("warranty");
    expect(showsInstallmentsSoon("electronics")).toBe(true);
    expect(shopTypeTemplate(t)).toBe("electronics_signature_a");
    expect(shopTypeTemplate(t, "b")).toBe("electronics_signature_b");
    const store = templatesFor({ type: "store", vertical: null }).map((x) => x.id);
    expect(store).toEqual(expect.arrayContaining(["electronics_signature_a", "electronics_signature_b"]));
    expect(shopTypeOfDesign("electronics_signature_b")?.id).toBe("electronics");
    expect(liabilityDue({ section: "studio", design: "electronics_signature_a", liabilityAccepted: null })?.kind).toBe("warranty");
  });
});

describe("211 Madar, the electronics shop's demo", () => {
  it("is a Studio demo of the store kind, told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(ELECTRONICS_DEMO);
    expect(isStoreTemplateDemo(ELECTRONICS_DEMO)).toBe(true);
    expect(demoKind(ELECTRONICS_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.electronics).toBe("electronics");
    expect(demoIdOf({ appType: "store", vertical: null, design: "electronics_signature_a" })).toBe(ELECTRONICS_DEMO);
    expect(DEMO_BRANDS.electronics.appName).toBe("Madar");
    expect(DEMO_GUIDES.electronics.screens).toEqual(["madar-home", "madar-menu", "madar-product"]);
  });

  it("has its photos (CC0, credited) where the looks and its products take them", () => {
    const credits = JSON.parse(readFileSync(join(ROOT, "public/electronics-photos/CREDITS.json"), "utf8")) as { file: string; license: string; page: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(ELECTRONICS_PHOTO_NAMES.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(c.page).toMatch(/^https:\/\/stocksnap\.io\/photo\//);
      expect(existsSync(join(ROOT, "public/electronics-photos", c.file)), c.file).toBe(true);
    }
    for (const p of ELECTRONICS_PRODUCTS) for (const photo of p.photos) expect(isShopPhoto(`el-${photo}`), photo).toBe(true);
    expect(mediaAddress(`${appUrl()}/electronics-photos/phone-camera.jpg`)).toBe(`${appUrl()}/electronics-photos/phone-camera.jpg`);
    // The looks' photos are the set's.
    const ctx: SectionContext = { brand: "#2F5BEA", source: "products", app: "Madar", lang: "en", w: appWords("en", "Madar"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => "x" };
    for (const look of ["a", "b"] as const) {
      const urls = JSON.stringify(signatureDesign(ELECTRONICS_DEMO, look)!.home(ctx)).match(/\/electronics-photos\/[a-z0-9-]+\.jpg/g) ?? [];
      expect(urls.length).toBeGreaterThan(3);
      for (const u of urls) expect(existsSync(join(ROOT, "public", u)), u).toBe(true);
    }
  });

  it("sells desirable products of fictional brands, each with keyed specifications and a warranty", () => {
    expect(ELECTRONICS_PRODUCTS.length).toBeGreaterThanOrEqual(35);
    expect(new Set(ELECTRONICS_PRODUCTS.map((p) => p.sku)).size).toBe(ELECTRONICS_PRODUCTS.length);
    for (const p of ELECTRONICS_PRODUCTS) {
      expect(p.name, p.sku).not.toMatch(REAL_BRANDS);
      expect(p.description, p.sku).not.toMatch(REAL_BRANDS);
      expect(["ZENRA", "ARCLINE", "VELLO", "KOVA", "AUREL", "LUMORA", "RYOKU", "HAUSEN"]).toContain(p.brand);
      expect(p.specs.length, p.sku).toBeGreaterThan(0);
      for (const s of p.specs) expect(isSpecKey(s.key), `${p.sku} ${s.label}`).toBe(true);
      expect(p.specs.some((s) => s.key === "warranty"), p.sku).toBe(true);
      expect(() => electronicsMainOf(p.sub)).not.toThrow();
    }
    // Every category and sub-category named in Arabic and Turkish, each sub-category with products.
    for (const c of ELECTRONICS_CATEGORIES) {
      expect(c.names.ar && c.names.tr).toBeTruthy();
      for (const s of c.subs) expect(ELECTRONICS_PRODUCTS.some((p) => p.sub === s.name), s.name).toBe(true);
    }
    expect(ELECTRONICS_CATEGORIES.map((c) => c.name)).toContain(ELECTRONICS_ACCESSORIES);
  });

  it("prices each storage of a phone on its own, colours and storages as its variations, the sale's share kept", () => {
    const x1 = ELECTRONICS_PRODUCTS.find((p) => p.sku === "EL-101")!;
    const v = electronicsVariants(x1, 0, (c) => c)!;
    expect(v.attributes.map((a) => a.name)).toEqual(["Colour", "Storage"]);
    expect(v.items.length).toBe(5 * 3);
    const tb = v.items.find((i) => i.values[1] === "1 TB")!;
    expect(tb.priceCents).toBe(6399_00);
    expect(tb.salePriceCents).toBeNull();
    // A TV on sale: every size keeps the share off.
    const tv = ELECTRONICS_PRODUCTS.find((p) => p.sku === "EL-401")!;
    const sizes = electronicsVariants(tv, 0, (c) => c)!;
    const big = sizes.items.find((i) => i.values[0] === "65″")!;
    expect(big.priceCents).toBe(10499_00);
    expect(big.salePriceCents).toBe(8999_00);
    // One to choose: no variations.
    expect(electronicsVariants(ELECTRONICS_PRODUCTS.find((p) => p.sku === "EL-602")!, 0, (c) => c)).toBeNull();
  });

  it("takes trade-ins at the shop's prices, a share for each grade", () => {
    expect(tradeInEstimate(ELECTRONICS_TRADE_IN, "ZENRA X9 Pro", "256 GB", "good")).toBe(1530_00);
    expect(tradeInEstimate(ELECTRONICS_TRADE_IN, "ZENRA X9 Pro", "256 GB", "like_new")).toBe(1800_00);
    expect(tradeInEstimate(ELECTRONICS_TRADE_IN, "VELLO S7", "1 TB", "good")).toBeNull();
  });

  it("starts a project from NABD with Madar's products as samples, its accessories and trade-in", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Nabd", email: "owner@nabd.test", whatsapp: "+966500000000", siteUrl: "", password: null }, NOW);
    const nabd = TEMPLATES.find((t) => t.id === "electronics_signature_b")!;
    const made = await makeStudioProject(store, { clientId: client.id, name: "Nabd Tech", kind: kindById("store")!, source: "catalog", template: nabd, words: appWords("en", "Nabd Tech"), lang: "en" }, NOW);
    const app = (await store.getAppById(made.id))!;
    expect(app.design).toBe("electronics_signature_b");
    const products = await store.listCatalogProducts(app.id);
    expect(products.length).toBe(ELECTRONICS_PRODUCTS.length);
    expect(products.every((p) => p.sample && (p.specs?.length ?? 0) > 0)).toBe(true);
    expect(products.find((p) => p.name === "ZENRA X1 Pro")?.optionGroups?.[0]?.options.length).toBe(2);
    const tech = techOf(app)!;
    expect(tech.tradeIn?.models.length).toBe(ELECTRONICS_TRADE_IN.models.length);
    const categories = await store.listCatalogCategories(app.id);
    expect(categories.find((c) => c.id === tech.accessoriesCategoryId)?.name).toBe(ELECTRONICS_ACCESSORIES);
    // An own trade-in is kept when the samples come again.
    await store.updateApp(app.id, { catalogSettings: { ...app.catalogSettings!, tech: { ...tech, tradeIn: { models: [{ name: "Own", storages: [{ label: "64 GB", cents: 100_00 }] }], grades: ELECTRONICS_TRADE_IN.grades } } } }, NOW);
    await electronicsPartsForSamples({ store, now: NOW }, (await store.getAppById(app.id))!);
    expect((await store.getAppById(app.id))!.catalogSettings?.tech?.tradeIn?.models[0]?.name).toBe("Own");
  });
});

describe("211 Madar's two looks: MADAR and NABD", () => {
  const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
    let n = 0;
    return { brand: "#2F5BEA", source: "products", app: "Madar", lang, w: appWords(lang, "Madar"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `el-${++n}` };
  };

  it.each(["a", "b"] as const)("look %s: a whole store with the menu, trade-in, compare and installments coming soon", (look) => {
    const d = signatureDesign(ELECTRONICS_DEMO, look)!;
    const home = d.home(ctx());
    expect(home.header?.buttons).toEqual(["menu", "notifications", "cart"]);
    expect(home.header?.menu_page).toBe(MENU_PAGE);
    const nodes = allNodes(home);
    const hero = nodes.find((n) => n.type === "slider")!;
    expect(hero.height).toBe(210);
    expect(hero.per_view).toBeGreaterThan(1);
    expect(nodes.some((n) => n.type === "flash_sale")).toBe(true);
    // The tech elements: the trade-in card (its tap the trade-in flow) and two products compared.
    const trade = nodes.find((n) => n.type === "trade_in")!;
    expect(trade.tech?.look).toBe("card");
    expect(trade.action).toEqual({ type: "screen", screen: "search", flow: "trade_in" });
    expect(nodes.some((n) => n.type === "compare")).toBe(true);
    // Installments: a soon tile, never a way to pay.
    expect(JSON.stringify(home)).toContain(appWords("en", "Madar")("elSoon"));
    const pages = d.pages!(ctx());
    expect(pages.map((p) => p.slug)).toEqual([MENU_PAGE, TRADE_PAGE, COMPARE_PAGE]);
    expect(allNodes(pages[0]!.studio).find((n) => n.type === "categories" && n.style === "rows")?.category_menu?.look).toBe(look === "a" ? "lead" : "label");
    expect(allNodes(pages[1]!.studio).find((n) => n.type === "trade_in")?.tech?.look).toBe("full");
    expect(allNodes(pages[2]!.studio).map((n) => n.type)).toEqual(expect.arrayContaining(["compare", "spec_table"]));
    expect(d.bar.design).toBe("float");
    expect(d.tabs!([]).length).toBeGreaterThan(0);
    // No orange anywhere in the look.
    const colours = JSON.stringify([home, ...pages.map((p) => p.studio)]).match(/#[0-9A-F]{6}\b/gi) ?? [];
    expect(colours.filter(orange)).toEqual([]);
  });

  it("has every word in the app's three languages, Arabic and Turkish their own", () => {
    for (const key of Object.keys(EL_EN) as (keyof typeof EL_EN)[]) {
      expect(APP_WORDS.ar[key], key).toBe(EL_AR[key]);
      expect(APP_WORDS.tr[key], key).toBe(EL_TR[key]);
      if (!/^\{app\}$|4K|HDR|120 Hz/.test(EL_EN[key])) expect(EL_AR[key], key).not.toBe(EL_EN[key]);
    }
  });

  it("are new ready sections of the editor's library, for any store", () => {
    for (const s of ELECTRONICS_SECTIONS) {
      expect(s.isNew).toBe(true);
      expect(s.fits?.types).toEqual(["store"]);
      expect(SECTIONS).toContain(s);
      expect(s.make(ctx())).toBeTruthy();
    }
    expect(ELECTRONICS_SECTIONS.map((s) => s.id)).toEqual(expect.arrayContaining(["el_trade_in", "el_trade_in_full", "el_compare", "el_spec_table"]));
  });
});
