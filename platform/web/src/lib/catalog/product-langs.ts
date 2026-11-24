import type { CatalogOptionGroup, CatalogProduct, CatalogVariants, ProductTranslation, ProductTranslations } from "../data/types";

/**
 * 212 A product's words in the customer's language (Yallapp's own shop):
 * the testers found Arabic phones showing English product names. The owner
 * gives each product a name and a description in the app's other languages,
 * and its choices' names and values ("Size" → "المقاس", "Red" → "أحمر"),
 * each optional; the hosted API serves the ones in the language the app asks
 * in, the main text otherwise. The choices keep their main values as their
 * `value` (what the cart and the filters send), only their `label` changes:
 * nothing an older app sends back changes.
 */

/** The languages a product can be written in besides its main one. */
export const PRODUCT_LANGS = ["ar", "tr", "en"] as const;
export const PRODUCT_NAME_MAX = 120;
export const PRODUCT_DESCRIPTION_MAX = 5000;
const WORD_MAX = 60;
const WORDS_MAX = 120;

function langCode(lang: string | null | undefined): string {
  return (lang ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
}

/** The product's translation into `lang`, or null. */
export function translationOf(p: Pick<CatalogProduct, "translations">, lang: string | null | undefined): ProductTranslation | null {
  const code = langCode(lang);
  return (code && p.translations?.[code]) || null;
}

export function productNameIn(p: Pick<CatalogProduct, "name" | "translations">, lang: string | null | undefined): string {
  return translationOf(p, lang)?.name?.trim() || p.name;
}

export function productDescriptionIn(p: Pick<CatalogProduct, "description" | "translations">, lang: string | null | undefined): string {
  return translationOf(p, lang)?.description?.trim() || p.description;
}

/** A choice's name or value in `lang` (itself when not translated). */
export function wordIn(p: Pick<CatalogProduct, "translations">, lang: string | null | undefined, word: string): string {
  return translationOf(p, lang)?.words?.[word]?.trim() || word;
}

/** The product's variations' attributes as `attributesJson` serves them, with their labels in `lang`. */
export function translatedAttributes(p: Pick<CatalogProduct, "translations">, lang: string | null | undefined, list: { slug: string; name: string; variation: boolean; options: { value: string; label: string }[] }[]) {
  if (!translationOf(p, lang)) return list;
  return list.map((a) => ({ ...a, name: wordIn(p, lang, a.name), options: a.options.map((o) => ({ ...o, label: wordIn(p, lang, o.value) })) }));
}

/** 228.7 Its details' lines (materials, care, safety, how to use, what's in the box) in `lang`, each its own translation in the product's `words`. */
export function translatedInfo<T extends { info?: { kind: string; text: string }[] }>(p: Pick<CatalogProduct, "translations">, lang: string | null | undefined, details: T): T {
  if (!details.info || !translationOf(p, lang)) return details;
  return { ...details, info: details.info.map((i) => ({ ...i, text: wordIn(p, lang, i.text) })) };
}

/** 228.7 A spec's value in `lang` (its label is Studio's own, by its key); the main value without a translation. */
export function translatedSpec<T extends { value: string }>(p: Pick<CatalogProduct, "translations">, lang: string | null | undefined, spec: T): T {
  return translationOf(p, lang) ? { ...spec, value: wordIn(p, lang, spec.value) } : spec;
}

/** Its option groups (a dish's size, its extras) named in `lang`; their ids stay. */
export function translatedOptionGroups(p: Pick<CatalogProduct, "translations">, lang: string | null | undefined, groups: CatalogOptionGroup[]): CatalogOptionGroup[] {
  if (!translationOf(p, lang)) return groups;
  return groups.map((g) => ({ ...g, name: wordIn(p, lang, g.name), options: g.options.map((o) => ({ ...o, name: wordIn(p, lang, o.name) })) }));
}

/** The words a product's choices use (to translate): its attributes' names and values, and its option groups'. */
export function productWords(p: { variants?: CatalogVariants | null; optionGroups?: CatalogOptionGroup[] | null }): string[] {
  const words: string[] = [];
  for (const a of p.variants?.attributes ?? []) words.push(a.name, ...a.values);
  for (const g of p.optionGroups ?? []) words.push(g.name, ...g.options.map((o) => o.name));
  return [...new Set(words.map((w) => w.trim()).filter(Boolean))].slice(0, WORDS_MAX);
}

/**
 * The dashboard form's translations: `name_<lang>`, `description_<lang>`
 * and `word_<lang>_<n>` for the n-th of `productWords`; null when none.
 */
export function readProductTranslations(read: (field: string) => string, words: string[], langs: readonly string[] = PRODUCT_LANGS): ProductTranslations | null {
  const out: ProductTranslations = {};
  for (const lang of langs) {
    const t: ProductTranslation = {};
    const name = read(`name_${lang}`).replace(/\s+/g, " ").trim().slice(0, PRODUCT_NAME_MAX);
    const description = read(`description_${lang}`).replace(/\r\n?/g, "\n").trim().slice(0, PRODUCT_DESCRIPTION_MAX);
    if (name) t.name = name;
    if (description) t.description = description;
    const map: Record<string, string> = {};
    words.forEach((word, i) => {
      const value = read(`word_${lang}_${i}`).replace(/\s+/g, " ").trim().slice(0, WORD_MAX);
      if (value && value !== word) map[word] = value;
    });
    if (Object.keys(map).length) t.words = map;
    if (Object.keys(t).length) out[lang] = t;
  }
  return Object.keys(out).length ? out : null;
}

/** Translations as JSON from the owner's API (Yallapp Business), checked; undefined when not valid. */
export function parseProductTranslations(value: unknown): ProductTranslations | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const fields = (lang: string, key: string) => {
    const t = (value as Record<string, unknown>)[lang];
    const v = t && typeof t === "object" ? (t as Record<string, unknown>)[key] : undefined;
    return typeof v === "string" ? v : "";
  };
  const words = new Set<string>();
  for (const lang of Object.keys(value)) {
    const w = ((value as Record<string, unknown>)[lang] as { words?: unknown } | undefined)?.words;
    if (w && typeof w === "object" && !Array.isArray(w)) for (const k of Object.keys(w)) words.add(k);
  }
  const list = [...words].slice(0, WORDS_MAX);
  const langs = Object.keys(value).filter((l) => /^[a-z]{2}$/.test(l)).slice(0, 12);
  return readProductTranslations(
    (field) => {
      const [kind, lang, n] = field.split("_");
      if (kind === "word") {
        const t = (value as Record<string, { words?: Record<string, unknown> }>)[lang!];
        const v = t?.words?.[list[Number(n)]!];
        return typeof v === "string" ? v : "";
      }
      return fields(lang!, kind!);
    },
    list,
    langs,
  );
}
