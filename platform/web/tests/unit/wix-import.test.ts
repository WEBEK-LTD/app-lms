import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { applyImport } from "@/lib/import/apply";
import { planImport } from "@/lib/import/plan";
import { ImportFormatError, parseCsv, parseImport } from "@/lib/import/table";
import { categoryFromSlug, isWixExport, readWix, WIX_MEDIA_URL, wixPicture, wixPrices, wixStock } from "@/lib/import/wix";
import { NOW } from "./helpers";

/**
 * Wix's own product export (Store Products › Export) into a shop of
 * Yallapp's own products: grouped by handle, prices the right way round,
 * variations and options, pictures in order, categories from their slugs.
 * A small made-up file with Wix's 97 columns (fixtures/wix).
 */

const FIXTURE = readFileSync(path.join(__dirname, "fixtures/wix/catalog_products.csv"), "utf8");
const media = (file: string) => `${WIX_MEDIA_URL}${file}`;

const shop = (): App => ({ ...newApp("client-1", null, NOW, "store"), connector: { kind: "catalog" } });

/** Pictures as the import keeps them: each address asked for, a WebP or AVIF original refused (it isn't PNG or JPEG). */
function pictures(refuse: (url: string) => boolean = (url) => /\.(webp|avif)$/.test(url)) {
  const asked: string[] = [];
  return { asked, savePicture: async (url: string) => (asked.push(url), refuse(url) ? null : `asset-${asked.length}`) };
}

describe("a Wix export, read", () => {
  it("is known by its header, and counted by products, not lines", () => {
    const table = parseImport(`﻿${FIXTURE.replace(/\n/g, "\r\n")}`);
    expect(table.columns).toHaveLength(97);
    expect(isWixExport(table.columns)).toBe(true);
    expect(isWixExport(["Name", "Price", "handle"])).toBe(false);
    const plan = planImport("products", table);
    expect(plan.wix).toMatchObject({ products: 4, variants: 4, pictures: 7 });
    expect(plan.items.map((i) => i.name)).toEqual(["Ceramic Vase", "Tulip Bunch", "Rose Bouquet", "Chocolate Box"]);
    expect(plan.items.every((i) => i.errors.length === 0)).toBe(true);
    // Its row is the PRODUCT row's line in the file.
    expect(plan.items.map((i) => i.row)).toEqual([2, 5, 7, 15]);
  });

  it("takes Wix's price as what's paid and the strikethrough as the price before", () => {
    expect(wixPrices("90", "120")).toEqual({ priceCents: 12000, salePriceCents: 9000 });
    expect(wixPrices("1259.1", "1399")).toEqual({ priceCents: 139900, salePriceCents: 125910 });
    expect(wixPrices("200", "")).toEqual({ priceCents: 20000, salePriceCents: null });
    // A strikethrough that isn't higher is no sale.
    expect(wixPrices("200", "150")).toEqual({ priceCents: 20000, salePriceCents: null });
    // 135.2 In the shop's currency's digits: a dinar shop's 1.250 is one and a quarter, not 1,250.
    expect(wixPrices("1.250", "1.500", "KWD")).toEqual({ priceCents: 150, salePriceCents: 125 });
    expect(wixPrices("1.250", "")).toEqual({ priceCents: 125000, salePriceCents: null });
    const { products } = readWix(parseCsv(FIXTURE));
    expect(products[1]).toMatchObject({ name: "Tulip Bunch", priceCents: 12000, salePriceCents: 9000 });
  });

  it("reads stock, shown or hidden, categories from their slugs, the description's lists, the weight", () => {
    expect([wixStock("IN_STOCK"), wixStock("OUT_OF_STOCK"), wixStock("12"), wixStock("")]).toEqual([null, 0, 12, null]);
    expect(categoryFromSlug("same-day-delivery")).toBe("Same day delivery");
    expect(categoryFromSlug("collection-parfums-1")).toBe("Collection parfums");
    expect(categoryFromSlug("romanticgifts")).toBe("Romanticgifts");
    const plan = planImport("products", parseCsv(FIXTURE));
    const [vase, tulips, roses, chocolates] = plan.items;
    expect(vase!.wix).toMatchObject({ categories: ["Gifts", "Home decor"], stock: null, active: true, weightGrams: 800, sku: "VASE-1" });
    expect(vase!.values.description).toBe("A hand-made vase for any bouquet.\n\n• Height 20 cm\n• Glazed inside");
    expect(tulips!.wix).toMatchObject({ stock: 0, active: false, categories: ["Tulips"] });
    expect(chocolates!.wix).toMatchObject({ stock: 12, categories: ["Chocolates"] });
    expect(roses!.values.description).toBe("Roses, tied by hand.\n\nDelivered the same day.");
  });

  it("makes Wix's options the variations, each VARIANT row a combination with its price, stock and SKU", () => {
    const roses = readWix(parseCsv(FIXTURE)).products[2]!;
    expect(roses.variants!.attributes).toEqual([
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Colour", values: ["Red", "White"] },
    ]);
    expect(roses.variants!.items).toEqual([
      { id: 1, values: ["Small", "Red"], priceCents: 30000, salePriceCents: null, stock: null, sku: "ROSE-S-R", active: true },
      { id: 2, values: ["Medium", "Red"], priceCents: 50000, salePriceCents: 45000, stock: null, sku: "ROSE-M-R", active: true },
      { id: 3, values: ["Large", "White"], priceCents: 60000, salePriceCents: null, stock: 3, sku: "ROSE-L-W", active: true },
      { id: 4, values: ["Small", "White"], priceCents: 30000, salePriceCents: null, stock: 0, sku: "ROSE-S-W", active: true },
    ]);
    // The product's price is its cheapest variation's.
    expect(roses).toMatchObject({ priceCents: 30000, salePriceCents: null, stock: null });
  });

  it("makes Wix's modifiers with choices the customer's options; one they type in is listed as left out", () => {
    const { products, summary } = readWix(parseCsv(FIXTURE));
    expect(products[2]!.optionGroups).toEqual([
      { id: "w1", name: "Box colour", min: 1, max: 1, options: [{ id: "w1o1", name: "White", priceDeltaCents: 0 }, { id: "w1o2", name: "Black", priceDeltaCents: 0 }] },
      { id: "w3", name: "Wrapping", min: 0, max: 1, options: [{ id: "w3o1", name: "Paper", priceDeltaCents: 0 }, { id: "w3o2", name: "Silk", priceDeltaCents: 0 }] },
    ]);
    expect(products[0]!.optionGroups).toBeNull();
    expect(summary.dropped).toEqual(
      expect.arrayContaining([
        { what: "freeText", count: 1, names: ["Card text"] },
        { what: "colourCodes", count: 1, names: ["Rose Bouquet"] },
        { what: "brand", count: 1, names: ["Tulip Bunch"] },
        { what: "cost", count: 1, names: ["Tulip Bunch"] },
        { what: "ribbon", count: 1, names: ["Tulip Bunch"] },
        { what: "altText", count: 3, names: ["Ceramic Vase", "Tulip Bunch", "Rose Bouquet"] },
      ]),
    );
    expect(summary.dropped).toHaveLength(6);
  });

  it("keeps the pictures in order on Wix's media host, with a JPEG of each to ask for when the original can't be kept", () => {
    const roses = readWix(parseCsv(FIXTURE)).products[2]!;
    expect(roses.pictures.map((p) => p.url)).toEqual([media("0a1b2c_rose0001~mv2.jpg"), media("0a1b2c_rose0002~mv2.avif"), media("0a1b2c_rose0003~mv2.png")]);
    expect(roses.pictures.map((p) => p.alt)).toEqual(["A dozen red roses", "", "In its box"]);
    expect(wixPicture("0a1b2c_rose0002~mv2.avif", "")!.jpeg).toBe(`${media("0a1b2c_rose0002~mv2.avif")}/v1/fit/w_1600,h_1600,q_90/picture.jpg`);
    expect(wixPicture("https://shop.example/a.webp", "")!.jpeg).toBeNull();
  });

  it("counts a Wix file's products against the limit of 500, never its lines", () => {
    const header = FIXTURE.split("\n")[0]!;
    const empty = header.split(",").map(() => "");
    const line = (cells: Record<number, string>) => empty.map((_, i) => cells[i] ?? "").join(",");
    const product = (n: number) => [line({ 0: `Product_${n}`, 1: "PRODUCT", 2: `Rose ${n}`, 3: "true", 11: "100" }), line({ 0: `Product_${n}`, 1: "MEDIA", 7: `r${n}~mv2.jpg` })];
    const file = (count: number) => [header, ...Array.from({ length: count }, (_, i) => product(i + 1)).flat()].join("\n");
    // 400 products in 800 lines.
    expect(planImport("products", parseCsv(file(400))).items).toHaveLength(400);
    expect(() => planImport("products", parseCsv(file(501)))).toThrow(new ImportFormatError("too_many_rows", "Import at most 500 products at a time."));
    // Any other file: still 500 rows.
    const sheet = ["Name,Price", ...Array.from({ length: 501 }, (_, i) => `Mug ${i},10`)].join("\n");
    expect(() => parseCsv(sheet)).toThrow("Import at most 500 rows at a time.");
  });
});

describe("a Wix export, imported", () => {
  it("adds the products with their categories, variations, options and pictures; the same file again updates them", async () => {
    const store = new MemoryStore();
    const app = shop();
    await store.createApp(app);
    const first = pictures();
    const report = await applyImport({ store, app, now: NOW, savePicture: first.savePicture }, planImport("products", parseCsv(FIXTURE)));
    // A WebP or AVIF original is asked for again as Wix's JPEG.
    expect(report).toEqual({ added: 4, updated: 0, skipped: 0, pictures: { added: 7, missed: 0 } });
    expect(first.asked).toContain(`${media("0a1b2c_rose0002~mv2.avif")}/v1/fit/w_1600,h_1600,q_90/picture.jpg`);
    const products = await store.listCatalogProducts(app.id);
    const categories = await store.listCatalogCategories(app.id);
    expect(categories.map((c) => c.name).sort()).toEqual(["Chocolates", "Gifts", "Home decor", "Roses", "Same day delivery", "Tulips"]);
    const byName = (name: string) => products.find((p) => p.name === name)!;
    const id = (name: string) => categories.find((c) => c.name === name)!.id;
    expect(byName("Ceramic Vase")).toMatchObject({ priceCents: 20000, salePriceCents: null, sku: "VASE-1", stock: null, active: true, weightGrams: 800, categoryIds: [id("Gifts"), id("Home decor")] });
    expect(byName("Ceramic Vase").imageAssetIds).toHaveLength(2);
    expect(byName("Tulip Bunch")).toMatchObject({ priceCents: 12000, salePriceCents: 9000, stock: 0, active: false });
    const roses = byName("Rose Bouquet");
    expect(roses.imageAssetIds).toHaveLength(3);
    expect(roses.variants!.items.map((v) => v.sku)).toEqual(["ROSE-S-R", "ROSE-M-R", "ROSE-L-W", "ROSE-S-W"]);
    expect(roses.optionGroups!.map((g) => g.name)).toEqual(["Box colour", "Wrapping"]);
    expect(byName("Chocolate Box")).toMatchObject({ stock: 12, sku: "CHOC-1" });

    // Again, a variation's price changed: each product is found again (by its SKU, a variation's SKU), none added, no picture read twice.
    const again = pictures();
    const second = await applyImport({ store, app, now: NOW, savePicture: again.savePicture }, planImport("products", parseCsv(FIXTURE.replace(",600,,", ",650,,"))));
    expect(second).toMatchObject({ added: 0, updated: 4, skipped: 0 });
    expect(again.asked).toEqual([]);
    const after = await store.listCatalogProducts(app.id);
    expect(after).toHaveLength(4);
    expect(after.find((p) => p.name === "Rose Bouquet")!.variants!.items[2]).toMatchObject({ sku: "ROSE-L-W", priceCents: 65000 });
    expect(await store.listCatalogCategories(app.id)).toHaveLength(6);
  });

  it("keeps two Wix products apart when they share a name or a SKU, on the first import and the next", async () => {
    const header = FIXTURE.split("\n")[0]!;
    const empty = header.split(",").map(() => "");
    const product = (handle: string, name: string, sku: string, price: string) => empty.map((_, i) => ({ 0: handle, 1: "PRODUCT", 2: name, 3: "true", 11: price, 22: sku })[i] ?? "").join(",");
    const file = [header, product("A", "Rose", "R1", "100"), product("B", "Rose", "R2", "200"), product("C", "Lily", "L1", "300"), product("D", "Lily white", "L1", "400")].join("\n");
    const store = new MemoryStore();
    const app = shop();
    await store.createApp(app);
    const first = await applyImport({ store, app, now: NOW, ...pictures() }, planImport("products", parseCsv(file)));
    expect(first).toMatchObject({ added: 4, updated: 0 });
    const second = await applyImport({ store, app, now: NOW, ...pictures() }, planImport("products", parseCsv(file.replace(",400,", ",450,"))));
    expect(second).toMatchObject({ added: 0, updated: 4 });
    const products = await store.listCatalogProducts(app.id);
    expect(products.map((p) => `${p.name} ${p.sku} ${p.priceCents}`).sort()).toEqual(["Lily L1 30000", "Lily white L1 45000", "Rose R1 10000", "Rose R2 20000"]);
  });

  it("adds, on the next import, the pictures a first import couldn't read", async () => {
    const store = new MemoryStore();
    const app = shop();
    await store.createApp(app);
    // Wix's host didn't answer for the roses' pictures the first time.
    const down = pictures((url) => url.includes("rose") || /\.(webp|avif)$/.test(url));
    const first = await applyImport({ store, app, now: NOW, savePicture: down.savePicture }, planImport("products", parseCsv(FIXTURE)));
    expect(first.pictures.missed).toBe(3);
    expect((await store.listCatalogProducts(app.id)).find((p) => p.name === "Rose Bouquet")!.imageAssetIds).toEqual([]);
    const up = pictures();
    await applyImport({ store, app, now: NOW, savePicture: up.savePicture }, planImport("products", parseCsv(FIXTURE)));
    expect((await store.listCatalogProducts(app.id)).find((p) => p.name === "Rose Bouquet")!.imageAssetIds).toHaveLength(3);
    // Only the pictures it lacked were read.
    expect(up.asked.every((u) => u.includes("rose"))).toBe(true);
  });
});
