import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { robotsRules } from "@/lib/sitemap";

/** 32 Read per request, so the sitemap's address follows APP_URL. */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return robotsRules(siteUrl());
}
