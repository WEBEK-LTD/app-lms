import type { Metadata } from "next";
import { PricingPage, pricingMetadata } from "@/site/pricing";
import { routeLang } from "@/site/lang";

/** 52 Prices follow the visitor's country: rendered per request. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return pricingMetadata(await routeLang(params));
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  return <PricingPage lang={await routeLang(params)} />;
}
