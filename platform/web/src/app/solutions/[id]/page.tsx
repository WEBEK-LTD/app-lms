import type { Metadata } from "next";
import { SolutionPage, solutionMetadata, solutionParams } from "@/site/solutions";

// Unknown app types get notFound().
export function generateStaticParams() {
  return solutionParams();
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return solutionMetadata("en", (await params).id);
}

export default async function Page({ params }: Props) {
  return <SolutionPage lang="en" id={(await params).id} />;
}
