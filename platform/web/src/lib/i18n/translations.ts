import { textIn, withText } from "../pages/model";
import { ENTRY_LISTS, TRANSLATABLE, TRANSLATABLE_ENTRIES, type EntryList, type LayoutContent, type Translations } from "../pages/types";
import { APP_STRINGS, builtInString } from "./app-strings";
import { builtInText } from "./builtin";

/**
 * 43 The Translations page: every text an app shows, per language. Two
 * kinds of rows: the owner's own texts (tabs, page titles, blocks and their
 * entries), translated from the default language and stored as the
 * layout's `translations`; and the app's interface strings (the ARB keys),
 * translated from English and stored as the layout's `strings`. Yallapp's
 * own translation, where there is one, is the starting point; the owner's
 * text always wins.
 */

export interface TranslationRow {
  /** Content: `tab|<id>|label`, `page|<slug>|title`, `block|<slug>|<id>|<field>`, `entry|<slug>|<id>|<list>|<n>|<field>`; interface: the string's key. */
  id: string;
  kind: "content" | "interface";
  /** Where it shows ("Tab", "Home › Slider › Slide 2 heading"), or the key's description. */
  where: string;
  /** The text to translate: the default language's (content) or English (interface). */
  source: string;
  /** The owner's translation; empty when they haven't written one. */
  value: string;
  /** Yallapp's translation in this language, when it has one. */
  builtin: string | null;
  /** Interface strings: their placeholders and types. */
  placeholders?: Record<string, string>;
  html?: boolean;
}

const FIELD_NAMES: Record<string, string> = {
  label: "label",
  title: "title",
  heading: "heading",
  subheading: "subheading",
  html: "text",
  placeholder: "search hint",
  text: "text",
  ended_text: "text when it has ended",
  note: "note",
  address: "address",
  question: "question",
  answer: "answer",
  name: "name",
  role: "role",
  bio: "about",
  value: "number",
};

const ENTRY_NAMES: Record<EntryList, string> = { slides: "Slide", links: "Link", quotes: "Quote", questions: "Question", people: "Person", stats: "Number" };

/** The owner's own texts in `lang`, translated from the default language. None for the default language itself. */
export function contentRows(layout: LayoutContent, lang: string): TranslationRow[] {
  const def = layout.languages.default;
  if (lang === def) return [];
  const rows: TranslationRow[] = [];
  const add = (id: string, where: string, value: object & { translations?: Translations }, field: string) => {
    const source = textIn(value, field, def, def);
    if (!source.trim()) return;
    rows.push({
      id,
      kind: "content",
      where,
      source,
      value: textIn(value, field, lang, def),
      builtin: builtInText(source, lang),
      ...(field === "html" ? { html: true } : {}),
    });
  };
  for (const tab of layout.tabs) for (const field of TRANSLATABLE.tab) add(`tab|${tab.id}|${field}`, `Tab ${FIELD_NAMES[field]}`, tab, field);
  for (const page of layout.pages) {
    const pageName = page.title || page.slug;
    for (const field of TRANSLATABLE.page) add(`page|${page.slug}|${field}`, `${pageName} › page title`, page, field);
    page.blocks.forEach((block, i) => {
      const at = `${pageName} › block ${i + 1}`;
      for (const field of TRANSLATABLE.block) add(`block|${page.slug}|${block.id}|${field}`, `${at} › ${FIELD_NAMES[field] ?? field}`, block, field);
      for (const list of ENTRY_LISTS) {
        const entries = (block[list] ?? []) as (object & { translations?: Translations })[];
        entries.forEach((entry, n) => {
          for (const field of TRANSLATABLE_ENTRIES[list]) add(`entry|${page.slug}|${block.id}|${list}|${n}|${field}`, `${at} › ${ENTRY_NAMES[list]} ${n + 1} ${FIELD_NAMES[field] ?? field}`, entry, field);
        });
      }
    });
  }
  return rows;
}

/** The app's interface strings in `lang`, translated from English. */
export function interfaceRows(layout: Pick<LayoutContent, "strings">, lang: string): TranslationRow[] {
  const own = layout.strings?.[lang] ?? {};
  return APP_STRINGS.map((entry) => ({
    id: entry.key,
    kind: "interface" as const,
    where: entry.description ?? "",
    source: entry.en,
    value: own[entry.key] ?? "",
    builtin: builtInString(entry, lang),
    ...(entry.placeholders ? { placeholders: entry.placeholders } : {}),
  }));
}

/** How much of a language is translated: rows with the owner's text or Yallapp's. */
export function progress(rows: readonly TranslationRow[]): { done: number; total: number } {
  return { done: rows.filter((r) => r.value.trim() || r.builtin).length, total: rows.length };
}

/**
 * The layout with the owner's translations in `lang` changed: `changes`
 * maps row IDs to the new text (empty removes the owner's text, so
 * Yallapp's or the default shows again). Unknown rows are left alone.
 */
export function applyTranslations(layout: LayoutContent, lang: string, changes: Record<string, string>): LayoutContent {
  const def = layout.languages.default;
  let out: LayoutContent = { ...layout, tabs: [...layout.tabs], pages: layout.pages.map((p) => ({ ...p, blocks: [...p.blocks] })) };
  const strings = { ...(layout.strings?.[lang] ?? {}) };
  let stringsChanged = false;
  for (const [id, raw] of Object.entries(changes)) {
    const text = typeof raw === "string" ? raw.trim() : "";
    const parts = id.split("|");
    if (parts.length === 1) {
      const entry = APP_STRINGS.find((s) => s.key === id);
      if (!entry) continue;
      // The same text as Yallapp's isn't stored: an update of Yallapp's then reaches the app.
      if (!text || text === builtInString(entry, lang)) delete strings[id];
      else strings[id] = text;
      stringsChanged = true;
      continue;
    }
    if (lang === def) continue;
    const [kind, a, b, c, d, e] = parts;
    // Yallapp's own translation isn't stored as the owner's, so its updates still reach the app.
    const set = <T extends object & { translations?: Translations }>(value: T, field: string): T =>
      withText(value, field, text && text === builtInText(textIn(value, field, def, def), lang) ? "" : text, lang, def);
    if (kind === "tab" && b) {
      out.tabs = out.tabs.map((t) => (t.id === a ? set(t, b) : t));
    } else if (kind === "page" && b) {
      out.pages = out.pages.map((p) => (p.slug === a ? set(p, b) : p));
    } else if (kind === "block" && c) {
      out.pages = out.pages.map((p) => (p.slug === a ? { ...p, blocks: p.blocks.map((bl) => (bl.id === b ? set(bl, c) : bl)) } : p));
    } else if (kind === "entry" && c && d !== undefined && e) {
      const list = c as EntryList;
      const n = Number(d);
      if (!ENTRY_LISTS.includes(list) || !Number.isInteger(n)) continue;
      out.pages = out.pages.map((p) =>
        p.slug !== a
          ? p
          : {
              ...p,
              blocks: p.blocks.map((bl) => {
                if (bl.id !== b) return bl;
                const entries = [...((bl[list] ?? []) as (object & { translations?: Translations })[])];
                if (!entries[n]) return bl;
                entries[n] = set(entries[n]!, e);
                return { ...bl, [list]: entries };
              }),
            },
      );
    }
  }
  if (stringsChanged) {
    const all = { ...(out.strings ?? {}) };
    if (Object.keys(strings).length) all[lang] = strings;
    else delete all[lang];
    out = { ...out, strings: all };
  }
  return out;
}
