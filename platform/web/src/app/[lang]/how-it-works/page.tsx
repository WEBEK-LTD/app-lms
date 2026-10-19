import type { Metadata } from "next";
import { HowItWorksPage, howMetadata } from "@/site/features";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return howMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <HowItWorksPage lang={await routeLang(params)} />;
}
