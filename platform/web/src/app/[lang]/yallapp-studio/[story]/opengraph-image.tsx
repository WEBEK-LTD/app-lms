import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { storyOgImage } from "@/site/og";
import { langParams, routeLang } from "@/site/lang";
import { storyParams } from "@/site/story/types";

/** The share image in Arabic and Turkish. */
export const alt = "Yallapp";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return langParams().flatMap(({ lang }) => storyParams().map((p) => ({ lang, ...p })));
}

export default async function Image({ params }: { params: Promise<{ lang: string; story: string }> }) {
  return storyOgImage(await routeLang(params), (await params).story);
}
