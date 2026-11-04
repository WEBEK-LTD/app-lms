import type { DataStore } from "../data/store";
import type { MarketProduct, MarketProductInput, MarketUnit } from "../data/types";
import { currencyDecimals, toMinor } from "./currency";
import type { SheetTable } from "./sheets/table";

/**
 * 115.8 Importing a grocery's or shop's catalog: the file's columns matched
 * to the product's fields (guessed from their names in English, Arabic or
 * Turkish, then changed by the vendor), a preview of each row (new, an
 * update by SKU or barcode, or its errors), then the rows saved. What a
 * file doesn't say about an existing product (its picture, tags, place)
 * stays as it was. Departments and aisles are made by name as needed.
 */

export const CATALOG_FIELDS = ["name", "description", "brand", "sku", "barcode", "price", "wasPrice", "unit", "step", "maxQuantity", "stock", "inStock", "department", "aisle", "tags", "imageUrl"] as const;
export type CatalogField = (typeof CATALOG_FIELDS)[number];
export type ColumnMapping = Partial<Record<CatalogField, number>>;

const SYNONYMS: Record<CatalogField, string[]> = {
  name: ["name", "product", "product name", "title", "item", "item name", "الاسم", "اسم المنتج", "المنتج", "ad", "ürün", "ürün adı", "urun adi"],
  description: ["description", "details", "الوصف", "التفاصيل", "açıklama", "aciklama"],
  brand: ["brand", "maker", "manufacturer", "الماركة", "العلامة التجارية", "marka"],
  sku: ["sku", "code", "item code", "product code", "ref", "reference", "الكود", "كود المنتج", "stok kodu", "ürün kodu", "kod"],
  barcode: ["barcode", "ean", "gtin", "upc", "ean13", "الباركود", "باركود", "barkod"],
  price: ["price", "sale price", "selling price", "السعر", "سعر البيع", "fiyat", "satış fiyatı", "satis fiyati"],
  wasPrice: ["was price", "old price", "compare at price", "original price", "list price", "regular price", "السعر قبل الخصم", "السعر القديم", "eski fiyat", "liste fiyatı"],
  unit: ["unit", "sold by", "uom", "الوحدة", "وحدة البيع", "birim"],
  step: ["step", "increment", "الزيادة", "artış"],
  maxQuantity: ["max quantity", "max", "limit", "most", "أقصى كمية", "الحد الأقصى", "en fazla", "maksimum"],
  stock: ["stock", "quantity", "qty", "inventory", "المخزون", "الكمية", "stok", "miktar", "adet"],
  inStock: ["in stock", "available", "availability", "متوفر", "التوفر", "stokta", "mevcut"],
  department: ["department", "category", "القسم", "الفئة", "التصنيف", "kategori", "bölüm", "reyon"],
  aisle: ["aisle", "subcategory", "sub category", "الممر", "القسم الفرعي", "alt kategori", "raf"],
  tags: ["tags", "labels", "الوسوم", "etiketler"],
  imageUrl: ["image", "image url", "picture", "photo", "image link", "الصورة", "رابط الصورة", "görsel", "resim", "fotoğraf"],
};

function normal(header: string): string {
  return header.toLowerCase().replace(/[ً-ْ]/g, "").replace(/[_\-./()]+/g, " ").replace(/\s+/g, " ").trim();
}

/** The columns' best guess: an exact name first, then a name that contains one. */
export function suggestMapping(columns: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const names = columns.map(normal);
  for (const pass of ["exact", "contains"] as const) {
    for (const field of CATALOG_FIELDS) {
      if (mapping[field] !== undefined) continue;
      const i = names.findIndex((n, idx) => !used.has(idx) && SYNONYMS[field].some((s) => (pass === "exact" ? n === s : n.includes(s) && s.length > 2)));
      if (i >= 0) {
        mapping[field] = i;
        used.add(i);
      }
    }
  }
  return mapping;
}

/** "1.234,50", "1,234.50", "EGP 25", "25 ج.م" → minor units, or null. */
export function readAmount(text: string, currency: string): number | null {
  let value = text.replace(/[^\d.,-]/g, "");
  if (!value) return null;
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) value = lastComma > lastDot ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  else if (lastComma > -1) value = /,\d{1,3}$/.test(value) && value.split(",").length === 2 && !/,\d{3}$/.test(value) ? value.replace(",", ".") : value.replace(/,/g, "");
  const minor = toMinor(value, currencyDecimals(currency));
  return minor !== null && minor >= 0 ? minor : null;
}

const UNITS: [MarketUnit, string[]][] = [
  ["kg", ["kg", "kgs", "kilo", "kilogram", "kilograms", "كيلو", "كجم", "كغ", "kilogram"]],
  ["g", ["g", "gr", "gram", "grams", "جرام", "جم", "غرام", "gram"]],
  ["l", ["l", "lt", "liter", "litre", "liters", "لتر", "litre", "litr"]],
  ["item", ["item", "items", "pc", "pcs", "piece", "pieces", "each", "unit", "قطعة", "حبة", "عدد", "adet", "tane", "parça"]],
];

export function readUnit(text: string): MarketUnit | null {
  const v = normal(text);
  if (!v) return "item";
  return UNITS.find(([, words]) => words.includes(v))?.[0] ?? null;
}

export function readYesNo(text: string): boolean | null {
  const v = normal(text);
  if (["yes", "y", "true", "1", "in stock", "available", "نعم", "متوفر", "متاح", "evet", "var", "stokta"].includes(v)) return true;
  if (["no", "n", "false", "0", "out of stock", "sold out", "لا", "غير متوفر", "نفد", "hayır", "hayir", "yok", "tükendi"].includes(v)) return false;
  return null;
}

function readNumber(text: string): number | null {
  const v = text.replace(",", ".").trim();
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  return Number(v);
}

export interface PlannedRow {
  /** The row's number in the file, the header being row 1. */
  line: number;
  action: "create" | "update" | "skip";
  errors: string[];
  /** The product as it will be saved (without its department and aisle ids, given by name). */
  product: Omit<MarketProductInput, "appId" | "vendorId"> | null;
  department: string | null;
  aisle: string | null;
  /** The existing product an update changes. */
  existingId: number | null;
}

export interface CatalogPlan {
  rows: PlannedRow[];
  counts: { create: number; update: number; skip: number };
  departments: string[];
  /** "Department › Aisle" pairs. */
  aisles: [string, string][];
}

type Existing = Pick<MarketProduct, "id" | "sku" | "barcode"> & Partial<MarketProduct>;

/** Each row checked and matched to the vendor's products by SKU, else by barcode. */
export function planCatalogImport(table: SheetTable, mapping: ColumnMapping, options: { currency: string; existing: Existing[] }): CatalogPlan {
  const bySku = new Map<string, Existing>();
  const byBarcode = new Map<string, Existing>();
  for (const p of options.existing) {
    if (p.sku) bySku.set(p.sku.toLowerCase(), p);
    if (p.barcode) byBarcode.set(p.barcode, p);
  }
  const seenSku = new Map<string, number>();
  const seenBarcode = new Map<string, number>();
  const targeted = new Map<number, number>();
  const departments = new Map<string, string>();
  const aisles = new Map<string, [string, string]>();
  const rows: PlannedRow[] = [];
  const counts = { create: 0, update: 0, skip: 0 };
  const get = (row: string[], field: CatalogField) => (mapping[field] !== undefined ? (row[mapping[field]!] ?? "").trim() : "");
  const has = (field: CatalogField) => mapping[field] !== undefined;

  table.rows.forEach((row, index) => {
    const line = index + 2;
    const errors: string[] = [];
    const name = get(row, "name");
    if (!name) errors.push("The name is missing.");
    else if (name.length > 160) errors.push("The name is longer than 160 characters.");
    const priceText = get(row, "price");
    const price = priceText ? readAmount(priceText, options.currency) : null;
    if (!priceText) errors.push("The price is missing.");
    else if (price === null) errors.push(`The price "${priceText}" isn't an amount.`);
    const wasText = get(row, "wasPrice");
    const wasPrice = wasText ? readAmount(wasText, options.currency) : null;
    if (wasText && wasPrice === null) errors.push(`The price before the discount "${wasText}" isn't an amount.`);
    const unitText = get(row, "unit");
    const unit = readUnit(unitText);
    if (unit === null) errors.push(`The unit "${unitText}" isn't one of: item, kg, g, l.`);
    const stepText = get(row, "step");
    const step = stepText ? readNumber(stepText) : unit === "kg" || unit === "l" ? 0.25 : unit === "g" ? 100 : 1;
    if (step === null || step <= 0) errors.push(`The step "${stepText}" isn't a number above 0.`);
    const maxText = get(row, "maxQuantity");
    const maxQuantity = maxText ? readNumber(maxText) : null;
    if (maxText && (maxQuantity === null || maxQuantity <= 0)) errors.push(`The most "${maxText}" isn't a number above 0.`);
    const stockText = get(row, "stock");
    const stock = stockText ? readNumber(stockText) : null;
    if (stockText && stock === null) errors.push(`The stock "${stockText}" isn't a number.`);
    const inStockText = get(row, "inStock");
    const inStockValue = inStockText ? readYesNo(inStockText) : null;
    if (inStockText && inStockValue === null) errors.push(`"${inStockText}" isn't yes or no.`);
    const sku = get(row, "sku") || null;
    const barcode = get(row, "barcode").replace(/\s+/g, "") || null;
    if (barcode && !/^[\dA-Za-z-]{4,40}$/.test(barcode)) errors.push(`The barcode "${barcode}" isn't a barcode.`);
    if (sku) {
      const first = seenSku.get(sku.toLowerCase());
      if (first) errors.push(`The SKU "${sku}" is also on row ${first}.`);
      else seenSku.set(sku.toLowerCase(), line);
    }
    if (barcode) {
      const first = seenBarcode.get(barcode);
      if (first) errors.push(`The barcode "${barcode}" is also on row ${first}.`);
      else seenBarcode.set(barcode, line);
    }
    const imageText = get(row, "imageUrl");
    const imageUrl = imageText && /^https?:\/\/\S+$/i.test(imageText) ? imageText : null;
    if (imageText && !imageUrl) errors.push("The picture should be a link starting with https://.");
    const department = get(row, "department") || null;
    const aisle = department ? get(row, "aisle") || null : null;

    const existing = (sku ? bySku.get(sku.toLowerCase()) : undefined) ?? (!sku && barcode ? byBarcode.get(barcode) : undefined) ?? null;
    if (existing && !errors.length) {
      const first = targeted.get(existing.id);
      if (first) errors.push(`This is the same product as row ${first}.`);
      else targeted.set(existing.id, line);
    }
    if (errors.length) {
      rows.push({ line, action: "skip", errors, product: null, department, aisle, existingId: existing?.id ?? null });
      counts.skip++;
      return;
    }
    if (department) departments.set(department.toLowerCase(), department);
    if (department && aisle) aisles.set(`${department.toLowerCase()}\u0000${aisle.toLowerCase()}`, [department, aisle]);
    const keep = <K extends keyof MarketProduct>(key: K, fallback: MarketProduct[K]): MarketProduct[K] => (existing && existing[key] !== undefined ? (existing[key] as MarketProduct[K]) : fallback);
    const counted = stock !== null ? stock : has("stock") ? null : keep("stock", null);
    const product: Omit<MarketProductInput, "appId" | "vendorId"> = {
      departmentId: keep("departmentId", null),
      aisleId: keep("aisleId", null),
      name,
      description: has("description") ? get(row, "description") || null : keep("description", null),
      brand: has("brand") ? get(row, "brand") || null : keep("brand", null),
      sku: sku ?? keep("sku", null),
      barcode: barcode ?? keep("barcode", null),
      imageAssetId: keep("imageAssetId", null),
      imageUrl: has("imageUrl") ? imageUrl : keep("imageUrl", null),
      price: price!,
      wasPrice: has("wasPrice") ? (wasPrice !== null && wasPrice > price! ? wasPrice : null) : keep("wasPrice", null),
      unit: has("unit") ? unit! : keep("unit", unit!),
      step: has("step") || !existing ? step! : keep("step", step!),
      maxQuantity: has("maxQuantity") ? maxQuantity : keep("maxQuantity", null),
      stock: counted,
      inStock: inStockValue ?? (counted !== null ? counted > 0 : keep("inStock", true)),
      tags: has("tags") ? get(row, "tags").split(/[,،;|]/).map((t) => t.trim()).filter(Boolean).slice(0, 20) : keep("tags", []),
      position: keep("position", index),
    };
    rows.push({ line, action: existing ? "update" : "create", errors: [], product, department, aisle, existingId: existing?.id ?? null });
    counts[existing ? "update" : "create"]++;
  });
  return { rows, counts, departments: [...departments.values()], aisles: [...aisles.values()] };
}

/** Every product of the vendor, for matching (pages of 1,000). */
export async function vendorProducts(store: DataStore, appId: string, vendorId: number): Promise<MarketProduct[]> {
  const out: MarketProduct[] = [];
  for (let page = 1; ; page++) {
    const { items, total } = await store.listMarketProducts({ appId, vendorId, page, perPage: 1000 });
    out.push(...items);
    if (items.length === 0 || out.length >= total) return out;
  }
}

/** Saves the plan's good rows, making the departments and aisles they name. */
export async function applyCatalogImport(store: DataStore, appId: string, vendorId: number, plan: CatalogPlan, now: Date): Promise<{ created: number; updated: number; skipped: number; departments: number; aisles: number }> {
  const departments = await store.listMarketDepartments(appId, vendorId);
  const deptId = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
  let madeDepartments = 0;
  for (const name of plan.departments) {
    if (deptId.has(name.toLowerCase())) continue;
    const made = await store.saveMarketDepartment({ id: null, appId, vendorId, name: name.slice(0, 80), imageAssetId: null, position: deptId.size });
    if (made) {
      deptId.set(name.toLowerCase(), made.id);
      madeDepartments++;
    }
  }
  const aisleId = new Map((await store.listMarketAisles(appId, vendorId)).map((a) => [`${a.departmentId}\u0000${a.name.toLowerCase()}`, a.id]));
  let madeAisles = 0;
  for (const [dept, name] of plan.aisles) {
    const d = deptId.get(dept.toLowerCase());
    if (d === undefined || aisleId.has(`${d}\u0000${name.toLowerCase()}`)) continue;
    const made = await store.saveMarketAisle({ id: null, appId, vendorId, departmentId: d, name: name.slice(0, 80), position: aisleId.size });
    if (made) {
      aisleId.set(`${d}\u0000${name.toLowerCase()}`, made.id);
      madeAisles++;
    }
  }
  const good = plan.rows.filter((r) => r.product);
  const products = good.map((r) => {
    const p = { ...r.product! };
    if (r.department) {
      const d = deptId.get(r.department.toLowerCase()) ?? null;
      p.departmentId = d;
      p.aisleId = d !== null && r.aisle ? (aisleId.get(`${d}\u0000${r.aisle.toLowerCase()}`) ?? null) : null;
    }
    return p;
  });
  const { created, updated } = await store.upsertMarketProducts(appId, vendorId, products, now);
  return { created, updated, skipped: plan.counts.skip, departments: madeDepartments, aisles: madeAisles };
}
