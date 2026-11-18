import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { templateOgImage } from "@/site/og";
import { routeLang } from "@/site/lang";

/** 106.13 A template's share image in Arabic and Turkish. */
export const alt = "Studio Market";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  return templateOgImage(await routeLang(params), slug);
}
