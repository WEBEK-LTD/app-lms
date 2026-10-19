import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { legalMetadata } from "@/site/legal";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return legalMetadata(await routeLang(params), "privacy");
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <LegalPage contentKey="privacy" path="/privacy" lang={await routeLang(params)} />;
}
