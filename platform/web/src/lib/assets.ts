import { appUrl } from "./env";

/** Public URL of an uploaded icon or logo (the build pipeline downloads it from here). */
export function assetUrl(assetId: string): string {
  return `${appUrl()}/api/v1/assets/${assetId}`;
}

export const ICON_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
