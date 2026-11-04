import type { Metadata } from "next";
import { CompareOnePage, compareOneMetadata, compareParams } from "@/site/compare";
import { routeLang } from "@/site/lang";

// Unknown names get notFound().
export function generateStaticParams() {
  return compareParams();
}

type Props = { params: Promise<{ lang: string; name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return compareOneMetadata(await routeLang(params), (await params).name);
}

export default async function Page({ params }: Props) {
  return <CompareOnePage lang={await routeLang(params)} name={(await params).name} />;
}
