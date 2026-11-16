import type { Metadata } from "next";
import { PricingPage, pricingMetadata } from "@/site/pricing";
import { routeLang } from "@/site/lang";

/** 52 Prices follow the visitor's country: rendered per request. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return pricingMetadata(await routeLang(params));
}

export default async function Page({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // 133 The billing period the visitor chose (?period=6).
  const { period } = await searchParams;
  return <PricingPage lang={await routeLang(params)} period={typeof period === "string" ? period : null} />;
}
