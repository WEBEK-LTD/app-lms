import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalMetadata } from "@/site/legal";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return legalMetadata(await routeLang(params), "refund");
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <LegalPage contentKey="refund" path="/refund" lang={await routeLang(params)} />;
}
