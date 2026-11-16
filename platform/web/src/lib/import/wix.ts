import { parsePrice } from "../catalog/money";
import { OPTION_GROUPS_MAX, OPTIONS_PER_GROUP_MAX } from "../catalog/options";
import { allCombinations, VARIANT_LIMITS } from "../catalog/variants";
import type { CatalogOptionGroup, CatalogVariant, CatalogVariants } from "../data/types";
import type { Table } from "./table";

/**
 * Wix's own product export (Wix › Store Products › Export), read as the
 * shop's products: no connection to the Wix site is needed, the owner
 * brings the file to a shop of Yallapp's own products. Its rows come in
 * groups of the same `handle`: one PRODUCT row (the product), its VARIANT
 * rows (each combination of its options, with its price, SKU and stock) and
 * its MEDIA rows (its pictures, in order, on Wix's media host). Wix's
 * `price` is what the customer pays and `strikethroughPrice` the price
 * before, so a strikethrough price makes the product's price and `price`
 * its sale price. Its options (TEXT_CHOICES, COLOR) are the product's
 * variations, its modifiers with choices (TEXT_CHOICES, SWATCH_CHOICES) the
 * customer's options; what this shop has no place for (a modifier the
 * customer types in, a brand, a cost, a ribbon…) is counted for the preview
 * and left out.
 */

export const WIX_MEDIA_URL = "https://static.wixstatic.com/media/";
/** A product's pictures, as the product page takes them. */
export const WIX_PICTURES_MAX = 6;
const CATEGORIES_MAX = 10;
const WIX_OPTIONS = 6;
const WIX_MODIFIERS = 10;
const NAME_MAX = 60;

/** What a Wix export has that this shop doesn't keep. */
export type WixDropped =
  | "brand"
  | "cost"
  | "barcode"
  | "ribbon"
  | "preOrder"
  | "unitPrice"
  | "packageSize"
  | "colourCodes"
  | "freeText"
  | "extraOptions"
  | "extraPictures"
  | "altText"
  | "weight";

export interface WixPicture {
  /** The picture on Wix's media host. */
  url: string;
  /**
   * The same picture as a JPEG at most 1600 pixels wide, asked of Wix's media
   * host when the original can't be kept (WebP, AVIF, or over the 2 MB a
   * picture may be); null: not a picture on Wix's host.
   */
  jpeg: string | null;
  alt: string;
}

export interface WixProduct {
  /** The file's line of its PRODUCT row (2 is the first after the header). */
  row: number;
  handle: string;
  name: string;
  /** As Wix wrote it (HTML). */
  descriptionHtml: string;
  /** Category names, the primary first. */
  categories: string[];
  priceCents: number | null;
  salePriceCents: number | null;
  sku: string | null;
  stock: number | null;
  active: boolean;
  weightGrams: number | null;
  pictures: WixPicture[];
  variants: CatalogVariants | null;
  optionGroups: CatalogOptionGroup[] | null;
  errors: string[];
}

export interface WixSummary {
  products: number;
  variants: number;
  pictures: number;
  /** What was left out, by kind: how many products it touched, and a few of its names (free-text modifiers). */
  dropped: { what: WixDropped; count: number; names: string[] }[];
}

/** Whether a table is Wix's product export: its `handle` and `fieldType`, and its options' and modifiers' columns. */
export function isWixExport(columns: string[]): boolean {
  const names = new Set(columns.map((c) => c.trim()));
  return names.has("handle") && names.has("fieldType") && [...names].some((c) => /^(productOption(Name|Type|Choices)|modifier(Name|Type|Description))\d+$/.test(c));
}

/** "same-day-delivery" → "Same day delivery", "collection-parfums-1" → "Collection parfums". */
export function categoryFromSlug(slug: string): string {
  const words = slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+\d+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return words ? `${words[0]!.toLocaleUpperCase("en")}${words.slice(1)}`.slice(0, 60) : "";
}

/** Wix's two prices as the shop's: the price before a discount, and the sale price. */
export function wixPrices(price: string, strikethrough: string): { priceCents: number | null; salePriceCents: number | null } {
  const pays = price ? parsePrice(price) : null;
  const before = strikethrough ? parsePrice(strikethrough) : null;
  if (pays === null) return { priceCents: null, salePriceCents: null };
  return before !== null && before > pays ? { priceCents: before, salePriceCents: pays } : { priceCents: pays, salePriceCents: null };
}

/** IN_STOCK: not counted; OUT_OF_STOCK: none left; a number: that many. */
export function wixStock(value: string): number | null {
  const v = value.trim().toUpperCase();
  if (v === "OUT_OF_STOCK") return 0;
  if (/^\d+$/.test(v)) return Math.min(Number(v), 1_000_000);
  return null;
}

/** A choice's name: COLOR and SWATCH_CHOICES write "#hex:name". */
function choiceName(choice: string): { name: string; coloured: boolean } {
  const m = /^#[0-9a-f]{3,8}\s*:\s*(.*)$/i.exec(choice.trim());
  return m ? { name: m[1]!.trim(), coloured: true } : { name: choice.trim(), coloured: false };
}

/** Wix's option name, without its trailing colon ("Bouquet Size:"). */
const optionName = (name: string) => name.replace(/\s*:\s*$/, "").replace(/\s+/g, " ").trim();

/** The picture's address, and a JPEG of it when its format isn't one the shop keeps. */
export function wixPicture(media: string, alt: string): WixPicture | null {
  const file = media.trim();
  if (!file) return null;
  const url = /^https?:\/\//i.test(file) ? file : `${WIX_MEDIA_URL}${encodeURI(file)}`;
  const own = url.startsWith(WIX_MEDIA_URL) && !url.includes("/v1/");
  return { url, jpeg: own ? `${url}/v1/fit/w_1600,h_1600,q_90/picture.jpg` : null, alt: alt.trim().slice(0, 200) };
}

export function readWix(table: Table): { products: WixProduct[]; summary: WixSummary } {
  const at = new Map(table.columns.map((c, i) => [c.trim(), i]));
  const cell = (cells: string[], name: string) => {
    const i = at.get(name);
    return i === undefined ? "" : (cells[i] ?? "").trim();
  };
  // The handle's rows, in the order the file lists them.
  const groups = new Map<string, { row: number; cells: string[] }[]>();
  table.rows.forEach((cells, i) => {
    const handle = cell(cells, "handle");
    if (!handle) return;
    const list = groups.get(handle) ?? [];
    list.push({ row: i + 2, cells });
    groups.set(handle, list);
  });
  const dropped = new Map<WixDropped, { count: number; names: Set<string> }>();
  const drop = (what: WixDropped, name?: string) => {
    const entry = dropped.get(what) ?? { count: 0, names: new Set<string>() };
    entry.count++;
    if (name && entry.names.size < 3) entry.names.add(name);
    dropped.set(what, entry);
  };
  const products: WixProduct[] = [];
  let variantCount = 0;
  let pictureCount = 0;
  for (const [handle, rows] of groups) {
    const head = rows.find((r) => cell(r.cells, "fieldType").toUpperCase() === "PRODUCT");
    if (!head) continue;
    const p = (name: string) => cell(head.cells, name);
    const errors: string[] = [];
    const name = p("name");

    // Its variations: Wix's options, up to three, with each VARIANT row's choices.
    const attributes: CatalogVariants["attributes"] = [];
    let colourCodes = false;
    let extra = false;
    for (let n = 1; n <= WIX_OPTIONS; n++) {
      const optName = optionName(p(`productOptionName${n}`)).slice(0, VARIANT_LIMITS.name);
      const choices = p(`productOptionChoices${n}`)
        .split(";")
        .map(choiceName)
        .filter((c) => c.name);
      if (!optName || choices.length === 0) continue;
      if (attributes.length === VARIANT_LIMITS.attributes) {
        extra = true;
        continue;
      }
      if (choices.some((c) => c.coloured)) colourCodes = true;
      const values = [...new Set(choices.map((c) => c.name.slice(0, VARIANT_LIMITS.name)))];
      if (values.length > VARIANT_LIMITS.values) errors.push(`${optName}: use at most ${VARIANT_LIMITS.values} values.`);
      attributes.push({ name: optName, values: values.slice(0, VARIANT_LIMITS.values) });
    }
    if (extra) drop("extraOptions", name);
    let variants: CatalogVariants | null = null;
    if (attributes.length) {
      const items: CatalogVariant[] = [];
      const seen = new Set<string>();
      for (const v of rows.filter((r) => cell(r.cells, "fieldType").toUpperCase() === "VARIANT")) {
        const values = attributes.map((_, i) => choiceName(cell(v.cells, `productOptionChoices${i + 1}`)).name.slice(0, VARIANT_LIMITS.name));
        const key = values.join("\u0000");
        if (values.some((value, i) => !attributes[i]!.values.includes(value)) || seen.has(key) || items.length >= VARIANT_LIMITS.items) continue;
        seen.add(key);
        const prices = wixPrices(cell(v.cells, "price"), cell(v.cells, "strikethroughPrice"));
        items.push({
          id: items.length + 1,
          values,
          priceCents: prices.priceCents,
          salePriceCents: prices.priceCents === null ? null : prices.salePriceCents,
          stock: wixStock(cell(v.cells, "inventory")),
          sku: cell(v.cells, "sku").slice(0, VARIANT_LIMITS.sku) || null,
          active: cell(v.cells, "visible").toLowerCase() !== "false",
        });
      }
      // Options without their variants listed: every combination, at the product's price.
      if (items.length === 0) {
        for (const values of allCombinations(attributes).slice(0, VARIANT_LIMITS.items)) {
          items.push({ id: items.length + 1, values, priceCents: null, salePriceCents: null, stock: null, sku: null, active: true });
        }
      }
      variants = { attributes, items };
      variantCount += rows.filter((r) => cell(r.cells, "fieldType").toUpperCase() === "VARIANT").length;
    }

    // The customer's options: Wix's modifiers with choices; one the customer types in has no place here.
    const optionGroups: CatalogOptionGroup[] = [];
    for (let n = 1; n <= WIX_MODIFIERS; n++) {
      const groupName = optionName(p(`modifierName${n}`)).slice(0, NAME_MAX);
      const type = p(`modifierType${n}`).toUpperCase();
      if (!groupName || !type) continue;
      if (type === "FREE_TEXT") {
        drop("freeText", groupName);
        continue;
      }
      const choices = p(`modifierDescription${n}`)
        .split(";")
        .map(choiceName)
        .filter((c) => c.name);
      if (choices.length === 0 || optionGroups.length >= OPTION_GROUPS_MAX) continue;
      if (choices.some((c) => c.coloured)) colourCodes = true;
      const names = [...new Set(choices.map((c) => c.name.slice(0, NAME_MAX)))].slice(0, OPTIONS_PER_GROUP_MAX);
      optionGroups.push({
        id: `w${n}`,
        name: groupName,
        min: p(`modifierMandatory${n}`).toLowerCase() === "true" ? 1 : 0,
        max: 1,
        options: names.map((option, j) => ({ id: `w${n}o${j + 1}`, name: option, priceDeltaCents: 0 })),
      });
    }
    if (colourCodes) drop("colourCodes", name);

    // Its price: its own, or (with variations) the cheapest variation's.
    let prices = wixPrices(p("price"), p("strikethroughPrice"));
    if (prices.priceCents === null && variants) {
      const priced = variants.items.filter((v) => v.priceCents !== null);
      const cheapest = priced.sort((a, b) => (a.salePriceCents ?? a.priceCents!) - (b.salePriceCents ?? b.priceCents!))[0];
      if (cheapest) prices = { priceCents: cheapest.priceCents, salePriceCents: cheapest.salePriceCents };
    }

    // Its pictures: the PRODUCT row's, then its MEDIA rows', in order.
    const pictures: WixPicture[] = [];
    for (const r of [head, ...rows.filter((x) => cell(x.cells, "fieldType").toUpperCase() === "MEDIA")]) {
      for (const media of cell(r.cells, "media").split(";")) {
        const picture = wixPicture(media, cell(r.cells, "mediaAltText"));
        if (picture && !pictures.some((x) => x.url === picture.url)) pictures.push(picture);
      }
    }
    pictureCount += pictures.length;
    if (pictures.length > WIX_PICTURES_MAX) drop("extraPictures", name);
    // The app describes a product's pictures by its name: Wix's own descriptions of them have no place here.
    if (pictures.slice(0, WIX_PICTURES_MAX).some((x) => x.alt)) drop("altText", name);

    const slugs = [p("primaryCategorySlug"), ...p("categorySlugs").split(";")].map((s) => s.trim()).filter(Boolean);
    const categories = [...new Set(slugs.map(categoryFromSlug).filter(Boolean))].slice(0, CATEGORIES_MAX);

    const weightText = p("weight").replace(",", ".");
    const kg = weightText ? Number(weightText) : null;
    let weightGrams: number | null = null;
    if (kg !== null) {
      if (Number.isFinite(kg) && kg > 0 && kg <= 1000) weightGrams = Math.round(kg * 1000);
      else drop("weight", name);
    }
    if (p("brand")) drop("brand", name);
    if (p("cost")) drop("cost", name);
    if (p("barcode")) drop("barcode", name);
    if (p("ribbon")) drop("ribbon", name);
    if (p("preOrderEnabled").toLowerCase() === "true") drop("preOrder", name);
    if (p("baseUnit") || p("totalUnits")) drop("unitPrice", name);
    if (p("packageLength") || p("packageWidth") || p("packageHeight")) drop("packageSize", name);

    products.push({
      row: head.row,
      handle,
      name,
      descriptionHtml: p("plainDescription"),
      categories,
      priceCents: prices.priceCents,
      salePriceCents: prices.salePriceCents,
      sku: p("sku") || null,
      stock: variants ? null : wixStock(p("inventory")),
      active: p("visible").toLowerCase() !== "false",
      weightGrams,
      pictures: pictures.slice(0, WIX_PICTURES_MAX),
      variants,
      optionGroups: optionGroups.length ? optionGroups : null,
      errors,
    });
  }
  return {
    products,
    summary: {
      products: products.length,
      variants: variantCount,
      pictures: pictureCount,
      dropped: [...dropped].map(([what, { count, names }]) => ({ what, count, names: [...names] })),
    },
  };
}

/** Wix's description HTML with its lists kept as lines, for the shop's plain text. */
export function wixDescriptionHtml(html: string): string {
  return html.replace(/<li\b[^>]*>/gi, "• ").replace(/<\/li>/gi, "<br>");
}
