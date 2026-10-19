import type { Metadata } from "next";
import { IntegrationsPage, integrationsMetadata } from "@/site/features";
import { routeLang } from "@/site/lang";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return integrationsMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <IntegrationsPage lang={await routeLang(params)} />;
}
