import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { CM_DEFAULT_LANG, CM_LANG_COOKIE, CM_WORDS, isCmLang, type CmLang, type CmWords } from "./words";
import { communityViewer } from "./source";
import type { Viewer } from "./data";

/**
 * 231 The visitor's language: their choice (the header's picker, a cookie),
 * else the first of English, Arabic and Turkish their browser asks for,
 * else English.
 */
export const siteLang = cache(async (): Promise<CmLang> => {
  const chosen = (await cookies()).get(CM_LANG_COOKIE)?.value;
  if (isCmLang(chosen)) return chosen;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isCmLang(code)) return code;
  }
  return CM_DEFAULT_LANG;
});

export type SiteContext = { lang: CmLang; w: CmWords; viewer: Viewer | null };

/** The language, its words and the signed-in member (or null), once per request. */
export const siteContext = cache(async (): Promise<SiteContext> => {
  const lang = await siteLang();
  const viewer = await communityViewer(lang);
  return { lang, w: CM_WORDS[lang], viewer };
});
