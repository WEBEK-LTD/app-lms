import type { MetadataRoute } from "next";
import { DOCS } from "@/content/docs";
import { LANGS } from "@/i18n/config";
import { languageAlternates, localePath } from "@/i18n/paths";
import { SOLUTIONS } from "./marketing";

/** 32 The sitemap and robots.txt: only yallapp.com.tr's public pages are listed, and the private areas are kept out. */

/** Paths that are never for search engines: signed-in areas, the API, payment and donation pages, shop links and downloads. */
export const PRIVATE_PATHS = [
  "/dashboard",
  "/admin",
  "/api/",
  "/pay/",
  "/give/",
  "/receipts/",
  "/oauth/",
  "/shop/",
  "/pending",
  "/preview-app/",
  "/demo/download/",
];

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "15 October 2026" (the legal pages' "Last updated") as a date; null when it isn't one. */
export function parseUpdated(value: string | undefined): Date | null {
  const match = value?.trim().match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!match) return null;
  const month = MONTHS.indexOf(match[2]!.toLowerCase());
  const day = Number(match[1]);
  if (month < 0 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(Number(match[3]), month, day));
}

/** Every public page, with the legal pages' "Last updated" dates (by path) where known. */
export function sitemapEntries(base: string, updated: Record<string, string | undefined> = {}): MetadataRoute.Sitemap {
  const entry = (path: string, priority: number): MetadataRoute.Sitemap[number] => {
    const lastModified = parseUpdated(updated[path]);
    return { url: `${base}${path === "/" ? "" : path}`, priority, ...(lastModified ? { lastModified } : {}) };
  };
  return [
    entry("/", 1),
    entry("/solutions", 0.9),
    ...SOLUTIONS.map((s) => entry(`/solutions/${s.id}`, 0.8)),
    entry("/features", 0.8),
    entry("/integrations", 0.8),
    entry("/how-it-works", 0.8),
    entry("/pricing", 0.9),
    entry("/demo", 0.7),
    entry("/docs", 0.7),
    ...DOCS.map((d) => entry(`/docs/${d.slug}`, 0.6)),
    entry("/developers", 0.5),
    entry("/faq", 0.6),
    entry("/contact", 0.6),
    entry("/terms", 0.3),
    entry("/privacy", 0.3),
    entry("/refund", 0.3),
  ];
}

/**
 * 55 The sitemap: every public page in English, Arabic and Turkish, each
 * entry naming all three versions (hreflang, English as x-default).
 */
export function siteSitemap(base: string, updated: Record<string, string | undefined> = {}): MetadataRoute.Sitemap {
  const url = (path: string) => `${base}${path === "/" ? "" : path}`;
  return sitemapEntries(base, updated).flatMap((entry) => {
    const path = entry.url.slice(base.length) || "/";
    const languages = Object.fromEntries(Object.entries(languageAlternates(path)).map(([lang, href]) => [lang, url(href)]));
    return LANGS.map((lang) => ({ ...entry, url: url(localePath(lang, path)), alternates: { languages } }));
  });
}

export function robotsRules(base: string): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
