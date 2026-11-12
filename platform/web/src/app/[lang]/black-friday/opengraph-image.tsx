import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { blackFridayOgImage } from "@/site/og";
import { langParams, routeLang } from "@/site/lang";

/** 124 The share image in Arabic and Turkish. Made again every hour. */
export const alt = "Yallapp";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

export function generateStaticParams() {
  return langParams();
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  return blackFridayOgImage(await routeLang(params));
}
