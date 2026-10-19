import { ENTRY_LISTS, TRANSLATABLE, TRANSLATABLE_ENTRIES, type LayoutContent, type Translations } from "./types";

/**
 * 43 Fills translations into a layout where the owner wrote none, from
 * `lookup` (Yallapp's dictionary on the server, lib/pages/builtin.ts; the
 * same texts as a map in the dashboard's phone preview). A default
 * language with a translation gets it as the main text, and English, when
 * the app offers it too, keeps the text Yallapp wrote. Pure, so the server
 * and the dashboard share it.
 */

type WithTexts = Record<string, unknown> & { translations?: Translations };
type Lookup = (text: string, lang: string) => string | null;

function fill<T extends object>(value: T, fields: readonly string[], languages: string[], def: string, english: boolean, lookup: Lookup): { value: T; changed: boolean } {
  const record = value as unknown as WithTexts;
  let out: WithTexts | null = null;
  for (const field of fields) {
    const text = record[field];
    if (typeof text !== "string" || !text.trim()) continue;
    for (const lang of languages) {
      const translated = lookup(text, lang);
      if (translated === null) continue;
      out ??= { ...record, translations: structuredClone(record.translations ?? {}) };
      if (lang === def) {
        out[field] = translated;
        if (english) {
          const en = (out.translations!.en ??= {});
          if (!en[field]?.trim()) en[field] = text;
        }
        continue;
      }
      const texts = (out.translations![lang] ??= {});
      if (!texts[field]?.trim()) texts[field] = translated;
    }
  }
  if (!out) return { value, changed: false };
  if (!Object.keys(out.translations!).length) delete out.translations;
  return { value: out as unknown as T, changed: true };
}

/** The layout with translations filled in for `languages`; the same object when there's nothing to fill. */
export function withFilledTexts<T extends Pick<LayoutContent, "languages" | "tabs" | "pages">>(layout: T, languages: string[], lookup: Lookup): T {
  if (!languages.length) return layout;
  const def = layout.languages.default;
  const english = def !== "en" && layout.languages.available.includes("en");
  let changed = false;
  const tabs = layout.tabs.map((tab) => {
    const r = fill(tab, TRANSLATABLE.tab, languages, def, english, lookup);
    changed ||= r.changed;
    return r.value;
  });
  const pages = layout.pages.map((page) => {
    const p = fill(page, TRANSLATABLE.page, languages, def, english, lookup);
    changed ||= p.changed;
    return {
      ...p.value,
      blocks: page.blocks.map((block) => {
        const b = fill(block, TRANSLATABLE.block, languages, def, english, lookup);
        changed ||= b.changed;
        const out = { ...b.value } as unknown as Record<string, unknown>;
        for (const list of ENTRY_LISTS) {
          const entries = out[list] as object[] | undefined;
          if (!entries) continue;
          out[list] = entries.map((entry) => {
            const e = fill(entry, TRANSLATABLE_ENTRIES[list], languages, def, english, lookup);
            changed ||= e.changed;
            return e.value;
          });
        }
        return out as unknown as typeof block;
      }),
    };
  });
  return changed ? { ...layout, tabs, pages } : layout;
}
