import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/content/get";
import { siteUrl } from "@/lib/seo";
import { siteSitemap } from "@/lib/sitemap";

/** 32 Read per request: the address comes from APP_URL, and the legal pages' dates from the admin. 55 Every page in English, Arabic and Turkish. */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated: Record<string, string | undefined> = {};
  for (const key of ["terms", "privacy", "refund"] as const) updated[`/${key}`] = (await getSiteContent(key)).updated;
  return siteSitemap(siteUrl(), updated);
}
