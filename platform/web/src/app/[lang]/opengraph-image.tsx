import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { siteOgImage } from "@/site/og";
import { langParams, routeLang } from "@/site/lang";

/** 55 The share image of the Arabic and Turkish pages without their own. */
export const alt = "Yallapp";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return langParams();
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  return siteOgImage(await routeLang(params));
}
