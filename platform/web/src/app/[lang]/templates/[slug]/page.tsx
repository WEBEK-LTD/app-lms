import type { Metadata } from "next";
import { routeLang } from "@/site/lang";
import { templateMetadata, TemplatePublicPage } from "@/site/templates";

/** 106.13 A published template's public page in Arabic and Turkish. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/templates/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return templateMetadata(await routeLang(params), slug);
}

export default async function Page({ params, searchParams }: PageProps<"/[lang]/templates/[slug]">) {
  const { slug } = await params;
  return <TemplatePublicPage lang={await routeLang(params)} slug={slug} demo={(await searchParams).demo} />;
}
