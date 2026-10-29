import type { Metadata } from "next";
import { StudioDemoPage, studioDemoMetadata } from "@/site/studio";
import { routeLang } from "@/site/lang";

/** The WhatsApp number follows the visitor's country. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ download?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return studioDemoMetadata(await routeLang(params));
}

export default async function Page({ params, searchParams }: Props) {
  return <StudioDemoPage lang={await routeLang(params)} download={(await searchParams).download} />;
}
