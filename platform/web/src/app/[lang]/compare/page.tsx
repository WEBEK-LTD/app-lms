import type { Metadata } from "next";
import { ComparePage, compareMetadata } from "@/site/compare";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return compareMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <ComparePage lang={await routeLang(params)} />;
}
