import type { Metadata } from "next";
import { DocsIndexPage, docsMetadata } from "@/site/docs";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return docsMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <DocsIndexPage lang={await routeLang(params)} />;
}
