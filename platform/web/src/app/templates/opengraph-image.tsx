import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { templatesOgImage } from "@/site/og";

/** 106.13 Studio Market's share image. */
export const alt = "Studio Market";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return templatesOgImage("en");
}
