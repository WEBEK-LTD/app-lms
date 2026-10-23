import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_BOOKING_SETUP, DEFAULT_COURSE_SETUP, type App } from "@/lib/data/types";
import { applyImport } from "@/lib/import/apply";
import { categoryNames, mapColumns, normalizeHeader, planImport, plainText } from "@/lib/import/plan";
import { ImportSourceError, readImportUrl, sheetCsvUrl } from "@/lib/import/source";
import { ImportFormatError, parseCsv, parseFeed, parseImport } from "@/lib/import/table";
import { NOW } from "./helpers";

/** 81.4 Import for apps without a connector: products, services, menus and courses from a CSV file or a feed. */

describe("81.4 reading a file", () => {
  it("reads CSV as spreadsheets save it: commas or semicolons, quotes, line breaks in a cell, a byte order mark", () => {
    expect(parseCsv('﻿Name,Price,Description\r\n"Mug, large",120,"A mug.\nWith ""love"""\r\nTea,45,\r\n\r\n')).toEqual({
      columns: ["Name", "Price", "Description"],
      rows: [
        ["Mug, large", "120", 'A mug.\nWith "love"'],
        ["Tea", "45", ""],
      ],
    });
    // Turkish Excel: semicolons, a comma for the decimals.
    expect(parseCsv("Ürün Adı;Fiyat\nÇay;45,50").rows).toEqual([["Çay", "45,50"]]);
    expect(parseCsv("a\tb\n1\t2").rows).toEqual([["1", "2"]]);
  });

  it("says what's wrong with a file that isn't a table", () => {
    expect(() => parseCsv("")).toThrow(ImportFormatError);
    expect(() => parseCsv("just one column\nvalue")).toThrow(/header row/);
    expect(() => parseCsv(`a,b\n${"1,2\n".repeat(501)}`)).toThrow(/at most 500/);
  });

  it("reads a product feed (Google Merchant Center's RSS, and Atom)", () => {
    const rss = `<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0"><channel><title>Shop</title>
      <item><g:id>MUG-1</g:id><title>Ignored</title><g:title><![CDATA[Blue mug & saucer]]></g:title><g:description>&lt;p&gt;Hand made.&lt;/p&gt;</g:description>
      <g:price>120.00 TRY</g:price><g:sale_price>99.90 TRY</g:sale_price><g:image_link>https://shop.example/mug.jpg</g:image_link>
      <g:product_type>Home &gt; Kitchen &gt; Mugs</g:product_type><g:availability>in stock</g:availability>
      <g:shipping><g:country>TR</g:country></g:shipping></item>
      <item><g:id>TEA-1</g:id><g:title>Black tea</g:title><g:price>45 TRY</g:price><g:availability>out of stock</g:availability></item>
    </channel></rss>`;
    const table = parseImport(rss);
    const plan = planImport("products", table);
    expect(plan.missing).toEqual([]);
    expect(plan.items).toEqual([
      {
        row: 2,
        name: "Blue mug & saucer",
        values: expect.objectContaining({ sku: "MUG-1", price: "120.00 TRY", salePrice: "99.90 TRY", description: "Hand made.", category: "Home > Kitchen > Mugs", image: "https://shop.example/mug.jpg" }),
        errors: [],
      },
      { row: 3, name: "Black tea", values: expect.objectContaining({ sku: "TEA-1", stock: "0" }), errors: [] },
    ]);
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Gift card</title><link href="https://shop.example/gift"/><g:price>50 USD</g:price></entry></feed>`;
    expect(parseFeed(atom).rows[0]).toContain("Gift card");
    expect(() => parseFeed("<html><body>Not a feed</body></html>")).toThrow(/No products/);
  });
});

describe("81.4 finding the columns", () => {
  it("by their names in English, Turkish and Arabic, whatever their case", () => {
    expect(normalizeHeader("Ürün_Adı")).toBe("ürün adi");
    expect(normalizeHeader("IMAGE LINK")).toBe("image link");
    expect(mapColumns("products", ["Ürün Adı", "Fiyat", "İndirimli Fiyat", "Stok", "Kategori", "Görsel"])).toEqual({ name: 0, price: 1, salePrice: 2, stock: 3, category: 4, image: 5 });
    expect(mapColumns("products", ["اسم المنتج", "السعر", "الوصف", "الفئة"])).toEqual({ name: 0, price: 1, description: 2, category: 3 });
    // Shopify's export: "Title", "Variant Price", "Image Src", "Variant SKU".
    expect(mapColumns("products", ["Handle", "Title", "Body (HTML)", "Variant SKU", "Variant Price", "Image Src"])).toMatchObject({ name: 1, description: 2, sku: 3, image: 5 });
    expect(mapColumns("services", ["Service", "Duration (minutes)", "Price"])).toEqual({ name: 0, duration: 1, price: 2 });
    expect(mapColumns("courses", ["Course title", "Instructor", "Level", "Price"])).toEqual({ name: 0, instructor: 1, level: 2, price: 3 });
  });

  it("checks each row as the dashboard's form does, and says which columns are missing", () => {
    const plan = planImport("products", parseCsv("Name,Price,Sale price,Stock,SKU\nMug,120,99,5,M1\n,50,,,\nTea,free,,,\nCake,100,150,-1,"));
    expect(plan.items.map((i) => i.errors)).toEqual([
      [],
      ["Enter the product name."],
      ["Enter a price, like 450 or 450.50."],
      ["The sale price must be lower than the price.", "Enter a whole number, or leave it empty."],
    ]);
    expect(planImport("products", parseCsv("Name,Notes\nMug,blue")).missing).toEqual(["price"]);
    expect(planImport("services", parseCsv("Name,Duration\nCut,2000")).items[0]!.errors).toEqual(["Enter 5 to 720 minutes."]);
    expect(planImport("courses", parseCsv("Title,Price\nX,10")).items[0]!.errors).toEqual(["Enter a title of up to 120 characters."]);
  });

  it("reads HTML and categories the way shops export them", () => {
    expect(plainText("<p>One<br>two</p><p>Three &amp; four</p>")).toBe("One\ntwo\n\nThree & four");
    expect(plainText("<<b>i>x &amp;lt;b&amp;gt;")).toBe("x &lt;b&gt;");
    expect(categoryNames("Home > Kitchen > Mugs")).toEqual(["Mugs"]);
    expect(categoryNames("Tea | Coffee, Tea")).toEqual(["Tea", "Coffee"]);
  });
});

describe("81.4 saving an import", () => {
  const app = (): App => ({ ...newApp("client-1", null, NOW, "store"), connector: { kind: "catalog" } });
  const pictures = (ok = true) => {
    const asked: string[] = [];
    return { asked, savePicture: async (url: string) => (asked.push(url), ok ? `asset-${asked.length}` : null) };
  };

  it("adds products with their categories and pictures; the same file again updates them", async () => {
    const store = new MemoryStore();
    const shop = app();
    await store.createApp(shop);
    const csv = "Name,Price,Category,SKU,Image,Active\nBlue mug,120,Mugs,M1,https://shop.example/mug.jpg,yes\nTea,45,Drinks | Mugs,,https://shop.example/tea.png,draft\nBroken,,,,\n";
    const first = pictures();
    const report = await applyImport({ store, app: shop, now: NOW, savePicture: first.savePicture }, planImport("products", parseCsv(csv)));
    expect(report).toEqual({ added: 2, updated: 0, skipped: 1, pictures: { added: 2, missed: 0 } });
    const products = await store.listCatalogProducts(shop.id);
    const categories = await store.listCatalogCategories(shop.id);
    expect(categories.map((c) => c.name).sort()).toEqual(["Drinks", "Mugs"]);
    const mugs = categories.find((c) => c.name === "Mugs")!.id;
    expect(products.find((p) => p.name === "Blue mug")).toMatchObject({ priceCents: 12000, sku: "M1", categoryIds: [mugs], imageAssetIds: ["asset-1"], active: true });
    expect(products.find((p) => p.name === "Tea")).toMatchObject({ priceCents: 4500, active: false, imageAssetIds: ["asset-2"] });

    // Again, with a new price: updated by SKU (and by name without one); pictures they have stay.
    const again = pictures();
    const second = await applyImport({ store, app: shop, now: NOW, savePicture: again.savePicture }, planImport("products", parseCsv(csv.replace("Blue mug,120", "Blue mug,130"))));
    expect(second).toMatchObject({ added: 0, updated: 2, skipped: 1 });
    expect(again.asked).toEqual([]);
    expect((await store.listCatalogProducts(shop.id)).find((p) => p.sku === "M1")).toMatchObject({ priceCents: 13000, imageAssetIds: ["asset-1"] });
    expect(await store.listCatalogCategories(shop.id)).toHaveLength(2);
  });

  it("stops reading pictures after its time; those are added by hand", async () => {
    const store = new MemoryStore();
    const shop = app();
    await store.createApp(shop);
    let now = 0;
    const csv = `Name,Price,Image\n${[1, 2, 3].map((i) => `P${i},10,https://shop.example/${i}.jpg`).join("\n")}`;
    const { savePicture } = pictures();
    const report = await applyImport({ store, app: shop, now: NOW, savePicture: async (url) => ((now += 3000), savePicture(url)), budgetMs: 5000, clock: () => now }, planImport("products", parseCsv(csv)));
    expect(report).toMatchObject({ added: 3, pictures: { added: 2, missed: 1 } });
  });

  it("adds services and courses to the app's own lists", async () => {
    const store = new MemoryStore();
    const salon = { ...newApp("client-1", null, NOW, "booking"), connector: { kind: "bookings" as const }, bookingSetup: { ...DEFAULT_BOOKING_SETUP, nextId: 7, services: [{ id: 3, categoryId: null, name: "Haircut", description: "", durationMinutes: 30, priceCents: 30000, imageAssetId: null, color: null, active: true }] } };
    await store.createApp(salon);
    const services = await applyImport({ store, app: salon, now: NOW, ...pictures() }, planImport("services", parseCsv("Service,Duration,Price,Category\nhaircut,45,350,Hair\nColour,90,900,Hair\n")));
    expect(services).toMatchObject({ added: 1, updated: 1 });
    const setup = (await store.getAppById(salon.id))!.bookingSetup!;
    expect(setup.categories).toEqual([{ id: 7, name: "Hair" }]);
    expect(setup.services).toEqual([
      expect.objectContaining({ id: 3, name: "haircut", durationMinutes: 45, priceCents: 35000, categoryId: 7 }),
      expect.objectContaining({ id: 8, name: "Colour", durationMinutes: 90, priceCents: 90000, categoryId: 7 }),
    ]);
    expect(setup.nextId).toBe(9);

    const academy = { ...newApp("client-1", null, NOW, "lms"), connector: { kind: "courses" as const }, courseSetup: DEFAULT_COURSE_SETUP };
    await store.createApp(academy);
    await applyImport({ store, app: academy, now: NOW, ...pictures() }, planImport("courses", parseCsv("Course title,Price,Instructor,Level,Category\nWatercolour basics,0,Leyla Kaya,Beginner,Art\n")));
    expect((await store.getAppById(academy.id))!.courseSetup!.courses).toEqual([
      expect.objectContaining({ id: 2, title: "Watercolour basics", priceCents: 0, instructorName: "Leyla Kaya", level: "Beginner", categoryIds: [1], topics: [], active: true }),
    ]);
  });
});

describe("81.4 reading a link", () => {
  const answer = (body: string, type: string, status = 200) => (async () => new Response(body, { status, headers: { "content-type": type } })) as unknown as typeof fetch;

  it("reads a feed or a CSV, and a Google Sheet from the link people copy", async () => {
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/abc-123_X/edit#gid=42")).toBe("https://docs.google.com/spreadsheets/d/abc-123_X/export?format=csv&gid=42");
    expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/abc/edit?usp=sharing")).toBe("https://docs.google.com/spreadsheets/d/abc/export?format=csv");
    expect(sheetCsvUrl("https://shop.example/feed.xml")).toBe("https://shop.example/feed.xml");
    expect((await readImportUrl("https://shop.example/feed.csv", { fetcher: answer("Name,Price\nMug,10", "text/csv") })).rows).toEqual([["Mug", "10"]]);
    expect((await readImportUrl("https://shop.example/feed.xml", { fetcher: answer("<rss><channel><item><g:title>Mug</g:title><g:price>10 TRY</g:price></item></channel></rss>", "application/rss+xml") })).columns).toEqual(["title", "price"]);
  });

  it("says why it couldn't", async () => {
    await expect(readImportUrl("shop.example/feed", {})).rejects.toThrow(ImportSourceError);
    await expect(readImportUrl("https://shop.example/feed", { fetcher: answer("", "text/plain", 404) })).rejects.toThrow(/HTTP 404/);
    await expect(readImportUrl("https://docs.google.com/spreadsheets/d/abc/edit", { fetcher: answer("<html>Sign in</html>", "text/html") })).rejects.toThrow(/web page/);
  });
});
