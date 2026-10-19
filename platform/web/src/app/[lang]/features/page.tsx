import type { Metadata } from "next";
import { FeaturesPage, featuresMetadata } from "@/site/features";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return featuresMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <FeaturesPage lang={await routeLang(params)} />;
}
