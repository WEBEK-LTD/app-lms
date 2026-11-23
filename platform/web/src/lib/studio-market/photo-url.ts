/**
 * 106.14 A designer's photo address as the pages may draw it: only one the
 * server made for an uploaded asset (`https://…/api/v1/assets/<uuid>`, or
 * http for a local server), or Yallapp's own logo (218), nothing else (no `javascript:`, `data:` or
 * another site's address). Anything else is null and the initials show.
 * No server-only code: the browser's parts check it too.
 */
const ASSET_PATH = /^\/api\/v1\/assets\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 218 Yallapp's own logo (lib/seo.ts LOGO_PATH: square, 512 px, on the
 * brand's Midnight), the photo of Yallapp's own designer page while the team
 * hasn't uploaded one (lib/studio-market/house-photo.ts). The only other
 * address the pages draw as a designer's photo.
 */
export const HOUSE_PHOTO_PATH = "/android-chrome-512x512.png";

export function safePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 300) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password || url.search || url.hash || (!ASSET_PATH.test(url.pathname) && url.pathname !== HOUSE_PHOTO_PATH)) return null;
  return url.toString();
}
