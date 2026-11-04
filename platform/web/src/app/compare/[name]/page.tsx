import type { Metadata } from "next";
import { CompareOnePage, compareOneMetadata, compareParams } from "@/site/compare";

// Unknown names get notFound().
export function generateStaticParams() {
  return compareParams();
}

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return compareOneMetadata("en", (await params).name);
}

export default async function Page({ params }: Props) {
  return <CompareOnePage lang="en" name={(await params).name} />;
}
