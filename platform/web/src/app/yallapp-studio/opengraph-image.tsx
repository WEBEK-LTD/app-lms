import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { studioOgImage } from "@/site/og";

/** SEO: this page's share image. */
export const alt = "Yallapp Studio";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return studioOgImage("en");
}
