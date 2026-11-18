import type { Metadata } from "next";
import { templateMetadata, TemplatePublicPage } from "@/site/templates";

/** 106.13 A published template's public page; any other template is "page not found". */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/templates/[slug]">): Promise<Metadata> {
  return templateMetadata("en", (await params).slug);
}

export default async function Page({ params, searchParams }: PageProps<"/templates/[slug]">) {
  return <TemplatePublicPage lang="en" slug={(await params).slug} demo={(await searchParams).demo} />;
}
