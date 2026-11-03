import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { studioOgImage } from "@/site/og";
import { langParams, routeLang } from "@/site/lang";

/** SEO: this page's share image in Arabic and Turkish. */
export const alt = "Yallapp";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return langParams();
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  return studioOgImage(await routeLang(params));
}
