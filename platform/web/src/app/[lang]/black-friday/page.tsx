import type { Metadata } from "next";
import { BlackFridayPage, blackFridayMetadata } from "@/site/occasions/black-friday";
import { routeLang } from "@/site/lang";

/** 124 The saved occasion, the plans and their prices in the visitor's currency are read per request. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return blackFridayMetadata(await routeLang(params));
}

export default async function Page({ params }: Props) {
  return <BlackFridayPage lang={await routeLang(params)} />;
}
