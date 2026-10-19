import { builtInText, DICTIONARY_LANGUAGES, DICTIONARY_VERSION } from "../i18n/builtin";
import { ENTRY_LISTS, TRANSLATABLE, TRANSLATABLE_ENTRIES, type Layout, type Translations } from "./types";

/**
 * 43 Yallapp's own translations in a served layout: a tab name, page title
 * or block text that is still exactly what Yallapp wrote ("Home", a
 * design's sample text) gets its Arabic and Turkish in `translations` for
 * every language the app offers that has them, unless the owner wrote
 * their own. A default language with them gets them as the main text, so
 * an Arabic-first app doesn't open on "Home". Owner texts always win. The
 * hosted API and the plugin then apply `translations` as before.
 */

type WithTexts = Record<string, unknown> & { translations?: Translations };

function fill<T extends object>(value: T, fields: readonly string[], languages: string[], def: string, english: boolean): { value: T; changed: boolean } {
  const record = value as unknown as WithTexts;
  let out: WithTexts | null = null;
  for (const field of fields) {
    const text = record[field];
    if (typeof text !== "string" || !text.trim()) continue;
    for (const lang of languages) {
      const translated = builtInText(text, lang);
      if (translated === null) continue;
      out ??= { ...record, translations: structuredClone(record.translations ?? {}) };
      if (lang === def) {
        out[field] = translated;
        // English, when the app offers it too, keeps the text Yallapp wrote.
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

/** The layout with Yallapp's translations filled in; the same object when there's nothing to fill. */
export function withBuiltInTexts(layout: Layout): Layout {
  const def = layout.languages.default;
  const languages = layout.languages.available.filter((l) => DICTIONARY_LANGUAGES.includes(l));
  if (!languages.length) return layout;
  const english = def !== "en" && layout.languages.available.includes("en");
  let changed = false;
  const tabs = layout.tabs.map((tab) => {
    const r = fill(tab, TRANSLATABLE.tab, languages, def, english);
    changed ||= r.changed;
    return r.value;
  });
  const pages = layout.pages.map((page) => {
    const p = fill(page, TRANSLATABLE.page, languages, def, english);
    changed ||= p.changed;
    return {
      ...p.value,
      blocks: page.blocks.map((block) => {
        const b = fill(block, TRANSLATABLE.block, languages, def, english);
        changed ||= b.changed;
        const out = { ...b.value } as unknown as Record<string, unknown>;
        for (const list of ENTRY_LISTS) {
          const entries = out[list] as object[] | undefined;
          if (!entries) continue;
          out[list] = entries.map((entry) => {
            const e = fill(entry, TRANSLATABLE_ENTRIES[list], languages, def, english);
            changed ||= e.changed;
            return e.value;
          });
        }
        return out as unknown as typeof block;
      }),
    };
  });
  if (!changed) return layout;
  // The version changes with Yallapp's translations, so apps and the plugin fetch them again.
  return { ...layout, version: `${layout.version}~t${DICTIONARY_VERSION}`, tabs, pages };
}
