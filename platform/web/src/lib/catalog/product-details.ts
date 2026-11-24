import type { ProductDimensions, ProductMakeDays } from "../data/types";

/**
 * 210 A product's size in cm (furniture, decor) and the days it takes to
 * make (crochet, a sofa made to order): read from the dashboard's product
 * form, and written for the app (a card's line, the product page).
 */

export const DIMENSION_MAX_CM = 10_000;
export const MAKE_DAYS_MAX = 365;

const cm = (text: string): number | null | "bad" => {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0 || n > DIMENSION_MAX_CM) return "bad";
  return Math.round(n * 10) / 10;
};

const days = (text: string): number | null | "bad" => {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 && n <= MAKE_DAYS_MAX ? n : "bad";
};

/** The width, depth and height (cm) and the days to make as the owner typed them; errors by field, in English (the dashboard's known messages). */
export function readProductDetails(v: { width?: string; depth?: string; height?: string; makeMin?: string; makeMax?: string }): {
  errors: Record<string, string>;
  dimensions: ProductDimensions | null;
  makeDays: ProductMakeDays | null;
} {
  const errors: Record<string, string> = {};
  const size: Record<"width" | "depth" | "height", number | null> = { width: null, depth: null, height: null };
  for (const key of ["width", "depth", "height"] as const) {
    const read = cm(v[key] ?? "");
    if (read === "bad") errors[key] = "Enter the size in cm, like 220 or 82.5, or leave it empty.";
    else size[key] = read;
  }
  const min = days(v.makeMin ?? "");
  const max = days(v.makeMax ?? "");
  if (min === "bad") errors.makeMin = "Enter the days as a whole number from 1 to 365, or leave it empty.";
  if (max === "bad") errors.makeMax = "Enter the days as a whole number from 1 to 365, or leave it empty.";
  let makeDays: ProductMakeDays | null = null;
  if (min !== "bad" && max !== "bad" && (min !== null || max !== null)) {
    const from = min ?? max!;
    const to = max ?? min!;
    if (to < from) errors.makeMax = "The most days can't be fewer than the least.";
    else makeDays = { min: from, max: to };
  }
  const dimensions = size.width !== null || size.depth !== null || size.height !== null ? size : null;
  return { errors, dimensions, makeDays };
}

const WORDS = {
  en: { w: "W", d: "D", h: "H", cm: "cm", day: "Made in 1 day", days: "Made in {n} days" },
  ar: { w: "", d: "", h: "", cm: "سم", day: "يُصنع في يوم واحد", days: "يُصنع في {n} أيام" },
  tr: { w: "G", d: "D", h: "Y", cm: "cm", day: "1 günde yapılır", days: "{n} günde yapılır" },
} as const;

const wordsIn = (lang: string | null | undefined) => (lang === "ar" || lang === "tr" ? WORDS[lang] : WORDS.en);
const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * "W 220 × D 95 × H 82 cm" in the app's language (only the sizes it has);
 * null without any. Arabic has no standard letters for them: "220 × 95 × 82
 * سم", the order width, depth, height, carried by the words around it
 * (228.8). Turkish keeps G, D and Y.
 */
export function dimensionsLine(d: ProductDimensions | null | undefined, lang: string | null | undefined): string | null {
  if (!d) return null;
  const w = wordsIn(lang);
  const parts = ([["w", d.width], ["d", d.depth], ["h", d.height]] as const).filter(([, n]) => n !== null && n > 0).map(([k, n]) => (w[k] ? `${w[k]} ${num(n!)}` : num(n!)));
  return parts.length ? `${parts.join(" × ")} ${w.cm}` : null;
}

/** "Made in 3–5 days" in the app's language; null without any. */
export function makeDaysLine(m: ProductMakeDays | null | undefined, lang: string | null | undefined): string | null {
  if (!m) return null;
  const w = wordsIn(lang);
  if (m.min === 1 && m.max === 1) return w.day;
  return w.days.replace("{n}", m.min === m.max ? String(m.min) : `${m.min}–${m.max}`);
}

/** A product card's line: its days to make, else its size; null for neither. */
export function productLine(p: { dimensions?: ProductDimensions | null; makeDays?: ProductMakeDays | null }, lang: string | null | undefined): string | null {
  return makeDaysLine(p.makeDays, lang) ?? dimensionsLine(p.dimensions, lang);
}
