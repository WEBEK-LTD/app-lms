import type { Metadata } from "next";
import { DocPage, docMetadata, docParams } from "@/site/docs";

// Unknown articles get notFound(). (dynamicParams = false would 404 every article once
// the contact details change and the pages are rebuilt.)
export function generateStaticParams() {
  return docParams();
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return docMetadata("en", (await params).slug);
}

export default async function Page({ params }: Props) {
  return <DocPage lang="en" slug={(await params).slug} />;
}
