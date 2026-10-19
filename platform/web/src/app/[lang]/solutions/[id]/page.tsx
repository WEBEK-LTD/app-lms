import type { Metadata } from "next";
import { SolutionPage, solutionMetadata, solutionParams } from "@/site/solutions";
import { routeLang } from "@/site/lang";

// Unknown app types get notFound().
export function generateStaticParams() {
  return solutionParams();
}

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return solutionMetadata(await routeLang(params), (await params).id);
}

export default async function Page({ params }: Props) {
  return <SolutionPage lang={await routeLang(params)} id={(await params).id} />;
}
