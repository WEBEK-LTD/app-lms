import { ENTRY_LISTS, LANGUAGE_CODES, type LanguageCode, type Languages, type LayoutBlock, type Translations } from "./types";

/**
 * The language to answer in: the first language in `Accept-Language` (by
 * preference) that the app has turned on, else the default.
 */
export function pickLanguage(acceptLanguage: string | null | undefined, languages: Languages): LanguageCode {
  const wanted = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(p)?.[1]).find(Boolean);
      return { code: tag.trim().toLowerCase().split("-")[0] ?? "", q: q === undefined ? 1 : Number(q), index };
    })
    .filter((w) => w.code && Number.isFinite(w.q) && w.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { code } of wanted) {
    if ((LANGUAGE_CODES as readonly string[]).includes(code) && languages.available.includes(code as LanguageCode)) return code as LanguageCode;
  }
  return languages.default;
}

/**
 * The object's texts in `lang`: each translated field replaces the default
 * text; missing or empty ones keep it.
 */
export function translated<T extends object>(value: T & { translations?: Translations }, lang: LanguageCode, defaultLang: LanguageCode): T {
  const { translations, ...rest } = value;
  const texts = lang === defaultLang ? undefined : translations?.[lang];
  if (!texts) return rest as T;
  const out: Record<string, unknown> = { ...rest };
  for (const [field, text] of Object.entries(texts)) {
    if (typeof text === "string" && text.trim() && field in out) out[field] = text;
  }
  return out as T;
}

/**
 * 33 A block with its texts in `lang`, the entries of its lists too
 * (slides, quick links, quotes, questions, people, numbers), without any
 * `translations`.
 */
export function translatedBlock(block: LayoutBlock, lang: LanguageCode, defaultLang: LanguageCode): LayoutBlock {
  const out: LayoutBlock = translated(block, lang, defaultLang);
  for (const list of ENTRY_LISTS) {
    const entries = out[list] as { translations?: Translations }[] | undefined;
    if (entries) (out as unknown as Record<string, unknown>)[list] = entries.map((entry) => translated(entry, lang, defaultLang));
  }
  return out;
}
