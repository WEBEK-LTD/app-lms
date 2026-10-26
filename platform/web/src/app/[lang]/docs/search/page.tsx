import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";
import { DocsSearchPage, docsSearchMetadata } from "@/site/docs";
import { routeLang } from "@/site/lang";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ q?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Results pages stay out of search engines.
  return { ...(await docsSearchMetadata(await routeLang(params))), robots: NO_INDEX };
}

export default async function Page({ params, searchParams }: Props) {
  const { q } = await searchParams;
  return <DocsSearchPage lang={await routeLang(params)} query={typeof q === "string" ? q : ""} />;
}
