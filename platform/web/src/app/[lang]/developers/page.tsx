import type { Metadata } from "next";
import { DevelopersPage, developersMetadata } from "@/site/docs";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return developersMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <DevelopersPage lang={await routeLang(params)} />;
}
