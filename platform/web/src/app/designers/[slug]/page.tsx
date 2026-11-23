import type { Metadata } from "next";
import { designerMetadata, DesignerPublicPage } from "@/site/designers";

/** 106.14 A designer's public page; a locked or suspended designer, or one with no published template, is "page not found". */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/designers/[slug]">): Promise<Metadata> {
  return designerMetadata("en", (await params).slug);
}

export default async function Page({ params }: PageProps<"/designers/[slug]">) {
  return <DesignerPublicPage lang="en" slug={(await params).slug} />;
}
