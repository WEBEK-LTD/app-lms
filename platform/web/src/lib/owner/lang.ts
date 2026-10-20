import { DEFAULT_LANG, isLang, type Lang } from "@/i18n/config";

/** 58 The first of English, Arabic or Turkish in an `Accept-Language` header, by its weights; null when none. */
export function acceptedLang(header: string | null | undefined): Lang | null {
  if (!header) return null;
  const choices = header
    .split(",")
    .slice(0, 20)
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q=([0-9.]+)\s*$/.exec(p)?.[1]).find(Boolean);
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q === undefined ? 1 : Number(q), index };
    })
    .filter((c) => c.q > 0 && isLang(c.lang))
    .sort((a, b) => b.q - a.q || a.index - b.index);
  const first = choices[0]?.lang;
  return isLang(first) ? first : null;
}

/**
 * 58 The language of what the Owner API says to a person: the dashboard
 * language they chose, else the request's (or, for a push, the one their
 * device signed in with), else English.
 */
export function ownerLang(chosen: string | null | undefined, ...fallbacks: (string | null | undefined)[]): Lang {
  if (isLang(chosen)) return chosen;
  for (const fallback of fallbacks) if (isLang(fallback)) return fallback;
  return DEFAULT_LANG;
}
