import type { Lang } from "@/i18n/config";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { inMainLanguage } from "../pages/builtin";
import { loadLayout, saveDraft } from "../pages/layout";
import type { Languages } from "../pages/types";

/**
 * 132.40 The language a new app starts in. Someone whose dashboard speaks
 * Arabic or Turkish (they signed up in it, or chose it) gets apps whose
 * main language is theirs, with English after it and the other languages
 * the app would have had (the team's defaults for new apps, or the demo's)
 * after that, as many as the plan allows; their pages are written in it
 * (Studio's template words, lib/studio/app-words.ts, and Yallapp's own
 * texts, lib/i18n/builtin), with the other languages as translations. An
 * English dashboard's apps start as before. The owner changes all of it on
 * Languages; apps made before keep theirs.
 */

/** The languages Studio writes its templates' words in (lib/studio/app-words.ts). */
export type WordsLang = "en" | "ar" | "tr";

/** A new app's languages for an owner whose dashboard speaks `lang`, from the ones it would have had (`base`). */
export function startLanguages(lang: Lang, base: Languages): Languages {
  if (lang === "en") return { default: base.default, available: [...base.available] };
  return { default: lang, available: [...new Set([lang, "en", ...base.available])] };
}

/** The language a new Studio project's words are written in: its main language when Studio has words in it, else `fallback`. */
export function wordsLangOf(languages: Pick<Languages, "default"> | null | undefined, fallback: WordsLang): WordsLang {
  const main = languages?.default;
  return main === "en" || main === "ar" || main === "tr" ? main : fallback;
}

/**
 * A new regular app's first draft in `languages`: the default pages and tabs
 * for its type, with Yallapp's texts in its main language. Saved without
 * them (logged) should a text not fit, so the app is made all the same.
 */
export async function startDraftIn(store: DataStore, app: App, languages: Languages, now: Date): Promise<void> {
  const record = await loadLayout(store, app, now);
  const draft = { ...record.draft, languages };
  const saved = await saveDraft(store, app, inMainLanguage(draft), now);
  if (saved.ok) return;
  console.error("[start language]", saved.errors.slice(0, 3).join("; "));
  await saveDraft(store, app, draft, now);
}

/**
 * 132.40 The app's languages with `code` as the main one ("Make Arabic the
 * main language" on Languages): first in the list when it isn't in it yet,
 * in the place of the last of the others when the plan has room for no
 * more (`dropped`; its texts are kept, and come back with it).
 */
export function withMainLanguage(languages: Pick<Languages, "default" | "available">, code: string, limit: number | null): { languages: Languages; dropped: string | null } {
  if (languages.available.includes(code)) return { languages: { default: code, available: [...languages.available] }, dropped: null };
  const full = limit !== null && languages.available.length >= limit;
  const kept = full ? languages.available.slice(0, -1) : languages.available;
  return { languages: { default: code, available: [code, ...kept] }, dropped: full ? (languages.available.at(-1) ?? null) : null };
}
