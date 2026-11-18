import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/content/get";
import { getStore } from "@/lib/data";
import { siteUrl } from "@/lib/seo";
import { siteSitemap } from "@/lib/sitemap";
import { publicTemplateSlugs, templateSitemapEntries } from "@/lib/studio-market/public";

/**
 * 32 Read per request: the address comes from APP_URL, and the legal pages' dates from the admin. 55 Every page in English, Arabic and Turkish.
 * 106.13 With each published template of Studio Market, in each language (never one not published).
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated: Record<string, string | undefined> = {};
  for (const key of ["terms", "privacy", "refund"] as const) updated[`/${key}`] = (await getSiteContent(key)).updated;
  const base = siteUrl();
  const templates = await publicTemplateSlugs(await getStore());
  return [...siteSitemap(base, updated), ...templateSitemapEntries(base, templates)];
}
