import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { faqOgImage } from "@/site/og";

/** SEO: this page's share image. */
export const alt = "Yallapp FAQ";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return faqOgImage("en");
}
