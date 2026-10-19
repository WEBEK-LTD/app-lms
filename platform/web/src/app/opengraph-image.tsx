import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { siteOgImage } from "@/site/og";

/** 32 The share image of every page without its own. */
export const alt = "Yallapp: your business as your own mobile app";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return siteOgImage("en");
}
