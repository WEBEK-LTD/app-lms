/**
 * 52 Pages whose prices follow the visitor's country (pounds in Egypt,
 * dollars elsewhere), and the request headers that decide it (lib/geo.ts).
 *
 * The pages are rendered per request (`dynamic = "force-dynamic"`), and
 * Next.js sends them with `Cache-Control: private, no-cache, no-store`, so
 * no CDN or proxy keeps a copy today. As a second guard, next.config.ts
 * sends `Netlify-Vary` with the country headers: if Netlify's cache is ever
 * turned on for them (`Netlify-CDN-Cache-Control`), it keeps one copy per
 * country header value and one for Egypt. A plain `Vary` can't be added:
 * Next.js replaces it on app pages with its own (`rsc, next-router-…`).
 * No imports: next.config.ts reads it.
 */

export const COUNTRY_VARY_HEADERS = ["X-Yallapp-Client-Country", "X-Country", "CF-IPCountry", "Accept-Language"] as const;

/** The pages that show plan prices: the home page and the pricing page (the dashboard is private anyway). */
export const PRICED_PAGES = ["/", "/pricing"] as const;

/** The cache key Netlify uses for those pages: the headers above, and Egypt or not by its own geolocation. */
export function countryVaryHeaders(): { key: string; value: string }[] {
  return [{ key: "Netlify-Vary", value: `header=${COUNTRY_VARY_HEADERS.join("|")},country=eg` }];
}
