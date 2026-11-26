import type { MetadataRoute } from "next";

/**
 * 231 The Community host's sitemap (community.yallapp.com.tr/sitemap.xml,
 * served by app/community/sitemap.ts through src/proxy.ts): its public
 * pages only. The language is the visitor's choice (a cookie), so each page
 * has one address.
 */
export const COMMUNITY_PUBLIC_PATHS = ["/", "/questions", "/tutorials", "/privacy", "/delete-account"] as const;

export function communitySitemap(base: string): MetadataRoute.Sitemap {
  const root = base.replace(/\/+$/, "");
  return COMMUNITY_PUBLIC_PATHS.map((p) => ({ url: p === "/" ? root : `${root}${p}` }));
}
