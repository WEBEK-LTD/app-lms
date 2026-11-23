import type { App, CatalogCategory, CatalogProduct, FashionSettings, SizeChart } from "../data/types";

/**
 * 208 A clothes shop's own parts, for every store app whose products are
 * kept in Yallapp (the hosted catalog): the size chart the app shows under
 * a product's sizes ("Size guide") and on a Studio page (the `size_chart`
 * element), and "Complete the look", products of the shop's other main
 * categories (shoes, a bag, sunglasses with a dress) on a product's page.
 * Kept in the app's `catalogSettings` (JSON, no migration); read here,
 * bounded, whatever was saved. Without them the app shows neither, as
 * before; a connected platform and WordPress serve none (yet).
 */

export const FASHION_LIMITS = { columns: 8, rows: 24, cell: 24, look: 4 } as const;

/** The form's messages, in the dashboard's words (translated as known texts). */
export const FASHION_FORM_ERRORS = {
  chart: "Write the size chart as rows of cells separated by |, its first line the column titles.",
  columns: "Every row of the size chart needs as many cells as its titles.",
  long: "A size chart has at most 8 columns and 24 rows, each cell at most 24 characters.",
} as const;

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const cell = (v: unknown): string | null => (typeof v === "string" && v.trim() && v.trim().length <= FASHION_LIMITS.cell ? v.trim() : null);

/** A saved chart as the app may show it; null when it isn't one. */
export function sizeChartOf(raw: unknown): SizeChart | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<SizeChart>;
  const headers = Array.isArray(c.headers) ? c.headers.map(cell) : [];
  if (headers.length < 2 || headers.length > FASHION_LIMITS.columns || headers.some((h) => h === null)) return null;
  const rows = (Array.isArray(c.rows) ? c.rows : [])
    .slice(0, FASHION_LIMITS.rows)
    .map((r) => (Array.isArray(r) && r.length === headers.length ? r.map(cell) : null))
    .filter((r): r is string[] => r !== null && r.every((x) => x !== null));
  if (!rows.length) return null;
  const translations: Record<string, string[]> = {};
  for (const [lang, titles] of Object.entries(c.translations ?? {})) {
    const own = Array.isArray(titles) ? titles.map(cell) : [];
    if (/^[a-z]{2}$/.test(lang) && own.length === headers.length && own.every((x) => x !== null)) translations[lang] = own as string[];
  }
  return { headers: headers as string[], rows, unit: c.unit === "in" ? "in" : "cm", ...(Object.keys(translations).length ? { translations } : {}) };
}

/** The shop's clothes parts; null for a shop without any (or not a store). */
export function fashionOf(app: Pick<App, "catalogSettings" | "appType" | "vertical">): FashionSettings | null {
  if (app.appType !== "store" || app.vertical === "restaurant") return null;
  const f = app.catalogSettings?.fashion;
  if (!f || typeof f !== "object") return null;
  const sizeChart = sizeChartOf(f.sizeChart);
  const completeLook = f.completeLook === true;
  return sizeChart || completeLook ? { sizeChart, completeLook } : null;
}

/** `StoreConfig.size_chart`: its titles in the language asked for when the shop has them, else its own. */
export function sizeChartJson(chart: SizeChart | null, lang: string | null): { headers: string[]; rows: string[][]; unit: "cm" | "in" } | null {
  if (!chart) return null;
  const titles = (lang && chart.translations?.[lang]) || chart.headers;
  return { headers: [...titles], rows: chart.rows.map((r) => [...r]), unit: chart.unit };
}

/** A chart as the owner writes it: one row per line, cells separated by `|`, the first line its titles. */
export function chartText(chart: SizeChart | null): string {
  return chart ? [chart.headers, ...chart.rows].map((r) => r.join(" | ")).join("\n") : "";
}

function rowsOf(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((x) => x.trim()));
}

/**
 * The dashboard's form: `fashionChart` (the chart's text), `fashionUnit`
 * (cm or in), `fashionTitles_<lang>` (the titles in another language, one
 * line of cells) and `completeLook` (on).
 */
export function parseFashionForm(v: Record<string, string | undefined>, langs: readonly string[] = []): Parsed<FashionSettings | null> {
  const errors: Record<string, string> = {};
  const text = (v.fashionChart ?? "").trim();
  let sizeChart: SizeChart | null = null;
  if (text) {
    const [headers, ...rows] = rowsOf(text);
    if (!headers || headers.length < 2 || !rows.length) errors.fashionChart = FASHION_FORM_ERRORS.chart;
    else if (headers.length > FASHION_LIMITS.columns || rows.length > FASHION_LIMITS.rows || [headers, ...rows].some((r) => r.some((x) => x.length > FASHION_LIMITS.cell))) errors.fashionChart = FASHION_FORM_ERRORS.long;
    else if (rows.some((r) => r.length !== headers.length) || [headers, ...rows].some((r) => r.some((x) => !x))) errors.fashionChart = FASHION_FORM_ERRORS.columns;
    else {
      const translations: Record<string, string[]> = {};
      for (const lang of langs) {
        const line = rowsOf(v[`fashionTitles_${lang}`] ?? "")[0];
        if (!line) continue;
        if (line.length !== headers.length || line.some((x) => !x || x.length > FASHION_LIMITS.cell)) errors[`fashionTitles_${lang}`] = FASHION_FORM_ERRORS.columns;
        else translations[lang] = line;
      }
      sizeChart = { headers, rows, unit: v.fashionUnit === "in" ? "in" : "cm", ...(Object.keys(translations).length ? { translations } : {}) };
    }
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  const completeLook = v.completeLook === "on";
  return { ok: true, value: sizeChart || completeLook ? { sizeChart, completeLook } : null };
}

/** The main category a category is in: its parent, else itself. */
export function mainCategoryOf(categories: readonly Pick<CatalogCategory, "id" | "parentId">[], id: number): number {
  const c = categories.find((x) => x.id === id);
  return c?.parentId && categories.some((x) => x.id === c.parentId) ? c.parentId : id;
}

/**
 * "Complete the look": one product from each of the shop's other main
 * categories (in their order), the featured and best selling first, never
 * an add-on or the product itself; at most four.
 */
export function completeLookFor<P extends Pick<CatalogProduct, "id" | "categoryIds" | "addon" | "featured" | "salesCount">>(product: P, all: readonly P[], categories: readonly Pick<CatalogCategory, "id" | "parentId" | "position">[]): P[] {
  const mains = (p: P) => new Set(p.categoryIds.map((c) => mainCategoryOf(categories, c)));
  const own = mains(product);
  const order = [...categories].filter((c) => !c.parentId).sort((a, b) => a.position - b.position);
  const ranked = [...all].filter((p) => p.id !== product.id && !p.addon).sort((a, b) => Number(b.featured) - Number(a.featured) || b.salesCount - a.salesCount || b.id - a.id);
  const out: P[] = [];
  for (const main of order) {
    if (own.has(main.id)) continue;
    const pick = ranked.find((p) => mains(p).has(main.id) && !out.includes(p));
    if (pick) out.push(pick);
    if (out.length >= FASHION_LIMITS.look) break;
  }
  return out;
}

/** A dashboard category's parent as chosen: a main category of the same shop other than itself; null otherwise. */
export function parentChoice(categories: readonly Pick<CatalogCategory, "id" | "parentId">[], id: number | null, raw: unknown): number | null {
  const parent = Number(raw);
  if (!Number.isSafeInteger(parent) || parent <= 0 || parent === id) return null;
  const found = categories.find((c) => c.id === parent);
  // One level deep: a sub-category is never a parent, and a category with sub-categories never goes inside another.
  if (!found || found.parentId) return null;
  if (id !== null && categories.some((c) => c.parentId === id)) return null;
  return parent;
}
