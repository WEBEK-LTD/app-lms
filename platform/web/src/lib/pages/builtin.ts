import { builtInText, DICTIONARY_LANGUAGES, DICTIONARY_VERSION } from "../i18n/builtin";
import { yallappPageTexts } from "../i18n/yallapp-texts";
import { withFilledTexts } from "./fill-texts";
import type { Layout, LayoutContent } from "./types";

/**
 * 43 Yallapp's own translations in a served layout: a tab name, page title
 * or block text that is still exactly what Yallapp wrote ("Home", a
 * design's sample text) gets its Arabic and Turkish in `translations` for
 * every language the app offers that has them, unless the owner wrote
 * their own. A default language with them gets them as the main text, so
 * an Arabic-first app doesn't open on "Home". Owner texts always win. The
 * hosted API and the plugin then apply `translations` as before.
 */
export function withBuiltInTexts(layout: Layout): Layout {
  const languages = layout.languages.available.filter((l) => DICTIONARY_LANGUAGES.includes(l));
  const filled = withFilledTexts(layout, languages, builtInText);
  if (filled === layout) return layout;
  // The version changes with Yallapp's translations, so apps and the plugin fetch them again.
  return { ...filled, version: `${layout.version}~t${DICTIONARY_VERSION}` };
}

/**
 * 132.40 A layout whose main language Yallapp translates into (Arabic,
 * Turkish) with the texts Yallapp wrote in English (a new app's tabs and
 * home, a design's samples) in that language, their English and the other
 * language Yallapp has kept as translations, also for a language the app
 * doesn't offer yet. What the app would show (`withBuiltInTexts`), so the
 * editors show it too. The owner's own texts stay; any other main language
 * leaves the layout as it is.
 */
export function inMainLanguage<T extends LayoutContent>(layout: T): T {
  const main = layout.languages.default;
  if (main === "en" || !DICTIONARY_LANGUAGES.includes(main)) return layout;
  const every = { ...layout, languages: { default: main, available: [...new Set([main, "en", ...DICTIONARY_LANGUAGES])] } };
  const filled = withFilledTexts(every, DICTIONARY_LANGUAGES, builtInText);
  return filled === every ? layout : { ...filled, languages: layout.languages };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

/**
 * Yallapp's translations of the texts it writes, with this app's name, in
 * the app's languages that have them: English text, then language, then
 * text. For the dashboard's phone preview, which shows what the app will.
 */
export function builtInSuggestions(appName: string | null, languages: readonly string[]): Record<string, Record<string, string>> {
  const wanted = languages.filter((l) => DICTIONARY_LANGUAGES.includes(l));
  if (!wanted.length) return {};
  const name = appName?.trim() || "our app";
  const out: Record<string, Record<string, string>> = {};
  for (const text of yallappPageTexts()) {
    const filled = text.includes("{app}") ? text.replaceAll("{app}", text.startsWith("<") ? escapeHtml(name) : name) : text;
    for (const lang of wanted) {
      const translated = builtInText(filled, lang);
      if (translated !== null) (out[filled] ??= {})[lang] = translated;
    }
  }
  return out;
}
