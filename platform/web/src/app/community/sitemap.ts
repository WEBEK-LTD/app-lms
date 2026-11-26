import type { MetadataRoute } from "next";
import { communitySitemap } from "@/components/community/site/seo";
import { communitySiteUrl } from "@/lib/community/deps";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return communitySitemap(communitySiteUrl());
}
