import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { kindById } from "@/lib/app/kinds";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import { PC_PARTS, type App, type PcPart, type ProductSpec } from "@/lib/data/types";
import { COMPUTERS_DEMO, demoIdOf, demoKind, DEMO_SLUGS, isStoreTemplateDemo, STUDIO_DEMO_TYPES } from "@/lib/demo/constants";
import { COMPUTERS_CATEGORIES, COMPUTERS_PC_STEPS, COMPUTERS_PRODUCTS, computersMainOf, computersVariants } from "@/lib/demo/computers";
import { DEMO_BRANDS, DEMO_GUIDES } from "@/lib/demo/content";
import { COMPUTERS_PHOTO_NAMES, isShopPhoto } from "@/lib/demo/shop-photos";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { mediaAddress, parseStudioPage } from "@/lib/pages/validate";
import { STUDIO_TECH_TYPES, type StudioPage } from "@/lib/pages/types";
import { isSpecKey, specValue } from "@/lib/selling/specs";
import { buildWatts, checkBuild, techOf } from "@/lib/selling/tech";
import { appWords } from "@/lib/studio/app-words";
import { signatureDesign } from "@/lib/studio/demo-designs";
import { BUILD_PAGE, COMPUTERS_SECTIONS, MENU_PAGE, SPECS_PAGE } from "@/lib/studio/demo-designs/computers-signature";
import { showsInstallmentsSoon } from "@/lib/studio/installments";
import { SECTIONS, TEMPLATES, type SectionContext } from "@/lib/studio/sections";
import { shopTypeById, shopTypeOfDesign, shopTypeReady, shopTypesIn, shopTypeTemplate } from "@/lib/studio/shop-types";
import { makeStudioProject } from "@/lib/studio/new-project";
import { allNodes } from "@/lib/studio/tree";
import { appUrl } from "@/lib/env";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { KEY, NOW } from "./helpers";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";

/**
 * 211 Studio's computers and gaming type, Nawah: the type made ready, its
 * demo (its categories, products with their specifications and options,
 * and the parts Build your PC checks), its photos, its two looks A (NAWAH)
 * and B (SILICA) and their pages, made of the tech elements.
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

const seed = (sku: string) => COMPUTERS_PRODUCTS.find((p) => p.sku === sku)!;
const build = (parts: Partial<Record<PcPart, string>>): Partial<Record<PcPart, ProductSpec[]>> => Object.fromEntries(Object.entries(parts).map(([part, sku]) => [part, seed(sku!).specs]));

describe("211 the computers type, ready", () => {
  it("is selectable in Shopping & stores, with the warranty notice and installments coming soon only", () => {
    const type = shopTypeById("computers")!;
    expect(shopTypeReady(type)).toBe(true);
    expect(type.demo).toBe(COMPUTERS_DEMO);
    expect(type.liability).toBe("warranty");
    expect(showsInstallmentsSoon("computers")).toBe(true);
    expect(shopTypesIn("shopping").map((t) => t.id)).toContain("computers");
    expect(shopTypeTemplate(type, "b")).toBe("computers_signature_b");
    expect(shopTypeOfDesign("computers_signature_a")?.id).toBe("computers");
    expect(TEMPLATES.filter((t) => t.id.startsWith("computers_signature_")).map((t) => t.id)).toEqual(["computers_signature_c", "computers_signature_d", "computers_signature_a", "computers_signature_b"]);
  });
});

describe("211 Nawah, the computers shop's demo", () => {
  it("is a Studio demo of the store kind, told apart by its look A, at its own address", () => {
    expect(STUDIO_DEMO_TYPES).toContain(COMPUTERS_DEMO);
    expect(isStoreTemplateDemo(COMPUTERS_DEMO)).toBe(true);
    expect(demoKind(COMPUTERS_DEMO)).toMatchObject({ engine: "store", vertical: null });
    expect(DEMO_SLUGS.computers).toBe("computers");
    expect(demoIdOf({ appType: "store", vertical: null, design: "computers_signature_a" })).toBe(COMPUTERS_DEMO);
    expect(DEMO_BRANDS.computers.appName).toBe("Nawah");
    expect(DEMO_GUIDES.computers.screens).toEqual(["nawah-home", "nawah-menu", "nawah-product"]);
  });

  it("has its photos (CC0, credited) where the looks and its products take them", () => {
    const credits = JSON.parse(readFileSync(join(ROOT, "public/computers-photos/CREDITS.json"), "utf8")) as { file: string; license: string; page: string }[];
    expect(credits.map((c) => c.file).sort()).toEqual(COMPUTERS_PHOTO_NAMES.map((n) => `${n}.jpg`).sort());
    for (const c of credits) {
      expect(c.license).toBe("CC0 1.0");
      expect(c.page).toMatch(/^https:\/\/stocksnap\.io\/photo\//);
      expect(existsSync(join(ROOT, "public/computers-photos", c.file)), c.file).toBe(true);
    }
    for (const p of COMPUTERS_PRODUCTS) for (const photo of p.photos) expect(isShopPhoto(`pc-${photo}`), photo).toBe(true);
    // The looks' photos too.
    const sig = readFileSync(join(ROOT, "src/lib/studio/demo-designs/computers-signature.ts"), "utf8");
    for (const [, name] of sig.matchAll(/P\("([a-z0-9-]+)"\)/g)) expect((COMPUTERS_PHOTO_NAMES as readonly string[]).includes(name!), name).toBe(true);
    expect(mediaAddress(`${appUrl()}/computers-photos/lap-chart.jpg`)).toBe(`${appUrl()}/computers-photos/lap-chart.jpg`);
  });

  it("gives every product its specifications, the known ones keyed, and the laptops and builds their options", () => {
    expect(COMPUTERS_PRODUCTS.length).toBeGreaterThanOrEqual(45);
    expect(new Set(COMPUTERS_PRODUCTS.map((p) => p.sku)).size).toBe(COMPUTERS_PRODUCTS.length);
    for (const p of COMPUTERS_PRODUCTS) {
      expect(p.specs.length, p.sku).toBeGreaterThan(1);
      for (const s of p.specs) if (s.key) expect(isSpecKey(s.key), `${p.sku} ${s.key}`).toBe(true);
      expect(() => computersMainOf(p.sub)).not.toThrow();
    }
    // Laptops are filterable by processor, graphics, memory and storage.
    for (const p of COMPUTERS_PRODUCTS.filter((x) => computersMainOf(x.sub).name === "Laptops")) for (const key of ["cpu", "gpu", "ram", "storage"] as const) expect(specValue(p.specs, key), `${p.sku} ${key}`).not.toBeNull();
    const ofuq = computersVariants(seed("PC-101"))!;
    expect(ofuq.attributes.map((a) => a.name)).toEqual(["Memory", "Storage"]);
    expect(ofuq.items).toHaveLength(4);
    // Each step up its own price.
    expect(ofuq.items.find((v) => v.values.join() === "64 GB,2 TB")!.priceCents).toBe(seed("PC-101").priceCents + (1200 + 700) * 100);
    expect(computersVariants(seed("PC-401"))).toBeNull();
  });

  it("has the parts Build your PC checks: a build that fits, and each mismatch said", () => {
    const fits = build({ cpu: "PC-401", board: "PC-411", ram: "PC-421", gpu: "PC-431", storage: "PC-442", cooler: "PC-451", psu: "PC-462", case: "PC-471" });
    expect(checkBuild(fits)).toEqual([]);
    expect(buildWatts(fits)).toBe(550);
    // A K9 (LG-18) on an AM-X board.
    expect(checkBuild(build({ cpu: "PC-403", board: "PC-411" }))).toEqual([{ part: "board", with: "cpu", reason: "socket" }]);
    // DDR4 memory on a DDR5 board.
    expect(checkBuild(build({ cpu: "PC-401", board: "PC-411", ram: "PC-422" }))).toEqual([{ part: "ram", with: "board", reason: "memory" }]);
    // The K9 and the GX 490 on 550 W.
    expect(checkBuild(build({ cpu: "PC-403", board: "PC-413", gpu: "PC-432", psu: "PC-461" }))).toEqual([{ part: "psu", with: "gpu", reason: "power" }]);
    // An ATX board in a Micro-ATX case.
    expect(checkBuild(build({ board: "PC-411", case: "PC-472" }))).toEqual([{ part: "case", with: "board", reason: "size" }]);
    // The LG-18 build fits too, with DDR4 and the big supply.
    expect(checkBuild(build({ cpu: "PC-403", board: "PC-413", ram: "PC-422", gpu: "PC-432", cooler: "PC-451", psu: "PC-463", case: "PC-471" }))).toEqual([]);
    expect(COMPUTERS_PC_STEPS.map((s) => s.part)).toEqual([...PC_PARTS]);
  });

  describe("made by Admin › Demo apps", () => {
    let store: MemoryStore;
    let app: App;
    beforeAll(async () => {
      clearPlatformSettingsCache();
      store = new MemoryStore();
      const result = await setupDemoApps(deps(store), [COMPUTERS_DEMO]);
      app = (await store.getAppById(result.apps[0]!.appId))!;
    });

    it("keeps its categories and sub-categories, its products with their specs, and Build your PC by its categories", async () => {
      expect(app.design).toBe("computers_signature_a");
      expect(app.catalogSettings?.currency).toBe("SAR");
      expect(app.catalogSettings?.returnDays).toBe(14);
      const categories = await store.listCatalogCategories(app.id);
      expect(categories).toHaveLength(COMPUTERS_CATEGORIES.length + COMPUTERS_CATEGORIES.reduce((n, c) => n + c.subs.length, 0));
      const parts = categories.find((c) => c.name === "PC parts")!;
      expect(categories.find((c) => c.name === "Processors")?.parentId).toBe(parts.id);
      expect(parts.names).toEqual({ ar: "القطع والمكونات", tr: "Bilgisayar parçaları" });
      const products = await store.listCatalogProducts(app.id);
      expect(products).toHaveLength(COMPUTERS_PRODUCTS.length);
      expect(products.find((p) => p.sku === "PC-401")?.specs).toEqual(seed("PC-401").specs);
      const tech = techOf(app)!;
      expect(tech.pcBuilder?.steps.map((s) => s.part)).toEqual([...PC_PARTS]);
      expect(tech.pcBuilder?.steps.find((s) => s.part === "cpu")?.categoryId).toBe(categories.find((c) => c.name === "Processors")!.id);
      expect(tech.pcBuilder?.steps.filter((s) => !s.required).map((s) => s.part)).toEqual(["cooler", "case"]);
      expect(tech.accessoriesCategoryId).toBe(categories.find((c) => c.name === "Keyboards & mice")!.id);
      expect(tech.tradeIn).toBeNull();
    });

    it("runs its hour deals and its code", async () => {
      const sales = await store.listFlashSales(app.id);
      expect(sales.find((s) => s.title === "Hour deals")?.productIds.length).toBe(4);
      expect(await store.getCatalogCouponByCode(app.id, "NAWAH10")).not.toBeNull();
    });
  });
});

describe("211 Nawah's two looks: NAWAH and SILICA", () => {
  const ctx = (lang: "en" | "ar" | "tr" = "en"): SectionContext => {
    let n = 0;
    return { brand: "#2F5BEA", source: "products", app: "Nawah", lang, w: appWords(lang, "Nawah"), picture: (f) => `${appUrl()}/design-pictures/${f}`, newId: () => `pc-${++n}` };
  };

  it.each(["a", "b"] as const)("look %s: the menu, the compact hero, Build your PC, the spec filters and its pages", (look) => {
    const d = signatureDesign(COMPUTERS_DEMO, look)!;
    for (const lang of ["en", "ar", "tr"] as const) {
      const home = d.home(ctx(lang));
      expect(home.header?.buttons).toContain("menu");
      expect(home.header?.menu_page).toBe(MENU_PAGE);
      const nodes = allNodes(home);
      const hero = nodes.find((n) => n.type === "slider")!;
      expect(hero.height).toBe(210);
      expect(hero.per_view).toBeGreaterThan(1);
      expect(nodes.some((n) => n.type === "pc_builder")).toBe(true);
      expect(nodes.some((n) => n.type === "spec_filter")).toBe(true);
      expect(nodes.some((n) => n.type === "flash_sale")).toBe(true);
      // A button that starts Build your PC (the shop in an older app).
      expect(nodes.some((n) => n.action?.flow === "pc_builder" && n.action.screen === "search")).toBe(true);
      // Installments: coming soon only.
      expect(nodes.some((n) => n.name === appWords(lang, "Nawah")("installmentsSoon"))).toBe(true);
      // Every word in the page's language.
      expect(JSON.stringify(home)).not.toMatch(/"pc[A-Z]\w+"/);
    }
    const nodes = allNodes(d.home(ctx()));
    if (look === "b") {
      expect(nodes.some((n) => n.type === "compare")).toBe(true);
      expect(nodes.some((n) => n.type === "spec_table")).toBe(true);
    }
    const pages = d.pages!(ctx());
    expect(pages.map((p) => p.slug)).toEqual([MENU_PAGE, BUILD_PAGE, SPECS_PAGE]);
    const menu = allNodes(pages[0]!.studio).find((n) => n.type === "categories" && n.style === "rows")!;
    expect(menu.category_menu?.look).toBe(look === "a" ? "lead" : "label");
    const specs = allNodes(pages[2]!.studio).filter((n) => n.type === "spec_filter").map((n) => n.tech?.spec);
    expect(specs).toEqual(["cpu", "gpu", "ram", "storage"]);
    const opens = allNodes(pages[0]!.studio).flatMap((n) => (n.action?.type === "screen" ? [n.action.screen] : []));
    expect(opens).toEqual(expect.arrayContaining(["account", "orders", "settings"]));
    expect(d.bar.design).toBe("float");
    expect(d.tabs!([]).length).toBeGreaterThan(0);
  });

  it.each(["a", "b"] as const)("look %s: its home and pages pass the page checker", (look) => {
    const d = signatureDesign(COMPUTERS_DEMO, look)!;
    const app = { appType: "store" as const, backend: "hosted" as const, vertical: null };
    const languages = { default: "en" as const, available: ["en" as const, "ar" as const, "tr" as const] };
    const own = [MENU_PAGE, BUILD_PAGE, SPECS_PAGE];
    // Its links open its own pages (made with it), which the checker of a page alone doesn't know: checked here, then left out.
    const alone = (page: StudioPage): StudioPage => {
      const copy = structuredClone(page);
      for (const n of allNodes(copy)) {
        if (n.action?.type === "page") {
          expect(own).toContain(n.action.page_slug);
          n.action = { type: "screen", screen: "search" };
        }
      }
      return copy;
    };
    expect(parseStudioPage(alone(d.home(ctx())), app, languages)).toEqual(expect.objectContaining({ ok: true }));
    for (const page of d.pages!(ctx())) expect(parseStudioPage(alone(page.studio), app, languages), page.slug).toEqual(expect.objectContaining({ ok: true }));
  });

  it("are new ready sections of the editor, for any store, made of the tech elements", () => {
    for (const s of COMPUTERS_SECTIONS) {
      expect(s.isNew).toBe(true);
      expect(s.fits).toEqual({ types: ["store"], plain: true });
      expect(SECTIONS).toContain(s);
    }
    const made = COMPUTERS_SECTIONS.flatMap((s) => allNodes({ body: s.make(ctx()) }).map((n) => n.type));
    for (const type of STUDIO_TECH_TYPES.filter((t) => t !== "trade_in")) expect(made, type).toContain(type);
  });

  it("starts a project from SILICA with Nawah's products as samples and Build your PC by its own categories", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Silica", email: "owner@silica.test", whatsapp: "+966500000000", siteUrl: "", password: null }, NOW);
    const silica = TEMPLATES.find((t) => t.id === "computers_signature_b")!;
    const made = await makeStudioProject(store, { clientId: client.id, name: "Silica PC", kind: kindById("store")!, source: "catalog", template: silica, words: appWords("en", "Silica PC"), lang: "en" }, NOW);
    const app = (await store.getAppById(made.id))!;
    expect(app.design).toBe("computers_signature_b");
    const products = await store.listCatalogProducts(app.id);
    expect(products.length).toBe(COMPUTERS_PRODUCTS.length);
    expect(products.every((p) => p.sample)).toBe(true);
    const categories = await store.listCatalogCategories(app.id);
    expect(techOf(app)?.pcBuilder?.steps.find((s) => s.part === "psu")?.categoryId).toBe(categories.find((c) => c.name === "Power supplies")!.id);
    // Its home's memory chips are served through the store's real connector, which 212's shop features wrap.
    const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
    const connector = connectorFor(app, KEY, { store, assetUrl, platformUrl: "https://yallapp.test" })!;
    const home = await handleHosted({ store, app, active: true, now: NOW, ip: "203.0.113.11", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl, platformUrl: "https://yallapp.test", connector, preview: { draft: true } }, { method: "GET", path: ["pages", "home"], query: new URLSearchParams({ platform: "android" }), body: undefined, token: null });
    expect(home.status).toBe(200);
    const filter = allNodes((home.body as { studio: StudioPage }).studio).find((n) => n.type === "spec_filter");
    expect(filter?.tech_served?.spec).toMatchObject({ key: "ram", label: "Memory" });
    expect(filter?.tech_served?.spec?.values[0]).toEqual({ value: "32 GB DDR5", count: 5 });
  });
});
