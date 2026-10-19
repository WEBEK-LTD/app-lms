import "server-only";
import { cache } from "react";
import type { Lang } from "@/i18n/config";
import { getStore } from "../data";
import { contentPage, contentWith } from "./site";
import { contentInLang, langContentKey } from "./site-lang";

/**
 * A page's texts for this render: the team's edit, or the defaults when there
 * is none or the database can't be read (as while the pages are built). Pages
 * made ahead of time read it once; saving in the admin rebuilds them.
 * 55 In Arabic and Turkish: the team's edit in that language, the built-in
 * translation, then the English text (lib/content/site-lang.ts).
 */
export const getSiteContent = cache(async (key: string, lang: Lang = "en"): Promise<Record<string, string>> => {
  const page = contentPage(key);
  if (!page) throw new Error(`Unknown website content: ${key}`);
  let english: Record<string, string>;
  let saved: Record<string, string> | null = null;
  try {
    const store = await getStore();
    english = contentWith(page, (await store.getSiteContent(key))?.fields);
    if (lang !== "en") saved = (await store.getSiteContent(langContentKey(key, lang)))?.fields ?? null;
  } catch {
    english = { ...page.defaults };
  }
  return lang === "en" ? english : contentInLang(page, lang, english, saved);
});
