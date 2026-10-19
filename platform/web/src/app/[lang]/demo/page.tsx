import type { Metadata } from "next";
import { DemoPage, demoMetadata } from "@/site/demo";
import { routeLang } from "@/site/lang";

/** Whether each download is ready comes from the admin. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return demoMetadata(await routeLang(params));
}

export default async function Page({ params, searchParams }: Props) {
  return <DemoPage lang={await routeLang(params)} download={(await searchParams).download} />;
}
