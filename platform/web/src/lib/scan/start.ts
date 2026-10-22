import { ICON_MAX_BYTES, LOGO_MAX_BYTES } from "../assets";
import { siteScanTestUrl } from "../env";
import { isSvg, readPngInfo } from "../png";
import { fetchSiteImage, type ScanDeps, type SiteScan } from "./site-scan";

/**
 * 81.3 Reading a client's site for a draft app: through the safe fetch, or
 * in local tests (SITE_SCAN_TEST_URL, refused on Netlify) from a fake site
 * standing in for every address.
 */
export function siteScanDeps(): ScanDeps {
  const test = siteScanTestUrl();
  if (!test) return {};
  const fake = new URL(test);
  const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
    const asked = new URL(input instanceof Request ? input.url : String(input));
    const response = await fetch(`${fake.origin}${asked.pathname}${asked.search}`, init);
    // Read as if from the address asked for.
    return new Response(response.body, { status: response.status, headers: response.headers });
  };
  return { fetcher: fetcher as typeof fetch };
}

export interface SiteImage {
  data: Buffer;
  contentType: "image/png" | "image/svg+xml";
  extension: "png" | "svg";
}

/**
 * The site's logo and icon, when the app can use them as they are: a logo in
 * PNG or SVG; an icon only when it is what stores ask for (PNG, 1024 × 1024,
 * without transparency), which a website's rarely is: the owner uploads it
 * in Branding otherwise.
 */
export async function siteImages(scan: Pick<SiteScan, "logoUrl" | "iconUrl">, deps: ScanDeps): Promise<{ logo: SiteImage | null; icon: SiteImage | null }> {
  const [logoData, iconData] = await Promise.all([
    scan.logoUrl ? fetchSiteImage(scan.logoUrl, LOGO_MAX_BYTES, deps) : null,
    scan.iconUrl ? fetchSiteImage(scan.iconUrl, ICON_MAX_BYTES, deps) : null,
  ]);
  const logo: SiteImage | null = !logoData
    ? null
    : readPngInfo(logoData)
      ? { data: logoData, contentType: "image/png", extension: "png" }
      : isSvg(logoData)
        ? { data: logoData, contentType: "image/svg+xml", extension: "svg" }
        : null;
  const png = iconData ? readPngInfo(iconData) : null;
  const icon: SiteImage | null = iconData && png && png.width === 1024 && png.height === 1024 && !png.hasTransparency ? { data: iconData, contentType: "image/png", extension: "png" } : null;
  return { logo, icon };
}
