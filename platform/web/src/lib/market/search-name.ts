/**
 * 115.24 How a product's words are kept for search (`market_products.search_name`)
 * and how a customer's words are read, the same way on both sides, so a prefix
 * match on one indexed column finds it whatever way it was typed:
 *
 * - lower case, in every script;
 * - Arabic: the alef forms (أ إ آ ٱ) as ا, taa marbuta (ة) as ه, alef maqsura
 *   (ى) and yaa with hamza (ئ) as ي, waw with hamza (ؤ) as و, a lone hamza
 *   (ء) and the tatweel (ـ) dropped, and the harakat dropped;
 * - Turkish: dotted and dotless i (İ ı) as i;
 * - accents dropped (é as e, ü as u, ç as c, ş as s, ğ as g);
 * - Arabic-Indic (٠–٩) and Persian (۰–۹) digits as 0–9;
 * - anything that isn't a letter or a digit as one space.
 */

export const SEARCH_NAME_MAX = 255;

const ARABIC_FOLD: Record<string, string> = {
  "أ": "ا", // أ
  "إ": "ا", // إ
  "آ": "ا", // آ
  "ٱ": "ا", // ٱ
  "ة": "ه", // ة
  "ى": "ي", // ى
  "ئ": "ي", // ئ
  "ی": "ي", // ی (Persian yaa)
  "ک": "ك", // ک (Persian kaf)
  "ؤ": "و", // ؤ
  "ء": "", // ء
  "ـ": "", // ـ
};

const FOLDED = new RegExp(`[${Object.keys(ARABIC_FOLD).join("")}]`, "g");

/** Western digits for Arabic-Indic and Persian ones; everything else as it is. */
export function westernDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => String((d.codePointAt(0)! - (d >= "\u06f0" ? 0x06f0 : 0x0660)) % 10));
}

/** A text as search keeps it (see above); empty when nothing is left. */
export function normalizeSearch(text: string): string {
  const folded = westernDigits(text)
    // Turkish İ lower-cases to "i̇" (with a combining dot) in most engines; ı stays dotless: both as i.
    .replace(/[\u0130\u0131]/g, "i")
    .toLowerCase()
    .normalize("NFKD")
    // Accents, and the Arabic harakat, shadda, sukun and the dagger alef.
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .replace(FOLDED, (c) => ARABIC_FOLD[c] ?? c)
    // NFKD splits أ into ا + hamza above (dropped above); NFC never comes back here.
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return folded;
}

/** The column's value for a product: its name, its other languages' names and its brand. */
export function productSearchName(p: { name: string; names?: Partial<Record<string, string>> | null; brand?: string | null }): string {
  const parts = [p.name, ...Object.values(p.names ?? {}).filter((n): n is string => typeof n === "string"), p.brand ?? ""];
  const seen = new Set<string>();
  const words: string[] = [];
  for (const part of parts) {
    const n = normalizeSearch(part);
    if (n && !seen.has(n)) {
      seen.add(n);
      words.push(n);
    }
  }
  return truncate(words.join(" "));
}

function truncate(text: string): string {
  if (text.length <= SEARCH_NAME_MAX) return text;
  const cut = text.slice(0, SEARCH_NAME_MAX);
  const space = cut.lastIndexOf(" ");
  return space > SEARCH_NAME_MAX / 2 ? cut.slice(0, space) : cut;
}

/** Whether a product's search name matches a search: from its start (`prefix`), from one of its words' start (`word`), or not at all. */
export function searchMatch(searchName: string, query: string): "prefix" | "word" | null {
  if (!query) return "prefix";
  if (searchName.startsWith(query)) return "prefix";
  return searchName.includes(` ${query}`) ? "word" : null;
}

/** A LIKE pattern's text with its wildcards escaped (MySQL's default escape, the backslash). */
export function likeEscape(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
