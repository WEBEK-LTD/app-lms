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

/** 195 Every saved page's fields, read in one query for this render. */
const savedSiteContent = cache(async (): Promise<Map<string, Record<string, string>>> => {
  const store = await getStore();
  return new Map((await store.listSiteContent()).map((record) => [record.key, record.fields]));
});

/**
 * 195 Several pages' texts at once, as `getSiteContent` gives each (the
 * documentation's search reads all its articles): one query for them all,
 * not one or two per page. Those held the site's one database connection
 * with more queries waiting than it takes ("Queue limit reached"), failing
 * the page and the session read beside it.
 */
export async function getSiteContents(keys: readonly string[], lang: Lang = "en"): Promise<Record<string, string>[]> {
  const pages = keys.map((key) => {
    const page = contentPage(key);
    if (!page) throw new Error(`Unknown website content: ${key}`);
    return page;
  });
  let saved: Map<string, Record<string, string>> | null;
  try {
    saved = await savedSiteContent();
  } catch {
    saved = null;
  }
  return pages.map((page, i) => {
    if (!saved) return { ...page.defaults };
    const key = keys[i]!;
    const english = contentWith(page, saved.get(key));
    return lang === "en" ? english : contentInLang(page, lang, english, saved.get(langContentKey(key, lang)) ?? null);
  });
}
