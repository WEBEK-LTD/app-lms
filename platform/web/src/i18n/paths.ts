import { DEFAULT_LANG, isPrefixedLang, LANGS, type Lang } from "./config";

/**
 * 55 Addresses of the public website in each language. English pages keep
 * their addresses (no /en); Arabic and Turkish pages are the same pages under
 * /ar and /tr (src/app/[lang]). Everything else (the dashboard, the admin,
 * the API, /pay, /give, /shop, /receipts, /a, /m, /media, /oauth, /pending,
 * downloads and files) has one address in every language.
 */

/** Pages with a version in every language, by their English path. */
const EXACT_PAGES = new Set([
  "/",
  "/solutions",
  "/features",
  "/integrations",
  "/how-it-works",
  "/pricing",
  "/demo",
  "/contact",
  "/faq",
  "/docs",
  "/developers",
  "/terms",
  "/privacy",
  "/refund",
  // 66 How to delete a Yallapp account (Google Play and the App Store link to it).
  "/delete-account",
  "/sign-in",
  // 70 The code of two-step sign-in, after the password.
  "/sign-in/code",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
]);

/** Sections whose every page has a version in every language: /solutions/<id>, /docs/<article>. */
const SECTIONS = ["/solutions/", "/docs/"];

/** Splits "/docs/x?y#z" into the path and what follows it. */
function splitSuffix(href: string): [string, string] {
  const at = href.search(/[?#]/);
  return at < 0 ? [href, ""] : [href.slice(0, at), href.slice(at)];
}

/** True for the English path of a page that has an Arabic and a Turkish version. */
export function isLocalizedPath(path: string): boolean {
  const [pathname] = splitSuffix(path);
  if (EXACT_PAGES.has(pathname)) return true;
  return SECTIONS.some((section) => pathname.startsWith(section) && pathname.length > section.length && !pathname.slice(section.length).includes("/"));
}

/**
 * A page's address in a language: "/pricing" is "/ar/pricing" in Arabic and
 * "/pricing" in English; "/" is "/tr" in Turkish. Addresses without a
 * translated version (the dashboard, files, other sites) stay as they are.
 */
export function localePath(lang: Lang, href: string): string {
  if (lang === DEFAULT_LANG || !href.startsWith("/") || href.startsWith("//")) return href;
  const [pathname, suffix] = splitSuffix(href);
  if (!isLocalizedPath(pathname)) return href;
  return `/${lang}${pathname === "/" ? "" : pathname}${suffix}`;
}

/** The language of an address and its English path: "/ar/pricing" → ar, "/pricing"; "/tr" → tr, "/". */
export function splitLangPath(pathname: string): { lang: Lang; path: string } {
  const match = pathname.match(/^\/([a-z]{2})(?=\/|$)(.*)$/);
  if (match && isPrefixedLang(match[1])) return { lang: match[1], path: match[2] || "/" };
  return { lang: DEFAULT_LANG, path: pathname || "/" };
}

/** The same page in another language, for the language switcher. */
export function switchLangPath(pathname: string, to: Lang): string {
  return localePath(to, splitLangPath(pathname).path);
}

/** hreflang alternates of a page, by its English path, with English as x-default. */
export function languageAlternates(path: string): Record<Lang | "x-default", string> {
  const out = {} as Record<Lang | "x-default", string>;
  for (const lang of LANGS) out[lang] = localePath(lang, path);
  out["x-default"] = path;
  return out;
}
