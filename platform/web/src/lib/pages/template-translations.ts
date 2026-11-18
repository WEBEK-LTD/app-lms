import { APP_WORDS } from "../studio/app-words";
import { DEMO_FACTS } from "../studio/demo-templates";
import { INNER_SCREENS, OWN_SCREEN_TITLES } from "./inner-screens";
import { OWN_TRANSLATIONS, type Translations } from "./types";

/**
 * 156 Yallapp's own translations of the texts it writes, and when they stop
 * applying. A template (a Studio template, a demo, a Signature look, a
 * page around a screen, a new app's tabs) writes each text in the project's
 * language with Studio's other languages as `translations` (lib/studio/
 * demo-templates.ts `translating`, `sigEntry`, `withDemoFacts`). Those are
 * translations of the template's word, not of whatever the owner writes
 * there later: once the owner changed the text, the template's word in the
 * other languages no longer says it, and the app showed it all the same
 * (the owner's review in English, "[رأي أحد العملاء فيك]" on an Arabic
 * phone). A translation is the template's when it is one of Yallapp's
 * template words in that language; it applies while the text is still that
 * word (in any of Studio's languages), and goes once the owner changed the
 * text: the app then shows the owner's own text in that language too. A
 * translation the owner wrote stays, whatever it says: any other words, and
 * one marked as theirs (`Translations._own`, the fields they wrote by hand
 * in each language) even when it is one of the template's words.
 */

/** A word in Studio's languages, as templates write it (`{app}`: the app's name). */
export type WordForms = Partial<Record<"en" | "ar" | "tr", string>>;

export { OWN_TRANSLATIONS };

const TEMPLATE_LANGS = ["en", "ar", "tr"] as const;
const APP = "{app}";
/** A word with the app's name in it needs this many letters of its own to be told apart from the owner's words. */
const NAMED_MIN = 3;

interface Index {
  exact: Map<string, Map<string, WordForms[]>>;
  /** Words with the app's name in them, with their longest part of their own to look for first. */
  named: Map<string, { regex: RegExp; hint: string; forms: WordForms }[]>;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIndex(sets: Iterable<WordForms>): Index {
  const exact = new Map<string, Map<string, WordForms[]>>();
  const named = new Map<string, { regex: RegExp; hint: string; forms: WordForms }[]>();
  for (const forms of sets) {
    for (const lang of TEMPLATE_LANGS) {
      const text = forms[lang]?.trim();
      if (!text) continue;
      if (!text.includes(APP)) {
        const byText = exact.get(lang) ?? exact.set(lang, new Map()).get(lang)!;
        (byText.get(text) ?? byText.set(text, []).get(text)!).push(forms);
        continue;
      }
      // "{app}" alone (a wordmark) is the app's name: any text would match it.
      if (text.replaceAll(APP, "").replace(/\s/g, "").length < NAMED_MIN) continue;
      const parts = text.split(APP);
      const hint = parts.reduce((a, b) => (b.length > a.length ? b : a), "");
      (named.get(lang) ?? named.set(lang, []).get(lang)!).push({ regex: new RegExp(`^${parts.map(escapeRegex).join("(.*?)")}$`, "s"), hint, forms });
    }
  }
  return { exact, named };
}

/** Studio's own words (lib/studio/app-words.ts), the demos' facts in place of brackets and the screens' own titles and the inner screens'. */
function* studioWordSets(): Iterable<WordForms> {
  for (const word of Object.keys(APP_WORDS.en) as (keyof typeof APP_WORDS.en)[]) yield { en: APP_WORDS.en[word], ar: APP_WORDS.ar[word], tr: APP_WORDS.tr[word] };
  for (const facts of Object.values(DEMO_FACTS)) for (const forms of Object.values(facts ?? {})) if (forms) yield forms;
  for (const forms of Object.values(OWN_SCREEN_TITLES)) if (forms) yield forms;
  // The titles of the pages around the app's inner screens (a checkout, the library, live classes).
  for (const screen of INNER_SCREENS) if (screen.title) yield screen.title;
}

let studioIndex: Index | null = null;
const extraIndexes = new WeakMap<readonly WordForms[], Index>();

const APP_NAME_ALONE: WordForms = { en: APP, ar: APP, tr: APP };

/** The names a template may have written for `{app}`: the app's, a demo's (Leqaa), none, or the placeholder itself. */
const DEMO_NAMES = ["Leqaa", "لقاء"];

export interface TemplateWords {
  /** The app's name now, which templates wrote for `{app}`. */
  appName?: string | null;
  /** More of Yallapp's words (the server's: its translations of the texts it writes, lib/i18n/builtin). */
  more?: readonly WordForms[];
}

/** The template words `text` is in `lang`, each with the name it has for `{app}`. */
function templateWordsOf(text: string, lang: string, options: TemplateWords): { forms: WordForms; app: string }[] {
  if (!(TEMPLATE_LANGS as readonly string[]).includes(lang)) return [];
  studioIndex ??= buildIndex(studioWordSets());
  const indexes = [studioIndex];
  if (options.more?.length) {
    let more = extraIndexes.get(options.more);
    if (!more) extraIndexes.set(options.more, (more = buildIndex(options.more)));
    indexes.push(more);
  }
  const names = new Set([options.appName?.trim() ?? "", ...DEMO_NAMES, "", APP]);
  const out: { forms: WordForms; app: string }[] = [];
  const own = text.trim();
  // A word that is the app's name alone (a wordmark, "{app}"): the app's name now, as the template wrote it.
  const name = options.appName?.trim();
  if (name && own === name) out.push({ forms: APP_NAME_ALONE, app: name });
  for (const index of indexes) {
    for (const forms of index.exact.get(lang)?.get(own) ?? []) out.push({ forms, app: "" });
    for (const { regex, hint, forms } of index.named.get(lang) ?? []) {
      if (!own.includes(hint)) continue;
      const match = regex.exec(own);
      if (!match) continue;
      const captured = match.slice(1);
      const app = captured[0] ?? "";
      if (captured.every((c) => c === app) && names.has(app)) out.push({ forms, app });
    }
  }
  return out;
}

/** Whether `text` is one of these words, in any of Studio's languages. */
function isFormOf(text: string, word: { forms: WordForms; app: string }): boolean {
  const own = text.trim();
  return TEMPLATE_LANGS.some((lang) => {
    const form = word.forms[lang]?.trim();
    return form !== undefined && form !== "" && form.replaceAll(APP, word.app) === own;
  });
}

/** The fields the owner wrote by hand in `lang`. */
export function ownFields(translations: Translations | undefined, lang: string): string[] {
  const own = (translations as Record<string, Record<string, string>> | undefined)?.[OWN_TRANSLATIONS]?.[lang];
  return typeof own === "string" ? own.split(/\s+/).filter(Boolean) : [];
}

/** Whether `text` is one of the template's words in any of Studio's languages. */
function isTemplateText(text: string, options: TemplateWords): boolean {
  return TEMPLATE_LANGS.some((lang) => templateWordsOf(text, lang, options).length > 0);
}

/** Whether `text` is one of the template's placeholders in [brackets] in `lang`: words left for the owner to write. */
function isPlaceholder(text: string, lang: string | null, options: TemplateWords): boolean {
  const own = text.trim();
  if (!own.startsWith("[") || !own.endsWith("]")) return false;
  return lang === null ? isTemplateText(own, options) : templateWordsOf(own, lang, options).length > 0;
}

/**
 * The owner's own words for `field` in a language other than `except`: its
 * text when that isn't one of the template's words, else the first
 * translation of theirs (English first). Null when the field has none.
 */
function ownWordsOf(value: { translations?: Translations }, field: string, except: string | null, options: TemplateWords): string | null {
  const text = (value as Record<string, unknown>)[field];
  if (except !== null && typeof text === "string" && text.trim() && !isTemplateText(text, options)) return text;
  const langs = Object.keys(value.translations ?? {}).filter((l) => l !== OWN_TRANSLATIONS && l !== except);
  langs.sort((a, b) => (a === "en" ? -1 : b === "en" ? 1 : 0));
  for (const lang of langs) {
    const t = value.translations?.[lang]?.[field];
    if (typeof t !== "string" || !t.trim()) continue;
    if (ownFields(value.translations, lang).includes(field) || !templateWordsOf(t, lang, options).length) return t;
  }
  return null;
}

/**
 * What a translation is: `own` (the owner's words), `template` (Yallapp's
 * word, and the text is still that word), `stale` (Yallapp's word for a
 * text the owner changed since, or one of its [placeholders] where the
 * owner wrote their own words in another language: the app shows the
 * owner's words instead), or `none` (no translation: the app shows the
 * owner's text).
 */
export type TranslationState = "none" | "own" | "template" | "stale";

export function translationState(value: { translations?: Translations }, field: string, lang: string, options: TemplateWords = {}): TranslationState {
  const translation = value.translations?.[lang]?.[field];
  if (typeof translation !== "string" || !translation.trim()) return "none";
  if (ownFields(value.translations, lang).includes(field)) return "own";
  const words = templateWordsOf(translation, lang, options);
  if (!words.length) return "own";
  const text = (value as Record<string, unknown>)[field];
  if (typeof text !== "string" || !words.some((w) => isFormOf(text, w))) return "stale";
  // The template's placeholder, where the owner wrote the words in another language.
  return isPlaceholder(translation, lang, options) && ownWordsOf(value, field, lang, options) !== null ? "stale" : "template";
}

/**
 * 156 What the app shows for `field` in the main language: its text, or,
 * when that is still the template's [placeholder] and the owner wrote the
 * words in another language, those words (the testimonial written in
 * English in an Arabic-first project shows on Arabic phones too).
 */
export function servedText(value: { translations?: Translations }, field: string, options: TemplateWords = {}): string | null {
  const text = (value as Record<string, unknown>)[field];
  if (typeof text !== "string" || !isPlaceholder(text, null, options)) return typeof text === "string" ? text : null;
  return ownWordsOf(value, field, null, options) ?? text;
}

/** Whether a translation the owner just wrote needs marking as theirs to stay: one of the template's words, but not for the text it is next to. */
function needsMark(value: { translations?: Translations }, field: string, lang: string, options: TemplateWords): boolean {
  return translationState(value, field, lang, options) === "stale";
}

/** Who an entry of a list is, to find it again after a move: its id, a page's slug, else its translations. */
function keyOf(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.id === "string") return `id:${value.id}`;
  if (typeof value.slug === "string") return `slug:${value.slug}`;
  return value.translations ? `t:${JSON.stringify(value.translations)}` : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** One object's translations without the stale ones (the same object when none is). */
function freshOne<T extends Record<string, unknown>>(value: T, options: FreshOptions): T {
  const translations = value.translations as Translations | undefined;
  if (!isRecord(translations)) return value;
  let changed = false;
  // What leaves the platform: a main text still the template's placeholder gives way to the owner's words in another language.
  const texts: Record<string, string> = {};
  if (options.dropMarks) {
    const fields = new Set(Object.entries(translations).flatMap(([lang, t]) => (lang !== OWN_TRANSLATIONS && isRecord(t) ? Object.keys(t) : [])));
    for (const field of fields) {
      const shown = servedText(value, field, options);
      if (shown !== null && shown !== value[field]) texts[field] = shown;
    }
  }
  const kept: Record<string, Record<string, string>> = {};
  for (const [lang, byField] of Object.entries(translations)) {
    if (lang === OWN_TRANSLATIONS || !isRecord(byField)) continue;
    const out: Record<string, string> = {};
    for (const [field, text] of Object.entries(byField)) {
      if (translationState(value, field, lang, options) === "stale") changed = true;
      else out[field] = text as string;
    }
    if (Object.keys(out).length) kept[lang] = out;
  }
  // The owner's marks for the translations still there.
  const marks = (translations as Record<string, unknown>)[OWN_TRANSLATIONS];
  if (isRecord(marks)) {
    if (options.dropMarks) changed = true;
    else {
      const own: Record<string, string> = {};
      for (const [lang, fields] of Object.entries(marks)) {
        const still = typeof fields === "string" ? fields.split(/\s+/).filter((f) => f && kept[lang]?.[f] !== undefined) : [];
        if (still.length) own[lang] = still.join(" ");
      }
      if (Object.keys(own).length) kept[OWN_TRANSLATIONS] = own;
      if (JSON.stringify(own) !== JSON.stringify(marks)) changed = true;
    }
  }
  if (Object.keys(texts).length) changed = true;
  if (!changed) return value;
  if (!Object.keys(kept).length) {
    const { translations: _gone, ...rest } = value;
    void _gone;
    return { ...rest, ...texts } as T;
  }
  return { ...value, ...texts, translations: kept };
}

/** `dropMarks`: what leaves the platform (for the apps and the plugin): without the owner's marks, a main text still the template's placeholder shown in the owner's words. */
export type FreshOptions = TemplateWords & { dropMarks?: boolean };

/**
 * `value` (a layout, a page, an element, any part of them) with every stale
 * template translation taken out, at any depth: tabs, the side menu, pages'
 * titles, blocks and their entries, Studio's elements, their headers,
 * entries, slides and pictures. The same object when nothing was stale, so
 * callers can tell. `dropMarks`: without the owner's marks too (what leaves
 * the platform).
 */
export function withoutStaleTranslations<T>(value: T, options: FreshOptions = {}): T {
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const next = withoutStaleTranslations(item, options);
      if (next !== item) changed = true;
      return next;
    });
    return (changed ? out : value) as T;
  }
  if (!isRecord(value)) return value;
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    // The owner's interface strings (43) aren't translations of a text.
    if (key === "translations" || key === "strings" || child === null || typeof child !== "object") {
      out[key] = child;
      continue;
    }
    const next = withoutStaleTranslations(child, options);
    if (next !== child) changed = true;
    out[key] = next;
  }
  const own = freshOne(changed ? out : value, options);
  return (own !== value ? own : changed ? out : value) as T;
}

/**
 * The owner's edit, from `before` to `after` (one change in an editor), in
 * the parts it changed only: a translation they wrote that is one of the
 * template's words but not for the text it is next to is marked as theirs
 * (`_own`), so it stays; the template's translations of a text they changed
 * go. Parts are matched by where they are: an element by its id, a page by
 * its slug, an entry by its place, and one that only moved is the same as
 * before. What the edit didn't touch is left to the server, which knows
 * more of Yallapp's words (lib/pages/layout.ts `saveDraft`).
 */
export function editedTranslations<T>(before: T, after: T, options: TemplateWords = {}): T {
  return edited(before, after, options);
}

/** Whether an object's own texts (the fields it has translations of, and those translations) changed. */
function textsChanged(was: Record<string, unknown>, now: Record<string, unknown>): boolean {
  const translations = isRecord(now.translations) ? now.translations : {};
  if (JSON.stringify(was.translations ?? null) !== JSON.stringify(now.translations ?? null)) return true;
  const fields = new Set(Object.entries(translations).flatMap(([lang, t]) => (lang !== OWN_TRANSLATIONS && isRecord(t) ? Object.keys(t) : [])));
  return [...fields].some((f) => was[f] !== now[f]);
}

function edited<T>(before: unknown, after: T, options: TemplateWords): T {
  if (before === after || !after || typeof after !== "object") return after;
  if (Array.isArray(after)) {
    const old = Array.isArray(before) ? before : [];
    const byKey = new Map(old.map((o) => [keyOf(o), o] as const).filter(([k]) => k !== null));
    let changed = false;
    const out = after.map((item, i) => {
      const key = keyOf(item);
      const was = (key !== null ? byKey.get(key) : undefined) ?? (isRecord(item) && (typeof item.id === "string" || typeof item.slug === "string") ? undefined : old[i]);
      const next = edited(was, item, options);
      if (next !== item) changed = true;
      return next;
    });
    return (changed ? out : after) as T;
  }
  const value = after as Record<string, unknown>;
  const existed = isRecord(before);
  const was = existed ? before : {};
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "translations" || key === "strings" || child === null || typeof child !== "object") {
      out[key] = child;
      continue;
    }
    const next = edited(was[key], child, options);
    if (next !== child) changed = true;
    out[key] = next;
  }
  const result = changed ? out : value;
  const translations = result.translations as Translations | undefined;
  if (!isRecord(translations) || !textsChanged(was, result)) return result as T;
  // A translation typed now: the owner's, marked when it is one of the template's words for another text.
  const previous = (was.translations ?? {}) as Translations;
  const marks: Record<string, string[]> = {};
  if (existed) {
    for (const [lang, texts] of Object.entries(translations)) {
      if (lang === OWN_TRANSLATIONS || !isRecord(texts)) continue;
      for (const [field, text] of Object.entries(texts)) {
        if (text === previous[lang]?.[field] || ownFields(translations, lang).includes(field)) continue;
        if (needsMark(result, field, lang, options)) (marks[lang] ??= []).push(field);
      }
    }
  }
  let next = result;
  if (Object.keys(marks).length) {
    const own = { ...((translations as Record<string, unknown>)[OWN_TRANSLATIONS] as Record<string, string> | undefined) };
    for (const [lang, fields] of Object.entries(marks)) own[lang] = [...new Set([...ownFields(translations, lang), ...fields])].join(" ");
    next = { ...result, translations: { ...translations, [OWN_TRANSLATIONS]: own } };
  }
  return freshOne(next, options) as T;
}

/**
 * A translation the owner just wrote in an editor, marked as theirs when it
 * needs to be to stay (one of the template's words for another text); any
 * other is theirs already by its words, and stays unmarked.
 */
export function withTypedTranslation<T extends { translations?: Translations }>(value: T, lang: string, field: string, options: TemplateWords = {}): T {
  if (translationState(value, field, lang, options) !== "stale") return value;
  const text = value.translations?.[lang]?.[field] ?? "";
  return { ...value, translations: withOwnTranslation(value.translations, lang, field, text) };
}

/** A translation set in an editor by hand: its value, marked as the owner's (removed when empty). */
export function withOwnTranslation(translations: Translations | undefined, lang: string, field: string, text: string): Translations | undefined {
  const all: Record<string, Record<string, string>> = { ...(translations ?? {}) };
  const texts = { ...(all[lang] ?? {}) };
  const own = new Set(ownFields(translations, lang));
  if (text) {
    texts[field] = text;
    own.add(field);
  } else {
    delete texts[field];
    own.delete(field);
  }
  if (Object.keys(texts).length) all[lang] = texts;
  else delete all[lang];
  const marks = { ...(all[OWN_TRANSLATIONS] ?? {}) };
  if (own.size) marks[lang] = [...own].join(" ");
  else delete marks[lang];
  if (Object.keys(marks).length) all[OWN_TRANSLATIONS] = marks;
  else delete all[OWN_TRANSLATIONS];
  return Object.keys(all).length ? all : undefined;
}

/** Whether `value` is texts per language code (Studio › Screens' `ScreenTexts`): every key a language, every value words. */
function isTextsByLanguage(value: unknown, isLanguage: (code: string) => boolean): value is Record<string, string> {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 1 && entries.every(([code, text]) => isLanguage(code) && typeof text === "string") && entries.some(([code]) => (TEMPLATE_LANGS as readonly string[]).includes(code));
}

/**
 * 156 Studio › Screens' texts (the sign-in's welcome, the launch screen's
 * title, the account menu's names, the checkout's title), each given per
 * language: the template's words in the other languages of a text the
 * owner changed in the app's main language go, so the app shows the owner's
 * text there too (the app shows a language's own text, else the first
 * given). Anything else, and any text of the owner's, stays.
 */
export function withoutStaleScreenTexts<T>(screens: T, main: string | null | undefined, isLanguage: (code: string) => boolean, options: TemplateWords = {}): T {
  if (!main) return screens;
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      let changed = false;
      const out = value.map((v) => {
        const next = walk(v);
        if (next !== v) changed = true;
        return next;
      });
      return changed ? out : value;
    }
    if (!isRecord(value)) return value;
    if (isTextsByLanguage(value, isLanguage)) {
      const text = value[main]?.trim();
      if (!text) return value;
      const kept = Object.fromEntries(
        Object.entries(value).filter(([lang, t]) => {
          if (lang === main) return true;
          const words = templateWordsOf(t, lang, options);
          return !words.length || words.some((w) => isFormOf(text, w));
        }),
      );
      return Object.keys(kept).length === Object.keys(value).length ? value : kept;
    }
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const next = walk(child);
      if (next !== child) changed = true;
      out[key] = next;
    }
    return changed ? out : value;
  };
  return walk(screens) as T;
}

// ——— 156 The template's [placeholders] never reach a customer ———

/** The bracketed words of the templates' placeholders ("[Customer name]", "[اسم العميل]"), in any of Studio's languages. */
let placeholderIndex: { chunks: Set<string>; cutoff: Set<string> } | null = null;
const extraPlaceholders = new WeakMap<readonly WordForms[], Set<string>>();
const BRACKETS = /[[［【][^\]］】]*\p{L}[^\]］】]*[\]］】]/gu;

function chunksOf(forms: Iterable<WordForms>, into: Set<string>): Set<string> {
  for (const word of forms) for (const lang of TEMPLATE_LANGS) for (const m of word[lang]?.matchAll(BRACKETS) ?? []) into.add(m[0]);
  return into;
}

function placeholders(options: TemplateWords): { chunks: (chunk: string) => boolean; cutoff: Set<string> } {
  placeholderIndex ??= {
    chunks: chunksOf(studioWordSets(), new Set()),
    // The shop's same-day cut-off, a fact the store's delivery settings have (Leqaa's "Order before [your cut-off time]").
    cutoff: chunksOf([{ en: APP_WORDS.en.lqCutoff, ar: APP_WORDS.ar.lqCutoff, tr: APP_WORDS.tr.lqCutoff }], new Set()),
  };
  let more: Set<string> | undefined;
  if (options.more?.length) {
    more = extraPlaceholders.get(options.more);
    if (!more) extraPlaceholders.set(options.more, (more = chunksOf(options.more, new Set())));
  }
  const index = placeholderIndex;
  return { chunks: (chunk) => index.chunks.has(chunk) || Boolean(more?.has(chunk)), cutoff: index.cutoff };
}

/** The store's facts a placeholder stands for, filled in where the store has them. */
export interface StoreFacts {
  /** The same-day cut-off ("14:00"), when the shop delivers on the day. */
  cutoff?: string | null;
  /**
   * A business's own app, not one of Yallapp's demos: the demos' facts a
   * project started from a demo has (Leqaa's "Order before 4 pm and it
   * arrives today, anywhere in Cairo.", Sofra's Zamalek, Sahm's opening
   * hours) aren't its own, so they are the template's words again, their
   * placeholders filled from the store or left out.
   */
  ownBusiness?: boolean;
}

/** The demos' facts by their words in each language, with the template's own words in that language they stand in for. */
let demoFactWords: Map<string, string> | null = null;

function demoFactTemplate(text: string, appName: string | null | undefined): string | null {
  if (!demoFactWords) {
    demoFactWords = new Map();
    for (const facts of Object.values(DEMO_FACTS)) {
      for (const [word, forms] of Object.entries(facts ?? {})) {
        for (const lang of TEMPLATE_LANGS) {
          const own = forms?.[lang]?.trim();
          const template = (APP_WORDS[lang] as Record<string, string>)[word];
          if (own && template && !demoFactWords.has(own)) demoFactWords.set(own, template);
        }
      }
    }
  }
  const template = demoFactWords.get(text.trim());
  return template === undefined ? null : template.replaceAll(APP, appName?.trim() ?? "");
}

/** Whether `text` still has one of the templates' placeholders in it (Studio's own canvas keeps showing it to the owner). */
export function hasPlaceholder(text: unknown, options: TemplateWords = {}): boolean {
  if (typeof text !== "string") return false;
  const known = placeholders(options);
  return [...text.matchAll(BRACKETS)].some((m) => known.chunks(m[0]));
}

/** `text` with the store's facts in place of their placeholders. */
function filled(text: string, facts: StoreFacts, options: TemplateWords): string {
  if (!facts.cutoff) return text;
  const { cutoff } = placeholders(options);
  return text.replace(BRACKETS, (chunk) => (cutoff.has(chunk) ? facts.cutoff! : chunk));
}

/** A node's, entry's or slide's own words, its fields whose placeholder leaves the whole of it out, and its translations without placeholders. */
function placeholderFree<T extends Record<string, unknown>>(value: T, fields: readonly string[], main: readonly string[], facts: StoreFacts, options: TemplateWords): T | null {
  let out: Record<string, unknown> = value;
  const set = (key: string, v: unknown) => {
    if (out === value) out = { ...value };
    if (v === undefined) delete out[key];
    else out[key] = v;
  };
  const undemo = (text: string) => (facts.ownBusiness ? (demoFactTemplate(text, options.appName) ?? text) : text);
  for (const field of fields) {
    const text = value[field];
    if (typeof text !== "string") continue;
    const own = filled(undemo(text), facts, options);
    if (own !== text) set(field, own);
    if (!hasPlaceholder(own, options)) continue;
    // A main text (an element's words, a review's) still to be written: the whole of it waits.
    if (main.includes(field)) return null;
    set(field, undefined);
  }
  const translations = value.translations as Translations | undefined;
  if (isRecord(translations)) {
    let changed = false;
    const kept: Record<string, Record<string, string>> = {};
    for (const [lang, byField] of Object.entries(translations)) {
      if (!isRecord(byField)) continue;
      const texts: Record<string, string> = {};
      for (const [field, text] of Object.entries(byField)) {
        const own = typeof text === "string" && fields.includes(field) ? filled(undemo(text), facts, options) : (text as string);
        if (own !== text) changed = true;
        // A translation still to be written: the language shows the main text.
        if (fields.includes(field) && hasPlaceholder(own, options)) changed = true;
        else texts[field] = own;
      }
      if (Object.keys(texts).length) kept[lang] = texts;
    }
    if (changed) set("translations", Object.keys(kept).length ? kept : undefined);
  }
  return out as T;
}

const NODE_TEXTS = ["text", "title"] as const;
const ENTRY_TEXTS = ["title", "subtitle", "text", "label", "prefix", "suffix"] as const;
const SLIDE_TEXTS = ["heading", "subheading", "label"] as const;

/** One element and what it holds without placeholders, or null to leave it out. */
function nodeWithout(node: Record<string, unknown>, facts: StoreFacts, options: TemplateWords): Record<string, unknown> | null {
  // An element bound to an entry shows the entry's words: its own sample just goes.
  const own = placeholderFree(node, NODE_TEXTS, node.bind ? [] : NODE_TEXTS, facts, options);
  if (!own) return null;
  let out = own;
  const set = (key: string, v: unknown) => {
    if (out === own) out = { ...own };
    out[key] = v;
  };
  for (const key of ["children"] as const) {
    const list = own[key];
    if (!Array.isArray(list)) continue;
    const next = list.map((c) => (isRecord(c) ? nodeWithout(c, facts, options) : c)).filter((c) => c !== null);
    if (next.length !== list.length || next.some((c, i) => c !== list[i])) set(key, next);
  }
  if (isRecord(own.card)) {
    const card = nodeWithout(own.card, facts, options);
    if (card !== own.card) set("card", card ?? undefined);
  }
  // A review whose words or name are still to be written waits; the others show.
  if (Array.isArray(own.entries)) {
    const list = own.entries as Record<string, unknown>[];
    const next = list.map((e) => (isRecord(e) ? placeholderFree(e, ENTRY_TEXTS, ["text", "title"], facts, options) : e)).filter((e) => e !== null);
    if (list.length && !next.length) return null;
    if (next.length !== list.length || next.some((e, i) => e !== list[i])) set("entries", next);
  }
  if (Array.isArray(own.slides)) {
    const list = own.slides as Record<string, unknown>[];
    const next = list.map((s) => (isRecord(s) ? placeholderFree(s, SLIDE_TEXTS, [], facts, options) : s));
    if (next.some((s, i) => s !== list[i])) set("slides", next);
  }
  return out;
}

/**
 * 156 A layout as customers get it: no Studio page shows the templates'
 * [placeholders], nor, in a business's own app, a demo's facts (its city,
 * its hours, its cut-off). The store's facts fill theirs (the same-day
 * cut-off from the delivery settings); an element whose words are still a placeholder,
 * and a review still to be written, wait until the owner writes them; a
 * placeholder in a secondary line, a slide's words or the header's title
 * just goes; a translation still to be written shows the main text. Studio
 * keeps showing them to the owner. The same object when there is none.
 */
export function withoutPlaceholders<T extends { pages: readonly { studio?: StudioPageLike | null; title?: string }[] }>(layout: T, facts: StoreFacts = {}, options: TemplateWords = {}): T {
  let changed = false;
  const pages = layout.pages.map((page) => {
    const studio = page.studio;
    if (!studio || !isRecord(studio.body)) return page;
    const body = nodeWithout(studio.body as Record<string, unknown>, facts, options) ?? { ...(studio.body as Record<string, unknown>), children: [] };
    const header = isRecord(studio.header) ? placeholderFree(studio.header as Record<string, unknown>, ["title", "subtitle"], [], facts, options) : studio.header;
    if (body === studio.body && header === studio.header) return page;
    changed = true;
    return { ...page, studio: { ...studio, body, ...(studio.header !== undefined ? { header } : {}) } };
  });
  return changed ? { ...layout, pages } : layout;
}

type StudioPageLike = { body: unknown; header?: unknown };
