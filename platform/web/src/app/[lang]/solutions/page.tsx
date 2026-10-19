import type { Metadata } from "next";
import { SolutionsPage, solutionsMetadata } from "@/site/solutions";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return solutionsMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <SolutionsPage lang={await routeLang(params)} />;
}
