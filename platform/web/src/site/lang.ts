import "server-only";
import { notFound } from "next/navigation";
import { isPrefixedLang, PREFIXED_LANGS, type PrefixedLang } from "@/i18n/config";

/**
 * 55 The public website's pages are written once here (src/site), in any
 * language. Each English route (src/app/pricing/page.tsx…) renders them with
 * "en" at its usual address; src/app/[lang]/… renders the same page for /ar
 * and /tr. A route file keeps its own rendering settings (`dynamic`).
 */

/** The `[lang]` segment's values, for generateStaticParams. */
export function langParams(): { lang: PrefixedLang }[] {
  return PREFIXED_LANGS.map((lang) => ({ lang }));
}

/** The `[lang]` of a route; a value that isn't one of ours is a page that doesn't exist. */
export async function routeLang(params: Promise<{ lang: string }>): Promise<PrefixedLang> {
  const { lang } = await params;
  if (!isPrefixedLang(lang)) notFound();
  return lang;
}
