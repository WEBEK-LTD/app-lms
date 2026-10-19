import { OG_CONTENT_TYPE, OG_SIZE } from "@/components/og-image";
import { solutionParams } from "@/site/solutions";
import { solutionOgImage } from "@/site/og";
import { langParams, routeLang } from "@/site/lang";

/** 55 The share image in Arabic and Turkish. */
export const alt = "Yallapp";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return langParams().flatMap(({ lang }) => solutionParams().map((p) => ({ lang, ...p })));
}

export default async function Image({ params }: { params: Promise<{ lang: string; id: string }> }) {
  return solutionOgImage(await routeLang(params), (await params).id);
}
