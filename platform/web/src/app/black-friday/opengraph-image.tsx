import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { blackFridayOgImage } from "@/site/og";

/** 124 Black Friday's share image: the offer as the team saved it, or "over". Made again every hour. */
export const alt = "Black Friday at Yallapp";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

export default function Image() {
  return blackFridayOgImage("en");
}
