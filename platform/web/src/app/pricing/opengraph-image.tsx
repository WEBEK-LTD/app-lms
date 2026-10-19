import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { pricingOgImage } from "@/site/og";

/** 32 The pricing page's share image, with its title from the admin. */
export const alt = "Yallapp pricing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return pricingOgImage("en");
}
