import type { Metadata } from "next";
import { routeLang } from "@/site/lang";
import { designerMetadata, DesignerPublicPage } from "@/site/designers";

/** 106.14 A designer's public page in Arabic and Turkish. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/designers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return designerMetadata(await routeLang(params), slug);
}

export default async function Page({ params }: PageProps<"/[lang]/designers/[slug]">) {
  const { slug } = await params;
  return <DesignerPublicPage lang={await routeLang(params)} slug={slug} />;
}
