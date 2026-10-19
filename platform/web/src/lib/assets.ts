import { appUrl } from "./env";

/** 51 A picture from the app's Media library where an asset ID goes (a product's or listing's photos): "media:<id>". */
export const MEDIA_ASSET_PREFIX = "media:";

/** Public URL of an uploaded icon or logo (the build pipeline downloads it from here); 51 a Media library picture's own link. */
export function assetUrl(assetId: string): string {
  if (assetId.startsWith(MEDIA_ASSET_PREFIX)) return `${appUrl()}/m/${assetId.slice(MEDIA_ASSET_PREFIX.length)}`;
  return `${appUrl()}/api/v1/assets/${assetId}`;
}

export const ICON_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
