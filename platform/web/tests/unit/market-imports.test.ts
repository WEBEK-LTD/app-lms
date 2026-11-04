import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import type { App } from "@/lib/data/types";
import { applyCatalogImport, planCatalogImport, readAmount, readUnit, suggestMapping, vendorProducts } from "@/lib/market/catalog-import";
import { readSheet } from "@/lib/market/sheets/read";
import { readSheetUrl } from "@/lib/market/sheets/url";
import { writeXlsx } from "@/lib/market/xlsx";
import { NOW } from "./helpers";
import { writeXls } from "./support/xls-writer";

const HEADER = ["Name", "SKU", "Barcode", "Price", "Old price", "Unit", "Stock", "Department", "Aisle", "Image"];
const ROWS: (string | number)[][] = [
  ["Bananas", "FR-001", "6221234567890", "35.50", "40", "kg", 120, "Fresh", "Fruit", "https://cdn.example.com/banana.jpg"],
  ["لبن كامل الدسم ١ لتر", "DA-010", "6229876543210", 42, "", "item", 0, "Dairy", "Milk", ""],
  ["Çay 500 g", "DR-200", "", "1.234,50", "", "pcs", 15, "Drinks", "", ""],
];
const asText = (rows: (string | number)[][]) => rows.map((r) => r.map((c) => String(c)));

/** A real deflated .xlsx (the writer's parts, compressed), so both ZIP methods are read. */
function deflatedXlsx(rows: (string | number)[][]): Uint8Array {
  const stored = writeXlsx([{ name: "Products", rows }]);
  // Re-pack the stored ZIP's files with deflate.
  const view = new DataView(stored.buffer, stored.byteOffset, stored.byteLength);
  const files: { name: string; data: Uint8Array }[] = [];
  for (let at = 0; view.getUint32(at, true) === 0x04034b50; ) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = new TextDecoder().decode(stored.subarray(at + 30, at + 30 + nameLength));
    files.push({ name, data: stored.subarray(at + 30 + nameLength, at + 30 + nameLength + size) });
    at += 30 + nameLength + size;
  }
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = new TextEncoder().encode(f.name);
    const data = deflateRawSync(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(8, 8, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(10, 8, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, f.data.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Uint8Array(Buffer.concat([...parts, ...central, new Uint8Array(end.buffer)]));
}

describe("115.8 catalog files", () => {
  const expected = { columns: HEADER, rows: asText(ROWS) };

  it("reads CSV, TSV (and semicolons), JSON, .xlsx stored and deflated, and .xls", () => {
    const csv = [HEADER, ...ROWS].map((r) => r.map((c) => (/[,"]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : String(c))).join(",")).join("\r\n");
    expect(readSheet(new TextEncoder().encode("﻿" + csv), "p.csv")).toEqual(expected);
    expect(readSheet(new TextEncoder().encode([HEADER, ...ROWS].map((r) => r.join("\t")).join("\n")), "p.tsv")).toEqual(expected);
    expect(readSheet(new TextEncoder().encode([HEADER, ...ROWS].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n")), "p.csv")).toEqual(expected);
    const json = JSON.stringify({ products: ROWS.map((r) => Object.fromEntries(HEADER.map((h, i) => [h, r[i]]))) });
    expect(readSheet(new TextEncoder().encode(json), "p.json")).toEqual(expected);
    expect(readSheet(writeXlsx([{ name: "Products", rows: [HEADER, ...ROWS] }]), "p.xlsx")).toEqual(expected);
    expect(readSheet(deflatedXlsx([HEADER, ...ROWS]), "p.xlsx")).toEqual(expected);
    expect(readSheet(writeXls([HEADER, ...ROWS]), "p.xls")).toEqual(expected);
    expect(readSheet(writeXls([HEADER, ...ROWS], { labels: true }), "p.xls")).toEqual(expected);
  });

  it(".xls: a big shared-string table split across records, in the regular stream", () => {
    const rows: (string | number)[][] = [["Name", "Price", "Stock"]];
    for (let i = 0; i < 400; i++) rows.push([`Product ${i} ${"ق".repeat(i % 7)} with a long name`, (i * 1.25).toFixed(2), i]);
    const table = readSheet(writeXls(rows, { sstMax: 500 }), "p.xls");
    expect(table.rows).toHaveLength(400);
    expect(table.rows[399]).toEqual([`Product 399 ${"ق".repeat(399 % 7)} with a long name`, "498.75", "399"]);
    expect(table.rows[3]).toEqual([`Product 3 ${"ق".repeat(3)} with a long name`, "3.75", "3"]);
  });

  it("reads a Google Sheet's link as its CSV through the safe fetch", async () => {
    let asked = "";
    const fetcher = (async (url: string) => {
      asked = url;
      return new Response("Name,Price\nRice 1 kg,55\n", { headers: { "content-type": "text/csv" } });
    }) as typeof fetch;
    const table = await readSheetUrl("https://docs.google.com/spreadsheets/d/abc123/edit#gid=7", { fetcher });
    expect(asked).toBe("https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=7");
    expect(table).toEqual({ columns: ["Name", "Price"], rows: [["Rice 1 kg", "55"]] });
    const page = (async () => new Response("<!doctype html><html></html>", { headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    await expect(readSheetUrl("https://example.com/list", { fetcher: page })).rejects.toThrow(/web page/);
  });

  it("refuses empty files and pages", () => {
    expect(() => readSheet(new Uint8Array(), "x.csv")).toThrow(/empty/);
    expect(() => readSheet(new TextEncoder().encode("\n\n"), "x.csv")).toThrow(/no rows/);
    expect(() => readSheet(new TextEncoder().encode("not json ["), "x.json")).toThrow(/JSON/);
  });
});

describe("115.8 columns, rows and their errors", () => {
  it("guesses the columns in English, Arabic and Turkish", () => {
    expect(suggestMapping(HEADER)).toEqual({ name: 0, sku: 1, barcode: 2, price: 3, wasPrice: 4, unit: 5, stock: 6, department: 7, aisle: 8, imageUrl: 9 });
    expect(suggestMapping(["اسم المنتج", "السعر", "الباركود", "القسم", "المخزون"])).toMatchObject({ name: 0, price: 1, barcode: 2, department: 3, stock: 4 });
    expect(suggestMapping(["Ürün Adı", "Fiyat", "Stok Kodu", "Barkod", "Kategori"])).toMatchObject({ name: 0, price: 1, sku: 2, barcode: 3, department: 4 });
  });

  it("reads amounts in any currency's decimals and the usual ways of writing them", () => {
    expect(readAmount("35.50", "EGP")).toBe(3550);
    expect(readAmount("1.234,50", "TRY")).toBe(123450);
    expect(readAmount("1,234.50", "USD")).toBe(123450);
    expect(readAmount("EGP 25", "EGP")).toBe(2500);
    expect(readAmount("2,5", "EUR")).toBe(250);
    expect(readAmount("1,500", "EGP")).toBe(150000);
    expect(readAmount("1.250", "KWD")).toBe(1250);
    expect(readAmount("300", "JPY")).toBe(300);
    expect(readAmount("abc", "EGP")).toBeNull();
    expect(readUnit("كيلو")).toBe("kg");
    expect(readUnit("adet")).toBe("item");
    expect(readUnit("box")).toBeNull();
  });

  it("plans each row: new, an update by SKU or barcode, or its errors, keeping what the file doesn't say", () => {
    const table = { columns: [...HEADER], rows: [...asText(ROWS), ["", "X-1", "", "10", "", "", "", "", "", ""], ["Milk again", "DA-010", "", "abc", "", "box", "", "", "", "ftp://x"], ["Bread", "", "6221234567890", "8", "", "", "", "Bakery", "", ""]] };
    const existing = [
      { id: 7, sku: "FR-001", barcode: "6221234567890", imageAssetId: "asset-banana", tags: ["fruit"], position: 3 },
      { id: 9, sku: null, barcode: "6220000000001" },
    ];
    const plan = planCatalogImport(table, suggestMapping(HEADER), { currency: "EGP", existing });
    expect(plan.counts).toEqual({ create: 2, update: 1, skip: 3 });
    const banana = plan.rows[0]!;
    expect(banana).toMatchObject({ line: 2, action: "update", existingId: 7, department: "Fresh", aisle: "Fruit" });
    expect(banana.product).toMatchObject({ price: 3550, wasPrice: 4000, unit: "kg", step: 0.25, stock: 120, inStock: true, imageAssetId: "asset-banana", tags: ["fruit"], position: 3, imageUrl: "https://cdn.example.com/banana.jpg" });
    expect(plan.rows[1]!.product).toMatchObject({ name: "لبن كامل الدسم ١ لتر", price: 4200, stock: 0, inStock: false, wasPrice: null });
    expect(plan.rows[2]!.product).toMatchObject({ price: 123450, unit: "item", step: 1 });
    expect(plan.rows[3]).toMatchObject({ action: "skip", errors: ["The name is missing."] });
    expect(plan.rows[4]!.errors).toEqual(['The price "abc" isn\'t an amount.', 'The unit "box" isn\'t one of: item, kg, g, l.', 'The SKU "DA-010" is also on row 3.', "The picture should be a link starting with https://."]);
    // The banana's barcode again, on a row without a SKU: the same product twice in one file.
    expect(plan.rows[5]).toMatchObject({ action: "skip", errors: ['The barcode "6221234567890" is also on row 2.'] });
    expect(plan.departments).toEqual(["Fresh", "Dairy", "Drinks"]);
    expect(plan.aisles).toEqual([["Fresh", "Fruit"], ["Dairy", "Milk"]]);
    // A barcode alone updates the product that has it.
    const byBarcode = planCatalogImport({ columns: ["Name", "Barcode", "Price"], rows: [["Sugar 1 kg", "6220000000001", "30"]] }, { name: 0, barcode: 1, price: 2 }, { currency: "EGP", existing });
    expect(byBarcode.rows[0]).toMatchObject({ action: "update", existingId: 9 });
  });

  it("saves the good rows with their departments and aisles, and imports again as updates", async () => {
    const store = new MemoryStore();
    const { client } = await registerClient(store, { name: "Souk", email: "imports@market.test", whatsapp: "+905446731947", siteUrl: "", password: null }, NOW);
    const app: App = { ...newApp(client.id, null, NOW, "food"), backend: "hosted" };
    await store.createApp(app);
    const vendor = await store.createRestaurant(
      { appId: app.id, name: "Fresh Basket", description: null, logoAssetId: null, coverAssetId: null, cuisines: [], address: { address: "Maadi", details: null, lat: 29.96, lng: 31.25 }, phone: null, hours: [], prepMinutes: 15, minOrderCents: 0, maxKm: null, commissionBp: 800, active: true, position: 0, kind: "grocery" },
      { sections: [], nextId: 1 },
      NOW,
    );
    const table = readSheet(writeXls([HEADER, ...ROWS]), "p.xls");
    const first = await applyCatalogImport(store, app.id, vendor.id, planCatalogImport(table, suggestMapping(table.columns), { currency: "EGP", existing: await vendorProducts(store, app.id, vendor.id) }), NOW);
    expect(first).toEqual({ created: 3, updated: 0, skipped: 0, departments: 3, aisles: 2 });
    const products = await vendorProducts(store, app.id, vendor.id);
    const departments = await store.listMarketDepartments(app.id, vendor.id);
    const aisles = await store.listMarketAisles(app.id, vendor.id);
    const banana = products.find((p) => p.sku === "FR-001")!;
    expect(banana.departmentId).toBe(departments.find((d) => d.name === "Fresh")!.id);
    expect(banana.aisleId).toBe(aisles.find((a) => a.name === "Fruit")!.id);
    // A new price list: only prices and stock columns. Everything else stays.
    const prices = { columns: ["SKU", "Price", "Stock"], rows: [["FR-001", "33", "80"], ["DA-010", "45", "12"]] };
    const second = await applyCatalogImport(store, app.id, vendor.id, planCatalogImport(prices, { sku: 0, price: 1, stock: 2 }, { currency: "EGP", existing: await vendorProducts(store, app.id, vendor.id) }), NOW);
    expect(second).toMatchObject({ created: 0, updated: 0, skipped: 2 });
    // The name is needed; with it the rows update in place.
    const named = { columns: ["SKU", "Name", "Price", "Stock"], rows: [["FR-001", "Bananas", "33", "80"], ["DA-010", "Milk", "45", "12"]] };
    const third = await applyCatalogImport(store, app.id, vendor.id, planCatalogImport(named, { sku: 0, name: 1, price: 2, stock: 3 }, { currency: "EGP", existing: await vendorProducts(store, app.id, vendor.id) }), NOW);
    expect(third).toMatchObject({ created: 0, updated: 2, departments: 0, aisles: 0 });
    const after = (await vendorProducts(store, app.id, vendor.id)).find((p) => p.sku === "FR-001")!;
    expect(after).toMatchObject({ price: 3300, stock: 80, unit: "kg", aisleId: banana.aisleId, departmentId: banana.departmentId, imageUrl: "https://cdn.example.com/banana.jpg", wasPrice: 4000 });
  });

  it("50,000 rows: read and planned in a few seconds", () => {
    const lines = ["Name,SKU,Barcode,Price,Unit,Stock,Department,Aisle"];
    for (let i = 0; i < 50_000; i++) lines.push(`Product ${i},SKU-${i},${String(6220000000000 + i)},${(i % 500) + 0.5},${i % 3 === 0 ? "kg" : "item"},${i % 50},Department ${i % 20},Aisle ${i % 7}`);
    const started = Date.now();
    const table = readSheet(new TextEncoder().encode(lines.join("\n")), "big.csv");
    const plan = planCatalogImport(table, suggestMapping(table.columns), { currency: "EGP", existing: [] });
    expect(table.rows).toHaveLength(50_000);
    expect(plan.counts).toEqual({ create: 50_000, update: 0, skip: 0 });
    expect(plan.departments).toHaveLength(20);
    expect(plan.aisles).toHaveLength(140);
    expect(Date.now() - started).toBeLessThan(10_000);
    const xlsx = writeXlsx([{ name: "Big", rows: [lines[0]!.split(","), ...lines.slice(1, 20_001).map((l) => l.split(","))] }]);
    expect(readSheet(xlsx, "big.xlsx").rows).toHaveLength(20_000);
  });
});
