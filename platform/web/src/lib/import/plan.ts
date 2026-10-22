import { parseService } from "../bookings/forms";
import { readProductNumbers } from "../catalog/product-fields";
import { parseCourse } from "../courses/forms";
import { DEFAULT_BOOKING_SETUP, DEFAULT_COURSE_SETUP } from "../data/types";
import type { Table } from "./table";

/**
 * 81.4 Import: a table (lib/import/table.ts) read as products (a shop's, or
 * a restaurant's menu), services (bookings) or courses. Its columns are
 * found by their names in English, Turkish and Arabic, or a product feed's
 * fields; each row is checked with the same rules (and messages) as the
 * dashboard's own form. Nothing is saved here: the owner sees the plan
 * first (lib/import/apply.ts saves it).
 */

export type ImportKind = "products" | "services" | "courses";
export type ImportField = "name" | "description" | "price" | "salePrice" | "category" | "sku" | "stock" | "availability" | "image" | "duration" | "instructor" | "level" | "active";

/** The fields each kind reads, required first. */
export const KIND_FIELDS: Record<ImportKind, ImportField[]> = {
  products: ["name", "price", "description", "salePrice", "category", "sku", "stock", "availability", "image", "active"],
  services: ["name", "duration", "price", "description", "category", "image", "active"],
  courses: ["name", "description", "price", "category", "instructor", "level", "image", "active"],
};

export const REQUIRED: Record<ImportKind, ImportField[]> = { products: ["name", "price"], services: ["name"], courses: ["name"] };

/** Column names, written as `normalizeHeader` leaves them. */
const ALIASES: Record<ImportField, string[]> = {
  name: ["name", "title", "product", "product name", "item", "item name", "dish", "service", "service name", "course", "course name", "course title", "ürün", "ürün adı", "urun adi", "ad", "adı", "isim", "başlık", "hizmet", "hizmet adı", "kurs", "kurs adı", "eğitim", "الاسم", "اسم", "اسم المنتج", "المنتج", "العنوان", "الخدمة", "اسم الخدمة", "الدورة", "اسم الدورة", "الطبق"],
  description: ["description", "details", "body", "body html", "content", "summary", "açıklama", "aciklama", "detay", "الوصف", "التفاصيل", "وصف"],
  price: ["price", "regular price", "unit price", "amount", "fiyat", "satış fiyatı", "ücret", "السعر", "سعر"],
  salePrice: ["sale price", "discount price", "special price", "compare price", "indirimli fiyat", "kampanyalı fiyat", "سعر الخصم", "السعر بعد الخصم", "سعر العرض"],
  category: ["category", "categories", "product type", "type", "collection", "section", "menu section", "kategori", "kategoriler", "bölüm", "الفئة", "التصنيف", "القسم", "الفئات"],
  sku: ["sku", "id", "code", "product code", "item code", "barcode", "stock code", "variant sku", "stok kodu", "ürün kodu", "barkod", "الرمز", "كود", "رمز المنتج", "الباركود"],
  stock: ["stock", "quantity", "qty", "inventory", "inventory quantity", "stock quantity", "stok", "adet", "miktar", "المخزون", "الكمية"],
  availability: ["availability", "in stock", "durum", "stok durumu", "التوفر"],
  image: ["image", "image link", "image url", "image src", "images", "photo", "picture", "görsel", "resim", "fotoğraf", "الصورة", "صورة", "الصور"],
  duration: ["duration", "duration minutes", "minutes", "length", "süre", "dakika", "المدة", "الدقائق"],
  instructor: ["instructor", "teacher", "author", "trainer", "eğitmen", "öğretmen", "المدرب", "المدرس"],
  level: ["level", "seviye", "المستوى"],
  active: ["active", "published", "status", "visible", "yayında", "aktif", "durumu", "منشور", "الحالة", "مفعل"],
};

/** "Ürün Adı", "product_name", "g:price" → "ürün adi", "product name", "price" (Turkish dotted and dotless i read alike). */
export function normalizeHeader(header: string): string {
  return header
    .normalize("NFKC")
    .toLowerCase()
    .replace(/i\u0307/g, "i")
    .replace(/ı/g, "i")
    .replace(/^[a-z]+:/, "")
    .replace(/[_\-./()[\]*:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Which column holds each field: an exact name first, then the first column whose name starts with one. */
export function mapColumns(kind: ImportKind, columns: string[]): Partial<Record<ImportField, number>> {
  const names = columns.map(normalizeHeader);
  const out: Partial<Record<ImportField, number>> = {};
  const taken = new Set<number>();
  for (const pass of ["exact", "prefix"] as const) {
    for (const field of KIND_FIELDS[kind]) {
      if (out[field] !== undefined) continue;
      const aliases = ALIASES[field].map(normalizeHeader);
      const at = names.findIndex((n, i) => !taken.has(i) && aliases.some((a) => (pass === "exact" ? n === a : n.startsWith(`${a} `))));
      if (at !== -1) {
        out[field] = at;
        taken.add(at);
      }
    }
  }
  return out;
}

export interface ImportItem {
  /** The row in the file (2 is the first row after the header). */
  row: number;
  name: string;
  values: Partial<Record<ImportField, string>>;
  /** What's wrong, in the form's words; empty when it can be imported. */
  errors: string[];
}

export interface ImportPlan {
  kind: ImportKind;
  /** Each field found, with its column's name. */
  columns: { field: ImportField; column: string }[];
  /** Required fields no column was found for: nothing can be imported. */
  missing: ImportField[];
  items: ImportItem[];
}

const NO = /^(no|false|0|hidden|draft|inactive|archived|hayır|hayir|pasif|taslak|yok|لا|مخفي|غير منشور|مسودة)$/i;

/** HTML (a feed's or a shop export's descriptions) as the plain text the app shows: paragraphs kept. */
export function plainText(html: string): string {
  let text = html.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n");
  // Until none is left: a tag taken out can't leave another behind ("<<b>i>").
  for (let before = ""; before !== text; ) {
    before = text;
    text = text.replace(/<[^<>]*>/g, "");
  }
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    // Last, so "&amp;lt;" stays "&lt;".
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "12.50 TRY", "₺1.250,00", "1250 TL" → "12.50", "1.250,00", "1250": what the price check reads. */
export function priceText(value: string): string {
  return value.replace(/[^\d.,]/g, "");
}

/** A feed's "Home > Kitchen > Mugs" is the shop's "Mugs"; "Tea, Coffee" two categories. */
export function categoryNames(value: string): string[] {
  const last = value.split(/\s*>\s*/).pop() ?? "";
  return [
    ...new Set(
      last
        .split(/\s*[|,;]\s*/)
        .map((c) => c.trim().slice(0, 60))
        .filter(Boolean),
    ),
  ].slice(0, 3);
}

/** The first picture's address of a cell that may list several. */
export function firstImage(value: string): string | null {
  const url = value.split(/[\s,|]+/).find((u) => /^https?:\/\//i.test(u));
  return url ?? null;
}

function checkRow(kind: ImportKind, v: Partial<Record<ImportField, string>>): string[] {
  if (kind === "products") {
    const errors: string[] = [];
    const name = v.name ?? "";
    if (!name) errors.push("Enter the product name.");
    else if (name.length > 120) errors.push("The name: use at most 120 characters.");
    const numbers = readProductNumbers({ price: priceText(v.price ?? ""), salePrice: priceText(v.salePrice ?? ""), stock: v.stock ?? "" });
    errors.push(...Object.values(numbers.errors));
    if ((v.sku ?? "").length > 64) errors.push("The SKU: use at most 64 characters.");
    return errors;
  }
  if (kind === "services") {
    const parsed = parseService({ name: v.name ?? "", duration: v.duration || "60", price: priceText(v.price ?? ""), description: v.description ?? "" }, DEFAULT_BOOKING_SETUP);
    return parsed.ok ? [] : Object.values(parsed.errors);
  }
  const parsed = parseCourse({ title: v.name ?? "", description: v.description ?? "", price: priceText(v.price ?? ""), instructor: v.instructor ?? "", level: v.level ?? "" }, DEFAULT_COURSE_SETUP, []);
  return parsed.ok ? [] : Object.values(parsed.errors);
}

export function planImport(kind: ImportKind, table: Table): ImportPlan {
  const map = mapColumns(kind, table.columns);
  const missing = REQUIRED[kind].filter((f) => map[f] === undefined);
  const columns = KIND_FIELDS[kind].filter((f) => map[f] !== undefined).map((field) => ({ field, column: table.columns[map[field]!]! }));
  const items: ImportItem[] = table.rows.map((cells, i) => {
    const values: Partial<Record<ImportField, string>> = {};
    for (const { field } of columns) values[field] = (cells[map[field]!] ?? "").trim();
    if (values.description) values.description = plainText(values.description).slice(0, kind === "services" ? 2000 : 5000);
    if (values.name) values.name = plainText(values.name);
    // A feed says "out of stock" where a sheet gives the number left.
    if (!values.stock && values.availability && /out[ _]of[ _]stock|tükendi|stokta yok|غير متوفر|نفد/i.test(values.availability)) values.stock = "0";
    if (values.duration) values.duration = values.duration.replace(/[^\d]/g, "");
    return { row: i + 2, name: values.name ?? "", values, errors: missing.length ? [] : checkRow(kind, values) };
  });
  return { kind, columns, missing, items };
}

/** Whether the row says the item is hidden ("no", "draft", "pasif"…); shown otherwise. */
export function isActive(value: string | undefined): boolean {
  return !value || !NO.test(value.trim());
}
