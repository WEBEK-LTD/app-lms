import type { Metadata } from "next";
import { FaqPage, faqMetadata } from "@/site/contact";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return faqMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <FaqPage lang={await routeLang(params)} />;
}
