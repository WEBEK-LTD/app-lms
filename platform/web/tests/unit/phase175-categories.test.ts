import { describe, expect, it } from "vitest";
import { subpageOf } from "@/app/studio/project/project-nav";
import { newApp } from "@/lib/app/setup";
import { categoryNameIn, duplicateCategory, readCategoryNames, sameCategoryName } from "@/lib/catalog/category-names";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type CatalogProductInput } from "@/lib/data/types";
import { CatalogConnector } from "@/lib/hosted/connectors/catalog";
import { NOW } from "./helpers";

/**
 * 175 Categories (report #10): a second "Ramadan gifts" is refused with a
 * warning; a category has an Arabic and a Turkish name beside its own,
 * served in the app's language (the testers' Arabic and Turkish phones
 * showed the English names); Products › Settings is in the breadcrumb.
 */
describe("175 categories: one name each, and in the customer's language", () => {
  it("the same name, whatever its spaces and case", () => {
    expect(sameCategoryName("Ramadan gifts", "  ramadan   Gifts ")).toBe(true);
    expect(sameCategoryName("Ramadan gifts", "Eid gifts")).toBe(false);
    expect(duplicateCategory([{ id: 1, name: "Ramadan gifts" }, { id: 2, name: "Roses" }], "ramadan gifts")).toEqual({ id: 1, name: "Ramadan gifts" });
    // Renaming one to its own name isn't a duplicate.
    expect(duplicateCategory([{ id: 1, name: "Ramadan gifts" }], "Ramadan gifts", 1)).toBeNull();
  });

  it("reads the names typed, and picks the one of the language", () => {
    const form: Record<string, string> = { name_ar: "  هدايا   رمضان ", name_tr: "" };
    const names = readCategoryNames((f) => form[f] ?? "");
    expect(names).toEqual({ ar: "هدايا رمضان" });
    expect(readCategoryNames(() => "")).toBeNull();
    const c = { name: "Ramadan gifts", names: { ar: "هدايا رمضان", tr: "Ramazan hediyeleri" } };
    expect(categoryNameIn(c, "ar")).toBe("هدايا رمضان");
    expect(categoryNameIn(c, "tr-TR")).toBe("Ramazan hediyeleri");
    expect(categoryNameIn(c, "en")).toBe("Ramadan gifts");
    expect(categoryNameIn({ name: "Roses", names: null }, "ar")).toBe("Roses");
  });

  it("the hosted API serves each category in the app's language", async () => {
    const store = new MemoryStore();
    const app: App = { ...newApp("c1", null, NOW, "store", null), backend: "hosted", connector: { kind: "catalog" }, catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, currency: "MAD" } };
    await store.createApp(app);
    const gifts = await store.createCatalogCategory({ appId: app.id, name: "Ramadan gifts", now: NOW, names: { ar: "هدايا رمضان" } });
    const roses = await store.createCatalogCategory({ appId: app.id, name: "Roses", now: NOW });
    await store.setCatalogCategoryNames(app.id, roses.id, { ar: "ورود", tr: "Güller" });
    const product: CatalogProductInput = { appId: app.id, name: "Atlas Roses", description: "", priceCents: 450_00, salePriceCents: null, categoryIds: [gifts.id, roses.id], imageAssetIds: [], stock: null, digital: false, featured: false, active: true, sku: null };
    const made = await store.createCatalogProduct(product, NOW);
    const connector = new CatalogConnector({ store, app, assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`, platformUrl: "https://yallapp.test" });
    const ask = async (path: string, lang: string | null) => (await connector.handle({ method: "GET", path: path.split("/").filter(Boolean), query: new URLSearchParams(), body: null, user: null, now: NOW, lang }))!.body as Record<string, unknown>;
    const names = async (lang: string | null) => ((await ask("/store/categories", lang)).items as { name: string }[]).map((c) => c.name);
    expect(await names("ar")).toEqual(["هدايا رمضان", "ورود"]);
    expect(await names("tr")).toEqual(["Ramadan gifts", "Güller"]);
    expect(await names(null)).toEqual(["Ramadan gifts", "Roses"]);
    // A product's categories, and the home's.
    expect(((await ask(`/store/products/${made.id}`, "ar")).categories as { name: string }[]).map((c) => c.name)).toEqual(["هدايا رمضان", "ورود"]);
    const home = (await ask("/store/home", "tr")).sections as { type: string; categories?: { name: string }[] }[];
    expect(home.find((s) => s.type === "categories")!.categories!.map((c) => c.name)).toEqual(["Ramadan gifts", "Güller"]);
    // Cleared: the main name again.
    await store.setCatalogCategoryNames(app.id, roses.id, null);
    expect(await names("ar")).toEqual(["هدايا رمضان", "Roses"]);
  });

  it("Products › Settings: the page under the menu's entry is the last crumb", () => {
    const subpages = [
      { href: "/studio/project/catalog/settings", label: "Settings" },
      { href: "/studio/project/catalog/categories", label: "Categories" },
    ];
    expect(subpageOf(subpages, "/studio/project/catalog", "/studio/project/catalog/settings")).toEqual({ href: "/studio/project/catalog/settings", label: "Settings" });
    expect(subpageOf(subpages, "/studio/project/catalog", "/studio/project/catalog")).toBeNull();
    expect(subpageOf(subpages, "/studio/project/catalog", "/studio/project/catalog/12")).toBeNull();
    expect(subpageOf(subpages, "/studio/project/orders", "/studio/project/orders")).toBeNull();
  });
});
