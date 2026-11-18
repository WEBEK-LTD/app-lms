import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { templatesOgImage } from "@/site/og";
import { langParams, routeLang } from "@/site/lang";

/** 106.13 Studio Market's share image in Arabic and Turkish. */
export const alt = "Studio Market";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return langParams();
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  return templatesOgImage(await routeLang(params));
}
