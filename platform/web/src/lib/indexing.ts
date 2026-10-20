/**
 * 67 Which deploys search engines may index. Netlify sets `CONTEXT` while it
 * builds: `production` for the site behind yallapp.com.tr, `deploy-preview`
 * and `branch-deploy` for the others (on *.netlify.app addresses). Those get
 * `X-Robots-Tag: noindex` on every response, so a preview never shows up in
 * Google next to the real site. Production and local builds (no CONTEXT) get
 * nothing. The headers are fixed when the site is built (next.config.ts).
 * No imports: next.config.ts reads it.
 */

export const NOINDEX_VALUE = "noindex, nofollow";

/** True when a build for this Netlify context may be indexed. */
export function indexableContext(context: string | undefined): boolean {
  const value = context?.trim();
  return !value || value === "production";
}

/** next.config.ts headers: none for production, noindex everywhere for previews and branch deploys. */
export function deployRobotsHeaders(context: string | undefined = process.env.CONTEXT): { source: string; headers: { key: string; value: string }[] }[] {
  if (indexableContext(context)) return [];
  return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: NOINDEX_VALUE }] }];
}
